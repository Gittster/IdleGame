const HIDE_COMPLETED_STORAGE_KEY = 'idlegame:hideCompletedUpgrades';

function loadHideCompletedUpgrades(): boolean {
  try {
    return localStorage.getItem(HIDE_COMPLETED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveHideCompletedUpgrades(value: boolean): void {
  try {
    localStorage.setItem(HIDE_COMPLETED_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Not persisted this session if storage is unavailable — harmless.
  }
}

/**
 * Combat Settings: whether the settings panel is open (CombatScene reads
 * this to pause its sim loop while it is — see the "pause button in
 * combat" request) plus the panel's one preference so far. A plain
 * reactive singleton for the same reason as inventoryStore — opened from
 * a Phaser HUD button as easily as a React one.
 */
class SettingsStore {
  private open = false;
  private hideCompletedUpgrades = loadHideCompletedUpgrades();
  private listeners = new Set<() => void>();

  isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.notify();
  }

  getHideCompletedUpgrades(): boolean {
    return this.hideCompletedUpgrades;
  }

  setHideCompletedUpgrades(value: boolean): void {
    this.hideCompletedUpgrades = value;
    saveHideCompletedUpgrades(value);
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const settingsStore = new SettingsStore();
