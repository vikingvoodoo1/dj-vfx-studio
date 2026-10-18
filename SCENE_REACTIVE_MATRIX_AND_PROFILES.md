# 📋 Scene Reactive Matrix & Hardware Memory Profiles Guide
> **Comprehensive Visualizer Reactive Engine Reference & Per-Scene Parameter Memory Architecture**  
> *Covering Real-Time Audio FFT, Direct Deck StageLinQ Telemetry, BPM Multi-Sync, Kick Transients, Physical Rig Simulation, and Per-Scene State Recall.*

---

## 📌 Executive Summary

**DJ VFX Studio** features 22 high-performance WebGL / Three.js visualizer scenes. Each scene interacts uniquely with incoming live telemetry: some are driven purely by multi-band audio FFT, others tap directly into Denon DJ StageLinQ or Pioneer Pro DJ Link on-the-wire telemetry (deck waveforms, playhead position, platter rotation), and others model motorized club fixtures or retro physics.

To give DJs and VJs complete visibility and creative control during live sets, the studio includes:
1. **The Scene Reactive Matrix:** A central reference detailing hotkeys, scene names, reactive engines, and technical hardware telemetry used by each scene.
2. **Real-Time Telemetry & Hardware Requirement Indicators:** Dynamic indicator chips inside each scene graphic box (`🎤 AUDIO`, `🎛️ DECK`, `🌐 NET`) displaying green checkmarks (`✓`) when active and red crosses (`✗`) when missing or unplugged.
3. **Hardware Disconnect Protection & Grayed-Out Scenes:** Automatic dimming and graying-out (`.scene-unmet-strict`) of scenes requiring physical hardware (such as FX 3 DJ Deck Waveforms) when the DJ deck is unplugged, complete with warning badges and safe audio fallback.
4. **Per-Scene Parameter Memory:** Each scene independently remembers its last-configured visual parameters (DJ Logo, Station Logo, Event Flyer, Performance Macro Faders, and Philips Hue / DMX lighting) without polluting other scenes.
5. **Auto-Recall Engine:** Switching scenes automatically restores that scene's customized parameters onto the stage and console sliders.
6. **Visual Difference Tracking & Reset Controls:** Clear visual indicators (`○ DEFAULT` vs `● CUSTOMIZED (X)`), highlighted diff fields, per-scene `↺ Reset` buttons, and a global reset action.

---

## 🚀 Quick Access & User Interface

| Trigger | Location | Behavior |
| :--- | :--- | :--- |
| **`📋 SCENE CONFIGURATION & MATRIX` Banner** | Left FX Console Pane (`#pane-fx` directly below title) | Prominent full-width button opening the Scene Configuration, Parameter Memory & Reactive Matrix modal. Includes dedicated **Requirements Key / Legend Strip**. |
| **`[M] ⚙️ SCENE CONFIG` Button** | Bottom Toolbar (next to Scene Theme Tabs) | Bottom toolbar launcher with hotkey indicator. |
| **Hotkey `M`** | Global Keyboard Shortcut | Toggles the Scene Configuration modal open/closed from anywhere. |
| **Hotkey `Escape`** | Global Keyboard Shortcut | Closes open modals (Scene Configuration, Diagnostics Center, OBS Manager). |
| **`🩺 DIAGNOSTICS` Button / `Alt+H`** | Console Health Mini Strip (`#pane-perform`) | Launches the full **Studio Health & Telemetry Diagnostics Center** modal. |

### Modal Features & Search
- **Live Search Bar:** Real-time filtering across scene names, hotkeys, reactive tags, descriptions, and technical keywords.
- **Category Chips:** Instant filtering by theme (`⚡ All (22)`, `🎛️ Equalizers & Decks`, `⚡ Lasers`, `🪩 Disco`, `🎃 Spooky`, `🕸️ Cyber & Retro`, `🌌 Space & Galaxy`).
- **Show Customized Only (`X`):** Dedicated checkbox filter to instantly display only scenes that differ from factory defaults.
- **Collapsible Parameter Memory Panel:** Click `▼ View Details` on any scene card to view all 4 parameter columns (DJ Logo, Station/Flyer, Performance Macros, Lighting) with modified parameters highlighted in gold/amber.

---

