export interface ItemStack {
  itemId: string;
  qty: number;
}

/**
 * A fixed-size grid of stackable item slots. Deliberately dumb: it knows
 * nothing about item definitions beyond the `maxStack` its caller passes
 * in per call, so it stays decoupled from `/data`.
 */
export class Inventory {
  private _slots: (ItemStack | null)[];

  constructor(private _capacity: number) {
    this._slots = new Array(_capacity).fill(null);
  }

  get capacity(): number {
    return this._capacity;
  }

  get slots(): readonly (ItemStack | null)[] {
    return this._slots;
  }

  /**
   * Stacks into existing slots of the same item (up to maxStack) before
   * spilling into empty ones. Returns the leftover quantity that didn't
   * fit anywhere (0 if it all fit) — the caller decides what to do with
   * an item that has nowhere to go (e.g. leave it on the ground).
   */
  addItem(itemId: string, qty: number, maxStack: number): number {
    let remaining = qty;

    for (const slot of this._slots) {
      if (remaining <= 0) break;
      if (slot && slot.itemId === itemId && slot.qty < maxStack) {
        const take = Math.min(maxStack - slot.qty, remaining);
        slot.qty += take;
        remaining -= take;
      }
    }

    for (let i = 0; i < this._slots.length && remaining > 0; i++) {
      if (this._slots[i] === null) {
        const take = Math.min(maxStack, remaining);
        this._slots[i] = { itemId, qty: take };
        remaining -= take;
      }
    }

    return remaining;
  }

  /** Adds more empty slots — the "expand over time" half of the limited
   *  inventory (see DESIGN.md's itemization pillar). */
  expand(extraSlots: number): void {
    this._capacity += extraSlots;
    for (let i = 0; i < extraSlots; i++) this._slots.push(null);
  }

  /** Total quantity of itemId held across every slot. */
  countItem(itemId: string): number {
    let total = 0;
    for (const slot of this._slots) {
      if (slot && slot.itemId === itemId) total += slot.qty;
    }
    return total;
  }

  /** Removes up to qty of itemId, across as many slots as it takes.
   *  Assumes the caller already checked there's enough (see
   *  PlayerProgress.canAfford) — silently removes less than qty
   *  otherwise, since a purchase system with atomic afford-checks never
   *  hits that case. */
  removeItem(itemId: string, qty: number): void {
    let remaining = qty;
    for (let i = 0; i < this._slots.length && remaining > 0; i++) {
      const slot = this._slots[i];
      if (!slot || slot.itemId !== itemId) continue;
      const take = Math.min(slot.qty, remaining);
      slot.qty -= take;
      remaining -= take;
      if (slot.qty === 0) this._slots[i] = null;
    }
  }
}
