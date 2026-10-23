/**
 * Linguistic Ability — checking a lesson before it is saved.
 *
 * Administrators write lessons through the admin app, and the seed writes the
 * predefined ones; both pass through here, so a lesson in the database always
 * has the shape the student pages and the checker expect. Strings are trimmed
 * and kept to sensible lengths; a question without an id gets one.
 *
 * validateLesson(body) → { value, errors }: `errors` is a list of plain
 * sentences for the admin page; `value` is the cleaned lesson when none.
 */
const { MODULES, LEVELS, DIRECTIONS } = require('./models');

const QUESTION_TYPES = ['mcq', 'fill', 'correction', 'rearrange'];
const WRITING_TYPES = ['jumbled', 'sentence', 'paragraph', 'email', 'letter'];
const ITEM_KINDS = ['word', 'sentence', 'paragraph'];

const str = (v, max) => String(v ?? '').trim().slice(0, max);
const strs = (v, maxItems, max) => (Array.isArray(v) ? v : String(v ?? '').split(/\n|,/)).map((x) => str(x, max)).filter(Boolean).slice(0, maxItems);
const isAudio = (u) => !u || /^https?:\/\/\S+$/i.test(u) || /^\/linguistic\/[\w./-]+$/.test(u);

const validateQuestions = (list, where, errors, { min = 0, max = 30, types = QUESTION_TYPES } = {}) => {
    if (!Array.isArray(list)) list = [];
    if (list.length < min) errors.push(`${where}: add at least ${min} question${min === 1 ? '' : 's'}.`);
    if (list.length > max) errors.push(`${where}: no more than ${max} questions.`);
    const ids = new Set();
    return list.slice(0, max).map((q, i) => {
        const n = `${where}, question ${i + 1}`;
        const type = types.includes(q?.type) ? q.type : null;
        if (!type) errors.push(`${n}: choose a question type.`);
        let id = str(q?.id, 40) || `${where.slice(0, 1).toLowerCase()}${i + 1}`;
        while (ids.has(id)) id = `${id}x`;
        ids.add(id);
        const out = { id, type, prompt: str(q?.prompt, 500), answer: str(q?.answer, 500), accepted: strs(q?.accepted, 10, 500), explanation: str(q?.explanation, 600) };
        if (type === 'rearrange') {
            out.words = strs(q?.words, 25, 60);
            if (!out.prompt) out.prompt = 'Put the words in the right order to make a sentence.';
            if (out.words.length < 2) errors.push(`${n}: give at least two words to arrange.`);
        }
        if (type === 'mcq') {
            out.options = [...new Set(strs(q?.options, 6, 200))];
            if (out.options.length < 2) errors.push(`${n}: give at least two different options.`);
            if (out.answer && !out.options.includes(out.answer)) errors.push(`${n}: the correct answer must be one of the options.`);
            delete out.accepted;
        }
        if (!out.prompt) errors.push(`${n}: write the question.`);
        if (!out.answer) errors.push(`${n}: give the correct answer.`);
        return out;
    });
};

