# 🌊 Authentic DJ Deck Waveforms & On-the-Wire Telemetry Guide
> **Universal 3-Tier Waveform Engine & Real-Time Hardware Protocol Architecture**  
> *Covering Denon StageLinQ, Pioneer Pro DJ Link, Native Instruments Traktor, and Live Spectral Fallbacks.*

---

## 📌 Executive Summary

Modern DJ hardware (Pioneer CDJ-3000, Denon SC6000, Prime 4) does not calculate scrolling waveforms from live audio inputs. Instead, players render pre-computed multi-band frequency profiles (the **Map**) synchronized to high-frequency network playhead packets (the **Needle**).

**DJ VFX Studio** implements a **3-Tier Hybrid Waveform Engine** in `FX 3 (DJ Deck Scrolling Waveforms)`:
1. **Tier A:** Pioneer Pro DJ Link (`ANLZ` wire packets / Rekordbox `master.db`).
2. **Tier B:** Denon DJ Engine OS (StageLinQ telemetry + `m.db` / `.rgb` stream).
3. **Tier C:** Universal Live 3-Band Rolling Spectral FFT Fallback (Line-in audio / vinyl / Traktor).

---

## 🏗️ The 3-Tier Hybrid Architecture

```
                               ┌────────────────────────────────┐
                               │   TRACK PLAYING ON DJ DECKS    │
                               └───────────────┬────────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
  ┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
  │  TIER A: PIONEER DJ     │     │  TIER B: DENON DJ       │     │  TIER C: UNIVERSAL      │
  │  Pro DJ Link / Rekordbox│     │  StageLinQ / Engine OS  │     │  Line-In Audio Fallback │
  ├─────────────────────────┤     ├─────────────────────────┤     ├─────────────────────────┤
  │ - Downloads 'ANLZ' PWV5 │     │ - Reads m.db / .rgb     │     │ - Real-time 64-band FFT │
  │   3-band bytes over LAN │     │   directly from USB/SSD │     │   frequency analysis    │
  │ - Rekordbox master.db   │     │ - Streams StageLinQ     │     │ - Rolling 512-slice     │
  │   analysis lookup       │     │   CurrentPosition (ms)  │     │   spectral buffer       │
  └────────────┬────────────┘     └────────────┬────────────┘     └────────────┬────────────┘
               │                               │                               │
               └───────────────────────────────┼───────────────────────────────┘
                                               ▼
                               ┌────────────────────────────────┐
                               │   NODE.JS COMPANION BRIDGE     │
                               │   server/waveform-service.js   │
                               │   server/stagelinq-bridge.js   │
                               └───────────────┬────────────────┘
                                               │ WebSocket
                                               ▼
                               ┌────────────────────────────────┐
                               │   FX 3: WEBGL WAVEFORM GPU     │
                               │   src/effects.js               │
                               │ - 3-Band RGB Colors            │
                               │ - Sub-MS Platter Sync          │
                               │ - Beat Grid & Phase Keeper     │
                               └────────────────────────────────┘
```

---

## 🎛️ How Reading Directly from the Decks Works

A common and critical question: **Does this read from the Mac, or directly from the hardware deck playing the track?**

The answer is: **It reads directly from the media source that the deck is playing.** Here is how Denon and Pioneer handle this on the hardware level:

---

### 1. Denon DJ (Prime 4, SC5000, SC6000, Prime 2, SC Live)

When you DJ on Denon standalone gear, your tracks are loaded from a **USB thumb drive, SD card, or internal SATA SSD** plugged into the deck.

* **On the USB Drive / SSD:**
  * Engine OS formats the storage with a directory called:
    ```
    /Volumes/<USB_NAME>/Engine Library/Database2/m.db
    /Volumes/<USB_NAME>/Engine Library/Database2/OverviewData/<UUID>/<TrackID>.rgb
    ```
