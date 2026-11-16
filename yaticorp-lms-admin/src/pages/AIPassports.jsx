/**
 * AI Passports (super admin): the QR IDs stuck on the last page of each AI
 * Passport book. Load the IDs once; a student's first scan links the book to
 * their card for good, verifies that card (no Verify cards step) and pays the
 * welcome reward. Scan a book here to see whose card it is.
 * Server: src/controllers/passportController.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookMarked, ScanLine, Keyboard, Loader2, CheckCircle2, AlertCircle, Search, Plus, Upload, ChevronLeft, ChevronRight, Link2, Gift, Ban, RotateCcw, CreditCard, User, QrCode, Download, Printer } from 'lucide-react';
import api from '../utils/api';
import { useQrReader } from '../utils/qrReader';

const READER_ID = 'passport-reader';
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const spaced = (n) => String(n || '').replace(/(.{4})(?=.)/g, '$1 ');
const errorOf = (err, fallback) => err.response?.data?.message || (!err.response ? 'Check your connection and try again.' : fallback);

const TABS = [['all', 'All'], ['free', 'Not scanned'], ['linked', 'Linked'], ['inactive', 'Withdrawn']];
const STATE = {
    free: ['Not scanned', 'bg-slate-100 text-slate-600'],
    linked: ['Linked', 'bg-emerald-100 text-emerald-800'],
    inactive: ['Withdrawn', 'bg-rose-100 text-rose-700']
};
const CARD_STATE = { registered: 'Registered', verified: 'Verified, not registered yet', waiting: 'Waiting', inactive: 'Inactive' };

function Scanner({ onRead }) {
    const { error, retry } = useQrReader(READER_ID, onRead, true);
    return (
        <div>
            <div id={READER_ID} className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-slate-900" />
            {error
                ? <p className="mt-3 flex items-start gap-2 text-sm text-rose-600"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error} <button type="button" onClick={retry} className="font-bold underline">Try again</button></p>
                : <p className="mt-3 text-center text-xs text-slate-500">Point the camera at the QR on the passport's last page</p>}
        </div>
    );
}

/** One looked-up passport: whose card, whose account, reward paid or not. */
function LookupResult({ p }) {
    return (
        <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-black text-slate-900">{p.code}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATE[p.status][1]}`}>{STATE[p.status][0]}</span>
            </div>
            {p.status === 'linked' ? (
                <dl className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-700"><CreditCard size={14} className="text-slate-400" /><dt className="sr-only">Card</dt><dd className="font-mono">{spaced(p.cardNumber)}</dd>{p.card && <span className="text-xs text-slate-500">· {CARD_STATE[p.card.state]}</span>}</div>
                    <div className="flex items-center gap-2 text-slate-700"><User size={14} className="text-slate-400" /><dt className="sr-only">Student</dt><dd>{p.student ? <>{p.student.name} <span className="text-xs text-slate-500">{p.student.email}</span></> : <span className="text-slate-500">No account yet</span>}</dd></div>
                    <div className="flex items-center gap-2 text-slate-700"><Gift size={14} className="text-slate-400" /><dt className="sr-only">Reward</dt><dd>{p.rewardedAt ? <>{inr(p.rewardAmount)} paid {fmt(p.rewardedAt)}</> : <span className="text-slate-500">Reward pays when the account is made</span>}</dd></div>
                    <p className="text-xs text-slate-500">Linked {fmt(p.linkedAt)} {p.linkedVia === 'signup' ? 'while signing up' : 'from the student app'}</p>
                </dl>
            ) : p.status === 'free' ? (
                <p className="text-sm text-slate-600">Not scanned by a student yet. The first student to scan it links it to their card.</p>
            ) : <p className="text-sm text-slate-600">Withdrawn: students cannot scan it.</p>}
        </div>
    );
}

/** Save a PDF the API sent (the request carries the admin's token, so a plain link would not). */
const saveBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/**
 * Create QR codes: N new random IDs in a named batch, then the A4 sticker
 * sheet to print and stick on each passport's last page. Every batch can be
 * downloaded again later from the list under it.
 */
