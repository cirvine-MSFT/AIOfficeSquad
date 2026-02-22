# Mac — History

## Learnings
- Project started 2026-02-22. Backend for AI Office Squad.
- AIOffice server at apps/server/ — Express + PTY + WebSocket.
- Server spawns CLI processes (Claude Code / Copilot CLI) in PTYs, bridges JSONL output over WebSocket.
- Need to integrate @bradygaster/squad-cli v0.7.0 for squad-aware agent management.
