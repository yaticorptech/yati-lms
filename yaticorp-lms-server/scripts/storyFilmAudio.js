/**
 * Records the story film's voices (Language Learning, story 2 — "The Stranger Who Changed Everything") with AI4Bharat's
 * open Indic Parler-TTS (its public Hugging Face Space: no key, no daily allowance): Indian English, Hindi and
 * Kannada, one named voice per person and language, chosen to sound their age. One file a line, into the student app's
 * public/linguistic/film/stranger/<lang>/<scene>-<line>.m4a, with their lengths in manifest.json. Fixed for every
 * student from then on.
 *
 * Resumable: lines already recorded this way (manifest.parler) are skipped, so it can be run again after a stop.
 *
 *   node scripts/storyFilmAudio.js              every language
 *   node scripts/storyFilmAudio.js --lang kn    one language
 *   node scripts/storyFilmAudio.js --redo       every line again (new voices)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const comics = require('../src/linguistic/comics');

const HOST = 'https://ai4bharat-indic-parler-tts.hf.space';
const OUT = path.resolve(__dirname, '../../yaticorp-lms-student/public/linguistic/film/stranger');
// The voices: Indic Parler's named speakers for each language, and how each person speaks.
const QUALITY = 'very clear audio with no background noise, close recording';
const VOICES = {
    en: { course: null,
        narrator: `Mary speaks warmly like a storyteller, in a calm, moderate-pitched voice at a moderate pace, with expressive delivery, ${QUALITY}.`,
        arjun: `Jatin, a young man, speaks politely and earnestly in a slightly high-pitched, clear voice at a moderate pace, with expressive delivery, ${QUALITY}.`,
        ravi: `Thoma, an elderly man, speaks slowly in a low-pitched, gentle, tired voice with a slow pace, with expressive delivery, ${QUALITY}.`,
        interviewer: `Kabir, a mature man, speaks calmly and confidently in a deep, moderate-pitched voice at a moderate pace, ${QUALITY}.` },
    hi: { course: 'hi',
        narrator: `Divya speaks warmly like a storyteller, in a calm, moderate-pitched voice at a moderate pace, with expressive delivery, ${QUALITY}.`,
        arjun: `Rohit, a young man, speaks politely and earnestly in a slightly high-pitched, clear voice at a moderate pace, with expressive delivery, ${QUALITY}.`,
        ravi: `Aman, an elderly man, speaks slowly in a low-pitched, gentle, tired voice with a slow pace, with expressive delivery, ${QUALITY}.`,
        interviewer: `Aman, a mature man, speaks calmly and confidently in a deep, moderate-pitched voice at a moderate pace, ${QUALITY}.` },
    kn: { course: 'kn',
        narrator: `Anu speaks warmly like a storyteller, in a calm, moderate-pitched voice at a moderate pace, with expressive delivery, ${QUALITY}.`,
        arjun: `Chetan, a young man, speaks politely and earnestly in a slightly high-pitched, clear voice at a moderate pace, with expressive delivery, ${QUALITY}.`,
        ravi: `Suresh, an elderly man, speaks slowly in a low-pitched, gentle, tired voice with a slow pace, with expressive delivery, ${QUALITY}.`,
        interviewer: `Suresh, a mature man, speaks calmly and confidently in a deep, moderate-pitched voice at a moderate pace, ${QUALITY}.` }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One line, spoken: the Space is asked, waited for, and its audio fetched. Retries on a busy or sleeping Space. A
 * line the model returns nothing for (it happens with very short sentences) is tried again with only its punctuation
 * changed — the words never change.
 */
