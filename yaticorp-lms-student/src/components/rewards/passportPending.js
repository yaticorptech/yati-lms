/**
 * A passport ID the student arrived with: the sticker's QR opens
 * <app>/passport/<ID>, which keeps the ID here until it is used — at sign-up
 * (the AI Passport step) or by the claim popup once they are signed in.
 */
const KEY = 'yati.passportCode';
const DISMISS_KEY = 'yati.passportPopupDismissedAt';

export const cleanPassport = (raw) => String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 64);

export const setPendingPassport = (code) => { try { localStorage.setItem(KEY, cleanPassport(code)); } catch { /* storage off */ } };
export const getPendingPassport = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
export const clearPendingPassport = () => { try { localStorage.removeItem(KEY); } catch { /* storage off */ } };

/** "Later" hides the popup for a day; a scanned QR link brings it back at once. */
export const dismissPassportPopup = () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* storage off */ } };
export const popupDismissedRecently = () => {
    try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 24 * 60 * 60 * 1000; } catch { return false; }
};
