/**
 * Inside the app the page is https://localhost. Android's web view lets it
 * fetch data from a plain-http API (mixed content is allowed for local test
 * builds) but will not show plain-http <img> pictures — so images served by
 * that API, such as the milestone badges at /b/<code>/image.png, came out
 * blank. Such images are fetched the way data is and shown from memory.
 * With an https API there is nothing for this to do.
 */
import { pictureUrl } from './pictures';

const blobs = new Map();

const load = (src) => {
    let p = blobs.get(src);
    if (!p) {
        p = fetch(src).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`)))).then((b) => URL.createObjectURL(b));
        blobs.set(src, p);
        p.catch(() => blobs.delete(src));
    }
    return p;
};

const fix = (img) => {
    const src = img.getAttribute('src');
    if (!src || img.dataset.httpSrc === src) return;
    // A preset avatar saved as a link to the website (often a dev address such
    // as http://localhost:5173) travels in the app's bundle: show that copy.
    const bundled = pictureUrl(src);
    if (bundled !== src && bundled.startsWith('/avatars/')) { img.dataset.httpSrc = bundled; img.src = bundled; return; }
    if (!src.startsWith('http://')) return;
    img.dataset.httpSrc = src;
    load(src).then((url) => { if (img.getAttribute('src') === src) img.src = url; }).catch(() => {});
};

export function showHttpImages() {
    if (typeof window === 'undefined' || location.protocol !== 'https:' || typeof MutationObserver === 'undefined') return;
    const scan = (root) => {
        if (root.tagName === 'IMG') fix(root);
        root.querySelectorAll?.('img[src^="http"]').forEach(fix);
    };
    new MutationObserver((records) => {
        for (const r of records) {
            if (r.type === 'attributes') { if (r.target.tagName === 'IMG') fix(r.target); }
            else r.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n); });
        }
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
    scan(document.documentElement);
}
