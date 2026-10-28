/**
 * Beginner, topic 4 — Time and daily routine. Two units (parts.js): Time and
 * days, and My day. The words and sentences in every language, and how they
 * sound in English letters (content/sounds), are below the lessons; written
 * here, not by any translation service — a native speaker should check them.
 */
const { w, mcq, fill, fix, order, dialogue, item, tipsOf } = require('./make');

const lessons = [
    {
        seedKey: 'vocab-beginner-4', module: 'vocabulary', level: 'beginner', order: 4,
        title: 'Time and routine',
        summary: 'Words for the times of the day, and for the things you do every day.',
        learn: {
            intro: 'Learn each word with its Kannada meaning. Read the example sentence aloud to remember how the word is used.',
            points: ['Say the word, then its meaning, then the sentence.', 'Use the words to say what you do in the morning and in the evening.']
        },
        words: [
            w('morning', 'ಬೆಳಿಗ್ಗೆ, ಮುಂಜಾನೆ', 'noun', 'I drink a glass of milk every morning.', [], ['evening']),
            w('evening', 'ಸಂಜೆ', 'noun', 'We play cricket in the evening.', ['dusk'], ['morning']),
            w('week', 'ವಾರ', 'noun', 'I go to the library twice a week.'),
            w('clock', 'ಗಡಿಯಾರ', 'noun', 'The clock on the wall shows ten o\'clock.', ['watch']),
            w('wake', 'ಏಳು, ಎಚ್ಚರಗೊಳ್ಳು', 'verb', 'I wake up at six every day.', ['get up', 'awake'], ['sleep']),
            w('sleep', 'ನಿದ್ದೆ ಮಾಡು, ಮಲಗು', 'verb', 'My little brother sleeps at nine o\'clock.', ['rest'], ['wake']),
            w('breakfast', 'ಬೆಳಗಿನ ತಿಂಡಿ, ಉಪಾಹಾರ', 'noun', 'We eat idli and chutney for breakfast.'),
            w('busy', 'ಬಿಡುವಿಲ್ಲದ, ಕಾರ್ಯನಿರತ', 'adjective', 'My mother is very busy in the morning.', ['occupied'], ['free'])
        ]
    },
    {
        seedKey: 'grammar-beginner-4', module: 'grammar', level: 'beginner', order: 4,
        title: 'Present simple: I work, she works',
        summary: 'Talking about habits and routines.',
        learn: {
            intro: 'Use the present simple for habits and routines: things you do every day, every week or always.',
            points: [
                'With I, you, we and they, use the plain verb: I work. They play.',
                'With he, she and it, add -s: She works. He plays. After s, sh, ch, x or o, add -es: She watches. He goes.',
                'When a verb ends in a consonant + y, change y to -ies: study → she studies.',
                'Questions start with Do or Does, and the verb stays plain: Do you work? Does she work?',
                'Negatives use don\'t (do not) or doesn\'t (does not) + the plain verb: I don\'t work. He doesn\'t work.',
                'Words like every day, always, usually and on Sundays often go with the present simple.'
            ],
            examples: ['I wake up at six every day.', 'My father works in a bank.', 'Does Ravi eat breakfast?', 'She doesn\'t sleep in the afternoon.']
        },
        practice: [
            fill('p1', 'She ___ to college by bus. (go / goes)', 'goes', 'With she, add -es to go: she goes.'),
            fill('p2', 'I ___ breakfast at seven. (eat / eats)', 'eat', 'With I, use the plain verb: I eat.'),
            mcq('p3', 'My brother ___ TV in the evening.', ['watches', 'watch', 'watching'], 'watches', 'With he (my brother), add -es after ch: watches.'),
            mcq('p4', '___ you wake up early?', ['Do', 'Does', 'Is'], 'Do', 'A question with you starts with Do.'),
            fix('p5', 'He don\'t like tea.', 'He doesn\'t like tea.', 'With he, she or it, the negative is doesn\'t: He doesn\'t like tea.', ['He does not like tea.']),
            order('p6', ['up', 'I', 'at', 'wake', 'six'], 'I wake up at six.', 'Subject (I) + verb (wake up) + time (at six).')
        ],
        quiz: [
            fill('q1', 'Ravi ___ at nine every night. (sleep / sleeps)', 'sleeps', 'With he (Ravi), add -s: sleeps.'),
            fill('q2', 'We ___ cricket on Sundays. (play / plays)', 'play', 'With we, use the plain verb: play.'),
            mcq('q3', '___ your mother work in a school?', ['Does', 'Do', 'Is'], 'Does', 'With he, she or it (your mother), the question starts with Does.'),
            mcq('q4', 'Which is correct?', ['She studies every evening.', 'She study every evening.', 'She studys every evening.'], 'She studies every evening.', 'With she, a verb that ends in a consonant + y changes y to -ies: study → studies.'),
            mcq('q5', 'They ___ eat meat. They eat only vegetables.', ['don\'t', 'doesn\'t', 'not'], 'don\'t', 'With they, the negative is don\'t + the plain verb.'),
            fix('q6', 'Does he works on Saturday?', 'Does he work on Saturday?', 'After does, the verb stays plain: work, not works.', ['Does he work on Saturdays?']),
            mcq('q7', 'The shop ___ at ten o\'clock.', ['opens', 'open', 'opening'], 'opens', 'With it (the shop), add -s: opens.'),
            order('q8', ['you', 'Do', 'breakfast', 'eat', 'early'], 'Do you eat breakfast early?', 'Do + you + verb (eat) + the rest.')
        ]
    },
    {
        seedKey: 'reading-beginner-4', module: 'reading', level: 'beginner', order: 4,
        title: 'Ravi\'s Day',
        summary: 'A short story about a college student\'s day, from morning to night.',
        learn: {
            intro: 'Read the story. Look for the times, and for the verbs that end in -s.',
            passage: {
                title: 'Ravi\'s Day',
                text: 'Ravi is a student in Hubballi. He wakes up at six o\'clock every morning. First, he brushes his teeth and drinks a glass of milk. At seven, he eats breakfast with his family. His mother makes dosa and chutney. Ravi goes to college by bus at eight o\'clock. His classes start at nine and finish at four. In the evening, he plays cricket with his friends. He does his homework after dinner. Ravi is very busy during the week, but on Sundays he sleeps late.'
            }
        },
        quiz: [
            mcq('q1', 'What time does Ravi wake up?', ['At six o\'clock', 'At seven o\'clock', 'At eight o\'clock', 'At nine o\'clock'], 'At six o\'clock', '"He wakes up at six o\'clock every morning."'),
            mcq('q2', 'What does Ravi\'s mother make for breakfast?', ['Dosa and chutney', 'Idli and sambar', 'Rice and curry', 'Bread and jam'], 'Dosa and chutney', '"His mother makes dosa and chutney."'),
            mcq('q3', 'How does Ravi go to college?', ['By bus', 'By train', 'On foot', 'By bike'], 'By bus', '"Ravi goes to college by bus at eight o\'clock."'),
            mcq('q4', 'What does Ravi do in the evening?', ['He plays cricket with his friends', 'He sleeps', 'He watches TV', 'He goes to the market'], 'He plays cricket with his friends', '"In the evening, he plays cricket with his friends."'),
            mcq('q5', 'What does Ravi do on Sundays?', ['He sleeps late', 'He goes to college', 'He wakes up at five', 'He does his homework'], 'He sleeps late', '"…on Sundays he sleeps late."')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['up', 'He', 'early', 'wakes'], answer: 'He wakes up early.', model: 'He wakes up early.' },
            { id: 'w2', type: 'jumbled', prompt: 'Put the words in order.', words: ['eat', 'I', 'at', 'breakfast', 'seven'], answer: 'I eat breakfast at seven.', model: 'I eat breakfast at seven.' },
            { id: 'w3', type: 'sentence', prompt: 'Make one sentence with the word "morning".', mustInclude: ['morning'], minWords: 4, model: 'I drink milk every morning.' },
            { id: 'w4', type: 'paragraph', prompt: 'Write 4 or 5 sentences about your day.', minWords: 30, model: 'I wake up at six o\'clock. I eat breakfast at seven with my family. Then I go to college by bus. In the evening, I play with my friends. I sleep at ten o\'clock.', checklist: ['I said what time I wake up', 'I wrote about the morning and the evening', 'I used the present simple, like I eat and I go', 'Each sentence ends with a full stop'] }
        ]
    },
    {
        seedKey: 'speaking-beginner-4', module: 'speaking', level: 'beginner', order: 4,
        title: 'Making a plan with a friend',
        summary: 'Asking if a friend is free, and agreeing a time and a place to meet.',
        learn: {
            intro: 'Listen to how Meena and Kiran agree a time to meet.',
            dialogue: dialogue('speaking-beginner-4', 'Making a plan: Meena and Kiran agree a time to meet on Saturday.', [{ name: 'Meena', voice: 'f' }, { name: 'Kiran', voice: 'm' }], [
                ['Meena', 'Hi Kiran! Are you free on Saturday?'],
                ['Kiran', 'I am busy in the morning. I have a music class.'],
                ['Meena', 'Shall we go to the library in the evening, then?'],
                ['Kiran', 'Yes, good idea. What time shall we meet?'],
                ['Meena', 'How about four o\'clock?'],
                ['Kiran', 'Four is a little early for me. Can we meet at five?'],
                ['Meena', 'Sure, five o\'clock is fine. Let\'s meet at the bus stand.'],
                ['Kiran', 'Great. See you at five on Saturday!'],
                ['Meena', 'See you then. Don\'t be late!']
            ]),
            phrases: ['Are you free on Saturday?', 'What time shall we meet?', 'See you at five!']
        },
        quiz: [
            mcq('q1', 'Why can\'t Kiran meet in the morning?', ['He has a music class', 'He is sleeping', 'He is at the library', 'He is playing cricket'], 'He has a music class', 'Kiran says: "I am busy in the morning. I have a music class."'),
            mcq('q2', 'Where do they want to go?', ['To the library', 'To the cinema', 'To the market', 'To college'], 'To the library', 'Meena says: "Shall we go to the library in the evening, then?"'),
            mcq('q3', 'What time do they agree to meet?', ['At five o\'clock', 'At four o\'clock', 'At ten o\'clock', 'At three o\'clock'], 'At five o\'clock', 'Meena says: "Sure, five o\'clock is fine."'),
            mcq('q4', 'Where will they meet?', ['At the bus stand', 'At the library', 'At Meena\'s house', 'At college'], 'At the bus stand', 'Meena says: "Let\'s meet at the bus stand."')
        ],
        speaking: {
            prompt: 'Make a plan with a friend in 4 or 5 sentences: ask if your friend is free, say where you want to go, suggest a time and a place to meet, and say goodbye.',
            sample: 'Hi Asha! Are you free on Sunday? Let\'s go to the park. How about six o\'clock in the evening? Let\'s meet at the bus stand. See you on Sunday!',
            checklist: ['I asked if my friend is free', 'I said where we can go', 'I suggested a time', 'I said where to meet', 'I said goodbye, like "See you!"', 'I spoke slowly and clearly']
        }
    },
    {
        seedKey: 'translation-beginner-4', module: 'translation', level: 'beginner', order: 4, direction: 'kn-en',
        title: 'Time and routine: Kannada → English',
        summary: 'Telling the time, and talking about your day.',
        learn: { intro: 'Translate each Kannada word or sentence into English.', points: tipsOf('translation-beginner-kn-en') },
        items: [
            item('i1', 'word', 'vocabulary', 'ಬೆಳಿಗ್ಗೆ', 'morning', '"Morning" is the early part of the day. English often says "in the morning".', ['the morning', 'in the morning', 'a morning']),
            item('i2', 'word', 'vocabulary', 'ಗಡಿಯಾರ', 'clock', 'A clock hangs on a wall or stands on a table; the small one you wear on your wrist is a watch.', ['a clock', 'the clock', 'watch', 'a watch', 'the watch']),
            item('i3', 'sentence', 'daily conversation', 'ಈಗ ಸಮಯ ಎಷ್ಟು?', 'What time is it now?', 'To ask the time, English says "What time is it?" or "What is the time?"', ['What time is it?', 'What is the time now?', 'What is the time?', 'What\'s the time?', 'What\'s the time now?', 'What time is it right now?']),
            item('i4', 'sentence', 'grammar', 'ನಾನು ಬೆಳಿಗ್ಗೆ ಆರು ಗಂಟೆಗೆ ಏಳುತ್ತೇನೆ.', 'I wake up at six in the morning.', 'For a daily habit, use the present simple: I wake up. "At" goes before a time: at six.', ['I wake up at six o\'clock in the morning.', 'I get up at six in the morning.', 'I get up at six o\'clock in the morning.', 'I wake up at 6 in the morning.', 'I get up at 6 in the morning.', 'I wake at six in the morning.', 'I wake up at six am.', 'I wake up at 6 am.', 'I wake up at six a.m.', 'I get up at six am.', 'In the morning I wake up at six.', 'I wake up in the morning at six.']),
            item('i5', 'sentence', 'grammar', 'ಅವಳು ಪ್ರತಿದಿನ ಕಾಲೇಜಿಗೆ ಹೋಗುತ್ತಾಳೆ.', 'She goes to college every day.', 'With she, add -es to go: she goes. "Every day" shows a habit.', ['She goes to the college every day.', 'Every day she goes to college.', 'She goes to college daily.', 'She goes to college everyday.', 'She daily goes to college.']),
            item('i6', 'sentence', 'daily conversation', 'ಇಂದು ನನಗೆ ಬಿಡುವಿಲ್ಲ.', 'I am busy today.', 'Kannada says "today I have no free time"; English says "I am busy today".', ['I\'m busy today.', 'Today I am busy.', 'Today I\'m busy.', 'I am very busy today.', 'I\'m very busy today.', 'I am not free today.', 'I\'m not free today.', 'Today I am not free.', 'I have no free time today.', 'I don\'t have free time today.', 'I do not have free time today.', 'I have no time today.'])
        ],
        quiz: [
            item('q1', 'sentence', 'vocabulary', 'ಒಂದು ವಾರದಲ್ಲಿ ಏಳು ದಿನಗಳಿವೆ.', 'There are seven days in a week.', 'Use "There are" for more than one thing: There are seven days.', ['A week has seven days.', 'There are 7 days in a week.', 'A week has 7 days.', 'There are seven days in one week.', 'One week has seven days.', 'In a week there are seven days.', 'In one week there are seven days.']),
            item('q2', 'sentence', 'grammar', 'ಅವನು ರಾತ್ರಿ ಹತ್ತು ಗಂಟೆಗೆ ಮಲಗುತ್ತಾನೆ.', 'He sleeps at ten at night.', 'With he, add -s: he sleeps. Say "at night" for the dark part of the day.', ['He sleeps at ten o\'clock at night.', 'He goes to sleep at ten at night.', 'He goes to bed at ten at night.', 'He goes to sleep at ten o\'clock at night.', 'He goes to bed at ten o\'clock at night.', 'He sleeps at 10 at night.', 'He sleeps at ten pm.', 'He sleeps at 10 pm.', 'He sleeps at ten p.m.', 'He goes to bed at ten pm.', 'He goes to bed at 10 pm.', 'He sleeps at ten in the night.', 'At night he sleeps at ten.', 'He sleeps at night at ten.']),
            item('q3', 'sentence', 'daily conversation', 'ನೀನು ಬೆಳಗಿನ ತಿಂಡಿಗೆ ಏನು ತಿನ್ನುತ್ತೀಯ?', 'What do you eat for breakfast?', 'A question with "eat" needs "do": What do you eat? Say "for breakfast".', ['What do you have for breakfast?', 'What do you eat in breakfast?', 'What do you eat for your breakfast?', 'What do you usually eat for breakfast?', 'What do you eat at breakfast?', 'What do you have for your breakfast?']),
            item('q4', 'sentence', 'grammar', 'ನನ್ನ ತಂದೆ ಭಾನುವಾರ ಕೆಲಸ ಮಾಡುವುದಿಲ್ಲ.', 'My father does not work on Sundays.', 'With he or she (my father), the negative is "does not" (doesn\'t) + the plain verb: does not work.', ['My father doesn\'t work on Sundays.', 'My father does not work on Sunday.', 'My father doesn\'t work on Sunday.', 'On Sundays my father does not work.', 'On Sundays my father doesn\'t work.', 'On Sunday my father does not work.', 'On Sunday my father doesn\'t work.', 'My dad does not work on Sundays.', 'My dad doesn\'t work on Sundays.', 'My dad does not work on Sunday.', 'My dad doesn\'t work on Sunday.'])
        ]
    }
];

