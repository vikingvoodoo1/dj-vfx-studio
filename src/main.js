import { setupAudio } from './audio.js';
import { createVFXScene } from './effects.js';
import { setupStageLinqClient } from './stagelinq.js';

// DJ-VFX Engine Build Metadata
const BUILD_VERSION = 'v2.7.0';
const BUILD_NUMBER = '20260925.1125.00';
console.log(
    `%c⚡ DJ-VFX ENGINE %c ${BUILD_VERSION} (Build #${BUILD_NUMBER}) %c- ONLINE`,
    'background:#ff007f; color:#fff; font-weight:bold; padding:4px 8px; border-radius:3px 0 0 3px;',
    'background:#00ffff; color:#020208; font-weight:bold; padding:4px 8px;',
    'background:#12121e; color:#00ffcc; font-weight:bold; padding:4px 8px; border-radius:0 3px 3px 0;'
);
window.__DJ_VFX_BUILD__ = {
    version: BUILD_VERSION,
    buildNumber: BUILD_NUMBER,
    timestamp: '2026-09-25T11:25:00Z'
};

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

    const audioDeviceSelect = document.getElementById('audio-device-select');
    const btnListenAudio = document.getElementById('btn-listen-audio');
    const deckBadge1 = document.getElementById('deck-badge-1');
    const deckBadge2 = document.getElementById('deck-badge-2');

    // Calibration Sliders
    const sliderGain = document.getElementById('slider-gain');
    const sliderSens = document.getElementById('slider-sens');
    const sliderBloom = document.getElementById('slider-bloom');
    const gainVal = document.getElementById('gain-val');
    const sensVal = document.getElementById('sens-val');
    const bloomVal = document.getElementById('bloom-val');

    // Logo Layer Controls
    const btnResetAll = document.getElementById('btn-reset-all');
    const logoBadge = document.getElementById('logo-badge');
    const logoFilename = document.getElementById('logo-filename');
    const visPills = document.querySelectorAll('#logo-vis-pills .mode-pill[data-vis]');
    const modePills = document.querySelectorAll('.mode-pill[data-mode]');
    const blendPills = document.querySelectorAll('.mode-pill[data-blend]');
    const posPills = document.querySelectorAll('#logo-pos-pills .mode-pill[data-pos]');
    const spinPills = document.querySelectorAll('#logo-spin-pills .mode-pill[data-spin]');
    const sliderLogoSpinSpeed = document.getElementById('slider-logo-spin-speed');
    const logoSpinSpeedVal = document.getElementById('logo-spin-speed-val');
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
    vfx.setBloomMultiplier(0.35);

    // Load Default Animated Logo Video (JK McLaren Shock MP4)
    vfx.loadLogoMedia('/images/logo/jkmclaren_shock.mp4', true);

    let audioProcessor = null;
    let isLogoActive = true;
    let isAutoVJ = false;
    let autoVJBeatCounter = 0;
    const TOTAL_FX = 17;

    // -------------------------------------------------------------------------
    // Cross-Window State & Audio Synchronizer (2nd Screen / Projector / OBS)
    // -------------------------------------------------------------------------
    const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dj_vfx_sync') : null;
    let remoteAudioData = null;
    let lastRemoteAudioTime = 0;

    const btnPopout = document.getElementById('btn-popout');
    if (btnPopout) {
        btnPopout.addEventListener('click', () => {
            const popoutUrl = `${window.location.origin}${window.location.pathname}?clean=true`;
            window.open(popoutUrl, 'DJ_VFX_2ND_SCREEN', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
        });
    }

    // Check if opened as Clean Output Stage Display
    const urlParams = new URLSearchParams(window.location.search);
    const isCleanDisplay = urlParams.get('clean') === 'true' || window.location.hash.includes('clean');
    if (isCleanDisplay) {
        if (hud) hud.classList.add('hidden');
        if (fxBankPanel) fxBankPanel.classList.add('hidden');
        if (trackBanner) trackBanner.classList.add('hidden');
        document.body.style.cursor = 'none';
        console.log('[DJ-VFX] 🖥️ Clean 2nd Screen Display Mode Active (Receiving Live Sync)');
    }

    if (syncChannel) {
        syncChannel.onmessage = (event) => {
            const msg = event.data;
            if (!msg) return;

            if (msg.type === 'audio_frame') {
                remoteAudioData = msg.audio;
                lastRemoteAudioTime = performance.now();
            } else if (msg.type === 'set_fx') {
                selectFX(msg.fx, false);
            } else if (msg.type === 'set_bpm') {
                if (bpmVal) bpmVal.textContent = Number(msg.bpm).toFixed(1);
                vfx.setBPM(msg.bpm);
            } else if (msg.type === 'beat_pulse') {
                vfx.triggerBeatPulse();
            } else if (msg.type === 'flash') {
                vfx.triggerManualFlash();
            } else if (msg.type === 'set_logo_vis') {
                updateLogoVisibility(msg.vis, false);
            } else if (msg.type === 'track') {
                if (trackTitle && msg.title) trackTitle.textContent = msg.title;
                if (trackArtist && msg.artist) trackArtist.textContent = `${msg.artist} • Deck ${msg.deck || 1}`;
                if (bpmVal && msg.bpm) bpmVal.textContent = Number(msg.bpm).toFixed(1);
                if (msg.bpm) vfx.setBPM(msg.bpm);
            }
        };
    }

    // Helper to populate audio devices in select dropdown
    function updateDeviceDropdown(devices, currentId) {
        if (!audioDeviceSelect) return;
        audioDeviceSelect.innerHTML = '';
        
        const defaultOpt = document.createElement('option');
        defaultOpt.value = 'default';
        defaultOpt.textContent = 'Default System / Deck Input';
        audioDeviceSelect.appendChild(defaultOpt);

        devices.forEach((dev, index) => {
            const opt = document.createElement('option');
            opt.value = dev.deviceId;
            opt.textContent = dev.label || `Audio Interface ${index + 1} (${dev.deviceId.slice(0, 8)}...)`;
            if (dev.deviceId === currentId) opt.selected = true;
            audioDeviceSelect.appendChild(opt);
        });

        if (currentId && currentId !== 'default') {
            audioDeviceSelect.value = currentId;
        }
    }

    // 2. Audio & Media Activation on User Click or Selection
    async function enableAudioAndMedia(selectedDeviceId = 'default') {
        vfx.playLogoVideo();

        if (!audioProcessor) {
            audioProcessor = await setupAudio((devs, activeId) => {
                updateDeviceDropdown(devs, activeId);
            });

            const devs = await audioProcessor.getDevices();
            updateDeviceDropdown(devs, audioProcessor.getCurrentDevice().id);

            if (sliderGain) audioProcessor.setGain(sliderGain.value);
            if (sliderSens) audioProcessor.setBassSensitivity(sliderSens.value);
        } else if (selectedDeviceId) {
            await audioProcessor.switchDevice(selectedDeviceId);
        }

        await audioProcessor.resume();

        if (audioProcessor.isConnected()) {
            const devInfo = audioProcessor.getCurrentDevice();
            const cleanLabel = devInfo.label.length > 22 ? devInfo.label.slice(0, 20) + '...' : devInfo.label;
            audioStatus.innerHTML = `<span style="color:#00ffcc" title="${devInfo.label}">● ${cleanLabel}</span>`;
            hudStatus.textContent = 'LIVE REACTIVE';
            hudStatus.style.borderColor = '#00ffcc';
            hudStatus.style.color = '#00ffcc';
        } else {
            audioStatus.innerHTML = `<span style="color:#ffaa00">● Simulated Audio</span>`;
            hudStatus.textContent = 'SIM ACTIVE';
        }
    }

    // Connect Audio on startup or first click
    enableAudioAndMedia();

    if (audioDeviceSelect) {
        audioDeviceSelect.addEventListener('change', async (e) => {
            await enableAudioAndMedia(e.target.value);
        });
    }

    if (btnListenAudio) {
        btnListenAudio.addEventListener('click', async () => {
            const chosenId = audioDeviceSelect ? audioDeviceSelect.value : 'default';
            await enableAudioAndMedia(chosenId);
        });
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
    function updateLogoVisibility(active) {
        isLogoActive = !!active;
        vfx.setLogoVisible(isLogoActive);
        if (logoBadge) {
            logoBadge.textContent = isLogoActive ? 'ACTIVE [L]' : 'OFF [L]';
            logoBadge.style.color = isLogoActive ? '#00ffcc' : 'rgba(255,255,255,0.4)';
            logoBadge.style.borderColor = isLogoActive ? 'rgba(0,255,204,0.3)' : 'rgba(255,255,255,0.1)';
        }
        visPills.forEach(p => {
            const vis = p.getAttribute('data-vis');
            p.classList.toggle('active', (vis === 'on' && isLogoActive) || (vis === 'off' && !isLogoActive));
        });
    }

    function toggleLogo() {
        updateLogoVisibility(!isLogoActive);
    }

    if (logoBadge) logoBadge.addEventListener('click', toggleLogo);

    visPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const vis = pill.getAttribute('data-vis');
            updateLogoVisibility(vis === 'on');
        });
    });

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

    posPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const pos = pill.getAttribute('data-pos');
            posPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoPosition(pos);
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

    spinPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const spin = pill.getAttribute('data-spin');
            spinPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoSpinMode(spin);
        });
    });

    if (sliderLogoSpinSpeed) {
        sliderLogoSpinSpeed.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoSpinSpeedVal.textContent = `${val.toFixed(1)}x`;
            vfx.setLogoSpinSpeed(val);
        });
    }

    if (checkLogoShield) {
        checkLogoShield.addEventListener('change', (e) => {
            vfx.setLogoShieldVisible(e.target.checked);
        });
    }

    // Reset All Console Parameters to Factory Defaults
    function resetAllParameters() {
        // 1. Audio & Calibration
        if (sliderGain) {
            sliderGain.value = 1.0;
            gainVal.textContent = '1.0x';
            if (audioProcessor) audioProcessor.setGain(1.0);
        }
        if (sliderSens) {
            sliderSens.value = 1.0;
            sensVal.textContent = '1.0x';
            if (audioProcessor) audioProcessor.setBassSensitivity(1.0);
        }
        if (sliderBloom) {
            sliderBloom.value = 0.35;
            bloomVal.textContent = '0.35x';
            vfx.setBloomMultiplier(0.35);
        }

        // 2. Logo Layer Visibility & Mode
        updateLogoVisibility(true);

        modePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-mode') === 'hologram'));
        vfx.setLogoMode('hologram');

        blendPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-blend') === '0'));
        vfx.setLogoBlendMode(0);

        posPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-pos') === 'center'));
        vfx.setLogoPosition('center');

        // Horizontal Spin
        spinPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-spin') === 'off'));
        vfx.setLogoSpinMode('off');
        if (sliderLogoSpinSpeed) {
            sliderLogoSpinSpeed.value = 1.0;
            logoSpinSpeedVal.textContent = '1.0x';
            vfx.setLogoSpinSpeed(1.0);
        }

        // Contrast
        if (sliderLogoContrast) {
            sliderLogoContrast.value = 1.35;
            logoContrastVal.textContent = '1.35x';
            vfx.setLogoContrast(1.35);
        }

        // Brightness
        if (sliderLogoBright) {
            sliderLogoBright.value = 1.05;
            logoBrightVal.textContent = '1.05x';
            vfx.setLogoBrightness(1.05);
        }

        // Scale
        if (sliderLogoScale) {
            sliderLogoScale.value = 1.0;
            logoScaleVal.textContent = '1.0x';
            vfx.setLogoScale(1.0);
        }

        // Pulse
        if (sliderLogoPulse) {
            sliderLogoPulse.value = 35;
            logoPulseVal.textContent = '35%';
            vfx.setLogoBassPulse(0.35);
        }

        // Shield
        if (checkLogoShield) {
            checkLogoShield.checked = true;
            vfx.setLogoShieldVisible(true);
        }

        // Reset Media to default JK McLaren Shock
        vfx.loadLogoMedia('/images/logo/jkmclaren_shock.mp4', true);
        if (logoFilename) logoFilename.textContent = 'jkmclaren_shock.mp4';

        // Feedback on Reset button
        if (btnResetAll) {
            const origText = btnResetAll.innerHTML;
            btnResetAll.innerHTML = '✓ RESTORED';
            btnResetAll.style.background = 'rgba(0,255,204,0.3)';
            btnResetAll.style.borderColor = '#00ffcc';
            btnResetAll.style.color = '#00ffcc';
            setTimeout(() => {
                btnResetAll.innerHTML = origText;
                btnResetAll.style.background = '';
                btnResetAll.style.borderColor = '';
                btnResetAll.style.color = '';
            }, 1200);
        }
    }

    if (btnResetAll) {
        btnResetAll.addEventListener('click', resetAllParameters);
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
    function selectFX(index, broadcast = true) {
        const targetIndex = ((index % TOTAL_FX) + TOTAL_FX) % TOTAL_FX;
        vfx.switchFX(targetIndex);
        fxButtons.forEach((btn) => {
            const btnIdx = parseInt(btn.getAttribute('data-fx'), 10);
            btn.classList.toggle('active', btnIdx === targetIndex);
        });

        if (broadcast && syncChannel) {
            syncChannel.postMessage({ type: 'set_fx', fx: targetIndex });
        }
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
        btnFlash.addEventListener('click', () => {
            vfx.triggerManualFlash();
            if (syncChannel) syncChannel.postMessage({ type: 'flash' });
        });
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
            if (bpm && bpm > 40 && bpm < 300) {
                bpmVal.textContent = Number(bpm).toFixed(1);
                vfx.setBPM(bpm);
                if (syncChannel) syncChannel.postMessage({ type: 'set_bpm', bpm });
            }
            if (deck === 1 && deckBadge1) {
                deckBadge1.style.borderColor = '#00ffcc';
                deckBadge1.style.color = '#00ffcc';
            } else if (deck === 2 && deckBadge2) {
                deckBadge2.style.borderColor = '#00ffcc';
                deckBadge2.style.color = '#00ffcc';
            }
        },
        onBeat: (deck, beatCount) => {
            vfx.triggerBeatPulse();
            if (syncChannel) syncChannel.postMessage({ type: 'beat_pulse', deck, beatCount });

            bpmVal.style.transform = 'scale(1.2)';
            setTimeout(() => {
                bpmVal.style.transform = 'scale(1.0)';
            }, 90);

            const activeBadge = (deck === 2 && deckBadge2) ? deckBadge2 : deckBadge1;
            if (activeBadge) {
                activeBadge.style.background = 'rgba(0, 255, 204, 0.35)';
                activeBadge.style.color = '#ffffff';
                activeBadge.textContent = `DECK ${deck || 1} • [BEAT ${beatCount || 1}]`;
                setTimeout(() => {
                    activeBadge.style.background = 'rgba(255, 255, 255, 0.05)';
                    activeBadge.style.color = '#00ffcc';
                }, 120);
            }

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
            if (trackData.bpm && trackData.bpm > 40 && trackData.bpm < 300) {
                bpmVal.textContent = Number(trackData.bpm).toFixed(1);
                vfx.setBPM(trackData.bpm);
            }

            const deckNum = trackData.deck || 1;
            const targetBadge = (deckNum == 2 && deckBadge2) ? deckBadge2 : deckBadge1;
            if (targetBadge) {
                targetBadge.style.borderColor = '#00ffcc';
                targetBadge.style.color = '#00ffcc';
                targetBadge.textContent = `DECK ${deckNum}: ${trackData.artist ? trackData.artist.slice(0, 10) : 'PLAYING'}`;
            }

            if (syncChannel) {
                syncChannel.postMessage({
                    type: 'track',
                    title: trackData.title,
                    artist: trackData.artist,
                    deck: trackData.deck,
                    bpm: trackData.bpm
                });
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

    // 7. Keyboard Shortcuts (17 Presets)
    const hotkeyMap = {
        '1': 0, '2': 1, '3': 2, '4': 3,
        '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '0': 9,
        '-': 10, '=': 11,
        'q': 12, 'Q': 12,
        'w': 13, 'W': 13,
        'e': 14, 'E': 14,
        'r': 15, 'R': 15,
        't': 16, 'T': 16
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
        // [C] to toggle Clean Display Mode for Stage / 2nd Screen
        else if (e.key === 'c' || e.key === 'C') {
            hud.classList.toggle('hidden');
            fxBankPanel.classList.toggle('hidden');
            trackBanner.classList.toggle('hidden');
            document.body.style.cursor = hud.classList.contains('hidden') ? 'none' : 'default';
        }
        // [Space] for manual beat strobe / flash
        else if (e.code === 'Space') {
            e.preventDefault();
            vfx.triggerManualFlash();
            if (syncChannel) syncChannel.postMessage({ type: 'flash' });
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

    // 8. Start Real-Time VFX Render Loop (with Multi-Window Audio Relay)
    vfx.animate(() => {
        const now = performance.now();
        let data = null;

        if (audioProcessor && audioProcessor.isConnected()) {
            data = audioProcessor.getAudioData();
            
            // Relay live audio frame over BroadcastChannel to 2nd Screen / Projector / OBS
            if (syncChannel && data) {
                syncChannel.postMessage({
                    type: 'audio_frame',
                    audio: {
                        bass: data.bass,
                        smoothedBass: data.smoothedBass,
                        bassImpact: data.bassImpact,
                        transientImpulse: data.transientImpulse,
                        mid: data.mid,
                        smoothedMid: data.smoothedMid,
                        treble: data.treble,
                        smoothedTreble: data.smoothedTreble,
                        overall: data.overall,
                        isOnset: data.isOnset
                    }
                });
            }
        } else if (remoteAudioData && (now - lastRemoteAudioTime < 2500)) {
            // Screen Link Active: Consuming live audio from primary console window
            data = remoteAudioData;
            if (audioStatus && !audioStatus.dataset.screenLink) {
                audioStatus.dataset.screenLink = '1';
                audioStatus.innerHTML = `<span style="color:#00ffcc">● Screen Link (Sync Active)</span>`;
                if (hudStatus) {
                    hudStatus.textContent = '2ND SCREEN SYNC';
                    hudStatus.style.borderColor = '#00ffcc';
                    hudStatus.style.color = '#00ffcc';
                }
            }
        } else if (audioProcessor) {
            data = audioProcessor.getAudioData();
        }

        if (data) {
            if (eqBass) eqBass.style.height = `${Math.min(100, Math.round((data.bassImpact || data.bass) * 100))}%`;
            if (eqMid) eqMid.style.height = `${Math.min(100, Math.round(data.mid * 100))}%`;
            if (eqTreble) eqTreble.style.height = `${Math.min(100, Math.round(data.treble * 100))}%`;
            return data;
        }
        return null;
    });
}

init();
