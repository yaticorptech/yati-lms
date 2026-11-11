/**
 * Complete the conversation (2026-11-07, the user's Duolingo picture "ಈ ಸಂಭಾಷಣೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ": a person asks "Do you
 * have a pet?", the reply is the blank, the answer among numbered choices; with its voice — "let me know where you
 * add it"): in every translation lesson and Words lesson, one exchange of its topic (content/chats.js) in the
 * language learnt — English, or a course's. A unit's Words lesson asks one of its topic's two, its translation lesson
 * the other. The wrong choices are replies to another kind of question at the same level, so none answers this one.
 *
 * A question: { id: 'chat~<id>', type: 'chat', who: 'f' | 'm', prompt / ask / say: the question, sayLang: its voice's
 * locale, options: three replies, answer / model: the right one, askMeaning and optionMeanings: their meanings in
 * `meaningLang` — the student's language (English learnt) or English (a course) }.
 */
const { CHATS } = require('./content/chats');
const { shuffle, seeded } = require('./vocabQuiz');

/** A topic's exchanges, by its level and number ('beginner', 3). */
const chatsOf = (level, order) => CHATS.filter((c) => c.topic === `${level}:${Number(order) || 1}`);

/** The exchange a lesson asks, or null (a topic with none written, or none in the language learnt). */
const chatFor = ({ key, level, order, part = 1, module, learnt, meaningLang, sayLang }) => {
    const mine = chatsOf(level, order).filter((c) => c[learnt]);
    if (!mine.length) return null;
    const c = mine[((Number(part) || 1) - 1 + (module === 'translation' ? 1 : 0)) % mine.length];
    const others = shuffle(CHATS.filter((o) => o.id !== c.id && o.kind !== c.kind && o[learnt] && o.topic.startsWith(`${level}:`)), seeded(`${key}:chat`)).slice(0, 2);
    const picked = shuffle([c, ...others], seeded(`${key}:chat:options`));
    const meant = meaningLang && meaningLang !== learnt;
    const [ask, answer] = c[learnt];
    return {
        id: `chat~${c.id}`, type: 'chat', who: c.who, prompt: ask, ask, say: ask, sayLang,
        options: picked.map((o) => o[learnt][1]), answer, model: answer,
        ...(meant ? {
            meaningLang, askMeaning: c[meaningLang]?.[0] || null,
            optionMeanings: Object.fromEntries(picked.map((o) => [o[learnt][1], o[meaningLang]?.[1]]).filter(([, m]) => m))
        } : {})
    };
};

const squash = (text) => String(text || '').toLowerCase().normalize('NFC').replace(/[\p{P}\p{S}\s]+/gu, '');
/** Whether the reply chosen is the right one. */
const chatRight = (q, given) => squash(given) === squash(q.answer);

module.exports = { chatsOf, chatFor, chatRight };
