# How Office Agent World Controls AI CLIs

We're not using any special API or SDK. We're literally running the **command-line tools** (`claude` and `copilot`) as child processes and piping text in/out.

## The Flow

```
You type "fix the login bug"
        ↓
    officeagent receives it via WebSocket
        ↓
    officeagent runs this shell command:

    claude -p "fix the login bug" --continue --dangerously-skip-permissions

        ↓
    Claude CLI does its thing (reads files, writes code, etc.)
        ↓
    officeagent captures the stdout
        ↓
    Sends it back to the UI as a chat message
```

## The Actual Commands

**For Claude Code:**
```bash
claude -p "your message" \
  --continue \                        # Keep conversation history
  --dangerously-skip-permissions \    # Don't ask for confirmations
  --output-format stream-json \       # Machine-readable output
  --verbose
```

**For Copilot CLI:**
```bash
copilot -p "your message" \
  --continue \      # Keep conversation history
  --allow-all \     # Don't ask for confirmations
  --silent          # Less noise in output
```

## Key Flags

| Flag | What it does |
|------|--------------|
| `-p "message"` | Single prompt mode (not interactive) |
| `--continue` | Resume the previous conversation in that folder |
| `--dangerously-skip-permissions` | Let Claude edit files without asking |
| `--output-format stream-json` | Get structured JSON we can parse |

## The "Conversation Memory"

Both CLIs store conversation history **per folder**. The `--continue` flag tells them to pick up where they left off. That's why each agent has its own `workingDirectory` — it's their memory silo.

## How officeagent Wraps It

```typescript
const child = spawn("claude", ["-p", message, "--continue", ...], {
  cwd: this.workingDirectory,  // Run in the agent's folder
  stdio: ["ignore", "pipe", "pipe"],  // Capture stdout/stderr
});

child.stdout.on("data", (data) => {
  // Parse the output, send to UI
});
```

## Why This Approach?

1. **No API keys needed** — Uses your existing CLI auth
2. **Full CLI capabilities** — File editing, bash commands, everything the CLI can do
3. **Conversation history for free** — The CLIs handle persistence
4. **Works with any CLI** — Easy to add more (Aider, Cursor, etc.)

We're just automating what you'd do manually in a terminal — but with a pretty pixel-art office on top.
