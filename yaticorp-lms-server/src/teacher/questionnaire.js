/**
 * The questionnaire builder (Research Methodologies → Questionnaire builder):
 * the Likert scales and their answer labels, checking what the editor sends,
 * and the questionnaire as a Word document to print or share for data
 * collection. Everything is in the app: no outside service.
 *
 * In the Word file, Likert statements in a row that share a scale become one
 * table (statement down the side, the scale across the top, a box under each
 * answer), the usual layout of a printed survey. Other questions are numbered
 * lines with their answer boxes or writing lines under them.
 */
const { buildDocx, paragraph, table } = require('./docx');
const { QUESTION_TYPES, LIKERT_SCALES } = require('./models');

/** The answer labels of each scale, at 5 and 7 points. */
const SCALES = {
    agreement: {
        label: 'Agreement',
        5: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
        7: ['Strongly disagree', 'Disagree', 'Somewhat disagree', 'Neutral', 'Somewhat agree', 'Agree', 'Strongly agree']
    },
    frequency: {
        label: 'Frequency',
        5: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
        7: ['Never', 'Very rarely', 'Rarely', 'Sometimes', 'Often', 'Very often', 'Always']
    },
    satisfaction: {
        label: 'Satisfaction',
        5: ['Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied'],
        7: ['Very dissatisfied', 'Dissatisfied', 'Somewhat dissatisfied', 'Neutral', 'Somewhat satisfied', 'Satisfied', 'Very satisfied']
    },
    importance: {
        label: 'Importance',
        5: ['Not important', 'Slightly important', 'Moderately important', 'Very important', 'Extremely important'],
        7: ['Not at all important', 'Low importance', 'Slightly important', 'Neutral', 'Moderately important', 'Very important', 'Extremely important']
    },
    likelihood: {
        label: 'Likelihood',
        5: ['Very unlikely', 'Unlikely', 'Neutral', 'Likely', 'Very likely'],
        7: ['Very unlikely', 'Unlikely', 'Somewhat unlikely', 'Neutral', 'Somewhat likely', 'Likely', 'Very likely']
    }
};

// Small enough that a teacher's 20 questionnaires fit in their own record.
const LIMITS = { questionnaires: 20, questions: 100, options: 12, title: 200, intro: 2000, text: 500, option: 120 };

const text = (v, max) => String(v ?? '').trim().slice(0, max);

/** One question as it is stored, or { error }. */
const cleanQuestion = (q = {}, n) => {
    const type = QUESTION_TYPES.includes(q.type) ? q.type : null;
    if (!type) return { error: `Question ${n} has a type that is not on the list.` };
    const out = { type, text: text(q.text, LIMITS.text), options: [], scale: 'agreement', points: 5 };
    if (type === 'likert') {
        out.scale = LIKERT_SCALES.includes(q.scale) ? q.scale : 'agreement';
        out.points = Number(q.points) === 7 ? 7 : 5;
    }
    if (type === 'single' || type === 'multiple') {
        const options = (Array.isArray(q.options) ? q.options : []).map((o) => text(o, LIMITS.option));
        if (options.length > LIMITS.options) return { error: `Question ${n} has more than ${LIMITS.options} answers.` };
        out.options = options;
    }
    return { question: out };
};

/**
 * What the editor sent, checked: { title, intro, questions } (only those
 * given when `partial`), or { error: [field, message] }.
 */
const cleanQuestionnaire = (body = {}, partial = false) => {
    const out = {};
    if (!partial || body.title !== undefined) {
        const title = text(body.title, LIMITS.title);
        if (title.length < 2) return { error: ['title', 'Give the questionnaire a title.'] };
        out.title = title;
    }
    if (body.intro !== undefined) out.intro = String(body.intro ?? '').slice(0, LIMITS.intro);
    if (body.questions !== undefined) {
        if (!Array.isArray(body.questions)) return { error: ['questions', 'The questions could not be read.'] };
        if (body.questions.length > LIMITS.questions) return { error: ['questions', `A questionnaire can hold up to ${LIMITS.questions} questions.`] };
        const questions = [];
        for (const [i, q] of body.questions.entries()) {
            const { question, error } = cleanQuestion(q, i + 1);
            if (error) return { error: ['questions', error] };
            questions.push(question);
        }
        out.questions = questions;
    }
    return { out };
};

