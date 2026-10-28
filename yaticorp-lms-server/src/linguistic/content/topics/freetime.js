/**
 * Intermediate, topic 4 — Hobbies and free time (asked 2026-10-28: one more
 * topic for the Intermediate section). Two units (parts.js): Free time, and
 * Sports and music. The words and sentences in every language, and how they
 * sound in English letters, are below the lessons; written here, not by any
 * translation service — a native speaker should check them.
 */
const { w, mcq, fill, fix, order, dialogue, item, tipsOf } = require('./make');

const lessons = [
    {
        seedKey: 'vocab-intermediate-4', module: 'vocabulary', level: 'intermediate', order: 4,
        title: 'Hobbies and free time',
        summary: 'Words for what you enjoy doing at the weekend and after college.',
        learn: {
            intro: 'Learn each word with its Kannada meaning. Read the example sentence aloud to remember how the word is used.',
            points: ['Notice which words are nouns (a hobby, a concert) and which are verbs (to relax).', 'Use the words to talk about your own weekend.']
        },
        words: [
            w('hobby', 'ಹವ್ಯಾಸ', 'noun', 'My hobby is reading short stories in Kannada.', ['pastime', 'interest']),
            w('weekend', 'ವಾರಾಂತ್ಯ', 'noun', 'We visit my grandparents in Mysuru every weekend.', [], ['weekday']),
            w('relax', 'ವಿಶ್ರಾಂತಿ ಪಡೆ, ವಿರಮಿಸು', 'verb', 'I relax by listening to music after college.', ['rest', 'unwind'], ['worry']),
            w('concert', 'ಸಂಗೀತ ಕಛೇರಿ', 'noun', 'We went to a music concert at the palace grounds.', ['show', 'performance']),
            w('match', 'ಪಂದ್ಯ', 'noun', 'India won the cricket match by five wickets.', ['game']),
            w('hiking', 'ಚಾರಣ', 'noun', 'We went hiking in the hills of Kodagu last month.', ['trekking', 'walking']),
            w('painting', 'ಚಿತ್ರಕಲೆ, ವರ್ಣಚಿತ್ರ', 'noun', 'Painting helps her relax after a long day.', ['drawing', 'art']),
            w('favourite', 'ಅಚ್ಚುಮೆಚ್ಚಿನ, ನೆಚ್ಚಿನ', 'adjective', 'Kabaddi is my favourite sport.', ['best-loved', 'preferred'])
        ]
    },
    {
        seedKey: 'grammar-intermediate-4', module: 'grammar', level: 'intermediate', order: 4,
        title: 'Comparing: bigger, the biggest, more interesting',
        summary: 'Comparing two things, and saying which one is the most of all.',
        learn: {
            intro: 'To compare two things, use a comparative (taller, more interesting) with "than". To say one thing is the most of a whole group, use "the" with a superlative (the tallest, the most interesting).',
            points: [
                'Short words add -er and -est: tall → taller → the tallest. Words ending in -e add only -r and -st: nice → nicer → the nicest.',
                'Short words ending in one vowel and one consonant double the last letter: big → bigger → the biggest; hot → hotter → the hottest.',
                'Words ending in -y change the y to i: easy → easier → the easiest; happy → happier → the happiest.',
                'Longer words use more and most: interesting → more interesting → the most interesting.',
                'Some words change completely: good → better → the best; bad → worse → the worst.',
                'Use "than" after a comparative: Cricket is more popular than hockey. Use "the" before a superlative: It is the best film of the year. Never use both -er and more (not "more better").'
            ],
            examples: ['Kabaddi is faster than chess.', 'Mysuru Palace is the most beautiful building in our city.', 'My painting is better than my brother\'s.', 'This is the worst match of the season.']
        },
        practice: [
            mcq('p1', 'Hiking is ___ than watching TV.', ['more interesting', 'most interesting', 'interestinger'], 'more interesting', 'A long word takes "more" when we compare two things.'),
            fill('p2', 'My brother is ___ than me. (tall)', 'taller', 'A short word adds -er: tall → taller.'),
            mcq('p3', 'Sunday is the ___ day of the week for me.', ['best', 'better', 'good'], 'best', '"The" + superlative: good → better → the best.'),
            fix('p4', 'This concert is more better than the last one.', 'This concert is better than the last one.', '"Better" is already a comparative, so do not add "more".'),
            fill('p5', 'Today is ___ than yesterday. (hot)', 'hotter', 'Hot ends in one vowel and one consonant, so the t doubles: hotter.'),
            order('p6', ['Chess', 'is', 'than', 'harder', 'carrom'], 'Chess is harder than carrom.', 'Subject + is + comparative + than + the other thing.')
        ],
        quiz: [
            mcq('q1', 'Mount Everest is the ___ mountain in the world.', ['highest', 'higher', 'most high'], 'highest', 'It is the most of all the mountains, so we use "the" + -est.'),
            fill('q2', 'This book is ___ than that one. (interesting)', 'more interesting', 'A long word uses "more": more interesting.'),
            mcq('q3', 'Which is correct?', ['My sister is happier than me.', 'My sister is happiest than me.', 'My sister is happyer than me.'], 'My sister is happier than me.', 'Happy → happier: the y changes to i, and "than" follows a comparative.'),
            fix('q4', 'Rahul is the most tallest boy in our class.', 'Rahul is the tallest boy in our class.', 'Use -est or most, never both: the tallest.'),
            mcq('q5', 'The traffic today is ___ than last week.', ['worse', 'worst', 'badder'], 'worse', 'Bad → worse → the worst. Comparing two times uses "worse than".'),
            fill('q6', 'It was the ___ day of my life. (happy)', 'happiest', 'Happy → the happiest: the y changes to i.'),
            mcq('q7', 'Cricket is more popular ___ hockey in India.', ['than', 'then', 'that'], 'than', '"Than" comes after a comparative. "Then" is about time.'),
            order('q8', ['the', 'is', 'This', 'best', 'restaurant', 'in', 'Mysuru'], 'This is the best restaurant in Mysuru.', '"The" comes before the superlative: the best restaurant.')
        ]
    },
    {
        seedKey: 'reading-intermediate-4', module: 'reading', level: 'intermediate', order: 4,
        title: 'Meena\'s Weekend',
        summary: 'How a student in Hubballi spends her Saturdays and Sundays.',
        learn: {
            intro: 'Read the passage. Notice how Meena spends her weekend, and the words she uses to compare things.',
            passage: {
                title: 'Meena\'s Weekend',
                text: 'Meena is a first-year B.Com student in Hubballi. From Monday to Friday, she is busy with classes and assignments, so the weekend is her favourite time of the week. On Saturday mornings, she goes to a painting class near her house. Her teacher says her paintings are getting better every month. In the afternoon, she plays badminton with her cousin Kavya, who is younger but faster than her. On Sunday, Meena usually relaxes at home and listens to old Kannada film songs. Last Sunday, however, she went hiking with her college friends to a hill near Dharwad. The path was longer and harder than she expected, but the view from the top was the most beautiful thing she had ever seen. They sat under a tree, ate lemon rice and talked for an hour. "Hiking is more tiring than painting, but it is more fun too," Meena said on the way home. Now she wants to plan a hike every month.'
            }
        },
        quiz: [
            mcq('q1', 'Where does Meena study?', ['In Hubballi', 'In Mysuru', 'In Mangaluru', 'In Dharwad'], 'In Hubballi', '"Meena is a first-year B.Com student in Hubballi."'),
            mcq('q2', 'What does she do on Saturday mornings?', ['She goes to a painting class', 'She plays badminton', 'She goes hiking', 'She listens to film songs'], 'She goes to a painting class', '"On Saturday mornings, she goes to a painting class near her house."'),
            mcq('q3', 'Who is faster than Meena?', ['Her cousin Kavya', 'Her teacher', 'Her college friends', 'Her brother'], 'Her cousin Kavya', '"…her cousin Kavya, who is younger but faster than her."'),
            mcq('q4', 'How was the path to the hill?', ['Longer and harder than she expected', 'Short and easy', 'Wet and dangerous', 'Flat and boring'], 'Longer and harder than she expected', '"The path was longer and harder than she expected…"'),
            mcq('q5', 'What does Meena want to do now?', ['Plan a hike every month', 'Stop painting', 'Join a badminton club', 'Move to Dharwad'], 'Plan a hike every month', '"Now she wants to plan a hike every month."')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['than', 'is', 'Hiking', 'painting', 'harder'], answer: 'Hiking is harder than painting.', model: 'Hiking is harder than painting.' },
            { id: 'w2', type: 'jumbled', prompt: 'Put the words in order.', words: ['the best', 'is', 'Sunday', 'of the week', 'day'], answer: 'Sunday is the best day of the week.', model: 'Sunday is the best day of the week.' },
            { id: 'w3', type: 'sentence', prompt: 'Make one sentence with the word "hobby".', mustInclude: ['hobby'], minWords: 5, model: 'My favourite hobby is painting flowers.' },
            { id: 'w4', type: 'paragraph', prompt: 'Write 5 or 6 sentences about how you spend your weekend. Compare two things you do, using a word like "better", "more" or "the most".', minWords: 40, model: 'I usually spend my weekend with my family in Mandya. On Saturday, I help my mother in the morning and play cricket with my friends in the evening. On Sunday, I wake up later than on other days. I like reading stories, but I think cricket is more exciting than reading. The most relaxing part of my weekend is Sunday evening, when we all watch a film together. I always feel happier after a good weekend.', checklist: ['I said what I do on Saturday and Sunday', 'I compared two things with "than"', 'I used a superlative with "the" (the best, the most…)', 'I used the right form: -er or more, -est or most'] }
        ]
    },
    {
        seedKey: 'speaking-intermediate-4', module: 'speaking', level: 'intermediate', order: 4,
        title: 'Inviting a friend to a match',
        summary: 'Inviting someone, saying yes or no politely, and agreeing when and where to meet.',
        learn: {
            intro: 'Listen to how Pooja invites Arjun, how he says yes and no politely, and how they agree on a time and place.',
            dialogue: dialogue('speaking-intermediate-4', 'After class: Pooja invites her friend Arjun to a cricket match in Bengaluru.', [{ name: 'Pooja', voice: 'f' }, { name: 'Arjun', voice: 'm' }], [
                ['Pooja', 'Hi Arjun! Are you free on Saturday afternoon?'],
                ['Arjun', 'I think so. Why? What is the plan?'],
                ['Pooja', 'My uncle gave me two tickets for the cricket match at Chinnaswamy Stadium. Would you like to come with me?'],
                ['Arjun', 'I would love to! Thanks for asking me. What time does it start?'],
                ['Pooja', 'At two o\'clock. Shall we meet at MG Road metro station at one?'],
                ['Arjun', 'I have a class until half past twelve, so one is a bit early for me. How about quarter past one?'],
                ['Pooja', 'That is fine. Would you like to have dinner with my family after the match?'],
                ['Arjun', 'I\'m sorry, I can\'t this time. I promised my parents I would be home by eight. Maybe next weekend?'],
                ['Pooja', 'No problem. So, quarter past one at the metro station on Saturday.'],
                ['Arjun', 'Perfect. See you there!']
            ]),
            phrases: ['Would you like to come with me?', 'I would love to!', 'I\'m sorry, I can\'t this time. Maybe next weekend?']
        },
        quiz: [
            mcq('q1', 'Where is the match?', ['At Chinnaswamy Stadium', 'At the college ground', 'At MG Road', 'At Pooja\'s house'], 'At Chinnaswamy Stadium', 'Pooja says: "…two tickets for the cricket match at Chinnaswamy Stadium."'),
            mcq('q2', 'Why can Arjun not meet at one o\'clock?', ['He has a class until half past twelve', 'He has to work', 'He is ill', 'He has no ticket'], 'He has a class until half past twelve', '"I have a class until half past twelve, so one is a bit early for me."'),
            mcq('q3', 'Where and when will they meet?', ['At the metro station at quarter past one', 'At the stadium at two o\'clock', 'At college at half past twelve', 'At Pooja\'s house at eight'], 'At the metro station at quarter past one', '"So, quarter past one at the metro station on Saturday."'),
            mcq('q4', 'Why does Arjun say no to dinner?', ['He promised his parents he would be home by eight', 'He does not like the food', 'He has an exam', 'He is going to another match'], 'He promised his parents he would be home by eight', '"I promised my parents I would be home by eight."')
        ],
        speaking: {
            prompt: 'Invite a friend to a match, a concert or a hike. In 5 or 6 sentences, say what it is, when and where, ask if they would like to come, and agree on a time to meet.',
            sample: 'Hi Ravi, are you free on Sunday morning? There is a kabaddi match at the college ground at ten. Would you like to come with me? We can meet at the bus stop at half past nine. If you are busy, that is fine; we can go another day. Please tell me by Friday.',
            checklist: ['I greeted my friend', 'I said what, when and where', 'I invited with "Would you like to…?"', 'I suggested a time and place to meet', 'I was polite about a "no"', 'I spoke in full sentences']
        }
    },
    {
        seedKey: 'translation-intermediate-4', module: 'translation', level: 'intermediate', order: 4, direction: 'kn-en',
        title: 'Free time: Kannada → English',
        summary: 'Hobbies, weekends, matches and comparing things.',
        learn: { intro: 'Translate each Kannada sentence into English. Watch the comparing words (than, more, the best) and the small words English needs.', points: tipsOf('translation-intermediate-kn-en') },
        items: [
            item('i1', 'word', 'vocabulary', 'ಹವ್ಯಾಸ', 'hobby', 'A hobby is something you enjoy doing in your free time.', ['a hobby', 'the hobby', 'hobbies', 'pastime', 'a pastime']),
            item('i2', 'word', 'vocabulary', 'ವಾರಾಂತ್ಯ', 'weekend', 'The weekend is the end of the week: Saturday and Sunday.', ['the weekend', 'a weekend', 'weekends', 'week end', 'week-end']),
            item('i3', 'sentence', 'vocabulary', 'ನನ್ನ ಹವ್ಯಾಸ ಚಿತ್ರಕಲೆ.', 'My hobby is painting.', 'English needs "is" to join the two parts: My hobby is painting.', ['Painting is my hobby.', 'My hobby is painting pictures.', 'My hobby is to paint.']),
            item('i4', 'sentence', 'grammar', 'ಕ್ರಿಕೆಟ್ ಕಬಡ್ಡಿಗಿಂತ ಹೆಚ್ಚು ಜನಪ್ರಿಯವಾಗಿದೆ.', 'Cricket is more popular than kabaddi.', 'When you compare two things, English uses "than". A long word like popular takes "more": more popular than.', ['Cricket is more famous than kabaddi.', 'Cricket is much more popular than kabaddi.', 'Cricket is more popular compared to kabaddi.']),
            item('i5', 'sentence', 'daily conversation', 'ಭಾನುವಾರ ನೀವು ಏನು ಮಾಡುತ್ತೀರಿ?', 'What do you do on Sunday?', 'A question about a habit uses "do": What do you do…? Days take "on": on Sunday.', ['What do you do on Sundays?', 'What do you do on a Sunday?', 'What are you doing on Sunday?', 'What will you do on Sunday?', 'On Sunday, what do you do?', 'On Sundays, what do you do?']),
            item('i6', 'sentence', 'grammar', 'ಇದು ವರ್ಷದ ಅತ್ಯುತ್ತಮ ಪಂದ್ಯ.', 'This is the best match of the year.', '"The best" is the superlative of good: the + superlative, then "of the year".', ['It is the best match of the year.', 'It\'s the best match of the year.', 'This is the best game of the year.', 'This is the year\'s best match.', 'This is the best match this year.', 'This is the best match of this year.'])
        ],
        quiz: [
            item('q1', 'sentence', 'daily conversation', 'ನೀವು ನನ್ನ ಜೊತೆ ಸಂಗೀತ ಕಛೇರಿಗೆ ಬರುತ್ತೀರಾ?', 'Will you come to the concert with me?', 'An invitation can start "Will you come…?" or, more politely, "Would you like to come…?"', ['Will you come with me to the concert?', 'Would you like to come to the concert with me?', 'Would you like to come with me to the concert?', 'Will you come to a concert with me?', 'Would you come to the concert with me?', 'Can you come to the concert with me?', 'Are you coming to the concert with me?', 'Will you come to the music concert with me?']),
            item('q2', 'sentence', 'grammar', 'ನನ್ನ ತಮ್ಮ ನನಗಿಂತ ಎತ್ತರವಾಗಿದ್ದಾನೆ.', 'My younger brother is taller than me.', 'Comparing two people: tall becomes taller, followed by "than".', ['My younger brother is taller than I am.', 'My younger brother is taller than I.', 'My little brother is taller than me.', 'My little brother is taller than I am.', 'My brother is taller than me.', 'My brother is taller than I am.']),
            item('q3', 'sentence', 'vocabulary', 'ನಾನು ವಾರಾಂತ್ಯದಲ್ಲಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯುತ್ತೇನೆ.', 'I relax at the weekend.', 'For a habit, use the present simple. British English says "at the weekend"; American English says "on the weekend".', ['I relax on the weekend.', 'I relax at weekends.', 'I relax on weekends.', 'I rest at the weekend.', 'I rest on the weekend.', 'I rest on weekends.', 'At the weekend I relax.', 'On weekends I relax.', 'I take rest at the weekend.', 'I take a rest at the weekend.']),
            item('q4', 'sentence', 'grammar', 'ಟಿವಿ ನೋಡುವುದಕ್ಕಿಂತ ಚಾರಣ ಹೆಚ್ಚು ಆಸಕ್ತಿದಾಯಕವಾಗಿದೆ.', 'Hiking is more interesting than watching TV.', 'Interesting is a long word, so it takes "more": more interesting than. Kannada puts the "than" part first; English puts it last.', ['Hiking is more interesting than watching television.', 'Trekking is more interesting than watching TV.', 'Trekking is more interesting than watching television.', 'Hiking is more interesting than TV.', 'Going hiking is more interesting than watching TV.'])
        ]
    }
];

