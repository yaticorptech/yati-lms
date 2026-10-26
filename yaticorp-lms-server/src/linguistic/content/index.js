/**
 * Linguistic Ability — all predefined content: the lessons the section is
 * seeded with (seed.js copies them into the database once, where admins edit
 * them) and the placement test, which stays here.
 */
const lessons = [
    ...require('./vocabulary'),
    ...require('./grammar'),
    ...require('./reading'),
    ...require('./speaking'),
    ...require('./translation'),
    // The topics added later, one more per level (topics/).
    ...require('./topics').lessons
];

module.exports = { lessons, placement: require('./placement') };
