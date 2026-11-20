/**
 * The bar at the top of a dashboard opened with a demo (presentation) card (2026-11-19): says
 * which dashboard this is, and changes to the card's other dashboards — student, teacher, organisation — without
 * signing out and scanning again (DemoDashboardChooser.jsx, utils/demoSwitch.js). Shown only
 * while this browser holds the card's switch pass for this dashboard; nothing for anyone else.
 */
import React, { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { readDemo } from '../utils/demoSwitch';
import DemoDashboardChooser from './DemoDashboardChooser';

const LABEL = { student: 'Student dashboard', teacher: 'Teacher dashboard' };

/** @param {'student'|'teacher'} props.as  the dashboard this bar sits in */
export default function DemoBar({ as, name, className = '' }) {
    const [demo] = useState(() => readDemo(as));
    const [open, setOpen] = useState(false);
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
