# 🎛️ DJ VFX Studio — Console Architecture, Per-Scene/Video Cog Memory, Denon Tracklist & QA Subagents Guide

This document covers the latest console enhancements, per-scene and per-video configuration modals, the dedicated Denon Engine DJ Tracklist console, the Hellfire Waveforms hardware standby overlay, and the **5 Specialized QA Subagents & Automated Health Verification Suite (`npm run verify`)**.

---

## 1. Streamlined 9-Console Activity Bar (`Alt+1` – `Alt+9`)

The left-hand Activity Bar (`#activity-bar`) organizes the studio into **9 dedicated consoles** inside a widened `568px` anti-twitch HUD container (`overflow-anchor: none; scrollbar-gutter: stable;`):

| Shortcut | Console Tab | DOM Pane ID | Purpose |
| :--- | :--- | :--- | :--- |
| **`Alt + 1`** | 🎛️ **Live Performance Deck** | `#pane-perform` | Compact Active Scene Strip + `⚙️` Cog, Live Tempo & Beat Telemetry, **Now Playing Artwork & Info Strip + Shazam**, Macro Faders, and Broadcast VU Meter |
| **`Alt + 2`** | ✨ **Visual FX Bank** | `#pane-fx` | All 23 3D WebGL Scenes with live 24 FPS animated thumbnails, per-card `⚙️` Configuration Cog, and `★` Memory Badge |
| **`Alt + 3`** | 🎨 **Branding & Logos** | `#pane-branding` | 3D DJ Logo, TV Broadcast Station Bug, and Promo Event Flyer position, spin, scale, and media manager |
| **`Alt + 4`** | 🎵 **Now Playing Overlay** | `#pane-nowplaying` | On-screen Track Banner Stream Overlay, manual track overrides, and acoustic fingerprinting |
| **`Alt + 5`** | ⚙️ **Studio Setup & Logs** | `#pane-setup` | 7 wrapped sub-tabs (`Master Console`, `2nd Screen`, `Audio Input`, `VU Targets`, `OBS`, `Decks`, `Session Metrics`) + Full JSON Backup/Restore & Confirmed Factory Reset |
| **`Alt + 6`** | ℹ️ **About & Specs** | `#pane-about` | Version info, architecture summary, and complete keyboard shortcut reference |
| **`Alt + 7`** | 🎬 **Video Loops (10 Banks)** | `#pane-video` | Scene 23 Cyber Cinema 10-bank video loop manager with per-video `⚙️` Configuration Cog and `★` Memory Badge |
| **`Alt + 8`** | 💡 **Venue & Stage Lighting** | `#pane-lighting` | Dedicated Lighting Console with **Philips Hue Smart Rig** and **DMX512 / SoundSwitch Stage Rig** sub-tabs |
| **`Alt + 9`** | 📜 **Live Session Tracklist** | `#pane-tracklist` | Dedicated Denon Engine DJ 9-column Tracklist (`▲ \| Art \| Preview \| Key \| BPM \| Length \| Title \| Artist \| Album`), Recording Transport, and Auto-Standby |
| **`H` / `C`** | 👁️ **Hide Console & Notch** | `#hud`, `#hud-top-notch` | Toggles both the main console HUD, bottom preset bar, **and** the top-center telemetry notch bar for a 100% clean display |

---

## 2. Live Performance Deck (`#pane-perform`) Enhancements

### 2.1 Compact Active Scene Strip & Direct Cog (`#video-cinema-quick-bar`)
- Located at the top of the Live Performance Deck above **Live Tempo & Beat**.
- Dynamically updates across **all 23 scenes**, showing:
  - **Scene Icon & Number/Name** (e.g., `🔥 SCENE 04 [4] • Hellfire Waveforms`)
  - **Memory Status Pill** (`DEFAULT` or `★ CUSTOM MEMORY`)
  - **Speed Pill** (`⚡ 1.00x` or `🔒 DECK SYNC`)
  - **Quick Action Buttons**: `✨ FX` (jumps to Visual FX Bank) and `⚙️` (`#btn-active-scene-cog`, opens the configuration modal for the currently active scene).

