/**
 * The signed-in teacher for the teacher pages: what the device saved at
 * sign-in, refreshed from the server on arrival, so details changed on
 * another device show here too.
 */
import { useCallback, useEffect, useState } from 'react';
import { TeacherContext } from './useTeacher';
import teacherApi, { readTeacher, signOutTeacher, TEACHER_DATA, TEACHER_TOKEN } from './teacherSession';

export function TeacherProvider({ children }) {
    const [teacher, setTeacherState] = useState(readTeacher);

    const setTeacher = useCallback((next) => {
        setTeacherState(next);
        try { localStorage.setItem(TEACHER_DATA, JSON.stringify(next)); } catch { /* shown, just not kept */ }
    }, []);

    useEffect(() => {
        teacherApi.get('/me').then((r) => setTeacher(r.data)).catch(() => { /* a 401 is handled by the client */ });
    }, [setTeacher]);

    // One person per browser, as for students: a sign-in or sign-out in
    // another tab reloads this one, so it never shows the wrong account.
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key !== null && e.key !== TEACHER_TOKEN && e.key !== 'studentToken') return;
            if (e.oldValue === e.newValue) return;
            window.location.reload();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return <TeacherContext.Provider value={{ teacher, setTeacher, signOut: signOutTeacher }}>{children}</TeacherContext.Provider>;
}
