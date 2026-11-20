/**
 * Where a demo (presentation) card lands when its presenter picks "Organisation" on the student
 * sign-in (2026-11-19; student app: components/DemoDashboardChooser.jsx).
 *
 * The two-minute pass comes in the URL fragment (never sent to a server), is taken out of the
 * address bar at once and traded with the server (POST /api/auth/demo/organization/exchange) for
 * the demo organisation's session. It is saved like an organisation's own sign-in — with the
 * card's switch pass, for the bar that changes to its other dashboards (components/DemoSwitchBar.jsx)
 * — and its dashboard opens.
 *
 * If an administrator is already signed in on this browser, they are asked first: opening the
 * demo organisation signs them out here.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const readCode = () => {
    const match = window.location.hash.match(/(?:^#|&)code=([^&]+)/);
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch { return null; }
};

// One exchange per pass: development mode runs the effect twice.
const exchanges = new Map();
const exchange = (code) => {
    if (!exchanges.has(code)) exchanges.set(code, api.post('/auth/demo/organization/exchange', { code }).then((r) => r.data));
    return exchanges.get(code);
};

/** Whoever is signed in on this browser already, if anyone. */
const signedIn = () => {
    try { return localStorage.getItem('adminToken') ? JSON.parse(localStorage.getItem('adminData') || 'null') : null; } catch { return null; }
};

const open = (data) => {
    const { token, ...adminData } = data;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(adminData));
    // A full load, so the app starts as this account.
    window.location.replace('/organization');
};

const Frame = ({ children }) => (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 p-6">
        <span aria-hidden className="pointer-events-none absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-indigo-600/20 blur-[100px]" />
        <span aria-hidden className="pointer-events-none absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="relative w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">{children}</div>
    </div>
);

export default function DemoAccess() {
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
                const current = signedIn();
                if (current?._id && String(current._id) !== String(data._id)) { setAsking({ data, current }); return; }
                open(data);
            })
            .catch((err) => {
                if (!alive) return;
                setProblem(err.response?.data?.message || (!err.response ? 'Could not reach the server. Check your connection, then scan the demo card again.' : 'missing'));
            });
        return () => { alive = false; };
    }, [code]);

    if (asking) {
        const { data, current } = asking;
        return (
            <Frame>
                <div role="dialog" aria-modal="true" aria-labelledby="demo-access-title">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200"><Building2 size={22} /></span>
                    <h1 id="demo-access-title" className="mt-4 text-lg font-bold text-slate-900">Open {data.organizationName || 'the demo organisation'}?</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        This browser is signed in as <span className="font-semibold">{current.name || current.email || 'another administrator'}</span>.
                        Opening the demo organisation will sign them out here.
                    </p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                        <button type="button" autoFocus onClick={() => open(data)} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200">
                            Open the demo organisation
                        </button>
                        <button type="button" onClick={() => window.location.replace('/')} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200">
                            Stay signed in
                        </button>
                    </div>
                </div>
            </Frame>
        );
    }

    if (!problem) {
        return (
            <Frame>
                <p role="status" className="flex items-center justify-center gap-2 py-4 text-sm font-semibold text-slate-600"><Loader2 size={18} className="animate-spin text-indigo-600" /> Opening the organisation dashboard…</p>
            </Frame>
        );
    }
    return (
        <Frame>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100"><AlertCircle size={22} /></span>
            <h1 className="mt-4 text-lg font-bold text-slate-900">This link could not be opened</h1>
            <p role="alert" className="mt-2 text-sm text-slate-600">{problem === 'missing' ? 'Scan the demo card again on the student sign-in and choose Organisation.' : problem}</p>
            <Link to="/login" className="mt-5 inline-block text-sm font-bold text-indigo-600 hover:text-indigo-700">Go to sign in</Link>
        </Frame>
    );
}
