const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, clipboard } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

const CONFIG_PATH = path.join(os.homedir(), '.dj-vfx-launcher.json');

const LAUNCH_MODES = [
    {
        id: 'studio',
        number: 1,
        title: 'Full Studio Mode',
        shortTitle: '1. Full Studio Mode',
        subtitle: 'Vite 3D WebGL Visualizer + Universal Hardware Bridge + Main Studio Console UI',
        badge: 'DEFAULT CAPABLE • FULL RIG',
        color: '#00f2fe',
        needsVite: true,
        needsBridge: true,
        urlQuery: '',
        windowMode: 'main'
    },
    {
        id: 'stage',
        number: 2,
        title: 'Clean Stage / Projector Mode',
        shortTitle: '2. Clean Stage / Projector Mode',
        subtitle: 'Zero-HUD, cursor-hidden 3D visual feed (?clean=true / ?mode=stage) for LED walls & projectors',
        badge: 'STAGE OUTPUT • ZERO HUD',
        color: '#a855f7',
        needsVite: true,
        needsBridge: true,
        urlQuery: '?mode=stage&clean=true',
        windowMode: 'stage-only'
    },
    {
        id: 'dual-rig',
        number: 3,
        title: 'Detached Controller + Clean Stage Rig',
        shortTitle: '3. Detached Controller + Stage Rig',
        subtitle: 'Dual-window live setup: Compact Master Control Console (?mode=controller) + Clean Stage Output',
        badge: 'DUAL WINDOW • LIVE PERFORMANCE',
        color: '#ff007f',
        needsVite: true,
        needsBridge: true,
        urlQuery: '?mode=controller',
        windowMode: 'dual-rig'
    },
    {
        id: 'obs',
        number: 4,
        title: 'OBS Stream Mode (Clean Feed)',
        shortTitle: '4a. OBS Stream Mode (?mode=obs)',
        subtitle: 'Zero-FOUC broadcast stream output (?mode=obs) + auto-copies OBS Browser Source URL',
        badge: 'BROADCAST • 60 FPS STREAM',
        color: '#22c55e',
        needsVite: true,
        needsBridge: true,
        urlQuery: '?mode=obs',
        windowMode: 'obs'
    },
    {
        id: 'obs-overlay',
        number: 4,
        title: 'OBS Transparent Alpha Overlay',
        shortTitle: '4b. OBS Transparent Overlay (?overlay=true)',
        subtitle: 'Transparent background alpha-channel overlay (?mode=obs&overlay=true) for camera compositing',
        badge: 'ALPHA OVERLAY • COMPOSITING',
        color: '#10b981',
        needsVite: true,
        needsBridge: true,
        urlQuery: '?mode=obs&overlay=true',
        windowMode: 'obs-overlay'
    },
    {
        id: 'electron',
        number: 5,
        title: 'Native Electron Desktop App + Stage',
        shortTitle: '5. Native Electron App (GPU + Stage)',
        subtitle: 'Hardware GPU-accelerated desktop studio window + dedicated 2nd-screen Stage Projector',
        badge: 'NATIVE GPU • MULTI-DISPLAY',
        color: '#3b82f6',
        needsVite: true,
        needsBridge: true,
        urlQuery: '',
        windowMode: 'electron-dual'
    },
    {
        id: 'bridge-only',
        number: 6,
        title: 'Service Only: Hardware Bridge (:8080)',
        shortTitle: '6a. Hardware Bridge Only (:8080)',
        subtitle: 'Headless telemetry server (StageLinQ, Pioneer Pro DJ Link, Traktor, Hue, OBS, BUTT)',
        badge: 'HEADLESS DAEMON • PORT 8080',
        color: '#f59e0b',
        needsVite: false,
        needsBridge: true,
        urlQuery: null,
        windowMode: 'headless'
    },
    {
        id: 'vite-only',
        number: 6,
        title: 'Service Only: Visualizer Only (:5173)',
        shortTitle: '6b. Visualizer Only (No Bridge)',
        subtitle: 'Standalone 3D WebGL visualizer without Hardware Bridge (Pure Microphone / Line-In mode)',
        badge: 'STANDALONE WEBGL • PORT 5173',
        color: '#eab308',
        needsVite: true,
        needsBridge: false,
        urlQuery: '',
        windowMode: 'main'
    }
];

