import { Inventory, type ItemStack } from './inventory';
import type { BuildingId, Cost } from '../../data/buildings';

export interface ProgressSnapshot {
  gold: number;
  slots: readonly (ItemStack | null)[];
  capacity: number;
  unlockedZoneIds: readonly string[];
  unlockedBuildings: readonly BuildingId[];
  unlockedUpgrades: readonly string[];
  autoTargetEnabled: boolean;
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
  readonly unlockedBuildings = new Set<BuildingId>();
  readonly unlockedUpgrades = new Set<string>();
  autoTargetEnabled = false;

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

  canAfford(cost: Cost): boolean {
    if (this.gold < cost.gold) return false;
    return cost.items.every(({ itemId, qty }) => this.inventory.countItem(itemId) >= qty);
  }

  /** Deducts a cost if affordable. Returns whether it was — the caller
   *  (unlockBuilding/purchaseUpgrade) only marks the thing owned when
   *  this succeeds. */
  private pay(cost: Cost): boolean {
    if (!this.canAfford(cost)) return false;
    this.gold -= cost.gold;
    for (const { itemId, qty } of cost.items) this.inventory.removeItem(itemId, qty);
    return true;
  }

  /** Returns true if the building ends up unlocked — either it already
   *  was, or this purchase just unlocked it. */
  unlockBuilding(id: BuildingId, cost: Cost): boolean {
    if (this.unlockedBuildings.has(id)) return true;
    if (!this.pay(cost)) return false;
    this.unlockedBuildings.add(id);
    this.commit();
    return true;
  }

  /** Returns true if the upgrade ends up owned — either it already was,
   *  or this purchase just bought it. */
  purchaseUpgrade(id: string, cost: Cost): boolean {
    if (this.unlockedUpgrades.has(id)) return true;
    if (!this.pay(cost)) return false;
    this.unlockedUpgrades.add(id);
    this.commit();
    return true;
  }

  setAutoTarget(enabled: boolean): void {
    this.autoTargetEnabled = enabled;
    this.commit();
  }

  private buildSnapshot(): ProgressSnapshot {
    return {
      gold: this.gold,
      slots: this.inventory.slots.slice(),
      capacity: this.inventory.capacity,
      unlockedZoneIds: Array.from(this.unlockedZoneIds),
      unlockedBuildings: Array.from(this.unlockedBuildings),
      unlockedUpgrades: Array.from(this.unlockedUpgrades),
      autoTargetEnabled: this.autoTargetEnabled,
    };
  }

  private commit(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }
}
