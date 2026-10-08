/**
 * Find, and with --apply undo, brain-game progress no real game could have
 * produced.
 *
 * Until 2026-10 POST /api/career/games/progress believed whatever it was sent:
 * any slug was a "game", any of ninety levels could be starred in one request,
 * and each star paid XP. The route is strict now (see saveProgress in
 * src/career/controllers/gameController.js), but records written before that
 * are still in the database. This finds the ones that are impossible on their
 * face:
 *
 *   1. Progress on a game id the app does not ship (src/career/data/gameIds.js).
 *      The whole record goes, with its star events.
 *   2. Stars on a level above the record's own level + 1. A student stars the
 *      level they are on and then moves up, so a star two or more levels
 *      above where they stand was never earned by playing. Those levels go.
 *   3. A level more than one above the highest starred level (moving up needs
 *      a cleared level). Reported, and on --apply lowered to that point.
 *
 * And for each, the XP it paid: ledger rows in rewards_xp_transactions with
 * source 'game', whose refId is `${gameId}:${level}:${stars}` (written by
 * addXp from saveProgress). The ledger is append-only, so a row is never
 * deleted: --apply writes a reversing row (source 'game_reversal', a negative
 * amount, keyed so a second run cannot reverse it twice) and takes the XP off
 * the student's balance, recomputing their level. XP that the wallet already
 * converted into money is NOT clawed back from the wallet — that is reported
 * per student, for an administrator to decide.
 *
 * Records a forger built slowly enough to look sequential cannot be told
 * apart from real play here, and are left alone.
 *
 *   node scripts/repairForgedGameProgress.js           # dry run: report only
 *   node scripts/repairForgedGameProgress.js --apply   # remove and reverse
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

const { connectDB } = require('../src/config/db');
const GameProgress = require('../src/career/models/GameProgress');
const GameStarEvent = require('../src/career/models/GameStarEvent');
const XpTransaction = require('../src/rewards/models/XpTransaction');
const User = require('../src/models/User');
const { levelFor, getConfig } = require('../src/rewards/services/configService');
const { isGameId } = require('../src/career/data/gameIds');

const starsOf = (doc) => (doc.stars instanceof Map ? Object.fromEntries(doc.stars) : doc.stars || {});

/** `memory-match:12:3` → { gameId: 'memory-match', level: 12, stars: 3 }. */
const parseRef = (refId) => {
  const m = /^(.+):(\d+):(\d+)$/.exec(String(refId || ''));
  return m ? { gameId: m[1], level: Number(m[2]), stars: Number(m[3]) } : null;
};

