import type { MonsterDef } from './monsters';
import { SHORE_CRAB, ASH_WRETCH } from './monsters';
import type { EllipseBounds, CircleObstacle } from '../sim/core/zoneGeometry';

/**
 * A zone is a small, bounded, self-contained play space — not a slice of
 * one giant shared world. Clearing its kill quota unlocks the next one
 * (see `DESIGN.md` §1a, "Zone = session unit"). Each zone defines its own
 * coordinate space; there's no reason for unrelated zones to share
 * world-space coordinates since only one is ever active at a time.
 */
export interface ZoneDef {
  id: string;
  name: string;
  bounds: EllipseBounds;
  playerSpawn: { x: number; y: number };
  obstacles: CircleObstacle[];
  monster: MonsterDef;
  /** Enemies alive at once, topped back up as they die. */
  maxAlive: number;
  /** Total kills needed to clear the zone — independent of maxAlive;
   *  enemies keep respawning until this hits zero, not just until
   *  maxAlive is reached once. */
  killsToClear: number;
  /** Zone to load when this one clears, or null if it's the last one. */
  nextZoneId: string | null;
  /** Flat-fill ground + outline colors, per the MS-Paint-inspired
   *  direction in art/STYLE_GUIDE.md — drawn directly via Phaser
   *  Graphics, no image asset needed. */
  groundColor: number;
  outlineColor: number;
}

export const SUNKEN_SHORE: ZoneDef = {
  id: 'sunken-shore',
  name: 'The Sunken Shore',
  bounds: { centerX: 700, centerY: 500, radiusX: 420, radiusY: 300 },
  playerSpawn: { x: 880, y: 420 },
  obstacles: [{ x: 560, y: 560, radius: 60 }],
  monster: SHORE_CRAB,
  maxAlive: 4,
  killsToClear: 15,
  nextZoneId: 'ashen-flats',
  groundColor: 0xeae4d3,
  outlineColor: 0x141414,
};

export const ASHEN_FLATS: ZoneDef = {
  id: 'ashen-flats',
  name: 'The Ashen Flats',
  bounds: { centerX: 700, centerY: 500, radiusX: 520, radiusY: 360 },
  playerSpawn: { x: 700, y: 500 },
  obstacles: [],
  monster: ASH_WRETCH,
  maxAlive: 5,
  killsToClear: 20,
  nextZoneId: null,
  groundColor: 0xdcd6c4,
  outlineColor: 0x141414,
};

export const ZONES: Record<string, ZoneDef> = {
  [SUNKEN_SHORE.id]: SUNKEN_SHORE,
  [ASHEN_FLATS.id]: ASHEN_FLATS,
};

export const FIRST_ZONE = SUNKEN_SHORE;
