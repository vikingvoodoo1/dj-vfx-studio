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

    // Calibration Sliders
    const sliderGain = document.getElementById('slider-gain');
    const sliderSens = document.getElementById('slider-sens');
    const sliderBloom = document.getElementById('slider-bloom');
    const gainVal = document.getElementById('gain-val');
    const sensVal = document.getElementById('sens-val');
    const bloomVal = document.getElementById('bloom-val');

    // Logo Layer Controls
    const logoBadge = document.getElementById('logo-badge');
    const logoFilename = document.getElementById('logo-filename');
    const modePills = document.querySelectorAll('.mode-pill[data-mode]');
    const blendPills = document.querySelectorAll('.mode-pill[data-blend]');
    const sliderLogoContrast = document.getElementById('slider-logo-contrast');
    const sliderLogoBright = document.getElementById('slider-logo-bright');
    const sliderLogoScale = document.getElementById('slider-logo-scale');
    const sliderLogoPulse = document.getElementById('slider-logo-pulse');
    const logoContrastVal = document.getElementById('logo-contrast-val');
    const logoBrightVal = document.getElementById('logo-bright-val');
    const logoScaleVal = document.getElementById('logo-scale-val');
    const logoPulseVal = document.getElementById('logo-pulse-val');
    const checkLogoShield = document.getElementById('check-logo-shield');
    const btnLoadCustom = document.getElementById('btn-load-custom');
    const btnResetShock = document.getElementById('btn-reset-shock');
    const fileLogo = document.getElementById('file-logo');
    const dropZone = document.getElementById('drop-zone');

    // FX Category & Presets Elements
    const catTabs = document.querySelectorAll('.cat-tab');
    const fxButtons = document.querySelectorAll('.fx-btn');
    const btnAutoVJ = document.getElementById('btn-auto-vj');
    const btnFlash = document.getElementById('btn-flash');

    // 1. Initialize Three.js VFX Scene
    const vfx = createVFXScene(container);
    vfx.setBloomMultiplier(0.4);

    // Load Default Animated Logo Video (JK McLaren Shock MP4)
    vfx.loadLogoMedia('/images/logo/jkmclaren_shock.mp4', true);

    let audioProcessor = null;
    let isLogoActive = true;
    let isAutoVJ = false;
    let autoVJBeatCounter = 0;
    const TOTAL_FX = 10;

    // 2. Audio & Media Activation on User Click
    async function enableAudioAndMedia() {
        vfx.playLogoVideo();

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

            if (sliderGain) audioProcessor.setGain(sliderGain.value);
            if (sliderSens) audioProcessor.setBassSensitivity(sliderSens.value);
        }
    }

    window.addEventListener('click', (e) => {
        if (!e.target.closest('#hud') && !e.target.closest('#fx-bank-panel')) {
            enableAudioAndMedia();
        } else {
            vfx.playLogoVideo();
            if (!audioProcessor) enableAudioAndMedia();
        }
    });

    // 3. Logo Layer Controls
    function toggleLogo() {
        isLogoActive = !isLogoActive;
        vfx.setLogoVisible(isLogoActive);
        if (logoBadge) {
            logoBadge.textContent = isLogoActive ? 'ACTIVE [L]' : 'MUTED [L]';
            logoBadge.style.color = isLogoActive ? '#00ffcc' : 'rgba(255,255,255,0.4)';
            logoBadge.style.borderColor = isLogoActive ? 'rgba(0,255,204,0.3)' : 'rgba(255,255,255,0.1)';
        }
    }

    if (logoBadge) logoBadge.addEventListener('click', toggleLogo);

    modePills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const mode = pill.getAttribute('data-mode');
            modePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoMode(mode);
        });
    });

    blendPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const blend = pill.getAttribute('data-blend');
            blendPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoBlendMode(blend);
        });
    });

    if (sliderLogoContrast) {
        sliderLogoContrast.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoContrastVal.textContent = `${val.toFixed(2)}x`;
            vfx.setLogoContrast(val);
        });
    }

    if (sliderLogoBright) {
        sliderLogoBright.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoBrightVal.textContent = `${val.toFixed(2)}x`;
            vfx.setLogoBrightness(val);
        });
    }

    if (sliderLogoScale) {
        sliderLogoScale.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoScaleVal.textContent = `${val.toFixed(1)}x`;
            vfx.setLogoScale(val);
        });
    }

    if (sliderLogoPulse) {
        sliderLogoPulse.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            logoPulseVal.textContent = `${val}%`;
            vfx.setLogoBassPulse(val / 100);
        });
    }

    if (checkLogoShield) {
        checkLogoShield.addEventListener('change', (e) => {
            vfx.setLogoShieldVisible(e.target.checked);
        });
    }

    // Custom File Loading
    if (btnLoadCustom && fileLogo) {
        btnLoadCustom.addEventListener('click', () => fileLogo.click());
        fileLogo.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) loadCustomFile(file);
        });
    }

    if (btnResetShock) {
        btnResetShock.addEventListener('click', () => {
            vfx.loadLogoMedia('/images/logo/jkmclaren_shock.mp4', true);
            logoFilename.textContent = 'jkmclaren_shock.mp4';
        });
    }

    function loadCustomFile(file) {
        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
        vfx.loadLogoMedia(url, isVideo);
        logoFilename.textContent = file.name.length > 20 ? file.name.slice(0, 17) + '...' : file.name;
    }

    // Drag & Drop
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dropZone) dropZone.style.display = 'flex';
    });

    window.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null && dropZone) dropZone.style.display = 'none';
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dropZone) dropZone.style.display = 'none';
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            loadCustomFile(e.dataTransfer.files[0]);
        }
    });

    // 4. Categorized FX Bank Switching & Filtering
    function selectFX(index) {
        const targetIndex = ((index % TOTAL_FX) + TOTAL_FX) % TOTAL_FX;
        vfx.switchFX(targetIndex);
        fxButtons.forEach((btn) => {
            const btnIdx = parseInt(btn.getAttribute('data-fx'), 10);
            btn.classList.toggle('active', btnIdx === targetIndex);
        });
    }

    fxButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const fxIdx = parseInt(btn.getAttribute('data-fx'), 10);
            selectFX(fxIdx);
        });
    });

    // Category Tabs Filtering
    catTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const cat = tab.getAttribute('data-category');
            catTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            fxButtons.forEach((btn) => {
                const btnCat = btn.getAttribute('data-cat');
                if (cat === 'all' || btnCat === cat) {
                    btn.style.display = 'inline-flex';
                } else {
                    btn.style.display = 'none';
                }
            });
        });
    });

    // Auto-VJ Mode
    function toggleAutoVJ() {
        isAutoVJ = !isAutoVJ;
        if (btnAutoVJ) {
            btnAutoVJ.classList.toggle('active', isAutoVJ);
            btnAutoVJ.innerHTML = isAutoVJ ? `<span class="fx-key">A</span> AUTO VJ: ON` : `<span class="fx-key">A</span> AUTO VJ`;
        }
    }

    if (btnAutoVJ) btnAutoVJ.addEventListener('click', toggleAutoVJ);

    // Strobe Button
    if (btnFlash) {
        btnFlash.addEventListener('click', () => vfx.triggerManualFlash());
    }

    // 5. Calibration Sliders
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
            bloomVal.textContent = `${val.toFixed(2)}x`;
            vfx.setBloomMultiplier(val);
        });
    }

    // 6. Connect to StageLinq Companion Bridge via WebSocket
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

            // Auto-VJ Transition every 32 beats (8 bars)
            if (isAutoVJ) {
                autoVJBeatCounter++;
                if (autoVJBeatCounter >= 32) {
                    autoVJBeatCounter = 0;
                    const nextFX = (vfx.getCurrentFX() + 1) % TOTAL_FX;
                    selectFX(nextFX);
                }
            }
        },
        onTrack: (trackData) => {
            if (trackData.title) trackTitle.textContent = trackData.title;
            if (trackData.artist) trackArtist.textContent = `${trackData.artist} • Deck ${trackData.deck || 1}`;
            if (trackData.bpm) {
                bpmVal.textContent = Number(trackData.bpm).toFixed(1);
                vfx.setBPM(trackData.bpm);
            }

            // Trigger fresh scene on track change if Auto-VJ active
            if (isAutoVJ) {
                const nextFX = (vfx.getCurrentFX() + 1) % TOTAL_FX;
                selectFX(nextFX);
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

    // 7. Keyboard Shortcuts
    const hotkeyMap = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
        '6': 5, '7': 6, '8': 7, '9': 8, '0': 9
    };

    window.addEventListener('keydown', (e) => {
        // [1] - [9], [0], [-], [=] for instant FX switching
        if (hotkeyMap[e.key] !== undefined) {
            selectFX(hotkeyMap[e.key]);
        }
        // Left & Right Arrow keys to cycle previous / next preset
        else if (e.key === 'ArrowRight') {
            selectFX(vfx.getCurrentFX() + 1);
        }
        else if (e.key === 'ArrowLeft') {
            selectFX(vfx.getCurrentFX() - 1);
        }
        // [A] to toggle Auto-VJ mode
        else if (e.key === 'a' || e.key === 'A') {
            toggleAutoVJ();
        }
        // [L] to toggle Logo layer
        else if (e.key === 'l' || e.key === 'L') {
            toggleLogo();
        }
        // [Space] for manual beat strobe / flash
        else if (e.code === 'Space') {
            e.preventDefault();
            vfx.triggerManualFlash();
        }
        // [F] for Fullscreen on external HDMI output
        else if (e.key === 'f' || e.key === 'F') {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen().catch(err => console.log(err));
            }
        }
        // [H] to toggle HUD & FX Toolbar
        else if (e.key === 'h' || e.key === 'H') {
            hud.classList.toggle('hidden');
            fxBankPanel.classList.toggle('hidden');
            trackBanner.classList.toggle('hidden');
        }
    });

    // 8. Start Real-Time VFX Render Loop
    vfx.animate(() => {
        if (audioProcessor) {
            const data = audioProcessor.getAudioData();
            if (eqBass) eqBass.style.height = `${Math.min(100, Math.round((data.bassImpact || data.bass) * 100))}%`;
            if (eqMid) eqMid.style.height = `${Math.min(100, Math.round(data.mid * 100))}%`;
            if (eqTreble) eqTreble.style.height = `${Math.min(100, Math.round(data.treble * 100))}%`;
            return data;
        }
        return null;
    });
}

init();
