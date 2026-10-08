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

const MAX_LEVEL = 90;
const MAX_STARS = 3;
const PERIODS = ['daily', 'weekly', 'monthly', 'all'];
const SCOPES = ['global', 'institution', 'class'];
const BOARD_SIZE = 10;

const fail = (res, error, what) => {
  console.error(`[career/games] ${what}:`, error);
  res.status(500).json({ message: `Could not ${what}` });
};

/** Tidy an incoming stars object: level keys 1…90, values 0…3, whole numbers. */
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
  stars: doc.stars instanceof Map ? Object.fromEntries(doc.stars) : doc.stars || {}
});

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
    const userId = req.user._id;
    const gameId = String(req.body?.gameId || '').trim();
    if (!isGameId(gameId)) return res.status(400).json({ message: 'Unknown game' });

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

/** Everyone ranked, best first: [{ userId, stars, cleared, games }]. */
const ranking = async ({ period, scope, me }) => {
  const ids = await scopeUserIds(scope, me);
  if (ids && ids.length === 0) return [];

  if (period === 'all') {
    const match = { starTotal: { $gt: 0 } };
    if (ids) match.userId = { $in: ids };
    return GameProgress.aggregate([
      { $match: match },
      { $group: { _id: '$userId', stars: { $sum: '$starTotal' }, cleared: { $sum: '$cleared' }, games: { $sum: 1 } } },
      { $sort: { stars: -1, cleared: -1, _id: 1 } },
      { $project: { _id: 0, userId: '$_id', stars: 1, cleared: 1, games: 1 } }
    ]);
  }

  const { start, end } = periodWindow(period);
  const match = { createdAt: { $gte: start, $lt: end } };
  if (ids) match.userId = { $in: ids };
  return GameStarEvent.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$userId',
        stars: { $sum: '$stars' },
        cleared: { $sum: { $cond: ['$first', 1, 0] } },
        gameIds: { $addToSet: '$gameId' }
      }
    },
    { $project: { _id: 0, userId: '$_id', stars: 1, cleared: 1, games: { $size: '$gameIds' } } },
    { $sort: { stars: -1, cleared: -1, userId: 1 } }
  ]);
};

// @route GET /api/career/games/leaderboard?period=weekly&scope=global
const getLeaderboard = async (req, res) => {
  try {
    const period = PERIODS.includes(req.query.period) ? req.query.period : 'weekly';
    const scope = SCOPES.includes(req.query.scope) ? req.query.scope : 'global';
    const me = req.user;
    const meId = String(me._id);

    const rows = await ranking({ period, scope, me });
    const myIndex = rows.findIndex((r) => String(r.userId) === meId);
    const top = rows.slice(0, BOARD_SIZE);
    // The student's own row with a neighbour either side, when off the board.
    const around = myIndex >= BOARD_SIZE ? rows.slice(Math.max(BOARD_SIZE, myIndex - 1), myIndex + 2) : [];

    const userIds = [...top, ...around].map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name profilePicture institution className').lean();
    const userBy = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const shape = (row, index) => {
      const u = userBy[String(row.userId)];
      return {
        rank: index + 1,
        userId: row.userId,
        name: u?.name || 'Student',
        profilePicture: u?.profilePicture || '',
        stars: row.stars,
        cleared: row.cleared,
        games: row.games,
        isMe: String(row.userId) === meId
      };
    };

    res.json({
      period,
      scope,
      periodKey: periodWindow(period).key,
      total: rows.length,
      entries: top.map(shape),
      around: around.map((r) => shape(r, rows.indexOf(r))),
      me:
        myIndex >= 0
          ? shape(rows[myIndex], myIndex)
          : { rank: null, userId: me._id, name: me.name, profilePicture: me.profilePicture || '', stars: 0, cleared: 0, games: 0, isMe: true },
      // So the client can say why a cohort board is empty.
      cohort: { institution: me.institution || '', className: me.className || '' }
    });
  } catch (error) {
    fail(res, error, 'load the games leaderboard');
  }
};

// @route GET /api/career/games/time
// How much of today's play time is left, and what each star result pays.
const getPlayTime = async (req, res) => {
  try {
    res.json(await playState(req.user._id, await getConfig()));
  } catch (error) {
    fail(res, error, 'load play time');
  }
};

// @route POST /api/career/games/time   { seconds }
// A heartbeat while a game is open. Clamped to the time that actually passed.
const recordPlayTime = async (req, res) => {
  try {
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

module.exports = { getProgress, saveProgress, getLeaderboard, getPlayTime, recordPlayTime, PERIODS, SCOPES };
