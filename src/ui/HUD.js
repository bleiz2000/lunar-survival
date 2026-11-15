import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UI } from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';
import { Panel, panelAt } from './Panel.js';

const TOAST_BASE_Y = 516;
const TOAST_STEP = 46;
const MAX_TOASTS = 3;

const RESOURCES = [
  { key: 'oxygen', label: 'OXYGEN', icon: 'icon-o2', color: UI.o2Hex, textColor: UI.o2 },
  { key: 'food', label: 'FOOD', icon: 'icon-food', color: UI.foodHex, textColor: UI.food },
  { key: 'water', label: 'WATER', icon: 'icon-water', color: UI.waterHex, textColor: UI.water },
  { key: 'power', label: 'POWER', icon: 'icon-power', color: UI.powerHex, textColor: UI.power }
];

const TONE_COLOR = {
  success: UI.successHex,
  warning: UI.dangerHex,
  info: UI.accentHex
};

/**
 * Heads-up display: day, life support placeholders, objective and the
 * interaction prompt. Lives in UIScene, so camera zoom never moves it.
 */
export class HUD {
  constructor(scene, state, objective) {
    this.scene = scene;
    this.state = state;
    this.toasts = [];

    this.buildDayPanel();
    this.buildObjectivePanel(objective);
    this.buildResourcePanel();
    this.buildHint();
    this.bindEvents();
  }

  /** Hard-edge look so panels read as panels, not as loose glass. */
  static PANEL_STYLE = { accent: UI.accentHex, borderAlpha: 1 };

  // ── day ────────────────────────────────────────────────────
  buildDayPanel() {
    const scene = this.scene;
    const panel = panelAt(scene, 24, 20, 152, 46, HUD.PANEL_STYLE);

    const icon = scene.add.image(-50, -1, 'icon-day').setDisplaySize(17, 17).setTint(UI.accentHex);

    const day = scene.add.text(-28, -1, `DAY ${this.state.day}`, {
      fontFamily: UI.font,
      fontSize: '16px',
      color: UI.textBright,
      letterSpacing: 1.5
    }).setOrigin(0, 0.5);

    const rescue = scene.add.text(54, 0, `/${this.state.rescueDay}`, {
      fontFamily: UI.mono,
      fontSize: '10px',
      color: UI.faint
    }).setOrigin(1, 0.5);

    panel.add([icon, day, rescue]);
  }

  // ── objective ──────────────────────────────────────────────
  buildObjectivePanel(objective) {
    const scene = this.scene;
    this.objectivePanel = panelAt(scene, 24, 78, 316, 106, HUD.PANEL_STYLE);

    this.objectiveIcon = scene.add.image(-142, -29, 'icon-objective')
      .setDisplaySize(14, 14)
      .setTint(UI.accentHex);

    this.objectiveHeader = scene.add.text(-124, -36, 'OBJECTIVE', {
      fontFamily: UI.mono,
      fontSize: '8px',
      color: UI.muted,
      letterSpacing: 2
    });

    this.objectiveTitle = scene.add.text(-142, -15, '', {
      fontFamily: UI.font,
      fontSize: '13px',
      color: UI.textBright,
      wordWrap: { width: 284 }
    });
    // Wrapped within the panel: never spills past its bounds.
    this.objectiveTitle.setMaxLines(2);

    this.objectiveDetail = scene.add.text(-142, 13, '', {
      fontFamily: UI.font,
      fontSize: '9.5px',
      color: UI.muted,
      wordWrap: { width: 284 }
    });
    this.objectiveDetail.setMaxLines(2);

    this.progressTrack = scene.add.rectangle(-142, 40, 244, 3, 0x22304a).setOrigin(0, 0.5);
    this.progressFill = scene.add.rectangle(-142, 40, 244, 3, UI.accentHex).setOrigin(0, 0.5).setScale(0, 1);
    this.progressLabel = scene.add.text(112, 40, '', {
      fontFamily: UI.mono,
      fontSize: '9px',
      color: UI.muted
    }).setOrigin(1, 0.5);

    this.objectivePanel.add([
      this.objectiveIcon,
      this.objectiveHeader,
      this.objectiveTitle,
      this.objectiveDetail,
      this.progressTrack,
      this.progressFill,
      this.progressLabel
    ]);

    this.updateObjective(objective);
  }

  updateObjective(objective) {
    if (!objective) return;

    this.objectiveTitle.setText(objective.title);
    this.objectiveDetail.setText(objective.detail);

    if (objective.completed) {
      this.objectiveIcon.setTexture('icon-check').setTint(UI.successHex);
      this.objectiveHeader.setText('COMPLETE').setColor(UI.success);
    } else {
      this.objectiveIcon.setTexture('icon-objective').setTint(UI.accentHex);
      this.objectiveHeader.setText('OBJECTIVE');
    }

    const hasProgress = Boolean(objective.progress);
    this.progressTrack.setVisible(hasProgress);
    this.progressFill.setVisible(hasProgress);
    this.progressLabel.setVisible(hasProgress);

    if (hasProgress) {
      const { current, total } = objective.progress;
      const ratio = total > 0 ? Phaser.Math.Clamp(current / total, 0, 1) : 0;

      this.progressFill.setScale(ratio, 1);
      this.progressLabel.setText(`${current} / ${total}`);
      this.progressFill.fillColor = objective.completed ? UI.successHex : UI.accentHex;
    }

    this.scene.tweens.killTweensOf(this.objectivePanel);
    this.objectivePanel.setScale(1.012);
    this.scene.tweens.add({
      targets: this.objectivePanel,
      scaleX: 1,
      scaleY: 1,
      duration: 240,
      ease: 'Quad.easeOut'
    });
  }

