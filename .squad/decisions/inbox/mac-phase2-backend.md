### 2026-02-22T10:30:00Z: Charter/history context in walk-up chat + Decisions API
**By:** Mac (Backend Dev)
**What:** Two backend features landed:
1. `bridgeChatToPty()` now loads charter.md and history.md for squad agents on first message, replacing the generic personality prompt with role-specific context. Non-squad agents keep the original generic prompt.
2. New `GET /api/squads/:squadId/decisions` endpoint parses decisions.md into structured JSON with `?limit=N` and `?member=name` filters. File watcher broadcasts `decisions.update` WebSocket events on changes.
**Why:** Walk-up chat needs to know who the agent *is* (their charter defines role, scope, boundaries). Decisions API enables Poncho to build a UI timeline panel. Both are Phase 2 requirements (Issues #2, #3).
