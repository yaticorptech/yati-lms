import { createContext, useCallback, useContext, useEffect, useRef } from 'react';

/** The Career Path mascot, for the section's pages. Not the lesson page's corner mascot (src/mascot/useMascot). */
export const CareerMascotContext = createContext(null);

// Outside the Career Path — a component rendered anywhere else — nothing happens.
const noop = () => {};
const SILENT = {
    moveTo: noop, point: noop, react: noop, setExpression: noop, sleep: noop, wake: noop, lookAt: noop,
    stepCompleted: noop, phaseCompleted: noop, pathCompleted: noop, quizGraded: noop, quizAnswer: noop,
    taskStarted: noop, video: noop, region: () => noop, lockedClicked: noop, cardClicked: noop,
    timetableOpened: noop, calendarOpened: noop, emit: noop,
    hidden: true, setHidden: noop
};

/**
 * `const mascot = useMascot();`
 *
 * Direct it:   mascot.moveTo(ref | 'target-name' | '#selector')
 *              mascot.point(ref | name, 'Start here')
 *              mascot.react('cheer-jump')        one of the kit's stills
 *              mascot.setExpression('curious', 2000)
 *              mascot.sleep() / mascot.wake()
 * Report what happened, and it decides what to do:
 *              stepCompleted(), phaseCompleted(), pathCompleted(),
 *              quizGraded(result), quizAnswer(right), taskStarted(el),
 *              video('playing' | 'paused' | 'ended', el), lockedClicked(el, what),
 *              cardClicked(el), timetableOpened(next), calendarOpened()
 * Everything is queued, so nothing overlaps and no reaction is cut short.
 */
export function useMascot() {
    return useContext(CareerMascotContext) ?? SILENT;
}

/**
 * A callback ref for a section the student reads, watches or answers in:
 *   <div ref={useMascotRegion('reading')}>…</div>
 * While it is on screen the mascot behaves accordingly — reading along,
 * thinking through the quiz — and stops when it scrolls away or unmounts.
 * A null `kind` registers nothing, for a section that is no longer that.
 */
export function useMascotRegion(kind) {
    const mascot = useMascot();
    const off = useRef(null);
    const ref = useCallback(
        (el) => {
            off.current?.();
            off.current = el && kind ? mascot.region(el, kind) : null;
        },
        [mascot, kind]
    );
    useEffect(() => () => off.current?.(), []);
    return ref;
}
