/**
 * @description The building blocks the profile's certificate and resume
 *              cards share: an action tile, a feature blurb, and the small
 *              folder-and-document illustration.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Check } from 'lucide-react';

export const Tile = ({ to, onClick, icon: Icon, title, sub, tone, disabled = false }) => {
    const tones = {
        indigo: 'border-indigo-100 bg-indigo-50/60 text-indigo-700 hover:border-indigo-300',
        rose: 'border-rose-100 bg-rose-50/60 text-rose-700 hover:border-rose-300',
        cta: 'border-transparent bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700'
    };
    const cls = `group flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${tones[tone]}`;
    const inner = (
        <>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone === 'cta' ? 'bg-white text-indigo-600' : 'bg-white shadow-sm'}`}><Icon size={18} /></span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{title}</span>
                <span className={`block truncate text-xs ${tone === 'cta' ? 'text-indigo-100' : 'text-slate-500'}`}>{sub}</span>
            </span>
            {tone === 'cta'
                ? <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 transition-transform group-hover:translate-x-0.5"><ArrowRight size={17} /></span>
                : <ChevronRight size={18} className="shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" />}
        </>
    );
    return to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} disabled={disabled} className={cls}>{inner}</button>;
};

export const Feature = ({ icon: Icon, tone, title, children }) => (
    <div className="flex gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-md ${tone}`}><Icon size={17} /></span>
        <div>
            <p className="text-sm font-bold text-slate-800">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{children}</p>
        </div>
    </div>
);

/* A folder with a document and a green tick, built from divs so it is crisp
   at every size and never a broken image. */
export const Artwork = () => (
    <div className="relative h-40 w-52 shrink-0" aria-hidden="true">
        <span className="absolute left-2 top-4 text-indigo-400">✦</span>
        <span className="absolute right-6 top-2 text-lg text-amber-400">✦</span>
        <span className="absolute right-2 top-16 text-fuchsia-300">✦</span>
        <div className="absolute bottom-0 left-6 h-24 w-44 rounded-b-2xl rounded-t-lg bg-gradient-to-b from-teal-300 to-teal-500 shadow-lg" />
        <div className="absolute bottom-10 left-14 h-32 w-28 -rotate-6 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 h-6 w-6 rounded-full bg-violet-200" />
            <div className="space-y-1.5"><div className="h-1.5 w-16 rounded bg-violet-200" /><div className="h-1.5 w-12 rounded bg-slate-200" /><div className="h-1.5 w-14 rounded bg-slate-200" /><div className="h-1.5 w-10 rounded bg-slate-200" /></div>
        </div>
        <div className="absolute bottom-0 left-2 h-20 w-48 rounded-b-2xl bg-gradient-to-b from-teal-400 to-teal-600 shadow-lg" />
        <div className="absolute bottom-2 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-white"><Check size={28} strokeWidth={3} /></div>
    </div>
);
