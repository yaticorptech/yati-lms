/**
 * Linguistic Ability — the grammar corrections on a talk (asked 2026-10-24:
 * "give the topic to the user, the user must speak about it, then make the
 * grammar correction, sentence correction"). The student speaks on a topic;
 * the browser turns their speech into text; this corrects it, sentence by
 * sentence: what was said, the sentence put right, and why.
 *
 * No AI and no outside service: rules for the mistakes learners commonly
 * make in spoken English — he go, did went, can able to, I am knowing, a
 * apple, since two years, discuss about, one of my friend, Myself Rahul… Each
 * rule is written to leave correct English alone (did he go, let it go, make
 * it to the top, the will to win), so a sentence it does not change is not
 * proved right — only free of the mistakes it knows.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { sentencesOf, wordCount, MISSPELT } = require('./writingCheck');

/* ── Verbs and their forms ───────────────────────────────────────────── */

const VERBS = ('have go come want like need know work live say think study play make take give get feel look seem use try help tell ask start keep run eat drink speak write '
    + 'see watch love hate believe understand mean earn spend save pay buy sell travel stay teach learn walk talk call wait open close plan invest manage enjoy prefer agree '
    + 'become begin bring build carry choose cook decide do drive fall find finish fly forget grow hear hold hope join leave lose meet miss move reach remember sleep stand '
    + 'stop swim visit win answer apply borrow lend share solve support improve explain discuss repay prepare practise practice attend complete develop handle lead send '
    + 'spend afford matter care mind happen sound attend collaborate negotiate persuade prioritise achieve receive suggest read sit wear catch sing wake ride')
    .split(' ');
const PAST = {
    go: 'went', come: 'came', make: 'made', take: 'took', give: 'gave', get: 'got', feel: 'felt', tell: 'told', say: 'said', think: 'thought', keep: 'kept', run: 'ran',
    eat: 'ate', drink: 'drank', speak: 'spoke', write: 'wrote', see: 'saw', understand: 'understood', mean: 'meant', spend: 'spent', pay: 'paid', buy: 'bought', sell: 'sold',
    teach: 'taught', become: 'became', begin: 'began', bring: 'brought', build: 'built', choose: 'chose', do: 'did', drive: 'drove', fall: 'fell', find: 'found', fly: 'flew',
    forget: 'forgot', grow: 'grew', hear: 'heard', hold: 'held', leave: 'left', lose: 'lost', meet: 'met', sleep: 'slept', stand: 'stood', swim: 'swam', win: 'won', lend: 'lent',
    know: 'knew', have: 'had', send: 'sent', lead: 'led', repay: 'repaid', read: 'read', sit: 'sat', wear: 'wore', catch: 'caught', sing: 'sang', wake: 'woke', ride: 'rode'
};
const PARTICIPLE = {
    go: 'gone', come: 'come', take: 'taken', give: 'given', eat: 'eaten', drink: 'drunk', speak: 'spoken', write: 'written', see: 'seen', become: 'become', begin: 'begun',
    choose: 'chosen', do: 'done', drive: 'driven', fall: 'fallen', fly: 'flown', forget: 'forgotten', grow: 'grown', know: 'known', run: 'run', swim: 'swum',
    wear: 'worn', sing: 'sung', wake: 'woken', ride: 'ridden'
};
const DOUBLE = new Set(['stop', 'plan', 'run', 'swim', 'begin', 'win', 'prefer', 'travel', 'get', 'sit', 'put', 'shop', 'chat', 'drop']);

const third = (v) => ({ have: 'has', do: 'does', go: 'goes' }[v] || (/(s|x|z|ch|sh)$/.test(v) ? `${v}es` : /[^aeiou]y$/.test(v) ? `${v.slice(0, -1)}ies` : `${v}s`));
const regular = (v) => (/e$/.test(v) ? `${v}d` : /[^aeiou]y$/.test(v) ? `${v.slice(0, -1)}ied` : DOUBLE.has(v) ? `${v}${v.slice(-1)}ed` : `${v}ed`);
const past = (v) => PAST[v] || regular(v);
const participle = (v) => PARTICIPLE[v] || past(v);
const ing = (v) => (/ie$/.test(v) ? `${v.slice(0, -2)}ying` : /[^aeiouy]e$/.test(v) && v !== 'be' ? `${v.slice(0, -1)}ing` : DOUBLE.has(v) ? `${v}${v.slice(-1)}ing` : `${v}ing`);

