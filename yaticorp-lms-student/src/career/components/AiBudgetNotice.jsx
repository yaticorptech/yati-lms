/**
 * @description What a student sees when the day's AI allowance is gone.
 *
 * The failure this replaces was a red toast saying "Server Error", which is
 * both untrue and useless: nothing is broken, and there is a specific thing to
 * do — come back tomorrow. This says which allowance ran out, when it returns,
 * and — most importantly — that everything already generated is still there,
 * because the instinct on seeing an error is to assume the work is lost.
 */
import { Clock, Info } from 'lucide-react';

/** Local midnight, phrased the way a person would say it. */
const whenItReturns = (resetsAt) => {
  if (!resetsAt) return 'at midnight';
  const at = new Date(resetsAt);
  if (Number.isNaN(at.getTime())) return 'at midnight';
  const hours = Math.max(0, Math.round((at - Date.now()) / 3600000));
  if (hours <= 1) return 'within the hour';
  return `in about ${hours} hour${hours === 1 ? '' : 's'}`;
};

/**
 * @param {'student-daily-cap'|'service-daily-cap'|'provider-daily-quota'} code
 */
export default function AiBudgetNotice({ code, message, resetsAt, className = '' }) {
  // The distinction matters to the reader: one is "you have used yours", the
  // other two are "the whole service is out", and a student who reads the
  // second as the first will assume they did something wrong.
  const mine = code === 'student-daily-cap';

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 ${className}`}
    >
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="min-w-0 text-sm leading-relaxed text-amber-900">
        <p className="font-bold">
          {mine ? "You've used today's AI requests" : 'AI is resting for today'}
        </p>
        <p className="mt-0.5 text-amber-800">
          {message || 'The daily AI allowance has been used up.'}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Back {whenItReturns(resetsAt)} — your roadmap, plan and lessons are all still here.
        </p>
      </div>
    </div>
  );
}
