/**
 * @description Bring your own Gemini key.
 *
 * Every Gemini call the platform makes for a student goes through
 * `geminiClient()`. It looks up who the call is for (the request-scoped AI
 * context), and if that student has saved their own Google Gemini API key it
 * uses that; otherwise the platform key from the environment. The student's
 * key is stored sealed (AES-256-GCM) and read back only here.
 */
const { GoogleGenAI } = require('@google/genai');
const User = require('../models/User');
const { seal, open } = require('../jobboard/utils/secretBox');
const { currentUserId, currentStore } = require('../career/services/aiContext');

const platformKey = () => String(process.env.GEMINI_API_KEY || '').trim();

/** The student's own key, or '' when they have none. Cached on the request store. */
const ownKeyFor = async (userId) => {
    if (!userId) return '';
    const store = currentStore();
    if (store && store.ownGeminiKey !== undefined && store.ownGeminiKeyFor === String(userId)) return store.ownGeminiKey;
    let key = '';
    try {
        const user = await User.findById(userId).select('+geminiApiKey').lean();
        key = user?.geminiApiKey ? (open(user.geminiApiKey) || '') : '';
    } catch (error) {
        console.error('[ai-key] Could not read the student key, using the platform key:', error.message);
    }
    if (store) { store.ownGeminiKey = key; store.ownGeminiKeyFor = String(userId); }
    return key;
};

/** Which key the current call should use, and whose it is. */
const resolveGeminiKey = async () => {
    const own = await ownKeyFor(currentUserId());
    if (own) return { key: own, own: true };
    return { key: platformKey(), own: false };
};

/** True when the current call runs on the student's own key. */
const usingOwnKey = async () => (await resolveGeminiKey()).own;

/** Can a Gemini call be made for this student at all? */
const aiConfiguredFor = async (userId) => !!platformKey() || !!(await ownKeyFor(userId));

class AiKeyError extends Error {
    constructor(message, code = 'no-key') { super(message); this.name = 'AiKeyError'; this.code = code; this.status = 400; }
}

/** A Gemini client for the current call. Throws when there is no key at all. */
const geminiClient = async () => {
    const { key, own } = await resolveGeminiKey();
    if (!key) {
        throw new AiKeyError('AI features are not available: no Gemini API key is configured. Add your own key in your profile settings.', 'no-key');
    }
    const ai = new GoogleGenAI({ apiKey: key });
    ai.__ownKey = own;
    return ai;
};

const looksLikeInvalidKey = (error) => {
    const text = `${error?.message || ''} ${JSON.stringify(error?.error || '')}`;
    return /API key not valid|API_KEY_INVALID|API key expired|PERMISSION_DENIED|Permission denied/i.test(text)
        || (error?.status === 400 && /key/i.test(text));
};

/**
 * Turn Google's rejection of a student's own key into words that tell them
 * what to do. Anything else comes back unchanged.
 */
const describeKeyError = (error, own) => {
    if (own && looksLikeInvalidKey(error)) {
        return new AiKeyError('Google rejected your Gemini API key. Check it in your profile settings, or remove it to use the platform key.', 'own-key-rejected');
    }
    return error;
};

/** Save, replace or clear a student's own key. */
const saveOwnKey = async (userId, key) => {
    await User.updateOne({ _id: userId }, key
        ? { $set: { geminiApiKey: seal(key), geminiApiKeyAddedAt: new Date() } }
        : { $set: { geminiApiKey: '', geminiApiKeyAddedAt: null } });
};

/** A cheap live call to prove a key works before it is saved. */
const testKey = async (key) => {
    const ai = new GoogleGenAI({ apiKey: key });
    const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    await ai.models.generateContent({ model, contents: 'Reply with the single word OK.', config: { maxOutputTokens: 5 } });
};

const maskKey = (key) => (key ? `${key.slice(0, 4)}…${key.slice(-4)}` : '');

module.exports = { geminiClient, resolveGeminiKey, usingOwnKey, aiConfiguredFor, ownKeyFor, describeKeyError, AiKeyError, saveOwnKey, testKey, maskKey, platformKey };