// A form back to its verb: "goes", "went", "gone" → "go" (only for the verbs above).
const BASE = new Map();
for (const v of VERBS) for (const f of [third(v), past(v), participle(v)]) if (f !== v && !BASE.has(f)) BASE.set(f, v);
// Past forms that are verbs of their own, or nouns, after a modal ("can found a company").
const NOT_A_FORM = new Set(['found', 'saw', 'left', 'felt', 'ground']);
const pastOrThird = (w) => (BASE.has(w) && !VERBS.includes(w) && !NOT_A_FORM.has(w) ? BASE.get(w) : null);
const thirdOnly = (w) => (BASE.has(w) && third(BASE.get(w)) === w ? BASE.get(w) : null);
const pastOnly = (w) => (BASE.has(w) && past(BASE.get(w)) === w && !VERBS.includes(w) ? BASE.get(w) : null);

/* ── The rules ───────────────────────────────────────────────────────── */

const alt = (xs) => xs.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
// Words before a subject that make a question or a "let him go" (the plain verb is right after them).
const AUX = 'does|did|do|doesn\'t|didn\'t|don\'t|will|would|can|could|should|shall|must|may|might|won\'t|wouldn\'t|can\'t|couldn\'t|shouldn\'t|mustn\'t|to|let|lets|make|makes|made|help|helps|helped|see|saw|watch|watched|hear|heard|why|not';
const NOT_AFTER_AUX = `(?<!\\b(?:${AUX})\\s)`;
const ADVERB = '(?:(always|usually|often|sometimes|never|also|really|still|just|only|even|generally|normally)\\s+)?';
// Verbs whose plain form is never a past tense too ("he read it yesterday" is right).
const PRESENT = VERBS.filter((v) => !['have', 'do', 'read', 'put', 'cost', 'cut', 'hit', 'let', 'set', 'shut', 'quit', 'hurt'].includes(v) && past(v) !== v);
const STATIVE = { knowing: 'know', understanding: 'understand', believing: 'believe', wanting: 'want', needing: 'need', owning: 'own', preferring: 'prefer', belonging: 'belong' };
const TO_VERBS = ['go', 'come', 'become', 'buy', 'learn', 'make', 'take', 'get', 'be', 'see', 'travel', 'join', 'speak', 'save', 'invest', 'live', 'eat', 'do', 'have', 'visit', 'open', 'apply', 'meet', 'talk', 'tell', 'give', 'find', 'pay', 'spend', 'earn', 'improve', 'start', 'finish', 'borrow', 'study', 'teach', 'sell', 'write', 'read', 'play', 'become', 'try'];
// Not "complete", "lead" or "live", which follow "are" as adjectives too (we are complete, he is lead singer).
const ING_VERBS = ['go', 'come', 'study', 'learn', 'work', 'play', 'read', 'write', 'speak', 'talk', 'eat', 'drink', 'try', 'save', 'spend', 'earn', 'invest', 'prepare', 'practise', 'wait', 'stay', 'teach', 'join', 'leave', 'apply', 'search', 'look', 'think', 'make', 'take', 'run', 'walk', 'sleep', 'do', 'get', 'give', 'attend', 'manage', 'build', 'develop', 'sell', 'buy', 'borrow', 'pay', 'repay', 'travel'];
const PLURAL = { child: 'children', person: 'people', man: 'men', woman: 'women' };
const plural = (n) => PLURAL[n] || (/(s|x|z|ch|sh)$/.test(n) ? `${n}es` : /[^aeiou]y$/.test(n) ? `${n.slice(0, -1)}ies` : `${n}s`);
const COUNTED = ['friend', 'colleague', 'teacher', 'student', 'brother', 'sister', 'cousin', 'uncle', 'aunt', 'relative', 'classmate', 'neighbour', 'neighbor', 'reason', 'problem', 'idea', 'goal', 'dream', 'subject', 'project', 'company', 'city', 'country', 'place', 'book', 'movie', 'film', 'hobby', 'habit', 'mistake', 'skill', 'thing', 'experience', 'example', 'member', 'customer', 'client', 'manager', 'employee', 'child', 'person', 'man', 'woman', 'team', 'friend'];
const MASS = { informations: 'information', advices: 'advice', furnitures: 'furniture', equipments: 'equipment', luggages: 'luggage', baggages: 'baggage', knowledges: 'knowledge', feedbacks: 'feedback', homeworks: 'homework', softwares: 'software', jewelleries: 'jewellery', jewelries: 'jewelry', sceneries: 'scenery', evidences: 'evidence' };
const COUNT_NOUNS = ['people', 'things', 'problems', 'students', 'friends', 'books', 'questions', 'ideas', 'years', 'times', 'ways', 'reasons', 'places', 'countries', 'companies', 'jobs', 'mistakes', 'changes', 'options', 'chances', 'days', 'hours', 'children'];
const isPast = (s) => PAST_TIME.test(s) && !NOT_ALL_PAST.test(s);
const PAST_TIME = /\b(yesterday|last\s+(night|week|month|year|weekend|time|sunday|monday|tuesday|wednesday|thursday|friday|saturday)|(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few|few|many|several)\s+(days|weeks|months|years|hours|minutes)\s+ago|in\s+(19|20)\d\d)\b/i;
const NOT_ALL_PAST = /\b(now|today|currently|nowadays|these days|at present|still|since|every|usually|always|will|tomorrow|next|going to)\b/i;

