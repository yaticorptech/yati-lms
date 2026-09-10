import { useEffect, useState } from 'react';
import { Trophy, Star, Layers, Gamepad2, RefreshCw, Crown, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import { GAMES_SYNCED } from './levels';

/**
 * Who has earned the most stars across the brain games.
 *
 * Ranked on stars rather than XP on purpose: XP measures real work on the
 * roadmap, and this board must never become a reason to farm a memory game.
 * Stars are their own currency, spent nowhere, and the only thing a good
 * game session can change here.
 *
 * Two shapes, one component, so there is only ever one idea of what a rank
 * looks like. `dense` is the one the games hub uses: bare of card chrome and
 * narrow enough to sit inside the "Your game journey" panel in the hero,
 * where a student sees where they stand the moment the page opens. The full
 * shape is its own card, wider, and runs its ten names in two columns.
 *
 * Neither uses a podium. It reserved a lot of height to show three names, and
 * showed almost nothing on a board that holds one — the colour of the rank
 * chip carries the same meaning in a row.
 */
const PERIODS = [
  ['daily', 'Today'],
  ['weekly', 'This week'],
  ['monthly', 'This month'],
  ['all', 'All time']
];

const SCOPES = [
  ['global', 'Everyone'],
  ['institution', 'My institution'],
  ['class', 'My class']
];

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

function Avatar({ entry }) {
  return entry.profilePicture ? (
    <img src={entry.profilePicture} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[0.62rem] font-black text-violet-700">
      {initials(entry.name)}
    </span>
  );
}

/*
 * Written out in full rather than built from a variable: Tailwind scans the
 * source text, so a class name assembled at runtime compiles to no CSS.
 */
const RANK_CHIP = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-slate-300 text-slate-800',
  3: 'bg-orange-300 text-orange-950'
};

/*
 * Written out in full, because Tailwind scans the source text and a class
 * assembled from a variable compiles to nothing.
 */
const MEDAL = {
  1: 'bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 ring-amber-200',
  2: 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-700 ring-slate-200',
  3: 'bg-gradient-to-br from-orange-200 to-orange-400 text-orange-950 ring-orange-200'
};

/**
 * One line of the board: where they came, who they are, and what they have.
 *
 * The top three get a medal disc rather than a plain number, which is the
 * whole reason anyone glances at a leaderboard in the first place.
 */
function Row({ entry, dense }) {
  const medal = MEDAL[entry.rank];
  return (
    <li
      className={`flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition-colors ${
        entry.isMe
          ? 'bg-violet-50 ring-1 ring-violet-200 ring-inset'
          : 'bg-surface ring-1 ring-line-100 ring-inset hover:bg-surface-50'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums ring-2 ring-inset ${
          medal || 'bg-surface-100 text-ink-400 ring-line-100'
        }`}
      >
        {entry.rank ?? '–'}
      </span>

      <Avatar entry={entry} />

      <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#173a63]">
        {entry.name}
        {entry.isMe && (
          <span className="ml-1.5 rounded-md bg-violet-600 px-1.5 py-0.5 align-middle text-[0.58rem] font-black tracking-wide text-white uppercase">
            You
          </span>
        )}
      </span>

      {!dense && (
        <>
          <span className="hidden items-center gap-1 text-[0.68rem] font-semibold text-ink-400 tabular-nums sm:inline-flex">
            <Layers className="h-3 w-3" />
            {entry.cleared}
          </span>
          <span className="hidden items-center gap-1 text-[0.68rem] font-semibold text-ink-400 tabular-nums sm:inline-flex">
            <Gamepad2 className="h-3 w-3" />
            {entry.games}
          </span>
        </>
      )}

      <span className="inline-flex items-center gap-1 text-sm font-black text-[#173a63] tabular-nums">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        {entry.stars}
      </span>
    </li>
  );
}

/** Why a cohort board is empty, in the student's own terms. */
const emptyReason = (scope, cohort) => {
  if (scope === 'institution' && !cohort?.institution) {
    return 'Add your institution on your profile to see how you rank against people there.';
  }
  if (scope === 'class' && (!cohort?.institution || !cohort?.className)) {
    return 'Add your institution and class on your profile to compete with classmates.';
  }
  return 'No stars yet. Clear a level and be the first name here.';
};

const SELECT =
  'min-h-9 cursor-pointer rounded-xl border border-line-200 bg-surface-50 px-2.5 py-1.5 text-xs font-bold text-ink-700 outline-none transition-colors hover:border-violet-200 focus:border-violet-400';

