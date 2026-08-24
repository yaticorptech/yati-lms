import { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import ShareBadgeDialog from '../../components/roadmap/ShareBadgeDialog';
import {
  Award, Flame, CheckCircle, TrendingUp, Lock, Trophy, Zap, Target, Rocket, Crown, Info, Share2
} from 'lucide-react';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { SkeletonPage } from '../../components/ui/Skeleton';
import useCountUp from '../../hooks/useCountUp';

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
    chip: 'bg-emerald-50 text-emerald-700'
  },
  {
    upTo: 500,
    tile: 'bg-gradient-to-br from-sky-100 to-indigo-100',
    icon: 'text-sky-600',
    ring: 'ring-sky-200',
    bar: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700'
  },
  {
    upTo: 2000,
    tile: 'bg-gradient-to-br from-amber-100 to-orange-100',
    icon: 'text-amber-600',
    ring: 'ring-amber-300',
    bar: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700'
  },
  {
    // Everything past Skill Master. A fourth colour so six top-tier badges do
    // not end up as six identical gold cards.
    upTo: Infinity,
    tile: 'bg-gradient-to-br from-rose-100 to-pink-100',
    icon: 'text-rose-600',
    ring: 'ring-rose-300',
    bar: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-700'
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

export default function Badges() {
  const { user, isCreditSystemEnabled } = useContext(AuthContext);
  const [achievements, setAchievements] = useState([]);
  const [badges, setBadges] = useState([]);
  // Milestone badges are a different animal from the XP badges below: they mark
  // roadmap phases rather than XP thresholds, and they are meant to leave the
  // app. Grouped separately so the two are never mistaken for each other.
  const [milestones, setMilestones] = useState([]);
  const [sharingBadge, setSharingBadge] = useState(null);
  const [loading, setLoading] = useState(true);

  const xp = user?.xp || 0;
  const level = user?.level || 1;
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
  const xpIntoLevel = xp - floor;
  const xpNeeded = ceiling - floor;
  const percent = Math.round((xpIntoLevel / xpNeeded) * 100);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  // Earned badges first, then whichever locked one is closest. A student who is
  // twenty XP from a badge should not have to hunt for it behind one worth
  // fifteen hundred.
  const ordered = [...badges].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return (a.xpRequired || 0) - (b.xpRequired || 0);
  });

  return (
    <div className="space-y-8">
      {/* "Gamification" named the machinery, not the thing — and the sidebar
          calls this Rewards, so the page called itself something else. */}
      <PageHeader
        title="Rewards"
        subtitle="Every task you finish earns XP. XP raises your level and unlocks badges."
      />

      {/* Said out loud because two numbers that both go up look like the same
          number. They are not: credits come from course quizzes and belong to
          the LMS, XP comes from Career Path tasks. Neither converts into the
          other — a student who assumed it did would keep grinding tasks
          expecting a course to unlock. */}
      {isCreditSystemEnabled && (
        <div className="flex items-start gap-3 rounded-xl border border-line-200 bg-surface-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          <p className="text-sm leading-relaxed text-ink-600">
            <strong className="font-semibold text-ink-900">XP is not credits.</strong>{' '}
            XP is your Career Path progress and unlocks the badges below. Your{' '}
            <strong className="font-semibold text-ink-900">{user?.credits || 0} credits</strong>{' '}
            are separate — you earn those from quizzes inside your courses. One
            does not convert into the other.
          </p>
        </div>
      )}

      {milestones.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Milestones</h2>
            <p className="text-sm text-ink-500">
              Roadmap phases you have finished. These are yours to share.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {milestones.map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() => setSharingBadge(m)}
                className="group overflow-hidden rounded-xl border border-line-200 bg-surface text-left transition-all hover:border-brand-300 hover:shadow-card-hover"
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
                    <span className="block truncate text-sm font-bold text-ink-900">{m.phaseTitle}</span>
                    <span className="block text-xs text-ink-500">
                      {new Date(m.issuedAt).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-link transition-colors group-hover:bg-brand-100">
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Level hero. The same gradient and dot field as the roadmap, profile and
          mentor banners — this was the last flat slab of brand-700 left. */}
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-900 to-slate-900 p-6 text-white shadow-float sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
        <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-6">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/30 bg-white/15">
              <span className="text-4xl font-bold tabular-nums">{level}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Level {level} Learner</h2>
              <p className="mt-1 flex items-center gap-1.5 text-indigo-100">
                <Zap className="h-4 w-4 text-amber-300" />
                <span className="font-semibold tabular-nums">{animatedXp}</span> total XP
              </p>
              {/* Not "X of Y": the catalogue is revealed one badge at a time,
                  so Y is only what happens to be visible today. Printing it as
                  a total would tell a student they had finished the set. */}
              <p className="mt-2 text-sm text-indigo-200">
                {unlockedCount} {unlockedCount === 1 ? 'badge' : 'badges'} earned
              </p>
            </div>
          </div>

          <div className="w-full md:w-1/3">
            <div className="mb-2 flex justify-between text-sm font-medium text-indigo-100">
              <span>Progress to Level {level + 1}</span>
              <span className="tabular-nums">
                {xpIntoLevel} / {xpNeeded} XP
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-indigo-900/40">
              <div
                className="h-3 rounded-full bg-surface shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-[width] duration-1000 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Badge catalogue */}
      <section>
        {/* Says why the list is short, so a one-card page reads as a ladder
            rather than as everything there is. */}
        <h3 className="text-xl font-bold text-ink-900">Badges</h3>
        <p className="mt-1 mb-5 text-sm text-ink-500">
          One at a time — earn the badge you can see and the next one appears.
        </p>
        <div className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((badge) => {
            const Icon = iconMap[badge.icon] || Award;
            const tier = tierFor(badge.xpRequired);
            const toGo = Math.max(0, (badge.xpRequired || 0) - xp);
            const percent = badge.xpRequired > 0
              ? Math.min(100, Math.round((xp / badge.xpRequired) * 100))
              : 0;
            const on = earnedOn(badge.unlockedAt);

            return (
              <Card
                key={badge._id}
                hover={badge.unlocked}
                className={`flex flex-col items-center text-center ${
                  badge.unlocked ? `ring-1 ring-inset ${tier.ring}` : 'bg-surface-50/60'
                }`}
              >
                {/* Locked badges stay grey — the colour is the reward. The bar
                    below still carries the tier hue, so you can see what you
                    are working toward. */}
                <div
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-xl ${
                    badge.unlocked ? `${tier.tile} shadow-inner` : 'bg-surface-100'
                  }`}
                >
                  {badge.unlocked ? (
                    <Icon className={`h-8 w-8 ${tier.icon}`} />
                  ) : (
                    <Lock className="h-7 w-7 text-ink-300" />
                  )}
                </div>
                {!badge.unlocked && (
                  <span className="mb-1.5 text-[0.65rem] font-bold tracking-wider text-ink-400 uppercase">
                    Next badge
                  </span>
                )}
                <h4 className={`font-bold ${badge.unlocked ? 'text-ink-900' : 'text-ink-500'}`}>
                  {badge.title}
                </h4>
                <p className="mt-1.5 mb-4 flex-1 text-sm leading-relaxed text-ink-500">
                  {badge.description}
                </p>

                {badge.unlocked ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${tier.chip}`}>
                    {on ? `Earned ${on}` : 'Unlocked'}
                  </span>
                ) : (
                  /* How close they are, not what the threshold is.
                     This used to read "100 XP to unlock", which is the total
                     required — so a student sitting on 80 XP was told they
                     needed 100 more when they needed 20. The bar makes the
                     near-misses visible, which is the only part of a locked
                     badge worth looking at. */
                  <div className="w-full">
                    <div
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${badge.title} progress`}
                      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200"
                    >
                      <div
                        className={`h-1.5 rounded-full transition-[width] duration-1000 ease-out ${tier.bar}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-bold text-ink-400 tabular-nums">
                      {toGo} XP to go
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Achievements */}
      <section>
        <h3 className="mb-5 text-xl font-bold text-ink-900">Achievements</h3>
        {achievements.length === 0 ? (
          <Card className="text-center text-ink-500">
            <Trophy className="mx-auto mb-3 h-8 w-8 text-ink-300" />
            <p className="text-sm">Complete tasks to start unlocking achievements.</p>
          </Card>
        ) : (
          <div className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {achievements.map((ach) => (
              <Card
                key={ach._id}
                hover
                className="flex flex-col items-center text-center ring-1 ring-violet-200 ring-inset"
              >
                {/* Violet, so achievements are not mistaken for a fourth tier of
                    badge. They are a different kind of thing: a moment that
                    happened, not a threshold that was crossed. */}
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 shadow-inner">
                  <Trophy className="h-7 w-7 text-violet-600" />
                </div>
                <h4 className="font-bold text-ink-900">{ach.title}</h4>
                <p className="mt-1.5 text-sm text-ink-500">{ach.description}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
      {sharingBadge && (
        <ShareBadgeDialog badge={sharingBadge} onClose={() => setSharingBadge(null)} />
      )}
    </div>
  );
}
