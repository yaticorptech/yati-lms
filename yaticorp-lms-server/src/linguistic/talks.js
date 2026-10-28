/**
 * Linguistic Ability — "Speak on a topic" (asked 2026-10-24: "advanced level
 * speaking: give the topic to the user, the user must speak about it, then
 * the grammar correction, sentence correction — in their learning road
 * map"). Each Advanced unit has one: a topic and what to cover; the student
 * speaks, the browser writes down what they say, and talkCheck.js corrects it
 * sentence by sentence. It is passed with enough words and most sentences
 * right (the level's pass mark); otherwise they look at the corrections and
 * speak again.
 *
 * Kept like a review lesson: a stub in the database (seedKey
 * "talk-advanced-1", "talk-advanced-1~2"; `review: 'talk'`, and the unit by
 * `order` and `part`), made whole here when served. English course only.
 */
const { keyOf } = require('./parts');

const MIN_WORDS = 70;

// Each Advanced unit's topic, by its topic (`order`) and unit (`part`). `kn`: the task in Kannada, for a Kannada speaker.
const TOPICS = [
    {
        order: 1, part: 1, title: 'Talk: teamwork',
        prompt: 'Talk about a time you worked in a team. What was the task, what was your part, and what did you learn?',
        points: ['Say what the task was and who was in the team.', 'Explain your own part in it.', 'Describe one problem the team faced and how you solved it.', 'End with what you learnt.'],
        words: ['collaborate', 'efficient', 'negotiate', 'feasible'],
        phrases: ['In my last project, …', 'My role was to …', 'One challenge we faced was …', 'What I learnt from this is …'],
        sample: 'Last semester, I worked with four classmates on a project about saving water in our college. My role was to collect data from the hostels and present it. At first, we did not agree on the plan, and two of us wanted to do everything alone. So we sat together, listed every task and shared them fairly. After that, we were much more efficient, and we collaborated well. We finished on time and our idea was used by the college. What I learnt is that a team works best when everyone knows their role and listens to the others.',
        kn: { prompt: 'ನೀವು ಒಂದು ತಂಡದಲ್ಲಿ ಕೆಲಸ ಮಾಡಿದ ಸಂದರ್ಭದ ಬಗ್ಗೆ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ. ಕೆಲಸ ಏನಾಗಿತ್ತು, ನಿಮ್ಮ ಪಾತ್ರ ಏನು, ಮತ್ತು ನೀವು ಏನು ಕಲಿತಿರಿ?', points: ['ಕೆಲಸ ಏನಾಗಿತ್ತು ಮತ್ತು ತಂಡದಲ್ಲಿ ಯಾರಿದ್ದರು ಎಂದು ಹೇಳಿ.', 'ಅದರಲ್ಲಿ ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ವಿವರಿಸಿ.', 'ತಂಡ ಎದುರಿಸಿದ ಒಂದು ಸಮಸ್ಯೆ ಮತ್ತು ಅದನ್ನು ಹೇಗೆ ಪರಿಹರಿಸಿದಿರಿ ಎಂದು ಹೇಳಿ.', 'ನೀವು ಕಲಿತದ್ದನ್ನು ಹೇಳಿ ಮುಗಿಸಿ.'] }
    },
    {
        order: 1, part: 2, title: 'Talk: make your case',
        prompt: 'Persuade your manager to let your team work from home one day a week. Give your reasons, and answer one worry they may have.',
        points: ['Say clearly what you are asking for.', 'Give two reasons, with an example.', 'Answer one worry your manager may have.', 'Finish with a short summary.'],
        words: ['persuade', 'prioritise', 'comprehensive', 'ambiguous'],
        phrases: ['I would like to suggest …', 'The main reason is …', 'You may be worried that …, but …', 'To sum up, …'],
        sample: 'I would like to persuade you to let our team work from home every Friday. The main reason is that we lose almost two hours a day in traffic, and we could use that time to work. Secondly, Friday is the day we write reports, which needs quiet, focused time, and we will prioritise urgent tasks on the other days. You may be worried that we will be hard to reach, but we will be online from nine to six and join every meeting by video. We can also try it for one month and then review the results. To sum up, I believe this will make the team happier and more productive.',
        kn: { prompt: 'ನಿಮ್ಮ ತಂಡಕ್ಕೆ ವಾರಕ್ಕೆ ಒಂದು ದಿನ ಮನೆಯಿಂದ ಕೆಲಸ ಮಾಡಲು ಅನುಮತಿ ನೀಡುವಂತೆ ನಿಮ್ಮ ಮ್ಯಾನೇಜರ್‌ರನ್ನು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಒಪ್ಪಿಸಿ. ಕಾರಣಗಳನ್ನು ನೀಡಿ, ಮತ್ತು ಅವರಿಗೆ ಇರಬಹುದಾದ ಒಂದು ಚಿಂತೆಗೆ ಉತ್ತರಿಸಿ.', points: ['ನೀವು ಏನು ಕೇಳುತ್ತಿದ್ದೀರಿ ಎಂದು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ.', 'ಉದಾಹರಣೆಯೊಂದಿಗೆ ಎರಡು ಕಾರಣಗಳನ್ನು ನೀಡಿ.', 'ನಿಮ್ಮ ಮ್ಯಾನೇಜರ್‌ಗೆ ಇರಬಹುದಾದ ಒಂದು ಚಿಂತೆಗೆ ಉತ್ತರಿಸಿ.', 'ಚಿಕ್ಕ ಸಾರಾಂಶದೊಂದಿಗೆ ಮುಗಿಸಿ.'] }
    },
    {
        order: 2, part: 1, title: 'Talk: technology and us',
        prompt: 'Is technology bringing people closer together, or pushing them apart? Give your opinion with two reasons and an example.',
        points: ['Give your opinion in the first sentence.', 'Explain two reasons.', 'Give an example from your own life.', 'Mention the other side, then conclude.'],
        words: ['perspective', 'consequence', 'inevitable', 'sustainable'],
        phrases: ['In my opinion, …', 'Firstly, … Secondly, …', 'For example, …', 'On the other hand, …'],
        sample: 'In my opinion, technology brings people closer, but only if we use it wisely. Firstly, it helps us stay in touch with family who live far away. For example, I talk to my cousin in Dubai on a video call every Sunday. Secondly, it lets students learn together online, whatever their city. On the other hand, many people spend hours on their phones and ignore the people next to them, and that has serious consequences. So from my perspective, technology is a tool: it connects us when we choose to use it for people, not instead of them.',
        kn: { prompt: 'ತಂತ್ರಜ್ಞಾನ ಜನರನ್ನು ಹತ್ತಿರ ತರುತ್ತಿದೆಯೇ, ಅಥವಾ ದೂರ ಮಾಡುತ್ತಿದೆಯೇ? ಎರಡು ಕಾರಣಗಳು ಮತ್ತು ಒಂದು ಉದಾಹರಣೆಯೊಂದಿಗೆ ನಿಮ್ಮ ಅಭಿಪ್ರಾಯವನ್ನು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಹೇಳಿ.', points: ['ಮೊದಲ ವಾಕ್ಯದಲ್ಲೇ ನಿಮ್ಮ ಅಭಿಪ್ರಾಯ ಹೇಳಿ.', 'ಎರಡು ಕಾರಣಗಳನ್ನು ವಿವರಿಸಿ.', 'ನಿಮ್ಮ ಜೀವನದಿಂದ ಒಂದು ಉದಾಹರಣೆ ನೀಡಿ.', 'ಇನ್ನೊಂದು ಕಡೆಯ ವಾದವನ್ನೂ ಹೇಳಿ, ನಂತರ ಮುಕ್ತಾಯಗೊಳಿಸಿ.'] }
    },
    {
        order: 2, part: 2, title: 'Talk: honesty',
        prompt: 'Why is honesty important at work and in everyday life? Give an example from your own life or from the news.',
        points: ['Say why honesty matters, in your own words.', 'Give one example at work or in college.', 'Give one example from everyday life or the news.', 'End with what you would do.'],
        words: ['integrity', 'advocate', 'substantial', 'diverse'],
        phrases: ['Honesty matters because …', 'A good example is …', 'If people were not honest, …', 'That is why I …'],
        sample: 'Honesty matters because trust is the base of every relationship, at work and at home. A good example is my first internship. I made a mistake in a report, and instead of hiding it, I told my manager. She thanked me, and we fixed it before the client saw it. If people were not honest, small mistakes would become big problems. In the news, we often read about companies that lost everything because they hid the truth. That is why I want to be known for my integrity, even when the truth is uncomfortable.',
        kn: { prompt: 'ಕೆಲಸದಲ್ಲಿ ಮತ್ತು ದಿನನಿತ್ಯದ ಜೀವನದಲ್ಲಿ ಪ್ರಾಮಾಣಿಕತೆ ಏಕೆ ಮುಖ್ಯ? ನಿಮ್ಮ ಜೀವನದಿಂದ ಅಥವಾ ಸುದ್ದಿಯಿಂದ ಒಂದು ಉದಾಹರಣೆಯೊಂದಿಗೆ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ.', points: ['ಪ್ರಾಮಾಣಿಕತೆ ಏಕೆ ಮುಖ್ಯ ಎಂದು ನಿಮ್ಮದೇ ಮಾತುಗಳಲ್ಲಿ ಹೇಳಿ.', 'ಕೆಲಸ ಅಥವಾ ಕಾಲೇಜಿನಿಂದ ಒಂದು ಉದಾಹರಣೆ ನೀಡಿ.', 'ದಿನನಿತ್ಯದ ಜೀವನ ಅಥವಾ ಸುದ್ದಿಯಿಂದ ಒಂದು ಉದಾಹರಣೆ ನೀಡಿ.', 'ನೀವು ಏನು ಮಾಡುತ್ತೀರಿ ಎಂದು ಹೇಳಿ ಮುಗಿಸಿ.'] }
    },
    {
        order: 3, part: 1, title: 'Talk: managing money',
        prompt: 'How should a college student manage their money each month? Give practical advice.',
        points: ['Say why it matters to plan money early.', 'Give two or three practical tips.', 'Say one mistake students often make.', 'End with your best piece of advice.'],
        words: ['budget', 'expense', 'afford', 'savings'],
        phrases: ['The first thing to do is …', 'Another good idea is …', 'A common mistake is …', 'If I had to give one piece of advice, …'],
        sample: 'Managing money in college is important, because the habits we build now stay with us. The first thing to do is to make a simple budget at the start of the month. Write down your fixed expenses, like the bus pass and the hostel mess, before anything else. Another good idea is to save a small amount, even two hundred rupees, as soon as you get your pocket money. A common mistake is buying things we cannot afford because our friends have them. If I had to give one piece of advice, it would be: track every rupee for one month, and you will know where to cut down.',
        kn: { prompt: 'ಕಾಲೇಜು ವಿದ್ಯಾರ್ಥಿಯೊಬ್ಬರು ಪ್ರತಿ ತಿಂಗಳು ತಮ್ಮ ಹಣವನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸಬೇಕು? ಪ್ರಾಯೋಗಿಕ ಸಲಹೆಗಳನ್ನು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ನೀಡಿ.', points: ['ಹಣವನ್ನು ಬೇಗನೆ ಯೋಜಿಸುವುದು ಏಕೆ ಮುಖ್ಯ ಎಂದು ಹೇಳಿ.', 'ಎರಡು ಅಥವಾ ಮೂರು ಪ್ರಾಯೋಗಿಕ ಸಲಹೆಗಳನ್ನು ನೀಡಿ.', 'ವಿದ್ಯಾರ್ಥಿಗಳು ಸಾಮಾನ್ಯವಾಗಿ ಮಾಡುವ ಒಂದು ತಪ್ಪನ್ನು ಹೇಳಿ.', 'ನಿಮ್ಮ ಅತ್ಯುತ್ತಮ ಸಲಹೆಯೊಂದಿಗೆ ಮುಗಿಸಿ.'] }
    },
    {
        order: 3, part: 2, title: 'Talk: business or a job?',
        prompt: 'Would you rather start your own business or work for a big company? Explain why, and talk about the risks.',
        points: ['Give your choice in the first sentence.', 'Give two reasons for it.', 'Talk about the risks, and how you would handle them.', 'Conclude in one or two sentences.'],
        words: ['invest', 'profit', 'risk', 'loan'],
        phrases: ['I would rather …, because …', 'One advantage is …', 'The biggest risk is …', 'If I …, I would …'],
        sample: 'I would rather work for a big company for a few years, and then start my own business. One advantage of a company is that I can learn how a business really works, with a regular salary. I can also save money to invest later, so I will not need a large loan. The biggest risk of starting a business too early is that there may be no profit for a long time. If I started my own company, I would begin small and test the idea with real customers first. So for me, a job is the first step, and a business is the goal.',
        kn: { prompt: 'ನೀವು ನಿಮ್ಮದೇ ವ್ಯಾಪಾರ ಆರಂಭಿಸಲು ಬಯಸುತ್ತೀರಾ, ಅಥವಾ ದೊಡ್ಡ ಕಂಪನಿಯಲ್ಲಿ ಕೆಲಸ ಮಾಡಲು ಬಯಸುತ್ತೀರಾ? ಏಕೆ ಎಂದು ವಿವರಿಸಿ, ಮತ್ತು ಅಪಾಯಗಳ ಬಗ್ಗೆ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ.', points: ['ಮೊದಲ ವಾಕ್ಯದಲ್ಲೇ ನಿಮ್ಮ ಆಯ್ಕೆ ಹೇಳಿ.', 'ಅದಕ್ಕೆ ಎರಡು ಕಾರಣಗಳನ್ನು ನೀಡಿ.', 'ಅಪಾಯಗಳ ಬಗ್ಗೆ ಮತ್ತು ಅವುಗಳನ್ನು ಹೇಗೆ ಎದುರಿಸುತ್ತೀರಿ ಎಂದು ಹೇಳಿ.', 'ಒಂದೆರಡು ವಾಕ್ಯಗಳಲ್ಲಿ ಮುಕ್ತಾಯಗೊಳಿಸಿ.'] }
    },
    {
        order: 4, part: 1, title: 'Talk: protecting our planet',
        prompt: 'What are the biggest environmental problems in your city or village, and what can young people do about them? Give examples.',
        points: ['Name one or two environmental problems near you.', 'Explain what causes them.', 'Suggest two things young people can do.', 'End with why it matters to you.'],
        words: ['pollution', 'climate', 'conserve', 'biodiversity'],
        phrases: ['One of the biggest problems is …', 'This is mainly caused by …', 'Young people can …', 'If we do nothing, …'],
        sample: 'One of the biggest problems in my city is pollution. The air is full of dust and smoke, and many of our lakes are covered with dirty foam. This is mainly caused by heavy traffic and by waste that is thrown into the water. The climate is also changing: summers are hotter, and the rain often comes at the wrong time. Young people can do a lot about this. First, we can conserve water and electricity at home and in college. Secondly, we can join groups that clean lakes and plant saplings, which also protects the biodiversity of our area. For example, last month, my friends and I helped to clean a lake near our college. If we do nothing, our children will never see the green city our grandparents knew. That is why I want to act now.',
        kn: { prompt: 'ನಿಮ್ಮ ನಗರ ಅಥವಾ ಹಳ್ಳಿಯಲ್ಲಿರುವ ಅತಿ ದೊಡ್ಡ ಪರಿಸರ ಸಮಸ್ಯೆಗಳು ಯಾವುವು, ಮತ್ತು ಯುವಜನರು ಅವುಗಳ ಬಗ್ಗೆ ಏನು ಮಾಡಬಹುದು? ಉದಾಹರಣೆಗಳೊಂದಿಗೆ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ.', points: ['ನಿಮ್ಮ ಸುತ್ತಮುತ್ತಲಿನ ಒಂದೆರಡು ಪರಿಸರ ಸಮಸ್ಯೆಗಳನ್ನು ಹೆಸರಿಸಿ.', 'ಅವುಗಳಿಗೆ ಕಾರಣ ಏನು ಎಂದು ವಿವರಿಸಿ.', 'ಯುವಜನರು ಮಾಡಬಹುದಾದ ಎರಡು ಕೆಲಸಗಳನ್ನು ಸೂಚಿಸಿ.', 'ಇದು ನಿಮಗೆ ಏಕೆ ಮುಖ್ಯ ಎಂದು ಹೇಳಿ ಮುಗಿಸಿ.'] }
    },
    {
        order: 4, part: 2, title: 'Talk: one change for my city',
        prompt: 'If you could make one change to make your city greener, what would it be? Explain how it would work and why it would help.',
        points: ['Say clearly what your change is.', 'Explain how it would work, step by step.', 'Give two ways it would help people or nature.', 'Answer one problem it may face, then conclude.'],
        words: ['renewable', 'recycle', 'emission', 'drought'],
        phrases: ['If I could change one thing, …', 'It would work like this: …', 'This would help because …', 'Some people may say …, but …'],
        sample: 'If I could change one thing in my city, I would put solar panels on every government building. It would work like this: the panels would be paid for by the city, and the electricity would be used in offices, schools and hospitals. This would help in two ways. Firstly, renewable energy from the sun would cut the emissions from power plants, so the air would be cleaner. Secondly, the money that is saved could be used to build rainwater tanks, which would help us during a drought. I would also ask every office to recycle its paper and plastic. Some people may say that solar panels are too expensive, but they pay for themselves in a few years. So I believe this one change would make a real difference.',
        kn: { prompt: 'ನಿಮ್ಮ ನಗರವನ್ನು ಹೆಚ್ಚು ಹಸಿರಾಗಿಸಲು ನೀವು ಒಂದು ಬದಲಾವಣೆ ಮಾಡಬಹುದಾದರೆ, ಅದು ಏನಾಗಿರುತ್ತದೆ? ಅದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಮತ್ತು ಏಕೆ ಸಹಾಯವಾಗುತ್ತದೆ ಎಂದು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ವಿವರಿಸಿ.', points: ['ನಿಮ್ಮ ಬದಲಾವಣೆ ಏನು ಎಂದು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ.', 'ಅದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಎಂದು ಹಂತ ಹಂತವಾಗಿ ವಿವರಿಸಿ.', 'ಅದು ಜನರಿಗೆ ಅಥವಾ ಪ್ರಕೃತಿಗೆ ಸಹಾಯ ಮಾಡುವ ಎರಡು ರೀತಿಗಳನ್ನು ಹೇಳಿ.', 'ಅದು ಎದುರಿಸಬಹುದಾದ ಒಂದು ಸಮಸ್ಯೆಗೆ ಉತ್ತರಿಸಿ, ನಂತರ ಮುಕ್ತಾಯಗೊಳಿಸಿ.'] }
    }
];

