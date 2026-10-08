/**
 * One browser, one signed-in administrator. The login lives in localStorage,
 * shared by every tab; when another tab signs in as someone else, this tab
 * reloads, so it never shows the platform panel while sending an organization
 * admin's login ("Organization administrators cannot access platform
 * administration").
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '${srcFile('context/AuthContext.jsx')}';
createRoot(document.getElementById('root')).render(<MemoryRouter><AuthProvider><p id="ready">ready</p></AuthProvider></MemoryRouter>);`;

describe('signing in in another tab', { skip: skipWithoutChrome }, () => {
    test('reloads this tab when the saved login changes, and not for anything else', async () => {
        // sessionStorage survives a reload, so it counts the page loads.
        const { result } = await screen({ entry, api: 'export default {};', script: `
            await sleep(300);
            const loads = Number(sessionStorage.getItem('loads') || 0) + 1;
            sessionStorage.setItem('loads', String(loads));
            if (loads > 1) return { loads, ignoredOther: sessionStorage.getItem('ignoredOther') };
            window.dispatchEvent(new StorageEvent('storage', { key: 'theme', oldValue: 'light', newValue: 'dark' }));
            window.dispatchEvent(new StorageEvent('storage', { key: 'adminToken', oldValue: 'same', newValue: 'same' }));
            await sleep(500);
            sessionStorage.setItem('ignoredOther', 'yes');
            window.dispatchEvent(new StorageEvent('storage', { key: 'adminToken', oldValue: 'platform', newValue: 'organization' }));
            await sleep(5000);
            return { loads, reloaded: false };` });
        assert.equal(result.ignoredOther, 'yes', 'another key, or the same login, does not reload');
        assert.equal(result.loads, 2, 'a different login does');
    });
});
