/**
 * Linguistic Ability — the lesson screens' own words in the student's
 * language (asked 2026-10-24: a Kannada speaker learning English cannot read
 * instructions and buttons written in English). Kannada here; every other
 * language's in sayLangs.js (2026-10-24); English speakers, and any text not
 * written, stay English. Keyed by the English text, so a screen wraps what it
 * already says: T('Check').
 *
 * The questions themselves come from the server already in Kannada; what is
 * being learnt (the choices, the English sentence to work on) stays English,
 * and the English question is not shown beside it (asked 2026-10-24: "how do
 * they know English to read that question?").
 */
import { PRAISE } from './meta';
import { KEYS, WORDS, LINES as MORE_LINES } from './sayLangs';

// Every other language's words (sayLangs.js, 2026-10-24), looked up by the English.
const MORE = Object.fromEntries(Object.entries(WORDS).map(([code, words]) => [code, Object.fromEntries(KEYS.map((k, i) => [k, words[i]]))]));

const KN = {
    // The session around the questions
    Check: 'ಪರಿಶೀಲಿಸಿ', Continue: 'ಮುಂದುವರಿಸಿ', Finish: 'ಮುಗಿಸಿ', Save: 'ಉಳಿಸಿ', Submit: 'ಸಲ್ಲಿಸಿ',
    'Checking…': 'ಪರಿಶೀಲಿಸುತ್ತಿದೆ…', 'Saving…': 'ಉಳಿಸುತ್ತಿದೆ…', 'Try again': 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ', 'Got it': 'ಅರ್ಥವಾಯಿತು',
    'Model answer': 'ಮಾದರಿ ಉತ್ತರ', 'Why: ': 'ಏಕೆ: ', 'Keep learning': 'ಕಲಿಕೆ ಮುಂದುವರಿಸಿ', 'End session': 'ಅವಧಿ ಮುಗಿಸಿ',
    "Wait, don't go!": 'ಸ್ವಲ್ಪ ನಿಲ್ಲಿ, ಹೋಗಬೇಡಿ!', "You'll lose your progress in this session if you quit now.": 'ಈಗ ಬಿಟ್ಟು ಹೋದರೆ ಈ ಅವಧಿಯ ಪ್ರಗತಿ ಕಳೆದುಹೋಗುತ್ತದೆ.',
    'Previous mistake': 'ಹಿಂದಿನ ತಪ್ಪು', 'Skip to quiz': 'ರಸಪ್ರಶ್ನೆಗೆ ಹೋಗಿ', "Can't speak now": 'ಈಗ ಮಾತನಾಡಲು ಆಗುತ್ತಿಲ್ಲ', Skip: 'ಬಿಡಿ',
    'Something went wrong.': 'ಏನೋ ತಪ್ಪಾಗಿದೆ.', 'Press the button to try again.': 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಲು ಬಟನ್ ಒತ್ತಿ.',
    // The screens
    'Tap the card to see what it means': 'ಅರ್ಥ ನೋಡಲು ಕಾರ್ಡ್ ಒತ್ತಿ', 'Tap to flip': 'ತಿರುಗಿಸಲು ಒತ್ತಿ', 'New words': 'ಹೊಸ ಪದಗಳು',
    Learn: 'ಕಲಿಯಿರಿ', Examples: 'ಉದಾಹರಣೆಗಳು', Read: 'ಓದಿ', Listen: 'ಕೇಳಿ', 'Read aloud': 'ಓದಿ ಕೇಳಿಸಿ', Stop: 'ನಿಲ್ಲಿಸಿ',
    'Listen to the conversation': 'ಸಂಭಾಷಣೆಯನ್ನು ಕೇಳಿ', 'Useful phrases': 'ಉಪಯುಕ್ತ ವಾಕ್ಯಗಳು', 'Hear the conversation again': 'ಸಂಭಾಷಣೆಯನ್ನು ಮತ್ತೆ ಕೇಳಿ',
    'Fill in the blank': 'ಖಾಲಿ ಜಾಗ ತುಂಬಿ', 'Type the missing word': 'ಬಿಟ್ಟುಹೋದ ಪದವನ್ನು ಬರೆಯಿರಿ',
    'Correct this sentence': 'ಈ ವಾಕ್ಯವನ್ನು ಸರಿಪಡಿಸಿ', 'Write the correct sentence': 'ಸರಿಯಾದ ವಾಕ್ಯವನ್ನು ಬರೆಯಿರಿ',
    'Type in English': 'ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಬರೆಯಿರಿ', 'Hear it in English': 'ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಕೇಳಿ', 'Translate this passage': 'ಈ ಭಾಗವನ್ನು ಅನುವಾದಿಸಿ',
    'Put the words in order': 'ಪದಗಳನ್ನು ಕ್ರಮವಾಗಿ ಜೋಡಿಸಿ', 'Make a sentence': 'ಒಂದು ವಾಕ್ಯ ಮಾಡಿ', 'Write a paragraph': 'ಒಂದು ಪ್ಯಾರಾಗ್ರಾಫ್ ಬರೆಯಿರಿ',
    'Write an email': 'ಒಂದು ಇಮೇಲ್ ಬರೆಯಿರಿ', 'Write a letter': 'ಒಂದು ಪತ್ರ ಬರೆಯಿರಿ', Write: 'ಬರೆಯಿರಿ',
    Speak: 'ಮಾತನಾಡಿ', 'Your turn to speak': 'ಈಗ ನೀವು ಮಾತನಾಡಿ', 'Show a sample answer': 'ಮಾದರಿ ಉತ್ತರ ತೋರಿಸಿ', 'Hide the sample answer': 'ಮಾದರಿ ಉತ್ತರ ಮರೆಮಾಡಿ',
    'Hear the sample': 'ಮಾದರಿ ಕೇಳಿ', 'After you listen back, tick what you did': 'ನಿಮ್ಮ ಧ್ವನಿಮುದ್ರಣ ಕೇಳಿದ ನಂತರ, ನೀವು ಮಾಡಿದ್ದನ್ನು ಗುರುತು ಮಾಡಿ',
    'Tap the matching pairs': 'ಹೊಂದುವ ಜೋಡಿಗಳನ್ನು ಒತ್ತಿ', 'Warm up: this unit’s words': 'ಅಭ್ಯಾಸ: ಈ ಘಟಕದ ಪದಗಳು', 'Use word bank': 'ಪದಗಳ ಸಂಗ್ರಹ ಬಳಸಿ', 'Use keyboard': 'ಕೀಬೋರ್ಡ್ ಬಳಸಿ',
    'Hint: ': 'ಸುಳಿವು: ',
    // The sheet under a checked answer
    'Correct solution:': 'ಸರಿಯಾದ ಉತ್ತರ:', 'Nearly — check the spelling:': 'ಸ್ವಲ್ಪದರಲ್ಲಿ ತಪ್ಪಿತು — ಕಾಗುಣಿತ ನೋಡಿ:',
    'Almost there! Correct solution:': 'ಬಹುತೇಕ ಸರಿ! ಸರಿಯಾದ ಉತ್ತರ:', 'Correct — mind the small differences': 'ಸರಿ — ಸಣ್ಣ ವ್ಯತ್ಯಾಸಗಳನ್ನು ಗಮನಿಸಿ',
    'Sent to your teacher': 'ನಿಮ್ಮ ಶಿಕ್ಷಕರಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ', Checked: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    'No grammar mistakes found': 'ವ್ಯಾಕರಣ ತಪ್ಪುಗಳು ಕಂಡುಬಂದಿಲ್ಲ', 'Fix the marked words': 'ಗುರುತಿಸಿದ ಪದಗಳನ್ನು ಸರಿಪಡಿಸಿ', 'You wrote': 'ನೀವು ಬರೆದದ್ದು', 'Compare your translation with the model below.': 'ನಿಮ್ಮ ಅನುವಾದವನ್ನು ಕೆಳಗಿನ ಮಾದರಿಯೊಂದಿಗೆ ಹೋಲಿಸಿ.',
    'Model translation': 'ಮಾದರಿ ಅನುವಾದ', 'Read the tips and compare with the model answer while you wait.': 'ಕಾಯುತ್ತಿರುವಾಗ ಸಲಹೆಗಳನ್ನು ಓದಿ, ಮಾದರಿ ಉತ್ತರದೊಂದಿಗೆ ಹೋಲಿಸಿ.',
    'Good sentence!': 'ಒಳ್ಳೆಯ ವಾಕ್ಯ!', 'Another way to say it': 'ಇದನ್ನು ಹೇಳುವ ಇನ್ನೊಂದು ರೀತಿ', 'Almost — fix these:': 'ಬಹುತೇಕ ಸರಿ — ಇವುಗಳನ್ನು ಸರಿಪಡಿಸಿ:',
    'Sample answer': 'ಮಾದರಿ ಉತ್ತರ', Saved: 'ಉಳಿಸಲಾಗಿದೆ', 'A full self-check. Well spoken!': 'ಎಲ್ಲವನ್ನೂ ಗುರುತು ಮಾಡಿದ್ದೀರಿ. ಚೆನ್ನಾಗಿ ಮಾತನಾಡಿದಿರಿ!',
    'Listen to your recording again, and try once more if you like.': 'ನಿಮ್ಮ ಧ್ವನಿಮುದ್ರಣವನ್ನು ಮತ್ತೆ ಕೇಳಿ; ಬೇಕಿದ್ದರೆ ಇನ್ನೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.',
    // Speak on a topic (Advanced)
    'Speak on a topic': 'ಒಂದು ವಿಷಯದ ಬಗ್ಗೆ ಮಾತನಾಡಿ', 'What to talk about': 'ಏನು ಮಾತನಾಡಬೇಕು', 'Try to use': 'ಇವುಗಳನ್ನು ಬಳಸಲು ಪ್ರಯತ್ನಿಸಿ',
    'Useful ways to start': 'ಆರಂಭಿಸಲು ಉಪಯುಕ್ತ ವಾಕ್ಯಗಳು', 'Your talk': 'ನಿಮ್ಮ ಮಾತು', 'words': 'ಪದಗಳು',
    'Fix any words the microphone heard wrong, or type here.': 'ಮೈಕ್ರೊಫೋನ್ ತಪ್ಪಾಗಿ ಕೇಳಿದ ಪದಗಳನ್ನು ಸರಿಪಡಿಸಿ, ಅಥವಾ ಇಲ್ಲಿ ಬರೆಯಿರಿ.',
    'Your sentences, corrected': 'ನಿಮ್ಮ ವಾಕ್ಯಗಳು, ತಿದ್ದುಪಡಿಯೊಂದಿಗೆ', 'You said': 'ನೀವು ಹೇಳಿದ್ದು', Better: 'ಸರಿಯಾದ ರೂಪ',
    'No mistakes found': 'ತಪ್ಪುಗಳು ಕಂಡುಬಂದಿಲ್ಲ', 'Well spoken!': 'ಚೆನ್ನಾಗಿ ಮಾತನಾಡಿದಿರಿ!', 'Say a little more': 'ಇನ್ನೂ ಸ್ವಲ್ಪ ಮಾತನಾಡಿ',
    'Fix these, then speak again': 'ಇವುಗಳನ್ನು ಸರಿಪಡಿಸಿ, ನಂತರ ಮತ್ತೆ ಮಾತನಾಡಿ',
    'Listening…': 'ಕೇಳುತ್ತಿದೆ…', 'tap to stop': 'ನಿಲ್ಲಿಸಲು ಒತ್ತಿ', 'Tap to add more': 'ಇನ್ನಷ್ಟು ಹೇಳಲು ಒತ್ತಿ', 'Tap the microphone and speak': 'ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿ ಮಾತನಾಡಿ',
    'Listen to yourself': 'ನಿಮ್ಮ ಧ್ವನಿ ಕೇಳಿ', 'Your browser writes down what you say. The recording stays on this device.': 'ನೀವು ಹೇಳಿದ್ದನ್ನು ನಿಮ್ಮ ಬ್ರೌಸರ್ ಬರೆದುಕೊಳ್ಳುತ್ತದೆ. ಧ್ವನಿಮುದ್ರಣ ಈ ಸಾಧನದಲ್ಲೇ ಇರುತ್ತದೆ.',
    'This browser cannot write down speech. Speak, listen back, then type what you said below.': 'ಈ ಬ್ರೌಸರ್ ಮಾತನ್ನು ಬರೆಯಲಾರದು. ಮಾತನಾಡಿ, ಮತ್ತೆ ಕೇಳಿ, ನಂತರ ನೀವು ಹೇಳಿದ್ದನ್ನು ಕೆಳಗೆ ಬರೆಯಿರಿ.',
    // The quiz
    'Quiz time!': 'ರಸಪ್ರಶ್ನೆ ಸಮಯ!', 'Type this word in English': 'ಈ ಪದವನ್ನು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಬರೆಯಿರಿ',
    // The placement test and the daily challenge
    'Let’s find your English level': 'ನಿಮ್ಮ ಇಂಗ್ಲಿಷ್ ಮಟ್ಟವನ್ನು ತಿಳಿಯೋಣ', 'Retake the placement test': 'ಮಟ್ಟದ ಪರೀಕ್ಷೆಯನ್ನು ಮತ್ತೆ ತೆಗೆದುಕೊಳ್ಳಿ',
    'Daily challenge': 'ದಿನದ ಸವಾಲು'
};
const PRAISE_KN = ['ಚೆನ್ನಾಗಿದೆ!', 'ಭೇಷ್!', 'ಅದ್ಭುತ!', 'ಸರಿಯಾಗಿದೆ!', 'ಅತ್ಯುತ್ತಮ!', 'ಸರಿ ಉತ್ತರ!', 'ಶಭಾಷ್!', 'ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ!'];
// Language names in Kannada, for "write this in …" (the name and ಭಾಷೆ, which needs no case ending).
const KN_NAMES = {
    English: 'ಇಂಗ್ಲಿಷ್', Kannada: 'ಕನ್ನಡ', Hindi: 'ಹಿಂದಿ', Tamil: 'ತಮಿಳು', Telugu: 'ತೆಲುಗು', Malayalam: 'ಮಲಯಾಳಂ', Marathi: 'ಮರಾಠಿ',
    Bengali: 'ಬಂಗಾಳಿ', Gujarati: 'ಗುಜರಾತಿ', Punjabi: 'ಪಂಜಾಬಿ', Odia: 'ಒಡಿಯಾ', Urdu: 'ಉರ್ದು', Spanish: 'ಸ್ಪ್ಯಾನಿಷ್', French: 'ಫ್ರೆಂಚ್',
    German: 'ಜರ್ಮನ್', Portuguese: 'ಪೋರ್ಚುಗೀಸ್', Russian: 'ರಷ್ಯನ್', Arabic: 'ಅರೇಬಿಕ್', Chinese: 'ಚೈನೀಸ್', Japanese: 'ಜಪಾನೀಸ್', Korean: 'ಕೊರಿಯನ್'
};

