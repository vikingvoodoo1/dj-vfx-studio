# Active Task State (Anchor File)

> **Note to Agent:** Update this file as you complete steps or switch tasks. After any context compaction, read this file and run `git diff --stat` first before acting.

## 1. Current Active Goal
- **Task:** Rescan `dj-vfx-studio` at tag `v2.1.0` (`5076f00`), execute **Tier 1** (`index.html` CSS extraction + `src/effects.js` top-level shaders/textures/HUD extraction) and **Tier 2** (`src/main.js` standalone utilities extraction: `media-db.js`, `scene-thumbnails.js`, `particle-eq-2d.js`), verify with `npm run build` (`vite build`), and establish anti-monolithic architecture rules/skills across all projects.

## 2. Completed Changes (Tier 1 & Tier 2 Modularization)
- **Baseline:** Git commit `5076f00` (`HEAD -> main, tag: v2.1.0, origin/main`).
- **Tier 1 Extractions:**
  - `index.html`: **8,255 -> 3,380 lines** (-4,875 lines / -59.1%). Extracted `<style>...</style>` (formerly lines 26–4901) into `src/styles/main.css` (4,874 lines) and linked via `<link rel="stylesheet" href="/src/styles/main.css">` while preserving the synchronous Zero-FOUC `<script>` in `<head>`.
  - `src/effects.js`: **19,847 -> 10,922 lines** (-8,925 lines / -45.0%). Extracted all 81 top-level shaders, procedural textures, environment maps, and 2D HUD helpers above `createVFXScene(container)` into 4 ES modules:
    - `src/vfx/shaders.js`: **3,605 lines** (31 exported GLSL shader objects including `WitchBroomThrustShader`).
    - `src/vfx/textures-club.js`: **606 lines** (12 exported club/disco/pumpkin/beam/floor texture & PMREM environment map generators).
    - `src/vfx/textures-haunted.js`: **3,653 lines** (32 exported Haunted Manor & Matrix 2D canvas texture generators + `renderHauntedManorWindows`).
    - `src/vfx/deck-hud-renderer.js`: **1,157 lines** (6 exported DJ Deck HUD functions + internal `animDeck1BarY`/`animDeck2BarY` state).
- **Tier 2 Extractions (`src/main.js`):**
  - `src/main.js`: **10,951 -> 10,295 lines** (-656 lines / -6.0%). Extracted standalone utilities into 3 ES modules:
    - `src/ui/particle-eq-2d.js`: **101 lines** (`renderParticleSpectrumEQ` + dedicated peak/particle state arrays).
    - `src/services/media-db.js`: **65 lines** (`MediaDB` IndexedDB storage manager).
    - `src/ui/scene-thumbnails.js`: **492 lines** (`initSceneCardThumbnails` 2D canvas animated preview loop).
- **Verification:**
  - `npm run build` (`vite build`): **PASSED** in 936ms (`26 modules transformed`, `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js`).
  - Static VM & symbol export/import verification across all 9 JS modules: **PASSED** with zero syntax or reference errors.

## 3. GitHub Actions CI / Release Fix
- **Issue:** Tag `v2.1.0` build run 39268445625 failed on `windows-latest` during `npm ci` due to `better-sqlite3-multiple-ciphers` failing node-gyp Visual Studio detection, and canceled macOS/Linux builds.
- **Fix in `.github/workflows/release.yml`:**
  - Added `fail-fast: false` to matrix so OS failures do not cancel parallel builds.
  - Switched Windows runner to `windows-2022` (stable Visual Studio 2022 environment supported by node-gyp).
  - Added `npm_config_msvs_version: '2022'` and `GYP_MSVS_VERSION: '2022'` to dependency installation.
  - Updated `create-github-release` condition to `always() && !cancelled() && startsWith(github.ref, 'refs/tags/')` so releases publish with whatever platform packages succeeded.

## 4. Hardware Denon StageLinQ Deck Waveform Rendering Fix
- **Issue:** User connected Denon Prime 4 via StageLinQ; tempo and beat switched over, but the DJ deck waveform effect was not rendering or reacting to the loaded track. Then, after adding 2D canvas bars, the center appeared "blocky" instead of the intended procedural "on-fire" shader effect.
- **Root Causes Identified:**
  1. `drawMiniWaveform()` in [src/vfx/deck-hud-renderer.js](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/vfx/deck-hud-renderer.js) used hardcoded synthetic sine wave profiles and never inspected pre-analyzed hardware `samples`.
  2. The center viewport 2D canvas `fillRect` bars obstructed the underlying WebGL 3D procedural fire shader (`DJDeckWaveformShader`).
  3. `d1InPlay` / `smoothDeck1SmokePhase` in [src/effects.js](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/effects.js) dissolved the fire waveform into smoke when paused or cueing because it checked `deck1Playing` instead of whether a track was loaded.
  4. The fire shader uniforms (`uBass`, `uTransient`) depended solely on laptop microphone/line-in audio input and ignored StageLinQ beat pulses and wire audio spectral slices.
- **Changes Applied:**
  - `src/effects.js`:
    - Assigned `packet.samples` to `deck1Data` and `deck2Data` in `setDeckWaveform()` and `setDeckData()`.
    - Updated `d1InPlay`/`d2InPlay` to keep the deck active and on-fire whenever a track is loaded or has hardware waveform data.
    - Augmented `effectiveBass`, `effectiveMid`, `effectiveTreble`, and `effectiveTransient` with StageLinQ hardware beat pulses (`combinedBeatPulse`) and live waveform slices (`wireSmoothBass`, `wireSmoothHit`) so the fire roars and crackles dynamically to the beat even if computer line-in audio is silent.
  - `src/vfx/deck-hud-renderer.js`:
    - Updated `drawMiniWaveform()` to dynamically map authentic Denon Prime 4 3-band RGB samples (`r` = bass, `g` = mid, `b` = high) into the top overview rails with Edison needles.
    - Removed the solid 2D rectangular bars in the middle so the procedural WebGL "on-fire" shader (`DJDeckWaveformShader`) shines through with full fluid flame tongues, thermal turbulence, and embers.
- **Verification:**
  - `npm run build` (`vite build`): PASSED in 1.02s.
  - Runtime execution verified via automated VM mock test with zero ReferenceErrors.
  - Active Chrome tab refreshed via AppleScript.
  - Pushed to GitHub in commits `aad5ab5` and `ba8acf4`.

## 5. Active Next Step
- Confirm with user that hot cues, loops, track position needles, and the on-fire waveform are all visible and actively animating.