/**
 * Each rule: a pattern, and `fix` (the match and its groups → the right
 * words, or null to leave it), with why. Applied in order to a sentence.
 */
const RULES = [
    // Typed by hand (no microphone): a lone "i", and words learners commonly misspell.
    { re: /(?<![\w'’])i(?![\w'’])/g, fix: () => 'I', why: '"I" is always a capital letter.' },
    { re: new RegExp(`\\b(${alt(Object.keys(MISSPELT))})\\b`, 'gi'), fix: (m) => MISSPELT[m.toLowerCase()], why: 'Spelling.' },

    // Introducing yourself.
    { re: /^myself\s+(?:is\s+)?([A-Za-z]+)/i, fix: (m, name) => (/^(and|also|too|i|am|was|have|did|went|think|feel|like|want)$/i.test(name) ? null : `I am ${name}`), why: 'To introduce yourself, say "I am …" or "My name is …", not "Myself …".' },
    { re: /\bwhat(?: is|'s|’s) your good name\b/gi, fix: () => 'what is your name', why: 'In English, ask "What is your name?" ("good name" is not used).' },

    // A sentence about the past (yesterday, last week, two years ago): its verbs in the past.
    { when: (s) => isPast(s), re: new RegExp(`${NOT_AFTER_AUX}\\b(I|you|we|they|he|she|it)\\s+${ADVERB}(${alt(VERBS.filter((v) => past(v) !== v))}|${alt(VERBS.filter((v) => past(v) !== v).map(third))})\\b`, 'gi'),
        fix: (m, subj, adv, v, at, s) => {
            const b = VERBS.includes(v.toLowerCase()) ? v.toLowerCase() : BASE.get(v.toLowerCase());
            // "Yesterday I have finished" is a perfect: leave it.
            if (b === 'have' && /^\s+(\w+ed|been|gone|done|seen|taken|given|eaten|written|spoken|known|become|begun|come)\b/i.test(s.slice(at + m.length))) return null;
            return `${subj} ${adv ? `${adv} ` : ''}${past(b)}`;
        }, why: 'This happened in the past (yesterday, last week, ago…), so the verb goes into the past tense.' },
    { when: (s) => isPast(s), re: /\b(I|he|she|it)\s+(am|is)\b/gi, fix: (m, subj) => `${subj} was`, why: 'This happened in the past, so "am" or "is" becomes "was".' },
    { when: (s) => isPast(s), re: /\b(we|they|you)\s+are\b/gi, fix: (m, subj) => `${subj} were`, why: 'This happened in the past, so "are" becomes "were".' },

    // did / didn't + the plain verb.
    { re: /\b(did(?:n't|n’t| not)?)\s+((?:I|you|he|she|it|we|they)\s+)?(?:(never|not)\s+)?([a-z]+)\b/gi, fix: (m, aux, subj = '', adv, w) => {
        // A bare "did" + an -s word may be a noun ("I did tests"); after "didn't" or "did he" it is a verb.
        const b = pastOnly(w.toLowerCase()) || (subj || !/^did$/i.test(aux) ? thirdOnly(w.toLowerCase()) : null);
        return b ? `${aux} ${subj || ''}${adv ? `${adv} ` : ''}${b}` : null;
    }, why: 'After "did" or "didn\'t", use the plain verb: did go, didn\'t go.' },
    // do / does / don't / doesn't + the plain verb.
    { re: /\b(does(?:n't|n’t| not)?|do(?:n't|n’t| not)?)\s+((?:I|you|he|she|it|we|they)\s+)?([a-z]+)\b/gi, fix: (m, aux, subj = '', w) => { const b = thirdOnly(w.toLowerCase()); return b && ['go', 'come', 'know', 'like', 'want', 'think', 'understand', 'believe', 'mean', 'live', 'play', 'eat', 'say', 'see', 'get', 'make', 'take', 'give', 'have', 'feel', 'seem', 'matter', 'agree', 'earn', 'spend', 'save', 'pay', 'buy', 'sell', 'teach', 'learn', 'write', 'speak', 'study', 'try', 'remember', 'forget', 'enjoy', 'prefer', 'invest', 'afford', 'care', 'mind'].includes(b) ? `${aux} ${subj || ''}${b}` : null; }, why: 'After do, does, don\'t or doesn\'t, use the plain verb: doesn\'t go, does she know.' },
    // A modal + the plain verb, with no "to".
    { re: /\b(can|could|should|must|will|would|shall|can't|can’t|cannot|won't|won’t|wouldn't|wouldn’t|shouldn't|shouldn’t|couldn't|couldn’t|mustn't|mustn’t)\s+(not\s+)?([a-z]+)\b/gi, fix: (m, aux, not = '', w) => { const b = pastOrThird(w.toLowerCase()); return b ? `${aux} ${not || ''}${b}` : null; }, why: 'After can, should, must, will and would, use the plain verb: can go, should take.' },
    { re: /\b(can|could|should|must|would)\s+to\s+(?=[a-z])/gi, fix: (m, aux) => `${aux} `, why: 'There is no "to" after can, could, should, must or would.' },
    { re: /\b(can|could)\s+(?:be\s+)?able\s+to\b/gi, fix: (m, aux) => aux, why: 'Use "can" or "be able to", not both: "I can do it" or "I am able to do it".' },

    // Subject and verb agree.
    { re: /\bI\s+(is|are)\b/g, fix: () => 'I am', why: 'With "I", use "am": I am.' },
    { re: /\b(he|she|it)\s+are\b/gi, fix: (m, s) => `${s} is`, why: 'With he, she or it, use "is".' },
    { re: /\b(we|they|you)\s+(is|am)\b/gi, fix: (m, s) => `${s} are`, why: 'With we, you or they, use "are".' },
    { re: /\b(we|they|you)\s+was\b/gi, fix: (m, s) => `${s} were`, why: 'With we, you or they, use "were".' },
    { re: /\b(I|we|they|you)\s+has\b/g, fix: (m, s) => `${s} have`, why: 'With I, you, we or they, use "have".' },
    { re: /\b(I|we|they|you)\s+(doesn't|doesn’t|does not)\b/g, fix: (m, s, d) => `${s} ${d === 'does not' ? 'do not' : 'don\'t'}`, why: 'With I, you, we or they, use "don\'t" (do not).' },
    { re: new RegExp(`${NOT_AFTER_AUX}\\b(he|she|it)\\s+(don't|don’t|do not)\\b`, 'gi'), fix: (m, s, d) => `${s} ${d === 'do not' ? 'does not' : 'doesn\'t'}`, why: 'With he, she or it, use "doesn\'t" (does not).' },
    { re: new RegExp(`${NOT_AFTER_AUX}\\b(he|she|it)\\s+${ADVERB}(have|do|${alt(PRESENT)})\\b(?!['’])`, 'gi'), fix: (m, s, adv, v) => `${s} ${adv ? `${adv} ` : ''}${third(v.toLowerCase())}`, why: 'With he, she or it, the verb takes -s in the present: he goes, she has, it works.' },
    { re: /\bthere\s+(is|was)\s+(many|several|a few|few|two|three|four|five|lots of|so many)\b/gi, fix: (m, v, q) => `there ${v.toLowerCase() === 'is' ? 'are' : 'were'} ${q}`, why: 'With more than one thing, use "there are" (or "there were").' },

    // Verb forms.
    { re: /\b(have|has|had|having|'ve|’ve)\s+((?:not|never|already|just|ever|also)\s+)?(went|came|ate|saw|took|gave|wrote|spoke|drank|began|ran|did|forgot|chose|became|knew|grew|drove|swam|flew|fell)\b/gi, fix: (m, h, adv = '', w) => `${h} ${adv || ''}${participle(BASE.get(w.toLowerCase()))}`, why: 'After have, has or had, use the past participle: have gone, has eaten, had done.' },
    { re: /\b(I|you|we|they|he|she|it)\s+(am|is|are|'m|’m|'re|’re|'s|’s)\s+(not\s+)?(knowing|understanding|believing|wanting|needing|owning|preferring|belonging)\b/gi, fix: (m, s, be, not, v) => { const b = STATIVE[v.toLowerCase()]; const he = /^(he|she|it)$/i.test(s); return not ? `${s} ${he ? 'does' : 'do'} not ${b}` : `${s} ${he ? third(b) : b}`; }, why: 'Verbs like know, understand and want are not used with -ing: "I understand", not "I am understanding".' },
    { re: new RegExp(`\\b(I am|I'm|I’m|he is|she is|we are|they are|you are|he's|she's|we're|they're|you're|he’s|she’s|we’re|they’re|you’re)\\s+(not\\s+)?(${alt(ING_VERBS)})\\b(?!\\s+(?:colleagues|friends|related|experience|hours|life|culture|clothes|people|partners|mates)\\b)`, 'gi'), fix: (m, s, not = '', v) => `${s} ${not || ''}${ing(v.toLowerCase())}`, why: 'After am, is or are, the verb takes -ing: I am studying, they are working.' },
    { re: /\b(I|you|we|they)\s+(am|are|'m|’m|'re|’re)\s+(not\s+)?agreed?\b/gi, fix: (m, s, be, not) => `${s} ${not ? 'do not ' : ''}agree`, why: '"Agree" is a verb: say "I agree" or "I do not agree", not "I am agree".' },
    { re: /\b(he|she)\s+(is|'s|’s)\s+(not\s+)?agreed?\b/gi, fix: (m, s, be, not) => `${s} ${not ? 'does not agree' : 'agrees'}`, why: '"Agree" is a verb: say "she agrees" or "she does not agree".' },
    { re: new RegExp(`(?<!\\b(?:feel|feels|felt|look|looks|looked|seem|seems|sound|sounds|something|anything|nothing|things|just)\\s)\\b(want|wants|wanted|need|needed|plan|planned|decide|decides|decided|hope|hoped|try|tried|like|liked|love|loved|forget|forgot|agree|agreed|refuse|refused|promise|promised|expect|expected|wish|wished|learn|learned|learnt|start|started|begin|began)\\s+(${alt(TO_VERBS)})\\b`, 'gi'), fix: (m, a, v) => `${a} to ${v}`, why: 'After want, need, plan, decide, hope, like and similar verbs, add "to": I want to go.' },
    { re: /\b(make|makes|made|let|lets)\s+(me|him|her|us|them|you|it)\s+to\s+([a-z]+)\b/gi, fix: (m, v, o, w) => (VERBS.includes(w.toLowerCase()) ? `${v} ${o} ${w}` : null), why: 'After make or let + a person, use the plain verb without "to": made me understand, let us go.' },
    { re: /\b(enjoy|enjoys|enjoyed)\s+to\s+([a-z]+)\b/gi, fix: (m, v, w) => (VERBS.includes(w.toLowerCase()) ? `${v} ${ing(w.toLowerCase())}` : null), why: '"Enjoy" is followed by -ing: I enjoy reading.' },

    // Comparisons.
    { re: /\bmore\s+(better|worse|easier|cheaper|faster|bigger|smaller|happier|simpler|safer|stronger|healthier|busier)\b/gi, fix: (m, w) => w, why: '"Better", "easier" and similar words already compare; do not add "more".' },
    { re: /\bmost\s+(best|worst|easiest|cheapest|fastest|biggest|smallest|happiest|simplest|safest|strongest|healthiest|busiest)\b/gi, fix: (m, w) => w, why: '"Best", "easiest" and similar words already mean "most"; do not add "most".' },

    // Nouns.
    { re: new RegExp(`\\b(${alt(Object.keys(MASS))})\\b`, 'gi'), fix: (m, w, at, s) => (/^advices$/i.test(w) && /\b(he|she|it|who)\s+$/i.test(s.slice(0, at)) ? 'advises' : MASS[w.toLowerCase()]), why: 'This word has no plural in English: information, advice, equipment, feedback… (The verb is spelt "advise": he advises.)' },
    { re: new RegExp(`\\bone\\s+of\\s+(my|the|our|his|her|their|your|these|those)\\s+(${alt(COUNTED)})\\b(?!['’])`, 'gi'), fix: (m, d, n) => `one of ${d} ${plural(n.toLowerCase())}`, why: '"One of" is followed by a plural: one of my friends.' },
    { re: new RegExp(`\\bmuch\\s+(${alt(COUNT_NOUNS)})\\b`, 'gi'), fix: (m, n) => `many ${n}`, why: 'Use "many" with things you can count: many people, many problems.' },
    { re: /\bthe\s+both\b/gi, fix: () => 'both', why: 'Say "both", without "the".' },
    { re: /\b(a|an|A|An)\s+([A-Za-z][\w-]*)/g, fix: (m, a, w, at, s) => article(a, w, at, s), why: 'Use "an" before a vowel sound (an apple, an hour) and "a" before a consonant sound (a book, a university).' },

    // Words used the Indian-English way.
    { re: /\bsince\s+((?:the\s+)?(?:last\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|many|several|a few|few)\s+(?:years?|months?|weeks?|days?|hours?|minutes?))\b(?!\s+ago)/gi, fix: (m, d) => `for ${d}`, why: 'Use "for" with a length of time (for two years) and "since" with a starting point (since 2020).' },
    { re: /\btoday\s+(morning|evening|afternoon)\b/gi, fix: (m, p) => `this ${p}`, why: 'Say "this morning", "this evening", not "today morning".' },
    { re: /\btoday\s+night\b/gi, fix: () => 'tonight', why: 'Say "tonight", not "today night".' },
    { re: /\byesterday\s+night\b/gi, fix: () => 'last night', why: 'Say "last night", not "yesterday night".' },
    { re: /\b(pass|passed)\s+out\s+(?:of|from)\b/gi, fix: (m, p) => (p.toLowerCase() === 'pass' ? 'graduate from' : 'graduated from'), why: 'In English, you "graduate from" a college; "pass out" means to faint.' },
    { re: /\b(as per me|according to me)\b/gi, fix: () => 'in my opinion', why: 'For your own view, say "in my opinion" or "I think".' },
    { re: /\b(discuss|discussed|discusses|discussing|mention|mentioned|mentions|explain|explained|explains)\s+about\b/gi, fix: (m, v) => v, why: 'You "discuss", "mention" or "explain" something, without "about".' },
    { re: /\b(return|returned|returns|returning|reply|replied|replies|replying)\s+back\b/gi, fix: (m, v) => v, why: '"Return" and "reply" already mean "back"; do not add it.' },
    { re: /\brevert\s+back\b/gi, fix: () => 'reply', why: 'In English, "revert" means to go back to an earlier state; to answer, say "reply".' },
    { re: /\brepeat\s+again\b/gi, fix: () => 'repeat', why: '"Repeat" already means "again".' },
    { re: /\bcope\s+up\s+with\b/gi, fix: () => 'cope with', why: 'Say "cope with", without "up".' },
    { re: /\bmarried\s+with\b/gi, fix: () => 'married to', why: 'You are "married to" someone.' },
    { re: /\b(comprise|comprises|comprised)\s+of\b/gi, fix: (m, v) => ({ comprise: 'consist', comprises: 'consists', comprised: 'consisted' }[v.toLowerCase()] + ' of'), why: 'Say "consists of" or "comprises", not "comprises of".' },
    { re: /\b(emphasise|emphasize|emphasised|emphasized|emphasises|emphasizes)\s+on\b/gi, fix: (m, v) => v, why: 'You "emphasise" something, without "on".' },
    { re: /\bexplain\s+me\b/gi, fix: () => 'explain to me', why: 'Say "explain to me".' },
    { re: /\bsay\s+me\b/gi, fix: () => 'tell me', why: 'Say "tell me"; "say" is not followed by a person.' },

    // A word said twice.
    { re: /\b(\w+)\s+\1\b/gi, fix: (m, w) => (/^(that|had|very|bye|so|no|yes|ha|go|knock|hear|well|really|many|more)$/i.test(w) ? null : w), why: 'A word was said twice.' }
];

/** "a" or "an" before `w` (at `at` in the sentence `s`): the sound of the word, not its letter. */
const article = (a, w, at, s) => {
    // A capital "A" in the middle of a sentence is a letter ("plan A"), not the article.
    if (a === 'A' && at > 0 && s.slice(0, at).trim()) return null;
    const lower = w.toLowerCase();
    const acronym = w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w);
    const vowel = acronym ? /^[AEFHILMNORSX]/.test(w)
        : /^(uni|use|usu|uti|ure|eu|ewe|one|once|ufo|uk\b)/.test(lower) ? false
            : /^(hour|honest|honou?r|heir|x-)/.test(lower) ? true
                : /^[aeiou]/.test(lower);
    const an = /^an$/i.test(a);
    if (vowel === an) return null;
    const right = vowel ? 'an' : 'a';
    return `${a[0] === a[0].toUpperCase() ? right[0].toUpperCase() + right.slice(1) : right} ${w}`;
};

/* ── Checking a talk ─────────────────────────────────────────────────── */

const sameCase = (from, to) => (from[0] && from[0] === from[0].toUpperCase() && from[0] !== from[0].toLowerCase() ? to[0].toUpperCase() + to.slice(1) : to);

/** One sentence: { text, corrected, mistakes: [{ wrong, right, why }] }. */
const checkSentence = (text) => {
    let s = text;
    const mistakes = [];
    for (const rule of RULES) {
        if (rule.when && !rule.when(s)) continue;
        rule.re.lastIndex = 0;
        s = s.replace(rule.re, (...args) => {
            const m = args[0];
            const named = typeof args[args.length - 1] === 'object';
            const at = args[args.length - (named ? 3 : 2)];
            const groups = args.slice(1, args.length - (named ? 3 : 2));
            const fixed = rule.fix(m, ...groups, at, s);
            if (!fixed) return m;
            const right = sameCase(m, fixed);
            if (right === m) return m;
            mistakes.push({ wrong: m, right, why: rule.why });
            return right;
        });
    }
    return { text, corrected: s, mistakes };
};

/*
 * Written English (2026-10-27: a line of random letters was passed with "no
 * grammar mistakes"): on top of the rules above, words that cannot be English
 * — no vowel at all, six consonants in a row, or longer than any everyday
 * word — and each sentence's capital letter and full stop. Speech is not
 * held to these: what the browser writes down has neither.
 */
const NO_VOWEL_OK = new Set(['mrs', 'hrs', 'kms', 'pvt', 'ltd', 'pls', 'hmm', 'shh', 'nth', 'tsk', 'brr', 'grr', 'psst', 'pfft', 'zzz', 'www', 'bsc', 'msc', 'phd', 'mph', 'kph']);
const notEnglish = (token) => {
    const word = token.replace(/'.*$/, '');
    if (word.length < 3 || (/^[A-Z]+$/.test(word) && word.length <= 6)) return false;   // short words; NCC, HTML
    const low = word.toLowerCase();
    if (NO_VOWEL_OK.has(low)) return false;
    return !/[aeiouy]/.test(low) || /[^aeiouy]{6}/.test(low) || low.length > 20;
};

/*
 * Spelling (2026-10-27: "breakfas" went by). A word is English if it, or the
 * word it is made from (plays → play, stopped → stop, making → make), is in
 * Webster's word list (1934, out of copyright; content/english-words.txt.gz,
 * from /usr/share/dict/words) or in the app's own lessons. One that is not is
 * put right only to a word one letter away that the lessons use, with the
 * same first letter — so a rarer real word is never "corrected" into a common
 * one, and a word with no near lesson word is left alone.
 */
let dictionary = null, common = null;
const words = () => {
    if (!dictionary) {
        dictionary = new Set(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'content', 'english-words.txt.gz'))).toString('utf8').split('\n'));
        common = new Map();
        const text = JSON.stringify(require('./content').lessons);
        for (const w of text.match(/[A-Za-z]+(?:'[a-z]+)?/g) || []) {
            const low = w.toLowerCase().replace(/'s$/, '');
            if (low.length > 1) common.set(low, (common.get(low) || 0) + 1);
        }
        for (const w of ['email', 'emails', 'online', 'website', 'internet', 'laptop', 'mobile', 'okay', 'lakh', 'lakhs', 'crore', 'crores', 'rupee', 'rupees', 'idli', 'dosa', 'chapati', 'sambar', 'chai']) common.set(w, common.get(w) || 1);
    }
    return { dictionary, common };
};
// Each plain ending on its own (2026-10-28): taken together, "-es" was cut before "-s", so "trees" became "tre".
const BASES = [[/ies$/, 'y'], [/ied$/, 'y'], [/ier$/, 'y'], [/iest$/, 'y'], [/ves$/, 'f'], [/(.)\1(ed|ing|er|est)$/, '$1'], [/(ed|ing)$/, 'e'],
    ...['ed', 'ing', 'er', 'est', 'ly', 'ness', 'ment', 's', 'es', 'd', "'s"].map((end) => [new RegExp(`${end}$`), ''])];
const isWord = (low) => {
    const { dictionary: d, common: c } = words();
    if (d.has(low) || c.has(low)) return true;
    return BASES.some(([re, to]) => re.test(low) && (d.has(low.replace(re, to)) || c.has(low.replace(re, to))));
};
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const oneAway = (w) => {
    const out = new Set();
    for (let i = 0; i <= w.length; i++) {
        for (const ch of LETTERS) out.add(w.slice(0, i) + ch + w.slice(i));                 // a letter left out
        if (i < w.length) {
            out.add(w.slice(0, i) + w.slice(i + 1));                                          // a letter too many
            for (const ch of LETTERS) out.add(w.slice(0, i) + ch + w.slice(i + 1));           // a wrong letter
            if (i < w.length - 1) out.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));  // two the wrong way round
        }
    }
    return out;
};
const spellingOf = (token) => {
    const low = token.toLowerCase();
    if (low.length < 4 || isWord(low)) return null;
    const { common: c } = words();
    let best = null;
    for (const cand of oneAway(low)) if (cand !== low && cand[0] === low[0] && c.has(cand) && (!best || c.get(cand) > c.get(best))) best = cand;
    return best;
};

/**
 * One sentence: checkSentence, then English words and spelling, and the marks
 * tidied. Written (`spoken` false), also its capital letter and full stop —
 * which speech, written down by the browser, does not have.
 */
const checkEnglish = (text, { spoken = false } = {}) => {
    const base = checkSentence(text);
    const mistakes = [...base.mistakes];
    let corrected = base.corrected;
    const tokens = String(text).split(/\s+/).map((t) => t.replace(/^[^A-Za-z]+|[^A-Za-z']+$/g, '')).filter((t) => t && !/\d/.test(t));
    for (const w of [...new Set(tokens.filter(notEnglish))]) mistakes.push({ wrong: w, right: null, why: `"${w}" is not an English word. Check the spelling, or use another word.` });
    // A spelling slip, put right — a word with a capital (a name, even first in the sentence: Hari) left alone.
    tokens.forEach((w) => {
        if (notEnglish(w) || /[A-Z]/.test(w)) return;
        const fix = spellingOf(w.replace(/'.*$/, ''));
        if (!fix) return;
        const right = sameCase(w, fix);
        const re = new RegExp(`\\b${w.replace(/'.*$/, '')}\\b`);
        if (!re.test(corrected)) return;
        corrected = corrected.replace(re, right);
        mistakes.push({ wrong: w.replace(/'.*$/, ''), right, why: `Spelling: "${w.replace(/'.*$/, '').toLowerCase()}" is "${fix}".` });
    });
    // The marks at the end: one full stop, nothing after it, no space or comma before it.
    const tidy = [
        // [the mistake, what it becomes, why, the part shown put right]
        [/(?<=[^.])\.\.(?!\.)/, '.', 'One full stop is enough.', () => '.'],
        [/([.?!])\s*[,;:]+(\s*["'”’)\]]*)\s*$/, '$1$2', 'Nothing comes after the full stop at the end of a sentence.', (m) => m[1]],
        [/\s*,\s*([.?!])\s*$/, '$1', 'No comma just before the full stop.', (m) => m[1]]
    ];
    for (const [re, to, why, part] of tidy) {
        const m = corrected.match(re);
        if (!m) continue;
        corrected = corrected.replace(re, to);
        mistakes.push({ wrong: m[0].trim() || m[0], right: part(m), why });
    }
    if (/\s+[.?!,;:]/.test(corrected)) {
        corrected = corrected.replace(/\s+([.?!,;:])/g, '$1');
        mistakes.push({ wrong: null, right: null, why: 'No space before a full stop or comma.' });
    }
    if (spoken) return { text: base.text, corrected, mistakes };
    const first = corrected.match(/[A-Za-z]+/);
    if (first && first[0][0] !== first[0][0].toUpperCase() && !notEnglish(first[0])) {
        const right = first[0][0].toUpperCase() + first[0].slice(1);
        corrected = corrected.slice(0, first.index) + right + corrected.slice(first.index + first[0].length);
        mistakes.push({ wrong: first[0], right, why: 'Start a sentence with a capital letter.' });
    }
    if (corrected.trim() && !/[.?!]["'”’)\]]*$/.test(corrected.trim())) {
        corrected = `${corrected.trim()}.`;
        mistakes.push({ wrong: null, right: '.', why: 'End a sentence with a full stop (.), a question mark (?) or an exclamation mark (!).' });
    }
    return { text: base.text, corrected, mistakes };
};
const checkWritten = (text) => checkEnglish(text);
const checkSpoken = (text) => checkEnglish(text, { spoken: true });

/**
 * A talk, sentence by sentence, against the task: { minWords, words (the
 * unit's words to try) }. The score is the share of sentences with no
 * mistake found; it passes with enough words and that share at `passing`.
 */
const checkTalk = (raw, task = {}, passing = 75) => {
    const text = String(raw || '').replace(/[‘’]/g, '\'').replace(/\s+/g, ' ').trim().slice(0, 4000);
    const words = wordCount(text);
    // Spelling, English words and the marks too (2026-10-27, "in every place"); not capitals or full stops.
    const sentences = sentencesOf(text).map(checkSpoken);
    const clean = sentences.filter((x) => !x.mistakes.length).length;
    const percent = sentences.length ? Math.round((clean / sentences.length) * 100) : 0;
    const minWords = task.minWords || 0;
    const short = words < minWords;
    const lower = text.toLowerCase();
    const used = (task.words || []).filter((w) => new RegExp(`\\b${w.toLowerCase()}`).test(lower));
    const linking = ['because', 'however', 'although', 'for example', 'for instance', 'therefore', 'first', 'finally', 'also', 'but', 'so', 'in addition', 'on the other hand', 'in my opinion', 'to sum up']
        .filter((w) => new RegExp(`\\b${w}\\b`).test(lower));
    const good = [];
    if (!short) good.push(`You spoke ${words} words — enough for this topic.`);
    if (used.length) good.push(`You used this unit's words: ${used.join(', ')}.`);
    if (linking.length >= 2) good.push(`You linked your ideas (${linking.slice(0, 4).join(', ')}).`);
    const tips = [];
    if (short) tips.push(`Say a little more: ${words} of at least ${minWords} words.`);
    if (!used.length && task.words?.length) tips.push(`Try to use one of this unit's words: ${task.words.join(', ')}.`);
    if (linking.length < 2) tips.push('Link your ideas with words like because, however, for example and finally.');
    return { words, minWords, sentences, clean, total: sentences.length, percent, short, passed: !short && sentences.length > 0 && percent >= passing, good, tips };
};

module.exports = { checkTalk, checkSentence, checkWritten, checkSpoken };