function QrGenerator({ onCreated }) {
    const [count, setCount] = useState(100);
    const [prefix, setPrefix] = useState('AIP');
    const [batch, setBatch] = useState('');
    const [linkBase, setLinkBase] = useState(null);
    const [max, setMax] = useState(2000);
    const [batches, setBatches] = useState(null);
    const [busy, setBusy] = useState('');
    const [note, setNote] = useState(null);

    const loadBatches = useCallback(() => api.get('/admin/passports/batches').then((r) => {
        setBatches(r.data.batches); setMax(r.data.max || 2000);
        setLinkBase((b) => (b === null ? r.data.linkBase || '' : b));
    }).catch(() => setBatches([])), []);
    useEffect(() => { loadBatches(); }, [loadBatches]);

    const download = async (name, onlyFree = false) => {
        setBusy(`dl:${name}`); setNote(null);
        try {
            const r = await api.get('/admin/passports/stickers', { params: { batch: name, ...(onlyFree ? { free: 1 } : {}) }, responseType: 'blob' });
            saveBlob(r.data, `ai-passport-qr-${name.replace(/[^\w-]+/g, '-')}.pdf`);
        } catch (err) {
            let text = 'The sticker sheet could not be downloaded.';
            try { text = JSON.parse(await err.response.data.text()).message || text; } catch { /* not JSON */ }
            setNote({ ok: false, text });
        } finally { setBusy(''); }
    };

    const create = async (e) => {
        e.preventDefault();
        if (!(count >= 1 && count <= max)) return setNote({ ok: false, text: `Choose between 1 and ${max} QR codes.` });
        if (!linkBase.trim() && !window.confirm('No QR link is set, so the QR will hold only the ID. A phone camera will show the text instead of opening the app. Continue?')) return undefined;
        setBusy('create'); setNote(null);
        try {
            const r = await api.post('/admin/passports/generate', { count, prefix, batch, linkBase });
            setNote({ ok: true, text: r.data.message }); setBatch('');
            await loadBatches(); onCreated?.();
            await download(r.data.batch);
        } catch (err) { setNote({ ok: false, text: errorOf(err, 'The QR codes could not be created.') }); }
        finally { setBusy(''); }
        return undefined;
    };

    const preview = `${(linkBase || '').replace(/\/+$/, '')}${linkBase ? '/passport/' : ''}${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '')}7K3M9Q2X`;

    return (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900"><QrCode size={16} className="text-emerald-600" /> Create QR codes</h2>
            <p className="mt-1 text-xs text-slate-500">New random IDs, ready to print as A4 stickers (24 per sheet) for each passport's last page.</p>
            <form onSubmit={create} className="mt-3 space-y-3">
                <div className="grid grid-cols-[1fr_6rem] gap-2">
                    <div>
                        <label htmlFor="qr-count" className="mb-1 block text-xs font-bold text-slate-600">How many</label>
                        <input id="qr-count" type="number" min={1} max={max} value={count} onChange={(e) => setCount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold tabular-nums outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                    </div>
                    <div>
                        <label htmlFor="qr-prefix" className="mb-1 block text-xs font-bold text-slate-600">Prefix</label>
                        <input id="qr-prefix" value={prefix} maxLength={6} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {[50, 100, 500, 1000].filter((n) => n <= max).map((n) => (
                        <button key={n} type="button" onClick={() => setCount(n)} aria-pressed={count === n}
                            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition-colors ${count === n ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-emerald-300'}`}>{n.toLocaleString('en-IN')}</button>
                    ))}
                </div>
                <div>
                    <label htmlFor="qr-batch" className="mb-1 block text-xs font-bold text-slate-600">Batch name (optional)</label>
                    <input id="qr-batch" value={batch} maxLength={60} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. Print run Nov 2026 — School A"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                </div>
                <div>
                    <label htmlFor="qr-link" className="mb-1 block text-xs font-bold text-slate-600">Student app address in the QR</label>
                    <input id="qr-link" value={linkBase ?? ''} onChange={(e) => setLinkBase(e.target.value)} placeholder="https://your-student-app.com"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                    <p className="mt-1 break-all text-[11px] text-slate-500">QR opens: <span className="font-mono text-slate-700">{preview}</span></p>
                    {/localhost|127\.0\.0\.1/i.test(linkBase || '') && <p className="mt-1 text-[11px] font-semibold text-amber-700">This is a local address — set the live student app address before printing.</p>}
                </div>
                <button type="submit" disabled={busy === 'create' || !count} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {busy === 'create' ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Create {count ? count.toLocaleString('en-IN') : ''} & download stickers
                </button>
            </form>
            {note && (
                <p role="status" className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-sm font-semibold ${note.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
                    {note.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />} {note.text}
                </p>
            )}

            <h3 className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">Batches</h3>
            {!batches ? <div className="mt-2 h-16 animate-pulse rounded-xl bg-slate-100" /> : batches.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">No batches yet.</p>
            ) : (
                <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {batches.map((b) => (
                        <li key={b.batch || '(none)'} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-800">{b.batch || 'No batch name'}</p>
                                    <p className="text-[11px] text-slate-500">{b.total.toLocaleString('en-IN')} codes · {b.linked.toLocaleString('en-IN')} linked · {fmt(b.createdAt)}</p>
                                </div>
                                <button type="button" onClick={() => download(b.batch)} disabled={!!busy} title="Download the sticker sheet (PDF)"
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-50">
                                    {busy === `dl:${b.batch}` ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} PDF
                                </button>
                            </div>
                            {b.linked > 0 && b.linked < b.total && (
                                <button type="button" onClick={() => download(b.batch, true)} disabled={!!busy} className="mt-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 hover:underline">Download only the {(b.total - b.linked).toLocaleString('en-IN')} not yet scanned</button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default function AIPassports() {
    const [state, setState] = useState('all');
    const [q, setQ] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [listError, setListError] = useState('');

    const [codes, setCodes] = useState('');
    const [batch, setBatch] = useState('');
    const [adding, setAdding] = useState(false);
    const [addNote, setAddNote] = useState(null);

    const [mode, setMode] = useState('type');
    const [lookupCode, setLookupCode] = useState('');
    const [looking, setLooking] = useState(false);
    const [found, setFound] = useState(null);
    const [lookupError, setLookupError] = useState('');
    const [busyRow, setBusyRow] = useState('');

    const load = useCallback(() => {
        setListError('');
        return api.get('/admin/passports', { params: { state, q: query, page } })
            .then((r) => setData(r.data))
            .catch((e) => { setListError(errorOf(e, 'Could not load the AI Passports.')); setData((d) => d || { passports: [], counts: {}, pages: 1, total: 0 }); });
    }, [state, query, page]);
    useEffect(() => { load(); }, [load]);
    // Search as you type, a moment after the last key.
    useEffect(() => { const t = setTimeout(() => { setPage(1); setQuery(q.trim()); }, 300); return () => clearTimeout(t); }, [q]);

    const pending = codes.split(/[\s,;]+/).filter(Boolean).length;
    const add = async (e) => {
        e.preventDefault();
        if (!pending) return;
        setAdding(true); setAddNote(null);
        try {
            const r = await api.post('/admin/passports', { codes, batch });
            setAddNote({ ok: true, text: r.data.message }); setCodes(''); load();
        } catch (err) { setAddNote({ ok: false, text: errorOf(err, 'The IDs could not be added.') }); }
        finally { setAdding(false); }
    };
    const fileRef = useRef(null);
    const readFile = async (file) => {
        if (!file) return;
        let text = '';
        if (/\.(xlsx|xls)$/i.test(file.name)) {
            const XLSX = await import('xlsx');
            const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1 });
            text = rows.map((r) => r[0]).filter((v) => v !== undefined && !/^(code|id|passport|qr)/i.test(String(v))).join('\n');
        } else {
            text = (await file.text()).split(/\r?\n/).map((l) => l.split(',')[0].trim()).filter((v) => v && !/^(code|id|passport|qr)/i.test(v)).join('\n');
        }
        setCodes((c) => [c.trim(), text].filter(Boolean).join('\n'));
        if (fileRef.current) fileRef.current.value = '';
    };

    const lastRead = useRef({ code: '', at: 0 });
    const lookup = async (raw) => {
        const v = String(raw || '').trim(); if (!v) return;
        if (lastRead.current.code === v && Date.now() - lastRead.current.at < 4000) return;
        lastRead.current = { code: v, at: Date.now() };
        setLooking(true); setLookupError(''); setFound(null);
        try { setFound((await api.post('/admin/passports/lookup', { code: v })).data); navigator.vibrate?.(50); }
        catch (err) { setLookupError(errorOf(err, 'That passport could not be checked.')); }
        finally { setLooking(false); }
    };

    const setStatus = async (p, status) => {
        if (status === 'inactive' && !window.confirm(`Withdraw ${p.code}? Students will not be able to scan it until you restore it.`)) return;
        setBusyRow(p._id);
        try { await api.post(`/admin/passports/${p._id}/status`, { status }); load(); }
        catch (err) { setListError(errorOf(err, 'Could not change that passport.')); }
        finally { setBusyRow(''); }
    };

    const counts = data?.counts || {};

    return (
        <div className="space-y-6 pb-10 animate-fade-in">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 ring-1 ring-emerald-100 sm:p-8">
                <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-amber-200/50 blur-3xl" />
                <div className="relative flex flex-wrap items-start gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30"><BookMarked size={24} /></span>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-black text-slate-900">AI Passports</h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-600">The QR IDs on the last page of each AI Passport book. A student's first scan links the book to their card for good, <span className="font-bold">verifies the card automatically</span> and adds the welcome reward to their wallet once. A book linked to one card can't be used with another.</p>
                    </div>
                </div>
                <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[['Not scanned', counts.free, 'text-slate-900'], ['Linked to a card', counts.linked, 'text-emerald-700'], ['Rewards paid', counts.rewarded, 'text-amber-700'], ['Withdrawn', counts.inactive, 'text-rose-700']].map(([label, n, tone]) => (
                        <div key={label} className="rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200 backdrop-blur">
                            <dt className="text-xs font-bold text-slate-500">{label}</dt>
                            <dd className={`mt-1 text-2xl font-black tabular-nums ${tone}`}>{data ? (n || 0).toLocaleString('en-IN') : '…'}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
                <div className="space-y-6">
                    <QrGenerator onCreated={load} />
                    {/* Add IDs */}
                    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                        <h2 className="flex items-center gap-2 text-sm font-black text-slate-900"><Plus size={16} className="text-emerald-600" /> Already printed? Add their IDs</h2>
                        <form onSubmit={add} className="mt-3 space-y-3">
                            <div>
                                <label htmlFor="passport-codes" className="sr-only">Passport IDs</label>
                                <textarea id="passport-codes" rows={6} value={codes} onChange={(e) => setCodes(e.target.value)} placeholder={'One ID per line, or separated by commas\nAIP000001\nAIP000002'}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                    <span>{pending ? `${pending.toLocaleString('en-IN')} ID${pending === 1 ? '' : 's'}` : 'Paste the IDs printed under the QR stickers'}</span>
                                    <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"><Upload size={12} /> From file</button>
                                    <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="passport-batch" className="mb-1 block text-xs font-bold text-slate-600">Batch label (optional)</label>
                                <input id="passport-batch" value={batch} maxLength={60} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. Print run Nov 2026"
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                            </div>
                            <button type="submit" disabled={adding || !pending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                                {adding && <Loader2 size={16} className="animate-spin" />} Add {pending ? pending.toLocaleString('en-IN') : ''} ID{pending === 1 ? '' : 's'}
                            </button>
                        </form>
                        {addNote && (
                            <p role="status" className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-sm font-semibold ${addNote.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
                                {addNote.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />} {addNote.text}
                            </p>
                        )}
                    </section>

                    {/* Check a passport */}
                    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                        <h2 className="flex items-center gap-2 text-sm font-black text-slate-900"><Link2 size={16} className="text-emerald-600" /> Check a passport</h2>
                        <p className="mt-1 text-xs text-slate-500">See which card and student a book belongs to.</p>
                        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                            {[['camera', 'Scan', ScanLine], ['type', 'Type ID', Keyboard]].map(([id, label, Icon]) => (
                                <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id}
                                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${mode === id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>
                                    <Icon size={14} /> {label}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4">
                            {mode === 'camera' ? <Scanner onRead={lookup} /> : (
                                <form onSubmit={(e) => { e.preventDefault(); lastRead.current = { code: '', at: 0 }; lookup(lookupCode); }} className="flex gap-2">
                                    <input value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} placeholder="Passport ID" aria-label="Passport ID"
                                        className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                                    <button type="submit" disabled={looking || !lookupCode.trim()} className="rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">Check</button>
                                </form>
                            )}
                        </div>
                        {looking && <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Checking…</p>}
                        {lookupError && <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {lookupError}</p>}
                        {found && <LookupResult p={found} />}
                    </section>
                </div>

                {/* The list */}
                <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center gap-3">
                        <div role="tablist" aria-label="Filter passports" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
                            {TABS.map(([id, label]) => (
                                <button key={id} role="tab" type="button" aria-selected={state === id} onClick={() => { setState(id); setPage(1); }}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${state === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
                            ))}
                        </div>
                        <div className="relative ml-auto w-full sm:w-64">
                            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID, card, student or batch" aria-label="Search passports"
                                className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                        </div>
                    </div>
                    {listError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{listError}</p>}

                    {!data ? <div className="mt-4 h-48 animate-pulse rounded-2xl bg-slate-100" /> : data.passports.length === 0 ? (
                        <div className="py-14 text-center">
                            <BookMarked size={28} className="mx-auto text-slate-300" />
                            <p className="mt-2 text-sm text-slate-500">{query ? 'No passport matches that search.' : state === 'all' ? 'No passport IDs yet. Add the IDs from your print run on the left.' : 'Nothing here.'}</p>
                        </div>
                    ) : (
                        <ul className="mt-4 divide-y divide-slate-100">
                            {data.passports.map((p) => (
                                <li key={p._id} className="flex flex-wrap items-center gap-3 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-slate-900">{p.code}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATE[p.status][1]}`}>{STATE[p.status][0]}</span>
                                            {p.rewardedAt && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200"><Gift size={10} /> {inr(p.rewardAmount)}</span>}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                            {p.status === 'linked'
                                                ? <>Card <span className="font-mono">{spaced(p.cardNumber)}</span>{p.student ? <> · {p.student.name}</> : ' · no account yet'} · linked {fmt(p.linkedAt)}</>
                                                : <>Added {fmt(p.createdAt)}{p.batch ? ` · ${p.batch}` : ''}</>}
                                        </p>
                                    </div>
                                    {p.status !== 'linked' && (
                                        <button type="button" disabled={busyRow === p._id} onClick={() => setStatus(p, p.status === 'free' ? 'inactive' : 'free')}
                                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${p.status === 'free' ? 'border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}>
                                            {busyRow === p._id ? <Loader2 size={13} className="animate-spin" /> : p.status === 'free' ? <Ban size={13} /> : <RotateCcw size={13} />}
                                            {p.status === 'free' ? 'Withdraw' : 'Restore'}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {data && data.pages > 1 && (
                        <nav aria-label="Passport pages" className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <p className="text-xs text-slate-500">Page {data.page} of {data.pages} · {data.total.toLocaleString('en-IN')} passports</p>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label="Previous page" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
                                <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pages} aria-label="Next page" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={16} /></button>
                            </div>
                        </nav>
                    )}
                </section>
            </div>
        </div>
    );
}
