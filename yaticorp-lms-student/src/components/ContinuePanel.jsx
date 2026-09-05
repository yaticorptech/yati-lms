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
import { useState, useEffect, useContext, useCallback, useId } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Flame, ArrowRight, Target, Check, Lightbulb, Sparkles } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
// The brain's motion lives with the rest of the Career Path artwork.
import '../career/components/artwork.css';

// Once per browser session, so it returns tomorrow but not on every click.
const SEEN_KEY = 'yati:dailyActivitySeen';

/**
 * A preview of the card, for looking at it rather than answering it.
 *
 * The real one appears once a day and only for returning students, so there
 * is no way to see the template on demand. Opening any page with
 * `?preview=warmup` shows this sample instead: nothing is fetched, nothing is
 * recorded, and no XP moves.
 */
const PREVIEW = {
  kind: 'Aptitude',
  prompt: 'A sum doubles in 8 years at simple interest. The annual rate is…',
  options: ['8%', '10%', '12.5%', '15%'],
  answer: 2,
  why: 'Interest equals the principal over 8 years, so 100 ÷ 8 = 12.5% a year.'
};
const isPreview = () =>
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('preview') === 'warmup' ||
    window.location.hash === '#warmup');

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * 🧠 A cheerful brain with a lightbulb — the warm-up's mascot.
 *
 * Original inline SVG: no request, sharp at any size, and it takes the card's
 * own palette. Decorative, so it is hidden from assistive technology.
 */
