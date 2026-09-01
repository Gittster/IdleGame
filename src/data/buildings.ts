/** Declarative content table — see DESIGN.md §6. Buildings are Town-only
 *  unlocks that open up their own upgrade lists (src/data/upgrades.ts) —
 *  the MVP form of DESIGN.md §4's Smithing/Alchemy/Construction-style
 *  subsystems (Input: farmed resources -> Output: permanent bonuses). */
export type BuildingId = 'factory' | 'library' | 'forge' | 'craftingBench';

export interface ItemCost {
  itemId: string;
  qty: number;
}

export interface Cost {
  gold: number;
  /** Optional — only Crafting Bench recipes need this so far. Omitted
   *  costs are treated as 0. */
  supplies?: number;
  items: ItemCost[];
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  unlockCost: Cost;
}

/** A ballpark for "about 5 minutes of farming Zones 1-2" — a tunable
 *  design target, not derived from a drop-rate simulation. Easy to retune
 *  in one place once real playtesting data exists. */
const FIVE_MINUTES_OF_ZONE_1_2_FARMING: Cost = {
  gold: 100,
  items: [
    { itemId: 'crab-shell', qty: 50 },
    { itemId: 'ash-cinder', qty: 50 },
  ],
};

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  factory: {
    id: 'factory',
    name: 'The Factory',
    description: 'Automations that trade some of your active edge for hands-off combat.',
    unlockCost: FIVE_MINUTES_OF_ZONE_1_2_FARMING,
  },
  library: {
    id: 'library',
    name: 'The Library',
    description: 'Permanent upgrades to your skills.',
    unlockCost: FIVE_MINUTES_OF_ZONE_1_2_FARMING,
  },
  forge: {
    id: 'forge',
    name: 'The Forge',
    description: 'Craft gear that permanently strengthens your character.',
    unlockCost: FIVE_MINUTES_OF_ZONE_1_2_FARMING,
  },
  craftingBench: {
    id: 'craftingBench',
    name: 'The Crafting Bench',
    description: 'Craft equipment from the supplies your trade ships bring back.',
    unlockCost: FIVE_MINUTES_OF_ZONE_1_2_FARMING,
  },
};
