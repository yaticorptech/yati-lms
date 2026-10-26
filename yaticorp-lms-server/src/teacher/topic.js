/**
 * Reads a research title for the Research Path: the ideas it names, where
 * the study happens, and the databases that suit its field, so the stages
 * and tasks can talk about this topic and not research in general.
 *
 * Plain rules, no outside service. A title the rules cannot take apart
 * still gives the whole title to work with; anything unsure is left out
 * (a task then keeps its general wording) rather than guessed.
 */

// Names that stay capitalised when a Title Case title is lowered for a sentence.
const KEEP_CAPS = new Set(['India', 'Indian', 'English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Bengali', 'Urdu', 'Sanskrit',
    'Karnataka', 'Kerala', 'Bengaluru', 'Bangalore', 'Mysuru', 'Mysore', 'Mangaluru', 'Covid', 'Google', 'YouTube', 'Facebook', 'Instagram', 'WhatsApp',
    'Moodle', 'Python', 'Excel', 'Asia', 'Africa', 'Europe']);

// "A study of …", "An empirical analysis of …": the wrapper, not the topic.
const LEAD = /^(?:(?:a|an|the)\s+)?(?:(?:comparative|critical|empirical|exploratory|descriptive|correlational|experimental|qualitative|quantitative|case|pilot|systematic)\s+)?(?:study|analysis|investigation|assessment|evaluation|examination|exploration|review|survey|inquiry|enquiry)\s+(?:of|on|into|about)\s+/;
// "Effect of X on Y", "Effectiveness of X in reducing Y".
const EFFECT = /^(?:the\s+)?(?:effects?|impacts?|influence|effectiveness|efficacy|role|contribution|use)\s+of\s+(.+?)\s+(?:on|upon|in improving|in reducing|in enhancing|in developing|for improving|for reducing|to improve|to reduce)\s+(.+)$/;
// "Relationship between X and Y".
const RELATION = /^(?:the\s+)?(?:relationships?|relations?|associations?|correlations?|links?|connections?)\s+(?:between|of)\s+(.+?)\s+(?:and|with)\s+(.+)$/;
// Words in front of the idea itself: "challenges of online teaching" is about online teaching.
const IDEA_LEAD = /^(?:the\s+)?(?:(?:effects?|impacts?|influence|effectiveness|efficacy|role|use|importance|significance|status|levels?|trends?|problems?|challenges?|issues?|perceptions?|attitudes?)\s+(?:of|in|on|towards?)|factors\s+(?:affecting|influencing))\s+/;
// After "in / among / at …": only a place or a group of people is a setting.
// "in rural colleges" is; "in education" or "in reducing anxiety" is part of the idea.
const SETTING = /\b(?:college|school|universit|student|teacher|learner|child|pupil|women|men|adolescent|youth|farmer|patient|nurse|employee|worker|village|district|taluk|cit(?:y|ies)|urban|rural|state|region|classroom|institution|hospital|compan|firm|industr|bank|sector|area|communit|famil|household|parent|graduate|class|grade|standard|people|staff|facult|India|Karnataka|Kerala|Tamil Nadu|Bengaluru|Bangalore|Mysuru|Mysore)/i;
// "in reducing anxiety": an action, never a setting.
const DOING = /^(?:the\s+)?(?:improving|reducing|enhancing|developing|using|promoting|building|managing|increasing|fostering|creating|preventing|achieving)\b/;
const PEOPLE = /\b(?:student|teacher|learner|child|pupil|women|men|adolescent|youth|farmer|patient|nurse|employee|worker|parent|graduate|staff|facult|people)/i;
const SPLIT = /\s*,\s*(?:and\s+)?|\s+(?:and|&|versus|vs\.?)\s+/;
const ADJECTIVE = /^(?:online|offline|rural|urban|public|private|male|female|blended|hybrid|primary|higher|secondary|junior|senior|government|aided|unaided|formal|informal|open|distance|[a-z]+(?:al|ic|ive|ous|ary|ful|less|ern|ile|ish|ese|ian))$/;

const words = (s) => s.split(/\s+/).filter(Boolean);
const lastWord = (s) => words(s).pop();

/** "Peer Tutoring And Mathematics Anxiety" → "peer tutoring and mathematics anxiety", for the middle of a sentence. */
const forSentence = (title) => {
    const list = words(title);
    const long = list.filter((w) => w.length > 3);
    const titleCase = long.length > 1 && long.filter((w) => /^[A-Z]/.test(w)).length / long.length >= 0.6;
    return list.map((w, i) => {
        if (!/^[A-Z][a-z'’-]*[,:;]?$/.test(w) || KEEP_CAPS.has(w.replace(/[,:;]$/, '').replace(/['’]s$/, ''))) return w;
        return titleCase || i === 0 ? w.toLowerCase() : w;
    }).join(' ');
};

