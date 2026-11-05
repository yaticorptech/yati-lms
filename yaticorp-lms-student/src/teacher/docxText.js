/**
 * The text of a Word (.docx) file, read on the device (2026-10-30), so only
 * the text goes to the server, as it does for a PDF. A .docx is a zip; its
 * words are in word/document.xml. The browser's own DecompressionStream
 * unpacks it — no library. Paragraphs, tabs and line breaks are kept the way
 * the server's reader keeps them (server src/teacher/index.js, docxText).
 *
 * Resolves null where the browser cannot unpack a zip, so the caller can send
 * the file to the server to read instead.
 */
const SIG_END = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

const inflateRaw = async (bytes) => {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
};

/** The bytes of one file inside a zip, or null when it is not there. */
const unzipEntry = async (buffer, wanted) => {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    // The end-of-directory record sits in the last 64 KB (after an optional comment).
    let end = -1;
    for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i -= 1) {
        if (view.getUint32(i, true) === SIG_END) { end = i; break; }
    }
    if (end < 0) throw new Error('Not a zip');
    const count = view.getUint16(end + 10, true);
    let at = view.getUint32(end + 16, true);
    const decoder = new TextDecoder();
    for (let n = 0; n < count; n += 1) {
        if (view.getUint32(at, true) !== SIG_CENTRAL) throw new Error('Damaged zip');
        const method = view.getUint16(at + 10, true);
        const size = view.getUint32(at + 20, true);
        const nameLen = view.getUint16(at + 28, true);
        const extraLen = view.getUint16(at + 30, true);
        const commentLen = view.getUint16(at + 32, true);
        const local = view.getUint32(at + 42, true);
        const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLen));
        if (name === wanted) {
            if (view.getUint32(local, true) !== SIG_LOCAL) throw new Error('Damaged zip');
            const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
            const data = bytes.subarray(start, start + size);
            if (method === 0) return data;
            if (method === 8) return inflateRaw(data);
            throw new Error('Unknown compression');
        }
        at += 46 + nameLen + extraLen + commentLen;
    }
    return null;
};

export const canReadDocx = () => typeof DecompressionStream === 'function' && (() => {
    try { new DecompressionStream('deflate-raw'); return true; } catch { return false; }
})();

/** The file's text, or null when this browser cannot unpack it. Throws when the file is not a Word document. */
export const docxText = async (buffer) => {
    if (!canReadDocx()) return null;
    const xml = await unzipEntry(buffer, 'word/document.xml');
    if (!xml) throw new Error('No document in this file');
    return new TextDecoder().decode(xml)
        .replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n').trim();
};
