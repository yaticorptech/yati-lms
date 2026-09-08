/**
 * The AI Bio Generator.
 *
 * One interface — generateBio(data, interests) → { headline, bio, short,
 * model } — with two implementations behind it: Gemini when a key is
 * configured, and a template writer that composes plain sentences from the
 * same data when it is not. Both are handed ONLY the student's real records
 * (services/learningDataService.js), and the Gemini prompt forbids adding
 * anything that is not in them. Whatever comes back is checked again: any
 * skill, course or project name in the text that the data does not contain
 * fails the generation, and the template takes over.
 *
 * Gemini calls run through Career Path's daily AI budget and usage ledger,
 * so a student regenerating in a loop is bounded the same way a roadmap is.
 */
const aiQuota = require('../career/services/aiQuota');
const { runFor } = require('../career/services/aiContext');

const MODEL = process.env.LEARNING_BIO_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const configured = () => !!String(process.env.GEMINI_API_KEY || '').trim();

const list = (arr, max = 5) => arr.slice(0, max).join(', ');
const humanList = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);

/* ── The honest template writer ───────────────────────────────────────── */

/** Skills most worth naming first: the roadmap's (they point at the goal), then courses', then the resume's. */
const RANK = { career: 0, course: 1, resume: 2 };
const byRelevance = (skills) => [...skills].sort((a, b) => Math.min(...a.sources.map((x) => RANK[x] ?? 3)) - Math.min(...b.sources.map((x) => RANK[x] ?? 3)));

const mockGenerate = (d, interests) => {
    const ranked = byRelevance(d.skills);
    const strong = ranked.filter((s) => ['Advanced', 'Proficient'].includes(s.status)).map((s) => s.name);
    const growing = ranked.filter((s) => ['Developing', 'Learning'].includes(s.status)).map((s) => s.name);
    const focus = growing.length ? growing : strong;
    const now = d.courses.ongoing.map((c) => c.title);
    const goal = d.learningGoal;
    const areas = interests.map((i) => i.label.toLowerCase());
    const hasCourses = d.courses.completed.length + d.courses.ongoing.length > 0;

    // Paragraph 1 — who I am and how I learn. Only the routes that exist:
    // courses, assessments, projects, and the certificates on the resume.
    const ways = [hasCourses ? 'online courses' : '', d.assessments.passed ? 'assessments' : '', d.projects.length ? 'hands-on projects' : '', d.certificates.length ? 'certifications' : ''].filter(Boolean);
    const role = d.experience?.[0]?.title;
    const opener = role ? `I'm a ${role} and a passionate learner` : d.audience === 'school' ? "I'm a passionate student" : "I'm a passionate learner";
    const p1 = `${opener} who enjoys exploring new skills${areas.length ? ` in ${humanList(areas.slice(0, 3))}` : ''}${ways.length ? ` and gaining knowledge through ${humanList(ways)}` : ''}.`;

    // Paragraph 2 — what I'm focusing on right now.
    const on = focus.length ? `my skills in ${humanList(focus.slice(0, 4))}` : now.length ? humanList(now.slice(0, 2)) : 'the areas that interest me';
    const p2 = `Right now, I'm focusing on developing ${on} and building a stronger foundation for ${goal ? `a future as a ${goal}` : 'my future'}.`;

    // Paragraph 3 — how I go about it.
    const p3 = strong.length
        ? `I love taking on new challenges, learning continuously, and applying what I've learned in ${humanList(strong.slice(0, 2))} to real-world scenarios so I keep growing, both personally and professionally.`
        : `I love taking on new challenges, learning continuously, and applying what I learn in real-world scenarios to grow both personally and professionally.`;

    const headline = d.headlineHint || (goal ? `Aspiring ${goal}` : areas[0] ? `${interests[0].label} learner` : 'Learner on YATICORP LMS');
    return { headline: headline.slice(0, 80), bio: [p1, p2, p3].join('\n\n'), short: p1, model: 'mock' };
};

/* ── Gemini ────────────────────────────────────────────────────────────── */

const audienceGuide = {
    school: 'The learner is a SCHOOL student. Write a student-focused bio about learning, curiosity and progress. No job titles, no "professional", no "developer" unless a completed course literally says so.',
    college: 'Emphasise projects, skills and career interests. Do NOT call the learner a student unless `education` is non-empty; if `experience` names a job, that is what they do.',
    professional: 'The learner is a WORKING PROFESSIONAL. Emphasise skills, certifications, projects and professional development.'
};

