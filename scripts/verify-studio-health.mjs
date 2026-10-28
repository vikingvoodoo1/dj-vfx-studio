#!/usr/bin/env node
/**
 * DJ VFX Studio — Automated Multi-Domain Health & QA Verification Suite
 * Powers the 5 QA Subagents:
 *   1. release-preflight          (Syntax & Module Integrity)
 *   2. ui-wiring-verifier         (Tabs, Sub-Tabs, Modals, Cog Buttons & Snapshot Variables)
 *   3. ui-visual-critic           (HUD Width, 9-Col Denon Tracklist Grid, Overlays & Anti-Twitch CSS)
 *   4. perf-watchdog              (WebAudio Drain Guard, WebSocket Anti-Loop, RAF Throttling)
 *   5. stagelinq-telemetry-auditor (Offline Reset, Hellfire Overlay, Denon 3-Band Wave & Album Enrichment)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

let passed = 0;
let failed = 0;
const failures = [];

function check(domain, label, condition, detail = '') {
    if (condition) {
        passed++;
        console.log(`  ✅ [${domain}] ${label}`);
    } else {
        failed++;
        const msg = `[${domain}] ${label}${detail ? ` — ${detail}` : ''}`;
        failures.push(msg);
        console.error(`  ❌ ${msg}`);
    }
}

function readFile(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

console.log('======================================================================');
console.log('⚡ DJ VFX STUDIO — AUTOMATED QA & HEALTH VERIFICATION SUITE');
console.log('======================================================================\n');

// ---------------------------------------------------------------------------
// 1. RELEASE-PREFLIGHT: Syntax Check Across All Modules
// ---------------------------------------------------------------------------
console.log('📦 1. [release-preflight] Checking JS Module Syntax...');
const jsFilesToCheck = [
    'src/main.js',
    'src/effects.js',
    'src/audio.js',
    'src/stagelinq.js',
    'src/scene-profiles.js',
    'src/ui/scene-config-cog.js',
    'src/ui/video-config-cog.js',
    'src/ui/particle-eq-2d.js',
    'src/ui/scene-thumbnails.js',
    'src/services/session-tracker.js',
    'src/services/media-db.js',
    'src/vfx/shaders.js',
    'src/vfx/textures-club.js',
    'src/vfx/textures-haunted.js',
    'src/vfx/deck-hud-renderer.js',
    'server/stagelinq-bridge.js',
    'server/waveform-service.js',
    'server/hue-service.js',
    'server/obs-service.js'
];

for (const rel of jsFilesToCheck) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
        check('release-preflight', `File exists: ${rel}`, false, 'Missing file');
        continue;
    }
    try {
        execSync(`node --check "${full}"`, { stdio: 'pipe' });
        check('release-preflight', `Syntax OK: ${rel}`, true);
    } catch (err) {
        check('release-preflight', `Syntax OK: ${rel}`, false, err.stderr?.toString() || err.message);
    }
}

// ---------------------------------------------------------------------------
// 2. UI-WIRING-VERIFIER: Tabs, Sub-Tabs, Cog Modals & Snapshot Variables
// ---------------------------------------------------------------------------
console.log('\n🎛️  2. [ui-wiring-verifier] Checking Console Tabs, Cog Modals & Event Wiring...');
const indexHtml = readFile('index.html');
const mainJs = readFile('src/main.js');
const sceneCogJs = readFile('src/ui/scene-config-cog.js');
const videoCogJs = readFile('src/ui/video-config-cog.js');

// Check all activity-bar data-tab buttons have matching #pane-<tab>
const activityTabMatches = [...indexHtml.matchAll(/class="activity-tab[^"]*"\s+data-tab="([^"]+)"/g)].map(m => m[1]);
check('ui-wiring-verifier', `Activity Bar has 9 console tabs (${activityTabMatches.join(', ')})`, activityTabMatches.length >= 9 && activityTabMatches.includes('tracklist'));

for (const tabId of activityTabMatches) {
    const hasPane = indexHtml.includes(`id="pane-${tabId}"`);
    check('ui-wiring-verifier', `Activity tab [data-tab="${tabId}"] has matching #pane-${tabId}`, hasPane);
}

// Check setup sub-tabs have matching #setup-content-<subtab>
const setupSubtabMatches = [...indexHtml.matchAll(/data-setuptab="([^"]+)"/g)].map(m => m[1]);
for (const subId of setupSubtabMatches) {
    const hasSubContent = indexHtml.includes(`id="setup-content-${subId}"`);
    check('ui-wiring-verifier', `Setup sub-tab [data-setuptab="${subId}"] has matching #setup-content-${subId}`, hasSubContent);
}

// Ensure getCurrentConsoleSnapshot does not reference undeclared currentDjLogoIsVideo / currentStationLogoIsVideo / currentFlyerIsVideo
check(
    'ui-wiring-verifier',
    'getCurrentConsoleSnapshot uses declared isCurrentDjVideo / isCurrentStationVideo / isCurrentFlyerVideo',
    !mainJs.includes('currentDjLogoIsVideo') &&
    !mainJs.includes('currentStationLogoIsVideo') &&
    !mainJs.includes('currentFlyerIsVideo') &&
    mainJs.includes('isCurrentDjVideo') &&
    mainJs.includes('isCurrentStationVideo') &&
    mainJs.includes('isCurrentFlyerVideo')
);

// Ensure all 3 Cog triggers & modals are wired
check(
    'ui-wiring-verifier',
    'Scene Card Cog (.fx-card-cog-btn) & Active Scene Cog (#btn-active-scene-cog) wired to openSceneConfigModal',
    sceneCogJs.includes('window.openSceneConfigModal = openSceneConfigModal') &&
    sceneCogJs.includes("modalBackdrop.style.display = 'flex'") &&
    indexHtml.includes('id="btn-active-scene-cog"')
);

check(
    'ui-wiring-verifier',
    'Video Card Cog (.video-card-cog-btn) wired to openVideoConfigModal & openVideoConfigModalByIndex',
    videoCogJs.includes('window.openVideoConfigModal = openVideoConfigModal') &&
    videoCogJs.includes("modalBackdrop.style.display = 'flex'") &&
    mainJs.includes('window.openVideoConfigModalByIndex')
);

check(
    'ui-wiring-verifier',
    'Live Performance Deck Now Playing Strip (#perform-nowplaying-strip) & Shazam button present and wired',
    indexHtml.includes('id="perform-nowplaying-strip"') &&
    indexHtml.includes('id="perform-track-art"') &&
    indexHtml.includes('id="btn-deck-shazam-listen"') &&
    mainJs.includes('function updatePerformDeckTrackCard')
);

// ---------------------------------------------------------------------------
// 3. UI-VISUAL-CRITIC: HUD Width, Denon 9-Column Tracklist Grid & Anti-Twitch
// ---------------------------------------------------------------------------
console.log('\n🎨 3. [ui-visual-critic] Checking Layout, 9-Column Denon Tracklist Grid & Anti-Twitch CSS...');
const mainCss = readFile('src/styles/main.css');

check(
    'ui-visual-critic',
    'Console HUD panel widened to 568px (#hud { width: 568px !important; })',
    mainCss.includes('width: 568px !important;')
);

const headerGridMatch = mainCss.match(/\.denon-tracklist-header\s*\{[^}]*grid-template-columns:\s*([^;]+);/);
const rowGridMatch = mainCss.match(/\.denon-track-grid-row\s*\{[^}]*grid-template-columns:\s*([^;]+);/);
check(
    'ui-visual-critic',
    '.denon-tracklist-header and .denon-track-grid-row share identical 9-column grid template',
    Boolean(headerGridMatch && rowGridMatch && headerGridMatch[1].trim() === rowGridMatch[1].trim() && headerGridMatch[1].trim().split(/\s+/).length === 9),
    headerGridMatch ? `Columns: ${headerGridMatch[1].trim()}` : 'Missing grid-template-columns'
);

check(
    'ui-visual-critic',
    'Denon Tracklist table header includes explicit Title, Artist, and Album columns',
    mainJs.includes('<span>Title</span>') &&
    mainJs.includes('<span>Artist</span>') &&
    mainJs.includes('<span>Album</span>')
);

check(
    'ui-visual-critic',
    'Console anti-twitch rules (overflow-anchor: none; scrollbar-gutter: stable;) present in CSS',
    mainCss.includes('overflow-anchor: none') && mainCss.includes('scrollbar-gutter: stable')
);

// ---------------------------------------------------------------------------
// 4. PERF-WATCHDOG: WebAudio Drain Guard, WebSocket Anti-Loop & RAF Throttling
// ---------------------------------------------------------------------------
console.log('\n🚀 4. [perf-watchdog] Checking WebAudio, WebSocket & 60 FPS Render Guards...');
const audioJs = readFile('src/audio.js');

check(
    'perf-watchdog',
    'WebAudio drainNode uses non-zero 0.000001 gain to prevent Chromium AudioFIFO memory leak',
    audioJs.includes('0.000001')
);

check(
    'perf-watchdog',
    'Philips Hue beat streaming is throttled (>= 70ms minimum interval)',
    mainJs.includes('lastHueBeatSentTime >= 70')
);

check(
    'perf-watchdog',
    'updateSceneRequirementsUI is throttled (500ms) to prevent DOM layout thrashing',
    mainJs.includes('_lastHwReqUiUpdateTime') && mainJs.includes('500')
);

// ---------------------------------------------------------------------------
// 5. STAGELINQ-TELEMETRY-AUDITOR: Hellfire Offline Overlay & Metadata Enrichment
// ---------------------------------------------------------------------------
console.log('\n🎧 5. [stagelinq-telemetry-auditor] Checking Hellfire Offline Overlay & Session Tracker...');
const deckHudJs = readFile('src/vfx/deck-hud-renderer.js');
const sessionTrackerJs = readFile('src/services/session-tracker.js');

check(
    'stagelinq-telemetry-auditor',
    'Hellfire Waveforms center-screen offline overlay (#hellfire-decks-offline-overlay + 3D HUD canvas) wired',
    indexHtml.includes('id="hellfire-decks-offline-overlay"') &&
    indexHtml.includes('TURN ON DECKS TO ACTIVATE THIS SCENE') &&
    deckHudJs.includes('TURN ON DECKS TO ACTIVATE THIS SCENE') &&
    mainJs.includes('function updateHellfireDecksOverlay')
);

check(
    'stagelinq-telemetry-auditor',
    'SessionTracker auto-enriches missing Album, Genre, Duration & Artwork (enrichMissingTrackMetadata)',
    sessionTrackerJs.includes('async enrichMissingTrackMetadata()') &&
    sessionTrackerJs.includes('generateDenonWaveformDataUrl')
);

console.log('\n======================================================================');
if (failed === 0) {
    console.log(`🎉 ALL ${passed} QA & HEALTH CHECKS PASSED! ZERO ISSUES FOUND.`);
    console.log('======================================================================');
    process.exit(0);
} else {
    console.error(`⚠️  ${failed} CHECK(S) FAILED (out of ${passed + failed}):`);
    failures.forEach(f => console.error(`   - ${f}`));
    console.log('======================================================================');
    process.exit(1);
}
