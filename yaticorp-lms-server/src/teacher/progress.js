/**
 * How a teacher is getting on, for the people who look after them: the admin
 * (Teachers) and the teacher's organization (its Teachers page).
 *
 * Titles, stages, counts and dates only — never the words of a thesis, a
 * writing piece or a plagiarism report. Those stay the teacher's own.
 */
const { ResearchProject, Publication, Thesis, WritingPiece, WritingLog, PlagiarismReport } = require('./models');
const { progressOf } = require('./researchPath');
const { wordCount } = require('./similarity');
const { dayKey, addDays } = require('../rewards/config/constants');
const METHOD_KEYS = require('./methodKeys');

const ACTIVE_WINDOW_DAYS = 30;

/**
 * One line per teacher, for a list: research progress, papers, thesis and
 * writing. A fixed handful of grouped queries, whatever the number of teachers.
 */
const summarise = async (teachers) => {
    const ids = teachers.map((t) => t._id);
    if (!ids.length) return [];
    const since = addDays(dayKey(), -(ACTIVE_WINDOW_DAYS - 1));
    const [projects, pubs, theses, logs] = await Promise.all([
        ResearchProject.find({ teacherId: { $in: ids } }).select('teacherId title stages updatedAt').sort({ updatedAt: -1 }).lean(),
        Publication.aggregate([{ $match: { teacherId: { $in: ids } } }, { $group: { _id: '$teacherId', total: { $sum: 1 }, published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } } } }]),
        Thesis.aggregate([{ $match: { teacherId: { $in: ids } } }, { $group: { _id: '$teacherId', n: { $sum: 1 } } }]),
        WritingLog.aggregate([{ $match: { teacherId: { $in: ids }, day: { $gte: since } } }, { $group: { _id: '$teacherId', words: { $sum: '$words' }, days: { $sum: 1 } } }])
    ]);
    const latest = new Map();
    for (const p of projects) if (!latest.has(String(p.teacherId))) latest.set(String(p.teacherId), p);
    const by = (list) => new Map(list.map((x) => [String(x._id), x]));
    const [mp, mt, ml] = [by(pubs), by(theses), by(logs)];
    return teachers.map((t) => {
        const key = String(t._id);
        const project = latest.get(key);
        const progress = project ? progressOf(project) : null;
        return {
            research: project ? { title: project.title, percent: progress.percent, stage: progress.current?.title || 'All stages done' } : null,
            publications: { total: mp.get(key)?.total || 0, published: mp.get(key)?.published || 0 },
            theses: mt.get(key)?.n || 0,
            writing: { words30: ml.get(key)?.words || 0, days30: ml.get(key)?.days || 0 }
        };
    });
};

/** Everything about one teacher's research, without the writing itself. */
const detail = async (teacher) => {
    const id = teacher._id;
    const since = addDays(dayKey(), -(ACTIVE_WINDOW_DAYS - 1));
    const [projects, pubs, theses, pieces, logs, checks] = await Promise.all([
        ResearchProject.find({ teacherId: id }).sort({ updatedAt: -1 }).lean(),
        Publication.find({ teacherId: id }).select('title type status venue year indexing quartile citations publishedOn updatedAt').sort({ updatedAt: -1 }).limit(200).lean(),
        Thesis.find({ teacherId: id }).select('title degree university targetWords dueDate chapters.title chapters.status chapters.content updatedAt').sort({ updatedAt: -1 }).lean(),
        WritingPiece.countDocuments({ teacherId: id }),
        WritingLog.find({ teacherId: id, day: { $gte: since } }).select('day words').lean(),
        PlagiarismReport.countDocuments({ teacherId: id })
    ]);
    const guideRead = teacher.guideRead instanceof Map ? Object.fromEntries(teacher.guideRead) : (teacher.guideRead || {});
    return {
        research: projects.map((p) => {
            const progress = progressOf(p);
            return { _id: p._id, title: p.title, field: p.field || '', percent: progress.percent, done: progress.done, total: progress.total, stage: progress.current?.title || 'All stages done', targetDate: p.targetDate || null, updatedAt: p.updatedAt };
        }),
        publications: pubs,
        theses: theses.map((t) => ({
            _id: t._id, title: t.title, degree: t.degree || '', university: t.university || '', dueDate: t.dueDate || null,
            words: (t.chapters || []).reduce((n, c) => n + wordCount(c.content), 0),
            targetWords: t.targetWords || 0,
            chapters: (t.chapters || []).length,
            chaptersDone: (t.chapters || []).filter((c) => c.status === 'done').length,
            updatedAt: t.updatedAt
        })),
        writing: {
            pieces,
            words30: logs.reduce((n, l) => n + l.words, 0),
            days30: logs.filter((l) => l.words > 0).length
        },
        plagiarismChecks: checks,
        learning: {
            methodsStudied: (teacher.methodsStudied || []).length,
            methodsTotal: METHOD_KEYS.length,
            guidesRead: Object.fromEntries(Object.entries(guideRead).map(([k, v]) => [k, (v || []).length]))
        }
    };
};

module.exports = { summarise, detail, ACTIVE_WINDOW_DAYS };