const DEFAULT_CONFIG = {
    defaultMode: 'studio',
    showInMenuBar: true,
    keepInMenuBarOnClose: true,
    autoLaunchDefaultOnOpen: false,
    preferBrowserInsteadOfElectron: false,
    projectPath: path.resolve(__dirname, '..')
};

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            const merged = Object.assign({}, DEFAULT_CONFIG, raw);
            if (!LAUNCH_MODES.some(m => m.id === merged.defaultMode)) {
                merged.defaultMode = 'studio';
            }
            return merged;
        }
    } catch (err) {
        console.error('[LauncherConfig] Failed to read config, using defaults:', err.message);
    }
    saveConfig(DEFAULT_CONFIG);
    return Object.assign({}, DEFAULT_CONFIG);
}

function saveConfig(partial) {
    try {
        let current = Object.assign({}, DEFAULT_CONFIG);
        if (fs.existsSync(CONFIG_PATH)) {
            try {
                current = Object.assign(current, JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
            } catch (e) {}
        }
        const updated = Object.assign({}, current, partial, {
            updatedAt: new Date().toISOString()
        });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf8');
        return updated;
    } catch (err) {
        console.error('[LauncherConfig] Failed to save config:', err.message);
        return Object.assign({}, DEFAULT_CONFIG, partial);
    }
}

function getModeById(modeId) {
    return LAUNCH_MODES.find(m => m.id === modeId) || LAUNCH_MODES[0];
}

// Create a crisp programmatic 16x16 template/color icon for the macOS Menu Bar
function createMenuBarIcon(isActive = true) {
    // 16x16 RGBA pixel buffer (draws a sleek equalizer / lightning glyph)
    const size = 16;
    const buf = Buffer.alloc(size * size * 4, 0);
    const setPixel = (x, y, r, g, b, a = 255) => {
        if (x < 0 || x >= size || y < 0 || y >= size) return;
        const idx = (y * size + x) * 4;
        buf[idx] = b;     // BGRA on macOS / Electron bitmap
        buf[idx + 1] = g;
        buf[idx + 2] = r;
        buf[idx + 3] = a;
    };

    const drawBar = (xStart, width, yTop, yBottom, r, g, b) => {
        for (let x = xStart; x < xStart + width; x++) {
            for (let y = yTop; y <= yBottom; y++) {
                setPixel(x, y, r, g, b, 255);
            }
        }
    };

    if (isActive) {
        // Vibrant Cyan / Magenta / Green 4-bar DJ EQ icon
        drawBar(1, 2, 6, 13, 0, 242, 254);
        drawBar(5, 2, 2, 13, 168, 85, 247);
        drawBar(9, 2, 5, 13, 255, 0, 127);
        drawBar(13, 2, 8, 13, 34, 197, 94);
    } else {
        // Subtle silver bars when idle
        drawBar(1, 2, 7, 13, 180, 190, 205);
        drawBar(5, 2, 3, 13, 180, 190, 205);
        drawBar(9, 2, 6, 13, 180, 190, 205);
        drawBar(13, 2, 9, 13, 180, 190, 205);
    }

    return nativeImage.createFromBitmap(buf, { width: size, height: size });
}

function getPlatformTrayName() {
    if (process.platform === 'darwin') return 'macOS Menu Bar';
    if (process.platform === 'win32') return 'Windows System Tray';
    return 'System Tray';
}

function getPlatformShortcutLabel() {
    return process.platform === 'darwin' ? '⌘ + Shift + M' : 'Ctrl + Shift + M';
}

function buildLauncherHTML(config, activeState) {
    const modesJson = JSON.stringify(LAUNCH_MODES);
    const configJson = JSON.stringify(config);
    const stateJson = JSON.stringify(activeState);
    const trayName = getPlatformTrayName();
    const shortcutLabel = getPlatformShortcutLabel();
    const osTitle = process.platform === 'darwin' ? 'MAC' : (process.platform === 'win32' ? 'WINDOWS' : 'DESKTOP');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>DJ VFX Studio — ${osTitle} Startup & Mode Launcher</title>
<style>
    :root {
        --bg: #07080f;
        --card: rgba(18, 21, 36, 0.88);
        --card-hover: rgba(28, 33, 56, 0.95);
        --border: rgba(255, 255, 255, 0.1);
        --cyan: #00f2fe;
        --purple: #a855f7;
        --pink: #ff007f;
        --green: #22c55e;
        --amber: #f59e0b;
        --text: #f8fafc;
        --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-font-smoothing: antialiased; }
    body {
        background: radial-gradient(circle at 15% 15%, rgba(0, 242, 254, 0.12), transparent 45%),
                    radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.12), transparent 45%),
                    var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
        padding: 20px 24px 24px;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border);
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
        width: 42px; height: 42px; border-radius: 11px;
        background: linear-gradient(135deg, #00f2fe, #a855f7, #ff007f);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 800; box-shadow: 0 0 20px rgba(0, 242, 254, 0.35);
    }
    .brand-title { font-size: 19px; font-weight: 800; letter-spacing: 0.4px; }
    .brand-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .menubar-pill {
        display: flex; align-items: center; gap: 10px;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border);
        padding: 8px 14px; border-radius: 999px;
        font-size: 12px; font-weight: 600; cursor: pointer;
        transition: all 0.2s ease;
    }
    .menubar-pill:hover { border-color: var(--cyan); background: rgba(0, 242, 254, 0.1); }
    .menubar-pill.active { border-color: rgba(34, 197, 94, 0.6); background: rgba(34, 197, 94, 0.12); color: #86efac; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #64748b; }
    .dot.on { background: var(--green); box-shadow: 0 0 8px var(--green); }

    .hero-bar {
        display: flex; align-items: center; justify-content: space-between;
        background: linear-gradient(90deg, rgba(0, 242, 254, 0.12), rgba(168, 85, 247, 0.12));
        border: 1px solid rgba(0, 242, 254, 0.35);
        border-radius: 14px;
        padding: 14px 18px;
    }
    .hero-info { display: flex; flex-direction: column; gap: 4px; }
    .hero-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--cyan); font-weight: 700; }
    .hero-mode-name { font-size: 16px; font-weight: 700; }
    .hero-actions { display: flex; align-items: center; gap: 10px; }
    .btn-primary {
        background: linear-gradient(135deg, #00f2fe, #3b82f6);
        color: #040711; font-weight: 800; font-size: 13px;
        border: none; border-radius: 9px; padding: 10px 18px;
        cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;
        box-shadow: 0 4px 15px rgba(0, 242, 254, 0.3);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0, 242, 254, 0.45); }
    .btn-secondary {
        background: rgba(255,255,255,0.07); color: var(--text);
        border: 1px solid var(--border); border-radius: 9px;
        padding: 9px 13px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.14); }

    .status-strip {
        display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
        background: rgba(10, 12, 22, 0.75); border: 1px solid var(--border);
        border-radius: 10px; padding: 9px 14px; font-size: 12px;
    }
    .status-item { display: flex; align-items: center; gap: 7px; margin-right: 14px; color: var(--muted); }
    .status-item strong { color: var(--text); }

    .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
    .card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 13px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 12px;
        transition: all 0.18s ease;
        position: relative;
    }
    .card:hover { background: var(--card-hover); border-color: rgba(255,255,255,0.24); transform: translateY(-1px); }
    .card.is-default { border-color: var(--cyan); box-shadow: 0 0 0 1px rgba(0, 242, 254, 0.3), 0 8px 24px rgba(0, 0, 0, 0.4); }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .badge {
        font-size: 10px; font-weight: 800; letter-spacing: 0.7px;
        padding: 3px 8px; border-radius: 6px;
        background: rgba(255,255,255,0.07); color: var(--cyan);
    }
    .default-star {
        font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px;
        cursor: pointer; border: 1px solid var(--border);
        background: rgba(255,255,255,0.04); color: var(--muted);
        transition: all 0.15s ease;
    }
    .default-star:hover { color: var(--text); border-color: var(--cyan); }
    .default-star.active {
        background: rgba(0, 242, 254, 0.18);
        border-color: var(--cyan);
        color: var(--cyan);
    }
    .card-title { font-size: 15px; font-weight: 700; margin-top: 6px; }
    .card-desc { font-size: 12px; color: var(--muted); line-height: 1.4; margin-top: 4px; }
    .card-actions { display: flex; gap: 8px; align-items: center; margin-top: 2px; }
    .btn-launch {
        flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.08); color: var(--text);
        font-weight: 700; font-size: 12px; cursor: pointer; transition: all 0.15s ease;
    }
    .btn-launch:hover { background: var(--cyan); color: #05070f; border-color: var(--cyan); }
    .btn-browser {
        padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border);
        background: rgba(255,255,255,0.04); color: var(--muted);
        font-size: 11px; font-weight: 600; cursor: pointer;
    }
    .btn-browser:hover { color: var(--text); border-color: rgba(255,255,255,0.3); }
    .footer {
        display: flex; justify-content: space-between; align-items: center;
        font-size: 11px; color: var(--muted); padding-top: 6px;
    }
