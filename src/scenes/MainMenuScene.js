import Phaser from 'phaser';
import {
  SCENE_MAIN_MENU,
  SCENE_INTRO,
  GAME_WIDTH,
  GAME_HEIGHT,
  UI,
  RESCUE_DAY
} from '../game/constants.js';
import { Panel } from '../ui/Panel.js';
import { UiButton } from '../ui/UiButton.js';

const SAVE_KEY = 'lunar-save-v1';
const MENU_X = 112;

/**
 * Title screen: quiet lunar horizon, Earth overhead, the lander on the ridge
 * and a small stack of menu buttons. All art is original SVG.
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_MAIN_MENU);
  }

  create() {
    this.modal = null;

    this.buildSky();
    this.buildStars();
    this.buildEarth();
    this.buildHorizon();
    this.buildForeground();
    this.buildTitle();
    this.buildButtons();
    this.buildFooter();

    this.cameras.main.fadeIn(520, 4, 6, 12);

    this.input.keyboard.on('keydown-ESC', () => this.closeModal());
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.modal) return;
      this.startGame();
    });
  }

  // ── background ─────────────────────────────────────────────
  buildSky() {
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x070d1a, 0x070d1a, 0x1b2438, 0x1b2438, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  buildStars() {
    const rng = new Phaser.Math.RandomDataGenerator(['lunar-menu-stars']);

    for (let i = 0; i < 110; i++) {
      const x = rng.between(8, GAME_WIDTH - 8);
      const y = rng.between(10, Math.floor(GAME_HEIGHT * 0.62));
      const size = rng.realInRange(0.8, 2);

      const star = this.add
        .circle(x, y, size, 0xdce8ff, rng.realInRange(0.18, 0.85))
        .setDepth(1);

      if (rng.frac() > 0.85) {
        this.tweens.add({
          targets: star,
          alpha: { from: star.alpha, to: star.alpha * 0.25 },
          duration: rng.between(1600, 3400),
          yoyo: true,
          repeat: -1,
          delay: rng.between(0, 1800)
        });
      }
    }
  }

  buildEarth() {
    const x = 1082;
    const y = 150;

    this.add.image(x, y, 'earth')
      .setScale(1.34)
      .setAlpha(0.12)
      .setTint(0x6fa8f2)
      .setDepth(2);

    const earth = this.add.image(x, y, 'earth')
      .setScale(0.95)
      .setDepth(3);

    this.tweens.add({
      targets: earth,
      y: y - 9,
      duration: 7200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  buildHorizon() {
    this.add.image(0, GAME_HEIGHT, 'menu-ridge')
      .setOrigin(0, 1)
      .setDepth(4);

    const lander = this.add.image(980, 508, 'lander').setDepth(6);

    this.tweens.add({
      targets: lander,
      y: 505,
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const beacon = this.add.circle(1028, 427, 2.6, 0xff8f7a, 1).setDepth(7);

    this.tweens.add({
      targets: beacon,
      alpha: { from: 1, to: 0.15 },
      scale: { from: 1.1, to: 0.8 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  buildForeground() {
    const puffs = [
      { x: 760, y: 640, scale: 6, alpha: 0.1 },
      { x: 1180, y: 596, scale: 4.5, alpha: 0.08 },
      { x: 520, y: 690, scale: 7, alpha: 0.09 }
    ];

    for (const puff of puffs) {
      const image = this.add.image(puff.x, puff.y, 'dust-puff')
        .setScale(puff.scale)
        .setAlpha(0)
        .setDepth(7)
        .setTint(0xcfc9dc);

      this.tweens.add({
        targets: image,
        alpha: { from: 0, to: puff.alpha },
        x: puff.x + 150,
        duration: 9000,
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2400),
        ease: 'Sine.easeInOut'
      });
    }

    // Darkens the left column so the logo and buttons stay readable.
    const shade = this.add.graphics().setDepth(10);
    shade.fillGradientStyle(0x060a12, 0x060a12, 0x060a12, 0x060a12, 0.94, 0, 0.94, 0);
    shade.fillRect(0, 0, 780, GAME_HEIGHT);
  }

  // ── title ──────────────────────────────────────────────────
  buildTitle() {
    const logo = this.add.text(MENU_X, 132, 'LUNAR', {
      fontFamily: UI.font,
      fontSize: '88px',
      color: UI.textBright,
      letterSpacing: 16
    }).setDepth(20);

    logo.setShadow(0, 6, '#03060c', 20, false, true);

    this.add.text(MENU_X + 4, 244, 'SURVIVAL PROTOCOL', {
      fontFamily: UI.font,
      fontSize: '17px',
      color: UI.accent,
      letterSpacing: 9
    }).setDepth(20);

    this.add.rectangle(MENU_X, 282, 340, 1, 0x8fa0b8, 0.22)
      .setOrigin(0, 0.5)
      .setDepth(20);

    this.add.text(MENU_X + 2, 298, `STRANDED ON THE MOON  ·  DAY 1 OF ${RESCUE_DAY}`, {
      fontFamily: UI.mono,
      fontSize: '9px',
      color: UI.muted,
      letterSpacing: 2.4
    }).setDepth(20);

    logo.setAlpha(0);
    logo.y -= 8;
    this.tweens.add({ targets: logo, alpha: 1, y: 132, duration: 620, ease: 'Quad.easeOut' });
  }

  // ── buttons ────────────────────────────────────────────────
  buildButtons() {
    this.add.text(MENU_X + 2, 340, 'BEGIN', {
      fontFamily: UI.mono,
      fontSize: '9px',
      color: UI.faint,
      letterSpacing: 3
    }).setDepth(20);

    new UiButton(this, MENU_X + 150, 384, 'NEW GAME', () => this.startGame(), {
      width: 300,
      primary: true
    }).setDepth(20);

    this.continueButton = new UiButton(
      this,
      MENU_X + 150,
      448,
      'CONTINUE',
      () => this.startGame(),
      { width: 300, disabled: !this.hasSave() }
    ).setDepth(20);

    new UiButton(this, MENU_X + 150, 512, 'SETTINGS', () => this.openSettings(), {
      width: 300
    }).setDepth(20);

    new UiButton(this, MENU_X + 150, 576, 'CREDITS', () => this.openCredits(), {
      width: 300
    }).setDepth(20);

    this.add.text(MENU_X + 2, 626, 'ENTER  START      ESC  CLOSE PANEL', {
      fontFamily: UI.mono,
      fontSize: '9px',
      color: UI.faint,
      letterSpacing: 1.6
    }).setDepth(20);
  }

  buildFooter() {
    this.add.text(MENU_X, 684, 'MILESTONE 04  ·  VERTICAL SLICE', {
      fontFamily: UI.mono,
      fontSize: '9px',
      color: UI.faint,
      letterSpacing: 1.6
    }).setOrigin(0, 0.5).setDepth(20);

    this.add.text(GAME_WIDTH - 40, 684, 'ORIGINAL ART  ·  PHASER 3', {
      fontFamily: UI.mono,
      fontSize: '9px',
      color: UI.faint,
      letterSpacing: 1.6
    }).setOrigin(1, 0.5).setDepth(20);
  }

  hasSave() {
    try {
      return Boolean(window.localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
  }

  startGame() {
    if (this.modal) return;

    this.cameras.main.fadeOut(380, 4, 6, 12);
    this.time.delayedCall(380, () => this.scene.start(SCENE_INTRO));
  }

  // ── modals ─────────────────────────────────────────────────
  openModal(width, height, buildContent) {
    this.closeModal();

    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(500);

    const dim = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x03060c, 0.66)
      .setInteractive();

    const panel = new Panel(this, 0, 0, width, height, {
      fill: UI.panelDeep,
      alpha: 0.98,
      radius: 12
    });

    const close = new UiButton(this, 0, height / 2 - 44, 'CLOSE', () => this.closeModal(), {
      width: 150,
      height: 38,
      fontSize: 12
    });

    container.add([dim, panel, close]);
    buildContent?.(container, width, height);

    container.setAlpha(0);
    container.setScale(0.985);
    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 170,
      ease: 'Quad.easeOut'
    });

    this.modal = container;
  }

  openSettings() {
    this.openModal(540, 300, (container, width) => {
      const left = -width / 2 + 30;

      container.add(this.add.text(left, -112, 'SETTINGS', {
        fontFamily: UI.font,
        fontSize: '20px',
        color: UI.textBright,
        letterSpacing: 4
      }));

      const rows = [
        ['MASTER VOLUME', '100%  —  audio arrives in a later build'],
        ['CAMERA ZOOM', '1.15×  —  follows the astronaut'],
        ['CONTROLS', 'WASD / arrows · E interact · Tab cargo']
      ];

      rows.forEach(([label, value], index) => {
        const y = -66 + index * 42;

        container.add(this.add.text(left, y, label, {
          fontFamily: UI.mono,
          fontSize: '9px',
          color: UI.accent,
          letterSpacing: 2
        }));

        container.add(this.add.text(left, y + 15, value, {
          fontFamily: UI.font,
          fontSize: '12px',
          color: UI.text
        }));
      });

      container.add(this.add.text(left, 74, 'More options will arrive in a later build.', {
        fontFamily: UI.font,
        fontSize: '10px',
        color: UI.faint
      }));
    });
  }

  openCredits() {
    this.openModal(560, 350, (container, width) => {
      const left = -width / 2 + 30;

      container.add(this.add.text(left, -142, 'CREDITS', {
        fontFamily: UI.font,
        fontSize: '20px',
        color: UI.textBright,
        letterSpacing: 4
      }));

      container.add(this.add.text(left, -108, 'LUNAR: SURVIVAL PROTOCOL', {
        fontFamily: UI.font,
        fontSize: '12px',
        color: UI.accent,
        letterSpacing: 2
      }));

      const lines = [
        'A vertical slice built for Milestone 04.',
        '',
        'DESIGN & CODE      the LUNAR team',
        'ART                original SVG, drawn for this project',
        'ENGINE             Phaser 3',
        'INSPIRATION        classic moon-base survival games',
        '',
        'No third-party artwork is used.'
      ];

      container.add(this.add.text(left, -82, lines.join('\n'), {
        fontFamily: UI.mono,
        fontSize: '11px',
        color: UI.text,
        lineSpacing: 8
      }));
    });
  }

  closeModal() {
    if (!this.modal) return;

    const container = this.modal;
    this.modal = null;

    this.tweens.add({
      targets: container,
      alpha: 0,
      duration: 120,
      onComplete: () => container.destroy()
    });
  }
}
