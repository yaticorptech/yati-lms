/**
 * @author Preethesh Kulal
 * @description Axios instance for student API calls with auth token interceptor
 */
import axios from 'axios';
import { clearCareerCache } from '../career/services/api';
import { onWalletResponse, onWalletError, askWallet } from './walletCharge';
import { expireSessionOn401 } from './sessionExpiry';
import { onSaved } from './saveSignal';

const apiBaseURL = import.meta.env.VITE_API_URL;

if (!apiBaseURL) {
    console.warn(
        '[API] WARNING: VITE_API_URL environment variable is not set. ' +
        'All API requests will fall back to http://localhost:5000/api.'
    );
}

const api = axios.create({
    baseURL: apiBaseURL || 'http://localhost:5000/api',
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('studentToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // A save anywhere in the LMS (a finished lesson, a redeemed reward) can
    // change what Career Path shows, so its cached reads are dropped.
    if ((config.method || 'get').toLowerCase() !== 'get') clearCareerCache();
    // Priced features ask before taking money (utils/walletCharge).
    return askWallet(config);
});

const clearAfterSave = (config) => {
    if (config && (config.method || 'get').toLowerCase() !== 'get') clearCareerCache();
};
// No default timeout on purpose: AI answers and uploads can take minutes.
// A request that needs a limit (the start-up settings read) sets its own.
api.interceptors.response.use(
    (response) => { clearAfterSave(response.config); return onSaved(onWalletResponse(response)); },
    // A 401 means the session is over (sessionExpiry.js): signed out, back to
    // the sign-in page. The error still reaches the caller.
    (error) => {
        clearAfterSave(error.config); expireSessionOn401(error);
        // Outside the organization's access hours: the layout shows when it opens (components/PlatformClosed).
        if (error.response?.status === 423 && error.response.data?.code === 'PLATFORM_CLOSED') {
            window.dispatchEvent(new CustomEvent('yati:platform-closed', { detail: error.response.data }));
        }
        return onWalletError(error, api);
    }
);

export default api;
