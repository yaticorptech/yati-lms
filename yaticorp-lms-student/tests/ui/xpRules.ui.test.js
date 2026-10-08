/**
 * The XP a page promises is the admin's rule, not a number of its own.
 * Career Path printed "+10 XP" and Interview Ready "earns 30 XP" as fixed
 * text, so an admin who changed the rules under Rewards → Reward rules saw
 * the student pages go on promising the old amounts. Here the rewards summary
 * carries rules of 15 and 45, and the pages say 15 and 45.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const withRules = (rules, body, imports) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
${imports}
const value = { enabled: true, summary: ${rules ? `{ xpRules: ${JSON.stringify(rules)} }` : 'null'}, refresh: () => {}, celebrate: () => {}, pullEvents: () => {} };
createRoot(document.getElementById('root')).render(
  <RewardsContext.Provider value={value}><MemoryRouter>${body}</MemoryRouter></RewardsContext.Provider>);`;

const mission = (rules) => withRules(rules, '<CurrentMission completedToday={0} totalToday={2} />', `import CurrentMission from '${srcFile('career/components/journey/CurrentMission.jsx')}';`);
const history = (rules) => withRules(rules, '<InterviewHistory />', `import InterviewHistory from '${srcFile('interview/InterviewHistory.jsx')}';`);
const read = `await sleep(800); return { text: document.body.innerText.replace(/\\s+/g, ' ') };`;

describe('XP amounts come from the admin rules', { skip: skipWithoutChrome }, () => {
    test("today's quest promises what a task pays under the rules", async () => {
        const { result, errors } = await screen({ entry: mission({ career_task: 15 }), api: apiModule({}), script: read });
        assert.deepEqual(errors, []);
        assert.match(result.text, /\+15 XP/);
        assert.doesNotMatch(result.text, /\+10 XP/);
    });

    test('before the rules have loaded it shows the usual amount, never +0', async () => {
        const { result, errors } = await screen({ entry: mission(null), api: apiModule({}), script: read });
        assert.deepEqual(errors, []);
        assert.match(result.text, /\+10 XP/);
    });

    test('the first mock interview promises what the rule pays', async () => {
        const { result, errors } = await screen({ entry: history({ mock_interview: 45 }), api: apiModule({ '/interview/sessions': { sessions: [] } }), script: read });
        assert.deepEqual(errors, []);
        assert.match(result.text, /earns 45 XP/);
    });
});
