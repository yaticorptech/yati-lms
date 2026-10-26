/**
 * Research Path: the stages a research project moves through, from topic to
 * publication, each with the tasks that usually make it up. A new project
 * starts from this template; the teacher ticks tasks off, adds their own,
 * and sets a target date per stage.
 *
 * The stages and tasks are written for the project's own topic (topic.js
 * reads the title): its ideas, its setting, the databases for its field.
 * A template entry is either plain text, or [general text, (topic) => text]:
 * the general text is used when the topic gives nothing to fill in, and is
 * how older projects (made before this) are recognised and brought up to date.
 */
const { readTopic } = require('./topic');

const q = (s) => `“${s}”`;

const STAGES = [
    {
        key: 'topic', title: 'Topic & problem',
        description: ['Find a problem worth solving and narrow it to a researchable topic.', (c) => `Narrow ${q(c.title)} to a clear problem you can study.`],
        tasks: [
            ['List three candidate topics from your teaching or field', (c) => `Write three narrower versions of ${q(c.title)}: who exactly, where, and what you will measure or explore`],
            ['Read recent review articles on each candidate', (c) => `Read recent review articles on ${c.list}`],
            ['Write a one-paragraph problem statement', (c) => `Write a one-paragraph problem statement: what is wrong or unknown about ${c.core}${c.at}, and who it affects`],
            ['Discuss the topic with a supervisor or senior colleague', (c) => `Discuss ${q(c.title)} with a supervisor or senior colleague`]
        ]
    },
    {
        key: 'literature', title: 'Literature review',
        description: ['Map what is already known and where the gap is.', (c) => `Map what is already known about ${c.list}, and where the gap is.`],
        tasks: [
            ['Search Scopus / Web of Science / Google Scholar with defined keywords', (c) => `Search ${c.databases} for: ${c.search}`],
            'Set up a reference manager (Zotero or Mendeley)',
            ['Build a literature matrix: author, year, method, findings, gaps', (c) => `Build a literature matrix of studies on ${c.list}: author, year, method, findings, gaps`],
            ['Write the research gap in two or three sentences', (c) => `In two or three sentences, write the gap in research on ${c.core}${c.at}`]
        ]
    },
    {
        key: 'questions', title: 'Research questions & hypotheses',
        description: ['Turn the gap into precise questions (and hypotheses, if quantitative).', (c) => `Turn the gap into precise questions about ${c.core}${c.at}.`],
        tasks: [
            ['Write the main research question', (c) => (c.x && c.y ? `Write the main research question, e.g. “How is ${c.x} related to ${c.y}${c.at}?”`
                : c.vs ? `Write the main research question, e.g. “How do ${c.x} and ${c.vs} compare${c.at}?”`
                    : `Write the main research question about ${c.core}${c.at}`)],
            ['Write two to four sub-questions or objectives', (c) => (c.ideas.length > 1 ? `Write two to four sub-questions or objectives, covering ${c.list}` : null)],
            ['State hypotheses (quantitative studies)', (c) => (c.x && c.y ? `State hypotheses about ${c.x} and ${c.y} (quantitative studies)` : null)],
            'Check each question is answerable with the time and data you have'
        ]
    },
    {
        key: 'methodology', title: 'Methodology & design',
        description: ['Choose the design, sample, instruments and analysis.', (c) => `Choose the design, sample, instruments and analysis for studying ${c.core}${c.at}.`],
        tasks: [
            'Choose the research design (see Research Methodologies)',
            ['Define the population, sample size and sampling method', (c) => (c.place ? `Define the population (${c.place}), sample size and sampling method` : null)],
            ['Select or develop instruments; plan a pilot', (c) => `Select or develop instruments to study ${c.list}; plan a pilot`],
            'Plan the analysis for each research question'
        ]
    },
    {
        key: 'proposal', title: 'Proposal & ethics approval',
        description: ['Write the proposal and get it approved, with ethical clearance.', (c) => `Write the proposal for ${q(c.title)} and get it approved, with ethical clearance.`],
        tasks: [
            ['Write the research proposal or synopsis', (c) => `Write the research proposal or synopsis for ${q(c.title)}`],
            ['Prepare consent forms and participant information sheets', (c) => (c.where ? `Prepare consent forms and information sheets for participants ${c.where}` : null)],
            'Submit to the institutional ethics committee',
            'Present the proposal to the research committee'
        ]
    },
    {
        key: 'data', title: 'Data collection',
        description: ['Collect the data as planned, and keep it safe.', (c) => (c.where ? `Collect the data ${c.where} as planned, and keep it safe.` : null)],
        tasks: [
            'Run the pilot study and refine instruments',
            ['Collect data from the full sample', (c) => (c.where ? `Collect data from the full sample ${c.where}` : null)],
            'Keep a data-collection log',
            'Back up and secure the raw data'
        ]
    },
    {
        key: 'analysis', title: 'Analysis',
        description: ['Analyse the data question by question.', (c) => `Analyse the data on ${c.list}, question by question.`],
        tasks: [
            'Clean and code the data',
            'Run the planned analyses',
            'Make the key tables and figures',
            ['Write up findings for each research question', (c) => `Write up the findings on ${c.list} for each research question`]
        ]
    },
    {
        key: 'writing', title: 'Writing the thesis or paper',
        description: ['Draft, revise and polish every chapter.', (c) => `Draft, revise and polish every chapter of ${q(c.title)}.`],
        tasks: [
            ['Draft the results and discussion', (c) => `Draft the results, and discuss them against earlier studies on ${c.list}`],
            'Revise the introduction and literature review in light of the findings',
            'Write the conclusion, limitations and future work',
            'Run a plagiarism check and fix citations'
        ]
    },
    {
        key: 'submission', title: 'Submission & defence',
        description: 'Submit, respond to reviewers and defend.',
        tasks: ['Format to the university or journal guidelines', 'Submit the thesis or manuscript', 'Respond to examiner or reviewer comments', 'Prepare and give the viva / defence presentation']
    },
    {
        key: 'publication', title: 'Publication & impact',
        description: ['Publish the findings and share them.', (c) => `Publish the findings on ${c.core} and share them.`],
        tasks: [
            ['Identify target journals (scope, indexing, quartile)', (c) => `Identify journals that publish on ${c.list} (scope, indexing, quartile)`],
            'Turn each chapter into a paper',
            'Present at a conference',
            'Add every paper to your Publications Map'
        ]
    }
];

