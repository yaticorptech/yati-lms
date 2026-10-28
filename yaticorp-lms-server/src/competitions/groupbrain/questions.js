/**
 * An admin's own questions for the Group Brain quiz games — Pattern Master,
 * Number Logic, Word Logic, Deduction Detective and Spatial IQ. A game made
 * from a room mixes the active ones in with the questions it makes itself (up
 * to a third of the game: roomService passes them to the engine, which
 * checks them like its own).
 */
const { GroupBrainQuestion } = require('./models');
const { audit } = require('./settings');

const QUIZ_GAMES = ['patternmaster', 'numberlogic', 'wordlogic', 'deduction', 'spatialiq'];
const fail = (status, message) => Object.assign(new Error(message), { status });

/** A question from a form, checked: four different options and one right answer. */
const clean = (b = {}) => {
    const game = String(b.game || '');
    if (!QUIZ_GAMES.includes(game)) throw fail(400, `Questions are for ${QUIZ_GAMES.join(', ')}.`);
    const prompt = String(b.prompt || '').trim();
    if (prompt.length < 5 || prompt.length > 600) throw fail(400, 'The question must be 5–600 characters.');
    const options = (Array.isArray(b.options) ? b.options : []).map((o) => String(o ?? '').trim());
    if (options.length !== 4 || options.some((o) => !o || o.length > 200)) throw fail(400, 'Give four options, each 1–200 characters.');
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) throw fail(400, 'The four options must all be different.');
    const answer = Number(b.answer);
    if (![0, 1, 2, 3].includes(answer)) throw fail(400, 'Mark the right answer.');
    return { game, prompt, options, answer, topic: String(b.topic || '').trim().slice(0, 40), explain: String(b.explain || '').trim().slice(0, 400), active: b.active !== false };
};

const list = async ({ game } = {}) => (await GroupBrainQuestion.find(game ? { game } : {}).sort({ createdAt: -1 }).limit(500).lean()).map((q) => ({ ...q, id: String(q._id) }));

const create = async (body, admin) => {
    const q = await GroupBrainQuestion.create({ ...clean(body), createdBy: admin?._id || null });
    await audit(admin, 'question.create', String(q._id), null, { game: q.game, prompt: q.prompt });
    return q.toObject();
};
const update = async (id, body, admin) => {
    const before = await GroupBrainQuestion.findById(id).lean();
    if (!before) throw fail(404, 'Question not found.');
    const q = await GroupBrainQuestion.findByIdAndUpdate(id, { $set: clean({ ...before, ...body }) }, { returnDocument: 'after' }).lean();
    await audit(admin, 'question.update', id, { prompt: before.prompt, active: before.active }, { prompt: q.prompt, active: q.active });
    return q;
};
const remove = async (id, admin) => {
    const q = await GroupBrainQuestion.findByIdAndDelete(id).lean();
    if (!q) throw fail(404, 'Question not found.');
    await audit(admin, 'question.delete', id, { game: q.game, prompt: q.prompt }, null);
    return { ok: true };
};

/** The active questions for a game, as the engine takes them. */
const forGame = async (game) => (QUIZ_GAMES.includes(game)
    ? (await GroupBrainQuestion.find({ game, active: true }).limit(200).lean()).map((q) => ({ topic: q.topic || 'Admin question', prompt: q.prompt, options: q.options, answer: q.answer, explain: q.explain }))
    : []);

module.exports = { QUIZ_GAMES, list, create, update, remove, forGame, clean };
