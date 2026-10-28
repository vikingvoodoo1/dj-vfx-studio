import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(os.homedir(), '.dj-vfx-launcher.json');

function readSavedDefaultMode() {
    try {
        if (fs.existsSync(configPath)) {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (data && data.defaultMode) return data.defaultMode;
        }
    } catch (e) {}
    return 'studio';
}

const modeArg = process.argv.find(a => a.startsWith('--mode='));
const shouldOpenBrowser = process.argv.includes('--open');
const selectedMode = modeArg ? modeArg.replace('--mode=', '').trim() : readSavedDefaultMode();

const needsBridge = selectedMode !== 'vite-only';
const needsVite = selectedMode !== 'bridge-only';

console.log('\x1b[36m%s\x1b[0m', '═════════════════════════════════════════════════════════════════════');
console.log('\x1b[35m%s\x1b[0m', `  ⚡ DJ VFX STUDIO — UNIFIED LIVE SYSTEM LAUNCHER [MODE: ${selectedMode.toUpperCase()}]`);
console.log('\x1b[32m%s\x1b[0m', `  🚀 Services: ${needsVite ? 'Three.js Visualizer (:5173)' : ''}${needsVite && needsBridge ? ' + ' : ''}${needsBridge ? 'Universal Hardware Bridge (:8080)' : ''}`);
console.log('\x1b[36m%s\x1b[0m', '═════════════════════════════════════════════════════════════════════');

let bridgeProc = null;
let viteProc = null;

// 1. Launch Hardware Bridge (StageLinQ, Pioneer, Traktor, Hue, OBS Sync)
if (needsBridge) {
    bridgeProc = spawn(process.execPath, ['server/stagelinq-bridge.js'], {
        cwd: rootDir,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: process.env
    });

    bridgeProc.stdout.on('data', (chunk) => {
        process.stdout.write(`\x1b[34m[Bridge]\x1b[0m ${chunk}`);
    });

    bridgeProc.stderr.on('data', (chunk) => {
        process.stderr.write(`\x1b[31m[Bridge Error]\x1b[0m ${chunk}`);
    });

    bridgeProc.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`\x1b[31m[Bridge] Process exited with code ${code}\x1b[0m`);
        }
        if (!needsVite) shutdown();
    });
}

// 2. Launch Vite Dev Server
if (needsVite) {
    const viteBin = path.join(rootDir, 'node_modules', '.bin', 'vite');
    viteProc = spawn(viteBin, ['--port', '5173'], {
        cwd: rootDir,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: process.env
    });

    let browserOpened = false;
    viteProc.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        process.stdout.write(`\x1b[32m[Vite]\x1b[0m ${text}`);
        if (shouldOpenBrowser && !browserOpened && text.includes('5173')) {
            browserOpened = true;
            openModeUrlsInBrowser(selectedMode);
        }
    });

    viteProc.stderr.on('data', (chunk) => {
        process.stderr.write(`\x1b[33m[Vite Notice]\x1b[0m ${chunk}`);
    });

    viteProc.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`\x1b[31m[Vite] Process exited with code ${code}\x1b[0m`);
        }
        shutdown();
    });
}

function openModeUrlsInBrowser(mode) {
    if (process.platform !== 'darwin') return;
    if (mode === 'electron') {
        const electronBin = path.join(rootDir, 'node_modules', '.bin', 'electron');
        spawn(electronBin, ['electron/main.cjs', '--dev', '--mode=electron'], {
            cwd: rootDir,
            detached: true,
            stdio: 'ignore'
        }).unref();
        return;
    }
    if (mode === 'dual-rig') {
        spawn('open', ['http://localhost:5173/?mode=controller']);
        setTimeout(() => spawn('open', ['http://localhost:5173/?mode=stage&clean=true']), 400);
        return;
    }
    const queryMap = {
        'studio': '',
        'stage': '?mode=stage&clean=true',
        'obs': '?mode=obs',
        'obs-overlay': '?mode=obs&overlay=true',
        'vite-only': ''
    };
    const q = queryMap[mode] ?? '';
    spawn('open', [`http://localhost:5173/${q}`]);
}

// Graceful Cleanup
function shutdown() {
    console.log('\n\x1b[33m[DJ VFX Studio] Shutting down all services cleanly...\x1b[0m');
    if (bridgeProc) {
        try { bridgeProc.kill('SIGTERM'); } catch (e) {}
    }
    if (viteProc) {
        try { viteProc.kill('SIGTERM'); } catch (e) {}
    }
    setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);
