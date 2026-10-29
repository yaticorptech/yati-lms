/**
 * My Profile → My devices: where this account is signed in (server: services/deviceGuard.js).
 * One mobile and one computer — two computers with a residential card — and a device can be
 * removed once a year to make room for another. The device in use is marked and cannot be
 * removed from itself.
 */
import { useCallback, useEffect, useState } from 'react';
import { MonitorSmartphone, Smartphone, Laptop, Trash2, ShieldCheck, CalendarClock, Loader2, Home } from 'lucide-react';
import api from '../utils/api';
import useConfirmDialog from './useConfirmDialog';
import useLive from '../live/useLive';

const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const ago = (d) => {
    if (!d) return '';
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

/** One slot: a device in it, or an empty place for one. */
const Slot = ({ kind, device, onRemove, busy, canRemove }) => {
    const Icon = kind === 'mobile' ? Smartphone : Laptop;
    if (!device) {
        return (
            <li className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-300"><Icon size={19} /></span>
                <span className="text-sm text-slate-400">Free {kind === 'mobile' ? 'mobile' : 'computer'} slot</span>
            </li>
        );
    }
    return (
        <li className={`flex items-center gap-3 rounded-2xl border p-3 ${device.current ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${device.current ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}><Icon size={19} /></span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-slate-900">{device.name || 'A device'}</span>
                    {device.current && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">This device</span>}
                </span>
                <span className="block text-xs text-slate-500">Added {fmt(device.addedAt)} · last used {ago(device.lastSeenAt)}</span>
            </span>
            {!device.current && (
                <button type="button" onClick={() => onRemove(device)} disabled={busy || !canRemove}
                    title={canRemove ? 'Remove this device' : 'You can remove a device once a year'}
                    aria-label={`Remove ${device.name}`}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400">
                    {busy === device.deviceId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
            )}
        </li>
    );
};

export default function MyDevices() {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(null);
    const [notice, setNotice] = useState(null);
    const [confirm, confirmDialog] = useConfirmDialog();

    const load = useCallback(() => api.get('/user/devices').then((r) => setData(r.data)).catch(() => setData({ failed: true })), []);
    useEffect(() => { load(); }, [load]);
    // A residential card switched on, or a reset, shows here at once (live topic 'devices').
    useLive('devices', load);

    if (!data) return <section className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />;
    if (data.failed) return null;

    const canRemove = !data.canRemoveAt;
    const nextYear = fmt(new Date(Date.now() + 365 * 86400000));
    const remove = async (d) => {
        const yes = await confirm({
            title: `Remove ${d.name}?`,
            message: `You can remove a device only once a year. If you remove it now, you can remove a device again on ${nextYear}. It will be signed out straight away.`,
            confirmLabel: 'Remove device',
            destructive: true
        });
        if (!yes) return;
        setBusy(d.deviceId); setNotice(null);
        try { setNotice({ ok: true, text: (await api.delete(`/user/devices/${encodeURIComponent(d.deviceId)}`)).data.message }); await load(); }
        catch (err) { setNotice({ ok: false, text: err.response?.data?.message || 'Could not remove that device.' }); }
        finally { setBusy(null); }
    };

    const slots = (kind) => {
        const mine = data.devices.filter((d) => d.kind === kind);
        return Array.from({ length: Math.max(data.limits[kind], mine.length) }, (_, i) => mine[i] || null);
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><MonitorSmartphone size={20} /></div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black text-slate-900">My devices</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        You can be signed in on 1 mobile and {data.limits.computer === 2 ? '2 computers' : '1 laptop, desktop or tablet'}.
                    </p>
                </div>
                {data.residentialCard && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-200"><Home size={12} /> Residential card</span>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <p className="mb-2 text-[11px] font-black tracking-[0.12em] text-slate-400 uppercase">Mobile</p>
                    <ul className="space-y-2">{slots('mobile').map((d, i) => <Slot key={d?.deviceId || `m${i}`} kind="mobile" device={d} onRemove={remove} busy={busy} canRemove={canRemove} />)}</ul>
                </div>
                <div>
                    <p className="mb-2 text-[11px] font-black tracking-[0.12em] text-slate-400 uppercase">Laptop / desktop / tablet</p>
                    <ul className="space-y-2">{slots('computer').map((d, i) => <Slot key={d?.deviceId || `c${i}`} kind="computer" device={d} onRemove={remove} busy={busy} canRemove={canRemove} />)}</ul>
                </div>
            </div>

            <p className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-xs ${canRemove ? 'bg-slate-50 text-slate-600' : 'bg-amber-50 text-amber-800'}`}>
                {canRemove ? <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" /> : <CalendarClock size={15} className="mt-0.5 shrink-0" />}
                {canRemove
                    ? 'You can remove 1 device this year to make room for a new one.'
                    : `You have used this year's device removal. Next removal on ${fmt(data.canRemoveAt)} — or ask your organisation to reset your devices.`}
            </p>
            {notice && <p role="status" className={`mt-3 text-sm font-semibold ${notice.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{notice.text}</p>}
            {confirmDialog}
        </section>
    );
}
