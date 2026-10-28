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
import { Trophy, Plus, Users, AlertTriangle, CalendarClock, Radio, Pencil, Trash2, Crown, FileText } from 'lucide-react';
import api from '../utils/api';
import { CARD, BTN } from '../components/orgUi';
import { CompetitionForm, Chip, GameIcon } from '../competitions/shared';
import { fmtDateTime, errorOf, bannerUploader, competitionBadge, deleteQuestion } from '../competitions/constants';
import { arenaApi, arenaPath, StateChip } from '../arena/shared';
import { CardGridSkeleton } from '../competitions/Skeletons';

// The last list seen, by page: going back shows it at once while it refreshes (no flash, no jump).
const lastSeen = {};

// Where a Quiz Arena sits among the filters, by its state.
const ARENA_FILTER = { draft: 'draft', registration: 'upcoming', upcoming: 'upcoming', live: 'live', ended: 'completed', results: 'completed', cancelled: 'completed' };

// The boxes at the top: each a count, and a click shows just those.
const FILTERS = [['all', 'All', Trophy, 'text-slate-700 bg-slate-100'], ['upcoming', 'Upcoming', CalendarClock, 'text-sky-600 bg-sky-50'], ['live', 'Live', Radio, 'text-rose-600 bg-rose-50'], ['completed', 'Completed', Crown, 'text-amber-600 bg-amber-50'], ['draft', 'Drafts', FileText, 'text-slate-600 bg-slate-100']];
// A competition whose start date passed without being drawn is over: under Completed, not Upcoming.
const inFilter = (c, f) => f === 'all' || (c.phase === 'expired' ? f === 'completed' : f === 'upcoming' ? ['registration', 'closed'].includes(c.status) : c.status === f);

/** A card's top: its icon, its name (two lines at most) — the whole card opens it — and what it is. */
const CardTop = ({ icon, title, sub, to }) => (
    <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
            <Link to={to} className="line-clamp-2 min-h-[3rem] text-lg font-bold leading-snug text-slate-900 after:absolute after:inset-0 after:rounded-2xl group-hover:text-indigo-700">{title}</Link>
            <p className="truncate text-xs text-slate-500">{sub}</p>
        </div>
    </div>
);
/** A card's facts, one to a line. */
const Facts = ({ rows }) => (
    <div className="grid gap-1.5">
        {rows.map(([Icon, value, label]) => (
            <div key={label} className="flex min-w-0 items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm transition-colors group-hover:bg-white">
                <Icon size={15} className="shrink-0 text-indigo-500" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{value}</span>
                <span className="shrink-0 text-[11px] text-slate-500">{label}</span>
            </div>
        ))}
    </div>
);

