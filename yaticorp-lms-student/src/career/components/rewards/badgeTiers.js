import { Award, Flame, CheckCircle, TrendingUp, Target, Zap, Rocket, Crown } from 'lucide-react';

/** The icon a badge names in the database, resolved to a component. */
export const BADGE_ICONS = { Award, Flame, CheckCircle, TrendingUp, Target, Zap, Rocket, Crown };

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
export const TIERS = [
  {
    name: 'Starter',
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
    name: 'Rising',
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
    name: 'Gold',
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
    name: 'Legend',
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

export const tierFor = (xpRequired) =>
  TIERS.find((t) => (xpRequired || 0) <= t.upTo) || TIERS.at(-1);
