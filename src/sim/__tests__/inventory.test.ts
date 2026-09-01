import { describe, it, expect } from 'vitest';
import { Inventory } from '../core/inventory';

describe('Inventory', () => {
  it('adds a new stack into an empty slot', () => {
    const inv = new Inventory(4);
    const leftover = inv.addItem('gold-ore', 5, 20);
    expect(leftover).toBe(0);
    expect(inv.slots[0]).toEqual({ itemId: 'gold-ore', qty: 5 });
  });

  it('stacks into an existing slot of the same item up to maxStack before using a new slot', () => {
    const inv = new Inventory(4);
    inv.addItem('gold-ore', 15, 20);
    inv.addItem('gold-ore', 10, 20);
    expect(inv.slots[0]).toEqual({ itemId: 'gold-ore', qty: 20 });
    expect(inv.slots[1]).toEqual({ itemId: 'gold-ore', qty: 5 });
  });

  it('returns the leftover quantity that could not fit when every slot is full', () => {
    const inv = new Inventory(1);
    inv.addItem('gold-ore', 20, 20);
    const leftover = inv.addItem('gold-ore', 5, 20);
    expect(leftover).toBe(5);
    expect(inv.slots[0]).toEqual({ itemId: 'gold-ore', qty: 20 });
  });

  it('replaceContents overwrites capacity and slots wholesale', () => {
    const inv = new Inventory(2);
    inv.addItem('gold-ore', 5, 20);

    inv.replaceContents(3, [null, { itemId: 'crab-shell', qty: 7 }]);

    expect(inv.capacity).toBe(3);
    expect(inv.slots).toEqual([null, { itemId: 'crab-shell', qty: 7 }, null]);
  });

  it('expand adds usable empty slots without disturbing existing ones', () => {
    const inv = new Inventory(1);
    inv.addItem('gold-ore', 20, 20);
    inv.expand(2);
    expect(inv.capacity).toBe(3);
    expect(inv.slots).toHaveLength(3);

    const leftover = inv.addItem('gold-ore', 5, 20);
    expect(leftover).toBe(0);
    expect(inv.slots[1]).toEqual({ itemId: 'gold-ore', qty: 5 });
  });
});
