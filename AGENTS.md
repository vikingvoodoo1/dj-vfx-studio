# Project Policy: Context Efficiency, Codebase Map & Compaction Recovery

## 1. Monolithic File Protection (CRITICAL FOR THIS REPO)
This repository contains very large source files (`src/effects.js` ~19,500 lines, `src/main.js` ~10,800 lines, `index.html` ~8,200 lines). Reading large chunks of these files will rapidly exhaust the context window and trigger frequent compactions.
- **NEVER call `view_file` with >120 lines** on `src/effects.js`, `src/main.js`, or `index.html`.
- **ALWAYS run `grep_search` first** to find the exact function or selector line number before calling `view_file`.
- **Use Subagents (`invoke_subagent`)** for broad searches, multi-file tracing, or running headless Electron/browser verification loops so tool output stays out of the main chat context.

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
