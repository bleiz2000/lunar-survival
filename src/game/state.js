import { START_DAY, RESCUE_DAY, START_SURVIVAL } from './constants.js';

/**
 * Serializable game state. Keep every save-relevant value here (plain data
 * only — never Phaser objects) so a save system can walk it later.
 */
export function createInitialState() {
  return {
    day: START_DAY,
    rescueDay: RESCUE_DAY,
    survival: { ...START_SURVIVAL },
    quest: {
      step: 'collect-chips',
      radioRepaired: false
    }
  };
}