## ⚡ The 5 Reactive Engine Types

Every scene in DJ VFX Studio utilizes one or more reactive engine inputs:

```
                          ┌─────────────────────────────────────┐
                          │     INCOMING HARDWARE & AUDIO       │
                          └──────────────────┬──────────────────┘
                                             │
      ┌─────────────────┬────────────────────┼────────────────────┬─────────────────┐
      ▼                 ▼                    ▼                    ▼                 ▼
┌───────────┐     ┌───────────┐        ┌───────────┐        ┌───────────┐     ┌───────────┐
│⚡ DIRECT  │     │ 🎧 LIVE   │        │ 🥁 BPM    │        │ 💥 KICK   │     │ 🏗️ RIG    │
│  DECK     │     │  AUDIO FFT│        │  MULTI-   │        │  TRAN-    │     │  SIMU-    │
│  TELEMETRY│     │  SPECTRUM │        │  SYNC     │        │  SIENTS   │     │  LATION   │
├───────────┤     ├───────────┤        ├───────────┤        ├───────────┤     ├───────────┤
│ StageLinQ │     │ 5 Bands:  │        │ Phase     │        │ Sub-bass  │     │ Motorized │
│ Wire Pkts │     │ Sub-Bass, │        │ Sweeps,   │        │ transient │     │ Pan/Tilt  │
│ Playhead, │     │ Bass,     │        │ Beat Pips,│        │ spike     │     │ Truss,    │
│ Waveforms,│     │ Low-Mid,  │        │ Bar Pips, │        │ detector  │     │ Fog/Haze  │
│ Pitch/BPM │     │ High-Mid, │        │ Downbeat  │        │ (> 0.70   │     │ Shaders   │
│ Platter Hz│     │ Treble    │        │ Pulses    │        │ impact)   │     │ Lasers    │
└───────────┘     └───────────┘        └───────────┘        └───────────┘     └───────────┘
```

1. **`⚡ Direct Deck StageLinQ` (Direct Hardware Wire Telemetry):**
   Listens to high-frequency broadcast packets from physical Denon DJ / Engine OS media players and mixers (SC6000, SC5000, Prime 4) or Pioneer Pro DJ Link bridges. Reads exact track position in milliseconds, platter angular velocity, pitch fader percentage, active deck on-air status, and pre-computed track waveforms.
2. **`🎧 Live Audio FFT` (Multi-Band Spectrum):**
   Directly transforms incoming audio stream via Web Audio API `AnalyserNode` into 5 discrete frequency bands: Sub-Bass (20–60Hz), Bass (60–250Hz), Low-Mid (250–500Hz), High-Mid (500–2000Hz), and Treble (2000–16000Hz).
3. **`🥁 BPM Multi-Sync` (Phase & Tempo Locking):**
   Locks animation cycles, bar counters, camera sweeps, and strobe rhythms to hardware BPM or tapped tempo. Includes Pioneer CDJ-3000 / CDJ-2000 phase meter synchronization (1–4 beat countdown needle).
4. **`💥 Kick Transients` (Dynamic Impact Detection):**
   Real-time transient attack detector analyzing instantaneous low-end energy acceleration against running averages. Triggers particle bursts, camera shakes, glitch flashes, and strobe shocks on kick drums.
5. **`🏗️ Physical Rig Simulation` (3D Stage Fixtures):**
   Simulates physical stage lighting fixtures: motorized moving-head beamers with pan/tilt interpolation, overhead trussing, volumetric laser projectors with atmospheric fog scattering, and disco mirror reflections.

---

## 🎛️ Complete 22-Scene Reactive Engine Matrix

