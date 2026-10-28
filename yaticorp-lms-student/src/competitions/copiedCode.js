/**
 * Whether a student has copied their joining code (asked 2026-10-27): Join
 * stays hidden until they have, in the pop-up or on the competition's page,
 * so they have the code in hand when the join page asks for it. Kept for the
 * browser tab, by code.
 */
const key = (code) => `joinCodeCopied:${code}`;
export const markCopied = (code) => { try { sessionStorage.setItem(key(code), '1'); } catch { /* not kept: they copy again */ } };
export const wasCopied = (code) => { try { return sessionStorage.getItem(key(code)) === '1'; } catch { return false; } };
