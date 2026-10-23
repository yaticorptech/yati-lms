/**
 * Research Path: what each stage is, how to do it, and the mistakes to
 * avoid — the "Learn this stage" panel under every stage. Keys match the
 * stages the server creates (src/teacher/researchPath.js).
 */

export const STAGE_GUIDES = {
    topic: {
        why: 'A good topic is narrow enough to finish, important enough to matter, and close enough to your interests to keep you going for years.',
        how: [
            'Start from problems you meet in your teaching, your institution or your community.',
            'Read two or three recent review articles in the area to see what is already known.',
            'Narrow the topic by population (who), setting (where), and variable or phenomenon (what).',
            'Test it with the FINER check: Feasible, Interesting, Novel, Ethical, Relevant.'
        ],
        mistakes: ['A topic so broad it needs ten theses ("education in India").', 'A topic with no access to data or participants.', 'Choosing only what is fashionable rather than what you can do well.'],
        example: 'Broad: "Mathematics learning" → Narrow: "The effect of peer tutoring on mathematics anxiety among first-year undergraduates in rural colleges of north Karnataka".'
    },
    literature: {
        why: 'The literature review shows what is known, how it was studied, and the gap your research fills. It also stops you repeating someone else\'s study.',
        how: [
            'List your keywords and their synonyms; combine them with AND / OR / NOT in database searches.',
            'Search Scopus, Web of Science, ERIC, PubMed, Google Scholar and Shodhganga (Indian theses).',
            'Screen titles and abstracts first; read full texts of the relevant ones.',
            'Record each study in a literature matrix: author, year, place, method, sample, findings, gaps.',
            'Write by themes, comparing studies — a synthesis, not a list of summaries.'
        ],
        mistakes: ['Summarising one paper per paragraph instead of comparing them.', 'Relying on old sources only — include the last five years.', 'Citing papers you have not read.'],
        tools: [['Shodhganga (Indian theses)', 'https://shodhganga.inflibnet.ac.in/'], ['Google Scholar', 'https://scholar.google.com/'], ['Zotero', 'https://www.zotero.org/']]
    },
    questions: {
        why: 'Research questions decide everything that follows — the design, the data and the analysis. Precise questions make a thesis easier to write and to examine.',
        how: [
            'Write one main research question and two to four sub-questions or objectives.',
            'Use question words that match your aim: "What is the effect of…" (experimental), "What is the relationship between…" (correlational), "How do… experience…" (qualitative).',
            'For quantitative studies, write hypotheses: H₁ (an effect exists) and H₀ (no effect).',
            'Make each question answerable with the data you can actually collect.'
        ],
        mistakes: ['Questions that are yes/no and trivially answered.', 'Objectives that do not match the questions.', 'More questions than the study can answer well.'],
        example: 'RQ: What is the effect of structured peer tutoring on the mathematics anxiety of first-year undergraduates?  H₁: Students in peer tutoring groups report lower anxiety than those in lecture-only groups.'
    },
    methodology: {
        why: 'The methodology shows the reader how you answered your questions, and why they can trust the answers.',
        how: [
            'Choose the research design that fits your questions (see Research Methodologies — the advisor helps).',
            'Define the population, the sample size (with a reason — e.g. a power analysis with the free G*Power tool, or saturation) and the sampling method.',
            'Choose validated instruments where possible; plan how you will check validity and reliability.',
            'Plan a pilot study to test your instruments and procedure.',
            'Match each research question to a specific analysis.'
        ],
        mistakes: ['A design chosen before the questions.', 'No justification for the sample size.', 'Instruments made up without validation.']
    },
    proposal: {
        why: 'The proposal (synopsis) is your plan, approved by your research committee. Ethics approval protects your participants — and you.',
        how: [
            'Follow your university\'s synopsis format: title, introduction, review, gap, objectives, methodology, timeline, references.',
            'Prepare a participant information sheet and consent form in the participants\' language.',
            'Apply to your Institutional Ethics Committee (IEC) before collecting any data from people.',
            'Present the proposal to your research advisory committee and record their suggestions.'
        ],
        mistakes: ['Collecting data before ethics approval.', 'Consent forms full of jargon.', 'An unrealistic timeline.']
    },
    data: {
        why: 'Your conclusions are only as good as your data. Careful, documented collection makes analysis and examination smooth.',
        how: [
            'Run the pilot study and fix problems in instruments and procedure.',
            'Collect data exactly as planned; record any change and the reason.',
            'Keep a data log: dates, places, numbers collected, problems.',
            'Store data securely, anonymise it, and keep backups in two places.'
        ],
        mistakes: ['Changing instruments half-way without recording it.', 'A single copy of the data on one laptop.', 'Identifiable information stored with responses.']
    },
    analysis: {
        why: 'Analysis turns data into answers to your research questions — one question at a time.',
        how: [
            'Clean the data: check for errors, missing values and outliers.',
            'Quantitative: check assumptions, then run the planned tests; report effect sizes, not only p-values.',
            'Qualitative: code the data, develop themes, and keep an audit trail of decisions.',
            'Prepare clear tables and figures for each research question.',
            'Write the results for each question before interpreting them.'
        ],
        mistakes: ['Running many tests until something is significant.', 'Reporting only p-values.', 'Themes that just repeat interview questions.'],
        tools: [['JASP (free statistics)', 'https://jasp-stats.org/'], ['Taguette (free qualitative coding)', 'https://www.taguette.org/']]
    },
    writing: {
        why: 'Writing is where the thesis comes together. Steady writing through the project is easier than writing everything at the end.',
        how: [
            'Draft results and methods first — they are the most concrete.',
            'Then the discussion: what the results mean and how they compare with earlier work.',
            'Revise the introduction and literature review to fit what you found.',
            'Write the conclusion and abstract last.',
            'Use Thesis Writing here — each chapter has its own guide.'
        ],
        mistakes: ['Leaving all the writing to the last few months.', 'A discussion that only repeats the results.', 'Ignoring the university\'s formatting rules until the end.']
    },
    submission: {
        why: 'Submission and the viva are the final checks on your work. Preparation makes them a chance to show what you know.',
        how: [
            'Format the thesis to your university\'s rules; complete declarations and certificates.',
            'Run the plagiarism check required by your university and keep the report.',
            'Submit, then prepare for the viva: a 20–30 minute presentation of the problem, method, findings and contribution.',
            'Anticipate questions on your choices: why this design, this sample, this analysis — and your limitations.',
            'After the viva, make the corrections asked for within the time allowed.'
        ],
        mistakes: ['Not knowing your own limitations.', 'A presentation that reads slides aloud.', 'Missing the deadline for corrections.']
    },
    publication: {
        why: 'Publishing shares your findings, adds to your record, and lets others build on your work.',
        how: [
            'Plan one paper per research question or chapter.',
            'Choose journals carefully and avoid predatory ones.',
            'Follow the step-by-step publishing guide on the Publications Map.',
            'Present at conferences and share your work after publication.'
        ],
        mistakes: ['Publishing in predatory journals.', 'Waiting years after the viva — findings lose their freshness.'],
        guideLink: true
    }
};