// Each word's meaning in every language (English: a definition, for English speakers).
const words = {
    hobby: { hi: 'शौक', ta: 'பொழுதுபோக்கு', te: 'అభిరుచి', ml: 'വിനോദം', mr: 'छंद', bn: 'শখ', gu: 'શોખ', pa: 'ਸ਼ੌਕ', or: 'ସଉକ', ur: 'مشغلہ', es: 'pasatiempo, afición', fr: 'passe-temps, loisir', de: 'Hobby', pt: 'passatempo, hobby', ru: 'хобби, увлечение', ar: 'هواية', zh: '爱好', ja: '趣味', ko: '취미', en: 'something you enjoy doing in your free time' },
    weekend: { hi: 'सप्ताहांत', ta: 'வார இறுதி', te: 'వారాంతం', ml: 'വാരാന്ത്യം', mr: 'आठवड्याचा शेवट', bn: 'সপ্তাহান্ত', gu: 'સપ્તાહાંત', pa: 'ਹਫ਼ਤੇ ਦਾ ਅੰਤ', or: 'ସପ୍ତାହାନ୍ତ', ur: 'ہفتے کا اختتام', es: 'fin de semana', fr: 'week-end', de: 'Wochenende', pt: 'fim de semana', ru: 'выходные', ar: 'عطلة نهاية الأسبوع', zh: '周末', ja: '週末', ko: '주말', en: 'Saturday and Sunday, when most people do not work or study' },
    relax: { hi: 'आराम करना', ta: 'ஓய்வெடுத்தல்', te: 'విశ్రాంతి తీసుకోవడం', ml: 'വിശ്രമിക്കുക', mr: 'आराम करणे', bn: 'বিশ্রাম নেওয়া', gu: 'આરામ કરવો', pa: 'ਆਰਾਮ ਕਰਨਾ', or: 'ବିଶ୍ରାମ ନେବା', ur: 'آرام کرنا', es: 'relajarse', fr: 'se détendre', de: 'sich entspannen', pt: 'relaxar', ru: 'отдыхать, расслабляться', ar: 'يسترخي', zh: '放松', ja: 'くつろぐ、リラックスする', ko: '쉬다, 긴장을 풀다', en: 'to rest and feel calm, without work or worry' },
    concert: { hi: 'संगीत कार्यक्रम', ta: 'இசை நிகழ்ச்சி', te: 'సంగీత కచేరీ', ml: 'സംഗീതക്കച്ചേരി', mr: 'संगीताची मैफल', bn: 'সংগীতানুষ্ঠান', gu: 'સંગીત કાર્યક્રમ', pa: 'ਸੰਗੀਤ ਸਮਾਰੋਹ', or: 'ସଙ୍ଗୀତ କାର୍ଯ୍ୟକ୍ରମ', ur: 'موسیقی کا پروگرام', es: 'concierto', fr: 'concert', de: 'Konzert', pt: 'show, concerto', ru: 'концерт', ar: 'حفلة موسيقية', zh: '音乐会', ja: 'コンサート', ko: '콘서트, 음악회', en: 'a show where people play music for an audience' },
    match: { hi: 'मैच, मुक़ाबला', ta: 'போட்டி', te: 'పోటీ, మ్యాచ్', ml: 'മത്സരം', mr: 'सामना', bn: 'খেলা, ম্যাচ', gu: 'મેચ, મુકાબલો', pa: 'ਮੈਚ, ਮੁਕਾਬਲਾ', or: 'ମ୍ୟାଚ୍', ur: 'میچ، مقابلہ', es: 'partido', fr: 'match', de: 'Spiel', pt: 'partida, jogo', ru: 'матч', ar: 'مباراة', zh: '比赛', ja: '試合', ko: '경기, 시합', en: 'a game between two players or teams, as in cricket or football' },
    hiking: { hi: 'पैदल यात्रा, ट्रेकिंग', ta: 'மலையேற்றம்', te: 'కొండ నడక, ట్రెక్కింగ్', ml: 'മലകയറ്റം, ട്രെക്കിങ്', mr: 'गिर्यारोहण, ट्रेकिंग', bn: 'পাহাড়ে হাঁটা, ট্রেকিং', gu: 'પગપાળા પ્રવાસ, ટ્રેકિંગ', pa: 'ਪੈਦਲ ਯਾਤਰਾ, ਟ੍ਰੈਕਿੰਗ', or: 'ପାହାଡ଼ ଚଢ଼ା, ଟ୍ରେକିଂ', ur: 'پیدل سفر، ٹریکنگ', es: 'senderismo', fr: 'randonnée', de: 'Wandern', pt: 'caminhada, trilha', ru: 'пеший туризм, поход', ar: 'المشي لمسافات طويلة', zh: '徒步、远足', ja: 'ハイキング', ko: '하이킹, 등산', en: 'going on long walks in the hills or the countryside' },
    painting: { hi: 'चित्रकारी, पेंटिंग', ta: 'ஓவியம்', te: 'చిత్రలేఖనం', ml: 'ചിത്രരചന', mr: 'चित्रकला', bn: 'ছবি আঁকা', gu: 'ચિત્રકામ', pa: 'ਚਿੱਤਰਕਾਰੀ', or: 'ଚିତ୍ରକଳା', ur: 'مصوری', es: 'pintura', fr: 'peinture', de: 'Malen, Malerei', pt: 'pintura', ru: 'живопись, рисование', ar: 'الرسم', zh: '画画、绘画', ja: '絵を描くこと、絵画', ko: '그림 그리기', en: 'making pictures with paint and a brush' },
    favourite: { hi: 'पसंदीदा, मनपसंद', ta: 'பிடித்தமான', te: 'ఇష్టమైన', ml: 'പ്രിയപ്പെട്ട', mr: 'आवडता', bn: 'প্রিয়', gu: 'મનપસંદ, પ્રિય', pa: 'ਮਨਪਸੰਦ', or: 'ପ୍ରିୟ', ur: 'پسندیدہ', es: 'favorito', fr: 'préféré', de: 'Lieblings-', pt: 'favorito, preferido', ru: 'любимый', ar: 'المفضل', zh: '最喜欢的', ja: 'お気に入りの、大好きな', ko: '가장 좋아하는', en: 'liked more than all the others' }
};

