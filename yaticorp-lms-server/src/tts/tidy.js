/**
 * A clip that ends when its text ends (2026-11-19, the owner: "after a word it feels odd, like 'aah' … in the last
 * presentation everyone laughed").
 *
 * The voice model is given a length of time to speak in, and when the words are over before the time is, it
 * sometimes fills what is left with a sound of its own — a second go at the word, or a stray "aah" — after a
 * silence. The service already keeps only the first burst of a single letter (yaticorp-lms-tts/app.py first_burst);
 * nothing did the same for a word or a sentence, and nothing at all for the clips made before that.
 *
 * So every clip is tidied here, on the server, before it is kept or served (store.js) — whichever version of the
 * service made it, and the ones already on disk too: the speech is found by its loudness, and whatever comes after
 * the text has been said, past a long silence, is cut off. The text says how many long pauses to expect (one for
 * each comma or full stop inside it), so a pause that belongs is never taken for the end. Quiet before the first
 * sound is taken off as well, so a tap is answered at once.
 *
 * Careful by design: it only ever shortens, never cuts inside a burst of speech, and leaves a clip alone when it is
 * not sure — when too little has been said for the text by the time a silence comes.
 */

/** 16-bit PCM WAV → { rate, channels, data (Int16Array, interleaved), head (Buffer up to the samples) }, or null. */
const readWav = (buf) => {
    if (!Buffer.isBuffer(buf) || buf.length < 44 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') return null;
    let at = 12, fmt = null;
    while (at + 8 <= buf.length) {
        const id = buf.toString('latin1', at, at + 4);
        const size = buf.readUInt32LE(at + 4);
        const body = at + 8;
        if (id === 'fmt ') fmt = { format: buf.readUInt16LE(body), channels: buf.readUInt16LE(body + 2), rate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
        if (id === 'data') {
            if (!fmt || fmt.format !== 1 || fmt.bits !== 16 || !fmt.channels) return null;
            const bytes = Math.min(size, buf.length - body) & ~1;
            const data = new Int16Array(bytes / 2);
            for (let i = 0; i < data.length; i += 1) data[i] = buf.readInt16LE(body + i * 2);
            return { rate: fmt.rate, channels: fmt.channels, data };
        }
        at = body + size + (size % 2);
    }
    return null;
};
const writeWav = ({ rate, channels, data }) => {
    const out = Buffer.alloc(44 + data.length * 2);
    out.write('RIFF', 0, 'latin1'); out.writeUInt32LE(36 + data.length * 2, 4); out.write('WAVE', 8, 'latin1');
    out.write('fmt ', 12, 'latin1'); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(channels, 22);
    out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * channels * 2, 28); out.writeUInt16LE(channels * 2, 32); out.writeUInt16LE(16, 34);
    out.write('data', 36, 'latin1'); out.writeUInt32LE(data.length * 2, 40);
    for (let i = 0; i < data.length; i += 1) out.writeInt16LE(data[i], 44 + i * 2);
    return out;
};

const FRAME = 0.02;                       // seconds of sound looked at together
// A mark the voice pauses at. One at the very end is the end, not a pause.
const PAUSE = /[,;:!?.…।॥،،—–\n]+/gu;
const lettersOf = (text) => [...String(text)].filter((c) => /[\p{L}\p{M}\p{N}]/u.test(c)).length;

/**
 * Where the speech of `text` ends in this sound: { from, to } in seconds, and `cut` when something after the text
 * was left out. null when the clip is silent.
 */
const speechSpan = (wav, text) => {
    const { rate, channels, data } = wav;
    const hop = Math.max(1, Math.round(rate * FRAME));
    const frames = Math.floor(data.length / channels / hop);
    if (frames < 3) return null;
    const loud = new Float64Array(frames);
    let top = 0;
    for (let f = 0; f < frames; f += 1) {
        let sum = 0;
        for (let i = f * hop * channels, end = (f + 1) * hop * channels; i < end; i += 1) sum += data[i] * data[i];
        loud[f] = Math.sqrt(sum / (hop * channels));
        if (loud[f] > top) top = loud[f];
    }
    if (top <= 0) return null;
    const on = (f) => loud[f] > top * 0.07;

    const t = String(text || '').trim();
    const letters = lettersOf(t);
    const single = [...t].length <= 3;                       // a letter, as the voice service counts it
    const words = t.split(/\s+/).filter(Boolean).length;
    // A silence this long is the end of something: of the letter, the word, or a phrase.
    const gap = Math.round((single ? 0.12 : words <= 1 ? 0.30 : 0.45) / FRAME);
    // The pauses the text itself asks for: each lets one more stretch of speech through.
    const inner = t.replace(PAUSE, (m, at) => (at + m.length >= t.length ? '' : '\u0001'));
    const stretches = single ? 1 : (inner.match(/\u0001/g) || []).length + 1;
    // By the time the text can have been said (the fastest it is ever spoken), a long silence is its end.
    const enough = single ? 0.06 : Math.max(0.15, 0.05 * letters);

    // The stretches of speech, parted by long silences. A click (under 60 ms) is not speech.
    const parts = [];
    for (let f = 0; f < frames;) {
        if (!on(f)) { f += 1; continue; }
        let end = f, quiet = 0, spoken = 0, g = f;
        for (; g < frames; g += 1) {
            if (on(g)) { end = g; quiet = 0; spoken += 1; } else { quiet += 1; if (quiet >= gap) break; }
        }
        if (spoken * FRAME >= 0.06) parts.push({ start: f, end, spoken: spoken * FRAME });
        f = g + 1;
    }
    if (!parts.length) return null;

    let said = 0, last = parts.length - 1;
    for (let i = 0; i < parts.length; i += 1) {
        said += parts[i].spoken;
        if (i + 1 >= stretches && said >= enough) { last = i; break; }
    }
    return { from: parts[0].start * FRAME, to: (parts[last].end + 1) * FRAME, cut: last < parts.length - 1, total: frames * FRAME };
};

/**
 * The clip, ending where its text ends. Returns the same buffer when there is nothing to take off (or it is not a
 * sound this reads); otherwise a new WAV.
 */
const tidy = (buf, text) => {
    const wav = readWav(buf);
    if (!wav) return buf;
    const span = speechSpan(wav, text);
    if (!span) return buf;
    const { rate, channels, data } = wav;
    // A little room either side: 40 ms before the first sound, 120 ms after the last, so nothing is clipped.
    const from = Math.max(0, Math.floor((span.from - 0.04) * rate));
    const to = Math.min(data.length / channels, Math.ceil((span.to + 0.12) * rate));
    if (!span.cut && from < 0.08 * rate && data.length / channels - to < 0.25 * rate) return buf;
    const out = data.slice(from * channels, to * channels);
    // Eased in and out, so the cut is not heard as a click.
    const fadeIn = Math.min(Math.round(0.005 * rate), Math.floor(out.length / channels / 2));
    const fadeOut = Math.min(Math.round(0.04 * rate), Math.floor(out.length / channels / 2));
    for (let i = 0; i < fadeIn; i += 1) for (let c = 0; c < channels; c += 1) out[i * channels + c] = Math.round(out[i * channels + c] * (i / fadeIn));
    const n = out.length / channels;
    for (let i = 0; i < fadeOut; i += 1) for (let c = 0; c < channels; c += 1) out[(n - 1 - i) * channels + c] = Math.round(out[(n - 1 - i) * channels + c] * (i / fadeOut));
    return writeWav({ rate, channels, data: out });
};

module.exports = { tidy, speechSpan, readWav };
