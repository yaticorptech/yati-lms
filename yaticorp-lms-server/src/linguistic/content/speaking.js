/**
 * Linguistic Ability — Speaking and Listening lessons (seed content).
 *
 * learn.dialogue: a conversation to listen to, line by line. Every seeded line
 * has a recording in the server's public/linguistic/audio folder, made on this
 * machine with the computer's own voices (scripts/makeLinguisticAudio.js);
 * an administrator can upload their own recording instead.
 * quiz: listening comprehension questions on the conversation.
 * speaking: what to say aloud, a sample answer and a self-assessment checklist.
 * The student records themselves in the browser and plays it back; nothing
 * scores pronunciation automatically.
 */
const mcq = (id, prompt, options, answer, explanation) => ({ id, type: 'mcq', prompt, options, answer, explanation });
// The line's recording, by lesson and position.
const audio = (key, i) => `/linguistic/audio/${key}-${i + 1}.m4a`;
const dialogue = (key, scenario, speakers, lines) => ({
    scenario, speakers,
    lines: lines.map(([speaker, text], i) => ({ speaker, text, audio: audio(key, i) }))
});

module.exports = [
    {
        seedKey: 'speaking-beginner-1', module: 'speaking', level: 'beginner', order: 1,
        title: 'Introducing yourself',
        summary: 'Two new students meet on their first day at college.',
        learn: {
            intro: 'Listen to the conversation. Then listen again and read along.',
            dialogue: dialogue('speaking-beginner-1', 'First day of college: Rahul meets Meera.', [{ name: 'Rahul', voice: 'm' }, { name: 'Meera', voice: 'f' }], [
                ['Rahul', 'Hi! I\'m Rahul. Is this the first-year BCom class?'],
                ['Meera', 'Yes, it is. Hello Rahul, I\'m Meera. Nice to meet you.'],
                ['Rahul', 'Nice to meet you too. Where are you from?'],
                ['Meera', 'I\'m from Udupi. And you?'],
                ['Rahul', 'I\'m from Davanagere. I live in the college hostel now.'],
                ['Meera', 'Oh, that\'s nice. What do you like to do in your free time?'],
                ['Rahul', 'I like playing cricket and listening to music. What about you?'],
                ['Meera', 'I love reading stories and drawing.'],
                ['Rahul', 'Great! Let\'s sit together.']
            ]),
            phrases: ['Nice to meet you.', 'Where are you from?', 'What do you like to do in your free time?']
        },
        quiz: [
            mcq('q1', 'Where is Meera from?', ['Udupi', 'Davanagere', 'Mysuru', 'Hubballi'], 'Udupi', 'Meera says: "I\'m from Udupi."'),
            mcq('q2', 'Where does Rahul live now?', ['In the college hostel', 'With his uncle', 'At home', 'In a rented flat'], 'In the college hostel', 'Rahul says he lives in the college hostel now.'),
            mcq('q3', 'What does Rahul like to do in his free time?', ['Play cricket and listen to music', 'Read stories', 'Draw pictures', 'Cook food'], 'Play cricket and listen to music', 'He says: "I like playing cricket and listening to music."'),
            mcq('q4', 'Which class are they in?', ['First-year BCom', 'Second-year BSc', 'Final-year BA', 'Class 10'], 'First-year BCom', 'Rahul asks: "Is this the first-year BCom class?" and Meera says yes.')
        ],
        speaking: {
            prompt: 'Introduce yourself in 4 or 5 sentences: your name, where you are from, what you study, and one hobby.',
            sample: 'Hello, my name is Kiran. I am from Tumakuru. I am studying in the first year of BSc. In my free time, I like playing football. Nice to meet you.',
            checklist: ['I said my name clearly', 'I said where I am from', 'I talked about my studies', 'I mentioned a hobby', 'I spoke in full sentences', 'I spoke slowly and clearly']
        }
    },
    {
        seedKey: 'speaking-beginner-2', module: 'speaking', level: 'beginner', order: 2,
        title: 'At the vegetable shop',
        summary: 'Asking prices and buying vegetables.',
        learn: {
            intro: 'Listen to how Lakshmi asks for prices and pays.',
            dialogue: dialogue('speaking-beginner-2', 'Shopping: Lakshmi buys vegetables from Ramesh.', [{ name: 'Lakshmi', voice: 'f' }, { name: 'Ramesh', voice: 'm' }], [
                ['Lakshmi', 'Good morning. How much are the tomatoes?'],
                ['Ramesh', 'Good morning, madam. Tomatoes are forty rupees a kilo.'],
                ['Lakshmi', 'And the onions?'],
                ['Ramesh', 'Onions are thirty rupees a kilo.'],
                ['Lakshmi', 'Please give me one kilo of tomatoes and half a kilo of onions.'],
                ['Ramesh', 'Sure. Anything else?'],
                ['Lakshmi', 'Do you have fresh coriander?'],
                ['Ramesh', 'Yes. One bunch is ten rupees.'],
                ['Lakshmi', 'I\'ll take one bunch. How much is it altogether?'],
                ['Ramesh', 'Forty, plus fifteen, plus ten. That\'s sixty-five rupees.'],
                ['Lakshmi', 'Here you are. Thank you!'],
                ['Ramesh', 'Thank you, madam. Have a nice day.']
            ]),
            phrases: ['How much is this?', 'Please give me…', 'How much is it altogether?']
        },
        quiz: [
            mcq('q1', 'How much is one kilo of tomatoes?', ['₹40', '₹30', '₹10', '₹65'], '₹40', '"Tomatoes are forty rupees a kilo."'),
            mcq('q2', 'How many onions does Lakshmi buy?', ['Half a kilo', 'One kilo', 'Two kilos', 'None'], 'Half a kilo', 'She asks for "half a kilo of onions".'),
            mcq('q3', 'How much does she pay altogether?', ['₹65', '₹80', '₹55', '₹40'], '₹65', '40 + 15 + 10 = 65 rupees.'),
            mcq('q4', 'What else does she buy?', ['A bunch of coriander', 'Potatoes', 'Bananas', 'Rice'], 'A bunch of coriander', '"I\'ll take one bunch."')
        ],
        speaking: {
            prompt: 'Imagine you are at a shop. Ask the price of two things, buy them, and say thank you.',
            sample: 'Good evening. How much is this notebook? And how much is that pen? Please give me two notebooks and one pen. How much is it altogether? Here you are. Thank you!',
            checklist: ['I greeted the shopkeeper', 'I asked the price of two things', 'I said what I wanted to buy', 'I asked for the total', 'I said thank you']
        }
    },
    {
        seedKey: 'speaking-intermediate-1', module: 'speaking', level: 'intermediate', order: 1,
        title: 'Asking a classmate for notes',
        summary: 'A college conversation about a missed class and a test.',
        learn: {
            intro: 'Listen for how Arjun makes a polite request.',
            dialogue: dialogue('speaking-intermediate-1', 'College: Arjun missed a class and talks to Divya.', [{ name: 'Arjun', voice: 'm' }, { name: 'Divya', voice: 'f' }], [
                ['Arjun', 'Hey Divya, do you have a minute?'],
                ['Divya', 'Sure, Arjun. What\'s up?'],
                ['Arjun', 'I missed yesterday\'s physics class because I had a fever. Could you share your notes with me?'],
                ['Divya', 'Of course. I hope you\'re feeling better now.'],
                ['Arjun', 'Yes, much better, thanks. Did the professor say anything about the test?'],
                ['Divya', 'Yes. The internal test is next Thursday, and it covers chapters three and four.'],
                ['Arjun', 'Next Thursday? That\'s soon. I\'d better start revising today.'],
                ['Divya', 'If you like, we can study together in the library after class.'],
                ['Arjun', 'That would be great. Thanks a lot, Divya!']
            ]),
            phrases: ['Do you have a minute?', 'Could you share…?', 'That would be great.']
        },
        quiz: [
            mcq('q1', 'Why did Arjun miss the class?', ['He had a fever', 'He was travelling', 'He forgot', 'He was at a match'], 'He had a fever', '"I missed yesterday\'s physics class because I had a fever."'),
            mcq('q2', 'When is the internal test?', ['Next Thursday', 'Tomorrow', 'Next month', 'Next Monday'], 'Next Thursday', 'Divya says the test is next Thursday.'),
            mcq('q3', 'Which chapters does the test cover?', ['Chapters three and four', 'Chapters one and two', 'Only chapter five', 'All the chapters'], 'Chapters three and four', '"…it covers chapters three and four."'),
            mcq('q4', 'What does Divya suggest?', ['Studying together in the library', 'Skipping the test', 'Asking to cancel the test', 'Buying a new book'], 'Studying together in the library', '"We can study together in the library after class."')
        ],
        speaking: {
            prompt: 'Ask a classmate politely for help with something you missed. Use "Could you…?" and thank them.',
            sample: 'Hi Sanjana, do you have a minute? I couldn\'t attend the chemistry lab on Monday because I was unwell. Could you tell me what the experiment was and lend me your record book? Thank you so much, that really helps.',
            checklist: ['I started politely', 'I explained why I needed help', 'I used "Could you…?"', 'I thanked my classmate', 'My voice sounded friendly']
        }
    },
    {
        seedKey: 'speaking-intermediate-2', module: 'speaking', level: 'intermediate', order: 2,
        title: 'First day at the office',
        summary: 'Meeting your manager and a colleague at a new job.',
        learn: {
            intro: 'Listen to how Priya greets people and asks questions on her first day.',
            dialogue: dialogue('speaking-intermediate-2', 'Workplace: Priya joins a new office.', [{ name: 'Mr Shetty', voice: 'm' }, { name: 'Priya', voice: 'f' }, { name: 'Kiran', voice: 'm' }], [
                ['Mr Shetty', 'Good morning, Priya. Welcome to the team!'],
                ['Priya', 'Good morning, sir. Thank you. I\'m excited to start.'],
                ['Mr Shetty', 'Let me introduce you to Kiran. He will help you settle in.'],
                ['Kiran', 'Hi Priya, nice to meet you. Here\'s your laptop and your ID card.'],
                ['Priya', 'Thank you, Kiran. What time do we usually start work?'],
                ['Kiran', 'We start at nine thirty, and there\'s a short team meeting every morning at ten.'],
                ['Priya', 'Okay. Who should I ask if I have a problem with the software?'],
                ['Kiran', 'You can email the IT helpdesk, or just ask me. I\'m happy to help.'],
                ['Priya', 'That\'s very kind of you. I\'ll do my best.']
            ]),
            phrases: ['Welcome to the team!', 'Let me introduce you to…', 'Who should I ask if…?']
        },
        quiz: [
            mcq('q1', 'Who will help Priya settle in?', ['Kiran', 'Mr Shetty', 'The IT helpdesk', 'Nobody'], 'Kiran', '"He will help you settle in."'),
            mcq('q2', 'What time does work start?', ['9:30', '10:00', '9:00', '8:30'], '9:30', '"We start at nine thirty."'),
            mcq('q3', 'When is the team meeting?', ['Every morning at ten', 'Every evening', 'Once a week', 'Only on Mondays'], 'Every morning at ten', '"…a short team meeting every morning at ten."'),
            mcq('q4', 'What can Priya do if she has a software problem?', ['Email the IT helpdesk or ask Kiran', 'Go home', 'Buy a new laptop', 'Wait a week'], 'Email the IT helpdesk or ask Kiran', 'Kiran gives her both options.')
        ],
        speaking: {
            prompt: 'Imagine it is your first day at a new job. Greet your manager, introduce yourself, and ask one question about the work.',
            sample: 'Good morning, ma\'am. I\'m Rohan, the new trainee in the accounts team. Thank you for having me. Could you tell me which project I will be working on first?',
            checklist: ['I greeted my manager', 'I said my name and role', 'I thanked them', 'I asked one clear question', 'I sounded polite and confident']
        }
    },
    {
        seedKey: 'speaking-advanced-1', module: 'speaking', level: 'advanced', order: 1,
        title: 'The job interview',
        summary: 'A candidate answers common interview questions.',
        learn: {
            intro: 'Listen to how Nikhil answers each question with a clear point and an example.',
            dialogue: dialogue('speaking-advanced-1', 'Interview: Nikhil applies for a software job.', [{ name: 'Interviewer', voice: 'f' }, { name: 'Nikhil', voice: 'm' }], [
                ['Interviewer', 'Good afternoon. Please have a seat. Could you tell me a little about yourself?'],
                ['Nikhil', 'Good afternoon. Thank you. I\'m Nikhil, and I recently completed my engineering degree in computer science in Mangaluru. In my final year, I built a mobile app that helps farmers check crop prices.'],
                ['Interviewer', 'That sounds interesting. What was your role in that project?'],
                ['Nikhil', 'I led a team of three. I designed the database and handled the testing. We had to finish in two months, so I planned our work week by week.'],
                ['Interviewer', 'What would you say is your biggest strength?'],
                ['Nikhil', 'I\'m a quick learner. When I joined the project, I knew very little about app development, but I learned it through online courses within a few weeks.'],
                ['Interviewer', 'And a weakness?'],
                ['Nikhil', 'I sometimes spend too long on small details. I\'m working on it by setting a time limit for each task.'],
                ['Interviewer', 'Thank you, Nikhil. Do you have any questions for us?'],
                ['Nikhil', 'Yes. Could you tell me what a typical day looks like for someone in this role?']
            ]),
            phrases: ['Could you tell me a little about yourself?', 'I led a team of…', 'I\'m working on it by…']
        },
        quiz: [
            mcq('q1', 'What did Nikhil build in his final year?', ['A mobile app for farmers to check crop prices', 'A college website', 'A game', 'A robot'], 'A mobile app for farmers to check crop prices', 'He describes the app in his first answer.'),
            mcq('q2', 'What was his role in the project?', ['He led the team, designed the database and handled testing', 'He only did the design', 'He was not in the team', 'He did the marketing'], 'He led the team, designed the database and handled testing', 'This is his second answer.'),
            mcq('q3', 'Which strength does he mention?', ['He is a quick learner', 'He never makes mistakes', 'He likes working alone', 'He is the best coder'], 'He is a quick learner', '"I\'m a quick learner."'),
            mcq('q4', 'How is he working on his weakness?', ['By setting a time limit for each task', 'By working at night', 'By ignoring details', 'By asking others to do it'], 'By setting a time limit for each task', 'He sets a time limit for each task.'),
            mcq('q5', 'Why is his final question a good one?', ['It shows interest in the role', 'It asks about salary first', 'It is about holidays', 'It is a joke'], 'It shows interest in the role', 'Asking about a typical day shows he wants to understand the job.')
        ],
        speaking: {
            prompt: 'Answer "Tell me about yourself" in about one minute: your education, one project or achievement, and what you want to do next.',
            sample: 'Thank you for the opportunity. I\'m Ananya, and I have just completed my BCom at a college in Hassan. During my course, I managed the accounts for our college fest, which handled a budget of two lakh rupees. That experience showed me how much I enjoy working with numbers and people. I am now looking for a role in finance where I can keep learning and grow with the team.',
            checklist: ['I spoke about my education', 'I gave one real example or achievement', 'I said what I want to do next', 'I kept it to about one minute', 'I avoided filler words like "umm"', 'I sounded confident']
        }
    },
    {
        seedKey: 'speaking-advanced-2', module: 'speaking', level: 'advanced', order: 2,
        title: 'Handling a customer complaint',
        summary: 'A help-desk call: listening, apologising and solving the problem.',
        learn: {
            intro: 'Listen to how Ananya stays calm, apologises and offers a clear solution.',
            dialogue: dialogue('speaking-advanced-2', 'Workplace communication: a customer calls a help desk.', [{ name: 'Ananya', voice: 'f' }, { name: 'Mr Rao', voice: 'm' }], [
                ['Ananya', 'Good morning, thank you for calling QuickBuy. This is Ananya. How may I help you?'],
                ['Mr Rao', 'Good morning. I ordered a pair of shoes last week, but I received the wrong size.'],
                ['Ananya', 'I\'m sorry to hear that, sir. Could you please give me your order number?'],
                ['Mr Rao', 'Yes, it\'s four five two eight one.'],
                ['Ananya', 'Thank you. I can see that you ordered size nine, but size eight was sent. I apologise for the mistake.'],
                ['Mr Rao', 'I need them for a wedding this Sunday. Can you fix this quickly?'],
                ['Ananya', 'Certainly. I\'ll arrange a free exchange today. Our delivery partner will bring size nine and collect the wrong pair by Friday.'],
                ['Mr Rao', 'That\'s a relief. Thank you.'],
                ['Ananya', 'You\'re welcome. Is there anything else I can help you with?'],
                ['Mr Rao', 'No, that\'s all. Thanks for your help.'],
                ['Ananya', 'Thank you for your patience, sir. Have a great day.']
            ]),
            phrases: ['How may I help you?', 'I apologise for the mistake.', 'Is there anything else I can help you with?']
        },
        quiz: [
            mcq('q1', 'What was the customer\'s problem?', ['He received the wrong size', 'The shoes were late', 'The shoes were broken', 'He was charged twice'], 'He received the wrong size', '"…I received the wrong size."'),
            mcq('q2', 'What size did he order?', ['Nine', 'Eight', 'Ten', 'Seven'], 'Nine', '"…you ordered size nine, but size eight was sent."'),
            mcq('q3', 'When will the new pair arrive?', ['By Friday', 'Next week', 'On Sunday', 'This evening'], 'By Friday', '"…bring size nine and collect the wrong pair by Friday."'),
            mcq('q4', 'Which phrase shows the agent being polite?', ['"I apologise for the mistake."', '"That\'s not my problem."', '"Call later."', '"You chose wrong."'], '"I apologise for the mistake."', 'An apology shows respect for the customer.'),
            mcq('q5', 'Why does the customer need the shoes quickly?', ['For a wedding this Sunday', 'For a job interview', 'For a trip abroad', 'For school'], 'For a wedding this Sunday', 'He says he needs them for a wedding this Sunday.')
        ],
        speaking: {
            prompt: 'You work at a help desk. A customer says their order is late. Apologise, ask for the details, and offer a solution.',
            sample: 'Good afternoon, thank you for calling. I\'m sorry your order hasn\'t arrived yet. Could you please share your order number? Thank you. I can see it was delayed at our warehouse. I\'ll send it by express delivery today, and you will receive it by tomorrow evening. Is there anything else I can help you with?',
            checklist: ['I greeted the customer', 'I apologised', 'I asked for the details', 'I offered a clear solution with a time', 'I asked "Is there anything else?"', 'My tone stayed calm and polite']
        }
    }
];
