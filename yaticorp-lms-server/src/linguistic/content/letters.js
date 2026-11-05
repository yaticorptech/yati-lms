/**
 * The letters of every course's language, for Beginner's first unit (asked 2026-10-31: "from the basics, like the
 * varnamala of every language, like ABCD in English: teach the one who starts from scratch"). Each course's
 * letters in a few groups — a lesson each — every letter with its sound in English letters (and in English, an
 * example word). The scripts of India share one layout in Unicode (vowels at +05–14, consonants at +15–39, vowel
 * signs at +3E–4C from each script's first code point), so theirs are read from there, with the sounds by place.
 *
 * Written here, with no outside service: a native speaker should check them.
 */
// `speak`: what the device's voice is given to say the letter right, where the letter alone is read otherwise (2026-10-31).
const L = (char, say, example = '', speak = '') => ({ char, say, ...(example ? { example } : {}), ...(speak ? { speak } : {}) });
const pairsOf = (text) => text.trim().split(/\s+/).map((p) => { const [char, ...say] = p.split(':'); return L(char, say.join(':').replace(/_/g, ' ')); });

/* ── The scripts of India ─────────────────────────────────────────────── */

const VOWEL_SAY = { 0x05: 'a', 0x06: 'aa', 0x07: 'i', 0x08: 'ii', 0x09: 'u', 0x0a: 'uu', 0x0b: 'ru', 0x0e: 'e', 0x0f: 'ee', 0x10: 'ai', 0x12: 'o', 0x13: 'oo', 0x14: 'au' };
const CONSONANT_SAY = {
    0x15: 'ka', 0x16: 'kha', 0x17: 'ga', 0x18: 'gha', 0x19: 'nga', 0x1a: 'cha', 0x1b: 'chha', 0x1c: 'ja', 0x1d: 'jha', 0x1e: 'nya',
    // The sounds made with the tongue curled back, marked as dictionaries mark them: ṭa ḍa ṇa ḷa ṣa (ta, da, na… are the others).
    0x1f: 'ṭa', 0x20: 'ṭha', 0x21: 'ḍa', 0x22: 'ḍha', 0x23: 'ṇa', 0x24: 'ta', 0x25: 'tha', 0x26: 'da', 0x27: 'dha', 0x28: 'na', 0x29: 'ṉa',
    0x2a: 'pa', 0x2b: 'pha', 0x2c: 'ba', 0x2d: 'bha', 0x2e: 'ma', 0x2f: 'ya', 0x30: 'ra', 0x31: 'ṟa', 0x32: 'la', 0x33: 'ḷa', 0x34: 'ḻa',
    0x35: 'va', 0x36: 'sha', 0x37: 'ṣa', 0x38: 'sa', 0x39: 'ha'
};
const SIGN_SAY = { 0x3e: 'aa', 0x3f: 'i', 0x40: 'ii', 0x41: 'u', 0x42: 'uu', 0x43: 'ru', 0x46: 'e', 0x47: 'ee', 0x48: 'ai', 0x4a: 'o', 0x4b: 'oo', 0x4c: 'au' };
const SCRIPTS = {
    kn: { base: 0x0c80, dravidian: true, skip: [0x29, 0x31, 0x34] },
    te: { base: 0x0c00, dravidian: true, skip: [0x29, 0x31, 0x34] },
    ta: { base: 0x0b80, dravidian: true, skip: [] },
    ml: { base: 0x0d00, dravidian: true, skip: [0x29] },
    hi: { base: 0x0900, skip: [0x29, 0x31, 0x33, 0x34] },
    mr: { base: 0x0900, skip: [0x29, 0x31, 0x34] },
    gu: { base: 0x0a80, skip: [0x29, 0x31, 0x34] },
    pa: { base: 0x0a00, skip: [0x29, 0x31, 0x33, 0x34] },
    bn: { base: 0x0980, skip: [0x29, 0x31, 0x33, 0x34] },
    or: { base: 0x0b00, skip: [0x29, 0x31, 0x34] }
};
// The varnamala ends with ḷa (2026-10-31, "place it at the end"): ಳ after ಹ — and Malayalam's ഴ റ after it. Tamil
// keeps its own order.
const LAST = [0x33, 0x34, 0x31];
const consonantOrder = (code) => {
    const offs = Object.keys(CONSONANT_SAY).map(Number);
    return code === 'ta' ? offs : [...offs.filter((o) => !LAST.includes(o)), ...LAST];
};
const ASSIGNED = /\p{Assigned}/u;
const at = (base, off) => String.fromCodePoint(base + off);
const real = (c) => ASSIGNED.test(c) && /\p{L}|\p{M}/u.test(c);

