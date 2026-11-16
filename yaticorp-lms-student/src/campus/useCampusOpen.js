/**
 * Whether the student has the Institution tab (Campus, 2026-11-13): admitted by their institution, an AI card,
 * and their organization has Campus on. Asked when the app opens, remembered for
 * the session so the tab does not blink in. Without it there is no access to any
 * of it — the server refuses as well (src/campus/student.js).
 */
import { useEffect, useState } from 'react';
import { useOrgVersion } from '../organization/orgVersion';
import api from '../utils/api';

const KEY = 'campus-open';

export default function useCampusOpen(userId) {
    const [open, setOpen] = useState(() => { try { return !!userId && sessionStorage.getItem(KEY) === String(userId); } catch { return false; } });
    const orgVersion = useOrgVersion();
    useEffect(() => {
        if (!userId) return undefined;
        let live = true;
        api.get('/organizations/student/campus/me').then((r) => {
            if (!live) return;
            const yes = Boolean(r.data?.available && r.data?.admitted);   // only once the institution has admitted them
            setOpen(yes);
            try { if (yes) sessionStorage.setItem(KEY, String(userId)); else sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
        }).catch(() => {});
        return () => { live = false; };
    }, [userId, orgVersion]);
    return open;
}
