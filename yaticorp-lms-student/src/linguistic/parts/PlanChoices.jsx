/**
 * The times to choose for the learning plan (asked 2026-10-24), each with its
 * lessons a day, minutes, and whether it has every lesson or the main ones.
 * On the start screens and the roadmap. Recommended: `recommend` (the start
 * screens' pick for the minutes a day the student said), else the shortest
 * with every lesson.
 */
import { Check, Loader2 } from 'lucide-react';
import { COLORS } from '../meta';
import { planLabel, perDayText } from './plan';

export default function PlanChoices({ options, picked, onPick, busy = null, recommend = null }) {
    const recommended = recommend || options.find((o) => o.tier === 'full')?.days;
    return (
        <div className="grid gap-2" data-plan-choices>
            {options.map((o) => {
                const on = picked === o.days;
                return (
                    <button key={o.days} type="button" onClick={() => onPick(o.days)} disabled={!!busy} aria-pressed={on} data-plan-days={o.days}
                        className="lingo-tile flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left" style={on ? { borderColor: '#84D8FF', background: COLORS.blue.light } : undefined}>
                        <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2 text-[17px] font-extrabold text-[#3c3c3c]">
                                {planLabel(o.days)}
                                {o.days === recommended && <span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase" style={{ background: COLORS.green.light, color: COLORS.green.ink }}>Recommended</span>}
                            </span>
                            <span className="block text-sm font-semibold text-[#777]">{perDayText(o.perDay)} · about {o.minutes} min a day</span>
                            <span className="block text-sm font-semibold" style={{ color: o.tier === 'full' ? COLORS.green.ink : COLORS.orange.ink }} data-plan-tier={o.tier}>
                                {o.tier === 'full' ? `Every lesson (${o.lessons})` : `The main lessons (${o.lessons}) — the extra practice left out`}
                            </span>
                        </span>
                        {busy === o.days ? <Loader2 size={20} className="shrink-0 animate-spin text-[#AFAFAF]" /> : on && <Check size={22} strokeWidth={3.5} className="shrink-0" style={{ color: COLORS.blue.face }} />}
                    </button>
                );
            })}
        </div>
    );
}

