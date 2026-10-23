/**
 * Research Path: the stages a research project moves through, from topic to
 * publication, each with the tasks that usually make it up. A new project
 * starts from this template; the teacher ticks tasks off, adds their own,
 * and sets a target date per stage.
 */

const STAGES = [
    {
        key: 'topic', title: 'Topic & problem',
        description: 'Find a problem worth solving and narrow it to a researchable topic.',
        tasks: ['List three candidate topics from your teaching or field', 'Read recent review articles on each candidate', 'Write a one-paragraph problem statement', 'Discuss the topic with a supervisor or senior colleague']
    },
    {
        key: 'literature', title: 'Literature review',
        description: 'Map what is already known and where the gap is.',
        tasks: ['Search Scopus / Web of Science / Google Scholar with defined keywords', 'Set up a reference manager (Zotero or Mendeley)', 'Build a literature matrix: author, year, method, findings, gaps', 'Write the research gap in two or three sentences']
    },
    {
        key: 'questions', title: 'Research questions & hypotheses',
        description: 'Turn the gap into precise questions (and hypotheses, if quantitative).',
        tasks: ['Write the main research question', 'Write two to four sub-questions or objectives', 'State hypotheses (quantitative studies)', 'Check each question is answerable with the time and data you have']
    },
    {
        key: 'methodology', title: 'Methodology & design',
        description: 'Choose the design, sample, instruments and analysis.',
        tasks: ['Choose the research design (see Research Methodologies)', 'Define the population, sample size and sampling method', 'Select or develop instruments; plan a pilot', 'Plan the analysis for each research question']
    },
    {
        key: 'proposal', title: 'Proposal & ethics approval',
        description: 'Write the proposal and get it approved, with ethical clearance.',
        tasks: ['Write the research proposal or synopsis', 'Prepare consent forms and participant information sheets', 'Submit to the institutional ethics committee', 'Present the proposal to the research committee']
    },
    {
        key: 'data', title: 'Data collection',
        description: 'Collect the data as planned, and keep it safe.',
        tasks: ['Run the pilot study and refine instruments', 'Collect data from the full sample', 'Keep a data-collection log', 'Back up and secure the raw data']
    },
    {
        key: 'analysis', title: 'Analysis',
        description: 'Analyse the data question by question.',
        tasks: ['Clean and code the data', 'Run the planned analyses', 'Make the key tables and figures', 'Write up findings for each research question']
    },
    {
        key: 'writing', title: 'Writing the thesis or paper',
        description: 'Draft, revise and polish every chapter.',
        tasks: ['Draft the results and discussion', 'Revise the introduction and literature review in light of the findings', 'Write the conclusion, limitations and future work', 'Run a plagiarism check and fix citations']
    },
    {
        key: 'submission', title: 'Submission & defence',
        description: 'Submit, respond to reviewers and defend.',
        tasks: ['Format to the university or journal guidelines', 'Submit the thesis or manuscript', 'Respond to examiner or reviewer comments', 'Prepare and give the viva / defence presentation']
    },
    {
        key: 'publication', title: 'Publication & impact',
        description: 'Publish the findings and share them.',
        tasks: ['Identify target journals (scope, indexing, quartile)', 'Turn each chapter into a paper', 'Present at a conference', 'Add every paper to your Publications Map']
    }
];

/**
 * Kinds of research, each changing the tasks of the stages where the work
 * really differs — the questions, the design, the data and the analysis.
 * Stages a kind leaves out keep the general tasks above.
 */
