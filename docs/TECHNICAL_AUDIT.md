# Technical Audit — LUNAR: SURVIVAL PROTOCOL

**Auditor:** Senior Game Developer / Software Architect
**Date:** 2026-11-13
**Audited state:** commit `33bdd05` plus all uncommitted Task 02–03 work
**Language note:** the project's design docs and changelog are in English, so this audit is in English too.

**Method.** Read-only audit: every source file was read in full, the game was run (`npm run dev`), built (`npm run build`), and behavior was verified programmatically in the browser (module dependency wiring, movement math, collisions, camera bounds, scene restart, debug overlay). Nothing was modified, created, deleted, committed, or pushed. No new dependencies were installed.

**TL;DR verdict (details in §11): the current foundation is sound and can carry the whole roadmap. Continue on it. Fix the scene-restart crash (E1) before any navigation feature; everything else is incremental.**

---

## Contents

1. Project state overview
2. Current architecture (as it actually is)
3. Strengths
4. Weaknesses
5. Bugs and risks (verified and latent)
6. Readiness for future mechanics + gameplay design review
7. Recommendations (P0–P3)
8. Prioritized plan
9. Target architecture
10. Decisions requiring team agreement
11. Final verdict

---

## 1. Project state overview

- Small, clean prototype: **11 files under `src/`, roughly 640 lines of game code**. One commit in history (`33bdd05`, Task 01); Tasks 02–03 are **uncommitted** — see risk E10.
- Stack: Phaser **3.90.0**, Vite **7.3.8**, Node 26, ES Modules, **zero extra dependencies**.
- `npm run build` passes: single chunk `dist/assets/index-*.js` at **1217 kB min / 335 kB gzip**. Acceptable for a Phaser game; the Rollup warning is cosmetic.
- Implemented and verified working: main menu → game scene; 2560×2560 seeded map with 14 craters, 60 decorative rocks, 1 lander, 12 boulders; WASD/arrow movement with normalized diagonals (speed magnitude exactly 150 px/s in all directions); Arcade collisions against lander/boulders/world bounds; camera follow (lerp 0.08) clamped exactly to world bounds; F3 debug overlay with FPS and coordinates.
- Directory structure matches the target architecture from `GAME_DESIGN.md` §12; the old `src/config/` was removed (deletions are uncommitted) and consolidated into `src/game/constants.js`.
- The single verified defect: **restarting the game scene crashes** in texture generation (`TypeError`), which blocks any future "return to menu / restart / pause" navigation — details in §5 E1.
- Not implemented yet (by design, scheduled as P0-6/7, P1, P2): interaction prompt, HUD, inventory, building, quests, saves, rover. This is planned scope, not architectural debt (§6).

## 2. Current architecture (as it actually is)

### 2.1 Files and real responsibilities (all read in full)

| File | LOC | Real responsibility | Depends on |
|---|---|---|---|
| `src/main.js` | 33 | Phaser config (1280×720, Arcade `debug: false`), scene list, `window.game` debug handle | constants, 3 scenes |
| `src/game/constants.js` | 51 | All game numbers and palette; `SUIT_COLOR` and `VISOR_COLOR` are unused | — |
| `src/scenes/BootScene.js` | 9 | Redirects Boot → MainMenu | constants |
| `src/scenes/MainMenuScene.js` | 70 | Title screen, one NEW GAME button (hover states work) | constants |
| `src/scenes/GameScene.js` | 41 | Composition root: builds map, astronaut, collider, camera, overlay; `update()` fan-out | everything below |
| `src/world/WorldMap.js` | 234 | World layout (seeded RNG placement) + rendering + 5 runtime canvas textures + `solids[]` (lander + 12 boulders) | Phaser, constants |
| `src/world/CameraController.js` | 31 | Camera follow (lerp 0.08), bounds, zoom constant, round pixels | constants |
| `src/entities/Astronaut.js` | 104 | Player entity: sprite + physics body, `exists()`-guarded placeholder texture, waddle tilt presentation | Phaser, constants |
| `src/systems/MovementSystem.js` | 42 | All movement rules: WASD/arrows, diagonal normalization, reads speed via `astronaut.speed` | Phaser only |
| `src/ui/DebugOverlay.js` | 57 | FPS/coords/velocity/camera text, F3 toggle via `JustDown`, `scrollFactor(0)` | Phaser only |

Empty asset folders exist under `public/assets/{characters,buildings,environment,sounds,ui}/`.

### 2.2 Module dependency graph (verified one-way, no cycles)

```text
constants  <- entities, world, camera controller
GameScene  -> WorldMap, Astronaut, MovementSystem, CameraController, DebugOverlay
main.js    -> scenes
```

- Scenes never import each other's guts; `GameScene` is the single composition root; systems and entities are instantiated only there.
- `MovementSystem` and `DebugOverlay` depend on **nothing from the project** except the entity instance they are given — the layering the design doc prescribes is real, not nominal.
- Entities never import systems; no system imports the world map; constants depend on nothing.

### 2.3 Physics and determinism

