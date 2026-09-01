import type { BuildingId, Cost } from './buildings';
import { POWER_BOLT } from './skills';

/** What an upgrade actually does — CombatWorld reads these by kind rather
 *  than special-casing upgrade ids, so adding a new upgrade of an existing
 *  effect kind (another skill's damage boost, another flat-stat trinket)
 *  needs no sim changes. */
export type UpgradeEffect =
  | { kind: 'autoTargeting' }
  | { kind: 'skillDamageMult'; skillId: string; mult: number }
  | { kind: 'maxHpFlat'; amount: number };

export interface UpgradeDef {
  id: string;
  building: BuildingId;
  name: string;
  description: string;
  cost: Cost;
  effect: UpgradeEffect;
}

const STARTER_UPGRADE_COST: Cost = {
  gold: 60,
  items: [
    { itemId: 'crab-shell', qty: 20 },
    { itemId: 'ash-cinder', qty: 20 },
  ],
};

export const UPGRADES: Record<string, UpgradeDef> = {
  'auto-targeting': {
    id: 'auto-targeting',
    building: 'factory',
    name: 'Auto-Targeting',
    description:
      'Your basic attack automatically aims and fires at the nearest enemy — no aiming required. Halves your fire rate while switched on.',
    cost: STARTER_UPGRADE_COST,
    effect: { kind: 'autoTargeting' },
  },
  'empowered-bolt': {
    id: 'empowered-bolt',
    building: 'library',
    name: 'Empowered Bolt',
    description: `${POWER_BOLT.name} deals 50% more damage.`,
    cost: STARTER_UPGRADE_COST,
    effect: { kind: 'skillDamageMult', skillId: POWER_BOLT.id, mult: 1.5 },
  },
  'travelers-charm': {
    id: 'travelers-charm',
    building: 'forge',
    name: "Traveler's Charm",
    description: '+15 max HP.',
    cost: STARTER_UPGRADE_COST,
    effect: { kind: 'maxHpFlat', amount: 15 },
  },
};
