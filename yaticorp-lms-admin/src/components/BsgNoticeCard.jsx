/**
 * One Bharat Scouts & Guides notice — an exam, camp or event — as Scouts &
 * Guides and their institutions see it: when, where, for which sections, the
 * rank to hold, and the rules (what to know or bring). `actions` adds the
 * office's own edit and remove buttons.
 */
import React from 'react';
import { CalendarDays, MapPin, ListChecks, Award } from 'lucide-react';
import { CARD } from './orgUi';
import { formatDate } from '../utils/dates';
import { NOTICE_KIND_LABEL, SECTION_LABEL } from '../utils/bsg';

const TONE = { exam: 'bg-rose-100 text-rose-700', camp: 'bg-emerald-100 text-emerald-700', event: 'bg-sky-100 text-sky-700', training: 'bg-violet-100 text-violet-700', rules: 'bg-amber-100 text-amber-800', notice: 'bg-slate-100 text-slate-700' };

const BsgNoticeCard = ({ notice: n, actions }) => (
    <article className={`${CARD} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONE[n.kind] || TONE.notice}`}>{NOTICE_KIND_LABEL[n.kind] || 'Notice'}</span>
                    {n.from && <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{n.from}</span>}
                </div>
                <h3 className="mt-1.5 text-base font-black text-slate-900">{n.title}</h3>
            </div>
            {actions}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            {n.kind === 'rules'
                ? <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-indigo-500" />In force since {formatDate(n.date)}</span>
                : <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-indigo-500" />{formatDate(n.date)}{n.endDate ? ` – ${formatDate(n.endDate)}` : ''}</span>}
            {n.place && <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-indigo-500" />{n.place}</span>}
            {n.minRank && <span className="inline-flex items-center gap-1.5"><Award size={14} className="text-amber-500" />Rank needed: {n.minRank}</span>}
        </div>
        <p className="mt-1 text-xs text-slate-500">For: {n.sections?.length ? n.sections.map((s) => SECTION_LABEL[s] || s).join(', ') : 'every section'}</p>
        {n.rules?.length > 0 && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><ListChecks size={14} /> {n.kind === 'rules' ? 'Rules & regulations' : 'Rules — what you should know'}</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-slate-700">{n.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
        )}
        {n.details && <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{n.details}</p>}
    </article>
);

export default BsgNoticeCard;
