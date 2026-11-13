import Phaser from 'phaser';
import { SCENE_UI, SCENE_GAME, GAME_WIDTH, UI } from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';
import { HUD } from '../ui/HUD.js';
import { InventoryPanel } from '../ui/InventoryPanel.js';
import { MessagePanel } from '../ui/MessagePanel.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';

/**
 * Parallel overlay scene: HUD, cargo, transmissions, debug readout.
 * Its camera never zooms or scrolls, which is what makes the interface
 * stable at any gameplay zoom level.
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super(SCENE_UI);
  }

  init(data) {
    this.state = data.state;
    this.initialObjective = data.objective ?? null;
    this.initialInventory = data.inventory ?? [];
  }

  create() {
    this.scene.bringToTop();

    this.hud = new HUD(this, this.state, this.initialObjective);
    this.inventoryPanel = new InventoryPanel(this, this.initialInventory);
    this.messages = new MessagePanel(this);
    this.debug = new DebugOverlay(this, this.scene.get(SCENE_GAME));

    this.onTransmission = (payload) => this.messages.show(payload);
    bus.on(EVENTS.TRANSMISSION, this.onTransmission);

    this.bindInput();
    this.showIntro();

    this.events.once('shutdown', () => this.cleanup());
  }

  bindInput() {
    const keyboard = this.input.keyboard;

    keyboard.addCapture(['TAB']);

    keyboard.on('keydown-TAB', () => {
      if (this.messages.isOpen) return;
      this.inventoryPanel.toggle();
    });

    keyboard.on('keydown-I', () => {
      if (this.messages.isOpen) return;
      this.inventoryPanel.toggle();
    });

    keyboard.on('keydown-ESC', () => this.handleEscape());

    for (const key of ['keydown-ENTER', 'keydown-SPACE']) {
      keyboard.on(key, () => {
        if (this.messages.isOpen) this.messages.advance();
      });
    }
  }

  handleEscape() {
    if (this.messages.isOpen) {
      this.messages.advance();
      return;
    }

    if (this.inventoryPanel.isOpen) {
      this.inventoryPanel.close();
      return;
    }

    bus.emit(EVENTS.MENU_REQUEST);
  }

  showIntro() {
    const title = this.add.text(GAME_WIDTH / 2, 236, 'MARE INSULAE', {
      fontFamily: UI.font,
      fontSize: '26px',
      color: UI.textBright,
      letterSpacing: 9
    }).setOrigin(0.5).setDepth(800).setAlpha(0);

    title.setShadow(0, 3, '#0a0e17', 12, false, true);

    const subtitle = this.add.text(GAME_WIDTH / 2, 270, 'DAY 1  ·  EMERGENCY LANDING', {
      fontFamily: UI.mono,
      fontSize: '9px',
      color: '#b9c4d6',
      backgroundColor: '#0b1120b0',
      padding: { x: 8, y: 4 },
      letterSpacing: 3
    }).setOrigin(0.5).setDepth(800).setAlpha(0);

    this.tweens.add({ targets: [title, subtitle], alpha: 1, duration: 520 });

    this.time.delayedCall(2300, () => {
      this.tweens.add({
        targets: [title, subtitle],
        alpha: 0,
        duration: 620,
        onComplete: () => {
          title.destroy();
          subtitle.destroy();
        }
      });
    });
  }

  cleanup() {
    bus.off(EVENTS.TRANSMISSION, this.onTransmission);

    this.hud?.destroy();
    this.inventoryPanel?.destroy();

    if (this.messages?.isOpen) {
      bus.emit(EVENTS.MODAL, { open: false });
    }
  }

  update() {
    this.debug.update();
  }
}
