/**
 * The Global Quiz tab: a general-knowledge paper drawn from the bank an
 * administrator writes, not from the quizzes inside the student's courses.
 *
 * One question is on screen at a time, and each answer is marked the moment
 * it is given, so the explanation arrives while the question is still in mind.
 * Skip moves on and leaves the question unanswered; Next waits until it has
 * been answered. The last question offers the score, and the whole paper then
 * comes back at once so the explanations can be read together.
 *
 * The marking endpoint takes whatever answers it is sent and records nothing,
 * so one question at a time works exactly as a whole paper does.
 *
 * It is practice and says so on the banner. Nothing here changes course
 * progress, credits, XP or the "quizzes passed" figure — those belong to the
 * first attempt of a lesson's own quiz, inside the course player.
 */
import { useEffect, useState } from 'react';
import { Globe, CheckCircle2, XCircle, Loader2, Info, ArrowRight, Tag, RotateCcw } from 'lucide-react';
import api from '../utils/api';
import { GlobeScene, Waves, ScriptNote } from './quiz/QuizArt';

const LENGTHS = [5, 10, 15];

export default function GlobalQuiz() {
    const [length, setLength] = useState(10);
    const [nonce, setNonce] = useState(0);           // bumped to fetch a fresh set
    // Both pieces of state carry the paper they belong to, so a request that
    // lands late cannot answer for the wrong paper — and so the effect never
    // has to reset anything synchronously, which this codebase's lint forbids.
    const key = `${length}|${nonce}`;
    const [loaded, setLoaded] = useState({ key: null, paper: null, error: '' });
    // `marks` is what the server said about each answer, keyed by question id.
    // `at` is the question on screen; the others are not rendered at all.
    const [work, setWork] = useState({ key: null, at: 0, answers: {}, marks: {}, pending: null, showScore: false });
    const [markError, setMarkError] = useState('');

    useEffect(() => {
        let cancelled = false;
        api.get(`/user/quizzes/global?limit=${length}`)
            .then((r) => !cancelled && setLoaded({ key, paper: r.data, error: '' }))
            .catch((e) => !cancelled && setLoaded({ key, paper: null, error: e.response?.data?.message || 'Could not load the quiz.' }));
        return () => { cancelled = true; };
    }, [key, length]);

    const ready = loaded.key === key;
    const paper = ready ? loaded.paper : undefined;  // undefined = loading, null = failed
    const error = ready ? loaded.error : '';
    const mine = work.key === key;
    const answers = mine ? work.answers : {};
    const marks = mine ? work.marks : {};
    const pending = mine ? work.pending : null;
    const showScore = mine ? work.showScore : false;
    const at = mine ? work.at : 0;

    const load = () => { setNonce((n) => n + 1); setMarkError(''); };
    // Moving through the paper has to claim it too. Skipping the very first
    // question happens before any answer has been given, so without this the
    // change would be written against a paper the state does not own and read
    // straight back as the starting position.
    const step = (change) => setWork((w) => (w.key === key
        ? { ...w, ...change }
        : { key, at: 0, answers: {}, marks: {}, pending: null, showScore: false, ...change }));
    const goTo = (index) => { setMarkError(''); step({ at: index }); };
    const finish = () => { step({ showScore: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    /** Answer one question and have it marked straight away. */
    const choose = (questionId, index) => {
        if (answers[questionId] !== undefined || pending) return;
        setMarkError('');
        setWork((w) => {
            const own = w.key === key;
            return {
                key,
                at: own ? w.at : 0,
                answers: { ...(own ? w.answers : {}), [questionId]: index },
                marks: own ? w.marks : {},
                pending: questionId,
                showScore: false
            };
        });
        api.post('/user/quizzes/global/submit', { answers: [{ questionId, answer: index }] })
            .then((r) => {
                const mark = (r.data?.results || []).find((x) => x.questionId === questionId) || null;
                setWork((w) => (w.key === key
                    ? { ...w, marks: mark ? { ...w.marks, [questionId]: mark } : w.marks, pending: null }
                    : w));
            })
            .catch((e) => {
                setMarkError(e.response?.data?.message || 'Could not mark that answer.');
                // The choice is rolled back so the question can be answered again.
                setWork((w) => {
                    if (w.key !== key) return w;
                    const rest = { ...w.answers };
                    delete rest[questionId];
                    return { ...w, answers: rest, pending: null };
                });
            });
    };

    if (paper === undefined) return <div className="flex justify-center p-12"><Loader2 size={36} className="animate-spin text-violet-500" /></div>;
    if (paper === null) return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-bold text-red-700">{error}</p>
            <button onClick={load} className="mt-4 rounded-xl bg-violet-600 px-6 py-2.5 font-bold text-white hover:bg-violet-700">Try again</button>
        </div>
    );

    /* Nothing to ask yet: the administrator has not written any questions. */
    if (!paper.questions.length) return (
        <div className="animate-fade-in-up rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-violet-100/60 p-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-500 shadow-sm"><Globe size={30} /></span>
            <h3 className="mt-4 text-xl font-black text-slate-900">No quiz questions yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">The global quiz asks general questions your institution writes. As soon as some are added, they will appear here.</p>
        </div>
    );

    const total = paper.questions.length;
    const answered = Object.keys(answers).length;
    const correct = Object.values(marks).filter((m) => m.isCorrect).length;
    const score = answered ? Math.round((correct / total) * 100) : 0;
    const current = Math.min(at, total - 1);
    const onLast = current >= total - 1;
    const currentAnswered = answers[paper.questions[current].questionId] !== undefined;
    // One question at a time while the paper is being taken; the whole set
    // comes back together once the score is in, so the explanations can be
    // read side by side.
    const onScreen = showScore
        ? paper.questions.map((q, i) => [q, i])
        : [[paper.questions[current], current]];

    // The panel stays inside its column. It used to bleed past it with a
    // negative margin, which widened the page by that margin on a phone and
    // set the whole tab scrolling sideways.
    return (
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-violet-50/60 p-2 sm:p-3 animate-fade-in">
            <Waves className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 w-full opacity-70" />

            {/* ── Banner ──────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-r from-violet-100 via-violet-100/60 to-violet-200/80 px-5 pb-5 pt-5 sm:px-7">
                <Waves className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" />
                <GlobeScene className="pointer-events-none absolute -right-6 -top-5 hidden h-[215px] w-auto sm:block" />

                <div className="relative flex items-start gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-200/70 text-violet-700 ring-1 ring-white/70"><Globe size={28} /></span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-2xl font-black text-slate-900">Global Quiz</h3>
                        <p className="mt-0.5 max-w-lg text-sm text-slate-600">
                            {paper.available} general question{paper.available === 1 ? '' : 's'}
                            {paper.categories?.length ? ` across ${paper.categories.length} categor${paper.categories.length === 1 ? 'y' : 'ies'}` : ''}, mixed into one paper.
                        </p>
                        <p className="max-w-lg text-sm text-slate-600">Practice only — it does not change your progress, credits or XP.</p>
                    </div>
                    {/* The note and the globe share the right-hand end: the note
                        flows, and the spacer holds open the room the globe is
                        drawn over, so the two can never sit on top of each other. */}
                    <ScriptNote lines={['Small', 'Steps', 'Big Knowledge!']}
                        className="mt-1 hidden shrink-0 text-[16px] leading-tight text-violet-500 lg:block" tilt={-8} />
                    <div aria-hidden="true" className="hidden w-[200px] shrink-0 sm:block" />
                </div>

                <div className="relative mt-4 flex flex-wrap items-center gap-2">
                    {LENGTHS.map((n) => (
                        <button key={n} onClick={() => setLength(n)} disabled={n > paper.available && n !== length}
                            aria-pressed={length === n}
                            className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-40 ${length === n
                                ? 'bg-violet-600 text-white shadow-md shadow-violet-300/60'
                                : 'bg-white/70 text-slate-500 hover:bg-white'}`}>{n} Qs</button>
                    ))}
                </div>
            </div>

            {/* ── The paper, with progress alongside ──────────────── */}
            <div className="relative mt-4">
                <div className="min-w-0 space-y-4">
                    {showScore && (
                        <div className="animate-fade-in-up rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-violet-600' : 'bg-amber-500'}`}>{score}%</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-lg font-black text-slate-900">{correct} of {total} correct</p>
                                    <p className="text-sm text-slate-500">{score >= 80 ? 'Strong revision — you know this material.' : score >= 50 ? 'A decent pass. Read the explanations below.' : 'Worth another look: the explanations are below.'}</p>
                                </div>
                                <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-violet-700">New questions <ArrowRight size={16} /></button>
                            </div>
                            <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"><Info size={14} className="mt-0.5 shrink-0 text-slate-400" /> This was practice. Your course progress, credits and XP are unchanged — take a lesson&apos;s own quiz inside the course to earn those.</p>
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
                                        <span className="ml-auto shrink-0 rounded-xl border border-violet-100 bg-violet-50 px-3 py-1.5 text-sm font-bold tabular-nums text-violet-700">{i + 1} / {total}</span>
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
                    <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-violet-100 bg-white/95 px-5 py-3.5 shadow-lg backdrop-blur">
                        <p className="text-sm font-bold text-slate-700">{answered} of {total} answered</p>
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Skip moves on and leaves the question unanswered;
                                Next waits until it has been answered, so the two
                                buttons never mean the same thing. */}
                            {!showScore && !onLast && (
                                <button type="button" onClick={() => goTo(current + 1)}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:border-violet-300 hover:text-violet-700">
                                    Skip question <ArrowRight size={16} />
                                </button>
                            )}
                            {showScore ? (
                                <button type="button" onClick={load}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700">
                                    New questions <RotateCcw size={16} />
                                </button>
                            ) : onLast ? (
                                <button type="button" onClick={finish}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700">
                                    See your score <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button type="button" onClick={() => goTo(current + 1)} disabled={!currentAnswered || !!pending}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-45">
                                    Next question <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
