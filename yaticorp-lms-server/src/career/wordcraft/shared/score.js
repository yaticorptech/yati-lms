/**
 * WORDCRAFT scoring (2026-11-20, the user: "scoring should be the same as in the other games" — no AI). Every
 * challenge is scored 0–100 in the browser from what can honestly be counted in a transcript: words, the topic's
 * keywords, forbidden words, filler words, pauses, pace, vocabulary range, the twists used. A challenge passes at 60.
 * Speech-to-text hears words, not accents, so the twister checks that every word came out recognisably — it is not
 * a pronunciation grade, and the feedback says so.
 *
 * Typed answers (a browser without speech recognition) are capped at 80: speaking is the point of the game.
 */
import { words, alignWords, paceScore, FILLERS } from './text.js';

export const PASS = 60;
export const TYPED_CAP = 80;

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const STOP = new Set('the a an and or but so of to in on at for with from by is are was were be been it its this that these those there their they them he she his her you your we our i me my not no yes do does did have has had will would can could should just very really also than then as if about into over out up'.split(' '));

/** Does the spoken word `w` count as `key` — the same word or one of its forms (rain → rains, rainy, raining)? */
export const sameForm = (w, key) => {
  if (!w || !key) return false;
  if (w === key) return true;
  const stem = key.length > 4 && /e$/.test(key) ? key.slice(0, -1) : key;
  return w.startsWith(stem) && w.length - stem.length <= 4 && key.length >= 3;
};
/** How many of `keys` turn up in the words. */
export const keysHit = (toks, keys) => keys.filter((k) => { const kk = words(k); return kk.length > 1 ? phraseIn(toks, kk) : toks.some((w) => sameForm(w, kk[0])); });
const phraseIn = (toks, kk) => toks.some((_, i) => kk.every((k, j) => sameForm(toks[i + j], k)));

/** Forbidden words said, in order of first use; multi-word bans count as phrases. */
export const forbiddenSaid = (text, bans) => {
  const toks = words(text);
  return bans.filter((b) => { const kk = words(b); return kk.length > 1 ? phraseIn(toks, kk) : toks.some((w) => sameForm(w, kk[0])); });
};

const fillersIn = (text) => {
  const t = ` ${words(text).join(' ')} `;
  return FILLERS.reduce((n, f) => n + (t.split(` ${f} `).length - 1), 0);
};
/** Vocabulary range: different words used, and longer, less common ones. */
const vocabOf = (toks, stage) => {
  if (!toks.length) return 0;
  const content = toks.filter((w) => !STOP.has(w));
  const variety = new Set(toks).size / toks.length;
  const rich = content.filter((w) => w.length >= 7).length / Math.max(1, toks.length);
  const want = [0.07, 0.09, 0.11, 0.13][stage];
  return clamp(55 * Math.min(1, variety / 0.6) + 45 * Math.min(1, rich / want));
};
const stutters = (toks) => toks.reduce((n, w, i) => n + (i && w === toks[i - 1] && !STOP.has(w) ? 1 : 0), 0);

/**
 * Turn the parts into the result: { score, parts, strengths, improve, typed }.
 * `parts`: [{ key, label, value, good, tip }] — `good` is said when the part is strong, `tip` when it is weak.
 */
const finish = (parts, weights, { typed = false, notes = [] } = {}) => {
  let score = parts.reduce((s, p) => s + p.value * (weights[p.key] || 0), 0);
  score = clamp(score);
  if (typed) score = Math.min(score, TYPED_CAP);
  const strengths = parts.filter((p) => p.value >= 75).map((p) => p.good);
  const improve = [...notes, ...parts.filter((p) => p.value < 60).map((p) => p.tip)];
  if (!strengths.length) strengths.push(score >= PASS ? 'A solid all-round effort.' : 'You took it on — that is how the skill grows.');
  if (!improve.length) improve.push(score >= 90 ? 'Keep this standard and push the vocabulary further.' : 'Aim for more precise, less common words.');
  if (typed) improve.push(`Typed answers count up to ${TYPED_CAP} — speak it in Chrome or Edge for full marks.`);
  return { score, parts, strengths, improve, typed };
};

