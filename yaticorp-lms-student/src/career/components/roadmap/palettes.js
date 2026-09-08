import {
  BookOpen, CodeXml, Target, Briefcase, Trophy, Rocket, FlaskConical, Lightbulb
} from 'lucide-react';

/**
 * The colours and icons of the platforms on the journey map, cycling down
 * the road. Icons come from Lucide, the pack the rest of the site draws
 * from, so the map matches the tab strip above it. Full class strings,
 * because Tailwind only ships the classes it can read.
 */
export const PALETTES = [
  { road: 'stroke-emerald-200', dash: 'stroke-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50', icon: BookOpen, top: 'from-emerald-300 to-emerald-500', side: 'bg-emerald-700', tile: 'from-emerald-50 to-emerald-100', glow: 'shadow-emerald-500/40', badge: 'bg-emerald-500', stripe: 'from-emerald-400 to-teal-500' },
  { road: 'stroke-sky-200', dash: 'stroke-blue-500', text: 'text-blue-700', soft: 'bg-sky-50', icon: CodeXml, top: 'from-sky-300 to-blue-500', side: 'bg-blue-700', tile: 'from-sky-50 to-blue-100', glow: 'shadow-blue-500/40', badge: 'bg-blue-500', stripe: 'from-sky-400 to-blue-600' },
  { road: 'stroke-violet-200', dash: 'stroke-purple-500', text: 'text-purple-700', soft: 'bg-violet-50', icon: Target, top: 'from-violet-300 to-purple-500', side: 'bg-purple-700', tile: 'from-violet-50 to-purple-100', glow: 'shadow-purple-500/40', badge: 'bg-purple-500', stripe: 'from-violet-400 to-fuchsia-500' },
  { road: 'stroke-amber-200', dash: 'stroke-orange-500', text: 'text-orange-700', soft: 'bg-amber-50', icon: Briefcase, top: 'from-amber-300 to-orange-400', side: 'bg-orange-600', tile: 'from-amber-50 to-orange-100', glow: 'shadow-orange-500/40', badge: 'bg-orange-500', stripe: 'from-amber-400 to-orange-500' },
  { road: 'stroke-pink-200', dash: 'stroke-rose-500', text: 'text-rose-700', soft: 'bg-pink-50', icon: Trophy, top: 'from-pink-300 to-rose-400', side: 'bg-rose-600', tile: 'from-pink-50 to-rose-100', glow: 'shadow-rose-500/40', badge: 'bg-rose-500', stripe: 'from-pink-400 to-rose-500' },
  { road: 'stroke-indigo-200', dash: 'stroke-indigo-500', text: 'text-indigo-700', soft: 'bg-indigo-50', icon: Rocket, top: 'from-indigo-300 to-indigo-500', side: 'bg-indigo-700', tile: 'from-indigo-50 to-indigo-100', glow: 'shadow-indigo-500/40', badge: 'bg-indigo-500', stripe: 'from-indigo-400 to-journey-600' },
  { road: 'stroke-teal-200', dash: 'stroke-cyan-500', text: 'text-cyan-700', soft: 'bg-teal-50', icon: FlaskConical, top: 'from-teal-300 to-cyan-500', side: 'bg-cyan-700', tile: 'from-teal-50 to-cyan-100', glow: 'shadow-cyan-500/40', badge: 'bg-cyan-500', stripe: 'from-teal-400 to-cyan-500' },
  { road: 'stroke-yellow-200', dash: 'stroke-amber-500', text: 'text-amber-700', soft: 'bg-yellow-50', icon: Lightbulb, top: 'from-yellow-300 to-amber-400', side: 'bg-amber-600', tile: 'from-yellow-50 to-amber-100', glow: 'shadow-amber-500/40', badge: 'bg-amber-500', stripe: 'from-yellow-400 to-amber-500' }
];

export const paletteFor = (index) => PALETTES[index % PALETTES.length];

