/**
 * The interviewer that needs no AI key: stage-by-stage questions built from
 * the student's real skills, projects and courses, one follow-up per stage
 * when the answer gives it something to follow, and a heuristic evaluation.
 * Used when Gemini is not configured, over budget, or answers badly — and
 * it is what makes the section testable without a key.
 */
const { classWords } = require('./level');

const pick = (arr, i) => arr[i % arr.length];
const humanList = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);

const QUESTION_BANK = {
    intro: (c) => [`Hi ${c.firstName}, welcome to your mock interview. Let's begin. Tell me about yourself.`],
    about: (c) => [`Tell me about yourself and what got you interested in ${c.goal || c.interests[0] || 'this field'}.`],
    background: (c) => [
        c.education.length ? `Walk me through your education so far — ${c.education[0]} — and what you enjoyed most about it.` : 'Walk me through your educational background and what you enjoyed most about it.',
        c.completedCourses.length ? `You completed ${humanList(c.completedCourses.slice(0, 2))}. What did you take away from that?` : 'What have you been learning recently, and why did you choose it?'
    ],
    skills: (c) => [
        c.strongSkills.length ? `You list ${humanList(c.strongSkills.slice(0, 3))} among your strongest skills. Which one are you most confident in, and how did you build it?` : c.skills.length ? `Which of your skills — ${humanList(c.skills.slice(0, 3).map((s) => s.name))} — do you feel strongest in, and why?` : 'What would you say are your three strongest skills, and how did you build them?',
        c.learningSkills.length ? `You're currently learning ${humanList(c.learningSkills.slice(0, 2))}. What has been the hardest part so far?` : 'What skill are you working on improving right now?'
    ],
    technical: (c) => {
        const s = c.strongSkills[0] || c.skills[0]?.name || 'your main technical skill';
        const t = [...c.strongSkills, ...c.learningSkills, ...c.skills.map((x) => x.name)].find((x) => x && x !== s);
        return [
            `Let's get technical. Explain a core concept in ${s} to me as if I were a junior colleague.`,
            t ? `How would you compare ${s} with ${t} — when would you choose one over the other?` : `What is the most advanced thing you have done with ${s}?`,
            `Describe a bug or a hard problem you hit while working with ${s}, and how you solved it.`
        ];
    },
    project: (c) => c.projects.length
        ? [
            `Tell me about your project "${c.projects[0].name}". What was the goal and what was your role?`,
            c.projects[1] ? `You also worked on "${c.projects[1].name}". What would you do differently if you built it again?` : `What was the biggest technical decision in "${c.projects[0].name}", and why did you make it?`
        ]
        : ['Tell me about something you have built or worked on that you are proud of, even if it was small.'],
    problem: () => [
        'Here is a problem: a report your team relies on suddenly shows wrong numbers. Walk me through how you would find the cause.',
        'You are given a task with unclear requirements and a tight deadline. How do you approach it?'
    ],
    behavioral: () => [
        'Tell me about a time you had to learn something quickly. What did you do?',
        'Describe a time you received difficult feedback. How did you respond?'
    ],
    situational: () => [
        'Imagine your teammate is not pulling their weight on a group project. What would you do?',
        'If you were asked to present your work to people with no technical background, how would you prepare?'
    ],
    candidate: () => ['We are almost done. Do you have any questions for me about the role or the team?'],
    closing: (c) => [`Thank you, ${c.firstName}. That concludes our interview. I'll share your evaluation now.`]
};

/**
 * The question a school student is asked about what comes next, by where
 * they are: a younger child what they want to become, Class 9–10 the stream
 * after Class 10, Class 11–12 the course after Class 12.
 */
const futureQuestion = (c) => ({
    high: 'Which stream do you want to take after Class 10 — Science, Commerce or Arts — and why?',
    senior: 'Which course do you want to study after Class 12, and why?'
}[c.level?.key] || (c.goal ? `You want to become a ${c.goal} one day. What made you want that?` : 'What would you like to become when you grow up, and why?'));

/**
 * The same stages for a school student (level.js): their class, subjects,
 * school projects and life with friends and teachers — never a manager, a
 * client or a salary.
 */
const SCHOOL_QUESTION_BANK = {
    intro: (c) => [`Hi ${c.firstName}, welcome to your practice interview. Let's begin. Tell me a little about yourself.`],
    about: (c) => [
        c.goal ? `You want to become a ${c.goal} one day. What made you interested in that?` : 'What do you enjoy most, in school and outside it?',
        futureQuestion(c)
    ],
    background: (c) => [
        `Which subject do you enjoy most in ${classWords(c.level)}, and why?`,
        c.completedCourses.length ? `You finished "${c.completedCourses[0]}". What was the most interesting thing you learnt?` : 'What is something new you learnt recently, in school or outside it?'
    ],
    skills: (c) => [
        c.strongSkills.length ? `You are good at ${humanList(c.strongSkills.slice(0, 2))}. Tell me about a time you used it.` : 'What are you good at? Tell me about one thing you do well.',
        c.learningSkills.length ? `You are learning ${humanList(c.learningSkills.slice(0, 2))}. What is the hardest part so far?` : 'What are you trying to get better at right now?'
    ],
    technical: (c) => {
        const s = c.strongSkills[0] || c.skills[0]?.name;
        return [
            s ? `Explain ${s} to me in simple words, as you would to a younger classmate.` : `Pick one topic you learnt in ${classWords(c.level)} and explain it to me simply, as you would to a younger classmate.`,
            'How do you solve a maths or science question you have never seen before?',
            'How do you check that your answer to a question is right?'
        ];
    },
    project: (c) => c.projects.length
        ? [
            `Tell me about "${c.projects[0].name}". What did you do yourself?`,
            c.projects[1] ? `You also did "${c.projects[1].name}". What would you do differently next time?` : `What was the hardest part of "${c.projects[0].name}", and what did you do?`
        ]
        : ['Tell me about a school project, model or activity you are proud of. What did you do yourself?', 'What was the hardest part of it, and what did you do?'],
    problem: () => [
        'You have two tests on the same day and only one evening to prepare. How would you plan it?',
        'Your class wants to plant trees around the school, but there is very little money. How would you help make it happen?'
    ],
    behavioral: () => [
        'Tell me about a time you had to learn something quickly, like before a test.',
        'Tell me about a time a teacher or parent gave you advice that helped you.'
    ],
    situational: () => [
        'Imagine someone in your group project is not doing their part. What would you do?',
        'If a friend asked to copy your homework, what would you say?'
    ],
    candidate: () => ['We are almost done. Do you have any questions for me?'],
    closing: (c) => [`Thank you, ${c.firstName}. That's the end of our practice interview. I'll share how you did now.`]
};

