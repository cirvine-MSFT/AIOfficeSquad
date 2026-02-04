---
name: office-agent-bridge
description: Bridge coding agents (Claude Code, Codex, Copilot CLI, etc.) to the local Office Sprite World control room. Use when an agent must register itself, receive tasks, and post status or log messages via the local HTTP/WS API running on localhost.
---

# Office Agent Bridge

## Overview

Connect an agent process to the Office Sprite World UI by registering the agent, listening for task assignments, and posting status/log updates to the local API.

## Quick Start (agent-side)

1. Register once at startup via `POST /agents/register`.
2. Open a WebSocket to `ws://localhost:3003/ws` and filter `task.assign` events for your `agentId`.
3. Post `agent.status` and `agent.message` updates as work progresses.
   - Use `status: "finished"` when work is done and awaiting boss review.
   - The UI will automatically mark it `status: "reviewed"` when the boss opens chat.

See `references/api.md` for payload schemas and full endpoint details.

## Workflow

### 1) Register Agent

Send:
- `agentId`: stable id for the agent process (e.g., `claude-code-main`)
- `name`: human-readable label
- `desk`: `{x,y}` optional, if you want a fixed seat

If registration fails, retry with exponential backoff. Do not start emitting events until registered.

### 2) Listen for Tasks

Open WS at `ws://localhost:3001/ws`. The server sends a `snapshot` event first. Ignore it unless you want local state.

Process only:
- `type: "task.assign"`
- `agentId` matching your agent

When a task arrives, acknowledge with an `agent.message` and move to working status.

### 3) Post Status and Logs

Emit:
- `agent.status` for high‑level state changes
- `agent.message` for logs, progress, and replies
- Use `status: "finished"` when work is complete but not yet reviewed.

Keep messages short; the UI shows the latest ~20 messages.

## Safety and Reliability

- Use localhost only; no auth by default.
- Include ISO8601 timestamps.
- On failure to POST, retry with backoff and do not spam the server.

## Common Pitfalls

- Wrong `agentId`: tasks won’t appear; ensure IDs match the registration.
- Missing `timestamp`: events are rejected.
- Using non-local URLs: the server only runs on localhost in MVP.

## References

- `references/api.md` for endpoint and event schemas.