- Velocity-based movement (`setVelocity`), not per-frame offsets: 150 px/s regardless of frame rate.
- Arcade physics runs a **fixed step at 60 Hz** (`physics.world.fixedStep = true`, verified live) independent of the ~144 FPS render loop — this makes collision behavior stable across refresh rates and matches the doc's "avoid complex physics" stance.
- Obstacles are static AABB bodies (`refreshBody()` called after scaling); the astronaut body is 22×22 (vertically centered on the 22×30 sprite, offset y = 4 — natural, not a bug).
- The world is **deterministic via one seeded RNG stream** (`'lunar-survival-v1'`): craters → rocks → boulders are drawn sequentially from one generator (order-dependence is a latent risk, §5 E4).

### 2.4 Verified behavior (in-browser, programmatic)

| Check | Result |
|---|---|
| `npm run build` | Passes (~11 s); only the large-chunk Phaser warning |
| Menu → NEW GAME | Game scene becomes sole active scene; menu inactive |
| WASD movement | Right = (150, 0); diagonal W+D magnitude = exactly 150 (not 212) |
| Collisions | Walking into the lander stops the body exactly at its edge (verified geometrically) |
| World bounds | Player motion blocked at borders (`collideWorldBounds`) |
| Camera bounds | Top-left → scroll (0, 0); bottom-right → exactly (1280, 1840) = world − viewport |
| Debug overlay | Toggles correctly through Phaser's `JustDown` path |
| Scene restart | **Crashes** — see §5 E1 (verified) |
| Overlay at zoom 2 | **Misplaced off-screen** — see §5 E2 (verified) |

Verification caveat: this browser tooling cannot deliver trusted keyboard input to Phaser, so movement was driven by setting Phaser key state and stepping real frames (the same state a real keypress produces). A one-time manual pass (`npm run dev`, WASD/arrows, F3) on a human machine remains recommended.

## 3. Strengths

1. **The layering is real, not nominal.** `MovementSystem` knows nothing about the world or rendering; it receives the entity and applies rules. `DebugOverlay` depends only on Phaser. Adding a sprint, an interaction system, or an inventory will slot in as new files — no existing file needs to be un-woven.
2. **One composition root.** `GameScene` is the only place systems are wired and the only place `collider()` registrations live. This gives a predictable place to look for "who owns what" in a codebase maintained by two people plus AI agents.
3. **Constants discipline.** All tunable numbers live in one file with units in comments. `GAME_DESIGN.md` demands configurable speed; the code delivers exactly that, and diagonals are properly normalized.
4. **Deterministic, reproducible world.** A seeded RNG means every run shows the same map — a debugging screenshot is reproducible forever. (Its downside — a single sequential stream — is a known risk, §5 E4.)
5. **The correct texture-lifecycle pattern already exists** in `Astronaut.createTexture()` (`textures.exists()` guard). The fix for the world map (E1) is to apply a proven in-house pattern, not to invent anything new.
6. **Physics scope is right for the genre.** Arcade + static AABB bodies is exactly the cost side a 2D top-down survival sandbox wants: cheap, stable, fixed-step, no tuning rabbit holes.
7. **`GAME_DESIGN.md` is unusually disciplined** for a prototype: target tree (§12), data concepts, system interaction rules, "what NOT to build" (§13), and open decisions (§16). The code matches its stated shape, which makes the audit checkable rather than interpretive.
8. **Process artifacts are in place and working:** `CHANGELOG.md` (per-task entries: files, checks, known issues), `TODO.md` (chapter tracker with `[x]/[~]/[ ]/[!]` legend), private Git repo, build script. The audit found no duplicated trackers.
9. **`window.game` debug handle.** Low cost, huge value: it is exactly what made this audit able to verify movement math, collision stopping points, camera clamping, restart behavior and overlay state programmatically. Keep it (dev builds only are fine for now).
10. **No dependency bloat.** Two runtime deps total. No state manager, no ECS, no framework — consistent with the doc's explicit "avoid overengineering" rule.

## 4. Weaknesses

None of these is fatal; each is either a tracked risk (§5) or a decision deferred to the right moment (§10).

1. **No central game state yet.** Position exists only on the entity. Inventory, resources, day counter, quest flags, survival meters have no home. Not doc drift — the doc schedules `GameState` for exactly this moment — but it is the single biggest *structural* gap, and several P1 features (survival consumption, crafting) will need it first.
2. **No event bus and no `data/` layer.** Quests and Earth messages will want decoupled triggers ("beacon repaired" → quest step) and declarative items/recipes/quests instead of switch statements. The doc prescribes both; they are simply not started.
3. **`WorldMap` does two jobs:** world *layout data* (positions, sizes of obstacles) and world *presentation* (textures). Quest logic and interaction ranges will need positions as data before rendering — splitting is cheap now, harder later.
4. **Placement has no guarantees.** Nothing prevents a boulder from spawning on the lander, overlapping another boulder, or sitting on the player's spawn. With the current seed nothing bad happens (verified: zero solid overlaps, nothing within 200 px of spawn), but there is no code enforcing it — it is luck, arranged by a fixed seed.
5. **Object placement consumes one sequential RNG stream** — insertion or removal of any placement category silently shifts every later object (§5 E4).
6. **Lander position knowledge is duplicated:** `LANDER_OFFSET` in constants (for the lander itself) and magic numbers `+140, +200` in `GameScene` (for the spawn near it).
7. **Debug overlay is technically "attached to camera pixel space"** and breaks under `zoom ≠ 1` (verified off-screen at zoom 2). Today zoom is the constant 1, so it is invisible; the day a zoom feature or a scaled UI arrives it becomes a bug.
8. **Scene lifecycle is single-shot.** `create()` exists; no `shutdown`/`destroy` discipline. Phaser auto-cleans scene-owned objects on restart, but shared resources (texture keys, keyboard captures, physics world bounds registration order) are exactly where restart-time bugs surface — status quo: restart crashes (E1) and cleanup is undefined (E5).
9. **Docs are stale in small ways:** `README.md` still documents the deleted `src/config/` and says "no gameplay implemented yet"; CHANGELOG entries for Tasks 02–03 misname the agent as "GLM-5.3-Flash Free"; `SUIT_COLOR`/`VISOR_COLOR` constants are exported but unused while `Astronaut` hardcodes the same hex values.
10. **`physics.arcade.debug: false` is a dead flag** — no runtime toggle exists anywhere (the TODO has an open line for it).
11. **Everything since `33bdd05` is uncommitted** (Tasks 02, 03, docs, TODO). The working tree is verified and stable, but it is one accident away from being lost — commit (with permission) is the cheapest insurance in the project.

