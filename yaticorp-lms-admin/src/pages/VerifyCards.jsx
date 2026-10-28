/**
 * Verify cards (super admins only). A card can be used to register — as a
 * student or a teacher — only after it is verified here. Cards added here are
 * verified at once. Every card not yet registered waits for this, old or
 * new. Registered cards are shown (with how they were verified) but never
 * changed. "Scan and verify" reads each card's QR code with the camera and
 * verifies it on the spot, one card after another.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { CreditCard, ShieldCheck, Upload, Download, Plus, Loader2, Search, Undo2, CheckCircle2, AlertTriangle, ScanLine, X, RotateCw, CameraOff } from 'lucide-react';
import api from '../utils/api';
import { useQrReader } from '../utils/qrReader';
import { INPUT, LABEL, BTN, BTN2, CARD } from '../components/orgUi';

// All first, then the cards in the order they move through (2026-10-28).
const STATES = [['all', 'All'], ['waiting', 'Waiting'], ['verified', 'Verified'], ['registered', 'Registered'], ['inactive', 'Inactive']];
const BADGE = {
    waiting: 'bg-amber-100 text-amber-800',
    verified: 'bg-emerald-100 text-emerald-800',
    registered: 'bg-slate-100 text-slate-600',
    inactive: 'bg-red-100 text-red-700'
};
const RESULT_TONE = { verified: 'text-emerald-700', added: 'text-emerald-700', already_verified: 'text-slate-500', registered: 'text-slate-500' };
/** How a card came to be usable, for the list. */
const howVerified = (c) => {
    if (c.state === 'verified') return `Verified ${fmt(c.verifiedAt)}`;
    if (c.state === 'waiting') return c.createdAt ? `Added ${fmt(c.createdAt)}` : '';
    if (c.state !== 'registered') return '';
    if (c.verifiedVia === 'admin') return `Verified by you ${fmt(c.verifiedAt)}`;
    if (c.verifiedVia === 'account') return 'Verified when an admin added the holder';
    return 'Registered before card checks';
};
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const errorOf = (err, fallback) => err.response?.data?.message || (!err.response ? 'Check your connection and try again.' : fallback);

/** The rows of the first sheet of an Excel file, as objects keyed by heading. */
const readSheet = async (file) => {
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: '' });
};
/** A cell by its heading, loosely: "Card Number", "cardnumber" and "CardNumber" are one. */
const pick = (row, ...names) => {
    const key = Object.keys(row).find((k) => names.includes(k.replace(/[^a-z]/gi, '').toLowerCase()));
    return key === undefined ? '' : String(row[key]).trim();
};

