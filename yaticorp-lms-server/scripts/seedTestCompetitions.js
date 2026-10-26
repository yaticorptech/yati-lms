/**
 * Test competitions — one each of Chess, Rapid Fire, Code Clash and Brain
 * Sprint — to try them end to end.
 *
 * Each is live with one match, two teams of one player: two test students
 * from two colleges. The match waits with no time set; open it with Start on
 * the match in the admin panel (Competitions → the competition), or pass
 * --start to open every one now. Once open, both players have 10 minutes to
 * join, so sign in as each in two browsers (one in a private window).
 *
 * Re-running replaces them. Everything made here is named "[TEST]", and the
 * students sign in with the card numbers and password printed at the end.
 *
 *   node scripts/seedTestCompetitions.js            # create or replace them
 *   node scripts/seedTestCompetitions.js --start    # …and open the matches now
 *   node scripts/seedTestCompetitions.js --game chess   # only that game's
 *                                                   # (the others are left alone)
 *   node scripts/seedTestCompetitions.js --remove   # delete them all again
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Competition = require('../src/competitions/models/Competition');
const Team = require('../src/competitions/models/Team');
const Match = require('../src/competitions/models/Match');
const PlayGame = require('../src/competitions/models/PlayGame');

const START = process.argv.includes('--start');
const REMOVE = process.argv.includes('--remove');
const ONLY = process.argv.includes('--game') ? process.argv[process.argv.indexOf('--game') + 1] : null;
const PASSWORD = 'Test@1234';
const PLAYERS = [
    { cardNumber: '999900000001', name: 'Test Player One', email: 'test.player1@yaticorp-test.invalid' },
    { cardNumber: '999900000002', name: 'Test Player Two', email: 'test.player2@yaticorp-test.invalid' }
];
const GAMES = [
    ['chess', 'Chess'],
    ['rapidfire', 'Rapid Fire'],
    ['codeclash', 'Code Clash'],
    ['brainsprint', 'Brain Sprint']
];

const removeOld = async () => {
    const old = await Competition.find({ name: /^\[TEST\] /, ...(ONLY ? { game: ONLY } : {}) }).select('_id').lean();
    const ids = old.map((c) => c._id);
    await Promise.all([
        PlayGame.deleteMany({ competitionId: { $in: ids } }),
        Match.deleteMany({ competitionId: { $in: ids } }),
        Team.deleteMany({ competitionId: { $in: ids } }),
        Competition.deleteMany({ _id: { $in: ids } })
    ]);
    return ids.length;
};

const main = async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const removed = await removeOld();
    if (REMOVE) {
        await User.deleteMany({ cardNumber: { $in: PLAYERS.map((p) => p.cardNumber) } });
        console.log(`Removed ${removed} test competitions and the two test students.`);
        return;
    }

    // Two active colleges, one for each player: real ones, not those the test
    // suite makes and names with a timestamp.
    const orgs = await mongoose.connection.db.collection('organizations')
        .find({ status: 'active', name: { $not: /\d{8,}$/ } }).project({ name: 1 }).sort({ _id: -1 }).limit(2).toArray();
    if (orgs.length < 2) throw new Error('Two active organizations are needed (one per test player).');

    const users = [];
    for (const [i, p] of PLAYERS.entries()) {
        let user = await User.findOne({ cardNumber: p.cardNumber });
        if (!user) user = new User({ ...p, phone: `90000000${i + 1}0` });
        Object.assign(user, { name: p.name, status: 'active', organizationId: orgs[i]._id, password: PASSWORD });
        await user.save({ validateBeforeSave: false });
        users.push(user);
    }

    const now = Date.now();
    const chosen = GAMES.filter(([game]) => !ONLY || game === ONLY);
    if (!chosen.length) throw new Error(`No such game: ${ONLY}. One of ${GAMES.map(([g]) => g).join(', ')}.`);
    for (const [game, label] of chosen) {
        const competition = await Competition.create({
            name: `[TEST] ${label}`,
            organizedBy: 'YATICORP',
            description: `A test ${label} competition, made by scripts/seedTestCompetitions.js.`,
            game,
            startsAt: new Date(now),
            registrationDeadline: new Date(now - 60 * 60 * 1000),
            maxTeams: 2, playersPerTeam: 1, playersPerSide: 1, teamsPerMatch: 2,
            gameOptions: game === 'chess' ? { clockMinutes: 10 } : {},
            rules: 'A test competition.',
            prizes: [{ place: 1, title: 'Winner', xp: 10, rewardPoints: 0 }],
            participationXp: 0, certificates: false, participationCertificates: false,
            status: 'live'
        });
        const teams = await Team.insertMany(users.map((u, i) => ({
            competitionId: competition._id,
            organizationId: orgs[i]._id,
            collegeName: orgs[i].name,
            teamName: `Test Team ${i + 1}`,
            players: [{ userId: u._id, name: u.name }],
            status: 'approved',
            reviewedAt: new Date()
        })));
        const match = await Match.create({
            competitionId: competition._id, round: 0, roundName: 'Final', slot: 0, kind: 'main',
            sides: teams.map((t) => ({ teamId: t._id, lineup: [] })),
            scheduledAt: null, status: 'scheduled'
        });
        if (START) await require('../src/competitions/services/bracketService').openMatch(match);
        console.log(`  ${competition.name}  (${START ? 'match open now: join within 10 minutes' : 'press Start on its match in the admin panel'})`);
    }

    console.log(`\nTest students (password ${PASSWORD}):`);
    users.forEach((u, i) => console.log(`  ${u.name}: card number ${u.cardNumber}  (${orgs[i].name})`));
};

main()
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => setTimeout(() => mongoose.disconnect(), START ? 2000 : 0));
