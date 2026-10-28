/**
 * Advanced, topic 4 — Environment and climate (asked 2026-10-28: one more
 * topic in the Advanced section). Two units (parts.js): Our planet, and
 * Taking action. The words and sentences in every language, and how they
 * sound in English letters (`sounds`), are below the lessons; written here,
 * not by any translation service — a native speaker should check them.
 */
const { w, mcq, fill, fix, order, dialogue, item, tipsOf } = require('./make');

const lessons = [
    {
        seedKey: 'vocab-advanced-4', module: 'vocabulary', level: 'advanced', order: 4,
        title: 'Environment and climate',
        summary: 'Words for pollution, the climate, saving resources and the natural world.',
        learn: {
            intro: 'Learn each word with its Kannada meaning. Read the example sentence aloud to remember how the word is used.',
            points: ['Group the words: problems (pollution, emission, drought), the natural world (climate, biodiversity) and solutions (renewable, conserve, recycle).', 'Use two of the words together in one sentence of your own.']
        },
        words: [
            w('pollution', 'ಮಾಲಿನ್ಯ', 'noun', 'Air pollution in big cities makes it hard for many people to breathe.', ['contamination']),
            w('climate', 'ಹವಾಮಾನ, ವಾಯುಗುಣ', 'noun', 'Mysuru has a pleasant climate for most of the year.', ['weather conditions']),
            w('renewable', 'ನವೀಕರಿಸಬಹುದಾದ', 'adjective', 'Solar and wind power are renewable sources of energy.', ['sustainable'], ['non-renewable']),
            w('conserve', 'ಸಂರಕ್ಷಿಸು, ಮಿತವಾಗಿ ಬಳಸು', 'verb', 'We must conserve water during the summer months.', ['save', 'protect'], ['waste']),
            w('recycle', 'ಮರುಬಳಕೆ ಮಾಡು', 'verb', 'Our college recycles all its waste paper.', ['reuse', 'reprocess'], ['throw away']),
            w('emission', 'ಹೊರಸೂಸುವಿಕೆ', 'noun', 'Cars and factories are a major source of carbon emissions.', ['discharge', 'release']),
            w('drought', 'ಬರ, ಬರಗಾಲ', 'noun', 'The long drought dried up the wells in many villages of north Karnataka.', ['dry spell'], ['flood']),
            w('biodiversity', 'ಜೀವವೈವಿಧ್ಯ', 'noun', 'The Western Ghats are famous for their rich biodiversity.', ['variety of life'])
        ]
    },
    {
        seedKey: 'grammar-advanced-4', module: 'grammar', level: 'advanced', order: 4,
        title: 'The passive voice',
        summary: 'Is, was, has been and will be + past participle; "by" + the doer; and when to use the passive.',
        learn: {
            intro: 'In a passive sentence, the person or thing that receives the action is the subject. We use it when the action matters more than who did it.',
            points: [
                'Form: a form of "be" + the past participle. Present: "Paper is recycled here." Past: "The trees were planted last year."',
                'Present perfect: has / have been + past participle. "A new solar panel has been fixed on the roof."',
                'Future: will be + past participle. "The results will be announced on Monday."',
                'Use "by" to say who did the action, only when it is useful: "The campaign was started by the students."',
                'Use the passive when the doer is unknown, obvious or not important: "My bike was stolen." "English is spoken all over the world."'
            ],
            examples: ['Plastic bags are banned in our college.', 'The river was cleaned by volunteers.', 'Thousands of trees have been cut down.', 'The new rules will be announced tomorrow.']
        },
        practice: [
            mcq('p1', 'Plastic bags ___ in our college since last year.', ['have been banned', 'has banned', 'are banning'], 'have been banned', 'Present perfect passive: have been + past participle. "Since" points to the present perfect.'),
            fill('p2', 'All the waste paper ___ recycled every week. (is / are)', 'is', '"Waste paper" is uncountable, so it takes "is": is + past participle.'),
            mcq('p3', 'The new solar panels ___ next month.', ['will be installed', 'will install', 'are installed'], 'will be installed', 'Future passive: will be + past participle. The panels do not install anything; they are installed.'),
            fix('p4', 'The trees was planted by the students.', 'The trees were planted by the students.', '"Trees" is plural, so the past of "be" is "were".'),
            fill('p5', 'The lake was cleaned ___ volunteers from the village. (by / with)', 'by', '"By" brings in the person who does the action (the doer).'),
            order('p6', ['by', 'The', 'started', 'students', 'campaign', 'the', 'was'], 'The campaign was started by the students.', 'The thing that receives the action (The campaign) + was + past participle (started) + by + the doer.')
        ],
        quiz: [
            mcq('q1', 'English ___ in many countries.', ['is spoken', 'speaks', 'is speaking'], 'is spoken', 'Present simple passive: is + past participle (spoken). A language does not speak; it is spoken.'),
            fill('q2', 'The old trees ___ cut down last month. (was / were)', 'were', '"Trees" is plural and the time is past: were + past participle.'),
            mcq('q3', 'Which is correct?', ['A new park has been opened near our college.', 'A new park has been open near our college.', 'A new park have been opened near our college.'], 'A new park has been opened near our college.', 'Present perfect passive: has been + past participle (opened). "A park" is singular, so "has".'),
            fix('q4', 'The plastic waste will collected on Friday.', 'The plastic waste will be collected on Friday.', 'Future passive: will be + past participle. Do not leave out "be".'),
            mcq('q5', 'This bridge ___ by the British in 1890.', ['was built', 'built', 'has built'], 'was built', 'A finished past action, in the passive: was + past participle. The doer comes after "by".'),
            fill('q6', 'More solar panels will ___ installed next year. (be / been)', 'be', 'After "will", use the plain form "be": will be + past participle.'),
            mcq('q7', 'Choose the passive form of: "The students cleaned the lake."', ['The lake was cleaned by the students.', 'The lake cleaned the students.', 'The lake is cleaning by the students.'], 'The lake was cleaned by the students.', 'The object (the lake) becomes the subject; cleaned (past) becomes "was cleaned"; the doer comes after "by".'),
            order('q8', ['this', 'been', 'Many', 'year', 'have', 'planted', 'trees'], 'Many trees have been planted this year.', 'Present perfect passive: have been + past participle (planted), then the time (this year).')
        ]
    },
    {
        seedKey: 'reading-advanced-4', module: 'reading', level: 'advanced', order: 4,
        title: 'A Greener Campus',
        summary: 'Students at a college in Shivamogga cut plastic and save water and energy.',
        learn: {
            intro: 'Read the article. Notice how the passive (were banned, is collected, is produced) is used to describe the changes. Then answer the questions.',
            passage: {
                title: 'A Greener Campus',
                text: 'Two years ago, the canteen at Tunga College in Shivamogga used more than five hundred plastic cups and plates every day. Most of them were thrown into a dry stream behind the campus, and during the summer drought, the college had to buy water from tankers. A group of second-year students decided that this could not go on. With the support of their principal, they started a campaign called "Green Tunga". First, plastic cups were banned in the canteen, and every student was asked to carry a steel bottle. Leaking taps were repaired, and the rainwater from the hostel roofs is now collected in a large underground tank. The students also persuaded the management to put solar panels on the library roof, and today almost half of the college\'s electricity is produced by the sun. Waste paper is recycled, and food waste from the canteen is turned into compost for the college garden. Not everyone was happy at first: some students complained that the bottles were heavy and the new rules were a nuisance. However, after one year, the college\'s water bill had fallen by forty percent. "We did not save the planet," says Meghana, one of the student leaders, "but we proved that small changes add up." Next year, the campaign will be extended to three other colleges in the district.'
            }
        },
        quiz: [
            mcq('q1', 'What was the problem in the canteen two years ago?', ['It used hundreds of plastic cups and plates every day', 'It had no electricity', 'It served bad food', 'It was too small for the students'], 'It used hundreds of plastic cups and plates every day', '"…the canteen … used more than five hundred plastic cups and plates every day."'),
            mcq('q2', 'What was every student asked to do?', ['Carry a steel bottle', 'Plant a tree', 'Pay a fine', 'Stop using the canteen'], 'Carry a steel bottle', '"…every student was asked to carry a steel bottle."'),
            mcq('q3', 'What happens to the rainwater from the hostel roofs now?', ['It is collected in an underground tank', 'It flows into the stream', 'It is sold to the water tankers', 'It is used to clean the canteen'], 'It is collected in an underground tank', '"…the rainwater from the hostel roofs is now collected in a large underground tank."'),
            mcq('q4', 'How much of the college\'s electricity is produced by the sun?', ['Almost half', 'All of it', 'Forty percent', 'A quarter'], 'Almost half', '"…today almost half of the college\'s electricity is produced by the sun." (Forty percent is how much the water bill fell.)'),
            mcq('q5', 'What does Meghana mean by "small changes add up"?', ['Many small actions together make a big difference', 'Small changes are easy to count', 'Only big changes matter', 'The college should add more rules'], 'Many small actions together make a big difference', 'To "add up" here means to grow into something big when put together.')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['were banned', 'Plastic cups', 'in the canteen'], answer: 'Plastic cups were banned in the canteen.', model: 'Plastic cups were banned in the canteen.' },
            { id: 'w2', type: 'jumbled', prompt: 'Put the words in order.', words: ['is recycled', 'Waste paper', 'every week'], answer: 'Waste paper is recycled every week.', model: 'Waste paper is recycled every week.' },
            { id: 'w3', type: 'sentence', prompt: 'Make one sentence with the words "conserve" and "water".', mustInclude: ['conserve', 'water'], minWords: 7, model: 'We can conserve water by repairing every leaking tap.' },
            { id: 'w4', type: 'email', prompt: 'Write an email (6 to 8 sentences) to your college principal suggesting one change that would make the campus greener. Use at least one passive sentence.', minWords: 60, model: 'Subject: A suggestion to reduce plastic waste on campus\n\nDear Sir,\n\nI am a second-year BSc student, and I would like to suggest one change to make our campus greener. Every day, hundreds of plastic water bottles are thrown away near the canteen. If water filters were installed on each floor, students could refill their own steel bottles. This would reduce plastic waste and also save money in the long run. Our eco club is ready to put up posters and remind students to carry their bottles. I would be happy to meet you and explain the plan in detail.\n\nThank you for your time.\n\nYours sincerely,\nKavya M.\nII BSc', checklist: ['I wrote a clear subject line', 'I explained the problem and my suggestion', 'I used at least one passive sentence correctly', 'I ended politely, with my name'] }
        ]
    },
    {
        seedKey: 'speaking-advanced-4', module: 'speaking', level: 'advanced', order: 4,
        title: 'A meeting about plastic waste',
        summary: 'A student leader and a college official agree on a plan to cut plastic waste.',
        learn: {
            intro: 'Listen to how Sneha presents the problem, makes a suggestion and answers the official\'s worries politely.',
            dialogue: dialogue('speaking-advanced-4', 'In the college office: Sneha, the student council leader, meets Dr Ramesh, the administrative officer, to agree on a plan to cut plastic waste.', [{ name: 'Ramesh', voice: 'm' }, { name: 'Sneha', voice: 'f' }], [
                ['Ramesh', 'Come in, Sneha. You wanted to talk about the plastic waste on campus?'],
                ['Sneha', 'Yes, sir. Our survey shows that about four hundred plastic bottles are thrown away every day.'],
                ['Ramesh', 'That is a lot. What do you suggest?'],
                ['Sneha', 'We would like plastic bottles to be banned in the canteen, and water filters to be installed on every floor.'],
                ['Ramesh', 'The filters would be expensive. How would they be paid for?'],
                ['Sneha', 'Part of the cost could be covered by the alumni association. We have already spoken to them.'],
                ['Ramesh', 'That is a good start. But what if students do not follow the rule?'],
                ['Sneha', 'The eco club will run an awareness week first, and steel bottles will be sold at a low price.'],
                ['Ramesh', 'All right. Let us try it for one semester, and the results will be reviewed in March.'],
                ['Sneha', 'Thank you, sir. I will send you the full plan by Friday.']
            ]),
            phrases: ['Our survey shows that…', 'Part of the cost could be covered by…', 'Let us try it for one semester.']
        },
        quiz: [
            mcq('q1', 'Why has Sneha come to see Dr Ramesh?', ['To talk about plastic waste on campus', 'To ask for a holiday', 'To complain about the canteen food', 'To apply for a scholarship'], 'To talk about plastic waste on campus', '"You wanted to talk about the plastic waste on campus?" — "Yes, sir."'),
            mcq('q2', 'How many plastic bottles are thrown away every day?', ['About four hundred', 'About forty', 'About four thousand', 'About fourteen'], 'About four hundred', '"…about four hundred plastic bottles are thrown away every day."'),
            mcq('q3', 'Who could pay for part of the water filters?', ['The alumni association', 'The canteen owner', 'The students\' parents', 'The government'], 'The alumni association', '"Part of the cost could be covered by the alumni association."'),
            mcq('q4', 'When will the results be reviewed?', ['In March', 'Next week', 'By Friday', 'After two years'], 'In March', '"…the results will be reviewed in March." (Friday is when Sneha will send the plan.)')
        ],
        speaking: {
            prompt: 'You are a student leader. In 6 to 8 sentences, suggest a plan to a college official to save water or energy on campus: explain the problem, give your plan, say how it will be done or paid for, use at least one passive sentence, and answer one possible worry.',
            sample: 'Good morning, ma\'am. I would like to suggest a plan to save electricity on our campus. Our survey shows that lights and fans are often left on in empty classrooms. We suggest that one student volunteer on each floor should switch them off after the last class. Small stickers will also be put up near every switch. The cost is very low, and it can be covered by the eco club. You may be worried that students will forget, but we will check every room for the first month. Thank you for listening, and I hope we can start next week.',
            checklist: ['I greeted the official and explained the problem', 'I gave a clear plan', 'I used at least one passive sentence correctly', 'I answered one possible worry', 'I closed the conversation politely', 'I spoke clearly, at a steady pace']
        }
    },
    {
        seedKey: 'translation-advanced-4', module: 'translation', level: 'advanced', order: 4, direction: 'kn-en',
        title: 'Our environment: Kannada → English',
        summary: 'Pollution, saving water, renewable energy and passive sentences.',
        learn: { intro: 'Translate each Kannada word or sentence into clear, natural English. Kannada -ಲಾಗಿದೆ, -ಲಾಗುತ್ತದೆ, -ಲಾಯಿತು and -ಲಾಗುವುದು are often best said with the English passive.', points: tipsOf('translation-advanced-kn-en') },
        items: [
            item('i1', 'word', 'vocabulary', 'ಮಾಲಿನ್ಯ', 'pollution', 'Pollution makes the air, water or land dirty: air pollution, water pollution.', ['the pollution', 'contamination']),
            item('i2', 'word', 'vocabulary', 'ಬರ', 'drought', 'A drought is a long time with little or no rain. It sounds like "drowt".', ['a drought', 'the drought']),
            item('i3', 'sentence', 'grammar', 'ನಮ್ಮ ಕಾಲೇಜಿನಲ್ಲಿ ಪ್ಲಾಸ್ಟಿಕ್ ಚೀಲಗಳನ್ನು ನಿಷೇಧಿಸಲಾಗಿದೆ.', 'Plastic bags have been banned in our college.', 'This is the present perfect passive: "has / have been + past participle" (been banned). "Bags" is plural, so "have".', ['Plastic bags are banned in our college.', 'Plastic bags have been banned at our college.', 'Plastic bags are banned at our college.', 'In our college, plastic bags have been banned.', 'In our college, plastic bags are banned.', 'In our college plastic bags have been banned.', 'Plastic bags have been banned on our campus.', 'Our college has banned plastic bags.']),
            item('i4', 'sentence', 'vocabulary', 'ನಾವು ನೀರನ್ನು ಸಂರಕ್ಷಿಸಬೇಕು.', 'We must conserve water.', '"Conserve" means to use something carefully so that it is not wasted. "Must" or "should" + the plain verb.', ['We should conserve water.', 'We must save water.', 'We should save water.', 'We need to conserve water.', 'We have to conserve water.', 'We need to save water.', 'We have to save water.', 'We must conserve the water.']),
            item('i5', 'sentence', 'vocabulary', 'ಗಾಳಿ ಮತ್ತು ಸೂರ್ಯನ ಬೆಳಕು ನವೀಕರಿಸಬಹುದಾದ ಶಕ್ತಿಯ ಮೂಲಗಳಾಗಿವೆ.', 'Wind and sunlight are renewable sources of energy.', '"Renewable" energy comes from sources that do not run out. English needs "are" after a plural subject.', ['Wind and sunlight are renewable energy sources.', 'Wind and sunlight are sources of renewable energy.', 'Wind and the sun are renewable sources of energy.', 'The wind and the sun are renewable sources of energy.', 'Wind and sunshine are renewable sources of energy.', 'Wind and sunlight are renewable sources of power.', 'Wind and solar light are renewable sources of energy.']),
            item('i6', 'sentence', 'grammar', 'ಮುಂದಿನ ತಿಂಗಳು ಗ್ರಂಥಾಲಯದ ಛಾವಣಿಯ ಮೇಲೆ ಸೌರ ಫಲಕಗಳನ್ನು ಅಳವಡಿಸಲಾಗುವುದು.', 'Solar panels will be installed on the library roof next month.', 'This is the future passive: "will be + past participle" (will be installed).', ['Solar panels will be fixed on the library roof next month.', 'Next month, solar panels will be installed on the library roof.', 'Next month solar panels will be installed on the library roof.', 'Solar panels will be installed on the roof of the library next month.', 'Next month, solar panels will be installed on the roof of the library.', 'Solar panels will be put on the library roof next month.', 'Solar panels will be fitted on the library roof next month.', 'Next month, solar panels will be fixed on the library roof.'])
        ],
        quiz: [
            item('q1', 'sentence', 'vocabulary', 'ನಗರಗಳಲ್ಲಿ ವಾಯು ಮಾಲಿನ್ಯ ಹೆಚ್ಚುತ್ತಿದೆ.', 'Air pollution is increasing in cities.', 'Something happening now and still changing takes the present continuous: "is increasing".', ['Air pollution is rising in cities.', 'Air pollution is growing in cities.', 'Air pollution is increasing in the cities.', 'In cities, air pollution is increasing.', 'In cities air pollution is increasing.', 'Air pollution is going up in cities.', 'Air pollution in cities is increasing.', 'Air pollution in cities is rising.']),
            item('q2', 'sentence', 'grammar', 'ಕಾಗದವನ್ನು ಪ್ರತಿ ವಾರ ಮರುಬಳಕೆ ಮಾಡಲಾಗುತ್ತದೆ.', 'Paper is recycled every week.', 'Something done regularly takes the present passive: "is + past participle".', ['The paper is recycled every week.', 'Every week, paper is recycled.', 'Every week paper is recycled.', 'Paper gets recycled every week.', 'Paper is recycled each week.', 'The paper is recycled each week.']),
            item('q3', 'sentence', 'vocabulary', 'ಬರದಿಂದಾಗಿ ರೈತರು ತುಂಬಾ ಕಷ್ಟಪಟ್ಟರು.', 'The farmers suffered a lot because of the drought.', '"Because of" gives the reason; "suffer" or "have a hard time" says what happens.', ['Farmers suffered a lot because of the drought.', 'The farmers suffered greatly because of the drought.', 'Because of the drought, the farmers suffered a lot.', 'Because of the drought, farmers suffered a lot.', 'Because of the drought the farmers suffered a lot.', 'The farmers had a very hard time because of the drought.', 'Farmers suffered a lot due to the drought.', 'The farmers suffered a lot due to the drought.']),
            item('q4', 'sentence', 'grammar', 'ಈ ಕೆರೆಯನ್ನು ಹಳ್ಳಿಯ ಸ್ವಯಂಸೇವಕರಿಂದ ಸ್ವಚ್ಛಗೊಳಿಸಲಾಯಿತು.', 'This lake was cleaned by volunteers from the village.', 'This is the past passive: "was + past participle"; the one who did it comes after "by".', ['This lake was cleaned by the village volunteers.', 'This lake was cleaned by volunteers of the village.', 'This lake was cleaned by the volunteers of the village.', 'This lake was cleaned by the volunteers from the village.', 'The lake was cleaned by volunteers from the village.', 'This lake was cleaned by village volunteers.', 'Volunteers from the village cleaned this lake.', 'The village volunteers cleaned this lake.'])
        ]
    }
];