### 2.2 Current Playing Track Artwork, Metadata & Shazam Strip (`#perform-nowplaying-strip`)
- Located directly alongside the **`🔍 SHAZAM`** button (`#btn-deck-shazam-listen`) in the Live Performance Deck.
- Displays in real time (`updatePerformDeckTrackCard`):
  - **Album Artwork (`36×36px`)** with automatic vinyl fallback (`💿`)
  - **Source / Deck Pill** (`DECK 1`, `DECK 2`, `SHAZAM`, or `STANDBY`)
  - **Camelot Key Badge** (`9A`, `10B`, etc.) & **BPM Badge** (`128 BPM`)
  - **Track Title** and **Artist • Album** subtitle
- Automatically updates on Denon StageLinQ / Pioneer Pro DJ Link track loads, crossfader/channel-fader deck handovers, and accepted Shazam matches.

---

## 3. Per-Scene & Per-Video Configuration Cog (`⚙️`) Modals

### 3.1 Per-Scene Configuration Modal (`src/ui/scene-config-cog.js`)
Every scene card in the **Visual FX Bank (`#pane-fx`)** and the **Active Scene Strip (`#btn-active-scene-cog`)** features a `⚙️` button that opens the Scene Configuration Modal (`#scene-cog-modal-backdrop`):
- **⚡ Effect Animation Speed (`0.10x` – `3.00x`)**: Adjusts shader and camera animation speed for that specific scene (`vfx.setSceneSpeed(sceneIdx, speed)`). Automatically hidden on deck-locked scenes (`Scene 04: Hellfire Waveforms` and `Scene 16: Time.is Clock`).
- **🔥 Hellfire Fader Handover Tolerance (`50%` – `98%`)**: Exclusively shown when configuring **Scene 04: Hellfire Waveforms**, controlling the mixer fader threshold where the incoming deck swaps to the top lead rail and outgoing rail smoke billows.
- **💾 Remember Config for Scene**: Captures and persists a complete snapshot (`getCurrentConsoleSnapshot`) for that scene across:
  1. **(a) DJ, Station & Promo Flyer Branding**: Visibility, media asset, position, spin mode, spin speed, scale, X/Y offsets, contrast, brightness, and contrast shield.
  2. **(b) Performance Macro Faders**: Master Audio Gain, Bass Punch Sensitivity, and Neon Bloom Glow.
  3. **(c) Venue & Stage Lighting**: Philips Hue sync state, mode, punch intensity, floor brightness, kick strobe, and DMX512 universe/dimmer/strobe settings.
- **↺ Reset to Initial Build State**: Restores that specific scene to clean factory defaults.

### 3.2 Per-Video Configuration Modal (`src/ui/video-config-cog.js`)
Every video card in **Video Loops & Library (`#pane-video`)** features a `⚙️` button (`.video-card-cog-btn`) that opens the Video Configuration Modal (`#video-cog-modal-backdrop`):
- **(a) ⏱️ Video Play Time**: Defaults to `Full Length (0s)` or overrides clip duration (`5s`, `10s`, `15s`, `30s`, `60s`, or custom slider `0s`–`300s`).
- **(b) 🔁 Loop Video (`ON` Default)**: Sole authoritative loop control for the clip (`LOOP: ON` vs `LOOP: OFF — Advance on End`).
- **(c) ⚡ Playback Speed (`1.00x` Default)**: Per-clip playback speed (`0.25x` – `3.00x`).
- **(d) 💾 Remember Config for Video**: Saves the exact same 3-domain snapshot (DJ/Station/Flyer Branding, Macro Faders, and Hue/DMX Lighting) for that specific video clip and auto-recalls it whenever the clip goes live on Scene 23.

---

## 4. Dedicated Denon Engine DJ Tracklist Console (`#pane-tracklist`, `Alt+9`)

