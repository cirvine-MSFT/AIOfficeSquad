#!/usr/bin/env node

/**
 * squadoffice — CLI for Squad Office
 *
 * Commands:
 *   start   — Launch the server and web app
 *   spawn   — Spawn an AI agent (or squad member) into the world
 *   demo    — Launch a full demo with your squad roster
 *   init    — Check for .squad/ setup
 *   clear   — Remove all agents from the office
 */

import { spawn as nodeSpawn, execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

const ROOT = path.resolve(import.meta.dirname ?? __dirname, "../../..");

// ── squad roster helpers ─────────────────────────────────────────────

type SquadMember = { name: string; role: string; scope: string; badge: string };

function parseSquadRoster(): SquadMember[] {
  const teamPath = path.join(ROOT, ".squad", "team.md");
  if (!fs.existsSync(teamPath)) return [];
  const content = fs.readFileSync(teamPath, "utf-8");
  const members: SquadMember[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (m && m[1] !== "Name" && !m[1].startsWith("-")) {
      members.push({ name: m[1].trim(), role: m[2].trim(), scope: m[3].trim(), badge: m[4].trim() });
    }
  }
  return members;
}

function findSquadMember(nameQuery: string): SquadMember | undefined {
  const roster = parseSquadRoster();
  const q = nameQuery.toLowerCase();
  return roster.find((m) => m.name.toLowerCase() === q) || roster.find((m) => m.name.toLowerCase().startsWith(q));
}

// ── start command ────────────────────────────────────────────────────

function startWorld(args: string[]) {
  let serverOnly = false;
  let webOnly = false;

  for (const arg of args) {
    if (arg === "--server-only") serverOnly = true;
    if (arg === "--web-only") webOnly = true;
    if (arg === "--help" || arg === "-h") {
      console.log(`
squadoffice start — Launch Squad Office

Usage:
  squadoffice start [options]

Options:
  --server-only   Only start the server (port 3003)
  --web-only      Only start the web app (port 3000)
  --help, -h      Show this help

With no flags, starts both the server and web app.
`);
      process.exit(0);
    }
  }

  console.log("🏢 Starting Squad Office...\n");

  const procs: ReturnType<typeof nodeSpawn>[] = [];

  if (!webOnly) {
    console.log("  🖥  Server → http://localhost:3003");
    const server = nodeSpawn("npm", ["run", "dev:server"], {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
    });
    procs.push(server);
  }

  if (!serverOnly) {
    console.log("  🌐 Web    → http://localhost:3000/?building=1");
    const web = nodeSpawn("npm", ["run", "dev:web"], {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
    });
    procs.push(web);
  }

  console.log("\n  Press Ctrl+C to stop.\n");

  const shutdown = () => {
    console.log("\n👋 Shutting down...");
    for (const p of procs) {
      try { p.kill("SIGTERM"); } catch {}
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// ── spawn command ────────────────────────────────────────────────────

async function spawnAgent(args: string[]) {
  let name = "";
  let cli = "claude-code";
  let server = "http://localhost:3003";
  let personality = "";
  let dir = process.cwd();
  let continueConversation = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" || args[i] === "-n") {
      name = args[++i] || "";
    } else if (args[i] === "--cli" || args[i] === "-c") {
      const val = args[++i];
      if (val === "copilot" || val === "copilot-cli") {
        cli = "copilot-cli";
      }
    } else if (args[i] === "--server" || args[i] === "-s") {
      server = args[++i] || server;
    } else if (args[i] === "--personality" || args[i] === "-p") {
      personality = args[++i] || "";
    } else if (args[i] === "--dir" || args[i] === "-d") {
      dir = args[++i] || dir;
    } else if (args[i] === "--continue") {
      continueConversation = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
squadoffice spawn — Spawn an AI agent into the world

Usage:
  squadoffice spawn [options]
  squadoffice spawn <member-name>    Spawn a squad member by name (from .squad/team.md)

Options:
  --name, -n <name>          Agent display name (default: random)
  --cli, -c <type>           CLI type: "claude" or "copilot" (default: claude)
  --personality, -p <desc>   Personality description
  --dir, -d <path>           Working directory (default: cwd)
  --continue                 Resume previous conversation
  --server, -s <url>         Server URL (default: http://localhost:3003)
  --help, -h                 Show this help

Examples:
  squadoffice spawn                                         # Random name, Claude
  squadoffice spawn --name "Bob" --dir ~/projects/myapp
  squadoffice spawn -n "Alice" -c copilot
  squadoffice spawn -n "Grumpy" -p "Sarcastic senior dev"
  squadoffice spawn Mac                                     # Spawn squad member by name
`);
      process.exit(0);
    }
  }

  // Check if first positional arg is a squad member name
  if (args.length > 0 && !args[0].startsWith("-") && !name) {
    const member = findSquadMember(args[0]);
    if (member) {
      name = `${member.name} (${member.role})`;
      personality = `${member.badge} ${member.scope}`;
    }
  }

  console.log(`\n🏢 Spawning agent via ${server}...`);

  const res = await fetch(`${server}/agents/spawn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name || undefined,
      cliType: cli,
      workingDirectory: dir,
      personality: personality || undefined,
      continueConversation,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`❌ Failed to spawn: ${res.status}`, body.error || "");
    process.exit(1);
  }

  const body = await res.json();
  console.log(`✅ Agent spawned!`);
  console.log(`   ID:   ${body.agentId}`);
  console.log(`   Name: ${name || "(random)"}`);
  console.log(`   CLI:  ${cli}`);
  console.log(`   Dir:  ${dir}`);
  console.log(`\n   ${body.message}\n`);
}

// ── demo command ─────────────────────────────────────────────────────

function detectCLIs(): { hasClaude: boolean; hasCopilot: boolean } {
  let hasClaude = false;
  let hasCopilot = false;
  const cmd = process.platform === "win32" ? "where" : "which";
  try { execSync(`${cmd} claude`, { stdio: "ignore" }); hasClaude = true; } catch {}
  try { execSync(`${cmd} copilot`, { stdio: "ignore" }); hasCopilot = true; } catch {}
  return { hasClaude, hasCopilot };
}

async function waitForServer(url: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/agents`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function runDemo(args: string[]) {
  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      console.log(`
squadoffice demo — Launch a full demo with your squad roster

Usage:
  squadoffice demo [options]

Options:
  --help, -h   Show this help

Reads .squad/team.md for your squad roster and spawns agents into the office.
Detects which AI CLIs are installed (claude, copilot) and assigns them accordingly.
`);
      process.exit(0);
    }
  }

  const { hasClaude, hasCopilot } = detectCLIs();

  if (!hasClaude && !hasCopilot) {
    console.error(`
❌ No supported AI CLI found.

Install at least one:
  • Claude Code:  https://docs.anthropic.com/en/docs/claude-code
  • GitHub Copilot CLI:  https://githubnext.com/projects/copilot-cli
`);
    process.exit(1);
  }

  console.log("\n🏢 Squad Office — Demo Mode\n");
  console.log("  Detected CLIs:");
  if (hasClaude) console.log("    ✅ Claude Code");
  else console.log("    ⬜ Claude Code (not found)");
  if (hasCopilot) console.log("    ✅ GitHub Copilot CLI");
  else console.log("    ⬜ GitHub Copilot CLI (not found)");
  console.log();

  // Start the world
  const procs: ReturnType<typeof nodeSpawn>[] = [];

  console.log("  🖥  Server → http://localhost:3003");
  const server = nodeSpawn("npm", ["run", "dev:server"], {
    cwd: ROOT,
    stdio: "ignore",
    shell: true,
  });
  procs.push(server);

  console.log("  🌐 Web    → http://localhost:3000/?building=1");
  const web = nodeSpawn("npm", ["run", "dev:web"], {
    cwd: ROOT,
    stdio: "ignore",
    shell: true,
  });
  procs.push(web);

  const shutdown = () => {
    console.log("\n👋 Shutting down...");
    for (const p of procs) {
      try { p.kill("SIGTERM"); } catch {}
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("\n  ⏳ Waiting for server...");
  const ready = await waitForServer("http://localhost:3003");
  if (!ready) {
    console.error("  ❌ Server didn't start in time.");
    shutdown();
    return;
  }
  console.log("  ✅ Server ready!\n");

  // Read squad roster for agent names
  const roster = parseSquadRoster();
  const demoDir1 = path.join(ROOT, "demo", "todo-api");
  const demoDir2 = path.join(ROOT, "demo", "world-clock");

  type AgentDef = { name: string; cli: string; dir: string; personality?: string };
  const agents: AgentDef[] = [];

  if (roster.length >= 2) {
    // Use first two squad members from team.md
    const m1 = roster[0];
    const m2 = roster[1];
    const cli1 = hasClaude ? "claude-code" : "copilot-cli";
    const cli2 = hasCopilot && hasClaude ? "copilot-cli" : cli1;
    agents.push({ name: `${m1.name} (${m1.role})`, cli: cli1, dir: demoDir1, personality: `${m1.badge} ${m1.scope}` });
    agents.push({ name: `${m2.name} (${m2.role})`, cli: cli2, dir: demoDir2, personality: `${m2.badge} ${m2.scope}` });
  } else if (hasClaude && hasCopilot) {
    agents.push({ name: "Agent 1", cli: "claude-code", dir: demoDir1 });
    agents.push({ name: "Agent 2", cli: "copilot-cli", dir: demoDir2 });
  } else if (hasClaude) {
    agents.push({ name: "Agent 1", cli: "claude-code", dir: demoDir1 });
    agents.push({ name: "Agent 2", cli: "claude-code", dir: demoDir2 });
  } else {
    agents.push({ name: "Agent 1", cli: "copilot-cli", dir: demoDir1 });
    agents.push({ name: "Agent 2", cli: "copilot-cli", dir: demoDir2 });
  }

  // Spawn agents with dramatic pacing
  for (const agent of agents) {
    await new Promise((r) => setTimeout(r, 300));
    console.log(`  🤖 Spawning ${agent.name} → ${agent.cli} → ${path.basename(agent.dir)}/`);
    try {
      const res = await fetch("http://localhost:3003/agents/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agent.name,
          cliType: agent.cli,
          workingDirectory: agent.dir,
          personality: agent.personality || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(`     ❌ Failed: ${body.error || res.status}`);
      } else {
        console.log(`     ✅ Online`);
      }
    } catch (e: any) {
      console.error(`     ❌ ${e.message}`);
    }
  }

  console.log(`
  🌐 Office ready → http://localhost:3000/?building=1

  🏢 Your squad office is ready.
     Walk up to an agent and press E to chat.
     Press Ctrl+C to stop.
`);
}

// ── clear command ─────────────────────────────────────────────────────

async function clearAgents(args: string[]) {
  let server = "http://localhost:3003";
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--server" || args[i] === "-s") && args[i + 1]) server = args[++i];
  }

  const res = await fetch(`${server}/agents`);
  if (!res.ok) { console.error("❌ Could not reach server at", server); process.exit(1); }
  const agents = await res.json();

  if (agents.length === 0) { console.log("No agents to remove."); return; }

  console.log(`\n🗑  Removing ${agents.length} agent(s)...\n`);
  for (const agent of agents) {
    const del = await fetch(`${server}/agents/${agent.id}`, { method: "DELETE" });
    if (del.ok) {
      console.log(`   ✅ ${agent.name} removed`);
    } else {
      console.log(`   ❌ ${agent.name} failed`);
    }
  }
  console.log("\n✨ Office cleared.\n");
}

// ── init command ──────────────────────────────────────────────────────

function initSquad() {
  const squadDir = path.join(ROOT, ".squad");
  if (fs.existsSync(squadDir)) {
    console.log("\n✅ .squad/ directory found. Your squad is configured.\n");
    const roster = parseSquadRoster();
    if (roster.length > 0) {
      console.log("  Squad members:");
      for (const m of roster) {
        console.log(`    ${m.badge} ${m.name} — ${m.role}`);
      }
      console.log();
    }
  } else {
    console.log(`
⚠️  No .squad/ directory found.

To initialize your squad, run:
  npx @bradygaster/squad-cli init
`);
  }
}

// ── main ─────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`
squadoffice — CLI for Squad Office

Usage:
  squadoffice <command> [options]

Commands:
  start    Launch the server and web app
  spawn    Spawn an AI agent into the world
  demo     Launch a full demo with your squad roster
  init     Check .squad/ setup status
  clear    Remove all agents from the office

Run "squadoffice <command> --help" for command-specific options.
`);
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "start":
    startWorld(rest);
    break;
  case "spawn":
    spawnAgent(rest).catch((e) => {
      console.error("Fatal:", e.message || e);
      process.exit(1);
    });
    break;
  case "demo":
    runDemo(rest).catch((e) => {
      console.error("Fatal:", e.message || e);
      process.exit(1);
    });
    break;
  case "init":
    initSquad();
    break;
  case "clear":
    clearAgents(rest).catch((e) => {
      console.error("Fatal:", e.message || e);
      process.exit(1);
    });
    break;
  case "--help":
  case "-h":
  case undefined:
    showHelp();
    break;
  default:
    // Backwards compat: if no command, treat all args as spawn
    spawnAgent(process.argv.slice(2)).catch((e) => {
      console.error("Fatal:", e.message || e);
      process.exit(1);
    });
}

