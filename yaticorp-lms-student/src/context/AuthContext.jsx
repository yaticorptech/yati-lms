/**
 * @author Preethesh Kulal
 * @description Student authentication context: login, logout, credit system and settings
 */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';
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
    const [isGlobalQuizEnabled, setIsGlobalQuizEnabled] = useState(true);
    const [isRewardsEnabled, setIsRewardsEnabled] = useState(true);

    const authService = getAuthServices(api);

    /*
     * One browser, one signed-in student. The login is kept in localStorage,
     * which every tab shares, but each tab read the student's name once, when
     * it opened. So after another account signed in in a second tab, the first
     * tab kept showing its old name while every request it made went out as
     * the new account — one student's application appeared under another's
     * name. Now, the moment the saved login changes in any tab (signed in,
     * signed out, or someone else), every other tab reloads, so a tab always
     * shows the account it is actually using. Two accounts side by side need
     * two browsers, or a private window.
     */
    useEffect(() => {
        const onStorage = (e) => {
            // e.key is null when storage was cleared altogether.
            if (e.key !== null && e.key !== 'studentToken') return;
            if (e.key === 'studentToken' && e.oldValue === e.newValue) return;
            window.location.reload();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

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
                setIsGlobalQuizEnabled(res.data?.isGlobalQuizEnabled ?? true);
                setIsRewardsEnabled(res.data?.isRewardsEnabled ?? true);
            } catch (err) {
                console.error('Failed to load settings in AuthContext:', err);
                setIsCreditSystemEnabled(true);
                setIsCareerPathEnabled(true);
                setIsJobsEnabled(true);
                setIsGlobalQuizEnabled(true);
                setIsRewardsEnabled(true);
            }

            setLoading(false);
        };
        initAuth();
    }, []);

    /**
     * A student has just signed in or signed up: keep the session and open the
     * dashboard. A full load, not a client-side move: caches held in memory
     * (Career Path's reads, the rewards summary) belong to whoever was signed
     * in before, and must not be shown to this student.
     */
    const enterApp = (data) => {
        localStorage.setItem('studentToken', data.token);
        localStorage.setItem('studentData', JSON.stringify(data));
        setUser(data);
        window.location.assign('/');
    };

    const login = async (cardNumber, password) => {
        try {
            const data = await authService.login({ cardNumber, password });
            enterApp(data);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.message || 'Login failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('studentToken');
        localStorage.removeItem('studentData');
        setUser(null);
        // A full load, for the same reason as after signing in.
        window.location.assign('/login');
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout, enterApp, isCreditSystemEnabled, isCareerPathEnabled, isJobsEnabled, isGlobalQuizEnabled, isRewardsEnabled }}>
            {children}
        </AuthContext.Provider>
    );
};
