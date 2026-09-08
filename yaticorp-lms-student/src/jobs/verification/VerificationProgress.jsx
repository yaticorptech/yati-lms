/**
 * Identity → LinkedIn → Resume → Profile → Jobs, minus whatever the admin
 * switched off. Done stops are ticks you can click to look back; the current
 * one is filled; later ones are inert — nobody skips ahead.
 */
import { Check, ShieldCheck, Linkedin, FileText, MapPin, Briefcase } from 'lucide-react';
const ALL = [
    { id: 'identity', label: 'Identity', icon: ShieldCheck, need: 'requireAadhaar', done: (s) => s.identity?.status === 'VERIFIED' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, need: 'requireLinkedin', done: (s) => s.linkedin?.status === 'ADDED' },
    { id: 'resume', label: 'Resume', icon: FileText, need: 'requireResume', done: (s) => s.resume?.status === 'ADDED' },
    { id: 'profile', label: 'Profile', icon: MapPin, need: 'requireProfile', done: (s) => s.profile?.status === 'COMPLETED' },
    { id: 'jobs', label: 'Jobs', icon: Briefcase, need: null, done: () => false }
];
const stopsFor = (view) => ALL.filter((st) => !st.need || view?.requirements?.[st.need] !== false);
export default function VerificationProgress({ view, current, onSelect }) {
    const s = view?.steps || {}; const stops = stopsFor(view);
    const done = (st) => (st.id === 'jobs' ? !!view?.canAccessJobs : st.done(s));
    return (
        <nav aria-label="Verification progress" className="mx-auto max-w-lg">
            <ol className="flex items-start justify-between gap-1 sm:gap-2">
                {stops.map((stop, i) => {
                    const d = done(stop), active = current === stop.id, clickable = d && !active && stop.id !== 'jobs' && onSelect; const Icon = stop.icon;
                    return (
                        <li key={stop.id} className="relative flex flex-1 flex-col items-center">
                            {i < stops.length - 1 && <span aria-hidden="true" className={`absolute left-1/2 top-5 h-0.5 w-full -translate-y-1/2 transition-colors duration-500 ${d ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                            <button type="button" onClick={clickable ? () => onSelect(stop.id) : undefined} disabled={!clickable} aria-current={active ? 'step' : undefined} aria-label={`${stop.label}${d ? ', completed' : active ? ', current step' : ''}`}
                                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${active ? 'scale-110 border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-300 ring-4 ring-indigo-100' : d ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-slate-400'} ${clickable ? 'cursor-pointer hover:ring-4 hover:ring-emerald-100' : 'cursor-default'}`}>
                                {d && !active ? <Check size={18} strokeWidth={3} /> : <Icon size={17} />}
                            </button>
                            <span className={`mt-2 text-[10px] font-bold uppercase tracking-wider sm:text-xs ${active ? 'text-indigo-700' : d ? 'text-emerald-700' : 'text-slate-400'}`}>{stop.label}</span>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