  // ── life support ───────────────────────────────────────────
  buildResourcePanel() {
    const scene = this.scene;
    const panel = panelAt(scene, 1018, 20, 238, 168, HUD.PANEL_STYLE);

    panel.add(scene.add.text(-98, -72, 'LIFE SUPPORT', {
      fontFamily: UI.mono,
      fontSize: '8px',
      color: UI.muted,
      letterSpacing: 2
    }));

    RESOURCES.forEach((resource, index) => {
      const y = -46 + index * 32;
      const value = this.state.survival[resource.key] ?? 0;

      panel.add(scene.add.image(-98, y - 8, resource.icon)
        .setDisplaySize(14, 14)
        .setTint(resource.color));

      panel.add(scene.add.text(-80, y - 12, resource.label, {
        fontFamily: UI.mono,
        fontSize: '8px',
        color: UI.muted,
        letterSpacing: 1.2
      }));

      panel.add(scene.add.text(98, y - 7, `${Math.round(value)}%`, {
        fontFamily: UI.mono,
        fontSize: '9px',
        color: resource.textColor,
        letterSpacing: 0.5
      }).setOrigin(1, 0.5));

      panel.add(scene.add.rectangle(-98, y + 6, 196, 3, 0x22304a).setOrigin(0, 0.5));
      panel.add(scene.add.rectangle(-98, y + 6, 196, 3, resource.color)
        .setOrigin(0, 0.5)
        .setScale(value / 100, 1)
        .setAlpha(0.9));
    });
  }

  buildHint() {
    this.scene.add.text(24, 700, 'WASD / ARROWS   MOVE      E   INTERACT      TAB   CARGO      ESC   MENU', {
      fontFamily: UI.mono,
      fontSize: '9px',
      color: '#aeb9cc',
      backgroundColor: '#0b1120b0',
      padding: { x: 8, y: 5 },
      letterSpacing: 1.1
    }).setOrigin(0, 0.5);
  }

  // ── interaction prompt ────────────────────────────────────
  // The [E] tag moved into the world (see ui/WorldPrompt.js): it floats
  // above the object itself, not in this fixed HUD.

  // ── toasts ─────────────────────────────────────────────────
  showToast({ text, tone = 'info', icon = null }) {
    const scene = this.scene;
    const color = TONE_COLOR[tone] ?? UI.accentHex;

    while (this.toasts.length >= MAX_TOASTS) {
      this.toasts.shift().destroy();
    }

    for (const toast of this.toasts) {
      scene.tweens.killTweensOf(toast);
      scene.tweens.add({ targets: toast, y: toast.y - TOAST_STEP, duration: 160, ease: 'Quad.easeOut' });
    }

    const container = scene.add.container(GAME_WIDTH / 2, TOAST_BASE_Y).setDepth(760);

    const label = scene.add.text(0, 0, text, {
      fontFamily: UI.font,
      fontSize: '12px',
      color: UI.text,
      wordWrap: { width: 320 }
    }).setOrigin(0, 0.5);

    const width = label.width + (icon ? 66 : 40);
    const height = Math.max(38, label.height + 16);

    const panel = new Panel(scene, 0, 0, width, height, {
      fill: UI.panelDeep,
      alpha: 0.96,
      radius: 8
    });

    const bar = scene.add.rectangle(-width / 2 + 10, 0, 3, height - 14, color, 0.9)
      .setOrigin(0, 0.5);

    label.setPosition(-width / 2 + (icon ? 44 : 20), 0);

    container.add([panel, bar]);

    if (icon) {
      container.add(scene.add.image(-width / 2 + 28, 0, icon)
        .setDisplaySize(16, 16)
        .setTint(color));
    }

    container.add(label);

    container.setAlpha(0);
    scene.tweens.add({ targets: container, alpha: 1, duration: 150 });

    this.toasts.push(container);

    scene.time.delayedCall(2300, () => this.removeToast(container));
  }

  removeToast(container) {
    if (!container.active) return;

    const index = this.toasts.indexOf(container);
    if (index !== -1) this.toasts.splice(index, 1);

    this.scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 260,
      onComplete: () => container.destroy()
    });
  }

  // ── wiring ─────────────────────────────────────────────────
  bindEvents() {
    this.handlers = [
      [EVENTS.OBJECTIVE_CHANGED, (objective) => this.updateObjective(objective)],
      [EVENTS.TOAST, (payload) => this.showToast(payload)]
    ];

    for (const [event, handler] of this.handlers) bus.on(event, handler);
  }

  destroy() {
    for (const [event, handler] of this.handlers) bus.off(event, handler);
    this.toasts.forEach((toast) => toast.destroy());
    this.toasts = [];
  }
}
