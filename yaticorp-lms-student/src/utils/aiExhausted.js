/**
 * Gemini credits gone (or the student's key refused): every API client calls flagAiExhausted on
 * its responses, and one app-wide popup (components/GeminiExhaustedDialog) offers a new key in
 * three steps. The codes are the server's (career/services/aiQuota.js, utils/userAiKey.js).
 */
export const AI_EXHAUSTED_EVENT = 'yati:ai-exhausted';
const CODES = new Set(['own-key-quota', 'own-key-rejected', 'no-key', 'provider-daily-quota', 'student-daily-cap', 'service-daily-cap']);

/** A failed request, or a plan saved as failed, carrying one of those codes. */
export const flagAiExhausted = (payload) => {
    const data = payload?.response?.data ?? payload?.data;
    const code = data?.code || data?.plan?.code;
    if (code && CODES.has(code) && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AI_EXHAUSTED_EVENT, { detail: { code, message: data.message || data.plan?.error || '' } }));
    }
    return payload;
};
