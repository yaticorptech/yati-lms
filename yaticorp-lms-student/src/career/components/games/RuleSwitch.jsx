import ColourMatch from './ColourMatch';
import { SECTION_BANDS } from './catalog';

/** Rule Switch (2026-11-14, the 84 games): the master section's own game, made from ColourMatch's master mode — its own card, levels and records. */
export default function RuleSwitch({ onExit }) {
  return <ColourMatch onExit={onExit} gameId="rule-switch" bands={SECTION_BANDS.master} title="Rule Switch" />;
}