// Each word's meaning in every language (English: a definition, for English speakers).
const words = {
    pollution: { hi: 'प्रदूषण', ta: 'மாசு, மாசுபாடு', te: 'కాలుష్యం', ml: 'മലിനീകരണം', mr: 'प्रदूषण', bn: 'দূষণ', gu: 'પ્રદૂષણ', pa: 'ਪ੍ਰਦੂਸ਼ਣ', or: 'ପ୍ରଦୂଷଣ', ur: 'آلودگی', es: 'contaminación', fr: 'pollution', de: 'Verschmutzung', pt: 'poluição', ru: 'загрязнение', ar: 'تلوث', zh: '污染', ja: '汚染', ko: '오염', en: 'harmful or dirty things in the air, water or land' },
    climate: { hi: 'जलवायु', ta: 'காலநிலை', te: 'వాతావరణం, శీతోష్ణస్థితి', ml: 'കാലാവസ്ഥ', mr: 'हवामान', bn: 'জলবায়ু', gu: 'આબોહવા', pa: 'ਜਲਵਾਯੂ', or: 'ଜଳବାୟୁ', ur: 'آب و ہوا', es: 'clima', fr: 'climat', de: 'Klima', pt: 'clima', ru: 'климат', ar: 'مناخ', zh: '气候', ja: '気候', ko: '기후', en: 'the usual weather of a place over a long time' },
    renewable: { hi: 'नवीकरणीय', ta: 'புதுப்பிக்கத்தக்க', te: 'పునరుత్పాదక', ml: 'പുനരുപയോഗിക്കാവുന്ന', mr: 'नवीकरणीय', bn: 'নবায়নযোগ্য', gu: 'પુનઃપ્રાપ્ય', pa: 'ਨਵਿਆਉਣਯੋਗ', or: 'ନବୀକରଣଯୋଗ୍ୟ', ur: 'قابل تجدید', es: 'renovable', fr: 'renouvelable', de: 'erneuerbar', pt: 'renovável', ru: 'возобновляемый', ar: 'متجدد', zh: '可再生', ja: '再生可能な', ko: '재생 가능한', en: 'coming from a source that does not run out, like the sun or the wind' },
    conserve: { hi: 'संरक्षण करना, बचाना', ta: 'பாதுகாத்தல், சேமித்தல்', te: 'సంరక్షించడం, పొదుపు చేయడం', ml: 'സംരക്ഷിക്കുക', mr: 'जतन करणे, वाचवणे', bn: 'সংরক্ষণ করা', gu: 'સંરક્ષણ કરવું, બચાવવું', pa: 'ਸੰਭਾਲਣਾ, ਬਚਾਉਣਾ', or: 'ସଂରକ୍ଷଣ କରିବା', ur: 'محفوظ رکھنا، بچانا', es: 'conservar, ahorrar', fr: 'préserver, économiser', de: 'bewahren, sparen', pt: 'conservar, poupar', ru: 'сохранять, беречь', ar: 'يحافظ على', zh: '节约、保护', ja: '節約する、保護する', ko: '보존하다, 아끼다', en: 'to protect something, or use it carefully so that it is not wasted' },
    recycle: { hi: 'पुनर्चक्रण करना', ta: 'மறுசுழற்சி செய்தல்', te: 'పునర్వినియోగం చేయడం', ml: 'പുനഃചംക്രമണം ചെയ്യുക', mr: 'पुनर्वापर करणे', bn: 'পুনর্ব্যবহার করা', gu: 'રિસાયકલ કરવું', pa: 'ਰੀਸਾਈਕਲ ਕਰਨਾ', or: 'ପୁନଃଚକ୍ରଣ କରିବା', ur: 'ری سائیکل کرنا', es: 'reciclar', fr: 'recycler', de: 'recyceln', pt: 'reciclar', ru: 'перерабатывать', ar: 'يعيد التدوير', zh: '回收利用', ja: 'リサイクルする', ko: '재활용하다', en: 'to treat used things so that they can be used again' },
    emission: { hi: 'उत्सर्जन', ta: 'உமிழ்வு', te: 'ఉద్గారం', ml: 'ബഹിർഗമനം', mr: 'उत्सर्जन', bn: 'নির্গমন', gu: 'ઉત્સર્જન', pa: 'ਨਿਕਾਸ', or: 'ନିର୍ଗମନ', ur: 'اخراج', es: 'emisión', fr: 'émission', de: 'Ausstoß, Emission', pt: 'emissão', ru: 'выброс', ar: 'انبعاث', zh: '排放', ja: '排出', ko: '배출', en: 'gas or other harmful matter sent out into the air' },
    drought: { hi: 'सूखा', ta: 'வறட்சி', te: 'కరువు', ml: 'വരൾച്ച', mr: 'दुष्काळ', bn: 'খরা', gu: 'દુકાળ', pa: 'ਸੋਕਾ', or: 'ମରୁଡ଼ି', ur: 'خشک سالی', es: 'sequía', fr: 'sécheresse', de: 'Dürre', pt: 'seca', ru: 'засуха', ar: 'جفاف', zh: '干旱', ja: '干ばつ', ko: '가뭄', en: 'a long time with little or no rain' },
    biodiversity: { hi: 'जैव विविधता', ta: 'உயிர்ப்பன்மை', te: 'జీవవైవిధ్యం', ml: 'ജൈവവൈവിധ്യം', mr: 'जैवविविधता', bn: 'জীববৈচিত্র্য', gu: 'જૈવવિવિધતા', pa: 'ਜੈਵ ਵਿਭਿੰਨਤਾ', or: 'ଜୈବ ବିବିଧତା', ur: 'حیاتیاتی تنوع', es: 'biodiversidad', fr: 'biodiversité', de: 'Artenvielfalt, Biodiversität', pt: 'biodiversidade', ru: 'биоразнообразие', ar: 'التنوع البيولوجي', zh: '生物多样性', ja: '生物多様性', ko: '생물 다양성', en: 'the variety of plants and animals living in a place' }
};

