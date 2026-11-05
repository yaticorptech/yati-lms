/**
 * Linguistic Ability — the Letters unit (asked 2026-10-31: "from the basics, like the varnamala of every language,
 * like ABCD in English: start from scratch"): the first unit of Beginner, in every course — a lesson for each group
 * of the language's letters (content/letters.js). Each lesson shows its letters one by one (the letter, its sound in
 * English letters, the device reading it) — since 2026-10-31 on the Letters chart only, not again in the lesson —
 * matches each letter to its sound, then a quiz — how a letter sounds, which
 * letter makes a sound, and a letter heard — asked in the student's own language.
 *
 * Kept like a review: a stub per course and group (seedKey "letters-beginner-1", "hi:letters-beginner-1"), made
 * whole when it is served. Its unit (order 0) comes before the topics' units (units.js).
 */
const { groupsOf, kagunita } = require('./content/letters');
const { infoOf } = require('./languages');
const courses = require('./courses');
const { shuffle, seeded } = require('./vocabQuiz');

const SUMMARY = 'Each letter, its sound, and the letter heard.';

/** Every course's Letters lessons, as stubs. */
const stubs = () => courses.courseCodes().flatMap((code) => groupsOf(code).map((g, i) => ({
    course: code === 'en' ? null : code, level: 'beginner', status: 'published', updatedBy: 'Course content', direction: null, learn: {},
    seedKey: `${code === 'en' ? '' : `${code}:`}letters-beginner-${i + 1}`, review: 'letters', module: 'vocabulary', order: 0,
    title: g.title.startsWith('Letters') ? g.title : `Letters: ${g.title}`, summary: SUMMARY
})));
/** A Letters lesson's place in its unit: its group's number. */
const placeOf = (l) => Number(String(l.seedKey || '').split('-').pop()) || 0;

/* ── The questions, in the student's own language ─────────────────────── */

