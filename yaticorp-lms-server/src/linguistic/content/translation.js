/**
 * Linguistic Ability — Translation Practice lessons (seed content).
 *
 * Each lesson goes one way: Kannada → English ('kn-en') or English → Kannada
 * ('en-kn'). An item is a word, a sentence or a short paragraph, with its
 * model translation, other accepted translations, an explanation, and a topic
 * that ties it to the rest of the section (daily conversation, vocabulary,
 * grammar, passage, professional).
 *
 * Answers are checked by translationCheck.js: whitespace, case and
 * punctuation are set aside, and a close answer counts. A paragraph (`open`)
 * is never marked wrong by a machine: the student compares it with the model
 * answer, and a copy goes to a teacher to review.
 *
 * `items` are practised one by one; `quiz` is the scored test.
 */
const item = (id, kind, topic, source, model, explanation, accepted = [], open = false) => ({ id, kind, topic, source, model, accepted, explanation, ...(open ? { open: true } : {}) });

const KN_EN_TIPS = [
    'Kannada puts the verb at the end: "ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತೇನೆ" (I school-to go). English puts it after the subject: "I go to school."',
    'English needs small words Kannada does not have: a, an, the, is, am, are.',
    'Watch the tense: ಹೋಗುತ್ತೇನೆ (go / will go), ಹೋದೆ (went), ಹೋಗುತ್ತಿದ್ದೇನೆ (am going).',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const EN_KN_TIPS = [
    'Move the verb to the end: "I go to school" → "ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತೇನೆ".',
    'There are no words for a, an or the in Kannada; leave them out.',
    'Choose the polite form for elders and strangers: ನೀವು, ಬನ್ನಿ, ಕೊಡಿ. With friends you may use ನೀನು, ಬಾ, ಕೊಡು.',
    'Type in Kannada with your phone\'s Kannada keyboard, or use the Kannada letters under the answer box.'
];

module.exports = [
    {
        seedKey: 'translation-beginner-kn-en', module: 'translation', level: 'beginner', order: 1, direction: 'kn-en',
        title: 'Daily conversation: Kannada → English',
        summary: 'Greetings, names and everyday sentences.',
        learn: { intro: 'Translate each Kannada word or sentence into English.', points: KN_EN_TIPS },
        items: [
            item('i1', 'word', 'vocabulary', 'ನೀರು', 'water', 'ನೀರು means water.'),
            item('i2', 'word', 'vocabulary', 'ಪುಸ್ತಕ', 'book', 'ಪುಸ್ತಕ means book.', ['a book']),
            item('i3', 'sentence', 'daily conversation', 'ನನ್ನ ಹೆಸರು ರಾಣಿ.', 'My name is Rani.', 'ನನ್ನ = my, ಹೆಸರು = name. English adds "is".', ['I am Rani.', 'I\'m Rani.']),
            item('i4', 'sentence', 'daily conversation', 'ನೀವು ಹೇಗಿದ್ದೀರಿ?', 'How are you?', 'This is the common greeting. English needs "are".'),
            item('i5', 'sentence', 'daily conversation', 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ.', 'I am fine.', 'ಚೆನ್ನಾಗಿದ್ದೇನೆ means "I am well".', ['I\'m fine.', 'I am well.', 'I am good.', 'I\'m good.', 'I am doing well.', 'I am fine, thank you.']),
            item('i6', 'sentence', 'grammar', 'ಇದು ನನ್ನ ಮನೆ.', 'This is my house.', 'ಇದು = this. English needs the verb "is".', ['This is my home.'])
        ],
        quiz: [
            item('q1', 'sentence', 'grammar', 'ನಾನು ಶಾಲೆಗೆ ಹೋಗುತ್ತೇನೆ.', 'I go to school.', 'ಹೋಗುತ್ತೇನೆ can mean "I go" or "I will go". The verb moves to after "I".', ['I will go to school.', 'I am going to school.']),
            item('q2', 'sentence', 'vocabulary', 'ಅವಳು ನನ್ನ ತಂಗಿ.', 'She is my younger sister.', 'ತಂಗಿ is a younger sister (ಅಕ್ಕ is an elder sister).', ['She is my sister.', 'She is my little sister.']),
            item('q3', 'sentence', 'daily conversation', 'ದಯವಿಟ್ಟು ಬಾಗಿಲು ಮುಚ್ಚಿ.', 'Please close the door.', 'ದಯವಿಟ್ಟು = please, ಬಾಗಿಲು = door, ಮುಚ್ಚಿ = close.', ['Please shut the door.', 'Close the door, please.', 'Please close the door.']),
            item('q4', 'sentence', 'daily conversation', 'ಧನ್ಯವಾದಗಳು.', 'Thank you.', 'ಧನ್ಯವಾದಗಳು is the polite way to say thank you.', ['Thanks.', 'Thank you very much.', 'Thanks a lot.'])
        ]
    },
    {
        seedKey: 'translation-beginner-en-kn', module: 'translation', level: 'beginner', order: 2, direction: 'en-kn',
        title: 'Everyday words: English → Kannada',
        summary: 'Simple words and sentences from daily life.',
        learn: { intro: 'Translate each English word or sentence into Kannada.', points: EN_KN_TIPS },
        items: [
            item('i1', 'word', 'vocabulary', 'friend', 'ಸ್ನೇಹಿತ', 'Friend is ಸ್ನೇಹಿತ (or ಗೆಳೆಯ; for a girl, ಸ್ನೇಹಿತೆ or ಗೆಳತಿ).', ['ಗೆಳೆಯ', 'ಸ್ನೇಹಿತೆ', 'ಗೆಳತಿ']),
            item('i2', 'word', 'vocabulary', 'school', 'ಶಾಲೆ', 'School is ಶಾಲೆ.'),
            item('i3', 'sentence', 'daily conversation', 'Good morning.', 'ಶುಭೋದಯ.', 'The usual greeting is ಶುಭೋದಯ.', ['ಶುಭ ಮುಂಜಾನೆ.']),
            item('i4', 'sentence', 'grammar', 'I am a student.', 'ನಾನು ವಿದ್ಯಾರ್ಥಿ.', 'Kannada needs no word for "am" or "a" here.', ['ನಾನು ವಿದ್ಯಾರ್ಥಿನಿ.', 'ನಾನೊಬ್ಬ ವಿದ್ಯಾರ್ಥಿ.', 'ನಾನು ಒಬ್ಬ ವಿದ್ಯಾರ್ಥಿ.']),
            item('i5', 'sentence', 'daily conversation', 'What is your name?', 'ನಿಮ್ಮ ಹೆಸರು ಏನು?', 'ನಿಮ್ಮ is polite; with a friend you can say ನಿನ್ನ.', ['ನಿನ್ನ ಹೆಸರು ಏನು?', 'ನಿಮ್ಮ ಹೆಸರೇನು?', 'ನಿನ್ನ ಹೆಸರೇನು?']),
            item('i6', 'sentence', 'vocabulary', 'The food is tasty.', 'ಊಟ ರುಚಿಯಾಗಿದೆ.', 'ರುಚಿ = taste; ರುಚಿಯಾಗಿದೆ = is tasty.', ['ಆಹಾರ ರುಚಿಯಾಗಿದೆ.', 'ಊಟ ರುಚಿಕರವಾಗಿದೆ.', 'ಆಹಾರ ರುಚಿಕರವಾಗಿದೆ.'])
        ],
        quiz: [
            item('q1', 'sentence', 'daily conversation', 'Where is the bus stand?', 'ಬಸ್ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?', 'ಎಲ್ಲಿ = where; ಎಲ್ಲಿದೆ = where is (it).', ['ಬಸ್ ಸ್ಟ್ಯಾಂಡ್ ಎಲ್ಲಿದೆ?']),
            item('q2', 'sentence', 'grammar', 'I like mangoes.', 'ನನಗೆ ಮಾವಿನ ಹಣ್ಣು ಇಷ್ಟ.', 'Kannada says "to me, mango is liked": ನನಗೆ … ಇಷ್ಟ.', ['ನನಗೆ ಮಾವಿನಹಣ್ಣು ಇಷ್ಟ.', 'ನನಗೆ ಮಾವಿನ ಹಣ್ಣುಗಳು ಇಷ್ಟ.', 'ನನಗೆ ಮಾವಿನಹಣ್ಣುಗಳು ಇಷ್ಟ.']),
            item('q3', 'sentence', 'daily conversation', 'Come here.', 'ಇಲ್ಲಿ ಬನ್ನಿ.', 'ಬನ್ನಿ is polite; ಬಾ is used with friends and children.', ['ಇಲ್ಲಿ ಬಾ.']),
            item('q4', 'sentence', 'grammar', 'It is raining.', 'ಮಳೆ ಬರುತ್ತಿದೆ.', 'Kannada says "rain is coming": ಮಳೆ ಬರುತ್ತಿದೆ.', ['ಮಳೆ ಬೀಳುತ್ತಿದೆ.'])
        ]
    },
    {
        seedKey: 'translation-intermediate-kn-en', module: 'translation', level: 'intermediate', order: 1, direction: 'kn-en',
        title: 'Tenses in translation: Kannada → English',
        summary: 'Past, present and future in everyday sentences.',
        learn: { intro: 'Look at the Kannada verb ending to choose the English tense.', points: KN_EN_TIPS },
        items: [
            item('i1', 'sentence', 'grammar', 'ನಾನು ನಿನ್ನೆ ಸಿನಿಮಾ ನೋಡಿದೆ.', 'I watched a movie yesterday.', 'ನೋಡಿದೆ is past tense: watched (or saw).', ['I saw a movie yesterday.', 'Yesterday I watched a movie.', 'I watched a film yesterday.', 'Yesterday I saw a movie.']),
            item('i2', 'sentence', 'grammar', 'ಅವನು ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ಓಡುತ್ತಾನೆ.', 'He runs every morning.', 'A habit takes the simple present: runs.', ['He goes running every morning.', 'Every morning he runs.']),
            item('i3', 'sentence', 'grammar', 'ನಾವು ನಾಳೆ ಮೈಸೂರಿಗೆ ಹೋಗುತ್ತೇವೆ.', 'We will go to Mysuru tomorrow.', 'ನಾಳೆ (tomorrow) shows the future: will go.', ['We are going to Mysuru tomorrow.', 'Tomorrow we will go to Mysuru.', 'We will go to Mysore tomorrow.']),
            item('i4', 'sentence', 'grammar', 'ಅವಳು ಪುಸ್ತಕ ಓದುತ್ತಿದ್ದಾಳೆ.', 'She is reading a book.', '-ತ್ತಿದ್ದಾಳೆ shows an action happening now: is reading.'),
            item('i5', 'sentence', 'daily conversation', 'ಮಕ್ಕಳು ಮೈದಾನದಲ್ಲಿ ಆಡುತ್ತಿದ್ದಾರೆ.', 'The children are playing in the ground.', 'ಮೈದಾನ = ground or field; ಆಡುತ್ತಿದ್ದಾರೆ = are playing.', ['The children are playing on the field.', 'The children are playing in the playground.', 'Children are playing in the ground.']),
            item('i6', 'sentence', 'daily conversation', 'ನೀವು ಊಟ ಮಾಡಿದಿರಾ?', 'Did you have your meal?', 'A polite question about eating. "Have you eaten?" is just as natural.', ['Have you eaten?', 'Did you eat?', 'Have you had your meal?', 'Did you have food?'])
        ],
        quiz: [
            item('q1', 'sentence', 'vocabulary', 'ನನಗೆ ಇಂಗ್ಲಿಷ್ ಮಾತನಾಡಲು ಇಷ್ಟ.', 'I like to speak English.', 'ನನಗೆ … ಇಷ್ಟ = I like.', ['I like speaking English.', 'I love to speak English.']),
            item('q2', 'sentence', 'grammar', 'ಅವರು ಎರಡು ವರ್ಷಗಳಿಂದ ಬೆಂಗಳೂರಿನಲ್ಲಿ ವಾಸಿಸುತ್ತಿದ್ದಾರೆ.', 'They have been living in Bengaluru for two years.', '-ಇಂದ with a time (ಎರಡು ವರ್ಷಗಳಿಂದ) and an ongoing action needs the present perfect continuous.', ['They have lived in Bengaluru for two years.', 'They have been living in Bangalore for two years.', 'He has been living in Bengaluru for two years.']),
            item('q3', 'sentence', 'daily conversation', 'ರೈಲು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಬಂತು.', 'The train came on time.', 'ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ = on time; ಬಂತು = came.', ['The train arrived on time.']),
            item('q4', 'sentence', 'daily conversation', 'ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ.', 'Please speak slowly.', 'ನಿಧಾನವಾಗಿ = slowly.', ['Please talk slowly.', 'Speak slowly, please.'])
        ]
    },
    {
        seedKey: 'translation-intermediate-en-kn', module: 'translation', level: 'intermediate', order: 2, direction: 'en-kn',
        title: 'College and daily life: English → Kannada',
        summary: 'Requests, times and plans.',
        learn: { intro: 'Translate into natural Kannada. Use the polite form for requests.', points: EN_KN_TIPS },
        items: [
            item('i1', 'sentence', 'daily conversation', 'Please give me some water.', 'ದಯವಿಟ್ಟು ನನಗೆ ಸ್ವಲ್ಪ ನೀರು ಕೊಡಿ.', 'ಕೊಡಿ is the polite form of "give".', ['ದಯವಿಟ್ಟು ನನಗೆ ಸ್ವಲ್ಪ ನೀರು ಕೊಡು.', 'ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ನೀರು ಕೊಡಿ.']),
            item('i2', 'sentence', 'grammar', 'The class starts at nine o\'clock.', 'ತರಗತಿ ಒಂಬತ್ತು ಗಂಟೆಗೆ ಶುರುವಾಗುತ್ತದೆ.', 'ಗಂಟೆಗೆ = at … o\'clock; ಶುರುವಾಗುತ್ತದೆ = starts.', ['ತರಗತಿ ಒಂಬತ್ತು ಗಂಟೆಗೆ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ.', 'ಕ್ಲಾಸ್ ಒಂಬತ್ತು ಗಂಟೆಗೆ ಶುರುವಾಗುತ್ತದೆ.', 'ತರಗತಿ 9 ಗಂಟೆಗೆ ಶುರುವಾಗುತ್ತದೆ.']),
            item('i3', 'sentence', 'grammar', 'I forgot my book at home.', 'ನಾನು ನನ್ನ ಪುಸ್ತಕವನ್ನು ಮನೆಯಲ್ಲಿ ಮರೆತುಬಿಟ್ಟೆ.', 'ಮರೆತುಬಿಟ್ಟೆ = I forgot. The object takes -ವನ್ನು.', ['ನಾನು ಪುಸ್ತಕವನ್ನು ಮನೆಯಲ್ಲಿ ಮರೆತೆ.', 'ನನ್ನ ಪುಸ್ತಕವನ್ನು ಮನೆಯಲ್ಲಿ ಮರೆತುಬಿಟ್ಟೆ.', 'ನಾನು ನನ್ನ ಪುಸ್ತಕವನ್ನು ಮನೆಯಲ್ಲೇ ಮರೆತೆ.']),
            item('i4', 'sentence', 'daily conversation', 'How much does this cost?', 'ಇದರ ಬೆಲೆ ಎಷ್ಟು?', 'ಬೆಲೆ = price; ಎಷ್ಟು = how much.', ['ಇದಕ್ಕೆ ಎಷ್ಟು ಬೆಲೆ?', 'ಇದು ಎಷ್ಟು?']),
            item('i5', 'sentence', 'vocabulary', 'My exam is next week.', 'ನನ್ನ ಪರೀಕ್ಷೆ ಮುಂದಿನ ವಾರ ಇದೆ.', 'ಮುಂದಿನ ವಾರ = next week.', ['ಮುಂದಿನ ವಾರ ನನ್ನ ಪರೀಕ್ಷೆ ಇದೆ.']),
            item('i6', 'sentence', 'daily conversation', 'Can you help me?', 'ನೀವು ನನಗೆ ಸಹಾಯ ಮಾಡಬಹುದೇ?', 'ಸಹಾಯ ಮಾಡು = help. ಮಾಡಬಹುದೇ = can (you) do?', ['ನೀವು ನನಗೆ ಸಹಾಯ ಮಾಡುತ್ತೀರಾ?', 'ನನಗೆ ಸಹಾಯ ಮಾಡುತ್ತೀರಾ?', 'ನೀನು ನನಗೆ ಸಹಾಯ ಮಾಡುತ್ತೀಯಾ?'])
        ],
        quiz: [
            item('q1', 'sentence', 'grammar', 'We are going to the library.', 'ನಾವು ಗ್ರಂಥಾಲಯಕ್ಕೆ ಹೋಗುತ್ತಿದ್ದೇವೆ.', 'ಗ್ರಂಥಾಲಯ = library; ಹೋಗುತ್ತಿದ್ದೇವೆ = are going.', ['ನಾವು ಲೈಬ್ರರಿಗೆ ಹೋಗುತ್ತಿದ್ದೇವೆ.']),
            item('q2', 'sentence', 'grammar', 'She speaks Kannada very well.', 'ಅವಳು ಕನ್ನಡವನ್ನು ತುಂಬಾ ಚೆನ್ನಾಗಿ ಮಾತನಾಡುತ್ತಾಳೆ.', 'ತುಂಬಾ ಚೆನ್ನಾಗಿ = very well.', ['ಅವಳು ಕನ್ನಡ ತುಂಬಾ ಚೆನ್ನಾಗಿ ಮಾತನಾಡುತ್ತಾಳೆ.', 'ಅವರು ಕನ್ನಡವನ್ನು ತುಂಬಾ ಚೆನ್ನಾಗಿ ಮಾತನಾಡುತ್ತಾರೆ.']),
            item('q3', 'sentence', 'daily conversation', 'Do not waste water.', 'ನೀರನ್ನು ವ್ಯರ್ಥ ಮಾಡಬೇಡಿ.', 'ಮಾಡಬೇಡಿ = do not (polite).', ['ನೀರು ವ್ಯರ್ಥ ಮಾಡಬೇಡಿ.', 'ನೀರನ್ನು ಪೋಲು ಮಾಡಬೇಡಿ.', 'ನೀರನ್ನು ವ್ಯರ್ಥ ಮಾಡಬೇಡ.']),
            item('q4', 'sentence', 'vocabulary', 'The shop opens at ten.', 'ಅಂಗಡಿ ಹತ್ತು ಗಂಟೆಗೆ ತೆರೆಯುತ್ತದೆ.', 'ತೆರೆಯುತ್ತದೆ = opens.', ['ಅಂಗಡಿ 10 ಗಂಟೆಗೆ ತೆರೆಯುತ್ತದೆ.'])
        ]
    },
    {
        seedKey: 'translation-advanced-kn-en', module: 'translation', level: 'advanced', order: 1, direction: 'kn-en',
        title: 'Professional communication: Kannada → English',
        summary: 'Office sentences and a short passage.',
        learn: { intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."', points: KN_EN_TIPS },
        items: [
            item('i1', 'sentence', 'professional', 'ಸಭೆಯನ್ನು ಸೋಮವಾರಕ್ಕೆ ಮುಂದೂಡಲಾಗಿದೆ.', 'The meeting has been postponed to Monday.', '-ಲಾಗಿದೆ is passive: "has been …". ಮುಂದೂಡು = postpone.', ['The meeting has been moved to Monday.', 'The meeting is postponed to Monday.', 'The meeting has been postponed till Monday.', 'The meeting has been postponed until Monday.']),
            item('i2', 'sentence', 'professional', 'ದಯವಿಟ್ಟು ವರದಿಯನ್ನು ಶುಕ್ರವಾರದೊಳಗೆ ಕಳುಹಿಸಿ.', 'Please send the report by Friday.', '-ಒಳಗೆ with a day means "by" (not later than).', ['Kindly send the report by Friday.', 'Please send the report before Friday.']),
            item('i3', 'sentence', 'professional', 'ತಡವಾಗಿ ಉತ್ತರಿಸಿದ್ದಕ್ಕೆ ಕ್ಷಮಿಸಿ.', 'Sorry for the late reply.', 'A common line in emails.', ['Sorry for replying late.', 'I am sorry for the delayed response.', 'Sorry for the delay in replying.', 'Sorry for the late response.']),
            item('i4', 'sentence', 'professional', 'ನಮ್ಮ ತಂಡವು ಯೋಜನೆಯನ್ನು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಪೂರ್ಣಗೊಳಿಸಿತು.', 'Our team completed the project on time.', 'ಪೂರ್ಣಗೊಳಿಸಿತು = completed.', ['Our team finished the project on time.']),
            item('i5', 'paragraph', 'passage', 'ನಾನು ಕಳೆದ ವರ್ಷ ಪದವಿ ಮುಗಿಸಿದೆ. ಈಗ ನಾನು ಒಂದು ಸಾಫ್ಟ್‌ವೇರ್ ಕಂಪನಿಯಲ್ಲಿ ಕೆಲಸ ಹುಡುಕುತ್ತಿದ್ದೇನೆ. ನನಗೆ ಹೊಸ ವಿಷಯಗಳನ್ನು ಕಲಿಯಲು ತುಂಬಾ ಆಸಕ್ತಿ ಇದೆ.', 'I completed my degree last year. Now I am looking for a job in a software company. I am very interested in learning new things.', 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.', [], true),
            item('i6', 'sentence', 'professional', 'ನಿಮ್ಮ ಸಹಕಾರಕ್ಕೆ ಧನ್ಯವಾದಗಳು.', 'Thank you for your cooperation.', 'ಸಹಕಾರ = cooperation.', ['Thanks for your cooperation.', 'Thank you for your support.'])
        ],
        quiz: [
            item('q1', 'sentence', 'professional', 'ಈ ಸಮಸ್ಯೆಯನ್ನು ಆದಷ್ಟು ಬೇಗ ಪರಿಹರಿಸಲಾಗುವುದು.', 'This problem will be solved as soon as possible.', '-ಲಾಗುವುದು is the future passive: "will be …".', ['This issue will be resolved as soon as possible.', 'The problem will be solved as soon as possible.', 'This problem will be resolved as soon as possible.']),
            item('q2', 'sentence', 'professional', 'ನಾನು ಈ ಹುದ್ದೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಬಯಸುತ್ತೇನೆ.', 'I would like to apply for this position.', 'ಹುದ್ದೆ = post or position; ಅರ್ಜಿ ಸಲ್ಲಿಸು = apply.', ['I want to apply for this post.', 'I would like to apply for this post.', 'I want to apply for this position.', 'I wish to apply for this position.']),
            item('q3', 'sentence', 'professional', 'ಅವರು ಸಭೆಯಲ್ಲಿ ಉತ್ತಮ ಸಲಹೆ ನೀಡಿದರು.', 'He gave a good suggestion in the meeting.', 'ಅವರು can be "he" or "she" (said with respect) or "they".', ['They gave a good suggestion in the meeting.', 'She gave a good suggestion in the meeting.', 'He gave good advice in the meeting.', 'He made a good suggestion in the meeting.', 'He gave a good suggestion at the meeting.']),
            item('q4', 'sentence', 'professional', 'ಗ್ರಾಹಕರ ತೃಪ್ತಿಯೇ ನಮ್ಮ ಮೊದಲ ಆದ್ಯತೆ.', 'Customer satisfaction is our first priority.', 'ತೃಪ್ತಿ = satisfaction; ಆದ್ಯತೆ = priority.', ['Customer satisfaction is our top priority.', 'Customer satisfaction is our highest priority.'])
        ]
    },
    {
        seedKey: 'translation-advanced-en-kn', module: 'translation', level: 'advanced', order: 2, direction: 'en-kn',
        title: 'Passages and formal sentences: English → Kannada',
        summary: 'Formal sentences, a short passage and a letter line.',
        learn: { intro: 'Write formal Kannada. Passive forms such as -ಲಾಗುವುದು are common in notices.', points: EN_KN_TIPS },
        items: [
            item('i1', 'sentence', 'professional', 'The company has announced a new policy.', 'ಕಂಪನಿಯು ಹೊಸ ನೀತಿಯನ್ನು ಘೋಷಿಸಿದೆ.', 'ನೀತಿ = policy; ಘೋಷಿಸಿದೆ = has announced.', ['ಕಂಪನಿ ಹೊಸ ನೀತಿಯನ್ನು ಘೋಷಿಸಿದೆ.']),
            item('i2', 'sentence', 'vocabulary', 'Education is the key to success.', 'ಶಿಕ್ಷಣವೇ ಯಶಸ್ಸಿನ ಕೀಲಿ.', 'ಯಶಸ್ಸು = success; ಕೀಲಿ or ಕೀಲಿಕೈ = key.', ['ಶಿಕ್ಷಣ ಯಶಸ್ಸಿನ ಕೀಲಿಕೈ.', 'ಶಿಕ್ಷಣವೇ ಯಶಸ್ಸಿನ ಕೀಲಿಕೈ.', 'ಶಿಕ್ಷಣ ಯಶಸ್ಸಿನ ಕೀಲಿ.']),
            item('i3', 'sentence', 'professional', 'Please inform me if there is any change.', 'ಏನಾದರೂ ಬದಲಾವಣೆ ಇದ್ದರೆ ದಯವಿಟ್ಟು ನನಗೆ ತಿಳಿಸಿ.', 'In Kannada the "if" part (ಇದ್ದರೆ) comes first.', ['ಯಾವುದೇ ಬದಲಾವಣೆ ಇದ್ದರೆ ದಯವಿಟ್ಟು ನನಗೆ ತಿಳಿಸಿ.', 'ಏನಾದರೂ ಬದಲಾವಣೆ ಇದ್ದರೆ ನನಗೆ ತಿಳಿಸಿ.']),
            item('i4', 'sentence', 'grammar', 'We should protect the environment.', 'ನಾವು ಪರಿಸರವನ್ನು ರಕ್ಷಿಸಬೇಕು.', '-ಬೇಕು = should or must.', ['ನಾವು ಪರಿಸರವನ್ನು ಸಂರಕ್ಷಿಸಬೇಕು.']),
            item('i5', 'paragraph', 'passage', 'Our college organised a blood donation camp last week. Many students and teachers took part. The doctors thanked everyone for their support.', 'ನಮ್ಮ ಕಾಲೇಜು ಕಳೆದ ವಾರ ರಕ್ತದಾನ ಶಿಬಿರವನ್ನು ಆಯೋಜಿಸಿತ್ತು. ಅನೇಕ ವಿದ್ಯಾರ್ಥಿಗಳು ಮತ್ತು ಶಿಕ್ಷಕರು ಭಾಗವಹಿಸಿದರು. ವೈದ್ಯರು ಎಲ್ಲರಿಗೂ ಅವರ ಬೆಂಬಲಕ್ಕಾಗಿ ಧನ್ಯವಾದ ಹೇಳಿದರು.', 'ರಕ್ತದಾನ ಶಿಬಿರ = blood donation camp; ಭಾಗವಹಿಸು = take part. Compare your sentences with the model.', [], true),
            item('i6', 'sentence', 'professional', 'I am writing to request a leave of two days.', 'ಎರಡು ದಿನಗಳ ರಜೆಯನ್ನು ಕೋರಲು ನಾನು ಈ ಪತ್ರ ಬರೆಯುತ್ತಿದ್ದೇನೆ.', 'ರಜೆ = leave; ಕೋರು = request.', ['ಎರಡು ದಿನಗಳ ರಜೆ ಕೋರಲು ನಾನು ಬರೆಯುತ್ತಿದ್ದೇನೆ.', 'ಎರಡು ದಿನಗಳ ರಜೆಗಾಗಿ ವಿನಂತಿಸಲು ನಾನು ಬರೆಯುತ್ತಿದ್ದೇನೆ.'])
        ],
        quiz: [
            item('q1', 'sentence', 'vocabulary', 'Hard work always pays off.', 'ಕಠಿಣ ಪರಿಶ್ರಮಕ್ಕೆ ಯಾವಾಗಲೂ ಫಲ ಸಿಗುತ್ತದೆ.', '"Pays off" means "gives a result": ಫಲ ಸಿಗುತ್ತದೆ.', ['ಕಠಿಣ ಪರಿಶ್ರಮ ಯಾವಾಗಲೂ ಫಲ ನೀಡುತ್ತದೆ.', 'ಶ್ರಮಕ್ಕೆ ಯಾವಾಗಲೂ ಫಲ ಸಿಗುತ್ತದೆ.']),
            item('q2', 'sentence', 'grammar', 'The results will be announced tomorrow.', 'ಫಲಿತಾಂಶವನ್ನು ನಾಳೆ ಪ್ರಕಟಿಸಲಾಗುವುದು.', '"Will be announced" is the future passive: ಪ್ರಕಟಿಸಲಾಗುವುದು.', ['ಫಲಿತಾಂಶಗಳನ್ನು ನಾಳೆ ಪ್ರಕಟಿಸಲಾಗುವುದು.', 'ನಾಳೆ ಫಲಿತಾಂಶ ಪ್ರಕಟವಾಗುತ್ತದೆ.', 'ಫಲಿತಾಂಶ ನಾಳೆ ಪ್ರಕಟವಾಗುತ್ತದೆ.']),
            item('q3', 'sentence', 'professional', 'Thank you for your quick response.', 'ನಿಮ್ಮ ತ್ವರಿತ ಪ್ರತಿಕ್ರಿಯೆಗೆ ಧನ್ಯವಾದಗಳು.', 'ತ್ವರಿತ = quick; ಪ್ರತಿಕ್ರಿಯೆ = response.', ['ನಿಮ್ಮ ಶೀಘ್ರ ಪ್ರತಿಕ್ರಿಯೆಗೆ ಧನ್ಯವಾದಗಳು.', 'ನಿಮ್ಮ ತ್ವರಿತ ಉತ್ತರಕ್ಕೆ ಧನ್ಯವಾದಗಳು.']),
            item('q4', 'sentence', 'professional', 'Safety is everyone\'s responsibility.', 'ಸುರಕ್ಷತೆ ಎಲ್ಲರ ಜವಾಬ್ದಾರಿ.', 'ಸುರಕ್ಷತೆ = safety; ಎಲ್ಲರ = everyone\'s.', ['ಸುರಕ್ಷತೆಯು ಎಲ್ಲರ ಜವಾಬ್ದಾರಿ.', 'ಸುರಕ್ಷತೆ ಎಲ್ಲರ ಜವಾಬ್ದಾರಿಯಾಗಿದೆ.'])
        ]
    }
];
