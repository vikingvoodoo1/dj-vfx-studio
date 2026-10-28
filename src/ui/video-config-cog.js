// =========================================================================
// PER-VIDEO CARD CONFIGURATION COG MODAL CONTROLLER
// Modular UI controller for configuring individual video clips in #pane-video:
//   a) Video Play Time (e.g. 5s, 10s, 15s, or Full Length of Video default)
//   b) Loop Video (Default ON - sole authoritative loop control)
//   c) Video Playback Speed (Default 1.0x, 0.25x - 3.0x)
//   d) Remember Config for Logos (DJ, Station, Flyer: position, size, speed,
//      spin/rotation), Macro Faders & Lighting (Hue & DMX) — 100% consistent
//      with Scene Card Settings.
// =========================================================================

import { DEFAULT_SCENE_PROFILE } from '../scene-profiles.js';

export function getDefaultVideoConfig() {
    return {
        playTimeSec: 0, // 0 = Full length of the video (default)
        loop: true,     // Default ON
        speed: 1.0,     // Default 1.0x speed
        hasCustomSnapshot: false,
        snapshot: null
    };
}

export function ensureVideoConfig(vid) {
    if (!vid) return getDefaultVideoConfig();
    if (!vid.config || typeof vid.config !== 'object') {
        vid.config = getDefaultVideoConfig();
    } else {
        if (typeof vid.config.playTimeSec !== 'number') vid.config.playTimeSec = 0;
        if (typeof vid.config.loop !== 'boolean') vid.config.loop = true;
        if (typeof vid.config.speed !== 'number') vid.config.speed = 1.0;
        if (typeof vid.config.hasCustomSnapshot !== 'boolean') vid.config.hasCustomSnapshot = false;
    }
    return vid.config;
}

export function isVideoConfigured(vid) {
    if (!vid || !vid.config) return false;
    const c = vid.config;
    return Boolean(
        c.hasCustomSnapshot ||
        c.playTimeSec > 0 ||
        c.loop === false ||
        Math.abs((c.speed || 1.0) - 1.0) > 0.03
    );
}