// Each word's meaning in every language (English: a definition, for English speakers).
const words = {
    morning: { hi: 'सुबह', ta: 'காலை', te: 'ఉదయం', ml: 'രാവിലെ', mr: 'सकाळ', bn: 'সকাল', gu: 'સવાર', pa: 'ਸਵੇਰ', or: 'ସକାଳ', ur: 'صبح', es: 'mañana', fr: 'matin', de: 'Morgen', pt: 'manhã', ru: 'утро', ar: 'صباح', zh: '早上', ja: '朝', ko: '아침', en: 'the early part of the day, from sunrise until noon' },
    evening: { hi: 'शाम', ta: 'மாலை', te: 'సాయంత్రం', ml: 'വൈകുന്നേരം', mr: 'संध्याकाळ', bn: 'সন্ধ্যা', gu: 'સાંજ', pa: 'ਸ਼ਾਮ', or: 'ସନ୍ଧ୍ୟା', ur: 'شام', es: 'tarde, noche', fr: 'soir', de: 'Abend', pt: 'noite', ru: 'вечер', ar: 'مساء', zh: '晚上', ja: '夕方、晩', ko: '저녁', en: 'the end of the day, after the afternoon and before night' },
    week: { hi: 'हफ़्ता, सप्ताह', ta: 'வாரம்', te: 'వారం', ml: 'ആഴ്ച', mr: 'आठवडा', bn: 'সপ্তাহ', gu: 'અઠવાડિયું', pa: 'ਹਫ਼ਤਾ', or: 'ସପ୍ତାହ', ur: 'ہفتہ', es: 'semana', fr: 'semaine', de: 'Woche', pt: 'semana', ru: 'неделя', ar: 'أسبوع', zh: '星期、周', ja: '週', ko: '주, 일주일', en: 'seven days, usually from Monday to Sunday' },
    clock: { hi: 'घड़ी', ta: 'கடிகாரம்', te: 'గడియారం', ml: 'ഘടികാരം', mr: 'घड्याळ', bn: 'ঘড়ি', gu: 'ઘડિયાળ', pa: 'ਘੜੀ', or: 'ଘଡ଼ି', ur: 'گھڑی', es: 'reloj', fr: 'horloge', de: 'Uhr', pt: 'relógio', ru: 'часы', ar: 'ساعة', zh: '钟', ja: '時計', ko: '시계', en: 'a machine on a wall or a table that shows the time' },
    wake: { hi: 'जागना, उठना', ta: 'எழுந்திரு, விழி', te: 'లేచు, మేల్కొను', ml: 'ഉണരുക', mr: 'उठणे, जागे होणे', bn: 'জেগে ওঠা, ঘুম থেকে ওঠা', gu: 'જાગવું, ઊઠવું', pa: 'ਜਾਗਣਾ, ਉੱਠਣਾ', or: 'ଉଠିବା, ଜାଗିବା', ur: 'جاگنا، اٹھنا', es: 'despertarse', fr: 'se réveiller', de: 'aufwachen', pt: 'acordar', ru: 'просыпаться', ar: 'يستيقظ', zh: '醒、起床', ja: '起きる、目が覚める', ko: '깨다, 일어나다', en: 'to stop sleeping and open your eyes' },
    sleep: { hi: 'सोना', ta: 'தூங்கு', te: 'నిద్రపోవు', ml: 'ഉറങ്ങുക', mr: 'झोपणे', bn: 'ঘুমানো', gu: 'ઊંઘવું, સૂવું', pa: 'ਸੌਣਾ', or: 'ଶୋଇବା', ur: 'سونا', es: 'dormir', fr: 'dormir', de: 'schlafen', pt: 'dormir', ru: 'спать', ar: 'ينام', zh: '睡觉', ja: '寝る', ko: '자다', en: 'to rest with your eyes closed, usually at night' },
    breakfast: { hi: 'नाश्ता', ta: 'காலை உணவு', te: 'అల్పాహారం, టిఫిన్', ml: 'പ്രഭാതഭക്ഷണം', mr: 'न्याहारी, नाश्ता', bn: 'জলখাবার, প্রাতরাশ', gu: 'નાસ્તો', pa: 'ਨਾਸ਼ਤਾ', or: 'ଜଳଖିଆ', ur: 'ناشتہ', es: 'desayuno', fr: 'petit-déjeuner', de: 'Frühstück', pt: 'café da manhã', ru: 'завтрак', ar: 'فطور', zh: '早饭、早餐', ja: '朝ご飯、朝食', ko: '아침밥, 아침 식사', en: 'the first meal of the day, eaten in the morning' },
    busy: { hi: 'व्यस्त', ta: 'மும்முரமான', te: 'తీరిక లేని, బిజీ', ml: 'തിരക്കുള്ള', mr: 'व्यस्त', bn: 'ব্যস্ত', gu: 'વ્યસ્ત', pa: 'ਰੁੱਝਿਆ', or: 'ବ୍ୟସ୍ତ', ur: 'مصروف', es: 'ocupado', fr: 'occupé', de: 'beschäftigt', pt: 'ocupado', ru: 'занятой', ar: 'مشغول', zh: '忙', ja: '忙しい', ko: '바쁜', en: 'having a lot of things to do; not free' }
};