// Each Kannada sentence of the translation lesson in every language (the English is the lesson's own).
const sentences = {
    i1: { hi: 'शौक', ta: 'பொழுதுபோக்கு', te: 'అభిరుచి', ml: 'വിനോദം', mr: 'छंद', bn: 'শখ', gu: 'શોખ', pa: 'ਸ਼ੌਕ', or: 'ସଉକ', ur: 'مشغلہ', es: 'pasatiempo', fr: 'passe-temps', de: 'Hobby', pt: 'passatempo', ru: 'хобби', ar: 'هواية', zh: '爱好', ja: '趣味', ko: '취미' },
    i2: { hi: 'सप्ताहांत', ta: 'வார இறுதி', te: 'వారాంతం', ml: 'വാരാന്ത്യം', mr: 'आठवड्याचा शेवट', bn: 'সপ্তাহান্ত', gu: 'સપ્તાહાંત', pa: 'ਹਫ਼ਤੇ ਦਾ ਅੰਤ', or: 'ସପ୍ତାହାନ୍ତ', ur: 'ہفتے کا اختتام', es: 'fin de semana', fr: 'week-end', de: 'Wochenende', pt: 'fim de semana', ru: 'выходные', ar: 'عطلة نهاية الأسبوع', zh: '周末', ja: '週末', ko: '주말' },
    i3: { hi: 'मेरा शौक चित्रकारी है।', ta: 'என் பொழுதுபோக்கு ஓவியம் வரைவது.', te: 'నా అభిరుచి చిత్రలేఖనం.', ml: 'എന്റെ വിനോദം ചിത്രരചനയാണ്.', mr: 'माझा छंद चित्रकला आहे.', bn: 'আমার শখ ছবি আঁকা।', gu: 'મારો શોખ ચિત્રકામ છે.', pa: 'ਮੇਰਾ ਸ਼ੌਕ ਚਿੱਤਰਕਾਰੀ ਹੈ।', or: 'ମୋର ସଉକ ଚିତ୍ରକଳା।', ur: 'میرا مشغلہ مصوری ہے۔', es: 'Mi pasatiempo es pintar.', fr: 'Mon passe-temps, c’est la peinture.', de: 'Mein Hobby ist Malen.', pt: 'Meu passatempo é pintar.', ru: 'Моё хобби — рисование.', ar: 'هوايتي الرسم.', zh: '我的爱好是画画。', ja: '私の趣味は絵を描くことです。', ko: '제 취미는 그림 그리기예요.' },
    i4: { hi: 'क्रिकेट कबड्डी से ज़्यादा लोकप्रिय है।', ta: 'கிரிக்கெட் கபடியை விட அதிகப் பிரபலமானது.', te: 'క్రికెట్ కబడ్డీ కంటే ఎక్కువ ప్రజాదరణ పొందింది.', ml: 'ക്രിക്കറ്റ് കബഡിയെക്കാൾ ജനപ്രിയമാണ്.', mr: 'क्रिकेट कबड्डीपेक्षा जास्त लोकप्रिय आहे.', bn: 'ক্রিকেট কাবাডির চেয়ে বেশি জনপ্রিয়।', gu: 'ક્રિકેટ કબડ્ડી કરતાં વધુ લોકપ્રિય છે.', pa: 'ਕ੍ਰਿਕਟ ਕਬੱਡੀ ਨਾਲੋਂ ਵੱਧ ਮਸ਼ਹੂਰ ਹੈ।', or: 'କ୍ରିକେଟ କବାଡିଠାରୁ ଅଧିକ ଲୋକପ୍ରିୟ।', ur: 'کرکٹ کبڈی سے زیادہ مقبول ہے۔', es: 'El críquet es más popular que el kabaddi.', fr: 'Le cricket est plus populaire que le kabaddi.', de: 'Kricket ist beliebter als Kabaddi.', pt: 'O críquete é mais popular que o kabaddi.', ru: 'Крикет популярнее, чем кабадди.', ar: 'الكريكيت أكثر شعبية من الكبادي.', zh: '板球比卡巴迪更受欢迎。', ja: 'クリケットはカバディより人気があります。', ko: '크리켓은 카바디보다 더 인기가 있어요.' },
    i5: { hi: 'आप रविवार को क्या करते हैं?', ta: 'ஞாயிற்றுக்கிழமை நீங்கள் என்ன செய்வீர்கள்?', te: 'ఆదివారం మీరు ఏం చేస్తారు?', ml: 'ഞായറാഴ്ച നിങ്ങൾ എന്താണ് ചെയ്യുന്നത്?', mr: 'तुम्ही रविवारी काय करता?', bn: 'আপনি রবিবার কী করেন?', gu: 'તમે રવિવારે શું કરો છો?', pa: 'ਤੁਸੀਂ ਐਤਵਾਰ ਨੂੰ ਕੀ ਕਰਦੇ ਹੋ?', or: 'ଆପଣ ରବିବାର ଦିନ କ’ଣ କରନ୍ତି?', ur: 'آپ اتوار کو کیا کرتے ہیں؟', es: '¿Qué haces los domingos?', fr: 'Que fais-tu le dimanche ?', de: 'Was machst du am Sonntag?', pt: 'O que você faz no domingo?', ru: 'Что вы делаете в воскресенье?', ar: 'ماذا تفعل يوم الأحد؟', zh: '你星期天做什么？', ja: '日曜日は何をしますか。', ko: '일요일에 뭐 해요?' },
    i6: { hi: 'यह साल का सबसे अच्छा मैच है।', ta: 'இது இந்த ஆண்டின் மிகச் சிறந்த போட்டி.', te: 'ఇది ఈ సంవత్సరంలో అత్యుత్తమ మ్యాచ్.', ml: 'ഇത് ഈ വർഷത്തെ ഏറ്റവും മികച്ച മത്സരമാണ്.', mr: 'हा वर्षातील सर्वोत्तम सामना आहे.', bn: 'এটা বছরের সেরা খেলা।', gu: 'આ વર્ષની સૌથી સારી મેચ છે.', pa: 'ਇਹ ਸਾਲ ਦਾ ਸਭ ਤੋਂ ਵਧੀਆ ਮੈਚ ਹੈ।', or: 'ଏହା ବର୍ଷର ସବୁଠାରୁ ଭଲ ମ୍ୟାଚ୍।', ur: 'یہ سال کا سب سے اچھا میچ ہے۔', es: 'Este es el mejor partido del año.', fr: 'C’est le meilleur match de l’année.', de: 'Das ist das beste Spiel des Jahres.', pt: 'Esta é a melhor partida do ano.', ru: 'Это лучший матч года.', ar: 'هذه أفضل مباراة في السنة.', zh: '这是今年最好的比赛。', ja: 'これは今年一番の試合です。', ko: '이건 올해 최고의 경기예요.' },
    q1: { hi: 'क्या आप मेरे साथ संगीत कार्यक्रम में चलेंगे?', ta: 'நீங்கள் என்னுடன் இசை நிகழ்ச்சிக்கு வருவீர்களா?', te: 'మీరు నాతో సంగీత కచేరీకి వస్తారా?', ml: 'നിങ്ങൾ എന്റെ കൂടെ സംഗീതക്കച്ചേരിക്ക് വരുമോ?', mr: 'तुम्ही माझ्यासोबत संगीताच्या मैफलीला याल का?', bn: 'আপনি কি আমার সঙ্গে গানের অনুষ্ঠানে যাবেন?', gu: 'શું તમે મારી સાથે સંગીત કાર્યક્રમમાં આવશો?', pa: 'ਕੀ ਤੁਸੀਂ ਮੇਰੇ ਨਾਲ ਸੰਗੀਤ ਸਮਾਰੋਹ ਵਿੱਚ ਚੱਲੋਗੇ?', or: 'ଆପଣ ମୋ ସହିତ ସଙ୍ଗୀତ କାର୍ଯ୍ୟକ୍ରମକୁ ଆସିବେ କି?', ur: 'کیا آپ میرے ساتھ موسیقی کے پروگرام میں چلیں گے؟', es: '¿Vienes conmigo al concierto?', fr: 'Tu viens au concert avec moi ?', de: 'Kommst du mit mir zum Konzert?', pt: 'Você vem comigo ao show?', ru: 'Ты пойдёшь со мной на концерт?', ar: 'هل ستأتي معي إلى الحفلة الموسيقية؟', zh: '你愿意和我一起去听音乐会吗？', ja: '一緒にコンサートに行きませんか。', ko: '저랑 같이 콘서트에 갈래요?' },
    q2: { hi: 'मेरा छोटा भाई मुझसे लंबा है।', ta: 'என் தம்பி என்னை விட உயரமானவன்.', te: 'మా తమ్ముడు నా కంటే పొడవు.', ml: 'എന്റെ അനിയൻ എന്നെക്കാൾ ഉയരമുള്ളവനാണ്.', mr: 'माझा धाकटा भाऊ माझ्यापेक्षा उंच आहे.', bn: 'আমার ছোট ভাই আমার চেয়ে লম্বা।', gu: 'મારો નાનો ભાઈ મારા કરતાં ઊંચો છે.', pa: 'ਮੇਰਾ ਛੋਟਾ ਭਰਾ ਮੇਰੇ ਨਾਲੋਂ ਲੰਮਾ ਹੈ।', or: 'ମୋ ସାନ ଭାଇ ମୋ ଠାରୁ ଡେଙ୍ଗା।', ur: 'میرا چھوٹا بھائی مجھ سے لمبا ہے۔', es: 'Mi hermano menor es más alto que yo.', fr: 'Mon petit frère est plus grand que moi.', de: 'Mein jüngerer Bruder ist größer als ich.', pt: 'Meu irmão mais novo é mais alto que eu.', ru: 'Мой младший брат выше меня.', ar: 'أخي الأصغر أطول مني.', zh: '我弟弟比我高。', ja: '弟は私より背が高いです。', ko: '제 남동생은 저보다 키가 커요.' },
    q3: { hi: 'मैं सप्ताहांत में आराम करता हूँ।', ta: 'நான் வார இறுதியில் ஓய்வெடுக்கிறேன்.', te: 'నేను వారాంతంలో విశ్రాంతి తీసుకుంటాను.', ml: 'ഞാൻ വാരാന്ത്യത്തിൽ വിശ്രമിക്കുന്നു.', mr: 'मी आठवड्याच्या शेवटी आराम करतो.', bn: 'আমি সপ্তাহান্তে বিশ্রাম নিই।', gu: 'હું સપ્તાહાંતે આરામ કરું છું.', pa: 'ਮੈਂ ਹਫ਼ਤੇ ਦੇ ਅੰਤ ਵਿੱਚ ਆਰਾਮ ਕਰਦਾ ਹਾਂ।', or: 'ମୁଁ ସପ୍ତାହାନ୍ତରେ ବିଶ୍ରାମ ନିଏ।', ur: 'میں ہفتے کے آخر میں آرام کرتا ہوں۔', es: 'Me relajo el fin de semana.', fr: 'Je me détends le week-end.', de: 'Am Wochenende entspanne ich mich.', pt: 'Eu relaxo no fim de semana.', ru: 'По выходным я отдыхаю.', ar: 'أسترخي في عطلة نهاية الأسبوع.', zh: '我周末放松。', ja: '週末はゆっくり休みます。', ko: '저는 주말에 쉬어요.' },
    q4: { hi: 'ट्रेकिंग टीवी देखने से ज़्यादा दिलचस्प है।', ta: 'டிவி பார்ப்பதை விட மலையேற்றம் சுவாரசியமானது.', te: 'టీవీ చూడటం కంటే ట్రెక్కింగ్ ఎక్కువ ఆసక్తికరంగా ఉంటుంది.', ml: 'മലകയറ്റം ടിവി കാണുന്നതിനെക്കാൾ രസകരമാണ്.', mr: 'टीव्ही पाहण्यापेक्षा ट्रेकिंग जास्त मनोरंजक आहे.', bn: 'টিভি দেখার চেয়ে ট্রেকিং বেশি মজার।', gu: 'ટીવી જોવા કરતાં ટ્રેકિંગ વધુ રસપ્રદ છે.', pa: 'ਟੀਵੀ ਦੇਖਣ ਨਾਲੋਂ ਟ੍ਰੈਕਿੰਗ ਵੱਧ ਦਿਲਚਸਪ ਹੈ।', or: 'ଟିଭି ଦେଖିବାଠାରୁ ଟ୍ରେକିଂ ଅଧିକ ମଜାଦାର।', ur: 'ٹی وی دیکھنے سے ٹریکنگ زیادہ دلچسپ ہے۔', es: 'El senderismo es más interesante que ver la tele.', fr: 'La randonnée est plus intéressante que regarder la télé.', de: 'Wandern ist interessanter als Fernsehen.', pt: 'Fazer trilha é mais interessante do que ver TV.', ru: 'Ходить в походы интереснее, чем смотреть телевизор.', ar: 'المشي في الطبيعة أكثر متعة من مشاهدة التلفاز.', zh: '徒步比看电视更有意思。', ja: 'ハイキングはテレビを見るより面白いです。', ko: '하이킹은 텔레비전을 보는 것보다 더 재미있어요.' }
};

