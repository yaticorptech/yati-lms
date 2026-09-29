/**
 * Where a student left off: the saved video position and the lesson a course
 * reopens on. Pure logic, run against an in-memory stand-in for localStorage.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    readPosition, readPositionEntry, writePosition, clearPosition, resumePoint,
    readActiveLesson, readActiveLessonEntry, rememberActiveLesson, newest,
    unlockedLessonIds, chooseLessonToOpen
} from '../../src/shared/playback/resume.js';

const memory = () => {
    const m = new Map();
    return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: (k) => m.delete(k),
        size: () => m.size
    };
};

const broken = {
    getItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => { throw new Error('SecurityError'); }
};

describe('video position', () => {
    test('round-trips through storage and is kept per lesson', () => {
        const s = memory();
        writePosition('L1', 123.45, s);
        writePosition('L2', 7, s);
        assert.equal(readPosition('L1', s), 123.45);
        assert.equal(readPosition('L2', s), 7);
        assert.equal(readPosition('L3', s), 0);
    });

    test('zero or less clears the entry, as does clearPosition', () => {
        const s = memory();
        writePosition('L1', 50, s);
        writePosition('L1', 0, s);
        assert.equal(s.size(), 0);
        writePosition('L1', 50, s);
        clearPosition('L1', s);
        assert.equal(readPosition('L1', s), 0);
    });

    test('ignores garbage and non-finite values', () => {
        const s = memory();
        s.setItem('yati:video-pos:L1', 'not a number');
        assert.equal(readPosition('L1', s), 0);
        writePosition('L1', NaN, s);
        writePosition('L1', Infinity, s);
        assert.equal(readPosition('L1', s), 0);
        assert.equal(readPosition(undefined, s), 0);
        assert.equal(readPosition('', s), 0);
    });

    test('a storage that throws is a storage that is not there', () => {
        assert.doesNotThrow(() => writePosition('L1', 10, broken));
        assert.equal(readPosition('L1', broken), 0);
        assert.doesNotThrow(() => clearPosition('L1', broken));
    });

    test('resumePoint restores mid-video, starts over near the end, survives an unknown duration', () => {
        assert.equal(resumePoint(90, 600), 90);
        assert.equal(resumePoint(599, 600), 0, 'within the end margin counts as finished');
        assert.equal(resumePoint(598, 600), 0, 'exactly at the margin counts as finished too');
        assert.equal(resumePoint(597, 600), 597);
        assert.equal(resumePoint(90, NaN), 90, 'duration not known yet');
        assert.equal(resumePoint(0, 600), 0);
        assert.equal(resumePoint(-5, 600), 0);
        assert.equal(resumePoint(undefined, 600), 0);
    });
});

describe('when a position was written', () => {
    test('every entry carries the time it was saved', () => {
        const s = memory();
        writePosition('L1', 42, s, 1700000000000);
        assert.deepEqual(readPositionEntry('L1', s), { seconds: 42, at: 1700000000000 });
        assert.equal(readPositionEntry('L9', s), null);
    });

    test('defaults to now', () => {
        const s = memory();
        const before = Date.now();
        writePosition('L1', 42, s);
        const { at } = readPositionEntry('L1', s);
        assert.ok(at >= before && at <= Date.now());
    });

    test('an entry from before timestamps still reads, dated to the beginning of time', () => {
        const s = memory();
        s.setItem('yati:video-pos:L1', '42.5');
        assert.deepEqual(readPositionEntry('L1', s), { seconds: 42.5, at: 0 });
        s.setItem('yati:active-lesson:C1', 'L2');
        assert.deepEqual(readActiveLessonEntry('C1', s), { id: 'L2', at: 0 });
        assert.equal(readActiveLesson('C1', s), 'L2');
    });

    test('the newer of this device\'s copy and the server\'s wins; a tie stays local', () => {
        const local = { seconds: 42, at: 200 };
        const server = { seconds: 20, at: 300 };
        assert.equal(newest(local, server), server);
        assert.deepEqual(newest({ seconds: 42, at: 400 }, server), { seconds: 42, at: 400 });
        assert.deepEqual(newest({ seconds: 42, at: 300 }, server), { seconds: 42, at: 300 }, 'a tie');
        assert.equal(newest(null, server), server);
        assert.equal(newest(local, null), local);
        assert.equal(newest(null, null), null);
        assert.deepEqual(newest({ seconds: 1, at: 0 }, { seconds: 2, at: 1 }), { seconds: 2, at: 1 }, 'a legacy entry loses to any dated one');
    });
});

describe('active lesson', () => {
    test('is remembered per course and ignored when nothing is stored', () => {
        const s = memory();
        assert.equal(readActiveLesson('C1', s), null);
        rememberActiveLesson('C1', 'L2', s, 1700000000000);
        rememberActiveLesson('C2', 'L9', s);
        assert.equal(readActiveLesson('C1', s), 'L2');
        assert.equal(readActiveLesson('C2', s), 'L9');
        assert.deepEqual(readActiveLessonEntry('C1', s), { id: 'L2', at: 1700000000000 });
        rememberActiveLesson('C1', undefined, s);
        assert.equal(readActiveLesson('C1', s), 'L2', 'a missing lesson does not erase the last one');
    });

    test('tolerates a storage that throws', () => {
        assert.doesNotThrow(() => rememberActiveLesson('C1', 'L1', broken));
        assert.equal(readActiveLesson('C1', broken), null);
    });
});

const lesson = (id) => ({ _id: id, title: id });
const modules = [
    { _id: 'M1', lessons: [lesson('L1'), lesson('L2')] },
    { _id: 'M2', lessons: [lesson('L3'), lesson('L4')] },
    { _id: 'M3', locked: true, lessons: [lesson('L5')] }
];

describe('sequential unlocking', () => {
    test('opens every completed lesson and the first one still to do', () => {
        assert.deepEqual([...unlockedLessonIds(modules, [])], ['L1']);
        assert.deepEqual([...unlockedLessonIds(modules, ['L1'])], ['L1', 'L2']);
        assert.deepEqual([...unlockedLessonIds(modules, ['L1', 'L2'])], ['L1', 'L2', 'L3']);
    });

    test('a fully completed course has everything open', () => {
        assert.deepEqual([...unlockedLessonIds(modules, ['L1', 'L2', 'L3', 'L4', 'L5'])], ['L1', 'L2', 'L3', 'L4', 'L5']);
    });

    test('a module without lessons does not break the walk', () => {
        const withEmpty = [{ _id: 'M0' }, ...modules];
        assert.deepEqual([...unlockedLessonIds(withEmpty, ['L1'])], ['L1', 'L2']);
    });
});

describe('which lesson the course opens on', () => {
    test('the first lesson when nothing is remembered', () => {
        const { module, lesson: l } = chooseLessonToOpen(modules, ['L1', 'L2'], null);
        assert.equal(module._id, 'M1');
        assert.equal(l._id, 'L1');
    });

    test('the remembered lesson, with its module, when it is still unlocked', () => {
        const { module, lesson: l } = chooseLessonToOpen(modules, ['L1', 'L2'], 'L3');
        assert.equal(module._id, 'M2');
        assert.equal(l._id, 'L3');
    });

    test('a remembered lesson that is now locked falls back to the first', () => {
        // L3 is remembered but L2 is no longer complete (say the admin reset it).
        const { module, lesson: l } = chooseLessonToOpen(modules, ['L1'], 'L3');
        assert.equal(module._id, 'M1');
        assert.equal(l._id, 'L1');
    });

    test('a remembered lesson inside a drip-locked module falls back to the first', () => {
        const { lesson: l } = chooseLessonToOpen(modules, ['L1', 'L2', 'L3', 'L4'], 'L5');
        assert.equal(l._id, 'L1');
    });

    test('a remembered lesson that was deleted falls back to the first', () => {
        const { lesson: l } = chooseLessonToOpen(modules, ['L1', 'L2', 'L3', 'L4', 'L5'], 'GONE');
        assert.equal(l._id, 'L1');
    });

    test('an empty course opens nothing', () => {
        assert.deepEqual(chooseLessonToOpen([], [], 'L1'), { module: null, lesson: null });
        assert.deepEqual(chooseLessonToOpen([{ _id: 'M1', lessons: [] }], [], null), { module: { _id: 'M1', lessons: [] }, lesson: null });
    });
});
