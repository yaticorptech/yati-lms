/**
 * Taught before it is asked (2026-11-16, the user, of "Write a professional email to an HR manager…": "first you should
 * teach the user before asking this kind of question… then related questions you can ask so they can fill it").
 *
 * Before an email, a letter or a paragraph to write: how one is written — its parts in order, what goes in each with an
 * example line, the words to use, and a whole example on another subject (never the task's own answer). Then a few
 * questions on this task — its subject line, its greeting, the polite ask, its ending; a paragraph's first sentence,
 * its joining words, a reason, its last sentence — the right choice taken from the task's model answer where it has
 * one. Then the task itself. Explained in the student's language (Kannada, Hindi; English for the others); what is
 * written is English.
 */
const { shuffle, seeded } = require('./vocabQuiz');

const TYPES = ['email', 'letter', 'paragraph'];
/** In the student's language: { en, kn, hi } → the text in `lang`, else English. */
const pick = (texts, lang) => (texts && typeof texts === 'object' ? texts[lang] || texts.en : texts);

const SUBJECT = { en: 'Subject', kn: 'ವಿಷಯ ಸಾಲು (Subject)', hi: 'विषय पंक्ति (Subject)' };
const GREETING = { en: 'Greeting', kn: 'ಸಂಬೋಧನೆ (Greeting)', hi: 'संबोधन (Greeting)' };
const CLOSING = { en: 'Closing', kn: 'ಮುಕ್ತಾಯ (Closing)', hi: 'समापन (Closing)' };

