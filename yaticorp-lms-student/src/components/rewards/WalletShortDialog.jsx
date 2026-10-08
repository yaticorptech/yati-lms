/**
 * "Not enough in your wallet", for every priced thing in the LMS at once.
 *
 * The API clients announce a 402 (see utils/walletCharge); this listens and
 * explains the way out: XP earned on Career Path converts into wallet money
 * at the admin's rate. Mounted once, in the student layout.
 */
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Compass, X, Sparkles } from 'lucide-react';
import Portal from '../Portal';
import { AuthContext } from '../../context/AuthContext';
import { useRewards } from '../../context/useRewards';
import { money, num } from './format';

export default function WalletShortDialog() {
    const [short, setShort] = useState(null);
    const navigate = useNavigate();
    const { isCareerPathEnabled } = useContext(AuthContext);
    const rewards = useRewards();
    const conversion = rewards.summary?.config?.conversion;
    const xpBalance = rewards.summary?.wallet?.xpBalance;

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

    if (!short) return null;

    const cur = short.currency || 'INR';
    // The server's sentence, without the Career Path hint the dialog says itself.
    const what = String(short.message || '').replace(/\s*Earn XP on Career Path[^.]*\.?\s*$/, '');
    const goEarn = () => { setShort(null); navigate('/career'); };

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
                    <div className="mt-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-3.5 text-left ring-1 ring-indigo-100">
                        <p className="flex items-center gap-1.5 text-sm font-black text-indigo-900"><Sparkles size={15} className="text-indigo-500" /> Earn XP to top up your wallet</p>
                        <p className="mt-1 text-xs leading-relaxed text-indigo-900/80">
                            Complete tasks, lessons, quizzes and games on Career Path.
                            {conversion?.pointsPerUnit ? ` Every ${num(conversion.pointsPerUnit)} XP adds ${money(conversion.unitValue, conversion.currency || cur)} to your wallet.` : ''}
                            {xpBalance != null && conversion?.pointsPerUnit ? ` You're ${num(Math.max(0, conversion.pointsPerUnit - xpBalance))} XP away from the next one.` : ''}
                        </p>
                    </div>
                    <div className="mt-5 flex gap-2">
                        <button type="button" onClick={() => setShort(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Not now</button>
                        {isCareerPathEnabled !== false && (
                            <button type="button" onClick={goEarn} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-bold text-white shadow-md hover:from-indigo-700 hover:to-violet-700">
                                <Compass size={16} /> Go to Career Path
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Portal>
    );
}
