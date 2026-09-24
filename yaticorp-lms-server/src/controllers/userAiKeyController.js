/**
 * @description A student's own Gemini API key: see whether one is saved, save
 * one (after a live check that Google accepts it), or remove it.
 */
const { ownKeyFor, saveOwnKey, testKey, maskKey, platformKey } = require('../utils/userAiKey');
const User = require('../models/User');

// Google issues keys in more than one shape ("AIza…" and the newer "AQ.…"),
// so only rule out things that plainly are not a key; the live check decides.
const KEY_SHAPE = /^[!-~]{30,200}$/;

// @desc    Whether the student has their own Gemini key
// @route   GET /api/user/ai-key
// @access  Private/User
const getAiKey = async (req, res) => {
    try {
        const key = await ownKeyFor(req.user._id);
        const user = await User.findById(req.user._id).select('geminiApiKeyAddedAt').lean();
        res.json({
            hasKey: !!key,
            masked: maskKey(key),
            addedAt: key ? user?.geminiApiKeyAddedAt || null : null,
            platformKeyAvailable: !!platformKey()
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Save the student's own Gemini key after checking it works
// @route   PUT /api/user/ai-key
// @access  Private/User
const setAiKey = async (req, res) => {
    try {
        const key = String(req.body?.key || '').trim();
        if (!KEY_SHAPE.test(key)) {
            return res.status(400).json({ message: 'That does not look like a Gemini API key. Paste the whole key from Google AI Studio, with no spaces.' });
        }
        try {
            await testKey(key);
        } catch (error) {
            const detail = error?.message || '';
            const why = /API key not valid|API_KEY_INVALID/i.test(detail) ? 'Google says this key is not valid.'
                : /expired/i.test(detail) ? 'Google says this key has expired.'
                : /PERMISSION_DENIED|Permission denied/i.test(detail) ? 'Google refused this key for the Gemini API. Check that the Generative Language API is enabled for it.'
                : /429|quota|RESOURCE_EXHAUSTED/i.test(detail) ? 'The key works but its quota is used up right now. Try again later.'
                : 'Google could not accept this key right now.';
            return res.status(400).json({ message: `${why} The key was not saved.` });
        }
        await saveOwnKey(req.user._id, key);
        res.json({ message: 'Your Gemini API key is saved. AI features now run on your own key.', hasKey: true, masked: maskKey(key), addedAt: new Date() });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Remove the student's own Gemini key
// @route   DELETE /api/user/ai-key
// @access  Private/User
const deleteAiKey = async (req, res) => {
    try {
        await saveOwnKey(req.user._id, '');
        res.json({ message: platformKey() ? 'Your key is removed. AI features use the platform key again.' : 'Your key is removed. AI features are unavailable until a key is added.', hasKey: false, platformKeyAvailable: !!platformKey() });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { getAiKey, setAiKey, deleteAiKey };
