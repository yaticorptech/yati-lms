/**
 * @description Axios instance for the Career Path (FuturePath) API.
 *
 * Same host and same session as the rest of the student panel — the token is
 * the LMS `studentToken`, because Career Path has no login of its own. The only
 * difference from ../../utils/api is the `/career` prefix, which is where the
 * ported FuturePath routes are mounted on the server. That prefix is why this
 * is a separate instance rather than a shared one: every ported page and
 * component already calls `api.get('/tasks')`, `api.post('/roadmap/generate')`
 * and so on, and those paths keep working untouched.
 */
import axios from 'axios';
import { onWalletResponse, onWalletError } from '../../utils/walletCharge';

// VITE_API_URL already carries the /api suffix (see .env.example).
const lmsBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: `${lmsBaseURL}/career` });

// Wallet rules: a priced Career Path feature (rebuilding the roadmap) refreshes the balance.
api.interceptors.response.use(onWalletResponse, onWalletError);

/*
 * The section was switched off while the student had it open. The gate in
 * App.jsx only reads the setting once, at start-up, so without this every
 * screen would keep rendering and show each refused call as a load error.
 * A full navigation rather than a router push: it reloads the LMS settings,
 * which hides the Career Path tab and lets CareerGate turn the URL away. The
 * flag stops a page's parallel calls from each starting their own reload.
 */
let leavingLockedSection = false;
api.interceptors.response.use(undefined, (error) => {
  if (
    error?.response?.status === 403 &&
    error.response.data?.code === 'CAREER_PATH_LOCKED' &&
    typeof window !== 'undefined' &&
    !leavingLockedSection
  ) {
    leavingLockedSection = true;
    window.location.assign('/');
  }
  return Promise.reject(error);
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studentToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/*
 * A short-lived cache of GET answers, so going back to a tab already opened
 * shows it at once instead of refetching everything behind the loader.
 *
 * Correctness comes from clearing, not from the timer: any save — here or
 * through the main LMS client — and any progress change wipes the whole cache,
 * so the next read after a change always goes to the server. The TTL only
 * bounds how long a page can lag behind a change made somewhere else (another
 * tab, the server itself). Keyed by token so a different student never sees
 * another's answers. Identical GETs in flight at once share one request.
 */
const TTL_MS = 60 * 1000;
const cache = new Map();     // key -> { at, response }
const inflight = new Map();  // key -> Promise<response>

export const clearCareerCache = () => {
  cache.clear();
  inflight.clear();
};

if (typeof window !== 'undefined') {
  window.addEventListener('yati:progress-changed', clearCareerCache);
}

const send = axios.getAdapter(api.defaults.adapter);

// Every caller gets its own copy, so a page that edits what it was given
// cannot change what the next page reads.
const copy = (response, config) => ({ ...response, config, data: structuredClone(response.data) });

api.defaults.adapter = (config) => {
  if ((config.method || 'get').toLowerCase() !== 'get') {
    clearCareerCache();
    return send(config).finally(clearCareerCache);
  }

  const key = `${config.headers?.Authorization || ''} ${api.getUri(config)}`;
  const hit = cache.get(key);
  // `fresh: true` on the request skips the cache read (it still refills it):
  // for polling an answer that is known to be about to change.
  if (hit && !config.fresh && Date.now() - hit.at < TTL_MS) return Promise.resolve(copy(hit.response, config));

  if (!inflight.has(key)) {
    const request = send(config)
      .then((response) => {
        if (inflight.get(key) === request) cache.set(key, { at: Date.now(), response });
        return response;
      })
      .finally(() => {
        if (inflight.get(key) === request) inflight.delete(key);
      });
    inflight.set(key, request);
  }
  return inflight.get(key).then((response) => copy(response, config));
};

export default api;

/**
 * A 404 read as "there is none yet" — no goal before onboarding, no roadmap
 * before one is generated — while every other failure still rejects. Pages
 * used to catch these calls wholesale, which turned a dropped connection into
 * the same empty answer as a brand-new student.
 */
export const noneIfMissing = (request) =>
  request.catch((error) => {
    if (error?.response?.status === 404) return null;
    throw error;
  });

/**
 * Today's plan from GET /tasks, once it exists.
 *
 * GET /tasks builds the day's plan on the first visit. A page that asks while
 * the planner is building it gets `tasks: []` with `day.status ===
 * 'generating'` — "nothing yet", not "nothing" — and read as an answer it told
 * a student with work waiting that they had none (or, with no history, that
 * they were new). So this waits it out: asks again, past the cache, every
 * couple of seconds, and hands back whatever is there after the last try.
 */
export async function getTodaysPlan({ tries = 10, waitMs = 2500 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const response = await api.get('/tasks', attempt > 1 ? { fresh: true } : undefined);
    if (response.data?.day?.status !== 'generating' || attempt >= tries) return response;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}
