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

const EMAIL_EXAMPLE = 'Subject: Request to renew a library book\n\nDear Librarian,\n\nI hope you are doing well. I am writing to ask if I can keep the book "Basic Statistics" for one more week.\n\nI borrowed it on 3 June, and it is due back on Monday. I still need it for my exam on 14 June. Could you please renew it until 17 June?\n\nThank you for your help.\n\nKind regards,\nRavi Kumar';
const LETTER_EXAMPLE = 'To\nThe Commissioner,\nCity Corporation, Mandya\n\n5 June 2026\n\nSubject: Request to repair the street light\n\nRespected Sir,\n\nI am writing to inform you that the street light near the bus stand on Ashoka Road has not worked for two weeks. The road is very dark at night, and it is not safe for students and older people.\n\nI kindly request you to repair it as soon as possible.\n\nThank you for considering my request.\n\nYours faithfully,\nSuma R.\nAshoka Road, Mandya';
const PARAGRAPH_EXAMPLE = 'My grandmother is the person I admire most. She gets up at five every morning and works in the garden. She is kind because she helps everyone in our street. For example, she cooks for our neighbour when he is ill. I want to be as kind as she is.';

const SUBJECT = { en: 'Subject', kn: 'ವಿಷಯ ಸಾಲು (Subject)', hi: 'विषय पंक्ति (Subject)' };
const GREETING = { en: 'Greeting', kn: 'ಸಂಬೋಧನೆ (Greeting)', hi: 'संबोधन (Greeting)' };
const CLOSING = { en: 'Closing', kn: 'ಮುಕ್ತಾಯ (Closing)', hi: 'समापन (Closing)' };

