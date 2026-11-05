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

module.exports = router;
