/**
 * The guards around Career Path's paid AI calls.
 *
 * - The mentor took `message` unchecked: an object became "[object Object]"
 *   and was answered and billed, a 200 KB paste went to Gemini whole.
 * - An AI scholarship search whose every item was filtered out overwrote the
 *   student's existing list with [] and answered 201, so the charge stood.
 * - The link checker fetched whatever URL the model wrote, including private
 *   and loopback addresses inside the server's own network.
 * - A "Postgraduate Year N" phase was dropped even when N was still ahead of
 *   the student.
 *
 * Gemini is stubbed before any controller loads; nothing here spends a call.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const gemini = require('../../src/career/services/geminiService');
let mentorCalls = 0;
gemini.generateMentorResponse = async () => { mentorCalls += 1; return 'A short answer.'; };
let scholarshipReply = { scholarships: [] };
gemini.generateScholarshipsFromAI = async () => scholarshipReply;

const { isLive, isPrivateAddress } = require('../../src/career/services/linkCheck');

let chat, scholar, me;

before(async () => {
  await connect();
  me = await makeUser('AiGuards');
  chat = startApp({ mount: '/api/chat', router: require('../../src/career/routes/chatRoutes') });
  const { protect } = require('../../src/career/middleware/authMiddleware');
  const { generateScholarships } = require('../../src/career/controllers/scholarshipController');
  const router = express.Router();
  // Without the wallet charge, so the test does not depend on the admin's price.
  router.post('/generate', protect, generateScholarships);
  scholar = startApp({ mount: '/api/scholarships', router });
});

after(async () => {
  await new Promise((r) => chat.server.close(r));
  await cleanup([me.user], scholar.server);
});

describe('the mentor refuses a message that is not one, before the AI is asked', () => {
  test('over 2000 characters', async () => {
    const res = await chat.call(me.token)('POST', '/', { message: 'a'.repeat(2001) });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /2000/);
    assert.equal(mentorCalls, 0);
  });

  test('not a string', async () => {
    for (const message of [{ text: 'hi' }, ['hi'], 42, '   ', undefined]) {
      const res = await chat.call(me.token)('POST', '/', { message });
      assert.equal(res.status, 400, `${JSON.stringify(message)} should be refused`);
    }
    assert.equal(mentorCalls, 0);
  });

  test('exactly 2000 characters is still answered', async () => {
    const res = await chat.call(me.token)('POST', '/', { message: 'b'.repeat(2000) });
    assert.notEqual(res.status, 400, JSON.stringify(res.body));
  });
});

describe('a scholarship search that finds nothing usable', () => {
  test('keeps the old list and answers a 5xx, so the charge is refunded', async () => {
    const Goal = require('../../src/career/models/Goal');
    const Scholarship = require('../../src/career/models/Scholarship');
    await Goal.create({
      userId: me.user._id, educationLevel: 'Undergraduate', degree: 'BCA',
      specialization: 'Computer Applications', currentYear: '2nd Year', careerGoal: 'Frontend Developer'
    });
    await Scholarship.create({
      userId: me.user._id, items: [{ name: 'Kept', link: 'https://scholarships.gov.in' }], builtFor: 'Frontend Developer'
    });
    // Every link points inside the server's network, so all are dropped —
    // without the test reaching the network at all.
    scholarshipReply = { scholarships: [
      { name: 'Internal', link: 'http://127.0.0.1:5000/admin' },
      { name: 'Metadata', link: 'http://169.254.169.254/latest' }
    ] };
    const res = await scholar.call(me.token)('POST', '/generate');
    assert.equal(res.status, 502);
    const doc = await Scholarship.findOne({ userId: me.user._id }).lean();
    assert.deepEqual(doc.items.map((i) => i.name), ['Kept']);
  });
});

describe('the link checker stays out of private networks', () => {
  test('recognises private, loopback and link-local addresses', () => {
    for (const ip of ['10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '127.0.0.1',
      '169.254.169.254', '::1', 'fc00::1', 'fd12::1', 'fe80::1', '::ffff:127.0.0.1']) {
      assert.equal(isPrivateAddress(ip), true, `${ip} is private`);
    }
    for (const ip of ['8.8.8.8', '172.32.0.1', '2606:4700::1111']) {
      assert.equal(isPrivateAddress(ip), false, `${ip} is public`);
    }
  });

  test('a private host is dead without being fetched', async () => {
    const realFetch = global.fetch;
    let fetched = 0;
    global.fetch = async () => { fetched += 1; return { status: 200 }; };
    try {
      assert.equal(await isLive('http://127.0.0.1/admin'), false);
      assert.equal(await isLive('http://[::1]/'), false);
      assert.equal(fetched, 0);
    } finally {
      global.fetch = realFetch;
    }
  });

  test('a redirect into a private host is not followed', async () => {
    const realFetch = global.fetch;
    const seen = [];
    global.fetch = async (url) => {
      seen.push(url);
      return { status: 302, headers: { get: () => 'http://10.0.0.5/secret' } };
    };
    try {
      assert.equal(await isLive('http://93.184.215.14/apply'), false);
      assert.ok(seen.every((u) => !u.includes('10.0.0.5')), 'never requested the private hop');
    } finally {
      global.fetch = realFetch;
    }
  });
});

describe('postgraduate year phases', () => {
  const pg = (currentYear) => ({ educationLevel: 'Postgraduate', degree: 'MCA', currentYear });

  test("MCA Year 1 keeps the Year 2 still ahead of them", () => {
    const phases = [{ phase: 'MCA Year 1' }, { phase: 'Postgraduate Year 2: MCA Final Year' }, { phase: 'Jobs' }];
    assert.deepEqual(gemini.completedStageIndices(phases, pg('1st Year')), []);
  });

  test('MCA Year 2 still loses a Postgraduate Year 1 phase', () => {
    const phases = [{ phase: 'MCA Year 2' }, { phase: 'Postgraduate Year 1: MCA' }, { phase: 'Jobs' }];
    assert.deepEqual(gemini.completedStageIndices(phases, pg('2nd Year')), [1]);
  });

  test('an unreadable year drops no postgraduate phase', () => {
    const phases = [{ phase: 'MCA' }, { phase: 'PG Year 1' }, { phase: 'Jobs' }];
    assert.deepEqual(gemini.completedStageIndices(phases, pg('')), []);
  });
});