| ID | Key | Scene Name | Category | Requirements | Reactive Engines | Hardware / Audio Inputs Used | Visual Engine Behavior |
| :---: | :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| **0** | `1` | **3D Studio EQ** | Equalizers & Decks | `🎤 Audio` | `🎧 Live Audio FFT` | 5-Band FFT spectrum analysis (Sub-Bass, Bass, Low-Mid, High-Mid, Treble), Stereo L/R levels | 3D equalizer bars with dynamic height displacement, studio lighting reflections, and frequency-gradient coloring. |
| **1** | `2` | **Circular Spectrum** | Equalizers & Decks | `🎤 Audio` | `🎧 Live Audio FFT`<br>`💥 Kick Transients` | Multi-band FFT, sub-bass transient spikes | Radial spectrum ring that expands on sub-bass pulses, mid-frequencies deform circular arcs, and high-frequency spikes emit outward spark particles. |
| **2** | `3` | **Fluid Wave Matrix** | Equalizers & Decks | `🎤 Audio` | `🎧 Live Audio FFT`<br>`💥 Kick Transients` | Time-domain oscilloscope waveforms, low-end bass ripples | High-resolution 3D fluid matrix where vertices ripple and displace in real time according to audio waveform amplitude and bass impacts. |
| **3** | `4` | **DJ Deck Waveforms** | Equalizers & Decks | `🎛️ Deck` *(Strict)* | `⚡ Direct Deck StageLinQ`<br>`🥁 BPM Multi-Sync` | StageLinQ track waveforms (`.rgb` / `m.db`), sub-ms playhead position, platter rotation, deck pitch faders | Authentic 3-band scrolling waveform renderer driven directly by hardware deck telemetry. Grayed out (`.scene-unmet-strict`) when deck is unplugged. |
| **4** | `5` | **Spinning Disco Ball** | Disco | `🎤 Audio` | `🎧 Live Audio FFT`<br>`🥁 BPM Multi-Sync`<br>`🏗️ Physical Rig Simulation` | Audio bass pulse, beat tempo, spotlight position | 3D disco ball with thousands of mirrored facets reflecting moving pinspots across a club room. Rotates with BPM sync and pulses specular highlights on bass hits. |
| **5** | `6` | **Dual-Bank Lasers** | Lasers | `🎤 Audio` | `🎧 Live Audio FFT`<br>`🥁 BPM Multi-Sync`<br>`🏗️ Physical Rig Simulation` | BPM beat clock, high-frequency transients, audio energy | Dual motorized overhead laser banks projecting scanning beam fans, cones, and sheets with volumetric atmospheric fog scattering. Beats trigger laser color changes and fan sweeps. |
| **6** | `7` | **Saber Multi-Beams** | Lasers | `🎤 Audio` | `🎧 Live Audio FFT`<br>`💥 Kick Transients`<br>`🏗️ Physical Rig Simulation` | Kick transients, mid-range energy, pan/tilt sweeps | Overhead moving-head fixtures firing concentrated light sabers across the stage. Fixtures pan and tilt rhythmically, flaring on kick drum transients. |
| **7** | `8` | **Strobe Rings** | Lasers | `🎤 Audio` | `🥁 BPM Multi-Sync`<br>`💥 Kick Transients` | Kick transients, downbeat clock, high-hat triggers | Concentric strobe rings pulsing down a 3D tunnel. Kick drums trigger blinding strobe flashes and high-hats trigger ring ripples. |
| **8** | `9` | **Synthwave Grid** | Cyber & Retro | `🎤 Audio` | `🎧 Live Audio FFT`<br>`🥁 BPM Multi-Sync` | Bass frequency amplitude, track tempo, time-domain wave | Retro-futuristic 80s perspective grid scrolling toward neon mountains. Bass hits deform the grid terrain and send luminous energy pulses down wireframe lines. |
| **9** | `0` | **Synthwave River & Sun** | Cyber & Retro | `🎤 Audio` | `🎧 Live Audio FFT`<br>`🥁 BPM Multi-Sync` | Low-end bass, stereo energy, BPM clock | Neon synthwave sun sitting over a liquid digital river. Audio bass drives sun expansion, horizon bloom, and river surface undulation. |
| **10** | `-` | **Matrix Code Rain** | Cyber & Retro | `🎤 Audio` | `🎧 Live Audio FFT`<br>`💥 Kick Transients` | Audio volume, mid/treble frequencies, transient hits | Cascading digital rain with green glyphs falling in 3D perspective. Audio peaks accelerate fall speed and kick transients invert glyph brightness. |
| **11** | `=` | **Retro Arcade 80s** | Cyber & Retro | `🎤 Audio` | `🎧 Live Audio FFT`<br>`🥁 BPM Multi-Sync` | Mid-range frequencies, beat counter, audio envelope | 1980s neon arcade corridor with wireframe geometry, floating tokens, and CRT scanlines dancing to the musical rhythm. |
| **12** | `[` | **Warp Starfield** | Space & Galaxy | `🎤 Audio` | `🎧 Live Audio FFT`<br>`💥 Kick Transients` | Bass volume, kick transient bursts | 3D starfield hyperspace warp. Stars streak past camera based on low-end intensity; heavy drops trigger lightspeed hyperspace velocity. |
| **13** | `]` | **Spiral Galaxy Vortex** | Space & Galaxy | `🎤 Audio` | `🎧 Live Audio FFT`<br>`🥁 BPM Multi-Sync` | Multi-band FFT, stereo panning, track BPM | Rotating spiral galaxy with millions of stellar particles. Audio energy expands the galaxy arms while treble frequencies add shimmering star clusters. |
| **14** | `O` | **Hyper Particle Stream** | Space & Galaxy | `🎤 Audio` | `🎧 Live Audio FFT`<br>`💥 Kick Transients` | High-frequency transients, sub-bass impacts | High-velocity particle tunnel with hundreds of thousands of light particles streaming past the viewer, reacting dynamically to stereo separation and bass drops. |
| **15** | `P` | **Time.is Clock** | Space & Galaxy | `🎛️ Deck`<br>`🌐 Net` | `⚡ Direct Deck StageLinQ`<br>`🥁 BPM Multi-Sync` | Deck track elapsed/remaining time, hardware BPM, system clock | High-precision digital time and performance clock visualizer displaying local set time, elapsed track time, and synchronized beat intervals. |
| **16** | `K` | **Sweeping Godrays** | Lasers | `🎤 Audio` | `🎧 Live Audio FFT`<br>`🏗️ Physical Rig Simulation` | Audio intensity, low-pass filter, camera movement | Atmospheric volumetric light shafts projecting through dense stage haze. Beams sweep across the scene synchronized to music dynamics. |
| **17** | `L` | **White Godrays & Fog** | Lasers | `🎤 Audio` | `🎧 Live Audio FFT`<br>`🏗️ Physical Rig Simulation` | High-frequency brightness, bass rumble, stage smoke | Pure white stadium-style godrays piercing dense ground fog with realistic volumetric light scattering. |
| **18** | `;` | **Disco Floor & Godrays** | Disco | `🎤 Audio` | `🎧 Live Audio FFT`<br>`🥁 BPM Multi-Sync`<br>`🏗️ Physical Rig Simulation` | Kick drum hits, beat tempo, mid-range melody | Illuminated Saturday Night Fever retro checkered disco floor pulsing with colorful LED tiles beneath sweeping volumetric godrays. |
| **19** | `'` | **VHS Glitch Words** | Cyber & Retro | `🎤 Audio` | `🎧 Live Audio FFT`<br>`💥 Kick Transients` | Audio peaks, transient attacks, high-frequency noise | Retro VHS tape tracking simulation with analog tape artifacts, chromatic aberration, scanline jitter, and glitch typography flashing on transients. |
| **20** | `,` | **Pumpkin Disco Ball** | Spooky | `🎤 Audio` | `🎧 Live Audio FFT`<br>`🥁 BPM Multi-Sync`<br>`🏗️ Physical Rig Simulation` | Bass hits, beat tempo, spotlight angle | Jack-o'-lantern carved disco pumpkin rotating with mirrored reflections, glowing amber light beams, and spooky Halloween club vibes. |
| **21** | `.` | **Haunted Manor** | Spooky | `🎤 Audio` | `🎧 Live Audio FFT`<br>`💥 Kick Transients`<br>`🏗️ Physical Rig Simulation` | Audio thunder impacts, bass rumble, mid frequencies | Eerie haunted cemetery and gothic manor silhouette with volumetric fog, flickering lightning on audio transients, and spectral particles. |

