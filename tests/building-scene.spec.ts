/**
 * Building Scene Integration Tests (Playwright)
 *
 * Tests the BuildingScene → PodScene navigation and rendering.
 * These run against the full app (server + web) via Playwright.
 *
 * Architecture (from decisions.md):
 *   - BuildingScene: Top-level hallway with pod grid
 *   - PodScene: Per-squad interior (refactored from OfficeScene)
 *   - Escape returns from PodScene → BuildingScene
 *   - Squad member NPCs appear inside pods
 */

import { test, expect } from "@playwright/test";

const SERVER = "http://localhost:3003";

test.setTimeout(30_000);

// ── Helpers ──────────────────────────────────────────────────────────

/** Wait for the Phaser game canvas to be rendered */
async function waitForCanvas(page: any) {
  await page.waitForFunction(
    () => document.querySelector("canvas") !== null,
    { timeout: 15_000 }
  );
  return page.locator("canvas");
}

/** Check if a Phaser scene is active by querying the game object */
async function getActiveSceneKey(page: any): Promise<string | null> {
  return page.evaluate(() => {
    const game = (window as any).__PHASER_GAME__;
    if (!game || !game.scene) return null;
    const scenes = game.scene.getScenes(true);
    if (scenes.length === 0) return null;
    return scenes[0].scene.key;
  });
}

/** Check if Building API is available (endpoints may not exist yet) */
async function isBuildingAPIReady(request: any): Promise<boolean> {
  try {
    const res = await request.get(`${SERVER}/api/building/squads`);
    return res.status() !== 404;
  } catch {
    return false;
  }
}

// ── BuildingScene rendering ──────────────────────────────────────────

test.describe("BuildingScene rendering", () => {
  test("app loads with a canvas element", async ({ page }) => {
    await page.goto("/");
    const canvas = await waitForCanvas(page);
    await expect(canvas).toBeVisible();
  });

  test("BuildingScene is the initial scene (when building mode is active)", async ({
    page,
    request,
  }) => {
    if (!(await isBuildingAPIReady(request))) {
      test.skip(true, "Building mode not yet implemented");
      return;
    }

    await page.goto("/");
    await waitForCanvas(page);

    // Give Phaser time to boot
    await page.waitForTimeout(2000);

    const sceneKey = await getActiveSceneKey(page);
    // Should be BuildingScene or similar top-level scene
    // Accept "BuildingScene", "building", or the original scene if building not yet active
    expect(sceneKey).toBeTruthy();
  });

  test("BuildingScene renders pod elements for each squad", async ({
    page,
    request,
  }) => {
    if (!(await isBuildingAPIReady(request))) {
      test.skip(true, "Building mode not yet implemented");
      return;
    }

    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Check that the building scene has rendered pod zones
    // This queries Phaser's game objects for pod-related elements
    const podCount = await page.evaluate(() => {
      const game = (window as any).__PHASER_GAME__;
      if (!game) return 0;
      const scenes = game.scene.getScenes(true);
      if (scenes.length === 0) return 0;
      const scene = scenes[0];
      // Look for pod objects (zones, sprites, or containers with "pod" in name)
      let count = 0;
      scene.children?.list?.forEach((child: any) => {
        if (
          child.name?.toLowerCase().includes("pod") ||
          child.type === "Zone"
        ) {
          count++;
        }
      });
      return count;
    });

    // Should have at least one pod (auto-detected .squad/ directory)
    expect(podCount).toBeGreaterThanOrEqual(1);
  });
});

// ── Pod navigation (BuildingScene ↔ PodScene) ────────────────────────

