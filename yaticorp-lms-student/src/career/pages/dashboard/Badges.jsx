import { useState, useEffect, useContext, useCallback } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import ShareBadgeDialog from '../../components/roadmap/ShareBadgeDialog';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Award, Trophy, Zap, Share2, Medal, Flag, Lock, Gift
} from 'lucide-react';
import Card from '../../components/ui/Card';
import LoadError from '../../components/ui/LoadError';
import BadgeMedallion from '../../components/rewards/BadgeMedallion';
import { BADGE_ICONS, tierFor } from '../../components/rewards/badgeTiers';
import YatiLoader from '../../../components/YatiLoader';
import useMinimumLoading from '../../../hooks/useMinimumLoading';
import { useXpRule } from '../../../context/useRewards';

const iconMap = BADGE_ICONS;

const earnedOn = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

// Level and XP are on My Progress (2026-10-29); this page shows what has been won.

// XP one finished task pays: the admin's 'career_task' rule (useXpRule below).

/** One figure on the banner: glass tile, big number, what it counts. */
const Stat = ({ icon: Icon, value, label, tone }) => (
  <div className="group flex items-center gap-3 rounded-2xl bg-white/10 px-3.5 py-3 ring-1 ring-white/20 ring-inset backdrop-blur-sm transition-colors hover:bg-white/15">
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform group-hover:scale-110 ${tone}`}>
      <Icon className="h-5 w-5" strokeWidth={2.4} />
    </span>
    <span className="min-w-0 leading-tight">
      <span className="block text-2xl font-black text-white tabular-nums">{value}</span>
      <span className="block truncate text-[11px] font-bold tracking-wide text-white/70 uppercase">{label}</span>
    </span>
  </div>
);

const TABS = [
  { id: 'badges', label: 'Badges', icon: Medal },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'milestones', label: 'Milestones', icon: Flag }
];

export default function Badges() {
  // The admin's 'career_task' rule (Rewards → Reward rules), not a number of our own.
  const TASK_XP = useXpRule('career_task');
  const { user } = useContext(AuthContext);
  // Celebrating poses, changing every few seconds — this is the page for it.

  const [achievements, setAchievements] = useState([]);
  const [badges, setBadges] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [sharingBadge, setSharingBadge] = useState(null);
  const [tab, setTab] = useState('badges');
  const [loading, setLoading] = useState(true);
  // A failed load, kept apart from "no badges yet" so a dropped connection
  // does not tell a student they have earned nothing.
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const xp = user?.xp || 0;

  const fetchData = useCallback(async () => {
    try {
      const [achRes, badgeRes, milestoneRes] = await Promise.all([
        api.get('/achievements'),
        api.get('/badges'),
        // Best-effort: a student who has finished no phase simply has none.
        api.get('/milestones').catch(() => ({ data: [] }))
      ]);
      setAchievements(Array.isArray(achRes.data) ? achRes.data : []);
      setBadges(Array.isArray(badgeRes.data) ? badgeRes.data : []);
      setMilestones(milestoneRes.data || []);
      setFailed(false);
    } catch (err) {
      console.error(err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const retry = async () => {
    setRetrying(true);
    await fetchData();
    setRetrying(false);
  };

  const showLoader = useMinimumLoading(loading);
  if (showLoader) return <YatiLoader label="Loading your rewards" />;
  if (failed) return <LoadError title="We couldn't load your rewards" onRetry={retry} retrying={retrying} />;

  // Only while a task pays something: with Rewards locked the rule is null.
  const promisesXp = TASK_XP > 0;
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  // Earned badges first, then whichever locked one is closest. A student who is
  // twenty XP from a badge should not have to hunt for it behind one worth
  // fifteen hundred.
  const ordered = [...badges].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return (a.xpRequired || 0) - (b.xpRequired || 0);
  });
  const earned = ordered.filter((b) => b.unlocked);
  const nextBadge = ordered.find((b) => !b.unlocked);
  // Newest earned first, for the podium.
  const showcase = [...earned].sort((a, b) => new Date(b.unlockedAt || 0) - new Date(a.unlockedAt || 0));
  const nextTier = nextBadge ? tierFor(nextBadge.xpRequired) : null;
  const nextToGo = nextBadge ? Math.max(0, (nextBadge.xpRequired || 0) - xp) : 0;
  // "First Task Completed" is earned by finishing a task, not by XP (the
  // server's rule since the badges followed the admin's ladder), so it is
  // measured in tasks — "0 XP to go" read as already earned.
  const nextByTask = nextBadge?.rule === 'first_task';
  const nextPct =
    nextBadge && nextBadge.xpRequired > 0
      ? Math.min(100, Math.round((xp / nextBadge.xpRequired) * 100))
      : 0;
  const NextIcon = nextBadge ? iconMap[nextBadge.icon] || Award : Award;

  const latest = achievements
    .slice()
    .sort((a, b) => new Date(b.unlockedAt || 0) - new Date(a.unlockedAt || 0));

  const counts = { badges: unlockedCount, achievements: achievements.length, milestones: milestones.length };

  return (
    <div className="fp-enter space-y-5">
      {/* ---- 1. The trophy room: totals, and the latest badges on a podium ---- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-600 text-white shadow-[0_24px_60px_-24px_rgba(91,33,182,0.65)]">
        {/* Light: two soft glows and a faint dot grid, nothing that competes with the badges. */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-28 h-80 w-80 rounded-full bg-amber-300/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="relative grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[0.68rem] font-black tracking-[0.14em] uppercase ring-1 ring-white/25 ring-inset">
              <Trophy className="h-3.5 w-3.5 text-amber-300" /> Your trophy room
            </span>
            <h1 className="mt-3 text-3xl leading-[1.1] font-black sm:text-4xl">
              {unlockedCount ? (
                <>
                  <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 bg-clip-text text-transparent">
                    {unlockedCount} {unlockedCount === 1 ? 'badge' : 'badges'}
                  </span>{' '}
                  won so far
                </>
              ) : 'Your first badge is close'}
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/75">
              {earned.length
                ? <>Latest: <span className="font-bold text-white">{showcase[0].title}</span>{earnedOn(showcase[0].unlockedAt) ? `, earned ${earnedOn(showcase[0].unlockedAt)}` : ''}. Keep the streak going.</>
                : 'Finish your first task and your shelf starts filling up.'}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2.5 sm:max-w-lg">
              <Stat icon={Medal} value={unlockedCount} label={unlockedCount === 1 ? 'Badge' : 'Badges'} tone="bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-900/30" />
              <Stat icon={Trophy} value={achievements.length} label="Achievements" tone="bg-gradient-to-br from-pink-400 to-rose-500 shadow-rose-900/30" />
              <Stat icon={Flag} value={milestones.length} label="Milestones" tone="bg-gradient-to-br from-emerald-400 to-teal-500 shadow-teal-900/30" />
            </div>
          </div>

          {/* The podium: the newest badge in the middle and raised, the two before it either side. */}
          <div aria-hidden className="relative mx-auto flex h-56 w-full max-w-[22rem] items-end justify-center">
            <div className="absolute top-2 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(253,224,71,0.55),transparent_40%,rgba(255,255,255,0.35),transparent_70%)] opacity-70 blur-md motion-safe:animate-[spin_14s_linear_infinite]" />
            {[showcase[1], showcase[0], showcase[2]].map((b, i) => {
              const centre = i === 1;
              const tier = b ? tierFor(b.xpRequired) : nextTier || tierFor(0);
              const Icon = b ? iconMap[b.icon] || Award : NextIcon;
              return (
                <div key={i} className={`relative flex flex-col items-center ${centre ? 'z-10 mx-1' : 'opacity-90'}`}>
                  <div className={centre ? 'motion-safe:animate-[bounce_3s_ease-in-out_infinite]' : ''}>
                    <BadgeMedallion icon={Icon} tier={tier} unlocked={Boolean(b)} size={centre ? 104 : 72} delay={0.1 * i} />
                  </div>
                  <div className={`mt-2 w-full rounded-t-xl bg-gradient-to-b from-white/30 to-white/5 ring-1 ring-white/25 ring-inset ${centre ? 'h-16 w-28' : 'h-9 w-20'}`}>
                    <p className="truncate px-1.5 pt-1.5 text-center text-[0.62rem] font-black tracking-wide text-white/90">
                      {b ? b.title : 'Next'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- 2. The quest: the one badge in reach, its ring filling up ---- */}
      {nextBadge && (
        <section data-mascot-target="rewards" className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 p-[1.5px] shadow-[0_20px_50px_-24px_rgba(139,92,246,0.6)]">
          <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-white p-5 sm:flex-row sm:p-6">
            <div aria-hidden className={`pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full blur-3xl ${nextTier.halo}`} />
            <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-20 h-48 w-48 rounded-full bg-violet-200/50 blur-3xl" />

            {/* The locked medal inside a ring that is the progress itself. */}
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90" aria-hidden>
                <defs>
                  <linearGradient id="quest-ring" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" /><stop offset="55%" stopColor="#d946ef" /><stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <circle cx="64" cy="64" r="58" fill="none" stroke="#f1f0fb" strokeWidth="8" />
                <circle cx="64" cy="64" r="58" fill="none" stroke="url(#quest-ring)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 58} strokeDashoffset={2 * Math.PI * 58 * (1 - nextPct / 100)}
                  style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><BadgeMedallion icon={NextIcon} tier={nextTier} unlocked={false} size={78} /></div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-black text-white tabular-nums shadow-lg">{nextPct}%</span>
            </div>

            <div className="relative min-w-0 flex-1 text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[0.62rem] font-black tracking-[0.14em] text-violet-700 uppercase ring-1 ring-violet-200 ring-inset">
                <Lock className="h-3 w-3" /> Next badge to unlock
              </span>
              <h2 className="mt-2 text-2xl font-black text-ink-900">{nextBadge.title}</h2>
              <p className="text-sm text-ink-500">{nextBadge.description}</p>
              <p className="mt-3 text-sm font-semibold text-ink-600">
                {nextByTask
                  ? <>Just <span className="font-black text-violet-700">1 task</span> away.</>
                  : <>Only <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-lg font-black text-transparent tabular-nums">{nextToGo} XP</span> to go{promisesXp ? <> — about <span className="font-black text-ink-900">{Math.max(1, Math.ceil(nextToGo / TASK_XP))} tasks</span></> : null}.</>}
              </p>
            </div>

            <Link to="/career/planner" data-mascot-target="earn"
              className="fp-press group relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-fuchsia-500/30 transition-transform hover:-translate-y-0.5">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/30 blur-sm transition-transform duration-700 group-hover:translate-x-[300%]" />
              <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />
              {promisesXp ? `Earn ${TASK_XP} XP now` : "Do today's task"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      )}

      {/* ---- 3. The collection: one shelf at a time ---------------------- */}
      <Card>
        <div role="tablist" aria-label="Your rewards" className="relative mb-6 grid grid-cols-3 rounded-2xl bg-surface-100 p-1.5">
          {/* The pill that slides under the chosen tab. */}
          <span aria-hidden className="absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/30 transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
            style={{ transform: `translateX(${TABS.findIndex((t) => t.id === tab) * 100}%)` }} />
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = tab === id;
            return (
              <button key={id} type="button" role="tab" aria-selected={on} onClick={() => setTab(id)}
                className={`relative z-10 flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-black whitespace-nowrap transition-colors duration-300 ${on ? 'text-white' : 'text-ink-500 hover:text-ink-800'}`}>
                <Icon className="h-4 w-4" strokeWidth={2.3} />
                <span className="hidden sm:inline">{label}</span>
                <span className={`rounded-full px-1.5 text-[0.68rem] tabular-nums ${on ? 'bg-white/25 text-white' : 'bg-white text-ink-500'}`}>{counts[id]}</span>
              </button>
            );
          })}
        </div>

        <div key={tab} className="animate-fade-in-up">
          {tab === 'badges' && (earned.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-300 bg-surface-50/70 p-8 text-center">
              <Gift className="mx-auto mb-3 h-9 w-9 text-journey-300" />
              <p className="text-sm font-bold text-ink-700">Your first badge is one task away.</p>
              <p className="mt-1 text-xs text-ink-500">Finish today&apos;s task and it lands here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {earned.map((badge, index) => {
                const Icon = iconMap[badge.icon] || Award;
                const tier = tierFor(badge.xpRequired);
                const on = earnedOn(badge.unlockedAt);
                return (
                  /* A collectible card: the tier's colour on top with the medal, a sheen on hover, the facts below. */
                  <div key={badge._id} className="group relative overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-18px_rgba(30,27,75,0.45)] ring-1 ring-line-200/70 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_40px_-20px_rgba(91,33,182,0.55)]">
                    <div className={`relative flex h-28 items-center justify-center overflow-hidden ${tier.outer}`}>
                      <span aria-hidden className="absolute inset-0 opacity-25 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:12px_12px]" />
                      <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/40 blur-md transition-transform duration-700 group-hover:translate-x-[450%]" />
                      <span className="absolute top-2 left-2 rounded-full bg-white/25 px-2 py-0.5 text-[0.58rem] font-black tracking-[0.12em] text-white uppercase ring-1 ring-white/40 ring-inset backdrop-blur-sm">{tier.name}</span>
                      <div className="relative translate-y-5 transition-transform duration-300 group-hover:translate-y-4 group-hover:scale-105">
                        <BadgeMedallion icon={Icon} tier={tier} unlocked size={72} delay={0.05 * index} />
                      </div>
                    </div>
                    <div className="px-3 pt-7 pb-4 text-center">
                      <h3 className="text-sm leading-tight font-black text-ink-900">{badge.title}</h3>
                      <p className="mt-1 line-clamp-1 text-[0.7rem] text-ink-500">{badge.description}</p>
                      {on && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5 text-[0.65rem] font-bold text-ink-500">✓ {on}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {tab === 'achievements' && (achievements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-300 bg-surface-50/70 p-8 text-center">
              <Trophy className="mx-auto mb-3 h-9 w-9 text-pink-300" />
              <p className="text-sm font-bold text-ink-700">Nothing here yet — and that is fine.</p>
              <p className="mt-1 text-xs text-ink-500">Your first finished task unlocks the first one.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line-200/70">
              {latest.map((ach) => (
                <li key={ach._id} className="flex items-center gap-3.5 py-3">
                  {/* Pink, so achievements are not mistaken for a tier of badge: a moment, not a threshold. */}
                  <span className="fp-reward-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md shadow-pink-500/30">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-ink-900">{ach.title}</span>
                    <span className="block text-xs text-ink-500">{ach.description}</span>
                  </span>
                  {earnedOn(ach.unlockedAt) && <span className="shrink-0 text-xs font-bold text-pink-600">{earnedOn(ach.unlockedAt)}</span>}
                </li>
              ))}
            </ul>
          ))}

          {tab === 'milestones' && (milestones.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-300 bg-surface-50/70 p-8 text-center">
              <Flag className="mx-auto mb-3 h-9 w-9 text-emerald-300" />
              <p className="text-sm font-bold text-ink-700">Finish a roadmap phase to get your first milestone.</p>
              <p className="mt-1 text-xs text-ink-500">Each one is a card you can share.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {milestones.map((m) => (
                <button key={m._id} type="button" onClick={() => setSharingBadge(m)}
                  className="fp-lift group overflow-hidden rounded-2xl border border-line-200 bg-surface text-left transition-all hover:border-journey-300">
                  <img src={m.imageUrl} alt={`${m.phaseTitle} milestone badge`} width={1200} height={630} loading="lazy" className="w-full" />
                  <span className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-ink-900">{m.phaseTitle}</span>
                      <span className="block text-xs text-ink-500">{new Date(m.issuedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-journey-50 px-3 py-1.5 text-xs font-black text-journey-700 group-hover:bg-journey-100">
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </Card>

      {sharingBadge && <ShareBadgeDialog badge={sharingBadge} onClose={() => setSharingBadge(null)} />}
    </div>
  );
}
