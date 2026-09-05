/**
 * @description Whether a student has finished everything they enrolled in.
 *
 * The Jobs section is the reward for finishing the learning: it opens only once
 * every enrolled course reads 100%. This hook is the single place that decides
 * that, so the gate and the message it shows never disagree.
 *
 * A failed request leaves the section OPEN rather than shut. Locking a student
 * out because their connection dropped would be the worse of the two mistakes —
 * they would be told to finish courses they have already finished.
 */
import { useEffect, useState } from 'react';
import api from '../utils/api';

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
    const progressOf = (c) => Math.round(Number(c?.progress) || 0);
    const pending = courses.filter((c) => progressOf(c) < 100);
    const total = courses.length;
    const completed = total - pending.length;

    return {
        loading,
        total,
        completed,
        pending,
        /** Every enrolled course finished — and at least one was enrolled. */
        allComplete: failed || (total > 0 && pending.length === 0)
    };
}
