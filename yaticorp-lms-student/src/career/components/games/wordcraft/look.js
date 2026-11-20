/** WORDCRAFT's colours and buttons (2026-11-20). */

/** Each challenge's own colours: [hero gradient, accent text, soft background, ring]. */
export const LOOK = {
  'dont-say': { hero: 'from-rose-500 via-fuchsia-600 to-violet-700', text: 'text-rose-600', soft: 'bg-rose-50', ring: 'ring-rose-200' },
  caption: { hero: 'from-sky-500 via-blue-600 to-indigo-700', text: 'text-blue-600', soft: 'bg-sky-50', ring: 'ring-sky-200' },
  talk60: { hero: 'from-violet-600 via-indigo-600 to-blue-600', text: 'text-violet-600', soft: 'bg-violet-50', ring: 'ring-violet-200' },
  plot: { hero: 'from-fuchsia-600 via-purple-600 to-indigo-700', text: 'text-fuchsia-600', soft: 'bg-fuchsia-50', ring: 'ring-fuchsia-200' },
  sell: { hero: 'from-orange-500 via-pink-600 to-purple-700', text: 'text-orange-600', soft: 'bg-orange-50', ring: 'ring-orange-200' },
  twister: { hero: 'from-blue-600 via-violet-600 to-fuchsia-600', text: 'text-indigo-600', soft: 'bg-indigo-50', ring: 'ring-indigo-200' }
};

export const btnMain = 'wc-press inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 px-6 text-base font-black text-white shadow-[0_12px_26px_-12px_rgba(168,32,190,0.9)] transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none';
export const btnSoft = 'wc-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-violet-700 ring-2 ring-violet-200 transition ring-inset hover:bg-violet-50 disabled:opacity-40';

