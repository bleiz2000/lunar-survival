import { getItem } from '../data/items.js';
import { EVENTS } from '../game/events.js';

/**
 * Minimal item container: add / remove / count, with change events for the UI.
 * Items are identified by id and described by data/items.js.
 */
export class InventorySystem {
  constructor(bus) {
    this.bus = bus;
    this.items = new Map();
  }

  count(id) {
    return this.items.get(id) ?? 0;
  }

  has(id, quantity = 1) {
    return this.count(id) >= quantity;
  }

  add(id, quantity = 1) {
    if (quantity <= 0 || !getItem(id)) return false;

    const total = this.count(id) + quantity;
    this.items.set(id, total);

    this.bus.emit(EVENTS.ITEM_ADDED, { id, quantity, total });
    this.emitChanged();
    return true;
  }

  remove(id, quantity = 1) {
    const available = this.count(id);
    if (quantity <= 0 || available < quantity) return false;

    const total = available - quantity;
    if (total === 0) {
      this.items.delete(id);
    } else {
      this.items.set(id, total);
    }

    this.bus.emit(EVENTS.ITEM_REMOVED, { id, quantity, total });
    this.emitChanged();
    return true;
  }

  /** Plain data for the UI: no Phaser objects, no formatting. */
  snapshot() {
    return [...this.items.entries()].map(([id, quantity]) => {
      const definition = getItem(id);
      return {
        id,
        quantity,
        name: definition?.name ?? id,
        description: definition?.description ?? '',
        icon: definition?.icon ?? null
      };
    });
  }

  emitChanged() {
    this.bus.emit(EVENTS.INVENTORY_CHANGED, { items: this.snapshot() });
  }
}
