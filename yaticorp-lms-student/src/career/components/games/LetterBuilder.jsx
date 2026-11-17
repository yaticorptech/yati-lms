import WordScramble from './WordScramble';
import { SECTION_BANDS } from './catalog';

/** Letter Builder (2026-11-14, the 84 games): the young section's own game, made from WordScramble's young mode — its own card, levels and records. */
export default function LetterBuilder({ onExit }) {
  return <WordScramble onExit={onExit} gameId="letter-builder" bands={SECTION_BANDS.young} title="Letter Builder" />;
}
