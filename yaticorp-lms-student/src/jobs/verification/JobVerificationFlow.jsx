/** Identity (Aadhaar QR + OTP) → LinkedIn → Resume → Profile → Jobs, minus what the admin switched off. The server owns the state; this renders its latest answer. */
import React, { useCallback, useEffect, useState } from 'react';
import { verificationApi } from './api';
import VerificationProgress from './VerificationProgress';
import IdentityStep from './IdentityStep';
import LinkedinStep from './LinkedinStep';
import ResumeStep from './ResumeStep';
import ProfileStep from './ProfileStep';
import ReadyStep from './ReadyStep';
import { Card, ErrorNotice, SecondaryButton } from './ui';
class FlowErrorBoundary extends React.Component {
    constructor(p) { super(p); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(err) { console.error('[jobs:verification] step crashed:', err?.message || err); }
    render() { if (!this.state.failed) return this.props.children; return (<Card><p className="text-lg font-extrabold text-slate-900">Something went wrong on this step</p><p className="mt-1 text-sm text-slate-500">Nothing you entered was lost. Reload the step to continue.</p><SecondaryButton className="mt-4" onClick={() => { this.setState({ failed: false }); this.props.onReset?.(); }}>Reload step</SecondaryButton></Card>); }
}
export default function JobVerificationFlow({ initialView = null, onGranted }) {
    const [view, setView] = useState(initialView); const [error, setError] = useState(null); const [selected, setSelected] = useState(null); const [opening, setOpening] = useState(false);
    const load = useCallback(() => verificationApi.status().then(setView).catch(setError), []);
    const retry = () => { setError(null); load(); };
    useEffect(() => { if (!initialView) load(); }, [initialView, load]);
    const onView = useCallback((n) => { if (n) { setView(n); setSelected(null); } }, []);
    const advance = useCallback(() => verificationApi.advance(), []);
    if (error && !view) return (<Card className="mx-auto max-w-2xl"><p className="text-lg font-extrabold text-slate-900">Could not load your verification status</p><ErrorNotice error={error} onRetry={retry} /></Card>);
    if (!view) return (<div className="mx-auto max-w-2xl space-y-5" aria-busy="true"><div className="skeleton h-16 rounded-2xl" /><div className="skeleton h-96 rounded-3xl" /></div>);
    const current = view.canAccessJobs ? 'jobs' : (selected || view.nextStep || 'jobs');
    const step = current === 'identity' ? <IdentityStep key="identity" view={view} onView={onView} onContinue={advance} /> : current === 'linkedin' ? <LinkedinStep key="linkedin" view={view} onView={onView} onContinue={advance} /> : current === 'resume' ? <ResumeStep key="resume" view={view} onView={onView} onContinue={advance} /> : current === 'profile' ? <ProfileStep key="profile" view={view} onView={onView} /> : <ReadyStep key="ready" view={view} busy={opening} onExplore={() => { setOpening(true); onGranted(view); }} />;
    return (<div className="mx-auto max-w-2xl space-y-6"><VerificationProgress view={view} current={current} onSelect={(id) => setSelected(id)} />{selected && selected !== view.nextStep && !view.canAccessJobs && (<div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600"><span>Looking back at a completed step.</span><SecondaryButton className="px-3 py-1.5 text-xs" onClick={() => setSelected(null)}>Back to current step</SecondaryButton></div>)}<FlowErrorBoundary onReset={load}>{step}</FlowErrorBoundary></div>);
}
