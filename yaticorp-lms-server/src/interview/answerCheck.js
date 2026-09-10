/**
 * Is this an answer at all?
 *
 * A real interviewer does not silently move on when the candidate types
 * "asdfgh" or says "I don't know" — they say they could not follow, and ask
 * again. This decides which submissions are worth recording. It judges only
 * whether the text is language and an attempt; it never judges whether an
 * answer is factually right, which is what the evaluation at the end is for.
 *
 * It also catches an answer that is fine English but about something else —
 * the education question answered with a job history, say. That test runs only
 * on the stages whose subject is unmistakable, and only when the answer carries
 * no sign of the subject at all, because wrongly telling a candidate they
 * missed the question is worse than letting a loose answer through.
 *
 * Everything here is orthographic and structural, so it works for any subject
 * and does not need the AI. Short answers are NOT rejected — a one-word answer
 * is a real answer, and the interviewer follows it up asking to expand.
 */

// Enough of the commonest English words that any genuine sentence hits several.
const COMMON = new Set(`a an and are as at be been but by can could did do does for from get go had has have he her him his how i if in into is it its just like make me more my no not now of on one or our out over said say she so some than that the their them then there these they this to too up us use very was we were what when where which who will with would you your about after all also am any because before better big both call come day different each even every experience first found give good great group help here high home how important interview job know large last learn life little long look made man many may might most much must name need never new number old only other own part people place point problem project put right same school see should show skill small still study such system take team tell than thing think time try two under use used using want way well went were while why work working world would year years able ask answer build built change class code company complete data design develop early end example feel find focus friend future idea improve include increase issue keep learned level main manage mean move often open order plan possible practice process provide question quick read real reason result run second set side simple since solve start state support sure test though through today together took total train turn understand user value week within without write wrong`.split(/\s+/));

// Runs a hand makes on a keyboard rather than a word anyone means.
const KEY_RUNS = ['qwert', 'werty', 'ertyu', 'rtyui', 'tyuio', 'yuiop', 'asdfg', 'sdfgh', 'dfghj', 'fghjk', 'ghjkl', 'zxcvb', 'xcvbn', 'cvbnm', 'qazwsx', 'asdf', 'sdfg', 'jkl', 'hjkl', 'lkjh', 'poiu', 'mnbv', '1234', '2345', 'abcd'];
// Things people type or say when they are not answering.
const NON_ANSWERS = /^(?:idk|dk|i\s*(?:do\s*n[o']?t|don'?t|dont)\s*know|no\s*idea|not\s*sure|nothing|none|nil|na|n\/?a|skip|pass|next|dunno|test(?:ing)?|dummy|sample|blah|abc+|xyz+|asdf+|hello|hi|hey|ok(?:ay)?|yes|no|yeah|nope|good|fine|maybe|whatever|random|anything|sorry)[.!?]*$/i;

const VOWEL = /[aeiouy]/;
const strip = (t) => t.replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, '').toLowerCase();

/**
 * Could this token be a word? Vowels in it, no impossible consonant or vowel
 * pile-up, and not a run straight off the keyboard.
 */
const wordLike = (t) => {
    if (/^\d+$/.test(t)) return true;                                   // "2019", "80%"
    if (!/[a-z]/.test(t)) return false;
    if (t.length <= 2) return COMMON.has(t) || /^[ai]$/.test(t);        // only real two-letter words count
    if (KEY_RUNS.some((run) => t.includes(run))) return false;
    if (!VOWEL.test(t)) return false;
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(t)) return false;
    if (/[aeiou]{4,}/.test(t)) return false;
    if (/(.)\1{2,}/.test(t)) return false;                              // "aaaa", "hmmmm"
    return true;
};

/**
 * Stages with one unmistakable subject, and the words an answer on that
 * subject can hardly avoid. `elsewhere` never decides anything — it only lets
 * the interviewer name what the candidate talked about instead.
 */
const SUBJECTS = {
    background: {
        want: ['school', 'colleg', 'univers', 'degree', 'graduat', 'stud', 'learn', 'cours', 'semester', 'classe', 'board', 'cgpa', 'percentag', 'marks', 'engineer', 'bachelor', 'master', 'diploma', 'campus', 'institut', 'academ', 'syllab', 'subject', 'major', 'specialis', 'specializ', 'educat', 'training', 'certificat', 'taught', 'teacher', 'professor', 'faculty', 'exam', 'tenth', 'twelfth', '10th', '12th', 'matric', 'intermediate', 'science', 'commerce', 'arts', 'maths', 'mathematics', 'lesson', 'lectur', 'session', 'module', 'topic', 'concept', 'assignment', 'practical', 'notes', 'tutorial', 'trainer', 'mentor', 'explain', 'internship'],
        acronyms: /\b(?:b\.?\s?e|b\.?\s?tech|m\.?\s?tech|b\.?\s?sc|m\.?\s?sc|b\.?\s?c\.?\s?a|m\.?\s?c\.?\s?a|m\.?\s?b\.?\s?a|b\.?\s?com|ph\.?\s?d|h\.?\s?s\.?\s?c|s\.?\s?s\.?\s?l\.?\s?c|p\.?\s?u\.?\s?c|cbse|icse|iti)\b/i,
        elsewhere: { work: ['job', 'compan', 'employ', 'salar', 'client', 'manager', 'profession', 'career', 'hired', 'firm', 'startup', 'industr', 'colleague', 'appraisal', 'notice period'] },
        messages: [
            { plain: "That's useful, but it isn't quite what I asked. I'd like to hear about your education — what you studied, and where.", work: "That tells me about your work rather than your education. Let's come back to it — what did you study, and where?" },
            { plain: "Let's try that once more: tell me about your studies — your school or college, the course you took, and what you enjoyed in it.", work: "We'll get to your work later. For now, tell me about your studies — your school or college, and the course you took." }
        ]
    },
    project: {
        want: ['project', 'built', 'build', 'made', 'develop', 'app', 'applicat', 'system', 'websit', 'model', 'dashboard', 'tool', 'api', 'featur', 'dataset', 'code', 'design', 'implement', 'deploy', 'databas', 'algorithm', 'interface', 'prototype', 'my role', 'worked on', 'team'],
        acronyms: null,
        elsewhere: {},
        messages: [
            { plain: "That doesn't quite answer what I asked. Tell me about the project itself — what it was for, what you built, and what your part in it was." },
            { plain: "Let's stay with the project: what problem did it solve, what did you actually build, and what was hardest about it?" }
        ]
    }
};

