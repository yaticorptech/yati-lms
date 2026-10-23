/**
 * Linguistic Ability — Reading and Writing lessons (seed content).
 *
 * learn:    the passage or story to read
 * quiz:     comprehension questions on it (scored)
 * writing:  practice tasks, each with a model answer
 *   jumbled    words[] to put in order; checked against answer / accepted
 *   sentence   make one sentence with mustInclude words; rule-checked
 *   paragraph, email, letter
 *              open-ended: rule-based feedback (writingCheck.js), the model
 *              answer to compare with, and a copy sent for teacher review
 */
const mcq = (id, prompt, options, answer, explanation) => ({ id, type: 'mcq', prompt, options, answer, explanation });

module.exports = [
    {
        seedKey: 'reading-beginner-1', module: 'reading', level: 'beginner', order: 1,
        title: 'My Morning',
        summary: 'A short passage about a student\'s morning routine.',
        learn: {
            intro: 'Read the passage slowly. Then answer the questions.',
            passage: {
                title: 'My Morning',
                text: 'My name is Kavya. I live in Hubballi with my parents and my little brother. Every day, I wake up at six o\'clock. I brush my teeth and drink a glass of milk. Then I help my mother in the kitchen. At eight o\'clock, I take the bus to college. My best friend, Sneha, sits next to me on the bus. We talk about our classes and laugh a lot. I love my mornings because they are busy and happy.'
            }
        },
        quiz: [
            mcq('q1', 'Where does Kavya live?', ['Hubballi', 'Mysuru', 'Mangaluru', 'Belagavi'], 'Hubballi', 'The passage says: "I live in Hubballi."'),
            mcq('q2', 'What time does Kavya wake up?', ['At six o\'clock', 'At seven o\'clock', 'At eight o\'clock', 'At five o\'clock'], 'At six o\'clock', '"Every day, I wake up at six o\'clock."'),
            mcq('q3', 'How does Kavya go to college?', ['By bus', 'By bike', 'On foot', 'By train'], 'By bus', '"I take the bus to college."'),
            mcq('q4', 'Who is Sneha?', ['Kavya\'s best friend', 'Kavya\'s sister', 'Kavya\'s teacher', 'Kavya\'s mother'], 'Kavya\'s best friend', '"My best friend, Sneha, sits next to me."'),
            mcq('q5', 'Does Kavya like her mornings?', ['Yes, she loves them', 'No, she does not', 'She does not say'], 'Yes, she loves them', '"I love my mornings because they are busy and happy."')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['up', 'I', 'at', 'wake', 'six o\'clock'], answer: 'I wake up at six o\'clock.', model: 'I wake up at six o\'clock.' },
            { id: 'w2', type: 'jumbled', prompt: 'Put the words in order.', words: ['next to', 'sits', 'My friend', 'me'], answer: 'My friend sits next to me.', model: 'My friend sits next to me.' },
            { id: 'w3', type: 'sentence', prompt: 'Make one sentence with the word "happy".', mustInclude: ['happy'], minWords: 4, model: 'I feel happy when I play with my brother.' },
            { id: 'w4', type: 'paragraph', prompt: 'Write 4 or 5 sentences about your morning routine.', minWords: 30, model: 'I wake up at half past six every day. First, I brush my teeth and have a bath. Then I eat breakfast with my family. After that, I pack my bag and walk to college. I like my mornings because they help me start the day well.', checklist: ['Each sentence starts with a capital letter', 'I used time words like first, then and after that', 'Each sentence ends with a full stop'] }
        ]
    },
    {
        seedKey: 'reading-beginner-2', module: 'reading', level: 'beginner', order: 2,
        title: 'The Kind Shopkeeper',
        summary: 'A short story about kindness in a village shop.',
        learn: {
            intro: 'Read the story. Think about what kind of person Raju is.',
            passage: {
                title: 'The Kind Shopkeeper',
                text: 'Raju has a small shop in a village. He sells rice, sugar, soap and biscuits. One evening, an old woman came to his shop. She wanted to buy rice, but she did not have enough money. Raju smiled and gave her the rice. "You can pay me later," he said. The next week, the old woman came back with the money and a basket of fresh vegetables from her garden. "Thank you for your kindness," she said. Raju was very happy.'
            }
        },
        quiz: [
            mcq('q1', 'What does Raju sell?', ['Rice, sugar, soap and biscuits', 'Clothes and shoes', 'Books and pens', 'Only fruits'], 'Rice, sugar, soap and biscuits', '"He sells rice, sugar, soap and biscuits."'),
            mcq('q2', 'Why could the old woman not buy the rice at first?', ['She did not have enough money', 'The shop was closed', 'Raju had no rice', 'She forgot her bag'], 'She did not have enough money', '"She did not have enough money."'),
            mcq('q3', 'What did Raju say to her?', ['"You can pay me later."', '"Please go away."', '"The rice is finished."', '"Come back tomorrow."'], '"You can pay me later."', 'He trusted her to pay later.'),
            mcq('q4', 'What did the woman bring the next week?', ['The money and fresh vegetables', 'Only flowers', 'A new bag', 'Nothing'], 'The money and fresh vegetables', 'She paid him and thanked him with vegetables from her garden.'),
            mcq('q5', 'Which word best describes Raju?', ['Kind', 'Angry', 'Lazy', 'Rude'], 'Kind', 'He helped the old woman even when she could not pay.')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['a', 'Raju', 'shop', 'has', 'small'], answer: 'Raju has a small shop.', model: 'Raju has a small shop.' },
            { id: 'w2', type: 'sentence', prompt: 'Make one sentence with the word "kind".', mustInclude: ['kind'], minWords: 4, model: 'My grandmother is very kind to everyone.' },
            { id: 'w3', type: 'paragraph', prompt: 'Write a short message (3 or 4 sentences) to thank a friend who helped you.', minWords: 20, model: 'Dear Meena, thank you for helping me with my project yesterday. Your ideas were very useful. I could finish it on time because of you. You are a true friend.', checklist: ['I said thank you clearly', 'I said what my friend did', 'I ended in a friendly way'] }
        ]
    },
    {
        seedKey: 'reading-intermediate-1', module: 'reading', level: 'intermediate', order: 1,
        title: 'Every Drop Counts',
        summary: 'An article about saving water at home and in college.',
        learn: {
            intro: 'Read the article. Look for the main idea and the facts that support it.',
            passage: {
                title: 'Every Drop Counts',
                text: 'Water is one of our most precious resources, yet many people waste it without thinking. In many Indian cities, families depend on water tankers in the summer because the groundwater level has gone down. Small habits can make a big difference. Turning off the tap while brushing your teeth can save up to six litres of water every time. Fixing a leaking tap quickly is also important, because a single dripping tap can waste thousands of litres in a year. Many schools and colleges now collect rainwater from their rooftops and store it underground. This practice, called rainwater harvesting, helps to refill the groundwater. If every family saves a little water each day, our towns will have enough water for the future.'
            }
        },
        quiz: [
            mcq('q1', 'Why do some families depend on water tankers in summer?', ['The groundwater level has gone down', 'Tanker water is cheaper', 'Taps are not allowed', 'It rains too much'], 'The groundwater level has gone down', 'The passage gives this as the reason.'),
            mcq('q2', 'How much water can you save by turning off the tap while brushing?', ['Up to six litres', 'Up to sixty litres', 'One glass', 'Nothing'], 'Up to six litres', '"…can save up to six litres of water every time."'),
            mcq('q3', 'What is rainwater harvesting?', ['Collecting and storing rainwater', 'Buying water from tankers', 'Fixing leaking taps', 'Washing roofs'], 'Collecting and storing rainwater', 'Schools collect rainwater from rooftops and store it underground.'),
            mcq('q4', 'In the passage, "precious" means…', ['Very valuable', 'Very cheap', 'Very dirty', 'Very old'], 'Very valuable', 'Water is described as one of our most valuable resources.'),
            mcq('q5', 'What is the main idea of the passage?', ['Small habits can help us save water', 'Tankers are bad', 'Rain is harmful', 'Cities have no water'], 'Small habits can help us save water', 'Every example in the passage is a small habit that saves water.')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['saves', 'Fixing', 'water', 'a leaking tap'], answer: 'Fixing a leaking tap saves water.', model: 'Fixing a leaking tap saves water.' },
            { id: 'w2', type: 'sentence', prompt: 'Join these two sentences with "because": "We must save water." "It is precious."', mustInclude: ['because'], minWords: 6, model: 'We must save water because it is precious.' },
            { id: 'w3', type: 'paragraph', prompt: 'In 60 to 80 words, write how your family can save water at home.', minWords: 60, model: 'My family can save water in many simple ways. We can turn off the tap while brushing our teeth and wash vegetables in a bowl instead of under running water. We can fix leaking taps as soon as we notice them. We can also use the water from washing rice to water our plants. If we all follow these habits every day, we will save a lot of water.', checklist: ['I gave at least three ideas', 'I used linking words (also, and, instead of)', 'My paragraph has a clear first and last sentence'] }
        ]
    },
    {
        seedKey: 'reading-intermediate-2', module: 'reading', level: 'intermediate', order: 2,
        title: 'Asha\'s Interview',
        summary: 'A story about a student\'s first job interview.',
        learn: {
            intro: 'Read the story. Notice what Asha does to prepare and how she answers.',
            passage: {
                title: 'Asha\'s Interview',
                text: 'Asha had her first job interview at a bank in Bengaluru. She woke up early, wore a neat salwar kameez and reached the office fifteen minutes before time. While she was waiting, she felt nervous, so she took a few deep breaths and read her notes again. The manager asked her about her studies, her strengths and why she wanted to work in a bank. Asha answered honestly and gave examples from her college projects. When the manager asked a question she could not answer, she said, "I\'m not sure, but I would like to learn about it." At the end, the manager smiled and said, "We like your honesty." Two days later, Asha received an email offering her the job.'
            }
        },
        quiz: [
            mcq('q1', 'When did Asha reach the office?', ['Fifteen minutes before time', 'Just in time', 'Late', 'One hour early'], 'Fifteen minutes before time', 'She "reached the office fifteen minutes before time".'),
            mcq('q2', 'What did Asha do when she felt nervous?', ['She took deep breaths and read her notes', 'She left the office', 'She called her friend', 'She ate something'], 'She took deep breaths and read her notes', 'This is what the story says she did.'),
            mcq('q3', 'How did Asha answer the questions?', ['Honestly, with examples', 'With jokes', 'Angrily', 'In one word'], 'Honestly, with examples', 'She "answered honestly and gave examples from her college projects".'),
            mcq('q4', 'What did Asha say when she did not know an answer?', ['That she was not sure but wanted to learn', 'She made up an answer', 'She stayed silent', 'She changed the topic'], 'That she was not sure but wanted to learn', '"I\'m not sure, but I would like to learn about it."'),
            mcq('q5', 'What does the story teach us?', ['Honesty and preparation help in interviews', 'Interviews are easy', 'Never answer questions', 'Wear expensive clothes'], 'Honesty and preparation help in interviews', 'Asha prepared, stayed calm and was honest, and she got the job.')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['honestly', 'She', 'the questions', 'answered'], answer: 'She answered the questions honestly.', model: 'She answered the questions honestly.' },
            { id: 'w2', type: 'email', prompt: 'Write an email to your teacher asking for one day\'s leave because you are unwell. Include a subject line.', minWords: 45, model: 'Subject: Leave request for 12 March\n\nDear Ma\'am,\n\nI am not feeling well today and the doctor has advised me to rest. So I will not be able to attend college tomorrow, 12 March. Kindly grant me leave for one day. I will collect the notes from my classmates and complete the work I miss.\n\nThank you.\n\nYours sincerely,\nAsha R.\nII BCom, Section A', checklist: ['I wrote a clear subject line', 'I greeted my teacher politely', 'I gave the reason and the date', 'I ended with "Yours sincerely" and my name'] }
        ]
    },
    {
        seedKey: 'reading-advanced-1', module: 'reading', level: 'advanced', order: 1,
        title: 'Learning in the Digital Age',
        summary: 'An article on the benefits and challenges of online learning.',
        learn: {
            intro: 'Read the article closely. Some questions ask about the writer\'s opinion, not just the facts.',
            passage: {
                title: 'Learning in the Digital Age',
                text: 'Over the past decade, smartphones and affordable internet have changed the way students in India learn. A student in a small town can now watch lectures by experienced teachers, practise mock tests and join online study groups. This has made quality education more accessible than ever before. However, digital learning also brings challenges. Constant notifications can distract learners, and not every household has a stable internet connection or a device for each child. Experts suggest that students should set clear goals, switch off unnecessary alerts and combine online resources with traditional methods such as reading books and discussing ideas with teachers. When used wisely, technology can be a powerful partner in learning rather than a replacement for discipline and curiosity.'
            }
        },
        quiz: [
            mcq('q1', 'What has made quality education more accessible?', ['Smartphones and affordable internet', 'More schools in cities', 'Cheaper books', 'Longer holidays'], 'Smartphones and affordable internet', 'The first sentence gives this.'),
            mcq('q2', 'Which is mentioned as a challenge of digital learning?', ['Notifications that distract learners', 'Too many teachers', 'Expensive textbooks', 'Short lectures'], 'Notifications that distract learners', '"Constant notifications can distract learners."'),
            mcq('q3', 'In the passage, "accessible" means…', ['Easy to reach or use', 'Very expensive', 'Hard to understand', 'Not allowed'], 'Easy to reach or use', 'A student in a small town can now reach good teaching.'),
            mcq('q4', 'What do experts suggest?', ['Set goals and combine online and traditional learning', 'Stop using phones completely', 'Study only online', 'Avoid teachers'], 'Set goals and combine online and traditional learning', 'The passage lists clear goals, fewer alerts and mixing methods.'),
            mcq('q5', 'What is the writer\'s overall view of technology?', ['It helps if it is used wisely', 'It is harmful', 'It should replace teachers', 'It is unimportant'], 'It helps if it is used wisely', '"When used wisely, technology can be a powerful partner in learning."')
        ],
        writing: [
            { id: 'w1', type: 'sentence', prompt: 'Write one complex sentence about online learning using "although".', mustInclude: ['although'], minWords: 8, model: 'Although online classes are convenient, students need discipline to benefit from them.' },
            { id: 'w2', type: 'letter', prompt: 'Write a formal letter to your Principal requesting that the college library stay open until 8 p.m. during the exam weeks.', minWords: 80, model: 'To\nThe Principal,\nGovernment First Grade College, Mysuru\n\n10 March 2026\n\nSubject: Request to extend library hours during examinations\n\nRespected Sir,\n\nI am writing on behalf of the final-year students of our college. Our semester examinations begin on 1 April, and many of us do not have a quiet place to study at home. The library closes at 5 p.m., which leaves very little time after classes.\n\nWe kindly request you to keep the library open until 8 p.m. during the exam weeks. We promise to maintain silence and take care of the books.\n\nThank you for considering our request.\n\nYours faithfully,\nRahul K.\nFinal Year BSc', checklist: ['I wrote the address, date and subject', 'I used a formal greeting (Respected Sir / Madam)', 'I gave reasons for the request', 'I ended with "Yours faithfully" and my name'] }
        ]
    },
    {
        seedKey: 'reading-advanced-2', module: 'reading', level: 'advanced', order: 2,
        title: 'Teamwork at Work',
        summary: 'An article on what makes teams work well.',
        learn: {
            intro: 'Read the article. Note the qualities of a good team member.',
            passage: {
                title: 'Teamwork at Work',
                text: 'In most workplaces today, projects are completed by teams rather than individuals. A good team member does more than finish their own tasks. They communicate clearly, share updates on time and ask for help before a small problem becomes a big one. Disagreements are normal when people with different ideas work together. What matters is how they are handled. Effective teams listen to every member, focus on the problem instead of the person, and agree on a decision even if not everyone gets their way. Research shows that teams in which members feel safe to speak up make fewer mistakes and are more creative. For young professionals, learning to collaborate is therefore as important as technical skill.'
            }
        },
        quiz: [
            mcq('q1', 'According to the passage, what does a good team member do?', ['Communicates clearly and shares updates', 'Works alone', 'Avoids asking for help', 'Argues with everyone'], 'Communicates clearly and shares updates', 'The passage lists clear communication and timely updates.'),
            mcq('q2', 'How do effective teams handle disagreements?', ['They focus on the problem, not the person', 'They ignore them', 'The manager shouts', 'They remove members'], 'They focus on the problem, not the person', '"…focus on the problem instead of the person."'),
            mcq('q3', 'Teams in which members feel safe to speak up…', ['make fewer mistakes and are more creative', 'work more slowly', 'fail more often', 'need more managers'], 'make fewer mistakes and are more creative', 'This is what the research in the passage shows.'),
            mcq('q4', 'In the passage, "collaborate" means…', ['Work together', 'Compete', 'Complain', 'Leave'], 'Work together', 'To collaborate is to work together with others.'),
            mcq('q5', 'What is the main message?', ['Teamwork skills are as important as technical skills', 'Only technical skills matter', 'Teams are not useful', 'Disagreements must be avoided at any cost'], 'Teamwork skills are as important as technical skills', 'The last sentence states it.')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['every member', 'Effective', 'listen to', 'teams'], answer: 'Effective teams listen to every member.', model: 'Effective teams listen to every member.' },
            { id: 'w2', type: 'email', prompt: 'Write a professional email to an HR manager following up on the internship application you sent two weeks ago.', minWords: 70, model: 'Subject: Follow-up on internship application – Data Analyst Intern\n\nDear Ms Rao,\n\nI hope you are doing well. Two weeks ago, on 2 March, I applied for the Data Analyst internship at your company. I am writing to ask whether there is any update on my application.\n\nI am very interested in this role, as it matches my coursework in statistics and my project on sales data analysis. I would be happy to share any further information or attend an interview at your convenience.\n\nThank you for your time.\n\nKind regards,\nNikhil S.\nPhone: [your phone number]', checklist: ['My subject line names the role', 'I mentioned when I applied', 'I stayed polite and short', 'I ended with a closing and my contact details'] }
        ]
    }
];