// Each Kannada word or sentence of the translation lesson in every language (the English is the lesson's own).
const sentences = {
    i1: { hi: 'सुबह', ta: 'காலை', te: 'ఉదయం', ml: 'രാവിലെ', mr: 'सकाळ', bn: 'সকাল', gu: 'સવાર', pa: 'ਸਵੇਰ', or: 'ସକାଳ', ur: 'صبح', es: 'mañana', fr: 'matin', de: 'Morgen', pt: 'manhã', ru: 'утро', ar: 'صباح', zh: '早上', ja: '朝', ko: '아침' },
    i2: { hi: 'घड़ी', ta: 'கடிகாரம்', te: 'గడియారం', ml: 'ഘടികാരം', mr: 'घड्याळ', bn: 'ঘড়ি', gu: 'ઘડિયાળ', pa: 'ਘੜੀ', or: 'ଘଡ଼ି', ur: 'گھڑی', es: 'reloj', fr: 'horloge', de: 'Uhr', pt: 'relógio', ru: 'часы', ar: 'ساعة', zh: '钟', ja: '時計', ko: '시계' },
    i3: { hi: 'अभी कितने बजे हैं?', ta: 'இப்போது மணி என்ன?', te: 'ఇప్పుడు సమయం ఎంత?', ml: 'ഇപ്പോൾ സമയം എത്രയായി?', mr: 'आता किती वाजले?', bn: 'এখন কটা বাজে?', gu: 'અત્યારે કેટલા વાગ્યા છે?', pa: 'ਹੁਣ ਕਿੰਨੇ ਵਜੇ ਹਨ?', or: 'ଏବେ କେତେ ବାଜିଲାଣି?', ur: 'ابھی کتنے بجے ہیں؟', es: '¿Qué hora es ahora?', fr: 'Quelle heure est-il maintenant ?', de: 'Wie spät ist es jetzt?', pt: 'Que horas são agora?', ru: 'Который сейчас час?', ar: 'كم الساعة الآن؟', zh: '现在几点了？', ja: '今、何時ですか？', ko: '지금 몇 시예요?' },
    i4: { hi: 'मैं सुबह छह बजे उठता हूँ।', ta: 'நான் காலை ஆறு மணிக்கு எழுவேன்.', te: 'నేను ఉదయం ఆరు గంటలకు లేస్తాను.', ml: 'ഞാൻ രാവിലെ ആറു മണിക്ക് എഴുന്നേൽക്കും.', mr: 'मी सकाळी सहा वाजता उठतो.', bn: 'আমি সকাল ছটায় ঘুম থেকে উঠি।', gu: 'હું સવારે છ વાગ્યે ઊઠું છું.', pa: 'ਮੈਂ ਸਵੇਰੇ ਛੇ ਵਜੇ ਉੱਠਦਾ ਹਾਂ।', or: 'ମୁଁ ସକାଳ ଛଅଟାରେ ଉଠେ।', ur: 'میں صبح چھ بجے اٹھتا ہوں۔', es: 'Me despierto a las seis de la mañana.', fr: 'Je me réveille à six heures du matin.', de: 'Ich wache um sechs Uhr morgens auf.', pt: 'Eu acordo às seis da manhã.', ru: 'Я просыпаюсь в шесть утра.', ar: 'أستيقظ في الساعة السادسة صباحًا.', zh: '我早上六点起床。', ja: '私は朝六時に起きます。', ko: '저는 아침 여섯 시에 일어나요.' },
    i5: { hi: 'वह रोज़ कॉलेज जाती है।', ta: 'அவள் தினமும் கல்லூரிக்குப் போகிறாள்.', te: 'ఆమె ప్రతిరోజూ కాలేజీకి వెళ్తుంది.', ml: 'അവൾ എല്ലാ ദിവസവും കോളേജിൽ പോകുന്നു.', mr: 'ती रोज कॉलेजला जाते.', bn: 'সে প্রতিদিন কলেজে যায়।', gu: 'તે રોજ કૉલેજ જાય છે.', pa: 'ਉਹ ਹਰ ਰੋਜ਼ ਕਾਲਜ ਜਾਂਦੀ ਹੈ।', or: 'ସେ ପ୍ରତିଦିନ କଲେଜ ଯାଏ।', ur: 'وہ روز کالج جاتی ہے۔', es: 'Ella va a la universidad todos los días.', fr: 'Elle va à l’université tous les jours.', de: 'Sie geht jeden Tag zur Hochschule.', pt: 'Ela vai para a faculdade todos os dias.', ru: 'Она каждый день ходит в колледж.', ar: 'هي تذهب إلى الكلية كل يوم.', zh: '她每天去大学。', ja: '彼女は毎日大学に行きます。', ko: '그녀는 매일 대학에 가요.' },
    i6: { hi: 'आज मैं व्यस्त हूँ।', ta: 'இன்று எனக்கு ஓய்வு இல்லை.', te: 'ఈ రోజు నాకు తీరిక లేదు.', ml: 'ഇന്ന് എനിക്ക് തിരക്കാണ്.', mr: 'आज मी व्यस्त आहे.', bn: 'আজ আমি ব্যস্ত।', gu: 'આજે હું વ્યસ્ત છું.', pa: 'ਅੱਜ ਮੈਂ ਰੁੱਝਿਆ ਹੋਇਆ ਹਾਂ।', or: 'ଆଜି ମୁଁ ବ୍ୟସ୍ତ ଅଛି।', ur: 'آج میں مصروف ہوں۔', es: 'Hoy estoy ocupado.', fr: 'Aujourd’hui, je suis occupé.', de: 'Heute bin ich beschäftigt.', pt: 'Hoje estou ocupado.', ru: 'Сегодня я занят.', ar: 'أنا مشغول اليوم.', zh: '我今天很忙。', ja: '今日は忙しいです。', ko: '오늘은 바빠요.' },
    q1: { hi: 'एक हफ़्ते में सात दिन होते हैं।', ta: 'ஒரு வாரத்தில் ஏழு நாட்கள் உள்ளன.', te: 'ఒక వారంలో ఏడు రోజులు ఉంటాయి.', ml: 'ഒരു ആഴ്ചയിൽ ഏഴു ദിവസങ്ങളുണ്ട്.', mr: 'एका आठवड्यात सात दिवस असतात.', bn: 'এক সপ্তাহে সাত দিন থাকে।', gu: 'એક અઠવાડિયામાં સાત દિવસ હોય છે.', pa: 'ਇੱਕ ਹਫ਼ਤੇ ਵਿੱਚ ਸੱਤ ਦਿਨ ਹੁੰਦੇ ਹਨ।', or: 'ଗୋଟିଏ ସପ୍ତାହରେ ସାତ ଦିନ ଥାଏ।', ur: 'ایک ہفتے میں سات دن ہوتے ہیں۔', es: 'Una semana tiene siete días.', fr: 'Il y a sept jours dans une semaine.', de: 'Eine Woche hat sieben Tage.', pt: 'Uma semana tem sete dias.', ru: 'В неделе семь дней.', ar: 'في الأسبوع سبعة أيام.', zh: '一个星期有七天。', ja: '一週間は七日です。', ko: '일주일은 칠 일이에요.' },
    q2: { hi: 'वह रात को दस बजे सोता है।', ta: 'அவன் இரவு பத்து மணிக்குத் தூங்குவான்.', te: 'అతను రాత్రి పది గంటలకు పడుకుంటాడు.', ml: 'അവൻ രാത്രി പത്തു മണിക്ക് ഉറങ്ങും.', mr: 'तो रात्री दहा वाजता झोपतो.', bn: 'সে রাত দশটায় ঘুমায়।', gu: 'તે રાત્રે દસ વાગ્યે સૂઈ જાય છે.', pa: 'ਉਹ ਰਾਤ ਨੂੰ ਦਸ ਵਜੇ ਸੌਂਦਾ ਹੈ।', or: 'ସେ ରାତି ଦଶଟାରେ ଶୋଏ।', ur: 'وہ رات کو دس بجے سوتا ہے۔', es: 'Él se acuesta a las diez de la noche.', fr: 'Il se couche à dix heures du soir.', de: 'Er geht um zehn Uhr abends schlafen.', pt: 'Ele dorme às dez da noite.', ru: 'Он ложится спать в десять вечера.', ar: 'هو ينام في الساعة العاشرة ليلًا.', zh: '他晚上十点睡觉。', ja: '彼は夜十時に寝ます。', ko: '그는 밤 열 시에 자요.' },
    q3: { hi: 'तुम नाश्ते में क्या खाते हो?', ta: 'நீ காலை உணவுக்கு என்ன சாப்பிடுவாய்?', te: 'నువ్వు అల్పాహారంలో ఏమి తింటావు?', ml: 'നീ പ്രഭാതഭക്ഷണത്തിന് എന്താണ് കഴിക്കുന്നത്?', mr: 'तू नाश्त्याला काय खातोस?', bn: 'তুমি জলখাবারে কী খাও?', gu: 'તું નાસ્તામાં શું ખાય છે?', pa: 'ਤੂੰ ਨਾਸ਼ਤੇ ਵਿੱਚ ਕੀ ਖਾਂਦਾ ਹੈਂ?', or: 'ତୁମେ ଜଳଖିଆରେ କ’ଣ ଖାଅ?', ur: 'تم ناشتے میں کیا کھاتے ہو؟', es: '¿Qué comes en el desayuno?', fr: 'Qu’est-ce que tu manges au petit-déjeuner ?', de: 'Was isst du zum Frühstück?', pt: 'O que você come no café da manhã?', ru: 'Что ты ешь на завтрак?', ar: 'ماذا تأكل في الفطور؟', zh: '你早饭吃什么？', ja: '朝ご飯に何を食べますか？', ko: '아침으로 뭐 먹어요?' },
    q4: { hi: 'मेरे पिताजी रविवार को काम नहीं करते।', ta: 'என் அப்பா ஞாயிற்றுக்கிழமை வேலை செய்வதில்லை.', te: 'మా నాన్న ఆదివారం పని చేయరు.', ml: 'എന്റെ അച്ഛൻ ഞായറാഴ്ച ജോലി ചെയ്യാറില്ല.', mr: 'माझे बाबा रविवारी काम करत नाहीत.', bn: 'আমার বাবা রবিবার কাজ করেন না।', gu: 'મારા પપ્પા રવિવારે કામ કરતા નથી.', pa: 'ਮੇਰੇ ਪਿਤਾ ਜੀ ਐਤਵਾਰ ਨੂੰ ਕੰਮ ਨਹੀਂ ਕਰਦੇ।', or: 'ମୋ ବାପା ରବିବାର ଦିନ କାମ କରନ୍ତି ନାହିଁ।', ur: 'میرے ابو اتوار کو کام نہیں کرتے۔', es: 'Mi padre no trabaja los domingos.', fr: 'Mon père ne travaille pas le dimanche.', de: 'Mein Vater arbeitet sonntags nicht.', pt: 'Meu pai não trabalha aos domingos.', ru: 'Мой папа не работает по воскресеньям.', ar: 'أبي لا يعمل يوم الأحد.', zh: '我爸爸星期天不工作。', ja: '父は日曜日に働きません。', ko: '우리 아버지는 일요일에 일하지 않아요.' }
};