/** A follow-up when the answer offers one; null when it does not. */
const followUpFor = (stage, answer, c) => {
    const a = String(answer || '').trim();
    if (a.split(/\s+/).length < 8) return `Could you expand on that a little? Give me a specific example.`;
    const project = c.projects.find((p) => a.toLowerCase().includes(p.name.toLowerCase().slice(0, 12)));
    if (project && stage !== 'project') return `Interesting — you mentioned "${project.name}". Why did you choose that approach for it?`;
    const skill = c.skills.find((s) => new RegExp(`\\b${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(a));
    if (skill && ['skills', 'technical', 'project'].includes(stage)) return `You mentioned ${skill.name}. What is one thing about ${skill.name} that people often get wrong?`;
    if (['behavioral', 'situational', 'problem'].includes(stage) && !/result|outcome|learn|because|so that/i.test(a)) return 'And what was the outcome? What did you learn from it?';
    return null;
};

/**
 * The next thing to ask. May follow up on the last answer (same stage) when
 * `canFollowUp` and the answer gives it something; otherwise the first
 * question of `nextStage`.
 */
const nextQuestion = ({ session, context, nextStage, canFollowUp, lastTurn }) => {
    if (canFollowUp && lastTurn) {
        const f = followUpFor(lastTurn.stage, lastTurn.answer, context);
        if (f) return { question: f, stage: lastTurn.stage, isFollowUp: true, difficulty: 'medium' };
    }
    const options = (context.level?.school ? SCHOOL_QUESTION_BANK : QUESTION_BANK)[nextStage](context);
    const already = session.turns.filter((t) => t.stage === nextStage && !t.isFollowUp).length;
    return { question: pick(options, already), stage: nextStage, isFollowUp: false, difficulty: 'medium' };
};

/* ── Evaluation ────────────────────────────────────────────────────────── */

const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Words of the question worth picking up, as a sign the answer engaged with it. */
const questionTerms = (question) => (String(question || '').toLowerCase().match(/[a-z][a-z'-]{4,}/g) || [])
    .filter((w) => !['about', 'would', 'could', 'their', 'there', 'which', 'where', 'these', 'those', 'tell', 'walk', 'through', 'yourself', 'something', 'anything'].includes(w));

/**
 * Length is the easiest thing to measure and the least worth measuring, so it
 * only sets the starting point. What moves the score is whether the answer
 * engaged with the question — did it pick up the question's own terms, name a
 * real skill or project, hold a shape — and above all whether the interviewer
 * had to ask again, which is this session's own record that the answer failed.
 */
const scoreAnswer = (turn, context) => {
    const a = String(turn.answer || '');
    const n = words(a);
    if (!n) return { score: 0, feedback: 'No answer was given. Even a short, honest attempt scores better than silence.', betterAnswer: 'Start with one sentence that answers the question directly, then give one example.' };
    const nudges = turn.clarifications || 0;
    let score = n < 15 ? 4 : n < 40 ? 5 : n < 120 ? 7 : 6;
    const lower = a.toLowerCase();
    const mentionsSkill = context.skills.some((s) => lower.includes(s.name.toLowerCase()));
    const mentionsProject = context.projects.some((p) => lower.includes(p.name.toLowerCase().slice(0, 12)));
    const engaged = questionTerms(turn.question).some((w) => lower.includes(w.slice(0, 6)));
    const structured = /first|then|finally|because|for example|as a result|so that/i.test(a);
    const filler = (a.match(/\b(um|uh|like|basically|actually|you know)\b/gi) || []).length;
    if (mentionsSkill || mentionsProject) score += 1;
    if (structured) score += 1;
    if (engaged) score += 1;
    // Heavy filler costs more than the odd "like": every third one is a mark.
    score -= Math.min(2, Math.floor(filler / 3));
    // The interviewer had to put the question again: that answer did not land,
    // and no amount of words afterwards makes it a good one. It still scores
    // something — they did answer in the end — but never more than a third.
    if (nudges) score = Math.max(1, Math.min(score - nudges, 4 - nudges));
    score = Math.max(0, Math.min(10, score));
    const tips = [];
    if (nudges) tips.push(`The interviewer had to ask this ${nudges === 1 ? 'a second time' : `${nudges + 1} times`} before you answered it — read what is being asked, and answer that.`);
    if (!engaged && n >= 10) tips.push('Your answer never picked up what the question was actually about.');
    if (n < 40) tips.push('Give a fuller answer — aim for three or four sentences with one concrete example.');
    if (!structured) tips.push('Structure it: the situation, what you did, and the result.');
    if (!mentionsSkill && !mentionsProject && ['technical', 'project', 'skills'].includes(turn.stage)) tips.push('Name the specific tools, skills or project you used.');
    if (filler > 3) tips.push('Cut filler words such as "basically" and "like".');
    if (!tips.length) tips.push('Good answer — clear, specific and relevant.');
    return {
        score,
        feedback: tips.join(' '),
        betterAnswer: `Answer in three parts: one sentence stating the point, a specific example${context.projects[0] ? ` (for instance from "${context.projects[0].name}")` : ''}, and the result or what you learned.`
    };
};

// The interview as a sentence names it: the raw type read "this hr interview".
const TYPE_WORDS = { hr: 'HR interview', technical: 'technical interview', project: 'project interview', behavioral: 'behavioral interview', full: 'full mock interview' };

const evaluate = ({ session, context }) => {
    const answered = session.turns.filter((t) => t.answer);
    const per = answered.map((t) => ({ index: t.index, ...scoreAnswer(t, context) }));
    const avg10 = per.length ? per.reduce((a, b) => a + b.score, 0) / per.length : 0;
    const base = clamp(avg10 * 10);
    const lengths = answered.map((t) => words(t.answer));
    const meanLen = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
    const techTurns = per.filter((p) => ['technical', 'skills', 'project'].includes(session.turns[p.index]?.stage));
    const probTurns = per.filter((p) => ['problem', 'situational'].includes(session.turns[p.index]?.stage));
    const avgOf = (rows) => (rows.length ? clamp(rows.reduce((a, b) => a + b.score, 0) / rows.length * 10) : base);
    // How much of the interview the candidate had to be asked twice for.
    const nudged = answered.filter((t) => (t.clarifications || 0) > 0).length;
    const nudgeShare = answered.length ? nudged / answered.length : 0;
    const scores = {
        communication: clamp(base + (meanLen >= 40 ? 6 : -4) - 12 * nudgeShare),
        technical: avgOf(techTurns),
        answerQuality: base,
        problemSolving: avgOf(probTurns),
        confidence: clamp(base + (meanLen >= 30 ? 2 : -8) - 10 * nudgeShare),
        // Relevance is what a repeated question measures, so it takes the brunt.
        relevance: clamp(base + 4 - 30 * nudgeShare)
    };
    const overall = clamp(Object.values(scores).reduce((a, b) => a + b, 0) / 6);
    const strengths = [];
    if (meanLen >= 40) strengths.push('You gave full answers with enough detail to follow.');
    if (techTurns.length && avgOf(techTurns) >= 70) strengths.push('Solid technical explanations on the skills you know best.');
    if (answered.some((t) => context.projects.some((p) => t.answer.toLowerCase().includes(p.name.toLowerCase().slice(0, 12))))) strengths.push('You brought your own projects into your answers.');
    // No hollow praise for turning up: a candidate who reads "you joined the
    // interview" under "what you did well" learns nothing from the report.
    if (!strengths.length) strengths.push('There is little to point to in this round — your answers were too short and too general to show what you know. The steps below are what will change that.');
    const improvements = [];
    // A question is repeated for gibberish and "I don't know" as well as for an
    // answer about something else, and the session keeps only how often: the
    // reason is not blamed on one of them.
    if (nudged) improvements.push(`Answer the question that was asked, in full sentences — the interviewer had to ask ${nudged === 1 ? 'a question' : `${nudged} questions`} again because the reply did not answer it.`);
    if (meanLen < 40) improvements.push('Give more structured, fuller answers with specific examples.');
    if (probTurns.length && avgOf(probTurns) < 70) improvements.push('Practise walking through problems step by step out loud.');
    if (per.some((p) => p.score <= 4)) improvements.push('Prepare short stories for common questions so you are never caught without an example.');
    if (!improvements.length) improvements.push('Keep practising to make your delivery more natural and confident.');
    return {
        overall, scores, strengths, improvements,
        feedback: `${context.firstName}, you scored ${overall}/100 in this ${TYPE_WORDS[session.type] || `${session.type} interview`}. ${strengths[0]} ${improvements[0]}`,
        perQuestion: per,
        plan: [
            ...(context.learningSkills[0] ? [{ title: `Strengthen ${context.learningSkills[0]}`, action: `Practise ${context.learningSkills[0]} interview questions`, skill: context.learningSkills[0] }] : []),
            ...(meanLen < 40 ? [{ title: 'Improve communication', action: 'Practise answering with the situation, action, result structure', skill: 'Communication' }] : []),
            ...(context.projects.length ? [{ title: 'Improve project explanation', action: `Rehearse a two-minute story about "${context.projects[0].name}"`, skill: '' }] : []),
            { title: 'Take another mock interview', action: 'Recommended after completing the steps above', skill: '' }
        ],
        model: 'template'
    };
};

/* ── Practice question bank ────────────────────────────────────────────── */

/*
 * Every question comes with a way to answer it (asked 2026-10-15: "add sample
 * answers ... what to tell, what should not tell"): a short sample in the
 * student's own voice, built from what the profile really holds — where it
 * holds nothing, a [bracket] marks the part only they can fill in — what a
 * strong answer says, and what to leave out. The AI writes its own for its
 * bank (aiInterviewer.coachQuestions); these are the built-in bank's.
 */
const generateQuestions = (context) => {
    if (context.level?.school) return schoolQuestions(context);
    const out = [];
    const add = (category, topic, question, hint, difficulty = 'medium', coach = {}) =>
        out.push({ id: `${category}-${out.length + 1}`, category, topic, question, hint, difficulty, ...coach });
    const tip = (sample, say, avoid) => ({ sample, say, avoid });
    const goal = context.goal || 'professional in this field';
    const strong = context.strongSkills.slice(0, 2);
    const skill0 = strong[0] || context.skills[0]?.name;
    const course = context.completedCourses[0] || context.ongoingCourses[0];
    const project = context.projects[0]?.name;
    const where = project ? `"${project}"` : course ? `"${course}"` : 'a course exercise';

    add('hr', 'Introduction', 'Tell me about yourself.', 'Present, past, future: what you do now, how you got here, what you want next. Keep it under two minutes.', 'medium', tip(
        `I'm a student working towards becoming a ${goal}. ${course ? `I've been learning through courses like "${course}"` : "I've been learning the basics step by step"}${project ? `, and I built "${project}" to put it into practice` : ''}. Next, I want to keep growing my skills and use them in a real team.`,
        ['Now, how you got here, then what is next', 'One thing you have actually done', 'Why this path suits you'],
        ['Reading out your whole CV', 'Private details that do not help']));
    add('hr', 'Motivation', `Why do you want to work as a ${goal}?`, 'Connect your courses and projects to the role. Be specific about what excites you.', 'medium', tip(
        `I've always enjoyed ${skill0 ? `working with ${skill0}` : 'learning how things work in this field'}, and ${course ? `the "${course}" course` : 'what I have learned so far'} showed me I want to do it every day. I want work where I keep learning and can see the difference it makes.`,
        ['A real moment that got you interested', 'What you have done about it since', 'What excites you about the work'],
        ['Talking only about money or perks', '"I just like it" with no reason']));
    add('hr', 'Strengths', 'What are your greatest strengths?', `Pick two, and back each with an example${context.strongSkills[0] ? ` — ${context.strongSkills[0]} is a natural one` : ''}.`, 'medium', tip(
        `One of my strengths is ${skill0 || 'learning quickly'}: ${project ? `I used it in "${project}"` : 'I use it in my coursework all the time'}. Another is that I keep going when something is hard, breaking it into small steps until it works.`,
        ['Two strengths, not ten', 'A real example for each', 'How each helps in this role'],
        ['Strengths you cannot back up', 'Sounding as if you have no flaws']));
    add('hr', 'Weaknesses', 'What is a weakness you are working on?', 'Choose a real one, then show what you are doing about it.', 'medium', tip(
        "I used to take on too much at once and rush the details. Now I plan my week, finish one thing before starting the next, and check my work before handing it in. It's getting better.",
        ['A real weakness, not a hidden boast', 'What you are doing about it', 'The progress you have seen'],
        ['"I am a perfectionist"', 'A weakness that rules you out']));
    add('hr', 'Goals', 'Where do you see yourself in five years?', 'Show ambition that fits the role: the skills you want and the responsibility you hope to take on.', 'easy', tip(
        `In five years I'd like to be working as a ${goal}, confident in ${skill0 || 'the core skills'} and trusted with bigger tasks. I also want to keep learning, and maybe help newer people the way others helped me.`,
        ['Growth that fits this role', 'Skills you want to master', 'That you will keep learning'],
        ['A completely different career', '"I don\'t know"']));
    add('hr', 'Fit', 'Why should we choose you over other candidates?', 'Three reasons, each backed by something you have actually done.', 'medium', tip(
        `I've already started building the skills this role needs${strong.length ? `, especially ${humanList(strong)}` : ''}${project ? `, and I've used them in "${project}"` : ''}. I learn fast, I finish what I start, and I really want to grow in this field.`,
        ['Three reasons, each with proof', 'What you have actually done', 'How keen you are to learn'],
        ['Putting other candidates down', 'Claims with nothing behind them']));
    add('hr', 'Research', `What do you know about the work of a ${goal}?`, 'Name the day-to-day tasks and one current challenge in the field — it shows you did your homework.', 'easy', tip(
        `From what I've read and learned, a ${goal}'s day mixes [the main tasks], working with a team and solving problems as they come up. One challenge right now is [a current challenge], which is why I keep learning.`,
        ['Real day-to-day tasks', 'One current challenge or trend', 'Where you found it out'],
        ['Guessing wildly', '"I have not looked into it"']));
    for (const s of context.skills.slice(0, 6)) {
        add('technical', s.name, `Explain the core concepts of ${s.name} and where you have applied them.`, 'Define it in one sentence, then give a concrete use from a course or project.', s.status === 'Advanced' ? 'hard' : 'medium', tip(
            `In one line, ${s.name} is [what it is, in your own words]. I used it in ${where}, where I [what you did with it], and it helped me [the result].`,
            ['A one-line definition', 'Where you used it', 'What you learned from it'],
            ['A textbook definition with no example', 'Pretending to know what you do not']));
        add('technical', s.name, `What is a common mistake people make with ${s.name}, and how do you avoid it?`, 'Interviewers love this: it shows depth beyond the basics.', 'medium', tip(
            `A common mistake with ${s.name} is [the mistake], which leads to [the problem it causes]. I avoid it by [your habit: a check, a test or a rule], something I learned while working on ${where}.`,
            ['One specific mistake', 'Why it causes trouble', 'The habit that prevents it'],
            ['"I never make mistakes"', 'A mistake you cannot explain']));
        add('technical', s.name, `How would you explain ${s.name} to someone who has never heard of it?`, 'Start from what they already know, use one everyday comparison, and skip the jargon.', 'easy', tip(
            `Think of ${s.name} as [an everyday comparison]. Just like [the everyday thing], it [what it does]. So whenever you [a common use], ${s.name} is what makes it work.`,
            ['Start from something they know', 'One simple comparison', 'Why it is useful'],
            ['Jargon and short forms', 'Going on too long']));
    }
    // No skills recorded yet: general questions about the field instead, so
    // a new student's bank is not left with no technical questions at all.
    if (!context.skills.length) {
        const field = context.goal || 'your chosen field';
        add('technical', 'Fundamentals', `What are the core skills someone needs to succeed as a ${field}?`, 'Name three, and say how you are building each one.', 'easy', tip(
            `The three skills I think matter most are [skill 1], [skill 2] and [skill 3]. I'm building them through ${course ? `"${course}"` : 'my courses'} and practising a little every week.`,
            ['Three clear skills', 'How you are building each', 'Why they matter'],
            ['A long list with no detail', 'Skills that do not fit the field']));
        add('technical', 'Fundamentals', `Which tools or methods are used most in ${field}?`, 'Mention what you have tried yourself, even in a course exercise.', 'medium', tip(
            "The ones I've seen used most are [tool 1] and [tool 2]. I've tried [the one you used] in [a course or exercise], and next I want to learn [the next one].",
            ['Tools you have actually tried', 'What you did with them', 'What you want to learn next'],
            ['Naming tools you never used', 'Claiming you know them all']));
        add('technical', 'Problem solving', 'Walk me through how you would approach a problem you have never seen before.', 'Break it down, check what you know, try the simplest step, and test it.', 'medium', tip(
            "First I make sure I understand the problem and what \"done\" looks like. Then I split it into small steps, try the simplest one and check that it works. If I'm stuck, I look it up or ask, and I note what I learned.",
            ['Understand it first', 'Small steps, each one checked', 'When you would ask for help'],
            ['"I would just search it"', 'Jumping straight to an answer']));
        add('technical', 'Learning', 'How do you keep your knowledge up to date?', 'Name real sources — courses, communities, practice — and something recent you learned.', 'easy', tip(
            `I learn from ${course ? `courses like "${course}"` : 'online courses'}, practise with small exercises, and follow people who share tips in this field. Recently I learned [something new] and tried it out the same week.`,
            ['Real sources you use', 'Something recent you learned', 'How you practised it'],
            ['A vague "I read a lot"', 'Sources you cannot name']));
    }
    for (const p of context.projects.slice(0, 3)) {
        const tools = (p.skills || []).slice(0, 3);
        add('project', p.name, `Walk me through "${p.name}". What problem did it solve?`, 'Goal, your role, the approach, the result. Mention the tools you used.', 'medium', tip(
            `"${p.name}" was built to [the problem it solves]. My part was [what you did yourself], and I used ${tools.length ? humanList(tools) : '[the tools you used]'}. In the end, [the result: what works now, who used it, what you learned].`,
            ['The problem first', 'Your own part in it', 'The result'],
            ['"We did" with nothing about you', 'Skipping what came of it']));
        add('project', p.name, `What was the hardest part of "${p.name}" and how did you handle it?`, 'A specific obstacle and the decision you made shows problem-solving.', 'medium', tip(
            `The hardest part of "${p.name}" was [the obstacle]. I first tried [your first idea], it didn't work because [the reason], so I [what you did instead]. It taught me to [the lesson].`,
            ['A specific obstacle', 'The choice you made', 'What you learned'],
            ['"Nothing was hard"', 'Blaming the tools or the team']));
    }
    if (!context.projects.length) add('project', 'Projects', 'Tell me about something you built, even a small exercise from a course.', 'Interviewers want to see initiative, not scale.', 'medium', tip(
        `In ${course ? `"${course}"` : 'one of my courses'} I built [a small thing] that [what it did]. It was small, but I planned it, fixed the problems myself and finished it. Next I want to build [a bigger idea].`,
        ['Even small work counts', 'What you did yourself', 'What you would build next'],
        ['"I have not built anything"', 'Making a small exercise sound huge']));
    add('behavioral', 'Learning', 'Tell me about a time you had to learn something quickly.', 'Use STAR: Situation, Task, Action, Result.', 'medium', tip(
        'When I had to learn [the topic] in [a short time] for [a test, task or project], I split it into small parts, practised a little every day and asked for help when I got stuck. I [the result], and I still learn new things that way.',
        ['Situation, task, action, result', 'What you did, step by step', 'How it turned out'],
        ['A story with no ending', 'Saying it was easy']));
    add('behavioral', 'Teamwork', 'Describe a time you worked in a team and something went wrong.', 'Focus on what you did to fix it, not on blaming others.', 'medium', tip(
        'In a group task, two of us worked on the same part by mistake and we fell behind. I suggested a quick check-in, we split the work clearly, and we finished on time. Since then I always agree on who does what at the start.',
        ['What went wrong, briefly', 'What you did to fix it', 'What you do differently now'],
        ['Blaming your teammates', 'A story where you did nothing']));
    add('behavioral', 'Feedback', 'Tell me about feedback that changed how you work.', 'Show that you listened and changed something concrete.', 'medium', tip(
        'A teacher told me my work was right but hard to follow. I started adding short notes and checking it from the reader\'s side, and my next piece was much clearer. Now I ask for feedback early.',
        ['The feedback, in plain words', 'What you changed', 'The difference it made'],
        ['Getting defensive about it', 'Feedback you ignored']));
    add('behavioral', 'Mistakes', 'Tell me about a mistake you made and what you learned from it.', 'Own it plainly, say how you fixed it, and what you now do differently.', 'medium', tip(
        'Once I [the mistake, e.g. handed in work without checking it] and it [what happened]. I owned up, fixed it straight away, and now I always [the habit you built].',
        ['Own it plainly', 'How you fixed it', 'What you do now'],
        ['A made-up or tiny mistake', 'Blaming someone else']));
    add('behavioral', 'Pressure', 'Describe a time you had to work under pressure.', 'Use STAR, and say how you kept quality up while moving fast.', 'hard', tip(
        'Before [an exam or deadline] I had [several things] due in [a short time]. I listed everything, did the most important parts first and kept checking my work so the quality did not drop. I finished on time and learned to start earlier.',
        ['How you prioritised', 'How you kept quality up', 'How it turned out'],
        ['"I work best under pressure" with no story', 'A missed deadline with no lesson']));
    add('situational', 'Deadlines', 'Your deadline is tomorrow and you discover a serious bug. What do you do?', 'Prioritise, communicate early, propose options.', 'medium', tip(
        "First I'd check how serious the bug is and who it affects. Then I'd tell my lead straight away with options: fix it now, ship a safe workaround, or move the deadline. Whatever we pick, I'd test the fix properly.",
        ['Tell people early', 'Options, not just the problem', 'Test the fix'],
        ['Hiding the bug', 'Panicking or blaming']));
    add('situational', 'Ambiguity', 'You are given a vague task. How do you make progress?', 'Ask clarifying questions, state assumptions, deliver a first version.', 'medium', tip(
        "I'd ask a few questions to understand what \"done\" looks like. Then I'd write down my assumptions, make a small first version and show it early, so I can adjust before going too far.",
        ['Clarifying questions', 'Your assumptions, said out loud', 'An early first version'],
        ['Waiting to be told everything', 'Guessing silently']));
    add('situational', 'Disagreement', 'You disagree with your manager about how to do a task. What do you do?', 'Raise it privately with reasons and data, listen, then commit to the decision.', 'hard', tip(
        "I'd talk to my manager privately, explain my reasons with any facts I have, and listen to theirs. If they still prefer their way, I'd go with it fully and learn from how it turns out.",
        ['Raise it privately and politely', 'Reasons and facts', 'Commit once it is decided'],
        ['Arguing in front of others', 'Doing it your way anyway']));
    add('situational', 'Teamwork', 'A teammate is not doing their share and the deadline is close. How do you handle it?', 'Talk to them first, offer help, and escalate only with facts if nothing changes.', 'medium', tip(
        "I'd talk to them first, since they may be stuck or busy, and offer to help or split the work differently. If nothing changes and the deadline is at risk, I'd tell the lead calmly, with facts.",
        ['Talk to them first', 'Offer help', 'Escalate only with facts'],
        ['Complaining behind their back', 'Quietly doing all their work']));
    add('situational', 'Priorities', 'You are given three urgent tasks at once. How do you decide what to do first?', 'Weigh impact and deadline, confirm priorities with whoever set them, and say what will slip.', 'medium', tip(
        "I'd look at the deadline and impact of each task, check with whoever gave them which matters most, and start with that one. I'd tell people early which task might slip and when they can expect it.",
        ['Impact and deadline', 'Confirm the priorities', 'Say early what will slip'],
        ['Trying to do all three at once', 'Picking the easiest one first']));
    return out;
};