export default function GameLeaderboard({ dense = false, limit }) {
  const shownLimit = limit ?? (dense ? 5 : 10);
  const [period, setPeriod] = useState('weekly');
  const [scope, setScope] = useState('global');
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ key: null, board: null, error: null });
  const key = `${period}|${scope}`;

  // A level just ended and the server has it: draw the new standings.
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(GAMES_SYNCED, bump);
    return () => window.removeEventListener(GAMES_SYNCED, bump);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/games/leaderboard', { params: { period, scope } })
      .then(({ data }) => !cancelled && setState({ key, board: data, error: null }))
      .catch((e) =>
        !cancelled &&
        setState({ key, board: null, error: e.response?.data?.message || 'Could not load the leaderboard' })
      );
    return () => {
      cancelled = true;
    };
  }, [period, scope, key, tick]);

  const board = state.key === key ? state.board : null;
  const error = state.key === key ? state.error : null;
  const loading = !board && !error;

  const shown = board ? board.entries.slice(0, shownLimit) : [];
  const me = board?.me;
  const meShown = shown.some((e) => e.isMe);
  // Two columns only once there is enough to fill both; a short board reads
  // better as one list than as one column beside an empty one.
  const split = !dense && shown.length > 5;
  const half = Math.ceil(shown.length / 2);

  const filters = (
    <div className={`flex items-center gap-2 ${dense ? 'mt-3' : 'ml-auto'}`}>
      <select
        aria-label="Period"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className={`${SELECT} ${dense ? 'min-w-0 flex-1' : ''}`}
      >
        {PERIODS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Scope"
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        className={`${SELECT} ${dense ? 'min-w-0 flex-1' : ''}`}
      >
        {SCOPES.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );

  const body = (
    <>
      {loading && (
        <p className="flex items-center justify-center gap-2 py-6 text-xs font-semibold text-ink-400">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Loading…
        </p>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <p className="text-xs font-semibold text-ink-500">{error}</p>
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className="fp-press inline-flex items-center gap-1.5 rounded-lg bg-journey-600 px-2.5 py-1.5 text-[0.68rem] font-black text-white"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </button>
        </div>
      )}

      {board && shown.length === 0 && (
        <p className="px-2 py-5 text-center text-xs leading-relaxed font-semibold text-ink-500">
          {emptyReason(scope, board.cohort)}
        </p>
      )}

      {board && shown.length > 0 && (
        <>
          {/* Wide enough for two columns of five, rather than ten rows with
              half the width empty. The dense panel is never wide enough. */}
          <div className={split ? 'grid gap-x-6 gap-y-0.5 lg:grid-cols-2' : ''}>
            <ol className="space-y-0.5">
              {(split ? shown.slice(0, half) : shown).map((entry) => (
                <Row key={String(entry.userId)} entry={entry} dense={dense} />
              ))}
            </ol>
            {split && (
              <ol className="space-y-0.5">
                {shown.slice(half).map((entry) => (
                  <Row key={String(entry.userId)} entry={entry} dense={dense} />
                ))}
              </ol>
            )}
          </div>

          {/* The student's own row, whenever the board above did not reach it. */}
          {me && !meShown && (
            <>
              <p className="py-0.5 text-center text-[0.62rem] font-black tracking-widest text-ink-300">· · ·</p>
              <ol className="space-y-0.5">
                <Row entry={{ ...me, name: me.name || 'You' }} dense={dense} />
              </ol>
            </>
          )}

          <p className="mt-2 px-1 text-right text-[0.68rem] font-semibold text-ink-400">
            {board.total} player{board.total === 1 ? '' : 's'} ranked
          </p>
        </>
      )}
    </>
  );

  // The panel beside the banner: a crown, the standings, and a way to see more.
  if (dense) {
    return (
      <div data-guide="game-leaderboard">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 shrink-0 fill-amber-400 text-amber-500" />
          <h2 className="flex-1 text-base font-black text-[#173a63]">Leaderboard</h2>
          {/* The period is the only choice worth offering here. Scope was a
              second dropdown that nearly every student left on Everyone, and
              two controls over three rows read as more machinery than board. */}
          <select
            aria-label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={SELECT}
          >
            {PERIODS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">{body}</div>
      </div>
    );
  }

  return (
    <section
      data-guide="game-leaderboard"
      className="overflow-hidden rounded-2xl border border-line-200 bg-surface shadow-card"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line-100 px-3 py-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <Trophy className="h-3.5 w-3.5 text-amber-600" />
        </span>
        <h2 className="text-xs font-black text-ink-900">Leaderboard</h2>
        <span className="hidden text-[0.68rem] font-semibold text-ink-400 sm:inline">
          Stars earned across every game
        </span>
        {filters}
      </div>
      <div className="p-2.5">{body}</div>
    </section>
  );
}
