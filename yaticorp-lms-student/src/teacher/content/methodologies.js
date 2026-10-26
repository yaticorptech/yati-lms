/**
 * Research Methodologies: the twelve design guides, and the advisor that
 * matches a research question to the designs that suit it.
 *
 * All of it runs in the app — no server call and no outside service. The
 * advisor matches the question's wording against each design's keywords.
 */

export const METHODS = [
    {
        key: 'experimental', name: 'Experimental & quasi-experimental', family: 'Quantitative',
        summary: 'Tests cause and effect by changing one thing (the intervention) and measuring what happens, against a comparison group.',
        bestFor: ['Testing whether an intervention, method or treatment works', 'Comparing two or more approaches fairly', 'Questions that start with "What is the effect of…"'],
        questionsLike: ['What is the effect of flipped-classroom teaching on first-year physics scores?', 'Does daily retrieval practice improve long-term recall compared with re-reading?'],
        steps: ['State a testable hypothesis and its null', 'Define the independent and dependent variables and how each is measured', 'Choose a design: randomised controlled trial, pre-test/post-test with control, or quasi-experimental if groups cannot be randomised', 'Calculate the sample size you need (power analysis)', 'Assign participants to groups (randomly where possible)', 'Run the intervention, keeping everything else the same across groups', 'Measure the outcome; analyse the difference between groups'],
        dataCollection: ['Standardised tests and scored tasks', 'Validated measurement instruments', 'Observation with a fixed checklist', 'Logs and system data'],
        analysis: ['t-test or ANOVA for group differences', 'ANCOVA to adjust for pre-test scores', 'Effect sizes (Cohen\'s d, η²)', 'Regression with group as a predictor'],
        sampling: 'Random sampling and random assignment where possible; intact groups (classes, sections) for quasi-experiments, with pre-test equivalence checked.',
        quality: ['Internal validity: control for confounders, attrition and testing effects', 'External validity: how far the sample and setting generalise', 'Reliability of the instruments (Cronbach\'s α, test–retest)', 'Blinding where possible'],
        ethics: ['Informed consent', 'A control group must not be denied a known benefit; offer the intervention afterwards', 'Right to withdraw without penalty'],
        tools: ['SPSS', 'R', 'JASP', 'G*Power for sample size'],
        pitfalls: ['Too small a sample to detect a real effect', 'Groups that differed before the intervention', 'Measuring with an instrument that has not been validated'],
        keywords: ['effect', 'impact', 'influence', 'intervention', 'improve', 'compare', 'comparison', 'versus', 'vs', 'treatment', 'experiment', 'control group', 'causes', 'outcome', 'training programme', 'effectiveness']
    },
    {
        key: 'survey', name: 'Survey research', family: 'Quantitative',
        summary: 'Collects standardised answers from many people to describe a population (what they think, do or have) and how groups differ.',
        bestFor: ['Describing attitudes, perceptions, practices or prevalence in a large group', 'Comparing groups (by gender, region, discipline…)', 'Questions that start with "What are…" or "How many…"'],
        questionsLike: ['What are secondary-school teachers\' perceptions of AI tools in assessment?', 'How prevalent is academic stress among engineering undergraduates in Karnataka?'],
        steps: ['Define the population and the constructs you will measure', 'Adopt or adapt validated scales; write new items only when needed', 'Pilot the questionnaire with 20–30 people and refine it', 'Choose a sampling method and target size', 'Distribute (online, paper, phone) and follow up to raise the response rate', 'Clean the data; check reliability; analyse'],
        dataCollection: ['Questionnaires with Likert scales', 'Structured interviews', 'Online forms (Google Forms, Qualtrics)'],
        analysis: ['Descriptive statistics (frequency, mean, SD)', 'Chi-square for categorical relationships', 't-test / ANOVA for group differences', 'Exploratory and confirmatory factor analysis for scales'],
        sampling: 'Probability sampling (simple random, stratified, cluster) to generalise; convenience or snowball samples only with their limits stated.',
        quality: ['Content and construct validity of the questionnaire', 'Reliability (Cronbach\'s α ≥ 0.7)', 'Response rate and non-response bias', 'Avoid leading, double-barrelled questions'],
        ethics: ['Anonymity or confidentiality stated clearly', 'Voluntary participation', 'Secure storage of responses'],
        tools: ['Google Forms', 'Qualtrics', 'SPSS', 'R', 'Jamovi'],
        pitfalls: ['A long questionnaire that people abandon', 'Generalising from a convenience sample', 'Self-report bias left unacknowledged'],
        keywords: ['perception', 'perceptions', 'attitude', 'attitudes', 'opinion', 'awareness', 'prevalence', 'how many', 'level of', 'extent', 'questionnaire', 'survey', 'satisfaction', 'practices among', 'status of']
    },
    {
        key: 'correlational', name: 'Correlational & predictive', family: 'Quantitative',
        summary: 'Measures how strongly variables move together and which ones predict an outcome, without changing anything.',
        bestFor: ['Relationships between variables', 'Predicting an outcome from several factors', 'Testing a model of how factors connect'],
        questionsLike: ['Is there a relationship between sleep quality and academic performance among nursing students?', 'Which factors predict teachers\' intention to adopt online assessment?'],
        steps: ['Identify the variables and the expected direction of each relationship', 'Select validated measures for each', 'Collect data from an adequate sample (often 10–20 cases per predictor)', 'Check assumptions (normality, linearity, multicollinearity)', 'Analyse correlations, then regression or a structural model'],
        dataCollection: ['Questionnaires', 'Existing records (marks, attendance)', 'Secondary datasets'],
        analysis: ['Pearson or Spearman correlation', 'Multiple linear or logistic regression', 'Structural equation modelling (SEM / PLS-SEM)', 'Mediation and moderation analysis'],
        sampling: 'Probability sampling where possible; a sample large enough for the number of predictors.',
        quality: ['Correlation is not causation; say so', 'Control for known confounders', 'Reliability of every scale', 'Model fit indices for SEM (CFI, RMSEA)'],
        ethics: ['Consent for access to records', 'De-identify secondary data'],
        tools: ['SPSS', 'AMOS', 'SmartPLS', 'R (lavaan)'],
        pitfalls: ['Claiming cause from correlation', 'Too many predictors for the sample', 'Ignoring outliers'],
        keywords: ['relationship', 'relation', 'association', 'associated', 'correlation', 'correlate', 'predict', 'predictor', 'predictors', 'factors', 'determinants', 'influencing', 'model', 'mediating', 'moderating']
    },
    {
        key: 'case-study', name: 'Case study', family: 'Qualitative',
        summary: 'An in-depth study of one or a few cases (a school, a programme, an organisation, a person) in their real setting, using several sources.',
        bestFor: ['Understanding how and why something happens in a particular setting', 'Studying a programme, institution or event in depth', 'When the boundary between the case and its context is blurred'],
        questionsLike: ['How did one rural college implement NEP 2020\'s multidisciplinary curriculum?', 'Why did a start-up incubator succeed in a tier-2 city?'],
        steps: ['Define the case and its boundaries (single or multiple cases)', 'Write propositions or guiding questions', 'Plan several sources of evidence', 'Collect data: interviews, documents, observation', 'Build a case database and a chain of evidence', 'Analyse within the case, then across cases', 'Write the case report'],
        dataCollection: ['Semi-structured interviews', 'Documents and archival records', 'Direct and participant observation', 'Physical artefacts'],
        analysis: ['Pattern matching', 'Explanation building', 'Thematic analysis', 'Cross-case synthesis'],
        sampling: 'Purposive selection of information-rich cases: typical, extreme, critical or revelatory.',
        quality: ['Triangulation across sources', 'A case-study protocol', 'Member checking', 'Thick description for transferability'],
        ethics: ['Anonymise the organisation and people where needed', 'Gatekeeper permission', 'Care with sensitive documents'],
        tools: ['NVivo', 'ATLAS.ti', 'MAXQDA', 'Taguette (free)'],
        pitfalls: ['A case with no clear boundary', 'Relying on one source', 'Description without analysis'],
        keywords: ['case', 'case study', 'how did', 'why did', 'institution', 'organisation', 'organization', 'programme', 'program', 'implementation', 'implement', 'in a', 'at a', 'school', 'company', 'college']
    },
    {
        key: 'ethnography', name: 'Ethnography', family: 'Qualitative',
        summary: 'Long immersion in a community or setting to understand its culture (shared practices, meanings and norms) from the inside.',
        bestFor: ['Culture, practices and everyday life of a group', 'Settings the researcher can spend extended time in', 'Questions about how people make sense of their world together'],
        questionsLike: ['How do weaving communities in Ilkal pass skills between generations?', 'What classroom culture forms around peer tutoring in a government school?'],
        steps: ['Choose the field site and negotiate access', 'Build rapport; spend extended time in the field', 'Take detailed field notes; interview informally and formally', 'Collect artefacts and documents', 'Reflect on your own position (reflexivity)', 'Analyse iteratively while in the field', 'Write a rich, interpretive account'],
        dataCollection: ['Participant observation', 'Field notes and diaries', 'Informal and key-informant interviews', 'Photographs and artefacts'],
        analysis: ['Thematic and cultural domain analysis', 'Thick description', 'Iterative coding of field notes'],
        sampling: 'Purposive and opportunistic; key informants chosen as the fieldwork reveals who knows what.',
        quality: ['Prolonged engagement', 'Reflexivity about the researcher\'s influence', 'Triangulation', 'Member checking'],
        ethics: ['Ongoing consent in a changing setting', 'Protecting identities in small communities', 'Giving back to the community'],
        tools: ['NVivo', 'ATLAS.ti', 'A field journal'],
        pitfalls: ['Too short a time in the field', 'Seeing only what fits expectations', 'Losing the participants\' voice'],
        keywords: ['culture', 'cultural', 'community', 'communities', 'tribe', 'tribal', 'everyday', 'practices', 'rituals', 'traditions', 'lived', 'immersion', 'fieldwork', 'way of life']
    },
    {
        key: 'grounded-theory', name: 'Grounded theory', family: 'Qualitative',
        summary: 'Builds a new theory from the data itself, for a process or problem that existing theories do not explain well.',
        bestFor: ['Explaining a process (how something develops over time)', 'Areas with little existing theory', 'Producing a model or framework from participants\' experience'],
        questionsLike: ['How do first-generation college teachers build a research identity?', 'What process do farmers follow when deciding to adopt drip irrigation?'],
        steps: ['Start with a broad question, not a hypothesis', 'Collect initial data (often interviews)', 'Open coding; constant comparison of each new piece of data', 'Write memos throughout', 'Theoretical sampling: choose next participants to develop emerging categories', 'Axial and selective coding around a core category', 'Stop at theoretical saturation; present the theory or model'],
        dataCollection: ['In-depth interviews', 'Observation', 'Documents'],
        analysis: ['Open, axial and selective coding (Strauss & Corbin)', 'Initial, focused and theoretical coding (Charmaz)', 'Constant comparison', 'Memoing and diagramming'],
        sampling: 'Theoretical sampling, driven by the emerging theory, until saturation.',
        quality: ['Fit, relevance, workability, modifiability', 'An audit trail of codes and memos', 'Saturation reported honestly'],
        ethics: ['Consent covering follow-up interviews', 'Confidentiality in quotations'],
        tools: ['NVivo', 'ATLAS.ti', 'MAXQDA'],
        pitfalls: ['Starting with a theory to test', 'Claiming saturation too early', 'Codes that only describe, never explain'],
        keywords: ['process', 'processes', 'theory', 'theorise', 'theorize', 'theoretical', 'emerge', 'emerging', 'stages', 'grounded', 'how does it develop']
    },
    {
        key: 'phenomenology', name: 'Phenomenology', family: 'Qualitative',
        summary: 'Describes the lived experience of a phenomenon (what it is like) through the accounts of people who have lived it.',
        bestFor: ['Understanding what an experience means to people', 'Emotional or personal experiences', 'Small, carefully chosen groups who share an experience'],
        questionsLike: ['What is the lived experience of women teachers returning to academia after maternity leave?', 'How do visually impaired students experience online examinations?'],
        steps: ['Identify the phenomenon and the people who have experienced it', 'Set aside (bracket) your own assumptions', 'Conduct long, open interviews', 'Transcribe verbatim', 'Identify significant statements and meaning units', 'Cluster them into themes', 'Write a textural and structural description of the essence of the experience'],
        dataCollection: ['In-depth, unstructured interviews', 'Written reflections or diaries'],
        analysis: ['Colaizzi\'s or Moustakas\'s method', 'Interpretative Phenomenological Analysis (IPA)', 'Thematic analysis of meaning units'],
        sampling: 'Purposive and homogeneous: typically 5–25 people who share the experience.',
        quality: ['Bracketing and reflexivity', 'Member checking of descriptions', 'Rich verbatim evidence'],
        ethics: ['Care when the experience is painful', 'Referral support where needed', 'Confidentiality in quotations'],
        tools: ['NVivo', 'Otter.ai or similar for transcription', 'Word processor coding'],
        pitfalls: ['Interviews that are too structured', 'A sample that does not share the experience', 'Interpreting beyond what participants said'],
        keywords: ['experience', 'experiences', 'lived experience', 'lived', 'meaning', 'feel', 'feelings', 'perspective', 'what is it like', 'perceive', 'coping', 'challenges faced']
    },
    {
        key: 'narrative', name: 'Narrative inquiry', family: 'Qualitative',
        summary: 'Studies the stories people tell about their lives: how they make sense of events and identity over time.',
        bestFor: ['Life histories and career journeys', 'Identity and change over time', 'Giving voice to individual stories'],
        questionsLike: ['How do retired teachers narrate their professional journeys?', 'What stories do first-generation learners tell about entering university?'],
        steps: ['Choose a small number of participants with stories to tell', 'Collect stories through repeated interviews, journals or letters', 'Restory: arrange the story chronologically and by key elements', 'Analyse what is told and how it is told', 'Collaborate with participants on the account', 'Write the narratives with your interpretation'],
        dataCollection: ['Life-history interviews', 'Journals, letters, photographs', 'Autobiographical writing'],
        analysis: ['Thematic narrative analysis', 'Structural analysis (plot, turning points)', 'Dialogic / performance analysis'],
        sampling: 'Purposive; few participants, studied in depth.',
        quality: ['Collaboration with participants', 'Verisimilitude and coherence', 'Reflexivity'],
        ethics: ['Stories can identify people: change details with consent', 'Shared ownership of the story'],
        tools: ['NVivo', 'Timeline and story-mapping templates'],
        pitfalls: ['Retelling without analysis', 'Imposing your own plot on the story'],
        keywords: ['story', 'stories', 'narrative', 'narratives', 'life history', 'biography', 'journey', 'journeys', 'identity', 'career path', 'memories']
    },
    {
        key: 'mixed-methods', name: 'Mixed methods', family: 'Mixed',
        summary: 'Combines quantitative and qualitative strands in one study, so each answers what the other cannot.',
        bestFor: ['Explaining numbers with people\'s reasons (explanatory sequential)', 'Exploring first, then measuring at scale (exploratory sequential)', 'Corroborating findings from two angles (convergent)'],
        questionsLike: ['To what extent does mentoring improve research output, and how do mentees explain the change?', 'What challenges do teachers face with hybrid teaching, and how widespread are they?'],
        steps: ['Justify why one method alone is not enough', 'Choose a design: convergent, explanatory sequential, exploratory sequential, or embedded', 'Plan each strand: sample, instruments, analysis', 'Decide where the strands are integrated (design, analysis, interpretation)', 'Collect and analyse each strand', 'Integrate: joint displays, meta-inferences'],
        dataCollection: ['Questionnaires plus interviews', 'Tests plus focus groups', 'Records plus observation'],
        analysis: ['Statistical analysis for the quantitative strand', 'Thematic analysis for the qualitative strand', 'Joint displays to integrate', 'Following up surprising statistical results qualitatively'],
        sampling: 'Often a larger probability sample for the quantitative strand and a purposive subsample for the qualitative one.',
        quality: ['Rigour in each strand by its own standards', 'Clear integration, not two separate studies', 'Legitimation of meta-inferences'],
        ethics: ['Consent covering both strands', 'Linking data between strands securely'],
        tools: ['SPSS or R', 'NVivo', 'Joint display templates'],
        pitfalls: ['Two studies side by side with no integration', 'Underestimating the time it takes', 'Weak justification for mixing'],
        keywords: ['and how', 'extent and', 'both', 'explain', 'explore and', 'mixed', 'qualitative and quantitative', 'quantitative and qualitative', 'triangulate', 'why and how many', 'reasons behind']
    },
    {
        key: 'action-research', name: 'Action research', family: 'Applied',
        summary: 'A practitioner studies and improves their own practice through repeated cycles of plan, act, observe and reflect.',
        bestFor: ['Improving your own teaching or professional practice', 'Solving a local problem with the people affected', 'Iterative change with evidence at each step'],
        questionsLike: ['How can I improve participation of quiet students in my tutorials through think-pair-share?', 'How can our department reduce first-year drop-outs through mentoring circles?'],
        steps: ['Identify a problem in your own practice', 'Plan an intervention', 'Act: carry it out', 'Observe: collect evidence of its effect', 'Reflect on what worked and why', 'Revise and start the next cycle (at least two cycles)'],
        dataCollection: ['Reflective journals', 'Student work and feedback', 'Observation by a critical friend', 'Short surveys'],
        analysis: ['Thematic analysis of reflections and feedback', 'Simple descriptive statistics', 'Comparing cycles'],
        sampling: 'The people involved in the practice: your class, your team.',
        quality: ['Transparency about your dual role', 'Critical friends and triangulation', 'Evidence from each cycle'],
        ethics: ['Students must not be disadvantaged by declining to take part', 'Consent despite the power relationship', 'Anonymity in reports'],
        tools: ['A reflective journal', 'Google Forms', 'Excel'],
        pitfalls: ['Only one cycle', 'Reflection without evidence', 'Overclaiming general results'],
        keywords: ['my class', 'my students', 'my teaching', 'my practice', 'our department', 'improve', 'classroom', 'reflective', 'practice', 'cycle', 'intervention in', 'how can i', 'how can we']
    },
    {
        key: 'systematic-review', name: 'Systematic review & meta-analysis', family: 'Review',
        summary: 'Finds, appraises and synthesises all the studies on a precise question, by an explicit and repeatable method.',
        bestFor: ['Summarising what is already known', 'Settling conflicting findings', 'Identifying gaps before primary research'],
        questionsLike: ['What does the evidence say about the effect of gamification on learner engagement in higher education?', 'Which interventions reduce exam anxiety in adolescents?'],
        steps: ['Frame the question (PICO / SPIDER)', 'Register a protocol (PROSPERO, OSF)', 'Search several databases with a documented strategy', 'Screen titles, abstracts and full texts against criteria (two reviewers)', 'Extract data with a standard form', 'Appraise quality and risk of bias', 'Synthesise narratively or by meta-analysis', 'Report with a PRISMA flow diagram'],
        dataCollection: ['Scopus, Web of Science, PubMed, ERIC, Google Scholar', 'Reference lists and citation searching', 'Grey literature'],
        analysis: ['Narrative synthesis', 'Meta-analysis (pooled effect sizes, forest plots)', 'Heterogeneity (I²) and publication bias (funnel plots)'],
        sampling: 'All studies that meet the inclusion criteria, not a sample.',
        quality: ['PRISMA 2020 reporting', 'Two independent screeners', 'Risk-of-bias tools (RoB 2, CASP, JBI)'],
        ethics: ['Usually no participants; still report funding and conflicts of interest'],
        tools: ['Rayyan or Covidence for screening', 'Zotero or Mendeley', 'RevMan', 'R (metafor)'],
        pitfalls: ['A question that is too broad', 'Searching one database only', 'No protocol, so choices look arbitrary'],
        keywords: ['review', 'literature', 'existing studies', 'evidence', 'meta-analysis', 'meta analysis', 'systematic', 'what is known', 'synthesis', 'synthesise', 'previous research', 'state of the art', 'bibliometric']
    },
    {
        key: 'design-based', name: 'Design-based research', family: 'Applied',
        summary: 'Designs and refines a tool, curriculum or intervention in real settings over several iterations, producing both a working design and design principles.',
        bestFor: ['Developing an app, module, framework or tool', 'Educational technology and curriculum design', 'Research that must produce something usable'],
        questionsLike: ['How can a mobile app be designed to support Kannada-medium students learning English vocabulary?', 'What design principles make a virtual chemistry lab effective for rural colleges?'],
        steps: ['Analyse the problem with practitioners', 'Develop a prototype grounded in theory', 'Test it in a real setting', 'Evaluate and refine (iterate two or more times)', 'Reflect to produce design principles', 'Report the final design and the principles'],
        dataCollection: ['Usability testing', 'Pre/post measures', 'Interviews and focus groups', 'Logs of use'],
        analysis: ['Mixed analysis of each iteration', 'Usability metrics (SUS)', 'Thematic analysis of feedback'],
        sampling: 'Real users in real settings; a few cycles with growing groups.',
        quality: ['Iterations documented with evidence', 'Collaboration with practitioners', 'Transferable design principles'],
        ethics: ['Data from tools used by learners', 'Consent for logs and recordings'],
        tools: ['Figma', 'Google Forms', 'SPSS / R', 'NVivo'],
        pitfalls: ['One iteration only', 'A product with no principles', 'Testing only in a lab'],
        keywords: ['design', 'develop', 'development', 'app', 'application', 'tool', 'module', 'framework', 'prototype', 'platform', 'software', 'system', 'build', 'create a']
    }
];