/**
 * The practice bank for a school student (level.js): about themselves, their
 * subjects and plans, what they learn in class, school projects, and
 * situations with friends, teachers and exams — written in simple English,
 * each with a sample answer, what to say and what to leave out.
 */
const schoolQuestions = (context) => {
    const out = [];
    const add = (category, topic, question, hint, difficulty, sample, say, avoid) =>
        out.push({ id: `${category}-${out.length + 1}`, category, topic, question, hint, difficulty, sample, say, avoid });
    const cls = classWords(context.level);
    const inClass = context.level?.classNo ? `in Class ${context.level.classNo}` : 'in [your class]';
    const course = context.completedCourses[0] || context.ongoingCourses[0];

    add('hr', 'Introduction', 'Tell me about yourself.', 'Say your name and class, what you enjoy, and one thing you are proud of. Keep it under a minute.', 'easy',
        `I'm ${context.firstName}, and I study ${inClass}. I enjoy [your favourite subject or hobby], and I'm proud that I [something you did well]. ${context.goal ? `One day I want to become a ${context.goal}.` : 'I like learning new things and trying them out.'}`,
        ['Your name and class', 'What you enjoy', 'One thing you are proud of'], ['Your address or phone number', 'Saying your name and stopping']);
    add('hr', 'Subjects', 'Which subject do you enjoy most, and why?', 'Name it, say what you like about it, and give one topic you found interesting.', 'easy',
        'I enjoy [the subject] the most because [the reason]. This year I liked learning about [a topic], and I [something you did with it: made a model, solved harder questions, read more].',
        ['The subject and the reason', 'One topic you liked', 'Something you did with it'], ['"All subjects", with no reason', 'Complaining about a teacher']);
    add('hr', 'Your future', futureQuestion(context), 'Say what you want, why it suits you, and one thing you are already doing about it.', 'medium',
        `I want to [the stream, course or career you choose] because [the reason: a subject you love, something you saw or did]. ${course ? `Learning "${course}" showed me I enjoy it.` : 'I am already [one thing you do towards it].'} I know it needs hard work, and I am ready for it.`,
        ['What you want', 'Why it suits you', 'What you are already doing'], ['"My parents told me to", with no reason of your own', '"I don\'t know yet"']);
    add('hr', 'Strengths', 'What are you good at?', 'Pick one or two things and give an example of each from school or home.', 'easy',
        "I'm good at [a strength, e.g. explaining things to my friends]. For example, [a time you used it]. I'm also [another strength], which helps me [how it helps].",
        ['One or two strengths', 'An example for each', 'How it helps you'], ['A long list with no examples', 'Boasting']);
    add('hr', 'Getting better', 'What is one thing you want to get better at?', 'Choose something real, and say what you are doing about it.', 'medium',
        "I want to get better at [e.g. managing my time before exams]. Now I [what you are doing: make a timetable, practise every day], and it is slowly getting better.",
        ['Something real', 'What you are doing about it', 'Any progress so far'], ['"Nothing"', 'Something that is really a boast']);
    add('hr', 'Free time', 'What do you like to do in your free time?', 'Talk about a hobby, why you enjoy it, and what it teaches you.', 'easy',
        "In my free time I like [your hobby]. It helps me [relax, be creative, stay fit], and it has taught me [something, e.g. patience].",
        ['A real hobby', 'Why you enjoy it', 'What it teaches you'], ['Only "I watch my phone"', 'A one-word answer']);
    add('hr', 'Inspiration', 'Who inspires you, and why?', 'A person you look up to, and what you learn from them.', 'easy',
        'I look up to [a person] because [what they did]. From them I learnt to [the lesson], and I try to [how you follow it].',
        ['Who, and why', 'What you learn from them', 'How you follow it'], ['A name with no reason', 'Someone you know nothing about']);

    for (const s of context.skills.slice(0, 3)) {
        add('technical', s.name, `Explain ${s.name} in your own words, as you would to a younger classmate.`, 'Say what it is in one line, then give one example from school or daily life.', 'easy',
            `${s.name} is [what it is, in simple words]. For example, [an everyday example]. I learnt it [where: in class, in a course, in a project].`,
            ['One simple line', 'An everyday example', 'Where you learnt it'], ['Copying a textbook definition', 'Pretending to know what you do not']);
        add('technical', s.name, `Where have you used ${s.name}, in school or at home?`, 'A real time you used it, and what came of it.', 'medium',
            `I used ${s.name} when [a real time: a class activity, homework, a project], and it helped me [the result]. Next I want to [what you want to try with it].`,
            ['A real time you used it', 'What came of it', 'What you want to try next'], ['A made-up example', 'Only saying "many times"']);
    }
    add('technical', 'What you learn', `Pick one topic you learnt ${context.level?.classNo ? `in Class ${context.level.classNo}` : 'this year'} and explain it simply.`, 'Choose a topic you understand well, explain it in three or four sentences, and give an example.', 'medium',
        `One topic I learnt ${inClass} is [the topic]. It means [a simple explanation]. For example, [an example]. I like it because [the reason].`,
        ['A topic you really understand', 'A simple explanation', 'One example'], ['A topic you only half know', 'Reading out your notes']);
    add('technical', 'Solving problems', 'How do you solve a maths or science question you have never seen before?', 'Read it carefully, write what you know, try one step at a time, and check your answer.', 'medium',
        'First I read the question twice and write down what is given and what is asked. Then I think of an idea or formula from class that fits, try it step by step, and check whether the answer makes sense.',
        ['Read and understand it first', 'One step at a time', 'Check the answer'], ['"I skip it"', 'Guessing without trying']);
    add('technical', 'Exams', 'How do you prepare for your exams?', 'Your plan: a timetable, revision, practice papers, and rest.', 'easy',
        'A few weeks before, I make a timetable and revise one subject at a time. I practise old question papers, mark my mistakes and go over them again. The night before, I read my short notes and sleep on time.',
        ['A plan you really follow', 'Practice and revision', 'Rest before the exam'], ['"I study the night before"', 'A plan you do not follow']);
    add('technical', 'Learning', 'What is something you learnt recently outside your textbook?', 'A fact, a skill or an idea, and where you learnt it.', 'medium',
        `Recently I learnt [something] from [a book, a video, ${course ? `the course "${course}"` : 'a course'} or a person]. I found it interesting because [the reason], and I [what you did with it].`,
        ['What you learnt', 'Where you learnt it', 'What you did with it'], ['"Nothing"', 'Something you cannot explain']);

    if (context.projects.length) {
        for (const p of context.projects.slice(0, 2)) {
            add('project', p.name, `Tell me about "${p.name}". What did you do yourself?`, 'What it was, your own part, and what you learnt.', 'medium',
                `"${p.name}" was about [what it was]. My part was [what you did yourself], and in the end [the result]. I learnt [the lesson].`,
                ['What it was', 'Your own part', 'What you learnt'], ['"We did it", with nothing about you', 'Making it sound bigger than it was']);
        }
    } else {
        add('project', 'School project', 'Tell me about a school project, model or activity you are proud of.', 'What it was, what you did yourself, and what you learnt.', 'medium',
            'For [a school project or event], I [what you did yourself], and our [model or project] [what it did]. I learnt [the lesson], and I was proud because [the reason].',
            ['What it was', 'Your own part', 'What you learnt'], ['"We did it", with nothing about you', '"I have never done one"']);
    }
    add('project', 'The hard part', 'What was the hardest part of a project you did, and what did you do?', 'One real problem and how you solved it.', 'medium',
        'The hardest part was [the problem]. First I tried [your idea]; when that did not work, I [asked a teacher, tried another way]. It taught me [the lesson].',
        ['One real problem', 'What you tried', 'What it taught you'], ['"Nothing was hard"', 'Blaming your group']);
    add('project', 'Your idea', 'If you could make any project for your school science fair, what would it be?', 'An idea, why it matters, and how you would start.', 'hard',
        'I would make [your idea] because [the problem it solves or why it is interesting]. I would start by [the first step], and I would need [the materials or help].',
        ['Your idea', 'Why it matters', 'How you would start'], ['An idea you cannot explain', '"I don\'t know"']);

    add('behavioral', 'Learning quickly', 'Tell me about a time you had to learn something quickly, like before a test.', 'Say what happened, what you did, and how it ended.', 'medium',
        'Before my [subject] test I had only [a short time] to learn [a topic]. I made short notes, practised a few questions every day and asked my teacher my doubts. I [the result], and now I start earlier.',
        ['What happened', 'What you did, step by step', 'How it ended'], ['A story with no ending', 'Saying it was easy']);
    add('behavioral', 'Teamwork', 'Tell me about a time you worked in a group at school.', 'Your part in the group, a problem you faced together, and how it ended.', 'medium',
        'In a group [project or event] we had to [the task]. I [your part], and when [a problem came up] we [how you fixed it together]. In the end we [the result].',
        ['Your own part', 'A problem and how you fixed it', 'How it ended'], ['Blaming your group', 'A story where you did nothing']);
    add('behavioral', 'Advice', 'Tell me about advice from a teacher or parent that helped you.', 'The advice, what you changed, and the difference it made.', 'easy',
        'My [teacher or parent] told me [the advice]. I started [what you changed], and [the difference it made].',
        ['The advice', 'What you changed', 'The difference it made'], ['Advice you ignored', 'Getting upset about it']);
    add('behavioral', 'Mistakes', 'Tell me about a mistake you made and what you learnt from it.', 'Own it, say how you fixed it, and what you do differently now.', 'medium',
        'Once I [the mistake, e.g. did not check my answers] and [what happened]. I owned up, fixed it, and now I always [the habit you built].',
        ['Own it plainly', 'How you fixed it', 'What you do now'], ['Blaming someone else', 'A made-up mistake']);
    add('behavioral', 'Nerves', 'Tell me about a time you felt nervous — before an exam, a speech or a match. What did you do?', 'What made you nervous, what you did about it, and how it went.', 'medium',
        'Before [the event] I felt nervous. I [what you did: practised, took deep breaths, talked to someone], and it went [how it went]. Now I know [what you learnt].',
        ['What made you nervous', 'What you did about it', 'What you learnt'], ['"I never get nervous"', 'Giving up']);

    add('situational', 'Honesty', 'A friend asks to copy your homework. What do you do?', 'Say no kindly, and offer to help them understand it instead.', 'easy',
        "I'd tell my friend kindly that copying won't help in the exam, and offer to explain the parts they find hard. That way we both learn.",
        ['Say no kindly', 'Offer to help them learn', 'Why honesty matters'], ['Letting them copy', 'Telling everyone about it']);
    add('situational', 'Group work', 'Someone in your group project is not doing their part. What would you do?', 'Talk to them first, offer help, and tell the teacher only if nothing changes.', 'medium',
        "I'd talk to them first and ask if something is wrong, then offer to help or share the work differently. If nothing changes, I'd tell our teacher politely.",
        ['Talk to them first', 'Offer help', 'Tell the teacher only if needed'], ['Complaining behind their back', 'Doing all their work quietly']);
    add('situational', 'A busy week', 'You have an exam and a big school event in the same week. How do you plan?', 'Write down both, plan day by day, and ask for help early if you need it.', 'medium',
        "I'd write down both dates, make a day-by-day plan and study a little every day while practising for the event. If it got too much, I'd tell my teacher early.",
        ['A day-by-day plan', 'A little every day', 'Ask for help early'], ['Dropping one of them', 'Leaving everything to the last day']);
    add('situational', 'Doubts', 'You did not understand what the teacher taught today. What do you do?', 'Try it again at home, note your doubts, and ask the next day.', 'easy',
        "I'd read the topic again at home, try a few questions and write down my doubts. The next day I'd ask the teacher or a friend, because asking early stops a doubt from growing.",
        ['Try it yourself first', 'Write down your doubts', 'Ask early'], ['Hoping it will not come in the exam', 'Feeling too shy to ask']);
    add('situational', 'Kindness', 'You see a classmate being teased by others. What would you do?', 'Do not join in, support your classmate, and tell a teacher if it goes on.', 'medium',
        "I wouldn't join in. I'd stand with my classmate, ask the others to stop, and if it goes on, I'd tell a teacher. Everyone should feel safe at school.",
        ['Do not join in', 'Support your classmate', 'Tell a teacher if it goes on'], ['Laughing along', 'Fighting the others']);
    return out;
};

