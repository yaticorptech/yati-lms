/**
 * Brain games: the account-side copy of each student's progress, and the
 * leaderboard built from it.
 *
 * Games are still played and scored entirely in the browser. What the server
 * adds is memory across devices, a way to compare, the daily play limit, and
 * XP: a level pays the admin's XP for its best stars, once per star reached
 * (Rewards → Reward rules → Brain games). Replaying at the same stars pays
 * nothing, and nothing is paid once the day's minutes are used up — so a
 * memory game cannot become a way to farm XP.
 *
 * Because the score is the browser's word, saveProgress is strict about what
 * it believes: real game ids only, at most one level further per request, and
 * no change at all before any play time has been counted today. See there.
 */
const User = require('../models/User');
const GameProgress = require('../models/GameProgress');
const GameStarEvent = require('../models/GameStarEvent');
const GamePlayTime = require('../models/GamePlayTime');
const { isGameId } = require('../data/gameIds');
const { catalogGame, gameTitle, CATEGORIES } = require('../data/gameCatalog');
const { effectiveZone, effectiveZones } = require('../services/gameZone');
const { accessFor, canPlay } = require('../../competitions/services/zoneAccess');
const { periodWindow, dayKey, addDays, startOfDay } = require('../../rewards/config/constants');
const { getConfig } = require('../../rewards/services/configService');
const { addXp } = require('../../rewards/services/xpService');

// A heartbeat may claim at most this many seconds, and never more than really
// passed since the one before.
const MAX_BEAT_SECONDS = 30;
// A level finished just as the clock ran out still pays.
const GRACE_SECONDS = 60;

/** XP the admin pays for a level finished with `stars` stars (0 → 0). */
const xpForStars = (games, stars) => [0, games.xpOneStar, games.xpTwoStars, games.xpThreeStars][stars] || 0;

/** Today's play time against the admin's limit, plus the XP table, for the page. */
const playState = async (userId, config) => {
  const games = config.games;
  const day = dayKey();
  const doc = await GamePlayTime.findOne({ userId, day }).lean();
  const used = Math.round(doc?.seconds || 0);
  const limit = Math.max(0, Math.round((games.dailyMinutes || 0) * 60));
  return {
    day,
    usedSeconds: used,
    // 0 means the admin set no limit.
    limitSeconds: limit,
    remainingSeconds: limit ? Math.max(0, limit - used) : null,
    resetsAt: startOfDay(addDays(day, 1)),
    xpByStars: { 1: games.xpOneStar, 2: games.xpTwoStars, 3: games.xpThreeStars }
  };
};

const MAX_LEVEL = 500;     // 500 levels a game since 2026-10-31
const MAX_STARS = 3;
const PERIODS = ['daily', 'weekly', 'monthly', 'all'];
const SCOPES = ['global', 'institution', 'class'];
const BOARD_SIZE = 10;

const fail = (res, error, what) => {
  console.error(`[career/games] ${what}:`, error);
  res.status(500).json({ message: `Could not ${what}` });
};

/** Tidy an incoming stars object: level keys 1…500, values 0…3, whole numbers. */
const cleanStars = (input) => {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const [key, value] of Object.entries(input)) {
    const level = Number(key);
    const stars = Math.floor(Number(value));
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) continue;
    if (!Number.isFinite(stars) || stars <= 0) continue;
    out[String(level)] = Math.min(MAX_STARS, stars);
  }
  return out;
};

const shapeProgress = (doc) => ({
  gameId: doc.gameId,
  level: doc.level,
  stars: doc.stars instanceof Map ? Object.fromEntries(doc.stars) : doc.stars || {},
  ...(doc.stats ? { stats: doc.stats } : {})
});

/*
 * The adaptive record a browser sends (2026-11-13): only known fields, numbers held to their ranges, at most twelve
 * sessions. It sets nothing but the student's own practice stage — no XP or level follows from it.
 *
 * Hardened 2026-11-14 (it now feeds the performance page and achievements): every number is bounded — perf 0–1,
 * stars whole 0–3, accuracy 0–100, times 0…1 hour, counts whole — a session needs a real time (not in the future, not
 * before 2024), sessions are kept in time order without duplicates, and anything else is dropped. A browser cannot make
 * a record that reads "100% accuracy, 0 ms, 999 sessions".
 */
