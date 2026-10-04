const { app, BrowserWindow, Menu, shell, screen, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let stageWindow = null;
let bridgeProcess = null;
let viteProcess = null;

const isDev = process.argv.includes('--dev') || !app.isPackaged;
const PORT = 5173;
const BRIDGE_PORT = 8080;

// Enable Hardware GPU Acceleration Flags
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('enable-webgl2-compute-context');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Launch Background Bridge (StageLinQ, Pioneer, Traktor, Hue, OBS Sync)
function startHardwareBridge() {
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
        }
    } catch (err) {
        console.error('[Electron] Failed to start hardware bridge:', err);
    }
}

// Create Main Application Window
function createMainWindow() {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: Math.min(1600, width),
        height: Math.min(1000, height),
        minWidth: 1024,
        minHeight: 700,
        backgroundColor: '#05050a',
        title: 'DJ VFX Studio — Professional Stage Visual Engine & Multi-Platform DJ Bridge',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false, // Keep 60fps rendering even when window is in background
            webgl: true
        }
    });

    // Load App
    if (isDev) {
        mainWindow.loadURL(`http://localhost:${PORT}`);
    } else {
        const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
        if (fs.existsSync(distIndex)) {
            mainWindow.loadFile(distIndex);
        } else {
            mainWindow.loadURL(`http://localhost:${PORT}`);
        }
    }

    // Open External Links in Default OS Browser
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
}

// Build Native Application Menu
function buildAppMenu() {
    const template = [
        {
            label: 'DJ VFX Studio',
            submenu: [
                { role: 'about' },
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
                        if (mainWindow) {
                            mainWindow.setFullScreen(!mainWindow.isFullScreen());
                        }
                    }
                },
                {
                    label: 'Open Clean Stage Projector Window',
                    accelerator: 'CmdOrCtrl+Shift+P',
                    click: openStageProjectorWindow
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

// Open Dedicated Full-Screen Second Screen / Projector Window
function openStageProjectorWindow() {
    const displays = screen.getAllDisplays();
    const externalDisplay = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0) || displays[0];

    if (stageWindow) {
        stageWindow.focus();
        return;
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

    const url = isDev
        ? `http://localhost:${PORT}/?clean=true`
        : `file://${path.join(__dirname, '..', 'dist', 'index.html')}?clean=true`;

    stageWindow.loadURL(url);

    stageWindow.on('closed', () => {
        stageWindow = null;
    });
}

// App Lifecycle
app.whenReady().then(() => {
    startHardwareBridge();
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (bridgeProcess) {
        try { bridgeProcess.kill('SIGTERM'); } catch (e) {}
    }
});
