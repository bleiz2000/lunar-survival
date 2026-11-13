import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UI } from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';
import { Panel } from './Panel.js';

const CARD_WIDTH = 560;
const CARD_HEIGHT = 286;
const ROW_HEIGHT = 56;

/** Cargo view: plain list of item id / name / quantity straight from the system. */
export class InventoryPanel {
  constructor(scene, initialItems = []) {
    this.scene = scene;
    this.items = initialItems;
    this.isOpen = false;
    this.container = null;
    this.rows = null;

    this.onInventoryChanged = ({ items }) => {
      this.items = items;
      if (this.isOpen) this.renderRows();
    };

    bus.on(EVENTS.INVENTORY_CHANGED, this.onInventoryChanged);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    const scene = this.scene;
    const container = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(850);

    const dim = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x04070d, 0.5)
      .setInteractive();

    const panel = new Panel(scene, 0, 0, CARD_WIDTH, CARD_HEIGHT, {
      fill: UI.panel,
      alpha: 0.97,
      radius: 12
    });

    const title = scene.add.text(-250, -120, 'CARGO', {
      fontFamily: UI.font,
      fontSize: '17px',
      color: UI.textBright,
      letterSpacing: 3
    });

    const hint = scene.add.text(250, -114, 'TAB / ESC — CLOSE', {
      fontFamily: UI.mono,
      fontSize: '9px',
      color: UI.faint,
      letterSpacing: 1
    }).setOrigin(1, 0);

    const divider = scene.add.rectangle(0, -92, CARD_WIDTH - 60, 1, UI.borderSoft, 0.9);

    const footer = scene.add.text(0, 120, 'Recovered salvage is stored in the lander cargo bay.', {
      fontFamily: UI.font,
      fontSize: '10px',
      color: UI.faint
    }).setOrigin(0.5);

    this.rows = scene.add.container(0, 0);

    container.add([dim, panel, title, hint, divider, this.rows, footer]);
    this.container = container;

    container.setAlpha(0);
    container.setScale(0.985);
    scene.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Quad.easeOut'
    });

    this.renderRows();
  }

  renderRows() {
    if (!this.rows) return;

    this.rows.removeAll(true);

    if (this.items.length === 0) {
      this.rows.add(this.scene.add.text(0, -16, 'Cargo bay empty', {
        fontFamily: UI.font,
        fontSize: '14px',
        color: UI.muted,
        letterSpacing: 1
      }).setOrigin(0.5));

      this.rows.add(this.scene.add.text(0, 2, 'Search the supply containers around the lander.', {
        fontFamily: UI.font,
        fontSize: '11px',
        color: UI.faint
      }).setOrigin(0.5));

      return;
    }

    this.items.slice(0, 3).forEach((item, index) => {
      const y = -62 + index * ROW_HEIGHT;

      if (item.icon) {
        this.rows.add(
          this.scene.add.image(-246, y, item.icon)
            .setDisplaySize(26, 26)
            .setTint(UI.accentHex)
        );
      }

      this.rows.add(this.scene.add.text(-214, y - 10, item.name, {
        fontFamily: UI.font,
        fontSize: '13px',
        color: UI.textBright
      }));

      this.rows.add(this.scene.add.text(-214, y + 8, item.description, {
        fontFamily: UI.font,
        fontSize: '9px',
        color: UI.faint,
        wordWrap: { width: 380 }
      }));

      this.rows.add(this.scene.add.text(250, y, `×${item.quantity}`, {
        fontFamily: UI.mono,
        fontSize: '16px',
        color: UI.accent
      }).setOrigin(1, 0.5));

      this.rows.add(this.scene.add.rectangle(0, y + 26, CARD_WIDTH - 80, 1, UI.borderSoft, 0.55));
    });
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    const container = this.container;
    this.container = null;
    this.rows = null;

    if (!container) return;

    this.scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 120,
      onComplete: () => container.destroy()
    });
  }

  destroy() {
    bus.off(EVENTS.INVENTORY_CHANGED, this.onInventoryChanged);
    this.container?.destroy();
    this.container = null;
  }
}
