# Art Style Guide

This is the shared source of truth for every generated art asset. The
`art-zone`, `art-character`, and `art-enemy` skills all read this file
before drafting a prompt; `art-import` reads it before accepting a
finished image. If you change direction on style or palette, change it
here — the skills don't hardcode any of this themselves.

Resolves the open art-direction question from `DESIGN.md` §8 with a
concrete, working default. It's a default, not a contract: if it's not
landing, change this file rather than working around it per-asset.

## 1. Direction

**Painted dark fantasy, semi-realistic proportions, moody and desaturated
with saturated accents.** The same family as Path of Exile, Diablo, and
Grim Dawn — not stylized/cartoon, not flat vector, not pixel art. Concretely:

- Digital painting rendering, visible brushwork, not photobashed and not a 3D render.
- Desaturated, low-key base values (the world is dim, worn, overcast) with
  color reserved for things that matter: player, enemies, loot, skill
  effects, light sources.
- Semi-realistic anatomy/proportions — grounded, not chibi, not
  hyper-detailed anime.
- Weight and grime: worn materials, dirt, rust, moss. Nothing pristine.

This direction was picked partly on merit and partly on fit for the
pipeline: "dark fantasy digital painting" is one of the best-covered
styles across every major image generator, so it's the direction most
likely to give consistent, on-model results prompt after prompt.

## 2. Palette

### 2a. Functional colors — already load-bearing in code, do not change lightly

These aren't proposals, they're what's already on screen. New art must
read correctly *alongside* them, not fight them.

| Meaning | Hex | Where it lives |
|---|---|---|
| Player | `#4da3ff` (outline `#1a4d80`) | `src/game/scenes/BootScene.ts` |
| Enemy | `#e0455a` (outline `#7a1420`) | `src/game/scenes/BootScene.ts` |
| Basic attack / neutral hit spark | `#ffe066` | `src/sim/core/tuning.ts` (`BASIC_ATTACK_TUNING.tint`) |
| Skill projectile (Power Bolt) | `#b15bff` | `src/data/skills.ts` |
| Player-damage hit spark | `#ff3344` | `src/game/scenes/CombatScene.ts` |
| HP good / bad | `#4be36a` / `#e3564b` | `src/game/scenes/CombatScene.ts` |
| UI parchment text | `#e8dfc8` | `src/game/ui/theme.ts` |
| UI gold accent | `#caa542` | `src/game/ui/theme.ts` |

If a future subsystem needs a new functional color (a new skill school, a
new status effect), add it to this table in the same commit that adds it
to code, so this stays accurate.

### 2b. Loot rarity accents (PoE-standard, reserve these — don't reuse for anything else)

| Rarity | Hex |
|---|---|
| Normal | `#c8c8c8` |
| Magic | `#6a8cff` |
| Rare | `#f5d565` |
| Unique | `#cc6633` |

### 2c. Environment palette (the new part — proposed, tune freely)

Base world tones, kept desaturated so the functional/rarity colors above
stay the things your eye jumps to:

| Role | Hex |
|---|---|
| Void / deep shadow | `#0a0a0d` (matches the current canvas background) |
| Stone / ground, dark | `#1c1a17` |
| Stone / ground, mid | `#3a352c` |
| Foliage, dark | `#23301f` |
| Foliage, mid | `#445c34` |
| Bone / dry parchment highlight | `#e8dfc8` (matches UI text — a deliberate echo) |

A generated piece should be expressible almost entirely in this table
plus whichever functional/rarity colors it's actually depicting. If a
prompt result is coming back colorful/saturated across the board, that's
a style miss, not a "the model felt like it" — push the prompt harder on
"desaturated," "low chroma," "muted."

## 3. Camera & construction rules

- **Perspective**: top-down, elevated 30-45° — a "PoE-style" read, not a
  flat orthographic top-down and not a side-view. See `DESIGN.md` §1a.
- **Single canonical pose, no directional sheets.** The game rotates a
  single sprite in code to face aim/movement direction (see
  `CombatScene.render()` — `playerSprite.rotation = this.lastAimAngle`).
  Characters and enemies need exactly **one** top-down pose each, not an
  8-directional sprite sheet — generating and slicing directional frames
  is wasted work against how this engine actually renders things today.
- **Silhouette first.** Per `DESIGN.md` §1a, packs get cleared in a few
  seconds — a monster has to read as "what is this and which way is it
  facing" at small size, in motion, possibly among several others of its
  own kind. Avoid thin/spindly shapes that disappear at gameplay zoom;
  keep the silhouette distinct from the ground plane behind it.
- **Light source**: implied soft top-down light, consistent across a
  single generation batch (don't mix a harshly side-lit piece with a
  flat-lit one in the same set).

## 4. Technical specs

| Asset type | Canvas | Format | Notes |
|---|---|---|---|
| Character / enemy sprite | 256×256, subject centered with ~10% padding | PNG, alpha transparency | One pose. Background fully transparent, not white/checkerboard. |
| Zone ground texture | 512×512, **seamlessly tileable** | PNG, no transparency | Repeats across a large open arena (`WORLD_TUNING.arenaWidth/Height` — currently 3200×3200) — this is a texture, not a scene painting. Explicitly prompt for "seamless tileable texture." |
| Zone prop / doodad (rocks, dead trees, ruins) | 256×256 or 512×512, subject centered | PNG, alpha transparency | Scattered procedurally across a zone — same "one object, transparent background" treatment as a character. |

## 5. Folder conventions

```
art/
  STYLE_GUIDE.md      — this file
  incoming/           — drop externally-generated PNGs here before import (gitignored — raw dumps, not shipped)
  prompts/            — one .md file per generation session, logging the exact prompt used (tracked in git — cheap, and makes "regenerate a variant of this" possible later)
public/art/
  characters/         — processed, in-game-ready character sprites
  enemies/            — processed, in-game-ready enemy sprites
  zones/              — processed, in-game-ready ground textures and props
```

`public/art/**` is what actually ships — Vite serves it verbatim and
Phaser loads from it by URL. Nothing in `art/incoming` or `art/prompts`
is referenced by game code.

## 6. Workflow

1. Run the relevant generation skill (`art-zone`, `art-character`, or
   `art-enemy`) with a verbal description (and/or a reference image).
   It reads this file and hands you back a ready-to-paste prompt, and
   logs it to `art/prompts/`.
2. Run that prompt in whatever image tool you're using (Midjourney,
   ChatGPT, etc.).
3. Save the result into `art/incoming/`.
4. Run the `art-import` skill on that file. It trims/resizes/validates
   against the technical spec above, writes the processed file into
   `public/art/...`, and wires it into the game's texture loading.
