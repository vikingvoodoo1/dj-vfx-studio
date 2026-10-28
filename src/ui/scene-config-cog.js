// =========================================================================
// PER-SCENE CONFIGURATION COG MODAL & ACTIVE SCENE BANNER CONTROLLER
// Modular UI controller for per-scene effect speed, Hellfire handover
// tolerance, "Remember Config" snapshot saving, and per-scene factory reset.
// =========================================================================

import { SCENE_METADATA, DEFAULT_SCENE_PROFILE, REACTIVE_TAG_DEFINITIONS, SceneProfileManager } from '../scene-profiles.js';

export function initSceneConfigCogController({
    vfx,
    getCurrentConsoleSnapshot,
    applySceneProfile,
    selectFX,
    switchTab,
    showToast
}) {
    let activeConfigSceneId = 0;
    let modalBackdrop = null;

    function isDeckReactiveLockedScene(sceneId) {
        return Number(sceneId) === 3 || Number(sceneId) === 15;
    }

    function getSceneMeta(sceneId) {
        const idx = Number(sceneId) || 0;
        return SCENE_METADATA.find(s => s.id === idx) || {
            id: idx,
            name: `Scene ${String(idx + 1).padStart(2, '0')}`,
            hotkey: String(idx + 1),
            category: 'fx',
            categoryLabel: 'Visual FX',
            icon: '✨',
            reactiveTags: ['audio_fft'],
            summary: 'Live 3D audio-reactive visual scene'
        };
    }

    // -------------------------------------------------------------------------
    // 1. Inject Cog Wheel (⚙️) & Memory Badge on Every FX Bank Scene Card
    // -------------------------------------------------------------------------
    function injectCogButtonsOnSceneCards() {
        const cards = document.querySelectorAll('.fx-pane-card');
        cards.forEach(card => {
            const fxId = parseInt(card.getAttribute('data-fx'), 10);
            if (isNaN(fxId)) return;

            const topRow = card.querySelector('.fx-pane-card-top');
            if (!topRow) return;

            if (!card.querySelector('.fx-card-cog-btn')) {
                const rightCluster = document.createElement('div');
                rightCluster.className = 'fx-card-top-right';

                const catTag = topRow.querySelector('.fx-pane-cat-tag');
                if (catTag) {
                    rightCluster.appendChild(catTag);
                }

                const memBadge = document.createElement('span');
                memBadge.className = 'fx-card-memory-badge';
                memBadge.dataset.fxMem = String(fxId);
                memBadge.title = 'Custom scene configuration saved in memory';
                memBadge.textContent = '★';
                rightCluster.appendChild(memBadge);

                const cogBtn = document.createElement('button');
                cogBtn.type = 'button';
                cogBtn.className = 'fx-card-cog-btn';
                cogBtn.dataset.fxCog = String(fxId);
                cogBtn.title = `Configure Scene ${String(fxId + 1).padStart(2, '0')} Settings (Speed, Branding Memory, Macro & Lighting)`;
                cogBtn.innerHTML = '⚙️';
                cogBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    openSceneConfigModal(fxId);
                });

                rightCluster.appendChild(cogBtn);
                topRow.appendChild(rightCluster);
            }
        });

        refreshAllSceneCardBadges();
    }

    function refreshAllSceneCardBadges() {
        const cards = document.querySelectorAll('.fx-pane-card');
        cards.forEach(card => {
            const fxId = parseInt(card.getAttribute('data-fx'), 10);
            if (isNaN(fxId)) return;
            const isCustom = SceneProfileManager.isCustomized(fxId);
            const profile = SceneProfileManager.getProfile(fxId);
            const speed = profile?.fx?.speed ?? (vfx?.getSceneSpeed ? vfx.getSceneSpeed(fxId) : 1.0);
            const hasCustomSpeed = !isDeckReactiveLockedScene(fxId) && Math.abs(speed - 1.0) > 0.04;

            const memBadge = card.querySelector('.fx-card-memory-badge');
            if (memBadge) {
                if (isCustom || hasCustomSpeed) {
                    memBadge.classList.add('visible');
                    memBadge.textContent = hasCustomSpeed ? `${Number(speed).toFixed(1)}x` : '★ MEM';
                } else {
                    memBadge.classList.remove('visible');
                }
            }

            const cogBtn = card.querySelector('.fx-card-cog-btn');
            if (cogBtn) {
                cogBtn.classList.toggle('customized', Boolean(isCustom || hasCustomSpeed));
            }
        });
    }

    // -------------------------------------------------------------------------
    // 2. Update Active Scene Banner on Live Performance Console (#pane-perform)
    // -------------------------------------------------------------------------
    function updateActiveSceneBanner(sceneId) {
        const idx = (sceneId !== undefined && sceneId !== null)
            ? Number(sceneId)
            : ((vfx && typeof vfx.getCurrentFX === 'function') ? vfx.getCurrentFX() : 0);

        const meta = getSceneMeta(idx);
        const sceneNumStr = String(idx + 1).padStart(2, '0');
        const isCustom = SceneProfileManager.isCustomized(idx);
        const profile = SceneProfileManager.getProfile(idx);
        const speed = isDeckReactiveLockedScene(idx)
            ? 1.0
            : (profile?.fx?.speed ?? (vfx?.getSceneSpeed ? vfx.getSceneSpeed(idx) : 1.0));

        const iconEl = document.getElementById('active-scene-banner-icon');
        const labelEl = document.getElementById('active-scene-banner-label');
        const titleEl = document.getElementById('video-quick-title');
        const subEl = document.getElementById('active-scene-banner-sub');
        const memPillEl = document.getElementById('active-scene-memory-pill');
        const speedPillEl = document.getElementById('active-scene-speed-pill');
        const videoBtnEl = document.getElementById('btn-open-video-manager');
        const cogBtnEl = document.getElementById('btn-active-scene-cog');

        if (iconEl) iconEl.textContent = meta.icon || '✨';
        if (labelEl) {
            labelEl.textContent = `ACTIVE STAGE SCENE • SCENE ${sceneNumStr} [${meta.hotkey}]`;
        }
        if (titleEl) {
            titleEl.textContent = `${meta.name}`;
        }
        if (subEl) {
            const tags = (meta.reactiveTags || [])
                .map(t => REACTIVE_TAG_DEFINITIONS[t]?.label || t)
                .join(' • ');
            subEl.textContent = `${meta.categoryLabel || 'Visual FX'}${tags ? ' • ' + tags : ''}`;
        }
        if (memPillEl) {
            if (isCustom) {
                memPillEl.textContent = '★ SAVED CONFIG';
                memPillEl.className = 'active-scene-pill custom';
            } else {
                memPillEl.textContent = 'DEFAULT';
                memPillEl.className = 'active-scene-pill';
            }
        }
        if (speedPillEl) {
            if (idx === 3) {
                const thresh = Math.round((vfx?.getHandoverThreshold ? vfx.getHandoverThreshold() : 0.85) * 100);
                speedPillEl.textContent = `🎚️ HANDOVER ${thresh}%`;
            } else if (isDeckReactiveLockedScene(idx)) {
                speedPillEl.textContent = '🔒 DECK SYNC';
            } else {
                speedPillEl.textContent = `⚡ ${Number(speed).toFixed(2)}x`;
            }
        }
        if (videoBtnEl) {
            // Show quick video library button prominently when on Scene 23, or compactly otherwise
            videoBtnEl.style.display = (idx === 22) ? 'inline-flex' : 'none';
        }
        if (cogBtnEl) {
            cogBtnEl.dataset.sceneId = String(idx);
            cogBtnEl.classList.toggle('customized', isCustom);
            cogBtnEl.title = `Configure Scene ${sceneNumStr}: ${meta.name} (Speed, Branding Memory, Macro & Lighting)`;
        }
    }

    // -------------------------------------------------------------------------
    // 3. Build & Manage Scene Configuration Pop-Out Modal
    // -------------------------------------------------------------------------
    function ensureModalDOM() {
        if (modalBackdrop) return modalBackdrop;
        modalBackdrop = document.getElementById('scene-cog-modal-backdrop');
        if (modalBackdrop) return modalBackdrop;

        modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'scene-cog-modal-backdrop';
        modalBackdrop.className = 'scene-cog-modal-backdrop';
        modalBackdrop.innerHTML = `
            <div class="scene-cog-modal" role="dialog" aria-modal="true" aria-labelledby="scene-cog-modal-title">
                <div class="scene-cog-header">
                    <div class="scene-cog-header-left">
                        <div class="scene-cog-icon-box" id="scene-cog-icon">✨</div>
                        <div>
                            <div class="scene-cog-eyebrow" id="scene-cog-eyebrow">SCENE 01 CONFIGURATION • HOTKEY [1]</div>
                            <div class="scene-cog-title" id="scene-cog-modal-title">Scene 01: 3D Studio EQ</div>
                            <div class="scene-cog-subtitle" id="scene-cog-subtitle">Equalizers & Decks</div>
                        </div>
                    </div>
                    <div class="scene-cog-header-right">
                        <span class="scene-cog-status-pill" id="scene-cog-stage-pill">● LIVE ON STAGE</span>
                        <button type="button" class="scene-cog-switch-btn" id="btn-scene-cog-activate" style="display:none;">▶ MAKE ACTIVE ON STAGE</button>
                        <button type="button" class="scene-cog-close-btn" id="btn-scene-cog-close" title="Close [Esc]">✕</button>
                    </div>
                </div>

                <div class="scene-cog-body">
                    <!-- SECTION 1: EFFECT SPEED OR HELLFIRE HANDOVER -->
                    <div class="scene-cog-card" id="scene-cog-speed-section">
                        <div class="scene-cog-card-header">
                            <div>
                                <div class="scene-cog-card-title">⚡ SCENE EFFECT ANIMATION SPEED</div>
                                <div class="scene-cog-card-desc">Adjust shader, particle, laser, and camera choreography speed for this scene</div>
                            </div>
                            <span class="scene-cog-val-badge" id="scene-cog-speed-val">1.00x (Normal)</span>
                        </div>
                        <div class="scene-cog-slider-wrap">
                            <span class="scene-cog-bound">0.1x</span>
                            <input type="range" id="slider-scene-cog-speed" min="0.1" max="3.0" step="0.05" value="1.0">
                            <span class="scene-cog-bound">3.0x</span>
                        </div>
                        <div class="scene-cog-preset-row" id="scene-cog-speed-presets">
                            <button type="button" class="scene-cog-preset-btn" data-speed="0.25">0.25x Chill</button>
                            <button type="button" class="scene-cog-preset-btn" data-speed="0.5">0.5x Slow</button>
                            <button type="button" class="scene-cog-preset-btn active" data-speed="1.0">1.0x Normal</button>
                            <button type="button" class="scene-cog-preset-btn" data-speed="1.5">1.5x Energetic</button>
                            <button type="button" class="scene-cog-preset-btn" data-speed="2.0">2.0x Fast</button>
                            <button type="button" class="scene-cog-preset-btn" data-speed="3.0">3.0x Hyper</button>
                        </div>
                    </div>

                    <!-- SECTION 1B: HELLFIRE WAVEFORMS FADER HANDOVER TOLERANCE (Exclusively for Scene 04 / FX 3) -->
                    <div class="scene-cog-card hellfire-special" id="scene-cog-hellfire-section" style="display:none;">
                        <div class="scene-cog-card-header">
                            <div>
                                <div class="scene-cog-card-title">🔥 HELLFIRE FADER HANDOVER TOLERANCE</div>
                                <div class="scene-cog-card-desc">Incoming deck channel fader level required before top track waveform & lead header switch over</div>
                            </div>
                            <span class="scene-cog-val-badge" id="label-handover-tolerance-val">85% (Fader Threshold)</span>
                        </div>
                        <div class="scene-cog-slider-wrap">
                            <span class="scene-cog-bound">50%</span>
                            <input type="range" id="slider-handover-tolerance" min="50" max="95" step="1" value="85">
                            <span class="scene-cog-bound">95%</span>
                        </div>
                        <div class="scene-cog-preset-row">
                            <button type="button" class="scene-cog-handover-preset" data-thresh="65">65% Quick Blend</button>
                            <button type="button" class="scene-cog-handover-preset" data-thresh="75">75% Smooth Mix</button>
                            <button type="button" class="scene-cog-handover-preset active" data-thresh="85">85% Club Standard</button>
                            <button type="button" class="scene-cog-handover-preset" data-thresh="92">92% Full Slam</button>
                        </div>
                        <div class="scene-cog-deck-lock-note">
                            🔒 <strong>Deck-Reactive Scene:</strong> Waveform scrolling speed is locked 1:1 to live DJ deck platter & StageLinQ track telemetry.
                        </div>
                    </div>

                    <!-- SECTION 1C: DECK / CLOCK LOCKED NOTICE FOR SCENE 16 -->
                    <div class="scene-cog-card" id="scene-cog-clock-section" style="display:none;">
                        <div class="scene-cog-deck-lock-note">
                            ⏱️ <strong>Precision Clock & Bar Counter Scene:</strong> Timing is locked 1:1 to atomic clock seconds and live DJ deck bar counters.
                        </div>
                    </div>

                    <!-- SECTION 2: PERFORMANCE MACRO FADERS FOR THIS SCENE -->
                    <div class="scene-cog-card">
                        <div class="scene-cog-card-header">
                            <div>
                                <div class="scene-cog-card-title">🎚️ PERFORMANCE MACRO FADERS (PER-SCENE)</div>
                                <div class="scene-cog-card-desc">Fine-tune audio punch, beat sensitivity & neon bloom for this scene</div>
                            </div>
                            <span class="scene-cog-val-badge" id="scene-cog-macro-badge">LIVE SYNC</span>
                        </div>
                        <div class="scene-cog-macro-grid">
                            <div class="scene-cog-macro-item">
                                <div class="scene-cog-macro-label">
                                    <span>🔊 BASS GAIN</span>
                                    <span id="scene-cog-gain-val">1.0x</span>
                                </div>
                                <input type="range" id="slider-scene-cog-gain" min="0.2" max="3.0" step="0.1" value="1.0">
                            </div>
                            <div class="scene-cog-macro-item">
                                <div class="scene-cog-macro-label">
                                    <span>💥 SENSITIVITY</span>
                                    <span id="scene-cog-sens-val">1.0x</span>
                                </div>
                                <input type="range" id="slider-scene-cog-sens" min="0.2" max="3.0" step="0.1" value="1.0">
                            </div>
                            <div class="scene-cog-macro-item">
                                <div class="scene-cog-macro-label">
                                    <span>✨ BLOOM GLOW</span>
                                    <span id="scene-cog-bloom-val">0.35x</span>
                                </div>
                                <input type="range" id="slider-scene-cog-bloom" min="0.0" max="2.0" step="0.05" value="0.35">
                            </div>
                        </div>
                    </div>

                    <!-- SECTION 3: SNAPSHOT SUMMARY OF BRANDING, MACRO & LIGHTING -->
                    <div class="scene-cog-card">
                        <div class="scene-cog-card-header">
                            <div>
                                <div class="scene-cog-card-title">📸 SCENE MEMORY SNAPSHOT (BRANDING, MACRO & LIGHTING)</div>
                                <div class="scene-cog-card-desc">Clicking <strong>"Remember Config"</strong> saves all current slider & position settings below specifically for this scene</div>
                            </div>
                            <span class="scene-cog-val-badge" id="scene-cog-custom-status">FACTORY DEFAULT</span>
                        </div>
                        <div class="scene-cog-snapshot-grid" id="scene-cog-snapshot-grid"></div>
                        <div class="scene-cog-quick-links">
                            <button type="button" class="scene-cog-link-btn" id="btn-scene-cog-goto-branding">🎨 Tweak DJ / Station / Flyer Sliders</button>
                            <button type="button" class="scene-cog-link-btn" id="btn-scene-cog-goto-lighting">💡 Tweak Hue & DMX Lighting</button>
                        </div>
                    </div>
                </div>

                <div class="scene-cog-footer">
                    <button type="button" class="scene-cog-btn-reset" id="btn-scene-cog-reset" title="Reset this specific scene back to its initial factory build state">
                        ↺ RESET TO INITIAL BUILD STATE
                    </button>
                    <div class="scene-cog-footer-right">
                        <button type="button" class="scene-cog-btn-remember" id="btn-scene-cog-remember" title="Remember all current DJ/Station/Flyer branding positions, spins, speeds, Macro Faders & Lighting settings for this scene">
                            💾 REMEMBER CONFIG FOR SCENE
                        </button>
                        <button type="button" class="scene-cog-btn-done" id="btn-scene-cog-done">
                            ✓ DONE
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalBackdrop);
        bindModalEvents();
        return modalBackdrop;
    }

    function bindModalEvents() {
        const closeBtn = document.getElementById('btn-scene-cog-close');
        const doneBtn = document.getElementById('btn-scene-cog-done');
        const activateBtn = document.getElementById('btn-scene-cog-activate');
        const speedSlider = document.getElementById('slider-scene-cog-speed');
        const speedPresets = document.querySelectorAll('#scene-cog-speed-presets .scene-cog-preset-btn');
        const handoverSlider = document.getElementById('slider-handover-tolerance');
        const handoverPresets = document.querySelectorAll('.scene-cog-handover-preset');
        const gainSlider = document.getElementById('slider-scene-cog-gain');
        const sensSlider = document.getElementById('slider-scene-cog-sens');
        const bloomSlider = document.getElementById('slider-scene-cog-bloom');
        const rememberBtn = document.getElementById('btn-scene-cog-remember');
        const resetBtn = document.getElementById('btn-scene-cog-reset');
        const gotoBrandingBtn = document.getElementById('btn-scene-cog-goto-branding');
        const gotoLightingBtn = document.getElementById('btn-scene-cog-goto-lighting');

        if (closeBtn) closeBtn.addEventListener('click', closeSceneConfigModal);
        if (doneBtn) doneBtn.addEventListener('click', closeSceneConfigModal);
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', (e) => {
                if (e.target === modalBackdrop) closeSceneConfigModal();
            });
        }

        if (activateBtn) {
            activateBtn.addEventListener('click', () => {
                if (typeof selectFX === 'function') {
                    selectFX(activeConfigSceneId);
                    renderModalState(activeConfigSceneId);
                }
            });
        }

        // Effect Speed Slider
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val)) return;
                applySpeedToScene(activeConfigSceneId, val);
            });
        }

        speedPresets.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseFloat(btn.getAttribute('data-speed'));
                if (!isNaN(val)) {
                    if (speedSlider) speedSlider.value = String(val);
                    applySpeedToScene(activeConfigSceneId, val);
                }
            });
        });

        // Hellfire Handover Tolerance Slider (Scene 04 / FX 3)
        if (handoverSlider) {
            handoverSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val)) return;
                applyHandoverTolerance(val);
            });
        }

        handoverPresets.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-thresh'), 10);
                if (!isNaN(val)) {
                    if (handoverSlider) handoverSlider.value = String(val);
                    applyHandoverTolerance(val);
                }
            });
        });

        // Macro Faders inside modal -> sync with main console sliders
        if (gainSlider) {
            gainSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const mainSlider = document.getElementById('slider-gain');
                if (mainSlider) {
                    mainSlider.value = String(val);
                    mainSlider.dispatchEvent(new Event('input', { bubbles: true }));
                }
                SceneProfileManager.updateParam(activeConfigSceneId, 'macro', 'gain', val);
                const label = document.getElementById('scene-cog-gain-val');
                if (label) label.textContent = `${val.toFixed(1)}x`;
                renderSnapshotSummary(activeConfigSceneId);
                refreshAllSceneCardBadges();
                updateActiveSceneBanner();
            });
        }

        if (sensSlider) {
            sensSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const mainSlider = document.getElementById('slider-sens');
                if (mainSlider) {
                    mainSlider.value = String(val);
                    mainSlider.dispatchEvent(new Event('input', { bubbles: true }));
                }
                SceneProfileManager.updateParam(activeConfigSceneId, 'macro', 'sens', val);
                const label = document.getElementById('scene-cog-sens-val');
                if (label) label.textContent = `${val.toFixed(1)}x`;
                renderSnapshotSummary(activeConfigSceneId);
                refreshAllSceneCardBadges();
                updateActiveSceneBanner();
            });
        }

        if (bloomSlider) {
            bloomSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const mainSlider = document.getElementById('slider-bloom');
                if (mainSlider) {
                    mainSlider.value = String(val);
                    mainSlider.dispatchEvent(new Event('input', { bubbles: true }));
                }
                SceneProfileManager.updateParam(activeConfigSceneId, 'macro', 'bloom', val);
                const label = document.getElementById('scene-cog-bloom-val');
                if (label) label.textContent = `${val.toFixed(2)}x`;
                renderSnapshotSummary(activeConfigSceneId);
                refreshAllSceneCardBadges();
                updateActiveSceneBanner();
            });
        }

        // Remember Config Button
        if (rememberBtn) {
            rememberBtn.addEventListener('click', () => {
                rememberSceneConfig(activeConfigSceneId);
            });
        }

        // Reset Scene Button
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                resetSceneToInitialBuildState(activeConfigSceneId);
            });
        }

        // Quick Console Links
        if (gotoBrandingBtn) {
            gotoBrandingBtn.addEventListener('click', () => {
                closeSceneConfigModal();
                if (typeof switchTab === 'function') switchTab('branding');
            });
        }
        if (gotoLightingBtn) {
            gotoLightingBtn.addEventListener('click', () => {
                closeSceneConfigModal();
                if (typeof switchTab === 'function') switchTab('lighting');
            });
        }
    }

    function applySpeedToScene(sceneId, speedVal) {
        const clamped = Math.max(0.1, Math.min(3.0, Number(speedVal) || 1.0));
        if (vfx && typeof vfx.setSceneSpeed === 'function') {
            vfx.setSceneSpeed(sceneId, clamped);
        }
        SceneProfileManager.updateParam(sceneId, 'fx', 'speed', clamped);

        const speedValBadge = document.getElementById('scene-cog-speed-val');
        if (speedValBadge) {
            const desc = Math.abs(clamped - 1.0) < 0.03 ? 'Normal' : (clamped < 1.0 ? 'Slow-Mo' : 'Accelerated');
            speedValBadge.textContent = `${clamped.toFixed(2)}x (${desc})`;
        }

        const speedPresets = document.querySelectorAll('#scene-cog-speed-presets .scene-cog-preset-btn');
        speedPresets.forEach(btn => {
            const p = parseFloat(btn.getAttribute('data-speed'));
            btn.classList.toggle('active', Math.abs(p - clamped) < 0.03);
        });

        renderSnapshotSummary(sceneId);
        refreshAllSceneCardBadges();
        updateActiveSceneBanner();
    }

    function applyHandoverTolerance(val) {
        const clamped = Math.max(50, Math.min(95, Math.round(Number(val) || 85)));
        if (vfx && typeof vfx.setHandoverThreshold === 'function') {
            vfx.setHandoverThreshold(clamped / 100.0);
        }
        try {
            localStorage.setItem('dj_vfx_handover_threshold', String(clamped / 100.0));
        } catch (e) {}
        SceneProfileManager.updateParam(3, 'fx', 'handoverThreshold', clamped);

        const labelEl = document.getElementById('label-handover-tolerance-val');
        if (labelEl) {
            labelEl.textContent = `${clamped}% (Fader Threshold)`;
        }

        const handoverPresets = document.querySelectorAll('.scene-cog-handover-preset');
        handoverPresets.forEach(btn => {
            const p = parseInt(btn.getAttribute('data-thresh'), 10);
            btn.classList.toggle('active', p === clamped);
        });

        renderSnapshotSummary(3);
        refreshAllSceneCardBadges();
        updateActiveSceneBanner();
    }

    function rememberSceneConfig(sceneId) {
        const meta = getSceneMeta(sceneId);
        const existingProfile = SceneProfileManager.getProfile(sceneId);
        const liveSnapshot = typeof getCurrentConsoleSnapshot === 'function'
            ? getCurrentConsoleSnapshot(sceneId)
            : {};

        const speedSlider = document.getElementById('slider-scene-cog-speed');
        const currentSpeed = isDeckReactiveLockedScene(sceneId)
            ? 1.0
            : (speedSlider ? parseFloat(speedSlider.value) : (existingProfile?.fx?.speed ?? 1.0));

        const handoverSlider = document.getElementById('slider-handover-tolerance');
        const currentHandover = sceneId === 3 && handoverSlider
            ? parseInt(handoverSlider.value, 10)
            : (existingProfile?.fx?.handoverThreshold ?? 85);

        const newProfile = {
            djLogo: {
                ...DEFAULT_SCENE_PROFILE.djLogo,
                ...(existingProfile.djLogo || {}),
                ...(liveSnapshot.djLogo || {})
            },
            stationLogo: {
                ...DEFAULT_SCENE_PROFILE.stationLogo,
                ...(existingProfile.stationLogo || {}),
                ...(liveSnapshot.stationLogo || {})
            },
            flyer: {
                ...DEFAULT_SCENE_PROFILE.flyer,
                ...(existingProfile.flyer || {}),
                ...(liveSnapshot.flyer || {})
            },
            macro: {
                ...DEFAULT_SCENE_PROFILE.macro,
                ...(existingProfile.macro || {}),
                ...(liveSnapshot.macro || {})
            },
            fx: {
                speed: isNaN(currentSpeed) ? 1.0 : currentSpeed,
                handoverThreshold: isNaN(currentHandover) ? 85 : currentHandover
            },
            lighting: {
                ...DEFAULT_SCENE_PROFILE.lighting,
                ...(existingProfile.lighting || {}),
                ...(liveSnapshot.lighting || {})
            }
        };

        SceneProfileManager.setProfile(sceneId, newProfile);
        if (vfx && typeof vfx.setSceneSpeed === 'function' && !isDeckReactiveLockedScene(sceneId)) {
            vfx.setSceneSpeed(sceneId, newProfile.fx.speed);
        }

        renderModalState(sceneId);
        refreshAllSceneCardBadges();
        updateActiveSceneBanner();

        if (typeof showToast === 'function') {
            showToast(`💾 Scene ${String(sceneId + 1).padStart(2, '0')} (${meta.name}): Branding, Spin, Speed, Macro & Lighting Remembered!`);
        }
    }

    function resetSceneToInitialBuildState(sceneId) {
        const meta = getSceneMeta(sceneId);
        SceneProfileManager.resetScene(sceneId);

        if (vfx && typeof vfx.setSceneSpeed === 'function') {
            vfx.setSceneSpeed(sceneId, 1.0);
        }
        if (Number(sceneId) === 3 && vfx && typeof vfx.setHandoverThreshold === 'function') {
            vfx.setHandoverThreshold(0.85);
            try { localStorage.setItem('dj_vfx_handover_threshold', '0.85'); } catch (e) {}
        }

        const currentActive = (vfx && typeof vfx.getCurrentFX === 'function') ? vfx.getCurrentFX() : 0;
        if (currentActive === Number(sceneId) && typeof applySceneProfile === 'function') {
            applySceneProfile(sceneId, { forceResetToDefault: true });
        }

        renderModalState(sceneId);
        refreshAllSceneCardBadges();
        updateActiveSceneBanner();

        if (typeof showToast === 'function') {
            showToast(`↺ Scene ${String(sceneId + 1).padStart(2, '0')} (${meta.name}): Restored to Initial Factory Build State!`);
        }
    }

    function renderSnapshotSummary(sceneId) {
        const gridEl = document.getElementById('scene-cog-snapshot-grid');
        const statusEl = document.getElementById('scene-cog-custom-status');
        if (!gridEl) return;

        const profile = SceneProfileManager.getProfile(sceneId);
        const live = (typeof getCurrentConsoleSnapshot === 'function') ? getCurrentConsoleSnapshot(sceneId) : {};
        const isCurrentStageScene = ((vfx && typeof vfx.getCurrentFX === 'function') ? vfx.getCurrentFX() : 0) === Number(sceneId);

        // Display live values if this scene is currently on stage, or saved profile values otherwise
        const dj = isCurrentStageScene && live.djLogo ? live.djLogo : profile.djLogo;
        const st = isCurrentStageScene && live.stationLogo ? live.stationLogo : profile.stationLogo;
        const fl = isCurrentStageScene && live.flyer ? live.flyer : profile.flyer;
        const mc = isCurrentStageScene && live.macro ? live.macro : profile.macro;
        const lt = isCurrentStageScene && live.lighting ? live.lighting : profile.lighting;

        const isCustom = SceneProfileManager.isCustomized(sceneId);
        if (statusEl) {
            if (isCustom) {
                statusEl.textContent = '★ CUSTOM MEMORY SAVED';
                statusEl.className = 'scene-cog-val-badge custom';
            } else {
                statusEl.textContent = 'INITIAL BUILD DEFAULT';
                statusEl.className = 'scene-cog-val-badge';
            }
        }

        gridEl.innerHTML = `
            <div class="scene-cog-snap-col">
                <div class="scene-cog-snap-heading">🎨 (a) Branding & Spin</div>
                <div class="scene-cog-snap-row"><span>DJ Logo:</span> <strong>${dj.enabled ? 'ON' : 'OFF'} • ${(dj.position || 'center').toUpperCase()}</strong></div>
                <div class="scene-cog-snap-row"><span>DJ Spin / Size:</span> <strong>${(dj.spin || 'off').toUpperCase()} (${Number(dj.spinSpeed ?? 1).toFixed(1)}x) • ${Number(dj.scale ?? 1).toFixed(2)}x</strong></div>
                <div class="scene-cog-snap-row"><span>Station Logo:</span> <strong>${st.enabled ? 'ON' : 'OFF'} • ${(st.position || 'top-right').toUpperCase()} (${Number(st.scale ?? 1).toFixed(2)}x)</strong></div>
                <div class="scene-cog-snap-row"><span>Promo Flyer:</span> <strong>${fl.enabled ? 'ON' : 'OFF'} • ${(fl.position || 'bottom-right').toUpperCase()} (${Number(fl.scale ?? 0.85).toFixed(2)}x)</strong></div>
            </div>
            <div class="scene-cog-snap-col">
                <div class="scene-cog-snap-heading">🎚️ (b) Macro & Speed</div>
                <div class="scene-cog-snap-row"><span>Effect Speed:</span> <strong>${isDeckReactiveLockedScene(sceneId) ? '1.0x (Deck Locked)' : `${Number(profile.fx?.speed ?? 1.0).toFixed(2)}x`}</strong></div>
                <div class="scene-cog-snap-row"><span>Bass Gain:</span> <strong>${Number(mc.gain ?? 1.0).toFixed(1)}x</strong></div>
                <div class="scene-cog-snap-row"><span>Sensitivity:</span> <strong>${Number(mc.sens ?? 1.0).toFixed(1)}x</strong></div>
                <div class="scene-cog-snap-row"><span>Bloom Glow:</span> <strong>${Number(mc.bloom ?? 0.35).toFixed(2)}x</strong></div>
            </div>
            <div class="scene-cog-snap-col">
                <div class="scene-cog-snap-heading">💡 (c) Hue & DMX Rig</div>
                <div class="scene-cog-snap-row"><span>Philips Hue:</span> <strong>${lt.hueSync ? 'SYNC ON' : 'OFF'} (${lt.hueMode || 'screen_colors'})</strong></div>
                <div class="scene-cog-snap-row"><span>Hue Punch / Floor:</span> <strong>${lt.hueIntensity ?? 100}% / ${lt.hueMinBri ?? 5}%</strong></div>
                <div class="scene-cog-snap-row"><span>Kick Strobe:</span> <strong>${lt.hueKickStrobe ? 'ACTIVE' : 'OFF'}</strong></div>
                <div class="scene-cog-snap-row"><span>DMX Universe ${lt.dmxUniverse ?? 1}:</span> <strong>${lt.dmxMaster ?? 100}% Dimmer</strong></div>
            </div>
        `;
    }

    function renderModalState(sceneId) {
        ensureModalDOM();
        activeConfigSceneId = Number(sceneId) || 0;
        const meta = getSceneMeta(activeConfigSceneId);
        const profile = SceneProfileManager.getProfile(activeConfigSceneId);
        const currentStageFx = (vfx && typeof vfx.getCurrentFX === 'function') ? vfx.getCurrentFX() : 0;
        const isLiveOnStage = currentStageFx === activeConfigSceneId;

        const iconEl = document.getElementById('scene-cog-icon');
        const eyebrowEl = document.getElementById('scene-cog-eyebrow');
        const titleEl = document.getElementById('scene-cog-modal-title');
        const subEl = document.getElementById('scene-cog-subtitle');
        const stagePillEl = document.getElementById('scene-cog-stage-pill');
        const activateBtn = document.getElementById('btn-scene-cog-activate');

        if (iconEl) iconEl.textContent = meta.icon || '✨';
        if (eyebrowEl) eyebrowEl.textContent = `SCENE ${String(activeConfigSceneId + 1).padStart(2, '0')} CONFIGURATION • HOTKEY [${meta.hotkey}]`;
        if (titleEl) titleEl.textContent = `Scene ${String(activeConfigSceneId + 1).padStart(2, '0')}: ${meta.name}`;
        if (subEl) subEl.textContent = `${meta.categoryLabel} — ${meta.summary}`;

        if (stagePillEl) {
            stagePillEl.textContent = isLiveOnStage ? '● LIVE ON STAGE' : 'STANDBY SCENE';
            stagePillEl.className = 'scene-cog-status-pill ' + (isLiveOnStage ? 'live' : 'standby');
        }
        if (activateBtn) {
            activateBtn.style.display = isLiveOnStage ? 'none' : 'inline-flex';
        }

        // Toggle Speed vs Hellfire Handover vs Clock Lock sections
        const speedSection = document.getElementById('scene-cog-speed-section');
        const hellfireSection = document.getElementById('scene-cog-hellfire-section');
        const clockSection = document.getElementById('scene-cog-clock-section');

        if (activeConfigSceneId === 3) {
            if (speedSection) speedSection.style.display = 'none';
            if (hellfireSection) hellfireSection.style.display = 'block';
            if (clockSection) clockSection.style.display = 'none';

            const thresh = Math.round((vfx?.getHandoverThreshold ? vfx.getHandoverThreshold() : ((profile.fx?.handoverThreshold ?? 85) / 100)) * 100);
            const hSlider = document.getElementById('slider-handover-tolerance');
            const hLabel = document.getElementById('label-handover-tolerance-val');
            if (hSlider) hSlider.value = String(thresh);
            if (hLabel) hLabel.textContent = `${thresh}% (Fader Threshold)`;
            document.querySelectorAll('.scene-cog-handover-preset').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.getAttribute('data-thresh'), 10) === thresh);
            });
        } else if (activeConfigSceneId === 15) {
            if (speedSection) speedSection.style.display = 'none';
            if (hellfireSection) hellfireSection.style.display = 'none';
            if (clockSection) clockSection.style.display = 'block';
        } else {
            if (speedSection) speedSection.style.display = 'block';
            if (hellfireSection) hellfireSection.style.display = 'none';
            if (clockSection) clockSection.style.display = 'none';

            const curSpeed = profile?.fx?.speed ?? (vfx?.getSceneSpeed ? vfx.getSceneSpeed(activeConfigSceneId) : 1.0);
            const sSlider = document.getElementById('slider-scene-cog-speed');
            const sLabel = document.getElementById('scene-cog-speed-val');
            if (sSlider) sSlider.value = String(curSpeed);
            if (sLabel) {
                const desc = Math.abs(curSpeed - 1.0) < 0.03 ? 'Normal' : (curSpeed < 1.0 ? 'Slow-Mo' : 'Accelerated');
                sLabel.textContent = `${Number(curSpeed).toFixed(2)}x (${desc})`;
            }
            document.querySelectorAll('#scene-cog-speed-presets .scene-cog-preset-btn').forEach(btn => {
                const p = parseFloat(btn.getAttribute('data-speed'));
                btn.classList.toggle('active', Math.abs(p - curSpeed) < 0.03);
            });
        }

        // Macro Faders
        const gainVal = profile?.macro?.gain ?? 1.0;
        const sensVal = profile?.macro?.sens ?? 1.0;
        const bloomVal = profile?.macro?.bloom ?? 0.35;

        const gSlider = document.getElementById('slider-scene-cog-gain');
        const sSlider = document.getElementById('slider-scene-cog-sens');
        const bSlider = document.getElementById('slider-scene-cog-bloom');
        const gText = document.getElementById('scene-cog-gain-val');
        const sText = document.getElementById('scene-cog-sens-val');
        const bText = document.getElementById('scene-cog-bloom-val');

        if (gSlider) gSlider.value = String(gainVal);
        if (sSlider) sSlider.value = String(sensVal);
        if (bSlider) bSlider.value = String(bloomVal);
        if (gText) gText.textContent = `${Number(gainVal).toFixed(1)}x`;
        if (sText) sText.textContent = `${Number(sensVal).toFixed(1)}x`;
        if (bText) bText.textContent = `${Number(bloomVal).toFixed(2)}x`;

        renderSnapshotSummary(activeConfigSceneId);
    }

    function openSceneConfigModal(sceneId) {
        const targetId = (sceneId !== undefined && sceneId !== null)
            ? Number(sceneId)
            : ((vfx && typeof vfx.getCurrentFX === 'function') ? vfx.getCurrentFX() : 0);
        ensureModalDOM();
        renderModalState(targetId);
        modalBackdrop.classList.add('active');
    }

    function closeSceneConfigModal() {
        if (modalBackdrop) {
            modalBackdrop.classList.remove('active');
        }
    }

    // Wire up Active Scene Banner buttons on #pane-perform
    const activeSceneCogBtn = document.getElementById('btn-active-scene-cog');
    if (activeSceneCogBtn) {
        activeSceneCogBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentFx = (vfx && typeof vfx.getCurrentFX === 'function') ? vfx.getCurrentFX() : 0;
            openSceneConfigModal(currentFx);
        });
    }

    const activeSceneFxBankBtn = document.getElementById('btn-active-scene-fxbank');
    if (activeSceneFxBankBtn) {
        activeSceneFxBankBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof switchTab === 'function') switchTab('fx');
        });
    }

    // Initialize saved speeds for all 23 scenes from SceneProfileManager on startup
    for (let i = 0; i < 23; i++) {
        const p = SceneProfileManager.getProfile(i);
        if (p && p.fx) {
            if (!isDeckReactiveLockedScene(i) && p.fx.speed !== undefined && vfx && typeof vfx.setSceneSpeed === 'function') {
                vfx.setSceneSpeed(i, p.fx.speed);
            }
            if (i === 3 && p.fx.handoverThreshold !== undefined && vfx && typeof vfx.setHandoverThreshold === 'function') {
                vfx.setHandoverThreshold(p.fx.handoverThreshold / 100.0);
            }
        }
    }

    ensureModalDOM();
    injectCogButtonsOnSceneCards();
    updateActiveSceneBanner();

    SceneProfileManager.addListener(() => {
        refreshAllSceneCardBadges();
        updateActiveSceneBanner();
    });

    window.openSceneConfigModal = openSceneConfigModal;
    window.closeSceneConfigModal = closeSceneConfigModal;
    window.updateActiveSceneBanner = updateActiveSceneBanner;

    return {
        openSceneConfigModal,
        closeSceneConfigModal,
        updateActiveSceneBanner,
        refreshAllSceneCardBadges
    };
}

