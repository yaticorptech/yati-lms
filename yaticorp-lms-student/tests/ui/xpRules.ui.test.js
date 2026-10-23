/**
 * The XP a page promises is the admin's rule, not a number of its own.
 * Career Path printed "+10 XP" and Interview Ready "earns 30 XP" as fixed
 * text, so an admin who changed the rules under Rewards → Reward rules saw
 * the student pages go on promising the old amounts. Here the rewards summary
 * carries rules of 15 and 45, and the pages say 15 and 45.
 *
 * And with no rulebook — Rewards locked, when nothing is paid, or not loaded
 * yet — no amount is promised at all. useXpRule used to fill in built-in
 * defaults there, so a locked Rewards still read "earns 30 XP".
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const withRules = (rules, body, imports, enabled = true) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
${imports}
const value = { enabled: ${enabled}, summary: ${rules ? `{ xpRules: ${JSON.stringify(rules)} }` : 'null'}, refresh: () => {}, celebrate: () => {}, pullEvents: () => {} };
createRoot(document.getElementById('root')).render(
  <RewardsContext.Provider value={value}><MemoryRouter>${body}</MemoryRouter></RewardsContext.Provider>);`;

const mission = (rules) => withRules(rules, '<CurrentMission completedToday={0} totalToday={2} />', `import CurrentMission from '${srcFile('career/components/journey/CurrentMission.jsx')}';`);
const history = (rules, enabled = true) => withRules(rules, '<InterviewHistory />', `import InterviewHistory from '${srcFile('interview/InterviewHistory.jsx')}';`, enabled);
const read = `await sleep(800); return { text: document.body.innerText.replace(/\\s+/g, ' ') };`;

describe('XP amounts come from the admin rules', { skip: skipWithoutChrome }, () => {
    test("today's quest promises what a task pays under the rules", async () => {
        const { result, errors } = await screen({ entry: mission({ career_task: 15 }), api: apiModule({}), script: read });
        assert.deepEqual(errors, []);
        assert.match(result.text, /\+15 XP/);
        assert.doesNotMatch(result.text, /\+10 XP/);
    });

    test('before the rules have loaded it promises no amount — not +0, and not a made-up default', async () => {
        const { result, errors } = await screen({ entry: mission(null), api: apiModule({}), script: read });
        assert.deepEqual(errors, []);
        // No chip at all: "+ XP" with the number missing is no better.
        assert.doesNotMatch(result.text, /\+\s*\d*\s*XP/);
        assert.doesNotMatch(result.text, /null|NaN|undefined/);
    });

    test('the first mock interview promises what the rule pays', async () => {
        const { result, errors } = await screen({ entry: history({ mock_interview: 45 }), api: apiModule({ '/interview/sessions': { sessions: [] } }), script: read });
        assert.deepEqual(errors, []);
        assert.match(result.text, /earns 45 XP/);
    });

    test('with Rewards locked the first mock interview promises no XP', async () => {
        const { result, errors } = await screen({ entry: history({ mock_interview: 45 }, false), api: apiModule({ '/interview/sessions': { sessions: [] } }), script: read });
        assert.deepEqual(errors, []);
        assert.match(result.text, /takes about ten minutes\./);
        assert.doesNotMatch(result.text, /earns|XP/);
    });

    test('a rule of 0 promises nothing either', async () => {
        const { result, errors } = await screen({ entry: history({ mock_interview: 0 }), api: apiModule({ '/interview/sessions': { sessions: [] } }), script: read });
        assert.deepEqual(errors, []);
        assert.doesNotMatch(result.text, /earns|\b0 XP/);
    });
});
