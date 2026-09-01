---
name: art-import
description: Processes a finished, externally-generated image (from art-zone, art-character, or art-enemy) and wires it into the game as a real Phaser-loaded asset — trims/resizes to spec, writes it into public/art/, and updates the relevant loading/rendering code. Use after the user has run a drafted prompt through their own image tool and saved the result locally.
---

# Art Asset Import

## 1. Read the style guide

Read `art/STYLE_GUIDE.md` first — §4 (technical specs) and §5 (folder
conventions) are what this skill enforces.

## 2. Identify the asset

Ask (or infer from context/filename) which of these it is — the spec and
the wiring step both depend on it:

| Type | Mode | Size | Destination |
|---|---|---|---|
| Character sprite | sprite | 256 | `public/art/characters/<name>.png` |
| Enemy sprite | sprite | 256 | `public/art/enemies/<name>.png` |
| Zone prop/doodad | sprite | 256 or 512 | `public/art/zones/<zone>/props/<name>.png` |
| Zone ground texture | tile | 512 | `public/art/zones/<zone>/ground.png` |

## 3. Process it

Run the import script — don't hand-roll trimming/resizing logic, it's
already been written and tested:

```
node scripts/import-art-asset.mjs --in art/incoming/<file>.png --out <destination from table> --size <size> [--tile]
```

Read its output. For `--tile` assets, it warns (not fails) if the edges
won't tile cleanly — if it warns, say so to the user plainly and ask
whether to proceed anyway, try a different source crop, or regenerate.
For sprite assets, actually look at the processed file (it's a small
PNG — read it and view it) and sanity check it against `STYLE_GUIDE.md`
§1-3 (direction, palette, silhouette) before wiring it in. Don't wire in
something that's visibly off-model without flagging it first.

## 4. Wire it into the game

The project currently draws every texture procedurally in
`src/game/scenes/BootScene.ts` (see its `create()` — no `preload()`
exists yet because there's been nothing to load). Adding the first real
image asset means adding that loading step:

1. If `BootScene` has no `preload()` method yet, add one. Load the new
   asset there: `this.load.image('tex-<name>', '/art/<path-under-public>/<file>.png')`.
   Keep `create()` doing exactly what it already does (procedural
   texture generation) for everything that doesn't have real art yet —
   don't rip out a procedural texture until its replacement is actually
   loaded and wired in.
2. Point the right piece of game code at the new texture key instead of
   its procedural placeholder:
   - **Character**: `this.playerSprite = this.add.image(..., 'tex-player')`
     in `CombatScene.create()` → swap the key. If there's more than one
     class/character now, this needs to become data-driven (a texture
     key per class definition) rather than a single hardcoded key —
     don't build that generalization speculatively if only one character
     exists yet; do it when the second one actually shows up.
   - **Enemy**: `src/data/monsters.ts` — add a `textureKey` field to
     `MonsterDef` (defaulting existing definitions to `'tex-enemy'` so
     nothing breaks), set it on the specific monster, and use it in
     `CombatScene.spawnEnemyNear`/`syncEnemySprites` instead of the
     hardcoded `'tex-enemy'` literal.
   - **Zone ground texture**: replace the `'tex-ground'` key used by the
     `tileSprite` in `CombatScene.create()` for zones that have their own
     art — this will likely want to become per-zone once zones are a
     real concept in the sim; for now, a direct key swap is enough.
   - **Zone prop**: these don't have a rendering path yet (no prop-
     scattering system exists in the sim or scene). Don't invent one
     speculatively — tell the user the image is imported and ready at
     its destination path, and that prop *placement* is a separate
     feature to build when zones themselves exist as a concept.
3. Run `npm run typecheck` and `npm run build` — a bad path or key typo
   here fails silently at runtime (a missing texture just doesn't
   render), so lean on the type/build check rather than trusting it by
   eye.
4. Actually look at it in the running game before calling this done —
   start the dev server and take a screenshot (or drive a headless
   browser check) showing the new asset rendering in place, the same way
   any other visual change in this project gets verified. A processed
   PNG sitting in `public/art/` that nothing on screen actually shows is
   not a finished import.

## 5. Report back

Tell the user what was imported, where the file ended up, what code
changed to use it, and show the verification screenshot.
