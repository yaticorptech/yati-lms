/**
 * "Not enough in your wallet", for every priced thing in the LMS at once.
 *
 * The API clients announce a 402 (see utils/walletCharge); this listens and
 * says what it costs and what is in the wallet. XP does not turn into wallet
 * money (2026-10-26): the balance is the starting credit and what an
 * administrator adds. Mounted once, in the student layout.
 */
import { useEffect, useState } from 'react';
import { Wallet, X, Info } from 'lucide-react';
import Portal from '../Portal';
import useBackClose from '../../native/useBackClose';
import { money } from './format';

export default function WalletShortDialog() {
    const [short, setShort] = useState(null);

    useEffect(() => {
        const onShort = (e) => setShort(e.detail || {});
        window.addEventListener('yati:wallet-short', onShort);
        return () => window.removeEventListener('yati:wallet-short', onShort);
    }, []);

    useEffect(() => {
        if (!short) return undefined;
        const onKey = (e) => e.key === 'Escape' && setShort(null);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [short]);
    // Android's back button closes the dialog, as Escape does, rather than
    // leaving the page the student was trying to use.
    useBackClose(() => setShort(null), !!short);

    if (!short) return null;

    const cur = short.currency || 'INR';
    // The server's sentence (older servers ended it with an "Earn XP" hint: dropped).
    const what = String(short.message || '').replace(/\s*Earn XP on Career Path[^.]*\.?\s*$/, '');

    return (
        <Portal>
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Not enough wallet balance"
                onMouseDown={(e) => e.target === e.currentTarget && setShort(null)}>
                <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl">
                    <button type="button" onClick={() => setShort(null)} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600"><Wallet size={26} /></span>
                    <h2 className="mt-3 text-lg font-black text-slate-900">Not enough wallet balance</h2>
                    {what && <p className="mt-1.5 text-sm text-slate-600">{what}</p>}
                    {short.needed > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Costs</p><p className="font-black tabular-nums text-slate-800">{money(short.needed, cur)}</p></div>
                            <div className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Your balance</p><p className="font-black tabular-nums text-rose-600">{money(short.balance || 0, cur)}</p></div>
                        </div>
                    )}
                    <p className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3.5 text-left text-xs leading-relaxed text-slate-600 ring-1 ring-slate-100">
                        <Info size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                        Your wallet holds your starting credit and anything an administrator adds. Ask your institution or YATICORP support if you need more.
                    </p>
                    <div className="mt-5">
                        <button type="button" onClick={() => setShort(null)} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">OK</button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
