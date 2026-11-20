/**
 * Where a demo (presentation) card lands when its presenter changes dashboard from the
 * organisation panel — another app — to Student or Teacher (2026-11-19).
 *
 * The card's switch pass and the dashboard wanted come in the URL fragment (never sent to a
 * server), are taken out of the address bar at once, and the pass is traded for that dashboard's
 * session (utils/demoSwitch.js; POST /api/auth/demo/open), which then opens.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { openDemoDashboard } from '../utils/demoSwitch';

const read = () => {
    const hash = window.location.hash;
    const part = (k) => { const m = hash.match(new RegExp(`(?:^#|&)${k}=([^&]+)`)); try { return m ? decodeURIComponent(m[1]) : ''; } catch { return ''; } };
    const to = part('to');
    return { to: to === 'teacher' ? 'teacher' : to === 'student' ? 'student' : '', token: part('token') };
};

// One trade per pass: development mode runs the effect twice.
const opening = new Map();
const openOnce = ({ to, token }) => {
    if (!opening.has(token)) opening.set(token, openDemoDashboard(token, to));
    return opening.get(token);
};

export default function DemoSwitch() {
    const [ask] = useState(read);
    const [problem, setProblem] = useState(ask.to && ask.token ? '' : 'missing');

    useEffect(() => {
        window.history.replaceState(null, '', window.location.pathname);
        if (!ask.to || !ask.token) return undefined;
        let alive = true;
        openOnce(ask).catch((err) => {
            if (alive) setProblem(err.response?.data?.message || (!err.response ? 'Could not reach the server. Check your connection, then try again.' : 'missing'));
        });
        return () => { alive = false; };
    }, [ask]);

    if (!problem) return <div role="status" className="flex min-h-screen items-center justify-center bg-[#171a2b] text-slate-300">Opening the {ask.to} dashboard…</div>;
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#171a2b] p-6 text-center">
            <p className="font-bold text-white">This dashboard could not be opened.</p>
            <p role="alert" className="max-w-sm text-sm text-slate-400">{problem === 'missing' ? 'Scan the demo card again on the sign-in page.' : problem}</p>
            <Link to="/login" className="text-sm font-semibold text-indigo-300 hover:text-indigo-200">Go to sign in</Link>
        </div>
    );
}
