/**
 * The bar at the top of a dashboard opened with a demo (presentation) card (2026-11-19): says
 * which dashboard this is, and changes to the card's other dashboards — student, teacher, organisation — without
 * signing out and scanning again (DemoDashboardChooser.jsx, utils/demoSwitch.js). Shown while this browser
 * holds the card's switch pass for this dashboard; nothing for anyone else.
 * A demo-card student without the pass (signed in by number and password, or a browser that lost it)
 * asks the server for a fresh one (GET /user/demo-pass, 2026-11-20), so the bar shows for them too.
 */
import React, { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { readDemo, rememberDemo } from '../utils/demoSwitch';
import api from '../utils/api';
import DemoDashboardChooser from './DemoDashboardChooser';

const LABEL = { student: 'Student dashboard', teacher: 'Teacher dashboard' };

const savedStudentIsDemo = () => {
    try { return Boolean(JSON.parse(localStorage.getItem('studentData') || 'null')?.demoCard); } catch { return false; }
};

/** @param {'student'|'teacher'} props.as  the dashboard this bar sits in */
export default function DemoBar({ as, name, demoCard, className = '' }) {
    const [demo, setDemo] = useState(() => readDemo(as));
    const [open, setOpen] = useState(false);
    const isDemoStudent = as === 'student' && (demoCard || savedStudentIsDemo());
    useEffect(() => {
        if (demo || !isDemoStudent) return undefined;
        let live = true;
        api.get('/user/demo-pass').then((r) => {
            if (!live || !r.data?.demoSwitch) return;
            rememberDemo(r.data.demoSwitch, 'student');
            setDemo(readDemo('student'));
        }).catch(() => {});
        return () => { live = false; };
    }, [demo, isDemoStudent]);
    if (!demo) return null;
    return (
        <>
            <div role="status" className={`flex items-center gap-3 bg-[#232740] px-4 py-2 text-sm text-slate-200 ${className}`} data-demo-bar>
                <p className="min-w-0 flex-1 truncate"><span className="font-semibold text-white">{LABEL[as]}</span></p>
                <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                    <ArrowLeftRight size={14} aria-hidden="true" /> Switch<span className="hidden sm:inline"> dashboard</span>
                </button>
            </div>
            {open && <DemoDashboardChooser token={demo.token} current={as} name={name} onClose={() => setOpen(false)} />}
        </>
    );
}
