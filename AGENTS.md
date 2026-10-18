# Project Policy: Context Compaction Safety & Stale Task Prevention

## Core Directive on Context Compaction Recovery
When resuming from an automatic context compaction (e.g., "The server cleared a prefix of the conversation as it grew too large" or receiving a compaction summary):

1. **NEVER assume compaction summary items are active tasks:**
   - Auto-generated compaction summaries frequently capture stale requests, completed milestones, or open-ended questions asked hours earlier.
   - The agent MUST NOT autonomously execute action items, code edits, or suggestions listed in the compaction summary or truncated history.

2. **Acknowledge and Align Before Acting:**
   - On the first turn following a compaction, the agent must acknowledge that context was compacted.
   - The agent must ask the user to confirm the current active priority or state what the user wants to work on next.
   - The agent MUST NOT modify files, run unprompted commands, or create git commits until the user explicitly directs the next action.

3. **No Unrequested Changes:**
   - Never introduce speculative features, refactors, or side-effect edits unless directly and explicitly requested in the user's immediate prompt.