/** The words that take a number or a name, in English and in Kannada. */
const LINES = {
    en: {
        inARow: (n) => `${n} in a row`,
        quizIntro: (n, pass) => `${n} questions. Get ${pass}% or more to finish the lesson.`,
        ticked: (a, b) => `Saved: ${a} of ${b} ticked`,
        writeIn: (name) => `Write this in ${name}`,
        letters: (name, open) => (open ? `Hide ${name} letters` : `${name} letters`),
        lettersCount: (n) => `${n} letters`,
        placementIntro: (n) => `${n} quick questions, from easy to hard. No hearts and no marks until the end — just do your best.`,
        dailyIntro: (n) => `${n} quick word questions at your level. New ones every day!`,
        talkResult: (clean, total, words) => `${clean} of ${total} sentences with no mistakes · ${words} words`,
        talkShort: (words, min) => `You said ${words} words. Speak for at least ${min} words.`,
        writeResult: (clean, total) => `${clean} of ${total} sentences with no mistakes`
    },
    kn: {
        inARow: (n) => `ಸತತ ${n} ಸರಿ`,
        quizIntro: (n, pass) => `${n} ಪ್ರಶ್ನೆಗಳು. ಪಾಠ ಮುಗಿಸಲು ${pass}% ಅಥವಾ ಹೆಚ್ಚು ಅಂಕ ಪಡೆಯಿರಿ.`,
        ticked: (a, b) => `ಉಳಿಸಲಾಗಿದೆ: ${b}ರಲ್ಲಿ ${a} ಗುರುತು ಮಾಡಲಾಗಿದೆ`,
        writeIn: (name) => `ಇದನ್ನು ${KN_NAMES[name] || name} ಭಾಷೆಯಲ್ಲಿ ಬರೆಯಿರಿ`,
        letters: (name, open) => `${KN_NAMES[name] || name} ಅಕ್ಷರಗಳು${open ? ' ಮರೆಮಾಡಿ' : ''}`,
        lettersCount: (n) => `${n} ಅಕ್ಷರಗಳು`,
        placementIntro: (n) => `ಸುಲಭದಿಂದ ಕಠಿಣದವರೆಗೆ ${n} ಚಿಕ್ಕ ಪ್ರಶ್ನೆಗಳು. ಕೊನೆಯವರೆಗೂ ಅಂಕ ತೋರಿಸುವುದಿಲ್ಲ — ನಿಮ್ಮ ಕೈಲಾದಷ್ಟು ಚೆನ್ನಾಗಿ ಉತ್ತರಿಸಿ.`,
        dailyIntro: (n) => `ನಿಮ್ಮ ಮಟ್ಟದ ${n} ಚಿಕ್ಕ ಪದ ಪ್ರಶ್ನೆಗಳು. ಪ್ರತಿದಿನ ಹೊಸ ಪ್ರಶ್ನೆಗಳು!`,
        talkResult: (clean, total, words) => `${total} ವಾಕ್ಯಗಳಲ್ಲಿ ${clean} ತಪ್ಪಿಲ್ಲದವು · ${words} ಪದಗಳು`,
        talkShort: (words, min) => `ನೀವು ${words} ಪದಗಳನ್ನು ಹೇಳಿದಿರಿ. ಕನಿಷ್ಠ ${min} ಪದಗಳಷ್ಟು ಮಾತನಾಡಿ.`,
        writeResult: (clean, total) => `${total} ವಾಕ್ಯಗಳಲ್ಲಿ ${clean} ತಪ್ಪಿಲ್ಲದವು`
    }
};

/** A screen's words in `lang`: T('Check') → ಪರಿಶೀಲಿಸಿ for Kannada, जाँचें for Hindi…; English where there is none. */
export const tr = (lang) => (text) => (lang === 'kn' ? KN[text] : MORE[lang]?.[text]) || text;
/** The words that take a number or a name: line(lang, 'inARow', 3). */
export const line = (lang, key, ...args) => (LINES[lang]?.[key] || MORE_LINES[lang]?.[key] || LINES.en[key])(...args);
/** Praise for a right answer, in `lang`. */
export const praiseIn = (lang) => (lang === 'kn' ? PRAISE_KN : MORE_LINES[lang]?.praise || PRAISE);
