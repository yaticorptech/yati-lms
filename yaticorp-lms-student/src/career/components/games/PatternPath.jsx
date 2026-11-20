import NextInSequence from './NextInSequence';
import { SECTION_BANDS } from './catalog';

/** Pattern Path (2026-11-14, the 84 games): the young section's own game, made from NextInSequence's young mode — its own card, levels and records. */
export default function PatternPath({ onExit }) {
  return <NextInSequence onExit={onExit} gameId="pattern-path" bands={SECTION_BANDS.young} title="Pattern Path" />;
}
