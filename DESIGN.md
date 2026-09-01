# Idle Game (working title) — Design Document

Stack: **TypeScript + Phaser 3**, web-first (packageable to desktop later via Electron/Tauri, same way Idleon shipped to Steam from a web build).

## 1. Pillars

1. **Active combat feels good by hand, but is never required.** Playing a character directly (movement, aiming, skill usage) should be genuinely fun and reward skill. Leaving that same character on a zone to auto-farm should still produce real progress, just slower.
2. **No subsystem is an island.** Every system consumes something another system produces, and gates something else in turn. There is no single "main" progression bar — advancement means poking multiple systems at once.
3. **The account is the unit of progression, not the character.** A roster of specialized characters feeding shared account-wide systems (stat pools, storage, base bonuses) is the actual game; individual characters are tools.
4. **It has to feel hand-made.** Named systems with real identity, hand-tuned pacing curves, and tight feedback (juice) — not generic placeholder labels or a single exponential formula copy-pasted everywhere.
5. **Path of Exile's camera and combat feel, Idleon's session shape.** Top-down, hotbar skills, pack-clearing, ground loot with rarity readability — but sessions stay short and idle-compatible. This is *not* an ARPG-depth itemization/build-crafting game; it borrows PoE's moment-to-moment feel, not its scope.

## 1a. Combat & Perspective

