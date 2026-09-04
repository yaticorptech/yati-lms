/**
 * @description One opportunity: what it is, where, when, who it's open to,
 *              why it's here — and the two taps that teach the recommender.
 *
 * The reason line is the card's whole argument. It is built from signals
 * the recommender actually fired, and when none did it says so rather than
 * dressing the card in a percentage nobody computed.
 */
import { useState } from 'react';
import {
    Heart, X, ArrowRight, MapPin, CalendarDays, Clock, BadgeCheck, Sparkles,
    ShieldCheck, GraduationCap, Wallet, Users
} from 'lucide-react';
import { labelFor, reasonSentence, ageLabel, whereLabel, hoursLabel, dateLabel } from './helpers';

const Meta = ({ icon: Icon, children, title }) => (
    <li className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600" title={title}>
        <Icon size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
        {children}
    </li>
);

const GUARDIAN = {
    none: { text: 'Guardian approval required', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
    pending: { text: 'Guardian approval pending', tone: 'bg-sky-50 text-sky-800 border-sky-200' },
    approved: { text: 'Guardian approved', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    rejected: { text: 'Guardian declined', tone: 'bg-rose-50 text-rose-800 border-rose-200' }
};

export default function OpportunityCard({
    opp, vocab, guardian, leaving = false, onInterested, onNotInterested, onOpen
}) {
    const [pop, setPop] = useState(false);
    const liked = opp.preference === 'interested';
    const matches = (opp.signals?.interests || []).map((i) => ({ key: `i:${i}`, label: labelFor(vocab.categories, i), kind: 'interest' }));
    const onDate = opp.signals?.date === 'in-window';
    const guardianState = opp.guardianApprovalRequired ? GUARDIAN[guardian?.status] || GUARDIAN.none : null;

    const like = () => {
        if (!liked) { setPop(true); setTimeout(() => setPop(false), 600); }
        onInterested?.(opp);
    };

    return (
        <article
            className={`group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg focus-within:border-indigo-300 ${
                leaving ? 'opp-card-leave' : ''
            } ${liked ? 'ring-1 ring-rose-100' : ''}`}
            aria-label={opp.title}
        >
            <div className="mb-3 flex items-start gap-3">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                    {opp.icon}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="font-bold leading-snug text-slate-900">
                        <button type="button" onClick={() => onOpen?.(opp)}
                            className="text-left transition-colors hover:text-indigo-600 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-indigo-500/50">
                            {opp.title}
                        </button>
                    </h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-600">
                        <span className="truncate">{opp.organization?.name}</span>
                        {opp.organization?.verified && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700">
                                <BadgeCheck size={13} aria-hidden="true" /> Verified
                            </span>
                        )}
                    </p>
                </div>
                {opp.matchScore != null ? (
                    <span className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-bold tabular-nums ${
                        opp.matchScore >= 70 ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : opp.matchScore >= 40 ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`} title="Profile match, from your interests, skills, availability and distance">
                        {opp.matchScore}% match
                    </span>
                ) : (
                    <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        {labelFor(vocab.types, opp.opportunityType)}
                    </span>
                )}
            </div>

            <p className={`mb-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                onDate ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}>
                <CalendarDays size={13} aria-hidden="true" /> {dateLabel(opp)}{opp.timeLabel ? ` · ${opp.timeLabel}` : ''}
                {onDate && <span className="ml-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white">your dates</span>}
            </p>
            <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
                <Meta icon={MapPin}>{whereLabel(opp)}</Meta>
                <Meta icon={Clock}>{hoursLabel(opp.hoursPerSession)}</Meta>
                <Meta icon={GraduationCap} title="Who this is open to">{ageLabel(opp)}</Meta>
                {opp.slots > 1 && <Meta icon={Users}>{opp.slots} spots</Meta>}
                {opp.compensation?.label && <Meta icon={Wallet}>{opp.compensation.label}</Meta>}
            </ul>

            {opp.description && (
                <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{opp.description}</p>
            )}

            {matches.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Matches</span>
                    {matches.slice(0, 5).map((m) => (
                        <span key={m.key} className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            {m.label}
                        </span>
                    ))}
                </div>
            )}

            <p className="mb-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                <Sparkles size={13} className="mt-0.5 shrink-0 text-indigo-500" aria-hidden="true" />
                <span>{reasonSentence(opp)}</span>
            </p>

            {guardianState && (
                <p className={`mb-4 inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${guardianState.tone}`}>
                    <ShieldCheck size={13} aria-hidden="true" /> {guardianState.text}
                </p>
            )}

            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <button
                    type="button"
                    onClick={like}
                    aria-pressed={liked}
                    aria-label={liked ? `Interested in ${opp.title} — tap to undo` : `Interested in ${opp.title}`}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 sm:min-h-10 ${
                        liked
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                >
                    <span className={`relative inline-flex ${pop ? 'opp-burst text-rose-400' : ''}`}>
                        <Heart size={16} className={pop ? 'opp-heart-pop' : ''} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
                    </span>
                    Interested
                </button>
                <button
                    type="button"
                    onClick={() => onNotInterested?.(opp)}
                    aria-label={`Not interested in ${opp.title}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 sm:min-h-10"
                >
                    <X size={16} aria-hidden="true" /> Not interested
                </button>
                <button
                    type="button"
                    onClick={() => onOpen?.(opp)}
                    className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 sm:min-h-10"
                >
                    View details <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
            </div>
        </article>
    );
}
