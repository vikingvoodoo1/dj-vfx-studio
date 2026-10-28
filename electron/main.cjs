const { app, BrowserWindow, Menu, shell, screen, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const { LAUNCH_MODES, loadConfig, getModeById, getPlatformTrayName, LauncherManager } = require('./launcher-manager.cjs');

let mainWindow = null;
let stageWindow = null;
let controllerWindow = null;
let bridgeProcess = null;
let staticServer = null;
let launcherManager = null;
let activeMode = 'studio';

const isDev = process.argv.includes('--dev') || !app.isPackaged;
const openLauncherOnStart = process.argv.includes('--launcher');
const cliModeArg = process.argv.find(a => a.startsWith('--mode='));
const PORT = 5173;
const BRIDGE_PORT = 8080;

// Enable Hardware GPU Acceleration Flags
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('enable-webgl2-compute-context');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

// In packaged .dmg / .exe builds (or when Vite isn't running), serve dist/ on :5173 so OBS & browsers work seamlessly
function ensurePackagedStaticServer() {
    if (staticServer) return Promise.resolve(true);
    const distDir = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
            const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
            // Proxy /api/* requests to Hardware Bridge (:8080)
            if (parsedUrl.pathname.startsWith('/api/')) {
                const proxyReq = http.request({
                    hostname: '127.0.0.1',
                    port: BRIDGE_PORT,
                    path: req.url,
                    method: req.method,
                    headers: req.headers
                }, (proxyRes) => {
                    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
                    proxyRes.pipe(res);
                });
                proxyReq.on('error', () => {
                    res.writeHead(502);
                    res.end('Bridge unavailable');
                });
                req.pipe(proxyReq);
                return;
            }

            let relPath = decodeURIComponent(parsedUrl.pathname);
            if (relPath === '/' || relPath === '') relPath = '/index.html';
            const safePath = path.normalize(path.join(distDir, relPath));
            if (!safePath.startsWith(distDir)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            const targetFile = (fs.existsSync(safePath) && fs.statSync(safePath).isFile())
                ? safePath
                : path.join(distDir, 'index.html');

            const ext = path.extname(targetFile).toLowerCase();
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            fs.createReadStream(targetFile).pipe(res);
        });

        srv.on('error', () => {
            // Port 5173 is already bound by Vite dev server
            resolve(true);
        });

        srv.listen(PORT, '127.0.0.1', () => {
            staticServer = srv;
            console.log(`[Electron] Serving packaged visualizer on http://localhost:${PORT}`);
            resolve(true);
        });
    });
}

function stopPackagedStaticServer() {
    if (staticServer) {
        try { staticServer.close(); } catch (e) {}
        staticServer = null;
    }
}

function resolveModeUrl(query = '') {
    const cleanQuery = query || '';
    return `http://localhost:${PORT}/${cleanQuery}`;
}

// Launch Background Bridge (StageLinQ, Pioneer, Traktor, Hue, OBS Sync)
function startHardwareBridge() {
    if (bridgeProcess) return;
    try {
        const bridgeScript = path.join(__dirname, '..', 'server', 'stagelinq-bridge.js');
        if (fs.existsSync(bridgeScript)) {
            bridgeProcess = spawn(process.execPath, [bridgeScript], {
                cwd: path.join(__dirname, '..'),
                stdio: ['inherit', 'pipe', 'pipe'],
                env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' })
            });

            bridgeProcess.stdout.on('data', (data) => {
                console.log(`[Bridge] ${data.toString().trim()}`);
            });

            bridgeProcess.stderr.on('data', (data) => {
                console.error(`[Bridge Error] ${data.toString().trim()}`);
            });

            bridgeProcess.on('exit', () => {
                bridgeProcess = null;
                if (launcherManager) launcherManager.refreshTrayMenu();
            });
        }
    } catch (err) {
        console.error('[Electron] Failed to start hardware bridge:', err);
    }
}

function stopHardwareBridge() {
    if (bridgeProcess) {
        try { bridgeProcess.kill('SIGTERM'); } catch (e) {}
        bridgeProcess = null;
    }
}

// Create Main Application Window (with optional mode query string & transparency)
function createMainWindow(urlQuery = '', options = {}) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const isTransparent = Boolean(options.transparent);

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(resolveModeUrl(urlQuery));
        mainWindow.show();
        mainWindow.focus();
        return mainWindow;
    }

    mainWindow = new BrowserWindow({
        width: options.width || Math.min(1600, width),
        height: options.height || Math.min(1000, height),
        minWidth: 500,
        minHeight: 600,
        transparent: isTransparent,
        backgroundColor: isTransparent ? '#00000000' : '#05050a',
        title: options.title || 'DJ VFX Studio — Professional Stage Visual Engine & Multi-Platform DJ Bridge',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
            webgl: true
        }
    });

    mainWindow.loadURL(resolveModeUrl(urlQuery));

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    buildAppMenu();
    return mainWindow;
}