/** "a, b and c" */
const andList = (list) => (list.length < 2 ? list[0] || '' : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

/**
 * Where the study happens: a trailing "in / among / at …" that names a place
 * or people, or "of …" that names people ("of nursing students" → among
 * nursing students). Peeled twice, so "of nursing students in Mysuru" gives
 * "among nursing students in Mysuru".
 */
const peelSetting = (s) => {
    const found = [...s.matchAll(/\s(in|among|amongst|at|across|within|of)\s/g)].reverse().find((m) => {
        const rest = s.slice(m.index + m[0].length).trim();
        const n = words(rest).length;
        if (!n || n > 7 || DOING.test(rest)) return false;
        return m[1] === 'of' ? PEOPLE.test(rest) && !/\s(?:on|upon|and|in|with|to|for)\s/.test(` ${rest} `) : SETTING.test(rest);
    });
    if (!found) return null;
    const rest = s.slice(found.index + found[0].length).trim();
    const core = s.slice(0, found.index).trim();
    return core ? { core, where: `${found[1] === 'of' ? 'among' : found[1]} ${rest}`, place: rest.replace(/^the\s+/, '') } : null;
};

const settingOf = (s) => {
    const outer = peelSetting(s);
    const inner = outer && peelSetting(outer.core);
    if (!inner) return outer;
    return { core: inner.core, where: `${inner.where} ${outer.where}`, place: `${inner.place} ${outer.where}` };
};

/** "online and traditional education" → online education, traditional education. */
const ideasOf = (core) => {
    const parts = core.replace(IDEA_LEAD, '').split(SPLIT).map((p) => p.trim().replace(/^the\s+/, '')).filter(Boolean);
    const last = parts[parts.length - 1];
    const ideas = parts.map((p, i) => (i < parts.length - 1 && ADJECTIVE.test(p) && words(last).length > 1 ? `${p} ${lastWord(last)}` : p));
    return ideas.length > 4 || ideas.some((p) => words(p).length > 6) ? [core.replace(IDEA_LEAD, '')] : ideas;
};

const DATABASES = [
    [/educat|teach|pedagog|learning|school|curricul/i, ['ERIC', 'Scopus', 'Google Scholar']],
    [/medic|health|nurs|pharma|clinic|dental|ayurved|patient/i, ['PubMed', 'Scopus', 'Google Scholar']],
    [/psycholog|counsel/i, ['APA PsycInfo', 'PubMed', 'Google Scholar']],
    [/comput|software|engineer|electr|mechan|civil|technolog|machine learning|artificial intelligence/i, ['IEEE Xplore', 'ACM Digital Library', 'Scopus']],
    [/commerce|manage|business|econom|financ|account|marketing|bank/i, ['Scopus', 'SSRN', 'EBSCO Business Source']],
    [/\blaw\b|legal/i, ['SCC Online', 'Manupatra', 'HeinOnline']],
    [/agri|horti|veterin|food|crop|farm/i, ['CAB Abstracts', 'AGRIS', 'Scopus']],
    [/histor|literat|english|language|linguist|philosoph|\barts\b|humanit|kannada|hindi|sanskrit|music/i, ['JSTOR', 'Project MUSE', 'Google Scholar']],
    [/sociol|social|politic|anthropol|geograph|journalism|media/i, ['JSTOR', 'Scopus', 'Google Scholar']],
    [/physic|chemi|biolog|botan|zoolog|mathemat|statist|environment|science/i, ['Web of Science', 'Scopus', 'Google Scholar']]
];

/** The databases that suit the field (or, with no field given, the title). */
const databasesFor = (field, title) => {
    for (const text of [field, title]) {
        const hit = text && DATABASES.find(([re]) => re.test(text));
        if (hit) return hit[1];
    }
    return ['Scopus', 'Web of Science', 'Google Scholar'];
};

/**
 * Everything the Research Path templates use about one topic, or null with
 * no title. `at` is " in rural colleges" (or ""), ready to append.
 */
const readTopic = (rawTitle, field = '') => {
    const title = String(rawTitle || '').trim().replace(/\s+/g, ' ').replace(/[.?!]+$/, '');
    if (title.length < 3) return null;
    let core = forSentence(title).replace(LEAD, '');
    const setting = settingOf(core);
    if (setting) core = setting.core;

    let x = null; let y = null; let vs = null; let ideas;
    const effect = core.match(EFFECT) || core.match(RELATION);
    if (effect) {
        [x, y] = [effect[1], effect[2]].map((s) => s.replace(/^the\s+/, ''));
        ideas = [x, y];
    } else {
        ideas = ideasOf(core);
        // Two ideas with the same last word are being compared ("online and
        // traditional education"), not one acting on the other.
        if (ideas.length === 2 && (lastWord(ideas[0]) === lastWord(ideas[1]) || /\s(?:versus|vs\.?)\s/.test(core))) [x, vs] = ideas;
        else if (ideas.length === 2) [x, y] = ideas;
    }
    const place = setting?.place || '';
    const search = [...ideas, ...(place && words(place).length <= 3 ? [place] : [])].map((s) => `"${s}"`).join(' AND ');
    return {
        title, core, ideas, list: andList(ideas), x, y, vs,
        where: setting?.where || '', at: setting ? ` ${setting.where}` : '', place,
        search, databases: andList([...databasesFor(field, title), 'Shodhganga'])
    };
};

module.exports = { readTopic, andList };
