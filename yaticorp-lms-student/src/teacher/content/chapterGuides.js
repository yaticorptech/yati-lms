/**
 * Thesis Writing: a writing guide for each kind of chapter — what it is for,
 * how long, its usual sections, what to include, common mistakes and useful
 * phrases. The guide is picked by the chapter's title, so "Literature Review"
 * or "Review of Literature" both find the same one.
 */

export const CHAPTER_GUIDES = [
    {
        key: 'abstract', match: /abstract/i, name: 'Abstract',
        purpose: 'A short, complete summary of the whole thesis. Many readers read only the abstract, so it must stand on its own.',
        length: 'Usually 250–500 words for a thesis (check your university\'s limit).',
        structure: [
            ['Background', ['The problem in one or two sentences']],
            ['Aim', ['What the study set out to do']],
            ['Method', ['Design, participants, instruments, analysis']],
            ['Findings', ['The main results, with numbers where possible']],
            ['Conclusion', ['What the results mean and why they matter']],
            ['Keywords', ['4–6 terms people would search for']]
        ],
        include: ['Every part of the thesis, briefly.', 'Your key results, not "results are discussed".', 'Words a reader would search for.'],
        mistakes: ['Writing it first. Write it last.', 'Citations, abbreviations or new information not in the thesis.', 'Background that takes half the abstract.'],
        phrases: ['This study examined…', 'Data were collected from… and analysed using…', 'The results showed that…', 'These findings suggest that…']
    },
    {
        key: 'introduction', match: /intro/i, name: 'Introduction',
        purpose: 'Tells the reader what the problem is, why it matters, what is not yet known, and what your study does about it.',
        length: 'About 10% of the thesis.',
        structure: [
            ['Background of the study', ['The wider context', 'Why the topic matters now']],
            ['Statement of the problem', ['The specific problem', 'Evidence that it exists']],
            ['Research gap', ['What earlier studies have not done']],
            ['Aim, objectives and research questions', ['Main aim', 'Objectives / questions', 'Hypotheses, if any']],
            ['Significance of the study', ['Who benefits, and how']],
            ['Scope and delimitations', ['What is included and excluded']],
            ['Definition of key terms', ['Operational definitions']],
            ['Organisation of the thesis', ['One line per chapter']]
        ],
        include: ['A clear problem statement in a few sentences.', 'Objectives that match your research questions exactly.', 'Operational definitions of your key variables.'],
        mistakes: ['Starting too broadly ("Since ancient times, education…").', 'A gap that is never stated plainly.', 'Objectives that differ from the questions in later chapters.'],
        phrases: ['Despite growing interest in…, little is known about…', 'The purpose of this study is to…', 'This study is significant because…', 'The remainder of this thesis is organised as follows.']
    },
    {
        key: 'literature', match: /literature|review|related work|theoretical/i, name: 'Literature Review',
        purpose: 'Shows what is already known, how it was studied, the debates, and the gap your study fills, leading to your conceptual framework.',
        length: 'Often 20–30% of the thesis.',
        structure: [
            ['Introduction', ['How the literature was searched', 'How the chapter is organised']],
            ['Theoretical framework', ['The theories your study rests on', 'How they apply']],
            ['Review by theme', ['Theme 1: what studies found, how they differ', 'Theme 2', 'Theme 3']],
            ['Studies in the Indian context', ['National and regional studies']],
            ['Research gap', ['What is missing, drawn from the themes']],
            ['Conceptual framework', ['Your variables or concepts and how they relate (a diagram helps)']]
        ],
        include: ['Comparison and critique: where studies agree, disagree and why.', 'Recent work (the last 5 years) as well as key older studies.', 'A clear gap that leads to your questions.'],
        mistakes: ['One paragraph per paper, listing summaries.', 'No critique, only "X found…, Y found…".', 'A gap that does not follow from the review.'],
        phrases: ['Several studies have reported…; however, …', 'In contrast to…, … found that…', 'These studies share a limitation:…', 'Taken together, the literature suggests…']
    },
    {
        key: 'methodology', match: /method/i, name: 'Research Methodology',
        purpose: 'Explains exactly how the study was done, so a reader can judge it and could repeat it.',
        length: 'About 10–15% of the thesis.',
        structure: [
            ['Research philosophy and approach', ['Paradigm: positivist, interpretivist, pragmatic', 'Quantitative, qualitative or mixed']],
            ['Research design', ['The design and why it fits the questions']],
            ['Population and sample', ['Population', 'Sample size and how it was decided', 'Sampling technique']],
            ['Instruments', ['Tools used', 'Validity and reliability', 'Pilot study']],
            ['Data collection procedure', ['Steps and timeline']],
            ['Data analysis', ['The analysis for each research question', 'Software used']],
            ['Ethical considerations', ['Approval, consent, confidentiality']]
        ],
        include: ['A reason for every choice, not only a description.', 'Reliability figures (e.g. Cronbach\'s α) and validity checks.', 'The ethics approval reference.'],
        mistakes: ['Textbook definitions of every design instead of your own choices.', 'No justification for the sample size.', 'Analysis that does not match the questions.'],
        phrases: ['A … design was adopted because…', 'The sample was selected using… sampling.', 'The reliability of the instrument was established by…', 'Ethical approval was obtained from…']
    },
    {
        key: 'results', match: /result|finding|analysis|data/i, name: 'Results / Data Analysis',
        purpose: 'Presents what you found, question by question, without interpreting it yet.',
        length: 'About 20–25% of the thesis.',
        structure: [
            ['Overview', ['Participants or response rate', 'Demographic profile']],
            ['Results for each research question', ['RQ1: tables / figures and their description', 'RQ2', 'RQ3']],
            ['Hypothesis testing', ['Each hypothesis: test, result, decision']],
            ['Summary of findings', ['The main results in brief']]
        ],
        include: ['Tables and figures numbered and referred to in the text.', 'Test statistics, p-values and effect sizes.', 'Themes with participant quotations (qualitative).'],
        mistakes: ['Interpreting results here. Save it for the discussion.', 'Repeating every number from a table in the text.', 'Tables without clear titles or units.'],
        phrases: ['As shown in Table 4.2,…', 'A significant difference was found between… (t = …, p < .05, d = …).', 'Three themes emerged from the interviews:…', 'Hypothesis H₁ was supported.']
    },
    {
        key: 'discussion', match: /discussion|interpret/i, name: 'Discussion',
        purpose: 'Explains what your results mean, how they fit with earlier studies, and why they matter.',
        length: 'About 15% of the thesis.',
        structure: [
            ['Summary of key findings', ['The main results, briefly']],
            ['Interpretation of each finding', ['What it means', 'How it compares with earlier studies', 'Possible reasons']],
            ['Implications', ['For theory', 'For practice and policy']],
            ['Limitations', ['Sample, method, context']],
            ['Directions for future research', ['Questions your study opens']]
        ],
        include: ['Comparison with the studies in your literature review.', 'Explanations for unexpected results.', 'Honest limitations.'],
        mistakes: ['Repeating the results without interpretation.', 'Claims stronger than the evidence (watch "proves").', 'Ignoring results that did not support the hypotheses.'],
        phrases: ['This finding is consistent with…', 'Contrary to…, this study found…', 'One possible explanation is…', 'These results should be interpreted with caution because…']
    },
    {
        key: 'conclusion', match: /conclu|recommend/i, name: 'Conclusion',
        purpose: 'Answers your research questions directly, states your contribution, and gives recommendations.',
        length: 'About 5–10% of the thesis.',
        structure: [
            ['Summary of the study', ['Aim, method, key findings in brief']],
            ['Conclusions', ['A direct answer to each research question']],
            ['Contributions', ['What this study adds to knowledge and practice']],
            ['Recommendations', ['For practitioners', 'For policy makers', 'For future researchers']],
            ['Concluding remarks', ['A short closing paragraph']]
        ],
        include: ['A clear answer to every research question.', 'Recommendations that follow from your findings.'],
        mistakes: ['New results or references.', 'Recommendations with no basis in the findings.', 'Ending on limitations.'],
        phrases: ['This study set out to…', 'The findings lead to the conclusion that…', 'This study contributes to… by…', 'It is recommended that…']
    },
    {
        key: 'references', match: /reference|bibliograph|works cited/i, name: 'References',
        purpose: 'Lists every source cited in the thesis, in one citation style.',
        length: 'As long as needed: every in-text citation, nothing more.',
        structure: [['References', ['Every source cited in the text', 'In the style your university requires (APA, MLA, Chicago, IEEE…)', 'In the order the style requires (alphabetical or numbered)']]],
        include: ['DOIs or URLs where the style asks for them.', 'Exactly the sources cited in the text.'],
        mistakes: ['Sources in the list that are never cited, or the other way round.', 'Mixed styles.', 'Missing page numbers, volumes or DOIs.'],
        phrases: []
    },
    {
        key: 'appendices', match: /append|annex/i, name: 'Appendices',
        purpose: 'Holds material a reader may want but that would interrupt the main text.',
        length: 'As needed.',
        structure: [['Appendices', ['Questionnaires and interview guides', 'Consent forms and ethics approval', 'Extra tables and figures', 'Sample transcripts or coding frames']]],
        include: ['A letter or number for each appendix (Appendix A, B…), referred to in the text.'],
        mistakes: ['Putting key results in an appendix.', 'Appendices never mentioned in the text.'],
        phrases: ['The full questionnaire is given in Appendix A.']
    }
];

const GENERIC = {
    key: 'generic', name: 'Chapter',
    purpose: 'Every chapter should have one job in the thesis. Say what it is at the start and how it connects to the next at the end.',
    length: 'In proportion to its importance in the thesis.',
    structure: [['Introduction', ['What this chapter covers and why']], ['Main sections', ['Section 1', 'Section 2', 'Section 3']], ['Summary', ['The chapter in a few lines', 'The link to the next chapter']]],
    include: ['A short introduction and summary.', 'Headings that tell the reader where they are.'],
    mistakes: ['Sections that do not serve the chapter\'s purpose.'],
    phrases: ['This chapter presents…', 'The next chapter turns to…']
};

/** The guide for a chapter, by its title. */
export const guideForChapter = (title) => CHAPTER_GUIDES.find((g) => g.match.test(title || '')) || GENERIC;

/** The guide's sections as headings to put into an empty chapter. */
export const headingsText = (guide) => guide.structure.map(([heading, points]) => `${heading}\n${points.map((p) => `- ${p}`).join('\n')}`).join('\n\n');
