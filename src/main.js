import { setupAudio } from './audio.js';
import { createVFXScene } from './effects.js';
import { setupStageLinqClient } from './stagelinq.js';

async function init() {
    const container = document.getElementById('canvas-container');
    const hud = document.getElementById('hud');
    const fxBankPanel = document.getElementById('fx-bank-panel');
    const trackBanner = document.getElementById('track-banner');
    const hudStatus = document.getElementById('hud-status');
    const audioStatus = document.getElementById('audio-status');
    const bpmVal = document.getElementById('bpm-val');
    const stagelinqStatus = document.getElementById('stagelinq-status');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');

    const eqBass = document.getElementById('eq-bass');
    const eqMid = document.getElementById('eq-mid');
    const eqTreble = document.getElementById('eq-treble');

    // Calibration Slider Elements
    const sliderGain = document.getElementById('slider-gain');
    const sliderSens = document.getElementById('slider-sens');
    const sliderBloom = document.getElementById('slider-bloom');
    const gainVal = document.getElementById('gain-val');
    const sensVal = document.getElementById('sens-val');
    const bloomVal = document.getElementById('bloom-val');

    // 1. Initialize Three.js VFX Scene with FX Bank & Shaders
    const vfx = createVFXScene(container);

    let audioProcessor = null;

    // 2. Audio Activation on User Interaction
    async function enableAudio() {
        if (!audioProcessor) {
            audioProcessor = await setupAudio();
            if (audioProcessor.isConnected()) {
                audioStatus.innerHTML = `<span style="color:#00ffcc">● Live Mic Active</span>`;
                hudStatus.textContent = 'LIVE REACTIVE';
                hudStatus.style.borderColor = '#00ffcc';
                hudStatus.style.color = '#00ffcc';
            } else {
                audioStatus.innerHTML = `<span style="color:#ffaa00">● Simulated Audio</span>`;
                hudStatus.textContent = 'SIM ACTIVE';
            }

            // Apply initial slider values
            audioProcessor.setGain(sliderGain.value);
            audioProcessor.setBassSensitivity(sliderSens.value);
        }
    }

    window.addEventListener('click', (e) => {
        // Only trigger audio enable if not clicking sliders/buttons directly
        if (!e.target.closest('#hud') && !e.target.closest('#fx-bank-panel')) {
            enableAudio();
        } else if (!audioProcessor) {
            enableAudio();
        }
    });

    // 3. FX Bank Switching
    const fxButtons = document.querySelectorAll('.fx-btn');
    function selectFX(index) {
        vfx.switchFX(index);
        fxButtons.forEach((btn, idx) => {
            btn.classList.toggle('active', idx === index);
        });
    }

    fxButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const fxIdx = parseInt(btn.getAttribute('data-fx'), 10);
            selectFX(fxIdx);
        });
    });

    // Strobe Button
    const btnFlash = document.getElementById('btn-flash');
    if (btnFlash) {
        btnFlash.addEventListener('click', () => {
            vfx.triggerManualFlash();
        });
    }

    // 4. Calibration Sliders Events
    if (sliderGain) {
        sliderGain.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            gainVal.textContent = `${val.toFixed(1)}x`;
            if (audioProcessor) audioProcessor.setGain(val);
        });
    }

    if (sliderSens) {
        sliderSens.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            sensVal.textContent = `${val.toFixed(1)}x`;
            if (audioProcessor) audioProcessor.setBassSensitivity(val);
        });
    }

    if (sliderBloom) {
        sliderBloom.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            bloomVal.textContent = `${val.toFixed(1)}x`;
            vfx.setBloomMultiplier(val);
        });
    }

    // 5. Connect to StageLinq Companion Bridge via WebSocket
    setupStageLinqClient({
        onBPM: (bpm, deck) => {
            if (bpm) {
                bpmVal.textContent = Number(bpm).toFixed(1);
                vfx.setBPM(bpm);
            }
        },
        onBeat: (deck, beatCount) => {
            vfx.triggerBeatPulse();
            bpmVal.style.transform = 'scale(1.2)';
            setTimeout(() => {
                bpmVal.style.transform = 'scale(1.0)';
            }, 90);
        },
        onTrack: (trackData) => {
            if (trackData.title) trackTitle.textContent = trackData.title;
            if (trackData.artist) trackArtist.textContent = `${trackData.artist} • Deck ${trackData.deck || 1}`;
            if (trackData.bpm) {
                bpmVal.textContent = Number(trackData.bpm).toFixed(1);
                vfx.setBPM(trackData.bpm);
            }
        },
        onStatusChange: (status) => {
            if (status.connected) {
                stagelinqStatus.innerHTML = `<span style="color:#00ffcc">● ${status.device || 'Prime Link Online'}</span>`;
            } else {
                stagelinqStatus.innerHTML = `<span style="color:rgba(255,255,255,0.4)">○ Bridge Offline</span>`;
            }
        }
    });

    // 6. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        // Number keys 1-5 for instant FX Bank switching
        if (['1', '2', '3', '4', '5'].includes(e.key)) {
            const fxIdx = parseInt(e.key, 10) - 1;
            selectFX(fxIdx);
        }
        // Spacebar for manual beat flash / strobe
        else if (e.code === 'Space') {
            e.preventDefault();
            vfx.triggerManualFlash();
        }
        // F for Fullscreen on external display
        else if (e.key === 'f' || e.key === 'F') {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen().catch(err => console.log(err));
            }
        }
        // H to toggle HUD & FX Toolbar
        else if (e.key === 'h' || e.key === 'H') {
            hud.classList.toggle('hidden');
            fxBankPanel.classList.toggle('hidden');
            trackBanner.classList.toggle('hidden');
        }
    });

    // 7. Start VFX Render Loop
    vfx.animate(() => {
        if (audioProcessor) {
            const data = audioProcessor.getAudioData();
            // Update UI mini EQ bars with transient punch
            if (eqBass) eqBass.style.height = `${Math.min(100, Math.round((data.bassImpact || data.bass) * 100))}%`;
            if (eqMid) eqMid.style.height = `${Math.min(100, Math.round(data.mid * 100))}%`;
            if (eqTreble) eqTreble.style.height = `${Math.min(100, Math.round(data.treble * 100))}%`;
            return data;
        }
        return null;
    });
}

init();
