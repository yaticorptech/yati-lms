/** The personalised practice bank: questions by category, hints, and +XP for practising. */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ListChecks, CheckCircle2, Lightbulb, ChevronDown } from 'lucide-react';
import { interviewApi, announceProgress } from './api';
import { Section, Btn, ErrorBox, Analyzing } from '../learningbio/ui';

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

    return (
        <div className="mx-auto max-w-4xl space-y-5 pb-12 animate-fade-in">
            <Link to="/interview" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Interview Ready</Link>
            <Section icon={ListChecks} title="Practice questions" hint={`${done.size} of ${data.questions.length} practised · Open a question, think through your answer, then mark it practised for +5 XP.`}>
                <div className="mb-4 flex flex-wrap gap-1.5">
                    {CATS.map(([id, l]) => <button key={id} type="button" onClick={() => setCat(id)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${cat === id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>)}
                </div>
                {error && <div className="mb-3"><ErrorBox error={error} /></div>}
                {toast && <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 animate-fade-in">🎉 {toast}</p>}
                <ul className="stagger space-y-2">
                    {rows.map((q) => {
                        const isOpen = open === q.id; const isDone = done.has(q.id);
                        return (
                            <li key={q.id} className={`rounded-2xl border transition-colors ${isDone ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                                <button type="button" onClick={() => setOpen(isOpen ? null : q.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 px-4 py-3 text-left">
                                    <span className={`mt-0.5 shrink-0 ${isDone ? 'text-emerald-600' : 'text-slate-300'}`}><CheckCircle2 size={18} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{q.topic}</span><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFF[q.difficulty] || DIFF.medium}`}>{q.difficulty}</span></span>
                                        <span className="block text-sm font-semibold text-slate-900">{q.question}</span>
                                    </span>
                                    <ChevronDown size={16} className={`mt-1 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && (
                                    <div className="border-t border-slate-100 px-4 py-3">
                                        <p className="flex items-start gap-2 text-sm text-slate-700"><Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" /> {q.hint}</p>
                                        <div className="mt-3 flex justify-end">{isDone ? <span className="text-xs font-bold text-emerald-700">Practised ✓</span> : <Btn tone="primary" icon={CheckCircle2} onClick={() => practise(q.id)} loading={busy === q.id}>I practised this (+5 XP)</Btn>}</div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </Section>
        </div>
    );
}
