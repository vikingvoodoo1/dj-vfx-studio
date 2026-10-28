# ⚡ DJ VFX Studio v2.2.0 — Professional Stage Visual Engine & Multi-Platform DJ Bridge

[![Version](https://img.shields.io/badge/version-2.2.0-orange.svg)](https://github.com/vikingvoodoo1/dj-vfx-studio/releases/tag/v2.2.0)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux%20%7C%20Web-green.svg)](https://github.com/vikingvoodoo1/dj-vfx-studio)

A high-performance, GPU-accelerated 3D visual engine, reactive lighting controller, and multi-platform DJ telemetry bridge designed for live nightclub performances, festival stage visualizers, and OBS Studio live streams.

---

## 🌟 Key Highlights

- **22 GPU-Accelerated 3D VFX Scenes**: Spanning volumetric laser arrays, authentic moving-head godray fixtures, illuminated disco dance floors, Protean volumetric clouds, VHS glitch typography, spinning pumpkin disco balls with volumetric blue godrays, disco mirror balls, synthwave landscapes, cosmic galaxies, and live deck waveform visualizers.
- **🚦 Real-Time Telemetry Requirements, Softened Warning States & Legend Key**: Dynamic requirement chips (`🎤 AUDIO`, `🎛️ DECKS`, `🌐 NET`) indicating active status (`✓` green) vs disconnected (`✗` red). Hardware-dependent scenes (e.g. FX 3 DJ Deck Waveforms) gently soften to **84% opacity** (`opacity: 0.84`, `grayscale(0.20) brightness(0.92)`) with an amber border and a `⚠️ DECK REQUIRED` badge when decks are offline—avoiding harsh 40% dimming so scenes never appear broken. A dedicated horizontal **Requirements Key** in both the FX pane and modal header clarifies every icon at a glance.
- **📋 Scene Configuration, Parameter Memory & Reactive Matrix (`M`)**: Prominent full-width button in the FX bank header (`📋 SCENE CONFIGURATION & MATRIX [M]`) opening the full-screen configuration modal detailing hotkeys, reactive engines (Audio FFT, StageLinQ, BPM Sync, Kick Transients, Physical Rig), and hardware telemetry for all 22 scenes, complete with per-scene parameter memory (Logos, Macros, Philips Hue lighting), auto-recall, diff tracking, and instant reset. See the [📋 Scene Reactive Matrix & Hardware Memory Profiles Guide](file:///Users/jarikuhanen/agy/dj-vfx-studio/SCENE_REACTIVE_MATRIX_AND_PROFILES.md).
- **🏝️ Top-Center Dynamic Island / MacBook Notch HUD (`Alt+N`) & Studio Diagnostics Center (`Alt+H`)**: Declutters the live performance deck console by moving system telemetry and stage cockpit tools into a sleek, top-center floating notch. In collapsed mode, it hugs the top display bezel as a compact 28px glassmorphic pill displaying a **Pulsing Health Dot**, **Time.is NIST Atomic Stage Clock** (`⏱️ 14:35:10 BST`), **Reactive 6-Segment Peak VU Meter**, and glanceable real-time chips for **Audio In** (`🎧`), **DJ Decks** (`🎛️`), **Wired Gigabit Ethernet** (`🔌 en13`), **60 FPS & GPU Memory** (`⚡`), and **OBS Live Stream** (`📡`). Clicking or pressing `Alt+N` smoothly expands it into an 880px wide illuminated cockpit drawer featuring:
  - **Time.is NIST Atomic Clock Banner & DJ Set Duration Timer**: Millisecond-accurate stage clock (`<0.05s` NIST sync) and dedicated session timer (`HH:MM:SS`) with instant `[⏸]` pause/resume and `[⟲]` reset controls.
  - **Quick Stage FX Micro-Bar**: Instant 1-click stage actions: `⚡ FLASH` (`Alt+S` white stage strobe burst), `⚫ BLACKOUT` (`Alt+B` emergency visuals blackout curtain for OBS & stage displays), `⏭️ NEXT FX` (`Space` scene advance), `🔄 RESCAN` (hardware interface re-enumeration), and `📌 PIN` (keep notch locked open while mixing).
  - **6-Card Subsystem Telemetry Grid**: Dedicated cards for **Audio Interface & Line-In**, **Hardware DJ Decks Telemetry** (StageLinQ / Pro DJ Link), **Wired Gigabit Network Routing** (`en13` LAN & ping latency), **Engine FPS & Active Scene** (`WebGL 2.0 Metal`), **OBS Studio & Live Stream Detection** (Browser source, WebSocket, and Twitch/YouTube `-1.0 dBFS` peak ceiling target), and **BUTT Web Radio & Headroom** (Icecast MP3 `-3.0 dBFS` inter-sample clipping compliance).
  - **Stage Lighting & DMX Fixtures Strip**: Real-time status for **Philips Hue Bridge v2** (3 Color Ambiance bulbs), **SoundSwitch / Art-Net DMX Universe 1**, and **MIDI Clock Sync**.
  - **Studio Diagnostics Action Footer**: Full-width button to open the **Studio Health & Telemetry Diagnostics Center** with interactive **7-Step Full Self-Test Runner** and markdown report clipboard export.
- **💡 Studio Setup & Stage Readiness Advisor (`Alt+A`) & Glowing Console Button**: Replaces redundant FPS/RAM stats at the top of the Live Performance Deck with an eye-catching glowing animated button opening an intelligent stage triage modal. Explains what is currently setup (PCM line-in, wired Ethernet, Hue bridge), what is missing (e.g. offline DJ decks), and provides actionable stage advice, clarifying why synthetic audio-reactive fallback is safely powering all 22 scenes and waveforms without disruption.
- **☀️ Philips Hue 70% Warm White Instant Stage Reset (`☀️ 70% WHITE`)**: Dedicated 1-click rescue buttons across the smart lighting setup drawer, bridge modal, and stage advisor to instantly bring physical room lamps out of dim or stuck strobe states back to clean, comfortable 70% warm white ambiance ($2700\text{K}$, $\text{bri: 178}$, $\text{ct: 370}$).
- **💿 Real-Time Auto-BPM Audio Transient Detector & Dynamic Source Tagging**: Solves static fallback tempo confusion by actively analyzing incoming line-in kick transients with rolling median interval filtering whenever hardware decks are offline. The console tempo badge dynamically tags `SOURCE: AUDIO IN (AUTO-DETECT)` with live calculated tempo, `SOURCE: STAGELINQ (LIVE HARDWARE)` when decks connect, or `SOURCE: STANDBY (DECKS OFFLINE)` when silent—giving DJs instant clarity on tempo origin.
- **🖼️ 3-Layer 3D Branding & Promo System**: Independent hardware-accelerated layers for **DJ Logo / Media (MP4/PNG)**, **Station / Broadcast Logo**, and **Event Flyer / Promo Graphics** with 9-way directional grid positioning, 3D spin/orbit/freeroam physics, custom display modes, and dark contrast shields.
- **⏱️ Multi-Layer Automation & Pop-Up Scheduler**: Interval scheduling for branding layers with customizable frequency (`30s` to `30m`), display duration (`5s` to `60s`), and manual `⚡ POP NOW` / `⏹️ POP OFF` action triggers.
- **🎬 10 Cinematic Transition Effects**: Smooth Exponential Fade, Scale Zoom & Spring Pop, Slide In/Down/Up, Neon Strobe Multi-Burst, Cyber Hologram Glitch, 3D Spin Vortex, 3D Perspective Flip Card, and Instant Cut.
- **🎵 Shazam AI Live Audio Recognition & Album Art**: Instant 1-click live audio listening and Shazam fingerprint matching, with high-resolution Apple Music / iTunes album artwork retrieval, manual track injection, and animated vinyl broadcast banners.
- **🎨 Dynamic UI Theme & Aesthetic Switcher**: 7 curated visual themes (**Cyber Glass**, **Studio Hardware Pro 🎛️**, **Halloween Spooky Nightclub 🎃**, **Cyberpunk Matrix**, **Obsidian Stealth**, **Titanium Pioneer Pro**, and **Analog Synthwave Studio**) with custom SVG icon sets, zero-FOUC persistence, and CSS variable styling.
- **Universal Multi-Platform DJ Hardware Bridge**: Zero-latency companion bridge supporting **Denon DJ StageLinq** (Prime/Engine OS), **Pioneer Pro DJ Link / Rekordbox** (CDJ/XDJ UDP beat packets), **Native Instruments Traktor Pro** (session watcher & port 8001 metadata), and **Universal REST / File Drop API** (Serato & VirtualDJ).
- **Studio-Grade Audio & Loudness Metering**: High-resolution FFT spectrum analysis (Bass, Mid, Treble), transient onset detection, ITU-R BS.1770 LUFS loudness metering, dBFS true-peak gauges, peak-hold needles, clip alerts, and calibrated broadcast headroom markers (`-3.0 dBFS` safe target for Web Radio / BUTT MP3 streams, `-1.0 dBFS` peak ceiling for OBS Twitch / Mixcloud streams, with 1-click HUD micro-toggle and settings sync). See the complete [🎙️ Streaming Audio Calibration Guide](file:///Users/jarikuhanen/agy/dj-vfx-studio/AUDIO_CALIBRATION_GUIDE.md) for step-by-step setup with DJ mixer Booth Out, BUTT, and OBS.
- **🖥️ Tab & System Audio Capture**: Capture audio directly from browser tabs (Spotify Web, YouTube, Beatport) or system audio without requiring loopback cables.
- **Multi-Screen & OBS Streaming Suite**: One-click popout displays for stage projectors, transparent browser source overlays (`?overlay=true`), zero-FOUC clean modes (`?mode=obs` / `?mode=stage`), and detached master consoles (`?mode=controller`).

---

## 🗂️ VFX Scene Bank (22 Distinct Modes)

### 📊 Category 1: Equalizers & Decks (FX 0–3)
- **FX 0: Full-Screen Particle Spectrum Visualizer** — Pure, borderless edge-to-edge 36-band visualizer with frequency-mapped spectral gradients (Cyan to Magenta), peak-hold needle physics, and glowing spectrum particles floating seamlessly from active bar crests all the way to the top of the screen.
- **FX 1: Cylindrical Spectrum Tunnel** — 360-degree holographic frequency ring tunnel with relativistic speed progression.
- **FX 2: Fluid Wave Matrix** — Interactive 3D fluid surface grid responding dynamically to time-domain audio oscilloscope waveforms and low-end bass ripples.
- **FX 3: DJ Deck Scrolling Waveform & HUD** — Denon/Pioneer style authentic 3-band RGB spectral waveforms with deck telemetry. Supports native Pioneer Rekordbox ANLZ wire packets and Denon Engine OS `m.db` pre-analyzed waveforms with live FFT fallback. Strictly requires physical deck telemetry; automatically grayed out (`.scene-unmet-strict`) when unplugged. See the [🌊 Authentic DJ Deck Waveforms & On-the-Wire Telemetry Guide](file:///Users/jarikuhanen/agy/dj-vfx-studio/DECK_WAVEFORMS_AND_WIRE_TELEMETRY.md).

### ⚡ Category 2: Lasers (FX 5–7)
- **FX 5: Dual-Bank Moving Lasers** — Dual upper and lower scanning laser banks with responsive color fans.
- **FX 6: Saber Multi-Beams** — Cross-firing high-intensity concert saber beams with synchronized rotation.
- **FX 7: Strobe Rings & Atom Particles** — Concentric pulsating neon strobe rings with high-speed orbiting electrons.

### 🪩 Category 3: Disco & Stage Lights (FX 4, FX 16–18)
- **FX 4: Authentic Nightclub Mirror Ball** — Faceted 3D disco mirror ball with motorized spin, overhead dual pinspots, and dancing floor reflection sprites.
- **FX 16: Sweeping Godray Disco Lights** — 8 concert moving-head fixtures mounted across a top stadium truss with saturated neon beams, Mie forward scattering, staggered bass chase, and floor reflection pools.
- **FX 17: Pure White Godrays & Protean Volumetric Clouds** — Diamond Xenon white 8-head moving spotlight rig combined with raymarched Protean Clouds volumetric fog backdrop.
- **FX 18: Disco Dancefloor with Coloured Godrays & Atmospheric Smoke** — Classic illuminated tile dancefloor bathed in 8 sweeping multi-colored concert godrays with floor reflection pools and lens glow.

### 🎃 Category 4: Halloween Spooky Special (FX 20–21)
- **FX 20: 🎃 Spinning Pumpkin Disco Ball & Volumetric Blue Godrays** — Sapphire-blue metallic glass faceted mirror ball sphere with top hanging link chain, carved glowing Jack-o'-Lantern face with incandescent internal flame gradients, 14 fanned deep blue volumetric light rays bouncing off mirror tiles with Mie atmospheric haze, dedicated multi-angle pinspot lighting, 1,200 specular facet glints, orbiting floor caustic reflection spots, and drifting fire embers.
- **FX 21: 🏚️ Haunted Manor & Moonlit Forest [Flying Bats, Thunderstorm, Blade Rave Windows, Graveyard Wisps, Phantom Wraith, Watcher Gargoyles, Pumpkin Guardians & Possessed Trees]** — Eerie gothic horror nightscape scaled edge-to-edge to seamlessly fill the entire screen without borders, featuring a luminous full moon with lunar maria and atmospheric corona halo, multi-tiered organic procedural storm clouds with volumetric cumulus shading, symmetrical aligned Victorian brick chimneys with corbelled cornices and flared terracotta pots, a towering Victorian gothic haunted mansion showing its complete lower ground floor (grand entrance portico with fluted columns, swinging pendulum carriage lantern with flickering candle, carved double wooden oak doors, stone balustrade terrace, and cascading double stone staircase), a high-visibility slate-granite cobblestone carriageway winding in an organic S-curve with raised moonlit curbstones, over 650 textured cobblestones, rainwater puddle reflections, and gothic stone bollards connecting the gates directly to the grand entrance, **5 Music-Reactive Middle Ground Features** (1: Haunted Graveyard with runed headstones, Celtic crosses, and 7 floating Will-o'-the-Wisps/spirit orbs that bob on 3D Lissajous paths and flare with bass kicks; 2: Spectral Wandering Apparition/Phantom Wraith drifting in an ethereal figure-8 whose spectral shroud and glow surge with audio buildups; 3: Gothic Watcher Gargoyles perched on stone driveway pillars with cursed demonic eyes blazing crimson on beats and snare hits; 4: Carved Jack-O'-Lantern Pathway Guardians lining the road curbstones with authentic candle flickers and explosive flame flares on bass thumps; 5: Possessed Gnarled Trees with reaching branches swaying to the rhythm, concealing pairs of predatory creature eyes that blink to hi-hat transients), 3 upstairs left windows transformed into an authentic *Blade* vampire blood rave scene featuring deep blood-crimson industrial wash, audio-reactive Xenon kick strobes, slicing volumetric acid-green and cross-cutting ruby-red club lasers cutting through room mist, and silhouettes of music-animated zombies with articulated claw hands and knobby knuckles dancing to the beat, independent electrical flicker and blackout circuits for upstairs right vs downstairs right windows, perimeter wrought-iron fencing and articulated swinging gates, realistic dark cemetery grass clumps, 85 separate dead leaves swirling across the grounds in sudden wind gusts, an articulated 32-bat vampire flock with biomechanical wing flapping, a flying wicked witch on a broomstick silhouette with hat firmly attached and rear plasma thrust flame, an edge-to-edge rolling ground fog ocean, and audio-reactive double-burst lightning flashes on heavy bass kicks.

### 🕸️ Category 5: Cyber, Retro & Typography (FX 8–11, FX 19)
- **FX 8: Synthwave Cyber Grid** — Infinite perspective neon wireframe grid rushing into the horizon with bass-reactive mountain ranges.
- **FX 9: Synthwave River, Mountains & 80s Sun** — Procedural GLSL sunset with horizontal bar segments, twilight star sky, and reflective river shader.
- **FX 10: Matrix Code Rain** — Classic cascading digital rain glyphs rendered in glowing phosphor green with audio speed modulation.
- **FX 11: Retro Arcade 80s Theme** — Vintage vector CRT arcade aesthetics with wireframe geometry and nostalgic neon glow.
- **FX 19: VHS Glitch Words with Overhead Godrays & Inward Smoke** — Alternating bold white typography (*"DREAMLOVER"* / *"DO YOU BELIEVE?"*) with real-time VHS scanlines, horizontal tape tracking tears, RGB chromatic displacement, and analog static noise, illuminated by 8 downward-pointing moving-head godray spotlights with dual-directional atmospheric smoke billowing inward from left and right wings.

### 🌌 Category 6: Space, Particles & Stage Lights (FX 12–15)
- **FX 12: Warp Speed Starfield** — Hyperdrive relativistic star streaks accelerating dynamically on track drops.
- **FX 13: Spiral Galaxy Accretion Vortex** — 3D volumetric logarithmic accretion spiral with millions of stellar bodies and core luminance.
- **FX 14: Hyper Particle Stream** — GPU curl noise particle simulation following 3D Bézier splines with chromatic velocity grading.
- **FX 15: Time.is Atomic DJ Stage Clock** — High-resolution millisecond synchronized clock with rotating 3D gyro gimbal rings and circular frequency analyzer.

---

## 🖼️ 3-Layer Branding, Pop-Up Automation & Transition Engine

The **Branding & Overlays** panel provides full multi-layer graphic management:

### 1. Layers & Media Storage
- **🎧 DJ Logo / Animated Video**: Supports MP4 video loops (e.g. jkmclaren Shock) and PNG/JPG graphics with persistent IndexedDB storage (`dj_logos` store).
- **📻 Station / Broadcast Logo**: Dedicated radio/station watermark layer with persistent IndexedDB storage (`station_logos` store).
- **🖼️ Event Flyer / Promo Graphics**: High-impact event posters and video flyers with auto-scanning from `public/images/flyers/` and persistent IndexedDB storage (`flyers` store).

### 2. Multi-Layer Automation & Pop-Up Scheduler
Configure independent schedules for each layer:
- **Display Modes**: `🟢 Always Visible (Continuous)` or `⏱️ Periodic Pop-Up (Scheduled Interval)`.
- **Interval Frequency**: `30s`, `1m`, `2m`, `3m`, `5m`, `10m`, `15m`, `30m`.
- **Show Duration**: `5s`, `10s`, `15s`, `20s`, `30s`, `45s`, `60s`.
- **Manual Action Triggers**: `⚡ POP NOW` (instant trigger for current duration) and `⏹️ POP OFF` (dismiss with exit transition).

### 3. 🎬 10 Cinematic Transition Effects
1. **✨ Smooth Exponential Fade** — Soft ease-in/out opacity curve.
2. **🎯 Scale Zoom & Spring Pop** — Explosive elastic zoom from 0 to target size.
3. **⬇️ Slide Down from Top** — Slides smoothly in from above the ceiling.
4. **⬆️ Slide Up from Bottom** — Rises up from stage level.
5. **➡️ Slide In from Left** — Sweeps horizontally from stage left.
6. **⬅️ Slide In from Right** — Sweeps horizontally from stage right.
7. **⚡ Neon Strobe Multi-Burst** — Multi-phase high-speed flash and strobe reveal.
8. **👾 Cyber Hologram Glitch** — Jittery chromatic holographic scanlines entrance.
9. **🌀 3D Spin & Zoom Vortex** — Rotating 3D vortex scaling in from depth.
10. **🃏 3D Perspective Flip Card** — Flips forward 90° on the X-axis like a card.
11. **⚡ Instant Cut** — Immediate hard cut with zero transition time.

---

## 🎵 Shazam AI Live Track Recognition & Banner System

- **🎙️ Live Audio Listening**: Click **`🎙️ LISTEN WITH SHAZAM`** to sample incoming microphone or line-in audio for 4 seconds.
- **⚡ Shazam Fingerprint Engine**: Queries the global music database with zero subscription or API key required.
- **🛡️ Review & Approval Gatekeeper**: Prevents misidentifications on microphone bleed:
  - **`⚡ SEND LIVE`**: Instantly publishes the identified track and triggers the on-screen banner.
  - **`✏️ EDIT IN MANUAL`**: Loads the recognized artist and title into manual fields for quick tweaks.
  - **`🗑️ DISCARD`**: Rejects the sample without publishing.
- **🎨 Automatic High-Res Cover Art**: Fetches official album artwork from Apple Music / iTunes API with fallback to high-resolution procedural vinyl record artwork.
- **🎛️ Manual Track Injection**: Type any custom track title and artist with custom show duration and broadcast sync.

---

## 🎨 Dynamic UI Theme & Control Panel Aesthetic Engine

Customize the look and feel of the control console with 6 curated themes:

| Theme | Aesthetic Highlights | Icon & Element Styling |
| :--- | :--- | :--- |
| **Cyber Glass (Default)** | Frosted glassmorphism (`rgba(8,9,20,0.92)`), cyan neon (`#00ffcc`), soft diffuse drop shadows | Smooth vector stroke icons with subtle cyan ambient glow |
| **Studio Hardware Pro 🎛️** | Full Universal Audio / SSL hardware skeuomorphism, anodized dark brushed metallic chassis, 3D rack bolted bezel, milled mixing console faders, debossed engraved typography | Dual-stage physical 3D push buttons with mechanical inset press and analog warm amber/green LEDs |
| **Cyberpunk Matrix** | Dark violet-obsidian chassis, high-voltage hot magenta (`#ff007f`), electric cyan (`#00ffff`), chamfered razor borders | Dual-tone chromatic laser glow icons with vibrant outer bloom |
| **Obsidian Stealth** | Ultra-matte OLED black (`#050508`), crisp razor hairline borders, pure ice-white (`#ffffff`) & titanium teal accents | Minimalist monochromatic geometric line icons with zero distraction |
| **Titanium Pioneer Pro** | Brushed metallic carbon chassis, Pioneer DJ amber orange (`#ff8800`), CDJ green LEDs, tactile fader tracks | Recessed tactile hardware cue button keys with illuminated amber LEDs |
| **Analog Synthwave Studio** | Warm 80s studio dark walnut tone, amber/sunset gold CRT phosphor (`#ffaa00`), retro synth badges | Warm vintage phosphor glowing icons with analog studio styling |

---

## 💡 Philips Hue Smart Club Lighting Integration

- **Automatic Bridge Discovery & Pairing**: N-UPnP local network discovery and one-click pushlink authentication.
- **Multi-Room & Zone Selection**: Target specific entertainment zones or room groups.
- **Master Power & Sync Controls**:
  - `⚡ SYNC: ACTIVE / OFF`: Controls live audio synchronization without altering physical lamp power state.
  - `💡 LIGHTS: ON / OFF`: Instantly turns off/on physical lamps without disconnecting the bridge.
- **4 Reactive Lighting Modes**:
  1. **Scene Sync (Default)**: Automatically tracks the live 3D visualizer color palette with bass punch brightness scaling.
  2. **Bass Flash**: Deep moody resting state, snapping instantly to vivid saturated neon colors on bass drops and transient kicks.
  3. **Frequency Spectrum RGB**: Dynamic color cycling mapped across sub-bass, mid, and high treble frequencies.
  4. **Ambient Energy Wave**: Gentle, soothing breathing luminescence tracking overall track energy.
- **⚡ Kick Pop White Strobe**: Instant 85ms xenon-white flash on heavy bass kicks with automatic color restoration.

---

## 🎧 Pioneer CDJ-3000 Phrase Meter & CDJ-2000 Phase Visualizer

A hardware-inspired Pioneer DJ phrase and phase visualizer positioned right next to the master BPM display on the Live Performance Deck:

- **3 Display Modes**:
  1. **CDJ-3000 Phrase Mode**: Displays authentic Rekordbox structural phrases (`INTRO`, `UP 1`, `CHORUS 1`, `DOWN 1`, `UP 2`, `CHORUS 2`, `OUTRO`), 8-segment bar progress tracks, countdown to the next drop (`-4 BARS TO DROP 1`), and a micro minimap showing past, active, and upcoming song phrases.
  2. **CDJ-2000 Phase Mode**: 4-beat phase grid blocks with active LED illumination, a smooth 60FPS sub-beat sweep needle, and big bold `BAR 03 / BEAT 1` digital counters.
  3. **DUAL Mode**: Stacked combined visualizer featuring both the CDJ-3000 structural phrase analysis track and the CDJ-2000 4-beat phase pulse meter simultaneously.
- **Hardware Sync & Audio Fallback**: Synchronizes in real time with Pioneer Pro DJ Link / Rekordbox / StageLinQ beat packets (`PRO DJ LINK` indicator), and falls back to audio onset detection (`BEAT CLOCK` indicator) when in standalone microphone / line-in mode.
- **Tap-to-Resync**: Click or tap anywhere on the phrase meter to instantly re-align the downbeat to Beat 1.

---

## 🎧 Universal DJ Hardware & Software Bridge

The companion Node.js bridge server (`server/stagelinq-bridge.js`) provides live multi-platform DJ telemetry:

| Ecosystem | Protocol & Ports | Features Supported |
|---|---|---|
| **Denon DJ StageLinq** | UDP 50010 (Discovery), TCP | Engine OS 4-deck status, live BPM, fader positions, track artist/title, album artwork |
| **Pioneer Pro DJ Link** | UDP 50000, 50002 (Beat Packets) | CDJ-2000/3000 / XDJ beat grid sync, live tempo, Rekordbox beat pulses |
| **Native Instruments Traktor** | UDP/TCP Port 8001, History Log | Traktor Pro broadcast metadata, live track titles, automatic session log monitoring |
| **Universal REST & File Drop** | HTTP `/api/nowplaying`, `nowplaying.txt` | Universal metadata ingest for Serato DJ, VirtualDJ, and OBS text overlays |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or later)
- Modern WebGL2-compatible browser (Chrome, Edge, Brave, Safari, Firefox)

### Installation
```bash
# Clone the repository
git clone https://github.com/vikingvoodoo1/dj-vfx-studio.git
cd dj-vfx-studio

# Install dependencies
npm install
```

### Running the App Locally
```bash
# Option 1: Open the Native Startup Launcher App (macOS DJ VFX Launcher.app / Windows DJ VFX Launcher.exe)
npm run launcher

# Option 2: Start Vite development server & Universal DJ Bridge simultaneously (uses saved Default Mode)
npm run dev

# Option 3: Open the Integrated Electron Mode Switcher Window
npm run electron:launcher
```
Open `http://localhost:5173` in your browser.

### ⚡ Native Mac & Windows Startup Launchers & Display Modes
DJ VFX Studio includes native startup launcher apps for **macOS (`DJ VFX Launcher.app`)** and **Windows (`DJ VFX Launcher.exe` / `DJ VFX Launcher.bat`)**, plus an integrated **Electron Mode Switcher (`⌘/Ctrl + Shift + M`)** and **macOS Menu Bar (`⚡ VFX`) / Windows System Tray** icon:
- **1. Full Studio Mode (`studio` — Initial Default)**: Starts Vite 3D WebGL (`:5173`) + Hardware Bridge (`:8080`) + Main Studio UI (`http://localhost:5173/`).
- **2. Clean Stage / Projector Mode (`stage`)**: Zero-HUD, cursor-hidden 3D visual feed (`?mode=stage&clean=true`) for external projectors and LED walls.
- **3. Detached Controller + Stage Rig (`dual-rig`)**: Opens both the Detached Master Control Console (`?mode=controller`) and Clean Stage Output (`?mode=stage&clean=true`).
- **4a / 4b. OBS Stream (`?mode=obs`) & Transparent Alpha Overlay (`?mode=obs&overlay=true`)**: Zero-FOUC stream output + auto-copies OBS Browser Source URL to clipboard.
- **5. Native Electron Desktop App (`electron`)**: Launches the GPU-accelerated desktop app + 2nd-screen Stage Projector.
- **6a / 6b. Service-Only Modes**: **Hardware Bridge Only (`:8080`)** or **Visualizer Only (`:5173`, no Bridge)**.
- **Custom Default Mode & Menu Bar / System Tray Toggle**: Click **`☆ Set as Default`** on any mode card to make it your new default startup preset (`~/.dj-vfx-launcher.json`), and click **`Add to / Remove from macOS Menu Bar`** (or **`Windows System Tray`**) at any time.

### Building & Packaging Downloadable Deployments (Mac & Windows)
```bash
# Build native startup launcher for current OS (DJ VFX Launcher.app on Mac / DJ VFX Launcher.exe on Windows)
npm run launcher:build

# Build production web bundle + native launcher + packaged Electron installer (.dmg/.zip on Mac, NSIS/Portable .exe on Windows)
npm run electron:dist
```
> **Note:** Packaged Mac (`.dmg`) and Windows (`.exe`) deployments automatically bundle the native launcher app and include an embedded local HTTP server on `:5173` so OBS Browser Sources (`http://localhost:5173/?mode=obs`) and multi-screen browser modes work out-of-the-box without requiring Node.js or Vite on the target machine.

---

## ⌨️ Keyboard Shortcuts & Quick Controls

| Key | Action |
|---|---|
| `Space` | Manual Beat Strobe / Xenon Flash Burst |
| `0` – `9`, `-`, `=`, `Q` – `P`, `[`, `]`, `V` | Instant Scene Switch (All 23 Presets) |
| `V` | Toggle Scene 22: Cyber Cinema Video Playback |
| `Alt + 1` – `Alt + 7` | Switch Master Consoles (Perform, FX Bank, Branding, Video, Now Playing, Setup, About) |
| `Alt + A` | Toggle Show All Panes (Multi-Pane Scroll View) |
| `Arrow Left` / `Arrow Right` | Previous / Next Visual Effect Preset |
| `A` | Toggle Auto-VJ Mode |
| `L` | Toggle DJ Logo Layer Visibility |
| `S` | Toggle Station Logo Layer Visibility |
| `Y` / `Shift + F` | Toggle Event Flyer / Promo Layer Visibility |
| `M` | Open Scene Reactive Matrix & Hardware Memory Profiles Modal |
| `N` | Toggle Now Playing Track Stream Overlay |
| `F` | Toggle Fullscreen (Stage / External HDMI Output) |
| `C` | Toggle Clean Display Mode (Hide HUD overlays for clean video feed) |
| `H` | Toggle HUD Console & Toolbar |
| `O` / `Shift + O` | Open OBS Manager / Toggle OBS Mute |
| `Esc` | Close Scene Matrix / Notch Drawer / DJ Connection Guide / Clear Search |

---

### 🕹️ Top-Center Dynamic Island / MacBook Notch HUD
- **Persistent Header Pill**: Displays the live **Time.is atomic clock**, 6-segment reactive LED VU meter (dBFS), audio interface lock, physical deck telemetry status, wired network speed, real-time FPS counter, and broadcast standby badge.
- **Expanded Drawer (880px Wide Viewport)**:
  - **Live Time.is NIST Clock & DJ Set Duration Timer** with pause and reset controls.
  - **Quick Stage Actions**: One-click Xenon Strobe Flash, Blackout Curtain, and Instant Next FX switch.
  - **6 Full-Fidelity Subsystem Cards**:
    1. *Audio Interface & Fallback*: Device name, sample rate, buffer size, latency, and clip count.
    2. *Hardware Decks & Channels*: Denon StageLinQ / Pioneer Pro DJ Link telemetry and active channels.
    3. *Wired Network & OS Route*: IP route, ping latency, and packet loss.
    4. *GPU & Scene Engine*: WebGL render tier, draw calls, active FX name, and target FPS.
    5. *OBS Studio & Twitch Stream Detection*: Live websocket detection and bitrate headroom.
    6. *BUTT Web Radio & Headroom*: Icecast/Shoutcast broadcast stream status and ITU-R BS.1770 LUFS headroom.
  - **Stage Lighting Fixtures Strip**: Live sync status for Philips Hue Bridge and DMX SoundSwitch rigs.

---

### 🎬 Dedicated Video Console (`Alt + 7`) & Scene 22: Cyber Cinema 3D
- **Dedicated Master Console Tab**: First-class navigation tab separate from Branding, dedicated purely to video loops and playback management.
- **10 Clean Video Banks (User-Driven)**: 10 dedicated video banks that start completely clean without any hardcoded studio demo assets. Users connect their own video folders via the HTML5 folder picker.
- **Top Quick Bar**: Bank selector chips (`B1` to `B10`), folder loader, active clip display, and one-click `[▶ GO LIVE (FX 22)]` switcher.
- **3D Curved Cinema Screen**: Renders local video files onto a curved WebGL cinema display with ambient backglow, specular floor reflections, and beat-reactive spotlights.
- **Dual-Channel A/B Seamless Video Engine**: Real-time crossfade, glitch wipe, zoom dissolve, and strobe cut transitions with adjustable duration (0.2s – 3.0s).
- **Interactive VJ Grid**: 16:9 hover-to-play preview cards, duration badges, direct `[▶ CUE]` triggering, and individual `[✓ Mix]` playlist inclusion checkboxes.
- **Playback & Progression Controls**: Sequential vs Shuffle order, Playlist vs Single loop, variable speed (0.5x – 2.0x or dynamic BPM Sync), and progression triggers (Natural, 15s, 30s, 60s, 16 beats, 32 beats).

---

## 📚 Technical Documentation

- **[Startup Launcher, Modes & Deployment Guide (LAUNCHER_AND_MODES_GUIDE.md)](LAUNCHER_AND_MODES_GUIDE.md)** — Complete guide to `DJ VFX Launcher.app` (macOS), `DJ VFX Launcher.exe` (Windows), the integrated Electron Mode Switcher (`⌘/Ctrl + Shift + M`), all 8 startup & display modes, custom default presets, Menu Bar / System Tray controls, and Mac/Windows installer bundling.
- **[Video Clarity & Cyber Cinema Render Pipeline Guide (VIDEO_CLARITY_AND_PIPELINE_GUIDE.md)](VIDEO_CLARITY_AND_PIPELINE_GUIDE.md)** — Tri-engine video architecture, hardware acceleration via macOS VideoToolbox/Metal, 1:1 bit-for-bit VLC parity, and eliminating WebGL banding.
- **[Scene Reactive Matrix & Hardware Memory Profiles Guide (SCENE_REACTIVE_MATRIX_AND_PROFILES.md)](SCENE_REACTIVE_MATRIX_AND_PROFILES.md)** — Comprehensive guide to all 22 scenes, hotkeys, reactive engine tags (audio FFT, StageLinQ, BPM sync, transients, physical rig), per-scene parameter memory, and auto-recall architecture.
- **[Authentic DJ Deck Waveforms & Wire Telemetry Guide (DECK_WAVEFORMS_AND_WIRE_TELEMETRY.md)](DECK_WAVEFORMS_AND_WIRE_TELEMETRY.md)** — Universal 3-tier waveform architecture covering Denon StageLinQ, Pioneer Pro DJ Link, and live spectral fallbacks.
- **[Streaming Audio Calibration Guide (AUDIO_CALIBRATION_GUIDE.md)](AUDIO_CALIBRATION_GUIDE.md)** — ITU-R BS.1770 LUFS loudness metering, true-peak gauges, and headroom targets.
- **[Lighting Architecture & Engineering Guide (LIGHTING_GUIDE.md)](LIGHTING_GUIDE.md)** — Comprehensive architectural blueprint covering all virtual WebGL fixtures (moving heads, volumetric ray shaders, dual-group bottom strobe rigs, caustics) and physical smart lighting (Philips Hue hardware bridge).
- **[Feature Breakdown (FEATURES.md)](FEATURES.md)** — Detailed specification of all visualizer engines, branding layers, Shazam recognition, and DJ hardware bridges.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
