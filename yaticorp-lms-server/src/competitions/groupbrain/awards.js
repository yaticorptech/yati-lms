/**
 * Achievements and certificates, checked after every recorded result (and
 * when an admin corrects one). Each achievement is earned once — a unique
 * index makes a second award impossible — and pays its XP once, through the
 * XP ledger's own key. A certificate is issued once per eligibility rule; one
 * an admin revoked is not issued again by itself.
 */
const { GroupBrainAchievement, GroupBrainCertificate, GroupBrainProfile } = require('./models');
const { totals, brainScore } = require('./stats');
const { getSettings } = require('./settings');
const certificates = require('./certificates');

/** Every achievement: its key, its words, its XP, and when it is earned. */
const ACHIEVEMENTS = [
    { key: 'first_game', title: 'First Steps', description: 'Finish your first Group Brain game.', xp: 10, earned: (t) => t.played >= 1 },
    { key: 'first_win', title: 'First Victory', description: 'Win a Group Brain game.', xp: 20, earned: (t) => t.wins >= 1 },
    { key: 'games_25', title: 'Regular', description: 'Finish 25 Group Brain games.', xp: 40, earned: (t) => t.played >= 25 },
    { key: 'wins_10', title: 'Ten Wins', description: 'Win 10 Group Brain games.', xp: 50, earned: (t) => t.wins >= 10 },
    { key: 'wins_50', title: 'Champion', description: 'Win 50 Group Brain games.', xp: 150, earned: (t) => t.wins >= 50 },
    { key: 'streak_3', title: 'Hat-trick', description: 'Win 3 games in a row.', xp: 30, earned: (t) => t.bestStreak >= 3 },
    { key: 'all_games', title: 'All-Rounder', description: 'Play all ten Group Brain games.', xp: 60, earned: (t) => t.gamesPlayed >= 10 },
    { key: 'perfect', title: 'Flawless', description: 'Get every question or round right in a game of 5 or more.', xp: 30, earned: (t) => t.perfect },
    { key: 'sudoku_solved', title: 'Sudoku Solver', description: 'Complete a Sudoku Challenge board.', xp: 30, earned: (t) => t.sudokuFinished },
    { key: 'chess_1400', title: 'Rising Rook', description: 'Reach a chess rating of 1400.', xp: 50, earned: (t, p) => (p?.chessRating || 0) >= 1400 },
    { key: 'bps_70', title: 'Sharp Mind', description: 'Reach a Brain Performance Score of 70 after 10 games.', xp: 50, earned: (t) => t.played >= 10 && (brainScore(t.rows).bps || 0) >= 70 }
];

/** Whether a certificate rule is met. */
const meets = (rule, t, profile, achieved) => {
    switch (rule.type) {
        case 'wins': return t.wins >= rule.threshold;
        case 'games': return (rule.game ? t.byGame[rule.game]?.played || 0 : t.played) >= rule.threshold;
        case 'gamesPlayed': return t.gamesPlayed >= rule.threshold;
        case 'chessRating': return (profile?.chessRating || 0) >= rule.threshold;
        case 'bps': return t.played >= (rule.minGames || 10) && (brainScore(t.rows).bps || 0) >= rule.threshold;
        case 'achievement': return achieved.has(rule.achievement);
        default: return false;
    }
};

/** Check one player: award what is newly earned. Returns what was new. */
const evaluate = async (userId) => {
    const [t, profile, have, settings] = await Promise.all([
        totals(userId),
        GroupBrainProfile.findOne({ userId }).lean(),
        GroupBrainAchievement.find({ userId }).select('key').lean(),
        getSettings()
    ]);
    const achieved = new Set(have.map((a) => a.key));
    const fresh = [];
    const { addXp } = require('../../rewards/services/xpService');
    for (const a of ACHIEVEMENTS) {
        if (achieved.has(a.key) || !a.earned(t, profile)) continue;
        try {
            await GroupBrainAchievement.create({ userId, key: a.key, title: a.title, description: a.description, xp: a.xp });
        } catch (err) { if (err?.code === 11000) continue; throw err; }
        achieved.add(a.key);
        fresh.push(a.key);
        if (a.xp) await addXp({ userId, amount: a.xp, source: 'group_brain_achievement', refId: a.key, description: `for the Group Brain achievement "${a.title}"` }).catch(() => {});
    }
    const issued = [];
    if (t.played) {
        // The name on the account now, as the certificate should print it.
        const User = require('../../models/User');
        const name = (await User.findById(userId).select('name').lean())?.name || t.rows[0]?.name || 'Player';
        for (const rule of settings.certificateRules.filter((r) => r.enabled !== false)) {
            if (!meets(rule, t, profile, achieved)) continue;
            if (await GroupBrainCertificate.exists({ userId, ruleKey: rule.key })) continue;    // issued already, or revoked by an admin
            const cert = await certificates.issue({ userId, name, title: rule.title, line: rule.line, ruleKey: rule.key }).catch((err) => (err?.code === 11000 ? null : Promise.reject(err)));
            if (cert) issued.push(cert.certId);
        }
    }
    return { achievements: fresh, certificates: issued };
};

module.exports = { ACHIEVEMENTS, evaluate, meets };
