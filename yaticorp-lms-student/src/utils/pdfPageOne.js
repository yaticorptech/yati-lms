/**
 * A picture of a PDF's first page, drawn in the browser with pdf.js — loaded
 * only when a PDF is actually being uploaded. The certificate frame shows it,
 * because the file store cannot draw a PDF itself. The file is read locally,
 * so nothing is fetched. Null when the PDF cannot be read; the upload then
 * goes ahead without a picture, as before.
 * @param {File|Blob} file
 * @param {number} [width] of the picture, in pixels
 * @returns {Promise<Blob|null>} a JPEG
 */
export async function pdfPageOne(file, width = 900) {
    try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const { default: workerSrc } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        try {
            const doc = await task.promise;
            const page = await doc.getPage(1);
            const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;
            return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85));
        } finally {
            // The loading task owns the worker and the document; freeing it frees both.
            task.destroy();
        }
    } catch {
        return null;
    }
}
