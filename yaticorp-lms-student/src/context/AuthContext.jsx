/**
 * @author Preethesh Kulal
 * @description Student authentication context: login, logout, credit system and settings
 */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { getAuthServices } from '../shared/api/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCreditSystemEnabled, setIsCreditSystemEnabled] = useState(true);
    // Defaults open, so a settings request that is slow or fails never hides a
    // section that is actually available. The server is the real gate.
    const [isCareerPathEnabled, setIsCareerPathEnabled] = useState(true);
    const [isJobsEnabled, setIsJobsEnabled] = useState(true);
    const navigate = useNavigate();

    const authService = getAuthServices(api);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('studentToken');
            const userData = localStorage.getItem('studentData');
            if (token && userData) {
                try {
                    setUser(JSON.parse(userData));
                } catch {
                    console.error('Failed to parse user data');
                }
            }

            // Fetch global settings once at startup
            try {
                const res = await api.get('/user/settings');
                setIsCreditSystemEnabled(res.data?.isCreditSystemEnabled ?? true);
                setIsCareerPathEnabled(res.data?.isCareerPathEnabled ?? true);
                setIsJobsEnabled(res.data?.isJobsEnabled ?? true);
            } catch (err) {
                console.error('Failed to load settings in AuthContext:', err);
                setIsCreditSystemEnabled(true);
                setIsCareerPathEnabled(true);
                setIsJobsEnabled(true);
            }

            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (cardNumber, password) => {
        try {
            const data = await authService.login({ cardNumber, password });
            localStorage.setItem('studentToken', data.token);
            localStorage.setItem('studentData', JSON.stringify(data));
            setUser(data);
            navigate('/');
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.message || 'Login failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('studentToken');
        localStorage.removeItem('studentData');
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout, isCreditSystemEnabled, isCareerPathEnabled, isJobsEnabled }}>
            {children}
        </AuthContext.Provider>
    );
};
