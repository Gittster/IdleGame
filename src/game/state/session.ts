import { PlayerProgress } from '../../sim/core/playerProgress';
import { FIRST_ZONE } from '../../data/zones';
import { loadSavedProgress, startAutosave } from './persistence';

/** The single account-progress instance for this session, shared across
 *  every CombatWorld constructed as scenes switch between Combat and
 *  Town — gold and inventory need to survive that switch, unlike the
 *  rest of a CombatWorld's state which resets per zone. Restored from
 *  localStorage on startup (if a save exists) and autosaved from then on. */
export const playerProgress = new PlayerProgress(FIRST_ZONE.id);

const saved = loadSavedProgress();
if (saved) playerProgress.restore(saved);

startAutosave(playerProgress);
