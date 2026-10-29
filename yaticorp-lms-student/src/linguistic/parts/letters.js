/**
 * Letter keys for the student's own language, for a device without its
 * keyboard (asked 2026-10-23, more languages the same day): the letters of each language in rows, and for
 * Korean the joining of letters into syllables as they are tapped (ㄱ + ㅏ =
 * 가, 가 + ㄴ = 간, 간 + ㅏ = 가나), which a Korean keyboard does. Kannada keeps
 * its own keys (KannadaKeys.jsx). All of it is worked out on the device.
 */

/*
 * The scripts of India share one layout in Unicode (from the old ISCII
 * standard): vowels at +05–14, consonants at +15–39, vowel signs at +3E–4C,
 * the virama at +4D, from each script's first code point. So their keys are
 * read from there, leaving out what a script does not have and the rare
 * letters a learner never types, with each script's own extras added.
 */
const ASSIGNED = /\p{Assigned}/u;
const range = (base, from, to, skip = []) => Array.from({ length: to - from + 1 }, (_, k) => from + k)
    .filter((o) => !skip.includes(o)).map((o) => String.fromCharCode(base + o)).filter((c) => ASSIGNED.test(c) && /\p{L}|\p{M}/u.test(c));
const indic = (base, { skip = [], extras = [], marks = [] } = {}) => [
    { label: 'Vowels', keys: range(base, 0x05, 0x14, [0x0c, ...skip]) },
    { label: 'Signs', sign: true, keys: [...range(base, 0x3e, 0x4d, [0x44, ...skip]), ...range(base, 0x01, 0x03, skip), ...range(base, 0x3c, 0x3c, skip)] },
    { label: 'Consonants', keys: range(base, 0x15, 0x39, skip) },
    ...(extras.length || marks.length ? [{ label: 'More', keys: [...extras, ...marks] }] : [])
];

const hiragana = ['あいうえお', 'かきくけこ', 'がぎぐげご', 'さしすせそ', 'ざじずぜぞ', 'たちつてと', 'だぢづでど', 'なにぬねの', 'はひふへほ', 'ばびぶべぼ', 'ぱぴぷぺぽ', 'まみむめも', 'やゆよ', 'らりるれろ', 'わをん', 'ぁぃぅぇぉゃゅょっ'];
const toKatakana = (s) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
// Each kana's sound in English letters, shown under its key (2026-10-29: "add the English under the Japanese").
const ROMAJI = ['a i u e o', 'ka ki ku ke ko', 'ga gi gu ge go', 'sa shi su se so', 'za ji zu ze zo', 'ta chi tsu te to', 'da ji zu de do',
    'na ni nu ne no', 'ha hi fu he ho', 'ba bi bu be bo', 'pa pi pu pe po', 'ma mi mu me mo', 'ya yu yo', 'ra ri ru re ro', 'wa wo n', 'a i u e o ya yu yo tsu'];
const KANA_SAY = Object.fromEntries(hiragana.flatMap((r, i) => [...r].flatMap((k, j) => { const say = ROMAJI[i].split(' ')[j]; return [[k, say], [toKatakana(k), say]]; })));
KANA_SAY['ー'] = 'long';
/** How a key's letter sounds, in English letters (Japanese kana), or null. */
export const keySay = (code, k) => (code === 'ja' ? KANA_SAY[k] || null : null);

/**
 * The kana as their chart (2026-10-29, "show the keyboard correctly"): a column for each consonant — a, ka, sa, ta,
 * na, ha, ma, ya, ra, wa, n — its five vowels down it ('' where the chart has none). The voiced, half-voiced and
 * small kana come from the ゛ ゜ 小 keys, as a Japanese phone keyboard has them (`modifyKana`).
 */
export const KANA_CHART = ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの', 'はひふへほ', 'まみむめも', ['や', '', 'ゆ', '', 'よ'], 'らりるれろ', ['わ', '', '', '', 'を'], ['ん', '', '', '', '']]
    .map((col) => [...col]);