/** The intro of a Letters lesson whose letters each have a word (English, 2026-10-31), in the student's language. */
const INTRO_WORDS = {
    en: (l) => `The letters of ${l}, each with a word that starts with it — A for apple. Tap a card to hear it, then a short quiz.`,
    kn: (l) => `${l} ಅಕ್ಷರಗಳು: ಪ್ರತಿ ಅಕ್ಷರದಿಂದ ಆರಂಭವಾಗುವ ಒಂದು ಪದ — A for apple. ಕೇಳಲು ಕಾರ್ಡ್ ಒತ್ತಿ, ನಂತರ ಒಂದು ಚಿಕ್ಕ ರಸಪ್ರಶ್ನೆ.`,
    hi: (l) => `${l} के अक्षर: हर अक्षर से शुरू होने वाला एक शब्द — A for apple. सुनने के लिए कार्ड दबाइए, फिर एक छोटा क्विज़।`,
    ta: (l) => `${l} எழுத்துகள்: ஒவ்வொரு எழுத்திலும் தொடங்கும் ஒரு சொல் — A for apple. கேட்க அட்டையைத் தொடுங்கள், பிறகு ஒரு சிறிய வினாடி வினா.`,
    te: (l) => `${l} అక్షరాలు: ప్రతి అక్షరంతో మొదలయ్యే ఒక పదం — A for apple. వినడానికి కార్డ్‌ను నొక్కండి, తర్వాత ఒక చిన్న క్విజ్.`,
    ml: (l) => `${l} അക്ഷരങ്ങൾ: ഓരോ അക്ഷരത്തിലും തുടങ്ങുന്ന ഒരു വാക്ക് — A for apple. കേൾക്കാൻ കാർഡിൽ തൊടുക, പിന്നെ ഒരു ചെറിയ ക്വിസ്.`,
    mr: (l) => `${l} ची अक्षरे: प्रत्येक अक्षराने सुरू होणारा एक शब्द — A for apple. ऐकण्यासाठी कार्ड दाबा, मग एक छोटी प्रश्नमंजुषा.`,
    bn: (l) => `${l}-এর অক্ষর: প্রতিটি অক্ষর দিয়ে শুরু হওয়া একটি শব্দ — A for apple. শুনতে কার্ডে চাপুন, তারপর একটি ছোট কুইজ।`,
    gu: (l) => `${l}ના અક્ષરો: દરેક અક્ષરથી શરૂ થતો એક શબ્દ — A for apple. સાંભળવા કાર્ડ દબાવો, પછી એક નાની ક્વિઝ.`,
    pa: (l) => `${l} ਦੇ ਅੱਖਰ: ਹਰ ਅੱਖਰ ਨਾਲ ਸ਼ੁਰੂ ਹੋਣ ਵਾਲਾ ਇੱਕ ਸ਼ਬਦ — A for apple. ਸੁਣਨ ਲਈ ਕਾਰਡ ਦਬਾਓ, ਫਿਰ ਇੱਕ ਛੋਟਾ ਕੁਇਜ਼।`,
    or: (l) => `${l} ଅକ୍ଷର: ପ୍ରତ୍ୟେକ ଅକ୍ଷରରୁ ଆରମ୍ଭ ହେଉଥିବା ଏକ ଶବ୍ଦ — A for apple. ଶୁଣିବାକୁ କାର୍ଡ ଦବାନ୍ତୁ, ତାପରେ ଏକ ଛୋଟ କୁଇଜ୍।`,
    ur: (l) => `${l} کے حروف: ہر حرف سے شروع ہونے والا ایک لفظ — A for apple۔ سننے کے لیے کارڈ دبائیے، پھر ایک چھوٹا کوئز۔`,
    es: (l) => `Las letras (${l}): cada una con una palabra que empieza por ella — A for apple. Toca una tarjeta para oírla y luego un pequeño examen.`,
    fr: (l) => `Les lettres (${l}) : chacune avec un mot qui commence par elle — A for apple. Touche une carte pour l’entendre, puis un petit quiz.`,
    de: (l) => `Die Buchstaben (${l}): jeder mit einem Wort, das mit ihm beginnt — A for apple. Tippe auf eine Karte, um sie zu hören, dann ein kurzes Quiz.`,
    pt: (l) => `As letras (${l}): cada uma com uma palavra que começa por ela — A for apple. Toque num cartão para ouvir e depois um pequeno quiz.`,
    ru: (l) => `Буквы (${l}): каждая со словом, которое с неё начинается — A for apple. Нажмите на карточку, чтобы услышать, потом короткий тест.`,
    ar: (l) => `حروف ${l}: كل حرف مع كلمة تبدأ به — A for apple. اضغط على البطاقة لتسمعها، ثم اختبار قصير.`,
    zh: (l) => `${l}的字母：每个字母配一个以它开头的单词 —— A for apple。点卡片听发音，再做个小测验。`,
    ja: (l) => `${l}の文字：それぞれ、その文字で始まる単語と一緒に — A for apple。カードをタップして聞いてから、短いクイズ。`,
    ko: (l) => `${l} 글자: 각 글자로 시작하는 단어와 함께 — A for apple. 카드를 눌러 듣고, 짧은 퀴즈.`
};

/**
 * The two questions of a letter with a word (2026-11-02, "change the way of the question" — it was "H is for …"), in
 * the student's language: which sentence has a word starting with the letter, and which letter a word starts with.
 */
