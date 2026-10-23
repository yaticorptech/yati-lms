/**
 * Where a superadmin lands after pressing "Dashboard" on the admin Users page.
 *
 * The admin panel puts a one-time code in the URL fragment, which the browser
 * never sends to a server. It is taken out of the address bar at once and
 * traded with the server (POST /api/auth/admin-access/exchange) for the
 * student's sign-in: the same payload a login returns, with a two-hour token.
 * That is saved like any sign-in and marked as an administrator's visit so
 * the layout can show a banner with a way out. Then the dashboard opens with a
 * full load, as after any sign-in.
 *
 * It used to carry the sign-in itself, and this page saved whatever token
 * arrived — so a link anyone made could quietly sign a browser in to an
 * account of their choosing. The code lasts two minutes and works once.
 *
 * If a student is already signed in in this browser as someone else, they are
 * asked before being signed out: the admin may have opened the link on a
 * shared machine.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { ADMIN_VIEW_KEY, forgetStudent } from '../utils/sessionExpiry';

export { ADMIN_VIEW_KEY };

const readCode = () => {
    const match = window.location.hash.match(/(?:^#|&)code=([^&]+)/);
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch { return null; }
};

/**
 * One exchange per code. React's development mode runs the effect below
 * twice, and a code works once — the second exchange would fail and show
 * "expired" over a session that had in fact opened.
 */
const exchanges = new Map();
const exchange = (code) => {
    if (!exchanges.has(code)) exchanges.set(code, api.post('/auth/admin-access/exchange', { code }).then((r) => r.data));
    return exchanges.get(code);
};

/** A student's own sign-in in this browser (not an administrator's visit), if any. */
const signedInStudent = () => {
    try {
        if (!localStorage.getItem('studentToken') || localStorage.getItem(ADMIN_VIEW_KEY)) return null;
        return JSON.parse(localStorage.getItem('studentData') || 'null');
    } catch {
        return null;
    }
};

const open = (data) => {
    const { viewedBy, ...student } = data;
    forgetStudent();
    localStorage.setItem('studentToken', student.token);
    localStorage.setItem('studentData', JSON.stringify(student));
    localStorage.setItem(ADMIN_VIEW_KEY, JSON.stringify({ by: viewedBy || 'Super Admin', name: student.name }));
    window.location.replace('/');
};

const AdminAccess = () => {
    // Read once, on the first render, before the fragment is cleared.
    const [code] = useState(readCode);
    const [problem, setProblem] = useState(code ? '' : 'missing');
    // { data, current }: someone else is signed in here; asking first.
    const [asking, setAsking] = useState(null);

    useEffect(() => {
        // Out of the address bar and the history before anything else.
        window.history.replaceState(null, '', window.location.pathname);
        if (!code) return undefined;
        let alive = true;
        exchange(code)
            .then((data) => {
                if (!alive) return;
                const current = signedInStudent();
                if (current?._id && String(current._id) !== String(data._id)) { setAsking({ data, current }); return; }
                open(data);
            })
            .catch((err) => {
                if (!alive) return;
                setProblem(err.response?.data?.message
                    || (!err.response ? 'Could not reach the server. Check your connection, then press Dashboard again.' : 'missing'));
            });
        return () => { alive = false; };
    }, [code]);

    if (asking) {
        const { data, current } = asking;
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
                <div role="dialog" aria-modal="true" aria-labelledby="admin-access-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
                    <h1 id="admin-access-title" className="text-lg font-bold text-slate-800">Switch to {data.name}?</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        This browser is signed in as <span className="font-semibold">{current.name || 'another student'}</span>.
                        Opening {data.name}&apos;s dashboard will sign them out here.
                    </p>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
                        <button type="button" onClick={() => open(data)}
                            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
                            Open {data.name}&apos;s dashboard
                        </button>
                        <button type="button" onClick={() => window.location.replace('/')}
                            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                            Keep {current.name || 'them'} signed in
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!problem) {
        return <div role="status" className="flex min-h-screen items-center justify-center text-slate-500">Opening the student&apos;s dashboard…</div>;
    }
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="font-bold text-slate-800">This link could not be opened.</p>
            <p role="alert" className="text-sm text-slate-500">{problem === 'missing' ? 'Go back to the admin panel and press Dashboard again.' : problem}</p>
            <Link to="/login" className="text-sm font-semibold text-indigo-600">Go to sign in</Link>
        </div>
    );
};

export default AdminAccess;