---

## 🚦 Live Telemetry & Hardware Requirement Indicators

DJ VFX Studio visualizer scenes have distinct technical prerequisites to perform at their fullest potential. To eliminate guesswork during live performances, every scene graphic box (across the Left FX Pane, the Bottom Preset buttons, and the Scene Reactive Matrix modal) features dynamic **Telemetry Requirement Indicator Chips**.

### 1. The 3 Requirement Types

| Requirement | Indicator Label | Hardware / Engine Dependency | Active / Met State (`✓` Green) | Missing / Unmet State (`✗` Red) |
| :--- | :---: | :--- | :--- | :--- |
| **Audio Input** | `🎤 AUDIO` | Web Audio API `AnalyserNode` connected to line-in, microphone, or tab/system capture. | **`✓ 🎤 AUDIO`** (Neon Green)<br>Live audio stream connected and actively supplying frequency FFT data. | **`✗ 🎤 AUDIO`** (Vibrant Red)<br>Audio feed not connected, permission denied, or input muted. |
| **Hardware Deck** | `🎛️ DECK` | Direct on-the-wire telemetry from Denon DJ StageLinQ or Pioneer Pro DJ Link companion bridge (`ws://localhost:8080`). | **`✓ 🎛️ DECK`** (Neon Green)<br>Physical players streaming real-time playhead, platter Hz, BPM, and waveform packets. | **`✗ 🎛️ DECK`** (Vibrant Red)<br>Deck bridge offline, network cable disconnected, or no packets received in >60s. |
| **Internet Connection** | `🌐 NET` | Browser network connectivity via `navigator.onLine` (e.g. for Time.is NIST atomic clock synchronization). | **`✓ 🌐 NET`** (Neon Green)<br>Browser online and able to synchronize external network data. | **`✗ 🌐 NET`** (Vibrant Red)<br>Browser offline; local system clock fallback used. |

