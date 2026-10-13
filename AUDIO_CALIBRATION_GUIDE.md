# 🎙️ DJ Streaming Audio Calibration Guide
> **Hardware Decks ➔ Audio Interface ➔ BUTT (Web Radio) & OBS (Live Video Stream)**  
> *A definitive guide to gain staging, VU meter alignment, and broadcast loudness calibration without clipping or volume loss.*

---

## 📐 Signal Chain Architecture

When streaming audio simultaneously to **Web Radio (Icecast / Shoutcast via BUTT)** and **Video Streaming (Twitch / Mixcloud / YouTube via OBS)**, audio flows in two stages: **Upstream (Hardware)** and **Downstream (Software)**.

```
┌────────────────────────────────────────────────────────┐
│  1. DJ DECKS / HARDWARE MIXER (Pioneer / Denon)        │
│  Channel Gain ➔ Master VU: ~-10 dB to -7 dB (Green)    │
│  Booth Out Knob (Analog Level Control)                 │
└──────────────────────────┬─────────────────────────────┘
                           │ (Analog Line-In Cable)
                           ▼
┌────────────────────────────────────────────────────────┐
│  2. AUDIO INTERFACE ➔ Mac USB Audio Input              │
│  (Unity Gain / Line Level Input)                       │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌───────────────────────────────┐ ┌──────────────────────────────┐
│ 3. BUTT 1.46.0 (Web Radio)    │ │ 4. OBS Studio (Video Stream) │
│ - Destination: Icecast/MP3    │ │ - Destination: Twitch/AAC    │
│ - Target: -3.0 dBFS (Yellow)  │ │ - Target: -6 to -3 dB (Yellow│
│ - Software Gain: Horizontal   │ │ - Software Gain: Blue Fader  │
│   Slider below VU meter       │ │   under Audio Mixer          │
└───────────────────────────────┘ └──────────────────────────────┘
```

---

## ⚠️ The Core Problem: The "Booth Out" Trap

* **The Dilemma:** If OBS is clipping in the red (`0 dB`), the instinctive reaction is to turn down the **Booth Out knob** on the DJ mixer.
* **The Side Effect:** Because Booth Out is **upstream (hardware)**, turning it down lowers the signal entering the Mac for **both apps**. This stops OBS from clipping, but starves BUTT, causing web radio listeners to hear a whisper-quiet, low-volume stream (`-15 dB` to `-18 dB`).
* **The Solution:** **Decouple the two apps!** Set the hardware Booth Out so BUTT receives its ideal broadcast level, then use **OBS's internal digital fader** to pull OBS out of the red.

---

## 🎚️ The 3 Meter Standards Explained

### 1. The Decks (Mixer Hardware)
* **Meter Type:** Analog VU / Peak LED ladder.
* **Current Reading:** Channel 1 peaks around `0 dB`; Master meters lit up to **`-10 dB` / `-7 dB`** (solid green, no amber or red `PEAK` LEDs).
* **Verdict:** **Ideal.** Operating well within the mixer's analog headroom. Zero preamp saturation or DAC clipping at the source.

---

### 2. BUTT 1.46.0 (Web Radio / Icecast)
* **Meter Type:** Digital True-Peak Meter (`-48 dB` to `0 dBFS`).
* **Why the `-3.0 dBFS` Limit Exists:**
  * BUTT encodes live audio into lossy audio formats like **MP3 (128–320 kbps)** or **AAC**.
  * When lossy encoders compress transient waveforms (such as EDM/house kicks), the reconstructed analog waveform can overshoot the digital ceiling by **+1.5 dB to +2.5 dB**. This phenomenon is called **Inter-Sample Peak (ISP) clipping**.
  * Keeping peaks at **`-3.0 dBFS` (+3.0 dB headroom)** guarantees that MP3 web radio streams sound crisp and punchy without distortion.
* **Target:** Peaks in the high yellow zone between **`-4.0 dB` and `-3.0 dBFS`**.

---

### 3. OBS Studio (`Deck input to Mac`)
* **Meter Type:** Broadcast Multi-Band Digital Peak Meter.
  * 🟩 **Green Zone (`-60 dB` to `-20 dB`):** Background / low audio.
  * 🟨 **Yellow Zone (`-20 dB` to `-9 dB`):** Safe, punchy broadcast sweet spot.
  * 🟥 **Red Zone (`-9 dB` to `0 dB`):** Danger zone.
* **Why Solid Red is Critical:**
  * When the OBS meter is solid red and touches the top line (`0 dBFS`), the digital audio stream is **flat-topping (hard digital clipping)**. Every kick drum or heavy bass drop creates harsh digital crackle and distortion on Twitch/Mixcloud.
* **Target:** Peaks sitting comfortably in the high yellow band between **`-6.0 dB` and `-3.0 dB`**, never exceeding **`-1.0 dBFS`** (the absolute digital ceiling).

