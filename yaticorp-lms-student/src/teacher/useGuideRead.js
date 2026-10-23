import { useCallback, useEffect, useState } from 'react';
import teacherApi from './teacherSession';

/**
 * Which steps of a guide the teacher has marked as read — publishing,
 * plagiarism, writing, or the Research Path lessons ('stages'). Read once per
 * visit and shared by every page; a tick shows at once and is put back if the
 * server says no.
 */
let cache = null;
let loading = null;
const listeners = new Set();
const publish = () => listeners.forEach((fn) => fn(cache));

const loadOnce = () => {
    if (cache) return Promise.resolve(cache);
    if (!loading) {
        loading = teacherApi.get('/guides')
            .then((r) => { cache = r.data.read || {}; publish(); return cache; })
            .catch(() => { loading = null; return {}; });
    }
    return loading;
};

/** Forget what was read (on sign-out, or in tests). */
export const resetGuideRead = () => { cache = null; loading = null; };

export default function useGuideRead(guide) {
    const [all, setAll] = useState(cache || {});
    useEffect(() => {
        listeners.add(setAll);
        loadOnce().then((read) => setAll(read));
        return () => { listeners.delete(setAll); };
    }, []);

    const toggle = useCallback(async (step, read) => {
        const before = cache || {};
        const list = before[guide] || [];
        cache = { ...before, [guide]: read ? [...new Set([...list, step])] : list.filter((k) => k !== step) };
        publish();
        try {
            const r = await teacherApi.put(`/guides/${guide}/${step}`, { read });
            cache = { ...cache, [guide]: r.data.read };
            publish();
        } catch {
            cache = { ...cache, [guide]: list };
            publish();
        }
    }, [guide]);

    return { read: all[guide] || [], toggle };
}
