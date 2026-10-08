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
import { Globe, CheckCircle2, XCircle, Loader2, Info, ArrowRight, Tag, Play, Timer, ListChecks, Lock, Trophy, X, CalendarClock } from 'lucide-react';
import Portal from './Portal';
import api from '../utils/api';
import { GlobeScene, Waves, ScriptNote } from './quiz/QuizArt';
import PriceTag from './rewards/PriceTag';

/** A span of time as the clock shows it: m:ss, or h:mm:ss past an hour. */
const clock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${h ? `${h}:` : ''}${h ? String(m).padStart(2, '0') : m}:${String(sec).padStart(2, '0')}`;
};
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
    const limitMs = (paper?.quiz?.timeLimitMinutes || 0) * 60_000;

    // The clock. It only moves while the paper is open, and when a time limit
    // runs out it closes the paper itself, score and all.
    useEffect(() => {
        if (!running) return undefined;
        const tick = setInterval(() => {
            const t = Date.now();
            setNow(t);
            if (limitMs && t - startedAt >= limitMs) {
                setWork((prev) => (prev.key === key && prev.startedAt === startedAt && !prev.showScore ? { ...prev, showScore: true, timedOut: true, finishedAt: t, celebrate: true, finishedHere: true } : prev));
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
    // The score as a ring that fills to it, with the tally beneath: shared by
    // the popup at the finish and the result shown on a later visit.
    const scoreDetails = !showScore ? null : (
        <>
            <div className="relative mx-auto mt-5 h-36 w-36">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" strokeWidth="12" className="stroke-slate-100" />
                    <circle cx="60" cy="60" r="52" fill="none" strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={`${(2 * Math.PI * 52 * score) / 100} ${2 * Math.PI * 52}`}
                        className={score >= 80 ? 'stroke-emerald-500' : score >= 50 ? 'stroke-violet-600' : 'stroke-amber-500'} />
                </svg>
                <span className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black tabular-nums text-slate-900">{score}%</span>
                    <span className="text-[11px] font-bold text-slate-400">Your score</span>
                </span>
            </div>
            <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2">
                <div className="rounded-2xl bg-emerald-50 px-2 py-2.5"><p className="text-lg font-black text-emerald-600">{correct}</p><p className="text-[11px] font-bold text-emerald-700/70">Correct</p></div>
                <div className="rounded-2xl bg-rose-50 px-2 py-2.5"><p className="text-lg font-black text-rose-600">{answered - correct}</p><p className="text-[11px] font-bold text-rose-700/70">Wrong</p></div>
                <div className="rounded-2xl bg-violet-50 px-2 py-2.5"><p role="timer" aria-label={`Time taken ${clock(elapsed)}`} className="text-lg font-black tabular-nums text-violet-700">{clock(elapsed)}</p><p className="text-[11px] font-bold text-violet-700/70">Time taken</p></div>
            </div>
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
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-violet-50/60 p-2 sm:p-3 animate-fade-in">
            <Waves className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 w-full opacity-70" />

            {/* ── Banner ──────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-r from-violet-100 via-violet-100/60 to-violet-200/80 px-5 pb-5 pt-5 sm:px-7">
                <Waves className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" />
                <GlobeScene className="pointer-events-none absolute -right-6 -top-5 hidden h-[215px] w-auto sm:block" />

                <div className="relative flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        {/* The icon sits beside the eyebrow, not beside the whole block,
                            so on a phone the title and text get the full width. */}
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-violet-600 shadow-sm ring-1 ring-violet-200/60"><Globe size={22} /></span>
                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-600">Global Quiz</p>
                        </div>
                        <h3 className="mt-3 text-[1.65rem] font-black leading-tight tracking-tight text-slate-900 first-letter:uppercase [overflow-wrap:anywhere] sm:text-3xl">{paper.quiz?.title || 'Global Quiz'}</h3>
                        {paper.quiz?.description && <p className="mt-1 max-w-lg text-[15px] font-semibold text-slate-600 first-letter:uppercase [overflow-wrap:anywhere]">{paper.quiz.description}</p>}
                        <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
                            {paper.available} general question{paper.available === 1 ? '' : 's'}
                            {paper.categories?.length ? ` across ${paper.categories.length} categor${paper.categories.length === 1 ? 'y' : 'ies'}` : ''}, mixed into one paper.
                        </p>
                        <p className="mt-1.5 flex max-w-lg items-start gap-1.5 text-[13px] leading-snug text-slate-500"><Info size={14} className="mt-px shrink-0 text-violet-400" /> One attempt each. A winning score earns XP.</p>
                        {/* The admin's day limit: until when a new attempt can be started. */}
                        {paper.quiz?.closesAt && (
                            <p className={`mt-1.5 flex max-w-lg items-start gap-1.5 text-[13px] font-semibold leading-snug ${paper.quiz.closed ? 'text-rose-600' : 'text-slate-500'}`}>
                                <CalendarClock size={14} className={`mt-px shrink-0 ${paper.quiz.closed ? 'text-rose-500' : 'text-violet-400'}`} />
                                {paper.quiz.closed ? 'Closed on ' : 'Open until '}{new Date(paper.quiz.closesAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                    {/* The note and the globe share the right-hand end: the note
                        flows, and the spacer holds open the room the globe is
                        drawn over, so the two can never sit on top of each other. */}
                    <ScriptNote lines={['Small', 'Steps', 'Big Knowledge!']}
                        className="mt-1 hidden shrink-0 text-[16px] leading-tight text-violet-500 lg:block" tilt={-8} />
                    <div aria-hidden="true" className="hidden w-[200px] shrink-0 sm:block" />
                </div>

                {/* What the paper is, before and after it is taken, as three even
                    tiles. While it is being taken the progress strip below carries
                    the count and the clock, so they are not shown twice. */}
                {(!started || (showScore && !returned)) && (
                    <div className="relative mt-5 grid max-w-xl grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-white/85 px-3 py-2.5 shadow-sm ring-1 ring-white">
                            <p className="flex items-center gap-1 text-[11px] font-bold text-slate-400"><ListChecks size={13} className="text-violet-500" /> Questions</p>
                            <p className="mt-0.5 text-lg font-black tabular-nums text-slate-900">{total}</p>
                        </div>
                        <div className="rounded-2xl bg-white/85 px-3 py-2.5 shadow-sm ring-1 ring-white">
                            <p className="flex items-center gap-1 text-[11px] font-bold text-slate-400"><Timer size={13} className="text-violet-500" /> {started ? (pill.limited ? 'Time left' : 'Time taken') : limit ? 'Time limit' : 'Time'}</p>
                            {started
                                ? <p role="timer" aria-label={`${pill.limited ? 'Time left' : 'Time taken'} ${reading}`} className="mt-0.5 text-lg font-black tabular-nums text-slate-900">{reading}</p>
                                : <p className="mt-0.5 text-lg font-black leading-tight text-slate-900">{limit ? minutes(limit) : 'No time limit'}</p>}
                        </div>
                        <div className="rounded-2xl bg-white/85 px-3 py-2.5 shadow-sm ring-1 ring-white">
                            <p className="flex items-center gap-1 text-[11px] font-bold text-slate-400"><Lock size={12} className="text-violet-500" /> Attempt</p>
                            <p className={`mt-0.5 text-lg font-black ${showScore ? 'text-slate-500' : 'text-slate-900'}`}>{showScore ? 'Used' : 'One only'}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Before Start: what to expect, and the button ────── */}
            {!started && (
                <div className="relative mt-4 animate-fade-in-up rounded-3xl border border-violet-100 bg-white p-6 text-center shadow-sm sm:p-8">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><Play size={30} /></span>
                    <h4 className="mt-4 text-xl font-black text-slate-900">Ready when you are</h4>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
                        You get one attempt at this paper: {total} question{total === 1 ? '' : 's'}, one at a time, each marked as you answer it.{' '}
                        {limit ? `You have ${minutes(limit)} for the whole paper; the clock starts when you press Start.` : 'There is no time limit, but the clock shows how long you take.'}
                    </p>
                    {markError && <p className="mx-auto mt-3 max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">{markError}</p>}
                    {paper.quiz?.closed ? (
                        <p className="mx-auto mt-5 inline-flex max-w-md items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">
                            <CalendarClock size={16} /> This quiz is closed. Watch for the next one.
                        </p>
                    ) : (
                    <button type="button" onClick={start} disabled={starting}
                        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-8 py-3 text-base font-black text-white shadow-md shadow-violet-200 hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60">
                        {starting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} Start quiz <PriceTag action="start_global_quiz" />
                    </button>
                    )}
                </div>
            )}

            {/* ── A later visit: the score, and nothing else ─────── */}
            {returned && (
                <div className="relative mt-4 animate-fade-in-up rounded-3xl border border-violet-100 bg-white p-6 text-center shadow-sm">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> {timedOut ? 'Finished when the time ran out' : 'Quiz completed'}</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{correct} of {total} correct</p>
                    {scoreDetails}
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
                                <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"><Info size={14} className="mt-0.5 shrink-0 text-slate-400" /> That was your one attempt at this quiz. Your course progress, credits and XP are unchanged — take a lesson&apos;s own quiz inside the course to earn those.</p>
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