const SUMMARY = 'Speak about a topic. Your sentences are corrected, with the reason for each correction.';
const seedKeyOf = (t) => `talk-advanced-${t.order}${keyOf(t.part)}`;
const topicOf = (stub) => TOPICS.find((t) => t.order === (Number(stub.order) || 1) && t.part === (Number(stub.part) || 1)) || null;

/** The stubs, one per Advanced unit, in the English course. */
const stubs = () => TOPICS.map((t) => ({
    seedKey: seedKeyOf(t), course: null, review: 'talk', module: 'speaking', level: 'advanced', order: t.order, part: t.part,
    title: t.title, summary: SUMMARY, status: 'published', updatedBy: 'Course content', direction: null, learn: {}
}));

/** The stub made whole, for a student whose own language is `helper`: the task (in Kannada for a Kannada speaker). */
const build = (stub, helper) => {
    const t = topicOf(stub);
    if (!t) return { ...stub, talk: null };
    const own = helper === 'kn' ? t.kn : null;
    return {
        ...stub, language: helper, languageName: require('./languages').infoOf(helper).name,
        learn: {
            intro: helper === 'kn'
                ? 'ವಿಷಯವನ್ನು ಓದಿ, ಏನು ಹೇಳಬೇಕೆಂದು ಯೋಜಿಸಿ. ನಂತರ ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿ ಸುಮಾರು ಒಂದು ನಿಮಿಷ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ. ನೀವು ಮಾತನಾಡುತ್ತಿದ್ದಂತೆ ನಿಮ್ಮ ಮಾತುಗಳು ಕಾಣಿಸುತ್ತವೆ; ಮೈಕ್ರೊಫೋನ್ ತಪ್ಪಾಗಿ ಕೇಳಿದ ಪದಗಳನ್ನು ಸರಿಪಡಿಸಿ. ನಂತರ ಪರಿಶೀಲಿಸಿ: ನಿಮ್ಮ ಪ್ರತಿ ವಾಕ್ಯದ ತಿದ್ದುಪಡಿ ಮತ್ತು ಅದರ ಕಾರಣ ಕಾಣಿಸುತ್ತದೆ.'
                : 'Read the topic and plan what to say. Then tap the microphone and speak for about a minute. Your words appear as you speak; fix any the microphone heard wrong. Then check your talk: each sentence is corrected, with the reason.'
        },
        talk: {
            prompt: own?.prompt || t.prompt, promptEn: own ? t.prompt : undefined,
            points: own?.points || t.points, words: t.words, phrases: t.phrases, minWords: MIN_WORDS, sample: t.sample
        }
    };
};

module.exports = { TOPICS, MIN_WORDS, stubs, build, topicOf };
