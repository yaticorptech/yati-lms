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

// VITE_API_URL already carries the /api suffix (see .env.example).
const lmsBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: `${lmsBaseURL}/career` });

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
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(copy(hit.response, config));

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
