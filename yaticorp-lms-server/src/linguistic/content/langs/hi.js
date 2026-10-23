/**
 * Linguistic Ability — Hindi as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */

// Tips shared by the three Hindi → English lessons, and by the three English → Hindi lessons.
const TO_ENGLISH_POINTS = [
    'Hindi puts the verb at the end: "मैं स्कूल जाता हूँ" (I school go). English puts it after the subject: "I go to school."',
    'English needs a, an and the, which Hindi does not have. Hindi does have है, हूँ, हैं (is, am, are), but at the end of the sentence; in English they come right after the subject.',
    'Watch the tense: जाता हूँ (go), जाऊँगा (will go), गया (went), जा रहा हूँ (am going). कल means yesterday or tomorrow; the verb tells you which.',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const TO_HINDI_POINTS = [
    'Move the verb to the end: "I go to school" → "मैं स्कूल जाता हूँ।" A girl or woman says "मैं स्कूल जाती हूँ।"',
    'There are no words for a, an or the in Hindi; leave them out. (एक means "one"; it is used for "a" only sometimes.)',
    'Choose the polite form for elders and strangers: आप, आइए, दीजिए. With friends you may use तुम, आओ, दो.',
    'Type in Hindi with your phone\'s Hindi keyboard, or use the Hindi letters under the answer box. End a sentence with the danda (।).'
];

module.exports = {
    code: 'hi', name: 'Hindi', native: 'हिन्दी', locale: 'hi-IN',
    words: {
        'vocab-beginner-1': {
            family: 'परिवार',
            mother: 'माँ, माता',
            father: 'पिता',
            house: 'घर, मकान',
            food: 'खाना, भोजन',
            happy: 'खुश, प्रसन्न',
            big: 'बड़ा',
            small: 'छोटा'
        },
        'vocab-beginner-2': {
            book: 'किताब, पुस्तक',
            teacher: 'शिक्षक, शिक्षिका',
            student: 'विद्यार्थी, छात्र',
            friend: 'दोस्त, मित्र',
            read: 'पढ़ना',
            write: 'लिखना',
            early: 'जल्दी',
            easy: 'आसान, सरल'
        },
        'vocab-intermediate-1': {
            honest: 'ईमानदार',
            polite: 'विनम्र',
            curious: 'जिज्ञासु',
            confident: 'आत्मविश्वासी',
            patient: 'धैर्यवान',
            grateful: 'आभारी, कृतज्ञ',
            anxious: 'चिंतित, बेचैन',
            generous: 'उदार'
        },
        'vocab-intermediate-2': {
            deadline: 'समय-सीमा, अंतिम तिथि',
            improve: 'सुधारना',
            achieve: 'हासिल करना, प्राप्त करना',
            schedule: 'समय-सारणी',
            opportunity: 'अवसर, मौका',
            responsible: 'ज़िम्मेदार',
            discuss: 'चर्चा करना',
            result: 'परिणाम, नतीजा'
        },
        'vocab-advanced-1': {
            negotiate: 'बातचीत करना, मोलभाव करना',
            collaborate: 'सहयोग करना, मिलकर काम करना',
            efficient: 'कुशल, दक्ष',
            feasible: 'व्यवहार्य, संभव',
            comprehensive: 'व्यापक, विस्तृत',
            prioritise: 'प्राथमिकता देना',
            ambiguous: 'अस्पष्ट',
            persuade: 'मनाना, राज़ी करना'
        },
        'vocab-advanced-2': {
            sustainable: 'टिकाऊ, सतत',
            consequence: 'परिणाम, नतीजा',
            perspective: 'दृष्टिकोण, नज़रिया',
            inevitable: 'अपरिहार्य, अटल',
            substantial: 'काफ़ी, उल्लेखनीय',
            advocate: 'समर्थन करना, वकालत करना',
            diverse: 'विविध, विविधतापूर्ण',
            integrity: 'ईमानदारी, सत्यनिष्ठा'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Hindi has no words for a, an or the (एक means "one"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Hindi the verb comes last: "रवि किताबें पढ़ता है।" In English the verb comes right after the subject.' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Hindi word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Hindi.',
            points: [...TO_HINDI_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Hindi verb ending to choose the English tense.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Hindi. Use the polite form for requests: दीजिए, बोलिए, करें.',
            points: [...TO_HINDI_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Hindi. Passive forms such as किया जाएगा (will be done) and किया गया है (has been done) are common in notices.',
            points: [...TO_HINDI_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'पानी', explanation: 'पानी means water.' },
            i2: { source: 'किताब', explanation: 'किताब (or पुस्तक) means book.' },
            i3: { source: 'मेरा नाम रानी है।', explanation: 'मेरा = my, नाम = name, है = is. In English "is" comes before the name, not at the end.' },
            i4: { source: 'आप कैसे हैं?', explanation: 'This is the common polite greeting: कैसे = how, हैं = are. English puts "are" right after "How".' },
            i5: { source: 'मैं ठीक हूँ।', explanation: 'ठीक = fine or well, हूँ = am. In English "am" comes right after "I".' },
            i6: { source: 'यह मेरा घर है।', explanation: 'यह = this, घर = house or home. The verb है (is) moves to after "This".' },
            q1: { source: 'मैं स्कूल जाता हूँ।', explanation: 'जाता हूँ means "I go" (a girl says जाती हूँ). The verb moves to after "I", and English adds "to" before school.' },
            q2: { source: 'वह मेरी छोटी बहन है।', explanation: 'छोटी बहन is a younger sister (बड़ी बहन is an elder sister). वह can be "he" or "she"; here it is "she".' },
            q3: { source: 'कृपया दरवाज़ा बंद कीजिए।', explanation: 'कृपया = please, दरवाज़ा = door, बंद कीजिए = close (polite).' },
            q4: { source: 'धन्यवाद।', explanation: 'धन्यवाद is the polite way to say thank you; शुक्रिया is also common.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'दोस्त', accepted: ['मित्र', 'सहेली'], explanation: 'Friend is दोस्त (or मित्र). A girl\'s female friend is also called सहेली.' },
            i2: { model: 'स्कूल', accepted: ['विद्यालय', 'पाठशाला'], explanation: 'School is स्कूल; the formal Hindi word is विद्यालय.' },
            i3: { model: 'सुप्रभात।', accepted: ['शुभ प्रभात।'], explanation: 'सुप्रभात (or शुभ प्रभात) is "good morning". नमस्ते is a greeting for any time of day, not only the morning.' },
            i4: { model: 'मैं विद्यार्थी हूँ।', accepted: ['मैं छात्र हूँ।', 'मैं छात्रा हूँ।', 'मैं एक विद्यार्थी हूँ।', 'मैं एक छात्र हूँ।'], explanation: 'हूँ = am, and it comes at the end. Hindi needs no word for "a" (एक is optional). A girl may say छात्रा.' },
            i5: { model: 'आपका नाम क्या है?', accepted: ['तुम्हारा नाम क्या है?'], explanation: 'आपका is polite; with a friend you can say तुम्हारा. क्या = what.' },
            i6: { model: 'खाना स्वादिष्ट है।', accepted: ['भोजन स्वादिष्ट है।', 'खाना स्वादिष्ट बना है।'], explanation: 'स्वाद = taste; स्वादिष्ट = tasty. "Is" (है) comes at the end.' },
            q1: { model: 'बस स्टैंड कहाँ है?', accepted: ['बस अड्डा कहाँ है?'], explanation: 'कहाँ = where; कहाँ है = where is (it). बस अड्डा is the Hindi word for bus stand.' },
            q2: { model: 'मुझे आम पसंद हैं।', accepted: ['मुझे आम पसंद है।', 'मुझे आम अच्छे लगते हैं।'], explanation: 'Hindi says "to me, mangoes are liked": मुझे … पसंद हैं.' },
            q3: { model: 'यहाँ आइए।', accepted: ['यहाँ आओ।', 'इधर आइए।', 'इधर आओ।'], explanation: 'आइए is polite; आओ is used with friends and children.' },
            q4: { model: 'बारिश हो रही है।', accepted: ['वर्षा हो रही है।', 'पानी बरस रहा है।'], explanation: 'Hindi says "rain is happening": बारिश हो रही है. रही है shows that it is going on now.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'मैंने कल फ़िल्म देखी।', explanation: 'देखी is past tense: watched (or saw). कल means yesterday or tomorrow; the past tense tells you it is yesterday.' },
            i2: { source: 'वह हर सुबह दौड़ता है।', explanation: 'A habit takes the simple present: दौड़ता है = runs. दौड़ता shows the runner is male, so वह is "he".' },
            i3: { source: 'हम कल मैसूर जाएँगे।', explanation: 'जाएँगे is the future: will go. So कल here means tomorrow.' },
            i4: { source: 'वह किताब पढ़ रही है।', explanation: 'पढ़ रही है shows an action happening now: is reading. रही shows the reader is female, so वह is "she".' },
            i5: { source: 'बच्चे मैदान में खेल रहे हैं।', explanation: 'मैदान = ground or field; खेल रहे हैं = are playing.' },
            i6: { source: 'क्या आपने खाना खा लिया?', explanation: 'A polite question about eating; क्या at the start makes a yes/no question. "Have you eaten?" is just as natural.' },
            q1: { source: 'मुझे अंग्रेज़ी बोलना पसंद है।', explanation: 'मुझे … पसंद है = I like; बोलना = to speak.' },
            q2: { source: 'वे दो साल से बेंगलुरु में रह रहे हैं।', explanation: 'से with a length of time (दो साल से) and an ongoing action (रह रहे हैं) needs the present perfect continuous. वे can be "they" or a respectful "he".' },
            q3: { source: 'ट्रेन समय पर आई।', explanation: 'समय पर = on time; आई = came (ट्रेन is feminine in Hindi, so आई, not आया).' },
            q4: { source: 'कृपया धीरे बोलिए।', explanation: 'धीरे = slowly; बोलिए is the polite form of "speak".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'कृपया मुझे थोड़ा पानी दीजिए।', accepted: ['कृपया मुझे थोड़ा पानी दो।', 'कृपया मुझे थोड़ा पानी दें।', 'मुझे थोड़ा पानी दीजिए।', 'कृपया थोड़ा पानी दीजिए।'], explanation: 'दीजिए is the polite form of "give" (दो with friends); थोड़ा = some, a little.' },
            i2: { model: 'कक्षा नौ बजे शुरू होती है।', accepted: ['कक्षा नौ बजे प्रारंभ होती है।', 'क्लास नौ बजे शुरू होती है।', 'कक्षा 9 बजे शुरू होती है।'], explanation: 'नौ बजे = at nine o\'clock; शुरू होती है = starts (होती, because कक्षा is feminine).' },
            i3: { model: 'मैं अपनी किताब घर पर भूल गया।', accepted: ['मैं अपनी किताब घर पर भूल गई।', 'मैं अपनी किताब घर में भूल गया।', 'मैं अपनी किताब घर में भूल गई।', 'मैं अपनी पुस्तक घर पर भूल गया।'], explanation: 'भूल गया = forgot (a girl says भूल गई). For your own thing Hindi says अपनी, not मेरी: अपनी किताब = my book.' },
            i4: { model: 'इसकी कीमत कितनी है?', accepted: ['यह कितने का है?', 'इसका दाम कितना है?', 'यह कितने की है?'], explanation: 'कीमत = price; कितनी = how much (कितना or कितनी, to match the noun).' },
            i5: { model: 'मेरी परीक्षा अगले हफ़्ते है।', accepted: ['अगले हफ़्ते मेरी परीक्षा है।', 'मेरी परीक्षा अगले सप्ताह है।', 'अगले सप्ताह मेरी परीक्षा है।'], explanation: 'अगले हफ़्ते (or अगले सप्ताह) = next week.' },
            i6: { model: 'क्या आप मेरी मदद कर सकते हैं?', accepted: ['क्या आप मेरी सहायता कर सकते हैं?', 'क्या तुम मेरी मदद कर सकते हो?', 'आप मेरी मदद कर सकते हैं?', 'क्या आप मेरी मदद कर सकती हैं?'], explanation: 'मदद करना = to help; कर सकते हैं = can (you) do? Hindi says "do my help": मेरी मदद.' },
            q1: { model: 'हम पुस्तकालय जा रहे हैं।', accepted: ['हम लाइब्रेरी जा रहे हैं।', 'हम पुस्तकालय जा रही हैं।'], explanation: 'पुस्तकालय = library; जा रहे हैं = are going. Hindi needs no word for "to" here.' },
            q2: { model: 'वह कन्नड़ बहुत अच्छी तरह बोलती है।', accepted: ['वह बहुत अच्छी कन्नड़ बोलती है।', 'वह कन्नड़ बहुत अच्छे से बोलती है।', 'वे कन्नड़ बहुत अच्छी तरह बोलती हैं।'], explanation: 'बहुत अच्छी तरह = very well; बोलती है = speaks (बोलती, because "she" is the subject).' },
            q3: { model: 'पानी बर्बाद न करें।', accepted: ['पानी बर्बाद मत कीजिए।', 'पानी बर्बाद न कीजिए।', 'पानी व्यर्थ न करें।', 'पानी बर्बाद मत करो।'], explanation: 'न करें = do not (polite, as on notices); with friends, मत करो. बर्बाद करना = to waste.' },
            q4: { model: 'दुकान दस बजे खुलती है।', accepted: ['दुकान 10 बजे खुलती है।'], explanation: 'खुलती है = opens (खुलती, because दुकान is feminine); दस बजे = at ten o\'clock.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'बैठक सोमवार तक के लिए स्थगित कर दी गई है।', explanation: 'कर दी गई है is passive: "has been …". स्थगित करना = postpone.' },
            i2: { source: 'कृपया रिपोर्ट शुक्रवार तक भेज दें।', explanation: 'तक with a day means "by" (not later than).' },
            i3: { source: 'देर से उत्तर देने के लिए क्षमा करें।', explanation: 'A common line in emails. क्षमा करें = sorry; देर से = late.' },
            i4: { source: 'हमारी टीम ने परियोजना समय पर पूरी की।', explanation: 'पूरी की = completed; परियोजना = project.' },
            i5: { source: 'मैंने पिछले साल अपनी डिग्री पूरी की। अब मैं एक सॉफ़्टवेयर कंपनी में नौकरी ढूँढ रहा हूँ। मुझे नई चीज़ें सीखने में बहुत रुचि है।', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'आपके सहयोग के लिए धन्यवाद।', explanation: 'सहयोग = cooperation; के लिए = for.' },
            q1: { source: 'इस समस्या को जल्द से जल्द हल किया जाएगा।', explanation: 'किया जाएगा is the future passive: "will be …". जल्द से जल्द = as soon as possible.' },
            q2: { source: 'मैं इस पद के लिए आवेदन करना चाहता हूँ।', explanation: 'पद = post or position; आवेदन करना = apply. चाहता हूँ (I want) is said politely as "I would like".' },
            q3: { source: 'उन्होंने बैठक में एक अच्छा सुझाव दिया।', explanation: 'उन्होंने can be "he" or "she" (said with respect) or "they".' },
            q4: { source: 'ग्राहकों की संतुष्टि ही हमारी पहली प्राथमिकता है।', explanation: 'संतुष्टि = satisfaction; प्राथमिकता = priority. ही adds emphasis.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'कंपनी ने एक नई नीति की घोषणा की है।', accepted: ['कंपनी ने नई नीति की घोषणा की है।', 'कंपनी ने एक नई नीति घोषित की है।', 'कंपनी ने नई नीति घोषित की है।'], explanation: 'नीति = policy; घोषणा की है = has announced. ने marks the doer with a past verb.' },
            i2: { model: 'शिक्षा सफलता की कुंजी है।', accepted: ['शिक्षा ही सफलता की कुंजी है।'], explanation: 'सफलता = success; कुंजी = key. "The key to success" becomes सफलता की कुंजी ("success\'s key").' },
            i3: { model: 'यदि कोई बदलाव हो, तो कृपया मुझे सूचित करें।', accepted: ['अगर कोई बदलाव हो, तो कृपया मुझे बताइए।', 'अगर कोई बदलाव हो, तो कृपया मुझे बताएँ।', 'यदि कोई परिवर्तन हो, तो कृपया मुझे सूचित करें।'], explanation: 'In Hindi the "if" part (यदि or अगर … तो) comes first. सूचित करना = to inform.' },
            i4: { model: 'हमें पर्यावरण की रक्षा करनी चाहिए।', accepted: ['हमें पर्यावरण की सुरक्षा करनी चाहिए।', 'हमें पर्यावरण का संरक्षण करना चाहिए।', 'हमें पर्यावरण को बचाना चाहिए।'], explanation: 'चाहिए = should. Hindi starts with हमें ("to us"): हमें … करनी चाहिए = we should do ….' },
            i5: { model: 'हमारे कॉलेज ने पिछले हफ़्ते एक रक्तदान शिविर का आयोजन किया। कई छात्रों और शिक्षकों ने इसमें भाग लिया। डॉक्टरों ने सभी को उनके सहयोग के लिए धन्यवाद दिया।', accepted: [], explanation: 'रक्तदान शिविर = blood donation camp; भाग लेना = take part. Compare your sentences with the model.' },
            i6: { model: 'मैं दो दिन की छुट्टी का अनुरोध करने के लिए लिख रहा हूँ।', accepted: ['मैं दो दिन की छुट्टी का अनुरोध करने के लिए लिख रही हूँ।', 'मैं दो दिन के अवकाश का अनुरोध करने के लिए लिख रहा हूँ।', 'मैं दो दिन की छुट्टी माँगने के लिए लिख रहा हूँ।', 'मैं दो दिन की छुट्टी माँगने के लिए लिख रही हूँ।'], explanation: 'छुट्टी (formal: अवकाश) = leave; अनुरोध करना = request. A woman writes लिख रही हूँ.' },
            q1: { model: 'कड़ी मेहनत का फल हमेशा मिलता है।', accepted: ['मेहनत का फल हमेशा मिलता है।', 'कड़ी मेहनत हमेशा रंग लाती है।', 'परिश्रम का फल सदा मिलता है।'], explanation: '"Pays off" means "gives a result": फल मिलता है. मेहनत रंग लाती है is another common way to say it.' },
            q2: { model: 'परिणाम कल घोषित किए जाएँगे।', accepted: ['नतीजे कल घोषित किए जाएँगे।', 'कल परिणाम घोषित किए जाएँगे।', 'परिणाम कल घोषित होंगे।', 'परिणामों की घोषणा कल की जाएगी।'], explanation: '"Will be announced" is the future passive: घोषित किए जाएँगे. Here कल means tomorrow.' },
            q3: { model: 'आपकी त्वरित प्रतिक्रिया के लिए धन्यवाद।', accepted: ['आपके त्वरित उत्तर के लिए धन्यवाद।', 'आपकी शीघ्र प्रतिक्रिया के लिए धन्यवाद।', 'जल्दी जवाब देने के लिए आपका धन्यवाद।'], explanation: 'त्वरित = quick; प्रतिक्रिया = response.' },
            q4: { model: 'सुरक्षा सबकी ज़िम्मेदारी है।', accepted: ['सुरक्षा सभी की ज़िम्मेदारी है।', 'सुरक्षा हर किसी की ज़िम्मेदारी है।', 'सुरक्षा सबकी जिम्मेदारी है।'], explanation: 'सुरक्षा = safety; सबकी = everyone\'s; ज़िम्मेदारी = responsibility.' }
        }
    },
    placement: {
        b4: { prompt: '"किताब" in English is…', explanation: 'किताब means book.' },
        a5: { prompt: '"बैठक स्थगित कर दी गई है" best translates as…', explanation: 'स्थगित करना means postpone, and कर दी गई है is passive: "has been".' }
    }
};