const indic = (code) => {
    const s = SCRIPTS[code];
    // Hindi and its family write only the long e and o (ए ओ): said "e", "o". The Dravidian scripts have both.
    const vowelSay = (off) => (s.dravidian ? VOWEL_SAY[off] : { 0x0f: 'e', 0x13: 'o' }[off] || VOWEL_SAY[off]);
    const signSay = (off) => (s.dravidian ? SIGN_SAY[off] : { 0x47: 'e', 0x4b: 'o' }[off] || SIGN_SAY[off]);
    const vowelOffs = Object.keys(VOWEL_SAY).map(Number).filter((o) => s.dravidian || ![0x0e, 0x12].includes(o));
    const vowels = vowelOffs.map((o) => [at(s.base, o), vowelSay(o)]).filter(([c]) => real(c)).map(([c, say]) => L(c, say));
    // And, as the varnamala ends its vowels (2026-10-31, "where is am, aha"): ಅಂ am and ಅಃ ah — Tamil's ஃ (aytham).
    if (code === 'ta') vowels.push(L('ஃ', 'akh (aytham)'));
    else for (const [off, say] of [[0x02, 'am'], [0x03, 'ah']]) if (real(at(s.base, off))) vowels.push(L(at(s.base, 0x05) + at(s.base, off), say));
    const consonants = consonantOrder(code).filter((o) => !s.skip.includes(o)).map((o) => [at(s.base, o), CONSONANT_SAY[o]]).filter(([c]) => real(c)).map(([c, say]) => L(c, say));
    const ka = at(s.base, 0x15);
    const signOffs = Object.keys(SIGN_SAY).map(Number).filter((o) => s.dravidian || ![0x46, 0x4a].includes(o));
    const signs = signOffs.map((o) => [at(s.base, o), signSay(o)]).filter(([c]) => real(c)).map(([c, say]) => L(ka + c, `k${say}`));
    const anusvara = at(s.base, 0x02);
    if (real(anusvara)) signs.push(L(ka + anusvara, 'kam'));
    const half = Math.ceil(consonants.length / 2);
    return [
        { id: 'vowels', title: 'Vowels', letters: vowels },
        { id: 'consonants-1', title: 'Consonants 1', letters: consonants.slice(0, half) },
        { id: 'consonants-2', title: 'Consonants 2', letters: consonants.slice(half) },
        { id: 'signs', title: 'Vowel signs', letters: signs }
    ];
};

/**
 * The kagunita / barakhadi (2026-10-31, "the full table"): every consonant — and ksha, jña — with every vowel sign,
 * each with its sound: ಕ ka, ಕಾ kaa, ಕಿ ki … ಕಂ kam, ಕಃ kah. Columns: the vowel signs; rows: the consonants.
 */
const kagunita = (code) => {
    const s = SCRIPTS[code];
    if (!s) return null;
    const VIRAMA = at(s.base, 0x4d);
    const signOffs = Object.keys(SIGN_SAY).map(Number).filter((o) => s.dravidian || ![0x46, 0x4a].includes(o)).filter((o) => real(at(s.base, o)));
    const sayOf = (o) => (s.dravidian ? SIGN_SAY[o] : { 0x47: 'e', 0x4b: 'o' }[o] || SIGN_SAY[o]);
    const columns = [{ sign: '', say: 'a' }, ...signOffs.map((o) => ({ sign: at(s.base, o), say: sayOf(o) }))];
    for (const [off, say] of [[0x02, 'am'], [0x03, 'ah']]) if (real(at(s.base, off))) columns.push({ sign: at(s.base, off), say });
    const base = consonantOrder(code).filter((o) => !s.skip.includes(o)).map((o) => [at(s.base, o), CONSONANT_SAY[o]]).filter(([c]) => real(c));
    const ksha = at(s.base, 0x15) + VIRAMA + at(s.base, 0x37), jna = at(s.base, 0x1c) + VIRAMA + at(s.base, 0x1e);
    const extra = [[ksha, 'ksha'], [jna, 'jña']].filter(([c]) => [...c].every(real));
    const rows = [...base, ...extra].map(([c, say]) => {
        const stem = say.replace(/a$/, '');
        return { char: c, say, cells: columns.map((col) => ({ char: c + col.sign, say: stem + col.say })) };
    });
    return { columns, rows };
};

/* ── The others ───────────────────────────────────────────────────────── */

// English (2026-10-31: "not the matching question — give one word, like A for apple, for every letter"): each letter
// with a word that starts with it, its picture, and a short sentence using it. Pictures that every phone has.
const ENGLISH = [
    ['A', 'ay', 'apple', '🍎', 'I eat a red apple.'], ['B', 'bee', 'ball', '⚽', 'The boy kicks the ball.'], ['C', 'see', 'cat', '🐱', 'The cat drinks milk.'],
    ['D', 'dee', 'dog', '🐶', 'The dog barks at night.'], ['E', 'ee', 'elephant', '🐘', 'The elephant is very big.'], ['F', 'ef', 'fish', '🐟', 'A fish swims in the river.'],
    ['G', 'jee', 'grapes', '🍇', 'The grapes are sweet.'], ['H', 'aych', 'hat', '🎩', 'He wears a hat in the sun.'], ['I', 'eye', 'ice cream', '🍦', 'I like cold ice cream.'],
    ['J', 'jay', 'joker', '🃏', 'The joker makes us laugh.'], ['K', 'kay', 'key', '🔑', 'I open the door with a key.'], ['L', 'el', 'lion', '🦁', 'The lion lives in the forest.'],
    ['M', 'em', 'mango', '🥭', 'The mango is yellow and sweet.'], ['N', 'en', 'nose', '👃', 'I smell a flower with my nose.'], ['O', 'oh', 'orange', '🍊', 'She peels an orange.'],
    ['P', 'pee', 'pen', '🖊️', 'I write with a pen.'], ['Q', 'cue', 'queen', '👸', 'The queen wears a crown.'], ['R', 'ar', 'rabbit', '🐇', 'The rabbit eats a carrot.'],
    ['S', 'es', 'sun', '☀️', 'The sun shines in the sky.'], ['T', 'tee', 'tree', '🌳', 'A bird sits in the tree.'], ['U', 'you', 'umbrella', '☂️', 'Take an umbrella when it rains.'],
    ['V', 'vee', 'van', '🚐', 'The van carries boxes.'], ['W', 'double-you', 'watch', '⌚', 'My watch shows the time.'], ['X', 'ex', 'Xmas tree', '🎄', 'We put lights on the Xmas tree.'],
    ['Y', 'why', 'yacht', '⛵', 'The yacht sails on the sea.'], ['Z', 'zed', 'zebra', '🦓', 'The zebra has black and white stripes.']
// A voice reads a letter alone as a word ("A": "uh"): it is given the letter's name to say instead.
// Each word in a short sentence too (2026-10-31: "in the quiz, not one word — one sentence using that letter's word").
].map(([c, say, word, pic, sentence]) => ({ ...L(c, say, `${c} is for ${word}.`, say.replace(/-/g, ' ')), word, pic, sentence }));
const thirds = (list, titles) => { const n = Math.ceil(list.length / titles.length); return titles.map(([id, title], i) => ({ id, title, letters: list.slice(i * n, (i + 1) * n) })); };

