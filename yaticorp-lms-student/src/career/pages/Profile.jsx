import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Flame, CheckCircle2, TrendingUp, Award, RotateCcw, GraduationCap, Compass, CalendarDays, MapPin, ArrowRight, Zap, Check, Lock, Flag, Sparkles, Trophy,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Card, { CardHeader } from '../components/ui/Card';
import ProgressArt from '../components/progress/ProgressArt';
import { SkillsArt } from '../components/ui/PanelArt';
import useLevelProgress from '../context/useLevelProgress';
import LoadError from '../components/ui/LoadError';
import { phaseStates, journeyPercent, phaseTitle, parseChoices } from '../utils/roadmap';
import { initialsOf, tilesFor } from '../utils/skills';
import { dailyBoost } from '../utils/motivation';
import useCountUp from '../../hooks/useCountUp';
import YatiLoader from '../../components/YatiLoader';
import useMinimumLoading from '../../hooks/useMinimumLoading';
import { useXpRule } from '../../context/useRewards';
import { usePointLoopWhenNear } from '../../components/loopGuide';

// Title-casing these would produce "Mca" or "Qa Engineer", which reads worse
// than the lowercase original. Degrees and tech terms stay uppercase.
const ACRONYMS = new Set([
  'mca', 'bca', 'mba', 'bba', 'msc', 'bsc', 'mcom', 'bcom',
  'llb', 'llm', 'mbbs', 'phd', 'ms', 'ba', 'ma', 'be', 'me',
  'it', 'cs', 'cse', 'ece', 'qa', 'ui', 'ux', 'hr', 'ai', 'ml', 'sql', 'css',
  'html', 'js', 'php', 'api', 'ios', 'aws', 'seo'
]);

// Degrees people type without punctuation, where neither plain title-case nor
// full uppercase is right ("Btech" / "BTECH" instead of "B.Tech").
const SPECIAL = { btech: 'B.Tech', mtech: 'M.Tech', bdes: 'B.Des', mdes: 'M.Des' };

/**
 * Goals are typed by hand, so "developer" / "mca" / "ui/ux" arrive lowercase.
 *
 * Cased per punctuation-separated part rather than per word, so "b.tech" and
 * "ui/ux" resolve each side independently instead of shouting the whole token.
 */
const titleCase = (text) =>
  String(text || '')
    .trim()
    .split(/(\s+)/)
    .map((token) => {
      const bare = token.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (SPECIAL[bare]) return SPECIAL[bare];

      return token
        .split(/([^a-z0-9]+)/i)
        .map((part) => {
          if (!/[a-z0-9]/i.test(part)) return part; // punctuation, keep as-is
          if (ACRONYMS.has(part.toLowerCase())) return part.toUpperCase();
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join('');
    })
    .join('');

/**
 * Where the student started, described by the fields that matter for THEIR
 * level.
 *
 * Onboarding keeps every field it has ever collected, so a postgraduate can
 * still carry a stale `currentClass` from an earlier answer. Reading that first
 * printed "class 5 · 2nd" for an MCA student — so each level now reads only the
 * fields that belong to it.
 */
const describeStart = (goal) => {
  if (!goal) return { title: '', detail: null };
  const level = goal.educationLevel || '';

  if (level === 'Working Professional') {
    const years = Number(goal.experience);
    return {
      title: titleCase(goal.currentJob) || 'Working Professional',
      detail: years ? `${years} year${years === 1 ? '' : 's'} of experience` : level
    };
  }

  if (['Undergraduate', 'Postgraduate', 'Diploma'].includes(level)) {
    const course = [goal.degree, goal.specialization].filter(Boolean).map(titleCase).join(' · ');
    return {
      title: course || level,
      detail: [level, goal.currentYear].filter(Boolean).join(' · ')
    };
  }

  // School levels are the only ones where currentClass is meaningful.
  return { title: titleCase(goal.currentClass) || level, detail: goal.currentClass ? level : null };
};

/** One labelled fact in the band under the header. */
/** The level as a ring filled towards the next one, with the number inside. */
function LevelRing({ level, percent }) {
  const size = 92;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, percent)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-journey-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="#ffb800"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <span className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-journey-500 to-indigo-600 text-white shadow-lg shadow-journey-500/30">
        <span className="text-[0.52rem] font-black tracking-[0.14em] opacity-80 uppercase">Level</span>
        <span className="text-xl leading-none font-black tabular-nums">{level}</span>
      </span>
    </div>
  );
}

