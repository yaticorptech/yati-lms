/**
 * Linguistic Ability — the certificate as a PDF. Issued only when a part is complete under the configured
 * criteria (service.checkLevel: Beginner = Sections 1–3, Advanced = Sections 4–10); this only draws one that
 * has been issued.
 *
 * The same template as a course certificate (2026-11-18, the user: "put the template same as the course
 * certificate"): controllers/certificateController drawCoursePdf — the number, the name, what was completed and the
 * date on public/assets/cert_template.jpg.
 */
const { LEVEL_LABEL: LEVEL } = require('./levels');

/** What the certificate says was completed: "English Language Learning – Beginner Level". */
// (A long name — Malayalam, Portuguese — without "Learning", so it stays on one line of the template.)
const titleOf = (level, courseName = 'English') => `${courseName} Language${String(courseName).length > 8 ? '' : ' Learning'} – ${LEVEL[level] || level} Level`;

const draw = (res, { name, level, number, issuedAt, courseName = 'English' }) => {
    const { drawCoursePdf } = require('../controllers/certificateController');
    drawCoursePdf(res, { number, name: String(name || 'Student'), title: titleOf(level, courseName), issuedAt });
};

module.exports = { draw, titleOf };
