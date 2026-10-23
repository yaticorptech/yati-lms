/**
 * Understanding and avoiding plagiarism: a step-by-step guide for teachers
 * and research scholars, shown on the Plagiarism Check page.
 */

export const PLAGIARISM_STEPS = [
    {
        key: 'what', title: 'What plagiarism is',
        summary: 'Plagiarism is presenting someone else\'s words, ideas, data or images as your own — with or without meaning to. It applies to published and unpublished work, and to your own earlier work.',
        todo: [
            'Every idea, finding, figure or sentence that is not yours needs a citation.',
            'Common knowledge in your field (water boils at 100 °C at sea level) does not need one; a specific claim or number does.',
            'Copying even a few distinctive phrases without quotation marks counts.',
            'Intent does not matter to a similarity checker or an examiner — careless notes cause most cases.'
        ],
        tips: ['Keep your reading notes in two colours: one for quotations copied exactly, one for your own words. Most accidental plagiarism starts in notes.']
    },
    {
        key: 'types', title: 'The forms it takes',
        summary: 'Not all plagiarism is copy-paste. Knowing the forms helps you spot them in your own drafts.',
        todo: [
            'Direct copying: text copied word for word without quotation marks and a citation.',
            'Patchwriting (mosaic plagiarism): copying a passage and swapping a few words or the order — still plagiarism, even with a citation.',
            'Paraphrase without citation: the idea is someone else\'s, the words are yours, but no source is given.',
            'Self-plagiarism: reusing your own published text, data or figures without citing the earlier work.',
            'Source plagiarism: citing a paper you never read, copied from someone else\'s reference list.',
            'Data and image plagiarism: reusing tables, figures or datasets without permission and citation.'
        ]
    },
    {
        key: 'paraphrase', title: 'Paraphrasing the right way',
        summary: 'A real paraphrase restates the idea in your own words and sentence structure, and still cites the source.',
        todo: [
            'Read the passage until you understand it; then close it.',
            'Write the idea from memory, in your own words and structure.',
            'Compare with the original: no strings of the same words, no copied sentence shape.',
            'Add the citation. A paraphrase still needs one.'
        ],
        examplesTitle: 'An example',
        examples: [
            { label: 'Original', tone: 'neutral', text: 'Peer tutoring benefits both the tutor and the tutee, because explaining a concept forces the tutor to organise their own understanding.' },
            { label: 'Patchwriting — not acceptable', tone: 'bad', text: 'Peer tutoring helps both the tutor and tutee, since explaining an idea makes the tutor organise their own understanding (Rao, 2021).', note: 'Same structure, a few words swapped — plagiarism even with the citation.' },
            { label: 'A real paraphrase', tone: 'good', text: 'Tutors gain as much as the students they help: having to explain an idea makes them sort out what they themselves know (Rao, 2021).' }
        ],
        tips: ['If you cannot say it differently without losing the meaning, quote it instead.']
    },
    {
        key: 'quote', title: 'Quoting and citing',
        summary: 'Quote when the exact words matter — a definition, a striking phrase, a law. Otherwise paraphrase.',
        todo: [
            'Put the exact words in quotation marks and cite them in the same sentence, with the page number: "…" (Rao, 2021, p. 14).',
            'For a quotation longer than about 40 words, use an indented block quote without marks, as your style guide says.',
            'Keep quotations short and few — a thesis made of quotations shows little of your own thinking.',
            'Every in-text citation must have a matching entry in the reference list, and the other way round.'
        ],
        tips: ['A reference manager (Zotero, Mendeley) keeps citations and the reference list in step automatically.'],
        links: [['Zotero', 'https://www.zotero.org/']]
    },
    {
        key: 'styles', title: 'Citation styles, quickly',
        summary: 'Your university or journal names the style. The same journal article, in three common styles:',
        examplesTitle: 'One article, three styles',
        examples: [
            { label: 'APA 7 (social sciences, education)', tone: 'neutral', text: 'Reference: Rao, A., & Iyer, M. (2023). Peer tutoring in rural colleges. Journal of Rural Education, 12(3), 45–60. https://doi.org/10.1234/jre.2023.045\nIn text: (Rao & Iyer, 2023)' },
            { label: 'IEEE (engineering, computing)', tone: 'neutral', text: 'Reference: [1] A. Rao and M. Iyer, "Peer tutoring in rural colleges," J. Rural Educ., vol. 12, no. 3, pp. 45–60, 2023.\nIn text: … as shown in [1].' },
            { label: 'Vancouver (medicine, health)', tone: 'neutral', text: 'Reference: 1. Rao A, Iyer M. Peer tutoring in rural colleges. J Rural Educ. 2023;12(3):45–60.\nIn text: … as shown earlier (1).' }
        ],
        tips: ['Pick one style and use it everywhere in a document; mixed styles are a common examiner comment.']
    },
    {
        key: 'self', title: 'Reusing your own work',
        summary: 'Your thesis can become papers, and a conference paper can grow into a journal article — but published text belongs, in part, to its publisher.',
        todo: [
            'Cite your earlier publication whenever you reuse its ideas, data or text.',
            'Rewrite rather than copy large passages from your own published papers.',
            'Tell the journal in your cover letter if the paper builds on a thesis or conference paper.',
            'Never submit the same paper to two journals at once, or publish the same results twice.'
        ]
    },
    {
        key: 'report', title: 'Reading a similarity report',
        summary: 'A similarity percentage is not a plagiarism verdict. It shows where your text matches other text; you decide what each match means.',
        todo: [
            'Look at the matched passages, not only the number.',
            'Matches in quotations with citations, the reference list and standard phrases ("the results of this study show") are fine.',
            'A long match with no quotation marks is the problem — quote and cite it, or rewrite it and cite it.',
            'Many small matches from one source can mean patchwriting — rewrite that section from your understanding.',
            'The check on this page compares with documents on YATICORP. Before submission, use your university\'s checker (such as Turnitin or Ouriginal).'
        ]
    },
    {
        key: 'ugc', title: 'UGC rules on plagiarism (2018)',
        summary: 'The UGC (Promotion of Academic Integrity and Prevention of Plagiarism in Higher Educational Institutions) Regulations, 2018 set levels by similarity, excluding quotations with citation, references, bibliography and standard terms.',
        todoTitle: 'The levels',
        todo: [
            'Level 0 — up to 10%: minor similarities; no penalty.',
            'Level 1 — above 10% up to 40%: for a student\'s research work, revise and resubmit within six months; for a teacher\'s publication, the manuscript is withdrawn.',
            'Level 2 — above 40% up to 60%: a student is debarred from resubmitting for a year; a teacher withdraws the manuscript, loses an annual increment and may not supervise new scholars for two years.',
            'Level 3 — above 60%: a student\'s registration is cancelled; a teacher withdraws the manuscript, loses two increments and may not supervise new scholars for three years.'
        ],
        tips: ['Universities may set stricter rules. Check your institution\'s current policy and its approved checker.'],
        links: [['UGC regulations', 'https://www.ugc.gov.in/']]
    },
    {
        key: 'checklist', title: 'Before you submit',
        summary: 'Run through this list for every thesis chapter and paper.',
        todo: [
            'Every quotation is in quotation marks, with a citation and page number.',
            'Every paraphrase is in your own words and structure, with a citation.',
            'Every figure, table and dataset you did not make is cited (and permitted, if needed).',
            'The reference list matches the in-text citations exactly, in one style.',
            'Reused text from your own earlier work is cited or rewritten.',
            'You ran a similarity check and dealt with every long match.'
        ]
    }
];
