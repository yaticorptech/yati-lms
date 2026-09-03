/**
 * The Jobs section's calls, on the LMS's own axios client.
 *
 * The standalone app used bare fetch against a relative /api. Inside the LMS
 * every request has to carry the student's bearer token, which the shared
 * client already attaches — so this is a thin layer over it rather than a
 * second HTTP stack.
 *
 * Errors are re-thrown carrying the server's own message. The ported routes
 * answer {error}; the rest of the LMS answers {message}; both are checked so a
 * failure reads as a sentence rather than "Request failed".
 */
import client from '../utils/api';

const unwrap = (err) => {
    const body = err.response?.data;
    const message = body?.error || body?.message || err.message || 'Something went wrong.';
    const wrapped = new Error(message);
    wrapped.status = err.response?.status;
    wrapped.code = body?.code;
    throw wrapped;
};

const get = (path, config) => client.get(`/jobs${path}`, config).then((r) => r.data).catch(unwrap);
const post = (path, body) => client.post(`/jobs${path}`, body).then((r) => r.data).catch(unwrap);

export const jobsApi = {
    recommend: (payload) => post('/recommend', payload),
    skillGap: (role, skills) => post('/roles/skill-gap', { role, skills }),
    roles: () => get('/roles'),
    skills: () => get('/roles/skills'),
    stats: () => get('/stats'),
    geocode: (lat, lon) => get(`/meta/geocode?lat=${lat}&lon=${lon}`),
    ipLocation: () => get('/meta/ip-location'),
    history: () => get('/meta/history'),
    savedList: () => get('/saved'),
    resumeGet: () => get('/resume'),
    resumeUpload: (file) => {
        const fd = new FormData();
        fd.append('resume', file);
        return client.post('/jobs/resume', fd).then((r) => r.data).catch(unwrap);
    },
    resumeDelete: () => client.delete('/jobs/resume').then((r) => r.data).catch(unwrap),
    saveJob: (jobId) => post('/saved', { jobId }),
    unsaveJob: (jobId) => client.delete(`/jobs/saved/${jobId}`).then((r) => r.data).catch(unwrap)
};

/**
 * What Career Path already knows about this student, in the job form's shape.
 *
 * The two sections answer the same question — "what do I need to become X?" —
 * so the student should never have to re-type an answer the LMS is holding.
 * The goal supplies the target role. Skills are filtered to the ones actually
 * progressed: prefilling every roadmap skill would claim knowledge the student
 * is still working towards, and the gap card would then congratulate them on
 * being ready for a job they are not.
 *
 * "Progressed" requires evidence, not only an assessment. The level on a skill
 * is not earned here — the roadmap writes it from what the goal demands, so a
 * student can be marked Advanced at Full Stack Architecture on their first day
 * — and passing level alone was enough to send a skill they had never worked
 * on to the matcher as experience they hold. A level above Beginner now lowers
 * the bar rather than clearing it: it still counts, but only once at least one
 * completed task has been credited to that skill.
 *
 * Null when there is nothing usable — no goal yet, Career Path locked (403),
 * or the requests failing. The caller treats that as a non-event.
 */
export async function careerPrefill() {
    const [goalRes, skillsRes] = await Promise.allSettled([
        client.get('/career/goals'),
        client.get('/career/skills')
    ]);

    const goal = goalRes.status === 'fulfilled' ? goalRes.value.data : null;
    const rows = skillsRes.status === 'fulfilled' && Array.isArray(skillsRes.value.data)
        ? skillsRes.value.data : [];

    const skills = rows
        .filter((s) => {
            const progress = s.progress ?? 0;
            const assessedAbove = ['Intermediate', 'Advanced', 'Expert'].includes(s.level);
            // Either a solid run of work on its own, or a head start the
            // student has actually begun to act on.
            return progress >= 40 || (assessedAbove && progress > 0);
        })
        .map((s) => s.skillName)
        .filter(Boolean)
        .slice(0, 12);

    if (!goal?.careerGoal && !skills.length) return null;
    return {
        ...(goal?.careerGoal ? { role: goal.careerGoal } : {}),
        ...(skills.length ? { skills } : {})
    };
}

/** Browser geolocation → "City, Country" via the server-side geocoder. */
export function detectLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error("Geolocation isn't supported by this browser."));
        }
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                const { latitude, longitude } = coords;
                try {
                    const d = await jobsApi.geocode(latitude, longitude);
                    resolve({ label: d.label, coords: [longitude, latitude] });
                } catch {
                    resolve({
                        label: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
                        coords: [longitude, latitude]
                    });
                }
            },
            (err) => {
                const msg =
                    err.code === 1 ? 'Location permission denied — type a location instead.'
                        : err.code === 2 ? 'Location unavailable — type a location instead.'
                            : 'Location request timed out — type a location instead.';
                reject(new Error(msg));
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
        );
    });
}

/**
 * A location for first load without ever raising a permission dialog nobody
 * asked for: precise coordinates when geolocation is already granted, a coarse
 * IP lookup otherwise. An unsolicited prompt on page load is hostile, and
 * Chrome may auto-block it. Resolves to a null label when nothing could be
 * worked out — callers treat that as a non-event.
 */
export async function autoDetectLocation() {
    try {
        const status = await navigator.permissions?.query({ name: 'geolocation' });
        if (status?.state === 'granted') return await detectLocation();
    } catch {
        /* Permissions API missing or the query rejected — fall through to IP. */
    }
    try {
        const d = await jobsApi.ipLocation();
        return d?.label ? { label: d.label, coords: null, approximate: true } : { label: null };
    } catch {
        return { label: null };
    }
}
