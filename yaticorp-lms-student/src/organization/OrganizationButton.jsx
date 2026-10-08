/**
 * "Organization/College" — the student's organization, and the popup behind it.
 *
 * It lives in My Profile → Personal Information, drawn as a value among Full
 * Name, Email and the rest (variant 'plain'): the organization's name once
 * there is one, "Add organization" until then. The dashboard hero no longer
 * carries it — a student's home screen is about their learning, and most
 * students either have no institution or joined one when they signed up. The
 * solid 'pill' variant is kept for anywhere a standalone button is wanted.
 *
 * Everything else lives in the popup: finding an organization by its ID, asking
 * to join, and seeing a request that is still waiting. Typing an ID never joins
 * anything — it confirms which institution the student means, and that
 * organization's own admin decides.
 *
 * Ending a membership with a working organization is the organization's
 * decision, made from its own students page. The one way out from here is for
 * an organization that is no longer active (suspended, inactive): its students
 * would otherwise be stuck in it and could never join another, so the popup
 * offers "Leave organization" — and the server refuses it for an active one.
 * A student can also withdraw a request nobody has answered yet, which is
 * their own request rather than a membership. When a membership was ended for
 * them, the popup says so ("You are no longer a member of …") above the form.
 *
 * The other place this is offered is the signup form, which takes the ID as an
 * optional field.
 */
import React, { useState, useEffect } from 'react';
import {
    Building2, Plus, Search, Loader2, CheckCircle2, AlertCircle, Clock, XCircle,
    Copy, Check, ExternalLink, X, ChevronRight, LogOut
} from 'lucide-react';
import organizationApi from './api';
import Portal from '../components/Portal';

// Its own colours: the button lives in a banner with white text, and a box that
// inherited it would show what is typed as white on white.
const INPUT = 'w-full border border-slate-300 rounded-lg bg-white px-3 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none';

/**
 * Solid, not translucent — this is the one thing in that row you can press.
 *
 * It first matched the card, email and phone pills beside it, which was the
 * mistake: those are read-only facts, and a fourth one styled identically reads
 * as a fifth fact rather than as a control. White on the hero's purple is the
 * strongest contrast available, so the button is the first thing the eye lands
 * on in the row.
 */
const BUTTON = 'group inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600';

const TONE = {
    add: 'bg-white text-indigo-700 shadow-indigo-900/25 hover:bg-indigo-50',
    pending: 'bg-amber-300 text-amber-950 shadow-amber-900/25 hover:bg-amber-200',
    member: 'bg-white text-indigo-700 shadow-indigo-900/25 hover:bg-indigo-50'
};

/** The ID, copyable, because students pass it between themselves. */
const Code = ({ code, className = '' }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* refused over plain HTTP; the code is on screen anyway */ }
    };
    return (
        <button onClick={copy} aria-label={`Copy Organization ID ${code}`}
            className={`group inline-flex items-center gap-1.5 font-mono font-semibold ${className}`}>
            {code}
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={12} className="opacity-40 group-hover:opacity-100" />}
        </button>
    );
};

/**
 * variant 'pill'  — the solid button described above.
 * variant 'plain' — the same control drawn as a value: the organization's name
 *   as text, for My Profile's Personal Information list, where it sits among
 *   Full Name, Email and the rest. It still opens the same popup, so linking
 *   an organization works from there too, and the whole tile is its target.
 */
// No size or weight of its own: it takes the value styling of wherever it sits.
// The ::after stretches the click target over the nearest positioned box —
// on My Profile, the whole Organization/College tile.
const PLAIN = "group inline-flex max-w-full items-center gap-1.5 rounded text-left transition-colors after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400";
const PLAIN_TONE = {
    add: 'text-indigo-600 hover:text-indigo-700',
    pending: 'text-amber-700 hover:text-amber-800',
    member: 'text-slate-900 hover:text-indigo-600'
};

