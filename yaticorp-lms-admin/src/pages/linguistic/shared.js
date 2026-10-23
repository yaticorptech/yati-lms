/** Linguistic Ability (admin) — what the pages share that is not a component. */
import api from '../../utils/api';

export const MODULES = [
    ['vocabulary', 'Vocabulary Builder'], ['grammar', 'Grammar Practice'], ['reading', 'Reading and Writing'],
    ['speaking', 'Speaking and Listening'], ['translation', 'Translation Practice']
];
export const MODULE_LABEL = Object.fromEntries(MODULES);
export const LEVELS = [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']];
export const LEVEL_LABEL = Object.fromEntries(LEVELS);
export const DIRECTIONS = [['kn-en', 'Kannada → English'], ['en-kn', 'English → Kannada']];

/** The server's message, or a plain one. */
export const errorOf = (e, fallback = 'Something went wrong. Please try again.') => e?.response?.data?.message || (!e?.response ? 'The server could not be reached.' : fallback);
/** The server's list of reasons a lesson cannot be saved. */
export const errorsOf = (e) => e?.response?.data?.errors || [errorOf(e)];

/** A recording's address: seeded ones are on the API server, uploaded ones are full addresses. */
const API_ORIGIN = String(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
export const mediaUrl = (src) => (!src ? '' : /^https?:\/\//i.test(src) ? src : `${API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`);

export const uploadAudio = (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/linguistic/admin/audio', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.url);
};

/** A new, empty lesson of a module, in the shape the server checks (validate.js). */
export const blankLesson = (module, keep = {}) => ({
    module, level: keep.level || 'beginner', order: keep.order || 1, title: keep.title || '', summary: keep.summary || '', status: 'draft',
    direction: module === 'translation' ? 'kn-en' : null,
    learn: {
        intro: '', points: [], examples: [], kannadaNote: '',
        ...(module === 'reading' ? { passage: { title: '', text: '' } } : {}),
        ...(module === 'speaking' ? { dialogue: { scenario: '', speakers: [{ name: 'Speaker A', voice: 'm' }, { name: 'Speaker B', voice: 'f' }], lines: [] }, phrases: [], audio: '' } : {})
    },
    ...(module === 'vocabulary' ? { words: [] } : {}),
    ...(module === 'grammar' ? { practice: [], quiz: [] } : {}),
    ...(['reading', 'speaking'].includes(module) ? { quiz: [] } : {}),
    ...(module === 'reading' ? { writing: [] } : {}),
    ...(module === 'speaking' ? { speaking: { prompt: '', sample: '', checklist: [] } } : {}),
    ...(module === 'translation' ? { items: [], quiz: [] } : {})
});

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// Every list row gets a key of its own (dropped by the server when saved), so
// moving one up or down in an editor keeps its own text.
let lastKey = 0;
export const rowKey = () => `k${++lastKey}`;
/** A lesson with a key on every row of every list, for the editors. */
export const withKeys = (lesson) => {
    const k = (xs) => (Array.isArray(xs) ? xs.map((x) => ({ ...x, _k: rowKey() })) : xs);
    const l = { ...lesson, words: k(lesson.words), practice: k(lesson.practice), quiz: k(lesson.quiz), writing: k(lesson.writing), items: k(lesson.items), learn: { ...(lesson.learn || {}) } };
    if (l.learn.dialogue) l.learn.dialogue = { ...l.learn.dialogue, speakers: k(l.learn.dialogue.speakers || []), lines: k(l.learn.dialogue.lines || []) };
    return l;
};
