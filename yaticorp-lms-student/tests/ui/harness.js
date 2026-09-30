/**
 * Renders a real screen in a real browser and reads the result back.
 *
 * The student app has no component-testing library, and adding one would pull
 * in a DOM emulator that does not run the code the way a student's browser
 * does. This bundles the screen with esbuild (already here, as Vite's own
 * bundler), stubs the API module, serves the bundle, drives headless Chrome
 * through it, and returns whatever the browser script hands back.
 *
 * Chrome is found where it normally lives. Where it is not installed the
 * suites skip rather than fail, so a machine without it is not a broken build.
 */
import { build } from 'esbuild';
import http from 'node:http';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');

export const CHROME = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find((p) => existsSync(p));
export const skipWithoutChrome = CHROME ? false : 'no Chrome on this machine';

/** The app's built stylesheet, or null when the app has not been built. */
export const builtStylesheet = () => {
    const assets = path.join(ROOT, 'dist', 'assets');
    if (!existsSync(assets)) return null;
    const name = readdirSync(assets).find((f) => f.startsWith('index-') && f.endsWith('.css'));
    return name ? path.join(assets, name) : null;
};
/** Why a layout test cannot run here, or false when it can. */
export const skipWithoutStyles = skipWithoutChrome
    || (builtStylesheet() ? false : 'the app has not been built — run `npx vite build` first');

const run = (cmd, args) => new Promise((resolve, reject) =>
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(stdout))));

/**
 * @param {object} o
 * @param {string} o.entry   JSX that renders the screen into #root
 * @param {string} o.api     module source standing in for src/utils/api
 * @param {string} o.script  browser code, its return value comes back as `result`
 * @param {number} [o.width] viewport width
 * @param {object} [o.files] extra files to serve, keyed by url path
 * @param {object} [o.modules] extra modules to stand in for real ones, keyed
 *                 by the tail of the import path (e.g. 'integrations/google/api').
 *                 Needed for a module that builds its own HTTP client rather
 *                 than using the shared one, which the `api` stub cannot reach.
 * @param {boolean} [o.styles] serve the app's real stylesheet, for a test that
 *                 measures layout rather than text. Needs `npx vite build` to
 *                 have produced dist/; without it the test is skipped, because
 *                 measuring an unstyled page would pass on anything.
 * @param {object} [o.device] a real device's screen: { width, height, dpr, mobile }.
 *                 Headless Chrome will not open a window under 500px, and every
 *                 phone this app is used on is narrower. With `device`, Chrome
 *                 is driven through its DevTools protocol instead, which sets
 *                 that exact screen, pixel density and touch — so a test can
 *                 say "a 344px Galaxy Z Fold 6" and mean it. Page time is then
 *                 real time, and `budget` is how long to wait for a result.
 * @param {string} [o.screenshot] with `device`: a PNG path to save the screen
 *                 to once the result is in — cropped to `result.clip` if the
 *                 script returns one. For a person to look at; not asserted on.
 * @param {number} [o.budget] milliseconds of page time before Chrome gives up.
 *                 Timers run as fast as they can inside it, so this is a
 *                 ceiling on the clock the page sees, not on how long the test
 *                 takes. Raise it for a screen that waits on a long timeout.
 */
