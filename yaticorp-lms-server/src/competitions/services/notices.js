/**
 * What Games & Competitions tells its players, in the student's bell.
 *
 * Every notice is written through the rewards module's notify() as type
 * 'competition', so the bell labels it "Competitions" and it is shown whether
 * or not Career Path is switched on; and it opens the competition it is about,
 * not the Games page in general. A player is told once per event, even when a
 * list names them twice.
 */
const { TIMEZONE } = require('../../rewards/config/constants');

const linkTo = (competition) => (competition?._id ? `/competitions/${competition._id}` : '/competitions');

/** "Tue, 14 Oct, 4:30 pm" on the platform's clock, or null. */
const when = (date) => (date
    ? new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(date))
    : null);

const playersOf = (teams) => (teams || []).flatMap((t) => (t?.players || []).map((p) => p.userId)).filter(Boolean);

const tell = async (userIds, competition, title, message, { link } = {}) => {
    const { notify } = require('../../rewards/services/notify');
    const told = new Set();
    for (const id of userIds || []) {
        const key = String(id);
        if (!id || told.has(key)) continue;
        told.add(key);
        await notify(id, title, message, link || linkTo(competition), 'competition');
    }
};

const tellTeams = (teams, competition, title, message, opts) => tell(playersOf(teams), competition, title, message, opts);

module.exports = { tell, tellTeams, playersOf, linkTo, when };
