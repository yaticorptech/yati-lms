/**
 * @description How far through their learning a student is, and whether that
 *              is far enough to open the Jobs section.
 *
 * The bar is a quarter of the way: once the average progress across every
 * enrolled course reaches 25%, the whole section opens. This hook is the
 * single place that decides it, so the gate and the message it shows can never
 * disagree about the number.
 *
 * A failed request leaves the section OPEN rather than shut. Locking a student
 * out because their connection dropped would be the worse of the two mistakes
 * — they would be told to go and study what they have already studied.
 */
import { useEffect, useState } from 'react';
import api from '../utils/api';

/** The share of their learning a student needs behind them, as a percentage. */
export const JOBS_UNLOCK_PERCENT = 25;

export default function useCourseCompletion() {
    // One piece of state, set once when the answer arrives, so nothing is
    // written synchronously inside the effect.
    const [state, setState] = useState({ loading: true, courses: [], failed: false });

    useEffect(() => {
        let alive = true;
        api.get('/user/courses')
            .then((r) => {
                if (!alive) return;
                const courses = Array.isArray(r.data?.courses) ? r.data.courses : [];
                setState({ loading: false, courses, failed: false });
            })
            .catch(() => {
                if (alive) setState({ loading: false, courses: [], failed: true });
            });
        return () => { alive = false; };
    }, []);

    const { courses, loading, failed } = state;
    const progressOf = (c) => Math.max(0, Math.min(100, Math.round(Number(c?.progress) || 0)));
    const total = courses.length;
    // Averaged across everything they enrolled in, so one finished course out
    // of eight does not read as "a quarter of the way through".
    const percent = total ? Math.round(courses.reduce((sum, c) => sum + progressOf(c), 0) / total) : 0;
    const completed = courses.filter((c) => progressOf(c) === 100).length;

    return {
        loading,
        total,
        completed,
        percent,
        required: JOBS_UNLOCK_PERCENT,
        /** A quarter of the way through, with at least one course enrolled. */
        unlocked: failed || (total > 0 && percent >= JOBS_UNLOCK_PERCENT)
    };
}
