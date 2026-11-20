/**
 * Report lesson videos that will not play on phones (2026-11-17: a lesson played on
 * desktop but showed "This video cannot be played in your browser" on many phones).
 *
 *   node scripts/reportPhoneUnplayableVideos.js
 *
 * Read only. For every lesson with a direct video file (Bunny Storage, S3, any URL — not
 * YouTube, VdoCipher or Bunny Stream, which transcode for every device), it fetches only the
 * file's header and index with HTTP Range requests (a few KB to a few MB, never the whole
 * video), rebuilds them in a sparse temp file, and runs the same check as the upload
 * (src/utils/webVideo.js): HEVC, 10-bit / 4:2:2 H.264, larger than 4K, WebM/MKV, VP9/AV1.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const { unplayableReason } = require('../src/utils/webVideo');

const HEAD_BYTES = 1024 * 1024;
const MAX_MOOV = 64 * 1024 * 1024;

const range = async (url, from, to) => {
    const r = await fetch(url, { headers: { Range: `bytes=${from}-${to}` } });
    if (r.status === 404) throw Object.assign(new Error('file not found (404)'), { missing: true });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const total = Number((r.headers.get('content-range') || '').split('/')[1]) || Number(r.headers.get('content-length')) || 0;
    const buf = Buffer.from(await r.arrayBuffer());
    // A server that ignores Range sends the whole file: keep only what was asked for.
    return { buf: r.status === 206 ? buf : buf.subarray(from, to + 1), total, ranged: r.status === 206 };
};

/** The header and the moov box, written at their real offsets into a sparse file of the real size. */
const sparseCopy = async (url, file) => {
    const first = await range(url, 0, HEAD_BYTES - 1);
    const size = first.total || first.buf.length;
    const fd = fs.openSync(file, 'w');
    try {
        fs.writeSync(fd, first.buf, 0, first.buf.length, 0);
        let offset = 0;
        for (let i = 0; i < 64 && offset + 8 <= size; i += 1) {
            const head = offset + 16 <= first.buf.length ? first.buf.subarray(offset, offset + 16) : (await range(url, offset, offset + 15)).buf;
            let boxSize = head.readUInt32BE(0);
            const type = head.toString('latin1', 4, 8);
            if (boxSize === 1) boxSize = Number(head.readBigUInt64BE(8));
            else if (boxSize === 0) boxSize = size - offset;
            if (boxSize < 8) break;
            if (offset + 16 > first.buf.length) fs.writeSync(fd, head, 0, head.length, offset);
            if (type === 'moov') {
                if (boxSize <= MAX_MOOV && offset + boxSize > first.buf.length) {
                    const m = await range(url, offset, offset + boxSize - 1);
                    fs.writeSync(fd, m.buf, 0, m.buf.length, offset);
                }
                break;
            }
            offset += boxSize;
        }
        fs.ftruncateSync(fd, size);
    } finally { fs.closeSync(fd); }
    return size;
};

(async () => {
    await connectDB();
    const lessons = await mongoose.connection.collection('lessons')
        .find({ videoUrl: { $regex: '^https?://' }, videoSource: { $nin: ['youtube', 'vdocipher'] } }, { projection: { title: 1, videoUrl: 1, moduleId: 1 } })
        .toArray();
    const courses = new Map((await mongoose.connection.collection('courses').find({}, { projection: { title: 1 } }).toArray()).map((c) => [String(c._id), c.title]));
    const moduleCourse = new Map((await mongoose.connection.collection('modules').find({}, { projection: { courseId: 1 } }).toArray()).map((m) => [String(m._id), String(m.courseId)]));
    const files = lessons.filter((l) => !/youtu\.?be|vdocipher|mediadelivery\.net|\.m3u8(\?|$)/i.test(l.videoUrl));
    console.log(`Checking ${files.length} lesson video file(s)…\n`);

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phonevideo-'));
    const bad = [], missing = [], unreadable = [];
    let ok = 0;
    for (const [i, l] of files.entries()) {
        const where = `${courses.get(moduleCourse.get(String(l.moduleId))) || '(no course)'} › ${l.title}`;
        const file = path.join(tmp, `${i}${path.extname(new URL(l.videoUrl).pathname) || '.mp4'}`);
        try {
            await sparseCopy(l.videoUrl, file);
            const why = unplayableReason(file, decodeURIComponent(path.basename(new URL(l.videoUrl).pathname)));
            if (why) bad.push({ where, url: l.videoUrl, why, id: String(l._id) }); else ok += 1;
        } catch (e) {
            (e.missing ? missing : unreadable).push({ where, url: l.videoUrl, why: e.message, id: String(l._id) });
        } finally { fs.rmSync(file, { force: true }); }
        process.stdout.write(`\r  ${i + 1}/${files.length}`);
    }
    fs.rmSync(tmp, { recursive: true, force: true });

    const list = (title, rows) => {
        if (!rows.length) return;
        console.log(`\n\n${title} (${rows.length})`);
        for (const r of rows) console.log(`\n• ${r.where}\n  lesson ${r.id}\n  ${r.url}\n  → ${r.why}`);
    };
    console.log(`\n\nPlays on phones: ${ok}`);
    list('WILL NOT PLAY ON (SOME) PHONES — re-export as H.264 MP4, 8-bit, 1080p', bad);
    list('FILE MISSING ON THE CDN — upload again', missing);
    list('COULD NOT BE CHECKED', unreadable);
    await mongoose.disconnect();
})().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => {}); process.exit(1); });