/* ───────────── Don't Say That!  explanation accuracy · forbidden-word avoidance · vocabulary ───────────── */
export const scoreTaboo = (item, text, { stage = 0, typed = false } = {}) => {
  const toks = words(text);
  const target = item.target.toLowerCase();
  const said = forbiddenSaid(text, [target, ...item.ban]);
  const minWords = [18, 22, 26, 30][stage];
  const meaning = clamp(((keysHit(toks, item.keys).length / 3) * 100) * 0.75 + Math.min(100, (toks.length / minWords) * 100) * 0.25);
  const avoidance = said.includes(target) ? 0 : clamp(100 - said.length * 40);
  const fl = fillersIn(text);
  const parts = [
    { key: 'meaning', label: 'Accuracy', value: meaning, good: 'Your clues pointed clearly at the word.', tip: `Give clues closer to the meaning — what “${item.target}” does, where it is found, how it feels — in at least ${minWords} words.` },
    { key: 'avoid', label: 'Avoidance', value: avoidance, good: 'Not a single forbidden word — well dodged!', tip: said.length ? `Forbidden word${said.length > 1 ? 's' : ''} used: ${said.map((w) => `“${w}”`).join(', ')}. Reach for a synonym or an example instead.` : 'Steer clear of the forbidden words.' },
    { key: 'vocab', label: 'Vocabulary', value: clamp(vocabOf(toks, stage) - fl * 4), good: 'A good range of precise words.', tip: 'Use more varied, precise words (and fewer fillers like “um”, “like”).' }
  ];
  return { ...finish(parts, { meaning: 0.4, avoid: 0.35, vocab: 0.25 }, { typed }), said };
};

