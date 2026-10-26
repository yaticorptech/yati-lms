/**
 * Text the student app could not translate (Hindi / Kannada), reported by
 * the app as it meets it, so it can be translated next. Kept, de-duplicated,
 * in logs/i18n-missing.json: { "<english text>": { "hi": count, "kn": count } }.
 *
 *   POST /api/i18n/missing   { lang: 'hi'|'kn', texts: [string] }
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const FILE = path.join(__dirname, '../../logs/i18n-missing.json');
let seen = null;
let dirty = false;

const load = () => {
    if (seen) return seen;
    try { seen = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { seen = {}; }
    return seen;
};
// Written at most every 5 seconds.
setInterval(() => {
    if (!dirty) return;
    dirty = false;
    fs.mkdir(path.dirname(FILE), { recursive: true }, () => fs.writeFile(FILE, JSON.stringify(seen, null, 1), () => {}));
}, 5000).unref?.();

router.post('/missing', express.json({ limit: '64kb' }), (req, res) => {
    const lang = req.body?.lang;
    if (!['hi', 'kn'].includes(lang)) return res.status(400).json({ message: 'lang' });
    const texts = (Array.isArray(req.body?.texts) ? req.body.texts : []).slice(0, 200);
    const all = load();
    if (Object.keys(all).length < 50000) {
        for (const t of texts) {
            if (typeof t !== 'string' || t.length < 2 || t.length > 300) continue;
            all[t] = all[t] || {};
            all[t][lang] = (all[t][lang] || 0) + 1;
            dirty = true;
        }
    }
    res.status(204).end();
});

module.exports = router;
