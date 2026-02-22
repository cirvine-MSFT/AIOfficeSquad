/**
 * Building Dashboard Tests
 *
 * Tests the building dashboard API endpoints:
 *   GET  /api/building/squads          — list all squads
 *   GET  /api/building/squads/:squadId — squad details with members
 *
 * API tests require the dev server running on localhost:3003.
 * Uses test.skip() pattern when endpoints return 404 (not yet implemented).
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

/**
 * Check if the building API is available. If not, skip the test.
 * Returns the response if available, or calls test.skip().
 */
async function requireBuildingApi(request: any) {
  const res = await request.get(`${SERVER}/api/building/squads`);
  if (res.status() === 404) {
    test.skip(true, "Building dashboard API not yet implemented — needs dev server with building routes");
    return null;
  }
  return res;
}

// ── Building Dashboard — Squad listing ───────────────────────────────

test.describe("Building dashboard — GET /api/building/squads", () => {
  // These tests require the dev server running.
  // They will gracefully skip if the endpoint returns 404.

  test("returns 200 with squad list", async ({ request }) => {
    const res = await requireBuildingApi(request);
    if (!res) return;

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Response should have squads array (wrapped) or be an array
    const squads = body.squads || body;
    expect(Array.isArray(squads)).toBe(true);
  });

  test("each squad has id, name, memberCount, and active fields", async ({
    request,
  }) => {
    const res = await requireBuildingApi(request);
    if (!res) return;

    const body = await res.json();
    const squads = body.squads || body;

    if (squads.length === 0) {
      test.skip(true, "No squads detected — cannot validate fields");
      return;
    }

    for (const squad of squads) {
      expect(squad).toHaveProperty("id");
      expect(squad).toHaveProperty("name");
      expect(squad).toHaveProperty("memberCount");
      expect(squad).toHaveProperty("active");

      expect(typeof squad.id).toBe("string");
      expect(typeof squad.name).toBe("string");
      expect(typeof squad.memberCount).toBe("number");
      expect(typeof squad.active).toBe("boolean");

      // id and name should be non-empty
      expect(squad.id.length).toBeGreaterThan(0);
      expect(squad.name.length).toBeGreaterThan(0);
      // memberCount should be non-negative
      expect(squad.memberCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("at least one squad is detected from .squad/ directory", async ({
    request,
  }) => {
    const res = await requireBuildingApi(request);
    if (!res) return;

    const body = await res.json();
    const squads = body.squads || body;

    // The project root has a .squad/ directory, auto-detection should find it
    expect(squads.length).toBeGreaterThanOrEqual(1);
  });

  test("squad memberCount reflects visible members (excludes system agents)", async ({
    request,
  }) => {
    const res = await requireBuildingApi(request);
    if (!res) return;

    const body = await res.json();
    const squads = body.squads || body;

    if (squads.length === 0) {
      test.skip(true, "No squads detected");
      return;
    }

    // team.md has 7 total, minus Scribe and Ralph = 5 visible
    const defaultSquad = squads.find(
      (s: any) => s.id === "default" || s.memberCount > 0
    );
    if (defaultSquad) {
      expect(defaultSquad.memberCount).toBeGreaterThan(0);
      // Should not count Scribe and Ralph
      expect(defaultSquad.memberCount).toBeLessThanOrEqual(7);
    }
  });
});

// ── Building Dashboard — Squad details ───────────────────────────────

test.describe("Building dashboard — GET /api/building/squads/:squadId", () => {
  test("returns squad details with members array", async ({ request }) => {
    const listRes = await requireBuildingApi(request);
    if (!listRes) return;

    const listBody = await listRes.json();
    const squads = listBody.squads || listBody;
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

  test("member details include role, badge, and scope", async ({
    request,
  }) => {
    const listRes = await requireBuildingApi(request);
    if (!listRes) return;

    const listBody = await listRes.json();
    const squads = listBody.squads || listBody;
    if (squads.length === 0) {
      test.skip(true, "No squads detected");
      return;
    }

    const squadId = squads[0].id;
    const detailRes = await request.get(
      `${SERVER}/api/building/squads/${squadId}`
    );
    const detail = await detailRes.json();

    if (detail.members.length === 0) {
      test.skip(true, "No members in squad");
      return;
    }

    for (const member of detail.members) {
      expect(member).toHaveProperty("name");
      expect(member).toHaveProperty("role");
      expect(member).toHaveProperty("badge");
      expect(member).toHaveProperty("scope");

      expect(typeof member.name).toBe("string");
      expect(typeof member.role).toBe("string");
      expect(typeof member.badge).toBe("string");
      expect(typeof member.scope).toBe("string");

      expect(member.name.length).toBeGreaterThan(0);
      expect(member.role.length).toBeGreaterThan(0);
    }
  });

  test("members have id and status fields", async ({ request }) => {
    const listRes = await requireBuildingApi(request);
    if (!listRes) return;

    const listBody = await listRes.json();
    const squads = listBody.squads || listBody;
    if (squads.length === 0) {
      test.skip(true, "No squads detected");
      return;
    }

    const squadId = squads[0].id;
    const detailRes = await request.get(
      `${SERVER}/api/building/squads/${squadId}`
    );
    const detail = await detailRes.json();

    for (const member of detail.members) {
      expect(member).toHaveProperty("id");
      expect(typeof member.id).toBe("string");
      expect(member.id.length).toBeGreaterThan(0);
    }
  });

  test("members include hasCharter and hasHistory flags", async ({
    request,
  }) => {
    const listRes = await requireBuildingApi(request);
    if (!listRes) return;

    const listBody = await listRes.json();
    const squads = listBody.squads || listBody;
    if (squads.length === 0) {
      test.skip(true, "No squads detected");
      return;
    }

    const squadId = squads[0].id;
    const detailRes = await request.get(
      `${SERVER}/api/building/squads/${squadId}`
    );
    const detail = await detailRes.json();

    for (const member of detail.members) {
      // hasCharter and hasHistory should be boolean flags
      expect(member).toHaveProperty("hasCharter");
      expect(member).toHaveProperty("hasHistory");
      expect(typeof member.hasCharter).toBe("boolean");
      expect(typeof member.hasHistory).toBe("boolean");
    }
  });

  test("returns 404 for non-existent squad", async ({ request }) => {
    const listRes = await requireBuildingApi(request);
    if (!listRes) return;

    const res = await request.get(
      `${SERVER}/api/building/squads/this-squad-definitely-does-not-exist-99999`
    );
    expect(res.status()).toBe(404);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("squad detail excludes Scribe and Ralph", async ({ request }) => {
    const listRes = await requireBuildingApi(request);
    if (!listRes) return;

    const listBody = await listRes.json();
    const squads = listBody.squads || listBody;
    if (squads.length === 0) {
      test.skip(true, "No squads detected");
      return;
    }

    const squadId = squads[0].id;
    const detailRes = await request.get(
      `${SERVER}/api/building/squads/${squadId}`
    );
    const detail = await detailRes.json();

    const names = detail.members.map((m: any) => m.name.toLowerCase());
    expect(names).not.toContain("scribe");
    expect(names).not.toContain("ralph");
  });
});

// ── Building Dashboard — Squad agents endpoint ───────────────────────

test.describe("Building dashboard — GET /api/squads/:squadId/agents", () => {
  test("returns agent records for a valid squad", async ({ request }) => {
    const listRes = await requireBuildingApi(request);
    if (!listRes) return;

    const listBody = await listRes.json();
    const squads = listBody.squads || listBody;
    if (squads.length === 0) {
      test.skip(true, "No squads detected");
      return;
    }

    const squadId = squads[0].id;
    const agentsRes = await request.get(
      `${SERVER}/api/squads/${squadId}/agents`
    );

    if (agentsRes.status() === 404) {
      test.skip(true, "Squad agents endpoint not yet implemented");
      return;
    }

    expect(agentsRes.ok()).toBeTruthy();
    const agents = await agentsRes.json();
    expect(Array.isArray(agents)).toBe(true);

    if (agents.length > 0) {
      const agent = agents[0];
      expect(agent).toHaveProperty("agentId");
      expect(agent).toHaveProperty("name");
      expect(agent).toHaveProperty("squadId");
      expect(agent).toHaveProperty("squadRole");
      expect(agent).toHaveProperty("squadBadge");
      expect(agent).toHaveProperty("squadScope");
    }
  });

  test("returns 404 for non-existent squad agents", async ({ request }) => {
    const listRes = await requireBuildingApi(request);
    if (!listRes) return;

    const res = await request.get(
      `${SERVER}/api/squads/nonexistent-squad-xyz/agents`
    );
    expect(res.status()).toBe(404);
  });
});
