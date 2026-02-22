import Phaser from "phaser";

/**
 * BuildingScene — Issue #11
 * Top-level scene showing a hallway/grid of squad pods.
 * Each pod is a colored rectangle with squad name, member count, and activity indicator.
 * Player walks between pods; entering a pod door transitions to PodScene.
 */

const SERVER_URL = "http://localhost:3003";

// Role color mapping for mini-previews (Issue #17)
const ROLE_COLORS: Record<string, number> = {
  lead: 0xd9a441,
  frontend: 0x4fb0ff,
  backend: 0x60d394,
  tester: 0xe05d5d,
  default: 0xa0a0a0,
};

export type PodMember = {
  name: string;
  role?: string;
  active?: boolean;
};

export type PodInfo = {
  squadId: string;
  name: string;
  memberCount: number;
  active: boolean;
  members?: PodMember[];
};

const DEFAULT_PODS: PodInfo[] = [
  { squadId: "alpha", name: "Alpha Squad", memberCount: 3, active: true },
  { squadId: "beta", name: "Beta Squad", memberCount: 2, active: false },
  { squadId: "gamma", name: "Gamma Squad", memberCount: 4, active: true },
];

// Layout constants
const HALLWAY_WIDTH = 800;
const HALLWAY_HEIGHT = 600;
const POD_WIDTH = 180;
const POD_HEIGHT = 140;
const POD_GAP = 40;
const POD_Y = 200;
const DOOR_WIDTH = 40;
const DOOR_HEIGHT = 16;
const PLAYER_START_Y = 440;