## 5. Bugs and risks

Numbered findings. Items marked **verified** were reproduced live in the browser; **latent** means the trigger does not exist today but the code permits it.

### E1 (P0, verified) — Scene restart crashes in texture generation

- **Reproduction:** `window.game.scene.getScene('Game').scene.restart()` from the menu-return path (or any future restart/game-over) produces:
  - console warning `Texture key already in use: regolith`
  - `TypeError: Cannot read properties of null (reading 'getContext')` at `WorldMap.generateRegolithTexture` (`createCanvas` returns `null` when the key already exists)
  - the scene stops activating; the game is stuck.
- **Why it matters:** every navigation feature (ESC to menu, pause, game over, "restart mission") lands on this. Menu→Game already works only because it never goes back.
- **Fix:** guard each generator with `if (this.scene.textures.exists(key)) return;` — the proven pattern already present in `Astronaut.createTexture()`. Five small methods in one file.
- **Files:** `src/world/WorldMap.js`. **Risk of fix:** none. **Can wait?** No — this is the only confirmed crash and the next milestone adds navigation-adjacent features (HUD panels, menu return).

### E2 (P1, verified) — Debug overlay escapes the screen under zoom ≠ 1

- **Reproduction:** `cameras.main.setZoom(2)` moves the overlay text ~616 px off-screen (measured). `scrollFactor(0)` objects are still scaled/offset by camera zoom in Phaser.
- **Why it matters:** zoom is constant today, so the bug is dormant. Any zoom feature (bug-fix mode, building placement closer-in, pan/zoom UI) instantly exposes it. HUD panels built the same way will inherit it.
- **Fix options:** (a) account for zoom in the overlay's positioning; (b) render debug/HUD text in a separate no-scroll **UI scene** layered above the game scene (the robust option; the doc's tree already anticipates UI as a distinct concept); (c) move debug output to a DOM element (dev-tool-like). Option (b) also solves future HUD needs.
- **Files:** `src/ui/DebugOverlay.js` (and later a UI scene). **Risk:** low. **Can wait?** Yes, until zoom or HUD work begins — but choose option (b) *before* the first HUD panel is written, otherwise it gets built twice.

### E3 (P1, latent) — Random placement can overlap obstacles and spawn

- **Facts:** boulders/craters/rocks are placed in generous rectangles with no exclusion checks against each other, the lander, the spawn point, or future quest sites. The current seed is clean (verified: zero overlapping solid pairs; nothing within 200 px of spawn), so it is invisible today. Change the seed, the counts, or insert a new placement category and everything re-rolls.
- **Why it matters:** this is the seed of every "player spawns inside a wall" or "quest object unreachable" bug, and P1 (quests, rover) makes placement content denser.
- **Fix:** a small placement helper with keep-out zones (spawn radius, lander footprint, future quest sites) and rejection sampling; keep it seeded and deterministic.
- **Files:** `src/world/WorldMap.js`, `src/game/constants.js` (zone sizes). **Risk:** low. **Can wait?** Yes — with the first P1 map content.

### E4 (P1, latent) — One sequential RNG stream makes layout order-dependent

- **Facts:** a single `RandomDataGenerator` instance feeds craters, then rocks, then boulders (and the boulder scales) in insertion order. Inserting any new dense category (deposits, wrecks) silently re-positions every later object.
- **Why it matters:** imagine adding "regolith patches" *before* boulders in `create()` — all boulders move, and any recorded save data referencing coordinates becomes stale. It also fuses "content" with "order of implementation".
- **Fix:** one `RandomDataGenerator` **per category** with derived seeds (`'lunar-survival-v1-boulders'`, etc.). Order independence, same determinism, tiny change.
- **Files:** `src/world/WorldMap.js`. **Risk:** near zero (the current clean seed changes shuffle slightly — it re-rolls; that is acceptable for a prototype). **Can wait?** Yes — with E3.

### E5 (P1, latent) — No scene lifecycle discipline (`shutdown`/`destroy`)

