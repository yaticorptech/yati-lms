/**
 * Linguistic Ability — Tamil as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */

// Tips shared by the three Tamil → English lessons, and by the three English → Tamil lessons.
const TO_ENGLISH_POINTS = [
    'Tamil puts the verb at the end: "நான் பள்ளிக்குப் போகிறேன்" (I school-to go). English puts it after the subject: "I go to school."',
    'English needs a, an and the, which Tamil does not have. Tamil also often leaves out is, am and are: "என் பெயர் ராணி" (my name Rani) is "My name is Rani." In English they come right after the subject.',
    'Watch the tense: போகிறேன் (go / am going), போவேன் (will go), போனேன் (went), போய்க்கொண்டிருக்கிறேன் (am going, right now).',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const TO_TAMIL_POINTS = [
    'Move the verb to the end: "I go to school" → "நான் பள்ளிக்குப் போகிறேன்."',
    'There are no words for a, an or the in Tamil; leave them out. (ஒரு means "one"; it is used for "a" only sometimes.)',
    'Choose the polite form for elders and strangers: நீங்கள், வாருங்கள், கொடுங்கள். With friends you may use நீ, வா, கொடு.',
    'Type in Tamil with your phone\'s Tamil keyboard, or use the Tamil letters under the answer box. End a sentence with a full stop (.).'
];

module.exports = {
    code: 'ta', name: 'Tamil', native: 'தமிழ்', locale: 'ta-IN',
    words: {
        'vocab-beginner-1': {
            family: 'குடும்பம்',
            mother: 'அம்மா, தாய்',
            father: 'அப்பா, தந்தை',
            house: 'வீடு',
            food: 'உணவு, சாப்பாடு',
            happy: 'மகிழ்ச்சியான, சந்தோஷமான',
            big: 'பெரிய',
            small: 'சிறிய, சின்ன'
        },
        'vocab-beginner-2': {
            book: 'புத்தகம்',
            teacher: 'ஆசிரியர், ஆசிரியை',
            student: 'மாணவர், மாணவி',
            friend: 'நண்பன், தோழி',
            read: 'படி, வாசி',
            write: 'எழுது',
            early: 'சீக்கிரம், முன்னதாக',
            easy: 'எளிதான, சுலபமான'
        },
        'vocab-intermediate-1': {
            honest: 'நேர்மையான',
            polite: 'பணிவான, மரியாதையான',
            curious: 'ஆர்வமுள்ள, ஆவலுள்ள',
            confident: 'தன்னம்பிக்கையுள்ள',
            patient: 'பொறுமையான',
            grateful: 'நன்றியுள்ள',
            anxious: 'பதற்றமான, கவலையான',
            generous: 'தாராள மனமுள்ள'
        },
        'vocab-intermediate-2': {
            deadline: 'காலக்கெடு, கடைசி நாள்',
            improve: 'மேம்படுத்து',
            achieve: 'அடை, சாதனை புரி',
            schedule: 'கால அட்டவணை',
            opportunity: 'வாய்ப்பு',
            responsible: 'பொறுப்பான',
            discuss: 'விவாதி, கலந்துரையாடு',
            result: 'முடிவு, பலன்'
        },
        'vocab-advanced-1': {
            negotiate: 'பேச்சுவார்த்தை நடத்து, பேரம் பேசு',
            collaborate: 'ஒத்துழை, இணைந்து பணியாற்று',
            efficient: 'திறமையான, திறன்மிக்க',
            feasible: 'சாத்தியமான, நடைமுறைக்கு ஏற்ற',
            comprehensive: 'விரிவான, முழுமையான',
            prioritise: 'முன்னுரிமை கொடு',
            ambiguous: 'தெளிவற்ற, இருபொருள் கொண்ட',
            persuade: 'சம்மதிக்க வை, இணங்க வை'
        },
        'vocab-advanced-2': {
            sustainable: 'நிலையான, நீடித்த',
            consequence: 'விளைவு, பின்விளைவு',
            perspective: 'கண்ணோட்டம், பார்வை',
            inevitable: 'தவிர்க்க முடியாத',
            substantial: 'கணிசமான, குறிப்பிடத்தக்க',
            advocate: 'ஆதரி, வலியுறுத்து',
            diverse: 'பன்முகத்தன்மை கொண்ட, பலதரப்பட்ட',
            integrity: 'நேர்மை, நாணயம்'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Tamil has no words for a, an or the (ஒரு means "one"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Tamil the verb comes last: "ரவி புத்தகங்களைப் படிக்கிறான்." In English the verb comes right after the subject.' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Tamil word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Tamil.',
            points: [...TO_TAMIL_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Tamil verb ending to choose the English tense.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Tamil. Use the polite form for requests: கொடுங்கள், பேசுங்கள், செய்யுங்கள்.',
            points: [...TO_TAMIL_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Tamil. Passive forms such as அறிவிக்கப்படும் (will be announced) and ஒத்திவைக்கப்பட்டுள்ளது (has been postponed) are common in notices.',
            points: [...TO_TAMIL_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'தண்ணீர்', explanation: 'தண்ணீர் (or நீர்) means water.' },
            i2: { source: 'புத்தகம்', explanation: 'புத்தகம் means book.' },
            i3: { source: 'என் பெயர் ராணி.', explanation: 'என் = my, பெயர் = name. Tamil needs no word for "is" here; English adds it.' },
            i4: { source: 'நீங்கள் எப்படி இருக்கிறீர்கள்?', explanation: 'This is the common polite greeting: எப்படி = how, இருக்கிறீர்கள் = (you) are. English puts "are" right after "How".' },
            i5: { source: 'நான் நன்றாக இருக்கிறேன்.', explanation: 'நன்றாக = well, இருக்கிறேன் = (I) am. In English "am" comes right after "I".' },
            i6: { source: 'இது என் வீடு.', explanation: 'இது = this, வீடு = house or home. English needs the verb "is".' },
            q1: { source: 'நான் பள்ளிக்குப் போகிறேன்.', explanation: 'போகிறேன் can mean "I go" or "I am going". The verb moves to after "I", and பள்ளிக்கு becomes "to school".' },
            q2: { source: 'அவள் என் தங்கை.', explanation: 'தங்கை is a younger sister (அக்கா is an elder sister). அவள் = she.' },
            q3: { source: 'தயவுசெய்து கதவை மூடுங்கள்.', explanation: 'தயவுசெய்து = please, கதவு = door (கதவை, as the object), மூடுங்கள் = close (polite).' },
            q4: { source: 'நன்றி.', explanation: 'நன்றி is the usual way to say thank you; மிக்க நன்றி = thank you very much.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'நண்பன்', accepted: ['நண்பர்', 'தோழன்', 'தோழி'], explanation: 'Friend is நண்பன் (polite or plural: நண்பர்; also தோழன்). A female friend is தோழி.' },
            i2: { model: 'பள்ளி', accepted: ['பள்ளிக்கூடம்'], explanation: 'School is பள்ளி (or பள்ளிக்கூடம்).' },
            i3: { model: 'காலை வணக்கம்.', accepted: ['இனிய காலை வணக்கம்.'], explanation: 'காலை = morning, வணக்கம் = greeting. வணக்கம் alone is a greeting for any time of day.' },
            i4: { model: 'நான் மாணவன்.', accepted: ['நான் மாணவி.', 'நான் ஒரு மாணவன்.', 'நான் ஒரு மாணவி.', 'நான் மாணவர்.'], explanation: 'Tamil needs no word for "am" here, and ஒரு ("one", for "a") is optional. A girl says மாணவி.' },
            i5: { model: 'உங்கள் பெயர் என்ன?', accepted: ['உன் பெயர் என்ன?', 'உங்களுடைய பெயர் என்ன?', 'உன்னுடைய பெயர் என்ன?'], explanation: 'உங்கள் is polite; with a friend you can say உன். என்ன = what.' },
            i6: { model: 'உணவு சுவையாக இருக்கிறது.', accepted: ['சாப்பாடு சுவையாக இருக்கிறது.', 'உணவு ருசியாக இருக்கிறது.', 'சாப்பாடு ருசியாக இருக்கிறது.', 'உணவு சுவையாக உள்ளது.'], explanation: 'சுவை = taste; சுவையாக இருக்கிறது = is tasty.' },
            q1: { model: 'பேருந்து நிலையம் எங்கே இருக்கிறது?', accepted: ['பேருந்து நிலையம் எங்கே?', 'பஸ் ஸ்டாண்ட் எங்கே இருக்கிறது?', 'பஸ் நிலையம் எங்கே இருக்கிறது?', 'பேருந்து நிலையம் எங்கே உள்ளது?'], explanation: 'எங்கே = where; எங்கே இருக்கிறது = where is (it). பேருந்து நிலையம் is the Tamil word for bus stand.' },
            q2: { model: 'எனக்கு மாம்பழம் பிடிக்கும்.', accepted: ['எனக்கு மாம்பழங்கள் பிடிக்கும்.', 'எனக்கு மாம்பழம் என்றால் பிடிக்கும்.'], explanation: 'Tamil says "to me, mango is liked": எனக்கு … பிடிக்கும். The singular மாம்பழம் is used for mangoes in general.' },
            q3: { model: 'இங்கே வாருங்கள்.', accepted: ['இங்கே வா.', 'இங்கு வாருங்கள்.', 'இங்கு வா.'], explanation: 'வாருங்கள் is polite; வா is used with friends and children.' },
            q4: { model: 'மழை பெய்கிறது.', accepted: ['மழை பெய்துகொண்டிருக்கிறது.', 'மழை பொழிகிறது.'], explanation: 'Tamil says "rain falls": மழை பெய்கிறது. பெய்துகொண்டிருக்கிறது stresses that it is going on right now.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'நான் நேற்று ஒரு திரைப்படம் பார்த்தேன்.', explanation: 'பார்த்தேன் is past tense: watched (or saw). நேற்று = yesterday.' },
            i2: { source: 'அவன் தினமும் காலையில் ஓடுகிறான்.', explanation: 'A habit takes the simple present: ஓடுகிறான் = runs. The ending -ஆன் shows a male, so அவன் is "he".' },
            i3: { source: 'நாங்கள் நாளை மைசூருக்குப் போவோம்.', explanation: 'நாளை (tomorrow) and போவோம் show the future: will go.' },
            i4: { source: 'அவள் புத்தகம் படித்துக்கொண்டிருக்கிறாள்.', explanation: '-கொண்டிருக்கிறாள் shows an action happening now: is reading. அவள் = she.' },
            i5: { source: 'குழந்தைகள் மைதானத்தில் விளையாடிக்கொண்டிருக்கிறார்கள்.', explanation: 'மைதானம் = ground or field (மைதானத்தில் = in the ground); விளையாடிக்கொண்டிருக்கிறார்கள் = are playing.' },
            i6: { source: 'நீங்கள் சாப்பிட்டீர்களா?', explanation: 'A polite question about eating; -ஆ at the end makes a yes/no question. "Have you eaten?" is just as natural.' },
            q1: { source: 'எனக்கு ஆங்கிலம் பேசுவது பிடிக்கும்.', explanation: 'எனக்கு … பிடிக்கும் = I like; பேசுவது = speaking.' },
            q2: { source: 'அவர்கள் இரண்டு வருடங்களாகப் பெங்களூரில் வசித்து வருகிறார்கள்.', explanation: '-ஆக with a length of time (இரண்டு வருடங்களாக = for two years) and an ongoing action (வசித்து வருகிறார்கள்) needs the present perfect continuous. அவர்கள் = they.' },
            q3: { source: 'ரயில் சரியான நேரத்திற்கு வந்தது.', explanation: 'சரியான நேரத்திற்கு = on time; வந்தது = came.' },
            q4: { source: 'தயவுசெய்து மெதுவாகப் பேசுங்கள்.', explanation: 'மெதுவாக = slowly; பேசுங்கள் is the polite form of "speak".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'தயவுசெய்து எனக்குக் கொஞ்சம் தண்ணீர் கொடுங்கள்.', accepted: ['தயவுசெய்து எனக்குக் கொஞ்சம் தண்ணீர் கொடு.', 'எனக்குக் கொஞ்சம் தண்ணீர் கொடுங்கள்.', 'தயவுசெய்து கொஞ்சம் தண்ணீர் கொடுங்கள்.', 'தயவுசெய்து எனக்குச் சிறிது தண்ணீர் கொடுங்கள்.'], explanation: 'கொடுங்கள் is the polite form of "give" (கொடு with friends); கொஞ்சம் = some, a little.' },
            i2: { model: 'வகுப்பு ஒன்பது மணிக்குத் தொடங்குகிறது.', accepted: ['வகுப்பு ஒன்பது மணிக்கு ஆரம்பிக்கிறது.', 'வகுப்பு 9 மணிக்குத் தொடங்குகிறது.', 'வகுப்பு ஒன்பது மணிக்குத் தொடங்கும்.', 'கிளாஸ் ஒன்பது மணிக்குத் தொடங்குகிறது.'], explanation: 'மணிக்கு = at … o\'clock; தொடங்குகிறது = starts.' },
            i3: { model: 'நான் என் புத்தகத்தை வீட்டில் மறந்துவிட்டேன்.', accepted: ['என் புத்தகத்தை வீட்டில் மறந்துவிட்டேன்.', 'நான் என் புத்தகத்தை வீட்டிலேயே மறந்துவிட்டேன்.', 'நான் என்னுடைய புத்தகத்தை வீட்டில் மறந்துவிட்டேன்.', 'நான் என் புத்தகத்தை வீட்டில் மறந்தேன்.'], explanation: 'மறந்துவிட்டேன் = I forgot. The object takes -ஐ: புத்தகம் → புத்தகத்தை.' },
            i4: { model: 'இதன் விலை எவ்வளவு?', accepted: ['இது என்ன விலை?', 'இதன் விலை என்ன?', 'இது எவ்வளவு?'], explanation: 'விலை = price; எவ்வளவு = how much.' },
            i5: { model: 'என் தேர்வு அடுத்த வாரம்.', accepted: ['அடுத்த வாரம் என் தேர்வு.', 'எனக்கு அடுத்த வாரம் தேர்வு.', 'என் தேர்வு அடுத்த வாரம் நடக்கிறது.', 'என் பரீட்சை அடுத்த வாரம்.'], explanation: 'அடுத்த வாரம் = next week; தேர்வு = exam. Tamil needs no word for "is" here.' },
            i6: { model: 'உங்களால் எனக்கு உதவ முடியுமா?', accepted: ['நீங்கள் எனக்கு உதவ முடியுமா?', 'எனக்கு உதவ முடியுமா?', 'உன்னால் எனக்கு உதவ முடியுமா?', 'நீங்கள் எனக்கு உதவுவீர்களா?'], explanation: 'உதவு = help; உதவ முடியுமா = can (you) help? Tamil says "is it possible by you": உங்களால் (polite) or உன்னால் (with a friend).' },
            q1: { model: 'நாங்கள் நூலகத்திற்குப் போகிறோம்.', accepted: ['நாம் நூலகத்திற்குப் போகிறோம்.', 'நாங்கள் நூலகத்திற்குச் செல்கிறோம்.', 'நாங்கள் லைப்ரரிக்குப் போகிறோம்.', 'நாங்கள் நூலகத்துக்குப் போகிறோம்.'], explanation: 'நூலகம் = library (நூலகத்திற்கு = to the library); போகிறோம் = are going.' },
            q2: { model: 'அவள் கன்னடம் மிக நன்றாகப் பேசுகிறாள்.', accepted: ['அவள் கன்னடத்தை மிக நன்றாகப் பேசுகிறாள்.', 'அவள் கன்னடம் மிகவும் நன்றாகப் பேசுகிறாள்.', 'அவர் கன்னடம் மிக நன்றாகப் பேசுகிறார்.', 'அவள் மிக நன்றாகக் கன்னடம் பேசுகிறாள்.'], explanation: 'மிக நன்றாக = very well; பேசுகிறாள் = speaks (-ஆள், because "she" is the subject; the respectful form is அவர் … பேசுகிறார்).' },
            q3: { model: 'தண்ணீரை வீணாக்காதீர்கள்.', accepted: ['தண்ணீரை வீணாக்காதே.', 'தண்ணீரை வீணாக்க வேண்டாம்.', 'நீரை வீணாக்காதீர்கள்.', 'தண்ணீரை வீணடிக்காதீர்கள்.'], explanation: 'வீணாக்காதீர்கள் = do not waste (polite); with friends, வீணாக்காதே.' },
            q4: { model: 'கடை பத்து மணிக்குத் திறக்கும்.', accepted: ['கடை 10 மணிக்குத் திறக்கும்.', 'கடை பத்து மணிக்குத் திறக்கப்படும்.', 'கடை பத்து மணிக்குத் திறக்கிறது.'], explanation: 'திறக்கும் = opens (this -உம் form is used for what happens regularly); பத்து மணிக்கு = at ten o\'clock.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'கூட்டம் திங்கட்கிழமைக்கு ஒத்திவைக்கப்பட்டுள்ளது.', explanation: '-ப்பட்டுள்ளது is passive: "has been …". ஒத்திவை = postpone.' },
            i2: { source: 'தயவுசெய்து அறிக்கையை வெள்ளிக்கிழமைக்குள் அனுப்புங்கள்.', explanation: 'வெள்ளிக்கிழமைக்குள் = by Friday: -க்குள் with a day means "by" (not later than).' },
            i3: { source: 'தாமதமாகப் பதிலளித்ததற்கு மன்னிக்கவும்.', explanation: 'A common line in emails. மன்னிக்கவும் = sorry; தாமதமாக = late.' },
            i4: { source: 'எங்கள் குழு திட்டத்தைச் சரியான நேரத்தில் முடித்தது.', explanation: 'முடித்தது = completed; குழு = team; திட்டம் = project.' },
            i5: { source: 'நான் கடந்த ஆண்டு என் பட்டப்படிப்பை முடித்தேன். இப்போது நான் ஒரு மென்பொருள் நிறுவனத்தில் வேலை தேடிக்கொண்டிருக்கிறேன். புதிய விஷயங்களைக் கற்றுக்கொள்வதில் எனக்கு மிகுந்த ஆர்வம் உள்ளது.', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'உங்கள் ஒத்துழைப்புக்கு நன்றி.', explanation: 'ஒத்துழைப்பு = cooperation; -க்கு here means "for".' },
            q1: { source: 'இந்தப் பிரச்சினை கூடிய விரைவில் தீர்க்கப்படும்.', explanation: '-ப்படும் is the future passive: "will be …". கூடிய விரைவில் = as soon as possible.' },
            q2: { source: 'நான் இந்தப் பதவிக்கு விண்ணப்பிக்க விரும்புகிறேன்.', explanation: 'பதவி = post or position; விண்ணப்பி = apply. விரும்புகிறேன் (I wish) is said politely as "I would like".' },
            q3: { source: 'அவர் கூட்டத்தில் ஒரு நல்ல ஆலோசனை வழங்கினார்.', explanation: 'அவர் can be "he" or "she" (said with respect); அவர்கள் is "they". ஆலோசனை = suggestion or advice; வழங்கினார் = gave.' },
            q4: { source: 'வாடிக்கையாளர் திருப்தியே எங்கள் முதல் முன்னுரிமை.', explanation: 'திருப்தி = satisfaction; முன்னுரிமை = priority. The -ஏ in திருப்தியே adds emphasis.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'நிறுவனம் ஒரு புதிய கொள்கையை அறிவித்துள்ளது.', accepted: ['நிறுவனம் புதிய கொள்கையை அறிவித்துள்ளது.', 'நிறுவனம் ஒரு புதிய கொள்கையை அறிவித்திருக்கிறது.', 'நிறுவனம் புதிய கொள்கையை அறிவித்திருக்கிறது.', 'கம்பெனி ஒரு புதிய கொள்கையை அறிவித்துள்ளது.'], explanation: 'நிறுவனம் = company; கொள்கை = policy; அறிவித்துள்ளது = has announced.' },
            i2: { model: 'கல்வியே வெற்றிக்கான திறவுகோல்.', accepted: ['கல்வி வெற்றிக்கான திறவுகோல்.', 'கல்வியே வெற்றியின் திறவுகோல்.', 'கல்வி வெற்றியின் திறவுகோல்.', 'கல்வி வெற்றிக்கான திறவுகோல் ஆகும்.'], explanation: 'வெற்றி = success; திறவுகோல் = key. "The key to success" becomes வெற்றிக்கான திறவுகோல் ("the key for success"); -ஏ in கல்வியே adds emphasis.' },
            i3: { model: 'ஏதேனும் மாற்றம் இருந்தால் தயவுசெய்து எனக்குத் தெரிவியுங்கள்.', accepted: ['ஏதாவது மாற்றம் இருந்தால் தயவுசெய்து எனக்குத் தெரிவியுங்கள்.', 'ஏதேனும் மாற்றம் இருந்தால் எனக்குத் தெரிவியுங்கள்.', 'ஏதேனும் மாற்றம் இருந்தால் தயவுசெய்து எனக்குத் தெரியப்படுத்துங்கள்.', 'ஏதாவது மாற்றம் இருந்தால் தயவுசெய்து எனக்குச் சொல்லுங்கள்.'], explanation: 'In Tamil the "if" part (இருந்தால் = if there is) comes first. தெரிவியுங்கள் = inform (polite).' },
            i4: { model: 'நாம் சுற்றுச்சூழலைப் பாதுகாக்க வேண்டும்.', accepted: ['நாம் சுற்றுச்சூழலைக் காக்க வேண்டும்.', 'நாங்கள் சுற்றுச்சூழலைப் பாதுகாக்க வேண்டும்.', 'நாம் சுற்றுப்புறத்தைப் பாதுகாக்க வேண்டும்.', 'நாம் சுற்றுச்சூழலைப் பேணிக் காக்க வேண்டும்.'], explanation: 'வேண்டும் = should or must. நாம் is "we" including the listener, which suits advice to everyone.' },
            i5: { model: 'எங்கள் கல்லூரி கடந்த வாரம் இரத்த தான முகாம் ஒன்றை நடத்தியது. பல மாணவர்களும் ஆசிரியர்களும் அதில் கலந்துகொண்டனர். மருத்துவர்கள் அனைவருக்கும் அவர்களின் ஆதரவுக்காக நன்றி தெரிவித்தனர்.', accepted: [], explanation: 'இரத்த தான முகாம் = blood donation camp; கலந்துகொள் = take part. Compare your sentences with the model.' },
            i6: { model: 'இரண்டு நாட்கள் விடுப்பு கோரி இந்தக் கடிதத்தை எழுதுகிறேன்.', accepted: ['இரண்டு நாள் விடுப்பு கோரி இந்தக் கடிதத்தை எழுதுகிறேன்.', 'இரண்டு நாட்கள் விடுப்பு கோருவதற்காக நான் இந்தக் கடிதத்தை எழுதுகிறேன்.', 'இரண்டு நாட்கள் விடுப்பு கேட்டு நான் எழுதுகிறேன்.', 'இரண்டு நாள் விடுமுறை கோருவதற்காக நான் எழுதுகிறேன்.'], explanation: 'விடுப்பு = leave; கோரி = requesting (from கோரு, request). எழுதுகிறேன் = I am writing.' },
            q1: { model: 'கடின உழைப்பு எப்போதும் பலன் தரும்.', accepted: ['கடின உழைப்புக்கு எப்போதும் பலன் கிடைக்கும்.', 'உழைப்புக்கு எப்போதும் பலன் உண்டு.', 'கடின உழைப்பு என்றும் பலன் தரும்.', 'கடின உழைப்பு எப்போதும் வீண் போகாது.'], explanation: '"Pays off" means "gives a result": பலன் தரும். கடின உழைப்பு = hard work.' },
            q2: { model: 'முடிவுகள் நாளை அறிவிக்கப்படும்.', accepted: ['நாளை முடிவுகள் அறிவிக்கப்படும்.', 'முடிவு நாளை அறிவிக்கப்படும்.', 'முடிவுகள் நாளை வெளியிடப்படும்.', 'முடிவுகள் நாளை வெளியாகும்.'], explanation: '"Will be announced" is the future passive: அறிவிக்கப்படும் (-ப்படும் = will be …).' },
            q3: { model: 'உங்கள் விரைவான பதிலுக்கு நன்றி.', accepted: ['உங்களின் விரைவான பதிலுக்கு நன்றி.', 'உங்கள் உடனடி பதிலுக்கு நன்றி.', 'தங்கள் விரைவான பதிலுக்கு நன்றி.', 'உங்கள் விரைவான பதிலுக்கு மிக்க நன்றி.'], explanation: 'விரைவான = quick; பதில் = response or reply (பதிலுக்கு = for the response). தங்கள் is a very formal "your".' },
            q4: { model: 'பாதுகாப்பு அனைவரின் பொறுப்பு.', accepted: ['பாதுகாப்பு எல்லோருடைய பொறுப்பு.', 'பாதுகாப்பு அனைவருடைய பொறுப்பு.', 'பாதுகாப்பு அனைவரின் பொறுப்பாகும்.', 'பாதுகாப்பு எல்லோரின் பொறுப்பு.'], explanation: 'பாதுகாப்பு = safety; அனைவரின் = everyone\'s; பொறுப்பு = responsibility.' }
        }
    },
    placement: {
        b4: { prompt: '"புத்தகம்" in English is…', explanation: 'புத்தகம் means book.' },
        a5: { prompt: '"கூட்டம் ஒத்திவைக்கப்பட்டுள்ளது" best translates as…', explanation: 'ஒத்திவை means postpone, and -ப்பட்டுள்ளது is passive: "has been".' }
    }
};
