/**
 * Linguistic Ability — the speaking task's checklist, ticked from what the
 * student says (asked 2026-10-28: "it will automatically tick based on his
 * voice, don't give a tick option manually"). The browser writes down what is
 * said (TalkRecorder); each point of the checklist has a check here, and it is
 * ticked when what was said passes it. The student's page runs the same checks
 * as they speak (student src/linguistic/parts/speakTicks.js — keep the two
 * alike), and the server runs them again when the answer is saved.
 *
 * A check, by the point's place in the lesson's English checklist:
 *   groups   lists of words or phrases; one of each list must be said
 *            ("word*" also takes its endings; "#" is any number)
 *   times    how many times the first list's words must be said in all
 *   none     words that must not be said (fillers like "umm")
 *   words    at least so many words said
 *   pace     a steady pace: ten words or more, at 35 to 190 words a minute
 *   seconds  [least, most]: how long the student spoke
 *   passive  a passive sentence ("is put", "will be checked")
 *
 * Nothing here judges the sound of the voice itself: "sounded friendly" or
 * "calm" is ticked from polite words said at a steady pace.
 */

const GREET = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste', 'namaskara', 'namaskar'];
const THANKS = ['thank*', 'thanks', 'dhanyavad*'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'weekend'];
const TIME = ['#', "o'clock", 'clock', 'am', 'pm', 'a m', 'p m', 'morning', 'afternoon', 'evening', 'night', 'tonight', 'today', 'tomorrow', 'noon', 'half past', 'quarter', 'hour*', 'minute*', 'week', ...DAYS];
const POLITE = ['please', 'thank*', 'thanks', 'sorry', 'could you', 'would you', 'may i', 'kindly', 'excuse me'];
const CLOSE = [...THANKS, 'have a nice day', 'have a good day', 'goodbye', 'good bye', 'bye', 'see you', 'come back', 'take care'];
const NAME = ['my name', 'name is', 'myself', 'call me', "i'm", 'i am', 'this is'];
const STUDY = ['stud*', 'college', 'university', 'school', 'degree', 'course', 'first year', 'second year', 'third year', 'final year', 'bsc', 'bcom', 'bca', 'bba', 'ba', 'ma', 'msc', 'mba', 'engineering', 'diploma', 'puc', 'graduat*', 'bachelor*', 'master*'];
const PACE = { pace: true };

