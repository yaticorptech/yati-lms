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

export default api;