const GUIDES = {
    email: {
        title: { en: 'How to write an email', kn: 'ಇಮೇಲ್ ಬರೆಯುವುದು ಹೇಗೆ', hi: 'ईमेल कैसे लिखें' },
        intro: { en: 'Before you write, learn its parts. A good email has these, in this order.', kn: 'ಬರೆಯುವ ಮೊದಲು ಅದರ ಭಾಗಗಳನ್ನು ತಿಳಿಯಿರಿ. ಒಳ್ಳೆಯ ಇಮೇಲ್‌ನಲ್ಲಿ ಈ ಭಾಗಗಳು ಇದೇ ಕ್ರಮದಲ್ಲಿ ಇರುತ್ತವೆ.', hi: 'लिखने से पहले इसके हिस्से जानिए। अच्छे ईमेल में ये हिस्से इसी क्रम में होते हैं।' },
        parts: [
            { name: SUBJECT, say: { en: 'A few words that tell what the email is about.', kn: 'ಇಮೇಲ್ ಯಾವುದರ ಬಗ್ಗೆ ಎಂದು ಕೆಲವೇ ಪದಗಳಲ್ಲಿ ಹೇಳಿ.', hi: 'कुछ ही शब्दों में बताइए कि ईमेल किस बारे में है।' }, example: 'Subject: Request to renew a library book' },
            { name: GREETING, say: { en: '"Dear", then the person\'s name or title, and a comma.', kn: '"Dear", ನಂತರ ವ್ಯಕ್ತಿಯ ಹೆಸರು ಅಥವಾ ಹುದ್ದೆ, ಕೊನೆಯಲ್ಲಿ ಅಲ್ಪವಿರಾಮ (,).', hi: '"Dear", फिर व्यक्ति का नाम या पद, और अंत में अल्पविराम (,)।' }, example: 'Dear Librarian,' },
            { name: { en: 'Why you are writing', kn: 'ಯಾಕೆ ಬರೆಯುತ್ತಿದ್ದೀರಿ', hi: 'आप क्यों लिख रहे हैं' }, say: { en: 'In the first lines, say why you are writing.', kn: 'ಮೊದಲ ಸಾಲುಗಳಲ್ಲೇ ಯಾಕೆ ಬರೆಯುತ್ತಿದ್ದೀರಿ ಎಂದು ತಿಳಿಸಿ.', hi: 'पहली पंक्तियों में ही बताइए कि आप क्यों लिख रहे हैं।' }, example: 'I am writing to ask if I can keep a book for one more week.' },
            { name: { en: 'Details', kn: 'ವಿವರಗಳು', hi: 'विवरण' }, say: { en: 'Give the facts they need: what, when and why.', kn: 'ಅವರಿಗೆ ಬೇಕಾದ ಮಾಹಿತಿ ಕೊಡಿ: ಏನು, ಯಾವಾಗ, ಯಾಕೆ.', hi: 'उन्हें जो जानकारी चाहिए वह दीजिए: क्या, कब और क्यों।' }, example: 'I borrowed it on 3 June, and I need it for my exam on 14 June.' },
            { name: { en: 'Polite request', kn: 'ವಿನಯದ ಕೋರಿಕೆ', hi: 'विनम्र अनुरोध' }, say: { en: 'Ask for what you need, politely.', kn: 'ನಿಮಗೆ ಬೇಕಾದುದನ್ನು ವಿನಯದಿಂದ ಕೇಳಿ.', hi: 'जो चाहिए, विनम्रता से माँगिए।' }, example: 'Could you please renew it until 17 June?' },
            { name: CLOSING, say: { en: 'Thank them, then a closing such as "Kind regards," and your name.', kn: 'ಧನ್ಯವಾದ ಹೇಳಿ, ನಂತರ "Kind regards," ತರಹದ ಮುಕ್ತಾಯ ಪದ ಮತ್ತು ನಿಮ್ಮ ಹೆಸರು.', hi: 'धन्यवाद कहिए, फिर "Kind regards," जैसा समापन और अपना नाम।' }, example: 'Thank you for your help.\nKind regards,\nRavi Kumar' }
        ],
        phrases: ['I hope you are doing well.', 'I am writing to ask…', 'Could you please…?', 'I would be grateful if…', 'Thank you for your time.', 'Kind regards,'],
        example: EMAIL_EXAMPLE
    },
    letter: {
        title: { en: 'How to write a formal letter', kn: 'ಔಪಚಾರಿಕ ಪತ್ರ ಬರೆಯುವುದು ಹೇಗೆ', hi: 'औपचारिक पत्र कैसे लिखें' },
        intro: { en: 'Before you write, learn its parts. A formal letter has these, in this order.', kn: 'ಬರೆಯುವ ಮೊದಲು ಅದರ ಭಾಗಗಳನ್ನು ತಿಳಿಯಿರಿ. ಔಪಚಾರಿಕ ಪತ್ರದಲ್ಲಿ ಈ ಭಾಗಗಳು ಇದೇ ಕ್ರಮದಲ್ಲಿ ಇರುತ್ತವೆ.', hi: 'लिखने से पहले इसके हिस्से जानिए। औपचारिक पत्र में ये हिस्से इसी क्रम में होते हैं।' },
        parts: [
            { name: { en: 'To, and the address', kn: 'ಯಾರಿಗೆ ಮತ್ತು ವಿಳಾಸ', hi: 'किसे, और पता' }, say: { en: '"To", then who the letter is for, and where.', kn: '"To", ನಂತರ ಪತ್ರ ಯಾರಿಗೆ ಮತ್ತು ಅವರ ವಿಳಾಸ.', hi: '"To", फिर पत्र किसके लिए है और उनका पता।' }, example: 'To\nThe Commissioner,\nCity Corporation, Mandya' },
            { name: { en: 'Date', kn: 'ದಿನಾಂಕ', hi: 'तारीख' }, say: { en: 'The day you write it.', kn: 'ಪತ್ರ ಬರೆದ ದಿನಾಂಕ.', hi: 'जिस दिन पत्र लिखा, वह तारीख।' }, example: '5 June 2026' },
            { name: SUBJECT, say: { en: 'A few words that tell what the letter is about.', kn: 'ಪತ್ರ ಯಾವುದರ ಬಗ್ಗೆ ಎಂದು ಕೆಲವೇ ಪದಗಳಲ್ಲಿ ಹೇಳಿ.', hi: 'कुछ ही शब्दों में बताइए कि पत्र किस बारे में है।' }, example: 'Subject: Request to repair the street light' },
            { name: GREETING, say: { en: '"Respected Sir," or "Respected Madam," for a formal letter.', kn: 'ಔಪಚಾರಿಕ ಪತ್ರಕ್ಕೆ "Respected Sir," ಅಥವಾ "Respected Madam,".', hi: 'औपचारिक पत्र में "Respected Sir," या "Respected Madam,"।' }, example: 'Respected Sir,' },
            { name: { en: 'Body', kn: 'ಮುಖ್ಯ ಭಾಗ', hi: 'मुख्य भाग' }, say: { en: 'Why you are writing, the details, and what you request — politely.', kn: 'ಯಾಕೆ ಬರೆಯುತ್ತಿದ್ದೀರಿ, ವಿವರಗಳು ಮತ್ತು ನಿಮ್ಮ ಕೋರಿಕೆ — ವಿನಯದಿಂದ.', hi: 'आप क्यों लिख रहे हैं, विवरण, और आपका अनुरोध — विनम्रता से।' }, example: 'I kindly request you to repair it as soon as possible.' },
            { name: CLOSING, say: { en: 'Thank them, then "Yours faithfully," and your name.', kn: 'ಧನ್ಯವಾದ ಹೇಳಿ, ನಂತರ "Yours faithfully," ಮತ್ತು ನಿಮ್ಮ ಹೆಸರು.', hi: 'धन्यवाद कहिए, फिर "Yours faithfully," और अपना नाम।' }, example: 'Yours faithfully,\nSuma R.' }
        ],
        phrases: ['I am writing to inform you that…', 'I kindly request you to…', 'Thank you for considering my request.', 'Yours faithfully,'],
        example: LETTER_EXAMPLE
    },
    paragraph: {
        title: { en: 'How to write a paragraph', kn: 'ಪ್ಯಾರಾಗ್ರಾಫ್ ಬರೆಯುವುದು ಹೇಗೆ', hi: 'अनुच्छेद (पैराग्राफ) कैसे लिखें' },
        intro: { en: 'A paragraph is a few sentences about one idea. Build it like this.', kn: 'ಪ್ಯಾರಾಗ್ರಾಫ್ ಎಂದರೆ ಒಂದೇ ವಿಷಯದ ಬಗ್ಗೆ ಕೆಲವು ವಾಕ್ಯಗಳು. ಇದನ್ನು ಹೀಗೆ ಕಟ್ಟಿ.', hi: 'अनुच्छेद एक ही बात पर कुछ वाक्य होता है। इसे ऐसे बनाइए।' },
        parts: [
            { name: { en: 'First sentence', kn: 'ಮೊದಲ ವಾಕ್ಯ', hi: 'पहला वाक्य' }, say: { en: 'Say what the whole paragraph is about.', kn: 'ಇಡೀ ಪ್ಯಾರಾಗ್ರಾಫ್ ಯಾವುದರ ಬಗ್ಗೆ ಎಂದು ಹೇಳಿ.', hi: 'बताइए कि पूरा अनुच्छेद किस बारे में है।' }, example: 'My grandmother is the person I admire most.' },
            { name: { en: 'Middle sentences', kn: 'ನಡುವಿನ ವಾಕ್ಯಗಳು', hi: 'बीच के वाक्य' }, say: { en: 'Give reasons, steps or examples — one idea in each sentence.', kn: 'ಕಾರಣಗಳು, ಹಂತಗಳು ಅಥವಾ ಉದಾಹರಣೆಗಳು — ಪ್ರತಿ ವಾಕ್ಯದಲ್ಲಿ ಒಂದು ವಿಷಯ.', hi: 'कारण, कदम या उदाहरण दीजिए — हर वाक्य में एक बात।' }, example: 'She gets up at five every morning and works in the garden.' },
            { name: { en: 'Joining words', kn: 'ಜೋಡಿಸುವ ಪದಗಳು', hi: 'जोड़ने वाले शब्द' }, say: { en: 'Join your ideas with words like First, Then, Also, because, For example.', kn: 'First, Then, Also, because, For example ತರಹದ ಪದಗಳಿಂದ ವಿಚಾರಗಳನ್ನು ಜೋಡಿಸಿ.', hi: 'First, Then, Also, because, For example जैसे शब्दों से बातें जोड़िए।' }, example: 'She is kind because she helps everyone in our street.' },
            { name: { en: 'Last sentence', kn: 'ಕೊನೆಯ ವಾಕ್ಯ', hi: 'आख़िरी वाक्य' }, say: { en: 'End by summing up, or say how you feel.', kn: 'ಸಾರಾಂಶ ಹೇಳಿ, ಅಥವಾ ನಿಮಗೆ ಹೇಗನಿಸುತ್ತದೆ ಎಂದು ಹೇಳಿ ಮುಗಿಸಿ.', hi: 'सार बताकर या अपनी भावना बताकर ख़त्म कीजिए।' }, example: 'I want to be as kind as she is.' }
        ],
        phrases: ['First,', 'Then,', 'After that,', 'Also,', 'because', 'For example,', 'Finally,'],
        example: PARAGRAPH_EXAMPLE
    }
};
const LABELS = {
    phrases: { en: 'Useful words and phrases', kn: 'ಉಪಯುಕ್ತ ಪದಗಳು, ವಾಕ್ಯಗಳು', hi: 'काम के शब्द और वाक्य' },
    example: { en: 'An example', kn: 'ಒಂದು ಉದಾಹರಣೆ', hi: 'एक उदाहरण' },
    task: { en: 'Your writing task', kn: 'ನಿಮ್ಮ ಬರವಣಿಗೆ', hi: 'आपका लेखन कार्य' },
    next: { en: 'Next: a few questions on your task, then you write it.', kn: 'ಮುಂದೆ: ನಿಮ್ಮ ಬರವಣಿಗೆಯ ಬಗ್ಗೆ ಕೆಲವು ಪ್ರಶ್ನೆಗಳು, ನಂತರ ನೀವೇ ಬರೆಯುವಿರಿ.', hi: 'आगे: आपके काम पर कुछ सवाल, फिर आप ख़ुद लिखेंगे।' }
};

