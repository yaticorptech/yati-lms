/**
 * @author Preethesh Kulal
 * @description Shared Axios client configuration
 */
import axios from 'axios';
import { onWalletResponse, onWalletError, askWallet } from '../../utils/walletCharge';
import { expireSessionOn401 } from '../../utils/sessionExpiry';
import { onSaved } from '../../utils/saveSignal';

/**
 * Creates a shared axios client that can be used by both Web and Mobile.
 * 
 * @param {Object} options
 * @param {string} options.baseURL - The API base URL
 * @param {function} options.getToken - A function that returns the auth token
 */
export const createClient = ({ baseURL, getToken }) => {
    const client = axios.create({
        baseURL: baseURL || 'http://localhost:5000/api',
    });

    client.interceptors.request.use(async (config) => {
        if (getToken) {
            const token = await getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        // Priced features ask before taking money (utils/walletCharge).
        return askWallet(config);
    });

    // Wallet rules: a priced request refreshes the balance; a refusal is readable.
    // A 401 ends the session the same way as the main client (utils/sessionExpiry).
    client.interceptors.response.use(onWalletResponse, (error) => { expireSessionOn401(error); return onWalletError(error, client); });
    // Every save is announced, for whatever follows XP (utils/saveSignal).
    client.interceptors.response.use(onSaved);

    return client;
};
