/**
 * Which application links survive, and which are dropped.
 *
 * The scholarship list is written by the model and its links are unreliable in
 * two directions: many entries come back with no link at all, and some come
 * back with a URL that was never real. Both put a student in front of a card
 * they cannot act on.
 *
 * The rule this locks in is asymmetric, and the asymmetry is the whole point.
 * Dropping an entry is destructive and irreversible from the student's side,
 * so it happens only on proof the page is missing. Everything ambiguous — a
 * refusal, a rate-limit, a timeout — keeps the link, because the sites these
 * point at are government and university hosts that behave that way constantly.
 *
 * `fetch` is stubbed rather than called: the verdicts must be reproducible, and
 * a suite that fails when a .gov.in host is slow tests the weather.
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { isLive, asUrl, keepLinkedItems } = require('../../src/career/services/linkCheck');

const realFetch = global.fetch;
let calls;

/** Answer HEAD and GET with whatever this case needs. */
const stub = (plan) => {
  global.fetch = async (url, init) => {
    calls.push(init.method);
    const outcome = plan[init.method];
    if (outcome instanceof Error) throw outcome;
    return { status: outcome, url };
  };
};

const withCode = (code) => Object.assign(new Error('request failed'), { code });

beforeEach(() => { calls = []; });
afterEach(() => { global.fetch = realFetch; });

describe('a link is only dropped on proof the page is missing', () => {
  test('a HEAD that answers 404 is confirmed by GET before anything is dropped', async () => {
    // scholarships.gov.in — the national portal, and the most valuable link
    // this list can carry — really does answer HEAD with 404 and GET with 200.
    // An earlier version trusted the HEAD and deleted it.
    stub({ HEAD: 404, GET: 200 });
    assert.equal(await isLive('https://scholarships.gov.in'), true);
    assert.deepEqual(calls, ['HEAD', 'GET']);
  });

  test('a page missing to both HEAD and GET is dropped', async () => {
    stub({ HEAD: 404, GET: 404 });
    assert.equal(await isLive('https://example.gov.in/gone'), false);
  });

  test('410 Gone counts as missing too', async () => {
    stub({ HEAD: 410, GET: 410 });
    assert.equal(await isLive('https://example.gov.in/withdrawn'), false);
  });

  test('a healthy HEAD settles it without a second request', async () => {
    stub({ HEAD: 200 });
    assert.equal(await isLive('https://example.org'), true);
    assert.deepEqual(calls, ['HEAD']);
  });

  test('a redirect is a live page', async () => {
    stub({ HEAD: 301 });
    assert.equal(await isLive('https://example.org/moved'), true);
  });

  test('a site that refuses bots keeps its link', async () => {
    stub({ HEAD: 403, GET: 403 });
    assert.equal(await isLive('https://www.aicte-india.org'), true);
  });

  test('a site that refuses HEAD keeps its link', async () => {
    stub({ HEAD: 405, GET: 200 });
    assert.equal(await isLive('https://example.gov.in/scheme'), true);
  });

  test('a server error is the site being broken, not the page being gone', async () => {
    stub({ HEAD: 500, GET: 500 });
    assert.equal(await isLive('https://example.gov.in/scheme'), true);
  });

  test('a timeout keeps the link', async () => {
    const aborted = Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
    stub({ HEAD: aborted, GET: aborted });
    assert.equal(await isLive('https://slow.gov.in'), true);
  });

  test('a host that does not resolve was never a real URL', async () => {
    stub({ HEAD: withCode('ENOTFOUND'), GET: withCode('ENOTFOUND') });
    assert.equal(await isLive('https://invented-4r5t6y.gov.in'), false);
  });

  test('a DNS code buried in error.cause is still found', async () => {
    const wrapped = Object.assign(new Error('fetch failed'), { cause: withCode('ENOTFOUND') });
    stub({ HEAD: wrapped, GET: wrapped });
    assert.equal(await isLive('https://invented-4r5t6y.gov.in'), false);
  });
});

describe('what counts as a usable link at all', () => {
  test('accepts real http(s) URLs and trims them', () => {
    assert.equal(asUrl('  https://scholarships.gov.in  '), 'https://scholarships.gov.in');
    assert.equal(asUrl('http://example.org/a'), 'http://example.org/a');
  });

  test('rejects what the model leaves behind when it has no link', () => {
    for (const value of ['', '   ', undefined, null, 'N/A', 'not a url', 'ftp://x.org/a', 'https://apply']) {
      assert.equal(asUrl(value), null, `${JSON.stringify(value)} should not be a usable link`);
    }
  });
});

describe('filtering a generated list', () => {
  test('keeps only entries with a link that answered', async () => {
    stub({ HEAD: 200 });
    const kept = await keepLinkedItems([
      { name: 'Linked', link: 'https://example.org/a' },
      { name: 'Blank', link: '' },
      { name: 'No field' },
      { name: 'Junk', link: 'ask your college' }
    ]);
    assert.deepEqual(kept.map((k) => k.name), ['Linked']);
    // The three unusable entries never reached the network.
    assert.deepEqual(calls, ['HEAD']);
  });

  test('an empty or missing list is not an error', async () => {
    assert.deepEqual(await keepLinkedItems([]), []);
    assert.deepEqual(await keepLinkedItems(undefined), []);
  });
});
