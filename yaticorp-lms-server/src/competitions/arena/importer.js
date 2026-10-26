/**
 * Generate Question Bank: import the prewritten Quiz Arena questions in
 * ./datasets/*.json into the question bank. No AI and no paid service: the
 * questions are written by people, kept apart from the code, and every one
 * is checked here before it goes in.
 *
 * Each question is:
 *   invalid     refused: four distinct options, exactly one of them the
 *               answer, a category, a difficulty, an explanation, a source
 *               (a reference page, or `computed` for worked arithmetic and
 *               reasoning), a picture for Round 2 (a link with its credit, or
 *               `wikipediaImage`: an article whose actual main picture, and
 *               its licence, the import asks Wikimedia for — a picture that
 *               is not freely licensed is refused), and for Round 3 an event
 *               date and a verification date; a picture that does not load
 *   outdated    refused: a Round 3 event older than the file's maxAgeDays
 *   duplicate   skipped: imported before (its key), or the same question
 *               (same words, same picture) with the same answer already in
 *               the bank, or twice in the import
 *   imported    added as a draft. Marked Needs Review, with the reasons, when
 *               something could not be confirmed automatically: a source link
 *               that did not load or was not checked, wording that tends to be
 *               ambiguous, the same question already in the bank with a
 *               different answer, every Current Affairs question (its answer
 *               can only be confirmed by a person against the source), every
 *               picture fetched from Wikipedia (a person confirms it shows the
 *               answer and gives nothing away)
 *
 * Nothing is approved here: an admin approves each question in the bank.
 * The import runs in the background; its progress and report are read by job
 * id (one import at a time).
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ArenaQuestion, DIFFICULTIES } = require('./models');

const DIR = path.join(__dirname, 'datasets');
const DATASETS = { round1: 'round1.json', round2: 'round2.json', round3: 'round3.json' };
const DAY = 86400000;

const readDataset = (id) => JSON.parse(fs.readFileSync(path.join(DIR, DATASETS[id]), 'utf8'));

/** The datasets, for the import dialog. */
const listDatasets = () => Object.keys(DATASETS).map((id) => {
    const d = readDataset(id);
    return { id, round: d.round, name: d.name, about: d.about, count: (d.questions || []).length };
});

const norm = (s) => String(s || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const isHttps = (u) => { try { return new URL(u).protocol === 'https:'; } catch { return false; } };
const day = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? new Date(`${s}T00:00:00Z`) : null);
const AMBIGUOUS = /\b(all|none|both) of (the )?(above|these)\b|\bboth (a|b) and\b/i;

/**
 * Check one question on its own. Returns { errors, review, outdated }:
 * errors refuse it, review marks it Needs Review, outdated skips it.
 */
