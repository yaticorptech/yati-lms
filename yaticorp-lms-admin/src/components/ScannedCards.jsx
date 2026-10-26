/**
 * Students → the cards this organization scanned in (Scan cards) that are
 * still waiting for their student, under the student list. A card leaves
 * this list once its student registers (or signs in) with it: they join the
 * organization and appear in All students instead. A waiting card can be
 * unlinked. Reloaded every 30 seconds, like the student list, and when
 * `version` changes (more cards added).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScanLine, Clock, Unlink, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { CARD, Banner } from './orgUi';
import { formatDate } from '../utils/dates';

const REFRESH_MS = 30000;

export default function ScannedCards({ version = 0 }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [note, setNote] = useState('');

    const load = useCallback(() => api.get('/organizations/me/cards')
        .then((r) => { setData(r.data); setError(''); })
        .catch((err) => setError(err.response?.data?.message || 'The scanned cards could not be loaded.')), []);
    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load, version]);

    const unlink = async (c) => {
        setBusy(c._id); setNote('');
        try { const r = await api.delete(`/organizations/me/cards/${c._id}`); setNote(r.data.message); await load(); }
        catch (err) { setNote(err.response?.data?.message || 'The card could not be unlinked.'); } finally { setBusy(''); }
    };

    if (error) return <Banner onClose={() => setError('')}>{error}</Banner>;
    if (!data) return null;
    // A card with its student is in All students now, not here.
    const cards = Array.isArray(data.cards) ? data.cards : [];
    const waiting = cards.filter((c) => !c.student);

    if (!waiting.length) {
        return (
            <section className={`${CARD} flex items-start gap-3 p-4 sm:p-5`} aria-labelledby="scanned-cards-title">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><ScanLine size={18} /></span>
                <div>
                    <h2 id="scanned-cards-title" className="font-bold text-slate-800">Scanned cards</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {cards.length
                            ? 'Every scanned card is registered: those students are in the list above.'
                            : <>No cards waiting. Use <strong>Scan cards</strong> above: each card waits here until its student registers, then the student appears in the list above.</>}
                    </p>
                    {note && <p role="status" className="mt-2 text-sm text-slate-600">{note}</p>}
                </div>
            </section>
        );
    }

    return (
        <section className={`${CARD} p-4 sm:p-5`} aria-labelledby="scanned-cards-title">
            <h2 id="scanned-cards-title" className="flex items-center gap-2 font-bold text-slate-800"><ScanLine size={18} className="text-indigo-600" /> Scanned cards</h2>
            <p className="mt-0.5 text-sm text-slate-500">{waiting.length} card{waiting.length === 1 ? '' : 's'} waiting. When a student registers with one, they join your organization and appear in the list above.</p>
            {note && <p role="status" className="mt-3 text-sm text-slate-600">{note}</p>}

            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {waiting.map((c) => {
                    const unlinkButton = (className) => (
                        <button type="button" onClick={() => unlink(c)} disabled={busy === c._id} aria-label={`Unlink card ${c.cardNumber}`}
                            className={`items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-red-600 disabled:opacity-50 ${className}`}>
                            {busy === c._id ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />} Unlink
                        </button>
                    );
                    return (
                        // A phone: number and Unlink on one line, the label under them. Wider: one row.
                        <li key={c._id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
                            <div className="flex items-start justify-between gap-3 sm:w-44 sm:shrink-0">
                                <div className="min-w-0">
                                    <p className="font-mono text-sm text-slate-800">{c.cardNumber}</p>
                                    <p className="text-xs text-slate-400">Scanned {formatDate(c.linkedAt)}</p>
                                </div>
                                {c.state === 'waiting' && unlinkButton('inline-flex shrink-0 sm:hidden')}
                            </div>
                            <div className="min-w-0 sm:flex-1">
                                <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                                    <Clock size={13} className="shrink-0" aria-hidden />
                                    <span>{c.state === 'inactive' ? 'Inactive card' : c.state === 'used' ? 'Used by an account that is not a student' : 'Waiting for the student to register'}</span>
                                </span>
                            </div>
                            {c.state === 'waiting' && unlinkButton('hidden shrink-0 sm:inline-flex')}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
