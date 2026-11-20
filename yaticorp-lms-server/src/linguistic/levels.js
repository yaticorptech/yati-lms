/**
 * Linguistic Ability — the sections the course shows (2026-10-29, user: "remove the intermediate section now, only
 * keep basic and advanced level section; if intermediate section is needed I will inform you"). Intermediate's
 * lessons stay in the database, only hidden: to bring the section back, take it out of HIDDEN.
 *
 * Between two sections shown, the first ends with an assessment (reviews.js 'assessment'): the next one opens only
 * when it is passed (service.js `access`).
 */
const { LEVELS: ALL } = require('./models');

// Intermediate shown again (2026-11-14, the user chose to bring it back when asking for more sections).
const HIDDEN = [];
/** The sections whose lessons are the written content (content/, reviews.js): their reviews, assessments and entry tests. */
const CONTENT_LEVELS = ['beginner', 'intermediate', 'advanced'];
/** Each section's name on certificates, tests and badges. */
// Two parts only (2026-11-18, the user: "in the 10 sections divide the two parts only, don't give Intermediate and Elementary"):
// Sections 1–3 Beginner, Sections 4–10 Advanced, as the student app groups them (2026-11-16); after the first of its part,
// a section is named with its number, so two never read the same ("Beginner (Section 3) assessment").
const LEVEL_LABEL = { beginner: 'Beginner', elementary: 'Beginner (Section 2)', intermediate: 'Beginner (Section 3)', advanced: 'Advanced', professional: 'Advanced (Section 5)',
    everyday: 'Advanced (Section 6)', services: 'Advanced (Section 7)', workplace: 'Advanced (Section 8)', opinions: 'Advanced (Section 9)', society: 'Advanced (Section 10)' };
/*
 * Daily life and Intermediate (2026-11-14) come before Advanced now: a student who reached Advanced before then — who
 * finished Beginner, which opened it — keeps it open (service.js `access`); one who finished Beginner and Advanced
 * keeps their course finished.
 */
const LEGACY_CUTOFF = new Date('2026-11-14T00:00:00.000Z');
const LEGACY_SHOWN = ['beginner', 'advanced'];
const SHOWN = ALL.filter((l) => !HIDDEN.includes(l));
/** The section shown after `level`, or null for the last. */
const nextShown = (level) => (SHOWN.includes(level) ? SHOWN[SHOWN.indexOf(level) + 1] || null : null);
/** The pass mark of a section's assessment, in per cent (2026-10-29: 80, chosen by the user; then 50, "consider score 50%"). */
const ASSESSMENT_PASS = 50;

module.exports = { ALL, HIDDEN, SHOWN, nextShown, ASSESSMENT_PASS, CONTENT_LEVELS, LEVEL_LABEL, LEGACY_CUTOFF, LEGACY_SHOWN };
