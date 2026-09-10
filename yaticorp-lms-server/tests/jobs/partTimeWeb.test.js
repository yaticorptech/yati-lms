/**
 * The part-time board's web listings: how old a Google vacancy may be before
 * it is dropped, and what the section says when it has no town to search near.
 *
 * Google is asked for "the last month" and routinely answers with listings two
 * months old. The window it is asked for and the window kept have to agree, or
 * a paid call is spent on rows the next read throws away.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let server, api, me, profile;

before(async () => {
    await connect();
    me = await makeUser('PartTime');
    const OpportunityProfile = require('../../src/jobboard/models/OpportunityProfile');
    const from = new Date();
    const to = new Date(from); to.setDate(to.getDate() + 20);
    profile = await OpportunityProfile.create({
        userId: me.user._id,
        dateOfBirth: new Date('2000-01-01'),        // an adult: the web is open to them
        wantFrom: from, wantTo: to, interests: [],
        guardian: { status: 'not-required' }
    });
    const app = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
    server = app.server;
    api = app.call(me.token);
});

after(async () => {
    if (profile) await require('../../src/jobboard/models/OpportunityProfile').deleteOne({ _id: profile._id });
    await cleanup([me.user], server);
});

describe('the part-time board with no town yet', () => {
    test('says a town is needed rather than showing an empty section', async () => {
        const r = await api('GET', '/opportunities');
        assert.equal(r.status, 200);
        assert.equal(r.body.web.allowed, true, 'an adult may see web vacancies');
        assert.equal(r.body.web.count, 0);
        assert.match(r.body.web.notice, /Set your town/, 'the student is told why there are none');
    });

    test('the local listings are unaffected by having no town', async () => {
        const r = await api('GET', '/opportunities');
        assert.ok(Array.isArray(r.body.results), 'the local board is the section spine');
        assert.equal(r.body.results.every((x) => x.kind !== 'web'), true);
    });
});

describe('where to look when the board comes up empty', () => {
    const { searchLinks } = require('../../src/jobboard/services/jobBoardLinks');

    test('every link carries the student\'s own town', () => {
        const links = searchLinks('Mangaluru');
        assert.ok(links.length >= 3, 'more than one place to look');
        for (const link of links) {
            assert.ok(link.name, 'each says whose site it is');
            assert.match(link.url, /^https:\/\//, 'and is a real address');
            assert.match(decodeURIComponent(link.url).toLowerCase(), /mangaluru/, `${link.name} should search the student's town`);
        }
    });

    test('a town with spaces or punctuation is escaped, not broken', () => {
        for (const link of searchLinks('New Delhi')) {
            assert.equal(/\s/.test(link.url), false, `${link.name} must not carry a raw space`);
            assert.match(decodeURIComponent(link.url).toLowerCase(), /new[ -]delhi/);
        }
    });

    test('no town means nothing to link to', () => {
        assert.deepEqual(searchLinks(''), []);
        assert.deepEqual(searchLinks(null), []);
        assert.deepEqual(searchLinks('   '), []);
    });

    test('they are offered only when the board itself found nothing', async () => {
        // No town is known here, so the board has no vacancies and no links.
        const r = await api('GET', '/opportunities');
        assert.deepEqual(r.body.web.searchLinks, [], 'without a town there is nothing to search');
        assert.match(r.body.web.notice, /Set your town/);
    });
});

describe('how old a Google vacancy may be', () => {
    const { withinWindow, KEEP_DAYS } = require('../../src/jobboard/services/partTimeWebService');

    test('a listing inside the month that was asked for is kept', () => {
        for (const days of [0, 5, 20, 30, KEEP_DAYS]) {
            assert.equal(withinWindow(days), true, `${days} days old should be kept`);
        }
    });

    test('the two-month listings Google sends back unasked are dropped', () => {
        for (const days of [KEEP_DAYS + 1, 44, 67]) {
            assert.equal(withinWindow(days), false, `${days} days old should be dropped`);
        }
    });

    test('a listing with no date is trusted rather than guessed at', () => {
        assert.equal(withinWindow(null), true);
        assert.equal(withinWindow(undefined), true);
    });

    test('the window is wide enough to cover the month the query asks for', () => {
        // The request sends date_posted=month; anything narrower means paying
        // for listings that are thrown away on the very next read.
        assert.ok(KEEP_DAYS >= 31, `KEEP_DAYS is ${KEEP_DAYS}, narrower than the month requested`);
    });
});
