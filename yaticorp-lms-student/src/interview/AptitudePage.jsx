/**
 * Aptitude practice (asked 2026-10-22): "IQ & Reasoning" for a school student,
 * "Aptitude Practice" for everyone else. Sets of ten questions pitched to the
 * student's class or level by the server, answered one at a time: each answer
 * shows at once whether it was right, the right answer, and why.
 *
 *   /interview/aptitude        the sections, the scores, and Start
 *   /interview/aptitude/:id    one set, question by question, then its score
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Brain, Calculator, Shapes, Puzzle, BookA, Shuffle, Check, X, Lightbulb,
    Trophy, RotateCcw, Play, History, Star
} from 'lucide-react';
import { interviewApi, fmtDate } from './api';
import { Btn, ErrorBox, Analyzing, Section } from '../learningbio/ui';
import { ScoreRing, Celebration, CountUp } from './ui';
import { markReturn } from './scrollMemory';

const ICON = { mixed: Shuffle, asked: Star, maths: Calculator, patterns: Shapes, reasoning: Puzzle, words: BookA };
const TINT = { mixed: 'bg-indigo-100 text-indigo-600', asked: 'bg-rose-100 text-rose-500', maths: 'bg-amber-100 text-amber-600', patterns: 'bg-violet-100 text-violet-600', reasoning: 'bg-sky-100 text-sky-600', words: 'bg-emerald-100 text-emerald-600' };
const DIFF = { easy: 'bg-emerald-100 text-emerald-700', medium: 'bg-indigo-100 text-indigo-700', hard: 'bg-rose-100 text-rose-700' };
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const SectionIcon = ({ id, size }) => { const Icon = ICON[id] || Brain; return <Icon size={size} />; };
// One of the questions interviewers ask most (the server's "Most asked").
const OftenAsked = () => <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 ring-1 ring-rose-100" data-often-asked><Star size={10} className="fill-current" /> Often asked in interviews</span>;

export default function AptitudePage() {
    const { id } = useParams();
    // Keyed by the set, so "Try another set" starts the next one afresh.
    return id ? <SetView key={id} id={id} /> : <Home />;
}

const BackLink = ({ to, children, onClick }) => (
    <Link to={to} onClick={onClick} className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> {children}</Link>
);

const Stat = ({ value, label }) => (
    <div className="rounded-2xl bg-white/15 px-3 py-2.5 text-center ring-1 ring-white/20">
        <p className="text-xl font-black leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] font-semibold text-indigo-100">{label}</p>
    </div>
);

/* ── The section's page ───────────────────────────────────────────────── */

