/**
 * How email leaves this server: over SMTP where a mailbox has been given, and
 * through Brevo's API otherwise.
 *
 * The choice matters more than it looks. A Brevo key that is present but
 * disabled in the dashboard answers "API Key is not enabled" and nothing
 * leaves, which is exactly the case SMTP was added to get around — so these
 * pin down which way out is taken, and that a server with neither says so
 * rather than reporting a send.
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM',
    'SMTP_FROM_NAME', 'BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'ADMIN_EMAIL'];

let saved;
/** Load the module fresh, so it reads whatever the environment now says. */
const load = () => {
    delete require.cache[require.resolve('../../src/utils/emailService')];
    return require('../../src/utils/emailService');
};

beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    KEYS.forEach((k) => { delete process.env[k]; });
});
afterEach(() => {
    KEYS.forEach((k) => {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
    });
});

describe('which way the email goes out', () => {
    test('SMTP is preferred once a mailbox has been given', () => {
        process.env.BREVO_API_KEY = 'a-brevo-key';
        process.env.SMTP_HOST = 'smtp.example.com';
        process.env.SMTP_USER = 'lms@example.com';
        process.env.SMTP_PASS = 'a-password';
        const { provider, emailConfigured } = load();
        assert.equal(provider(), 'smtp', 'a working mailbox beats a key that may be disabled');
        assert.equal(emailConfigured(), true);
    });

    test('half-filled SMTP details are ignored rather than half-used', () => {
        process.env.BREVO_API_KEY = 'a-brevo-key';
        process.env.SMTP_HOST = 'smtp.example.com';
        process.env.SMTP_USER = 'lms@example.com';
        // no SMTP_PASS
        assert.equal(load().provider(), 'brevo', 'an incomplete mailbox is not a mailbox');
    });

    test('Brevo still carries it where that is all there is', () => {
        process.env.BREVO_API_KEY = 'a-brevo-key';
        assert.equal(load().provider(), 'brevo');
    });

    test('a server with neither says so instead of reporting a send', async () => {
        const { provider, emailConfigured, sendEmail } = load();
        assert.equal(provider(), null);
        assert.equal(emailConfigured(), false);
        await assert.rejects(
            () => sendEmail({ to: 'devaki@example.com', subject: 'Permission needed', htmlContent: '<p>hi</p>' }),
            /No email provider configured/,
            'silence would read as success to every caller'
        );
    });
});

describe('what SMTP is told', () => {
    /** Capture the transport nodemailer is asked for, without sending. */
    const captureTransport = () => {
        const nodemailer = require('nodemailer');
        const real = nodemailer.createTransport;
        const seen = {};
        nodemailer.createTransport = (opts) => {
            seen.options = opts;
            return { sendMail: async (mail) => { seen.mail = mail; return { messageId: 'test', accepted: [mail.to] }; } };
        };
        return { seen, restore: () => { nodemailer.createTransport = real; } };
    };

    test('587 uses STARTTLS and 465 uses implicit TLS, without being told twice', async () => {
        for (const [port, secure] of [['587', false], ['465', true]]) {
            process.env.SMTP_HOST = 'smtp.example.com';
            process.env.SMTP_USER = 'lms@example.com';
            process.env.SMTP_PASS = 'a-password';
            process.env.SMTP_PORT = port;
            const { seen, restore } = captureTransport();
            try {
                await load().sendEmail({ to: 'devaki@example.com', subject: 'x', htmlContent: '<p>x</p>' });
                assert.equal(seen.options.port, Number(port));
                assert.equal(seen.options.secure, secure, `port ${port} should be secure=${secure}`);
            } finally { restore(); }
        }
    });

    test('the sender falls back to the mailbox when none is named', async () => {
        process.env.SMTP_HOST = 'smtp.example.com';
        process.env.SMTP_USER = 'lms@example.com';
        process.env.SMTP_PASS = 'a-password';
        const { seen, restore } = captureTransport();
        try {
            await load().sendEmail({ to: 'devaki@example.com', toName: 'Devaki', subject: 'Permission needed', htmlContent: '<p>hi</p>' });
            assert.equal(seen.mail.from.address, 'lms@example.com');
            assert.equal(seen.mail.from.name, 'YATICORP LMS');
            assert.deepEqual(seen.mail.to, { name: 'Devaki', address: 'devaki@example.com' });
            assert.equal(seen.mail.subject, 'Permission needed');
        } finally { restore(); }
    });

    test('a named sender and display name are used when given', async () => {
        process.env.SMTP_HOST = 'smtp.example.com';
        process.env.SMTP_USER = 'lms@example.com';
        process.env.SMTP_PASS = 'a-password';
        process.env.SMTP_FROM = 'no-reply@school.edu';
        process.env.SMTP_FROM_NAME = 'St. Joseph\'s LMS';
        const { seen, restore } = captureTransport();
        try {
            await load().sendEmail({ to: 'devaki@example.com', subject: 'x', htmlContent: '<p>x</p>' });
            assert.equal(seen.mail.from.address, 'no-reply@school.edu');
            assert.equal(seen.mail.from.name, "St. Joseph's LMS");
        } finally { restore(); }
    });

    test('a refused send is passed on, never swallowed', async () => {
        process.env.SMTP_HOST = 'smtp.example.com';
        process.env.SMTP_USER = 'lms@example.com';
        process.env.SMTP_PASS = 'a-password';
        const nodemailer = require('nodemailer');
        const real = nodemailer.createTransport;
        nodemailer.createTransport = () => ({ sendMail: async () => { throw new Error('535 auth failed'); } });
        try {
            await assert.rejects(
                () => load().sendEmail({ to: 'devaki@example.com', subject: 'x', htmlContent: '<p>x</p>' }),
                /535 auth failed/
            );
        } finally { nodemailer.createTransport = real; }
    });
});

