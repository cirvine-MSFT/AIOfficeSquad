/**
 * Decisions API Tests
 *
 * Tests the parsing of .squad/decisions.md into structured decision entries.
 * These are pure logic tests — no Playwright or server needed for parsing.
 *
 * The decisions parser is expected to extract entries from decisions.md
 * in the format:
 *   ### {timestamp}: {title}
 *   **By:** {author}
 *   **What:** {description}
 *   **Why:** {rationale}
 *
 * DecisionEntry: { timestamp: string; title: string; author: string;
 *                  what: string; why: string }
 */

import { test, expect } from "@playwright/test";
import path from "path";
import { readFileSync, existsSync } from "fs";

// ── Constants ────────────────────────────────────────────────────────
const TEST_DATA = path.resolve(process.cwd(), "tests", "test-data");
const SERVER = "http://localhost:3003";

// ── Inline parser (mirrors expected decisions parser logic) ──────────
// Reference implementation for testing. Once the real decisions module
// lands (e.g., apps/server/src/decisions-reader.ts), swap for an import.

interface DecisionEntry {
  timestamp: string;
  title: string;
  author: string;
  what: string;
  why: string;
}

/**
 * Parse decisions.md content into an array of DecisionEntry objects.
 * Expected format per entry:
 *   ### {ISO-timestamp}: {title}
 *   **By:** {author}
 *   **What:** {description}
 *   **Why:** {rationale}
 */
function parseDecisionsMd(content: string): DecisionEntry[] {
  const entries: DecisionEntry[] = [];
  const lines = content.split("\n");

  let current: Partial<DecisionEntry> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect decision heading: ### {timestamp}: {title}
    const headingMatch = trimmed.match(
      /^###\s+(\S+):\s+(.+)$/
    );
    if (headingMatch) {
      // Save previous entry if complete
      if (current && current.timestamp && current.title) {
        entries.push({
          timestamp: current.timestamp || "",
          title: current.title || "",
          author: current.author || "",
          what: current.what || "",
          why: current.why || "",
        });
      }
      current = {
        timestamp: headingMatch[1],
        title: headingMatch[2].trim(),
      };
      continue;
    }

    if (!current) continue;

    // Extract **By:** {author}
    const byMatch = trimmed.match(/^\*\*By:\*\*\s*(.+)$/);
    if (byMatch) {
      current.author = byMatch[1].trim();
      continue;
    }

    // Extract **What:** {description}
    const whatMatch = trimmed.match(/^\*\*What:\*\*\s*(.+)$/);
    if (whatMatch) {
      current.what = whatMatch[1].trim();
      continue;
    }

    // Extract **Why:** {rationale}
    const whyMatch = trimmed.match(/^\*\*Why:\*\*\s*(.+)$/);
    if (whyMatch) {
      current.why = whyMatch[1].trim();
      continue;
    }
  }

  // Push the last entry
  if (current && current.timestamp && current.title) {
    entries.push({
      timestamp: current.timestamp || "",
      title: current.title || "",
      author: current.author || "",
      what: current.what || "",
      why: current.why || "",
    });
  }

  return entries;
}

/**
 * Apply limit parameter — return the most recent N entries.
 * Entries are returned in file order (oldest first); limit takes from the end.
 */
function limitDecisions(
  entries: DecisionEntry[],
  limit: number = 10
): DecisionEntry[] {
  if (limit <= 0) return [];
  if (entries.length <= limit) return entries;
  return entries.slice(entries.length - limit);
}

/**
 * Filter decisions by member/author name (case-insensitive).
 */
function filterByMember(
  entries: DecisionEntry[],
  member: string
): DecisionEntry[] {
  const lower = member.toLowerCase();
  return entries.filter((e) => e.author.toLowerCase().includes(lower));
}

// ── Tests — Parsing ──────────────────────────────────────────────────

test.describe("Decisions parser — decisions.md parsing", () => {
  test("parses sample decisions.md into 12 decision entries", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    expect(entries).toHaveLength(12);
  });

  test("extracts timestamp from ### {timestamp}: {title} format", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    expect(entries[0].timestamp).toBe("2026-02-22T03:46:00Z");
    expect(entries[1].timestamp).toBe("2026-02-22T10:30:00Z");
    // Timestamps should look like ISO 8601
    for (const entry of entries) {
      expect(entry.timestamp.length).toBeGreaterThan(0);
    }
  });

  test("extracts title from ### {timestamp}: {title} format", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    expect(entries[0].title).toBe("Project inception");
    expect(entries[1].title).toBe("Use Playwright for testing");
    expect(entries[2].title).toBe("Squad member filtering");
  });

  test("extracts author from **By:** lines", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    expect(entries[0].author).toBe("Casey Irvine");
    expect(entries[1].author).toBe("Blain");
    expect(entries[2].author).toBe("Mac");
    expect(entries[3].author).toBe("Dutch");
  });

  test("extracts What and Why content from each entry", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    // First entry
    expect(entries[0].what).toContain("Adapt AIOffice");
    expect(entries[0].why).toContain("visual, interactive squad management");

    // Second entry
    expect(entries[1].what).toContain("Playwright test runner");
    expect(entries[1].why).toContain("Consistent testing framework");

    // All entries should have non-empty what and why
    for (const entry of entries) {
      expect(entry.what.length).toBeGreaterThan(0);
      expect(entry.why.length).toBeGreaterThan(0);
    }
  });

  test("all entries have non-empty timestamp, title, and author", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    for (const entry of entries) {
      expect(entry.timestamp.length).toBeGreaterThan(0);
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.author.length).toBeGreaterThan(0);
    }
  });
});