const MESSAGES = {
    gibberish: [
        "I'm sorry, I couldn't make sense of that. Could you answer the question in a sentence or two?",
        "I still couldn't follow that. Take your time and answer in your own words — even a short, honest attempt is fine."
    ],
    'non-answer': [
        "That's alright, but have a go anyway. Even a rough attempt tells me how you think.",
        "Give it a try in your own words. Tell me what you would do, or how you would find out."
    ]
};

/**
 * @param {string} answer          what the candidate submitted
 * @param {object} [opts]
 * @param {number} [opts.attempt]  how many times this question has been re-asked
 * @param {string} [opts.stage]    the stage the open question belongs to
 * @param {string} [opts.question] the question itself, for stems it may add
 * @returns {{usable: boolean, kind: 'ok'|'gibberish'|'non-answer', message: string}}
 *          `usable` false means the question stays open and `message` is what
 *          the interviewer says next.
 */
const hasAny = (text, stems) => stems.some((w) => (w.includes(' ') ? text.toLowerCase().includes(w) : new RegExp(`\\b${w}`, 'i').test(text)));
/** Does the answer show any sign of the stage's subject? */
const onSubject = (text, subject) => hasAny(text, subject.want) || !!(subject.acronyms && subject.acronyms.test(text));
/**
 * The distinctive words of the question. An answer that picks one of them up
 * is engaging with what was asked, whatever else it says — which is what keeps
 * "You completed Python Foundations…" answered with "Python taught me…" from
 * being read as off-topic.
 */
const echoesQuestion = (text, question) => {
    const words = String(question || '').toLowerCase().match(/[a-z][a-z'-]{4,}/g) || [];
    const distinctive = words.filter((w) => !COMMON.has(w));
    return distinctive.some((w) => new RegExp(`\\b${w.slice(0, 6)}`, 'i').test(text));
};

const assess = (answer, { attempt = 0, stage = '', question = '' } = {}) => {
    const text = String(answer || '').trim();
    const ok = { usable: true, kind: 'ok', message: '' };
    const reject = (kind) => ({ usable: false, kind, message: MESSAGES[kind][Math.min(attempt, MESSAGES[kind].length - 1)] });
    if (!text) return reject('non-answer');
    if (NON_ANSWERS.test(text)) return reject('non-answer');

    const tokens = text.split(/\s+/).map(strip).filter(Boolean);
    if (!tokens.length) return reject('gibberish');
    const words = tokens.filter(wordLike);
    // Nothing in it reads as a word: keyboard mashing, or a string of symbols.
    if (!words.length) return reject('gibberish');
    // Mostly not words, and long enough that it is not just one odd term.
    if (tokens.length >= 2 && words.length / tokens.length < 0.5) return reject('gibberish');
    // One or two words repeated to fill the box: "blah blah blah".
    const distinct = new Set(tokens);
    if (tokens.length >= 3 && distinct.size <= 2) return reject('gibberish');
    // Real language, but about something else. Only for the stages whose
    // subject cannot be mistaken, only once the answer is long enough to have
    // shown the subject, and only when not one sign of it is there.
    const subject = SUBJECTS[stage];
    if (subject && tokens.length >= 6 && !onSubject(text, subject) && !echoesQuestion(text, question)) {
        const line = subject.messages[Math.min(attempt, subject.messages.length - 1)];
        const elsewhereKey = Object.keys(subject.elsewhere).find((k) => hasAny(text, subject.elsewhere[k]));
        return { usable: false, kind: 'off-topic', message: (elsewhereKey && line[elsewhereKey]) || line.plain };
    }

    // Deliberately NOT rejected: a run of words that are real but uncommon.
    // "Django Flask FastAPI Celery Redis" and "Zomato, Swiggy, Flipkart" are
    // answers; a common-word test would throw them out, and wrongly telling a
    // candidate they made no sense is worse than letting filler through, which
    // the evaluation scores low at the end anyway.
    return ok;
};

module.exports = { assess, MESSAGES };