const Results = ({ results, summary, kind }) => {
    if (!results) return null;
    const problems = results.filter((r) => !['verified', 'added', 'already_verified'].includes(r.result));
    return (
        <div className="mt-3 space-y-2" role="status">
            <div className="flex flex-wrap gap-2 text-xs font-bold">
                {kind === 'verify' ? (
                    <>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">{summary.verified} verified</span>
                        {summary.alreadyVerified > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{summary.alreadyVerified} already verified</span>}
                        {summary.registered > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{summary.registered} already registered (left as they are)</span>}
                        {summary.notFound > 0 && <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">{summary.notFound} not found</span>}
                        {summary.invalid + summary.inactive > 0 && <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">{summary.invalid + summary.inactive} not usable</span>}
                    </>
                ) : (
                    <>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">{summary.added} added and verified</span>
                        {summary.failed > 0 && <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">{summary.failed} not added</span>}
                    </>
                )}
            </div>
            {problems.length > 0 && (
                <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 text-sm">
                    {problems.map((r, i) => (
                        <li key={`${r.cardNumber}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2">
                            <span className="font-mono text-slate-800">{r.row ? `Row ${r.row} · ` : ''}{r.cardNumber || '—'}</span>
                            <span className={`text-xs ${RESULT_TONE[r.result] || 'text-red-600'}`}>{r.message}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const SCAN_BADGE = {
    verified: ['Verified', 'bg-emerald-100 text-emerald-800'],
    already_verified: ['Already verified', 'bg-slate-100 text-slate-600'],
    registered: ['Registered', 'bg-slate-100 text-slate-600'],
    inactive: ['Inactive', 'bg-red-100 text-red-700'],
    not_found: ['Not found', 'bg-red-100 text-red-700'],
    error: ['Not checked', 'bg-red-100 text-red-700']
};
const SCANNER_ID = 'verify-card-scanner';

/**
 * The camera, verifying each card as its QR code is read. It stays open for
 * the next card; the same card held in view is read once (not again for a
 * few seconds), and one card is checked at a time.
 */
const ScanDialog = ({ onClose }) => {
    const [results, setResults] = useState([]);           // newest first
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const last = useRef({ code: '', at: 0 });

    const onRead = useCallback(async (decoded) => {
        const code = String(decoded || '').trim();
        const now = Date.now();
        if (!code || busyRef.current || (code === last.current.code && now - last.current.at < 4000)) return;
        last.current = { code, at: now };
        busyRef.current = true; setBusy(true);
        try {
            const r = await api.post('/admin/cards/scan', { code });
            setResults((x) => [{ ...r.data, at: now }, ...x].slice(0, 100));
            navigator.vibrate?.(60);
        } catch (err) {
            setResults((x) => [{ code, result: 'error', message: errorOf(err, 'That card could not be checked.'), at: now }, ...x].slice(0, 100));
        } finally { busyRef.current = false; setBusy(false); }
    }, []);

    const camera = useQrReader(SCANNER_ID, onRead);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const verifiedCount = results.filter((r) => r.result === 'verified').length;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="scan-title" onClick={(e) => e.stopPropagation()}
                className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                    <h2 id="scan-title" className="flex items-center gap-2 font-bold text-slate-800"><ScanLine size={18} className="text-emerald-600" /> Scan and verify</h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {/* Kept in the page while hidden: Try again starts the camera in it. */}
                    <div id={SCANNER_ID} className={camera.error ? 'hidden' : 'min-h-[12rem] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900'} />
                    {camera.error
                        ? (
                            <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                <CameraOff size={18} className="mt-0.5 shrink-0" aria-hidden />
                                <div className="min-w-0 flex-1">
                                    <p>{camera.error.replace('Type the card numbers below instead.', 'Type the card numbers on the page instead.').replace(', or type the card numbers below.', ', or type the card numbers on the page.')}</p>
                                    <button type="button" onClick={camera.retry} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"><RotateCw size={13} /> Try again</button>
                                </div>
                            </div>
                        )
                        : <p className="mt-2 flex items-center justify-center gap-2 text-center text-xs text-slate-500">{busy && <Loader2 size={13} className="animate-spin" />} Hold each card&apos;s QR code in the box. It is verified as soon as it is read; then show the next card.</p>}

                    {results.length > 0 && (
                        <div className="mt-4" role="status" aria-live="polite">
                            <p className="mb-2 text-xs font-bold text-slate-500">{results.length} scanned · {verifiedCount} verified</p>
                            <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 text-sm">
                                {results.map((r) => {
                                    const [label, tone] = SCAN_BADGE[r.result] || SCAN_BADGE.error;
                                    return (
                                        <li key={r.at} className="flex items-start justify-between gap-3 px-3 py-2">
                                            <span className="min-w-0">
                                                <span className="block truncate font-mono text-slate-800">{r.cardNumber || r.code}</span>
                                                <span className="block text-xs text-slate-500">{r.message}</span>
                                            </span>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{label}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="flex justify-end border-t border-slate-100 px-5 py-3">
                    <button type="button" onClick={onClose} className={BTN}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default function VerifyCards() {
    const [state, setState] = useState('waiting');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [busyRow, setBusyRow] = useState('');
    const [rowNote, setRowNote] = useState('');
    // "Verify all": asked once (confirmAll), then sent (verifyingAll).
    const [confirmAll, setConfirmAll] = useState(false);
    const [verifyingAll, setVerifyingAll] = useState(false);

    const [numbers, setNumbers] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);
    const [scanning, setScanning] = useState(false);

    const [card, setCard] = useState({ CardNumber: '', CVV: '', qrCodeNumber: '', SerialNumber: '' });
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState('');
    const [addResult, setAddResult] = useState(null);
    const verifyFile = useRef(null);
    const addFile = useRef(null);

    const load = useCallback(() => api.get('/admin/cards', { params: { state, q: q.trim() || undefined, page } })
        .then((r) => { setData(r.data); setLoadError(''); })
        .catch((err) => setLoadError(errorOf(err, 'The cards could not be loaded.'))), [state, q, page]);
    useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

    const verify = async (list) => {
        setVerifying(true); setVerifyError(''); setVerifyResult(null);
        try {
            const r = await api.post('/admin/cards/verify', { cardNumbers: list });
            setVerifyResult(r.data);
            if (r.data.summary.verified) setNumbers('');
            load();
        } catch (err) { setVerifyError(errorOf(err, 'The cards could not be verified.')); } finally { setVerifying(false); }
    };

    const add = async (cards) => {
        setAdding(true); setAddError(''); setAddResult(null);
        try {
            const r = await api.post('/admin/cards', { cards });
            setAddResult(r.data);
            setCard({ CardNumber: '', CVV: '', qrCodeNumber: '', SerialNumber: '' });
            load();
        } catch (err) {
            if (err.response?.data?.results) setAddResult(err.response.data); else setAddError(errorOf(err, 'The card could not be added.'));
        } finally { setAdding(false); }
    };

    const fromExcel = async (file, kind) => {
        if (!file) return;
        try {
            const rows = await readSheet(file);
            if (kind === 'verify') {
                const list = rows.map((r) => pick(r, 'cardnumber', 'card', 'number') || String(Object.values(r)[0] ?? '')).filter(Boolean);
                if (!list.length) { setVerifyError('No card numbers were found in that file.'); return; }
                await verify(list);
            } else {
                const cards = rows.map((r) => ({ CardNumber: pick(r, 'cardnumber'), CVV: pick(r, 'cvv'), qrCodeNumber: pick(r, 'qrcodenumber', 'qrcode', 'qr'), SerialNumber: pick(r, 'serialnumber', 'serial') })).filter((c) => c.CardNumber || c.CVV || c.qrCodeNumber);
                if (!cards.length) { setAddError('No cards were found in that file. Use the template.'); return; }
                await add(cards);
            }
        } catch { (kind === 'verify' ? setVerifyError : setAddError)('That file could not be read. Upload an Excel file (.xlsx).'); }
        finally { if (verifyFile.current) verifyFile.current.value = ''; if (addFile.current) addFile.current.value = ''; }
    };

    const template = () => {
        const sheet = XLSX.utils.aoa_to_sheet([['CardNumber', 'CVV', 'QRCodeNumber', 'SerialNumber'], ['123456789012', 'A1B2C', 'QR123456', 'SN0001']]);
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, 'Cards');
        XLSX.writeFile(book, 'new_cards_template.xlsx');
    };

    const rowAction = async (c) => {
        setBusyRow(c._id); setRowNote('');
        try {
            if (c.state === 'waiting') { await api.post('/admin/cards/verify', { cardNumbers: [c.CardNumber] }); setRowNote(`Card ${c.CardNumber} is verified.`); }
            else { const r = await api.post(`/admin/cards/${c._id}/unverify`); setRowNote(r.data.message); }
            load();
        } catch (err) { setRowNote(errorOf(err, 'That did not work.')); } finally { setBusyRow(''); }
    };

    // "Verify all" on Waiting, "Unverify all" on Verified — the same bar.
    const bulk = state === 'waiting' ? 'verify' : state === 'verified' ? 'unverify' : null;
    const runAll = async () => {
        setVerifyingAll(true); setRowNote('');
        try { const r = await api.post(`/admin/cards/${bulk}-all`, { q: q.trim() || undefined }); setRowNote(r.data.message); setConfirmAll(false); load(); }
        catch (err) { setRowNote(errorOf(err, bulk === 'verify' ? 'The cards could not be verified.' : 'The verifications could not be undone.')); } finally { setVerifyingAll(false); }
    };

    const counts = data?.counts || { waiting: 0, verified: 0, registered: 0, inactive: 0 };
    // With a search, "all" means the cards in this tab that match it (the list's total).
    const allCount = !bulk ? 0 : q.trim() ? data?.total || 0 : counts[state];

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800"><CreditCard className="text-indigo-600" /> Verify cards</h1>
                <p className="mt-1 text-sm text-slate-500">A card can be used to register — as a student or a teacher — only after you verify it. Every card that is not registered yet waits here for you. Registered cards are never changed.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[['waiting', 'Waiting for you', 'text-amber-600'], ['verified', 'Verified, not yet used', 'text-emerald-600'], ['registered', 'Registered', 'text-slate-700'], ['inactive', 'Inactive', 'text-red-600']].map(([key, label, tone]) => (
                    <button key={key} type="button" onClick={() => { setState(key); setPage(1); setConfirmAll(false); }} aria-pressed={state === key}
                        className={`${CARD} p-4 text-left transition-shadow hover:shadow-md ${state === key ? 'ring-2 ring-indigo-500' : ''}`}>
                        <p className="text-xs font-semibold text-slate-500">{label}</p>
                        <p className={`mt-1 text-2xl font-black ${tone}`}>{counts[key].toLocaleString('en-IN')}</p>
                    </button>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <section className={`${CARD} p-5`} aria-labelledby="verify-title">
                    <h2 id="verify-title" className="flex items-center gap-2 font-bold text-slate-800"><ShieldCheck size={18} className="text-emerald-600" /> Verify cards</h2>
                    <p className="mt-1 text-sm text-slate-500">Enter the card numbers that may be used to register.</p>
                    <label htmlFor="verify-numbers" className={`${LABEL} mt-3`}>Card numbers</label>
                    <textarea id="verify-numbers" rows={5} value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder={'One per line, or separated by commas\n123456789012\n123456789013'} className={`${INPUT} resize-y font-mono`} />
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => verify(numbers)} disabled={verifying || !numbers.trim()} className={BTN}>{verifying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Verify</button>
                        <button type="button" onClick={() => verifyFile.current?.click()} disabled={verifying} className={BTN2}><Upload size={16} /> Upload Excel</button>
                        <input ref={verifyFile} type="file" accept=".xlsx,.xls,.csv" className="hidden" aria-label="Excel file of card numbers to verify" onChange={(e) => fromExcel(e.target.files?.[0], 'verify')} />
                        <button type="button" onClick={() => setScanning(true)} className={BTN2}><ScanLine size={16} /> Scan and verify</button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Excel: a column headed CardNumber (or just the numbers in the first column).</p>
                    {verifyError && <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"><AlertTriangle size={15} /> {verifyError}</p>}
                    <Results results={verifyResult?.results} summary={verifyResult?.summary} kind="verify" />
                </section>

                <section className={`${CARD} p-5`} aria-labelledby="add-title">
                    <h2 id="add-title" className="flex items-center gap-2 font-bold text-slate-800"><Plus size={18} className="text-indigo-600" /> Add new cards</h2>
                    <p className="mt-1 text-sm text-slate-500">Cards added here are verified at once.</p>
                    <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); add([card]); }} noValidate>
                        <div><label htmlFor="new-card-number" className={LABEL}>Card number</label><input id="new-card-number" inputMode="numeric" maxLength={14} value={card.CardNumber} onChange={(e) => setCard((c) => ({ ...c, CardNumber: e.target.value }))} placeholder="12 digits" className={`${INPUT} font-mono`} /></div>
                        <div><label htmlFor="new-card-cvv" className={LABEL}>CVV</label><input id="new-card-cvv" maxLength={5} value={card.CVV} onChange={(e) => setCard((c) => ({ ...c, CVV: e.target.value.toUpperCase() }))} placeholder="5 letters or digits" className={`${INPUT} font-mono`} /></div>
                        <div><label htmlFor="new-card-qr" className={LABEL}>QR code number</label><input id="new-card-qr" maxLength={100} value={card.qrCodeNumber} onChange={(e) => setCard((c) => ({ ...c, qrCodeNumber: e.target.value }))} className={`${INPUT} font-mono`} /></div>
                        <div><label htmlFor="new-card-serial" className={LABEL}>Serial number (optional)</label><input id="new-card-serial" maxLength={60} value={card.SerialNumber} onChange={(e) => setCard((c) => ({ ...c, SerialNumber: e.target.value }))} className={`${INPUT} font-mono`} /></div>
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                            <button type="submit" disabled={adding || !card.CardNumber.trim()} className={BTN}>{adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add card</button>
                            <button type="button" onClick={() => addFile.current?.click()} disabled={adding} className={BTN2}><Upload size={16} /> Upload Excel</button>
                            <button type="button" onClick={template} className={BTN2}><Download size={16} /> Template</button>
                            <input ref={addFile} type="file" accept=".xlsx,.xls,.csv" className="hidden" aria-label="Excel file of new cards" onChange={(e) => fromExcel(e.target.files?.[0], 'add')} />
                        </div>
                    </form>
                    {addError && <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"><AlertTriangle size={15} /> {addError}</p>}
                    <Results results={addResult?.results} summary={addResult?.summary} kind="add" />
                </section>
            </div>

            <section className={`${CARD} p-4 sm:p-5`} aria-labelledby="cards-title">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="cards-title" className="font-bold text-slate-800">Cards</h2>
                    <div className="relative w-full sm:w-72">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search card, serial or QR number" aria-label="Search cards" className={`${INPUT} pl-9`} />
                    </div>
                </div>
                {/* One line on a phone too (2026-10-28): each choice takes the width
                    its word needs plus an even share of the rest, in smaller type. */}
                <div className="mt-3 flex gap-0.5 rounded-2xl bg-slate-100 p-1 sm:inline-flex sm:gap-1" role="group" aria-label="Show">
                    {STATES.map(([key, label]) => (
                        <button key={key} type="button" aria-pressed={state === key} onClick={() => { setState(key); setPage(1); setConfirmAll(false); }}
                            className={`min-w-0 flex-auto truncate rounded-xl px-1 py-2 text-[11px] font-bold sm:flex-none sm:px-3 sm:text-xs ${state === key ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
                    ))}
                </div>
                {bulk && allCount > 0 && (
                    <div className={`mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 ${bulk === 'verify' ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                        {!confirmAll ? (
                            <>
                                <span className="min-w-0 flex-1 text-sm text-slate-700">
                                    {allCount.toLocaleString('en-IN')} {allCount === 1 ? 'card is' : 'cards are'} {bulk === 'verify' ? 'waiting' : 'verified and not yet registered'}{q.trim() ? ' (matching your search)' : ''}.
                                </span>
                                <button type="button" onClick={() => setConfirmAll(true)} className={bulk === 'verify' ? BTN : BTN2}>
                                    {bulk === 'verify' ? <><CheckCircle2 size={16} /> Verify all</> : <><Undo2 size={16} /> Unverify all</>}
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
                                    {bulk === 'verify'
                                        ? `Verify all ${allCount.toLocaleString('en-IN')}${q.trim() ? ' matching' : ''} waiting cards? Anyone holding one of them can then register.`
                                        : `Unverify all ${allCount.toLocaleString('en-IN')}${q.trim() ? ' matching' : ''} verified cards? They can't be used to register until verified again. Registered cards are not affected.`}
                                </span>
                                <button type="button" onClick={() => setConfirmAll(false)} disabled={verifyingAll} className={BTN2}>Cancel</button>
                                <button type="button" onClick={runAll} disabled={verifyingAll}
                                    className={bulk === 'verify' ? BTN : 'inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50'}>
                                    {verifyingAll ? <Loader2 size={16} className="animate-spin" /> : bulk === 'verify' ? <CheckCircle2 size={16} /> : <Undo2 size={16} />} {bulk === 'verify' ? 'Yes, verify all' : 'Yes, unverify all'}
                                </button>
                            </>
                        )}
                    </div>
                )}
                {rowNote && <p role="status" className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{rowNote}</p>}
                {loadError && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{loadError} <button type="button" onClick={load} className="font-bold underline">Try again</button></p>}
                {!data && !loadError && <p className="mt-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading cards…</p>}
                {data && !data.cards.length && <p className="mt-6 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No cards here.</p>}
                {data?.cards.length > 0 && (
                    <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                        {data.cards.map((c) => (
                            <li key={c._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5">
                                <span className="min-w-0 flex-1">
                                    <span className="block font-mono text-sm font-semibold text-slate-800">{c.CardNumber}</span>
                                    <span className="block truncate text-xs text-slate-400">{[c.SerialNumber && `Serial ${c.SerialNumber}`, `QR ${c.qrCodeNumber}`].filter(Boolean).join(' · ')}</span>
                                </span>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${BADGE[c.state]}`}>{c.state}</span>
                                <span className="w-full text-xs text-slate-500 sm:w-56">{howVerified(c)}</span>
                                {c.state === 'waiting' && <button type="button" onClick={() => rowAction(c)} disabled={busyRow === c._id} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50">{busyRow === c._id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Verify</button>}
                                {c.state === 'verified' && <button type="button" onClick={() => rowAction(c)} disabled={busyRow === c._id} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-red-600 disabled:opacity-50">{busyRow === c._id ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />} Unverify</button>}
                            </li>
                        ))}
                    </ul>
                )}
                {data && data.pages > 1 && (
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={BTN2}>Previous</button>
                        <span>Page {data.page} of {data.pages}</span>
                        <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className={BTN2}>Next</button>
                    </div>
                )}
            </section>
            {scanning && <ScanDialog onClose={() => { setScanning(false); load(); }} />}
        </div>
    );
}