const LATIN = {
    es: { letters: 'A:ah B:beh C:theh D:deh E:eh F:EH-feh G:heh H:AH-cheh I:ee J:HO-tah K:kah L:EH-leh M:EH-meh N:EH-neh Ñ:EH-nyeh O:oh P:peh Q:koo R:EH-rreh S:EH-seh T:teh U:oo V:OO-beh W:OO-beh_DOH-bleh X:EH-kees Y:yeh Z:THEH-tah',
        marks: 'á:ah_(stressed) é:eh_(stressed) í:ee_(stressed) ó:oh_(stressed) ú:oo_(stressed) ü:oo_(said) ll:y_(as_in_yes) ch:ch_(as_in_chair) rr:rolled_r' },
    fr: { letters: 'A:ah B:bay C:say D:day E:uh F:ef G:zhay H:ash I:ee J:zhee K:kah L:el M:em N:en O:oh P:pay Q:kew R:air S:es T:tay U:ew V:vay W:doo-bluh-vay X:eeks Y:ee-grek Z:zed',
        marks: 'é:ay è:eh_(open) ê:eh_(long) ë:said_apart à:ah â:ah_(long) ç:s î:ee ô:oh û:ew_(long) ù:ew_(in_où) œ:uh ou:oo oi:wah' },
    de: { letters: 'A:ah B:beh C:tseh D:deh E:eh F:ef G:geh H:hah I:ee J:yot K:kah L:el M:em N:en O:oh P:peh Q:koo R:air S:es T:teh U:oo V:fow W:veh X:iks Y:IP-see-lon Z:tset',
        marks: 'Ä:eh Ö:er_(round_lips) Ü:ew ß:ss ei:eye ie:ee eu:oy sch:sh ch:kh' },
    pt: { letters: 'A:ah B:beh C:seh D:deh E:eh F:EH-fee G:zheh H:ah-GAH I:ee J:ZHO-tah K:kah L:EH-lee M:EH-mee N:EH-nee O:aw P:peh Q:keh R:EH-hee S:EH-see T:teh U:oo V:veh W:DAH-blee-oo X:sheesh Y:EEP-see-lon Z:zeh',
        marks: 'ç:s ã:ang_(through_the_nose) õ:ong_(through_the_nose) á:ah â:uh é:eh ê:ay í:ee ó:aw ô:oh ú:oo nh:ny lh:ly' }
};
const latin = (code) => {
    const all = pairsOf(LATIN[code].letters);
    return [...thirds(all, [['letters-1', 'Letters A–I'], ['letters-2', 'Letters J–R'], ['letters-3', 'Letters S–Z']]), { id: 'special', title: 'Special letters', letters: pairsOf(LATIN[code].marks) }];
};

const RUSSIAN = pairsOf('А:a Б:b В:v Г:g Д:d Е:ye Ё:yo Ж:zh З:z И:i Й:y К:k Л:l М:m Н:n О:o П:p Р:r С:s Т:t У:u Ф:f Х:kh Ц:ts Ч:ch Ш:sh Щ:shch Ъ:hard_sign Ы:i_(deep) Ь:soft_sign Э:e Ю:yu Я:ya');
const ARABIC = pairsOf('ا:alif_(a) ب:baa_(b) ت:taa_(t) ث:thaa_(th) ج:jeem_(j) ح:Haa_(h) خ:khaa_(kh) د:daal_(d) ذ:dhaal_(dh) ر:raa_(r) ز:zaay_(z) س:seen_(s) ش:sheen_(sh) ص:Saad_(s) ض:Daad_(d) ط:Taa_(t) ظ:Zaa_(z) ع:ayn ف:faa_(f) غ:ghayn_(gh) ق:qaaf_(q) ك:kaaf_(k) ل:laam_(l) م:meem_(m) ن:noon_(n) ه:haa_(h) و:waaw_(w) ي:yaa_(y)');
const URDU = pairsOf('ا:alif_(a) ب:be_(b) پ:pe_(p) ت:te_(t) ٹ:Te_(T) ث:se_(s) ج:jeem_(j) چ:che_(ch) ح:bari_he_(h) خ:khe_(kh) د:daal_(d) ڈ:Daal_(D) ذ:zaal_(z) ر:re_(r) ڑ:Re_(R) ز:ze_(z) ژ:zhe_(zh) س:seen_(s) ش:sheen_(sh) ص:suaad_(s) ض:zuaad_(z) ط:toe_(t) ظ:zoe_(z) ع:ain غ:ghain_(gh) ف:fe_(f) ق:qaaf_(q) ک:kaaf_(k) گ:gaaf_(g) ل:laam_(l) م:meem_(m) ن:noon_(n) و:wao_(w/v) ہ:he_(h) ھ:do-chashmi_he ء:hamza ی:choti_ye_(y/i) ے:bari_ye_(e)');