/** Each kind's parts, in order: what each is called and what goes in it (the examples are each unit's own, below). */
const GUIDES = {
    email: {
        title: { en: 'How to write an email', kn: 'ಇಮೇಲ್ ಬರೆಯುವುದು ಹೇಗೆ', hi: 'ईमेल कैसे लिखें' },
        intro: { en: 'Before you write, learn its parts. A good email has these, in this order.', kn: 'ಬರೆಯುವ ಮೊದಲು ಅದರ ಭಾಗಗಳನ್ನು ತಿಳಿಯಿರಿ. ಒಳ್ಳೆಯ ಇಮೇಲ್‌ನಲ್ಲಿ ಈ ಭಾಗಗಳು ಇದೇ ಕ್ರಮದಲ್ಲಿ ಇರುತ್ತವೆ.', hi: 'लिखने से पहले इसके हिस्से जानिए। अच्छे ईमेल में ये हिस्से इसी क्रम में होते हैं।' },
        parts: [
            { name: SUBJECT, say: { en: 'A few words that tell what the email is about.', kn: 'ಇಮೇಲ್ ಯಾವುದರ ಬಗ್ಗೆ ಎಂದು ಕೆಲವೇ ಪದಗಳಲ್ಲಿ ಹೇಳಿ.', hi: 'कुछ ही शब्दों में बताइए कि ईमेल किस बारे में है।' } },
            { name: GREETING, say: { en: '"Dear", then the person\'s name or title, and a comma.', kn: '"Dear", ನಂತರ ವ್ಯಕ್ತಿಯ ಹೆಸರು ಅಥವಾ ಹುದ್ದೆ, ಕೊನೆಯಲ್ಲಿ ಅಲ್ಪವಿರಾಮ (,).', hi: '"Dear", फिर व्यक्ति का नाम या पद, और अंत में अल्पविराम (,)।' } },
            { name: { en: 'Why you are writing', kn: 'ಯಾಕೆ ಬರೆಯುತ್ತಿದ್ದೀರಿ', hi: 'आप क्यों लिख रहे हैं' }, say: { en: 'In the first lines, say why you are writing.', kn: 'ಮೊದಲ ಸಾಲುಗಳಲ್ಲೇ ಯಾಕೆ ಬರೆಯುತ್ತಿದ್ದೀರಿ ಎಂದು ತಿಳಿಸಿ.', hi: 'पहली पंक्तियों में ही बताइए कि आप क्यों लिख रहे हैं।' } },
            { name: { en: 'Details', kn: 'ವಿವರಗಳು', hi: 'विवरण' }, say: { en: 'Give the facts they need: what, when and why.', kn: 'ಅವರಿಗೆ ಬೇಕಾದ ಮಾಹಿತಿ ಕೊಡಿ: ಏನು, ಯಾವಾಗ, ಯಾಕೆ.', hi: 'उन्हें जो जानकारी चाहिए वह दीजिए: क्या, कब और क्यों।' } },
            { name: { en: 'Polite request', kn: 'ವಿನಯದ ಕೋರಿಕೆ', hi: 'विनम्र अनुरोध' }, say: { en: 'Ask for what you need, politely.', kn: 'ನಿಮಗೆ ಬೇಕಾದುದನ್ನು ವಿನಯದಿಂದ ಕೇಳಿ.', hi: 'जो चाहिए, विनम्रता से माँगिए।' } },
            { name: CLOSING, say: { en: 'Thank them, then a closing such as "Kind regards," and your name.', kn: 'ಧನ್ಯವಾದ ಹೇಳಿ, ನಂತರ "Kind regards," ತರಹದ ಮುಕ್ತಾಯ ಪದ ಮತ್ತು ನಿಮ್ಮ ಹೆಸರು.', hi: 'धन्यवाद कहिए, फिर "Kind regards," जैसा समापन और अपना नाम।' } }
        ]
    },
    letter: {
        title: { en: 'How to write a formal letter', kn: 'ಔಪಚಾರಿಕ ಪತ್ರ ಬರೆಯುವುದು ಹೇಗೆ', hi: 'औपचारिक पत्र कैसे लिखें' },
        intro: { en: 'Before you write, learn its parts. A formal letter has these, in this order.', kn: 'ಬರೆಯುವ ಮೊದಲು ಅದರ ಭಾಗಗಳನ್ನು ತಿಳಿಯಿರಿ. ಔಪಚಾರಿಕ ಪತ್ರದಲ್ಲಿ ಈ ಭಾಗಗಳು ಇದೇ ಕ್ರಮದಲ್ಲಿ ಇರುತ್ತವೆ.', hi: 'लिखने से पहले इसके हिस्से जानिए। औपचारिक पत्र में ये हिस्से इसी क्रम में होते हैं।' },
        parts: [
            { name: { en: 'To, and the address', kn: 'ಯಾರಿಗೆ ಮತ್ತು ವಿಳಾಸ', hi: 'किसे, और पता' }, say: { en: '"To", then who the letter is for, and where.', kn: '"To", ನಂತರ ಪತ್ರ ಯಾರಿಗೆ ಮತ್ತು ಅವರ ವಿಳಾಸ.', hi: '"To", फिर पत्र किसके लिए है और उनका पता।' } },
            { name: { en: 'Date', kn: 'ದಿನಾಂಕ', hi: 'तारीख' }, say: { en: 'The day you write it.', kn: 'ಪತ್ರ ಬರೆದ ದಿನಾಂಕ.', hi: 'जिस दिन पत्र लिखा, वह तारीख।' } },
            { name: SUBJECT, say: { en: 'A few words that tell what the letter is about.', kn: 'ಪತ್ರ ಯಾವುದರ ಬಗ್ಗೆ ಎಂದು ಕೆಲವೇ ಪದಗಳಲ್ಲಿ ಹೇಳಿ.', hi: 'कुछ ही शब्दों में बताइए कि पत्र किस बारे में है।' } },
            { name: GREETING, say: { en: '"Respected Sir," or "Respected Madam," for a formal letter.', kn: 'ಔಪಚಾರಿಕ ಪತ್ರಕ್ಕೆ "Respected Sir," ಅಥವಾ "Respected Madam,".', hi: 'औपचारिक पत्र में "Respected Sir," या "Respected Madam,"।' } },
            { name: { en: 'Body', kn: 'ಮುಖ್ಯ ಭಾಗ', hi: 'मुख्य भाग' }, say: { en: 'Why you are writing, the details, and what you request — politely.', kn: 'ಯಾಕೆ ಬರೆಯುತ್ತಿದ್ದೀರಿ, ವಿವರಗಳು ಮತ್ತು ನಿಮ್ಮ ಕೋರಿಕೆ — ವಿನಯದಿಂದ.', hi: 'आप क्यों लिख रहे हैं, विवरण, और आपका अनुरोध — विनम्रता से।' } },
            { name: CLOSING, say: { en: 'Thank them, then "Yours faithfully," and your name.', kn: 'ಧನ್ಯವಾದ ಹೇಳಿ, ನಂತರ "Yours faithfully," ಮತ್ತು ನಿಮ್ಮ ಹೆಸರು.', hi: 'धन्यवाद कहिए, फिर "Yours faithfully," और अपना नाम।' } }
        ]
    },
    paragraph: {
        title: { en: 'How to write a paragraph', kn: 'ಪ್ಯಾರಾಗ್ರಾಫ್ ಬರೆಯುವುದು ಹೇಗೆ', hi: 'अनुच्छेद (पैराग्राफ) कैसे लिखें' },
        intro: { en: 'A paragraph is a few sentences about one idea. Build it like this.', kn: 'ಪ್ಯಾರಾಗ್ರಾಫ್ ಎಂದರೆ ಒಂದೇ ವಿಷಯದ ಬಗ್ಗೆ ಕೆಲವು ವಾಕ್ಯಗಳು. ಇದನ್ನು ಹೀಗೆ ಕಟ್ಟಿ.', hi: 'अनुच्छेद एक ही बात पर कुछ वाक्य होता है। इसे ऐसे बनाइए।' },
        parts: [
            { name: { en: 'First sentence', kn: 'ಮೊದಲ ವಾಕ್ಯ', hi: 'पहला वाक्य' }, say: { en: 'Say what the whole paragraph is about.', kn: 'ಇಡೀ ಪ್ಯಾರಾಗ್ರಾಫ್ ಯಾವುದರ ಬಗ್ಗೆ ಎಂದು ಹೇಳಿ.', hi: 'बताइए कि पूरा अनुच्छेद किस बारे में है।' } },
            { name: { en: 'Middle sentences', kn: 'ನಡುವಿನ ವಾಕ್ಯಗಳು', hi: 'बीच के वाक्य' }, say: { en: 'Give reasons, steps or examples — one idea in each sentence.', kn: 'ಕಾರಣಗಳು, ಹಂತಗಳು ಅಥವಾ ಉದಾಹರಣೆಗಳು — ಪ್ರತಿ ವಾಕ್ಯದಲ್ಲಿ ಒಂದು ವಿಷಯ.', hi: 'कारण, कदम या उदाहरण दीजिए — हर वाक्य में एक बात।' } },
            { name: { en: 'Joining words', kn: 'ಜೋಡಿಸುವ ಪದಗಳು', hi: 'जोड़ने वाले शब्द' } },
            { name: { en: 'Last sentence', kn: 'ಕೊನೆಯ ವಾಕ್ಯ', hi: 'आख़िरी वाक्य' }, say: { en: 'End by summing up, or say how you feel.', kn: 'ಸಾರಾಂಶ ಹೇಳಿ, ಅಥವಾ ನಿಮಗೆ ಹೇಗನಿಸುತ್ತದೆ ಎಂದು ಹೇಳಿ ಮುಗಿಸಿ.', hi: 'सार बताकर या अपनी भावना बताकर ख़त्म कीजिए।' } }
        ]
    }
};
// A paragraph's middle, as its kind asks: what goes in it.
const MIDDLE = {
    steps: { en: 'Say what happens, in order — one thing in each sentence.', kn: 'ಏನು ನಡೆಯುತ್ತದೆ ಎಂದು ಕ್ರಮವಾಗಿ ಹೇಳಿ — ಪ್ರತಿ ವಾಕ್ಯದಲ್ಲಿ ಒಂದು ವಿಷಯ.', hi: 'क्रम से बताइए कि क्या होता है — हर वाक्य में एक बात।' },
    thanks: { en: 'Say what they did for you, and how it helped you.', kn: 'ಅವರು ನಿಮಗಾಗಿ ಏನು ಮಾಡಿದರು, ಅದರಿಂದ ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯವಾಯಿತು ಎಂದು ಹೇಳಿ.', hi: 'बताइए कि उन्होंने आपके लिए क्या किया और उससे आपको कैसे मदद मिली।' },
    ways: { en: 'Give the ways, one in each sentence, with an example.', kn: 'ಉಪಾಯಗಳನ್ನು ಹೇಳಿ — ಪ್ರತಿ ವಾಕ್ಯದಲ್ಲಿ ಒಂದು, ಜೊತೆಗೆ ಒಂದು ಉದಾಹರಣೆ.', hi: 'तरीक़े बताइए — हर वाक्य में एक, साथ में एक उदाहरण।' },
    habit: { en: 'Say why it matters and how you will do it — one idea in each sentence.', kn: 'ಅದು ಏಕೆ ಮುಖ್ಯ, ನೀವು ಅದನ್ನು ಹೇಗೆ ಮಾಡುವಿರಿ ಎಂದು ಹೇಳಿ — ಪ್ರತಿ ವಾಕ್ಯದಲ್ಲಿ ಒಂದು ವಿಷಯ.', hi: 'बताइए कि यह क्यों ज़रूरी है और आप इसे कैसे करेंगे — हर वाक्य में एक बात।' },
    compare: { en: 'Say how the two things are different — one point in each sentence.', kn: 'ಎರಡು ವಿಷಯಗಳು ಹೇಗೆ ಬೇರೆ ಎಂದು ಹೇಳಿ — ಪ್ರತಿ ವಾಕ್ಯದಲ್ಲಿ ಒಂದು ಅಂಶ.', hi: 'बताइए कि दोनों चीज़ें कैसे अलग हैं — हर वाक्य में एक बात।' },
    advice: { en: 'Give your advice and say why — one tip in each sentence.', kn: 'ನಿಮ್ಮ ಸಲಹೆ ಕೊಡಿ, ಏಕೆ ಎಂದೂ ಹೇಳಿ — ಪ್ರತಿ ವಾಕ್ಯದಲ್ಲಿ ಒಂದು ಸಲಹೆ.', hi: 'अपनी सलाह दीजिए और क्यों, यह भी बताइए — हर वाक्य में एक सलाह।' },
    details: { en: 'Give the details: where, when, what happened and how it felt.', kn: 'ವಿವರ ಕೊಡಿ: ಎಲ್ಲಿ, ಯಾವಾಗ, ಏನಾಯಿತು, ಹೇಗನಿಸಿತು.', hi: 'विवरण दीजिए: कहाँ, कब, क्या हुआ और कैसा लगा।' },
    reasons: { en: 'Give your reasons, with an example — one idea in each sentence.', kn: 'ನಿಮ್ಮ ಕಾರಣಗಳನ್ನು ಒಂದು ಉದಾಹರಣೆಯೊಂದಿಗೆ ಕೊಡಿ — ಪ್ರತಿ ವಾಕ್ಯದಲ್ಲಿ ಒಂದು ವಿಷಯ.', hi: 'अपने कारण एक उदाहरण के साथ दीजिए — हर वाक्य में एक बात।' }
};
const joinSay = (words) => ({ en: `Join your ideas with words like ${words}.`, kn: `${words} ತರಹದ ಪದಗಳಿಂದ ವಿಚಾರಗಳನ್ನು ಜೋಡಿಸಿ.`, hi: `${words} जैसे शब्दों से बातें जोड़िए।` });