const ASK_WORDS = {
    en: { wordWith: (x) => `Which sentence has a word that starts with “${x}”?`, firstOf: (w) => `Which letter does “${w}” start with?`, hasIn: (x) => `Which sentence has a word with “${x}” in it?` },
    kn: { wordWith: (x) => `“${x}” ಅಕ್ಷರದಿಂದ ಶುರುವಾಗುವ ಪದ ಯಾವ ವಾಕ್ಯದಲ್ಲಿದೆ?`, firstOf: (w) => `“${w}” ಯಾವ ಅಕ್ಷರದಿಂದ ಶುರುವಾಗುತ್ತದೆ?`, hasIn: (x) => `“${x}” ಅಕ್ಷರ ಇರುವ ಪದ ಯಾವ ವಾಕ್ಯದಲ್ಲಿದೆ?` },
    hi: { wordWith: (x) => `किस वाक्य में “${x}” से शुरू होने वाला शब्द है?`, firstOf: (w) => `“${w}” किस अक्षर से शुरू होता है?`, hasIn: (x) => `किस वाक्य के एक शब्द में “${x}” है?` },
    ta: { wordWith: (x) => `“${x}” என்ற எழுத்தில் தொடங்கும் சொல் எந்த வாக்கியத்தில் உள்ளது?`, firstOf: (w) => `“${w}” எந்த எழுத்தில் தொடங்குகிறது?`, hasIn: (x) => `“${x}” என்ற எழுத்து உள்ள சொல் எந்த வாக்கியத்தில் உள்ளது?` },
    te: { wordWith: (x) => `“${x}” తో మొదలయ్యే పదం ఏ వాక్యంలో ఉంది?`, firstOf: (w) => `“${w}” ఏ అక్షరంతో మొదలవుతుంది?`, hasIn: (x) => `“${x}” ఉన్న పదం ఏ వాక్యంలో ఉంది?` },
    ml: { wordWith: (x) => `“${x}” എന്ന അക്ഷരത്തിൽ തുടങ്ങുന്ന വാക്ക് ഏത് വാക്യത്തിലാണ്?`, firstOf: (w) => `“${w}” ഏത് അക്ഷരത്തിലാണ് തുടങ്ങുന്നത്?`, hasIn: (x) => `“${x}” എന്ന അക്ഷരമുള്ള വാക്ക് ഏത് വാക്യത്തിലാണ്?` },
    mr: { wordWith: (x) => `“${x}” ने सुरू होणारा शब्द कोणत्या वाक्यात आहे?`, firstOf: (w) => `“${w}” कोणत्या अक्षराने सुरू होतो?`, hasIn: (x) => `“${x}” असलेला शब्द कोणत्या वाक्यात आहे?` },
    bn: { wordWith: (x) => `কোন বাক্যে “${x}” দিয়ে শুরু হওয়া শব্দ আছে?`, firstOf: (w) => `“${w}” কোন অক্ষর দিয়ে শুরু হয়?`, hasIn: (x) => `কোন বাক্যের একটি শব্দে “${x}” আছে?` },
    gu: { wordWith: (x) => `કયા વાક્યમાં “${x}” થી શરૂ થતો શબ્દ છે?`, firstOf: (w) => `“${w}” કયા અક્ષરથી શરૂ થાય છે?`, hasIn: (x) => `કયા વાક્યના શબ્દમાં “${x}” છે?` },
    pa: { wordWith: (x) => `ਕਿਸ ਵਾਕ ਵਿੱਚ “${x}” ਨਾਲ ਸ਼ੁਰੂ ਹੋਣ ਵਾਲਾ ਸ਼ਬਦ ਹੈ?`, firstOf: (w) => `“${w}” ਕਿਸ ਅੱਖਰ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ?`, hasIn: (x) => `ਕਿਸ ਵਾਕ ਦੇ ਸ਼ਬਦ ਵਿੱਚ “${x}” ਹੈ?` },
    or: { wordWith: (x) => `କେଉଁ ବାକ୍ୟରେ “${x}” ରୁ ଆରମ୍ଭ ହେଉଥିବା ଶବ୍ଦ ଅଛି?`, firstOf: (w) => `“${w}” କେଉଁ ଅକ୍ଷରରୁ ଆରମ୍ଭ ହୁଏ?`, hasIn: (x) => `କେଉଁ ବାକ୍ୟର ଶବ୍ଦରେ “${x}” ଅଛି?` },
    ur: { wordWith: (x) => `کس جملے میں “${x}” سے شروع ہونے والا لفظ ہے؟`, firstOf: (w) => `“${w}” کس حرف سے شروع ہوتا ہے؟`, hasIn: (x) => `کس جملے کے ایک لفظ میں “${x}” ہے؟` },
    es: { wordWith: (x) => `¿Qué frase tiene una palabra que empieza por “${x}”?`, firstOf: (w) => `¿Por qué letra empieza “${w}”?`, hasIn: (x) => `¿Qué frase tiene una palabra con “${x}”?` },
    fr: { wordWith: (x) => `Quelle phrase contient un mot qui commence par “${x}” ?`, firstOf: (w) => `Par quelle lettre commence “${w}” ?`, hasIn: (x) => `Quelle phrase contient un mot avec “${x}” ?` },
    de: { wordWith: (x) => `Welcher Satz hat ein Wort, das mit “${x}” beginnt?`, firstOf: (w) => `Mit welchem Buchstaben beginnt “${w}”?`, hasIn: (x) => `Welcher Satz hat ein Wort mit “${x}”?` },
    pt: { wordWith: (x) => `Que frase tem uma palavra que começa por “${x}”?`, firstOf: (w) => `Por que letra começa “${w}”?`, hasIn: (x) => `Que frase tem uma palavra com “${x}”?` },
    ru: { wordWith: (x) => `В каком предложении есть слово на букву “${x}”?`, firstOf: (w) => `С какой буквы начинается “${w}”?`, hasIn: (x) => `В каком предложении есть слово с буквой “${x}”?` },
    ar: { wordWith: (x) => `أي جملة فيها كلمة تبدأ بحرف “${x}”؟`, firstOf: (w) => `بأي حرف تبدأ “${w}”؟`, hasIn: (x) => `أي جملة فيها كلمة بها حرف “${x}”؟` },
    zh: { wordWith: (x) => `哪个句子里有以“${x}”开头的词？`, firstOf: (w) => `“${w}”以哪个字母开头？`, hasIn: (x) => `哪个句子里有带“${x}”的词？` },
    ja: { wordWith: (x) => `“${x}”で始まる単語があるのはどの文ですか？`, firstOf: (w) => `“${w}”はどの文字で始まりますか？`, hasIn: (x) => `“${x}”が入っている単語があるのはどの文ですか？` },
    ko: { wordWith: (x) => `“${x}”(으)로 시작하는 단어가 있는 문장은?`, firstOf: (w) => `“${w}”은(는) 어떤 글자로 시작하나요?`, hasIn: (x) => `“${x}”이(가) 들어 있는 단어가 있는 문장은?` }
};

