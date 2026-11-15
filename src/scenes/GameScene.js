import Phaser from 'phaser';
import {
  ACTION_DURATION,
  SCENE_GAME,
  SCENE_UI,
  SCENE_MAIN_MENU,
  GAME_BACKGROUND,
  CAMERA_ZOOM,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  UI
} from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';
import { createInitialState } from '../game/state.js';
import { DIALOGUE, DIAGNOSTICS_DATA, TERMINAL_DATA } from '../data/dialogue.js';
import { WorldMap } from '../world/WorldMap.js';
import { Outpost } from '../world/Outpost.js';
import { CameraController } from '../world/CameraController.js';
import { Astronaut } from '../entities/Astronaut.js';
import { Rover } from '../entities/Rover.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { WorldPrompt } from '../ui/WorldPrompt.js';
import { WorldAction } from '../ui/WorldAction.js';

/**
 * Composition root for Day 1: world, outpost, player, systems; all world
 * reactions (progress bars, comms, diagnostics, terminal) are dispatched
 * from here with explicit flag checks, as the scenario requires.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_GAME);
  }

  create() {
    // Scene instances are reused across restarts (menu → intro → game), so
    // transient flags from a previous run must never outlive the create().
    this.exiting = false;

    this.cameras.main.setBackgroundColor(GAME_BACKGROUND);

    this.state = createInitialState();
    this.inventory = new InventorySystem(bus);
    this.quest = new QuestSystem(this.state, bus);

    this.worldMap = new WorldMap(this);
    this.worldMap.create();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const spawn = this.worldMap.getSpawnPoint();
    this.astronaut = new Astronaut(this, spawn.x, spawn.y);

    this.movementSystem = new MovementSystem(this, this.astronaut);
    this.physics.add.collider(this.astronaut.sprite, this.worldMap.solids);

    this.outpost = new Outpost(this, this.worldMap.getLanderPoint(), {
      onAntenna: () => this.onAntenna(),
      onPower: () => this.onPower(),
      onWindow: () => this.onWindow(),
      onEngine: () => this.onEngine(),
      onConsole: () => this.onConsole()
    });
    this.physics.add.collider(this.astronaut.sprite, this.outpost.solids);

    // The first P1 field objective lives on the north-east route.
    this.rover = new Rover(
      this,
      this.worldMap.getLanderPoint(),
      [...this.worldMap.solids, ...this.outpost.solids],
      { onInspect: () => this.onRover() }
    );
    this.physics.add.collider(this.astronaut.sprite, this.rover.solids);

    this.interactionSystem = new InteractionSystem(
      this,
      this.astronaut,
      [...this.outpost.interactables, ...this.rover.interactables],
      bus
    );

    this.cameraController = new CameraController(
      this,
      this.astronaut,
      WORLD_WIDTH,
      WORLD_HEIGHT
    );
    this.cameraController.start();

    // In-world widgets: the [E] tag and the action bar above the object.
    this.worldPrompt = new WorldPrompt(this);
    this.worldAction = new WorldAction(this);

    this.bindPromptEvents();

    this.createEffects();

    this.quest.start();
    this.refreshInteractables();

    this.scene.launch(SCENE_UI, {
      state: this.state,
      objective: this.quest.getObjective(),
      inventory: this.inventory.snapshot()
    });

    this.bindEvents();

    // Handoff from the prologue: hold the controls for a beat while the
    // black lifts and the camera settles out of its crash-framing zoom.
    const camera = this.cameras.main;
    camera.setZoom(CAMERA_ZOOM * 1.06);
    camera.zoomTo(CAMERA_ZOOM, 1300, 'Sine.easeOut');
    camera.fadeIn(900, 6, 8, 14);

    this.movementSystem.setEnabled(false);
    this.interactionSystem.setEnabled(false);
    this.time.delayedCall(480, () => {
      this.movementSystem.setEnabled(true);
      this.interactionSystem.setEnabled(true);
    });

    this.time.delayedCall(1400, () => {
      bus.emit(EVENTS.TOAST, {
        text: 'Day 1 — emergency landing confirmed',
        tone: 'info'
      });
    });
  }

  bindEvents() {
    this.onMenuRequest = () => this.exitToMenu();
    this.onModalToggle = ({ open }) => {
      this.movementSystem.setEnabled(!open);
      this.interactionSystem.setEnabled(!open);
    };
    this.onDialogueClosed = ({ id }) => this.quest.applyDialogue(id);
    this.onActionCompleted = ({ id }) => this.applyActionEnd(id);
    this.onDiagnosticsClosed = () => this.quest.applyDiagnosed();
    this.onTerminalClosed = () => this.quest.applyTerminal();
    this.onObjectiveChanged = () => this.refreshInteractables();

    bus.on(EVENTS.MENU_REQUEST, this.onMenuRequest);
    bus.on(EVENTS.MODAL, this.onModalToggle);
    bus.on(EVENTS.DIALOGUE_CLOSED, this.onDialogueClosed);
    bus.on(EVENTS.ACTION_END, this.onActionCompleted);
    bus.on(EVENTS.DIAGNOSTICS_CLOSED, this.onDiagnosticsClosed);
    bus.on(EVENTS.TERMINAL_CLOSED, this.onTerminalClosed);
    bus.on(EVENTS.OBJECTIVE_CHANGED, this.onObjectiveChanged);

    this.events.once('shutdown', this.shutdown, this);
  }

  bindPromptEvents() {
    this.onPromptShow = (payload) => this.worldPrompt.show(payload);
    this.onPromptHide = () => this.worldPrompt.hide();

    bus.on(EVENTS.PROMPT_SHOW, this.onPromptShow);
    bus.on(EVENTS.PROMPT_HIDE, this.onPromptHide);
  }

  // ── interactable gating (flags + step, checked before triggers) ──

  refreshInteractables() {
    const f = this.state.flags;
    const step = this.quest.step;
    const o = this.outpost;

    // Antenna: repair → call → call again.
    let antennaEnabled = false;
    let antennaPrompt = '';

    if (!f.isAntennaFixed) {
      antennaEnabled = true;
      antennaPrompt = 'Attach cables';
    } else if (!f.isPowerOn) {
      antennaEnabled = false;
      antennaPrompt = 'Dish ready — no power';
    } else if (!f.isComms1Done) {
      antennaEnabled = true;
      antennaPrompt = 'Call Houston';
    } else if (step === 'second-comms') {
      antennaEnabled = true;
      antennaPrompt = 'Call Houston';
    }

    o.antennaInteractable.setEnabled(antennaEnabled);
    o.antennaInteractable.setPrompt(antennaPrompt);

    // Solar hookup: exactly one window in the role.
    const powerEnabled = step === 'restore-power';
    o.powerInteractable.setEnabled(powerEnabled);
    o.powerInteractable.setPrompt(powerEnabled ? 'Hook up the array' : '');

    // Porthole: patch the leak (comms1 reported it).
    const windowEnabled = step === 'patch-leak';
    o.windowInteractable.setEnabled(windowEnabled);
    o.windowInteractable.setPrompt(windowEnabled ? 'Tape the crack' : '');

    // Engine: the diagnostics scan runs right at the bay, then the repair.
    let engineEnabled = false;
    let enginePrompt = '';

    if (step === 'engine-diagnostics') {
      engineEnabled = true;
      enginePrompt = 'Run diagnostics';
    } else if (step === 'repair-engine') {
      engineEnabled = true;
      enginePrompt = 'Repair engine';
    }

    o.engineInteractable.setEnabled(engineEnabled);
    o.engineInteractable.setPrompt(enginePrompt);

    // Service panel by the engine: only the final telemetry packet.
    const panelEnabled = step === 'check-computer';
    o.consoleInteractable.setEnabled(panelEnabled);
    o.consoleInteractable.setPrompt(panelEnabled ? 'Check the readout' : '');

    // Abandoned survey rover: inspect it, then bridge its flat battery.
    let roverPrompt = '';
    if (step === 'find-rover') roverPrompt = 'Inspect the rover';
    else if (step === 'repair-rover') roverPrompt = 'Jump-start the rover';

    this.rover.interactable.setEnabled(step === 'find-rover' || step === 'repair-rover');
    this.rover.interactable.setPrompt(roverPrompt);
  }

  // ── world reactions ─────────────────────────────────────────

  onAntenna() {
    const f = this.state.flags;

    if (!f.isAntennaFixed) {
      this.startAction('antenna', 'Attaching cables…');
      return;
    }

    if (!f.isPowerOn) {
      bus.emit(EVENTS.TOAST, {
        text: 'The dish holds, but the array has no power',
        icon: 'icon-warning',
        tone: 'warning'
      });
      return;
    }

    if (!f.isComms1Done) {
      bus.emit(EVENTS.DIALOGUE, DIALOGUE.comms1);
      return;
    }

    if (this.quest.step === 'second-comms') {
      const id = this.quest.dialComms2();
      bus.emit(EVENTS.DIALOGUE, DIALOGUE[id]);
      return;
    }

    bus.emit(EVENTS.TOAST, {
      text: 'No time to chat right now',
      tone: 'info'
    });
  }

  onPower() {
    if (!this.state.flags.isAntennaFixed) {
      bus.emit(EVENTS.TOAST, {
        text: 'The dish plugs into the array — repair it first',
        icon: 'icon-warning',
        tone: 'warning'
      });
      return;
    }

    this.startAction('power', 'Connecting power…');
  }

  onWindow() {
    if (this.state.flags.isWindowTaped) return;
    this.startAction('window', 'Taping the crack…');
  }

  onEngine() {
    const f = this.state.flags;

    // The scan runs first, straight at the bay, out in the field.
    if (this.quest.step === 'engine-diagnostics' && !f.engineDiagnosed) {
      this.startAction('engine-diagnostics', 'Running diagnostics…');
      return;
    }

    if (!f.engineDiagnosed) {
      bus.emit(EVENTS.TOAST, {
        text: 'Scan the engine bay first — know what you are fixing',
        icon: 'icon-warning',
        tone: 'warning'
      });
      return;
    }

    if (!f.isEngineFixed) {
      this.startAction('engine', 'Repairing with duct tape…');
    }
  }

  onConsole() {
    const f = this.state.flags;

    if (f.isComms2Done && !f.isCoordinatesReceived) {
      this.startAction('console-terminal', 'Uploading telemetry…');
      return;
    }

    bus.emit(EVENTS.TOAST, {
      text: 'No new alerts — systems within limits',
      tone: 'info'
    });
  }

  onRover() {
    const step = this.quest.step;

    if (step === 'find-rover') {
      this.quest.applyRoverFound();
      this.rover.scanPing();
      this.floatText(this.rover.point.x, this.rover.point.y - 96, 'SURVEY UNIT FOUND', UI.earth);
      return;
    }

    if (step === 'repair-rover') {
      this.startAction('rover-power', 'Jump-starting the rover…');
    }
  }

  /** Point above the object the player just pressed E on. */
  actionAnchor() {
    const sprite = this.interactionSystem.current?.sprite;
    if (!sprite) return null;

    return {
      x: sprite.x,
      y: sprite.y - (sprite.displayHeight || 40) * (sprite.originY ?? 0.5) - 34
    };
  }

  startAction(id, label) {
    const anchor = this.actionAnchor();
    if (!anchor) return;

    // The bar takes the [E] tag's place above the object.
    this.worldPrompt.hide();
    this.worldAction.show({
      id,
      label,
      duration: ACTION_DURATION[id],
      ...anchor
    });
  }

  // ── action resolution ───────────────────────────────────────

  applyActionEnd(id) {
    const f = this.state.flags;

    if (id === 'antenna' && !f.isAntennaFixed) {
      this.quest.applyAction('antenna');
      this.outpost.repairAntenna();

      const dish = this.outpost.antennaImage;
      this.repairFx.explode(16, dish.x, dish.y - 20);
      this.floatText(dish.x, dish.y - 46, 'LINES CONNECTED', UI.success);
    }

    if (id === 'power' && !f.isPowerOn) {
      this.quest.applyAction('power');
      this.outpost.connectPower();

      const marker = this.outpost.powerMarker;
      this.repairFx.explode(18, marker.x, marker.y);

      bus.emit(EVENTS.TOAST, {
        text: 'Solar array online',
        icon: 'icon-power',
        tone: 'success'
      });
    }

    if (id === 'window' && !f.isWindowTaped) {
      this.quest.applyAction('window');
      this.outpost.tapeWindow();

      const crack = this.outpost.crackImage;
      this.repairFx.explode(12, crack.x, crack.y);

      bus.emit(EVENTS.TOAST, {
        text: 'Oxygen leak sealed',
        icon: 'icon-o2',
        tone: 'success'
      });
    }

    if (id === 'engine' && !f.isEngineFixed) {
      this.quest.applyAction('engine');
      this.outpost.repairEngine();

      const engine = this.outpost.engineImage;
      this.repairFx.explode(22, engine.x, engine.y);

      this.floatText(engine.x, engine.y - 60, 'ENGINE STABILISED', UI.accent);

      bus.emit(EVENTS.TOAST, {
        text: 'Engine back at 50% capacity',
        icon: 'icon-engine',
        tone: 'success'
      });

      this.cameras.main.shake(140, 0.006);
    }

    // The diagnostics scan at the engine bay resolves into the fault report.
    if (id === 'engine-diagnostics' && !f.engineDiagnosed) {
      bus.emit(EVENTS.DIAGNOSTICS, DIAGNOSTICS_DATA(f));
    }

    // Same panel, later: upload the landing telemetry.
    if (id === 'console-terminal' && f.isComms2Done && !f.isCoordinatesReceived) {
      bus.emit(EVENTS.TERMINAL, TERMINAL_DATA);
    }

    // The rover's flat battery takes the jump-start.
    if (id === 'rover-power' && !f.isRoverPowered) {
      this.quest.applyAction('rover-power');
      this.rover.powerUp();

      const { x, y } = this.rover.point;
      this.repairFx.explode(20, x, y - 40);
      this.floatText(x, y - 96, 'ROVER ONLINE', UI.success);

      bus.emit(EVENTS.TOAST, {
        text: 'Survey rover online — short-range comms restored',
        icon: 'icon-check',
        tone: 'success'
      });

      this.cameras.main.shake(120, 0.004);
    }
  }

  // ── collision-floor effects, subtitles, electronics ─────────

  createEffects() {
    this.repairFx = this.add.particles(0, 0, 'dust-puff', {
      lifespan: 720,
      speed: { min: 40, max: 130 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0x8fe3c0, 0xd8fff0],
      quantity: 18,
      emitting: false
    }).setDepth(12);

    // Crash dust drifting around the wounded lander.
    this.crashDust = this.add.particles(0, 0, 'dust-puff', {
      lifespan: 1600,
      speed: { min: 8, max: 26 },
      scale: { start: 0.18, end: 0 },
      alpha: { start: 0.3, end: 0 },
      tint: [0x8fa0b8, 0x5d6b80],
      quantity: 1,
      frequency: 240,
      emitting: false
    }).setDepth(2);

    this.dustTimer = this.time.addEvent({
      delay: 240,
      loop: true,
      callback: () => {
        const lander = this.worldMap.getLanderPoint();
        this.crashDust.emitParticleAt(
          lander.x + Phaser.Math.Between(-110, 110),
          lander.y + Phaser.Math.Between(20, 150)
        );
      }
    });
  }

  floatText(x, y, text, color = UI.accent) {
    const label = this.add.text(x, y - 12, text, {
      fontFamily: UI.font,
      fontSize: '13px',
      color,
      fontStyle: 'bold',
      letterSpacing: 1
    }).setOrigin(0.5).setDepth(20);

    label.setShadow(0, 2, '#04070d', 4, false, true);

    this.tweens.add({
      targets: label,
      y: y - 54,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy()
    });
  }

  exitToMenu() {
    if (this.exiting) return;
    this.exiting = true;

    this.movementSystem.setEnabled(false);
    this.interactionSystem.setEnabled(false);

    this.cameras.main.fadeOut(220, 6, 8, 14);

    this.time.delayedCall(240, () => {
      this.scene.stop(SCENE_UI);
      this.scene.start(SCENE_MAIN_MENU);
    });
  }

  shutdown() {
    bus.off(EVENTS.MENU_REQUEST, this.onMenuRequest);
    bus.off(EVENTS.MODAL, this.onModalToggle);
    bus.off(EVENTS.DIALOGUE_CLOSED, this.onDialogueClosed);
    bus.off(EVENTS.ACTION_END, this.onActionCompleted);
    bus.off(EVENTS.DIAGNOSTICS_CLOSED, this.onDiagnosticsClosed);
    bus.off(EVENTS.TERMINAL_CLOSED, this.onTerminalClosed);
    bus.off(EVENTS.OBJECTIVE_CHANGED, this.onObjectiveChanged);
    bus.off(EVENTS.PROMPT_SHOW, this.onPromptShow);
    bus.off(EVENTS.PROMPT_HIDE, this.onPromptHide);

    this.interactionSystem?.destroy();
    this.rover?.destroy();
    this.dustTimer?.remove();
    this.worldPrompt?.destroy();
    this.worldAction?.destroy();
    this.quest = null;

    if (this.scene.isActive(SCENE_UI)) {
      this.scene.stop(SCENE_UI);
    }
  }

  update(time, delta) {
    this.movementSystem.update(delta);
    this.interactionSystem.update();
    this.worldPrompt.update();
    this.astronaut.update(delta);
    this.outpost.update(time);
  }
}
