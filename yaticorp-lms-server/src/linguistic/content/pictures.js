/**
 * A picture for a Words-lesson word that has one which says it (2026-11-06, the user's Duolingo picture: "Write “ಬೆಕ್ಕು”
 * in English" beside a drawn cat): an emoji, by the word's English, the same in every language and course.
 *
 * Only where the picture is the word, what anyone would call it (the same day, the user: "the word does not match the
 * picture" — 🐓 for "early", 👌 for "easy"): a picture that names another word (a rooster, OK, a factory for
 * "pollution", an elephant for "big") misleads a student who writes what they see. Every other word has none; the mascot
 * stands there instead.
 */
const PICTURES = {
    family: '👨‍👩‍👧', mother: '👩‍👧', father: '👨‍👧', house: '🏠', food: '🍽️', happy: '😊', anxious: '😟', book: '📕',
    teacher: '👩‍🏫', student: '🧑‍🎓', friend: '🧑‍🤝‍🧑', read: '📖', write: '✍️',
    bus: '🚌', train: '🚆', ticket: '🎫', road: '🛣️', rain: '🌧️', sun: '☀️', hot: '🌡️', cold: '🥶', exercise: '🏋️',
    fever: '🤒', medicine: '💊', morning: '🌅', evening: '🌇', clock: '🕒', sleep: '😴', painting: '🖼️', recycle: '♻️'
};

/** The picture for a word, by its English ("Mother" → 👩‍👧), or null. */
const pictureOf = (english) => PICTURES[String(english || '').trim().toLowerCase()] || null;

module.exports = { PICTURES, pictureOf };
