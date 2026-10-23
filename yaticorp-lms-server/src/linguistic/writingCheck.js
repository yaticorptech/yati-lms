/**
 * Linguistic Ability — rule-based feedback on a piece of writing (asked
 * 2026-10-22: "rule-based spelling or punctuation feedback where feasible").
 *
 * No dictionary service and no AI: these are checks a rule can make
 * reliably. Length; capital letters and full stops; the lone lower-case "i";
 * spacing around punctuation; a word written twice; a list of words learners
 * commonly misspell; and, for an email or a letter, the parts it should have.
 * Each finding is { kind: 'good' | 'tip', text }. It never grades the ideas —
 * a teacher reviews open-ended writing (LinguisticSubmission).
 */

// Common learner misspellings → the correct spelling.
const MISSPELT = {
    recieve: 'receive', recieved: 'received', beleive: 'believe', acheive: 'achieve', acheived: 'achieved', untill: 'until',
    tommorow: 'tomorrow', tommorrow: 'tomorrow', tomorow: 'tomorrow', occured: 'occurred', occurence: 'occurrence', seperate: 'separate',
    definately: 'definitely', goverment: 'government', enviroment: 'environment', wich: 'which', becuase: 'because', becoz: 'because',
    beacuse: 'because', freind: 'friend', freinds: 'friends', thier: 'their', truely: 'truly', begining: 'beginning', writting: 'writing',
    accomodation: 'accommodation', adress: 'address', arguement: 'argument', basicly: 'basically', calender: 'calendar', collegue: 'colleague',
    comming: 'coming', commitee: 'committee', completly: 'completely', concious: 'conscious', curiousity: 'curiosity', dissapoint: 'disappoint',
    embarass: 'embarrass', excercise: 'exercise', existance: 'existence', foriegn: 'foreign', fourty: 'forty', grammer: 'grammar',
    happend: 'happened', immediatly: 'immediately', independant: 'independent', intrested: 'interested', knowlege: 'knowledge', libary: 'library',
    millenium: 'millennium', neccessary: 'necessary', necesary: 'necessary', noticable: 'noticeable', ocasion: 'occasion', oppurtunity: 'opportunity',
    oportunity: 'opportunity', paralel: 'parallel', peice: 'piece', posession: 'possession', prefered: 'preferred', priviledge: 'privilege',
    proffesional: 'professional', profesional: 'professional', publically: 'publicly', realy: 'really', reccomend: 'recommend', recomend: 'recommend',
    refered: 'referred', relevent: 'relevant', resturant: 'restaurant', rythm: 'rhythm', sincerly: 'sincerely', succesful: 'successful',
    sucess: 'success', suprise: 'surprise', thankyou: 'thank you', tounge: 'tongue', wierd: 'weird', wether: 'whether', alot: 'a lot',
    anyways: 'anyway', aswell: 'as well', infact: 'in fact', inspite: 'in spite', ofcourse: 'of course', everytime: 'every time',
    studing: 'studying', stoped: 'stopped', planing: 'planning', droped: 'dropped', liesure: 'leisure', excelent: 'excellent',
    responsiblity: 'responsibility', experiance: 'experience', expirience: 'experience', mangement: 'management', comunication: 'communication',
    communciation: 'communication', interveiw: 'interview', intrview: 'interview', applicaton: 'application', mesage: 'message', plz: 'please', pls: 'please'
};

