import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

if (process.platform === 'darwin') {
    const appPath = path.join(rootDir, 'DJ VFX Launcher.app');
    if (!fs.existsSync(appPath)) {
        execSync('bash scripts/build-mac-launcher.sh', { cwd: rootDir, stdio: 'inherit' });
    }
    spawn('open', [appPath], { cwd: rootDir, detached: true, stdio: 'ignore' }).unref();
} else if (process.platform === 'win32') {
    const exePath = path.join(rootDir, 'DJ VFX Launcher.exe');
    if (!fs.existsSync(exePath)) {
        execSync('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-win-launcher.ps1', {
            cwd: rootDir,
            stdio: 'inherit'
        });
    }
    spawn(exePath, [], { cwd: rootDir, detached: true, stdio: 'ignore' }).unref();
} else {
    spawn('npx', ['electron', 'electron/main.cjs', '--dev', '--launcher'], {
        cwd: rootDir,
        detached: true,
        stdio: 'ignore'
    }).unref();
}

