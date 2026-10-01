/**
 * Live updates for local test builds of the app. Only active when the build
 * was made with VITE_LIVE_URL (never set for store builds): the app keeps
 * loading from its own secure https://localhost origin — so the camera and
 * every other secure-page feature keep working — and copies each new build
 * from the developer's Mac into its own storage, then switches to it.
 * The Mac side is a small server that lists the build's files with hashes
 * (/__manifest) and announces new builds (/__live); only changed files move.
 */
import { Capacitor, WebView } from '@capacitor/core';

const LIVE = import.meta.env.VITE_LIVE_URL;
const DIR = 'live-www';
const KEY = 'yati.liveManifest';

const toBase64 = (buf) => {
    const bytes = new Uint8Array(buf); let out = '';
    for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(out);
};

/**
 * Test builds only: what the app hits on the phone — errors, failed loads,
 * and what each page actually shows — sent to the Mac's live server, so a
 * problem seen only on the phone can be read there (live/report.log).
 */
function reportToMac() {
    const send = (kind, data) => {
        try { fetch(`${LIVE}/__report`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ at: new Date().toTimeString().slice(0, 8), path: location.pathname, kind, ...data }) }).catch(() => {}); } catch { /* the Mac is away */ }
    };
    window.addEventListener('error', (e) => {
        const t = e.target;
        if (t && t !== window && (t.src || t.href)) send('load-failed', { tag: t.tagName, url: String(t.currentSrc || t.src || t.href).slice(0, 200) });
        else send('error', { message: e.message, file: String(e.filename || '').split('/').pop(), line: e.lineno });
    }, true);
    window.addEventListener('unhandledrejection', (e) => send('unhandled', { message: String(e.reason?.stack || e.reason?.message || e.reason).slice(0, 600) }));
    for (const level of ['error', 'warn']) {
        const orig = console[level].bind(console);
        console[level] = (...args) => { orig(...args); send(`console.${level}`, { message: args.map((a) => (a instanceof Error ? a.stack : typeof a === 'object' ? (() => { try { return JSON.stringify(a); } catch { return String(a); } })() : String(a))).join(' ').slice(0, 600) }); };
    }
    // A look at each page a few seconds after it opens.
    const snapshot = () => {
        const main = document.querySelector('main') || document.body;
        const imgs = [...document.querySelectorAll('img')];
        const mid = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        const chain = []; for (let el = mid; el && chain.length < 6; el = el.parentElement) { const cs = getComputedStyle(el); chain.push(`${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className ?? '').split(' ').slice(0, 3).join('.')} o=${cs.opacity} v=${cs.visibility}`); }
        send('page', {
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            textChars: (main.innerText || '').length,
            textStart: (main.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
            hiddenReveals: document.querySelectorAll('.fp-reveal:not(.is-in)').length,
            images: imgs.length,
            brokenImages: imgs.filter((i) => i.complete && !i.naturalWidth && i.currentSrc).map((i) => i.currentSrc.slice(0, 160)),
            atCentre: chain
        });
    };
    let last = '';
    setInterval(() => { if (location.pathname !== last) { last = location.pathname; setTimeout(snapshot, 4000); setTimeout(snapshot, 12000); } }, 1000);
    send('app-start', { ua: navigator.userAgent.slice(0, 160), origin: location.origin });
}

export function startLiveUpdates() {
    if (!LIVE || !Capacitor.isNativePlatform()) return;
    reportToMac();
    let busy = false;

    const sync = async () => {
        if (busy) return; busy = true;
        try {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const remote = await fetch(`${LIVE}/__manifest`, { cache: 'no-store' }).then((r) => r.json());
            let local = {}; try { local = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* none yet */ }
            const changed = Object.keys(remote.files).filter((p) => local.files?.[p] !== remote.files[p]);
            // The pages last, so a half-copied build is never the one that loads.
            changed.sort((a, b) => Number(a.endsWith('.html')) - Number(b.endsWith('.html')));
            const pages = changed.filter((p) => p.endsWith('.html'));
            const rest = changed.filter((p) => !p.endsWith('.html'));
            const copy = async (p) => {
                const buf = await fetch(`${LIVE}/${p.split('/').map(encodeURIComponent).join('/')}?raw=1`, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.arrayBuffer(); });
                await Filesystem.writeFile({ path: `${DIR}/${p}`, data: toBase64(buf), directory: Directory.Data, recursive: true });
            };
            for (let i = 0; i < rest.length; i += 6) await Promise.all(rest.slice(i, i + 6).map(copy));
            for (const p of pages) await copy(p);
            localStorage.setItem(KEY, JSON.stringify(remote));

            const { uri } = await Filesystem.getUri({ path: DIR, directory: Directory.Data });
            const path = uri.replace(/^file:\/\//, '');
            const { path: current } = await WebView.getServerBasePath();
            if (current !== path) {
                await WebView.setServerBasePath({ path });   // reloads the app from the copied build
                await WebView.persistServerBasePath();
            } else if (changed.length) {
                window.location.reload();
            }
        } catch (e) {
            console.warn('[live] update skipped:', e?.message || e);
        } finally {
            busy = false;
        }
    };

    sync();
    // A new build on the Mac: copy it over and reload. Reconnects if the Mac goes away.
    const listen = () => {
        const es = new EventSource(`${LIVE}/__live`);
        let first = true;
        es.onmessage = () => { if (first) { first = false; return; } sync(); };
        es.onerror = () => { es.close(); setTimeout(listen, 5000); };
    };
    listen();
}
