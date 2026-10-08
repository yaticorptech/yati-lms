/**
 * Talking to the Google integration on our own server.
 *
 * The browser never sees a Google token. It asks our server to start the
 * consent flow, and afterwards asks our server to write to Drive or Calendar
 * on the student's behalf.
 */
import axios from 'axios';

const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/integrations/google`;

const client = axios.create({ baseURL: base });
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('studentToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getStatus = () => client.get('/status').then((r) => r.data);
// `returnTo`: the page Google should send the student back to — the one they
// connected from. The server accepts only a plain path in this app.
export const beginConnect = (returnTo = window.location.pathname) =>
  client.post('/connect', { returnTo }).then((r) => r.data);
export const disconnect = () => client.post('/disconnect').then((r) => r.data);
export const saveFile = (payload) => client.post('/drive/save', payload).then((r) => r.data);

export default client;
