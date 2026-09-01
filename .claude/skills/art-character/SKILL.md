---
name: art-character
description: Drafts a style-consistent image-generation prompt for a playable character/class sprite, given a verbal description of the class (or a reference image). Use when the user wants art for a player character, a class, or asks to design what a character looks like visually. Does not call an image API itself — hands back a prompt to run in the user's own tool (Midjourney, ChatGPT, etc.), then use the art-import skill on the result.
---

# Character Art Prompt Drafting

## Before anything else

Read `art/STYLE_GUIDE.md` in full. Every prompt must match its palette,
direction, and technical specs.

## The key constraint: one pose, not a directional sheet

`CombatScene` rotates a single sprite in code to face aim/movement
direction (`playerSprite.rotation = this.lastAimAngle` — see
`src/game/scenes/CombatScene.ts`). That means **one canonical top-down
pose per character**, not an 8-directional walk/attack sheet — don't
draft prompts for multiple angles or a spritesheet; that's wasted
generation and import work against how the engine actually uses this
asset today. If the user specifically wants directional animation later,
that's a bigger engineering change (an actual animation system) worth
flagging separately, not something to fold into a single prompt.

## What to ask if the description is thin

Per `DESIGN.md` §3, each class has a distinct active-combat kit and (per
§7) needs a real, consistent identity — not a generic fantasy-class
placeholder. A useful prompt needs:

- **Class identity/fantasy** — what does this character *do* in combat?
  (Check `src/data/skills.ts` and any class-specific tuning if it
  exists yet.) A melee bruiser reads differently than a ranged caster
  even before color enters into it.
- **Silhouette hook** — one distinctive visual element (weapon type,
  posture, a signature piece of gear) that reads even at the small size
  this renders at in-game (see style guide §3 on silhouette).
- **Player-color tie-in** — the existing placeholder uses `#4da3ff`
  (blue) for *the player generically*, not per-class. Ask whether this
  class should keep that blue as a primary accent (consistent "this is
  you" read across all characters) or establish its own accent color —
  either is reasonable, but it should be a deliberate choice, not an
  accident of what the generator happened to produce.

Draft with reasonable assumptions if these aren't given; state them.

## Drafting the prompt

One prompt, as a single complete paragraph, stating:

- the class fantasy/identity and its signature silhouette element
- the elevated top-down angle and painted-dark-fantasy direction from
  the style guide (§1, §3)
- environment palette for materials/grime (§2c) plus whatever accent
  color was settled on above
- centered, isolated subject, transparent background, no ground/shadow
  baked in
- 256×256 PNG per the style guide (§4)

## Logging

Write the prompt to `art/prompts/character-<class-slug>.md` with a
one-line header naming the class and date.

## After this skill

Tell the user: run the prompt in their image tool, save the result into
`art/incoming/`, then invoke `art-import` on it.
