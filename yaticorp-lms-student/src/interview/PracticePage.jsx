/** The personalised practice bank: questions by category, with a hint for each. */
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ListChecks, CheckCircle2, Lightbulb, ChevronDown, MessageSquareText } from 'lucide-react';
import { interviewApi } from './api';
import { Section, ErrorBox, Analyzing } from '../learningbio/ui';
import { Collapse } from './ui';
import { markReturn } from './scrollMemory';

const CATS = [['all', 'All'], ['hr', 'HR'], ['technical', 'Technical'], ['project', 'Projects'], ['behavioral', 'Behavioural'], ['situational', 'Situational']];
const DIFF = { easy: 'bg-emerald-100 text-emerald-700', medium: 'bg-indigo-100 text-indigo-700', hard: 'bg-rose-100 text-rose-700' };

export default function PracticePage() {
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [cat, setCat] = useState('all');
    const [open, setOpen] = useState(null);

    const { hash } = useLocation();

    const load = useCallback(() => interviewApi.questions().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);

    // /interview/practice#q-<id> — a question picked on the dashboard — opens
    // that question and brings it into view, instead of the top of the list.
    // An instant jump, not a smooth scroll: the page has only just arrived.
    const linked = hash.startsWith('#q-') ? decodeURIComponent(hash.slice(3)) : null;
    const [shownLink, setShownLink] = useState(null);
    if (data && linked && shownLink !== linked && data.questions.some((q) => q.id === linked)) {
        setShownLink(linked);
        setOpen(linked);
    }
    useEffect(() => {
        if (!shownLink) return;
        const t = setTimeout(() => document.getElementById(`pq-${shownLink}`)?.scrollIntoView({ behavior: 'auto', block: 'center' }), 150);
        return () => clearTimeout(t);
    }, [shownLink]);

    if (data === undefined) return <div className="mx-auto max-w-4xl pb-12"><Analyzing label="Preparing your questions…" /></div>;
    if (!data) return <div className="mx-auto max-w-4xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;
    const rows = data.questions.filter((q) => cat === 'all' || q.category === cat);
    const done = new Set(data.practiced);
    // Every question in each category. These used to leave out the practised
    // ones, so "All" read 19 beside a header saying 20.
    const counts = Object.fromEntries(CATS.map(([id]) => [id, data.questions.filter((q) => id === 'all' || q.category === id).length]));

    return (
        <div className="mx-auto max-w-4xl space-y-5 pb-12 animate-fade-in">
            <Link to="/interview" onClick={markReturn} className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Interview</Link>
            {/* What the bank holds. It used to be a "1 of 20 practised" tally
                with a progress bar and a "Practise the next one" button, but
                questions are no longer marked practised, so that tally could
                never move. */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200 animate-fade-in-up sm:p-6">
                <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex items-start gap-4">
                    <span aria-hidden="true" className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 sm:flex"><MessageSquareText size={22} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100">Practice bank</p>
                        <p className="text-xl font-black sm:text-2xl">{data.questions.length} question{data.questions.length === 1 ? '' : 's'} to rehearse</p>
                        <p className="mt-1 text-sm text-indigo-100">Open a question, read the hint, and think your answer through out loud.</p>
                    </div>
                </div>
            </div>
            <Section icon={ListChecks} title="Practice questions" hint="Pick a category, or work through them in order.">
                {/* One row that scrolls sideways on a phone rather than
                    wrapping onto three lines; a category with no questions has
                    no tab, since it would only open an empty list. */}
                <div className="stagger -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                    {CATS.filter(([id]) => id === 'all' || counts[id] > 0).map(([id, l]) => <button key={id} type="button" onClick={() => setCat(id)} aria-pressed={cat === id} className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-all ${cat === id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}{counts[id] ? <span className={`ml-1.5 rounded-full px-1.5 text-[10px] ${cat === id ? 'bg-white/25' : 'bg-white text-slate-500'}`}>{counts[id]}</span> : null}</button>)}
                </div>
                {error && <div className="mb-3"><ErrorBox error={error} /></div>}
                <ul className="stagger space-y-2">
                    {rows.map((q, i) => {
                        const isOpen = open === q.id; const isDone = done.has(q.id);
                        return (
                            <li key={q.id} id={`pq-${q.id}`} className={`iv-card rounded-2xl border ${isDone ? 'border-emerald-200 bg-emerald-50/50' : isOpen ? 'border-indigo-300 bg-white shadow-md shadow-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                                <button type="button" onClick={() => setOpen(isOpen ? null : q.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 px-4 py-3 text-left">
                                    {/* Its place in the list; a question practised
                                        before this change keeps its green tick. */}
                                    {isDone
                                        ? <span className="mt-0.5 shrink-0 text-emerald-600" aria-label="Practised"><CheckCircle2 size={20} /></span>
                                        : <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black tabular-nums ${isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>}
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{q.topic}</span><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFF[q.difficulty] || DIFF.medium}`}>{q.difficulty}</span></span>
                                        <span className="block text-sm font-semibold text-slate-900">{q.question}</span>
                                    </span>
                                    <ChevronDown size={16} className={`mt-1 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <Collapse open={isOpen}>
                                    <div className="border-t border-slate-100 px-4 py-3">
                                        <p className="flex items-start gap-2 rounded-xl bg-amber-50/70 px-3 py-2 text-sm text-slate-700"><Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" /> {q.hint}</p>
                                        {/* No "I practised this" button any more; a question
                                            practised earlier keeps its tag. */}
                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                            <span className="min-w-0 flex-1 basis-48 text-xs text-slate-400">Say your answer out loud — it is the best rehearsal.</span>
                                            {isDone && <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} /> Practised</span>}
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
