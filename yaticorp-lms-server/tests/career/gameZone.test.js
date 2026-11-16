const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { zoneFor, classNumber } = require('../../src/career/services/gameZone');

describe('games zone from the Career Path class', () => {
    const cases = [
        [{ educationLevel: 'Primary School (Class 1–5)', currentClass: 'Class 1' }, 'young', 'foundation'],
        [{ educationLevel: 'Primary School (Class 1–5)', currentClass: '5' }, 'young', 'developing'],
        [{ educationLevel: 'Middle School (Class 6–8)', currentClass: 'Class 6' }, 'smart', 'intermediate'],
        [{ educationLevel: 'High School (Class 9–10)', currentClass: 'Class 10' }, 'smart', 'analytical'],
        [{ educationLevel: 'Higher Secondary (Class 11–12)', currentClass: 'Class 12' }, 'master', 'advanced'],
        [{ educationLevel: 'Undergraduate', currentClass: '' }, 'master', 'advanced'],
        [{ educationLevel: 'Working Professional' }, 'master', 'advanced'],
        [{ educationLevel: 'High School (Class 9–10)', currentClass: '' }, 'smart', 'analytical'],
        [null, null, null]
    ];
    for (const [goal, zone, band] of cases) {
        test(`${JSON.stringify(goal)} → ${zone} / ${band}`, () => {
            const z = zoneFor(goal);
            assert.equal(z.zone, zone);
            assert.equal(z.band, band);
        });
    }
    test('class numbers in the forms students write them', () => {
        assert.equal(classNumber('Class 10'), 10);
        assert.equal(classNumber('7th'), 7);
        assert.equal(classNumber('XII'), 12);
        assert.equal(classNumber('13'), null);
        assert.equal(classNumber(''), null);
    });
});
