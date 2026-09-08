/** The report: overall score, six dimensions, strengths, improvements, feedback, every question reviewed, and the plan. */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Award, ThumbsUp, TrendingUp, MessageSquare, ListChecks, Route, RotateCcw, ChevronDown, BookOpen, Sparkles, Mic, Lightbulb, FileText, Target } from 'lucide-react';
import { interviewApi, TYPE_META, STAGE_LABEL, fmtDate, scoreTone } from './api';
import ScoreBar from './ScoreBar';
import { Section, Btn, ErrorBox, Analyzing } from '../learningbio/ui';

const LABEL = { communication: 'Communication', technical: 'Technical Knowledge', answerQuality: 'Answer Quality', problemSolving: 'Problem Solving', confidence: 'Confidence', relevance: 'Relevance' };

export default function InterviewReport() {
    const { id } = useParams();
    const navigate = useNavigate();
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

    return (
        <div className="mx-auto max-w-4xl space-y-5 pb-12 animate-fade-in">
            <Link to="/interview" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Interview Ready</Link>

            {/* ── Overall ─────────────────────────────────────── */}
            <header className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${scoreTone(r.overall)} p-6 text-white shadow-lg sm:p-8`}>
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">{meta.emoji} {meta.label} · {fmtDate(s.completedAt)}</p>
                        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Your Interview Report</h1>
                        <p className="mt-2 max-w-xl text-sm text-white/90">{r.feedback}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                            {xpTotal > 0 && <span className="rounded-full bg-white/20 px-3 py-1">+{xpTotal} XP earned</span>}
                            {r.improvedBy > 0 && <span className="rounded-full bg-white/20 px-3 py-1">▲ {r.improvedBy} points over your best</span>}
                            {s.xp?.challenge > 0 && <span className="rounded-full bg-white/20 px-3 py-1">🏆 Weekly challenge complete</span>}
                        </div>
                    </div>
                    <div className="animate-pop-in flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white/20 ring-8 ring-white/20 sm:h-36 sm:w-36">
                        <p className="text-4xl font-black leading-none sm:text-5xl">{r.overall}</p>
                        <p className="text-xs font-bold text-white/80">out of 100</p>
                    </div>
                </div>
            </header>

            {error && <ErrorBox error={error} />}

            <div className="grid gap-5 md:grid-cols-2">
                <Section icon={TrendingUp} title="Scores">
                    <div className="space-y-3">{Object.entries(LABEL).map(([k, l]) => <ScoreBar key={k} label={l} value={r.scores?.[k] ?? 0} />)}</div>
                </Section>
                <div className="space-y-5">
                    <Section icon={ThumbsUp} title="What you did well"><ul className="stagger space-y-2">{r.strengths.map((t, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="mt-0.5 text-emerald-500">✓</span> {t}</li>)}</ul></Section>
                    <Section icon={Sparkles} title="Areas to improve"><ul className="stagger space-y-2">{r.improvements.map((t, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="mt-0.5 text-amber-500">→</span> {t}</li>)}</ul></Section>
                </div>
            </div>

            {/* ── Delivery + recommendation ────────────────────── */}
            <div className="grid gap-5 md:grid-cols-2">
                <Section icon={Mic} title="How you sounded" hint="Measured from your spoken answers: pace, pauses, filler words and length. No guesses about mood or personality.">
                    {r.communication?.notes?.length ? (
                        <ul className="stagger space-y-2">{r.communication.notes.map((n, i) => <li key={i} className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${n.tone === 'good' ? 'bg-emerald-50 text-emerald-900' : n.tone === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}><span className="mt-0.5 shrink-0">{n.tone === 'good' ? '✓' : n.tone === 'warn' ? '•' : 'ℹ'}</span> {n.text}</li>)}</ul>
                    ) : <p className="text-sm text-slate-500">No delivery data for this interview.</p>}
                    {r.communication?.wpm ? <p className="mt-3 text-xs text-slate-500">Average pace {r.communication.wpm} words/min · {r.communication.voiceAnswers} of {r.communication.answers} answers spoken</p> : null}
                </Section>
                <Section icon={Lightbulb} title="AI recommendation">
                    <p className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-[15px] font-semibold leading-relaxed text-indigo-900">“{r.recommendation || (r.plan[0] ? `${r.plan[0].action} before attempting your next mock interview.` : 'Take another mock interview to keep the momentum going.')}”</p>
                    <div className="mt-4 grid gap-2">
                        <Btn tone="primary" icon={Target} onClick={() => navigate(practiceTarget ? `/learn/${practiceTarget.courseId}` : '/interview/practice')}>Practice Recommended Skills</Btn>
                        <Btn icon={RotateCcw} onClick={retake} loading={starting}>Retake Mock Interview</Btn>
                        <Btn icon={FileText} onClick={showDetailed}>View Detailed Report</Btn>
                    </div>
                </Section>
            </div>

            {/* ── Question by question ─────────────────────────── */}
            <Section id="question-by-question" icon={ListChecks} title="Question by question" hint="Every answer, its score, the feedback, and how it could be stronger.">
                <ul className="space-y-2">
                    {answered.map((t, i) => {
                        const p = r.perQuestion.find((x) => x.index === t.index) || {}; const isOpen = detailed || open === i;
                        return (
                            <li key={t.index} className="rounded-2xl border border-slate-200">
                                <button type="button" onClick={() => { setDetailed(false); setOpen(isOpen ? null : i); }} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${scoreTone((p.score ?? 0) * 10)} text-sm font-black text-white`}>{p.score ?? '–'}/10</span>
                                    <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Q{i + 1} · {STAGE_LABEL[t.stage] || t.stage}{t.isFollowUp ? ' · follow-up' : ''}</span><span className="block truncate text-sm font-semibold text-slate-900">{t.question}</span></span>
                                    <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && (
                                    <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm">
                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Question</p><p className="text-slate-800">{t.question}</p></div>
                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your answer{t.inputMode === 'voice' ? ' · spoken' : ''}</p><p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">{t.answer}</p>{t.voice?.wpm ? <p className="mt-1 text-[11px] text-slate-400">{t.voice.wordCount} words · {t.voice.wpm} words/min{t.voice.fillerCount ? ` · ${t.voice.fillerCount} filler word${t.voice.fillerCount === 1 ? '' : 's'}` : ''}{t.voice.longPauses ? ` · ${t.voice.longPauses} long pause${t.voice.longPauses === 1 ? '' : 's'}` : ''}</p> : null}</div>
                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</p><p className="font-black text-slate-900">{p.score ?? '–'} / 10</p></div>
                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI feedback</p><p className="text-slate-700">{p.feedback}</p></div>
                                        {p.betterAnswer && <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Better approach</p><p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-slate-700">{p.betterAnswer}</p></div>}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </Section>

            {/* ── Plan ─────────────────────────────────────────── */}
            <Section icon={Route} title="Your next steps" hint="Linked to LMS courses where one teaches the skill.">
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
                    <Btn tone="primary" icon={RotateCcw} onClick={retake} loading={starting}>Retake this interview</Btn>
                    <Link to="/interview/practice" className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50"><ListChecks size={15} /> Practice questions</Link>
                    <Link to="/interview/history" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Award size={15} /> All results</Link>
                </div>
            </Section>
        </div>
    );
}
