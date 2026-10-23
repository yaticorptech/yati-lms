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
import { Trophy, Plus, Users, AlertTriangle, CalendarClock, Radio, Pencil, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { PageHeader, Segmented, CARD, BTN } from '../components/orgUi';
import { CompetitionForm, Chip, GameIcon } from '../competitions/shared';
import { fmtDateTime, errorOf, bannerUploader, competitionBadge, deleteQuestion } from '../competitions/constants';

const FILTERS = [['all', 'All'], ['upcoming', 'Upcoming'], ['live', 'Live'], ['completed', 'Completed'], ['draft', 'Drafts']];
const inFilter = (c, f) => f === 'all' || (f === 'upcoming' ? ['registration', 'closed'].includes(c.status) : c.status === f);

export default function Competitions({ apiBase = '/competitions/admin', linkBase = '/competitions', organizer = 'YATICORP', embedded = false, hosted = false }) {
    const navigate = useNavigate();
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [creating, setCreating] = useState(false);

    const load = useCallback(() => api.get(apiBase)
        .then((r) => { setRows(r.data.competitions); setError(''); })
        .catch((err) => setError(errorOf(err))), [apiBase]);
    useEffect(() => { load(); }, [load]);

    const [deleting, setDeleting] = useState('');
    const remove = (c) => {
        if (!window.confirm(deleteQuestion(c, c.counts.pending + c.counts.approved))) return;
        setDeleting(c.id);
        api.delete(`${apiBase}/${c.id}`).then(load).catch((err) => setError(errorOf(err))).finally(() => setDeleting(''));
    };

    const shown = (rows || []).filter((c) => inFilter(c, filter));
    const counts = Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? 0 : (rows || []).filter((c) => inFilter(c, k)).length]));

    return (
        <div className={`space-y-6 animate-fade-in ${embedded ? "" : "pb-12"}`}>
            {embedded ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Competition Management</h2>
                        <p className="text-sm text-slate-500">Host a competition for your own students: make the teams from them, draw the matches and decide the results. Only your students see it.</p>
                    </div>
                    <button type="button" onClick={() => setCreating(true)} className={BTN}><Plus size={16} /> Create Competition</button>
                </div>
            ) : (
                <PageHeader icon={Trophy} title="Games & Competitions" subtitle="Inter-college Chess, Ludo and Carrom competitions. Colleges register teams; you approve them, draw the matches and decide disputes.">
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
                    // Delete, under Edit, removes it for good, after asking.
                    <article key={c.id} className={`${CARD} group relative flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md`}>
                        <div className="flex items-start gap-3">
                            <GameIcon game={c.game} />
                            <div className="min-w-0 flex-1">
                                <Link to={`${linkBase}/${c.id}`} className="block font-bold leading-snug text-slate-900 after:absolute after:inset-0 after:rounded-2xl group-hover:text-indigo-700">{c.name}</Link>
                                <p className="text-xs text-slate-500">{c.gameLabel} · by {c.organizedBy}</p>
                            </div>
                            <div className="relative z-10 flex shrink-0 flex-col items-stretch gap-1.5">
                                {!['completed', 'cancelled'].includes(c.status) && (
                                    <Link to={`${linkBase}/${c.id}?edit=1`} aria-label={`Edit ${c.name}`}
                                        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-700">
                                        <Pencil size={13} /> Edit
                                    </Link>
                                )}
                                <button type="button" onClick={() => remove(c)} disabled={deleting === c.id} aria-label={`Delete ${c.name}`}
                                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-rose-700 hover:border-rose-300 disabled:opacity-50">
                                    <Trash2 size={13} /> Delete
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <Chip status={competitionBadge(c)} />
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
                <CompetitionForm organizer={organizer} hosted={hosted} uploadBanner={bannerUploader(apiBase)} onCancel={() => setCreating(false)}
                    onSave={(body) => api.post(apiBase, body).then((r) => { setCreating(false); navigate(`${linkBase}/${r.data.competition.id}`); })} />
            )}
        </div>
    );
}
