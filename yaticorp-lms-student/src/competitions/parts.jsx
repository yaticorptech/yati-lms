/**
 * The pieces Games & Competitions pages share: status chips, a match card, the
 * rounds of a knockout, and the winners' podium.
 */
import { Link } from 'react-router-dom';
import { Trophy, CalendarClock, Play, Eye, Swords, Crown, Medal, CheckCircle2, AlertTriangle } from 'lucide-react';
import { STATUS, PHASE, ORDINAL, fmtDateTime } from './api';

/** A competition's status: 🟢 open, 🟡 closing soon, 🔵 upcoming, 🔴 live, ⚫ completed. */
export const StatusChip = ({ status, phase }) => {
    const p = PHASE[phase] || PHASE[status];
    if (p) {
        return (
            <span data-phase={phase || status} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${p.cls}`}>
                <span aria-hidden="true" className="text-[9px] leading-none">{p.dot}</span> {p.label}
            </span>
        );
    }
    const s = STATUS[status] || STATUS.draft;
    return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${s.cls}`}>{s.label}</span>;
};

export const GameChip = ({ emoji, label }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-100">
        <span aria-hidden="true">{emoji}</span> {label}
    </span>
);

const MATCH_STATUS = {
    scheduled: { label: 'Upcoming', cls: 'bg-sky-50 text-sky-700' },
    live: { label: 'Live', cls: 'bg-rose-50 text-rose-700' },
    completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' },
    bye: { label: 'Bye', cls: 'bg-slate-100 text-slate-600' }
};

/**
 * One match. `action` decides the button: a live match offers Join game to
 * its players and Watch to everyone else; a finished one links to its game.
 */
export const MatchCard = ({ match, playing = false, showCompetition = false, myTeamId = null }) => {
    const st = MATCH_STATUS[match.status] || MATCH_STATUS.scheduled;
    const winner = match.winnerTeamId;
    const mine = myTeamId ? match.sides.find((s) => s.teamId === myTeamId) : null;
    const opponents = mine ? match.sides.filter((s) => s.teamId !== myTeamId) : [];
    return (
        <article data-match={match.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                    {showCompetition && match.competition && (
                        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-400">{match.competition.emoji} {match.competition.name}</p>
                    )}
                    <p className="text-sm font-bold text-slate-800">{match.roundName}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>
                    {match.status === 'live' && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500 align-middle" aria-hidden="true" />}
                    {st.label}
                </span>
            </div>

            {mine && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    <dt className="text-slate-400">Your team</dt><dd className="truncate font-semibold text-slate-800">{mine.teamName}</dd>
                    <dt className="text-slate-400">Opponent</dt><dd className="truncate font-semibold text-slate-800">{opponents.map((o) => `${o.teamName} (${o.collegeName})`).join(', ')}</dd>
                </dl>
            )}

            <ul className="space-y-1.5">
                {match.sides.map((s, i) => (
                    <li key={s.teamId} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${winner === s.teamId ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-50'}`}>
                        {i > 0 && match.sides.length === 2 && <span className="sr-only">versus</span>}
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-slate-900">{s.teamName}</span>
                            <span className="block truncate text-[11px] text-slate-500">{s.collegeName}{s.lineup?.length ? ` · ${s.lineup.map((p) => p.name).join(', ')}` : ''}</span>
                        </span>
                        {winner === s.teamId && <Crown size={16} className="shrink-0 text-amber-500" aria-label="Winner" />}
                    </li>
                ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} aria-hidden="true" /> {fmtDateTime(match.scheduledAt)}</span>
                {match.games > 1 && <span>{match.games} games (replayed after a draw)</span>}
            </div>
            {match.resultNote && <p className="text-xs text-slate-600">{match.resultNote}</p>}
            {match.needsDecision && (
                <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800"><AlertTriangle size={13} aria-hidden="true" /> Waiting for the organizer to decide this match.</p>
            )}

            {match.gameId && match.status === 'live' && (
                <Link to={`/competitions/play/${match.gameId}`}
                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${playing ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700' : 'border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700'}`}>
                    {playing ? <><Play size={15} aria-hidden="true" /> Join game</> : <><Eye size={15} aria-hidden="true" /> Watch</>}
                </Link>
            )}
            {match.status === 'scheduled' && showCompetition && match.competition && (
                <Link to={`/competitions/${match.competition.id}`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                    View match
                </Link>
            )}
            {match.gameId && match.status === 'completed' && match.decidedBy === 'game' && (
                <Link to={`/competitions/play/${match.gameId}`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-700">
                    <Eye size={14} aria-hidden="true" /> See the final position
                </Link>
            )}
        </article>
    );
};

/** The knockout, round by round, left to right on a wide screen. */
export const Rounds = ({ rounds, myTeamId = null }) => {
    if (!rounds?.length) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                <Swords size={22} className="mx-auto mb-2 text-slate-300" aria-hidden="true" />
                The matches are drawn once registration closes.
            </div>
        );
    }
    return (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2" data-rounds>
            {rounds.map((r) => (
                <section key={r.round} className="w-[17rem] shrink-0 space-y-3 sm:w-72">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{r.name}</h4>
                    {r.matches.map((m) => (
                        <MatchCard key={m.id} match={m} playing={!!myTeamId && m.sides.some((s) => s.teamId === myTeamId)} />
                    ))}
                </section>
            ))}
        </div>
    );
};

const PODIUM = {
    1: { ring: 'from-amber-300 to-yellow-500', block: 'h-24 bg-amber-100 text-amber-700', icon: Trophy },
    2: { ring: 'from-slate-200 to-slate-400', block: 'h-16 bg-slate-100 text-slate-500', icon: Medal },
    3: { ring: 'from-orange-200 to-orange-400', block: 'h-12 bg-orange-100 text-orange-700', icon: Medal }
};

/** 1st in the middle, 2nd and 3rd either side. */
export const Podium = ({ winners }) => {
    if (!winners?.length) return null;
    const by = Object.fromEntries(winners.map((w) => [w.place, w]));
    return (
        <div className="grid grid-cols-3 items-end gap-2 sm:gap-4" data-podium>
            {[2, 1, 3].map((place) => {
                const w = by[place];
                const p = PODIUM[place];
                if (!w) return <div key={place} />;
                const Icon = p.icon;
                return (
                    <div key={place} className="flex min-w-0 flex-col items-center text-center">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${p.ring} text-white shadow-md sm:h-14 sm:w-14`}><Icon size={22} aria-hidden="true" /></span>
                        <p className="mt-2 w-full truncate text-sm font-bold text-slate-900">{w.teamName}</p>
                        <p className="w-full truncate text-[11px] text-slate-500">{w.collegeName}</p>
                        <div className={`mt-2 flex w-full items-start justify-center rounded-t-xl pt-2 text-sm font-black ${p.block}`}>{ORDINAL[place]}</div>
                    </div>
                );
            })}
        </div>
    );
};

export const Empty = ({ icon: Icon = CheckCircle2, title, children }) => (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <Icon size={28} className="mx-auto text-slate-300" aria-hidden="true" />
        <p className="mt-2 font-bold text-slate-800">{title}</p>
        {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
    </div>
);
