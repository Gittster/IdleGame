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
});