function Home() {
    const navigate = useNavigate();
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [section, setSection] = useState('mixed');
    const [starting, setStarting] = useState(false);

    const load = useCallback(() => interviewApi.aptitude().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData((cur) => cur || null); }), []);
    useEffect(() => { load(); }, [load]);

    const start = () => {
        setStarting(true);
        interviewApi.aptitudeStart(section).then((s) => navigate(`/interview/aptitude/${s.id}`)).catch((e) => { setError(e); setStarting(false); });
    };

    if (data === undefined) return <div className="mx-auto max-w-4xl pb-12"><Analyzing label="Getting your questions ready…" /></div>;
    if (!data) return <div className="mx-auto max-w-4xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;
    const { stats } = data;
    const label = (id) => data.sections.find((s) => s.id === id)?.label || id;

    return (
        <div className="mx-auto max-w-4xl space-y-5 pb-12 animate-fade-in">
            <BackLink to="/interview" onClick={markReturn}>Interview</BackLink>

            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200 animate-fade-in-up sm:p-6">
                <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="relative grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="flex items-start gap-4">
                        <span aria-hidden="true" className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 sm:flex"><Brain size={24} /></span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100">Interview Prep</p>
                            <h1 className="text-2xl font-black sm:text-3xl">{data.title}</h1>
                            <p className="mt-1 text-sm text-indigo-100" data-level>
                                {data.setSize} quick questions at a time{data.level ? <>, picked for <span className="font-black text-white">{data.level}</span></> : ''}.
                            </p>
                            <p className="mt-1 hidden text-sm text-indigo-100 sm:block">{data.school ? 'Maths puzzles, patterns, logic and words: train your brain for exams, tests and interviews.' : 'The kind of questions placement and entrance tests ask.'}</p>
                            {!data.placed && <p className="mt-2 rounded-xl bg-white/15 px-3 py-2 text-xs text-white ring-1 ring-white/20" data-unplaced>Add your class or course to your Career Path profile, and the questions will match your level.</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 md:w-72">
                        <Stat value={<CountUp value={stats.sets} />} label="Sets done" />
                        <Stat value={stats.best === null ? '—' : <CountUp value={stats.best} suffix="%" />} label="Best score" />
                        <Stat value={stats.last ? `${stats.last.correct}/${stats.last.total}` : '—'} label="Last set" />
                    </div>
                </div>
            </header>

            {error && <ErrorBox error={error} />}

            {data.open && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 animate-fade-in-up" data-open-set>
                    <p className="min-w-0 flex-1 basis-56 text-sm text-slate-700"><span className="font-bold">You have a set in progress:</span> {label(data.open.section)}, {data.open.answered} of {data.open.total} answered.</p>
                    <Link to={`/interview/aptitude/${data.open.id}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-sm font-bold text-white shadow-sm hover:bg-amber-600">Continue <ArrowRight size={15} /></Link>
                </div>
            )}

            <Section icon={Brain} title="Choose what to practise" hint="Pick one kind of question, or a mix of them all.">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {data.sections.map((s) => {
                        const on = section === s.id;
                        return (
                            <button key={s.id} type="button" onClick={() => setSection(s.id)} aria-pressed={on} data-section={s.id}
                                className={`iv-card flex items-center gap-3 rounded-2xl border p-3 text-left ${on ? 'border-indigo-300 bg-indigo-50 shadow-md ring-2 ring-indigo-300' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TINT[s.id] || TINT.mixed}`}><SectionIcon id={s.id} size={19} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-black text-slate-900">{s.label}</span>
                                    <span className="block text-[11px] leading-snug text-slate-500">{s.hint}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                <Btn tone="primary" icon={Play} onClick={start} loading={starting} className="mt-4 w-full !rounded-2xl !py-3 !text-base sm:w-auto sm:px-6">
                    Start {data.setSize} questions
                </Btn>
            </Section>

            {stats.recent.length > 0 && (
                <Section icon={History} title="Your recent sets">
                    <ul className="divide-y divide-slate-100">
                        {stats.recent.map((r) => (
                            <li key={r.id} className="flex items-center gap-3 py-2.5">
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TINT[r.section] || TINT.mixed}`}><SectionIcon id={r.section} size={16} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-slate-800">{label(r.section)}</span>
                                    <span className="block text-xs text-slate-500">{fmtDate(r.completedAt)}</span>
                                </span>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums ${r.percent >= 80 ? 'bg-emerald-100 text-emerald-700' : r.percent >= 50 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{r.correct}/{r.total}</span>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </div>
    );
}

/* ── One set ──────────────────────────────────────────────────────────── */

function SetView({ id }) {
    const navigate = useNavigate();
    const [set, setSet] = useState(undefined);
    const [error, setError] = useState(null);
    // The question on screen, or 'result'. Until the student moves on it is
    // worked out: the first one not yet answered, or the result when all are.
    const [view, setView] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => interviewApi.aptitudeSet(id).then((s) => { setSet(s); setError(null); }).catch((e) => { setError(e); setSet((cur) => cur || null); }), [id]);
    useEffect(() => { load(); }, [load]);

    if (set === undefined) return <div className="mx-auto max-w-3xl pb-12"><Analyzing label="Getting your questions ready…" /></div>;
    if (!set) return <div className="mx-auto max-w-3xl space-y-4 pb-12"><BackLink to="/interview/aptitude">Back</BackLink><ErrorBox error={error} onRetry={load} /></div>;

    const firstOpen = set.questions.findIndex((q) => q.chosen === null);
    const shown = view ?? (firstOpen === -1 ? 'result' : firstOpen);

    const choose = (q, choice) => {
        if (busy || q.chosen !== null) return;
        // Stay on this question to show how it went: without this the screen
        // moved straight on to the next one not yet answered.
        setView(shown);
        setBusy(true);
        interviewApi.aptitudeAnswer(id, q.id, choice)
            .then(({ set: s }) => { setSet(s); setError(null); })
            .catch((e) => setError(e))
            .finally(() => setBusy(false));
    };
    const again = () => {
        setBusy(true);
        interviewApi.aptitudeStart(set.section).then((s) => navigate(`/interview/aptitude/${s.id}`)).catch((e) => { setError(e); setBusy(false); });
    };

    if (shown === 'result') return <Result set={set} onAgain={again} busy={busy} error={error} />;

    const q = set.questions[shown];
    const answered = q.chosen !== null;
    const last = shown === set.questions.length - 1;
    return (
        <div className="mx-auto max-w-3xl space-y-4 pb-12 animate-fade-in">
            <BackLink to="/interview/aptitude">{set.title}</BackLink>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-black text-slate-900" data-progress>Question {shown + 1} of {set.total}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100"><Check size={13} strokeWidth={3} /> {set.correct} right</span>
                </div>
                <div className="mt-2.5 flex gap-1" aria-hidden="true">
                    {set.questions.map((x, i) => (
                        <span key={x.id} className={`h-1.5 flex-1 rounded-full ${x.chosen === null ? (i === shown ? 'bg-indigo-300' : 'bg-slate-200') : x.right ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                    ))}
                </div>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in-up sm:p-6" data-question={q.id}>
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{q.topic}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFF[q.difficulty] || DIFF.medium}`}>{q.difficulty}</span>
                    {q.faq && <OftenAsked />}
                </div>
                <h1 className="mt-2 text-lg font-bold leading-snug text-slate-900 sm:text-xl">{q.question}</h1>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Options">
                    {q.options.map((o, i) => {
                        const isAnswer = answered && i === q.answer;
                        const isWrongPick = answered && i === q.chosen && !q.right;
                        return (
                            <button key={o} type="button" onClick={() => choose(q, i)} disabled={answered || busy} data-option={i}
                                aria-label={`${LETTERS[i]}: ${o}${isAnswer ? ' (right answer)' : isWrongPick ? ' (your answer, wrong)' : ''}`}
                                className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-all ${
                                    isAnswer ? 'border-emerald-300 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-300'
                                        : isWrongPick ? 'border-rose-300 bg-rose-50 text-rose-900 ring-2 ring-rose-300'
                                            : answered ? 'border-slate-200 bg-white text-slate-400'
                                                : 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md'}`}>
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${isAnswer ? 'bg-emerald-500 text-white' : isWrongPick ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {isAnswer ? <Check size={15} strokeWidth={3} /> : isWrongPick ? <X size={15} strokeWidth={3} /> : LETTERS[i]}
                                </span>
                                <span className="min-w-0 flex-1 break-words">{o}</span>
                            </button>
                        );
                    })}
                </div>

                {error && <div className="mt-3"><ErrorBox error={error} /></div>}

                {answered && (
                    <div className="mt-4 space-y-3 animate-fade-in-up" data-feedback={q.right ? 'right' : 'wrong'}>
                        <p className={`rounded-2xl px-4 py-3 text-sm font-bold ${q.right ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                            {q.right ? 'Correct! Well done. 🎉' : <>Not quite. The answer is {LETTERS[q.answer]}: {q.options[q.answer]}.</>}
                        </p>
                        <p className="flex items-start gap-2 rounded-2xl bg-amber-50/70 px-4 py-3 text-sm text-slate-700"><Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-500" /> <span><span className="font-bold text-amber-700">Why: </span>{q.explanation}</span></p>
                        <div className="flex justify-end">
                            <Btn tone="primary" onClick={() => setView(last ? 'result' : shown + 1)} className="!rounded-2xl !px-5 !py-2.5">
                                {last ? <>See your score <Trophy size={15} /></> : <>Next question <ArrowRight size={15} /></>}
                            </Btn>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

/* ── The score ────────────────────────────────────────────────────────── */

function Result({ set, onAgain, busy, error }) {
    const great = set.percent >= 80;
    const [head, line] = great ? ['Excellent!', 'Your brain is in great shape.'] : set.percent >= 50 ? ['Good effort!', 'Read the explanations below, then try another set.'] : ['Keep practising!', 'Every set makes you quicker. Read why below, then try again.'];
    return (
        <div className="mx-auto max-w-3xl space-y-5 pb-12 animate-fade-in">
            <BackLink to="/interview/aptitude">{set.title}</BackLink>
            <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm animate-fade-in-up sm:p-7" data-result>
                {great && <Celebration />}
                <div className="flex justify-center"><ScoreRing value={set.percent} size={132} stroke={11} label="Score" /></div>
                <h1 className="mt-3 text-2xl font-black text-slate-900">{head}</h1>
                <p className="mt-1 text-sm text-slate-600">You got <span className="font-black text-slate-900">{set.correct} of {set.total}</span> right in {set.sectionLabel}. {line}</p>
                {error && <div className="mt-3 text-left"><ErrorBox error={error} /></div>}
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Btn tone="primary" icon={RotateCcw} onClick={onAgain} loading={busy} className="!rounded-2xl !px-5 !py-2.5">Try another set</Btn>
                    <Link to="/interview/aptitude" className="inline-flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-white px-5 py-2.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50">Choose another kind</Link>
                </div>
            </section>

            <Section icon={Lightbulb} title="Your answers" hint="Each question, the right answer, and why.">
                <ol className="space-y-2.5">
                    {set.questions.map((q, i) => (
                        <li key={q.id} className={`rounded-2xl border px-4 py-3 ${q.right ? 'border-emerald-100 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/40'}`} data-review={q.right ? 'right' : 'wrong'}>
                            <p className="flex items-start gap-2 text-sm font-semibold text-slate-900">
                                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${q.right ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>{q.right ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}</span>
                                <span className="min-w-0 flex-1 break-words"><span className="text-slate-400">{i + 1}.</span> {q.question}</span>
                            </p>
                            {q.faq && <p className="mt-1 pl-7"><OftenAsked /></p>}
                            <p className="mt-1.5 pl-7 text-xs text-slate-600">
                                {q.right ? <>Your answer: <span className="font-bold text-emerald-700">{q.options[q.answer]}</span></> : <>Your answer: <span className="font-bold text-rose-700">{q.options[q.chosen]}</span> · Right answer: <span className="font-bold text-emerald-700">{q.options[q.answer]}</span></>}
                            </p>
                            <p className="mt-1 pl-7 text-xs text-slate-500">{q.explanation}</p>
                        </li>
                    ))}
                </ol>
            </Section>
        </div>
    );
}
