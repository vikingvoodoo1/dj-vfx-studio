# ⚡ DJ VFX Studio — Startup Launcher, Modes & Deployment Guide (macOS & Windows)

DJ VFX Studio includes a complete **Multi-Mode Startup Launcher & System Tray / Menu Bar Suite** for both **macOS** and **Windows**, as well as an **Integrated Mode Switcher** built directly into the packaged Electron desktop application (`DJ VFX Studio.app` / `DJ VFX Studio.exe`).

---

## 1. Architecture Overview

The startup launcher system consists of three synchronized components that share a single user configuration file (`~/.dj-vfx-launcher.json` on macOS / `%USERPROFILE%\.dj-vfx-launcher.json` on Windows):

1. **Standalone macOS Native Launcher (`DJ VFX Launcher.app`)**
   - Source: [`mac-launcher/LauncherApp.swift`](file:///Users/jarikuhanen/agy/dj-vfx-studio/mac-launcher/LauncherApp.swift)
   - Build script: [`scripts/build-mac-launcher.sh`](file:///Users/jarikuhanen/agy/dj-vfx-studio/scripts/build-mac-launcher.sh)
   - Native Apple Silicon (`arm64`) SwiftUI + AppKit application (~500 KB binary) with a live `NSStatusItem` (`⚡ VFX`) in the macOS Menu Bar.

2. **Standalone Windows Native Launcher (`DJ VFX Launcher.exe` & `DJ VFX Launcher.bat`)**
   - Source: [`win-launcher/LauncherApp.cs`](file:///Users/jarikuhanen/agy/dj-vfx-studio/win-launcher/LauncherApp.cs)
   - Build script: [`scripts/build-win-launcher.ps1`](file:///Users/jarikuhanen/agy/dj-vfx-studio/scripts/build-win-launcher.ps1) & 1-click starter [`DJ VFX Launcher.bat`](file:///Users/jarikuhanen/agy/dj-vfx-studio/DJ%20VFX%20Launcher.bat)
   - Native Windows `.NET` WinForms application with a custom-rendered neon 4-bar equalizer icon in the **Windows System Tray (`NotifyIcon`)**.

3. **Integrated Electron Mode Switcher & Packaged Server**
   - Source: [`electron/launcher-manager.cjs`](file:///Users/jarikuhanen/agy/dj-vfx-studio/electron/launcher-manager.cjs), [`electron/main.cjs`](file:///Users/jarikuhanen/agy/dj-vfx-studio/electron/main.cjs), [`electron/preload.cjs`](file:///Users/jarikuhanen/agy/dj-vfx-studio/electron/preload.cjs)
   - Built directly into `DJ VFX Studio.app` (macOS) and `DJ VFX Studio.exe` (Windows).
   - Press **`⌘ + Shift + M`** (macOS) or **`Ctrl + Shift + M`** (Windows) at any time to open the Mode Launcher window, switch modes from the `Modes` menu, or toggle the Menu Bar / System Tray icon.

---

## 2. All Supported Startup & Display Modes

By default, **Mode 1 (`Full Studio Mode`)** is pre-selected as the startup default, and **any** mode below can be promoted to your new Default Mode with a single click:

| # | Mode ID | Mode Name | URL / Target | Services Started | Description |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | `studio` *(Default)* | **Full Studio Mode** | `http://localhost:5173/` | Vite (`:5173`) + Bridge (`:8080`) | Main 3D WebGL stage + Studio Console HUD + Top Dynamic Island Cockpit + Full Hardware Bridge. |
| **2** | `stage` | **Clean Stage / Projector Mode** | `http://localhost:5173/?mode=stage&clean=true` | Vite (`:5173`) + Bridge (`:8080`) | Zero-HUD, cursor-hidden 3D visual feed designed for external LED walls, projectors, and TVs. |
| **3** | `dual-rig` | **Detached Controller + Stage Rig** | `?mode=controller` + `?mode=stage&clean=true` | Vite (`:5173`) + Bridge (`:8080`) | Dual-window live setup: opens both the Detached Master Control Console and Clean Stage Output. |
| **4a** | `obs` | **OBS Stream Mode (Clean Feed)** | `http://localhost:5173/?mode=obs` | Vite (`:5173`) + Bridge (`:8080`) | Zero-FOUC broadcast stream output and automatically copies the OBS Browser Source URL to the clipboard. |
| **4b** | `obs-overlay` | **OBS Transparent Alpha Overlay** | `http://localhost:5173/?mode=obs&overlay=true` | Vite (`:5173`) + Bridge (`:8080`) | Transparent alpha-channel background for compositing 3D reactive visuals over live DJ camera feeds in OBS. |
| **5** | `electron` | **Native Electron Desktop App** | Native Desktop Window + 2nd Screen Stage | Electron + Vite + Bridge | Hardware GPU-accelerated desktop app with dedicated 2nd-screen Stage Projector window. |
| **6a** | `bridge-only` | **Hardware Bridge Only (`:8080`)** | Headless Daemon (`:8080`) | Bridge Only (`:8080`) | Runs [`server/stagelinq-bridge.js`](file:///Users/jarikuhanen/agy/dj-vfx-studio/server/stagelinq-bridge.js) headless (Denon StageLinQ, Pioneer Pro DJ Link, Traktor, Hue, OBS, BUTT). |
| **6b** | `vite-only` | **Visualizer Only (`:5173`)** | `http://localhost:5173/` | Vite Only (`:5173`) | Standalone 3D WebGL visualizer without the Hardware Bridge (pure Microphone / Line-In audio reactive mode). |

---

## 3. Changing the Default Startup Mode

1. **In the Launcher Window (macOS, Windows, or Electron)**:
   - Click **`☆ Set as Default`** on the top-right corner of **any** mode card.
   - The card highlights with a cyan border and **`★ DEFAULT MODE`** badge, and the top hero bar updates immediately.
   - Click **`🚀 Launch Default Mode`** (or press `⌘Return` on Mac) to start your chosen default mode at any time.
   - Optional: Check **`Auto-launch Default when app opens`** in the hero bar if you want opening the Launcher app to immediately launch your default mode.

2. **From the macOS Menu Bar (`⚡ VFX`) or Windows System Tray**:
   - Click the `⚡ VFX` Menu Bar icon (macOS) or right-click the neon equalizer Tray icon (Windows).
   - Hover over **`★ Set Default Startup Mode`** and select any of the 8 modes.

3. **Shared Config File (`~/.dj-vfx-launcher.json`)**:
   ```json
   {
     "autoLaunchDefaultOnOpen": false,
     "defaultMode": "studio",
     "keepInMenuBarOnClose": true,
     "projectPath": "/Users/jarikuhanen/agy/dj-vfx-studio",
     "showInMenuBar": true
   }
   ```

---

## 4. Adding & Removing from the macOS Menu Bar / Windows System Tray

You can dynamically add or remove the DJ VFX icon from the **macOS Menu Bar** or **Windows System Tray** at runtime without restarting the app:

- **From the Main Launcher Window**:
  - Click the top-right pill button:
    - When active: **`● In macOS Menu Bar (Remove)`** (or **`● In Windows System Tray (Remove)`**) — clicking removes the icon immediately.
    - When hidden: **`○ Add to macOS Menu Bar`** (or **`○ Add to Windows System Tray`**) — clicking adds the icon back immediately.
- **From the Menu Bar / System Tray Dropdown**:
  - Open the `⚡ VFX` menu and click **`Remove from macOS Menu Bar`** (or **`Remove from Windows System Tray`**).
- **From the Application Menu (`DJ VFX Studio` / `DJ VFX Launcher`)**:
  - Toggle **`Show in macOS Menu Bar`** (`⌘B` in the native Mac launcher).

---

## 5. Quick NPM & CLI Commands

| Command | Action |
| :--- | :--- |
| `npm run launcher` | Opens `DJ VFX Launcher.app` on macOS or builds & opens `DJ VFX Launcher.exe` on Windows |
| `npm run launcher:build` | Builds the native launcher for your current OS and packages it into `release/` |
| `npm run launcher:build:mac` | Compiles `DJ VFX Launcher.app` via [`scripts/build-mac-launcher.sh`](file:///Users/jarikuhanen/agy/dj-vfx-studio/scripts/build-mac-launcher.sh) |
| `npm run launcher:build:win` | Compiles `DJ VFX Launcher.exe` via [`scripts/build-win-launcher.ps1`](file:///Users/jarikuhanen/agy/dj-vfx-studio/scripts/build-win-launcher.ps1) |
| `npm run electron:launcher` | Opens the Electron app directly into the Mode Switcher window |
| `node server/dev-runner.js --mode=stage --open` | Starts services for a specific mode and opens the matching browser window(s) |

---

## 6. Bundling into Downloadable Deployments (macOS & Windows)

Everything is pre-configured in [`package.json`](file:///Users/jarikuhanen/agy/dj-vfx-studio/package.json) and [`.github/workflows/release.yml`](file:///Users/jarikuhanen/agy/dj-vfx-studio/.github/workflows/release.yml) so downloadable releases for both **macOS** and **Windows** bundle the complete mode launcher system automatically:

1. **Built-in Packaged HTTP Server (`:5173`)**:
   - When a user downloads and runs the packaged `DJ VFX Studio.dmg` (Mac) or `DJ VFX Studio Setup.exe` (Windows), [`electron/main.cjs`](file:///Users/jarikuhanen/agy/dj-vfx-studio/electron/main.cjs) automatically serves the compiled `dist/` WebGL bundle on `http://127.0.0.1:5173` and proxies `/api/*` to the bundled Hardware Bridge (`:8080`).
   - This guarantees that **OBS Studio Browser Sources (`http://localhost:5173/?mode=obs`)** and **Multi-Screen Browser Modes** work out-of-the-box in downloaded deployments without requiring Node.js or Vite on the user's machine.

2. **Bundled Native Launchers in Installers & Release Artifacts**:
   - **macOS (`npm run electron:dist` on macOS)**:
     - Compiles `DJ VFX Launcher.app` and embeds it inside `DJ VFX Studio.app/Contents/Resources/DJ VFX Launcher.app` (`build.mac.extraResources`), while also outputting `release/DJ-VFX-Launcher-macOS.zip` alongside the `.dmg` and `.zip` installers.
   - **Windows (`npm run electron:dist` on Windows)**:
     - Compiles `DJ VFX Launcher.exe` and bundles `DJ VFX Launcher.exe` + `DJ VFX Launcher.bat` alongside `DJ VFX Studio.exe` inside the NSIS Installer and Portable `.exe` (`build.win.extraFiles`), while also outputting `release/DJ-VFX-Launcher-Windows.exe`.
   - **Automated GitHub Releases (`.github/workflows/release.yml`)**:
     - Pushing a version tag (`git tag v2.2.0 && git push origin v2.2.0`) builds the web app, compiles both the macOS (`macos-latest`) and Windows (`windows-2022`) native launchers, packages the Electron installers, and attaches all artifacts to the GitHub Release automatically.

