/**
 * Group Brain's settings: which games are on and at which difficulties, how
 * much XP a game pays, the certificate rules, and the thresholds that flag a
 * result for review. One document; defaults fill anything never set, so a
 * fresh install works without an admin touching it. Every change is audited.
 */
const { GroupBrainSettings, GroupBrainAudit } = require('./models');
const { ROOM_GAMES } = require('../games');

const LEVELS = ['easy', 'medium', 'hard'];

// XP by finishing place (asked 2026-10-27): 1st most, then less for each place. A shared place pays that place's XP; resigning pays none.
const DEFAULT_XP = { first: 50, second: 30, third: 20, fourth: 10 };
const DEFAULT_SUSPICIOUS = {
    fastAnswerMs: 400,        // a quiz answer right in under this, every time
    reactionMs: 100,          // a reaction quicker than a human can
    sudokuSeconds: 90,        // a whole Sudoku in under this
    sameOpponentsPerDay: 10   // the same players finishing more rooms than this in a day
};
const DEFAULT_RULES = [
    { key: 'wins_10', title: 'Group Brain Achiever', line: 'for winning 10 Group Brain games', type: 'wins', threshold: 10, enabled: true },
    { key: 'all_games', title: 'Group Brain Explorer', line: 'for playing all ten Group Brain games', type: 'gamesPlayed', threshold: 10, enabled: true },
    { key: 'chess_1400', title: 'Chess Rating 1400', line: 'for reaching a Group Brain chess rating of 1400', type: 'chessRating', threshold: 1400, enabled: true },
    { key: 'bps_80', title: 'Brain Performance Excellence', line: 'for a Brain Performance Score of 80 or more over 10 games', type: 'bps', threshold: 80, minGames: 10, enabled: true }
];
const RULE_TYPES = ['wins', 'games', 'gamesPlayed', 'chessRating', 'bps', 'achievement'];

const defaults = () => ({
    games: Object.fromEntries(ROOM_GAMES.map((id) => [id, { enabled: true, difficulties: [...LEVELS] }])),
    xp: { ...DEFAULT_XP },
    certificateRules: DEFAULT_RULES.map((r) => ({ ...r })),
    suspicious: { ...DEFAULT_SUSPICIOUS }
});

/** The settings, defaults filled in. */
const getSettings = async () => {
    const doc = await GroupBrainSettings.findOne({ key: 'main' }).lean();
    const d = defaults();
    if (!doc) return d;
    return {
        games: Object.fromEntries(ROOM_GAMES.map((id) => {
            const g = doc.games?.[id] || {};
            const difficulties = Array.isArray(g.difficulties) ? g.difficulties.filter((x) => LEVELS.includes(x)) : LEVELS;
            return [id, { enabled: g.enabled !== false, difficulties: difficulties.length ? difficulties : [...LEVELS] }];
        })),
        xp: { ...d.xp, ...(doc.xp || {}) },
        certificateRules: doc.certificateRules?.length ? doc.certificateRules : d.certificateRules,
        suspicious: { ...d.suspicious, ...(doc.suspicious || {}) }
    };
};

const fail = (message) => Object.assign(new Error(message), { status: 400 });
const num = (v, lo, hi) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < lo || n > hi) throw fail(`Each number must be between ${lo} and ${hi}.`);
    return Math.round(n);
};

/** Check and clean what an admin sends; anything left out keeps its value. */
const clean = (body, current) => {
    const out = {};
    if (body.games) {
        out.games = { ...current.games };
        for (const [id, g] of Object.entries(body.games)) {
            if (!ROOM_GAMES.includes(id)) throw fail(`No game "${id}".`);
            const difficulties = Array.isArray(g.difficulties) ? g.difficulties.filter((x) => LEVELS.includes(x)) : current.games[id].difficulties;
            if (!difficulties.length) throw fail('Each game needs at least one difficulty.');
            out.games[id] = { enabled: g.enabled !== false, difficulties };
        }
    }
    if (body.xp) {
        out.xp = { ...current.xp };
        for (const k of Object.keys(DEFAULT_XP)) if (body.xp[k] != null) out.xp[k] = num(body.xp[k], 0, 1000);
    }
    if (body.suspicious) {
        out.suspicious = { ...current.suspicious };
        for (const k of Object.keys(DEFAULT_SUSPICIOUS)) if (body.suspicious[k] != null) out.suspicious[k] = num(body.suspicious[k], 0, 100000);
    }
    if (body.certificateRules) {
        if (!Array.isArray(body.certificateRules)) throw fail('certificateRules must be a list.');
        const keys = new Set();
        out.certificateRules = body.certificateRules.map((r) => {
            const key = String(r.key || '').trim();
            if (!/^[a-z0-9_]{2,40}$/.test(key)) throw fail('A rule key is 2–40 lowercase letters, digits or _.');
            if (keys.has(key)) throw fail(`Two rules use the key "${key}".`);
            keys.add(key);
            if (!RULE_TYPES.includes(r.type)) throw fail(`A rule's type is one of ${RULE_TYPES.join(', ')}.`);
            const title = String(r.title || '').trim().slice(0, 80);
            if (!title) throw fail('Every rule needs a certificate title.');
            return {
                key, title, type: r.type, line: String(r.line || '').trim().slice(0, 140),
                threshold: num(r.threshold ?? 0, 0, 100000),
                ...(r.type === 'bps' ? { minGames: num(r.minGames ?? 10, 1, 1000) } : {}),
                ...(r.type === 'games' && r.game ? { game: ROOM_GAMES.includes(r.game) ? r.game : (() => { throw fail(`No game "${r.game}".`); })() } : {}),
                ...(r.type === 'achievement' ? { achievement: String(r.achievement || '') } : {}),
                enabled: r.enabled !== false
            };
        });
    }
    return out;
};

/** Save an admin's change, and audit it. */
const updateSettings = async (body, admin, reason = '') => {
    const current = await getSettings();
    const changes = clean(body || {}, current);
    const next = { ...current, ...changes };
    await GroupBrainSettings.updateOne({ key: 'main' }, { $set: next }, { upsert: true });
    await audit(admin, 'settings.update', 'settings', changes && Object.fromEntries(Object.keys(changes).map((k) => [k, current[k]])), changes, reason);
    return getSettings();
};

/** Write one line of the audit log. */
const audit = (admin, action, target, before, after, reason = '') => GroupBrainAudit.create({
    adminId: admin?._id || null, adminName: admin?.name || admin?.email || 'system', action, target: String(target || ''), before, after, reason: String(reason || '').slice(0, 300)
});

module.exports = { getSettings, updateSettings, audit, defaults, LEVELS, RULE_TYPES, DEFAULT_RULES };
