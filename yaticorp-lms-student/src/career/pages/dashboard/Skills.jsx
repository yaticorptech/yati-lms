import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getTodaysPlan } from '../../services/api';
import { ArrowRight, CheckCircle2, Flame, Lock, Target, Trophy, Zap } from 'lucide-react';
import useCountUp from '../../../hooks/useCountUp';
import useInView from '../../../hooks/useInView';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadError from '../../components/ui/LoadError';
import Button from '../../components/ui/Button';
import {
  LEVELS, initialsOf, nextLevel, progressOf, statusOf, tasksToNextLevel, tileFor, tilesFor
} from '../../utils/skills';
import YatiLoader from '../../../components/YatiLoader';
import useMinimumLoading from '../../../hooks/useMinimumLoading';

/**
 * The Skills page.
 *
 * Left: the banner, then the tracker in three bands — what is moving, what
 * is mastered, and what is waiting. Right: a rail of the numbers the list
 * cannot carry.
 *
 * It used to be eleven identical rows, seven of them grey lines at 0% each
 * repeating "+10 XP", "No task today" and "20 tasks to Intermediate". That
 * reads as a list of things not done. The rule that every task pays the same
 * is now said once, in the header; a row only mentions today's task when
 * there is one; and the untouched skills sit in a compact grid instead of
 * pretending to be progress bars.
 */

// A ladder the student can read as a ladder: untouched grey, then learning
// blue, then the journey's violet, then the green this page uses everywhere
// for mastered.
const LEVEL_STYLES = {
  Beginner: { chip: 'bg-surface-100 text-ink-600 ring-line-200', bar: 'bg-gradient-to-r from-journey-400 to-journey-600' },
  Intermediate: { chip: 'bg-blue-50 text-blue-700 ring-blue-100', bar: 'bg-gradient-to-r from-blue-500 to-cyan-400' },
  Advanced: { chip: 'bg-journey-50 text-journey-700 ring-journey-100', bar: 'bg-gradient-to-r from-journey-500 to-indigo-500' },
  Expert: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', bar: 'fp-done-gradient' }
};

const levelOf = (s) => (LEVELS.includes(s.level) ? s.level : 'Beginner');

function Tile({ tile, name, className = 'h-11 w-11 text-sm' }) {
  return (
    <span
      aria-hidden
      className={`fp-tile-hover flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-black text-white shadow-sm ${className} ${tile}`}
    >
      {initialsOf(name)}
    </span>
  );
}

function LevelChip({ level, className = '' }) {
  return (
    <span
      className={`inline-block rounded-md px-1.5 py-0.5 text-[0.64rem] font-bold ring-1 ring-inset ${LEVEL_STYLES[level].chip} ${className}`}
    >
      {level}
    </span>
  );
}

// The ring's colour per level: the same ladder as the chips.
const RING = { Beginner: '#8b5cf6', Intermediate: '#0ea5e9', Advanced: '#6366f1', Expert: '#10b981' };

/**
 * One skill that is moving, as a card (2026-10-27: "two in a row, a card
 * each"): its tile and level, its name, a ring of its progress, the distance
 * to the next rung, and today's task when there is one.
 */
