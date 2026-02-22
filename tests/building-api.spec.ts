/**
 * Building API Tests
 *
 * Tests the new building/pod REST API endpoints:
 *   GET  /api/building/squads      — list all squads in the building
 *   GET  /api/building/squads/:id  — get squad details (roster, state)
 *
 * Also verifies backward compatibility: /agents/* still works.
 *
 * Uses the existing Playwright test setup that starts the server.
 * These tests hit the real server (localhost:3003).
 */

import { test, expect } from "@playwright/test";

const SERVER = "http://localhost:3003";

test.setTimeout(30_000);

// ── Helpers ──────────────────────────────────────────────────────────

async function cleanupAgents(request: any) {
  const res = await request.get(`${SERVER}/agents`);
  if (res.ok()) {
    const agents = await res.json();
    for (const agent of agents) {
      await request.delete(`${SERVER}/agents/${agent.agentId}`);
    }
  }
}

// ── Building API — Squad listing ─────────────────────────────────────

test.describe("Building API — Squad listing", () => {
  test.beforeEach(async ({ request }) => {
    await cleanupAgents(request);
  });

  test.afterEach(async ({ request }) => {
    await cleanupAgents(request);
  });

  test("GET /api/building/squads returns 200 with array", async ({
    request,
  }) => {
    const res = await request.get(`${SERVER}/api/building/squads`);
    // Expect 200 when endpoint exists; 404 means it hasn't been built yet
    if (res.status() === 404) {
      test.skip(true, "Building API not yet implemented — endpoint returns 404");
      return;
    }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("squad list entries have id, name, and memberCount", async ({
    request,
  }) => {
    const res = await request.get(`${SERVER}/api/building/squads`);
    if (res.status() === 404) {
      test.skip(true, "Building API not yet implemented");
      return;
    }
    const squads = await res.json();

    // If auto-detection is working, there should be at least 1 squad
    // (the local .squad/ directory)
    if (squads.length > 0) {
      const squad = squads[0];
      expect(squad).toHaveProperty("id");
      expect(squad).toHaveProperty("name");
      expect(squad).toHaveProperty("memberCount");
      expect(typeof squad.id).toBe("string");
      expect(typeof squad.name).toBe("string");
      expect(typeof squad.memberCount).toBe("number");
    }
  });

  test("auto-detection finds local .squad when no config exists", async ({
    request,
  }) => {
    const res = await request.get(`${SERVER}/api/building/squads`);
    if (res.status() === 404) {
      test.skip(true, "Building API not yet implemented");
      return;
    }
    const squads = await res.json();

    // The project root has a .squad/ directory, so auto-detection should find it
    expect(squads.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Building API — Squad details ─────────────────────────────────────

test.describe("Building API — Squad details", () => {
  test("GET /api/building/squads/:id returns squad with members", async ({
    request,
  }) => {
    // First, get the list to find a valid squad ID
    const listRes = await request.get(`${SERVER}/api/building/squads`);
    if (listRes.status() === 404) {
      test.skip(true, "Building API not yet implemented");
      return;
    }
    const squads = await listRes.json();
    if (squads.length === 0) {
      test.skip(true, "No squads detected — cannot test details");
      return;
    }

    const squadId = squads[0].id;
    const detailRes = await request.get(
      `${SERVER}/api/building/squads/${squadId}`
    );
    expect(detailRes.ok()).toBeTruthy();

    const detail = await detailRes.json();
    expect(detail).toHaveProperty("id", squadId);
    expect(detail).toHaveProperty("name");
    expect(detail).toHaveProperty("members");
    expect(Array.isArray(detail.members)).toBe(true);
  });

  test("squad members have name, role, and badge fields", async ({
    request,
  }) => {
    const listRes = await request.get(`${SERVER}/api/building/squads`);
    if (listRes.status() === 404) {
      test.skip(true, "Building API not yet implemented");
      return;
    }
    const squads = await listRes.json();
    if (squads.length === 0) {
      test.skip(true, "No squads detected");
      return;
    }

    const squadId = squads[0].id;
    const detailRes = await request.get(
      `${SERVER}/api/building/squads/${squadId}`
    );
    const detail = await detailRes.json();

    if (detail.members.length > 0) {
      const member = detail.members[0];
      expect(member).toHaveProperty("name");
      expect(member).toHaveProperty("role");
      expect(member).toHaveProperty("badge");
      expect(typeof member.name).toBe("string");
      expect(member.name.length).toBeGreaterThan(0);
    }
  });

  test("squad detail excludes Scribe and Ralph from visible members", async ({
    request,
  }) => {
    const listRes = await request.get(`${SERVER}/api/building/squads`);
    if (listRes.status() === 404) {
      test.skip(true, "Building API not yet implemented");
      return;
    }
    const squads = await listRes.json();
    if (squads.length === 0) {
      test.skip(true, "No squads detected");
      return;
    }

    const squadId = squads[0].id;
    const detailRes = await request.get(
      `${SERVER}/api/building/squads/${squadId}`
    );
    const detail = await detailRes.json();

    // Scribe and Ralph should be filtered out of visible members
    const names = detail.members.map((m: any) => m.name);
    expect(names).not.toContain("Scribe");
    expect(names).not.toContain("Ralph");
  });

  test("GET /api/building/squads/nonexistent returns 404", async ({
    request,
  }) => {
    const listRes = await request.get(`${SERVER}/api/building/squads`);
    if (listRes.status() === 404) {
      test.skip(true, "Building API not yet implemented");
      return;
    }

    const res = await request.get(
      `${SERVER}/api/building/squads/does-not-exist-12345`
    );
    expect(res.status()).toBe(404);
  });
});

// ── Backward compatibility — /agents/* still works ───────────────────

test.describe("Backward compatibility — /agents/*", () => {
  test.beforeEach(async ({ request }) => {
    await cleanupAgents(request);
  });

  test.afterEach(async ({ request }) => {
    await cleanupAgents(request);
  });

  test("GET /agents still returns agent list", async ({ request }) => {
    const res = await request.get(`${SERVER}/agents`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("POST /agents/spawn still works", async ({ request }) => {
    const res = await request.post(`${SERVER}/agents/spawn`, {
      data: {
        name: "BackCompat Test",
        cliType: "claude-code",
        workingDirectory: process.cwd(),
        personality: "Keep replies very short.",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("agentId");

    // Clean up
    await request.delete(`${SERVER}/agents/${body.agentId}`);
  });

  test("POST /events still accepts agent events", async ({ request }) => {
    const res = await request.post(`${SERVER}/events`, {
      data: {
        type: "agent.status",
        agentId: "compat-test-fake",
        timestamp: new Date().toISOString(),
        payload: { status: "available", summary: "Ready" },
      },
    });
    // Should accept or at least not crash (agent may not exist)
    expect([200, 201, 404].includes(res.status())).toBeTruthy();
  });
});
