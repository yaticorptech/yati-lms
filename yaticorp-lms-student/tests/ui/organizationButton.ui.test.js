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
    test('a failed read is not "no organization": no Add organization, and the popup offers Retry', async () => {
        // The first read fails; the retry finds the student a member.
        const flaky = `
            window.__calls = []; let reads = 0;
            export default {
              get: (url) => { window.__calls.push(['GET', url]); reads += 1;
                if (reads === 1) return Promise.reject(Object.assign(new Error('down'), { response: { status: 500, data: {} } }));
                return Promise.resolve({ data: ${JSON.stringify(MEMBER)} }); },
              post: () => Promise.resolve({ data: {} }), put: () => Promise.resolve({ data: {} }), delete: () => Promise.resolve({ data: {} })
            };`;
        const { result, errors } = await screen({
            entry, api: flaky,
            script: `
                await sleep(500);
                const label = text($('button'));
                $('button').click(); await sleep(400);
                return { label, popup: text($('[aria-labelledby="organization-popup-title"]')), reads: window.__calls.length };
                `
        });
        assert.deepEqual(errors, []);
        assert.doesNotMatch(result.label, /Add organization/, 'a member is never told to add one');
        assert.equal(result.reads, 2, 'opening the popup reads the membership again');
        assert.match(result.popup, /ABC College/, 'and shows what that read found');
    });

    test('with every read failing, the popup says so and offers Retry', async () => {
        const down = `
            window.__calls = [];
            export default {
              get: (url) => { window.__calls.push(['GET', url]); return Promise.reject(Object.assign(new Error('down'), { response: { status: 500, data: {} } })); },
              post: () => Promise.resolve({ data: {} }), put: () => Promise.resolve({ data: {} }), delete: () => Promise.resolve({ data: {} })
            };`;
        const { result, errors } = await screen({
            entry, api: down,
            script: `
                await sleep(500);
                $('button').click(); await sleep(400);
                const popup = $('[aria-labelledby="organization-popup-title"]');
                return { popup: text(popup), form: !!$('#org-code'), retry: $$('button').some((b) => /^Retry$/.test(text(b))) };
                `
        });
        assert.deepEqual(errors, []);
        assert.match(result.popup, /Unable to load your organization\. Please try again\./);
        assert.ok(result.retry);
        assert.ok(!result.form, 'no join form on a guess that they have no organization');
    });

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

    test('inside a white-text banner, what is typed can still be read, and a chosen ID is looked up', { skip: skipWithoutStyles }, async () => {
        // The Profile banner it sits in sets white text; the box must not inherit it.
        const banner = entry.replace('<div className="bg-indigo-600 p-6">', '<div className="bg-indigo-600 p-6 text-white">');
        const { result, errors } = await screen({
            entry: banner, api: stub(NOT_A_MEMBER), styles: true,
            script: `${TYPE}
                await sleep(500);
                click(/Add organization/); await sleep(300);
                type('#org-code', 'nation_world');
                const box = $('#org-code');
                const colour = getComputedStyle(box).color;
                const inBody = box.closest('[role="dialog"]').parentElement === document.body;
                $('#org-code').closest('form').requestSubmit(); await sleep(400);
                return { colour, inBody, value: box.value, asked: window.__calls.filter((c) => c[1].includes('/lookup/')).map((c) => c[1]) };
                `
        });
        assert.deepEqual(errors, []);
        assert.notEqual(result.colour, 'rgb(255, 255, 255)', 'typed text is not white on white');
        assert.ok(result.inBody, 'the popup is not inside the banner');
        assert.equal(result.value, 'nation_world');
        assert.deepEqual(result.asked, ['/organizations/student/lookup/nation_world']);
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
        assert.equal(result.placeholder, 'xx_xxxx_xxx', 'and the shape of it is shown');
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

/**
 * A membership that ended, and a way out of an organization that stopped.
 *
 * A student removed by their organization used to open the popup onto an empty
 * form with no word of what happened; now it says so. And a student whose
 * organization was suspended was stuck in it for good — the server lets them
 * leave such an organization, and the popup offers it, behind a confirmation.
 */
describe('removed, and leaving an organization that is not active', { skip: skipWithoutChrome }, () => {
    const REMOVED = {
        ...NOT_A_MEMBER,
        removed: { organizationName: 'ABC College', reason: 'Removed by the organization', at: '2026-09-25T10:00:00.000Z' }
    };
    const SUSPENDED = { ...MEMBER, organization: { ...MEMBER.organization, status: 'suspended', accessNote: 'This organization is not currently active on the platform.' } };

    test('a removed student is told, above the join form', async () => {
        const { result, errors } = await screen({
            entry, api: stub(REMOVED),
            script: `
                await sleep(500);
                $('button').click(); await sleep(400);
                const popup = text($('[aria-labelledby="organization-popup-title"]'));
                return { popup, form: !!$('#org-code'), before: popup.indexOf('no longer a member') < popup.indexOf('Organization ID') };
                `
        });
        assert.deepEqual(errors, []);
        assert.match(result.popup, /You are no longer a member of ABC College\./);
        assert.match(result.popup, /Removed by the organization/);
        assert.ok(result.form, 'and can join again');
        assert.ok(result.before, 'said before the form');
    });

    test('a member of a suspended organization can leave it, after confirming', async () => {
        const { result, errors } = await screen({
            entry, api: apiModule({
                '/organizations/student/leave': { message: 'You have left ABC College. Your courses and progress are unchanged.' },
                '/organizations/student/me': SUSPENDED
            }),
            script: `
                await sleep(500);
                $('button').click(); await sleep(400);
                const offered = $$('button').some((b) => /^Leave organization$/.test(text(b)));
                $$('button').find((b) => /^Leave organization$/.test(text(b))).click(); await sleep(200);
                const asking = text($('[aria-labelledby="organization-popup-title"]'));
                const postsBefore = window.__calls.filter(([m]) => m === 'POST').length;
                $$('button').filter((b) => /^Leave organization$/.test(text(b))).at(-1).click(); await sleep(500);
                return { offered, asking, postsBefore, posts: window.__calls.filter(([m]) => m === 'POST').map(([, u]) => u), popup: text($('[aria-labelledby="organization-popup-title"]')) };
                `
        });
        assert.deepEqual(errors, []);
        assert.ok(result.offered);
        assert.match(result.asking, /Leave ABC College\?/, 'it asks first');
        assert.equal(result.postsBefore, 0);
        assert.deepEqual(result.posts, ['/organizations/student/leave']);
        assert.match(result.popup, /You have left ABC College/);
    });

    test('a member of an active organization is not offered Leave', async () => {
        const { result } = await screen({
            entry, api: stub(MEMBER),
            script: `await sleep(500); $('button').click(); await sleep(400);
                return { leave: $$('button').some((b) => /Leave organization/.test(text(b))) };`
        });
        assert.ok(!result.leave);
    });
});
