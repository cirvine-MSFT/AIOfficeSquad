# Decisions

> Canonical decision ledger. Append-only.

---

### 2026-02-22T03:46:00Z: Project inception
**By:** Casey Irvine
**What:** Adapt AIOffice for Squad teams. Fork at cirvine-MSFT/AIOfficeSquad.
**Why:** Enable visual, interactive squad management.

---

### 2026-02-22T10:30:00Z: Use Playwright for testing
**By:** Blain
**What:** All integration tests will use Playwright test runner with Node.js.
**Why:** Consistent testing framework across front-end and API tests.

---

### 2026-02-23T08:15:00Z: Squad member filtering
**By:** Mac
**What:** Filter out Scribe and Ralph from visible NPC list.
**Why:** System agents should not appear as walkable NPCs in the office.

---

### 2026-02-23T14:00:00Z: Charter-based system prompts
**By:** Dutch
**What:** Use agent charter.md files as system prompts when spawning CLI processes.
**Why:** Each squad member needs role-specific context for chat interactions.

---

### 2026-02-24T09:00:00Z: File watcher for roster
**By:** Mac
**What:** Watch .squad/team.md for changes and auto-reload roster.
**Why:** Hot-reload squad membership without server restart.

---

### 2026-02-24T16:30:00Z: Desk position assignment
**By:** Poncho
**What:** Assign desk positions to squad members in round-robin from fixed positions.
**Why:** Deterministic NPC placement in the pixel-art office.

---

### 2026-02-25T11:00:00Z: Building API design
**By:** Dutch
**What:** REST endpoints for multi-squad building model under /api/building/.
**Why:** Support multiple squads in one office building.

---

### 2026-02-25T15:45:00Z: Zod schemas for validation
**By:** Billy
**What:** Use Zod schemas in shared/ for SquadMember, SquadInfo types.
**Why:** Runtime validation and type safety across server and client.

---

### 2026-02-26T10:00:00Z: Session memory persistence
**By:** Blain
**What:** Agent history.md files persist across sessions for context.
**Why:** Squad members need memory of past interactions.

---

### 2026-02-26T14:30:00Z: CI pipeline setup
**By:** Casey Irvine
**What:** GitHub Actions workflow for Playwright tests on push/PR.
**Why:** Automated quality gates before merging.

---

### 2026-02-27T09:15:00Z: Ceremony room scene
**By:** Poncho
**What:** New Phaser scene for ceremony meetings with gather animation.
**Why:** Visual representation of squad ceremonies (standups, retros).

---

### 2026-02-27T13:00:00Z: Auto-detect squad config
**By:** Mac
**What:** If no squadoffice.config.json, auto-detect from .squad/team.md.
**Why:** Zero-config for single-squad setups.