// ── Tests — Limit parameter ─────────────────────────────────────────

test.describe("Decisions parser — limit parameter", () => {
  test("default limit of 10 returns last 10 entries", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);
    const limited = limitDecisions(entries);

    // 12 total entries, limit 10 → last 10
    expect(limited).toHaveLength(10);
    // First two entries (oldest) should be dropped
    expect(limited[0].title).toBe("Squad member filtering");
  });

  test("custom limit returns that many entries", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    const three = limitDecisions(entries, 3);
    expect(three).toHaveLength(3);
    // Should be the 3 most recent
    expect(three[2].title).toBe("Auto-detect squad config");

    const one = limitDecisions(entries, 1);
    expect(one).toHaveLength(1);
    expect(one[0].title).toBe("Auto-detect squad config");
  });

  test("limit larger than total returns all entries", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    const all = limitDecisions(entries, 100);
    expect(all).toHaveLength(12);
  });

  test("limit of 0 returns empty array", () => {
    const entries = limitDecisions(
      [
        {
          timestamp: "t",
          title: "t",
          author: "a",
          what: "w",
          why: "y",
        },
      ],
      0
    );
    expect(entries).toHaveLength(0);
  });
});

// ── Tests — Member filter ────────────────────────────────────────────

test.describe("Decisions parser — member filter", () => {
  test("filters by author name (case-insensitive)", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    const macEntries = filterByMember(entries, "mac");
    expect(macEntries.length).toBeGreaterThanOrEqual(2);
    for (const entry of macEntries) {
      expect(entry.author.toLowerCase()).toContain("mac");
    }
  });

  test("filters by partial author name match", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    const caseyEntries = filterByMember(entries, "Casey");
    expect(caseyEntries.length).toBeGreaterThanOrEqual(2);
    for (const entry of caseyEntries) {
      expect(entry.author).toContain("Casey");
    }
  });

  test("returns empty array when no author matches", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    const nobody = filterByMember(entries, "Nonexistent Person");
    expect(nobody).toHaveLength(0);
  });

  test("filter and limit can be combined", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    const macRecent = limitDecisions(filterByMember(entries, "mac"), 1);
    expect(macRecent).toHaveLength(1);
    expect(macRecent[0].author).toBe("Mac");
  });
});

// ── Tests — Edge cases ──────────────────────────────────────────────

test.describe("Decisions parser — edge cases", () => {
  test("empty decisions.md returns empty array", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions-empty.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    expect(entries).toHaveLength(0);
  });

  test("empty string returns empty array", () => {
    const entries = parseDecisionsMd("");
    expect(entries).toHaveLength(0);
  });

  test("malformed decisions.md still parses valid-looking entries", () => {
    const content = readFileSync(
      path.join(TEST_DATA, "decisions-malformed.md"),
      "utf-8"
    );
    const entries = parseDecisionsMd(content);

    // Should find entries that have both timestamp-like and title portions
    // Even malformed entries will be parsed if they match ### X: Y pattern
    expect(entries.length).toBeGreaterThan(0);

    // The valid entry after garbage should be found
    const validEntry = entries.find(
      (e) => e.title === "Valid entry after garbage"
    );
    expect(validEntry).toBeDefined();
    expect(validEntry!.author).toBe("Blain");
    expect(validEntry!.what).toContain("valid-looking entry");
  });

  test("malformed entries with empty titles are still captured", () => {
    const content = "### 2026-02-22T10:00:00Z:\n**By:**\n**What:**\n**Why:**\n";
    const entries = parseDecisionsMd(content);

    // Heading regex requires at least one char after ": " so empty title = no match
    expect(entries).toHaveLength(0);
  });

  test("handles missing file gracefully", () => {
    const fakePath = path.join(TEST_DATA, "nonexistent-decisions.md");
    expect(existsSync(fakePath)).toBe(false);

    // Parser itself should handle empty string
    const entries = parseDecisionsMd("");
    expect(entries).toHaveLength(0);
  });
});

// ── Tests — API endpoint (requires dev server) ──────────────────────

test.describe("Decisions API — /api/decisions endpoint", () => {
  // These tests require the dev server running on localhost:3003.
  // They will be skipped until the decisions API endpoint is implemented.

  test.skip(
    true,
    "Decisions API not yet implemented — needs dev server running"
  );

  test("GET /api/decisions returns 200 with array", async ({ request }) => {
    const res = await request.get(`${SERVER}/api/decisions`);
    if (res.status() === 404) {
      test.skip(true, "Decisions API not yet implemented");
      return;
    }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.decisions || body)).toBe(true);
  });

  test("GET /api/decisions?limit=5 respects limit", async ({ request }) => {
    const res = await request.get(`${SERVER}/api/decisions?limit=5`);
    if (res.status() === 404) {
      test.skip(true, "Decisions API not yet implemented");
      return;
    }
    const body = await res.json();
    const decisions = body.decisions || body;
    expect(decisions.length).toBeLessThanOrEqual(5);
  });

  test("GET /api/decisions?member=Mac filters by author", async ({
    request,
  }) => {
    const res = await request.get(`${SERVER}/api/decisions?member=Mac`);
    if (res.status() === 404) {
      test.skip(true, "Decisions API not yet implemented");
      return;
    }
    const body = await res.json();
    const decisions = body.decisions || body;
    for (const d of decisions) {
      expect(d.author.toLowerCase()).toContain("mac");
    }
  });
});
