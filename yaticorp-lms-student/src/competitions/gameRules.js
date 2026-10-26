/**
 * Each game's banner colours and rules for its
 * competition page (GameInfo.jsx).
 */
/** Each game's banner colours. */
export const HERO = {
    chess: 'from-[#1f2937] via-[#334155] to-[#4f46e5]',
    rapidfire: 'from-[#9a3412] via-[#ea580c] to-[#be123c]',
    codeclash: 'from-[#0f172a] via-[#065f46] to-[#059669]',
    brainsprint: 'from-[#155e75] via-[#0891b2] to-[#4f46e5]',
    quizarena: 'from-[#2d2693] via-[#4f3fd8] to-[#a21caf]'
};

const opt = (c, key, dflt) => Number(c.gameOptions?.[key]) || dflt;

/**
 * A game's rules, from the competition's own settings (its format, clock or
 * questions, scoring, joining). Kept to what the game engines actually do
 * (server: games/*.js).
 */
export const gameRules = (c) => {
    const join = 'Join only after the organizer starts your match: your own 6-character joining code appears then, here and in My Games. Enter it to take your seat.';
    const walkover = 'Join within 10 minutes of the start, or your team loses the match by walkover.';
    const knockout = `Knockout, ${c.teamsPerMatch} teams a match: the winner goes through to the next round.`;
    if (c.game === 'chess') {
        const clock = opt(c, 'clockMinutes', 10);
        const side = c.playersPerSide || 1;
        return [
            knockout,
            `${side} player${side > 1 ? 's' : ''} a side at the board, from teams of up to ${c.playersPerTeam}; the team picks who plays.`,
            'Standard chess rules. White moves first; colours are given for you.',
            `Each player has their own clock: ${clock} minutes each.`,
            'Checkmate wins. Resigning, or your clock running out, loses.',
            'A drawn game is replayed. After three draws the organizer decides the match.',
            join, walkover,
            'The organizer\'s decision on any dispute is final.'
        ];
    }
    const brain = {
        rapidfire: { q: 15, s: 8, unit: 'questions', what: 'quick general-knowledge questions, four options each' },
        codeclash: { q: 8, s: 45, unit: 'challenges', what: 'predict the output of real JavaScript and Python, spot the bug, and the concepts an interview asks about' },
        brainsprint: { q: 12, s: 25, unit: 'puzzles', what: 'IQ puzzles made fresh for every match: number and letter series, equations, clock angles, primes and word problems' }
    }[c.game];
    if (!brain) return [join, walkover];
    const q = opt(c, 'questionCount', brain.q);
    const s = opt(c, 'questionSeconds', brain.s);
    const hidden = c.game === 'rapidfire';
    return [
        knockout,
        `${q} ${brain.unit}: ${brain.what}.`,
        `${s} seconds each. Everyone sees the same question at the same moment; it closes when the time is up.`,
        hidden ? 'Answer every question once: a right answer scores +10, a wrong one costs 5. You are not told which answers were right, or the scores, until the game is over — then every question is shown with its answer.' : 'A right answer scores 100, plus up to 50 for answering fast. A wrong one scores 0. Each question is answered once; answers cannot be changed.',
        'Most points after the last question wins. Level on points? The faster total time wins.',
        join, walkover,
        'The organizer\'s decision on any dispute is final.'
    ];
};