const sentencesOf = (text) => String(text).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const wordCount = (text) => (String(text).trim().match(/[\p{L}\p{N}'’-]+/gu) || []).length;

/**
 * @param {string} text   what the student wrote
 * @param {object} task   { type: 'sentence' | 'paragraph' | 'email' | 'letter', minWords, mustInclude }
 * @returns {{ findings: Array<{kind, text}>, ok: boolean, words: number }}
 *          ok — no tip that a sentence task must pass (used to accept a sentence)
 */
const checkWriting = (text, task = {}) => {
    const raw = String(text || '');
    const t = raw.trim();
    const findings = [];
    const tip = (s) => findings.push({ kind: 'tip', text: s });
    const good = (s) => findings.push({ kind: 'good', text: s });
    const n = wordCount(t);
    let blocking = false;

    if (!t) return { findings: [{ kind: 'tip', text: 'Write your answer first.' }], ok: false, words: 0 };

    // Length
    if (task.minWords && n < task.minWords) { tip(`Write a little more: you have ${n} word${n === 1 ? '' : 's'}, and this task needs at least ${task.minWords}.`); blocking = true; } else if (task.minWords) good(`Good length: ${n} words.`);

    // Words the task asked for
    for (const w of task.mustInclude || []) {
        if (!new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t)) { tip(`Use the word "${w}" in your answer.`); blocking = true; }
    }

    // Capital letters and full stops
    const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const body = task.type === 'email' || task.type === 'letter' ? lines.filter((l) => !/^(subject|to|from|date)\s*:/i.test(l) && wordCount(l) > 3).join(' ') : t;
    const sentences = sentencesOf(body);
    const lowerStarts = sentences.filter((s) => /^[a-z]/.test(s));
    if (lowerStarts.length) { tip(`Start every sentence with a capital letter: "${lowerStarts[0].slice(0, 40)}…"`); blocking = true; } else if (sentences.length) good('Every sentence starts with a capital letter.');
    if (body && !/[.!?]["')\]]?$/.test(body.trim())) { tip('End your sentence with a full stop (.), a question mark (?) or an exclamation mark (!).'); blocking = true; }
    if (/(^|[\s"(])i(?=[\s,.!?'’]|$)/.test(t)) { tip('Write "I" as a capital letter when it means yourself.'); blocking = true; }

    // Spacing
    if (/ {2,}/.test(raw.replace(/\n/g, ''))) tip('Use only one space between words.');
    if (/\s[,.!?;:]/.test(t.replace(/\n/g, ' '))) tip('Do not put a space before a comma or a full stop.');
    if (/[,;:][A-Za-z]/.test(t) || /[a-z]\.[A-Z][a-z]/.test(t)) tip('Put a space after a comma or a full stop.');

    // A word twice in a row: "the the"
    const twice = t.match(/\b(\w+)\s+\1\b/i);
    if (twice && !/^(that|had|very|so)$/i.test(twice[1])) tip(`"${twice[1]} ${twice[1]}": the word is written twice.`);

    // Spelling, from the list of common misspellings
    const seen = new Set();
    for (const w of (t.toLowerCase().match(/[a-z]+/g) || [])) {
        if (MISSPELT[w] && !seen.has(w)) { seen.add(w); tip(`Check the spelling: "${w}" should be "${MISSPELT[w]}".`); }
    }
    if (!seen.size && n >= 3) good('No common spelling mistakes found.');

    // The parts of an email or a letter
    if (task.type === 'email') {
        if (!/^\s*subject\s*:/im.test(t)) tip('Add a subject line, for example "Subject: Leave request".'); else good('You have a subject line.');
        if (!/\b(dear|hello|hi|respected|good (morning|afternoon|evening))\b/i.test(t)) tip('Begin with a greeting, such as "Dear Sir" or "Dear Ms Rao".'); else good('You greeted the reader.');
        if (!/\b(regards|sincerely|faithfully|thank you|thanks|best wishes)\b/i.test(t)) tip('End with a closing, such as "Kind regards" or "Yours sincerely", and your name.'); else good('You closed the email politely.');
    }
    if (task.type === 'letter') {
        if (!/\b(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/i.test(t)) tip('Add the date near the top of the letter.'); else good('You wrote the date.');
        if (!/^\s*subject\s*:/im.test(t)) tip('Add a subject line, for example "Subject: Request for library hours".'); else good('You have a subject line.');
        if (!/\b(dear|respected)\b/i.test(t)) tip('Begin with a formal greeting: "Respected Sir" or "Dear Madam".'); else good('You used a formal greeting.');
        if (!/\byours\s+(faithfully|sincerely|truly)\b/i.test(t)) tip('End a formal letter with "Yours faithfully" or "Yours sincerely" and your name.'); else good('You ended the letter correctly.');
    }
    return { findings, ok: !blocking, words: n };
};

module.exports = { checkWriting, wordCount, MISSPELT };
