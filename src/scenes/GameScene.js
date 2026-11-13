import Phaser from 'phaser';
import {
  SCENE_GAME,
  SCENE_UI,
  SCENE_MAIN_MENU,
  GAME_BACKGROUND,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  RADIO_REPAIR_COST,
  UI
} from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';
import { createInitialState } from '../game/state.js';
import { WorldMap } from '../world/WorldMap.js';
import { Outpost } from '../world/Outpost.js';
import { CameraController } from '../world/CameraController.js';
import { Astronaut } from '../entities/Astronaut.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';

const EARTH_TRANSMISSION = {
  title: 'Incoming transmission',
  sender: 'MISSION CONTROL · EARTH',
  body: 'MARE INSULAE, we read you. The array is holding at 61% signal.\n\n'
    + 'Good work, Commander. The rescue window opens in 24 days — keep the outpost '
    + 'alive until then. Power, water and shelter, in that order.\n\n'
    + 'Stay warm. Mission Control out.',
  signature: '— MISSION CONTROL'
};

/**
 * Composition root for the playable slice: builds the world, the outpost,
 * the player and all gameplay systems, then hands presentation to UIScene.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_GAME);
  }

  create() {
    this.cameras.main.setBackgroundColor(GAME_BACKGROUND);

    this.state = createInitialState();
    this.inventory = new InventorySystem(bus);
    this.quest = new QuestSystem(this.state, this.inventory, bus);

    this.worldMap = new WorldMap(this);
    this.worldMap.create();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const spawn = this.worldMap.getSpawnPoint();
    this.astronaut = new Astronaut(this, spawn.x, spawn.y);

    this.movementSystem = new MovementSystem(this, this.astronaut);
    this.physics.add.collider(this.astronaut.sprite, this.worldMap.solids);

    this.outpost = new Outpost(this, this.worldMap.getLanderPoint(), {
      onSearchCrate: (crate) => this.searchCrate(crate),
      onRepairRadio: (radio) => this.repairRadio(radio)
    });
    this.physics.add.collider(this.astronaut.sprite, this.outpost.solids);

    this.interactionSystem = new InteractionSystem(
      this,
      this.astronaut,
      this.outpost.interactables,
      bus
    );

    this.cameraController = new CameraController(
      this,
      this.astronaut,
      WORLD_WIDTH,
      WORLD_HEIGHT
    );
    this.cameraController.start();

    this.createEffects();

    this.quest.start();
    this.scene.launch(SCENE_UI, {
      state: this.state,
      objective: this.quest.getObjective(),
      inventory: this.inventory.snapshot()
    });

    this.bindEvents();

    this.cameras.main.fadeIn(520, 6, 8, 14);
    this.time.delayedCall(900, () => {
      bus.emit(EVENTS.TOAST, {
        text: 'Emergency landing logged — Day 1',
        tone: 'info'
      });
    });
  }

  bindEvents() {
    this.onMenuRequest = () => this.exitToMenu();
    this.onModal = ({ open }) => {
      this.movementSystem.setEnabled(!open);
      this.interactionSystem.setEnabled(!open);
    };

    bus.on(EVENTS.MENU_REQUEST, this.onMenuRequest);
    bus.on(EVENTS.MODAL, this.onModal);

    this.events.once('shutdown', this.shutdown, this);
  }

  createEffects() {
    this.pickupFx = this.add.particles(0, 0, 'dust-puff', {
      lifespan: 520,
      speed: { min: 30, max: 90 },
      scale: { start: 0.32, end: 0.02 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xf2b36a, 0xf7d9ae],
      quantity: 10,
      emitting: false
    }).setDepth(12);

    this.repairFx = this.add.particles(0, 0, 'dust-puff', {
      lifespan: 720,
      speed: { min: 40, max: 130 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0x8fe3c0, 0xd8fff0],
      quantity: 18,
      emitting: false
    }).setDepth(12);
  }

  searchCrate(crate) {
    if (!crate.open()) {
      bus.emit(EVENTS.TOAST, { text: 'Container is already empty', tone: 'warning' });
      return;
    }

    this.inventory.add('chip', 1);

    bus.emit(EVENTS.TOAST, {
      text: '+1 Electronic Component',
      icon: 'icon-chip',
      tone: 'success'
    });

    this.pickupFx.explode(10, crate.x, crate.y);
    this.floatText(crate.x, crate.y - 18, '+1 COMPONENT', UI.accent);
    this.cameras.main.shake(90, 0.0012);
  }

  repairRadio(radio) {
    if (radio.repaired) return;

    const { itemId, qty } = RADIO_REPAIR_COST;
    const available = this.inventory.count(itemId);

    if (available < qty) {
      bus.emit(EVENTS.TOAST, {
        text: `Need ${qty} components — ${available}/${qty} recovered`,
        icon: 'icon-warning',
        tone: 'warning'
      });

      this.floatText(radio.x, radio.y - 42, `MISSING ${qty - available}`, UI.danger);
      this.cameras.main.shake(120, 0.002);
      return;
    }

    // Mark the quest repaired first so the inventory event cannot rewind it.
    this.quest.repairRadio(() => this.inventory.remove(itemId, qty));
    this.outpost.repairRadio();

    this.repairFx.explode(18, radio.x, radio.y - 8);
    this.floatText(radio.x, radio.y - 46, 'SIGNAL ONLINE', UI.success);

    bus.emit(EVENTS.TOAST, {
      text: 'Communications restored',
      icon: 'icon-check',
      tone: 'success'
    });

    this.cameras.main.flash(220, 143, 227, 192);

    this.time.delayedCall(1100, () => {
      bus.emit(EVENTS.TRANSMISSION, EARTH_TRANSMISSION);
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
    bus.off(EVENTS.MODAL, this.onModal);

    this.interactionSystem?.destroy();
    this.quest?.destroy();

    if (this.scene.isActive(SCENE_UI)) {
      this.scene.stop(SCENE_UI);
    }
  }

  update(time, delta) {
    this.movementSystem.update(delta);
    this.interactionSystem.update();
    this.astronaut.update(delta);
  }
}