</style>
</head>
<body>
    <div class="header">
        <div class="brand">
            <div class="brand-icon">⚡</div>
            <div>
                <div class="brand-title">DJ VFX STUDIO — ${osTitle} MODE LAUNCHER</div>
                <div class="brand-sub">Select any startup mode, launch multi-screen rigs, or customize your default startup preset</div>
            </div>
        </div>
        <button id="btn-toggle-menubar" class="menubar-pill">
            <span id="menubar-dot" class="dot"></span>
            <span id="menubar-label">Show in ${trayName}</span>
        </button>
    </div>

    <div class="hero-bar">
        <div class="hero-info">
            <div class="hero-label">★ Current Default Startup Mode</div>
            <div class="hero-mode-name" id="default-mode-display">1. Full Studio Mode</div>
        </div>
        <div class="hero-actions">
            <button id="btn-launch-default" class="btn-primary">🚀 Launch Default Mode Now</button>
            <button id="btn-launch-default-browser" class="btn-secondary">🌐 Open Default in Browser</button>
        </div>
    </div>

    <div class="status-strip">
        <div class="status-item"><span id="dot-bridge" class="dot"></span> Hardware Bridge (:8080): <strong id="lbl-bridge">Checking...</strong></div>
        <div class="status-item"><span id="dot-vite" class="dot"></span> Visualizer (:5173): <strong id="lbl-vite">Ready</strong></div>
        <div class="status-item">Active Mode: <strong id="lbl-active-mode">Studio</strong></div>
    </div>

    <div class="grid" id="modes-grid"></div>

    <div class="footer">
        <div>Tip: Click <strong>"★ Set Default"</strong> on any card to make it your automatic startup mode.</div>
        <div>Shortcut: <strong>${shortcutLabel}</strong> opens this Mode Switcher anytime</div>
    </div>