export function initVideoConfigCogController({
    vfx,
    getCurrentConsoleSnapshot,
    applyCustomProfileSnapshot,
    switchTab,
    showToast
}) {
    let modalBackdrop = null;
    let activeVidObj = null;
    let activeBankIdx = 0;
    let activeVidIdx = 0;
    let activeOnSaveCallback = null;

    function formatPlayTime(sec, naturalDur = 0) {
        const s = Number(sec) || 0;
        if (s <= 0) {
            if (naturalDur > 0) {
                const m = Math.floor(naturalDur / 60);
                const r = Math.floor(naturalDur % 60).toString().padStart(2, '0');
                return `Full Length (${m}:${r})`;
            }
            return 'Full Video Length (Default)';
        }
        return `${s}s Play Time`;
    }

    function ensureModalDOM() {
        if (modalBackdrop) return modalBackdrop;
        modalBackdrop = document.getElementById('video-cog-modal-backdrop');
        if (modalBackdrop) return modalBackdrop;

        modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'video-cog-modal-backdrop';
        modalBackdrop.className = 'scene-cog-modal-backdrop';
        modalBackdrop.innerHTML = `
            <div class="scene-cog-modal" role="dialog" aria-modal="true" aria-labelledby="video-cog-modal-title">
                <div class="scene-cog-header">
                    <div class="scene-cog-header-left">
                        <div class="scene-cog-icon-box" id="video-cog-icon">🎬</div>
                        <div>
                            <div class="scene-cog-eyebrow" id="video-cog-eyebrow">VIDEO CLIP CONFIGURATION • BANK 1</div>
                            <div class="scene-cog-title" id="video-cog-modal-title">Video Clip Settings</div>
                            <div class="scene-cog-subtitle" id="video-cog-subtitle">Per-Video Play Time, Loop Control, Speed & Branding/Lighting Memory</div>
                        </div>
                    </div>
                    <div class="scene-cog-header-right">
                        <span class="scene-cog-status-pill" id="video-cog-status-pill">DEFAULT CONFIG</span>
                        <button type="button" class="scene-cog-close-btn" id="btn-video-cog-close" title="Close [Esc]">✕</button>
                    </div>
                </div>

                <div class="scene-cog-body">
                    <!-- (a) VIDEO PLAY TIME (DEFAULT TO FULL LENGTH) -->
                    <div class="scene-cog-card">
                        <div class="scene-cog-card-header">
                            <div>
                                <div class="scene-cog-card-title">⏱️ (a) VIDEO PLAY TIME (DURATION OVERRIDE)</div>
                                <div class="scene-cog-card-desc">Set how many seconds this video plays (e.g. 5 secs) or leave at 0s for Full Length of the video</div>
                            </div>
                            <span class="scene-cog-val-badge" id="video-cog-playtime-val">Full Video Length (Default)</span>
                        </div>
                        <div class="scene-cog-slider-wrap">
                            <span class="scene-cog-bound">FULL</span>
                            <input type="range" id="slider-video-cog-playtime" min="0" max="120" step="1" value="0">
                            <span class="scene-cog-bound">120s</span>
                        </div>
                        <div class="scene-cog-preset-row" id="video-cog-playtime-presets">
                            <button type="button" class="scene-cog-preset-btn active" data-playtime="0">Full Length (Default)</button>
                            <button type="button" class="scene-cog-preset-btn" data-playtime="5">5 Secs</button>
                            <button type="button" class="scene-cog-preset-btn" data-playtime="10">10 Secs</button>
                            <button type="button" class="scene-cog-preset-btn" data-playtime="15">15 Secs</button>
                            <button type="button" class="scene-cog-preset-btn" data-playtime="30">30 Secs</button>
                            <button type="button" class="scene-cog-preset-btn" data-playtime="60">60 Secs</button>
                        </div>
                    </div>

                    <!-- (b) LOOP VIDEO (DEFAULT ON - SOLE PLACE TO CONTROL LOOP) -->
                    <div class="scene-cog-card">
                        <div class="scene-cog-card-header">
                            <div>
                                <div class="scene-cog-card-title">🔁 (b) LOOP VIDEO (AUTHORITATIVE LOOP CONTROL)</div>
                                <div class="scene-cog-card-desc">When ON (Default), this video loops continuously (or repeats after Play Time). When OFF, advances to the next enabled clip in the bank.</div>
                            </div>
                            <span class="scene-cog-val-badge" id="video-cog-loop-badge">LOOP: ON</span>
                        </div>
                        <div class="scene-cog-preset-row" style="margin-top:4px;">
                            <button type="button" class="scene-cog-preset-btn active" id="btn-video-cog-loop-on" style="padding:7px 10px; font-size:9.5px;">🔁 LOOP VIDEO: ON (DEFAULT)</button>
                            <button type="button" class="scene-cog-preset-btn" id="btn-video-cog-loop-off" style="padding:7px 10px; font-size:9.5px;">➡️ LOOP OFF (ADVANCE TO NEXT CLIP)</button>
                        </div>
                    </div>

                    <!-- (c) VIDEO PLAYBACK SPEED (DEFAULT 1.0x) -->
                    <div class="scene-cog-card">
                        <div class="scene-cog-card-header">
                            <div>
                                <div class="scene-cog-card-title">⚡ (c) VIDEO PLAYBACK SPEED</div>
                                <div class="scene-cog-card-desc">Control playback rate for this specific video clip (Default 1.0x)</div>
                            </div>
                            <span class="scene-cog-val-badge" id="video-cog-speed-val">1.00x (Default)</span>
                        </div>
                        <div class="scene-cog-slider-wrap">
                            <span class="scene-cog-bound">0.25x</span>
                            <input type="range" id="slider-video-cog-speed" min="0.25" max="3.0" step="0.05" value="1.0">
                            <span class="scene-cog-bound">3.0x</span>
                        </div>
                        <div class="scene-cog-preset-row" id="video-cog-speed-presets">
                            <button type="button" class="scene-cog-preset-btn" data-vspeed="0.5">0.5x Half</button>
                            <button type="button" class="scene-cog-preset-btn" data-vspeed="0.75">0.75x Slow</button>
                            <button type="button" class="scene-cog-preset-btn active" data-vspeed="1.0">1.0x Default</button>
                            <button type="button" class="scene-cog-preset-btn" data-vspeed="1.25">1.25x Upbeat</button>
                            <button type="button" class="scene-cog-preset-btn" data-vspeed="1.5">1.5x Fast</button>
                            <button type="button" class="scene-cog-preset-btn" data-vspeed="2.0">2.0x Double</button>
                        </div>
                    </div>

                    <!-- (d) REMEMBER BRANDING (DJ, STATION, FLYER), MACRO FADERS & LIGHTING OVERRIDES -->
                    <div class="scene-cog-card">
                        <div class="scene-cog-card-header">
                            <div>
                                <div class="scene-cog-card-title">📸 (d) VIDEO MEMORY SNAPSHOT (LOGOS, MACRO & LIGHTING)</div>
                                <div class="scene-cog-card-desc">Clicking <strong>"Remember Config"</strong> saves DJ/Station/Flyer logo positions, sizes, speeds, rotation/spin, Macro Faders, and Hue/DMX Lighting for this video</div>
                            </div>
                            <span class="scene-cog-val-badge" id="video-cog-snapshot-badge">SCENE DEFAULT</span>
                        </div>
                        <div class="scene-cog-snapshot-grid" id="video-cog-snapshot-grid"></div>
                        <div class="scene-cog-quick-links">
                            <button type="button" class="scene-cog-link-btn" id="btn-video-cog-goto-branding">🎨 Tweak DJ / Station / Flyer Logos</button>
                            <button type="button" class="scene-cog-link-btn" id="btn-video-cog-goto-lighting">💡 Tweak Hue & DMX Lighting</button>
                        </div>
                    </div>
                </div>

                <div class="scene-cog-footer">
                    <button type="button" class="scene-cog-btn-reset" id="btn-video-cog-reset" title="Reset this video back to default Play Time (Full), Loop ON, 1.0x Speed, and clear Branding/Lighting overrides">
                        ↺ RESET VIDEO TO DEFAULTS
                    </button>
                    <div class="scene-cog-footer-right">
                        <button type="button" class="scene-cog-btn-remember" id="btn-video-cog-remember" title="Remember Play Time, Loop, Speed + all current DJ/Station/Flyer Branding, Macro Faders & Lighting settings for this video">
                            💾 REMEMBER CONFIG FOR VIDEO
                        </button>
                        <button type="button" class="scene-cog-btn-done" id="btn-video-cog-done">
                            ✓ DONE
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalBackdrop);
        bindVideoModalEvents();
        return modalBackdrop;
    }

    function bindVideoModalEvents() {
        const closeBtn = document.getElementById('btn-video-cog-close');
        const doneBtn = document.getElementById('btn-video-cog-done');
        const playTimeSlider = document.getElementById('slider-video-cog-playtime');
        const playTimePresets = document.querySelectorAll('#video-cog-playtime-presets .scene-cog-preset-btn');
        const loopOnBtn = document.getElementById('btn-video-cog-loop-on');
        const loopOffBtn = document.getElementById('btn-video-cog-loop-off');
        const speedSlider = document.getElementById('slider-video-cog-speed');
        const speedPresets = document.querySelectorAll('#video-cog-speed-presets .scene-cog-preset-btn');
        const rememberBtn = document.getElementById('btn-video-cog-remember');
        const resetBtn = document.getElementById('btn-video-cog-reset');
        const gotoBrandingBtn = document.getElementById('btn-video-cog-goto-branding');
        const gotoLightingBtn = document.getElementById('btn-video-cog-goto-lighting');

        if (closeBtn) closeBtn.addEventListener('click', closeVideoConfigModal);
        if (doneBtn) doneBtn.addEventListener('click', closeVideoConfigModal);
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', (e) => {
                if (e.target === modalBackdrop) closeVideoConfigModal();
            });
        }

        if (playTimeSlider) {
            playTimeSlider.addEventListener('input', (e) => {
                const sec = parseInt(e.target.value, 10) || 0;
                updatePlayTimeSetting(sec);
            });
        }

        playTimePresets.forEach(btn => {
            btn.addEventListener('click', () => {
                const sec = parseInt(btn.getAttribute('data-playtime'), 10) || 0;
                if (playTimeSlider) playTimeSlider.value = String(sec);
                updatePlayTimeSetting(sec);
            });
        });

        if (loopOnBtn) {
            loopOnBtn.addEventListener('click', () => updateLoopSetting(true));
        }
        if (loopOffBtn) {
            loopOffBtn.addEventListener('click', () => updateLoopSetting(false));
        }

        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const spd = parseFloat(e.target.value) || 1.0;
                updateSpeedSetting(spd);
            });
        }

        speedPresets.forEach(btn => {
            btn.addEventListener('click', () => {
                const spd = parseFloat(btn.getAttribute('data-vspeed')) || 1.0;
                if (speedSlider) speedSlider.value = String(spd);
                updateSpeedSetting(spd);
            });
        });

        if (rememberBtn) {
            rememberBtn.addEventListener('click', () => {
                if (!activeVidObj) return;
                const cfg = ensureVideoConfig(activeVidObj);
                const snap = typeof getCurrentConsoleSnapshot === 'function' ? getCurrentConsoleSnapshot(22) : {};
                cfg.snapshot = {
                    djLogo: { ...DEFAULT_SCENE_PROFILE.djLogo, ...(snap.djLogo || {}) },
                    stationLogo: { ...DEFAULT_SCENE_PROFILE.stationLogo, ...(snap.stationLogo || {}) },
                    flyer: { ...DEFAULT_SCENE_PROFILE.flyer, ...(snap.flyer || {}) },
                    macro: { ...DEFAULT_SCENE_PROFILE.macro, ...(snap.macro || {}) },
                    lighting: { ...DEFAULT_SCENE_PROFILE.lighting, ...(snap.lighting || {}) }
                };
                cfg.hasCustomSnapshot = true;
                if (typeof activeOnSaveCallback === 'function') activeOnSaveCallback(activeVidObj);
                renderVideoModalState();
                if (typeof showToast === 'function') {
                    showToast(`💾 Video "${activeVidObj.title}": Play Time, Loop, Speed, Branding & Lighting Remembered!`);
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (!activeVidObj) return;
                activeVidObj.config = getDefaultVideoConfig();
                if (vfx && typeof vfx.setVideoSpeed === 'function') {
                    vfx.setVideoSpeed(1.0);
                }
                if (typeof activeOnSaveCallback === 'function') activeOnSaveCallback(activeVidObj);
                renderVideoModalState();
                if (typeof showToast === 'function') {
                    showToast(`↺ Video "${activeVidObj.title}": Restored to Default Play Time (Full), Loop ON & 1.0x Speed`);
                }
            });
        }

        if (gotoBrandingBtn) {
            gotoBrandingBtn.addEventListener('click', () => {
                closeVideoConfigModal();
                if (typeof switchTab === 'function') switchTab('branding');
            });
        }
        if (gotoLightingBtn) {
            gotoLightingBtn.addEventListener('click', () => {
                closeVideoConfigModal();
                if (typeof switchTab === 'function') switchTab('lighting');
            });
        }
    }

    function updatePlayTimeSetting(sec) {
        if (!activeVidObj) return;
        const cfg = ensureVideoConfig(activeVidObj);
        cfg.playTimeSec = Math.max(0, Math.min(600, Number(sec) || 0));
        const valEl = document.getElementById('video-cog-playtime-val');
        if (valEl) valEl.textContent = formatPlayTime(cfg.playTimeSec, activeVidObj.duration);
        document.querySelectorAll('#video-cog-playtime-presets .scene-cog-preset-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.getAttribute('data-playtime'), 10) === cfg.playTimeSec);
        });
        if (typeof activeOnSaveCallback === 'function') activeOnSaveCallback(activeVidObj);
        renderVideoSnapshotGrid();
    }

    function updateLoopSetting(isLoop) {
        if (!activeVidObj) return;
        const cfg = ensureVideoConfig(activeVidObj);
        cfg.loop = Boolean(isLoop);
        const badge = document.getElementById('video-cog-loop-badge');
        const onBtn = document.getElementById('btn-video-cog-loop-on');
        const offBtn = document.getElementById('btn-video-cog-loop-off');
        if (badge) badge.textContent = cfg.loop ? 'LOOP: ON (DEFAULT)' : 'LOOP: OFF (ADVANCE)';
        if (onBtn) onBtn.classList.toggle('active', cfg.loop);
        if (offBtn) offBtn.classList.toggle('active', !cfg.loop);
        if (typeof activeOnSaveCallback === 'function') activeOnSaveCallback(activeVidObj);
        renderVideoSnapshotGrid();
    }

    function updateSpeedSetting(spd) {
        if (!activeVidObj) return;
        const cfg = ensureVideoConfig(activeVidObj);
        cfg.speed = Math.max(0.25, Math.min(3.0, Number(spd) || 1.0));
        const valEl = document.getElementById('video-cog-speed-val');
        if (valEl) {
            valEl.textContent = `${cfg.speed.toFixed(2)}x ${Math.abs(cfg.speed - 1.0) < 0.03 ? '(Default)' : ''}`;
        }
        document.querySelectorAll('#video-cog-speed-presets .scene-cog-preset-btn').forEach(btn => {
            const p = parseFloat(btn.getAttribute('data-vspeed'));
            btn.classList.toggle('active', Math.abs(p - cfg.speed) < 0.03);
        });
        if (vfx && typeof vfx.setVideoSpeed === 'function') {
            vfx.setVideoSpeed(cfg.speed);
        }
        if (typeof activeOnSaveCallback === 'function') activeOnSaveCallback(activeVidObj);
        renderVideoSnapshotGrid();
    }

    function renderVideoSnapshotGrid() {
        const gridEl = document.getElementById('video-cog-snapshot-grid');
        const snapBadge = document.getElementById('video-cog-snapshot-badge');
        const statusPill = document.getElementById('video-cog-status-pill');
        if (!gridEl || !activeVidObj) return;

        const cfg = ensureVideoConfig(activeVidObj);
        const live = typeof getCurrentConsoleSnapshot === 'function' ? getCurrentConsoleSnapshot(22) : {};
        const snap = (cfg.hasCustomSnapshot && cfg.snapshot) ? cfg.snapshot : live;

        const dj = snap.djLogo || DEFAULT_SCENE_PROFILE.djLogo;
        const st = snap.stationLogo || DEFAULT_SCENE_PROFILE.stationLogo;
        const fl = snap.flyer || DEFAULT_SCENE_PROFILE.flyer;
        const mc = snap.macro || DEFAULT_SCENE_PROFILE.macro;
        const lt = snap.lighting || DEFAULT_SCENE_PROFILE.lighting;

        const customized = isVideoConfigured(activeVidObj);
        if (statusPill) {
            statusPill.textContent = customized ? '★ CUSTOM VIDEO CONFIG' : 'DEFAULT CONFIG';
            statusPill.className = 'scene-cog-status-pill ' + (customized ? 'live' : 'standby');
        }
        if (snapBadge) {
            snapBadge.textContent = cfg.hasCustomSnapshot ? '★ VIDEO MEMORY SAVED' : 'LIVE CONSOLE STATE';
            snapBadge.className = 'scene-cog-val-badge ' + (cfg.hasCustomSnapshot ? 'custom' : '');
        }

        gridEl.innerHTML = `
            <div class="scene-cog-snap-col">
                <div class="scene-cog-snap-heading">🎨 (a) Logos & Spin</div>
                <div class="scene-cog-snap-row"><span>DJ Logo:</span> <strong>${dj.enabled ? 'ON' : 'OFF'} • ${(dj.position || 'center').toUpperCase()}</strong></div>
                <div class="scene-cog-snap-row"><span>DJ Spin / Size:</span> <strong>${(dj.spin || 'off').toUpperCase()} (${Number(dj.spinSpeed ?? 1).toFixed(1)}x) • ${Number(dj.scale ?? 1).toFixed(2)}x</strong></div>
                <div class="scene-cog-snap-row"><span>Station Logo:</span> <strong>${st.enabled ? 'ON' : 'OFF'} • ${(st.position || 'top-right').toUpperCase()} (${Number(st.scale ?? 1).toFixed(2)}x)</strong></div>
                <div class="scene-cog-snap-row"><span>Promo Flyer:</span> <strong>${fl.enabled ? 'ON' : 'OFF'} • ${(fl.position || 'center').toUpperCase()} (${Number(fl.scale ?? 1).toFixed(2)}x)</strong></div>
            </div>
            <div class="scene-cog-snap-col">
                <div class="scene-cog-snap-heading">🎬 (b) Video & Macro</div>
                <div class="scene-cog-snap-row"><span>Play Time:</span> <strong>${cfg.playTimeSec > 0 ? cfg.playTimeSec + 's' : 'Full Length'}</strong></div>
                <div class="scene-cog-snap-row"><span>Loop / Speed:</span> <strong>${cfg.loop ? 'LOOP ON' : 'ONCE'} • ${Number(cfg.speed ?? 1).toFixed(2)}x</strong></div>
                <div class="scene-cog-snap-row"><span>Gain / Sens:</span> <strong>${Number(mc.gain ?? 1).toFixed(1)}x / ${Number(mc.sens ?? 1).toFixed(1)}x</strong></div>
                <div class="scene-cog-snap-row"><span>Bloom Glow:</span> <strong>${Number(mc.bloom ?? 0.35).toFixed(2)}x</strong></div>
            </div>
            <div class="scene-cog-snap-col">
                <div class="scene-cog-snap-heading">💡 (c) Hue & DMX Rig</div>
                <div class="scene-cog-snap-row"><span>Philips Hue:</span> <strong>${lt.hueSync ? 'SYNC ON' : 'OFF'} (${lt.hueMode || 'auto'})</strong></div>
                <div class="scene-cog-snap-row"><span>Hue Punch / Floor:</span> <strong>${lt.hueIntensity ?? 85}% / ${lt.hueMinBri ?? 15}%</strong></div>
                <div class="scene-cog-snap-row"><span>Kick Strobe:</span> <strong>${lt.hueKickStrobe ? 'ACTIVE' : 'OFF'}</strong></div>
                <div class="scene-cog-snap-row"><span>DMX Universe ${lt.dmxUniverse ?? 1}:</span> <strong>${lt.dmxMaster ?? 85}% Dimmer</strong></div>
            </div>
        `;
    }

    function renderVideoModalState() {
        ensureModalDOM();
        if (!activeVidObj) return;
        const cfg = ensureVideoConfig(activeVidObj);

        const eyebrowEl = document.getElementById('video-cog-eyebrow');
        const titleEl = document.getElementById('video-cog-modal-title');
        const subEl = document.getElementById('video-cog-subtitle');
        if (eyebrowEl) eyebrowEl.textContent = `VIDEO CLIP CONFIGURATION • BANK ${activeBankIdx + 1} • SLOT #${activeVidIdx + 1}`;
        if (titleEl) titleEl.textContent = activeVidObj.title || activeVidObj.name || `Video Clip #${activeVidIdx + 1}`;
        if (subEl) {
            const natDur = activeVidObj.duration ? `${Math.floor(activeVidObj.duration / 60)}:${Math.floor(activeVidObj.duration % 60).toString().padStart(2, '0')}` : 'Auto';
            subEl.textContent = `Natural Duration: ${natDur} • Per-Video Loop, Play Time, Speed & Branding/Lighting Memory`;
        }

        const playTimeSlider = document.getElementById('slider-video-cog-playtime');
        const playTimeVal = document.getElementById('video-cog-playtime-val');
        if (playTimeSlider) {
            const maxDur = activeVidObj.duration && activeVidObj.duration > 10 ? Math.ceil(activeVidObj.duration) : 120;
            playTimeSlider.max = String(Math.max(30, Math.min(300, maxDur)));
            playTimeSlider.value = String(cfg.playTimeSec || 0);
        }
        if (playTimeVal) playTimeVal.textContent = formatPlayTime(cfg.playTimeSec, activeVidObj.duration);
        document.querySelectorAll('#video-cog-playtime-presets .scene-cog-preset-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.getAttribute('data-playtime'), 10) === (cfg.playTimeSec || 0));
        });

        const loopBadge = document.getElementById('video-cog-loop-badge');
        const loopOnBtn = document.getElementById('btn-video-cog-loop-on');
        const loopOffBtn = document.getElementById('btn-video-cog-loop-off');
        if (loopBadge) loopBadge.textContent = cfg.loop ? 'LOOP: ON (DEFAULT)' : 'LOOP: OFF (ADVANCE)';
        if (loopOnBtn) loopOnBtn.classList.toggle('active', cfg.loop);
        if (loopOffBtn) loopOffBtn.classList.toggle('active', !cfg.loop);

        const speedSlider = document.getElementById('slider-video-cog-speed');
        const speedVal = document.getElementById('video-cog-speed-val');
        if (speedSlider) speedSlider.value = String(cfg.speed || 1.0);
        if (speedVal) speedVal.textContent = `${Number(cfg.speed || 1.0).toFixed(2)}x ${Math.abs((cfg.speed || 1.0) - 1.0) < 0.03 ? '(Default)' : ''}`;
        document.querySelectorAll('#video-cog-speed-presets .scene-cog-preset-btn').forEach(btn => {
            const p = parseFloat(btn.getAttribute('data-vspeed'));
            btn.classList.toggle('active', Math.abs(p - (cfg.speed || 1.0)) < 0.03);
        });

        renderVideoSnapshotGrid();
    }

    function openVideoConfigModal(vidObj, bankIdx = 0, vidIdx = 0, onSaveCallback = null) {
        if (!vidObj) return;
        activeVidObj = vidObj;
        activeBankIdx = bankIdx;
        activeVidIdx = vidIdx;
        activeOnSaveCallback = onSaveCallback;
        ensureModalDOM();
        renderVideoModalState();
        modalBackdrop.classList.add('active', 'open');
    }

    function closeVideoConfigModal() {
        if (modalBackdrop) {
            modalBackdrop.classList.remove('active', 'open');
        }
    }

    /**
     * Apply a video's remembered configuration when it starts playing on Scene 23
     */
    function applyVideoConfigOnPlay(vidObj) {
        if (!vidObj) return;
        const cfg = ensureVideoConfig(vidObj);
        if (vfx && typeof vfx.setVideoSpeed === 'function') {
            vfx.setVideoSpeed(cfg.speed || 1.0);
        }
        if (cfg.hasCustomSnapshot && cfg.snapshot && typeof applyCustomProfileSnapshot === 'function') {
            applyCustomProfileSnapshot(cfg.snapshot);
        }
    }

    ensureModalDOM();

    return {
        openVideoConfigModal,
        closeVideoConfigModal,
        applyVideoConfigOnPlay,
        ensureVideoConfig,
        isVideoConfigured
    };
}

