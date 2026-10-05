# ⚡ DJ VFX Studio — Professional Stage Visual Engine & Multi-Platform DJ Bridge

A high-performance, GPU-accelerated 3D visual engine, reactive lighting controller, and multi-platform DJ telemetry bridge designed for live nightclub performances, festival stage visualizers, and OBS Studio live streams.

---

## 🌟 Key Highlights

- **22 GPU-Accelerated 3D VFX Scenes**: Spanning volumetric laser arrays, authentic moving-head godray fixtures, illuminated disco dance floors, Protean volumetric clouds, VHS glitch typography, disco mirror balls, synthwave landscapes, cosmic galaxies, and live deck waveform visualizers.
- **🎨 Dynamic UI Theme & Aesthetic Switcher**: 5 curated visual themes (**Cyber Glass**, **Cyberpunk Matrix**, **Obsidian Stealth**, **Titanium Pioneer Pro**, and **Analog Synthwave Studio**) with custom SVG icon sets, zero-FOUC persistence, and CSS variable styling.
- **Universal Multi-Platform DJ Hardware Bridge**: Zero-latency companion bridge supporting **Denon DJ StageLinq** (Prime/Engine OS), **Pioneer Pro DJ Link / Rekordbox** (CDJ/XDJ UDP beat packets), **Native Instruments Traktor Pro** (session watcher & port 8001 metadata), and **Universal REST / File Drop API** (Serato & VirtualDJ).
- **💡 Philips Hue Smart Lighting Engine**: Ultra-low-latency lighting synchronization with 4 dedicated reaction modes, high-dynamic-range punch, independent physical room power toggle (`💡 LIGHTS: ON / OFF`), multi-room discovery, and the **⚡ Kick Pop White Strobe** burst system.
- **Studio-Grade Audio & Loudness Metering**: High-resolution FFT spectrum analysis (Bass, Mid, Treble), transient onset detection, ITU-R BS.1770 LUFS loudness metering, dBFS true-peak gauges, peak-hold needles, and clip alerts.
- **🖥️ Tab & System Audio Capture**: Capture audio directly from browser tabs (Spotify Web, YouTube, Beatport) or system audio without requiring loopback cables.
- **Multi-Screen & OBS Streaming Suite**: One-click popout displays for stage projectors, transparent browser source overlays (`?overlay=true`), zero-FOUC clean modes (`?mode=obs` / `?mode=stage`), and detached master consoles (`?mode=controller`).

---

## 🗂️ VFX Scene Bank (22 Distinct Modes)

### 📊 Category 1: Equalizers & Decks (FX 0–3)
- **FX 0: 3D Studio LED Equalizer Wall** — Segmented stadium LED towers with peak-hold physics and dynamic hue cascades.
- **FX 1: Cylindrical Spectrum Tunnel** — 360-degree holographic frequency ring tunnel with relativistic speed progression.
- **FX 2: Geometric Disco Spectrum** — Concentric faceted polygon rings undulating with transient beat impacts.
- **FX 3: DJ Deck Scrolling Waveform & HUD** — Denon/Pioneer style 3-band RGB spectral waveforms with deck telemetry.

### 🔦 Category 2: Volumetric Godrays & Stage Fixtures (FX 18–20)
- **FX 18: Sweeping Godray Disco Lights** — 8 concert moving-head fixtures mounted across a top stadium truss with saturated neon beams, Mie forward scattering, staggered bass chase, and floor reflection pools.
- **FX 19: Pure White Godrays & Protean Volumetric Clouds** — Diamond Xenon white 8-head moving spotlight rig combined with raymarched Protean Clouds volumetric fog backdrop.
- **FX 20: Disco Dancefloor with Coloured Godrays & Atmospheric Smoke** — Classic 70s *Saturday Night Fever* illuminated tile dancefloor bathed in 8 sweeping multi-colored concert godrays with floor reflection pools and lens glow.

### 🕸️ Category 3: Cyber, Retro & Typography (FX 10–13, FX 21)
- **FX 10: Synthwave Cyber Grid** — Infinite perspective neon wireframe grid rushing into the horizon with bass-reactive mountain ranges.
- **FX 11: Synthwave River, Mountains & 80s Sun** — Procedural GLSL sunset with horizontal bar segments, twilight star sky, and reflective river shader.
- **FX 12: Matrix Code Rain** — Classic cascading digital rain glyphs rendered in glowing phosphor green with audio speed modulation.
- **FX 13: Retro Arcade 80s Theme** — Vintage vector CRT arcade aesthetics with wireframe geometry and nostalgic neon glow.
- **FX 21: VHS Glitch Words with Overhead Godrays & Inward Smoke** — Alternating bold white typography (*"DREAMLOVER"* / *"DO YOU BELIEVE?"*) with real-time VHS scanlines, horizontal tape tracking tears, RGB chromatic displacement, and analog static noise, illuminated by 8 downward-pointing moving-head godray spotlights with dual-directional atmospheric smoke billowing inward from left and right wings.

### 🌌 Category 4: Space, Particles & Stage Lights (FX 14–17)
- **FX 14: Warp Speed Starfield** — Hyperdrive relativistic star streaks accelerating dynamically on track drops.
- **FX 15: Spiral Galaxy Accretion Vortex** — 3D volumetric logarithmic accretion spiral with millions of stellar bodies and core luminance.
- **FX 16: Hyper Particle Stream** — GPU curl noise particle simulation following 3D Bézier splines with chromatic velocity grading.
- **FX 17: Time.is Atomic DJ Stage Clock** — High-resolution millisecond synchronized clock with rotating 3D gyro gimbal rings and circular frequency analyzer.

### 🌊 Category 5: Tunnels, Lasers & Nightclub Visuals (FX 4–9)
- **FX 4: Authentic Nightclub Mirror Ball** — Faceted 3D disco mirror ball with motorized spin, overhead dual pinspots, and dancing floor reflection sprites.
- **FX 5: Neon Laser Polygon Tunnel** — Hexagonal laser tunnel with volumetric neon perimeter strobes.
- **FX 6: Cyber Cyberpunk Matrix Tunnel** — High-speed cyber grid corridor with wireframe light streams.
- **FX 7: Hypnotic Spiral Vortex Tunnel** — Hypnotic dual-helix vortex with bass-reactive angular acceleration.
- **FX 8: Neon Laser Fan Array** — Multi-beam concert laser array sweeping over crowd horizon.
- **FX 9: Audio Wave Surface Grid** — 3D displacement wireframe ocean surface reacting to live frequency spectrum.

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

**Quick Switch**: Click **`🎨 THEME`** in the top bar, press **`Alt + T`**, or select a card in the **Calibration & Glow** tab.

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
| `0` – `9` | Instant Scene Switch (FX 0 through FX 9) |
| `Alt + 1` – `Alt + 7` | Switch Activity Bar Tab (Audio, FX, Glow/Theme, Logo, Hue, OBS, About) |
| `Alt + A` | Toggle Show All Panes (Scroll View) |
| `Alt + T` | Quick Cycle UI Theme & Icon Style |
| `Arrow Left` / `Arrow Right` | Previous / Next Visual Effect Preset |
| `A` | Toggle Auto-VJ Mode |
| `L` | Toggle DJ Logo Layer Visibility |
| `S` | Toggle Station Logo Layer Visibility |
| `C` | Toggle Clean Display Mode (Hide all HUD overlays for clean video output) |
| `H` | Toggle HUD Overlays & Control Panel |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
