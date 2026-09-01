import { PlayerProgress } from '../../sim/core/playerProgress';
import { FIRST_ZONE } from '../../data/zones';

/** The single account-progress instance for this session, shared across
 *  every CombatWorld constructed as scenes switch between Combat and
 *  Town — gold and inventory need to survive that switch, unlike the
 *  rest of a CombatWorld's state which resets per zone. */
export const playerProgress = new PlayerProgress(FIRST_ZONE.id);
