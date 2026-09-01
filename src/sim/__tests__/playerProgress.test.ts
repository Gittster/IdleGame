import { describe, it, expect } from 'vitest';
import { PlayerProgress } from '../core/playerProgress';

describe('PlayerProgress', () => {
  it('adds and spends gold, refusing to overspend', () => {
    const progress = new PlayerProgress('zone-a');
    progress.addGold(10);
    expect(progress.gold).toBe(10);
    expect(progress.spendGold(15)).toBe(false);
    expect(progress.gold).toBe(10);
    expect(progress.spendGold(10)).toBe(true);
    expect(progress.gold).toBe(0);
  });

  it('starts with only the given zone unlocked, and unlockZone adds more', () => {
    const progress = new PlayerProgress('zone-a');
    expect(progress.unlockedZoneIds.has('zone-a')).toBe(true);
    expect(progress.unlockedZoneIds.has('zone-b')).toBe(false);
    progress.unlockZone('zone-b');
    expect(progress.unlockedZoneIds.has('zone-b')).toBe(true);
  });

  it('produces a fresh snapshot reference only when state actually changes', () => {
    const progress = new PlayerProgress('zone-a', 2);
    const snap0 = progress.getSnapshot();
    expect(progress.getSnapshot()).toBe(snap0);

    progress.addGold(1);
    const snap1 = progress.getSnapshot();
    expect(snap1).not.toBe(snap0);
    expect(snap1.gold).toBe(1);
  });

  it('notifies subscribers on gold, inventory, and unlock changes, and stops after unsubscribing', () => {
    const progress = new PlayerProgress('zone-a');
    let notified = 0;
    const unsubscribe = progress.subscribe(() => notified++);

    progress.addGold(5);
    progress.addItem('crab-shell', 1, 20);
    progress.unlockZone('zone-b');
    expect(notified).toBe(3);

    unsubscribe();
    progress.addGold(1);
    expect(notified).toBe(3);
  });

  it('canAfford checks both gold and item quantities', () => {
    const progress = new PlayerProgress('zone-a');
    progress.addGold(50);
    progress.addItem('crab-shell', 10, 20);

    expect(progress.canAfford({ gold: 50, items: [{ itemId: 'crab-shell', qty: 10 }] })).toBe(true);
    expect(progress.canAfford({ gold: 51, items: [] })).toBe(false);
    expect(progress.canAfford({ gold: 0, items: [{ itemId: 'crab-shell', qty: 11 }] })).toBe(false);
  });

  it('unlockBuilding only deducts cost once it can afford it, and is idempotent once owned', () => {
    const progress = new PlayerProgress('zone-a');
    const cost = { gold: 100, items: [{ itemId: 'crab-shell', qty: 5 }] };

    expect(progress.unlockBuilding('factory', cost)).toBe(false);
    expect(progress.unlockedBuildings.has('factory')).toBe(false);

    progress.addGold(100);
    progress.addItem('crab-shell', 5, 20);
    expect(progress.unlockBuilding('factory', cost)).toBe(true);
    expect(progress.unlockedBuildings.has('factory')).toBe(true);
    expect(progress.gold).toBe(0);
    expect(progress.inventory.countItem('crab-shell')).toBe(0);

    progress.addGold(100);
    expect(progress.unlockBuilding('factory', cost)).toBe(true);
    expect(progress.gold).toBe(100); // already owned — no re-charge
  });

  it('purchaseUpgrade behaves the same way as unlockBuilding', () => {
    const progress = new PlayerProgress('zone-a');
    const cost = { gold: 20, items: [] };

    expect(progress.purchaseUpgrade('auto-targeting', cost)).toBe(false);

    progress.addGold(20);
    expect(progress.purchaseUpgrade('auto-targeting', cost)).toBe(true);
    expect(progress.unlockedUpgrades.has('auto-targeting')).toBe(true);
    expect(progress.gold).toBe(0);
  });

  it('setAutoTarget toggles the flag and notifies', () => {
    const progress = new PlayerProgress('zone-a');
    let notified = 0;
    progress.subscribe(() => notified++);

    expect(progress.autoTargetEnabled).toBe(false);
    progress.setAutoTarget(true);
    expect(progress.autoTargetEnabled).toBe(true);
    expect(notified).toBe(1);
  });
});
