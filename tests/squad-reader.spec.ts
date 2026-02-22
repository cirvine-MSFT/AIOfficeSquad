/**
 * Squad Reader Tests
 *
 * Tests the parsing of .squad/team.md into a structured roster.
 * These are pure logic tests — no Playwright or server needed.
 *
 * The squad reader module (apps/server/src/squad-reader.ts or similar)
 * is expected to export:
 *   - parseTeamFile(filePath: string): SquadMember[]
 *   - or parseTeamMarkdown(content: string): SquadMember[]
 *
 * SquadMember: { name: string; role: string; scope: string; badge: string }
 */

import { test, expect } from "@playwright/test";
import path from "path";
import { readFileSync, existsSync } from "fs";

// ── Constants ────────────────────────────────────────────────────────
const TEST_DATA = path.resolve(process.cwd(), "tests", "test-data");

// ── Inline parser (mirrors expected squad-reader logic) ──────────────
// This is a reference implementation for testing. Once the real
// squad-reader module lands, swap this out for an import.

interface SquadMember {
  name: string;
  role: string;
  scope: string;
  badge: string;
}

/** Names to filter out — infrastructure agents, not visible in pods */
const FILTERED_NAMES = ["Scribe", "Ralph"];

function parseTeamMarkdown(content: string): SquadMember[] {
  const lines = content.split("\n");
  const members: SquadMember[] = [];

  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect markdown table rows (pipe-delimited)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // Skip header row
      if (
        cells.length >= 4 &&
        cells[0].toLowerCase() === "name" &&
        cells[1].toLowerCase() === "role"
      ) {
        inTable = true;
        continue;
      }

      // Skip separator row (e.g., |------|------|)
      if (inTable && !headerPassed && cells.every((c) => /^-+$/.test(c))) {
        headerPassed = true;
        continue;
      }

      // Parse data rows
      if (inTable && headerPassed && cells.length >= 4) {
        members.push({
          name: cells[0],
          role: cells[1],
          scope: cells[2],
          badge: cells[3],
        });
      }
    } else if (inTable && headerPassed) {
      // End of table
      break;
    }
  }

  return members;
}

function filterMembers(members: SquadMember[]): SquadMember[] {
  return members.filter((m) => !FILTERED_NAMES.includes(m.name));
}

// ── Tests ────────────────────────────────────────────────────────────

test.describe("Squad reader — team.md parsing", () => {
  test("parses full team.md into roster of 7 members", () => {
    const content = readFileSync(path.join(TEST_DATA, "team.md"), "utf-8");
    const members = parseTeamMarkdown(content);

    expect(members).toHaveLength(7);
    expect(members[0].name).toBe("Dutch");
    expect(members[0].role).toBe("Lead");
    expect(members[0].badge).toBe("🏗️ Lead");
  });

  test("extracts name, role, scope, and badge from each row", () => {
    const content = readFileSync(path.join(TEST_DATA, "team.md"), "utf-8");
    const members = parseTeamMarkdown(content);

    const poncho = members.find((m) => m.name === "Poncho");
    expect(poncho).toBeDefined();
    expect(poncho!.role).toBe("Frontend Dev");
    expect(poncho!.scope).toContain("Phaser UI");
    expect(poncho!.badge).toBe("⚛️ Frontend");

    const mac = members.find((m) => m.name === "Mac");
    expect(mac).toBeDefined();
    expect(mac!.role).toBe("Backend Dev");
    expect(mac!.badge).toBe("🔧 Backend");
  });

  test("filters out Scribe and Ralph (infrastructure agents)", () => {
    const content = readFileSync(path.join(TEST_DATA, "team.md"), "utf-8");
    const allMembers = parseTeamMarkdown(content);
    const visible = filterMembers(allMembers);

    expect(visible).toHaveLength(5);
    expect(visible.find((m) => m.name === "Scribe")).toBeUndefined();
    expect(visible.find((m) => m.name === "Ralph")).toBeUndefined();
    // Visible members preserved
    expect(visible.find((m) => m.name === "Dutch")).toBeDefined();
    expect(visible.find((m) => m.name === "Blain")).toBeDefined();
  });

  test("parses minimal team.md with single member", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "team-minimal.md"),
      "utf-8"
    );
    const members = parseTeamMarkdown(content);

    expect(members).toHaveLength(1);
    expect(members[0].name).toBe("Solo");
    expect(members[0].role).toBe("Developer");
    expect(members[0].badge).toBe("🔧 Dev");
  });

  test("returns empty array for team.md with no members table", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "team-empty.md"),
      "utf-8"
    );
    const members = parseTeamMarkdown(content);

    expect(members).toHaveLength(0);
  });

  test("handles missing file gracefully", () => {
    const fakePath = path.join(TEST_DATA, "nonexistent-team.md");
    expect(existsSync(fakePath)).toBe(false);

    // The squad reader should not throw — it should return empty
    // When the real module is integrated, this tests its error handling.
    // For now, we verify the path doesn't exist and parsing empty yields [].
    const members = parseTeamMarkdown("");
    expect(members).toHaveLength(0);
  });

  test("badge field contains emoji prefix", () => {
    const content = readFileSync(path.join(TEST_DATA, "team.md"), "utf-8");
    const members = parseTeamMarkdown(content);

    // Every badge should contain an emoji (non-ASCII character)
    for (const member of members) {
      // eslint-disable-next-line no-control-regex
      expect(member.badge).toMatch(/[^\x00-\x7F]/);
    }
  });

  test("all member names are non-empty strings", () => {
    const content = readFileSync(path.join(TEST_DATA, "team.md"), "utf-8");
    const members = parseTeamMarkdown(content);

    for (const member of members) {
      expect(member.name.length).toBeGreaterThan(0);
      expect(member.role.length).toBeGreaterThan(0);
    }
  });
});
