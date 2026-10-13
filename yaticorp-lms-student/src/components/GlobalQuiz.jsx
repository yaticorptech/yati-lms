/**
 * The Global Quiz tab: the paper an administrator has published, drawn from
 * the bank they write, not from the quizzes inside the student's courses.
 *
 * The administrator decides the paper: which questions, how many, and how
 * long students get. So there is nothing to choose here. The tab shows what
 * the paper is and a Start button; the clock runs from Start, counting down
 * when the quiz has a time limit and up when it has none, and a limit that
 * runs out closes the paper with the score so far.
 *
 * Each student gets ONE attempt. The server keeps it (opened at Start, each
 * answer as it is marked, closed at the score), so a reload resumes the same
 * attempt with the same clock, and a finished one comes back as its result
 * with no way to take the paper again.
 *
 * One question is on screen at a time, and each answer is marked the moment
 * it is given, so the explanation arrives while the question is still in mind.
 * Skip moves on and leaves the question unanswered; Next waits until it has
 * been answered. The last question offers the score, and the whole paper then
 * comes back at once so the explanations can be read together.
 *
 * It is practice and says so on the banner. Nothing here changes course
 * progress, credits, XP or the "quizzes passed" figure — those belong to the
 * first attempt of a lesson's own quiz, inside the course player.
 */
import { useEffect, useRef, useState } from 'react';
import { Globe, CheckCircle2, XCircle, Loader2, Info, ArrowRight, Tag, Play, Timer, ListChecks, Lock, Trophy, X, CalendarClock, TrendingUp, Star } from 'lucide-react';
import Portal from './Portal';
import api from '../utils/api';
import { GlobeScene } from './quiz/QuizArt';
import PriceTag from './rewards/PriceTag';
import useCountUp from '../hooks/useCountUp';
import QuizHistory from './quiz/QuizHistory';
import { useHideLoop } from './loopVisibility';
// The clock and the score's colour, shared with the list of past quizzes.
import { clock, toneFor, shortDate } from './quiz/quizFormat';

const minutes = (n) => `${n} minute${n === 1 ? '' : 's'}`;

// `startedAt` is when Start was pressed: 0 until then, and the clock's zero.
// `saved` says the server has the attempt closed; `finishedAt` freezes the clock;
// `result` is the server's final score once it has one, which is what is shown.
const FRESH = { key: null, startedAt: 0, finishedAt: 0, at: 0, answers: {}, marks: {}, pending: null, showScore: false, timedOut: false, saved: false, result: null };
const resultOf = (a) => (a && a.score != null ? { score: a.score, correctCount: a.correctCount ?? 0 } : null);

/**
 * The paper's state as the server's record of the attempt has it: nothing
 * started, an attempt under way (resumed at its first unanswered question,
 * with its clock), or a finished one (its result, closed).
 */
const seedFrom = (data, key) => {
    const a = data?.attempt;
    if (!a) return { ...FRESH, key };
    const startedAt = Date.now() - (a.elapsedMs || 0);
    const answers = {}; const marks = {};
    for (const [id, mark] of Object.entries(a.answers || {})) { answers[id] = mark.providedAnswer; marks[id] = mark; }
    const finished = a.status === 'finished';
    const firstOpen = (data.questions || []).findIndex((q) => answers[q.questionId] === undefined);
    return {
        key, startedAt, finishedAt: finished ? Date.now() : 0, at: finished || firstOpen < 0 ? 0 : firstOpen,
        answers, marks, pending: null, showScore: finished, timedOut: !!a.timedOut, saved: finished, result: finished ? resultOf(a) : null
    };
};

/** The clock as a pill: time left under a limit, time taken without one. */
const TimerPill = ({ reading, limited, running, urgent, compact }) => (
    <span role="timer" aria-label={`${limited ? 'Time left' : 'Time taken'} ${reading}`}
        className={`inline-flex items-center gap-1.5 rounded-2xl font-black tabular-nums ${compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-base'} ${urgent ? 'bg-rose-600 text-white shadow-md shadow-rose-300/60' : running ? 'bg-violet-600 text-white shadow-md shadow-violet-300/60' : 'bg-white/80 text-slate-600'}`}>
        <Timer size={compact ? 14 : 17} className={urgent ? 'animate-pulse' : ''} /> {reading}
    </span>
);

