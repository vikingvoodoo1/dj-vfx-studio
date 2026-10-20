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
  - `npm run build` (`vite build`): PASSED in 1.04s.
  - Runtime execution verified via automated VM mock test with zero ReferenceErrors.
  - Active Chrome tab refreshed via AppleScript.
  - Pushed to GitHub in commits `aad5ab5`, `ba8acf4`, `ffc1d00`, and release commit `3d29e8b`.
  - Created and pushed release tags **`v2.2.0`** and **`v2.2`** (Stable Release).

## 5. Status
- All changes checked into GitHub and tagged `v2.2.0` / `v2.2` stable. Release workflow triggered.

## 6. ARMED - READY Standby State, Burning Record on Fire & Track Unload Handling
- **User Request:**
  - When no track is loaded on a deck, display track info as `ARMED - READY` at the top (with artist subtitle indicating deck standby).
  - Replace album art with a procedural burning vinyl record on fire!
  - Overview tracklist waveform (upper rail) must not show synthetic waveforms; show a clean standby rail until a track is loaded and mapped out.
  - When unloading a track, cleanly remove track info and waveform until the next track is loaded.
- **Implemented Changes:**
  - `src/vfx/deck-hud-renderer.js`:
    - Added `drawBurningRecord(ctx, artX, artY, artSize, defaultColor)` and `drawFlameRing` procedural 60 FPS animation with charcoal sleeve, anisotropic grooved vinyl disc, solar/lava core spindle label, convection-driven licking fire tongues, and rising micro-embers.
    - Updated `drawArtwork` to render the burning record whenever a deck has no loaded track or album art.
    - Updated `drawMiniWaveform` to check `hasRealSamples`. When not loaded/mapped, returns immediately with a sleek dashed standby guide and `[ DECK X ARMED — WAITING FOR TRACK ON ENGINE OS ]` readout without synthetic wave bars.
    - Updated header metadata to show `ARMED - READY`, `DECK X STANDBY • LOAD TRACK ON ENGINE OS`, `--.- BPM`, and `STANDBY` key/role pills when unloaded.
    - Suppressed hot cue flags and loops on overview rails when unloaded, and parked position needle at `padX + 8` with `D1 (ARMED)` / `D2 (ARMED)`.
  - `src/effects.js`:
    - Replaced initial mock Deck 2 data with empty unloaded state (`title: ''`, `artist: ''`, `bpm: null`, `samples: null`).
    - Added `unloadDeck(deckNum)` method in `createVFXScene` return object.
    - Handled track unloads in `setDeckData` and `setDeckWaveform`.
  - `server/stagelinq-bridge.js`:
    - Added `handleDeckUnloaded(deckNum)` broadcasting `{ type: 'deck_unloaded', deck: deckNum }`.
    - Handled unloads on `/Engine/DeckX/SongLoaded` state changes, empty titles in `trackLoaded`, and `stateChanged`.
  - `src/stagelinq.js` & `src/main.js`:
    - Added `onDeckUnloaded` event plumbing and hooked to `vfx.unloadDeck(deckNum)`.
- **Verification:**
  - `npm run build` (`vite build`): PASSED in 1.10s.
  - Node syntax check on `server/stagelinq-bridge.js`: PASSED.
  - Node VM execution test on `renderDJDeckHUD`: PASSED across all deck configurations.
  - Chrome tab reloaded with new bundle.

## 7. Hellfire Waveforms (Scene 04) Halloween Relocation, Dynamic Header Swapping, Duplicate Info Elimination & Outgoing Rail Smoke
- **User Goals:**
  1. Move the DJ Wave scene into the **Halloween Spooky** scene group and rename it to a badass name fitting the Halloween fire theme (chosen: **"Hellfire Waveforms"** / **"Hellfire Wave"**, icon `🔥`).
  2. Tweak the scene so when top track waveforms swap over during mixing (crossfader / channel faders), the track info and album art also get updated accordingly to match the lead track, eliminating duplicate info.
  3. Make realistic convective smoke billow off the outgoing long track wave at the top when fading out and the new lead track takes over.
