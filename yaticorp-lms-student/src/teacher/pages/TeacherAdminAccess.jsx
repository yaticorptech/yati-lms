/**
 * Where a super admin lands after pressing "Dashboard" on the admin Teachers
 * page (2026-11-11) — the teacher's twin of pages/AdminAccess.jsx.
 *
 * The one-time code comes in the URL fragment (never sent to a server), is
 * taken out of the address bar at once and traded with the server
 * (POST /api/teacher/auth/admin-access/exchange) for the teacher's two-hour
 * session. It is saved like a teacher sign-in, marked as an administrator's
 * visit (the layout shows a banner with Exit), and the dashboard opens.
 *
 * If a teacher is signed in on this browser as someone else, they are asked
 * first: the admin may be on a shared machine.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import teacherApi, { forgetTeacher, readTeacher, readTeacherAdminView, TEACHER_ADMIN_VIEW, TEACHER_DATA, TEACHER_TOKEN } from '../teacherSession';
import { forgetStudent } from '../../utils/sessionExpiry';

const readCode = () => {
    const match = window.location.hash.match(/(?:^#|&)code=([^&]+)/);
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch { return null; }
};

// One exchange per code: development mode runs the effect twice, and a code works once.
const exchanges = new Map();
const exchange = (code) => {
    if (!exchanges.has(code)) exchanges.set(code, teacherApi.post('/auth/admin-access/exchange', { code }).then((r) => r.data));
    return exchanges.get(code);
};

/** A teacher's own sign-in in this browser (not an administrator's visit), if any. */
const signedInTeacher = () => (readTeacherAdminView() ? null : readTeacher());

const open = (data) => {
    const { viewedBy, token, ...teacher } = data;
    forgetStudent();
    forgetTeacher();
    localStorage.setItem(TEACHER_TOKEN, token);
    localStorage.setItem(TEACHER_DATA, JSON.stringify(teacher));
    localStorage.setItem(TEACHER_ADMIN_VIEW, JSON.stringify({ by: viewedBy || 'Super Admin', name: teacher.name }));
    window.location.replace('/teacher');
};

export default function TeacherAdminAccess() {
    const [code] = useState(readCode);
    const [problem, setProblem] = useState(code ? '' : 'missing');
    const [asking, setAsking] = useState(null);

    useEffect(() => {
        window.history.replaceState(null, '', window.location.pathname);
        if (!code) return undefined;
        let alive = true;
        exchange(code)
            .then((data) => {
                if (!alive) return;
                const current = signedInTeacher();
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
                <div role="dialog" aria-modal="true" aria-labelledby="teacher-access-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
                    <h1 id="teacher-access-title" className="text-lg font-bold text-slate-800">Switch to {data.name}?</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        This browser is signed in as <span className="font-semibold">{current.name || 'another teacher'}</span>.
                        Opening {data.name}&apos;s dashboard will sign them out here.
                    </p>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
                        <button type="button" onClick={() => open(data)} className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                            Open {data.name}&apos;s dashboard
                        </button>
                        <button type="button" onClick={() => window.location.replace('/teacher')} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                            Keep {current.name || 'them'} signed in
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!problem) return <div role="status" className="flex min-h-screen items-center justify-center text-slate-500">Opening the teacher&apos;s dashboard…</div>;
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="font-bold text-slate-800">This link could not be opened.</p>
            <p role="alert" className="text-sm text-slate-500">{problem === 'missing' ? 'Go back to the admin panel and press Dashboard again.' : problem}</p>
            <Link to="/login?as=teacher" className="text-sm font-semibold text-indigo-600">Go to sign in</Link>
        </div>
    );
}
