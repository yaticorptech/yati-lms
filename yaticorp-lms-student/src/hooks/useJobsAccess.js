/**
 * @description Whether the student may open the Jobs section, and how far
 *              along they are.
 *
 * The rule lives on the server (GET /user/jobs-access, services/jobsAccess):
 * at least five Career Path skills, each at 25% or more — the account owner's
 * rule, 2026-10-02 — or an account exempt from it (both Bhagyashree accounts
 * and Yaticorp). This hook is the single place the student app asks, so the
 * gate, the locked page and the Career Path job tile can never disagree.
 *
 * A failed request opens nothing. It used to open the section, which made the
 * lock as good as absent whenever the server was slow; now the gate says it
 * could not check and offers to try again.
 */
import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';

const RULE = { skills: 5, percent: 25 };

export default function useJobsAccess() {
    const [state, setState] = useState({ loading: true, failed: false, data: null });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let alive = true;
        api.get('/user/jobs-access')
            .then((r) => { if (alive) setState({ loading: false, failed: false, data: r.data || {} }); })
            .catch(() => { if (alive) setState({ loading: false, failed: true, data: null }); });
        return () => { alive = false; };
    }, [attempt]);

    const retry = useCallback(() => {
        setState({ loading: true, failed: false, data: null });
        setAttempt((n) => n + 1);
    }, []);

    const { loading, failed, data } = state;
    return {
        loading,
        failed,
        open: data?.open === true,
        alwaysOpen: data?.alwaysOpen === true,
        // One of the demo cards: the Jobs section reads their skills from
        // Career Path and their resume in full (server: services/fullAccess.js).
        fullAccess: data?.fullAccess === true,
        ready: Number(data?.ready) || 0,
        required: data?.required || RULE,
        skills: Array.isArray(data?.skills) ? data.skills : [],
        retry
    };
}
