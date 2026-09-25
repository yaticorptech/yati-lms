/**
 * "My Bio" on a phone.
 *
 * The popup was drawn at its desktop size on every screen: a 340px portrait
 * with a 72px initial, a 30px "Hi, I'm" and 17px body text. On a 390px phone
 * that is most of the screen spent before a word of the bio is read — and with
 * no height cap on the dialog, the rest simply ran off the bottom.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const para = "I'm an aspiring mobile app developer with a BCA in Computer Applications who enjoys exploring new skills in mobile apps through hands-on projects.";
const BIO = (bio) => ({ user: { name: 'Yaticorp Tech', avatar: '' }, bio: { bio } });

const api = (bio) => `
export default {
  get: () => Promise.resolve({ data: ${JSON.stringify(BIO(bio))} }),
  post: () => Promise.resolve({ data: {} })
};`;

const entry = `
import { createRoot } from 'react-dom/client';
import BioPopup from '${srcFile('learningbio/BioPopup.jsx')}';
createRoot(document.getElementById('root')).render(<BioPopup onClose={() => {}} />);`;

const read = `
  await sleep(800);
  const dlg = $('[role="dialog"]');
  const d = dlg.getBoundingClientRect();
  const fs = (sel, re) => { const el = $$(sel).find((e) => re.test(e.innerText)); return el ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : null; };
  const portrait = $$('div').find((x) => x.className.includes('aspect-square'));
  const body = $$('p').find((p) => /aspiring mobile/.test(p.innerText));
  return {
    height: Math.round(d.height),
    fitsScreen: d.bottom <= window.innerHeight + 1 && d.top >= -1,
    portrait: Math.round(portrait.getBoundingClientRect().width),
    title: fs('h3', /My Bio/), hi: fs('p', /Hi, I/), name: fs('h4', /Yaticorp/),
    body: Math.round(parseFloat(getComputedStyle(body).fontSize))
  };`;

describe('the bio popup', { skip: skipWithoutStyles }, () => {
    test('is sized for the phone it is on, and left alone on a desktop', async () => {
        const phone = await screen({ entry, api: api(para), styles: true, width: 500, height: 844, script: read });
        const desk = await screen({ entry, api: api(para), styles: true, width: 1400, height: 844, script: read });
        assert.deepEqual(phone.errors, []);
        assert.deepEqual(desk.errors, []);

        const p = phone.result, d = desk.result;
        assert.ok(p.portrait < d.portrait * 0.6, `the portrait is much smaller: ${p.portrait}px vs ${d.portrait}px`);
        assert.ok(p.portrait <= 170, `and no more than 170px on a phone, was ${p.portrait}px`);
        assert.ok(p.name < d.name, `the name is smaller: ${p.name}px vs ${d.name}px`);
        assert.ok(p.hi < d.hi, 'so is the greeting above it');
        assert.ok(p.title < d.title, 'and the popup title');
        assert.ok(p.body < d.body, `and the bio text: ${p.body}px vs ${d.body}px`);

        // The desktop sizes are the ones that were already right.
        assert.equal(d.title, 24);
        assert.equal(d.name, 48);
        assert.equal(d.body, 18);
    });

    test('a long bio stays on the screen instead of running off the bottom', async () => {
        // There was no height cap at all, so a bio longer than the window put
        // its last paragraphs somewhere unreachable.
        const long = Array.from({ length: 12 }, () => para).join('\n\n');
        const { result, errors } = await screen({
            entry, api: api(long), styles: true, width: 500, height: 844, script: `
                await sleep(800);
                const dlg = $('[role="dialog"]');
                const d = dlg.getBoundingClientRect();
                const scroller = $$('[role="dialog"] div').find((x) => x.scrollHeight > x.clientHeight + 1);
                return {
                    scrolls: !!scroller,
                    height: Math.round(d.height),
                    fitsScreen: d.bottom <= window.innerHeight + 1 && d.top >= -1
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.fitsScreen, true, 'the whole dialog is inside the window');
        assert.equal(result.scrolls, true, 'and the overflow is reachable by scrolling');
    });
});
