/**
 * What a finished competition gives its players: the prize for 1st, 2nd and
 * 3rd (XP and reward points, to every player of the team), XP for taking
 * part, and a notification. Certificates are drawn on request (./certificate.js).
 *
 * Safe to run more than once: each payment carries a key unique to the
 * competition, the place and the student, and the rewards ledger refuses a
 * second row with the same key.
 */
const Team = require('../models/Team');
const Competition = require('../models/Competition');

const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' };

const award = async (competition) => {
    const { addXp } = require('../../rewards/services/xpService');
    const { awardPoints } = require('../../rewards/services/rewardPointsService');
    const { notify } = require('../../rewards/services/notify');
    const teams = await Team.find({ competitionId: competition._id, status: 'approved' }).lean();
    const id = String(competition._id);

    for (const team of teams) {
        const place = competition.winners.find((w) => String(w.teamId) === String(team._id))?.place || null;
        const prize = place ? competition.prizes.find((p) => p.place === place) : null;
        for (const player of team.players) {
            const userId = player.userId;
            if (prize?.xp > 0) {
                await addXp({ userId, amount: prize.xp, source: 'competition', refId: `${id}:place`, description: `for ${ORDINAL[place]} place in ${competition.name}`, silent: true });
            }
            if (prize?.rewardPoints > 0) {
                await awardPoints({ userId, points: prize.rewardPoints, source: 'competition', claimKey: `competition:${id}:place`, description: `${ORDINAL[place]} place in ${competition.name}`, meta: { competitionId: id, place }, quiet: true });
            }
            if (competition.participationXp > 0) {
                await addXp({ userId, amount: competition.participationXp, source: 'competition', refId: `${id}:participation`, description: `for taking part in ${competition.name}`, silent: true });
            }
            const won = place ? `${team.teamName} finished ${ORDINAL[place]}${prize?.title ? ` — ${prize.title}` : ''}.` : `${competition.name} is over. Thank you for playing for ${team.teamName}.`;
            const extras = [prize?.xp ? `+${prize.xp} XP` : '', prize?.rewardPoints ? `+${prize.rewardPoints} reward points` : '', competition.participationXp ? `+${competition.participationXp} XP for taking part` : '']
                .filter(Boolean).join(', ');
            const cert = require('./certificate').eligible(competition, { place }) ? ' Your certificate is ready in Games & Competitions.' : '';
            await notify(userId, place ? `🏆 ${ORDINAL[place]} place!` : 'Competition complete', `${won}${extras ? ` ${extras}.` : ''}${cert}`);
        }
    }
    await Competition.updateOne({ _id: competition._id }, { $set: { awardedAt: new Date() } });
};

module.exports = { award, ORDINAL };
