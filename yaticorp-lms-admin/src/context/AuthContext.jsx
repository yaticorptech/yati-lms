/**
 * @author Preethesh Kulal
 * @description Admin authentication context: login, logout, 2FA, org-scoped session management
 */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // The stored session is available synchronously, so seed it at first render
    // rather than correcting it from an effect (which caused a null-admin flash).
    const [admin, setAdmin] = useState(() => {
        const token = localStorage.getItem('adminToken');
        const adminData = localStorage.getItem('adminData');
        if (token && adminData) {
            try {
                return JSON.parse(adminData);
            } catch {
                console.error('Failed to parse admin data');
            }
        }
        return null;
    });
    // No async bootstrap phase remains; kept in the context shape for consumers.
    const loading = false;
    const navigate = useNavigate();

   const login = async (email, password) => {
    try {
        const res = await api.post('/auth/admin/login', { email, password });

        if (res.data.requires2FA) {
            return { requires2FA: true, adminId: res.data.adminId };
        }

        const { token, ...adminData } = res.data;

        // Clear any stale session from a different org before storing new one
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');

        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminData', JSON.stringify(adminData));

        setAdmin(adminData);
        navigate('/');

        return { success: true };
    } catch (err) {
        return { success: false, error: err.response?.data?.message || 'Login failed' };
    }
};

    const verify2FA = async (adminId, token) => {
    try {
        const res = await api.post('/auth/admin/verify-2fa', { adminId, token });

        const { token: jwtToken, ...adminData } = res.data;

        localStorage.setItem('adminToken', jwtToken);
        localStorage.setItem('adminData', JSON.stringify(adminData));

        setAdmin(adminData);
        navigate('/');

        return { success: true };
    } catch (err) {
        return { success: false, error: err.response?.data?.message || 'Verification failed' };
    }
};

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        setAdmin(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ admin, loading, login, verify2FA, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