export default function Competitions({ apiBase = '/competitions/admin', linkBase = '/competitions', organizer = 'YATICORP', embedded = false, hosted = false }) {
    const navigate = useNavigate();
    const [rows, setRows] = useState(() => lastSeen[apiBase]?.rows ?? null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [creating, setCreating] = useState(false);
    // Quiz Arena: the platform's only (not a college's own competitions).
    // Quiz Arena: the platform's, or a hosting college's own.
    const withArena = apiBase === '/competitions/admin' || apiBase === '/competitions/org/host';
    const [arenas, setArenas] = useState(() => (withArena ? lastSeen[apiBase]?.arenas ?? null : []));
    const loadArenas = useCallback(() => {
        if (!withArena) return;
        api.get(arenaApi()).then((r) => { setArenas(r.data.competitions); lastSeen[apiBase] = { ...lastSeen[apiBase], arenas: r.data.competitions }; }).catch(() => setArenas((a) => a ?? []));
    }, [withArena, apiBase]);
    useEffect(() => { loadArenas(); }, [loadArenas]);

    const load = useCallback(() => api.get(apiBase)
        .then((r) => { setRows(r.data.competitions); lastSeen[apiBase] = { ...lastSeen[apiBase], rows: r.data.competitions }; setError(''); })
        .catch((err) => setError(errorOf(err))), [apiBase]);
    useEffect(() => { load(); }, [load]);

    const [deleting, setDeleting] = useState('');
    const remove = (c) => {
        if (!window.confirm(deleteQuestion(c, c.counts.pending + c.counts.approved))) return;
        setDeleting(c.id);
        api.delete(`${apiBase}/${c.id}`).then(load).catch((err) => setError(errorOf(err))).finally(() => setDeleting(''));
    };

    // Edit and Delete on every card: a competition that can no longer change says why.
    const editCompetition = (c) => {
        if (['completed', 'cancelled'].includes(c.status)) { setError(`"${c.name}" is ${c.status === 'completed' ? 'over' : 'cancelled'}: it can no longer be edited.`); return; }
        navigate(`${linkBase}/${c.id}?edit=1`);
    };
    const editArena = (a) => {
        if (!['draft', 'registration', 'upcoming'].includes(a.status === 'draft' ? 'draft' : a.state)) { setError(`"${a.title}" has started or is over: it can no longer be edited.`); return; }
        navigate(arenaPath(`/competitions/arena/${a.id}?edit=1`));
    };
    const removeArena = (a) => {
        if (!window.confirm(`Delete "${a.title}" for good?`)) return;
        setDeleting(`arena-${a.id}`); setError('');
        api.delete(`${arenaApi()}/${a.id}`).then(loadArenas).catch((err) => setError(errorOf(err))).finally(() => setDeleting(''));
    };
    const ACTIONS = 'relative z-10 mt-auto grid grid-cols-3 gap-2 pt-1';
    const OPEN = 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700';
    const EDIT = OPEN;
    const DELETE = `${OPEN} disabled:opacity-50`;

    const shown = (rows || []).filter((c) => inFilter(c, filter));
    // Both lists, or neither: the cards appear together, in their places.
    const ready = rows !== null && arenas !== null;
    const arenaShown = (arenas || []).filter((a) => filter === 'all' || ARENA_FILTER[a.state] === filter);
    const counts = Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? (rows || []).length + (arenas || []).length : (rows || []).filter((c) => inFilter(c, k)).length + (arenas || []).filter((a) => ARENA_FILTER[a.state] === k).length]));

    return (
        <div className={`space-y-6 ${embedded ? "" : "pb-12"}`}>
            {embedded ? null : (
                // A bigger banner for the section.
                <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2d2693] via-[#3b31c4] to-[#5a3fd8] p-6 text-white shadow-lg sm:p-9" data-competitions-hero>
                    <Trophy size={170} aria-hidden className="pointer-events-none absolute -right-8 -top-8 text-white/10" />
                    <div className="relative flex flex-wrap items-end justify-between gap-5">
                        <div className="min-w-0 max-w-3xl">
                            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/80"><Trophy size={15} /> Platform admin</p>
                            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Games &amp; Competitions</h1>
                            <p className="mt-2 text-sm text-white/85 sm:text-base">Inter-college Chess, Rapid Fire, Code Clash, Brain Sprint and Quiz Arena. Colleges enter their students or register teams; you approve them, run the matches, decide disputes and publish the results.</p>
                        </div>
                        <button type="button" onClick={() => setCreating(true)} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg hover:bg-indigo-50"><Plus size={18} /> Create</button>
                    </div>
                </header>
            )}

            {/* The filter, as boxes: click one to see just those. */}
            {/* Small boxes in one row; on a college's Host tab, Create closes the row. */}
            {/* The same boxes as the college's Take part tab: equal, filling the row (Create closes it on the Host tab). */}
            <div className={embedded ? 'flex flex-wrap items-stretch gap-3 md:flex-nowrap' : 'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5'} role="tablist" aria-label="Show" data-filter-boxes>
                {FILTERS.map(([k, label, Icon, tone]) => (
                    <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} data-filter={k}
                        className={`${CARD} flex items-center gap-3 p-4 text-left transition-colors duration-200 hover:border-indigo-200 hover:bg-indigo-50/60 ${embedded ? 'min-w-[9rem] flex-1 md:min-w-0 md:basis-0' : ''} ${filter === k ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300' : ''}`}>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={19} /></span>
                        <span className="min-w-0"><span className="block text-2xl font-black text-slate-900">{ready ? counts[k] : '–'}</span><span className={`block truncate text-xs font-bold ${filter === k ? 'text-indigo-700' : 'text-slate-500'}`}>{label}</span></span>
                    </button>
                ))}
                {/* A college's Host tab: the boxes share the row equally, up to Create. */}
                {embedded && <button type="button" onClick={() => setCreating(true)} className={`${BTN} shrink-0 whitespace-nowrap px-5`}><Plus size={16} /> Create</button>}
            </div>

            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            {!ready && !error && <CardGridSkeleton />}
            {ready && shown.length === 0 && arenaShown.length === 0 && (
                <div className={`${CARD} p-10 text-center`}>
                    <Trophy size={30} className="mx-auto text-slate-300" />
                    <p className="mt-2 font-bold text-slate-800">{rows.length ? 'Nothing here' : 'No competitions yet'}</p>
                    <p className="text-sm text-slate-500">Create one, open registration, and colleges can enter teams.</p>
                </div>
            )}

            {/* Three to a row, every card the same height: name, badges, facts, and
                its buttons in one row at the bottom — the same place on every card. */}
            {ready && <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {/* Quiz Arena contests, among the others. */}
                {arenaShown.map((a) => (
                    <article key={`arena-${a.id}`} className={`${CARD} group relative flex h-full flex-col gap-4 p-6 transition-colors duration-200 hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-md`} data-arena={a.id}>
                        <CardTop icon={<GameIcon game="quizarena" />} title={a.title} sub={`Quiz Arena · by ${a.organizedBy}`} to={arenaPath(`/competitions/arena/${a.id}`)} />
                        <div className="flex min-h-6 flex-wrap gap-1.5"><StateChip state={a.state} /></div>
                        <Facts rows={[[CalendarClock, fmtDateTime(a.startsAt), 'Starts'], [Users, `${a.registeredCount} / ${a.maxParticipants} students`, 'Registered']]} />
                        <div className={ACTIONS}>
                            <Link to={arenaPath(`/competitions/arena/${a.id}`)} className={OPEN}>Open</Link>
                            <button type="button" onClick={() => editArena(a)} aria-label={`Edit ${a.title}`} className={EDIT}><Pencil size={14} /> Edit</button>
                            <button type="button" onClick={() => removeArena(a)} disabled={deleting === `arena-${a.id}`} aria-label={`Delete ${a.title}`} className={DELETE}><Trash2 size={14} /> Delete</button>
                        </div>
                    </article>
                ))}
                {shown.map((c) => (
                    // The whole card opens the competition; Edit opens it with the
                    // form ready (until it is over); Delete removes it, after asking.
                    <article key={c.id} className={`${CARD} group relative flex h-full flex-col gap-4 p-6 transition-colors duration-200 hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-md`}>
                        <CardTop icon={<GameIcon game={c.game} />} title={c.name} sub={`${c.gameLabel} · by ${c.organizedBy}`} to={`${linkBase}/${c.id}`} />
                        <div className="flex min-h-6 flex-wrap gap-1.5">
                            <Chip status={competitionBadge(c)} />
                            {c.counts.pending > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">{c.counts.pending} to approve</span>}
                            {c.counts.live > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700"><Radio size={11} /> {c.counts.live} live</span>}
                            {c.counts.needsDecision > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-800"><AlertTriangle size={11} /> {c.counts.needsDecision} to decide</span>}
                        </div>
                        <Facts rows={[[CalendarClock, fmtDateTime(c.startsAt), 'Starts'], [Users, `${c.counts.approved} / ${c.maxTeams} teams`, 'Approved']]} />
                        <div className={ACTIONS}>
                            <Link to={`${linkBase}/${c.id}`} className={OPEN}>Open</Link>
                            <button type="button" onClick={() => editCompetition(c)} aria-label={`Edit ${c.name}`} className={EDIT}><Pencil size={14} /> Edit</button>
                            <button type="button" onClick={() => remove(c)} disabled={deleting === c.id} aria-label={`Delete ${c.name}`} className={DELETE}><Trash2 size={14} /> Delete</button>
                        </div>
                    </article>
                ))}
            </div>}

            {creating && (
                <CompetitionForm organizer={organizer} hosted={hosted} uploadBanner={bannerUploader(apiBase)} onCancel={() => setCreating(false)}
                    arena={withArena}
                    onSaveArena={(body, publish) => api.post(arenaApi(), body).then(async (r) => {
                        const id = r.data.competition.id;
                        let notice = '';
                        if (publish) await api.post(`${arenaApi()}/${id}/publish`).catch((err) => { notice = `Saved as a draft, not published: ${errorOf(err)}`; });
                        setCreating(false);
                        navigate(arenaPath(`/competitions/arena/${id}`), { state: notice ? { notice } : undefined });
                    })}
                    onSave={(body) => api.post(apiBase, body).then((r) => { setCreating(false); navigate(`${linkBase}/${r.data.competition.id}`); })} />
            )}
        </div>
    );
}
