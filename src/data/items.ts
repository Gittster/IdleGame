/** Declarative content table — see DESIGN.md §6 for why content lives here
 *  instead of being hardcoded into sim/game logic.
 *
 *  Deliberately flat for now (DESIGN.md §1 pillar 5: this is not a
 *  build-crafting/affix-rolling itemization game) — an item is just a
 *  stackable resource a monster drops, meant to feed town/idle mechanics
 *  rather than carry its own combat stats. */
export interface ItemDef {
  id: string;
  name: string;
  /** Max quantity a single inventory slot of this item can hold before a
   *  new slot is needed. */
  maxStack: number;
  /** Flat fill color for its ground-drop icon and inventory swatch, per
   *  the flat-shaded art direction in art/STYLE_GUIDE.md — no icon art
   *  needed yet. */
  color: number;
  /** Supplies received per unit when loaded onto a trade ship (see
   *  PlayerProgress.sendShip) — the Trading Post's whole reason to want
   *  monster drops in the first place. */
  tradeValue: number;
}

export const ITEMS: Record<string, ItemDef> = {
  'crab-shell': { id: 'crab-shell', name: 'Crab Shell', maxStack: 20, color: 0xd98c3a, tradeValue: 2 },
  'ash-cinder': { id: 'ash-cinder', name: 'Ash Cinder', maxStack: 20, color: 0x8a5a44, tradeValue: 3 },
};
