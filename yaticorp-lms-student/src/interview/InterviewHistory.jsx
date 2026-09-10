/** Every completed mock interview, newest first, with the trend over time. */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, History, ArrowRight, TrendingUp, Trophy, Mic } from 'lucide-react';
import { interviewApi, TYPE_META, fmtDate, scoreTone } from './api';
import Sparkline from '../components/rewards/Sparkline';
import { Section, ErrorBox, Analyzing, Empty, Btn } from '../learningbio/ui';
import { CountUp, ScoreRing } from './ui';
import { useNavigate } from 'react-router-dom';

export default function InterviewHistory() {
    const navigate = useNavigate();
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
                    <div className="flex flex-wrap items-center gap-5">
                        <ScoreRing value={last} size={96} stroke={9} label="Latest" />
                        <Sparkline values={series} color="#6366f1" width={220} height={56} />
                        <div className="stagger grid grid-cols-3 gap-2 text-center sm:flex-1">
                            <div className="lift rounded-xl bg-slate-50 px-2 py-2"><p className="text-xl font-black text-slate-900"><CountUp value={rows.length} /></p><p className="text-[11px] font-semibold text-slate-500">Interviews</p></div>
                            <div className="lift rounded-xl bg-slate-50 px-2 py-2"><p className="text-xl font-black text-slate-900"><CountUp value={best} suffix="%" /></p><p className="text-[11px] font-semibold text-slate-500">Best</p></div>
                            <div className={`lift rounded-xl px-2 py-2 ${last - first > 0 ? 'bg-emerald-50' : 'bg-slate-50'}`}><p className={`text-xl font-black ${last - first > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{last - first > 0 ? '+' : ''}<CountUp value={last - first} /></p><p className="text-[11px] font-semibold text-slate-500">Since first</p></div>
                        </div>
                    </div>
                </Section>
            )}
            <Section icon={History} title="Interview history">
                {!rows.length ? (
                    <div className="animate-fade-in-up"><Empty title="No mock interviews yet">Your first one takes about ten minutes and earns 30 XP.</Empty><div className="mt-3 text-center"><Btn tone="primary" icon={Mic} onClick={() => navigate('/interview/mock/new')}>Start my first interview</Btn></div></div>
                ) : (
                    <ul className="stagger space-y-2">
                        {rows.map((s, i) => {
                            const m = TYPE_META[s.type] || TYPE_META.full;
                            const prev = rows[i + 1]; const delta = prev && typeof s.score === 'number' && typeof prev.score === 'number' ? s.score - prev.score : null;
                            const isBest = typeof s.score === 'number' && s.score === best && best > 0;
                            return (
                                <li key={s.id}>
                                    <Link to={`/interview/report/${s.id}`} className={`iv-card flex items-center gap-3 rounded-2xl border px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 ${isBest ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200'}`}>
                                        <span className={`animate-pop-in flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${scoreTone(s.score || 0)} text-sm font-black text-white shadow`}>{s.score ?? '–'}%</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-1.5"><span className="text-sm font-bold text-slate-900">Mock Interview #{s.number} · {m.label}</span>{isBest && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700"><Trophy size={11} /> Best</span>}{delta !== null && delta !== 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{delta > 0 ? '▲ +' : '▼ '}{delta}</span>}</span>
                                            <span className="block text-xs text-slate-500">{fmtDate(s.date)} · {s.questions} questions{s.role ? ` · ${s.role}` : ''}</span>
                                        </span>
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