function BrainArt({ happy = false, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const id = (n) => `br-${n}-${uid}`;
  return (
    <svg viewBox="0 0 260 220" className={className} aria-hidden>
      <defs>
        <linearGradient id={id('brain')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbb6ce" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id={id('bulb')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <radialGradient id={id('glow')}>
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sparkles */}
      <g fill="#a78bfa">
        <path className="yatiArt-twinkle" d="M40 70 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6z" />
        <path className="yatiArt-twinkle" d="M222 40 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z" />
        <path className="yatiArt-twinkle" d="M232 150 l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8z" />
        <circle cx="60" cy="150" r="3" fill="#60a5fa" />
        <circle cx="200" cy="190" r="3" fill="#fbbf24" />
      </g>

      {/* lightbulb */}
      <g className="yatiArt-float">
        <circle cx="130" cy="34" r="30" fill={`url(#${id('glow')})`} />
        <path d="M130 8 a20 20 0 0 1 10 37 v5 h-20 v-5 a20 20 0 0 1 10 -37z" fill={`url(#${id('bulb')})`} />
        <rect x="122" y="50" width="16" height="5" rx="2" fill="#cbd5e1" />
        <rect x="124" y="56" width="12" height="4" rx="2" fill="#94a3b8" />
        <path d="M127 22 l3 -7 l3 7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      </g>

      {/* question badge */}
      <g className="yatiArt-float-slow">
        <circle cx="52" cy="118" r="20" fill="#7c3aed" />
        <text x="52" y="126" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="Inter, ui-sans-serif">?</text>
      </g>

      {/* check badge */}
      <g className="yatiArt-float-delay">
        <circle cx="212" cy="96" r="18" fill="#6c3bff" />
        <path d="M203 96 l6 6 l12 -12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* shadow */}
      <ellipse cx="132" cy="206" rx="46" ry="7" fill="#6c3bff" opacity="0.12" />

      {/* legs & shoes */}
      <rect x="114" y="170" width="10" height="20" rx="4" fill="#f9a8d4" />
      <rect x="140" y="170" width="10" height="20" rx="4" fill="#f9a8d4" />
      <ellipse cx="116" cy="194" rx="14" ry="7" fill="#6c3bff" />
      <ellipse cx="146" cy="194" rx="14" ry="7" fill="#6c3bff" />

      {/* arm pointing up */}
      <path d="M96 128 c-16 -8 -22 -26 -14 -44" fill="none" stroke="#f9a8d4" strokeWidth="9" strokeLinecap="round" />
      <circle cx="82" cy="82" r="9" fill="#fbcfe8" />
      {/* other arm */}
      <path d="M168 132 c18 4 24 16 18 30" fill="none" stroke="#f9a8d4" strokeWidth="9" strokeLinecap="round" />
      <circle cx="186" cy="164" r="9" fill="#fbcfe8" />

      {/* brain body */}
      <g className="yatiArt-bob">
        <path
          d="M84 118 c-6 -26 10 -46 34 -44 c8 -14 34 -14 44 0 c26 -4 42 22 30 46 c8 18 -6 40 -28 40 h-56 c-24 0 -36 -22 -24 -42z"
          fill={`url(#${id('brain')})`}
        />
        {/* folds */}
        <g fill="none" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" opacity="0.55">
          <path d="M100 94 c8 -8 18 -6 22 2" />
          <path d="M138 80 c8 -4 16 0 18 8" />
          <path d="M96 128 c6 8 16 8 22 2" />
          <path d="M160 108 c8 2 12 10 8 18" />
          <path d="M130 66 v20" />
        </g>
        {/* face */}
        {happy ? (
          <>
            <path d="M112 116 q6 -7 12 0" fill="none" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
            <path d="M138 116 q6 -7 12 0" fill="none" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="118" cy="114" rx="4.5" ry="5.5" fill="#1f2937" />
            <path d="M138 114 q6 -6 12 0" fill="none" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        <circle cx="120" cy="112" r="1.5" fill="#fff" />
        <path d={happy ? 'M118 132 q13 14 26 0' : 'M120 132 q11 10 22 0'} fill="#7f1d1d" />
        <path d={happy ? 'M122 134 q9 6 18 0' : 'M124 134 q7 4 14 0'} fill="#fff" opacity="0.9" />
        <circle cx="106" cy="128" r="5" fill="#fb7185" opacity="0.55" />
        <circle cx="156" cy="128" r="5" fill="#fb7185" opacity="0.55" />
      </g>
    </svg>
  );
}

export default function ContinuePanel() {
  const { user, isCareerPathEnabled } = useContext(AuthContext);
  // Re-read the URL on every in-app navigation, so typing the preview address
  // works whether the page is reloaded or reached from inside the app.
  const location = useLocation();

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
    if (!user) return;

    // Preview: the sample card, straight away, every time the URL asks.
    if (isPreview()) {
      setActivity(PREVIEW);
      setNext({ eligible: true, returning: true, planReady: true, task: { title: 'Sample task' }, streak: 3 });
      setPicked(null);
      setResult(null);
      setLeaving(false);
      const t = window.setTimeout(() => setOpen(true), 300);
      return () => window.clearTimeout(t);
    }

    if (!isCareerPathEnabled) return;
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
  }, [user, isCareerPathEnabled, location.search, location.hash]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const submit = async (index) => {
    if (result || sending) return;
    setPicked(index);
    // Graded locally in preview — the server never hears about it.
    if (isPreview()) {
      window.setTimeout(
        () => setResult({ correct: index === PREVIEW.answer, answer: PREVIEW.answer, why: PREVIEW.why, xpAwarded: index === PREVIEW.answer ? 5 : 0 }),
        350
      );
      return;
    }
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

  const firstName = user?.name?.split(' ')[0];
  const kind = String(activity.kind || 'Puzzle');
  const onwardTo = next?.task || !next?.planReady ? '/career/planner' : '/career';
  const onwardLabel = next?.task ? 'Start today’s task' : next?.planReady ? 'See my progress' : 'Plan my day';
  const twoColumns = activity.options.every((o) => String(o).length <= 28);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Today's activity"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm ${
        leaving ? 'animate-panel-out' : 'animate-panel-in'
      }`}
    >
      {/* Stops a click inside the card reaching the backdrop's close handler. */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
      >
        {/* ---- Header: pastel wash, the greeting, and the brain ---- */}
        <div className="relative overflow-hidden bg-gradient-to-r from-violet-50 via-white to-pink-50 px-6 pt-6 pb-5 sm:px-8 sm:pt-8">
          <div aria-hidden className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-violet-200/50 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-16 h-48 w-48 rounded-full bg-pink-200/50 blur-3xl" />

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-white hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <X size={16} />
          </button>

          <div className="relative flex items-center gap-6">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.18em] text-violet-600 uppercase">
                <Target size={13} />
                Today’s {kind.toLowerCase()}
              </p>
              <h2 className="mt-2 text-2xl leading-tight font-black text-slate-900 sm:text-3xl">
                {result ? (
                  result.correct ? (
                    <>
                      Great start,{' '}
                      <span className="relative inline-block text-violet-600">
                        {firstName}!
                        <span aria-hidden className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-amber-300" />
                      </span>
                    </>
                  ) : (
                    <>
                      Good try,{' '}
                      <span className="relative inline-block text-violet-600">
                        {firstName}!
                        <span aria-hidden className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-amber-300" />
                      </span>
                    </>
                  )
                ) : (
                  <>
                    A quick one before you start,{' '}
                    <span className="relative inline-block text-violet-600">
                      {firstName}!
                      <span aria-hidden className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-amber-300" />
                    </span>
                  </>
                )}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
                {result
                  ? result.correct
                    ? 'Brain warmed up. That is exactly how a good day begins.'
                    : 'The right answer is highlighted below — the point was to think, and you did.'
                  : 'Warm up your brain with this quick question and get ready to learn! 🎯'}
              </p>
            </div>

            <BrainArt happy={Boolean(result?.correct)} className="hidden h-44 w-52 shrink-0 sm:block" />
          </div>
        </div>

        {/* ---- The question ---- */}
        <div className="space-y-4 px-6 py-5 sm:px-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex items-start gap-3.5">
              <span
                aria-hidden
                className="grid h-12 w-12 shrink-0 grid-cols-2 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm leading-none font-black text-white shadow-md shadow-violet-500/30"
              >
                <span>+</span>
                <span>−</span>
                <span>×</span>
                <span>÷</span>
              </span>
              <p className="pt-1 text-base leading-relaxed font-bold text-slate-900 sm:text-lg">
                {activity.prompt}
              </p>
            </div>

            <div className={`mt-4 grid gap-2.5 ${twoColumns ? 'sm:grid-cols-2' : ''}`}>
              {activity.options.map((option, i) => {
                const isAnswer = result && i === result.answer;
                const isWrongPick = result && i === picked && !result.correct;
                const isPicked = picked === i && !result;
                const tone = isAnswer
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                  : isWrongPick
                    ? 'border-rose-300 bg-rose-50 text-rose-900'
                    : isPicked
                      ? 'border-violet-500 bg-violet-50 text-slate-900 ring-2 ring-violet-200'
                      : result
                        ? 'border-slate-200 bg-white text-slate-400'
                        : 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-violet-400 hover:bg-violet-50/60 hover:shadow-md';
                const badge = isAnswer
                  ? 'bg-emerald-500 text-white'
                  : isWrongPick
                    ? 'bg-rose-500 text-white'
                    : isPicked
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600';
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={Boolean(result) || sending}
                    onClick={() => submit(i)}
                    aria-label={option}
                    style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                    className={`animate-fade-in-up flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:cursor-default ${tone}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${badge}`}>
                      {isAnswer ? <Check size={14} strokeWidth={3.5} /> : isWrongPick ? <X size={14} strokeWidth={3.5} /> : LETTERS[i]}
                    </span>
                    <span className="min-w-0 flex-1">{option}</span>
                    {isPicked && sending && (
                      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- Tip on the left, verdict and the way on on the right ---- */}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] sm:items-stretch">
            <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm ring-1 ring-violet-100">
                <Lightbulb size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-violet-700">{result ? 'Quick tip' : 'No rush'}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {result
                    ? result.why
                    : 'There is no timer. Read it twice, then pick the option that fits.'}
                </p>
              </div>
            </div>

            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 p-4 text-center ring-1 ring-violet-100">
              {result ? (
                <>
                  <span aria-hidden className="pointer-events-none absolute top-2 left-3 text-amber-300">✦</span>
                  <span aria-hidden className="pointer-events-none absolute right-4 bottom-3 text-violet-300">✦</span>
                  <span aria-hidden className="pointer-events-none absolute top-3 right-6 text-pink-300">✦</span>
                  <p className="animate-fade-in-up text-lg font-black text-violet-700">
                    {result.correct ? 'Great start!' : 'Nice try!'}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 text-sm font-semibold text-slate-600">
                    {result.correct ? 'You got it right! 🎉' : 'Tomorrow brings another.'}
                    {result.xpAwarded > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">
                        +{result.xpAwarded} XP
                      </span>
                    )}
                    {next?.streak > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-black text-orange-700">
                        <Flame size={12} />
                        {next.streak}-day streak
                      </span>
                    )}
                  </p>
                  {next ? (
                    <Link
                      to={onwardTo}
                      onClick={close}
                      className="group mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-violet-500/30 transition-all hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                    >
                      Let’s go
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={close}
                      className="group mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-violet-500/30 transition-all hover:from-violet-700 hover:to-indigo-700"
                    >
                      Let’s go
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                    </button>
                  )}
                  {next && (
                    <p className="mt-1.5 text-[11px] font-semibold text-slate-400">{onwardLabel}</p>
                  )}
                </>
              ) : (
                <>
                  <Sparkles size={22} className="text-violet-400" />
                  <p className="mt-1.5 text-sm font-black text-slate-800">Pick an answer</p>
                  <p className="mt-0.5 text-xs text-slate-500">A new one arrives tomorrow.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