- **Facts:** no `shutdown` handlers, no `destroy()` on `WorldMap`/`Astronaut`. Today the only restart crash is E1, but correctness on restart depends on Phaser auto-cleanup plus the shared registry (texture keys, keyboard captures, `window.game`). Once menu-return exists, every restart is a fresh `create()` with textures surviving from the previous run — safe only while all generators are guarded.
- **Fix:** after E1's guards, add an explicit contract: a `destroy()` on world objects that tears down `solids` and scene-captured inputs, and an `events.once('shutdown', …)` in `GameScene`. Keep it proportionate: Phaser owns scene-scoped children; the code owns shared/global things.
- **Files:** `src/scenes/GameScene.js`, `src/world/WorldMap.js`, `src/entities/Astronaut.js`. **Risk:** low. **Can wait?** Yes — implement together with the first navigation feature.

### E6 (P1) — Lander position is known twice

- `LANDER_OFFSET` (constants, used by WorldMap) *and* the hard-coded `+140, +200` spawn offsets in `GameScene` both encode "where the lander is, relative to center". Changing one silently breaks the other ("spawn beside the lander" guarantee).
- **Fix:** export a single `LANDER_SPAWN`/`ASTRONAUT_SPAWN` pair (or a spawn function on `WorldMap`). 10 minutes, removes a future collision-into-lander bug.
- **Files:** `src/game/constants.js`, `src/scenes/GameScene.js`. **Risk:** none. **Can wait?** Should be done with E1's touch of these files — cheap.

### E7 (P2) — Debug overlay key (F3) and default browsers

- F3 has no universal browser shortcut conflict, but it can clash with some desktop environments and third-party tools; also, "F-keys for debug" is a convention that should be chosen deliberately, not inherited by accident.
- **Fix:** decide the debug key set once (e.g., F9 or Backquote) and record the choice in `GAME_DESIGN.md` §2 controls table (team decision, see §10). Cosmetic.
- **Files:** `src/ui/DebugOverlay.js`, `docs/GAME_DESIGN.md` (only with permission — audit does not edit it). **Can wait?** Yes.

### E8 (P2) — Dead `physics.arcade.debug: false` flag

- The config flag has no toggle anywhere; TODO.md carries an open line for a "physics rendering mode" instead. Dead configuration is small-time rot: it misleads readers about how debug rendering is intended to work.
- **Fix (either):** wire a runtime toggle (`physics.world.drawDebug` + `createDebugGraphic()`, verified live this works) into the existing F-key overlay, or remove the flag. Choose when the debug overlay itself is reworked (E2).
- **Files:** `src/main.js`, `src/ui/DebugOverlay.js`. **Can wait?** Yes.

### E9 (P2) — Documentation drift

- `README.md`: project structure section still shows the deleted `src/config/`; status says "no gameplay implemented yet" (movement/collisions/camera/debug overlay exist and are verified).
- `CHANGELOG.md`: Tasks 02–03 entries name the agent "GLM-5.3-Flash Free" — the log is historically wrong. Per its own append-only rules, the correction belongs in the **next** entry, not an edit.
- `Empty Text File.txt` (the source generator script) is still untracked in the root; recommend deleting.
- **Files:** `README.md`, `CHANGELOG.md` (next entry), root. **Can wait?** Yes, P2 housekeeping.

### E10 (P0/P1, process risk) — Everything since `33bdd05` is uncommitted