export const screen = async ({ entry, api, script, width = 1400, height = 1400, budget = 12000, styles = false, files = {}, modules = {}, device = null, screenshot = null }) => {
    const cache = path.join(ROOT, 'node_modules', '.cache');
    await mkdir(cache, { recursive: true });
    const dir = await mkdtemp(path.join(cache, 'ui-test-'));
    let server;
    try {
        await writeFile(path.join(dir, 'api.js'), api);
        // esbuild matches the import *as written* — './api' from one file,
        // '../integrations/google/saveToDrive' from another — so the filter is
        // only the last segment, and the import is then resolved against the
        // directory doing the importing to see whether it lands on the named
        // module. Bare package imports never match: they have no ./ or ../.
        const stubbed = [];
        for (const [name, source] of Object.entries(modules)) {
            const file = path.join(dir, `stub-${name.replace(/[^\w]/g, '_')}.js`);
            await writeFile(file, source);
            stubbed.push({ file, name, base: name.split('/').pop() });
        }
        await writeFile(path.join(dir, 'entry.jsx'), entry);
        await build({
            entryPoints: [path.join(dir, 'entry.jsx')],
            bundle: true, outfile: path.join(dir, 'bundle.js'),
            loader: { '.js': 'jsx' }, jsx: 'automatic', logLevel: 'silent',
            absWorkingDir: ROOT,
            define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{"VITE_API_URL":"http://localhost/api","DEV":false,"PROD":true}' },
            plugins: [{
                name: 'test-stubs',
                setup(b) {
                    b.onResolve({ filter: /utils\/api$/ }, () => ({ path: path.join(dir, 'api.js') }));
                    for (const { file, name, base } of stubbed) {
                        b.onResolve({ filter: new RegExp(`(^|/)${base}(\\.jsx?)?$`) }, (a) => {
                            if (!a.path.startsWith('.')) return undefined;
                            const lands = path.resolve(a.resolveDir, a.path).replace(/\\/g, '/').replace(/\.jsx?$/, '');
                            return lands.endsWith(`/${name}`) ? { path: file } : undefined;
                        });
                    }
                    b.onResolve({ filter: /\.css$/ }, (a) => ({ path: a.path, namespace: 'blank-css' }));
                    b.onLoad({ filter: /.*/, namespace: 'blank-css' }, () => ({ contents: '' }));
                }
            }]
        });

        // The bundle stubs every CSS import away, so a page is unstyled unless
        // the built stylesheet is asked for. Only a layout test needs it.
        const sheet = styles ? `<link rel="stylesheet" href="/app.css">` : '';
        await writeFile(path.join(dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">${sheet}
<style>/* The result is read, never looked at: one long line of JSON would
otherwise widen a phone-sized page and throw off a device screenshot. */
#out{position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}</style></head><body>
<div id="root"></div>
<script>window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejected: ' + (e.reason && e.reason.message ? e.reason.message : e.reason)));</script>
<script src="bundle.js"></script>
<script>
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const text = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
  const find = (re, sel) => $$(sel || 'button, a').find((el) => re.test(el.innerText));
  const click = (re, sel) => { const el = find(re, sel); if (el) el.click(); return !!el; };
  let result;
  try { result = await (async () => { ${script} })(); }
  catch (e) { result = { __error: String(e && e.message ? e.message : e) }; }
  const pre = document.createElement('pre'); pre.id = 'out';
  pre.textContent = JSON.stringify({ result, errors: window.__errors });
  document.body.appendChild(pre);
})();
</script></body></html>`);

        for (const [urlPath, contents] of Object.entries(files)) {
            await writeFile(path.join(dir, urlPath.replace(/^\//, '').replace(/\//g, '_')), contents);
        }
        const alias = Object.fromEntries(Object.keys(files).map((p) => [p, p.replace(/^\//, '').replace(/\//g, '_')]));

        server = http.createServer(async (req, res) => {
            const url = req.url.split('?')[0];
            if (url === '/app.css') {
                try {
                    const body = await readFile(builtStylesheet());
                    res.writeHead(200, { 'Content-Type': 'text/css' });
                    return res.end(body);
                } catch { return res.writeHead(404).end('no stylesheet'); }
            }
            const file = alias[url] || (url === '/' ? 'index.html' : url.slice(1));
            try {
                const body = await readFile(path.join(dir, file));
                const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript'
                    : file.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream';
                // A media file is served the way a CDN serves it: with its
                // length known and byte ranges honoured. Without both, Chrome
                // treats a <video> source as a live stream — no duration, no
                // seeking — and a player test cannot mean anything.
                const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
                if (range && body.length) {
                    const start = range[1] ? Number(range[1]) : Math.max(0, body.length - Number(range[2]));
                    const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
                    if (start > end || start >= body.length) {
                        res.writeHead(416, { 'Content-Range': `bytes */${body.length}` });
                        return res.end();
                    }
                    res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1,
                        'Content-Range': `bytes ${start}-${end}/${body.length}` });
                    return res.end(body.subarray(start, end + 1));
                }
                res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': body.length });
                res.end(body);
            } catch { res.writeHead(404).end('not found'); }
        });
        await new Promise((r) => server.listen(0, '127.0.0.1', r));
        const url = `http://127.0.0.1:${server.address().port}/index.html`;

        if (device) return await viaDevTools(url, device, budget + 10000, screenshot);
        const dom = await run(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
            `--window-size=${width},${height}`, `--virtual-time-budget=${budget}`, '--dump-dom', url]);
        const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
        if (!m) throw new Error('the page never finished: no result was written');
        const decoded = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
        return JSON.parse(decoded);
    } finally {
        if (server) await new Promise((r) => server.close(r));
        await rm(dir, { recursive: true, force: true });
    }
};

