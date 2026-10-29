/**
 * Linguistic Ability — the words around the corrections of a student's
 * English (asked 2026-10-27: "fix this in all languages"): the corrected
 * sentences, a checked piece of writing, a talk. Kannada's are in say.js with
 * the rest; these are every other language's, merged in by say.js. The
 * corrections themselves come from the server in the student's language
 * (server content/feedback/). Written here, not by any translation service —
 * a native speaker should check them.
 */
export const FEEDBACK_KEYS = [
    'Your sentences, corrected', 'You said', 'You wrote', 'Better', 'No mistakes found', 'Checked',
    'No grammar mistakes found', 'Fix the marked words', 'Well spoken!', 'Say a little more', 'Fix these, then speak again',
    'Sample answer', 'Compare your translation with the model below.', 'Show corrections', 'Close'
];

export const FEEDBACK_WORDS = {
    hi: ['आपके वाक्य, सुधार के साथ', 'आपने कहा', 'आपने लिखा', 'बेहतर', 'कोई गलती नहीं मिली', 'जाँच हो गई',
        'व्याकरण की कोई गलती नहीं मिली', 'चिह्नित शब्द ठीक करें', 'बहुत अच्छा बोला!', 'थोड़ा और बोलें', 'इन्हें ठीक करें, फिर दोबारा बोलें',
        'नमूना उत्तर', 'अपने अनुवाद की तुलना नीचे दिए नमूने से करें।', 'सुधार देखें', 'बंद करें'],
    ta: ['உங்கள் வாக்கியங்கள், திருத்தத்துடன்', 'நீங்கள் சொன்னது', 'நீங்கள் எழுதியது', 'சிறந்தது', 'தவறு எதுவும் இல்லை', 'சரிபார்க்கப்பட்டது',
        'இலக்கணப் பிழை எதுவும் இல்லை', 'குறிக்கப்பட்ட சொற்களைத் திருத்துங்கள்', 'நன்றாகப் பேசினீர்கள்!', 'இன்னும் கொஞ்சம் பேசுங்கள்', 'இவற்றைத் திருத்தி, மீண்டும் பேசுங்கள்',
        'மாதிரி பதில்', 'உங்கள் மொழிபெயர்ப்பைக் கீழே உள்ள மாதிரியுடன் ஒப்பிடுங்கள்.', 'திருத்தங்களைப் பாருங்கள்', 'மூடு'],
    te: ['మీ వాక్యాలు, సవరణలతో', 'మీరు అన్నది', 'మీరు రాసింది', 'మెరుగైనది', 'తప్పులు ఏవీ లేవు', 'తనిఖీ అయింది',
        'వ్యాకరణ తప్పులు ఏవీ లేవు', 'గుర్తించిన పదాలను సరిచేయండి', 'బాగా మాట్లాడారు!', 'ఇంకొంచెం మాట్లాడండి', 'వీటిని సరిచేసి, మళ్ళీ మాట్లాడండి',
        'నమూనా జవాబు', 'మీ అనువాదాన్ని కింది నమూనాతో పోల్చండి.', 'సవరణలు చూడండి', 'మూసివేయి'],
    ml: ['നിങ്ങളുടെ വാക്യങ്ങൾ, തിരുത്തലുകളോടെ', 'നിങ്ങൾ പറഞ്ഞത്', 'നിങ്ങൾ എഴുതിയത്', 'മെച്ചപ്പെട്ടത്', 'തെറ്റുകളൊന്നുമില്ല', 'പരിശോധിച്ചു',
        'വ്യാകരണത്തെറ്റുകളൊന്നുമില്ല', 'അടയാളപ്പെടുത്തിയ വാക്കുകൾ ശരിയാക്കുക', 'നന്നായി സംസാരിച്ചു!', 'കുറച്ചുകൂടി സംസാരിക്കുക', 'ഇവ ശരിയാക്കി വീണ്ടും സംസാരിക്കുക',
        'മാതൃകാ ഉത്തരം', 'നിങ്ങളുടെ വിവർത്തനം താഴെയുള്ള മാതൃകയുമായി താരതമ്യം ചെയ്യുക.', 'തിരുത്തലുകൾ കാണുക', 'അടയ്ക്കുക'],
    mr: ['तुमची वाक्ये, दुरुस्तीसह', 'तुम्ही म्हणालात', 'तुम्ही लिहिले', 'अधिक चांगले', 'एकही चूक आढळली नाही', 'तपासले',
        'व्याकरणाची एकही चूक आढळली नाही', 'खूण केलेले शब्द दुरुस्त करा', 'छान बोललात!', 'थोडे अजून बोला', 'हे दुरुस्त करा, मग पुन्हा बोला',
        'नमुना उत्तर', 'तुमच्या भाषांतराची खालील नमुन्याशी तुलना करा.', 'दुरुस्त्या पहा', 'बंद करा'],
    bn: ['আপনার বাক্য, সংশোধনসহ', 'আপনি বলেছেন', 'আপনি লিখেছেন', 'আরও ভালো', 'কোনো ভুল পাওয়া যায়নি', 'যাচাই হয়েছে',
        'কোনো ব্যাকরণ ভুল পাওয়া যায়নি', 'চিহ্নিত শব্দগুলো ঠিক করুন', 'খুব ভালো বলেছেন!', 'আরেকটু বলুন', 'এগুলো ঠিক করে আবার বলুন',
        'নমুনা উত্তর', 'আপনার অনুবাদ নিচের নমুনার সঙ্গে মিলিয়ে দেখুন।', 'সংশোধন দেখুন', 'বন্ধ করুন'],
    gu: ['તમારાં વાક્યો, સુધારા સાથે', 'તમે કહ્યું', 'તમે લખ્યું', 'વધુ સારું', 'કોઈ ભૂલ મળી નથી', 'તપાસાયું',
        'વ્યાકરણની કોઈ ભૂલ મળી નથી', 'નિશાનીવાળા શબ્દો સુધારો', 'સરસ બોલ્યા!', 'થોડું વધુ બોલો', 'આ સુધારો, પછી ફરી બોલો',
        'નમૂનાનો જવાબ', 'તમારા અનુવાદને નીચેના નમૂના સાથે સરખાવો.', 'સુધારા જુઓ', 'બંધ કરો'],
    pa: ['ਤੁਹਾਡੇ ਵਾਕ, ਸੁਧਾਰ ਨਾਲ', 'ਤੁਸੀਂ ਕਿਹਾ', 'ਤੁਸੀਂ ਲਿਖਿਆ', 'ਬਿਹਤਰ', 'ਕੋਈ ਗਲਤੀ ਨਹੀਂ ਮਿਲੀ', 'ਜਾਂਚ ਹੋ ਗਈ',
        'ਵਿਆਕਰਨ ਦੀ ਕੋਈ ਗਲਤੀ ਨਹੀਂ ਮਿਲੀ', 'ਨਿਸ਼ਾਨ ਲੱਗੇ ਸ਼ਬਦ ਠੀਕ ਕਰੋ', 'ਬਹੁਤ ਵਧੀਆ ਬੋਲਿਆ!', 'ਥੋੜ੍ਹਾ ਹੋਰ ਬੋਲੋ', 'ਇਹ ਠੀਕ ਕਰੋ, ਫਿਰ ਦੁਬਾਰਾ ਬੋਲੋ',
        'ਨਮੂਨਾ ਜਵਾਬ', 'ਆਪਣੇ ਅਨੁਵਾਦ ਦੀ ਹੇਠਾਂ ਦਿੱਤੇ ਨਮੂਨੇ ਨਾਲ ਤੁਲਨਾ ਕਰੋ।', 'ਸੁਧਾਰ ਵੇਖੋ', 'ਬੰਦ ਕਰੋ'],
    or: ['ଆପଣଙ୍କ ବାକ୍ୟ, ସଂଶୋଧନ ସହ', 'ଆପଣ କହିଲେ', 'ଆପଣ ଲେଖିଲେ', 'ଆହୁରି ଭଲ', 'କୌଣସି ଭୁଲ ମିଳିଲା ନାହିଁ', 'ଯାଞ୍ଚ ହେଲା',
        'କୌଣସି ବ୍ୟାକରଣ ଭୁଲ ମିଳିଲା ନାହିଁ', 'ଚିହ୍ନିତ ଶବ୍ଦଗୁଡ଼ିକୁ ଠିକ୍ କରନ୍ତୁ', 'ବହୁତ ଭଲ କହିଲେ!', 'ଆଉ ଟିକେ କୁହନ୍ତୁ', 'ଏଗୁଡ଼ିକୁ ଠିକ୍ କରି ପୁଣି କୁହନ୍ତୁ',
        'ନମୁନା ଉତ୍ତର', 'ଆପଣଙ୍କ ଅନୁବାଦକୁ ତଳେ ଥିବା ନମୁନା ସହ ତୁଳନା କରନ୍ତୁ।', 'ସଂଶୋଧନ ଦେଖନ୍ତୁ', 'ବନ୍ଦ କରନ୍ତୁ'],
    ur: ['آپ کے جملے، درستی کے ساتھ', 'آپ نے کہا', 'آپ نے لکھا', 'بہتر', 'کوئی غلطی نہیں ملی', 'جانچ ہو گئی',
        'قواعد کی کوئی غلطی نہیں ملی', 'نشان زدہ الفاظ درست کریں', 'بہت اچھا بولا!', 'تھوڑا اور بولیں', 'انہیں درست کریں، پھر دوبارہ بولیں',
        'نمونے کا جواب', 'اپنے ترجمے کا نیچے دیے گئے نمونے سے موازنہ کریں۔', 'درستیاں دیکھیں', 'بند کریں'],
    es: ['Tus oraciones, corregidas', 'Dijiste', 'Escribiste', 'Mejor', 'No hay errores', 'Revisado',
        'No se encontraron errores de gramática', 'Corrige las palabras marcadas', '¡Bien dicho!', 'Di un poco más', 'Corrige esto y vuelve a hablar',
        'Respuesta de ejemplo', 'Compara tu traducción con el modelo de abajo.', 'Ver correcciones', 'Cerrar'],
    fr: ['Tes phrases, corrigées', 'Tu as dit', 'Tu as écrit', 'Mieux', 'Aucune erreur', 'Vérifié',
        'Aucune faute de grammaire trouvée', 'Corrige les mots marqués', 'Bien parlé !', 'Parle un peu plus', 'Corrige ceci, puis parle à nouveau',
        'Exemple de réponse', 'Compare ta traduction avec le modèle ci-dessous.', 'Voir les corrections', 'Fermer'],
    de: ['Deine Sätze, korrigiert', 'Du hast gesagt', 'Du hast geschrieben', 'Besser', 'Keine Fehler gefunden', 'Geprüft',
        'Keine Grammatikfehler gefunden', 'Verbessere die markierten Wörter', 'Gut gesprochen!', 'Sprich etwas mehr', 'Verbessere das und sprich noch einmal',
        'Beispielantwort', 'Vergleiche deine Übersetzung mit dem Muster unten.', 'Korrekturen zeigen', 'Schließen'],
    pt: ['Suas frases, corrigidas', 'Você disse', 'Você escreveu', 'Melhor', 'Nenhum erro encontrado', 'Verificado',
        'Nenhum erro de gramática encontrado', 'Corrija as palavras marcadas', 'Muito bem falado!', 'Fale um pouco mais', 'Corrija isto e fale de novo',
        'Resposta de exemplo', 'Compare sua tradução com o modelo abaixo.', 'Ver correções', 'Fechar'],
    ru: ['Ваши предложения с исправлениями', 'Вы сказали', 'Вы написали', 'Лучше', 'Ошибок не найдено', 'Проверено',
        'Грамматических ошибок не найдено', 'Исправьте отмеченные слова', 'Хорошо сказано!', 'Скажите чуть больше', 'Исправьте это и скажите снова',
        'Пример ответа', 'Сравните свой перевод с образцом ниже.', 'Показать исправления', 'Закрыть'],
    ar: ['جملك مع التصحيح', 'قلت', 'كتبت', 'أفضل', 'لا توجد أخطاء', 'تم التحقق',
        'لا توجد أخطاء نحوية', 'صحّح الكلمات المعلَّمة', 'أحسنت الكلام!', 'تكلّم أكثر قليلًا', 'صحّح هذه ثم تكلّم مرة أخرى',
        'إجابة نموذجية', 'قارن ترجمتك بالنموذج أدناه.', 'اعرض التصحيحات', 'إغلاق'],
    zh: ['你的句子（已改正）', '你说的', '你写的', '更好', '没有发现错误', '已检查',
        '没有发现语法错误', '改正标出的词', '说得好！', '再多说一点', '改正这些，再说一遍',
        '参考答案', '把你的翻译和下面的范例对比一下。', '查看改正', '关闭'],
    ja: ['あなたの文（直しつき）', 'あなたが言ったこと', 'あなたが書いたこと', 'より良い言い方', '間違いはありません', 'チェック済み',
        '文法の間違いは見つかりませんでした', '印のついた語を直しましょう', 'よく話せました！', 'もう少し話しましょう', 'ここを直して、もう一度話しましょう',
        '解答例', '下の例とあなたの訳を比べてみましょう。', '直しを見る', '閉じる'],
    ko: ['내 문장, 고친 내용과 함께', '내가 말한 것', '내가 쓴 것', '더 나은 표현', '틀린 곳이 없어요', '확인 완료',
        '문법 실수가 없어요', '표시된 단어를 고치세요', '잘 말했어요!', '조금 더 말하세요', '이것을 고친 뒤 다시 말하세요',
        '예시 답안', '아래 예시와 내 번역을 비교해 보세요.', '고친 내용 보기', '닫기']
};

