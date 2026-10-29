/**
 * A student's devices, for an administrator (server: services/deviceRoutes.js): where they are
 * signed in, the residential card (a second computer, for a computer lab and home), and a reset
 * that clears every device and gives back their yearly removal.
 *
 * `base` is the devices endpoint: /admin/users/:id/devices or /organizations/me/students/:id/devices.
 */
import { useCallback, useEffect, useState } from 'react';
import { MonitorSmartphone, Smartphone, Laptop, RotateCcw, Home, Loader2 } from 'lucide-react';
import api from '../utils/api';

const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function StudentDevicesCard({ base, className = '' }) {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState('');
    const [notice, setNotice] = useState(null);

    const load = useCallback(() => api.get(base).then((r) => setData(r.data)).catch(() => setData({ failed: true })), [base]);
    useEffect(() => { load(); }, [load]);

    const act = async (what, call) => {
        setBusy(what); setNotice(null);
        try { const r = await call(); setData(r.data); setNotice({ ok: true, text: r.data.message }); }
        catch (err) { setNotice({ ok: false, text: err.response?.data?.message || 'That did not go through.' }); }
        finally { setBusy(''); }
    };
    const toggleResidential = () => act('res', () => api.put(`${base}/residential`, { enabled: !data.residentialCard }));
    const reset = () => {
        if (!window.confirm('Reset this student’s devices? Every device is signed out, and they can sign in on new ones (and get their yearly removal back).')) return;
        act('reset', () => api.delete(base));
    };

    if (!data) return <section className={`h-32 animate-pulse rounded-2xl border border-slate-200 bg-white ${className}`} />;
    if (data.failed) return null;

    return (
        <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><MonitorSmartphone size={20} /></span>
                    <div>
                        <h3 className="text-sm font-black text-slate-900">Devices</h3>
                        <p className="text-xs text-slate-500">Allowed: {data.limits.mobile} mobile · {data.limits.computer} computer{data.limits.computer > 1 ? 's' : ''}{data.canRemoveAt ? ` · next self-removal ${fmt(data.canRemoveAt)}` : ''}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* The residential card: a computer-lab machine and a home one. */}
                    <button type="button" onClick={toggleResidential} disabled={!!busy} role="switch" aria-checked={data.residentialCard}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${data.residentialCard ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        {busy === 'res' ? <Loader2 size={14} className="animate-spin" /> : <Home size={14} />}
                        Residential card: {data.residentialCard ? 'On' : 'Off'}
                    </button>
                    <button type="button" onClick={reset} disabled={!!busy || (!data.devices.length && !data.canRemoveAt)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40">
                        {busy === 'reset' ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reset devices
                    </button>
                </div>
            </div>

            {data.devices.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Not signed in on any device yet.</p>
            ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                    {data.devices.map((d) => {
                        const Icon = d.kind === 'mobile' ? Smartphone : Laptop;
                        return (
                            <li key={d.deviceId} className="flex items-center gap-3 py-2.5 text-sm">
                                <Icon size={17} className="shrink-0 text-slate-400" />
                                <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{d.name || 'A device'}</span>
                                <span className="shrink-0 text-xs text-slate-500">added {fmt(d.addedAt)} · last used {fmt(d.lastSeenAt)}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
            {notice && <p role="status" className={`mt-2 text-sm font-semibold ${notice.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{notice.text}</p>}
        </section>
    );
}
