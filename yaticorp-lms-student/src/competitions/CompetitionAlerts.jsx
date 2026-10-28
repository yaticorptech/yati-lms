/**
 * The start pop-up: when a competition match opens, or a Quiz Arena starts,
 * for this student — and only the students their college selected — a
 * pop-up shows their own joining code, wherever they are in the app. Only
 * that code lets them in (the server checks it).
 *
 * It asks the server every 15 seconds while the app is open
 * (GET /competitions/alerts), shows each alert once a session unless the
 * student opens it, and, if the student has allowed it, a notification from
 * the browser too. The same code is in their notification bell and My Games.
 */
import { markCopied } from './copiedCode';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Copy, Check, Trophy, X, Wallet, Loader2 } from 'lucide-react';
import { competitionsApi } from './api';
import { arenaApi } from './arena/api';
import { payOnline } from './razorpay';

const SEEN = 'competition-alerts-dismissed';
const read = () => { try { return JSON.parse(sessionStorage.getItem(SEEN) || '[]'); } catch { return []; } };
const remember = (id) => { try { sessionStorage.setItem(SEEN, JSON.stringify([...new Set([...read(), id])])); } catch { /* private mode */ } };
const notified = new Set();

export default function CompetitionAlerts() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [alerts, setAlerts] = useState([]);
    const [dismissed, setDismissed] = useState(read);
    const [copied, setCopied] = useState(false);
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState('');
    const [now, setNow] = useState(Date.now());

    const check = useCallback(() => {
        if (document.visibilityState === 'hidden') return;
        competitionsApi.alerts().then((rows) => {
            setAlerts(rows);
            // A notification from the browser too, once per alert, if allowed.
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                for (const a of rows) {
                    if (notified.has(a.id)) continue;
                    notified.add(a.id);
                    try { new Notification(a.kind === 'payment' ? `${a.title} — ${a.subtitle}` : `${a.title} — join now`, { body: a.kind === 'payment' ? 'Pay the entry fee from your wallet to enroll.' : `${a.subtitle}. Your joining code: ${a.code}`, tag: a.id }); } catch { /* not supported here */ }
                }
            }
        }).catch(() => {});
    }, []);
    useEffect(() => {
        check();
        const t = setInterval(check, 15000);
        document.addEventListener('visibilitychange', check);
        return () => { clearInterval(t); document.removeEventListener('visibilitychange', check); };
    }, [check]);
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

    const alert = alerts.find((a) => !dismissed.includes(a.id));
    // Already on the page where the code is typed: no pop-up over it.
    const target = alert ? (alert.kind === 'payment' ? (alert.arenaId ? `/competitions/arena/${alert.arenaId}` : `/competitions/${alert.competitionId}`) : alert.kind === 'arena' ? `/competitions/arena/${alert.arenaId}/play` : `/competitions/play/${alert.gameId}`) : null;
    if (!alert || pathname === target) return null;

    const close = () => { remember(alert.id); setDismissed(read()); setCopied(false); setPayError(''); };
    const pay = () => {
        setPaying(true); setPayError('');
        (alert.arenaId ? payOnline(() => arenaApi.pay(alert.arenaId), (r) => arenaApi.payVerify(alert.arenaId, r)) : payOnline(() => competitionsApi.pay(alert.competitionId), (r) => competitionsApi.payVerify(alert.competitionId, r)))
            .then(() => { setAlerts((rows) => rows.filter((r) => r.id !== alert.id)); check(); })
            .catch((e) => setPayError(e.message || 'The payment did not go through.'))
            .finally(() => setPaying(false));
    };
    const copy = () => { navigator.clipboard?.writeText(alert.code).then(() => { setCopied(true); markCopied(alert.code); }).catch(() => {}); };
    const left = alert.deadline ? Math.max(0, Math.ceil((new Date(alert.deadline).getTime() - now) / 1000)) : null;
    const canAsk = typeof Notification !== 'undefined' && Notification.permission === 'default';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="comp-alert-title" data-competition-alert={alert.id}>
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white text-center shadow-2xl">
                <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 hover:bg-white/10"><X size={18} /></button>
                <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 pb-6 pt-7 text-white">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Trophy size={24} aria-hidden="true" /></span>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">{alert.subtitle}</p>
                    <h2 id="comp-alert-title" className="mt-1 text-xl font-black leading-tight">{alert.title}</h2>
                </div>
                {alert.kind === 'payment' ? (
                    <div className="space-y-4 p-6" data-pay-alert>
                        <p className="text-sm text-slate-600">You are approved for this competition. Pay the entry fee online to enroll — your joining code comes only after it is paid.</p>
                        <p className="text-4xl font-black text-slate-900">₹{alert.amount}</p>
                        {payError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" role="alert">{payError}</p>}
                        <button type="button" disabled={paying} onClick={pay} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-black text-white shadow-md hover:bg-amber-600 disabled:opacity-60">
                            {paying ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Wallet size={16} aria-hidden="true" />} Pay ₹{alert.amount} to enroll
                        </button>
                        <button type="button" onClick={() => { close(); navigate(target); }} className="text-xs font-semibold text-indigo-700 hover:underline">See the competition</button>
                    </div>
                ) : (
                <div className="space-y-4 p-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your joining code</p>
                        <button type="button" onClick={copy} className="mt-1.5 inline-flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 font-mono text-3xl font-black tracking-[0.3em] text-white" data-alert-code={alert.code} translate="no" aria-label={`Your joining code ${alert.code}. Copy`}>
                            {alert.code}{copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} className="text-white/60" />}
                        </button>
                        <p className="mt-2 text-xs text-slate-500">Only for you — it will not work for anyone else. Enter it to join.</p>
                    </div>
                    {left != null && alert.kind === 'match' && <p className={`text-sm font-bold ${left <= 120 ? 'text-rose-600' : 'text-slate-700'}`}>Join within {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} or lose by walkover</p>}
                    {/* Go to join only once the code is copied: they will need it there. */}
                    <button type="button" disabled={!copied} onClick={() => { close(); navigate(target); }} title={copied ? '' : 'Copy your code first'} className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white shadow-md hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none" data-go-join>{copied ? 'Go to join' : 'Copy your code to continue'}</button>
                    {canAsk && (
                        <button type="button" onClick={() => Notification.requestPermission().catch(() => {})} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline">
                            <Bell size={13} aria-hidden="true" /> Notify me on screen next time
                        </button>
                    )}
                </div>
                )}
            </div>
        </div>
    );
}
