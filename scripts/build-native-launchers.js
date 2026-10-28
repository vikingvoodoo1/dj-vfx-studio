import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

if (process.platform === 'darwin') {
    console.log('⚡ [Build] Compiling macOS Native Launcher (DJ VFX Launcher.app)...');
    execSync('bash scripts/build-mac-launcher.sh', { cwd: rootDir, stdio: 'inherit' });
    const releaseDir = path.join(rootDir, 'release');
    fs.mkdirSync(releaseDir, { recursive: true });
    execSync('ditto -c -k --sequesterRsrc --keepParent "DJ VFX Launcher.app" "release/DJ-VFX-Launcher-macOS.zip"', {
        cwd: rootDir,
        stdio: 'inherit'
    });
    console.log('📦 [Build] Packaged standalone macOS Launcher archive: release/DJ-VFX-Launcher-macOS.zip');
} else if (process.platform === 'win32') {
    console.log('⚡ [Build] Compiling Windows Native Launcher (DJ VFX Launcher.exe)...');
    execSync('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-win-launcher.ps1', {
        cwd: rootDir,
        stdio: 'inherit'
    });
    const releaseDir = path.join(rootDir, 'release');
    fs.mkdirSync(releaseDir, { recursive: true });
    const srcExe = path.join(rootDir, 'DJ VFX Launcher.exe');
    const destExe = path.join(releaseDir, 'DJ-VFX-Launcher-Windows.exe');
    if (fs.existsSync(srcExe)) {
        fs.copyFileSync(srcExe, destExe);
        console.log('📦 [Build] Packaged standalone Windows Launcher executable: release/DJ-VFX-Launcher-Windows.exe');
    }
} else {
    console.log('ℹ️ [Build] Native standalone launcher compilation skipped on Linux (using built-in Electron Mode Launcher).');
}

