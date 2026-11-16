/**
 * Indic speech — /api/tts, behind sign-in.
 *
 *   GET /status                      → { enabled, languages }
 *   GET /?text&lang&voice            → audio/wav, read by AI4Bharat's Indic Parler-TTS
 *
 * The model runs in its own service (yaticorp-lms-tts, Python), at
 * INDIC_TTS_URL. Every clip is kept on disk (store.js), so a sentence is made
 * once and then served instantly to every student; scripts/makeIndicAudio.js
 * makes every lesson's clips in advance. Off (503) when INDIC_TTS_URL is not set.
 */
const express = require('express');
const { protectUser } = require('../middleware/authMiddleware');
const store = require('./store');

const router = express.Router();
router.use(protectUser);

router.get('/status', (req, res) => res.json({ enabled: !!store.URL_BASE(), languages: store.URL_BASE() ? store.LANGUAGES : [] }));

router.get('/', async (req, res) => {
    const clip = store.clean(req.query.text, req.query.lang, req.query.voice);
    if (clip.error) return res.status(clip.status).json({ message: clip.error, ...(clip.code ? { code: clip.code } : {}) });
    // ?cached=1 (the audio pack): only a clip already made; 204 at once rather than waiting minutes for the model.
    if (req.query.cached === '1' && !store.has(clip)) return res.status(204).end();
    // A clip already made is served even with the voice service off.
    if (!store.has(clip) && !store.URL_BASE()) return res.status(503).json({ message: 'Indic speech is not set up on this server.', code: 'TTS_OFF' });
    try {
        const file = await store.make(clip);
        res.set('Cache-Control', 'private, max-age=31536000, immutable');
        res.type('audio/wav').sendFile(file);
    } catch (e) {
        console.error('[tts]', e.code || e.response?.status || '', e.message);
        res.status(502).json({ message: 'The voice service did not answer.', code: 'TTS_DOWN' });
    }
});

/*
 * POST /prepare { items: [{ text, lang, voice }] } (2026-11-14): make these clips, answered at once. The app used to
 * wait on one request per clip for minutes while the model made it — six of those filled the browser's connections
 * to this server, and answer checks and pages waited behind them ("Checking…" for ever, "You appear to be offline").
 * Now it asks here once, then fetches each clip with ?cached=1 when it is ready. Made ahead of the background script.
 */
router.post('/prepare', (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 80) : [];
    if (!store.URL_BASE()) return res.status(503).json({ message: 'Indic speech is not set up on this server.', code: 'TTS_OFF' });
    let ready = 0, queued = 0;
    for (const it of items) {
        const clip = store.clean(it?.text, it?.lang, it?.voice);
        if (clip.error) continue;
        if (store.has(clip)) { ready += 1; continue; }
        queued += 1;
        store.make(clip).catch((e) => console.error('[tts prepare]', e.code || e.response?.status || '', e.message));
    }
    res.json({ ready, queued });
});

module.exports = router;
