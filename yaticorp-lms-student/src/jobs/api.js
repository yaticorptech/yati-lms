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
/**
 * Everything the LMS knows the student can do, in one list.
 *
 * Three sources, and the reason all three belong here: the resume is what
 * they say about themselves, Career Path is what they have been practising,
 * and the courses are what this LMS actually taught them — a student who
 * finished the React course has React whether or not their resume mentions
 * it, and a job search that ignores that is ignoring the point of the LMS.
 *
 * The ATS resume builder already merges the three and remembers where each
 * skill came from, so this reads its answer rather than inventing a second
 * one that could disagree with the resume the student downloads.
 *
 * @returns {{ skills: string[], bySource: { resume: string[], course: string[], career: string[] }, courses: number }}
 */
export async function learnerSkills() {
    const empty = { skills: [], bySource: { resume: [], course: [], career: [] }, courses: 0 };
    try {
        const { data } = await client.get('/user/resume/ats/data');
        const rows = Array.isArray(data?.skills) ? data.skills : [];
        const bySource = { resume: [], course: [], career: [] };
        for (const row of rows) {
            for (const src of row.sources || []) if (bySource[src]) bySource[src].push(row.name);
        }
        return {
            skills: rows.map((r) => r.name).filter(Boolean),
            bySource,
            courses: Number(data?.stats?.courses) || 0
        };
    } catch {
        return empty;
    }
}

export async function careerPrefill() {
    const [goalRes, skillsRes] = await Promise.allSettled([
        client.get('/career/goals'),
        client.get('/career/skills')
    ]);

    const goal = goalRes.status === 'fulfilled' ? goalRes.value.data : null;
    const rows = skillsRes.status === 'fulfilled' && Array.isArray(skillsRes.value.data)
        ? skillsRes.value.data : [];

    // Career Path skills reach the search through learnerSkills() instead:
    // the server opens compound names like "HTML5 / CSS3 / Tailwind CSS" into
    // the individual skills a listing can be matched on, which this cannot do.
    // Kept here only as a fallback for a student with nothing else.
    const skills = rows
        .filter((s) => (s.progress ?? 0) > 0 || ['Intermediate', 'Advanced', 'Expert'].includes(s.level))
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
