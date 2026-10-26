/**
 * Sample data for a teacher's dashboard, so every screen has something in it:
 * research projects at different stages, publications in every status, a
 * thesis with written chapters, writing pieces and two weeks of writing,
 * a plagiarism report, an uploaded source and a saved version.
 *
 *   node scripts/seedTeacherDemo.js                  the most recently signed-in teacher
 *   node scripts/seedTeacherDemo.js <email|card>     a particular teacher
 *   node scripts/seedTeacherDemo.js <who> --remove   take the sample data out again
 *
 * Uses the database in .env. The teacher's own work is left alone; the sample
 * records are found again by their titles, so --remove takes only those.
 * (Words added to the writing log for past days stay — they are just counts.)
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const M = require('../src/teacher/models');
const { newStages, pathKey } = require('../src/teacher/researchPath');
const { compare, citationCheck, wordCount } = require('../src/teacher/similarity');
const { dayKey, addDays } = require('../src/rewards/config/constants');

const ago = (days) => new Date(Date.now() - days * 86400000);
const ahead = (days) => new Date(Date.now() + days * 86400000);

const PROJECTS = [
    { title: 'Peer tutoring and mathematics anxiety in rural colleges', field: 'Education', goal: 'phd', kind: 'experimental', start: 420, target: 500, doneStages: 3, partly: 2 },
    { title: 'Digital literacy of first-generation college students', field: 'Education technology', goal: 'funded', kind: 'survey', start: 60, target: 300, doneStages: 0, partly: 1 }
];

const PUBLICATIONS = [
    { title: 'Peer tutoring and mathematics anxiety: a quasi-experiment in three rural colleges', type: 'journal', status: 'published', authors: 'Presilla Dsouza, Meera Iyer', venue: 'Journal of Rural Education', year: 2025, volume: '14', issue: '2', pages: '33–51', doi: '10.1234/jre.2025.0142', indexing: ['Scopus', 'UGC-CARE'], quartile: 'Q2', impactFactor: 1.8, citations: 6, publishedOn: ago(150) },
    { title: 'Mobile learning habits of undergraduate students in Karnataka', type: 'journal', status: 'published', authors: 'Presilla Dsouza', venue: 'Indian Journal of Educational Technology', year: 2024, volume: '6', issue: '1', pages: '12–27', indexing: ['UGC-CARE', 'Google Scholar'], citations: 3, publishedOn: ago(420) },
    { title: 'Teaching statistics with real data: a classroom report', type: 'conference', status: 'published', authors: 'Presilla Dsouza, Ravi Kumar', venue: 'Proceedings of the National Conference on Teaching and Learning 2023', year: 2023, pages: '88–94', publisher: 'Christ University Press', indexing: ['Google Scholar'], citations: 2, publishedOn: ago(700) },
    { title: 'Reflective journals in teacher education: what changes?', type: 'chapter', status: 'accepted', authors: 'Presilla Dsouza', venue: 'Handbook of Reflective Practice in Indian Classrooms', pages: '145–160', publisher: 'Routledge India', decisionOn: ago(20) },
    { title: 'Mentoring circles for new college teachers', type: 'journal', status: 'under_review', authors: 'Presilla Dsouza, Asha Rao', venue: 'Teaching in Higher Education', submittedOn: ago(45), deadline: ahead(25), indexing: ['Scopus', 'Web of Science'] },
    { title: 'Online and traditional classrooms: student engagement compared', type: 'journal', status: 'submitted', authors: 'Presilla Dsouza', venue: 'Education and Information Technologies', submittedOn: ago(10) },
    { title: 'Mathematics anxiety scale for Kannada-medium students: validation', type: 'journal', status: 'drafting', authors: 'Presilla Dsouza, Meera Iyer', deadline: ahead(40), notes: 'Pilot data ready; write the results section next.' },
    { title: 'A systematic review of peer tutoring in Indian higher education', type: 'journal', status: 'idea', notes: 'Run the database searches in December.' }
];

const INTRO = `Background of the study
- Mathematics anxiety among first-year students
- Why rural colleges need attention

Mathematics anxiety is a feeling of tension and fear that interferes with solving mathematical problems. In rural colleges of north Karnataka, many first-year undergraduates come from Kannada-medium schools and meet university mathematics in English for the first time. Teachers report that these students avoid asking questions, miss tutorials and score lower in the first semester than their urban classmates.

Statement of the problem
- Anxiety is high, support is low

Despite growing interest in peer learning, little is known about whether structured peer tutoring reduces mathematics anxiety among rural undergraduates in India. Earlier studies were carried out in urban colleges or abroad, and few measured anxiety before and after the intervention.

Aim and objectives
- To measure the effect of peer tutoring on mathematics anxiety
- To compare examination scores of tutored and untutored students

The purpose of this study is to examine the effect of a twelve-week structured peer tutoring programme on the mathematics anxiety and achievement of first-year undergraduates in three rural colleges.`;

const LITERATURE = `Peer tutoring and learning

Several studies have reported that peer tutoring benefits both the tutor and the tutee, because explaining a concept forces the tutor to organise their own understanding (Topping, 2005). In contrast to lecture-based teaching, peer tutoring offers students a low-risk setting in which to ask questions.

Mathematics anxiety

Mathematics anxiety has been linked to lower achievement across age groups (Hembree, 1990; Ashcraft, 2002). Studies in India have found higher anxiety among students from regional-language schools (Rao & Iyer, 2021). However, these studies share a limitation: most measured anxiety once, without an intervention.

Research gap

Taken together, the literature suggests that peer tutoring may reduce anxiety, but no study has tested this with rural Indian undergraduates using a pre-test and post-test design.`;

const METHOD = `Research design

A quasi-experimental pre-test–post-test control group design was adopted because random assignment of students to classes was not possible in the colleges.

Population and sample

The population was first-year B.Sc. students in rural government colleges of north Karnataka. Three colleges were chosen by purposive sampling; 180 students took part (90 in the tutoring group and 90 in the control group).

Instruments

Mathematics anxiety was measured with the Abbreviated Math Anxiety Scale, translated into Kannada and validated by five experts. Its reliability in the pilot study was good (Cronbach's α = .86).`;

const PIECES = [
    { title: 'What my first-year students taught me this week', kind: 'reflection', content: 'This week I tried pairing students for the first ten minutes of the tutorial. The quiet students spoke more to each other than they ever do to me. One student explained integration by parts to her partner in Kannada, and both of them solved the next problem without help. I want to try this every week and keep notes on who pairs well.' },
    { title: 'Peer tutoring explained for a newspaper reader', kind: 'article', content: 'When students teach each other, both of them learn. In our colleges, many first-year students are afraid of mathematics. Our study pairs them with a trained classmate for one hour a week. After twelve weeks, students in the programme reported feeling calmer in mathematics classes and asked more questions in lectures.' },
    { title: 'Grant draft: problem and significance', kind: 'grant', content: 'Rural colleges in Karnataka admit a growing number of first-generation students. Many of them struggle in first-year mathematics, and a third repeat the course. This project will train senior students as peer tutors and measure the effect on anxiety, attendance and examination results in six colleges over two years.' }
];

const SOURCE = { title: 'Topping 2005 — Trends in peer learning', fileName: 'topping2005.pdf', text: 'Peer learning can be defined as the acquisition of knowledge and skill through active helping and supporting among status equals or matched companions. Peer tutoring benefits both the tutor and the tutee, because explaining a concept forces the tutor to organise their own understanding. It involves people from similar social groupings who are not professional teachers helping each other to learn and learning themselves by so doing. Organisational aspects such as the training of tutors and the structure of sessions strongly affect outcomes.' };

const findTeacher = async (who) => {
    if (!who) return M.Teacher.findOne().sort({ lastLoginAt: -1 });
    const digits = who.replace(/\D/g, '');
    return M.Teacher.findOne(digits.length === 12 ? { cardNumber: digits } : { email: who.trim().toLowerCase() });
};

const remove = async (t) => {
    const titles = [...PROJECTS.map((p) => p.title), ...PUBLICATIONS.map((p) => p.title), ...PIECES.map((p) => p.title)];
    const thesis = await M.Thesis.findOne({ teacherId: t._id, title: 'Peer tutoring and mathematics anxiety among first-year undergraduates' }).select('_id').lean();
    const pieces = await M.WritingPiece.find({ teacherId: t._id, title: { $in: titles } }).select('_id').lean();
    const r = await Promise.all([
        M.ResearchProject.deleteMany({ teacherId: t._id, title: { $in: titles } }),
        M.Publication.deleteMany({ teacherId: t._id, title: { $in: titles } }),
        M.WritingPiece.deleteMany({ teacherId: t._id, title: { $in: titles } }),
        thesis ? M.Thesis.deleteOne({ _id: thesis._id }) : { deletedCount: 0 },
        M.TextVersion.deleteMany({ teacherId: t._id, docId: { $in: [thesis?._id, ...pieces.map((p) => p._id)].filter(Boolean) } }),
        M.PlagiarismReport.deleteMany({ teacherId: t._id, title: 'Introduction (sample check)' }),
        M.PlagiarismSource.deleteMany({ teacherId: t._id, title: SOURCE.title })
    ]);
    console.log('Removed sample records:', r.map((x) => x.deletedCount).reduce((a, b) => a + b, 0));
};

const seed = async (t) => {
    const id = t._id;
    if (await M.Publication.exists({ teacherId: id, title: PUBLICATIONS[0].title })) {
        console.log('This teacher already has the sample data. Run with --remove first to add it again.');
        return;
    }

    // Research Path: tasks ticked through the first stages.
    // The further-along project last, so the dashboard (newest first) shows it.
    for (const p of [...PROJECTS].reverse()) {
        const stages = newStages(p.kind, p).map((s, i) => ({
            ...s,
            targetDate: ago(p.start - (i + 1) * 45),
            tasks: s.tasks.map((task, j) => ({ ...task, done: i < p.doneStages || (i === p.doneStages && j < p.partly), doneAt: i < p.doneStages ? ago(p.start - i * 40) : undefined }))
        }));
        stages[0].notes = 'Discussed with my guide; narrowed to first-year B.Sc. students.';
        await M.ResearchProject.create({ teacherId: id, title: p.title, field: p.field, goal: p.goal, kind: p.kind, pathFor: pathKey(p), startDate: ago(p.start), targetDate: ahead(p.target), stages });
    }

    await M.Publication.insertMany(PUBLICATIONS.map((p) => ({ ...p, teacherId: id })));

    const thesis = await M.Thesis.create({
        teacherId: id,
        title: 'Peer tutoring and mathematics anxiety among first-year undergraduates',
        degree: 'Doctor of Philosophy', university: 'Karnatak University, Dharwad', supervisor: 'Dr. Meera Iyer', field: 'Education',
        targetWords: 80000, dueDate: ahead(420),
        chapters: [
            { title: 'Abstract', targetWords: 300, status: 'not_started', content: '' },
            { title: 'Introduction', targetWords: 6000, status: 'review', content: INTRO },
            { title: 'Literature Review', targetWords: 15000, status: 'drafting', content: LITERATURE },
            { title: 'Research Methodology', targetWords: 8000, status: 'drafting', content: METHOD },
            { title: 'Results', targetWords: 12000, status: 'not_started', content: '' },
            { title: 'Discussion', targetWords: 10000, status: 'not_started', content: '' },
            { title: 'Conclusion & Future Work', targetWords: 4000, status: 'not_started', content: '' },
            { title: 'References', targetWords: 0, status: 'not_started', content: '' },
            { title: 'Appendices', targetWords: 0, status: 'not_started', content: '' }
        ]
    });
    const intro = thesis.chapters[1];
    await M.TextVersion.create({ teacherId: id, kind: 'chapter', docId: thesis._id, chapterId: intro._id, title: intro.title, content: INTRO.split('\n\nStatement of the problem')[0], words: wordCount(INTRO.split('\n\nStatement of the problem')[0]), reason: 'manual', label: 'Sent to supervisor' });

    await M.WritingPiece.insertMany(PIECES.map((p, i) => ({ ...p, teacherId: id, wordGoal: i === 2 ? 800 : 0 })));

    // Two weeks of writing: some days on goal, some light, a couple missed.
    const pattern = [620, 410, 0, 530, 280, 700, 0, 350, 520, 610, 150, 480, 560, 300];
    const today = dayKey();
    for (let i = 0; i < pattern.length; i += 1) {
        if (!pattern[i]) continue;
        const day = addDays(today, i - 13);
        await M.WritingLog.updateOne({ teacherId: id, day }, { $inc: { words: pattern[i] } }, { upsert: true });
    }

    await M.PlagiarismSource.create({ teacherId: id, title: SOURCE.title, fileName: SOURCE.fileName, text: SOURCE.text, words: wordCount(SOURCE.text) });
    const checked = `${LITERATURE.split('\n\n')[1]}`;
    const result = compare(checked, [{ own: false, label: `Your uploaded source “${SOURCE.title}”`, text: SOURCE.text }]);
    const cites = citationCheck(checked);
    await M.PlagiarismReport.create({ teacherId: id, title: 'Introduction (sample check)', text: checked, source: { kind: 'paste' }, words: result.words, score: result.score, ownScore: result.ownScore, documentsCompared: 1, matches: result.matches, sources: result.sources, citations: { found: cites.found }, flags: cites.flags });
    console.log(`Sample data added for ${t.name}: 2 projects, ${PUBLICATIONS.length} publications, a thesis (3 chapters written), ${PIECES.length} writing pieces, 2 weeks of writing, a plagiarism report, an uploaded source.`);
};

(async () => {
    const args = process.argv.slice(2);
    const removing = args.includes('--remove');
    const who = args.find((a) => !a.startsWith('--'));
    await connectDB();
    console.log('Database:', mongoose.connection.name);
    const t = await findTeacher(who);
    if (!t) { console.log('No such teacher.'); process.exit(1); }
    if (removing) await remove(t); else await seed(t);
    await mongoose.disconnect();
})().catch((error) => { console.error(error); process.exit(1); });
