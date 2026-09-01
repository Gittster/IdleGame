/** Declarative content table — see DESIGN.md §6 for why content lives here
 *  instead of being hardcoded into sim/game logic. */
export interface LootTableEntry {
  itemId: string;
  /** 0-1 probability this entry drops per kill, rolled independently of
   *  the table's other entries. */
  chance: number;
  min: number;
  max: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  radius: number;
  maxHp: number;
  contactDamage: number;
  projectile: {
    speed: number;
    radius: number;
    damage: number;
    life: number;
    cooldown: number;
    tint: number;
  };
  goldDrop: { min: number; max: number };
  /** Each zone has exactly one monster (see DESIGN.md's "each zone has one
   *  enemy" model in src/data/zones.ts), so its loot table lives here,
   *  specific to that monster rather than the zone. */
  lootTable: LootTableEntry[];
}

export const DUMMY: MonsterDef = {
  id: 'dummy',
  name: 'Training Dummy',
  radius: 18,
  maxHp: 40,
  contactDamage: 0,
  projectile: {
    speed: 420,
    radius: 6,
    damage: 6,
    life: 2.5,
    cooldown: 2.2,
    tint: 0xff5566,
  },
  goldDrop: { min: 0, max: 0 },
  lootTable: [],
};

export const SHORE_CRAB: MonsterDef = {
  id: 'shore-crab',
  name: 'Shore Crab',
  radius: 16,
  maxHp: 30,
  contactDamage: 4,
  projectile: {
    speed: 380,
    radius: 5,
    damage: 4,
    life: 2.2,
    cooldown: 2.4,
    tint: 0xff8855,
  },
  goldDrop: { min: 1, max: 4 },
  lootTable: [{ itemId: 'crab-shell', chance: 0.6, min: 1, max: 2 }],
};

export const ASH_WRETCH: MonsterDef = {
  id: 'ash-wretch',
  name: 'Ash Wretch',
  radius: 18,
  maxHp: 45,
  contactDamage: 6,
  projectile: {
    speed: 440,
    radius: 6,
    damage: 7,
    life: 2.4,
    cooldown: 2.0,
    tint: 0x995577,
  },
  goldDrop: { min: 2, max: 6 },
  lootTable: [{ itemId: 'ash-cinder', chance: 0.55, min: 1, max: 2 }],
};
