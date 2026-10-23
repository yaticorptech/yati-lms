/**
 * The pieces Games & Competitions pages share: status chips, a match card, the
 * rounds of a knockout, and the winners' podium.
 */
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, CalendarClock, Play, Eye, Swords, Crown, Medal, CheckCircle2, AlertTriangle, Ticket } from 'lucide-react';
import { STATUS, PHASE, ORDINAL, fmtDateTime } from './api';
import useRowsShown from './useRowsShown';

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
                {match.status === 'bye'
                    ? <span>No opponent this round: goes straight through.</span>
                    : <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} aria-hidden="true" /> {fmtDateTime(match.scheduledAt)}</span>}
                {match.games > 1 && <span>{match.games} games (replayed after a draw)</span>}
            </div>
            {/* The match's code: a player can also type it in Games → Join with a code. */}
            {match.gameCode && (
                <p className="flex items-center gap-1.5 text-xs text-slate-600" data-match-code={match.gameCode}>
                    <Ticket size={13} aria-hidden="true" /> Match code <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-black tracking-[0.2em] text-white">{match.gameCode}</span>
                </p>
            )}
            {match.resultNote && <p className="text-xs text-slate-600">{match.resultNote}</p>}
            {match.needsDecision && (
                <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800"><AlertTriangle size={13} aria-hidden="true" /> Waiting for the organizer to decide this match.</p>
            )}

            {/* Not while it waits for the organizer: its game is over (nobody joined, or
                three draws), and the link only led to "did not go ahead". */}
            {match.gameId && match.status === 'live' && !match.needsDecision && (
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
        // `relative`: the screen reader's "versus" inside a match card is
        // positioned, and against the page it stuck out of this strip's
        // scrolling and widened a small phone's page by its second column.
        <div className="relative -mx-1 flex gap-4 overflow-x-auto px-1 pb-2" data-rounds>
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
                        <p className="mt-2 line-clamp-2 w-full break-words text-sm font-bold text-slate-900">{w.teamName}</p>
                        <p className="line-clamp-2 w-full break-words text-[11px] text-slate-500">{w.collegeName}</p>
                        <div className={`mt-2 flex w-full items-start justify-center rounded-t-xl pt-2 text-sm font-black ${p.block}`}>{ORDINAL[place]}</div>
                    </div>
                );
            })}
        </div>
    );
};

const RANK_TONE = { 1: 'bg-amber-100 text-amber-700', 2: 'bg-slate-200 text-slate-700', 3: 'bg-orange-100 text-orange-700' };

/** Where each team of a finished competition ended up, best first (see Standings). */
const standingsOf = (teams, rounds, winners) => {
    const matches = rounds.flatMap((r) => r.matches);
    const placeOf = Object.fromEntries((winners || []).map((w) => [w.teamId, w.place]));
    const third = matches.find((m) => m.kind === 'third-place');
    const rows = teams.map((t) => {
        const theirs = matches.filter((m) => m.sides.some((s) => s.teamId === t.id));
        const played = theirs.filter((m) => m.status === 'completed');
        const won = played.filter((m) => m.winnerTeamId === t.id).length;
        const last = theirs.filter((m) => m.kind === 'main').reduce((a, m) => (!a || m.round > a.round ? m : a), null);
        const place = placeOf[t.id] || null;
        // `order`: lower is better. The places first, then the third-place
        // match's loser, then everyone else by the round they went out in.
        let order;
        let result;
        if (place === 1) { order = 0; result = 'Won the final'; }
        else if (place === 2) { order = 1; result = 'Lost the final'; }
        else if (place === 3) { order = 2; result = third ? 'Won the third-place match' : 'Third in the final'; }
        else if (third?.sides.some((s) => s.teamId === t.id)) { order = 3; result = 'Lost the third-place match'; }
        else if (last?.roundName === 'Final') {
            // A final of three or four teams (Ludo): its own order past third.
            const at = (last.places || []).findIndex((g) => g.includes(t.id));
            order = 3 + Math.max(at, 3);
            result = at >= 0 ? `${at + 1}th in the final` : 'Played the final';
        } else { order = 100 - (last?.round ?? -1); result = last ? `Out in the ${last.roundName}` : 'Did not play'; }
        return { team: t, order, result, played: played.length, won };
    }).sort((a, b) => a.order - b.order || b.won - a.won || a.team.teamName.localeCompare(b.team.teamName));
    // Teams out in the same round share a rank: four quarter-final losers are all 5th.
    rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].order === r.order ? rows[i - 1].rank : i + 1; });
    return rows;
};

/** Teams shown before the standings scroll (the user's choice, 2026-10-14). */
const STANDINGS_SHOWN = 2;

/**
 * A finished competition's final standings: every team, its rank, how far it
 * got and the matches it won. `showCollege` is off in a college's own
 * competition, where every team is the same college's.
 *
 * With many teams the list stays as tall as its first two, and the rest
 * scroll inside it. Its height is measured from those two rows (taller on a
 * phone, where the result sits under the name) and again when the width
 * changes.
 */
export const Standings = ({ teams, rounds, winners, myTeamId = null, showCollege = true }) => {
    const rows = standingsOf(teams, rounds, winners);
    const listRef = useRef(null);
    const more = useRowsShown(listRef, STANDINGS_SHOWN, rows.length, { extra: 2 });  // + the list's own top and bottom border
    return (
        <div>
            <ol ref={listRef} data-standings className={`divide-y divide-slate-100 rounded-2xl border border-slate-200 ${more ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'}`}>
                {rows.map((r) => {
                    const mine = r.team.id === myTeamId;
                    const who = [showCollege && r.team.collegeName, r.team.players.map((p) => p.name).join(', ')].filter(Boolean).join(' · ');
                    return (
                        <li key={r.team.id} data-standing={r.team.id} className={`flex items-start gap-3 px-3 py-2.5 sm:items-center sm:gap-4 sm:px-4 ${mine ? 'bg-violet-50' : 'bg-white'}`}>
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${RANK_TONE[r.rank] || 'bg-slate-100 text-slate-600'}`}>{r.rank}</span>
                            {/* On a phone the result goes under the name, which keeps the
                                row's width; beside it, the names were cut to "Beta …". */}
                            <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
                                <div className="min-w-0 sm:flex-1">
                                    <p className="break-words text-sm font-bold text-slate-900">{r.team.teamName}{mine && <span className="ml-1.5 inline-block rounded-full bg-violet-100 px-2 py-0.5 align-middle text-[10px] font-bold text-violet-700">Your team</span>}</p>
                                    {who && <p className="truncate text-xs text-slate-500">{who}</p>}
                                </div>
                                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 sm:mt-0 sm:block sm:shrink-0 sm:text-right">
                                    <p className="text-xs font-bold text-slate-700 sm:text-sm">{r.result}</p>
                                    <p className="text-[11px] text-slate-500">{r.played ? `Won ${r.won} of ${r.played}` : 'No matches played'}</p>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
            {more && <p data-standings-more className="mt-2 text-xs text-slate-500">Showing {STANDINGS_SHOWN} of {rows.length} teams. Scroll the list to see the rest.</p>}
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
