# Office Agent Bridge API Reference

## Base URLs

- HTTP: `http://localhost:3003`
- WebSocket: `ws://localhost:3003/ws`

## HTTP Endpoints

### `POST /agents/register`
Register an agent or update its metadata.

Body:
```json
{
  "agentId": "claude",
  "name": "Claude",
  "desk": { "x": 96, "y": 96 }
}
```

Response: agent record.

### `GET /agents`
List known agents.

### `POST /tasks`
Assign a task to an agent. The server generates a `taskId` and broadcasts `task.assign`.

Body:
```json
{
  "agentId": "claude",
  "title": "Refactor API handler",
  "details": "Focus on error handling"
}
```

### `POST /events`
Post an event envelope (status/message/position/task).

Body:
```json
{
  "type": "agent.status",
  "agentId": "claude",
  "timestamp": "2026-02-02T12:00:00Z",
  "payload": {
    "status": "working",
    "summary": "Parsing build logs"
  }
}
```

## WebSocket

Connect to `ws://localhost:3001/ws`.

### On connect
Server sends a `snapshot` event with `{ agents, tasks }` in payload.

### Task events
Filter for:
```json
{
  "type": "task.assign",
  "agentId": "claude",
  "timestamp": "...",
  "payload": {
    "taskId": "uuid",
    "title": "...",
    "details": "..."
  }
}
```

## Event Envelope (all events)

```json
{
  "type": "agent.status" | "agent.message" | "agent.position" | "task.assign" | "snapshot",
  "agentId": "...",
  "timestamp": "ISO8601",
  "payload": { ... }
}
```

### `agent.status` payload
```json
{ "status": "idle" | "working" | "blocked" | "finished" | "reviewed", "summary": "..." }
```

### `agent.message` payload
```json
{ "text": "...", "channel": "log" | "reply" | "task" }
```

### `agent.position` payload
```json
{ "x": 100, "y": 120 }
```

### `task.assign` payload
```json
{ "taskId": "...", "title": "...", "details": "..." }
```