/**
 * The score as a ring that draws in from nothing while the figure counts up.
 * A score of 0 draws no arc at all: a zero-length stroke with round ends was
 * the lone orange dot sitting at the top of an empty ring.
 */
const ScoreRing = ({ score, size = 152 }) => {
    const [shown, setShown] = useState(0);
    useEffect(() => { const t = setTimeout(() => setShown(score), 80); return () => clearTimeout(t); }, [score]);
    const counted = useCountUp(score, 900);
    const stroke = 12;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const tone = toneFor(score);
    return (
        <div className="relative mx-auto shrink-0 animate-pop-in" style={{ width: size, height: size }} role="img" aria-label={`Your score ${score}%`}>
            <span aria-hidden="true" className="absolute inset-4 rounded-full opacity-25 blur-2xl" style={{ background: tone }} />
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="#fff" stroke="#f1effb" strokeWidth={stroke} />
                {score > 0 && (
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
                        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                )}
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black tabular-nums text-slate-900">{counted}%</span>
                <span className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Your score</span>
            </span>
        </div>
    );
};

const TILE_TONES = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100'
};
/** One figure of the result — correct, wrong, time — popping in after the ring. */
const ResultTile = ({ tone, icon: Icon, label, delay, children }) => (
    <div className={`animate-pop-in rounded-2xl px-2 py-3 text-center ring-1 ring-inset ${TILE_TONES[tone]}`} style={{ animationDelay: `${delay}s` }}>
        <p className="text-2xl font-black leading-none tabular-nums">{children}</p>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-bold opacity-80"><Icon size={12} /> {label}</p>
    </div>
);

/** One figure in the banner — the student's record, or what a quiz is — counting up as it pops in. */
const HeroStat = ({ icon: Icon, label, value, suffix = '', delay = 0 }) => {
    const counted = useCountUp(typeof value === 'number' ? value : 0, 900);
    return (
        <div className="animate-pop-in rounded-2xl bg-white/10 px-3.5 py-2.5 ring-1 ring-inset ring-white/15 backdrop-blur-sm" style={{ animationDelay: `${delay}s` }}>
            <dt className="flex items-center gap-1.5 text-[11px] font-bold text-white/70"><Icon size={13} aria-hidden="true" /> {label}</dt>
            <dd className="mt-0.5 text-xl font-black tabular-nums">{typeof value === 'number' ? `${counted}${suffix}` : value}</dd>
        </div>
    );
};

