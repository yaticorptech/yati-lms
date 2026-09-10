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
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
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

const run = (cmd, args) => new Promise((resolve, reject) =>
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(stdout))));

/**
 * @param {object} o
 * @param {string} o.entry   JSX that renders the screen into #root
 * @param {string} o.api     module source standing in for src/utils/api
 * @param {string} o.script  browser code, its return value comes back as `result`
 * @param {number} [o.width] viewport width
 * @param {object} [o.files] extra files to serve, keyed by url path
 * @param {number} [o.budget] milliseconds of page time before Chrome gives up.
 *                 Timers run as fast as they can inside it, so this is a
 *                 ceiling on the clock the page sees, not on how long the test
 *                 takes. Raise it for a screen that waits on a long timeout.
 */
export const screen = async ({ entry, api, script, width = 1400, height = 1400, budget = 12000, files = {} }) => {
    const cache = path.join(ROOT, 'node_modules', '.cache');
    await mkdir(cache, { recursive: true });
    const dir = await mkdtemp(path.join(cache, 'ui-test-'));
    let server;
    try {
        await writeFile(path.join(dir, 'api.js'), api);
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
                    b.onResolve({ filter: /\.css$/ }, (a) => ({ path: a.path, namespace: 'blank-css' }));
                    b.onLoad({ filter: /.*/, namespace: 'blank-css' }, () => ({ contents: '' }));
                }
            }]
        });

        await writeFile(path.join(dir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"></head><body>
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
            const file = alias[url] || (url === '/' ? 'index.html' : url.slice(1));
            try {
                const body = await readFile(path.join(dir, file));
                res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
                res.end(body);
            } catch { res.writeHead(404).end('not found'); }
        });
        await new Promise((r) => server.listen(0, '127.0.0.1', r));
        const url = `http://127.0.0.1:${server.address().port}/index.html`;

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
