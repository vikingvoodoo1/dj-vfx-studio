---
name: studio-qa-subagents
description: >-
  5 specialized QA subagents (perf-watchdog, ui-wiring-verifier, ui-visual-critic,
  stagelinq-telemetry-auditor, release-preflight) and automated health-check workflow
  (npm run verify) for DJ VFX Studio. Activate after UI, shader, or bridge changes.
---

# DJ VFX Studio — QA Subagents & Automated Health Verification

Use this skill whenever modifying UI panels, shaders, audio routing, or StageLinQ hardware bridge logic to verify performance, UI functionality, visual layout, and build integrity without bloating the main conversation context.

## 1. Instant Automated Verification (`npm run verify`)
Always run the multi-domain verification suite after making UI or code changes:
```bash
npm run verify
```
This executes `scripts/verify-studio-health.mjs`, checking all 5 domains in ~1.5 seconds:
1. **`[release-preflight]`**: Runs `node --check` across all 19 ES/Node modules in `src/` and `server/`.
2. **`[ui-wiring-verifier]`**: Verifies all 9 `.activity-tab[data-tab]` buttons match `#pane-<tab>`, all `.setup-nav-tab[data-setuptab]` buttons match `#setup-content-<subtab>`, all 3 cog (`⚙️`) buttons and modals are wired, and `getCurrentConsoleSnapshot` has zero undeclared variable references.
3. **`[ui-visual-critic]`**: Verifies `#hud` width (`568px`), 9-column Denon Tracklist grid alignment (`▲ | Art | Preview | Key | BPM | Length | Title | Artist | Album`), and anti-twitch CSS rules (`overflow-anchor: none; scrollbar-gutter: stable;`).
4. **`[perf-watchdog]`**: Verifies WebAudio `drainNode` non-zero `0.000001` gain guard (preventing Chromium AudioFIFO memory creep), Hue beat throttling (`>= 70ms`), and `updateSceneRequirementsUI` DOM throttling (`500ms`).
5. **`[stagelinq-telemetry-auditor]`**: Verifies the Hellfire Waveforms center-screen offline overlay (`#hellfire-decks-offline-overlay` + 3D HUD canvas) and `SessionTracker` automatic metadata enrichment (`enrichMissingTrackMetadata`).

## 2. Specialized Subagents (`define_subagent` / `invoke_subagent`)
When deeper inspection or multi-file auditing is needed, define and invoke these 5 subagents:
- **`perf-watchdog`**: Audits 60 FPS frame budget, Three.js geometry/texture disposal, WebAudio drain node & analyser wiring, and RAF DOM throttling.
- **`ui-wiring-verifier`**: Audits interactive UI controls, modal backdrops (`.active`/`.open`), cog buttons (`.fx-card-cog-btn`, `.video-card-cog-btn`, `#btn-active-scene-cog`), and event listeners.
- **`ui-visual-critic`**: Audits CSS grid columns, panel widths, text truncation (`text-overflow: ellipsis`), and layout stability.
- **`stagelinq-telemetry-auditor`**: Audits `server/stagelinq-bridge.js`, `src/effects.js`, and `src/services/session-tracker.js` across deck load, fader handover, idle standby, and offline reset transitions.
- **`release-preflight`**: Runs `npm run verify` and `npm run build` and validates Electron/Launcher packaging before git commits/tags.
