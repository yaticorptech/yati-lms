/**
 * The bridge from "skills you still need" to "we teach that".
 *
 * The gap card names the skills between a student and the role they want, and
 * used to stop there — which hands the student to YouTube at exactly the moment
 * the LMS has something to teach. This matches gap skills against the published
 * course catalogue so the card can link each one to a course.
 *
 * Matching is deliberately conservative. A wrong "we teach this" link costs
 * more than a missing one: it sends a student into a course that does not
 * cover what they came for, and takes the card's credibility with it. So:
 *
 *   - only published courses are searched;
 *   - a skill under three characters is never matched at all ("R", "C", "Go"
 *     appear inside too many unrelated words to trust containment);
 *   - word-boundary matching wherever the skill is plain words, so "Java"
 *     does not claim a JavaScript course; a skill with symbols in it (C++,
 *     C#, Node.js) falls back to literal containment, which for those
 *     spellings is precise anyway.
 */
const Course = require('../../models/Course');
const { isConnected } = require('../config/db');

// The catalogue is small and changes rarely; one query per five minutes is
// plenty, and keeps this decoration from taxing every search.
const TTL_MS = 5 * 60 * 1000;
let cached = null;
let cachedAt = 0;

const publishedCourses = async () => {
    if (cached && Date.now() - cachedAt < TTL_MS) return cached;
    const rows = await Course.find({ isPublished: true }).select('title description').lean();
    cached = rows.map((c) => ({
        id: c._id.toString(),
        title: c.title || '',
        haystack: `${c.title || ''} ${c.description || ''}`.toLowerCase()
    }));
    cachedAt = Date.now();
    return cached;
};

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matches = (haystack, skill) => {
    const needle = skill.toLowerCase();
    // Plain words get boundaries; anything with symbols is matched literally.
    if (/^[a-z0-9]+(?: [a-z0-9]+)*$/.test(needle)) {
        return new RegExp(`\\b${escapeRx(needle)}\\b`, 'i').test(haystack);
    }
    return haystack.includes(needle);
};

/**
 * Which published courses teach which of these skills.
 *
 * Returns a flat list — [{ skill, courseId, title }] — capped at two courses
 * per skill so one broad course title cannot fill the card. Empty array on any
 * failure: this is decoration on the gap, and a database hiccup here must
 * never cost the student their search results.
 */
const coursesForSkills = async (skills = []) => {
    try {
        if (!isConnected() || !skills.length) return [];
        const catalogue = await publishedCourses();
        if (!catalogue.length) return [];

        const out = [];
        for (const skill of [...new Set(skills)].slice(0, 20)) {
            if (String(skill).trim().length < 3) continue;
            let found = 0;
            for (const course of catalogue) {
                if (found >= 2) break;
                if (matches(course.haystack, String(skill))) {
                    out.push({ skill, courseId: course.id, title: course.title });
                    found++;
                }
            }
        }
        return out;
    } catch {
        return [];
    }
};

const invalidateCourseCache = () => { cached = null; cachedAt = 0; };

module.exports = { coursesForSkills, invalidateCourseCache };