/*
 * Each unit its own example (2026-11-19, the user, of "How to write a paragraph" — the grandmother in every unit: "don't
 * give the same thing again and again — make it change"): an example on a subject near the unit's task but never its
 * answer, chosen by the task (`for`); a task none is written for gets one by its wording. A paragraph's middle and joining
 * words as its kind asks (a routine's steps, a trip's details, an opinion's reasons…); the joining words asked after it.
 */
const VARIANTS = {
    paragraph: [
        { key: 'person', for: /admire|person/i, words: 'and, because, For example',
            lines: ['My grandmother is the person I admire most.', 'She gets up at five every morning and works in the garden.', 'She is kind because she helps everyone in our street.', 'I want to be as kind as she is.'],
            phrases: ['and', 'because', 'For example,', 'I admire…', 'I want to be…'],
            example: 'My grandmother is the person I admire most. She gets up at five every morning and works in the garden. She is kind because she helps everyone in our street. For example, she cooks for our neighbour when he is ill. I want to be as kind as she is.' },
        { key: 'evening', for: /routine/i, middle: 'steps', words: 'First, Then, After that',
            lines: ['My evenings follow a simple routine.', 'First, I come home from college at five and drink a cup of tea.', 'After that, I study for an hour.', 'My evenings are calm, and I enjoy them.'],
            phrases: ['Every evening,', 'First,', 'Then', 'After that,', 'At nine o\'clock,', 'I enjoy…'],
            example: 'My evenings follow a simple routine. First, I come home from college at five and drink a cup of tea. Then I help my mother in the kitchen. After that, I study for an hour. My evenings are calm, and I enjoy them.' },
        { key: 'thanks', for: /thank/i, middle: 'thanks', words: 'Also, because, and',
            lines: ['Dear Mr Prakash, thank you for fixing my bicycle last Sunday.', 'You worked on it for two hours in the hot sun.', 'I reached my exam on time because of your help.', 'I am really grateful to you.'],
            phrases: ['Thank you for…', 'It was very kind of you to…', 'Also,', 'because of your help', 'I am really grateful.'],
            example: 'Dear Mr Prakash, thank you for fixing my bicycle last Sunday. You worked on it for two hours in the hot sun. Also, you did not take any money for it. I reached my exam on time because of your help. I am really grateful to you.' },
        { key: 'power', for: /save water|\bsave\b/i, middle: 'ways', words: 'First, also, because, For example',
            lines: ['Our family can save electricity at home in a few easy ways.', 'First, we can switch off the lights and fans when we leave a room.', 'We can also use LED bulbs because they need much less power.', 'If every family does these things, our town will save a lot of power.'],
            phrases: ['We can…', 'We can also…', 'instead of', 'because', 'For example,', 'If every family…'],
            example: 'Our family can save electricity at home in a few easy ways. First, we can switch off the lights and fans when we leave a room. We can also use LED bulbs because they need much less power. For example, a 9-watt LED bulb gives as much light as an old 60-watt bulb. If every family does these things, our town will save a lot of power.' },
        { key: 'reading', for: /habit/i, middle: 'habit', words: 'because, First, Then',
            lines: ['One good habit I want to start is reading for twenty minutes every night.', 'First, I will keep a book next to my bed.', 'It matters to me because reading builds my English and calms my mind.', 'I hope this small habit will make me a better reader.'],
            phrases: ['One habit I want to start is…', 'It matters because…', 'First,', 'Then', 'I will…', 'I hope…'],
            example: 'One good habit I want to start is reading for twenty minutes every night. It matters to me because reading builds my English and calms my mind. First, I will keep a book next to my bed. Then I will switch off my phone at half past nine. I hope this small habit will make me a better reader.' },
        { key: 'father', for: /your day\b/i, middle: 'steps', words: 'Then, After that, because',
            lines: ['My father works hard every day.', 'He gets up at five and opens his shop at seven.', 'After that, he comes home for lunch because the shop is quiet then.', 'I am proud of my father.'],
            phrases: ['Every day,', 'at seven o\'clock', 'Then', 'After that,', 'In the evening,', 'because'],
            example: 'My father works hard every day. He gets up at five and opens his shop at seven. Then he serves customers until two in the afternoon. After that, he comes home for lunch because the shop is quiet then. I am proud of my father.' },
        { key: 'travel', for: /compare|weekend/i, middle: 'compare', words: 'but, because, So',
            lines: ['I go to college by bus or by bicycle.', 'The bus is faster, but it is often crowded.', 'The bicycle is cheaper because I do not need a ticket.', 'So on most days, the bicycle is the best choice for me.'],
            phrases: ['… is faster than …', '… is more fun than …', 'the best', 'but', 'because', 'So'],
            example: 'I go to college by bus or by bicycle. The bus is faster, but it is often crowded. The bicycle is cheaper because I do not need a ticket. I think cycling is more fun than sitting on a bus. So on most days, the bicycle is the best choice for me.' },
        { key: 'exams', for: /advice/i, middle: 'advice', words: 'also, because, For example',
            lines: ['I know you are worried about your exams.', 'You should make a simple timetable and study a little every day.', 'You should also sleep for eight hours, because a tired mind forgets things.', 'Try these steps, and you will feel calmer.'],
            phrases: ['You should…', 'You should also…', 'Try to…', 'because', 'For example,', 'If you…, you will…'],
            example: 'I know you are worried about your exams. You should make a simple timetable and study a little every day. You should also sleep for eight hours, because a tired mind forgets things. For example, I study for two hours and then take a short walk. Try these steps, and you will feel calmer.' },
        { key: 'farm', for: /trip|journey|visit/i, middle: 'details', words: 'and, so, because',
            lines: ['Last summer, I spent a week at my uncle\'s farm near Hassan.', 'We went there by train, and the journey took four hours.', 'I enjoyed the visit because the air was fresh and the people were kind.', 'It was the best week of my holidays.'],
            phrases: ['Last summer,', 'We went by…', 'The journey took…', 'so', 'because', 'I enjoyed…'],
            example: 'Last summer, I spent a week at my uncle\'s farm near Hassan. We went there by train, and the journey took four hours. It rained every evening, so we played games indoors. I enjoyed the visit because the air was fresh and the people were kind. It was the best week of my holidays.' },
        { key: 'cook', for: /money|\bwhy\b/i, middle: 'reasons', words: 'First, Second, For example, In short',
            lines: ['I believe every student should learn to cook simple meals.', 'First, cooking at home saves money, because hotel food is costly.', 'For example, a plate of rice and dal costs much less at home than outside.', 'In short, cooking is a skill for life.'],
            phrases: ['I believe…', 'First,', 'Second,', 'because', 'For example,', 'If…, they will…', 'In short,'],
            example: 'I believe every student should learn to cook simple meals. First, cooking at home saves money, because hotel food is costly. Second, home food is healthier and cleaner. For example, a plate of rice and dal costs much less at home than outside. If students learn this early, they will be ready to live on their own. In short, cooking is a skill for life.' }
    ],
    email: [
        { key: 'library', for: /follow|application|internship/i,
            lines: ['Subject: Request to renew a library book', 'Dear Librarian,', 'I am writing to ask if I can keep a book for one more week.', 'I borrowed it on 3 June, and I need it for my exam on 14 June.', 'Could you please renew it until 17 June?', 'Thank you for your help.\nKind regards,\nRavi Kumar'],
            phrases: ['I hope you are doing well.', 'I am writing to ask…', 'Could you please…?', 'I would be grateful if…', 'Thank you for your time.', 'Kind regards,'],
            example: 'Subject: Request to renew a library book\n\nDear Librarian,\n\nI hope you are doing well. I am writing to ask if I can keep the book "Basic Statistics" for one more week.\n\nI borrowed it on 3 June, and it is due back on Monday. I still need it for my exam on 14 June. Could you please renew it until 17 June?\n\nThank you for your help.\n\nKind regards,\nRavi Kumar' },
        { key: 'workshop', for: /thank|accept|job/i,
            lines: ['Subject: Thank you for the workshop on 12 June', 'Dear Dr Shetty,', 'I am writing to thank you for the workshop on public speaking at our college.', 'Your tips on speaking slowly and looking at the audience helped me in my seminar the next day.', 'Could you please share the slides with us?', 'Thank you once again.\nYours sincerely,\nPooja N.'],
            phrases: ['Thank you for…', 'I am writing to thank you for…', 'It was very useful.', 'Could you please…?', 'Thank you once again.', 'Yours sincerely,'],
            example: 'Subject: Thank you for the workshop on 12 June\n\nDear Dr Shetty,\n\nI am writing to thank you for the workshop on public speaking at our college. It was very useful for me and my classmates.\n\nYour tips on speaking slowly and looking at the audience helped me in my seminar the next day. Could you please share the slides with us?\n\nThank you once again.\n\nYours sincerely,\nPooja N.' },
        { key: 'certificate', for: /teacher|meeting/i,
            lines: ['Subject: Request for a bonafide certificate', 'Dear Sir,', 'I am writing to ask for a bonafide certificate.', 'I need it to apply for a bus pass by 20 June.', 'Could you please let me know when it will be ready?', 'Thank you for your help.\nKind regards,\nKarthik B.'],
            phrases: ['I am writing to ask for…', 'I need it to…', 'by (a date)', 'Could you please let me know…?', 'Thank you for your help.', 'Kind regards,'],
            example: 'Subject: Request for a bonafide certificate\n\nDear Sir,\n\nI am Karthik B., a second-year BCom student. I am writing to ask for a bonafide certificate.\n\nI need it to apply for a bus pass by 20 June. I can collect it from the office on any day after 2 p.m. Could you please let me know when it will be ready?\n\nThank you for your help.\n\nKind regards,\nKarthik B.\nII BCom' },
        { key: 'bus', for: /suggest|principal|change/i,
            lines: ['Subject: Request for an extra morning bus to Mandya', 'Dear Depot Manager,', 'I am writing on behalf of the students who travel from Srirangapatna to Mandya every morning.', 'The 8 a.m. bus is so crowded that some days we cannot get on at all.', 'I would be grateful if you could look into this.', 'Thank you for your time.\nYours sincerely,\nDeepa S.'],
            phrases: ['I am writing on behalf of…', 'so … that …', 'If one more … were added, …', 'I would be grateful if you could…', 'Thank you for your time.', 'Yours sincerely,'],
            example: 'Subject: Request for an extra morning bus to Mandya\n\nDear Depot Manager,\n\nI hope you are doing well. I am writing on behalf of the students who travel from Srirangapatna to Mandya every morning.\n\nThe 8 a.m. bus is so crowded that some days we cannot get on at all. If one more bus were added at 8.15 a.m., we would all reach college on time. I would be grateful if you could look into this.\n\nThank you for your time.\n\nYours sincerely,\nDeepa S.\nII BA' }
    ],
    letter: [
        { key: 'streetlight',
            lines: ['To\nThe Commissioner,\nCity Corporation, Mandya', '5 June 2026', 'Subject: Request to repair the street light', 'Respected Sir,', 'I kindly request you to repair it as soon as possible.', 'Yours faithfully,\nSuma R.'],
            phrases: ['I am writing to inform you that…', 'I kindly request you to…', 'Thank you for considering my request.', 'Yours faithfully,'],
            example: 'To\nThe Commissioner,\nCity Corporation, Mandya\n\n5 June 2026\n\nSubject: Request to repair the street light\n\nRespected Sir,\n\nI am writing to inform you that the street light near the bus stand on Ashoka Road has not worked for two weeks. The road is very dark at night, and it is not safe for students and older people.\n\nI kindly request you to repair it as soon as possible.\n\nThank you for considering my request.\n\nYours faithfully,\nSuma R.\nAshoka Road, Mandya' }
    ]
};
const LABELS = {
    phrases: { en: 'Useful words and phrases', kn: 'ಉಪಯುಕ್ತ ಪದಗಳು, ವಾಕ್ಯಗಳು', hi: 'काम के शब्द और वाक्य' },
    example: { en: 'An example', kn: 'ಒಂದು ಉದಾಹರಣೆ', hi: 'एक उदाहरण' },
    task: { en: 'Your writing task', kn: 'ನಿಮ್ಮ ಬರವಣಿಗೆ', hi: 'आपका लेखन कार्य' },
    next: { en: 'Next: a few questions on your task, then you write it.', kn: 'ಮುಂದೆ: ನಿಮ್ಮ ಬರವಣಿಗೆಯ ಬಗ್ಗೆ ಕೆಲವು ಪ್ರಶ್ನೆಗಳು, ನಂತರ ನೀವೇ ಬರೆಯುವಿರಿ.', hi: 'आगे: आपके काम पर कुछ सवाल, फिर आप ख़ुद लिखेंगे।' }
};

