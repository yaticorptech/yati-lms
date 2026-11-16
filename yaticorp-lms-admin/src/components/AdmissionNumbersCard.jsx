/**
 * Settings → Admission numbers (2026-11-14): the prefix and the number admissions start from. Every
 * new admission (the admission form, admitting several, an approved request to join) takes the
 * next one automatically; nobody types it. Shown only when Campus is on.
 * Server: GET|PUT /organizations/me/campus/admission-numbers (src/campus/orgAdmin.js).
 */
import React, { useEffect, useState } from 'react';
import { Hash, Loader2, Check } from 'lucide-react';
import api from '../utils/api';
import { CARD, INPUT, LABEL, BTN, Banner } from './orgUi';

const URL = '/organizations/me/campus/admission-numbers';
const preview = (f) => (Number(f.start) > 0 ? `${f.prefix}${String(Number(f.start)).padStart(Number(f.digits) || 1, '0')}` : '');

export default function AdmissionNumbersCard() {
    const [f, setF] = useState(null);
    const [saved, setSaved] = useState(null);
    const [next, setNext] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const take = (d) => { const v = { prefix: d.prefix || '', start: d.start === '' ? '' : String(d.start), digits: String(d.digits || 4) }; setF(v); setSaved(JSON.stringify(v)); setNext(d.next || ''); };
    useEffect(() => { api.get(URL).then((r) => take(r.data)).catch(() => setF(false)); }, []);
    if (!f) return null;   // Campus off, or not this sign-in's to set
    const dirty = JSON.stringify(f) !== saved;
    const save = async (e) => {
        e.preventDefault();
        setBusy(true); setNotice(''); setError('');
        try { const r = await api.put(URL, f); take(r.data); setNotice(r.data.message); }
        catch (err) { setError(err.response?.data?.message || 'Could not save.'); }
        finally { setBusy(false); }
    };
    const first = preview(f);
    return (
        <form onSubmit={save} noValidate className={`${CARD} p-5 lg:p-6`}>
            <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Hash size={20} /></span>
                <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-slate-800">Admission numbers</h2>
                    <p className="text-sm text-slate-500">Every new admission gets the next number automatically.</p>
                </div>
            </div>
            {notice && <div className="mb-4"><Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner></div>}
            {error && <div className="mb-4"><Banner onClose={() => setError('')}>{error}</Banner></div>}
            <div className="grid gap-4 sm:grid-cols-3">
                <div>
                    <label htmlFor="adm-prefix" className={LABEL}>Prefix</label>
                    <input id="adm-prefix" value={f.prefix} maxLength={20} onChange={(e) => setF({ ...f, prefix: e.target.value })} placeholder="e.g. SNBS/2026/" className={INPUT} />
                </div>
                <div>
                    <label htmlFor="adm-start" className={LABEL}>Starts from</label>
                    <input id="adm-start" type="number" inputMode="numeric" min={1} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} placeholder="e.g. 1001" className={`${INPUT} tabular-nums`} />
                </div>
                <div>
                    <label htmlFor="adm-digits" className={LABEL}>Digits</label>
                    <select id="adm-digits" value={f.digits} onChange={(e) => setF({ ...f, digits: e.target.value })} className={INPUT}>
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n === 1 ? 'As typed' : `${n} (${'0'.repeat(n - 1)}1)`}</option>)}
                    </select>
                </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-600">
                    {dirty && first ? <>First number: <strong className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-indigo-700">{first}</strong></>
                        : next ? <>Next admission: <strong className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-indigo-700">{next}</strong></>
                            : <span className="text-slate-500">Not set: numbers look like DEPT/{new Date().getFullYear()}/0001.</span>}
                </p>
                <button type="submit" disabled={busy || !dirty} className={BTN}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save</button>
            </div>
        </form>
    );
}
