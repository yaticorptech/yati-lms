/**
 * Quiz Arena in the Competitions section: every contest a student may enter
 * — open for registration, starting soon, live, and finished — each opening
 * its own page (ArenaDetail.jsx).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, CalendarClock, Users, Timer, ChevronRight } from 'lucide-react';
import { arenaApi, STATE, ROUND_NAMES, fmt, duration } from './api';

export const ArenaCard = ({ c }) => {
    const [label, cls] = STATE[c.state] || [c.state, 'bg-slate-100 text-slate-600 ring-slate-200'];
    return (
        <Link to={`/competitions/arena/${c.id}`} data-arena={c.id} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="relative h-24 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
                {c.bannerUrl && <img src={c.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${cls}`}>{label}</span>
                {c.entryStatus && <span className={`absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold ${c.entryStatus === 'approved' ? 'text-emerald-700' : c.entryStatus === 'pending' ? 'text-amber-700' : 'text-rose-700'}`}>{c.entryStatus === 'approved' ? 'You are in' : c.entryStatus === 'pending' ? 'Entry pending' : 'Not approved'}</span>}
            </div>
            <div className="flex flex-1 flex-col p-4">
                <h3 className="font-black leading-tight text-slate-900">{c.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{c.rounds.map((r) => ROUND_NAMES[r.round]).join(' · ')}</p>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1"><CalendarClock size={13} aria-hidden="true" /> {fmt(c.startsAt)}</span>
                    <span className="inline-flex items-center gap-1"><Timer size={13} aria-hidden="true" /> {c.questions} questions · {duration(c.durationMs)}</span>
                    <span className="inline-flex items-center gap-1"><Users size={13} aria-hidden="true" /> {c.registeredCount} entered</span>
                </p>
                {c.myResult && <p className="mt-2 text-sm font-bold text-indigo-700">You finished #{c.myResult.rank} with {c.myResult.score} points</p>}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-700">Open <ChevronRight size={15} aria-hidden="true" /></span>
            </div>
        </Link>
    );
};

export default function ArenaHome() {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => { arenaApi.list().then(setRows).catch((e) => setError(e.message)); }, []);
    const order = ['live', 'registration', 'upcoming', 'ended', 'results', 'cancelled'];
    const sorted = rows ? [...rows].sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state)) : null;
    return (
        <div className="space-y-4 pb-10">
            <Link to="/competitions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} aria-hidden="true" /> Competitions</Link>
            <header className="rounded-[22px] bg-gradient-to-br from-[#2d2693] via-[#4f3fd8] to-[#a21caf] p-5 text-white shadow-lg sm:p-7">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90"><Brain size={16} aria-hidden="true" /> Three rounds · one clock · everyone at once</p>
                <h1 className="mt-1.5 text-3xl font-black">Quiz Arena</h1>
                <p className="mt-1.5 max-w-2xl text-sm text-white/90">Live Quiz Battle, Picture Challenge and Current Affairs Clash. Your college coordinator enters you; once approved, join at the start time and answer the same questions as every other student, live.</p>
            </header>
            {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
            {!rows && !error && <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="skeleton h-48 rounded-3xl" />)}</div>}
            {rows?.length === 0 && <p className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No Quiz Arena right now. Check back soon.</p>}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sorted?.map((c) => <ArenaCard key={c.id} c={c} />)}</div>
        </div>
    );
}