const CHECKS = {
    'speaking-beginner-1': [
        { groups: [NAME] },
        { groups: [['from', 'i live in', 'i stay in', 'native', 'hometown', 'home town', 'village', 'city']] },
        { groups: [STUDY] },
        { groups: [['hobby', 'hobbies', 'free time', 'spare time', 'like*', 'love*', 'enjoy*', 'interest*', 'fond of', 'play*', 'favourite', 'favorite']] },
        { words: 20 },
        PACE
    ],
    'speaking-beginner-2': [
        { groups: [GREET] },
        { groups: [['how much', 'price', 'cost*', 'rate']], times: 2 },
        { groups: [['give me', 'i want', 'i would like', "i'd like", 'i will take', "i'll take", 'i need', 'buy', 'can i have', 'can i get']] },
        { groups: [['total', 'altogether', 'all together', 'in all', 'how much is it', 'how much will it be', 'bill', 'everything']] },
        { groups: [THANKS] }
    ],
    'speaking-beginner-3': [
        { groups: [['excuse me']] },
        { groups: [['which bus', 'what bus', 'bus to', 'bus for', 'bus goes', 'bus go', 'goes to', 'go to']] },
        { groups: [['when', 'what time', 'leave*', 'depart*', 'start*', 'timing*']] },
        { groups: [['how much', 'price', 'cost*', 'fare', 'charge']] },
        { groups: [THANKS] },
        PACE
    ],
    'speaking-beginner-4': [
        { groups: [['free', 'busy', 'available', 'do you have time']] },
        { groups: [["let's go", 'lets go', 'go to', 'we can go', 'shall we', 'want to go', 'how about', 'park', 'movie', 'cinema', 'beach', 'temple', 'mall', 'market', 'library', 'garden']] },
        { groups: [TIME] },
        { groups: [['meet*']] },
        { groups: [['see you', 'bye', 'goodbye', 'good bye', 'take care', 'good night', 'talk later', 'catch you']] },
        PACE
    ],
    'speaking-intermediate-1': [
        { groups: [[...GREET, 'excuse me', 'sorry to', 'do you have a minute', 'please', 'may i']] },
        { groups: [['because', 'as i', 'since i', 'missed', 'absent', 'unwell', 'sick', 'could not', "couldn't", "wasn't", 'was not', "didn't", 'did not', 'so i']] },
        { groups: [['could you']] },
        { groups: [THANKS] },
        { groups: [[...POLITE, 'hi', 'hello', 'nice', 'great', 'really']], ...PACE }
    ],
    'speaking-intermediate-2': [
        { groups: [GREET] },
        { groups: [NAME, ['trainee', 'intern', 'new', 'join*', 'team', 'role', 'position', 'department', 'developer', 'engineer', 'assistant', 'executive', 'accountant', 'analyst', 'officer', 'designer', 'clerk', 'staff', 'teacher', 'manager']] },
        { groups: [THANKS] },
        { groups: [['could you', 'can you', 'what', 'which', 'when', 'where', 'who', 'how', 'will i', 'should i', 'may i', 'do i', 'is there', 'are there', 'can i']] },
        { groups: [[...POLITE, 'sir', 'madam', "ma'am", 'mam', 'good morning', 'good afternoon']], ...PACE }
    ],
    'speaking-intermediate-3': [
        { groups: [[...GREET, 'doctor']] },
        { groups: [['pain', 'ache', 'hurt*', 'fever', 'cold', 'cough*', 'sore', 'headache', 'stomach', 'tired', 'sick', 'unwell', 'problem', 'feel*', 'vomit*', 'dizzy', 'throat', 'infection', 'allergy', 'injur*', 'swelling', 'rash']] },
        { groups: [['since', 'for'], ['day*', 'week*', 'month*', 'hour*', 'yesterday', 'morning', 'night', 'last', 'ago', 'long', ...DAYS]] },
        { groups: [['should']] },
        { words: 20 },
        { groups: [THANKS] }
    ],
    'speaking-intermediate-4': [
        { groups: [GREET] },
        {
            groups: [
                ['match', 'concert', 'hike', 'trek*', 'game', 'show', 'movie', 'film', 'festival', 'party', 'play', 'event', 'trip', 'picnic'],
                TIME,
                ['at the', 'in the', 'ground', 'stadium', 'hall', 'park', 'college', 'auditorium', 'hill*', 'theatre', 'theater', 'club', 'near', 'place']
            ]
        },
        { groups: [['would you like']] },
        { groups: [['meet*'], TIME] },
        { groups: [['if you are busy', "if you're busy", "if you can't", 'if you cannot', 'if you can not', 'if not', "it's fine", 'it is fine', "that's fine", 'that is fine', 'no problem', 'another day', 'another time', 'next time', 'no worries']] },
        { words: 25 }
    ],
    'speaking-advanced-1': [
        { groups: [STUDY] },
        { groups: [['project', 'achiev*', 'won', 'win', 'award*', 'prize', 'managed', 'organi*', 'led', 'built', 'created', 'developed', 'handled', 'experience', 'internship', 'for example', 'certificate', 'competition', 'volunteer*']] },
        { groups: [['want to', 'would like to', 'looking for', 'hope to', 'plan to', 'planning', 'goal', 'aim', 'future', 'next', 'career', 'wish to', 'dream', 'grow']] },
        { seconds: [40, 100] },
        { none: ['um', 'umm', 'ummm', 'uh', 'uhh', 'uhm', 'er', 'erm', 'hmm', 'hmmm', 'ah', 'aah'], words: 40 },
        { words: 40, ...PACE }
    ],
    'speaking-advanced-2': [
        { groups: [[...GREET, 'thank you for calling', 'welcome', 'how may i help', 'how can i help']] },
        { groups: [['sorry', 'apolog*', 'regret']] },
        { groups: [['order number', 'number', 'detail*', 'share', 'could you tell', 'can you tell', 'may i know', 'your name', 'address', 'phone']] },
        { groups: [['i will', "i'll", 'we will', "we'll", 'i can', 'we can', 'send', 'deliver*', 'refund*', 'replace*', 'arrange', 'fix'], TIME] },
        { groups: [['anything else']] },
        { groups: [[...POLITE, 'happy to']], ...PACE }
    ],
    'speaking-advanced-3': [
        { groups: [GREET, ['i would like', "i'd like", 'i want', 'i need', 'open*', 'account', 'loan', "i'm here", 'i am here', 'i came']] },
        { groups: [['document*', 'interest', 'balance', 'charge*', 'fee*', 'rate', 'deposit*', 'atm', 'card', 'minimum', 'emi', 'repay*', 'period', 'tenure', 'cheque', 'passbook', 'proof', 'aadhaar', 'pan']], times: 2 },
        { groups: [['if'], ['would', 'can', 'could', 'will', 'should', 'what', 'how', 'is it', 'is there', 'do i']] },
        { groups: [['i would like', "i'd like", 'could you', 'would you', 'may i', 'please', 'kindly']], times: 2 },
        { groups: [CLOSE] },
        PACE
    ],
    'speaking-advanced-4': [
        { groups: [[...GREET, 'sir', 'madam', "ma'am", 'mam'], ['problem', 'waste*', 'left on', 'too much', 'issue', 'leak*', 'lot of', 'often', 'every day', 'empty']] },
        { groups: [['plan', 'suggest*', 'propos*', 'we will', "we'll", 'we can', 'we could', 'should', 'idea', 'install*', 'volunteer*']] },
        { passive: true },
        { groups: [['worr*', 'concern*', "don't worry", 'do not worry', 'what if', 'may think', 'might think', 'however', 'even if', 'in case', 'but we']] },
        { groups: [CLOSE] },
        PACE
    ]
};