// The questions and tasks in Kannada (content/asks/kn.js), for a Kannada speaker learning English.
const ENGLISH = 'ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ';
const asks = {
    questions: {
        'grammar-beginner-4': { q4: 'ಯಾವುದು ಸರಿ?' },
        'reading-beginner-4': {
            q1: 'ರವಿ ಎಷ್ಟು ಗಂಟೆಗೆ ಏಳುತ್ತಾನೆ?',
            q2: 'ರವಿಯ ಅಮ್ಮ ಬೆಳಗಿನ ತಿಂಡಿಗೆ ಏನು ಮಾಡುತ್ತಾರೆ?',
            q3: 'ರವಿ ಕಾಲೇಜಿಗೆ ಹೇಗೆ ಹೋಗುತ್ತಾನೆ?',
            q4: 'ರವಿ ಸಂಜೆ ಏನು ಮಾಡುತ್ತಾನೆ?',
            q5: 'ರವಿ ಭಾನುವಾರಗಳಂದು ಏನು ಮಾಡುತ್ತಾನೆ?'
        },
        'speaking-beginner-4': {
            q1: 'ಕಿರಣ್ ಬೆಳಿಗ್ಗೆ ಏಕೆ ಭೇಟಿಯಾಗಲು ಆಗುವುದಿಲ್ಲ?',
            q2: 'ಅವರು ಎಲ್ಲಿಗೆ ಹೋಗಲು ಬಯಸುತ್ತಾರೆ?',
            q3: 'ಅವರು ಎಷ್ಟು ಗಂಟೆಗೆ ಭೇಟಿಯಾಗಲು ಒಪ್ಪುತ್ತಾರೆ?',
            q4: 'ಅವರು ಎಲ್ಲಿ ಭೇಟಿಯಾಗುತ್ತಾರೆ?'
        }
    },
    writing: {
        'reading-beginner-4': {
            w3: `"morning" ಪದವನ್ನು ಬಳಸಿ ${ENGLISH} ಒಂದು ವಾಕ್ಯ ಬರೆಯಿರಿ.`,
            w4: `ನಿಮ್ಮ ದಿನದ ಬಗ್ಗೆ ${ENGLISH} 4 ಅಥವಾ 5 ವಾಕ್ಯಗಳನ್ನು ಬರೆಯಿರಿ.`
        }
    },
    speaking: {
        'speaking-beginner-4': {
            prompt: `${ENGLISH} 4 ಅಥವಾ 5 ವಾಕ್ಯಗಳಲ್ಲಿ ಸ್ನೇಹಿತರೊಂದಿಗೆ ಒಂದು ಯೋಜನೆ ಮಾಡಿ: ಸ್ನೇಹಿತರಿಗೆ ಬಿಡುವಿದೆಯೇ ಎಂದು ಕೇಳಿ, ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು ಎಂದು ಹೇಳಿ, ಭೇಟಿಯಾಗುವ ಸಮಯ ಮತ್ತು ಸ್ಥಳವನ್ನು ಸೂಚಿಸಿ, ನಂತರ ವಿದಾಯ ಹೇಳಿ.`,
            checklist: ['ಸ್ನೇಹಿತರಿಗೆ ಬಿಡುವಿದೆಯೇ ಎಂದು ಕೇಳಿದೆ', 'ನಾವು ಎಲ್ಲಿಗೆ ಹೋಗಬಹುದು ಎಂದು ಹೇಳಿದೆ', 'ಒಂದು ಸಮಯವನ್ನು ಸೂಚಿಸಿದೆ', 'ಎಲ್ಲಿ ಭೇಟಿಯಾಗಬೇಕು ಎಂದು ಹೇಳಿದೆ', '"See you!" ಎಂಬಂತೆ ವಿದಾಯ ಹೇಳಿದೆ', 'ನಿಧಾನವಾಗಿ ಮತ್ತು ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿದೆ']
        }
    }
};

