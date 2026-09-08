/**
 * The interviewer that needs no AI key: stage-by-stage questions built from
 * the student's real skills, projects and courses, one follow-up per stage
 * when the answer gives it something to follow, and a heuristic evaluation.
 * Used when Gemini is not configured, over budget, or answers badly — and
 * it is what makes the section testable without a key.
 */
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
    const options = QUESTION_BANK[nextStage](context);
    const already = session.turns.filter((t) => t.stage === nextStage && !t.isFollowUp).length;
    return { question: pick(options, already), stage: nextStage, isFollowUp: false, difficulty: 'medium' };
};

/* ── Evaluation ────────────────────────────────────────────────────────── */

const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

const scoreAnswer = (turn, context) => {
    const a = String(turn.answer || '');
    const n = words(a);
    if (!n) return { score: 0, feedback: 'No answer was given. Even a short, honest attempt scores better than silence.', betterAnswer: 'Start with one sentence that answers the question directly, then give one example.' };
    let score = n < 15 ? 4 : n < 40 ? 6 : n < 120 ? 8 : 7;
    const mentionsSkill = context.skills.some((s) => a.toLowerCase().includes(s.name.toLowerCase()));
    const mentionsProject = context.projects.some((p) => a.toLowerCase().includes(p.name.toLowerCase().slice(0, 12)));
    const structured = /first|then|finally|because|for example|as a result|so that/i.test(a);
    const filler = (a.match(/\b(um|uh|like|basically|actually|you know)\b/gi) || []).length;
    if (mentionsSkill || mentionsProject) score += 1;
    if (structured) score += 1;
    if (filler > 3) score -= 1;
    score = Math.max(1, Math.min(10, score));
    const tips = [];
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
    const scores = {
        communication: clamp(base + (meanLen >= 40 ? 6 : -4)),
        technical: avgOf(techTurns),
        answerQuality: base,
        problemSolving: avgOf(probTurns),
        confidence: clamp(base + (meanLen >= 30 ? 2 : -8)),
        relevance: clamp(base + 4)
    };
    const overall = clamp(Object.values(scores).reduce((a, b) => a + b, 0) / 6);
    const strengths = [];
    if (meanLen >= 40) strengths.push('You gave full answers with enough detail to follow.');
    if (techTurns.length && avgOf(techTurns) >= 70) strengths.push('Solid technical explanations on the skills you know best.');
    if (answered.some((t) => context.projects.some((p) => t.answer.toLowerCase().includes(p.name.toLowerCase().slice(0, 12))))) strengths.push('You brought your own projects into your answers.');
    if (!strengths.length) strengths.push('You completed the interview and attempted every question — that is the first step.');
    const improvements = [];
    if (meanLen < 40) improvements.push('Give more structured, fuller answers with specific examples.');
    if (probTurns.length && avgOf(probTurns) < 70) improvements.push('Practise walking through problems step by step out loud.');
    if (per.some((p) => p.score <= 4)) improvements.push('Prepare short stories for common questions so you are never caught without an example.');
    if (!improvements.length) improvements.push('Keep practising to make your delivery more natural and confident.');
    return {
        overall, scores, strengths, improvements,
        feedback: `${context.firstName}, you scored ${overall}/100 in this ${session.type} interview. ${strengths[0]} ${improvements[0]}`,
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

const generateQuestions = (context) => {
    const out = [];
    const add = (category, topic, question, hint, difficulty = 'medium') => out.push({ id: `${category}-${out.length + 1}`, category, topic, question, hint, difficulty });
    add('hr', 'Introduction', 'Tell me about yourself.', 'Present, past, future: what you do now, how you got here, what you want next. Keep it under two minutes.');
    add('hr', 'Motivation', `Why do you want to work as a ${context.goal || 'professional in this field'}?`, 'Connect your courses and projects to the role. Be specific about what excites you.');
    add('hr', 'Strengths', 'What are your greatest strengths?', `Pick two, and back each with an example${context.strongSkills[0] ? ` — ${context.strongSkills[0]} is a natural one` : ''}.`);
    add('hr', 'Weaknesses', 'What is a weakness you are working on?', 'Choose a real one, then show what you are doing about it.');
    for (const s of context.skills.slice(0, 6)) {
        add('technical', s.name, `Explain the core concepts of ${s.name} and where you have applied them.`, 'Define it in one sentence, then give a concrete use from a course or project.', s.status === 'Advanced' ? 'hard' : 'medium');
        add('technical', s.name, `What is a common mistake people make with ${s.name}, and how do you avoid it?`, 'Interviewers love this: it shows depth beyond the basics.', 'medium');
    }
    for (const p of context.projects.slice(0, 3)) {
        add('project', p.name, `Walk me through "${p.name}". What problem did it solve?`, 'Goal, your role, the approach, the result. Mention the tools you used.');
        add('project', p.name, `What was the hardest part of "${p.name}" and how did you handle it?`, 'A specific obstacle and the decision you made shows problem-solving.');
    }
    if (!context.projects.length) add('project', 'Projects', 'Tell me about something you built, even a small exercise from a course.', 'Interviewers want to see initiative, not scale.');
    add('behavioral', 'Learning', 'Tell me about a time you had to learn something quickly.', 'Use STAR: Situation, Task, Action, Result.');
    add('behavioral', 'Teamwork', 'Describe a time you worked in a team and something went wrong.', 'Focus on what you did to fix it, not on blaming others.');
    add('behavioral', 'Feedback', 'Tell me about feedback that changed how you work.', 'Show that you listened and changed something concrete.');
    add('situational', 'Deadlines', 'Your deadline is tomorrow and you discover a serious bug. What do you do?', 'Prioritise, communicate early, propose options.');
    add('situational', 'Ambiguity', 'You are given a vague task. How do you make progress?', 'Ask clarifying questions, state assumptions, deliver a first version.');
    return out;
};

const recommendTopics = (context) => {
    const topics = [];
    for (const s of context.learningSkills.slice(0, 3)) topics.push({ topic: s, reason: 'Still developing — interviewers will probe it.' });
    for (const s of context.strongSkills.slice(0, 2)) topics.push({ topic: s, reason: 'Your strength — be ready to go deep.' });
    if (context.projects.length) topics.push({ topic: `Project story: ${context.projects[0].name}`, reason: 'Rehearse it as a two-minute story.' });
    topics.push({ topic: 'Tell me about yourself', reason: 'The opener of almost every interview.' });
    topics.push({ topic: 'STAR method', reason: 'Structure for behavioural questions.' });
    return topics.slice(0, 6);
};

module.exports = { nextQuestion, evaluate, generateQuestions, recommendTopics, QUESTION_BANK };
