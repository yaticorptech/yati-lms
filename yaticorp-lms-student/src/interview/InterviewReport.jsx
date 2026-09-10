/** The report: overall score, six dimensions, strengths, improvements, feedback, every question reviewed, and the plan. */
import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Award, ThumbsUp, TrendingUp, MessageSquare, ListChecks, Route, RotateCcw, ChevronDown, ChevronRight, BookOpen, Lightbulb, FileText, Target, MessageCircle, Code2, Star, BarChart3, Rocket, Sprout } from 'lucide-react';
import { interviewApi, TYPE_META, STAGE_LABEL, fmtDate, scoreTone } from './api';
import { AuthContext } from '../context/AuthContext';
import Illustration from './Illustration';
import { Section, Btn, ErrorBox, Analyzing } from '../learningbio/ui';
import { ScoreRing, Collapse, Celebration } from './ui';
import { DeliveryCard, RecommendationCard } from './ReportCards';

/**
 * The six dimensions: what to call each one, the colour it wears, and the one
 * line of advice that goes beside its bar — the advice when the score is low,
 * the praise when it is not.
 */
const DIMENSIONS = [
    { key: 'communication', label: 'Communication', icon: MessageCircle, tint: 'bg-violet-100 text-violet-600', low: 'Speak more confidently', high: 'Clear, confident delivery' },
    { key: 'technical', label: 'Technical Knowledge', icon: Code2, tint: 'bg-indigo-100 text-indigo-600', low: 'Go deeper on technical details', high: 'Strong technical depth' },
    { key: 'answerQuality', label: 'Answer Quality', icon: FileText, tint: 'bg-sky-100 text-sky-600', low: 'Give detailed examples', high: 'Well-structured answers' },
    { key: 'problemSolving', label: 'Problem Solving', icon: Lightbulb, tint: 'bg-amber-100 text-amber-600', low: 'Explain your approach clearly', high: 'Clear problem approach' },
    { key: 'confidence', label: 'Confidence', icon: Star, tint: 'bg-orange-100 text-orange-500', low: 'Maintain an engaging pace', high: 'Confident and steady' },
    { key: 'relevance', label: 'Relevance', icon: Target, tint: 'bg-rose-100 text-rose-500', low: 'Align answers with the role', high: 'On point for the role' }
];
const barFor = (v) => (v >= 75 ? 'from-emerald-400 to-teal-500' : v >= 50 ? 'from-indigo-500 to-violet-500' : 'from-amber-400 to-orange-500');