/** The topics a school student should be ready for. */
const schoolTopics = (context) => {
    const topics = [
        { topic: 'Tell me about yourself', reason: 'The first question in almost every interview.' },
        { topic: 'Your favourite subject', reason: 'Know why you like it, with one topic.' },
        { topic: { high: 'Your stream after Class 10', senior: 'Your course after Class 12' }[context.level?.key] || 'What you want to become', reason: 'Be ready to say what you want, and why.' }
    ];
    for (const s of context.strongSkills.slice(0, 1)) topics.push({ topic: s, reason: 'Your strength — be ready to explain it simply.' });
    if (context.projects.length) topics.push({ topic: `Your project: ${context.projects[0].name}`, reason: 'Practise telling it in one minute.' });
    else topics.push({ topic: 'A school project or activity', reason: 'Have one story ready about something you did.' });
    topics.push({ topic: 'Telling a story', reason: 'What happened, what you did, how it ended.' });
    return topics.slice(0, 6);
};

/**
 * What a strong answer says, and what to leave out, by kind of question: for
 * a question whose own tips have not been written (an AI bank saved before
 * questions came with them, or a batch the AI could not write).
 */
const TIPS = {
    hr: { say: ['A real example from your own life', 'Why it matters for your goal'], avoid: ['Memorised, generic lines', 'Talking only about money or perks'] },
    technical: { say: ['A one-line answer first', 'Where you have used it'], avoid: ['A textbook definition with no example', 'Bluffing: say how you would find out'] },
    project: { say: ['The problem, your part, the result', 'What you learned'], avoid: ['"We did" with nothing about you', 'Skipping what came of it'] },
    behavioral: { say: ['Situation, task, action, result', 'What you learned'], avoid: ['Blaming others', 'A story with no ending'] },
    situational: { say: ['Your first step, and why', 'Who you would tell, and when'], avoid: ['Saying it would never happen', 'Handling it alone in silence'] }
};
const tipsFor = (category) => TIPS[category] || TIPS.hr;

const recommendTopics = (context) => {
    if (context.level?.school) return schoolTopics(context);
    const topics = [];
    for (const s of context.learningSkills.slice(0, 3)) topics.push({ topic: s, reason: 'Still developing — interviewers will probe it.' });
    for (const s of context.strongSkills.slice(0, 2)) topics.push({ topic: s, reason: 'Your strength — be ready to go deep.' });
    if (context.projects.length) topics.push({ topic: `Project story: ${context.projects[0].name}`, reason: 'Rehearse it as a two-minute story.' });
    topics.push({ topic: 'Tell me about yourself', reason: 'The opener of almost every interview.' });
    topics.push({ topic: 'STAR method', reason: 'Structure for behavioural questions.' });
    return topics.slice(0, 6);
};

module.exports = { nextQuestion, evaluate, generateQuestions, recommendTopics, tipsFor, QUESTION_BANK, SCHOOL_QUESTION_BANK };
