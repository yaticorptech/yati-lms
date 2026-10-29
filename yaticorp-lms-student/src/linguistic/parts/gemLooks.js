/**
 * The look of each Language Learning badge (GemBadge.jsx; asked 2026-10-27, then "make it like this
 * picture": colourful frames with a picture inside, splashes around, each row its own colour).
 *   shape   'hex' or 'diamond'
 *   rim     the frame's colours, light to dark; face: the inside's
 *   art     an emoji, or 'translate' (two letter tiles)
 *   extra   'stars' | 'star' (one under the picture) | 'crown'
 *   tint    the row's background and border; bar: the progress bar's colours, and its track
 */
export const BADGE_LOOK = {
    first_step: { shape: 'hex', hue: 'teal', rim: ['#5EEAD4', '#0F766E'], face: ['#99F6E4', '#0D9488'], art: '🧭', splash: '#14B8A6', tint: ['#F0FDFA', '#CCFBF1'], bar: ['#2DD4BF', '#0D9488', '#CCFBF1'] },
    first_lesson: { shape: 'hex', hue: 'green', rim: ['#86EFAC', '#15803D'], face: ['#BBF7D0', '#16A34A'], art: '🌱', splash: '#22C55E', tint: ['#F0FDF4', '#DCFCE7'], bar: ['#4ADE80', '#16A34A', '#DCFCE7'] },
    ten_lessons: { shape: 'hex', hue: 'amber', rim: ['#FDE68A', '#D97706'], face: ['#FDBA74', '#F59E0B'], art: '📖', extra: 'star', splash: '#F59E0B', tint: ['#FFF8EB', '#FDEBC8'], bar: ['#FBBF24', '#F59E0B', '#FDEBC8'] },
    perfect: { shape: 'diamond', hue: 'blue', rim: ['#7DD3FC', '#1D4ED8'], face: ['#60A5FA', '#1E40AF'], art: '⭐', extra: 'stars', splash: '#38BDF8', tint: ['#EFF8FF', '#D6ECFF'], bar: ['#3B82F6', '#1D4ED8', '#D6ECFF'] },
    translator: { shape: 'hex', hue: 'purple', rim: ['#D8B4FE', '#7E22CE'], face: ['#C084FC', '#7E22CE'], art: 'translate', extra: 'stars', splash: '#A855F7', tint: ['#FAF5FF', '#EBDDFB'], bar: ['#C084FC', '#9333EA', '#EBDDFB'] },
    streak_3: { shape: 'hex', hue: 'orange', rim: ['#FDBA74', '#EA580C'], face: ['#FB923C', '#DC2626'], art: '🔥', extra: 'star', splash: '#F97316', tint: ['#FFF7ED', '#FFE4C7'], bar: ['#FB923C', '#EA580C', '#FFE4C7'] },
    streak_7: { shape: 'diamond', hue: 'green', rim: ['#86EFAC', '#15803D'], face: ['#22C55E', '#166534'], art: '⚡', splash: '#22C55E', tint: ['#F0FDF4', '#D5F5DE'], bar: ['#4ADE80', '#16A34A', '#D5F5DE'] },
    reviser: { shape: 'hex', hue: 'red', rim: ['#FDA4AF', '#BE123C'], face: ['#F43F5E', '#9F1239'], art: '🧠', splash: '#F43F5E', tint: ['#FFF1F3', '#FFDCE2'], bar: ['#FB7185', '#E11D48', '#FFDCE2'] },
    level_beginner: { shape: 'hex', hue: 'bronze', rim: ['#F4B183', '#9A4A1C'], face: ['#D9864A', '#7C3410'], art: '🏅', splash: '#E08A4F', tint: ['#F8FAFC', '#E5EAF1'], bar: ['#E8A06B', '#B45F25', '#E2E6EC'] },
    level_intermediate: { shape: 'hex', hue: 'silver', rim: ['#F1F5F9', '#64748B'], face: ['#CBD5E1', '#64748B'], art: '🎖️', splash: '#3B82F6', tint: ['#F4F6FD', '#E1E6F7'], bar: ['#93A4BF', '#5B6B85', '#E2E6EC'] },
    level_advanced: { shape: 'hex', hue: 'gold', rim: ['#FDE047', '#B45309'], face: ['#7C3AED', '#3B0F80'], art: '🏆', extra: 'crown', splash: '#F59E0B', tint: ['#FFF9EB', '#FCEBC4'], bar: ['#FACC15', '#CA8A04', '#E2E6EC'] }
};
const SPARE = ['ten_lessons', 'perfect', 'translator', 'reviser'];
/** A badge's look by its key (another key borrows one in turn, with a gem). */
export const lookOf = (key, i = 0) => BADGE_LOOK[key] || { ...BADGE_LOOK[SPARE[i % SPARE.length]], art: '💎' };