// The questions and tasks in Kannada (content/asks/kn.js), for a Kannada speaker learning English.
const ENGLISH = 'ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ';
const asks = {
    questions: {
        'grammar-intermediate-4': { q3: 'ಯಾವುದು ಸರಿ?' },
        'reading-intermediate-4': {
            q1: 'ಮೀನಾ ಎಲ್ಲಿ ಓದುತ್ತಾಳೆ?',
            q2: 'ಶನಿವಾರ ಬೆಳಿಗ್ಗೆ ಅವಳು ಏನು ಮಾಡುತ್ತಾಳೆ?',
            q3: 'ಮೀನಾಗಿಂತ ಯಾರು ಹೆಚ್ಚು ವೇಗವಾಗಿದ್ದಾರೆ?',
            q4: 'ಬೆಟ್ಟಕ್ಕೆ ಹೋಗುವ ದಾರಿ ಹೇಗಿತ್ತು?',
            q5: 'ಈಗ ಮೀನಾ ಏನು ಮಾಡಲು ಬಯಸುತ್ತಾಳೆ?'
        },
        'speaking-intermediate-4': {
            q1: 'ಪಂದ್ಯ ಎಲ್ಲಿ ನಡೆಯುತ್ತದೆ?',
            q2: 'ಅರ್ಜುನ್‌ಗೆ ಒಂದು ಗಂಟೆಗೆ ಏಕೆ ಭೇಟಿಯಾಗಲು ಆಗುವುದಿಲ್ಲ?',
            q3: 'ಅವರು ಎಲ್ಲಿ ಮತ್ತು ಯಾವಾಗ ಭೇಟಿಯಾಗುತ್ತಾರೆ?',
            q4: 'ಊಟಕ್ಕೆ ಬರಲು ಅರ್ಜುನ್ ಏಕೆ ಬೇಡ ಎನ್ನುತ್ತಾನೆ?'
        }
    },
    writing: {
        'reading-intermediate-4': {
            w3: `"hobby" ಪದವನ್ನು ಬಳಸಿ ${ENGLISH} ಒಂದು ವಾಕ್ಯ ಬರೆಯಿರಿ.`,
            w4: `ನಿಮ್ಮ ವಾರಾಂತ್ಯವನ್ನು ನೀವು ಹೇಗೆ ಕಳೆಯುತ್ತೀರಿ ಎಂದು ${ENGLISH} 5 ಅಥವಾ 6 ವಾಕ್ಯಗಳನ್ನು ಬರೆಯಿರಿ. "better", "more" ಅಥವಾ "the most" ಮುಂತಾದ ಪದ ಬಳಸಿ ನೀವು ಮಾಡುವ ಎರಡು ಕೆಲಸಗಳನ್ನು ಹೋಲಿಸಿ.`
        }
    },
    speaking: {
        'speaking-intermediate-4': {
            prompt: `ಒಂದು ಪಂದ್ಯ, ಸಂಗೀತ ಕಛೇರಿ ಅಥವಾ ಚಾರಣಕ್ಕೆ ನಿಮ್ಮ ಸ್ನೇಹಿತರನ್ನು ಆಹ್ವಾನಿಸಿ. ${ENGLISH} 5 ಅಥವಾ 6 ವಾಕ್ಯಗಳಲ್ಲಿ ಅದು ಏನು, ಯಾವಾಗ ಮತ್ತು ಎಲ್ಲಿ ಎಂದು ಹೇಳಿ, ಅವರು ಬರಲು ಇಷ್ಟಪಡುತ್ತಾರೆಯೇ ಎಂದು ಕೇಳಿ, ಭೇಟಿಯಾಗುವ ಸಮಯವನ್ನು ಒಪ್ಪಿಕೊಳ್ಳಿ.`,
            checklist: ['ಸ್ನೇಹಿತರನ್ನು ವಂದಿಸಿದೆ', 'ಏನು, ಯಾವಾಗ ಮತ್ತು ಎಲ್ಲಿ ಎಂದು ಹೇಳಿದೆ', '"Would you like to…?" ಬಳಸಿ ಆಹ್ವಾನಿಸಿದೆ', 'ಭೇಟಿಯಾಗುವ ಸಮಯ ಮತ್ತು ಸ್ಥಳವನ್ನು ಸೂಚಿಸಿದೆ', '"ಇಲ್ಲ" ಎಂಬ ಉತ್ತರಕ್ಕೂ ವಿನಯದಿಂದ ಪ್ರತಿಕ್ರಿಯಿಸಿದೆ', 'ಪೂರ್ಣ ವಾಕ್ಯಗಳಲ್ಲಿ ಮಾತನಾಡಿದೆ']
        }
    }
};

