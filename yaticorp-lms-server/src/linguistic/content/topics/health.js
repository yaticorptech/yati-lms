/**
 * Intermediate, topic 3 — Health (asked 2026-10-24: "make more units in each
 * section for each language"). Two units (parts.js): Staying healthy, and At
 * the doctor. The words and sentences in every language are below the
 * lessons; written here, not by any translation service — a native speaker
 * should check them.
 */
const { w, mcq, fill, fix, order, dialogue, item, tipsOf } = require('./make');

const lessons = [
    {
        seedKey: 'vocab-intermediate-3', module: 'vocabulary', level: 'intermediate', order: 3,
        title: 'Health',
        summary: 'Words for staying healthy and for a visit to the doctor.',
        learn: {
            intro: 'Learn each word with its Kannada meaning. Read the example sentence aloud to remember how the word is used.',
            points: ['Notice which words are nouns (a fever) and which are verbs (to recover).', 'Use the words to describe your own habits.']
        },
        words: [
            w('healthy', 'ಆರೋಗ್ಯಕರ, ಆರೋಗ್ಯವಂತ', 'adjective', 'Fresh fruit and vegetables keep you healthy.', ['fit', 'well'], ['unhealthy', 'ill']),
            w('exercise', 'ವ್ಯಾಯಾಮ', 'noun', 'Thirty minutes of exercise a day is good for the heart.', ['workout']),
            w('habit', 'ಅಭ್ಯಾಸ, ರೂಢಿ', 'noun', 'Drinking enough water is a good habit.', ['routine', 'practice']),
            w('energy', 'ಶಕ್ತಿ, ಚೈತನ್ಯ', 'noun', 'A good breakfast gives you energy for the day.', ['strength', 'power'], ['tiredness']),
            w('fever', 'ಜ್ವರ', 'noun', 'She stayed at home because she had a fever.', ['temperature']),
            w('medicine', 'ಔಷಧಿ, ಮದ್ದು', 'noun', 'Take this medicine twice a day after food.', ['tablet', 'medication']),
            w('appointment', 'ಭೇಟಿಯ ನಿಗದಿತ ಸಮಯ', 'noun', 'I have an appointment with the doctor at five.', ['booking']),
            w('recover', 'ಗುಣಮುಖರಾಗು, ಚೇತರಿಸಿಕೊಳ್ಳು', 'verb', 'He will recover in a few days if he rests.', ['get better', 'heal'])
        ]
    },
    {
        seedKey: 'grammar-intermediate-3', module: 'grammar', level: 'intermediate', order: 3,
        title: 'Advice and rules: should, must, can',
        summary: 'Giving advice, stating rules and asking permission.',
        learn: {
            intro: 'Should, must and can add meaning to the main verb: advice, a rule, or ability and permission. The main verb after them stays in its plain form.',
            points: [
                '"Should" gives advice: You should drink more water.',
                '"Must" shows a strong rule or need: You must take this medicine after food.',
                '"Can" shows ability or permission: I can swim. Can I sit here?',
                'After should, must and can, use the plain verb: She should rest (not "She should rests" or "She should to rest").',
                'For the negative, add not: You should not (shouldn\'t) skip breakfast. You must not (mustn\'t) smoke here.'
            ],
            examples: ['You should sleep for eight hours.', 'Patients must wait for their turn.', 'Can you help me?', 'You should not eat too much sugar.']
        },
        practice: [
            mcq('p1', 'You have a fever. You ___ rest at home.', ['should', 'should not', 'cannot'], 'should', '"Should" gives advice: resting is good for you.'),
            fill('p2', 'She can ___ very fast. (run / runs)', 'run', 'After "can", use the plain verb: run.'),
            mcq('p3', 'You ___ wear a helmet on a bike. It is the law.', ['must', 'can', 'might'], 'must', 'A law is a strong rule, so we use "must".'),
            fix('p4', 'He should eats more fruit.', 'He should eat more fruit.', 'After "should", use the plain verb: eat, not eats.'),
            mcq('p5', 'You ___ not skip breakfast.', ['should', 'should to', 'shoulds'], 'should', '"Should not" gives advice against something; there is no "to" after "should".'),
            order('p6', ['sit', 'Can', 'here', 'I'], 'Can I sit here?', 'In a question, "Can" comes before the subject: Can I…?')
        ],
        quiz: [
            mcq('q1', 'You look tired. You ___ go to bed early.', ['should', 'must not', 'cannot'], 'should', 'This is advice, so we use "should".'),
            fill('q2', 'Students ___ wear their ID cards in college. It is a rule. (must / can)', 'must', 'A rule uses "must".'),
            mcq('q3', 'Which is correct?', ['She can speak three languages.', 'She can speaks three languages.', 'She can to speak three languages.'], 'She can speak three languages.', 'After "can", use the plain verb without "to".'),
            fix('q4', 'You must to take the medicine.', 'You must take the medicine.', 'There is no "to" after "must".'),
            mcq('q5', '___ I open the window? It is hot in here.', ['Can', 'Must', 'Should not'], 'Can', '"Can I…?" asks for permission.'),
            fill('q6', 'You should ___ more water. (drink / drinks)', 'drink', 'After "should", use the plain verb.'),
            mcq('q7', 'The doctor said, "You ___ eat oily food. It is bad for your stomach."', ['should not', 'can', 'should'], 'should not', 'This is advice against something: should not.'),
            order('q8', ['exercise', 'should', 'every day', 'We'], 'We should exercise every day.', 'Subject (We) + should + plain verb (exercise) + when (every day).')
        ]
    },
    {
        seedKey: 'reading-intermediate-3', module: 'reading', level: 'intermediate', order: 3,
        title: 'Small Habits, Big Changes',
        summary: 'How a student changed a few habits and felt the difference.',
        learn: {
            intro: 'Read the passage. Notice the advice the doctor gives, and what changes for Ramya.',
            passage: {
                title: 'Small Habits, Big Changes',
                text: 'Ramya is a second-year engineering student. Last year, she often felt tired and could not focus in class. She slept late every night, watching videos on her phone, and she usually skipped breakfast. One day, the college doctor gave her some simple advice. "You should sleep for at least seven hours, eat breakfast every morning and walk for thirty minutes a day," he said. Ramya decided to try. At first, it was difficult to put her phone away at night. After two weeks, however, she had more energy, and her marks started to improve. Now she walks with her friends every evening. "Small habits can make a big difference," she says.'
            }
        },
        quiz: [
            mcq('q1', 'Why did Ramya feel tired last year?', ['She slept late and skipped breakfast', 'She had too many exams', 'She had a fever', 'She walked too much'], 'She slept late and skipped breakfast', '"She slept late every night… and she usually skipped breakfast."'),
            mcq('q2', 'Who gave her advice?', ['The college doctor', 'Her mother', 'Her friend', 'Her teacher'], 'The college doctor', '"One day, the college doctor gave her some simple advice."'),
            mcq('q3', 'How long should she walk every day?', ['Thirty minutes', 'Two hours', 'Ten minutes', 'Seven hours'], 'Thirty minutes', '"…walk for thirty minutes a day."'),
            mcq('q4', 'What was difficult for Ramya at first?', ['Putting her phone away at night', 'Eating breakfast', 'Walking with friends', 'Going to college'], 'Putting her phone away at night', '"At first, it was difficult to put her phone away at night."'),
            mcq('q5', 'What changed after two weeks?', ['She had more energy and her marks improved', 'She stopped going to college', 'She bought a new phone', 'She became a doctor'], 'She had more energy and her marks improved', '"After two weeks, however, she had more energy, and her marks started to improve."')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['should', 'You', 'early', 'sleep'], answer: 'You should sleep early.', model: 'You should sleep early.' },
            { id: 'w2', type: 'jumbled', prompt: 'Put the words in order.', words: ['a good habit', 'is', 'Walking', 'every day'], answer: 'Walking every day is a good habit.', model: 'Walking every day is a good habit.' },
            { id: 'w3', type: 'sentence', prompt: 'Make one sentence with the word "healthy".', mustInclude: ['healthy'], minWords: 5, model: 'Eating fresh fruit every day keeps me healthy.' },
            { id: 'w4', type: 'paragraph', prompt: 'Write 5 or 6 sentences of advice for a friend who is always tired. Use "should" at least twice.', minWords: 40, model: 'I am sorry that you feel tired all the time. First, you should go to bed before eleven every night. You should also put your phone away an hour before you sleep. Try to eat breakfast every morning, because it gives you energy. A short walk in the evening can help too. If you still feel tired, you must see a doctor.', checklist: ['I used "should" at least twice', 'I gave more than one piece of advice', 'I used the plain verb after should', 'I ended kindly'] }
        ]
    },
    {
        seedKey: 'speaking-intermediate-3', module: 'speaking', level: 'intermediate', order: 3,
        title: 'At the doctor\'s clinic',
        summary: 'Describing how you feel and following the doctor\'s advice.',
        learn: {
            intro: 'Listen to how Nikhil describes his problem and how the doctor advises him.',
            dialogue: dialogue('speaking-intermediate-3', 'At a clinic: Nikhil sees the doctor about a fever.', [{ name: 'Doctor', voice: 'f' }, { name: 'Nikhil', voice: 'm' }], [
                ['Doctor', 'Good evening, Nikhil. Please sit down. What seems to be the problem?'],
                ['Nikhil', 'Good evening, doctor. I have had a fever and a headache since yesterday.'],
                ['Doctor', 'I see. Do you have a cough or a sore throat?'],
                ['Nikhil', 'I have a slight cough, but my throat is fine.'],
                ['Doctor', 'Let me check your temperature. It is a little high. Have you eaten anything outside recently?'],
                ['Nikhil', 'Yes, I ate at a roadside stall two days ago.'],
                ['Doctor', 'That may be the reason. Take this medicine three times a day after food, and drink plenty of water.'],
                ['Nikhil', 'Should I go to college tomorrow?'],
                ['Doctor', 'No, you should rest at home for two days. You will recover soon.'],
                ['Nikhil', 'Thank you, doctor.']
            ]),
            phrases: ['What seems to be the problem?', 'I have had a fever since yesterday.', 'Should I go to college tomorrow?']
        },
        quiz: [
            mcq('q1', 'What is Nikhil\'s problem?', ['A fever and a headache', 'A broken leg', 'A toothache', 'Only a stomach ache'], 'A fever and a headache', 'Nikhil says: "I have had a fever and a headache since yesterday."'),
            mcq('q2', 'Since when has he been ill?', ['Since yesterday', 'For a week', 'Since this morning', 'For a month'], 'Since yesterday', '"…since yesterday."'),
            mcq('q3', 'How often should he take the medicine?', ['Three times a day after food', 'Once a week', 'Twice a day before food', 'Only at night'], 'Three times a day after food', '"Take this medicine three times a day after food."'),
            mcq('q4', 'What does the doctor tell him to do about college?', ['Rest at home for two days', 'Go tomorrow', 'Go next month', 'Stop studying'], 'Rest at home for two days', '"No, you should rest at home for two days."')
        ],
        speaking: {
            prompt: 'You are at a clinic. In 5 or 6 sentences, tell the doctor how you feel and since when, and ask one question about your medicine.',
            sample: 'Good morning, doctor. I have had a sore throat and a cough for three days. I also feel very tired. I have not had a fever. How many times a day should I take the medicine? Thank you for your help.',
            checklist: ['I greeted the doctor politely', 'I said what the problem is', 'I said since when (since / for)', 'I asked a question with "should"', 'I spoke in full sentences', 'I thanked the doctor']
        }
    },
    {
        seedKey: 'translation-intermediate-3', module: 'translation', level: 'intermediate', order: 3, direction: 'kn-en',
        title: 'Health and the doctor: Kannada → English',
        summary: 'Healthy habits, feeling ill and seeing a doctor.',
        learn: { intro: 'Translate each Kannada sentence into English. Watch the tense and the small words English needs.', points: tipsOf('translation-intermediate-kn-en') },
        items: [
            item('i1', 'sentence', 'vocabulary', 'ನಾನು ಪ್ರತಿದಿನ ವ್ಯಾಯಾಮ ಮಾಡುತ್ತೇನೆ.', 'I exercise every day.', 'For a habit, use the present simple: I exercise every day.', ['I do exercise every day.', 'I do exercises every day.', 'I work out every day.', 'Every day I exercise.']),
            item('i2', 'sentence', 'grammar', 'ನೀವು ಹೆಚ್ಚು ನೀರು ಕುಡಿಯಬೇಕು.', 'You should drink more water.', '"Should" gives advice; the plain verb "drink" comes after it.', ['You must drink more water.', 'You need to drink more water.', 'You have to drink more water.']),
            item('i3', 'sentence', 'daily conversation', 'ಬೆಳಗಿನ ಉಪಾಹಾರ ಬಿಡಬೇಡಿ.', 'Don\'t skip breakfast.', 'A friendly warning starts with "Do not" or "Don\'t".', ['Do not skip breakfast.', 'Do not miss breakfast.', 'Don\'t miss breakfast.', 'Never skip breakfast.']),
            item('i4', 'sentence', 'vocabulary', 'ನನಗೆ ಜ್ವರ ಬಂದಿದೆ.', 'I have a fever.', 'English says "I have a fever", with "a".', ['I have got a fever.', 'I\'ve got a fever.', 'I have fever.', 'I am having a fever.']),
            item('i5', 'sentence', 'daily conversation', 'ನನಗೆ ತಲೆನೋವು ಇದೆ.', 'I have a headache.', 'Pains are "had" in English: I have a headache, a toothache, a stomach ache.', ['I\'ve got a headache.', 'I have got a headache.', 'My head is aching.', 'My head hurts.']),
            item('i6', 'sentence', 'grammar', 'ಈ ಔಷಧಿಯನ್ನು ಊಟದ ನಂತರ ತೆಗೆದುಕೊಳ್ಳಿ.', 'Take this medicine after food.', 'An instruction starts with the verb: Take…', ['Take this medicine after meals.', 'Take this medicine after eating.', 'Take this medicine after a meal.', 'Please take this medicine after food.'])
        ],
        quiz: [
            item('q1', 'sentence', 'vocabulary', 'ಒಳ್ಳೆಯ ನಿದ್ರೆ ಆರೋಗ್ಯಕ್ಕೆ ಮುಖ್ಯ.', 'Good sleep is important for health.', 'English needs "is": Good sleep is important.', ['Good sleep is important for your health.', 'Good sleep is important for good health.', 'Sleeping well is important for health.', 'A good sleep is important for health.']),
            item('q2', 'sentence', 'grammar', 'ಹಣ್ಣುಗಳು ನಮ್ಮನ್ನು ಆರೋಗ್ಯವಾಗಿಡುತ್ತವೆ.', 'Fruits keep us healthy.', 'Keep + someone + how: keep us healthy.', ['Fruit keeps us healthy.', 'Fruits keep us fit.', 'Fruit keeps us fit.']),
            item('q3', 'sentence', 'daily conversation', 'ನಾನು ವೈದ್ಯರನ್ನು ಭೇಟಿಯಾಗಬೇಕು.', 'I need to see a doctor.', 'In English you "see" a doctor.', ['I have to see a doctor.', 'I must see a doctor.', 'I should see a doctor.', 'I need to see the doctor.', 'I have to see the doctor.', 'I need to meet a doctor.', 'I have to meet the doctor.']),
            item('q4', 'sentence', 'grammar', 'ಅವನು ಬೇಗ ಗುಣಮುಖನಾಗುತ್ತಾನೆ.', 'He will recover soon.', 'For the future, use will + the plain verb.', ['He will get better soon.', 'He will be well soon.', 'He will recover quickly.', 'He\'ll recover soon.', 'He\'ll get better soon.'])
        ]
    }
];

