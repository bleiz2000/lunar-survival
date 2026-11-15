# LUNAR: Survival Protocol

A 2D top-down lunar survival game prototype about an astronaut stranded after an emergency landing. Repair the spacecraft, reconnect with Earth, and locate and power up a disabled survey rover.

Built with [JavaScript ES modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript), [Phaser 3](https://phaser.io/), and [Vite](https://vite.dev/). The story and gameplay are fictional and science-inspired; no NASA dataset is directly integrated into the current prototype.

## Current prototype

The current slice includes an opening sequence, interactive spacecraft repair quests, a communication with Earth, and discovery and basic power-up of a survey rover. The rover is a fictional, unarmed civilian research vehicle, not military equipment. It is an early prototype, not a complete survival or base-building game. Resource simulation, rover driving, scanning, transport, automation, and a full campaign remain future work.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Use **WASD** or the **arrow keys** to move and **E** to interact. Build the production bundle with `npm run build`; preview it locally with `npm run preview`.

## Technology and context

- [Phaser 3](https://phaser.io/) — browser game framework
- [Vite](https://vite.dev/) — development server and build tool
- [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) — language reference
- [NASA Open Data Portal](https://data.nasa.gov/) — relevant open-data resource; not directly used by the prototype
- [Lunar Reconnaissance Orbiter data archive](https://pds-geosciences.wustl.edu/missions/lro/) — lunar-science context, not directly used by the prototype
- [Lunar Reconnaissance Orbiter Camera](https://lroc.im-ldi.com/) — lunar-science context, not directly used by the prototype
- [MewnBase](https://cairn4.itch.io/mewnbase) — visual/genre reference

## Project links

- [Watch the 28-second project demo](https://raw.githubusercontent.com/bleiz2000/lunar-survival/main/docs/demo/lunar-survival-demo.mp4)
- [View the seven-slide project demo](https://raw.githubusercontent.com/bleiz2000/lunar-survival/main/docs/demo/lunar-survival-demo-slides.pdf)
- [GitHub repository](https://github.com/bleiz2000/lunar-survival)
- [NASA Space Apps Challenge](https://www.spaceappschallenge.org/2026/)
