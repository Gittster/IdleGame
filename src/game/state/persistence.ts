import type { PlayerProgress, PlayerProgressSaveData } from '../../sim/core/playerProgress';

const STORAGE_KEY = 'idlegame:save:v1';
const AUTOSAVE_INTERVAL_MS = 5000;

/** Reads a save from localStorage, or null if there isn't one, it's from
 *  an incompatible version, or storage is unavailable (private browsing,
 *  disabled cookies/storage) — any of which just means "start fresh"
 *  rather than a crash. */
export function loadSavedProgress(): PlayerProgressSaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerProgressSaveData>;
    if (parsed.version !== 1) return null;
    return parsed as PlayerProgressSaveData;
  } catch {
    return null;
  }
}

function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress.serialize()));
  } catch {
    // Storage full/blocked — silently skip. Losing one autosave tick isn't
    // worth surfacing an error to the player over.
  }
}

export function clearSavedProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage isn't available in the first place.
  }
}

/**
 * Autosaves `progress` on every change, coalesced onto a fixed interval so
 * a burst of pickups doesn't hammer localStorage with a write per pickup,
 * plus an immediate flush when the tab is hidden or unloaded so the very
 * latest state survives a closed tab between autosave ticks.
 */
export function startAutosave(progress: PlayerProgress): void {
  let dirty = false;
  progress.subscribe(() => {
    dirty = true;
  });

  const flush = (): void => {
    if (!dirty) return;
    dirty = false;
    saveProgress(progress);
  };

  setInterval(flush, AUTOSAVE_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('beforeunload', flush);
}
