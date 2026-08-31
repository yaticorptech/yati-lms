/**
 * @description One job listing: match ring, the facts, skill overlap, pay.
 *
 * Rebuilt in the LMS's own card style. The logic is the original's — what to
 * link the company name to, which salary strings are real, how the four match
 * components are summarised — because each of those encodes a decision that
 * took a wrong answer to find.
 */
import { Building2, MapPin, Clock, Compass, ExternalLink, Bookmark } from 'lucide-react';
import { comparePay } from './pay';

const postedLabel = (daysAgo) => {
    if (daysAgo == null) return null;
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 30) return `${daysAgo} days ago`;
    return `${Math.round(daysAgo / 30)} mo ago`;
};

/**
 * Where clicking the company name should go.
 *
 * Its own site when the employer is known — that is the page with the office
 * address and the "about us". Otherwise a map search for the company at the
 * listing's location: it answers the same questions and, unlike a guessed
 * domain, cannot send someone to a business with a similar name.
 */
const companyLink = (job) => {
    if (job.companyUrl) return { href: job.companyUrl, kind: 'site' };
    if (!job.company) return null;
    const where = job.companyLocation || job.location || '';
    const query = [job.company, where].filter(Boolean).join(' ');
    return { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, kind: 'map' };
};

/**
 * The pay to print, or null when there isn't any.
 *
 * Two things make the raw field unusable as-is. Some sources write the string
 * "0" when they have no figure at all, which would set a confident zero at the
 * foot of the card. And a real range arrives with the benefits blurb attached
 * — everything past the first bullet is prose, not money.
 */
const payLabel = (raw) => {
    const text = String(raw ?? '').trim();
    if (!text) return null;
    if (!/[1-9]/.test(text)) return null;
    return text.split('•')[0].trim() || null;
};

export default function JobCard({ job, expected, saved = false, onToggleSave }) {
    // Null in the saved-jobs view: a match percentage belongs to a search,
    // not to a bookmark, so the card renders without its scoring chrome.
    const m = job.match;
    const posted = postedLabel(job.daysAgo);
    const company = companyLink(job);
    const pay = payLabel(job.salary);
    // Null whenever an honest comparison isn't possible — no figure on the
    // listing, none expected, or two currencies that would need a live rate.
    const verdict = expected?.amount ? comparePay(job.salary, expected.amount, expected.currency) : null;

    const ring = m && (m.total >= 75 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
        : m.total >= 50 ? 'text-indigo-600 bg-indigo-50 border-indigo-200'
            : 'text-slate-500 bg-slate-50 border-slate-200');

    // The four component scores are detail behind the headline number, so they
    // hang off it as a tooltip rather than competing for space in the card.
    const breakdown = m
        ? `Skills ${m.parts.skills}% · Role fit ${m.parts.role}% · Type ${m.parts.type}% · Location ${m.parts.location}%`
        : '';

    return (
        <article className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
            <div className="flex items-start justify-between gap-4 mb-3">
                {m ? (
                    <div className={`shrink-0 w-14 h-14 rounded-xl border flex flex-col items-center justify-center ${ring}`}
                        title={breakdown} aria-label={`${m.total}% match. ${breakdown}`}>
                        <span className="text-lg font-bold leading-none tabular-nums">{m.total}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">match</span>
                    </div>
                ) : <div />}
                <div className="flex items-center gap-1.5 justify-end">
                    <div className="flex flex-wrap gap-1.5 justify-end">
                        {job.active === false && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-1 rounded">May be filled</span>
                        )}
                        {job.type && job.type !== 'Unknown' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded">{job.type}</span>
                        )}
                        {job.remote && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Remote</span>
                        )}
                    </div>
                    {onToggleSave && (
                        <button
                            type="button"
                            onClick={() => onToggleSave(job)}
                            title={saved ? 'Remove from saved jobs' : 'Save this job'}
                            aria-label={saved ? 'Remove from saved jobs' : 'Save this job'}
                            aria-pressed={saved}
                            className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                                saved
                                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                    : 'text-slate-300 hover:text-indigo-500 hover:bg-slate-50'
                            }`}
                        >
                            <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
                        </button>
                    )}
                </div>
            </div>

            <h3 className="font-bold text-lg text-slate-800 leading-snug mb-2">
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
                    {job.title}
                </a>
            </h3>

            <ul className="space-y-1.5 text-sm text-slate-600 mb-4">
                {job.company && (
                    <li className="flex items-center gap-2">
                        <Building2 size={14} className="text-slate-400 shrink-0" />
                        {company ? (
                            <a href={company.href} target="_blank" rel="noopener noreferrer"
                                title={company.kind === 'site'
                                    ? `${job.company} — company website`
                                    : `Find ${job.company}${job.companyLocation ? ` in ${job.companyLocation}` : ''} on the map`}
                                className="font-medium hover:text-indigo-600 transition-colors">
                                {job.company}
                            </a>
                        ) : (
                            <span className="font-medium">{job.company}</span>
                        )}
                    </li>
                )}
                <li className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>{job.location || '—'}</span>
                </li>
                {m?.distanceKm != null && (
                    <li className="flex items-center gap-2">
                        <Compass size={14} className="text-slate-400 shrink-0" />
                        <span>{m.distanceKm} km away</span>
                    </li>
                )}
                <li className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400 shrink-0" />
                    <span>{[posted, `via ${job.source}`].filter(Boolean).join(' · ')}</span>
                </li>
            </ul>

            {m && (m.matched.length > 0 || m.missing.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {m.matched.slice(0, 4).map((s) => (
                        <span key={`m${s}`} className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded">✓ {s}</span>
                    ))}
                    {m.missing.slice(0, 2).map((s) => (
                        <span key={`x${s}`} className="text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded">{s}</span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="min-w-0">
                    {/* Said plainly either way. Most listings publish no figure at
                        all, and an empty slot reads as a rendering fault rather
                        than as the employer having withheld it. */}
                    {pay ? (
                        <p className="font-bold text-slate-800 truncate" title={job.salary}>{pay}</p>
                    ) : (
                        <p className="text-sm text-slate-400">Not disclosed</p>
                    )}
                    {verdict && (
                        <p className={`text-xs font-semibold mt-0.5 ${verdict.meets ? 'text-emerald-600' : 'text-amber-600'}`}
                            title={verdict.detail + (verdict.assumedPeriod ? ` (${verdict.assumedPeriod}ly rate annualised)` : '')}>
                            {verdict.meets ? '✓ ' : ''}{verdict.label}
                        </p>
                    )}
                </div>
                <a href={job.url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                    View <ExternalLink size={14} />
                </a>
            </div>
        </article>
    );
}
