/**
 * @author Preethesh Kulal
 * @description Shared hook for accessing auth context
 */
import { useState } from 'react';
import { getAuthServices } from '../api/authService';

/**
 * Shared hook for Authentication.
 * Handles login and signup logic.
 */
export const useAuth = (apiClient, options = {}) => {
    const { onAuthSuccess } = options;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const authService = getAuthServices(apiClient);

    const login = async (credentials) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authService.login(credentials);
            if (onAuthSuccess) onAuthSuccess(data);
            return data;
        } catch (err) {
            console.error('Login failed:', err);
            const msg = err.response?.data?.message || 'Invalid credentials';
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    };

    const signup = async (userData) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authService.signup(userData);
            if (onAuthSuccess) onAuthSuccess(data);
            return data;
        } catch (err) {
            console.error('Signup failed:', err);
            const msg = err.response?.data?.message || 'Failed to register account';
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        login,
        signup,
        clearError: () => setError(null)
    };
};
