/**
 * @description Says, before a lesson video is stored, whether a student's
 * browser will be able to play it.
 *
 * Bunny Storage serves a file exactly as uploaded and nothing here transcodes,
 * so a recording in a codec browsers do not decode — HEVC/H.265 from an iPhone
 * or a Mac screen recording, ProRes from an editor, DivX in an old AVI —
 * uploads fine, saves fine, and then fails in every student's player as
 * "The video could not be loaded." This reads the container's index (the
 * `moov` box, which sits at either end of an MP4/MOV) and names the codec, so
 * the upload is refused with a reason the admin can act on.
 *
 * It only ever refuses what it can positively identify. Anything it cannot
 * parse is allowed through, as before.
 */
const fs = require('fs');
const path = require('path');

// Codecs browsers decode in an MP4/MOV, and ones they do not.
const PLAYABLE_VIDEO = ['avc1', 'avc3', 'vp09', 'vp08', 'av01'];
const UNPLAYABLE_VIDEO = {
    hvc1: 'HEVC (H.265)', hev1: 'HEVC (H.265)', dvh1: 'HEVC (H.265, Dolby Vision)', dvhe: 'HEVC (H.265, Dolby Vision)',
    ap4h: 'Apple ProRes', ap4x: 'Apple ProRes', apch: 'Apple ProRes', apcn: 'Apple ProRes', apcs: 'Apple ProRes', apco: 'Apple ProRes',
    mp4v: 'MPEG-4 Part 2 (DivX/Xvid)', xvid: 'MPEG-4 Part 2 (DivX/Xvid)', divx: 'MPEG-4 Part 2 (DivX/Xvid)',
    mjpa: 'Motion JPEG', mjpb: 'Motion JPEG', jpeg: 'Motion JPEG',
    svq3: 'Sorenson Video', 'SVQ3': 'Sorenson Video', s263: 'H.263',
};
// The same, as Matroska codec ids.
const MKV_PLAYABLE = ['V_MPEG4/ISO/AVC', 'V_VP9', 'V_VP8', 'V_AV1'];
const MKV_UNPLAYABLE = { 'V_MPEGH/ISO/HEVC': 'HEVC (H.265)', 'V_MPEG4/ISO/ASP': 'MPEG-4 Part 2 (DivX/Xvid)', 'V_PRORES': 'Apple ProRes', 'V_MPEG2': 'MPEG-2' };

// Containers no browser's <video> element opens at all.
const UNPLAYABLE_CONTAINERS = [
    { name: 'AVI', test: (b) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'AVI ' },
    { name: 'Windows Media (WMV/ASF)', test: (b) => b.toString('hex', 0, 16) === '3026b2758e66cf11a6d900aa0062ce6c' },
    { name: 'Flash Video (FLV)', test: (b) => b.toString('latin1', 0, 3) === 'FLV' },
    { name: 'MPEG program stream (.mpg)', test: (b) => b.toString('hex', 0, 4) === '000001ba' },
    { name: 'MPEG transport stream (.ts)', test: (b) => b[0] === 0x47 && b[188] === 0x47 && b[376] === 0x47 },
];

const TOP_LEVEL_BOXES = new Set(['ftyp', 'moov', 'mdat', 'free', 'skip', 'wide', 'uuid', 'moof', 'mfra', 'sidx', 'styp', 'pdin', 'meta', 'junk', 'pnot', 'PICT']);
const MAX_MOOV_BYTES = 64 * 1024 * 1024;   // an index larger than this is not a lesson video
const MAX_TOP_LEVEL_BOXES = 64;
const MKV_SCAN_BYTES = 8 * 1024 * 1024;    // the track list sits near the start of a Matroska file
const MKV_MAGIC = '1a45dfa3';

const readAt = (fd, position, length) => {
    const buf = Buffer.alloc(length);
    const n = fs.readSync(fd, buf, 0, length, position);
    return n === length ? buf : buf.subarray(0, n);
};

/** Walk the top-level boxes of an ISO BMFF file and return the `moov` box's bytes, or null. */
const readMoov = (fd, fileSize) => {
    let offset = 0;
    for (let i = 0; i < MAX_TOP_LEVEL_BOXES && offset + 8 <= fileSize; i += 1) {
        const head = readAt(fd, offset, 16);
        if (head.length < 8) return null;
        let size = head.readUInt32BE(0);
        const type = head.toString('latin1', 4, 8);
        let headerSize = 8;
        if (size === 1) {
            if (head.length < 16) return null;
            size = Number(head.readBigUInt64BE(8));
            headerSize = 16;
        } else if (size === 0) {
            size = fileSize - offset;   // last box runs to the end of the file
        }
        if (i === 0 && !TOP_LEVEL_BOXES.has(type)) return null;   // not an MP4/MOV at all
        if (size < headerSize) return null;
        if (type === 'moov') {
            if (size > MAX_MOOV_BYTES) return null;
            return readAt(fd, offset, size);
        }
        offset += size;
    }
    return null;
};

/** Every known codec fourcc that appears anywhere in the buffer. */
const codecsIn = (buf, names) => names.filter((name) => buf.includes(name, 0, 'latin1'));

const exportHint = 'Export it as an H.264 MP4 (the "most compatible" setting in most editors) and upload it again.';

/**
 * Why students' browsers would not play this file, or null when it looks fine
 * (or cannot be read — a parse failure never blocks an upload).
 * @param {string} filePath   the uploaded file on disk
 * @param {string} [originalName] the name it was uploaded with, for the message
 * @returns {string|null}
 */
const unplayableReason = (filePath, originalName = '') => {
    const ext = path.extname(originalName || filePath).toLowerCase() || 'this';
    let fd;
    try {
        fd = fs.openSync(filePath, 'r');
        const fileSize = fs.fstatSync(fd).size;
        const head = readAt(fd, 0, 512);
        if (head.length < 12) return null;

        const container = UNPLAYABLE_CONTAINERS.find((c) => c.test(head));
        if (container) {
            return `Browsers cannot play ${container.name} files (${ext}). ${exportHint}`;
        }

        if (head.toString('hex', 0, 4) === MKV_MAGIC) {
            const start = readAt(fd, 0, Math.min(fileSize, MKV_SCAN_BYTES));
            if (codecsIn(start, MKV_PLAYABLE).length) return null;
            const bad = codecsIn(start, Object.keys(MKV_UNPLAYABLE))[0];
            return bad ? `This video is encoded with ${MKV_UNPLAYABLE[bad]}, which browsers cannot play. ${exportHint}` : null;
        }

        const moov = readMoov(fd, fileSize);
        if (!moov) return null;
        if (codecsIn(moov, PLAYABLE_VIDEO).length) return null;
        const bad = codecsIn(moov, Object.keys(UNPLAYABLE_VIDEO))[0];
        if (!bad) return null;
        return `This video is encoded with ${UNPLAYABLE_VIDEO[bad]}, which most browsers cannot play. ${exportHint}`;
    } catch (err) {
        console.warn(`Could not inspect video codec of ${originalName || filePath}: ${err.message}`);
        return null;
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
    }
};

module.exports = { unplayableReason, readMoov, codecsIn };
