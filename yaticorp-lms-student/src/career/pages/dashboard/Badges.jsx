import { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import ShareBadgeDialog from '../../components/roadmap/ShareBadgeDialog';
import {
  Award, Flame, CheckCircle, TrendingUp, Trophy, Zap, Target, Rocket, Crown, Info, Share2,
  Medal, Sparkles, Flag
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { SkeletonPage } from '../../components/ui/Skeleton';
import RewardsArt from '../../components/rewards/RewardsArt';
import BadgeMedallion from '../../components/rewards/BadgeMedallion';
import useCountUp from '../../../hooks/useCountUp';

const iconMap = { Award, Flame, CheckCircle, TrendingUp, Target, Zap, Rocket, Crown };

/**
 * Colour by how hard the badge is to earn.
 *
 * Every badge used to be the same amber, so a wall of them read as one texture
 * and the easy first badge looked exactly as impressive as the one worth 1500
 * XP. Tiering by threshold makes the grid colourful AND meaningful — the hue
 * tells you something rather than just being decoration.
 *
 * The classes are written out in full on purpose. Tailwind scans source text,
 * so a constructed name like `bg-${hue}-100` compiles to nothing at all and the
 * card silently loses its colour.
 */
const TIERS = [
  {
    upTo: 50,
    tile: 'bg-gradient-to-br from-emerald-100 to-teal-100',
    icon: 'text-emerald-600',
    ring: 'ring-emerald-200',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700',
    outer: 'bg-gradient-to-br from-emerald-300 to-teal-500',
    inner: 'bg-gradient-to-br from-emerald-400 to-teal-600',
    halo: 'bg-emerald-400/50',
    card: 'bg-emerald-50/60 ring-emerald-200'
  },
  {
    upTo: 500,
    tile: 'bg-gradient-to-br from-sky-100 to-indigo-100',
    icon: 'text-sky-600',
    ring: 'ring-sky-200',
    bar: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700',
    outer: 'bg-gradient-to-br from-sky-300 to-indigo-500',
    inner: 'bg-gradient-to-br from-sky-400 to-indigo-600',
    halo: 'bg-sky-400/50',
    card: 'bg-sky-50/60 ring-sky-200'
  },
  {
    upTo: 2000,
    tile: 'bg-gradient-to-br from-amber-100 to-orange-100',
    icon: 'text-amber-600',
    ring: 'ring-amber-300',
    bar: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700',
    outer: 'bg-gradient-to-br from-amber-300 to-orange-500',
    inner: 'bg-gradient-to-br from-amber-400 to-orange-600',
    halo: 'bg-amber-400/60',
    card: 'bg-amber-50/60 ring-amber-200'
  },
  {
    // Everything past Skill Master. A fourth colour so six top-tier badges do
    // not end up as six identical gold cards.
    upTo: Infinity,
    tile: 'bg-gradient-to-br from-rose-100 to-pink-100',
    icon: 'text-rose-600',
    ring: 'ring-rose-300',
    bar: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-700',
    outer: 'bg-gradient-to-br from-rose-300 to-fuchsia-500',
    inner: 'bg-gradient-to-br from-rose-400 to-fuchsia-600',
    halo: 'bg-rose-400/60',
    card: 'bg-rose-50/60 ring-rose-200'
  }
];

const tierFor = (xpRequired) => TIERS.find((t) => (xpRequired || 0) <= t.upTo) || TIERS.at(-1);

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

/** One figure in the rail beside the badges. */
const RewardStat = ({ icon: Icon, label, value, detail, tone }) => (
  <section className="rounded-2xl border border-line-200 bg-surface p-4 shadow-card">
    <p className={`flex items-center gap-1.5 text-xs font-black tracking-wide ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </p>
    <p className="mt-2 text-4xl leading-none font-black text-ink-900 tabular-nums">{value}</p>
    {detail && <p className="mt-1 text-xs font-semibold text-ink-500">{detail}</p>}
  </section>
);

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
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  // Earned badges first, then whichever locked one is closest. A student who is
  // twenty XP from a badge should not have to hunt for it behind one worth
  // fifteen hundred.
  const ordered = [...badges].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return (a.xpRequired || 0) - (b.xpRequired || 0);
  });
  const nextBadge = ordered.find((b) => !b.unlocked);

  return (
    <div className="fp-enter grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0 space-y-5">
        {/* ---- Level and the medal shelf -------------------------------- */}
        <section className="fp-journey-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-float sm:p-6">
          <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
          <div
            aria-hidden
            className="fp-float pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl"
          />

          <div className="relative flex flex-wrap items-center gap-5">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl font-black ring-4 ring-white/25 ring-inset tabular-nums">
              {level}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.7rem] font-black tracking-[0.11em] text-journey-200 uppercase">
                Rewards
              </p>
              <h1 className="mt-1 text-2xl leading-tight font-black sm:text-3xl">
                Level {level} Learner
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-journey-100">
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-300" />
                  <span className="tabular-nums">{animatedXp}</span> total XP
                </span>
                <span aria-hidden className="text-journey-300">·</span>
                {/* Not "X of Y": the catalogue is revealed one badge at a time,
                    so Y is only what happens to be visible today. */}
                <span className="tabular-nums">
                  {unlockedCount} {unlockedCount === 1 ? 'badge' : 'badges'} earned
                </span>
              </p>

              <div className="mt-3 max-w-md">
                <div className="mb-1.5 flex flex-wrap justify-between gap-x-3 text-xs font-bold text-journey-100">
                  <span className="whitespace-nowrap">Progress to Level {level + 1}</span>
                  <span className="whitespace-nowrap tabular-nums">
                    {xp} / {ceiling} XP
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-[width] duration-1000 ease-out"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>

            <RewardsArt className="hidden h-36 w-48 shrink-0 lg:block" />
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
          <div className="mb-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-ink-900">
              <span aria-hidden>🏅</span> Badges
            </h2>
            {/* Says why the list is short, so a one-card page reads as a ladder
                rather than as everything there is. */}
            <p className="mt-0.5 text-sm text-ink-500">
              One at a time — earn the badge you can see and the next one appears.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((badge, index) => {
              const Icon = iconMap[badge.icon] || Award;
              const tier = tierFor(badge.xpRequired);
              const toGo = Math.max(0, (badge.xpRequired || 0) - xp);
              const pct =
                badge.xpRequired > 0 ? Math.min(100, Math.round((xp / badge.xpRequired) * 100)) : 0;
              const on = earnedOn(badge.unlockedAt);

              return (
                <div
                  key={badge._id}
                  className={`fp-lift group flex flex-col items-center rounded-2xl p-5 text-center ring-1 transition-all ring-inset ${
                    badge.unlocked ? tier.card : 'bg-surface-50/70 ring-line-200'
                  }`}
                >
                  <BadgeMedallion
                    icon={Icon}
                    tier={tier}
                    unlocked={badge.unlocked}
                    size={76}
                    delay={0.06 * index}
                  />

                  {!badge.unlocked && (
                    <span className="mt-3 text-[0.62rem] font-black tracking-[0.11em] text-ink-400 uppercase">
                      Next badge
                    </span>
                  )}
                  <h3
                    className={`mt-3 text-sm font-black ${badge.unlocked ? 'text-ink-900' : 'text-ink-500'}`}
                  >
                    {badge.title}
                  </h3>
                  <p className="mt-1.5 mb-4 flex-1 text-xs leading-relaxed text-ink-500">
                    {badge.description}
                  </p>

                  {badge.unlocked ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${tier.chip}`}
                    >
                      <Sparkles className="h-3 w-3" />
                      {on ? `Earned ${on}` : 'Unlocked'}
                    </span>
                  ) : (
                    /* How close they are, not what the threshold is. This used
                       to read "100 XP to unlock", which is the total required —
                       so a student sitting on 80 XP was told they needed 100
                       more when they needed 20. */
                    <div className="w-full">
                      <div
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${badge.title} progress`}
                        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200"
                      >
                        <div
                          className={`h-full rounded-full transition-[width] duration-1000 ease-out ${tier.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-black text-ink-400 tabular-nums">
                        {toGo} XP to go
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ---- Achievements --------------------------------------------- */}
        <Card>
          <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-ink-900">
            <span aria-hidden>🏆</span> Achievements
          </h2>
          {achievements.length === 0 ? (
            <div className="rounded-2xl border border-line-200 bg-surface-50/70 p-6 text-center">
              <Trophy className="mx-auto mb-3 h-8 w-8 text-ink-300" />
              <p className="text-sm text-ink-500">
                Complete tasks to start unlocking achievements.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((ach) => (
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ---- Milestones ----------------------------------------------- */}
        {milestones.length > 0 && (
          <Card>
            <div className="mb-5">
              <h2 className="flex items-center gap-2 text-lg font-black text-ink-900">
                <span aria-hidden>🚩</span> Milestones
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
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
      <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <RewardStat
          icon={Medal}
          label="Badges earned"
          value={unlockedCount}
          detail={nextBadge ? `Next: ${nextBadge.title}` : 'Every badge so far is yours'}
          tone="text-amber-600"
        />
        <RewardStat
          icon={Trophy}
          label="Achievements"
          value={achievements.length}
          detail={achievements.length ? 'Moments worth keeping' : 'Finish a task to start'}
          tone="text-pink-600"
        />
        <RewardStat
          icon={Zap}
          label="Total XP"
          value={animatedXp}
          detail={`${Math.max(0, ceiling - xp)} XP to Level ${level + 1}`}
          tone="text-journey-600"
        />
        {milestones.length > 0 && (
          <RewardStat
            icon={Flag}
            label="Milestones"
            value={milestones.length}
            detail="Phases finished"
            tone="text-emerald-600"
          />
        )}
      </aside>

      {sharingBadge && (
        <ShareBadgeDialog badge={sharingBadge} onClose={() => setSharingBadge(null)} />
      )}
    </div>
  );
}
