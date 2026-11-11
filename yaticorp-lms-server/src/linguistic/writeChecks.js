/**
 * The writing tasks' checklists, ticked from what the student writes (2026-11-07, the user, of "I said what time I wake
 * up" under a writing box: "why did you put this?"; chose: each point ticks itself as they write, like the speaking
 * checklist). A check for each point, by its English text (the same point in two tasks, the same check), in the
 * speaking checks' terms (speakChecks.js) and a few of writing's own:
 *
 *   sentences   at least so many sentences
 *   capitals    every sentence starts with a capital letter
 *   stops       every sentence ends with a full stop (or ? or !)
 *   subject     a "Subject:" line — `true`, or words one of which it names
 *   most        at most so many words
 *   afterShould every "should" followed by a plain verb ("should drink", not "should drinks" / "should to drink")
 *
 * The student's page runs the same checks as they type (student src/linguistic/parts/speakTicks.js — keep the two alike).
 * A guide, not a mark: nothing here stops the student going on.
 */
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
const HOURS = ['#', "o'clock", 'am', 'pm', 'a m', 'p m', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'half past', 'quarter'];
const WHEN = ['#', ...DAYS, ...MONTHS, 'today', 'tomorrow', 'yesterday', 'last week', 'last month', 'next week', 'ago', 'recently', 'date'];
const POLITE = ['please', 'thank*', 'thanks', 'sorry', 'could you', 'would you', 'may i', 'kindly', 'excuse me', 'grateful', 'appreciate', 'regards', 'sincerely'];
const CLOSE = ['regards', 'sincerely', 'faithfully', 'thank you', 'thanks', 'yours', 'best wishes'];

