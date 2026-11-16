/**
 * Whether the student has the Extra Curricular tab (2026-11-14): only while they are in, or
 * have asked to join, an NCC, NSS, Scouts unit or club. Remembered for the session so the tab does not blink in.
 * Server: GET /api/organizations/student/nccnss (src/nccnss/student.js).
 */
import { useEffect, useState } from 'react';
import { useOrgVersion } from '../organization/orgVersion';
import api from '../utils/api';

const KEY = 'extra-open';

export default function useExtraOpen(userId) {
    const [open, setOpen] = useState(() => { try { return !!userId && sessionStorage.getItem(KEY) === String(userId); } catch { return false; } });
    const orgVersion = useOrgVersion();
    useEffect(() => {
        if (!userId) return undefined;
        let live = true;
        api.get('/organizations/student/nccnss').then((r) => {
            if (!live) return;
            const inOne = (r.data?.memberships || []).some((m) => m.status !== 'rejected');
            // …or their organization shows Extra-curricular to all its students (2026-11-16).
            // Every student of an organization sees it, to ask to join its NCC, NSS, Scouts or clubs —
            // unless the organization turned it off (extraCurricularOpen false; not set counts as on).
            const org = r.data?.organization;
            const yes = inOne || Boolean(org && org.extraCurricularOpen !== false);
            setOpen(yes);
            try { if (yes) sessionStorage.setItem(KEY, String(userId)); else sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
        }).catch(() => {});
        return () => { live = false; };
    }, [userId, orgVersion]);
    return open;
}
