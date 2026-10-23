/**
 * Academic writing, step by step: a guide for teachers and research scholars,
 * shown on the Independent Writing page.
 */

export const WRITING_STEPS = [
    {
        key: 'habit', title: 'Build a writing habit',
        summary: 'Researchers who write a little every day finish more than those who wait for long free days. Small, regular sessions beat rare marathons.',
        todo: [
            'Set a daily goal you can keep on a busy day — 250 to 500 words, or 30 minutes.',
            'Write at the same time each day, before email and messages.',
            'Use a timer: 25 minutes of writing, a 5-minute break (the focus timer here does this).',
            'Look back at the last 14 days on the Independent Writing page: gaps show where the habit slipped.'
        ],
        tips: ['Write first, edit later. Drafting and editing at the same time slows both.']
    },
    {
        key: 'plan', title: 'Plan before you write',
        summary: 'Most unclear writing is unclear thinking. Know what you want to say before you start the sentences.',
        todo: [
            'Write the main point of the piece in one or two sentences.',
            'List the three to five points that support it, in order.',
            'Under each point, note the evidence: data, sources, examples.',
            'Decide who will read it — examiners, reviewers, students, the public — and what they already know.'
        ]
    },
    {
        key: 'paragraphs', title: 'Build clear paragraphs',
        summary: 'One paragraph, one idea. A common pattern is PEEL: Point, Evidence, Explanation, Link.',
        todo: [
            'Point: open with a topic sentence that states the paragraph\'s claim.',
            'Evidence: support it with data, a source or an example.',
            'Explanation: say what the evidence shows and why it matters.',
            'Link: connect to the next paragraph or back to your argument.'
        ],
        examplesTitle: 'A PEEL paragraph',
        examples: [
            { label: 'Example', tone: 'good', text: 'Peer tutoring reduced mathematics anxiety in all three colleges. Mean anxiety scores fell from 3.8 to 2.9 on a five-point scale (Table 2). This suggests that explaining problems to peers made students less afraid of being wrong. The next section asks whether the lower anxiety also raised examination marks.' }
        ]
    },
    {
        key: 'style', title: 'Write in a clear academic style',
        summary: 'Academic writing is precise, not complicated. Short sentences and plain words are easier to read and harder to misunderstand.',
        todo: [
            'Prefer short sentences — around 15 to 25 words.',
            'Use the active voice where it is clearer: "We surveyed 300 students" rather than "300 students were surveyed by us".',
            'Use plain words: "use" not "utilise", "show" not "demonstrate the fact that".',
            'Define each technical term once, then use it the same way throughout.',
            'Be specific: "a 24% rise" rather than "a significant rise" (unless you mean statistically significant).'
        ],
        examples: [
            { label: 'Wordy', tone: 'bad', text: 'It is important to note that, owing to the fact that the sample size was small in nature, the results obtained should be interpreted with caution.' },
            { label: 'Clear', tone: 'good', text: 'Because the sample was small, the results should be interpreted with caution.' }
        ]
    },
    {
        key: 'claims', title: 'Make claims at the right strength',
        summary: 'Say exactly as much as your evidence supports — no more, no less. This is called hedging.',
        todo: [
            'Strong evidence: "shows", "demonstrates", "confirms".',
            'Moderate evidence: "suggests", "indicates", "is associated with".',
            'Weak or early evidence: "may", "might", "it is possible that".',
            'Correlation is not causation: write "was associated with", not "caused", unless your design tested cause and effect.'
        ]
    },
    {
        key: 'flow', title: 'Link ideas smoothly',
        summary: 'Transition words show the reader how one idea relates to the next.',
        todo: [
            'Adding: also, further, in addition, similarly.',
            'Contrasting: however, in contrast, on the other hand, although.',
            'Cause and effect: therefore, as a result, consequently, because of this.',
            'Examples: for example, for instance, such as.',
            'Summing up: in summary, overall, taken together.'
        ],
        tips: ['Start a paragraph by linking back: "These findings suggest…", "Unlike earlier studies…".']
    },
    {
        key: 'english', title: 'Writing in English as a second language',
        summary: 'Many excellent researchers write in a second language. A few habits remove most of the problems reviewers notice.',
        todo: [
            'Keep a personal phrase bank of useful sentences from good papers in your field (the structure, not the content).',
            'Watch the common slips: articles (a / the), subject–verb agreement, tense consistency.',
            'Methods and results are usually in the past tense; established facts in the present.',
            'Read your text aloud — awkward sentences sound awkward.',
            'Ask a colleague who writes well in English to read one chapter; you will learn your own patterns.'
        ],
        links: [['Manchester Academic Phrasebank', 'https://www.phrasebank.manchester.ac.uk/']]
    },
    {
        key: 'edit', title: 'Edit and proofread',
        summary: 'Edit in rounds, each for one thing — structure first, sentences next, spelling last.',
        todo: [
            'Round 1 — structure: does every section and paragraph earn its place, in the right order?',
            'Round 2 — paragraphs: one idea each, a clear topic sentence, links between them.',
            'Round 3 — sentences: cut extra words, fix long sentences, check hedging.',
            'Round 4 — accuracy: numbers, tables and citations match the text and the reference list.',
            'Round 5 — proofread: spelling, punctuation, formatting; reading aloud or on paper helps.'
        ],
        tips: ['Leave a draft for a day before editing it. You will see it as a reader does.']
    },
    {
        key: 'feedback', title: 'Get and use feedback',
        summary: 'Every good writer relies on readers. Ask early and ask specifically.',
        todo: [
            'Ask a precise question: "Is the argument in section 2 convincing?" works better than "Any comments?".',
            'Share chapters with your supervisor in good time, with a short note on what changed.',
            'Form a writing group with colleagues: read one another\'s drafts each month.',
            'Thank readers, consider every comment, and keep a list of comments you hear often — they show what to fix next time.'
        ]
    }
];
