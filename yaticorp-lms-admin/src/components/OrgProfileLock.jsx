/**
 * In place of an organization-panel page while its profile is incomplete
 * (no courses and sections yet, 2026-11-04): the page's outline, blurred and
 * out of reach, behind a lock that goes to Settings → Institution. The
 * dashboard and Settings stay open (layouts/OrgAdminLayout.jsx).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { CARD, BTN } from './orgUi';
import { listOf } from '../utils/orgProfile';

const OrgProfileLock = ({ missing = [] }) => (
    <div className="relative min-h-[70vh]">
        {/* A stand-in for the page: headline tiles and rows, blurred. */}
        <div aria-hidden="true" inert="" className="pointer-events-none select-none space-y-4 opacity-70 blur-[5px]">
            <div className="h-10 w-64 rounded-xl bg-slate-200" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <div key={i} className={`${CARD} h-28 p-4`}><div className="h-3 w-24 rounded bg-slate-200" /><div className="mt-4 h-7 w-16 rounded bg-slate-300" /></div>)}
            </div>
            <div className={`${CARD} space-y-3 p-5`}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-2"><div className="h-3 w-1/3 rounded bg-slate-200" /><div className="h-3 w-1/5 rounded bg-slate-100" /></div>
                        <div className="h-8 w-20 rounded-lg bg-slate-100" />
                    </div>
                ))}
            </div>
        </div>

        <div className="absolute inset-0 flex items-start justify-center p-4 pt-[12vh]">
            <section role="status" aria-labelledby="org-lock-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-2xl shadow-indigo-900/10">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-6 text-white">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Lock size={24} aria-hidden="true" /></span>
                    <h2 id="org-lock-title" className="mt-3 text-lg font-bold">Locked until your profile is complete</h2>
                </div>
                <div className="p-6">
                    <p className="text-sm leading-relaxed text-slate-600">Add your <strong className="text-slate-800">{listOf(missing) || 'details'}</strong> in Settings to unlock this page.</p>
                    <Link to={missing.length === 1 && missing[0] === 'courses and sections' ? '/organization/settings#courses' : '/organization/settings'} className={`${BTN} mt-5 w-full`}>Complete profile <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
            </section>
        </div>
    </div>
);

export default OrgProfileLock;