- **Implemented Changes:**
  - **Scene Relocation & Rebranding:**
    - `src/scene-profiles.js`: Renamed FX 3 to `'Hellfire Waveforms'`, changed `category` to `'spooky'`, `categoryLabel` to `'Halloween Spooky'`, and icon to `'🔥'`.
    - `index.html`: Moved card 3 to `data-fxcat="spooky"`, updated title to `🔥 04: Hellfire Waveforms`, category badge to `🎃 Spooky Special`, preset button 3 to `data-cat="spooky"`, and label to `🔥 04: Hellfire Wave`.
    - `src/main.js`: Updated `FX_NAMES[3]` to `'Scene 04: Hellfire Waveforms'`.
    - `src/ui/scene-thumbnails.js`: Transformed thumbnail preview 3 into a roaring amber/orange Hellfire waveform with glowing ember cursor.
  - **Duplicate Info Bug Elimination:**
    - `server/stagelinq-bridge.js`: Fixed `parseDeckNumber(status)` which previously returned `1` for StateMap updates lacking `status.deck`, mistakenly assigning Deck 2 track titles to Deck 1. Now inspects `name`, `path`, `key`, and regex `/(?:Deck|CH|Channel)(\d+)/i`. Added direct StateMap message handlers for `/Engine/Deck(\d+)/Track/SongName` and `ArtistName`.
    - `src/effects.js`: When a deck's track title changes in `setDeckData`, dynamically resets `artworkImg = null`, `artworkUrl = ''`, and `_artRequested = false` to prevent stale album art. Added `loadDeckArtwork` trigger for Deck 1.
  - **Dynamic Lead / Outgoing Header Swapping:**
    - `src/vfx/deck-hud-renderer.js`: Dynamically maps the **Lead / On-Air Track** (matching the top overview waveform rail Y=126) to the prominent **Left Header Card**, and the **Subordinate / Outgoing Track** (matching the lower rail Y=182) to the **Right Header Card**.
    - Left Card displays `🔥 TOP RAIL: D${leadDeckNum} ● ON AIR`, its artwork, title, artist, BPM, and key.
    - Right Card displays `D${subDeckNum} ⮂ OUTGOING` (or `INCOMING` / `STANDBY`), its artwork, title, artist, BPM, and key.
    - `src/main.js`: Synchronized `onCrossfader` and `onDeckTelemetry` to update global title, artist, BPM, and track banner with the active lead deck.
  - **Hellfire Outgoing Rail Smoke Effect:**
    - `src/vfx/deck-hud-renderer.js`: Created and exported `drawRailSmoke(ctx, railX, railY, railW, railH, intensity, animTime)`.
    - Features smoldering ember thermal edge along top rail rim, charred soot overlay on the rail body, 36 volumetric convective smoke plumes rising 85px upwards with turbulent curl noise, and 20 buoyant micro-cinders flickering in the updraft.
    - Dynamically triggered on the outgoing overview rail as its fader decreases and the new lead track takes over.
- **Verification:**
  - `npm run build` (`vite build`): PASSED in 925ms (`dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js`).
  - Node syntax check on `server/stagelinq-bridge.js`: PASSED.
  - Automated Node VM runtime test across all 5 mixing, swapping, single-deck, and unload scenarios: PASSED with zero exceptions.
  - Active Chrome tab refreshed via AppleScript.

## 8. Decks Offline Waveform Reset, Artwork Removal & Standby State
- **User Request:**
  - "If the decks go offline then reset all the wave forms (maybe dont show any) and remove any left over track information/artwork"
