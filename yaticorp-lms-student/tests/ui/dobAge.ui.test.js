/**
 * The part-time details form's date of birth: the age it works out, and what
 * that age means for the work the student will be shown.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({ '/opportunities': {} });

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** A birthday `years` ago, shifted by `days`, so the age under test is exact. */
const born = (years, days = -1) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    d.setDate(d.getDate() + days);
    return iso(d);
};

const entry = (dateOfBirth) => `
import { createRoot } from 'react-dom/client';
import ProfileOnboarding from '${srcFile('opportunities/ProfileOnboarding.jsx')}';
const vocab = { interests: [{ id: 'events', label: 'Events', icon: '*' }], categories: [], types: [] };
createRoot(document.getElementById('root')).render(
  <ProfileOnboarding vocab={vocab}
    initial={{ dateOfBirth: ${dateOfBirth ? `'${dateOfBirth}'` : "''"}, wantFrom: '', wantTo: '', interests: [], guardianPhone: '' }}
    onSaved={() => {}} onCancel={() => {}} />);`;

const read = `
    await sleep(600);
    const chip = $$('span').find((s) => /years? old$/.test(s.innerText.trim()));
    return { chip: chip ? chip.innerText.trim() : null, hint: text($('#opp-dob-hint')) };`;

describe('the age behind the date of birth', { skip: skipWithoutChrome }, () => {
    test('an adult is told their age and that everything is open to them', async () => {
        const { result, errors } = await screen({ entry: entry(born(20)), api, script: read });
        assert.deepEqual(errors, []);
        assert.equal(result.chip, '20 years old');
        assert.match(result.hint, /^You are 20\./);
        assert.match(result.hint, /All the part-time work on the board is open to you/);
    });

    test('a teenager is told a guardian comes with it', async () => {
        const { result } = await screen({ entry: entry(born(16)), api, script: read });
        assert.equal(result.chip, '16 years old');
        assert.match(result.hint, /guardian in the loop/);
    });

    test('a child is told when local work opens to them', async () => {
        const { result } = await screen({ entry: entry(born(12)), api, script: read });
        assert.equal(result.chip, '12 years old');
        assert.match(result.hint, /Local jobs open at 14/);
    });

    test('a birthday still to come this year does not count', async () => {
        // Eighteen years ago tomorrow: they are seventeen until tomorrow, and
        // the form must not offer them adult work a day early.
        const { result } = await screen({ entry: entry(born(18, 1)), api, script: read });
        assert.equal(result.chip, '17 years old');
        assert.match(result.hint, /guardian in the loop/);
    });

    test('a birthday that has just passed does count', async () => {
        const { result } = await screen({ entry: entry(born(18, -1)), api, script: read });
        assert.equal(result.chip, '18 years old');
        assert.match(result.hint, /All the part-time work/);
    });

    test('with no date yet it explains why the date is wanted', async () => {
        const { result } = await screen({ entry: entry(''), api, script: read });
        assert.equal(result.chip, null, 'no age is claimed before a date is given');
        assert.equal(result.hint, 'Decides which jobs you can see. Needed once.');
    });

    test('the age follows the date as it is typed', async () => {
        const dob = born(15);
        const { result } = await screen({
            entry: entry(''), api, script: `
                await sleep(600);
                const field = $('#opp-dob');
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(field, '${dob}');
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                await sleep(300);
                const chip = $$('span').find((s) => /years? old$/.test(s.innerText.trim()));
                return { chip: chip ? chip.innerText.trim() : null, hint: text($('#opp-dob-hint')) };` });
        assert.equal(result.chip, '15 years old');
        assert.match(result.hint, /^You are 15\./);
    });

    test('a date in the future is not turned into an age', async () => {
        const { result } = await screen({ entry: entry(born(-2)), api, script: read });
        assert.equal(result.chip, null);
        assert.equal(result.hint, 'Decides which jobs you can see. Needed once.');
    });
});
