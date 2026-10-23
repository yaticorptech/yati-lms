/**
 * How to publish a research paper, the standard way: twelve steps from
 * "is this ready?" to "after it is out", each with what to do, tips, and the
 * free tools researchers use. Each status on the Publications Map points at
 * the steps that matter at that stage, so a paper always shows what comes next.
 */

export const PUBLISHING_STEPS = [
    {
        key: 'ready', title: 'Check the work is ready to publish',
        summary: 'A paper reports one clear contribution, with the evidence complete. Decide what kind of article it is before you write.',
        todo: [
            'Write your contribution in two sentences: what is new, and why it matters.',
            'Make sure the data, analysis and results are finished — not "in progress".',
            'Choose the article type: original research, review, short communication, case study or conceptual paper.',
            'Ask a senior colleague or your supervisor whether it is worth a journal paper or a conference paper first.'
        ],
        tips: ['One thesis often gives two to four papers — one per research question.', 'A conference paper can be developed into a fuller journal article later (check both venues\' policies).']
    },
    {
        key: 'journal', title: 'Choose the right journal',
        summary: 'The best journal is one whose readers care about your topic, that is properly indexed, and whose recent papers look like yours.',
        todo: [
            'List three to five journals that published papers like yours in the last two years (look at your own reference list).',
            'Check the aims and scope on the journal\'s own website.',
            'Confirm the indexing on the indexer\'s site — Scopus Sources or the Web of Science Master Journal List — never only on the journal\'s word.',
            'Note the quartile (Q1–Q4), review time, acceptance rate, and any article processing charge (APC).',
            'Check your university\'s current rules for approved journals (UGC\'s guidance changed in 2025; many institutions count Scopus / Web of Science indexing).'
        ],
        tips: ['Aim realistically: one ambitious journal first, with a solid second choice ready.', 'Open access is not the same as pay-to-publish; many good journals charge no APC.'],
        links: [
            ['Elsevier JournalFinder', 'https://journalfinder.elsevier.com/'],
            ['Springer Nature Journal Suggester', 'https://journalsuggester.springer.com/'],
            ['Scopus Sources', 'https://www.scopus.com/sources'],
            ['Web of Science Master Journal List', 'https://mjl.clarivate.com/'],
            ['DOAJ (open access journals)', 'https://doaj.org/']
        ]
    },
    {
        key: 'predatory', title: 'Avoid predatory and cloned journals',
        summary: 'Predatory journals take a fee and publish without real peer review. Cloned journals copy a real journal\'s name and website. Both waste your work.',
        todo: [
            'Be wary of emails inviting you to submit, especially with "publication in 7 days".',
            'Red flags: guaranteed acceptance, fees asked before review, fake or "global" impact factors, a vague editorial board, many unrelated subjects in one journal.',
            'For a cloned journal, compare the website address with the one listed on Scopus or Web of Science.',
            'Go through the Think. Check. Submit. checklist before every submission.'
        ],
        tips: ['A paper in a predatory journal usually cannot be republished elsewhere — and may count against you.'],
        links: [['Think. Check. Submit.', 'https://thinkchecksubmit.org/']]
    },
    {
        key: 'write', title: 'Write the manuscript (IMRaD)',
        summary: 'Most research papers follow the IMRaD structure: Introduction, Methods, Results and Discussion, with a title, abstract and keywords on top.',
        todo: [
            'Title: specific and searchable — the key variables, population and design.',
            'Abstract (150–300 words): background, aim, method, key results with numbers, conclusion; 4–6 keywords.',
            'Introduction: the problem, what is known, the gap, and your aim or research questions.',
            'Methods: enough detail for someone to repeat the study — design, sample, instruments, procedure, analysis, ethics approval.',
            'Results: what you found, in tables and figures, without interpretation.',
            'Discussion: what it means, how it compares with earlier studies, limitations, implications; then a short conclusion.',
            'Follow the reporting guideline for your design (CONSORT for trials, PRISMA for systematic reviews, STROBE for observational studies, COREQ for interviews).'
        ],
        tips: ['Write the Methods and Results first; the Introduction and Abstract last.', 'Every figure and table should make sense on its own, with a full caption.'],
        links: [['EQUATOR Network (reporting guidelines)', 'https://www.equator-network.org/']]
    },
    {
        key: 'format', title: 'Follow the journal\'s author guidelines',
        summary: 'Desk rejections often come from ignoring the guide for authors. Format the paper exactly as the chosen journal asks.',
        todo: [
            'Read the "Guide for authors": word limit, section headings, abstract format, figure resolution and file types.',
            'Use the journal\'s reference style (APA, IEEE, Vancouver, Harvard…) — a reference manager does this for you.',
            'Use the journal\'s Word or LaTeX template if it has one.',
            'For double-blind review, remove author names, affiliations and self-identifying references from the manuscript file.'
        ],
        tips: ['Zotero and Mendeley are free and can switch reference styles in one click.'],
        links: [['Zotero', 'https://www.zotero.org/']]
    },
    {
        key: 'ethics', title: 'Check ethics, authorship and originality',
        summary: 'Journals ask for statements on ethics, consent, conflicts of interest, funding and data. Settle authorship before you submit.',
        todo: [
            'Authorship: everyone listed made a real intellectual contribution and approved the final version (ICMJE criteria); describe roles with CRediT if asked.',
            'Ethics: state the approving committee and approval number, and how informed consent was taken.',
            'Declare conflicts of interest and funding sources; prepare a data availability statement.',
            'Run a plagiarism check and fix every match: quote and cite, or rewrite and cite. UGC\'s 2018 regulations treat up to 10% similarity (excluding quotes, references and common phrases) as minor.',
            'If you used AI tools for language editing, say so as the journal requires; never list AI as an author.'
        ],
        tips: ['Never send the same paper to two journals at the same time — that is duplicate submission.', 'Reusing large parts of your own published text without citing it is self-plagiarism.'],
        links: [['ICMJE authorship criteria', 'https://www.icmje.org/recommendations/browse/roles-and-responsibilities/defining-the-role-of-authors-and-contributors.html'], ['COPE (publication ethics)', 'https://publicationethics.org/']]
    },
    {
        key: 'package', title: 'Prepare the submission package',
        summary: 'Besides the manuscript, most journals want a cover letter, a title page and author details. Have them ready before you open the submission system.',
        todo: [
            'Cover letter (one page): the title, why it fits this journal, what is new, and a statement that it is original and not under review elsewhere.',
            'Title page: all authors, affiliations, corresponding author, ORCID iDs, word count, declarations.',
            'Extras if asked: highlights (3–5 bullet points), graphical abstract, suggested reviewers (experts with no conflict), supplementary files.',
            'Every author should have an ORCID iD — it is free and links your papers to you.'
        ],
        tips: ['Address the cover letter to the editor by name where you can.'],
        links: [['ORCID (free researcher iD)', 'https://orcid.org/']]
    },
    {
        key: 'submit', title: 'Submit through the journal\'s system',
        summary: 'Submissions go through the journal\'s online system (Editorial Manager, ScholarOne, OJS…). Keep a record of everything.',
        todo: [
            'Create an account, enter the metadata carefully, upload the files in the order asked, and approve the generated PDF.',
            'Note the manuscript ID and submission date (set the status here to "Submitted").',
            'All co-authors usually get a confirmation email — make sure they do.'
        ],
        tips: ['If something is unclear, email the editorial office before submitting rather than guessing.']
    },
    {
        key: 'review', title: 'Wait through peer review',
        summary: 'The editor first decides whether to send the paper out (desk review, often 1–4 weeks). Peer review then takes weeks to months.',
        todo: [
            'Possible decisions: desk reject, reject, major revision, minor revision, accept.',
            'Check the status in the system; if it is well past the journal\'s stated review time, send one polite enquiry to the editor.',
            'Meanwhile, start your next paper.'
        ],
        tips: ['Major revision is good news — most published papers go through at least one revision.']
    },
    {
        key: 'revise', title: 'Revise and respond to reviewers',
        summary: 'Answer every comment, point by point, politely and specifically. If the paper is rejected, use the feedback and try the next journal.',
        todo: [
            'Make a response letter: each reviewer comment, your reply, and where in the manuscript you changed it (page and line).',
            'Mark the changes in the revised manuscript (tracked changes or highlighted text).',
            'Where you disagree, explain why with evidence — respectfully.',
            'Submit before the revision deadline; ask for more time early if you need it.',
            'If rejected: revise using the comments, reformat for your second-choice journal, and submit there (it counts as a new submission).'
        ],
        tips: ['Thank the reviewers once at the start; no need to thank them in every reply.']
    },
    {
        key: 'accepted', title: 'Acceptance, proofs and copyright',
        summary: 'After acceptance the journal sends a licence or copyright form, possibly an APC invoice, and page proofs to check.',
        todo: [
            'Sign the copyright transfer or open-access licence (often CC BY) — read what it lets you share.',
            'Pay the APC only for a journal you have verified, and only after acceptance.',
            'Check the proofs within the time given (often 48 hours): fix errors only — this is not the time to rewrite.',
            'Note the DOI when it is assigned; the paper may appear online before the print issue.'
        ],
        tips: ['Keep your accepted manuscript: many journals allow you to share it in your institution\'s repository.']
    },
    {
        key: 'after', title: 'After publication',
        summary: 'Make the paper easy to find and count: add it everywhere your work is recorded, and share it.',
        todo: [
            'Add it to your Publications Map here (status "Published", with DOI, indexing and quartile).',
            'Update ORCID, Google Scholar and your institution\'s records (for appraisal / API scores and NAAC data).',
            'Share it with colleagues and on academic networks; present it at a seminar.',
            'Track citations over time and update them here — your h-index follows.'
        ],
        tips: ['A short plain-language summary on LinkedIn or a blog brings more readers than the PDF alone.'],
        links: [['Google Scholar profiles', 'https://scholar.google.com/citations']]
    }
];

/** Which steps matter at each status on the Publications Map. */
export const STATUS_STEPS = {
    idea: ['ready', 'journal', 'predatory'],
    drafting: ['write', 'format', 'ethics', 'package'],
    submitted: ['review', 'submit'],
    under_review: ['review'],
    revision: ['revise'],
    accepted: ['accepted'],
    published: ['after'],
    rejected: ['revise', 'journal']
};

/** The single next step for a paper at this status. */
export const nextStepFor = (status) => {
    const key = (STATUS_STEPS[status] || [])[0];
    return PUBLISHING_STEPS.find((s) => s.key === key) || null;
};
