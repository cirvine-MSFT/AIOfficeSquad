import Phaser from "phaser";

export type AgentView = {
  agentId: string;
  name?: string;
  status?: string;
  summary?: string;
  squadBadge?: string;
  squadScope?: string;
  desk?: { x: number; y: number };
  position?: { x: number; y: number };
};

export type ProximityHandler = (agentId: string | null) => void;

export type RoomChatHandler = (squadId: string, text: string) => void;

export class PodScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: { [key: string]: Phaser.Input.Keyboard.Key };
  private shiftKey?: Phaser.Input.Keyboard.Key;
  private defaultDesks = new Map<string, { x: number; y: number; flip?: boolean }>();
  private npcSprites = new Map<string, Phaser.GameObjects.Image>();
  private npcLabels = new Map<string, Phaser.GameObjects.Text>();
  private npcStatus = new Map<string, Phaser.GameObjects.Text>();
  private npcBadges = new Map<string, Phaser.GameObjects.Text>();
  private npcSummaryTexts = new Map<string, Phaser.GameObjects.Text>();
  private statusPulseTweens = new Map<string, Phaser.Tweens.Tween>();
  private typingIndicators = new Map<
    string,
    { container: Phaser.GameObjects.Container; dots: Phaser.GameObjects.Arc[] }
  >();
  private proximityHandler?: ProximityHandler;
  private activeNearby: string | null = null;
  private selectedAgentId: string | null = null;
  private selectionRing?: Phaser.GameObjects.Graphics;
  private isReady = false;
  private pendingAgents: AgentView[] | null = null;
  private agentSpriteKeys = ["person-boy-a", "person-boy-b", "person-boy-c", "person-girl-d", "person-girl-e"];
  private agentSpriteById = new Map<string, string>();
  private usedSpriteKeys = new Set<string>();
  private assignedDesks = new Map<string, { x: number; y: number; flip?: boolean }>();
  private agentMeta = new Map<string, { status?: string; summary?: string }>();
  private typingJitterEnabled = true;
  private typingJitter = new Map<
    string,
    {
      baseX: number;
      baseY: number;
      offsetX: number;
      offsetY: number;
      nextAt: number;
    }
  >();
  private fallbackDesks = [
    { x: 195, y: 617 },
    { x: 189, y: 738 },
    { x: 194, y: 860 },
    { x: 645, y: 618 },
    { x: 650, y: 743 },
    { x: 373, y: 624, flip: true },
    { x: 373, y: 738, flip: true },
    { x: 365, y: 866, flip: true },
    { x: 817, y: 618, flip: true },
    { x: 821, y: 742, flip: true }
  ] as Array<{ x: number; y: number; flip?: boolean }>;
  private desiredPlayerHeight = 120;
  private desiredAgentHeight = 68;
  private inputLocked = false;
  private clockText!: Phaser.GameObjects.Text;

  // Ceremony state
  private ceremonyActive = false;
  private ceremonyParticipants: string[] = [];
  private ceremonyLabel?: Phaser.GameObjects.Text;
  private conferenceSeats = [
    { x: 370, y: 200 }, { x: 420, y: 200 }, { x: 470, y: 200 },
    { x: 370, y: 260 }, { x: 420, y: 260 }, { x: 470, y: 260 },
  ];

  // Pod/squad context
  squadId: string = "";
  squadName: string = "";
  private hasBuilding = false;
  private exitZone?: Phaser.GameObjects.Zone;
  private exitPrompt?: Phaser.GameObjects.Text;
  private roomChatHandler?: RoomChatHandler;
  onAgentClick?: (agentId: string) => void;

  constructor() {
    super("PodScene");
  }

  init(data?: { squadId?: string; squadName?: string; hasBuilding?: boolean }) {
    this.squadId = data?.squadId ?? "";
    this.squadName = data?.squadName ?? "";
    this.hasBuilding = data?.hasBuilding ?? false;
  }

  preload() {
    this.load.tilemapTiledJSON("office", "/maps/office.json");
    this.load.image("floor-tile", "/tilesets/pixel-office/floor-tile.png");
    this.load.image("office-assets", "/tilesets/pixel-office/PixelOfficeAssets.png");
    this.load.image("office-bg", "/tilesets/no-people.png");
    this.load.image("agent", "/sprites/agent.svg");
    this.load.spritesheet("boss", "/sprites/bossAllPoses.cleaned.png", {
      frameWidth: 186,
      frameHeight: 529
    });
    this.load.image("person-boy-a", "/sprites/people/BoyA.png");
    this.load.image("person-boy-b", "/sprites/people/Boyb.png");
    this.load.image("person-boy-c", "/sprites/people/Boyc.png");
    this.load.image("person-girl-d", "/sprites/people/GirlD.png");
    this.load.image("person-girl-e", "/sprites/people/Girle.png");
  }

  create() {
    const map = this.make.tilemap({ key: "office" });
    const floorTiles = map.addTilesetImage("floor-tile", "floor-tile");
    const officeTiles = map.addTilesetImage("office-assets", "office-assets");
    const floor = map.createLayer("Floor", floorTiles, 0, 0);
    const furniture = map.createLayer("Furniture", officeTiles, 0, 0);
    const walls = map.createLayer("Walls", floorTiles, 0, 0);
    walls.setCollision([1]);
    floor.setAlpha(0);
    furniture?.setAlpha(0);
    walls.setAlpha(0);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const bg = this.add.image(0, 0, "office-bg");
    bg.setOrigin(0, 0);
    bg.setDepth(-5);
    bg.displayWidth = map.widthInPixels;
    bg.displayHeight = map.heightInPixels;

    // Real-time clock overlay (positioned over the static "12:00" in the background)
    const scaleX = map.widthInPixels / 1024;
    const scaleY = map.heightInPixels / 904;
    // Cover the entire LCD area with a dark rectangle first
    const lcdX = 472 * scaleX;
    const lcdY = 297 * scaleY;
    const lcdW = (547 - 472) * scaleX;
    const lcdH = (317 - 297) * scaleY;
    const lcdCover = this.add.rectangle(
      lcdX + lcdW / 2, lcdY + lcdH / 2, lcdW, lcdH, 0x1a1a2e
    );
    lcdCover.setDepth(-4);
    this.clockText = this.add.text(510 * scaleX, 308 * scaleY, "", {
      fontFamily: '"Courier New", monospace',
      fontSize: "18px",
      color: "#e05555",
      fontStyle: "bold",
    });
    this.clockText.setOrigin(0.5, 0.5);
    this.clockText.setDepth(-3);

    // Conference area (upper portion of office)
    const confBg = this.add.rectangle(425, 230, 160, 110, 0x3a3d44);
    confBg.setStrokeStyle(1, 0x4a4d55);
    confBg.setDepth(0);
    const confLabel = this.add.text(425, 168, "Conference", {
      fontSize: "9px",
      color: "#6a6d75",
    });
    confLabel.setOrigin(0.5, 0.5);
    confLabel.setDepth(0);

    const npcLayer = map.getObjectLayer("NPCs");
    if (npcLayer) {
      for (const obj of npcLayer.objects) {
        if (!obj.name) continue;
        const x = (obj.x ?? 0) + 8;
        const y = (obj.y ?? 0) + 8;
        this.defaultDesks.set(obj.name, { x, y });
      }
    }
    if (this.defaultDesks.size === 0) {
      // Fallback desks aligned to the background scene
      this.fallbackDesks.forEach((desk, idx) => {
        this.defaultDesks.set(`desk-${idx}`, desk);
      });
    }

    if (!this.anims.exists("boss-walk-side")) {
      this.anims.create({
        key: "boss-walk-side",
        frames: this.anims.generateFrameNumbers("boss", { start: 2, end: 3 }),
        frameRate: 6,
        repeat: -1
      });
      this.anims.create({
        key: "boss-walk-front",
        frames: this.anims.generateFrameNumbers("boss", { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1
      });
      this.anims.create({
        key: "boss-idle",
        frames: [{ key: "boss", frame: 0 }],
        frameRate: 1,
        repeat: -1
      });
    }

    const player = this.physics.add.sprite(513, 484, "boss", 0);
    player.setDepth(5);
    player.setCollideWorldBounds(true);
    const scale = this.desiredPlayerHeight / 529;
    player.setScale(scale);
    player.setOrigin(0.5, 1);
    player.setSize(10, 12);
    player.setOffset(3, 2);
    this.player = player;
    this.physics.add.collider(player, walls);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasdKeys = this.input.keyboard?.addKeys("W,A,S,D") as {
      [key: string]: Phaser.Input.Keyboard.Key;
    };
    this.shiftKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(player, true, 0.08, 0.08);
    this.cameras.main.setZoom(2);
    this.cameras.main.roundPixels = true;

    floor.setDepth(0);
    furniture?.setDepth(1);
    walls.setDepth(2);
    this.isReady = true;
    if (this.pendingAgents) {
      this.syncAgents(this.pendingAgents);
      this.pendingAgents = null;
    }

    this.input.keyboard?.on("keydown-SPACE", () => {
      this.inputLocked = false;
    });

    // Exit zone: bottom of map, allows returning to BuildingScene
    if (this.hasBuilding) {
      const exitY = map.heightInPixels - 20;
      this.exitZone = this.add.zone(map.widthInPixels / 2, exitY, map.widthInPixels, 40);
      this.physics.world.enable(this.exitZone);
      (this.exitZone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      (this.exitZone.body as Phaser.Physics.Arcade.Body).setImmovable(true);

      this.exitPrompt = this.add.text(map.widthInPixels / 2, exitY - 30, "↓ Exit to Building (Esc)", {
        fontSize: "10px",
        color: "#d9a441",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5, 0.5).setDepth(10).setScrollFactor(1);

      this.input.keyboard?.on("keydown-ESC", () => {
        if (!this.inputLocked) {
          this.returnToBuilding();
        }
      });
    }
  }

  private returnToBuilding() {
    if (this.hasBuilding) {
      this.scene.start("BuildingScene");
    }
  }

  setRoomChatHandler(handler: RoomChatHandler) {
    this.roomChatHandler = handler;
  }

  emitRoomChat(text: string) {
    if (this.roomChatHandler && this.squadId) {
      this.roomChatHandler(this.squadId, text);
    }
  }

  setProximityHandler(handler: ProximityHandler) {
    this.proximityHandler = handler;
  }

  lockInput(locked: boolean) {
    this.inputLocked = locked;
    if (this.input.keyboard) {
      this.input.keyboard.enabled = !locked;
      // Reset all keys to prevent stuck keys when toggling input lock
      this.input.keyboard.resetKeys();
    }
  }

  setTypingJitterEnabled(enabled: boolean) {
    this.typingJitterEnabled = enabled;
  }

  setSelectedAgent(agentId: string | null) {
    this.selectedAgentId = agentId;
    // Clean up previous indicator
    if (this.selectionRing) {
      this.selectionRing.destroy();
      this.selectionRing = undefined;
    }
    for (const [id, sprite] of this.npcSprites) {
      if (id === agentId) {
        sprite.setTint(0xffd166);
        // Create a small downward-pointing triangle above the agent
        const gfx = this.add.graphics();
        gfx.setDepth(10);
        this.selectionRing = gfx;
      } else {
        sprite.clearTint();
      }
    }
  }

  syncAgents(agents: AgentView[]) {
    if (!this.isReady) {
      this.pendingAgents = agents;
      return;
    }
    const taken = new Set<string>();
    agents.forEach((agent, index) => {
      const assignedDesk = this.assignDesk(agent, index);
      // Desk-anchored spawn: prefer assigned desk regardless of agent.position
      const pos = assignedDesk ?? agent.desk ?? agent.position ?? { x: 64 + index * 18, y: 64 };
      let sprite = this.npcSprites.get(agent.agentId);
      if (!sprite) {
        let spriteKey = this.agentSpriteById.get(agent.agentId);
        if (!spriteKey) {
          // Cycle through all sprites before repeating
          const availableKeys = this.agentSpriteKeys.filter(k => !this.usedSpriteKeys.has(k));
          if (availableKeys.length === 0) {
            // All sprites used, reset and start over
            this.usedSpriteKeys.clear();
            spriteKey = this.agentSpriteKeys[Math.floor(Math.random() * this.agentSpriteKeys.length)];
          } else {
            // Pick randomly from unused sprites
            spriteKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
          }
          this.usedSpriteKeys.add(spriteKey);
          this.agentSpriteById.set(agent.agentId, spriteKey);
        }
        sprite = this.add.image(pos.x, pos.y, spriteKey);
        const spriteTexture = this.textures.get(spriteKey);
        const spriteSource = spriteTexture.getSourceImage() as HTMLImageElement;
        if (spriteSource?.height) {
          const scale = this.desiredAgentHeight / spriteSource.height;
          sprite.setScale(scale);
        }
        sprite.setOrigin(0.5, 1);
        if (assignedDesk?.flip) {
          sprite.setFlipX(true);
        }
        sprite.setDepth(4);
        this.npcSprites.set(agent.agentId, sprite);
        const labelText = (agent.name ?? agent.agentId).slice(0, 14);
        const label = this.add.text(pos.x, pos.y - 30, labelText, {
          fontSize: "10px",
          color: "#f1eee6"
        });
        label.setBackgroundColor("rgba(0,0,0,0.6)");
        label.setPadding(3, 2, 3, 2);
        label.setStroke("#000000", 2);
        label.setOrigin(0.5, 1);
        label.setDepth(5);
        this.npcLabels.set(agent.agentId, label);

        const status = this.add.text(pos.x, pos.y - 44, "", {
          fontSize: "9px",
          color: "#d9a441"
        });
        status.setBackgroundColor("rgba(0,0,0,0.5)");
        status.setPadding(3, 2, 3, 2);
        status.setStroke("#000000", 2);
        status.setOrigin(0.5, 1);
        status.setDepth(5);
        this.npcStatus.set(agent.agentId, status);

        // Task summary text above status (spaced to avoid overlap)
        const summaryText = this.add.text(pos.x, pos.y - 56, "", {
          fontSize: "8px",
          color: "#888888"
        });
        summaryText.setBackgroundColor("rgba(0,0,0,0.4)");
        summaryText.setPadding(2, 1, 2, 1);
        summaryText.setStroke("#000000", 1);
        summaryText.setOrigin(0.5, 1);
        summaryText.setDepth(5);
        this.npcSummaryTexts.set(agent.agentId, summaryText);

        // Make NPC sprite clickable for instant selection (#19)
        sprite.setInteractive({ useHandCursor: true });
        sprite.on("pointerdown", () => {
          if (this.onAgentClick) this.onAgentClick(agent.agentId);
        });
      }
      if (!this.typingIndicators.has(agent.agentId)) {
        const dot1 = this.add.circle(0, 0, 2, 0xffffff);
        const dot2 = this.add.circle(6, 0, 2, 0xffffff);
        const dot3 = this.add.circle(12, 0, 2, 0xffffff);
        const container = this.add.container(pos.x, pos.y - 10, [dot1, dot2, dot3]);
        container.setDepth(6);
        container.setVisible(false);
        this.typingIndicators.set(agent.agentId, { container, dots: [dot1, dot2, dot3] });
      }
      sprite.setPosition(pos.x, pos.y);
      const label = this.npcLabels.get(agent.agentId);
      if (label) {
        const offset = sprite ? sprite.displayHeight + 4 : 22;
        label.setPosition(pos.x, pos.y - offset);
        label.setText((agent.name ?? agent.agentId).slice(0, 14));
      }
      const status = this.npcStatus.get(agent.agentId);
      if (status) {
        const statusText = agent.status || "";
        status.setText(statusText);
        const statusColor = this.getStatusColor(agent.status);
        status.setColor(statusColor);
        const statusBg = this.getStatusBgColor(agent.status);
        status.setBackgroundColor(statusBg);
        const offset = (sprite ? sprite.displayHeight + 30 : 48);
        status.setPosition(pos.x, pos.y - offset);

        // Pulsing animation for "thinking" status
        const existingTween = this.statusPulseTweens.get(agent.agentId);
        if (agent.status === "thinking") {
          if (!existingTween || !existingTween.isPlaying()) {
            existingTween?.destroy();
            const tween = this.tweens.add({
              targets: status,
              alpha: { from: 1, to: 0.4 },
              duration: 800,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut"
            });
            this.statusPulseTweens.set(agent.agentId, tween);
          }
        } else {
          if (existingTween) {
            existingTween.destroy();
            this.statusPulseTweens.delete(agent.agentId);
            status.setAlpha(1);
          }
        }
      }

      // Role badge emoji above status label (spaced to avoid overlap)
      const badgeEmoji = agent.squadBadge;
      let badge = this.npcBadges.get(agent.agentId);
      if (badgeEmoji) {
        if (!badge) {
          badge = this.add.text(pos.x, pos.y - 50, badgeEmoji, {
            fontSize: "12px",
          });
          badge.setOrigin(0.5, 1);
          badge.setDepth(5);
          this.npcBadges.set(agent.agentId, badge);
        }
        badge.setText(badgeEmoji);
        const badgeOffset = (sprite ? sprite.displayHeight + 44 : 62);
        badge.setPosition(pos.x, pos.y - badgeOffset);
      } else if (badge) {
        badge.setText("");
      }

      // Task summary text above name label (spaced to avoid overlap)
      const summaryTextObj = this.npcSummaryTexts.get(agent.agentId);
      if (summaryTextObj) {
        const scope = agent.squadScope || agent.summary || "";
        const trimmedScope = scope.length > 28 ? `${scope.slice(0, 28)}…` : scope;
        summaryTextObj.setText(trimmedScope);
        const summaryOffset = (sprite ? sprite.displayHeight + 18 : 36);
        summaryTextObj.setPosition(pos.x, pos.y - summaryOffset);
      }
      const typing = this.typingIndicators.get(agent.agentId);
      if (typing) {
        const offset = sprite ? sprite.displayHeight - 6 : 14;
        typing.container.setPosition(pos.x - 6, pos.y - offset);
      }
      const jitter = this.typingJitter.get(agent.agentId) ?? {
        baseX: pos.x,
        baseY: pos.y,
        offsetX: 0,
        offsetY: 0,
        nextAt: 0
      };
      jitter.baseX = pos.x;
      jitter.baseY = pos.y;
      this.typingJitter.set(agent.agentId, jitter);
      this.agentMeta.set(agent.agentId, { status: agent.status, summary: agent.summary });
      taken.add(agent.agentId);
    });

    for (const [id, sprite] of this.npcSprites) {
      if (!taken.has(id)) {
        sprite.destroy();
        this.npcSprites.delete(id);
        // Release sprite key back to pool
        const spriteKey = this.agentSpriteById.get(id);
        if (spriteKey) {
          this.usedSpriteKeys.delete(spriteKey);
        }
        this.agentSpriteById.delete(id);
        this.agentMeta.delete(id);
        this.assignedDesks.delete(id);
        this.typingJitter.delete(id);
        const typing = this.typingIndicators.get(id);
        typing?.container.destroy(true);
        this.typingIndicators.delete(id);
        this.npcLabels.get(id)?.destroy();
        this.npcLabels.delete(id);
        this.npcStatus.get(id)?.destroy();
        this.npcStatus.delete(id);
        this.npcBadges.get(id)?.destroy();
        this.npcBadges.delete(id);
        this.npcSummaryTexts.get(id)?.destroy();
        this.npcSummaryTexts.delete(id);
        const pulseTween = this.statusPulseTweens.get(id);
        if (pulseTween) { pulseTween.destroy(); this.statusPulseTweens.delete(id); }
      }
    }
  }

  update() {
    // Update clock every frame (text change is cheap; only redraws when string changes)
    const now = new Date();
    let h = now.getHours() % 12;
    if (h === 0) h = 12;
    const m = now.getMinutes().toString().padStart(2, "0");
    const timeStr = `${h}:${m}`;
    if (this.clockText && this.clockText.text !== timeStr) {
      this.clockText.setText(timeStr);
    }

    if (!this.player) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.inputLocked) {
      body.setVelocity(0);
      this.updatePlayerAnimation(body);
      this.updateTypingIndicators();
      return;
    }
    if (!this.cursors || !this.wasdKeys) return;
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
    this.checkProximity();
    this.checkExitProximity();
    this.updateTypingIndicators();
  }

  private assignDesk(agent: AgentView, index: number) {
    const existing = this.assignedDesks.get(agent.agentId);
    if (existing) return existing;
    const namedDesk = this.defaultDesks.get(agent.agentId);
    if (namedDesk) {
      this.assignedDesks.set(agent.agentId, namedDesk);
      return namedDesk;
    }
    const used = new Set(
      Array.from(this.assignedDesks.values()).map((desk) => `${desk.x},${desk.y}`)
    );
    const available = this.fallbackDesks.find((desk) => !used.has(`${desk.x},${desk.y}`));
    const chosen =
      available ?? this.fallbackDesks[index % this.fallbackDesks.length];
    this.assignedDesks.set(agent.agentId, chosen);
    return chosen;
  }

  private updateTypingIndicators() {
    const now = this.time.now;
    const phase = Math.floor(now / 200) % 3;
    for (const [id, typing] of this.typingIndicators) {
      const meta = this.agentMeta.get(id);
      const sprite = this.npcSprites.get(id);
      let jitter = this.typingJitter.get(id);
      if (!jitter) {
        jitter = {
          baseX: sprite?.x ?? 0,
          baseY: sprite?.y ?? 0,
          offsetX: 0,
          offsetY: 0,
          nextAt: now + Phaser.Math.Between(200, 600)
        };
        this.typingJitter.set(id, jitter);
      }

      if (!meta || (meta.status !== "working" && meta.status !== "thinking") || !this.typingJitterEnabled) {
        typing.container.setVisible(false);
        if (sprite) {
          // Clear thinking tint (but preserve selected tint)
          if (id !== this.selectedAgentId) sprite.clearTint();
          jitter.offsetX = 0;
          jitter.offsetY = 0;
          jitter.nextAt = now + Phaser.Math.Between(200, 600);
          sprite.setPosition(jitter.baseX, jitter.baseY);
        }
        continue;
      }
      typing.container.setVisible(true);
      typing.dots.forEach((dot, idx) => {
        dot.setAlpha(idx === phase ? 1 : 0.3);
      });

      if (sprite && now >= jitter.nextAt) {
        if (jitter.offsetX !== 0 || jitter.offsetY !== 0) {
          jitter.offsetX = 0;
          jitter.offsetY = 0;
          jitter.nextAt = now + Phaser.Math.Between(220, 520);
        } else {
          const horizontal = Math.random() < 0.7;
          const dir = Math.random() < 0.5 ? -1 : 1;
          jitter.offsetX = horizontal ? dir : 0;
          jitter.offsetY = horizontal ? 0 : dir;
          jitter.nextAt = now + Phaser.Math.Between(70, 140);
        }
      }
      if (sprite) {
        sprite.setPosition(jitter.baseX + jitter.offsetX, jitter.baseY + jitter.offsetY);
      }
    }

    // Update selection arrow — bouncing triangle above selected agent
    if (this.selectionRing && this.selectedAgentId) {
      const sprite = this.npcSprites.get(this.selectedAgentId);
      if (sprite) {
        const bounce = Math.sin(now / 250) * 3;
        const x = sprite.x;
        const y = sprite.y - sprite.displayHeight - 28 + bounce;
        this.selectionRing.clear();
        this.selectionRing.fillStyle(0xffd166, 1);
        this.selectionRing.fillTriangle(x - 5, y, x + 5, y, x, y + 6);
      }
    }
  }

  private updatePlayerAnimation(body: Phaser.Physics.Arcade.Body) {
    if (!this.player) return;
    const moving = Math.abs(body.velocity.x) > 1 || Math.abs(body.velocity.y) > 1;
    if (moving) {
      if (Math.abs(body.velocity.x) >= Math.abs(body.velocity.y)) {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== "boss-walk-side") {
          this.player.anims.play("boss-walk-side", true);
        }
        if (body.velocity.x < -1) {
          this.player.setFlipX(true);
        } else if (body.velocity.x > 1) {
          this.player.setFlipX(false);
        }
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

  private checkProximity() {
    if (!this.player) return;
    let nearest: { id: string; dist: number } | null = null;
    for (const [id, sprite] of this.npcSprites) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
      const threshold = Math.max(
        40,
        (this.player.displayHeight + sprite.displayHeight) * 0.5
      );
      if (dist < threshold && (!nearest || dist < nearest.dist)) {
        nearest = { id, dist };
      }
    }
    const nextId = nearest?.id ?? null;
    if (nextId !== this.activeNearby) {
      this.activeNearby = nextId;
      if (this.proximityHandler) this.proximityHandler(nextId);
    }
  }

  private checkExitProximity() {
    if (!this.player || !this.exitZone || !this.hasBuilding) return;
    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.exitZone.x, this.exitZone.y
    );
    if (dist < 60) {
      this.returnToBuilding();
    }
  }

  private getStatusColor(status?: string) {
    switch (status) {
      case "thinking":
        return "#d9a441";
      case "error":
        return "#e05d5d";
      case "replied":
        return "#4fb0ff";
      case "available":
        return "#60d394";
      default:
        return "#f1eee6";
    }
  }

  private getStatusBgColor(status?: string) {
    switch (status) {
      case "available":
        return "rgba(96,211,148,0.25)";
      case "thinking":
        return "rgba(217,164,65,0.25)";
      case "replied":
        return "rgba(79,176,255,0.25)";
      case "error":
        return "rgba(224,93,93,0.25)";
      default:
        return "rgba(0,0,0,0.5)";
    }
  }

  startCeremony(participants: string[], ceremonyType?: string) {
    this.ceremonyActive = true;
    this.ceremonyParticipants = participants;

    // Show ceremony label above conference area
    if (this.ceremonyLabel) this.ceremonyLabel.destroy();
    const labelText = ceremonyType ? `📋 ${ceremonyType}` : "📋 Ceremony";
    this.ceremonyLabel = this.add.text(425, 155, labelText, {
      fontSize: "10px",
      color: "#d9a441",
      backgroundColor: "rgba(0,0,0,0.6)",
      padding: { x: 4, y: 2 },
    });
    this.ceremonyLabel.setOrigin(0.5, 0.5);
    this.ceremonyLabel.setDepth(10);

    // Move each participant to a conference seat
    participants.forEach((agentId, idx) => {
      const sprite = this.npcSprites.get(agentId);
      if (!sprite) return;
      const seat = this.conferenceSeats[idx % this.conferenceSeats.length];
      this.tweens.add({
        targets: sprite,
        x: seat.x,
        y: seat.y,
        duration: 800,
        ease: "Power2",
        onComplete: () => {
          // Face inward (flip sprites on right side)
          if (seat.x > 420) sprite.setFlipX(true);
          else sprite.setFlipX(false);
        },
      });
      // Move labels with sprite (matching updated offsets)
      const label = this.npcLabels.get(agentId);
      if (label) {
        const offset = sprite.displayHeight + 4;
        this.tweens.add({ targets: label, x: seat.x, y: seat.y - offset, duration: 800, ease: "Power2" });
      }
      const status = this.npcStatus.get(agentId);
      if (status) {
        const offset = sprite.displayHeight + 30;
        this.tweens.add({ targets: status, x: seat.x, y: seat.y - offset, duration: 800, ease: "Power2" });
      }
      const badge = this.npcBadges.get(agentId);
      if (badge) {
        const offset = sprite.displayHeight + 44;
        this.tweens.add({ targets: badge, x: seat.x, y: seat.y - offset, duration: 800, ease: "Power2" });
      }
      const summaryText = this.npcSummaryTexts.get(agentId);
      if (summaryText) {
        const offset = sprite.displayHeight + 18;
        this.tweens.add({ targets: summaryText, x: seat.x, y: seat.y - offset, duration: 800, ease: "Power2" });
      }
      const typing = this.typingIndicators.get(agentId);
      if (typing) {
        const offset = sprite.displayHeight - 6;
        this.tweens.add({ targets: typing.container, x: seat.x - 6, y: seat.y - offset, duration: 800, ease: "Power2" });
      }
    });
  }

  endCeremony() {
    this.ceremonyActive = false;

    // Remove ceremony label
    if (this.ceremonyLabel) {
      this.ceremonyLabel.destroy();
      this.ceremonyLabel = undefined;
    }

    // Tween participants back to their desks
    this.ceremonyParticipants.forEach((agentId) => {
      const sprite = this.npcSprites.get(agentId);
      const desk = this.assignedDesks.get(agentId);
      if (!sprite || !desk) return;

      this.tweens.add({
        targets: sprite,
        x: desk.x,
        y: desk.y,
        duration: 600,
        ease: "Power2",
        onComplete: () => {
          if (desk.flip) sprite.setFlipX(true);
          else sprite.setFlipX(false);
        },
      });
      const label = this.npcLabels.get(agentId);
      if (label) {
        const offset = sprite.displayHeight + 4;
        this.tweens.add({ targets: label, x: desk.x, y: desk.y - offset, duration: 600, ease: "Power2" });
      }
      const status = this.npcStatus.get(agentId);
      if (status) {
        const offset = sprite.displayHeight + 30;
        this.tweens.add({ targets: status, x: desk.x, y: desk.y - offset, duration: 600, ease: "Power2" });
      }
      const badge = this.npcBadges.get(agentId);
      if (badge) {
        const offset = sprite.displayHeight + 44;
        this.tweens.add({ targets: badge, x: desk.x, y: desk.y - offset, duration: 600, ease: "Power2" });
      }
      const summaryText = this.npcSummaryTexts.get(agentId);
      if (summaryText) {
        const offset = sprite.displayHeight + 18;
        this.tweens.add({ targets: summaryText, x: desk.x, y: desk.y - offset, duration: 600, ease: "Power2" });
      }
      const typing = this.typingIndicators.get(agentId);
      if (typing) {
        const offset = sprite.displayHeight - 6;
        this.tweens.add({ targets: typing.container, x: desk.x - 6, y: desk.y - offset, duration: 600, ease: "Power2" });
      }
    });

    this.ceremonyParticipants = [];
  }

  isCeremonyActive() {
    return this.ceremonyActive;
  }

  focusOnAgent(agentId: string) {
    const sprite = this.npcSprites.get(agentId);
    if (!sprite || !this.cameras.main) return;
    this.cameras.main.stopFollow();
    this.cameras.main.pan(sprite.x, sprite.y, 400, "Sine.easeInOut", false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1 && this.player) {
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      }
    });
  }
}

/** @deprecated Use PodScene instead */
export const OfficeScene = PodScene;