// Each word's meaning in every language (English: a definition, for English speakers).
const words = {
    healthy: { hi: 'स्वस्थ', ta: 'ஆரோக்கியமான', te: 'ఆరోగ్యకరమైన', ml: 'ആരോഗ്യമുള്ള', mr: 'निरोगी', bn: 'সুস্থ', gu: 'તંદુરસ્ત', pa: 'ਸਿਹਤਮੰਦ', or: 'ସୁସ୍ଥ', ur: 'صحت مند', es: 'sano', fr: 'en bonne santé', de: 'gesund', pt: 'saudável', ru: 'здоровый', ar: 'صحي', zh: '健康的', ja: '健康な', ko: '건강한', en: 'in good health; good for your body' },
    exercise: { hi: 'व्यायाम, कसरत', ta: 'உடற்பயிற்சி', te: 'వ్యాయామం', ml: 'വ്യായാമം', mr: 'व्यायाम', bn: 'ব্যায়াম', gu: 'કસરત', pa: 'ਕਸਰਤ', or: 'ବ୍ୟାୟାମ', ur: 'ورزش', es: 'ejercicio', fr: 'exercice', de: 'Bewegung, Sport', pt: 'exercício', ru: 'физические упражнения', ar: 'تمارين رياضية', zh: '锻炼', ja: '運動', ko: '운동', en: 'moving your body to stay strong and fit' },
    habit: { hi: 'आदत', ta: 'பழக்கம்', te: 'అలవాటు', ml: 'ശീലം', mr: 'सवय', bn: 'অভ্যাস', gu: 'ટેવ', pa: 'ਆਦਤ', or: 'ଅଭ୍ୟାସ', ur: 'عادت', es: 'hábito', fr: 'habitude', de: 'Gewohnheit', pt: 'hábito', ru: 'привычка', ar: 'عادة', zh: '习惯', ja: '習慣', ko: '습관', en: 'something you do often, almost without thinking' },
    energy: { hi: 'ऊर्जा, ताकत', ta: 'ஆற்றல்', te: 'శక్తి', ml: 'ഊർജം', mr: 'ऊर्जा', bn: 'শক্তি', gu: 'શક્તિ', pa: 'ਊਰਜਾ', or: 'ଶକ୍ତି', ur: 'توانائی', es: 'energía', fr: 'énergie', de: 'Energie', pt: 'energia', ru: 'энергия', ar: 'طاقة', zh: '精力', ja: '元気', ko: '기운', en: 'the strength to work and be active' },
    fever: { hi: 'बुखार', ta: 'காய்ச்சல்', te: 'జ్వరం', ml: 'പനി', mr: 'ताप', bn: 'জ্বর', gu: 'તાવ', pa: 'ਬੁਖ਼ਾਰ', or: 'ଜ୍ୱର', ur: 'بخار', es: 'fiebre', fr: 'fièvre', de: 'Fieber', pt: 'febre', ru: 'температура, жар', ar: 'حمى', zh: '发烧', ja: '熱', ko: '열', en: 'a body temperature higher than normal, when you are ill' },
    medicine: { hi: 'दवा', ta: 'மருந்து', te: 'మందు', ml: 'മരുന്ന്', mr: 'औषध', bn: 'ওষুধ', gu: 'દવા', pa: 'ਦਵਾਈ', or: 'ଔଷଧ', ur: 'دوا', es: 'medicina', fr: 'médicament', de: 'Medikament', pt: 'remédio', ru: 'лекарство', ar: 'دواء', zh: '药', ja: '薬', ko: '약', en: 'something you take to get better when you are ill' },
    appointment: { hi: 'मिलने का तय समय', ta: 'சந்திப்புக்கான நேரம்', te: 'కలవడానికి నిర్ణయించిన సమయం', ml: 'മുൻകൂട്ടി നിശ്ചയിച്ച സമയം', mr: 'भेटीची वेळ', bn: 'সাক্ষাতের নির্ধারিত সময়', gu: 'મુલાકાતનો નક્કી સમય', pa: 'ਮਿਲਣ ਦਾ ਤੈਅ ਸਮਾਂ', or: 'ସାକ୍ଷାତର ନିର୍ଦ୍ଧାରିତ ସମୟ', ur: 'ملاقات کا مقررہ وقت', es: 'cita', fr: 'rendez-vous', de: 'Termin', pt: 'consulta marcada', ru: 'запись на приём', ar: 'موعد', zh: '预约', ja: '予約', ko: '예약', en: 'a fixed time to meet someone, such as a doctor' },
    recover: { hi: 'ठीक होना', ta: 'குணமடைதல்', te: 'కోలుకోవడం', ml: 'സുഖം പ്രാപിക്കുക', mr: 'बरे होणे', bn: 'সেরে ওঠা', gu: 'સાજા થવું', pa: 'ਠੀਕ ਹੋਣਾ', or: 'ସୁସ୍ଥ ହେବା', ur: 'صحت یاب ہونا', es: 'recuperarse', fr: 'guérir', de: 'sich erholen', pt: 'recuperar-se', ru: 'выздороветь', ar: 'يتعافى', zh: '康复', ja: '回復する', ko: '회복하다', en: 'to become well again after being ill or hurt' }
};