export const katakanaOf = (k) => (k ? toKatakana(k) : k);
const cp = (c) => c.codePointAt(0);
const at = (n) => String.fromCodePoint(n);
// Hiragana and katakana sit 0x60 apart, in the same order: the rules are the hiragana's, shifted.
const base = (c) => (cp(c) >= 0x30a1 && cp(c) <= 0x30f6 ? { h: at(cp(c) - 0x60), kata: true } : { h: c, kata: false });
const VOICE = [...'かきくけこさしすせそたちつてとはひふへほ'], VOICED = VOICE.map((c) => at(cp(c) + 1));
const HALF = [...'はひふへほ'], HALFED = HALF.map((c) => at(cp(c) + 2));
const SMALL = [...'あいうえおつやゆよわ'], SMALLED = SMALL.map((c) => at(cp(c) - 1));
/** The kana before the cursor with ゛ (voiced), ゜ (half-voiced) or 小 (small) — tapped again, back as it was. */
export const modifyKana = (c, mark) => {
    if (!c) return c;
    const { h, kata } = base(c);
    let out = h;
    if (mark === '゛') out = VOICE.includes(h) ? at(cp(h) + 1) : VOICED.includes(h) ? at(cp(h) - 1) : HALFED.includes(h) ? at(cp(h) - 1) : h === 'う' ? 'ゔ' : h === 'ゔ' ? 'う' : h;
    if (mark === '゜') out = HALF.includes(h) ? at(cp(h) + 2) : HALFED.includes(h) ? at(cp(h) - 2) : VOICED.includes(h) && HALF.includes(at(cp(h) - 1)) ? at(cp(h) + 1) : h;
    if (mark === '小') out = SMALL.includes(h) ? at(cp(h) - 1) : SMALLED.includes(h) ? at(cp(h) + 1) : h;
    return kata && out !== h ? toKatakana(out) : kata ? c : out;
};

