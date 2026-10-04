/**
 * High-Performance Calibrated Audio Engine & Transient Bass Beat Detector for DJ-VFX
 * Supports Live Deck Audio Interfaces, USB Mixers, Line-In, Microphones & Virtual Cables
 */
export async function setupAudio(onDeviceListChange) {
    let audioCtx = null;
    let analyser = null;
    let currentStream = null;
    let currentSource = null;
    let currentDeviceId = 'default';
    let currentDeviceLabel = 'Default Audio Input';

    let isConnected = false;

    // Calibrated baseline parameters for smooth, impactful response
    let gainMultiplier = 1.0;
    let bassSensitivity = 1.0;
    let beatThreshold = 1.30;
    let decayRate = 0.91; // Smooth gradual decay

    function initAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.86;

            // Persistent background keep-alive node to prevent OS/Browser background suspension
            try {
                const keepAliveOsc = audioCtx.createOscillator();
                const keepAliveGain = audioCtx.createGain();
                keepAliveGain.gain.value = 0.000001; // virtually silent
                keepAliveOsc.connect(keepAliveGain);
                keepAliveGain.connect(audioCtx.destination);
                keepAliveOsc.start();
            } catch (e) {
                // Ignore if background oscillator restricted
            }

            // Unconditional auto-resume listeners on focus, blur, visibility change, statechange & click
            const autoResume = () => {
                if (audioCtx && (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted')) {
                    audioCtx.resume().catch(() => {});
                }
            };

            audioCtx.onstatechange = () => {
                if (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted') {
                    audioCtx.resume().catch(() => {});
                }
            };

            window.addEventListener('focus', autoResume);
            window.addEventListener('blur', autoResume);
            window.addEventListener('pageshow', autoResume);
            document.addEventListener('visibilitychange', autoResume);
            window.addEventListener('mouseenter', autoResume);
            window.addEventListener('click', autoResume);

            // Active keep-alive watchdog timer
            setInterval(autoResume, 1500);
        }
    }

    initAudioContext();

    async function getAudioDevices() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                return [];
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(d => d.kind === 'audioinput');
        } catch (err) {
            console.warn('[Audio Engine] Could not enumerate devices:', err);
            return [];
        }
    }

    let isConnecting = false;

    async function connectDevice(deviceId = 'default') {
        if (isConnecting) return { success: false, error: 'Connection in progress' };
        isConnecting = true;
        initAudioContext();

        // Disconnect existing stream if any
        if (currentStream) {
            try {
                currentStream.getTracks().forEach(track => {
                    track.onended = null;
                    track.onmute = null;
                    track.stop();
                });
            } catch (e) {}
            currentStream = null;
        }
        if (currentSource) {
            try { currentSource.disconnect(); } catch (e) {}
            currentSource = null;
        }

        let stream = null;
        let lastError = null;

        // Constraint Attempt 1: Exact Device ID
        if (deviceId && deviceId !== 'default') {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        deviceId: { exact: deviceId },
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        channelCount: 2
                    },
                    video: false
                });
            } catch (err1) {
                console.warn(`[Audio Engine] Exact constraint failed for [${deviceId}], trying ideal:`, err1.message);
                lastError = err1;
            }
        }

        // Constraint Attempt 2: Ideal Device ID
        if (!stream && deviceId && deviceId !== 'default') {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        deviceId: { ideal: deviceId },
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    },
                    video: false
                });
            } catch (err2) {
                console.warn(`[Audio Engine] Ideal constraint failed for [${deviceId}], trying default:`, err2.message);
                lastError = err2;
            }
        }

        // Constraint Attempt 3: General System Default Input
        if (!stream) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    },
                    video: false
                });
            } catch (err3) {
                lastError = err3;
            }
        }

        isConnecting = false;

        if (!stream) {
            console.warn(`[Audio Engine] Audio connect failed for [${deviceId}]:`, lastError);
            isConnected = false;
            return { success: false, error: lastError ? lastError.message : 'Unknown audio error' };
        }

        try {
            currentStream = stream;
            currentDeviceId = deviceId;

            const audioTrack = stream.getAudioTracks()[0];
            currentDeviceLabel = audioTrack?.label || (deviceId === 'default' ? 'Default Audio Input' : 'Deck Audio Line-In');

            if (audioTrack) {
                audioTrack.onended = () => {
                    console.warn('[Audio Engine] Track ended, auto-reconnecting...');
                    setTimeout(() => connectDevice(currentDeviceId), 600);
                };
                audioTrack.onmute = () => {
                    console.warn('[Audio Engine] Track muted by OS, attempting resume...');
                    setTimeout(() => {
                        if (audioCtx && (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted')) {
                            audioCtx.resume();
                        }
                    }, 300);
                };
            }

            currentSource = audioCtx.createMediaStreamSource(stream);
            currentSource.connect(analyser);

            if (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted') {
                await audioCtx.resume();
            }

            isConnected = true;
            console.log(`[Audio Engine] 🎧 Connected live audio input: "${currentDeviceLabel}" (id: ${currentDeviceId})`);

            if (onDeviceListChange) {
                const devs = await getAudioDevices();
                onDeviceListChange(devs, currentDeviceId);
            }

            return { success: true, label: currentDeviceLabel };
        } catch (err) {
            console.warn(`[Audio Engine] Setup source node failed:`, err);
            isConnected = false;
            return { success: false, error: err.message };
        }
    }

    async function connectDisplayAudio() {
        if (isConnecting) return { success: false, error: 'Connection in progress' };
        isConnecting = true;
        initAudioContext();

        // Disconnect existing stream if any
        if (currentStream) {
            try {
                currentStream.getTracks().forEach(track => {
                    track.onended = null;
                    track.onmute = null;
                    track.stop();
                });
            } catch (e) {}
            currentStream = null;
        }
        if (currentSource) {
            try { currentSource.disconnect(); } catch (e) {}
            currentSource = null;
        }

        let stream = null;
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 2
                },
                video: true
            });
        } catch (err) {
            isConnecting = false;
            console.warn('[Audio Engine] System/Tab audio capture cancelled or failed:', err);
            return { success: false, error: err.message };
        }

        isConnecting = false;

        const audioTracks = stream.getAudioTracks();
        if (!audioTracks || audioTracks.length === 0) {
            stream.getTracks().forEach(t => t.stop());
            return {
                success: false,
                error: 'No audio track received. When sharing screen or tab, ensure "Share Audio" / "Also share tab audio" is enabled.'
            };
        }

        // Stop video tracks immediately so zero screen recording occurs
        stream.getVideoTracks().forEach(t => t.stop());

        try {
            currentStream = stream;
            currentDeviceId = 'system-tab-audio';
            const audioTrack = audioTracks[0];
            currentDeviceLabel = audioTrack.label || '🖥️ System / Tab Audio Stream';

            audioTrack.onended = () => {
                console.warn('[Audio Engine] System/Tab stream ended. Switching back to default...');
                connectDevice('default');
            };

            currentSource = audioCtx.createMediaStreamSource(stream);
            currentSource.connect(analyser);

            if (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted') {
                await audioCtx.resume();
            }

            isConnected = true;
            console.log(`[Audio Engine] 🖥️ Connected live System/Tab audio: "${currentDeviceLabel}"`);

            if (onDeviceListChange) {
                const devs = await getAudioDevices();
                onDeviceListChange(devs, currentDeviceId);
            }

            return { success: true, label: currentDeviceLabel };
        } catch (err) {
            console.warn('[Audio Engine] Setup system audio source failed:', err);
            isConnected = false;
            return { success: false, error: err.message };
        }
    }

    // Auto-attempt initial connection
    await connectDevice('default');

    // Listen for device plug/unplug events (e.g. DJ deck USB connected)
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', async () => {
            const devs = await getAudioDevices();
            if (onDeviceListChange) onDeviceListChange(devs, currentDeviceId);
            // If current device was disconnected or reconnecting, ensure stream is active
            if (currentDeviceId && currentDeviceId !== 'default' && currentDeviceId !== 'system-tab-audio') {
                const stillExists = devs.some(d => d.deviceId === currentDeviceId);
                if (stillExists && (!isConnected || !currentStream || currentStream.getAudioTracks().some(t => t.readyState === 'ended'))) {
                    console.log(`[Audio Engine] Auto-reconnecting active device [${currentDeviceId}]...`);
                    connectDevice(currentDeviceId);
                }
            }
        });
    }

    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 256);
    const timeDomainBuffer = new Float32Array(analyser ? analyser.fftSize : 512);

    // Dynamic Transient Detection State
    const historyLength = 24;
    const bassEnergyHistory = new Float32Array(historyLength);
    let historyIndex = 0;
    let transientImpulse = 0.0;
    let smoothedBass = 0.0;
    let smoothedMid = 0.0;
    let smoothedTreble = 0.0;
    let lastHitTime = 0;

    // Line-In VU & Loudness Metering State
    let peakHoldDb = -60.0;
    let peakHoldTime = 0;
    let smoothedRms = 0.0;

    // Synthetic generator state for standby mode
    let synthBassLevel = 0.0;
    let synthImpulseLevel = 0.0;
    let lastSynthBeat = 0;

    return {
        isConnected: () => isConnected,
        getCurrentDevice: () => ({ id: currentDeviceId, label: currentDeviceLabel }),
        getDevices: getAudioDevices,
        switchDevice: connectDevice,
        captureSystemAudio: connectDisplayAudio,
        resume: async () => {
            if (audioCtx && audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
        },

        // Calibration Control Setters
        setGain: (val) => { gainMultiplier = Math.max(0.1, Math.min(4.0, Number(val))); },
        setBassSensitivity: (val) => { bassSensitivity = Math.max(0.1, Math.min(4.0, Number(val))); },
        setBeatThreshold: (val) => { beatThreshold = Math.max(1.05, Math.min(2.5, Number(val))); },

        getAudioData: () => {
            const now = performance.now();

            if (isConnected && audioCtx && (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted')) {
                audioCtx.resume().catch(() => {});
            }

            if (isConnected && analyser) {
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

                // 4. Dynamic Transient / Kick Drum Onset Detection (Adaptive Dynamic Energy Floor)
                let avgEnergy = 0;
                for (let i = 0; i < historyLength; i++) {
                    avgEnergy += bassEnergyHistory[i];
                }
                avgEnergy /= historyLength;

                bassEnergyHistory[historyIndex] = rawBass;
                historyIndex = (historyIndex + 1) % historyLength;

                let isOnset = false;
                const minTimeBetweenHitsMs = 180; // Natural minimum spacing between bass hits
                const dynamicFloor = Math.max(0.04, avgEnergy * 0.35);
                if (rawBass > dynamicFloor && rawBass > (avgEnergy * beatThreshold) && (now - lastHitTime) > minTimeBetweenHitsMs) {
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

                // 5. High-Precision Time-Domain Line-In VU & Loudness Analysis (Peak dBFS & LUFS)
                let instantPeak = 0.0;
                let sumSquares = 0.0;
                try {
                    analyser.getFloatTimeDomainData(timeDomainBuffer);
                    const bufLen = timeDomainBuffer.length;
                    for (let i = 0; i < bufLen; i++) {
                        const sample = Math.abs(timeDomainBuffer[i]);
                        if (sample > instantPeak) instantPeak = sample;
                        sumSquares += sample * sample;
                    }
                } catch (e) {
                    instantPeak = Math.max(rawBass, rawMid, rawTreble);
                    sumSquares = instantPeak * instantPeak * 512;
                }

                const rms = Math.sqrt(sumSquares / (timeDomainBuffer.length || 512));
                smoothedRms = smoothedRms * 0.85 + rms * 0.15;

                // Scale with user gain multiplier
                const scaledPeak = Math.min(2.0, instantPeak * gainMultiplier);
                const scaledRms = Math.min(2.0, smoothedRms * gainMultiplier);

                // Calculate dBFS (0 dBFS digital ceiling)
                const peakDb = scaledPeak > 0.0001 ? Math.max(-60, 20 * Math.log10(scaledPeak)) : -60;
                // ITU-R BS.1770 / EBU R128 K-weighting approximation (-0.691 offset from RMS)
                const lufs = scaledRms > 0.0001 ? Math.max(-60, 10 * Math.log10(scaledRms * scaledRms) - 0.691) : -60;

                // Peak Hold needle logic
                if (peakDb > peakHoldDb) {
                    peakHoldDb = peakDb;
                    peakHoldTime = now;
                } else if (now - peakHoldTime > 1200) {
                    // Smooth decay after 1.2s
                    peakHoldDb = Math.max(peakDb, peakHoldDb - 0.4);
                }

                const isClipping = scaledPeak >= 0.99 || peakDb >= -0.05;
                const headroomDb = Math.max(0, -peakDb);

                // Logarithmic VU meter percentage for -48dB to 0dB range
                const vuPercent = Math.max(0, Math.min(100, ((peakDb + 48) / 48) * 100));
                const vuRmsPercent = Math.max(0, Math.min(100, ((lufs + 48) / 48) * 100));
                const vuPeakHoldPercent = Math.max(0, Math.min(100, ((peakHoldDb + 48) / 48) * 100));

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
                    isOnset,

                    // VU Meter Telemetry
                    peakDb: Number(peakDb.toFixed(1)),
                    peakHoldDb: Number(peakHoldDb.toFixed(1)),
                    lufs: Number(lufs.toFixed(1)),
                    headroomDb: Number(headroomDb.toFixed(1)),
                    vuPercent: Number(vuPercent.toFixed(1)),
                    vuRmsPercent: Number(vuRmsPercent.toFixed(1)),
                    vuPeakHoldPercent: Number(vuPeakHoldPercent.toFixed(1)),
                    isClipping
                };
            }

            // Standby synthetic mode: Generate animated frequency bins & beat pulses
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
            const synthMid = Math.max(0, Math.sin(t * 1.5) * 0.4 + 0.15);
            const synthTreble = Math.max(0, Math.cos(t * 2.2) * 0.25 + 0.12);

            const simPeakDb = -11.4 + Math.sin(t * 3.0) * 2.5;
            const simLufs = -14.8 + Math.sin(t * 2.0) * 1.2;
            const simVuPercent = Math.max(0, Math.min(100, ((simPeakDb + 48) / 48) * 100));

            // Generate active dynamic frequency bins for 3D LED Wall & Circular Mandala
            const synthDataArray = new Uint8Array(256);
            for (let i = 0; i < 64; i++) {
                const freqNorm = i / 64;
                const bassPart = Math.max(0, (1.0 - freqNorm * 1.4)) * synthBassLevel * 240;
                const midPart = Math.sin(freqNorm * Math.PI) * synthMid * 200;
                const treblePart = freqNorm * synthTreble * 170;
                const ripple = Math.sin(t * 7 + i * 0.35) * 22;
                synthDataArray[i] = Math.max(0, Math.min(255, Math.floor(bassPart + midPart + treblePart + ripple)));
            }

            return {
                dataArray: synthDataArray,
                bass: synthBassLevel,
                smoothedBass: synthBassLevel,
                bassImpact: Math.min(1.0, synthBassLevel * 0.75 + synthImpulseLevel * 0.25),
                transientImpulse: synthImpulseLevel,
                mid: synthMid,
                smoothedMid: synthMid,
                treble: synthTreble,
                smoothedTreble: synthTreble,
                overall: synthBassLevel * 0.5 + synthMid * 0.3 + synthTreble * 0.2,
                isOnset: synthImpulseLevel > 0.8,

                // Simulated VU Telemetry
                peakDb: Number(simPeakDb.toFixed(1)),
                peakHoldDb: -8.5,
                lufs: Number(simLufs.toFixed(1)),
                headroomDb: Number(Math.max(0, -simPeakDb).toFixed(1)),
                vuPercent: Number(simVuPercent.toFixed(1)),
                vuRmsPercent: Number((simVuPercent * 0.85).toFixed(1)),
                vuPeakHoldPercent: Number((((-8.5 + 48) / 48) * 100).toFixed(1)),
                isClipping: false
            };
        }
    };
}