/**
 * Kinds of research, each changing the tasks of the stages where the work
 * really differs: the questions, the design, the data and the analysis.
 * Stages a kind leaves out keep the general tasks above.
 */
const KINDS = {
    general: { label: 'General', description: 'The standard path, for any kind of study.', tasks: {} },
    survey: {
        label: 'Survey / quantitative',
        description: 'Questionnaires and numbers: measuring attitudes, levels or relationships in a sample.',
        tasks: {
            questions: [
                ['Write the main research question in terms of variables', (c) => (c.x && c.y ? `Write the main question in terms of variables, e.g. “How is ${c.x} related to ${c.y}${c.at}?”`
                    : `Write the main question about ${c.core}${c.at} in terms of variables`)],
                ['List the variables: independent, dependent, control', (c) => (c.ideas.length > 1 ? `List the variables (${c.list}): independent, dependent, control` : null)],
                'State the null and alternative hypotheses',
                ['Define each variable operationally (how it will be measured)', (c) => `Define how ${c.list} will be measured`]
            ],
            methodology: [
                'Choose cross-sectional or longitudinal design',
                'Calculate the sample size (power analysis in G*Power, or Krejcie & Morgan table)',
                ['Choose the sampling technique (random, stratified, cluster)', (c) => (c.place ? `Choose how to sample ${c.place} (random, stratified, cluster)` : null)],
                ['Select a validated questionnaire or build one; plan content validity by experts', (c) => `Select a validated questionnaire on ${c.list} or build one; plan content validity by experts`]
            ],
            data: [
                'Pilot the questionnaire with 30–50 respondents',
                'Check reliability (Cronbach’s α ≥ 0.7) and revise items',
                ['Collect responses from the full sample; track the response rate', (c) => (c.where ? `Collect responses from the full sample ${c.where}; track the response rate` : null)],
                'Enter and back up the data; keep the code book'
            ],
            analysis: [
                'Screen the data: missing values, outliers, normality',
                'Describe the sample (frequencies, means, SD)',
                ['Test the hypotheses (t-test, ANOVA, correlation, regression) and report effect sizes', (c) => (c.x && c.y ? `Test how ${c.x} and ${c.y} are related (correlation, regression, t-test or ANOVA) and report effect sizes` : null)],
                'Make one table or figure per research question'
            ]
        }
    },
    experimental: {
        label: 'Experimental / quasi-experimental',
        description: 'Testing the effect of an intervention, with groups and a pre-test and post-test.',
        descriptions: { questions: (c) => (c.x && c.y ? `Turn the gap into a question about the effect of ${c.x} on ${c.y}.` : null) },
        tasks: {
            questions: [
                ['Write the question as an effect: “What is the effect of X on Y?”', (c) => (c.x && c.y ? `Write the question as an effect: “What is the effect of ${c.x} on ${c.y}${c.at}?”`
                    : c.vs ? `Write the question as an effect: “What is the effect of ${c.x}, compared with ${c.vs}, on [the outcome]${c.at}?”` : null)],
                ['Define the intervention (X) and the outcome (Y)', (c) => (c.x && c.y ? `Define the intervention (${c.x}) and the outcome (${c.y})`
                    : c.vs ? `Define the intervention (${c.x}), what it is compared with (${c.vs}) and the outcome` : null)],
                ['State the hypotheses (H₀ and H₁)', (c) => (c.x && c.y ? `State the hypotheses: H₀, ${c.x} has no effect on ${c.y}; H₁, it has an effect` : null)],
                'List variables to control (prior achievement, age…)'
            ],
            methodology: [
                'Choose the design: true experiment, pre-test–post-test control group, or quasi-experimental',
                ['Plan random assignment, or how the groups will be matched', (c) => (c.where ? `Plan random assignment, or how the groups ${c.where} will be matched` : null)],
                ['Write the intervention plan: sessions, duration, materials', (c) => (c.x ? `Write the plan for ${c.x}: sessions, duration, materials` : null)],
                ['Choose the pre-test and post-test instruments; plan their validity', (c) => (c.y ? `Choose a pre-test and post-test of ${c.y}; plan their validity` : null)]
            ],
            data: [
                'Run a small pilot of the intervention',
                'Give the pre-test to both groups',
                ['Deliver the intervention as planned; keep a fidelity log', (c) => (c.x ? `Deliver ${c.x} as planned; keep a fidelity log` : null)],
                'Give the post-test (and a delayed test, if planned)'
            ],
            analysis: [
                'Check that the groups were equal at pre-test',
                ['Compare post-test scores (ANCOVA, t-test or Mann–Whitney)', (c) => (c.y ? `Compare post-test ${c.y} scores (ANCOVA, t-test or Mann–Whitney)` : null)],
                'Report effect sizes (Cohen’s d, η²)',
                'Discuss threats to validity: attrition, testing, history'
            ]
        }
    },
    qualitative: {
        label: 'Qualitative',
        description: 'Interviews, observation or documents: understanding experiences and meanings.',
        tasks: {
            questions: [
                ['Write an open main question: “How do… experience…?”', (c) => `Write an open main question, e.g. “How do people${c.at} experience ${c.core}?”`],
                'Write two to four sub-questions',
                'Note your own position and assumptions (reflexivity)',
                'Check the questions can be answered through talk, observation or documents'
            ],
            methodology: [
                'Choose the approach: case study, phenomenology, grounded theory, ethnography or narrative',
                ['Plan purposive sampling and the expected number of participants (until saturation)', (c) => (c.place ? `Plan purposive sampling of ${c.place} and the expected number of participants (until saturation)` : null)],
                ['Write the interview or observation guide', (c) => `Write the interview or observation guide on ${c.list}`],
                'Plan trustworthiness: member checking, audit trail, thick description'
            ],
            data: [
                'Pilot the interview guide with one or two people',
                ['Conduct and record the interviews or observations, with consent', (c) => (c.where ? `Conduct and record the interviews or observations ${c.where}, with consent` : null)],
                'Transcribe and anonymise each recording',
                'Write field notes and a reflexive journal after each session'
            ],
            analysis: [
                'Read all transcripts closely; make initial codes',
                'Group codes into categories and themes (e.g. Braun & Clarke’s six steps)',
                'Review themes against the data; choose illustrative quotations',
                'Write a thematic map and keep the audit trail'
            ]
        }
    },
    mixed: {
        label: 'Mixed methods',
        description: 'Numbers and words together: a survey with interviews, in sequence or side by side.',
        tasks: {
            questions: [
                ['Write a quantitative question, a qualitative question and a mixed question', (c) => `Write a quantitative, a qualitative and a mixed question on ${c.core}${c.at}`],
                ['Say why both kinds of data are needed', (c) => `Say why ${c.core} needs both numbers and words`],
                'State hypotheses for the quantitative part',
                'Decide which strand has priority'
            ],
            methodology: [
                'Choose the design: convergent, explanatory sequential or exploratory sequential',
                'Plan sampling for each strand and how they are linked',
                ['Select the questionnaire and write the interview guide', (c) => `Select the questionnaire and write the interview guide on ${c.list}`],
                'Plan the point of integration (joint display, follow-up)'
            ],
            data: [
                'Pilot both instruments',
                'Collect the quantitative data and analyse it first (if sequential)',
                'Select interview participants from the survey results',
                'Collect and transcribe the qualitative data'
            ],
            analysis: [
                'Analyse each strand with its own methods',
                'Integrate the results in a joint display',
                'Note where the strands agree, add to each other or disagree',
                'Write meta-inferences that answer the mixed question'
            ]
        }
    },
    review: {
        label: 'Systematic review / meta-analysis',
        description: 'Studying the studies: a full, reproducible search and synthesis of published research.',
        tasks: {
            literature: [
                ['Check no recent review already answers your question (PROSPERO, Cochrane, Google Scholar)', (c) => `Check no recent review on ${c.list} already answers your question (PROSPERO, Cochrane, Google Scholar)`],
                ['Build the search string with synonyms and Boolean operators', (c) => `Build the search string from ${c.search}, adding synonyms with OR`],
                ['Choose the databases (Scopus, Web of Science, ERIC, PubMed)', (c) => `Choose the databases (for this topic: ${c.databases})`],
                'Register the protocol (PROSPERO or OSF)'
            ],
            questions: [
                ['Frame the question with PICO / PICOS (or SPIDER for qualitative)', (c) => (c.x && c.y ? `Frame the question with PICO: population (${c.place || 'who'}), intervention (${c.x}), comparison, outcome (${c.y})`
                    : c.vs ? `Frame the question with PICO: population (${c.place || 'who'}), intervention (${c.x}), comparison (${c.vs}), outcome` : null)],
                'Write the inclusion and exclusion criteria',
                'Decide the outcomes to extract',
                'Decide whether a meta-analysis is possible'
            ],
            methodology: [
                'Follow PRISMA 2020; prepare the flow diagram',
                'Plan two independent screeners and how disagreements are settled',
                'Choose the quality appraisal tool (RoB 2, CASP, JBI)',
                'Design the data extraction form'
            ],
            data: [
                'Run the searches; record dates and numbers found',
                'Remove duplicates (Zotero, Rayyan)',
                'Screen titles and abstracts, then full texts',
                'Extract data and appraise quality'
            ],
            analysis: [
                'Summarise the included studies in a table',
                'Synthesise: narrative synthesis or meta-analysis (pooled effect, heterogeneity I²)',
                'Check publication bias (funnel plot) if meta-analysing',
                'Rate the certainty of evidence (GRADE)'
            ]
        }
    },
    action: {
        label: 'Action research',
        description: 'Improving your own practice in cycles: plan, act, observe, reflect.',
        tasks: {
            questions: [
                ['Describe the problem in your own classroom or institution', (c) => `Describe how ${c.core} shows up in your own classroom or institution`],
                ['Write the question: “How can I improve…?”', (c) => (c.x && c.y ? `Write the question: “How can ${c.x} help with ${c.y} in my classes?”` : null)],
                'Agree the aim with colleagues or students involved',
                'Decide what improvement would look like (evidence)'
            ],
            methodology: [
                'Plan the cycles: plan → act → observe → reflect',
                'Choose the evidence to collect in each cycle (tests, reflections, observation)',
                'Involve a critical friend or colleague',
                'Plan consent from the students or staff involved'
            ],
            data: [
                ['Run cycle 1: carry out the change and collect evidence', (c) => (c.x ? `Run cycle 1: bring in ${c.x} and collect evidence` : null)],
                'Reflect on cycle 1 and revise the plan',
                'Run cycle 2 with the changes',
                'Keep a reflective journal throughout'
            ],
            analysis: [
                'Compare the evidence before and after each cycle',
                'Analyse reflections and feedback for themes',
                'Judge what worked, for whom, and why',
                'Write what you would change in the next cycle'
            ]
        }
    }
};

