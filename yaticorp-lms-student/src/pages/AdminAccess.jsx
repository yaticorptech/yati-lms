/**
 * Where a superadmin lands after pressing "Dashboard" on the admin Users page.
 *
 * The admin panel puts the student's sign-in (the same payload a login
 * returns, with a two-hour token) in the URL fragment, which the browser never
 * sends to a server. It is taken out of the address bar at once, saved like any
 * sign-in, and marked as an administrator's visit so the layout can show a
 * banner with a way out. Then the dashboard opens with a full load, as after
 * any sign-in.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export const ADMIN_VIEW_KEY = 'adminViewing';

const readAccess = () => {
    const match = window.location.hash.match(/access=([^&]+)/);
    if (!match) return null;
    try {
        const data = JSON.parse(decodeURIComponent(match[1]));
        return data?.token && data?._id ? data : null;
    } catch {
        return null;
    }
};

const AdminAccess = () => {
    // Read once, on the first render, before the fragment is cleared.
    const [data] = useState(readAccess);
    const failed = !data;

    useEffect(() => {
        // Out of the address bar and the history before anything else.
        window.history.replaceState(null, '', window.location.pathname);
        if (!data) return;

        const { viewedBy, ...student } = data;
        localStorage.setItem('studentToken', student.token);
        localStorage.setItem('studentData', JSON.stringify(student));
        localStorage.setItem(ADMIN_VIEW_KEY, JSON.stringify({ by: viewedBy || 'Super Admin', name: student.name }));
        window.location.replace('/');
    }, [data]);

    if (!failed) {
        return <div className="flex min-h-screen items-center justify-center text-slate-500">Opening the student's dashboard…</div>;
    }
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="font-bold text-slate-800">This link could not be opened.</p>
            <p className="text-sm text-slate-500">Go back to the admin panel and press Dashboard again.</p>
            <Link to="/login" className="text-sm font-semibold text-indigo-600">Go to sign in</Link>
        </div>
    );
};

export default AdminAccess;
