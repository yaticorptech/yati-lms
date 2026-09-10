/** The personalised practice bank: questions by category, hints, and +XP for practising. */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ListChecks, CheckCircle2, Lightbulb, ChevronDown, Sparkles, ArrowRight } from 'lucide-react';
import { interviewApi, announceProgress } from './api';
import { Section, Btn, ErrorBox, Analyzing } from '../learningbio/ui';
import { Collapse, CountUp } from './ui';

const CATS = [['all', 'All'], ['hr', 'HR'], ['technical', 'Technical'], ['project', 'Projects'], ['behavioral', 'Behavioural'], ['situational', 'Situational']];
const DIFF = { easy: 'bg-emerald-100 text-emerald-700', medium: 'bg-indigo-100 text-indigo-700', hard: 'bg-rose-100 text-rose-700' };

export default function PracticePage() {
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [cat, setCat] = useState('all');
    const [open, setOpen] = useState(null);
    const [busy, setBusy] = useState('');
    const [toast, setToast] = useState('');

    const load = useCallback(() => interviewApi.questions().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);

    const practise = (id) => {
        setBusy(id);
        interviewApi.practice(id).then((r) => {
            setData((d) => ({ ...d, practiced: r.practiced }));
            const xp = (r.events || []).filter((e) => e.kind === 'xp').reduce((a, e) => a + e.amount, 0);
            const badge = (r.events || []).find((e) => e.kind === 'badge');
            setToast(xp ? `+${xp} XP${badge ? ` · badge: ${badge.title}` : ''}` : 'Marked as practised');
            if (xp) announceProgress();
            setTimeout(() => setToast(''), 2500);
        }).catch(setError).finally(() => setBusy(''));
    };

    if (data === undefined) return <div className="mx-auto max-w-4xl pb-12"><Analyzing label="Preparing your questions…" /></div>;
    if (!data) return <div className="mx-auto max-w-4xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;
    const rows = data.questions.filter((q) => cat === 'all' || q.category === cat);
    const done = new Set(data.practiced);
    const pct = data.questions.length ? Math.round((done.size / data.questions.length) * 100) : 0;
    const counts = Object.fromEntries(CATS.map(([id]) => [id, data.questions.filter((q) => (id === 'all' || q.category === id) && !done.has(q.id)).length]));
    const nextUp = rows.find((q) => !done.has(q.id));

    return (
        <div className="mx-auto max-w-4xl space-y-5 pb-12 animate-fade-in">
            <Link to="/interview" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Interview Ready</Link>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200 animate-fade-in-up">
                <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100">Practice bank</p>
                        <p className="text-xl font-black"><CountUp value={done.size} /> of {data.questions.length} practised</p>
                        <p className="mt-0.5 text-xs text-indigo-100">Open a question, think your answer through out loud, then mark it practised for +5 XP.</p>
                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-[width] duration-1000 ease-out" style={{ width: `${pct}%` }} /></div>
                    </div>
                    {nextUp && <Btn onClick={() => { setOpen(nextUp.id); document.getElementById(`pq-${nextUp.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} icon={ArrowRight} className="!border-white/40 !bg-white/15 !text-white hover:!bg-white/25">Practise the next one</Btn>}
                    {!nextUp && <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold">All done here 🎉</span>}
                </div>
            </div>
            <Section icon={ListChecks} title="Practice questions" hint="Pick a category, or work through them in order.">
                <div className="stagger mb-4 flex flex-wrap gap-1.5">
                    {CATS.map(([id, l]) => <button key={id} type="button" onClick={() => setCat(id)} aria-pressed={cat === id} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${cat === id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}{counts[id] ? <span className={`ml-1.5 rounded-full px-1.5 text-[10px] ${cat === id ? 'bg-white/25' : 'bg-white text-slate-500'}`}>{counts[id]}</span> : null}</button>)}
                </div>
                {error && <div className="mb-3"><ErrorBox error={error} /></div>}
                {toast && <p role="status" className="iv-toast mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"><Sparkles size={15} className="text-emerald-500" /> {toast}</p>}
                <ul className="stagger space-y-2">
                    {rows.map((q) => {
                        const isOpen = open === q.id; const isDone = done.has(q.id);
                        return (
                            <li key={q.id} id={`pq-${q.id}`} className={`iv-card rounded-2xl border ${isDone ? 'border-emerald-200 bg-emerald-50/50' : isOpen ? 'border-indigo-300 bg-white shadow-md shadow-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                                <button type="button" onClick={() => setOpen(isOpen ? null : q.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 px-4 py-3 text-left">
                                    <span className={`mt-0.5 shrink-0 ${isDone ? 'iv-check-pop text-emerald-600' : 'text-slate-300'}`}><CheckCircle2 size={18} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{q.topic}</span><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFF[q.difficulty] || DIFF.medium}`}>{q.difficulty}</span></span>
                                        <span className="block text-sm font-semibold text-slate-900">{q.question}</span>
                                    </span>
                                    <ChevronDown size={16} className={`mt-1 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <Collapse open={isOpen}>
                                    <div className="border-t border-slate-100 px-4 py-3">
                                        <p className="flex items-start gap-2 rounded-xl bg-amber-50/70 px-3 py-2 text-sm text-slate-700"><Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" /> {q.hint}</p>
                                        <div className="mt-3 flex items-center justify-between gap-2">
                                            <span className="text-xs text-slate-400">Say your answer out loud — it is the best rehearsal.</span>
                                            {isDone ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} /> Practised</span> : <Btn tone="primary" icon={CheckCircle2} onClick={() => practise(q.id)} loading={busy === q.id} disabled={!isOpen}>I practised this (+5 XP)</Btn>}
                                        </div>
                                    </div>
                                </Collapse>
                            </li>
                        );
                    })}
                </ul>
            </Section>
        </div>
    );
}