/* ── The Word file ─────────────────────────────────────────────────────── */

const BOX = '☐';      // tick one or many
const CIRCLE = '○';   // tick one
const PAGE = 8306;    // the A4 page's writing width, in twips
const small = (t, o = {}) => paragraph({ text: t, size: 9, ...o }, { align: 'center', spaceAfter: 0, line: 240 });

/** Likert statements sharing a scale: one table, numbered on from `first`. */
const likertTable = (items, first) => {
    const labels = SCALES[items[0].scale][items[0].points];
    const answer = items[0].points === 7 ? 700 : 900;
    const number = 520;
    const widths = [number, PAGE - number - answer * labels.length, ...labels.map(() => answer)];
    const header = [[small('No.', { bold: true })], [paragraph({ text: 'Statement', bold: true, size: 10 }, { spaceAfter: 0, line: 240 })], ...labels.map((l) => [small(l, { bold: true })])];
    const rows = items.map((q, i) => [
        [small(String(first + i))],
        [paragraph({ text: q.text || '(Statement)', size: 11 }, { spaceAfter: 0, line: 240 })],
        ...labels.map(() => [small(BOX, { size: 12 })])
    ]);
    return table({ widths, rows: [header, ...rows] });
};

const renderQuestionnaireDocx = (q, author) => {
    const body = [];
    body.push(paragraph({ text: q.title, bold: true, size: 18 }, { align: 'center', spaceAfter: 240 }));
    if (author) body.push(paragraph({ text: `Prepared by ${author}`, italic: true, size: 10 }, { align: 'center', spaceAfter: 240 }));
    for (const para of String(q.intro || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
        body.push(paragraph({ text: para }, { align: 'both' }));
    }

    const questions = q.questions || [];
    let n = 0;
    for (let i = 0; i < questions.length; i += 1) {
        const item = questions[i];
        if (item.type === 'section') {
            body.push(paragraph(item.text || 'Section', { style: 'Heading2' }));
            continue;
        }
        if (item.type === 'likert') {
            // The run of Likert statements on the same scale, from here.
            const run = [item];
            while (questions[i + run.length]?.type === 'likert' && questions[i + run.length].scale === item.scale && questions[i + run.length].points === item.points) run.push(questions[i + run.length]);
            body.push(paragraph({ text: 'Tick one box for each statement.', italic: true, size: 10 }, { keepNext: true, spaceAfter: 80 }));
            body.push(likertTable(run, n + 1));
            body.push(paragraph('', { spaceAfter: 120 }));
            n += run.length;
            i += run.length - 1;
            continue;
        }
        n += 1;
        const hint = { single: 'Tick one.', multiple: 'Tick all that apply.', yesno: 'Tick one.' }[item.type];
        body.push(paragraph([{ text: `${n}. `, bold: true }, { text: item.text || '(Question)' }, ...(hint ? [{ text: `  (${hint})`, italic: true, size: 10, color: '4B5563' }] : [])], { keepNext: true, spaceAfter: 80 }));
        if (item.type === 'single' || item.type === 'multiple') {
            const mark = item.type === 'single' ? CIRCLE : BOX;
            const options = item.options.filter(Boolean);
            options.forEach((o, k) => body.push(paragraph(`${mark}  ${o}`, { hanging: 360, spaceAfter: k === options.length - 1 ? 200 : 40, keepNext: k < options.length - 1 })));
        } else if (item.type === 'yesno') {
            body.push(paragraph(`${BOX}  Yes          ${BOX}  No`, { hanging: 360, spaceAfter: 200 }));
        } else {
            const lines = item.type === 'long' ? 4 : 1;
            for (let k = 0; k < lines; k += 1) body.push(paragraph({ text: '_'.repeat(70), color: '9CA3AF' }, { spaceAfter: k === lines - 1 ? 200 : 60 }));
        }
    }
    body.push(paragraph({ text: 'Thank you for your time.', italic: true }, { align: 'center', spaceBefore: 360 }));
    return buildDocx({ title: q.title, author, body, firstPageNumbered: true });
};

module.exports = { SCALES, LIMITS, cleanQuestionnaire, renderQuestionnaireDocx };
