/**
 * Linguistic Ability — what a course lesson and a review say before they
 * start, in the student's own language (asked 2026-10-24: the language they
 * know for everything around the answers). courses.js and reviews.js use
 * these; English speakers keep the English written there. Written here, not
 * by any translation service — a native speaker should check them.
 *
 *   vocab        a course's words: what to tap
 *   write        a course's sentences, written in the language learnt
 *   read         a course's sentences, read and written in the student's language
 *   tiles, close the two tips for both
 *   unit(n) · hear · words(n) · sentences · checkpoint(n)   the reviews
 */
module.exports = {
    kn: {
        vocab: 'ಹೊಸ ಪದಗಳು, ಅವುಗಳ ಅರ್ಥಗಳೊಂದಿಗೆ. ಅರ್ಥ ನೋಡಲು ಕಾರ್ಡ್ ಒತ್ತಿ, ಪದ ಕೇಳಲು ಸ್ಪೀಕರ್ ಒತ್ತಿ.',
        write: 'ಪ್ರತಿ ವಾಕ್ಯವನ್ನು ಓದಿ, ಅದನ್ನು ನೀವು ಕಲಿಯುತ್ತಿರುವ ಭಾಷೆಯಲ್ಲಿ ಬರೆಯಿರಿ.',
        read: 'ಪ್ರತಿ ವಾಕ್ಯವನ್ನು ಓದಿ, ಅದರ ಅರ್ಥವನ್ನು ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಬರೆಯಿರಿ.',
        tiles: 'ಪದಗಳ ಟೈಲ್‌ಗಳನ್ನು ಕ್ರಮವಾಗಿ ಒತ್ತಿ, ಅಥವಾ ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಟೈಪ್ ಮಾಡಿ.',
        close: 'ಹತ್ತಿರದ ಉತ್ತರವೂ ಸರಿ: ಮಾದರಿ ಉತ್ತರ ಮತ್ತು ಸಣ್ಣ ವ್ಯತ್ಯಾಸಗಳನ್ನು ನೋಡುತ್ತೀರಿ.',
        unit: (n) => `ಈ ಘಟಕದ ${n} ಪದಗಳು ಮತ್ತೊಮ್ಮೆ: ಜೋಡಿಗಳನ್ನು ಹೊಂದಿಸಿ, ನಂತರ ಒಂದು ಚಿಕ್ಕ ರಸಪ್ರಶ್ನೆ.`,
        hear: 'ಧ್ವನಿ ಆನ್ ಮಾಡಿ: ಪ್ರತಿ ಪದವನ್ನು ಕೇಳಿ, ಕೇಳಿದ ಪದವನ್ನು ಆರಿಸಿ.',
        words: (n) => `ಈ ಮಟ್ಟದ ಎಲ್ಲಾ ${n} ಪದಗಳು ಮತ್ತೊಮ್ಮೆ: ಜೋಡಿಗಳನ್ನು ಹೊಂದಿಸಿ, ನಂತರ ರಸಪ್ರಶ್ನೆ.`,
        sentences: 'ಈ ಮಟ್ಟದ ವಾಕ್ಯಗಳು ಮತ್ತೊಮ್ಮೆ, ಎರಡೂ ದಿಕ್ಕಿನಲ್ಲಿ.',
        checkpoint: (n) => `ಈ ಮಟ್ಟದ ಕೊನೆಯ ಪರೀಕ್ಷೆ: ${n} ವಾಕ್ಯಗಳು. ಮಟ್ಟ ಮುಗಿಸಲು ಇದರಲ್ಲಿ ಉತ್ತೀರ್ಣರಾಗಿ.`
    },
    hi: {
        vocab: 'नए शब्द, उनके अर्थ के साथ। अर्थ देखने के लिए कार्ड पर टैप करें, और शब्द सुनने के लिए स्पीकर पर।',
        write: 'हर वाक्य पढ़िए और उसे उस भाषा में लिखिए जो आप सीख रहे हैं।',
        read: 'हर वाक्य पढ़िए और उसका अर्थ अपनी भाषा में लिखिए।',
        tiles: 'शब्दों की टाइलें क्रम से टैप करें, या अपना उत्तर टाइप करें।',
        close: 'लगभग सही उत्तर भी माना जाता है: आपको आदर्श उत्तर और छोटे अंतर दिखेंगे।',
        unit: (n) => `इस इकाई के ${n} शब्द फिर से: जोड़े मिलाइए, फिर एक छोटा क्विज़।`,
        hear: 'आवाज़ चालू करें: हर शब्द सुनिए और जो सुना उसे चुनिए।',
        words: (n) => `इस स्तर के सभी ${n} शब्द फिर से: जोड़े मिलाइए, फिर क्विज़।`,
        sentences: 'इस स्तर के वाक्य फिर से, दोनों तरफ़ से।',
        checkpoint: (n) => `इस स्तर की आख़िरी परीक्षा: ${n} वाक्य। स्तर पूरा करने के लिए इसे पास कीजिए।`
    },
    ta: {
        vocab: 'புதிய சொற்கள், அவற்றின் பொருளுடன். பொருளைப் பார்க்க அட்டையைத் தொடுங்கள், சொல்லைக் கேட்க ஒலிபெருக்கியைத் தொடுங்கள்.',
        write: 'ஒவ்வொரு வாக்கியத்தையும் படித்து, நீங்கள் கற்கும் மொழியில் எழுதுங்கள்.',
        read: 'ஒவ்வொரு வாக்கியத்தையும் படித்து, அதன் பொருளை உங்கள் மொழியில் எழுதுங்கள்.',
        tiles: 'சொல் ஓடுகளை வரிசையாகத் தொடுங்கள், அல்லது உங்கள் விடையைத் தட்டச்சு செய்யுங்கள்.',
        close: 'கிட்டத்தட்ட சரியான விடையும் ஏற்கப்படும்: மாதிரி விடையையும் சிறிய வேறுபாடுகளையும் பார்ப்பீர்கள்.',
        unit: (n) => `இந்தப் பகுதியின் ${n} சொற்கள் மீண்டும்: ஜோடிகளைப் பொருத்துங்கள், பிறகு ஒரு சிறிய வினாடி வினா.`,
        hear: 'ஒலியை இயக்குங்கள்: ஒவ்வொரு சொல்லையும் கேட்டு, கேட்டதைத் தேர்ந்தெடுங்கள்.',
        words: (n) => `இந்த நிலையின் அனைத்து ${n} சொற்களும் மீண்டும்: ஜோடிகளைப் பொருத்துங்கள், பிறகு வினாடி வினா.`,
        sentences: 'இந்த நிலையின் வாக்கியங்கள் மீண்டும், இரு திசைகளிலும்.',
        checkpoint: (n) => `இந்த நிலையின் கடைசித் தேர்வு: ${n} வாக்கியங்கள். நிலையை முடிக்க இதில் தேர்ச்சி பெறுங்கள்.`
    },
    te: {
        vocab: 'కొత్త పదాలు, వాటి అర్థాలతో. అర్థం చూడటానికి కార్డ్‌ను తాకండి, పదం వినడానికి స్పీకర్‌ను తాకండి.',
        write: 'ప్రతి వాక్యాన్ని చదివి, మీరు నేర్చుకుంటున్న భాషలో రాయండి.',
        read: 'ప్రతి వాక్యాన్ని చదివి, దాని అర్థాన్ని మీ భాషలో రాయండి.',
        tiles: 'పదాల టైల్స్‌ను క్రమంలో తాకండి, లేదా మీ జవాబును టైప్ చేయండి.',
        close: 'దాదాపు సరైన జవాబు కూడా సరే: నమూనా జవాబు, చిన్న తేడాలు కనిపిస్తాయి.',
        unit: (n) => `ఈ యూనిట్‌లోని ${n} పదాలు మళ్ళీ: జతలను కలపండి, తర్వాత ఒక చిన్న క్విజ్.`,
        hear: 'శబ్దం ఆన్ చేయండి: ప్రతి పదాన్ని విని, విన్నదాన్ని ఎంచుకోండి.',
        words: (n) => `ఈ స్థాయిలోని మొత్తం ${n} పదాలు మళ్ళీ: జతలను కలపండి, తర్వాత క్విజ్.`,
        sentences: 'ఈ స్థాయి వాక్యాలు మళ్ళీ, రెండు వైపులా.',
        checkpoint: (n) => `ఈ స్థాయి చివరి పరీక్ష: ${n} వాక్యాలు. స్థాయి పూర్తి చేయడానికి దీనిలో ఉత్తీర్ణులు కండి.`
    },
    ml: {
        vocab: 'പുതിയ വാക്കുകൾ, അവയുടെ അർത്ഥത്തോടൊപ്പം. അർത്ഥം കാണാൻ കാർഡിൽ തൊടുക, വാക്ക് കേൾക്കാൻ സ്പീക്കറിൽ തൊടുക.',
        write: 'ഓരോ വാക്യവും വായിച്ച്, നിങ്ങൾ പഠിക്കുന്ന ഭാഷയിൽ എഴുതുക.',
        read: 'ഓരോ വാക്യവും വായിച്ച് അതിന്റെ അർത്ഥം നിങ്ങളുടെ ഭാഷയിൽ എഴുതുക.',
        tiles: 'വാക്ക് ടൈലുകൾ ക്രമത്തിൽ തൊടുക, അല്ലെങ്കിൽ ഉത്തരം ടൈപ്പ് ചെയ്യുക.',
        close: 'ഏതാണ്ട് ശരിയായ ഉത്തരവും സ്വീകരിക്കും: മാതൃകാ ഉത്തരവും ചെറിയ വ്യത്യാസങ്ങളും കാണാം.',
        unit: (n) => `ഈ യൂണിറ്റിലെ ${n} വാക്കുകൾ വീണ്ടും: ജോഡികൾ ചേർക്കുക, പിന്നെ ഒരു ചെറിയ ക്വിസ്.`,
        hear: 'ശബ്ദം ഓണാക്കുക: ഓരോ വാക്കും കേട്ട്, കേട്ടത് തിരഞ്ഞെടുക്കുക.',
        words: (n) => `ഈ നിലയിലെ എല്ലാ ${n} വാക്കുകളും വീണ്ടും: ജോഡികൾ ചേർക്കുക, പിന്നെ ക്വിസ്.`,
        sentences: 'ഈ നിലയിലെ വാക്യങ്ങൾ വീണ്ടും, രണ്ടു ദിശയിലും.',
        checkpoint: (n) => `ഈ നിലയിലെ അവസാന പരീക്ഷ: ${n} വാക്യങ്ങൾ. നില പൂർത്തിയാക്കാൻ ഇതിൽ വിജയിക്കുക.`
    },
    mr: {
        vocab: 'नवे शब्द, त्यांच्या अर्थासह. अर्थ पाहण्यासाठी कार्डवर टॅप करा, आणि शब्द ऐकण्यासाठी स्पीकरवर.',
        write: 'प्रत्येक वाक्य वाचा आणि तुम्ही शिकत असलेल्या भाषेत लिहा.',
        read: 'प्रत्येक वाक्य वाचा आणि त्याचा अर्थ तुमच्या भाषेत लिहा.',
        tiles: 'शब्दांच्या टाइल्स क्रमाने टॅप करा, किंवा तुमचे उत्तर टाइप करा.',
        close: 'जवळजवळ बरोबर उत्तरही चालते: तुम्हाला नमुना उत्तर आणि लहान फरक दिसतील.',
        unit: (n) => `या घटकातील ${n} शब्द पुन्हा: जोड्या जुळवा, मग एक छोटी प्रश्नमंजुषा.`,
        hear: 'आवाज सुरू करा: प्रत्येक शब्द ऐका आणि ऐकलेला शब्द निवडा.',
        words: (n) => `या स्तरातील सर्व ${n} शब्द पुन्हा: जोड्या जुळवा, मग प्रश्नमंजुषा.`,
        sentences: 'या स्तरातील वाक्ये पुन्हा, दोन्ही बाजूंनी.',
        checkpoint: (n) => `या स्तराची शेवटची परीक्षा: ${n} वाक्ये. स्तर पूर्ण करण्यासाठी ही उत्तीर्ण व्हा.`
    },
    bn: {
        vocab: 'নতুন শব্দ, তাদের মানেসহ। মানে দেখতে কার্ডে ট্যাপ করুন, আর শব্দ শুনতে স্পিকারে।',
        write: 'প্রতিটি বাক্য পড়ুন আর আপনি যে ভাষা শিখছেন সেই ভাষায় লিখুন।',
        read: 'প্রতিটি বাক্য পড়ুন আর তার মানে আপনার ভাষায় লিখুন।',
        tiles: 'শব্দের টাইলগুলো ক্রমানুসারে ট্যাপ করুন, অথবা উত্তর টাইপ করুন।',
        close: 'প্রায় সঠিক উত্তরও গ্রহণযোগ্য: আপনি নমুনা উত্তর আর ছোট পার্থক্যগুলো দেখবেন।',
        unit: (n) => `এই ইউনিটের ${n}টি শব্দ আবার: জোড়া মেলান, তারপর একটি ছোট কুইজ।`,
        hear: 'শব্দ চালু করুন: প্রতিটি শব্দ শুনুন আর যেটি শুনলেন সেটি বেছে নিন।',
        words: (n) => `এই স্তরের সব ${n}টি শব্দ আবার: জোড়া মেলান, তারপর কুইজ।`,
        sentences: 'এই স্তরের বাক্যগুলো আবার, দুই দিক থেকেই।',
        checkpoint: (n) => `এই স্তরের শেষ পরীক্ষা: ${n}টি বাক্য। স্তর শেষ করতে এতে পাস করুন।`
    },
    gu: {
        vocab: 'નવા શબ્દો, તેમના અર્થ સાથે. અર્થ જોવા માટે કાર્ડ પર ટૅપ કરો, અને શબ્દ સાંભળવા સ્પીકર પર.',
        write: 'દરેક વાક્ય વાંચો અને તમે જે ભાષા શીખી રહ્યા છો તેમાં લખો.',
        read: 'દરેક વાક્ય વાંચો અને તેનો અર્થ તમારી ભાષામાં લખો.',
        tiles: 'શબ્દોની ટાઇલ્સ ક્રમમાં ટૅપ કરો, અથવા તમારો જવાબ ટાઇપ કરો.',
        close: 'લગભગ સાચો જવાબ પણ ચાલે: તમને નમૂનારૂપ જવાબ અને નાના તફાવતો દેખાશે.',
        unit: (n) => `આ એકમના ${n} શબ્દો ફરીથી: જોડીઓ મેળવો, પછી એક નાની ક્વિઝ.`,
        hear: 'અવાજ ચાલુ કરો: દરેક શબ્દ સાંભળો અને સાંભળેલો શબ્દ પસંદ કરો.',
        words: (n) => `આ સ્તરના બધા ${n} શબ્દો ફરીથી: જોડીઓ મેળવો, પછી ક્વિઝ.`,
        sentences: 'આ સ્તરના વાક્યો ફરીથી, બંને દિશામાં.',
        checkpoint: (n) => `આ સ્તરની છેલ્લી કસોટી: ${n} વાક્યો. સ્તર પૂરું કરવા તેમાં પાસ થાઓ.`
    },
    pa: {
        vocab: 'ਨਵੇਂ ਸ਼ਬਦ, ਉਨ੍ਹਾਂ ਦੇ ਅਰਥਾਂ ਨਾਲ। ਅਰਥ ਦੇਖਣ ਲਈ ਕਾਰਡ ਨੂੰ ਛੂਹੋ, ਅਤੇ ਸ਼ਬਦ ਸੁਣਨ ਲਈ ਸਪੀਕਰ ਨੂੰ।',
        write: 'ਹਰ ਵਾਕ ਪੜ੍ਹੋ ਅਤੇ ਉਸਨੂੰ ਉਸ ਭਾਸ਼ਾ ਵਿੱਚ ਲਿਖੋ ਜੋ ਤੁਸੀਂ ਸਿੱਖ ਰਹੇ ਹੋ।',
        read: 'ਹਰ ਵਾਕ ਪੜ੍ਹੋ ਅਤੇ ਉਸਦਾ ਅਰਥ ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਲਿਖੋ।',
        tiles: 'ਸ਼ਬਦਾਂ ਦੀਆਂ ਟਾਈਲਾਂ ਕ੍ਰਮ ਵਿੱਚ ਛੂਹੋ, ਜਾਂ ਆਪਣਾ ਜਵਾਬ ਟਾਈਪ ਕਰੋ।',
        close: 'ਲਗਭਗ ਸਹੀ ਜਵਾਬ ਵੀ ਮੰਨਿਆ ਜਾਂਦਾ ਹੈ: ਤੁਸੀਂ ਨਮੂਨਾ ਜਵਾਬ ਅਤੇ ਛੋਟੇ ਫ਼ਰਕ ਦੇਖੋਗੇ।',
        unit: (n) => `ਇਸ ਇਕਾਈ ਦੇ ${n} ਸ਼ਬਦ ਫਿਰ ਤੋਂ: ਜੋੜੇ ਮਿਲਾਓ, ਫਿਰ ਇੱਕ ਛੋਟਾ ਕੁਇਜ਼।`,
        hear: 'ਆਵਾਜ਼ ਚਾਲੂ ਕਰੋ: ਹਰ ਸ਼ਬਦ ਸੁਣੋ ਅਤੇ ਜੋ ਸੁਣਿਆ ਉਹ ਚੁਣੋ।',
        words: (n) => `ਇਸ ਪੱਧਰ ਦੇ ਸਾਰੇ ${n} ਸ਼ਬਦ ਫਿਰ ਤੋਂ: ਜੋੜੇ ਮਿਲਾਓ, ਫਿਰ ਕੁਇਜ਼।`,
        sentences: 'ਇਸ ਪੱਧਰ ਦੇ ਵਾਕ ਫਿਰ ਤੋਂ, ਦੋਹਾਂ ਪਾਸਿਆਂ ਤੋਂ।',
        checkpoint: (n) => `ਇਸ ਪੱਧਰ ਦੀ ਆਖ਼ਰੀ ਪਰੀਖਿਆ: ${n} ਵਾਕ। ਪੱਧਰ ਪੂਰਾ ਕਰਨ ਲਈ ਇਸਨੂੰ ਪਾਸ ਕਰੋ।`
    },
    or: {
        vocab: 'ନୂଆ ଶବ୍ଦ, ସେମାନଙ୍କ ଅର୍ଥ ସହିତ। ଅର୍ଥ ଦେଖିବାକୁ କାର୍ଡ ଛୁଅନ୍ତୁ, ଶବ୍ଦ ଶୁଣିବାକୁ ସ୍ପିକର ଛୁଅନ୍ତୁ।',
        write: 'ପ୍ରତ୍ୟେକ ବାକ୍ୟ ପଢ଼ନ୍ତୁ ଏବଂ ଆପଣ ଶିଖୁଥିବା ଭାଷାରେ ଲେଖନ୍ତୁ।',
        read: 'ପ୍ରତ୍ୟେକ ବାକ୍ୟ ପଢ଼ନ୍ତୁ ଏବଂ ତାର ଅର୍ଥ ଆପଣଙ୍କ ଭାଷାରେ ଲେଖନ୍ତୁ।',
        tiles: 'ଶବ୍ଦ ଟାଇଲ୍‌ଗୁଡ଼ିକୁ କ୍ରମରେ ଛୁଅନ୍ତୁ, କିମ୍ବା ଉତ୍ତର ଟାଇପ୍ କରନ୍ତୁ।',
        close: 'ପ୍ରାୟ ଠିକ୍ ଉତ୍ତର ମଧ୍ୟ ଗ୍ରହଣୀୟ: ଆପଣ ନମୁନା ଉତ୍ତର ଓ ଛୋଟ ପାର୍ଥକ୍ୟ ଦେଖିବେ।',
        unit: (n) => `ଏହି ୟୁନିଟ୍‌ର ${n}ଟି ଶବ୍ଦ ପୁଣି: ଯୋଡ଼ି ମିଳାନ୍ତୁ, ତା’ପରେ ଏକ ଛୋଟ କୁଇଜ୍।`,
        hear: 'ଶବ୍ଦ ଚାଲୁ କରନ୍ତୁ: ପ୍ରତ୍ୟେକ ଶବ୍ଦ ଶୁଣନ୍ତୁ ଓ ଶୁଣିଥିବାଟି ବାଛନ୍ତୁ।',
        words: (n) => `ଏହି ସ୍ତରର ସମସ୍ତ ${n}ଟି ଶବ୍ଦ ପୁଣି: ଯୋଡ଼ି ମିଳାନ୍ତୁ, ତା’ପରେ କୁଇଜ୍।`,
        sentences: 'ଏହି ସ୍ତରର ବାକ୍ୟ ପୁଣି, ଉଭୟ ଦିଗରୁ।',
        checkpoint: (n) => `ଏହି ସ୍ତରର ଶେଷ ପରୀକ୍ଷା: ${n}ଟି ବାକ୍ୟ। ସ୍ତର ଶେଷ କରିବାକୁ ଏଥିରେ ଉତ୍ତୀର୍ଣ୍ଣ ହୁଅନ୍ତୁ।`
    },
    ur: {
        vocab: 'نئے الفاظ، ان کے معنی کے ساتھ۔ معنی دیکھنے کے لیے کارڈ پر ٹیپ کریں، اور لفظ سننے کے لیے اسپیکر پر۔',
        write: 'ہر جملہ پڑھیے اور اسے اس زبان میں لکھیے جو آپ سیکھ رہے ہیں۔',
        read: 'ہر جملہ پڑھیے اور اس کا مطلب اپنی زبان میں لکھیے۔',
        tiles: 'الفاظ کی ٹائلیں ترتیب سے ٹیپ کریں، یا اپنا جواب ٹائپ کریں۔',
        close: 'تقریباً صحیح جواب بھی مانا جاتا ہے: آپ کو نمونہ جواب اور چھوٹے فرق دکھائی دیں گے۔',
        unit: (n) => `اس یونٹ کے ${n} الفاظ دوبارہ: جوڑے ملائیے، پھر ایک چھوٹا کوئز۔`,
        hear: 'آواز چالو کریں: ہر لفظ سنیے اور جو سنا اسے چنیے۔',
        words: (n) => `اس سطح کے تمام ${n} الفاظ دوبارہ: جوڑے ملائیے، پھر کوئز۔`,
        sentences: 'اس سطح کے جملے دوبارہ، دونوں طرف سے۔',
        checkpoint: (n) => `اس سطح کا آخری امتحان: ${n} جملے۔ سطح مکمل کرنے کے لیے اسے پاس کیجیے۔`
    },
    es: {
        vocab: 'Palabras nuevas, con su significado. Toca una tarjeta para ver el significado y el altavoz para oír la palabra.',
        write: 'Lee cada frase y escríbela en el idioma que estás aprendiendo.',
        read: 'Lee cada frase y escribe lo que significa en tu idioma.',
        tiles: 'Toca las fichas de palabras en orden, o escribe tu respuesta.',
        close: 'Una respuesta cercana cuenta: verás la respuesta modelo y las pequeñas diferencias.',
        unit: (n) => `Las ${n} palabras de esta unidad otra vez: une las parejas y luego un pequeño examen.`,
        hear: 'Activa el sonido: escucha cada palabra y elige la que oyes.',
        words: (n) => `Las ${n} palabras de este nivel otra vez: une las parejas y luego el examen.`,
        sentences: 'Las frases de este nivel otra vez, en los dos sentidos.',
        checkpoint: (n) => `Un último examen de este nivel: ${n} frases. Apruébalo para terminar el nivel.`
    },
    fr: {
        vocab: 'De nouveaux mots, avec leur sens. Touche une carte pour voir le sens, et le haut-parleur pour entendre le mot.',
        write: 'Lis chaque phrase et écris-la dans la langue que tu apprends.',
        read: 'Lis chaque phrase et écris ce qu’elle veut dire dans ta langue.',
        tiles: 'Touche les mots dans l’ordre, ou tape ta réponse.',
        close: 'Une réponse proche compte : tu verras la réponse modèle et les petites différences.',
        unit: (n) => `Les ${n} mots de cette unité à nouveau : associe les paires, puis un petit quiz.`,
        hear: 'Active le son : écoute chaque mot et choisis celui que tu entends.',
        words: (n) => `Les ${n} mots de ce niveau à nouveau : associe les paires, puis le quiz.`,
        sentences: 'Les phrases de ce niveau à nouveau, dans les deux sens.',
        checkpoint: (n) => `Un dernier test sur ce niveau : ${n} phrases. Réussis-le pour terminer le niveau.`
    },
    de: {
        vocab: 'Neue Wörter mit ihrer Bedeutung. Tippe auf eine Karte, um die Bedeutung zu sehen, und auf den Lautsprecher, um das Wort zu hören.',
        write: 'Lies jeden Satz und schreib ihn in der Sprache, die du lernst.',
        read: 'Lies jeden Satz und schreib in deiner Sprache, was er bedeutet.',
        tiles: 'Tippe die Wörter der Reihe nach an oder tippe deine Antwort.',
        close: 'Eine fast richtige Antwort zählt: Du siehst die Musterantwort und die kleinen Unterschiede.',
        unit: (n) => `Die ${n} Wörter dieser Einheit noch einmal: Paare zuordnen, dann ein kurzes Quiz.`,
        hear: 'Schalte den Ton ein: Hör dir jedes Wort an und wähle das, das du hörst.',
        words: (n) => `Alle ${n} Wörter dieser Stufe noch einmal: Paare zuordnen, dann das Quiz.`,
        sentences: 'Die Sätze dieser Stufe noch einmal, in beide Richtungen.',
        checkpoint: (n) => `Ein letzter Test zu dieser Stufe: ${n} Sätze. Bestehe ihn, um die Stufe abzuschließen.`
    },
    pt: {
        vocab: 'Palavras novas, com o significado. Toque num cartão para ver o significado e no alto-falante para ouvir a palavra.',
        write: 'Leia cada frase e escreva-a na língua que você está aprendendo.',
        read: 'Leia cada frase e escreva o que ela significa na sua língua.',
        tiles: 'Toque nas peças de palavras na ordem, ou digite sua resposta.',
        close: 'Uma resposta próxima conta: você verá a resposta modelo e as pequenas diferenças.',
        unit: (n) => `As ${n} palavras desta unidade de novo: combine os pares e depois um pequeno quiz.`,
        hear: 'Ligue o som: ouça cada palavra e escolha a que você ouviu.',
        words: (n) => `Todas as ${n} palavras deste nível de novo: combine os pares e depois o quiz.`,
        sentences: 'As frases deste nível de novo, nos dois sentidos.',
        checkpoint: (n) => `Um último teste deste nível: ${n} frases. Passe nele para concluir o nível.`
    },
    ru: {
        vocab: 'Новые слова с их значением. Нажмите на карточку, чтобы увидеть значение, и на динамик, чтобы услышать слово.',
        write: 'Прочитайте каждое предложение и напишите его на языке, который вы изучаете.',
        read: 'Прочитайте каждое предложение и напишите, что оно значит, на своём языке.',
        tiles: 'Нажимайте на слова по порядку или напечатайте ответ.',
        close: 'Почти верный ответ засчитывается: вы увидите образец и небольшие различия.',
        unit: () => 'Слова этого раздела ещё раз: соедините пары, потом короткий тест.',
        hear: 'Включите звук: слушайте каждое слово и выбирайте то, что услышали.',
        words: () => 'Все слова этого уровня ещё раз: соедините пары, потом тест.',
        sentences: 'Предложения этого уровня ещё раз, в обе стороны.',
        checkpoint: () => 'Последний тест этого уровня. Сдайте его, чтобы закончить уровень.'
    },
    ar: {
        vocab: 'كلمات جديدة مع معانيها. اضغط على البطاقة لترى المعنى، وعلى السماعة لتسمع الكلمة.',
        write: 'اقرأ كل جملة واكتبها باللغة التي تتعلمها.',
        read: 'اقرأ كل جملة واكتب معناها بلغتك.',
        tiles: 'اضغط على بطاقات الكلمات بالترتيب، أو اكتب إجابتك.',
        close: 'الإجابة القريبة تُحتسب: سترى الإجابة النموذجية والفروق الصغيرة.',
        unit: () => 'كلمات هذه الوحدة مرة أخرى: طابق الأزواج، ثم اختبار قصير.',
        hear: 'شغّل الصوت: استمع إلى كل كلمة واختر الكلمة التي تسمعها.',
        words: () => 'كل كلمات هذا المستوى مرة أخرى: طابق الأزواج، ثم الاختبار.',
        sentences: 'جمل هذا المستوى مرة أخرى، في الاتجاهين.',
        checkpoint: () => 'اختبار أخير لهذا المستوى. انجح فيه لتنهي المستوى.'
    },
    zh: {
        vocab: '新词和它们的意思。点卡片看意思，点喇叭听读音。',
        write: '读每个句子，用你正在学的语言写出来。',
        read: '读每个句子，用你的语言写出它的意思。',
        tiles: '按顺序点词块，或者直接输入答案。',
        close: '接近的答案也算对：你会看到参考答案和细小的差别。',
        unit: (n) => `再练一次本单元的${n}个词：先配对，再做个小测验。`,
        hear: '打开声音：听每个词，选出你听到的那个。',
        words: (n) => `再练一次本级的全部${n}个词：先配对，再做测验。`,
        sentences: '再练一次本级的句子，两个方向都有。',
        checkpoint: (n) => `本级最后的测试：${n}个句子。通过就完成本级。`
    },
    ja: {
        vocab: '新しい言葉と意味です。カードをタップすると意味が、スピーカーをタップすると発音が聞けます。',
        write: 'それぞれの文を読んで、学んでいる言語で書いてください。',
        read: 'それぞれの文を読んで、意味を自分の言葉で書いてください。',
        tiles: '単語カードを順番にタップするか、答えを入力してください。',
        close: '近い答えも正解になります。模範解答と小さな違いが表示されます。',
        unit: (n) => `このユニットの${n}語をもう一度：ペアを合わせてから、短いクイズ。`,
        hear: '音をオンにして、それぞれの言葉を聞いて、聞こえたものを選んでください。',
        words: (n) => `このレベルの${n}語をすべてもう一度：ペアを合わせてから、クイズ。`,
        sentences: 'このレベルの文をもう一度、両方向で。',
        checkpoint: (n) => `このレベルの最後のテスト：${n}文。合格するとレベル完了です。`
    },
    ko: {
        vocab: '새 단어와 그 뜻이에요. 카드를 누르면 뜻을, 스피커를 누르면 소리를 들을 수 있어요.',
        write: '각 문장을 읽고 배우고 있는 언어로 써 보세요.',
        read: '각 문장을 읽고 그 뜻을 자신의 언어로 써 보세요.',
        tiles: '단어 조각을 순서대로 누르거나 답을 입력하세요.',
        close: '비슷한 답도 정답이에요. 모범 답안과 작은 차이를 보여 줘요.',
        unit: (n) => `이 단원의 단어 ${n}개를 다시: 짝을 맞춘 다음 짧은 퀴즈.`,
        hear: '소리를 켜세요: 각 단어를 듣고 들은 단어를 고르세요.',
        words: (n) => `이 단계의 단어 ${n}개를 모두 다시: 짝을 맞춘 다음 퀴즈.`,
        sentences: '이 단계의 문장을 다시, 양방향으로.',
        checkpoint: (n) => `이 단계의 마지막 시험: 문장 ${n}개. 통과하면 이 단계를 마쳐요.`
    }
};
