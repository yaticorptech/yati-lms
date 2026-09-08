/** Certificates the LMS issued, and ones the student uploaded, as cards. */
import { Award, ExternalLink, BadgeCheck } from 'lucide-react';
import { fmtDate } from './api';
import { Empty } from './ui';

export default function CertificateList({ certificates = [] }) {
    if (!certificates.length) return <Empty icon={Award} title="No certificates yet">Finish a course to earn one, or add certificates you already hold on your profile.</Empty>;
    return (
        <ul className="stagger grid gap-3 sm:grid-cols-2">
            {certificates.map((c) => (
                <li key={c.id} className="lift flex gap-3 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Award size={22} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{c.title}</p>
                        {c.course && <p className="truncate text-xs text-slate-600">{c.course}</p>}
                        <p className="mt-0.5 text-xs text-slate-500">{c.issuer}{c.date ? ` · ${fmtDate(c.date)}` : ''}{c.number ? ` · #${c.number}` : ''}</p>
                        <div className="mt-2 flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.source === 'lms' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{c.source === 'lms' ? <><BadgeCheck size={11} /> Verified</> : 'Uploaded'}</span>
                            {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"><ExternalLink size={12} /> View Certificate</a>}
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}