// Each Kannada word or sentence of the translation lesson in every language (the English is the lesson's own).
const sentences = {
    i1: { hi: 'प्रदूषण', ta: 'மாசு', te: 'కాలుష్యం', ml: 'മലിനീകരണം', mr: 'प्रदूषण', bn: 'দূষণ', gu: 'પ્રદૂષણ', pa: 'ਪ੍ਰਦੂਸ਼ਣ', or: 'ପ୍ରଦୂଷଣ', ur: 'آلودگی', es: 'contaminación', fr: 'pollution', de: 'Verschmutzung', pt: 'poluição', ru: 'загрязнение', ar: 'تلوث', zh: '污染', ja: '汚染', ko: '오염' },
    i2: { hi: 'सूखा', ta: 'வறட்சி', te: 'కరువు', ml: 'വരൾച്ച', mr: 'दुष्काळ', bn: 'খরা', gu: 'દુકાળ', pa: 'ਸੋਕਾ', or: 'ମରୁଡ଼ି', ur: 'خشک سالی', es: 'sequía', fr: 'sécheresse', de: 'Dürre', pt: 'seca', ru: 'засуха', ar: 'جفاف', zh: '干旱', ja: '干ばつ', ko: '가뭄' },
    i3: { hi: 'हमारे कॉलेज में प्लास्टिक की थैलियों पर प्रतिबंध लगा दिया गया है।', ta: 'எங்கள் கல்லூரியில் பிளாஸ்டிக் பைகள் தடை செய்யப்பட்டுள்ளன.', te: 'మా కళాశాలలో ప్లాస్టిక్ సంచులు నిషేధించబడ్డాయి.', ml: 'ഞങ്ങളുടെ കോളേജിൽ പ്ലാസ്റ്റിക് സഞ്ചികൾ നിരോധിച്ചിരിക്കുന്നു.', mr: 'आमच्या महाविद्यालयात प्लास्टिकच्या पिशव्यांवर बंदी घालण्यात आली आहे.', bn: 'আমাদের কলেজে প্লাস্টিকের ব্যাগ নিষিদ্ধ করা হয়েছে।', gu: 'અમારી કૉલેજમાં પ્લાસ્ટિકની થેલીઓ પર પ્રતિબંધ મૂકવામાં આવ્યો છે.', pa: 'ਸਾਡੇ ਕਾਲਜ ਵਿੱਚ ਪਲਾਸਟਿਕ ਦੇ ਲਿਫ਼ਾਫ਼ਿਆਂ ਉੱਤੇ ਪਾਬੰਦੀ ਲਗਾ ਦਿੱਤੀ ਗਈ ਹੈ।', or: 'ଆମ କଲେଜରେ ପ୍ଲାଷ୍ଟିକ ବ୍ୟାଗ ନିଷିଦ୍ଧ କରାଯାଇଛି।', ur: 'ہمارے کالج میں پلاسٹک کی تھیلیوں پر پابندی لگا دی گئی ہے۔', es: 'En nuestra universidad se han prohibido las bolsas de plástico.', fr: 'Les sacs en plastique ont été interdits dans notre université.', de: 'An unserer Hochschule wurden Plastiktüten verboten.', pt: 'As sacolas plásticas foram proibidas na nossa faculdade.', ru: 'В нашем колледже пластиковые пакеты запрещены.', ar: 'تم حظر الأكياس البلاستيكية في كليتنا.', zh: '我们学院已经禁止使用塑料袋。', ja: '私たちの大学ではビニール袋が禁止されています。', ko: '우리 대학에서는 비닐봉지 사용이 금지되었어요.' },
    i4: { hi: 'हमें पानी बचाना चाहिए।', ta: 'நாம் தண்ணீரைச் சேமிக்க வேண்டும்.', te: 'మనం నీటిని పొదుపు చేయాలి.', ml: 'നമ്മൾ വെള്ളം സംരക്ഷിക്കണം.', mr: 'आपण पाणी वाचवले पाहिजे.', bn: 'আমাদের জল সংরক্ষণ করা উচিত।', gu: 'આપણે પાણી બચાવવું જોઈએ.', pa: 'ਸਾਨੂੰ ਪਾਣੀ ਬਚਾਉਣਾ ਚਾਹੀਦਾ ਹੈ।', or: 'ଆମେ ପାଣି ସଞ୍ଚୟ କରିବା ଉଚିତ।', ur: 'ہمیں پانی بچانا چاہیے۔', es: 'Debemos ahorrar agua.', fr: 'Nous devons économiser l’eau.', de: 'Wir müssen Wasser sparen.', pt: 'Devemos economizar água.', ru: 'Мы должны беречь воду.', ar: 'يجب أن نحافظ على الماء.', zh: '我们必须节约用水。', ja: '私たちは水を節約しなければなりません。', ko: '우리는 물을 아껴야 해요.' },
    i5: { hi: 'हवा और सूरज की रोशनी ऊर्जा के नवीकरणीय स्रोत हैं।', ta: 'காற்றும் சூரிய ஒளியும் புதுப்பிக்கத்தக்க ஆற்றல் மூலங்கள்.', te: 'గాలి మరియు సూర్యరశ్మి పునరుత్పాదక శక్తి వనరులు.', ml: 'കാറ്റും സൂര്യപ്രകാശവും പുനരുപയോഗിക്കാവുന്ന ഊർജ സ്രോതസ്സുകളാണ്.', mr: 'वारा आणि सूर्यप्रकाश हे ऊर्जेचे नवीकरणीय स्रोत आहेत.', bn: 'বাতাস ও সূর্যের আলো নবায়নযোগ্য শক্তির উৎস।', gu: 'પવન અને સૂર્યપ્રકાશ ઊર્જાના પુનઃપ્રાપ્ય સ્ત્રોત છે.', pa: 'ਹਵਾ ਅਤੇ ਧੁੱਪ ਊਰਜਾ ਦੇ ਨਵਿਆਉਣਯੋਗ ਸਰੋਤ ਹਨ।', or: 'ପବନ ଓ ସୂର୍ଯ୍ୟାଲୋକ ନବୀକରଣଯୋଗ୍ୟ ଶକ୍ତିର ଉତ୍ସ।', ur: 'ہوا اور دھوپ توانائی کے قابل تجدید ذرائع ہیں۔', es: 'El viento y la luz del sol son fuentes de energía renovable.', fr: 'Le vent et la lumière du soleil sont des sources d’énergie renouvelable.', de: 'Wind und Sonnenlicht sind erneuerbare Energiequellen.', pt: 'O vento e a luz do sol são fontes de energia renovável.', ru: 'Ветер и солнечный свет — возобновляемые источники энергии.', ar: 'الرياح وضوء الشمس مصادر متجددة للطاقة.', zh: '风和阳光是可再生能源。', ja: '風と太陽の光は再生可能なエネルギー源です。', ko: '바람과 햇빛은 재생 가능한 에너지원이에요.' },
    i6: { hi: 'अगले महीने पुस्तकालय की छत पर सौर पैनल लगाए जाएँगे।', ta: 'அடுத்த மாதம் நூலகத்தின் கூரையில் சூரிய மின் தகடுகள் பொருத்தப்படும்.', te: 'వచ్చే నెల గ్రంథాలయం పైకప్పు మీద సౌర ఫలకాలు అమర్చబడతాయి.', ml: 'അടുത്ത മാസം ലൈബ്രറിയുടെ മേൽക്കൂരയിൽ സോളാർ പാനലുകൾ സ്ഥാപിക്കും.', mr: 'पुढच्या महिन्यात ग्रंथालयाच्या छतावर सौर पॅनेल बसवले जातील.', bn: 'আগামী মাসে গ্রন্থাগারের ছাদে সৌর প্যানেল বসানো হবে।', gu: 'આવતા મહિને પુસ્તકાલયની છત પર સૌર પેનલ લગાવવામાં આવશે.', pa: 'ਅਗਲੇ ਮਹੀਨੇ ਲਾਇਬ੍ਰੇਰੀ ਦੀ ਛੱਤ ਉੱਤੇ ਸੋਲਰ ਪੈਨਲ ਲਗਾਏ ਜਾਣਗੇ।', or: 'ଆସନ୍ତା ମାସରେ ପାଠାଗାରର ଛାତ ଉପରେ ସୌର ପ୍ୟାନେଲ ଲଗାଯିବ।', ur: 'اگلے مہینے لائبریری کی چھت پر سولر پینل لگائے جائیں گے۔', es: 'El próximo mes se instalarán paneles solares en el techo de la biblioteca.', fr: 'Le mois prochain, des panneaux solaires seront installés sur le toit de la bibliothèque.', de: 'Nächsten Monat werden auf dem Dach der Bibliothek Solarmodule installiert.', pt: 'No próximo mês, serão instalados painéis solares no telhado da biblioteca.', ru: 'В следующем месяце на крыше библиотеки будут установлены солнечные панели.', ar: 'سيتم تركيب ألواح شمسية على سطح المكتبة الشهر القادم.', zh: '下个月图书馆的屋顶上将安装太阳能电池板。', ja: '来月、図書館の屋根に太陽光パネルが設置されます。', ko: '다음 달에 도서관 지붕에 태양광 패널이 설치될 거예요.' },
    q1: { hi: 'शहरों में वायु प्रदूषण बढ़ रहा है।', ta: 'நகரங்களில் காற்று மாசு அதிகரித்து வருகிறது.', te: 'నగరాల్లో వాయు కాలుష్యం పెరుగుతోంది.', ml: 'നഗരങ്ങളിൽ വായു മലിനീകരണം കൂടിക്കൊണ്ടിരിക്കുന്നു.', mr: 'शहरांमध्ये वायू प्रदूषण वाढत आहे.', bn: 'শহরগুলোতে বায়ুদূষণ বাড়ছে।', gu: 'શહેરોમાં વાયુ પ્રદૂષણ વધી રહ્યું છે.', pa: 'ਸ਼ਹਿਰਾਂ ਵਿੱਚ ਹਵਾ ਪ੍ਰਦੂਸ਼ਣ ਵਧ ਰਿਹਾ ਹੈ।', or: 'ସହରଗୁଡ଼ିକରେ ବାୟୁ ପ୍ରଦୂଷଣ ବଢ଼ୁଛି।', ur: 'شہروں میں فضائی آلودگی بڑھ رہی ہے۔', es: 'La contaminación del aire está aumentando en las ciudades.', fr: 'La pollution de l’air augmente dans les villes.', de: 'Die Luftverschmutzung in den Städten nimmt zu.', pt: 'A poluição do ar está aumentando nas cidades.', ru: 'В городах растёт загрязнение воздуха.', ar: 'يتزايد تلوث الهواء في المدن.', zh: '城市里的空气污染越来越严重。', ja: '都市では大気汚染がひどくなっています。', ko: '도시에서 대기 오염이 늘어나고 있어요.' },
    q2: { hi: 'काग़ज़ का हर हफ़्ते पुनर्चक्रण किया जाता है।', ta: 'காகிதம் ஒவ்வொரு வாரமும் மறுசுழற்சி செய்யப்படுகிறது.', te: 'కాగితం ప్రతి వారం పునర్వినియోగం చేయబడుతుంది.', ml: 'കടലാസ് എല്ലാ ആഴ്ചയും പുനഃചംക്രമണം ചെയ്യുന്നു.', mr: 'कागदाचा दर आठवड्याला पुनर्वापर केला जातो.', bn: 'প্রতি সপ্তাহে কাগজ পুনর্ব্যবহার করা হয়।', gu: 'કાગળને દર અઠવાડિયે રિસાયકલ કરવામાં આવે છે.', pa: 'ਕਾਗ਼ਜ਼ ਨੂੰ ਹਰ ਹਫ਼ਤੇ ਰੀਸਾਈਕਲ ਕੀਤਾ ਜਾਂਦਾ ਹੈ।', or: 'କାଗଜକୁ ପ୍ରତି ସପ୍ତାହରେ ପୁନଃଚକ୍ରଣ କରାଯାଏ।', ur: 'کاغذ کو ہر ہفتے ری سائیکل کیا جاتا ہے۔', es: 'El papel se recicla cada semana.', fr: 'Le papier est recyclé chaque semaine.', de: 'Das Papier wird jede Woche recycelt.', pt: 'O papel é reciclado toda semana.', ru: 'Бумагу перерабатывают каждую неделю.', ar: 'يُعاد تدوير الورق كل أسبوع.', zh: '纸张每周都会被回收利用。', ja: '紙は毎週リサイクルされます。', ko: '종이는 매주 재활용돼요.' },
    q3: { hi: 'सूखे की वजह से किसानों को बहुत तकलीफ़ हुई।', ta: 'வறட்சியால் விவசாயிகள் மிகவும் கஷ்டப்பட்டனர்.', te: 'కరువు వల్ల రైతులు చాలా కష్టపడ్డారు.', ml: 'വരൾച്ച കാരണം കർഷകർ വളരെ കഷ്ടപ്പെട്ടു.', mr: 'दुष्काळामुळे शेतकऱ्यांचे खूप हाल झाले.', bn: 'খরার কারণে কৃষকেরা খুব কষ্ট পেয়েছিলেন।', gu: 'દુકાળને કારણે ખેડૂતોએ ખૂબ મુશ્કેલી વેઠી.', pa: 'ਸੋਕੇ ਕਾਰਨ ਕਿਸਾਨਾਂ ਨੂੰ ਬਹੁਤ ਮੁਸ਼ਕਲ ਹੋਈ।', or: 'ମରୁଡ଼ି ଯୋଗୁଁ ଚାଷୀମାନେ ବହୁତ କଷ୍ଟ ପାଇଲେ।', ur: 'خشک سالی کی وجہ سے کسانوں کو بہت تکلیف ہوئی۔', es: 'Los agricultores sufrieron mucho por la sequía.', fr: 'Les agriculteurs ont beaucoup souffert à cause de la sécheresse.', de: 'Die Bauern haben wegen der Dürre sehr gelitten.', pt: 'Os agricultores sofreram muito por causa da seca.', ru: 'Из-за засухи фермеры очень пострадали.', ar: 'عانى المزارعون كثيرًا بسبب الجفاف.', zh: '由于干旱，农民们吃了很多苦。', ja: '干ばつのせいで、農家の人たちはとても苦しみました。', ko: '가뭄 때문에 농부들이 많이 고생했어요.' },
    q4: { hi: 'इस झील को गाँव के स्वयंसेवकों द्वारा साफ़ किया गया।', ta: 'இந்த ஏரி கிராமத்துத் தன்னார்வலர்களால் சுத்தம் செய்யப்பட்டது.', te: 'ఈ చెరువు గ్రామ స్వచ్ఛంద సేవకులచే శుభ్రం చేయబడింది.', ml: 'ഈ തടാകം ഗ്രാമത്തിലെ സന്നദ്ധപ്രവർത്തകർ വൃത്തിയാക്കി.', mr: 'हा तलाव गावातील स्वयंसेवकांनी स्वच्छ केला.', bn: 'এই হ্রদটি গ্রামের স্বেচ্ছাসেবকরা পরিষ্কার করেছিলেন।', gu: 'આ તળાવ ગામના સ્વયંસેવકો દ્વારા સાફ કરવામાં આવ્યું.', pa: 'ਇਹ ਝੀਲ ਪਿੰਡ ਦੇ ਸਵੈ-ਸੇਵਕਾਂ ਵੱਲੋਂ ਸਾਫ਼ ਕੀਤੀ ਗਈ।', or: 'ଏହି ପୋଖରୀକୁ ଗାଁର ସ୍ୱେଚ୍ଛାସେବୀମାନେ ସଫା କଲେ।', ur: 'اس جھیل کو گاؤں کے رضاکاروں نے صاف کیا۔', es: 'Este lago fue limpiado por voluntarios del pueblo.', fr: 'Ce lac a été nettoyé par des bénévoles du village.', de: 'Dieser See wurde von Freiwilligen aus dem Dorf gereinigt.', pt: 'Este lago foi limpo por voluntários da aldeia.', ru: 'Это озеро очистили волонтёры из деревни.', ar: 'تم تنظيف هذه البحيرة على يد متطوعين من القرية.', zh: '这个湖是由村里的志愿者清理的。', ja: 'この湖は村のボランティアによってきれいにされました。', ko: '이 호수는 마을 자원봉사자들이 청소했어요.' }
};

