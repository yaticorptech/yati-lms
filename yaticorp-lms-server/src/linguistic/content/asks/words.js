/**
 * Linguistic Ability — the word questions in the student's own language
 * (asked 2026-10-24: "what they want to learn, that is the answer; what they
 * already know, in that language ask the questions" — for every language).
 * vocabQuiz.js makes each question in English; here it is asked in the
 * language the word's meaning is in (the word's `lang`: Kannada, Hindi…).
 * The words being learnt stay as they are; the question names no language
 * (the choices are plainly the language learnt), except "spell", which is
 * always English. English speakers keep the English. Written here, not by any
 * translation service — a native speaker should check them.
 *
 *   meaning   "X" — what does it mean?          word      which word means "Y"?
 *   listen    listen, pick the word heard      blank     choose the word that fits: …
 *   hearMeaning  listen, pick what it means   sentence  which sentence means "…"? (the unit review)
 *   spell     type the English word for "Y"    synonym   the same meaning as "X"?
 *   antonym   the opposite of "X"?             letters   "(5 letters)"
 *   means     "X" means Y. (the explanation)    same / opposite   two words, explained
 */
const KN_NAMES = {
    English: 'ಇಂಗ್ಲಿಷ್', Hindi: 'ಹಿಂದಿ', Tamil: 'ತಮಿಳು', Telugu: 'ತೆಲುಗು', Malayalam: 'ಮಲಯಾಳಂ', Marathi: 'ಮರಾಠಿ', Bengali: 'ಬಂಗಾಳಿ',
    Gujarati: 'ಗುಜರಾತಿ', Punjabi: 'ಪಂಜಾಬಿ', Odia: 'ಒಡಿಯಾ', Urdu: 'ಉರ್ದು', Spanish: 'ಸ್ಪ್ಯಾನಿಷ್', French: 'ಫ್ರೆಂಚ್', German: 'ಜರ್ಮನ್',
    Portuguese: 'ಪೋರ್ಚುಗೀಸ್', Russian: 'ರಷ್ಯನ್', Arabic: 'ಅರೇಬಿಕ್', Chinese: 'ಚೈನೀಸ್', Japanese: 'ಜಪಾನೀಸ್', Korean: 'ಕೊರಿಯನ್'
};

