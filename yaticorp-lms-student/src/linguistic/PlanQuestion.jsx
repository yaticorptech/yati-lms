/**
 * "How much time do you have?" on entering the section (asked 2026-10-26:
 * "when the user enters, ask it there"). A new student answers it among the
 * start screens (Onboarding.jsx); one who started before the learning plan
 * came — or begins another language's course — is asked it here, once per
 * course, before the path. The answer makes their roadmap (Roadmap.jsx, which
 * stays, to see the days or change the time).
 */
import { useEffect, useState } from 'react';
import { linguisticApi } from './api';
import { COLORS } from './meta';
import { Chunky, Loading, Mascot, Problem } from './ui';
import { SessionFrame } from './session/Session';
import PlanChoices from './parts/PlanChoices';

/**
 * @param {object}   props.dash    the dashboard (its course)
 * @param {Function} props.onDone  once the plan is made: the section opens
 */
export default function PlanQuestion({ dash, onDone }) {
    const [options, setOptions] = useState(undefined);
    const [days, setDays] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const course = dash.course?.name || 'English';
    const [tries, setTries] = useState(0);
    useEffect(() => {
        let live = true;
        linguisticApi.plan().then((r) => { if (live) { setOptions(r.options || []); setError(null); } }).catch((e) => { if (live) { setError(e); setOptions(null); } });
        return () => { live = false; };
    }, [tries]);
    const save = () => {
        if (!days || busy) return;
        setBusy(true); setError(null);
        linguisticApi.setPlan(days).then(onDone).catch((e) => { setError(e); setBusy(false); });
    };

    return (
        <SessionFrame label={`Your ${course} roadmap`}>
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-plan-question>
                <div className="lingo-in mx-auto w-full max-w-[600px] px-4 pb-8 pt-6 sm:pt-10">
                    <div className="mb-6 flex items-end gap-3">
                        <Mascot pose="thinking" className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" />
                        <div className="lingo-bubble mb-3 min-w-0 px-4 py-3">
                            <h1 className="text-xl font-extrabold leading-tight text-[#3c3c3c] sm:text-2xl" style={{ textWrap: 'balance' }}>How much time do you have to learn {course}?</h1>
                            <p className="mt-1 text-[15px] font-semibold text-[#777]">Your roadmap is made to fit it: every lesson when there is time, the main ones when time is short. You can change it later.</p>
                        </div>
                    </div>
                    {options === undefined ? <Loading label="Working out your roadmap…" />
                        : options === null ? <Problem error={error} onRetry={() => { setOptions(undefined); setTries((n) => n + 1); }} />
                            : <PlanChoices options={options} picked={days} onPick={setDays} busy={busy ? days : null} />}
                </div>
            </main>
            {error && options && <p className="mx-auto w-full max-w-[1000px] shrink-0 px-4 pb-2 text-center text-[15px] font-bold sm:px-10" style={{ color: COLORS.red.ink }} role="alert">{error.message}</p>}
            <footer className="shrink-0 border-t-2 border-[#E5E5E5]">
                <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-10 sm:py-7">
                    {!days && <p className="hidden flex-1 text-[15px] font-bold text-[#AFAFAF] sm:block">Choose a time to continue.</p>}
                    <span className={days ? 'hidden flex-1 sm:block' : 'hidden'} />
                    <Chunky color="green" onClick={save} disabled={!days || busy} className="flex-1 sm:min-w-[150px] sm:flex-none" data-primary>
                        {busy ? 'Saving…' : 'Make my roadmap'}
                    </Chunky>
                </div>
            </footer>
        </SessionFrame>
    );
}