export const BY_KEY = new Map(METHODS.map((m) => [m.key, m]));

/** Words → designs, by counting each design's keywords in the question. Always answers. */
export const adviseByKeywords = (question) => {
    const q = ` ${String(question).toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\s+/g, ' ')} `;
    const scored = METHODS.map((m) => {
        const hits = m.keywords.filter((k) => q.includes(` ${k} `) || (k.length > 6 && q.includes(k)));
        // A phrase ("lived experience", "relationship between") says more than one word.
        return { key: m.key, score: hits.reduce((n, k) => n + (k.includes(' ') ? 2 : 1), 0), hits };
    }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3);
    if (!top.length) {
        return {
            recommendations: [
                { key: 'mixed-methods', fit: 'possible', why: 'Your question does not point clearly to one design yet. Many questions combine "how much" with "why"; mixed methods covers both.' },
                { key: 'case-study', fit: 'possible', why: 'If the question is about one setting or programme, a case study lets you look at it in depth.' }
            ],
            design: 'Sharpen the question first: name the people, the setting and what you want to find out (an effect, a relationship, an experience or a process).',
            questionsToConsider: ['Do you want to measure something, or understand it?', 'Will you change anything (an intervention), or only observe?', 'Is the question about many people or a few in depth?'],
        };
    }
    const best = top[0].score;
    return {
        recommendations: top.map((t) => ({
            key: t.key,
            fit: t.score >= Math.max(2, best) ? 'strong' : 'possible',
            why: `${BY_KEY.get(t.key).summary} Your question mentions ${t.hits.slice(0, 3).map((h) => `"${h}"`).join(', ')}.`
        })),
        design: `Start with ${BY_KEY.get(top[0].key).name.toLowerCase()}. ${BY_KEY.get(top[0].key).steps[0]}.`,
        questionsToConsider: ['Who exactly are your participants, and how will you reach them?', 'What will you measure or observe, and with which instrument?', 'What ethical approval will you need?'],
    };
};

