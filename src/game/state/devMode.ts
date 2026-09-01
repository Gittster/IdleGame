const DEV_MODE_STORAGE_KEY = 'idlegame:devmode';

/**
 * Dev mode is always on for `npm run dev` (import.meta.env.DEV), but the
 * production build shipped to GitHub Pages has that compiled out — so on
 * the deployed site it's opt-in instead: visiting once with `?dev=1` in
 * the URL flips a localStorage flag that then keeps it on for that
 * browser until `?dev=0` (or the panel's own disable button) turns it
 * back off. This isn't hidden from other visitors (it's client-side JS,
 * inspectable by anyone) — it's just not casually stumbled into.
 */
function computeInitialDevMode(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('dev')) {
      const enabled = params.get('dev') !== '0';
      localStorage.setItem(DEV_MODE_STORAGE_KEY, enabled ? '1' : '0');
      return enabled;
    }
    return localStorage.getItem(DEV_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export const isDevModeEnabled = computeInitialDevMode();

/** Turns dev mode off for future loads on this browser. Reload to take
 *  effect — this only clears the persisted flag, it doesn't hide an
 *  already-mounted panel by itself. */
export function disableDevMode(): void {
  try {
    localStorage.setItem(DEV_MODE_STORAGE_KEY, '0');
  } catch {
    // Nothing to persist if storage isn't available.
  }
}