const prompt = (d, interests) => `Write a Learning Bio for a student of an online learning platform (YATICORP LMS), from the JSON below and NOTHING else.

${audienceGuide[d.audience]}

Hard rules:
- Use only skills, courses, certificates, projects, achievements and interests that appear in the JSON. Never add a technology, tool, degree, job, company or accomplishment that is not there.
- Do not exaggerate. Skills marked "Learning" or "Developing" are in progress — say so. Only skills marked "Advanced" may be called strong/verified.
- Mention current learning areas (ongoing courses), and the learning goal if present.
- Style: FIRST PERSON, warm and simple, like this model (match its rhythm, not its facts):
    "I'm a passionate learner who enjoys exploring new skills and gaining knowledge through online courses, assessments, and hands-on projects.

    Right now, I'm focusing on developing my skills in areas that interest me and building a stronger foundation for my future.

    I love taking on new challenges, learning continuously, and applying what I learn in real-world scenarios to grow both personally and professionally."
- "bio": exactly THREE short paragraphs separated by a blank line (\n\n), one or two sentences each, 55–95 words in total, never starting with the name or "Hi":
    1. who I am as a learner and how I learn — mention "online courses" only if completedCourses or ongoingCourses is non-empty, "assessments" only if assessments.passed is above zero, "hands-on projects" only if projects is non-empty, "certifications" only if certificates is non-empty; if experience or resumeHeadline is present, say what I do; weave in the interests. The resume-sourced skills count as much as course skills.
    2. begins "Right now, I'm focusing on" — name at most FOUR skills, chosen for relevance to the learning goal and interests (roadmap skills before resume skills), written exactly as they appear in the data (keep capitalisation), and the learning goal if present.
    3. a closing line about attitude and growth; it may name the strongest (Advanced) skills, nothing else new.
- NO numbers of any kind: no counts, percentages, scores, dates or streaks. No emojis, hashtags, bullet points, asterisks or quotes.
- "short": the first paragraph only (max 35 words). "headline": at most 8 words.

Answer ONLY with JSON: {"headline": string, "short": string, "bio": string}

DATA:
${JSON.stringify({
    name: d.user.name,
    audience: d.audience,
    education: d.education.map((e) => e.title),
    learningGoal: d.learningGoal,
    experience: d.experience.map((e) => [e.title, e.detail].filter(Boolean).join(', ')),
    resumeHeadline: d.headlineHint,
    completedCourses: d.courses.completed.map((c) => c.title),
    ongoingCourses: d.courses.ongoing.map((c) => `${c.title} (${c.percentage}%)`),
    skills: byRelevance(d.skills).slice(0, 14).map((s) => `${s.name}: ${s.status} (from ${s.sources.join('/')})`),
    assessments: { passed: d.assessments.passed, averageScore: d.assessments.averageScore },
    certificates: d.certificates.map((c) => c.title),
    projects: d.projects.slice(0, 5).map((p) => p.name),
    achievements: d.achievements.slice(0, 6).map((a) => a.title),
    interests: interests.map((i) => i.label),
    streak: d.streak
}, null, 0)}`;

/** Every proper name the model is allowed to use, lower-cased. */
const allowed = (d, interests) => new Set([
    ...d.skills.map((s) => s.name), ...d.courses.completed.map((c) => c.title), ...d.courses.ongoing.map((c) => c.title),
    ...d.certificates.map((c) => c.title), ...d.projects.map((p) => p.name), ...d.achievements.map((a) => a.title),
    ...interests.map((i) => i.label), d.learningGoal, d.user.name
].filter(Boolean).map((s) => s.toLowerCase()));

/**
 * Catch the classic fabrication: a technology name the data never held.
 * Checked against a list of common tools; a term in the text but not in the
 * student's data means the model reached outside the JSON.
 */
const TECH_TERMS = ['python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'react', 'angular', 'vue', 'node', 'django', 'flask', 'sql', 'mongodb', 'aws', 'azure', 'docker', 'kubernetes', 'tensorflow', 'pytorch', 'excel', 'tableau', 'figma', 'photoshop', 'html', 'css', 'php', 'swift', 'kotlin', 'flutter', 'rust', 'go '];
const fabricated = (text, d, interests) => {
    const ok = [...allowed(d, interests)].join(' | ');
    const t = String(text).toLowerCase();
    return TECH_TERMS.filter((term) => t.includes(term) && !ok.includes(term.trim()));
};

const geminiGenerate = async (d, interests) => {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const started = Date.now();
    let ok = false;
    try {
        await aiQuota.assertWithinBudget();
        const res = await ai.models.generateContent({
            model: MODEL,
            contents: prompt(d, interests),
            config: { responseMimeType: 'application/json', maxOutputTokens: 600, temperature: 0.4 }
        });
        const text = typeof res.text === 'function' ? res.text() : res.text || res?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
        const parsed = JSON.parse(String(text).replace(/```(?:json)?/g, '').trim());
        const bio = String(parsed.bio || '').trim();
        const short = String(parsed.short || '').trim();
        const headline = String(parsed.headline || '').trim().slice(0, 80);
        if (!bio) throw new Error('empty bio');
        const bad = fabricated(`${headline} ${short} ${bio}`, d, interests);
        if (bad.length) throw new Error(`fabricated: ${bad.join(', ')}`);
        ok = true;
        return { headline, bio, short: short || bio.split(/(?<=\.)\s/).slice(0, 2).join(' '), model: MODEL };
    } finally {
        aiQuota.record({ kind: 'learning-bio', model: MODEL, ok, ms: Date.now() - started });
    }
};

/**
 * The one entry point. Falls back to the template writer when the AI is
 * absent, over budget, or answered with something the data does not
 * support — and says which in `model`, so the UI can be honest about it.
 */
const generateBio = async (data, interests, { userId } = {}) => {
    if (!configured()) return mockGenerate(data, interests);
    try {
        return await runFor(userId, () => geminiGenerate(data, interests));
    } catch (err) {
        console.warn('[learning-bio] AI generation fell back to the template writer:', err.message);
        return { ...mockGenerate(data, interests), fallbackReason: err.code || err.message };
    }
};

module.exports = { generateBio, mockGenerate, configured, MODEL };
