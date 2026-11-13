# Lunar Survival

A 2D top-down survival and base-building game set on the Moon, inspired by
[MewnBase](https://cairn4.itch.io/mewnbase). Built with JavaScript ES Modules,
[Phaser 3](https://phaser.io/) and [Vite](https://vite.dev/).

## Requirements

- Node.js 20+
- npm

## Getting started

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Build

```bash
npm run build     # production build in dist/
npm run preview   # serve the production build locally
```

## Project structure

```
lunar-survival/
├── public/
│   └── assets/          # characters, buildings, environment, ui, sounds
├── src/
│   ├── main.js          # game entry point (Phaser config)
│   ├── config/          # game constants and configuration
│   ├── scenes/          # Phaser scenes
│   ├── entities/        # game entities (player, rovers, ...)
│   ├── systems/         # game systems (oxygen, power, ...)
│   ├── world/           # terrain and world generation
│   └── ui/              # UI logic, kept separate from game logic
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Status

Project initialization only — no gameplay implemented yet.
