/** Declarative content table — see DESIGN.md §6 for why content lives here
 *  instead of being hardcoded into sim/game logic. */
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
  };
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
  },
};