const main = async () => {
  await connectDB();
  console.log(APPLY ? 'APPLYING repairs.\n' : 'Dry run — nothing is changed. Pass --apply to repair.\n');

  // Per student: which game levels are forged ("*" = the whole game).
  const forged = new Map(); // userId → Map(gameId → Set(level) | '*')
  const mark = (userId, gameId, level) => {
    const u = String(userId);
    if (!forged.has(u)) forged.set(u, new Map());
    const games = forged.get(u);
    if (level === '*') return games.set(gameId, '*');
    if (games.get(gameId) === '*') return;
    if (!games.has(gameId)) games.set(gameId, new Set());
    games.get(gameId).add(level);
  };

  const unknownDocs = [];
  const starFixes = []; // { doc, levels: [..] }
  const levelFixes = []; // { doc, to }

  for await (const doc of GameProgress.find({}).lean().cursor()) {
    if (!isGameId(doc.gameId)) {
      unknownDocs.push(doc);
      mark(doc.userId, doc.gameId, '*');
      continue;
    }
    const stars = starsOf(doc);
    const level = Math.max(1, doc.level || 1);
    const bad = Object.keys(stars).map(Number).filter((n) => n > level + 1).sort((a, b) => a - b);
    if (bad.length) {
      starFixes.push({ doc, levels: bad });
      bad.forEach((n) => mark(doc.userId, doc.gameId, n));
    }
    const kept = Object.keys(stars).map(Number).filter((n) => n <= level + 1);
    const top = kept.length ? Math.max(...kept) : 0;
    if (level > top + 1) levelFixes.push({ doc, to: top + 1 });
  }

  // The XP those paid: rows on a forged game, or on a forged level of a real one.
  // Also any game XP on an id the app does not ship, even with no record left.
  const xpRows = [];
  for await (const row of XpTransaction.find({ source: 'game' }).lean().cursor()) {
    const ref = parseRef(row.refId);
    if (!ref) continue;
    const games = forged.get(String(row.userId));
    const entry = games?.get(ref.gameId);
    if (!isGameId(ref.gameId) || entry === '*' || (entry instanceof Set && entry.has(ref.level))) xpRows.push(row);
  }
  const alreadyReversed = new Set(
    (await XpTransaction.find({ source: 'game_reversal' }).select('key').lean()).map((r) => r.key)
  );
  const toReverse = xpRows.filter((r) => !alreadyReversed.has(`game_reversal:${r._id}`));

  // ---- Report ------------------------------------------------------------
  const names = new Map(
    (await User.find({ _id: { $in: [...forged.keys(), ...levelFixes.map((f) => String(f.doc.userId))] } }).select('name email').lean())
      .map((u) => [String(u._id), `${u.name || 'Student'} <${u.email || '?'}>`])
  );
  const who = (id) => names.get(String(id)) || String(id);

  console.log(`1. Progress on games the app does not ship: ${unknownDocs.length}`);
  for (const d of unknownDocs) console.log(`   - ${who(d.userId)}  "${d.gameId}"  level ${d.level}, ${d.starTotal || 0} stars`);
  console.log(`\n2. Stars on levels above the record's level + 1: ${starFixes.length} record(s)`);
  for (const f of starFixes) console.log(`   - ${who(f.doc.userId)}  ${f.doc.gameId} (level ${f.doc.level}): levels ${f.levels.join(', ')}`);
  console.log(`\n3. Level more than one above the highest starred level: ${levelFixes.length} record(s)`);
  for (const f of levelFixes) console.log(`   - ${who(f.doc.userId)}  ${f.doc.gameId}: level ${f.doc.level} → ${f.to}`);

  const xpByUser = new Map();
  for (const r of toReverse) xpByUser.set(String(r.userId), (xpByUser.get(String(r.userId)) || 0) + r.amount);
  console.log(`\nXP ledger rows (source 'game') paid for the above: ${xpRows.length}, ${toReverse.length} not yet reversed, ${toReverse.reduce((n, r) => n + r.amount, 0)} XP`);
  for (const r of toReverse) console.log(`   - ${who(r.userId)}  ${r.refId}  ${r.amount} XP  (${r.createdAt?.toISOString?.() || ''})`);
  for (const [u, xp] of xpByUser) console.log(`   = ${who(u)}: ${xp} XP to take back`);

  if (!APPLY) {
    console.log('\nDry run complete. Nothing was changed.');
    return;
  }

  // ---- Apply -------------------------------------------------------------
  for (const d of unknownDocs) {
    await GameStarEvent.deleteMany({ userId: d.userId, gameId: d.gameId });
    await GameProgress.deleteOne({ _id: d._id });
  }
  for (const f of starFixes) {
    const unset = Object.fromEntries(f.levels.map((n) => [`stars.${n}`, '']));
    await GameProgress.updateOne({ _id: f.doc._id }, { $unset: unset });
    await GameStarEvent.deleteMany({ userId: f.doc.userId, gameId: f.doc.gameId, level: { $in: f.levels } });
  }
  for (const f of levelFixes) await GameProgress.updateOne({ _id: f.doc._id }, { $set: { level: f.to } });
  // Totals recomputed from what each touched record now holds.
  const touched = [...starFixes, ...levelFixes].map((f) => f.doc._id);
  if (touched.length) {
    await GameProgress.updateMany({ _id: { $in: touched } }, [
      {
        $set: {
          starTotal: { $sum: { $map: { input: { $objectToArray: { $ifNull: ['$stars', {}] } }, in: '$$this.v' } } },
          cleared: { $subtract: ['$level', 1] }
        }
      }
    ], { updatePipeline: true });
  }

  const config = await getConfig();
  for (const r of toReverse) {
    try {
      await XpTransaction.create({
        userId: r.userId, amount: -r.amount, source: 'game_reversal', refId: r.refId, key: `game_reversal:${r._id}`,
        description: `reversed: XP for a brain-game record no real game produced (${r.refId})`
      });
    } catch (error) {
      if (error?.code === 11000) continue; // reversed by an earlier run
      throw error;
    }
    const user = await User.findByIdAndUpdate(r.userId, { $inc: { xp: -r.amount } }, { returnDocument: 'after', select: 'xp level' });
    if (!user) continue;
    if (user.xp < 0) await User.updateOne({ _id: r.userId }, { $set: { xp: 0 } });
    const level = levelFor(Math.max(0, user.xp), config.levelThresholds);
    if (level !== user.level) await User.updateOne({ _id: r.userId }, { $set: { level } });
  }
  console.log('\nApplied. Note: XP the wallet had already converted into money was not taken back from any wallet.');
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
