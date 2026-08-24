/**
 * @description Career Path re-uses the LMS student account rather than keeping
 *              a second one.
 *
 * FuturePath shipped with its own User collection and its own sign-in. Inside
 * the LMS there is already exactly one student identity — the card number the
 * student logs in with — so this file exists only so the ported controllers and
 * services can keep saying `require('../models/User')` and get that identity.
 *
 * The XP, level, streak and daily-time-budget fields those files read and write
 * live on the LMS user schema (see ../../models/User.js).
 */
module.exports = require('../../models/User');
