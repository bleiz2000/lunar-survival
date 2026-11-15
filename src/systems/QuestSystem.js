import { EVENTS } from '../game/events.js';

const STEPS = {
  'repair-antenna': {
    title: 'Repair the antenna',
    detail: 'The crash tore the dish loose — attach the cables.'
  },
  'restore-power': {
    title: 'Restore power',
    detail: 'Connect the lander to the solar array.'
  },
  'first-comms': {
    title: 'Establish contact with Earth',
    detail: 'Use the antenna to call Houston.'
  },
  'patch-leak': {
    title: 'Patch the oxygen leak',
    detail: 'Seal the crack in the porthole glass.'
  },
  'engine-diagnostics': {
    title: 'Run engine diagnostics',
    detail: 'Scan the engine bay right at the ship.'
  },
  'repair-engine': {
    title: 'Repair the engine',
    detail: 'Stabilise the engine at half capacity.'
  },
  'second-comms': {
    title: 'Call Houston again',
    detail: 'Try the antenna again — anyone out there?'
  },
  'check-computer': {
    title: 'Check ship computer for coordinates',
    detail: 'Read the packet on the service panel.'
  },
  'find-rover': {
    title: 'Find the survey rover',
    detail: 'A silent survey unit sits on the north-east route. Locate it and check its condition.'
  },
  'repair-rover': {
    title: 'Restore rover power',
    detail: 'The chassis and wheels survived. Jump-start the flat battery.'
  },
  'rover-ready': {
    title: 'Survey rover online',
    detail: 'Basic power restored. The hull computer can talk to it again.',
    completed: true
  }
};

/**
 * Rule engine for Day 1: the prologue chain plus the first P1 field
 * objective (the abandoned survey rover). The current step is derived from
 * the state flags, so an out-of-order trigger can never desync the quest.
 * Pure data in, objective payloads out — no UI imports.
 */
export class QuestSystem {
  constructor(state, bus) {
    this.state = state;
    this.bus = bus;
  }

  start() {
    this.emitObjective();
  }

  /** Single source of truth: flag chain, never manual step bumps. */
  stepFromFlags() {
    const f = this.state.flags;

    if (!f.isAntennaFixed) return 'repair-antenna';
    if (!f.isPowerOn) return 'restore-power';
    if (!f.isComms1Done) return 'first-comms';
    if (!f.isWindowTaped) return 'patch-leak';
    if (!f.engineDiagnosed) return 'engine-diagnostics';
    if (!f.isEngineFixed) return 'repair-engine';
    if (!f.isComms2Done) return 'second-comms';
    if (!f.isCoordinatesReceived) return 'check-computer';
    if (!f.isRoverFound) return 'find-rover';
    if (!f.isRoverPowered) return 'repair-rover';

    return 'rover-ready';
  }

  get step() {
    return this.stepFromFlags();
  }

  getObjective() {
    const step = this.step;
    const spec = STEPS[step] ?? STEPS['rover-ready'];

    return {
      step,
      title: spec.title,
      detail: spec.detail,
      progress: null,
      completed: !!spec.completed
    };
  }

  emitObjective() {
    this.bus.emit(EVENTS.OBJECTIVE_CHANGED, this.getObjective());
  }

  /** World actions with progress bars (antenna/power/window/engine/rover). */
  applyAction(actionId) {
    const map = {
      antenna: 'isAntennaFixed',
      power: 'isPowerOn',
      window: 'isWindowTaped',
      engine: 'isEngineFixed',
      'rover-power': 'isRoverPowered'
    };

    const flag = map[actionId];
    if (!flag || this.state.flags[flag]) return false;

    this.state.flags[flag] = true;
    this.emitObjective();
    return true;
  }

  applyDiagnosed() {
    if (this.state.flags.engineDiagnosed) return false;

    this.state.flags.engineDiagnosed = true;
    this.emitObjective();
    return true;
  }

  /** Comms outcome handlers. Returns true when a flag actually flipped. */
  applyDialogue(id) {
    const flags = this.state.flags;

    if (id === 'comms1' && !flags.isComms1Done) {
      flags.isComms1Done = true;
      this.emitObjective();

      this.bus.emit(EVENTS.TOAST, {
        text: 'Oxygen leak detected — patch the porthole',
        icon: 'icon-o2',
        tone: 'warning'
      });

      return true;
    }

    if (id === 'comms2' && !flags.isComms2Done) {
      flags.isComms2Done = true;
      this.emitObjective();

      this.bus.emit(EVENTS.TOAST, {
        text: 'Packet received — check the ship computer',
        icon: 'icon-objective',
        tone: 'info'
      });

      return true;
    }

    return false;
  }

  /** Which of the three comms2 attempts to play (silence, silence, contact). */
  dialComms2() {
    const quest = this.state.quest;
    const attempt = quest.comms2Attempts ?? 0;

    quest.comms2Attempts = Math.min(attempt + 1, 3);

    if (attempt === 0) return 'comms2Attempt1';
    if (attempt === 1) return 'comms2Attempt2';
    return 'comms2';
  }

  applyTerminal() {
    if (this.state.flags.isCoordinatesReceived) return false;

    this.state.flags.isCoordinatesReceived = true;
    this.emitObjective();

    this.bus.emit(EVENTS.TOAST, {
      text: 'Coordinates logged — a silent survey rover is on the route',
      icon: 'icon-objective',
      tone: 'info'
    });

    return true;
  }

  /** First inspection at the rover: the unit is found, the repair is next. */
  applyRoverFound() {
    if (this.state.flags.isRoverFound) return false;

    this.state.flags.isRoverFound = true;
    this.emitObjective();

    this.bus.emit(EVENTS.TOAST, {
      text: 'Survey rover found — the battery is flat',
      icon: 'icon-power',
      tone: 'info'
    });

    return true;
  }
}
