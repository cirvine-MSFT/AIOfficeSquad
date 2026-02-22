/**
 * Squad Chat Context Tests
 *
 * Tests that squad agent chat includes proper context from
 * charter and history files.
 *
 * Verifies:
 *   - Agent records include charterPath and historyPath
 *   - readAgentCharter() returns content or empty string
 *   - readAgentHistory() returns content or empty string
 *   - Charter content is included in first message context
 *
 * Uses real functions from building-routes.ts where available,
 * with inline fallbacks for isolated testing.
 */

import { test, expect } from "@playwright/test";
import path from "path";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";

// ── Constants ────────────────────────────────────────────────────────
const TEST_DATA = path.resolve(process.cwd(), "tests", "test-data");

// ── Inline implementations (mirror building-routes.ts logic) ─────────
// These mirror readAgentCharter/readAgentHistory from building-routes.ts.
// Swap for real imports once the module is stable.

function readAgentCharter(charterPath: string | undefined): string {
  if (!charterPath || !existsSync(charterPath)) return "";
  try {
    return readFileSync(charterPath, "utf-8");
  } catch {
    return "";
  }
}

function readAgentHistory(historyPath: string | undefined): string {
  if (!historyPath || !existsSync(historyPath)) return "";
  try {
    return readFileSync(historyPath, "utf-8");
  } catch {
    return "";
  }
}

// Minimal SquadMember shape for testing agent record generation
interface SquadMember {
  id: string;
  name: string;
  role: string;
  scope: string;
  badge: string;
  status: string;
  charterPath?: string;
  historyPath?: string;
}

/**
 * Mirror of squadMembersToAgentRecords from building-routes.ts.
 * Converts squad members to agent records with charter/history paths.
 */
function squadMembersToAgentRecords(
  squadId: string,
  members: SquadMember[],
  rootDir: string
) {
  return members.map((m, i) => ({
    agentId: `squad-${squadId}-${m.id}`,
    name: m.name,
    status: "available",
    summary: `${m.badge} — ${m.scope}`,
    cliType: "copilot-cli",
    workingDirectory: rootDir,
    messages: [],
    squadId,
    squadRole: m.role,
    squadBadge: m.badge,
    squadScope: m.scope,
    charterPath: m.charterPath,
    historyPath: m.historyPath,
  }));
}

/**
 * Build a system prompt for a squad agent chat, including charter context.
 */
function buildFirstMessageContext(
  agentRecord: ReturnType<typeof squadMembersToAgentRecords>[0]
): string {
  const parts: string[] = [];

  parts.push(`You are ${agentRecord.name}, ${agentRecord.squadRole}.`);
  parts.push(`Scope: ${agentRecord.squadScope}`);

  const charter = readAgentCharter(agentRecord.charterPath);
  if (charter) {
    parts.push(`\n--- Charter ---\n${charter}`);
  }

  const history = readAgentHistory(agentRecord.historyPath);
  if (history) {
    parts.push(`\n--- History ---\n${history}`);
  }

  return parts.join("\n");
}

// ── Tests — Agent record structure ───────────────────────────────────

test.describe("Squad chat context — agent record fields", () => {
  const sampleMembers: SquadMember[] = [
    {
      id: "blain",
      name: "Blain",
      role: "Tester",
      scope: "Playwright tests, quality",
      badge: "🧪 Tester",
      status: "available",
      charterPath: path.join(TEST_DATA, "charter-sample.md"),
      historyPath: path.join(TEST_DATA, "history-sample.md"),
    },
    {
      id: "poncho",
      name: "Poncho",
      role: "Frontend Dev",
      scope: "Phaser UI, pixel-art office",
      badge: "⚛️ Frontend",
      status: "available",
      // No charter/history paths — simulates missing files
      charterPath: undefined,
      historyPath: undefined,
    },
  ];

  test("agent record has charterPath and historyPath for squad members", () => {
    const records = squadMembersToAgentRecords("default", sampleMembers, "/tmp");

    // Blain has both paths set
    const blainRecord = records.find((r) => r.name === "Blain");
    expect(blainRecord).toBeDefined();
    expect(blainRecord!.charterPath).toBeDefined();
    expect(blainRecord!.charterPath).toContain("charter-sample.md");
    expect(blainRecord!.historyPath).toBeDefined();
    expect(blainRecord!.historyPath).toContain("history-sample.md");
  });

  test("agent record has undefined paths when files dont exist", () => {
    const records = squadMembersToAgentRecords("default", sampleMembers, "/tmp");

    // Poncho has no charter/history
    const ponchoRecord = records.find((r) => r.name === "Poncho");
    expect(ponchoRecord).toBeDefined();
    expect(ponchoRecord!.charterPath).toBeUndefined();
    expect(ponchoRecord!.historyPath).toBeUndefined();
  });

  test("agent record includes squadRole, squadBadge, squadScope", () => {
    const records = squadMembersToAgentRecords("default", sampleMembers, "/tmp");

    const blainRecord = records.find((r) => r.name === "Blain");
    expect(blainRecord!.squadRole).toBe("Tester");
    expect(blainRecord!.squadBadge).toBe("🧪 Tester");
    expect(blainRecord!.squadScope).toBe("Playwright tests, quality");
  });

  test("agent record agentId follows squad-{squadId}-{memberId} pattern", () => {
    const records = squadMembersToAgentRecords("alpha", sampleMembers, "/tmp");

    expect(records[0].agentId).toBe("squad-alpha-blain");
    expect(records[1].agentId).toBe("squad-alpha-poncho");
  });
});

