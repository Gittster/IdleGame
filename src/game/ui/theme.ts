import Phaser from 'phaser';

/**
 * The game's typography, in one place, so "put text on screen" always
 * means "pull from here" rather than every caller picking its own font.
 *
 * Pairing mirrors how Path of Exile itself splits its type: a carved,
 * inscriptional display face for big titles/logo-weight text, and a
 * calmer old-style serif for dense small-size UI (tooltips, stats, HUD
 * numbers) where a heavy display face would turn to mush at 12-16px.
 * Both are free, SIL OFL-licensed fonts, self-hosted via the @fontsource
 * packages (imported in main.ts) rather than a Google Fonts CDN link —
 * no third-party font host for players to depend on. This isn't a
 * hand-drawn typeface (that needs real type-design tooling this project
 * doesn't have), but the font choice plus the shared color/shadow/
 * spacing treatment below is what makes it read as "ours" rather than a
 * default browser font.
 */
export const FONT_DISPLAY = 'Cinzel';
export const FONT_BODY = 'Spectral';

const DISPLAY_STACK = `"${FONT_DISPLAY}", Georgia, "Times New Roman", serif`;
const BODY_STACK = `"${FONT_BODY}", Georgia, "Times New Roman", serif`;

/** Every weight/style actually requested from Google Fonts in index.html —
 *  kept here too so BootScene can wait on exactly these before any text
 *  renders (a canvas draws with whatever font is *currently* loaded; it
 *  won't retroactively redraw once a late-arriving webfont finishes). */
export const REQUIRED_FONT_FACES = [`700 16px "${FONT_DISPLAY}"`, `400 16px "${FONT_BODY}"`, `600 16px "${FONT_BODY}"`, `700 16px "${FONT_BODY}"`];

const PARCHMENT = '#e8dfc8';
const GOLD = '#caa542';
const INK_SHADOW: Phaser.Types.GameObjects.Text.TextStyle['shadow'] = {
  offsetX: 0,
  offsetY: 1,
  color: '#000000',
  blur: 2,
  fill: true,
};

export const TEXT_STYLES = {
  /** Big titles/banners — not used in the combat HUD yet, ready for menus,
   *  zone names, "LEVEL UP" style moments. */
  title: {
    fontFamily: DISPLAY_STACK,
    fontSize: '32px',
    color: GOLD,
    stroke: '#1a1006',
    strokeThickness: 4,
    letterSpacing: 2,
    shadow: INK_SHADOW,
  } satisfies Phaser.Types.GameObjects.Text.TextStyle,

  /** Section labels / anything that wants a lighter touch of the display
   *  face without full title size. */
  heading: {
    fontFamily: DISPLAY_STACK,
    fontSize: '16px',
    color: PARCHMENT,
    letterSpacing: 1,
    shadow: INK_SHADOW,
  } satisfies Phaser.Types.GameObjects.Text.TextStyle,

  /** Default for ordinary HUD/UI text: instructions, labels, stat readouts. */
  body: {
    fontFamily: BODY_STACK,
    fontSize: '13px',
    color: PARCHMENT,
    shadow: INK_SHADOW,
  } satisfies Phaser.Types.GameObjects.Text.TextStyle,

  /** A dimmer variant of body text for secondary/help copy. */
  bodyMuted: {
    fontFamily: BODY_STACK,
    fontSize: '13px',
    color: 'rgba(232, 223, 200, 0.75)',
    shadow: INK_SHADOW,
  } satisfies Phaser.Types.GameObjects.Text.TextStyle,

  /** Bold numeric readouts — skill cooldowns, damage numbers, counters. */
  numeric: {
    fontFamily: BODY_STACK,
    fontSize: '16px',
    fontStyle: 'bold',
    color: '#ffffff',
    shadow: INK_SHADOW,
  } satisfies Phaser.Types.GameObjects.Text.TextStyle,

  /** Debug/dev overlay text — distinct color, same family as everything
   *  else so it doesn't look like a leftover placeholder font. */
  debug: {
    fontFamily: BODY_STACK,
    fontSize: '13px',
    color: '#9be89b',
    shadow: INK_SHADOW,
  } satisfies Phaser.Types.GameObjects.Text.TextStyle,
};