const kanaGroup = (rows) => pairsOf(rows);
const JAPANESE = [
    { id: 'hiragana-1', title: 'Hiragana あ–そ', letters: kanaGroup('あ:a い:i う:u え:e お:o か:ka き:ki く:ku け:ke こ:ko さ:sa し:shi す:su せ:se そ:so') },
    { id: 'hiragana-2', title: 'Hiragana た–ほ', letters: kanaGroup('た:ta ち:chi つ:tsu て:te と:to な:na に:ni ぬ:nu ね:ne の:no は:ha ひ:hi ふ:fu へ:he ほ:ho') },
    { id: 'hiragana-3', title: 'Hiragana ま–ん', letters: kanaGroup('ま:ma み:mi む:mu め:me も:mo や:ya ゆ:yu よ:yo ら:ra り:ri る:ru れ:re ろ:ro わ:wa を:wo ん:n') },
    { id: 'voiced', title: 'Voiced: が ざ だ ば ぱ', letters: kanaGroup('が:ga ぎ:gi ぐ:gu げ:ge ご:go ざ:za じ:ji ず:zu ぜ:ze ぞ:zo だ:da で:de ど:do ば:ba び:bi ぶ:bu べ:be ぼ:bo ぱ:pa ぴ:pi ぷ:pu ぺ:pe ぽ:po') },
    { id: 'katakana-1', title: 'Katakana ア–ソ', letters: kanaGroup('ア:a イ:i ウ:u エ:e オ:o カ:ka キ:ki ク:ku ケ:ke コ:ko サ:sa シ:shi ス:su セ:se ソ:so') },
    { id: 'katakana-2', title: 'Katakana タ–ホ', letters: kanaGroup('タ:ta チ:chi ツ:tsu テ:te ト:to ナ:na ニ:ni ヌ:nu ネ:ne ノ:no ハ:ha ヒ:hi フ:fu ヘ:he ホ:ho') },
    { id: 'katakana-3', title: 'Katakana マ–ン', letters: kanaGroup('マ:ma ミ:mi ム:mu メ:me モ:mo ヤ:ya ユ:yu ヨ:yo ラ:ra リ:ri ル:ru レ:re ロ:ro ワ:wa ヲ:wo ン:n') }
];
/*
 * A Korean voice reads a letter alone by its name (ㄱ: "giyeok"): each consonant is said with ㅏ (가 ga), each vowel
 * with the silent ㅇ (아 a) — its sound, as a learner wants to hear it.
 */
const LEADS = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'], VOWELS = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
const syllable = (lead, vowel) => String.fromCodePoint(0xac00 + (LEADS.indexOf(lead) * 21 + VOWELS.indexOf(vowel)) * 28);
const jamo = (list) => list.map((l) => ({ ...l, speak: LEADS.includes(l.char) ? syllable(l.char, 'ㅏ') : VOWELS.includes(l.char) ? syllable('ㅇ', l.char) : l.char }));
const KOREAN = [
    { id: 'consonants', title: 'Consonants', letters: jamo(pairsOf('ㄱ:g/k ㄴ:n ㄷ:d/t ㄹ:r/l ㅁ:m ㅂ:b/p ㅅ:s ㅇ:ng_(silent_at_the_start) ㅈ:j ㅊ:ch ㅋ:k ㅌ:t ㅍ:p ㅎ:h')) },
    { id: 'vowels', title: 'Vowels', letters: jamo(pairsOf('ㅏ:a ㅑ:ya ㅓ:eo ㅕ:yeo ㅗ:o ㅛ:yo ㅜ:u ㅠ:yu ㅡ:eu ㅣ:i')) },
    { id: 'double', title: 'Double consonants', letters: jamo(pairsOf('ㄲ:kk ㄸ:tt ㅃ:pp ㅆ:ss ㅉ:jj')) },
    { id: 'combined', title: 'Combined vowels', letters: jamo(pairsOf('ㅐ:ae ㅔ:e ㅒ:yae ㅖ:ye ㅘ:wa ㅙ:wae ㅚ:oe ㅝ:wo ㅞ:we ㅟ:wi ㅢ:ui')) },
    { id: 'syllables', title: 'First syllables', letters: pairsOf('가:ga 나:na 다:da 라:ra 마:ma 바:ba 사:sa 아:a 자:ja 하:ha') }
];
// Chinese has no alphabet: its sounds are learnt with pinyin — the four tones, then the first characters. First, the
// English letters as China says them, A 诶 … Z 贼德 (asked 2026-10-31, from a chart the student showed; R is 艾儿 so it
// isn't I's 艾 again), each with its pinyin under it ("character:letter:pinyin"; X is ài kè sī: 艾 is ài, the second chart's
// "yī" was a slip). `wide`: up to four characters a letter, so the chart gives them bigger tiles.
const namesOf = (text) => text.trim().split(/\s+/).map((p) => { const [char, say, pinyin] = p.split(':'); return { ...L(char, say), pinyin: pinyin.replace(/_/g, ' ') }; });
const CHINESE = [
    { id: 'alphabet', title: 'The alphabet A–Z', wide: true, letters: namesOf(`诶:A:ēi 比:B:bǐ 西:C:xī 迪:D:dí 伊:E:yī 艾弗:F:ài_fú 吉:G:jí 艾尺:H:ài_chǐ 艾:I:ài 杰:J:jié 开:K:kāi 艾勒:L:ài_lè 艾马:M:ài_mǎ
        艾娜:N:ài_nà 哦:O:ó 屁:P:pì 吉吾:Q:jí_wú 艾儿:R:ài_ér 艾丝:S:ài_sī 提:T:tí 伊吾:U:yī_wú 维:V:wéi 豆贝尔维:W:dòu_bèi_ěr_wéi 艾克斯:X:ài_kè_sī 吾艾:Y:wú_ài 贼德:Z:zéi_dé`) },
    { id: 'tones', title: 'The four tones', letters: pairsOf('妈:mā_(1st_tone,_high) 麻:má_(2nd,_rising) 马:mǎ_(3rd,_dip) 骂:mà_(4th,_falling) 吗:ma_(no_tone)') },
    { id: 'numbers', title: 'Numbers 一–十', letters: pairsOf('一:yī 二:èr 三:sān 四:sì 五:wǔ 六:liù 七:qī 八:bā 九:jiǔ 十:shí') },
    { id: 'first-1', title: 'First characters 1', letters: pairsOf('人:rén 大:dà 小:xiǎo 中:zhōng 上:shàng 下:xià 口:kǒu 日:rì 月:yuè 水:shuǐ') },
    { id: 'first-2', title: 'First characters 2', letters: pairsOf('火:huǒ 山:shān 天:tiān 女:nǚ 子:zǐ 我:wǒ 你:nǐ 他:tā 好:hǎo 不:bù') }
];