/* ── A point written by an administrator: its check, guessed from its words ── */

const QUIET = new Set(['i', 'my', 'me', 'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'about', 'what', 'that', 'it', 'is', 'was', 'were', 'did', 'said', 'asked', 'talked', 'told', 'mentioned', 'spoke', 'used', 'gave', 'made', 'like', 'least', 'one', 'two', 'clearly', 'politely', 'correctly', 'once', 'some', 'them', 'they', 'their', 'this', 'how', 'why', 'when', 'where']);

const guess = (point) => {
    const p = String(point || '').toLowerCase();
    const quoted = [...p.matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1].replace(/[….?!]+$/g, '').trim()).filter(Boolean);
    if (quoted.length) return { groups: [quoted] };
    if (/thank/.test(p)) return { groups: [THANKS] };
    if (/greet/.test(p)) return { groups: [GREET] };
    if (/apologi/.test(p)) return { groups: [['sorry', 'apolog*']] };
    if (/minute/.test(p)) return { seconds: [40, 100] };
    if (/sentence/.test(p)) return { words: 20 };
    if (/slow|pace|voice|tone|sound|confiden|calm|friendly/.test(p)) return PACE;
    const keys = (p.match(/[a-z']+/g) || []).filter((w) => w.length > 3 && !QUIET.has(w));
    return keys.length ? { groups: [keys.map((w) => `${w.slice(0, 5)}*`)] } : { words: 10 };
};

/** The checks for a speaking lesson's checklist, one for each point (in the order the points are in). */
const checksFor = (lesson) => {
    const points = lesson?.speaking?.checklistEn || lesson?.speaking?.checklist || [];
    const own = CHECKS[lesson?.seedKey];
    return points.map((p, i) => (own && own.length === points.length ? own[i] : guess(p)));
};

/* ── Running a check on what was said ─────────────────────────────────── */

const clean = (said) => ` ${String(said || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[^\p{L}\p{N}'\s]+/gu, ' ').replace(/\s+/g, ' ').trim()} `;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patternOf = (phrase) => (phrase === '#' ? '\\p{N}+' : escape(phrase).replace(/\\\*/g, "[\\p{L}']*"));
const timesSaid = (text, phrases) => phrases.reduce((n, ph) => n + (text.match(new RegExp(`(?<= )${patternOf(ph)}(?= )`, 'gu')) || []).length, 0);
const wordCount = (said) => (String(said || '').match(/[\p{L}\p{N}'’-]+/gu) || []).length;
const PASSIVE = /(?<= )(is|are|was|were|be|been|being)( not| also| all| always| often| then| now)? (\p{L}+ed|put|set|cut|shut|done|paid|made|kept|built|sent|given|taken|seen|shown|known|told|held|left|found|brought|bought|caught|taught|thrown|written|chosen|grown|spent|run)(?= )/u;

/** Whether what was said (and how long it took, in seconds) passes a check. */
const passes = (check, said, seconds = 0) => {
    const text = clean(said);
    const n = wordCount(said);
    if (check.words && n < check.words) return false;
    if (check.groups?.length) {
        const [first, ...rest] = check.groups;
        if (timesSaid(text, first) < (check.times || 1)) return false;
        if (rest.some((g) => timesSaid(text, g) < 1)) return false;
    }
    if (check.none?.length && timesSaid(text, check.none) > 0) return false;
    if (check.passive && !PASSIVE.test(text)) return false;
    if (check.seconds && (seconds < check.seconds[0] || seconds > check.seconds[1])) return false;
    if (check.pace) {
        if (n < 10 || seconds <= 0) return false;
        const perMinute = n / (seconds / 60);
        if (perMinute < 35 || perMinute > 190) return false;
    }
    return !!(check.words || check.groups?.length || check.none?.length || check.passive || check.seconds || check.pace);
};

/** Each point of the lesson's checklist: whether what was said passes it. */
const ticksFor = (lesson, said, seconds = 0) => checksFor(lesson).map((c) => passes(c, said, seconds));

/** How many points must be heard to go on: half of them, rounded up. */
const needed = (total) => Math.ceil(total / 2);

module.exports = { CHECKS, checksFor, ticksFor, passes, needed, wordCount };