export default function GlobalQuiz() {
    const [nonce, setNonce] = useState(0);           // bumped to fetch the paper again
    // Both pieces of state carry the paper they belong to, so a request that
    // lands late cannot answer for the wrong paper — and so the effect never
    // has to reset anything synchronously, which this codebase's lint forbids.
    const key = String(nonce);
    // `seed` is the attempt as the server had it when the paper arrived; it is
    // what `work` starts from, so a resumed or finished attempt needs no reset.
    const [loaded, setLoaded] = useState({ key: null, paper: null, error: '', seed: FRESH });
    // `marks` is what the server said about each answer, keyed by question id.
    // `at` is the question on screen; the others are not rendered at all.
    const [work, setWork] = useState(FRESH);
    const [markError, setMarkError] = useState('');
    const [starting, setStarting] = useState(false);
    const [now, setNow] = useState(0);               // the clock, moved on once a second while the paper is open
    const savedRef = useRef(null);                   // the paper whose result has been sent

    useEffect(() => {
        let cancelled = false;
        api.get('/user/quizzes/global')
            .then((r) => { if (!cancelled) { setNow(Date.now()); setLoaded({ key, paper: r.data, error: '', seed: seedFrom(r.data, key) }); } })
            .catch((e) => !cancelled && setLoaded({ key, paper: null, error: e.response?.data?.message || 'Could not load the quiz.', seed: FRESH }));
        return () => { cancelled = true; };
    }, [key]);

    const ready = loaded.key === key;
    const paper = ready ? loaded.paper : undefined;  // undefined = loading, null = failed
    const error = ready ? loaded.error : '';
    const w = work.key === key ? work : loaded.seed;
    const { answers, marks, pending, showScore, timedOut, at, startedAt, finishedAt, saved, result } = w;
    const started = startedAt > 0;
    // A paper finished on an earlier visit comes back as its score alone; the
    // question-by-question review is only shown right after finishing.
    const returned = !!showScore && !w.finishedHere;
    const running = started && !showScore;
    // Loop, the mascot, steps aside while the paper is being taken and while
    // its answers are reviewed straight after; it is back for the list.
    useHideLoop(started && !returned);
    const limitMs = (paper?.quiz?.timeLimitMinutes || 0) * 60_000;

    // The clock. It only moves while the paper is open, and when a time limit
    // runs out it closes the paper itself, score and all. It closes at the
    // limit, not at the tick that noticed: that tick comes up to a second
    // late, and "Time taken" read 10:01 on a 10-minute paper.
    useEffect(() => {
        if (!running) return undefined;
        const tick = setInterval(() => {
            const t = Date.now();
            setNow(t);
            if (limitMs && t - startedAt >= limitMs) {
                setWork((prev) => (prev.key === key && prev.startedAt === startedAt && !prev.showScore ? { ...prev, showScore: true, timedOut: true, finishedAt: startedAt + limitMs, celebrate: true, finishedHere: true } : prev));
            }
        }, 1000);
        return () => clearInterval(tick);
    }, [running, limitMs, startedAt, key]);

    // The score is final the moment it is shown: the server closes the attempt.
    useEffect(() => {
        if (!ready || !started || !showScore || saved || savedRef.current === key) return undefined;
        savedRef.current = key;
        let cancelled = false;
        api.post('/user/quizzes/global/finish', { timedOut })
            .then((r) => {
                if (cancelled) return;
                setWork((prev) => (prev.key === key ? { ...prev, saved: true, result: resultOf(r.data?.attempt) || prev.result, win: r.data?.win || null } : prev));
                // A win paid XP: the header's XP and wallet figures re-read.
                if (r.data?.win?.xp > 0) window.dispatchEvent(new CustomEvent('yati:progress-changed'));
            })
            .catch((e) => { if (!cancelled) { savedRef.current = null; setMarkError(e.response?.data?.message || 'Your result could not be saved. Check your connection.'); } });
        return () => { cancelled = true; };
    }, [ready, started, showScore, saved, timedOut, key]);

    // Every quiz the student has taken, for the banner's record and the list.
    // Read again once a quiz is finished, so the record counts it.
    const historyKey = `${key}:${saved ? 'saved' : ''}`;
    const [history, setHistory] = useState({ rows: undefined, winScore: null });
    useEffect(() => {
        let cancelled = false;
        api.get('/user/quizzes/global/history')
            .then((r) => { if (!cancelled) setHistory({ rows: r.data?.attempts || [], winScore: r.data?.winScore ?? null }); })
            .catch(() => { if (!cancelled) setHistory((h) => (h.rows === undefined ? { rows: null, winScore: null } : h)); });
        return () => { cancelled = true; };
    }, [historyKey]);

    const load = () => { setNonce((n) => n + 1); setMarkError(''); };
    // Changes to the paper start from where the server left it, never from
    // scratch: skipping the first question, or the first answer, must not
    // forget an attempt that was resumed.
    const step = (change) => setWork((prev) => ({ ...(prev.key === key ? prev : loaded.seed), key, ...change }));
    const goTo = (index) => { setMarkError(''); step({ at: index }); };
    const finish = () => { step({ showScore: true, finishedAt: Date.now(), celebrate: true, finishedHere: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    // The popup that greets a just-finished paper; a resumed, finished attempt opens without it.
    const closeCelebration = () => step({ celebrate: false });

    /** Open the one attempt. The server fixes the paper's order and holds the clock. */
    const start = () => {
        if (starting) return;
        setStarting(true); setMarkError('');
        api.post('/user/quizzes/global/start')
            .then((r) => {
                const data = { attempt: r.data?.attempt, questions: r.data?.questions?.length ? r.data.questions : loaded.paper?.questions || [] };
                setNow(Date.now());
                setLoaded((l) => (l.key === key && l.paper ? { ...l, paper: { ...l.paper, questions: data.questions, attempt: data.attempt } } : l));
                setWork(seedFrom(data, key));
            })
            .catch((e) => {
                // Already taken (or timed out) on another screen: the server has the result.
                if (['ALREADY_ATTEMPTED', 'TIME_UP'].includes(e.response?.data?.code)) load();
                else setMarkError(e.response?.data?.message || 'Could not start the quiz.');
            })
            .finally(() => setStarting(false));
    };

    /** Answer one question and have it marked straight away. */
    const choose = (questionId, index) => {
        if (answers[questionId] !== undefined || pending) return;
        setMarkError('');
        step({ answers: { ...answers, [questionId]: index }, pending: questionId, showScore: false });
        api.post('/user/quizzes/global/submit', { answers: [{ questionId, answer: index }] })
            .then((r) => {
                const mark = (r.data?.results || []).find((x) => x.questionId === questionId) || null;
                setWork((prev) => (prev.key === key
                    ? { ...prev, marks: mark ? { ...prev.marks, [questionId]: mark } : prev.marks, pending: null }
                    : prev));
            })
            .catch((e) => {
                // The attempt was closed meanwhile (time up, or finished elsewhere): show the result the server has.
                if (['ALREADY_ATTEMPTED', 'TIME_UP'].includes(e.response?.data?.code)) { load(); return; }
                setMarkError(e.response?.data?.message || 'Could not mark that answer.');
                // The choice is rolled back so the question can be answered again.
                setWork((prev) => {
                    if (prev.key !== key) return prev;
                    const rest = { ...prev.answers };
                    delete rest[questionId];
                    return { ...prev, answers: rest, pending: null };
                });
            });
    };

    if (paper === undefined) return <div className="flex justify-center p-12"><Loader2 size={36} className="animate-spin text-violet-500" /></div>;
    if (paper === null) return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-bold text-red-700">{error}</p>
            <button onClick={load} className="mt-4 rounded-xl bg-violet-600 px-6 py-2.5 font-bold text-white hover:bg-violet-700">Reload</button>
        </div>
    );

    /* Nothing to ask yet: the administrator has not published a quiz. */
    if (!paper.questions.length) return (
        <div className="animate-fade-in-up rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-violet-100/60 p-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-500 shadow-sm"><Globe size={30} /></span>
            <h3 className="mt-4 text-xl font-black text-slate-900">No quiz questions yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">The global quiz asks general questions your institution writes. As soon as some are added, they will appear here.</p>
        </div>
    );

    const total = paper.questions.length;
    const limit = paper.quiz?.timeLimitMinutes || 0;
    const answered = Object.keys(answers).length;
    // The server's record of a closed attempt is the score; until then it is counted here.
    const correct = result ? result.correctCount : Object.values(marks).filter((m) => m.isCorrect).length;
    const score = result ? result.score : answered ? Math.round((correct / total) * 100) : 0;
    const current = Math.min(at, total - 1);
    // The score is only offered once every question has an answer: skipped
    // ones come round again, and Next/Skip go to the next one still open.
    const isOpen = (i) => answers[paper.questions[i].questionId] === undefined;
    const nextOpen = (() => { for (let k = 1; k < total; k++) { const i = (current + k) % total; if (isOpen(i)) return i; } return -1; })();
    const allAnswered = answered >= total;
    const currentAnswered = answers[paper.questions[current].questionId] !== undefined;
    // The clock's reading: time left when the quiz has a limit, time taken when
    // it has none. Once the paper is closed it stands where it closed.
    const elapsed = started ? Math.max(0, (finishedAt || now) - startedAt) : 0;
    const remaining = limitMs ? Math.max(0, limitMs - elapsed) : 0;
    const reading = limitMs ? clock(remaining) : clock(elapsed);
    const urgent = running && limitMs > 0 && remaining < 60_000;
    const pill = { reading, limited: limitMs > 0, running, urgent };
    // One question at a time while the paper is being taken; the whole set
    // comes back together once the score is in, so the explanations can be
    // read side by side.
    const onScreen = showScore
        ? paper.questions.map((q, i) => [q, i])
        : [[paper.questions[current], current]];

    // The panel stays inside its column. It used to bleed past it with a
    // negative margin, which widened the page by that margin on a phone and
    // set the whole tab scrolling sideways.
    // The score as a ring that fills to it, with the tally beneath, for the
    // popup at the finish. A later visit has its own card (below), the ring
    // beside the tally.
    // Correct, wrong and the time, shared by the popup and the result card.
    const tiles = (place) => (
        <div className={`mt-5 grid grid-cols-3 gap-2 sm:gap-3 ${place}`}>
            <ResultTile tone="emerald" icon={CheckCircle2} label="Correct" delay={0.35}>{correct}</ResultTile>
            <ResultTile tone="rose" icon={XCircle} label="Wrong" delay={0.45}>{answered - correct}</ResultTile>
            <ResultTile tone="violet" icon={Timer} label="Time taken" delay={0.55}>
                <span role="timer" aria-label={`Time taken ${clock(elapsed)}`}>{clock(elapsed)}</span>
            </ResultTile>
        </div>
    );
    // The published quiz, not taken yet: the first row of the list, with its
    // Start button. Its facts (questions, time, one attempt) sit beside the
    // button rather than in tiles above it.
    const startRow = started ? null : (
        <div className="rounded-2xl bg-gradient-to-r from-violet-50 via-violet-50/40 to-white p-3 ring-1 ring-inset ring-violet-200 sm:p-4">
            <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md shadow-violet-200">
                    {!paper.quiz?.closed && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-violet-400 opacity-30 motion-safe:animate-ping" />}
                    <Play size={20} className="relative" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-black text-slate-900 first-letter:uppercase">{paper.quiz?.title || 'Global Quiz'}</span>
                        <span className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">New</span>
                    </p>
                    {paper.quiz?.description && <p className="mt-0.5 truncate text-sm text-slate-600 first-letter:uppercase">{paper.quiz.description}</p>}
                    <p className="mt-0.5 text-xs text-slate-500">
                        {total} question{total === 1 ? '' : 's'} · {limit ? minutes(limit) : 'No time limit'} · One attempt
                    </p>
                </div>
                {paper.quiz?.closed ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200"><CalendarClock size={14} /> Closed</span>
                ) : (
                    <button type="button" onClick={start} disabled={starting}
                        className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-violet-200 hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
                        {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Start quiz <PriceTag action="start_global_quiz" />
                    </button>
                )}
            </div>
            {markError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{markError}</p>}
        </div>
    );
    // Where the student stands with the Global Quiz right now, for the banner's chip.
    const closesOn = paper.quiz?.closesAt ? shortDate(paper.quiz.closesAt) : null;
    const status = running ? { dot: 'bg-amber-300', text: `In progress · ${paper.quiz?.title || 'Global Quiz'}` }
        : showScore && !returned ? { dot: 'bg-emerald-400', text: 'Quiz complete' }
            : !started ? (paper.quiz?.closed
                ? { dot: 'bg-rose-400', text: `Closed${closesOn ? ` on ${closesOn}` : ''}` }
                : { dot: 'bg-emerald-400', pulse: true, text: `New quiz live${closesOn ? ` · open until ${closesOn}` : ''}` })
                : { dot: 'bg-violet-300', text: 'All caught up — watch for the next quiz' };
    // Their record across every quiz taken, for the banner's figures.
    const taken = history.rows || [];
    const record = taken.length ? {
        taken: taken.length,
        average: Math.round(taken.reduce((sum, a) => sum + a.score, 0) / taken.length),
        best: Math.max(...taken.map((a) => a.score)),
        wins: taken.filter((a) => a.won).length
    } : null;
    const scoreDetails = !showScore ? null : (
        <>
            <div className="mt-5"><ScoreRing score={score} /></div>
            {tiles('mx-auto max-w-sm')}
            {total - answered > 0 && <p className="mt-2 text-xs font-semibold text-slate-500">{total - answered} left unanswered</p>}
            {w.win?.won && (
                <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1.5 text-sm font-black text-amber-700 ring-1 ring-amber-200">
                    🏆 You won!{w.win.xp > 0 ? ` +${w.win.xp} XP` : ''}
                </p>
            )}
            {w.win && !w.win.won && w.win.winScore != null && (
                <p className="mt-3 text-xs font-semibold text-slate-500">Score {w.win.winScore}% or more to win XP.</p>
            )}
        </>
    );

    return (
        // One even tint behind the banner and the cards. It used to fade to
        // white at the bottom in a wave, which made the panel look as if it
        // stopped halfway down whatever card sat lowest.
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-violet-50/60 p-2 sm:p-3 animate-fade-in">

            {/* ── Banner ──────────────────────────────────────────── */}
            {/* The tab's header: what the Global Quiz is, where the student stands
                with it right now, and their record. The quiz itself — its title,
                its facts, its Start button — is a row in the list below, so none
                of that is repeated here; the old banner said it all twice. */}
            <header className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-[#2d2693] via-[#3b31c4] to-[#6a45e0] px-5 py-6 text-white shadow-lg shadow-violet-900/10 sm:px-8 sm:py-7">
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.75) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
                <span aria-hidden="true" className="pointer-events-none absolute -top-24 right-32 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
                {/* The globe sits wholly inside the banner now (it used to run off
                    the edge), floating, with a glow behind it. Not on a phone,
                    where the words need the width. */}
                <div aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 md:block lg:right-8">
                    <span className="absolute inset-8 rounded-full bg-sky-300/35 blur-2xl" />
                    <GlobeScene className="drift relative h-[160px] w-auto lg:h-[185px]" />
                </div>

                <div className="relative md:pr-[250px] lg:pr-[300px]">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ring-1 ring-inset ring-white/20"><Globe size={13} aria-hidden="true" /> Global Quiz</span>
                        <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-black/15 px-3 py-1 text-xs font-bold ring-1 ring-inset ring-white/15">
                            <span className="relative flex h-2 w-2 shrink-0">
                                {status.pulse && <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping ${status.dot}`} />}
                                <span className={`relative inline-flex h-2 w-2 rounded-full ${status.dot}`} />
                            </span>
                            <span className="truncate first-letter:uppercase">{status.text}</span>
                        </span>
                    </div>
                    <h3 className="mt-3 text-[1.7rem] font-black leading-tight tracking-tight sm:text-[2.1rem]">
                        Test your <span className="bg-gradient-to-r from-amber-200 via-pink-200 to-sky-200 bg-clip-text text-transparent">general knowledge</span>
                    </h3>
                    <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/80">
                        Your institution sets a new paper from time to time: quick questions, one attempt each, and XP when your score is a win.
                    </p>

                    {/* The student's record once they have one; until then, what a
                        quiz is. Not while a paper is open: the question comes first. */}
                    {!running && (
                        <dl className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
                            {record ? (
                                <>
                                    <HeroStat icon={ListChecks} label="Quizzes taken" value={record.taken} delay={0.1} />
                                    <HeroStat icon={TrendingUp} label="Average" value={record.average} suffix="%" delay={0.18} />
                                    <HeroStat icon={Trophy} label="Best score" value={record.best} suffix="%" delay={0.26} />
                                    <HeroStat icon={Star} label="Wins" value={record.wins} delay={0.34} />
                                </>
                            ) : (
                                <>
                                    <HeroStat icon={ListChecks} label="Questions" value={total} delay={0.1} />
                                    <HeroStat icon={Timer} label="Time" value={limit ? minutes(limit) : 'No limit'} delay={0.18} />
                                    <HeroStat icon={Lock} label="Attempts" value="One" delay={0.26} />
                                    <HeroStat icon={Star} label="Win XP at" value={history.winScore != null ? `${history.winScore}%+` : 'A high score'} delay={0.34} />
                                </>
                            )}
                        </dl>
                    )}
                </div>
            </header>

            {/* ── The quizzes: a new one to start, and every one taken ──
                One list. A quiz the admin has published and the student has not
                taken yet comes first, with its Start button; then each quiz taken,
                with its score — the latest included, which used to have a large
                result card of its own above the list. */}
            {(!started || returned) && (
                <div className="relative mt-3 animate-fade-in-up rounded-[1.6rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
                    <QuizHistory rows={history.rows} newQuiz={startRow} />
                </div>
            )}

            {/* ── The paper, with progress alongside ──────────────── */}
            {started && !returned && (
                <div className="relative mt-4">
                    <div className="min-w-0 space-y-4">
                        {showScore && (
                            <div className="animate-fade-in-up rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
                                {/* The score and what it means, side by side even on a phone.
                                    "One attempt" is already said by the header and the note below. */}
                                <div className="flex items-center gap-4">
                                    <span className={`flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-md ${score >= 80 ? 'bg-emerald-500 shadow-emerald-200' : score >= 50 ? 'bg-violet-600 shadow-violet-200' : 'bg-amber-500 shadow-amber-200'}`}>{score}%</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xl font-black leading-tight text-slate-900">{timedOut ? 'Time’s up! ' : ''}{correct} of {total} correct</p>
                                        <p className="mt-1 text-sm leading-snug text-slate-500">
                                            {timedOut && answered < total ? `${total - answered} question${total - answered === 1 ? ' was' : 's were'} left unanswered when the clock ran out. ` : ''}
                                            {score >= 80 ? 'Strong revision — you know this material.' : score >= 50 ? 'A decent pass. Read the explanations below.' : 'Worth another look: the explanations are below.'}
                                        </p>
                                    </div>
                                </div>
                                <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"><Info size={14} className="mt-0.5 shrink-0 text-slate-400" /> That was your one attempt at this quiz. It does not count towards your course progress — take a lesson&apos;s own quiz inside the course for that.</p>
                            </div>
                        )}

                        {/* ── Where you are: one strip, one clock ───────── */}
                        {!showScore && (
                            <div className="rounded-[1.4rem] border border-violet-100 bg-white px-4 py-3.5 shadow-sm sm:px-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black uppercase tracking-wider text-violet-500">Question {current + 1} of {total}</p>
                                        <p className="text-sm font-bold text-slate-600">{answered} of {total} answered</p>
                                    </div>
                                    <TimerPill {...pill} compact />
                                </div>
                                <div className="mt-3 flex gap-1.5" aria-hidden="true">
                                    {paper.questions.map((q, i) => (
                                        <span key={q.questionId}
                                            className={`h-2 flex-1 rounded-full transition-colors ${answers[q.questionId] !== undefined ? 'bg-violet-500' : i === current ? 'bg-violet-200 ring-2 ring-violet-400 ring-offset-1' : 'bg-slate-200'}`} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {markError && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{markError}</p>}

                        <ol className="space-y-4">
                            {onScreen.map(([q, i]) => {
                                const picked = answers[q.questionId];
                                const mark = marks[q.questionId];
                                const waiting = pending === q.questionId;
                                return (
                                    <li key={q.questionId}
                                        className="animate-fade-in-up rounded-[1.6rem] border border-violet-100/80 bg-white p-4 shadow-sm sm:p-5">
                                        <div className="mb-3 flex items-start gap-3">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 text-base font-black text-white shadow-sm">{i + 1}</span>
                                            <div className="min-w-0 flex-1">
                                                {q.category && (
                                                    <p className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100/70 px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-500">
                                                        <Tag size={11} /> {q.category}
                                                    </p>
                                                )}
                                                <p className="mt-1.5 text-lg font-black leading-snug text-slate-900">{q.questionText}</p>
                                            </div>
                                        </div>

                                        <div className="grid gap-2.5 sm:grid-cols-2">
                                            {q.options.map((opt, idx) => {
                                                const chosen = picked === idx;
                                                const isWrongPick = mark && mark.providedAnswer === idx && !mark.isCorrect;
                                                // The right answer is only pointed out once they have got it wrong;
                                                // a correct pick stays the violet of a chosen answer.
                                                const isRight = mark && !mark.isCorrect && mark.correctAnswer === idx;
                                                return (
                                                    <button key={idx} type="button" disabled={picked !== undefined || !!pending || showScore}
                                                        onClick={() => choose(q.questionId, idx)}
                                                        className={`flex items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left text-[15px] font-semibold transition-colors disabled:cursor-default ${isRight ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                                            : isWrongPick ? 'border-rose-300 bg-rose-50 text-rose-800'
                                                                : chosen ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                                    : 'border-slate-200 bg-white text-slate-700 enabled:hover:border-violet-300 enabled:hover:bg-violet-50/60'}`}>
                                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${isRight ? 'bg-emerald-500 text-white' : isWrongPick ? 'bg-rose-500 text-white' : chosen ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                            {String.fromCharCode(65 + idx)}
                                                        </span>
                                                        <span className="min-w-0 flex-1">{opt}</span>
                                                        {chosen && (waiting
                                                            ? <Loader2 size={20} className="shrink-0 animate-spin text-violet-500" />
                                                            : <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${isWrongPick ? 'bg-rose-500' : 'bg-violet-600'}`}>
                                                                {isWrongPick ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                                                            </span>)}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {mark && (
                                            <div className={`mt-3 flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${mark.isCorrect ? 'border-emerald-100 bg-emerald-50/80' : 'border-rose-100 bg-rose-50/80'}`}>
                                                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${mark.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                                    {mark.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                </span>
                                                <p className="min-w-0 text-[15px] leading-relaxed text-slate-700">
                                                    <span className={`font-black ${mark.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                        {mark.isCorrect ? 'Correct!' : 'Not quite.'}{' '}
                                                    </span>
                                                    {mark.isCorrect
                                                        ? mark.explanation
                                                        : <>The answer is <span className="font-bold text-slate-900">{q.options[mark.correctAnswer]}</span>. {mark.explanation}</>}
                                                </p>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>

                        {/* ── The bar that moves you along ────────────── */}
                        {/* Skip moves on and leaves the question unanswered; Next waits
                            until it has been answered, so the two never mean the same thing. */}
                        {showScore ? (
                            <p className="flex items-center justify-center gap-2 rounded-[1.4rem] border border-emerald-100 bg-emerald-50/70 px-5 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={16} /> Quiz complete</p>
                        ) : (
                            <div className={`sticky bottom-3 grid gap-2.5 rounded-[1.4rem] border border-violet-100 bg-white/95 p-2.5 shadow-lg backdrop-blur ${allAnswered || currentAnswered || nextOpen < 0 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {allAnswered ? (
                                    <button type="button" onClick={finish} disabled={!!pending}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700 disabled:opacity-45">
                                        See your score <ArrowRight size={16} />
                                    </button>
                                ) : currentAnswered ? (
                                    <button type="button" onClick={() => goTo(nextOpen)} disabled={!!pending}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-45">
                                        Next question <ArrowRight size={16} />
                                    </button>
                                ) : nextOpen >= 0 ? (
                                    <>
                                        <button type="button" onClick={() => goTo(nextOpen)}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:border-violet-300 hover:text-violet-700">
                                            Skip question
                                        </button>
                                        <button type="button" disabled
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-45">
                                            Next question <ArrowRight size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <p className="px-2 py-2.5 text-center text-sm font-bold text-slate-500">Choose an answer to finish the quiz</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Quiz completed: the score, the moment the paper closes ── */}
            {showScore && w.celebrate && (
                <Portal>
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in"
                        role="dialog" aria-modal="true" aria-labelledby="gq-done-title"
                        onClick={(e) => { if (e.target === e.currentTarget) closeCelebration(); }}
                        onKeyDown={(e) => { if (e.key === 'Escape') closeCelebration(); }}>
                        <div className="relative w-full max-w-sm animate-fade-in-up overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-2xl">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-violet-100 to-transparent" />
                            <button type="button" onClick={closeCelebration} aria-label="Close"
                                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                            <span className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md ${timedOut ? 'bg-amber-500 shadow-amber-200' : 'bg-violet-600 shadow-violet-200'}`}>
                                {timedOut ? <Timer size={28} /> : <Trophy size={28} />}
                            </span>
                            <h4 id="gq-done-title" className="relative mt-3 text-2xl font-black text-slate-900">{timedOut ? 'Time’s up!' : 'Quiz completed!'}</h4>
                            <p className="relative text-sm text-slate-500 first-letter:uppercase">{paper.quiz?.title || 'Global Quiz'}</p>

                            {scoreDetails}

                            <p className="mt-4 text-sm text-slate-600">{score >= 80 ? 'Strong revision — you know this material.' : score >= 50 ? 'A decent pass. The explanations are waiting below.' : 'Worth another look: read the explanations below.'}</p>
                            <button type="button" onClick={closeCelebration} autoFocus
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700">
                                Review answers <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
}