/** Every course's groups of letters, by course code ('en' is English). */
/**
 * A word for each letter, as English has (A for 🍎 apple), in the other languages (asked 2026-10-31: "what I said
 * from morning, apply for all languages" — Kannada and Hindi first, then the rest, letterWords/): the word, how it
 * sounds in English letters, its picture, a short sentence using it, the sentence's sound and its meaning. A letter
 * no common word starts with (ಙ ಞ ಣ ಳ, ङ ञ ण ष …) has none, and is learnt by its sound as before (the user chose so).
 */
const WORDS = {
    kn: {
        'ಅ': ['ಅಮ್ಮ', 'amma', '👩', 'ಅಮ್ಮ ಅಡುಗೆ ಮಾಡುತ್ತಾರೆ.', 'amma aḍuge māḍuttāre', 'Mother is cooking.'],
        'ಆ': ['ಆನೆ', 'āne', '🐘', 'ಆನೆ ತುಂಬಾ ದೊಡ್ಡದು.', 'āne tumbā doḍḍadu', 'The elephant is very big.'],
        'ಇ': ['ಇಲಿ', 'ili', '🐭', 'ಇಲಿ ಓಡುತ್ತಿದೆ.', 'ili ōḍuttide', 'The mouse is running.'],
        'ಈ': ['ಈರುಳ್ಳಿ', 'īruḷḷi', '🧅', 'ಈರುಳ್ಳಿ ಕೆಂಪಾಗಿದೆ.', 'īruḷḷi kempāgide', 'The onion is red.'],
        'ಉ': ['ಉಂಗುರ', 'uṅgura', '💍', 'ಉಂಗುರ ಹೊಳೆಯುತ್ತದೆ.', 'uṅgura hoḷeyuttade', 'The ring shines.'],
        'ಊ': ['ಊಟ', 'ūṭa', '🍛', 'ನಾವು ಊಟ ಮಾಡುತ್ತೇವೆ.', 'nāvu ūṭa māḍuttēve', 'We eat a meal.'],
        'ಋ': ['ಋಷಿ', 'ṛṣi', '🧘', 'ಋಷಿ ಕಾಡಿನಲ್ಲಿ ಇರುತ್ತಾರೆ.', 'ṛṣi kāḍinalli iruttāre', 'The sage lives in the forest.'],
        'ಎ': ['ಎಲೆ', 'ele', '🍃', 'ಎಲೆ ಹಸಿರಾಗಿದೆ.', 'ele hasirāgide', 'The leaf is green.'],
        'ಏ': ['ಏಡಿ', 'ēḍi', '🦀', 'ಏಡಿ ಮರಳಿನಲ್ಲಿ ಓಡುತ್ತದೆ.', 'ēḍi maraḷinalli ōḍuttade', 'The crab runs on the sand.'],
        'ಐ': ['ಐದು', 'aidu', '🖐️', 'ಕೈಯಲ್ಲಿ ಐದು ಬೆರಳುಗಳಿವೆ.', 'kaiyalli aidu beraḷugaḷive', 'A hand has five fingers.'],
        'ಒ': ['ಒಂಟೆ', 'oṇṭe', '🐫', 'ಒಂಟೆ ಮರುಭೂಮಿಯಲ್ಲಿ ನಡೆಯುತ್ತದೆ.', 'oṇṭe marubhūmiyalli naḍeyuttade', 'The camel walks in the desert.'],
        'ಓ': ['ಓಡು', 'ōḍu', '🏃', 'ಮಕ್ಕಳು ಆಟದಲ್ಲಿ ಓಡುತ್ತಾರೆ.', 'makkaḷu āṭadalli ōḍuttāre', 'The children run in the game.'],
        'ಔ': ['ಔಷಧಿ', 'auṣadhi', '💊', 'ಔಷಧಿ ಕಹಿಯಾಗಿದೆ.', 'auṣadhi kahiyāgide', 'The medicine is bitter.'],
        'ಅಂ': ['ಅಂಗಡಿ', 'aṅgaḍi', '🏪', 'ಅಂಗಡಿಯಲ್ಲಿ ಹಣ್ಣುಗಳಿವೆ.', 'aṅgaḍiyalli haṇṇugaḷive', 'There are fruits in the shop.'],
        'ಕ': ['ಕಪ್ಪೆ', 'kappe', '🐸', 'ಕಪ್ಪೆ ನೀರಿಗೆ ಹಾರುತ್ತದೆ.', 'kappe nīrige hāruttade', 'The frog jumps into the water.'],
        'ಖ': ['ಖಡ್ಗ', 'khaḍga', '🗡️', 'ರಾಜನ ಬಳಿ ಖಡ್ಗ ಇದೆ.', 'rājana baḷi khaḍga ide', 'The king has a sword.'],
        'ಗ': ['ಗಡಿಯಾರ', 'gaḍiyāra', '⏰', 'ಗಡಿಯಾರ ಸಮಯ ತೋರಿಸುತ್ತದೆ.', 'gaḍiyāra samaya tōrisuttade', 'The clock shows the time.'],
        'ಘ': ['ಘಂಟೆ', 'ghaṇṭe', '🔔', 'ದೇವಸ್ಥಾನದಲ್ಲಿ ಘಂಟೆ ಬಾರಿಸುತ್ತಾರೆ.', 'dēvasthānadalli ghaṇṭe bārisuttāre', 'They ring the bell in the temple.'],
        'ಚ': ['ಚಮಚ', 'camaca', '🥄', 'ಚಮಚದಿಂದ ಮೊಸರು ತಿನ್ನು.', 'camacadinda mosaru tinnu', 'Eat the curd with a spoon.'],
        'ಛ': ['ಛತ್ರಿ', 'chatri', '☂️', 'ಮಳೆಯಲ್ಲಿ ಛತ್ರಿ ಹಿಡಿ.', 'maḷeyalli chatri hiḍi', 'Hold an umbrella in the rain.'],
        'ಜ': ['ಜಿಂಕೆ', 'jiṅke', '🦌', 'ಜಿಂಕೆ ವೇಗವಾಗಿ ಓಡುತ್ತದೆ.', 'jiṅke vēgavāgi ōḍuttade', 'The deer runs fast.'],
        'ಝ': ['ಝರಿ', 'jhari', '🏞️', 'ಝರಿಯ ನೀರು ತಣ್ಣಗಿದೆ.', 'jhariya nīru taṇṇagide', 'The stream’s water is cold.'],
        'ಟ': ['ಟೊಮೆಟೊ', 'ṭomeṭo', '🍅', 'ಟೊಮೆಟೊ ಕೆಂಪಾಗಿದೆ.', 'ṭomeṭo kempāgide', 'The tomato is red.'],
        'ಡ': ['ಡಬ್ಬಿ', 'ḍabbi', '📦', 'ಡಬ್ಬಿಯಲ್ಲಿ ಸಿಹಿ ಇದೆ.', 'ḍabbiyalli sihi ide', 'There are sweets in the box.'],
        'ಢ': ['ಢಕ್ಕೆ', 'ḍhakke', '🥁', 'ಅವನು ಢಕ್ಕೆ ಬಾರಿಸುತ್ತಾನೆ.', 'avanu ḍhakke bārisuttāne', 'He plays the drum.'],
        'ತ': ['ತರಕಾರಿ', 'tarakāri', '🥕', 'ತರಕಾರಿ ಆರೋಗ್ಯಕ್ಕೆ ಒಳ್ಳೆಯದು.', 'tarakāri ārōgyakke oḷḷeyadu', 'Vegetables are good for health.'],
        'ದ': ['ದೋಣಿ', 'dōṇi', '⛵', 'ದೋಣಿ ನದಿಯಲ್ಲಿ ತೇಲುತ್ತದೆ.', 'dōṇi nadiyalli tēluttade', 'The boat floats on the river.'],
        'ಧ': ['ಧ್ವಜ', 'dhvaja', '🚩', 'ಶಾಲೆಯಲ್ಲಿ ಧ್ವಜ ಹಾರುತ್ತದೆ.', 'śāleyalli dhvaja hāruttade', 'The flag flies at school.'],
        'ನ': ['ನವಿಲು', 'navilu', '🦚', 'ನವಿಲು ಸುಂದರವಾಗಿ ಕುಣಿಯುತ್ತದೆ.', 'navilu sundaravāgi kuṇiyuttade', 'The peacock dances beautifully.'],
        'ಪ': ['ಪುಸ್ತಕ', 'pustaka', '📕', 'ನಾನು ಪುಸ್ತಕ ಓದುತ್ತೇನೆ.', 'nānu pustaka ōduttēne', 'I read a book.'],
        'ಫ': ['ಫಲ', 'phala', '🍎', 'ಮರದಲ್ಲಿ ಫಲ ಇದೆ.', 'maradalli phala ide', 'There is fruit on the tree.'],
        'ಬ': ['ಬಾಳೆಹಣ್ಣು', 'bāḷehaṇṇu', '🍌', 'ಬಾಳೆಹಣ್ಣು ಹಳದಿಯಾಗಿದೆ.', 'bāḷehaṇṇu haḷadiyāgide', 'The banana is yellow.'],
        'ಭ': ['ಭೂಮಿ', 'bhūmi', '🌍', 'ಭೂಮಿ ಸೂರ್ಯನ ಸುತ್ತ ಸುತ್ತುತ್ತದೆ.', 'bhūmi sūryana sutta suttuttade', 'The earth goes around the sun.'],
        'ಮ': ['ಮರ', 'mara', '🌳', 'ಮರದ ಮೇಲೆ ಹಕ್ಕಿ ಇದೆ.', 'marada mēle hakki ide', 'There is a bird on the tree.'],
        'ಯ': ['ಯಂತ್ರ', 'yantra', '⚙️', 'ಯಂತ್ರ ಕೆಲಸ ಮಾಡುತ್ತದೆ.', 'yantra kelasa māḍuttade', 'The machine works.'],
        'ರ': ['ರೈಲು', 'railu', '🚂', 'ರೈಲು ವೇಗವಾಗಿ ಹೋಗುತ್ತದೆ.', 'railu vēgavāgi hōguttade', 'The train goes fast.'],
        'ಲ': ['ಲಡ್ಡು', 'laḍḍu', '🍬', 'ಲಡ್ಡು ತುಂಬಾ ಸಿಹಿಯಾಗಿದೆ.', 'laḍḍu tumbā sihiyāgide', 'The laddu is very sweet.'],
        'ವ': ['ವಿಮಾನ', 'vimāna', '✈️', 'ವಿಮಾನ ಆಕಾಶದಲ್ಲಿ ಹಾರುತ್ತದೆ.', 'vimāna ākāśadalli hāruttade', 'The aeroplane flies in the sky.'],
        'ಶ': ['ಶಂಖ', 'śaṅkha', '🐚', 'ಶಂಖದ ಶಬ್ದ ಜೋರಾಗಿದೆ.', 'śaṅkhada śabda jōrāgide', 'The conch’s sound is loud.'],
        'ಸ': ['ಸೂರ್ಯ', 'sūrya', '☀️', 'ಸೂರ್ಯ ಬೆಳಗ್ಗೆ ಉದಯಿಸುತ್ತಾನೆ.', 'sūrya beḷagge udayisuttāne', 'The sun rises in the morning.'],
        'ಹ': ['ಹಸು', 'hasu', '🐄', 'ಹಸು ಹಾಲು ಕೊಡುತ್ತದೆ.', 'hasu hālu koḍuttade', 'The cow gives milk.']
    },
    hi: {
        'अ': ['अनानास', 'anānās', '🍍', 'अनानास मीठा है।', 'anānās mīṭhā hai', 'The pineapple is sweet.'],
        'आ': ['आम', 'ām', '🥭', 'आम पीला और मीठा है।', 'ām pīlā aur mīṭhā hai', 'The mango is yellow and sweet.'],
        'इ': ['इंजन', 'iñjan', '🚂', 'रेल का इंजन तेज़ चलता है।', 'rel kā iñjan tez caltā hai', 'The train’s engine runs fast.'],
        'ई': ['ईंट', 'ī̃ṭ', '🧱', 'दीवार ईंट से बनती है।', 'dīvār ī̃ṭ se bantī hai', 'A wall is made of bricks.'],
        'उ': ['उल्लू', 'ullū', '🦉', 'उल्लू रात में जागता है।', 'ullū rāt mẽ jāgtā hai', 'The owl is awake at night.'],
        'ऊ': ['ऊन', 'ūn', '🧶', 'ऊन से स्वेटर बनता है।', 'ūn se sveṭar bantā hai', 'A sweater is made from wool.'],
        'ऋ': ['ऋषि', 'ṛṣi', '🧘', 'ऋषि जंगल में रहते हैं।', 'ṛṣi jaṅgal mẽ rahte haĩ', 'The sage lives in the forest.'],
        'ए': ['एक', 'ek', '☝️', 'मेरे पास एक कलम है।', 'mere pās ek kalam hai', 'I have one pen.'],
        'ऐ': ['ऐनक', 'ainak', '👓', 'दादा जी ऐनक पहनते हैं।', 'dādā jī ainak pahante haĩ', 'Grandfather wears glasses.'],
        'ओ': ['ओस', 'os', '💧', 'सुबह घास पर ओस होती है।', 'subah ghās par os hotī hai', 'In the morning there is dew on the grass.'],
        'औ': ['औरत', 'aurat', '👩', 'औरत बाज़ार जाती है।', 'aurat bāzār jātī hai', 'The woman goes to the market.'],
        'अं': ['अंगूर', 'aṅgūr', '🍇', 'अंगूर खट्टे-मीठे हैं।', 'aṅgūr khaṭṭe-mīṭhe haĩ', 'The grapes are sweet and sour.'],
        'क': ['कबूतर', 'kabūtar', '🕊️', 'कबूतर छत पर बैठा है।', 'kabūtar chat par baiṭhā hai', 'The pigeon is sitting on the roof.'],
        'ख': ['खरगोश', 'khargoś', '🐇', 'खरगोश गाजर खाता है।', 'khargoś gājar khātā hai', 'The rabbit eats a carrot.'],
        'ग': ['गाय', 'gāy', '🐄', 'गाय दूध देती है।', 'gāy dūdh detī hai', 'The cow gives milk.'],
        'घ': ['घड़ी', 'ghaṛī', '⌚', 'घड़ी समय बताती है।', 'ghaṛī samay batātī hai', 'The watch tells the time.'],
        'च': ['चम्मच', 'cammac', '🥄', 'मैं चम्मच से खाता हूँ।', 'maĩ cammac se khātā hū̃', 'I eat with a spoon.'],
        'छ': ['छतरी', 'chatrī', '☂️', 'बारिश में छतरी लो।', 'bāriś mẽ chatrī lo', 'Take an umbrella in the rain.'],
        'ज': ['जहाज़', 'jahāz', '🚢', 'जहाज़ समुद्र में चलता है।', 'jahāz samudra mẽ caltā hai', 'The ship sails on the sea.'],
        'झ': ['झंडा', 'jhaṇḍā', '🚩', 'स्कूल में झंडा लहराता है।', 'skūl mẽ jhaṇḍā lahrātā hai', 'The flag waves at school.'],
        'ट': ['टमाटर', 'ṭamāṭar', '🍅', 'टमाटर लाल है।', 'ṭamāṭar lāl hai', 'The tomato is red.'],
        'ठ': ['ठेला', 'ṭhelā', '🛒', 'ठेला सड़क पर खड़ा है।', 'ṭhelā saṛak par khaṛā hai', 'The handcart stands on the road.'],
        'ड': ['डाकिया', 'ḍākiyā', '📮', 'डाकिया चिट्ठी लाता है।', 'ḍākiyā ciṭṭhī lātā hai', 'The postman brings letters.'],
        'ढ': ['ढोल', 'ḍhol', '🥁', 'शादी में ढोल बजता है।', 'śādī mẽ ḍhol bajtā hai', 'The drum plays at the wedding.'],
        'त': ['तितली', 'titlī', '🦋', 'तितली फूल पर बैठी है।', 'titlī phūl par baiṭhī hai', 'The butterfly is sitting on the flower.'],
        'थ': ['थाली', 'thālī', '🍽️', 'थाली में खाना है।', 'thālī mẽ khānā hai', 'There is food on the plate.'],
        'द': ['दरवाज़ा', 'darvāzā', '🚪', 'दरवाज़ा खुला है।', 'darvāzā khulā hai', 'The door is open.'],
        'ध': ['धनुष', 'dhanuṣ', '🏹', 'राम के पास धनुष है।', 'rām ke pās dhanuṣ hai', 'Ram has a bow.'],
        'न': ['नल', 'nal', '🚰', 'नल से पानी आता है।', 'nal se pānī ātā hai', 'Water comes from the tap.'],
        'प': ['पतंग', 'pataṅg', '🪁', 'आसमान में पतंग उड़ती है।', 'āsmān mẽ pataṅg uṛtī hai', 'A kite flies in the sky.'],
        'फ': ['फूल', 'phūl', '🌸', 'फूल सुंदर है।', 'phūl sundar hai', 'The flower is beautiful.'],
        'ब': ['बकरी', 'bakrī', '🐐', 'बकरी घास खाती है।', 'bakrī ghās khātī hai', 'The goat eats grass.'],
        'भ': ['भालू', 'bhālū', '🐻', 'भालू को शहद पसंद है।', 'bhālū ko śahad pasand hai', 'The bear likes honey.'],
        'म': ['मछली', 'machlī', '🐟', 'मछली पानी में रहती है।', 'machlī pānī mẽ rahtī hai', 'The fish lives in water.'],
        'य': ['यज्ञ', 'yajña', '🔥', 'यज्ञ में आग जलती है।', 'yajña mẽ āg jaltī hai', 'A fire burns in the yajna.'],
        'र': ['रेल', 'rel', '🚆', 'रेल पटरी पर चलती है।', 'rel paṭrī par caltī hai', 'The train runs on the track.'],
        'ल': ['लड्डू', 'laḍḍū', '🍬', 'लड्डू बहुत मीठा है।', 'laḍḍū bahut mīṭhā hai', 'The laddu is very sweet.'],
        'व': ['वन', 'van', '🌲', 'वन में बहुत पेड़ हैं।', 'van mẽ bahut peṛ haĩ', 'There are many trees in the forest.'],
        'श': ['शेर', 'śer', '🦁', 'शेर जंगल का राजा है।', 'śer jaṅgal kā rājā hai', 'The lion is the king of the jungle.'],
        'स': ['सेब', 'seb', '🍎', 'सेब लाल है।', 'seb lāl hai', 'The apple is red.'],
        'ह': ['हाथी', 'hāthī', '🐘', 'हाथी बहुत बड़ा है।', 'hāthī bahut baṛā hai', 'The elephant is very big.']
    }
};
// And the other languages (2026-11-02, "make the last changes to all languages" once Kannada and Hindi were checked).
Object.assign(WORDS, require('./letterWords/south'), require('./letterWords/north'), require('./letterWords/world'), require('./letterWords/east'));
// And the letters that had none (2026-11-04, "give the word for that letter", all languages): a word that starts with
// it, or one with it inside (its 8th field, the part to colour). A letter's own word, where it had one, stays.
for (const [code, words] of Object.entries(require('./letterWords/more'))) WORDS[code] = { ...words, ...WORDS[code] };

