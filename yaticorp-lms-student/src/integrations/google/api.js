/**
 * Talking to the Google integration on our own server.
 *
 * The browser never sees a Google token. It asks our server to start the
 * consent flow, and afterwards asks our server to write to Drive or Calendar
 * on the student's behalf.
 */
import axios from 'axios';
import { deviceHeaders } from '../../utils/deviceId';
import { expireSessionOn401 } from '../../utils/sessionExpiry';

const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/integrations/google`;

const client = axios.create({ baseURL: base });
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('studentToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  Object.assign(config.headers, deviceHeaders());
  return config;
});

// A 401 from our own guard means the student's session is over
// (utils/sessionExpiry). The integration's controller also answers 401 when
// *Google* refused the student's Google link ("Could not …", server
// integrations/google/controller.js) — that is not our session, so it is left
// to the card to show rather than signing the student out.
client.interceptors.response.use(undefined, (error) => {
  const googleRefused = /^Could not /.test(String(error?.response?.data?.message || ''));
  if (!googleRefused) expireSessionOn401(error);
  return Promise.reject(error);
});

export const getStatus = () => client.get('/status').then((r) => r.data);
// `returnTo`: the page Google should send the student back to — the one they
// connected from. The server accepts only a plain path in this app.
export const beginConnect = (returnTo = window.location.pathname) =>
  client.post('/connect', { returnTo }).then((r) => r.data);
export const disconnect = () => client.post('/disconnect').then((r) => r.data);
export const saveFile = (payload) => client.post('/drive/save', payload).then((r) => r.data);

export default client;
