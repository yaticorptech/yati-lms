/**
 * The parent dashboard's shared state (2026-11-19): the parent's children, the child chosen in the switcher, and that
 * child's activity. ParentProvider.jsx fills it; useParent.js reads it.
 */
import { createContext } from 'react';

export const ParentContext = createContext(null);

const PICKED = 'parent:child';
export const readPicked = () => { try { return localStorage.getItem(PICKED) || ''; } catch { return ''; } };
export const savePicked = (id) => { try { if (id) localStorage.setItem(PICKED, id); else localStorage.removeItem(PICKED); } catch { /* chosen again next time */ } };

// The newest announcement seen, per child (2026-11-19: each child's own count).
const SEEN = 'parent:announcementsSeen';
export const readSeen = (childId = '') => { try { return Number(localStorage.getItem(`${SEEN}:${childId}`)) || 0; } catch { return 0; } };
export const saveSeen = (childId, t) => { try { localStorage.setItem(`${SEEN}:${childId}`, String(t)); } catch { /* counted again next time */ } };

/** The sidebar: Overview, then the institution's pages and the AI card's (2026-11-19, the user's layout). */
export const SECTIONS = [
    { group: 'Institution', key: 'institution', items: [
        // The user's order (2026-11-19): attendance, student ranking, timetable, extra-curricular, fees, results.
        ['attendance', 'Attendance'], ['ranking', 'Student Ranking'], ['timetable', 'Timetable'], ['extra-curricular', 'Extra-curricular'], ['fees', 'Fees'], ['results', 'Results']
    ] },
    { group: 'AI Card', key: 'ai', items: [
        ['activity', 'Activity'], ['courses', 'Courses'], ['multilingo', 'Multilingo'], ['career', 'Career Path'], ['interviews', 'Interview practice'],
        ['certificates', 'Certificates'], ['quizzes', 'Global Quiz'], ['competitions', 'Competitions'], ['jobs', 'Part-time jobs'], ['badges', 'Badges']
    ] }
];