/** A course's letters, each with its word where it has one (`WORDS`). An empty sound is left out. */
const withWords = (code, groups) => (WORDS[code] ? groups.map((g) => ({ ...g, letters: g.letters.map((l) => {
    const w = WORDS[code][l.char];
    return w ? { ...l, word: w[0], ...(w[1] ? { wordSay: w[1] } : {}), pic: w[2], sentence: w[3], ...(w[4] ? { sentenceSay: w[4] } : {}), sentenceEn: w[5], ...(w[6] ? { inside: w[6] } : {}) } : l;
}) })) : groups);

const groupsOf = (code) => withWords(code, groupsOfScript(code));
const groupsOfScript = (code) => {
    if (SCRIPTS[code]) return indic(code);
    if (LATIN[code]) return latin(code);
    switch (code) {
        case 'en': return thirds(ENGLISH, [['letters-1', 'Letters A–I'], ['letters-2', 'Letters J–R'], ['letters-3', 'Letters S–Z']]);
        case 'ru': return thirds(RUSSIAN, [['letters-1', 'Letters А–К'], ['letters-2', 'Letters Л–Х'], ['letters-3', 'Letters Ц–Я']]);
        case 'ar': return thirds(ARABIC, [['letters-1', 'Letters ا–ذ'], ['letters-2', 'Letters ر–غ'], ['letters-3', 'Letters ف–ي']]);
        case 'ur': return thirds(URDU, [['letters-1', 'Letters ا–ذ'], ['letters-2', 'Letters ر–ق'], ['letters-3', 'Letters ک–ے']]);
        case 'ja': return JAPANESE;
        case 'ko': return KOREAN;
        case 'zh': return CHINESE;
        default: return [];
    }
};

module.exports = { groupsOf, kagunita };
