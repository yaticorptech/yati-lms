/**
 * Verify cards (super admins only). A card can be used to register — as a
 * student or a teacher — only after it is verified here. Cards added here are
 * verified at once. Every card not yet registered waits for this, old or
 * new. Registered cards are shown (with how they were verified) but never
 * changed.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { CreditCard, ShieldCheck, Upload, Download, Plus, Loader2, Search, Undo2, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { INPUT, LABEL, BTN, BTN2, CARD } from '../components/orgUi';

const STATES = [['waiting', 'Waiting'], ['verified', 'Verified'], ['registered', 'Registered'], ['inactive', 'Inactive'], ['all', 'All']];
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
    if (c.state === 'waiting') return `Added ${fmt(c.createdAt)}`;
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

export default function VerifyCards() {
    const [state, setState] = useState('waiting');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [busyRow, setBusyRow] = useState('');
    const [rowNote, setRowNote] = useState('');

    const [numbers, setNumbers] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);

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

    const counts = data?.counts || { waiting: 0, verified: 0, registered: 0, inactive: 0 };

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800"><CreditCard className="text-indigo-600" /> Verify cards</h1>
                <p className="mt-1 text-sm text-slate-500">A card can be used to register — as a student or a teacher — only after you verify it. Every card that is not registered yet waits here for you. Registered cards are never changed.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[['waiting', 'Waiting for you', 'text-amber-600'], ['verified', 'Verified, not yet used', 'text-emerald-600'], ['registered', 'Registered', 'text-slate-700'], ['inactive', 'Inactive', 'text-red-600']].map(([key, label, tone]) => (
                    <button key={key} type="button" onClick={() => { setState(key); setPage(1); }} aria-pressed={state === key}
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

            <section className={`${CARD} p-5`} aria-labelledby="cards-title">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="cards-title" className="font-bold text-slate-800">Cards</h2>
                    <div className="relative w-full sm:w-72">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search card, serial or QR number" aria-label="Search cards" className={`${INPUT} pl-9`} />
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 sm:inline-flex" role="group" aria-label="Show">
                    {STATES.map(([key, label]) => (
                        <button key={key} type="button" aria-pressed={state === key} onClick={() => { setState(key); setPage(1); }}
                            className={`min-w-0 truncate rounded-xl px-3 py-2 text-xs font-bold ${state === key ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
                    ))}
                </div>
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
        </div>
    );
}
