import { useState } from 'react';
import { AlertTriangle, Smartphone, Laptop, X, Loader2, CalendarClock, ShieldAlert } from 'lucide-react';
import Portal from './Portal';

const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const ago = (d) => {
    if (!d) return '';
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

/**
 * Sign-in on a device past the limit (server: services/deviceGuard.js). Says a new device was
 * found and which devices hold the slot; the student may remove one — once a year — and sign in
 * here in its place, or, with this year's removal used, is told when and who can reset it.
 *
 * `conflict`: { kind, newDevice, devices[], canRemoveAt, residential, ticket }
 */
export default function DeviceLimitDialog({ conflict, onReplace, onClose }) {
    const [pick, setPick] = useState(conflict.devices.length === 1 ? conflict.devices[0].deviceId : '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const mobile = conflict.kind === 'mobile';
    const Icon = mobile ? Smartphone : Laptop;
    const what = mobile ? '1 mobile' : conflict.residential ? '2 computers (residential card)' : '1 laptop, desktop or tablet';
    const blockedUntil = conflict.canRemoveAt;
    const nextYear = new Date(Date.now() + 365 * 86400000);
    const chosen = conflict.devices.find((d) => d.deviceId === pick);

    const confirm = async () => {
        if (!pick) { setError('Choose the device to remove.'); return; }
        setBusy(true); setError('');
        const res = await onReplace(pick);
        if (!res?.success) { setError(res?.error || 'Could not remove that device.'); setBusy(false); }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in">
                <div role="alertdialog" aria-modal="true" aria-labelledby="device-limit-title" aria-describedby="device-limit-lead"
                    className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.6)]">
                    <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="absolute top-4 right-4 z-10 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X size={18} />
                    </button>

                    <div className="bg-gradient-to-b from-amber-50 to-white px-6 pt-7 pb-4 text-center">
                        <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30">
                            <AlertTriangle size={30} strokeWidth={2.4} />
                            <span aria-hidden className="absolute inset-0 animate-ping rounded-2xl bg-amber-400/30 [animation-duration:2s]" />
                        </span>
                        <h2 id="device-limit-title" className="mt-4 text-xl font-black text-slate-900">New device found</h2>
                        <p id="device-limit-lead" className="mt-1 text-sm text-slate-600">
                            You can sign in on only <span className="font-bold text-slate-900">{what}</span>.
                            {' '}This {mobile ? 'mobile' : 'computer'} is <span className="font-bold text-slate-900">{conflict.newDevice}</span>.
                        </p>
                    </div>

                    <div className="px-6 pb-6">
                        <p className="text-[11px] font-black tracking-[0.12em] text-slate-400 uppercase">Signed in on</p>
                        <ul className="mt-2 space-y-2" role={blockedUntil ? undefined : 'radiogroup'} aria-label="Your devices">
                            {conflict.devices.map((d) => {
                                const on = pick === d.deviceId;
                                return (
                                    <li key={d.deviceId}>
                                        <button type="button" role={blockedUntil ? undefined : 'radio'} aria-checked={blockedUntil ? undefined : on} disabled={!!blockedUntil || busy}
                                            onClick={() => setPick(d.deviceId)}
                                            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${on && !blockedUntil ? 'border-rose-300 bg-rose-50 ring-4 ring-rose-100' : 'border-slate-200 bg-slate-50'} ${blockedUntil ? 'cursor-default' : 'hover:border-rose-200'}`}>
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on && !blockedUntil ? 'bg-rose-500 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}><Icon size={19} /></span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-bold text-slate-900">{d.name || 'A device'}</span>
                                                <span className="block text-xs text-slate-500">Added {fmt(d.addedAt)} · last used {ago(d.lastSeenAt)}</span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {blockedUntil ? (
                            <div className="mt-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
                                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                                <p>You have already removed a device this year. You can remove one again on <span className="font-black">{fmt(blockedUntil)}</span>. To use this device sooner, ask your organisation or admin to reset your devices.</p>
                            </div>
                        ) : (
                            <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                                <CalendarClock size={18} className="mt-0.5 shrink-0" />
                                <p>Do you want to delete {chosen ? <span className="font-black">{chosen.name}</span> : 'this device'}? You can delete a device <span className="font-black">only once a year</span> — if you delete now, you can delete a device again on <span className="font-black">{fmt(nextYear)}</span>.</p>
                            </div>
                        )}

                        {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}

                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">
                                {blockedUntil ? 'Close' : 'Keep my devices'}
                            </button>
                            {!blockedUntil && (
                                <button type="button" onClick={confirm} disabled={busy || !pick}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-500/30 hover:brightness-105 disabled:opacity-50">
                                    {busy ? <><Loader2 size={16} className="animate-spin" /> Removing…</> : 'Delete & sign in here'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
