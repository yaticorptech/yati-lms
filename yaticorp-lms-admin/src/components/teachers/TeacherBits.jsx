/**
 * Small pieces of the teacher screens: a status badge, the one-line research
 * summary on a list row, and a labelled form field that shows the server's
 * refusal under itself.
 */
import React from 'react';
import { Route, BookMarked, PenLine } from 'lucide-react';
import { STATUS_LABEL, fmtNum } from './teacherUtils';
import { INPUT, LABEL } from '../orgUi';

const TONE = {
    active: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    inactive: 'bg-red-100 text-red-800'
};

export const TeacherStatus = ({ status }) => (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold leading-5 ${TONE[status] || 'bg-slate-100 text-slate-600'}`}>
        {STATUS_LABEL[status] || status}
    </span>
);

/**
 * Research path progress, papers published, words written in 30 days.
 * Never the writing itself — the server does not send it.
 */
export const TeacherSummary = ({ summary }) => {
    if (!summary) return null;
    const { research, publications, writing } = summary;
    return (
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex min-w-0 items-center gap-1.5" title={research ? `${research.title} — now: ${research.stage}` : 'No research path yet'}>
                <Route size={13} className="shrink-0 text-emerald-600" aria-hidden />
                {research ? <span className="truncate"><strong className="text-slate-800">{research.percent}%</strong> · {research.stage}</span> : <span className="text-slate-400">No research path</span>}
            </span>
            <span className="inline-flex items-center gap-1.5">
                <BookMarked size={13} className="shrink-0 text-violet-600" aria-hidden />
                <span><strong className="text-slate-800">{publications.published}</strong> published of {publications.total}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
                <PenLine size={13} className="shrink-0 text-rose-600" aria-hidden />
                <span><strong className="text-slate-800">{fmtNum(writing.words30)}</strong> words in 30 days</span>
            </span>
        </div>
    );
};

/** A labelled input; `error` (the server's message for this field) shows beneath. */
export const Field = ({ id, label, error, hint, children, ...input }) => (
    <div>
        <label htmlFor={id} className={LABEL}>{label}</label>
        {children || <input id={id} {...input} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} className={`${INPUT} ${error ? 'border-red-400 focus:ring-red-400/40' : ''}`} />}
        {error ? <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
);