const Fact = ({ icon: Icon, label, value, detail }) => (
  <div className="min-w-0">
    <p className="flex items-center gap-1.5 text-[0.68rem] font-black tracking-[0.11em] text-ink-400 uppercase">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </p>
    <p className="mt-1 font-black break-words text-ink-900">{value || '—'}</p>
    {detail && <p className="mt-0.5 text-sm text-ink-500">{detail}</p>}
  </div>
);

/**
 * The roadmap as a slim track: where the student has been, where they stand,
 * and how much is left. Phase names are the real ones from the generated
 * roadmap — nothing here is a stock label.
 */
function RoadmapTrack({ phases, completedPhases, percent }) {
  const states = phaseStates(phases.length, completedPhases);
  const currentIndex = states.indexOf('current');

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[0.68rem] font-black tracking-[0.11em] text-ink-400 uppercase">
          <MapPin className="h-3.5 w-3.5" />
          Roadmap progress
        </p>
        <p className="text-sm font-black text-ink-900 tabular-nums">
          {currentIndex >= 0 ? `Phase ${currentIndex + 1} of ${phases.length}` : 'Every phase complete'}
          <span className="text-ink-400"> · {percent}%</span>
        </p>
      </div>

      {/* The nodes keep a fixed 5rem column so labels never clip, but the
          connectors take every remaining pixel — so four phases stretch to
          both edges instead of bunching at the left, and a long roadmap still
          scrolls rather than squeezing. */}
      <ol className="flex snap-x snap-mandatory items-start overflow-x-auto pb-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_82%,transparent)] [&::-webkit-scrollbar]:hidden sm:snap-none sm:[mask-image:none]">
        {phases.map((phase, index) => {
          const state = states[index];
          const done = state === 'done';
          const current = state === 'current';
          const lead = parseChoices(phaseTitle(phase))?.lead || phaseTitle(phase);

          return (
            <li key={index} className={`flex items-start ${index > 0 ? 'min-w-24 flex-1' : ''}`}>
              {index > 0 && (
                <span
                  aria-hidden
                  className={`mt-[1.05rem] h-1 min-w-4 flex-1 rounded-full ${
                    states[index - 1] === 'done' ? 'bg-emerald-400' : 'bg-line-200'
                  }`}
                />
              )}
              <div className="flex w-20 shrink-0 flex-col items-center px-1 text-center">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    done
                      ? 'fp-done-gradient text-white'
                      : current
                        ? 'fp-journey-gradient text-white shadow-lg shadow-journey-600/30'
                        : 'bg-surface-100 text-ink-400 ring-1 ring-line-200 ring-inset'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : current ? index + 1 : <Lock className="h-3.5 w-3.5" />}
                </span>
                <span className={`mt-1.5 text-[0.68rem] font-black ${current ? 'text-ink-900' : 'text-ink-400'}`}>
                  Phase {index + 1}
                </span>
                <span
                  className="mt-0.5 w-full overflow-hidden text-[0.66rem] leading-tight text-ink-400 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                  title={lead}
                >
                  {lead}
                </span>
              </div>
            </li>
          );
        })}
        <li className="flex min-w-16 flex-1 items-start">
          <span aria-hidden className="mt-[1.05rem] h-1 min-w-4 flex-1 rounded-full bg-line-200" />
          <span className="mt-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <Flag className="h-4 w-4" />
          </span>
        </li>
      </ol>
    </div>
  );
}

/**
 * Skills, split the way the mockup splits them: the few being moved right now,
 * and the rest waiting. Both counts are real — a student with nothing started
 * sees an empty "in progress" column rather than an invented one.
 */