/**
 * How each language's words and sentences above sound, in English letters (content/sounds): `words` by
 * English word (one sound per comma part), `lines` by translation item id, and `glosses` the English of
 * each word of a line, "|" between them, one per word of its sound.
 */
const sounds = {
    ja: {
        words: { morning: 'asa', evening: 'yuugata, ban', week: 'shuu', clock: 'tokei', wake: 'okiru, me ga sameru', sleep: 'neru', breakfast: 'asagohan, choushoku', busy: 'isogashii' },
        lines: {
            i1: 'asa',
            i2: 'tokei',
            i3: 'ima nanji desu ka',
            i4: 'watashi wa asa roku-ji ni okimasu',
            i5: 'kanojo wa mainichi daigaku ni ikimasu',
            i6: 'kyou wa isogashii desu',
            q1: 'isshuukan wa nanoka desu',
            q2: 'kare wa yoru juu-ji ni nemasu',
            q3: 'asagohan ni nani o tabemasu ka',
            q4: 'chichi wa nichiyoubi ni hatarakimasen'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|what time|is|(question)',
            i4: 'I|(topic marker)|morning|six o\'clock|at|wake up',
            i5: 'she|(topic marker)|every day|college|to|goes',
            i6: 'today|(topic marker)|busy|am',
            q1: 'one week|(topic marker)|seven days|is',
            q2: 'he|(topic marker)|night|ten o\'clock|at|sleeps',
            q3: 'breakfast|for|what|(object marker)|eat|(question)',
            q4: 'my father|(topic marker)|Sunday|on|does not work'
        }
    },
    zh: {
        words: { morning: 'zǎoshang', evening: 'wǎnshang', week: 'xīngqī, zhōu', clock: 'zhōng', wake: 'xǐng, qǐchuáng', sleep: 'shuìjiào', breakfast: 'zǎofàn, zǎocān', busy: 'máng' },
        lines: {
            i1: 'zǎoshang',
            i2: 'zhōng',
            i3: 'xiànzài jǐ diǎn le',
            i4: 'wǒ zǎoshang liù diǎn qǐchuáng',
            i5: 'tā měitiān qù dàxué',
            i6: 'wǒ jīntiān hěn máng',
            q1: 'yí ge xīngqī yǒu qī tiān',
            q2: 'tā wǎnshang shí diǎn shuìjiào',
            q3: 'nǐ zǎofàn chī shénme',
            q4: 'wǒ bàba xīngqītiān bù gōngzuò'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|how many|o\'clock|(change marker)',
            i4: 'I|morning|six|o\'clock|get up',
            i5: 'she|every day|go to|college',
            i6: 'I|today|very|busy',
            q1: 'one|(measure word)|week|has|seven|days',
            q2: 'he|evening (night)|ten|o\'clock|sleeps',
            q3: 'you|breakfast|eat|what',
            q4: 'my (I)|father|Sunday|not|work'
        }
    },
    ko: {
        words: { morning: 'achim', evening: 'jeonyeok', week: 'ju, iljuil', clock: 'sigye', wake: 'kkaeda, ireonada', sleep: 'jada', breakfast: 'achimbap, achim siksa', busy: 'bappeun' },
        lines: {
            i1: 'achim',
            i2: 'sigye',
            i3: 'jigeum myeot siyeyo',
            i4: 'jeoneun achim yeoseot sie ireonayo',
            i5: 'geunyeoneun maeil daehage gayo',
            i6: 'oneureun bappayo',
            q1: 'iljuireun chil irieyo',
            q2: 'geuneun bam yeol sie jayo',
            q3: 'achimeuro mwo meogeoyo',
            q4: 'uri abeojineun iryoire iraji anayo'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|what|o\'clock is it',
            i4: 'I (topic)|morning|six|at o\'clock|wake up',
            i5: 'she (topic)|every day|to college|goes',
            i6: 'today (topic)|am busy',
            q1: 'a week (topic)|seven|days (it is)',
            q2: 'he (topic)|night|ten|at o\'clock|sleeps',
            q3: 'for breakfast|what|do you eat',
            q4: 'our (my)|father (topic)|on Sunday|work|does not'
        }
    },
    ru: {
        words: { morning: 'utro', evening: 'vecher', week: 'nedelya', clock: 'chasy', wake: 'prosypatsya', sleep: 'spat', breakfast: 'zavtrak', busy: 'zanyatoy' },
        lines: {
            i1: 'utro',
            i2: 'chasy',
            i3: 'kotory seychas chas',
            i4: 'ya prosypayus v shest utra',
            i5: 'ona kazhdy den khodit v kolledzh',
            i6: 'segodnya ya zanyat',
            q1: 'v nedele sem dney',
            q2: 'on lozhitsya spat v desyat vechera',
            q3: 'chto ty yesh na zavtrak',
            q4: 'moy papa ne rabotayet po voskresenyam'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'which|now|hour',
            i4: 'I|wake up|at|six|in the morning',
            i5: 'she|every|day|goes|to|college',
            i6: 'today|I|busy',
            q1: 'in|a week|seven|days',
            q2: 'he|lies down|to sleep|at|ten|in the evening',
            q3: 'what|you|eat|for|breakfast',
            q4: 'my|father|not|works|on|Sundays'
        }
    },
    ar: {
        words: { morning: 'sabaah', evening: 'masaa', week: 'usboo', clock: 'saa-a', wake: 'yastayqiz', sleep: 'yanaam', breakfast: 'futoor', busy: 'mashghool' },
        lines: {
            i1: 'sabaah',
            i2: 'saa-a',
            i3: 'kam as-saa-a al-aan',
            i4: 'astayqiz fee as-saa-a as-saadisa sabaahan',
            i5: 'hiya tadh-hab ilaa al-kulliyya kull yawm',
            i6: 'ana mashghool al-yawm',
            q1: 'fee al-usboo sab-at ayyaam',
            q2: 'huwa yanaam fee as-saa-a al-aashira laylan',
            q3: 'maadhaa ta-kul fee al-futoor',
            q4: 'abee laa ya-mal yawm al-ahad'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'how much (what)|the hour|now',
            i4: 'I wake up|at|the hour|the sixth|in the morning',
            i5: 'she|goes|to|the college|every|day',
            i6: 'I|busy|today',
            q1: 'in|the week|seven|days',
            q2: 'he|sleeps|at|the hour|the tenth|at night',
            q3: 'what|you eat|in|the breakfast',
            q4: 'my father|not|works|day|the Sunday'
        }
    },
    ur: {
        words: { morning: 'subah', evening: 'shaam', week: 'hafta', clock: 'ghari', wake: 'jaagna, uthna', sleep: 'sona', breakfast: 'naashta', busy: 'masroof' },
        lines: {
            i1: 'subah',
            i2: 'ghari',
            i3: 'abhi kitne baje hain',
            i4: 'main subah chhe baje uthta hoon',
            i5: 'woh roz kaalij jaati hai',
            i6: 'aaj main masroof hoon',
            q1: 'ek hafte mein saat din hote hain',
            q2: 'woh raat ko das baje sota hai',
            q3: 'tum naashte mein kya khaate ho',
            q4: 'mere abbu itwaar ko kaam nahin karte'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|how many|o\'clock (struck)|are',
            i4: 'I|morning|six|o\'clock|wake up|am',
            i5: 'she|daily|college|goes|is',
            i6: 'today|I|busy|am',
            q1: 'one|week|in|seven|days|are (always)|are',
            q2: 'he|night|at|ten|o\'clock|sleeps|is',
            q3: 'you|breakfast|in|what|eat|are',
            q4: 'my|father|Sunday|on|work|not|do'
        }
    },
    ta: {
        words: { morning: 'kaalai', evening: 'maalai', week: 'vaaram', clock: 'kadigaaram', wake: 'ezhundhiru, vizhi', sleep: 'thoongu', breakfast: 'kaalai unavu', busy: 'mummuramaana' },
        lines: {
            i1: 'kaalai',
            i2: 'kadigaaram',
            i3: 'ippodhu mani enna',
            i4: 'naan kaalai aaru manikku ezhuven',
            i5: 'aval dhinamum kalloorikku pogiraal',
            i6: 'indru enakku oyvu illai',
            q1: 'oru vaaraththil ezhu naatkal ullana',
            q2: 'avan iravu paththu manikku thoonguvaan',
            q3: 'nee kaalai unavukku enna saappiduvaai',
            q4: 'en appaa nyaayitrukkizhamai velai seivadhillai'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|time (hour)|what',
            i4: 'I|morning|six|at o\'clock|wake up',
            i5: 'she|every day|to college|goes',
            i6: 'today|for me|free time|there is not',
            q1: 'one|in a week|seven|days|there are',
            q2: 'he|night|ten|at o\'clock|sleeps',
            q3: 'you|morning|for food (breakfast)|what|eat',
            q4: 'my|father|Sunday|work|does not do'
        }
    },
    te: {
        words: { morning: 'udayam', evening: 'saayantram', week: 'vaaram', clock: 'gadiyaaram', wake: 'lechu, melkonu', sleep: 'nidrapovu', breakfast: 'alpaahaaram, tiffin', busy: 'teerika leni, bizee' },
        lines: {
            i1: 'udayam',
            i2: 'gadiyaaram',
            i3: 'ippudu samayam enta',
            i4: 'nenu udayam aaru gantalaku lestaanu',
            i5: 'aame pratirojoo kaalejeeki veltundi',
            i6: 'ee roju naaku teerika ledu',
            q1: 'oka vaaramlo edu rojulu untaayi',
            q2: 'atanu raatri padi gantalaku padukuntaadu',
            q3: 'nuvvu alpaahaaramlo emi tintaavu',
            q4: 'maa naanna aadivaaram pani cheyaru'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|time|how much',
            i4: 'I|morning|six|at o\'clock (hours)|wake up',
            i5: 'she|every day|to college|goes',
            i6: 'this|day (today)|for me|free time|there is not',
            q1: 'one|in a week|seven|days|there are',
            q2: 'he|night|ten|at o\'clock (hours)|sleeps',
            q3: 'you|in breakfast|what|eat',
            q4: 'our (my)|father|Sunday|work|does not do'
        }
    },
    ml: {
        words: { morning: 'raavile', evening: 'vaikunneram', week: 'aazhcha', clock: 'ghatikaaram', wake: 'unaruka', sleep: 'uranguka', breakfast: 'prabhaathabhakshanam', busy: 'thirakkulla' },
        lines: {
            i1: 'raavile',
            i2: 'ghatikaaram',
            i3: 'ippol samayam ethrayaayi',
            i4: 'njaan raavile aaru manikku ezhunnelkkum',
            i5: 'aval ellaa divasavum kolejil pokunnu',
            i6: 'innu enikku thirakkaanu',
            q1: 'oru aazhchayil ezhu divasangalundu',
            q2: 'avan raathri pathu manikku urangum',
            q3: 'nee prabhaathabhakshanathinu enthaanu kazhikkunnathu',
            q4: 'ente achan njaayaraazhcha joli cheyyaarilla'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|time|how much has it become',
            i4: 'I|morning|six|at o\'clock|wake up',
            i5: 'she|every|day|to college|goes',
            i6: 'today|for me|it is busy',
            q1: 'one|in a week|seven|there are days',
            q2: 'he|night|ten|at o\'clock|sleeps',
            q3: 'you|for breakfast|what is it|that you eat',
            q4: 'my|father|Sunday|work|does not usually do'
        }
    },
    mr: {
        words: { morning: 'sakaal', evening: 'sandhyaakaal', week: 'aathavdaa', clock: 'ghadyaal', wake: 'uthne, jaage hone', sleep: 'jhopne', breakfast: 'nyaahaari, naashtaa', busy: 'vyast' },
        lines: {
            i1: 'sakaal',
            i2: 'ghadyaal',
            i3: 'aataa kiti vaajle',
            i4: 'mi sakaali sahaa vaajtaa uthto',
            i5: 'ti roj kolejlaa jaate',
            i6: 'aaj mi vyast aahe',
            q1: 'ekaa aathavdyaat saat divas astaat',
            q2: 'to raatri dahaa vaajtaa jhopto',
            q3: 'too naashtyaalaa kaay khaatos',
            q4: 'maajhe baabaa ravivaari kaam karat naaheet'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|how many|has it struck (o\'clock)',
            i4: 'I|in the morning|six|at o\'clock|wake up',
            i5: 'she|daily|to college|goes',
            i6: 'today|I|busy|am',
            q1: 'one|in a week|seven|days|there are',
            q2: 'he|at night|ten|at o\'clock|sleeps',
            q3: 'you|for breakfast|what|eat',
            q4: 'my|father|on Sunday|work|doing|are not'
        }
    },
    bn: {
        words: { morning: 'shokal', evening: 'shondhya', week: 'shoptaho', clock: 'ghori', wake: 'jege otha, ghum theke otha', sleep: 'ghumano', breakfast: 'jolkhabar, pratorash', busy: 'byasto' },
        lines: {
            i1: 'shokal',
            i2: 'ghori',
            i3: 'ekhon kota baje',
            i4: 'ami shokal chhotay ghum theke uthi',
            i5: 'she protidin koleje jay',
            i6: 'aj ami byasto',
            q1: 'ek shoptahe shat din thake',
            q2: 'she rat doshtay ghumay',
            q3: 'tumi jolkhabare ki khao',
            q4: 'amar baba robibar kaj koren na'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|how many|is it striking (o\'clock)',
            i4: 'I|morning|at six|sleep|from|get up',
            i5: 'she|every day|to college|goes',
            i6: 'today|I|busy',
            q1: 'one|in a week|seven|days|there are',
            q2: 'he|night|at ten|sleeps',
            q3: 'you|for breakfast|what|eat',
            q4: 'my|father|Sunday|work|does|not'
        }
    },
    gu: {
        words: { morning: 'savaar', evening: 'saanj', week: 'athvaadiyun', clock: 'ghadiyaal', wake: 'jaagvun, oothvun', sleep: 'oonghvun, soovun', breakfast: 'naasto', busy: 'vyast' },
        lines: {
            i1: 'savaar',
            i2: 'ghadiyaal',
            i3: 'atyaare ketlaa vaagyaa chhe',
            i4: 'hun savaare chha vaagye oothun chhun',
            i5: 'te roj kolej jaay chhe',
            i6: 'aaje hun vyast chhun',
            q1: 'ek athvaadiyaamaan saat divas hoy chhe',
            q2: 'te raatre das vaagye sooi jaay chhe',
            q3: 'tun naastaamaan shun khaay chhe',
            q4: 'maaraa pappaa ravivaare kaam kartaa nathi'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|how many|struck (o\'clock)|is it',
            i4: 'I|in the morning|six|at o\'clock|wake up|am',
            i5: 'she|daily|college|goes|is',
            i6: 'today|I|busy|am',
            q1: 'one|in a week|seven|days|are (always)|is',
            q2: 'he|at night|ten|at o\'clock|sleep|goes (off)|is',
            q3: 'you|in breakfast|what|eat|is',
            q4: 'my|father|on Sunday|work|doing|is not'
        }
    },
    pa: {
        words: { morning: 'saver', evening: 'shaam', week: 'haftaa', clock: 'gharhi', wake: 'jaagnaa, utthnaa', sleep: 'saunaa', breakfast: 'naashtaa', busy: 'rujjhiaa' },
        lines: {
            i1: 'saver',
            i2: 'gharhi',
            i3: 'hun kinne vaje han',
            i4: 'main savere chhe vaje utthdaa haan',
            i5: 'uh har roz kaalaj jaandi hai',
            i6: 'ajj main rujjhiaa hoiaa haan',
            q1: 'ik hafte vich satt din hunde han',
            q2: 'uh raat nu das vaje saundaa hai',
            q3: 'toon naashte vich ki khaandaa hain',
            q4: 'mere pitaa ji aitvaar nu kamm nahin karde'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|how many|o\'clock|are',
            i4: 'I|in the morning|six|o\'clock|wake up|am',
            i5: 'she|every|day|college|goes|is',
            i6: 'today|I|busy|been|am',
            q1: 'one|week|in|seven|days|are (always)|are',
            q2: 'he|night|at|ten|o\'clock|sleeps|is',
            q3: 'you|breakfast|in|what|eat|are',
            q4: 'my|father|(respect)|Sunday|on|work|not|do'
        }
    },
    or: {
        words: { morning: 'sakaala', evening: 'sandhyaa', week: 'saptaaha', clock: 'ghadi', wake: 'uthibaa, jaagibaa', sleep: 'soibaa', breakfast: 'jalakhiaa', busy: 'byasta' },
        lines: {
            i1: 'sakaala',
            i2: 'ghadi',
            i3: 'ebe kete baajilaani',
            i4: 'mun sakaala chhataare uthe',
            i5: 'se pratidina kaleja jaae',
            i6: 'aaji mun byasta achhi',
            q1: 'goti saptaahare saata dina thaae',
            q2: 'se raati dashataare soe',
            q3: 'tume jalakhiaare kana khaa',
            q4: 'mo baapaa rabibaara dina kaama karanti naahin'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'now|how many|has it struck (o\'clock)',
            i4: 'I|morning|at six o\'clock|wake up',
            i5: 'she|every day|college|goes',
            i6: 'today|I|busy|am',
            q1: 'one|in a week|seven|days|there are',
            q2: 'he|night|at ten o\'clock|sleeps',
            q3: 'you|for breakfast|what|eat',
            q4: 'my|father|Sunday|day (on)|work|does|not'
        }
    },
    es: {
        words: { morning: 'ma-nya-na', evening: 'tar-deh, no-cheh', week: 'seh-ma-na', clock: 'reh-loh', wake: 'des-per-tar-seh', sleep: 'dor-meer', breakfast: 'deh-sa-yoo-no', busy: 'o-koo-pa-do' },
        lines: {
            i1: 'ma-nya-na',
            i2: 'reh-loh',
            i3: 'keh o-ra es a-o-ra',
            i4: 'meh des-pyer-to a las seys deh la ma-nya-na',
            i5: 'eh-ya ba a la oo-nee-ber-see-dad to-dos los dee-as',
            i6: 'oy es-toy o-koo-pa-do',
            q1: 'oo-na seh-ma-na tyeh-neh syeh-teh dee-as',
            q2: 'el seh a-kwes-ta a las dyes deh la no-cheh',
            q3: 'keh ko-mes en el deh-sa-yoo-no',
            q4: 'mee pa-dreh no tra-ba-ha los do-meen-gos'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'what|hour|is (it)|now',
            i4: 'myself|I wake|at|the|six|of|the|morning',
            i5: 'she|goes|to|the|university (college)|all|the|days',
            i6: 'today|I am|busy',
            q1: 'a|week|has|seven|days',
            q2: 'he|himself|lies down (goes to bed)|at|the|ten|of|the|night',
            q3: 'what|you eat|in|the|breakfast',
            q4: 'my|father|not|works|the (on)|Sundays'
        }
    },
    fr: {
        words: { morning: 'ma-tan', evening: 'swar', week: 'suh-men', clock: 'or-lozh', wake: 'suh ray-vay-yay', sleep: 'dor-meer', breakfast: 'puh-tee-day-zhuh-nay', busy: 'o-kew-pay' },
        lines: {
            i1: 'ma-tan',
            i2: 'or-lozh',
            i3: 'kel ur ay-teel man-tuh-nahn',
            i4: 'zhuh muh ray-vay a see-zur dew ma-tan',
            i5: 'el va a lew-nee-ver-see-tay too lay zhoor',
            i6: 'o-zhoor-dwee zhuh swee o-kew-pay',
            q1: 'eel ee a set zhoor dahn zewn suh-men',
            q2: 'eel suh koosh a dee-zur dew swar',
            q3: 'kes kuh tew mahnzh o puh-tee-day-zhuh-nay',
            q4: 'mon pehr nuh tra-vye pa luh dee-mahnsh'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'what|hour|is it|now',
            i4: 'I|myself|wake|at|six o\'clock|of the|morning',
            i5: 'she|goes|to|the university (college)|all|the|days',
            i6: 'today|I|am|busy',
            q1: 'it|there|has (there are)|seven|days|in|a|week',
            q2: 'he|himself|lies down (goes to bed)|at|ten o\'clock|of the|evening',
            q3: 'what is it|that|you|eat|at the|breakfast',
            q4: 'my|father|(not)|works|not|the (on)|Sunday'
        }
    },
    de: {
        words: { morning: 'mor-gen', evening: 'aa-bent', week: 'vo-kheh', clock: 'oor', wake: 'auf-va-khen', sleep: 'shlaa-fen', breakfast: 'frew-shtewk', busy: 'beh-shef-tikt' },
        lines: {
            i1: 'mor-gen',
            i2: 'oor',
            i3: 'vee shpayt ist es yetst',
            i4: 'ikh va-kheh oom zeks oor mor-gens auf',
            i5: 'zee gayt yay-den taak tsoor hohkh-shoo-leh',
            i6: 'hoy-teh bin ikh beh-shef-tikt',
            q1: 'eye-neh vo-kheh hat zee-ben taa-geh',
            q2: 'ehr gayt oom tsayn oor aa-bents shlaa-fen',
            q3: 'vas ist doo tsoom frew-shtewk',
            q4: 'mine faa-ter ar-by-tet zon-taaks nikht'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'how|late|is|it|now',
            i4: 'I|wake|at|six|o\'clock|in the morning|up',
            i5: 'she|goes|every|day|to the|college',
            i6: 'today|am|I|busy',
            q1: 'a|week|has|seven|days',
            q2: 'he|goes|at|ten|o\'clock|in the evening|to sleep',
            q3: 'what|eat|you|for the|breakfast',
            q4: 'my|father|works|on Sundays|not'
        }
    },
    pt: {
        words: { morning: 'ma-nyan', evening: 'noy-chee', week: 'seh-ma-na', clock: 'heh-lo-zhyoo', wake: 'a-kor-dar', sleep: 'dor-meer', breakfast: 'ka-feh da ma-nyan', busy: 'o-koo-pa-doo' },
        lines: {
            i1: 'ma-nyan',
            i2: 'heh-lo-zhyoo',
            i3: 'kee o-ras sown a-go-ra',
            i4: 'eh-oo a-kor-doo as says da ma-nyan',
            i5: 'eh-la vy pa-ra a fa-kool-da-jee to-doos oos jee-as',
            i6: 'o-zhee es-toh o-koo-pa-doo',
            q1: 'oo-ma seh-ma-na tayn seh-chee jee-as',
            q2: 'eh-lee dor-mee as dez da noy-chee',
            q3: 'oo kee vo-seh ko-mee noo ka-feh da ma-nyan',
            q4: 'meh-oo pie nown tra-ba-lya ows do-meen-goos'
        },
        glosses: {
            i1: 'morning',
            i2: 'clock',
            i3: 'what|hours|are|now',
            i4: 'I|wake up|at the|six|of the|morning',
            i5: 'she|goes|to|the|college|all|the|days',
            i6: 'today|I am|busy',
            q1: 'a|week|has|seven|days',
            q2: 'he|sleeps|at the|ten|of the|night',
            q3: 'what|(question word)|you|eat|at the|coffee|of the|morning',
            q4: 'my|father|not|works|on the|Sundays'
        }
    }
};

module.exports = {
    lessons,
    names: { 'vocab-beginner-4': ['Time and days', 'My day'] },
    tipsFrom: { 'translation-beginner-4': 'translation-beginner-kn-en' },
    words: { 'vocab-beginner-4': words },
    sentences: { 'translation-beginner-4': sentences },
    asks,
    sounds
};
