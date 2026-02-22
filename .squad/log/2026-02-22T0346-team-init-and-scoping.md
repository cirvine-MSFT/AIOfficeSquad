# 2026-02-22T03:46 — Team Init & Scoping

**Date:** 2026-02-22  
**Session:** Team hired (Predator cast), project scope defined  

## Team Hired
Predator cast agents:
- **Billy** — Squad expert (concept mapping)
- **Dutch** — Lead (scoping)
- **Scribe** — Silent session logger (decisions, logs, commits)

## Work Completed

### Billy: Squad → AIOffice Concept Mapping
Analyzed Squad CLI (`@bradygaster/squad-cli` v0.7.0) and AIOffice (Phaser 3 + Express + PTY). Created comprehensive concept mapping:
- Squad: file-based multi-agent orchestration (`.squad/` directory, markdown memory)
- AIOffice: pixel-art visualization + PTY process management
- Integration: 6 key points (agent spawn bridge, state persistence, memory system, decisions visualization, ceremony triggering, CLI commands)
- 4-phase migration strategy (read-only → basic spawning → full memory → visual enhancements)
- 11 gaps and new features needed (team decisions panel, activity feed, ceremony room, skills library, etc.)

**Deliverable:** `.squad/decisions/inbox/billy-squad-concept-mapping.md` (268 lines)

### Dutch: AIOffice → Squad Adaptation Scope
Researched AIOffice monorepo (server: Express + WebSocket + node-pty, web: Phaser scene + xterm.js, CLI: officeagent) and Squad architecture (team roster, agent charters/history, decisions, casting, ceremonies). Scoped 10 GitHub issues across 4 domains:

1. **Data Integration (3 issues):**
   - Parse `.squad/team.md` → populate office NPCs
   - Connect walk-up chat to squad agent context
   - Display `.squad/decisions.md` in office UI

2. **Agent Spawning (2 issues):**
   - Spawn squad agents via squad-cli integration
   - Terminal view shows squad agent work output

3. **UI & Visual (3 issues):**
   - Display squad member roles, badges, status at desks
   - Ceremony visualization (design review, retro as office meetings)
   - Squad status dashboard (team health, active members, tasks)

4. **Tooling (2 issues):**
   - Adapt CLI tool (`officeagent` → `squadoffice`)
   - Agent spawn modal adapted for squad members

**Architecture decisions:** Shell out to squad CLI, watch `.squad/` files, support both JSONL and squad output, visual-only ceremonies, CLI rename.

**Blocker:** GitHub Issues disabled on fork (cirvine-MSFT/AIOfficeSquad) — Casey must enable to create issues.

**Deliverable:** `.squad/decisions/inbox/dutch-scope-plan.md` (378 lines)

## Orchestration Logs
- `.squad/orchestration-log/2026-02-22T0346-billy.md`
- `.squad/orchestration-log/2026-02-22T0346-dutch.md`

---

**Next:** Casey enables GitHub Issues on fork. Dutch creates 10 issues. Phase 1 work begins (parse team.md, spawn squad agents).
