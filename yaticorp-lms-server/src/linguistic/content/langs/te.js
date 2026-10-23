/**
 * Linguistic Ability — Telugu as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */

// Tips shared by the three Telugu → English lessons, and by the three English → Telugu lessons.
const TO_ENGLISH_POINTS = [
    'Telugu puts the verb at the end: "నేను బడికి వెళ్తాను" (I school-to go). English puts it after the subject: "I go to school."',
    'English needs a, an and the, which Telugu does not have. Telugu also often leaves out is, am and are: "నా పేరు రాణి" (my name Rani) is "My name is Rani." In English they come right after the subject.',
    'Watch the tense: వెళ్తాను (go / will go), వెళ్లాను (went), వెళ్తున్నాను (am going).',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const TO_TELUGU_POINTS = [
    'Move the verb to the end: "I go to school" → "నేను బడికి వెళ్తాను."',
    'There are no words for a, an or the in Telugu; leave them out. (ఒక means "one"; it is used for "a" only sometimes.)',
    'Choose the polite form for elders and strangers: మీరు, రండి, ఇవ్వండి. With friends you may use నువ్వు, రా, ఇవ్వు.',
    'Type in Telugu with your phone\'s Telugu keyboard, or use the Telugu letters under the answer box. End a sentence with a full stop (.).'
];

module.exports = {
    code: 'te', name: 'Telugu', native: 'తెలుగు', locale: 'te-IN',
    words: {
        'vocab-beginner-1': {
            family: 'కుటుంబం',
            mother: 'అమ్మ, తల్లి',
            father: 'నాన్న, తండ్రి',
            house: 'ఇల్లు',
            food: 'ఆహారం, భోజనం',
            happy: 'సంతోషమైన, ఆనందమైన',
            big: 'పెద్ద',
            small: 'చిన్న'
        },
        'vocab-beginner-2': {
            book: 'పుస్తకం',
            teacher: 'ఉపాధ్యాయుడు, ఉపాధ్యాయిని',
            student: 'విద్యార్థి',
            friend: 'స్నేహితుడు, స్నేహితురాలు',
            read: 'చదువు',
            write: 'రాయు, వ్రాయు',
            early: 'త్వరగా, ముందుగా',
            easy: 'సులభమైన, తేలికైన'
        },
        'vocab-intermediate-1': {
            honest: 'నిజాయితీగల',
            polite: 'మర్యాదగల, వినయమైన',
            curious: 'ఆసక్తిగల, కుతూహలంగల',
            confident: 'ఆత్మవిశ్వాసంగల',
            patient: 'ఓర్పుగల, సహనంగల',
            grateful: 'కృతజ్ఞతగల',
            anxious: 'ఆందోళన చెందిన',
            generous: 'ఉదారమైన'
        },
        'vocab-intermediate-2': {
            deadline: 'గడువు, చివరి తేదీ',
            improve: 'మెరుగుపరచు',
            achieve: 'సాధించు',
            schedule: 'కాలపట్టిక, షెడ్యూల్',
            opportunity: 'అవకాశం',
            responsible: 'బాధ్యతగల',
            discuss: 'చర్చించు',
            result: 'ఫలితం'
        },
        'vocab-advanced-1': {
            negotiate: 'చర్చలు జరుపు, బేరమాడు',
            collaborate: 'సహకరించు, కలిసి పనిచేయు',
            efficient: 'సమర్థవంతమైన, దక్షతగల',
            feasible: 'సాధ్యమైన, ఆచరణీయమైన',
            comprehensive: 'సమగ్రమైన, విస్తృతమైన',
            prioritise: 'ప్రాధాన్యత ఇవ్వు',
            ambiguous: 'అస్పష్టమైన, సందిగ్ధమైన',
            persuade: 'ఒప్పించు'
        },
        'vocab-advanced-2': {
            sustainable: 'సుస్థిరమైన, స్థిరమైన',
            consequence: 'పరిణామం, ఫలితం',
            perspective: 'దృక్పథం, దృష్టికోణం',
            inevitable: 'అనివార్యమైన, తప్పనిసరి',
            substantial: 'గణనీయమైన',
            advocate: 'సమర్థించు, సిఫారసు చేయు',
            diverse: 'వైవిధ్యమైన, విభిన్న',
            integrity: 'నిజాయితీ, చిత్తశుద్ధి'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Telugu has no words for a, an or the (ఒక means "one"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Telugu the verb comes last: "రవి పుస్తకాలు చదువుతాడు." In English the verb comes right after the subject.' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Telugu word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Telugu.',
            points: [...TO_TELUGU_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Telugu verb ending to choose the English tense.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Telugu. Use the polite form for requests: ఇవ్వండి, మాట్లాడండి, చేయండి.',
            points: [...TO_TELUGU_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Telugu. Passive forms such as ప్రకటించబడతాయి (will be announced) and వాయిదా వేయబడింది (has been postponed) are used in notices, though Telugu also often says ప్రకటిస్తారు ("they will announce").',
            points: [...TO_TELUGU_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'నీరు', explanation: 'నీరు (or నీళ్లు) means water.' },
            i2: { source: 'పుస్తకం', explanation: 'పుస్తకం means book.' },
            i3: { source: 'నా పేరు రాణి.', explanation: 'నా = my, పేరు = name. Telugu needs no word for "is" here; English adds it.' },
            i4: { source: 'మీరు ఎలా ఉన్నారు?', explanation: 'This is the common polite greeting: ఎలా = how, ఉన్నారు = (you) are. English puts "are" right after "How".' },
            i5: { source: 'నేను బాగున్నాను.', explanation: 'బాగున్నాను means "I am well": బాగు = well, ఉన్నాను = (I) am. In English "am" comes right after "I".' },
            i6: { source: 'ఇది నా ఇల్లు.', explanation: 'ఇది = this, ఇల్లు = house or home. English needs the verb "is".' },
            q1: { source: 'నేను బడికి వెళ్తాను.', explanation: 'వెళ్తాను can mean "I go" or "I will go". The verb moves to after "I", and బడికి becomes "to school".' },
            q2: { source: 'ఆమె నా చెల్లెలు.', explanation: 'చెల్లెలు is a younger sister (అక్క is an elder sister). ఆమె = she.' },
            q3: { source: 'దయచేసి తలుపు మూయండి.', explanation: 'దయచేసి = please, తలుపు = door, మూయండి = close (polite).' },
            q4: { source: 'ధన్యవాదాలు.', explanation: 'ధన్యవాదాలు is the polite way to say thank you; కృతజ్ఞతలు is also common.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'స్నేహితుడు', accepted: ['స్నేహితురాలు', 'మిత్రుడు', 'నేస్తం'], explanation: 'Friend is స్నేహితుడు (or మిత్రుడు); for a girl, స్నేహితురాలు.' },
            i2: { model: 'బడి', accepted: ['పాఠశాల', 'స్కూల్'], explanation: 'School is బడి; the formal word is పాఠశాల.' },
            i3: { model: 'శుభోదయం.', accepted: [], explanation: 'శుభోదయం (శుభ = good, ఉదయం = morning) is "good morning". నమస్కారం is a greeting for any time of day.' },
            i4: { model: 'నేను విద్యార్థిని.', accepted: ['నేను ఒక విద్యార్థిని.', 'నేను విద్యార్థినిని.'], explanation: 'Telugu needs no word for "am": the ending -ని on విద్యార్థి says "I am". No word for "a" is needed (ఒక is optional). A girl may also say విద్యార్థినిని.' },
            i5: { model: 'మీ పేరు ఏమిటి?', accepted: ['నీ పేరు ఏమిటి?', 'మీ పేరేమిటి?', 'నీ పేరేంటి?', 'మీ పేరు ఏంటి?'], explanation: 'మీ is polite; with a friend you can say నీ. ఏమిటి = what.' },
            i6: { model: 'భోజనం రుచిగా ఉంది.', accepted: ['ఆహారం రుచిగా ఉంది.', 'భోజనం రుచికరంగా ఉంది.', 'ఆహారం రుచికరంగా ఉంది.'], explanation: 'రుచి = taste; రుచిగా ఉంది = is tasty.' },
            q1: { model: 'బస్ స్టాండ్ ఎక్కడ ఉంది?', accepted: ['బస్టాండ్ ఎక్కడ ఉంది?', 'బస్ స్టాండ్ ఎక్కడ?', 'బస్ స్టేషన్ ఎక్కడ ఉంది?', 'బస్సు స్టాండు ఎక్కడ ఉంది?'], explanation: 'ఎక్కడ = where; ఎక్కడ ఉంది = where is (it).' },
            q2: { model: 'నాకు మామిడిపండ్లు ఇష్టం.', accepted: ['నాకు మామిడి పండ్లు ఇష్టం.', 'నాకు మామిడిపండు ఇష్టం.', 'నాకు మామిడిపళ్లు ఇష్టం.'], explanation: 'Telugu says "to me, mangoes are liked": నాకు … ఇష్టం.' },
            q3: { model: 'ఇక్కడికి రండి.', accepted: ['ఇక్కడికి రా.', 'ఇటు రండి.', 'ఇటు రా.'], explanation: 'రండి is polite; రా is used with friends and children.' },
            q4: { model: 'వర్షం పడుతోంది.', accepted: ['వర్షం కురుస్తోంది.', 'వాన పడుతోంది.', 'వాన కురుస్తోంది.'], explanation: 'Telugu says "rain is falling": వర్షం పడుతోంది. English uses "it" as the subject.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'నేను నిన్న ఒక సినిమా చూశాను.', explanation: 'చూశాను is past tense: watched (or saw). నిన్న = yesterday.' },
            i2: { source: 'అతను ప్రతిరోజూ ఉదయం పరుగెత్తుతాడు.', explanation: 'A habit takes the simple present: పరుగెత్తుతాడు = runs. The ending -డు shows a male, so అతను is "he".' },
            i3: { source: 'మేము రేపు మైసూరుకు వెళ్తాము.', explanation: 'రేపు (tomorrow) shows the future: వెళ్తాము = will go.' },
            i4: { source: 'ఆమె పుస్తకం చదువుతోంది.', explanation: '-తోంది shows an action happening now: చదువుతోంది = is reading. ఆమె = she.' },
            i5: { source: 'పిల్లలు మైదానంలో ఆడుకుంటున్నారు.', explanation: 'మైదానం = ground or field (మైదానంలో = in the ground); ఆడుకుంటున్నారు = are playing.' },
            i6: { source: 'మీరు భోజనం చేశారా?', explanation: 'A polite question about eating; -ఆ at the end makes a yes/no question. "Have you eaten?" is just as natural.' },
            q1: { source: 'నాకు ఇంగ్లీషు మాట్లాడటం ఇష్టం.', explanation: 'నాకు … ఇష్టం = I like; మాట్లాడటం = speaking.' },
            q2: { source: 'వారు రెండు సంవత్సరాలుగా బెంగళూరులో నివసిస్తున్నారు.', explanation: '-గా with a length of time (రెండు సంవత్సరాలుగా = for two years) and an ongoing action (నివసిస్తున్నారు) needs the present perfect continuous. వారు can be "they" or a respectful "he".' },
            q3: { source: 'రైలు సమయానికి వచ్చింది.', explanation: 'సమయానికి = on time; వచ్చింది = came.' },
            q4: { source: 'దయచేసి నెమ్మదిగా మాట్లాడండి.', explanation: 'నెమ్మదిగా = slowly; మాట్లాడండి is the polite form of "speak".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'దయచేసి నాకు కొంచెం నీళ్లు ఇవ్వండి.', accepted: ['దయచేసి నాకు కొంచెం నీళ్లు ఇవ్వు.', 'నాకు కొంచెం నీళ్లు ఇవ్వండి.', 'దయచేసి నాకు కొంచెం నీరు ఇవ్వండి.', 'దయచేసి కొంచెం నీళ్లు ఇవ్వండి.'], explanation: 'ఇవ్వండి is the polite form of "give" (ఇవ్వు with friends); కొంచెం = some, a little.' },
            i2: { model: 'తరగతి తొమ్మిది గంటలకు మొదలవుతుంది.', accepted: ['తరగతి తొమ్మిది గంటలకు ప్రారంభమవుతుంది.', 'క్లాస్ తొమ్మిది గంటలకు మొదలవుతుంది.', 'తరగతి 9 గంటలకు మొదలవుతుంది.'], explanation: 'గంటలకు = at … o\'clock; మొదలవుతుంది = starts.' },
            i3: { model: 'నేను నా పుస్తకాన్ని ఇంట్లో మర్చిపోయాను.', accepted: ['నా పుస్తకాన్ని ఇంట్లో మర్చిపోయాను.', 'నేను నా పుస్తకం ఇంట్లో మర్చిపోయాను.', 'నేను నా పుస్తకాన్ని ఇంట్లోనే మర్చిపోయాను.', 'నేను నా పుస్తకాన్ని ఇంట్లో మరచిపోయాను.'], explanation: 'మర్చిపోయాను = I forgot. The object takes -ని: పుస్తకం → పుస్తకాన్ని.' },
            i4: { model: 'దీని ధర ఎంత?', accepted: ['ఇది ఎంత?', 'దీని ఖరీదు ఎంత?', 'దీని వెల ఎంత?'], explanation: 'ధర = price; ఎంత = how much.' },
            i5: { model: 'నా పరీక్ష వచ్చే వారం ఉంది.', accepted: ['వచ్చే వారం నా పరీక్ష ఉంది.', 'నా పరీక్ష వచ్చే వారం.', 'నా పరీక్ష వచ్చే వారంలో ఉంది.', 'నా పరీక్ష వచ్చే వారం జరుగుతుంది.'], explanation: 'వచ్చే వారం = next week ("the coming week").' },
            i6: { model: 'మీరు నాకు సహాయం చేయగలరా?', accepted: ['మీరు నాకు సహాయం చేస్తారా?', 'నాకు సహాయం చేయగలరా?', 'నువ్వు నాకు సహాయం చేయగలవా?', 'మీరు నాకు సాయం చేయగలరా?'], explanation: 'సహాయం చేయు = help. చేయగలరా = can (you) do? -గల- means "can".' },
            q1: { model: 'మేము గ్రంథాలయానికి వెళ్తున్నాము.', accepted: ['మేము లైబ్రరీకి వెళ్తున్నాము.', 'మనం గ్రంథాలయానికి వెళ్తున్నాం.', 'మేము గ్రంథాలయానికి వెళ్తున్నాం.', 'మేము గ్రంథాలయానికి వెళుతున్నాము.'], explanation: 'గ్రంథాలయం = library (గ్రంథాలయానికి = to the library); వెళ్తున్నాము = are going.' },
            q2: { model: 'ఆమె కన్నడ చాలా బాగా మాట్లాడుతుంది.', accepted: ['ఆమె కన్నడను చాలా బాగా మాట్లాడుతుంది.', 'ఆమె చాలా బాగా కన్నడ మాట్లాడుతుంది.', 'ఆవిడ కన్నడ చాలా బాగా మాట్లాడతారు.', 'ఆమె కన్నడం చాలా బాగా మాట్లాడుతుంది.'], explanation: 'చాలా బాగా = very well; మాట్లాడుతుంది = speaks (the respectful form is ఆవిడ … మాట్లాడతారు).' },
            q3: { model: 'నీటిని వృథా చేయకండి.', accepted: ['నీళ్లను వృథా చేయకండి.', 'నీటిని వృథా చేయొద్దు.', 'నీళ్లు వృథా చేయకు.', 'నీటిని వృధా చేయకండి.'], explanation: 'వృథా చేయు = waste; చేయకండి = do not (polite). With friends, చేయకు.' },
            q4: { model: 'దుకాణం పది గంటలకు తెరుచుకుంటుంది.', accepted: ['దుకాణం 10 గంటలకు తెరుచుకుంటుంది.', 'దుకాణం పది గంటలకు తెరుస్తారు.', 'షాపు పది గంటలకు తెరుస్తారు.'], explanation: 'తెరుచుకుంటుంది = opens; పది గంటలకు = at ten o\'clock. Telugu also often says తెరుస్తారు ("they open").' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'సమావేశం సోమవారానికి వాయిదా వేయబడింది.', explanation: 'వేయబడింది is passive: "has been …". వాయిదా వేయు = postpone.' },
            i2: { source: 'దయచేసి నివేదికను శుక్రవారంలోగా పంపండి.', explanation: 'శుక్రవారంలోగా = by Friday: -లోగా with a day means "by" (not later than).' },
            i3: { source: 'ఆలస్యంగా సమాధానం ఇచ్చినందుకు క్షమించండి.', explanation: 'A common line in emails. క్షమించండి = sorry; ఆలస్యంగా = late.' },
            i4: { source: 'మా బృందం ప్రాజెక్టును సమయానికి పూర్తి చేసింది.', explanation: 'పూర్తి చేసింది = completed; బృందం = team.' },
            i5: { source: 'నేను గత సంవత్సరం నా డిగ్రీ పూర్తి చేశాను. ఇప్పుడు నేను ఒక సాఫ్ట్‌వేర్ కంపెనీలో ఉద్యోగం కోసం వెతుకుతున్నాను. కొత్త విషయాలు నేర్చుకోవడంలో నాకు చాలా ఆసక్తి ఉంది.', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'మీ సహకారానికి ధన్యవాదాలు.', explanation: 'సహకారం = cooperation; సహకారానికి = for (your) cooperation.' },
            q1: { source: 'ఈ సమస్య వీలైనంత త్వరగా పరిష్కరించబడుతుంది.', explanation: 'పరిష్కరించబడుతుంది is the future passive: "will be …". వీలైనంత త్వరగా = as soon as possible.' },
            q2: { source: 'నేను ఈ పదవికి దరఖాస్తు చేయాలనుకుంటున్నాను.', explanation: 'పదవి = post or position; దరఖాస్తు చేయు = apply. చేయాలనుకుంటున్నాను (I want to do) is said politely as "I would like".' },
            q3: { source: 'వారు సమావేశంలో ఒక మంచి సూచన ఇచ్చారు.', explanation: 'వారు can be "he" or "she" (said with respect) or "they". సూచన = suggestion.' },
            q4: { source: 'వినియోగదారుల సంతృప్తే మా మొదటి ప్రాధాన్యత.', explanation: 'సంతృప్తి = satisfaction; ప్రాధాన్యత = priority. The -ఏ in సంతృప్తే adds emphasis.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'కంపెనీ ఒక కొత్త విధానాన్ని ప్రకటించింది.', accepted: ['సంస్థ ఒక కొత్త విధానాన్ని ప్రకటించింది.', 'కంపెనీ కొత్త విధానాన్ని ప్రకటించింది.', 'సంస్థ కొత్త విధానాన్ని ప్రకటించింది.', 'కంపెనీ ఒక నూతన విధానాన్ని ప్రకటించింది.'], explanation: 'విధానం = policy; ప్రకటించింది = has announced. Telugu uses the same past form for "announced" and "has announced".' },
            i2: { model: 'విద్యే విజయానికి కీలకం.', accepted: ['విద్య విజయానికి కీలకం.', 'చదువే విజయానికి కీలకం.', 'విద్య విజయానికి కీలకమైనది.', 'విద్యే విజయానికి తాళంచెవి.'], explanation: 'విజయం = success (విజయానికి = to success); కీలకం = key. The -ఏ in విద్యే adds emphasis.' },
            i3: { model: 'ఏదైనా మార్పు ఉంటే దయచేసి నాకు తెలియజేయండి.', accepted: ['ఏమైనా మార్పు ఉంటే దయచేసి నాకు తెలియజేయండి.', 'ఏదైనా మార్పు ఉంటే నాకు తెలియజేయండి.', 'ఏవైనా మార్పులు ఉంటే దయచేసి నాకు తెలియజేయండి.', 'ఏదైనా మార్పు ఉంటే దయచేసి నాకు చెప్పండి.'], explanation: 'In Telugu the "if" part (ఉంటే = if there is) comes first. తెలియజేయండి = inform (polite).' },
            i4: { model: 'మనం పర్యావరణాన్ని కాపాడాలి.', accepted: ['మనం పర్యావరణాన్ని రక్షించాలి.', 'మనం పర్యావరణాన్ని పరిరక్షించాలి.', 'మనము పర్యావరణాన్ని కాపాడాలి.', 'మేము పర్యావరణాన్ని కాపాడాలి.'], explanation: '-ఆలి = should or must: కాపాడు (protect) → కాపాడాలి. మనం is "we" including the listener.' },
            i5: { model: 'మా కళాశాల గత వారం రక్తదాన శిబిరాన్ని నిర్వహించింది. చాలా మంది విద్యార్థులు, ఉపాధ్యాయులు అందులో పాల్గొన్నారు. వైద్యులు అందరికీ వారి మద్దతుకు ధన్యవాదాలు తెలిపారు.', accepted: [], explanation: 'రక్తదాన శిబిరం = blood donation camp; పాల్గొను = take part. Compare your sentences with the model.' },
            i6: { model: 'రెండు రోజుల సెలవు కోరుతూ నేను ఈ లేఖ రాస్తున్నాను.', accepted: ['రెండు రోజుల సెలవు కోరుతూ ఈ లేఖ రాస్తున్నాను.', 'రెండు రోజుల సెలవు కోసం నేను ఈ లేఖ రాస్తున్నాను.', 'రెండు రోజుల సెలవు కోరడానికి నేను రాస్తున్నాను.', 'రెండు రోజుల సెలవు అభ్యర్థిస్తూ నేను ఈ లేఖ రాస్తున్నాను.'], explanation: 'సెలవు = leave; కోరు = request (కోరుతూ = requesting). రాస్తున్నాను = I am writing.' },
            q1: { model: 'కష్టానికి ఎప్పుడూ ఫలితం దక్కుతుంది.', accepted: ['కష్టపడి పనిచేస్తే ఎప్పుడూ ఫలితం దక్కుతుంది.', 'కష్టానికి ఎప్పుడూ ఫలితం ఉంటుంది.', 'కృషికి ఎప్పుడూ ఫలితం ఉంటుంది.', 'కఠోర శ్రమ ఎప్పుడూ ఫలితాన్ని ఇస్తుంది.'], explanation: '"Pays off" means "gives a result": ఫలితం దక్కుతుంది. కష్టం here means hard work.' },
            q2: { model: 'ఫలితాలు రేపు ప్రకటించబడతాయి.', accepted: ['రేపు ఫలితాలు ప్రకటించబడతాయి.', 'ఫలితాలను రేపు ప్రకటిస్తారు.', 'రేపు ఫలితాలను ప్రకటిస్తారు.', 'ఫలితాలు రేపు విడుదలవుతాయి.'], explanation: '"Will be announced" is the future passive: ప్రకటించబడతాయి. Telugu also often says ప్రకటిస్తారు ("they will announce").' },
            q3: { model: 'మీ త్వరిత స్పందనకు ధన్యవాదాలు.', accepted: ['మీ శీఘ్ర స్పందనకు ధన్యవాదాలు.', 'మీ వేగవంతమైన స్పందనకు ధన్యవాదాలు.', 'త్వరగా స్పందించినందుకు ధన్యవాదాలు.', 'మీ త్వరిత సమాధానానికి ధన్యవాదాలు.'], explanation: 'త్వరిత = quick; స్పందన = response (స్పందనకు = for the response).' },
            q4: { model: 'భద్రత అందరి బాధ్యత.', accepted: ['భద్రత ప్రతి ఒక్కరి బాధ్యత.', 'భద్రత అందరి బాధ్యతే.', 'రక్షణ అందరి బాధ్యత.'], explanation: 'భద్రత = safety; అందరి = everyone\'s; బాధ్యత = responsibility.' }
        }
    },
    placement: {
        b4: { prompt: '"పుస్తకం" in English is…', explanation: 'పుస్తకం means book.' },
        a5: { prompt: '"సమావేశం వాయిదా వేయబడింది" best translates as…', explanation: 'వాయిదా వేయు means postpone, and -బడింది is passive: "has been".' }
    }
};