/** One dimension: coloured tile, label, a bar that fills on load, the number, and its advice. */
const Dimension = ({ dim, value }) => {
    const [width, setWidth] = useState(0);
    useEffect(() => { const t = setTimeout(() => setWidth(value), 120); return () => clearTimeout(t); }, [value]);
    const Icon = dim.icon;
    return (
        <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${dim.tint}`}><Icon size={19} /></span>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800">{dim.label}</span>
                    <span className="text-sm font-black tabular-nums text-slate-900">{value}%</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={dim.label}>
                    <div className={`h-full rounded-full bg-gradient-to-r ${barFor(value)} transition-[width] duration-1000 ease-out`} style={{ width: `${width}%` }} />
                </div>
            </div>
            <span className="hidden w-32 shrink-0 rounded-xl bg-slate-100 px-2.5 py-2 text-[11px] font-semibold leading-tight text-slate-600 sm:block">{value >= 70 ? dim.high : dim.low}</span>
        </div>
    );
};

export default function InterviewReport() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [s, setS] = useState(undefined);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(0);
    const [detailed, setDetailed] = useState(false);
    const [starting, setStarting] = useState(false);

    const load = useCallback(() => interviewApi.session(id).then((x) => { setS(x); setError(null); }).catch((e) => { setError(e); setS(null); }), [id]);
    useEffect(() => { load(); }, [load]);

    if (s === undefined) return <div className="mx-auto max-w-4xl pb-12"><Analyzing label="Loading your report…" /></div>;
    if (!s) return <div className="mx-auto max-w-4xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;
    if (!s.report) return <div className="mx-auto max-w-4xl pb-12"><Section icon={MessageSquare} title="This interview has no report yet"><Btn tone="primary" onClick={() => navigate(`/interview/mock/${s.id}`)}>Continue the interview</Btn></Section></div>;
    const r = s.report; const meta = TYPE_META[s.type] || TYPE_META.full;
    const answered = s.turns.filter((t) => t.answer);
    const xpTotal = (s.xp?.completed || 0) + (s.xp?.improved || 0) + (s.xp?.challenge || 0);
    const practiceTarget = (r.plan || []).find((p) => p.courseId);
    const showDetailed = () => { setDetailed(true); setTimeout(() => document.getElementById('question-by-question')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
    const retake = () => { setStarting(true); navigate(`/interview/mock/new?type=${encodeURIComponent(s.type)}&role=${encodeURIComponent(s.role || '')}`); };
    const showPlan = () => document.getElementById('next-steps')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // A warm banner rather than a dark one: the score is read from the ring, and
    // dark text on a light ground keeps the interviewer's paragraph readable.
    const heroTone = r.overall >= 75 ? 'from-emerald-100 via-emerald-50 to-teal-100' : r.overall >= 50 ? 'from-indigo-100 via-violet-50 to-indigo-100' : 'from-amber-200 via-amber-100 to-orange-200';
    const firstName = (user?.name || '').trim().split(' ')[0] || 'there';

    return (
        <div className="mx-auto max-w-5xl space-y-5 pb-12 animate-fade-in">
            {/* ── Where you are, and a way straight back to practice ── */}
            <div className="flex items-center justify-between gap-3">
                <Link to="/interview" className="inline-flex items-center gap-2.5 text-lg font-black text-slate-900 hover:text-indigo-600">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"><ArrowLeft size={17} /></span>
                    Interview Ready
                </Link>
                <Link to="/interview/practice" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-600 shadow-sm ring-1 ring-slate-200 hover:bg-indigo-50">
                    <RotateCcw size={15} /> Practice Again
                </Link>
            </div>

            {/* ── The result ──────────────────────────────────── */}
            <header className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${heroTone} p-5 shadow-sm ring-1 ring-black/5 sm:p-7`}>
                <span aria-hidden="true" className="pointer-events-none absolute -left-10 -top-10 h-52 w-52 rounded-full bg-white/40 blur-3xl" />
                {(r.overall >= 75 || r.improvedBy > 0) && <Celebration />}
                <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto_210px]">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">{meta.emoji} {meta.label} · {fmtDate(s.completedAt)}</p>
                        <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-[2rem]">Interview Completed!{r.overall >= 75 ? ' 🎉' : ''}</h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-700">{r.feedback}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                            {xpTotal > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-slate-800 shadow-sm"><Star size={14} className="fill-amber-400 text-amber-500" /> +{xpTotal} XP earned</span>}
                            {r.improvedBy > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-emerald-700 shadow-sm">▲ {r.improvedBy} points over your best</span>}
                            {s.xp?.challenge > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-slate-800 shadow-sm">🏆 Weekly challenge complete</span>}
                        </div>
                    </div>

                    <div className="hidden items-end gap-1 lg:flex">
                        <p className="lb-script mb-10 text-lg leading-tight text-orange-600/90">{r.overall >= 75 ? 'Well\u00a0done!' : 'Great\u00a0Effort!'}</p>
                        <Illustration name="cheer" mascot={false} height={150} />
                    </div>

                    <div className="justify-self-center text-center">
                        <div className="animate-pop-in rounded-full bg-white p-2 shadow-lg shadow-black/5">
                            <ScoreRing value={r.overall} size={150} stroke={13}>
                                <span className="text-5xl font-black leading-none tabular-nums text-slate-900">{r.overall}</span>
                                <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">out of 100</span>
                            </ScoreRing>
                        </div>
                        <p className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white/80 px-3.5 py-2 text-[11px] font-bold italic text-slate-700 shadow-sm">
                            <Lightbulb size={15} className="shrink-0 text-amber-500" /> {r.overall >= 75 ? '“You are ready — go and get it!”' : '“Every interview is a step forward!”'}
                        </p>
                    </div>
                </div>
            </header>

            {error && <ErrorBox error={error} />}

            <div className="grid gap-5 lg:grid-cols-2">
                {/* ── Scores ──────────────────────────────────── */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in-up sm:p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"><TrendingUp size={21} /></span>
                            <div>
                                <h2 className="text-lg font-black text-slate-900">Scores</h2>
                                <p className="mt-0.5 text-xs text-indigo-500">Here&apos;s how you performed in different areas.</p>
                            </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${r.overall >= 75 ? 'bg-emerald-50 text-emerald-700' : r.overall >= 50 ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-600'}`}>Overall: {r.overall}/100</span>
                    </div>
                    <div className="space-y-3.5">{DIMENSIONS.map((d) => <Dimension key={d.key} dim={d} value={r.scores?.[d.key] ?? 0} />)}</div>
                </section>

                <div className="space-y-5">
                    {/* ── Strengths ───────────────────────────── */}
                    <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm animate-fade-in-up sm:p-6">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600"><ThumbsUp size={21} /></span>
                                <h2 className="mt-1.5 text-lg font-black text-slate-900">What you did well</h2>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">Keep it up! ✨</span>
                        </div>
                        <ul className="stagger space-y-2.5">
                            {r.strengths.map((t, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm leading-snug text-slate-700">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">✓</span> {t}
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* ── Improvements ────────────────────────── */}
                    <section className="rounded-3xl border border-rose-100 bg-rose-50/40 p-5 shadow-sm animate-fade-in-up sm:p-6">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-500"><BarChart3 size={21} /></span>
                                <h2 className="mt-1.5 text-lg font-black text-slate-900">Areas to improve</h2>
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-600"><Target size={13} /> Focus on these</span>
                        </div>
                        <ul className="stagger space-y-2">
                            {r.improvements.map((t, i) => (
                                <li key={i}>
                                    <button type="button" onClick={showPlan} className="iv-card flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-left">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-700">{i + 1}</span>
                                        <span className="min-w-0 flex-1 text-sm leading-snug text-slate-700">{t}</span>
                                        <ChevronRight size={17} className="shrink-0 text-rose-400" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>

            {/* ── Delivery + recommendation ────────────────────── */}
            <div className="grid gap-5 lg:grid-cols-2">
                <DeliveryCard communication={r.communication} />
                <RecommendationCard report={r} onPractice={() => navigate(practiceTarget ? `/learn/${practiceTarget.courseId}` : '/interview/practice')} onRetake={retake} onDetail={showDetailed} />
            </div>

            {/* ── Question by question ─────────────────────────── */}
            <Section id="question-by-question" icon={ListChecks} title="Question by question" hint="Every answer, its score, the feedback, and how it could be stronger.">
                <ul className="space-y-2">
                    {answered.map((t, i) => {
                        const p = r.perQuestion.find((x) => x.index === t.index) || {}; const isOpen = detailed || open === i;
                        return (
                            <li key={t.index} className={`iv-card rounded-2xl border ${isOpen ? 'border-indigo-300 shadow-md shadow-indigo-100' : 'border-slate-200 hover:border-indigo-200'}`}>
                                <button type="button" onClick={() => { setDetailed(false); setOpen(isOpen ? null : i); }} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${scoreTone((p.score ?? 0) * 10)} text-sm font-black text-white`}>{p.score ?? '–'}/10</span>
                                    <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Q{i + 1} · {STAGE_LABEL[t.stage] || t.stage}{t.isFollowUp ? ' · follow-up' : ''}</span><span className="block truncate text-sm font-semibold text-slate-900">{t.question}</span></span>
                                    <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <Collapse open={isOpen}>
                                    <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm">
                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Question</p><p className="text-slate-800">{t.question}</p></div>
                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your answer{t.inputMode === 'voice' ? ' · spoken' : ''}</p><p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">{t.answer}</p>{t.voice?.wpm ? <p className="mt-1 text-[11px] text-slate-400">{t.voice.wordCount} words · {t.voice.wpm} words/min{t.voice.fillerCount ? ` · ${t.voice.fillerCount} filler word${t.voice.fillerCount === 1 ? '' : 's'}` : ''}{t.voice.longPauses ? ` · ${t.voice.longPauses} long pause${t.voice.longPauses === 1 ? '' : 's'}` : ''}</p> : null}</div>
                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</p><p className="font-black text-slate-900">{p.score ?? '–'} / 10</p></div>
                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI feedback</p><p className="text-slate-700">{p.feedback}</p></div>
                                        {p.betterAnswer && <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Better approach</p><p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-slate-700">{p.betterAnswer}</p></div>}
                                    </div>
                                </Collapse>
                            </li>
                        );
                    })}
                </ul>
            </Section>

            {/* ── Plan ─────────────────────────────────────────── */}
            <Section id="next-steps" icon={Route} title="Your next steps" hint="Linked to LMS courses where one teaches the skill.">
                <ol className="stagger space-y-2">
                    {r.plan.map((p, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">{p.title}</p>
                                <p className="text-sm text-slate-600">→ {p.action}</p>
                                {p.courseId && <Link to={`/learn/${p.courseId}`} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"><BookOpen size={13} /> Open course: {p.courseTitle}</Link>}
                            </div>
                        </li>
                    ))}
                </ol>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Link to="/interview/practice" className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50"><ListChecks size={15} /> Practice questions</Link>
                    <Link to="/interview/history" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Award size={15} /> All results</Link>
                </div>
            </Section>

            {/* ── One more round ──────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-violet-100 via-indigo-50 to-violet-100 px-5 py-4 ring-1 ring-indigo-100 sm:px-7">
                <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-500 shadow-sm"><Sprout size={24} /></span>
                    <div>
                        <p className="text-lg font-black text-violet-700">Keep practicing, {firstName}!</p>
                        <p className="text-sm text-slate-600">With consistent practice, you&apos;ll see great improvement in your next interview.</p>
                    </div>
                </div>
                <button type="button" onClick={retake} disabled={starting}
                    className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-base font-black text-white shadow-lg shadow-indigo-300 transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                    <Rocket size={19} /> {starting ? 'Starting…' : 'Try Another Interview'} <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
