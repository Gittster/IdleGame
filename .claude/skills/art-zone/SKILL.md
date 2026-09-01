---
name: art-zone
description: Drafts a style-consistent image-generation prompt (or a hand-drawn-sketch trace, per the style guide's sketch-first path) for a zone's obstacles and scatter props, given a verbal description or reference image of the zone. Use when the user wants art for a new zone/biome/environment, or asks to design what a zone looks like visually. Does not call an image API itself — hands back a prompt to run in the user's own tool (Midjourney, ChatGPT, etc.), then use the art-import skill on the result.
---

# Zone Art Prompt Drafting

## Before anything else

Read `art/STYLE_GUIDE.md` in full. Every prompt this skill produces must
be consistent with its palette, direction, and technical specs — don't
improvise a different style or color set even if the user's verbal
description doesn't mention one.

## The key constraint: zones are small, bounded set-pieces, not an open arena

Each zone (`ZoneDef` in `src/data/zones.ts`) is its own small elliptical
play space with a fixed number of monsters and a kill-quota that unlocks
the next zone — not a single continuous world the camera roams freely
across. That changes what art a zone actually needs:

1. **The ground itself needs no image asset at all.** It's drawn as a
   flat `groundColor` fill with an `outlineColor` stroke, defined right
   on the `ZoneDef` — literally just two colors, no texture to generate
   or tile.
2. **Obstacles** (a rock, a fallen log — anything that should physically
   block movement, per `CircleObstacle`) and **scatter props** (purely
   decorative dressing) are the actual art surface for a zone: individual
   transparent-background subjects, same treatment as a character sprite.

If the user describes a zone as a "scene" (e.g. "a ruined temple
courtyard with a big broken statue in the center"), translate that into
this flat-ground + obstacles/props model — the broken statue becomes an
obstacle, other set dressing becomes props — rather than prompting for a
single illustrated backdrop image.

## What to ask if the verbal prompt is thin

A one-line theme ("a swamp zone") is enough to start, but a noticeably
better result comes from knowing:

- **Biome/theme** — swamp, ruins, crypt, frozen wastes, etc.
- **Ground/outline colors** — a `groundColor` + `outlineColor` pair for
  the `ZoneDef` (from the style guide's palette, §2c) — this is the only
  "environment" decision that isn't an image asset.
- **1-2 obstacles** — solid, movement-blocking shapes (a rock, a fallen
  log) that fit the theme.
- **2-3 signature scatter props** specific to this zone (purely
  decorative) — what would make a player recognize this zone from a
  screenshot?
- **Any specific monster family** that lives here (affects environment
  storytelling — bones/webs/nests matching whatever's about to attack the
  player) — check `src/data/monsters.ts` for what's already defined.

Don't block on getting all of this — draft with sensible assumptions,
state the assumptions, and let the user correct them.

## Drafting the prompt

Produce prompts for the obstacle(s) and scatter props — no ground
texture prompt is needed (see above). Two sourcing paths, per the style
guide's §1a:

- **Sketch-first (default):** if the user hands you a hand-drawn
  reference, trace/clean it directly into a hand-authored SVG or Graphics
  shape (or a cleaned raster PNG) yourself — no external tool needed, skip
  straight to `art-import` if it's already a raster.
- **Prompt-drafting (Path B):** for each obstacle/prop, write one
  complete, copy-pasteable paragraph prompt that states:
  - single object, centered, fully isolated
  - transparent background (explicitly say "transparent background, no
    ground, no shadow baked in" — image generators default to putting
    objects on some kind of ground/context otherwise)
  - the elevated top-down angle from the style guide (§3), matching
    character/enemy art
  - the crude/naive hand-drawn-but-crisp direction from the style guide
    (§1/§1a) — thick black outline, flat solid fill, no gradients/shading
  - 256×256 or 512×512 PNG per the style guide

Write each prompt as a single, complete, copy-pasteable paragraph — not
a bullet list the user has to reassemble. Show them to the user directly
in your response.

## Logging

Write the final prompts to `art/prompts/zone-<slug>.md` (slug from the
zone's name/theme), with a one-line header naming the zone and date.
This is what makes "regenerate prop #3 with a variation" cheap later —
don't skip it.

## After this skill

Tell the user: run each prompt in their image tool, save results into
`art/incoming/`, then invoke `art-import` on each file.