const MAX_TASK = 300;

/** One template entry for a topic: its own wording, or the general one. */
const fill = (entry, topic, max = Infinity) => {
    if (typeof entry === 'string') return entry;
    const [plain, write] = entry;
    const text = topic ? write(topic) : null;
    return text && text.length <= max ? text : plain;
};

/** The stages' wording for a kind of research and a topic (null: the general wording). */
const writeStages = (kind, topic) => {
    const k = KINDS[kind] || KINDS.general;
    return STAGES.map((s) => {
        const own = k.descriptions?.[s.key];
        const description = (own && topic && own(topic)) || fill(s.description, topic);
        return {
            key: s.key, title: s.title, description,
            tasks: (k.tasks[s.key] || s.tasks).map((t, i) => ({ text: fill(t, topic, MAX_TASK), tpl: `${s.key}.${i}` }))
        };
    });
};

// What the wording was written for; a change of title or field rewrites it.
const PATH_VERSION = 1;
const pathKey = (project) => JSON.stringify([PATH_VERSION, project.title || '', project.field || '']);
const topicOfKey = (key) => {
    try {
        const [v, title, field] = JSON.parse(key || 'null') || [];
        return v === PATH_VERSION ? readTopic(title, field) : null;
    } catch { return null; }
};

/** A fresh project's stages, written for its topic (`project`: { title, field }). */
const newStages = (kind = 'general', project = null) => writeStages(kind, project && readTopic(project.title, project.field)).map((s) => ({
    ...s, notes: '',
    tasks: s.tasks.map((t) => ({ ...t, done: false, custom: false }))
}));

