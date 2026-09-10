/**
 * Question by Question: one answer at a time, with its score, the
 * interviewer's feedback and a stronger version of the answer.
 *
 * A pager rather than a list. The report already gives the overall picture;
 * this is for reading one answer properly before moving to the next, which is
 * hard to do in a stack of collapsed rows.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, Clock, HelpCircle, User, Trophy, Lightbulb, TrendingUp, Target, Mic } from 'lucide-react';
import { interviewApi, STAGE_LABEL } from './api';
import { ErrorBox, Analyzing, Btn, Section } from '../learningbio/ui';

/** How long the answer took, from the moment the question was asked. */
const timeTaken = (turn) => {
    if (!turn?.askedAt || !turn?.answeredAt) return null;
    const ms = new Date(turn.answeredAt) - new Date(turn.askedAt);
    if (!(ms > 0)) return null;
    const s = Math.round(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const scoreTint = (n) => (n >= 8 ? 'bg-emerald-50 text-emerald-700' : n >= 5 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-600');

export default function QuestionReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [s, setS] = useState(undefined);
    const [error, setError] = useState(null);
    const [at, setAt] = useState(0);

    const load = useCallback(() => interviewApi.session(id).then((x) => { setS(x); setError(null); }).catch((e) => { setError(e); setS(null); }), [id]);
    useEffect(() => { load(); }, [load]);

    const answered = s?.turns?.filter((t) => t.answer) || [];
    const last = answered.length - 1;
    const go = useCallback((next) => setAt((i) => Math.min(last, Math.max(0, next(i)))), [last]);
    useEffect(() => {
        if (!answered.length) return undefined;
        const key = (e) => {
            if (e.target?.closest?.('input, textarea')) return;   // typing somewhere? leave the keys alone
            if (e.key === 'ArrowRight') go((i) => i + 1);
            if (e.key === 'ArrowLeft') go((i) => i - 1);
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [answered.length, go]);

    if (s === undefined) return <div className="mx-auto max-w-4xl pb-12"><Analyzing label="Loading your answers…" /></div>;
    if (!s) return <div className="mx-auto max-w-4xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;
    if (!s.report || !answered.length) {
        return (
            <div className="mx-auto max-w-4xl pb-12">
                <Section icon={Mic} title="There is nothing to review yet">
                    <Btn tone="primary" onClick={() => navigate(`/interview/report/${id}`)}>Back to the report</Btn>
                </Section>
            </div>
        );
    }

    const r = s.report;
    const turn = answered[Math.min(at, last)];
    const p = r.perQuestion.find((x) => x.index === turn.index) || {};
    const score = p.score ?? 0;
    const took = timeTaken(turn);
    const cheer = r.overall >= 75 ? ['Excellent work!', "You're interview ready 🌿"] : ['Keep going!', "You're doing great 🌿"];

    return (
        <div className="mx-auto max-w-4xl space-y-5 pb-12 animate-fade-in">
            {/* ── Where you are ───────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <Link to={`/interview/report/${id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600">
                        <ArrowLeft size={15} /> Back to Interview
                    </Link>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Question by Question</h1>
                    <p className="mt-1 text-sm text-slate-500">Review every answer, see your score, get feedback, and learn how to improve.</p>
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 px-4 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500"><Target size={19} /></span>
                    <div className="leading-tight">
                        <p className="text-sm font-black text-slate-900">{cheer[0]}</p>
                        <p className="text-xs text-slate-600">{cheer[1]}</p>
                    </div>
                </div>
            </div>

            {/* ── One answer ──────────────────────────────────── */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-lg font-black text-slate-900">Question {at + 1} of {answered.length}</p>
                        <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={at + 1} aria-valuemin={1} aria-valuemax={answered.length} aria-label="Progress through your answers">
                            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${((at + 1) / answered.length) * 100}%` }} />
                        </div>
                    </div>
                    {took && (
                        <div className="text-right">
                            <p className="flex items-center justify-end gap-1.5 text-lg font-black tabular-nums text-slate-900"><Clock size={17} className="text-slate-400" /> {took}</p>
                            <p className="text-xs text-slate-500">Time taken</p>
                        </div>
                    )}
                </div>

                {/* The question */}
                <div key={turn.index} className="mt-5 space-y-4 animate-fade-in-up">
                    <div className="flex items-start gap-3 rounded-2xl bg-indigo-50/70 p-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm"><HelpCircle size={20} /></span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-wider text-indigo-500">{STAGE_LABEL[turn.stage] || turn.stage}{turn.isFollowUp ? ' · follow-up' : ''}</p>
                            <p className="text-base font-bold leading-relaxed text-slate-900 sm:text-lg">{turn.question}</p>
                        </div>
                    </div>

                    {/* What you said */}
                    <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                            <User size={18} className="text-indigo-500" /> Your Answer <span className="font-semibold text-slate-500">({turn.inputMode === 'voice' ? 'Spoken' : 'Typed'})</span>
                        </p>
                        <p className="mt-2 rounded-xl bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-700 ring-1 ring-slate-200">{turn.answer}</p>
                        {turn.voice?.wpm ? <p className="mt-2 text-xs text-slate-400">{turn.voice.wordCount} words · {turn.voice.wpm} words/min{turn.voice.fillerCount ? ` · ${turn.voice.fillerCount} filler word${turn.voice.fillerCount === 1 ? '' : 's'}` : ''}</p> : null}
                    </div>

                    {/* Score and feedback */}
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
                        <div className="flex items-center gap-4 rounded-2xl bg-rose-50 p-5">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-500"><Trophy size={24} /></span>
                            <div>
                                <p className="text-sm font-black text-slate-800">Your Score</p>
                                <p className={`mt-0.5 inline-block rounded-lg px-2 text-3xl font-black tabular-nums ${scoreTint(score)}`}>{score} / 10</p>
                            </div>
                        </div>
                        <div className="rounded-2xl bg-amber-50 p-5">
                            <p className="flex items-center gap-2 text-sm font-black text-slate-800"><Lightbulb size={19} className="text-amber-500" /> Feedback</p>
                            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{p.feedback || 'No feedback was written for this answer.'}</p>
                        </div>
                    </div>

                    {/* A stronger answer */}
                    {p.betterAnswer && (
                        <div className="rounded-2xl bg-emerald-50 p-5">
                            <p className="flex items-center gap-2 text-sm font-black text-slate-800"><TrendingUp size={19} className="text-emerald-600" /> Suggested / Better Approach</p>
                            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{p.betterAnswer}</p>
                        </div>
                    )}
                </div>

                {/* Move between answers */}
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                    <button type="button" onClick={() => go((i) => i - 1)} disabled={at === 0}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                        <ChevronLeft size={17} /> Previous Question
                    </button>
                    {at < last ? (
                        <button type="button" onClick={() => go((i) => i + 1)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-transform hover:-translate-y-0.5">
                            Next Question <ArrowRight size={17} />
                        </button>
                    ) : (
                        <Link to={`/interview/report/${id}`}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-transform hover:-translate-y-0.5">
                            Back to the report <ArrowRight size={17} />
                        </Link>
                    )}
                </div>
            </section>

            {/* Jump straight to any answer. */}
            <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white px-5 py-4">
                <span className="mr-1 text-xs font-black uppercase tracking-wider text-slate-500">Jump to</span>
                {answered.map((t, i) => {
                    const n = r.perQuestion.find((x) => x.index === t.index)?.score ?? 0;
                    return (
                        <button key={t.index} type="button" onClick={() => setAt(i)} aria-current={i === at ? 'true' : undefined}
                            title={`Question ${i + 1} — ${n}/10`}
                            className={`h-9 w-9 rounded-xl text-sm font-black transition-all ${i === at ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105' : scoreTint(n) + ' hover:scale-105'}`}>
                            {i + 1}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
