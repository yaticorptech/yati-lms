/**
 * Research Methodologies → Questionnaire builder: what a new questionnaire
 * can start from, and the question types the builder offers. The scales'
 * answer labels come from the server (teacher/questionnaire.js), which also
 * writes them into the Word file.
 */

export const QUESTION_TYPES = [
    ['likert', 'Likert statement', 'A statement answered on a scale (Strongly disagree … Strongly agree)'],
    ['single', 'One answer', 'Multiple choice: tick one'],
    ['multiple', 'Many answers', 'Checkboxes: tick all that apply'],
    ['yesno', 'Yes / No', 'Two boxes'],
    ['short', 'Short answer', 'One line to write on'],
    ['long', 'Long answer', 'A few lines to write on'],
    ['section', 'Section heading', 'Groups the questions after it, e.g. "Section B: Your views"']
];
export const TYPE_LABEL = Object.fromEntries(QUESTION_TYPES.map(([k, l]) => [k, l]));

export const PLACEHOLDER = {
    likert: 'The statement, e.g. Online classes are easy to follow.',
    single: 'The question, e.g. Which year of study are you in?',
    multiple: 'The question, e.g. Which devices do you use for study?',
    yesno: 'The question, e.g. Do you have internet at home?',
    short: 'The question, e.g. Name of your college',
    long: 'The question, e.g. What would make online classes better for you?',
    section: 'The section title, e.g. Section B: Your views'
};

/** A question of a type, as the builder adds it. */
export const blankQuestion = (type) => ({
    type, text: '', scale: 'agreement', points: 5,
    options: type === 'single' || type === 'multiple' ? ['', ''] : []
});

const INTRO = 'This questionnaire is part of a research study on [your topic]. It takes about 10 minutes. Your answers are anonymous and will be used only for this research. Taking part is voluntary, and you may skip any question.';

const ABOUT_YOU = [
    { type: 'section', text: 'Section A: About you' },
    { type: 'single', text: 'Your age group', options: ['Under 18', '18–24', '25–34', '35–44', '45 and above'] },
    { type: 'single', text: 'Gender', options: ['Female', 'Male', 'Prefer not to say'] },
    { type: 'single', text: 'Highest education completed', options: ['Secondary school', 'Higher secondary (PUC / 12th)', 'Undergraduate degree', 'Postgraduate degree', 'Doctorate'] },
    { type: 'short', text: 'Occupation' }
];

export const STARTERS = [
    ['about', 'An "About you" section and three Likert statements', () => ({
        intro: INTRO,
        questions: [...ABOUT_YOU, { type: 'section', text: 'Section B: Your views' }, ...[0, 1, 2].map(() => blankQuestion('likert'))]
    })],
    ['blank', 'A blank questionnaire', () => ({ intro: INTRO, questions: [] })]
];