const validate = (q, round, { now = Date.now(), maxAgeDays = 365 } = {}) => {
    const errors = []; const review = [];
    if (!q || typeof q !== 'object') return { errors: ['Not a question.'], review, outdated: false };
    if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(String(q.key || ''))) errors.push('Missing or malformed key.');
    const prompt = String(q.prompt || '').trim();
    if (prompt.length < 10 || prompt.length > 500) errors.push('The question must be 10–500 characters.');
    if (!String(q.category || '').trim()) errors.push('No category.');
    if (!DIFFICULTIES.includes(q.difficulty)) errors.push(`Difficulty must be ${DIFFICULTIES.join(', ')}.`);
    if (!String(q.explanation || '').trim()) errors.push('No explanation.');
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o ?? '').trim()) : [];
    if (options.length !== 4 || options.some((o) => !o || o.length > 200)) errors.push('Exactly four options, each 1–200 characters.');
    else if (new Set(options.map(norm)).size !== 4) errors.push('Two options are the same.');
    const matches = options.filter((o) => norm(o) === norm(q.answer)).length;
    if (matches !== 1) errors.push(matches === 0 ? 'The answer is not one of the options.' : 'More than one option matches the answer.');
    if (AMBIGUOUS.test(prompt) || options.some((o) => AMBIGUOUS.test(o) || /^(all|none) of (the )?above$/i.test(o))) review.push('Has an "all/none/both of the above" option or wording: check that exactly one answer is right.');

    if (q.computed !== true || round !== 1) {
        if (!isHttps(q.sourceUrl)) errors.push('No https source link (sourceUrl).');
    }
    if (round === 2) {
        if (q.wikipediaImage) {
            if (!/^[^\s#<>[\]{}|]{1,200}$/.test(String(q.wikipediaImage))) errors.push('wikipediaImage must be a Wikipedia article title, like Taj_Mahal.');
        } else if (q.wikidataLogo) {
            if (!/^[^#<>[\]{}|]{1,200}$/.test(String(q.wikidataLogo))) errors.push('wikidataLogo must be the brand\'s Wikipedia article title, like Google.');
            if (q.crop !== undefined && !(Array.isArray(q.crop) && q.crop.length === 4 && q.crop.every((n) => typeof n === 'number' && n >= 0 && n <= 1) && q.crop[0] + q.crop[2] <= 1 && q.crop[1] + q.crop[3] <= 1)) errors.push('crop must be [left, top, width, height] as fractions of the picture.');
        } else {
            if (!isHttps(q.image)) errors.push('A Picture Challenge question needs an https image link (image) or a Wikipedia article (wikipediaImage).');
            if (!String(q.imageCredit || '').trim()) errors.push('No image credit / licence note (imageCredit).');
        }
    }
    let outdated = false;
    if (round === 3) {
        const event = day(q.eventDate); const checked = day(q.verifiedOn);
        if (!event) errors.push('No event date (eventDate, YYYY-MM-DD).');
        if (!checked) errors.push('No verification date (verifiedOn, YYYY-MM-DD).');
        if (event && event.getTime() > now) errors.push('The event date is in the future.');
        if (checked && checked.getTime() > now) errors.push('The verification date is in the future.');
        if (event && checked && checked < event) errors.push('Verified before the event happened.');
        if (event && now - event.getTime() > maxAgeDays * DAY) outdated = true;
        review.push('Current affairs: confirm the answer against the source before approving.');
    }
    return { errors, review, outdated };
};

/** The options in a fixed order of their own (from the key), so the answer is not always first. */
const arrange = (q) => {
    const seed = crypto.createHash('sha256').update(q.key).digest();
    const order = [0, 1, 2, 3];
    for (let i = 3; i > 0; i -= 1) { const j = seed[i] % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    const options = order.map((i) => String(q.options[i]).trim());
    return { options, answer: options.findIndex((o) => norm(o) === norm(q.answer)) };
};

/** Every job, to wait on one (tests). */
const finished = (job) => new Promise((resolve) => { const t = setInterval(() => { if (job.status !== 'running') { clearInterval(t); resolve(job); } }, 20); });

const strip = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
// Wikimedia asks automated clients to say who they are and how to reach them.
const UA = { 'User-Agent': 'YATICORP-LMS-QuizArena/1.0 (https://yaticorp-lms-admin.vercel.app; question bank import)', 'Api-User-Agent': 'YATICORP-LMS-QuizArena/1.0' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastWiki = 0;
/**
 * JSON from Wikipedia, politely: at most one request a second, and when it
 * says "too many requests" (429) or is briefly unavailable, waiting as long
 * as it asks (or a few seconds, longer each time) and trying again.
 */
const getJson = async (url, fetchImpl) => {
    for (let attempt = 1; ; attempt += 1) {
        const gap = 1000 - (Date.now() - lastWiki);
        if (gap > 0 && fetchImpl === fetch) await sleep(gap);
        lastWiki = Date.now();
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 10000);
        try {
            const res = await fetchImpl(url, { signal: ctl.signal, headers: UA });
            if ((res.status === 429 || res.status === 503) && attempt < 5) {
                const wait = Number(res.headers.get('retry-after')) * 1000 || 3000 * attempt;
                await sleep(Math.min(wait, 30000));
                continue;
            }
            if (!res.ok) throw new Error(`answered ${res.status}`);
            return await res.json();
        } finally { clearTimeout(t); }
    }
};

/**
 * The main picture of a Wikipedia article, as Wikipedia itself names it, with
 * its licence and author from Wikimedia: { ok, url, credit } — or { ok: false,
 * why } when the article has none, or it is not freely licensed (most company
 * logos), or Wikipedia cannot be reached. Nothing is guessed: the address is
 * the one Wikimedia gives.
 */
const WIKI = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query';
const fromWikipedia = async (article, fetchImpl = fetch) => {
    try {
        const a = await getJson(`${WIKI}&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(article)}`, fetchImpl);
        const page = a?.query?.pages?.[0];
        if (!page || page.missing) return { ok: false, why: `there is no Wikipedia article "${article}"` };
        if (!page.pageimage) return { ok: false, why: `the Wikipedia article "${article}" has no main picture` };
        const b = await getJson(`${WIKI}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&titles=${encodeURIComponent(`File:${page.pageimage}`)}`, fetchImpl);
        const info = b?.query?.pages?.[0]?.imageinfo?.[0];
        if (!info) return { ok: false, why: `no details for File:${page.pageimage}` };
        const meta = info.extmetadata || {};
        const licence = strip(meta.LicenseShortName?.value);
        if (String(meta.NonFree?.value || '').toLowerCase() === 'true' || !licence || /fair use|non-free/i.test(licence)) {
            return { ok: false, why: `its picture (File:${page.pageimage}) is not freely licensed${licence ? ` (${licence})` : ''}` };
        }
        const artist = strip(meta.Artist?.value).slice(0, 120);
        return { ok: true, url: info.thumburl || info.url, credit: `${licence}${artist ? ` · ${artist}` : ''} · Wikimedia Commons, File:${page.pageimage}` };
    } catch (err) {
        return { ok: false, why: `Wikipedia could not be reached (${err.name === 'AbortError' ? 'timed out' : err.message})` };
    }
};

/** A Commons file's picture (800px), licence and author — or why it cannot be used. */
const commonsFile = async (file, fetchImpl) => {
    const b = await getJson(`https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&titles=${encodeURIComponent(`File:${file}`)}`, fetchImpl);
    const info = b?.query?.pages?.[0]?.imageinfo?.[0];
    if (!info) return { ok: false, why: `no file File:${file} on Wikimedia Commons` };
    const meta = info.extmetadata || {};
    const licence = strip(meta.LicenseShortName?.value);
    if (String(meta.NonFree?.value || '').toLowerCase() === 'true' || !licence || /fair use|non-free/i.test(licence)) return { ok: false, why: `File:${file} is not freely licensed${licence ? ` (${licence})` : ''}` };
    const artist = strip(meta.Artist?.value).slice(0, 120);
    return { ok: true, url: info.thumburl || info.url, credit: `${licence}${artist ? ` · ${artist}` : ''} · Wikimedia Commons, File:${file}`, file };
};

/**
 * A brand's current logo, as Wikidata records it: its "small logo or icon"
 * (P8972), else its "logo image" (P154) — the current one (preferred, or the
 * latest with no end date) — fetched from Wikimedia Commons with its licence.
 * `title`: the brand's English Wikipedia article.
 */
const fromWikidata = async (title, fetchImpl = fetch) => {
    try {
        const d = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&sites=enwiki&props=claims&titles=${encodeURIComponent(title)}`, fetchImpl);
        const entity = Object.values(d?.entities || {})[0];
        if (!entity || entity.missing !== undefined) return { ok: false, why: `Wikidata has no item for "${title}"` };
        const current = (claims = []) => {
            const live = claims.filter((c) => c.mainsnak?.datavalue && !c.qualifiers?.P582);
            return (live.find((c) => c.rank === 'preferred') || live[live.length - 1])?.mainsnak.datavalue.value || null;
        };
        const file = current(entity.claims?.P8972) || current(entity.claims?.P154);
        if (!file) return { ok: false, why: `Wikidata records no logo for "${title}"` };
        return await commonsFile(file, fetchImpl);
    } catch (err) {
        return { ok: false, why: `Wikidata could not be reached (${err.name === 'AbortError' ? 'timed out' : err.message})` };
    }
};

/**
 * Cut the emblem out of an official logo that also spells out the company's
 * name (most do): `crop` is [left, top, width, height] as fractions of the
 * picture. The cut-out is stored on the platform's own storage under a random
 * name, so neither the picture nor its address gives the answer away. Plain
 * image cropping — no AI.
 */
const cropToEmblem = async (url, crop, fetchImpl = fetch) => {
    const res = await fetchImpl(url, { headers: UA });
    if (!res.ok) throw new Error(`the logo answered ${res.status}`);
    const Jimp = require('jimp');
    const img = await Jimp.read(Buffer.from(await res.arrayBuffer()));
    const [x, y, w, h] = crop;
    const W = img.bitmap.width; const H = img.bitmap.height;
    img.crop(Math.round(x * W), Math.round(y * H), Math.max(1, Math.round(w * W)), Math.max(1, Math.round(h * H))).autocrop({ leaveBorder: 8 });
    const png = await img.getBufferAsync(Jimp.MIME_PNG);
    const { uploadToBunny } = require('../../utils/bunnyStorage');
    return uploadToBunny(png, `${crypto.randomUUID()}.png`, 'quiz-arena');
};

/** Whether a link answers (and, for a picture, with an image). Never throws. */
const reachable = async (url, { image = false, fetchImpl = fetch } = {}) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    try {
        const res = await fetchImpl(url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': 'YATICORP-LMS-QuizArena/1.0 (question bank import)' } });
        const type = res.headers.get('content-type') || '';
        try { await res.body?.cancel?.(); } catch { /* only the headers were wanted */ }
        if (!res.ok) return { ok: false, why: `answered ${res.status}` };
        if (image && !type.startsWith('image/')) return { ok: false, why: `is not an image (${type || 'no type'})` };
        return { ok: true };
    } catch (err) {
        return { ok: false, why: err.name === 'AbortError' ? 'timed out' : 'could not be reached' };
    } finally { clearTimeout(t); }
};

const jobs = new Map();

/**
 * Import the chosen datasets. `checkLinks`: open every picture and source
 * link (pictures that do not load are refused; sources that do not, or are
 * not checked, mark the question Needs Review). Returns the job; the work
 * goes on in the background.
 */
const startImport = ({ datasets = Object.keys(DATASETS), checkLinks = true, adminId = null, organizationId = null, fetchImpl = fetch, now = Date.now(), files: given = null } = {}) => {
    // `organizationId`: a hosting college's own bank (null: the platform's). One import at a time per bank.
    const owner = organizationId ? String(organizationId) : null;
    // Import keys are unique across banks: a college's carry its id in front.
    const keyOf = (k) => (owner ? `${owner}:${k}` : k);
    const running = [...jobs.values()].find((j) => j.status === 'running' && j.owner === owner);
    if (running) return running;
    const chosen = datasets.filter((id) => DATASETS[id]);
    // `files`: datasets passed in directly (tests), instead of read from ./datasets.
    const files = given || chosen.map((id) => ({ id, ...readDataset(id) }));
    const job = {
        id: crypto.randomUUID(), status: 'running', checkLinks, owner,
        total: files.reduce((n, f) => n + (f.questions || []).length, 0), done: 0,
        counts: { imported: 0, needsReview: 0, duplicate: 0, invalid: 0, outdated: 0 },
        problems: [], startedAt: new Date(), finishedAt: null
    };
    jobs.set(job.id, job);
    for (const [id, j] of jobs) if (j.status !== 'running' && now - j.startedAt > 3600000) jobs.delete(id);

    const note = (q, kind, reason) => job.problems.push({ key: q?.key || '(no key)', round: q?.round, kind, reason });
    (async () => {
        for (const file of files) {
            const round = Number(file.round);
            // What the bank already has for this round: by key, and by wording (+ picture).
            const existing = await ArenaQuestion.find({ round, organizationId: owner }).select('prompt imageUrl options answer importKey deletedAt').lean();
            const keys = new Set(existing.map((e) => e.importKey).filter(Boolean));
            // Deleted by an admin: never brought back.
            const deletedKeys = new Set(existing.filter((e) => e.deletedAt && e.importKey).map((e) => e.importKey));
            const byWords = new Map(existing.filter((e) => !e.deletedAt).map((e) => [`${norm(e.prompt)}|${e.imageUrl || ''}`, norm(e.options[e.answer])]));
            for (const q0 of file.questions || []) {
                const q = { ...q0, round };
                try {
                    const { errors, review, outdated } = validate(q, round, { now, maxAgeDays: file.maxAgeDays || 365 });
                    if (errors.length) { job.counts.invalid += 1; note(q, 'invalid', errors.join(' ')); continue; }
                    if (outdated) { job.counts.outdated += 1; note(q, 'outdated', `Event of ${q.eventDate} is older than ${file.maxAgeDays || 365} days.`); continue; }
                    const words = `${norm(q.prompt)}|${q.image || (q.wikipediaImage ? `wiki:${q.wikipediaImage}` : q.wikidataLogo ? `logo:${q.wikidataLogo}` : '')}`;
                    if (deletedKeys.has(keyOf(q.key))) { job.counts.duplicate += 1; note(q, 'duplicate', 'Imported before and deleted by an admin: not brought back.'); continue; }
                    if (keys.has(keyOf(q.key))) { job.counts.duplicate += 1; note(q, 'duplicate', 'Imported before.'); continue; }
                    if (byWords.has(words)) {
                        if (byWords.get(words) === norm(q.answer)) { job.counts.duplicate += 1; note(q, 'duplicate', 'The same question is already in the bank.'); continue; }
                        review.push(`The bank already has this question with a different answer ("${byWords.get(words)}"): one of them is wrong.`);
                    }
                    if (round === 2 && q.wikipediaImage) {
                        // The article's own main picture, freely licensed, or nothing.
                        const pic = await fromWikipedia(q.wikipediaImage, fetchImpl);
                        if (!pic.ok) { job.counts.invalid += 1; note(q, 'invalid', `No picture: ${pic.why}.`); continue; }
                        q.image = pic.url;
                        q.imageCredit = pic.credit;
                        review.push(`Picture: the main picture of the Wikipedia article "${q.wikipediaImage}". Check it shows ${q.answer} and gives nothing away (no visible name or label).`);
                    }
                    if (round === 2 && q.wikidataLogo) {
                        // The brand's current logo as Wikidata records it, freely licensed, or nothing.
                        const pic = await fromWikidata(q.wikidataLogo, fetchImpl);
                        if (!pic.ok) { job.counts.invalid += 1; note(q, 'invalid', `No logo: ${pic.why}.`); continue; }
                        q.image = pic.url;
                        if (Array.isArray(q.crop)) {
                            try { q.image = await cropToEmblem(pic.url, q.crop, fetchImpl); } catch (err) { job.counts.invalid += 1; note(q, 'invalid', `The emblem could not be cut out of the logo: ${err.message}.`); continue; }
                            review.push('The emblem was cut out of the official logo (which spells out the name): check it is cut cleanly.');
                        }
                        q.imageCredit = `${pic.credit}. The logo is a trademark of its owner, shown only to identify the brand.`;
                        review.push(`Logo: the current logo Wikidata records for "${q.wikidataLogo}" (File:${pic.file}). Check it is the brand's logo and does not spell out the brand's name.`);
                    }
                    if (round === 2) {
                        if (checkLinks) {
                            const img = await reachable(q.image, { image: true, fetchImpl });
                            if (!img.ok) { job.counts.invalid += 1; note(q, 'invalid', `The picture ${img.why}.`); continue; }
                        } else review.push('The picture was not checked: open it and confirm it shows the answer.');
                    }
                    if (q.sourceUrl) {
                        if (checkLinks) {
                            const src = await reachable(q.sourceUrl, { fetchImpl });
                            if (!src.ok) review.push(`The source link ${src.why}: check it.`);
                        } else review.push('The source link was not checked.');
                    }
                    const { options, answer } = arrange(q);
                    await ArenaQuestion.create({
                        round, category: q.category, difficulty: q.difficulty, prompt: q.prompt.trim(),
                        imageUrl: q.image || '', imageCredit: q.imageCredit || '',
                        options, answer, explanation: q.explanation,
                        sourceUrl: q.sourceUrl || '', eventDate: day(q.eventDate), verifiedOn: day(q.verifiedOn),
                        status: 'draft', needsReview: review.length > 0, reviewNotes: review,
                        importKey: keyOf(q.key), organizationId: owner, createdBy: adminId
                    });
                    keys.add(keyOf(q.key));
                    byWords.set(words, norm(q.answer));
                    job.counts.imported += 1;
                    if (review.length) { job.counts.needsReview += 1; note(q, 'review', review.join(' ')); }
                } catch (err) {
                    if (err?.code === 11000) { job.counts.duplicate += 1; note(q, 'duplicate', 'Imported before.'); } else { job.counts.invalid += 1; note(q, 'invalid', err.message); }
                } finally {
                    job.done += 1;
                }
            }
        }
        job.status = 'done';
    })().catch((err) => { job.status = 'failed'; job.error = err.message; }).finally(() => { job.finishedAt = new Date(); });
    return job;
};

const getJob = (id) => jobs.get(id) || null;

module.exports = { listDatasets, validate, arrange, reachable, fromWikipedia, fromWikidata, cropToEmblem, startImport, getJob, finished, DATASETS };
