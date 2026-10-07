# ⚡ DJ VFX Studio v2.0.0 — Professional Stage Visual Engine & Multi-Platform DJ Bridge

[![Version](https://img.shields.io/badge/version-2.0.0-orange.svg)](https://github.com/vikingvoodoo1/dj-vfx-studio/releases/tag/v2.0.0)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux%20%7C%20Web-green.svg)](https://github.com/vikingvoodoo1/dj-vfx-studio)

A high-performance, GPU-accelerated 3D visual engine, reactive lighting controller, and multi-platform DJ telemetry bridge designed for live nightclub performances, festival stage visualizers, and OBS Studio live streams.

---

## 🌟 Key Highlights

- **21 GPU-Accelerated 3D VFX Scenes**: Spanning volumetric laser arrays, authentic moving-head godray fixtures, illuminated disco dance floors, Protean volumetric clouds, VHS glitch typography, spinning pumpkin disco balls with volumetric blue godrays, disco mirror balls, synthwave landscapes, cosmic galaxies, and live deck waveform visualizers.
- **🖼️ 3-Layer 3D Branding & Promo System**: Independent hardware-accelerated layers for **DJ Logo / Media (MP4/PNG)**, **Station / Broadcast Logo**, and **Event Flyer / Promo Graphics** with 9-way directional grid positioning, 3D spin/orbit/freeroam physics, custom display modes, and dark contrast shields.
- **⏱️ Multi-Layer Automation & Pop-Up Scheduler**: Interval scheduling for branding layers with customizable frequency (`30s` to `30m`), display duration (`5s` to `60s`), and manual `⚡ POP NOW` / `⏹️ POP OFF` action triggers.
- **🎬 10 Cinematic Transition Effects**: Smooth Exponential Fade, Scale Zoom & Spring Pop, Slide In/Down/Up, Neon Strobe Multi-Burst, Cyber Hologram Glitch, 3D Spin Vortex, 3D Perspective Flip Card, and Instant Cut.
- **🎵 Shazam AI Live Audio Recognition & Album Art**: Instant 1-click live audio listening and Shazam fingerprint matching, with high-resolution Apple Music / iTunes album artwork retrieval, manual track injection, and animated vinyl broadcast banners.
- **🎨 Dynamic UI Theme & Aesthetic Switcher**: 7 curated visual themes (**Cyber Glass**, **Studio Hardware Pro 🎛️**, **Halloween Spooky Nightclub 🎃**, **Cyberpunk Matrix**, **Obsidian Stealth**, **Titanium Pioneer Pro**, and **Analog Synthwave Studio**) with custom SVG icon sets, zero-FOUC persistence, and CSS variable styling.
- **Universal Multi-Platform DJ Hardware Bridge**: Zero-latency companion bridge supporting **Denon DJ StageLinq** (Prime/Engine OS), **Pioneer Pro DJ Link / Rekordbox** (CDJ/XDJ UDP beat packets), **Native Instruments Traktor Pro** (session watcher & port 8001 metadata), and **Universal REST / File Drop API** (Serato & VirtualDJ).
- **💡 Philips Hue Smart Lighting Engine**: Ultra-low-latency lighting synchronization with 4 dedicated reaction modes, high-dynamic-range punch, independent physical room power toggle (`💡 LIGHTS: ON / OFF`), multi-room discovery, and the **⚡ Kick Pop White Strobe** burst system.
- **Studio-Grade Audio & Loudness Metering**: High-resolution FFT spectrum analysis (Bass, Mid, Treble), transient onset detection, ITU-R BS.1770 LUFS loudness metering, dBFS true-peak gauges, peak-hold needles, clip alerts, and calibrated broadcast headroom markers (`-3.0 dBFS` safe target for Web Radio / BUTT MP3 streams, `-1.0 dBFS` peak ceiling for OBS Twitch / Mixcloud streams, with 1-click HUD micro-toggle and settings sync).
- **🖥️ Tab & System Audio Capture**: Capture audio directly from browser tabs (Spotify Web, YouTube, Beatport) or system audio without requiring loopback cables.
- **Multi-Screen & OBS Streaming Suite**: One-click popout displays for stage projectors, transparent browser source overlays (`?overlay=true`), zero-FOUC clean modes (`?mode=obs` / `?mode=stage`), and detached master consoles (`?mode=controller`).

---

## 🗂️ VFX Scene Bank (21 Distinct Modes)

### 📊 Category 1: Equalizers & Decks (FX 0–3)
- **FX 0: Full-Screen Particle Spectrum Visualizer** — Pure, borderless edge-to-edge 36-band visualizer with frequency-mapped spectral gradients (Cyan to Magenta), peak-hold needle physics, and glowing spectrum particles floating seamlessly from active bar crests all the way to the top of the screen.
- **FX 1: Cylindrical Spectrum Tunnel** — 360-degree holographic frequency ring tunnel with relativistic speed progression.
- **FX 2: Geometric Disco Spectrum** — Concentric faceted polygon rings undulating with transient beat impacts.
- **FX 3: DJ Deck Scrolling Waveform & HUD** — Denon/Pioneer style 3-band RGB spectral waveforms with deck telemetry.

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
- **FX 21: 🏚️ Haunted Manor & Moonlit Forest [Flying Bats & Thunderstorm]** — Eerie gothic horror nightscape featuring a luminous full moon with lunar maria and atmospheric corona halo, multi-tiered Victorian gothic haunted mansion with windows that flicker erratically every now and then (random candle brownouts, rapid ghostly stutters, and eerie surges), gnarled bare oak tree with twisted branches framing the moon, winding overgrown estate driveway with cold moonlit puddle reflections, extended perimeter wrought-iron cemetery fencing with sharp spearhead finials, articulated wrought-iron gates slowly swinging and creaking back and forth in the wind on rusty 3D hinges, 32 dynamic flying vampire bats with realistic wing flapping and flight trajectories, low-lying graveyard ground mist, and audio-reactive double-burst lightning flashes casting stark high-contrast silhouettes on heavy bass kicks.

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
# Start Vite development server & Universal DJ Bridge simultaneously
npm run dev
```
Open `http://localhost:5173` in your browser.

### Building for Production
```bash
# Build optimized client bundle
npm run build

# Preview production build locally
npm run preview
```

---

## ⌨️ Keyboard Shortcuts & Quick Controls

| Key | Action |
|---|---|
| `Space` | Manual Beat Strobe / Xenon Flash Burst |
| `0` – `9`, `-`, `=`, `Q` – `P` | Instant Scene Switch (All 22 Presets) |
| `Alt + 1` – `Alt + 6` | Switch Master Consoles (Perform, FX Bank, Branding, Now Playing, Setup, About) |
| `Alt + A` | Toggle Show All Panes (Multi-Pane Scroll View) |
| `Arrow Left` / `Arrow Right` | Previous / Next Visual Effect Preset |
| `A` | Toggle Auto-VJ Mode |
| `L` | Toggle DJ Logo Layer Visibility |
| `S` | Toggle Station Logo Layer Visibility |
| `Y` / `Shift + F` | Toggle Event Flyer / Promo Layer Visibility |
| `N` | Toggle Now Playing Track Stream Overlay |
| `F` | Toggle Fullscreen (Stage / External HDMI Output) |
| `C` | Toggle Clean Display Mode (Hide HUD overlays for clean video feed) |
| `H` | Toggle HUD Console & Toolbar |
| `O` / `Shift + O` | Open OBS Manager / Toggle OBS Mute |

---

## 📚 Technical Documentation

- **[Lighting Architecture & Engineering Guide (LIGHTING_GUIDE.md)](LIGHTING_GUIDE.md)** — Comprehensive architectural blueprint covering all virtual WebGL fixtures (moving heads, volumetric ray shaders, dual-group bottom strobe rigs, caustics) and physical smart lighting (Philips Hue hardware bridge).
- **[Feature Breakdown (FEATURES.md)](FEATURES.md)** — Detailed specification of all visualizer engines, branding layers, Shazam recognition, and DJ hardware bridges.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
