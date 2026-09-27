import { setupAudio } from './audio.js';
import { createVFXScene } from './effects.js';
import { setupStageLinqClient } from './stagelinq.js';

// DJ-VFX Engine Build Metadata
const BUILD_VERSION = 'v2.8.0';
const BUILD_NUMBER = '20260927.1100.00';
const BUILD_TIME = '2026-09-27 11:00 BST';
console.log(
    `%c⚡ DJ-VFX ENGINE %c ${BUILD_VERSION} (Build #${BUILD_NUMBER}) %c- ONLINE [${BUILD_TIME}]`,
    'background:#ff007f; color:#fff; font-weight:bold; padding:4px 8px; border-radius:3px 0 0 3px;',
    'background:#00ffff; color:#020208; font-weight:bold; padding:4px 8px;',
    'background:#12121e; color:#00ffcc; font-weight:bold; padding:4px 8px; border-radius:0 3px 3px 0;'
);
window.__DJ_VFX_BUILD__ = {
    version: BUILD_VERSION,
    buildNumber: BUILD_NUMBER,
    buildTime: BUILD_TIME,
    timestamp: '2026-09-27T11:00:00+01:00'
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

    const hudBuildInfo = document.getElementById('hud-build-info');
    const footerBuildVersion = document.getElementById('footer-build-version');
    if (hudBuildInfo) hudBuildInfo.textContent = `${BUILD_VERSION} • ${BUILD_TIME}`;
    if (footerBuildVersion) footerBuildVersion.textContent = BUILD_VERSION;

    const eqBass = document.getElementById('eq-bass');
    const eqMid = document.getElementById('eq-mid');
    const eqTreble = document.getElementById('eq-treble');

    // Line-In Precision VU Meter & Loudness Elements
    const vuRmsFill = document.getElementById('vu-rms-fill');
    const vuPeakFill = document.getElementById('vu-peak-fill');
    const vuPeakHoldNeedle = document.getElementById('vu-peak-hold-needle');
    const vuValPeak = document.getElementById('vu-val-peak');
    const vuValLufs = document.getElementById('vu-val-lufs');
    const vuValHeadroom = document.getElementById('vu-val-headroom');
    const vuClipBadge = document.getElementById('vu-clip-badge');

    if (vuClipBadge) {
        vuClipBadge.addEventListener('click', () => {
            vuClipBadge.style.display = 'none';
        });
    }

    // Now Playing Track Banner Stream Overlay Elements & State
    const btnToggleTrackBanner = document.getElementById('btn-toggle-track-banner');
    const btnPopTrackBanner = document.getElementById('btn-pop-track-banner');
    const selectTrackDelay = document.getElementById('select-track-delay');
    const selectTrackDuration = document.getElementById('select-track-duration');
    const trackDeckBadge = document.getElementById('track-deck-badge');
    const trackBpmBadge = document.getElementById('track-bpm-badge');

    let isTrackBannerEnabled = true;
    let trackDelaySec = 10;
    let trackDurationSec = 30;
    let trackBannerDelayTimer = null;
    let trackBannerFadeTimer = null;

    const audioDeviceSelect = document.getElementById('audio-device-select');
    const btnListenAudio = document.getElementById('btn-listen-audio');
    const deckBadge1 = document.getElementById('deck-badge-1');
    const deckBadge2 = document.getElementById('deck-badge-2');

    // Philips Hue Lighting Elements
    const hueStatusBadge = document.getElementById('hue-status-badge');
    const btnHueToggle = document.getElementById('btn-hue-toggle');
    const btnHueSetup = document.getElementById('btn-hue-setup');
    const hueRoomSelect = document.getElementById('hue-room-select');
    const hueRoomCount = document.getElementById('hue-room-count');
    const hueModePills = document.querySelectorAll('#hue-mode-pills .mode-pill[data-hue-mode]');
    const sliderHueIntensity = document.getElementById('slider-hue-intensity');
    const hueIntensityVal = document.getElementById('hue-intensity-val');
    const sliderHueMinBri = document.getElementById('slider-hue-min-bri');
    const hueMinBriVal = document.getElementById('hue-min-bri-val');
    const btnHueTestStrobe = document.getElementById('btn-hue-test-strobe');

    // Philips Hue Modal Elements
    const hueModalBackdrop = document.getElementById('hue-modal-backdrop');
    const btnCloseHueModal = document.getElementById('btn-close-hue-modal');
    const btnCloseHueDone = document.getElementById('btn-close-hue-done');
    const inputHueIp = document.getElementById('input-hue-ip');
    const btnDiscoverHue = document.getElementById('btn-discover-hue');
    const btnDoPairHue = document.getElementById('btn-do-pair-hue');
    const huePairStatusMsg = document.getElementById('hue-pair-status-msg');

    let isHueActive = false;
    let hueCurrentMode = 'scene_sync';
    let hueCurrentIntensity = 0.85;
    let hueCurrentMinBri = 0.15;
    let hueTargetGroup = 'all';

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
    const TOTAL_FX = 18;

    // -------------------------------------------------------------------------
    // Cross-Window State & Audio Synchronizer (Detachable Console / 2nd Screen / OBS)
    // -------------------------------------------------------------------------
    const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dj_vfx_sync') : null;
    let remoteAudioData = null;
    let lastRemoteAudioTime = 0;

    // OBS Streaming & Modal DOM Elements
    const obsBlackoutCurtain = document.getElementById('obs-blackout-curtain');
    const toastNotify = document.getElementById('toast-notify');
    const obsModalBackdrop = document.getElementById('obs-modal-backdrop');
    const btnOpenObsModal = document.getElementById('btn-open-obs-modal');
    const btnObsFeedHud = document.getElementById('btn-obs-feed-hud');
    const btnCloseObsModal = document.getElementById('btn-close-obs-modal');
    const btnModalDone = document.getElementById('btn-modal-done');
    const btnCopyObsUrl = document.getElementById('btn-copy-obs-url');
    const obsUrlInput = document.getElementById('obs-url-input');
    const pillObsSolid = document.getElementById('pill-obs-solid');
    const pillObsOverlay = document.getElementById('pill-obs-overlay');
    const btnTestObsWindow = document.getElementById('btn-test-obs-window');
    const btnObsToggleOutput = document.getElementById('btn-obs-toggle-output');
    const btnObsToggleHud = document.getElementById('btn-obs-toggle-hud');
    const btnModalObsToggle = document.getElementById('btn-modal-obs-toggle');
    const btnObsToggleOverlay = document.getElementById('btn-obs-toggle-overlay');

    // IDE Activity Bar & Feature Group Panes Elements
    const activityTabs = document.querySelectorAll('.activity-tab[data-tab]');
    const tabPanes = document.querySelectorAll('.ide-tab-pane');
    const btnActAll = document.getElementById('btn-act-all');
    const activityLogoBtn = document.getElementById('activity-logo-btn');
    const dotAudio = document.getElementById('dot-audio');
    const dotHue = document.getElementById('dot-hue');
    const dotObs = document.getElementById('dot-obs');
    const audioDeviceBadge = document.getElementById('audio-device-badge');

    // Duplicate Controls inside Feature Panes
    const btnAutoVJPanel = document.getElementById('btn-auto-vj-panel');
    const btnFlashPanel = document.getElementById('btn-flash-panel');
    const btnObsPaneToggle = document.getElementById('btn-obs-pane-toggle');
    const btnObsPaneOverlay = document.getElementById('btn-obs-pane-overlay');
    const obsPaneUrlInput = document.getElementById('obs-pane-url-input');
    const btnPaneCopyObsUrl = document.getElementById('btn-pane-copy-obs-url');
    const btnPaneOpenModal = document.getElementById('btn-pane-open-modal');
    const btnPaneTestWindow = document.getElementById('btn-pane-test-window');

    const tabOrder = ['audio', 'glow', 'logo', 'hue', 'obs'];
    let currentTabIndex = 0;

    function switchTab(tabId) {
        if (hud) hud.classList.remove('show-all-panes');
        if (btnActAll) btnActAll.classList.remove('active');

        activityTabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
        });

        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `pane-${tabId}`);
        });
    }

    // Activity Bar Tab Click Listeners
    activityTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            if (tabId) {
                currentTabIndex = tabOrder.indexOf(tabId);
                if (currentTabIndex === -1) currentTabIndex = 0;
                switchTab(tabId);
            }
        });
    });

    // App Logo Button cycles through tabs
    if (activityLogoBtn) {
        activityLogoBtn.addEventListener('click', () => {
            currentTabIndex = (currentTabIndex + 1) % tabOrder.length;
            switchTab(tabOrder[currentTabIndex]);
        });
    }

    // Show All Panels / Compact Toggle
    if (btnActAll) {
        btnActAll.addEventListener('click', () => {
            const isAll = hud.classList.toggle('show-all-panes');
            btnActAll.classList.toggle('active', isAll);
            if (isAll) {
                activityTabs.forEach(tab => tab.classList.remove('active'));
            } else {
                switchTab(tabOrder[currentTabIndex] || 'audio');
            }
        });
    }

    let isOBSOutputLive = true;

    // Toast Helper
    let toastTimer = null;
    function showToast(msg) {
        if (!toastNotify) return;
        toastNotify.textContent = msg;
        toastNotify.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastNotify.classList.remove('show');
        }, 2400);
    }

    const btnDetachConsole = document.getElementById('btn-detach-console');
    if (btnDetachConsole) {
        btnDetachConsole.addEventListener('click', () => {
            const controllerUrl = `${window.location.origin}${window.location.pathname}?mode=controller`;
            window.open(controllerUrl, 'DJ_VFX_MASTER_CONSOLE', 'width=1380,height=880,menubar=no,toolbar=no,location=no,status=no');
        });
    }

    const btnPopout = document.getElementById('btn-popout');
    if (btnPopout) {
        btnPopout.addEventListener('click', () => {
            const popoutUrl = `${window.location.origin}${window.location.pathname}?clean=true`;
            window.open(popoutUrl, 'DJ_VFX_2ND_SCREEN', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
        });
    }

    const btnLaunchStage = document.getElementById('btn-launch-stage');
    if (btnLaunchStage) {
        btnLaunchStage.addEventListener('click', () => {
            const popoutUrl = `${window.location.origin}${window.location.pathname}?clean=true`;
            window.open(popoutUrl, 'DJ_VFX_2ND_SCREEN', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
        });
    }

    // Check URL Mode Parameters (Controller vs Clean Stage Display vs OBS Browser Source)
    const urlParams = new URLSearchParams(window.location.search);
    const isControllerMode = urlParams.get('mode') === 'controller' || window.location.hash.includes('controller');
    const isOBSMode = urlParams.get('mode') === 'obs' || window.location.hash.includes('obs');
    const isCleanDisplay = urlParams.get('clean') === 'true' || urlParams.get('mode') === 'stage' || isOBSMode || window.location.hash.includes('clean');
    let isOBSOverlayActive = urlParams.get('overlay') === 'true' || window.location.hash.includes('overlay');

    if (isOBSOverlayActive) {
        document.documentElement.classList.add('obs-transparent-mode');
        document.body.classList.add('obs-transparent-mode');
    }

    if (isControllerMode) {
        document.body.classList.add('controller-mode');
        document.title = 'DJ VFX - Master Control Console';
        if (hudStatus) {
            hudStatus.textContent = 'MASTER CONSOLE';
            hudStatus.style.borderColor = '#ff00ff';
            hudStatus.style.color = '#ff00ff';
        }
        console.log('[DJ-VFX] 🎛️ Detached Master Console Active (Broadcasting to Stage Displays & OBS)');
    }

    if (isCleanDisplay) {
        document.body.classList.add('stage-mode');
        if (isOBSMode) document.body.classList.add('obs-mode');
        if (hud) hud.classList.add('hidden');
        if (fxBankPanel) fxBankPanel.classList.add('hidden');
        if (trackBanner) trackBanner.classList.add('banner-hidden');
        document.body.style.cursor = 'none';
        console.log('[DJ-VFX] 🖥️ Clean Visualizer / OBS Stream Mode Active (Receiving Live Sync)');
    }

    // -------------------------------------------------------------------------
    // Now Playing Track Banner Stream Overlay Manager
    // -------------------------------------------------------------------------
    function setTrackBannerVisibility(show) {
        if (!trackBanner) return;
        if (show && isTrackBannerEnabled) {
            trackBanner.classList.remove('banner-hidden', 'hidden');
        } else {
            trackBanner.classList.add('banner-hidden');
        }
    }

    function triggerTrackBannerPopup(trackData, broadcast = true) {
        if (trackBannerDelayTimer) clearTimeout(trackBannerDelayTimer);
        if (trackBannerFadeTimer) clearTimeout(trackBannerFadeTimer);

        if (trackData) {
            if (trackTitle && trackData.title) trackTitle.textContent = trackData.title;
            if (trackArtist && trackData.artist) trackArtist.textContent = trackData.artist;
            if (trackDeckBadge && trackData.deck) trackDeckBadge.textContent = `DECK ${trackData.deck}`;
            if (trackBpmBadge && trackData.bpm) trackBpmBadge.textContent = `${Number(trackData.bpm).toFixed(1)} BPM`;
        }

        if (!isTrackBannerEnabled) {
            setTrackBannerVisibility(false);
            return;
        }

        // Apply trigger delay (e.g. 10s into track)
        if (trackDelaySec > 0) {
            setTrackBannerVisibility(false);
            trackBannerDelayTimer = setTimeout(() => {
                setTrackBannerVisibility(true);

                // Auto-fadeout duration
                if (trackDurationSec > 0) {
                    trackBannerFadeTimer = setTimeout(() => {
                        setTrackBannerVisibility(false);
                    }, trackDurationSec * 1000);
                }
            }, trackDelaySec * 1000);
        } else {
            // Immediate
            setTrackBannerVisibility(true);
            if (trackDurationSec > 0) {
                trackBannerFadeTimer = setTimeout(() => {
                    setTrackBannerVisibility(false);
                }, trackDurationSec * 1000);
            }
        }

        if (broadcast && syncChannel) {
            syncChannel.postMessage({
                type: 'trigger_track_banner',
                trackData,
                delay: trackDelaySec,
                duration: trackDurationSec
            });
        }
    }

    function setTrackBannerEnabled(enabled, broadcast = true) {
        isTrackBannerEnabled = !!enabled;
        if (btnToggleTrackBanner) {
            btnToggleTrackBanner.textContent = isTrackBannerEnabled ? '🟢 TRACK OVERLAY: ON' : '⚪ TRACK OVERLAY: OFF';
            btnToggleTrackBanner.style.color = isTrackBannerEnabled ? '#00ffcc' : 'rgba(255,255,255,0.7)';
            btnToggleTrackBanner.style.borderColor = isTrackBannerEnabled ? '#00ffcc' : 'rgba(255,255,255,0.2)';
            btnToggleTrackBanner.style.background = isTrackBannerEnabled ? 'rgba(0,255,204,0.18)' : 'rgba(255,255,255,0.06)';
        }
        if (!isTrackBannerEnabled) {
            setTrackBannerVisibility(false);
        }
        showToast(isTrackBannerEnabled ? '🎛️ Track Stream Overlay: ENABLED' : '⚪ Track Stream Overlay: OFF');
        if (broadcast && syncChannel) {
            syncChannel.postMessage({ type: 'set_track_banner_enabled', enabled: isTrackBannerEnabled });
        }
    }

    if (btnToggleTrackBanner) {
        btnToggleTrackBanner.addEventListener('click', () => setTrackBannerEnabled(!isTrackBannerEnabled, true));
    }

    if (btnPopTrackBanner) {
        btnPopTrackBanner.addEventListener('click', () => {
            if (trackBannerDelayTimer) clearTimeout(trackBannerDelayTimer);
            if (trackBannerFadeTimer) clearTimeout(trackBannerFadeTimer);

            setTrackBannerVisibility(true);
            showToast('🎛️ Popped Track Banner on Stream');

            if (trackDurationSec > 0) {
                trackBannerFadeTimer = setTimeout(() => {
                    setTrackBannerVisibility(false);
                }, trackDurationSec * 1000);
            }

            if (syncChannel) {
                syncChannel.postMessage({
                    type: 'pop_track_banner_now',
                    duration: trackDurationSec
                });
            }
        });
    }

    if (selectTrackDelay) {
        selectTrackDelay.addEventListener('change', (e) => {
            trackDelaySec = parseInt(e.target.value, 10) || 0;
            showToast(`⏳ Track Delay: ${trackDelaySec}s into track`);
            if (syncChannel) syncChannel.postMessage({ type: 'set_track_delay', delay: trackDelaySec });
        });
    }

    if (selectTrackDuration) {
        selectTrackDuration.addEventListener('change', (e) => {
            trackDurationSec = parseInt(e.target.value, 10) || 0;
            showToast(trackDurationSec > 0 ? `⏱️ Display Duration: ${trackDurationSec}s` : '🔒 Track Banner: Stay ON (Always Visible)');
            if (syncChannel) syncChannel.postMessage({ type: 'set_track_duration', duration: trackDurationSec });
        });
    }

    function setOBSOutputLive(live, broadcast = true) {
        isOBSOutputLive = !!live;
        if (obsBlackoutCurtain) {
            obsBlackoutCurtain.classList.toggle('blackout-active', !isOBSOutputLive);
        }

        const liveColor = '#00ffcc';
        const liveBg = 'rgba(0, 255, 204, 0.18)';
        const liveBorder = '#00ffcc';

        const mutedColor = '#ff3366';
        const mutedBg = 'rgba(255, 51, 102, 0.22)';
        const mutedBorder = '#ff3366';

        if (btnObsToggleOutput) {
            btnObsToggleOutput.textContent = isOBSOutputLive ? '🟢 OBS OUT: LIVE' : '⬛ OBS OUT: MUTED';
            btnObsToggleOutput.style.color = isOBSOutputLive ? liveColor : mutedColor;
            btnObsToggleOutput.style.borderColor = isOBSOutputLive ? liveBorder : mutedBorder;
            btnObsToggleOutput.style.background = isOBSOutputLive ? liveBg : mutedBg;
        }
        if (btnObsToggleHud) {
            btnObsToggleHud.textContent = isOBSOutputLive ? '🟢 OBS' : '⬛ OBS';
            btnObsToggleHud.style.color = isOBSOutputLive ? liveColor : mutedColor;
            btnObsToggleHud.style.borderColor = isOBSOutputLive ? liveBorder : mutedBorder;
            btnObsToggleHud.style.background = isOBSOutputLive ? liveBg : mutedBg;
        }
        if (btnObsPaneToggle) {
            btnObsPaneToggle.textContent = isOBSOutputLive ? '🟢 OBS OUT: LIVE' : '⬛ OBS OUT: MUTED';
            btnObsPaneToggle.style.color = isOBSOutputLive ? liveColor : mutedColor;
            btnObsPaneToggle.style.borderColor = isOBSOutputLive ? liveBorder : mutedBorder;
            btnObsPaneToggle.style.background = isOBSOutputLive ? liveBg : mutedBg;
        }
        if (btnModalObsToggle) {
            btnModalObsToggle.textContent = isOBSOutputLive ? '🟢 OBS OUT: LIVE' : '⬛ OBS OUT: MUTED (BLACKOUT)';
            btnModalObsToggle.style.color = isOBSOutputLive ? liveColor : mutedColor;
            btnModalObsToggle.style.borderColor = isOBSOutputLive ? liveBorder : mutedBorder;
            btnModalObsToggle.style.background = isOBSOutputLive ? liveBg : mutedBg;
        }

        const tabObs = document.querySelector('.activity-tab[data-tab="obs"]');
        if (tabObs) tabObs.classList.toggle('has-dot', isOBSOutputLive);

        if (broadcast && syncChannel) {
            syncChannel.postMessage({ type: 'set_obs_output', live: isOBSOutputLive });
            showToast(isOBSOutputLive ? '📡 OBS Feed: LIVE (Broadcasting)' : '⬛ OBS Feed: MUTED (Blackout)');
        }
    }

    function updateObsUrlBox() {
        const baseUrl = `${window.location.origin}${window.location.pathname}?mode=obs`;
        const fullUrl = isOBSOverlayActive ? `${baseUrl}&overlay=true` : baseUrl;
        if (obsUrlInput) obsUrlInput.value = fullUrl;
        if (obsPaneUrlInput) obsPaneUrlInput.value = fullUrl;
        if (pillObsSolid && pillObsOverlay) {
            pillObsSolid.classList.toggle('active', !isOBSOverlayActive);
            pillObsOverlay.classList.toggle('active', isOBSOverlayActive);
        }
    }

    function setOBSOverlayMode(overlay, broadcast = true) {
        isOBSOverlayActive = !!overlay;
        document.documentElement.classList.toggle('obs-transparent-mode', isOBSOverlayActive);
        document.body.classList.toggle('obs-transparent-mode', isOBSOverlayActive);

        if (btnObsToggleOverlay) {
            btnObsToggleOverlay.textContent = isOBSOverlayActive ? '🎭 OBS: TRANSPARENT' : '🎭 OBS: SOLID';
            btnObsToggleOverlay.style.color = isOBSOverlayActive ? '#00ffff' : '#ff66ff';
            btnObsToggleOverlay.style.borderColor = isOBSOverlayActive ? '#00ffff' : '#ff00ff';
        }
        if (btnObsPaneOverlay) {
            btnObsPaneOverlay.textContent = isOBSOverlayActive ? '🎭 OBS: TRANSPARENT' : '🎭 OBS: SOLID';
            btnObsPaneOverlay.style.color = isOBSOverlayActive ? '#00ffff' : '#ff66ff';
            btnObsPaneOverlay.style.borderColor = isOBSOverlayActive ? '#00ffff' : '#ff00ff';
        }

        updateObsUrlBox();

        if (broadcast && syncChannel) {
            syncChannel.postMessage({ type: 'set_obs_overlay', overlay: isOBSOverlayActive });
            showToast(isOBSOverlayActive ? '🎭 OBS Mode: Transparent Camera Overlay' : '🌟 OBS Mode: Solid Stage Visuals');
        }
    }

    // Modal Listeners
    if (btnOpenObsModal) btnOpenObsModal.addEventListener('click', () => { updateObsUrlBox(); if (obsModalBackdrop) obsModalBackdrop.classList.add('active'); });
    if (btnObsFeedHud) btnObsFeedHud.addEventListener('click', () => { updateObsUrlBox(); if (obsModalBackdrop) obsModalBackdrop.classList.add('active'); });
    if (btnPaneOpenModal) btnPaneOpenModal.addEventListener('click', () => { updateObsUrlBox(); if (obsModalBackdrop) obsModalBackdrop.classList.add('active'); });
    if (btnCloseObsModal) btnCloseObsModal.addEventListener('click', () => { if (obsModalBackdrop) obsModalBackdrop.classList.remove('active'); });
    if (btnModalDone) btnModalDone.addEventListener('click', () => { if (obsModalBackdrop) obsModalBackdrop.classList.remove('active'); });
    if (obsModalBackdrop) {
        obsModalBackdrop.addEventListener('click', (e) => {
            if (e.target === obsModalBackdrop) obsModalBackdrop.classList.remove('active');
        });
    }

    if (pillObsSolid) {
        pillObsSolid.addEventListener('click', () => setOBSOverlayMode(false, true));
    }
    if (pillObsOverlay) {
        pillObsOverlay.addEventListener('click', () => setOBSOverlayMode(true, true));
    }

    if (btnCopyObsUrl) {
        btnCopyObsUrl.addEventListener('click', () => {
            if (obsUrlInput) {
                navigator.clipboard.writeText(obsUrlInput.value).then(() => {
                    showToast('📋 Copied OBS Browser Source URL!');
                }).catch(() => {
                    obsUrlInput.select();
                    document.execCommand('copy');
                    showToast('📋 Copied OBS Browser Source URL!');
                });
            }
        });
    }

    if (btnPaneCopyObsUrl) {
        btnPaneCopyObsUrl.addEventListener('click', () => {
            const urlToCopy = obsPaneUrlInput ? obsPaneUrlInput.value : (obsUrlInput ? obsUrlInput.value : `${window.location.origin}${window.location.pathname}?mode=obs`);
            navigator.clipboard.writeText(urlToCopy).then(() => {
                showToast('📋 Copied OBS Browser Source URL!');
            }).catch(() => {
                if (obsPaneUrlInput) {
                    obsPaneUrlInput.select();
                    document.execCommand('copy');
                }
                showToast('📋 Copied OBS Browser Source URL!');
            });
        });
    }

    if (btnTestObsWindow) {
        btnTestObsWindow.addEventListener('click', () => {
            const url = obsUrlInput ? obsUrlInput.value : `${window.location.origin}${window.location.pathname}?mode=obs`;
            window.open(url, 'DJ_VFX_OBS_PREVIEW', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
        });
    }

    if (btnPaneTestWindow) {
        btnPaneTestWindow.addEventListener('click', () => {
            const url = obsPaneUrlInput ? obsPaneUrlInput.value : `${window.location.origin}${window.location.pathname}?mode=obs`;
            window.open(url, 'DJ_VFX_OBS_PREVIEW', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
        });
    }

    if (btnObsToggleOutput) {
        btnObsToggleOutput.addEventListener('click', () => setOBSOutputLive(!isOBSOutputLive, true));
    }
    if (btnObsPaneToggle) {
        btnObsPaneToggle.addEventListener('click', () => setOBSOutputLive(!isOBSOutputLive, true));
    }
    if (btnObsToggleHud) {
        btnObsToggleHud.addEventListener('click', () => setOBSOutputLive(!isOBSOutputLive, true));
    }
    if (btnModalObsToggle) {
        btnModalObsToggle.addEventListener('click', () => setOBSOutputLive(!isOBSOutputLive, true));
    }
    if (btnObsToggleOverlay) {
        btnObsToggleOverlay.addEventListener('click', () => setOBSOverlayMode(!isOBSOverlayActive, true));
    }
    if (btnObsPaneOverlay) {
        btnObsPaneOverlay.addEventListener('click', () => setOBSOverlayMode(!isOBSOverlayActive, true));
    }

    if (syncChannel) {
        syncChannel.onmessage = (event) => {
            const msg = event.data;
            if (!msg) return;

            if (msg.type === 'audio_frame') {
                remoteAudioData = msg.audio;
                lastRemoteAudioTime = performance.now();
            } else if (msg.type === 'set_obs_output') {
                setOBSOutputLive(msg.live, false);
            } else if (msg.type === 'set_obs_overlay') {
                setOBSOverlayMode(msg.overlay, false);
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
                updateLogoVisibility(msg.vis === 'on' || msg.vis === true, false);
            } else if (msg.type === 'set_logo_mode') {
                modePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-mode') === msg.mode));
                vfx.setLogoMode(msg.mode);
            } else if (msg.type === 'set_logo_blend') {
                blendPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-blend') === String(msg.blend)));
                vfx.setLogoBlendMode(msg.blend);
            } else if (msg.type === 'set_logo_pos') {
                posPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-pos') === msg.pos));
                vfx.setLogoPosition(msg.pos);
            } else if (msg.type === 'set_logo_spin') {
                spinPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-spin') === msg.spin));
                vfx.setLogoSpinMode(msg.spin);
            } else if (msg.type === 'set_logo_spin_speed') {
                if (sliderLogoSpinSpeed) sliderLogoSpinSpeed.value = msg.speed;
                if (logoSpinSpeedVal) logoSpinSpeedVal.textContent = `${Number(msg.speed).toFixed(1)}x`;
                vfx.setLogoSpinSpeed(msg.speed);
            } else if (msg.type === 'set_logo_contrast') {
                if (sliderLogoContrast) sliderLogoContrast.value = msg.val;
                if (logoContrastVal) logoContrastVal.textContent = `${Number(msg.val).toFixed(2)}x`;
                vfx.setLogoContrast(msg.val);
            } else if (msg.type === 'set_logo_bright') {
                if (sliderLogoBright) sliderLogoBright.value = msg.val;
                if (logoBrightVal) logoBrightVal.textContent = `${Number(msg.val).toFixed(2)}x`;
                vfx.setLogoBrightness(msg.val);
            } else if (msg.type === 'set_logo_scale') {
                if (sliderLogoScale) sliderLogoScale.value = msg.val;
                if (logoScaleVal) logoScaleVal.textContent = `${Number(msg.val).toFixed(1)}x`;
                vfx.setLogoScale(msg.val);
            } else if (msg.type === 'set_logo_pulse') {
                if (sliderLogoPulse) sliderLogoPulse.value = msg.val;
                if (logoPulseVal) logoPulseVal.textContent = `${msg.val}%`;
                vfx.setLogoBassPulse(msg.val / 100);
            } else if (msg.type === 'set_logo_shield') {
                if (checkLogoShield) checkLogoShield.checked = msg.active;
                vfx.setLogoShieldVisible(msg.active);
            } else if (msg.type === 'set_gain') {
                if (sliderGain) sliderGain.value = msg.val;
                if (gainVal) gainVal.textContent = `${Number(msg.val).toFixed(1)}x`;
                if (audioProcessor) audioProcessor.setGain(msg.val);
            } else if (msg.type === 'set_sens') {
                if (sliderSens) sliderSens.value = msg.val;
                if (sensVal) sensVal.textContent = `${Number(msg.val).toFixed(1)}x`;
                if (audioProcessor) audioProcessor.setBassSensitivity(msg.val);
            } else if (msg.type === 'set_bloom') {
                if (sliderBloom) sliderBloom.value = msg.val;
                if (bloomVal) bloomVal.textContent = `${Number(msg.val).toFixed(2)}x`;
                vfx.setBloomMultiplier(msg.val);
            } else if (msg.type === 'set_auto_vj') {
                isAutoVJ = !!msg.active;
                if (btnAutoVJ) btnAutoVJ.classList.toggle('active', isAutoVJ);
            } else if (msg.type === 'reset_all') {
                resetAllParameters(false);
            } else if (msg.type === 'track') {
                if (trackTitle && msg.title) trackTitle.textContent = msg.title;
                if (trackArtist && msg.artist) trackArtist.textContent = `${msg.artist} • Deck ${msg.deck || 1}`;
                if (trackDeckBadge && msg.deck) trackDeckBadge.textContent = `DECK ${msg.deck}`;
                if (trackBpmBadge && msg.bpm) trackBpmBadge.textContent = `${Number(msg.bpm).toFixed(1)} BPM`;
                if (bpmVal && msg.bpm) bpmVal.textContent = Number(msg.bpm).toFixed(1);
                if (msg.bpm) vfx.setBPM(msg.bpm);
            } else if (msg.type === 'trigger_track_banner') {
                trackDelaySec = msg.delay ?? trackDelaySec;
                trackDurationSec = msg.duration ?? trackDurationSec;
                triggerTrackBannerPopup(msg.trackData, false);
            } else if (msg.type === 'pop_track_banner_now') {
                setTrackBannerVisibility(true);
                if (msg.duration > 0) {
                    if (trackBannerFadeTimer) clearTimeout(trackBannerFadeTimer);
                    trackBannerFadeTimer = setTimeout(() => {
                        setTrackBannerVisibility(false);
                    }, msg.duration * 1000);
                }
            } else if (msg.type === 'set_track_banner_enabled') {
                setTrackBannerEnabled(msg.enabled, false);
            } else if (msg.type === 'set_track_delay') {
                trackDelaySec = msg.delay;
                if (selectTrackDelay) selectTrackDelay.value = String(msg.delay);
            } else if (msg.type === 'set_track_duration') {
                trackDurationSec = msg.duration;
                if (selectTrackDuration) selectTrackDuration.value = String(msg.duration);
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
            if (audioDeviceBadge) audioDeviceBadge.textContent = 'LINE-IN';
            const tabAudio = document.querySelector('.activity-tab[data-tab="audio"]');
            if (tabAudio) tabAudio.classList.add('has-dot');
            hudStatus.textContent = 'LIVE REACTIVE';
            hudStatus.style.borderColor = '#00ffcc';
            hudStatus.style.color = '#00ffcc';
        } else {
            audioStatus.innerHTML = `<span style="color:#ffaa00">● Simulated Audio</span>`;
            if (audioDeviceBadge) audioDeviceBadge.textContent = 'SIM';
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
    function updateLogoVisibility(active, broadcast = true) {
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
        if (broadcast && syncChannel) {
            syncChannel.postMessage({ type: 'set_logo_vis', vis: isLogoActive ? 'on' : 'off' });
        }
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
            if (syncChannel) syncChannel.postMessage({ type: 'set_logo_mode', mode });
        });
    });

    blendPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const blend = pill.getAttribute('data-blend');
            blendPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoBlendMode(blend);
            if (syncChannel) syncChannel.postMessage({ type: 'set_logo_blend', blend });
        });
    });

    posPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const pos = pill.getAttribute('data-pos');
            posPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoPosition(pos);
            if (syncChannel) syncChannel.postMessage({ type: 'set_logo_pos', pos });
        });
    });

    if (sliderLogoContrast) {
        sliderLogoContrast.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoContrastVal.textContent = `${val.toFixed(2)}x`;
            vfx.setLogoContrast(val);
            if (syncChannel) syncChannel.postMessage({ type: 'set_logo_contrast', val });
        });
    }

    if (sliderLogoBright) {
        sliderLogoBright.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoBrightVal.textContent = `${val.toFixed(2)}x`;
            vfx.setLogoBrightness(val);
            if (syncChannel) syncChannel.postMessage({ type: 'set_logo_bright', val });
        });
    }

    if (sliderLogoScale) {
        sliderLogoScale.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoScaleVal.textContent = `${val.toFixed(1)}x`;
            vfx.setLogoScale(val);
            if (syncChannel) syncChannel.postMessage({ type: 'set_logo_scale', val });
        });
    }

    if (sliderLogoPulse) {
        sliderLogoPulse.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            logoPulseVal.textContent = `${val}%`;
            vfx.setLogoBassPulse(val / 100);
            if (syncChannel) syncChannel.postMessage({ type: 'set_logo_pulse', val });
        });
    }

    spinPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const spin = pill.getAttribute('data-spin');
            spinPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoSpinMode(spin);
            if (syncChannel) syncChannel.postMessage({ type: 'set_logo_spin', spin });
        });
    });

    if (sliderLogoSpinSpeed) {
        sliderLogoSpinSpeed.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoSpinSpeedVal.textContent = `${val.toFixed(1)}x`;
            vfx.setLogoSpinSpeed(val);
            if (syncChannel) syncChannel.postMessage({ type: 'set_logo_spin_speed', speed: val });
        });
    }

    if (checkLogoShield) {
        checkLogoShield.addEventListener('change', (e) => {
            vfx.setLogoShieldVisible(e.target.checked);
            if (syncChannel) syncChannel.postMessage({ type: 'set_logo_shield', active: e.target.checked });
        });
    }

    // Reset All Console Parameters to Factory Defaults
    function resetAllParameters(broadcast = true) {
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
        updateLogoVisibility(true, false);

        modePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-mode') === 'hologram'));
        vfx.setLogoMode('hologram');

        blendPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-blend') === '0'));
        vfx.setLogoBlendMode(0);

        posPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-pos') === 'center'));
        vfx.setLogoPosition('center');

        // Spin Mode
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

        if (broadcast && syncChannel) {
            syncChannel.postMessage({ type: 'reset_all' });
        }

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
        btnResetAll.addEventListener('click', () => resetAllParameters(true));
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
    function toggleAutoVJ(broadcast = true) {
        isAutoVJ = !isAutoVJ;
        if (btnAutoVJ) {
            btnAutoVJ.classList.toggle('active', isAutoVJ);
            btnAutoVJ.innerHTML = isAutoVJ ? `<span class="fx-key">A</span> AUTO VJ: ON` : `<span class="fx-key">A</span> AUTO VJ`;
        }
        if (btnAutoVJPanel) {
            btnAutoVJPanel.classList.toggle('active', isAutoVJ);
            btnAutoVJPanel.textContent = isAutoVJ ? '⚡ AUTO VJ: ON' : '⚡ AUTO VJ TOGGLE';
        }
        if (broadcast && syncChannel) {
            syncChannel.postMessage({ type: 'set_auto_vj', active: isAutoVJ });
        }
    }

    if (btnAutoVJ) btnAutoVJ.addEventListener('click', () => toggleAutoVJ(true));
    if (btnAutoVJPanel) btnAutoVJPanel.addEventListener('click', () => toggleAutoVJ(true));

    // Strobe Button
    function triggerFlashAction() {
        vfx.triggerManualFlash();
        if (syncChannel) syncChannel.postMessage({ type: 'flash' });
        if (stagelinqClient && isHueActive) {
            stagelinqClient.sendHueBeat({
                bass: 1.0,
                isStrobe: true,
                bpm: 126
            });
        }
    }

    if (btnFlash) btnFlash.addEventListener('click', triggerFlashAction);
    if (btnFlashPanel) btnFlashPanel.addEventListener('click', triggerFlashAction);

    // 5. Calibration Sliders
    if (sliderGain) {
        sliderGain.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            gainVal.textContent = `${val.toFixed(1)}x`;
            if (audioProcessor) audioProcessor.setGain(val);
            if (syncChannel) syncChannel.postMessage({ type: 'set_gain', val });
        });
    }

    if (sliderSens) {
        sliderSens.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            sensVal.textContent = `${val.toFixed(1)}x`;
            if (audioProcessor) audioProcessor.setBassSensitivity(val);
            if (syncChannel) syncChannel.postMessage({ type: 'set_sens', val });
        });
    }

    if (sliderBloom) {
        sliderBloom.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            bloomVal.textContent = `${val.toFixed(2)}x`;
            vfx.setBloomMultiplier(val);
            if (syncChannel) syncChannel.postMessage({ type: 'set_bloom', val });
        });
    }

    // 6. Connect to StageLinq & Philips Hue Companion Bridge via WebSocket
    const stagelinqClient = setupStageLinqClient({
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

            // Trigger Track Banner overlay popup with configured delay & fadeout
            triggerTrackBannerPopup(trackData, true);

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
        },
        onHueStatus: (status) => {
            isHueActive = !!status.enabled;
            hueCurrentMode = status.mode || 'scene_sync';
            hueCurrentIntensity = status.intensity ?? 0.85;
            hueCurrentMinBri = status.minBrightness ?? 0.15;
            hueTargetGroup = status.targetGroup || 'all';

            // Update badge
            if (hueStatusBadge) {
                if (status.paired) {
                    hueStatusBadge.textContent = `🟢 PAIRED (${status.bridgeIp || 'LAN'})`;
                    hueStatusBadge.style.color = '#00ffcc';
                    hueStatusBadge.style.borderColor = 'rgba(0,255,204,0.4)';
                    hueStatusBadge.style.background = 'rgba(0,255,204,0.15)';
                } else if (status.bridgeIp) {
                    hueStatusBadge.textContent = `🟠 UNPAIRED (${status.bridgeIp})`;
                    hueStatusBadge.style.color = '#ffaa00';
                    hueStatusBadge.style.borderColor = 'rgba(255,170,0,0.4)';
                    hueStatusBadge.style.background = 'rgba(255,170,0,0.15)';
                } else {
                    hueStatusBadge.textContent = '○ SCANNING...';
                    hueStatusBadge.style.color = 'rgba(255,255,255,0.5)';
                }
            }

            if (inputHueIp && status.bridgeIp && !inputHueIp.value) {
                inputHueIp.value = status.bridgeIp;
            }

            // Update Toggle Button
            if (btnHueToggle) {
                if (isHueActive) {
                    btnHueToggle.textContent = '💡 HUE: ACTIVE';
                    btnHueToggle.style.color = '#00ffcc';
                    btnHueToggle.style.borderColor = '#00ffcc';
                    btnHueToggle.style.background = 'rgba(0,255,204,0.2)';
                } else {
                    btnHueToggle.textContent = '⚪ HUE: OFF';
                    btnHueToggle.style.color = 'rgba(255,255,255,0.7)';
                    btnHueToggle.style.borderColor = 'rgba(255,255,255,0.15)';
                    btnHueToggle.style.background = 'rgba(255,255,255,0.06)';
                }
            }

            const tabHue = document.querySelector('.activity-tab[data-tab="hue"]');
            if (tabHue) tabHue.classList.toggle('has-dot', isHueActive);

            // Populate Rooms Dropdown
            if (hueRoomSelect && Array.isArray(status.rooms) && status.rooms.length > 0) {
                hueRoomSelect.innerHTML = '';
                status.rooms.forEach((room) => {
                    const opt = document.createElement('option');
                    opt.value = room.id;
                    opt.textContent = `${room.name} (${room.lightCount} lights)`;
                    if (room.id === hueTargetGroup) opt.selected = true;
                    hueRoomSelect.appendChild(opt);
                });
                if (hueRoomCount) {
                    const activeRoom = status.rooms.find(r => r.id === hueTargetGroup);
                    hueRoomCount.textContent = activeRoom ? `${activeRoom.name}` : `${status.rooms.length} zones`;
                }
            }

            // Update Sliders & Mode Pills
            if (sliderHueIntensity) sliderHueIntensity.value = Math.round(hueCurrentIntensity * 100);
            if (hueIntensityVal) hueIntensityVal.textContent = `${Math.round(hueCurrentIntensity * 100)}%`;
            if (sliderHueMinBri) sliderHueMinBri.value = Math.round(hueCurrentMinBri * 100);
            if (hueMinBriVal) hueMinBriVal.textContent = `${Math.round(hueCurrentMinBri * 100)}%`;

            hueModePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-hue-mode') === hueCurrentMode));
        },
        onHuePairingStatus: (pairStatus) => {
            if (huePairStatusMsg) {
                if (pairStatus.status === 'press_button') {
                    huePairStatusMsg.innerHTML = `<span style="color:#ffaa00">${pairStatus.message}</span>`;
                } else if (pairStatus.status === 'paired') {
                    huePairStatusMsg.innerHTML = `<span style="color:#00ffcc">🎉 ${pairStatus.message || 'Paired Successfully!'}</span>`;
                    showToast('🎉 Philips Hue Bridge Paired Successfully!');
                    setTimeout(() => {
                        if (hueModalBackdrop) hueModalBackdrop.style.display = 'none';
                    }, 1400);
                } else {
                    huePairStatusMsg.innerHTML = `<span style="color:#ff3366">⚠️ ${pairStatus.message || 'Pairing error'}</span>`;
                }
            }
        }
    });

    // Philips Hue UI Event Listeners
    if (btnHueToggle) {
        btnHueToggle.addEventListener('click', () => {
            isHueActive = !isHueActive;
            const tabHue = document.querySelector('.activity-tab[data-tab="hue"]');
            if (tabHue) tabHue.classList.toggle('has-dot', isHueActive);
            stagelinqClient.setHueConfig({ enabled: isHueActive });
            showToast(isHueActive ? '💡 Philips Hue Sync: ENABLED' : '⚪ Philips Hue Sync: OFF');
            if (syncChannel) syncChannel.postMessage({ type: 'set_hue_enabled', enabled: isHueActive });
        });
    }

    if (btnHueSetup) {
        btnHueSetup.addEventListener('click', () => {
            if (hueModalBackdrop) hueModalBackdrop.style.display = 'flex';
        });
    }
    if (btnCloseHueModal) {
        btnCloseHueModal.addEventListener('click', () => {
            if (hueModalBackdrop) hueModalBackdrop.style.display = 'none';
        });
    }
    if (btnCloseHueDone) {
        btnCloseHueDone.addEventListener('click', () => {
            if (hueModalBackdrop) hueModalBackdrop.style.display = 'none';
        });
    }
    if (hueModalBackdrop) {
        hueModalBackdrop.addEventListener('click', (e) => {
            if (e.target === hueModalBackdrop) hueModalBackdrop.style.display = 'none';
        });
    }

    if (btnDiscoverHue) {
        btnDiscoverHue.addEventListener('click', () => {
            stagelinqClient.discoverHue();
            showToast('🔍 Scanning LAN for Philips Hue Bridge...');
        });
    }

    if (btnDoPairHue) {
        btnDoPairHue.addEventListener('click', () => {
            const ip = inputHueIp ? inputHueIp.value.trim() : null;
            stagelinqClient.pairHue(ip);
            if (huePairStatusMsg) huePairStatusMsg.innerHTML = '<span>Connecting to Bridge...</span>';
        });
    }

    if (hueRoomSelect) {
        hueRoomSelect.addEventListener('change', (e) => {
            hueTargetGroup = e.target.value;
            stagelinqClient.setHueConfig({ targetGroup: hueTargetGroup });
            showToast(`💡 Target Room: ${e.target.options[e.target.selectedIndex]?.text || hueTargetGroup}`);
            if (syncChannel) syncChannel.postMessage({ type: 'set_hue_room', room: hueTargetGroup });
        });
    }

    hueModePills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const mode = pill.getAttribute('data-hue-mode');
            hueCurrentMode = mode;
            hueModePills.forEach(p => p.classList.toggle('active', p === pill));
            stagelinqClient.setHueConfig({ mode });
            showToast(`💡 Hue Mode: ${pill.textContent}`);
            if (syncChannel) syncChannel.postMessage({ type: 'set_hue_mode', mode });
        });
    });

    if (sliderHueIntensity) {
        sliderHueIntensity.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10) / 100;
            hueCurrentIntensity = val;
            if (hueIntensityVal) hueIntensityVal.textContent = `${e.target.value}%`;
            stagelinqClient.setHueConfig({ intensity: val });
            if (syncChannel) syncChannel.postMessage({ type: 'set_hue_intensity', val });
        });
    }

    if (sliderHueMinBri) {
        sliderHueMinBri.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10) / 100;
            hueCurrentMinBri = val;
            if (hueMinBriVal) hueMinBriVal.textContent = `${e.target.value}%`;
            stagelinqClient.setHueConfig({ minBrightness: val });
            if (syncChannel) syncChannel.postMessage({ type: 'set_hue_min_bri', val });
        });
    }

    if (btnHueTestStrobe) {
        btnHueTestStrobe.addEventListener('click', () => {
            stagelinqClient.sendHueBeat({
                bass: 1.0,
                isStrobe: true,
                bpm: 126
            });
            showToast('⚡ Triggered Room Strobe Flash!');
        });
    }

    // 7. Keyboard Shortcuts (18 Presets)
    const hotkeyMap = {
        '1': 0, '2': 1, '3': 2, '4': 3,
        '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '0': 9,
        '-': 10, '=': 11,
        'q': 12, 'Q': 12,
        'w': 13, 'W': 13,
        'e': 14, 'E': 14,
        'r': 15, 'R': 15,
        't': 16, 'T': 16,
        'y': 17, 'Y': 17
    };

    window.addEventListener('keydown', (e) => {
        // [Alt + 1..5] / [Alt + A] for IDE Console Activity Bar Navigation
        if (e.altKey) {
            if (e.key === '1') { e.preventDefault(); switchTab('audio'); return; }
            if (e.key === '2') { e.preventDefault(); switchTab('glow'); return; }
            if (e.key === '3') { e.preventDefault(); switchTab('logo'); return; }
            if (e.key === '4') { e.preventDefault(); switchTab('hue'); return; }
            if (e.key === '5') { e.preventDefault(); switchTab('obs'); return; }
            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                if (btnActAll) btnActAll.click();
                return;
            }
        }

        // [1] - [9], [0], [-], [=] for instant FX switching
        if (!e.altKey && !e.ctrlKey && !e.metaKey && hotkeyMap[e.key] !== undefined) {
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
            if (stagelinqClient && isHueActive) {
                stagelinqClient.sendHueBeat({
                    bass: 1.0,
                    isStrobe: true,
                    bpm: 126
                });
            }
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
        // [O] to open OBS Streaming Manager or Shift+[O] to toggle OBS Output Mute
        else if (e.key === 'o' || e.key === 'O') {
            if (e.shiftKey) {
                setOBSOutputLive(!isOBSOutputLive, true);
            } else if (obsModalBackdrop) {
                updateObsUrlBox();
                obsModalBackdrop.classList.toggle('active');
            }
        }
    });

    // 8. Start Real-Time VFX Render Loop (with Multi-Window Audio Relay & Philips Hue Streaming)
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

            // High-Precision Line-In VU & Loudness Meter Updates
            if (vuPeakFill && data.vuPercent !== undefined) {
                vuPeakFill.style.width = `${data.vuPercent}%`;
            }
            if (vuRmsFill && data.vuRmsPercent !== undefined) {
                vuRmsFill.style.width = `${data.vuRmsPercent}%`;
            }
            if (vuPeakHoldNeedle && data.vuPeakHoldPercent !== undefined) {
                vuPeakHoldNeedle.style.left = `calc(${Math.min(99, data.vuPeakHoldPercent)}% - 1px)`;
            }

            if (vuValPeak && data.peakDb !== undefined) {
                vuValPeak.textContent = `${data.peakDb.toFixed(1)} dBFS`;
                if (data.peakDb > -0.5) {
                    vuValPeak.style.color = '#ff0055';
                } else if (data.peakDb > -3.0) {
                    vuValPeak.style.color = '#ffaa00';
                } else {
                    vuValPeak.style.color = '#00ffcc';
                }
            }

            if (vuValLufs && data.lufs !== undefined) {
                vuValLufs.textContent = `${data.lufs.toFixed(1)} LUFS`;
            }

            if (vuValHeadroom && data.headroomDb !== undefined) {
                vuValHeadroom.textContent = `+${data.headroomDb.toFixed(1)} dB`;
                vuValHeadroom.style.color = data.headroomDb < 1.0 ? '#ffaa00' : '#00ff88';
            }

            // Clip Alert Warning Indicator
            if (data.isClipping && vuClipBadge) {
                vuClipBadge.style.display = 'inline-block';
            }

            // Stream live beat telemetry to Philips Hue Bridge
            if (stagelinqClient && isHueActive) {
                stagelinqClient.sendHueBeat({
                    bass: data.bassImpact || data.bass || 0,
                    mid: data.mid || 0,
                    treble: data.treble || 0,
                    sceneColor: vfx.getCurrentSceneColor ? vfx.getCurrentSceneColor() : '#00ffff',
                    isDrop: !!(data.transientImpulse && data.transientImpulse > 0.8),
                    isStrobe: false,
                    bpm: 126
                });
            }

            return data;
        }
        return null;
    });
}

init();
