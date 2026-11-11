/**
 * A teacher their organization added (no AI card) completes their profile
 * before anything else opens (asked 2026-11-04): designation, department,
 * mobile, email and, with 360 on, at least one class they teach. Only the
 * profile page and the 360 Dashboard (which shows the profile) stay open.
 */
import { useEffect, useState } from 'react';
import teacherApi from './teacherSession';

/** What is still missing, as labels. `classes` is null while not known. */
export const missingOf = (teacher, classes, courses) => [
    !String(teacher?.designation || '').trim() && 'designation',
    !String(teacher?.department || '').trim() && 'department',
    !String(teacher?.phone || '').trim() && 'mobile number',
    !String(teacher?.email || '').trim() && 'email',
    teacher?.mentor360 && classes && (courses?.length ?? 1) > 0 && !classes.length && 'what you teach'
].filter(Boolean);

/** The classes they teach, fetched again on each page change (they are added on the profile page). */
export const useMissingProfile = (teacher, enabled, pathname) => {
    const [teach, setTeach] = useState(null);   // { classes, courses }
    useEffect(() => {
        if (!enabled || !teacher?.mentor360) return undefined;
        let live = true;
        teacherApi.get('/360').then((r) => { if (live) setTeach({ classes: r.data.classes || [], courses: r.data.courses || [] }); }).catch(() => {});
        return () => { live = false; };
    }, [enabled, teacher?.mentor360, pathname]);
    return enabled ? missingOf(teacher, teacher?.mentor360 ? teach?.classes ?? null : null, teach?.courses) : [];
};