/** Each language's keys: groups of letters, with a label; `sign` marks vowel signs, shown on a dotted circle. */
export const LAYOUTS = {
    hi: [
        { label: 'Vowels', keys: [...'अआइईउऊऋएऐओऔ'] },
        { label: 'Signs', sign: true, keys: ['ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ं', 'ँ', 'ः', '्', '़'] },
        { label: 'Consonants', keys: [...'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह'] },
        { label: 'More', keys: ['क्ष', 'त्र', 'ज्ञ', 'श्र', 'ड़', 'ढ़', 'ज़', 'फ़', '।'] }
    ],
    ja: [
        { label: 'Hiragana', keys: hiragana.flatMap((r) => [...r]) },
        { label: 'Katakana', keys: hiragana.flatMap((r) => [...toKatakana(r)]) },
        { label: 'Marks', keys: ['ー', '、', '。', '？', '！'] }
    ],
    // Marathi in Devanagari: ऍ and ऑ for English sounds, ळ; without the letters only other languages use.
    mr: indic(0x0900, { skip: [0x0e, 0x12, 0x29, 0x31, 0x34, 0x46, 0x4a, 0x3c], extras: ['क्ष', 'ज्ञ', 'श्र'] }),
    ta: indic(0x0b80, { skip: [0x02, 0x03], extras: ['ஃ', 'க்ஷ', 'ஶ்ரீ'] }),
    te: indic(0x0c00, { skip: [0x31, 0x34, 0x3c] }),
    ml: indic(0x0d00, { skip: [0x29, 0x3a, 0x3c], extras: ['ൺ', 'ൻ', 'ർ', 'ൽ', 'ൾ'] }),
    bn: indic(0x0980, { extras: ['ৎ', 'ড়', 'ঢ়', 'য়'], marks: ['।'] }),
    gu: indic(0x0a80, { extras: ['ક્ષ', 'જ્ઞ'] }),
    pa: indic(0x0a00, { extras: ['ੰ', 'ੱ', 'ੜ', 'ਖ਼', 'ਗ਼', 'ਜ਼', 'ਫ਼'], marks: ['।'] }),
    or: indic(0x0b00, { skip: [0x35], extras: ['ୟ', 'ୱ', 'ଡ଼', 'ଢ଼', 'କ୍ଷ'], marks: ['।'] }),
    ur: [
        { label: 'Letters', keys: [...'اآبپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوہھءیے'] },
        { label: 'Marks', keys: ['،', '؟', '۔'] }
    ],
    ar: [
        { label: 'Letters', keys: [...'اأإآبتثجحخدذرزسشصضطظعغفقكلمنهويىةءؤئ'] },
        { label: 'Marks', keys: ['،', '؟'] }
    ],
    ru: [{ label: 'Letters', keys: [...'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'] }],
    de: [{ label: 'Letters', keys: [...'äöüßÄÖÜ'] }, { label: 'Marks', keys: ['„', '“'] }],
    es: [{ label: 'Accents', keys: [...'áéíóúñüÁÉÑ'] }, { label: 'Marks', keys: ['¿', '¡'] }],
    pt: [{ label: 'Accents', keys: [...'áâãàçéêíóôõúÁÉÇ'] }],
    fr: [
        { label: 'Accents', keys: [...'éèêëàâçîïôûùüœæÿ'] },
        { label: 'Capitals', keys: [...'ÉÈÀÇÊÔ'] },
        { label: 'Marks', keys: ['’', '«', '»'] }
    ],
    ko: [
        { label: 'Consonants', keys: [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'] },
        { label: 'Vowels', keys: [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'] }
    ]
};

/** Whether a language has letter keys (Chinese has thousands of characters: its word tiles, or the device's keyboard, instead). */
export const hasLetters = (code) => code === 'kn' || !!LAYOUTS[code];

/* ── Korean: letters into syllables ──────────────────────────────────── */

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const VOWEL_PAIRS = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
const FINAL_PAIRS = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
const split = (pairs) => Object.fromEntries(Object.entries(pairs).map(([k, v]) => [v, [...k]]));
const SPLIT_VOWEL = split(VOWEL_PAIRS);
const SPLIT_FINAL = split(FINAL_PAIRS);
const BASE = 0xac00;

const syllable = (l, v, t = 0) => String.fromCharCode(BASE + (l * 21 + v) * 28 + t);
const parts = (ch) => {
    const c = (ch || '').charCodeAt(0) - BASE;
    return ch && c >= 0 && c <= 11171 ? { l: Math.floor(c / 588), v: Math.floor((c % 588) / 28), t: c % 28 } : null;
};
export const isJamo = (k) => CHO.includes(k) || JUNG.includes(k);

/** What the letter before the cursor becomes when jamo `j` is typed after it (it may become two letters). */
export const joinJamo = (prev, j) => {
    const s = parts(prev);
    if (JUNG.includes(j)) {
        if (prev && CHO.includes(prev)) return syllable(CHO.indexOf(prev), JUNG.indexOf(j));            // ㄱ + ㅏ = 가
        if (s?.t) {                                                                                       // 각 + ㅏ = 가가
            const fin = JONG[s.t];
            const two = SPLIT_FINAL[fin];
            if (two) return syllable(s.l, s.v, JONG.indexOf(two[0])) + syllable(CHO.indexOf(two[1]), JUNG.indexOf(j));
            return syllable(s.l, s.v) + syllable(CHO.indexOf(fin), JUNG.indexOf(j));
        }
        if (s) { const pair = VOWEL_PAIRS[JUNG[s.v] + j]; if (pair) return syllable(s.l, JUNG.indexOf(pair)); }   // 고 + ㅏ = 과
        if (VOWEL_PAIRS[prev + j]) return VOWEL_PAIRS[prev + j];
        return prev + j;
    }
    if (s && !s.t && JONG.includes(j)) return syllable(s.l, s.v, JONG.indexOf(j));                       // 가 + ㄱ = 각
    if (s?.t && FINAL_PAIRS[JONG[s.t] + j]) return syllable(s.l, s.v, JONG.indexOf(FINAL_PAIRS[JONG[s.t] + j]));   // 갈 + ㄱ = 갉
    return prev + j;
};

/** The letter before the cursor with its last jamo taken off (간 → 가 → ㄱ → nothing). */
export const dropJamo = (prev) => {
    const s = parts(prev);
    if (!s) return SPLIT_VOWEL[prev] ? SPLIT_VOWEL[prev][0] : '';
    if (s.t) { const two = SPLIT_FINAL[JONG[s.t]]; return two ? syllable(s.l, s.v, JONG.indexOf(two[0])) : syllable(s.l, s.v); }
    const sv = SPLIT_VOWEL[JUNG[s.v]];
    return sv ? syllable(s.l, JUNG.indexOf(sv[0])) : CHO[s.l];
};

/** Type `key` at the cursor of `value`: { value, cursor }. Korean letters join the one before them. */
export const typeAt = (value, start, end, key, code) => {
    const before = value.slice(0, start), after = value.slice(end);
    if (code === 'ko' && isJamo(key) && start === end && before) {
        const rep = joinJamo(before.slice(-1), key);
        const head = before.slice(0, -1) + rep;
        return { value: head + after, cursor: head.length };
    }
    return { value: before + key + after, cursor: before.length + key.length };
};

/** Delete before the cursor: one letter, or for Korean one jamo of the syllable. */
export const deleteAt = (value, start, end, code) => {
    if (start !== end) return { value: value.slice(0, start) + value.slice(end), cursor: start };
    if (!start) return { value, cursor: 0 };
    const prev = value.slice(start - 1, start);
    const rep = code === 'ko' && (parts(prev) || SPLIT_VOWEL[prev]) ? dropJamo(prev) : '';
    const head = value.slice(0, start - 1) + rep;
    return { value: head + value.slice(start), cursor: head.length };
};
