/**
 * Where the student is in their education, so the interviewer asks what suits
 * them (asked 2026-10-22: "if the student is 10th standard they may ask the
 * question what suits that student"). A Class 10 student is asked about their
 * subjects, school projects and the stream they will choose, never about a
 * manager or a salary, and is judged against what is expected at their age.
 *
 * Finer than the Learning Bio's school / college / professional: a Class 4 and
 * a Class 12 student are both "school" there, and want very different
 * interviews.
 *
 * Read from Career Path's profile first (education level, class, board); then
 * the class an administrator gave the account ("Class 10", "10th", "10 B");
 * then the account type. Every account is created as 'school_student', so that
 * value alone says nothing. A student none of these place is 'general', and
 * is interviewed as before: a fresher looking for work.
 */

const BAND_BY_LEVEL = {
    'Primary School (Class 1–5)': 'primary',
    'Middle School (Class 6–8)': 'middle',
    'High School (Class 9–10)': 'high',
    'Higher Secondary (Class 11–12)': 'senior',
    Diploma: 'diploma',
    Undergraduate: 'undergraduate',
    Postgraduate: 'postgraduate',
    'Working Professional': 'professional'
};
const bandOfClass = (n) => (n <= 5 ? 'primary' : n <= 8 ? 'middle' : n <= 10 ? 'high' : 'senior');
const SCHOOL = new Set(['primary', 'middle', 'high', 'senior']);
const STAGE_NAME = { primary: 'Primary School', middle: 'Middle School', high: 'High School', senior: 'Higher Secondary' };

/** "Class 10", "10th", "10 B", "Std 9", "Grade 7": the class number, or null. */
const classNumber = (text) => {
    const s = String(text || '').trim();
    const m = s.match(/^(?:class|grade|std\.?|standard)\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s*[a-z])?$/i)
        || s.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:class|grade|std\.?|standard))?(?:\s*[a-z])?$/i);
    const n = m ? Number(m[1]) : NaN;
    return n >= 1 && n <= 12 ? n : null;
};

/**
 * @param {object} p
 * @param {string} [p.educationLevel] Career Path's level
 * @param {string} [p.currentClass]   Career Path's class, e.g. 'Class 10'
 * @param {string} [p.board]          CBSE, a state board…
 * @param {string} [p.className]      the class an administrator set on the account
 * @param {string} [p.accountType]
 * @returns {{key: string, school: boolean, classNo: number|null, board: string, label: string}}
 */
const levelFor = ({ educationLevel = '', currentClass = '', board = '', className = '', accountType = '' } = {}) => {
    let key = BAND_BY_LEVEL[educationLevel] || null;
    let classNo = classNumber(currentClass);
    if (!key) {
        classNo = classNo || classNumber(className);
        if (classNo) key = bandOfClass(classNo);
        else if (accountType === 'college_student') key = 'undergraduate';
        else if (['adult', 'professional', 'instructor'].includes(accountType)) key = 'professional';
        else key = 'general';
    }
    const school = SCHOOL.has(key);
    if (!school) classNo = null;
    const boardText = school && board ? `, ${board} board` : '';
    const label = school
        ? `${classNo ? `a Class ${classNo}` : 'a'} student (${STAGE_NAME[key]}${boardText}), about ${classNo ? classNo + 5 : { primary: 8, middle: 12, high: 15, senior: 17 }[key]} years old`
        : { diploma: 'a diploma student', undergraduate: 'an undergraduate student', postgraduate: 'a postgraduate student', professional: 'a working professional', general: '' }[key];
    return { key, school, classNo, board: school ? board : '', label };
};

/** "Class 10" or "school": how a question names where they study. */
const classWords = (level) => (level?.classNo ? `Class ${level.classNo}` : 'your class');