// Each Kannada sentence of the translation lesson in every language (the English is the lesson's own).
const sentences = {
    i1: { hi: 'मैं रोज़ व्यायाम करता हूँ।', ta: 'நான் தினமும் உடற்பயிற்சி செய்கிறேன்.', te: 'నేను ప్రతిరోజూ వ్యాయామం చేస్తాను.', ml: 'ഞാൻ ദിവസവും വ്യായാമം ചെയ്യുന്നു.', mr: 'मी रोज व्यायाम करतो.', bn: 'আমি প্রতিদিন ব্যায়াম করি।', gu: 'હું રોજ કસરત કરું છું.', pa: 'ਮੈਂ ਹਰ ਰੋਜ਼ ਕਸਰਤ ਕਰਦਾ ਹਾਂ।', or: 'ମୁଁ ପ୍ରତିଦିନ ବ୍ୟାୟାମ କରେ।', ur: 'میں روز ورزش کرتا ہوں۔', es: 'Hago ejercicio todos los días.', fr: 'Je fais de l’exercice tous les jours.', de: 'Ich mache jeden Tag Sport.', pt: 'Eu faço exercício todos os dias.', ru: 'Я каждый день делаю зарядку.', ar: 'أمارس الرياضة كل يوم.', zh: '我每天锻炼。', ja: '私は毎日運動します。', ko: '저는 매일 운동해요.' },
    i2: { hi: 'आपको ज़्यादा पानी पीना चाहिए।', ta: 'நீங்கள் அதிகம் தண்ணீர் குடிக்க வேண்டும்.', te: 'మీరు ఎక్కువ నీళ్ళు తాగాలి.', ml: 'നിങ്ങൾ കൂടുതൽ വെള്ളം കുടിക്കണം.', mr: 'तुम्ही जास्त पाणी प्यायला हवे.', bn: 'আপনার আরও বেশি জল খাওয়া উচিত।', gu: 'તમારે વધુ પાણી પીવું જોઈએ.', pa: 'ਤੁਹਾਨੂੰ ਵੱਧ ਪਾਣੀ ਪੀਣਾ ਚਾਹੀਦਾ ਹੈ।', or: 'ଆପଣ ଅଧିକ ପାଣି ପିଇବା ଉଚିତ।', ur: 'آپ کو زیادہ پانی پینا چاہیے۔', es: 'Deberías beber más agua.', fr: 'Tu devrais boire plus d’eau.', de: 'Du solltest mehr Wasser trinken.', pt: 'Você deveria beber mais água.', ru: 'Вам нужно пить больше воды.', ar: 'يجب أن تشرب المزيد من الماء.', zh: '你应该多喝水。', ja: 'もっと水を飲んだほうがいいです。', ko: '물을 더 많이 마셔야 해요.' },
    i3: { hi: 'सुबह का नाश्ता मत छोड़िए।', ta: 'காலை உணவைத் தவிர்க்காதீர்கள்.', te: 'ఉదయం టిఫిన్ మానేయకండి.', ml: 'പ്രഭാതഭക്ഷണം ഒഴിവാക്കരുത്.', mr: 'सकाळचा नाश्ता टाळू नका.', bn: 'সকালের জলখাবার বাদ দেবেন না।', gu: 'સવારનો નાસ્તો છોડશો નહીં.', pa: 'ਸਵੇਰ ਦਾ ਨਾਸ਼ਤਾ ਨਾ ਛੱਡੋ।', or: 'ସକାଳ ଜଳଖିଆ ଛାଡ଼ନ୍ତୁ ନାହିଁ।', ur: 'صبح کا ناشتہ مت چھوڑیے۔', es: 'No te saltes el desayuno.', fr: 'Ne saute pas le petit-déjeuner.', de: 'Lass das Frühstück nicht aus.', pt: 'Não pule o café da manhã.', ru: 'Не пропускайте завтрак.', ar: 'لا تفوّت وجبة الفطور.', zh: '不要不吃早饭。', ja: '朝ごはんを抜かないでください。', ko: '아침을 거르지 마세요.' },
    i4: { hi: 'मुझे बुखार है।', ta: 'எனக்குக் காய்ச்சல் வந்திருக்கிறது.', te: 'నాకు జ్వరం వచ్చింది.', ml: 'എനിക്ക് പനിയുണ്ട്.', mr: 'मला ताप आला आहे.', bn: 'আমার জ্বর হয়েছে।', gu: 'મને તાવ આવ્યો છે.', pa: 'ਮੈਨੂੰ ਬੁਖ਼ਾਰ ਹੈ।', or: 'ମୋତେ ଜ୍ୱର ହୋଇଛି।', ur: 'مجھے بخار ہے۔', es: 'Tengo fiebre.', fr: 'J’ai de la fièvre.', de: 'Ich habe Fieber.', pt: 'Estou com febre.', ru: 'У меня температура.', ar: 'عندي حمى.', zh: '我发烧了。', ja: '熱があります。', ko: '열이 나요.' },
    i5: { hi: 'मुझे सिरदर्द है।', ta: 'எனக்குத் தலைவலிக்கிறது.', te: 'నాకు తలనొప్పిగా ఉంది.', ml: 'എനിക്ക് തലവേദനയുണ്ട്.', mr: 'माझं डोकं दुखतंय.', bn: 'আমার মাথা ব্যথা করছে।', gu: 'મને માથું દુખે છે.', pa: 'ਮੇਰਾ ਸਿਰ ਦੁਖਦਾ ਹੈ।', or: 'ମୋର ମୁଣ୍ଡ ବିନ୍ଧୁଛି।', ur: 'میرے سر میں درد ہے۔', es: 'Me duele la cabeza.', fr: 'J’ai mal à la tête.', de: 'Ich habe Kopfschmerzen.', pt: 'Estou com dor de cabeça.', ru: 'У меня болит голова.', ar: 'عندي صداع.', zh: '我头疼。', ja: '頭が痛いです。', ko: '머리가 아파요.' },
    i6: { hi: 'यह दवा खाने के बाद लीजिए।', ta: 'இந்த மருந்தைச் சாப்பாட்டுக்குப் பிறகு எடுத்துக்கொள்ளுங்கள்.', te: 'ఈ మందును భోజనం తర్వాత వేసుకోండి.', ml: 'ഈ മരുന്ന് ഭക്ഷണത്തിനു ശേഷം കഴിക്കുക.', mr: 'हे औषध जेवणानंतर घ्या.', bn: 'এই ওষুধটা খাওয়ার পরে খাবেন।', gu: 'આ દવા જમ્યા પછી લો.', pa: 'ਇਹ ਦਵਾਈ ਖਾਣੇ ਤੋਂ ਬਾਅਦ ਲਓ।', or: 'ଏହି ଔଷଧ ଖାଇବା ପରେ ନିଅନ୍ତୁ।', ur: 'یہ دوا کھانے کے بعد لیجیے۔', es: 'Toma esta medicina después de comer.', fr: 'Prends ce médicament après le repas.', de: 'Nimm dieses Medikament nach dem Essen.', pt: 'Tome este remédio depois de comer.', ru: 'Принимайте это лекарство после еды.', ar: 'تناول هذا الدواء بعد الأكل.', zh: '饭后吃这个药。', ja: 'この薬は食後に飲んでください。', ko: '이 약은 식후에 드세요.' },
    q1: { hi: 'अच्छी नींद सेहत के लिए ज़रूरी है।', ta: 'நல்ல தூக்கம் ஆரோக்கியத்துக்கு முக்கியம்.', te: 'మంచి నిద్ర ఆరోగ్యానికి ముఖ్యం.', ml: 'നല്ല ഉറക്കം ആരോഗ്യത്തിന് പ്രധാനമാണ്.', mr: 'चांगली झोप आरोग्यासाठी महत्त्वाची आहे.', bn: 'ভালো ঘুম স্বাস্থ্যের জন্য জরুরি।', gu: 'સારી ઊંઘ સ્વાસ્થ્ય માટે જરૂરી છે.', pa: 'ਚੰਗੀ ਨੀਂਦ ਸਿਹਤ ਲਈ ਜ਼ਰੂਰੀ ਹੈ।', or: 'ଭଲ ନିଦ ସ୍ୱାସ୍ଥ୍ୟ ପାଇଁ ଜରୁରୀ।', ur: 'اچھی نیند صحت کے لیے ضروری ہے۔', es: 'Dormir bien es importante para la salud.', fr: 'Un bon sommeil est important pour la santé.', de: 'Guter Schlaf ist wichtig für die Gesundheit.', pt: 'Um bom sono é importante para a saúde.', ru: 'Хороший сон важен для здоровья.', ar: 'النوم الجيد مهم للصحة.', zh: '良好的睡眠对健康很重要。', ja: 'よく眠ることは健康に大切です。', ko: '잘 자는 것은 건강에 중요해요.' },
    q2: { hi: 'फल हमें स्वस्थ रखते हैं।', ta: 'பழங்கள் நம்மை ஆரோக்கியமாக வைக்கின்றன.', te: 'పండ్లు మనల్ని ఆరోగ్యంగా ఉంచుతాయి.', ml: 'പഴങ്ങൾ നമ്മെ ആരോഗ്യത്തോടെ നിലനിർത്തുന്നു.', mr: 'फळे आपल्याला निरोगी ठेवतात.', bn: 'ফল আমাদের সুস্থ রাখে।', gu: 'ફળો આપણને તંદુરસ્ત રાખે છે.', pa: 'ਫਲ ਸਾਨੂੰ ਸਿਹਤਮੰਦ ਰੱਖਦੇ ਹਨ।', or: 'ଫଳ ଆମକୁ ସୁସ୍ଥ ରଖେ।', ur: 'پھل ہمیں صحت مند رکھتے ہیں۔', es: 'Las frutas nos mantienen sanos.', fr: 'Les fruits nous gardent en bonne santé.', de: 'Obst hält uns gesund.', pt: 'As frutas nos mantêm saudáveis.', ru: 'Фрукты помогают нам быть здоровыми.', ar: 'الفواكه تحافظ على صحتنا.', zh: '水果让我们保持健康。', ja: '果物は私たちを健康にしてくれます。', ko: '과일은 우리를 건강하게 해 줘요.' },
    q3: { hi: 'मुझे डॉक्टर से मिलना है।', ta: 'நான் மருத்துவரைப் பார்க்க வேண்டும்.', te: 'నేను డాక్టర్‌ను కలవాలి.', ml: 'എനിക്ക് ഡോക്ടറെ കാണണം.', mr: 'मला डॉक्टरांना भेटायचं आहे.', bn: 'আমাকে ডাক্তার দেখাতে হবে।', gu: 'મારે ડૉક્ટરને મળવું છે.', pa: 'ਮੈਨੂੰ ਡਾਕਟਰ ਨੂੰ ਮਿਲਣਾ ਹੈ।', or: 'ମୋତେ ଡାକ୍ତରଙ୍କୁ ଦେଖାଇବାକୁ ହେବ।', ur: 'مجھے ڈاکٹر سے ملنا ہے۔', es: 'Necesito ver a un médico.', fr: 'J’ai besoin de voir un médecin.', de: 'Ich muss zum Arzt.', pt: 'Preciso ver um médico.', ru: 'Мне нужно к врачу.', ar: 'أحتاج إلى رؤية طبيب.', zh: '我需要去看医生。', ja: '医者に診てもらう必要があります。', ko: '저는 의사를 만나야 해요.' },
    q4: { hi: 'वह जल्दी ठीक हो जाएगा।', ta: 'அவன் சீக்கிரம் குணமடைவான்.', te: 'అతను త్వరగా కోలుకుంటాడు.', ml: 'അവൻ വേഗം സുഖം പ്രാപിക്കും.', mr: 'तो लवकर बरा होईल.', bn: 'সে তাড়াতাড়ি সেরে উঠবে।', gu: 'તે જલદી સાજો થઈ જશે.', pa: 'ਉਹ ਜਲਦੀ ਠੀਕ ਹੋ ਜਾਵੇਗਾ।', or: 'ସେ ଶୀଘ୍ର ସୁସ୍ଥ ହୋଇଯିବ।', ur: 'وہ جلد ٹھیک ہو جائے گا۔', es: 'Él se recuperará pronto.', fr: 'Il va bientôt guérir.', de: 'Er wird bald wieder gesund.', pt: 'Ele vai se recuperar logo.', ru: 'Он скоро поправится.', ar: 'سيتعافى قريبًا.', zh: '他很快就会康复。', ja: '彼はすぐに回復します。', ko: '그는 곧 회복할 거예요.' }
};