/** The lines with numbers in them, in every other language. */
export const FEEDBACK_LINES = {
    hi: { writeResult: (c, t) => `${t} में से ${c} वाक्यों में कोई गलती नहीं`, talkResult: (c, t, w) => `${t} में से ${c} वाक्यों में कोई गलती नहीं · ${w} शब्द`, talkShort: (w, m) => `आपने ${w} शब्द बोले। कम से कम ${m} शब्द बोलें।` },
    ta: { writeResult: (c, t) => `${t} வாக்கியங்களில் ${c} தவறில்லாதவை`, talkResult: (c, t, w) => `${t} வாக்கியங்களில் ${c} தவறில்லாதவை · ${w} சொற்கள்`, talkShort: (w, m) => `நீங்கள் ${w} சொற்கள் பேசினீர்கள். குறைந்தது ${m} சொற்கள் பேசுங்கள்.` },
    te: { writeResult: (c, t) => `${t} వాక్యాల్లో ${c} తప్పులు లేనివి`, talkResult: (c, t, w) => `${t} వాక్యాల్లో ${c} తప్పులు లేనివి · ${w} పదాలు`, talkShort: (w, m) => `మీరు ${w} పదాలు మాట్లాడారు. కనీసం ${m} పదాలు మాట్లాడండి.` },
    ml: { writeResult: (c, t) => `${t} വാക്യങ്ങളിൽ ${c} എണ്ണം തെറ്റില്ലാത്തവ`, talkResult: (c, t, w) => `${t} വാക്യങ്ങളിൽ ${c} എണ്ണം തെറ്റില്ലാത്തവ · ${w} വാക്കുകൾ`, talkShort: (w, m) => `നിങ്ങൾ ${w} വാക്കുകൾ സംസാരിച്ചു. കുറഞ്ഞത് ${m} വാക്കുകൾ സംസാരിക്കുക.` },
    mr: { writeResult: (c, t) => `${t} पैकी ${c} वाक्यांत चूक नाही`, talkResult: (c, t, w) => `${t} पैकी ${c} वाक्यांत चूक नाही · ${w} शब्द`, talkShort: (w, m) => `तुम्ही ${w} शब्द बोललात. किमान ${m} शब्द बोला.` },
    bn: { writeResult: (c, t) => `${t}টি বাক্যের মধ্যে ${c}টিতে কোনো ভুল নেই`, talkResult: (c, t, w) => `${t}টি বাক্যের মধ্যে ${c}টিতে কোনো ভুল নেই · ${w}টি শব্দ`, talkShort: (w, m) => `আপনি ${w}টি শব্দ বলেছেন। অন্তত ${m}টি শব্দ বলুন।` },
    gu: { writeResult: (c, t) => `${t} માંથી ${c} વાક્યોમાં ભૂલ નથી`, talkResult: (c, t, w) => `${t} માંથી ${c} વાક્યોમાં ભૂલ નથી · ${w} શબ્દ`, talkShort: (w, m) => `તમે ${w} શબ્દ બોલ્યા. ઓછામાં ઓછા ${m} શબ્દ બોલો.` },
    pa: { writeResult: (c, t) => `${t} ਵਿੱਚੋਂ ${c} ਵਾਕਾਂ ਵਿੱਚ ਕੋਈ ਗਲਤੀ ਨਹੀਂ`, talkResult: (c, t, w) => `${t} ਵਿੱਚੋਂ ${c} ਵਾਕਾਂ ਵਿੱਚ ਕੋਈ ਗਲਤੀ ਨਹੀਂ · ${w} ਸ਼ਬਦ`, talkShort: (w, m) => `ਤੁਸੀਂ ${w} ਸ਼ਬਦ ਬੋਲੇ। ਘੱਟੋ-ਘੱਟ ${m} ਸ਼ਬਦ ਬੋਲੋ।` },
    or: { writeResult: (c, t) => `${t}ଟି ବାକ୍ୟ ମଧ୍ୟରୁ ${c}ଟିରେ ଭୁଲ ନାହିଁ`, talkResult: (c, t, w) => `${t}ଟି ବାକ୍ୟ ମଧ୍ୟରୁ ${c}ଟିରେ ଭୁଲ ନାହିଁ · ${w}ଟି ଶବ୍ଦ`, talkShort: (w, m) => `ଆପଣ ${w}ଟି ଶବ୍ଦ କହିଲେ। ଅତି କମରେ ${m}ଟି ଶବ୍ଦ କୁହନ୍ତୁ।` },
    ur: { writeResult: (c, t) => `${t} میں سے ${c} جملوں میں کوئی غلطی نہیں`, talkResult: (c, t, w) => `${t} میں سے ${c} جملوں میں کوئی غلطی نہیں · ${w} الفاظ`, talkShort: (w, m) => `آپ نے ${w} الفاظ بولے۔ کم از کم ${m} الفاظ بولیں۔` },
    es: { writeResult: (c, t) => `${c} de ${t} oraciones sin errores`, talkResult: (c, t, w) => `${c} de ${t} oraciones sin errores · ${w} palabras`, talkShort: (w, m) => `Dijiste ${w} palabras. Habla al menos ${m} palabras.` },
    fr: { writeResult: (c, t) => `${c} phrases sur ${t} sans erreur`, talkResult: (c, t, w) => `${c} phrases sur ${t} sans erreur · ${w} mots`, talkShort: (w, m) => `Tu as dit ${w} mots. Parle au moins ${m} mots.` },
    de: { writeResult: (c, t) => `${c} von ${t} Sätzen ohne Fehler`, talkResult: (c, t, w) => `${c} von ${t} Sätzen ohne Fehler · ${w} Wörter`, talkShort: (w, m) => `Du hast ${w} Wörter gesagt. Sprich mindestens ${m} Wörter.` },
    pt: { writeResult: (c, t) => `${c} de ${t} frases sem erros`, talkResult: (c, t, w) => `${c} de ${t} frases sem erros · ${w} palavras`, talkShort: (w, m) => `Você disse ${w} palavras. Fale pelo menos ${m} palavras.` },
    ru: { writeResult: (c, t) => `${c} из ${t} предложений без ошибок`, talkResult: (c, t, w) => `${c} из ${t} предложений без ошибок · ${w} слов`, talkShort: (w, m) => `Вы сказали ${w} слов. Скажите не меньше ${m} слов.` },
    ar: { writeResult: (c, t) => `${c} من ${t} جمل بلا أخطاء`, talkResult: (c, t, w) => `${c} من ${t} جمل بلا أخطاء · ${w} كلمة`, talkShort: (w, m) => `قلت ${w} كلمة. تكلّم ${m} كلمة على الأقل.` },
    zh: { writeResult: (c, t) => `${t} 个句子中有 ${c} 个没有错误`, talkResult: (c, t, w) => `${t} 个句子中有 ${c} 个没有错误 · ${w} 个词`, talkShort: (w, m) => `你说了 ${w} 个词。至少说 ${m} 个词。` },
    ja: { writeResult: (c, t) => `${t} 文のうち ${c} 文に間違いなし`, talkResult: (c, t, w) => `${t} 文のうち ${c} 文に間違いなし · ${w} 語`, talkShort: (w, m) => `${w} 語話しました。少なくとも ${m} 語話しましょう。` },
    ko: { writeResult: (c, t) => `${t}문장 중 ${c}문장에 실수 없음`, talkResult: (c, t, w) => `${t}문장 중 ${c}문장에 실수 없음 · ${w}단어`, talkShort: (w, m) => `${w}단어를 말했어요. 최소 ${m}단어를 말하세요.` }
};
