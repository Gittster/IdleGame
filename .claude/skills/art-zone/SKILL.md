---
name: art-zone
description: Drafts a style-consistent image-generation prompt for a zone's ground texture and scatter props (rocks, ruins, dead trees, etc.), given a verbal description or reference image of the zone. Use when the user wants art for a new zone/biome/environment, or asks to design what a zone looks like visually. Does not call an image API itself — hands back a prompt to run in the user's own tool (Midjourney, ChatGPT, etc.), then use the art-import skill on the result.
---

# Zone Art Prompt Drafting

## Before anything else

Read `art/STYLE_GUIDE.md` in full. Every prompt this skill produces must
be consistent with its palette, direction, and technical specs — don't
improvise a different style or color set even if the user's verbal
description doesn't mention one.

## The key constraint: this produces a tileable texture, not a scene painting

`CombatScene` follows the player across a large arena
(`WORLD_TUNING.arenaWidth`/`Height`, currently 3200×3200) — there is no
single fixed-size backdrop that could cover that. A zone's visual
identity comes from:

1. **One seamless, tileable ground texture** repeated across the arena floor.
2. **Several scatter props** (rocks, ruined pillars, dead trees, bones —
   whatever fits the zone's theme) placed as individual transparent-
   background sprites, procedurally scattered across the ground by game
   code.

If the user describes a zone as a "scene" (e.g. "a ruined temple
courtyard with a big broken statue in the center"), translate that into
this ground-texture + props model rather than prompting for a single
illustrated scene — call out the translation explicitly so they can
redirect if they actually pictured something else (e.g. a bounded arena
with a fixed backdrop would be a different, bigger engineering change,
not just an art request).

## What to ask if the verbal prompt is thin

A one-line theme ("a swamp zone") is enough to start, but a noticeably
better result comes from knowing:

- **Biome/theme** — swamp, ruins, crypt, frozen wastes, etc.
- **2-3 signature props** specific to this zone (not just "some rocks") —
  what would make a player recognize this zone from a screenshot?
- **Any specific monster family** that lives here (affects environment
  storytelling — bones/webs/nests matching whatever's about to attack the
  player) — check `src/data/monsters.ts` for what's already defined.

Don't block on getting all of this — draft with sensible assumptions,
state the assumptions, and let the user correct them.

## Drafting the prompt

Produce two things:

1. **One ground texture prompt.** Must explicitly state:
   - "seamless tileable texture, no visible seams, repeating pattern"
   - top-down, flat-ish read (a ground texture is looked at nearly
     straight down, unlike character/prop art's elevated angle)
   - the environment palette from the style guide (§2c), named as hex
     values in the prompt is fine and often helps
   - 512×512, PNG, no transparency

2. **2-4 prop prompts**, one per signature prop. Each must state:
   - single object, centered, fully isolated
   - transparent background (explicitly say "transparent background, no
     ground, no shadow baked in" — image generators default to putting
     objects on some kind of ground/context otherwise)
   - the elevated top-down angle from the style guide (§3), matching
     character/enemy art rather than the flat ground texture
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
