# 🎧 DJ VFX Studio

[![WebGL](https://img.shields.io/badge/WebGL-Three.js-blue.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev/)
[![DJ Bridge](https://img.shields.io/badge/DJ_Bridge-StageLinq_%7C_Pro_DJ_Link_%7C_Traktor_%7C_Hue-00ffcc.svg)](https://github.com/vikingvoodoo1/dj-vfx-studio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**DJ VFX Studio** is a real-time, audio-reactive 3D visual effects and stage lighting platform tailored for live DJs, streaming broadcasts (OBS Studio), club venues, and festival stages. Built on **WebGL (Three.js)** and **custom GLSL shaders**, it combines authentic concert moving-head rigs, volumetric participating media fog, retro cyber synthwave landscapes, and live DJ deck telemetry with multi-platform DJ hardware bridge integration (Denon StageLinq, Pioneer Pro DJ Link, Traktor Pro) and smart Philips Hue club lighting control.

---

## 🌟 Key Highlights

- **22 GPU-Accelerated 3D VFX Scenes**: Spanning volumetric laser arrays, authentic moving-head godray fixtures, illuminated disco dance floors, Protean volumetric clouds, VHS glitch typography, disco mirror balls, synthwave landscapes, cosmic galaxies, and live deck waveform visualizers.
- **Universal Multi-Platform DJ Hardware Bridge**: Zero-latency companion bridge supporting **Denon DJ StageLinq** (Prime/Engine OS), **Pioneer Pro DJ Link / Rekordbox** (CDJ/XDJ UDP beat packets), **Native Instruments Traktor Pro** (session watcher & port 8001 metadata), and **Universal REST / File Drop API** (Serato & VirtualDJ).
- **Philips Hue Smart Lighting Engine**: Ultra-low-latency lighting synchronization with 4 dedicated reaction modes, high-dynamic-range punch, multi-room discovery, and the **⚡ Kick Pop White Strobe** burst system.
- **Studio-Grade Audio & Loudness Metering**: High-resolution FFT spectrum analysis (Bass, Mid, Treble), transient onset detection, ITU-R BS.1770 LUFS loudness metering, dBFS true-peak gauges, peak-hold needles, and clip alerts.
- **Multi-Screen & OBS Broadcast**: Multi-window state replication via `BroadcastChannel` and WebSocket relay with transparent HUD layers, clean display modes (`/?clean=1`), and direct OBS browser source support (`/?obs=1`).
- **Custom DJ & Station Branding Engine**: 3D extruded and billboard DJ logo overlays with beat-reactive pulse physics, protective shields, 3D orbit/center spin modes, and live upload management.

---

## 🗂️ VFX Scene Bank (22 Distinct Modes)

### 📊 Category 1: Equalizers & Decks (FX 0–3)
- **FX 0: 3D Studio LED Equalizer Wall** — Segmented stadium LED towers with peak-hold physics and dynamic hue cascades.
- **FX 1: Circular Spectrum Mandala** — Radial 360° FFT frequency kaleidoscope with chromatic resonance.
- **FX 2: Fluid Glowing Wave Matrix** — Undulating neon sine ribbon grid reacting dynamically to mid-range and treble harmonics.
- **FX 3: DJ Deck Scrolling Waveforms** — Authentic Pioneer/Denon-style 3-band RGB scrolling audio waveform history with cue markers, active loop brackets, and deck HUD telemetry.

### ⚡ Category 2: Lasers & Disco (FX 4–9, FX 18–20)
- **FX 4: Authentic Nightclub Mirror Ball Rig** — Motorized faceted mirror sphere with dual overhead pinspots, dancing room specular sweeps, and dancefloor reflection pools.
- **FX 5: 70s Disco Dancefloor** — Classic illuminated *Saturday Night Fever* geometric floor grid pulsing to the four-on-the-floor beat.
- **FX 6: Dual-Bank Volumetric Searchlights** — Concert arena skyward searchlight towers with volumetric cone geometry and cross-sweeping patterns.
- **FX 7: Saber Multi-Beam DJ Fixtures** — Multi-head batten laser bars creating tight parallel and fan beam geometries.
- **FX 8: Strobe Hyper-Rings & Laser Matrix** — Concentric strobe rings pulsing with transient impacts and high-energy laser grids.
- **FX 9: Silhouette Club Dancers in Glowing Box Light Walls** — Atmospheric backlit dancing silhouette club performers framed in reactive color boxes.
- **FX 18: Sweeping Godray Disco Lights** — Top truss moving-head rig featuring 8 independent spotlights with Wawa Sensei volumetric godray cones, Mie forward scattering, continuous 3D FBM participating media smoke, staggered heavy bass chase flaring, and floor reflection pools.
- **FX 19: Pure White Godrays & Protean Volumetric Clouds** — Pure Diamond Xenon white 8-head moving spotlight rig combined with raymarched Protean Clouds volumetric fog backdrop, delivering ethereal monochrome lighting with bass-reactive cloud turbulence and floor reflection pools.
- **FX 20: Disco Dancefloor with Coloured Godrays & Atmospheric Smoke** — Classic 70s *Saturday Night Fever* illuminated tile dancefloor bathed in 8 sweeping multi-colored concert godrays striking the floor with live reflection pools, backed by the soft Protean volumetric cloud smoke medium and refined lens glow.

### 🕸️ Category 3: Cyber & Retro (FX 10–13, FX 21)
- **FX 10: Synthwave Cyber Grid** — Infinite perspective neon wireframe grid rushing into the horizon with bass-reactive mountain ranges.
- **FX 11: Synthwave River, Mountains & 80s Sun** — Custom procedural GLSL shader featuring segmented outrun sun rays, glowing reflective river, and twilight star skies.
- **FX 12: Matrix Code Rain** — Classic cascading digital rain glyphs rendered in glowing phosphor green with audio speed modulation.
- **FX 13: Retro Arcade 80s Theme** — Vintage vector CRT arcade aesthetics with wireframe geometry and nostalgic neon glow.
- **FX 21: VHS Glitch Words with Overhead Godrays & Inward Smoke** — Alternating bold white typography (*"DREAMLOVER"* / *"DO YOU BELIEVE?"*) with real-time VHS scanlines, horizontal tape tracking tears, RGB chromatic displacement, and analog static noise, illuminated by 8 downward-pointing moving-head godray spotlights with dual-directional atmospheric smoke billowing inward from left and right wings.

### 🌌 Category 4: Space, Particles & Stage Lights (FX 14–17)
- **FX 14: Warp Speed Starfield** — Hyperdrive relativistic star streaks accelerating dynamically on track drops.
- **FX 15: Spiral Galaxy Cosmic Vortex** — 3D volumetric logarithmic accretion spiral with millions of stellar bodies and core luminance.
- **FX 16: Hyper Particle Stream** — GPU curl-noise particle strands flowing along smooth Bézier splines with chromatic velocity grading.
- **FX 17: Time.is Precision DJ Clock & Spectrum** — Millisecond-accurate synchronized stage clock with active DJ BPM readout and surrounding gyro gimbal rings.

---

## 💡 Philips Hue Smart Club Lighting Integration

DJ VFX Studio includes a dedicated Philips Hue streaming engine designed for low-latency club and studio lighting reactivity:

- **Automatic Bridge Discovery & Pairing**: N-UPnP local network discovery and one-click pushlink authentication.
- **Multi-Room & Zone Selection**: Target specific entertainment zones or room groups (e.g. 10-bulb studio setup).
- **4 Reactive Lighting Modes**:
  1. **Scene Sync (Default)**: Automatically tracks the live 3D visualizer color palette (Neon Cyan, Electric Purple, Sunset Gold, Laser Green) with bass punch brightness scaling.
  2. **Bass Flash**: Deep moody nightclub royal blue at rest, snapping instantly to vivid saturated neon crimson on bass drops and transient kicks.
  3. **Rainbow Cycle**: Smooth 360° RGB spectrum cycling synchronized dynamically to the live track BPM.
  4. **Strobe Only**: Rapid high-contrast strobing on beat onsets with low resting ambient floor levels.
- **⚡ Kick Pop White Strobe**: Independent toggle that fires an instant 85ms xenon-white flash (`[0.3127, 0.3290]` at max brightness, `0ms` transition) on heavy bass kicks, before smoothly reverting to the active color palette without dropping network packets.
- **Hardware Pacing Queue**: Sequential rate-controlled queue that prevents Zigbee buffer congestion while ensuring instantaneous transient delivery.

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
# Start Vite development server
npm run dev

# In a separate terminal, launch the Universal DJ Bridge & Hue Daemon
node server/stagelinq-bridge.js
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
| `Shift + 0` – `Shift + 8` | Instant Scene Switch (FX 10 through FX 18) |
| `H` | Toggle HUD Overlays & FX Toolbar |
| `F` | Toggle Fullscreen on external HDMI / Projector Output |
| `O` | Open OBS Streaming Manager Modal |
| `Shift + O` | Toggle OBS Output Broadcast Mute |
| `L` | Toggle DJ Logo Layer Visibility |
| `M` | Cycle Logo Spin Mode (Center Spin / 3D Orbit / Billboard) |
| `S` | Toggle Logo Protective Glow Shield |
| `B` | Open Bloom & Post-Processing Calibrator |
| `C` | Toggle Clean Display Mode (Hide all HUD overlays for clean video output) |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
