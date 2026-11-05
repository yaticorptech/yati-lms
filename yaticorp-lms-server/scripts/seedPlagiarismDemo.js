/**
 * Sample data for a teacher's Plagiarism Check, so the page has something in
 * every part: four uploaded sources in the library, one earlier piece of the
 * teacher’s own writing, and seven past checks from clean to heavily copied —
 * one with an uncited quotation, one reusing the teacher's own words. Every
 * report is worked out by the real checker (src/teacher/similarity.js), not
 * typed in. The sources are made-up sample texts, titled as samples.
 *
 *   node scripts/seedPlagiarismDemo.js                  the most recently signed-in teacher
 *   node scripts/seedPlagiarismDemo.js <email|card>     a particular teacher
 *   node scripts/seedPlagiarismDemo.js --all            every teacher
 *   node scripts/seedPlagiarismDemo.js <who> --remove   take the sample data out again
 *
 * Uses the database in .env. Running it again replaces the sample data rather
 * than adding a second copy; the sample records are found by their titles.
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const M = require('../src/teacher/models');
const { compare, citationCheck, wordCount, SHINGLE } = require('../src/teacher/similarity');

const ago = (days, hours = 10) => new Date(Date.now() - days * 86400000 - hours * 3600000);

const SOURCES = [
    {
        title: 'Sample source — Peer learning in higher education',
        fileName: 'peer-learning-sample.pdf',
        text: 'Peer learning describes students helping one another to understand course material without a teacher leading every step. When a student explains a concept to a classmate, both of them gain, because the explainer has to put their own understanding into order. Structured peer tutoring with short training for tutors and a fixed weekly schedule produces stronger results than informal study groups. Colleges that pair senior students with first-year students report better attendance and fewer students leaving in the first semester.'
    },
    {
        title: 'Sample source — Mathematics anxiety and performance',
        fileName: 'maths-anxiety-sample.pdf',
        text: 'Mathematics anxiety is a feeling of tension and fear that interferes with working on numbers and solving problems in everyday and academic situations. Students with high mathematics anxiety avoid optional courses in mathematics and choose careers that need less of it. The anxiety uses up working memory, so anxious students perform below their real ability on timed tests. Short writing exercises before an examination and a supportive classroom climate have both been shown to reduce the effect of anxiety on scores.'
    },
    {
        title: 'Sample source — Learning by experience',
        fileName: 'experiential-learning-sample.docx',
        text: 'Learning from experience moves through a cycle of doing something, reflecting on what happened, forming a general idea from it and trying that idea out in a new situation. Field visits, laboratory work and internships give students the concrete experience that starts this cycle. Without time set aside for reflection, students tend to repeat activities without drawing lessons from them. Teachers can support reflection with guided questions, learning journals and short discussions at the end of each activity.'
    },
    {
        title: 'Sample source — Academic integrity guidelines',
        fileName: 'integrity-guidelines-sample.pdf',
        text: 'Every thesis and research paper must acknowledge the words and ideas of others through proper citation and referencing. Text copied from a source without quotation marks and a reference is treated as plagiarism even when the copying was not deliberate. Institutions are expected to check theses with similarity software before they are submitted for evaluation. A similarity level of up to ten percent is generally treated as minor, while higher levels call for revision before the work can be accepted.'
    }
];

// The teacher's own earlier work, so reuse of their own words shows up too.
const OWN = {
    title: 'Earlier conference paper (sample)',
    kind: 'article',
    content: 'In our earlier study of three rural colleges, students who attended weekly peer tutoring sessions reported lower anxiety before mathematics tests. The tutoring sessions were led by trained senior students and followed a fixed plan of revision, practice and discussion. Attendance at the sessions stayed above eighty percent across the whole semester, and the gap between tutored and untutored students widened after the midterm examination.'
};

const [peer, anxiety, experience, integrity] = SOURCES.map((s) => s.text.split(/(?<=\.)\s+/));
const own = OWN.content.split(/(?<=\.)\s+/);

// The past checks: what was checked, and how long ago.
const REPORTS = [
    {
        title: 'Abstract (sample)', days: 2,
        text: 'This study examines whether structured peer tutoring reduces mathematics anxiety among first-year undergraduates in rural Karnataka. A quasi-experimental design compared tutored and untutored groups across one semester, using a validated anxiety scale and end-of-term test scores. Tutored students showed lower anxiety and modestly higher scores, and the effect was strongest for students who began with the highest anxiety.'
    },
    {
        title: 'Methodology (sample)', days: 5,
        text: 'Participants were 214 first-year students from three government colleges, chosen because each already ran a voluntary tutoring scheme. Two colleges introduced a structured programme with trained tutors and a fixed weekly plan, while the third kept its informal arrangement and served as the comparison group. Anxiety was measured in the first and the fourteenth week of the semester with a twenty-item scale translated into Kannada and checked for reliability in a pilot with forty students.'
    },
    {
        // One borrowed sentence in otherwise original writing: a low score.
        title: 'Field visit report (sample)', days: 6,
        text: `Second-year students visited two cooperative dairies near Dharwad to see record keeping and quality testing at first hand. Before the visit they listed questions about pricing, hygiene checks and how farmers are paid. During the visit each group interviewed one manager and noted how the daily accounts were kept. ${experience[3]} The groups then compared their notes and wrote a short report on what surprised them most.`
    },
    {
        title: 'Discussion — quoted with citations (sample)', days: 8,
        text: `The findings agree with earlier work on peer learning. As one review puts it, "${peer[1]}" (Rao, 2019). The same pattern appears in studies of examination stress, where "${anxiety[2]}" (Mehta & Singh, 2020). Our results add that the benefit holds in colleges with few resources, provided the tutoring is planned rather than left to chance. Two differences stand out. First, the gains in our colleges appeared only after the midterm, which suggests that tutors needed several weeks to settle into their role. Second, students who tutored others reported as much relief from anxiety as those they helped, a point that earlier work has rarely measured.`
    },
    {
        title: 'Grant proposal — background (sample)', days: 11,
        text: `The proposed project builds on our own pilot work. ${own[0]} ${own[1]} We now plan to extend the programme to six colleges and to follow students into their second year, so that the lasting effect on course choices can be measured.`
    },
    {
        title: 'Chapter 2 — Literature review, draft 1 (sample)', days: 15,
        text: `Research on peer learning has grown steadily over the past two decades. ${peer[0]} ${peer[2]} In the Indian context, few studies have looked beyond urban colleges. ${anxiety[0]} ${anxiety[2]} ${experience[0]} This chapter brings these strands together to frame the present study (Kumar, 2021).`
    },
    {
        title: 'Introduction — copied paragraph (sample)', days: 21,
        text: `${anxiety.join(' ')} "${integrity[1]}" ${integrity[2]} ${peer[3]}`
    }
];

const findTeachers = async (who, all) => {
    if (all) return M.Teacher.find();
    if (!who) return [await M.Teacher.findOne().sort({ lastLoginAt: -1 })].filter(Boolean);
    const q = who.includes('@') ? { email: who.toLowerCase() } : { cardNumber: who };
    return [await M.Teacher.findOne(q)].filter(Boolean);
};

const remove = async (t) => {
    const [r, s, w] = await Promise.all([
        M.PlagiarismReport.deleteMany({ teacherId: t._id, title: { $in: REPORTS.map((x) => x.title) } }),
        M.PlagiarismSource.deleteMany({ teacherId: t._id, title: { $in: SOURCES.map((x) => x.title) } }),
        M.WritingPiece.deleteMany({ teacherId: t._id, title: OWN.title })
    ]);
    return r.deletedCount + s.deletedCount + w.deletedCount;
};

const seed = async (t) => {
    await remove(t);
    const id = t._id;
    for (const s of SOURCES) await M.PlagiarismSource.create({ teacherId: id, title: s.title, fileName: s.fileName, text: s.text, words: wordCount(s.text) });
    const ownPiece = await M.WritingPiece.create({ teacherId: id, title: OWN.title, kind: OWN.kind, content: OWN.content });
    await M.WritingPiece.collection.updateOne({ _id: ownPiece._id }, { $set: { createdAt: ago(40), updatedAt: ago(40) } });

    // Compared with what a real check would see from these: the uploaded
    // sources (other people's words) and the teacher's own earlier writing.
    const corpus = [
        ...SOURCES.map((s) => ({ own: false, label: `Your uploaded source “${s.title}”`, text: s.text })),
        { own: true, label: `Your writing “${OWN.title}”`, text: OWN.content }
    ];
    const made = [];
    for (const r of REPORTS) {
        const result = compare(r.text, corpus, { k: SHINGLE });
        const cites = citationCheck(r.text);
        const doc = await M.PlagiarismReport.create({
            teacherId: id, title: r.title, text: r.text, source: { kind: 'paste' },
            words: result.words, score: result.score, ownScore: result.ownScore, documentsCompared: corpus.length,
            matches: result.matches, sources: result.sources, citations: { found: cites.found }, flags: cites.flags
        });
        await M.PlagiarismReport.collection.updateOne({ _id: doc._id }, { $set: { createdAt: ago(r.days), updatedAt: ago(r.days) } });
        made.push(`${r.title.replace(' (sample)', '')}: ${result.score}%${result.ownScore ? ` (own ${result.ownScore}%)` : ''}${cites.flags.length ? `, ${cites.flags.length} uncited quote` : ''}`);
    }
    console.log(`Plagiarism sample data for ${t.name}: ${SOURCES.length} sources, 1 own piece, ${REPORTS.length} checks —\n  ${made.join('\n  ')}`);
};

(async () => {
    const args = process.argv.slice(2);
    const removing = args.includes('--remove');
    const all = args.includes('--all');
    const who = args.find((a) => !a.startsWith('--'));
    await connectDB();
    console.log('Database:', mongoose.connection.name);
    const teachers = await findTeachers(who, all);
    if (!teachers.length) { console.log('No such teacher.'); process.exit(1); }
    for (const t of teachers) {
        if (removing) console.log(`Removed ${await remove(t)} sample records for ${t.name}.`);
        else await seed(t);
    }
    await mongoose.disconnect();
})().catch((error) => { console.error(error); process.exit(1); });
