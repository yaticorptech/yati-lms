/**
 * Demo cards (super admin): the presentation cards. Scan a card (or type its number) to make it
 * one — its scan at the student sign-in then opens the dashboard with no password, and it sees
 * every section. Reset gives a card a brand-new, empty account for the next presentation.
 * Server: src/routes/demoCardRoutes.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Presentation, ScanLine, Keyboard, RotateCcw, Trash2, Loader2, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { useQrReader } from '../utils/qrReader';

const READER_ID = 'demo-card-reader';
const PER_PAGE = 10;
const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const spaced = (n) => String(n).replace(/(.{4})(?=.)/g, '$1 ');

/** The camera, reading one card at a time. */
function Scanner({ onRead, busy }) {
    const { error, retry } = useQrReader(READER_ID, (text) => { if (!busy) onRead(text); }, true);
    return (
        <div>
            <div id={READER_ID} className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-slate-900" />
            {error ? (
                <p className="mt-3 flex items-start gap-2 text-sm text-rose-600"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error} <button type="button" onClick={retry} className="font-bold underline">Try again</button></p>
            ) : (
                <p className="mt-3 text-center text-xs text-slate-500">Point the camera at the QR code on the card</p>
            )}
        </div>
    );
}

export default function DemoCards() {
    const [cards, setCards] = useState(null);
    const [mode, setMode] = useState('camera');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState('');
    const [notice, setNotice] = useState(null);
    // A card scanned twice: its row lights up for a moment.
    const [flash, setFlash] = useState('');
    const [page, setPage] = useState(0);
    const pages = Math.max(1, Math.ceil((cards?.length || 0) / PER_PAGE));
    // A list that shrank (a card removed) keeps the page inside it.
    useEffect(() => { if (page > pages - 1) setPage(pages - 1); }, [page, pages]);

    const load = useCallback(() => api.get('/admin/demo-cards').then((r) => setCards(r.data.cards)).catch(() => setCards([])), []);
    useEffect(() => { load(); }, [load]);

    const act = async (key, call) => {
        setBusy(key); setNotice(null);
        try { const r = await call(); if (r.data.cards) setCards(r.data.cards); setNotice({ ok: true, text: r.data.message }); }
        catch (err) {
            const d = err.response?.data;
            if (d?.code === 'ALREADY_DEMO') {
                setNotice({ info: true, text: d.message });
                setFlash(d.cardNumber);
                // Open the page the card is on before pointing at it.
                const at = (cards || []).findIndex((c) => c.cardNumber === d.cardNumber);
                if (at >= 0) setPage(Math.floor(at / PER_PAGE));
                setTimeout(() => document.getElementById(`demo-${d.cardNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                setTimeout(() => setFlash(''), 2600);
            } else {
                setNotice({ ok: false, text: d?.message || 'That did not go through.' });
            }
        }
        finally { setBusy(''); }
    };
    // The camera reads the same QR many times a second: one add per card, then a pause.
    const lastRead = useRef({ code: '', at: 0 });
    const add = (value) => {
        const v = String(value || '').trim(); if (!v) return;
        if (lastRead.current.code === v && Date.now() - lastRead.current.at < 6000) return;
        lastRead.current = { code: v, at: Date.now() }; act('add', () => api.post('/admin/demo-cards', { code: v })).then(() => setCode(''));
    };
    const reset = (c) => {
        if (!window.confirm(`Reset ${c.account?.name || spaced(c.cardNumber)}?\n\nEverything this card has done — courses, progress, Career Path, XP, wallet, certificates, interviews, devices — is deleted. It opens as a brand-new card. This cannot be undone.`)) return;
        act(`reset:${c.cardNumber}`, () => api.post(`/admin/demo-cards/${c.cardNumber}/reset`));
    };
    const remove = (c) => {
        if (!window.confirm(`Stop using ${spaced(c.cardNumber)} as a demo card? It will need its password again.`)) return;
        act(`del:${c.cardNumber}`, () => api.delete(`/admin/demo-cards/${c.cardNumber}`));
    };

    return (
        <div className="space-y-6 pb-10 animate-fade-in">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-6 ring-1 ring-indigo-100 sm:p-8">
                <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-fuchsia-200/50 blur-3xl" />
                <div className="relative flex flex-wrap items-start gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30"><Presentation size={24} /></span>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-black text-slate-900">Demo cards</h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-600">Cards for presentations. Scanning one at the student sign-in opens its dashboard <span className="font-bold">with no password</span>, with every section unlocked. Typing its number still asks for the password. Reset gives a card a brand-new, empty account.</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
                {/* Add a card */}
                <section className="h-fit rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                    <h2 className="flex items-center gap-2 text-sm font-black text-slate-900"><Sparkles size={16} className="text-indigo-500" /> Add a demo card</h2>
                    <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                        {[['camera', 'Scan', ScanLine], ['type', 'Type number', Keyboard]].map(([id, label, Icon]) => (
                            <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id}
                                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${mode === id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                                <Icon size={14} /> {label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4">
                        {mode === 'camera' ? <Scanner onRead={add} busy={!!busy} /> : (
                            <form onSubmit={(e) => { e.preventDefault(); add(code); }} className="space-y-2">
                                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Card number or QR number" autoFocus
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                                <button type="submit" disabled={busy === 'add' || !code.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                                    {busy === 'add' && <Loader2 size={16} className="animate-spin" />} Add as demo card
                                </button>
                            </form>
                        )}
                    </div>
                    {busy === 'add' && <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Adding the card…</p>}
                    {notice && (
                        <p role="status" className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-sm font-semibold ${notice.ok ? 'bg-emerald-50 text-emerald-800' : notice.info ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-rose-50 text-rose-700'}`}>
                            {notice.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : notice.info ? <ShieldCheck size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />} {notice.text}
                        </p>
                    )}
                </section>

                {/* The cards */}
                <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-black text-slate-900">All demo cards</h2>
                        {cards && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{cards.length}</span>}
                    </div>
                    {!cards ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" /> : cards.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-500">No demo cards yet. Scan one to add it.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {cards.slice(page * PER_PAGE, (page + 1) * PER_PAGE).map((c) => (
                                <li key={c.cardNumber} id={`demo-${c.cardNumber}`} className={`flex flex-wrap items-center gap-3 rounded-2xl py-3 transition-colors duration-500 ${flash === c.cardNumber ? 'bg-amber-50 px-3 ring-2 ring-amber-300' : ''}`}>
                                    <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[10px] font-black tracking-widest text-white shadow-sm">DEMO</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-slate-900">{spaced(c.cardNumber)}</span>
                                            {c.builtIn && <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-100"><ShieldCheck size={11} /> Built-in</span>}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {c.account ? <>{c.account.name} · Level {c.account.level} · {c.account.xp} XP · last active {fmt(c.account.lastActiveDate)}</> : 'No account yet — made on the first scan or reset'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => reset(c)} disabled={!!busy}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                                            {busy === `reset:${c.cardNumber}` ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reset
                                        </button>
                                        {!c.builtIn && (
                                            <button type="button" onClick={() => remove(c)} disabled={!!busy} aria-label={`Remove ${c.cardNumber} from demo cards`} title="Remove from demo cards"
                                                className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                                                {busy === `del:${c.cardNumber}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {cards && cards.length > PER_PAGE && (
                        <nav aria-label="Demo card pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <p className="text-xs text-slate-500">Showing {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, cards.length)} of {cards.length}</p>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 0} aria-label="Previous page"
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"><ChevronLeft size={16} /></button>
                                {Array.from({ length: pages }, (_, i) => (
                                    <button key={i} type="button" onClick={() => setPage(i)} aria-current={page === i ? 'page' : undefined}
                                        className={`h-8 min-w-8 rounded-lg px-2 text-sm font-bold transition-colors ${page === i ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{i + 1}</button>
                                ))}
                                <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= pages - 1} aria-label="Next page"
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"><ChevronRight size={16} /></button>
                            </div>
                        </nav>
                    )}
                </section>
            </div>
        </div>
    );
}
