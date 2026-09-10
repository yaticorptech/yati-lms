/** Job Access Verification — the calls. Every call answers the server's `view` (state, steps). The OTP goes into a request body and nowhere else. */
import client from '../../utils/api';
import saveToDrive from '../../integrations/google/saveToDrive';
const unwrap = (err) => {
    const body = err.response?.data, status = err.response?.status;
    const offline = !err.response && (err.code === 'ERR_NETWORK' || /network/i.test(err.message || ''));
    const e = new Error(status === 401 ? 'Your session has expired. Sign in again to continue.' : offline ? 'You appear to be offline. Check your connection and try again.' : body?.error || body?.message || (status >= 500 ? 'Something went wrong on our side. Try again in a moment.' : err.message || 'Something went wrong.'));
    e.code = status === 401 ? 'SESSION_EXPIRED' : offline ? 'OFFLINE' : body?.code || (status >= 500 ? 'SERVER_ERROR' : 'ERROR');
    e.status = status; e.problems = body?.problems || null; e.attemptsLeft = body?.attemptsLeft; e.retryAfter = body?.retryAfter; e.state = body?.state;
    throw e;
};
const get = (p) => client.get(`/jobs/verification${p}`).then((r) => r.data).catch(unwrap);
const post = (p, b) => client.post(`/jobs/verification${p}`, b).then((r) => r.data).catch(unwrap);
export const verificationApi = {
    status: () => get(''), identityStart: () => post('/identity/start'), identityQr: (qrPayload) => post('/identity/qr', { qrPayload }),
    otpSend: (mobile) => post('/identity/otp/send', mobile ? { mobile } : {}), otpVerify: (otp) => post('/identity/otp/verify', { otp }),
    linkedin: (profileUrl) => post('/linkedin', { profileUrl }), advance: () => post('/advance'),
    resumeConfirm: () => post('/resume/confirm'), profileSave: (body) => post('/profile', body),
    // The resume itself is the LMS's one resume per student, the same endpoint the profile page uses.
    resumeGet: () => client.get('/user/resume').then((r) => r.data?.resume || null).catch(unwrap),
    resumeUpload: (file, onProgress) => { const fd = new FormData(); fd.append('resume', file); return client.post('/user/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0) }).then((r) => { saveToDrive(file, { name: file.name, description: 'The resume you uploaded to YATICORP.', ask: false }); return r.data?.resume || null; }).catch(unwrap); }
};
const HANDLE = '[A-Za-z0-9\\-_%.]{3,100}';
const PROFILE = new RegExp(`^(?:https?:\\/\\/)?(?:[a-z]{2,3}\\.)?linkedin\\.com\\/(?:mwlite\\/)?(?:in|pub)\\/(${HANDLE})(?:\\/[A-Za-z0-9\\/]*)?\\/?(?:[?#].*)?$`, 'i');
export const checkLinkedinUrl = (raw) => {
    const t = String(raw || '').trim();
    if (!t) return { ok: false, empty: true, message: 'Enter your LinkedIn profile URL.' };
    if (/\s/.test(t)) return { ok: false, message: 'Please enter a valid LinkedIn profile URL.' };
    if (/^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}/i.test(t) && !/linkedin\.com/i.test(t)) return { ok: false, message: 'That is not a LinkedIn URL. It should look like linkedin.com/in/your-name.' };
    const m = t.match(PROFILE); return m ? { ok: true, handle: m[1] } : { ok: false, message: 'Please enter a valid LinkedIn profile URL.' };
};