/** How to write this kind of task, in the student's language (null for a sentence, a jumbled one…). */
const guideOf = (type, lang) => {
    const g = GUIDES[type];
    if (!g) return null;
    return {
        type, title: pick(g.title, lang), intro: pick(g.intro, lang),
        parts: g.parts.map((p) => ({ name: pick(p.name, lang), say: pick(p.say, lang), example: p.example })),
        phrasesTitle: pick(LABELS.phrases, lang), phrases: g.phrases, exampleTitle: pick(LABELS.example, lang), example: g.example, next: pick(LABELS.next, lang)
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
        how: { en: 'They mean: first…, then…, after that…, at the end…', kn: 'ಅವುಗಳ ಅರ್ಥ: ಮೊದಲು…, ನಂತರ…, ಅದಾದ ಮೇಲೆ…, ಕೊನೆಯಲ್ಲಿ…', hi: 'उनका मतलब: पहले…, फिर…, उसके बाद…, आख़िर में…' },
        why: { en: 'First, Then, After that and Finally join your sentences in order.', kn: 'First, Then, After that, Finally ಪದಗಳು ವಾಕ್ಯಗಳನ್ನು ಕ್ರಮವಾಗಿ ಜೋಡಿಸುತ್ತವೆ.', hi: 'First, Then, After that और Finally वाक्यों को क्रम से जोड़ते हैं।' }
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
    order: 'First, Then, After that, Finally',
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
        const answer = got[kind] || (kind === 'reason' && got.model ? null : plain && typeof plain === 'object' ? plain[type] : plain);
        if (!answer) continue;
        const wrong = WRONG[kind].filter((w) => w !== answer);
        const a = ASK[kind];
        const prompt = a.prompt[type] || a.prompt;
        const why = (a.why[type] || a.why);
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

module.exports = { TYPES, GUIDES, guideOf, asksFor, publicAsks, findAsk, teaches, fromModel };
