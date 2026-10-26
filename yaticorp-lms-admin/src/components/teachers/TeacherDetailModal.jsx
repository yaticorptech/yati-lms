/**
 * One teacher, in full: their details and how their research is going —
 * research paths with the stage they are on, publications, theses and
 * writing. Titles and numbers only: the server never
 * sends the words of a thesis, a writing piece or a plagiarism report.
 *
 * `url` is where the teacher is read from: /admin/teachers/:id on the
 * platform, /organizations/me/teachers/:id for an organization.
 */
import React, { useEffect, useState } from 'react';
import { X, Route, BookMarked, FileText, PenLine, ShieldCheck, Mail, Phone, CreditCard, Building2 } from 'lucide-react';
import api from '../../utils/api';
import { Dialog, DialogTitle, Banner, Bar, Rows, BTN2 } from '../orgUi';
import { TeacherStatus } from './TeacherBits';
import { fmtDay, fmtNum } from './teacherUtils';

const PUB_STATUS = { idea: 'Idea', drafting: 'Drafting', submitted: 'Submitted', under_review: 'Under review', revision: 'Revision', accepted: 'Accepted', published: 'Published', rejected: 'Rejected' };

const Section = ({ icon: Icon, title, children }) => (
    <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><Icon size={16} className="text-indigo-600" aria-hidden />{title}</h3>
        {children}
    </section>
);

const None = ({ children }) => <p className="text-sm text-slate-400">{children}</p>;

export default function TeacherDetailModal({ url, onClose }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let live = true;
        api.get(url)
            .then((r) => { if (live) setData(r.data); })
            .catch((err) => { if (live) setError(err.response?.data?.message || 'This teacher could not be loaded.'); });
        return () => { live = false; };
    }, [url]);

    const t = data?.teacher;
    const p = data?.progress;
    const published = p ? p.publications.filter((x) => x.status === 'published').length : 0;

    return (
        <Dialog onClose={onClose} size="max-w-2xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                    <DialogTitle className="truncate text-lg font-bold text-slate-800">{t ? t.name : 'Teacher'}</DialogTitle>
                    {t && <p className="mt-0.5 text-sm text-slate-500">{[t.designation, t.department, t.institution].filter(Boolean).join(' · ') || 'Teacher'}</p>}
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
                {error && <Banner>{error}</Banner>}
                {!data && !error && <Rows count={4} height="h-14" />}
                {t && p && (
                    <>
                        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <span className="flex min-w-0 items-center gap-2"><Mail size={14} className="shrink-0" aria-hidden /><span className="break-all">{t.email}</span></span>
                            <span className="flex items-center gap-2"><Phone size={14} className="shrink-0" aria-hidden />{t.phone}</span>
                            <span className="flex items-center gap-2"><CreditCard size={14} className="shrink-0" aria-hidden /><span className="font-mono">{t.cardNumber}</span></span>
                            {t.organization !== undefined && (
                                <span className="flex min-w-0 items-center gap-2"><Building2 size={14} className="shrink-0" aria-hidden /><span className="truncate">{t.organization ? t.organization.name : 'No organization'}</span></span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                            <TeacherStatus status={t.status} />
                            <span>Joined {fmtDay(t.createdAt)}</span>
                            <span>Last sign-in {t.lastLoginAt ? fmtDay(t.lastLoginAt) : 'never'} · {t.loginCount || 0} sign-ins</span>
                            {t.statusReason && <span className="text-red-600">Reason: {t.statusReason}</span>}
                        </div>

                        <Section icon={Route} title="Research path">
                            {p.research.length ? (
                                <ul className="space-y-3">
                                    {p.research.map((r) => (
                                        <li key={r._id}>
                                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                                <span className="min-w-0 font-semibold text-slate-800">{r.title}</span>
                                                <span className="shrink-0 tabular-nums text-slate-600">{r.percent}%</span>
                                            </div>
                                            <div className="mt-1.5"><Bar percent={r.percent} tone="emerald" /></div>
                                            <p className="mt-1 text-xs text-slate-500">Now: {r.stage} · {r.done} of {r.total} tasks{r.targetDate ? ` · target ${fmtDay(r.targetDate)}` : ''}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : <None>No research path started yet.</None>}
                        </Section>

                        <Section icon={BookMarked} title={`Publications · ${published} published of ${p.publications.length}`}>
                            {p.publications.length ? (
                                <ul className="divide-y divide-slate-100 text-sm">
                                    {p.publications.slice(0, 12).map((x) => (
                                        <li key={x._id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                                            <span className="min-w-0 text-slate-800">{x.title}{x.venue ? <span className="text-slate-500"> — {x.venue}{x.year ? `, ${x.year}` : ''}</span> : null}</span>
                                            <span className="shrink-0 text-xs font-semibold text-slate-500">{PUB_STATUS[x.status] || x.status}{x.indexing?.length ? ` · ${x.indexing.join(', ')}` : ''}</span>
                                        </li>
                                    ))}
                                    {p.publications.length > 12 && <li className="pt-2 text-xs text-slate-400">…and {p.publications.length - 12} more</li>}
                                </ul>
                            ) : <None>No publications added yet.</None>}
                        </Section>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Section icon={FileText} title="Thesis">
                                {p.theses.length ? (
                                    <ul className="space-y-2 text-sm">
                                        {p.theses.map((x) => (
                                            <li key={x._id}>
                                                <p className="font-semibold text-slate-800">{x.title}</p>
                                                <p className="text-xs text-slate-500">{fmtNum(x.words)}{x.targetWords ? ` of ${fmtNum(x.targetWords)}` : ''} words · {x.chaptersDone} of {x.chapters} chapters done</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <None>No thesis started yet.</None>}
                            </Section>
                            <Section icon={PenLine} title="Writing">
                                <p className="text-sm text-slate-700"><strong>{fmtNum(p.writing.words30)}</strong> words in the last 30 days</p>
                                <p className="mt-1 text-xs text-slate-500">Wrote on {p.writing.days30} of 30 days · {p.writing.pieces} writing piece{p.writing.pieces === 1 ? '' : 's'}</p>
                            </Section>
                            <Section icon={ShieldCheck} title="Plagiarism checks">
                                <p className="text-sm text-slate-700">{p.plagiarismChecks} check{p.plagiarismChecks === 1 ? '' : 's'} run</p>
                                <p className="mt-1 text-xs text-slate-500">The reports stay private to the teacher.</p>
                            </Section>
                        </div>
                    </>
                )}
            </div>
            <div className="flex shrink-0 justify-end border-t border-slate-100 px-5 py-4">
                <button type="button" onClick={onClose} className={BTN2} data-autofocus>Close</button>
            </div>
        </Dialog>
    );
}
