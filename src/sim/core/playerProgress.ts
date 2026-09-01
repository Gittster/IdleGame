import { Inventory, type ItemStack } from './inventory';

export interface ProgressSnapshot {
  gold: number;
  slots: readonly (ItemStack | null)[];
  capacity: number;
  unlockedZoneIds: readonly string[];
}

const STARTING_CAPACITY = 12;

/**
 * The account-level state that survives across zones and the Combat/Town
 * scene switch — gold, inventory, and which zones have been unlocked so
 * far (the MVP form of DESIGN.md §6's single-source-of-truth state).
 *
 * Exposes a cached snapshot + subscribe pair, rebuilt only on an actual
 * mutation, so the React UI overlay can drive `useSyncExternalStore`
 * directly instead of polling or diffing.
 */
export class PlayerProgress {
  gold = 0;
  readonly inventory: Inventory;
  readonly unlockedZoneIds = new Set<string>();

  private listeners = new Set<() => void>();
  private snapshot: ProgressSnapshot;

  constructor(startingZoneId: string, startingCapacity = STARTING_CAPACITY) {
    this.inventory = new Inventory(startingCapacity);
    this.unlockedZoneIds.add(startingZoneId);
    this.snapshot = this.buildSnapshot();
  }

  getSnapshot(): ProgressSnapshot {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addGold(amount: number): void {
    this.gold += amount;
    this.commit();
  }

  spendGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    this.commit();
    return true;
  }

  /** Returns the leftover quantity that didn't fit (0 if it all fit). */
  addItem(itemId: string, qty: number, maxStack: number): number {
    const leftover = this.inventory.addItem(itemId, qty, maxStack);
    this.commit();
    return leftover;
  }

  unlockZone(zoneId: string): void {
    if (this.unlockedZoneIds.has(zoneId)) return;
    this.unlockedZoneIds.add(zoneId);
    this.commit();
  }

  expandInventory(extraSlots: number): void {
    this.inventory.expand(extraSlots);
    this.commit();
  }

  private buildSnapshot(): ProgressSnapshot {
    return {
      gold: this.gold,
      slots: this.inventory.slots.slice(),
      capacity: this.inventory.capacity,
      unlockedZoneIds: Array.from(this.unlockedZoneIds),
    };
  }

  private commit(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }
}
