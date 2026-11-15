import Phaser from 'phaser';
import { INTERACT_KEY } from '../game/constants.js';
import { EVENTS } from '../game/events.js';

/**
 * Finds the closest interactable in range, publishes a prompt via the event
 * bus, and fires it on the interact key. Contains no UI and no object-specific
 * rules — new interactables only need to be added to the list.
 */
export class InteractionSystem {
  constructor(scene, astronaut, interactables, bus) {
    this.scene = scene;
    this.astronaut = astronaut;
    this.interactables = interactables;
    this.bus = bus;

    this.key = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.current = null;
    this.enabled = true;
  }

  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.clear();
  }

  findNearest() {
    let nearest = null;
    let nearestDistance = Infinity;

    for (const interactable of this.interactables) {
      if (!interactable.enabled) continue;

      const distance = Phaser.Math.Distance.Between(
        interactable.x,
        interactable.y,
        this.astronaut.x,
        this.astronaut.y
      );

      if (distance <= interactable.radius && distance < nearestDistance) {
        nearest = interactable;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  showPrompt(interactable) {
    this.bus.emit(EVENTS.PROMPT_SHOW, {
      key: INTERACT_KEY,
      label: interactable.label,
      prompt: interactable.getPromptText(),
      // World-space anchor for the floating tag above the object itself.
      sprite: interactable.sprite
    });
  }

  clear() {
    this.current?.setHighlight(false);
    this.current = null;
    this.bus.emit(EVENTS.PROMPT_HIDE);
  }

  update() {
    if (!this.enabled) return;

    const nearest = this.findNearest();

    if (nearest !== this.current) {
      this.current?.setHighlight(false);
      this.current = nearest;

      if (nearest) {
        nearest.setHighlight(true);
        this.showPrompt(nearest);
      } else {
        this.bus.emit(EVENTS.PROMPT_HIDE);
      }
    }

    if (!this.current) return;

    if (Phaser.Input.Keyboard.JustDown(this.key)) {
      // Guard against walking out of range in the same frame.
      if (!this.current.inRange(this.astronaut)) {
        this.clear();
        return;
      }

      this.current.trigger();

      if (this.current?.enabled) {
        this.showPrompt(this.current);
      } else {
        this.clear();
      }
    }
  }

  destroy() {
    this.clear();
  }
}
