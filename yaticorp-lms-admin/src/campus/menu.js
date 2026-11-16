/**
 * Campus's menu (2026-11-14): the sidebar's Campus dropdown (layouts/OrgAdminLayout.jsx) and,
 * on phones and tablets where there is no sidebar, the strip on top of every Campus page
 * (CampusLayout.jsx). `soon`: locked for now, shown greyed with a lock.
 * No Overview (2026-11-14): the organization's Dashboard is that. Courses, Student Ranking and
 * Extra-curricular sit in here too, out of the main menu, while Campus is on (`outside`: their own
 * pages, not under /organization/campus).
 */
import { Users, GraduationCap, Building2, BookOpen, Orbit, Shield, UserPlus, Megaphone, ClipboardList, Wallet, Landmark, MessageSquareText } from 'lucide-react';

export const CAMPUS_HOME = '/organization/campus';
export const CAMPUS_ITEMS = [
    { to: `${CAMPUS_HOME}/departments`, label: 'Departments & logins', icon: Building2 },
    { to: `${CAMPUS_HOME}/admissions`, label: 'Admissions', icon: UserPlus, badge: 'applications' },
    // Every admitted student, by department and semester (2026-11-14).
    // Also every member and the requests to join (2026-11-16): the one Students list while Campus is on.
    { to: `${CAMPUS_HOME}/students`, label: 'Students', icon: Users, badge: 'requests' },
    { to: `${CAMPUS_HOME}/announcements`, label: 'Announcements', icon: Megaphone },
    { to: '/organization/courses', label: 'Courses', icon: BookOpen, outside: true },
    { to: '/organization/360-activities', label: 'Student Ranking', icon: Orbit, outside: true, ranking: true },
    { to: '/organization/ncc-nss', label: 'Extra-curricular', icon: Shield, outside: true },
    // Locked for now (2026-11-14): shown greyed with a lock.
    { to: `${CAMPUS_HOME}/internal-marks`, label: 'Internal marks', icon: ClipboardList, soon: true },
    { to: `${CAMPUS_HOME}/fees`, label: 'Fees', icon: Wallet, soon: true },
    { to: `${CAMPUS_HOME}/exam-board`, label: 'Examination', icon: Landmark, soon: true },
    { to: `${CAMPUS_HOME}/feedback`, label: 'Feedback', icon: MessageSquareText, soon: true },
    { to: `${CAMPUS_HOME}/alumni`, label: 'Alumni', icon: GraduationCap }
];
/** The main-menu pages that move into Campus while it is on. */
export const MOVED_INTO_CAMPUS = CAMPUS_ITEMS.filter((i) => i.outside).map((i) => i.to);
/** The main menu's own Students, hidden while Campus is on: Campus → Students is the one list then (2026-11-16). */
export const REPLACED_BY_CAMPUS = ['/organization/students'];
/** Its label, with the organization's own name for Student Ranking (kept by OrgAdminLayout). */
export const labelOf = (item) => {
    if (!item.ranking) return item.label;
    try { return sessionStorage.getItem('org-ranking-name') || item.label; } catch { return item.label; }
};
