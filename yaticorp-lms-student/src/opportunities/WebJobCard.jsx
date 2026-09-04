/**
 * A part-time vacancy from Google Jobs, built to sit beside the LMS's own
 * local job cards without looking like a different species: same frame, same
 * icon square, same facts row, same "matches" line.
 *
 * What it cannot have, it does not pretend to have. A vacancy is open until
 * it is filled, so there is no date strip and no ♡ — the LMS has nothing to
 * remember about a listing it does not own. The date line says so plainly,
 * and the button goes where the work is.
 */
import { MapPin, ExternalLink, Clock, CalendarCheck, Globe, Wallet, Briefcase, Building2 } from 'lucide-react';

const posted = (days) => days == null ? '' : days === 0 ? 'Posted today' : days === 1 ? 'Posted yesterday' : days < 30 ? `Posted ${days} days ago` : 'Posted a while ago';

export default function WebJobCard({ job, categoryLabel }) {
    const org = job.organization || {};
    const place = job.location?.city || '';
    const pay = job.compensation?.label || '';

    return (
        <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
            {/* Icon, title, employer — the local card's opening, note for note. */}
            <div className="flex items-start gap-3">
                {org.logo ? (
                    <img src={org.logo} alt="" loading="lazy"
                        className="h-14 w-14 shrink-0 rounded-2xl border border-slate-100 bg-white object-contain p-1.5" />
                ) : (
                    <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-2xl">{job.icon || '🌐'}</span>
                )}
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold leading-snug text-slate-900">{job.title}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-slate-500">
                        <Building2 size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="truncate">{org.name}</span>
                    </p>
                </div>
                <span className="shrink-0 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">
                    {job.typeLabel || 'Part-time'}
                </span>
            </div>

            {/* Where the local card puts its dates. A vacancy has none, and
                saying so is more use than leaving a gap. */}
            <p className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                <CalendarCheck size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
                Open any day · apply when you are free
            </p>

            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
                {place && <li className="flex items-center gap-1.5"><MapPin size={14} className="shrink-0 text-slate-400" aria-hidden="true" /> {place}</li>}
                {job.remote && <li className="flex items-center gap-1.5"><Globe size={14} className="shrink-0 text-slate-400" aria-hidden="true" /> Remote</li>}
                {job.wider && !job.remote && <li className="flex items-center gap-1.5 text-amber-700"><MapPin size={14} className="shrink-0 text-amber-500" aria-hidden="true" /> Wider area</li>}
                {job.daysAgo != null && <li className="flex items-center gap-1.5"><Clock size={14} className="shrink-0 text-slate-400" aria-hidden="true" /> {posted(job.daysAgo)}</li>}
                {pay && <li className="flex items-center gap-1.5 font-semibold text-emerald-700"><Wallet size={14} className="shrink-0 text-emerald-600" aria-hidden="true" /> {pay}</li>}
            </ul>

            {job.description && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{job.description}</p>
            )}

            {categoryLabel && (
                <p className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Matches</span>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{categoryLabel}</span>
                </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400">
                    <Briefcase size={12} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{job.publisher ? `${job.publisher} · via Google Jobs` : 'via Google Jobs'}</span>
                </span>
                <a href={job.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
                    Find Job <ExternalLink size={14} aria-hidden="true" />
                </a>
            </div>
        </article>
    );
}
