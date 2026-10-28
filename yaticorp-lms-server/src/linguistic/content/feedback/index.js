/**
 * Linguistic Ability — the feedback on a student's English (grammar
 * corrections, writing tips, talk tips) in the language the student knows
 * (asked 2026-10-27: "fix this in all languages"). The checkers write it in
 * English (talkCheck.js, writingCheck.js); `feedbackIn(code, text)` finds the
 * message here and gives it in the student's language, the student's own words
 * ({1}, {2}…) put back in place. English examples inside a message ("he goes")
 * stay English: they are what is being taught. A message not found here stays
 * English. Written here, not by any translation service — a native speaker
 * should check them. tests/linguistic/feedback.test.js holds every message the
 * checkers can write to this list, and every language to every message.
 */
const KEYS = {
    // Grammar, sentence by sentence (talkCheck.js)
    capI: '"I" is always a capital letter.',
    spelling: 'Spelling.',
    myself: 'To introduce yourself, say "I am …" or "My name is …", not "Myself …".',
    goodName: 'In English, ask "What is your name?" ("good name" is not used).',
    pastTense: 'This happened in the past (yesterday, last week, ago…), so the verb goes into the past tense.',
    pastWas: 'This happened in the past, so "am" or "is" becomes "was".',
    pastWere: 'This happened in the past, so "are" becomes "were".',
    afterDid: 'After "did" or "didn\'t", use the plain verb: did go, didn\'t go.',
    afterDo: 'After do, does, don\'t or doesn\'t, use the plain verb: doesn\'t go, does she know.',
    afterModal: 'After can, should, must, will and would, use the plain verb: can go, should take.',
    noToModal: 'There is no "to" after can, could, should, must or would.',
    canAble: 'Use "can" or "be able to", not both: "I can do it" or "I am able to do it".',
    withIam: 'With "I", use "am": I am.',
    withIs: 'With he, she or it, use "is".',
    withAre: 'With we, you or they, use "are".',
    withWere: 'With we, you or they, use "were".',
    withHave: 'With I, you, we or they, use "have".',
    withDont: 'With I, you, we or they, use "don\'t" (do not).',
    withDoesnt: 'With he, she or it, use "doesn\'t" (does not).',
    thirdS: 'With he, she or it, the verb takes -s in the present: he goes, she has, it works.',
    thereAre: 'With more than one thing, use "there are" (or "there were").',
    participle: 'After have, has or had, use the past participle: have gone, has eaten, had done.',
    stative: 'Verbs like know, understand and want are not used with -ing: "I understand", not "I am understanding".',
    progressive: 'After am, is or are, the verb takes -ing: I am studying, they are working.',
    agreeI: '"Agree" is a verb: say "I agree" or "I do not agree", not "I am agree".',
    agreeShe: '"Agree" is a verb: say "she agrees" or "she does not agree".',
    wantTo: 'After want, need, plan, decide, hope, like and similar verbs, add "to": I want to go.',
    makeLet: 'After make or let + a person, use the plain verb without "to": made me understand, let us go.',
    enjoyIng: '"Enjoy" is followed by -ing: I enjoy reading.',
    moreBetter: '"Better", "easier" and similar words already compare; do not add "more".',
    mostBest: '"Best", "easiest" and similar words already mean "most"; do not add "most".',
    noPlural: 'This word has no plural in English: information, advice, equipment, feedback… (The verb is spelt "advise": he advises.)',
    oneOf: '"One of" is followed by a plural: one of my friends.',
    many: 'Use "many" with things you can count: many people, many problems.',
    both: 'Say "both", without "the".',
    aAn: 'Use "an" before a vowel sound (an apple, an hour) and "a" before a consonant sound (a book, a university).',
    forSince: 'Use "for" with a length of time (for two years) and "since" with a starting point (since 2020).',
    thisMorning: 'Say "this morning", "this evening", not "today morning".',
    tonight: 'Say "tonight", not "today night".',
    lastNight: 'Say "last night", not "yesterday night".',
    passOut: 'In English, you "graduate from" a college; "pass out" means to faint.',
    opinion: 'For your own view, say "in my opinion" or "I think".',
    discussAbout: 'You "discuss", "mention" or "explain" something, without "about".',
    returnBack: '"Return" and "reply" already mean "back"; do not add it.',
    revert: 'In English, "revert" means to go back to an earlier state; to answer, say "reply".',
    repeatAgain: '"Repeat" already means "again".',
    copeUp: 'Say "cope with", without "up".',
    marriedTo: 'You are "married to" someone.',
    comprisesOf: 'Say "consists of" or "comprises", not "comprises of".',
    emphasise: 'You "emphasise" something, without "on".',
    explainTo: 'Say "explain to me".',
    tellMe: 'Say "tell me"; "say" is not followed by a person.',
    twice: 'A word was said twice.',
    notWord: '"{1}" is not an English word. Check the spelling, or use another word.',
    spellingIs: 'Spelling: "{1}" is "{2}".',
    noSpace: 'No space before a full stop or comma.',
    capital: 'Start a sentence with a capital letter.',
    endMark: 'End a sentence with a full stop (.), a question mark (?) or an exclamation mark (!).',
    oneStop: 'One full stop is enough.',
    afterStop: 'Nothing comes after the full stop at the end of a sentence.',
    commaStop: 'No comma just before the full stop.',
    // A piece of writing as a whole (writingCheck.js)
    wEmpty: 'Write your answer first.',
    wMore: 'Write a little more: you have {1} word{2}, and this task needs at least {3}.',
    wLength: 'Good length: {1} words.',
    wUse: 'Use the word "{1}" in your answer.',
    wCapital: 'Start every sentence with a capital letter: "{1}…"',
    wCapitalOk: 'Every sentence starts with a capital letter.',
    wEnd: 'End your sentence with a full stop (.), a question mark (?) or an exclamation mark (!).',
    wI: 'Write "I" as a capital letter when it means yourself.',
    wSpaces: 'Use only one space between words.',
    wSpaceBefore: 'Do not put a space before a comma or a full stop.',
    wSpaceAfter: 'Put a space after a comma or a full stop.',
    wTwice: '"{1} {2}": the word is written twice.',
    wSpell: 'Check the spelling: "{1}" should be "{2}".',
    wSpellOk: 'No common spelling mistakes found.',
    eSubject: 'Add a subject line, for example "Subject: Leave request".',
    eSubjectOk: 'You have a subject line.',
    eGreet: 'Begin with a greeting, such as "Dear Sir" or "Dear Ms Rao".',
    eGreetOk: 'You greeted the reader.',
    eClose: 'End with a closing, such as "Kind regards" or "Yours sincerely", and your name.',
    eCloseOk: 'You closed the email politely.',
    lDate: 'Add the date near the top of the letter.',
    lDateOk: 'You wrote the date.',
    lSubject: 'Add a subject line, for example "Subject: Request for library hours".',
    lGreet: 'Begin with a formal greeting: "Respected Sir" or "Dear Madam".',
    lGreetOk: 'You used a formal greeting.',
    lClose: 'End a formal letter with "Yours faithfully" or "Yours sincerely" and your name.',
    lCloseOk: 'You ended the letter correctly.',
    // A talk (talkCheck.js checkTalk)
    tWords: 'You spoke {1} words — enough for this topic.',
    tUsed: 'You used this unit\'s words: {1}.',
    tLinked: 'You linked your ideas ({1}).',
    tMore: 'Say a little more: {1} of at least {2} words.',
    tTry: 'Try to use one of this unit\'s words: {1}.',
    tLink: 'Link your ideas with words like because, however, for example and finally.'
};