---

### 2. Strict Hardware Disconnect Protection & Softened Warning State

Certain scenes are designed specifically around high-resolution physical deck telemetry:
- **FX 3: DJ Deck Waveforms** requires direct playhead position, platter angular velocity, and RGB waveform data streamed from physical media players.

When the required hardware is unplugged or offline:
1. **Softened Warning Appearance (`.scene-unmet-strict`):**
   - The scene card in the Left FX Pane is gently softened to **84% opacity** (`opacity: 0.84`, `grayscale(0.20) brightness(0.92)`). Rather than heavily graying out to 40% (which makes it appear broken or permanently disabled), it preserves clear visual identity while signaling that a prerequisite is missing.
   - Card border adopts a distinctive amber warning accent (`rgba(255, 140, 0, 0.5)`).
   - A dedicated missing-hardware badge is displayed directly on the card: **`⚠️ DECK REQUIRED`** (`.fx-card-unmet-alert`).
   - In the bottom toolbar preset row, button `[4]` adopts an amber dashed border.
   - In the Scene Configuration / Matrix modal, the card displays an amber banner: `⚠️ DECK UNPLUGGED`.
2. **Interactive Hover & Full Restoral:**
   - Hovering over an unmet card instantly restores **100% full opacity and full color** (`opacity: 0.98`, `grayscale(0.0)`), allowing the DJ to inspect or select the scene at any time.
   - Tooltip clearly states: `Hot key: 4 • ⚠️ Physical DJ Deck Required (Disconnected)`.
3. **Fail-Safe Fallback Execution:**
   - If an operator clicks or presses the hotkey (`4`) while the deck is disconnected, **the visualizer runs safely with zero crashes or blackouts**.
   - The studio immediately displays an informative toast notification:
     > `⚠️ Note: DJ Deck Waveforms requires physical deck telemetry. Running live audio fallback.`
   - The engine automatically engages an internal audio spectrum fallback so stage visuals remain dynamic and responsive.
4. **Instant Plug-and-Play Reconnection:**
   - As soon as the DJ deck reconnects and begins streaming packets, the `notifyHardwareDeckPacket` listener triggers `updateSceneRequirementsUI()`.
   - The warning state is instantly lifted, restoring full saturation, and the deck requirement chip turns to green `✓ 🎛️ DECKS`.

---

### 3. Requirements Key / Legend Strip

To ensure operators immediately understand what every requirement icon means during high-pressure live shows, a dedicated horizontal **Requirements Key** is placed directly below the Scene Configuration button in the FX Pane, as well as in the Scene Configuration modal header:

```
KEY: [✓ 🎤 AUDIO] Live Audio Active   [✓ 🎛️ DECKS] Decks Telemetry   [✓ 🌐 NET] Internet Sync   [✗] = UNPLUGGED
```

---

