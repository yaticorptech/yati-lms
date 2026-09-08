/**
 * ✨ My Learning Bio — the dashboard card. The short version only: avatar,
 * name, headline, a two-sentence bio, strength, the five counts, the top
 * three skills and the latest achievement. The full page has the rest.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, Brain, Award, Rocket, Trophy, ArrowRight, PenLine, RefreshCw } from 'lucide-react';
import { bioApi, STATUS_TONE } from './api';
import BioStrength from './BioStrength';
import BioEditor from './BioEditor';
import { Avatar, ErrorBox, Analyzing } from './ui';

const Stat = ({ icon: Icon, value, label, tone }) => (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${tone}`}>
        <Icon size={16} className="shrink-0" />
        <span className="text-lg font-black tabular-nums leading-none">{value}</span>
        <span className="text-xs font-semibold">{label}</span>
    </div>
);

export default function LearningBioCard() {
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(() => bioApi.summary().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => {
        load();
        // Any learning event the rewards layer announces re-reads the bio.
        window.addEventListener('yati:progress-changed', load);
        return () => window.removeEventListener('yati:progress-changed', load);
    }, [load]);

    const refresh = () => { setRefreshing(true); bioApi.refresh().then(() => load()).catch(setError).finally(() => setRefreshing(false)); };

    return (
        <section id="learning-bio" className="lift relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6 animate-fade-in-up">
            <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-100 via-violet-100 to-transparent blur-2xl" />
            <div className="relative mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900"><Sparkles size={22} className="text-violet-600" /> My Learning Bio</h2>
                {data && (
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={refresh} disabled={refreshing} aria-label="Refresh learning data" title="Refresh learning data" className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /></button>
                        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-indigo-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50"><PenLine size={14} /> Edit</button>
                    </div>
                )}
            </div>

            {data === undefined ? <Analyzing /> : error && !data ? <ErrorBox error={error} onRetry={load} /> : (
                <div className="relative">
                    <div className="flex items-start gap-4">
                        <Avatar src={data.user.avatar} name={data.user.name} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-lg font-black text-slate-900">{data.user.name}</p>
                            {data.bio.headline && <p className="truncate text-sm font-semibold text-indigo-700">{data.bio.headline}</p>}
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">“{data.bio.short}”</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                                {data.bio.source === 'custom' ? 'Written by you' : data.bio.isMock ? 'Written from your learning data' : 'AI-written from your learning data'}{data.bio.stale ? ' · updating soon' : ''}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4"><BioStrength percent={data.strength.percent} compact /></div>
                    <p className="mt-1.5 text-xs text-slate-500">{data.strength.nextStep}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                        <Stat icon={BookOpen} value={data.stats.courses} label="Courses" tone="border-indigo-100 bg-indigo-50/70 text-indigo-800" />
                        <Stat icon={Brain} value={data.stats.skills} label="Skills" tone="border-sky-100 bg-sky-50/70 text-sky-800" />
                        <Stat icon={Award} value={data.stats.certificates} label="Certificates" tone="border-amber-100 bg-amber-50/70 text-amber-800" />
                        <Stat icon={Rocket} value={data.stats.projects} label="Projects" tone="border-emerald-100 bg-emerald-50/70 text-emerald-800" />
                        <Stat icon={Trophy} value={data.stats.achievements} label="Achievements" tone="border-rose-100 bg-rose-50/70 text-rose-800" />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                        {data.topSkills?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Top skills</span>
                                {data.topSkills.map((s) => <span key={s.name} className={`rounded-lg px-2 py-0.5 text-xs font-bold ${(STATUS_TONE[s.status] || STATUS_TONE.Learning).chip}`}>{s.name}</span>)}
                            </div>
                        )}
                        {data.recentAchievement && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"><span aria-hidden="true">{data.recentAchievement.emoji}</span> {data.recentAchievement.title}</span>
                        )}
                    </div>

                    <Link to="/learning-bio" className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                        View Full Bio <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            )}

            {editing && data && <BioEditor bio={{ ai: { headline: data.bio.headline, bio: '' }, custom: { headline: '', bio: '' }, useCustom: data.bio.source === 'custom' }} onSave={(body) => bioApi.saveBio(body).then(() => load())} onClose={() => setEditing(false)} />}
        </section>
    );
}
