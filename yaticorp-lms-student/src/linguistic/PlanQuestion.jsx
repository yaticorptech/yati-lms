/**
 * The roadmap of a student who started before the learning plan came — or begins another language's course — made
 * on entering the section, once per course, before the path. Its days are set by itself (2026-11-04, "don't give
 * the learning days to choose"): 90 for a Beginner, 60 of the Advanced lessons after the Advanced entry test
 * (server service.js autoPlan). Before then this asked "How much time do you have?" (asked 2026-10-26).
 */
import { useEffect, useState } from 'react';
import { linguisticApi } from './api';
import { Loading, Problem } from './ui';

/**
 * @param {object}   props.dash    the dashboard (its course)
 * @param {Function} props.onDone  once the plan is made: the section opens
 */
export default function PlanQuestion({ dash, onDone }) {
    const [error, setError] = useState(null);
    const [tries, setTries] = useState(0);
    useEffect(() => {
        let live = true;
        linguisticApi.setPlan().then(() => { if (live) onDone(); }).catch((e) => { if (live) setError(e); });
        return () => { live = false; };
    }, [tries, onDone]);
    if (error) return <Problem error={error} onRetry={() => { setError(null); setTries((n) => n + 1); }} />;
    return <div data-plan-question><Loading label={`Making your ${dash.course?.name || 'English'} roadmap…`} /></div>;
}