## 🩺 Live Performance Console Health & Studio Diagnostics Center

Located directly at the top of the **Live Performance Deck** (`#pane-perform`), the studio features a real-time **Console Health Mini Status Strip** paired with a full-screen **Studio Health & Telemetry Diagnostics Center** modal (`[Alt+H]`).

### 1. Console Health Mini Status Strip (`#console-health-mini-strip`)

A compact, subtle status bar designed for immediate peripheral glance without visual distraction:

| Subsystem | Indicator States & Thresholds | Details & Behavior |
| :--- | :--- | :--- |
| **🎧 Audio In** | • **Green (`status-green`)**: `AUDIO: LINE-IN` / `AUDIO: [INTERFACE NAME]`<br>• **Amber (`status-amber`)**: `AUDIO: MACBOOK MIC`<br>• **Red (`status-red`)**: `AUDIO: OFFLINE` | Automatically detects device label. USB / Thunderbolt soundcards (Focusrite, Pioneer, Denon, RME, MOTU) trigger Green. Built-in laptop microphones trigger Amber (acoustic room capture). Muted or disconnected audio triggers Red. |
| **🎛️ DJ Decks** | • **Green (`status-green`)**: `DECKS: DENON STAGELINQ` / `DECKS: PRO DJ LINK`<br>• **Red (`status-red`)**: `DECKS: OFFLINE` | Shows on-the-wire protocol name when packets are live. Automatically enters Red when no packets received for >60s. |
| **📶 Network** | • **Green (`status-green`)**: `NET: [X]ms` (<70ms RTT)<br>• **Amber (`status-amber`)**: `NET: [X]ms` (70–220ms RTT)<br>• **Red (`status-red`)**: `NET: HIGH` / `NET: OFFLINE` | Automatically detects medium: Wired Ethernet (`🔌`), Wi-Fi (`📶`), or Cellular (`📱`). Measures real round-trip ping every 15s via lightweight non-intrusive HEAD requests. |
| **⚡ Engine / Hardware** | • **Green (`status-green`)**: `60 FPS • 42MB`<br>• **Amber (`status-amber`)**: `<48 FPS`<br>• **Red (`status-red`)**: `<30 FPS` | Real-time smoothed render loop frame rate and JS heap allocated memory. |
| **📡 Broadcast / Stream** | • **Green (`status-green`)**: `OBS: READY` / `OBS: LIVE FEED`<br>• **Amber (`status-amber`)**: `BUTT: CLIPPING! ⚠️` | Monitors OBS browser source feed and BUTT safe headroom. Instantly alerts if audio exceeds 0 dBFS to prevent web radio distortion. |
| **🩺 Diagnostics Button** | `🩺 DIAGNOSTICS` [Alt+H] | Launches the full Studio Diagnostics Center modal. Clicking any individual mini badge also directly opens diagnostics. |

---

### 2. Studio Health & Telemetry Diagnostics Center Modal (`#studio-health-modal-backdrop`)

Accessible via the `🩺 DIAGNOSTICS` button, clicking any status badge, or pressing `Alt+H`, this modal provides in-depth telemetry for triaging all 6 studio subsystems:

1. **🎧 Audio In Subsystem Card:**
   - Active device label, interface category (USB / Thunderbolt Interface vs Internal Mic vs Synthetic).
   - AudioContext sample rate (e.g. `48,000 Hz`) and estimated driver latency.
   - Real-time Peak dBFS and LUFS loudness telemetry with live logarithmic VU meter bar.
2. **🎛️ DJ Decks Telemetry Card:**
   - Active WebSocket bridge URL (`ws://localhost:8080`) and connection state.
   - On-the-wire protocol source (Denon DJ StageLinQ, Pioneer Pro DJ Link, Native Instruments Traktor).
   - Packet throughput rate (e.g. `42 pkts/sec`) and cumulative packet counter.
   - Active on-air deck number, track BPM, and playhead status.
3. **🌐 Network & Time.is Sync Card:**
   - Physical connection medium (Wired Gigabit Ethernet vs 802.11ax Wi-Fi).
   - Round-trip ping latency with qualitative classification (Excellent, Moderate, High Latency).
   - Downlink bandwidth estimate and NIST atomic clock synchronization offset (±0.002s).
