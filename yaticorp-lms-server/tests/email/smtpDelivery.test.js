/**
 * The guardian request really leaves over SMTP, addressed to the parent.
 *
 * Every other test stands the mailer's sendEmail in for a stub, which proves
 * the route asks for a message and nothing about whether one would go. This
 * one lets the real mailer talk SMTP — to a throwaway server on this machine
 * that speaks just enough of the protocol to take a message — and reads back
 * who it was for and what it said. No real mailbox is involved.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');

const KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_FROM_NAME', 'BREVO_API_KEY'];
let saved;

/**
 * A minimal SMTP server: greets, answers EHLO with AUTH, accepts one login
 * and one message, and hands the envelope and body to `received`.
 */
const fakeSmtp = () => {
    const received = [];
    const server = net.createServer((socket) => {
        let mail = { rcpt: [], data: '' }, inData = false, buffer = '';
        const reply = (s) => socket.write(s + '\r\n');
        reply('220 fake.local ESMTP');
        socket.on('data', (chunk) => {
            buffer += chunk.toString();
            let i;
            while ((i = buffer.indexOf('\r\n')) !== -1) {
                const line = buffer.slice(0, i); buffer = buffer.slice(i + 2);
                if (inData) {
                    if (line === '.') { inData = false; received.push(mail); mail = { rcpt: [], data: '' }; reply('250 2.0.0 OK queued'); }
                    else mail.data += line + '\n';
                    continue;
                }
                const cmd = line.split(' ')[0].toUpperCase();
                if (cmd === 'EHLO' || cmd === 'HELO') reply('250-fake.local\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME');
                else if (cmd === 'AUTH') { if (line.toUpperCase().startsWith('AUTH PLAIN ')) reply('235 2.7.0 Authenticated'); else reply('334 VXNlcm5hbWU6'); }
                else if (cmd === 'MAIL') { mail.from = line.replace(/^MAIL FROM:\s*/i, ''); reply('250 2.1.0 OK'); }
                else if (cmd === 'RCPT') { mail.rcpt.push(line.replace(/^RCPT TO:\s*/i, '')); reply('250 2.1.5 OK'); }
                else if (cmd === 'DATA') { inData = true; reply('354 End data with <CR><LF>.<CR><LF>'); }
                else if (cmd === 'QUIT') { reply('221 Bye'); socket.end(); }
                else if (/^[A-Za-z0-9+/=]+$/.test(line)) reply(received.length === 0 && !mail.from ? '334 UGFzc3dvcmQ6' : '235 2.7.0 Authenticated');
                else reply('250 OK');
            }
        });
    });
    return { server, received };
};

let fake, port;
before(async () => {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    fake = fakeSmtp();
    await new Promise((r) => fake.server.listen(0, '127.0.0.1', r));
    port = fake.server.address().port;
});
after(async () => {
    KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
    await new Promise((r) => fake.server.close(r));
});

describe('the guardian request over SMTP', () => {
    test('the real mailer delivers it to the parent\'s address, from the LMS, with the buttons', async () => {
        KEYS.forEach((k) => { delete process.env[k]; });
        process.env.SMTP_HOST = '127.0.0.1';
        process.env.SMTP_PORT = String(port);
        process.env.SMTP_USER = 'lms@example.com';
        process.env.SMTP_PASS = 'an-app-password';
        process.env.SMTP_FROM_NAME = 'YATICORP LMS';
        delete require.cache[require.resolve('../../src/utils/emailService')];
        const mailer = require('../../src/utils/emailService');
        assert.equal(mailer.provider(), 'smtp');

        const info = await mailer.sendEmail({
            to: 'devaki.rao@example.com', toName: 'Devaki Rao',
            subject: 'Sowndarya needs your permission for a part-time job',
            htmlContent: '<a href="https://learn.yaticorp.com/jobs/guardian/tok123?answer=approve">Yes, I approve</a>'
        });
        mailer.closeEmailTransport();

        assert.deepEqual(info.accepted, ['devaki.rao@example.com'], 'the server took it for the parent');
        assert.equal(fake.received.length, 1, 'exactly one message arrived');
        const m = fake.received[0];
        assert.deepEqual(m.rcpt, ['<devaki.rao@example.com>'], 'addressed to the parent, nobody else');
        assert.equal(m.from, '<lms@example.com>', 'from the LMS mailbox');
        assert.match(m.data, /^Subject: Sowndarya needs your permission for a part-time job$/m);
        assert.match(m.data, /^To: "?Devaki Rao"? <devaki\.rao@example\.com>$/m, 'with the parent\'s name on it');
        // The body is quoted-printable: soft line breaks ("=\n") and "=3D" for "=".
        const body = m.data.replace(/=\n/g, '').replace(/=3D/g, '=');
        assert.match(body, /href="https:\/\/learn\.yaticorp\.com\/jobs\/guardian\/tok123\?answer=approve"/, 'and the approve button inside, whole');
    });

    test('a server that cannot be reached is reported as a failure, not a send', async () => {
        // Nothing listens on port 1. The mailer must throw, so the route
        // records a failed send rather than claiming one it never made.
        KEYS.forEach((k) => { delete process.env[k]; });
        process.env.SMTP_HOST = '127.0.0.1';
        process.env.SMTP_PORT = '1';   // nothing listens here
        process.env.SMTP_USER = 'lms@example.com';
        process.env.SMTP_PASS = 'x';
        delete require.cache[require.resolve('../../src/utils/emailService')];
        const mailer = require('../../src/utils/emailService');
        await assert.rejects(mailer.sendEmail({ to: 'devaki.rao@example.com', subject: 's', htmlContent: 'h' }), /ECONNREFUSED|connect|ECONNECTION/i);
        mailer.closeEmailTransport();
    });
});
