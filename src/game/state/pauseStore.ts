/**
 * A plain Space-triggered pause, independent of the Settings panel
 * (settingsStore) — Space just freezes combat, Escape brings up the
 * Settings menu (which pauses too, via its own isOpen check). Kept as
 * its own store so CombatScene can freeze on either condition without
 * the two meanings getting tangled together.
 */
class PauseStore {
  private paused = false;
  private listeners = new Set<() => void>();

  isPaused(): boolean {
    return this.paused;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.notify();
  }

  toggle(): void {
    this.setPaused(!this.paused);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const pauseStore = new PauseStore();
