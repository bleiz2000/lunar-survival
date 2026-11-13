import Phaser from 'phaser';

/**
 * Cross-scene event names. Scenes and systems talk through the shared bus
 * instead of reaching into each other; this keeps UI decoupled from gameplay.
 */
export const EVENTS = {
  // inventory
  INVENTORY_CHANGED: 'inventory:changed',
  ITEM_ADDED: 'inventory:item-added',
  ITEM_REMOVED: 'inventory:item-removed',

  // interaction
  PROMPT_SHOW: 'interaction:prompt-show',
  PROMPT_HIDE: 'interaction:prompt-hide',

  // quest / narrative
  OBJECTIVE_CHANGED: 'quest:objective-changed',
  RADIO_REPAIRED: 'world:radio-repaired',
  TRANSMISSION: 'ui:transmission',
  TRANSMISSION_CLOSED: 'ui:transmission-closed',

  // ui
  TOAST: 'ui:toast',
  MODAL: 'ui:modal',
  INVENTORY_TOGGLED: 'ui:inventory-toggled',
  MENU_REQUEST: 'ui:menu-request'
};

// Fail loudly in development if an event is ever referenced without a key.
for (const [name, value] of Object.entries(EVENTS)) {
  if (typeof value !== 'string' || value.length === 0) {
    console.error(`[events] EVENTS.${name} is not a valid event name`);
  }
}

/** Single shared emitter for the lifetime of the game. */
export const bus = new Phaser.Events.EventEmitter();
