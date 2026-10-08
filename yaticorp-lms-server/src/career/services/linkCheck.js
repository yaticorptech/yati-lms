/**
 * Does this application link actually go anywhere?
 *
 * The scholarship list is written by the model, and the prompt tells it to
 * leave "link" empty rather than guess a URL. Both halves of that go wrong in
 * practice: plenty of entries come back with no link at all, and some come
 * back with a plausible-looking URL that was never real. Either way a student
 * taps Apply and lands on nothing, which is worse than the scholarship not
 * having been listed.
 *
 * The rule is deliberately asymmetric: a link is dropped only on proof that
 * the page is NOT there, and kept on anything ambiguous. Scholarship pages are
 * mostly government and university sites, and those routinely answer a bot
 * with 403, refuse HEAD with 405, rate-limit, or simply take too long. Reading
 * any of that as "dead" would quietly delete the most valuable entries on the
 * list — the reserved-category schemes a student is most likely to win.
 *
 * So: gone means gone (404, 410, a host that does not resolve). Anything else
 * is the site being unfriendly to us, not the page being missing.
 */

const dns = require('dns').promises;
const net = require('net');

const TIMEOUT_MS = 8000;
// Enough for http -> https -> www -> the actual page, which is the usual chain.
const MAX_REDIRECTS = 5;

/**
 * Addresses the server must never be talked into requesting.
 *
 * The URL comes from the model, and the model's output is shaped by whatever
 * the student typed into their profile. Without this, a link to
 * http://169.254.169.254/ or http://localhost:5000/admin would be fetched from
 * inside the server's own network — the classic SSRF — and its status read
 * back as a verdict.
 */
const PRIVATE = new net.BlockList();
PRIVATE.addSubnet('0.0.0.0', 8, 'ipv4');
PRIVATE.addSubnet('10.0.0.0', 8, 'ipv4');
PRIVATE.addSubnet('127.0.0.0', 8, 'ipv4');
PRIVATE.addSubnet('169.254.0.0', 16, 'ipv4');
PRIVATE.addSubnet('172.16.0.0', 12, 'ipv4');
PRIVATE.addSubnet('192.168.0.0', 16, 'ipv4');
PRIVATE.addAddress('::', 'ipv6');
PRIVATE.addAddress('::1', 'ipv6');
PRIVATE.addSubnet('fc00::', 7, 'ipv6');
PRIVATE.addSubnet('fe80::', 10, 'ipv6');

/** True for an address inside any of the ranges above. */
const isPrivateAddress = (address) => {
  const raw = String(address || '').replace(/^\[|\]$/g, '');
  // An IPv4 address dressed as IPv6 (::ffff:127.0.0.1) is still loopback.
  const mapped = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const ip = mapped ? mapped[1] : raw;
  const family = net.isIP(ip);
  if (!family) return false;
  return PRIVATE.check(ip, family === 4 ? 'ipv4' : 'ipv6');
};

const blocked = () => Object.assign(new Error('Link points at a private address'), { code: 'PRIVATE_HOST' });

/**
 * Refuse a URL whose host is, or resolves to, a private address.
 *
 * A lookup that fails is not treated as private: fetch is about to ask the
 * same question and fail the same way, and the DEAD_HOST rule below already
 * knows what that means.
 */
const assertPublicHost = async (url) => {
  const { hostname } = new URL(url);
  if (/^localhost$|\.localhost$/i.test(hostname)) throw blocked();
  if (net.isIP(hostname.replace(/^\[|\]$/g, ''))) {
    if (isPrivateAddress(hostname)) throw blocked();
    return;
  }
  let addresses = [];
  try {
    addresses = await Promise.race([
      dns.lookup(hostname, { all: true, verbatim: true }),
      new Promise((resolve) => setTimeout(() => resolve([]), TIMEOUT_MS).unref())
    ]);
  } catch {
    return;
  }
  if (addresses.some((a) => isPrivateAddress(a.address))) throw blocked();
};
// A real browser UA. A default Node fetch signature is refused outright by a
// good number of the .gov.in and .ac.in hosts these links point at.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0 Safari/537.36';

/** Status codes that mean the page genuinely is not there. */
const GONE = new Set([404, 410]);

/**
 * Errors that mean the host itself does not exist, as opposed to a request
 * that merely failed. A timeout or a reset is a slow or fussy server; an
 * unresolvable name is a URL that was invented.
 */
const DEAD_HOST = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ERR_INVALID_URL']);

const causeCode = (error) => {
  let node = error;
  for (let depth = 0; node && depth < 4; depth += 1) {
    if (node.code) return node.code;
    node = node.cause;
  }
  return '';
};

/** A well-formed http(s) URL, or null. */
const asUrl = (value) => {
  const raw = String(value || '').trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(raw);
    // A hostname with no dot ("http://apply") cannot be a real public site.
    return url.hostname.includes('.') ? raw : null;
  } catch {
    return null;
  }
};

/**
 * True unless the page is provably missing.
 *
 * HEAD first because it is cheap, but ONLY a GET may condemn a link. Plenty of
 * servers do not implement HEAD properly and answer it with the very status
 * that would get the link deleted: scholarships.gov.in — the national portal,
 * and the single most valuable link this list can carry — returns 404 to HEAD
 * and 200 to GET. An earlier version of this trusted the HEAD and dropped it.
 *
 * So a HEAD that succeeds is taken as proof of life, and a HEAD that fails in
 * any way at all is taken as proof of nothing, and the question is put again
 * properly.
 */
const isLive = async (url) => {
  // Redirects are followed by hand rather than by fetch, so every hop's host
  // is checked: a public page answering 302 to http://127.0.0.1/ must not take
  // the request inside the network the first check kept it out of.
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      let current = url;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        await assertPublicHost(current);
        const res = await fetch(current, {
          method,
          redirect: 'manual',
          signal: ctrl.signal,
          headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }
        });
        const location = res.status >= 300 && res.status < 400 ? res.headers?.get?.('location') : null;
        if (!location) return res.status;
        current = new URL(location, current).href;
        if (!/^https?:$/.test(new URL(current).protocol)) return res.status;
      }
      // A redirect loop says nothing about whether the page exists.
      return 0;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    // A private host is not an application page, whatever it answers.
    await assertPublicHost(url);

    // A HEAD that comes back OK is the cheap path, and settles it.
    const head = await attempt('HEAD').catch(() => 0);
    if (head >= 200 && head < 400) return true;

    // Anything else — a refusal, a wrong verb, a bogus 404, a thrown request —
    // says nothing about the page, so ask for the page itself.
    return !GONE.has(await attempt('GET'));
  } catch (error) {
    if (error?.code === 'PRIVATE_HOST') return false;
    // A name that does not resolve is an invented URL. Everything else —
    // timeout, reset, TLS complaint — is the site, not the link.
    return !DEAD_HOST.has(causeCode(error));
  }
};

/**
 * Keep only the entries a student can actually act on.
 *
 * `pick` says where the link lives on an item, so this stays useful for
 * anything else that ends up carrying AI-supplied links.
 */
const keepLinkedItems = async (items, pick = (item) => item?.link) => {
  const list = Array.isArray(items) ? items : [];
  // Entries with no link at all never reach the network: there is nothing to
  // check, and they are dropped for the same reason as a dead one.
  const linked = list.filter((item) => asUrl(pick(item)));

  const verdicts = await Promise.all(linked.map((item) => isLive(asUrl(pick(item)))));
  return linked.filter((_, i) => verdicts[i]);
};

module.exports = { keepLinkedItems, isLive, asUrl, isPrivateAddress };
