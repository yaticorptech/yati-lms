import SequenceRecall from './SequenceRecall';
import { SECTION_BANDS } from './catalog';

/** Flash Sequence (2026-11-14, the 84 games): the young section's own game, made from SequenceRecall's young mode — its own card, levels and records. */
export default function FlashSequence({ onExit }) {
  return <SequenceRecall onExit={onExit} gameId="flash-sequence" bands={SECTION_BANDS.young} title="Flash Sequence" />;
}
