/**
 * "Pay from your wallet?" — asked before any priced feature takes money
 * (2026-10-28). The API clients raise the question when the server answers a
 * request with its price (utils/walletCharge, askWalletConfirm); this shows the
 * price, the balance now and after, and answers Proceed or Cancel. Free features,
 * and ones already paid for, never get here. Mounted once, in the student
 * layout, beside WalletShortDialog.
 */
import { useEffect, useState } from 'react';
import { Wallet, X, Info } from 'lucide-react';
import Portal from '../Portal';
import useBackClose from '../../native/useBackClose';
import { money } from './format';

export default function WalletConfirmDialog() {
    // Questions waiting their turn; the first is on screen.
    const [queue, setQueue] = useState([]);
    const ask = queue[0] || null;

    useEffect(() => {
        const onAsk = (e) => {
            e.detail?.claim?.();
            setQueue((q) => [...q, e.detail]);
        };
        window.addEventListener('yati:wallet-confirm', onAsk);
        return () => window.removeEventListener('yati:wallet-confirm', onAsk);
    }, []);

    const answer = (yes) => {
        if (!ask) return;
        // Inside the click: a job listing opens its tab here, or the browser blocks it.
        if (yes) ask.beforeConfirm?.();
        ask.resolve(yes);
        setQueue((q) => q.slice(1));
    };

    useEffect(() => {
        if (!ask) return undefined;
        const onKey = (e) => e.key === 'Escape' && answer(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });
    // Android's back button cancels, as Escape does.
    useBackClose(() => answer(false), !!ask);

    if (!ask) return null;

    const cur = ask.currency || 'INR';
    const after = Math.max(0, (Number(ask.balance) || 0) - (Number(ask.amount) || 0));

    return (
        <Portal>
            <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="wallet-confirm-title"
                onMouseDown={(e) => e.target === e.currentTarget && answer(false)}>
                <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl">
                    <button type="button" onClick={() => answer(false)} aria-label="Cancel" className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><Wallet size={26} /></span>
                    <h2 id="wallet-confirm-title" className="mt-3 text-lg font-black text-slate-900">Pay from your wallet?</h2>
                    <p className="mt-1.5 text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">{ask.label || 'This'}</span> costs <span className="font-bold text-slate-900">{money(ask.amount, cur)}</span>.
                    </p>

                    <dl className="mt-4 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-4 text-sm ring-1 ring-slate-100">
                        <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-slate-500">Wallet balance</dt><dd className="font-semibold tabular-nums text-slate-800">{money(ask.balance, cur)}</dd></div>
                        <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-slate-500">This will use</dt><dd className="font-bold tabular-nums text-rose-600">− {money(ask.amount, cur)}</dd></div>
                        <div className="flex items-center justify-between gap-3 py-2.5"><dt className="font-semibold text-slate-700">Left after</dt><dd className="font-black tabular-nums text-emerald-600">{money(after, cur)}</dd></div>
                    </dl>

                    <p className="mt-3 flex items-start gap-2 text-left text-xs leading-relaxed text-slate-500">
                        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                        If it does not go through, the wallet points come straight back to your wallet.
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => answer(false)} className="rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button type="button" onClick={() => answer(true)} autoFocus className="rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">Proceed</button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