/**
 * Brings a project's wording in line with its title and field: stage
 * descriptions, and every template task still worded as the template wrote
 * it. Tasks the teacher added or reworded are left alone; ticks stay.
 * True when anything changed (the caller saves).
 */
const fitToTopic = (project) => {
    const key = pathKey(project);
    if (project.pathFor === key) return false;
    const was = writeStages(project.kind, topicOfKey(project.pathFor));
    const now = writeStages(project.kind, readTopic(project.title, project.field));
    for (const stage of project.stages) {
        const i = now.findIndex((s) => s.key === stage.key);
        if (i < 0) continue;
        stage.description = now[i].description;
        for (const task of stage.tasks) {
            if (task.custom) continue;
            const j = was[i].tasks.findIndex((t) => (task.tpl ? t.tpl === task.tpl : t.text === task.text));
            if (j < 0 || was[i].tasks[j].text !== task.text) continue;
            task.text = now[i].tasks[j].text;
            task.tpl = now[i].tasks[j].tpl;
        }
    }
    project.pathFor = key;
    return true;
};

/** How far along a project is: overall, per stage, and the stage to work on now. */
const progressOf = (project) => {
    const stages = project?.stages || [];
    let total = 0;
    let done = 0;
    const perStage = stages.map((s) => {
        const t = s.tasks.length;
        const d = s.tasks.filter((x) => x.done).length;
        total += t; done += d;
        return { key: s.key, title: s.title, total: t, done: d, percent: t ? Math.round((d / t) * 100) : 0 };
    });
    const current = stages.find((s) => s.tasks.some((t) => !t.done)) || null;
    return {
        percent: total ? Math.round((done / total) * 100) : 0,
        done, total, perStage,
        current: current ? { key: current.key, title: current.title, targetDate: current.targetDate || null } : null,
        nextTasks: current ? current.tasks.filter((t) => !t.done).slice(0, 3).map((t) => ({ _id: t._id, text: t.text, stageKey: current.key })) : []
    };
};

/** The general stage list (titles and descriptions), for the new-project form. */
const STAGE_LIST = writeStages('general', null).map(({ key, title, description }) => ({ key, title, description }));

module.exports = { STAGES: STAGE_LIST, KINDS, newStages, fitToTopic, pathKey, progressOf };