// The questions and tasks in Kannada (content/asks/kn.js), for a Kannada speaker learning English.
const ENGLISH = 'ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ';
const asks = {
    questions: {
        'grammar-advanced-4': { q3: 'ಯಾವುದು ಸರಿ?', q7: '"The students cleaned the lake." ಈ ವಾಕ್ಯದ ಕರ್ಮಣಿ (passive) ರೂಪವನ್ನು ಆರಿಸಿ.' },
        'reading-advanced-4': {
            q1: 'ಎರಡು ವರ್ಷಗಳ ಹಿಂದೆ ಕ್ಯಾಂಟೀನ್‌ನಲ್ಲಿ ಇದ್ದ ಸಮಸ್ಯೆ ಏನು?',
            q2: 'ಪ್ರತಿಯೊಬ್ಬ ವಿದ್ಯಾರ್ಥಿಗೆ ಏನು ಮಾಡಲು ಹೇಳಲಾಯಿತು?',
            q3: 'ಹಾಸ್ಟೆಲ್ ಛಾವಣಿಗಳ ಮಳೆನೀರಿಗೆ ಈಗ ಏನಾಗುತ್ತದೆ?',
            q4: 'ಕಾಲೇಜಿನ ವಿದ್ಯುತ್ತಿನಲ್ಲಿ ಎಷ್ಟು ಭಾಗವನ್ನು ಸೂರ್ಯನಿಂದ ಉತ್ಪಾದಿಸಲಾಗುತ್ತದೆ?',
            q5: '"small changes add up" ಎನ್ನುವಾಗ ಮೇಘನಾಳ ಅರ್ಥವೇನು?'
        },
        'speaking-advanced-4': {
            q1: 'ಸ್ನೇಹಾ ಡಾ. ರಮೇಶ್ ಅವರನ್ನು ಭೇಟಿಯಾಗಲು ಏಕೆ ಬಂದಿದ್ದಾಳೆ?',
            q2: 'ಪ್ರತಿದಿನ ಎಷ್ಟು ಪ್ಲಾಸ್ಟಿಕ್ ಬಾಟಲಿಗಳನ್ನು ಎಸೆಯಲಾಗುತ್ತದೆ?',
            q3: 'ನೀರಿನ ಫಿಲ್ಟರ್‌ಗಳ ವೆಚ್ಚದ ಒಂದು ಭಾಗವನ್ನು ಯಾರು ಭರಿಸಬಹುದು?',
            q4: 'ಫಲಿತಾಂಶಗಳನ್ನು ಯಾವಾಗ ಪರಿಶೀಲಿಸಲಾಗುವುದು?'
        }
    },
    writing: {
        'reading-advanced-4': {
            w3: `"conserve" ಮತ್ತು "water" ಪದಗಳನ್ನು ಬಳಸಿ ${ENGLISH} ಒಂದು ವಾಕ್ಯ ಬರೆಯಿರಿ.`,
            w4: `ಕ್ಯಾಂಪಸ್ ಅನ್ನು ಹೆಚ್ಚು ಹಸಿರಾಗಿಸುವ ಒಂದು ಬದಲಾವಣೆಯನ್ನು ಸೂಚಿಸಿ, ನಿಮ್ಮ ಕಾಲೇಜಿನ ಪ್ರಾಂಶುಪಾಲರಿಗೆ ${ENGLISH} ಒಂದು ಇಮೇಲ್ (6 ರಿಂದ 8 ವಾಕ್ಯಗಳು) ಬರೆಯಿರಿ. ಕನಿಷ್ಠ ಒಂದು ಕರ್ಮಣಿ (passive) ವಾಕ್ಯವನ್ನು ಬಳಸಿ.`
        }
    },
    speaking: {
        'speaking-advanced-4': {
            prompt: `ನೀವು ಒಬ್ಬ ವಿದ್ಯಾರ್ಥಿ ನಾಯಕರು. ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ನೀರು ಅಥವಾ ವಿದ್ಯುತ್ ಉಳಿಸಲು ಒಂದು ಯೋಜನೆಯನ್ನು ಕಾಲೇಜಿನ ಅಧಿಕಾರಿಯೊಬ್ಬರಿಗೆ ${ENGLISH} 6 ರಿಂದ 8 ವಾಕ್ಯಗಳಲ್ಲಿ ಸೂಚಿಸಿ: ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ, ನಿಮ್ಮ ಯೋಜನೆಯನ್ನು ಹೇಳಿ, ಅದನ್ನು ಹೇಗೆ ಮಾಡಲಾಗುವುದು ಅಥವಾ ಅದರ ವೆಚ್ಚವನ್ನು ಹೇಗೆ ಭರಿಸಲಾಗುವುದು ಎಂದು ಹೇಳಿ, ಕನಿಷ್ಠ ಒಂದು ಕರ್ಮಣಿ (passive) ವಾಕ್ಯವನ್ನು ಬಳಸಿ, ಮತ್ತು ಒಂದು ಸಂಭವನೀಯ ಚಿಂತೆಗೆ ಉತ್ತರಿಸಿ.`,
            checklist: ['ಅಧಿಕಾರಿಯನ್ನು ವಂದಿಸಿ ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿದೆ', 'ಸ್ಪಷ್ಟವಾದ ಯೋಜನೆಯನ್ನು ನೀಡಿದೆ', 'ಕನಿಷ್ಠ ಒಂದು ಕರ್ಮಣಿ (passive) ವಾಕ್ಯವನ್ನು ಸರಿಯಾಗಿ ಬಳಸಿದೆ', 'ಒಂದು ಸಂಭವನೀಯ ಚಿಂತೆಗೆ ಉತ್ತರಿಸಿದೆ', 'ಮಾತುಕತೆಯನ್ನು ವಿನಯದಿಂದ ಮುಗಿಸಿದೆ', 'ಸ್ಪಷ್ಟವಾಗಿ, ಒಂದೇ ವೇಗದಲ್ಲಿ ಮಾತನಾಡಿದೆ']
        }
    }
};

