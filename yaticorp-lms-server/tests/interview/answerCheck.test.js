const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { assess } = require('../../src/interview/answerCheck');

const usable = (t) => assess(t).usable;

describe('answers the interviewer cannot use', () => {
    test('keyboard mashing', () => {
        for (const t of ['asdfgh', 'hjkl hjkl', 'sdfsdf sdfsdf sdf', 'qwerty qwerty', 'jhgfjhgf kjhkjh', 'lkjhlkjh']) assert.equal(usable(t), false, t);
        assert.equal(assess('asdfgh').kind, 'gibberish');
    });
    test('one word repeated to fill the box', () => {
        for (const t of ['blah blah blah', 'test test test test', 'abc abc abc', 'aaaa bbbb aaaa']) assert.equal(usable(t), false, t);
    });
    test('nothing that reads as a word', () => {
        for (const t of ['....', '!!!!', '###', 'zzzz']) assert.equal(usable(t), false, t);
    });
    test('saying nothing rather than answering', () => {
        for (const t of ['idk', "I don't know", 'no idea', 'nothing', 'skip', 'pass', 'test', 'dummy', 'ok', 'whatever']) assert.equal(usable(t), false, t);
        assert.equal(assess('idk').kind, 'non-answer');
    });
    test('an empty submission', () => { assert.equal(usable(''), false); assert.equal(usable('   '), false); });
});

describe('answers it can', () => {
    test('a real sentence', () => {
        for (const t of [
            'I built a sales dashboard in Python that saved the team a day each week.',
            'My strongest skill is SQL because I use it daily for reporting.',
            'I would reproduce the bug, check the logs, then write a test.',
            'Yes, I have worked with React for two years now.'
        ]) assert.equal(usable(t), true, t);
    });
    test('a short answer is an answer — the interviewer follows it up instead', () => {
        for (const t of ['Python', 'Two years', '2019', 'Machine learning']) assert.equal(usable(t), true, t);
    });
    test('real but uncommon words are not mistaken for nonsense', () => {
        for (const t of ['Django Flask FastAPI Celery Redis', 'zomato swiggy flipkart paytm ola', 'Kubernetes, Docker and Terraform', 'Mangalore, Karnataka']) assert.equal(usable(t), true, t);
    });
});

describe('what the interviewer says', () => {
    test('a different, gentler line the second time', () => {
        const first = assess('asdfgh').message, second = assess('asdfgh', { attempt: 1 }).message;
        assert.match(first, /couldn't make sense/); assert.match(second, /still couldn't follow/);
        assert.notEqual(first, second);
        assert.equal(assess('asdfgh', { attempt: 5 }).message, second, 'never runs out of lines');
    });
    test('a non-answer is encouraged, not scolded', () => {
        assert.match(assess('idk').message, /have a go anyway/);
        assert.doesNotMatch(assess('idk').message, /wrong|incorrect|bad/i);
    });
    test('a usable answer carries no message', () => { const r = assess('I built a dashboard in Python.'); assert.equal(r.kind, 'ok'); assert.equal(r.message, ''); });
});

describe('an answer about something else', () => {
    const EDU_Q = 'Walk me through your education so far and what you enjoyed most about it.';
    const bg = (t, attempt = 0) => assess(t, { stage: 'background', question: EDU_Q, attempt });
    const project = (t) => assess(t, { stage: 'project', question: 'Tell me about your project. What was the goal, and what was your role?' });

    test('the education question answered with a job history is sent back', () => {
        const r = bg('I am working as a data analyst at Infosys and I handle client reports every week.');
        assert.equal(r.usable, false); assert.equal(r.kind, 'off-topic');
        assert.match(r.message, /work rather than your education/);
    });
    test('and the second time it is put differently', () => {
        const first = bg('I work at a company as an analyst and my salary is decided by my manager.', 0).message;
        const second = bg('I work at a company as an analyst and my salary is decided by my manager.', 1).message;
        assert.notEqual(first, second); assert.match(second, /tell me about your studies/i);
    });
    test('an answer about neither gets the plain line', () => {
        const r = bg('My father runs a shop and my brother lives in Bangalore with his family.');
        assert.equal(r.usable, false); assert.match(r.message, /I'd like to hear about your education/);
    });
    test('real education answers are left alone, however they are phrased', () => {
        for (const t of [
            'I did my B.E. in Computer Science at NMAM Institute and enjoyed databases the most.',
            'I finished my twelfth from a CBSE school and then joined engineering in Mangalore.',
            'I studied commerce, then taught myself programming through online material at home.',
            'I did an internship at a startup during the final year of my college course.',
            'My schooling was in Udupi and after that I took a diploma in electronics.'
        ]) assert.equal(bg(t).usable, true, t);
    });
    test('an answer that picks up the question\'s own words counts as engaging with it', () => {
        const r = assess('Python taught me to structure my code, and I use it every day now.', { stage: 'background', question: 'You completed Python Foundations. What did you take away from that?' });
        assert.equal(r.usable, true);
    });
    test('the project question is checked the same way', () => {
        assert.equal(project('I built a dashboard in Python that showed weekly revenue for the team.').usable, true);
        assert.equal(project('I enjoy cricket at the weekend and cooking with my family at home.').usable, false);
    });
    test('stages whose subject is not obvious are never checked for it', () => {
        const off = 'I am working as a data analyst at Infosys and I handle client reports every week.';
        for (const stage of ['intro', 'about', 'skills', 'technical', 'problem', 'behavioral', 'situational', 'candidate', '']) assert.equal(assess(off, { stage, question: EDU_Q }).usable, true, stage);
    });
    test('a short answer is never called off-topic — it gets the follow-up instead', () => {
        assert.equal(bg('At a company in Bangalore.').usable, true);
    });
});