const ASK = {
    en: { sound: (x) => `How does “${x}” sound?`, letter: (s) => `Which letter sounds “${s}”?`, hear: 'Listen, and pick the letter you hear', intro: (l) => `The letters of ${l}: match each one to its sound, then a short quiz. (Every letter is on the Letters chart.)` },
    kn: { sound: (x) => `“${x}” ಹೇಗೆ ಉಚ್ಚರಿಸಲಾಗುತ್ತದೆ?`, letter: (s) => `“${s}” ಎಂದು ಉಚ್ಚರಿಸುವ ಅಕ್ಷರ ಯಾವುದು?`, hear: 'ಕೇಳಿ, ನೀವು ಕೇಳಿದ ಅಕ್ಷರವನ್ನು ಆರಿಸಿ', intro: (l) => `${l} ಅಕ್ಷರಗಳು: ಪ್ರತಿಯೊಂದನ್ನೂ ಅದರ ಉಚ್ಚಾರದೊಂದಿಗೆ ಹೊಂದಿಸಿ, ನಂತರ ಒಂದು ಚಿಕ್ಕ ರಸಪ್ರಶ್ನೆ.` },
    hi: { sound: (x) => `“${x}” कैसे बोला जाता है?`, letter: (s) => `कौन-सा अक्षर “${s}” बोला जाता है?`, hear: 'सुनिए, और जो अक्षर सुनाई दे उसे चुनिए', intro: (l) => `${l} के अक्षर: हर अक्षर को उसकी ध्वनि से मिलाइए, फिर एक छोटा क्विज़।` },
    ta: { sound: (x) => `“${x}” எப்படி ஒலிக்கும்?`, letter: (s) => `“${s}” என ஒலிக்கும் எழுத்து எது?`, hear: 'கேளுங்கள், கேட்ட எழுத்தைத் தேர்ந்தெடுங்கள்', intro: (l) => `${l} எழுத்துகள்: ஒவ்வொன்றையும் அதன் ஒலியுடன் பொருத்துங்கள், பிறகு ஒரு சிறிய வினாடி வினா.` },
    te: { sound: (x) => `“${x}” ఎలా పలుకుతారు?`, letter: (s) => `“${s}” అని పలికే అక్షరం ఏది?`, hear: 'వినండి, మీరు విన్న అక్షరాన్ని ఎంచుకోండి', intro: (l) => `${l} అక్షరాలు: ప్రతి అక్షరాన్ని దాని ధ్వనితో జత చేయండి, తర్వాత ఒక చిన్న క్విజ్.` },
    ml: { sound: (x) => `“${x}” എങ്ങനെ ഉച്ചരിക്കും?`, letter: (s) => `“${s}” എന്ന് ഉച്ചരിക്കുന്ന അക്ഷരം ഏത്?`, hear: 'കേൾക്കുക, കേട്ട അക്ഷരം തിരഞ്ഞെടുക്കുക', intro: (l) => `${l} അക്ഷരങ്ങൾ: ഓരോന്നും അതിന്റെ ശബ്ദവുമായി ചേർക്കുക, പിന്നെ ഒരു ചെറിയ ക്വിസ്.` },
    mr: { sound: (x) => `“${x}” कसे उच्चारतात?`, letter: (s) => `“${s}” असा उच्चार असलेले अक्षर कोणते?`, hear: 'ऐका, आणि ऐकलेले अक्षर निवडा', intro: (l) => `${l} ची अक्षरे: प्रत्येक अक्षर त्याच्या उच्चाराशी जुळवा, मग एक छोटी प्रश्नमंजुषा.` },
    bn: { sound: (x) => `“${x}” কীভাবে উচ্চারণ হয়?`, letter: (s) => `কোন অক্ষরের উচ্চারণ “${s}”?`, hear: 'শুনুন, আর যে অক্ষর শুনলেন সেটি বেছে নিন', intro: (l) => `${l}-এর অক্ষর: প্রতিটি অক্ষর তার উচ্চারণের সঙ্গে মেলান, তারপর একটি ছোট কুইজ।` },
    gu: { sound: (x) => `“${x}” કેવી રીતે બોલાય?`, letter: (s) => `કયો અક્ષર “${s}” બોલાય છે?`, hear: 'સાંભળો, અને સાંભળેલો અક્ષર પસંદ કરો', intro: (l) => `${l}ના અક્ષરો: દરેક અક્ષરને તેના ઉચ્ચાર સાથે મેળવો, પછી એક નાની ક્વિઝ.` },
    pa: { sound: (x) => `“${x}” ਕਿਵੇਂ ਬੋਲਿਆ ਜਾਂਦਾ ਹੈ?`, letter: (s) => `ਕਿਹੜਾ ਅੱਖਰ “${s}” ਬੋਲਿਆ ਜਾਂਦਾ ਹੈ?`, hear: 'ਸੁਣੋ, ਅਤੇ ਸੁਣਿਆ ਅੱਖਰ ਚੁਣੋ', intro: (l) => `${l} ਦੇ ਅੱਖਰ: ਹਰ ਅੱਖਰ ਨੂੰ ਉਸਦੀ ਆਵਾਜ਼ ਨਾਲ ਮਿਲਾਓ, ਫਿਰ ਇੱਕ ਛੋਟਾ ਕੁਇਜ਼।` },
    or: { sound: (x) => `“${x}” କିପରି ଉଚ୍ଚାରଣ ହୁଏ?`, letter: (s) => `କେଉଁ ଅକ୍ଷରର ଉଚ୍ଚାରଣ “${s}”?`, hear: 'ଶୁଣନ୍ତୁ, ଏବଂ ଶୁଣିଥିବା ଅକ୍ଷର ବାଛନ୍ତୁ', intro: (l) => `${l} ଅକ୍ଷର: ପ୍ରତ୍ୟେକ ଅକ୍ଷରକୁ ତାର ଉଚ୍ଚାରଣ ସହ ମିଳାନ୍ତୁ, ତାପରେ ଏକ ଛୋଟ କୁଇଜ୍।` },
    ur: { sound: (x) => `“${x}” کیسے بولا جاتا ہے؟`, letter: (s) => `کون سا حرف “${s}” بولا جاتا ہے؟`, hear: 'سنیے، اور جو حرف سنائی دے اسے چنیے', intro: (l) => `${l} کے حروف: ہر حرف کو اس کی آواز سے ملائیے، پھر ایک چھوٹا کوئز۔` },
    es: { sound: (x) => `¿Cómo suena «${x}»?`, letter: (s) => `¿Qué letra suena «${s}»?`, hear: 'Escucha y elige la letra que oyes', intro: (l) => `Las letras (${l}): une cada una con su sonido y luego un pequeño examen.` },
    fr: { sound: (x) => `Comment se prononce « ${x} » ?`, letter: (s) => `Quelle lettre se prononce « ${s} » ?`, hear: 'Écoute et choisis la lettre que tu entends', intro: (l) => `Les lettres (${l}) : associe chacune à son son, puis un petit quiz.` },
    de: { sound: (x) => `Wie klingt „${x}“?`, letter: (s) => `Welcher Buchstabe klingt „${s}“?`, hear: 'Hör zu und wähle den Buchstaben, den du hörst', intro: (l) => `Die Buchstaben (${l}): ordne jeden seinem Klang zu, dann ein kurzes Quiz.` },
    pt: { sound: (x) => `Como soa “${x}”?`, letter: (s) => `Qual letra soa “${s}”?`, hear: 'Ouça e escolha a letra que você ouve', intro: (l) => `As letras (${l}): combine cada uma com o som e depois um pequeno quiz.` },
    ru: { sound: (x) => `Как звучит «${x}»?`, letter: (s) => `Какая буква звучит как «${s}»?`, hear: 'Послушайте и выберите букву, которую слышите', intro: (l) => `Буквы (${l}): сопоставьте каждую со звуком, потом короткий тест.` },
    ar: { sound: (x) => `كيف يُنطق «${x}»؟`, letter: (s) => `أي حرف يُنطق «${s}»؟`, hear: 'استمع واختر الحرف الذي تسمعه', intro: (l) => `حروف ${l}: طابق كل حرف مع صوته، ثم اختبار قصير.` },
    zh: { sound: (x) => `“${x}”怎么读？`, letter: (s) => `哪个读作“${s}”？`, hear: '听一听，选出你听到的', intro: (l) => `${l}的字母：把每个和读音配对，再做个小测验。` },
    ja: { sound: (x) => `「${x}」はどう読みますか？`, letter: (s) => `「${s}」と読むのはどれですか？`, hear: '聞いて、聞こえた文字を選んでください', intro: (l) => `${l}の文字：それぞれを読み方と合わせてから、短いクイズ。` },
    ko: { sound: (x) => `“${x}”는 어떻게 읽나요?`, letter: (s) => `“${s}”로 읽는 글자는 무엇인가요?`, hear: '듣고, 들은 글자를 고르세요', intro: (l) => `${l} 글자: 각각 소리와 짝지은 다음 짧은 퀴즈.` }
};
const askIn = (helper) => ASK[helper] || ASK.en;

