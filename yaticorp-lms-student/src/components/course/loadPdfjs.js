/**
 * pdf.js, loaded only when a PDF is actually shown — the same way
 * utils/pdfPageOne.js loads it for certificate pictures: the legacy build,
 * which older Android web views can run, with its worker from the package.
 * Kept in a file of its own so the screen tests can stand in for it.
 */
export async function loadPdfjs() {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { default: workerSrc } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    return pdfjs;
}