/* ───────────── Caption Clash ───────────── */
const CLICHES = ['when you', 'me when', 'that moment when', 'be like', 'mood', 'goals', 'pov', 'nobody', 'me trying'];
export const scoreCaption = (item, text, { stage = 0 } = {}) => {
  const raw = String(text || '').trim();
  const toks = words(raw);
  const hits = keysHit(toks, item.keys).length;
  const relevance = toks.length ? (hits >= 2 ? 100 : hits === 1 ? 78 : 35) : 0;
  const content = toks.filter((w) => !STOP.has(w));
  // Creativity: the devices a good caption uses.
  const initials = content.map((w) => w[0]);
  const alliteration = initials.some((c, i) => i && c === initials[i - 1]);
  const ends = content.map((w) => w.slice(-3)).filter((e) => e.length === 3);
  const rhyme = ends.some((e, i) => ends.indexOf(e) !== i);
  const devices = [alliteration, rhyme, /[?!]/.test(raw), /\b(like|as if|as though|when|than)\b/i.test(raw), /["“”']/.test(raw), /\b(pun|plot twist|meanwhile|breaking news|exclusive|chapter)\b/i.test(raw)];
  const creativity = clamp(25 + devices.filter(Boolean).length * 25);
  // Originality: not just describing the picture, not a stock meme phrase.
  const descW = new Set(words(item.desc).filter((w) => !STOP.has(w)));
  const copied = content.length ? content.filter((w) => descW.has(w)).length / content.length : 0;
  const cliche = CLICHES.some((c) => ` ${toks.join(' ')} `.includes(` ${c} `));
  const originality = clamp(100 - copied * 90 - (cliche ? 25 : 0) - (toks.length < 3 ? 40 : 0));
  // Language: a caption-length line, capital letter, no stutters.
  const lenOk = toks.length >= 4 && toks.length <= 22 ? 100 : toks.length >= 2 ? 60 : 20;
  const language = clamp((lenOk + (/^[A-Z“"']/.test(raw) ? 100 : 70) + vocabOf(toks, stage)) / 3 - stutters(toks) * 10);
  const parts = [
    { key: 'relevance', label: 'Relevance', value: relevance, good: 'It clearly belongs to this picture.', tip: 'Tie the caption to what is actually in the picture.' },
    { key: 'creativity', label: 'Creativity', value: creativity, good: 'Clever — wordplay, rhythm or a twist.', tip: 'Try wordplay: alliteration, a rhyme, a comparison or a surprise ending.' },
    { key: 'originality', label: 'Originality', value: originality, good: 'Fresh — not just a description.', tip: 'Do not just describe the picture or use stock meme lines — add your own angle.' },
    { key: 'language', label: 'Language', value: language, good: 'Well-chosen words, neatly written.', tip: 'Keep it 4–20 words, start with a capital, choose sharper words.' }
  ];
  return finish(parts, { relevance: 0.3, creativity: 0.25, originality: 0.2, language: 0.25 });
};

/* ───────────── Talk for 60  fluency · vocabulary · relevance · continuity ───────────── */
export const scoreTalk = (item, text, { stage = 0, seconds = 60, spokeFor = 0, pauses = 0, typed = false } = {}) => {
  const toks = words(text);
  const topicWords = [...item.keys, ...words(item.topic).filter((w) => !STOP.has(w) && w.length > 3)];
  const relevance = clamp((keysHit(toks, [...new Set(topicWords)]).length / 4) * 100);
  const wpm = spokeFor > 3 ? (toks.length / spokeFor) * 60 : 0;
  const fl = fillersIn(text);
  // A natural pace (110–160 words a minute) scores best; faster is not better.
  const fluency = typed ? 70 : clamp(paceScore(wpm) - fl * 5);
  const minWords = Math.round(seconds * [1.3, 1.5, 1.7, 1.8][stage]);
  const kept = typed ? 1 : Math.min(1, spokeFor / Math.max(1, seconds * 0.9)); // spoke for (nearly) the whole time
  const continuity = clamp(Math.min(100, (toks.length / minWords) * 100) * 0.6 + kept * 40 - pauses * 12);
  const parts = [
    { key: 'fluency', label: 'Fluency', value: fluency, good: `A natural pace${wpm ? ` (${Math.round(wpm)} words a minute)` : ''} with few fillers.`, tip: fl >= 3 ? `${fl} filler words (um, like, basically…) — a short silent pause sounds more confident.` : 'Aim for a natural 110–160 words a minute.' },
    { key: 'vocab', label: 'Vocabulary', value: vocabOf(toks, stage), good: 'Varied, precise vocabulary.', tip: 'Swap everyday words for precise ones (good → valuable, beneficial).' },
    { key: 'relevance', label: 'Relevance', value: relevance, good: 'You stayed right on topic.', tip: 'Keep coming back to the topic — name it, give reasons and examples.' },
    { key: 'continuity', label: 'Continuity', value: continuity, good: 'You kept going for the whole time.', tip: pauses ? `${pauses} long pause${pauses > 1 ? 's' : ''} — keep talking: give an example while you think.` : `Fill the time — about ${minWords} words.` }
  ];
  return { ...finish(parts, { fluency: 0.25, vocab: 0.25, relevance: 0.25, continuity: 0.25 }, { typed }), wpm: Math.round(wpm) };
};

/* ───────────── Plot Twist ───────────── */
const LINKS = ['then', 'suddenly', 'because', 'but', 'so', 'when', 'after', 'finally', 'meanwhile', 'however', 'later', 'until', 'while', 'before', 'eventually', 'unfortunately', 'luckily', 'instead'];
export const twistsUsed = (twists, text) => { const toks = words(text); return twists.filter((t) => toks.some((w) => sameForm(w, t.word))); };
export const scorePlot = (opener, twists, text, { stage = 0, seconds = 60, typed = false } = {}) => {
  const toks = words(text);
  const used = twistsUsed(twists, text);
  const twistScore = clamp((used.length / Math.max(1, twists.length)) * 100);
  const openerWords = words(opener.line).filter((w) => !STOP.has(w) && w.length >= 4);
  const links = new Set(toks.filter((w) => LINKS.includes(w))).size;
  const minWords = Math.round(seconds * [1.1, 1.3, 1.5, 1.6][stage]);
  const length = Math.min(100, (toks.length / minWords) * 100);
  const continuity = clamp(((keysHit(toks, openerWords).length ? 45 : 15) + Math.min(55, links * 14)) * 0.7 + length * 0.3);
  const grammar = clamp(100 - stutters(toks) * 12 - fillersIn(text) * 6 - (toks.length < 15 ? 30 : 0));
  const missed = twists.filter((t) => !used.includes(t));
  const parts = [
    { key: 'twists', label: 'Required words', value: twistScore, good: 'Every twist woven into the story.', tip: `Work every twist in — you missed ${missed.map((t) => `“${t.word}”`).join(', ') || 'some'}.` },
    { key: 'continuity', label: 'Continuity', value: continuity, good: 'The story hangs together and follows from the opening.', tip: `Link events (“suddenly”, “because”, “meanwhile”), keep the opening’s characters, and tell about ${minWords} words.` },
    { key: 'creativity', label: 'Creativity', value: vocabOf(toks, stage), good: 'Vivid, varied language.', tip: 'Describe more — sights, sounds, feelings — with stronger words.' },
    { key: 'grammar', label: 'Grammar', value: grammar, good: 'Smooth, well-formed sentences.', tip: 'Fewer restarts and fillers; finish each sentence before the next.' }
  ];
  return { ...finish(parts, { twists: 0.35, continuity: 0.25, creativity: 0.2, grammar: 0.2 }, { typed }), used };
};

/* ───────────── Sell the Impossible ───────────── */
const PERSUADE = ['imagine', 'guarantee', 'guaranteed', 'only', 'today', 'now', 'free', 'save', 'best', 'never', 'exclusive', 'limited', 'offer', 'deal', 'love', 'perfect', 'problem', 'solution', 'because', 'benefit', 'proven', 'trust', 'worth', 'deserve', 'upgrade', 'unique', 'amazing', 'incredible', 'discount', 'bonus', 'forever', 'instantly', 'finally', 'every'];
const CALL = ['buy', 'order', 'grab', 'get', 'try', 'join', 'call', 'sign', 'pick', 'take', 'book'];
const IMAGINE = /\b(imagine|picture this|what if|just think|like a|as if|as though|never again|the world'?s first|revolution|dream)\b/i;
export const scoreSell = (item, text, { stage = 0, seconds = 45, spokeFor = 0, pauses = 0, typed = false } = {}) => {
  const toks = words(text);
  const p = new Set(toks.filter((w) => PERSUADE.includes(w))).size;
  const you = toks.filter((w) => w === 'you' || w === 'your' || w === 'yours').length;
  const call = toks.some((w) => CALL.includes(w));
  const question = /\?/.test(text) || /\b(have you ever|are you|do you|did you|would you|can you)\b/i.test(text);
  const persuasion = clamp(Math.min(50, p * 10) + Math.min(20, you * 5) + (call ? 18 : 0) + (question ? 12 : 0));
  // Creativity: selling this product's oddity (its own words) with imagination.
  const focus = Math.min(100, (keysHit(toks, [...item.keys, ...words(item.name).filter((w) => !STOP.has(w) && w.length > 3)]).length / 3) * 100);
  const creativity = clamp(focus * 0.6 + (IMAGINE.test(text) ? 25 : 0) + (/!/.test(text) ? 5 : 0) + Math.min(10, (new Set(toks).size / Math.max(1, toks.length)) * 12));
  const wpm = spokeFor > 3 ? (toks.length / spokeFor) * 60 : 0;
  const minWords = Math.round(seconds * [1.3, 1.5, 1.7, 1.8][stage]);
  const delivery = typed ? 70 : clamp(paceScore(wpm) - pauses * 10 - fillersIn(text) * 6);
  const clarity = clamp((delivery + Math.min(100, (toks.length / minWords) * 100)) / 2);
  const parts = [
    { key: 'persuasion', label: 'Persuasion', value: persuasion, good: 'Convincing — you spoke to the customer and asked for the sale.', tip: `Speak to the customer (“you”), name a benefit, and close with a call to action${call ? '' : ' (“grab yours today”)'}.` },
    { key: 'creativity', label: 'Creativity', value: creativity, good: 'You turned the product’s flaw into a selling point.', tip: 'Sell what makes this product odd — “Imagine…”, a bold comparison, a surprising use.' },
    { key: 'vocab', label: 'Vocabulary', value: vocabOf(toks, stage), good: 'Rich, persuasive vocabulary.', tip: 'Use stronger sales words: exclusive, effortless, revolutionary.' },
    { key: 'clarity', label: 'Clarity', value: clarity, good: 'Clear, confident delivery.', tip: `Keep the pitch flowing for the full time (about ${minWords} words), without fillers.` }
  ];
  return { ...finish(parts, { persuasion: 0.3, creativity: 0.25, vocab: 0.2, clarity: 0.25 }, { typed }), wpm: Math.round(wpm) };
};

/* ───────────── Tongue Twister — five times in one go, two chances (2026-11-20, the user) ───────────── */
export const TWISTER_REPS = 5;
/**
 * How many times in a row the twister was said in one recording: the transcript is matched against the twister
 * written out five times; repetition r counts when at least `acc` of its words were heard, and counting stops at the
 * first one that was not. { reps, accuracy, missed (words of the first failed repetition) }.
 */
/** Speech engines split compound words ("sea shells" for "seashells"): join neighbours that make a twister word. */
const joinSplit = (text, spoken) => {
  const want = new Set(words(text)); const t = words(spoken); const out = [];
  for (let i = 0; i < t.length; i += 1) {
    if (i + 1 < t.length && !want.has(t[i]) && want.has(t[i] + t[i + 1])) { out.push(t[i] + t[i + 1]); i += 1; } else out.push(t[i]);
  }
  return out.join(' ');
};
export const twisterReps = (text, spoken, acc = 0.85) => {
  const k = words(text).length;
  const target = Array(TWISTER_REPS).fill(text).join(' ');
  const hit = alignWords(target, joinSplit(text, spoken));
  let reps = 0; let missed = [];
  for (let r = 0; r < TWISTER_REPS; r += 1) {
    const seg = hit.slice(r * k, (r + 1) * k);
    if (seg.filter(Boolean).length / k >= acc - 1e-9) reps += 1;
    else { missed = words(text).filter((_, i) => !seg[i]); break; }
  }
  return { reps, accuracy: hit.length ? hit.filter(Boolean).length / hit.length : 0, missed };
};
/** One recording: { ok (five in a row within the time), reps, accuracy, missed, slow }. */
export const checkTwister = (text, spoken, acc = 0.85, seconds = 0, limit = Infinity) => {
  const r = twisterReps(text, spoken, acc);
  return { ...r, ok: r.reps >= TWISTER_REPS && seconds <= limit, slow: seconds > limit };
};
/** The challenge's score: five in a row on the first try 100, on the second 80; otherwise 10 a repetition. */
export const scoreTwister = ({ done, attempts, best, accuracySum = 0 }) => {
  const avgAcc = attempts ? Math.round((accuracySum / attempts) * 100) : 0;
  const score = done ? (attempts <= 1 ? 100 : 80) : clamp(best * 10);
  const strengths = done ? [attempts <= 1 ? 'Five in one go — first try!' : 'Five in one go on your second try.'] : [best ? `${best} in a row.` : 'Good try.'];
  const improve = done ? ['Try it a little faster next time.'] : ['Go slower and say every word clearly.'];
  return { score, parts: [{ key: 'acc', label: 'Words heard', value: avgAcc }, { key: 'runs', label: 'In a row', value: clamp((best / TWISTER_REPS) * 100) }], strengths, improve, typed: false, done };
};

/* ───────────── One entry point, used by the game and by the server ───────────── */
export const MAX_TWISTER_ATTEMPTS = 2; // two chances
/** Re-run a twister from its recordings [{ spoken, secs }] (at most two): done when one has five in a row. */
export const replayTwister = (ch, attempts = []) => {
  let best = 0; let accSum = 0; let n = 0; let done = false;
  for (const a of attempts.slice(0, MAX_TWISTER_ATTEMPTS)) {
    const r = checkTwister(ch.item.text, String(a?.spoken || ''), ch.acc, Number(a?.secs) || 0, ch.seconds + 1);
    n += 1; accSum += r.accuracy; best = Math.max(best, r.reps);
    if (r.ok) { done = true; break; }
  }
  return scoreTwister({ done, attempts: n, best, accuracySum: accSum });
};
/**
 * Score one challenge from what the student said or wrote. `p`: { text, typed, spokeFor, pauses } — or, for the
 * twister, { attempts: [{ spoken, secs }], unsupported }.
 */
export const scoreChallenge = (ch, p = {}) => {
  const o = { stage: ch.stage, seconds: ch.seconds, spokeFor: Number(p.spokeFor) || 0, pauses: Number(p.pauses) || 0, typed: !!p.typed };
  switch (ch.kind) {
    case 'dont-say': return scoreTaboo(ch.item, p.text, o);
    case 'caption': return scoreCaption(ch.item, p.text, o);
    case 'talk60': return scoreTalk(ch.item, p.text, o);
    case 'plot': return scorePlot(ch.item, ch.twists, p.text, o);
    case 'sell': return scoreSell(ch.item, p.text, o);
    default: return p.unsupported ? { ...scoreTwister({ done: false, attempts: 0, best: 0, needed: ch.needed }), unsupported: true } : replayTwister(ch, p.attempts);
  }
};
/** Did a challenge pass? The twister only with its five in a row. */
export const passedChallenge = (kind, r) => !!r && r.score >= PASS && (kind !== 'twister' || !!r.done);
/**
 * A level's outcome: complete once all three are done; cleared only with the twister's five in a row; one star per
 * challenge passed (as in the other games).
 */
export const levelOutcome = (challenges, results) => {
  const rs = challenges.map((_, i) => results?.[i] || null);
  const complete = rs.every(Boolean);
  const tw = challenges.findIndex((c) => c.kind === 'twister');
  const twisterDone = tw >= 0 && !!rs[tw]?.done;
  const passed = challenges.filter((c, i) => passedChallenge(c.kind, rs[i])).length;
  const total = rs.reduce((s, r) => s + (r?.score || 0), 0);
  const stars = complete && twisterDone ? passed : 0;
  return { complete, twisterDone, passed, total, average: Math.round(total / challenges.length), stars, cleared: stars > 0 };
};
