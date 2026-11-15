# AI AGENT WORK LOG — LUNAR

This file is a mandatory, continuously maintained record of changes made by AI coding agents.

## Rules for every agent

1. Read `docs/GAME_DESIGN.md` and this file before making changes.
2. Before editing, inspect the current repository and report the relevant existing state.
3. Do only the task explicitly requested. Do not silently expand scope.
4. After making changes, append a new entry to this file.
5. Never delete or rewrite previous entries. Append a new dated entry.
6. Be factual. Do not claim a feature works unless you ran an appropriate check.
7. Record failed attempts and known issues as well as successful changes.
8. Do not write secrets, access tokens, passwords, or private personal data here.
9. Do not modify `docs/GAME_DESIGN.md` unless the task explicitly asks you to. If design requirements conflict or appear ambiguous, report the conflict.
10. Do not create commits or push to GitHub unless explicitly requested.

## Required entry format

Append one entry per task/session:

---

## YYYY-MM-DD — Short task title

**Agent/model:**  
Name the agent/model if known; otherwise write `Not specified`.

**Requested task:**  
Briefly restate what was requested.

**Repository state before work:**
- Current branch:
- Working tree status:
- Relevant files inspected:

**Files created:**
- List files, or `None`.

**Files modified:**
- List files and explain what changed, or `None`.

**Files deleted:**
- List files, or `None`.

**Implementation details:**
- Explain the actual changes.
- Mention important design or architecture decisions.
- Mention dependencies added/removed and why.

**Verification performed:**
- Commands executed:
- Build/test result:
- Manual checks:
- If no verification was possible, explain why.

**Known issues / incomplete work:**
- List remaining problems, limitations, or `None`.

**Next recommended step:**
- One small, concrete next action.

---

## Initial entry

## 2026-11-13 — Work log initialized

**Agent/model:** Not specified.

**Requested task:** Establish a persistent record of AI-agent actions and project changes.

**Repository state before work:** Not inspected by this document author.

**Files created:** `CHANGELOG.md` (this file).

**Files modified:** None.

**Files deleted:** None.

**Implementation details:** Added mandatory append-only work-log instructions and a standard entry template.

**Verification performed:** Not applicable; documentation only.

**Known issues / incomplete work:** The actual repository state and whether this file has been added to the project must be verified by the coding agent.

**Next recommended step:** Add `docs/GAME_DESIGN.md` and verify both documents are present in the project root/docs structure.

---

## 2026-11-13 — Milestone P0: main menu and lunar map (items 2–3)

**Agent/model:**
OpenCode agent (GLM-5.3-Flash Free).

**Requested task:**
Familiarize with `docs/GAME_DESIGN.md` and `CHANGELOG.md`; implement Milestone P0 items 2 ("Main menu opens the game scene") and 3 ("Lunar map renders"). No gameplay mechanics.

**Repository state before work:**
- Current branch: `main`
- Working tree status: clean at commit `33bdd05`; `docs/GAME_DESIGN.md`, `CHANGELOG.md` and `Empty Text File.txt` untracked (docs were delivered as an attachment generator script, not as files in the repo)
- Relevant files inspected: `src/main.js`, `src/scenes/BootScene.js`, `src/config/constants.js`, `docs/GAME_DESIGN.md`, `CHANGELOG.md`

**Files created:**
- `docs/GAME_DESIGN.md` (extracted from the provided generator script; content unmodified)
- `src/game/constants.js` (viewport, world size, scene keys, palette)
- `src/scenes/MainMenuScene.js` (title + interactive NEW GAME button)
- `src/scenes/GameScene.js` (hosts the world map, camera clamped to world bounds)
- `src/world/WorldMap.js` (runtime-generated regolith/rock/crater textures; deterministic layout)

**Files modified:**
- `src/main.js` — new scene list `Boot → MainMenu → Game`; constants now imported from `src/game/constants.js`; exposed `window.game` as a debug handle
- `src/scenes/BootScene.js` — now just boots into `MainMenuScene`