### 4.1 9-Column Denon Engine DJ Table Layout
The Tracklist lives in its own top-level console tab (`#pane-tracklist`) with tightened `3px` column gaps inside the `568px` HUD:

`▲ (#) | Art | Preview | Key | BPM | Length | Title | Artist | Album`

- **Art (`28×28px`)**: High-resolution track album cover art (from Denon Engine OS `m.db`, local `/api/artwork`, or iTunes Search API).
- **Preview (`88×24px`)**: Authentic bottom-anchored **Denon Engine DJ 3-Band Preview Waveform** (`generateDenonWaveformDataUrl` in `src/services/session-tracker.js`):
  - **Low Frequencies**: Denon Deep Blue (`#0058ff`) + Cyan-Blue (`#00a8ff`) foundation
  - **Mid Frequencies**: Denon Emerald Green (`#00e050`) middle body
  - **High Frequencies**: Crisp White (`#ffffff`) upper transients
  - **Beat Grid & Hot Cues**: Subtle vertical 4/4 phrase ticks and colored hot-cue triangles (`▲`) along the baseline — zero fire or smoke distortion.
- **Key**: Color-coded Camelot Key (`9A`, `10A`, `4A`, `8B`, `12A`, etc.) using authentic Engine DJ Camelot colors.
- **BPM & Length**: Rounded integer BPM and `MM:SS` track duration.
- **Title, Artist & Album**: Explicit side-by-side columns with full hover tooltips, plus a lower metadata pill bar (`Deck`, `Full Key`, `💿 Album`, `🏷️ Genre`, `📏 Beat Grid`, and relative set timestamp).
- **Automatic Metadata Enrichment (`enrichMissingTrackMetadata`)**: Any track logged without Album, Genre, or Duration is automatically enriched in the background via the iTunes Search API (`collectionName`, `primaryGenreName`, `trackTimeMillis`).

### 4.2 Recording Transport & Configurable Idle Auto-Standby
- **Transport Controls**: `⏺ REC`, `⏸ PAUSE`, and `⏹ STOP` buttons in both `#pane-tracklist` and the Top Notch bar.
- **Duplicate Prevention Across Reloads**: Persists `lastTrackPerDeck` in `localStorage` and runs `deduplicateHistory()` on startup so refreshing or rebuilding the page never creates duplicate track or transition entries.
- **Configurable Idle Auto-Standby (`15 Min Default`)**: Automatically pauses recording into Standby when hardware decks go offline or when no deck activity occurs for the configured timeout (`5m`, `10m`, `15m`, `30m`, `60m`, or `Never`).

---

## 5. Hellfire Waveforms (`FX 3` / Scene 04) — Offline Center-Screen Overlay

When **Scene 04: Hellfire Waveforms** is active and hardware decks are not detected (`!isHardwareConnected && !isHardwareDeckStreaming`):
- A prominent centered overlay box (`#hellfire-decks-offline-overlay` in the DOM and a matching centered banner inside `renderDJDeckHUD` on the 3D canvas) is rendered right in the middle of the screen over everything:
  > **🔥 TURN ON DECKS TO ACTIVATE THIS SCENE**
  > `AWAITING DENON STAGELINQ / PIONEER PRO DJ LINK HARDWARE TELEMETRY`
- The instant hardware decks connect (or when switching to another scene), the overlay automatically disappears.

---

## 6. Settings Sub-Tab Split, Full Backup/Restore & Confirmed Factory Reset (`#pane-setup`)

- **7 Multi-Line Wrapped Sub-Tabs**:
  1. `🎛️ MASTER CONSOLE` (`master`)
  2. `🖥️ 2ND SCREEN` (`stage`)
  3. `🎙️ AUDIO INPUT` (`audio`)
  4. `🎚️ VU TARGETS` (`vutargets`)
  5. `📡 OBS` (`obs`)
  6. `🎧 DECKS` (`bridge`)
  7. `📊 SESSION METRICS` (`session`)
