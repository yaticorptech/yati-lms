import { Brain } from 'lucide-react';
import { coachFor } from './gameCoach';
import { goalOf } from './gameGoals';
import { shortStepsOf } from './gameStepsShort';

/**
 * How to play, during the game (2026-11-14, the user: "show clear instructions on the left"): what the game is about
 * in one line, then its steps numbered, then the tip — and, under them, what to do right now (the game's own line).
 */
export default function HowToPlay({ gameId, compact = false }) {
  const coach = coachFor(gameId);
  // Three short, simple, whole sentences (2026-11-14, the user): never cut off.
  const steps = shortStepsOf(gameId) || coach.steps;
  const goal = goalOf(gameId);
  return (
    <div className={`rounded-2xl bg-violet-50/90 text-left ring-1 ring-violet-100 ring-inset ${compact ? 'p-3' : 'p-4 xl:p-5'}`} data-how-to-play>
      <p className="flex items-center gap-2 text-[0.68rem] font-black tracking-[0.14em] text-violet-600 uppercase">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-violet-600 shadow-sm ring-1 ring-violet-100"><Brain className="h-4 w-4" /></span>
        How to play
      </p>
      {goal && <p className="mt-2 text-sm leading-snug font-black text-[#1b2456]">{goal}</p>}
      <ol className="mt-2 space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] leading-snug font-semibold text-slate-700" title={s}>
            <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-600 text-[10px] font-black text-white">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
