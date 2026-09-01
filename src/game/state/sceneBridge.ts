export type Screen = 'combat' | 'town';

/**
 * A thin bridge between Phaser's scene control and the React `/ui`
 * overlay: the overlay can't call `scene.start()` directly, so TownScene
 * registers a handler here and the overlay invokes it through this
 * instead of reaching into Phaser itself. Also carries which screen is
 * currently active so the overlay knows whether to render the town panel.
 */
class SceneBridge {
  private screen: Screen = 'combat';
  private enterZoneHandler: ((zoneId: string) => void) | null = null;
  private goToTownHandler: (() => void) | null = null;
  private fullscreenToggleHandler: (() => void) | null = null;
  private listeners = new Set<() => void>();

  getScreen(): Screen {
    return this.screen;
  }

  setScreen(screen: Screen): void {
    this.screen = screen;
    this.notify();
  }

  setEnterZoneHandler(handler: (zoneId: string) => void): void {
    this.enterZoneHandler = handler;
  }

  enterZone(zoneId: string): void {
    this.enterZoneHandler?.(zoneId);
  }

  /** Registered by CombatScene only — the HUD's "Town" button is combat-
   *  only (the overlay hides it outside combat), so there's nothing to
   *  clear when leaving combat. */
  setGoToTownHandler(handler: (() => void) | null): void {
    this.goToTownHandler = handler;
  }

  goToTown(): void {
    this.goToTownHandler?.();
  }

  /** Registered by both CombatScene and TownScene on create — fullscreen
   *  is available from either screen, unlike the Town button. */
  setFullscreenToggleHandler(handler: (() => void) | null): void {
    this.fullscreenToggleHandler = handler;
  }

  toggleFullscreen(): void {
    this.fullscreenToggleHandler?.();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const sceneBridge = new SceneBridge();
