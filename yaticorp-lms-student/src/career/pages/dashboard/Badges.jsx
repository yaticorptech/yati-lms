import { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import ShareBadgeDialog from '../../components/roadmap/ShareBadgeDialog';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Award, Trophy, Zap, Info, Share2, Medal, Sparkles, Flag, Lock, Gift
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { SkeletonPage } from '../../components/ui/Skeleton';
import RewardsArt from '../../components/rewards/RewardsArt';
import BadgeMedallion from '../../components/rewards/BadgeMedallion';
import useCountUp from '../../../hooks/useCountUp';
import { BADGE_ICONS, tierFor } from '../../components/rewards/badgeTiers';

const iconMap = BADGE_ICONS;

const earnedOn = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/**
 * Where this level starts and ends, mirroring calculateLevel() in
 * backend/services/gamificationService.js.
 *
 * Levels 1–5 use a fixed table. Above that the backend switches to
 * `floor(sqrt(xp / 100)) + 2`, so level n begins at 100 × (n − 2)².
 *
 * The old version assumed a flat 500 XP step forever after 1500, which is not
 * what the backend does. It printed impossible readings for anyone past that
 * point — "2100 / 500 XP" at level 8, "8500 / 500" at 10,000 XP — and named the
 * wrong next level on the way. The bar itself looked fine only because the
 * overflow was clipped.
 */
const FIXED_FLOORS = [0, 100, 300, 600, 1000]; // levels 1 to 5

const calculateLevel = (xp) => {
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 600) return 3;
  if (xp < 1000) return 4;
  if (xp < 1500) return 5;
  return Math.floor(Math.sqrt(xp / 100)) + 2;
};

/** Where level n begins. */
const floorOf = (level) => (level <= 5 ? FIXED_FLOORS[level - 1] : 100 * (level - 2) ** 2);

const levelBounds = (xp) => {
  const level = calculateLevel(xp);
  return { floor: floorOf(level), ceiling: floorOf(level + 1) };
};

// XP one finished task pays, mirroring TASK_XP in
// backend/services/taskCompletionService.js.
const TASK_XP = 10;

/** One figure in the rail beside the badges. */
const RewardStat = ({ icon: Icon, label, value, detail, tone }) => (
  <section className="rounded-2xl border border-line-200/80 bg-surface p-4 shadow-card">
    <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset ${tone}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
      </span>
      {label}
    </p>
    <p className="mt-3 text-3xl leading-none font-black text-ink-900 tabular-nums">{value}</p>
    {detail && <p className="mt-1.5 text-xs font-semibold text-ink-500">{detail}</p>}
  </section>
);

/** The level, as a ring filled to the next one. */
function LevelBadge({ level, percent }) {
  const size = 104;
  const stroke = 8;
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
      <span className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-journey-500 to-indigo-600 text-white shadow-lg shadow-journey-500/30">
        <span className="text-[0.58rem] font-black tracking-[0.14em] opacity-80 uppercase">Level</span>
        <span className="text-2xl leading-none font-black tabular-nums">{level}</span>
      </span>
    </div>
  );
}

