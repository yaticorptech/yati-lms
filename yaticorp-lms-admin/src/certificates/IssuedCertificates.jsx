/**
 * Saved certificates (2026-11-03): the certificate templates saved on the configuration page, one a row —
 * Certificate 1, 2, 3 … Each fills in the student's name, place, competition and date by itself and is handed out
 * when a competition's results are published; open one to change it, or download everything it has issued.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Eye, FileStack, Loader2, Pencil, Plus, Search, X } from 'lucide-react';
import api from '../utils/api';
import { CARD, BTN } from '../components/orgUi';
import { errorOf } from '../competitions/constants';
import CertificateCanvas from './CertificateCanvas';
import { imagesOf, inputOf } from './design';
import { SIDES, downloadPdf } from './shared';

const when = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const awardsOf = (d) => [...d.places.map((n) => ['', '1st', '2nd', '3rd'][n]), ...(d.participation ? ['Participation'] : [])].join(', ');

/** A saved certificate as a template: the name, place, competition and date left as blanks to be filled in. */
function Preview({ apiBase, row, onClose, onError }) {
    const [design, setDesign] = useState(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { api.get(`${apiBase}/designs/${row.id}`).then((r) => setDesign(r.data.design)).catch((err) => { onError(errorOf(err)); onClose(); }); }, [apiBase, row.id]);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const plain = apiBase.includes('/org/');
    const kind = row.places[0] ? ['', 'first', 'second', 'third'][row.places[0]] : 'participation';
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Certificate preview" className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <p className="min-w-0 truncate text-sm font-black text-slate-900">{row.label}</p>
                    <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                </div>
                <div className="bg-slate-100 p-4">
                    {design ? (
                        <CertificateCanvas template={design.template}
                            input={{ ...inputOf({ ...design, venue: '', date: 'DD/MM/YYYY', competition: { ...design.competition, name: 'Competition Name' } }, {
                                name: kind === 'participation' ? 'Participant’s Name' : 'Winner’s Name',
                                institution: design.details?.type === 'inter' ? 'Participating College' : '', course: '', award: { kind, title: '' }
                            }), noQr: plain && !design.showQr, plain }}
                            images={imagesOf(design.template, design.branding, design.signatories)} className="mx-auto block max-h-[75vh] w-full rounded-md bg-white shadow-xl" />
                    ) : <div className="flex aspect-[1600/1131] items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>}
                </div>
            </div>
        </div>
    );
}

export default function IssuedCertificates({ side = 'platform' }) {
    const S = SIDES[side];
    const [designs, setDesigns] = useState(null);
    const [q, setQ] = useState('');
    const [error, setError] = useState('');
    const [open, setOpen] = useState(null);
    const close = useCallback(() => setOpen(null), []);
    useEffect(() => {
        api.get(`${S.apiBase}/designs`)
            // Oldest first, so Certificate 1 stays Certificate 1.
            .then((r) => setDesigns(r.data.designs || []))
            .catch((err) => { setError(errorOf(err)); setDesigns([]); });
    }, [S.apiBase]);

    const shown = (designs || []).filter((d) => !q.trim() || d.label.toLowerCase().includes(q.trim().toLowerCase()));

    return (
        <div className="space-y-5 pb-16" data-issued-certificates={side}>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <Link to={S.back} className="-mt-4 mb-2 flex w-fit min-h-9 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700 lg:-mt-8"><ArrowLeft size={16} /> Back</Link>
                    <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 sm:text-3xl"><FileStack className="text-indigo-600" /> Saved certificates</h1>
                </div>
                <Link to={`${S.base}?new=1`} className={BTN}><Plus size={16} /> Create certificate</Link>
            </div>

            <label className="relative block max-w-md">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search certificates" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>

            {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

            <div className={`${CARD} overflow-x-auto`}>
                {designs === null ? (
                    <p className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading…</p>
                ) : !shown.length ? (
                    <p className="p-8 text-center text-sm text-slate-500">{q ? 'Nothing matches that search.' : 'No certificates saved yet.'}</p>
                ) : (
                    <table className="w-full min-w-[40rem] text-sm">
                        <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                            <tr><th className="p-3">Certificate</th><th className="p-3">Given to</th><th className="p-3">Saved</th><th className="p-3">Issued</th><th className="p-3 text-right">Actions</th></tr>
                        </thead>
                        <tbody>
                            {shown.map((d) => (
                                <tr key={d.id} className="border-t border-slate-100" data-saved-design={d.id}>
                                    <td className="p-3 font-bold text-slate-900">{d.label}</td>
                                    <td className="p-3 text-slate-600">{awardsOf(d)}</td>
                                    <td className="whitespace-nowrap p-3 text-slate-500">{when(d.savedAt)}</td>
                                    <td className="p-3 text-slate-600">{d.issued || '—'}</td>
                                    <td className="p-3">
                                        <div className="flex justify-end gap-1">
                                            <button type="button" onClick={() => setOpen(d)} title="View" aria-label={`View ${d.label}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"><Eye size={16} /></button>
                                            <Link to={`${S.base}?design=${d.id}`} title="Edit" aria-label={`Edit ${d.label}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"><Pencil size={16} /></Link>
                                            {d.issued > 0 && <button type="button" onClick={() => downloadPdf(`${S.apiBase}/designs/${d.id}/pdf`, `Certificates_${d.label}.pdf`).catch((e) => setError(e.message))} title="Download all issued" aria-label={`Download ${d.label}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"><Download size={16} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {open && <Preview apiBase={S.apiBase} row={open} onClose={close} onError={setError} />}
        </div>
    );
}
