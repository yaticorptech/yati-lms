/**
 * Competition management: the competitions you run, and the form to create
 * one. Each opens in CompetitionAdmin.jsx, where teams are approved, matches
 * drawn and results decided.
 *
 * The platform admin sees every competition (apiBase /competitions/admin);
 * an organization hosting its own sees only those (/competitions/org/host,
 * shown inside its Competitions page with `embedded`).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Plus, Users, AlertTriangle, CalendarClock, Radio, Pencil } from 'lucide-react';
import api from '../utils/api';
import { PageHeader, Segmented, CARD, BTN } from '../components/orgUi';
import { CompetitionForm, Chip } from '../competitions/shared';
import { fmtDateTime, errorOf, bannerUploader } from '../competitions/constants';

const FILTERS = [['all', 'All'], ['upcoming', 'Upcoming'], ['live', 'Live'], ['completed', 'Completed'], ['draft', 'Drafts']];
const inFilter = (c, f) => f === 'all' || (f === 'upcoming' ? ['registration', 'closed'].includes(c.status) : c.status === f);

export default function Competitions({ apiBase = '/competitions/admin', linkBase = '/competitions', organizer = 'YATICORP', embedded = false }) {
    const navigate = useNavigate();
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [creating, setCreating] = useState(false);

    const load = useCallback(() => api.get(apiBase)
        .then((r) => { setRows(r.data.competitions); setError(''); })
        .catch((err) => setError(errorOf(err))), [apiBase]);
    useEffect(() => { load(); }, [load]);

    const shown = (rows || []).filter((c) => inFilter(c, filter));
    const counts = Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? 0 : (rows || []).filter((c) => inFilter(c, k)).length]));

    return (
        <div className={`space-y-6 animate-fade-in ${embedded ? "" : "pb-12"}`}>
            {embedded ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Competition Management</h2>
                        <p className="text-sm text-slate-500">Host your own inter-college competitions: colleges register, you approve, draw the matches and decide the results.</p>
                    </div>
                    <button type="button" onClick={() => setCreating(true)} className={BTN}><Plus size={16} /> Create Competition</button>
                </div>
            ) : (
                <PageHeader icon={Trophy} title="Games & Competitions" subtitle="Inter-college Chess, Ludo, Carrom and UNO competitions. Colleges register teams; you approve them, draw the matches and decide disputes.">
                    <button type="button" onClick={() => setCreating(true)} className={BTN}><Plus size={16} /> Create Competition</button>
                </PageHeader>
            )}

            <Segmented options={FILTERS} value={filter} onChange={setFilter} counts={counts} />

            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            {!rows && !error && <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}</div>}
            {rows && shown.length === 0 && (
                <div className={`${CARD} p-10 text-center`}>
                    <Trophy size={30} className="mx-auto text-slate-300" />
                    <p className="mt-2 font-bold text-slate-800">{rows.length ? 'Nothing here' : 'No competitions yet'}</p>
                    <p className="text-sm text-slate-500">Create one, open registration, and colleges can enter teams.</p>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((c) => (
                    // The whole card opens the competition; Edit, on top of it, opens it
                    // with the form ready — published ones too, until it is over.
                    <article key={c.id} className={`${CARD} group relative flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md`}>
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl">{c.emoji}</span>
                            <div className="min-w-0 flex-1">
                                <Link to={`${linkBase}/${c.id}`} className="block font-bold leading-snug text-slate-900 after:absolute after:inset-0 after:rounded-2xl group-hover:text-indigo-700">{c.name}</Link>
                                <p className="text-xs text-slate-500">{c.gameLabel} · by {c.organizedBy}</p>
                            </div>
                            {!['completed', 'cancelled'].includes(c.status) && (
                                <Link to={`${linkBase}/${c.id}?edit=1`} aria-label={`Edit ${c.name}`}
                                    className="relative z-10 inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-700">
                                    <Pencil size={13} /> Edit
                                </Link>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <Chip status={c.status} />
                            {c.counts.pending > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">{c.counts.pending} to approve</span>}
                            {c.counts.live > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700"><Radio size={11} /> {c.counts.live} live</span>}
                            {c.counts.needsDecision > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-800"><AlertTriangle size={11} /> {c.counts.needsDecision} to decide</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1.5"><CalendarClock size={13} /> {fmtDateTime(c.startsAt)}</span>
                            <span className="inline-flex items-center gap-1.5"><Users size={13} /> {c.counts.approved} / {c.maxTeams} teams</span>
                        </div>
                    </article>
                ))}
            </div>

            {creating && (
                <CompetitionForm organizer={organizer} uploadBanner={bannerUploader(apiBase)} onCancel={() => setCreating(false)}
                    onSave={(body) => api.post(apiBase, body).then((r) => { setCreating(false); navigate(`${linkBase}/${r.data.competition.id}`); })} />
            )}
        </div>
    );
}
