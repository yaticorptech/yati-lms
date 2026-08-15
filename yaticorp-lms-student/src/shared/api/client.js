/**
 * @author Preethesh Kulal
 * @description Shared Axios client configuration
 */
import axios from 'axios';

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
        return config;
    });

    return client;
};
