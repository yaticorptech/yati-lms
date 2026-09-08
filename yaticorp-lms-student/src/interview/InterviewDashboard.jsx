/**
 * Interview Ready — the dashboard: readiness and its five parts, the mock
 * interview picker, recommended topics, a taste of the practice bank,
 * recent results and what to work on.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Sparkles, Target, ListChecks, History, TrendingUp, ArrowRight, Play, Award, Lightbulb } from 'lucide-react';
import { interviewApi, TYPE_META, fmtDate } from './api';
import ScoreBar from './ScoreBar';
import Sparkline from '../components/rewards/Sparkline';
import { Section, Btn, ErrorBox, Analyzing } from '../learningbio/ui';

export default function InterviewDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [type, setType] = useState('full');
    const [role, setRole] = useState('');
    const [starting, setStarting] = useState(false);

    const load = useCallback(() => interviewApi.dashboard().then((d) => { setData(d); setRole((r) => r || d.student.goal || ''); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);

    // The interview itself starts from the introduction screen, after the microphone is explained and requested.
    const start = () => { setStarting(true); navigate(`/interview/mock/new?type=${encodeURIComponent(type)}&role=${encodeURIComponent(role)}`); };

    if (data === undefined) return <div className="mx-auto max-w-5xl pb-12"><Analyzing label="Checking your interview readiness…" /></div>;
    if (!data) return <div className="mx-auto max-w-5xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;
    const r = data.readiness;
    const last = r.history[r.history.length - 1];

    return (
        <div className="mx-auto max-w-5xl space-y-5 pb-12 animate-fade-in">
            {/* ── Hero: readiness ─────────────────────────────────── */}
            <header className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-500 p-6 text-white shadow-lg shadow-indigo-200 sm:p-8">
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100">🎤 Interview Ready</p>
                        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Hi {data.student.firstName}, let&apos;s get you interview-ready{data.student.goal ? ` for ${data.student.goal}` : ''}.</h1>
                        <p className="mt-2 max-w-xl text-sm text-indigo-100">Learn, practise, take an AI mock interview, read your feedback, improve, and retake. Every round earns XP.</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {data.activeSession && <Btn tone="primary" icon={Play} onClick={() => navigate(`/interview/mock/${data.activeSession.id}`)} className="!bg-white !text-indigo-700 !shadow-none hover:!bg-indigo-50">Resume interview ({data.activeSession.answered} answered)</Btn>}
                            <Link to="/interview/practice" className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/15 px-3.5 py-2 text-sm font-bold text-white hover:bg-white/25"><ListChecks size={15} /> Practice questions</Link>
                            <Link to="/interview/history" className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/15 px-3.5 py-2 text-sm font-bold text-white hover:bg-white/25"><History size={15} /> History</Link>
                        </div>
                    </div>
                    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                        <div className="flex items-end justify-between">
                            <p className="text-sm font-semibold text-indigo-100">Interview Readiness</p>
                            <p className="text-4xl font-black tabular-nums leading-none">{r.overall}%</p>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-[width] duration-1000" style={{ width: `${r.overall}%` }} /></div>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-indigo-50"><Award size={13} /> {r.badge.earned ? 'Interview Ready badge earned!' : `Reach ${r.badge.threshold}% for the Interview Ready badge`}</p>
                    </div>
                </div>
            </header>

            {error && <ErrorBox error={error} onRetry={load} />}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {/* ── Breakdown ────────────────────────────────────── */}
                <Section icon={TrendingUp} title="Your readiness" hint="From your courses, skills, assessments, projects and past interviews.">
                    <div className="space-y-3">{r.breakdown.map((b) => <ScoreBar key={b.key} label={b.label} value={b.value} />)}</div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        {[['Practised', `${r.prep.practiced}/${r.prep.total}`], ['Mock interviews', r.prep.mocks], ['Best score', r.best ? `${r.best}%` : '—']].map(([l, v]) => (
                            <div key={l} className="rounded-xl bg-slate-50 px-2 py-2"><p className="text-lg font-black text-slate-900">{v}</p><p className="text-[11px] font-semibold text-slate-500">{l}</p></div>
                        ))}
                    </div>
                </Section>

                {/* ── Start a mock interview ───────────────────────── */}
                <Section icon={Mic} title="Take a mock interview" hint="The AI interviewer asks about your real skills and projects, and follows up on your answers.">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {Object.entries(TYPE_META).map(([id, m]) => (
                            <button key={id} type="button" onClick={() => setType(id)} aria-pressed={type === id}
                                className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${type === id ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white'} ${id === 'full' ? 'sm:col-span-2' : ''}`}>
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${m.tone} text-lg text-white shadow`} aria-hidden="true">{m.emoji}</span>
                                <span className="min-w-0"><span className="block text-sm font-bold text-slate-900">{m.label}</span><span className="block text-xs text-slate-500">{m.hint}</span></span>
                            </button>
                        ))}
                    </div>
                    <label className="mt-3 block">
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Job role</span>
                        <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="e.g. Full Stack Developer" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    </label>
                    <Btn tone="primary" icon={Mic} onClick={start} loading={starting} className="mt-4 w-full">Start Mock Interview</Btn>
                    <p className="mt-2 text-center text-[11px] text-slate-400">{data.ai.configured ? 'A voice interview: the AI interviewer speaks, you answer out loud.' : 'AI is not configured; the built-in interviewer will run the voice interview.'}</p>
                </Section>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                {/* ── Topics ──────────────────────────────────────── */}
                <Section icon={Target} title="Recommended topics" hint="Based on what you are learning and building.">
                    <ul className="stagger space-y-2">
                        {data.topics.map((t) => (
                            <li key={t.topic} className="rounded-xl border border-slate-200 px-3 py-2"><p className="text-sm font-bold text-slate-900">{t.topic}</p><p className="text-xs text-slate-500">{t.reason}</p></li>
                        ))}
                    </ul>
                </Section>

                {/* ── Practice preview ───────────────────────────── */}
                <Section icon={ListChecks} title="Practice questions" hint={`${data.practice.practiced} of ${data.practice.total} practised · +5 XP each`}>
                    <ul className="stagger space-y-2">
                        {data.practice.sample.map((q) => (
                            <li key={q.id} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{q.topic}</p><p className="text-sm font-semibold text-slate-800">{q.question}</p></li>
                        ))}
                        {!data.practice.sample.length && <li className="text-sm text-slate-500">You have practised every question. Take a mock interview!</li>}
                    </ul>
                    <Link to="/interview/practice" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline">Open the practice bank <ArrowRight size={14} /></Link>
                </Section>

                {/* ── Results & improvement ──────────────────────── */}
                <Section icon={Lightbulb} title="Areas to improve" hint={last ? `Last interview: ${last.score}% on ${fmtDate(last.date)}` : 'Take your first mock interview to get feedback.'}>
                    {r.history.length > 1 && <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2"><Sparkline values={r.history.map((h) => h.score || 0)} color="#6366f1" width={120} height={32} /><p className="text-xs text-slate-600"><span className="font-bold text-slate-900">{r.history.length} interviews</span> · best {r.best}%</p></div>}
                    <ul className="space-y-2">
                        {r.areas.map((a, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><Sparkles size={14} className="mt-0.5 shrink-0 text-amber-500" /> {a}</li>)}
                    </ul>
                    {last && <Link to={`/interview/report/${last.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline">Read the last report <ArrowRight size={14} /></Link>}
                </Section>
            </div>
        </div>
    );
}
