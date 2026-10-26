/**
 * When a pop-in notice must wait: the one rule shared by everything that comes
 * up on its own — the "new Global Quiz" card (GlobalQuizAlert) and the daily
 * puzzle (ContinuePanel). Kept in one place so the two can never disagree
 * about what counts as the student being busy.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoopHidden } from './loopVisibility';

// Pages that are themselves the important thing: a lesson, an interview, a
// game, setting up Career Path. A notice waits until the student leaves.
export const BUSY_PATHS = [/^\/learn\//, /^\/interview\/mock\//, /^\/competitions\/play\//, /^\/competitions\/[^/]+\/quiz/, /^\/career\/onboarding/];

export const isBusyPath = (pathname) => BUSY_PATHS.some((re) => re.test(pathname || ''));

// Something on screen a notice must not get in front of: a popup, a
// celebration, or the student typing.
export const busyOnScreen = () => {
    if (document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"], [data-game-celebration]')) return true;
    const el = document.activeElement;
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

/**
 * True while the student is busy: on a busy page, on a screen that hides Yati
 * (a lesson's video, notes or quiz, a game, a mock interview: useLoopHidden),
 * or with a popup open or the cursor in a field. What is on screen changes
 * without React knowing, so it is looked at twice a second — but only while
 * `watching`, i.e. while there is something waiting to be shown.
 */
export function useStudentBusy(watching) {
    const { pathname } = useLocation();
    const loopHidden = useLoopHidden();
    const [screenBusy, setScreenBusy] = useState(false);
    useEffect(() => {
        if (!watching) return undefined;
        const look = () => setScreenBusy(busyOnScreen());
        look();
        const timer = setInterval(look, 500);
        return () => clearInterval(timer);
    }, [watching]);
    return loopHidden || isBusyPath(pathname) || (watching && screenBusy);
}
