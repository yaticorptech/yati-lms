/**
 * A language's letter words as lines "letter|word|its sound|picture|sentence|its sound|its meaning" (2026-11-02,
 * A for apple in every language): read into { letter: [word, sound, picture, sentence, sound, meaning] }. A sound may
 * be left empty where the word is written in English letters already.
 */
const parse = (text) => Object.fromEntries(text.trim().split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [char, ...rest] = l.split('|');
    return [char, rest];
}));

module.exports = { parse };