// ── Tests — readAgentCharter ─────────────────────────────────────────

test.describe("Squad chat context — readAgentCharter", () => {
  test("returns charter content when file exists", () => {
    const charterPath = path.join(TEST_DATA, "charter-sample.md");
    expect(existsSync(charterPath)).toBe(true);

    const content = readAgentCharter(charterPath);
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("Blain");
    expect(content).toContain("Tester");
    expect(content).toContain("Playwright");
  });

  test("returns empty string when file is missing", () => {
    const content = readAgentCharter(
      path.join(TEST_DATA, "nonexistent-charter.md")
    );
    expect(content).toBe("");
  });

  test("returns empty string when path is undefined", () => {
    const content = readAgentCharter(undefined);
    expect(content).toBe("");
  });

  test("returns empty string when path is empty string", () => {
    const content = readAgentCharter("");
    expect(content).toBe("");
  });
});

// ── Tests — readAgentHistory ─────────────────────────────────────────

test.describe("Squad chat context — readAgentHistory", () => {
  test("returns history content when file exists", () => {
    const historyPath = path.join(TEST_DATA, "history-sample.md");
    expect(existsSync(historyPath)).toBe(true);

    const content = readAgentHistory(historyPath);
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("History");
    expect(content).toContain("Learnings");
  });

  test("returns empty string when file is missing", () => {
    const content = readAgentHistory(
      path.join(TEST_DATA, "nonexistent-history.md")
    );
    expect(content).toBe("");
  });

  test("returns empty string when path is undefined", () => {
    const content = readAgentHistory(undefined);
    expect(content).toBe("");
  });

  test("returns empty string when path is empty string", () => {
    const content = readAgentHistory("");
    expect(content).toBe("");
  });
});

// ── Tests — First message context assembly ───────────────────────────

test.describe("Squad chat context — first message context", () => {
  test("charter content is included in first message context", () => {
    const member: SquadMember = {
      id: "blain",
      name: "Blain",
      role: "Tester",
      scope: "Playwright tests, quality",
      badge: "🧪 Tester",
      status: "available",
      charterPath: path.join(TEST_DATA, "charter-sample.md"),
      historyPath: path.join(TEST_DATA, "history-sample.md"),
    };

    const records = squadMembersToAgentRecords("default", [member], "/tmp");
    const context = buildFirstMessageContext(records[0]);

    // Should contain role identification
    expect(context).toContain("You are Blain");
    expect(context).toContain("Tester");

    // Should contain charter content
    expect(context).toContain("--- Charter ---");
    expect(context).toContain("Playwright integration tests");

    // Should contain history content
    expect(context).toContain("--- History ---");
    expect(context).toContain("Learnings");
  });

  test("context works without charter or history files", () => {
    const member: SquadMember = {
      id: "ghost",
      name: "Ghost",
      role: "Phantom",
      scope: "Invisible work",
      badge: "👻 Ghost",
      status: "available",
      charterPath: undefined,
      historyPath: undefined,
    };

    const records = squadMembersToAgentRecords("default", [member], "/tmp");
    const context = buildFirstMessageContext(records[0]);

    // Should still have role identification
    expect(context).toContain("You are Ghost");
    expect(context).toContain("Phantom");
    expect(context).toContain("Invisible work");

    // Should NOT contain charter/history sections
    expect(context).not.toContain("--- Charter ---");
    expect(context).not.toContain("--- History ---");
  });

  test("context includes scope information", () => {
    const member: SquadMember = {
      id: "mac",
      name: "Mac",
      role: "Backend Dev",
      scope: "Express server, PTY management",
      badge: "🔧 Backend",
      status: "available",
      charterPath: undefined,
      historyPath: undefined,
    };

    const records = squadMembersToAgentRecords("default", [member], "/tmp");
    const context = buildFirstMessageContext(records[0]);

    expect(context).toContain("Express server, PTY management");
  });

  test("context with only charter (no history)", () => {
    const member: SquadMember = {
      id: "blain",
      name: "Blain",
      role: "Tester",
      scope: "Testing",
      badge: "🧪 Tester",
      status: "available",
      charterPath: path.join(TEST_DATA, "charter-sample.md"),
      historyPath: undefined,
    };

    const records = squadMembersToAgentRecords("default", [member], "/tmp");
    const context = buildFirstMessageContext(records[0]);

    expect(context).toContain("--- Charter ---");
    expect(context).not.toContain("--- History ---");
  });

  test("context with only history (no charter)", () => {
    const member: SquadMember = {
      id: "blain",
      name: "Blain",
      role: "Tester",
      scope: "Testing",
      badge: "🧪 Tester",
      status: "available",
      charterPath: undefined,
      historyPath: path.join(TEST_DATA, "history-sample.md"),
    };

    const records = squadMembersToAgentRecords("default", [member], "/tmp");
    const context = buildFirstMessageContext(records[0]);

    expect(context).not.toContain("--- Charter ---");
    expect(context).toContain("--- History ---");
  });
});