const hashOf = (s) => [...String(s || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
/** The example for this task: the one written for it, else one chosen by its wording (the first, with no task). */
const variantOf = (type, task) => {
    const list = VARIANTS[type];
    if (!list) return null;
    if (!task?.prompt) return list[0];
    return list.find((v) => v.for && v.for.test(task.prompt)) || list[hashOf(task.prompt) % list.length];
};

/** How to write this kind of task, in the student's language, with this task's own example (null for a sentence…). */
const guideOf = (type, lang, task) => {
    const g = GUIDES[type];
    if (!g) return null;
    const v = variantOf(type, task);
    const sayOf = (p, i) => (type === 'paragraph' && i === 1 && MIDDLE[v.middle]) || (type === 'paragraph' && i === 2 ? joinSay(v.words) : p.say);
    return {
        type, title: pick(g.title, lang), intro: pick(g.intro, lang),
        parts: g.parts.map((p, i) => ({ name: pick(p.name, lang), say: pick(sayOf(p, i), lang), example: v.lines[i] })),
        phrasesTitle: pick(LABELS.phrases, lang), phrases: v.phrases, exampleTitle: pick(LABELS.example, lang), example: v.example, next: pick(LABELS.next, lang)
    };
};

/* ── The questions on a task ──────────────────────────────────────────── */

// Each question short and plain, asked of the student ("How will you start…?"), with a line on how to choose (2026-11-16,
// the user, of "ಈ ಪ್ಯಾರಾಗ್ರಾಫ್‌ಗೆ ಯಾವುದು ಒಳ್ಳೆಯ ಮೊದಲ ವಾಕ್ಯ?": "I can't understand this question and I don't know how to answer
// it — give a correct and simple question").
const ASK = {
    subject: {
        prompt: { en: 'What will you write in the Subject line?', kn: 'Subject ಸಾಲಿನಲ್ಲಿ ಏನು ಬರೆಯುವಿರಿ?', hi: 'Subject पंक्ति में क्या लिखेंगे?' },
        how: { en: 'Choose the one that tells what you are writing about.', kn: 'ನೀವು ಯಾವುದರ ಬಗ್ಗೆ ಬರೆಯುತ್ತಿದ್ದೀರಿ ಎಂದು ಹೇಳುವುದನ್ನು ಆರಿಸಿ.', hi: 'वह चुनिए जो बताए कि आप किस बारे में लिख रहे हैं।' },
        why: { en: 'The subject line tells, in a few words, what it is about.', kn: 'ವಿಷಯ ಸಾಲು ಅದು ಯಾವುದರ ಬಗ್ಗೆ ಎಂದು ಕೆಲವೇ ಪದಗಳಲ್ಲಿ ಹೇಳುತ್ತದೆ.', hi: 'विषय पंक्ति कुछ ही शब्दों में बताती है कि यह किस बारे में है।' }
    },
    greeting: {
        prompt: { email: { en: 'How will you start the email?', kn: 'ಇಮೇಲ್ ಅನ್ನು ಹೇಗೆ ಶುರು ಮಾಡುವಿರಿ?', hi: 'ईमेल कैसे शुरू करेंगे?' },
            letter: { en: 'How will you start the letter?', kn: 'ಪತ್ರವನ್ನು ಹೇಗೆ ಶುರು ಮಾಡುವಿರಿ?', hi: 'पत्र कैसे शुरू करेंगे?' } },
        how: { en: 'Choose the polite way to greet them.', kn: 'ಗೌರವದಿಂದ ಕರೆಯುವುದನ್ನು ಆರಿಸಿ.', hi: 'सम्मान से संबोधित करने वाला चुनिए।' },
        why: { email: { en: 'A formal email starts with "Dear", the name or title, and a comma.', kn: 'ಔಪಚಾರಿಕ ಇಮೇಲ್ "Dear", ಹೆಸರು ಅಥವಾ ಹುದ್ದೆ ಮತ್ತು ಅಲ್ಪವಿರಾಮದಿಂದ ಆರಂಭವಾಗುತ್ತದೆ.', hi: 'औपचारिक ईमेल "Dear", नाम या पद और अल्पविराम से शुरू होता है।' },
            letter: { en: 'A formal letter starts with "Respected Sir," or "Respected Madam,".', kn: 'ಔಪಚಾರಿಕ ಪತ್ರ "Respected Sir," ಅಥವಾ "Respected Madam," ಎಂದು ಆರಂಭವಾಗುತ್ತದೆ.', hi: 'औपचारिक पत्र "Respected Sir," या "Respected Madam," से शुरू होता है।' } }
    },
    polite: {
        prompt: { en: 'Which sentence is polite?', kn: 'ಇವುಗಳಲ್ಲಿ ವಿನಯದ ವಾಕ್ಯ ಯಾವುದು?', hi: 'इनमें से विनम्र वाक्य कौन-सा है?' },
        how: { en: 'A polite sentence does not order or complain.', kn: 'ವಿನಯದ ವಾಕ್ಯ ಆಜ್ಞೆ ಮಾಡುವುದಿಲ್ಲ, ದೂರುವುದಿಲ್ಲ.', hi: 'विनम्र वाक्य हुक्म या शिकायत नहीं करता।' },
        why: { en: 'Ask politely: "Could you please…?", "Kindly…" or "I am writing to ask…".', kn: 'ವಿನಯದಿಂದ ಕೇಳಿ: "Could you please…?", "Kindly…" ಅಥವಾ "I am writing to ask…".', hi: 'विनम्रता से पूछिए: "Could you please…?", "Kindly…" या "I am writing to ask…"।' }
    },
    closing: {
        prompt: { email: { en: 'How will you end the email?', kn: 'ಇಮೇಲ್ ಅನ್ನು ಹೇಗೆ ಮುಗಿಸುವಿರಿ?', hi: 'ईमेल कैसे ख़त्म करेंगे?' },
            letter: { en: 'How will you end the letter?', kn: 'ಪತ್ರವನ್ನು ಹೇಗೆ ಮುಗಿಸುವಿರಿ?', hi: 'पत्र कैसे ख़त्म करेंगे?' } },
        how: { en: 'Choose the polite way to finish.', kn: 'ಗೌರವದಿಂದ ಮುಗಿಸುವುದನ್ನು ಆರಿಸಿ.', hi: 'सम्मान से ख़त्म करने वाला चुनिए।' },
        why: { email: { en: 'End with a closing such as "Kind regards," or "Yours sincerely," and your name.', kn: 'ಕೊನೆಯಲ್ಲಿ "Kind regards," ಅಥವಾ "Yours sincerely," ತರಹದ ಮುಕ್ತಾಯ ಮತ್ತು ನಿಮ್ಮ ಹೆಸರು ಬರೆಯಿರಿ.', hi: 'अंत में "Kind regards," या "Yours sincerely," जैसा समापन और अपना नाम लिखिए।' },
            letter: { en: 'A formal letter ends with "Yours faithfully," and your name.', kn: 'ಔಪಚಾರಿಕ ಪತ್ರ "Yours faithfully," ಮತ್ತು ನಿಮ್ಮ ಹೆಸರಿನೊಂದಿಗೆ ಮುಗಿಯುತ್ತದೆ.', hi: 'औपचारिक पत्र "Yours faithfully," और आपके नाम से ख़त्म होता है।' } }
    },
    first: {
        prompt: { en: 'Which sentence will you start with?', kn: 'ಯಾವ ವಾಕ್ಯದಿಂದ ಶುರು ಮಾಡುವಿರಿ?', hi: 'किस वाक्य से शुरू करेंगे?' },
        how: { en: 'Choose the sentence that says what you are writing about.', kn: 'ನೀವು ಯಾವುದರ ಬಗ್ಗೆ ಬರೆಯುತ್ತಿದ್ದೀರಿ ಎಂದು ಹೇಳುವ ವಾಕ್ಯವನ್ನು ಆರಿಸಿ.', hi: 'वह वाक्य चुनिए जो बताए कि आप किस बारे में लिख रहे हैं।' },
        why: { en: 'The first sentence tells what you are writing about.', kn: 'ಮೊದಲ ವಾಕ್ಯ ನೀವು ಯಾವುದರ ಬಗ್ಗೆ ಬರೆಯುತ್ತಿದ್ದೀರಿ ಎಂದು ಹೇಳುತ್ತದೆ.', hi: 'पहला वाक्य बताता है कि आप किस बारे में लिख रहे हैं।' }
    },
    order: {
        prompt: { en: 'Which words will you use to join your sentences?', kn: 'ವಾಕ್ಯಗಳನ್ನು ಜೋಡಿಸಲು ಯಾವ ಪದಗಳನ್ನು ಬಳಸುವಿರಿ?', hi: 'वाक्यों को जोड़ने के लिए कौन-से शब्द इस्तेमाल करेंगे?' },
        how: { en: 'Choose the words that join one idea to the next.', kn: 'ಒಂದು ವಿಚಾರವನ್ನು ಮುಂದಿನದಕ್ಕೆ ಜೋಡಿಸುವ ಪದಗಳನ್ನು ಆರಿಸಿ.', hi: 'वे शब्द चुनिए जो एक बात को अगली बात से जोड़ते हैं।' },
        // This unit's own joining words (its guide's, 2026-11-19), said back.
        why: (words) => ({ en: `${words} join your ideas into one paragraph.`, kn: `${words} ಪದಗಳು ನಿಮ್ಮ ವಿಚಾರಗಳನ್ನು ಒಂದು ಪ್ಯಾರಾಗ್ರಾಫ್ ಆಗಿ ಜೋಡಿಸುತ್ತವೆ.`, hi: `${words} आपकी बातों को एक अनुच्छेद में जोड़ते हैं।` })
    },
    reason: {
        prompt: { en: 'Which sentence says why?', kn: 'ಯಾವ ವಾಕ್ಯ "ಏಕೆ" ಎಂದು ಹೇಳುತ್ತದೆ?', hi: 'कौन-सा वाक्य "क्यों" बताता है?' },
        how: { en: 'Look for the word "because".', kn: '"because" (ಏಕೆಂದರೆ) ಪದವನ್ನು ಹುಡುಕಿ.', hi: '"because" (क्योंकि) शब्द ढूँढिए।' },
        why: { en: 'Use "because" to give a reason: I like it because…', kn: 'ಕಾರಣ ಕೊಡಲು "because" ಬಳಸಿ: I like it because…', hi: 'कारण बताने के लिए "because" लगाइए: I like it because…' }
    },
    last: {
        prompt: { en: 'Which sentence will you end with?', kn: 'ಯಾವ ವಾಕ್ಯದಿಂದ ಮುಗಿಸುವಿರಿ?', hi: 'किस वाक्य से ख़त्म करेंगे?' },
        how: { en: 'Choose the sentence that sums up what you wrote.', kn: 'ನೀವು ಬರೆದುದರ ಸಾರ ಹೇಳುವ ವಾಕ್ಯವನ್ನು ಆರಿಸಿ.', hi: 'वह वाक्य चुनिए जो आपके लिखे का सार बताए।' },
        why: { en: 'The last sentence sums up, or says how you feel about it.', kn: 'ಕೊನೆಯ ವಾಕ್ಯ ಸಾರಾಂಶ ಹೇಳುತ್ತದೆ, ಅಥವಾ ನಿಮಗೆ ಹೇಗನಿಸುತ್ತದೆ ಎಂದು ಹೇಳುತ್ತದೆ.', hi: 'आख़िरी वाक्य सार बताता है या आपकी भावना बताता है।' }
    }
};
// The wrong choices: plainly wrong whatever the task, never another right way to write it — too short, rude, the wrong
// kind of words, or a goodbye where it starts (a hello where it ends). Not a good line on another subject (2026-11-16, the
// user's "Which is the best first sentence?": "the answer is the first one" — the example's "My grandmother is the person
// I admire most." is a good first sentence too, so it was taken out; and "Then, after that, it was also good." was hard
// to make sense of).
const WRONG = {
    subject: ['Subject: Hello', 'Subject: Read this now!!!'],
    greeting: ['Hey!!', 'Hi buddy,'],
    polite: ['Reply to me now.', 'Why have you not answered me yet?'],
    closing: ['Bye bye!!', 'OK, that is all.'],
    first: ['That is all for today.', 'Thank you for reading.'],
    order: ['Dear, Subject, Regards', 'Yes, No, OK'],
    reason: ['I wake up early.', 'My friend lives in Mysuru.'],
    last: ['Now I will start my paragraph.', 'Hello! Let us begin.']
};
// With no model answer to take it from, the right choice for any such task.
const PLAIN = {
    greeting: { email: 'Dear Sir / Madam,', letter: 'Respected Sir / Madam,' },
    polite: 'Could you please help me with this?',
    closing: { email: 'Kind regards,', letter: 'Yours faithfully,' },
    reason: 'I walk every day because it keeps me healthy.'
};

/** A model's lines, and its sentences (a full stop before a capital ends one: "8 p.m. during" does not). */
const linesOf = (text) => String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
const sentencesOf = (text) => linesOf(text).flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z"'])/)).map((s) => s.trim()).filter(Boolean);
const POLITE = [/\bkindly\b/i, /\b(could|would) you\b/i, /\bI am writing to\b/i, /\bI would like to\b/i, /\brequest\b/i];
const CLOSINGS = /^(yours (sincerely|faithfully|truly)|(kind|best|warm) regards|regards|thank you|thanks|with regards),?$/i;

/** What this task's model answer says for each question (none for a part it does not have). */
const fromModel = (task) => {
    const model = task.model || '';
    if (!model) return {};
    const lines = linesOf(model);
    if (task.type === 'paragraph') {
        const all = sentencesOf(model);
        // A reason from its middle (its last sentence is asked on its own); none there, no reason is asked.
        const reason = all.slice(1, -1).find((s) => /\bbecause\b/i.test(s)) || null;
        return { first: all[0], reason, last: all.length > 1 ? all.at(-1) : null, model: true };
    }
    const subject = lines.find((l) => /^subject\s*:/i.test(l));
    const greeting = lines.find((l) => /^(dear|respected)\b/i.test(l));
    const body = sentencesOf(lines.filter((l) => l !== subject && l !== greeting).join('\n'));
    const polite = POLITE.map((re) => body.find((s) => re.test(s) && s.length <= 140)).find(Boolean);
    const closing = [...lines].reverse().find((l) => CLOSINGS.test(l) && !/^thank/i.test(l)) || null;
    return { subject, greeting, polite, closing };
};

/** The questions on one task, in the student's language, each with its answer and why (null-free, 2 to 4). */
const asksFor = (task, lang) => {
    const type = task?.type;
    if (!TYPES.includes(type)) return [];
    const got = fromModel(task);
    const kinds = type === 'paragraph' ? ['first', 'order', 'reason', 'last'] : ['subject', 'greeting', 'polite', 'closing'];
    const out = [];
    for (const kind of kinds) {
        const plain = PLAIN[kind];
        // The joining words: the ones this unit's guide teaches.
        const answer = kind === 'order' ? variantOf(type, task).words : got[kind] || (kind === 'reason' && got.model ? null : plain && typeof plain === 'object' ? plain[type] : plain);
        if (!answer) continue;
        const wrong = WRONG[kind].filter((w) => w !== answer);
        const a = ASK[kind];
        const prompt = a.prompt[type] || a.prompt;
        const why = typeof a.why === 'function' ? a.why(answer) : (a.why[type] || a.why);
        out.push({
            id: `${task.id}~${kind}`, type: 'mcq', kind: 'writeGuide', prompt: pick(prompt, lang), ...(lang !== 'en' && pick(prompt, lang) !== prompt.en ? { promptEn: prompt.en } : {}),
            how: pick(a.how, lang), options: [answer, ...wrong], answer, explanation: pick(why, lang)
        });
    }
    return out;
};

/** As the page gets them: no answer, the choices mixed, read aloud in English. */
// Each with the task it is about (2026-11-16: "this paragraph" — which one?), in the student's language as the task is.
const publicAsks = (task, lang, seed) => asksFor(task, lang).map((q) => ({
    id: q.id, type: 'mcq', prompt: q.prompt, ...(q.promptEn ? { promptEn: q.promptEn } : {}), how: q.how, options: shuffle([...q.options], seeded(`${seed}:${q.id}`)), optionsSay: 'en-IN',
    task: { label: pick(LABELS.task, lang), text: task.prompt }
}));

/** One question asked before a task, by its id (`w2~subject`), for checking. */
const findAsk = (lesson, id) => {
    const taskId = String(id || '').split('~')[0];
    const task = (lesson.writing || []).find((t) => t.id === taskId);
    return task && teaches(lesson, task) ? asksFor(task, lesson.language || 'en').find((q) => q.id === id) || null : null;
};

/** Whether a lesson's writing is taught first: an English email, letter or paragraph (not a course's own language). */
const teaches = (lesson, task) => !lesson.course && TYPES.includes(task?.type);

module.exports = { TYPES, GUIDES, VARIANTS, variantOf, guideOf, asksFor, publicAsks, findAsk, teaches, fromModel };