/** The stub made whole, for a student whose own language is `helper`: its letters as the lesson's words. */
const build = (stub, helper) => {
    const code = stub.course || 'en';
    const group = groupsOf(code)[placeOf(stub) - 1];
    const info = courses.courseInfo(code);
    const own = infoOf(helper);
    return {
        ...stub, language: own.code, languageName: own.name,
        ...(stub.course ? { target: code, targetName: info.name, targetLocale: info.locale } : {}),
        // A letter is "the word"; its sound, in English letters, what it stands for.
        // A letter with a word and its picture (A for 🍎 apple, 2026-10-31; Kannada and Hindi too): `for`, `pic`, its
        // sentence, how they sound in English letters and what the sentence means, and what its card says aloud.
        words: (group?.letters || []).map((l) => ({ word: l.char, kannada: l.say, pos: '', example: l.example || '', locale: info.locale || 'en-IN', ...(l.speak ? { speak: l.speak } : {}),
            ...(l.word ? {
                for: l.word, pic: l.pic, forSay: code === 'en' ? `${l.speak || l.say} for ${l.word}` : `${l.speak || l.char}, ${l.word}`,
                ...(l.sentence ? { sentence: l.sentence } : {}), ...(l.wordSay ? { forSound: l.wordSay } : {}), ...(l.sentenceSay ? { sentenceSound: l.sentenceSay } : {}), ...(l.sentenceEn ? { sentenceEn: l.sentenceEn } : {}),
                // A word with the letter inside, not at its start (2026-11-04): the part of it to colour.
                ...(l.inside ? { inside: l.inside } : {})
            } : {}) })),
        learn: { intro: (group?.letters || []).some((l) => l.word) ? (INTRO_WORDS[own.code] || INTRO_WORDS.en)(info.name) : askIn(own.code).intro(info.name) }
    };
};

