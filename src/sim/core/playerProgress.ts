import { Inventory, type ItemStack } from './inventory';
import type { BuildingId, Cost } from '../../data/buildings';
import { ITEMS } from '../../data/items';

/** A trade ship is either docked at the Trading Post, ready to load, or
 *  out at sea with cargo — resolved back into Supplies once `returnAt`
 *  (a wall-clock timestamp) has passed. Wall-clock rather than a sim-tick
 *  countdown so a voyage keeps progressing while the player is off doing
 *  something else entirely, per DESIGN.md's offline-progress pattern. */
export type ShipState = { status: 'docked' } | { status: 'at_sea'; returnAt: number; cargoItemId: string; cargoQty: number };

/** Placeholder pacing — short enough to actually test the loop; a real
 *  idle-game trade voyage would run much longer. Retune once there's
 *  playtesting data to tune against. */
export const TRADE_DURATION_MS = 90_000;

export interface ProgressSnapshot {
  gold: number;
  supplies: number;
  slots: readonly (ItemStack | null)[];
  capacity: number;
  unlockedZoneIds: readonly string[];
  unlockedBuildings: readonly BuildingId[];
  unlockedUpgrades: readonly string[];
  autoTargetEnabled: boolean;
  ships: readonly ShipState[];
}

const STARTING_CAPACITY = 12;

/** The on-disk (localStorage) shape of a save — see src/game/state/
 *  persistence.ts for where this actually gets read/written. Versioned so
 *  a future shape change can detect and discard (or migrate) an old save
 *  instead of restoring garbage into a fresh PlayerProgress. `supplies`/
 *  `ships` are read defensively in restore() since a save written before
 *  Trading existed won't have them. */
export interface PlayerProgressSaveData {
  version: 1;
  gold: number;
  supplies: number;
  inventory: { capacity: number; slots: (ItemStack | null)[] };
  unlockedZoneIds: string[];
  unlockedBuildings: BuildingId[];
  unlockedUpgrades: string[];
  autoTargetEnabled: boolean;
  ships: ShipState[];
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
  supplies = 0;
  readonly inventory: Inventory;
  readonly unlockedZoneIds = new Set<string>();
  readonly unlockedBuildings = new Set<BuildingId>();
  readonly unlockedUpgrades = new Set<string>();
  autoTargetEnabled = false;
  /** One ship to start — see DESIGN.md-style scoping note in the Trading
   *  Post UI; buying more is a natural future upgrade, not built yet. */
  readonly ships: ShipState[] = [{ status: 'docked' }];

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

  addSupplies(amount: number): void {
    this.supplies += amount;
    this.commit();
  }

  spendSupplies(amount: number): boolean {
    if (this.supplies < amount) return false;
    this.supplies -= amount;
    this.commit();
    return true;
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
    if (this.supplies < (cost.supplies ?? 0)) return false;
    return cost.items.every(({ itemId, qty }) => this.inventory.countItem(itemId) >= qty);
  }

  /** Deducts a cost if affordable. Returns whether it was — the caller
   *  (unlockBuilding/purchaseUpgrade) only marks the thing owned when
   *  this succeeds. */
  private pay(cost: Cost): boolean {
    if (!this.canAfford(cost)) return false;
    this.gold -= cost.gold;
    this.supplies -= cost.supplies ?? 0;
    for (const { itemId, qty } of cost.items) this.inventory.removeItem(itemId, qty);
    return true;
  }

  /** Sends a docked ship out with cargo taken from inventory now; it
   *  resolves into Supplies once TRADE_DURATION_MS has passed (see
   *  resolveDueShips). Returns false without effect if the ship isn't
   *  docked or there isn't enough of the item. */
  sendShip(shipIndex: number, itemId: string, qty: number): boolean {
    const ship = this.ships[shipIndex];
    if (!ship || ship.status !== 'docked') return false;
    if (qty <= 0 || this.inventory.countItem(itemId) < qty) return false;

    this.inventory.removeItem(itemId, qty);
    this.ships[shipIndex] = { status: 'at_sea', returnAt: Date.now() + TRADE_DURATION_MS, cargoItemId: itemId, cargoQty: qty };
    this.commit();
    return true;
  }

