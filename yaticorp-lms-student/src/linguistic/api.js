/** Linguistic Ability — the calls, on YATICORPX3's axios client (as interview/api.js). */
import client from '../utils/api';
import { askIfDriveRequired } from '../integrations/google/driveGate';

const unwrap = (err) => {
    const body = err.response?.data;
    const e = new Error(body?.message || (!err.response ? 'You appear to be offline.' : 'Something went wrong.'));
    e.code = body?.code || (err.response?.status === 401 ? 'SESSION_EXPIRED' : !err.response ? 'OFFLINE' : 'ERROR');
    e.status = err.response?.status;
    throw e;
};
// Reading never fails on a blip (2026-11-14, "You appear to be offline" while the server restarted): no answer at
// all, or a 502–504 from the proxy, is asked again — up to five tries over about ten seconds.
const get = async (p) => {
    let last;
    for (let i = 0; i < 5; i += 1) {
        try { return (await client.get(`/linguistic${p}`, { timeout: 20000 })).data; } catch (err) {
            last = err;
            const s = err.response?.status;
            if (err.response && !(s >= 502 && s <= 504)) break;
            await new Promise((r) => setTimeout(r, 1000 + i * 500));
        }
    }
    return unwrap(last);
};
const post = (p, b) => client.post(`/linguistic${p}`, b).then((r) => r.data).catch(unwrap);
const del = (p) => client.delete(`/linguistic${p}`).then((r) => r.data).catch(unwrap);
/**
 * An answer check (2026-11-14: "Checking…" stayed for ever when the server restarted mid-request): 12 s at most,
 * then asked again — up to three tries, a second apart — so a lost reply never stops the lesson. Checking an answer
 * twice is harmless (it is judged the same way again).
 */
const checkPost = async (p, b) => {
    let last;
    for (let i = 0; i < 5; i += 1) {
        try { return (await client.post(`/linguistic${p}`, b, { timeout: 12000 })).data; } catch (err) {
            last = err;
            if (err.response && !(err.response.status >= 502 && err.response.status <= 504)) break; // a real answer: not retried
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
    return unwrap(last);
};

export const linguisticApi = {
    dashboard: () => get('/'),
    /** The learning path: each level's units and lessons, with which are open and which is next. */
    path: () => get('/path'),
    // Every letter of the course's language on one page (2026-10-31).
    letters: () => get('/letters'),
    /** Start at a level chosen instead of taking the placement test. */
    chooseLevel: (level) => post('/level', { level }),
    /** Straight to a section not open yet (2026-10-31): its jump test, one try → { lesson, module }. */
    jump: (level) => post('/jump', { level }),
    /** "Jump here?" on a unit (2026-11-13): its test, the unit review before it → { unit, lesson, module }. */
    jumpUnit: (unit) => post('/jump-unit', { unit }),
    /** Why they are learning, and how much English they know (0 new … 4 most topics). */
    setAbout: (reason, know, more = {}) => post('/about', { reason, know, ...more }),
    setKnows: (knows) => post('/knows', knows),
    /** The daily XP goal: 10, 20, 30 or 50. */
    setGoal: (xp) => post('/goal', { xp }),
    // The learning plan (2026-10-24): the roadmap, the times to choose (before the student has started: as they said), making or changing it.
    plan: () => get('/plan'),
    planOptions: (course, language, level) => get(`/plan/options?${new URLSearchParams({ course: course || 'en', language: language || '', level: level || '' })}`),
    // The days are set by the server (2026-11-04): 90 for a Beginner, 60 after the Advanced entry test.
    setPlan: () => post('/plan', {}),
    /** The language to learn: 'en', or another course (Vocabulary and Translation), starting at a level. */
    setCourse: (course, start = null) => post('/course', { course, start }),
    /** Choose the student's own language (meanings and translation). */
    setLanguage: (code) => post('/language', { language: code }),
    /** Open a unit's treasure chest on the path: bonus XP, once. */
    openChest: (unitId) => post(`/chest/${unitId}`),
    placement: () => get('/placement'),
    submitPlacement: (answers) => post('/placement', { answers }),
    module: (module) => get(`/modules/${module}`),
    lesson: (id) => get(`/lessons/${id}`),
    /** The unit this lesson is in, every lesson as the student has it: for downloading its audio first. */
    // `ahead`: a unit not open yet — only its audio, so it is ready when it opens (2026-11-13).
    lessonPack: (id, ahead = false) => get(`/lessons/${id}/pack${ahead ? '?ahead=1' : ''}`),
    step: (id, step) => post(`/lessons/${id}/step`, { step }),
    check: (id, section, qid, given) => checkPost(`/lessons/${id}/check`, { section, id: qid, given }),
    /** Check one quiz answer as it is given (nothing saved); the quiz is still submitted whole at the end. */
    quizCheck: (id, qid, given) => checkPost(`/lessons/${id}/quiz/check`, { id: qid, given }),
    quiz: (id, answers) => post(`/lessons/${id}/quiz`, { answers }),
    writing: (id, taskId, answer) => post(`/lessons/${id}/writing/${taskId}`, { answer }),
    // Said, not ticked (2026-10-28): the server ticks the checklist from what was said.
    speaking: (id, said, seconds, recorded) => post(`/lessons/${id}/speaking`, { said, seconds, recorded }),
    // Speak on a topic (Advanced): what was said → each sentence corrected, and why.
    talk: (id, text) => post(`/lessons/${id}/talk`, { text }),
    daily: () => get('/daily'),
    submitDaily: (answers) => post('/daily', { answers }),
    review: () => get('/review'),
    answerReview: (id, given) => post(`/review/${id}`, { given }),
    submissions: () => get('/submissions'),
    history: () => get('/history'),
    /** The notepad on the Writing tab: the student's notes, each { id, title, html }. */
    notes: () => get('/notes'),
    /** The Notes tab (2026-11-02): what the student has learnt, from the lessons finished. */
    learnt: () => get('/learnt'),
    addNote: (note) => post('/notes', note),
    saveNote: (id, note) => post(`/notes/${id}`, note),
    deleteNote: (id) => del(`/notes/${id}`),
    certificates: () => get('/certificates'),
    /** The certificate PDF, as a Blob. */
    certificatePdf: (level, course = null) => client.get(`/linguistic/certificates/${level}/pdf${course ? `?course=${encodeURIComponent(course)}` : ''}`, { responseType: 'blob' }).then((r) => r.data)
        .catch((err) => { askIfDriveRequired(err, 'So the certificates you earn here are kept in your own Google Drive.'); return unwrap(err); }),
    hideCertificate: (level, course = null) => del(`/certificates/${level}${course ? `?course=${encodeURIComponent(course)}` : ''}`)
};

/** Show the reward toasts and celebrations the rest of the app shows (RewardsContext listens). */
export const announceRewards = (events) => {
    if (events?.length) window.dispatchEvent(new CustomEvent('yati:rewards', { detail: events }));
    window.dispatchEvent(new CustomEvent('yati:progress-changed'));
};

/**
 * A recording's address. Seeded recordings live on the API server
 * (/linguistic/audio/…); uploaded ones are full web addresses already.
 */
const API_ORIGIN = String(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
export const mediaUrl = (src) => (!src ? '' : /^https?:\/\//i.test(src) ? src : `${API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`);
