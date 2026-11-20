/**
 * Speak Up (2026-11-19, Master Minds · Vocabulary — the user's four speaking picks in one game, for adults). Every
 * level is four rounds in this order: 1 Read Aloud · 2 Tongue Twister · 3 Interview Answer · 4 Story Retell.
 * Pure: the content banks and the scoring. The microphone side is components/games/useSpeech.js.
 */
import { pick, shuffle } from '../seeded.js';

/* ───────────────────────────── Words ───────────────────────────── */

const NUM = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 20: 'twenty', 30: 'thirty', 50: 'fifty', 100: 'hundred' };
/** Lower-case words, punctuation gone, digits spelt out ("3" → "three"). */
export const words = (text) => String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/-/g, ' ')
  .split(/\s+/).filter(Boolean).map((w) => (NUM[w] ?? w));

/** Two spoken words are the same if equal, or one letter apart in a long word (speech engines slip). */
const sameWord = (a, b) => {
  if (a === b) return true;
  if (a === `${b}s` || b === `${a}s`) return true; // walk / walks
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; continue; }
    edits += 1; if (edits > 1) return false;
    if (a.length > b.length) i += 1; else if (b.length > a.length) j += 1; else { i += 1; j += 1; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

/** Which words of `target` were said, in order (longest common subsequence): a boolean per target word. */
export const alignWords = (target, spoken) => {
  const t = words(target); const s = words(spoken);
  const L = Array.from({ length: t.length + 1 }, () => new Array(s.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i -= 1) for (let j = s.length - 1; j >= 0; j -= 1) {
    L[i][j] = sameWord(t[i], s[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  }
  const hit = new Array(t.length).fill(false);
  let i = 0; let j = 0;
  while (i < t.length && j < s.length) {
    if (sameWord(t[i], s[j])) { hit[i] = true; i += 1; j += 1; } else if (L[i + 1][j] >= L[i][j + 1]) i += 1; else j += 1;
  }
  return hit;
};

/** Words per minute → a 0–100 fluency score: 110–160 wpm is a natural speaking pace. */
export const paceScore = (wpm) => (wpm <= 0 ? 0 : wpm < 110 ? Math.round(Math.max(0, 100 - (110 - wpm) * 1.4)) : wpm <= 160 ? 100 : Math.round(Math.max(40, 100 - (wpm - 160) * 1.2)));

/* ───────────────────────────── 1 · Read Aloud ───────────────────────────── */

export const READINGS = [
  { level: 1, text: 'Good communication is a skill that improves with practice. When you speak clearly and listen carefully, people trust you more and your ideas are easier to follow.' },
  { level: 1, text: 'Our team meets every Monday morning to plan the week. Each person shares their progress, mentions any problems, and agrees on the next three priorities.' },
  { level: 1, text: 'Saving a little money every month is a simple habit. Over several years, those small amounts grow into a useful fund for emergencies or future plans.' },
  { level: 2, text: 'The new software update improves security and speed. However, users must restart their devices after installation, and some older features have been removed to make the application lighter.' },
  { level: 2, text: 'Customer feedback showed that delivery times were the biggest concern. The company therefore opened two regional warehouses, which reduced the average delivery time from five days to two.' },
  { level: 2, text: 'Regular exercise is not only good for the body but also for the mind. Studies suggest that a thirty minute walk can reduce stress and improve concentration for several hours.' },
  { level: 3, text: 'Renewable energy has become significantly cheaper during the past decade. Consequently, many governments are encouraging businesses to replace diesel generators with solar panels and battery storage systems.' },
  { level: 3, text: 'Effective leaders acknowledge their mistakes, communicate expectations clearly, and recognise the achievements of their colleagues. These behaviours build an environment of accountability and genuine collaboration.' },
  { level: 3, text: 'The archaeological survey uncovered pottery, jewellery and coins that were approximately two thousand years old, suggesting that the settlement was an important centre for regional trade.' }
];
/** Read-aloud score: accuracy (words said right) mostly, fluency (pace) a little. */
export const scoreReading = (text, spoken, seconds) => {
  const hit = alignWords(text, spoken);
  const acc = hit.length ? hit.filter(Boolean).length / hit.length : 0;
  const wpm = seconds > 0 ? (words(spoken).length / seconds) * 60 : 0;
  const pace = paceScore(wpm);
  return { hit, accuracy: Math.round(acc * 100), wpm: Math.round(wpm), pace, score: Math.round(acc * 80 + pace * 0.2) };
};

/* ───────────────────────────── 2 · Tongue Twister ───────────────────────────── */

export const TWISTERS = [
  { level: 1, text: 'She sells seashells by the seashore.', target: 4 },
  { level: 1, text: 'Red lorry, yellow lorry, red lorry, yellow lorry.', target: 5 },
  { level: 1, text: 'Fresh fried fish, fish fresh fried, fried fish fresh.', target: 5 },
  { level: 2, text: 'Peter Piper picked a peck of pickled peppers.', target: 4 },
  { level: 2, text: 'How much wood would a woodchuck chuck if a woodchuck could chuck wood?', target: 5 },
  { level: 2, text: 'I scream, you scream, we all scream for ice cream.', target: 4 },
  { level: 3, text: 'The sixth sick sheikh’s sixth sheep’s sick.', target: 4 },
  { level: 3, text: 'Unique New York, unique New York, you know you need unique New York.', target: 5 },
  { level: 3, text: 'Six slippery snails slid slowly seaward.', target: 4 }
];
/** Twister score: accuracy, then speed against the target time. */
export const scoreTwister = (tw, spoken, seconds) => {
  const hit = alignWords(tw.text, spoken);
  const acc = hit.length ? hit.filter(Boolean).length / hit.length : 0;
  const speed = seconds <= 0 ? 0 : seconds <= tw.target ? 100 : Math.max(0, Math.round(100 - (seconds - tw.target) * 15));
  return { hit, accuracy: Math.round(acc * 100), seconds: Math.round(seconds * 10) / 10, speed, score: Math.round(acc * 70 + speed * 0.3 * (acc >= 0.6 ? 1 : 0.3)) };
};

/* ───────────────────────────── 3 · Interview Answer ───────────────────────────── */

export const FILLERS = ['um', 'uh', 'erm', 'er', 'hmm', 'like', 'basically', 'actually', 'you know', 'i mean', 'sort of', 'kind of', 'literally'];
export const QUESTIONS = [
  { q: 'Tell me about yourself.', keys: [['experience', 'worked', 'work'], ['skill', 'skills', 'good at'], ['studied', 'degree', 'course', 'learned'], ['goal', 'goals', 'want to', 'aim'], ['team', 'people']] },
  { q: 'What is your greatest strength?', keys: [['strength', 'strong'], ['example', 'for instance', 'once', 'when i'], ['result', 'resulted', 'achieved', 'improved'], ['team', 'colleagues', 'people'], ['because', 'which helps', 'this helps']] },
  { q: 'Tell me about a challenge you faced and how you handled it.', keys: [['challenge', 'problem', 'difficult'], ['situation', 'project', 'task'], ['i decided', 'i planned', 'i worked', 'i spoke', 'action', 'i did'], ['result', 'finally', 'in the end', 'outcome'], ['learned', 'learnt', 'lesson']] },
  { q: 'Why do you want to work with us?', keys: [['company', 'organisation', 'organization', 'your team'], ['values', 'mission', 'culture'], ['grow', 'growth', 'learn'], ['contribute', 'add value', 'help'], ['skills', 'experience']] },
  { q: 'Where do you see yourself in five years?', keys: [['five years', 'future'], ['grow', 'growth', 'develop'], ['lead', 'leader', 'responsibility', 'manage'], ['skills', 'learn', 'expert'], ['company', 'team', 'organisation']] },
  { q: 'How do you handle pressure or tight deadlines?', keys: [['pressure', 'deadline', 'stress'], ['plan', 'prioritise', 'prioritize', 'list', 'schedule'], ['calm', 'focus', 'focused'], ['example', 'once', 'last'], ['team', 'communicate', 'ask for help']] },
  { q: 'Describe a time you worked in a team.', keys: [['team', 'group'], ['project', 'task'], ['my role', 'i was', 'responsible'], ['together', 'collaborate', 'helped', 'support'], ['result', 'finished', 'success', 'achieved']] },
  { q: 'What is one weakness you are working on?', keys: [['weakness', 'improve', 'improving'], ['example', 'used to', 'sometimes'], ['working on', 'practise', 'practice', 'learning', 'course'], ['better', 'progress', 'now i'], ['feedback', 'mentor', 'colleague']] }
];
const countPhrase = (text, phrase) => { const t = ` ${words(text).join(' ')} `; let n = 0; let i = t.indexOf(` ${phrase} `); while (i >= 0) { n += 1; i = t.indexOf(` ${phrase} `, i + 1); } return n; };
/** Interview score: key points covered, few fillers, a natural pace, enough said. */
export const scoreInterview = (item, spoken, seconds) => {
  const t = ` ${words(spoken).join(' ')} `;
  const keysHit = item.keys.map((alts) => alts.some((k) => t.includes(` ${words(k).join(' ')} `)));
  const fillers = FILLERS.map((f) => [f, countPhrase(spoken, f)]).filter(([, n]) => n > 0);
  const fillerCount = fillers.reduce((a, [, n]) => a + n, 0);
  const n = words(spoken).length;
  const wpm = seconds > 0 ? (n / seconds) * 60 : 0;
  const keyScore = (keysHit.filter(Boolean).length / item.keys.length) * 100;
  const fillerScore = Math.max(0, 100 - fillerCount * 15);
  const lengthScore = Math.min(100, (n / 45) * 100);
  return { keysHit, fillers, fillerCount, words: n, wpm: Math.round(wpm), pace: paceScore(wpm),
    score: Math.round(keyScore * 0.45 + fillerScore * 0.2 + paceScore(wpm) * 0.15 + lengthScore * 0.2) };
};

/* ───────────────────────────── 4 · Story Retell ───────────────────────────── */

export const STORIES = [
  { level: 1, title: 'The Late Train', text: 'Anita was going to an important interview in Pune. Her train was delayed by two hours. Instead of panicking, she called the company, explained the delay and asked to move the interview. They agreed to meet in the afternoon. Anita arrived calm, gave a confident interview and got the job.',
    points: [['interview'], ['train', 'delayed', 'delay', 'late'], ['called', 'phoned', 'rang'], ['afternoon', 'later', 'moved', 'rescheduled'], ['got the job', 'job', 'hired', 'selected']] },
  { level: 1, title: 'The Small Shop', text: 'Raju ran a small tea shop near a college. Sales were falling because a big café opened nearby. Raju asked his customers what they wanted. They asked for cheaper snacks and a place to study. He added a reading corner and student discounts, and soon his shop was busier than ever.',
    points: [['tea', 'shop'], ['café', 'cafe', 'competition', 'big'], ['asked', 'customers', 'students'], ['reading', 'study', 'corner', 'discount', 'discounts'], ['busier', 'busy', 'more customers', 'success']] },
  { level: 2, title: 'The Lost Data', text: 'Two days before a client presentation, Meera’s laptop crashed and her files were lost. Her colleague Kabir remembered that the team had a shared online folder. They found an older version of the report there. Working late together, they updated the numbers, and the presentation went so well that the client signed a new contract.',
    points: [['laptop', 'computer', 'crashed'], ['presentation', 'client'], ['kabir', 'colleague'], ['online', 'shared', 'folder', 'cloud', 'backup'], ['together', 'late', 'updated'], ['contract', 'signed', 'deal']] },
  { level: 2, title: 'The Village Well', text: 'A village had only one well, and it dried up every summer. A young engineer named Dev suggested collecting rainwater from the roofs during the monsoon. The villagers built small tanks under his guidance. The next summer, every home had water, and nearby villages came to learn the method.',
    points: [['well', 'water'], ['summer', 'dried', 'dry'], ['dev', 'engineer'], ['rain', 'rainwater', 'monsoon', 'roofs'], ['tanks', 'tank', 'built'], ['other villages', 'nearby', 'learn']] },
  { level: 3, title: 'The Product Launch', text: 'A start-up planned to launch its fitness app in March. During testing, users said the sign-up process was confusing. The founder, Isha, delayed the launch by four weeks, simplified the sign-up to a single screen and added a short tutorial. When the app finally launched, it received excellent reviews and doubled its expected downloads in the first month.',
    points: [['app', 'fitness', 'start up', 'startup'], ['testing', 'users', 'feedback'], ['confusing', 'sign up', 'signup'], ['delayed', 'four weeks', 'postponed'], ['simplified', 'single screen', 'tutorial'], ['reviews', 'downloads', 'doubled', 'success']] },
  { level: 3, title: 'The Negotiation', text: 'Rohan’s company wanted to buy machines from a supplier who refused to lower the price. Instead of arguing, Rohan asked what the supplier needed. He learned they wanted faster payment. Rohan offered to pay within a week instead of a month, and in return the supplier gave a ten percent discount and free maintenance for a year.',
    points: [['machines', 'supplier', 'buy'], ['price', 'refused', 'expensive'], ['asked', 'needed', 'listened'], ['faster payment', 'pay', 'week'], ['discount', 'ten percent', 'cheaper'], ['maintenance', 'free']] }
];
/** Retell score: the story's key points mentioned (any of each point's words). */
export const scoreRetell = (story, spoken) => {
  const t = ` ${words(spoken).join(' ')} `;
  const pointsHit = story.points.map((alts) => alts.some((k) => t.includes(` ${words(k).join(' ')} `)));
  const n = words(spoken).length;
  const lengthScore = Math.min(100, (n / 40) * 100);
  return { pointsHit, words: n, score: Math.round((pointsHit.filter(Boolean).length / story.points.length) * 85 + lengthScore * 0.15) };
};

/* ───────────────────────────── A level ───────────────────────────── */

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const speakTier = (difficulty, levelNo) => clampN((difficulty || 1) + (levelNo >= 20 ? 1 : 0), 1, 3);
export const PASS_MARK = 60; // a round passes at 60 or more out of 100

/** The four rounds of a level; `avoid` holds texts seen recently. */
export const makeSpeakLevel = (rng, tier, avoid = new Set()) => {
  const fresh = (list) => { const ok = list.filter((x) => !avoid.has(x.text || x.q)); return pick(rng, ok.length ? ok : list); };
  const byTier = (list) => { const t = list.filter((x) => x.level === tier); return t.length ? t : list; };
  return [
    { kind: 'read', item: fresh(byTier(READINGS)) },
    { kind: 'twister', item: fresh(byTier(TWISTERS)) },
    { kind: 'interview', item: fresh(shuffle(rng, QUESTIONS)), seconds: 30 },
    { kind: 'retell', item: fresh(byTier(STORIES)) }
  ];
};