function SkillsPanel({ skills }) {
  const ordered = [...skills].sort((a, b) => (b.progress || 0) - (a.progress || 0));
  const started = ordered.filter((s) => (s.progress || 0) > 0);
  const untouched = ordered.filter((s) => !(s.progress || 0));
  const shownUntouched = untouched.slice(0, 4);
  const tiles = tilesFor(skills);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_auto]">
      <div className="min-w-0">
        <p className="text-[0.68rem] font-black tracking-[0.11em] text-ink-400 uppercase">
          In progress · <span className="tabular-nums">{started.length}</span>
        </p>
        {started.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">
            Nothing started yet — finishing a task moves the first bar.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {started.slice(0, 4).map((skill, i) => (
              <li key={i} className="flex items-start gap-3">
                {/* A tinted initial rather than an invented icon: a wrong
                    glyph beside "SQL" would say something untrue about it. */}
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-black text-white shadow-sm ${tiles.get(
                    skill.skillName
                  )}`}
                >
                  {initialsOf(skill.skillName)}
                </span>
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm font-bold break-words text-ink-900">
                    {skill.skillName}
                  </span>
                  {skill.level && (
                    <span className="rounded-md bg-journey-50 px-1.5 py-0.5 text-[0.62rem] font-black text-journey-700">
                      {skill.level}
                    </span>
                  )}
                  <span className="text-xs font-black text-ink-500 tabular-nums">{skill.progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-100">
                  <div
                    className="fp-fill h-full rounded-full bg-gradient-to-r from-journey-400 to-indigo-600"
                    style={{ width: `${Math.min(100, skill.progress || 0)}%`, animationDelay: `${i * 0.08}s` }}
                  />
                </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[0.68rem] font-black tracking-[0.11em] text-ink-400 uppercase">
          Not started · <span className="tabular-nums">{untouched.length}</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {shownUntouched.map((skill, i) => (
            <li
              key={i}
              className="rounded-lg bg-surface-50 px-2.5 py-1.5 text-xs font-semibold text-ink-600 ring-1 ring-line-200 ring-inset"
            >
              {skill.skillName}
            </li>
          ))}
          {untouched.length > shownUntouched.length && (
            <li className="px-1 py-1.5 text-xs font-black text-journey-700 tabular-nums">
              +{untouched.length - shownUntouched.length} more
            </li>
          )}
        </ul>
      </div>

      {/* The skills art beside the skill bars, floating, with a couple of
          drifting sparks. Decorative: everything it stands next to is stated
          in text. */}
      <div
        aria-hidden
        className="relative hidden h-44 w-52 shrink-0 items-end justify-center self-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 via-surface to-pink-50 ring-1 ring-journey-100 ring-inset lg:flex"
      >
        <span className="fp-drift-icon absolute top-3 left-4 text-lg" style={{ animationDelay: '-1.4s' }}>✨</span>
        <span className="fp-drift-icon absolute top-8 right-4 text-base" style={{ animationDelay: '-3.1s' }}>⭐</span>
        <span className="fp-drift-icon absolute bottom-10 left-3 text-sm" style={{ animationDelay: '-2.2s' }}>⚡</span>
        <span className="absolute bottom-2 left-1/2 h-5 w-28 -translate-x-1/2 rounded-full bg-journey-300/40 blur-lg" />
        <SkillsArt className="relative mb-1 h-32 w-32" />
      </div>
    </div>
  );
}

// "HTML", "HTML and CSS", "HTML, CSS and JavaScript".
const listOf = (names) => (names.length < 2 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
const TAP = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'Tap' : 'Click';

/**
 * What Yati says when the student comes near Still to do (asked 2026-10-15:
 * "complete these task to gain the skill"). Finishing a task grows the skill
 * it is tagged with, when that skill is one the student tracks
 * (taskCompletionService), so only those skills are named; the XP is the
 * admin's task rule, left out when it pays nothing. Null with nothing to do.
 */
const stillToDoLine = (tasks, skills, taskXp) => {
  if (!tasks?.length) return null;
  const tracked = new Map((skills || []).map((s) => [String(s.skillName || '').trim().toLowerCase(), s.skillName]));
  const grows = [...new Set(tasks.map((t) => tracked.get(String(t.skill || '').trim().toLowerCase())).filter(Boolean))].slice(0, 3);
  const one = tasks.length === 1;
  const gain = grows.length ? `grow your ${listOf(grows)} ${grows.length === 1 ? 'skill' : 'skills'}` : 'keep your skills growing';
  const xp = taskXp > 0 ? ` and earn ${taskXp} XP${one ? '' : ' each'}` : '';
  return `${one ? 'Finish this task' : `Finish these ${tasks.length} tasks`} to ${gain}${xp}. ${TAP} “Do it today” to put ${one ? 'it' : 'one'} back on today's plan.`;
};

/**
 * Still to do, folded (asked 2026-10-15: "make it drop down only name
 * visible", "visible only 5", "add scroll button"). Each task shows its
 * name, in full ("make sure that full heading of task is visible"), with "Do
 * it today" beside it ("with that heading make sure that do it today button
 * is also visible"), and opens to say the rest — what to do, and when it
 * was last on the plan. Five rows show at
 * a time and the rest scroll inside the card; the button at the foot scrolls
 * on, and back to the top from the end.
 */
const STILL_ROWS = 5;
const STILL_ROW_H = 48; // about one one-line row, kept in view when scrolling on

/**
 * How tall the list's window is: the first five names as they wrap, plus the
 * open task's details, so five rows still show with one of them open — an
 * open task is often taller than five names on its own, and its "Do it today"
 * would otherwise sit out of sight inside the window. Null with five or fewer.
 */
const stillWindow = (box, openId) => {
  const rows = box ? [...box.querySelectorAll('[data-still-row]')] : [];
  if (rows.length <= STILL_ROWS) return null;
  // Exact heights, hairlines and all: whole-pixel ones add up short and clip
  // the fifth name's last line.
  const first = rows.slice(0, STILL_ROWS);
  const names = first.reduce((h, row) => h + row.getBoundingClientRect().height, 0);
  // An open task further down still gets its room.
  const open = openId && !first.some((row) => row.getAttribute('data-still-row') === openId)
    ? box.querySelector(`[data-still-row="${openId}"] [data-still-body]`)?.getBoundingClientRect().height || 0
    : 0;
  return Math.ceil(names + open);
};

function StillToDoList({ tasks, redoingId, onRedo }) {
  const [openId, setOpenId] = useState(null);
  const boxRef = useRef(null);
  const scrolls = tasks.length > STILL_ROWS;
  // Rows wholly below the visible part, and whether the end is in view.
  const [below, setBelow] = useState(0);
  const [atEnd, setAtEnd] = useState(!scrolls);
  const [win, setWin] = useState(null);
  const measure = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const bottom = box.scrollTop + box.clientHeight;
    setBelow([...box.querySelectorAll('[data-still-row]')].filter((li) => li.offsetTop >= bottom - 4).length);
    setAtEnd(bottom >= box.scrollHeight - 4);
    setWin(stillWindow(box, openId));
  }, [openId]);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver !== 'function') return undefined;
    // Fires once on observing, and again whenever a row opens, closes or goes.
    const watch = new ResizeObserver(measure);
    watch.observe(box);
    if (box.firstElementChild) watch.observe(box.firstElementChild);
    // And once the web font is in: names set in the fallback font measure a
    // little short, and the window then clips the fifth.
    let live = true;
    document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
      watch.disconnect();
    };
  }, [measure]);

  const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // The window for the row now open, set before the first paint too so the
  // whole list never flashes up first. And the open row brought into view,
  // never past its name — reckoned against the new window, which the list
  // has not grown to yet at this point.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const next = stillWindow(box, openId);
    setWin(next);
    const row = openId ? box?.querySelector(`[data-still-row="${openId}"]`) : null;
    if (!row) return;
    const view = next ?? box.clientHeight;
    const by = Math.min(row.offsetTop - box.scrollTop, row.offsetTop + row.offsetHeight - (box.scrollTop + view));
    if (by > 2) box.scrollTo({ top: box.scrollTop + by, behavior: still() ? 'auto' : 'smooth' });
  }, [openId]);

  const scrollOn = () => {
    const box = boxRef.current;
    if (!box) return;
    box.scrollTo({ top: atEnd ? 0 : box.scrollTop + box.clientHeight - STILL_ROW_H, behavior: still() ? 'auto' : 'smooth' });
  };

  return (
    <div>
        <div
          ref={boxRef}
          onScroll={measure}
          className="relative overflow-x-hidden overflow-y-auto [overflow-anchor:none]"
          style={{ maxHeight: win ?? undefined }}
        >
          <ul className="divide-y divide-line-100">
            {tasks.map((task) => {
              const open = openId === task._id;
              const toggle = () => setOpenId(open ? null : task._id);
              return (
                <li key={task._id} data-still-row={task._id} className="py-3">
                  {/* The name, "Do it today", then the arrow (asked
                      2026-10-15: "keep the button before the arrow here in
                      desktop"). On a phone the name and its arrow share the
                      first line and the button goes under them — beside the
                      name it squeezed a long one into five short lines. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <button
                      type="button"
                      onClick={toggle}
                      aria-expanded={open}
                      aria-controls={`still-${task._id}`}
                      className="order-1 min-w-0 flex-1 py-0.5 text-left text-sm leading-snug font-semibold text-ink-900"
                    >
                      {task.title}
                    </button>
                    <div className="order-3 basis-full sm:order-2 sm:basis-auto sm:shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={RotateCcw}
                        loading={redoingId === task._id}
                        loadingText="Adding…"
                        onClick={() => onRedo(task)}
                        className="whitespace-nowrap"
                      >
                        Do it today
                      </Button>
                    </div>
                    {/* The same toggle as the name, for the eye and the
                        thumb; the name is the one a keyboard reaches. */}
                    <button
                      type="button"
                      onClick={toggle}
                      tabIndex={-1}
                      aria-hidden
                      className="order-2 -my-1 shrink-0 p-1 text-ink-400 sm:order-3"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {open && (
                    <div id={`still-${task._id}`} data-still-body className="animate-fade-in pt-2 pb-1">
                      {/* No "came up N times" tag (removed 2026-10-16, "dont show this"). */}
                      {task.description && <p className="text-sm leading-relaxed text-ink-500">{task.description}</p>}
                      {task.lastSkippedAt && (
                        <p className="mt-1.5 text-xs text-ink-400">
                          Last on your plan {new Date(task.lastSkippedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      {scrolls && (
        <button
          type="button"
          onClick={scrollOn}
          className="mx-auto mt-2 flex items-center gap-1 rounded-full bg-surface-100 px-3 py-1.5 text-xs font-bold text-ink-600 ring-1 ring-line-200 ring-inset transition-colors hover:bg-surface-50"
        >
          {atEnd ? (
            <>Back to top <ChevronUp className="h-3.5 w-3.5" /></>
          ) : (
            <>{below > 0 ? `${below} more` : 'More'} <ChevronDown className="h-3.5 w-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}

export default function Profile() {
  // The admin's 'career_task' rule (Rewards → Reward rules), not a number of our own.
  const TASK_XP = useXpRule('career_task');
  const { user, loading } = useContext(AuthContext);
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  // How far along the roadmap itself is. This page reported days planned,
  // tasks done, skills and achievements — every measure of effort, and none of
  // distance. "Day 12 of your plan" does not tell a student whether they are
  // near the end of school or halfway through a master's.
  const [roadmap, setRoadmap] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [redoingId, setRedoingId] = useState(null);
  // Above the early return below: hooks must run on every render.
  const showLoader = useMinimumLoading(loading);
  const shownXp = useCountUp(Number(user?.xp) || 0, 1000);
  const levelInfo = useLevelProgress(user?.xp, user?.level);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // Today's Plan's "Pending tasks · View" chip opens this page at Still to do
  // (#still-to-do): brought into view once the list has loaded and is drawn.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== '#still-to-do' || showLoader || loadingSummary) return undefined;
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => document.getElementById('still-to-do')?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' }), 200);
    return () => clearTimeout(timer);
  }, [hash, showLoader, loadingSummary]);
  // Yati's words for Still to do, said when the student scrolls near it.
  const stillLine = stillToDoLine(summary?.skippedTasks, summary?.skills, TASK_XP);
  usePointLoopWhenNear('#still-to-do', !showLoader && !loadingSummary && !!stillLine);

  // No signed-out redirect here. This page renders inside ProtectedRoute, which
  // already holds it back until there is a session.

  // GET /profile/summary sweeps missed tasks (a write) before it answers.
  // Returned so a caller can wait on it; a failure keeps the summary that is
  // on screen rather than blanking it.
  const loadSummary = useCallback(
    () =>
      api
        .get('/profile/summary')
        .then(({ data }) => {
          setSummary(data);
          setSummaryFailed(false);
        })
        .catch(() => setSummaryFailed(true))
        .finally(() => setLoadingSummary(false)),
    []
  );

  // Keyed on who the student is, not on the user object. CareerShell
  // refreshes that object on every navigation (XP may have moved), and keyed
  // on it this re-ran the sweep and all three reads each time — twice on
  // arrival alone.
  const userId = user?._id;
  useEffect(() => {
    if (!userId) return;
    loadSummary();

    // Each on its own failure: a student with a summary but no roadmap keeps
    // the rest of the page.
    api.get('/roadmap').then(({ data }) => setRoadmap(data)).catch(() => setRoadmap(null));
  }, [userId, loadSummary]);

  const retrySummary = async () => {
    setRetrying(true);
    await loadSummary();
    setRetrying(false);
  };

  const handleRedo = async (task) => {
    setRedoingId(task._id);
    try {
      await api.post(`/profile/skipped/${task._id}/redo`);
      // A row is every miss of one task, and only one of them moves. The
      // server stops listing the row once a copy is on today's plan, so the
      // row goes at once and the counts are then re-read — subtracting one
      // locally would be wrong whenever the row stood for several misses.
      setSummary((prev) => ({
        ...prev,
        skippedTasks: prev.skippedTasks.filter((t) => t._id !== task._id)
      }));
      loadSummary();
      toast.success(`"${task.title}" is back on today's plan.`, 'Added back');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not move that task.');
    } finally {
      setRedoingId(null);
    }
  };

  if (showLoader || !user) return <YatiLoader label="Loading your progress" />;

  const stats = summary?.stats;
  const goal = summary?.goal;
  const startedAt = describeStart(goal);
  const level = Math.max(1, Number(user.level) || 1);

  const phases = roadmap?.roadmapData?.educationRoadmap || [];
  const phaseStateList = phaseStates(phases.length, roadmap?.completedPhases);
  const phaseIndex = phaseStateList.indexOf('current');
  const journeyDone = journeyPercent(phases.length, roadmap?.completedPhases);
  const currentPhaseTitle = phaseIndex >= 0 ? phaseTitle(phases[phaseIndex]) : null;
  const currentPhaseLead = currentPhaseTitle
    ? parseChoices(currentPhaseTitle)?.lead || currentPhaseTitle
    : null;


  return (
    <div className="fp-enter space-y-5">
      {/* Full width since 2026-10-27: one column. */}
      <div className="min-w-0 space-y-5">
        {/* ---- Identity, level, and what it is all pointed at ----------- */}
        <Card data-mascot-target="progress-summary" padded={false} className="overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-r from-journey-50 via-surface to-amber-50/70 p-5 sm:p-6">
            <div
              aria-hidden
              className="fp-float pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-journey-200/40 blur-3xl"
            />
            <div
              aria-hidden
              className="fp-float-slow pointer-events-none absolute right-1/4 -bottom-24 h-56 w-56 rounded-full bg-pink-200/40 blur-3xl"
            />
            <ProgressArt
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-4 hidden h-40 w-56 -translate-y-1/2 xl:block"
            />

            {/* A grid on a phone — the avatar beside the name and email, the
                boost and the level card full width beneath — because as one
                wrapping row the name dropped under the avatar on a 360px screen
                and left it alone over a blank band. From sm it is the wrapping
                row it was, with the text back together as one column. */}
            <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 sm:flex sm:flex-wrap sm:gap-5 xl:pr-60">
              <span className="relative row-span-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-journey-500 to-indigo-600 text-2xl font-black text-white shadow-lg shadow-journey-500/30">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
                <span className="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[0.6rem] font-black text-amber-950 ring-2 ring-surface">
                  {level}
                </span>
              </span>
              {/* `contents` on a phone: the lines inside place themselves on
                  the grid, so the boost can span both columns while the name
                  and email sit beside the avatar. */}
              <div className="contents sm:block sm:min-w-0 sm:flex-1 sm:basis-56">
                <p className="text-[0.68rem] font-black tracking-[0.16em] text-journey-600 uppercase">
                  My progress
                </p>
                <h1 className="mt-0.5 text-2xl leading-tight font-black break-words text-ink-900 sm:text-3xl">
                  {user.name}
                </h1>
                {/* Smaller beside the avatar: at 14px a plain Gmail address
                    broke mid-word on a 344px phone. */}
                <p className="mt-0.5 text-xs break-all text-ink-500 sm:text-sm">{user.email}</p>
                <p className="col-span-2 mt-3 inline-flex items-center gap-1.5 justify-self-start rounded-lg bg-journey-100/60 px-2.5 py-1 text-xs font-bold text-journey-700 sm:mt-2.5">
                  <span aria-hidden>💪</span>
                  {dailyBoost()}
                </p>
              </div>

              {/* Level, stated once, from the same helper every other surface
                  on the site reads. */}
              <div className="col-span-2 mt-4 flex w-full shrink-0 items-center gap-4 rounded-2xl bg-surface/90 p-3.5 shadow-card ring-1 ring-line-200/80 ring-inset backdrop-blur sm:mt-0 sm:w-auto">
                <LevelRing level={level} percent={levelInfo.percent} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-black text-amber-600">
                    <Zap className="h-3.5 w-3.5 fill-amber-200" />
                    {shownXp} XP
                  </p>
                  <p className="mt-0.5 text-sm font-black text-ink-900 tabular-nums">
                    {levelInfo.known ? `${levelInfo.remaining} XP to Level ${levelInfo.nextLevel}` : `Level ${level}`}
                  </p>
                  <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-surface-100">
                    <div
                      className="fp-effort-gradient fp-stripes h-full rounded-full transition-[width] duration-1000 ease-out"
                      style={{ width: `${levelInfo.percent}%` }}
                    />
                  </div>
                  <Link
                    to="/career/planner"
                    data-mascot-target="pending-task"
                    className="group mt-2.5 inline-flex items-center gap-1 text-xs font-black text-journey-700 hover:underline"
                  >
                    {/* A figure only while the rule pays one (null while
                        Rewards is locked, 0 when the rule pays nothing). */}
                    {TASK_XP > 0 ? `Earn ${TASK_XP} XP now` : "Go to today's plan"}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Where they started, where they are going, how long they have been
              at it — the three facts the header band exists to carry. */}
          <div className="grid gap-5 border-t border-line-200 p-5 sm:grid-cols-3">
            <Fact icon={GraduationCap} label="Starting from" value={startedAt.title} detail={startedAt.detail} />
            <Fact icon={Compass} label="Working towards" value={goal?.careerGoal} detail={goal?.dreamCompany} />
            <Fact
              icon={CalendarDays}
              label="Progress"
              value={stats ? `Day ${stats.daysPlanned}` : '—'}
              detail={stats ? 'of your plan' : null}
            />
          </div>

          {phases.length > 0 && (
            <div className="border-t border-line-200 p-5">
              <RoadmapTrack
                phases={phases}
                completedPhases={roadmap?.completedPhases}
                percent={journeyDone}
              />
              {currentPhaseLead && (
                <p className="mt-3 text-sm text-ink-500">
                  Currently on{' '}
                  <span className="font-black text-journey-700">{currentPhaseLead}</span>
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Without this a failed summary simply left the bottom of the page
            empty, which reads as nothing to show rather than nothing loaded. */}
        {!loadingSummary && summaryFailed && !summary && (
          <LoadError title="We couldn't load your progress" onRetry={retrySummary} retrying={retrying} />
        )}

        {loadingSummary && (
          <Card>
            <div className="h-24 animate-pulse rounded-xl bg-surface-100" />
          </Card>
        )}

        {summary && (
          <>
            {/* The Skills and Achievements cards went on 2026-10-27: Skills and Rewards are their own tabs. */}
            <Card
              id="still-to-do"
              className="scroll-mt-4"
              data-explain-label={stillLine ? 'Still to do' : undefined}
              data-explain-text={stillLine || undefined}
              data-explain-emo="joy"
              data-explain-gesture="point"
            >
              <CardHeader
                icon={Flame}
                title="Still to do"
                subtitle="Tasks the day ran out on. Pick any back up whenever you're ready."
                accent="amber"
              />

              {summary.skippedTasks?.length === 0 ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                  <p className="font-semibold text-ink-900">All caught up</p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    You&apos;ve finished every task assigned to you so far.
                  </p>
                </div>
              ) : (
                <StillToDoList tasks={summary.skippedTasks} redoingId={redoingId} onRedo={handleRedo} />
              )}
            </Card>
          </>
        )}
      </div>

      {/* The stats row (streak, tasks done, completion rate, still to do) went on 2026-10-27. */}
    </div>
  );
}
