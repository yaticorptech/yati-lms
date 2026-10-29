/**
 * @author Preethesh Kulal
 * @description Student authentication context: login, logout, credit system and settings
 */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';
import { forgetTeacher } from '../teacher/teacherSession';
import api from '../utils/api';
import { getAuthServices } from '../shared/api/authService';
import { forgetStudent, safeNextPath } from '../utils/sessionExpiry';

export const AuthContext = createContext();

/**
 * The student saved on this device, read straight away rather than after the
 * first render, so the app opens on the dashboard without a loading screen.
 * Whether the server still accepts that login is found out by the first
 * request: a 401 signs them out (utils/sessionExpiry).
 */
const readSavedStudent = () => {
    try {
        const token = localStorage.getItem('studentToken');
        const data = localStorage.getItem('studentData');
        return token && data ? JSON.parse(data) : null;
    } catch {
        console.error('Failed to parse user data');
        return null;
    }
};

const hasSavedToken = () => {
    try { return !!localStorage.getItem('studentToken'); } catch { return false; }
};

/**
 * How long the start-up settings read may take. It used to have no limit, and
 * the whole app waited on it — a slow server meant a loading screen with no
 * end. Only this request is limited: AI answers and uploads go through the
 * same client and can rightly take minutes.
 */
const SETTINGS_TIMEOUT_MS = 10000;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(readSavedStudent);
    // Only the section switches below wait on this; the app itself renders
    // from the saved student while it loads.
    const [settingsLoading, setSettingsLoading] = useState(hasSavedToken);
    const [isCreditSystemEnabled, setIsCreditSystemEnabled] = useState(true);
    // Defaults open, so a settings request that is slow or fails never hides a
    // section that is actually available. The server is the real gate.
    const [isCareerPathEnabled, setIsCareerPathEnabled] = useState(true);
    const [isJobsEnabled, setIsJobsEnabled] = useState(true);
    const [isGlobalQuizEnabled, setIsGlobalQuizEnabled] = useState(true);
    const [isRewardsEnabled, setIsRewardsEnabled] = useState(true);
    const [isLinguisticEnabled, setIsLinguisticEnabled] = useState(true);

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
        // Fetch global settings once at startup — when someone is signed in.
        // The endpoint needs a student, so on the login page it only ever
        // answered 401 and logged an error; the defaults above are what
        // that failure fell back to anyway, and signing in reloads the app.
        if (!hasSavedToken()) return undefined;
        let alive = true;
        api.get('/user/settings', { timeout: SETTINGS_TIMEOUT_MS })
            .then((res) => {
                if (!alive) return;
                setIsCreditSystemEnabled(res.data?.isCreditSystemEnabled ?? true);
                setIsCareerPathEnabled(res.data?.isCareerPathEnabled ?? true);
                setIsJobsEnabled(res.data?.isJobsEnabled ?? true);
                setIsGlobalQuizEnabled(res.data?.isGlobalQuizEnabled ?? true);
                setIsRewardsEnabled(res.data?.isRewardsEnabled ?? true);
                setIsLinguisticEnabled(res.data?.isLinguisticEnabled ?? true);
            })
            .catch((err) => {
                if (!alive) return;
                // The saved login is no longer accepted: the client has already
                // cleared it and is on its way to the sign-in page
                // (utils/sessionExpiry); stop showing it as signed in meanwhile.
                if (err?.response?.status === 401) { setUser(null); return; }
                // Slow (timed out) or failed: carry on with everything open.
                console.error('Failed to load settings in AuthContext:', err);
            })
            .finally(() => { if (alive) setSettingsLoading(false); });
        return () => { alive = false; };
    }, []);

    /**
     * A student has just signed in or signed up: keep the session and open the
     * page they were heading for (`next`, a path in this app; the dashboard
     * otherwise). A full load, not a client-side move: caches held in memory
     * (Career Path's reads, the rewards summary) belong to whoever was signed
     * in before, and must not be shown to this student. Nothing is put into
     * state first — that started the new student's dashboard requests in this
     * page, only for the reload to throw them away and make them again.
     */
    const enterApp = (data, next) => {
        // A real sign-in ends any administrator's visit in this browser, and
        // whatever this tab remembered about the previous student. Sign-up's
        // organization notice is for this one, so it stays.
        forgetStudent({ keep: ['yati.signupOrg'] });
        // One person per browser: a student signing in ends a teacher's session here.
        forgetTeacher();
        localStorage.setItem('studentToken', data.token);
        localStorage.setItem('studentData', JSON.stringify(data));
        window.location.assign(safeNextPath(next));
    };

    const login = async (cardNumber, password, next) => {
        try {
            const data = await authService.login({ cardNumber, password });
            enterApp(data, next);
            return { success: true };
        } catch (err) {
            return {
                success: false,
                // TEACHER_CARD: the sign-in page offers the teacher sign-in instead.
                // DEVICE_LIMIT: a 3rd device; `device` is what the popup shows (components/DeviceLimitDialog).
                code: err.response?.data?.code,
                device: err.response?.data?.code === 'DEVICE_LIMIT' ? err.response.data : null,
                error: err.response?.data?.message
                    || (!err.response ? 'Check your connection and try again.' : 'Login failed')
            };
        }
    };

    /** Swap this device in for one of the student's others (the yearly removal), then enter. */
    const replaceDevice = async (ticket, removeDeviceId, next) => {
        try {
            enterApp(await authService.replaceDevice(ticket, removeDeviceId), next);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.message || 'Could not remove that device. Try again.', canRemoveAt: err.response?.data?.canRemoveAt || null };
        }
    };

    const logout = () => {
        forgetStudent();
        setUser(null);
        // A full load, for the same reason as after signing in.
        window.location.assign('/login');
    };

    return (
        // `loading` is kept for anything that still reads it; it now means
        // the settings, which only the section gates wait for.
        <AuthContext.Provider value={{ user, setUser, loading: settingsLoading, settingsLoading, login, replaceDevice, logout, enterApp, isCreditSystemEnabled, isCareerPathEnabled, isJobsEnabled, isGlobalQuizEnabled, isRewardsEnabled, isLinguisticEnabled }}>
            {children}
        </AuthContext.Provider>
    );
};