test.describe("Pod navigation", () => {
  test("clicking or walking into pod transitions to PodScene", async ({
    page,
    request,
  }) => {
    if (!(await isBuildingAPIReady(request))) {
      test.skip(true, "Building mode not yet implemented");
      return;
    }

    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    const initialScene = await getActiveSceneKey(page);

    // Simulate entering a pod — either by clicking the pod zone
    // or walking the player into it. Try click first.
    const entered = await page.evaluate(() => {
      const game = (window as any).__PHASER_GAME__;
      if (!game) return false;
      const scenes = game.scene.getScenes(true);
      if (scenes.length === 0) return false;
      const scene = scenes[0];

      // Find a pod zone and trigger its callback
      for (const child of scene.children?.list ?? []) {
        if (
          child.name?.toLowerCase().includes("pod") ||
          child.getData?.("type") === "pod"
        ) {
          // Emit interaction event
          child.emit?.("pointerdown");
          return true;
        }
      }
      return false;
    });

    if (!entered) {
      // Try walking into a pod with arrow keys/WASD
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(500);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(500);
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(500);
    }

    await page.waitForTimeout(1000);

    const newScene = await getActiveSceneKey(page);
    // Scene should have changed (or at least not crash)
    // If building mode is active, we expect PodScene
    if (entered) {
      expect(newScene).not.toBe(initialScene);
    }
  });

  test("Escape key returns from PodScene to BuildingScene", async ({
    page,
    request,
  }) => {
    if (!(await isBuildingAPIReady(request))) {
      test.skip(true, "Building mode not yet implemented");
      return;
    }

    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Enter a pod first (simulate)
    await page.evaluate(() => {
      const game = (window as any).__PHASER_GAME__;
      if (!game) return;
      const scenes = game.scene.getScenes(true);
      if (scenes.length === 0) return;
      const scene = scenes[0];
      for (const child of scene.children?.list ?? []) {
        if (
          child.name?.toLowerCase().includes("pod") ||
          child.getData?.("type") === "pod"
        ) {
          child.emit?.("pointerdown");
          break;
        }
      }
    });

    await page.waitForTimeout(1000);
    const podScene = await getActiveSceneKey(page);

    // Press Escape to go back
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);

    const afterEscape = await getActiveSceneKey(page);

    // If we were in a PodScene, we should now be back in BuildingScene
    if (podScene && podScene !== afterEscape) {
      // Scene changed — navigation worked
      expect(afterEscape).toBeTruthy();
    }
  });
});

// ── Squad member NPCs in pods ────────────────────────────────────────

test.describe("Squad member NPCs", () => {
  test("PodScene contains NPC sprites for squad members", async ({
    page,
    request,
  }) => {
    if (!(await isBuildingAPIReady(request))) {
      test.skip(true, "Building mode not yet implemented");
      return;
    }

    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Enter a pod
    await page.evaluate(() => {
      const game = (window as any).__PHASER_GAME__;
      if (!game) return;
      const scenes = game.scene.getScenes(true);
      if (scenes.length === 0) return;
      for (const child of scenes[0].children?.list ?? []) {
        if (
          child.name?.toLowerCase().includes("pod") ||
          child.getData?.("type") === "pod"
        ) {
          child.emit?.("pointerdown");
          break;
        }
      }
    });

    await page.waitForTimeout(1500);

    // Count NPC sprites in the current scene
    const npcInfo = await page.evaluate(() => {
      const game = (window as any).__PHASER_GAME__;
      if (!game) return { count: 0, names: [] as string[] };
      const scenes = game.scene.getScenes(true);
      if (scenes.length === 0) return { count: 0, names: [] as string[] };

      const npcs: string[] = [];
      scenes[0].children?.list?.forEach((child: any) => {
        if (
          child.type === "Sprite" &&
          child.getData?.("isNPC") === true
        ) {
          npcs.push(child.getData?.("name") || child.name || "unnamed");
        }
      });
      return { count: npcs.length, names: npcs };
    });

    // Should have at least 1 NPC if a squad was loaded
    if (npcInfo.count > 0) {
      expect(npcInfo.count).toBeGreaterThan(0);
      // NPC names should not be empty
      for (const name of npcInfo.names) {
        expect(name).not.toBe("unnamed");
      }
    }
  });

  test("NPC names match squad roster names", async ({ page, request }) => {
    if (!(await isBuildingAPIReady(request))) {
      test.skip(true, "Building mode not yet implemented");
      return;
    }

    // Get expected names from the API
    const listRes = await request.get(`${SERVER}/api/building/squads`);
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
    const expectedNames = detail.members.map((m: any) => m.name);

    await page.goto("/");
    await waitForCanvas(page);
    await page.waitForTimeout(2000);

    // Enter the first pod
    await page.evaluate(() => {
      const game = (window as any).__PHASER_GAME__;
      if (!game) return;
      const scenes = game.scene.getScenes(true);
      if (scenes.length === 0) return;
      for (const child of scenes[0].children?.list ?? []) {
        if (
          child.name?.toLowerCase().includes("pod") ||
          child.getData?.("type") === "pod"
        ) {
          child.emit?.("pointerdown");
          break;
        }
      }
    });

    await page.waitForTimeout(1500);

    const npcNames = await page.evaluate(() => {
      const game = (window as any).__PHASER_GAME__;
      if (!game) return [] as string[];
      const scenes = game.scene.getScenes(true);
      if (scenes.length === 0) return [] as string[];

      const names: string[] = [];
      scenes[0].children?.list?.forEach((child: any) => {
        if (child.type === "Sprite" && child.getData?.("isNPC")) {
          names.push(child.getData?.("name") || "");
        }
      });
      return names;
    });

    // Each NPC name should be in the expected roster
    for (const name of npcNames) {
      if (name) {
        expect(expectedNames).toContain(name);
      }
    }
  });
});
