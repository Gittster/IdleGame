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

/** The on-disk (localStorage) shape of a save — see src/game/state/
 *  persistence.ts for where this actually gets read/written. Versioned so
 *  a future shape change can detect and discard (or migrate) an old save
 *  instead of restoring garbage into a fresh PlayerProgress. */
export interface PlayerProgressSaveData {
  version: 1;
  gold: number;
  inventory: { capacity: number; slots: (ItemStack | null)[] };
  unlockedZoneIds: string[];
  unlockedBuildings: BuildingId[];
  unlockedUpgrades: string[];
  autoTargetEnabled: boolean;
}

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

  serialize(): PlayerProgressSaveData {
    return {
      version: 1,
      gold: this.gold,
      inventory: {
        capacity: this.inventory.capacity,
        slots: this.inventory.slots.map((slot) => (slot ? { ...slot } : null)),
      },
      unlockedZoneIds: Array.from(this.unlockedZoneIds),
      unlockedBuildings: Array.from(this.unlockedBuildings),
      unlockedUpgrades: Array.from(this.unlockedUpgrades),
      autoTargetEnabled: this.autoTargetEnabled,
    };
  }

  /** Overwrites this instance's state from a save, in place — rather than
   *  constructing a new PlayerProgress, so every existing reference (a
   *  CombatWorld built off this instance, the game/state/session singleton)
   *  keeps seeing the restored data without needing to be re-wired. */
  restore(data: PlayerProgressSaveData): void {
    this.gold = data.gold;
    this.inventory.replaceContents(data.inventory.capacity, data.inventory.slots);

    this.unlockedZoneIds.clear();
    for (const id of data.unlockedZoneIds) this.unlockedZoneIds.add(id);

    this.unlockedBuildings.clear();
    for (const id of data.unlockedBuildings) this.unlockedBuildings.add(id);

    this.unlockedUpgrades.clear();
    for (const id of data.unlockedUpgrades) this.unlockedUpgrades.add(id);

    this.autoTargetEnabled = data.autoTargetEnabled;
    this.commit();
  }

  // --- Dev-mode mutators -----------------------------------------------
  // Bypass cost/affordability checks entirely — for the dev panel
  // (src/ui/App.tsx, import.meta.env.DEV-gated) only. Never called from
  // any normal gameplay path.

  devSetGold(amount: number): void {
    this.gold = Math.max(0, Math.floor(amount));
    this.commit();
  }

  devSetItemQty(itemId: string, qty: number, maxStack: number): void {
    const current = this.inventory.countItem(itemId);
    if (current > 0) this.inventory.removeItem(itemId, current);
    const clamped = Math.max(0, Math.floor(qty));
    if (clamped > 0) this.inventory.addItem(itemId, clamped, maxStack);
    this.commit();
  }

  devSetUpgradeUnlocked(id: string, unlocked: boolean): void {
    if (unlocked) this.unlockedUpgrades.add(id);
    else this.unlockedUpgrades.delete(id);
    this.commit();
  }

  devSetBuildingUnlocked(id: BuildingId, unlocked: boolean): void {
    if (unlocked) this.unlockedBuildings.add(id);
    else this.unlockedBuildings.delete(id);
    this.commit();
  }

  devSetZoneUnlocked(id: string, unlocked: boolean): void {
    if (unlocked) this.unlockedZoneIds.add(id);
    else this.unlockedZoneIds.delete(id);
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
