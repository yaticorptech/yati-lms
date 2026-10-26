/**
 * Beginner, topic 3 — Travel and weather (asked 2026-10-24: "make more units
 * in each section for each language"). Two units (parts.js): Getting around,
 * and Weather. The words and sentences in every language are below the
 * lessons; written here, not by any translation service — a native speaker
 * should check them.
 */
const { w, mcq, fill, fix, order, dialogue, item, tipsOf } = require('./make');

const lessons = [
    {
        seedKey: 'vocab-beginner-3', module: 'vocabulary', level: 'beginner', order: 3,
        title: 'Travel and weather',
        summary: 'Words for getting around, and for talking about the weather.',
        learn: {
            intro: 'Learn each word with its Kannada meaning. Read the example sentence aloud to remember how the word is used.',
            points: ['Say the word, then its meaning, then the sentence.', 'Use the weather words to say what today is like.']
        },
        words: [
            w('bus', 'ಬಸ್', 'noun', 'I go to college by bus.', ['coach']),
            w('train', 'ರೈಲು', 'noun', 'The train to Bengaluru leaves at nine.'),
            w('ticket', 'ಟಿಕೆಟ್, ಚೀಟಿ', 'noun', 'Please show your ticket to the conductor.', ['pass']),
            w('road', 'ರಸ್ತೆ', 'noun', 'Look both ways before you cross the road.', ['street']),
            w('rain', 'ಮಳೆ', 'noun', 'The farmers are happy because of the rain.', ['shower']),
            w('sun', 'ಸೂರ್ಯ', 'noun', 'The sun is very bright today.'),
            w('hot', 'ಬಿಸಿ, ಸೆಕೆ', 'adjective', 'It is very hot in April.', ['warm'], ['cold']),
            w('cold', 'ತಂಪು, ಚಳಿ', 'adjective', 'The water in the river is cold.', ['cool', 'chilly'], ['hot'])
        ]
    },
    {
        seedKey: 'grammar-beginner-3', module: 'grammar', level: 'beginner', order: 3,
        title: 'Questions: what, where, when, how',
        summary: 'Asking for information with question words.',
        learn: {
            intro: 'Question words ask for information. They come at the start of the question.',
            points: [
                '"What" asks about a thing: What is your name?',
                '"Where" asks about a place: Where is the bus stand?',
                '"When" asks about a time: When does the train leave?',
                '"How" asks about the way something is, or is done: How are you? How much is the ticket?',
                'With is and are, the verb comes before the subject: Where is the bus? With other verbs, add do or does: Where do you live?'
            ],
            examples: ['What is this?', 'Where are you going?', 'When does the bus come?', 'How much is the ticket?']
        },
        practice: [
            fill('p1', '___ is your name? (What / Where)', 'What', '"What" asks about a thing, like a name.'),
            fill('p2', '___ is the bus stand? (Where / When)', 'Where', '"Where" asks about a place.'),
            mcq('p3', '___ does the train leave?', ['When', 'What', 'Who'], 'When', '"When" asks about a time.'),
            mcq('p4', '___ are you? — I am fine, thank you.', ['How', 'What', 'Where'], 'How', '"How are you?" asks how someone is.'),
            fix('p5', 'Where you live?', 'Where do you live?', 'With a verb like "live", add "do" after the question word.'),
            order('p6', ['the', 'Where', 'is', 'station'], 'Where is the station?', 'Question word (Where) + is + the place.')
        ],
        quiz: [
            fill('q1', '___ is the time now? (What / Where)', 'What', '"What time" asks for the time.'),
            fill('q2', '___ does the shop open? (When / Who)', 'When', '"When" asks about a time.'),
            mcq('q3', '___ is my ticket? — It is on the table.', ['Where', 'When', 'How'], 'Where', 'The answer is a place, so the question uses "Where".'),
            mcq('q4', 'Which is correct?', ['Where do you live?', 'Where you live?', 'Where does you live?'], 'Where do you live?', 'With "you", add "do": Where do you live?'),
            mcq('q5', 'How ___ is the ticket? — Fifty rupees.', ['much', 'many', 'long'], 'much', '"How much" asks about a price or an amount.'),
            fix('q6', 'When the bus comes?', 'When does the bus come?', 'Add "does" for he, she or it, and use the plain verb: come, not comes.'),
            mcq('q7', '___ are you going? — To the market.', ['Where', 'What', 'When'], 'Where', 'The answer is a place, so the question uses "Where".'),
            order('q8', ['you', 'How', 'are', 'today'], 'How are you today?', 'Question word (How) + are + you + today.')
        ]
    },
    {
        seedKey: 'reading-beginner-3', module: 'reading', level: 'beginner', order: 3,
        title: 'A Rainy Day in Mysuru',
        summary: 'A short story about a train trip and a surprise shower.',
        learn: {
            intro: 'Read the story. Look for the travel words and the weather words.',
            passage: {
                title: 'A Rainy Day in Mysuru',
                text: 'Last Sunday, Arjun and his sister Divya went to Mysuru by train. They bought two tickets at Bengaluru station. The train left at eight o\'clock in the morning. It was hot and sunny when they started. On the way, they saw green fields and small villages. When they reached Mysuru, it started to rain. Arjun did not have an umbrella, so they waited at the station for half an hour. Then the sun came out again, and they took an auto to the palace. Divya said, "Next time, let\'s bring an umbrella!"'
            }
        },
        quiz: [
            mcq('q1', 'How did Arjun and Divya go to Mysuru?', ['By train', 'By bus', 'By car', 'On foot'], 'By train', '"…went to Mysuru by train."'),
            mcq('q2', 'What time did the train leave?', ['At eight o\'clock', 'At six o\'clock', 'At ten o\'clock', 'At noon'], 'At eight o\'clock', '"The train left at eight o\'clock in the morning."'),
            mcq('q3', 'What was the weather like when they started?', ['Hot and sunny', 'Cold and rainy', 'Windy', 'Foggy'], 'Hot and sunny', '"It was hot and sunny when they started."'),
            mcq('q4', 'Why did they wait at the station?', ['It was raining and they had no umbrella', 'The train was late', 'They lost their tickets', 'The palace was closed'], 'It was raining and they had no umbrella', '"Arjun did not have an umbrella, so they waited at the station."'),
            mcq('q5', 'How did they go to the palace?', ['By auto', 'By train', 'By bus', 'They walked'], 'By auto', '"…they took an auto to the palace."')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['by', 'We', 'train', 'went'], answer: 'We went by train.', model: 'We went by train.' },
            { id: 'w2', type: 'jumbled', prompt: 'Put the words in order.', words: ['started', 'It', 'rain', 'to'], answer: 'It started to rain.', model: 'It started to rain.' },
            { id: 'w3', type: 'sentence', prompt: 'Make one sentence with the word "rain".', mustInclude: ['rain'], minWords: 4, model: 'I like to walk in the rain.' },
            { id: 'w4', type: 'paragraph', prompt: 'Write 4 or 5 sentences about a trip you took.', minWords: 30, model: 'Last year, I went to Hampi with my family. We travelled by bus. The journey took six hours. It was very hot, so we drank a lot of water. I liked the old temples and the big rocks.', checklist: ['I said where I went', 'I said how I travelled', 'I used past tense verbs like went and saw', 'Each sentence ends with a full stop'] }
        ]
    },
    {
        seedKey: 'speaking-beginner-3', module: 'speaking', level: 'beginner', order: 3,
        title: 'At the bus stand',
        summary: 'Asking which bus to take, when it leaves and how much it costs.',
        learn: {
            intro: 'Listen to how Priya asks the conductor about a bus.',
            dialogue: dialogue('speaking-beginner-3', 'At the bus stand: Priya asks a conductor about a bus.', [{ name: 'Priya', voice: 'f' }, { name: 'Conductor', voice: 'm' }], [
                ['Priya', 'Excuse me. Which bus goes to the city market?'],
                ['Conductor', 'Bus number 45 goes to the market.'],
                ['Priya', 'When does it leave?'],
                ['Conductor', 'It leaves in ten minutes, from platform two.'],
                ['Priya', 'How much is the ticket?'],
                ['Conductor', 'Fifteen rupees. Do you have change?'],
                ['Priya', 'Yes, here are fifteen rupees.'],
                ['Conductor', 'Thank you. Here is your ticket.'],
                ['Priya', 'Thank you very much!']
            ]),
            phrases: ['Excuse me.', 'Which bus goes to the market?', 'How much is the ticket?']
        },
        quiz: [
            mcq('q1', 'Where does Priya want to go?', ['To the city market', 'To the railway station', 'To college', 'To the hospital'], 'To the city market', 'Priya asks: "Which bus goes to the city market?"'),
            mcq('q2', 'Which bus goes there?', ['Number 45', 'Number 15', 'Number 2', 'Number 10'], 'Number 45', 'The conductor says: "Bus number 45 goes to the market."'),
            mcq('q3', 'When does the bus leave?', ['In ten minutes', 'In one hour', 'Right now', 'Tomorrow'], 'In ten minutes', '"It leaves in ten minutes, from platform two."'),
            mcq('q4', 'How much is the ticket?', ['Fifteen rupees', 'Fifty rupees', 'Ten rupees', 'Forty-five rupees'], 'Fifteen rupees', 'The conductor says: "Fifteen rupees."')
        ],
        speaking: {
            prompt: 'Ask about a bus in 4 or 5 sentences: say "Excuse me", ask which bus goes to a place, when it leaves and how much the ticket is, and say thank you.',
            sample: 'Excuse me. Which bus goes to the railway station? When does it leave? How much is the ticket? Thank you very much.',
            checklist: ['I said "Excuse me" politely', 'I asked which bus goes to a place', 'I asked when it leaves', 'I asked the price of the ticket', 'I said thank you', 'I spoke slowly and clearly']
        }
    },
    {
        seedKey: 'translation-beginner-3', module: 'translation', level: 'beginner', order: 3, direction: 'kn-en',
        title: 'Travel and weather: Kannada → English',
        summary: 'Getting around, and talking about the weather.',
        learn: { intro: 'Translate each Kannada word or sentence into English.', points: tipsOf('translation-beginner-kn-en') },
        items: [
            item('i1', 'word', 'vocabulary', 'ರೈಲು', 'train', 'A train runs on a railway. English often says "the train": I go by train.', ['a train', 'the train']),
            item('i2', 'word', 'vocabulary', 'ಟಿಕೆಟ್', 'ticket', 'English uses the same word: ticket.', ['a ticket', 'the ticket']),
            item('i3', 'sentence', 'daily conversation', 'ಬಸ್ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?', 'Where is the bus stand?', '"Where" asks about a place. English puts "is" before "the bus stand".', ['Where is the bus stop?', 'Where is the bus station?']),
            item('i4', 'word', 'vocabulary', 'ಮಳೆ', 'rain', '"Rain" is a noun (the rain) and a verb (it rains).', ['the rain']),
            item('i5', 'sentence', 'vocabulary', 'ಇಂದು ತುಂಬಾ ಬಿಸಿಲು ಇದೆ.', 'It is very sunny today.', 'English starts weather sentences with "It is": It is sunny. It is hot.', ['It\'s very sunny today.', 'Today is very sunny.', 'Today it is very sunny.', 'It is very hot today.', 'It\'s very hot today.']),
            item('i6', 'sentence', 'grammar', 'ಹೊರಗೆ ಮಳೆ ಬರುತ್ತಿದೆ.', 'It is raining outside.', 'For something happening now, use is + -ing: It is raining.', ['It\'s raining outside.', 'Outside it is raining.', 'It is raining out.'])
        ],
        quiz: [
            item('q1', 'sentence', 'daily conversation', 'ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ.', 'One ticket, please.', 'Add "please" to ask politely.', ['Please give me one ticket.', 'Give me one ticket, please.', 'Give me one ticket.', 'Please give one ticket.', 'Give one ticket.', 'Please give me a ticket.', 'Give me a ticket, please.']),
            item('q2', 'sentence', 'grammar', 'ಈ ಬಸ್ ಮೈಸೂರಿಗೆ ಹೋಗುತ್ತದೆಯೇ?', 'Does this bus go to Mysuru?', 'A yes-or-no question with "go" starts with "Does" for one bus.', ['Does this bus go to Mysore?', 'Is this bus going to Mysuru?', 'Is this bus going to Mysore?', 'Will this bus go to Mysuru?', 'Will this bus go to Mysore?']),
            item('q3', 'sentence', 'vocabulary', 'ಇಂದು ಚಳಿ ಇದೆ.', 'It is cold today.', 'Weather sentences start with "It is".', ['It\'s cold today.', 'Today is cold.', 'Today it is cold.']),
            item('q4', 'sentence', 'daily conversation', 'ಕೊಡೆ ತೆಗೆದುಕೊಂಡು ಹೋಗು.', 'Take an umbrella.', '"Umbrella" begins with a vowel sound, so it takes "an".', ['Take the umbrella.', 'Take your umbrella.', 'Take an umbrella with you.', 'Take the umbrella with you.', 'Carry an umbrella.'])
        ]
    }
];

