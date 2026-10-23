/**
 * A paper the teacher uploads for the plagiarism check, turned into what the
 * server keeps: the text of a PDF or a text file, read here in the browser
 * with the app's own pdf.js (nothing is sent anywhere else), or a Word file
 * passed on as it is for the server to read.
 */
import { loadPdfjs } from '../components/course/loadPdfjs';

export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
export const SOURCE_ACCEPT = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

const base64Of = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
};

const pdfText = async (buffer) => {
    const pdfjs = await loadPdfjs();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages = [];
    for (let n = 1; n <= doc.numPages; n += 1) {
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => `${item.str}${item.hasEOL ? '\n' : ' '}`).join('').replace(/[ \t]+/g, ' '));
    }
    await doc.destroy?.();
    return pages.join('\n\n');
};

/** { fileName, text } or { fileName, docx } — throws a message to show if the file cannot be used. */
export const readSourceFile = async (file) => {
    if (file.size > MAX_SOURCE_BYTES) throw new Error('That file is larger than 15 MB. Upload one paper or chapter at a time.');
    const name = file.name || 'source';
    const ext = name.toLowerCase().split('.').pop();
    if (ext === 'pdf' || file.type === 'application/pdf') {
        try { return { fileName: name, text: await pdfText(await file.arrayBuffer()) }; }
        catch { throw new Error('That PDF could not be read. It may be protected with a password, or damaged.'); }
    }
    if (ext === 'docx') return { fileName: name, docx: base64Of(await file.arrayBuffer()) };
    if (ext === 'txt' || file.type === 'text/plain') return { fileName: name, text: await file.text() };
    if (ext === 'doc') throw new Error('Old .doc files cannot be read. Save it as .docx or PDF and upload that.');
    throw new Error('Upload a PDF, a Word (.docx) or a text (.txt) file.');
};
