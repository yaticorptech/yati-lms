/**
 * The "Add organization" chip on the dashboard, and the popup behind it.
 *
 * The dashboard carries a button and nothing more — that is the point of this
 * component, and the first test pins it down: nothing about organizations is on
 * the page until the chip is pressed. Everything else checks the popup, where the
 * rule that matters lives: typing an ID never joins anything. It confirms which
 * institution the student means, and that organization's own admin decides.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const entry = `
import { createRoot } from 'react-dom/client';
import OrganizationButton from '${srcFile('organization/OrganizationButton.jsx')}';
createRoot(document.getElementById('root')).render(
  <div className="bg-indigo-600 p-6"><OrganizationButton /></div>);`;

const FOUND = {
    organization: {
        _id: 'o1', orgCode: 'ORG-2026-0001', name: 'ABC College',
        organizationType: 'college', typeLabel: 'College', logo: '', website: 'abc.edu'
    },
    alreadyMember: false, hasPendingRequest: false, pendingElsewhere: false
};

/** The chip in a given state, with lookup and join working. */
const stub = (me) => apiModule({
    // Order matters: `pick` takes the first key the url contains, and all three
    // of these urls contain '/organizations/student/'.
    '/organizations/student/lookup/': FOUND,
    '/organizations/student/requests': { message: 'Your request to join ABC College has been sent.', request: { _id: 'r1', status: 'pending' } },
    '/organizations/student/me': me
});

const NOT_A_MEMBER = { member: false, organization: null, request: null };

const MEMBER = {
    member: true,
    organization: {
        _id: 'o1', orgCode: 'ORG-2026-0001', name: 'ABC College', typeLabel: 'College',
        logo: '', website: '', status: 'active', joinedAt: '2026-09-01T10:00:00.000Z', accessNote: ''
    },
    request: null
};

const PENDING = {
    member: false, organization: null,
    request: {
        _id: 'r1', status: 'pending', requestedAt: '2026-09-20T10:00:00.000Z',
        decidedAt: null, decisionReason: '',
        organization: { name: 'ABC College', orgCode: 'ORG-2026-0001' }
    }
};

/** Type into a controlled input the way React notices. */
const TYPE = `
    const type = (sel, v) => {
        const el = $(sel);
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };`;

