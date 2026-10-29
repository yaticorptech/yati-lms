/**
 * @description Admin → Demo cards (super admin only), mounted at /api/admin/demo-cards:
 *
 *   GET    /                    every demo card (built-in and scanned), with its account
 *   POST   /        { code }    add one: a scanned QR or a typed card number
 *   DELETE /:cardNumber         no longer a demo card (scanned ones only)
 *   POST   /:cardNumber/reset   a fresh start: the account's data wiped, the account kept
 */
const express = require('express');
const Card = require('../models/Card');
const { protectAdmin, superAdminOnly } = require('../middleware/authMiddleware');
const { scanCandidates, findScannedCard } = require('../controllers/registrationController');
const { normaliseCardNumber } = require('../utils/cardNumber');
const demo = require('../services/demoCards');

const router = express.Router();
router.use(protectAdmin, superAdminOnly);
const fail = (res, e, what) => { console.error(`[demo-cards] ${what}:`, e.message); res.status(500).json({ message: `Could not ${what}. Please try again.` }); };

/** The card a scan or a typed number names. */
const cardFor = async (code) => {
    const candidates = scanCandidates(String(code || '').trim());
    if (!candidates.length) return null;
    return findScannedCard(candidates).lean();
};

router.get('/', async (req, res) => {
    try { res.json({ cards: await demo.listDemoCards() }); } catch (e) { fail(res, e, 'load the demo cards'); }
});

router.post('/', async (req, res) => {
    try {
        const card = await cardFor(req.body?.code);
        if (!card) return res.status(404).json({ message: 'That card was not recognised. Scan it again, or type its number.' });
        if (card.status === 'inactive') return res.status(400).json({ message: 'This card is inactive.' });
        // Already on the list (built in, or scanned before): say so rather than add it again.
        const n = normaliseCardNumber(card.CardNumber);
        if (card.demo || require('../services/fullAccess').DEMO_CARDS.has(n)) {
            return res.status(409).json({ code: 'ALREADY_DEMO', cardNumber: n, message: `Card ${n.replace(/(.{4})(?=.)/g, '$1 ')} is already a demo card.` });
        }
        const user = await demo.addDemoCard(card);
        res.status(201).json({ message: `Card ${normaliseCardNumber(card.CardNumber)} is now a demo card (${user.name}). Scanning it opens the dashboard with no password.`, cards: await demo.listDemoCards() });
    } catch (e) { fail(res, e, 'add the demo card'); }
});

router.delete('/:cardNumber', async (req, res) => {
    try {
        const done = await demo.removeDemoCard(req.params.cardNumber);
        if (done.error) return res.status(400).json({ message: done.error });
        res.json({ message: 'Removed from demo cards. It now needs its password again.', cards: await demo.listDemoCards() });
    } catch (e) { fail(res, e, 'remove the demo card'); }
});

router.post('/:cardNumber/reset', async (req, res) => {
    try {
        const n = normaliseCardNumber(req.params.cardNumber);
        if (!require('../services/fullAccess').isDemoCard(n)) return res.status(400).json({ message: 'Only a demo card can be reset here.' });
        const card = await Card.findOne({ CardNumber: { $in: [n, req.params.cardNumber] } }).lean();
        const user = card ? await demo.ensureAccount(card) : await require('../utils/cardNumber').findUserByCardNumber(n);
        if (!user) return res.status(404).json({ message: 'That card has no account to reset.' });
        await demo.resetAccount(user._id);
        res.json({ message: `${user.name} is reset — a brand-new card again.`, cards: await demo.listDemoCards() });
    } catch (e) { fail(res, e, 'reset the card'); }
});

module.exports = router;