- **Persistent Footer Below All Sub-Tabs (`#setup-persistent-footer`)**:
  - **💾 Backup All Settings (`#btn-setup-backup-all`)**: Exports a timestamped `.json` snapshot of all `localStorage` studio settings, all 23 custom scene profiles, video bank configs, branding offsets, and lighting overrides.
  - **📂 Restore from Backup (`#btn-setup-restore-backup`)**: Restores a `.json` backup file and reloads the studio state.
  - **↺ Restore Default Settings & Scenes (`#btn-setup-reset-all`)**: Always prompts with a confirmation dialog (`window.confirm`) before resetting parameters and scene profiles to factory build state.

---

## 7. QA Subagents, Skills & Automated Health Suite (`npm run verify`)

To keep performance at 60 FPS, prevent UI regressions, and keep the main AI context window lean, the repository includes **5 specialized QA subagents**, a workspace skill, and an automated verification runner.

### 7.1 Running the Automated Health Suite
Run at any time (and automatically after any UI, CSS, shader, or bridge edit):
```bash
npm run verify
```
This executes [`scripts/verify-studio-health.mjs`](file:///Users/jarikuhanen/agy/dj-vfx-studio/scripts/verify-studio-health.mjs), running **49 automated checks** across 5 domains in ~1.5 seconds.

### 7.2 The 5 Specialized QA Subagents

| Subagent Name | Role & Verification Scope |
| :--- | :--- |
| **`perf-watchdog`** | **WebGL, WebAudio & WebSocket Performance Auditor**: Verifies 60 FPS frame budget, WebAudio `drainNode` non-zero gain (`0.000001` to prevent Chromium AudioFIFO native memory leaks), Philips Hue beat throttling (`>= 70ms`), and `requestAnimationFrame` DOM diffing (`500ms` throttling on `updateSceneRequirementsUI`). |
| **`ui-wiring-verifier`** | **Interactive UI & Event Wiring Tester**: Verifies all 9 `.activity-tab[data-tab]` buttons match `#pane-<tab>`, all 7 `.setup-nav-tab[data-setuptab]` buttons match `#setup-content-<subtab>`, all 3 `⚙️` cog buttons (`.fx-card-cog-btn`, `.video-card-cog-btn`, `#btn-active-scene-cog`) open their modals, and `getCurrentConsoleSnapshot` references only declared variables (`isCurrentDjVideo`, `isCurrentStationVideo`, `isCurrentFlyerVideo`). |
| **`ui-visual-critic`** | **Layout, Grid Alignment & Anti-Twitch Inspector**: Verifies `#hud` width (`568px`), 1:1 9-column Denon Tracklist grid alignment (`▲ \| Art \| Preview \| Key \| BPM \| Length \| Title \| Artist \| Album`), `text-overflow: ellipsis`, and anti-twitch CSS rules (`overflow-anchor: none; scrollbar-gutter: stable;`). |
| **`stagelinq-telemetry-auditor`** | **Hardware Deck, Bridge & Session Tracker Auditor**: Verifies `#hellfire-decks-offline-overlay` and 3D HUD offline banner behavior on Scene 04, deck handover tracking, 15m idle auto-standby, Denon 3-band Blue/Green/White preview waveform generation, and automatic `enrichMissingTrackMetadata()` enrichment. |
| **`release-preflight`** | **Syntax, Build & Packaging Gatekeeper**: Runs `node --check` across all 19 ES/Node modules in `src/` and `server/`, runs `npm run build` (`vite build`), and verifies Electron + macOS/Windows native launcher packaging paths. |

### 7.3 Workspace Skill & Project Policy Files
- **Skill Definition:** [`.agents/skills/studio-qa-subagents/SKILL.md`](file:///Users/jarikuhanen/agy/dj-vfx-studio/.agents/skills/studio-qa-subagents/SKILL.md)
- **Project Rules:** [`AGENTS.md`](file:///Users/jarikuhanen/agy/dj-vfx-studio/AGENTS.md)
- **Verification Script:** [`scripts/verify-studio-health.mjs`](file:///Users/jarikuhanen/agy/dj-vfx-studio/scripts/verify-studio-health.mjs)