// Open Detached Master Control Console Window (?mode=controller)
function openControllerWindow() {
    if (controllerWindow && !controllerWindow.isDestroyed()) {
        controllerWindow.focus();
        return controllerWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    controllerWindow = new BrowserWindow({
        x: primaryDisplay.bounds.x + 40,
        y: primaryDisplay.bounds.y + 40,
        width: 540,
        height: 900,
        minWidth: 460,
        minHeight: 680,
        backgroundColor: '#05050a',
        title: 'DJ VFX — Detached Master Control Console',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false
        }
    });

    controllerWindow.loadURL(resolveModeUrl('?mode=controller'));
    controllerWindow.on('closed', () => {
        controllerWindow = null;
    });
    return controllerWindow;
}

// Open Dedicated Full-Screen Second Screen / Projector Window (?clean=true)
function openStageProjectorWindow() {
    const displays = screen.getAllDisplays();
    const externalDisplay = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0) || displays[0];

    if (stageWindow && !stageWindow.isDestroyed()) {
        stageWindow.focus();
        return stageWindow;
    }

    stageWindow = new BrowserWindow({
        x: externalDisplay.bounds.x + 50,
        y: externalDisplay.bounds.y + 50,
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
        title: 'DJ VFX — Clean Stage Output',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false
        }
    });

    stageWindow.loadURL(resolveModeUrl('?mode=stage&clean=true'));

    stageWindow.on('closed', () => {
        stageWindow = null;
    });
    return stageWindow;
}

// Unified Mode Dispatcher (switches active Electron session or opens in system browser)
async function launchVfxMode(modeId, openInBrowser = false) {
    const mode = getModeById(modeId);
    activeMode = mode.id;

    // 1. Manage Hardware Bridge & Static Server lifecycle according to mode
    if (mode.needsBridge) {
        startHardwareBridge();
    } else {
        stopHardwareBridge();
    }

    if (mode.needsVite) {
        await ensurePackagedStaticServer();
    } else {
        stopPackagedStaticServer();
    }

    // 2. If user chose to launch in external browser
    if (openInBrowser && mode.urlQuery !== null) {
        const targetUrl = `http://localhost:${PORT}/${mode.urlQuery}`;
        if (mode.id === 'dual-rig') {
            await shell.openExternal(`http://localhost:${PORT}/?mode=controller`);
            await shell.openExternal(`http://localhost:${PORT}/?mode=stage&clean=true`);
        } else {
            await shell.openExternal(targetUrl);
        }
        if (mode.id === 'obs' || mode.id === 'obs-overlay') {
            clipboard.writeText(targetUrl);
        }
        if (launcherManager) launcherManager.refreshTrayMenu();
        return;
    }

    // 3. Handle Electron Window Modes
    if (mode.windowMode === 'headless') {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
        if (stageWindow && !stageWindow.isDestroyed()) stageWindow.close();
        if (controllerWindow && !controllerWindow.isDestroyed()) controllerWindow.close();
    } else if (mode.windowMode === 'stage-only') {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
        openStageProjectorWindow();
    } else if (mode.windowMode === 'dual-rig') {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
        openControllerWindow();
        openStageProjectorWindow();
    } else if (mode.windowMode === 'electron-dual') {
        createMainWindow('', { title: 'DJ VFX Studio — Master Console' });
        openStageProjectorWindow();
    } else if (mode.windowMode === 'obs' || mode.windowMode === 'obs-overlay') {
        const obsUrl = `http://localhost:${PORT}/${mode.urlQuery}`;
        clipboard.writeText(obsUrl);
        createMainWindow(mode.urlQuery, {
            transparent: mode.windowMode === 'obs-overlay',
            title: `DJ VFX — ${mode.title} (URL Copied to Clipboard)`
        });
    } else {
        // Default 'main' (Full Studio Mode or Visualizer Only)
        createMainWindow(mode.urlQuery || '');
    }

    if (launcherManager) {
        launcherManager.refreshTrayMenu();
        launcherManager.updateDockMenu();
    }
    buildAppMenu();
}

