/**
 * Japanese in kana, from its sound in English letters (2026-10-29, user: "allow both typing in English and
 * Japanese"): an answer may be typed in kana (わたしは) where it is kept in kanji (私は), or in English letters
 * (watashi wa). The sound files (ja.js, lines/ja.js) write each tile's sound, "-" between its words; here those
 * sounds become hiragana, the particles as they are written (wa は, o を, e へ). Worked out here, with no outside
 * service.
 */
const TABLE = {
    kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', sha: 'しゃ', shu: 'しゅ', sho: 'しょ', cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ',
    nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ', hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ', mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
    rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ', ja: 'じゃ', ju: 'じゅ', jo: 'じょ',
    bya: 'びゃ', byu: 'びゅ', byo: 'びょ', pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ', shi: 'し', chi: 'ち', tsu: 'つ',
    fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', fu: 'ふ', ji: 'じ', ti: 'てぃ', di: 'でぃ', we: 'うぇ', wi: 'うぃ',
    ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ', sa: 'さ', si: 'し', su: 'す', se: 'せ', so: 'そ',
    ta: 'た', te: 'て', to: 'と', tu: 'つ', na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
    ha: 'は', hi: 'ひ', hu: 'ふ', he: 'へ', ho: 'ほ', ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
    ya: 'や', yu: 'ゆ', yo: 'よ', ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ', wa: 'わ', wo: 'を',
    ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご', za: 'ざ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
    da: 'だ', de: 'で', do: 'ど', du: 'づ', ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
    pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ', va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
    a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お'
};
const LONG = { 'ā': 'aa', 'ī': 'ii', 'ū': 'uu', 'ē': 'ee', 'ō': 'ou', 'â': 'aa', 'î': 'ii', 'û': 'uu', 'ê': 'ee', 'ô': 'ou' };
const PARTICLE = { wa: 'は', o: 'を', e: 'へ' };

/** One word in English letters as hiragana; letters it cannot read are kept. */
const wordToKana = (w) => {
    const s = String(w || '').toLowerCase().replace(/[āīūēōâîûêô]/g, (c) => LONG[c]).replace(/[^a-z']/g, '');
    let out = '';
    for (let i = 0; i < s.length;) {
        const c = s[i], next = s[i + 1];
        if (c === "'") { i++; continue; }
        // n before a consonant (or at the end, or n'): ん
        if (c === 'n' && (!next || next === "'" || (!'aiueoy'.includes(next) && next !== 'n'))) { out += 'ん'; i += next === "'" ? 2 : 1; continue; }
        if (c === 'n' && next === 'n') { out += 'ん'; i += 1; continue; }
        // A doubled consonant: っ
        if (c === next && !'aiueon'.includes(c)) { out += 'っ'; i++; continue; }
        if (c === 't' && next === 'c' && s[i + 2] === 'h') { out += 'っ'; i++; continue; }
        const hit = [3, 2, 1].map((n) => s.slice(i, i + n)).find((p) => TABLE[p]);
        if (hit) { out += TABLE[hit]; i += hit.length; } else { out += c; i++; }
    }
    return out;
};

/** A tile's sound ("watashi-wa", "o-namae-wa") as hiragana, a particle after a word written as it is (は, を, へ). */
const soundToKana = (say) => String(say || '').replace(/[.,!?;:、。！？]/g, ' ').trim().split(/\s+/)
    .map((tile) => tile.split('-').map((w, i) => (i > 0 && PARTICLE[w.toLowerCase()] ? PARTICLE[w.toLowerCase()] : wordToKana(w))).join(''))
    .join('');

// Each kana's vowel, for a long vowel mark (マンゴー → まんごお, as the sounds write "mangoo").
const VOWEL = {};
for (const [r, k] of Object.entries(TABLE)) VOWEL[k.at(-1)] = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' }[r.at(-1)];
/** Katakana as hiragana (ソフト → そふと), a long vowel mark as its vowel (ー after ご: お). */
const toHiragana = (text) => String(text || '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/(.)ー/g, (m, k) => (VOWEL[k] ? k + VOWEL[k] : m));
const hasKatakana = (text) => /[ァ-ヶ]/.test(String(text || ''));

module.exports = { wordToKana, soundToKana, toHiragana, hasKatakana };
