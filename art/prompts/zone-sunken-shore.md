# Zone: The Sunken Shore (starter beach zone) — drafted 2026-09-01

Assumptions made (correct me and I'll redraft):
- Named it **"The Sunken Shore"** rather than leaving it generic, per
  `DESIGN.md` §7's naming-bible principle.
- No starter monster family is defined yet in `src/data/monsters.ts`
  (only the `Training Dummy` placeholder exists), so props lean on
  generic "something wrecked happened here" storytelling rather than
  tying to a specific creature.
- Stayed inside the dark/desaturated direction from `STYLE_GUIDE.md` §1
  rather than a bright tropical beach — this is a starter zone in
  difficulty, not in tone.
- The ground texture needs sand tones the style guide's §2c palette
  doesn't cover (that table is stone/foliage-oriented) — extended it
  with two beach-appropriate desaturated tones (`#8a7f66` wet sand,
  `#4a4436` tide-darkened sand) rather than inventing something outside
  the established mood.

## Ground texture

Seamless tileable texture, no visible seams, repeating pattern, of wet
packed beach sand viewed from directly above (flat top-down orthographic
angle). Dark fantasy painted digital illustration style, semi-realistic,
moody and desaturated — muted wet sand in tones of #8a7f66 and #6b6151,
with darker tide-darkened patches in #4a4436 and #3a352c, scattered fine
gravel, subtle ripple patterns left by retreating waves, a few small
embedded pebbles and broken shell fragments. Overcast, soft diffused
light, no strong directional shadows, no plants, no props, no creatures —
ground surface only. 512x512, PNG, no transparency.

## Prop 1 — Shipwreck hull fragment

A single isolated object: a broken, half-buried wooden shipwreck hull
fragment jutting at an angle from sand, ribs of dark rotted timber
exposed, bleached and salt-weathered, a few strands of torn rigging rope
still attached, barnacles and dried seaweed clinging to the lower
planks. Dark fantasy painted digital illustration style, semi-realistic,
moody and desaturated palette (weathered wood in near-black #1c1a17
through worn grey-brown #3a352c, with pale bone-white salt-bleached
highlights in #e8dfc8). Viewed from an elevated top-down angle, roughly
30-45 degrees above the subject, matching a painted game-asset icon
rather than a flat orthographic view. Soft, diffused overcast lighting,
no strong cast shadow. Centered, fully isolated single object,
transparent background, no ground, no shadow baked in, no other props in
frame. 256x256, PNG, alpha transparency.

## Prop 2 — Driftwood cluster

A single isolated object: a small tangled cluster of sun-bleached,
salt-worn driftwood logs and branches, weathered smooth, pale grey-bone
coloring with darker damp undersides, one or two strands of dried
seaweed draped across it. Dark fantasy painted digital illustration
style, semi-realistic, moody and desaturated palette (bone/driftwood
highlight #e8dfc8, deep damp-wood shadow #1c1a17). Viewed from an
elevated top-down angle, roughly 30-45 degrees above the subject,
matching a painted game-asset icon. Soft, diffused overcast lighting.
Centered, fully isolated single object, transparent background, no
ground, no shadow baked in, no other props in frame. 256x256, PNG, alpha
transparency.

## Prop 3 — Tide-pool boulder cluster

A single isolated object: a cluster of dark, wet, rounded boulders
forming a small tide pool, encrusted with barnacles and clumps of dark
green-black seaweed, a thin sheen of standing water in the pool's center
reflecting dim overcast light. Dark fantasy painted digital illustration
style, semi-realistic, moody and desaturated palette (wet stone dark
#1c1a17 and mid #3a352c, seaweed dark #23301f). Viewed from an elevated
top-down angle, roughly 30-45 degrees above the subject, matching a
painted game-asset icon. Soft, diffused overcast lighting. Centered,
fully isolated single object, transparent background, no ground, no
shadow baked in, no other props in frame. 256x256, PNG, alpha
transparency.
