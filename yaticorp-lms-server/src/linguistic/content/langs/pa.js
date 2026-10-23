/**
 * Linguistic Ability — Punjabi (Gurmukhi) as the student's own language: word
 * meanings, tips and translation exercises, matched to the Kannada content by
 * lesson (seedKey) and item id. English answers and questions stay as they are.
 */

// Tips shared by the three Punjabi → English lessons, and by the three English → Punjabi lessons.
const TO_ENGLISH_POINTS = [
    'Punjabi puts the verb at the end: "ਮੈਂ ਸਕੂਲ ਜਾਂਦਾ ਹਾਂ" (I school go). English puts it after the subject: "I go to school."',
    'English needs a, an and the, which Punjabi does not have. Punjabi does have ਹੈ, ਹਾਂ, ਹੋ, ਹਨ (is, am, are), but at the end of the sentence; in English they come right after the subject.',
    'Watch the tense: ਜਾਂਦਾ ਹਾਂ (go), ਜਾਵਾਂਗਾ (will go), ਗਿਆ (went), ਜਾ ਰਿਹਾ ਹਾਂ (am going). ਕੱਲ੍ਹ means yesterday or tomorrow; the verb tells you which.',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const TO_PUNJABI_POINTS = [
    'Move the verb to the end: "I go to school" → "ਮੈਂ ਸਕੂਲ ਜਾਂਦਾ ਹਾਂ।" A girl or woman says "ਮੈਂ ਸਕੂਲ ਜਾਂਦੀ ਹਾਂ।"',
    'There are no words for a, an or the in Punjabi; leave them out. (ਇੱਕ means "one"; it is used for "a" only sometimes.)',
    'Choose the polite form for elders and strangers: ਤੁਸੀਂ, ਆਓ, ਦਿਓ (adding ਜੀ makes it more respectful). With friends you may use ਤੂੰ, ਆ, ਦੇ.',
    'Type in Punjabi (Gurmukhi) with your phone\'s Punjabi keyboard, or use the Gurmukhi letters under the answer box. End a sentence with the danda (।).'
];

module.exports = {
    code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', locale: 'pa-IN',
    words: {
        'vocab-beginner-1': {
            family: 'ਪਰਿਵਾਰ, ਟੱਬਰ',
            mother: 'ਮਾਂ, ਮਾਤਾ',
            father: 'ਪਿਤਾ, ਪਿਓ',
            house: 'ਘਰ, ਮਕਾਨ',
            food: 'ਖਾਣਾ, ਭੋਜਨ',
            happy: 'ਖ਼ੁਸ਼, ਪ੍ਰਸੰਨ',
            big: 'ਵੱਡਾ',
            small: 'ਛੋਟਾ'
        },
        'vocab-beginner-2': {
            book: 'ਕਿਤਾਬ, ਪੁਸਤਕ',
            teacher: 'ਅਧਿਆਪਕ, ਅਧਿਆਪਕਾ',
            student: 'ਵਿਦਿਆਰਥੀ',
            friend: 'ਦੋਸਤ, ਮਿੱਤਰ',
            read: 'ਪੜ੍ਹਨਾ',
            write: 'ਲਿਖਣਾ',
            early: 'ਜਲਦੀ, ਛੇਤੀ',
            easy: 'ਸੌਖਾ, ਆਸਾਨ'
        },
        'vocab-intermediate-1': {
            honest: 'ਇਮਾਨਦਾਰ',
            polite: 'ਨਿਮਰ',
            curious: 'ਉਤਸੁਕ, ਜਗਿਆਸੂ',
            confident: 'ਆਤਮ-ਵਿਸ਼ਵਾਸੀ',
            patient: 'ਧੀਰਜਵਾਨ, ਸਬਰ ਵਾਲਾ',
            grateful: 'ਸ਼ੁਕਰਗੁਜ਼ਾਰ, ਧੰਨਵਾਦੀ',
            anxious: 'ਚਿੰਤਤ, ਫ਼ਿਕਰਮੰਦ',
            generous: 'ਉਦਾਰ, ਖੁੱਲ੍ਹਦਿਲਾ'
        },
        'vocab-intermediate-2': {
            deadline: 'ਆਖ਼ਰੀ ਤਾਰੀਖ਼, ਸਮਾਂ-ਸੀਮਾ',
            improve: 'ਸੁਧਾਰਨਾ, ਸੁਧਾਰ ਕਰਨਾ',
            achieve: 'ਹਾਸਲ ਕਰਨਾ, ਪ੍ਰਾਪਤ ਕਰਨਾ',
            schedule: 'ਸਮਾਂ-ਸਾਰਣੀ',
            opportunity: 'ਮੌਕਾ, ਅਵਸਰ',
            responsible: 'ਜ਼ਿੰਮੇਵਾਰ',
            discuss: 'ਚਰਚਾ ਕਰਨਾ, ਵਿਚਾਰ ਕਰਨਾ',
            result: 'ਨਤੀਜਾ, ਪਰਿਣਾਮ'
        },
        'vocab-advanced-1': {
            negotiate: 'ਗੱਲਬਾਤ ਕਰਨਾ, ਸੌਦੇਬਾਜ਼ੀ ਕਰਨਾ',
            collaborate: 'ਸਹਿਯੋਗ ਕਰਨਾ, ਮਿਲ ਕੇ ਕੰਮ ਕਰਨਾ',
            efficient: 'ਕੁਸ਼ਲ, ਨਿਪੁੰਨ',
            feasible: 'ਸੰਭਵ, ਵਿਹਾਰਕ',
            comprehensive: 'ਵਿਆਪਕ, ਸੰਪੂਰਨ',
            prioritise: 'ਪਹਿਲ ਦੇਣਾ, ਤਰਜੀਹ ਦੇਣਾ',
            ambiguous: 'ਅਸਪਸ਼ਟ, ਦੋ-ਅਰਥੀ',
            persuade: 'ਮਨਾਉਣਾ, ਰਾਜ਼ੀ ਕਰਨਾ'
        },
        'vocab-advanced-2': {
            sustainable: 'ਟਿਕਾਊ, ਸਥਾਈ',
            consequence: 'ਨਤੀਜਾ, ਸਿੱਟਾ',
            perspective: 'ਦ੍ਰਿਸ਼ਟੀਕੋਣ, ਨਜ਼ਰੀਆ',
            inevitable: 'ਅਟੱਲ, ਲਾਜ਼ਮੀ',
            substantial: 'ਕਾਫ਼ੀ, ਜ਼ਿਕਰਯੋਗ',
            advocate: 'ਹਿਮਾਇਤ ਕਰਨਾ, ਵਕਾਲਤ ਕਰਨਾ',
            diverse: 'ਵੰਨ-ਸੁਵੰਨਾ, ਵਿਭਿੰਨ',
            integrity: 'ਇਮਾਨਦਾਰੀ, ਸੱਚਾਈ'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Punjabi has no words for a, an or the (ਇੱਕ means "one"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Punjabi the verb comes last: "ਰਵੀ ਕਿਤਾਬਾਂ ਪੜ੍ਹਦਾ ਹੈ।" In English the verb comes right after the subject.' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Punjabi word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Punjabi.',
            points: [...TO_PUNJABI_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Punjabi verb ending to choose the English tense.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Punjabi. Use the polite form for requests: ਦਿਓ, ਬੋਲੋ, ਕਰੋ, often with ਕਿਰਪਾ ਕਰਕੇ (please).',
            points: [...TO_PUNJABI_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Punjabi. Passive forms such as ਕੀਤਾ ਜਾਵੇਗਾ (will be done) and ਕੀਤਾ ਗਿਆ ਹੈ (has been done) are common in notices.',
            points: [...TO_PUNJABI_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'ਪਾਣੀ', explanation: 'ਪਾਣੀ means water.' },
            i2: { source: 'ਕਿਤਾਬ', explanation: 'ਕਿਤਾਬ (or ਪੁਸਤਕ) means book.' },
            i3: { source: 'ਮੇਰਾ ਨਾਮ ਰਾਣੀ ਹੈ।', explanation: 'ਮੇਰਾ = my, ਨਾਮ = name, ਹੈ = is. In English "is" comes before the name, not at the end.' },
            i4: { source: 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?', explanation: 'This is the common polite greeting: ਕਿਵੇਂ = how, ਹੋ = are. English puts "are" right after "How".' },
            i5: { source: 'ਮੈਂ ਠੀਕ ਹਾਂ।', explanation: 'ਠੀਕ = fine or well, ਹਾਂ = am. In English "am" comes right after "I".' },
            i6: { source: 'ਇਹ ਮੇਰਾ ਘਰ ਹੈ।', explanation: 'ਇਹ = this, ਘਰ = house or home. The verb ਹੈ (is) moves to after "This".' },
            q1: { source: 'ਮੈਂ ਸਕੂਲ ਜਾਂਦਾ ਹਾਂ।', explanation: 'ਜਾਂਦਾ ਹਾਂ means "I go" (a girl says ਜਾਂਦੀ ਹਾਂ). The verb moves to after "I", and English adds "to" before school.' },
            q2: { source: 'ਉਹ ਮੇਰੀ ਛੋਟੀ ਭੈਣ ਹੈ।', explanation: 'ਛੋਟੀ ਭੈਣ is a younger sister (ਵੱਡੀ ਭੈਣ is an elder sister). ਉਹ can be "he" or "she"; here it is "she".' },
            q3: { source: 'ਕਿਰਪਾ ਕਰਕੇ ਦਰਵਾਜ਼ਾ ਬੰਦ ਕਰੋ।', explanation: 'ਕਿਰਪਾ ਕਰਕੇ = please, ਦਰਵਾਜ਼ਾ = door, ਬੰਦ ਕਰੋ = close (polite).' },
            q4: { source: 'ਧੰਨਵਾਦ।', explanation: 'ਧੰਨਵਾਦ is the polite way to say thank you; ਸ਼ੁਕਰੀਆ is also common.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'ਦੋਸਤ', accepted: ['ਮਿੱਤਰ', 'ਸਹੇਲੀ', 'ਯਾਰ'], explanation: 'Friend is ਦੋਸਤ (or ਮਿੱਤਰ). A girl\'s female friend is called ਸਹੇਲੀ; ਯਾਰ is informal.' },
            i2: { model: 'ਸਕੂਲ', accepted: ['ਵਿਦਿਆਲਾ', 'ਪਾਠਸ਼ਾਲਾ'], explanation: 'School is ਸਕੂਲ; the formal Punjabi word is ਵਿਦਿਆਲਾ.' },
            i3: { model: 'ਸ਼ੁਭ ਸਵੇਰ।', accepted: ['ਸ਼ੁੱਭ ਸਵੇਰ।', 'ਸ਼ੁਭ ਪ੍ਰਭਾਤ।'], explanation: 'ਸ਼ੁਭ ਸਵੇਰ is "good morning" (ਸਵੇਰ = morning). ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ is a greeting for any time of day, not only the morning.' },
            i4: { model: 'ਮੈਂ ਵਿਦਿਆਰਥੀ ਹਾਂ।', accepted: ['ਮੈਂ ਇੱਕ ਵਿਦਿਆਰਥੀ ਹਾਂ।', 'ਮੈਂ ਵਿਦਿਆਰਥਣ ਹਾਂ।', 'ਮੈਂ ਇੱਕ ਵਿਦਿਆਰਥਣ ਹਾਂ।'], explanation: 'ਹਾਂ = am, and it comes at the end. Punjabi needs no word for "a" (ਇੱਕ is optional). A girl may say ਵਿਦਿਆਰਥਣ.' },
            i5: { model: 'ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?', accepted: ['ਤੇਰਾ ਨਾਮ ਕੀ ਹੈ?', 'ਤੁਹਾਡਾ ਨਾਂ ਕੀ ਹੈ?', 'ਤੇਰਾ ਨਾਂ ਕੀ ਹੈ?'], explanation: 'ਤੁਹਾਡਾ is polite; with a friend you can say ਤੇਰਾ. ਕੀ = what; ਨਾਮ and ਨਾਂ both mean name.' },
            i6: { model: 'ਖਾਣਾ ਸੁਆਦੀ ਹੈ।', accepted: ['ਖਾਣਾ ਸਵਾਦੀ ਹੈ।', 'ਭੋਜਨ ਸੁਆਦੀ ਹੈ।', 'ਖਾਣਾ ਸੁਆਦਲਾ ਹੈ।', 'ਖਾਣਾ ਸੁਆਦ ਬਣਿਆ ਹੈ।'], explanation: 'ਸੁਆਦ = taste; ਸੁਆਦੀ = tasty. "Is" (ਹੈ) comes at the end.' },
            q1: { model: 'ਬੱਸ ਅੱਡਾ ਕਿੱਥੇ ਹੈ?', accepted: ['ਬੱਸ ਸਟੈਂਡ ਕਿੱਥੇ ਹੈ?', 'ਬੱਸ ਅੱਡਾ ਕਿਥੇ ਹੈ?'], explanation: 'ਕਿੱਥੇ = where; ਕਿੱਥੇ ਹੈ = where is (it). ਬੱਸ ਅੱਡਾ is the Punjabi word for bus stand.' },
            q2: { model: 'ਮੈਨੂੰ ਅੰਬ ਪਸੰਦ ਹਨ।', accepted: ['ਮੈਨੂੰ ਅੰਬ ਪਸੰਦ ਹੈ।', 'ਮੈਨੂੰ ਅੰਬ ਚੰਗੇ ਲੱਗਦੇ ਹਨ।', 'ਮੈਨੂੰ ਅੰਬ ਚੰਗੇ ਲਗਦੇ ਹਨ।'], explanation: 'Punjabi says "to me, mangoes are liked": ਮੈਨੂੰ … ਪਸੰਦ ਹਨ.' },
            q3: { model: 'ਇੱਥੇ ਆਓ।', accepted: ['ਇੱਥੇ ਆ।', 'ਇਧਰ ਆਓ।', 'ਇਧਰ ਆ।', 'ਇੱਥੇ ਆਓ ਜੀ।'], explanation: 'ਆਓ is polite; ਆ is used with friends and children. Adding ਜੀ makes it more respectful.' },
            q4: { model: 'ਮੀਂਹ ਪੈ ਰਿਹਾ ਹੈ।', accepted: ['ਬਾਰਿਸ਼ ਹੋ ਰਹੀ ਹੈ।', 'ਮੀਂਹ ਵਰ੍ਹ ਰਿਹਾ ਹੈ।', 'ਬਰਸਾਤ ਹੋ ਰਹੀ ਹੈ।'], explanation: 'Punjabi says "rain is falling": ਮੀਂਹ ਪੈ ਰਿਹਾ ਹੈ. ਰਿਹਾ ਹੈ shows that it is going on now.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'ਮੈਂ ਕੱਲ੍ਹ ਫ਼ਿਲਮ ਦੇਖੀ।', explanation: 'ਦੇਖੀ is past tense: watched (or saw). ਕੱਲ੍ਹ means yesterday or tomorrow; the past tense tells you it is yesterday.' },
            i2: { source: 'ਉਹ ਹਰ ਸਵੇਰ ਦੌੜਦਾ ਹੈ।', explanation: 'A habit takes the simple present: ਦੌੜਦਾ ਹੈ = runs. ਦੌੜਦਾ shows the runner is male, so ਉਹ is "he".' },
            i3: { source: 'ਅਸੀਂ ਕੱਲ੍ਹ ਮੈਸੂਰ ਜਾਵਾਂਗੇ।', explanation: 'ਜਾਵਾਂਗੇ is the future: will go. So ਕੱਲ੍ਹ here means tomorrow.' },
            i4: { source: 'ਉਹ ਕਿਤਾਬ ਪੜ੍ਹ ਰਹੀ ਹੈ।', explanation: 'ਪੜ੍ਹ ਰਹੀ ਹੈ shows an action happening now: is reading. ਰਹੀ shows the reader is female, so ਉਹ is "she".' },
            i5: { source: 'ਬੱਚੇ ਮੈਦਾਨ ਵਿੱਚ ਖੇਡ ਰਹੇ ਹਨ।', explanation: 'ਮੈਦਾਨ = ground or field; ਵਿੱਚ = in; ਖੇਡ ਰਹੇ ਹਨ = are playing.' },
            i6: { source: 'ਕੀ ਤੁਸੀਂ ਖਾਣਾ ਖਾ ਲਿਆ?', explanation: 'A polite question about eating; ਕੀ at the start makes a yes/no question. "Have you eaten?" is just as natural.' },
            q1: { source: 'ਮੈਨੂੰ ਅੰਗਰੇਜ਼ੀ ਬੋਲਣੀ ਪਸੰਦ ਹੈ।', explanation: 'ਮੈਨੂੰ … ਪਸੰਦ ਹੈ = I like; ਬੋਲਣੀ = to speak (ਬੋਲਣਾ, made feminine to match ਅੰਗਰੇਜ਼ੀ).' },
            q2: { source: 'ਉਹ ਦੋ ਸਾਲਾਂ ਤੋਂ ਬੈਂਗਲੁਰੂ ਵਿੱਚ ਰਹਿ ਰਹੇ ਹਨ।', explanation: 'ਤੋਂ with a length of time (ਦੋ ਸਾਲਾਂ ਤੋਂ) and an ongoing action (ਰਹਿ ਰਹੇ ਹਨ) needs the present perfect continuous. ਉਹ … ਰਹੇ ਹਨ can be "they" or a respectful "he".' },
            q3: { source: 'ਰੇਲਗੱਡੀ ਸਮੇਂ ਸਿਰ ਆਈ।', explanation: 'ਸਮੇਂ ਸਿਰ = on time; ਆਈ = came (ਰੇਲਗੱਡੀ is feminine in Punjabi, so ਆਈ, not ਆਇਆ).' },
            q4: { source: 'ਕਿਰਪਾ ਕਰਕੇ ਹੌਲੀ-ਹੌਲੀ ਬੋਲੋ।', explanation: 'ਹੌਲੀ-ਹੌਲੀ = slowly; ਬੋਲੋ is the polite form of "speak".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਥੋੜ੍ਹਾ ਪਾਣੀ ਦਿਓ।', accepted: ['ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਥੋੜ੍ਹਾ ਪਾਣੀ ਦੇ।', 'ਮੈਨੂੰ ਥੋੜ੍ਹਾ ਪਾਣੀ ਦਿਓ।', 'ਕਿਰਪਾ ਕਰਕੇ ਥੋੜ੍ਹਾ ਪਾਣੀ ਦਿਓ।', 'ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਥੋੜਾ ਪਾਣੀ ਦਿਓ।'], explanation: 'ਦਿਓ is the polite form of "give" (ਦੇ with friends); ਥੋੜ੍ਹਾ = some, a little.' },
            i2: { model: 'ਜਮਾਤ ਨੌਂ ਵਜੇ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ।', accepted: ['ਕਲਾਸ ਨੌਂ ਵਜੇ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ।', 'ਜਮਾਤ 9 ਵਜੇ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ।', 'ਕਲਾਸ 9 ਵਜੇ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ।', 'ਜਮਾਤ ਨੌ ਵਜੇ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ।'], explanation: 'ਨੌਂ ਵਜੇ = at nine o\'clock; ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ = starts (ਹੁੰਦੀ, because ਜਮਾਤ is feminine).' },
            i3: { model: 'ਮੈਂ ਆਪਣੀ ਕਿਤਾਬ ਘਰ ਭੁੱਲ ਗਿਆ।', accepted: ['ਮੈਂ ਆਪਣੀ ਕਿਤਾਬ ਘਰ ਭੁੱਲ ਗਈ।', 'ਮੈਂ ਆਪਣੀ ਕਿਤਾਬ ਘਰ ਭੁੱਲ ਆਇਆ।', 'ਮੈਂ ਆਪਣੀ ਕਿਤਾਬ ਘਰ ਭੁੱਲ ਆਈ।', 'ਮੈਂ ਆਪਣੀ ਕਿਤਾਬ ਘਰ ਹੀ ਭੁੱਲ ਗਿਆ।'], explanation: 'ਭੁੱਲ ਗਿਆ = forgot (a girl says ਭੁੱਲ ਗਈ). For your own thing Punjabi says ਆਪਣੀ, not ਮੇਰੀ: ਆਪਣੀ ਕਿਤਾਬ = my book.' },
            i4: { model: 'ਇਸ ਦੀ ਕੀਮਤ ਕਿੰਨੀ ਹੈ?', accepted: ['ਇਹ ਕਿੰਨੇ ਦਾ ਹੈ?', 'ਇਹ ਕਿੰਨੇ ਦੀ ਹੈ?', 'ਇਸਦੀ ਕੀਮਤ ਕਿੰਨੀ ਹੈ?', 'ਇਸ ਦਾ ਮੁੱਲ ਕਿੰਨਾ ਹੈ?'], explanation: 'ਕੀਮਤ = price; ਕਿੰਨੀ = how much (ਕਿੰਨਾ or ਕਿੰਨੀ, to match the noun). ਇਹ ਕਿੰਨੇ ਦਾ ਹੈ? is the everyday way to ask.' },
            i5: { model: 'ਮੇਰੀ ਪ੍ਰੀਖਿਆ ਅਗਲੇ ਹਫ਼ਤੇ ਹੈ।', accepted: ['ਅਗਲੇ ਹਫ਼ਤੇ ਮੇਰੀ ਪ੍ਰੀਖਿਆ ਹੈ।', 'ਮੇਰਾ ਇਮਤਿਹਾਨ ਅਗਲੇ ਹਫ਼ਤੇ ਹੈ।', 'ਅਗਲੇ ਹਫ਼ਤੇ ਮੇਰਾ ਇਮਤਿਹਾਨ ਹੈ।'], explanation: 'ਅਗਲੇ ਹਫ਼ਤੇ = next week; ਪ੍ਰੀਖਿਆ (or ਇਮਤਿਹਾਨ) = exam.' },
            i6: { model: 'ਕੀ ਤੁਸੀਂ ਮੇਰੀ ਮਦਦ ਕਰ ਸਕਦੇ ਹੋ?', accepted: ['ਕੀ ਤੁਸੀਂ ਮੇਰੀ ਸਹਾਇਤਾ ਕਰ ਸਕਦੇ ਹੋ?', 'ਕੀ ਤੂੰ ਮੇਰੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹੈਂ?', 'ਤੁਸੀਂ ਮੇਰੀ ਮਦਦ ਕਰ ਸਕਦੇ ਹੋ?', 'ਕੀ ਤੁਸੀਂ ਮੇਰੀ ਮਦਦ ਕਰ ਸਕਦੀ ਹੋ?'], explanation: 'ਮਦਦ ਕਰਨਾ = to help; ਕਰ ਸਕਦੇ ਹੋ = can (you) do? Punjabi says "do my help": ਮੇਰੀ ਮਦਦ.' },
            q1: { model: 'ਅਸੀਂ ਲਾਇਬ੍ਰੇਰੀ ਜਾ ਰਹੇ ਹਾਂ।', accepted: ['ਅਸੀਂ ਪੁਸਤਕਾਲੇ ਜਾ ਰਹੇ ਹਾਂ।', 'ਅਸੀਂ ਲਾਇਬਰੇਰੀ ਜਾ ਰਹੇ ਹਾਂ।', 'ਅਸੀਂ ਲਾਇਬ੍ਰੇਰੀ ਜਾ ਰਹੀਆਂ ਹਾਂ।'], explanation: 'ਲਾਇਬ੍ਰੇਰੀ (formal: ਪੁਸਤਕਾਲਾ) = library; ਜਾ ਰਹੇ ਹਾਂ = are going. Punjabi needs no word for "to" here.' },
            q2: { model: 'ਉਹ ਕੰਨੜ ਬਹੁਤ ਵਧੀਆ ਬੋਲਦੀ ਹੈ।', accepted: ['ਉਹ ਬਹੁਤ ਵਧੀਆ ਕੰਨੜ ਬੋਲਦੀ ਹੈ।', 'ਉਹ ਕੰਨੜ ਬਹੁਤ ਚੰਗੀ ਤਰ੍ਹਾਂ ਬੋਲਦੀ ਹੈ।', 'ਉਹ ਕੰਨੜ ਬਹੁਤ ਵਧੀਆ ਬੋਲਦੇ ਹਨ।'], explanation: 'ਬਹੁਤ ਵਧੀਆ (or ਬਹੁਤ ਚੰਗੀ ਤਰ੍ਹਾਂ) = very well; ਬੋਲਦੀ ਹੈ = speaks (ਬੋਲਦੀ, because "she" is the subject).' },
            q3: { model: 'ਪਾਣੀ ਬਰਬਾਦ ਨਾ ਕਰੋ।', accepted: ['ਪਾਣੀ ਦੀ ਬਰਬਾਦੀ ਨਾ ਕਰੋ।', 'ਪਾਣੀ ਬਰਬਾਦ ਨਾ ਕਰ।', 'ਪਾਣੀ ਵਿਅਰਥ ਨਾ ਗੁਆਓ।', 'ਪਾਣੀ ਅਜਾਈਂ ਨਾ ਗੁਆਓ।'], explanation: 'ਨਾ ਕਰੋ = do not (polite); with a friend, ਨਾ ਕਰ. ਬਰਬਾਦ ਕਰਨਾ = to waste.' },
            q4: { model: 'ਦੁਕਾਨ ਦਸ ਵਜੇ ਖੁੱਲ੍ਹਦੀ ਹੈ।', accepted: ['ਦੁਕਾਨ 10 ਵਜੇ ਖੁੱਲ੍ਹਦੀ ਹੈ।', 'ਦੁਕਾਨ ਦਸ ਵਜੇ ਖੁੱਲਦੀ ਹੈ।'], explanation: 'ਖੁੱਲ੍ਹਦੀ ਹੈ = opens (ਖੁੱਲ੍ਹਦੀ, because ਦੁਕਾਨ is feminine); ਦਸ ਵਜੇ = at ten o\'clock.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'ਮੀਟਿੰਗ ਸੋਮਵਾਰ ਤੱਕ ਮੁਲਤਵੀ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ।', explanation: 'ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ is passive: "has been …". ਮੁਲਤਵੀ ਕਰਨਾ = postpone.' },
            i2: { source: 'ਕਿਰਪਾ ਕਰਕੇ ਰਿਪੋਰਟ ਸ਼ੁੱਕਰਵਾਰ ਤੱਕ ਭੇਜ ਦਿਓ।', explanation: 'ਤੱਕ with a day means "by" (not later than).' },
            i3: { source: 'ਦੇਰ ਨਾਲ ਜਵਾਬ ਦੇਣ ਲਈ ਮੁਆਫ਼ ਕਰਨਾ।', explanation: 'A common line in emails. ਮੁਆਫ਼ ਕਰਨਾ = sorry (literally "please forgive"); ਦੇਰ ਨਾਲ = late.' },
            i4: { source: 'ਸਾਡੀ ਟੀਮ ਨੇ ਪ੍ਰੋਜੈਕਟ ਸਮੇਂ ਸਿਰ ਪੂਰਾ ਕੀਤਾ।', explanation: 'ਪੂਰਾ ਕੀਤਾ = completed; ਸਮੇਂ ਸਿਰ = on time. ਨੇ marks the doer with a past verb.' },
            i5: { source: 'ਮੈਂ ਪਿਛਲੇ ਸਾਲ ਆਪਣੀ ਡਿਗਰੀ ਪੂਰੀ ਕੀਤੀ। ਹੁਣ ਮੈਂ ਇੱਕ ਸਾਫ਼ਟਵੇਅਰ ਕੰਪਨੀ ਵਿੱਚ ਨੌਕਰੀ ਲੱਭ ਰਿਹਾ ਹਾਂ। ਮੈਨੂੰ ਨਵੀਆਂ ਚੀਜ਼ਾਂ ਸਿੱਖਣ ਵਿੱਚ ਬਹੁਤ ਦਿਲਚਸਪੀ ਹੈ।', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'ਤੁਹਾਡੇ ਸਹਿਯੋਗ ਲਈ ਧੰਨਵਾਦ।', explanation: 'ਸਹਿਯੋਗ = cooperation; ਲਈ = for.' },
            q1: { source: 'ਇਸ ਸਮੱਸਿਆ ਨੂੰ ਜਲਦੀ ਤੋਂ ਜਲਦੀ ਹੱਲ ਕੀਤਾ ਜਾਵੇਗਾ।', explanation: 'ਕੀਤਾ ਜਾਵੇਗਾ is the future passive: "will be …". ਜਲਦੀ ਤੋਂ ਜਲਦੀ = as soon as possible.' },
            q2: { source: 'ਮੈਂ ਇਸ ਅਹੁਦੇ ਲਈ ਅਰਜ਼ੀ ਦੇਣੀ ਚਾਹੁੰਦਾ ਹਾਂ।', explanation: 'ਅਹੁਦਾ (here ਅਹੁਦੇ) = post or position; ਅਰਜ਼ੀ ਦੇਣੀ = apply. ਚਾਹੁੰਦਾ ਹਾਂ (I want) is said politely as "I would like".' },
            q3: { source: 'ਉਨ੍ਹਾਂ ਨੇ ਮੀਟਿੰਗ ਵਿੱਚ ਇੱਕ ਚੰਗਾ ਸੁਝਾਅ ਦਿੱਤਾ।', explanation: 'ਉਨ੍ਹਾਂ ਨੇ can be "he" or "she" (said with respect) or "they".' },
            q4: { source: 'ਗਾਹਕਾਂ ਦੀ ਸੰਤੁਸ਼ਟੀ ਹੀ ਸਾਡੀ ਪਹਿਲੀ ਤਰਜੀਹ ਹੈ।', explanation: 'ਸੰਤੁਸ਼ਟੀ = satisfaction; ਤਰਜੀਹ = priority. ਹੀ adds emphasis.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'ਕੰਪਨੀ ਨੇ ਇੱਕ ਨਵੀਂ ਨੀਤੀ ਦਾ ਐਲਾਨ ਕੀਤਾ ਹੈ।', accepted: ['ਕੰਪਨੀ ਨੇ ਨਵੀਂ ਨੀਤੀ ਦਾ ਐਲਾਨ ਕੀਤਾ ਹੈ।', 'ਕੰਪਨੀ ਨੇ ਇੱਕ ਨਵੀਂ ਨੀਤੀ ਐਲਾਨੀ ਹੈ।', 'ਕੰਪਨੀ ਨੇ ਨਵੀਂ ਨੀਤੀ ਐਲਾਨੀ ਹੈ।', 'ਕੰਪਨੀ ਨੇ ਨਵੀਂ ਨੀਤੀ ਦੀ ਘੋਸ਼ਣਾ ਕੀਤੀ ਹੈ।'], explanation: 'ਨੀਤੀ = policy; ਐਲਾਨ ਕੀਤਾ ਹੈ = has announced. ਨੇ marks the doer with a past verb.' },
            i2: { model: 'ਸਿੱਖਿਆ ਸਫਲਤਾ ਦੀ ਕੁੰਜੀ ਹੈ।', accepted: ['ਸਿੱਖਿਆ ਹੀ ਸਫਲਤਾ ਦੀ ਕੁੰਜੀ ਹੈ।', 'ਵਿੱਦਿਆ ਸਫਲਤਾ ਦੀ ਕੁੰਜੀ ਹੈ।', 'ਸਿੱਖਿਆ ਕਾਮਯਾਬੀ ਦੀ ਕੁੰਜੀ ਹੈ।'], explanation: 'ਸਫਲਤਾ = success; ਕੁੰਜੀ = key. "The key to success" becomes ਸਫਲਤਾ ਦੀ ਕੁੰਜੀ ("success\'s key").' },
            i3: { model: 'ਜੇਕਰ ਕੋਈ ਤਬਦੀਲੀ ਹੋਵੇ, ਤਾਂ ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਸੂਚਿਤ ਕਰੋ।', accepted: ['ਜੇ ਕੋਈ ਤਬਦੀਲੀ ਹੋਵੇ, ਤਾਂ ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਦੱਸੋ।', 'ਜੇਕਰ ਕੋਈ ਬਦਲਾਅ ਹੋਵੇ, ਤਾਂ ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਸੂਚਿਤ ਕਰੋ।', 'ਜੇਕਰ ਕੋਈ ਤਬਦੀਲੀ ਹੋਵੇ ਤਾਂ ਕਿਰਪਾ ਕਰਕੇ ਮੈਨੂੰ ਦੱਸਣਾ।'], explanation: 'In Punjabi the "if" part (ਜੇਕਰ or ਜੇ … ਤਾਂ) comes first. ਸੂਚਿਤ ਕਰਨਾ = to inform; ਦੱਸਣਾ = to tell.' },
            i4: { model: 'ਸਾਨੂੰ ਵਾਤਾਵਰਨ ਦੀ ਰੱਖਿਆ ਕਰਨੀ ਚਾਹੀਦੀ ਹੈ।', accepted: ['ਸਾਨੂੰ ਵਾਤਾਵਰਣ ਦੀ ਰੱਖਿਆ ਕਰਨੀ ਚਾਹੀਦੀ ਹੈ।', 'ਸਾਨੂੰ ਵਾਤਾਵਰਨ ਦੀ ਸੰਭਾਲ ਕਰਨੀ ਚਾਹੀਦੀ ਹੈ।', 'ਸਾਨੂੰ ਵਾਤਾਵਰਨ ਨੂੰ ਬਚਾਉਣਾ ਚਾਹੀਦਾ ਹੈ।', 'ਸਾਨੂੰ ਵਾਤਾਵਰਨ ਦੀ ਸੁਰੱਖਿਆ ਕਰਨੀ ਚਾਹੀਦੀ ਹੈ।'], explanation: 'ਚਾਹੀਦਾ = should. Punjabi starts with ਸਾਨੂੰ ("to us"): ਸਾਨੂੰ … ਕਰਨੀ ਚਾਹੀਦੀ ਹੈ = we should do ….' },
            i5: { model: 'ਸਾਡੇ ਕਾਲਜ ਨੇ ਪਿਛਲੇ ਹਫ਼ਤੇ ਇੱਕ ਖ਼ੂਨਦਾਨ ਕੈਂਪ ਲਗਾਇਆ। ਬਹੁਤ ਸਾਰੇ ਵਿਦਿਆਰਥੀਆਂ ਅਤੇ ਅਧਿਆਪਕਾਂ ਨੇ ਇਸ ਵਿੱਚ ਹਿੱਸਾ ਲਿਆ। ਡਾਕਟਰਾਂ ਨੇ ਸਾਰਿਆਂ ਦਾ ਉਨ੍ਹਾਂ ਦੇ ਸਹਿਯੋਗ ਲਈ ਧੰਨਵਾਦ ਕੀਤਾ।', accepted: [], explanation: 'ਖ਼ੂਨਦਾਨ ਕੈਂਪ = blood donation camp; ਹਿੱਸਾ ਲੈਣਾ = take part. Compare your sentences with the model.' },
            i6: { model: 'ਮੈਂ ਦੋ ਦਿਨਾਂ ਦੀ ਛੁੱਟੀ ਦੀ ਬੇਨਤੀ ਕਰਨ ਲਈ ਲਿਖ ਰਿਹਾ ਹਾਂ।', accepted: ['ਮੈਂ ਦੋ ਦਿਨਾਂ ਦੀ ਛੁੱਟੀ ਦੀ ਬੇਨਤੀ ਕਰਨ ਲਈ ਲਿਖ ਰਹੀ ਹਾਂ।', 'ਮੈਂ ਦੋ ਦਿਨਾਂ ਦੀ ਛੁੱਟੀ ਮੰਗਣ ਲਈ ਲਿਖ ਰਿਹਾ ਹਾਂ।', 'ਮੈਂ ਦੋ ਦਿਨਾਂ ਦੀ ਛੁੱਟੀ ਮੰਗਣ ਲਈ ਲਿਖ ਰਹੀ ਹਾਂ।', 'ਮੈਂ ਦੋ ਦਿਨ ਦੀ ਛੁੱਟੀ ਦੀ ਬੇਨਤੀ ਕਰਨ ਲਈ ਲਿਖ ਰਿਹਾ ਹਾਂ।'], explanation: 'ਛੁੱਟੀ = leave; ਬੇਨਤੀ ਕਰਨਾ = request. A woman writes ਲਿਖ ਰਹੀ ਹਾਂ.' },
            q1: { model: 'ਸਖ਼ਤ ਮਿਹਨਤ ਦਾ ਫਲ ਹਮੇਸ਼ਾ ਮਿਲਦਾ ਹੈ।', accepted: ['ਮਿਹਨਤ ਦਾ ਫਲ ਹਮੇਸ਼ਾ ਮਿਲਦਾ ਹੈ।', 'ਸਖ਼ਤ ਮਿਹਨਤ ਹਮੇਸ਼ਾ ਰੰਗ ਲਿਆਉਂਦੀ ਹੈ।', 'ਮਿਹਨਤ ਦਾ ਫਲ ਹਮੇਸ਼ਾ ਮਿੱਠਾ ਹੁੰਦਾ ਹੈ।'], explanation: '"Pays off" means "gives a result": ਫਲ ਮਿਲਦਾ ਹੈ. ਮਿਹਨਤ ਰੰਗ ਲਿਆਉਂਦੀ ਹੈ is another common way to say it.' },
            q2: { model: 'ਨਤੀਜੇ ਕੱਲ੍ਹ ਐਲਾਨੇ ਜਾਣਗੇ।', accepted: ['ਕੱਲ੍ਹ ਨਤੀਜੇ ਐਲਾਨੇ ਜਾਣਗੇ।', 'ਨਤੀਜਿਆਂ ਦਾ ਐਲਾਨ ਕੱਲ੍ਹ ਕੀਤਾ ਜਾਵੇਗਾ।', 'ਨਤੀਜੇ ਕੱਲ੍ਹ ਘੋਸ਼ਿਤ ਕੀਤੇ ਜਾਣਗੇ।', 'ਨਤੀਜਾ ਕੱਲ੍ਹ ਐਲਾਨਿਆ ਜਾਵੇਗਾ।'], explanation: '"Will be announced" is the future passive: ਐਲਾਨੇ ਜਾਣਗੇ. Here ਕੱਲ੍ਹ means tomorrow.' },
            q3: { model: 'ਤੁਹਾਡੇ ਤੁਰੰਤ ਜਵਾਬ ਲਈ ਧੰਨਵਾਦ।', accepted: ['ਤੁਹਾਡੇ ਛੇਤੀ ਜਵਾਬ ਲਈ ਧੰਨਵਾਦ।', 'ਤੁਹਾਡੇ ਜਲਦੀ ਜਵਾਬ ਲਈ ਧੰਨਵਾਦ।', 'ਤੁਹਾਡੀ ਤੁਰੰਤ ਪ੍ਰਤੀਕਿਰਿਆ ਲਈ ਧੰਨਵਾਦ।', 'ਜਲਦੀ ਜਵਾਬ ਦੇਣ ਲਈ ਤੁਹਾਡਾ ਧੰਨਵਾਦ।'], explanation: 'ਤੁਰੰਤ = quick, prompt; ਜਵਾਬ = response or reply.' },
            q4: { model: 'ਸੁਰੱਖਿਆ ਸਾਰਿਆਂ ਦੀ ਜ਼ਿੰਮੇਵਾਰੀ ਹੈ।', accepted: ['ਸੁਰੱਖਿਆ ਹਰ ਕਿਸੇ ਦੀ ਜ਼ਿੰਮੇਵਾਰੀ ਹੈ।', 'ਸੁਰੱਖਿਆ ਸਭ ਦੀ ਜ਼ਿੰਮੇਵਾਰੀ ਹੈ।', 'ਸੁਰੱਖਿਆ ਸਾਰਿਆਂ ਦੀ ਜ਼ਿੰਮੇਦਾਰੀ ਹੈ।'], explanation: 'ਸੁਰੱਖਿਆ = safety; ਸਾਰਿਆਂ ਦੀ = everyone\'s; ਜ਼ਿੰਮੇਵਾਰੀ = responsibility.' }
        }
    },
    placement: {
        b4: { prompt: '"ਕਿਤਾਬ" in English is…', explanation: 'ਕਿਤਾਬ means book.' },
        a5: { prompt: '"ਮੀਟਿੰਗ ਮੁਲਤਵੀ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ" best translates as…', explanation: 'ਮੁਲਤਵੀ ਕਰਨਾ means postpone, and ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ is passive: "has been".' }
    }
};
