/**
 * The leaderboard card on a narrow phone.
 *
 * Headless Chrome will not open a window below 500px, so the viewport stays at
 * 500 — under Tailwind's `sm` break, so the mobile side of every class is the
 * one running — and the card is placed in a box the width of a real phone.
 * That reproduces a 320 or 360px screen without disturbing the media queries.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const PHONE_VIEWPORT = 500;

const person = (rank, name, xp, streak, badge, movement, isMe = false) => ({
    rank, name, xp, level: 1, streak, movement, avatar: '', userId: `u${rank}`, isMe,
    badge: badge ? { emoji: badge, title: 'A badge', count: 1 } : null
});

const board = {
    total: 5, around: [],
    entries: [
        person(1, 'You', 230, 3, '🔥', 0, true),
        person(2, 'Aarav Shetty', 120, 2, '📚', 1),
        person(3, 'Presilla Dsouza', 30, 1, '⭐', -1),
        person(4, 'Meera Krishnan', 15, 3, '🔥', 0),
        person(5, 'Ravi Kumar', 10, 2, '📚', 0)
    ],
    me: person(1, 'You', 230, 3, '🔥', 0, true)
};
const api = apiModule({ '/rewards/leaderboard': board, '/rewards/summary': { xp: 230, level: 1, streak: 3 } });

const entry = (box) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import LeaderboardCard from '${srcFile('components/rewards/LeaderboardCard.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter><div id="box" style={{ width: ${box}, padding: 12 }}><LeaderboardCard /></div></MemoryRouter>);`;

/**
 * Anything whose content is wider than the box it was given. A container that
 * scrolls, clips or is positioned out of flow is doing that on purpose and is
 * not a layout failure.
 */
const SWEEP = `
    const handled = (el) => {
        const st = getComputedStyle(el);
        return ['auto', 'scroll', 'hidden', 'clip'].includes(st.overflowX) || st.position === 'absolute';
    };
    const offenders = [...document.querySelectorAll('*')]
        .filter((el) => el.clientWidth > 4 && el.scrollWidth > el.clientWidth + 1 && !handled(el))
        .map((el) => el.tagName.toLowerCase() + '[' + String(el.className || '').split(' ').filter(Boolean).slice(0, 4).join(' ') + ']'
            + ' needs ' + el.scrollWidth + ' has ' + el.clientWidth);`;

describe('the leaderboard on a phone', { skip: skipWithoutStyles }, () => {
    for (const box of [320, 360]) {
        test(`the whole card fits a ${box}px screen`, async () => {
            const { result, errors } = await screen({
                entry: entry(box), api, width: PHONE_VIEWPORT, styles: true, script: `
                    await sleep(900);
                    ${SWEEP}
                    return { offenders, vw: window.innerWidth };` });
            assert.deepEqual(errors, []);
            assert.equal(result.vw, PHONE_VIEWPORT, 'the mobile side of the styles is the one running');
            assert.deepEqual(result.offenders, [], `does not fit: ${result.offenders.join(' | ')}`);
        });
    }

    test('the period picker drops below the heading rather than squeezing it', async () => {
        const { result } = await screen({
            entry: entry(320), api, width: PHONE_VIEWPORT, styles: true, script: `
                await sleep(900);
                const heading = $$('h2').find((h) => /Leaderboard/.test(h.innerText));
                const picker = $('select');
                return {
                    headingFits: heading.scrollWidth <= heading.clientWidth + 1,
                    heading: text(heading),
                    below: picker.getBoundingClientRect().top > heading.getBoundingClientRect().bottom
                };` });
        assert.equal(result.heading, 'Leaderboard');
        assert.ok(result.headingFits, 'the heading is not cut off');
        assert.ok(result.below, 'the picker has moved to its own line');
    });

    test('on a desktop the picker is back beside the heading', async () => {
        const { result } = await screen({
            entry: entry("'100%'"), api, width: 1280, styles: true, script: `
                await sleep(900);
                const heading = $$('h2').find((h) => /Leaderboard/.test(h.innerText));
                const picker = $('select');
                return { sameLine: picker.getBoundingClientRect().top < heading.getBoundingClientRect().bottom };` });
        assert.ok(result.sameLine, 'one line again when there is room');
    });

    test('the seven-column table is put away on a phone, and the rows stacked instead', async () => {
        const { result } = await screen({
            entry: entry(360), api, width: PHONE_VIEWPORT, styles: true, script: `
                await sleep(900);
                const visible = (el) => !!el && el.getBoundingClientRect().width > 0;
                const stacked = $$('li').filter((l) => /XP/.test(l.innerText));
                return {
                    tableVisible: visible($('table')),
                    stacked: stacked.map((l) => l.innerText.replace(/\\s+/g, ' ').trim()),
                    scrollsAnywhere: [...document.querySelectorAll('*')]
                        .some((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowX) && el.scrollWidth > el.clientWidth + 1)
                };` });
        assert.equal(result.tableVisible, false, 'the table would need 520px, which no phone has');
        assert.equal(result.scrollsAnywhere, false, 'and nothing is left scrolling sideways');
        assert.equal(result.stacked.length, 2, 'the two ranks below the podium are listed');
        assert.match(result.stacked[0], /4 .*Meera Krishnan Lv\. 1/);
        assert.match(result.stacked[0], /15 XP/);
        assert.match(result.stacked[0], /3 days/, 'the streak survives the move off the table');
    });

    test('the table comes back on a desktop, and the stacked list goes away', async () => {
        const { result } = await screen({
            entry: entry("'100%'"), api, width: 1280, styles: true, script: `
                await sleep(900);
                const visible = (el) => !!el && el.getBoundingClientRect().width > 0;
                return {
                    tableVisible: visible($('table')),
                    headers: $$('th').map((t) => t.innerText.trim()),
                    stackedVisible: $$('li').filter((l) => /XP/.test(l.innerText) && l.getBoundingClientRect().width > 0).length
                };` });
        assert.equal(result.tableVisible, true);
        assert.deepEqual(result.headers, ['Rank', 'Learner', 'Level', 'XP', 'Streak', 'Badge', 'Change']);
        assert.equal(result.stackedVisible, 0, 'only one of the two is ever on screen');
    });

    test('the two shapes list exactly the same people', async () => {
        const { result } = await screen({
            entry: entry("'100%'"), api, width: 1280, styles: true, script: `
                await sleep(900);
                const names = (els) => els.map((el) => (el.innerText.match(/(Meera Krishnan|Ravi Kumar)/) || [])[0]).filter(Boolean);
                return {
                    table: names($$('tbody tr')),
                    list: names($$('li').filter((l) => /XP/.test(l.innerText)))
                };` });
        assert.deepEqual(result.table, ['Meera Krishnan', 'Ravi Kumar']);
        assert.deepEqual(result.list, result.table, 'the stacked rows carry the same standings as the table');
    });

});
