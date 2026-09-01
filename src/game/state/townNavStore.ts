import type { BuildingId } from '../../data/buildings';

export type TownView = 'home' | BuildingId | 'zones' | 'trading';

/**
 * Which Town sub-page is showing. Lives outside the TownPanel component
 * (rather than local useState) for two reasons: App() needs to know
 * whether we're on the home screen to decide if the Gold/Supplies HUD
 * pills should show (hidden only on the decluttered home screen, visible
 * on every sub-page where a balance is actually relevant to what you're
 * looking at), and it survives TownPanel being unmounted when Inventory
 * or Settings briefly takes over the modal slot instead.
 */
class TownNavStore {
  private view: TownView = 'home';
  private listeners = new Set<() => void>();

  getView(): TownView {
    return this.view;
  }

  setView(view: TownView): void {
    this.view = view;
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

export const townNavStore = new TownNavStore();
