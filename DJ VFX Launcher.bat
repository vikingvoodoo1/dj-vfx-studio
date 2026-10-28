@echo off
setlocal
cd /d "%~dp0"

if not exist "DJ VFX Launcher.exe" (
    echo [DJ VFX Studio] Compiling native Windows Launcher ^(DJ VFX Launcher.exe^)...
    powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\build-win-launcher.ps1"
)

if exist "DJ VFX Launcher.exe" (
    start "" "DJ VFX Launcher.exe" %*
) else (
    echo [DJ VFX Studio] Falling back to Electron Mode Launcher...
    call npm run electron:launcher
)

