/**
 * What makes an organization's profile complete (asked 2026-11-04): every
 * field in Settings, its logo, and its courses and sections. Until then the
 * dashboard asks for it and the other pages are locked (components/OrgProfileLock).
 */
import { useEffect, useState } from 'react';
import api from './api';

export const PROFILE_FIELDS = [
    ['name', 'organization name'], ['contactPerson', 'contact person'], ['email', 'email'], ['phone', 'phone'],
    ['website', 'website'], ['address', 'address'], ['state', 'state'], ['logo', 'logo']
];

/** The details still missing, as labels (courses not included). */
export const detailsMissing = (org) => (org ? PROFILE_FIELDS.filter(([k]) => !String(org[k] ?? '').trim()).map(([, label]) => label) : []);

/**
 * { details: [labels], courses: bool | null, missing: [labels], loaded } — asked again whenever `key`
 * changes (the page), so finishing the profile unlocks the rest at once. A BSG office is never asked.
 */
export const useOrgProfile = (key) => {
    const [state, setState] = useState({ details: [], courses: null, loaded: false, office: false });
    useEffect(() => {
        let live = true;
        Promise.all([
            api.get('/organizations/me').then((r) => r.data.organization).catch(() => null),
            api.get('/organizations/me/classes').then((r) => (r.data.programs || []).length > 0).catch(() => null)
        ]).then(([org, courses]) => {
            if (!live) return;
            setState({ details: org ? detailsMissing(org) : [], courses, loaded: Boolean(org) || courses !== null, office: Boolean(org?.bsgOffice) });
        });
        return () => { live = false; };
    }, [key]);
    if (state.office) return { details: [], courses: true, missing: [], loaded: state.loaded };
    const missing = [...state.details, ...(state.courses === false ? ['courses and sections'] : [])];
    return { ...state, missing };
};

export const listOf = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
