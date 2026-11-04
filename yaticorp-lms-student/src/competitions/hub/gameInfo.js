/**
 * The five competition games as the Competitions page shows them (2026-11-04): each one's picture, icon, colour,
 * what it is and its rules — for its card, its rules pop-up (GamePopup.jsx) and its own page.
 */
import { GAMES, gameImage, gameIcon } from '../api';
import { ROUND_NAMES, ROUND_BLURBS } from '../arena/api';
import { gameRules } from '../gameRules';

export const ARENA = {
    label: 'Quiz Arena', image: '/games/quizarena-card.jpg?v=3', players: 'Individual', format: 'Three rounds · everyone at once',
    blurb: 'A live quiz for every student at the same moment, in three rounds. Your college enters you.',
    rules: [
        ...[1, 2, 3].map((r) => `Round ${r}, ${ROUND_NAMES[r]}: ${ROUND_BLURBS[r]}`),
        'Every question is timed; answer before the clock runs out. Faster right answers score more.',
        'Everyone sees the same questions at the same time. The highest total wins.',
        'Join with your own code once the quiz opens. The organizer\'s decision on any dispute is final.'
    ]
};

// Each card's label bar, in the game's own colour.
const LOOK = {
    chess: 'from-[#8a6512]/95 via-[#a8801f]/90 to-[#6b4c0b]/95',
    rapidfire: 'from-[#9f1d10]/95 via-[#c2301c]/90 to-[#7f1508]/95',
    codeclash: 'from-[#0f5a2c]/95 via-[#178a40]/90 to-[#0b4721]/95',
    brainsprint: 'from-[#163d6e]/95 via-[#235a9c]/90 to-[#102f57]/95',
    quizarena: 'from-[#4c1d95]/95 via-[#6d28d9]/90 to-[#3b0f80]/95'
};

export const GAME_IDS = [...Object.keys(GAMES), 'quizarena'];

/** One game: { id, label, image, icon, bar, players, format, blurb, rules }. */
export const gameCard = (id) => {
    if (id === 'quizarena') return { id, ...ARENA, icon: '/games/quizarena-icon.png', bar: LOOK.quizarena };
    const g = GAMES[id];
    if (!g) return null;
    return {
        id, label: g.label, image: gameImage(id), icon: gameIcon(id), bar: LOOK[id] || LOOK.quizarena,
        players: g.players, format: g.format || 'Knockout, match by match', blurb: g.blurb,
        rules: gameRules({ game: id, teamsPerMatch: 2, playersPerTeam: 2, playersPerSide: 1 })
    };
};

/** The page's panels: plain white, a fine violet edge, a lifted shadow (2026-11-04). */
export const PANEL = 'relative overflow-hidden rounded-[22px] border border-violet-100/80 bg-white shadow-[0_14px_34px_-16px_rgba(91,33,182,.3)]';
