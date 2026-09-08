/** Every completed mock interview, newest first, with the trend over time. */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, History, ArrowRight, TrendingUp } from 'lucide-react';
import { interviewApi, TYPE_META, fmtDate, scoreTone } from './api';
import Sparkline from '../components/rewards/Sparkline';
import { Section, ErrorBox, Analyzing, Empty } from '../learningbio/ui';

export default function InterviewHistory() {
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const load = useCallback(() => interviewApi.history().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);
    if (data === undefined) return <div className="mx-auto max-w-4xl pb-12"><Analyzing label="Loading your interviews…" /></div>;
    if (!data) return <div className="mx-auto max-w-4xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;
    const rows = data.sessions; const series = [...rows].reverse().map((s) => s.score || 0);
    const best = rows.reduce((m, s) => Math.max(m, s.score || 0), 0);
    const first = series[0]; const last = series[series.length - 1];
    return (
        <div className="mx-auto max-w-4xl space-y-5 pb-12 animate-fade-in">
            <Link to="/interview" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Interview Ready</Link>
            {rows.length > 1 && (
                <Section icon={TrendingUp} title="Your progress" hint={last > first ? `Up ${last - first} points since your first interview.` : 'Keep practising — the next one can be your best.'}>
                    <div className="flex items-center gap-4"><Sparkline values={series} color="#6366f1" width={220} height={56} /><div className="text-sm text-slate-600"><p><span className="text-2xl font-black text-slate-900">{rows.length}</span> interviews</p><p>Best score <span className="font-bold text-slate-900">{best}%</span></p></div></div>
                </Section>
            )}
            <Section icon={History} title="Interview history">
                {!rows.length ? <Empty title="No mock interviews yet">Take your first one from the Interview Ready page.</Empty> : (
                    <ul className="stagger space-y-2">
                        {rows.map((s) => {
                            const m = TYPE_META[s.type] || TYPE_META.full;
                            return (
                                <li key={s.id}>
                                    <Link to={`/interview/report/${s.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40">
                                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${scoreTone(s.score || 0)} text-sm font-black text-white`}>{s.score ?? '–'}%</span>
                                        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900">Mock Interview #{s.number} · {m.label}</span><span className="block text-xs text-slate-500">{fmtDate(s.date)} · {s.questions} questions{s.role ? ` · ${s.role}` : ''}</span></span>
                                        <ArrowRight size={16} className="shrink-0 text-slate-400" />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Section>
        </div>
    );
}
