/**
 * The picture stories in more languages (2026-11-02, "make the last changes to all languages"), written compactly:
 * for each story its title, moral, price board, every panel's words in order — and five questions, each the
 * question, its answer and three wrong answers. They are put in their places by the English story's panels
 * (`SHAPES`: c a caption, s a bubble, n narration), and each answer's explanation quotes the story's own line.
 */
const SHAPES = {
    1: ['n', 'cs', 'ss', 'ss', 'c', 'css', 'css', 'n'],
    2: ['n', 'ss', 'ss', 'ss', 's', 'ss', 'ss', 'cn'],
    3: ['n', 'cs', 'ss', 'ss', 'ss', 'c', 'css', 'ssn'],
    4: ['n', 'ss', 'cs', 'ss', 'css', 'ss', 'css', 'n']
};
// Where each question's answer is in the story: [panel, part] (part: a bubble's number, 'c', 'n'), or 'moral'.
const WHY = {
    1: [[1, 0], [3, 0], [6, 'c'], [6, 1], 'moral'],
    2: [[0, 'n'], [3, 1], [6, 0], [7, 'n'], 'moral'],
    3: [[1, 0], [3, 0], [4, 1], [7, 'n'], 'moral'],
    4: [[0, 'n'], [2, 0], [5, 1], [6, 0], 'moral']
};

/** One story in a language, as content/comicLangs.js has Kannada's: { label, title, moralLabel, moral, sign, panels, questions }. */
const story = (order, label, moralLabel, [title, moral, sign, words, questions]) => {
    let at = 0;
    const panels = SHAPES[order].map((shape) => {
        const p = {};
        for (const part of shape) {
            const text = words[at++];
            if (part === 'c') p.caption = text;
            else if (part === 'n') p.narration = text;
            else (p.say = p.say || []).push(text);
        }
        return p;
    });
    if (at !== words.length) throw new Error(`Story ${order} (${title}): ${words.length} lines for ${at} places`);
    const quote = (w) => {
        if (w === 'moral') return moral;
        const [i, part] = w;
        return part === 'c' ? panels[i].caption : part === 'n' ? panels[i].narration : panels[i].say[part];
    };
    return {
        label, title, moralLabel, moral, ...(sign ? { sign } : {}), panels,
        questions: questions.map(([prompt, answer, ...others], k) => ({ prompt, answer, others, explanation: `“${quote(WHY[order][k])}”` }))
    };
};

/** A language's four stories → { order: story }. */
const language = ({ label, moralLabel, stories }) => Object.fromEntries(Object.entries(stories).map(([order, s]) => [order, story(Number(order), label, moralLabel, s)]));

module.exports = { language, SHAPES };
