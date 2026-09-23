/**
 * High-Performance Calibrated Audio Engine & Transient Bass Beat Detector for DJ-VFX
 * Smooth, musical physics with inertia and gentle damping to eliminate twitchy jitter
 */
export async function setupAudio() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.86; // Higher smoothing for calm, stable FFT

    let isConnected = false;

    // Calibrated baseline parameters for smooth, impactful response
    let gainMultiplier = 1.0;
    let bassSensitivity = 1.0;
    let beatThreshold = 1.30;
    let decayRate = 0.91; // Smooth gradual decay

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            },
            video: false
        });
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        isConnected = true;
        console.log("[Audio Engine] High-performance microphone stream connected.");
    } catch (err) {
        console.warn("[Audio Engine] Mic access denied/unavailable. Running synthetic audio mode.", err);
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    // Dynamic Transient Detection State
    const historyLength = 24;
    const bassEnergyHistory = new Float32Array(historyLength);
    let historyIndex = 0;
    let transientImpulse = 0.0;
    let smoothedBass = 0.0;
    let smoothedMid = 0.0;
    let smoothedTreble = 0.0;
    let lastHitTime = 0;

    // Synthetic generator state for calm, rhythmic club thuds
    let synthBassLevel = 0.0;
    let synthImpulseLevel = 0.0;
    let lastSynthBeat = 0;

    return {
        isConnected: () => isConnected,

        // Calibration Control Setters
        setGain: (val) => { gainMultiplier = Math.max(0.1, Math.min(4.0, Number(val))); },
        setBassSensitivity: (val) => { bassSensitivity = Math.max(0.1, Math.min(4.0, Number(val))); },
        setBeatThreshold: (val) => { beatThreshold = Math.max(1.05, Math.min(2.5, Number(val))); },

        getAudioData: () => {
            const now = performance.now();

            if (isConnected) {
                analyser.getByteFrequencyData(dataArray);

                // 1. Kick & Bass Punch Frequency Band (bins 1 to 8: ~40Hz - 350Hz)
                let bassSum = 0;
                const bassBins = 8;
                for (let i = 1; i <= bassBins; i++) {
                    bassSum += dataArray[i];
                }
                const rawBass = Math.min(1.0, (bassSum / bassBins / 255) * gainMultiplier * bassSensitivity);

                // 2. Mid Range Band (bins 9 to 40: ~390Hz - 1.8kHz)
                let midSum = 0;
                const midBins = 32;
                for (let i = 9; i <= 40; i++) {
                    midSum += dataArray[i];
                }
                const rawMid = Math.min(1.0, (midSum / midBins / 255) * gainMultiplier);

                // 3. Treble Range Band (bins 41 to 100: ~1.8kHz - 4.5kHz)
                let trebleSum = 0;
                const trebleBins = 60;
                for (let i = 41; i <= 100; i++) {
                    trebleSum += dataArray[i];
                }
                const rawTreble = Math.min(1.0, (trebleSum / trebleBins / 255) * gainMultiplier);

                // 4. Dynamic Transient / Kick Drum Onset Detection
                let avgEnergy = 0;
                for (let i = 0; i < historyLength; i++) {
                    avgEnergy += bassEnergyHistory[i];
                }
                avgEnergy /= historyLength;

                bassEnergyHistory[historyIndex] = rawBass;
                historyIndex = (historyIndex + 1) % historyLength;

                let isOnset = false;
                const minTimeBetweenHitsMs = 220; // Natural minimum spacing between bass hits
                if (rawBass > 0.20 && rawBass > (avgEnergy * beatThreshold) && (now - lastHitTime) > minTimeBetweenHitsMs) {
                    isOnset = true;
                    transientImpulse = 1.0;
                    lastHitTime = now;
                } else {
                    transientImpulse *= decayRate;
                }

                // Smooth frequency channels with inertia to eliminate nervous jitter
                smoothedBass = smoothedBass * 0.82 + rawBass * 0.18;
                smoothedMid = smoothedMid * 0.84 + rawMid * 0.16;
                smoothedTreble = smoothedTreble * 0.86 + rawTreble * 0.14;

                const combinedBassImpact = Math.min(1.0, smoothedBass * 0.7 + transientImpulse * 0.35);

                return {
                    dataArray,
                    bass: rawBass,
                    smoothedBass,
                    bassImpact: combinedBassImpact,
                    transientImpulse,
                    mid: rawMid,
                    smoothedMid,
                    treble: rawTreble,
                    smoothedTreble,
                    overall: (smoothedBass * 0.5 + smoothedMid * 0.3 + smoothedTreble * 0.2),
                    isOnset
                };
            }

            // Calm, Rhythmic Synthetic Mode (Smooth 126 BPM 4/4 Kick Thud)
            const beatIntervalMs = (60.0 / 126.0) * 1000;
            if (now - lastSynthBeat > beatIntervalMs) {
                synthBassLevel = 0.85;
                synthImpulseLevel = 0.9;
                lastSynthBeat = now;
            } else {
                synthBassLevel *= 0.92;
                synthImpulseLevel *= 0.88;
            }

            const t = now * 0.001;
            const synthMid = Math.max(0, Math.sin(t * 1.5) * 0.4 + 0.1);
            const synthTreble = Math.max(0, Math.cos(t * 2.2) * 0.25 + 0.1);

            return {
                dataArray: new Uint8Array(256),
                bass: synthBassLevel,
                smoothedBass: synthBassLevel,
                bassImpact: Math.min(1.0, synthBassLevel * 0.75 + synthImpulseLevel * 0.25),
                transientImpulse: synthImpulseLevel,
                mid: synthMid,
                smoothedMid: synthMid,
                treble: synthTreble,
                smoothedTreble: synthTreble,
                overall: synthBassLevel * 0.5 + synthMid * 0.3 + synthTreble * 0.2,
                isOnset: synthImpulseLevel > 0.8
            };
        }
    };
}
