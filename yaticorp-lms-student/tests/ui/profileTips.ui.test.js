/**
 * The "Tip for Better Results" panel, on the certificates card and the resume
 * card, at phone widths.
 *
 * Both put the tip beside a "How it works" button that will not shrink. With
 * nothing holding the text's width the tip was squeezed to about one word a
 * line and the button pushed past the card; the button belongs on its own line
 * there instead.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const PHONE_VIEWPORT = 500;
const api = apiModule({
    '/user/resume': { resume: null, ats: {} },
    '/user/achievements': { achievements: [] },
    '/learning-bio': {}
});

/** Each card, in a box the width of a phone. */
const CARDS = {
    certificates: (box) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import CertificatesFrame from '${srcFile('components/CertificatesFrame.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter><div id="box" style={{ width: ${box} }}>
    <CertificatesFrame certificates={[]} loading={false} certError={null} downloadingId={null} onDownload={() => {}} />
  </div></MemoryRouter>);`,
    resume: (box) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ResumeSection from '${srcFile('components/ResumeSection.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter><div id="box" style={{ width: ${box} }}><ResumeSection /></div></MemoryRouter>);`
};

const SWEEP = `
    const handled = (el) => {
        const st = getComputedStyle(el);
        return ['auto', 'scroll', 'hidden', 'clip'].includes(st.overflowX) || st.position === 'absolute';
    };
    const offenders = [...document.querySelectorAll('*')]
        .filter((el) => el.clientWidth > 4 && el.scrollWidth > el.clientWidth + 1 && !handled(el))
        .map((el) => el.tagName.toLowerCase() + '[' + String(el.className || '').split(' ').filter(Boolean).slice(0, 3).join(' ') + ']'
            + ' needs ' + el.scrollWidth + ' has ' + el.clientWidth);
    const tip = $$('p').find((p) => /^Complete more courses|^Keep your resume/.test(p.innerText.trim()));
    const button = $$('button').find((b) => /How it works/.test(b.innerText));`;

describe('the tip panels on a phone', { skip: skipWithoutStyles }, () => {
    for (const [name, card] of Object.entries(CARDS)) {
        test(`the ${name} card fits, and its tip is readable`, async () => {
            const { result, errors } = await screen({
                entry: card(360), api, width: PHONE_VIEWPORT, styles: true, script: `
                    await sleep(900);
                    ${SWEEP}
                    return {
                        offenders,
                        tipWidth: tip ? tip.clientWidth : 0,
                        buttonBelow: !!tip && !!button && button.getBoundingClientRect().top > tip.getBoundingClientRect().top,
                        boxFits: $('#box').scrollWidth <= $('#box').clientWidth + 1
                    };` });
            assert.deepEqual(errors, []);
            assert.deepEqual(result.offenders, [], `does not fit: ${result.offenders.join(' | ')}`);
            assert.ok(result.boxFits, 'the card stays inside the phone');
            // It was about 90px before, which is roughly one word a line.
            assert.ok(result.tipWidth >= 200, `the tip only gets ${result.tipWidth}px`);
            assert.ok(result.buttonBelow, 'the button has moved under the tip');
        });
    }

    test('on a desktop the button is back beside the tip', async () => {
        const { result } = await screen({
            entry: CARDS.certificates("'100%'"), api, width: 1280, styles: true, script: `
                await sleep(900);
                ${SWEEP}
                return {
                    sameLine: button.getBoundingClientRect().top < tip.getBoundingClientRect().bottom,
                    buttonWidth: Math.round(button.getBoundingClientRect().width)
                };` });
        assert.ok(result.sameLine, 'one row again when there is room');
        assert.ok(result.buttonWidth < 200, 'and the button is its own size, not the whole row');
    });
});
