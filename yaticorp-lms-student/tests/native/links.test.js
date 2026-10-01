/** Which links leave the app, and how a file is named on the device. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { isExternalLink, safeFileName } = await import('../../src/native/links.js');
const APP = 'capacitor://localhost';

test('links to the outside web are external; the app\'s own routes and in-page anchors are not', () => {
    assert.equal(isExternalLink('https://example.org/apply', APP), true);
    assert.equal(isExternalLink('http://scholarships.gov.in', APP), true);
    assert.equal(isExternalLink('/career/planner', APP), false);
    assert.equal(isExternalLink('#today', APP), false);
    assert.equal(isExternalLink('capacitor://localhost/learn/c1', APP), false);
    assert.equal(isExternalLink('mailto:help@yaticorp.com', APP), false);
    assert.equal(isExternalLink('tel:+911234567890', APP), false);
    assert.equal(isExternalLink('', APP), false);
    assert.equal(isExternalLink('https://localhost/jobs', 'https://localhost'), false, 'the Android shell\'s own origin');
});

test('a file name keeps letters, spaces and dots, loses path and shell characters, and never comes out empty', () => {
    assert.equal(safeFileName('ATS_Resume.pdf'), 'ATS_Resume.pdf');
    assert.equal(safeFileName('Certificate_Web Basics.pdf'), 'Certificate_Web Basics.pdf');
    assert.equal(safeFileName('../a/b:c?.png'), '.._a_b_c_.png');
    assert.equal(safeFileName(''), 'download');
    assert.equal(safeFileName(null, 'file.pdf'), 'file.pdf');
});