/**
 * How the words and sentences sound, in English letters, in each language a
 * student may not be able to read (content/sounds): `words` by English word;
 * `lines` (the sentence) and `glosses` (the English of each of its words, "|"
 * between them) by the translation lesson's item id.
 */
const sounds = {
    ja: {
        words: { pollution: 'osen', climate: 'kikou', renewable: 'saisei kanou na', conserve: 'setsuyaku suru, hogo suru', recycle: 'risaikuru suru', emission: 'haishutsu', drought: 'kanbatsu', biodiversity: 'seibutsu tayousei' },
        lines: {
            i1: 'osen', i2: 'kanbatsu', i3: 'watashitachi no daigaku de wa biniiru bukuro ga kinshi sarete imasu',
            i4: 'watashitachi wa mizu o setsuyaku shinakereba narimasen', i5: 'kaze to taiyou no hikari wa saisei kanou na enerugii gen desu',
            i6: 'raigetsu, toshokan no yane ni taiyoukou paneru ga secchi saremasu',
            q1: 'toshi de wa taiki osen ga hidoku natte imasu', q2: 'kami wa maishuu risaikuru saremasu',
            q3: 'kanbatsu no sei de, nouka no hitotachi wa totemo kurushimimashita', q4: 'kono mizuumi wa mura no borantia ni yotte kirei ni saremashita'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "we|'s (our)|college|at|(topic marker)|plastic|bag|(subject marker)|ban|being done|is",
            i4: "we|(topic marker)|water|(object marker)|saving|if (we) do not do|it will not do (must)", i5: "wind|and|sun|'s (of)|light|(topic marker)|renewal|possible|(adjective)|energy|source|is",
            i6: "next month|library|'s (of)|roof|on|sunlight|panels|(subject marker)|installation|will be done",
            q1: "cities|in|(topic marker)|air|pollution|(subject marker)|bad|becoming|is", q2: "paper|(topic marker)|every week|recycling|is done",
            q3: "drought|'s (of)|fault|because of|farm|'s (of)|people|(topic marker)|very|suffered", q4: "this|lake|(topic marker)|village|'s (of)|volunteers|by|(means of)|clean|(into)|was made"
        }
    },
    zh: {
        words: { pollution: 'wūrǎn', climate: 'qìhòu', renewable: 'kě zàishēng', conserve: 'jiéyuē, bǎohù', recycle: 'huíshōu lìyòng', emission: 'páifàng', drought: 'gānhàn', biodiversity: 'shēngwù duōyàngxìng' },
        lines: {
            i1: 'wūrǎn', i2: 'gānhàn', i3: 'wǒmen xuéyuàn yǐjīng jìnzhǐ shǐyòng sùliàodài', i4: 'wǒmen bìxū jiéyuē yòng shuǐ',
            i5: 'fēng hé yángguāng shì kě zàishēng néngyuán', i6: 'xià gè yuè túshūguǎn de wūdǐng shang jiāng ānzhuāng tàiyángnéng diànchíbǎn',
            q1: 'chéngshì lǐ de kōngqì wūrǎn yuè lái yuè yánzhòng', q2: 'zhǐzhāng měi zhōu dōu huì bèi huíshōu lìyòng',
            q3: 'yóuyú gānhàn, nóngmínmen chīle hěn duō kǔ', q4: 'zhège hú shì yóu cūn lǐ de zhìyuànzhě qīnglǐ de'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "we (our)|college|already|ban|use|plastic bags", i4: "we|must|save|use|water",
            i5: "wind|and|sunlight|are|can|renew|energy sources", i6: "next|(measure word)|month|library|'s (of)|roof|on|will|install|solar|panels",
            q1: "city|in|'s (of)|air|pollution|more|(and)|more|serious", q2: "paper|every|week|all|will|(passive marker)|recycle|use",
            q3: "because of|drought|farmers|ate (suffered)|very|much|bitterness (hardship)", q4: "this|lake|(it) was|by|village|in|'s (of)|volunteers|cleaned|(it was … that)"
        }
    },
    ko: {
        words: { pollution: 'oyeom', climate: 'gihu', renewable: 'jaesaeng ganeunghan', conserve: 'bojonhada, akkida', recycle: 'jaehwaryonghada', emission: 'baechul', drought: 'gamum', biodiversity: 'saengmul dayangseong' },
        lines: {
            i1: 'oyeom', i2: 'gamum', i3: 'uri daehageseoneun binilbongji sayongi geumjidoeeosseoyo', i4: 'urineun mureul akkyeoya haeyo',
            i5: 'baramgwa haetbicheun jaesaeng ganeunghan eneojiwonieyo', i6: 'daeum dare doseogwan jibunge taeyanggwang paeneori seolchidoel geoyeyo',
            q1: 'dosieseo daegi oyeomi neureonago isseoyo', q2: 'jongineun maeju jaehwaryongdwaeyo', q3: 'gamum ttaemune nongbudeuri mani gosaenghaesseoyo',
            q4: 'i hosuneun maeul jawonbongsajadeuri cheongsohaesseoyo'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "our|at the college|plastic bag|use|was banned", i4: "we|water|must save|(it is needed)",
            i5: "wind and|sunlight|renewal|possible|energy sources (they are)", i6: "next|in the month|library|on the roof|solar|panels|be installed|will",
            q1: "in the cities|air|pollution|increasing|is", q2: "paper|every week|is recycled", q3: "drought|because of|farmers|a lot|suffered",
            q4: "this|lake|village|volunteers|cleaned"
        }
    },
    ru: {
        words: { pollution: 'zagryazneniye', climate: 'klimat', renewable: 'vozobnovlyayemy', conserve: 'sokhranyat, berech', recycle: 'pererabatyvat', emission: 'vybros', drought: 'zasukha', biodiversity: 'bioraznoobraziye' },
        lines: {
            i1: 'zagryazneniye', i2: 'zasukha', i3: 'v nashem kolledzhe plastikovye pakety zapreshcheny', i4: 'my dolzhny berech vodu',
            i5: 'veter i solnechny svet vozobnovlyayemye istochniki energii', i6: 'v sleduyushchem mesyatse na kryshe biblioteki budut ustanovleny solnechnye paneli',
            q1: 'v gorodakh rastyot zagryazneniye vozdukha', q2: 'bumagu pererabatyvayut kazhduyu nedelyu', q3: 'iz-za zasukhi fermery ochen postradali',
            q4: 'eto ozero ochistili volontyory iz derevni'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "in|our|college|plastic|bags|are banned", i4: "we|must|save|water",
            i5: "wind|and|solar (sun's)|light|renewable|sources|of energy", i6: "in|next|month|on|roof|of the library|will be|installed|solar|panels",
            q1: "in|cities|grows|pollution|of air", q2: "paper|(they) recycle|every|week", q3: "because of|drought|farmers|very|suffered",
            q4: "this|lake|cleaned|volunteers|from|village"
        }
    },
    ar: {
        words: { pollution: 'talawwuth', climate: 'munaakh', renewable: 'mutajaddid', conserve: 'yuhaafiz alaa', recycle: 'yu-eed at-tadweer', emission: 'inbi-aath', drought: 'jafaaf', biodiversity: 'at-tanawwu al-biyooloojee' },
        lines: {
            i1: 'talawwuth', i2: 'jafaaf', i3: 'tamma hazr al-akyaas al-blaasteekiyya fee kulliyyatinaa', i4: 'yajib an nuhaafiz alaa al-maa',
            i5: 'ar-riyaah wa-daw ash-shams masaadir mutajaddida lit-taaqa', i6: 'sa-yatimm tarkeeb alwaah shamsiyya alaa sath al-maktaba ash-shahr al-qaadim',
            q1: 'yatazaayad talawwuth al-hawaa fee al-mudun', q2: 'yu-aad tadweer al-waraq kull usboo', q3: 'aanaa al-muzaari-oon katheeran bisabab al-jafaaf',
            q4: 'tamma tanzeef haadhihi al-buhayra alaa yad mutatawwi-eena min al-qarya'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "was done|banning|the bags|the plastic|in|our college", i4: "it is necessary|that|we conserve|on (keep)|the water",
            i5: "the winds|and light of|the sun|sources|renewable|for energy", i6: "will be done|installing|panels|solar|on|roof of|the library|the month|the next",
            q1: "increases|pollution of|the air|in|the cities", q2: "is repeated|cycling of (recycling)|the paper|every|week", q3: "suffered|the farmers|a lot|because of|the drought",
            q4: "was done|cleaning of|this|the lake|on|hand of (by)|volunteers|from|the village"
        }
    },
    ur: {
        words: { pollution: 'aaloodagi', climate: 'aab-o-hawa', renewable: 'qaabil-e-tajdeed', conserve: 'mehfooz rakhna, bachaana', recycle: 'ree saaikal karna', emission: 'ikhraaj', drought: 'khushk saali', biodiversity: 'hayaatiyaati tanawwo' },
        lines: {
            i1: 'aaloodagi', i2: 'khushk saali', i3: 'hamaare kaalij mein plaastik ki theliyon par paabandi laga di gayi hai', i4: 'hamein paani bachaana chaahiye',
            i5: 'hawa aur dhoop tawaanaai ke qaabil-e-tajdeed zaraae hain', i6: 'agle maheene laaibreri ki chhat par solar painal lagaaye jaayen ge',
            q1: 'shehron mein fazaai aaloodagi badh rahi hai', q2: 'kaaghaz ko har hafte ree saaikal kiya jaata hai',
            q3: 'khushk saali ki wajah se kisaanon ko bahut takleef hui', q4: 'is jheel ko gaaon ke razaakaaron ne saaf kiya'
        },
        glosses: {
            i1: "pollution", i2: "dry|years (drought)", i3: "our|college|in|plastic|of|bags|on|ban|put|given|(was)|is", i4: "to us|water|to save|should",
            i5: "wind|and|sunshine|energy|of|renewable|sources|are", i6: "next|month|library|of|roof|on|solar|panels|put|will be|(will)",
            q1: "cities|in|air|pollution|grow|-ing|is", q2: "paper|(object marker)|every|week|re-|cycle|done|(passive)|is",
            q3: "dry|years (drought)|of|reason|from (because of)|farmers|to|much|hardship|happened", q4: "this|lake|(object marker)|village|of|volunteers|(did)|clean|did"
        }
    },
    ta: {
        words: { pollution: 'maasu, maasupaadu', climate: 'kaalanilai', renewable: 'pudhuppikkaththakka', conserve: 'paadhugaaththal, semiththal', recycle: 'marusuzharchi seidhal', emission: 'umizhvu', drought: 'varatchi', biodiversity: 'uyirppanmai' },
        lines: {
            i1: 'maasu', i2: 'varatchi', i3: 'engal kallooriyil pilaastik paigal thadai seiyappattullana', i4: 'naam thanneerai semikka vendum',
            i5: 'kaatrum sooriya oliyum pudhuppikkaththakka aatral moolangal', i6: 'aduththa maadham noolagaththin kooraiyil sooriya min thagadugal poruththappadum',
            q1: 'nagarangalil kaatru maasu adhigariththu varugiradhu', q2: 'kaagidham ovvoru vaaramum marusuzharchi seiyappadugiradhu',
            q3: 'varatchiyaal vivasaayigal migavum kashtappattanar', q4: 'indha eri giraamaththu thannaarvalargalaal suththam seiyappattadhu'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "our|in the college|plastic|bags|ban|have been done", i4: "we|water|to save|must",
            i5: "wind and|sun|light and|renewable|energy|sources", i6: "next|month|library's|on the roof|solar|electric|panels|will be fitted",
            q1: "in the cities|air|pollution|increasing|keeps coming (is going on)", q2: "paper|every|week (also)|recycling|is done",
            q3: "because of the drought|farmers|very much|suffered", q4: "this|lake|village's|by volunteers|clean|was done"
        }
    },
    te: {
        words: { pollution: 'kaalushyam', climate: 'vaataavaranam, seetoshnasthiti', renewable: 'punarutpaadaka', conserve: 'samrakshinchadam, podupu cheyadam', recycle: 'punarviniyogam cheyadam', emission: 'udgaaram', drought: 'karuvu', biodiversity: 'jeevavaividhyam' },
        lines: {
            i1: 'kaalushyam', i2: 'karuvu', i3: 'maa kalaashaalalo plaastik sanchulu nishedhinchabaddaayi', i4: 'manam neetini podupu cheyaali',
            i5: 'gaali mariyu sooryarashmi punarutpaadaka shakti vanarulu', i6: 'vachche nela granthaalayam paikappu meeda saura phalakaalu amarchabadataayi',
            q1: 'nagaraallo vaayu kaalushyam perugutondi', q2: 'kaagitam prati vaaram punarviniyogam cheyabadutundi', q3: 'karuvu valla raitulu chaalaa kashtapaddaaru',
            q4: 'ee cheruvu graama svachchanda sevakulache shubhram cheyabadindi'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "our|in the college|plastic|bags|have been banned", i4: "we|water|saving|should do",
            i5: "wind|and|sunlight|renewable|energy|sources", i6: "coming (next)|month|library|roof|on|solar|panels|will be fitted",
            q1: "in the cities|air|pollution|is increasing", q2: "paper|every|week|reuse (recycling)|is done", q3: "drought|because of|farmers|very much|suffered",
            q4: "this|lake|village|voluntary|by the servants (volunteers)|clean|was done"
        }
    },
    ml: {
        words: { pollution: 'malineekaranam', climate: 'kaalaavastha', renewable: 'punarupayogikkaavunna', conserve: 'samrakshikkuka', recycle: 'punahchankramanam cheyyuka', emission: 'bahirgamanam', drought: 'varalcha', biodiversity: 'jaivavaividhyam' },
        lines: {
            i1: 'malineekaranam', i2: 'varalcha', i3: 'njangalude kolejil plaastik sanchikal nirodhichirikkunnu', i4: 'nammal vellam samrakshikkanam',
            i5: 'kaattum sooryaprakaashavum punarupayogikkaavunna oorja srothassukalaanu', i6: 'aduththa maasam laibrariyude melkkoorayil solaar paanalukal sthaapikkum',
            q1: 'nagarangalil vaayu malineekaranam koodikkondirikkunnu', q2: 'kadalaasu ellaa aazhchayum punahchankramanam cheyyunnu',
            q3: 'varalcha kaaranam karshakar valare kashtappettu', q4: 'ee thadaakam graamaththile sannadhapravarththakar vruththiyaakki'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "our|in the college|plastic|bags|have been banned", i4: "we|water|must conserve",
            i5: "wind and|sunlight and|renewable|energy|sources (they are)", i6: "next|month|library's|on the roof|solar|panels|will install",
            q1: "in the cities|air|pollution|keeps increasing", q2: "paper|all|week (every)|recycling|is done",
            q3: "drought|because of|farmers|very|suffered", q4: "this|lake|in the village|volunteers|cleaned"
        }
    },
    mr: {
        words: { pollution: 'pradooshan', climate: 'havaamaan', renewable: 'naveekaraneey', conserve: 'jatan karne, vaachavne', recycle: 'punarvaapar karne', emission: 'utsarjan', drought: 'dushkaal', biodiversity: 'jaivavividhataa' },
        lines: {
            i1: 'pradooshan', i2: 'dushkaal', i3: 'aamchyaa mahaavidyaalayaat plaastikchyaa pishavyaanvar bandi ghaalnyaat aali aahe', i4: 'aapan paani vaachavle paahije',
            i5: 'vaaraa aani sooryaprakaash he oorjeche naveekaraneey srot aahet', i6: 'pudhchyaa mahinyaat granthaalayaachyaa chhataavar saur painel basavle jaateel',
            q1: 'shaharaanmadhye vaayoo pradooshan vaadhat aahe', q2: 'kaagadaachaa dar aathavdyaalaa punarvaapar kelaa jaato',
            q3: 'dushkaalaamule shetkaryaanche khoop haal jhaale', q4: 'haa talaav gaavaateel swayansevakaanni swachchh kelaa'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "our|in the college|of plastic|on bags|ban|in putting|came|is", i4: "we|water|saved|should",
            i5: "wind|and|sunlight|these|of energy|renewable|sources|are", i6: "next|in the month|of the library|on the roof|solar|panels|fitted|will be",
            q1: "in the cities|air|pollution|increasing|is", q2: "of paper|every|to the week|reuse (recycling)|done|is (passive)",
            q3: "because of the drought|farmers'|a lot|hardship|happened", q4: "this|lake|of the village|by the volunteers|clean|did"
        }
    },
    bn: {
        words: { pollution: 'dushon', climate: 'jolobayu', renewable: 'nobayonjoggo', conserve: 'shongrokkhon kora', recycle: 'punorbyabohar kora', emission: 'nirgomon', drought: 'khora', biodiversity: 'jibobaichitro' },
        lines: {
            i1: 'dushon', i2: 'khora', i3: 'amader koleje plastiker byag nishiddho kora hoyechhe', i4: 'amader jol shongrokkhon kora uchit',
            i5: 'batash o surjer alo nobayonjoggo shoktir utsho', i6: 'agami mashe gronthagarer chhade shour pyanel boshano hobe',
            q1: 'shohorgulote bayudushon barchhe', q2: 'proti shoptahe kagoj punorbyabohar kora hoy', q3: 'khorar karone krishokera khub koshto peyechhilen',
            q4: 'ei hrodti gramer shechchhashebokra porishkar korechhilen'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "our|in the college|of plastic|bags|banned|done|has been", i4: "our (we)|water|conservation|doing|should",
            i5: "wind|and|sun's|light|renewable|of energy|source", i6: "next|in the month|of the library|on the roof|solar|panels|fitting|will be",
            q1: "in the cities|air pollution|is increasing", q2: "every|in the week|paper|reuse (recycling)|done|is", q3: "of the drought|because|farmers|very|hardship|got (suffered)",
            q4: "this|lake (the)|of the village|volunteers|clean|had made"
        }
    },
    gu: {
        words: { pollution: 'pradooshan', climate: 'aabohavaa', renewable: 'punahpraapya', conserve: 'sanrakshan karvun, bachaavvun', recycle: 'risaaykal karvun', emission: 'utsarjan', drought: 'dukaal', biodiversity: 'jaivavividhataa' },
        lines: {
            i1: 'pradooshan', i2: 'dukaal', i3: 'amaari kolejmaan plaastikni theliyo par pratibandh mookvaamaan aavyo chhe', i4: 'aapne paani bachaavvun joie',
            i5: 'pavan ane sooryaprakaash oorjaanaa punahpraapya strot chhe', i6: 'aavtaa mahine pustakaalayni chhat par saur penal lagaavvaamaan aavshe',
            q1: 'shaheromaan vaayu pradooshan vadhi rahyun chhe', q2: 'kaagalne dar athvaadiye risaaykal karvaamaan aave chhe',
            q3: 'dukaalne kaarane khedootoe khoob mushkeli vethi', q4: 'aa talaav gaamnaa svayansevako dvaaraa saaf karvaamaan aavyun'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "our|in the college|of plastic|bags|on|ban|in putting|came|is", i4: "we|water|to save|should",
            i5: "wind|and|sunlight|of energy|renewable|sources|are", i6: "coming (next)|month|library's|roof|on|solar|panels|in fitting|will come (will be)",
            q1: "in the cities|air|pollution|increasing|-ing|is", q2: "paper (object)|every|week|recycle|in doing|comes (passive)|is",
            q3: "drought's|because|farmers (did)|a lot|hardship|suffered", q4: "this|lake|village's|volunteers|by|clean|in doing|came (was)"
        }
    },
    pa: {
        words: { pollution: 'pradooshan', climate: 'jalvaayu', renewable: 'naviaaunyog', conserve: 'sambhaalnaa, bachaaunaa', recycle: 'reesaaikal karnaa', emission: 'nikaas', drought: 'sokaa', biodiversity: 'jaiv vibhinntaa' },
        lines: {
            i1: 'pradooshan', i2: 'sokaa', i3: 'saade kaalaj vich palaastik de lifaafiaan utte paabandi lagaa ditti gayi hai', i4: 'saanoon paani bachaaunaa chaahidaa hai',
            i5: 'havaa ate dhupp oorjaa de naviaaunyog sarot han', i6: 'agle maheene laaibreri di chhatt utte solar painal lagaae jaange',
            q1: 'shahiraan vich havaa pradooshan vadh rihaa hai', q2: 'kaagaz noon har hafte reesaaikal keetaa jaandaa hai',
            q3: 'soke kaaran kisaanaan noon bahut mushkal hoi', q4: 'ih jheel pind de svai-sevakaan vallon saaf keeti gayi'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "our|college|in|plastic|of|bags|on|ban|put|given|(was)|is", i4: "to us|water|to save|should|is",
            i5: "wind|and|sunshine|energy|of|renewable|sources|are", i6: "next|month|library|of|roof|on|solar|panels|put|will be",
            q1: "cities|in|air|pollution|grow|-ing|is", q2: "paper|(object marker)|every|week|recycle|done|(passive)|is",
            q3: "drought|because of|farmers|to|much|difficulty|happened", q4: "this|lake|village|of|volunteers|by|clean|done|was"
        }
    },
    or: {
        words: { pollution: 'pradooshana', climate: 'jalabaayu', renewable: 'nabeekaranajogya', conserve: 'sanrakshana karibaa', recycle: 'punahchakrana karibaa', emission: 'nirgamana', drought: 'marudi', biodiversity: 'jaiba bibidhataa' },
        lines: {
            i1: 'pradooshana', i2: 'marudi', i3: 'aama kalejare plaastika byaaga nishiddha karaajaaichhi', i4: 'aame paani sanchaya karibaa uchita',
            i5: 'pabana o sooryaaloka nabeekaranajogya shaktira utsa', i6: 'aasantaa maasare paathaagaarara chhaata upare saura pyaanela lagaajiba',
            q1: 'saharagudikare baayu pradooshana badhuchhi', q2: 'kaagajaku prati saptaahare punahchakrana karaajaae',
            q3: 'marudi jogun chaasheemaane bahuta kashta paaile', q4: 'ehi pokhareeku gaanra swechchhaasebeemaane saphaa kale'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "our|in the college|plastic|bags|banned|has been made", i4: "we|water|saving|doing|should",
            i5: "wind|and|sunlight|renewable|of energy|source", i6: "coming (next)|in the month|library's|roof|on|solar|panels|will be fitted",
            q1: "in the cities|air|pollution|is increasing", q2: "paper (object)|every|in the week|recycling|is done",
            q3: "drought|because of|farmers|much|hardship|got (suffered)", q4: "this|pond (object)|village's|volunteers|clean|did"
        }
    },
    es: {
        words: { pollution: 'kon-ta-mee-na-syon', climate: 'klee-ma', renewable: 'reh-no-ba-bleh', conserve: 'kon-ser-bar, a-o-rrar', recycle: 'reh-see-klar', emission: 'eh-mee-syon', drought: 'seh-kee-a', biodiversity: 'bee-o-dee-ber-see-dad' },
        lines: {
            i1: 'kon-ta-mee-na-syon', i2: 'seh-kee-a', i3: 'en nwes-tra oo-nee-ber-see-dad seh an pro-ee-bee-do las bol-sas deh plas-tee-ko', i4: 'deh-beh-mos a-o-rrar a-gwa',
            i5: 'el byen-to ee la loos del sol son fwen-tes deh eh-ner-hee-a reh-no-ba-bleh',
            i6: 'el prok-see-mo mes seh eens-ta-la-ran pa-neh-les so-la-res en el teh-cho deh la bee-blyo-teh-ka',
            q1: 'la kon-ta-mee-na-syon del eye-reh es-ta ow-men-tan-do en las syoo-da-des', q2: 'el pa-pel seh reh-see-kla ka-da seh-ma-na',
            q3: 'los a-gree-kool-to-res soo-free-eh-ron moo-cho por la seh-kee-a', q4: 'es-teh la-go fweh leem-pya-do por bo-loon-ta-ryos del pweh-blo'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "in|our|university (college)|(passive)|have|banned|the|bags|of|plastic", i4: "we must|save|water",
            i5: "the|wind|and|the|light|of the|sun|are|sources|of|energy|renewable", i6: "the|next|month|(passive)|will be installed|panels|solar|on|the|roof|of|the|library",
            q1: "the|pollution|of the|air|is|increasing|in|the|cities", q2: "the|paper|(passive)|is recycled|each|week",
            q3: "the|farmers|suffered|a lot|because of|the|drought", q4: "this|lake|was|cleaned|by|volunteers|of the|village"
        }
    },
    fr: {
        words: { pollution: 'po-lew-syon', climate: 'klee-ma', renewable: 'ruh-noo-vuh-la-bluh', conserve: 'pray-zehr-vay, ay-ko-no-mee-zay', recycle: 'ruh-see-klay', emission: 'ay-mee-syon', drought: 'say-shuh-res', biodiversity: 'bee-o-dee-vehr-see-tay' },
        lines: {
            i1: 'po-lew-syon', i2: 'say-shuh-res', i3: 'lay sak ahn plas-teek on ay-tay an-tehr-dee dahn no-truh ew-nee-vehr-see-tay', i4: 'noo duh-von ay-ko-no-mee-zay loh',
            i5: 'luh vahn ay la lew-myehr dew so-lay son day soors day-nehr-zhee ruh-noo-vuh-la-bluh',
            i6: 'luh mwa pro-shan, day pa-noh so-lehr suh-ron an-sta-lay sewr luh twa duh la bee-blee-o-tek',
            q1: 'la po-lew-syon duh lehr og-mahnt dahn lay veel', q2: 'luh pa-pyay eh ruh-see-klay shak suh-men',
            q3: 'lay za-gree-kewl-tur on boh-koo soo-fehr a kohz duh la say-shuh-res', q4: 'suh lak a ay-tay neh-twa-yay par day bay-nay-vol dew vee-lazh'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "the|bags|in (of)|plastic|have|been|banned|in|our|university (college)", i4: "we|must|save|the water",
            i5: "the|wind|and|the|light|of the|sun|are|(some)|sources|of energy|renewable", i6: "the|month|next|(some)|panels|solar|will be|installed|on|the|roof|of|the|library",
            q1: "the|pollution|of|the air|increases|in|the|cities", q2: "the|paper|is|recycled|each|week",
            q3: "the|farmers|have|a lot|suffered|at|cause (because)|of|the|drought", q4: "this|lake|has|been|cleaned|by|(some)|volunteers|of the|village"
        }
    },
    de: {
        words: { pollution: 'fer-shmoot-tsoong', climate: 'klee-ma', renewable: 'er-noy-er-baar', conserve: 'beh-vah-ren, shpah-ren', recycle: 'ree-sy-keln', emission: 'aus-shtohs, eh-mee-syohn', drought: 'dew-reh', biodiversity: 'ar-ten-fil-falt, bee-o-dee-ver-zee-tayt' },
        lines: {
            i1: 'fer-shmoot-tsoong', i2: 'dew-reh', i3: 'an oon-zeh-rer hohkh-shoo-leh voor-den plas-tik-tew-ten fer-boh-ten', i4: 'veer mew-sen vas-ser shpah-ren',
            i5: 'vint oont zon-nen-likht zint er-noy-er-bah-reh eh-ner-gee-kvel-len',
            i6: 'nekh-sten moh-naht vehr-den auf dehm dakh dehr bib-lee-oh-tehk zo-lahr-mo-doo-leh in-stah-leert',
            q1: 'dee looft-fer-shmoot-tsoong in dehn shteh-ten nimt tsoo', q2: 'das pa-peer virt yay-deh vo-kheh ree-sy-kelt',
            q3: 'dee bau-ern hah-ben vay-gen dehr dew-reh zehr geh-lit-ten', q4: 'dee-zer zay voor-deh fon fry-vil-lee-gen aus dehm dorf geh-ry-nikt'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "at|our|college|were|plastic bags|banned", i4: "we|must|water|save",
            i5: "wind|and|sunlight|are|renewable|energy sources", i6: "next|month|will be|on|the|roof|of the|library|solar panels|installed",
            q1: "the|air pollution|in|the|cities|takes|up (increases)", q2: "the|paper|is|every|week|recycled",
            q3: "the|farmers|have|because of|the|drought|very|suffered", q4: "this|lake|was|by|volunteers|from|the|village|cleaned"
        }
    },
    pt: {
        words: { pollution: 'po-loo-ee-sown', climate: 'klee-ma', renewable: 'heh-no-va-vel', conserve: 'kon-ser-var, po-par', recycle: 'heh-see-klar', emission: 'eh-mee-sown', drought: 'seh-ka', biodiversity: 'bee-o-jee-ver-see-da-jee' },
        lines: {
            i1: 'po-loo-ee-sown', i2: 'seh-ka', i3: 'as sa-ko-las plas-chee-kas fo-rown pro-ee-bee-das na no-sa fa-kool-da-jee', i4: 'deh-veh-moos eh-ko-no-mee-zar a-gwa',
            i5: 'oo ven-too ee a loos doo sol sown fon-chees jee eh-ner-zhee-a heh-no-va-vel',
            i6: 'noo pro-see-moo mehs, seh-rown eens-ta-la-doos pie-nays so-la-rees noo teh-lya-doo da bee-blee-o-teh-ka',
            q1: 'a po-loo-ee-sown doo ar es-ta ow-men-tan-doo nas see-da-jees', q2: 'oo pa-pehl eh heh-see-kla-doo to-da seh-ma-na',
            q3: 'oos a-gree-kool-to-rees so-freh-rown mween-too por kow-za da seh-ka', q4: 'es-chee la-goo foy leem-poo por vo-loon-ta-ryoos da al-day-a'
        },
        glosses: {
            i1: "pollution", i2: "drought", i3: "the|bags|plastic|were|banned|in the|our|college", i4: "we must|save|water",
            i5: "the|wind|and|the|light|of the|sun|are|sources|of|energy|renewable", i6: "in the|next|month|will be|installed|panels|solar|on the|roof|of the|library",
            q1: "the|pollution|of the|air|is|increasing|in the|cities", q2: "the|paper|is|recycled|every|week",
            q3: "the|farmers|suffered|a lot|for|cause (because)|of the|drought", q4: "this|lake|was|cleaned|by|volunteers|of the|village"
        }
    }
};

module.exports = {
    lessons,
    names: { 'vocab-advanced-4': ['Our planet', 'Taking action'] },
    tipsFrom: { 'translation-advanced-4': 'translation-advanced-kn-en' },
    words: { 'vocab-advanced-4': words },
    sentences: { 'translation-advanced-4': sentences },
    asks,
    sounds
};
