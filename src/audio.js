/**
 * High-Performance Audio Engine & Transient Bass Beat Detector for DJ-VFX
 * Balanced gain scaling so beat sensitivity drives motion & physics without blinding brightness
 */
export async function setupAudio() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;

    let isConnected = false;

    // Configurable parameters with calibrated baselines
    let gainMultiplier = 1.2;        // General input boost (0.2 to 3.0)
    let bassSensitivity = 1.2;       // Bass punch multiplier (0.2 to 3.0)
    let beatThreshold = 1.25;        // Ratio above rolling average required for transient hit
    let decayRate = 0.85;            // Transient impulse decay speed

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
    const historyLength = 20;
    const bassEnergyHistory = new Float32Array(historyLength);
    let historyIndex = 0;
    let transientImpulse = 0.0;
    let smoothedBass = 0.0;
    let smoothedMid = 0.0;
    let smoothedTreble = 0.0;
    let lastHitTime = 0;

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

                // 1. Kick & Bass Punch Frequency Band (bins 1 to 10: ~40Hz - 430Hz)
                let bassSum = 0;
                const bassBins = 10;
                for (let i = 1; i <= bassBins; i++) {
                    bassSum += dataArray[i];
                }
                const rawBass = Math.min(1.0, (bassSum / bassBins / 255) * gainMultiplier * bassSensitivity);

                // 2. Mid Range Band (bins 11 to 45: ~450Hz - 2kHz)
                let midSum = 0;
                const midBins = 35;
                for (let i = 11; i <= 45; i++) {
                    midSum += dataArray[i];
                }
                const rawMid = Math.min(1.0, (midSum / midBins / 255) * gainMultiplier);

                // 3. Treble Range Band (bins 46 to 120: ~2kHz - 5kHz+)
                let trebleSum = 0;
                const trebleBins = 75;
                for (let i = 46; i <= 120; i++) {
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
                const minTimeBetweenHitsMs = 150; // Max ~400 BPM detection
                if (rawBass > 0.18 && rawBass > (avgEnergy * beatThreshold) && (now - lastHitTime) > minTimeBetweenHitsMs) {
                    isOnset = true;
                    transientImpulse = 1.0;
                    lastHitTime = now;
                } else {
                    transientImpulse *= decayRate;
                }

                // Smooth frequency channels
                smoothedBass = Math.min(1.0, smoothedBass * 0.7 + rawBass * 0.3);
                smoothedMid = Math.min(1.0, smoothedMid * 0.75 + rawMid * 0.25);
                smoothedTreble = Math.min(1.0, smoothedTreble * 0.8 + rawTreble * 0.2);

                const combinedBassImpact = Math.min(1.0, smoothedBass * 0.75 + transientImpulse * 0.4);

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
                    overall: (rawBass * 0.5 + rawMid * 0.3 + rawTreble * 0.2),
                    isOnset
                };
            }

            // Synthetic Fallback Generator
            const t = now * 0.003;
            const synthCycle = Math.sin(t * 3.0);
            const synthBass = Math.max(0, synthCycle > 0.6 ? 0.9 : synthCycle * 0.3);
            const synthImpulse = synthCycle > 0.9 ? 1.0 : 0.0;
            const synthMid = Math.max(0, Math.sin(t * 4.5 + 1.2)) * 0.5;
            const synthTreble = Math.max(0, Math.cos(t * 6.0)) * 0.3;

            return {
                dataArray: new Uint8Array(256),
                bass: synthBass,
                smoothedBass: synthBass,
                bassImpact: Math.min(1.0, synthBass + synthImpulse * 0.3),
                transientImpulse: synthImpulse,
                mid: synthMid,
                smoothedMid: synthMid,
                treble: synthTreble,
                smoothedTreble: synthTreble,
                overall: synthBass * 0.5 + synthMid * 0.5,
                isOnset: synthImpulse > 0.5
            };
        }
    };
}