function ActiveRow({ skill, task, tile, index, closest, seen }) {
  const progress = progressOf(skill);
  // Ring and number driven by one hook so they land together.
  const shown = useCountUp(progress, 900);
  const level = levelOf(skill);
  const up = nextLevel(level);
  const left = tasksToNextLevel(progress);
  const reveal = revealIn(seen, index, 0.06);
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <li
      className={`${reveal.className} group relative flex flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-4 ${
        closest ? 'ring-2 ring-amber-300 shadow-amber-200/60' : 'ring-slate-200/80'
      }`}
      style={reveal.style}
    >
      {/* A soft wash of the skill's own colour, fading out down the card (no hard edge). */}
      <span aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-[0.14] [mask-image:linear-gradient(to_bottom,#000,transparent)] ${tile}`} />

      {/* Tablet and up: one row — the ring on the left, the details beside it — so a wide card is full, not tall and empty. */}
      <div className="relative hidden items-center gap-4 sm:flex">
        <span role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${skill.skillName} progress`}
          className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <circle cx="32" cy="32" r={R} fill="none" stroke="#eef2f7" strokeWidth="6" />
            <circle cx="32" cy="32" r={R} fill="none" stroke={RING[level]} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
          </svg>
          <span className="text-base font-black tabular-nums text-ink-900">{shown}%</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Tile tile={tile} name={skill.skillName} className="h-7 w-7 text-[0.6rem]" />
            <p className="min-w-0 flex-1 truncate text-[0.95rem] font-black text-ink-900" title={skill.skillName}>{skill.skillName}</p>
            {closest ? (
              <span title="Closest to levelling up" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-black whitespace-nowrap text-amber-700">
                <Flame className="fp-flame-live h-3 w-3" /> Closest
              </span>
            ) : <LevelChip level={level} className="shrink-0 whitespace-nowrap" />}
          </div>
          <p className="mt-2 text-xs font-semibold whitespace-nowrap text-ink-500">
            {up ? (
              <><span className="text-sm font-black tabular-nums text-ink-900">{left}</span> {left === 1 ? 'task' : 'tasks'} left · next <span className="font-black text-journey-700">{up}</span></>
            ) : <span className="font-black text-amber-700">Top level reached 🏅</span>}
          </p>
          {task ? (
            <Link to="/career/planner" data-mascot-target={closest ? 'skill-task' : undefined} title={`Today: ${task.title}`}
              className="fp-press mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-gradient-to-r from-journey-600 to-indigo-600 px-3 py-1.5 text-xs font-black text-white shadow-md shadow-journey-500/25 transition-all hover:from-journey-700 hover:to-indigo-700">
              <Zap className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-300" />
              <span className="truncate">Today: {task.title}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <p className="mt-2.5 text-[0.7rem] font-semibold text-ink-400">No task today — keep it going tomorrow.</p>
          )}
        </div>
      </div>

      {/* Phones: stacked, two cards a row. */}
      <div className="relative flex flex-1 flex-col gap-0 sm:hidden">
      <div className="relative flex items-center justify-between gap-2">
        <Tile tile={tile} name={skill.skillName} className="h-9 w-9 text-xs sm:h-10 sm:w-10" />
        {closest ? (
          <span title="Closest to levelling up" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-black whitespace-nowrap text-amber-700">
            <Flame className="fp-flame-live h-3 w-3" /> Closest
          </span>
        ) : <LevelChip level={level} className="shrink-0 whitespace-nowrap" />}
      </div>

      {/* The name, whole words only, two lines at most. */}
      <p className="relative mt-2.5 line-clamp-2 min-h-[2.6em] text-[0.82rem] leading-[1.3] font-black [overflow-wrap:normal] [word-break:normal] text-ink-900 sm:text-sm" title={skill.skillName}>{skill.skillName}</p>

      {/* The ring, with the count of tasks left beside it: short words that fit. */}
      <div className="relative mt-2.5 flex items-center gap-3">
        <span role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${skill.skillName} progress`}
          className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <circle cx="32" cy="32" r={R} fill="none" stroke="#eef2f7" strokeWidth="7" />
            <circle cx="32" cy="32" r={R} fill="none" stroke={RING[level]} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
          </svg>
          <span className="text-[0.8rem] font-black tabular-nums text-ink-900">{shown}%</span>
        </span>
        {up ? (
          <span className="min-w-0 leading-tight whitespace-nowrap">
            <span className="block text-lg font-black tabular-nums text-ink-900">{left}</span>
            <span className="block text-[0.68rem] font-semibold text-ink-500">{left === 1 ? 'task left' : 'tasks left'}</span>
          </span>
        ) : (
          <span className="text-xs font-black whitespace-nowrap text-amber-700">Top level 🏅</span>
        )}
      </div>

      {/* Where those tasks lead, on its own line across the card. */}
      {up && (
        <p className="relative mt-2.5 mb-2.5 rounded-lg bg-journey-50 px-2 py-1.5 text-center leading-tight">
          <span className="block text-[0.58rem] font-bold tracking-wider text-ink-400 uppercase">Next level</span>
          <span className="block text-[0.78rem] font-black whitespace-nowrap text-journey-700">{up}</span>
        </p>
      )}

      {/* Every card ends in one button, pinned to its foot, so the cards in a row line up:
          today's task when there is one, otherwise a quiet way to the planner. */}
      <Link
        to="/career/planner"
        title={task ? `Today: ${task.title}` : 'Open your plan'}
        className={`fp-press relative mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[0.72rem] font-black whitespace-nowrap transition-all ${
          task
            ? 'bg-gradient-to-r from-journey-600 to-indigo-600 text-white shadow-md shadow-journey-500/25 hover:from-journey-700 hover:to-indigo-700'
            : 'bg-surface text-journey-700 ring-1 ring-journey-200 ring-inset hover:bg-journey-50'
        }`}
      >
        {task && <Zap className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-300" />}
        {task ? 'Do today' : 'See tasks'}
        <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>
      </div>
    </li>
  );
}

/** A skill the student has finished. Green, quiet, and proud of it. */
function MasteredRow({ skill, tile, index, seen }) {
  const reveal = revealIn(seen, index, 0.05);
  return (
    <li
      className={`${reveal.className} flex items-center gap-3 rounded-2xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100 ring-inset`}
      style={reveal.style}
    >
      <Tile tile={tile} name={skill.skillName} className="h-10 w-10 text-xs" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink-900">{skill.skillName}</span>
        <LevelChip level={levelOf(skill)} className="mt-1" />
      </span>
      {/* The tick pops in just behind its row, so a band of mastered skills
          ticks itself off one after another rather than all at once. */}
      <CheckCircle2
        className={`h-5 w-5 shrink-0 text-emerald-500 ${seen ? 'animate-pop-in' : 'opacity-0'}`}
        style={{ animationDelay: `${(0.24 + index * 0.05).toFixed(2)}s` }}
        aria-hidden
      />
    </li>
  );
}

/** A skill not yet started. Small on purpose: it is a door, not a debt. */
function WaitingCard({ skill, tile, task, index, seen }) {
  const reveal = revealIn(seen, index, 0.04);
  return (
    <li
      className={`${reveal.className} flex items-center gap-3 rounded-2xl border border-dashed border-line-300 bg-surface p-3 transition-colors hover:border-journey-300 hover:bg-journey-50/40`}
      style={reveal.style}
    >
      <Tile tile={tile} name={skill.skillName} className="h-10 w-10 text-xs opacity-80" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm leading-snug font-bold text-ink-800">{skill.skillName}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <LevelChip level={levelOf(skill)} />
          {task ? (
            <Link to="/career/planner" className="inline-flex items-center gap-0.5 text-[0.66rem] font-black text-journey-700 hover:underline">
              Starts today
              {/* The arrow keeps nudging: this card is the only one in a grid
                  of waiting skills that has something to do today. */}
              <ArrowRight className="fp-nudge-x h-3 w-3" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-[0.66rem] font-semibold text-ink-400">
              <Lock className="h-2.5 w-2.5" />
              Not started
            </span>
          )}
        </span>
      </span>
    </li>
  );
}

function BandHeader({ icon: Icon, tone, title, count, hint }) {
  // The tally counts up with the rows it is counting, so the number and the
  // list arrive as one thing rather than a total sitting above an empty band.
  const shown = useCountUp(count, 700);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="flex items-center gap-2 text-sm font-black text-ink-900">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset ${tone}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        {title}
        <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs font-bold text-ink-500 tabular-nums">{shown}</span>
      </p>
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

/**
 * One band of the tracker, which holds its entrance until it is scrolled to.
 *
 * Every row carries a staggered entrance, and they all ran on mount — so on a
 * tracker holding a dozen skills the bands past the fold played the whole
 * sequence to nobody and were sitting motionless by the time anyone reached
 * them. `seen` is handed to the rows, which stay transparent until it turns
 * true and then arrive in order.
 *
 * The rows are rendered either way, never swapped for a placeholder: a band
 * that changed height when it came into view would shove the page around
 * under the reader, which is the one thing a reveal must not do.
 */
function Band({ children }) {
  const [ref, seen] = useInView();
  return <section ref={ref}>{children(seen)}</section>;
}

/**
 * How a row arrives, once its band has been seen.
 *
 * `fp-reveal` is the roadmap's transition, reused: opacity and a small rise,
 * driven by a class rather than an animation, so holding it back is a matter
 * of not adding the class yet. The delay staggers the band.
 */
const revealIn = (seen, i, step = 0.05) => ({
  className: `fp-reveal ${seen ? 'is-in' : ''}`,
  style: { transitionDelay: `${(seen ? i * step : 0).toFixed(2)}s` }
});

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  // The skill list itself not arriving. Without this a dropped connection
  // read as "No skills tracked yet" and sent the student to the planner.
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      // Tasks, badges and history are garnish on the skill list, so none of
      // them failing may take the list down with it. The streak spans days,
      // so it has to come from history — `/tasks` is today's plan only, and
      // getTodaysPlan waits for it if the planner is still building it.
      const [skillRes, taskRes] = await Promise.all([
        api.get('/skills'),
        getTodaysPlan({ tries: 4 }).catch(() => null)
      ]);
      setSkills(Array.isArray(skillRes.data) ? skillRes.data : []);
      const t = taskRes?.data;
      setTasks(Array.isArray(t) ? t : t?.tasks || []);
      setFailed(false);
    } catch (err) {
      console.error(err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const retry = async () => {
    setRetrying(true);
    await fetchAll();
    setRetrying(false);
  };

  // Today's unfinished task for each skill, by the name the task names.
  const taskFor = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t.skill && t.status !== 'Completed' && !map.has(t.skill)) map.set(t.skill, t);
    });
    return map;
  }, [tasks]);

  const tiles = useMemo(() => tilesFor(skills), [skills]);

  // No level filter and no rule-of-the-game strip above the list: the bands
  // below already sort the skills, and each row says what it is worth.
  const visible = skills;

  // Three bands. Moving skills lead, furthest-along first; the rest sit in
  // rung order, then by name.
  const byName = (a, b) => String(a.skillName).localeCompare(String(b.skillName));
  const active = visible.filter((s) => statusOf(s) === 'active').sort((a, b) => progressOf(b) - progressOf(a) || byName(a, b));
  const mastered = visible.filter((s) => statusOf(s) === 'completed').sort(byName);
  const waiting = visible
    .filter((s) => statusOf(s) === 'pending')
    .sort((a, b) => LEVELS.indexOf(levelOf(a)) - LEVELS.indexOf(levelOf(b)) || byName(a, b));


  // The one honest headline: the moving skill closest to levelling up.
  const closest = useMemo(() => {
    const climbing = skills.filter((s) => statusOf(s) === 'active' && nextLevel(levelOf(s)));
    if (!climbing.length) return null;
    return climbing.reduce((best, s) =>
      tasksToNextLevel(s.progress) < tasksToNextLevel(best.progress) ? s : best
    );
  }, [skills]);

  const showLoader = useMinimumLoading(loading);
  if (showLoader) return <YatiLoader label="Loading your skills" />;
  if (failed) return <LoadError title="We couldn't load your skills" onRetry={retry} retrying={retrying} />;

  return (
    <div className="fp-enter">
      <div className="min-w-0 space-y-4">
        {skills.length === 0 ? (
          <>
          <EmptyState
            icon={Target}
            title="No skills tracked yet"
            description="Your AI mentor creates a skill set when it generates your task plan. Head to the planner to get started."
            accent="violet"
            action={
              <Link to="/career/planner">
                <Button icon={Target}>Go to Planner</Button>
              </Link>
            }
          />
          </>
        ) : (
          /* On a phone the banner and the skill list are one card (asked
             2026-10-15, "merge these two sections in mobile view only"): the
             banner is its head and the list runs on under it. From sm up they
             stay two cards with the usual gap. */
          <div className="max-sm:overflow-hidden max-sm:rounded-2xl max-sm:border max-sm:border-line-200/80 max-sm:bg-surface max-sm:shadow-card sm:space-y-4">
          <Card data-mascot-target="skill-progress" padded={false} className="overflow-hidden max-sm:rounded-none max-sm:border-0 max-sm:shadow-none">
            <div className="space-y-6 p-4 sm:p-5">
              {/* ---- IN PROGRESS ---- */}
              {active.length > 0 && (
                <Band>
                  {(seen) => (
                    <>
                      <BandHeader
                        icon={Flame}
                        tone="bg-amber-50 text-amber-600 ring-amber-100"
                        title="In progress"
                        count={active.length}
                      />
                      <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3">
                        {active.map((skill, i) => (
                          <ActiveRow
                            key={skill._id || skill.skillName}
                            skill={skill}
                            task={taskFor.get(skill.skillName)}
                            tile={tiles.get(skill.skillName) || tileFor(skill.skillName)}
                            index={i}
                            closest={closest?._id === skill._id}
                            seen={seen}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </Band>
              )}

              {/* ---- MASTERED ---- */}
              {mastered.length > 0 && (
                <Band>
                  {(seen) => (
                    <>
                      <BandHeader
                        icon={Trophy}
                        tone="bg-emerald-50 text-emerald-600 ring-emerald-100"
                        title="Mastered"
                        count={mastered.length}
                        hint="Done. These already count as experience."
                      />
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {mastered.map((skill, i) => (
                          <MasteredRow
                            key={skill._id || skill.skillName}
                            skill={skill}
                            tile={tiles.get(skill.skillName) || tileFor(skill.skillName)}
                            index={i}
                            seen={seen}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </Band>
              )}

              {/* ---- WAITING ---- */}
              {waiting.length > 0 && (
                <Band>
                  {(seen) => (
                    <>
                      <BandHeader
                        icon={Target}
                        tone="bg-journey-50 text-journey-600 ring-journey-100"
                        title="Ready when you are"
                        count={waiting.length}
                      />
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {waiting.map((skill, i) => (
                          <WaitingCard
                            key={skill._id || skill.skillName}
                            skill={skill}
                            task={taskFor.get(skill.skillName)}
                            tile={tiles.get(skill.skillName) || tileFor(skill.skillName)}
                            index={i}
                            seen={seen}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </Band>
              )}

            </div>
          </Card>
          </div>
        )}
      </div>

      {/* The side rail (overall progress, skill XP, recent achievements, "Small steps") went on 2026-10-27. */}
    </div>
  );
}
