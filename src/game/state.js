import { START_DAY, RESCUE_DAY, START_SURVIVAL } from './constants.js';

/**
 * Serializable game state. Keep every save-relevant value here (plain data
 * only — never Phaser objects) so a save system can walk it later.
 *
 * Prologue flags drive the Day 1 scenario; each trigger checks the previous
 * flag, so interactions can never fire out of order.
 */
export function createInitialState() {
  return {
    day: START_DAY,
    rescueDay: RESCUE_DAY,
    survival: { ...START_SURVIVAL },
    flags: {
      isAntennaFixed: false,
      isPowerOn: false,
      isComms1Done: false,
      isWindowTaped: false,
      engineDiagnosed: false,
      isEngineFixed: false,
      isComms2Done: false,
      isCoordinatesReceived: false,
      isRoverFound: false,
      isRoverPowered: false
    },
    quest: {
      step: 'repair-antenna',
      comms2Attempts: 0
    }
  };
}
