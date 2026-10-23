/**
 * The methodology advisor's six questions. Each answer adds weight to the
 * designs it points to; the designs with the most weight are suggested,
 * with the answers that led to them as the reason. Answers rather than
 * keywords: a teacher who does not yet know the vocabulary still gets a
 * sound suggestion.
 */
import { BY_KEY } from './methodologies';

export const ADVISOR_QUESTIONS = [
    {
        key: 'aim', question: 'What do you mainly want to do?',
        options: [
            { key: 'measure', label: 'Measure how much, how many or how often', weights: { survey: 3, correlational: 2, experimental: 1, 'mixed-methods': 1 } },
            { key: 'effect', label: 'Test whether something causes a change', weights: { experimental: 4, 'action-research': 1, 'design-based': 1 } },
            { key: 'relation', label: 'Find how two or more things are related', weights: { correlational: 4, survey: 2 } },
            { key: 'understand', label: 'Understand people’s experiences or views in depth', weights: { phenomenology: 3, narrative: 2, 'case-study': 2, 'grounded-theory': 1, ethnography: 1 } },
            { key: 'theory', label: 'Explain how a process works, building a new theory', weights: { 'grounded-theory': 4, 'case-study': 1, ethnography: 1 } },
            { key: 'improve', label: 'Improve my own teaching or institution', weights: { 'action-research': 4, 'design-based': 2 } },
            { key: 'build', label: 'Design and test a new tool, module or programme', weights: { 'design-based': 4, 'action-research': 1, experimental: 1 } },
            { key: 'review', label: 'Sum up what published studies already show', weights: { 'systematic-review': 6 } }
        ]
    },
    {
        key: 'change', question: 'Will you change anything — try out an intervention?',
        options: [
            { key: 'groups', label: 'Yes, and compare with a group that does not get it', weights: { experimental: 3 } },
            { key: 'own', label: 'Yes, in my own classes, improving it in cycles', weights: { 'action-research': 3, 'design-based': 1 } },
            { key: 'no', label: 'No — I will only observe, ask or measure', weights: { survey: 1, correlational: 1, 'case-study': 1, phenomenology: 1, ethnography: 1, 'grounded-theory': 1, narrative: 1 } },
            { key: 'published', label: 'No — I will only use published studies', weights: { 'systematic-review': 4 } }
        ]
    },
    {
        key: 'data', question: 'What kind of data fits your question best?',
        options: [
            { key: 'numbers', label: 'Numbers: test scores, ratings, counts', weights: { survey: 2, experimental: 2, correlational: 2 } },
            { key: 'words', label: 'Words: interviews, observations, documents', weights: { 'case-study': 1, phenomenology: 2, 'grounded-theory': 2, ethnography: 2, narrative: 2 } },
            { key: 'both', label: 'Both numbers and words', weights: { 'mixed-methods': 4, 'action-research': 1, 'design-based': 1 } },
            { key: 'studies', label: 'The results of other studies', weights: { 'systematic-review': 3 } }
        ]
    },
    {
        key: 'people', question: 'How many people or settings will you study?',
        options: [
            { key: 'many', label: 'Many people (100 or more), to generalise', weights: { survey: 2, correlational: 2, experimental: 1 } },
            { key: 'few', label: 'A few people (5–30), in depth', weights: { phenomenology: 2, narrative: 2, 'grounded-theory': 1 } },
            { key: 'one', label: 'One setting, group or programme', weights: { 'case-study': 3, ethnography: 2, 'action-research': 1 } },
            { key: 'none', label: 'None — documents or published papers only', weights: { 'systematic-review': 2, 'case-study': 1 } }
        ]
    },
    {
        key: 'time', question: 'How long can you spend collecting data?',
        options: [
            { key: 'weeks', label: 'A few weeks', weights: { survey: 1, correlational: 1 } },
            { key: 'term', label: 'A term or semester', weights: { experimental: 1, 'action-research': 1, 'case-study': 1 } },
            { key: 'year', label: 'Months to a year, spending time with the group', weights: { ethnography: 3, 'action-research': 1, 'design-based': 1 } },
            { key: 'desk', label: 'No field work — desk research only', weights: { 'systematic-review': 1 } }
        ]
    },
    {
        key: 'outcome', question: 'What should the study give you at the end?',
        options: [
            { key: 'stats', label: 'A tested answer, with statistics', weights: { experimental: 1, survey: 1, correlational: 1 } },
            { key: 'themes', label: 'A rich description and themes', weights: { phenomenology: 1, 'case-study': 1, ethnography: 1, narrative: 1 } },
            { key: 'model', label: 'A new theory or model', weights: { 'grounded-theory': 2 } },
            { key: 'practice', label: 'Better practice in my own setting', weights: { 'action-research': 2, 'design-based': 1 } },
            { key: 'product', label: 'A working product and design principles', weights: { 'design-based': 2 } },
            { key: 'synthesis', label: 'A summary of all the evidence', weights: { 'systematic-review': 2 } }
        ]
    }
];

/**
 * answers: { questionKey: optionKey }. Answers in the advisor's usual shape:
 * { recommendations: [{ key, fit, why }], design, questionsToConsider }.
 */
export const adviseByAnswers = (answers) => {
    const score = {};
    const because = {};
    for (const q of ADVISOR_QUESTIONS) {
        const option = q.options.find((o) => o.key === answers[q.key]);
        if (!option) continue;
        for (const [method, w] of Object.entries(option.weights)) {
            score[method] = (score[method] || 0) + w;
            if (w >= 2) (because[method] ||= []).push(option.label.toLowerCase());
        }
    }
    const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const best = ranked[0]?.[1] || 0;
    const recommendations = ranked.map(([key, n]) => ({
        key,
        fit: n >= best * 0.75 ? 'strong' : 'possible',
        why: `${BY_KEY.get(key)?.summary || ''}${because[key]?.length ? ` You said: ${because[key].slice(0, 2).join('; ')}.` : ''}`
    }));
    const top = BY_KEY.get(ranked[0]?.[0]);
    return {
        recommendations,
        design: top ? `Start with ${top.name.toLowerCase()}. First step: ${top.steps[0].charAt(0).toLowerCase()}${top.steps[0].slice(1)}.` : '',
        questionsToConsider: [
            'Write your research question so that it matches this design’s kind of question.',
            'Check the design against your time, your access to participants and your skills in analysis.',
            'Discuss the choice with your supervisor before you write the proposal.'
        ]
    };
};