// Each word's meaning in every language (English: a definition, for English speakers).
const words = {
    bus: { hi: 'बस', ta: 'பேருந்து', te: 'బస్సు', ml: 'ബസ്', mr: 'बस', bn: 'বাস', gu: 'બસ', pa: 'ਬੱਸ', or: 'ବସ୍', ur: 'بس', es: 'autobús', fr: 'bus', de: 'Bus', pt: 'ônibus', ru: 'автобус', ar: 'حافلة', zh: '公共汽车', ja: 'バス', ko: '버스', en: 'a large road vehicle that carries many passengers' },
    train: { hi: 'रेलगाड़ी, ट्रेन', ta: 'ரயில்', te: 'రైలు', ml: 'തീവണ്ടി', mr: 'रेल्वेगाडी', bn: 'ট্রেন, রেলগাড়ি', gu: 'ટ્રેન, રેલગાડી', pa: 'ਰੇਲਗੱਡੀ', or: 'ରେଳଗାଡ଼ି', ur: 'ریل گاڑی', es: 'tren', fr: 'train', de: 'Zug', pt: 'trem', ru: 'поезд', ar: 'قطار', zh: '火车', ja: '電車', ko: '기차', en: 'a line of carriages that runs on a railway' },
    ticket: { hi: 'टिकट', ta: 'பயணச்சீட்டு', te: 'టికెట్', ml: 'ടിക്കറ്റ്', mr: 'तिकीट', bn: 'টিকিট', gu: 'ટિકિટ', pa: 'ਟਿਕਟ', or: 'ଟିକେଟ୍', ur: 'ٹکٹ', es: 'billete', fr: 'billet', de: 'Fahrkarte', pt: 'passagem', ru: 'билет', ar: 'تذكرة', zh: '票', ja: '切符', ko: '표', en: 'a small paper or card that lets you travel or go in' },
    road: { hi: 'सड़क', ta: 'சாலை', te: 'రోడ్డు', ml: 'റോഡ്', mr: 'रस्ता', bn: 'রাস্তা', gu: 'રસ્તો', pa: 'ਸੜਕ', or: 'ରାସ୍ତା', ur: 'سڑک', es: 'carretera', fr: 'route', de: 'Straße', pt: 'estrada', ru: 'дорога', ar: 'طريق', zh: '路', ja: '道', ko: '도로', en: 'a hard way for cars, buses and people to travel on' },
    rain: { hi: 'बारिश', ta: 'மழை', te: 'వర్షం', ml: 'മഴ', mr: 'पाऊस', bn: 'বৃষ্টি', gu: 'વરસાદ', pa: 'ਮੀਂਹ', or: 'ବର୍ଷା', ur: 'بارش', es: 'lluvia', fr: 'pluie', de: 'Regen', pt: 'chuva', ru: 'дождь', ar: 'مطر', zh: '雨', ja: '雨', ko: '비', en: 'water that falls from the clouds in drops' },
    sun: { hi: 'सूरज', ta: 'சூரியன்', te: 'సూర్యుడు', ml: 'സൂര്യൻ', mr: 'सूर्य', bn: 'সূর্য', gu: 'સૂર્ય', pa: 'ਸੂਰਜ', or: 'ସୂର୍ଯ୍ୟ', ur: 'سورج', es: 'sol', fr: 'soleil', de: 'Sonne', pt: 'sol', ru: 'солнце', ar: 'شمس', zh: '太阳', ja: '太陽', ko: '해', en: 'the bright star in the sky that gives us light and heat' },
    hot: { hi: 'गरम', ta: 'சூடான', te: 'వేడి', ml: 'ചൂടുള്ള', mr: 'गरम', bn: 'গরম', gu: 'ગરમ', pa: 'ਗਰਮ', or: 'ଗରମ', ur: 'گرم', es: 'caluroso', fr: 'chaud', de: 'heiß', pt: 'quente', ru: 'жаркий', ar: 'حار', zh: '热', ja: '暑い', ko: '더운', en: 'having a high temperature; very warm' },
    cold: { hi: 'ठंडा', ta: 'குளிர்ந்த', te: 'చల్లని', ml: 'തണുത്ത', mr: 'थंड', bn: 'ঠান্ডা', gu: 'ઠંડું', pa: 'ਠੰਢਾ', or: 'ଥଣ୍ଡା', ur: 'ٹھنڈا', es: 'frío', fr: 'froid', de: 'kalt', pt: 'frio', ru: 'холодный', ar: 'بارد', zh: '冷', ja: '寒い', ko: '추운', en: 'having a low temperature; not warm' }
};

