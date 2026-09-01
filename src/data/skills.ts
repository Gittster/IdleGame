/** Declarative content table — see DESIGN.md §6. A targeted, cooldown-gated
 *  attack: aimed at wherever the player taps/clicks rather than the
 *  continuous aim direction, and hits harder than the basic attack. */
export interface SkillDef {
  id: string;
  name: string;
  cooldown: number;
  projectileSpeed: number;
  projectileRadius: number;
  projectileLife: number;
  damage: number;
  pierce: number;
  tint: number;
}

export const POWER_BOLT: SkillDef = {
  id: 'power_bolt',
  name: 'Power Bolt',
  cooldown: 2.5,
  projectileSpeed: 1400,
  projectileRadius: 10,
  projectileLife: 1.1,
  damage: 34,
  pierce: 4,
  tint: 0xb15bff,
};

export const SKILLS: Record<string, SkillDef> = {
  [POWER_BOLT.id]: POWER_BOLT,
};
