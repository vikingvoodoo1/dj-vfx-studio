import { setupAudio } from './audio.js';
import { createVFXScene } from './effects.js';
import { setupStageLinqClient } from './stagelinq.js';

// DJ VFX Studio Build Metadata
const BUILD_VERSION = 'v2.8.5';
const BUILD_NUMBER = '20260928.1450.00';
const BUILD_TIME = '2026-09-28 14:50 BST';
console.log(
    `%c⚡ DJ VFX STUDIO %c ${BUILD_VERSION} (Build #${BUILD_NUMBER}) %c- ONLINE [${BUILD_TIME}]`,
    'background:#ff007f; color:#fff; font-weight:bold; padding:4px 8px; border-radius:3px 0 0 3px;',
    'background:#00ffff; color:#020208; font-weight:bold; padding:4px 8px;',
    'background:#12121e; color:#00ffcc; font-weight:bold; padding:4px 8px; border-radius:0 3px 3px 0;'
);
window.__DJ_VFX_BUILD__ = {
    appName: 'DJ VFX Studio',
    version: BUILD_VERSION,
    buildNumber: BUILD_NUMBER,
    buildTime: BUILD_TIME,
    timestamp: '2026-09-28T14:50:00+01:00',
    copyright: '© 2026 jkmclaren',
    email: 'info@jkmclaren.com'
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

    // About Panel Build & Email Info
    const aboutBuildVer = document.getElementById('about-build-ver');
    const aboutBuildNum = document.getElementById('about-build-num');
    const aboutBuildDttm = document.getElementById('about-build-dttm');
    const aboutBadgeVersion = document.getElementById('about-badge-version');
    const btnCopyAboutEmail = document.getElementById('btn-copy-about-email');

    if (aboutBuildVer) aboutBuildVer.textContent = BUILD_VERSION;
    if (aboutBuildNum) aboutBuildNum.textContent = BUILD_NUMBER;
    if (aboutBuildDttm) aboutBuildDttm.textContent = BUILD_TIME;
    if (aboutBadgeVersion) aboutBadgeVersion.textContent = BUILD_VERSION;

    if (btnCopyAboutEmail) {
        btnCopyAboutEmail.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText('info@jkmclaren.com');
                const origText = btnCopyAboutEmail.innerHTML;
                btnCopyAboutEmail.innerHTML = '✓ Copied: info@jkmclaren.com';
                btnCopyAboutEmail.style.background = 'rgba(0,255,204,0.3)';
                setTimeout(() => {
                    btnCopyAboutEmail.innerHTML = origText;
                    btnCopyAboutEmail.style.background = '';
                }, 2000);
            } catch (err) {
                showToast('Email: info@jkmclaren.com');
            }
        });
    }

    // DJ Ecosystem & 4-Deck Telemetry Elements
    const djEcosystemPills = document.querySelectorAll('#dj-ecosystem-pills .mode-pill[data-eco]');
    const djHardwareStatusText = document.getElementById('dj-hardware-status-text');
    const djProtocolBadge = document.getElementById('dj-protocol-badge');
    const djHardwareLed = document.getElementById('dj-hardware-led');
    const btnOpenDjGuide = document.getElementById('btn-open-dj-guide');
    const djGuideModalBackdrop = document.getElementById('dj-guide-modal-backdrop');
    const btnCloseDjGuide = document.getElementById('btn-close-dj-guide');
    const btnCloseDjGuideDone = document.getElementById('btn-close-dj-guide-done');

    const deckCards = [
        { card: document.getElementById('deck-card-1'), bpm: document.getElementById('deck-bpm-1'), state: document.getElementById('deck-state-1') },
        { card: document.getElementById('deck-card-2'), bpm: document.getElementById('deck-bpm-2'), state: document.getElementById('deck-state-2') },
        { card: document.getElementById('deck-card-3'), bpm: document.getElementById('deck-bpm-3'), state: document.getElementById('deck-state-3') },
        { card: document.getElementById('deck-card-4'), bpm: document.getElementById('deck-bpm-4'), state: document.getElementById('deck-state-4') }
    ];

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
    const btnPopOffTrackBanner = document.getElementById('btn-pop-off-track-banner');
    const selectTrackDelay = document.getElementById('select-track-delay');
    const selectTrackDuration = document.getElementById('select-track-duration');
    const sliderTrackScale = document.getElementById('slider-track-scale');
    const trackScaleVal = document.getElementById('track-scale-val');
    const trackDeckBadge = document.getElementById('track-deck-badge');
    const trackBpmBadge = document.getElementById('track-bpm-badge');
    const trackBannerArt = document.getElementById('track-banner-art');
    const trackBannerVinyl = document.getElementById('track-banner-vinyl');
    const nowplayingPaneTitle = document.getElementById('nowplaying-pane-title');
    const nowplayingPaneArtist = document.getElementById('nowplaying-pane-artist');
    const nowplayingPaneDeck = document.getElementById('nowplaying-pane-deck');
    const nowplayingPaneBpm = document.getElementById('nowplaying-pane-bpm');
    const nowplayingPaneArt = document.getElementById('nowplaying-pane-art');
    const nowplayingPaneVinyl = document.getElementById('nowplaying-pane-vinyl');
    const nowplayingStatusBadge = document.getElementById('nowplaying-status-badge');
    const inputManualTrackTitle = document.getElementById('input-manual-track-title');
    const inputManualTrackArtist = document.getElementById('input-manual-track-artist');
    const btnInjectTrack = document.getElementById('btn-inject-track');
    const btnClearInjectTrack = document.getElementById('btn-clear-inject-track');

    // Shazam Live Audio Recognition Elements & State
    const btnShazamListen = document.getElementById('btn-shazam-listen');
    const shazamBtnText = document.getElementById('shazam-btn-text');
    const shazamRadarBox = document.getElementById('shazam-radar-box');
    const shazamListenStatus = document.getElementById('shazam-listen-status');
    const shazamProgressBar = document.getElementById('shazam-progress-bar');
    const shazamCandidateCard = document.getElementById('shazam-candidate-card');
    const shazamMatchArt = document.getElementById('shazam-match-art');
    const shazamMatchArtFallback = document.getElementById('shazam-match-art-fallback');
    const shazamMatchTitle = document.getElementById('shazam-match-title');
    const shazamMatchArtist = document.getElementById('shazam-match-artist');
    const shazamMatchGenre = document.getElementById('shazam-match-genre');
    const shazamEngineBadge = document.getElementById('shazam-engine-badge');
    const btnShazamPublish = document.getElementById('btn-shazam-publish');
    const btnShazamToManual = document.getElementById('btn-shazam-to-manual');
    const btnShazamDiscard = document.getElementById('btn-shazam-discard');

    let stagedShazamTrack = null;
    let isShazaming = false;

    let isTrackBannerEnabled = true;
    let trackDelaySec = 0; // Instant by default so it drops down the moment track changes
    let trackDurationSec = 30;
    let trackBannerScale = 1.4;
    let trackBannerDelayTimer = null;
    let trackBannerFadeTimer = null;

    const audioDeviceSelect = document.getElementById('audio-device-select');
    const btnListenAudio = document.getElementById('btn-listen-audio');
    const btnCaptureSystemAudio = document.getElementById('btn-capture-system-audio');
    const deckBadge1 = document.getElementById('deck-badge-1');
    const deckBadge2 = document.getElementById('deck-badge-2');

    // Philips Hue Lighting Elements
    const hueStatusBadge = document.getElementById('hue-status-badge');
    const btnHueToggle = document.getElementById('btn-hue-toggle');
    const btnHuePower = document.getElementById('btn-hue-power');
    const btnHueSetup = document.getElementById('btn-hue-setup');
    const hueRoomSelect = document.getElementById('hue-room-select');
    const hueRoomCount = document.getElementById('hue-room-count');
    const hueModePills = document.querySelectorAll('#hue-mode-pills .mode-pill[data-hue-mode]');
    const sliderHueIntensity = document.getElementById('slider-hue-intensity');
    const hueIntensityVal = document.getElementById('hue-intensity-val');
    const sliderHueMinBri = document.getElementById('slider-hue-min-bri');
    const hueMinBriVal = document.getElementById('hue-min-bri-val');
    const btnHueKickStrobe = document.getElementById('btn-hue-kick-strobe');
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
    let isHueKickStrobeActive = false;
    let hueCurrentMode = 'scene_sync';
    let hueCurrentIntensity = 1.0;
    let hueCurrentMinBri = 0.05;
    let hueTargetGroup = 'all';
    let lastHueBeatSentTime = 0;

    // Calibration Sliders
    const sliderGain = document.getElementById('slider-gain');
    const sliderSens = document.getElementById('slider-sens');
    const sliderBloom = document.getElementById('slider-bloom');
    const gainVal = document.getElementById('gain-val');
    const sensVal = document.getElementById('sens-val');
    const bloomVal = document.getElementById('bloom-val');

    // =========================================================================
    // IndexedDB Media Storage Manager (Persistent Storage for Uploaded Media)
    // =========================================================================
    const MediaDB = {
        dbName: 'DJ_VFX_MEDIA_DB_V2',
        dbVersion: 2,
        _db: null,

        async open() {
            if (this._db) return this._db;
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(this.dbName, this.dbVersion);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('dj_logos')) {
                        db.createObjectStore('dj_logos', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('station_logos')) {
                        db.createObjectStore('station_logos', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('flyers')) {
                        db.createObjectStore('flyers', { keyPath: 'id' });
                    }
                };
                req.onsuccess = () => {
                    this._db = req.result;
                    resolve(this._db);
                };
                req.onerror = () => reject(req.error);
            });
        },

        async save(storeName, item) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.put(item);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        },

        async getAll(storeName) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            });
        },

        async delete(storeName, id) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.delete(id);
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            });
        }
    };

    // Master Power Switches & Sub-Tabs DOM References
    const btnResetAll = document.getElementById('btn-reset-all');
    const btnSetupResetAll = document.getElementById('btn-setup-reset-all');
    const btnSetupDetachConsole = document.getElementById('btn-setup-detach-console');
    const btnSetupPopoutScreen = document.getElementById('btn-setup-popout-screen');
    const logoBadge = document.getElementById('logo-badge');
    const stationLogoBadge = document.getElementById('station-logo-badge');
    const flyerBadge = document.getElementById('flyer-badge');
    const btnToggleDjLogoTop = document.getElementById('btn-toggle-dj-logo-top');
    const btnToggleStationLogoTop = document.getElementById('btn-toggle-station-logo-top');
    const btnToggleFlyerTop = document.getElementById('btn-toggle-flyer-top');
    const btnToggleNowplayingTop = document.getElementById('btn-toggle-nowplaying-top');
    const djPowerStatusText = document.getElementById('dj-power-status-text');
    const stationPowerStatusText = document.getElementById('station-power-status-text');
    const flyerPowerStatusText = document.getElementById('flyer-power-status-text');
    const nowplayingPowerStatusText = document.getElementById('nowplaying-power-status-text');
    const subtabBtnDj = document.getElementById('subtab-btn-dj');
    const subtabBtnStation = document.getElementById('subtab-btn-station');
    const subtabBtnFlyer = document.getElementById('subtab-btn-flyer');
    const subtabContentDj = document.getElementById('subtab-content-dj');
    const subtabContentStation = document.getElementById('subtab-content-station');
    const subtabContentFlyer = document.getElementById('subtab-content-flyer');

    // DJ Logo Layer DOM References & State
    const djMediaPreviewVideo = document.getElementById('dj-media-preview-video');
    const djMediaPreviewImg = document.getElementById('dj-media-preview-img');
    const djMediaPreviewTitle = document.getElementById('dj-media-preview-title');
    const djMediaPreviewType = document.getElementById('dj-media-preview-type');
    const btnResetShock = document.getElementById('btn-reset-shock');
    const btnUploadDjLogo = document.getElementById('btn-upload-dj-logo');
    const fileDjLogo = document.getElementById('file-dj-logo');
    const djLogosContainer = document.getElementById('dj-logos-container');
    const djModePills = document.querySelectorAll('#dj-mode-pills .mode-pill[data-mode]');
    const djBlendPills = document.querySelectorAll('#dj-blend-pills .mode-pill[data-blend]');
    const posPills = document.querySelectorAll('#logo-pos-pills .mode-pill[data-pos]');
    const spinPills = document.querySelectorAll('#logo-spin-pills .mode-pill[data-spin]');
    const sliderLogoSpinSpeed = document.getElementById('slider-logo-spin-speed');
    const logoSpinSpeedVal = document.getElementById('logo-spin-speed-val');
    const sliderLogoContrast = document.getElementById('slider-logo-contrast');
    const sliderLogoBright = document.getElementById('slider-logo-bright');
    const sliderLogoScale = document.getElementById('slider-logo-scale');
    const sliderLogoPulse = document.getElementById('slider-logo-pulse');
    const sliderLogoEdgeMargin = document.getElementById('slider-logo-edge-margin');
    const logoEdgeMarginVal = document.getElementById('logo-edge-margin-val');
    const sliderLogoOffsetY = document.getElementById('slider-logo-offset-y');
    const logoOffsetYVal = document.getElementById('logo-offset-y-val');
    const sliderLogoOffsetX = document.getElementById('slider-logo-offset-x');
    const logoOffsetXVal = document.getElementById('logo-offset-x-val');
    const logoContrastVal = document.getElementById('logo-contrast-val');
    const logoBrightVal = document.getElementById('logo-bright-val');
    const logoScaleVal = document.getElementById('logo-scale-val');
    const logoPulseVal = document.getElementById('logo-pulse-val');
    const checkLogoShield = document.getElementById('check-logo-shield');
    const dropZone = document.getElementById('drop-zone');

    let currentDjLogoUrl = '/images/logo/jkmclaren_shock.mp4';
    let currentDjLogoTitle = 'jkmclaren Shock';
    let isCurrentDjVideo = true;

    // Station Logo Layer DOM References & State
    const stationMediaPreviewImg = document.getElementById('station-media-preview-img');
    const stationMediaPreviewVideo = document.getElementById('station-media-preview-video');
    const stationLogoActiveName = document.getElementById('station-logo-active-name');
    const stationMediaPreviewType = document.getElementById('station-media-preview-type');
    const btnUploadStationLogo = document.getElementById('btn-upload-station-logo');
    const fileStationLogo = document.getElementById('file-station-logo');
    const stationLogosContainer = document.getElementById('station-logos-container');
    const stationModePills = document.querySelectorAll('#station-mode-pills .mode-pill[data-st-mode]');
    const stationBlendPills = document.querySelectorAll('#station-blend-pills .mode-pill[data-st-blend]');
    const stationPosPills = document.querySelectorAll('#station-pos-pills .mode-pill[data-st-pos]');
    const stationSpinPills = document.querySelectorAll('#station-spin-pills .mode-pill[data-st-spin]');
    const btnResetStationDefault = document.getElementById('btn-reset-station-default');
    const sliderStationSpinSpeed = document.getElementById('slider-station-spin-speed');
    const stationSpinSpeedVal = document.getElementById('station-spin-speed-val');
    const sliderStationScale = document.getElementById('slider-station-scale');
    const stationScaleVal = document.getElementById('station-scale-val');
    const sliderStationEdgeMargin = document.getElementById('slider-station-edge-margin');
    const stationEdgeMarginVal = document.getElementById('station-edge-margin-val');
    const sliderStationOffsetY = document.getElementById('slider-station-offset-y');
    const stationOffsetYVal = document.getElementById('station-offset-y-val');
    const sliderStationOffsetX = document.getElementById('slider-station-offset-x');
    const stationOffsetXVal = document.getElementById('station-offset-x-val');
    const sliderStationPulse = document.getElementById('slider-station-pulse');
    const stationPulseVal = document.getElementById('station-pulse-val');
    const sliderStationContrast = document.getElementById('slider-station-contrast');
    const stationContrastVal = document.getElementById('station-contrast-val');
    const sliderStationBright = document.getElementById('slider-station-bright');
    const stationBrightVal = document.getElementById('station-bright-val');
    const checkStationShield = document.getElementById('check-station-shield');

    let isStationLogoActive = false;
    let currentStationLogoUrl = '/images/station_logos/4TM Primary Logo.png';
    let currentStationLogoTitle = '4TM Radio';
    let isCurrentStationVideo = false;

    // Event Flyer Layer DOM References & State
    const flyerMediaPreviewImg = document.getElementById('flyer-media-preview-img');
    const flyerMediaPreviewVideo = document.getElementById('flyer-media-preview-video');
    const flyerLogoActiveName = document.getElementById('flyer-logo-active-name');
    const flyerMediaPreviewType = document.getElementById('flyer-media-preview-type');
    const btnUploadFlyer = document.getElementById('btn-upload-flyer');
    const fileFlyer = document.getElementById('file-flyer');
    const flyerLogosContainer = document.getElementById('flyer-logos-container');
    const flyerModePills = document.querySelectorAll('#flyer-mode-pills .mode-pill[data-fl-mode]');
    const flyerBlendPills = document.querySelectorAll('#flyer-blend-pills .mode-pill[data-fl-blend]');
    const flyerPosPills = document.querySelectorAll('#flyer-pos-pills .mode-pill[data-fl-pos]');
    const flyerSpinPills = document.querySelectorAll('#flyer-spin-pills .mode-pill[data-fl-spin]');
    const btnResetFlyerDefault = document.getElementById('btn-reset-flyer-default');
    const sliderFlyerSpinSpeed = document.getElementById('slider-flyer-spin-speed');
    const flyerSpinSpeedVal = document.getElementById('flyer-spin-speed-val');
    const sliderFlyerScale = document.getElementById('slider-flyer-scale');
    const flyerScaleVal = document.getElementById('flyer-scale-val');
    const sliderFlyerEdgeMargin = document.getElementById('slider-flyer-edge-margin');
    const flyerEdgeMarginVal = document.getElementById('flyer-edge-margin-val');
    const sliderFlyerOffsetY = document.getElementById('slider-flyer-offset-y');
    const flyerOffsetYVal = document.getElementById('flyer-offset-y-val');
    const sliderFlyerOffsetX = document.getElementById('slider-flyer-offset-x');
    const flyerOffsetXVal = document.getElementById('flyer-offset-x-val');
    const sliderFlyerPulse = document.getElementById('slider-flyer-pulse');
    const flyerPulseVal = document.getElementById('flyer-pulse-val');
    const sliderFlyerContrast = document.getElementById('slider-flyer-contrast');
    const flyerContrastVal = document.getElementById('flyer-contrast-val');
    const sliderFlyerBright = document.getElementById('slider-flyer-bright');
    const flyerBrightVal = document.getElementById('flyer-bright-val');
    const checkFlyerShield = document.getElementById('check-flyer-shield');

    let isFlyerActive = false;
    let currentFlyerUrl = '/images/flyers/neon_odyssey_flyer.jpg';
    let currentFlyerTitle = 'Neon Odyssey Live';
    let isCurrentFlyerVideo = false;

    // Layer Automation & Pop-Up Scheduler Elements
    const logoSchedModePills = document.querySelectorAll('#logo-sched-mode-pills .mode-pill[data-sched-mode]');
    const logoSchedStatusBadge = document.getElementById('logo-sched-status-badge');
    const selectLogoFreq = document.getElementById('select-logo-freq');
    const selectLogoDur = document.getElementById('select-logo-dur');
    const selectLogoTrans = document.getElementById('select-logo-trans');
    const btnPopLogoNow = document.getElementById('btn-pop-logo-now');
    const btnPopOffLogoNow = document.getElementById('btn-pop-off-logo-now');

    const stationSchedModePills = document.querySelectorAll('#station-sched-mode-pills .mode-pill[data-sched-mode]');
    const stationSchedStatusBadge = document.getElementById('station-sched-status-badge');
    const selectStationFreq = document.getElementById('select-station-freq');
    const selectStationDur = document.getElementById('select-station-dur');
    const selectStationTrans = document.getElementById('select-station-trans');
    const btnPopStationNow = document.getElementById('btn-pop-station-now');
    const btnPopOffStationNow = document.getElementById('btn-pop-off-station-now');

    const flyerSchedModePills = document.querySelectorAll('#flyer-sched-mode-pills .mode-pill[data-sched-mode]');
    const flyerSchedStatusBadge = document.getElementById('flyer-sched-status-badge');
    const selectFlyerFreq = document.getElementById('select-flyer-freq');
    const selectFlyerDur = document.getElementById('select-flyer-dur');
    const selectFlyerTrans = document.getElementById('select-flyer-trans');
    const btnPopFlyerNow = document.getElementById('btn-pop-flyer-now');
    const btnPopOffFlyerNow = document.getElementById('btn-pop-off-flyer-now');

    let logoScheduleMode = 'always';
    let logoIntervalTimer = null;
    let stationScheduleMode = 'always';
    let stationIntervalTimer = null;
    let flyerScheduleMode = 'always';
    let flyerIntervalTimer = null;

    // FX Category & Presets Elements
    const catTabs = document.querySelectorAll('.cat-tab');
    const fxButtons = document.querySelectorAll('.fx-btn');
    const btnAutoVJ = document.getElementById('btn-auto-vj');
    const btnFlash = document.getElementById('btn-flash');

    // 1. Initialize Three.js VFX Scene
    const vfx = createVFXScene(container);
    vfx.setBloomMultiplier(0.35);

    // Load Default Animated Logo Video (jkmclaren Shock MP4)
    vfx.loadLogoMedia('/images/logo/jkmclaren_shock.mp4', true);

    // Load Default Station Logo (4TM Radio)
    vfx.loadStationLogoMedia(currentStationLogoUrl, false);
    vfx.setStationLogoVisible(false);

    // Load Default Event Flyer
    vfx.loadFlyerMedia(currentFlyerUrl, false);
    vfx.setFlyerVisible(false);

    let audioProcessor = null;
    let isLogoActive = true;
    let isAutoVJ = false;
    let autoVJBeatCounter = 0;
    const TOTAL_FX = 23;

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
    const dotPerform = document.getElementById('dot-perform') || document.getElementById('dot-audio');
    const dotFx = document.getElementById('dot-fx');
    const dotBranding = document.getElementById('dot-branding');
    const dotNowPlaying = document.getElementById('dot-nowplaying');
    const dotSetup = document.getElementById('dot-setup');
    const dotAbout = document.getElementById('dot-about');
    const audioDeviceBadge = document.getElementById('audio-device-badge');

    // Setup Sub-Drawers Elements & State (MASTER, OBS, HUE, BRIDGES)
    const setupSubtabs = document.querySelectorAll('.setup-nav-tab[data-setuptab]');
    const setupContents = {
        master: document.getElementById('setup-content-master'),
        obs: document.getElementById('setup-content-obs'),
        hue: document.getElementById('setup-content-hue'),
        bridge: document.getElementById('setup-content-bridge')
    };

    function switchSetupSubtab(subtabId) {
        setupSubtabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-setuptab') === subtabId);
        });
        Object.entries(setupContents).forEach(([key, el]) => {
            if (el) {
                const isActive = key === subtabId;
                el.classList.toggle('active', isActive);
                el.style.display = isActive ? 'block' : 'none';
            }
        });
    }

    setupSubtabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const subtabId = tab.getAttribute('data-setuptab');
            if (subtabId) switchSetupSubtab(subtabId);
        });
    });

    // Duplicate Controls inside Feature Panes
    const btnAutoVJPanel = document.getElementById('btn-auto-vj-panel');
    const btnFlashPanel = document.getElementById('btn-flash-panel');
    const btnObsPaneToggle = document.getElementById('btn-obs-pane-toggle');
    const btnObsPaneOverlay = document.getElementById('btn-obs-pane-overlay');
    const obsPaneUrlInput = document.getElementById('obs-pane-url-input');
    const btnPaneCopyObsUrl = document.getElementById('btn-pane-copy-obs-url');
    const btnPaneOpenModal = document.getElementById('btn-pane-open-modal');
    const btnPaneTestWindow = document.getElementById('btn-pane-test-window');

    const tabOrder = ['perform', 'fx', 'branding', 'nowplaying', 'setup', 'about'];
    let currentTabIndex = 0;

    function switchTab(tabId) {
        if (hud) hud.classList.remove('show-all-panes');
        if (btnActAll) btnActAll.classList.remove('active');

        // Aliases for consolidated setup & branding tabs
        if (tabId === 'audio') tabId = 'perform';
        if (tabId === 'glow' || tabId === 'logo') tabId = 'branding';
        if (tabId === 'banner' || tabId === 'track') tabId = 'nowplaying';
        if (tabId === 'info' || tabId === 'specs') tabId = 'about';
        if (tabId === 'obs' || tabId === 'hue' || tabId === 'bridge') {
            switchSetupSubtab(tabId);
            tabId = 'setup';
        }

        activityTabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
        });

        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `pane-${tabId}`);
        });

        if (tabId === 'branding') {
            syncMediaFolders().catch(() => {});
        }
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
                switchTab(tabOrder[currentTabIndex] || 'perform');
            }
        });
    }

    // Halloween Spooky UI Theme Toggle
    const btnThemeHalloween = document.getElementById('btn-theme-halloween');
    let isHalloweenTheme = false;
    try {
        isHalloweenTheme = localStorage.getItem('dj_vfx_theme') === 'halloween';
        if (isHalloweenTheme) {
            document.body.classList.add('theme-halloween');
            if (btnThemeHalloween) btnThemeHalloween.classList.add('active');
        }
    } catch (e) {}

    if (btnThemeHalloween) {
        btnThemeHalloween.addEventListener('click', () => {
            isHalloweenTheme = document.body.classList.toggle('theme-halloween');
            btnThemeHalloween.classList.toggle('active', isHalloweenTheme);
            try {
                localStorage.setItem('dj_vfx_theme', isHalloweenTheme ? 'halloween' : 'default');
            } catch (e) {}
            showToast(isHalloweenTheme ? '🎃 Halloween Spooky Glow Theme Enabled' : '⚡ Studio Hardware Theme Restored');
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



    function openControllerWindow() {
        const controllerUrl = `${window.location.origin}${window.location.pathname}?mode=controller`;
        window.open(controllerUrl, 'DJ_VFX_MASTER_CONSOLE', 'width=520,height=880,menubar=no,toolbar=no,location=no,status=no');
    }

    function openSecondScreenWindow() {
        const popoutUrl = `${window.location.origin}${window.location.pathname}?clean=true`;
        window.open(popoutUrl, 'DJ_VFX_2ND_SCREEN', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
    }

    const btnDetachConsole = document.getElementById('btn-detach-console');
    if (btnDetachConsole) btnDetachConsole.addEventListener('click', openControllerWindow);
    if (btnSetupDetachConsole) btnSetupDetachConsole.addEventListener('click', openControllerWindow);

    const btnPopout = document.getElementById('btn-popout');
    if (btnPopout) btnPopout.addEventListener('click', openSecondScreenWindow);

    const btnLaunchStage = document.getElementById('btn-launch-stage');
    if (btnLaunchStage) btnLaunchStage.addEventListener('click', openSecondScreenWindow);

    if (btnSetupPopoutScreen) btnSetupPopoutScreen.addEventListener('click', openSecondScreenWindow);

    let stagelinqClient = null;

    // Cross-Process Sync Broadcaster (Sends across BOTH Local BroadcastChannel AND Network WebSocket to OBS / 2nd Screen)
    function broadcastSync(msg) {
        if (!msg) return;
        if (syncChannel) {
            try { syncChannel.postMessage(msg); } catch (e) {}
        }
        if (stagelinqClient && stagelinqClient.sendSync) {
            try { stagelinqClient.sendSync(msg); } catch (e) {}
        }
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
    let lastDisplayedTrackTitle = '';
    let lastDisplayedTrackArtist = '';
    let lastDisplayedTrackDeck = 1;
    let currentDisplayedTrackKey = '';
    let lastDisplayedCoverArt = '';

    const artworkClientCache = new Map();

    function setTrackBannerArtwork(coverUrl) {
        lastDisplayedCoverArt = coverUrl || '';
        if (coverUrl) {
            if (trackBannerArt) {
                trackBannerArt.src = coverUrl;
                trackBannerArt.style.display = 'block';
            }
            if (trackBannerVinyl) {
                trackBannerVinyl.style.display = 'none';
            }
            if (nowplayingPaneArt) {
                nowplayingPaneArt.src = coverUrl;
                nowplayingPaneArt.style.display = 'block';
            }
            if (nowplayingPaneVinyl) {
                nowplayingPaneVinyl.style.display = 'none';
            }
        } else {
            if (trackBannerArt) {
                trackBannerArt.style.display = 'none';
                trackBannerArt.src = '';
            }
            if (trackBannerVinyl) {
                trackBannerVinyl.style.display = 'flex';
            }
            if (nowplayingPaneArt) {
                nowplayingPaneArt.style.display = 'none';
                nowplayingPaneArt.src = '';
            }
            if (nowplayingPaneVinyl) {
                nowplayingPaneVinyl.style.display = 'flex';
            }
        }
    }

    if (trackBannerArt) {
        trackBannerArt.onerror = () => {
            if (trackBannerArt) trackBannerArt.style.display = 'none';
            if (trackBannerVinyl) trackBannerVinyl.style.display = 'flex';
        };
    }
    if (nowplayingPaneArt) {
        nowplayingPaneArt.onerror = () => {
            if (nowplayingPaneArt) nowplayingPaneArt.style.display = 'none';
            if (nowplayingPaneVinyl) nowplayingPaneVinyl.style.display = 'flex';
        };
    }

    async function fetchTrackArtwork(title, artist) {
        const cleanTitle = (title || '').trim();
        const cleanArtist = (artist || '').trim();
        if (!cleanTitle && !cleanArtist) return null;

        const cacheKey = `${cleanArtist.toLowerCase()}:::${cleanTitle.toLowerCase()}`;
        if (artworkClientCache.has(cacheKey)) {
            return artworkClientCache.get(cacheKey);
        }

        try {
            const res = await fetch(`/api/artwork?title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.success && data.coverart) {
                    artworkClientCache.set(cacheKey, data.coverart);
                    return data.coverart;
                }
            }
        } catch (e) {
            // Direct client fallback to iTunes if local API route unreachable
            try {
                const query = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
                const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
                const res2 = await fetch(url);
                if (res2.ok) {
                    const d2 = await res2.json();
                    if (d2.results && d2.results[0] && d2.results[0].artworkUrl100) {
                        const art = d2.results[0].artworkUrl100.replace(/\/\d+x\d+bb\.jpg/i, '/600x600bb.jpg');
                        artworkClientCache.set(cacheKey, art);
                        return art;
                    }
                }
            } catch (err2) {}
        }
        return null;
    }

    function hideTrackBanner() {
        if (trackBannerDelayTimer) {
            clearTimeout(trackBannerDelayTimer);
            trackBannerDelayTimer = null;
        }
        if (trackBannerFadeTimer) {
            clearTimeout(trackBannerFadeTimer);
            trackBannerFadeTimer = null;
        }
        if (trackBanner) {
            trackBanner.classList.add('banner-hidden');
        }
    }

    function showTrackBanner(trackData, options = {}) {
        if (!trackBanner) return;

        const { force = false, immediate = false, duration = null } = options;

        if (!isTrackBannerEnabled && !force) {
            hideTrackBanner();
            return;
        }

        const title = trackData?.title || (trackTitle ? trackTitle.textContent : 'Live Track');
        const artist = trackData?.artist || (trackArtist ? trackArtist.textContent.split(' • ')[0] : '');
        const rawDeck = trackData?.deck !== undefined ? trackData.deck : (lastDisplayedTrackDeck || 1);
        const deckLabel = String(rawDeck).toUpperCase().startsWith('DECK') ? String(rawDeck).toUpperCase() : `DECK ${rawDeck}`;
        const bpm = (trackData?.bpm && trackData.bpm > 40 && trackData.bpm < 300) 
            ? Number(trackData.bpm) 
            : (Number(bpmVal?.textContent) || 126.0);

        const trackKey = `${deckLabel}::${title}::${artist}`;

        // If duplicate packet for the already active visible banner, do not interrupt timer
        if (!force && trackKey === currentDisplayedTrackKey && !trackBanner.classList.contains('banner-hidden')) {
            return;
        }

        currentDisplayedTrackKey = trackKey;
        lastDisplayedTrackTitle = title;
        lastDisplayedTrackArtist = artist;
        lastDisplayedTrackDeck = rawDeck;

        // Update DOM elements on HUD, Banner and Now Playing Pane
        if (trackTitle) trackTitle.textContent = title;
        if (trackArtist) trackArtist.textContent = artist ? `${artist} • ${deckLabel}` : deckLabel;
        if (trackDeckBadge) trackDeckBadge.textContent = deckLabel;
        if (trackBpmBadge) trackBpmBadge.textContent = `${bpm.toFixed(1)} BPM`;

        if (nowplayingPaneTitle) nowplayingPaneTitle.textContent = title;
        if (nowplayingPaneArtist) nowplayingPaneArtist.textContent = artist || 'Live Performance';
        if (nowplayingPaneDeck) nowplayingPaneDeck.textContent = deckLabel;
        if (nowplayingPaneBpm) nowplayingPaneBpm.textContent = `${bpm.toFixed(1)} BPM`;

        // Handle Album Cover Art (Shazam provided, or auto-fetch from iTunes/Deezer, or fallback to spinning vinyl)
        const incomingCover = trackData?.coverart || null;
        if (incomingCover) {
            setTrackBannerArtwork(incomingCover);
        } else {
            // Default to classic spinning vinyl record
            setTrackBannerArtwork(null);

            // Asynchronously resolve high-res album cover art
            const targetKey = trackKey;
            fetchTrackArtwork(title, artist).then((artUrl) => {
                if (artUrl && currentDisplayedTrackKey === targetKey) {
                    setTrackBannerArtwork(artUrl);
                    if (trackData) trackData.coverart = artUrl;
                    broadcastSync({
                        type: 'track_art_update',
                        trackKey: targetKey,
                        coverart: artUrl
                    });
                }
            });
        }

        // Clear existing timers
        if (trackBannerDelayTimer) {
            clearTimeout(trackBannerDelayTimer);
            trackBannerDelayTimer = null;
        }
        if (trackBannerFadeTimer) {
            clearTimeout(trackBannerFadeTimer);
            trackBannerFadeTimer = null;
        }

        const effectiveDuration = (duration !== null && duration !== undefined) ? duration : trackDurationSec;
        const delay = (immediate || force || trackDelaySec <= 0) ? 0 : trackDelaySec;

        const renderVisible = () => {
            trackBanner.classList.remove('banner-hidden', 'hidden');

            if (effectiveDuration > 0) {
                trackBannerFadeTimer = setTimeout(() => {
                    hideTrackBanner();
                }, effectiveDuration * 1000);
            }
        };

        if (delay > 0 && !force && !immediate) {
            if (!trackBanner.classList.contains('banner-hidden')) {
                // Banner already visible, reset duration timer seamlessly
                if (effectiveDuration > 0) {
                    trackBannerFadeTimer = setTimeout(() => {
                        hideTrackBanner();
                    }, effectiveDuration * 1000);
                }
            } else {
                trackBanner.classList.add('banner-hidden');
                trackBannerDelayTimer = setTimeout(() => {
                    renderVisible();
                }, delay * 1000);
            }
        } else {
            renderVisible();
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
        if (btnToggleNowplayingTop) {
            btnToggleNowplayingTop.classList.toggle('active', isTrackBannerEnabled);
            if (nowplayingPowerStatusText) nowplayingPowerStatusText.textContent = isTrackBannerEnabled ? 'ACTIVE ON' : 'OFF';
        }
        if (nowplayingStatusBadge) {
            nowplayingStatusBadge.textContent = isTrackBannerEnabled ? 'LIVE ON STREAM' : 'OVERLAY MUTED';
            nowplayingStatusBadge.style.color = isTrackBannerEnabled ? '#00ffcc' : 'rgba(255,255,255,0.4)';
            nowplayingStatusBadge.style.borderColor = isTrackBannerEnabled ? 'rgba(0,255,204,0.4)' : '#323542';
            nowplayingStatusBadge.style.background = isTrackBannerEnabled ? 'rgba(0,255,204,0.15)' : 'rgba(255,255,255,0.05)';
        }
        if (!isTrackBannerEnabled) {
            hideTrackBanner();
        }
        showToast(isTrackBannerEnabled ? '🎛️ Track Stream Overlay: ENABLED' : '⚪ Track Stream Overlay: OFF');
        if (broadcast) {
            broadcastSync({ type: 'set_track_banner_enabled', enabled: isTrackBannerEnabled });
        }
    }

    if (btnToggleTrackBanner) {
        btnToggleTrackBanner.addEventListener('click', () => setTrackBannerEnabled(!isTrackBannerEnabled, true));
    }
    if (btnToggleNowplayingTop) {
        btnToggleNowplayingTop.addEventListener('click', () => setTrackBannerEnabled(!isTrackBannerEnabled, true));
    }

    // Manual Track Injection from Now Playing Panel
    if (btnInjectTrack) {
        btnInjectTrack.addEventListener('click', () => {
            const title = (inputManualTrackTitle?.value || '').trim() || 'Live Track';
            const artist = (inputManualTrackArtist?.value || '').trim();
            const bpm = Number(bpmVal?.textContent) || 126.0;
            const currentTrack = {
                title,
                artist,
                deck: lastDisplayedTrackDeck || 1,
                bpm
            };
            showTrackBanner(currentTrack, { force: true, immediate: true, duration: trackDurationSec });
            showToast(`⚡ Injected: ${artist ? artist + ' - ' : ''}${title}`);

            broadcastSync({
                type: 'pop_track_banner_now',
                trackData: currentTrack,
                duration: trackDurationSec
            });
        });
    }

    if (btnClearInjectTrack) {
        btnClearInjectTrack.addEventListener('click', () => {
            if (inputManualTrackTitle) inputManualTrackTitle.value = '';
            if (inputManualTrackArtist) inputManualTrackArtist.value = '';
        });
    }

    // 🎧 Shazam Live Audio Recognition Listener
    if (btnShazamListen) {
        btnShazamListen.addEventListener('click', async () => {
            if (isShazaming) return;
            isShazaming = true;
            btnShazamListen.disabled = true;
            btnShazamListen.style.opacity = '0.6';
            if (shazamRadarBox) shazamRadarBox.style.display = 'block';
            if (shazamCandidateCard) shazamCandidateCard.style.display = 'none';
            if (shazamEngineBadge) {
                shazamEngineBadge.textContent = 'LISTENING';
                shazamEngineBadge.style.color = '#00e1ff';
                shazamEngineBadge.style.borderColor = '#00e1ff';
            }
            if (shazamProgressBar) shazamProgressBar.style.width = '0%';
            if (shazamListenStatus) shazamListenStatus.textContent = '🎧 LISTENING TO LIVE AUDIO... (4s)';

            try {
                if (!audioProcessor) {
                    audioProcessor = await setupAudio((devs, activeId) => {
                        updateDeviceDropdown(devs, currentSelectedDeviceId || activeId);
                    });
                }

                const audioData = await audioProcessor.captureSample(4.0, (progress, remainingSec) => {
                    if (shazamProgressBar) shazamProgressBar.style.width = `${Math.round(progress * 100)}%`;
                    if (shazamListenStatus) shazamListenStatus.textContent = `🎧 LISTENING TO LIVE AUDIO... (${remainingSec}s)`;
                });

                if (shazamListenStatus) shazamListenStatus.textContent = `🧠 ANALYZING ACOUSTIC FINGERPRINT...`;
                if (shazamEngineBadge) shazamEngineBadge.textContent = 'ANALYZING';

                const res = await fetch('/api/shazam', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audioBase64: audioData.base64, samples: audioData.samples })
                });

                const data = await res.json();
                if (data.success && data.match) {
                    stagedShazamTrack = {
                        title: data.match.title,
                        artist: data.match.artist,
                        genre: data.match.genre || 'Identified Track',
                        coverart: data.match.coverart || '',
                        album: data.match.album || ''
                    };

                    if (shazamMatchTitle) shazamMatchTitle.textContent = stagedShazamTrack.title;
                    if (shazamMatchArtist) shazamMatchArtist.textContent = stagedShazamTrack.artist;
                    if (shazamMatchGenre) shazamMatchGenre.textContent = stagedShazamTrack.genre;

                    if (stagedShazamTrack.coverart && shazamMatchArt) {
                        shazamMatchArt.src = stagedShazamTrack.coverart;
                        shazamMatchArt.style.display = 'block';
                        if (shazamMatchArtFallback) shazamMatchArtFallback.style.display = 'none';
                    } else {
                        if (shazamMatchArt) shazamMatchArt.style.display = 'none';
                        if (shazamMatchArtFallback) shazamMatchArtFallback.style.display = 'block';
                    }

                    if (shazamRadarBox) shazamRadarBox.style.display = 'none';
                    if (shazamCandidateCard) shazamCandidateCard.style.display = 'block';
                    if (shazamEngineBadge) {
                        shazamEngineBadge.textContent = 'MATCH FOUND';
                        shazamEngineBadge.style.color = '#00ffcc';
                        shazamEngineBadge.style.borderColor = '#00ffcc';
                    }
                    showToast(`✓ Shazam Identified: ${stagedShazamTrack.artist} - ${stagedShazamTrack.title}`);
                } else {
                    if (shazamRadarBox) shazamRadarBox.style.display = 'none';
                    if (shazamEngineBadge) {
                        shazamEngineBadge.textContent = 'NO MATCH';
                        shazamEngineBadge.style.color = '#ffaa00';
                        shazamEngineBadge.style.borderColor = '#ffaa00';
                    }
                    showToast(data.message || 'No track match found in Shazam database. Try letting the drop play.');
                }
            } catch (err) {
                console.error('[Shazam Error]', err);
                if (shazamRadarBox) shazamRadarBox.style.display = 'none';
                if (shazamEngineBadge) {
                    shazamEngineBadge.textContent = 'ERROR';
                    shazamEngineBadge.style.color = '#ff3366';
                    shazamEngineBadge.style.borderColor = '#ff3366';
                }
                showToast(err.message || 'Could not record live audio for Shazam.');
            } finally {
                isShazaming = false;
                btnShazamListen.disabled = false;
                btnShazamListen.style.opacity = '1';
            }
        });
    }

    // 2nd Click Confirm: Publish verified match to stream
    if (btnShazamPublish) {
        btnShazamPublish.addEventListener('click', () => {
            if (!stagedShazamTrack) return;
            const currentTrack = {
                title: stagedShazamTrack.title,
                artist: stagedShazamTrack.artist,
                coverart: stagedShazamTrack.coverart || '',
                deck: lastDisplayedTrackDeck || 1,
                bpm: Number(bpmVal?.textContent) || 126.0
            };
            showTrackBanner(currentTrack, { force: true, immediate: true, duration: trackDurationSec });
            showToast(`⚡ Published Shazam Match: ${currentTrack.artist} - ${currentTrack.title}`);

            broadcastSync({
                type: 'pop_track_banner_now',
                trackData: currentTrack,
                duration: trackDurationSec
            });

            if (shazamCandidateCard) shazamCandidateCard.style.display = 'none';
            if (shazamEngineBadge) {
                shazamEngineBadge.textContent = 'PUBLISHED';
                shazamEngineBadge.style.color = '#00ffcc';
                shazamEngineBadge.style.borderColor = '#00ffcc';
            }
        });
    }

    // Edit before publish (copies into manual input fields)
    if (btnShazamToManual) {
        btnShazamToManual.addEventListener('click', () => {
            if (!stagedShazamTrack) return;
            if (inputManualTrackTitle) inputManualTrackTitle.value = stagedShazamTrack.title;
            if (inputManualTrackArtist) inputManualTrackArtist.value = stagedShazamTrack.artist;
            showToast('✏️ Copied into manual form. Tweak and click Inject when ready.');
            if (inputManualTrackTitle) inputManualTrackTitle.focus();
        });
    }

    // Discard match
    if (btnShazamDiscard) {
        btnShazamDiscard.addEventListener('click', () => {
            stagedShazamTrack = null;
            if (shazamCandidateCard) shazamCandidateCard.style.display = 'none';
            if (shazamEngineBadge) {
                shazamEngineBadge.textContent = 'READY';
                shazamEngineBadge.style.color = '#00e1ff';
                shazamEngineBadge.style.borderColor = 'rgba(0,225,255,0.4)';
            }
        });
    }

    if (btnPopTrackBanner) {
        btnPopTrackBanner.addEventListener('click', () => {
            const currentTrack = {
                title: trackTitle ? trackTitle.textContent : 'Live Track',
                artist: trackArtist ? trackArtist.textContent.split(' • ')[0] : '',
                coverart: lastDisplayedCoverArt || '',
                deck: lastDisplayedTrackDeck || 1,
                bpm: Number(bpmVal?.textContent) || 126.0
            };
            showTrackBanner(currentTrack, { force: true, immediate: true, duration: trackDurationSec });
            showToast('🎛️ Popped Track Banner on Stream');

            broadcastSync({
                type: 'pop_track_banner_now',
                trackData: currentTrack,
                duration: trackDurationSec
            });
        });
    }

    if (btnPopOffTrackBanner) {
        btnPopOffTrackBanner.addEventListener('click', () => {
            hideTrackBanner();
            showToast('⏹️ Dismissed Track Banner on Stream');

            broadcastSync({
                type: 'hide_track_banner_now'
            });
        });
    }

    if (selectTrackDelay) {
        selectTrackDelay.addEventListener('change', (e) => {
            trackDelaySec = parseInt(e.target.value, 10) || 0;
            showToast(`⏳ Track Delay: ${trackDelaySec}s into track`);
            broadcastSync({ type: 'set_track_delay', delay: trackDelaySec });
        });
    }

    function setTrackBannerScale(scale, broadcast = true) {
        trackBannerScale = Math.min(Math.max(parseFloat(scale) || 1.4, 0.5), 3.0);
        document.documentElement.style.setProperty('--banner-scale', String(trackBannerScale));
        if (sliderTrackScale) sliderTrackScale.value = String(trackBannerScale);
        if (trackScaleVal) {
            const label = trackBannerScale <= 0.9 ? 'Compact' : (trackBannerScale <= 1.3 ? 'Standard' : (trackBannerScale <= 1.8 ? 'Large' : 'Stadium'));
            trackScaleVal.textContent = `${trackBannerScale.toFixed(1)}x (${label})`;
        }
        if (broadcast) {
            broadcastSync({ type: 'set_track_banner_scale', scale: trackBannerScale });
        }
    }

    if (sliderTrackScale) {
        sliderTrackScale.addEventListener('input', (e) => {
            setTrackBannerScale(e.target.value, true);
        });
    }

    // Set initial scale from slider / default
    setTrackBannerScale(trackBannerScale, false);

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

        const tabObs = document.querySelector('.activity-tab[data-tab="setup"], .activity-tab[data-tab="obs"]');
        if (tabObs) tabObs.classList.toggle('has-dot', isOBSOutputLive);

        if (broadcast) {
            broadcastSync({ type: 'set_obs_output', live: isOBSOutputLive });
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

        if (broadcast) {
            broadcastSync({ type: 'set_obs_overlay', overlay: isOBSOverlayActive });
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

    // Centralized Sync Message Handler (Consumes from BOTH BroadcastChannel AND WebSocket Bridge)
    function handleSyncMessage(msg) {
        if (!msg) return;

        if (msg.type === 'audio_frame') {
            const rawAudio = msg.audio || {};
            remoteAudioData = {
                ...rawAudio,
                dataArray: rawAudio.bins ? new Uint8Array(rawAudio.bins) : new Uint8Array(128)
            };
            lastRemoteAudioTime = performance.now();
        } else if (msg.type === 'set_obs_output') {
            setOBSOutputLive(msg.live, false);
        } else if (msg.type === 'set_obs_overlay') {
            setOBSOverlayMode(msg.overlay, false);
        } else if (msg.type === 'set_fx') {
            selectFX(msg.fx, false);
            try { localStorage.setItem('dj_vfx_current_fx', String(msg.fx)); } catch (e) {}
        } else if (msg.type === 'set_bpm') {
            if (bpmVal) bpmVal.textContent = Number(msg.bpm).toFixed(1);
            vfx.setBPM(msg.bpm);
        } else if (msg.type === 'beat_pulse') {
            vfx.triggerBeatPulse();
        } else if (msg.type === 'flash') {
            vfx.triggerManualFlash();
        } else if (msg.type === 'set_logo_vis') {
            updateLogoVisibility(msg.vis === 'on' || msg.vis === true, false);
        } else if (msg.type === 'set_dj_logo_url') {
            selectDjLogo(msg.url, msg.title, msg.isVideo, false);
        } else if (msg.type === 'set_logo_mode') {
            djModePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-mode') === msg.mode));
            vfx.setLogoMode(msg.mode);
        } else if (msg.type === 'set_logo_blend') {
            djBlendPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-blend') === String(msg.blend)));
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
        } else if (msg.type === 'set_logo_edge_margin') {
            if (sliderLogoEdgeMargin) sliderLogoEdgeMargin.value = msg.val;
            if (logoEdgeMarginVal) logoEdgeMarginVal.textContent = `${msg.val}%`;
            vfx.setLogoEdgeMargin(msg.val / 100);
        } else if (msg.type === 'set_logo_offset_y') {
            if (sliderLogoOffsetY) sliderLogoOffsetY.value = msg.val;
            if (logoOffsetYVal) logoOffsetYVal.textContent = `${msg.val}%`;
            vfx.setLogoOffsetY(msg.val / 100);
        } else if (msg.type === 'set_logo_offset_x') {
            if (sliderLogoOffsetX) sliderLogoOffsetX.value = msg.val;
            if (logoOffsetXVal) logoOffsetXVal.textContent = `${msg.val}%`;
            vfx.setLogoOffsetX(msg.val / 100);
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
            if (msg.bpm && msg.bpm > 40 && msg.bpm < 300) {
                if (bpmVal) bpmVal.textContent = Number(msg.bpm).toFixed(1);
                vfx.setBPM(msg.bpm);
            }
            if (vfx.setDeckData) vfx.setDeckData(msg);
            showTrackBanner(msg, { force: false });
        } else if (msg.type === 'trigger_track_banner') {
            if (msg.delay !== undefined) trackDelaySec = msg.delay;
            if (msg.duration !== undefined) trackDurationSec = msg.duration;
            showTrackBanner(msg.trackData, { force: false });
        } else if (msg.type === 'pop_track_banner_now') {
            showTrackBanner(msg.trackData, { force: true, immediate: true, duration: msg.duration });
        } else if (msg.type === 'track_art_update') {
            if (msg.trackKey === currentDisplayedTrackKey && msg.coverart) {
                setTrackBannerArtwork(msg.coverart);
            }
        } else if (msg.type === 'hide_track_banner_now') {
            hideTrackBanner();
        } else if (msg.type === 'set_track_banner_enabled') {
            setTrackBannerEnabled(msg.enabled, false);
        } else if (msg.type === 'set_track_delay') {
            trackDelaySec = msg.delay;
            if (selectTrackDelay) selectTrackDelay.value = String(msg.delay);
        } else if (msg.type === 'set_track_duration') {
            trackDurationSec = msg.duration;
            if (selectTrackDuration) selectTrackDuration.value = String(msg.duration);
        } else if (msg.type === 'set_track_banner_scale') {
            setTrackBannerScale(msg.scale, false);
        } else if (msg.type === 'set_station_logo_vis') {
            updateStationLogoVisibility(msg.vis, false);
        } else if (msg.type === 'set_station_logo_url') {
            selectStationLogo(msg.url, msg.title, msg.isVideo, false);
        } else if (msg.type === 'set_station_logo_pos') {
            stationPosPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-st-pos') === msg.pos));
            vfx.setStationLogoPosition(msg.pos);
        } else if (msg.type === 'set_station_logo_mode') {
            stationModePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-st-mode') === msg.mode));
            vfx.setStationLogoMode(msg.mode);
        } else if (msg.type === 'set_station_logo_blend') {
            stationBlendPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-st-blend') === String(msg.blend)));
            vfx.setStationLogoBlendMode(msg.blend);
        } else if (msg.type === 'set_station_logo_spin') {
            stationSpinPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-st-spin') === msg.spin));
            vfx.setStationLogoSpinMode(msg.spin);
        } else if (msg.type === 'set_station_logo_spin_speed') {
            if (sliderStationSpinSpeed) sliderStationSpinSpeed.value = msg.speed;
            if (stationSpinSpeedVal) stationSpinSpeedVal.textContent = `${Number(msg.speed).toFixed(1)}x`;
            vfx.setStationLogoSpinSpeed(msg.speed);
        } else if (msg.type === 'set_station_logo_scale') {
            if (sliderStationScale) sliderStationScale.value = msg.val;
            if (stationScaleVal) stationScaleVal.textContent = `${Number(msg.val).toFixed(2)}x`;
            vfx.setStationLogoScale(msg.val);
        } else if (msg.type === 'set_station_edge_margin') {
            if (sliderStationEdgeMargin) sliderStationEdgeMargin.value = msg.val;
            if (stationEdgeMarginVal) stationEdgeMarginVal.textContent = `${msg.val}%`;
            vfx.setStationLogoEdgeMargin(msg.val / 100);
        } else if (msg.type === 'set_station_offset_y') {
            if (sliderStationOffsetY) sliderStationOffsetY.value = msg.val;
            if (stationOffsetYVal) stationOffsetYVal.textContent = `${msg.val}%`;
            vfx.setStationLogoOffsetY(msg.val / 100);
        } else if (msg.type === 'set_station_offset_x') {
            if (sliderStationOffsetX) sliderStationOffsetX.value = msg.val;
            if (stationOffsetXVal) stationOffsetXVal.textContent = `${msg.val}%`;
            vfx.setStationLogoOffsetX(msg.val / 100);
        } else if (msg.type === 'set_station_logo_pulse') {
            if (sliderStationPulse) sliderStationPulse.value = msg.val;
            if (stationPulseVal) stationPulseVal.textContent = `${msg.val}%`;
            vfx.setStationLogoBassPulse(msg.val / 100);
        } else if (msg.type === 'set_station_logo_contrast') {
            if (sliderStationContrast) sliderStationContrast.value = msg.val;
            if (stationContrastVal) stationContrastVal.textContent = `${Number(msg.val).toFixed(2)}x`;
            vfx.setStationLogoContrast(msg.val);
        } else if (msg.type === 'set_station_logo_bright') {
            if (sliderStationBright) sliderStationBright.value = msg.val;
            if (stationBrightVal) stationBrightVal.textContent = `${Number(msg.val).toFixed(2)}x`;
            vfx.setStationLogoBrightness(msg.val);
        } else if (msg.type === 'set_station_logo_shield') {
            if (checkStationShield) checkStationShield.checked = msg.active;
            vfx.setStationLogoShieldVisible(msg.active);
        } else if (msg.type === 'set_flyer_vis') {
            updateFlyerVisibility(msg.vis, false);
        } else if (msg.type === 'set_flyer_url') {
            selectFlyer(msg.url, msg.title, msg.isVideo, false);
        } else if (msg.type === 'set_flyer_mode') {
            flyerModePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-fl-mode') === msg.mode));
            vfx.setFlyerMode(msg.mode);
        } else if (msg.type === 'set_flyer_blend') {
            flyerBlendPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-fl-blend') === String(msg.blend)));
            vfx.setFlyerBlendMode(msg.blend);
        } else if (msg.type === 'set_flyer_pos') {
            flyerPosPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-fl-pos') === msg.pos));
            vfx.setFlyerPosition(msg.pos);
        } else if (msg.type === 'set_flyer_spin') {
            flyerSpinPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-fl-spin') === msg.spin));
            vfx.setFlyerSpinMode(msg.spin);
        } else if (msg.type === 'set_flyer_spin_speed') {
            if (sliderFlyerSpinSpeed) sliderFlyerSpinSpeed.value = msg.speed;
            if (flyerSpinSpeedVal) flyerSpinSpeedVal.textContent = `${Number(msg.speed).toFixed(1)}x`;
            vfx.setFlyerSpinSpeed(msg.speed);
        } else if (msg.type === 'set_flyer_scale') {
            if (sliderFlyerScale) sliderFlyerScale.value = msg.val;
            if (flyerScaleVal) flyerScaleVal.textContent = `${Number(msg.val).toFixed(2)}x`;
            vfx.setFlyerScale(msg.val);
        } else if (msg.type === 'set_flyer_edge_margin') {
            if (sliderFlyerEdgeMargin) sliderFlyerEdgeMargin.value = msg.val;
            if (flyerEdgeMarginVal) flyerEdgeMarginVal.textContent = `${msg.val}%`;
            vfx.setFlyerEdgeMargin(msg.val / 100);
        } else if (msg.type === 'set_flyer_offset_y') {
            if (sliderFlyerOffsetY) sliderFlyerOffsetY.value = msg.val;
            if (flyerOffsetYVal) flyerOffsetYVal.textContent = `${msg.val}%`;
            vfx.setFlyerOffsetY(msg.val / 100);
        } else if (msg.type === 'set_flyer_offset_x') {
            if (sliderFlyerOffsetX) sliderFlyerOffsetX.value = msg.val;
            if (flyerOffsetXVal) flyerOffsetXVal.textContent = `${msg.val}%`;
            vfx.setFlyerOffsetX(msg.val / 100);
        } else if (msg.type === 'set_flyer_pulse') {
            if (sliderFlyerPulse) sliderFlyerPulse.value = msg.val;
            if (flyerPulseVal) flyerPulseVal.textContent = `${msg.val}%`;
            vfx.setFlyerBassPulse(msg.val / 100);
        } else if (msg.type === 'set_flyer_contrast') {
            if (sliderFlyerContrast) sliderFlyerContrast.value = msg.val;
            if (flyerContrastVal) flyerContrastVal.textContent = `${Number(msg.val).toFixed(2)}x`;
            vfx.setFlyerContrast(msg.val);
        } else if (msg.type === 'set_flyer_bright') {
            if (sliderFlyerBright) sliderFlyerBright.value = msg.val;
            if (flyerBrightVal) flyerBrightVal.textContent = `${Number(msg.val).toFixed(2)}x`;
            vfx.setFlyerBrightness(msg.val);
        } else if (msg.type === 'set_flyer_shield') {
            if (checkFlyerShield) checkFlyerShield.checked = msg.active;
            vfx.setFlyerShieldVisible(msg.active);
        } else if (msg.type === 'set_layer_transition') {
            if (msg.layer === 'logo') {
                if (selectLogoTrans) selectLogoTrans.value = msg.effect;
                vfx.setLogoTransitionEffect(msg.effect);
            } else if (msg.layer === 'station') {
                if (selectStationTrans) selectStationTrans.value = msg.effect;
                vfx.setStationLogoTransitionEffect(msg.effect);
            } else if (msg.layer === 'flyer') {
                if (selectFlyerTrans) selectFlyerTrans.value = msg.effect;
                vfx.setFlyerTransitionEffect(msg.effect);
            }
        } else if (msg.type === 'pop_layer_now') {
            const dur = Number(msg.duration) || 15;
            if (msg.layer === 'logo') vfx.popLogo(dur);
            else if (msg.layer === 'station') vfx.popStationLogo(dur);
            else if (msg.layer === 'flyer') vfx.popFlyer(dur);
        } else if (msg.type === 'pop_layer_off') {
            if (msg.layer === 'logo') vfx.setLogoVisible(false);
            else if (msg.layer === 'station') vfx.setStationLogoVisible(false);
            else if (msg.layer === 'flyer') vfx.setFlyerVisible(false);
        } else if (msg.type === 'request_state') {
            // Broadcast full current state snapshot (from master controller or clean display)
            if (!isOBSMode) {
                broadcastSync({ type: 'set_fx', fx: vfx.getCurrentFX() });
                broadcastSync({ type: 'set_bpm', bpm: bpmVal ? parseFloat(bpmVal.textContent) || 126 : 126 });
                broadcastSync({ type: 'set_logo_vis', vis: isLogoActive ? 'on' : 'off' });
                broadcastSync({ type: 'set_dj_logo_url', url: currentDjLogoUrl, title: currentDjLogoTitle, isVideo: isCurrentDjVideo });
                const activeSpin = document.querySelector('#logo-spin-pills .mode-pill.active')?.getAttribute('data-spin') || 'off';
                broadcastSync({ type: 'set_logo_spin', spin: activeSpin });
                const spinSpeed = sliderLogoSpinSpeed ? parseFloat(sliderLogoSpinSpeed.value) || 1.0 : 1.0;
                broadcastSync({ type: 'set_logo_spin_speed', speed: spinSpeed });
                const activeMode = document.querySelector('.mode-pill[data-mode].active')?.getAttribute('data-mode') || 'hologram';
                broadcastSync({ type: 'set_logo_mode', mode: activeMode });
                const activeBlend = document.querySelector('.mode-pill[data-blend].active')?.getAttribute('data-blend') || '0';
                broadcastSync({ type: 'set_logo_blend', blend: activeBlend });
                const activePos = document.querySelector('#logo-pos-pills .mode-pill.active')?.getAttribute('data-pos') || 'center';
                broadcastSync({ type: 'set_logo_pos', pos: activePos });
                if (sliderLogoScale) broadcastSync({ type: 'set_logo_scale', val: parseFloat(sliderLogoScale.value) || 1.0 });
                if (sliderLogoEdgeMargin) broadcastSync({ type: 'set_logo_edge_margin', val: parseFloat(sliderLogoEdgeMargin.value) || 4 });
                if (sliderLogoPulse) broadcastSync({ type: 'set_logo_pulse', val: parseFloat(sliderLogoPulse.value) || 50 });
                if (sliderLogoContrast) broadcastSync({ type: 'set_logo_contrast', val: parseFloat(sliderLogoContrast.value) || 1.35 });
                if (sliderLogoBright) broadcastSync({ type: 'set_logo_bright', val: parseFloat(sliderLogoBright.value) || 1.15 });
                if (checkLogoShield) broadcastSync({ type: 'set_logo_shield', active: checkLogoShield.checked });
                if (selectLogoTrans) broadcastSync({ type: 'set_layer_transition', layer: 'logo', effect: selectLogoTrans.value });

                // Station Logo Sync Snapshot
                broadcastSync({ type: 'set_station_logo_vis', vis: isStationLogoActive });
                broadcastSync({ type: 'set_station_logo_url', url: currentStationLogoUrl, title: currentStationLogoTitle, isVideo: isCurrentStationVideo });
                const activeStMode = document.querySelector('#station-mode-pills .mode-pill.active')?.getAttribute('data-st-mode') || 'overlay';
                broadcastSync({ type: 'set_station_logo_mode', mode: activeStMode });
                const activeStBlend = document.querySelector('#station-blend-pills .mode-pill.active')?.getAttribute('data-st-blend') || '0';
                broadcastSync({ type: 'set_station_logo_blend', blend: activeStBlend });
                const activeStPos = document.querySelector('#station-pos-pills .mode-pill.active')?.getAttribute('data-st-pos') || 'top-right';
                broadcastSync({ type: 'set_station_logo_pos', pos: activeStPos });
                const activeStSpin = document.querySelector('#station-spin-pills .mode-pill.active')?.getAttribute('data-st-spin') || 'off';
                broadcastSync({ type: 'set_station_logo_spin', spin: activeStSpin });
                if (sliderStationSpinSpeed) broadcastSync({ type: 'set_station_logo_spin_speed', speed: parseFloat(sliderStationSpinSpeed.value) || 1.0 });
                if (sliderStationScale) broadcastSync({ type: 'set_station_logo_scale', val: parseFloat(sliderStationScale.value) || 0.85 });
                if (sliderStationEdgeMargin) broadcastSync({ type: 'set_station_edge_margin', val: parseFloat(sliderStationEdgeMargin.value) || 4 });
                if (sliderStationPulse) broadcastSync({ type: 'set_station_logo_pulse', val: parseFloat(sliderStationPulse.value) || 25 });
                if (sliderStationContrast) broadcastSync({ type: 'set_station_logo_contrast', val: parseFloat(sliderStationContrast.value) || 1.25 });
                if (sliderStationBright) broadcastSync({ type: 'set_station_logo_bright', val: parseFloat(sliderStationBright.value) || 1.05 });
                if (checkStationShield) broadcastSync({ type: 'set_station_logo_shield', active: checkStationShield.checked });
                if (selectStationTrans) broadcastSync({ type: 'set_layer_transition', layer: 'station', effect: selectStationTrans.value });

                // Event Flyer Sync Snapshot
                broadcastSync({ type: 'set_flyer_vis', vis: isFlyerActive });
                broadcastSync({ type: 'set_flyer_url', url: currentFlyerUrl, title: currentFlyerTitle, isVideo: isCurrentFlyerVideo });
                const activeFlMode = document.querySelector('#flyer-mode-pills .mode-pill.active')?.getAttribute('data-fl-mode') || 'overlay';
                broadcastSync({ type: 'set_flyer_mode', mode: activeFlMode });
                const activeFlBlend = document.querySelector('#flyer-blend-pills .mode-pill.active')?.getAttribute('data-fl-blend') || '0';
                broadcastSync({ type: 'set_flyer_blend', blend: activeFlBlend });
                const activeFlPos = document.querySelector('#flyer-pos-pills .mode-pill.active')?.getAttribute('data-fl-pos') || 'center';
                broadcastSync({ type: 'set_flyer_pos', pos: activeFlPos });
                const activeFlSpin = document.querySelector('#flyer-spin-pills .mode-pill.active')?.getAttribute('data-fl-spin') || 'off';
                broadcastSync({ type: 'set_flyer_spin', spin: activeFlSpin });
                if (sliderFlyerSpinSpeed) broadcastSync({ type: 'set_flyer_spin_speed', speed: parseFloat(sliderFlyerSpinSpeed.value) || 1.0 });
                if (sliderFlyerScale) broadcastSync({ type: 'set_flyer_scale', val: parseFloat(sliderFlyerScale.value) || 1.0 });
                if (sliderFlyerEdgeMargin) broadcastSync({ type: 'set_flyer_edge_margin', val: parseFloat(sliderFlyerEdgeMargin.value) || 4 });
                if (sliderFlyerPulse) broadcastSync({ type: 'set_flyer_pulse', val: parseFloat(sliderFlyerPulse.value) || 20 });
                if (sliderFlyerContrast) broadcastSync({ type: 'set_flyer_contrast', val: parseFloat(sliderFlyerContrast.value) || 1.15 });
                if (sliderFlyerBright) broadcastSync({ type: 'set_flyer_bright', val: parseFloat(sliderFlyerBright.value) || 1.0 });
                if (checkFlyerShield) broadcastSync({ type: 'set_flyer_shield', active: checkFlyerShield.checked });
                if (selectFlyerTrans) broadcastSync({ type: 'set_layer_transition', layer: 'flyer', effect: selectFlyerTrans.value });

                if (sliderGain) broadcastSync({ type: 'set_gain', val: parseFloat(sliderGain.value) || 1.0 });
                if (sliderSens) broadcastSync({ type: 'set_sens', val: parseFloat(sliderSens.value) || 1.0 });
                if (sliderBloom) broadcastSync({ type: 'set_bloom', val: parseFloat(sliderBloom.value) || 0.35 });
                broadcastSync({ type: 'set_obs_output', live: isOBSOutputLive });
                broadcastSync({ type: 'set_obs_overlay', overlay: isOBSOverlayActive });
                broadcastSync({ type: 'set_track_banner_scale', scale: trackBannerScale });
                broadcastSync({ type: 'set_track_delay', delay: trackDelaySec });
                broadcastSync({ type: 'set_track_duration', duration: trackDurationSec });
                broadcastSync({ type: 'set_hue_kick_strobe', active: isHueKickStrobeActive });
            }
        } else if (msg.type === 'set_hue_kick_strobe') {
            isHueKickStrobeActive = !!msg.active;
            updateKickStrobeBtnState();
        }
    }

    if (syncChannel) {
        syncChannel.onmessage = (event) => handleSyncMessage(event.data);
    }

    let currentSelectedDeviceId = 'default';
    try {
        currentSelectedDeviceId = localStorage.getItem('dj_vfx_audio_device_id') || 'default';
    } catch (e) {}

    // Helper to populate audio devices in select dropdown
    function updateDeviceDropdown(devices, currentId) {
        if (!audioDeviceSelect) return;
        audioDeviceSelect.innerHTML = '';
        
        const defaultOpt = document.createElement('option');
        defaultOpt.value = 'default';
        defaultOpt.textContent = 'Default System / Deck Input';
        audioDeviceSelect.appendChild(defaultOpt);

        if (currentId === 'system-tab-audio') {
            const sysOpt = document.createElement('option');
            sysOpt.value = 'system-tab-audio';
            sysOpt.textContent = '🖥️ System / Tab Audio Stream (Active)';
            sysOpt.selected = true;
            audioDeviceSelect.appendChild(sysOpt);
        }

        devices.forEach((dev, index) => {
            const opt = document.createElement('option');
            opt.value = dev.deviceId;
            opt.textContent = dev.label || `Audio Interface ${index + 1} (${dev.deviceId.slice(0, 8)}...)`;
            if (dev.deviceId === currentId) opt.selected = true;
            audioDeviceSelect.appendChild(opt);
        });

        const activeId = currentId || currentSelectedDeviceId;
        if (activeId && activeId !== 'default') {
            audioDeviceSelect.value = activeId;
        }
    }

    // 2. Audio & Media Activation on User Click or Selection
    async function enableAudioAndMedia(targetDeviceId = null) {
        vfx.playLogoVideo();

        const deviceToUse = targetDeviceId !== null ? targetDeviceId : currentSelectedDeviceId;
        if (targetDeviceId !== null) {
            currentSelectedDeviceId = targetDeviceId;
            try { localStorage.setItem('dj_vfx_audio_device_id', targetDeviceId); } catch (e) {}
        }

        if (!audioProcessor) {
            audioProcessor = await setupAudio((devs, activeId) => {
                updateDeviceDropdown(devs, currentSelectedDeviceId || activeId);
            });

            if (currentSelectedDeviceId && currentSelectedDeviceId !== 'default' && currentSelectedDeviceId !== 'system-tab-audio') {
                await audioProcessor.switchDevice(currentSelectedDeviceId);
            }

            const devs = await audioProcessor.getDevices();
            updateDeviceDropdown(devs, audioProcessor.getCurrentDevice().id);

            if (sliderGain) audioProcessor.setGain(sliderGain.value);
            if (sliderSens) audioProcessor.setBassSensitivity(sliderSens.value);
        } else if (targetDeviceId !== null && targetDeviceId !== 'system-tab-audio') {
            await audioProcessor.switchDevice(deviceToUse);
        }

        await audioProcessor.resume();

        if (audioProcessor.isConnected()) {
            const devInfo = audioProcessor.getCurrentDevice();
            const isSysAudio = devInfo.id === 'system-tab-audio';
            const cleanLabel = devInfo.label.length > 22 ? devInfo.label.slice(0, 20) + '...' : devInfo.label;
            audioStatus.innerHTML = `<span style="color:${isSysAudio ? '#00d2ff' : '#00ffcc'}" title="${devInfo.label}">● ${cleanLabel}</span>`;
            if (audioDeviceBadge) audioDeviceBadge.textContent = isSysAudio ? 'SYS AUDIO' : 'LINE-IN';
            const tabAudio = document.querySelector('.activity-tab[data-tab="perform"], .activity-tab[data-tab="audio"]');
            if (tabAudio) tabAudio.classList.add('has-dot');
            hudStatus.textContent = 'LIVE REACTIVE';
            hudStatus.style.borderColor = isSysAudio ? '#00d2ff' : '#00ffcc';
            hudStatus.style.color = isSysAudio ? '#00d2ff' : '#00ffcc';
        } else {
            audioStatus.innerHTML = `<span style="color:#ffaa00">● Simulated Audio</span>`;
            if (audioDeviceBadge) audioDeviceBadge.textContent = 'SIM';
            hudStatus.textContent = 'SIM ACTIVE';
        }
    }

    // Connect Audio on startup with saved device
    enableAudioAndMedia();

    if (audioDeviceSelect) {
        audioDeviceSelect.addEventListener('change', async (e) => {
            if (e.target.value === 'system-tab-audio') return;
            await enableAudioAndMedia(e.target.value);
        });
    }

    if (btnListenAudio) {
        btnListenAudio.addEventListener('click', async () => {
            const chosenId = audioDeviceSelect ? audioDeviceSelect.value : currentSelectedDeviceId;
            await enableAudioAndMedia(chosenId);
        });
    }

    if (btnCaptureSystemAudio) {
        btnCaptureSystemAudio.addEventListener('click', async () => {
            vfx.playLogoVideo();
            if (!audioProcessor) {
                audioProcessor = await setupAudio((devs, activeId) => {
                    updateDeviceDropdown(devs, currentSelectedDeviceId || activeId);
                });
            }
            if (audioProcessor && audioProcessor.captureSystemAudio) {
                const res = await audioProcessor.captureSystemAudio();
                if (res.success) {
                    const devInfo = audioProcessor.getCurrentDevice();
                    const cleanLabel = devInfo.label.length > 22 ? devInfo.label.slice(0, 20) + '...' : devInfo.label;
                    audioStatus.innerHTML = `<span style="color:#00d2ff" title="${devInfo.label}">● ${cleanLabel}</span>`;
                    if (audioDeviceBadge) audioDeviceBadge.textContent = 'SYS AUDIO';
                    const tabAudio = document.querySelector('.activity-tab[data-tab="perform"], .activity-tab[data-tab="audio"]');
                    if (tabAudio) tabAudio.classList.add('has-dot');
                    hudStatus.textContent = 'LIVE REACTIVE';
                    hudStatus.style.borderColor = '#00d2ff';
                    hudStatus.style.color = '#00d2ff';
                    showToast('🖥️ System / Tab Audio Stream Connected!');
                } else if (res.error) {
                    if (!res.error.includes('Permission denied') && !res.error.includes('cancelled') && !res.error.includes('canceled')) {
                        alert(res.error);
                    }
                }
            }
        });
    }

    window.addEventListener('click', (e) => {
        vfx.playLogoVideo();
        if (!audioProcessor) {
            enableAudioAndMedia(currentSelectedDeviceId);
        } else {
            audioProcessor.resume();
        }
    });

    // =========================================================================
    // 3. DJ Logo & Station Logo Branding Layer Controls
    // =========================================================================
    function updateLogoVisibility(active, broadcast = true) {
        isLogoActive = !!active;
        vfx.setLogoVisible(isLogoActive);
        if (logoBadge) {
            logoBadge.textContent = isLogoActive ? 'DJ: ON' : 'DJ: OFF';
            logoBadge.style.color = isLogoActive ? '#00ffcc' : 'rgba(255,255,255,0.4)';
            logoBadge.style.borderColor = isLogoActive ? 'rgba(0,255,204,0.3)' : 'rgba(255,255,255,0.1)';
        }
        if (btnToggleDjLogoTop) {
            btnToggleDjLogoTop.classList.toggle('active', isLogoActive);
            if (djPowerStatusText) djPowerStatusText.textContent = isLogoActive ? 'ACTIVE ON' : 'OFF';
        }
        const tabLogo = document.querySelector('.activity-tab[data-tab="branding"], .activity-tab[data-tab="logo"]');
        if (tabLogo) tabLogo.classList.toggle('has-dot', isLogoActive || isStationLogoActive);
        if (broadcast) {
            broadcastSync({ type: 'set_logo_vis', vis: isLogoActive ? 'on' : 'off' });
        }
    }

    function toggleLogo() {
        updateLogoVisibility(!isLogoActive);
    }

    if (logoBadge) logoBadge.addEventListener('click', toggleLogo);
    if (btnToggleDjLogoTop) btnToggleDjLogoTop.addEventListener('click', toggleLogo);

    // Logos Sub-Tabs Switcher (DJ Logo vs Station Logo vs Event Flyer)
    function switchLogosSubtab(subtabId) {
        if (subtabBtnDj) subtabBtnDj.classList.toggle('active', subtabId === 'dj');
        if (subtabBtnStation) subtabBtnStation.classList.toggle('active', subtabId === 'station');
        if (subtabBtnFlyer) subtabBtnFlyer.classList.toggle('active', subtabId === 'flyer');
        if (subtabContentDj) {
            subtabContentDj.classList.toggle('active', subtabId === 'dj');
            subtabContentDj.style.display = subtabId === 'dj' ? 'block' : 'none';
        }
        if (subtabContentStation) {
            subtabContentStation.classList.toggle('active', subtabId === 'station');
            subtabContentStation.style.display = subtabId === 'station' ? 'block' : 'none';
        }
        if (subtabContentFlyer) {
            subtabContentFlyer.classList.toggle('active', subtabId === 'flyer');
            subtabContentFlyer.style.display = subtabId === 'flyer' ? 'block' : 'none';
        }
        syncMediaFolders().catch(() => {});
    }

    if (subtabBtnDj) subtabBtnDj.addEventListener('click', () => switchLogosSubtab('dj'));
    if (subtabBtnStation) subtabBtnStation.addEventListener('click', () => switchLogosSubtab('station'));
    if (subtabBtnFlyer) subtabBtnFlyer.addEventListener('click', () => switchLogosSubtab('flyer'));

    // DJ Media Selector & Live Preview Monitor
    function selectDjLogo(url, title, isVideo = true, broadcast = true) {
        currentDjLogoUrl = url;
        currentDjLogoTitle = title || 'DJ Logo';
        isCurrentDjVideo = !!isVideo;

        vfx.loadLogoMedia(url, isVideo);

        // Update Live Preview Monitor
        if (djMediaPreviewTitle) djMediaPreviewTitle.textContent = currentDjLogoTitle;
        if (djMediaPreviewType) djMediaPreviewType.textContent = isVideo ? '🎬 MP4 VIDEO' : '🖼️ PNG / JPG';

        if (isVideo) {
            if (djMediaPreviewImg) djMediaPreviewImg.style.display = 'none';
            if (djMediaPreviewVideo) {
                djMediaPreviewVideo.style.display = 'block';
                djMediaPreviewVideo.src = url;
                djMediaPreviewVideo.play().catch(() => {});
            }
        } else {
            if (djMediaPreviewVideo) {
                djMediaPreviewVideo.style.display = 'none';
                djMediaPreviewVideo.pause();
            }
            if (djMediaPreviewImg) {
                djMediaPreviewImg.style.display = 'block';
                djMediaPreviewImg.src = url;
            }
        }

        // Highlight active card
        const cards = document.querySelectorAll('#dj-logos-container .dj-card');
        cards.forEach(card => {
            const cardUrl = card.getAttribute('data-dj-url');
            card.classList.toggle('active', cardUrl === url);
        });

        try {
            localStorage.setItem('dj_vfx_active_dj_media', JSON.stringify({ url, title: currentDjLogoTitle, isVideo: isCurrentDjVideo }));
        } catch (e) {}

        if (broadcast) {
            broadcastSync({
                type: 'set_dj_logo_url',
                url,
                title: currentDjLogoTitle,
                isVideo: isCurrentDjVideo
            });
        }
    }

    function wireDjCardClick(card) {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-dj-url');
            const title = card.getAttribute('data-dj-title');
            const isVideo = card.getAttribute('data-dj-type') === 'video';
            selectDjLogo(url, title, isVideo, true);
        });
    }

    function addDjLogoCard(url, title, isVideo = true, selectImmediately = true, id = null, subLabel = null) {
        if (!djLogosContainer) return;

        const existing = djLogosContainer.querySelector(`.dj-card[data-dj-url="${CSS.escape(url)}"]`);
        if (existing) {
            if (selectImmediately) selectDjLogo(url, title, isVideo, true);
            return;
        }

        const card = document.createElement('div');
        card.className = 'dj-card';
        card.setAttribute('data-dj-url', url);
        card.setAttribute('data-dj-title', title);
        card.setAttribute('data-dj-type', isVideo ? 'video' : 'img');
        if (id) card.setAttribute('data-storage-id', id);

        const thumb = document.createElement(isVideo ? 'video' : 'img');
        thumb.className = 'dj-card-thumb';
        thumb.src = url;
        if (isVideo) {
            thumb.muted = true;
            thumb.playsInline = true;
            thumb.autoplay = true;
            thumb.loop = true;
        }

        const info = document.createElement('div');
        info.className = 'dj-card-info';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'dj-card-title';
        titleSpan.textContent = title;

        const subSpan = document.createElement('span');
        subSpan.className = 'dj-card-sub';
        subSpan.textContent = subLabel || (id ? (isVideo ? 'Custom Video' : 'Custom Logo') : (isVideo ? 'Video' : 'DJ Logo'));

        info.appendChild(titleSpan);
        info.appendChild(subSpan);
        card.appendChild(thumb);
        card.appendChild(info);

        if (id) {
            const delBtn = document.createElement('button');
            delBtn.className = 'card-delete-btn';
            delBtn.textContent = '✕';
            delBtn.title = 'Delete saved media';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await MediaDB.delete('dj_logos', id);
                card.remove();
                showToast(`🗑️ Removed ${title}`);
                if (currentDjLogoUrl === url) {
                    selectDjLogo('/images/logo/jkmclaren_shock.mp4', 'jkmclaren Shock', true, true);
                }
            });
            card.appendChild(delBtn);
        }

        djLogosContainer.appendChild(card);
        wireDjCardClick(card);

        if (selectImmediately) {
            selectDjLogo(url, title, isVideo, true);
        }
    }

    document.querySelectorAll('#dj-logos-container .dj-card').forEach(wireDjCardClick);

    // DJ Upload Handling
    if (btnUploadDjLogo && fileDjLogo) {
        btnUploadDjLogo.addEventListener('click', () => fileDjLogo.click());
        fileDjLogo.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
            const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
            const reader = new FileReader();

            reader.onload = async (event) => {
                const dataUrl = event.target.result;
                const item = {
                    id: 'dj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                    title: cleanTitle,
                    filename: file.name,
                    type: file.type || (isVideo ? 'video/mp4' : 'image/png'),
                    isVideo,
                    dataUrl,
                    timestamp: Date.now()
                };
                try {
                    await MediaDB.save('dj_logos', item);
                } catch (err) {
                    console.warn('MediaDB save failed:', err);
                }
                addDjLogoCard(dataUrl, cleanTitle, isVideo, true, item.id);
                showToast(`🎧 Stored & Loaded DJ Media: ${cleanTitle}`);
            };

            reader.readAsDataURL(file);
        });
    }

    if (btnResetShock) {
        btnResetShock.addEventListener('click', () => {
            selectDjLogo('/images/logo/jkmclaren_shock.mp4', 'jkmclaren Shock', true, true);
            showToast('↺ Restored jkmclaren Shock MP4');
        });
    }

    // DJ Mode, Blend & Positioning Controls
    djModePills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const mode = pill.getAttribute('data-mode');
            djModePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoMode(mode);
            broadcastSync({ type: 'set_logo_mode', mode });
        });
    });

    djBlendPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const blend = pill.getAttribute('data-blend');
            djBlendPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoBlendMode(blend);
            broadcastSync({ type: 'set_logo_blend', blend });
        });
    });

    posPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const pos = pill.getAttribute('data-pos');
            posPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoPosition(pos);
            try { localStorage.setItem('dj_vfx_logo_pos', pos); } catch (e) {}
            broadcastSync({ type: 'set_logo_pos', pos });
        });
    });

    if (sliderLogoContrast) {
        sliderLogoContrast.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoContrastVal.textContent = `${val.toFixed(2)}x`;
            vfx.setLogoContrast(val);
            broadcastSync({ type: 'set_logo_contrast', val });
        });
    }

    if (sliderLogoBright) {
        sliderLogoBright.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoBrightVal.textContent = `${val.toFixed(2)}x`;
            vfx.setLogoBrightness(val);
            broadcastSync({ type: 'set_logo_bright', val });
        });
    }

    if (sliderLogoScale) {
        sliderLogoScale.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoScaleVal.textContent = `${val.toFixed(1)}x`;
            vfx.setLogoScale(val);
            broadcastSync({ type: 'set_logo_scale', val });
        });
    }

    if (sliderLogoEdgeMargin) {
        sliderLogoEdgeMargin.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (logoEdgeMarginVal) logoEdgeMarginVal.textContent = `${val}%`;
            vfx.setLogoEdgeMargin(val / 100);
            broadcastSync({ type: 'set_logo_edge_margin', val });
        });
    }

    if (sliderLogoOffsetY) {
        sliderLogoOffsetY.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            logoOffsetYVal.textContent = `${val}%`;
            vfx.setLogoOffsetY(val / 100);
            broadcastSync({ type: 'set_logo_offset_y', val });
        });
    }

    if (sliderLogoOffsetX) {
        sliderLogoOffsetX.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            logoOffsetXVal.textContent = `${val}%`;
            vfx.setLogoOffsetX(val / 100);
            broadcastSync({ type: 'set_logo_offset_x', val });
        });
    }

    if (sliderLogoPulse) {
        sliderLogoPulse.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            logoPulseVal.textContent = `${val}%`;
            vfx.setLogoBassPulse(val / 100);
            broadcastSync({ type: 'set_logo_pulse', val });
        });
    }

    spinPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const spin = pill.getAttribute('data-spin');
            spinPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setLogoSpinMode(spin);
            try { localStorage.setItem('dj_vfx_logo_spin', spin); } catch (e) {}
            broadcastSync({ type: 'set_logo_spin', spin });
        });
    });

    if (sliderLogoSpinSpeed) {
        sliderLogoSpinSpeed.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            logoSpinSpeedVal.textContent = `${val.toFixed(1)}x`;
            vfx.setLogoSpinSpeed(val);
            try { localStorage.setItem('dj_vfx_logo_spin_speed', String(val)); } catch (e) {}
            broadcastSync({ type: 'set_logo_spin_speed', speed: val });
        });
    }

    // Initialize logo spin preferences from localStorage if saved
    try {
        const savedSpin = localStorage.getItem('dj_vfx_logo_spin');
        if (savedSpin) {
            spinPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-spin') === savedSpin));
            vfx.setLogoSpinMode(savedSpin);
        }
        const savedSpeed = parseFloat(localStorage.getItem('dj_vfx_logo_spin_speed'));
        if (!isNaN(savedSpeed) && savedSpeed > 0) {
            if (sliderLogoSpinSpeed) sliderLogoSpinSpeed.value = String(savedSpeed);
            if (logoSpinSpeedVal) logoSpinSpeedVal.textContent = `${savedSpeed.toFixed(1)}x`;
            vfx.setLogoSpinSpeed(savedSpeed);
        }
    } catch (e) {}

    if (checkLogoShield) {
        checkLogoShield.addEventListener('change', (e) => {
            vfx.setLogoShieldVisible(e.target.checked);
            broadcastSync({ type: 'set_logo_shield', active: e.target.checked });
        });
    }

    // -------------------------------------------------------------------------
    // 3b. Broadcast & Station Logo Layer Controls
    // -------------------------------------------------------------------------
    function updateStationLogoVisibility(active, broadcast = true) {
        isStationLogoActive = !!active;
        vfx.setStationLogoVisible(isStationLogoActive);
        if (stationLogoBadge) {
            stationLogoBadge.textContent = isStationLogoActive ? 'STATION: ON' : 'STATION: OFF';
            stationLogoBadge.style.color = isStationLogoActive ? '#00ffcc' : 'rgba(255,255,255,0.4)';
            stationLogoBadge.style.borderColor = isStationLogoActive ? 'rgba(0,255,204,0.4)' : 'rgba(255,255,255,0.15)';
        }
        if (btnToggleStationLogoTop) {
            btnToggleStationLogoTop.classList.toggle('active', isStationLogoActive);
            if (stationPowerStatusText) stationPowerStatusText.textContent = isStationLogoActive ? 'ACTIVE ON' : 'OFF';
        }
        const tabLogo = document.querySelector('.activity-tab[data-tab="branding"], .activity-tab[data-tab="logo"]');
        if (tabLogo) tabLogo.classList.toggle('has-dot', isLogoActive || isStationLogoActive);
        if (broadcast) {
            broadcastSync({ type: 'set_station_logo_vis', vis: isStationLogoActive });
        }
    }

    if (btnToggleStationLogoTop) {
        btnToggleStationLogoTop.addEventListener('click', () => {
            updateStationLogoVisibility(!isStationLogoActive, true);
        });
    }
    if (stationLogoBadge) {
        stationLogoBadge.addEventListener('click', () => {
            updateStationLogoVisibility(!isStationLogoActive, true);
        });
    }

    function selectStationLogo(url, title, isVideo = false, broadcast = true) {
        currentStationLogoUrl = url;
        currentStationLogoTitle = title || 'Station Logo';
        isCurrentStationVideo = !!isVideo;

        vfx.loadStationLogoMedia(url, isVideo);

        // Update Live Preview Monitor
        if (stationLogoActiveName) stationLogoActiveName.textContent = currentStationLogoTitle;
        if (stationMediaPreviewType) stationMediaPreviewType.textContent = isVideo ? '🎬 VIDEO' : '🖼️ PNG / JPG';

        if (isVideo) {
            if (stationMediaPreviewImg) stationMediaPreviewImg.style.display = 'none';
            if (stationMediaPreviewVideo) {
                stationMediaPreviewVideo.style.display = 'block';
                stationMediaPreviewVideo.src = url;
                stationMediaPreviewVideo.play().catch(() => {});
            }
        } else {
            if (stationMediaPreviewVideo) {
                stationMediaPreviewVideo.style.display = 'none';
                stationMediaPreviewVideo.pause();
            }
            if (stationMediaPreviewImg) {
                stationMediaPreviewImg.style.display = 'block';
                stationMediaPreviewImg.src = url;
            }
        }

        const cards = document.querySelectorAll('.station-card');
        cards.forEach(card => {
            const cardUrl = card.getAttribute('data-station-url');
            card.classList.toggle('active', cardUrl === url);
        });

        try {
            localStorage.setItem('dj_vfx_active_station_logo', JSON.stringify({ url, title: currentStationLogoTitle, isVideo: isCurrentStationVideo }));
        } catch (e) {}

        if (broadcast) {
            broadcastSync({
                type: 'set_station_logo_url',
                url,
                title: currentStationLogoTitle,
                isVideo: isCurrentStationVideo
            });
        }
    }

    function wireStationCardClick(card) {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-station-url');
            const title = card.getAttribute('data-station-title');
            const isVideo = card.getAttribute('data-station-type') === 'video';
            selectStationLogo(url, title, isVideo, true);
        });
    }

    document.querySelectorAll('.station-card').forEach(wireStationCardClick);

    // Initial station logo card active highlight
    const firstStationCard = document.querySelector('.station-card');
    if (firstStationCard) {
        firstStationCard.classList.add('active');
        if (stationLogoActiveName) stationLogoActiveName.textContent = firstStationCard.getAttribute('data-station-title') || '4TM Radio';
    }

    // Station Logo Reset to Default
    if (btnResetStationDefault) {
        btnResetStationDefault.addEventListener('click', () => {
            selectStationLogo('/images/station_logos/4TM Primary Logo.png', '4TM Radio', false, true);
            showToast('↺ Restored Default 4TM Radio Station Logo');
        });
    }

    // 1. Mode pills (Display Layer)
    stationModePills.forEach(pill => {
        pill.addEventListener('click', () => {
            const mode = pill.getAttribute('data-st-mode');
            stationModePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setStationLogoMode(mode);
            broadcastSync({ type: 'set_station_logo_mode', mode });
        });
    });

    // 2. Blend pills (Blend & Cutout)
    stationBlendPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const blend = parseInt(pill.getAttribute('data-st-blend'), 10);
            stationBlendPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setStationLogoBlendMode(blend);
            broadcastSync({ type: 'set_station_logo_blend', blend });
        });
    });

    // 3. Position pills (9-Way Directional D-Pad)
    stationPosPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const pos = pill.getAttribute('data-st-pos');
            stationPosPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setStationLogoPosition(pos);
            try { localStorage.setItem('dj_vfx_station_pos', pos); } catch (e) {}
            broadcastSync({ type: 'set_station_logo_pos', pos });
        });
    });

    // 4. Spin pills (3D Rotation & Spin)
    stationSpinPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const spin = pill.getAttribute('data-st-spin');
            stationSpinPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setStationLogoSpinMode(spin);
            try { localStorage.setItem('dj_vfx_station_spin', spin); } catch (e) {}
            broadcastSync({ type: 'set_station_logo_spin', spin });
        });
    });

    // Sliders
    if (sliderStationSpinSpeed) {
        sliderStationSpinSpeed.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (stationSpinSpeedVal) stationSpinSpeedVal.textContent = `${val.toFixed(1)}x`;
            vfx.setStationLogoSpinSpeed(val);
            try { localStorage.setItem('dj_vfx_station_spin_speed', String(val)); } catch (e) {}
            broadcastSync({ type: 'set_station_logo_spin_speed', speed: val });
        });
    }

    if (sliderStationScale) {
        sliderStationScale.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (stationScaleVal) stationScaleVal.textContent = `${val.toFixed(2)}x`;
            vfx.setStationLogoScale(val);
            broadcastSync({ type: 'set_station_logo_scale', val });
        });
    }

    if (sliderStationEdgeMargin) {
        sliderStationEdgeMargin.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (stationEdgeMarginVal) stationEdgeMarginVal.textContent = `${val}%`;
            vfx.setStationLogoEdgeMargin(val / 100);
            broadcastSync({ type: 'set_station_edge_margin', val });
        });
    }

    if (sliderStationOffsetY) {
        sliderStationOffsetY.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (stationOffsetYVal) stationOffsetYVal.textContent = `${val}%`;
            vfx.setStationLogoOffsetY(val / 100);
            broadcastSync({ type: 'set_station_offset_y', val });
        });
    }

    if (sliderStationOffsetX) {
        sliderStationOffsetX.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (stationOffsetXVal) stationOffsetXVal.textContent = `${val}%`;
            vfx.setStationLogoOffsetX(val / 100);
            broadcastSync({ type: 'set_station_offset_x', val });
        });
    }

    if (sliderStationPulse) {
        sliderStationPulse.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (stationPulseVal) stationPulseVal.textContent = `${val}%`;
            vfx.setStationLogoBassPulse(val / 100);
            broadcastSync({ type: 'set_station_logo_pulse', val });
        });
    }

    if (sliderStationContrast) {
        sliderStationContrast.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (stationContrastVal) stationContrastVal.textContent = `${val.toFixed(2)}x`;
            vfx.setStationLogoContrast(val);
            broadcastSync({ type: 'set_station_logo_contrast', val });
        });
    }

    if (sliderStationBright) {
        sliderStationBright.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (stationBrightVal) stationBrightVal.textContent = `${val.toFixed(2)}x`;
            vfx.setStationLogoBrightness(val);
            broadcastSync({ type: 'set_station_logo_bright', val });
        });
    }

    if (checkStationShield) {
        checkStationShield.addEventListener('change', (e) => {
            vfx.setStationLogoShieldVisible(e.target.checked);
            broadcastSync({ type: 'set_station_logo_shield', active: e.target.checked });
        });
    }

    // Upload Station Logo (PNG, JPG, SVG, MP4)
    if (btnUploadStationLogo && fileStationLogo) {
        btnUploadStationLogo.addEventListener('click', () => fileStationLogo.click());

        fileStationLogo.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
            const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
            const reader = new FileReader();

            reader.onload = async (event) => {
                const dataUrl = event.target.result;
                const item = {
                    id: 'station_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                    title: cleanTitle,
                    filename: file.name,
                    type: file.type || (isVideo ? 'video/mp4' : 'image/png'),
                    isVideo,
                    dataUrl,
                    timestamp: Date.now()
                };
                try {
                    await MediaDB.save('station_logos', item);
                } catch (err) {
                    console.warn('MediaDB save failed:', err);
                }
                addStationLogoCard(dataUrl, cleanTitle, isVideo, true, item.id);
                showToast(`📻 Stored & Loaded Station Logo: ${cleanTitle}`);
            };

            reader.readAsDataURL(file);
        });
    }

    function addStationLogoCard(url, title, isVideo = false, selectImmediately = true, id = null, subLabel = null) {
        if (!stationLogosContainer) return;

        const existing = stationLogosContainer.querySelector(`.station-card[data-station-url="${CSS.escape(url)}"]`);
        if (existing) {
            if (selectImmediately) selectStationLogo(url, title, isVideo, true);
            return;
        }

        const card = document.createElement('div');
        card.className = 'station-card';
        card.setAttribute('data-station-url', url);
        card.setAttribute('data-station-title', title);
        card.setAttribute('data-station-type', isVideo ? 'video' : 'img');
        if (id) card.setAttribute('data-storage-id', id);

        const thumb = document.createElement(isVideo ? 'video' : 'img');
        thumb.className = 'station-card-thumb';
        thumb.src = url;
        if (isVideo) {
            thumb.muted = true;
            thumb.playsInline = true;
            thumb.autoplay = true;
            thumb.loop = true;
        }

        const info = document.createElement('div');
        info.className = 'station-card-info';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'station-card-title';
        titleSpan.textContent = title;

        const subSpan = document.createElement('span');
        subSpan.className = 'station-card-sub';
        subSpan.textContent = subLabel || (id ? (isVideo ? 'Custom Video' : 'Custom Logo') : (isVideo ? 'Video' : 'Station Logo'));

        info.appendChild(titleSpan);
        info.appendChild(subSpan);
        card.appendChild(thumb);
        card.appendChild(info);

        if (id) {
            const delBtn = document.createElement('button');
            delBtn.className = 'card-delete-btn';
            delBtn.textContent = '✕';
            delBtn.title = 'Delete saved logo';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await MediaDB.delete('station_logos', id);
                card.remove();
                showToast(`🗑️ Removed ${title}`);
                if (currentStationLogoUrl === url) {
                    selectStationLogo('/images/station_logos/4TM Primary Logo.png', '4TM Radio', false, true);
                }
            });
            card.appendChild(delBtn);
        }

        stationLogosContainer.appendChild(card);
        wireStationCardClick(card);

        if (selectImmediately) {
            selectStationLogo(url, title, isVideo, true);
        }
    }

    // -------------------------------------------------------------------------
    // 3c. Event Flyer & Promo Graphics Layer Controls
    // -------------------------------------------------------------------------
    function updateFlyerVisibility(active, broadcast = true) {
        isFlyerActive = !!active;
        vfx.setFlyerVisible(isFlyerActive);
        if (flyerBadge) {
            flyerBadge.textContent = isFlyerActive ? 'FLYER: ON' : 'FLYER: OFF';
            flyerBadge.style.color = isFlyerActive ? '#00ffcc' : 'rgba(255,255,255,0.4)';
            flyerBadge.style.borderColor = isFlyerActive ? 'rgba(0,255,204,0.4)' : 'rgba(255,255,255,0.15)';
        }
        if (btnToggleFlyerTop) {
            btnToggleFlyerTop.classList.toggle('active', isFlyerActive);
            if (flyerPowerStatusText) flyerPowerStatusText.textContent = isFlyerActive ? 'ACTIVE ON' : 'OFF';
        }
        const tabLogo = document.querySelector('.activity-tab[data-tab="branding"], .activity-tab[data-tab="logo"]');
        if (tabLogo) tabLogo.classList.toggle('has-dot', isLogoActive || isStationLogoActive || isFlyerActive);
        if (broadcast) {
            broadcastSync({ type: 'set_flyer_vis', vis: isFlyerActive });
        }
    }

    function toggleFlyer() {
        updateFlyerVisibility(!isFlyerActive, true);
    }

    if (flyerBadge) flyerBadge.addEventListener('click', toggleFlyer);
    if (btnToggleFlyerTop) btnToggleFlyerTop.addEventListener('click', toggleFlyer);

    function selectFlyer(url, title, isVideo = false, broadcast = true) {
        currentFlyerUrl = url;
        currentFlyerTitle = title || 'Event Flyer';
        isCurrentFlyerVideo = !!isVideo;

        vfx.loadFlyerMedia(url, isVideo);

        // Update Live Preview Monitor
        if (flyerLogoActiveName) flyerLogoActiveName.textContent = currentFlyerTitle;
        if (flyerMediaPreviewType) flyerMediaPreviewType.textContent = isVideo ? '🎬 VIDEO' : '🖼️ POSTER / FLYER';

        if (isVideo) {
            if (flyerMediaPreviewImg) flyerMediaPreviewImg.style.display = 'none';
            if (flyerMediaPreviewVideo) {
                flyerMediaPreviewVideo.style.display = 'block';
                flyerMediaPreviewVideo.src = url;
                flyerMediaPreviewVideo.play().catch(() => {});
            }
        } else {
            if (flyerMediaPreviewVideo) {
                flyerMediaPreviewVideo.style.display = 'none';
                flyerMediaPreviewVideo.pause();
            }
            if (flyerMediaPreviewImg) {
                flyerMediaPreviewImg.style.display = 'block';
                flyerMediaPreviewImg.src = url;
            }
        }

        const cards = document.querySelectorAll('.flyer-card');
        cards.forEach(card => {
            const cardUrl = card.getAttribute('data-flyer-url');
            card.classList.toggle('active', cardUrl === url);
        });

        try {
            localStorage.setItem('dj_vfx_active_flyer', JSON.stringify({ url, title: currentFlyerTitle, isVideo: isCurrentFlyerVideo }));
        } catch (e) {}

        if (broadcast) {
            broadcastSync({
                type: 'set_flyer_url',
                url,
                title: currentFlyerTitle,
                isVideo: isCurrentFlyerVideo
            });
        }
    }

    function wireFlyerCardClick(card) {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-flyer-url');
            const title = card.getAttribute('data-flyer-title');
            const isVideo = card.getAttribute('data-flyer-type') === 'video';
            selectFlyer(url, title, isVideo, true);
        });
    }

    document.querySelectorAll('.flyer-card').forEach(wireFlyerCardClick);

    // Initial flyer card active highlight
    const firstFlyerCard = document.querySelector('.flyer-card');
    if (firstFlyerCard) {
        firstFlyerCard.classList.add('active');
        if (flyerLogoActiveName) flyerLogoActiveName.textContent = firstFlyerCard.getAttribute('data-flyer-title') || 'Neon Odyssey Live';
    }

    // Flyer Reset to Default
    if (btnResetFlyerDefault) {
        btnResetFlyerDefault.addEventListener('click', () => {
            selectFlyer('/images/flyers/neon_odyssey_flyer.jpg', 'Neon Odyssey Live', false, true);
            showToast('↺ Restored Default Neon Odyssey Flyer');
        });
    }

    // 1. Mode pills (Display Layer)
    flyerModePills.forEach(pill => {
        pill.addEventListener('click', () => {
            const mode = pill.getAttribute('data-fl-mode');
            flyerModePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setFlyerMode(mode);
            broadcastSync({ type: 'set_flyer_mode', mode });
        });
    });

    // 2. Blend pills (Blend & Cutout)
    flyerBlendPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const blend = parseInt(pill.getAttribute('data-fl-blend'), 10);
            flyerBlendPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setFlyerBlendMode(blend);
            broadcastSync({ type: 'set_flyer_blend', blend });
        });
    });

    // 3. Position pills (9-Way Directional D-Pad)
    flyerPosPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const pos = pill.getAttribute('data-fl-pos');
            flyerPosPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setFlyerPosition(pos);
            try { localStorage.setItem('dj_vfx_flyer_pos', pos); } catch (e) {}
            broadcastSync({ type: 'set_flyer_pos', pos });
        });
    });

    // 4. Spin pills (3D Rotation & Spin)
    flyerSpinPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const spin = pill.getAttribute('data-fl-spin');
            flyerSpinPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            vfx.setFlyerSpinMode(spin);
            try { localStorage.setItem('dj_vfx_flyer_spin', spin); } catch (e) {}
            broadcastSync({ type: 'set_flyer_spin', spin });
        });
    });

    // Sliders
    if (sliderFlyerSpinSpeed) {
        sliderFlyerSpinSpeed.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (flyerSpinSpeedVal) flyerSpinSpeedVal.textContent = `${val.toFixed(1)}x`;
            vfx.setFlyerSpinSpeed(val);
            try { localStorage.setItem('dj_vfx_flyer_spin_speed', String(val)); } catch (e) {}
            broadcastSync({ type: 'set_flyer_spin_speed', speed: val });
        });
    }

    if (sliderFlyerScale) {
        sliderFlyerScale.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (flyerScaleVal) flyerScaleVal.textContent = `${val.toFixed(2)}x`;
            vfx.setFlyerScale(val);
            broadcastSync({ type: 'set_flyer_scale', val });
        });
    }

    if (sliderFlyerEdgeMargin) {
        sliderFlyerEdgeMargin.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (flyerEdgeMarginVal) flyerEdgeMarginVal.textContent = `${val}%`;
            vfx.setFlyerEdgeMargin(val / 100);
            broadcastSync({ type: 'set_flyer_edge_margin', val });
        });
    }

    if (sliderFlyerOffsetY) {
        sliderFlyerOffsetY.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (flyerOffsetYVal) flyerOffsetYVal.textContent = `${val}%`;
            vfx.setFlyerOffsetY(val / 100);
            broadcastSync({ type: 'set_flyer_offset_y', val });
        });
    }

    if (sliderFlyerOffsetX) {
        sliderFlyerOffsetX.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (flyerOffsetXVal) flyerOffsetXVal.textContent = `${val}%`;
            vfx.setFlyerOffsetX(val / 100);
            broadcastSync({ type: 'set_flyer_offset_x', val });
        });
    }

    if (sliderFlyerPulse) {
        sliderFlyerPulse.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (flyerPulseVal) flyerPulseVal.textContent = `${val}%`;
            vfx.setFlyerBassPulse(val / 100);
            broadcastSync({ type: 'set_flyer_pulse', val });
        });
    }

    if (sliderFlyerContrast) {
        sliderFlyerContrast.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (flyerContrastVal) flyerContrastVal.textContent = `${val.toFixed(2)}x`;
            vfx.setFlyerContrast(val);
            broadcastSync({ type: 'set_flyer_contrast', val });
        });
    }

    if (sliderFlyerBright) {
        sliderFlyerBright.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (flyerBrightVal) flyerBrightVal.textContent = `${val.toFixed(2)}x`;
            vfx.setFlyerBrightness(val);
            broadcastSync({ type: 'set_flyer_bright', val });
        });
    }

    if (checkFlyerShield) {
        checkFlyerShield.addEventListener('change', (e) => {
            vfx.setFlyerShieldVisible(e.target.checked);
            broadcastSync({ type: 'set_flyer_shield', active: e.target.checked });
        });
    }

    // Upload Flyer Media (PNG, JPG, WebP, MP4)
    if (btnUploadFlyer && fileFlyer) {
        btnUploadFlyer.addEventListener('click', () => fileFlyer.click());

        fileFlyer.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
            const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
            const reader = new FileReader();

            reader.onload = async (event) => {
                const dataUrl = event.target.result;
                const item = {
                    id: 'flyer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                    title: cleanTitle,
                    filename: file.name,
                    type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
                    isVideo,
                    dataUrl,
                    timestamp: Date.now()
                };
                try {
                    await MediaDB.save('flyers', item);
                } catch (err) {
                    console.warn('MediaDB save failed for flyer:', err);
                }
                addFlyerCard(dataUrl, cleanTitle, isVideo, true, item.id);
                showToast(`🖼️ Stored & Loaded Event Flyer: ${cleanTitle}`);
            };

            reader.readAsDataURL(file);
        });
    }

    function addFlyerCard(url, title, isVideo = false, selectImmediately = true, id = null, subLabel = null) {
        if (!flyerLogosContainer) return;

        const existing = flyerLogosContainer.querySelector(`.flyer-card[data-flyer-url="${CSS.escape(url)}"]`);
        if (existing) {
            if (selectImmediately) selectFlyer(url, title, isVideo, true);
            return;
        }

        const card = document.createElement('div');
        card.className = 'flyer-card';
        card.setAttribute('data-flyer-url', url);
        card.setAttribute('data-flyer-title', title);
        card.setAttribute('data-flyer-type', isVideo ? 'video' : 'img');
        if (id) card.setAttribute('data-storage-id', id);

        const thumb = document.createElement(isVideo ? 'video' : 'img');
        thumb.className = 'flyer-card-thumb';
        thumb.src = url;
        if (isVideo) {
            thumb.muted = true;
            thumb.playsInline = true;
            thumb.autoplay = true;
            thumb.loop = true;
        }

        const info = document.createElement('div');
        info.className = 'flyer-card-info';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'flyer-card-title';
        titleSpan.textContent = title;

        const subSpan = document.createElement('span');
        subSpan.className = 'flyer-card-sub';
        subSpan.textContent = subLabel || (id ? (isVideo ? 'Custom Video Promo' : 'Custom Poster') : (isVideo ? 'Video' : 'Promo Poster'));

        info.appendChild(titleSpan);
        info.appendChild(subSpan);
        card.appendChild(thumb);
        card.appendChild(info);

        if (id) {
            const delBtn = document.createElement('button');
            delBtn.className = 'card-delete-btn';
            delBtn.textContent = '✕';
            delBtn.title = 'Delete saved flyer';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await MediaDB.delete('flyers', id);
                card.remove();
                showToast(`🗑️ Removed ${title}`);
                if (currentFlyerUrl === url) {
                    selectFlyer('/images/flyers/neon_odyssey_flyer.jpg', 'Neon Odyssey Live', false, true);
                }
            });
            card.appendChild(delBtn);
        }

        flyerLogosContainer.appendChild(card);
        wireFlyerCardClick(card);

        if (selectImmediately) {
            selectFlyer(url, title, isVideo, true);
        }
    }

    // =========================================================================
    // 3d. Multi-Layer Automation & Pop-Up Scheduler Engine
    // =========================================================================
    function setupLayerScheduler(config) {
        const {
            layerKey,
            pills,
            statusBadge,
            freqSelect,
            durSelect,
            transSelect,
            btnPopNow,
            btnPopOff,
            getTimer,
            setTimer,
            popFn,
            popOffFn,
            setTransFn,
            setVisFn,
            getIsActiveFn
        } = config;

        function updateScheduleMode(mode, broadcast = true) {
            pills.forEach(p => p.classList.toggle('active', p.getAttribute('data-sched-mode') === mode));

            // Clear running interval timer
            let t = getTimer();
            if (t) {
                clearInterval(t);
                setTimer(null);
            }

            const freqSec = parseInt(freqSelect?.value || '120', 10);
            const durSec = parseInt(durSelect?.value || '15', 10);
            const trans = transSelect?.value || 'smooth_fade';
            setTransFn(trans);

            if (mode === 'popup') {
                if (statusBadge) {
                    const freqMin = Math.round((freqSec / 60) * 10) / 10;
                    statusBadge.textContent = `⏱️ Pop-Up (${freqSec < 60 ? freqSec + 's' : freqMin + 'm'} interval / ${durSec}s show)`;
                    statusBadge.style.color = '#00ffcc';
                }
                // When switching to pop-up mode, start hidden and schedule interval
                setVisFn(false, true);
                const timerId = setInterval(() => {
                    popFn(durSec);
                }, freqSec * 1000);
                setTimer(timerId);
                // Initial pop on enabling pop-up mode
                popFn(durSec);
                showToast(`⏱️ ${layerKey.toUpperCase()} Pop-Up Scheduled every ${freqSec < 60 ? freqSec + 's' : Math.round(freqSec / 60) + 'm'}`);
            } else {
                if (statusBadge) {
                    statusBadge.textContent = '🟢 Continuous Visible';
                    statusBadge.style.color = 'rgba(255,255,255,0.7)';
                }
                setVisFn(getIsActiveFn(), false);
            }

            if (broadcast) {
                broadcastSync({
                    type: 'set_layer_schedule',
                    layer: layerKey,
                    mode,
                    freq: freqSec,
                    dur: durSec,
                    trans
                });
            }
        }

        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                const mode = pill.getAttribute('data-sched-mode');
                updateScheduleMode(mode, true);
            });
        });

        if (freqSelect) {
            freqSelect.addEventListener('change', () => {
                const currentMode = Array.from(pills).find(p => p.classList.contains('active'))?.getAttribute('data-sched-mode') || 'always';
                if (currentMode === 'popup') updateScheduleMode('popup', true);
            });
        }

        if (durSelect) {
            durSelect.addEventListener('change', () => {
                const currentMode = Array.from(pills).find(p => p.classList.contains('active'))?.getAttribute('data-sched-mode') || 'always';
                if (currentMode === 'popup') updateScheduleMode('popup', true);
            });
        }

        if (transSelect) {
            transSelect.addEventListener('change', (e) => {
                setTransFn(e.target.value);
                broadcastSync({
                    type: 'set_layer_transition',
                    layer: layerKey,
                    effect: e.target.value
                });
                showToast(`✨ ${layerKey.toUpperCase()} Transition: ${e.target.options[e.target.selectedIndex].text}`);
            });
        }

        if (btnPopNow) {
            btnPopNow.addEventListener('click', () => {
                const durSec = parseInt(durSelect?.value || '15', 10);
                popFn(durSec);
                broadcastSync({ type: 'pop_layer_now', layer: layerKey, duration: durSec });
                showToast(`⚡ Popped ${layerKey.toUpperCase()} for ${durSec}s`);
            });
        }

        if (btnPopOff) {
            btnPopOff.addEventListener('click', () => {
                popOffFn();
                broadcastSync({ type: 'pop_layer_off', layer: layerKey });
                showToast(`⏹️ ${layerKey.toUpperCase()} Dismissed`);
            });
        }

        return { updateScheduleMode };
    }

    const djScheduler = setupLayerScheduler({
        layerKey: 'logo',
        pills: logoSchedModePills,
        statusBadge: logoSchedStatusBadge,
        freqSelect: selectLogoFreq,
        durSelect: selectLogoDur,
        transSelect: selectLogoTrans,
        btnPopNow: btnPopLogoNow,
        btnPopOff: btnPopOffLogoNow,
        getTimer: () => logoIntervalTimer,
        setTimer: (t) => { logoIntervalTimer = t; },
        popFn: (dur) => vfx.popLogo(dur),
        popOffFn: () => vfx.setLogoVisible(false),
        setTransFn: (eff) => vfx.setLogoTransitionEffect(eff),
        setVisFn: (vis, imm) => vfx.setLogoVisible(vis, imm),
        getIsActiveFn: () => isLogoActive
    });

    const stationScheduler = setupLayerScheduler({
        layerKey: 'station',
        pills: stationSchedModePills,
        statusBadge: stationSchedStatusBadge,
        freqSelect: selectStationFreq,
        durSelect: selectStationDur,
        transSelect: selectStationTrans,
        btnPopNow: btnPopStationNow,
        btnPopOff: btnPopOffStationNow,
        getTimer: () => stationIntervalTimer,
        setTimer: (t) => { stationIntervalTimer = t; },
        popFn: (dur) => vfx.popStationLogo(dur),
        popOffFn: () => vfx.setStationLogoVisible(false),
        setTransFn: (eff) => vfx.setStationLogoTransitionEffect(eff),
        setVisFn: (vis, imm) => vfx.setStationLogoVisible(vis, imm),
        getIsActiveFn: () => isStationLogoActive
    });

    const flyerScheduler = setupLayerScheduler({
        layerKey: 'flyer',
        pills: flyerSchedModePills,
        statusBadge: flyerSchedStatusBadge,
        freqSelect: selectFlyerFreq,
        durSelect: selectFlyerDur,
        transSelect: selectFlyerTrans,
        btnPopNow: btnPopFlyerNow,
        btnPopOff: btnPopOffFlyerNow,
        getTimer: () => flyerIntervalTimer,
        setTimer: (t) => { flyerIntervalTimer = t; },
        popFn: (dur) => vfx.popFlyer(dur),
        popOffFn: () => vfx.setFlyerVisible(false),
        setTransFn: (eff) => vfx.setFlyerTransitionEffect(eff),
        setVisFn: (vis, imm) => vfx.setFlyerVisible(vis, imm),
        getIsActiveFn: () => isFlyerActive
    });

    // Fetch and Sync Media from Server Directories & IndexedDB
    async function syncMediaFolders() {
        try {
            const resp = await fetch('/api/media-list', { signal: AbortSignal.timeout(3000) });
            if (resp.ok) {
                const data = await resp.json();
                if (data.dj_logos && Array.isArray(data.dj_logos)) {
                    data.dj_logos.forEach(item => {
                        addDjLogoCard(item.url, item.title, item.isVideo, false, null, item.sub || (item.isVideo ? 'Video' : 'DJ Logo'));
                    });
                }
                if (data.station_logos && Array.isArray(data.station_logos)) {
                    data.station_logos.forEach(item => {
                        addStationLogoCard(item.url, item.title, item.isVideo, false, null, item.sub || (item.isVideo ? 'Video' : 'Station Logo'));
                    });
                }
                if (data.flyers && Array.isArray(data.flyers)) {
                    data.flyers.forEach(item => {
                        addFlyerCard(item.url, item.title, item.isVideo, false, null, item.sub || (item.isVideo ? 'Video' : 'Promo Flyer'));
                    });
                }
            }
        } catch (e) {
            // Server endpoint unavailable (offline/static mode) - graceful fallback
        }
    }

    // Initialize Persistent Media Libraries from Directories and IndexedDB
    async function initStoredMediaLibraries() {
        try {
            // 1. Scan filesystem folders
            await syncMediaFolders();

            // 2. Load DJ Media from IndexedDB (custom uploads)
            const storedDj = await MediaDB.getAll('dj_logos');
            storedDj.forEach(item => {
                addDjLogoCard(item.dataUrl, item.title, item.isVideo, false, item.id);
            });

            // 3. Load Station Logos from IndexedDB (custom uploads)
            const storedStation = await MediaDB.getAll('station_logos');
            storedStation.forEach(item => {
                addStationLogoCard(item.dataUrl, item.title, item.isVideo, false, item.id);
            });

            // 4. Load Flyers from IndexedDB (custom uploads)
            const storedFlyers = await MediaDB.getAll('flyers');
            storedFlyers.forEach(item => {
                addFlyerCard(item.dataUrl, item.title, item.isVideo, false, item.id);
            });

            // 5. Restore active saved choices
            const savedDj = localStorage.getItem('dj_vfx_active_dj_media');
            if (savedDj) {
                try {
                    const parsed = JSON.parse(savedDj);
                    selectDjLogo(parsed.url, parsed.title, parsed.isVideo, false);
                } catch (e) {}
            }

            const savedStation = localStorage.getItem('dj_vfx_active_station_logo');
            if (savedStation) {
                try {
                    const parsed = JSON.parse(savedStation);
                    selectStationLogo(parsed.url, parsed.title, parsed.isVideo, false);
                } catch (e) {}
            }

            const savedFlyer = localStorage.getItem('dj_vfx_active_flyer');
            if (savedFlyer) {
                try {
                    const parsed = JSON.parse(savedFlyer);
                    selectFlyer(parsed.url, parsed.title, parsed.isVideo, false);
                } catch (e) {}
            }

            // Restore saved positions
            const savedLogoPos = localStorage.getItem('dj_vfx_logo_pos');
            if (savedLogoPos) {
                posPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-pos') === savedLogoPos));
                vfx.setLogoPosition(savedLogoPos);
            }

            const savedStationPos = localStorage.getItem('dj_vfx_station_pos');
            if (savedStationPos) {
                stationPosPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-st-pos') === savedStationPos));
                vfx.setStationLogoPosition(savedStationPos);
            }

            const savedFlyerPos = localStorage.getItem('dj_vfx_flyer_pos');
            if (savedFlyerPos) {
                flyerPosPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-fl-pos') === savedFlyerPos));
                vfx.setFlyerPosition(savedFlyerPos);
            }
        } catch (err) {
            console.warn('Failed to load libraries from IndexedDB:', err);
        }
    }
    initStoredMediaLibraries();

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
            const file = e.dataTransfer.files[0];
            const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm');
            const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
            const reader = new FileReader();

            reader.onload = async (event) => {
                const dataUrl = event.target.result;
                const item = {
                    id: 'dj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                    title: cleanTitle,
                    filename: file.name,
                    type: file.type || (isVideo ? 'video/mp4' : 'image/png'),
                    isVideo,
                    dataUrl,
                    timestamp: Date.now()
                };
                try {
                    await MediaDB.save('dj_logos', item);
                } catch (err) {}
                addDjLogoCard(dataUrl, cleanTitle, isVideo, true, item.id);
                showToast(`🎧 Stored & Loaded DJ Media: ${cleanTitle}`);
            };

            reader.readAsDataURL(file);
        }
    });

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

        djModePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-mode') === 'hologram'));
        vfx.setLogoMode('hologram');

        djBlendPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-blend') === '0'));
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

        // Scale & Edge Margin
        if (sliderLogoScale) {
            sliderLogoScale.value = 1.0;
            logoScaleVal.textContent = '1.0x';
            vfx.setLogoScale(1.0);
        }
        if (sliderLogoEdgeMargin) {
            sliderLogoEdgeMargin.value = 4;
            if (logoEdgeMarginVal) logoEdgeMarginVal.textContent = '4%';
            vfx.setLogoEdgeMargin(0.04);
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

        // Reset Media to default jkmclaren Shock
        selectDjLogo('/images/logo/jkmclaren_shock.mp4', 'jkmclaren Shock', true, false);

        // 3. Station Logo Reset
        updateStationLogoVisibility(false, false);
        selectStationLogo('/images/station_logos/4TM Primary Logo.png', '4TM Radio', false, false);
        stationModePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-st-mode') === 'overlay'));
        vfx.setStationLogoMode('overlay');
        stationBlendPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-st-blend') === '0'));
        vfx.setStationLogoBlendMode(0);
        stationPosPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-st-pos') === 'top-right'));
        vfx.setStationLogoPosition('top-right');
        stationSpinPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-st-spin') === 'off'));
        vfx.setStationLogoSpinMode('off');
        if (sliderStationSpinSpeed) {
            sliderStationSpinSpeed.value = 1.0;
            if (stationSpinSpeedVal) stationSpinSpeedVal.textContent = '1.0x';
            vfx.setStationLogoSpinSpeed(1.0);
        }
        if (sliderStationScale) {
            sliderStationScale.value = 0.85;
            if (stationScaleVal) stationScaleVal.textContent = '0.85x';
            vfx.setStationLogoScale(0.85);
        }
        if (sliderStationEdgeMargin) {
            sliderStationEdgeMargin.value = 4;
            if (stationEdgeMarginVal) stationEdgeMarginVal.textContent = '4%';
            vfx.setStationLogoEdgeMargin(0.04);
        }
        if (sliderStationPulse) {
            sliderStationPulse.value = 25;
            if (stationPulseVal) stationPulseVal.textContent = '25%';
            vfx.setStationLogoBassPulse(0.25);
        }
        if (sliderStationContrast) {
            sliderStationContrast.value = 1.25;
            if (stationContrastVal) stationContrastVal.textContent = '1.25x';
            vfx.setStationLogoContrast(1.25);
        }
        if (sliderStationBright) {
            sliderStationBright.value = 1.05;
            if (stationBrightVal) stationBrightVal.textContent = '1.05x';
            vfx.setStationLogoBrightness(1.05);
        }
        if (checkStationShield) {
            checkStationShield.checked = true;
            vfx.setStationLogoShieldVisible(true);
        }

        // 4. Event Flyer Reset
        updateFlyerVisibility(false, false);
        selectFlyer('/images/flyers/neon_odyssey_flyer.jpg', 'Neon Odyssey Live', false, false);
        flyerModePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-fl-mode') === 'overlay'));
        vfx.setFlyerMode('overlay');
        flyerBlendPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-fl-blend') === '0'));
        vfx.setFlyerBlendMode(0);
        flyerPosPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-fl-pos') === 'center'));
        vfx.setFlyerPosition('center');
        flyerSpinPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-fl-spin') === 'off'));
        vfx.setFlyerSpinMode('off');
        if (sliderFlyerSpinSpeed) {
            sliderFlyerSpinSpeed.value = 1.0;
            if (flyerSpinSpeedVal) flyerSpinSpeedVal.textContent = '1.0x';
            vfx.setFlyerSpinSpeed(1.0);
        }
        if (sliderFlyerScale) {
            sliderFlyerScale.value = 1.0;
            if (flyerScaleVal) flyerScaleVal.textContent = '1.0x';
            vfx.setFlyerScale(1.0);
        }
        if (sliderFlyerEdgeMargin) {
            sliderFlyerEdgeMargin.value = 4;
            if (flyerEdgeMarginVal) flyerEdgeMarginVal.textContent = '4%';
            vfx.setFlyerEdgeMargin(0.04);
        }
        if (sliderFlyerPulse) {
            sliderFlyerPulse.value = 20;
            if (flyerPulseVal) flyerPulseVal.textContent = '20%';
            vfx.setFlyerBassPulse(0.20);
        }
        if (sliderFlyerContrast) {
            sliderFlyerContrast.value = 1.15;
            if (flyerContrastVal) flyerContrastVal.textContent = '1.15x';
            vfx.setFlyerContrast(1.15);
        }
        if (sliderFlyerBright) {
            sliderFlyerBright.value = 1.0;
            if (flyerBrightVal) flyerBrightVal.textContent = '1.0x';
            vfx.setFlyerBrightness(1.0);
        }
        if (checkFlyerShield) {
            checkFlyerShield.checked = true;
            vfx.setFlyerShieldVisible(true);
        }

        if (broadcast) {
            broadcastSync({ type: 'reset_all' });
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

        if (btnSetupResetAll) {
            const origSetupText = btnSetupResetAll.innerHTML;
            btnSetupResetAll.innerHTML = '✓ ALL PARAMETERS RESTORED';
            btnSetupResetAll.style.background = 'rgba(0,255,204,0.3)';
            btnSetupResetAll.style.borderColor = '#00ffcc';
            btnSetupResetAll.style.color = '#00ffcc';
            setTimeout(() => {
                btnSetupResetAll.innerHTML = origSetupText;
                btnSetupResetAll.style.background = '';
                btnSetupResetAll.style.borderColor = '';
                btnSetupResetAll.style.color = '';
            }, 1200);
        }
    }

    if (btnResetAll) {
        btnResetAll.addEventListener('click', () => resetAllParameters(true));
    }
    if (btnSetupResetAll) {
        btnSetupResetAll.addEventListener('click', () => resetAllParameters(true));
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
    const FX_NAMES = [
        '3D Studio EQ', 'Circular Spectrum', 'Fluid Wave Matrix', 'DJ Deck Waveforms',
        'Spinning Disco Ball', '70s Disco Dancefloor', 'Dual-Bank Lasers', 'Saber Multi-Beams',
        'Strobe Rings', 'Silhouette Dancers', 'Synthwave Grid', 'Synthwave River & Sun',
        'Matrix Code Rain', 'Retro Arcade 80s', 'Warp Starfield', 'Spiral Galaxy Vortex',
        'Hyper Particle Stream', 'Time.is Clock', 'Sweeping Godrays', 'White Godrays & Fog',
        'Disco Floor & Godrays', 'VHS Glitch Words'
    ];

    const btnAutoVJFxPane = document.getElementById('btn-auto-vj-fxpane');
    const btnFlashFxPane = document.getElementById('btn-flash-fxpane');
    const btnRandomFx = document.getElementById('btn-random-fx');
    const fxPaneActiveBadge = document.getElementById('fx-pane-active-badge');
    const fxPaneCatPills = document.querySelectorAll('#fx-pane-cat-pills button');

    function selectFX(index, broadcast = true) {
        const targetIndex = ((index % TOTAL_FX) + TOTAL_FX) % TOTAL_FX;
        vfx.switchFX(targetIndex);

        try {
            localStorage.setItem('dj_vfx_current_fx', String(targetIndex));
        } catch (e) {}

        // Update bottom bar buttons (if present)
        fxButtons.forEach((btn) => {
            const btnIdx = parseInt(btn.getAttribute('data-fx'), 10);
            btn.classList.toggle('active', btnIdx === targetIndex);
        });

        // Update FX console pane cards
        const fxPaneCards = document.querySelectorAll('.fx-pane-card');
        fxPaneCards.forEach((card) => {
            const cardIdx = parseInt(card.getAttribute('data-fx'), 10);
            card.classList.toggle('active', cardIdx === targetIndex);
        });

        // Update active badge in FX pane
        if (fxPaneActiveBadge) {
            const name = FX_NAMES[targetIndex] || `FX ${targetIndex + 1}`;
            fxPaneActiveBadge.textContent = `ACTIVE: ${name.toUpperCase()}`;
        }

        if (broadcast) {
            broadcastSync({ type: 'set_fx', fx: targetIndex });
        }
    }

    // Restore Saved FX Scene from LocalStorage on Startup
    try {
        const savedFX = localStorage.getItem('dj_vfx_current_fx');
        if (savedFX !== null) {
            const parsed = parseInt(savedFX, 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed < TOTAL_FX) {
                selectFX(parsed, false);
            }
        }
    } catch (e) {}

    // FX Pane Elements & Filtering
    const fxSearchInput = document.getElementById('fx-search-input');
    const btnFxSearchClear = document.getElementById('btn-fx-search-clear');
    const fxSearchCount = document.getElementById('fx-search-count');
    const fxPaneCards = document.querySelectorAll('.fx-pane-card');
    const fxCategoryBtns = document.querySelectorAll('.fx-category-btn, #fx-pane-cat-pills button');

    let currentFxCategory = 'all';
    let currentFxSearchQuery = '';

    function filterFxCards() {
        let visibleCount = 0;
        const q = currentFxSearchQuery.toLowerCase().trim();

        fxPaneCards.forEach((card) => {
            const cardCat = card.getAttribute('data-fxcat') || '';
            const title = (card.querySelector('.fx-pane-card-title')?.textContent || '').toLowerCase();
            const key = (card.querySelector('.fx-pane-key')?.textContent || '').toLowerCase();
            const catTag = (card.querySelector('.fx-pane-cat-tag')?.textContent || '').toLowerCase();

            const matchesCategory = (currentFxCategory === 'all' || cardCat === currentFxCategory);
            const matchesSearch = !q || title.includes(q) || key.includes(q) || catTag.includes(q);

            if (matchesCategory && matchesSearch) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (fxSearchCount) {
            fxSearchCount.textContent = `${visibleCount} / ${TOTAL_FX}`;
        }

        // Show "no results" state if 0 visible
        let noResults = document.getElementById('fx-pane-no-results');
        if (visibleCount === 0) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.id = 'fx-pane-no-results';
                noResults.className = 'fx-pane-no-results';
                const grid = document.getElementById('fx-pane-grid');
                if (grid) grid.appendChild(noResults);
            }
            noResults.innerHTML = `🔍 No shaders match "<strong>${q}</strong>" in this category.`;
            noResults.style.display = 'block';
        } else if (noResults) {
            noResults.style.display = 'none';
        }
    }

    if (fxSearchInput) {
        fxSearchInput.addEventListener('input', (e) => {
            currentFxSearchQuery = e.target.value;
            if (btnFxSearchClear) {
                btnFxSearchClear.style.display = currentFxSearchQuery ? 'block' : 'none';
            }
            filterFxCards();
        });
        // Prevent global hotkeys from firing while typing in search
        fxSearchInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
                fxSearchInput.value = '';
                currentFxSearchQuery = '';
                if (btnFxSearchClear) btnFxSearchClear.style.display = 'none';
                filterFxCards();
                fxSearchInput.blur();
            }
        });
    }

    if (btnFxSearchClear) {
        btnFxSearchClear.addEventListener('click', () => {
            if (fxSearchInput) fxSearchInput.value = '';
            currentFxSearchQuery = '';
            btnFxSearchClear.style.display = 'none';
            filterFxCards();
            if (fxSearchInput) fxSearchInput.focus();
        });
    }

    fxCategoryBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const cat = btn.getAttribute('data-fxcat') || 'all';
            currentFxCategory = cat;
            fxCategoryBtns.forEach(b => b.classList.toggle('active', (b.getAttribute('data-fxcat') || 'all') === cat));
            filterFxCards();
        });
    });

    // FX Pane Card Click Listeners
    fxPaneCards.forEach((card) => {
        card.addEventListener('click', () => {
            const fxIdx = parseInt(card.getAttribute('data-fx'), 10);
            selectFX(fxIdx);
        });
    });

    // Bottom Bar Category Tabs Filtering
    const fxPresetsRowEl = document.getElementById('fx-presets-row');
    catTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const cat = tab.getAttribute('data-category');
            catTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (fxPresetsRowEl) {
                fxPresetsRowEl.classList.toggle('all-mode', cat === 'all');
            }

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
        if (btnAutoVJFxPane) {
            btnAutoVJFxPane.classList.toggle('active', isAutoVJ);
            btnAutoVJFxPane.innerHTML = isAutoVJ ? `<span class="fx-key">A</span> AUTO VJ: ON` : `<span class="fx-key">A</span> AUTO VJ`;
        }
        if (broadcast) {
            broadcastSync({ type: 'set_auto_vj', active: isAutoVJ });
        }
    }

    if (btnAutoVJ) btnAutoVJ.addEventListener('click', () => toggleAutoVJ(true));
    if (btnAutoVJPanel) btnAutoVJPanel.addEventListener('click', () => toggleAutoVJ(true));
    if (btnAutoVJFxPane) btnAutoVJFxPane.addEventListener('click', () => toggleAutoVJ(true));

    // Strobe Flash Action
    function triggerFlashAction() {
        vfx.triggerManualFlash();
        broadcastSync({ type: 'flash' });
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
    if (btnFlashFxPane) btnFlashFxPane.addEventListener('click', triggerFlashAction);

    // Random FX Action
    if (btnRandomFx) {
        btnRandomFx.addEventListener('click', () => {
            let nextFx;
            const current = vfx.getCurrentFX();
            do {
                nextFx = Math.floor(Math.random() * TOTAL_FX);
            } while (nextFx === current && TOTAL_FX > 1);
            selectFX(nextFx);
            showToast(`🎲 Switched to ${FX_NAMES[nextFx] || 'FX ' + (nextFx + 1)}`);
        });
    }

    // 5. Calibration Sliders
    if (sliderGain) {
        sliderGain.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            gainVal.textContent = `${val.toFixed(1)}x`;
            if (audioProcessor) audioProcessor.setGain(val);
            broadcastSync({ type: 'set_gain', val });
        });
    }

    if (sliderSens) {
        sliderSens.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            sensVal.textContent = `${val.toFixed(1)}x`;
            if (audioProcessor) audioProcessor.setBassSensitivity(val);
            broadcastSync({ type: 'set_sens', val });
        });
    }

    if (sliderBloom) {
        sliderBloom.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            bloomVal.textContent = `${val.toFixed(2)}x`;
            vfx.setBloomMultiplier(val);
            broadcastSync({ type: 'set_bloom', val });
        });
    }

    // DJ Protocol / Ecosystem Selector
    djEcosystemPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const eco = pill.getAttribute('data-eco');
            djEcosystemPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            if (stagelinqClient) stagelinqClient.setEcosystem(eco);

            let label = 'MULTI-SYNC';
            if (eco === 'pioneer') label = 'PIONEER LINK';
            else if (eco === 'traktor') label = 'TRAKTOR LINK';
            else if (eco === 'stagelinq') label = 'STAGELINQ';
            else if (eco === 'auto') label = 'MULTI-SYNC';

            if (djProtocolBadge) djProtocolBadge.textContent = label;
            showToast(`🎛️ Switched DJ Ecosystem to: ${pill.textContent.trim()}`);
        });
    });

    // DJ Connection Guide Modal Listeners
    if (btnOpenDjGuide && djGuideModalBackdrop) {
        btnOpenDjGuide.addEventListener('click', () => {
            djGuideModalBackdrop.style.display = 'flex';
        });
    }
    if (btnCloseDjGuide && djGuideModalBackdrop) {
        btnCloseDjGuide.addEventListener('click', () => {
            djGuideModalBackdrop.style.display = 'none';
        });
    }
    if (btnCloseDjGuideDone && djGuideModalBackdrop) {
        btnCloseDjGuideDone.addEventListener('click', () => {
            djGuideModalBackdrop.style.display = 'none';
        });
    }
    if (djGuideModalBackdrop) {
        djGuideModalBackdrop.addEventListener('click', (e) => {
            if (e.target === djGuideModalBackdrop) djGuideModalBackdrop.style.display = 'none';
        });
    }

    // =========================================================================
    // 6b. PIONEER CDJ-3000 & CDJ-2000 PHRASE / PHASE VISUALIZER ENGINE
    // =========================================================================
    const phraseModeSelector = document.getElementById('phrase-mode-selector');
    const phraseModeBtns = document.querySelectorAll('.phrase-mode-btn[data-phrasemode]');
    const cdj3000View = document.getElementById('cdj3000-view');
    const cdj2000View = document.getElementById('cdj2000-view');
    const cdjDualView = document.getElementById('cdjdual-view');
    const phraseSyncSource = document.getElementById('phrase-sync-source');
    const cdjMeterContainer = document.getElementById('cdj-meter-container');

    const cdj3000PhraseTag = document.getElementById('cdj3000-phrase-tag');
    const cdj3000BarText = document.getElementById('cdj3000-bar-text');
    const cdj3000CountdownText = document.getElementById('cdj3000-countdown-text');
    const cdj3000BarTrack = document.getElementById('cdj3000-bar-track');
    const cdj3000Minimap = document.getElementById('cdj3000-minimap');

    const cdj2000BarNum = document.getElementById('cdj2000-bar-num');
    const cdj2000BeatNum = document.getElementById('cdj2000-beat-num');
    const phaseBlocks = [
        document.getElementById('phase-block-1'),
        document.getElementById('phase-block-2'),
        document.getElementById('phase-block-3'),
        document.getElementById('phase-block-4')
    ];
    const phaseSweepNeedle = document.getElementById('phase-sweep-needle');

    const cdjDualPhraseTag = document.getElementById('cdjdual-phrase-tag');
    const cdjDualBarCount = document.getElementById('cdjdual-bar-count');
    const cdjDualBarTrack = document.getElementById('cdjdual-bar-track');
    const cdjDualMinimap = document.getElementById('cdjdual-minimap');
    const dualPips = [
        document.getElementById('dual-pip-1'),
        document.getElementById('dual-pip-2'),
        document.getElementById('dual-pip-3'),
        document.getElementById('dual-pip-4')
    ];
    const beatPips = [
        document.getElementById('beat-pip-1'),
        document.getElementById('beat-pip-2'),
        document.getElementById('beat-pip-3'),
        document.getElementById('beat-pip-4')
    ];

    // Standard Electronic / Club Song Structure Model (Rekordbox / CDJ-3000 Phrase Matrix)
    const CDJ_PHRASE_STRUCT = [
        { name: 'INTRO 1', type: 'intro', bars: 8, label: 'INTRO', nextAction: 'UP BUILD' },
        { name: 'UP 1', type: 'up', bars: 8, label: 'UP', nextAction: 'DROP 1' },
        { name: 'CHORUS 1', type: 'chorus', bars: 16, label: 'CHORUS / DROP', nextAction: 'BREAK' },
        { name: 'DOWN 1', type: 'down', bars: 8, label: 'BREAKDOWN', nextAction: 'BUILD-UP' },
        { name: 'UP 2', type: 'up', bars: 8, label: 'BUILD-UP', nextAction: 'MAIN DROP' },
        { name: 'CHORUS 2', type: 'chorus', bars: 16, label: 'MAIN DROP', nextAction: 'OUTRO' },
        { name: 'OUTRO', type: 'outro', bars: 8, label: 'OUTRO', nextAction: 'MIX END' }
    ];

    let currentPhraseIdx = 2; // Default to high energy CHORUS 1
    let currentBarInPhrase = 3;
    let currentBeatInBar = 1;
    let lastBeatTimestamp = performance.now();
    let lastAudioOnsetTimestamp = 0;
    let activePhraseDisplayMode = '3000';
    try {
        activePhraseDisplayMode = localStorage.getItem('dj_vfx_phrase_mode') || '3000';
    } catch (e) {}

    function setPhraseDisplayMode(mode) {
        activePhraseDisplayMode = mode;
        try { localStorage.setItem('dj_vfx_phrase_mode', mode); } catch (e) {}
        phraseModeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-phrasemode') === mode);
        });
        if (cdj3000View) cdj3000View.style.display = (mode === '3000') ? 'flex' : 'none';
        if (cdj2000View) cdj2000View.style.display = (mode === '2000') ? 'flex' : 'none';
        if (cdjDualView) cdjDualView.style.display = (mode === 'dual') ? 'flex' : 'none';
    }

    phraseModeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const mode = btn.getAttribute('data-phrasemode');
            if (mode) setPhraseDisplayMode(mode);
        });
    });

    setPhraseDisplayMode(activePhraseDisplayMode);

    function updatePhraseUI() {
        const curPhrase = CDJ_PHRASE_STRUCT[currentPhraseIdx] || CDJ_PHRASE_STRUCT[0];
        const totalBars = curPhrase.bars;
        const barsRemaining = Math.max(0, totalBars - currentBarInPhrase);

        // 1. CDJ-3000 Phrase Tag & Colors
        const phraseClass = `phrase-${curPhrase.type}`;
        if (cdj3000PhraseTag) {
            cdj3000PhraseTag.textContent = curPhrase.name;
            cdj3000PhraseTag.className = `phrase-tag ${phraseClass}`;
        }
        if (cdjDualPhraseTag) {
            cdjDualPhraseTag.textContent = curPhrase.name;
            cdjDualPhraseTag.className = `phrase-tag ${phraseClass}`;
        }

        const barText = `BAR ${String(currentBarInPhrase).padStart(2, '0')} / ${String(totalBars).padStart(2, '0')}`;
        if (cdj3000BarText) cdj3000BarText.textContent = barText;
        if (cdjDualBarCount) cdjDualBarCount.textContent = barText;

        if (cdj3000CountdownText) {
            if (barsRemaining > 0) {
                cdj3000CountdownText.textContent = `-${barsRemaining} BARS TO ${curPhrase.nextAction}`;
                cdj3000CountdownText.style.color = (curPhrase.type === 'up') ? '#ff007f' : '#ffaa00';
            } else {
                cdj3000CountdownText.textContent = `● DROP READY`;
                cdj3000CountdownText.style.color = '#00ffcc';
            }
        }

        // 2. Bar Track Segment Progress (8-Segment representation)
        const activeNormalizedBar = Math.min(8, Math.max(1, Math.round((currentBarInPhrase / totalBars) * 8)));
        const updateSegments = (trackEl) => {
            if (!trackEl) return;
            const segments = trackEl.querySelectorAll('.phrase-segment');
            segments.forEach((seg, idx) => {
                const segBar = idx + 1;
                seg.className = 'phrase-segment';
                if (segBar < activeNormalizedBar) {
                    seg.classList.add('filled');
                } else if (segBar === activeNormalizedBar) {
                    seg.classList.add('current');
                }
            });
            if (curPhrase.type === 'chorus') {
                trackEl.classList.add('phrase-chorus-active');
            } else {
                trackEl.classList.remove('phrase-chorus-active');
            }
        };
        updateSegments(cdj3000BarTrack);
        updateSegments(cdjDualBarTrack);

        // 3. Minimap Highlights
        const updateMinimap = (mapEl) => {
            if (!mapEl) return;
            const blocks = mapEl.querySelectorAll('.minimap-block');
            blocks.forEach((b) => b.classList.remove('current-block'));
            const typeClass = `block-${curPhrase.type}`;
            const curBlock = mapEl.querySelector(`.${typeClass}`);
            if (curBlock) curBlock.classList.add('current-block');
        };
        updateMinimap(cdj3000Minimap);
        updateMinimap(cdjDualMinimap);

        // 4. CDJ-2000 Numerical Display
        if (cdj2000BarNum) cdj2000BarNum.textContent = String(currentBarInPhrase).padStart(2, '0');
        if (cdj2000BeatNum) cdj2000BeatNum.textContent = String(currentBeatInBar);
    }

    function triggerBeatPulseVisuals(beatNum) {
        const b = (beatNum >= 1 && beatNum <= 4) ? beatNum : 1;

        // Flash BPM Sub-beat pips
        beatPips.forEach((pip, idx) => {
            if (pip) pip.classList.toggle('active', (idx + 1) === b);
        });

        // Flash CDJ-2000 Phase Blocks
        phaseBlocks.forEach((block, idx) => {
            if (block) block.classList.toggle('active', (idx + 1) === b);
        });

        // Flash Dual View Pips
        dualPips.forEach((pip, idx) => {
            if (pip) pip.classList.toggle('active', (idx + 1) === b);
        });
    }

    function advanceCDJBeat(explicitBeatCount = null, isHardware = false) {
        lastBeatTimestamp = performance.now();
        if (explicitBeatCount !== null && explicitBeatCount >= 1 && explicitBeatCount <= 4) {
            currentBeatInBar = explicitBeatCount;
        } else {
            currentBeatInBar = (currentBeatInBar % 4) + 1;
        }

        if (currentBeatInBar === 1) {
            const curPhrase = CDJ_PHRASE_STRUCT[currentPhraseIdx] || CDJ_PHRASE_STRUCT[0];
            currentBarInPhrase++;
            if (currentBarInPhrase > curPhrase.bars) {
                currentBarInPhrase = 1;
                currentPhraseIdx = (currentPhraseIdx + 1) % CDJ_PHRASE_STRUCT.length;
            }
        }

        if (phraseSyncSource) {
            if (isHardware) {
                phraseSyncSource.textContent = 'PRO DJ LINK';
                phraseSyncSource.style.color = '#ffaa00';
                phraseSyncSource.style.borderColor = '#ffaa00';
            } else {
                phraseSyncSource.textContent = 'BEAT CLOCK';
                phraseSyncSource.style.color = '#00ffcc';
                phraseSyncSource.style.borderColor = 'rgba(0,255,204,0.35)';
            }
        }

        triggerBeatPulseVisuals(currentBeatInBar);
        updatePhraseUI();
    }

    // Tap / Resync downbeat to 1
    if (cdjMeterContainer) {
        cdjMeterContainer.addEventListener('click', () => {
            currentBeatInBar = 1;
            lastBeatTimestamp = performance.now();
            triggerBeatPulseVisuals(1);
            updatePhraseUI();
            showToast('● Downbeat Resynced to Beat 1');
        });
    }

    updatePhraseUI();
    triggerBeatPulseVisuals(1);

    // 6. Connect to Universal DJ Hardware & Software Bridge via WebSocket
    stagelinqClient = setupStageLinqClient({
        onSync: (msg) => handleSyncMessage(msg),
        onBPM: (bpm, deck) => {
            if (bpm && bpm > 40 && bpm < 300) {
                bpmVal.textContent = Number(bpm).toFixed(1);
                vfx.setBPM(bpm);
                if (vfx.setDeckData) vfx.setDeckData({ deck: deck || 1, bpm: Number(bpm) });
                broadcastSync({ type: 'set_bpm', bpm });

                const dIdx = (parseInt(deck, 10) || 1) - 1;
                if (deckCards[dIdx] && deckCards[dIdx].bpm) {
                    deckCards[dIdx].bpm.textContent = Number(bpm).toFixed(1);
                }
            }
        },
        onBeat: (deck, beatCount) => {
            vfx.triggerBeatPulse();
            broadcastSync({ type: 'beat_pulse', deck, beatCount });

            advanceCDJBeat(beatCount, true);

            bpmVal.style.transform = 'scale(1.2)';
            setTimeout(() => {
                bpmVal.style.transform = 'scale(1.0)';
            }, 90);

            const dIdx = (parseInt(deck, 10) || 1) - 1;
            const targetDeckCard = deckCards[dIdx];
            if (targetDeckCard && targetDeckCard.card) {
                targetDeckCard.card.style.background = 'rgba(0, 255, 204, 0.28)';
                targetDeckCard.card.style.borderColor = '#00ffcc';
                if (targetDeckCard.state) {
                    targetDeckCard.state.textContent = `● BEAT ${beatCount || 1}`;
                }
                setTimeout(() => {
                    targetDeckCard.card.style.background = 'rgba(255, 255, 255, 0.04)';
                    targetDeckCard.card.style.borderColor = 'rgba(0, 255, 204, 0.3)';
                    if (targetDeckCard.state) {
                        targetDeckCard.state.textContent = '● ACTIVE';
                    }
                }, 110);
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
        onDeckLoaded: (data) => {
            const dIdx = (parseInt(data.deck, 10) || 1) - 1;
            if (deckCards[dIdx]) {
                if (deckCards[dIdx].bpm && data.bpm) deckCards[dIdx].bpm.textContent = Number(data.bpm).toFixed(1);
                if (deckCards[dIdx].state) deckCards[dIdx].state.textContent = data.artist ? data.artist.slice(0, 8) : 'LOADED';
            }
        },
        onTrack: (trackData) => {
            if (trackData.title) trackTitle.textContent = trackData.title;
            if (trackData.artist) trackArtist.textContent = `${trackData.artist} • Deck ${trackData.deck || 1}`;
            if (trackData.bpm && trackData.bpm > 40 && trackData.bpm < 300) {
                bpmVal.textContent = Number(trackData.bpm).toFixed(1);
                vfx.setBPM(trackData.bpm);
            }

            if (vfx.setDeckData) vfx.setDeckData(trackData);

            const activeIdx = (parseInt(trackData.deck, 10) || 1) - 1;
            deckCards.forEach((d, idx) => {
                if (!d.card) return;
                if (idx === activeIdx) {
                    d.card.style.borderColor = '#00ffcc';
                    d.card.style.background = 'rgba(0, 255, 204, 0.18)';
                    if (d.bpm && trackData.bpm) d.bpm.textContent = Number(trackData.bpm).toFixed(1);
                    if (d.state) d.state.textContent = '● MASTER';
                } else {
                    d.card.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    d.card.style.background = 'rgba(255, 255, 255, 0.03)';
                    if (d.state && d.state.textContent === '● MASTER') d.state.textContent = 'SYNC';
                }
            });

            // Display Now Playing Track Banner overlay with auto-fadeout
            showTrackBanner(trackData, { force: false });

            // Trigger fresh scene on track change if Auto-VJ active
            if (isAutoVJ) {
                const nextFX = (vfx.getCurrentFX() + 1) % TOTAL_FX;
                selectFX(nextFX);
            }
        },
        onDecksSnapshot: (decks) => {
            if (Array.isArray(decks)) {
                decks.forEach(deckData => {
                    const idx = (parseInt(deckData.deck, 10) || 1) - 1;
                    if (deckCards[idx]) {
                        if (deckCards[idx].bpm && deckData.bpm) deckCards[idx].bpm.textContent = Number(deckData.bpm).toFixed(1);
                        if (deckCards[idx].state) deckCards[idx].state.textContent = deckData.play ? '● ACTIVE' : 'STANDBY';
                    }
                });
            }
        },
        onStatusChange: (status) => {
            if (status.connected) {
                if (djHardwareStatusText) {
                    djHardwareStatusText.textContent = status.device ? status.device.toUpperCase() : 'PIONEER • TRAKTOR • DENON READY';
                }
                if (djHardwareLed) {
                    djHardwareLed.style.background = '#00ff88';
                    djHardwareLed.style.boxShadow = '0 0 8px #00ff88';
                }
                if (phraseSyncSource) {
                    phraseSyncSource.textContent = 'PRO DJ LINK';
                    phraseSyncSource.style.color = '#ffaa00';
                    phraseSyncSource.style.borderColor = '#ffaa00';
                }
                broadcastSync({ type: 'request_state' });
            } else {
                if (djHardwareStatusText) djHardwareStatusText.textContent = 'BRIDGE OFFLINE (AUDIO FALLBACK)';
                if (djHardwareLed) {
                    djHardwareLed.style.background = '#ff0055';
                    djHardwareLed.style.boxShadow = '0 0 6px #ff0055';
                }
                if (phraseSyncSource) {
                    phraseSyncSource.textContent = 'BEAT CLOCK';
                    phraseSyncSource.style.color = '#00ffcc';
                    phraseSyncSource.style.borderColor = 'rgba(0,255,204,0.35)';
                }
            }
        },
        onEcosystemChange: (eco) => {
            djEcosystemPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-eco') === eco));
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

            if (status.enabled !== undefined) {
                isHueActive = !!status.enabled;
            }

            // Update Master Toggle & Power Buttons
            updateHueButtonsAndBadges();

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

            if (status.kickStrobeEnabled !== undefined) {
                isHueKickStrobeActive = !!status.kickStrobeEnabled;
                updateKickStrobeBtnState();
            }

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

    function updateHueButtonsAndBadges() {
        if (btnHueToggle) {
            if (isHueActive) {
                btnHueToggle.textContent = '⚡ SYNC: ACTIVE';
                btnHueToggle.style.color = '#00ffcc';
                btnHueToggle.style.borderColor = '#00ffcc';
                btnHueToggle.style.background = 'rgba(0,255,204,0.2)';
            } else {
                btnHueToggle.textContent = '⚪ SYNC: OFF';
                btnHueToggle.style.color = 'rgba(255,255,255,0.7)';
                btnHueToggle.style.borderColor = 'rgba(255,255,255,0.15)';
                btnHueToggle.style.background = 'rgba(255,255,255,0.06)';
            }
        }

        if (btnHuePower) {
            if (isHueActive) {
                btnHuePower.textContent = '💡 LIGHTS: ON';
                btnHuePower.style.background = 'rgba(0,255,204,0.18)';
                btnHuePower.style.borderColor = 'rgba(0,255,204,0.5)';
                btnHuePower.style.color = '#00ffcc';
                btnHuePower.title = 'Philips Hue lights are ON. Click to turn lights OFF.';
            } else {
                btnHuePower.textContent = '🌑 LIGHTS: OFF';
                btnHuePower.style.background = 'rgba(255,255,255,0.06)';
                btnHuePower.style.borderColor = 'rgba(255,255,255,0.15)';
                btnHuePower.style.color = 'rgba(255,255,255,0.55)';
                btnHuePower.title = 'Philips Hue lights are OFF. Click to turn lights ON.';
            }
        }

        const tabHue = document.querySelector('.activity-tab[data-tab="setup"], .activity-tab[data-tab="hue"]');
        if (tabHue) tabHue.classList.toggle('has-dot', isHueActive);
    }

    // Philips Hue UI Event Listeners
    if (btnHueToggle) {
        btnHueToggle.addEventListener('click', () => {
            isHueActive = !isHueActive;
            updateHueButtonsAndBadges();
            if (isHueActive) {
                stagelinqClient.turnOnHue(hueTargetGroup);
                showToast('💡 Philips Hue Sync: ENABLED');
            } else {
                stagelinqClient.turnOffHue(hueTargetGroup);
                showToast('⚪ Philips Hue: Disabled & Lights Turned OFF');
            }
            broadcastSync({ type: 'set_hue_enabled', enabled: isHueActive });
        });
    }

    if (btnHuePower) {
        btnHuePower.addEventListener('click', () => {
            isHueActive = !isHueActive;
            updateHueButtonsAndBadges();
            if (isHueActive) {
                stagelinqClient.turnOnHue(hueTargetGroup);
                showToast('💡 Philips Hue: Room Lights Turned ON');
            } else {
                stagelinqClient.turnOffHue(hueTargetGroup);
                showToast('🌑 Philips Hue: Room Lights Turned OFF');
            }
            broadcastSync({ type: 'set_hue_enabled', enabled: isHueActive });
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
            broadcastSync({ type: 'set_hue_room', room: hueTargetGroup });
        });
    }

    hueModePills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const mode = pill.getAttribute('data-hue-mode');
            hueCurrentMode = mode;
            hueModePills.forEach(p => p.classList.toggle('active', p === pill));
            stagelinqClient.setHueConfig({ mode });
            showToast(`💡 Hue Mode: ${pill.textContent}`);
            broadcastSync({ type: 'set_hue_mode', mode });
        });
    });

    if (sliderHueIntensity) {
        sliderHueIntensity.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10) / 100;
            hueCurrentIntensity = val;
            if (hueIntensityVal) hueIntensityVal.textContent = `${e.target.value}%`;
            stagelinqClient.setHueConfig({ intensity: val });
            broadcastSync({ type: 'set_hue_intensity', val });
        });
    }

    if (sliderHueMinBri) {
        sliderHueMinBri.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10) / 100;
            hueCurrentMinBri = val;
            if (hueMinBriVal) hueMinBriVal.textContent = `${e.target.value}%`;
            stagelinqClient.setHueConfig({ minBrightness: val });
            broadcastSync({ type: 'set_hue_min_bri', val });
        });
    }

    function updateKickStrobeBtnState() {
        if (!btnHueKickStrobe) return;
        if (isHueKickStrobeActive) {
            btnHueKickStrobe.textContent = '⚡ STROBE: ON';
            btnHueKickStrobe.style.color = '#00ffcc';
            btnHueKickStrobe.style.borderColor = '#00ffcc';
            btnHueKickStrobe.style.background = 'rgba(0,255,204,0.2)';
            btnHueKickStrobe.style.boxShadow = '0 0 8px rgba(0,255,204,0.3)';
        } else {
            btnHueKickStrobe.textContent = '⚪ OFF';
            btnHueKickStrobe.style.color = 'rgba(255,255,255,0.7)';
            btnHueKickStrobe.style.borderColor = 'rgba(255,255,255,0.15)';
            btnHueKickStrobe.style.background = 'rgba(255,255,255,0.06)';
            btnHueKickStrobe.style.boxShadow = 'none';
        }
    }

    if (btnHueKickStrobe) {
        btnHueKickStrobe.addEventListener('click', () => {
            isHueKickStrobeActive = !isHueKickStrobeActive;
            updateKickStrobeBtnState();
            stagelinqClient.setHueConfig({ kickStrobeEnabled: isHueKickStrobeActive });
            showToast(isHueKickStrobeActive ? '⚡ Bass Kick White Strobe: ON' : '⚪ Bass Kick White Strobe: OFF');
            broadcastSync({ type: 'set_hue_kick_strobe', active: isHueKickStrobeActive });
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

    // 7. Keyboard Shortcuts (22 Presets)
    const hotkeyMap = {
        '1': 0, '2': 1, '3': 2, '4': 3,
        '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '0': 9,
        '-': 10, '=': 11,
        'q': 12, 'Q': 12,
        'w': 13, 'W': 13,
        'e': 14, 'E': 14,
        'r': 15, 'R': 15,
        't': 16, 'T': 16,
        'y': 17, 'Y': 17,
        'u': 18, 'U': 18,
        'i': 19, 'I': 19,
        'o': 20, 'O': 20,
        'p': 21, 'P': 21,
        '[': 22
    };

    window.addEventListener('keydown', (e) => {
        // [Alt + 1..6] for 6 Master Consoles, [Alt + A] for Show All
        if (e.altKey) {
            if (e.key === '1') { e.preventDefault(); switchTab('perform'); return; }
            if (e.key === '2') { e.preventDefault(); switchTab('fx'); return; }
            if (e.key === '3') { e.preventDefault(); switchTab('branding'); return; }
            if (e.key === '4') { e.preventDefault(); switchTab('nowplaying'); return; }
            if (e.key === '5') { e.preventDefault(); switchTab('setup'); return; }
            if (e.key === '6') { e.preventDefault(); switchTab('about'); return; }
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
        // [L] to toggle DJ Logo layer
        else if (e.key === 'l' || e.key === 'L') {
            toggleLogo();
        }
        // [S] to toggle Station Logo layer
        else if (e.key === 's' || e.key === 'S') {
            updateStationLogoVisibility(!isStationLogoActive, true);
        }
        // [Y] or Shift+[F] to toggle Event Flyer layer
        else if (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'f' || e.key === 'F'))) {
            toggleFlyer();
        }
        // [N] to toggle Now Playing track stream overlay
        else if (e.key === 'n' || e.key === 'N') {
            setTrackBannerEnabled(!isTrackBannerEnabled, true);
        }
        // [C] to toggle Clean Display Mode for Stage / 2nd Screen
        else if (e.key === 'c' || e.key === 'C') {
            hud.classList.toggle('hidden');
            fxBankPanel.classList.toggle('hidden');
            document.body.style.cursor = hud.classList.contains('hidden') ? 'none' : 'default';
        }
        // [Space] for manual beat strobe / flash
        else if (e.code === 'Space') {
            e.preventDefault();
            vfx.triggerManualFlash();
            broadcastSync({ type: 'flash' });
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
        // [H] to toggle entire HUD Console / UI & Toolbar
        else if (e.key === 'h' || e.key === 'H') {
            if (hud) hud.classList.toggle('hidden');
            if (fxBankPanel) fxBankPanel.classList.toggle('hidden');
            document.body.style.cursor = (hud && hud.classList.contains('hidden')) ? 'none' : 'default';
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

    let lastAudioBroadcastTime = 0;

    // 8. Start Real-Time VFX Render Loop (with Multi-Window Audio Relay & Philips Hue Streaming)
    vfx.animate(() => {
        const now = performance.now();
        let data = null;

        if (audioProcessor && audioProcessor.isConnected()) {
            data = audioProcessor.getAudioData();
        } else if (remoteAudioData && (now - lastRemoteAudioTime < 2500)) {
            // Screen Link Active: Consuming live audio from primary console window over WebSocket/BroadcastChannel
            data = remoteAudioData;
            if (audioStatus && !audioStatus.dataset.screenLink) {
                audioStatus.dataset.screenLink = '1';
                audioStatus.innerHTML = `<span style="color:#00ffcc">● OBS / Remote Sync (Live Link Active)</span>`;
                if (hudStatus) {
                    hudStatus.textContent = isOBSMode ? 'OBS STREAM LINK' : '2ND SCREEN SYNC';
                    hudStatus.style.borderColor = '#00ffcc';
                    hudStatus.style.color = '#00ffcc';
                }
            }
        } else if (audioProcessor) {
            data = audioProcessor.getAudioData();
        }

        // Relay live audio frame over BroadcastChannel & WebSocket to OBS / 2nd Screen (~50 FPS)
        if (!isCleanDisplay && data && (now - lastAudioBroadcastTime >= 18)) {
            lastAudioBroadcastTime = now;
            const bins = (data.dataArray && data.dataArray.length > 0)
                ? Array.from(data.dataArray.slice(0, 64))
                : [];
            broadcastSync({
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
                    isOnset: data.isOnset,
                    bins,
                    peakDb: data.peakDb,
                    peakHoldDb: data.peakHoldDb,
                    lufs: data.lufs,
                    headroomDb: data.headroomDb,
                    vuPercent: data.vuPercent,
                    vuRmsPercent: data.vuRmsPercent,
                    vuPeakHoldPercent: data.vuPeakHoldPercent,
                    isClipping: data.isClipping
                }
            });
        }

        if (!data) {
            data = {
                bass: 0,
                smoothedBass: 0,
                bassImpact: 0,
                transientImpulse: 0,
                mid: 0,
                smoothedMid: 0,
                treble: 0,
                smoothedTreble: 0,
                overall: 0,
                isOnset: false,
                dataArray: new Uint8Array(128)
            };
        }

        if (eqBass && data.bass !== undefined) eqBass.style.height = `${Math.min(100, Math.round((data.bassImpact || data.bass) * 100))}%`;
        if (eqMid && data.mid !== undefined) eqMid.style.height = `${Math.min(100, Math.round(data.mid * 100))}%`;
        if (eqTreble && data.treble !== undefined) eqTreble.style.height = `${Math.min(100, Math.round(data.treble * 100))}%`;

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

        // Stream live beat telemetry to Philips Hue Bridge (Adaptive Onsets & High Dynamic Range)
        if (stagelinqClient && isHueActive && (data.bass !== undefined || data.bassImpact !== undefined)) {
            const rawBass = data.bass || 0;
            const transient = data.transientImpulse || 0;
            const isOnset = !!data.isOnset;
            const isKickDrop = isOnset || transient > 0.10 || (rawBass > (data.smoothedBass * 1.05) && rawBass > 0.04);
            const now = performance.now();

            if (isKickDrop || (now - lastHueBeatSentTime > 120)) {
                lastHueBeatSentTime = now;
                try {
                    const rawMid = data.mid || 0;
                    const rawTreble = data.treble || 0;
                    const liveBpm = (bpmVal ? parseFloat(bpmVal.textContent) : 126.0) || 126.0;

                    stagelinqClient.sendHueBeat({
                        bass: rawBass,
                        smoothedBass: data.smoothedBass || rawBass,
                        bassImpact: data.bassImpact || rawBass,
                        transientImpulse: transient,
                        isOnset: isOnset,
                        mid: rawMid,
                        smoothedMid: data.smoothedMid || rawMid,
                        treble: rawTreble,
                        overall: data.overall || 0,
                        sceneColor: vfx.getCurrentSceneColor ? vfx.getCurrentSceneColor() : '#00ffff',
                        scenePalette: vfx.getCurrentScenePalette ? vfx.getCurrentScenePalette() : [],
                        isDrop: transient > 0.65 || (rawBass > 0.70 && (data.bassImpact || 0) > 0.80),
                        isStrobe: false,
                        bpm: liveBpm
                    });
                } catch (err) {
                    // Ignore Hue telemetry errors to ensure VFX audio pipeline is never interrupted
                }
            }
        }

        // CDJ-2000 Phase Needle Sweep (~60 FPS)
        if (phaseSweepNeedle && activePhraseDisplayMode !== '3000') {
            const liveBpm = (bpmVal ? parseFloat(bpmVal.textContent) : 126.0) || 126.0;
            const beatPeriodMs = 60000 / liveBpm;
            const elapsed = now - lastBeatTimestamp;
            const subBeatFraction = Math.min(1.0, Math.max(0, elapsed / beatPeriodMs));
            const totalBarFraction = ((currentBeatInBar - 1) + subBeatFraction) / 4.0;
            phaseSweepNeedle.style.left = `${(totalBarFraction * 75).toFixed(1)}%`;
        }

        // Drive Pioneer Phrase & Phase clock from live audio onsets when offline
        if (data && data.isOnset) {
            const liveBpm = (bpmVal ? parseFloat(bpmVal.textContent) : 126.0) || 126.0;
            const minBeatInterval = (60000 / liveBpm) * 0.7;
            if (now - lastAudioOnsetTimestamp > minBeatInterval) {
                lastAudioOnsetTimestamp = now;
                advanceCDJBeat(null, false);
            }
        }

        return data;
    });
}

init();