const OrganizationButton = ({ variant = 'pill' }) => {
    const plain = variant === 'plain';
    const [state, setState] = useState(null);      // { member, organization, request }
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [notice, setNotice] = useState(null);    // { type: 'ok' | 'error', text }

    const [code, setCode] = useState('');
    const [searching, setSearching] = useState(false);
    const [found, setFound] = useState(null);
    const [joining, setJoining] = useState(false);
    const [busy, setBusy] = useState(false);       // withdrawing a request
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [retrying, setRetrying] = useState(false);

    const load = async () => {
        try {
            setState(await organizationApi.me());
        } catch {
            // A failed read is not "no organization": a member must not be shown
            // "Add organization". Keep what was last known, and with nothing
            // known yet the button stays neutral and the popup offers a retry.
            // No error on the dashboard itself, which has plenty else on it.
            setState((prev) => (prev && !prev.failed ? prev : { failed: true, member: false, organization: null, request: null }));
        } finally {
            setLoading(false);
        }
    };

    const retry = async () => {
        setRetrying(true);
        await load();
        setRetrying(false);
    };

    useEffect(() => { load(); }, []);

    // Escape closes the popup, the way the app's other popups behave.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const search = async (e) => {
        e.preventDefault();
        const entered = code.trim();
        if (!entered) return;

        setSearching(true); setNotice(null); setFound(null);
        try {
            setFound(await organizationApi.lookup(entered));
        } catch (err) {
            setNotice({
                type: 'error',
                text: err.response?.data?.message || "We couldn't find an active organization with that ID."
            });
        } finally {
            setSearching(false);
        }
    };

    const join = async () => {
        setJoining(true); setNotice(null);
        try {
            const res = await organizationApi.requestJoin(found.organization.orgCode);
            setNotice({ type: 'ok', text: res.message });
            setFound(null);
            setCode('');
            await load();
        } catch (err) {
            setNotice({ type: 'error', text: err.response?.data?.message || 'Could not send your request.' });
            // Already a member after all (joined elsewhere meanwhile): show that membership.
            if (err.response?.data?.code === 'ALREADY_MEMBER') { setFound(null); load(); }
        } finally {
            setJoining(false);
        }
    };

    const withdraw = async () => {
        setBusy(true); setNotice(null);
        try {
            const res = await organizationApi.cancelRequest(state.request._id);
            setNotice({ type: 'ok', text: res.message });
            await load();
        } catch (err) {
            setNotice({ type: 'error', text: err.response?.data?.message || 'Could not withdraw your request.' });
        } finally {
            setBusy(false);
        }
    };

    /** Leave an organization that is no longer active, then read the membership again. */
    const leave = async () => {
        setLeaving(true); setNotice(null);
        try {
            const res = await organizationApi.leave();
            setNotice({ type: 'ok', text: res.message || 'You have left your organization.' });
            setConfirmLeave(false);
            await load();
        } catch (err) {
            setNotice({ type: 'error', text: err.response?.data?.message || 'Could not leave the organization.' });
        } finally {
            setLeaving(false);
        }
    };

    const request = state?.request;
    const removed = state?.removed;
    // A member whose organization has stopped (suspended, inactive) may leave it.
    const canLeave = Boolean(state?.member && state.organization?.status && state.organization.status !== 'active');
    const pending = request?.status === 'pending';
    const rejected = request?.status === 'rejected';

    /* ── The button ───────────────────────────────────────────────────────── */

    if (loading) {
        if (plain) return <span className="inline-block h-4 w-28 animate-pulse rounded bg-slate-200" aria-hidden="true" />;
        // A placeholder of roughly the right size, so the pill row does not jump
        // when the answer arrives.
        return (
            <span className={`${BUTTON} ${TONE.add} pointer-events-none opacity-50`} aria-hidden="true">
                <Building2 size={14} /> <span className="h-3 w-28 rounded bg-indigo-200" />
            </span>
        );
    }

    const failed = Boolean(state.failed);
    const label = failed
        ? 'Organization'
        : state.member
            ? state.organization.name
            : pending
                ? 'Organization pending'
                : 'Add organization';

    return (
        <>
            <button
                type="button"
                // Re-read on open: the organization may have approved or removed
                // the student since the page loaded.
                onClick={() => { setOpen(true); setNotice(null); setConfirmLeave(false); load(); }}
                className={plain
                    ? `${PLAIN} ${state.member ? PLAIN_TONE.member : pending ? PLAIN_TONE.pending : PLAIN_TONE.add}`
                    : `${BUTTON} ${state.member ? TONE.member : pending ? TONE.pending : TONE.add}`}
                aria-label={failed ? 'Your organization' : state.member ? `Your organization: ${state.organization.name}` : pending ? 'Your organization request' : 'Add your organization'}
                title={failed ? 'Your organization could not be loaded' : state.member ? `${state.organization.name} · ${state.organization.orgCode}` : 'Join your school, college or company'}
            >
                {failed ? (
                    !plain && <Building2 size={15} className="shrink-0 text-indigo-500" />
                ) : state.member ? (
                    !plain && <Building2 size={15} className="shrink-0 text-indigo-500" />
                ) : pending ? (
                    <Clock size={15} className="shrink-0" />
                ) : (
                    // A filled dot around the plus, so the button reads as "add
                    // something" at a glance rather than needing its label read.
                    <span className={`flex shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white ${plain ? 'h-4 w-4' : 'h-5 w-5'}`}>
                        <Plus size={plain ? 11 : 13} strokeWidth={3} />
                    </span>
                )}
                <span className="truncate">{label}</span>
                {!plain && <ChevronRight size={15} className="-mr-1 shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5" />}
            </button>

            {/* ── The popup ──────────────────────────────────────────────────
                On <body>, not inside the banner the button sits in, so nothing
                there — its white text, its animations — reaches it. */}
            {open && (
                <Portal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 text-left text-slate-800 sm:p-4"
                        role="dialog" aria-modal="true" aria-labelledby="organization-popup-title">
                        <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100dvh-1.5rem)]">
                            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                        <Building2 size={18} />
                                    </span>
                                    <h2 id="organization-popup-title" className="truncate font-bold text-slate-800">
                                        {failed || state.member ? 'Your organization' : pending ? 'Your request' : 'Add organization'}
                                    </h2>
                                </div>
                                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-5">
                                {/* ── Could not be read, and nothing known yet ──── */}
                                {failed ? (
                                    <div role="alert" className="space-y-3 text-center">
                                        <p className="text-sm text-slate-600">Unable to load your organization. Please try again.</p>
                                        <button onClick={retry} disabled={retrying}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                                            {retrying && <Loader2 size={16} className="animate-spin" />}
                                            Retry
                                        </button>
                                    </div>

                                /* ── A member ─────────────────────────────────── */
                                ) : state.member ? (
                                    <>
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-emerald-800">{state.organization.name}</p>
                                                    <Code code={state.organization.orgCode} className="mt-0.5 text-emerald-700" />
                                                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                                                        Active member
                                                        {state.organization.joinedAt && (
                                                            <span className="ml-1 font-normal text-emerald-600">
                                                                since {new Date(state.organization.joinedAt).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </p>
                                                    {state.organization.website && (
                                                        <a href={/^https?:\/\//i.test(state.organization.website) ? state.organization.website : `https://${state.organization.website}`}
                                                            target="_blank" rel="noreferrer"
                                                            className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                                                            {state.organization.website}<ExternalLink size={11} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {state.organization.accessNote && (
                                            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                                <span>{state.organization.accessNote} Your courses and progress are unaffected.</span>
                                            </p>
                                        )}

                                        <p className="text-xs text-slate-500">
                                            Your organization can see your learning progress. They cannot change your account or your work.
                                        </p>
                                        {canLeave ? (
                                            confirmLeave ? (
                                                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
                                                    <p className="font-semibold text-red-800">Leave {state.organization.name}?</p>
                                                    <p className="mt-1 text-xs text-red-700">
                                                        They will no longer see your progress, and you can join another organization.
                                                        Your account, courses and progress stay exactly as they are.
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <button onClick={() => setConfirmLeave(false)} disabled={leaving}
                                                            className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                                                            Cancel
                                                        </button>
                                                        <button onClick={leave} disabled={leaving}
                                                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                                                            {leaving && <Loader2 size={16} className="animate-spin" />}
                                                            Leave organization
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => setConfirmLeave(true)}
                                                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                                                    <LogOut size={16} />
                                                    Leave organization
                                                </button>
                                            )
                                        ) : (
                                            <p className="text-xs text-slate-500">
                                                To be taken out of {state.organization.name}, ask them — an organization manages its
                                                own list of students.
                                            </p>
                                        )}
                                    </>

                                /* ── Waiting for a decision ───────────────────── */
                                ) : pending ? (
                                    <>
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                                            <div className="flex items-start gap-3">
                                                <Clock className="mt-0.5 shrink-0 text-amber-600" size={20} />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-amber-800">
                                                        Waiting for {request.organization?.name || 'the organization'} to approve you
                                                    </p>
                                                    {request.organization?.orgCode && (
                                                        <Code code={request.organization.orgCode} className="mt-0.5 text-amber-700" />
                                                    )}
                                                    <p className="mt-1 text-xs text-amber-700">
                                                        Requested {new Date(request.requestedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            You can only have one request at a time. Withdraw this one if you need to join a different organization.
                                        </p>
                                        <button onClick={withdraw} disabled={busy}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                                            {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                            Withdraw request
                                        </button>
                                    </>

                                /* ── Not a member: find one ───────────────────── */
                                ) : (
                                    <>
                                        {/* A membership that was ended for them — said, rather
                                            than an empty form with no explanation. */}
                                        {removed && (
                                            <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                                <span>
                                                    <span className="font-semibold">You are no longer a member of {removed.organizationName || 'your organization'}.</span>
                                                    {removed.reason && <span className="block text-xs text-amber-700">{removed.reason}{removed.at ? ` · ${new Date(removed.at).toLocaleDateString()}` : ''}</span>}
                                                    <span className="block text-xs text-amber-700">Your courses and progress are unchanged. You can join an organization again below.</span>
                                                </span>
                                            </div>
                                        )}
                                        {/* A request the organization closed before deciding it
                                            (it stopped taking members): its reason, said. */}
                                        {!removed && request?.status === 'cancelled' && request.decisionReason && (
                                            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                                <span>
                                                    Your request to join {request.organization?.name || 'that organization'} was closed: {request.decisionReason}.
                                                </span>
                                            </p>
                                        )}
                                        {rejected ? (
                                            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                                <XCircle size={16} className="mt-0.5 shrink-0" />
                                                <span>
                                                    {request.organization?.name || 'That organization'} did not approve your request.
                                                    {request.decisionReason && <> They said: “{request.decisionReason}”</>}
                                                    {' '}You can try a different Organization ID.
                                                </span>
                                            </p>
                                        ) : (
                                            <p className="text-sm text-slate-500">
                                                If your school, college or company uses this platform, they will have given you an
                                                Organization ID. Enter it and they can follow your progress.
                                            </p>
                                        )}

                                        <form onSubmit={search} className="space-y-2">
                                            <label htmlFor="org-code" className="mb-1 block text-xs font-bold text-slate-600">
                                                Organization ID
                                            </label>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <input
                                                    id="org-code"
                                                    value={code}
                                                    onChange={(e) => { setCode(e.target.value); setFound(null); }}
                                                    placeholder="xx_xxxx_xxx"
                                                    autoCapitalize="none"
                                                    autoComplete="off"
                                                    spellCheck={false}
                                                    className={INPUT}
                                                />
                                                <button type="submit" disabled={searching || !code.trim()}
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                                                    {searching
                                                        ? <><Loader2 size={16} className="animate-spin" />Looking…</>
                                                        : <><Search size={16} />Find</>}
                                                </button>
                                            </div>
                                        </form>

                                        {found && (
                                            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                                                <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Organization found</p>
                                                <p className="mt-1 font-bold text-slate-900">{found.organization.name}</p>
                                                <Code code={found.organization.orgCode} className="mt-0.5 text-sm text-slate-600" />
                                                <p className="mt-0.5 text-xs text-slate-500">{found.organization.typeLabel}</p>

                                                {found.alreadyMember ? (
                                                    <p className="mt-3 text-sm font-semibold text-emerald-700">You are already a member of this organization.</p>
                                                ) : found.hasPendingRequest ? (
                                                    <p className="mt-3 text-sm text-amber-700">
                                                        {found.pendingElsewhere
                                                            ? 'You already have a request waiting with another organization. Withdraw it first.'
                                                            : 'You have already asked to join this organization.'}
                                                    </p>
                                                ) : (
                                                    <>
                                                        <button onClick={join} disabled={joining}
                                                            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                                                            {joining && <Loader2 size={16} className="animate-spin" />}
                                                            Send Join Request
                                                        </button>
                                                        <p className="mt-2 text-xs text-slate-500">
                                                            They will be asked to approve you. Nothing changes on your account until they do.
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {notice && (
                                    <p className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 border ${notice.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        {notice.type === 'ok' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                                        <span>{notice.text}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

        </>
    );
};

export default OrganizationButton;
