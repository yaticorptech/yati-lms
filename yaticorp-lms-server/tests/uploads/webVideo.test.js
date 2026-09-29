/**
 * The codec check that runs before a lesson video is stored, on files built
 * here byte by byte: MP4/MOV with the index at either end, Matroska, and the
 * containers browsers never open. No database, no network.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { unplayableReason } = require('../../src/utils/webVideo');

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'webvideo-')); });
after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

const write = (name, buf) => { const p = path.join(dir, name); fs.writeFileSync(p, buf); return p; };

/** An ISO BMFF box: 32-bit size, type, payload. */
const box = (type, ...payload) => {
    const body = Buffer.concat(payload.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p, 'latin1'))));
    const head = Buffer.alloc(8); head.writeUInt32BE(8 + body.length, 0); head.write(type, 4, 'latin1');
    return Buffer.concat([head, body]);
};
/** A box with the 64-bit "largesize" header that big mdat boxes use. */
const largeBox = (type, body) => {
    const head = Buffer.alloc(16); head.writeUInt32BE(1, 0); head.write(type, 4, 'latin1'); head.writeBigUInt64BE(BigInt(16 + body.length), 8);
    return Buffer.concat([head, body]);
};
const ftyp = (brand) => box('ftyp', brand, Buffer.alloc(4), brand);
/** A moov whose sample table declares the given codec fourccs, one track each. */
const moov = (...codecs) => box('moov', box('mvhd', Buffer.alloc(100)),
    ...codecs.map((c) => box('trak', box('mdia', box('minf', box('stbl', box('stsd', Buffer.alloc(8), box(c, Buffer.alloc(78)))))))));
const mdat = (bytes) => box('mdat', Buffer.alloc(bytes, 7));

describe('MP4 and MOV', () => {
    test('an iPhone or Mac HEVC recording is refused, with the codec named and what to do', () => {
        // QuickTime writes the index after the media, as a screen recording does.
        const p = write('rec.mov', Buffer.concat([ftyp('qt  '), box('wide'), mdat(5000), moov('hvc1', 'mp4a')]));
        const why = unplayableReason(p, 'Screen Recording.mov');
        assert.match(why, /HEVC \(H\.265\)/);
        assert.match(why, /H\.264 MP4/);
    });

    test('an H.264 MP4 passes, with the index at the front or the back', () => {
        assert.equal(unplayableReason(write('a.mp4', Buffer.concat([ftyp('isom'), moov('avc1', 'mp4a'), mdat(5000)])), 'a.mp4'), null);
        assert.equal(unplayableReason(write('b.mp4', Buffer.concat([ftyp('isom'), mdat(5000), moov('avc1', 'mp4a')])), 'b.mp4'), null);
    });

    test('the index is found past a 64-bit mdat and past a zero-size last box', () => {
        const big = Buffer.concat([ftyp('isom'), largeBox('mdat', Buffer.alloc(3000, 1)), moov('hvc1')]);
        assert.match(unplayableReason(write('big.mp4', big), 'big.mp4'), /HEVC/);
        // size 0 = "runs to the end of the file", only legal on the last box
        const tail = moov('hvc1'); const zero = Buffer.from(tail); zero.writeUInt32BE(0, 0);
        assert.match(unplayableReason(write('zero.mp4', Buffer.concat([ftyp('isom'), mdat(100), zero])), 'zero.mp4'), /HEVC/);
    });

    test('ProRes and MPEG-4 Part 2 are refused by name; a file that also has an H.264 track is not', () => {
        assert.match(unplayableReason(write('p.mov', Buffer.concat([ftyp('qt  '), moov('apch', 'lpcm'), mdat(100)])), 'p.mov'), /ProRes/);
        assert.match(unplayableReason(write('d.mp4', Buffer.concat([ftyp('isom'), moov('mp4v', 'mp4a'), mdat(100)])), 'd.mp4'), /DivX/);
        assert.equal(unplayableReason(write('both.mp4', Buffer.concat([ftyp('isom'), moov('hvc1', 'avc1', 'mp4a'), mdat(100)])), 'both.mp4'), null);
    });

    test('a broken or truncated index does not block the upload', () => {
        assert.equal(unplayableReason(write('t.mp4', Buffer.concat([ftyp('isom'), mdat(100)]).subarray(0, 20)), 't.mp4'), null);
        const huge = box('mdat', Buffer.alloc(8)); huge.writeUInt32BE(0x7fffffff, 0);   // claims to run past the end
        assert.equal(unplayableReason(write('h.mp4', Buffer.concat([ftyp('isom'), huge])), 'h.mp4'), null);
    });
});

describe('other containers', () => {
    const mkv = (...ids) => Buffer.concat([Buffer.from('1a45dfa3', 'hex'), Buffer.alloc(64), ...ids.map((id) => Buffer.from(`\u0000${id}\u0000`, 'latin1')), Buffer.alloc(200)]);

    test('Matroska: HEVC is refused, H.264 is not', () => {
        assert.match(unplayableReason(write('h.mkv', mkv('V_MPEGH/ISO/HEVC', 'A_AAC')), 'h.mkv'), /HEVC/);
        assert.equal(unplayableReason(write('a.mkv', mkv('V_MPEG4/ISO/AVC', 'A_AAC')), 'a.mkv'), null);
    });

    test('AVI, WMV, FLV and MPEG streams are refused as containers', () => {
        const avi = Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.alloc(4), Buffer.from('AVI LIST', 'latin1'), Buffer.alloc(600)]);
        assert.match(unplayableReason(write('x.avi', avi), 'x.avi'), /AVI files \(\.avi\)/);
        const wmv = Buffer.concat([Buffer.from('3026b2758e66cf11a6d900aa0062ce6c', 'hex'), Buffer.alloc(600)]);
        assert.match(unplayableReason(write('x.wmv', wmv), 'x.wmv'), /Windows Media/);
        assert.match(unplayableReason(write('x.flv', Buffer.concat([Buffer.from('FLV\u0001', 'latin1'), Buffer.alloc(600)])), 'x.flv'), /Flash/);
        assert.match(unplayableReason(write('x.mpg', Buffer.concat([Buffer.from('000001ba', 'hex'), Buffer.alloc(600)])), 'x.mpg'), /program stream/);
        const ts = Buffer.alloc(600); ts[0] = 0x47; ts[188] = 0x47; ts[376] = 0x47;
        assert.match(unplayableReason(write('x.ts', ts), 'x.ts'), /transport stream/);
    });

    test('something that is not a video at all, or a missing file, is left to the next check', () => {
        assert.equal(unplayableReason(write('x.bin', Buffer.alloc(600, 0x41)), 'x.bin'), null);
        assert.equal(unplayableReason(path.join(dir, 'nope.mp4'), 'nope.mp4'), null);
    });
});
