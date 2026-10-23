/**
 * Linguistic Ability — Marathi as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */

// Tips shared by the three Marathi → English lessons, and by the three English → Marathi lessons.
const TO_ENGLISH_POINTS = [
    'Marathi puts the verb at the end: "मी शाळेत जातो" (I school-to go). English puts it after the subject: "I go to school."',
    'English needs a, an and the, which Marathi does not have. Marathi does have आहे, आहात, आहेत (am, is, are), but at the end of the sentence; in English they come right after the subject.',
    'Watch the tense: जातो (go), जाईन (will go), गेलो (went), जात आहे (am going). काल means yesterday and उद्या means tomorrow.',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const TO_MARATHI_POINTS = [
    'Move the verb to the end: "I go to school" → "मी शाळेत जातो." A girl or woman says "मी शाळेत जाते."',
    'There are no words for a, an or the in Marathi; leave them out. (एक means "one"; it is used for "a" only sometimes.)',
    'Choose the polite form for elders and strangers: तुम्ही, या, द्या. With friends you may use तू, ये, दे.',
    'Type in Marathi with your phone\'s Marathi keyboard, or use the Marathi letters under the answer box. End a sentence with a full stop (.), as Marathi does.'
];

module.exports = {
    code: 'mr', name: 'Marathi', native: 'मराठी', locale: 'mr-IN',
    words: {
        'vocab-beginner-1': {
            family: 'कुटुंब, परिवार',
            mother: 'आई',
            father: 'वडील, बाबा',
            house: 'घर',
            food: 'अन्न, जेवण',
            happy: 'आनंदी, खूश',
            big: 'मोठा',
            small: 'लहान, छोटा'
        },
        'vocab-beginner-2': {
            book: 'पुस्तक',
            teacher: 'शिक्षक, शिक्षिका',
            student: 'विद्यार्थी',
            friend: 'मित्र, मैत्रीण',
            read: 'वाचणे',
            write: 'लिहिणे',
            early: 'लवकर',
            easy: 'सोपा'
        },
        'vocab-intermediate-1': {
            honest: 'प्रामाणिक',
            polite: 'नम्र, विनयशील',
            curious: 'जिज्ञासू, उत्सुक',
            confident: 'आत्मविश्वासू',
            patient: 'संयमी, सहनशील',
            grateful: 'कृतज्ञ, आभारी',
            anxious: 'चिंताग्रस्त, अस्वस्थ',
            generous: 'उदार, दिलदार'
        },
        'vocab-intermediate-2': {
            deadline: 'अंतिम मुदत',
            improve: 'सुधारणे',
            achieve: 'साध्य करणे, मिळवणे',
            schedule: 'वेळापत्रक',
            opportunity: 'संधी',
            responsible: 'जबाबदार',
            discuss: 'चर्चा करणे',
            result: 'निकाल, परिणाम'
        },
        'vocab-advanced-1': {
            negotiate: 'वाटाघाटी करणे',
            collaborate: 'सहकार्य करणे, एकत्र काम करणे',
            efficient: 'कार्यक्षम',
            feasible: 'व्यवहार्य, शक्य',
            comprehensive: 'सर्वसमावेशक, व्यापक',
            prioritise: 'प्राधान्य देणे',
            ambiguous: 'संदिग्ध, अस्पष्ट',
            persuade: 'मन वळवणे, पटवून देणे'
        },
        'vocab-advanced-2': {
            sustainable: 'शाश्वत',
            consequence: 'परिणाम',
            perspective: 'दृष्टिकोन',
            inevitable: 'अपरिहार्य, अटळ',
            substantial: 'लक्षणीय, भरीव',
            advocate: 'पुरस्कार करणे, समर्थन करणे',
            diverse: 'वैविध्यपूर्ण',
            integrity: 'सचोटी, प्रामाणिकपणा'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Marathi has no words for a, an or the (एक means "one"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Marathi the verb comes last: "रवी पुस्तके वाचतो." In English the verb comes right after the subject.' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Marathi word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Marathi.',
            points: [...TO_MARATHI_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Marathi verb ending to choose the English tense.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Marathi. Use the polite form for requests: द्या, बोला, करू नका.',
            points: [...TO_MARATHI_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Marathi. Passive forms such as करण्यात येईल (will be done) and करण्यात आले आहे (has been done) are common in notices.',
            points: [...TO_MARATHI_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'पाणी', explanation: 'पाणी means water.' },
            i2: { source: 'पुस्तक', explanation: 'पुस्तक means book.' },
            i3: { source: 'माझे नाव राणी आहे.', explanation: 'माझे = my, नाव = name, आहे = is. In English "is" comes before the name, not at the end.' },
            i4: { source: 'तुम्ही कसे आहात?', explanation: 'This is the common polite greeting: कसे = how, आहात = are. English puts "are" right after "How".' },
            i5: { source: 'मी ठीक आहे.', explanation: 'ठीक = fine or well, आहे = am. In English "am" comes right after "I". मी मजेत आहे is also common.' },
            i6: { source: 'हे माझे घर आहे.', explanation: 'हे = this, घर = house or home. The verb आहे (is) moves to after "This".' },
            q1: { source: 'मी शाळेत जातो.', explanation: 'जातो means "I go" (a girl says जाते). The verb moves to after "I"; शाळेत (school + -त) becomes "to school".' },
            q2: { source: 'ती माझी धाकटी बहीण आहे.', explanation: 'धाकटी बहीण is a younger sister (मोठी बहीण or ताई is an elder sister). ती = she.' },
            q3: { source: 'कृपया दार बंद करा.', explanation: 'कृपया = please, दार = door, बंद करा = close (polite).' },
            q4: { source: 'धन्यवाद.', explanation: 'धन्यवाद is the polite way to say thank you; आभारी आहे (I am grateful) is also used.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'मित्र', accepted: ['मैत्रीण', 'दोस्त'], explanation: 'Friend is मित्र; a girl or woman friend is मैत्रीण.' },
            i2: { model: 'शाळा', accepted: ['विद्यालय'], explanation: 'School is शाळा; विद्यालय is a formal word, often used in school names.' },
            i3: { model: 'सुप्रभात.', accepted: ['शुभ सकाळ.', 'शुभ प्रभात.'], explanation: 'सुप्रभात (or शुभ सकाळ) is "good morning". नमस्कार is a greeting for any time of day, not only the morning.' },
            i4: { model: 'मी विद्यार्थी आहे.', accepted: ['मी विद्यार्थिनी आहे.', 'मी एक विद्यार्थी आहे.', 'मी एक विद्यार्थिनी आहे.'], explanation: 'आहे = am, and it comes at the end. Marathi needs no word for "a" (एक is optional). A girl may say विद्यार्थिनी.' },
            i5: { model: 'तुमचे नाव काय आहे?', accepted: ['तुझे नाव काय आहे?', 'तुमचं नाव काय आहे?', 'तुझं नाव काय आहे?', 'आपले नाव काय आहे?'], explanation: 'तुमचे is polite (आपले is very formal); with a friend you can say तुझे. काय = what.' },
            i6: { model: 'जेवण चविष्ट आहे.', accepted: ['अन्न चविष्ट आहे.', 'जेवण रुचकर आहे.', 'जेवण स्वादिष्ट आहे.'], explanation: 'चव = taste; चविष्ट = tasty. "Is" (आहे) comes at the end.' },
            q1: { model: 'बसस्थानक कुठे आहे?', accepted: ['बस स्थानक कुठे आहे?', 'बस स्टँड कुठे आहे?', 'बस स्टॅंड कुठे आहे?', 'एसटी स्टँड कुठे आहे?'], explanation: 'कुठे = where; कुठे आहे = where is (it). बसस्थानक is the Marathi word for bus stand; बस स्टँड is also used.' },
            q2: { model: 'मला आंबे आवडतात.', accepted: ['मला आंबा आवडतो.', 'मला आंबे खूप आवडतात.'], explanation: 'Marathi says "to me, mangoes are liked": मला … आवडतात. The verb agrees with आंबे (mangoes), not with "I".' },
            q3: { model: 'इकडे या.', accepted: ['इथे या.', 'इकडे ये.', 'इथे ये.'], explanation: 'या is polite; ये is used with friends and children.' },
            q4: { model: 'पाऊस पडत आहे.', accepted: ['पाऊस पडतोय.', 'पाऊस येत आहे.', 'पाऊस येतोय.'], explanation: 'Marathi says "rain is falling": पाऊस पडत आहे. पडत आहे shows that it is going on now; पडतोय is the short spoken form.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'मी काल चित्रपट पाहिला.', explanation: 'पाहिला is past tense: watched (or saw). काल = yesterday.' },
            i2: { source: 'तो रोज सकाळी धावतो.', explanation: 'A habit takes the simple present: धावतो = runs. रोज सकाळी = every morning; तो = he.' },
            i3: { source: 'आम्ही उद्या म्हैसूरला जाऊ.', explanation: 'उद्या = tomorrow; जाऊ is the future: (we) will go. -ला here means "to".' },
            i4: { source: 'ती पुस्तक वाचत आहे.', explanation: 'वाचत आहे shows an action happening now: is reading. ती = she.' },
            i5: { source: 'मुले मैदानावर खेळत आहेत.', explanation: 'मैदान = ground or field; खेळत आहेत = are playing.' },
            i6: { source: 'तुमचे जेवण झाले का?', explanation: 'A polite everyday question, literally "Has your meal happened?"; का at the end makes a yes/no question. "Have you eaten?" is just as natural.' },
            q1: { source: 'मला इंग्रजी बोलायला आवडते.', explanation: 'मला … आवडते = I like; बोलायला = to speak.' },
            q2: { source: 'ते दोन वर्षांपासून बंगळुरूमध्ये राहत आहेत.', explanation: '-पासून with a length of time (दोन वर्षांपासून) and an ongoing action (राहत आहेत) needs the present perfect continuous. ते can be "they" or a respectful "he".' },
            q3: { source: 'ट्रेन वेळेवर आली.', explanation: 'वेळेवर = on time; आली = came (ट्रेन is feminine in Marathi, so आली, not आला).' },
            q4: { source: 'कृपया हळू बोला.', explanation: 'हळू = slowly; बोला is the polite form of "speak".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'कृपया मला थोडे पाणी द्या.', accepted: ['कृपया मला थोडं पाणी द्या.', 'मला थोडे पाणी द्या.', 'कृपया थोडे पाणी द्या.', 'कृपया मला थोडे पाणी दे.'], explanation: 'द्या is the polite form of "give" (दे with friends); थोडे = some, a little.' },
            i2: { model: 'वर्ग नऊ वाजता सुरू होतो.', accepted: ['क्लास नऊ वाजता सुरू होतो.', 'तास नऊ वाजता सुरू होतो.', 'वर्ग 9 वाजता सुरू होतो.'], explanation: 'नऊ वाजता = at nine o\'clock; सुरू होतो = starts (होतो, because वर्ग is masculine).' },
            i3: { model: 'मी माझे पुस्तक घरी विसरलो.', accepted: ['मी माझे पुस्तक घरी विसरले.', 'मी पुस्तक घरी विसरलो.', 'माझे पुस्तक घरी विसरलो.', 'माझे पुस्तक घरी विसरले.'], explanation: 'विसरलो = (I) forgot (a girl says विसरले); घरी = at home. पुस्तक is neuter, so माझे पुस्तक = my book.' },
            i4: { model: 'याची किंमत किती आहे?', accepted: ['याची किंमत किती?', 'हे कितीला आहे?', 'हे किती रुपयांना आहे?'], explanation: 'किंमत = price; किती = how much. याची = its (of this).' },
            i5: { model: 'माझी परीक्षा पुढच्या आठवड्यात आहे.', accepted: ['पुढच्या आठवड्यात माझी परीक्षा आहे.', 'माझी परीक्षा पुढील आठवड्यात आहे.', 'पुढील आठवड्यात माझी परीक्षा आहे.'], explanation: 'पुढच्या आठवड्यात (or पुढील आठवड्यात) = next week.' },
            i6: { model: 'तुम्ही मला मदत करू शकाल का?', accepted: ['तुम्ही मला मदत कराल का?', 'तुम्ही मला मदत करू शकता का?', 'मला मदत कराल का?', 'तू मला मदत करशील का?'], explanation: 'मदत करणे = to help; करू शकाल का? = can (you) do? Marathi says "help to me": मला मदत.' },
            q1: { model: 'आम्ही ग्रंथालयात जात आहोत.', accepted: ['आम्ही लायब्ररीत जात आहोत.', 'आम्ही वाचनालयात जात आहोत.', 'आपण ग्रंथालयात जात आहोत.', 'आम्ही ग्रंथालयात चाललो आहोत.'], explanation: 'ग्रंथालय = library; जात आहोत = are going. आम्ही is "we" without the listener; आपण includes the listener.' },
            q2: { model: 'ती कन्नड खूप छान बोलते.', accepted: ['ती खूप छान कन्नड बोलते.', 'ती कन्नड फार छान बोलते.', 'ती कन्नड खूप चांगली बोलते.', 'त्या कन्नड खूप छान बोलतात.'], explanation: 'खूप छान = very well; बोलते = speaks (बोलते, because "she" is the subject).' },
            q3: { model: 'पाणी वाया घालवू नका.', accepted: ['पाण्याचा अपव्यय करू नका.', 'पाणी वाया घालवू नकोस.', 'पाणी वाया घालू नका.'], explanation: 'नका = do not (polite, as on notices); with friends, नकोस. वाया घालवणे = to waste.' },
            q4: { model: 'दुकान दहा वाजता उघडते.', accepted: ['दुकान 10 वाजता उघडते.', 'दुकान दहाला उघडते.'], explanation: 'उघडते = opens (दुकान is neuter, so उघडते); दहा वाजता = at ten o\'clock.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'बैठक सोमवारपर्यंत पुढे ढकलण्यात आली आहे.', explanation: 'ढकलण्यात आली आहे is passive: "has been …". पुढे ढकलणे = postpone (literally "push forward").' },
            i2: { source: 'कृपया अहवाल शुक्रवारपर्यंत पाठवा.', explanation: '-पर्यंत with a day means "by" (not later than). अहवाल = report.' },
            i3: { source: 'उशिरा उत्तर दिल्याबद्दल क्षमस्व.', explanation: 'A common line in emails. क्षमस्व = sorry (formal); उशिरा = late; -बद्दल = for.' },
            i4: { source: 'आमच्या टीमने प्रकल्प वेळेवर पूर्ण केला.', explanation: 'पूर्ण केला = completed; प्रकल्प = project. -ने marks the doer with a past verb.' },
            i5: { source: 'मी गेल्या वर्षी माझी पदवी पूर्ण केली. आता मी एका सॉफ्टवेअर कंपनीत नोकरी शोधत आहे. मला नवीन गोष्टी शिकण्यात खूप रस आहे.', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'तुमच्या सहकार्याबद्दल धन्यवाद.', explanation: 'सहकार्य = cooperation; -बद्दल = for.' },
            q1: { source: 'ही समस्या लवकरात लवकर सोडवण्यात येईल.', explanation: 'सोडवण्यात येईल is the future passive: "will be …". लवकरात लवकर = as soon as possible.' },
            q2: { source: 'मी या पदासाठी अर्ज करू इच्छितो.', explanation: 'पद = post or position; अर्ज करणे = apply. इच्छितो (I wish) is said politely as "I would like".' },
            q3: { source: 'त्यांनी बैठकीत एक चांगली सूचना दिली.', explanation: 'त्यांनी can be "he" or "she" (said with respect) or "they". सूचना = suggestion.' },
            q4: { source: 'ग्राहकांचे समाधान हेच आमचे पहिले प्राधान्य आहे.', explanation: 'समाधान = satisfaction; प्राधान्य = priority. हेच adds emphasis.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'कंपनीने नवीन धोरण जाहीर केले आहे.', accepted: ['कंपनीने एक नवीन धोरण जाहीर केले आहे.', 'कंपनीने नवे धोरण जाहीर केले आहे.', 'कंपनीने नवीन धोरणाची घोषणा केली आहे.'], explanation: 'धोरण = policy; जाहीर केले आहे = has announced. -ने marks the doer with a past verb.' },
            i2: { model: 'शिक्षण ही यशाची गुरुकिल्ली आहे.', accepted: ['शिक्षण हीच यशाची गुरुकिल्ली आहे.', 'शिक्षण ही यशाची किल्ली आहे.', 'यशाची गुरुकिल्ली म्हणजे शिक्षण.'], explanation: 'यश = success; गुरुकिल्ली = key (literally "master key"). "The key to success" becomes यशाची गुरुकिल्ली ("success\'s key").' },
            i3: { model: 'काही बदल झाल्यास कृपया मला कळवा.', accepted: ['काही बदल असल्यास कृपया मला कळवा.', 'जर काही बदल असेल, तर कृपया मला कळवा.', 'काही बदल झाला तर कृपया मला कळवा.', 'काही बदल असल्यास कृपया मला कळवावे.'], explanation: 'In Marathi the "if" part comes first: झाल्यास (or जर … तर) = if. कळवणे = to inform.' },
            i4: { model: 'आपण पर्यावरणाचे रक्षण केले पाहिजे.', accepted: ['आपण पर्यावरणाचे संरक्षण केले पाहिजे.', 'आपण पर्यावरणाचे रक्षण करायला हवे.', 'आपण पर्यावरणाचे रक्षण करावे.', 'आपण पर्यावरण वाचवले पाहिजे.'], explanation: 'केले पाहिजे = should (must) do; आपण is "we" including everyone. Marathi says "the environment\'s protection": पर्यावरणाचे रक्षण.' },
            i5: { model: 'आमच्या महाविद्यालयाने गेल्या आठवड्यात रक्तदान शिबिराचे आयोजन केले. अनेक विद्यार्थ्यांनी आणि शिक्षकांनी त्यात भाग घेतला. डॉक्टरांनी सर्वांचे त्यांच्या पाठिंब्याबद्दल आभार मानले.', accepted: [], explanation: 'रक्तदान शिबिर = blood donation camp; भाग घेणे = take part; आभार मानणे = thank. Compare your sentences with the model.' },
            i6: { model: 'मी दोन दिवसांच्या रजेची विनंती करण्यासाठी लिहीत आहे.', accepted: ['मी दोन दिवसांच्या रजेची विनंती करण्यासाठी हे पत्र लिहीत आहे.', 'दोन दिवसांच्या रजेची विनंती करण्यासाठी मी लिहीत आहे.', 'मी दोन दिवसांची रजा मागण्यासाठी लिहीत आहे.', 'मी दोन दिवसांच्या रजेसाठी विनंती करण्याकरिता लिहीत आहे.'], explanation: 'रजा = leave; विनंती करणे = request. लिहीत आहे (am writing) is the same for a man or a woman.' },
            q1: { model: 'कठोर परिश्रमाचे फळ नेहमी मिळते.', accepted: ['कष्टाचे फळ नेहमी मिळते.', 'मेहनतीचे फळ नेहमी मिळते.', 'कष्टाचे फळ नेहमीच मिळते.', 'कठोर परिश्रमाचे फळ नेहमीच मिळते.'], explanation: '"Pays off" means "gives a result": फळ मिळते (the fruit is received). कठोर परिश्रम (or कष्ट) = hard work.' },
            q2: { model: 'निकाल उद्या जाहीर करण्यात येतील.', accepted: ['निकाल उद्या जाहीर होतील.', 'निकाल उद्या जाहीर करण्यात येईल.', 'निकाल उद्या जाहीर होईल.', 'उद्या निकाल जाहीर करण्यात येतील.'], explanation: '"Will be announced" is the future passive: जाहीर करण्यात येतील. उद्या = tomorrow.' },
            q3: { model: 'तुमच्या त्वरित प्रतिसादाबद्दल धन्यवाद.', accepted: ['आपल्या त्वरित प्रतिसादाबद्दल धन्यवाद.', 'तुमच्या तत्पर प्रतिसादाबद्दल धन्यवाद.', 'तुम्ही लगेच उत्तर दिल्याबद्दल धन्यवाद.', 'लवकर उत्तर दिल्याबद्दल धन्यवाद.'], explanation: 'त्वरित = quick; प्रतिसाद = response; -बद्दल धन्यवाद = thank you for.' },
            q4: { model: 'सुरक्षा ही सर्वांची जबाबदारी आहे.', accepted: ['सुरक्षितता ही सर्वांची जबाबदारी आहे.', 'सुरक्षा ही प्रत्येकाची जबाबदारी आहे.', 'सुरक्षा सर्वांची जबाबदारी आहे.'], explanation: 'सुरक्षा = safety; सर्वांची = everyone\'s; जबाबदारी = responsibility. The ही after सुरक्षा is usual in Marathi "X is Y" sentences.' }
        }
    },
    placement: {
        b4: { prompt: '"पुस्तक" in English is…', explanation: 'पुस्तक means book.' },
        a5: { prompt: '"बैठक पुढे ढकलण्यात आली आहे" best translates as…', explanation: 'पुढे ढकलणे means postpone, and ढकलण्यात आली आहे is passive: "has been".' }
    }
};