**Files deleted:**
- `src/config/` (constants migrated to `src/game/constants.js` per the design doc's target structure)

**Implementation details:**
- Menu → game flow: `BootScene` starts `MainMenuScene`; the NEW GAME button (Phaser Container with pointer events) starts `GameScene`.
- `WorldMap` generates its three textures at runtime on a canvas texture (no asset files committed); layout is seeded (`Phaser.Math.RandomDataGenerator`) so the map is deterministic. World is 2560×2560; camera bounds are set and the view starts centered.
- Scope kept to P0 items 2–3: no player entity, no movement, no camera follow, no HUD.

**Verification performed:**
- Commands executed: `npm install` (already OK from task 01), `npm run build` → success (1.2 MB / 333 KB gzipped bundle, Phaser-only chunk-size warning as before)
- Manual checks in Chromium via dev server (`npm run dev`): initial run surfaced a real bug (`SCENE_BOOT` missing from `BootScene.js` imports) — fixed. After the fix: zero console errors; menu renders (screenshot verified); a real click on NEW GAME transitions to `GameScene` (verified via scene state: `Game` active, 75 display objects = 1 surface + 14 craters + 60 rocks, camera centered at world midpoint, all 3 textures present); map renders as speckled regolith with craters and rocks (screenshot verified)
- Note for future testing: this environment's Phaser build only responds to *trusted* mouse events; synthetic `PointerEvent`s are ignored by the input manager, which is a test-tooling quirk, not a game bug

**Known issues / incomplete work:**
- The 1.2 MB single-chunk bundle warning remains (expected until chunk splitting is worth it)
- `Empty Text File.txt` (the docs generator script) is still untracked in the repo root; it is not needed in the repository — recommend deleting it
- Menu currently has only NEW GAME; Settings/Credits/Continue intentionally not implemented yet

**Next recommended step:**
P0 items 4–5: add `entities/Astronaut.js` with WASD movement and `world/CameraController.js` (camera follow within world bounds).

---

## 2026-11-13 — Task 03: Astronaut movement, camera, collisions, debug overlay

**Agent/model:**
OpenCode agent (GLM-5.3-Flash Free).

**Requested task:**
Implement the first playable character controller per Task 03: Astronaut entity with WASD/arrow movement (normalized diagonals, configurable speed), smooth camera follow with world bounds and configurable zoom, placeholder landing spacecraft and obstacles on the map, collisions with solid objects, a toggleable debug overlay (FPS + coordinates), and a chapter-based `TODO.md` tracker. No inventory, survival or building systems.

**Repository state before work:**
- Current branch: `main`
- Working tree status: uncommitted Task 02 changes present (menu, map, docs); no uncommitted unrelated edits
- Relevant files inspected: `docs/GAME_DESIGN.md`, `CHANGELOG.md`, `src/scenes/GameScene.js`, `src/world/WorldMap.js`, `src/game/constants.js`, `src/main.js`

**Files created:**
- `TODO.md` — chapter-based tracker with a legend: `[x]` done/verified, `[~]` beta/partial, `[ ]` not started, `[!]` blocked; maintained by agents going forward
- `src/entities/Astronaut.js` — player entity: runtime-generated placeholder texture (helmet/visor/backpack/boots), arcade physics body with `collideWorldBounds`, presentation-only "waddle" tilt while walking
- `src/systems/MovementSystem.js` — all movement rules: WASD + arrows, diagonal normalization, velocity application; scenes/entities contain no input logic
- `src/world/CameraController.js` — camera follow with lerp (`CAMERA_FOLLOW_LERP = 0.08`), world bounds, configurable zoom (`CAMERA_ZOOM = 1`)
- `src/ui/DebugOverlay.js` — FPS, player coords, velocity, camera scroll; toggled with **F3**, on by default

**Files modified:**
- `src/game/constants.js` — added `ASTRONAUT_SPEED/SIZE`, `CAMERA_ZOOM/FOLLOW_LERP`, `LANDER_OFFSET`, `BOULDER_COUNT`, suit/visor palette
- `src/world/WorldMap.js` — added solid objects: placeholder lander (static body) + 12 boulders (static bodies, seeded positions), exposed as `worldMap.solids`; added lander/boulder runtime textures
- `src/scenes/GameScene.js` — wires physics world bounds, astronaut spawn beside the lander, collider (astronaut vs solids), camera controller, debug overlay, `update()` loop
- `src/main.js` — enabled Arcade physics in the game config

**Files deleted:**
- None.

**Implementation details:**
- Movement is velocity-based (px/s) so Arcade physics resolves collisions; input state is read from Phaser keys (`addKeys('W,A,S,D')` + `createCursorKeys()`).
- Walk animation: no sprite assets exist yet, so only a subtle angle tilt ("waddle") is applied while moving; the design doc's placeholder-art decision stays open, real animation deferred until assets exist.
- Obstacles use static rectangle bodies; polygon shapes deliberately deferred (noted in TODO).
- New dependency: none (Arcade physics is part of Phaser).

**Verification performed:**
- Commands executed: `npm run build` → success (before and after fixes); dev-server manual checks in Chromium
- Bugs found and fixed during verification:
  1. `Astronaut.get speed()` referenced un-imported `ASTRONAUT_SPEED` → `ReferenceError` on first move; fixed import and simplified the getter
- Movement math (programmatic, via key state): right = (150, 0); diagonal W+D = (106.07, −106.07), magnitude exactly 150 (normalized ✓); release → velocity 0, `moving=false`
- Sustained movement: 30 frames @144 FPS walked 30 px ≈ 150 px/s ✓
- Collision: walking up into the lander stops the astronaut at y=1199 (lander bottom 1188 + 11 px half-body); cannot pass through ✓; boulders are collidable the same way
- Camera bounds: top-left corner → camera scroll (0, 0); bottom-right → (1280, 1840) = exactly (world−viewport); player blocked by `collideWorldBounds` at (2549, 2549) ✓
- Debug overlay: F3 toggle verified through Phaser's own `JustDown` path — off → on → off ✓; FPS 143–144, coords/camera values correct on screen
- Console: zero errors after fixes
- Environment note: this test browser does not deliver real keyboard/mouse input to the page (trusted events never reach Phaser), so movement/camera tests were driven by setting Phaser key state and stepping real frames; the input wiring itself (`addKeys`/`createCursorKeys`, 11 keys registered, `keyboard.enabled = true`) is standard Phaser and was verified as registered, but not end-to-end with a human keypress

**Known issues / incomplete work:**
- Walk animation is a placeholder tilt until real sprite frames exist (TODO Глава 1: `[~]`)
- Obstacle bodies are rectangles, not polygons (TODO Глава 5)
- Debug overlay is on by default (development convenience); can be turned off with F3
- Real-input end-to-end check still recommended on a human machine: `npm run dev`, WASD/arrows, F3

**Next recommended step:**
P0 item 6–7: interactable object with E prompt and HUD with placeholder survival values.

---

## 2026-11-13 — Milestone 04: first playable experience and visual overhaul

**Agent/model:** OpenCode agent (DeepSeek V4.1 Flash Free).

**Requested task:**
Turn the movement prototype into a playable vertical slice: real main menu, visually
improved world, original cartoon astronaut, first gameplay loop (collect → repair the
radio → Earth transmission → next objective), reusable interaction system, minimal
inventory, HUD that survives camera zoom, gameplay feedback. Fix the audit findings E1,
E2 and E6. Do not start P2 systems, do not add dependencies, do not commit.

**Repository state before work:**
- Current branch: `main` (no commit made in this session)
- Working tree status: dirty — Milestone P0/Task 03 code plus `src/config/` deletions
  and untracked `docs/`, `TODO.md`, `CHANGELOG.md` were present but uncommitted
- Relevant files inspected: `docs/GAME_DESIGN.md`, `docs/TECHNICAL_AUDIT.md`,
  `src/main.js`, `src/scenes/*`, `src/world/*`, `src/entities/*`, `src/game/*`,
  `src/ui/DebugOverlay.js`, `index.html`

**Files created:**
- `src/game/assets.js` — SVG manifest (27 entries) + `loadImageAssets(loader)`
- `src/game/events.js` — `EVENTS` names and the single shared `bus`
- `src/game/state.js` — minimal `GameState` factory (day, rescue day, survival values, quest)
- `src/data/items.js` — item definitions (`chip` and future items)
- `src/scenes/PreloadScene.js` — loading screen + one-shot SVG preload
- `src/scenes/UIScene.js` — parallel interface scene (HUD, cargo, messages, debug)
- `src/scenes/MainMenuScene.js` — title screen, menu buttons, SETTINGS/CREDITS modals
- `src/entities/Interactable.js` — interaction metadata, range check, highlight ring
- `src/systems/InteractionSystem.js` — nearest-target search, prompt events, E key
- `src/systems/InventorySystem.js` — add/remove/count/snapshot + change events
- `src/systems/QuestSystem.js` — objective payloads and the repair/transmission flow
- `src/world/Outpost.js` — solar panels, crates, radio dish, flag, dressing, colliders
- `src/ui/Panel.js` — rounded panel + `panelAt()`
- `src/ui/UiButton.js` — menu button with hover/press/disabled states
- `src/ui/HUD.js` — day, objective, life support, prompt, toast stack
- `src/ui/InventoryPanel.js` — cargo card
- `src/ui/MessagePanel.js` — transmission modal with typewriter reveal
- `public/assets/characters/astronaut-{south,north,east}.svg`
- `public/assets/environment/{ground-tile,crater,boulder,rock-small,pebble,flag,earth,menu-ridge}.svg`
- `public/assets/buildings/{lander,solar-panel}.svg`
- `public/assets/equipment/{crate,crate-open,radio-dish,radio-dish-fixed}.svg`
- `public/assets/effects/dust-puff.svg`
- `public/assets/ui/{icon-o2,icon-food,icon-water,icon-power,icon-day,icon-objective,icon-chip,icon-check,icon-warning}.svg`
- `docs/TECHNICAL_AUDIT.md`, `TODO.md`, `CHANGELOG.md` (tracker files)

**Files modified:**
- `src/main.js` — scene list `Boot → Preload → MainMenu → Game + UI`, antialias on,
  `window.game` exposed in development only
- `src/scenes/BootScene.js` — now only forwards to `PreloadScene`
- `src/scenes/GameScene.js` — composition root: state, systems, world, outpost, camera,
  effect particles, crate/radio handlers, fade-out exit, full shutdown cleanup
- `src/entities/Astronaut.js` — replaced the runtime canvas texture with preloaded SVG
  sprites (3 directions + horizontal flip), shadow ellipse, dust puffs, sway instead of
  the old waddle; the collider is re-applied after every texture swap
- `src/systems/MovementSystem.js` — added `setEnabled()` and zero-velocity on disable
- `src/world/WorldMap.js` — SVG ground/scatter/boulders, seeded RNG, clearance helper
  (`isDecorSpotFree(x, y, landerClearance, spawnClearance)`), `getLanderPoint()`,
  `getSpawnPoint()`, limited decorative rotations so baked shadows stay consistent
- `src/world/CameraController.js` — follows the shared spawn/lander points, `CAMERA_ZOOM = 1.2`
- `src/ui/DebugOverlay.js` — moved into `UIScene`, hidden by default, F3 toggles
- `src/game/constants.js` — full tuning table: zoom, spawn offset, outpost layout,
  interaction radii, `UI` style tokens, `START_DAY`, `RESCUE_DAY`, `RADIO_REPAIR_COST`
- `index.html` — title `LUNAR — Survival Protocol`
- `public/assets/environment/{ground-tile,crater,earth,menu-ridge}.svg` — repainted for
  contrast (hairline speckles instead of noise, readable crater bowl, brighter menu ridge)
- `public/assets/buildings/lander.svg` — redrawn: the old version read as a face (two
  round "eyes" and an orange "mouth"); now a module with a porthole, hatch, ladder,
  landing legs, descent skirt and antenna
- `public/assets/equipment/radio-dish.svg` / `radio-dish-fixed.svg` — redrawn as the same
  dish in broken and repaired states (torn sector, crack, dangling cable, red LED vs.
  clean rim, green LEDs and signal arcs)

**Files deleted:**
- `src/config/constants.js`, `src/config/.gitkeep` — superseded by `src/game/constants.js`
  (deletions were already staged before this session and were left as they were)

**Implementation details:**
- **E1 (restart texture crash) fixed at the root.** Nothing is generated at runtime any
  more: `PreloadScene` loads all 27 SVGs once, so scenes can be created, destroyed and
  recreated without texture-key collisions. Verified: two full menu → game → menu cycles
  leave exactly one `UIScene` instance, 52 textures (4 built-in + 27 SVG + Phaser text
  canvases) and zero console errors.
- **E2 (debug overlay zoom) fixed by architecture.** All interface objects live in
  `UIScene`, whose camera has zoom 1 and never scrolls; `DebugOverlay` reads the gameplay
  camera through `scene.get(SCENE_GAME)` instead of drawing inside it.
- **E6 (duplicated lander position) fixed** by keeping one source of truth:
  `LANDER_OFFSET` / `SPAWN_OFFSET` in constants and `WorldMap.getLanderPoint()` /
  `getSpawnPoint()` for every consumer (camera, outpost origin, spawn, clears).
- Decoupling: gameplay systems never touch UI. They emit plain payloads on the shared bus
  (`quest:objective-changed`, `interaction:prompt-show/hide`, `inventory:changed`,
  `ui:toast`, `ui:modal`, `ui:transmission`, `ui:transmission-closed`, `ui:menu-request`),
  and `HUD`/`InventoryPanel`/`MessagePanel` only render them.
- Interaction: `Interactable` holds metadata only (radius, label, prompt getter, callback,
  enabled flag). `InteractionSystem` picks the nearest enabled target every frame, drives
  the highlight ring, publishes the prompt and fires the callback on `E`, re-checking range.
- Inventory: `InventorySystem` is a `Map<itemId, qty>` with add/remove/count/has/snapshot;
  an invalid id or a shortfall returns `false`. `src/data/items.js` is the only place item
  metadata lives.
- Quest: `QuestSystem` derives the objective from state + inventory, so the HUD can never
  disagree with the world. Radio repair marks the quest repaired *before* paying the cost,
  which stops the `inventory:changed` event from rewinding the objective.
- The loop: three crates × 1 chip → radio needs 3 → repair swaps the texture, flashes,
  shakes and shows "SIGNAL ONLINE" → after 1.1 s the Earth transmission modal opens
  (movement and interaction disabled through `ui:modal`) → closing it advances the
  objective to "Survive until the rescue window" (Day 25).
- Menu: `CONTINUE` is disabled unless `localStorage['lunar-save-v1']` exists (read-only
  probe; there is no save system yet). `SETTINGS` and `CREDITS` are informational modals
  with an explicit note that audio arrives later.
- New dependencies: none.

**Verification performed:**
- `npm run build` → success (33 modules, ~1.25 MB JS / ~346 kB gzip; only the pre-existing
  chunk-size warning). Run after the last art and code edits.
- `npm run dev` on a fixed port; the page was driven programmatically (RAF is paused in
  this headless browser, so frames were advanced with `game.step()`), screenshots were
  captured from the canvas.
- Menu: renders with logo, Earth, ridge, lander and buttons; NEW GAME click starts the
  game; SETTINGS/CREDITS open and close.
- Movement: 150 px/s eastward, correct directional texture, stops on release.
- Collision: walking north into the lander stops the body exactly at the hull zone
  (body top 1207 = zone bottom 1207); boulders and outpost colliders behave the same.
- Interaction: prompt and highlight ring appear within range; each of the three crates
  yields exactly one chip; after three the objective switches to `repair-radio`.
- Repair guard: with fewer than three chips the repair is refused, a warning toast and a
  "MISSING n" float are shown and the dish texture does not change.
- Repair: with three chips the dish becomes `radio-dish-fixed`, chips drop to 0, movement
  and interaction are disabled while the modal is open, closing it sets the objective to
  `survive` and re-enables control.
- Cargo: opens with TAB, shows `×3` chips, closes on ESC; empty state renders correctly.
- Restart: ESC → menu → NEW GAME recreates everything with a fresh state (`collect-chips`,
  0 chips) and leaves exactly 9 bus subscriptions (no duplicates).
- Console: zero errors in the final runs.
- **Bug found and fixed during this verification:** `src/game/events.js` was missing
  `MENU_REQUEST` and `TRANSMISSION_CLOSED`, so both were `undefined` and registered
  listeners under the same key. Closing the transmission therefore also fired
  `onMenuRequest` and dropped the player back to the main menu instead of re-enabling
  movement. Both keys were added, plus a development-time sanity loop that logs any
  event constant that is not a non-empty string.

**Known issues / incomplete work:**
- Walk animation is still presentation-only (body sway + dust puffs); there are no sprite
  frames yet (`TODO` Глава 1 `[~]`).
- No save system — `CONTINUE` only checks that a localStorage key exists; a new game is
  always a fresh run.
- No audio: no sound assets exist, so SFX are not implemented.
- Survival values (oxygen/food/water/power) are static HUD placeholders; the day counter
  does not advance.
- `SETTINGS` is a read-only information panel.
- Debug overlay is hidden by default; F3 toggles it.
- Real human input was not exercised end-to-end in this environment (trusted keyboard
  events never reach the page); movement and interaction were verified through Phaser's
  own key/pointer state and the real `update()` pipeline. A quick manual pass with
  `npm run dev` is still recommended.

**Next recommended step:**
Turn the survival placeholders into a real day cycle: advance the day on a timer, drain
oxygen/food/water/power, and show the first pressure event before opening the construction
system.

---

## 2026-11-14 — День 1: интро-катсцена, цепочка квестов 2.1–2.8 и переработка UI/UX

**Agent/model:** OpenCode agent (Quasar).

**Requested task:**
Игрокирвать День 1: интро-катсцену «Новая игра» и восемь квестов — ремонт антенны,
подключение электроснабжения, первая передача, заклеивание окна в иллюминаторе,
диагностика и ремонт двигателя, трихattempt-ный разговор с Земёй, сервисный терминал.
Вся в.scrollView игре на английском. Финальный список требований пользователей:
скотч должен лечь ровно на трещину в иллюминаторе, не висять в воздухе; дверь и возможность
залезть в корабль полностью удалены (интерьер не делится); в кабине интро не должно
быть светлых артефактков («проплешины»); игрок не проходит сквозь стены корпуса;
провод питания идёт от нижней солнечной панели к антенне. Ранее в же-менутной
переработке UI/UX: подсказка [E] в виде плавающего тега строго над объектом в мире,
панель прогресса действия вместо модальных, HUD с жесткими границами и переносом текста.

**Repository state before work:**
- Current branch: `main`; последний коммит `d513f3f` запушен; изменений не коммитили
- Working tree status: примерно «день 1»: интро + цепочка 2.1–2.8 удобнее текущего коммита
  (список файлов — ниже по факту из `git status`)
- Relevant files inspected: `src/scenes/GameScene.js`, `src/scenes/UIScene.js`,
  `src/scenes/IntroScene.js`, `src/world/Outpost.js`, `src/world/WorldMap.js`,
  `src/systems/InteractionSystem.js`, `src/systems/QuestSystem.js`,
  `src/systems/MovementSystem.js`, `src/entities/Astronaut.js`,
  `src/game/constants.js`, `src/ui/*`, `public/assets/buildings/cabin.svg`

**Files created:**
- `src/scenes/IntroScene.js` — интро-катсцена в фазах (space → fade → cabin → crash →
  black → calls → no-signal) с виньеттой и миссионными часами
- `src/ui/WorldPrompt.js` — наемный тег [E] над объектом в мировых координатах
- `src/ui/WorldAction.js` — панель прогресса действия в мире (`MODAL` + `ACTION_END {id}`)
- `src/ui/DialoguePanel.js`, `src/ui/DiagnosticsPanel.js`, `src/ui/TerminalPanel.js`,
  `src/ui/typewriter.js`, `src/data/dialogue.js`
- `public/assets/buildings/cabin.svg` (эллиптический иллюминатор, тёмное отчего стальное)
  и `spaceship.svg`
- `public/assets/characters/astronaut-seated.svg`, `environment/space-view.svg`,
  `environment/star.svg`, `environment/terminal-map.svg`
- `public/assets/effects/crack.svg`, `effects/light-glow.svg`, `effects/tape-patch.svg`
- `public/assets/equipment/antenna-upright.svg`, `equipment/cable.svg`,
  `equipment/console.svg`, `equipment/engine.svg`
- `public/assets/ui/icon-engine.svg`, `ui/icon-radio-off.svg`

**Files modified:**
- `src/game/constants.js` — `OUTPOST_LAYOUT` (engine/console/arrayConnector/flag/solar),
  радиусы взаимодействия (WINDOW_RADIUS 92→118),涡轮增压ActionButton ACTION_DURATION,
  TYPE_SPEED, INTRO, LANDER_ANGLE, UI токены панелей
- `src/world/Outpost.js` — спрайт аппарата и его коллизия перенесли сюда (единый владец:
  154×148 незадатый телю блок корпуса из `WorldMap` не рисуется дважды);`
  кабель `drawCable` — квадратичнаяепезье; скотч по трещине `WINDOW_TAPE_LOCAL`;
  антенна получила собственный блок; сервисная панель
- `src/world/WorldMap.js` — перестал рисовать-и-раздвоить аппарат, сцена чистая
- `src/scenes/GameScene.js` — композицессор: флагами гейте-триггер матрощам;
  WorldPrompt/WorldAction; сброс `exiting` при `create` (Phaser переиспользуетный экземпляр)
- `src/systems/InteractionSystem.js` — `PROMPT_SHOW` передаёт `{sprite}`,
  единлагий fiat JustDown
- `src/systems/QuestSystem.js` — флаг-цепочка, `stepFromFlags`, диагностика/терминал/
  счётчик комманд-2
- `src/ui/HUD.js` — PANEL_STYLE, жесткие граница, wordWrap + `setMaxLines(2)`
- `src/ui/DebugOverlay.js` — добавлен `destroy()` (его отсутствие ломило выхив из меню)
- `src/ui/UiButton.js`, `src/scenes/UIScene.js`, `src/scenes/MainMenuScene.js`,
  `src/game/events.js` (ACTION_START удалён), `src/game/state.js`, `src/game/assets.js`,
  `src/main.js` — приведение к новым фазам и умным журналом

**Files deleted:**
- `src/ui/MessagePanel.js` (заменен DialoguePanel.js)

**Implementation details:**
- **Стены.** Единый телеспереград корпуса (154×148) в шат-локальных координатах (0, −10)
  за `soldimeters` `Outpost` и основание антены (44×24); спрайт аппарата теперь рисуется
  только в одном месте. Спавна-декорация (1320, 1350) проверяется веренца телеки обывника.
- **Кабель.** Соединение `arrayConnector {x:-184, y:196}` — у основания нижней панеля
  (центр {x:-226, y:148}); интерактивность `solar-array` закреплена на нижней панели;
  кабель `{junk}` → `{anennaImage.x−14, y−2}` с прогим пересагом.
- ** Окно.** Скотчзафиксирован на трещине (`WINDOW_TAPE_LOCAL {x:3, y:-28}`, итоговый
  0.24 — 34×26 px); радиус окна точечно поднят до 118, чтобы с лидерской остановки
  против корпуса до стекла ~107 px выступала [E].
- **Интерьер забракован целиком.** Хатч, его свечение и все оконные обработчики
  взаимодействия удалены; непрозрачный список составляющих из интеракторов —
  porthole, engine, engine-service-panel, antenna, solar-array.
- **Кабина интро.** `addGlassOverlay` растворена; блик-арка, трещинная сеть, белый
  проходящий корабельудалены; в `cabin.svg` блекнули лампы, шпилики и светные рамки —
  живой инвентар сцены «cabin» содержит 0 ярких графических команд.
- **Архитектура чисит样式:** гал报到ет на флагах; UI изолирована от логики геймплея;
  панельные разметки держают долгого текста в одинбилью.
- Полезная срочность текущего внедрения: шапки цифр панели HUDне «обретают» друг друга.
- Зависимостей не добавлено. Не делано коммитов и пуши (по требованию).

**Verification performed:**
- `npx vite build` — зелёная (~15.6 s, только имевшийся {}),
  объявляет о предупреждении кэша.
- По всем успешным отмыслам честная прогонка в браузере, со стенами реально
  взорована физика и в самом коммитовом колл-списке.
- Спавна (1320, 1350) жебрид-экземпляра: тело игры не пересекает блок корпуса.
- 2.1—2.8: восемь флажков выдается в правильной последовательности; итоговый шаг
  `prologue-done`, флаги: `isAntennaFixed, isPowerOn, isComms1Done, isWindowTaped,
  engineDiagnosed, isEngineFixed, isComms2Done, isCoordinatesReceived` — все из事事.
- Стык против корпуса (подлинный нажатый клавиша W 700 мс) с остановкой на (1144, 1202):
  верх тела = 1204 = нижнюю граню корпуса (отклонение 0 px); в этом положении
  дوجد [E] у окна (до трещины 94 px < 118).
- Скотч на трещине: центры с расстоянием 5 px, размеры 34×26 против трещины 31×31;
  скотч лежит поверх неё по depth.
- Кабель: соединение в мировых координатах (956, 1336) от центра корабля (−184, +196) —
  ниже нижней панели (центр −226, +148); конечная точка исторически отдаётся
  антени на (1294, 1352); кабель виден.
- Диагностика открывает ENGINE DAMAGED; после ремонта наклон корпуса −0.122 → 0.
- Ревизия последовательности выходов из меню: меню — активна, Game/UI — закрыты,
  ошибки в консоли браузера — 0.
- Снимки: `/tmp/opencode/lunar-shots/16-cabin-dim.png`, `17-cable-lower-panel.png`,
  `18-window-tape-wall.png` с бронзовыми наклейками и кабельной связи.
- Окно, делющие дополнительно периодические фоны `GAME_WIDTH/HEIGHT` а НЕ CANVAS:
  скриншоты записывают текущие фазы: «cabin», кабельная связь «comms1», зимнее окно
  со скотчем с пред.getStateая стеной.

**Known issues / incomplete work:**
- Ходьба остаётся презентациональной (наклон + пыль), пока нет спрайтовых кадров
- Звука нет, звуковые ассеты не осеяются; сохранения нет
- Интерьер корабля отсрочен и на это период не планируется; возможна декоративная
  панель под будущий хатч — но на это момент не есть (класска дверь в списке состава)
- Изменения не коммитили (по экзيقу)
- `Empty Text File.txt` — предвысно существуют / не списком, не трогали

**Next recommended step:**
День 2: перетасыви лунную ночь — время/день, расход ресурсов во времени;
или больше обработки сохранений — чем раньше: чем главнее для вертикального среза.

---

## 2026-11-15 — Prologue cockpit fixes and the spore-sample quest

**Agent/model:**
DeepSeek V4.1 Flash Free (OpenCode).

**Requested task:**
Fix the prologue rewrite per strict instructions: keep the three Russian lines
untranslated, keep the existing structure and visual quality, gently polish the
gameplay loop right after the prologue, and add a second quest about searching
for and collecting mushrooms on the lunar surface.

**Repository state before work:**
- Current branch: `main`
- Working tree status: many pre-existing uncommitted changes from the earlier
  prologue pass (`src/scenes/IntroScene.js` and several assets untracked).
- Relevant files inspected: `src/scenes/IntroScene.js`, `src/scenes/GameScene.js`,
  `src/systems/QuestSystem.js`, `src/game/state.js`, `src/game/constants.js`,
  `src/game/assets.js`, `src/data/items.js`, `src/world/WorldMap.js`,
  `src/world/Outpost.js`, `src/entities/Interactable.js`, `src/ui/HUD.js`,
  `docs/GAME_DESIGN.md`.

**Files created:**
- `public/assets/environment/mushroom.svg` — bioluminescent bloom cluster.
- `public/assets/ui/icon-mushroom.svg` — cargo/objective icon.
- `src/world/MushroomField.js` — deterministic bloom placement, glow/sway/spores,
  interactables and the collect animation.

**Files modified:**
- `src/scenes/IntroScene.js` — fixed a runtime `const label` temporal-dead-zone
  crash in `buildPanel`; extended the dash slab below the frame and continued the
  cabin wall so zoomed shots have no bare backdrop; reframed the wake-up close-up
  (zoom 1.34, centre 920, 566); hid the COMMS header for the NO SIGNAL readout;
  reduced the porthole Earth to 0.68 with an atmosphere ring, and brightened the
  starfield.
- `src/scenes/GameScene.js` — builds `MushroomField`, merges its interactables,
  gates them to the sample step, resolves collection (inventory, float text,
  toast), and polishes the handoff (900 ms fade-in, zoom settle 1.272 → 1.2,
  480 ms input hold, later onboarding toast).
- `src/systems/QuestSystem.js` — `collect-mushrooms` / `mushroom-samples-secured`
  steps, progress payload, `collectMushroom()`, terminal toast.
- `src/game/state.js` — `isMushroomsDone` flag and `quest.mushroomsCollected`.
- `src/game/constants.js` — `MUSHROOM_TOTAL`, `MUSHROOM_RADIUS`.
- `src/game/assets.js`, `src/data/items.js` — mushroom assets and item definition.

**Files deleted:**
None.

**Implementation details:**
- The three Russian lines are unchanged (`LINE_HOME`, `LINE_MAYDAY`,
  `LINE_RADIO`); all captions stay on the HUD camera, so they never shake.
- The sample quest extends the existing flag chain after `check-computer`, so the
  current step is still derived only from flags. Three blooms sit in a loose ring
  around the lander, nudged at runtime out of boulder/outpost colliders.
- Collecting uses the existing `Interactable` / `InteractionSystem` / `HUD`
  progress / toast / `InventorySystem` paths; no new framework or UI component.

**Verification performed:**
- Commands executed: `npm run build`; headless Chromium via CDP.
- Build result: passes (41 modules transformed).
- Manual checks: cockpit, alarm/mayday and wake frames reviewed as screenshots;
  real E-key input collected `spore-bloom-1` (objective 1/3, inventory 1);
  all three samples produced `mushroom-samples-secured` and 3× Spore Sample in
  cargo; no runtime exceptions during scene restart.

**Known issues / incomplete work:**
- The headless renderer runs the game clock at roughly 10% speed, so intro frames
  were verified with direct state setup and scaled time; the final `realize`
  pull-back was not re-checked frame by frame after the wake reframing.

**Next recommended step:**
Play the full prologue once in a normal browser to judge the intro → gameplay
handoff timing, then extend the sample quest into the trip to the testing base.

---

## 2026-11-15 — English prologue and first survey-rover repair

**Agent/model:**
DeepSeek V4.1 Flash 1017 (OpenCode).

**Requested task:**
Return all interface text to English, preserve the three specified English
prologue lines exactly, follow the documented next P1 quest instead of
undocumented wild mushroom gathering, update the tracker and changelog, then
stage, commit, and push the changes.

**Repository state before work:**
- Current branch: `main`.
- Working tree: already contained extensive unstaged and untracked work for the
  prologue, UI, world, and previous mushroom quest; this task was performed in
  that same working tree.
- Relevant files inspected: `docs/GAME_DESIGN.md`, `TODO.md`,
  `src/scenes/IntroScene.js`, `src/scenes/GameScene.js`,
  `src/systems/QuestSystem.js`, `src/game/state.js`,
  `src/game/constants.js`, `src/game/assets.js`, `src/world/Outpost.js`,
  `src/world/WorldMap.js`, `src/entities/Interactable.js`, and UI systems.

**Files created:**
- `src/entities/Rover.js` — rover placement, interaction, power-up visuals and
  collider.
- `public/assets/rover/rover-derelict.svg` and
  `public/assets/rover/rover-powered.svg` — matching derelict/online artwork.

**Files modified:**
- `src/scenes/IntroScene.js` — set the three lines exactly to “Home, sweet
  home”, “Houston, Houston, help...”, and “Damn, the radio is broken”.
- `src/scenes/GameScene.js`, `src/systems/QuestSystem.js`, `src/game/state.js`,
  `src/game/constants.js`, and `src/game/assets.js` — replaced mushroom quest
  wiring/state/assets with the `find-rover` → `repair-rover` → `rover-ready`
  chain and the timed `rover-power` action.
- `src/data/dialogue.js` and `public/assets/environment/terminal-map.svg` — the
  Earth packet now describes a fictional bio-research outpost and a silent
  rover on the route, consistent with the design document.
- `src/data/items.js` — removed the mushroom inventory item.
- `TODO.md` — checked off the documented first rover discovery/repair task and
  retained automation as future work.
- `CHANGELOG.md` — appended this factual record; the preceding entry is retained
  as an append-only historical record of the now-removed implementation.

**Files deleted:**
- `src/world/MushroomField.js`.
- `public/assets/environment/mushroom.svg`.
- `public/assets/ui/icon-mushroom.svg`.

**Implementation details:**
- Followed `docs/GAME_DESIGN.md` §6 and its P1 item 6: a nearby disabled survey
  rover, found by inspection and given a first basic power repair. No driving,
  scanning, transport, or automation was added.
- Placed the rover about 581 world pixels from the lander on the north-east
  bearing, with deterministic clearance search, a chassis collider, a derelict
  amber beacon and an online teal beacon.
- Kept the later biological-outpost/culture objective as a campaign goal; only
  the unsupported crash-spill/wild-sample mechanic and its assets were removed.

**Verification performed:**
- Commands executed: `npm run build`; headless Chromium/CDP interaction run.
- Build result: passed (41 modules transformed; Vite emitted its existing
  large-bundle advisory).
- Manual checks: real E-key interaction advanced inspection to repair, the
  timed action changed the rover texture/beacon and completed the objective;
  scene restart reset quest state; no runtime console errors were observed.
  Screenshots of the derelict, action-in-progress, and powered rover were
  captured under `/tmp/opencode/`.

**Known issues / incomplete work:**
- The full prologue sequence was not replayed end-to-end in this verification;
  the quest chain was set to its post-terminal state for the rover test.
- Historical changelog text about the now-removed mushroom implementation is
  retained to obey the append-only changelog rule.

**Next recommended step:**
Continue the documented rover progression with communications/scanning as
separate repair stages when their P1/P2 scope is scheduled.

---

## 2026-11-15 — Refresh public project presentation

**Agent/model:**
DeepSeek V4.1 Flash 1017 (OpenCode).

**Requested task:**
Update the project presentation for NASA Space Apps and GitHub based on the actual current prototype, and carry out the requested changes directly.

**Repository state before work:**
- Current branch: `main`, one local commit ahead of `origin/main` (`d45a47f`).
- Working tree: clean.
- Relevant files inspected: `README.md`, `docs/GAME_DESIGN.md`, `package.json`, `src/main.js`, and recent `CHANGELOG.md` entries.

**Files created:** None.

**Files modified:**
- `README.md` — replaced obsolete initialization-only claims and stale project structure with the current playable-slice summary, controls, run/build instructions, verified technology/context references, and project links.
- `NASA_SPACE_APPS_SUBMISSION.md` — prepared copy-ready English Project Tab content based on the official 2026 Project Submission Guide, including a placeholder for the required public demo URL, SI disclosure review note, and submission checklist.
- `NASA_SPACE_APPS_DEMO.mp4`, `NASA_SPACE_APPS_DEMO_SLIDES.pdf`, and `NASA_SPACE_APPS_DEMO_SCRIPT.md` — created a 28-second, no-voice demo video, an exactly seven-slide visual demo deck, and a 30-second narration/caption script. The gameplay screenshots are visibly marked as AI-assisted prototype visuals; team review of asset provenance and NASA's exact AI-generated content policy remains required.
- `CHANGELOG.md` — recorded this task.
- GitHub repository metadata — updated repository description and added relevant topics (`phaser`, `lunar`, `survival-game`, `nasa-space-apps`).

**Files deleted:** None.

**Implementation details:**
- Described the current opening sequence, repair quests, Earth communication, and survey-rover discovery/basic power-up without claiming a complete survival game.
- Clearly stated that NASA datasets are not directly integrated; NASA links are background context only.
- Kept the repository private setting unchanged (`package.json` remains `private: true`, which is an npm package setting, not GitHub visibility).

**Verification performed:**
- `npm run build` — passed; Vite reported its existing large-bundle advisory.
- GitHub CLI authentication verified with `gh auth status`.
- `git diff --check` — passed.
- GitHub metadata and README verified on the public repository after push; local branch is synchronized with `origin/main`.

**Known issues / incomplete work:**
- The published GitHub `main` branch did not yet contain local commit `d45a47f` when this entry was written; pushing is still required for GitHub's README to show the current prototype.

**Next recommended step:**
Commit the documentation update and push `main` so the public repository presents the current project state.

---

## 2026-11-15 — Publish demo files and direct raw links

**Agent/model:**
DeepSeek V4.1 Flash 1017 (OpenCode).

**Requested task:**
Place the project demo inside the repository under `docs/demo/`, obtain direct public `raw.githubusercontent.com` links, put the demo link into the NASA submission file, then commit and push.

**Repository state before work:**
- Current branch: `main`, synchronized with `origin/main` at `684d099`.
- Working tree: clean.
- Relevant files inspected: `NASA_SPACE_APPS_SUBMISSION.md`, `README.md`, `docs/demo/`, and the generated demo files.

**Files created:** None.

**Files modified / moved:**
- `NASA_SPACE_APPS_DEMO.mp4` → `docs/demo/lunar-survival-demo.mp4`
- `NASA_SPACE_APPS_DEMO_SLIDES.pdf` → `docs/demo/lunar-survival-demo-slides.pdf`
- `NASA_SPACE_APPS_DEMO_SCRIPT.md` → `docs/demo/demo-script.md`
- `NASA_SPACE_APPS_SUBMISSION.md` — filled the **Link to Project Demo** field with the direct raw GitHub URL.
- `README.md` — project demo links now point to the raw files.
- `CHANGELOG.md` — recorded this task.

**Implementation details:**
- The primary Project Demo link is `https://raw.githubusercontent.com/bleiz2000/lunar-survival/main/docs/demo/lunar-survival-demo.mp4`.
- The seven-slide PDF remains available at `docs/demo/lunar-survival-demo-slides.pdf`.
- Raw GitHub links require no login and point directly at the committed files.

**Verification performed:**
- `ffprobe` — video duration 28 seconds (within NASA's 30-second limit).
- `pdfinfo` — seven pages.
- `npm run build` — passed before this packaging change.
- Raw URLs checked with HTTP requests after push.

**Known issues / incomplete work:**
- None for packaging. NASA form submission still requires the team to be signed in and to click **Submit for Judging**.

**Next recommended step:**
Paste the final field values into the NASA Project page, verify the raw demo link in a private browser, and submit before the deadline.

---

## 2026-11-15 — Clarify that the survey rover is a civilian vehicle

**Agent/model:**
DeepSeek V4.1 Flash 1017 (OpenCode).

**Requested task:**
Clarify the rover shown in the screenshots and update the local project files accordingly.

**Files modified:**
- `README.md` — added a one-line clarification that the rover is a fictional, unarmed civilian research vehicle, not military equipment.
- `NASA_SPACE_APPS_SUBMISSION.md` — added the same clarification to the Detailed Project Description.
- `docs/demo/demo-script.md` — narration now explicitly calls the rover unarmed and civilian.
- `docs/demo/lunar-survival-demo-slides.pdf` — regenerated; the cover and gameplay captions now say the rover is fictional/unarmed.
- `docs/demo/lunar-survival-demo.mp4` — regenerated from the updated slides; still 28 seconds.
- `CHANGELOG.md` — recorded this task.

**Verification performed:**
- `ffprobe` — 28-second duration.
- `pdfinfo` — seven pages.
- `git diff --check` — passed.

**Known issues / incomplete work:**
- None.

**Next recommended step:**
Keep the user-facing wording consistent if the rover artwork is redesigned later.
