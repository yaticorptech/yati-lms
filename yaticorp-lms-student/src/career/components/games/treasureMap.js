/** The ancient map for Treasure Path (Young Thinkers): the user's picture, its places and the path between them. */
// The map is the user's picture (2026-11-18): its places, in % of the map, and the dashed path between them.
export { default as mapArt } from '../../assets/treasure/map.webp';
export { default as explorerArt } from '../../assets/treasure/explorer.webp';
import templeArt from '../../assets/treasure/temple.webp';
import waterfallArt from '../../assets/treasure/waterfall.webp';
import mountainArt from '../../assets/treasure/mountain.webp';
import chestArt from '../../assets/treasure/chest.webp';
export { chestArt };

export const MAP_W = 850;
export const MAP_H = 576;
const pct = ([x, y]) => [(x / MAP_W) * 100, (y / MAP_H) * 100];
/** camp, Lost Temple, Waterfall, Snow Mountain, Treasure Chest — the medallions' centres on the picture. */
export const NODES = [[131, 464], [289, 294], [583, 272], [389, 135], [648, 98]].map(pct);
/** The dashed path from each place to the next, so the explorer walks it rather than flying across. */
export const LEGS = [
  [[215, 483], [300, 488], [395, 470], [400, 445], [330, 420], [240, 395], [215, 360], [240, 320]],
  [[370, 288], [450, 286], [520, 283]],
  [[600, 225], [560, 205], [480, 190], [420, 170]],
  [[470, 130], [540, 128], [590, 118]]
].map((leg) => leg.map(pct));
export const PLACES = [
  { name: 'Lost Temple', art: templeArt },
  { name: 'Waterfall', art: waterfallArt },
  { name: 'Snow Mountain', art: mountainArt },
  { name: 'Treasure Chest', art: chestArt }
];
