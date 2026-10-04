import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[36m%s\x1b[0m', '═════════════════════════════════════════════════════════════════════');
console.log('\x1b[35m%s\x1b[0m', '  ⚡ DJ VFX STUDIO — UNIFIED LIVE SYSTEM LAUNCHER');
console.log('\x1b[32m%s\x1b[0m', '  🚀 Starting Three.js Visualizer (Vite) + Universal Hardware Bridge');
console.log('\x1b[36m%s\x1b[0m', '═════════════════════════════════════════════════════════════════════');

// 1. Launch Hardware Bridge (StageLinQ, Pioneer, Traktor, Hue, OBS Sync)
const bridgeProc = spawn('node', ['server/stagelinq-bridge.js'], {
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

// 2. Launch Vite Dev Server
const viteBin = path.join(rootDir, 'node_modules', '.bin', 'vite');
const viteProc = spawn(viteBin, ['--port', '5173'], {
    cwd: rootDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env
});

viteProc.stdout.on('data', (chunk) => {
    process.stdout.write(`\x1b[32m[Vite]\x1b[0m ${chunk}`);
});

viteProc.stderr.on('data', (chunk) => {
    process.stderr.write(`\x1b[33m[Vite Notice]\x1b[0m ${chunk}`);
});

// Graceful Cleanup
function shutdown() {
    console.log('\n\x1b[33m[DJ VFX Studio] Shutting down all services cleanly...\x1b[0m');
    try { bridgeProc.kill('SIGTERM'); } catch (e) {}
    try { viteProc.kill('SIGTERM'); } catch (e) {}
    setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);

bridgeProc.on('close', (code) => {
    if (code !== 0 && code !== null) {
        console.error(`\x1b[31m[Bridge] Process exited with code ${code}\x1b[0m`);
    }
});

viteProc.on('close', (code) => {
    if (code !== 0 && code !== null) {
        console.error(`\x1b[31m[Vite] Process exited with code ${code}\x1b[0m`);
    }
    shutdown();
});
