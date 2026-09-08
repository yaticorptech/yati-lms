/**
 * Delivery feedback — what can honestly be measured from a spoken answer in
 * a browser: how long it took, how many words, the pace that implies, long
 * silences between recognised phrases, filler words, hedging phrases, and
 * answer length. Nothing here claims to read emotion or personality; every
 * note says what was counted.
 *
 * Per-turn metrics arrive from the client (its speech recogniser is the only
 * thing that saw the timing); the counts that can be redone from the text
 * are recomputed here so a client cannot inflate them.
 */
const FILLERS = /\b(um+|uh+|uhm+|hmm+|erm*|ah+|like|actually|basically|literally|you know|kind of|sort of|i mean|right\?)\b/gi;
const HEDGES = /\b(i think|i guess|maybe|probably|not sure|i'm not sure|i don't know|perhaps|something like that)\b/gi;
const RESULT_WORDS = /\b(result|outcome|achieved|learned|learnt|improved|delivered|reduced|increased|impact|finally|in the end)\b/i;
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const count = (t, re) => { const m = String(t || '').match(re); return m ? m.length : 0; };
const top = (t, re, n = 2) => { const tally = {}; for (const m of String(t || '').toLowerCase().match(re) || []) tally[m] = (tally[m] || 0) + 1; return Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w); };
const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };

/** The metrics kept for one turn: the client's timings, the text's counts. */
const turnMetrics = (answer, voice) => {
    const v = voice && typeof voice === 'object' ? voice : {};
    const durationMs = num(v.durationMs, 0, 30 * 60_000);
    const wordCount = words(answer);
    const wpm = durationMs && durationMs > 3000 ? Math.round(wordCount / (durationMs / 60_000)) : null;
    return {
        durationMs: durationMs || 0, wordCount,
        wpm: wpm && wpm > 0 && wpm < 400 ? wpm : null,
        longPauses: num(v.longPauses, 0, 50) || 0, pauseMs: num(v.pauseMs, 0, 30 * 60_000) || 0,
        fillerCount: count(answer, FILLERS), fillers: top(answer, FILLERS, 3), hedgeCount: count(answer, HEDGES)
    };
};

/** The report's delivery section, from every answered turn. */
const summarize = (session) => {
    const answered = session.turns.filter((t) => t.answer);
    if (!answered.length) return null;
    const spoken = answered.filter((t) => t.inputMode === 'voice' && t.voice?.wpm);
    const all = answered.map((t) => t.voice?.wordCount ? t.voice : turnMetrics(t.answer, null));
    const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const avgWords = Math.round(avg(all.map((m) => m.wordCount)));
    const wpm = spoken.length ? Math.round(avg(spoken.map((t) => t.voice.wpm))) : null;
    const fillers = all.reduce((a, m) => a + (m.fillerCount || 0), 0);
    const fillerWords = top(answered.map((t) => t.answer).join(' '), FILLERS, 2);
    const hedges = all.reduce((a, m) => a + (m.hedgeCount || 0), 0);
    const pauses = spoken.reduce((a, t) => a + (t.voice.longPauses || 0), 0);
    const behavioral = answered.filter((t) => ['behavioral', 'situational'].includes(t.stage));
    const unstructured = behavioral.filter((t) => words(t.answer) >= 40 && !RESULT_WORDS.test(t.answer)).length;
    const notes = [];
    if (fillers >= 3) notes.push({ kind: 'fillers', tone: 'warn', text: `You used several filler words${fillerWords.length ? ` such as ${fillerWords.map((w) => `'${w}'`).join(' and ')}` : ''} — ${fillers} in total. A short pause sounds better than a filler.` });
    else if (spoken.length) notes.push({ kind: 'fillers', tone: 'good', text: 'Very few filler words — your answers sounded clean.' });
    if (wpm) {
        if (wpm < 100) notes.push({ kind: 'pace', tone: 'warn', text: `You spoke slowly, around ${wpm} words a minute. A little more pace will sound more confident.` });
        else if (wpm > 175) notes.push({ kind: 'pace', tone: 'warn', text: `You spoke quickly, around ${wpm} words a minute. Slow down slightly so each point lands.` });
        else notes.push({ kind: 'pace', tone: 'good', text: `Your speaking pace, around ${wpm} words a minute, was comfortable to follow.` });
    }
    if (pauses >= 3) notes.push({ kind: 'pauses', tone: 'warn', text: `There were ${pauses} long pauses while you were answering. Pausing is fine — say "let me think about that for a second" so the interviewer knows you are thinking.` });
    if (avgWords && avgWords < 35) notes.push({ kind: 'length', tone: 'warn', text: `Your answers were short, about ${avgWords} words on average. Aim for 60 to 120 words with one concrete example.` });
    else if (avgWords > 220) notes.push({ kind: 'length', tone: 'warn', text: `Your answers ran long, about ${avgWords} words on average. Your answer was clear but could be more concise — lead with the point, then one example.` });
    else if (avgWords) notes.push({ kind: 'length', tone: 'good', text: `Your answers were a good length, about ${avgWords} words on average.` });
    if (hedges >= 3) notes.push({ kind: 'hedging', tone: 'warn', text: `Hedging phrases like "I think" and "maybe" appeared ${hedges} times. State what you did and know plainly; it reads as more confident.` });
    if (unstructured) notes.push({ kind: 'structure', tone: 'warn', text: 'Try a structured approach when answering behavioural questions: the situation, what you did, and the result.' });
    if (!spoken.length) notes.push({ kind: 'voice', tone: 'info', text: 'These answers were typed, so pace and pauses could not be measured. Speak your answers next time for delivery feedback.' });
    return { notes, wpm, avgWords, fillerCount: fillers, hedgeCount: hedges, longPauses: pauses, voiceAnswers: spoken.length, answers: answered.length };
};

/** One line the AI evaluator can read, so its communication score reflects delivery too. */
const describe = (summary) => {
    if (!summary) return '';
    const bits = [];
    if (summary.voiceAnswers) bits.push(`${summary.voiceAnswers} of ${summary.answers} answers were spoken aloud`); else bits.push('answers were typed');
    if (summary.wpm) bits.push(`average pace ${summary.wpm} words/min`);
    bits.push(`average length ${summary.avgWords} words`, `${summary.fillerCount} filler words`, `${summary.hedgeCount} hedging phrases`);
    if (summary.longPauses) bits.push(`${summary.longPauses} long pauses`);
    return bits.join(', ') + '.';
};

module.exports = { turnMetrics, summarize, describe };