/**
 * A mail server small enough to live in a test: it speaks just enough SMTP to
 * accept one message, so the transport is exercised for real — connection,
 * AUTH, envelope and body — rather than only checking the options we hand
 * nodemailer.
 */
const net = require('node:net');

const tinySmtpServer = () => {
    const received = { auth: null, from: null, to: [], data: '' };
    const server = net.createServer((socket) => {
        let inData = false;
        let expectAuth = false;
        socket.write('220 test.local ESMTP\r\n');
        socket.on('data', (chunk) => {
            for (const line of chunk.toString('utf8').split('\r\n')) {
                if (inData) {
                    if (line === '.') { inData = false; socket.write('250 2.0.0 Ok: queued\r\n'); }
                    else received.data += `${line}\n`;
                    continue;
                }
                if (expectAuth) { received.auth = line; expectAuth = false; socket.write('235 2.7.0 Accepted\r\n'); continue; }
                if (!line) continue;
                const verb = line.split(' ')[0].toUpperCase();
                if (verb === 'EHLO' || verb === 'HELO') socket.write('250-test.local\r\n250 AUTH PLAIN LOGIN\r\n');
                else if (verb === 'AUTH') {
                    if (line.split(' ').length > 2) { received.auth = line; socket.write('235 2.7.0 Accepted\r\n'); }
                    else { expectAuth = true; socket.write('334 \r\n'); }
                } else if (verb === 'MAIL') { received.from = line; socket.write('250 2.1.0 Ok\r\n'); }
                else if (verb === 'RCPT') { received.to.push(line); socket.write('250 2.1.5 Ok\r\n'); }
                else if (verb === 'DATA') { inData = true; socket.write('354 End data with <CR><LF>.<CR><LF>\r\n'); }
                else if (verb === 'QUIT') { socket.write('221 2.0.0 Bye\r\n'); socket.end(); }
                else socket.write('250 2.0.0 Ok\r\n');
            }
        });
        socket.on('error', () => {});
    });
    return { server, received };
};

describe('a real send, through a real socket', () => {
    test('the guardian message reaches an SMTP server intact', async () => {
        const { server, received } = tinySmtpServer();
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();

        process.env.SMTP_HOST = '127.0.0.1';
        process.env.SMTP_PORT = String(port);
        process.env.SMTP_USER = 'lms@school.edu';
        process.env.SMTP_PASS = 'a-password';
        process.env.SMTP_FROM_NAME = 'YATICORP LMS';

        const mailer = load();
        try {
            const info = await mailer.sendEmail({
                to: 'devaki@example.com',
                toName: 'Devaki',
                subject: 'Sowndarya needs your permission for a part-time job',
                htmlContent: '<p>Front Desk Assistant at ABC Company.</p>'
            });
            assert.ok(info.messageId, 'the server accepted it and gave it an id');
            assert.deepEqual(info.accepted, ['devaki@example.com']);
        } finally {
            // The pool holds its sockets open; without this nothing exits.
            mailer.closeEmailTransport();
            await new Promise((resolve) => server.close(resolve));
        }

        assert.ok(received.auth, 'it authenticated');
        assert.match(received.from, /lms@school\.edu/, 'sent from the mailbox');
        assert.equal(received.to.length, 1);
        assert.match(received.to[0], /devaki@example\.com/, 'to the guardian');
        assert.match(received.data, /Subject: .*needs your permission/i);
        assert.match(received.data, /Front Desk Assistant/, 'the body went with it');
    });
});
