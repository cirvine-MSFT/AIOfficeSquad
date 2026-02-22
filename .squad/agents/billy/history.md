# Billy — History

## Learnings
- Project started 2026-02-22. Squad domain expert for AI Office Squad.
- Squad CLI: @bradygaster/squad-cli v0.7.0, depends on @bradygaster/squad-sdk v0.7.0.
- Squad repo: bradygaster/squad — single index.js (~63KB), templates/, docs/.
- Key Squad concepts to map into AIOffice: team roster, agent charters, ceremonies, decisions, casting.
- AIOffice concepts to preserve: walkable office, desk assignment, chat, terminal view, PTY processes.
- **2026-02-21:** Completed comprehensive Squad → AIOffice concept mapping analysis:
  - Squad is file-based multi-agent orchestration via Copilot CLI/VS Code
  - AIOffice is pixel-art UI managing PTY processes (Claude Code, Copilot CLI)
  - Core challenge: Bridge Squad's `task` tool spawning to AIOffice's PTY management
  - Key integration points: agent spawn bridge, state persistence, memory system, decisions visualization, ceremony triggering
  - All Squad state lives in `.squad/` directory (git-committed); AIOffice will be visualization layer over this
  - Proposed 4-phase migration: read-only integration → basic spawning → full memory system → visual enhancements
  - Critical gaps: no sub-agent spawn protocol, no persistent memory, no shared state in current AIOffice
  - Squad architecture: coordinator spawns agents in parallel via `task` tool, each agent has own context window (200K tokens)
  - Squad memory: personal (history.md per agent), shared (decisions.md), skills (.squad/skills/)
  - Squad ceremonies: design review (before complex work), retrospective (after failures), configurable in ceremonies.md
  - AIOffice architecture: Express server with PTY management, JSONL watcher for Claude output, Phaser 3 web app for visualization
  - Mapping deliverable: `.squad/decisions/inbox/billy-squad-concept-mapping.md` created with full analysis