describe('the dashboard organization button', { skip: skipWithoutChrome }, () => {
    test('with no organization it is one button, and nothing else', async () => {
        const { result, errors } = await screen({
            entry, api: stub(NOT_A_MEMBER),
            script: `
                await sleep(500);
                return {
                    buttons: $$('button').map((b) => b.innerText.trim()).filter(Boolean),
                    body: document.body.innerText.replace(/\\s+/g, ' ').trim(),
                    // The panel this replaced would have put a form on the page.
                    hasFormUpFront: Boolean($('#org-code')),
                    hasPopup: Boolean($('[aria-labelledby="organization-popup-title"]'))
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.buttons, ['Add organization'], 'one button, nothing more');
        assert.ok(!result.hasFormUpFront, 'no ID field sitting on the dashboard');
        assert.ok(!result.hasPopup, 'and no popup until it is asked for');
        assert.ok(!/Organization ID/i.test(result.body), 'the dashboard says nothing about IDs');
    });

    test('pressing it opens the popup with the ID field', async () => {
        const { result, errors } = await screen({
            entry, api: stub(NOT_A_MEMBER),
            script: `
                await sleep(500);
                click(/Add organization/i);
                await sleep(400);
                const popup = $('[aria-labelledby="organization-popup-title"]');
                return {
                    opened: Boolean(popup),
                    popupText: popup ? popup.innerText.replace(/\\s+/g, ' ').trim() : '',
                    hasInput: Boolean($('#org-code')),
                    placeholder: $('#org-code')?.placeholder
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.ok(result.opened);
        assert.ok(result.hasInput, 'there is somewhere to type the ID');
        assert.equal(result.placeholder, 'ABC-2026-0001', 'and the shape of it is shown');
        assert.match(result.popupText, /school, college or company/i);
    });

    test('finding one names it before offering to join, and joining posts the ID', async () => {
        const { result, errors } = await screen({
            entry, api: stub(NOT_A_MEMBER),
            script: `
                ${TYPE}
                await sleep(500);
                click(/Add organization/i);
                await sleep(400);
                type('#org-code', 'org-2026-0001');
                await sleep(100);
                click(/^Find$/i);
                await sleep(600);
                const afterFind = {
                    text: document.body.innerText.replace(/\\s+/g, ' ').trim(),
                    posts: window.__calls.filter(([m]) => m === 'POST').length
                };
                click(/Send Join Request/i);
                await sleep(700);
                return {
                    afterFind,
                    posts: window.__calls.filter(([m]) => m === 'POST'),
                    text: document.body.innerText.replace(/\\s+/g, ' ').trim()
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.match(result.afterFind.text, /Organization found/i);
        assert.match(result.afterFind.text, /ABC College/, 'the student can check it is the right institution');
        assert.equal(result.afterFind.posts, 0, 'looking it up joins nothing');

        assert.equal(result.posts.length, 1, 'one request, not one per render');
        assert.match(result.posts[0][1], /\/organizations\/student\/requests$/);
        assert.deepEqual(result.posts[0][2], { orgCode: 'ORG-2026-0001' });
        assert.match(result.text, /has been sent/i, 'and the student is told it went');
    });

    test('an ID that matches nothing says so, and offers nothing to join', async () => {
        const rejecting = `
            window.__calls = [];
            export default {
              get: (url) => { window.__calls.push(['GET', url]);
                if (url.includes('/lookup/')) {
                  const err = new Error('not found');
                  err.response = { status: 404, data: { code: 'ORGANIZATION_NOT_FOUND', message: "We couldn't find an active organization with that ID." } };
                  return Promise.reject(err);
                }
                return Promise.resolve({ data: ${JSON.stringify(NOT_A_MEMBER)} }); },
              post: (url, body) => { window.__calls.push(['POST', url, body]); return Promise.resolve({ data: {} }); },
              put: (url, body) => { window.__calls.push(['PUT', url, body]); return Promise.resolve({ data: {} }); },
              delete: (url) => { window.__calls.push(['DELETE', url]); return Promise.resolve({ data: {} }); }
            };`;

        const { result, errors } = await screen({
            entry, api: rejecting,
            script: `
                ${TYPE}
                await sleep(500);
                click(/Add organization/i);
                await sleep(400);
                type('#org-code', 'ORG-1999-9999');
                await sleep(100);
                click(/^Find$/i);
                await sleep(700);
                return {
                    text: document.body.innerText.replace(/\\s+/g, ' ').trim(),
                    canJoin: $$('button').some((b) => /Send Join Request/i.test(b.innerText))
                };
                `
        });
        assert.deepEqual(errors, [], 'a 404 is an expected answer, not an unhandled rejection');
        assert.match(result.text, /couldn't find an active organization/i);
        assert.ok(!result.canJoin);
    });

    test('a member sees the organization on the button itself', async () => {
        const { result, errors } = await screen({
            entry, api: stub(MEMBER),
            script: `
                await sleep(500);
                const chip = $$('button')[0];
                const chipText = chip.innerText.trim();
                chip.click();
                await sleep(400);
                const popup = $('[aria-labelledby="organization-popup-title"]');
                return { chipText, popupText: popup ? popup.innerText.replace(/\\s+/g, ' ').trim() : '' };
                `
        });
        assert.deepEqual(errors, []);
        assert.equal(result.chipText, 'ABC College', 'the button carries the name');
        assert.match(result.popupText, /ORG-2026-0001/);
        assert.match(result.popupText, /Active member/i);
    });

    test('a waiting request says so on the button, and can be withdrawn', async () => {
        const { result, errors } = await screen({
            entry, api: stub(PENDING),
            script: `
                await sleep(500);
                const chipText = $$('button')[0].innerText.trim();
                $$('button')[0].click();
                await sleep(400);
                const popup = $('[aria-labelledby="organization-popup-title"]');
                return {
                    chipText,
                    popupText: popup ? popup.innerText.replace(/\\s+/g, ' ').trim() : '',
                    canWithdraw: $$('button').some((b) => /Withdraw request/i.test(b.innerText)),
                    hasInput: Boolean($('#org-code'))
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.equal(result.chipText, 'Organization pending');
        assert.match(result.popupText, /Waiting for ABC College to approve you/i);
        assert.ok(result.canWithdraw);
        assert.ok(!result.hasInput, 'no second ID field while a request is open');
    });

    test('a member is not offered any way to leave', async () => {
        const { result, errors } = await screen({
            entry, api: stub(MEMBER),
            script: `
                await sleep(500);
                $$('button')[0].click();
                await sleep(400);
                const popup = $('[aria-labelledby="organization-popup-title"]');
                return {
                    buttons: $$('button').map((b) => b.innerText.trim()).filter(Boolean),
                    popupText: popup.innerText.replace(/\\s+/g, ' ').trim(),
                    deletes: window.__calls.filter(([m]) => m === 'DELETE').length
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.ok(!result.buttons.some((b) => /leave/i.test(b)), 'no leave button anywhere');
        assert.equal(result.deletes, 0);
        assert.match(result.popupText, /ask them/i, 'it says who to ask instead');
    });

    test('a rejected request is explained, with room to try another ID', async () => {
        const { result, errors } = await screen({
            entry,
            api: stub({
                member: false, organization: null,
                request: {
                    _id: 'r1', status: 'rejected', requestedAt: '2026-09-20T10:00:00.000Z',
                    decidedAt: '2026-09-21T10:00:00.000Z', decisionReason: 'Not on our student roll',
                    organization: { name: 'ABC College', orgCode: 'ORG-2026-0001' }
                }
            }),
            script: `
                await sleep(500);
                const chipText = $$('button')[0].innerText.trim();
                $$('button')[0].click();
                await sleep(400);
                return {
                    chipText,
                    text: document.body.innerText.replace(/\\s+/g, ' ').trim(),
                    hasInput: Boolean($('#org-code'))
                };
                `
        });
        assert.deepEqual(errors, []);
        assert.equal(result.chipText, 'Add organization', 'a refusal leaves them able to add one');
        assert.match(result.text, /did not approve your request/i);
        assert.match(result.text, /Not on our student roll/, 'the reason is passed on, not swallowed');
        assert.ok(result.hasInput, 'and a different ID can be tried');
    });
});

/**
 * The button has to be visibly a button.
 *
 * It first carried the same translucent pill styling as the card, email and
 * phone beside it, and disappeared into them — read as a fourth fact rather than
 * the one control in the row. These are measured against the app's real
 * stylesheet, so the distinction cannot quietly be undone by a class change.
 */
describe('the button stands out from the facts beside it', { skip: skipWithoutStyles }, () => {
    /** The profile hero's pill row, as that page builds it, plus the button. */
    const heroEntry = `
import { createRoot } from 'react-dom/client';
import OrganizationButton from '${srcFile('organization/OrganizationButton.jsx')}';
createRoot(document.getElementById('root')).render(
  <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-8">
    <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
      <span id="pill-card" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25">240100018860</span>
      <span id="pill-mail" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25">hari@gmail.com</span>
      <span id="pill-phone" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25">7012048118</span>
      <OrganizationButton />
    </div>
  </div>);`;

    const MEASURE = `
        await sleep(700);
        const btn = $$('button').find((b) => /Add organization|Organization pending|ABC College/.test(b.innerText));
        const pill = $('#pill-card');
        const read = (el) => {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return { background: cs.backgroundColor, color: cs.color, weight: cs.fontWeight, shadow: cs.boxShadow, height: Math.round(r.height), fontSize: cs.fontSize };
        };
        return { button: read(btn), pill: read(pill), label: btn.innerText.trim() };`;

    /**
     * How opaque a computed colour is.
     *
     * Tailwind v4 emits `oklab(l a b / 0.15)`, not `rgba(...)`, so a parser that
     * only understood rgba read every translucent pill as solid and quietly
     * passed this test on a button that looked exactly like them.
     */
    const alpha = (colour) => {
        const slashed = colour.match(/\/\s*([\d.]+)\s*\)/);
        if (slashed) return Number(slashed[1]);
        const rgba = colour.match(/rgba?\(([^)]+)\)/);
        if (rgba) {
            const parts = rgba[1].split(',').map((n) => n.trim());
            return parts.length === 4 ? Number(parts[3]) : 1;
        }
        return 1;
    };

    /**
     * Does this box-shadow lift the element off the page?
     *
     * A ring is also a box-shadow — `0px 0px 0px 1px` — so "has a shadow" is not
     * the question. A drop shadow is one with a blur, the third length in a layer.
     *
     * Parsed layer by layer rather than by scanning the whole string, because a
     * sliding match reads the ring's `0px 0px 0px 1px` as offset-offset-blur and
     * calls its 1px spread a blur.
     */
    const hasDropShadow = (shadow) => (shadow || '')
        // Split on commas between layers, not the ones inside rgba(...).
        .split(/,(?![^()]*\))/)
        .some((layer) => {
            const lengths = layer.match(/-?[\d.]+px/g) || [];
            return lengths.length >= 3 && parseFloat(lengths[2]) !== 0;
        });

    test('it is opaque and raised where the pills are translucent and flat', async () => {
        const { result, errors } = await screen({
            entry: heroEntry, api: stub(NOT_A_MEMBER), styles: true, script: MEASURE
        });
        assert.deepEqual(errors, []);

        assert.equal(alpha(result.button.background), 1, 'the button has a solid fill');
        assert.ok(alpha(result.pill.background) < 1, 'the pills beside it do not');
        assert.notEqual(result.button.background, result.pill.background, 'so the two cannot be confused');

        assert.ok(hasDropShadow(result.button.shadow), 'it is lifted off the hero');
        assert.ok(!hasDropShadow(result.pill.shadow), 'the pills lie flat, with only a hairline ring');

        assert.ok(Number(result.button.weight) >= 700, 'and its label is bolder');
        assert.ok(result.button.height >= result.pill.height, 'it is at least as tall as a pill');
        assert.ok(parseFloat(result.button.fontSize) > parseFloat(result.pill.fontSize), 'and its label is larger');
        assert.equal(result.label, 'Add organization');
    });

    test('a member still gets a button, not a label', async () => {
        const { result, errors } = await screen({
            entry: heroEntry, api: stub(MEMBER), styles: true, script: MEASURE
        });
        assert.deepEqual(errors, []);
        assert.equal(result.label, 'ABC College');
        assert.equal(alpha(result.button.background), 1, 'still solid once there is an organization');
        assert.ok(hasDropShadow(result.button.shadow), 'and still raised');
    });
});
