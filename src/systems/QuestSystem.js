import { RADIO_REPAIR_COST, RESCUE_DAY } from '../game/constants.js';
import { EVENTS } from '../game/events.js';

/**
 * Owns the first gameplay sequence: find components → repair the array →
 * receive Earth's transmission → survive until rescue. Emits plain objective
 * payloads; the HUD only renders them.
 */
export class QuestSystem {
  constructor(state, inventory, bus) {
    this.state = state;
    this.inventory = inventory;
    this.bus = bus;

    this.onInventoryChanged = () => this.sync();
    this.onTransmissionClosed = () => this.advanceAfterTransmission();

    bus.on(EVENTS.INVENTORY_CHANGED, this.onInventoryChanged);
    bus.on(EVENTS.TRANSMISSION_CLOSED, this.onTransmissionClosed);
  }

  get required() {
    return RADIO_REPAIR_COST.qty;
  }

  start() {
    this.emitObjective();
  }

  getObjective() {
    const quest = this.state.quest;
    const chips = this.inventory.count(RADIO_REPAIR_COST.itemId);

    if (quest.radioRepaired) {
      if (quest.step === 'restored') {
        return {
          step: 'restored',
          title: 'Communications restored',
          detail: 'Incoming transmission from Earth…',
          progress: null,
          completed: true
        };
      }

      return {
        step: 'survive',
        title: 'Survive until the rescue window',
        detail: `Hold the outpost together until Day ${RESCUE_DAY}.`,
        progress: null,
        completed: false
      };
    }

    if (quest.step === 'repair-radio') {
      return {
        step: 'repair-radio',
        title: 'Repair the communications array',
        detail: 'Install the components in the damaged dish.',
        progress: { current: this.required, total: this.required },
        completed: false
      };
    }

    return {
      step: 'collect-chips',
      title: 'Recover electronic components',
      detail: 'Search the supply containers around the lander.',
      progress: { current: chips, total: this.required },
      completed: false
    };
  }

  emitObjective() {
    this.bus.emit(EVENTS.OBJECTIVE_CHANGED, this.getObjective());
  }

  /** Keeps the objective in sync with the contents of the inventory. */
  sync() {
    if (this.state.quest.radioRepaired) return;

    const chips = this.inventory.count(RADIO_REPAIR_COST.itemId);
    const step = chips >= this.required ? 'repair-radio' : 'collect-chips';
    const changed = step !== this.state.quest.step;

    this.state.quest.step = step;
    this.emitObjective();

    if (changed && step === 'repair-radio') {
      this.bus.emit(EVENTS.TOAST, {
        text: 'Components complete — return to the array',
        tone: 'success'
      });
    }
  }

  /**
   * Marks the array as repaired *before* the cost is paid, so the inventory
   * change event cannot rewind the objective back to "collect chips".
   */
  repairRadio(applyCost) {
    if (this.state.quest.radioRepaired) return false;

    this.state.quest.radioRepaired = true;
    this.state.quest.step = 'restored';

    applyCost?.();
    this.emitObjective();
    return true;
  }

  advanceAfterTransmission() {
    if (this.state.quest.step !== 'restored') return;

    this.state.quest.step = 'survive';
    this.emitObjective();

    this.bus.emit(EVENTS.TOAST, {
      text: `New objective — survive until Day ${RESCUE_DAY}`,
      tone: 'info'
    });
  }

  destroy() {
    this.bus.off(EVENTS.INVENTORY_CHANGED, this.onInventoryChanged);
    this.bus.off(EVENTS.TRANSMISSION_CLOSED, this.onTransmissionClosed);
  }
}
