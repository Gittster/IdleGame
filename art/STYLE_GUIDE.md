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

**Superseded 2026-09-01.** The original direction here was "painted dark
fantasy" (see git history if you want it back). Current direction:

**Deliberately crude/naive hand-drawn shapes, rendered sharp and clean.**
Content is silly — simple wobbly outlines, the kind of thing you'd sketch
in MS Paint or on a napkin — but the *execution* is crisp: clean
anti-aliased edges, flat solid fills, no blur, no jpeg noise, no painterly
texture. The joke is the contrast between "a kid could have drawn this"
and "but it renders beautifully." Concretely:

- **Thick, clean black (or near-black) outlines** around every shape —
  the silhouette *is* the drawing, same as the reference sketches this
  direction is built from.
- **Flat solid fills.** No gradients, no shading, no brushwork, no
  texture/grain. A shape is one or two flat colors plus its outline.
- **Naive proportions on purpose** — wobbly, asymmetric, slightly-off
  shapes read as charming here, not as a mistake to fix. Don't
  "improve" a sketch's proportions into something more anatomically
  correct; clean up its *line quality*, not its *design*.
- **Crisp execution is not optional.** Blurry, low-res, or aliased edges
  read as "bad," not "charming" — the charm is specifically naive
  *content* rendered with clean *technique*. Vector-trace or
  high-resolution-then-downsample rather than shipping something soft.

## 1a. Sourcing: hand-drawn sketches, cleaned up directly — no external tool required

Because the target look is already "simple line drawing," the best
source material is an actual hand-drawn sketch (paint app, napkin photo,
whatever) — paste or attach it directly. From there, cleanup happens
without needing an external AI image generator or the `art-incoming` /
manual-import round trip at all: trace it into clean flat shapes at the
right canvas/format from `art/STYLE_GUIDE.md` §4, either as hand-authored
SVG/Phaser Graphics code (cheapest, fully crisp at any resolution, no
raster import needed) or as a cleaned-up raster PNG through
`scripts/import-art-asset.mjs` when a traced vector isn't practical (a
busier sketch with lots of independent regions).

The `art-zone`/`art-character`/`art-enemy` skills' prompt-drafting mode
(§6 below, "path B") still exists for when there's no sketch to work
from and an external generator is more practical — but sketch-first is
the default now.

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

### 2c. Environment palette (open — the flat/naive direction doesn't force desaturation)

Under the old painted-dark-fantasy direction this table asked for muted,
desaturated tones. That constraint doesn't automatically carry over to
flat naive-line-art — bold, clearly-differentiated flat colors (à la
*Baba Is You*) can suit the sillier tone better than muted ones. Treat
these as a starting point, not a hard rule the way §2a/§2b are:

| Role | Hex |
|---|---|
| Void / deep background | `#0a0a0d` (matches the current canvas background) |
| Ground, dark | `#1c1a17` |
| Ground, mid | `#3a352c` |
| Foliage, dark | `#23301f` |
| Foliage, mid | `#445c34` |
| Bone / parchment highlight | `#e8dfc8` (matches UI text — a deliberate echo) |

Whatever's actually used, stay consistent asset-to-asset — the point of
a shared table is so a zone's props and its ground don't look like they
came from different games.

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
- **Flat shading, no light source.** No gradients, no cast shadows baked
  into the art itself, no ambient occlusion. A shape's color reads the
  same everywhere on its surface — depth and readability come from the
  outline and silhouette, not from rendered lighting.

## 4. Technical specs

| Asset type | Canvas | Format | Notes |
|---|---|---|---|
| Character / enemy sprite | 256×256, subject centered with ~10% padding | PNG, alpha transparency | One pose. Background fully transparent, not white/checkerboard. |
| Zone ground | n/a — flat fill color + outline, drawn with Phaser Graphics | n/a | Zones are small, bounded set-pieces (an elliptical play space, not an open roaming arena), so the ground is a solid `groundColor` fill with an `outlineColor` stroke defined directly on the `ZoneDef` (see `src/data/zones.ts`) rather than an image asset. No ground texture needs to be generated or imported. |
| Zone obstacle (e.g. a rock) | Same solid-fill-plus-outline treatment as the ground, or a simple imported sprite for a more detailed shape | PNG, alpha transparency (if imported) | Obstacles are solid — they block movement and destroy projectiles (see `CircleObstacle` in `zoneGeometry.ts`) — so their art should read as clearly impassable. |
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

**Path A — sketch-first (default now, see §1a).** Attach/paste a hand
sketch directly in conversation. Claude traces it into a clean flat
asset (hand-authored SVG/Graphics code, or a cleaned raster PNG via
`scripts/import-art-asset.mjs`) at the spec in §4, and wires it in —
no `art/incoming` round trip needed unless a raster cleanup pass is
actually useful for a particular sketch.

**Path B — prompt-drafting for an external tool**, for when there's no
sketch to start from:

1. Run the relevant generation skill (`art-zone`, `art-character`, or
   `art-enemy`) with a verbal description (and/or a reference image).
   It reads this file and hands you back a ready-to-paste prompt, and
   logs it to `art/prompts/`.
2. Run that prompt in whatever image tool you're using.
3. Save the result into `art/incoming/`.
4. Run the `art-import` skill on that file. It trims/resizes/validates
   against the technical spec above, writes the processed file into
   `public/art/...`, and wires it into the game's texture loading.
