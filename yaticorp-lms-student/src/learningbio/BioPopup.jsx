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
    <div className="relative mx-auto aspect-square w-full max-w-[160px] sm:max-w-[240px] md:max-w-[340px]">
        <span aria-hidden="true" className="absolute inset-0 rounded-[46%_54%_58%_42%/52%_44%_56%_48%] bg-gradient-to-br from-violet-100 via-indigo-100 to-violet-200/70" />
        <span aria-hidden="true" className="absolute -left-2 bottom-6 h-14 w-14 rounded-full bg-violet-100/80 blur-sm sm:bottom-8 sm:h-28 sm:w-28" />
        {/* sparkle */}
        <svg aria-hidden="true" viewBox="0 0 40 40" className="absolute right-1 top-1 h-6 w-6 text-violet-500 sm:h-10 sm:w-10">
            <g stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="8" y1="28" x2="14" y2="14" /><line x1="18" y1="32" x2="26" y2="20" /><line x1="24" y1="38" x2="36" y2="34" /></g>
        </svg>
        {/* heart */}
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute bottom-4 left-2 h-4 w-4 text-indigo-400 sm:bottom-5 sm:left-3 sm:h-7 sm:w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M12 21s-7-4.6-9.3-8.6C.9 9.2 2.6 5 6.5 5c2 0 3.4 1.1 4.2 2.3l1.3 2 1.3-2C14.1 6.1 15.5 5 17.5 5c3.9 0 5.6 4.2 3.8 7.4C19 16.4 12 21 12 21z" />
        </svg>
        <span className="absolute inset-[9%] overflow-hidden rounded-full bg-violet-100 shadow-xl ring-4 ring-white sm:ring-8">
            {avatar
                ? <img src={avatar} alt={name} className="h-full w-full object-cover" />
                : <span className="flex h-full w-full items-center justify-center text-4xl font-black text-violet-400 sm:text-6xl md:text-7xl">{(name || '?').trim().charAt(0).toUpperCase()}</span>}
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
            <div role="dialog" aria-modal="true" aria-labelledby="bio-popup-title" onClick={(e) => e.stopPropagation()} className="rw-pop flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-gradient-to-br from-white via-white to-violet-50/60 shadow-2xl">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-indigo-100/70 bg-indigo-50/70 px-4 py-3 sm:px-6 sm:py-4">
                    <h3 id="bio-popup-title" className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900 sm:gap-3 sm:text-2xl"><Sparkles size={20} className="shrink-0 text-violet-600 sm:h-[26px] sm:w-[26px]" /> My Bio</h3>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={download} disabled={downloading || !data}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-60">
                            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download
                        </button>
                        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"><X size={22} /></button>
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5 sm:gap-8 sm:px-10 sm:py-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center">
                    <Portrait avatar={avatar} name={name} />
                    <div className="min-w-0">
                        <p className="text-xl font-light text-slate-700 sm:text-3xl">Hi, I&apos;m</p>
                        <h4 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">{first}<span className="text-violet-500">.</span></h4>
                        <span aria-hidden="true" className="mt-2.5 block h-1 w-14 rounded-full bg-violet-500 sm:mt-4 sm:w-20" />
                        <div className="mt-4 sm:mt-6">
                            {data === undefined ? (
                                <div className="space-y-3" aria-busy="true"><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-4 w-11/12 rounded" /><div className="skeleton h-4 w-4/5 rounded" /><div className="skeleton h-4 w-2/3 rounded" /></div>
                            ) : !data ? <ErrorBox error={error} onRetry={load} />
                                : <BioText text={data.bio.bio} className="space-y-3 [&>p]:text-[14px] [&>p]:leading-relaxed [&>p]:text-slate-700 sm:space-y-5 sm:[&>p]:text-[17px] md:[&>p]:text-lg" />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
