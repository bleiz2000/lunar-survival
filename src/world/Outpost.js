import { OUTPOST_LAYOUT, CRATE_RADIUS, RADIO_RADIUS } from '../game/constants.js';
import { Interactable } from '../entities/Interactable.js';

const DRESSING = [
  { key: 'pebble', x: -158, y: 196, scale: 1.2, rotation: 0.3 },
  { key: 'pebble', x: 214, y: 258, scale: 0.9, rotation: -0.6 },
  { key: 'rock-small', x: -246, y: 236, scale: 0.7, rotation: 0.4 },
  { key: 'pebble', x: 122, y: -176, scale: 1, rotation: 1.2 },
  { key: 'rock-small', x: 326, y: 44, scale: 0.55, rotation: -0.3 }
];

/**
 * Builds the landing site around the lander: solar panels, supply crates,
 * the damaged communications dish and a flag. Visuals and colliders live here;
 * the reactions to searching/repairing are callbacks owned by GameScene.
 */
export class Outpost {
  constructor(scene, origin, handlers) {
    this.scene = scene;
    this.origin = origin;
    this.handlers = handlers;

    this.solids = [];
    this.interactables = [];
    this.crates = [];

    this.build();
  }

  at(offset) {
    return { x: this.origin.x + offset.x, y: this.origin.y + offset.y };
  }

  addSolid(x, y, width, height) {
    const zone = this.scene.add.zone(x, y, width, height);
    this.scene.physics.add.existing(zone, true);
    this.solids.push(zone);
  }

  build() {
    this.buildSolarPanels();
    this.buildCrates();
    this.buildRadio();
    this.buildFlag();
    this.dressSite();
  }

  buildSolarPanels() {
    for (const offset of OUTPOST_LAYOUT.solar) {
      const point = this.at(offset);

      this.scene.add
        .image(point.x, point.y, 'solar-panel')
        .setRotation(offset.rotation ?? 0)
        .setDepth(6);

      this.addSolid(point.x, point.y + 20, 84, 28);
    }
  }

  buildCrates() {
    OUTPOST_LAYOUT.crates.forEach((offset, index) => {
      const point = this.at(offset);
      const image = this.scene.add.image(point.x, point.y, 'crate').setDepth(7);

      this.addSolid(point.x, point.y + 8, 46, 28);

      const crate = {
        id: `crate-${index}`,
        x: point.x,
        y: point.y,
        image,
        opened: false
      };

      const interactable = new Interactable(this.scene, {
        id: crate.id,
        sprite: image,
        label: 'Supply Container',
        radius: CRATE_RADIUS,
        prompt: () => (crate.opened ? 'Already searched' : 'Search container'),
        onInteract: () => this.handlers.onSearchCrate?.(crate)
      });

      crate.open = () => {
        if (crate.opened) return false;
        crate.opened = true;
        image.setTexture('crate-open');
        interactable.setEnabled(false);
        return true;
      };

      this.crates.push(crate);
      this.interactables.push(interactable);
    });
  }

  buildRadio() {
    const point = this.at(OUTPOST_LAYOUT.radio);
    const image = this.scene.add.image(point.x, point.y, 'radio-dish').setDepth(7);

    this.addSolid(point.x, point.y + 28, 52, 26);

    this.radio = {
      x: point.x,
      y: point.y,
      image,
      repaired: false
    };

    this.radioInteractable = new Interactable(this.scene, {
      id: 'radio',
      sprite: image,
      label: 'Communications Array',
      radius: RADIO_RADIUS,
      prompt: () => 'Repair array',
      onInteract: () => this.handlers.onRepairRadio?.(this.radio)
    });

    this.interactables.push(this.radioInteractable);
  }

  buildFlag() {
    const point = this.at(OUTPOST_LAYOUT.flag);

    const flag = this.scene.add
      .image(point.x, point.y, 'flag')
      .setOrigin(0.5, 0.88)
      .setDepth(6);

    this.scene.tweens.add({
      targets: flag,
      angle: { from: -1.6, to: 1.6 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  dressSite() {
    for (const item of DRESSING) {
      const point = this.at(item);

      this.scene.add
        .image(point.x, point.y, item.key)
        .setScale(item.scale)
        .setRotation(item.rotation)
        .setDepth(item.key === 'rock-small' ? 1 : 0);
    }
  }

  repairRadio() {
    if (!this.radio || this.radio.repaired) return;

    this.radio.repaired = true;
    this.radio.image.setTexture('radio-dish-fixed');
    this.radioInteractable.setEnabled(false);
    this.radioInteractable.setHighlight(false);

    this.scene.tweens.add({
      targets: this.radio.image,
      scaleX: { from: 1.08, to: 1 },
      scaleY: { from: 0.92, to: 1 },
      duration: 320,
      ease: 'Back.easeOut'
    });
  }
}
