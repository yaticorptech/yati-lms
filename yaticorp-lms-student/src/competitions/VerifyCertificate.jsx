import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, Search, Loader2 } from 'lucide-react';
import { roomsApi } from './api';

/**
 * Check a Group Brain certificate (open to anyone, no sign-in): the page its
 * QR code opens, /verify/group-brain/GB-XXXX-XXXX. It says whether the ID
 * is genuine and still valid, whose it is, and what it was for.
 */
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

export default function VerifyCertificate() {
    const { certId } = useParams();
    const navigate = useNavigate();
    const [typed, setTyped] = useState(certId || '');
    const [loaded, setLoaded] = useState({ id: null, data: null, error: '' });
    useEffect(() => {
        if (!certId) return;
        roomsApi.verify(certId).then((data) => setLoaded({ id: certId, data, error: '' })).catch((e) => setLoaded({ id: certId, data: null, error: e.message }));
    }, [certId]);
    const result = loaded.id === certId ? loaded : null;
    const d = result?.data;

    return (
        <main className="flex min-h-screen items-start justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4 py-10">
            <div className="w-full max-w-lg space-y-4">
                <p className="text-center text-xs font-black uppercase tracking-[0.25em] text-indigo-600">YATI LMS · Group Brain</p>
                <h1 className="text-center text-2xl font-black text-slate-900">Certificate check</h1>
                <form onSubmit={(e) => { e.preventDefault(); if (typed.trim()) navigate(`/verify/group-brain/${typed.trim().toUpperCase()}`); }} className="flex gap-2">
                    <label className="relative min-w-0 flex-1">
                        <span className="sr-only">Certificate ID</span>
                        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder="GB-XXXX-XXXX" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 font-mono tracking-wider text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    </label>
                    <button type="submit" className="rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700">Check</button>
                </form>
                {certId && !result && <Loader2 className="mx-auto animate-spin text-slate-400" aria-label="Checking" />}
                {result?.error && <p className="rounded-xl bg-rose-50 p-3 text-center text-sm font-semibold text-rose-700">{result.error}</p>}
                {d && !d.found && (
                    <section className="rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-sm" data-verify="not-found">
                        <ShieldX size={36} className="mx-auto text-rose-500" aria-hidden="true" />
                        <p className="mt-2 text-lg font-black text-slate-900">No certificate has this ID</p>
                        <p className="text-sm text-slate-600">Check the ID printed on the certificate, under its QR code.</p>
                    </section>
                )}
                {d?.found && (
                    <section className={`rounded-3xl border bg-white p-6 shadow-sm ${d.valid ? 'border-emerald-200' : 'border-rose-200'}`} data-verify={d.valid ? 'valid' : 'revoked'}>
                        <div className="flex items-center gap-3">
                            {d.valid ? <ShieldCheck size={36} className="shrink-0 text-emerald-600" aria-hidden="true" /> : <ShieldX size={36} className="shrink-0 text-rose-500" aria-hidden="true" />}
                            <div>
                                <p className={`text-lg font-black ${d.valid ? 'text-emerald-800' : 'text-rose-800'}`}>{d.valid ? 'Genuine and valid' : 'Revoked — no longer valid'}</p>
                                <p className="font-mono text-sm text-slate-500">{d.certId}</p>
                            </div>
                        </div>
                        <dl className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between gap-3"><dt className="text-slate-500">Awarded to</dt><dd className="text-right font-bold text-slate-900">{d.name}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-slate-500">For</dt><dd className="text-right font-bold text-slate-900">{d.rank ? `${['', '1st', '2nd', '3rd'][d.rank] || `${d.rank}th`} place · ` : ''}{d.title}{d.line ? <span className="block text-xs font-normal text-slate-600">{d.line}</span> : null}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-slate-500">Event</dt><dd className="text-right font-semibold text-slate-800">{d.eventName}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-slate-500">Issued</dt><dd className="text-right font-semibold text-slate-800">{fmt(d.issuedAt)}</dd></div>
                            {!d.valid && <div className="flex justify-between gap-3"><dt className="text-slate-500">Revoked</dt><dd className="text-right font-semibold text-rose-700">{fmt(d.revokedAt)}{d.revokedReason ? ` — ${d.revokedReason}` : ''}</dd></div>}
                        </dl>
                    </section>
                )}
                <p className="text-center text-xs text-slate-500">Group Brain scores measure performance in these games; they are not IQ scores. <Link to="/login" className="font-semibold text-indigo-700 hover:underline">YATI LMS</Link></p>
            </div>
        </main>
    );
}