const CODES = ['kn', 'hi', 'ta', 'te', 'ml', 'mr', 'bn', 'gu', 'pa', 'or', 'ur', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'zh', 'ja', 'ko'];
const PACKS = Object.fromEntries(CODES.map((c) => [c, require(`./${c}`)]));

// Each message as a pattern: its {n} the student's words, anything at all.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERNS = Object.entries(KEYS).map(([id, en]) => {
    const order = [...en.matchAll(/\{(\d)\}/g)].map((m) => Number(m[1]));
    const re = new RegExp(`^${escape(en).replace(/\\\{\d\\\}/g, '(.*?)')}$`, 's');
    return { id, re, order };
});

/** The English message `text` in the language `code` (English, or unknown, as it is). */
const feedbackIn = (code, text) => {
    const pack = PACKS[code];
    if (!pack || typeof text !== 'string') return text;
    for (const { id, re, order } of PATTERNS) {
        const m = text.match(re);
        if (!m) continue;
        const said = pack[id];
        if (!said) return text;
        const values = Object.fromEntries(order.map((n, k) => [n, m[k + 1]]));
        return said.replace(/\{(\d)\}/g, (_, n) => values[n] ?? '');
    }
    return text;
};

/** Writing findings, corrected sentences and talk tips, in the student's language. */
const localizeFeedback = (code, out) => {
    if (!out || !PACKS[code]) return out;
    const tr = (t) => feedbackIn(code, t);
    return {
        ...out,
        ...(out.findings ? { findings: out.findings.map((f) => ({ ...f, text: tr(f.text) })) } : {}),
        ...(out.autoFeedback ? { autoFeedback: out.autoFeedback.map((f) => ({ ...f, text: tr(f.text) })) } : {}),
        ...(out.sentences ? { sentences: out.sentences.map((s) => ({ ...s, mistakes: (s.mistakes || []).map((m) => ({ ...m, why: tr(m.why) })) })) } : {}),
        ...(out.good ? { good: out.good.map(tr) } : {}),
        ...(out.tips ? { tips: out.tips.map(tr) } : {})
    };
};

module.exports = { KEYS, CODES, PACKS, feedbackIn, localizeFeedback };
