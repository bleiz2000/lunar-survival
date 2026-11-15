import { TYPE_SPEED } from '../game/constants.js';

/**
 * Every spoken line in the prologue. Text and pacing only — the dialogue panel
 * renders it, the quest system reacts to the dialogue id.
 *
 * tone: 'earth' (Mission Control), 'player' (the commander), 'system' (radio).
 */
export const DIALOGUE = {
  // Day 1 · step 2.3
  comms1: {
    id: 'comms1',
    title: 'INCOMING TRANSMISSION',
    signal: 'LIVE',
    lines: [
      {
        speaker: 'MISSION CONTROL',
        tone: 'earth',
        speed: TYPE_SPEED.EXCITED,
        text: "Signal received! Let's see... I detect an oxygen leak in your ship! "
          + 'Please patch it up while I check the rest of your telemetry. Over!'
      }
    ]
  },

  // Day 1 · step 2.7 — three attempts: silence, then the conversation
  comms2Attempt1: {
    id: 'comms2Attempt1',
    title: 'TRANSMISSION',
    signal: 'SEARCHING',
    lines: [
      {
        speaker: 'RADIO',
        tone: 'system',
        speed: TYPE_SPEED.CALM,
        text: 'Calling Houston…'
      }
    ]
  },

  comms2Attempt2: {
    id: 'comms2Attempt2',
    title: 'TRANSMISSION',
    signal: 'SEARCHING',
    lines: [
      {
        speaker: 'RADIO',
        tone: 'system',
        speed: TYPE_SPEED.TIRED,
        text: 'Calling Houston… (No response)'
      }
    ]
  },

  comms2: {
    id: 'comms2',
    title: 'INCOMING TRANSMISSION',
    signal: 'LIVE',
    lines: [
      {
        speaker: 'MISSION CONTROL',
        tone: 'earth',
        speed: TYPE_SPEED.EXCITED,
        text: 'Hello?! Sorry, I was busy... uh... doing important stuff!'
      },
      {
        speaker: 'COMMANDER',
        tone: 'player',
        speed: TYPE_SPEED.REPORT,
        text: 'I patched the oxygen leak and fixed the engine.'
      },
      {
        speaker: 'MISSION CONTROL',
        tone: 'earth',
        speed: TYPE_SPEED.EXCITED,
        text: "Great! Listen, all our staff took a sick leave... you know, there's a bug "
          + 'going around... BASICALLY, EVERYONE IS PLAYING GTA 6! So the rescue mission '
          + 'will take about 25 days!'
      },
      {
        speaker: 'COMMANDER',
        tone: 'player',
        speed: TYPE_SPEED.PANIC,
        text: 'I only have food for 5 days!'
      },
      {
        speaker: 'MISSION CONTROL',
        tone: 'earth',
        speed: TYPE_SPEED.EXCITED,
        text: 'No problem! Our scanners found an old automated bio-research outpost nearby! '
          + "Its grow lab may still hold a sealed fungal culture. I'll send the coordinates "
          + "to your ship's computer. Go check it! And don't forget to sleep every 16 hours! Over!"
      }
    ]
  }
};

/** Ship terminal contents shown at the end of the prologue. */
export const TERMINAL_DATA = {
  title: 'SHIP TERMINAL',
  subtitle: 'INCOMING PACKET · MISSION CONTROL',
  lines: [
    '> CONNECTION ESTABLISHED',
    '> COORDINATES RECEIVED',
    'TARGET   BIO RESEARCH OUTPOST',
    'BEARING  NORTH-EAST · 4.2 KM',
    'EN ROUTE SURVEY ROVER · SILENT',
    'STATUS   ABANDONED · POWER UNKNOWN'
  ],
  footer: 'Coordinates received. A silent survey rover sits on the route.'
};

/** Engine diagnostic readout. `state` drives the colour of the lamp. */
export const DIAGNOSTICS_DATA = (flags) => ({
  title: 'ENGINE DIAGNOSTICS',
  subtitle: 'HULL ACCESS PANEL · SHIP 01',
  rows: [
    {
      label: 'ENGINE',
      value: flags.isEngineFixed ? '50% CAPACITY' : 'DAMAGED · 50% CAPACITY',
      state: flags.isEngineFixed ? 'warn' : 'bad',
      icon: 'icon-engine'
    },
    {
      label: 'OXYGEN',
      value: flags.isWindowTaped ? 'SEALED' : 'LEAK DETECTED',
      state: flags.isWindowTaped ? 'ok' : 'bad',
      icon: 'icon-o2'
    },
    { label: 'HULL', value: 'STABLE', state: 'ok', icon: 'icon-check' },
    {
      label: 'POWER',
      value: flags.isPowerOn ? 'ONLINE' : 'OFFLINE',
      state: flags.isPowerOn ? 'ok' : 'bad',
      icon: 'icon-power'
    }
  ],
  message: flags.isEngineFixed
    ? 'Engine stabilised at 50% capacity.'
    : 'Engine damaged! Working at 50% capacity!'
});
