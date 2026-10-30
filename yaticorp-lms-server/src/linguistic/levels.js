/**
 * Linguistic Ability — the sections the course shows (2026-10-29, user: "remove the intermediate section now, only
 * keep basic and advanced level section; if intermediate section is needed I will inform you"). Intermediate's
 * lessons stay in the database, only hidden: to bring the section back, take it out of HIDDEN.
 *
 * Between two sections shown, the first ends with an assessment (reviews.js 'assessment'): the next one opens only
 * when it is passed (service.js `access`).
 */
const { LEVELS: ALL } = require('./models');

const HIDDEN = ['intermediate'];
const SHOWN = ALL.filter((l) => !HIDDEN.includes(l));
/** The section shown after `level`, or null for the last. */
const nextShown = (level) => (SHOWN.includes(level) ? SHOWN[SHOWN.indexOf(level) + 1] || null : null);
/** The pass mark of a section's assessment, in per cent (2026-10-29: 80, chosen by the user; then 50, "consider score 50%"). */
const ASSESSMENT_PASS = 50;

module.exports = { ALL, HIDDEN, SHOWN, nextShown, ASSESSMENT_PASS };