---

## 🛠️ Step-by-Step Calibration Workflow

Follow these steps in order to lock in balanced audio across all destinations:

### Step 1: Keep Mixer Master / Channel Gains Locked
1. Play a loud, mastered track with a heavy kick drum.
2. Confirm channel trim is set so channel meter sits around `0 dB`.
3. Confirm Master VU shows healthy green LEDs (`-10 dB` to `-7 dB`). **Do not touch these again.**

### Step 2: Calibrate Hardware Booth Out for BUTT
1. Open the **BUTT** window.
2. Ensure the horizontal slider at the bottom of BUTT is centred at `0 dB`.
3. Slowly turn up the physical **Booth Out knob** on your DJ mixer until BUTT’s meter peaks kiss **`-3.0 dB`** (yellow bar firmly reaching between `-4 dB` and `-3 dB`).
4. *Result:* Your web radio stream is now locked at official broadcast standard loudness with zero inter-sample distortion.

### Step 3: Tame OBS Independently in Software
1. Look at OBS Studio's **Audio Mixer** panel (`Deck input to Mac`). With Booth Out turned up, OBS will now be heavily in the red.
2. **Check for Hidden Filters:**
   * Select `Deck input to Mac` in OBS and click **Filters** (or right-click → *Filters*).
   * Verify there are no active **Gain**, **Compressor** (with makeup gain), or **Limiter** filters artificially boosting the audio. Remove or disable any unnecessary gain.
3. **Pull Down the OBS Blue Channel Fader:**
   * Grab the blue vertical fader under `Deck input to Mac` (currently at `0.0 dB`).
   * Slide it down to approximately **`-7.0 dB` to `-9.0 dB`**.
   * Observe the meter: the loudest kick drums should now peak in the **high yellow zone (`-6 dB` to `-3 dB`)**, never touching the red `0 dB` line.
4. *Result:* OBS is now clean and distortion-free, while BUTT remains loud and unaffected.

### Step 4: Verify in DJ VFX Studio HUD
1. Launch **DJ VFX Studio** (`npm run dev` or open the browser).
2. Look at the **🎚️ LINE-IN LEVEL / VU METER** section on the left HUD panel:
   * **PEAK dBFS:** Should read between **`-4.0 dB` and `-2.5 dBFS`**.
   * **HEADROOM:** Should display **`+3.0 dB` to `+4.0 dB`** in emerald green.
   * **🎯 TARGETS Indicator:** 
     * The white peak needle should line up near the **amber marker (`-3 dBFS / BUTT Limit`)**.
     * It should stay safely below the **red line (`-1 dBFS / OBS Stream Ceiling`)**.
   * **⚠️ CLIP 0dB Badge:** Must remain hidden (no clipping).

---

## 📋 Quick Reference Calibration Matrix

| Stage | Control Used | Meter Target | Purpose |
| :--- | :--- | :--- | :--- |
| **1. Decks (Mixer)** | Channel Trim / Master Knob | ~`-10 dB` to `-7 dB` Green | Clean analog dynamic range, zero preamp distortion |
| **2. Booth Out (Hardware)** | Booth Level Knob | Sets baseline for Mac | Feeds clean, full-scale signal into Mac audio interface |
| **3. BUTT (Web Radio)** | BUTT Gain Slider (bottom) | **`-3.0 dBFS` (Yellow)** | Punchy web radio loudness; prevents MP3 inter-sample clipping |
| **4. OBS (Video Stream)** | OBS Blue Channel Fader | **`-6.0 dB` to `-3.0 dB` (Yellow)** | Broadcast standard for Twitch/Mixcloud; prevents 0 dB digital clipping |
| **5. DJ VFX Studio HUD** | HUD VU Targets toggle | **`+3.0 dB` Headroom (Green)** | Real-time visual telemetry verifying both broadcast boundaries |

---

## 🔍 Common Gotchas & Troubleshooting

1. **Mono Down-mixing in OBS:**
   * In OBS → *Advanced Audio Properties* (cogwheel next to Audio Mixer), check if **Downmix to Mono** is checked on `Deck input to Mac`.
   * Summing Left + Right channels without attenuation adds **+3 dB to +6 dB** of artificial gain, pushing stereo tracks into clipping. Leave this unchecked for DJ music sets.
2. **macOS System Input Volume:**
   * Open **System Settings ➔ Sound ➔ Input** and select your audio interface.
   * Ensure the slider is set to **unity (around 75%–80% or 0 dB nominal)** rather than pushed to 100% max, which can introduce digital input boost at the CoreAudio level.
3. **Limiter Safety Net in OBS:**
   * In OBS → `Deck input to Mac` → *Filters* → Add a **Limiter**.
   * Set **Threshold** to **`-1.5 dB`** and **Release** to **`60 ms`**.
   * This acts as an invisible emergency ceiling that catches rogue loud drops without altering your normal dynamic mix.