// Each Kannada word or sentence of the translation lesson in every language (the English is the lesson's own).
const sentences = {
    i1: { hi: 'रेलगाड़ी', ta: 'ரயில்', te: 'రైలు', ml: 'തീവണ്ടി', mr: 'रेल्वेगाडी', bn: 'ট্রেন', gu: 'ટ્રેન', pa: 'ਰੇਲਗੱਡੀ', or: 'ରେଳଗାଡ଼ି', ur: 'ریل گاڑی', es: 'tren', fr: 'train', de: 'Zug', pt: 'trem', ru: 'поезд', ar: 'قطار', zh: '火车', ja: '電車', ko: '기차' },
    i2: { hi: 'टिकट', ta: 'பயணச்சீட்டு', te: 'టికెట్', ml: 'ടിക്കറ്റ്', mr: 'तिकीट', bn: 'টিকিট', gu: 'ટિકિટ', pa: 'ਟਿਕਟ', or: 'ଟିକେଟ୍', ur: 'ٹکٹ', es: 'billete', fr: 'billet', de: 'Fahrkarte', pt: 'passagem', ru: 'билет', ar: 'تذكرة', zh: '票', ja: '切符', ko: '표' },
    i3: { hi: 'बस स्टैंड कहाँ है?', ta: 'பேருந்து நிலையம் எங்கே இருக்கிறது?', te: 'బస్ స్టాండ్ ఎక్కడ ఉంది?', ml: 'ബസ് സ്റ്റാൻഡ് എവിടെയാണ്?', mr: 'बस स्थानक कुठे आहे?', bn: 'বাস স্ট্যান্ড কোথায়?', gu: 'બસ સ્ટેન્ડ ક્યાં છે?', pa: 'ਬੱਸ ਅੱਡਾ ਕਿੱਥੇ ਹੈ?', or: 'ବସ୍ ଷ୍ଟାଣ୍ଡ କେଉଁଠି ଅଛି?', ur: 'بس اسٹینڈ کہاں ہے؟', es: '¿Dónde está la estación de autobuses?', fr: 'Où est la gare routière ?', de: 'Wo ist der Busbahnhof?', pt: 'Onde fica a rodoviária?', ru: 'Где автовокзал?', ar: 'أين محطة الحافلات؟', zh: '公共汽车站在哪里？', ja: 'バス乗り場はどこですか？', ko: '버스 정류장이 어디에 있어요?' },
    i4: { hi: 'बारिश', ta: 'மழை', te: 'వర్షం', ml: 'മഴ', mr: 'पाऊस', bn: 'বৃষ্টি', gu: 'વરસાદ', pa: 'ਮੀਂਹ', or: 'ବର୍ଷା', ur: 'بارش', es: 'lluvia', fr: 'pluie', de: 'Regen', pt: 'chuva', ru: 'дождь', ar: 'مطر', zh: '雨', ja: '雨', ko: '비' },
    i5: { hi: 'आज बहुत धूप है।', ta: 'இன்று நல்ல வெயில் அடிக்கிறது.', te: 'ఈ రోజు బాగా ఎండగా ఉంది.', ml: 'ഇന്ന് നല്ല വെയിലുണ്ട്.', mr: 'आज खूप ऊन आहे.', bn: 'আজ খুব রোদ।', gu: 'આજે બહુ તડકો છે.', pa: 'ਅੱਜ ਬਹੁਤ ਧੁੱਪ ਹੈ।', or: 'ଆଜି ବହୁତ ଖରା ହେଉଛି।', ur: 'آج بہت دھوپ ہے۔', es: 'Hoy hace mucho sol.', fr: 'Il y a beaucoup de soleil aujourd’hui.', de: 'Heute ist es sehr sonnig.', pt: 'Hoje está muito ensolarado.', ru: 'Сегодня очень солнечно.', ar: 'الجو مشمس جدًا اليوم.', zh: '今天阳光很强。', ja: '今日はとても晴れています。', ko: '오늘은 햇볕이 아주 강해요.' },
    i6: { hi: 'बाहर बारिश हो रही है।', ta: 'வெளியே மழை பெய்கிறது.', te: 'బయట వర్షం పడుతోంది.', ml: 'പുറത്ത് മഴ പെയ്യുന്നു.', mr: 'बाहेर पाऊस पडत आहे.', bn: 'বাইরে বৃষ্টি হচ্ছে।', gu: 'બહાર વરસાદ પડી રહ્યો છે.', pa: 'ਬਾਹਰ ਮੀਂਹ ਪੈ ਰਿਹਾ ਹੈ।', or: 'ବାହାରେ ବର୍ଷା ହେଉଛି।', ur: 'باہر بارش ہو رہی ہے۔', es: 'Está lloviendo afuera.', fr: 'Il pleut dehors.', de: 'Draußen regnet es.', pt: 'Está chovendo lá fora.', ru: 'На улице идёт дождь.', ar: 'إنها تمطر في الخارج.', zh: '外面在下雨。', ja: '外は雨が降っています。', ko: '밖에 비가 오고 있어요.' },
    q1: { hi: 'एक टिकट दीजिए।', ta: 'ஒரு டிக்கெட் கொடுங்கள்.', te: 'ఒక టికెట్ ఇవ్వండి.', ml: 'ഒരു ടിക്കറ്റ് തരൂ.', mr: 'एक तिकीट द्या.', bn: 'একটা টিকিট দিন।', gu: 'એક ટિકિટ આપો.', pa: 'ਇੱਕ ਟਿਕਟ ਦਿਓ।', or: 'ଗୋଟିଏ ଟିକେଟ୍ ଦିଅନ୍ତୁ।', ur: 'ایک ٹکٹ دیجیے۔', es: 'Un billete, por favor.', fr: 'Un billet, s’il vous plaît.', de: 'Eine Fahrkarte, bitte.', pt: 'Uma passagem, por favor.', ru: 'Один билет, пожалуйста.', ar: 'تذكرة واحدة من فضلك.', zh: '请给我一张票。', ja: '切符を一枚ください。', ko: '표 한 장 주세요.' },
    q2: { hi: 'क्या यह बस मैसूरु जाती है?', ta: 'இந்தப் பேருந்து மைசூருக்குப் போகுமா?', te: 'ఈ బస్సు మైసూరుకు వెళ్తుందా?', ml: 'ഈ ബസ് മൈസൂരിലേക്ക് പോകുമോ?', mr: 'ही बस म्हैसूरला जाते का?', bn: 'এই বাসটা কি মাইসুরু যায়?', gu: 'શું આ બસ મૈસૂર જાય છે?', pa: 'ਕੀ ਇਹ ਬੱਸ ਮੈਸੂਰ ਜਾਂਦੀ ਹੈ?', or: 'ଏହି ବସ୍ କ’ଣ ମହୀଶୂର ଯାଏ?', ur: 'کیا یہ بس میسور جاتی ہے؟', es: '¿Este autobús va a Mysuru?', fr: 'Est-ce que ce bus va à Mysuru ?', de: 'Fährt dieser Bus nach Mysuru?', pt: 'Este ônibus vai para Mysuru?', ru: 'Этот автобус идёт в Майсуру?', ar: 'هل تذهب هذه الحافلة إلى ميسورو؟', zh: '这辆公共汽车去迈索尔吗？', ja: 'このバスはマイスールに行きますか？', ko: '이 버스는 마이소르에 가나요?' },
    q3: { hi: 'आज ठंड है।', ta: 'இன்று குளிராக இருக்கிறது.', te: 'ఈ రోజు చలిగా ఉంది.', ml: 'ഇന്ന് തണുപ്പാണ്.', mr: 'आज थंडी आहे.', bn: 'আজ ঠান্ডা।', gu: 'આજે ઠંડી છે.', pa: 'ਅੱਜ ਠੰਢ ਹੈ।', or: 'ଆଜି ଥଣ୍ଡା ଅଛି।', ur: 'آج ٹھنڈ ہے۔', es: 'Hoy hace frío.', fr: 'Il fait froid aujourd’hui.', de: 'Heute ist es kalt.', pt: 'Hoje está frio.', ru: 'Сегодня холодно.', ar: 'الجو بارد اليوم.', zh: '今天很冷。', ja: '今日は寒いです。', ko: '오늘은 추워요.' },
    q4: { hi: 'छाता ले जाओ।', ta: 'குடையை எடுத்துக்கொண்டு போ.', te: 'గొడుగు తీసుకుని వెళ్ళు.', ml: 'കുട എടുത്തുകൊണ്ട് പോകൂ.', mr: 'छत्री घेऊन जा.', bn: 'ছাতা নিয়ে যাও।', gu: 'છત્રી લઈ જા.', pa: 'ਛਤਰੀ ਲੈ ਜਾ।', or: 'ଛତା ନେଇ ଯାଅ।', ur: 'چھتری لے جاؤ۔', es: 'Lleva un paraguas.', fr: 'Prends un parapluie.', de: 'Nimm einen Regenschirm mit.', pt: 'Leve um guarda-chuva.', ru: 'Возьми зонт.', ar: 'خذ مظلة معك.', zh: '带上雨伞。', ja: '傘を持って行って。', ko: '우산을 가져가.' }
};