<script>
    const MODES = ${modesJson};
    const TRAY_NAME = ${JSON.stringify(trayName)};
    let currentConfig = ${configJson};
    let currentState = ${stateJson};

    const grid = document.getElementById('modes-grid');
    const defaultDisplay = document.getElementById('default-mode-display');
    const btnMenuBar = document.getElementById('btn-toggle-menubar');
    const menuBarDot = document.getElementById('menubar-dot');
    const menuBarLabel = document.getElementById('menubar-label');

    function render() {
        const defMode = MODES.find(m => m.id === currentConfig.defaultMode) || MODES[0];
        defaultDisplay.textContent = defMode.shortTitle + ' — ' + defMode.badge;

        if (currentConfig.showInMenuBar) {
            btnMenuBar.classList.add('active');
            menuBarDot.classList.add('on');
            menuBarLabel.textContent = 'In ' + TRAY_NAME + ' (Click to Remove)';
        } else {
            btnMenuBar.classList.remove('active');
            menuBarDot.classList.remove('on');
            menuBarLabel.textContent = 'Add to ' + TRAY_NAME;
        }

        document.getElementById('dot-bridge').className = 'dot ' + (currentState.bridgeRunning ? 'on' : '');
        document.getElementById('lbl-bridge').textContent = currentState.bridgeRunning ? 'ONLINE' : 'STANDBY';
        document.getElementById('dot-vite').className = 'dot on';
        document.getElementById('lbl-active-mode').textContent = (currentState.activeMode || currentConfig.defaultMode).toUpperCase();

        grid.innerHTML = '';
        MODES.forEach(mode => {
            const isDef = currentConfig.defaultMode === mode.id;
            const card = document.createElement('div');
            card.className = 'card' + (isDef ? ' is-default' : '');

            const browserBtnHtml = mode.urlQuery !== null
                ? '<button class="btn-browser" data-browser="' + mode.id + '" title="Open in Default Web Browser">🌐 Browser</button>'
                : '';

            card.innerHTML = \`
                <div>
                    <div class="card-top">
                        <span class="badge" style="color:\${mode.color}">\${mode.badge}</span>
                        <button class="default-star \${isDef ? 'active' : ''}" data-default="\${mode.id}">
                            \${isDef ? '★ DEFAULT MODE' : '☆ Set Default'}
                        </button>
                    </div>
                    <div class="card-title">\${mode.shortTitle}</div>
                    <div class="card-desc">\${mode.subtitle}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-launch" data-launch="\${mode.id}">⚡ Launch \${mode.title}</button>
                    \${browserBtnHtml}
                </div>
            \`;
            grid.appendChild(card);
        });

        grid.querySelectorAll('[data-default]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const modeId = btn.getAttribute('data-default');
                if (window.electronAPI && window.electronAPI.setLauncherDefaultMode) {
                    currentConfig = await window.electronAPI.setLauncherDefaultMode(modeId);
                    render();
                }
            });
        });

        grid.querySelectorAll('[data-launch]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const modeId = btn.getAttribute('data-launch');
                if (window.electronAPI && window.electronAPI.launchVfxMode) {
                    const res = await window.electronAPI.launchVfxMode(modeId, false);
                    if (res && res.state) currentState = res.state;
                    render();
                }
            });
        });

        grid.querySelectorAll('[data-browser]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const modeId = btn.getAttribute('data-browser');
                if (window.electronAPI && window.electronAPI.launchVfxMode) {
                    await window.electronAPI.launchVfxMode(modeId, true);
                }
            });
        });
    }

    btnMenuBar.addEventListener('click', async () => {
        if (window.electronAPI && window.electronAPI.toggleMenuBarTray) {
            currentConfig = await window.electronAPI.toggleMenuBarTray(!currentConfig.showInMenuBar);
            render();
        }
    });

    document.getElementById('btn-launch-default').addEventListener('click', async () => {
        if (window.electronAPI && window.electronAPI.launchVfxMode) {
            await window.electronAPI.launchVfxMode(currentConfig.defaultMode, false);
        }
    });

    document.getElementById('btn-launch-default-browser').addEventListener('click', async () => {
        if (window.electronAPI && window.electronAPI.launchVfxMode) {
            await window.electronAPI.launchVfxMode(currentConfig.defaultMode, true);
        }
    });

    render();
</script>
</body>
</html>`;
}

class LauncherManager {
    constructor(callbacks) {
        this.callbacks = callbacks; // { launchMode, getState, rebuildAppMenu }
        this.config = loadConfig();
        this.tray = null;
        this.launcherWindow = null;
        this.registerIpcHandlers();
    }

    initTrayIfEnabled() {
        if (this.config.showInMenuBar) {
            this.createTray();
        } else {
            this.destroyTray();
        }
        this.updateDockMenu();
    }

    createTray() {
        if (this.tray) {
            this.refreshTrayMenu();
            return;
        }
        try {
            const icon = createMenuBarIcon(true);
            this.tray = new Tray(icon);
            this.tray.setToolTip('DJ VFX Studio — Quick Mode Launcher');
            if (process.platform === 'win32') {
                this.tray.on('double-click', () => this.openLauncherWindow());
            }
            this.refreshTrayMenu();
        } catch (err) {
            console.error('[LauncherManager] Failed to create Tray icon:', err.message);
        }
    }

    destroyTray() {
        if (this.tray) {
            try { this.tray.destroy(); } catch (e) {}
            this.tray = null;
        }
    }

    setShowInMenuBar(enabled) {
        this.config = saveConfig({ showInMenuBar: Boolean(enabled) });
        if (this.config.showInMenuBar) {
            this.createTray();
        } else {
            this.destroyTray();
        }
        if (this.callbacks.rebuildAppMenu) {
            this.callbacks.rebuildAppMenu();
        }
        return this.config;
    }

    setDefaultMode(modeId) {
        if (!LAUNCH_MODES.some(m => m.id === modeId)) return this.config;
        this.config = saveConfig({ defaultMode: modeId });
        this.refreshTrayMenu();
        this.updateDockMenu();
        if (this.callbacks.rebuildAppMenu) {
            this.callbacks.rebuildAppMenu();
        }
        return this.config;
    }

    buildModeMenuTemplate(includeTrayToggle = true) {
        this.config = loadConfig();
        const defMode = getModeById(this.config.defaultMode);
        const state = this.callbacks.getState ? this.callbacks.getState() : { activeMode: this.config.defaultMode, bridgeRunning: true };

        const launchItems = LAUNCH_MODES.map(mode => ({
            label: `${mode.shortTitle}${this.config.defaultMode === mode.id ? '  ★ Default' : ''}`,
            type: 'radio',
            checked: state.activeMode === mode.id,
            click: () => this.callbacks.launchMode(mode.id, false)
        }));

        const browserItems = LAUNCH_MODES.filter(m => m.urlQuery !== null).map(mode => ({
            label: `Open ${mode.shortTitle} in Browser`,
            click: () => this.callbacks.launchMode(mode.id, true)
        }));

        const defaultModeItems = LAUNCH_MODES.map(mode => ({
            label: mode.shortTitle,
            type: 'radio',
            checked: this.config.defaultMode === mode.id,
            click: () => this.setDefaultMode(mode.id)
        }));

        const template = [
            {
                label: `⚡ DJ VFX Studio (${(state.activeMode || 'studio').toUpperCase()})`,
                enabled: false
            },
            {
                label: `🔌 Hardware Bridge (:8080): ${state.bridgeRunning ? 'ONLINE' : 'STOPPED'}`,
                enabled: false
            },
            { type: 'separator' },
            {
                label: `🚀 Launch Default (${defMode.title})`,
                accelerator: 'CmdOrCtrl+Shift+Return',
                click: () => this.callbacks.launchMode(this.config.defaultMode, false)
            },
            {
                label: '🪟 Open Mode Launcher Window...',
                accelerator: 'CmdOrCtrl+Shift+M',
                click: () => this.openLauncherWindow()
            },
            { type: 'separator' },
            {
                label: 'Switch / Launch VFX Mode',
                submenu: launchItems
            },
            {
                label: 'Open Mode in Web Browser',
                submenu: browserItems
            },
            {
                label: '★ Set Default Startup Mode',
                submenu: defaultModeItems
            }
        ];

        if (includeTrayToggle) {
            const trayLabel = `Show in ${getPlatformTrayName()}`;
            template.push(
                { type: 'separator' },
                {
                    label: trayLabel,
                    type: 'checkbox',
                    checked: Boolean(this.config.showInMenuBar),
                    click: () => this.setShowInMenuBar(!this.config.showInMenuBar)
                },
                { type: 'separator' },
                {
                    label: 'Quit DJ VFX Studio',
                    role: 'quit'
                }
            );
        }

        return template;
    }

    refreshTrayMenu() {
        if (!this.tray) return;
        const menu = Menu.buildFromTemplate(this.buildModeMenuTemplate(true));
        this.tray.setContextMenu(menu);
    }

    updateDockMenu() {
        if (process.platform === 'darwin' && app.dock) {
            try {
                const dockMenu = Menu.buildFromTemplate(this.buildModeMenuTemplate(false));
                app.dock.setMenu(dockMenu);
            } catch (e) {}
        }
    }

    openLauncherWindow() {
        this.config = loadConfig();
        if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
            this.launcherWindow.focus();
            return this.launcherWindow;
        }

        this.launcherWindow = new BrowserWindow({
            width: 880,
            height: 680,
            minWidth: 760,
            minHeight: 600,
            backgroundColor: '#07080f',
            title: 'DJ VFX Studio — Mac Startup & Mode Launcher',
            resizable: true,
            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        const state = this.callbacks.getState ? this.callbacks.getState() : { activeMode: this.config.defaultMode, bridgeRunning: true };
        const html = buildLauncherHTML(this.config, state);
        this.launcherWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        this.launcherWindow.on('closed', () => {
            this.launcherWindow = null;
        });

        return this.launcherWindow;
    }

    registerIpcHandlers() {
        ipcMain.handle('launcher:getConfig', () => {
            this.config = loadConfig();
            return this.config;
        });

        ipcMain.handle('launcher:setDefaultMode', (event, modeId) => {
            return this.setDefaultMode(modeId);
        });

        ipcMain.handle('launcher:toggleMenuBar', (event, enabled) => {
            return this.setShowInMenuBar(enabled);
        });

        ipcMain.handle('launcher:launchMode', async (event, { modeId, openInBrowser }) => {
            await this.callbacks.launchMode(modeId, Boolean(openInBrowser));
            const state = this.callbacks.getState ? this.callbacks.getState() : {};
            return { config: this.config, state };
        });
    }
}

module.exports = {
    LAUNCH_MODES,
    CONFIG_PATH,
    loadConfig,
    saveConfig,
    getModeById,
    getPlatformTrayName,
    LauncherManager
};

