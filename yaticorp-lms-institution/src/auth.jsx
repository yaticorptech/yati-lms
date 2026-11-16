/**
 * Who is signed in. There is no sign-in page here: everyone signs in on the
 * admin app's (organization accounts — the organization's own, a department's,
 * the examination board's, the admission office's, a teacher's), which opens
 * Campus with that session (api.js takes it). Campus's /context says which of
 * them it is and what they see. Signing out ends the admin app's session too.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { CAMPUS, TOKEN_KEY, errorOf, toSignIn, toSignOut } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // { status: 'loading' | 'out' | 'in' | 'blocked', context, message }
    const [state, setState] = useState({ status: localStorage.getItem(TOKEN_KEY) ? 'loading' : 'out' });

    const loadContext = useCallback(async () => {
        try {
            const res = await api.get(`${CAMPUS}/context`);
            setState({ status: 'in', context: res.data });
            return { ok: true };
        } catch (err) {
            if (err.response?.status === 401) { setState({ status: 'out' }); toSignIn(); return { ok: false }; }
            setState({ status: 'blocked', code: err.response?.data?.code, message: errorOf(err, 'Could not reach your institution. Check your connection and try again.') });
            return { ok: false };
        }
    }, []);

    useEffect(() => { if (localStorage.getItem(TOKEN_KEY)) loadContext(); else toSignIn(); }, [loadContext]);

    const logout = () => { localStorage.removeItem(TOKEN_KEY); toSignOut(); };

    return <AuthContext.Provider value={{ ...state, logout, reload: loadContext }}>{children}</AuthContext.Provider>;
};