const variants = (text) => [text, text.replace(/\.\s+(?=[A-Z\u0900-\u0CFF])/g, ', ').replace(/,\s*$/, '.'), text.replace(/[.!?…]+\s*$/, ''), `${text} `];
async function speak(text, description) {
    let empties = 0;
    for (let tries = 0; tries < 10; tries += 1) {
        const say = variants(text)[Math.min(empties, 3)];
        try {
            const start = await fetch(`${HOST}/gradio_api/call/generate_finetuned`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [say, description] }) });
            if (!start.ok) throw new Error(`start ${start.status}`);
            const { event_id: id } = await start.json();
            const stream = await fetch(`${HOST}/gradio_api/call/generate_finetuned/${id}`);
            const body = await stream.text();
            const lines = body.split('\n');
            const errAt = lines.findIndex((l) => l.startsWith('event: error'));
            if (errAt >= 0) throw new Error(`space: ${(lines[errAt + 1] || '').slice(0, 160)}`);
            const done = lines.findIndex((l) => l.startsWith('event: complete'));
            const data = JSON.parse((lines[done + 1] || '').replace(/^data:\s*/, '') || '[]');
            // The reply names a file on the Space; it is served (as MP3) at /gradio_api/file=<path>.
            if (!data[0]?.path) { empties += 1; throw new Error(empties > 1 ? 'no audio in the reply — rewording the punctuation' : 'no audio in the reply'); }
            const audio = await fetch(`${HOST}/gradio_api/file=${data[0].path}`);
            if (!audio.ok) throw new Error(`audio ${audio.status}`);
            return Buffer.from(await audio.arrayBuffer());
        } catch (e) {
            const wait = /quota|exceeded|429|503|busy/i.test(e.message) ? 90 : /no audio/.test(e.message) ? 4 : 15;
            console.log(`  (${e.message} — trying again in ${wait}s)`);
            await sleep(wait * 1000);
        }
    }
    return null;
}

(async () => {
    const only = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : null;
    const redo = process.argv.includes('--redo');
    const file = path.join(OUT, 'manifest.json');
    const manifest = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    if (redo) manifest.parler = {};
    manifest.parler = manifest.parler || {};
    delete manifest.gemini;
    // Several runs may record at once (--lang, --part): each saves only its own lines into what is on disk now.
    const save = (lang, key) => {
        const disk = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
        disk[lang] = { ...(disk[lang] || {}), [key]: manifest[lang][key] };
        disk.parler = disk.parler || {};
        disk.parler[lang] = [...new Set([...(disk.parler[lang] || []), key])];
        delete disk.gemini;
        fs.writeFileSync(file, JSON.stringify(disk, null, 1));
    };
    // --part i/n: this run takes every n-th line, starting at the i-th (several runs share a language).
    const part = process.argv.includes('--part') ? process.argv[process.argv.indexOf('--part') + 1].split('/').map(Number) : [0, 1];
    let made = 0;
    for (const [lang, V] of Object.entries(VOICES)) {
        if (only && only !== lang) continue;
        const film = comics.build({ order: 2, course: V.course, seedKey: 'x' }, 'en').comic;
        const dir = path.join(OUT, lang);
        fs.mkdirSync(dir, { recursive: true });
        manifest[lang] = manifest[lang] || {};
        manifest.parler[lang] = manifest.parler[lang] || [];
        const jobs = [];
        film.scenes.forEach((sc, i) => sc.lines.forEach((ln, k) => jobs.push([`${i + 1}-${k}`, ln.who, ln.text])));
        jobs.push(['moral', 'narrator', `${film.moralLabel || 'The moral of the story:'} ${film.moral}`]);
        for (const [n, [key, who, text]] of jobs.entries()) {
            if (n % part[1] !== part[0]) continue;
            if (manifest.parler[lang].includes(key)) continue;
            const raw = await speak(text, V[who] || V.narrator);
            if (!raw) { console.log(`${lang} ${key} ✗ could not be recorded — left for the next run: ${text.slice(0, 48)}`); continue; }
            const src = path.join(dir, `${key}.mp3`);
            fs.writeFileSync(src, raw);
            const m4a = path.join(dir, `${key}.m4a`);
            execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', src, m4a]);
            fs.unlinkSync(src);
            const info = execFileSync('afinfo', [m4a]).toString();
            manifest[lang][key] = Math.round(Number(/estimated duration: ([\d.]+)/.exec(info)?.[1] || 0) * 100) / 100;
            manifest.parler[lang].push(key);
            save(lang, key); made += 1;
            console.log(`${lang} ${key} ✓ ${manifest[lang][key]}s  ${text.slice(0, 48)}`);
        }
    }
    const left = Object.keys(VOICES).filter((l) => !only || only === l).map((l) => `${l}: ${(manifest.parler[l] || []).length}/31`).join(', ');
    console.log(`Done this run: ${made}. Recorded — ${left}.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
