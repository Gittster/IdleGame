#!/usr/bin/env node
/**
 * Processes a raw AI-generated (or any) image into an engine-ready asset:
 * trims stray padding, resizes/crops to the exact canvas the game expects,
 * and — for tileable ground textures — warns if the edges won't actually
 * tile cleanly. See art/STYLE_GUIDE.md for the specs this enforces.
 *
 * Usage:
 *   node scripts/import-art-asset.mjs --in art/incoming/foo.png --out public/art/enemies/foo.png --size 256
 *   node scripts/import-art-asset.mjs --in art/incoming/ground.png --out public/art/zones/swamp-ground.png --size 512 --tile
 *
 * Modes:
 *   sprite (default) — trims transparent padding, fits the subject into a
 *     square canvas of --size with transparent padding, alpha preserved.
 *     Use for characters, enemies, and props.
 *   --tile — crops to fill the --size canvas exactly (no padding, no
 *     alpha) and checks left/right and top/bottom edge continuity. Use
 *     for zone ground textures.
 */
import { parseArgs } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';

const { values } = parseArgs({
  options: {
    in: { type: 'string' },
    out: { type: 'string' },
    size: { type: 'string', default: '256' },
    tile: { type: 'boolean', default: false },
    trim: { type: 'boolean', default: true },
  },
});

if (!values.in || !values.out) {
  console.error('Usage: import-art-asset --in <path> --out <path> [--size 256] [--tile] [--no-trim]');
  process.exit(1);
}

const size = Number.parseInt(values.size, 10);
if (!Number.isFinite(size) || size <= 0) {
  console.error(`Invalid --size: ${values.size}`);
  process.exit(1);
}

async function main() {
  let image = sharp(values.in);

  if (values.tile) {
    image = image.resize(size, size, { fit: 'cover' }).flatten({ background: '#000000' });
  } else {
    if (values.trim) image = image.trim();
    image = image.resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }

  const pngBuffer = await image.png().toBuffer();

  await mkdir(dirname(values.out), { recursive: true });
  await sharp(pngBuffer).toFile(values.out);

  const meta = await sharp(pngBuffer).metadata();
  console.log(`Wrote ${values.out} (${meta.width}x${meta.height}, alpha: ${meta.hasAlpha})`);

  if (values.tile) {
    await checkTileability(pngBuffer, size);
  }
}

/** Compares opposite edges of a square texture and warns if they don't
 *  match closely enough to tile without a visible seam. Advisory only —
 *  never fails the import, since a human should make the final call. */
async function checkTileability(pngBuffer, size) {
  const { data, info } = await sharp(pngBuffer).raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  const pixelAt = (x, y) => {
    const idx = (y * size + x) * channels;
    return [data[idx], data[idx + 1], data[idx + 2]];
  };

  const diffAt = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

  let leftRightDiff = 0;
  let topBottomDiff = 0;
  for (let i = 0; i < size; i++) {
    leftRightDiff += diffAt(pixelAt(0, i), pixelAt(size - 1, i));
    topBottomDiff += diffAt(pixelAt(i, 0), pixelAt(i, size - 1));
  }
  leftRightDiff /= size;
  topBottomDiff /= size;

  const THRESHOLD = 60; // sum of |dR|+|dG|+|dB|, averaged per pixel pair
  const warn = (label, value) => {
    if (value > THRESHOLD) {
      console.warn(`  WARNING: ${label} edges differ by ~${value.toFixed(1)}/765 avg — this will likely show a visible seam when tiled.`);
    } else {
      console.log(`  ${label} edges look continuous (avg diff ~${value.toFixed(1)}/765).`);
    }
  };
  warn('left/right', leftRightDiff);
  warn('top/bottom', topBottomDiff);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