- Tasks 02–03, docs, TODO — a fully verified working state — exists only in the working tree. One accident (ours or the machine's) loses days of work. The audit cannot commit (explicitly forbidden); this recommendation is directed at the team: commit the current verified state as soon as permission is given.
- **Can wait?** No — but it requires only permission, not work.

### E11 (P3, latent) — `roundRect()` browser floor

- `CanvasRenderingContext2D.roundRect` requires Chrome/Edge 99+, Firefox 112+, Safari 16+. The desktop-browser target meets this comfortably; the risk only materializes if the game ever runs in an old embedded/WebView. Optionally add a tiny polyfill or a README "modern browsers" note. **Can wait indefinitely.**

### E12 (P3) — Single 1.2 MB chunk

- Phaser alone accounts for the bulk; 335 kB gzip load for a game is fine. `manualChunks` is a five-line config if ever needed for a web deployment. Not a priority.

### E13 (P2) — `window.game` global debug handle

- Acceptable for a prototype and genuinely useful (this audit used it). Before any release/publishing, gate it behind `import.meta.env.DEV`. **Can wait.**

### E14 (P3) — Unused constants and hardcoded duplicates

- `SUIT_COLOR`/`VISOR_COLOR` are exported but unused while `Astronaut.createTexture` hardcodes the same hex values. Either use the constants or delete them. One-minute change; do it whenever those files are touched.

### E15 (design-inherited, tracked) — No `GameState`, event bus, or `data/` layer yet

- Explicitly listed here only because it is the most common future question: *when* the doc's §12 `GameState`/`events.js`/`data/` should appear. The audit's answer: **at the moment the second gameplay system arrives** (the inventory), not before, and not as a framework. Details in §6 and §10.

## 6. Readiness for future mechanics + gameplay design review

### 6.1 Readiness matrix

The question the roadmap demands: can inventory, resources, interaction, base building, machines, power, survival, quests, saves, exploration and the rover be added to *this* tree without rewrites?

| Upcoming feature | Verdict on current code | What must come first | Blocks on what exists? |
|---|---|---|---|
| E-prompt interaction (P0-6) | ✅ ready | nothing — new `InteractionSystem` + range check + `ui/InteractionPanel` | none |
| HUD with placeholder meters (P0-7) | ✅ ready | decide overlay structure first (E2 option b) | none |
| Inventory (P1) | ✅ ready | `data/items.js` + `GameState` container | none — additive |
| Manual resource gathering (P1) | ✅ ready | interaction system + items | none |
| Modular base building (P1) | ✅ compatible | typed solids/physics groups instead of the `solids[]` array (E16 below) | additive |
| Machines / recipes (P1) | ✅ ready | `data/recipes.js` + `SurvivalSystem`-style state access | additive |
| Power (P2) | ✅ compatible | single source of truth for balances (doc rule: no duplicate balances) | additive |
| O2 / water / food survival (P2) | ⚠️ needs | `GameState` container + a single "consumption" owner + a clear UI reason for declines (doc §9) | additive |
| Quests / story events (P1–2) | ⚠️ needs | minimal event bus + `data/quests.js`; placement exclusions (E3) | additive |
| Saves (P2) | ✅ compatible | serializable `GameState` (doc rule: never serialize Phaser objects) | additive |
| Exploration (P1–2) | ✅ compatible | map content decoupled from RNG stream (E4); exclusion placement (E3) | additive |
| Rover (P1–2) | ✅ compatible | its own entity + physics group; solids ownership (E16) | additive |

**Score: 8/11 fully ready, 3/11 ready-with-a-named-precondition.** Crucially, every precondition is *a new file or a small refactor*, never a rewrite of existing behavior. That is the strongest possible answer for this phase.

**E16 (deferred detail):** the `solids[]` array currently means "everything the astronaut cannot walk through". When buildings and the rover arrive, ownership must become typed (per-entity or physics-group registration) or buildable structures inherit obstacle semantics and collide with the player incorrectly. No change now; change when the first building lands.

### 6.2 Game design review (GAME_DESIGN.md)

Judged as a design doc: **strong, coherent, and self-limiting in the right ways.** The concentration of good decisions (science-inspired chains, "what NOT to build", open decisions listed as open) is rare in prototypes.

**What works in the design:**

1. **The rescue-timeline hook (Day 30 estimate → Day 20 update → Day 25 arrival)** gives the game a built-in arc and urgency without a hard difficulty wall. The acceleration is a narrative event, not a cheat.
2. **Resource chains are honest science:** ice → filtration → water → electrolysis → O₂/H₂ → fuel cell (with stated conversion losses), regolith never magically becoming metal. Each hop is a gate that makes the next machine *meaningful* — the opposite of "hundreds of materials with no need".
3. **The rover is designed with its own trick:** it exists to convert the player from hauler to explorer/manager. The six repair stakes each require a small quest — automation is *earned*, not granted — which directly answers the genre's most common complaint ("I am a walking spreadsheet").
4. **Fictional framing discipline** (the biological outpost is explicitly fictional; no fake NASA claims) protects both accuracy and development speed. Good.
5. **Scope control is written down** (§13: no multiplayer, no procedural infinite world, no detailed pressurization…) — for a two-person team with agents, that section is worth more than any architecture chart.

**Detected risk zones (pacing/UX, not concept):**

1. **Early-game walking may be flat.** At 150 px/s the 2560 px map takes ~17 s edge to edge. Until the rover exists, destinations are meant to be near the lander; keep the first P1 quest sites inside a 10–15 s walk radius and scale the map only when the rover lands. (Sprint + stamina is already on the TODO — good instinct.)
2. **"Walk, pick up, walk back" fatigue.** The doc already forbids it as the only quest pattern; the audit's addition: make sure *collection* itself carries a micro-moment (three boulders → gain, filter replacement → timer tension), not just a distance.
3. **Food must not be pure garnish.** If emergency rations cover all 25 days, the grow chamber is decoration. Align ration depletion so the fungal culture arrives just before the deficit would matter; that single tuning choice determines whether "food" reads as a real strategy.
4. **Lunar night must be an event, not a number.** Compressed day/night means a battery deficit can become invisible if it lacks a visible nightly state (sunlit HUD dimming, power shutdown during the dark stretch). The doc's own §9 rule ("UI must communicate why a resource is declining") should be enforced with real presentation, not just icons.
5. **Rover repair stakes need differentiated feel.** Six resource-gated stages can collapse into the same grind six times. Cheap differentiators, each already named by the doc: disabled legs → pathfinding frustration (small terrain puzzles), scanner → reveal interest, scoop → haul economy, cargo → automated trips. If a stake adds only numbers, cut it — scope control wins.
6. **Quest density before the narrative is authored.** The story beats table is good; the risk is implementing top-down systems (electrolysis) before their own quests exist, making them unusable-unattended features. Rough sequencing rule from the doc's milestones already handles this — P1 keeps it small; trust the doc's order.
7. **Unresolved-but-load-bearing open decisions** (win day 25, interior representation, exact rates) are all listed in §16 — the audit only insists they get resolved *by* their milestone (see §10).

**How to increase fun without simulation bloat (suggestions, concept-preserving):**

- Make the "one clear objective" (doc §3) always visible and one mouse-click-away actionable — an on-screen objective line plus a compass marker; small HUD, big pacing win.
- Convert Earth communications (doc §7) into short, dated messages on the day counter — cheap to implement, creates the rhythm of "What did Earth say today?"
- Let discoveries be *findable*, not just given: one-way items (old rover logs, research terminal entries readable in the field) are already specified; a small in-world jukebox rewards curiosity at near-zero mech cost.
- One environment cycle per campaign (the fungal culture visibly growing; base power flickering at dusk) teaches more systems in one minute of watching than a tutorial popup ever will.

No design *changes* are proposed — only implementation guardrails.

### 6.3 TODO.md accuracy check

`TODO.md` sits at the repo root (found there, as expected). Its chapter structure and legend (`[x]` done / `[~]` beta / `[ ]` not started / `[!]` blocked) are consistent, and it is **the only tracker of its kind** — no duplicates exist (verified across the tree; `CHANGELOG.md` is a log, `GAME_DESIGN.md` is immutable design — roles do not overlap).

Line-by-line verification of checked items against the code:

| Chapter | Claim | Reality | Verdict |
|---|---|---|---|
| 0 | Repo/Vite/docs/menu/map `[x]` | All exist and work | ✅ accurate |
| 1 | `Astronaut` entity `[x]` | Exists; sprite + body verified | ✅ accurate |
| 1 | Walk animation `[~]` | Waddle tilt on placeholder texture; no sprite animation exists | ✅ accurate (honest beta mark) |
| 2 | WASD `[x]`, arrows `[x]`, normalized diagonals `[x]`, configurable speed `[x]`, logic out of scene `[x]` | All verified live (speed exactly 150 in every direction; `MovementSystem` owns the rules) | ✅ accurate |
| 3 | Camera follow `[x]`, lerp `[x]`, bounds `[x]`, configurable zoom `[x]` | All verified; zoom is a configured constant (no zoom UI/motion — TODO does not claim one) | ✅ accurate |
| 4 | Map 2560², surface, lander, boulders `[x]` | All render and behave as claimed | ✅ accurate |
| 5 | Solid/boulder/lander/world-bounds collisions `[x]` | Verified: bodies block exactly at edges; motion blocked at borders | ✅ accurate |
| 5 | Polygon bodies `[ ]` | Correct: every body is an AABB today | ✅ accurate |
| 6 | Debug overlay `[x]`, F3 toggle `[x]` | Verified via Phaser's `JustDown` path; real-keypress end-to-end pending one manual pass (tooling limitation) | ✅ accurate |
| 6 | Physics debug rendering `[ ]` | Correct: `physics.arcade.debug: false` is a dead flag (E8) | ✅ accurate |
| 7–9 | HUD / P1 / P2 `[ ]` | Nothing exists yet | ✅ accurate |

**Factual mismatches found: 0.** The tracker is honest against the code — rare and commendable.

Two structural observations (not mismatches, recorded as recommendations):

1. **Traceability gap (R9):** the design doc's P0 items 6–7 (interactable object with E-prompt; HUD placeholder values) are the P0 milestone remainder, but TODO reflects them only as ordinary unchecked lines in Chapters 7–8. A "P0 remaining" note would make milestone progress visible at a glance. The audit does not edit `TODO.md` (read-only scope); the team should add it.
2. Chapter 7's heading says "(не начано)" and the two lines are plain— harmless; left as-is.


## 7. Recommendations (P0–P3)

Each item: problem → why it matters → proposed change → files affected → risks → can it wait?

### P0 — fix before further feature work

**R1. Guard texture creation (fixes E1).**
- Problem: `WorldMap.generate*Texture` calls `createCanvas` without an `exists()` check; scene restart throws and stalls the game.
- Why: every navigation path (menu return, pause, restart) hits it; it is the only confirmed crash.
- Change: add `if (this.scene.textures.exists(key)) return;` to the five generators, mirroring `Astronaut.createTexture()`.
- Files: `src/world/WorldMap.js`. Risks: none. Can wait?: **no**.

**R2. Consolidate lander/spawn position knowledge (fixes E6).**
- Problem: `LANDER_OFFSET` and `GameScene`'s `+140/+200` magic numbers each encode lander geometry.
- Why: silent divergence on the next map tweak produces a spawn-collision or spawn-inside-lander bug — both verified unreproducible today, exactly because it hasn't been edited yet.
- Change: single exported spawn definition consumed by both `WorldMap` and `GameScene`.
- Files: `src/game/constants.js`, `src/scenes/GameScene.js`. Risks: none. Can wait?: no (trivial; pair with R1's file touches).

**R3. Commit the verified working tree (fixes E10).**
- Problem: all Task 02–03 work (gameplay, docs, TODO) is uncommitted.
- Why: known-verified state should not live only in a working tree; one accident erases days.
- Change: commit (and push) with a meaningful message. Requires explicit team permission — the audit does not commit.
- Files: whole tree. Risks: none. Can wait?: no.

### P1 — architectural improvements to do soon

**R4. Placement exclusions + per-category RNG streams (fixes E3 + E4).**
- Problem: placement has no keep-out logic and shares one sequential RNG stream.
- Why: the moment quest sites, wrecks or the rover are placed, overlaps and order-shifted layouts become bugs; save data referencing positions becomes fragile.
- Change: derived seeds per category; rejection sampling with exclusion zones (spawn, lander, quest sites) declared in data, not code comments.
- Files: `src/world/WorldMap.js`, `src/game/constants.js`. Risks: minor — current layouts re-shuffle once. Can wait?: yes, until the first P1 map content; do not let it be the last thing.

**R5. Scene lifecycle contract (fixes E5).**
- Problem: no `shutdown`/`destroy` discipline on restart.
- Why: once menu return exists, restart correctness depends on undefined behavior of shared resources.
- Change: `destroy()` on world-owned shared objects; `events.once('shutdown', …)` in `GameScene` documented as the teardown point.
- Files: `src/scenes/GameScene.js`, `src/world/WorldMap.js`, `src/entities/Astronaut.js`. Risks: low. Can wait?: yes — implement with the first navigation feature.

**R6. Zoom-safe debug overlay / UI layer decision (fixes E2).**
- Problem: overlay escapes the screen at `zoom ≠ 1`; HUD built the same way inherits it.
- Why: zoom and HUD are upcoming; building panels twice is real cost.
- Change: render fixed-HUD text in a separate Phaser UI scene (recommended) or DOM overlay; applies the decision once.
- Files: `src/ui/DebugOverlay.js`, new `src/scenes/UIScene.js` (when chosen). Risks: low-medium (input focus/sharing between scenes). Can wait?: yes — but *before* P0-7 HUD implementation begins.

**R7. Introduce `GameState` + minimal events when the second system arrives (fixes E15).**
- Problem: no central state, no bus, no `data/`.
- Why: inventory/survival/crafting need a single source of truth (the doc's explicit "do not store duplicate balances" rule) and quests need decoupled triggers — but inventing them earlier than needed creates the exact overengineering the doc forbids.
- Change: when `InventorySystem` is created (P1 start), add `src/game/state.js` (serializable plain object) + `src/game/events.js` (Phaser registry or 20-line emitter), then `data/items.js`.
- Files: new `src/game/state.js`, `src/game/events.js`, `src/data/items.js`. Risks: low. Can wait?: yes — and it *should* wait; this is a timing recommendation.

### P2 — can be deferred

**R8. Documentation housekeeping (fixes E9/E14).** Update `README.md` (structure, status); delete `Empty Text File.txt`; next CHANGELOG entry corrects the agent-name record (append-only — never rewrite history); use or remove unused `SUIT_COLOR`/`VISOR_COLOR`. Files: `README.md`, root, `CHANGELOG.md` (next entry), `src/game/constants.js`, `src/entities/Astronaut.js`. Risks: none. Can wait?: yes.

**R9. Add missing TODO lines for P0-6 and P0-7 (fixes traceability gap).** TODO.md's chapters cover HUD and interaction, but the two *P0* items (E-prompt, HUD placeholders) have no line that says "this is P0 and blocks the milestone". One line each under a "P0 remaining" note. Files: `TODO.md`. Risks: none. Can wait?: yes — but cheap and prevents milestone confusion.

**R10. Dead `physics.arcade.debug` flag (fixes E8).** Either wire a runtime physics-render toggle next to the debug overlay or remove the config flag. Files: `src/main.js`, `src/ui/DebugOverlay.js`. Risks: none. Can wait?: yes.

**R11. Gate `window.game` behind dev builds (fixes E13) — before any public build.** Files: `src/main.js`. Risks: none. Can wait?: yes.

### P3 — optional polish

**R12.** Physics-debug drawing via `world.drawDebug` behind a dev key (nice when tuning colliders; verified live it works).
**R13.** `manualChunks` config only if a real web-deployment need appears (bundle is fine).
**R14.** Tiny `roundRect` polyfill or a documented "modern browsers" floor in README (fixes E11).
**R15.** Unit tests for pure logic (e.g., `MovementSystem` direction math in a plain module) once a test runner is justified by at least three systems — not before; harness cost should not precede content.
**R16.** When first art assets land, move runtime texture generation into `PreloadScene` per the target tree and delete the canvas-generation paths — never keep both paths alive (fixes E-pipeline, mentioned in §2.1).
All P3 items: risks trivial; wait indefinitely.

## 8. Prioritized plan

**Wave 1 — now (≤ half a day of work):**
1. R1 + R2 (one commit-sized change). Verify: build, restart scene twice, menu-return happy path.
2. R3: commit the verified state.
3. Proceed to the design doc's P0 items 6–7 (interactable object with E-prompt; HUD placeholders) — no audit item blocks them.

**Wave 2 — start of P1 (inventory arrives):**
1. R7 exactly then — state container + minimal events + `data/items.js`.
2. R4 before placing quest sites, the rover, or wrecks.
3. R5 + R6 when menu return / pause / zoom work begins.
4. R9, R10 alongside.

**Wave 3 — P2 launch:**
1. R11 before any external build; quest/log events on the bus; save/load with the serializable `GameState` (doc rule respected from day one).
2. Type-specific solids for building (E16) when structures are placed.
3. R12–R16 opportunistically.

**Continuous:** every agent appends to `CHANGELOG.md` after changes and updates `TODO.md` checkboxes — both are currently being honored by this project's history and should keep working that way.

## 9. Target architecture

The good news: **the doc's §12 tree already is the target**, and the current code already forms its leftmost branches. The audit does not propose a new one; it proposes the sequence of the missing branches so each appears *when its feature needs it* — not as speculative scaffolding.

```text
src/
├── main.js                      # unchanged: config + scene bootstrap
├── game/
│   ├── constants.js             # exists today
│   ├── state.js                 # NEW at InventorySystem (R7) — serializable GameState
│   └── events.js                # NEW with state.js — event-name registry + tiny emitter
├── scenes/
│   ├── BootScene.js             # exists today
│   ├── MainMenuScene.js         # exists today; gains Continue when saves arrive
│   ├── PreloadScene.js          # NEW with first asset pack (replaces canvas textures)
│   ├── GameScene.js             # composition root; gains shutdown contract (R5)
│   ├── UIScene.js               # NEW for HUD/on-screen text (R6) — zoom-safe by design
│   └── PauseScene.js            # NEW with menu return/ESC
├── entities/
│   ├── Astronaut.js             # exists today
│   ├── Interactable.js          # NEW first (P0-6), then Rover, Building with their own groups
│   ├── Rover.js                 # NEW in P1/P2
│   └── Building.js              # NEW in P1
├── systems/
│   ├── MovementSystem.js        # exists today
│   ├── InteractionSystem.js     # NEW with P0-6
│   ├── InventorySystem.js       # NEW in P1 — the trigger for state.js/events.js
│   ├── ResourceSystem.js        # machines + recipes in P1
│   ├── BuildingSystem.js        # P1, with typed solids (E16)
│   ├── SurvivalSystem.js        # P2: O2/food/water/power curves, one owner per resource
│   ├── QuestSystem.js           # P2, driven by events
│   └── SaveSystem.js            # P2: serialize state.js, never Phaser objects
├── world/
│   ├── WorldMap.js              # today + R1 guards, R4 placement/exclusion
│   ├── WorldGenerator.js        # split out of WorldMap when layout becomes data (P1)
│   └── CameraController.js      # exists today
├── data/                        # NEW in P1: items.js, recipes.js, buildings.js, quests.js
├── ui/
│   ├── DebugOverlay.js          # today (re-parented into UIScene under R6)
│   ├── HUD.js, InteractionPanel.js, InventoryPanel.js, BuildMenu.js, MessagePanel.js  # per doc §11–12
└── utils/                       # small pure helpers when ≥2 modules need the same one
```

Rules the audit asks to keep (all from the doc, already observed in current code): scenes compose only; systems own rules; UI calls system APIs and never mutates state directly; data files define content; state stays serializable; no ECS/Redux/DI/framework.

## 10. Decisions requiring team agreement

These are choices the code intentionally defers. Neither the audit nor the current code forces them — the milestone triggers should be honored:

1. **Scale policy** (`Phaser.Scale.NONE` today vs `FIT`/`RESIZE`): decides HUD anchoring and input mapping. Should be settled before P0-7/HUD. (Doc §16 leaves it open.)
2. **Texture lifecycle:** guard-only (recommended — matches `Astronaut`) vs destroy-on-shutdown for scene-scoped textures. Ratify guard-only when R1 lands.
3. **Debug overlay destination:** Phaser `UIScene` (recommended) vs DOM element — settles the "UI layer" idiom for all future panels.
4. **Debug key set:** F3 today; deliberate choice preferred (e.g., F9) with a controls-table note (doc §2) — needs permission to touch the design doc.
5. **Save backend at P2:** most likely `localStorage`; payload versioning needed because the map seed + `GameState` shape will evolve.
6. **Event bus scope:** Phaser registry/events vs a tiny custom emitter — decide when `events.js` is created (R7), keep it minimal until quests arrive.
7. **Win day 25 vs 30 and day length / consumption rates** (doc §4, §16): pure design choices; settle before the Expedition quests are authored.
8. **Interior representation** (separate scene vs overlay panel, doc §2/§16): needed when the "enter the lander" line in TODO (Глава 4) moves from `[ ]` to `[x]`.
9. **Timing of `PreloadScene` + art:** replace placeholder texture generation at the first real asset, all-or-nothing (never two parallel texture paths).
10. **CHANGELOG agent-name correction:** append-only discipline says the *next* entry notes the Tasks 02–03 attribution error rather than rewriting history — team should ratify this interpretation.

## 11. Final verdict

**Continue on this foundation. Nothing requires a redesign now.** It is possible to say this honestly because the audit verified instead of assuming:

- The boundaries among scenes, entities, systems, world and UI are real in code, not just labels, and the dependency graph is acyclic with `GameScene` as the single composition root.
- Physics scope (Arcade, fixed-step, static AABBs) is the appropriate commitment for the genre; movement math and camera clamping are verified correct.
- The design document's target architecture is already half-built by the current tree, and every remaining piece (state, events, data, save, rover) is **additive** — no planned mechanic forces a rewrite of what exists today.
- Found issues are implementation-level: one verified crash (E1) with a proven in-house fix pattern already in the codebase; a dormant overlay bug (E2) with a choice between two cheap resolutions; placement and lifecycle risks (E3–E5) whose fuse lights only when P1 content arrives; small hygiene items (E6–E14).
- The game design itself needs no conceptual change; its risks (walking flatness, quest-template fatigue, food relevance, the visibility of the night) are pacing and presentation guardrails, each mapped to an implementation moment in §6.2.

**What must change now:** one text-guard commit (R1), one constants consolidation (R2), and one commit of the verified tree (R3). That is the entire P0 list, and it takes an hour.

**What must not happen:** speculative scaffolding — state managers, event framework, test harnesses, data generation — added before the features that need them (the doc's own §13 warns exactly this). The current restraint is the reason this audit can recommend "continue" for a project that hasn't yet built its hardest feature.

*This audit read only. No recommendations were implemented. No file outside this report was modified. Implementation of any recommendation awaits explicit permission.*

---
*End of audit.*