// The questions and tasks in Kannada (content/asks/kn.js), for a Kannada speaker learning English.
const ENGLISH = 'ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ';
const asks = {
    questions: {
        'grammar-beginner-3': { q4: 'ಯಾವುದು ಸರಿ?' },
        'reading-beginner-3': {
            q1: 'ಅರ್ಜುನ್ ಮತ್ತು ದಿವ್ಯಾ ಮೈಸೂರಿಗೆ ಹೇಗೆ ಹೋದರು?',
            q2: 'ರೈಲು ಎಷ್ಟು ಗಂಟೆಗೆ ಹೊರಟಿತು?',
            q3: 'ಅವರು ಹೊರಟಾಗ ಹವಾಮಾನ ಹೇಗಿತ್ತು?',
            q4: 'ಅವರು ನಿಲ್ದಾಣದಲ್ಲಿ ಏಕೆ ಕಾಯಬೇಕಾಯಿತು?',
            q5: 'ಅವರು ಅರಮನೆಗೆ ಹೇಗೆ ಹೋದರು?'
        },
        'speaking-beginner-3': {
            q1: 'ಪ್ರಿಯಾ ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು?',
            q2: 'ಅಲ್ಲಿಗೆ ಯಾವ ಬಸ್ ಹೋಗುತ್ತದೆ?',
            q3: 'ಬಸ್ ಯಾವಾಗ ಹೊರಡುತ್ತದೆ?',
            q4: 'ಟಿಕೆಟ್ ಬೆಲೆ ಎಷ್ಟು?'
        }
    },
    writing: {
        'reading-beginner-3': {
            w3: `"rain" ಪದವನ್ನು ಬಳಸಿ ${ENGLISH} ಒಂದು ವಾಕ್ಯ ಬರೆಯಿರಿ.`,
            w4: `ನೀವು ಹೋದ ಒಂದು ಪ್ರವಾಸದ ಬಗ್ಗೆ ${ENGLISH} 4 ಅಥವಾ 5 ವಾಕ್ಯಗಳನ್ನು ಬರೆಯಿರಿ.`
        }
    },
    speaking: {
        'speaking-beginner-3': {
            prompt: `${ENGLISH} 4 ಅಥವಾ 5 ವಾಕ್ಯಗಳಲ್ಲಿ ಒಂದು ಬಸ್ ಬಗ್ಗೆ ಕೇಳಿ: "Excuse me" ಎನ್ನಿ, ಒಂದು ಸ್ಥಳಕ್ಕೆ ಯಾವ ಬಸ್ ಹೋಗುತ್ತದೆ, ಅದು ಯಾವಾಗ ಹೊರಡುತ್ತದೆ ಮತ್ತು ಟಿಕೆಟ್ ಬೆಲೆ ಎಷ್ಟು ಎಂದು ಕೇಳಿ, ನಂತರ ಧನ್ಯವಾದ ಹೇಳಿ.`,
            checklist: ['ವಿನಯದಿಂದ "Excuse me" ಎಂದೆ', 'ಒಂದು ಸ್ಥಳಕ್ಕೆ ಯಾವ ಬಸ್ ಹೋಗುತ್ತದೆ ಎಂದು ಕೇಳಿದೆ', 'ಅದು ಯಾವಾಗ ಹೊರಡುತ್ತದೆ ಎಂದು ಕೇಳಿದೆ', 'ಟಿಕೆಟ್ ಬೆಲೆ ಕೇಳಿದೆ', 'ಧನ್ಯವಾದ ಹೇಳಿದೆ', 'ನಿಧಾನವಾಗಿ ಮತ್ತು ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿದೆ']
        }
    }
};

module.exports = {
    lessons,
    names: { 'vocab-beginner-3': ['Getting around', 'Weather'] },
    tipsFrom: { 'translation-beginner-3': 'translation-beginner-kn-en' },
    words: { 'vocab-beginner-3': words },
    sentences: { 'translation-beginner-3': sentences },
    asks
};
