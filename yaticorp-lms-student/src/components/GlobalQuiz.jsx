/**
 * The Global Quiz tab: one paper drawn from every quiz across the courses the
 * student can open, so revision can cross course boundaries.
 *
 * It is practice and says so on every screen. Nothing here changes course
 * progress, credits, XP or the "quizzes passed" figure — those belong to the
 * first attempt of a lesson's own quiz, inside the course player.
 */
import { useEffect, useState } from 'react';
import { Globe, RefreshCw, CheckCircle2, XCircle, Loader2, Info, Trophy, ArrowRight, BookOpen } from 'lucide-react';
import api from '../utils/api';

const LENGTHS = [5, 10, 15];

const Bar = ({ value }) => (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-[width] duration-700 ${value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: `${value}%` }} />
    </div>
);

export default function GlobalQuiz() {
    const [length, setLength] = useState(10);
    const [nonce, setNonce] = useState(0);           // bumped to fetch a fresh set
    // Both pieces of state carry the paper they belong to, so a request that
    // lands late cannot answer for the wrong paper — and so the effect never
    // has to reset anything synchronously, which this codebase's lint forbids.
    const key = `${length}|${nonce}`;
    const [loaded, setLoaded] = useState({ key: null, paper: null, error: '' });
    const [work, setWork] = useState({ key: null, answers: {}, result: null });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

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
    const result = mine ? work.result : null;
    const load = () => { setNonce((n) => n + 1); setSubmitError(''); };
    const choose = (questionId, index) => setWork((w) => ({ key, answers: { ...(w.key === key ? w.answers : {}), [questionId]: index }, result: w.key === key ? w.result : null }));

    const submit = () => {
        const rows = paper.questions.filter((q) => answers[q.questionId] !== undefined)
            .map((q) => ({ quizId: q.quizId, questionId: q.questionId, answer: answers[q.questionId] }));
        if (!rows.length) return;
        setSubmitting(true); setSubmitError('');
        api.post('/user/quizzes/global/submit', { answers: rows })
            .then((r) => { setWork((w) => ({ ...w, key, result: r.data })); window.scrollTo({ top: 0, behavior: 'smooth' }); })
            .catch((e) => setSubmitError(e.response?.data?.message || 'Could not mark the quiz.'))
            .finally(() => setSubmitting(false));
    };

    if (paper === undefined) return <div className="flex justify-center p-12"><Loader2 size={36} className="animate-spin text-indigo-500" /></div>;
    if (paper === null) return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-bold text-red-700">{error}</p>
            <button onClick={load} className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white hover:bg-indigo-700">Try again</button>
        </div>
    );

    /* Nothing to ask yet: no course this student can open has a quiz in it. */
    if (!paper.questions.length) return (
        <div className="animate-fade-in-up rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-100/60 p-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm"><Globe size={30} /></span>
            <h3 className="mt-4 text-xl font-black text-slate-900">No quiz questions yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">The global quiz mixes questions from the quizzes inside your courses. As soon as a course you can open has one, it will appear here.</p>
        </div>
    );

    const answered = Object.keys(answers).length;
    const byId = Object.fromEntries((result?.results || []).map((x) => [x.questionId, x]));

    return (
        <div className="space-y-5 animate-fade-in">
            {/* ── What this is ────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600 p-5 text-white shadow-lg shadow-indigo-200 sm:p-6">
                <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30"><Globe size={24} /></span>
                        <div>
                            <h3 className="text-xl font-black">Global Quiz</h3>
                            <p className="mt-0.5 max-w-lg text-sm text-indigo-100">{paper.available} question{paper.available === 1 ? '' : 's'} across {paper.courses.length} course{paper.courses.length === 1 ? '' : 's'}, mixed into one paper. Practice only — it does not change your progress, credits or XP.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {LENGTHS.map((n) => (
                            <button key={n} onClick={() => setLength(n)} disabled={n > paper.available && n !== length}
                                className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors disabled:opacity-40 ${length === n ? 'bg-white text-indigo-700' : 'bg-white/15 text-white hover:bg-white/25'}`}>{n} Qs</button>
                        ))}
                        <button onClick={load} title="New set of questions" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25"><RefreshCw size={17} /></button>
                    </div>
                </div>
            </div>

            {/* ── Result ──────────────────────────────────────────── */}
            {result && (
                <div className="animate-fade-in-up rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white ${result.score >= 80 ? 'bg-emerald-500' : result.score >= 50 ? 'bg-indigo-600' : 'bg-amber-500'}`}>{result.score}%</span>
                        <div className="min-w-0 flex-1">
                            <p className="text-lg font-black text-slate-900">{result.correctCount} of {result.totalQuestions} correct</p>
                            <p className="text-sm text-slate-500">{result.score >= 80 ? 'Strong revision — you know this material.' : result.score >= 50 ? 'A decent pass. Read the explanations below.' : 'Worth another look: the explanations are below.'}</p>
                            <div className="mt-2 max-w-sm"><Bar value={result.score} /></div>
                        </div>
                        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-indigo-700">New questions <ArrowRight size={16} /></button>
                    </div>
                    <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"><Info size={14} className="mt-0.5 shrink-0 text-slate-400" /> This was practice. Your course progress, credits and XP are unchanged — take a lesson&apos;s own quiz inside the course to earn those.</p>
                </div>
            )}

            {submitError && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{submitError}</p>}

            {/* ── The paper ───────────────────────────────────────── */}
            <ol className="space-y-4">
                {paper.questions.map((q, i) => {
                    const marked = byId[q.questionId];
                    return (
                        <li key={q.questionId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-3 flex items-start gap-3">
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${marked ? (marked.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600') : 'bg-indigo-100 text-indigo-700'}`}>{i + 1}</span>
                                <div className="min-w-0">
                                    {(q.courseTitle || q.lessonTitle) && (
                                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <BookOpen size={12} /> {[q.courseTitle, q.lessonTitle].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-base font-bold leading-snug text-slate-900">{q.questionText}</p>
                                </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {q.options.map((opt, idx) => {
                                    const chosen = answers[q.questionId] === idx;
                                    const isRight = marked && marked.correctAnswer === idx;
                                    const isWrongPick = marked && marked.providedAnswer === idx && !marked.isCorrect;
                                    return (
                                        <button key={idx} type="button" disabled={!!result}
                                            onClick={() => choose(q.questionId, idx)}
                                            className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors disabled:cursor-default ${isRight ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                                : isWrongPick ? 'border-rose-300 bg-rose-50 text-rose-900'
                                                    : chosen ? 'border-indigo-400 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'}`}>
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${isRight ? 'bg-emerald-500 text-white' : isWrongPick ? 'bg-rose-500 text-white' : chosen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {isRight ? <CheckCircle2 size={14} /> : isWrongPick ? <XCircle size={14} /> : String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className="min-w-0">{opt}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {marked?.explanation && (
                                <p className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-2.5 text-sm text-slate-700"><span className="font-bold text-indigo-700">Why: </span>{marked.explanation}</p>
                            )}
                        </li>
                    );
                })}
            </ol>

            {!result && (
                <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/95 px-5 py-3.5 shadow-lg backdrop-blur">
                    <p className="text-sm font-bold text-slate-700">{answered} of {paper.questions.length} answered</p>
                    <button onClick={submit} disabled={!answered || submitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 font-bold text-white shadow-md shadow-indigo-200 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
                        {submitting ? <Loader2 size={17} className="animate-spin" /> : <Trophy size={17} />} {submitting ? 'Marking…' : 'Submit quiz'}
                    </button>
                </div>
            )}
        </div>
    );
}