// What each band of student is interviewed for, asked about, and kept away
// from. Spoken to the AI interviewer, the question bank and the evaluator.
const NEVER_PERSONAL = 'Never ask for personal details such as their address, phone number, or their family\'s jobs or income.';
const SCHOOL_AVOID = 'Never ask about jobs they have held, a manager, a salary, an office, clients, notice periods or work deadlines — nothing a school student could not have done yet.';
const GUIDE = {
    primary: {
        frame: 'a gentle practice chat, like the one a young child has when joining a new school or a club',
        ask: 'their everyday school life: a favourite subject, book or game, what they like doing, friends, helping others, and simple "what would you do if…" questions about school',
        technical: 'very simple questions from what a child learns in their class — counting and shapes, plants, animals, the seasons, good habits — or the skills in their profile',
        words: 'Use very short sentences and easy words. One small question at a time.'
    },
    middle: {
        frame: 'a friendly practice interview, like a school club, competition or class-representative selection',
        ask: 'their subjects and favourite topics, a school project or science fair, reading and hobbies, teamwork with classmates, and what they would like to become',
        technical: 'concepts from their own class syllabus (maths, science, computers, languages) or the skills in their profile, at their class level',
        words: 'Use short, simple sentences and words a 12-year-old knows.'
    },
    high: {
        frame: 'a friendly practice interview of the kind a Class 9–10 student really faces: admission to Class 11 or a junior college, a scholarship, or a school club or competition selection',
        ask: 'their subjects and favourite topics, how they prepare for exams, school projects and activities, which stream (Science, Commerce or Arts) they plan to take after Class 10 and why, and their dream of what to become',
        technical: 'concepts from their own Class 9–10 syllabus, or the skills in their profile, at that level',
        words: 'Use short, simple sentences and words a 15-year-old knows.'
    },
    senior: {
        frame: 'a practice interview of the kind a Class 11–12 student faces: college or university admission, an entrance or scholarship interview',
        ask: 'their stream and subjects, the course and college they want after Class 12 and why, how they prepare for board and entrance exams, projects, activities and leadership at school, and their goal',
        technical: 'concepts from their own Class 11–12 subjects, or the skills in their profile, at that level',
        words: 'Use clear, simple English a 17-year-old knows.'
    },
    diploma: {
        frame: 'an internship or first-job interview for a diploma student',
        ask: 'their course, practical work and projects, and their skills',
        technical: 'practical questions on their course subjects and skills',
        words: 'Use clear, simple English.',
        avoid: 'Do not assume full-time work experience.'
    },
    undergraduate: {
        frame: 'an internship or campus placement interview for a college student',
        ask: 'their degree, projects, any internships, and their skills',
        technical: 'questions on their own skills and course subjects, at a fresher\'s level',
        words: 'Use clear English.',
        avoid: 'Do not assume full-time work experience.'
    },
    postgraduate: {
        frame: 'a campus placement or research-position interview for a postgraduate student',
        ask: 'their specialisation, projects or research, internships, and their skills',
        technical: 'questions on their specialisation and skills, with some depth',
        words: 'Use clear English.'
    },
    professional: {
        frame: 'a job interview for a working professional',
        ask: 'their work experience, the results they achieved, and their skills',
        technical: 'questions on the skills they use at work, with real depth',
        words: 'Use clear, professional English.'
    }
};

/**
 * The paragraph that tells the AI who it is interviewing. Empty for 'general'
 * (and for sessions saved before levels): the interviewer behaves as it did.
 */
const brief = (level) => {
    const g = level && GUIDE[level.key];
    if (!g) return '';
    return `WHO YOU ARE INTERVIEWING: ${level.label}. This is ${g.frame}.
Ask about ${g.ask}. For technical questions, ask ${g.technical}. Where the profile has little, ask what someone at this level would really know from their own studies and life.
${level.school ? `${SCHOOL_AVOID} ${NEVER_PERSONAL}` : g.avoid || ''}
${g.words}`.replace(/\n\s*\n/g, '\n');
};

/** How the evaluator should judge, for this level. Empty for 'general'. */
const judging = (level) => {
    if (!level || !GUIDE[level.key]) return '';
    if (level.school) return `Judge the answers against what is expected of ${level.label} — as an admission or scholarship panel would, not as an employer. A clear, honest answer with a real example from school life deserves a good score. Never mark them down for having no work experience, for technical depth beyond their class, or for simple words. Write the report in simple English they can follow.`;
    return `Judge the answers against what is expected of ${level.label}.`;
};

module.exports = { levelFor, classNumber, classWords, brief, judging };
