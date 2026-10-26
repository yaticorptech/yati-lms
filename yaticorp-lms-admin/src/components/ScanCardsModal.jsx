/**
 * Students → Scan cards: scan card after card (or type their numbers), see
 * each one checked in a list, then add them all to the organization at the
 * end. Adding links a card nobody has registered with yet, so its student
 * joins when they register, and brings in at once a registered student who
 * belongs to no organization (server: organizations/services/cardLink.js).
 */
import React, { useCallback, useRef, useState } from 'react';
import { Loader2, ScanLine, X, Plus, CheckCircle2, RotateCw, CameraOff } from 'lucide-react';
import api from '../utils/api';
import { useQrReader } from '../utils/qrReader';
import { Dialog, DialogTitle, Banner, BTN, BTN2, INPUT } from './orgUi';

const SCANNER_ID = 'qr-reader-org-cards';

// What a checked card will do, as a label and colour.
const LABEL = {
    ready: ['Will be linked', 'bg-emerald-100 text-emerald-800'],
    student: ['Student joins', 'bg-emerald-100 text-emerald-800'],
    linked: ['Already linked', 'bg-slate-100 text-slate-600'],
    member: ['Already a member', 'bg-slate-100 text-slate-600'],
    member_elsewhere: ['Other organization', 'bg-amber-100 text-amber-800'],
    linked_elsewhere: ['Other organization', 'bg-amber-100 text-amber-800'],
    not_verified: ['Not verified', 'bg-amber-100 text-amber-800'],
    not_student: ['Not a student card', 'bg-slate-100 text-slate-600'],
    inactive: ['Inactive', 'bg-red-100 text-red-700'],
    not_found: ['Not found', 'bg-red-100 text-red-700'],
    error: ['Not checked', 'bg-red-100 text-red-700']
};

export default function ScanCardsModal({ onClose, onAdded }) {
    const [cards, setCards] = useState([]);             // checked cards, newest first
    const [typed, setTyped] = useState('');
    const [note, setNote] = useState('');
    const [checking, setChecking] = useState(false);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(null);             // the server's answer after adding
    const busy = useRef(false);
    const last = useRef({ code: '', at: 0 });
    const listRef = useRef([]);
    listRef.current = cards;

    // One card at a time; the same card held in view is read once.
    const check = useCallback(async (raw) => {
        const code = String(raw || '').trim();
        const now = Date.now();
        if (!code || busy.current || (code === last.current.code && now - last.current.at < 4000)) return;
        last.current = { code, at: now };
        busy.current = true; setChecking(true); setNote('');
        try {
            const r = await api.post('/organizations/me/cards/check', { code });
            const key = r.data.cardNumber || code;
            if (listRef.current.some((c) => (c.cardNumber || c.code) === key)) setNote(`${key} is already in the list.`);
            else { setCards((x) => [{ ...r.data, key: `${key}-${now}` }, ...x]); navigator.vibrate?.(60); }
        } catch (err) {
            setCards((x) => [{ code, result: 'error', addable: false, message: err.response?.data?.message || 'This card could not be checked.', key: `${code}-${now}` }, ...x]);
        } finally { busy.current = false; setChecking(false); }
    }, []);

    // The camera stays open until the cards are added.
    const camera = useQrReader(SCANNER_ID, check, !done);

    const addTyped = (e) => {
        e.preventDefault();
        if (!typed.trim()) return;
        last.current = { code: '', at: 0 };     // typing the same number again is deliberate
        check(typed);
        setTyped('');
    };

    const addable = cards.filter((c) => c.addable);
    const addAll = async () => {
        setAdding(true); setError('');
        try {
            const r = await api.post('/organizations/me/cards', { codes: addable.map((c) => c.code) });
            setDone(r.data);
        } catch (err) {
            setError(err.response?.data?.message || 'The cards could not be added. Please try again.');
        } finally { setAdding(false); }
    };

    const finish = () => { if (done) onAdded(done.message); else onClose(); };
    const problems = done ? done.results.filter((r) => !r.done) : [];

    return (
        <Dialog onClose={() => { if (!adding) finish(); }} size="max-w-lg">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800"><ScanLine size={20} className="text-indigo-600" /> Scan cards</DialogTitle>
                <button type="button" onClick={finish} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
                {done ? (
                    <>
                        <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                            <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {done.message}
                        </p>
                        {problems.length > 0 && (
                            <div>
                                <p className="mb-2 text-xs font-bold text-slate-500">Not added</p>
                                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
                                    {problems.map((r) => (
                                        <li key={r.code} className="px-3 py-2"><span className="font-mono text-slate-800">{r.cardNumber || r.code}</span> <span className="block text-xs text-slate-500">{r.message}</span></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <p className="text-xs text-slate-500">Linked cards wait for their students: whoever registers with one joins your organization at once.</p>
                    </>
                ) : (
                    <>
                        <div>
                            {/* Kept in the page while hidden: Try again starts the camera in it. */}
                            <div id={SCANNER_ID} className={camera.error ? 'hidden' : 'min-h-[12rem] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900'} />
                            {camera.error ? (
                                <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                    <CameraOff size={18} className="mt-0.5 shrink-0" aria-hidden />
                                    <div className="min-w-0 flex-1">
                                        <p>{camera.error}</p>
                                        <button type="button" onClick={camera.retry} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"><RotateCw size={13} /> Try again</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-1 flex items-center justify-center gap-2 text-center text-xs text-slate-400">{checking && <Loader2 size={12} className="animate-spin" />} Show the cards one after another. Each one is checked and listed.</p>
                            )}
                        </div>

                        <form onSubmit={addTyped} className="flex gap-2">
                            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type a card number or QR code" aria-label="Card number or QR code"
                                autoComplete="off" className={`${INPUT} min-w-0 flex-1 font-mono`} />
                            <button type="submit" disabled={!typed.trim() || checking} className={`${BTN2} shrink-0`}><Plus size={15} /> Add</button>
                        </form>
                        {note && <p className="text-xs text-amber-700">{note}</p>}

                        {cards.length > 0 && (
                            <div>
                                <p className="mb-2 text-xs font-bold text-slate-500">{cards.length} card{cards.length === 1 ? '' : 's'} · {addable.length} to add</p>
                                <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 text-sm">
                                    {cards.map((c) => {
                                        const [label, tone] = LABEL[c.result] || LABEL.error;
                                        return (
                                            <li key={c.key} className="flex items-center gap-3 px-3 py-2">
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate font-mono text-slate-800">{c.cardNumber || c.code}</span>
                                                    <span className="block text-xs text-slate-500">{c.message}</span>
                                                </span>
                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{label}</span>
                                                <button type="button" onClick={() => setCards((x) => x.filter((y) => y.key !== c.key))} aria-label={`Remove ${c.cardNumber || c.code} from the list`}
                                                    className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={14} /></button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        {error && <Banner>{error}</Banner>}
                    </>
                )}
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-5 py-4">
                {done ? (
                    <button type="button" onClick={finish} className={BTN}>Done</button>
                ) : (
                    <>
                        <button type="button" onClick={onClose} className={BTN2} disabled={adding}>Cancel</button>
                        <button type="button" onClick={addAll} disabled={!addable.length || adding} className={BTN}>
                            {adding && <Loader2 size={15} className="animate-spin" />} Add {addable.length || ''} card{addable.length === 1 ? '' : 's'} to organization
                        </button>
                    </>
                )}
            </div>
        </Dialog>
    );
}
