# Project Policy: Context Efficiency, Codebase Map & Compaction Recovery

## 1. Modular Codebase Map & Anti-Monolithic Standard
This repository uses modular ES imports bundled by Vite. To prevent files from growing back into monoliths:
- **Styles (`src/styles/main.css`)**: All CSS lives in [src/styles/main.css](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/styles/main.css). Never add `<style>` blocks back into [index.html](file:///Users/jarikuhanen/agy/dj-vfx-studio/index.html).
- **VFX Shaders & Textures (`src/vfx/`)**:
  - [src/vfx/shaders.js](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/vfx/shaders.js): All custom GLSL shader definitions.
  - [src/vfx/textures-club.js](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/vfx/textures-club.js): Club/disco PBR maps, star/flare/beam textures, and PMREM environment maps.
  - [src/vfx/textures-haunted.js](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/vfx/textures-haunted.js): Haunted Manor (FX 21) & Matrix 2D canvas textures and window animator.
  - [src/vfx/deck-hud-renderer.js](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/vfx/deck-hud-renderer.js): 2D Canvas DJ Deck HUD renderer (`renderDJDeckHUD`) and Edison bulb flicker helpers.
  - [src/effects.js](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/effects.js): `createVFXScene(container)` scene graph builder and master animation loop.
- **UI & Services (`src/ui/`, `src/services/`)**:
  - [src/services/media-db.js](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/services/media-db.js): `MediaDB` IndexedDB storage manager.
  - [src/ui/particle-eq-2d.js](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/ui/particle-eq-2d.js): 2D Canvas Particle Spectrum EQ renderer.
  - [src/ui/scene-thumbnails.js](file:///Users/jarikuhanen/agy/dj-vfx-studio/src/ui/scene-thumbnails.js): Live 24 FPS animated scene card thumbnails (`initSceneCardThumbnails`).
- **Zero Monolith Growth Rule**: Never add new shaders, texture generators, modals, or standalone UI controllers inline inside `src/effects.js` or `src/main.js`. Place new shaders/textures/scenes in `src/vfx/` and new UI/service modules in `src/ui/` or `src/services/`.
- **Tight File Reads**: Never call `view_file` with >120 lines on `src/effects.js` or `src/main.js`. Always run `grep_search` first to locate exact line numbers.

## 2. Anchor State Tracking (`ACTIVE_TASK.md`)
For any non-trivial feature or bugfix, maintain [ACTIVE_TASK.md](file:///Users/jarikuhanen/agy/dj-vfx-studio/ACTIVE_TASK.md) in the project root with:
- **Active Goal**: The exact user request currently being solved.
- **Modified Files & Functions**: What has already been edited in the working tree.
- **Next Verification / Implementation Step**: What remains to be done.

## 3. Compaction Recovery Protocol
When resuming from an automatic context compaction (`# Resuming from a compaction`):
1. **Read-Only State Reconstruction First:**
   - Read `ACTIVE_TASK.md` (if present) and run `git status -s` and `git diff --stat` to inspect live changes on disk.
   - Check `git diff` on the specific lines being worked on so you NEVER overwrite or revert working code written right before compaction.
2. **Mid-Task vs. Idle Compaction:**
   - **If compaction happened MID-TASK** (while actively solving the user's latest prompt): after checking `ACTIVE_TASK.md` and `git diff`, seamlessly finish the active fix and verification without stopping to make the user repeat their prompt.
   - **If compaction happened while IDLE or when the task status is ambiguous**: report the state from `git status` / `ACTIVE_TASK.md` in 2-3 lines and ask the user to confirm the next step before modifying files.
3. **Ignore Historical Summary Items:**
   - Compaction summaries list all past user prompts (`1, 2, ... N`). Treat `1..N-1` as completed history. Never re-run or re-apply earlier tasks unless explicitly asked.