const STAGES = ['easy', 'medium', 'hard', 'expert'];
const MAX_SESSIONS = 12;
const MAX_MS = 60 * 60 * 1000;
const EARLIEST_AT = Date.UTC(2024, 0, 1);
const n = (v, lo, hi) => (v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : null);
const whole = (v, lo, hi) => { const x = n(v, lo, hi); return x == null ? null : Math.floor(x); };
const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const cleanStats = (raw) => {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sessions)) return null;
  const latest = Date.now() + 60000;
  const seen = new Set();
  const sessions = raw.sessions.slice(-50).filter((s) => s && typeof s === 'object' && !Array.isArray(s)).map((s) => {
    const correct = whole(s.correct, 0, 999), wrong = whole(s.wrong, 0, 999);
    let accuracy = round2(n(s.accuracy, 0, 100));
    // Accuracy can never be better than the answers it came from.
    if (correct != null && wrong != null && correct + wrong > 0) accuracy = Math.min(accuracy ?? 100, round2((100 * correct) / (correct + wrong)));
    const ms = whole(s.ms, 0, MAX_MS), limitMs = whole(s.limitMs, 0, MAX_MS);
    const at = Number(s.at);
    return {
      at: Number.isFinite(at) && at >= EARLIEST_AT && at <= latest ? Math.floor(at) : null, stage: STAGES.includes(s.stage) ? s.stage : 'medium',
      stars: whole(s.stars, 0, 3) ?? 0, passed: s.passed === true, correct, wrong,
      hints: whole(s.hints, 0, 99) ?? 0, ms, limitMs, score: whole(s.score, 0, 1e7),
      difficulty: whole(s.difficulty, 1, 4), perf: round2(n(s.perf, 0, 1)) ?? 0, accuracy
    };
  }).filter((s) => {
    // A session without a believable time (none, before 2024, in the future) cannot be placed on a trend or a day; a
    // repeat of one already kept is noise.
    if (s.at == null) return false;
    const key = `${s.at}|${s.score}|${s.stars}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.at - b.at).slice(-MAX_SESSIONS);
  const bestAt = Number(raw.best?.at);
  const best = raw.best && typeof raw.best === 'object' && !Array.isArray(raw.best)
    ? {
      mark: n(raw.best.mark, 0, 1e7), score: whole(raw.best.score, 0, 1e7), accuracy: round2(n(raw.best.accuracy, 0, 100)),
      at: Number.isFinite(bestAt) && bestAt >= EARLIEST_AT && bestAt <= latest ? Math.floor(bestAt) : null
    }
    : null;
  return { stage: STAGES.includes(raw.stage) ? raw.stage : 'medium', sessions, best };
};

// @route GET /api/career/games/progress
// Every game the student has touched, for the hub to merge into its browser copy.
const getProgress = async (req, res) => {
  try {
    const docs = await GameProgress.find({ userId: req.user._id }).lean();
    res.json({ games: docs.map(shapeProgress) });
  } catch (error) {
    fail(res, error, 'load game progress');
  }
};

// @route POST /api/career/games/progress   { gameId, level, stars: { "1": 3, ... } }
// Merge the browser's record of one game into the account's. Only ever up.
//
// Games are scored in the browser, so nothing here can prove a level was
// really played. What the server can do is refuse records no honest browser
// produces, and make a forged one slow and unpaid:
//
//   - Only games the app ships are accepted (data/gameIds.js).
//   - A request may move a game at most ONE level past what the account
//     already holds. Stars are taken only on levels up to the stored level
//     plus one (and never past the level the browser itself claims), and the
//     level only climbs to one past the highest starred level. An honest
//     browser stars level N while on N, then moves to N+1, so ordinary play
//     always fits. A browser that is further ahead than the account — it
//     played offline, or a push failed — catches up one level per request.
//     The browser sends again while each answer still moves it (pushGame in
//     the student app's levels.js), so it gets there in a few requests
//     rather than one, and a forger gains nothing over honest play by it.
//   - Nothing moves, and nothing pays, until the server has counted some play
//     time today (GamePlayTime, from the page's heartbeat). A record arriving
//     without it is left in the browser, which sends it again with the next
//     push — so an honest student loses no XP, only waits for it.
//
// Each level's stars are raised with their own conditional update, which
// also hands back the value it replaced. Two saves racing on the same level
// therefore cannot both count the same stars: one raises 0 → 3, the other
// finds 3 already there and does nothing. The old read-merge-save let both
// insert a GameStarEvent, and two first saves of a new game collided on the
// unique index and answered 500.
const saveProgress = async (req, res) => {
  try {
    if (await require('../../games/orgHours').refuseIfClosed(req, res)) return;
    const userId = req.user._id;
    const gameId = String(req.body?.gameId || '').trim();
    if (!isGameId(gameId)) return res.status(400).json({ message: 'Unknown game' });

    // Age sections (2026-11-14): the registered class decides. A catalogue game in a section above the student's zone
    // is refused before anything is read or written; own and lower sections are open, and so are the classic games
    // outside the 84 (data/gameCatalog.js EXTRA), which belong to no age section. Class unknown: open (zoneAccess.js).
    const section = catalogGame(gameId)?.section;
    if (section) {
      const own = await effectiveZone(userId);
      if (!canPlay(accessFor(own.zone, section))) {
        return res.status(403).json({ message: 'This game is for an older class. Progress is saved for the games in your own zone and the ones below it.', zone: own.zone, section });
      }
    }

    const claimedLevel = Math.min(MAX_LEVEL, Math.max(1, Math.floor(Number(req.body?.level) || 1)));
    const incoming = cleanStars(req.body?.stars);

    const before = await GameProgress.findOne({ userId, gameId }).lean();
    const stored = before ? shapeProgress(before) : { gameId, level: 1, stars: {} };
    const storedLevel = Math.max(1, stored.level || 1);

    // The highest level this request may star, and the candidate gains on it.
    const topStarrable = Math.min(storedLevel + 1, claimedLevel);
    const candidates = Object.entries(incoming)
      .map(([key, stars]) => ({ level: Number(key), to: stars }))
      .filter((g) => g.level <= topStarrable && g.to > (stored.stars[String(g.level)] || 0))
      .sort((a, b) => a.level - b.level);

    // Where the level may move to: never past the claim, never more than one
    // step, and never past one beyond the highest level holding stars once
    // this request's stars are in.
    const starredLevels = [...Object.keys(stored.stars).map(Number), ...candidates.map((g) => g.level)];
    const topStarred = starredLevels.length ? Math.max(...starredLevels) : 0;
    const nextLevel = Math.max(storedLevel, Math.min(claimedLevel, storedLevel + 1, topStarred + 1));

    if (!candidates.length && nextLevel === storedLevel) {
      // A replay with no new best still records its session (the adaptive record feeds the performance page), on a
      // game the account already has. Nothing else moves and nothing pays.
      const replay = before ? cleanStats(req.body?.stats) : null;
      if (replay) {
        await GameProgress.updateOne({ _id: before._id }, { $set: { stats: replay } });
        return res.json({ ...stored, stats: replay, xpAwarded: 0 });
      }
      return res.json({ ...stored, xpAwarded: 0 });
    }

    const config = await getConfig();
    const time = await playState(userId, config);
    if (time.usedSeconds <= 0) {
      return res.json({ ...stored, xpAwarded: 0, deferred: 'no-play-time' });
    }

    const docId = await ensureProgressDoc(userId, gameId);

    // One conditional update per level: raise it only if it is below the new
    // best, and read back what it was. The answer — not the earlier read — is
    // what counts as the gain.
    const gains = [];
    for (const g of candidates) {
      const path = `stars.${g.level}`;
      const prior = await GameProgress.findOneAndUpdate(
        { _id: docId, $or: [{ [path]: { $exists: false } }, { [path]: { $lt: g.to } }] },
        { $set: { [path]: g.to } },
        { returnDocument: 'before', projection: { [path]: 1 } }
      ).lean();
      if (!prior) continue;
      const from = Number(prior.stars?.[String(g.level)]) || 0;
      gains.push({ level: g.level, from, to: g.to });
    }

    // The level, then the denormalised totals, computed by the database from
    // whatever the document holds now so a concurrent save cannot leave them
    // stale.
    await GameProgress.updateOne({ _id: docId }, { $max: { level: nextLevel } });
    await GameProgress.updateOne({ _id: docId }, [
      {
        $set: {
          starTotal: { $sum: { $map: { input: { $objectToArray: { $ifNull: ['$stars', {}] } }, in: '$$this.v' } } },
          cleared: { $subtract: ['$level', 1] }
        }
      }
    ], { updatePipeline: true });

    if (gains.length) {
      await GameStarEvent.insertMany(
        gains.map((g) => ({ userId, gameId, level: g.level, stars: g.to - g.from, first: g.from === 0 }))
      );
    }

    // XP for the stars just reached: the difference between the old best and
    // the new, keyed by game, level and stars so it is paid once. Not paid
    // once today's minutes are used up.
    let xpAwarded = 0;
    const withinLimit = !time.limitSeconds || time.usedSeconds < time.limitSeconds + GRACE_SECONDS;
    if (gains.length && withinLimit) {
      for (const g of gains) {
        const xp = xpForStars(config.games, g.to) - xpForStars(config.games, g.from);
        if (xp <= 0) continue;
        const r = await addXp({
          userId, amount: xp, source: 'game', refId: `${gameId}:${g.level}:${g.to}`, silent: true,
          description: `for ${g.to} star${g.to === 1 ? '' : 's'} on level ${g.level} of ${gameId.replace(/-/g, ' ')}`
        });
        if (r && !r.duplicate && !r.skipped && !r.missingUser) xpAwarded += xp;
      }
    }

    // The adaptive record, kept as sent (cleaned): the newest browser's copy wins.
    const stats = cleanStats(req.body?.stats);
    if (stats) await GameProgress.updateOne({ _id: docId }, { $set: { stats } });

    const after = await GameProgress.findById(docId).lean();
    res.json({ ...shapeProgress(after), xpAwarded });
  } catch (error) {
    fail(res, error, 'save game progress');
  }
};

/**
 * The id of this student's record for one game, creating it if need be.
 *
 * An upsert, so two first saves cannot both insert. Two upserts racing can
 * still both miss and both try to insert, and the loser gets a duplicate-key
 * error from the unique index — by then the winner's document exists, so
 * trying once more simply finds it.
 */
const ensureProgressDoc = async (userId, gameId) => {
  const upsert = () =>
    GameProgress.findOneAndUpdate(
      { userId, gameId },
      { $setOnInsert: { level: 1, stars: {}, starTotal: 0, cleared: 0 } },
      { upsert: true, returnDocument: 'after', projection: { _id: 1 } }
    ).lean();
  try {
    return (await upsert())._id;
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return (await upsert())._id;
  }
};

// The user ids a scope covers, or null for everyone. Mirrors the rewards board
// so "my institution" means the same thing on both.
const scopeUserIds = async (scope, me) => {
  if (scope === 'institution') {
    if (!me.institution) return [];
    return User.find({ institution: me.institution, status: 'active' }).distinct('_id');
  }
  if (scope === 'class') {
    if (!me.institution || !me.className) return [];
    return User.find({ institution: me.institution, className: me.className, status: 'active' }).distinct('_id');
  }
  return null;
};

/*
 * A fair board (2026-11-13). Ranking on raw stars let a student who stayed on the easiest levels outrank one doing
 * harder work, so the board ranks on points: every star counts its difficulty and the student's practice stage.
 *
 *   points = 10 × Σ stars × DIFFICULTY_WEIGHT[difficulty] × STAGE_WEIGHT[stage]
 *
 * The difficulty and stage come from the adaptive session recorded with the level (GameProgress.stats.sessions,
 * matched to the star event by game and time); without one, the level's own band (the student app's levels.js ladder,
 * mirrored in levelBand) and the game's current stage. And students are ranked against their own zone by default
 * (career/services/gameZone.js, from the class they gave in Career Path): a Class 2 student never faces a Class 12.
 */
const DIFFICULTY_WEIGHT = { 1: 1, 2: 1.3, 3: 1.6, 4: 1.9 };
const STAGE_WEIGHT = { easy: 0.8, medium: 1, hard: 1.15, expert: 1.3 };
const SESSION_MATCH_MS = 10 * 60 * 1000;

/** The difficulty band (1–3) a level plays at: the same roller-coaster ladder as the student app (levels.js pressure). */
const levelBand = (level) => {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(Number(level) || 1)));
  const episode = Math.floor((l - 1) / 15);
  const episodes = Math.ceil(MAX_LEVEL / 15) - 1;
  const p = Math.min(1, 0.75 * Math.pow(episode / episodes, 0.8) + ((l - 1) % 15) * 0.018);
  return Math.min(3, Math.floor(Math.round(p * 89) / 30) + 1);
};

/** How much one star is worth: its difficulty times the stage it was earned at. */
const starWeight = (difficulty, stage) =>
  (DIFFICULTY_WEIGHT[Math.min(4, Math.max(1, Math.round(Number(difficulty) || 1)))] || 1) * (STAGE_WEIGHT[stage] || 1);

/** The weight of one star event ({ level, createdAt }), given the game's adaptive stats. */
const eventWeight = (event, stats) => {
  const at = new Date(event.createdAt).getTime();
  const sessions = Array.isArray(stats?.sessions) ? stats.sessions : [];
  let match = null;
  for (const s of sessions) {
    if (!s || !(s.stars > 0) || !Number.isFinite(s.at)) continue;
    const gap = Math.abs(s.at - at);
    if (gap <= SESSION_MATCH_MS && (!match || gap < match.gap)) match = { gap, s };
  }
  if (match) return starWeight(match.s.difficulty || levelBand(event.level), match.s.stage);
  return starWeight(levelBand(event.level), stats?.stage);
};

/** All-time points of one game's record: every level's best stars at the level's band and the game's stage. */
const progressPoints = (stars, stage) => {
  const entries = stars instanceof Map ? [...stars.entries()] : Object.entries(stars || {});
  return entries.reduce((sum, [level, n]) => sum + (Number(n) || 0) * starWeight(levelBand(level), stage), 0);
};

const toPoints = (raw) => Math.round(raw * 10);

/** First name and last initial ("Asha R."): all a school leaderboard shows of anyone. */
const publicName = (name) => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'Student';
  const first = words[0][0].toUpperCase() + words[0].slice(1);
  return words.length > 1 ? `${first} ${words[words.length - 1][0].toUpperCase()}.` : first;
};

/** Ranked best first: points, then stars, then levels cleared. */
const sortRows = (rows) => rows.sort((a, b) => b.points - a.points || b.stars - a.stars || b.cleared - a.cleared || String(a.userId).localeCompare(String(b.userId)));

/** Everyone in a window, ranked: [{ userId, points, stars, cleared, games }]. */
const ranking = async ({ period, ids, offset = 0 }) => {
  if (ids && ids.length === 0) return [];

  if (period === 'all') {
    const match = { starTotal: { $gt: 0 } };
    if (ids) match.userId = { $in: ids };
    const docs = await GameProgress.find(match).select('userId gameId stars starTotal cleared stats.stage').lean();
    const by = new Map();
    for (const d of docs) {
      const k = String(d.userId);
      const r = by.get(k) || { userId: d.userId, points: 0, stars: 0, cleared: 0, games: 0 };
      r.points += progressPoints(d.stars, d.stats?.stage);
      r.stars += d.starTotal || 0;
      r.cleared += d.cleared || 0;
      r.games += 1;
      by.set(k, r);
    }
    return sortRows([...by.values()].map((r) => ({ ...r, points: toPoints(r.points) })));
  }

  const { start, end } = periodWindow(period, new Date(), offset);
  const match = { createdAt: { $gte: start, $lt: end } };
  if (ids) match.userId = { $in: ids };
  const events = await GameStarEvent.find(match).select('userId gameId level stars first createdAt').lean();
  if (!events.length) return [];
  const users = [...new Set(events.map((e) => String(e.userId)))];
  const progress = await GameProgress.find({ userId: { $in: users } }).select('userId gameId stats').lean();
  const statsBy = new Map(progress.map((p) => [`${p.userId}|${p.gameId}`, p.stats]));
  const by = new Map();
  for (const e of events) {
    const k = String(e.userId);
    const r = by.get(k) || { userId: e.userId, points: 0, stars: 0, cleared: 0, gameIds: new Set() };
    r.points += e.stars * eventWeight(e, statsBy.get(`${k}|${e.gameId}`));
    r.stars += e.stars;
    r.cleared += e.first ? 1 : 0;
    r.gameIds.add(e.gameId);
    by.set(k, r);
  }
  return sortRows([...by.values()].map(({ gameIds, ...r }) => ({ ...r, points: toPoints(r.points), games: gameIds.size })));
};

/** Each user's games zone, as held on the account (services/gameZone.js): Map(userId → zone or null). */
const zonesOf = (userIds) => effectiveZones(userIds);

const ZONE_KEYS = ['young', 'smart', 'master'];

// @route GET /api/career/games/leaderboard?period=weekly&scope=global&zone=mine|all|young|smart|master
// Ranked on difficulty-weighted points, against the student's own zone unless `zone=all`. Shows only first name and
// last initial, never ids or emails; the student's own row adds their rank and points in the previous period.
const getLeaderboard = async (req, res) => {
  try {
    const period = PERIODS.includes(req.query.period) ? req.query.period : 'weekly';
    const scope = SCOPES.includes(req.query.scope) ? req.query.scope : 'global';
    const me = req.user;
    const meId = String(me._id);

    const myZone = (await zonesOf([me._id])).get(meId);
    const asked = String(req.query.zone || 'mine');
    const zone = asked === 'all' ? null : ZONE_KEYS.includes(asked) ? asked : myZone;

    const ids = await scopeUserIds(scope, me);
    const inZone = async (rows) => {
      if (!zone || !rows.length) return rows;
      const zones = await zonesOf(rows.map((r) => r.userId));
      return rows.filter((r) => zones.get(String(r.userId)) === zone);
    };
    const rows = await inZone(await ranking({ period, ids }));
    const prev = period === 'all' ? null : await inZone(await ranking({ period, ids, offset: -1 }));

    const myIndex = rows.findIndex((r) => String(r.userId) === meId);
    const top = rows.slice(0, BOARD_SIZE);
    // The student's own row with a neighbour either side, when off the board.
    const around = myIndex >= BOARD_SIZE ? rows.slice(Math.max(BOARD_SIZE, myIndex - 1), myIndex + 2) : [];

    const users = await User.find({ _id: { $in: [...top, ...around].map((r) => r.userId) } }).select('name profilePicture').lean();
    const userBy = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const shape = (row, index) => {
      const isMe = String(row.userId) === meId;
      const u = userBy[String(row.userId)];
      return {
        rank: index + 1,
        name: publicName(u?.name),
        // Only the student's own picture: other students are a name and initials.
        profilePicture: isMe ? u?.profilePicture || '' : '',
        points: row.points,
        stars: row.stars,
        cleared: row.cleared,
        games: row.games,
        isMe
      };
    };

    const prevIndex = prev ? prev.findIndex((r) => String(r.userId) === meId) : -1;
    const mine = myIndex >= 0
      ? shape(rows[myIndex], myIndex)
      : { rank: null, name: publicName(me.name), profilePicture: me.profilePicture || '', points: 0, stars: 0, cleared: 0, games: 0, isMe: true };
    mine.improvement = prev
      ? {
        previousRank: prevIndex >= 0 ? prevIndex + 1 : null,
        previousPoints: prevIndex >= 0 ? prev[prevIndex].points : 0,
        pointsChange: mine.points - (prevIndex >= 0 ? prev[prevIndex].points : 0),
        // Positive: places climbed since the last period.
        rankChange: mine.rank && prevIndex >= 0 ? prevIndex + 1 - mine.rank : null
      }
      : null;

    res.json({
      period,
      scope,
      zone,
      myZone,
      rankedBy: 'points',
      periodKey: periodWindow(period).key,
      total: rows.length,
      entries: top.map(shape),
      around: around.map((r) => shape(r, rows.indexOf(r))),
      me: mine,
      // So the client can say why a cohort board is empty.
      cohort: { institution: me.institution || '', className: me.className || '' }
    });
  } catch (error) {
    fail(res, error, 'load the games leaderboard');
  }
};

/**
 * The student's Group games, from the Group Brain results (competitions/groupbrain): played, wins, podiums, recent.
 * Kept apart from the solo records on purpose: a group result never touches a solo personal best.
 */
const groupSummary = async (userId) => {
  const { totals, brainScore } = require('../../competitions/groupbrain/stats');
  const { engine } = require('../../competitions/games');
  const t = await totals(userId);
  const podium = (r) => r.won || r.draw || (r.place && r.place <= Math.min(3, Math.max(1, (r.players || 1) - 1)));
  const brain = brainScore(t.rows);
  return {
    played: t.played,
    wins: t.wins,
    draws: t.draws,
    podiums: t.rows.filter(podium).length,
    streak: t.streak,
    bestStreak: t.bestStreak,
    winRate: t.played ? Math.round((100 * t.wins) / t.played) : 0,
    bps: brain.bps,
    note: brain.note,
    recent: t.rows.slice(0, 5).map((r) => ({
      game: r.game, label: engine(r.game)?.label || r.game, emoji: engine(r.game)?.emoji || '🎮',
      place: r.place, players: r.players, won: r.won, draw: r.draw, score: r.score,
      accuracy: r.total ? Math.round((100 * r.correct) / r.total) : null, finishedAt: r.finishedAt
    })),
    // Oldest first, for the achievements' dates (not sent by /group-summary).
    finishedAt: t.rows.map((r) => r.finishedAt).reverse()
  };
};

// @route GET /api/career/games/group-summary
const getGroupSummary = async (req, res) => {
  try {
    const { finishedAt, ...out } = await groupSummary(req.user._id);
    res.json(out);
  } catch (error) {
    fail(res, error, 'load the group games summary');
  }
};

// @route GET /api/career/games/performance
// Game performance for My Progress: { zone, band, individual, group, achievements } (services/gamePerformance.js).
// Individual (solo) and group are computed from separate records and never mixed.
const getPerformance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { buildPerformance } = require('../services/gamePerformance');
    const [own, docs, events, group] = await Promise.all([
      effectiveZone(userId),
      GameProgress.find({ userId }).select('gameId level stars starTotal cleared stats updatedAt').lean(),
      GameStarEvent.find({ userId }).sort({ createdAt: 1, _id: 1 }).select('gameId level stars first createdAt').lean(),
      groupSummary(userId)
    ]);
    res.json(buildPerformance({ zone: own.zone, band: own.band, docs, events, group }));
  } catch (error) {
    fail(res, error, 'load game performance');
  }
};

// @route GET /api/career/games/time
// How much of today's play time is left, and what each star result pays.
const orgHours = require('../../games/orgHours');
const getPlayTime = async (req, res) => {
  try {
    const [state, organization] = await Promise.all([playState(req.user._id, await getConfig()), orgHours.statusFor(req.user).catch(() => ({ applies: false, open: true }))]);
    res.json({ ...state, organization });
  } catch (error) {
    fail(res, error, 'load play time');
  }
};

// @route POST /api/career/games/time   { seconds }
// A heartbeat while a game is open. Clamped to the time that actually passed.
const recordPlayTime = async (req, res) => {
  try {
    if (await orgHours.refuseIfClosed(req, res)) return;
    const userId = req.user._id;
    const day = dayKey();
    const now = new Date();
    const doc = await GamePlayTime.findOneAndUpdate(
      { userId, day },
      { $setOnInsert: { seconds: 0 } },
      { upsert: true, returnDocument: 'after' }
    );
    const sinceLast = doc.lastBeatAt ? (now - doc.lastBeatAt) / 1000 : MAX_BEAT_SECONDS;
    const claim = Math.max(0, Math.min(Number(req.body?.seconds) || 0, MAX_BEAT_SECONDS, sinceLast + 2));
    await GamePlayTime.updateOne({ _id: doc._id }, { $inc: { seconds: claim }, $set: { lastBeatAt: now } });
    res.json(await playState(userId, await getConfig()));
  } catch (error) {
    fail(res, error, 'record play time');
  }
};

/* ---- Group games: 30 minutes a day (2026-10-29) ----------------------- */

const GroupPlayTime = require('../models/GroupPlayTime');
const GROUP_LIMIT_SECONDS = 30 * 60;
/* Accounts with 2 hours a day instead (2026-11-02: Hari Kiran's card, 240100018860). More with GROUP_GAMES_LONG_TIME
   (card numbers, comma-separated). */
const LONG_LIMIT_SECONDS = 2 * 60 * 60;
// Bhagyashree's card (240100045056) added 2026-11-07.
const LONG_TIME = new Set(['240100018860', '240100045056', ...String(process.env.GROUP_GAMES_LONG_TIME || '').split(',').map((x) => x.trim()).filter(Boolean)]);
const groupLimitFor = async (userId) => {
  // The admin's setting (Rewards → Reward rules → Group games, 2026-11-04) is the limit for everyone; 0 = no limit
  // (a whole day). Since 2026-11-05 it comes first: the long-time accounts' fixed 2 hours used to override it, so an
  // admin's 7 hours still locked them at 2. Those accounts' 2 hours, and the 30-minute default, apply only while
  // the admin has set nothing.
  const cfg = await require('../../rewards/services/configService').getConfig().catch(() => null);
  const minutes = cfg?.games?.groupDailyMinutes;
  if (minutes != null && Number.isFinite(Number(minutes))) return Number(minutes) > 0 ? Math.round(Number(minutes) * 60) : 24 * 3600;
  const u = await require('../../models/User').findById(userId).select('cardNumber').lean();
  return u?.cardNumber && LONG_TIME.has(String(u.cardNumber)) ? LONG_LIMIT_SECONDS : GROUP_LIMIT_SECONDS;
};
/** "30 minutes", "2 hours": a day's allowance in words. */
const limitWords = (sec) => (sec % 3600 === 0 ? `${sec / 3600} hour${sec === 3600 ? '' : 's'}` : `${Math.round(sec / 60)} minutes`);

/** Today's Group games time: used, left, and when it comes back. */
const groupPlayState = async (userId) => {
  const day = dayKey();
  const [doc, limit] = await Promise.all([GroupPlayTime.findOne({ userId, day }).lean(), groupLimitFor(userId)]);
  const used = Math.round(doc?.seconds || 0);
  return {
    day,
    usedSeconds: used,
    limitSeconds: limit,
    remainingSeconds: Math.max(0, limit - used),
    resetsAt: startOfDay(addDays(day, 1))
  };
};

/** True when today's Group games time is used up (rooms and online tables then refuse). */
const groupTimeUp = async (userId) => (await groupPlayState(userId)).remainingSeconds <= 0
  || (await require('../../games/orgHours').statusFor(userId).then((s) => s.applies && !s.open).catch(() => false));
/** The refusal when it is: "Today's 2 hours of Group games are used up…". */
const groupTimeUpMessage = async (userId) => {
  const s = await require('../../games/orgHours').statusFor(userId).catch(() => null);
  if (s?.applies && !s.open) return require('../../games/orgHours').closedMessage(s);
  return `Today's ${limitWords(await groupLimitFor(userId))} of Group games are used up. Come back after midnight.`;
};

// @route GET /api/career/games/group-time
const getGroupPlayTime = async (req, res) => {
  try {
    res.json(await groupPlayState(req.user._id));
  } catch (error) {
    fail(res, error, 'load group play time');
  }
};

// @route POST /api/career/games/group-time   { seconds }
// A heartbeat while a group game is being played. Clamped to the time that actually passed.
const recordGroupPlayTime = async (req, res) => {
  try {
    if (await orgHours.refuseIfClosed(req, res)) return;
    const userId = req.user._id;
    const day = dayKey();
    const now = new Date();
    const doc = await GroupPlayTime.findOneAndUpdate(
      { userId, day },
      { $setOnInsert: { seconds: 0 } },
      { upsert: true, returnDocument: 'after' }
    );
    const sinceLast = doc.lastBeatAt ? (now - doc.lastBeatAt) / 1000 : MAX_BEAT_SECONDS;
    const claim = Math.max(0, Math.min(Number(req.body?.seconds) || 0, MAX_BEAT_SECONDS, sinceLast + 2));
    await GroupPlayTime.updateOne({ _id: doc._id }, { $inc: { seconds: claim }, $set: { lastBeatAt: now } });
    res.json(await groupPlayState(userId));
  } catch (error) {
    fail(res, error, 'record group play time');
  }
};

module.exports = {
  getProgress, saveProgress, getLeaderboard, getGroupSummary, getPerformance, cleanStats, getPlayTime, recordPlayTime, getGroupPlayTime, recordGroupPlayTime, groupTimeUp, groupTimeUpMessage, PERIODS, SCOPES,
  // The fair board's rules, for the tests.
  levelBand, starWeight, eventWeight, progressPoints, publicName, DIFFICULTY_WEIGHT, STAGE_WEIGHT
};