export class BuildingScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: { [key: string]: Phaser.Input.Keyboard.Key };
  private shiftKey?: Phaser.Input.Keyboard.Key;
  private pods: PodInfo[] = [];
  private podZones: Array<{ zone: Phaser.GameObjects.Zone; squadId: string; name: string }> = [];
  private podRects: Array<{ rect: Phaser.GameObjects.Rectangle; squadId: string; name: string }> = [];
  private enterPrompt?: Phaser.GameObjects.Text;
  private nearbyPodId: string | null = null;
  private desiredPlayerHeight = 120;
  // Pod preview state (Issue #17)
  private podPreviews = new Map<string, Phaser.GameObjects.Graphics>();
  private podPreviewTweens = new Map<string, Phaser.Tweens.Tween[]>();
  private podCenters = new Map<string, { cx: number; cy: number }>();

  constructor() {
    super("BuildingScene");
  }

  init(data?: { pods?: PodInfo[] }) {
    this.pods = data?.pods ?? DEFAULT_PODS;
  }

  preload() {
    this.load.spritesheet("boss", "/sprites/bossAllPoses.cleaned.png", {
      frameWidth: 186,
      frameHeight: 529,
    });
  }

  create() {
    // Floor
    this.add.rectangle(HALLWAY_WIDTH / 2, HALLWAY_HEIGHT / 2, HALLWAY_WIDTH, HALLWAY_HEIGHT, 0x1a1b1e);
    // Hallway floor stripe
    this.add.rectangle(HALLWAY_WIDTH / 2, PLAYER_START_Y, HALLWAY_WIDTH, 100, 0x252628);

    this.physics.world.setBounds(0, 0, HALLWAY_WIDTH, HALLWAY_HEIGHT);

    // Calculate pod positions centered in the hallway
    const totalWidth = this.pods.length * POD_WIDTH + (this.pods.length - 1) * POD_GAP;
    const startX = (HALLWAY_WIDTH - totalWidth) / 2 + POD_WIDTH / 2;

    this.podZones = [];
    this.podRects = [];
    this.pods.forEach((pod, i) => {
      const cx = startX + i * (POD_WIDTH + POD_GAP);
      const cy = POD_Y;

      // Pod room background — clickable (#18)
      const roomBg = this.add.rectangle(cx, cy, POD_WIDTH, POD_HEIGHT, 0x2a2d32);
      roomBg.setStrokeStyle(2, 0x4a4d55);
      roomBg.setInteractive({ useHandCursor: true });
      roomBg.on("pointerover", () => roomBg.setStrokeStyle(2, 0xd9a441));
      roomBg.on("pointerout", () => roomBg.setStrokeStyle(2, 0x4a4d55));
      roomBg.on("pointerdown", () => this.enterPod(pod.squadId));
      this.podRects.push({ rect: roomBg, squadId: pod.squadId, name: pod.name });

      // Squad name label with number key hint
      this.add.text(cx, cy - 40, `[${i + 1}] ${pod.name}`, {
        fontSize: "14px",
        fontFamily: '"Space Grotesk", sans-serif',
        color: "#f5e7c4",
        fontStyle: "bold",
      }).setOrigin(0.5, 0.5);

      // Member count
      this.add.text(cx, cy - 16, `${pod.memberCount} member${pod.memberCount !== 1 ? "s" : ""}`, {
        fontSize: "11px",
        fontFamily: '"Space Grotesk", sans-serif',
        color: "#a0a0a0",
      }).setOrigin(0.5, 0.5);

      // Activity indicator dot
      const dotColor = pod.active ? 0x60d394 : 0x666666;
      this.add.circle(cx + POD_WIDTH / 2 - 16, cy - POD_HEIGHT / 2 + 16, 5, dotColor);

      // Door (visual)
      const doorY = cy + POD_HEIGHT / 2;
      this.add.rectangle(cx, doorY, DOOR_WIDTH, DOOR_HEIGHT, 0x6b5b3e);
      this.add.rectangle(cx, doorY, DOOR_WIDTH - 4, DOOR_HEIGHT - 4, 0x8b7355);

      // Door zone (trigger)
      const zone = this.add.zone(cx, doorY + DOOR_HEIGHT / 2 + 20, DOOR_WIDTH + 20, 40);
      this.physics.world.enable(zone);
      (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      (zone.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      this.podZones.push({ zone, squadId: pod.squadId, name: pod.name });
      this.podCenters.set(pod.squadId, { cx, cy });

      // Render inline member previews if members data available (Issue #17)
      if (pod.members && pod.members.length > 0) {
        this.renderPodMembers(pod.squadId, cx, cy, pod.members);
      }
    });

    // Wall across the top
    this.add.rectangle(HALLWAY_WIDTH / 2, POD_Y - POD_HEIGHT / 2 - 20, HALLWAY_WIDTH, 10, 0x3a3d44);

    // Player animations (reuse boss sprite)
    if (!this.anims.exists("boss-walk-side")) {
      this.anims.create({
        key: "boss-walk-side",
        frames: this.anims.generateFrameNumbers("boss", { start: 2, end: 3 }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: "boss-walk-front",
        frames: this.anims.generateFrameNumbers("boss", { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1,
      });
      this.anims.create({
        key: "boss-idle",
        frames: [{ key: "boss", frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }

    const player = this.physics.add.sprite(HALLWAY_WIDTH / 2, PLAYER_START_Y, "boss", 0);
    const scale = this.desiredPlayerHeight / 529;
    player.setScale(scale);
    player.setOrigin(0.5, 1);
    player.setDepth(5);
    player.setCollideWorldBounds(true);
    player.setSize(10, 12);
    player.setOffset(3, 2);
    this.player = player;

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasdKeys = this.input.keyboard?.addKeys("W,A,S,D") as {
      [key: string]: Phaser.Input.Keyboard.Key;
    };
    this.shiftKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // "Enter pod" prompt
    this.enterPrompt = this.add.text(HALLWAY_WIDTH / 2, PLAYER_START_Y - 80, "Press E to enter", {
      fontSize: "12px",
      fontFamily: '"Space Grotesk", sans-serif',
      color: "#d9a441",
      backgroundColor: "rgba(0,0,0,0.7)",
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0.5).setDepth(10).setVisible(false);

    // Building title
    this.add.text(HALLWAY_WIDTH / 2, 30, "🏢  Office Building", {
      fontSize: "20px",
      fontFamily: '"Space Grotesk", sans-serif',
      color: "#f5e7c4",
      fontStyle: "bold",
    }).setOrigin(0.5, 0.5);

    this.add.text(HALLWAY_WIDTH / 2, 56, "Click a pod or press 1-9 to enter • Walk with WASD", {
      fontSize: "11px",
      fontFamily: '"Space Grotesk", sans-serif',
      color: "#888",
    }).setOrigin(0.5, 0.5);

    // E key to enter pod (walk-up legacy)
    this.input.keyboard?.on("keydown-E", () => {
      if (this.nearbyPodId) {
        this.enterPod(this.nearbyPodId);
      }
    });

    // Number keys 1-9 to jump directly to pods (#18)
    for (let n = 1; n <= 9; n++) {
      this.input.keyboard?.on(`keydown-${n === 0 ? "ZERO" : ["ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE"][n-1]}`, () => {
        const idx = n - 1;
        if (idx < this.pods.length) {
          this.enterPod(this.pods[idx].squadId);
        }
      });
    }

    // Camera
    this.cameras.main.setBounds(0, 0, HALLWAY_WIDTH, HALLWAY_HEIGHT);

    // Fetch and render pod member previews from API (Issue #17)
    this.fetchAndRenderPreviews();
    // Periodic refresh every 30s
    this.time.addEvent({
      delay: 30000,
      callback: () => this.fetchAndRenderPreviews(),
      loop: true,
    });
  }

  /** Enter a pod by squadId — used by click, number key, and walk-up */
  enterPod(squadId: string) {
    const pod = this.pods.find((p) => p.squadId === squadId);
    this.scene.start("PodScene", {
      squadId,
      squadName: pod?.name ?? squadId,
      hasBuilding: true,
    });
  }

  update() {
    if (!this.player || !this.cursors || !this.wasdKeys) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = this.shiftKey?.isDown ? 130 : 80;
    body.setVelocity(0);

    const up = this.cursors.up?.isDown || this.wasdKeys.W.isDown;
    const down = this.cursors.down?.isDown || this.wasdKeys.S.isDown;
    const left = this.cursors.left?.isDown || this.wasdKeys.A.isDown;
    const right = this.cursors.right?.isDown || this.wasdKeys.D.isDown;

    if (up) body.setVelocityY(-speed);
    if (down) body.setVelocityY(speed);
    if (left) body.setVelocityX(-speed);
    if (right) body.setVelocityX(speed);
    body.velocity.normalize().scale(speed);

    this.updatePlayerAnimation(body);
    this.checkPodProximity();
  }

  private updatePlayerAnimation(body: Phaser.Physics.Arcade.Body) {
    if (!this.player) return;
    const moving = Math.abs(body.velocity.x) > 1 || Math.abs(body.velocity.y) > 1;
    if (moving) {
      if (Math.abs(body.velocity.x) >= Math.abs(body.velocity.y)) {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== "boss-walk-side") {
          this.player.anims.play("boss-walk-side", true);
        }
        this.player.setFlipX(body.velocity.x < -1);
      } else {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== "boss-walk-front") {
          this.player.anims.play("boss-walk-front", true);
        }
        this.player.setFlipX(false);
      }
    } else {
      this.player.anims.play("boss-idle", true);
    }
  }

  private checkPodProximity() {
    if (!this.player) return;
    let nearest: { squadId: string; dist: number } | null = null;
    for (const pod of this.podZones) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        pod.zone.x, pod.zone.y
      );
      if (dist < 50 && (!nearest || dist < nearest.dist)) {
        nearest = { squadId: pod.squadId, dist };
      }
    }
    const nextId = nearest?.squadId ?? null;
    if (nextId !== this.nearbyPodId) {
      this.nearbyPodId = nextId;
    }
    if (this.enterPrompt) {
      this.enterPrompt.setVisible(!!this.nearbyPodId);
      if (this.nearbyPodId && this.player) {
        this.enterPrompt.setPosition(this.player.x, this.player.y - this.player.displayHeight - 10);
      }
    }
  }

  // ============ Pod Previews (Issue #17) ============

  private renderPodMembers(squadId: string, cx: number, cy: number, members: PodMember[]) {
    // Clean up existing preview for this pod
    const existing = this.podPreviews.get(squadId);
    if (existing) existing.destroy();
    const existingTweens = this.podPreviewTweens.get(squadId);
    if (existingTweens) existingTweens.forEach((t) => t.destroy());

    const gfx = this.add.graphics();
    gfx.setDepth(3);
    this.podPreviews.set(squadId, gfx);
    const tweens: Phaser.Tweens.Tween[] = [];

    // Layout: arrange members in a small grid inside the pod
    const maxPerRow = 4;
    const dotRadius = 4;
    const spacing = 14;
    const startY = cy + 8;
    const totalCols = Math.min(members.length, maxPerRow);
    const startX = cx - ((totalCols - 1) * spacing) / 2;

    members.forEach((member, i) => {
      const row = Math.floor(i / maxPerRow);
      const col = i % maxPerRow;
      const x = startX + col * spacing;
      const y = startY + row * spacing;

      const roleKey = (member.role || "").toLowerCase();
      const color = ROLE_COLORS[roleKey] || ROLE_COLORS.default;

      gfx.fillStyle(color, 1);
      gfx.fillCircle(x, y, dotRadius);
      // Subtle ring
      gfx.lineStyle(1, color, 0.3);
      gfx.strokeCircle(x, y, dotRadius + 1);

      // Pulsing animation for active members
      if (member.active) {
        const pulseCircle = this.add.circle(x, y, dotRadius + 2, color, 0.3);
        pulseCircle.setDepth(2);
        const tween = this.tweens.add({
          targets: pulseCircle,
          scaleX: 1.6,
          scaleY: 1.6,
          alpha: 0,
          duration: 1200,
          repeat: -1,
          ease: "Sine.easeOut",
        });
        tweens.push(tween);
      }
    });

    this.podPreviewTweens.set(squadId, tweens);
  }

  /** Fetch squad details from API and render member previews */
  async fetchAndRenderPreviews() {
    for (const pod of this.pods) {
      try {
        const res = await fetch(`${SERVER_URL}/api/building/squads/${pod.squadId}`);
        if (!res.ok) continue;
        const data = await res.json();
        const members: PodMember[] = (data.members ?? []).map((m: any) => ({
          name: m.name || "Agent",
          role: m.role || "",
          active: m.active ?? m.status === "working",
        }));
        if (members.length > 0) {
          const center = this.podCenters.get(pod.squadId);
          if (center) {
            this.renderPodMembers(pod.squadId, center.cx, center.cy, members);
          }
        }
      } catch {
        // API not available yet — previews will render from default data
      }
    }
  }
}
