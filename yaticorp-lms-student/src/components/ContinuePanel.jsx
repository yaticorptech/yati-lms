/**
 * @description The small daily activity a returning student meets on arrival.
 *
 * A puzzle pitched at the class they gave Career Path — a pattern for a Class 6
 * child, an aptitude question for a Class 11 student, a code-output question
 * for a postgraduate. One a day, never the same one twice until the whole set
 * has been seen, and it opens before the dashboard's own business so arriving
 * feels like something rather than a list of courses.
 *
 * Deliberately narrow about when it appears:
 *
 *   - Only with a class on file. Without one there is no way to pitch the
 *     question, and guessing would put an aptitude problem in front of a Class
 *     5 child. Those students see nothing at all.
 *   - Returning students only, decided by the server from real evidence — a
 *     first visit has nothing to come back to.
 *   - Once a day. Answering closes it until tomorrow, so it never becomes the
 *     thing standing between a student and what they logged in to do.
 *
 * No AI: the questions are a fixed bank on the server. A generated puzzle per
 * student per day would spend a Gemini call each time, against an allowance
 * where one onboarding already costs three, and would put a wait in front of
 * the dashboard.
 */
import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Flame, ArrowRight, Puzzle, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

// Once per browser session, so it returns tomorrow but not on every click.
const SEEN_KEY = 'yati:dailyActivitySeen';

export default function ContinuePanel() {
  const { user, isCareerPathEnabled } = useContext(AuthContext);

  const [activity, setActivity] = useState(null);
  const [next, setNext] = useState(null);
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const close = useCallback(() => {
    setLeaving(true);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => setOpen(false), reduced ? 0 : 300);
  }, []);

  useEffect(() => {
    if (!user || !isCareerPathEnabled) return;
    if (sessionStorage.getItem(SEEN_KEY)) return;

    let cancelled = false;
    Promise.all([
      api.get('/career/activity'),
      // Only for the line shown after they answer. Its failure must not stop
      // the puzzle, so it is allowed to come back empty.
      api.get('/career/today').catch(() => ({ data: null }))
    ])
      .then(([act, today]) => {
        const a = act?.data;
        // No class on file, already done today, or not a returning student.
        if (cancelled || !a?.eligible || a.done) return;
        if (today?.data && today.data.eligible && !today.data.returning) return;

        sessionStorage.setItem(SEEN_KEY, '1');
        setActivity(a.activity);
        setNext(today?.data?.eligible ? today.data : null);
        window.setTimeout(() => !cancelled && setOpen(true), 700);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user, isCareerPathEnabled]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const submit = async (index) => {
    if (result || sending) return;
    setPicked(index);
    setSending(true);
    try {
      const { data } = await api.post('/career/activity/answer', { chosen: index });
      setResult(data);
    } catch {
      // Grading failed: let them try again rather than trapping them.
      setPicked(null);
    } finally {
      setSending(false);
    }
  };

  if (!open || !activity) return null;

  const onwardTo = next?.task || !next?.planReady ? '/career/planner' : '/career';
  const onwardLabel = next?.task ? 'Start today’s task' : next?.planReady ? 'See my progress' : 'Plan my day';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Today's activity"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm ${
        leaving ? 'animate-panel-out' : 'animate-panel-in'
      }`}
    >
      {/* Stops a click inside the card reaching the backdrop's close handler. */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-800 px-5 py-4 text-white">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-3 right-3 rounded-lg p-1.5 text-indigo-200 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <X size={16} />
          </button>
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-indigo-200 uppercase">
            <Puzzle size={12} />
            Today’s {activity.kind.toLowerCase()}
          </p>
          <h2 className="mt-1 pr-6 text-lg font-bold">
            {result ? 'Nice one' : `A quick one before you start, ${user?.name?.split(' ')[0]}`}
          </h2>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="leading-relaxed font-semibold text-slate-800">{activity.prompt}</p>

          <div className="grid gap-2">
            {activity.options.map((option, i) => {
              const isAnswer = result && i === result.answer;
              const isWrongPick = result && i === picked && !result.correct;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={Boolean(result) || sending}
                  onClick={() => submit(i)}
                  aria-label={option}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                    isAnswer
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : isWrongPick
                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : result
                          ? 'border-slate-200 bg-white text-slate-400'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  <span>{option}</span>
                  {isAnswer && <CheckCircle2 size={16} className="shrink-0" />}
                  {isWrongPick && <XCircle size={16} className="shrink-0" />}
                </button>
              );
            })}
          </div>

          {result && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                <Lightbulb size={14} />
                {result.correct ? 'Correct' : 'Not quite'}
                {result.xpAwarded > 0 && (
                  <span className="ml-auto rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-bold text-amber-900">
                    +{result.xpAwarded} XP
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-900/80">{result.why}</p>
            </div>
          )}

          {result && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
              {next?.streak > 0 ? (
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                  <Flame size={15} />
                  {next.streak}-day streak
                </p>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  to={onwardTo}
                  onClick={close}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  {onwardLabel}
                  <ArrowRight size={15} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
                >
                  Continue
                </button>
              )}
            </div>
          )}

          {!result && (
            <p className="text-center text-xs text-slate-400">
              Pick an answer — a new one arrives tomorrow.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
