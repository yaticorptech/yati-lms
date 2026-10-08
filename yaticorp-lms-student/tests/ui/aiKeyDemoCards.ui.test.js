/**
 * "Your own AI key" on My Profile: shown to students, not to the ten demo
 * cards (the server says which, as `fullAccess` on /user/jobs-access).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const entry = `
import { createRoot } from 'react-dom/client';
import AiKeySettings from '${srcFile('components/AiKeySettings.jsx')}';
createRoot(document.getElementById('root')).render(<div id="box"><AiKeySettings /></div>);`;

const api = (access) => apiModule({
    '/user/jobs-access': access,
    '/user/ai-key': { configured: false }
});

describe('the AI key section and the demo cards', { skip: skipWithoutChrome }, () => {
    test('a demo card does not see it', async () => {
        const { result, errors } = await screen({ entry, api: api({ open: true, fullAccess: true }), script: `
            await sleep(700); return text($('#box'));` });
        assert.deepEqual(errors, []);
        assert.equal(result, '', 'nothing drawn');
    });

    test('any other student does', async () => {
        const { result, errors } = await screen({ entry, api: api({ open: false, fullAccess: false }), script: `
            await sleep(700); return text($('#box'));` });
        assert.deepEqual(errors, []);
        assert.match(result, /Your own AI key/);
        assert.match(result, /Save key/);
    });
});