4. **⚡ Engine & Hardware Performance Card:**
   - Smoothed frame rate and frame delta (e.g. `59.9 FPS • 16.7ms frame`).
   - Browser JS heap memory usage vs total allocated memory.
   - Active Three.js scene index and title.
   - Hardware accelerated WebGL pipeline renderer (Metal ANGLE / WebGL 2.0).
5. **💡 Philips Hue & DMX Lighting Card:**
   - Bridge IP address (e.g. `192.168.1.185 (Hue Bridge v2)`) and pairing status.
   - Sync mode (Scene Palette Sync + Kick Strobe vs Standby).
   - Bound entertainment lights count and 10Hz rate-limited packet queue.
6. **📡 Broadcast, OBS & BUTT Streaming Card:**
   - OBS browser source resolution and presentation mode (Solid Visual Stage vs Transparent Alpha Overlay).
   - Popout Stage window / secondary screen status.
   - BUTT safe headroom compliance indicator (-3.0 dBFS target).
   - Real-time `nowplaying.txt` text export sync status.

### 3. Interactive Diagnostics Actions
- **`🧪 Run Full Self-Test` (`#btn-run-selftest`):**
  Sequentially verifies network ping, audio processor state, WebGL shader compilation, and inter-window broadcast channels, providing immediate visual confirmation:
  > `✓ Diagnostic Self-Test Complete: 6 of 6 Subsystems Verified & Operational!`
- **`📋 Copy Diagnostic Report` (`#btn-copy-health-report`):**
  Generates a clean markdown diagnostic report with timestamps and all subsystem metrics, copying directly to the system clipboard for rapid troubleshooting or technical support.

---

## 💾 Per-Scene Hardware Parameter Memory Engine

### Parameters Stored per Scene

Each scene maintains an isolated profile containing 5 functional categories:

```json
{
  "djLogo": {
    "enabled": true,
    "url": "/images/logo/jkmclaren_shock.mp4",
    "title": "jkmclaren Shock",
    "isVideo": true,
    "position": "center",
    "spin": "off",
    "spinSpeed": 1.0,
    "scale": 1.0,
    "offsetX": 0,
    "offsetY": 0,
    "contrast": 1.0,
    "bright": 1.0,
    "shield": false
  },
  "stationLogo": {
    "enabled": false,
    "url": null,
    "title": "Default Station",
    "isVideo": false,
    "position": "top-right",
    "scale": 1.0,
    "offsetX": 0,
    "offsetY": 0
  },
  "flyer": {
    "enabled": false,
    "url": null,
    "title": "Event Flyer",
    "isVideo": false,
    "position": "bottom-right",
    "scale": 0.85,
    "offsetX": 0,
    "offsetY": 0
  },
  "macro": {
    "gain": 1.0,
    "sens": 1.0,
    "bloom": 0.35
  },
  "lighting": {
    "hueSync": false,
    "hueMode": "scene_sync",
    "hueIntensity": 100,
    "hueMinBri": 20,
    "hueKickStrobe": false,
    "dmxUniverse": 1,
    "dmxProfile": "default"
  }
}
```

### Auto-Capture & Auto-Recall Workflow

1. **Auto-Capture (`captureCurrentSceneParam`):**
   Whenever you adjust any logo toggle, position pill, spin mode, spin speed slider, scale slider, nudge offset slider, performance macro fader (Gain, Sens, Bloom), or Philips Hue / DMX setting, the change is **instantly captured** into the active scene's profile in `localStorage` under `dj_vfx_scene_profiles_v2`.
2. **Loop Prevention (`isApplyingSceneProfile`):**
   When switching scenes, an internal flag `isApplyingSceneProfile = true` prevents the restoration process from triggering capture listeners, avoiding circular update loops.
3. **Auto-Recall (`applySceneProfile`):**
   When you switch to any scene (via hotkey `1`–`]`, matrix card click, or bottom bar button):
   - The scene's specific logo media, visibility, positioning, spin mode, and offsets are restored.
   - The macro faders (Bass Gain, Sensitivity, Bloom) and stage post-processing update to that scene's preferred levels.
   - Philips Hue / DMX synchronization settings update to that scene's lighting profile.
   - The Matrix UI automatically updates all card badges and diff counters.

---