// Build Native Application Menu
function buildAppMenu() {
    const config = loadConfig();
    const defMode = getModeById(config.defaultMode);

    const modeMenuItems = LAUNCH_MODES.map(m => ({
        label: `${m.shortTitle}${config.defaultMode === m.id ? '  ★ Default' : ''}`,
        type: 'radio',
        checked: activeMode === m.id,
        click: () => launchVfxMode(m.id, false)
    }));

    const defaultModeMenuItems = LAUNCH_MODES.map(m => ({
        label: m.shortTitle,
        type: 'radio',
        checked: config.defaultMode === m.id,
        click: () => {
            if (launcherManager) launcherManager.setDefaultMode(m.id);
        }
    }));

    const template = [
        {
            label: 'DJ VFX Studio',
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                {
                    label: 'Startup Mode & Launcher...',
                    accelerator: 'CmdOrCtrl+Shift+M',
                    click: () => {
                        if (launcherManager) launcherManager.openLauncherWindow();
                    }
                },
                {
                    label: `Show in ${getPlatformTrayName()}`,
                    type: 'checkbox',
                    checked: Boolean(config.showInMenuBar),
                    click: () => {
                        if (launcherManager) launcherManager.setShowInMenuBar(!config.showInMenuBar);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Check for Updates (GitHub)...',
                    click: () => shell.openExternal('https://github.com/vikingvoodoo1/dj-vfx-studio/releases/latest')
                },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Modes',
            submenu: [
                {
                    label: `🚀 Launch Default (${defMode.title})`,
                    accelerator: 'CmdOrCtrl+Shift+Return',
                    click: () => launchVfxMode(config.defaultMode, false)
                },
                { type: 'separator' },
                ...modeMenuItems,
                { type: 'separator' },
                {
                    label: '★ Set Default Startup Mode',
                    submenu: defaultModeMenuItems
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                {
                    label: 'Toggle Stage Fullscreen',
                    accelerator: 'CmdOrCtrl+F',
                    click: () => {
                        const focused = BrowserWindow.getFocusedWindow() || mainWindow || stageWindow;
                        if (focused) {
                            focused.setFullScreen(!focused.isFullScreen());
                        }
                    }
                },
                {
                    label: 'Open Clean Stage Projector Window',
                    accelerator: 'CmdOrCtrl+Shift+P',
                    click: openStageProjectorWindow
                },
                {
                    label: 'Open Detached Master Controller Window',
                    accelerator: 'CmdOrCtrl+Shift+K',
                    click: openControllerWindow
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'GitHub Documentation & Guides',
                    click: () => shell.openExternal('https://github.com/vikingvoodoo1/dj-vfx-studio')
                },
                {
                    label: 'Latest Releases & Downloads',
                    click: () => shell.openExternal('https://github.com/vikingvoodoo1/dj-vfx-studio/releases')
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC Handlers for Native Video Folder Selection & Finder Reveal
ipcMain.handle('dialog:selectFolder', async (event, defaultPath) => {
    let resolved = defaultPath;
    if (resolved && resolved.startsWith('~')) {
        resolved = path.join(os.homedir(), resolved.slice(1));
    }
    const fallbackPath = path.join(os.homedir(), 'Documents', 'OBS jkmclaren', 'VIDEOWALL', 'LOOP VIDS');
    const startPath = (resolved && fs.existsSync(resolved)) ? resolved : (fs.existsSync(fallbackPath) ? fallbackPath : os.homedir());

    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Video Loop Folder',
        defaultPath: startPath,
        properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('shell:openPath', async (event, folderPath) => {
    let resolved = folderPath;
    if (resolved && resolved.startsWith('~')) {
        resolved = path.join(os.homedir(), resolved.slice(1));
    }
    if (resolved && fs.existsSync(resolved)) {
        shell.openPath(resolved);
        return true;
    }
    return false;
});

// App Lifecycle
app.whenReady().then(async () => {
    const config = loadConfig();
    const initialMode = cliModeArg
        ? cliModeArg.replace('--mode=', '').trim()
        : (config.defaultMode || 'studio');

    launcherManager = new LauncherManager({
        launchMode: launchVfxMode,
        getState: () => ({
            activeMode,
            bridgeRunning: Boolean(bridgeProcess)
        }),
        rebuildAppMenu: buildAppMenu
    });

    launcherManager.initTrayIfEnabled();

    if (openLauncherOnStart) {
        startHardwareBridge();
        launcherManager.openLauncherWindow();
        buildAppMenu();
    } else {
        await launchVfxMode(initialMode, false);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            const latestConfig = loadConfig();
            launchVfxMode(latestConfig.defaultMode || 'studio', false);
        }
    });
});

app.on('window-all-closed', () => {
    const config = loadConfig();
    // Stay resident in macOS Menu Bar if Menu Bar item is enabled or running headless bridge
    if (process.platform !== 'darwin' && !config.showInMenuBar && activeMode !== 'bridge-only') {
        app.quit();
    }
});

app.on('will-quit', () => {
    stopHardwareBridge();
});
