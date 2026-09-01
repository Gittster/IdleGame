---
name: art-enemy
description: Drafts a style-consistent image-generation prompt for an enemy/monster sprite, given a verbal description or a reference image. Use when the user wants art for a monster, enemy, or boss, or asks to design what an enemy looks like visually. Does not call an image API itself — hands back a prompt to run in the user's own tool (Midjourney, ChatGPT, etc.), then use the art-import skill on the result.
---

# Enemy Art Prompt Drafting

## Before anything else

Read `art/STYLE_GUIDE.md` in full. Every prompt must match its palette,
direction, and technical specs. Also check `src/data/monsters.ts` for
the monster's existing gameplay definition (radius, HP, projectile
behavior) if it's already been added there — the art should match what
the thing actually does (a monster with a ranged projectile attack
should probably look like it *can* — visible mouth/maw/weapon/orifice
for the attack to originate from).

## The key constraint: one pose, and it reads in a pack

Same rotation model as `art-character` — **one top-down pose**, no
directional sheet (see that skill's notes on why; the constraint is
identical here).

Per `DESIGN.md` §1a, monsters are cleared in **packs** — several of the
same enemy on screen at once, fought fast. That has two consequences for
the art itself, not just gameplay:

- The silhouette needs to read clearly when several overlapping copies
  are on screen together, small, in motion.
- A little bit of asymmetry or organic variation (a torn ear, an
  off-center scar) helps multiple instances of the same sprite not look
  like an obviously-stamped copy — but keep it subtle; the sprite is
  still one fixed image reused across every instance of this monster
  type in the current pipeline (no per-instance recoloring/variants yet).

## What to ask if the description is thin

- **What does it do in combat?** Melee contact, ranged projectile
  (`src/data/monsters.ts` → `projectile` block), a boss with multiple
  attacks? The current placeholder enemy tint is `#e0455a` — describe
  whether this monster keeps that "enemy-red" family or needs its own
  identity (e.g. a caster-type reads better with a colder accent even
  while staying in the enemy-threat register).
- **Biome/zone tie-in** — if this monster belongs to a specific zone
  (see `art-zone`), it should share that zone's environment palette
  accents so it looks like it belongs there, not pasted in from
  elsewhere.
- **Threat tier** — a basic pack mob vs. a rare/boss-tier enemy should
  look different in presence/scale even before stats differ — mention
  which this is.

Draft with reasonable assumptions if these aren't given; state them.

## Drafting the prompt

One prompt, as a single complete paragraph, stating:

- what the creature is and its combat role (melee/ranged/caster), with
  a visible tell for that (a maw, claws, a glowing weak point — whatever
  fits) per the note above on visual/gameplay consistency
- the elevated top-down angle and painted-dark-fantasy direction (style
  guide §1, §3), explicitly calling for a **clear, readable silhouette**
- environment/threat color accents (style guide §2a/§2c) tied to biome
  and threat tier as discussed above
- centered, isolated subject, transparent background, no ground/shadow
  baked in
- 256×256 PNG per the style guide (§4)

## Logging

Write the prompt to `art/prompts/enemy-<monster-slug>.md` with a
one-line header naming the monster and date.

## After this skill

Tell the user: run the prompt in their image tool, save the result into
`art/incoming/`, then invoke `art-import` on it.
