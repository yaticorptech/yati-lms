/**
 * The builders the new topics (content/topics) write their lessons with — the
 * same shapes as the first lessons' (vocabulary.js, grammar.js…), and the
 * recordings named the same way (scripts/makeLinguisticAudio.js makes them).
 */
const slug = (word) => word.toLowerCase().replace(/[^a-z]+/g, '-');
const w = (word, kannada, pos, example, synonyms = [], antonyms = []) => ({ word, kannada, pos, example, synonyms, antonyms, audio: `/linguistic/audio/word-${slug(word)}.m4a` });

const mcq = (id, prompt, options, answer, explanation) => ({ id, type: 'mcq', prompt, options, answer, explanation });
const fill = (id, prompt, answer, explanation, accepted = []) => ({ id, type: 'fill', prompt, answer, accepted, explanation });
const fix = (id, prompt, answer, explanation, accepted = []) => ({ id, type: 'correction', prompt, answer, accepted, explanation });
const order = (id, words, answer, explanation, accepted = []) => ({ id, type: 'rearrange', prompt: 'Put the words in the right order to make a sentence.', words, answer, accepted, explanation });

const dialogue = (key, scenario, speakers, lines) => ({
    scenario, speakers,
    lines: lines.map(([speaker, text], i) => ({ speaker, text, audio: `/linguistic/audio/${key}-${i + 1}.m4a` }))
});

const item = (id, kind, topic, source, model, explanation, accepted = [], open = false) => ({ id, kind, topic, source, model, accepted, explanation, ...(open ? { open: true } : {}) });

/** A first lesson's translation tips, for a new lesson that goes the same way. */
const tipsOf = (seedKey) => require('../translation').find((l) => l.seedKey === seedKey).learn.points;

module.exports = { w, mcq, fill, fix, order, dialogue, item, tipsOf };
