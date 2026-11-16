import GridRecall from './GridRecall';
import { SECTION_BANDS } from './catalog';

/** Light-Up Garden (2026-11-14, the 84 games): the young section's own game, made from GridRecall's young mode — its own card, levels and records. */
export default function LightUpGarden({ onExit }) {
  return <GridRecall onExit={onExit} gameId="light-up-garden" bands={SECTION_BANDS.young} title="Light-Up Garden" />;
}
