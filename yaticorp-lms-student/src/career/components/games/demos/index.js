/** Every game's own demo, by id (2026-11-14): each file covers one section's categories. */
import { DEMOS as youngA } from './youngA.jsx';
import { DEMOS as youngB } from './youngB.jsx';
import { DEMOS as smartA } from './smartA.jsx';
import { DEMOS as smartB } from './smartB.jsx';
import { DEMOS as masterA } from './masterA.jsx';
import { DEMOS as masterB } from './masterB.jsx';

export const GAME_DEMOS = { ...youngA, ...youngB, ...smartA, ...smartB, ...masterA, ...masterB };
