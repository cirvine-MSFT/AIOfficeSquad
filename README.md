# Office Agent World

A cozy pixel-art virtual office where AI agents work alongside you — each with their own desk, personality, and expertise.

Instead of staring at terminal output, watch your AI coworkers at their desks. Walk up, chat, assign tasks, and see them think through problems in real-time.

<!-- TODO: Add screenshot/GIF here -->

## Why I built this

Lately, AI agents do about 90% of my coding. But I kept hitting a wall: **I can't manage more than 2-3 parallel tasks in my head.** Terminal tabs blur together. Which Claude session was working on the auth bug? Which one was refactoring the API?

I wanted **visual separation**. A way to glance at my screen and instantly know: who's working on what, who's stuck, who just finished.

So I built a virtual office. Now each task gets a coworker at a desk. I can see them thinking, walk over to chat, and context-switch without losing my mind.

## What is this?

Spin up AI agents powered by **Claude Code** or **GitHub Copilot CLI**. Each agent gets:
- A desk in the pixel-art office
- A name and personality you define
- Their own working directory (your projects)
- A chat interface for continuous conversation

Walk your character around the office, press E to chat with an agent, and collaborate like coworkers.

## Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/office-agent-world.git
cd office-agent-world
npm install

# Start the server and UI
npm run dev:server &
npm run dev:web

# Open http://localhost:3001
```

## Adding Agents

### Option 1: From the UI
Click the green **+** button in the bottom left, fill in:
- **Name** — or leave blank for a random one
- **CLI Type** — Claude Code or Copilot
- **Working Directory** — full path to your project
- **Personality** — optional, e.g. "Grumpy senior engineer who's seen it all"

### Option 2: From the terminal
```bash
cd /path/to/your/project
officeagent --name "Ruby" --cli copilot --personality "Enthusiastic junior dev"
```

Or add the script to your PATH:
```bash
export PATH="$PATH:/path/to/office-agent-world/apps/officeagent"
```

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                  Office Agent World UI                      │
│            Phaser game + chat sidebar                       │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server (port 3003)                       │
│              Tracks agents, routes messages                 │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ WebSocket + HTTP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   officeagent processes                     │
│         Each one = 1 CLI + 1 folder + 1 conversation        │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
      Claude Code     Copilot CLI      (your CLIs)
```

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move around |
| E | Open chat with nearby agent |
| Esc / Space | Close chat |

## Agent Status Colors

| Color | Status |
|-------|--------|
| 🟢 Green | Available |
| 🟡 Yellow | Thinking |
| 🔵 Blue | Has new reply |
| 🔴 Red | Error |

## Chat Panel

When chatting with an agent, you'll see:
- **Provider badge** — Claude or Copilot
- **+ button** — Start a fresh conversation
- **× button** — Delete the agent

## Requirements

- Node.js 18+
- One or both of:
  - [Claude Code CLI](https://docs.anthropic.com/claude-code)
  - [GitHub Copilot CLI](https://docs.github.com/copilot/github-copilot-in-the-cli)

## Project Structure

```
office-agent-world/
├── apps/
│   ├── web/           # Phaser game + UI
│   ├── server/        # WebSocket server
│   └── officeagent/   # CLI tool to spawn agents
├── shared/            # Shared types and schemas
└── data/              # Runtime data (gitignored)
```

## License

MIT