  /** Docks and credits Supplies for any ship whose voyage has finished.
   *  Called lazily wherever the UI or a periodic tick happens to look
   *  (see session.ts's autosave interval) rather than on a dedicated sim
   *  clock — a voyage resolves whenever it's next observed, including
   *  after the player was away, matching the wall-clock design above. */
  resolveDueShips(): void {
    const now = Date.now();
    let changed = false;
    for (let i = 0; i < this.ships.length; i++) {
      const ship = this.ships[i]!;
      if (ship.status === 'at_sea' && now >= ship.returnAt) {
        const item = ITEMS[ship.cargoItemId];
        if (item) this.supplies += item.tradeValue * ship.cargoQty;
        this.ships[i] = { status: 'docked' };
        changed = true;
      }
    }
    if (changed) this.commit();
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
      supplies: this.supplies,
      inventory: {
        capacity: this.inventory.capacity,
        slots: this.inventory.slots.map((slot) => (slot ? { ...slot } : null)),
      },
      unlockedZoneIds: Array.from(this.unlockedZoneIds),
      unlockedBuildings: Array.from(this.unlockedBuildings),
      unlockedUpgrades: Array.from(this.unlockedUpgrades),
      autoTargetEnabled: this.autoTargetEnabled,
      ships: this.ships.map((ship) => ({ ...ship })),
    };
  }

  /** Overwrites this instance's state from a save, in place — rather than
   *  constructing a new PlayerProgress, so every existing reference (a
   *  CombatWorld built off this instance, the game/state/session singleton)
   *  keeps seeing the restored data without needing to be re-wired.
   *  `supplies`/`ships` default gracefully for a save written before
   *  Trading existed. */
  restore(data: PlayerProgressSaveData): void {
    this.gold = data.gold;
    this.supplies = data.supplies ?? 0;
    this.inventory.replaceContents(data.inventory.capacity, data.inventory.slots);

    this.unlockedZoneIds.clear();
    for (const id of data.unlockedZoneIds) this.unlockedZoneIds.add(id);

    this.unlockedBuildings.clear();
    for (const id of data.unlockedBuildings) this.unlockedBuildings.add(id);

    this.unlockedUpgrades.clear();
    for (const id of data.unlockedUpgrades) this.unlockedUpgrades.add(id);

    this.autoTargetEnabled = data.autoTargetEnabled;

    const restoredShips = data.ships && data.ships.length > 0 ? data.ships.map((ship) => ({ ...ship })) : [{ status: 'docked' as const }];
    this.ships.length = 0;
    this.ships.push(...restoredShips);

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

  devSetSupplies(amount: number): void {
    this.supplies = Math.max(0, Math.floor(amount));
    this.commit();
  }

  /** Instantly completes a voyage instead of waiting out TRADE_DURATION_MS. */
  devForceShipReturn(shipIndex: number): void {
    const ship = this.ships[shipIndex];
    if (!ship || ship.status !== 'at_sea') return;
    ship.returnAt = Date.now();
    this.resolveDueShips();
  }

  private buildSnapshot(): ProgressSnapshot {
    return {
      gold: this.gold,
      supplies: this.supplies,
      slots: this.inventory.slots.slice(),
      capacity: this.inventory.capacity,
      unlockedZoneIds: Array.from(this.unlockedZoneIds),
      unlockedBuildings: Array.from(this.unlockedBuildings),
      unlockedUpgrades: Array.from(this.unlockedUpgrades),
      autoTargetEnabled: this.autoTargetEnabled,
      ships: this.ships.map((ship) => ({ ...ship })),
    };
  }

  private commit(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }
}