- **Implemented Changes:**
  - **Inactivity Watchdog & Disconnect Detection (`server/stagelinq-bridge.js`):**
    - Added `lastHardwarePacketTimestamp = 0`, `isHardwareOnline = false`.
    - Added `markHardwareActivity(devName)` called on every incoming track, BPM, beat, and StageLinQ StateMap message.
    - Added 4.5s packet silence watchdog timer (`Date.now() - lastHardwarePacketTimestamp > 4500`): triggers `handleAllDecksOffline()` automatically when Denon Prime or hardware is powered off or disconnected.
    - `handleAllDecksOffline()` clears `connectedDevices`, `lastTrackData`, `lastDeckLoadedTracks`, `lastDeckWaveforms`, resets all 4 deck states to clean empty standby (`title: ''`, `artist: ''`, `bpm: 0`), and broadcasts `{ type: 'decks_offline' }` and `{ type: 'status', deviceCount: 0 }`.
  - **Bridge Client Event Plumbing (`src/stagelinq.js`):**
    - Added `onDecksOffline` callback to `setupStageLinqClient`.
    - Dispatches on WebSocket `decks_offline` message and on `socket.onclose` disconnect.
  - **VFX Waveform Dissolution & Standby Reset (`src/effects.js`):**
    - Added `resetAllDecks()` method to `createVFXScene` return object: resets Deck 1 & 2 data (`samples = null`, `title = ''`, `artist = ''`, `bpm = null`, `artworkUrl = ''`, `artworkImg = null`, `offline = true`, `unloaded = true`).
    - Immediately sets mixer weights `w1 = 0.0`, `w2 = 0.0` and smoke phases `smoothDeck1SmokePhase = 1.0`, `smoothDeck2SmokePhase = 1.0`, completely dissolving the 3D moving Hellfire waveform into transparent silence.
    - Updated mixer weight fallback logic so `!deck1Active && !deck2Active` yields `w1 = 0.0, w2 = 0.0`.
  - **HUD Standby Guide & Artwork Replacement (`src/vfx/deck-hud-renderer.js`):**
    - Updated `hasD1Track` and `hasD2Track` to check `!d1.offline` and `!d2.offline`.
    - `drawMiniWaveform`: when offline or unloaded, draws zero synthetic wave bars and displays subtle dashed guide with `[ DECK X OFFLINE — AWAITING HARDWARE LINK ]`.
    - `drawArtwork`: when offline or unloaded, immediately replaces leftover album art with the procedural burning vinyl disc on fire (`drawBurningRecord`).
    - Header Cards & Center Pill: displays `HARDWARE DECKS OFFLINE` / `CONNECT HARDWARE • ENGINE OS / PRO DJ LINK`, with needle tags `D1 (OFFLINE)` / `D2 (OFFLINE)`.
  - **Global Web UI Standby Reset (`src/main.js`):**
    - Added `handleDecksOffline()` wired to `onDecksOffline` and triggered when bridge disconnects or `status.deviceCount === 0`.
    - Clears `cachedDeckWaveforms`, resets `trackTitle` to `STANDBY`, `trackArtist` to `Awaiting Decks • Denon / Pioneer / Traktor`, `bpmVal` to `--.-`, sidebar Now Playing pane to empty standby, resets all 4 deck cards to `STANDBY`, and dismisses floating track banner.
- **Verification:**
  - `npm run build` (`vite build`): PASSED in 1.09s (`dist/index.html`, `dist/assets/index-B1a93B16.css`, `dist/assets/index-BztcA9Mo.js`).
  - Stale bridge process (PID 94923 from Sunday) terminated and updated bridge daemon launched.
  - Bridge connection message verification: verified that when no decks are connected, only `['status', 'hue_status', 'decks_offline']` are sent; zero `track` or `deck_waveform` packets.
  - Frontend `isHardwareConnected` gating: verified all incoming metadata, telemetry, and waveform handlers reject packets when `!isHardwareConnected`.
  - Chrome tab reloaded via AppleScript.