## 🎨 Visual Difference Tracking & Reset System

### 1. Status Badges
- **`○ DEFAULT`**: Displayed when all parameters in that scene match the factory baseline.
- **`● CUSTOMIZED (X)`**: Displayed with an amber illuminated badge showing the exact number `X` of parameters that have been modified from factory defaults.

### 2. Card Highlighting
- When a scene is customized, its card receives a subtle gold border accent (`rgba(255, 170, 0, 0.45)`) and dark amber backdrop gradient (`rgba(255, 170, 0, 0.05)`).
- The parameters header displays `(X MODIFICATIONS SAVED)` in bright amber.
- Inside the 4-column parameter view, every altered property is highlighted with a gold badge:
  - Example: `Position: BOTTOM-LEFT` (gold), `Spin: Y (2.5x)` (gold), `Bloom Glow: 0.85x` (gold).

### 3. Reset Actions
- **Single-Scene Reset (`↺ Reset`):** Click the `↺ Reset` button on any customized card to immediately revert that scene to its factory baseline. If that scene is currently active, live stage visuals and console sliders are instantly updated.
- **Global Reset (`⚠️ Reset All 22 Scenes to Default`):** Located in the matrix modal footer. Prompts for confirmation and resets all 22 scene profiles to factory defaults in a single click.

---

## 💻 Architecture & Code Reference

### Key Source Files

1. **[`src/scene-profiles.js`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/scene-profiles.js)**
   - `SCENE_METADATA`: Array of 22 scene definition objects (IDs 0–21, hotkeys, names, icons, categories, reactive tag lists, summaries, and technical engine descriptions).
   - `REACTIVE_TAG_DEFINITIONS`: Color, border, background, and icon tokens for the 5 reactive engine types.
   - `DEFAULT_SCENE_PROFILE`: Baseline object containing factory defaults for `djLogo`, `stationLogo`, `flyer`, `macro`, and `lighting`.
   - `SceneProfileManager`: Singleton class handling profile loading, saving, deep difference calculation (`getDiff(index)`), per-scene resets, and migration.
2. **[`src/main.js`](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/main.js)**
   - `applySceneProfile(sceneIndex)`: Restores logo layers, positions, spin speeds, macro faders, and Philips Hue parameters when switching scenes.
   - `captureCurrentSceneParam(category, key, value)`: Event hook updating active scene memory when UI controls change.
   - `openSceneMatrixModal()`, `closeSceneMatrixModal()`, `updateMatrixUI()`: Manages modal rendering, category chip filtering, real-time search, diff highlighting, and interactive switches/resets.
3. **[`index.html`](file:///Users/jarikuhanen/agy/dj-vfx-studio/index.html)**
   - Modal container `#scene-matrix-modal-backdrop` and glassmorphic card layout.
   - Toolbar button `#btn-open-scene-matrix` and FX console button `#btn-open-scene-matrix-pane`.
   - Complete CSS styling for matrix cards, reactive pills, diff indicators, and responsive scrollbars.

---

## 🧪 Verification & Automated Testing

The Scene Reactive Matrix and Memory Profiles suite is thoroughly verified via automated Chrome DevTools Protocol (CDP) scripts:

```bash
# Build the production bundle
npm run build

# Run interactive automated matrix verification suite in headless Chrome
node scratch/verify_matrix_interactive.js
```

### Verified Test Cases
- [x] Modal launches via `#btn-open-scene-matrix`, `#btn-open-scene-matrix-pane`, and hotkey `M`.
- [x] All 22 scenes render with correct hotkeys, category tags, reactive engine tags, and technical descriptions.
- [x] Live scene indicator (`🟢 LIVE SCENE`, `✓ Active`) highlights the currently active shader.
- [x] Parameter modifications update `SceneProfileManager`, transition status to `● CUSTOMIZED (X)`, and highlight altered fields in amber.
- [x] Switching between scenes auto-recalls saved parameters and restores sliders without cross-scene pollution.
- [x] `Show Customized Only` filter accurately filters matrix to only customized scenes.
- [x] `↺ Reset` button reverts scene back to `○ DEFAULT` baseline and updates live stage immediately.
- [x] Zero JavaScript errors or Temporal Dead Zone (TDZ) exceptions in browser console.