const validateLesson = (body = {}) => {
    const errors = [];
    const module = MODULES.includes(body.module) ? body.module : null;
    const level = LEVELS.includes(body.level) ? body.level : null;
    if (!module) errors.push('Choose a module.');
    if (!level) errors.push('Choose a level.');
    const value = {
        module, level,
        order: Math.min(999, Math.max(1, Math.round(Number(body.order) || 1))),
        title: str(body.title, 120),
        summary: str(body.summary, 300),
        status: body.status === 'published' ? 'published' : 'draft',
        direction: null
    };
    if (!value.title) errors.push('Give the lesson a title.');

    const learn = body.learn && typeof body.learn === 'object' ? body.learn : {};
    value.learn = { intro: str(learn.intro, 2000), points: strs(learn.points, 20, 600), examples: strs(learn.examples, 20, 300), kannadaNote: str(learn.kannadaNote, 600) };

    if (module === 'vocabulary') {
        const seen = new Set();
        value.words = (Array.isArray(body.words) ? body.words : []).slice(0, 50).map((w, i) => {
            const out = { word: str(w?.word, 60), kannada: str(w?.kannada, 120), pos: str(w?.pos, 20), example: str(w?.example, 300), synonyms: strs(w?.synonyms, 8, 40), antonyms: strs(w?.antonyms, 8, 40), audio: str(w?.audio, 500) || undefined };
            if (!out.word || !out.kannada) errors.push(`Word ${i + 1}: give the English word and its Kannada meaning.`);
            if (out.word && !/^[A-Za-z][A-Za-z '’-]*$/.test(out.word)) errors.push(`Word ${i + 1}: use English letters only for "${out.word}".`);
            if (seen.has(out.word.toLowerCase())) errors.push(`"${out.word}" is in the list twice.`);
            if (!isAudio(out.audio)) errors.push(`Word ${i + 1}: the audio must be a web address.`);
            seen.add(out.word.toLowerCase());
            return out;
        });
        if (value.words.length < 4) errors.push('A vocabulary lesson needs at least 4 words, so the quiz has options to choose from.');
    }
    if (module === 'grammar') {
        value.practice = validateQuestions(body.practice, 'Practice', errors, { min: 1 });
        value.quiz = validateQuestions(body.quiz, 'Quiz', errors, { min: 2 });
    }
    if (module === 'reading') {
        const p = learn.passage || {};
        value.learn.passage = { title: str(p.title, 120), text: str(p.text, 6000) };
        if (value.learn.passage.text.length < 20) errors.push('Write the passage the students will read.');
        value.quiz = validateQuestions(body.quiz, 'Questions', errors, { min: 1, max: 20, types: ['mcq', 'fill'] });
        const ids = new Set();
        value.writing = (Array.isArray(body.writing) ? body.writing : []).slice(0, 10).map((t, i) => {
            const type = WRITING_TYPES.includes(t?.type) ? t.type : null;
            let id = str(t?.id, 40) || `w${i + 1}`;
            while (ids.has(id)) id = `${id}x`;
            ids.add(id);
            const out = { id, type, prompt: str(t?.prompt, 600), model: str(t?.model, 4000), minWords: Math.min(1000, Math.max(0, Math.round(Number(t?.minWords) || 0))), checklist: strs(t?.checklist, 10, 200) };
            if (!type) errors.push(`Writing task ${i + 1}: choose its type.`);
            if (!out.prompt) errors.push(`Writing task ${i + 1}: write the instructions.`);
            if (type === 'jumbled') {
                out.words = strs(t?.words, 25, 60); out.answer = str(t?.answer, 400); out.accepted = strs(t?.accepted, 10, 400);
                if (out.words.length < 2 || !out.answer) errors.push(`Writing task ${i + 1}: give the words and the correct sentence.`);
                if (!out.model) out.model = out.answer;
            }
            if (type === 'sentence') out.mustInclude = strs(t?.mustInclude, 5, 40);
            if (type !== 'jumbled' && !out.model) errors.push(`Writing task ${i + 1}: give a model answer for students to compare with.`);
            return out;
        });
    }
    if (module === 'speaking') {
        const d = learn.dialogue || {};
        const speakers = (Array.isArray(d.speakers) ? d.speakers : []).slice(0, 6).map((s) => ({ name: str(s?.name, 40), voice: s?.voice === 'f' ? 'f' : 'm' })).filter((s) => s.name);
        const lines = (Array.isArray(d.lines) ? d.lines : []).slice(0, 60).map((l) => ({ speaker: str(l?.speaker, 40), text: str(l?.text, 500), audio: str(l?.audio, 500) || undefined })).filter((l) => l.text);
        value.learn.dialogue = { scenario: str(d.scenario, 300), speakers, lines };
        value.learn.audio = str(learn.audio, 500) || undefined;
        value.learn.phrases = strs(learn.phrases, 12, 200);
        if (!lines.length) errors.push('Write the conversation, one line at a time.');
        if (lines.some((l) => !isAudio(l.audio)) || !isAudio(value.learn.audio)) errors.push('Audio must be a web address (or an uploaded file).');
        value.quiz = validateQuestions(body.quiz, 'Listening questions', errors, { min: 1, max: 20, types: ['mcq', 'fill'] });
        const s = body.speaking || {};
        value.speaking = { prompt: str(s.prompt, 600), sample: str(s.sample, 2000), checklist: strs(s.checklist, 12, 200) };
        if (!value.speaking.prompt) errors.push('Write the speaking task.');
        if (!value.speaking.checklist.length) errors.push('Add at least one point to the self-assessment checklist.');
    }
    if (module === 'translation') {
        value.direction = DIRECTIONS.includes(body.direction) ? body.direction : null;
        if (!value.direction) errors.push('Choose the translation direction.');
        const items = (list, where, min) => {
            const ids = new Set();
            const out = (Array.isArray(list) ? list : []).slice(0, 40).map((it, i) => {
                let id = str(it?.id, 40) || `${where === 'Quiz' ? 'q' : 'i'}${i + 1}`;
                while (ids.has(id)) id = `${id}x`;
                ids.add(id);
                const kind = ITEM_KINDS.includes(it?.kind) ? it.kind : 'sentence';
                const o = { id, kind, topic: str(it?.topic, 40) || 'daily conversation', source: str(it?.source, 1500), model: str(it?.model, 1500), accepted: strs(it?.accepted, 15, 1500), explanation: str(it?.explanation, 600) };
                if (it?.open || kind === 'paragraph') o.open = true;
                if (!o.source || !o.model) errors.push(`${where} ${i + 1}: give the text to translate and its model translation.`);
                return o;
            });
            if (out.length < min) errors.push(`${where}: add at least ${min} item${min === 1 ? '' : 's'}.`);
            return out;
        };
        value.items = items(body.items, 'Practice item', 1);
        value.quiz = items(body.quiz, 'Quiz', 1).filter((x) => !x.open);
    }
    return { value, errors };
};

module.exports = { validateLesson, QUESTION_TYPES, WRITING_TYPES, ITEM_KINDS };
