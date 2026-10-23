/**
 * Whether this student has connected their Google account, held once for the
 * whole app.
 *
 * A module store rather than context, so any download button anywhere can ask
 * to save a file without a provider having to sit above it.
 */
import { getStatus } from './api';

let state = { loaded: false, available: false, connected: false, needsReconnect: false, email: '', permissions: [] };
let pending = null;
const listeners = new Set();

const emit = () => {
  for (const fn of listeners) fn();
};

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getSnapshot = () => state;

const set = (patch) => {
  state = { ...state, ...patch };
  emit();
};

/** Load the status once; later callers share the same request. */
export const refresh = (force = false) => {
  if (pending && !force) return pending;
  pending = getStatus()
    .then((data) => {
      set({ ...data, loaded: true });
      return state;
    })
    .catch(() => {
      // Signed out, offline, or the endpoint is not there: the feature simply
      // does not appear rather than showing a broken button.
      set({ loaded: true, available: false });
      return state;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
};

/* ---- The consent request ------------------------------------------------
 * A download that needs Drive raises this rather than opening its own dialog,
 * so the explanation a student reads is written in exactly one place.
 */
let askState = null;

export const consentRequest = () => askState;

/** Ask for consent. Resolves true once connected, false if declined. */
export const requestConsent = (reason) =>
  new Promise((resolve) => {
    askState = { reason, resolve };
    emit();
  });

/*
 * "Not now" holds for the rest of the visit. The question used to come back
 * with every file — five times in one sitting on My Profile — after the
 * student had already said no. A new visit asks again, and the Google card
 * on My Profile and the Calendar connects whenever they like.
 */
const DECLINED_KEY = 'yati:driveDeclined';
export const declinedThisVisit = () => {
  try { return sessionStorage.getItem(DECLINED_KEY) === '1'; } catch { return false; }
};
export const rememberDeclined = () => {
  try { sessionStorage.setItem(DECLINED_KEY, '1'); } catch { /* asked again next file */ }
};

export const settleConsent = (granted) => {
  const req = askState;
  askState = null;
  emit();
  req?.resolve(granted);
};
