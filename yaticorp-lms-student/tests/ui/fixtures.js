/** A finished interview, as the API returns it. Shared by the screen tests. */
const turn = (index, stage, question, answer, seconds, inputMode = 'voice') => ({
    index, stage, question, answer, inputMode, isFollowUp: false,
    askedAt: '2026-09-08T10:00:00.000Z',
    answeredAt: new Date(Date.parse('2026-09-08T10:00:00.000Z') + seconds * 1000).toISOString(),
    voice: inputMode === 'voice' ? { wordCount: 14, wpm: 96, fillerCount: 1, longPauses: 0 } : null
});

export const session = {
    id: 'r1', type: 'full', role: 'Full Stack Developer', status: 'completed',
    completedAt: '2026-09-08T10:10:00.000Z', xp: { completed: 30, improved: 0, challenge: 0 },
    turns: [
        turn(0, 'intro', 'Tell me about yourself and your background?', 'I am a MCA student I completed my MCA at st agnes college.', 42),
        turn(1, 'project', 'Tell me about a project you built.', 'I made a user registration.', 25, 'text'),
        turn(2, 'technical', 'How does bcrypt keep a stored password safe?', 'I used bcrypt.', 18)
    ],
    report: {
        overall: 35,
        scores: { communication: 40, technical: 30, answerQuality: 30, problemSolving: 35, confidence: 45, relevance: 35 },
        strengths: ['You engaged with the introduction question.'],
        improvements: ['Expand significantly on your answers.', 'Walk through the technical details clearly.'],
        feedback: 'Hi Bhagyashree, your responses were far too brief.',
        perQuestion: [
            { index: 0, score: 4, feedback: 'The answer was far too brief.', betterAnswer: 'I am an MCA student who recently completed my degree at St Agnes College.' },
            { index: 1, score: 3, feedback: 'No detail about what you built.', betterAnswer: 'Describe the routes and the models.' },
            { index: 2, score: 2, feedback: 'Naming the package is not an explanation.', betterAnswer: 'Explain hashing and salting.' }
        ],
        plan: [
            { title: 'Expand Technical Introductions', action: 'Draft a 60-second elevator pitch.', skill: 'Communication', courseId: '', courseTitle: '' },
            { title: 'Practice Detailed Answer Structuring', action: 'Use the STAR method.', skill: 'Express', courseId: 'c1', courseTitle: 'Backend with Node' },
            { title: 'Take another mock interview', action: 'Recommended after the steps above.', skill: '', courseId: '', courseTitle: '' }
        ],
        improvedBy: 0,
        communication: { notes: [{ kind: 'pace', tone: 'warn', text: 'You spoke slowly, around 96 words a minute. A little more pace will sound more confident.' }], wpm: 96, avgWords: 14, fillerCount: 1, longPauses: 0, voiceAnswers: 2, answers: 3 },
        recommendation: 'Practise explaining your Express route before your next mock interview.'
    }
};

/** A global-quiz paper and the marking that follows it. */
export const paper = {
    available: 24, categories: ['General Knowledge', 'Aptitude'],
    questions: [
        { questionId: 'q1', questionText: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars'], category: 'General Knowledge', difficulty: 'easy' },
        { questionId: 'q2', questionText: 'What is 15% of 200?', options: ['20', '30', '35'], category: 'Aptitude', difficulty: 'medium' }
    ]
};
/**
 * Marking, done the way the server does it: whatever answers arrive are
 * marked and sent straight back. The quiz submits one question at a time, so
 * a fixed payload would answer for questions that were never asked.
 */
export const markGlobal = `(url, body) => {
  const correct = { q1: 1, q2: 1 };
  const why = { q1: 'Mercury orbits closest.', q2: 'Ten per cent is 20, so fifteen is 30.' };
  const results = (body.answers || []).map((a) => ({
    questionId: a.questionId, questionText: '', providedAnswer: a.answer,
    correctAnswer: correct[a.questionId], isCorrect: a.answer === correct[a.questionId],
    explanation: why[a.questionId]
  }));
  const right = results.filter((r) => r.isCorrect).length;
  return { score: Math.round((right / results.length) * 100), correctCount: right, totalQuestions: results.length, results, practiceOnly: true };
}`;

/**
 * An api module that answers from a map of url fragment to payload.
 * `postSource` is optional raw source for a function that computes the reply
 * to a POST from its body, for endpoints whose answer depends on what was sent.
 */
export const apiModule = (routes, postSource = '') => `
const routes = ${JSON.stringify(routes)};
const pick = (url) => { const key = Object.keys(routes).find((k) => url.includes(k)); return key ? routes[key] : {}; };
const handlePost = ${postSource || 'null'};
window.__calls = [];
export default {
  get: (url) => { window.__calls.push(['GET', url]); return Promise.resolve({ data: pick(url) }); },
  // Resolved through a promise so a handler that throws rejects the call,
  // which is what axios does — never a synchronous throw at the call site.
  post: (url, body) => { window.__calls.push(['POST', url, body]);
    return Promise.resolve().then(() => (handlePost ? handlePost(url, body) : pick(url))).then((data) => ({ data })); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return Promise.resolve({ data: pick(url) }); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return Promise.resolve({ data: pick(url) }); }
};`;
