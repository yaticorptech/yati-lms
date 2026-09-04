/**
 * @description The details dialog: everything the card summarised, plus the
 *              safety facts the card had no room for, and the report button.
 *
 * Opening it records a view server-side (that is what "Recently viewed" is),
 * and the server re-checks the age rules on that request, so a link passed
 * between two students of different ages opens for one and not the other.
 */
import { useEffect, useRef, useState } from 'react';
import {
    X, Heart, Flag, MapPin, CalendarDays, Clock, GraduationCap, Wallet, BadgeCheck,
    ShieldCheck, Sparkles, Loader2, AlertCircle, Mail, Phone, Lock, Users, Tag
} from 'lucide-react';
import { opportunitiesApi } from './api';
import { labelFor, reasonSentence, ageLabel, whereLabel, hoursLabel, dateLabel } from './helpers';

const Fact = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-2.5">
        <Icon size={16} className="mt-0.5 shrink-0 text-indigo-500" aria-hidden="true" />
        <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-sm font-medium text-slate-800">{children}</p>
        </div>
    </div>
);

const GUARDIAN_TEXT = {
    none: 'Guardian approval is required before you take this up. Request it from the banner at the top of the page.',
    pending: 'Your guardian approval request is pending. You can mark interest now; the organisation is told once it is approved.',
    approved: 'Your guardian has approved local jobs like this one.',
    rejected: 'Your guardian has not approved local jobs yet.'
};

export default function OpportunityDetails({ id, vocab, guardian, onClose, onInterested, onReport }) {
    // Keyed by id: while the answer on hand is for another listing (or none),
    // the dialog is loading. No flag to flip, so nothing to set in the effect.
    const [state, setState] = useState({ id: null, opp: null, rules: null, error: '' });
    const closeRef = useRef(null);

    useEffect(() => {
        let alive = true;
        opportunitiesApi.details(id)
            .then((res) => alive && setState({ id, opp: res.opportunity, rules: res.rules, error: '' }))
            .catch((err) => alive && setState({ id, opp: null, rules: null, error: err.message }));
        return () => { alive = false; };
    }, [id]);

    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
    }, [onClose]);

    const loading = state.id !== id;
    const opp = loading ? null : state.opp;
    const rules = loading ? null : state.rules;
    const error = loading ? '' : state.error;
    const liked = opp?.preference === 'interested';
    const safety = opp && vocab.safety.find((s) => s.id === opp.safetyClassification);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
            <div
                role="dialog" aria-modal="true" aria-labelledby="opp-details-title"
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-fade-in-up sm:rounded-3xl"
            >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                    <div className="flex min-w-0 items-start gap-3">
                        {opp && <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl">{opp.icon}</span>}
                        <div className="min-w-0">
                            <h2 id="opp-details-title" className="text-lg font-bold leading-snug text-slate-900">
                                {loading ? 'Loading…' : opp ? opp.title : 'Not available'}
                            </h2>
                            {opp && (
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
                                    {opp.organization?.name}
                                    {opp.organization?.verified
                                        ? <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700"><BadgeCheck size={13} aria-hidden="true" /> Verified organisation</span>
                                        : <span className="text-xs font-semibold text-amber-700">Not yet verified</span>}
                                </p>
                            )}
                        </div>
                    </div>
                    <button ref={closeRef} type="button" onClick={onClose} aria-label="Close"
                        className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 opp-scroll">
                    {loading && (
                        <div className="flex items-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading the details…</div>
                    )}
                    {error && (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
                        </div>
                    )}
                    {opp && (
                        <div className="space-y-6">
                            {opp.matchScore != null && (
                                <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">
                                    <Sparkles size={14} aria-hidden="true" /> {opp.matchScore}% profile match
                                </p>
                            )}

                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <Fact icon={CalendarDays} label="When">{dateLabel(opp)}</Fact>
                                <Fact icon={Clock} label="Time">{opp.timeLabel || hoursLabel(opp.hoursPerSession)}</Fact>
                                <Fact icon={MapPin} label="Where">{whereLabel(opp)}{opp.location?.landmark ? ` · ${opp.location.landmark}` : ''}</Fact>
                                <Fact icon={GraduationCap} label="Eligibility">{ageLabel(opp)}</Fact>
                                <Fact icon={Tag} label="Type">{labelFor(vocab.types, opp.opportunityType)} · {labelFor(vocab.categories, opp.category)}</Fact>
                                <Fact icon={Users} label="Spots">{opp.slots || 1}</Fact>
                                {opp.compensation?.label && <Fact icon={Wallet} label="Pay">{opp.compensation.label}</Fact>}
                            </div>

                            <section>
                                <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">About this job</h3>
                                <p className="text-sm leading-relaxed text-slate-700">{opp.description}</p>
                                {opp.organization?.about && <p className="mt-2 text-sm text-slate-500">{opp.organization.about}</p>}
                            </section>

                            {opp.skills?.length > 0 && (
                                <section>
                                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Skills involved</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {opp.skills.map((s) => (
                                            <span key={s} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">{s}</span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section className="rounded-xl bg-slate-50 p-4">
                                <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    <Sparkles size={13} className="text-indigo-500" aria-hidden="true" /> Why this is recommended
                                </h3>
                                <p className="text-sm text-slate-700">{reasonSentence(opp)}</p>
                            </section>

                            <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                                <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                                    <ShieldCheck size={13} aria-hidden="true" /> Safety information
                                </h3>
                                {safety && <p className="text-sm font-semibold text-slate-800">{safety.label} — <span className="font-normal text-slate-600">{safety.blurb}</span></p>}
                                {opp.supervision && <p className="mt-1.5 text-sm text-slate-700"><span className="font-semibold">Supervision:</span> {opp.supervision}</p>}
                                {opp.safetyNotes && <p className="mt-1 text-sm text-slate-700">{opp.safetyNotes}</p>}
                                {opp.guardianApprovalRequired && (
                                    <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Guardian approval:</span> {GUARDIAN_TEXT[guardian?.status] || GUARDIAN_TEXT.none}</p>
                                )}
                            </section>

                            {rules?.exposeContact ? (
                                opp.contact ? (
                                    <section>
                                        <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Contact</h3>
                                        <ul className="space-y-1 text-sm text-slate-700">
                                            {opp.contact.email && <li className="flex items-center gap-2"><Mail size={14} className="text-slate-400" aria-hidden="true" /> <a className="font-medium text-indigo-600 hover:underline" href={`mailto:${opp.contact.email}`}>{opp.contact.email}</a></li>}
                                            {opp.contact.phone && <li className="flex items-center gap-2"><Phone size={14} className="text-slate-400" aria-hidden="true" /> {opp.contact.phone}</li>}
                                        </ul>
                                    </section>
                                ) : null
                            ) : (
                                <p className="flex items-start gap-2 text-xs text-slate-500">
                                    <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    Contact details are not shown for your age group. Mark interest and the organisation reaches your guardian through the LMS.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {opp && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-4">
                        <button
                            type="button"
                            onClick={() => onInterested(opp)}
                            aria-pressed={liked}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 ${
                                liked ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                            }`}
                        >
                            <Heart size={16} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" /> {liked ? 'Interested ✓' : 'Interested'}
                        </button>
                        <button type="button" onClick={() => onReport(opp)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40">
                            <Flag size={15} aria-hidden="true" /> Report
                        </button>
                        <button type="button" onClick={onClose}
                            className="ml-auto inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40">
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