/**
 * Opens `url` on an emulated device and waits for the page to write its result.
 * Talks to Chrome over its DevTools protocol (Node's own WebSocket), because
 * that is the only way to get a screen narrower than headless Chrome's 500px.
 */
const viaDevTools = async (url, { width, height, dpr = 3, mobile = true }, timeoutMs, screenshot) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const port = 9300 + Math.floor(Math.random() * 600);
    const profile = await mkdtemp(path.join(tmpdir(), 'ui-device-'));
    const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check',
        '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
    let ws;
    try {
        let target;
        for (let i = 0; i < 80 && !target; i++) {
            await sleep(100);
            try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not listening yet */ }
        }
        if (!target) throw new Error('Chrome did not open its debugging port');
        ws = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
        let id = 0; const pending = new Map();
        ws.addEventListener('message', (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } });
        const send = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });

        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile, screenWidth: width, screenHeight: height });
        await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
        await send('Page.navigate', { url });
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            await sleep(150);
            const r = await send('Runtime.evaluate', { expression: "(document.getElementById('out') || {}).textContent || ''", returnByValue: true });
            const text = r.result?.result?.value;
            if (text) {
                const out = JSON.parse(text);
                // For looking, not asserting: a PNG of the screen, or of the box
                // the page's result names as `clip: { x, y, width, height }`.
                if (screenshot) {
                    const clip = out.result?.clip;
                    // captureBeyondViewport lets a clip reach below the fold.
                    const shot = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : {}) });
                    await writeFile(screenshot, Buffer.from(shot.result.data, 'base64'));
                }
                return out;
            }
        }
        throw new Error('the page never finished: no result was written');
    } finally {
        try { ws?.close(); } catch { /* already closed */ }
        chrome.kill();
        await rm(profile, { recursive: true, force: true }).catch(() => {});
    }
};

/** Real devices' screens in CSS pixels, for `screen({ device })`. */
export const DEVICES = {
    galaxyZFold6Folded: { width: 344, height: 882, dpr: 2.8 },
    galaxyA55: { width: 384, height: 832, dpr: 2.8125 },
    pixel9: { width: 412, height: 923, dpr: 2.625 },
    iPhone16ProMax: { width: 440, height: 956, dpr: 3 },
    galaxyA55Landscape: { width: 832, height: 384, dpr: 2.8125 },
    iPadMini: { width: 768, height: 1024, dpr: 2 }
};

/** The wrappers most screens need: a router and a signed-in student. */
export const srcFile = (relative) => path.join(ROOT, 'src', relative).replace(/\\/g, '/');

export const wrap = (component, componentName, { route, path: routePath, user = { name: 'Bhagyashree Bangera' }, extraRoutes = '' }) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import ${componentName} from '${srcFile(component)}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={${JSON.stringify(user)}}>
    <MemoryRouter initialEntries={['${route}']}>
      <Routes><Route path="${routePath}" element={<${componentName} />} />${extraRoutes}</Routes>
    </MemoryRouter>
  </AuthContext.Provider>
);`;
