/**
 * Is a job's apply link still alive? Employers take postings down, and the
 * job site then shows its own "404 / bad link / job closed" page. A student
 * should never land there from an Apply button.
 *
 * checkLink(url) → "dead" | "ok" | "unknown"
 *   dead     the site answered 404/410, or a page that says the job is gone
 *   ok       the page loaded
 *   unknown  slow, blocked (403/429), or unreachable — never hide a job on a guess
 *
 * Only public http(s) addresses are fetched: the server never visits its own
 * network on a student's behalf.
 */
const dns = require("dns").promises;
const net = require("net");

const TIMEOUT_MS = 8000;
const MAX_BODY = 300 * 1024;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Words a job site uses when the posting has gone. Matched on the page's
// title and visible text, so a site's footer link to "page not found" help
// would not count — only a page whose title or heading says it.
const GONE = new RegExp([
  "followed a bad link",
  "page (?:you (?:were|are) looking for )?(?:could not be|can(?:no|')t be|was not|wasn't) found",
  "page not found",
  "job (?:is )?(?:no longer|not) (?:available|active|open)",
  "(?:job|position|posting|vacancy|listing|role|opening|internship)(?: you(?:'re| are) looking for)? (?:has|have) (?:been )?(?:expired|closed|filled|removed|taken down)",
  "no longer (?:accepting applications|available|open|active|exists)",
  "(?:this|the) (?:job|position|posting|vacancy|listing|internship) (?:has )?(?:expired|is closed|was closed)",
  "applications? (?:are |is )?(?:now )?closed",
  "job not found",
  "posting (?:is )?(?:not found|unavailable)",
].join("|"), "i");

const privateIp = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
};

async function isPublic(url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (!/^https?:$/.test(u.protocol)) return false;
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(u.hostname)) return false;
  try {
    const addrs = await dns.lookup(u.hostname, { all: true });
    return addrs.length > 0 && !addrs.some((a) => privateIp(a.address));
  } catch {
    return false;
  }
}

async function readSome(res) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (size < MAX_BODY) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks).toString("utf8");
}

const textOf = (html) => {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  const heads = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => m[1]).join(" ");
  const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&#39;|&rsquo;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  return strip(`${title} ${heads}`);
};

async function checkLink(url) {
  if (!(await isPublic(url))) return "unknown";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let current = url;
    let res;
    // Follow redirects by hand so every hop is checked as a public address.
    for (let hop = 0; hop < 6; hop++) {
      res = await fetch(current, { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "text/html,*/*" } });
      const next = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!next) break;
      current = new URL(next, current).toString();
      if (!(await isPublic(current))) return "unknown";
    }
    if (res.status === 404 || res.status === 410) return "dead";
    if (res.status >= 300) return "unknown";
    if (!/html/i.test(res.headers.get("content-type") || "")) return "ok";
    return GONE.test(textOf(await readSome(res))) ? "dead" : "ok";
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { checkLink };
