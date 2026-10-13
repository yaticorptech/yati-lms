/**
 * The admin's Bundles page on a phone: New Bundle opens a small popup — at
 * most 60% of the screen tall, clear of the header's place at the top, the
 * page showing round it — and the form scrolls inside it, one scroll, between
 * the title and Save Bundle. It used to grow as tall as the form and fill the
 * phone's screen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutStyles } from './harness.js';

const COURSES = Array.from({ length: 9 }, (_, i) => ({ _id: `c${i + 1}`, title: `Cert course ${String.fromCharCode(65 + i)}` }));
const api = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => { window.__calls.push(['GET', url]); return reply(url.includes('/admin/courses') ? ${JSON.stringify(COURSES)} : []); },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({}); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply({}); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return reply({}); }
};`;

test('on a phone, New Bundle is a small popup that scrolls inside', { skip: skipWithoutStyles }, async () => {
    const { result, errors } = await screen({
        entry: wrap('pages/Bundles.jsx', 'Bundles', { route: '/bundles', path: '/bundles' }), api, styles: true, width: 390, height: 844, script: `
        await sleep(700);
        click(/New Bundle/); await sleep(300);
        const title = [...document.querySelectorAll('h2')].find((h) => /Create New Bundle/.test(h.innerText));
        const panel = title.parentElement.parentElement;
        const r = panel.getBoundingClientRect();
        const body = panel.querySelector('form').firstElementChild;
        const list = [...body.querySelectorAll('div')].find((d) => d.className.includes('grid-cols-1') && d.querySelector('[class*="cursor-pointer"]'));
        const save = [...panel.querySelectorAll('button')].find((b) => /Save Bundle/.test(b.innerText)).getBoundingClientRect();
        return { top: r.top, below: innerHeight - r.bottom, left: r.left, right: innerWidth - r.right, share: r.height / innerHeight,
                 scrolls: getComputedStyle(body).overflowY, long: body.scrollHeight > body.clientHeight,
                 listOwnScroll: getComputedStyle(list).overflowY, saveShown: save.top >= r.top && save.bottom <= r.bottom };` });
    assert.deepEqual(errors, []);
    assert.ok(result.share <= 0.61, `small: at most 60% of the screen tall (${Math.round(result.share * 100)}%)`);
    assert.ok(result.top >= 80, 'clear of where the header is');
    assert.ok(result.below >= 16 && result.left >= 12 && result.right >= 12, 'the page shows below and on both sides');
    assert.equal(result.scrolls, 'auto');
    assert.equal(result.long, true, 'the form scrolls inside the popup');
    assert.equal(result.listOwnScroll, 'visible', 'one scroll: the course list is not a second scroll box on a phone');
    assert.equal(result.saveShown, true, 'Save Bundle is in view without scrolling');
});