const KINDS = {
    general: { label: 'General', description: 'The standard path, for any kind of study.', tasks: {} },
    survey: {
        label: 'Survey / quantitative',
        description: 'Questionnaires and numbers: measuring attitudes, levels or relationships in a sample.',
        tasks: {
            questions: ['Write the main research question in terms of variables', 'List the variables: independent, dependent, control', 'State the null and alternative hypotheses', 'Define each variable operationally (how it will be measured)'],
            methodology: ['Choose cross-sectional or longitudinal design', 'Calculate the sample size (power analysis in G*Power, or Krejcie & Morgan table)', 'Choose the sampling technique (random, stratified, cluster)', 'Select a validated questionnaire or build one; plan content validity by experts'],
            data: ['Pilot the questionnaire with 30–50 respondents', 'Check reliability (Cronbach’s α ≥ 0.7) and revise items', 'Collect responses from the full sample; track the response rate', 'Enter and back up the data; keep the code book'],
            analysis: ['Screen the data: missing values, outliers, normality', 'Describe the sample (frequencies, means, SD)', 'Test the hypotheses (t-test, ANOVA, correlation, regression) and report effect sizes', 'Make one table or figure per research question']
        }
    },
    experimental: {
        label: 'Experimental / quasi-experimental',
        description: 'Testing the effect of an intervention, with groups and a pre-test and post-test.',
        tasks: {
            questions: ['Write the question as an effect: “What is the effect of X on Y?”', 'Define the intervention (X) and the outcome (Y)', 'State the hypotheses (H₀ and H₁)', 'List variables to control (prior achievement, age…)'],
            methodology: ['Choose the design: true experiment, pre-test–post-test control group, or quasi-experimental', 'Plan random assignment, or how the groups will be matched', 'Write the intervention plan: sessions, duration, materials', 'Choose the pre-test and post-test instruments; plan their validity'],
            data: ['Run a small pilot of the intervention', 'Give the pre-test to both groups', 'Deliver the intervention as planned; keep a fidelity log', 'Give the post-test (and a delayed test, if planned)'],
            analysis: ['Check that the groups were equal at pre-test', 'Compare post-test scores (ANCOVA, t-test or Mann–Whitney)', 'Report effect sizes (Cohen’s d, η²)', 'Discuss threats to validity: attrition, testing, history']
        }
    },
    qualitative: {
        label: 'Qualitative',
        description: 'Interviews, observation or documents: understanding experiences and meanings.',
        tasks: {
            questions: ['Write an open main question: “How do… experience…?”', 'Write two to four sub-questions', 'Note your own position and assumptions (reflexivity)', 'Check the questions can be answered through talk, observation or documents'],
            methodology: ['Choose the approach: case study, phenomenology, grounded theory, ethnography or narrative', 'Plan purposive sampling and the expected number of participants (until saturation)', 'Write the interview or observation guide', 'Plan trustworthiness: member checking, audit trail, thick description'],
            data: ['Pilot the interview guide with one or two people', 'Conduct and record the interviews or observations, with consent', 'Transcribe and anonymise each recording', 'Write field notes and a reflexive journal after each session'],
            analysis: ['Read all transcripts closely; make initial codes', 'Group codes into categories and themes (e.g. Braun & Clarke’s six steps)', 'Review themes against the data; choose illustrative quotations', 'Write a thematic map and keep the audit trail']
        }
    },
    mixed: {
        label: 'Mixed methods',
        description: 'Numbers and words together: a survey with interviews, in sequence or side by side.',
        tasks: {
            questions: ['Write a quantitative question, a qualitative question and a mixed question', 'Say why both kinds of data are needed', 'State hypotheses for the quantitative part', 'Decide which strand has priority'],
            methodology: ['Choose the design: convergent, explanatory sequential or exploratory sequential', 'Plan sampling for each strand and how they are linked', 'Select the questionnaire and write the interview guide', 'Plan the point of integration (joint display, follow-up)'],
            data: ['Pilot both instruments', 'Collect the quantitative data and analyse it first (if sequential)', 'Select interview participants from the survey results', 'Collect and transcribe the qualitative data'],
            analysis: ['Analyse each strand with its own methods', 'Integrate the results in a joint display', 'Note where the strands agree, add to each other or disagree', 'Write meta-inferences that answer the mixed question']
        }
    },
    review: {
        label: 'Systematic review / meta-analysis',
        description: 'Studying the studies: a full, reproducible search and synthesis of published research.',
        tasks: {
            literature: ['Check no recent review already answers your question (PROSPERO, Cochrane, Google Scholar)', 'Build the search string with synonyms and Boolean operators', 'Choose the databases (Scopus, Web of Science, ERIC, PubMed)', 'Register the protocol (PROSPERO or OSF)'],
            questions: ['Frame the question with PICO / PICOS (or SPIDER for qualitative)', 'Write the inclusion and exclusion criteria', 'Decide the outcomes to extract', 'Decide whether a meta-analysis is possible'],
            methodology: ['Follow PRISMA 2020; prepare the flow diagram', 'Plan two independent screeners and how disagreements are settled', 'Choose the quality appraisal tool (RoB 2, CASP, JBI)', 'Design the data extraction form'],
            data: ['Run the searches; record dates and numbers found', 'Remove duplicates (Zotero, Rayyan)', 'Screen titles and abstracts, then full texts', 'Extract data and appraise quality'],
            analysis: ['Summarise the included studies in a table', 'Synthesise: narrative synthesis or meta-analysis (pooled effect, heterogeneity I²)', 'Check publication bias (funnel plot) if meta-analysing', 'Rate the certainty of evidence (GRADE)']
        }
    },
    action: {
        label: 'Action research',
        description: 'Improving your own practice in cycles: plan, act, observe, reflect.',
        tasks: {
            questions: ['Describe the problem in your own classroom or institution', 'Write the question: “How can I improve…?”', 'Agree the aim with colleagues or students involved', 'Decide what improvement would look like (evidence)'],
            methodology: ['Plan the cycles: plan → act → observe → reflect', 'Choose the evidence to collect in each cycle (tests, reflections, observation)', 'Involve a critical friend or colleague', 'Plan consent from the students or staff involved'],
            data: ['Run cycle 1: carry out the change and collect evidence', 'Reflect on cycle 1 and revise the plan', 'Run cycle 2 with the changes', 'Keep a reflective journal throughout'],
            analysis: ['Compare the evidence before and after each cycle', 'Analyse reflections and feedback for themes', 'Judge what worked, for whom, and why', 'Write what you would change in the next cycle']
        }
    }
};

/** A fresh project's stages, from the template for its kind of research. */
const newStages = (kind = 'general') => {
    const special = (KINDS[kind] || KINDS.general).tasks;
    return STAGES.map((s) => ({
        key: s.key, title: s.title, description: s.description, notes: '',
        tasks: (special[s.key] || s.tasks).map((text) => ({ text, done: false, custom: false }))
    }));
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

module.exports = { STAGES, KINDS, newStages, progressOf };
