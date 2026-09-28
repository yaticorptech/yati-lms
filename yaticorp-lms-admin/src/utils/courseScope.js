/**
 * Whose courses the course pages are working on.
 *
 * The course list, the course builder and the lesson editor are written once
 * and used twice: by the platform's administrators on platform courses, and
 * by an organization's administrator on that organization's own courses.
 * This says which — where the API lives and where the pages sit — so the same
 * screens call the right endpoints and link to the right place.
 */
import { createContext, useContext } from 'react';

export const PLATFORM_SCOPE = { api: '/admin', base: '', video: '/vdocipher', organization: false };
export const ORGANIZATION_SCOPE = { api: '/organizations/me', base: '/organization', video: '/organizations/me/vdocipher', organization: true };

// Platform unless an organization's pages say otherwise, so every existing
// use of these pages behaves exactly as before.
export const CourseScope = createContext(PLATFORM_SCOPE);
export const useCourseScope = () => useContext(CourseScope);