export default function Badges() {
  const { user, isCreditSystemEnabled } = useContext(AuthContext);
  const [achievements, setAchievements] = useState([]);
  const [badges, setBadges] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [sharingBadge, setSharingBadge] = useState(null);
  const [loading, setLoading] = useState(true);

  const xp = user?.xp || 0;
  const level = calculateLevel(xp);
  const animatedXp = useCountUp(xp);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [achRes, badgeRes, milestoneRes] = await Promise.all([
          api.get('/achievements'),
          api.get('/badges'),
          // Best-effort: a student who has finished no phase simply has none.
          api.get('/milestones').catch(() => ({ data: [] }))
        ]);
        setAchievements(achRes.data);
        setBadges(badgeRes.data);
        setMilestones(milestoneRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <SkeletonPage cards={4} columns={3} />;

  const { floor, ceiling } = levelBounds(xp);
  const percent = Math.round(((xp - floor) / Math.max(1, ceiling - floor)) * 100);
  const xpToLevel = Math.max(0, ceiling - xp);
  const tasksToLevel = Math.max(1, Math.ceil(xpToLevel / TASK_XP));
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
  const nextTier = nextBadge ? tierFor(nextBadge.xpRequired) : null;
  const nextToGo = nextBadge ? Math.max(0, (nextBadge.xpRequired || 0) - xp) : 0;
  const nextPct =
    nextBadge && nextBadge.xpRequired > 0
      ? Math.min(100, Math.round((xp / nextBadge.xpRequired) * 100))
      : 0;
  const NextIcon = nextBadge ? iconMap[nextBadge.icon] || Award : Award;

  const latest = achievements
    .slice()
    .sort((a, b) => new Date(b.unlockedAt || 0) - new Date(a.unlockedAt || 0));

  return (
    <div className="fp-enter grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 space-y-5">
        {/* ---- Level and the medal shelf -------------------------------- */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-journey-50 via-surface to-amber-50/70 shadow-card ring-1 ring-journey-100 ring-inset">
          <div
            aria-hidden
            className="fp-float pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-journey-200/40 blur-3xl"
          />
          <div
            aria-hidden
            className="fp-float-slow pointer-events-none absolute -right-10 -bottom-24 h-56 w-56 rounded-full bg-amber-200/50 blur-3xl"
          />

          <div className="relative flex flex-wrap items-center gap-5 p-5 sm:p-6">
            <LevelBadge level={level} percent={percent} />

            <div className="min-w-0 flex-1">
              <p className="text-[0.7rem] font-black tracking-[0.16em] text-journey-600 uppercase">
                Rewards
              </p>
              <h1 className="mt-1 text-2xl leading-tight font-black text-ink-900 sm:text-3xl">
                Level {level} Learner
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-ink-500">
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="h-4 w-4 fill-amber-200 text-amber-500" />
                  <span className="tabular-nums text-ink-900">{animatedXp}</span> total XP
                </span>
                <span aria-hidden className="text-ink-300">·</span>
                {/* Not "X of Y": the catalogue is revealed one badge at a time,
                    so Y is only what happens to be visible today. */}
                <span className="inline-flex items-center gap-1.5">
                  <Medal className="h-4 w-4 text-journey-500" />
                  <span className="tabular-nums text-ink-900">{unlockedCount}</span>{' '}
                  {unlockedCount === 1 ? 'badge' : 'badges'} earned
                </span>
              </p>

              <div className="mt-4 max-w-md">
                <div className="mb-1.5 flex flex-wrap justify-between gap-x-3 text-xs font-bold text-ink-600">
                  <span className="whitespace-nowrap">Progress to Level {level + 1}</span>
                  <span className="whitespace-nowrap tabular-nums">
                    {xp} / {ceiling} XP
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progress to Level ${level + 1}`}
                  className="h-2.5 overflow-hidden rounded-full bg-surface-100 ring-1 ring-line-200/60 ring-inset"
                >
                  <div
                    className="fp-effort-gradient h-full rounded-full transition-[width] duration-1000 ease-out"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <Link
                  to="/career/planner"
                  className="fp-press group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-journey-600 to-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-journey-500/30 transition-all hover:from-journey-700 hover:to-indigo-700"
                >
                  <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />
                  Earn {TASK_XP} XP now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <span className="text-xs font-bold text-ink-500">
                  {xpToLevel > 0 ? (
                    <>
                      <span className="text-ink-900 tabular-nums">
                        {tasksToLevel} {tasksToLevel === 1 ? 'task' : 'tasks'}
                      </span>{' '}
                      to Level {level + 1}
                    </>
                  ) : (
                    'Level target hit — new ground from here.'
                  )}
                </span>
              </div>
            </div>

            <RewardsArt className="hidden h-40 w-52 shrink-0 lg:block" />
          </div>
        </section>

        {/* Said out loud because two numbers that both go up look like the same
            number. They are not: credits come from course quizzes and belong to
            the LMS, XP comes from Career Path tasks. Neither converts into the
            other. */}
        {isCreditSystemEnabled && (
          <div className="flex items-start gap-3 rounded-2xl border border-line-200 bg-surface-50 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
            <p className="text-sm leading-relaxed text-ink-600">
              <strong className="font-semibold text-ink-900">XP is not credits.</strong> XP is your
              Career Path progress and unlocks the badges below. Your{' '}
              <strong className="font-semibold text-ink-900">{user?.credits || 0} credits</strong> are
              separate — you earn those from quizzes inside your courses. One does not convert into
              the other.
            </p>
          </div>
        )}

        {/* ---- Badges --------------------------------------------------- */}
        <Card>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-ink-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 ring-inset">
                  <Medal className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.2} />
                </span>
                Your badges
              </h2>
              {/* Says why the list is short, so a one-card page reads as a ladder
                  rather than as everything there is. */}
              <p className="mt-1 text-sm text-ink-500">
                One at a time — earn the badge you can see and the next one appears.
              </p>
            </div>
            <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-bold text-ink-600 tabular-nums">
              {unlockedCount} earned
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {earned.map((badge, index) => {
              const Icon = iconMap[badge.icon] || Award;
              const tier = tierFor(badge.xpRequired);
              const on = earnedOn(badge.unlockedAt);

              return (
                <div
                  key={badge._id}
                  className={`fp-lift group flex flex-col items-center rounded-2xl p-5 text-center ring-1 transition-all ring-inset ${tier.card}`}
                >
                  <BadgeMedallion icon={Icon} tier={tier} unlocked size={88} delay={0.06 * index} />
                  <span className={`mt-3 rounded-full px-2 py-0.5 text-[0.6rem] font-black tracking-[0.12em] uppercase ${tier.chip}`}>
                    {tier.name}
                  </span>
                  <h3 className="mt-1.5 text-sm font-black text-ink-900">{badge.title}</h3>
                  <p className="mt-1.5 mb-4 flex-1 text-xs leading-relaxed text-ink-500">
                    {badge.description}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${tier.chip}`}
                  >
                    <Sparkles className="h-3 w-3" />
                    {on ? `Earned ${on}` : 'Unlocked'}
                  </span>
                </div>
              );
            })}

            {/* The one to earn next, in the same row as the ones already earned
                so the shelf reads as a ladder with the next rung in view. It
                says how close, not what the threshold is: "100 XP to unlock"
                once told a student on 80 XP they needed 100 more. */}
            {nextBadge && (
              <div className="fp-lift relative flex flex-col items-center overflow-hidden rounded-2xl border-2 border-dashed border-journey-200 bg-journey-50/40 p-5 text-center">
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full blur-2xl ${nextTier.halo}`}
                />
                <BadgeMedallion icon={NextIcon} tier={nextTier} unlocked={false} size={88} />
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-[0.62rem] font-black tracking-[0.11em] text-journey-700 uppercase ring-1 ring-journey-200 ring-inset">
                  <Lock className="h-3 w-3" />
                  Next badge
                </span>
                <h3 className="mt-2 text-sm font-black text-ink-900">{nextBadge.title}</h3>
                <p className="mt-1.5 mb-4 flex-1 text-xs leading-relaxed text-ink-500">
                  {nextBadge.description}
                </p>

                <div className="w-full">
                  <div className="mb-1.5 flex items-center justify-between text-[0.68rem] font-bold text-ink-500">
                    <span className="tabular-nums">{nextPct}%</span>
                    <span className="tabular-nums">
                      <span className="font-black text-ink-900">{nextToGo} XP</span> to go
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={nextPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${nextBadge.title} progress`}
                    className="h-2 w-full overflow-hidden rounded-full bg-surface-200"
                  >
                    <div
                      className={`h-full rounded-full transition-[width] duration-1000 ease-out ${nextTier.bar}`}
                      style={{ width: `${nextPct}%` }}
                    />
                  </div>
                  <Link
                    to="/career/planner"
                    className="fp-press group mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-journey-600 to-indigo-600 px-3 py-2 text-xs font-black text-white shadow-md shadow-journey-500/25 transition-all hover:from-journey-700 hover:to-indigo-700"
                  >
                    <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    +{TASK_XP} XP with today&apos;s task
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            )}

            {earned.length === 0 && !nextBadge && (
              <div className="rounded-2xl border border-dashed border-line-300 bg-surface-50/70 p-6 text-center sm:col-span-2 lg:col-span-3">
                <Gift className="mx-auto mb-3 h-8 w-8 text-journey-300" />
                <p className="text-sm font-semibold text-ink-700">Your first badge is one task away.</p>
                <p className="mt-1 text-xs text-ink-500">Finish today&apos;s task and it lands here.</p>
              </div>
            )}
          </div>
        </Card>

        {/* ---- Achievements --------------------------------------------- */}
        <Card>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-ink-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-pink-600 ring-1 ring-pink-100 ring-inset">
                  <Trophy className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.2} />
                </span>
                Achievements
              </h2>
              <p className="mt-1 text-sm text-ink-500">Moments that happened along the way.</p>
            </div>
            {achievements.length > 0 && (
              <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-bold text-ink-600 tabular-nums">
                {achievements.length} unlocked
              </span>
            )}
          </div>
          {achievements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-300 bg-surface-50/70 p-6 text-center">
              <Trophy className="mx-auto mb-3 h-8 w-8 text-pink-300" />
              <p className="text-sm font-semibold text-ink-700">Nothing here yet — and that is fine.</p>
              <p className="mt-1 text-xs text-ink-500">Your first finished task unlocks the first one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((ach) => {
                const on = earnedOn(ach.unlockedAt);
                return (
                  <div
                    key={ach._id}
                    className="fp-lift flex items-start gap-3.5 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-pink-50 p-4 ring-1 ring-pink-200 ring-inset"
                  >
                    {/* Pink, so achievements are not mistaken for a fifth tier of
                        badge. They are a different kind of thing: a moment that
                        happened, not a threshold that was crossed. */}
                    <span className="fp-reward-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md shadow-pink-500/30">
                      <Trophy className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-ink-900">{ach.title}</h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{ach.description}</p>
                      {on && (
                        <p className="mt-1.5 text-[0.68rem] font-black text-pink-600">{on}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ---- Milestones ----------------------------------------------- */}
        {milestones.length > 0 && (
          <Card>
            <div className="mb-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-ink-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 ring-inset">
                  <Flag className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.2} />
                </span>
                Milestones
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                Roadmap phases you have finished. These are yours to share.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {milestones.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => setSharingBadge(m)}
                  className="fp-lift group overflow-hidden rounded-2xl border border-line-200 bg-surface text-left transition-all hover:border-journey-300"
                >
                  <img
                    src={m.imageUrl}
                    alt={`${m.phaseTitle} milestone badge`}
                    width={1200}
                    height={630}
                    loading="lazy"
                    className="w-full"
                  />
                  <span className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-ink-900">
                        {m.phaseTitle}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {new Date(m.issuedAt).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-journey-50 px-3 py-1.5 text-xs font-black text-journey-700 transition-colors group-hover:bg-journey-100">
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ---- The rail ---------------------------------------------------- */}
      <aside className="grid gap-4 sm:grid-cols-2 xl:sticky xl:top-4 xl:grid-cols-1">
        <RewardStat
          icon={Medal}
          label="Badges earned"
          value={unlockedCount}
          detail={nextBadge ? `Next: ${nextBadge.title}` : 'Every badge so far is yours'}
          tone="bg-amber-50 text-amber-600 ring-amber-100"
        />
        <RewardStat
          icon={Trophy}
          label="Achievements"
          value={achievements.length}
          detail={achievements.length ? 'Moments worth keeping' : 'Finish a task to start'}
          tone="bg-pink-50 text-pink-600 ring-pink-100"
        />
        <RewardStat
          icon={Zap}
          label="Total XP"
          value={animatedXp}
          detail={`${xpToLevel} XP to Level ${level + 1}`}
          tone="bg-journey-50 text-journey-600 ring-journey-100"
        />
        {milestones.length > 0 && (
          <RewardStat
            icon={Flag}
            label="Milestones"
            value={milestones.length}
            detail="Phases finished"
            tone="bg-emerald-50 text-emerald-600 ring-emerald-100"
          />
        )}
      </aside>

      {sharingBadge && (
        <ShareBadgeDialog badge={sharingBadge} onClose={() => setSharingBadge(null)} />
      )}
    </div>
  );
}