- **Camera**: top-down, PoE-style (a 3/4-from-above read, not a flat orthographic map). Character is on-screen at all times during active play; camera follows.
- **Movement**: WASD movement with independent mouse aim/targeting for skills — the direct ARPG scheme, not click-to-move. Movement and aiming are decoupled so kiting/positioning is a real skill, not just a pathing click.
- **Combat kit**: a small hotbar of skills per class (start with 2–4, not PoE's full gem economy) — a basic attack plus a couple of cooldown-based skills, enough for movement+positioning+ability-timing to matter without becoming a build-crafting game in itself.
- **Encounters**: monster *packs*, not one-at-a-time spawns — clearing a pack in a few seconds with an AoE or a combo is the core "juice" moment, same as PoE's map-clearing satisfaction.
- **Loot**: drops on the ground with rarity-coded glow/text (common/magic/rare-style color language is a well-understood shorthand — worth reusing even in a lighter form) rather than an instant silent inventory add, so active play has something to *see* happen.
- **Zone = session unit**: a zone can be run actively (PoE-map-style clear, a few minutes) *or* assigned to idle-farm. Same content, two ways to engage with it — this is the hinge that keeps it Idleon-shaped instead of ARPG-shaped: there's no expectation of running the same zone actively over and over to optimize a build, the way PoE maps demand.
- **Active clear rate > idle rate, deliberately.** A well-played active clear should meaningfully out-pace parking the same character on the same zone to idle-farm (better XP/loot per minute, not just "the same numbers plus a screen to look at"). Idle-farming stays a fully valid way to progress — it's the fallback for zones/characters you aren't actively playing right now — but it should never be the *strictly optimal* way to spend a character's time, or there's no reason to ever pick up the controller. Tune the gap so it rewards skill without making idle feel like a wasted option.

## 2. Core Loop

**Per-character loop:**
pick a zone → fight there actively (control the character, dodge/aim/combo) *or* park them there to idle-farm → earn combat XP, gold, monster drops, and skill materials → spend those on gear, skill levels, and subsystem unlocks → unlock the next zone / class / subsystem.

**Account loop:**
characters feed account-wide systems (stamps, alchemy, construction, shared storage) → those systems buff *every* character → stronger characters clear further zones and unlock more subsystems → those subsystems feed the account again.

**Session shapes**, deliberately different from each other so the game has a rhythm:
- *Short active session* (5–20 min): a PoE-style zone clear — hands-on movement/skills/loot, a specific farming or boss goal, then back out.
- *Long idle session* (hours / overnight): numbers accumulate on parked characters; the payoff is checking in.
- *Management session* (a few minutes, periodic): reallocate talents, restock alchemy vials, reassign which character is idling where, spend banked points.

## 3. Characters & Specialization

- The player controls a roster of characters (starts at 1; more slots are an account-level unlock — gold cost + a quest, not just a timer).
- Each character starts as a Base Class, then branches into a Specialized Class (à la Idleon's class tree). The class determines:
  - a unique **active-combat kit** (different attack patterns, animations, feel), and
  - a passive **specialty multiplier** for one meta subsystem (e.g. a gathering-focused class gets faster skilling; an alchemy-focused class gets cheaper vials).
- Respeccing exists but costs real resources — the point is to make roster composition a deliberate choice ("who is my miner, who is my fighter"), not a solved meta where one build does everything.

## 4. Subsystem Catalog & Gating Web

Each subsystem is described as **Input → Output**, plus what **Gates** it (unlocks it in the first place). This is the actual design core: the web of dependencies is what needs to stay interesting.

| # | Subsystem | Consumes (Input) | Produces (Output) | Gated By |
|---|---|---|---|---|
| 1 | **Combat** (active/idle farming) | character stats/gear, unlocked zone | XP, gold, raw materials, cards, gear drops | previous zone's boss / a quest |
| 2 | **Gathering** (mining / woodcutting / fishing) | tool tier (from Smithing), own skill XP | tiered raw materials | early quest; higher tiers need better tools |
| 3 | **Smithing/Crafting** | raw materials (Gathering), blueprints (Combat drops) | tools (→ Gathering), gear (→ Combat) | first boss kill; recipe tiers need blueprints |
| 4 | **Alchemy** | raw materials, gold | permanent account-wide stat vials, temporary consumable bubbles | account combat-level threshold + a quest |
| 5 | **Construction** (base building) | wood/stone (Gathering), blueprints (Combat/quest) | passive account-wide bonuses (idle rate, storage, character slots) | a specific storyline zone clear |
| 6 | **Cards / Bestiary** | monster kills (Combat) | per-monster stat bonuses; set bonuses unlock new zones | passive drops; upgrades need duplicates |
| 7 | **Stamps** (account collection) | specific materials/gold deposited | flat/% account-wide stat bonuses | per-category, unlocked by that category's early milestone |
| 8 | **Talents / Star Talents** | character levels; account-wide meta-achievements ("kill 100 of every monster type", "reach lvl N on 3 characters") | multiplicative bonuses; some star talents unlock *other subsystems* (e.g. 2nd tool slot) | leveling / meta-achievement completion |
| 9 | **Post Office / Shared Storage** | Construction unlock | automatic resource-sharing between characters (lets a Gatherer feed a Smith feed a Fighter without babysitting) | a Construction milestone |
| 10 | **Quests / NPCs** | progress across every other subsystem | narrative gates, blueprint/unlock drip-feed | — quests *are* gates, not gated themselves |
| 11 | **Prestige / Ascension** (late layer) | cumulative milestones across *multiple* subsystems at once (e.g. total Gathering level + total Combat level + Construction tier) | permanent global multiplier, resets one compounding resource for a bigger multiplier next loop | several subsystems hitting a mid-game milestone *simultaneously* — forces breadth, not a single maxed system |

The important shape: **Combat → materials/blueprints → Smithing/Alchemy/Construction → account-wide bonuses → stronger Combat**, with Cards, Stamps, and Talents as side-loops that all draw from the same Combat+Gathering outputs but gate *different* downstream things. That's what makes it feel like Idleon rather than a single idle-currency game — the player is never blocked on just one number.

## 5. Example Progression Walkthrough

- **Hour 1** — one character, active combat in Zone 1, a quest unlocks Mining.
- **Hour 3** — Mining lvl 5 unlocks Smithing; first tool upgrade smithed; a boss kill drops the first blueprint and unlocks a 2nd character slot.
- **Day 1** — two characters: one fighting, one gathering, resources moved between them manually (no Post Office yet — that's an upgrade, not a given).
- **Day 3** — account combat level crosses the Alchemy threshold; vial income starts compounding; first Stamp category opens.
- **Week 1** — Construction base built, which unlocks Post Office (automation) and a 3rd/4th character slot; first Star Talents coming online from meta-achievements.
- **Week 3** — Prestige unlocks once Combat + Gathering + Construction have each hit their mid-game milestone together, not before.

## 6. Technical Architecture

- **`/sim`** — pure TypeScript simulation core: characters, subsystems, formulas, save schema. Framework-agnostic, deterministic, tick-based. No Phaser imports. This is what makes offline-progress calculation and unit testing possible.
- **`/game`** — Phaser scenes, sprites, animation, input, VFX/juice. Reads and writes `/sim` through a thin adapter; never owns game truth itself.
- **`/ui`** — a lightweight React overlay mounted over the Phaser canvas for menus, inventory grids, talent trees — anything DOM-shaped that Phaser itself is weak at. Phaser stays focused on the game world.
- **`/data`** — static, declarative content definitions (monsters, items, recipes, zones, talents) as data tables, not hardcoded logic. Keeps balancing and content-adding fast, and keeps pacing hand-tunable per subsystem instead of one global formula.
- **Save & offline progress**: sim advances on a fixed timestep; the save records `lastSavedTimestamp`. On load, elapsed time is simulated in bulk (with a softcap/diminishing-returns curve on AFK gains, like Idleon's AFK timer) rather than replayed tick-by-tick.
- **State shape**: one serializable `AccountState` (character roster + shared account subsystems) is the single source of truth. Scenes/UI read slices of it and dispatch actions through the sim layer (reducer-style) rather than mutating it directly — keeps save/load and testing simple.

## 7. "Doesn't feel AI-generated" principles

- **Naming bible up front** — every system, item, and monster gets a real, consistent name and flavor voice before it ships. No `Monster1`, no generic `Skill Point`.
- **Juice** — hit-stop on impactful hits, squash/stretch on attacks, particles and screen shake tuned per weight class, loot that pops with real physics and a satisfying pickup beat, eased UI transitions instead of instant snaps.
- **Hand-tuned curves, not one formula everywhere** — avoid `cost = base * 1.15^level` copy-pasted into every subsystem; vary curve shapes so pacing has intentional breakpoints, tuned by playtesting rather than derived purely mathematically.
- **Art direction locked early** — one palette, one silhouette language, one UI chrome — instead of mixing whatever asset packs are convenient.
- **Teach by doing** — a short guided quest chain introduces mechanics in context instead of a tooltip wall on first launch.

## 8. Open Questions

- ~~Art style *within* the top-down PoE-style camera: pixel art, hand-drawn, or flat/vector?~~ Given a working default in `art/STYLE_GUIDE.md` (painted dark fantasy, semi-realistic) — not a hand-drawn typeface-style final decision, just a concrete direction to iterate against instead of an open blank.
- Placeholder/programmer art for now with real art later, or block on art before building systems? Current answer: placeholder now, replaced incrementally per-asset via the `art-zone`/`art-character`/`art-enemy`/`art-import` skills as real art gets generated — not blocking.
- Any monetization, or purely a personal/free project? (Affects how aggressively prestige currencies etc. need pacing.)
- Preferred active-vs-idle balance — should skilled active play meaningfully outpace idling, or should it mainly be about *convenience* (not needing to click)?