module.exports = {
    Kannada: {
        meaning: (w) => `"${w.word}" ಪದದ ಅರ್ಥ ಏನು?`,
        word: (w) => `"${w.kannada}" ಎಂಬ ಅರ್ಥ ಕೊಡುವ ${KN_NAMES[w.target] || w.target || 'ಇಂಗ್ಲಿಷ್'} ಪದ ಯಾವುದು?`,
        listen: () => 'ಕೇಳಿ, ಕೇಳಿದ ಪದವನ್ನು ಆರಿಸಿ',
        hearMeaning: () => 'ಕೇಳಿ, ಅದರ ಅರ್ಥವನ್ನು ಆರಿಸಿ',
        sentence: (w) => `"${w.kannada}" ಎಂಬ ಅರ್ಥದ ವಾಕ್ಯ ಯಾವುದು?`,
        blank: (w, s) => `ವಾಕ್ಯಕ್ಕೆ ಹೊಂದುವ ಪದವನ್ನು ಆರಿಸಿ: ${s}`,
        spell: (w) => `"${w.kannada}" ಎಂಬ ಅರ್ಥದ ಇಂಗ್ಲಿಷ್ ಪದವನ್ನು ಬರೆಯಿರಿ.`,
        synonym: (w) => `"${w.word}" ಪದದ ಸಮಾನಾರ್ಥಕ ಪದ ಯಾವುದು?`,
        antonym: (w) => `"${w.word}" ಪದದ ವಿರುದ್ಧಾರ್ಥಕ ಪದ ಯಾವುದು?`,
        letters: (n) => `(${n} ಅಕ್ಷರಗಳು)`,
        means: (w) => `"${w.word}" ಎಂದರೆ ${w.kannada}.`,
        same: (a, b) => `"${a}" ಮತ್ತು "${b}" ಒಂದೇ ಅರ್ಥ ಕೊಡುತ್ತವೆ.`,
        opposite: (a, b) => `"${a}" ಮತ್ತು "${b}" ವಿರುದ್ಧಾರ್ಥಕ ಪದಗಳು.`
    },
    Hindi: {
        meaning: (w) => `"${w.word}" का अर्थ क्या है?`,
        word: (w) => `किस शब्द का अर्थ "${w.kannada}" है?`,
        listen: () => 'सुनिए, और जो शब्द सुनाई दे उसे चुनिए',
        hearMeaning: () => 'सुनिए, और उसका अर्थ चुनिए',
        sentence: (w) => `किस वाक्य का अर्थ "${w.kannada}" है?`,
        blank: (w, s) => `वाक्य में सही बैठने वाला शब्द चुनिए: ${s}`,
        spell: (w) => `"${w.kannada}" के लिए अंग्रेज़ी शब्द लिखिए।`,
        synonym: (w) => `किस शब्द का अर्थ "${w.word}" जैसा ही है?`,
        antonym: (w) => `कौन-सा शब्द "${w.word}" का उलटा है?`,
        letters: (n) => `(${n} अक्षर)`,
        means: (w) => `"${w.word}" का अर्थ है ${w.kannada}।`,
        same: (a, b) => `"${a}" और "${b}" का अर्थ एक ही है।`,
        opposite: (a, b) => `"${a}" और "${b}" एक-दूसरे के उलटे हैं।`
    },
    Tamil: {
        meaning: (w) => `"${w.word}" என்பதன் பொருள் என்ன?`,
        word: (w) => `"${w.kannada}" என்ற பொருள் தரும் சொல் எது?`,
        listen: () => 'கேளுங்கள், கேட்ட சொல்லைத் தேர்ந்தெடுங்கள்',
        hearMeaning: () => 'கேளுங்கள், அதன் பொருளைத் தேர்ந்தெடுங்கள்',
        sentence: (w) => `"${w.kannada}" என்ற பொருள் தரும் வாக்கியம் எது?`,
        blank: (w, s) => `வாக்கியத்தில் பொருந்தும் சொல்லைத் தேர்ந்தெடுங்கள்: ${s}`,
        spell: (w) => `"${w.kannada}" என்பதற்கான ஆங்கிலச் சொல்லை எழுதுங்கள்.`,
        synonym: (w) => `"${w.word}" என்பதன் அதே பொருள் தரும் சொல் எது?`,
        antonym: (w) => `"${w.word}" என்பதன் எதிர்ச்சொல் எது?`,
        letters: (n) => `(${n} எழுத்துகள்)`,
        means: (w) => `"${w.word}" என்பதன் பொருள் ${w.kannada}.`,
        same: (a, b) => `"${a}", "${b}" இரண்டும் ஒரே பொருள் தரும்.`,
        opposite: (a, b) => `"${a}", "${b}" ஒன்றுக்கொன்று எதிர்ச்சொற்கள்.`
    },
    Telugu: {
        meaning: (w) => `"${w.word}" అంటే అర్థం ఏమిటి?`,
        word: (w) => `"${w.kannada}" అనే అర్థం ఇచ్చే పదం ఏది?`,
        listen: () => 'వినండి, విన్న పదాన్ని ఎంచుకోండి',
        hearMeaning: () => 'వినండి, దాని అర్థాన్ని ఎంచుకోండి',
        sentence: (w) => `"${w.kannada}" అనే అర్థం ఇచ్చే వాక్యం ఏది?`,
        blank: (w, s) => `వాక్యానికి సరిపోయే పదాన్ని ఎంచుకోండి: ${s}`,
        spell: (w) => `"${w.kannada}" కి ఆంగ్ల పదాన్ని రాయండి.`,
        synonym: (w) => `"${w.word}" కి సమానార్థక పదం ఏది?`,
        antonym: (w) => `"${w.word}" కి వ్యతిరేక పదం ఏది?`,
        letters: (n) => `(${n} అక్షరాలు)`,
        means: (w) => `"${w.word}" అంటే ${w.kannada}.`,
        same: (a, b) => `"${a}", "${b}" ఒకే అర్థం ఇస్తాయి.`,
        opposite: (a, b) => `"${a}", "${b}" వ్యతిరేక పదాలు.`
    },
    Malayalam: {
        meaning: (w) => `"${w.word}" എന്നതിന്റെ അർത്ഥം എന്താണ്?`,
        word: (w) => `"${w.kannada}" എന്ന് അർത്ഥമുള്ള വാക്ക് ഏതാണ്?`,
        listen: () => 'കേൾക്കൂ, കേട്ട വാക്ക് തിരഞ്ഞെടുക്കൂ',
        hearMeaning: () => 'കേൾക്കൂ, അതിന്റെ അർത്ഥം തിരഞ്ഞെടുക്കൂ',
        sentence: (w) => `"${w.kannada}" എന്ന് അർത്ഥമുള്ള വാക്യം ഏതാണ്?`,
        blank: (w, s) => `വാക്യത്തിന് ചേരുന്ന വാക്ക് തിരഞ്ഞെടുക്കൂ: ${s}`,
        spell: (w) => `"${w.kannada}" എന്നതിന്റെ ഇംഗ്ലീഷ് വാക്ക് എഴുതൂ.`,
        synonym: (w) => `"${w.word}" എന്നതിന്റെ അതേ അർത്ഥമുള്ള വാക്ക് ഏതാണ്?`,
        antonym: (w) => `"${w.word}" എന്നതിന്റെ വിപരീതപദം ഏതാണ്?`,
        letters: (n) => `(${n} അക്ഷരങ്ങൾ)`,
        means: (w) => `"${w.word}" എന്നാൽ ${w.kannada}.`,
        same: (a, b) => `"${a}", "${b}" എന്നിവയ്ക്ക് ഒരേ അർത്ഥമാണ്.`,
        opposite: (a, b) => `"${a}", "${b}" എന്നിവ വിപരീതപദങ്ങളാണ്.`
    },
    Marathi: {
        meaning: (w) => `"${w.word}" चा अर्थ काय?`,
        word: (w) => `"${w.kannada}" असा अर्थ असलेला शब्द कोणता?`,
        listen: () => 'ऐका, आणि ऐकलेला शब्द निवडा',
        hearMeaning: () => 'ऐका, आणि त्याचा अर्थ निवडा',
        sentence: (w) => `"${w.kannada}" असा अर्थ असलेले वाक्य कोणते?`,
        blank: (w, s) => `वाक्यात बसणारा शब्द निवडा: ${s}`,
        spell: (w) => `"${w.kannada}" साठी इंग्रजी शब्द लिहा.`,
        synonym: (w) => `"${w.word}" सारखाच अर्थ असलेला शब्द कोणता?`,
        antonym: (w) => `"${w.word}" च्या विरुद्ध अर्थाचा शब्द कोणता?`,
        letters: (n) => `(${n} अक्षरे)`,
        means: (w) => `"${w.word}" म्हणजे ${w.kannada}.`,
        same: (a, b) => `"${a}" आणि "${b}" यांचा अर्थ एकच आहे.`,
        opposite: (a, b) => `"${a}" आणि "${b}" हे विरुद्धार्थी शब्द आहेत.`
    },
    Bengali: {
        meaning: (w) => `"${w.word}" মানে কী?`,
        word: (w) => `কোন শব্দের মানে "${w.kannada}"?`,
        listen: () => 'শুনুন, আর যে শব্দটি শুনলেন সেটি বেছে নিন',
        hearMeaning: () => 'শুনুন, আর এর মানে বেছে নিন',
        sentence: (w) => `কোন বাক্যের মানে "${w.kannada}"?`,
        blank: (w, s) => `বাক্যে মানানসই শব্দটি বেছে নিন: ${s}`,
        spell: (w) => `"${w.kannada}"-এর ইংরেজি শব্দটি লিখুন।`,
        synonym: (w) => `কোন শব্দের মানে "${w.word}"-এর মতোই?`,
        antonym: (w) => `কোন শব্দটি "${w.word}"-এর বিপরীত?`,
        letters: (n) => `(${n}টি অক্ষর)`,
        means: (w) => `"${w.word}" মানে ${w.kannada}।`,
        same: (a, b) => `"${a}" আর "${b}"-এর মানে একই।`,
        opposite: (a, b) => `"${a}" আর "${b}" একে অপরের বিপরীত।`
    },
    Gujarati: {
        meaning: (w) => `"${w.word}" નો અર્થ શું છે?`,
        word: (w) => `કયા શબ્દનો અર્થ "${w.kannada}" છે?`,
        listen: () => 'સાંભળો, અને સાંભળેલો શબ્દ પસંદ કરો',
        hearMeaning: () => 'સાંભળો, અને તેનો અર્થ પસંદ કરો',
        sentence: (w) => `કયા વાક્યનો અર્થ "${w.kannada}" છે?`,
        blank: (w, s) => `વાક્યમાં બંધબેસતો શબ્દ પસંદ કરો: ${s}`,
        spell: (w) => `"${w.kannada}" માટેનો અંગ્રેજી શબ્દ લખો.`,
        synonym: (w) => `કયા શબ્દનો અર્થ "${w.word}" જેવો જ છે?`,
        antonym: (w) => `કયો શબ્દ "${w.word}" નો વિરોધી છે?`,
        letters: (n) => `(${n} અક્ષર)`,
        means: (w) => `"${w.word}" એટલે ${w.kannada}.`,
        same: (a, b) => `"${a}" અને "${b}" નો અર્થ એક જ છે.`,
        opposite: (a, b) => `"${a}" અને "${b}" વિરોધી શબ્દો છે.`
    },
    Punjabi: {
        meaning: (w) => `"${w.word}" ਦਾ ਅਰਥ ਕੀ ਹੈ?`,
        word: (w) => `ਕਿਹੜੇ ਸ਼ਬਦ ਦਾ ਅਰਥ "${w.kannada}" ਹੈ?`,
        listen: () => 'ਸੁਣੋ, ਅਤੇ ਜੋ ਸ਼ਬਦ ਸੁਣਿਆ ਉਹ ਚੁਣੋ',
        hearMeaning: () => 'ਸੁਣੋ, ਅਤੇ ਉਸਦਾ ਅਰਥ ਚੁਣੋ',
        sentence: (w) => `ਕਿਹੜੇ ਵਾਕ ਦਾ ਅਰਥ "${w.kannada}" ਹੈ?`,
        blank: (w, s) => `ਵਾਕ ਵਿੱਚ ਢੁਕਵਾਂ ਸ਼ਬਦ ਚੁਣੋ: ${s}`,
        spell: (w) => `"${w.kannada}" ਲਈ ਅੰਗਰੇਜ਼ੀ ਸ਼ਬਦ ਲਿਖੋ।`,
        synonym: (w) => `ਕਿਹੜੇ ਸ਼ਬਦ ਦਾ ਅਰਥ "${w.word}" ਵਰਗਾ ਹੀ ਹੈ?`,
        antonym: (w) => `ਕਿਹੜਾ ਸ਼ਬਦ "${w.word}" ਦਾ ਉਲਟ ਹੈ?`,
        letters: (n) => `(${n} ਅੱਖਰ)`,
        means: (w) => `"${w.word}" ਦਾ ਅਰਥ ਹੈ ${w.kannada}।`,
        same: (a, b) => `"${a}" ਅਤੇ "${b}" ਦਾ ਅਰਥ ਇੱਕੋ ਹੈ।`,
        opposite: (a, b) => `"${a}" ਅਤੇ "${b}" ਇੱਕ-ਦੂਜੇ ਦੇ ਉਲਟ ਹਨ।`
    },
    Odia: {
        meaning: (w) => `"${w.word}" ର ଅର୍ଥ କ’ଣ?`,
        word: (w) => `କେଉଁ ଶବ୍ଦର ଅର୍ଥ "${w.kannada}"?`,
        listen: () => 'ଶୁଣନ୍ତୁ, ଶୁଣିଥିବା ଶବ୍ଦଟି ବାଛନ୍ତୁ',
        hearMeaning: () => 'ଶୁଣନ୍ତୁ, ଏହାର ଅର୍ଥ ବାଛନ୍ତୁ',
        sentence: (w) => `କେଉଁ ବାକ୍ୟର ଅର୍ଥ "${w.kannada}"?`,
        blank: (w, s) => `ବାକ୍ୟରେ ଖାପ ଖାଉଥିବା ଶବ୍ଦ ବାଛନ୍ତୁ: ${s}`,
        spell: (w) => `"${w.kannada}" ପାଇଁ ଇଂରାଜୀ ଶବ୍ଦ ଲେଖନ୍ତୁ।`,
        synonym: (w) => `କେଉଁ ଶବ୍ଦର ଅର୍ଥ "${w.word}" ଭଳି?`,
        antonym: (w) => `କେଉଁ ଶବ୍ଦ "${w.word}" ର ବିପରୀତ?`,
        letters: (n) => `(${n}ଟି ଅକ୍ଷର)`,
        means: (w) => `"${w.word}" ର ଅର୍ଥ ${w.kannada}।`,
        same: (a, b) => `"${a}" ଓ "${b}" ର ଅର୍ଥ ସମାନ।`,
        opposite: (a, b) => `"${a}" ଓ "${b}" ପରସ୍ପରର ବିପରୀତ।`
    },
    Urdu: {
        meaning: (w) => `"${w.word}" کا مطلب کیا ہے؟`,
        word: (w) => `کس لفظ کا مطلب "${w.kannada}" ہے؟`,
        listen: () => 'سنیے، اور جو لفظ سنائی دے اسے چنیے',
        hearMeaning: () => 'سنیے، اور اس کا مطلب چنیے',
        sentence: (w) => `کس جملے کا مطلب "${w.kannada}" ہے؟`,
        blank: (w, s) => `جملے میں صحیح بیٹھنے والا لفظ چنیے: ${s}`,
        spell: (w) => `"${w.kannada}" کے لیے انگریزی لفظ لکھیے۔`,
        synonym: (w) => `کس لفظ کا مطلب "${w.word}" جیسا ہی ہے؟`,
        antonym: (w) => `کون سا لفظ "${w.word}" کا الٹ ہے؟`,
        letters: (n) => `(${n} حروف)`,
        means: (w) => `"${w.word}" کا مطلب ہے ${w.kannada}۔`,
        same: (a, b) => `"${a}" اور "${b}" کا مطلب ایک ہی ہے۔`,
        opposite: (a, b) => `"${a}" اور "${b}" ایک دوسرے کے الٹ ہیں۔`
    },
    Spanish: {
        meaning: (w) => `¿Qué significa "${w.word}"?`,
        word: (w) => `¿Qué palabra significa "${w.kannada}"?`,
        listen: () => 'Escucha y elige la palabra que oyes',
        hearMeaning: () => 'Escucha y elige lo que significa',
        sentence: (w) => `¿Qué frase significa "${w.kannada}"?`,
        blank: (w, s) => `Elige la palabra que encaja: ${s}`,
        spell: (w) => `Escribe la palabra en inglés para "${w.kannada}".`,
        synonym: (w) => `¿Qué palabra significa lo mismo que "${w.word}"?`,
        antonym: (w) => `¿Qué palabra significa lo contrario de "${w.word}"?`,
        letters: (n) => `(${n} letras)`,
        means: (w) => `"${w.word}" significa ${w.kannada}.`,
        same: (a, b) => `"${a}" y "${b}" significan lo mismo.`,
        opposite: (a, b) => `"${a}" y "${b}" son contrarios.`
    },
    French: {
        meaning: (w) => `Que veut dire "${w.word}" ?`,
        word: (w) => `Quel mot veut dire "${w.kannada}" ?`,
        listen: () => 'Écoute et choisis le mot que tu entends',
        hearMeaning: () => 'Écoute et choisis ce que ça veut dire',
        sentence: (w) => `Quelle phrase veut dire "${w.kannada}" ?`,
        blank: (w, s) => `Choisis le mot qui convient : ${s}`,
        spell: (w) => `Écris le mot anglais pour "${w.kannada}".`,
        synonym: (w) => `Quel mot veut dire la même chose que "${w.word}" ?`,
        antonym: (w) => `Quel mot veut dire le contraire de "${w.word}" ?`,
        letters: (n) => `(${n} lettres)`,
        means: (w) => `"${w.word}" veut dire ${w.kannada}.`,
        same: (a, b) => `"${a}" et "${b}" veulent dire la même chose.`,
        opposite: (a, b) => `"${a}" et "${b}" sont contraires.`
    },
    German: {
        meaning: (w) => `Was bedeutet "${w.word}"?`,
        word: (w) => `Welches Wort bedeutet "${w.kannada}"?`,
        listen: () => 'Hör zu und wähle das Wort, das du hörst',
        hearMeaning: () => 'Hör zu und wähle, was es bedeutet',
        sentence: (w) => `Welcher Satz bedeutet "${w.kannada}"?`,
        blank: (w, s) => `Wähle das passende Wort: ${s}`,
        spell: (w) => `Schreib das englische Wort für "${w.kannada}".`,
        synonym: (w) => `Welches Wort bedeutet dasselbe wie "${w.word}"?`,
        antonym: (w) => `Welches Wort ist das Gegenteil von "${w.word}"?`,
        letters: (n) => `(${n} Buchstaben)`,
        means: (w) => `"${w.word}" bedeutet ${w.kannada}.`,
        same: (a, b) => `"${a}" und "${b}" bedeuten dasselbe.`,
        opposite: (a, b) => `"${a}" und "${b}" sind Gegenteile.`
    },
    Portuguese: {
        meaning: (w) => `O que significa "${w.word}"?`,
        word: (w) => `Qual palavra significa "${w.kannada}"?`,
        listen: () => 'Ouça e escolha a palavra que você ouvir',
        hearMeaning: () => 'Ouça e escolha o que significa',
        sentence: (w) => `Qual frase significa "${w.kannada}"?`,
        blank: (w, s) => `Escolha a palavra que completa: ${s}`,
        spell: (w) => `Escreva a palavra em inglês para "${w.kannada}".`,
        synonym: (w) => `Qual palavra significa o mesmo que "${w.word}"?`,
        antonym: (w) => `Qual palavra significa o contrário de "${w.word}"?`,
        letters: (n) => `(${n} letras)`,
        means: (w) => `"${w.word}" significa ${w.kannada}.`,
        same: (a, b) => `"${a}" e "${b}" significam o mesmo.`,
        opposite: (a, b) => `"${a}" e "${b}" são opostos.`
    },
    Russian: {
        meaning: (w) => `Что значит "${w.word}"?`,
        word: (w) => `Какое слово значит "${w.kannada}"?`,
        listen: () => 'Послушайте и выберите слово, которое услышали',
        hearMeaning: () => 'Послушайте и выберите, что это значит',
        sentence: (w) => `Какое предложение значит "${w.kannada}"?`,
        blank: (w, s) => `Выберите подходящее слово: ${s}`,
        spell: (w) => `Напишите английское слово, которое значит "${w.kannada}".`,
        synonym: (w) => `Какое слово значит то же, что "${w.word}"?`,
        antonym: (w) => `Какое слово противоположно по смыслу слову "${w.word}"?`,
        letters: (n) => `(букв: ${n})`,
        means: (w) => `"${w.word}" значит ${w.kannada}.`,
        same: (a, b) => `"${a}" и "${b}" значат одно и то же.`,
        opposite: (a, b) => `"${a}" и "${b}" противоположны по смыслу.`
    },
    Arabic: {
        meaning: (w) => `ما معنى "${w.word}"؟`,
        word: (w) => `ما الكلمة التي تعني "${w.kannada}"؟`,
        listen: () => 'استمع واختر الكلمة التي تسمعها',
        hearMeaning: () => 'استمع واختر معناها',
        sentence: (w) => `ما الجملة التي تعني "${w.kannada}"؟`,
        blank: (w, s) => `اختر الكلمة المناسبة: ${s}`,
        spell: (w) => `اكتب الكلمة الإنجليزية التي تعني "${w.kannada}".`,
        synonym: (w) => `ما الكلمة التي لها معنى "${w.word}" نفسه؟`,
        antonym: (w) => `ما الكلمة التي تعني عكس "${w.word}"؟`,
        letters: (n) => `(${n} أحرف)`,
        means: (w) => `"${w.word}" تعني ${w.kannada}.`,
        same: (a, b) => `"${a}" و"${b}" لهما المعنى نفسه.`,
        opposite: (a, b) => `"${a}" و"${b}" متضادتان.`
    },
    Chinese: {
        meaning: (w) => `"${w.word}"是什么意思？`,
        word: (w) => `哪个词的意思是"${w.kannada}"？`,
        listen: () => '听一听，选出你听到的词',
        hearMeaning: () => '听一听，选出它的意思',
        sentence: (w) => `哪个句子的意思是"${w.kannada}"？`,
        blank: (w, s) => `选出合适的词：${s}`,
        spell: (w) => `写出"${w.kannada}"的英语单词。`,
        synonym: (w) => `哪个词和"${w.word}"意思相同？`,
        antonym: (w) => `哪个词和"${w.word}"意思相反？`,
        letters: (n) => `（${n}个字母）`,
        means: (w) => `"${w.word}"的意思是${w.kannada}。`,
        same: (a, b) => `"${a}"和"${b}"意思相同。`,
        opposite: (a, b) => `"${a}"和"${b}"意思相反。`
    },
    Japanese: {
        meaning: (w) => `「${w.word}」はどういう意味ですか？`,
        word: (w) => `「${w.kannada}」という意味の言葉はどれですか？`,
        listen: () => '聞いて、聞こえた言葉を選んでください',
        hearMeaning: () => '聞いて、意味を選んでください',
        sentence: (w) => `「${w.kannada}」という意味の文はどれですか？`,
        blank: (w, s) => `合う言葉を選んでください：${s}`,
        spell: (w) => `「${w.kannada}」を英語で書いてください。`,
        synonym: (w) => `「${w.word}」と同じ意味の言葉はどれですか？`,
        antonym: (w) => `「${w.word}」と反対の意味の言葉はどれですか？`,
        letters: (n) => `（${n}文字）`,
        means: (w) => `「${w.word}」は「${w.kannada}」という意味です。`,
        same: (a, b) => `「${a}」と「${b}」は同じ意味です。`,
        opposite: (a, b) => `「${a}」と「${b}」は反対の意味です。`
    },
    Korean: {
        meaning: (w) => `"${w.word}"은(는) 무슨 뜻인가요?`,
        word: (w) => `"${w.kannada}"라는 뜻의 단어는 무엇인가요?`,
        listen: () => '듣고, 들은 단어를 고르세요',
        hearMeaning: () => '듣고, 뜻을 고르세요',
        sentence: (w) => `"${w.kannada}"라는 뜻의 문장은 무엇인가요?`,
        blank: (w, s) => `알맞은 단어를 고르세요: ${s}`,
        spell: (w) => `"${w.kannada}"에 해당하는 영어 단어를 쓰세요.`,
        synonym: (w) => `"${w.word}"와(과) 같은 뜻의 단어는 무엇인가요?`,
        antonym: (w) => `"${w.word}"의 반대말은 무엇인가요?`,
        letters: (n) => `(${n}글자)`,
        means: (w) => `"${w.word}"은(는) ${w.kannada}라는 뜻이에요.`,
        same: (a, b) => `"${a}"와(과) "${b}"는 같은 뜻이에요.`,
        opposite: (a, b) => `"${a}"와(과) "${b}"는 반대말이에요.`
    }
};