// How each word and sentence sounds, in English letters (content/sounds): `words` by English word, one sound per
// comma part of the word; `lines` and `glosses` by translation item id, one English meaning per word of the sound.
const sounds = {
    ja: {
        words: { hobby: 'shumi', weekend: 'shuumatsu', relax: 'kutsurogu, rirakkusu suru', concert: 'konsaato', match: 'shiai', hiking: 'haikingu', painting: 'e o kaku koto, kaiga', favourite: 'okiniiri no, daisuki na' },
        lines: {
            i1: 'shumi', i2: 'shuumatsu', i3: 'watashi no shumi wa e o kaku koto desu', i4: 'kuriketto wa kabadi yori ninki ga arimasu',
            i5: 'nichiyoubi wa nani o shimasu ka', i6: 'kore wa kotoshi ichiban no shiai desu', q1: 'issho ni konsaato ni ikimasen ka',
            q2: 'otouto wa watashi yori se ga takai desu', q3: 'shuumatsu wa yukkuri yasumimasu', q4: 'haikingu wa terebi o miru yori omoshiroi desu'
        },
        glosses: {
            i1: 'hobby', i2: 'weekend', i3: 'I|\'s (of)|hobby|(topic marker)|picture|(object marker)|draw|(the act of)|is',
            i4: 'cricket|(topic marker)|kabaddi|than|popularity|(subject marker)|has', i5: 'Sunday|(topic marker)|what|(object marker)|do|(question)',
            i6: 'this|(topic marker)|this year|the best|of|match|is', q1: 'together|(adverb)|concert|to|won\'t (you) go|(question)',
            q2: 'younger brother|(topic marker)|me|than|height|(subject marker)|tall|is', q3: 'weekend|(topic marker)|at ease|rest',
            q4: 'hiking|(topic marker)|TV|(object marker)|watch|than|interesting|is'
        }
    },
    zh: {
        words: { hobby: 'àihào', weekend: 'zhōumò', relax: 'fàngsōng', concert: 'yīnyuèhuì', match: 'bǐsài', hiking: 'túbù, yuǎnzú', painting: 'huàhuà, huìhuà', favourite: 'zuì xǐhuan de' },
        lines: {
            i1: 'àihào', i2: 'zhōumò', i3: 'wǒ de àihào shì huàhuà', i4: 'bǎnqiú bǐ kǎbādí gèng shòu huānyíng', i5: 'nǐ xīngqītiān zuò shénme',
            i6: 'zhè shì jīnnián zuì hǎo de bǐsài', q1: 'nǐ yuànyì hé wǒ yìqǐ qù tīng yīnyuèhuì ma', q2: 'wǒ dìdi bǐ wǒ gāo',
            q3: 'wǒ zhōumò fàngsōng', q4: 'túbù bǐ kàn diànshì gèng yǒu yìsi'
        },
        glosses: {
            i1: 'hobby', i2: 'weekend', i3: 'I|\'s (of)|hobby|is|painting', i4: 'cricket|than (compared with)|kabaddi|more|receive|welcome (popular)',
            i5: 'you|Sunday|do|what', i6: 'this|is|this year|most|good|\'s (of)|match', q1: 'you|willing|with|me|together|go|listen|concert|(question)',
            q2: 'my|younger brother|than (compared with)|me|tall', q3: 'I|weekend|relax', q4: 'hiking|than (compared with)|watch|TV|more|have|interest (interesting)'
        }
    },
    ko: {
        words: { hobby: 'chwimi', weekend: 'jumal', relax: 'swida, ginjangeul pulda', concert: 'konseoteu, eumakoe', match: 'gyeonggi, sihap', hiking: 'haiking, deungsan', painting: 'geurim geurigi', favourite: 'gajang joahaneun' },
        lines: {
            i1: 'chwimi', i2: 'jumal', i3: 'je chwimineun geurim geurigiyeyo', i4: 'keurikeseun kabadiboda deo inkkiga isseoyo', i5: 'iryoire mwo haeyo',
            i6: 'igeon orae choegoui gyeonggiyeyo', q1: 'jeorang gachi konseoteue gallaeyo', q2: 'je namdongsaengeun jeoboda kiga keoyo',
            q3: 'jeoneun jumare swieoyo', q4: 'haikingeun tellebijeoneul boneun geotppoda deo jaemiisseoyo'
        },
        glosses: {
            i1: 'hobby', i2: 'weekend', i3: 'my|hobby (topic)|picture|drawing is', i4: 'cricket (topic)|than kabaddi|more|popularity|has',
            i5: 'on Sunday|what|do', i6: 'this|this year|the best|match is', q1: 'with me|together|to the concert|will you go',
            q2: 'my|younger brother (topic)|than me|height|is big (tall)', q3: 'I|at the weekend|rest',
            q4: 'hiking (topic)|television|watching|than the act of|more|is fun'
        }
    },
    ru: {
        words: { hobby: 'khobbi, uvlecheniye', weekend: 'vykhodnye', relax: 'otdykhat, rasslablyatsya', concert: 'kontsert', match: 'match', hiking: 'peshy turizm, pokhod', painting: 'zhivopis, risovaniye', favourite: 'lyubimy' },
        lines: {
            i1: 'khobbi', i2: 'vykhodnye', i3: 'moyo khobbi risovaniye', i4: 'kriket populyarneye chem kabaddi', i5: 'shto vy delayete v voskresenye',
            i6: 'eto luchshiy match goda', q1: 'ty poydyosh so mnoy na kontsert', q2: 'moy mladshiy brat vyshe menya',
            q3: 'po vykhodnym ya otdykhayu', q4: 'khodit v pokhody interesneye chem smotret televizor'
        },
        glosses: {
            i1: 'hobby', i2: 'days off (weekend)', i3: 'my|hobby|drawing (painting)', i4: 'cricket|more popular|than|kabaddi',
            i5: 'what|you|do|on|Sunday', i6: 'this|best|match|of the year', q1: 'you|will go|with|me|to|concert',
            q2: 'my|younger|brother|taller|than me', q3: 'on|days off (weekends)|I|rest', q4: 'to go|on|hikes|more interesting|than|to watch|television'
        }
    },
    ar: {
        words: { hobby: 'hiwaaya', weekend: 'utlat nihaayat al-usboo', relax: 'yastarkhee', concert: 'hafla museeqiyya', match: 'mubaaraa', hiking: 'al-mashy li-masaafaat taweela', painting: 'ar-rasm', favourite: 'al-mufaddal' },
        lines: {
            i1: 'hiwaaya', i2: 'utlat nihaayat al-usboo', i3: 'hiwaayatee ar-rasm', i4: 'al-kreeket akthar sha-biyya min al-kabaadi',
            i5: 'maadha taf-al yawm al-ahad', i6: 'haadhihi afdal mubaaraa fis-sana', q1: 'hal sata-tee ma-ee ilaa al-hafla al-museeqiyya',
            q2: 'akhee al-asghar atwal minnee', q3: 'astarkhee fee utlat nihaayat al-usboo', q4: 'al-mashy fit-tabee-a akthar mut-a min mushaahadat at-tilfaaz'
        },
        glosses: {
            i1: 'hobby', i2: 'holiday of|end of|the week', i3: 'my hobby|the drawing (painting)', i4: 'the cricket|more|popularity|than|the kabaddi',
            i5: 'what|you do|day|the Sunday', i6: 'this|best|match|in the year', q1: '(question)|you will come|with me|to|the party|the musical (concert)',
            q2: 'my brother|the younger|taller|than me', q3: 'I relax|in|holiday of|end of|the week', q4: 'the walking|in nature|more|fun|than|watching|the television'
        }
    },
    ur: {
        words: { hobby: 'mashghala', weekend: 'hafte ka ikhtitaam', relax: 'aaraam karna', concert: 'mauseeqi ka program', match: 'match, muqaabla', hiking: 'paidal safar, trekking', painting: 'musawwari', favourite: 'pasandeeda' },
        lines: {
            i1: 'mashghala', i2: 'hafte ka ikhtitaam', i3: 'mera mashghala musawwari hai', i4: 'kirkit kabaddi se zyaada maqbool hai',
            i5: 'aap itwaar ko kya karte hain', i6: 'yeh saal ka sab se achchha match hai', q1: 'kya aap mere saath mauseeqi ke program mein chalenge',
            q2: 'mera chhota bhaai mujh se lamba hai', q3: 'main hafte ke aakhir mein aaraam karta hoon', q4: 'tee-vee dekhne se trekking zyaada dilchasp hai'
        },
        glosses: {
            i1: 'hobby', i2: 'week|of|end', i3: 'my|hobby|painting|is', i4: 'cricket|kabaddi|than|more|popular|is',
            i5: 'you|Sunday|on|what|do|are', i6: 'this|year|of|all|than|good|match|is', q1: '(question)|you|my|with|music|of|programme|in|will go',
            q2: 'my|younger|brother|me|than|tall|is', q3: 'I|week|of|end|in|rest|do|am', q4: 'TV|watching|than|trekking|more|interesting|is'
        }
    },
    ta: {
        words: { hobby: 'pozhudhupokku', weekend: 'vaara irudhi', relax: 'oyveduththal', concert: 'isai nigazhchi', match: 'potti', hiking: 'malaiyetram', painting: 'oviyam', favourite: 'pidiththamaana' },
        lines: {
            i1: 'pozhudhupokku', i2: 'vaara irudhi', i3: 'en pozhudhupokku oviyam varaivadhu', i4: 'kirikket kabadiyai vida adhigap prabalamaanadhu',
            i5: 'nyaayitrukkizhamai neengal enna seiveergal', i6: 'idhu indha aandin migach chirandha potti', q1: 'neengal ennudan isai nigazhchikku varuveergalaa',
            q2: 'en thambi ennai vida uyaramaanavan', q3: 'naan vaara irudhiyil oyvedukkiren', q4: 'tivi paarppadhai vida malaiyetram suvaarasiyamaanadhu'
        },
        glosses: {
            i1: 'hobby', i2: 'week|end', i3: 'my|hobby|picture|drawing', i4: 'cricket|kabaddi|than|more|is popular',
            i5: 'Sunday|you|what|will do', i6: 'this|this|year\'s|most|best|match', q1: 'you|with me|music|to the show|will you come',
            q2: 'my|younger brother|me|than|is tall', q3: 'I|week|at the end|rest', q4: 'TV|watching|than|hiking|is interesting'
        }
    },
    te: {
        words: { hobby: 'abhiruchi', weekend: 'vaaraantam', relax: 'vishraanti teesukovadam', concert: 'sangeeta kacheri', match: 'poti, myaach', hiking: 'konda nadaka, trekking', painting: 'chitralekhanam', favourite: 'ishtamaina' },
        lines: {
            i1: 'abhiruchi', i2: 'vaaraantam', i3: 'naa abhiruchi chitralekhanam', i4: 'kriket kabaddi kante ekkuva prajaadarana pondindi',
            i5: 'aadivaaram meeru em chestaaru', i6: 'idi ee samvatsaramlo atyuttama myaach', q1: 'meeru naato sangeeta kacheriki vastaaraa',
            q2: 'maa tammudu naa kante podavu', q3: 'nenu vaaraantamlo vishraanti teesukuntaanu', q4: 'teevee choodatam kante trekking ekkuva aasaktikaramgaa untundi'
        },
        glosses: {
            i1: 'hobby', i2: 'weekend', i3: 'my|hobby|painting', i4: 'cricket|kabaddi|than|more|popularity|has got',
            i5: 'Sunday|you|what|do', i6: 'this|this|in the year|best|match', q1: 'you|with me|music|to the concert|will you come',
            q2: 'our (my)|younger brother|me|than|tall', q3: 'I|at the weekend|rest|take', q4: 'TV|watching|than|trekking|more|interesting|is'
        }
    },
    ml: {
        words: { hobby: 'vinodam', weekend: 'vaaraanthyam', relax: 'vishramikkuka', concert: 'sangeethakkacheri', match: 'malsaram', hiking: 'malakayattam, trekking', painting: 'chithrarachana', favourite: 'priyappetta' },
        lines: {
            i1: 'vinodam', i2: 'vaaraanthyam', i3: 'ente vinodam chithrarachanayaanu', i4: 'krikkattu kabadiyekkaal janapriyamaanu',
            i5: 'njaayaraazhcha ningal enthaanu cheyyunnathu', i6: 'ithu ee varshathe ettavum mikacha malsaramaanu', q1: 'ningal ente koode sangeethakkacherikku varumo',
            q2: 'ente aniyan ennekkaal uyaramullavanaanu', q3: 'njaan vaaraanthyathil vishramikkunnu', q4: 'malakayattam tivi kaanunnathinekkaal rasakaramaanu'
        },
        glosses: {
            i1: 'hobby', i2: 'weekend', i3: 'my|hobby|is painting', i4: 'cricket|than kabaddi|is popular',
            i5: 'Sunday|you|what is|doing', i6: 'this|this|year\'s|most|best|is match', q1: 'you|my|with|to the concert|will (you) come',
            q2: 'my|younger brother|than me|is tall', q3: 'I|at the weekend|rest', q4: 'hiking|TV|than watching|is interesting'
        }
    },
    mr: {
        words: { hobby: 'chhand', weekend: 'aathvadyaacha shevat', relax: 'aaraam karne', concert: 'sangeetaachi maifal', match: 'saamna', hiking: 'giryaarohan, trekking', painting: 'chitrakala', favourite: 'aavadta' },
        lines: {
            i1: 'chhand', i2: 'aathvadyaacha shevat', i3: 'maajha chhand chitrakala aahe', i4: 'kriket kabaddipeksha jaasta lokapriya aahe',
            i5: 'tumhi ravivaari kaay karta', i6: 'haa varshaatil sarvottam saamna aahe', q1: 'tumhi maajhyaasobat sangeetaachya maifalila yaal ka',
            q2: 'maajha dhaakta bhaau maajhyaapeksha unch aahe', q3: 'mi aathvadyaachya shevati aaraam karto', q4: 'teevhee paahanyaapeksha trekking jaasta manoranjak aahe'
        },
        glosses: {
            i1: 'hobby', i2: 'week\'s|end', i3: 'my|hobby|painting|is', i4: 'cricket|than kabaddi|more|popular|is',
            i5: 'you|on Sunday|what|do', i6: 'this|of the year|best|match|is', q1: 'you|with me|of music|to the gathering (concert)|will come|(question)',
            q2: 'my|younger|brother|than me|tall|is', q3: 'I|of the week|at the end|rest|do', q4: 'TV|than watching|trekking|more|interesting|is'
        }
    },
    bn: {
        words: { hobby: 'shokh', weekend: 'shoptahanto', relax: 'bishram neoa', concert: 'shongitanushthan', match: 'khela, myach', hiking: 'pahare hanta, trekking', painting: 'chhobi anka', favourite: 'priyo' },
        lines: {
            i1: 'shokh', i2: 'shoptahanto', i3: 'amar shokh chhobi anka', i4: 'kriket kabadir cheye beshi jonopriyo', i5: 'apni robibar ki koren',
            i6: 'eta bochhorer shera khela', q1: 'apni ki amar shonge ganer onushthane jaben', q2: 'amar chhoto bhai amar cheye lomba',
            q3: 'ami shoptahante bishram nii', q4: 'tibhi dekhar cheye trekking beshi mojar'
        },
        glosses: {
            i1: 'hobby', i2: 'weekend', i3: 'my|hobby|picture|drawing', i4: 'cricket|kabaddi\'s|than|more|popular',
            i5: 'you|Sunday|what|do', i6: 'this|of the year|best|match (game)', q1: 'you|(question)|my|with|of songs|to the show|will go',
            q2: 'my|younger|brother|me (my)|than|tall', q3: 'I|at the weekend|rest|take', q4: 'TV|watching|than|trekking|more|fun'
        }
    },
    gu: {
        words: { hobby: 'shokh', weekend: 'saptaahaant', relax: 'aaraam karvo', concert: 'sangeet kaaryakram', match: 'mech, mukaablo', hiking: 'pagpaalaa pravaas, trekking', painting: 'chitrakaam', favourite: 'manpasand, priya' },
        lines: {
            i1: 'shokh', i2: 'saptaahaant', i3: 'maaro shokh chitrakaam chhe', i4: 'kriket kabaddi kartaan vadhu lokpriya chhe',
            i5: 'tame ravivaare shun karo chho', i6: 'aa varshni sauthi saari mech chhe', q1: 'shun tame maari saathe sangeet kaaryakramamaan aavsho',
            q2: 'maaro naano bhaai maaraa kartaan oocho chhe', q3: 'hun saptaahaante aaraam karun chhun', q4: 'teevee jovaa kartaan trekking vadhu rasprad chhe'
        },
        glosses: {
            i1: 'hobby', i2: 'weekend', i3: 'my|hobby|painting|is', i4: 'cricket|kabaddi|than|more|popular|is',
            i5: 'you|on Sunday|what|do|are', i6: 'this|year\'s|most|good|match|is', q1: '(question)|you|my|with|music|in the programme|will come',
            q2: 'my|younger|brother|me (my)|than|tall|is', q3: 'I|at the weekend|rest|do|am', q4: 'TV|watching|than|trekking|more|interesting|is'
        }
    },
    pa: {
        words: { hobby: 'shauk', weekend: 'hafte daa ant', relax: 'aaraam karnaa', concert: 'sangeet samaaroh', match: 'maich, mukaablaa', hiking: 'paidal yaatraa, traiking', painting: 'chittarkaari', favourite: 'manpasand' },
        lines: {
            i1: 'shauk', i2: 'hafte daa ant', i3: 'meraa shauk chittarkaari hai', i4: 'krikat kabaddi naalon vadh mashhoor hai',
            i5: 'tuseen aitvaar noon kee karde ho', i6: 'ih saal daa sabh ton vadhiaa maich hai', q1: 'kee tuseen mere naal sangeet samaaroh vich challoge',
            q2: 'meraa chhotaa bharaa mere naalon lammaa hai', q3: 'main hafte de ant vich aaraam kardaa haan', q4: 'teevee dekhan naalon traiking vadh dilchasp hai'
        },
        glosses: {
            i1: 'hobby', i2: 'week|of|end', i3: 'my|hobby|painting|is', i4: 'cricket|kabaddi|than|more|famous (popular)|is',
            i5: 'you|Sunday|on|what|do|are', i6: 'this|year|of|all|than|good|match|is', q1: '(question)|you|me (my)|with|music|function (concert)|in|will go',
            q2: 'my|younger|brother|me (my)|than|tall|is', q3: 'I|week|of|end|in|rest|do|am', q4: 'TV|watching|than|trekking|more|interesting|is'
        }
    },
    or: {
        words: { hobby: 'sauka', weekend: 'saptaahaanta', relax: 'bishraama nebaa', concert: 'sangeeta kaaryakrama', match: 'myaach', hiking: 'paahaada chadhaa, trekking', painting: 'chitrakalaa', favourite: 'priya' },
        lines: {
            i1: 'sauka', i2: 'saptaahaanta', i3: 'mora sauka chitrakalaa', i4: 'kriketa kabaadithaaru adhika lokapriya', i5: 'aapana rabibaara dina kana karanti',
            i6: 'ehaa barshara sabuthaaru bhala myaach', q1: 'aapana mo sahita sangeeta kaaryakramaku aasibe ki', q2: 'mo saana bhaai mo thaaru dengaa',
            q3: 'mun saptaahaantare bishraama nie', q4: 'tibhi dekhibaathaaru trekking adhika majaadaara'
        },
        glosses: {
            i1: 'hobby', i2: 'weekend', i3: 'my|hobby|painting', i4: 'cricket|than kabaddi|more|popular',
            i5: 'you|Sunday|day (on)|what|do', i6: 'this|of the year|than all (most)|good|match', q1: 'you|me (my)|with|music|to the programme|will come|(question)',
            q2: 'my|younger|brother|me|than|tall', q3: 'I|at the weekend|rest|take', q4: 'TV|than watching|trekking|more|fun'
        }
    },
    es: {
        words: { hobby: 'pa-sa-tyem-po, a-fee-syon', weekend: 'feen deh seh-ma-na', relax: 'reh-la-har-seh', concert: 'kon-syer-to', match: 'par-tee-do', hiking: 'sen-deh-rees-mo', painting: 'peen-too-ra', favourite: 'fa-bo-ree-to' },
        lines: {
            i1: 'pa-sa-tyem-po', i2: 'feen deh seh-ma-na', i3: 'mee pa-sa-tyem-po es peen-tar', i4: 'el kree-ket es mas po-poo-lar keh el ka-ba-dee',
            i5: 'keh a-ses los do-meen-gos', i6: 'es-teh es el meh-hor par-tee-do del a-nyo', q1: 'bye-nes kon-mee-go al kon-syer-to',
            q2: 'mee er-ma-no meh-nor es mas al-to keh yo', q3: 'meh reh-la-ho el feen deh seh-ma-na', q4: 'el sen-deh-rees-mo es mas een-teh-reh-san-teh keh ber la teh-leh'
        },
        glosses: {
            i1: 'hobby', i2: 'end|of|week', i3: 'my|hobby|is|to paint', i4: 'the|cricket|is|more|popular|than|the|kabaddi',
            i5: 'what|you do|the|Sundays', i6: 'this|is|the|best|match|of the|year', q1: 'you come|with me|to the|concert',
            q2: 'my|brother|younger|is|more|tall|than|I', q3: 'myself|I relax|the|end|of|week', q4: 'the|hiking|is|more|interesting|than|to watch|the|TV'
        }
    },
    fr: {
        words: { hobby: 'pas-tahn, lwa-zeer', weekend: 'wee-kend', relax: 'suh day-tahndr', concert: 'kohn-sehr', match: 'matsh', hiking: 'rahn-do-nay', painting: 'pan-tewr', favourite: 'pray-fay-ray' },
        lines: {
            i1: 'pas-tahn', i2: 'wee-kend', i3: 'mohn pas-tahn seh la pan-tewr', i4: 'luh kree-ket eh plew po-pew-lehr kuh luh ka-ba-dee',
            i5: 'kuh feh-tew luh dee-mahnsh', i6: 'seh luh meh-yuhr matsh duh la-nay', q1: 'tew vyan oh kohn-sehr a-vek mwa',
            q2: 'mohn puh-tee frehr eh plew grahn kuh mwa', q3: 'zhuh muh day-tahn luh wee-kend', q4: 'la rahn-do-nay eh plew zan-tay-reh-sahnt kuh ruh-gar-day la tay-lay'
        },
        glosses: {
            i1: 'hobby', i2: 'weekend', i3: 'my|hobby|it is|the|painting', i4: 'the|cricket|is|more|popular|than|the|kabaddi',
            i5: 'what|do you|the (on)|Sunday', i6: 'it is|the|best|match|of|the year', q1: 'you|come|to the|concert|with|me',
            q2: 'my|little|brother|is|more|tall|than|me', q3: 'I|myself|relax|the (at the)|weekend', q4: 'the|hiking|is|more|interesting|than|to watch|the|TV'
        }
    },
    de: {
        words: { hobby: 'hob-bee', weekend: 'vo-khen-en-deh', relax: 'zikh ent-shpan-nen', concert: 'kon-tsert', match: 'shpeel', hiking: 'van-dern', painting: 'mah-len, mah-leh-rye', favourite: 'leep-lings' },
        lines: {
            i1: 'hob-bee', i2: 'vo-khen-en-deh', i3: 'mine hob-bee ist mah-len', i4: 'kri-ket ist beh-leep-ter als ka-ba-dee',
            i5: 'vas makhst doo am zon-tahk', i6: 'das ist das bes-teh shpeel des yah-res', q1: 'komst doo mit meer tsoom kon-tsert',
            q2: 'mine yewng-eh-rer broo-der ist grew-ser als ikh', q3: 'am vo-khen-en-deh ent-shpan-neh ikh mikh', q4: 'van-dern ist in-teh-reh-san-ter als fern-zay-en'
        },
        glosses: {
            i1: 'hobby', i2: 'weekend', i3: 'my|hobby|is|painting', i4: 'cricket|is|more popular|than|kabaddi',
            i5: 'what|do|you|on the|Sunday', i6: 'that|is|the|best|match|of the|year', q1: 'come|you|with|me|to the|concert',
            q2: 'my|younger|brother|is|taller|than|I', q3: 'at the|weekend|relax|I|myself', q4: 'hiking|is|more interesting|than|watching TV'
        }
    },
    pt: {
        words: { hobby: 'pa-sa-tem-poo, ho-bee', weekend: 'feeng jee seh-ma-na', relax: 'heh-la-shar', concert: 'shoh, kon-sehr-too', match: 'par-chee-da, zho-goo', hiking: 'ka-mee-nya-da, tree-lya', painting: 'peen-too-ra', favourite: 'fa-vo-ree-too, preh-feh-ree-doo' },
        lines: {
            i1: 'pa-sa-tem-poo', i2: 'feeng jee seh-ma-na', i3: 'meh-oo pa-sa-tem-poo eh peen-tar', i4: 'oo kree-keh-chee eh mice po-poo-lar kee oo ka-ba-dee',
            i5: 'oo kee vo-seh fice noo doo-meen-goo', i6: 'es-ta eh a meh-lyor par-chee-da doo a-noo', q1: 'vo-seh vayng koo-mee-goo ow shoh',
            q2: 'meh-oo eer-mown mice no-voo eh mice ow-too kee eh-oo', q3: 'eh-oo heh-la-shoo noo feeng jee seh-ma-na', q4: 'fa-zehr tree-lya eh mice een-teh-reh-sahn-chee doo kee vehr teh-veh'
        },
        glosses: {
            i1: 'hobby', i2: 'end|of|week', i3: 'my|hobby|is|to paint', i4: 'the|cricket|is|more|popular|than|the|kabaddi',
            i5: 'what|(that)|you|do|on the|Sunday', i6: 'this|is|the|best|match|of the|year', q1: 'you|come|with me|to the|show (concert)',
            q2: 'my|brother|more|young|is|more|tall|than|I', q3: 'I|relax|on the|end|of|week', q4: 'to do|trail (hiking)|is|more|interesting|of the|that (than)|to watch|TV'
        }
    }
};

module.exports = {
    lessons,
    names: { 'vocab-intermediate-4': ['Free time', 'Sports and music'] },
    tipsFrom: { 'translation-intermediate-4': 'translation-intermediate-kn-en' },
    words: { 'vocab-intermediate-4': words },
    sentences: { 'translation-intermediate-4': sentences },
    asks,
    sounds
};