* **How DJ VFX Studio Reads the Active Deck:**
  1. In [`server/waveform-service.js`](file:///Users/jarikuhanen/agy/dj-vfx-studio/server/waveform-service.js), the service automatically scans all mounted drives under `/Volumes`:
     ```javascript
     const vols = fs.readdirSync('/Volumes');
     for (const vol of vols) {
         const extEngineDb = path.join('/Volumes', vol, 'Engine Library', 'Database2', 'm.db');
         if (fs.existsSync(extEngineDb)) { ... }
     }
     ```
  2. If your USB drive is plugged into your Mac (or shared over network/Engine Remote), the bridge reads the exact `.rgb` / `m.db` waveform belonging to the loaded track.
  3. If your USB drive is plugged directly into the standalone deck, the deck broadcasts its active track metadata (`Track/Title`, `Track/Artist`, `Track/Id`) over **StageLinQ (UDP/TCP ports 50010/50011)**.
  4. The bridge takes that track title and looks up its pre-computed 3-band waveform in the library, decompressing the authentic **1024-slice RGB frequency map**:
     * **Red channel:** Sub-bass & kick drum energy.
     * **Green channel:** Vocal & melodic lead energy.
     * **Blue channel:** Hi-hat, ride & atmospheric air energy.

---

### 2. Pioneer DJ (CDJ-2000NXS2, CDJ-3000, XDJ-XZ, Rekordbox)

Pioneer handles hardware waveform transmission across Ethernet using **Pro DJ Link**:

* **Standalone Hardware Mode (CDJs / XDJs linked via Ethernet Hub):**
  * Pioneer CDJs have a built-in **NFS / Analysis Server** listening on UDP/TCP port `12523`.
  * Even if the USB stick is plugged into Player 1, Player 2 and Player 3 can play that same track because Player 1 streams the track audio and the **`ANLZ` (Analysis) file** across the Ethernet cable.
  * Our Pro DJ Link service joins this network as a virtual listener, intercepts the `ANLZ` stream, and extracts the **`PWV5` 3-Band RGB waveform chunk** byte-for-byte as it travels across the network wire.
* **Rekordbox Performance Mode (e.g. DDJ-1000 / FLX6 / Controller via USB):**
  * When using a controller with your laptop, Rekordbox stores its database locally:
    ```
    ~/Library/Pioneer/rekordbox/master.db
    ```
  * `waveform-service.js` automatically connects to `master.db` in read-only mode (`mode=ro`), identifies the currently active song ID, and extracts its exact Rekordbox waveform geometry.

---

### 3. Native Instruments Traktor Pro & Vinyl (Universal Fallback)

* Traktor does not have an open network wire protocol like Pro DJ Link or StageLinQ.
* When playing on Traktor, vinyl turntables, or unanalyzed tracks, **Tier C kicks in automatically**:
  * The line-in audio feed is passed through our 64-band Web Audio FFT engine.
  * A rolling 512-slice 3-band spectral buffer is dynamically updated every frame.
  * The visualizer continues scrolling with organic energy, ensuring you **never experience a blank screen or broken visual**.

---

## 🛠️ Implementation Details

### 1. `server/waveform-service.js`
* Built on Node 26’s native `node:sqlite` in read-only mode (`mode=ro`).
* Unpacks zlib-compressed (`0x78 0x9c`) Engine OS `.rgb` files and `PerformanceData.overviewWaveFormData` blobs.
* Normalizes any track into a standardized array of 512 triplets `[R, G, B, R, G, B...]`.

### 2. `server/stagelinq-bridge.js`
* Listens for `trackLoaded` and `nowPlaying` events from Denon StageLinQ, Pioneer Link, or Traktor.
* Queries `WaveformService` and broadcasts:
  ```json
  {
    "type": "deck_waveform",
    "deck": 1,
    "title": "Opus",
    "artist": "Eric Prydz",
    "source": "denon_engine",
    "samples": [ ...1536 integers... ]
  }
  ```

### 3. `src/effects.js` (FX 3: DJ Deck Scrolling Waveforms)
* Receives `setDeckWaveform(packet)`.
* Writes the 3-band RGB values into the WebGL `DataTexture` (`djAudioHistoryTex`).
* Scrolls the playhead (`uHeadPos`) in sub-millisecond sync with the hardware platter.

---

## 🚀 Future Roadmap: What Else Can We Do With On-The-Wire Data?

Tapping into real-time deck telemetry unlocks advanced stage production capabilities far beyond standard visualizers:

---

### 1. ⏱️ Predictive "Drop & Breakdown" Countdown Timers
* **The Concept:** Because the system has the entire track waveform loaded into memory *before* it plays, it can scan ahead along the timeline.
* **The Visual:** An on-screen countdown badge:
  * `🔥 DROP IN 16 BARS (00:08)`
  * `🌊 BREAKDOWN IN 32 BARS (00:16)`
* **Stage Benefit:** Gives the DJ and stream viewers a thrilling visual countdown to the climax of the track.

---

### 2. 💡 Intelligent Philips Hue / DMX "Show Director"
* **Currently:** Lights flash reactively *after* a kick drum hits the microphone.
* **With Wire Telemetry:** The lighting engine can **anticipate track structure**:
  * **Intros & Breakdown:** Deep, slow-breathing ambient room wash.
  * **Build-Up:** Accelerating strobe pulses and color temperature rising with the pitch riser.
  * **The Drop:** A momentary **0.5s total blackout** right before the drop, followed by explosive **white strobe bursts** on the first beat of the drop!

---

### 3. 🎯 Track Energy-Based Automatic Scene Switcher
* The system computes an **Energy Density Score (0–100%)** across the waveform.
* Automatically selects appropriate visual scenes based on the track's vibe:
  * *Low Energy / Ambient:* Galaxy, Liquid Mercury, Godrays.
  * *High Energy / Peak Time:* Dual-Bank Lasers, Saber Multi-Beams, Strobe Rings.

---

### 4. 🎚️ Live Camelot Wheel & Harmonic Mixing HUD
* StageLinQ and Rekordbox broadcast the exact musical key (`8A`, `11B`, `Cm`).
* The stage HUD highlights harmonic compatibility between Deck 1 and Deck 2:
  * 🟢 **Harmonic Match:** Green indicator when tracks share identical or adjacent keys.
  * ⚡ **Energy Boost (+1 / +2):** Alerts when performing an energy-raising harmonic jump.

---

### 5. 💥 Hot Cue & Loop Trigger Fireworks
* When the DJ presses a physical Hot Cue pad or activates an 8-beat loop, StageLinQ broadcasts that event over the network.
* The visualizer can instantly trigger a localized screen shockwave or laser fan mapped directly to that deck.

---

### 6. 📝 Automatic Timestamped Tracklist Exporter
* Automatically monitors crossfader transitions and logs playhead timestamps.
* At the end of a live stream, generates a ready-to-paste tracklist for **Mixcloud, SoundCloud, and 1001Tracklists**:
  ```text
  00:00 - Eric Prydz - Opus
  04:15 - Bicep - Glue
  08:30 - CamelPhat - Breathe
  ```
