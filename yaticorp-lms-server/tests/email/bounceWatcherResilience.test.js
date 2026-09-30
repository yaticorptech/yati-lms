/**
 * The bounce watcher must never take the server down.
 *
 * It keeps a connection to the LMS mailbox. When that connection dropped, the
 * mail library reported it as an 'error' event; with no listener Node treated
 * it as fatal, and the whole API stopped — every page showed "Network Error"
 * until someone restarted it (2026-09-30). This stands up a mail server of its
 * own that greets, then cuts the connection, and runs one pass against it.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');

const KEYS = ['IMAP_HOST', 'IMAP_PORT', 'IMAP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'BOUNCE_WATCH'];
let saved, server, port;

before(async () => {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    // Greets like an IMAP server, then drops the line when the client speaks.
    server = net.createServer((socket) => {
        socket.write('* OK [CAPABILITY IMAP4rev1 AUTH=PLAIN] ready\r\n');
        socket.once('data', () => socket.destroy());
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    port = server.address().port;
    Object.assign(process.env, { IMAP_HOST: '127.0.0.1', IMAP_PORT: String(port), IMAP_SECURE: 'false', SMTP_USER: 'lms@example.com', SMTP_PASS: 'x' });
    delete process.env.BOUNCE_WATCH;
});
after(async () => {
    KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
    await new Promise((r) => server.close(r));
});

test('a mailbox connection that drops mid-way fails the pass, not the process', async () => {
    const fatal = [];
    const onFatal = (err) => fatal.push(err.message);
    process.on('uncaughtException', onFatal);
    try {
        delete require.cache[require.resolve('../../src/utils/bounceWatcher')];
        const { checkOnce } = require('../../src/utils/bounceWatcher');
        await assert.rejects(checkOnce(), 'the pass reports the failure');
        await new Promise((r) => setTimeout(r, 500));   // let any late 'error' event arrive
        assert.deepEqual(fatal, [], 'and nothing escaped to crash the server');
    } finally {
        process.off('uncaughtException', onFatal);
    }
});