const CHECKS = {
    'Each sentence starts with a capital letter': { capitals: true },
    'I used time words like first, then and after that': { groups: [['first', 'then', 'after that', 'next', 'later', 'finally', 'after breakfast', 'after lunch', 'after school', 'after college']], times: 2 },
    'Each sentence ends with a full stop': { stops: true },
    'I said thank you clearly': { groups: [['thank*', 'thanks']] },
    'I said what my friend did': { groups: [['you helped', 'you gave', 'you sent', 'you came', 'you bought', 'you made', 'you taught', 'you showed', 'you lent', 'you brought', 'you took', 'you told', 'you cooked', 'you visited', 'you explained', 'you shared', 'for helping', 'for teaching', 'for giving', 'for lending', 'for coming', 'for your', 'helped me']] },
    'I ended in a friendly way': { groups: [['see you', 'take care', 'your friend', 'love', 'best wishes', 'bye', 'thanks again', 'thank you again', 'cheers', 'soon', 'miss you', 'with love', 'your best friend', 'happy', 'friend', 'my dear']] },
    'I gave at least three ideas': { sentences: 3 },
    'I used linking words (also, and, instead of)': { groups: [['also', 'instead of', 'and', 'because', 'so', 'but', 'or']], times: 2 },
    'My paragraph has a clear first and last sentence': { sentences: 3 },
    'I wrote a clear subject line': { subject: true },
    'I greeted my teacher politely': { groups: [['dear', 'respected', 'good morning', 'good afternoon', "ma'am", 'madam', 'sir']] },
    'I gave the reason and the date': { groups: [['because', 'as i', 'due to', 'reason', 'since', 'as my', 'for my', 'not feeling well', 'unwell', 'sick', 'fever', 'ill', 'advised', 'so i', 'wedding', 'function', 'appointment'], WHEN] },
    'I ended with "Yours sincerely" and my name': { groups: [['yours sincerely', 'sincerely']] },
    'I wrote the address, date and subject': { subject: true, groups: [['to', 'principal'], ['#', ...MONTHS, 'date']] },
    'I used a formal greeting (Respected Sir / Madam)': { groups: [['respected sir', 'respected madam', 'dear sir', 'dear madam', 'respected']] },
    'I gave reasons for the request': { groups: [['because', 'as', 'due to', 'since', 'so that', 'reason', 'therefore', 'which', 'do not have', "don't have", 'need*', 'difficult', 'problem']] },
    'I ended with "Yours faithfully" and my name': { groups: [['yours faithfully', 'faithfully']] },
    'My subject line names the role': { subject: ['role', 'position', 'post', 'job', 'application', 'developer', 'engineer', 'analyst', 'designer', 'manager', 'assistant', 'intern*', 'executive', 'officer', 'trainee', 'teacher', 'clerk', 'accountant', 'tester', 'associate', 'support', 'sales', 'marketing'] },
    'I mentioned when I applied': { groups: [['applied', 'application', 'submitted', 'sent my', 'i sent'], WHEN] },
    'I stayed polite and short': { groups: [POLITE], most: 150 },
    'I ended with a closing and my contact details': { groups: [CLOSE, ['#', 'phone', 'mobile', 'email', 'e mail', 'contact', 'gmail', 'number', 'call me', 'reach me']] },
    'I said where I went': { groups: [['went to', 'visited', 'travel* to', 'trip to', 'reached', 'we went', 'i went', 'went']] },
    'I said how I travelled': { groups: [['by bus', 'by train', 'by car', 'by bike', 'by plane', 'by air', 'by auto', 'on foot', 'walked', 'drove', 'flew', 'bus', 'train', 'car', 'bike', 'flight', 'plane', 'auto', 'taxi', 'scooter', 'boat', 'ship', 'jeep', 'van']] },
    'I used past tense verbs like went and saw': { groups: [['went', 'saw', 'was', 'were', 'visited', 'travelled', 'traveled', 'took', 'had', 'ate', 'bought', 'came', 'reached', 'enjoyed', 'played', 'stayed', 'returned', 'walked', 'got', 'met', 'made', 'felt', 'left', 'sat', 'spent', 'gave', 'ran', 'swam', 'drank', 'slept', 'looked', 'liked', 'loved', 'started', 'arrived', 'watched', 'climbed', 'took', 'clicked', 'bought']], times: 2 },
    'I used "should" at least twice': { groups: [['should']], times: 2 },
    'I gave more than one piece of advice': { groups: [['should', 'try', 'you can', "don't", 'do not', 'make sure', 'avoid', 'remember', 'it is good', 'it is better']], times: 2 },
    'I used the plain verb after should': { afterShould: true },
    'I ended kindly': { groups: [['hope', 'take care', 'feel better', 'good luck', 'best wishes', 'you can do it', 'get well', 'all the best', 'i am sure', "don't worry", 'dont worry', 'i believe', 'you will', 'sorry', 'help']] },
    'I gave at least two reasons': { groups: [['because', 'so', 'since', 'as', 'first', 'second', 'also', 'another', 'reason', 'secondly', 'firstly', 'besides']], times: 2 },
    'I used at least one "if" sentence correctly': { groups: [['if'], ['will', 'would', 'can', 'could', 'should', 'may', 'might']] },
    'I used words from this unit (budget, save, risk…)': { groups: [['budget*', 'save*', 'saving*', 'risk*', 'invest*', 'expense*', 'afford*', 'loan*', 'profit*']] },
    'My paragraph has a clear opening and ending': { sentences: 3 },
    'I said what time I wake up': { groups: [['wake*', 'woke', 'get up', 'got up', 'getting up'], HOURS] },
    'I wrote about the morning and the evening': { groups: [['morning', 'wake*', 'woke', 'breakfast', 'get up'], ['evening', 'night', 'dinner', 'bed']] },
    'I used the present simple, like I eat and I go': { groups: [['i eat', 'i go', 'i wake', 'i have', 'i drink', 'i take', 'i read', 'i study', 'i play', 'i watch', 'i sleep', 'i brush', 'i work', 'i get', 'i come', 'i walk', 'i cook', 'i help', 'i do', 'i like', 'i leave', 'i reach', 'i finish', 'i return', 'i start', 'i usually', 'i always', 'i often', 'i sometimes', 'i never', 'i sit', 'i talk', 'i listen', 'i wash', 'i bath*', 'i catch', 'i spend', 'i go*', 'i take*']] },
    'I said what I do on Saturday and Sunday': { groups: [['saturday*'], ['sunday*']] },
    'I compared two things with "than"': { groups: [['than']] },
    'I used a superlative with "the" (the best, the most…)': { groups: [['the best', 'the most', 'the worst', 'the least', 'the *est']] },
    'I used the right form: -er or more, -est or most': { groups: [['*er than', 'more', 'most', 'the *est', 'better', 'worse', 'best', 'worst']], none: ['more better', 'most best', 'more easier', 'most easiest', 'more bigger', 'most biggest', 'more taller', 'most tallest', 'more happier', 'most happiest', 'gooder', 'goodest', 'badder', 'baddest', 'more faster', 'most fastest'] },
    'I explained the problem and my suggestion': { groups: [['problem', 'issue', 'not working', 'broken', 'difficult', 'complain*', 'damaged', 'dirty', 'noisy', 'crowded', 'late', 'shortage', 'lack', 'leak*', 'slow', 'waste*', 'thrown', 'pollut*'], ['suggest*', 'should', 'could', 'request', 'please', 'would be', 'i hope', 'can you', 'it would', 'recommend']] },
    'I used at least one passive sentence correctly': { passive: true },
    'I ended politely, with my name': { groups: [CLOSE] }
};

/** A point's check, by its English text; one not written here, ticked once there is some writing. */
const checkOf = (point) => CHECKS[point] || { words: 5 };
/** The checks for a task's checklist, one for each point in order (by the English points). */
const checksForTask = (task) => (task?.checklistEn || task?.checklist || []).map(checkOf);

module.exports = { CHECKS, checkOf, checksForTask };