/**
 * The quiz: for each letter in turn, how it sounds, which letter makes a sound, or a letter heard — at most ten,
 * the wrong choices from the lesson's other letters (never two with the same sound).
 */
const quizOf = (lesson, seed) => {
    const words = lesson.words || [];
    const a = askIn(lesson.language);
    const rnd = seeded(`${seed}:letters`);
    const picks = shuffle(words.map((_, i) => i), rnd).slice(0, Math.min(10, words.length));
    // A letter with a word (2026-10-31): "A is for …" (its word in a sentence: "🍎 I eat a red apple.") and "… is for
    // apple: “I eat a red apple.”" (its letter), in turn — no matching of sounds, no single words to pick. In another
    // language "ಅ → …" and "… → 👩 ಅಮ್ಮ: “…”". A letter with no word is asked by its sound, as before.
    // A word with the letter inside (2026-11-04) is not asked "starts with": "Which sentence has a word with “ಙ” in it?"
    // — its sentence, and three that have no such letter.
    const worded = words.filter((w) => w.for && !w.inside);
    const en = (lesson.target || 'en') === 'en';
    const named = (w) => (w.sentence ? `${w.pic} ${w.sentence}` : `${w.pic} ${w.for}`);
    const othersBy = (w, f) => shuffle(worded.filter((x) => x !== w).map(f), rnd).slice(0, 3);
    // Asked in the student's language (2026-11-02, "change the way of the question"): "Which sentence has a word that
    // starts with “H”?" — sentences to choose; "Which letter does “apple” start with? 🍎 I eat a red apple." — letters.
    const aw = ASK_WORDS[lesson.language] || ASK_WORDS.en;
    const why = (w) => (en ? `${w.word} is for ${w.for}.` : `${w.word} — ${w.for}${w.forSound ? ` (${w.forSound})` : ''}`);
    const byWord = (w, i, n) => (n % 2 === 0
        ? { id: `L~${i}~word`, type: 'mcq', kind: 'letterWord', prompt: aw.wordWith(w.word), options: shuffle([named(w), ...othersBy(w, named)], rnd), answer: named(w), explanation: why(w) }
        : { id: `L~${i}~first`, type: 'mcq', kind: 'wordLetter', prompt: `${aw.firstOf(w.for)} ${w.pic}${w.sentence ? ` ${w.sentence}` : ''}`, options: shuffle([w.word, ...othersBy(w, (x) => x.word)], rnd), answer: w.word, explanation: why(w) });
    const inQuestion = (w, i) => {
        const others = shuffle(words.filter((x) => x !== w && x.for && !named(x).includes(w.inside) && !named(x).includes(w.word)).map(named), rnd).slice(0, 3);
        return others.length === 3 ? { id: `L~${i}~in`, type: 'mcq', kind: 'letterIn', prompt: aw.hasIn(w.word), options: shuffle([named(w), ...others], rnd), answer: named(w), explanation: why(w) } : null;
    };
    if (worded.length >= 4 && worded.length === words.length) return picks.map((i, n) => byWord(words[i], i, n));
    const others = (i, key) => shuffle(words.filter((w, k) => k !== i && w[key] !== words[i][key] && w.kannada !== words[i].kannada), rnd).slice(0, 3).map((w) => w[key]);
    return picks.map((i, n) => {
        const w = words[i], kind = ['sound', 'letter', 'hear'][n % 3];
        const inside = w.inside && inQuestion(w, i);
        if (inside) return inside;
        if (w.for && !w.inside && worded.length >= 4) return byWord(w, i, n);
        if (kind === 'sound') return { id: `L~${i}~sound`, type: 'mcq', kind: 'letterSound', prompt: a.sound(w.word), options: shuffle([w.kannada, ...others(i, 'kannada')], rnd), answer: w.kannada, explanation: `${w.word} — ${w.kannada}` };
        if (kind === 'letter') return { id: `L~${i}~letter`, type: 'mcq', kind: 'soundLetter', prompt: a.letter(w.kannada), options: shuffle([w.word, ...others(i, 'word')], rnd), answer: w.word, explanation: `${w.word} — ${w.kannada}` };
        return { id: `L~${i}~hear`, type: 'mcq', kind: 'listen', prompt: a.hear, say: w.speak || w.word, sayLang: w.locale, audio: null, meaning: w.kannada, options: shuffle([w.word, ...others(i, 'word')], rnd), answer: w.word, explanation: `${w.word} — ${w.kannada}` };
    });
};

/**
 * All the letters on one page (2026-10-31, "first give all the letters in one page, each with its English, and the
 * voice"): every group of the course's letters, and for the scripts of India the kagunita — each consonant with each
 * vowel sign. The page reads each letter aloud in the course's voice.
 */
const chartOf = (code) => {
    const info = courses.courseInfo(code);
    return { course: { code, name: info.name, native: info.native }, locale: info.locale || 'en-IN', groups: groupsOf(code), table: kagunita(code) };
};

module.exports = { stubs, build, quizOf, placeOf, chartOf, SUMMARY };