// The questions and tasks in Kannada (content/asks/kn.js), for a Kannada speaker learning English.
const ENGLISH = 'ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ';
const asks = {
    questions: {
        'grammar-intermediate-3': { q3: 'ಯಾವುದು ಸರಿ?' },
        'reading-intermediate-3': {
            q1: 'ಕಳೆದ ವರ್ಷ ರಮ್ಯಾಗೆ ಏಕೆ ಆಯಾಸವಾಗುತ್ತಿತ್ತು?',
            q2: 'ಅವಳಿಗೆ ಯಾರು ಸಲಹೆ ನೀಡಿದರು?',
            q3: 'ಅವಳು ಪ್ರತಿದಿನ ಎಷ್ಟು ಹೊತ್ತು ನಡೆಯಬೇಕು?',
            q4: 'ಮೊದಮೊದಲು ರಮ್ಯಾಗೆ ಯಾವುದು ಕಷ್ಟವಾಗಿತ್ತು?',
            q5: 'ಎರಡು ವಾರಗಳ ನಂತರ ಏನು ಬದಲಾಯಿತು?'
        },
        'speaking-intermediate-3': {
            q1: 'ನಿಖಿಲ್‌ನ ಸಮಸ್ಯೆ ಏನು?',
            q2: 'ಅವನು ಯಾವಾಗಿನಿಂದ ಅನಾರೋಗ್ಯದಲ್ಲಿದ್ದಾನೆ?',
            q3: 'ಅವನು ಔಷಧಿಯನ್ನು ಎಷ್ಟು ಬಾರಿ ತೆಗೆದುಕೊಳ್ಳಬೇಕು?',
            q4: 'ಕಾಲೇಜಿನ ಬಗ್ಗೆ ವೈದ್ಯರು ಅವನಿಗೆ ಏನು ಹೇಳುತ್ತಾರೆ?'
        }
    },
    writing: {
        'reading-intermediate-3': {
            w3: `"healthy" ಪದವನ್ನು ಬಳಸಿ ${ENGLISH} ಒಂದು ವಾಕ್ಯ ಬರೆಯಿರಿ.`,
            w4: `ಯಾವಾಗಲೂ ಆಯಾಸಗೊಂಡಿರುವ ಸ್ನೇಹಿತರಿಗೆ ಸಲಹೆ ನೀಡುತ್ತಾ ${ENGLISH} 5 ಅಥವಾ 6 ವಾಕ್ಯಗಳನ್ನು ಬರೆಯಿರಿ. ಕನಿಷ್ಠ ಎರಡು ಬಾರಿ "should" ಬಳಸಿ.`
        }
    },
    speaking: {
        'speaking-intermediate-3': {
            prompt: `ನೀವು ಒಂದು ಕ್ಲಿನಿಕ್‌ನಲ್ಲಿದ್ದೀರಿ. ${ENGLISH} 5 ಅಥವಾ 6 ವಾಕ್ಯಗಳಲ್ಲಿ ನಿಮಗೆ ಹೇಗೆ ಅನಿಸುತ್ತಿದೆ ಮತ್ತು ಯಾವಾಗಿನಿಂದ ಎಂದು ವೈದ್ಯರಿಗೆ ಹೇಳಿ, ನಿಮ್ಮ ಔಷಧಿಯ ಬಗ್ಗೆ ಒಂದು ಪ್ರಶ್ನೆ ಕೇಳಿ.`,
            checklist: ['ವೈದ್ಯರನ್ನು ವಿನಯದಿಂದ ವಂದಿಸಿದೆ', 'ಸಮಸ್ಯೆ ಏನು ಎಂದು ಹೇಳಿದೆ', 'ಯಾವಾಗಿನಿಂದ ಎಂದು ಹೇಳಿದೆ (since / for)', '"should" ಬಳಸಿ ಒಂದು ಪ್ರಶ್ನೆ ಕೇಳಿದೆ', 'ಪೂರ್ಣ ವಾಕ್ಯಗಳಲ್ಲಿ ಮಾತನಾಡಿದೆ', 'ವೈದ್ಯರಿಗೆ ಧನ್ಯವಾದ ಹೇಳಿದೆ']
        }
    }
};

module.exports = {
    lessons,
    names: { 'vocab-intermediate-3': ['Staying healthy', 'At the doctor'] },
    tipsFrom: { 'translation-intermediate-3': 'translation-intermediate-kn-en' },
    words: { 'vocab-intermediate-3': words },
    sentences: { 'translation-intermediate-3': sentences },
    asks
};
