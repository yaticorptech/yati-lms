/**
 * "My Bio" — the popup. A large round photo on a soft lavender blob with a
 * sparkle and a heart, then "Hi, I'm <Name>." and the bio as three short
 * first-person paragraphs. Nothing else on it: no bars, no counts.
 */
import { useCallback, useContext, useEffect, useState } from 'react';
import { X, Sparkles, Download, Loader2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { bioApi } from './api';
import BioText from './BioText';
import { ErrorBox } from './ui';

/** The photo on its blob, with the two little accents from the design. */
const Portrait = ({ avatar, name }) => (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]">
        <span aria-hidden="true" className="absolute inset-0 rounded-[46%_54%_58%_42%/52%_44%_56%_48%] bg-gradient-to-br from-violet-100 via-indigo-100 to-violet-200/70" />
        <span aria-hidden="true" className="absolute -left-2 bottom-8 h-28 w-28 rounded-full bg-violet-100/80 blur-sm" />
        {/* sparkle */}
        <svg aria-hidden="true" viewBox="0 0 40 40" className="absolute right-1 top-1 h-10 w-10 text-violet-500">
            <g stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="8" y1="28" x2="14" y2="14" /><line x1="18" y1="32" x2="26" y2="20" /><line x1="24" y1="38" x2="36" y2="34" /></g>
        </svg>
        {/* heart */}
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute bottom-5 left-3 h-7 w-7 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M12 21s-7-4.6-9.3-8.6C.9 9.2 2.6 5 6.5 5c2 0 3.4 1.1 4.2 2.3l1.3 2 1.3-2C14.1 6.1 15.5 5 17.5 5c3.9 0 5.6 4.2 3.8 7.4C19 16.4 12 21 12 21z" />
        </svg>
        <span className="absolute inset-[9%] overflow-hidden rounded-full bg-violet-100 shadow-xl ring-8 ring-white">
            {avatar
                ? <img src={avatar} alt={name} className="h-full w-full object-cover" />
                : <span className="flex h-full w-full items-center justify-center text-7xl font-black text-violet-400">{(name || '?').trim().charAt(0).toUpperCase()}</span>}
        </span>
    </div>
);

export default function BioPopup({ onClose }) {
    const { user: me } = useContext(AuthContext) || {};
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const download = () => { setDownloading(true); setError(null); bioApi.downloadPdf(name).catch(setError).finally(() => setDownloading(false)); };

    const load = useCallback(() => bioApi.full().then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), []);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

    const name = data?.user?.name || me?.name || '';
    const avatar = data?.user?.avatar || me?.profilePicture || '';
    const first = name.split(' ')[0] || '';

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="bio-popup-title" onClick={(e) => e.stopPropagation()} className="rw-pop w-full max-w-4xl overflow-hidden rounded-[28px] bg-gradient-to-br from-white via-white to-violet-50/60 shadow-2xl">
                <div className="flex items-center justify-between border-b border-indigo-100/70 bg-indigo-50/70 px-6 py-4">
                    <h3 id="bio-popup-title" className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900"><Sparkles size={26} className="text-violet-600" /> My Bio</h3>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={download} disabled={downloading || !data}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-60">
                            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download
                        </button>
                        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"><X size={22} /></button>
                    </div>
                </div>

                <div className="grid gap-8 px-6 py-8 sm:px-10 sm:py-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center">
                    <Portrait avatar={avatar} name={name} />
                    <div className="min-w-0">
                        <p className="text-3xl font-light text-slate-700">Hi, I&apos;m</p>
                        <h4 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{first}<span className="text-violet-500">.</span></h4>
                        <span aria-hidden="true" className="mt-4 block h-1 w-20 rounded-full bg-violet-500" />
                        <div className="mt-6">
                            {data === undefined ? (
                                <div className="space-y-3" aria-busy="true"><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-4 w-11/12 rounded" /><div className="skeleton h-4 w-4/5 rounded" /><div className="skeleton h-4 w-2/3 rounded" /></div>
                            ) : !data ? <ErrorBox error={error} onRetry={load} />
                                : <BioText text={data.bio.bio} className="space-y-5 [&>p]:text-[17px] [&>p]:leading-relaxed [&>p]:text-slate-700 sm:[&>p]:text-lg" />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
