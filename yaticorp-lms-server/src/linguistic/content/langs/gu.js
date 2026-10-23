/**
 * Linguistic Ability — Gujarati as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */

// Tips shared by the three Gujarati → English lessons, and by the three English → Gujarati lessons.
const TO_ENGLISH_POINTS = [
    'Gujarati puts the verb at the end: "હું શાળાએ જાઉં છું" (I school-to go). English puts it after the subject: "I go to school."',
    'English needs a, an and the, which Gujarati does not have. Gujarati does have છે, છું, છો (is, am, are), but at the end of the sentence; in English they come right after the subject.',
    'Watch the tense: જાઉં છું (go, or am going), જઈશ (will go), ગયો (went), જઈ રહ્યો છું (am going). કાલે means yesterday or tomorrow; the verb tells you which.',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const TO_GUJARATI_POINTS = [
    'Move the verb to the end: "I go to school" → "હું શાળાએ જાઉં છું." In the past and in -ing forms the verb also shows a boy or a girl: હું ગયો / હું ગઈ (I went), હું જઈ રહ્યો છું / હું જઈ રહી છું (I am going).',
    'There are no words for a, an or the in Gujarati; leave them out. (એક means "one"; it is used for "a" only sometimes.)',
    'Choose the polite form for elders and strangers: તમે, આવો, બેસો (and the very respectful આપ). With friends you may use તું, આવ, બેસ.',
    'Type in Gujarati with your phone\'s Gujarati keyboard, or use the Gujarati letters under the answer box. End a sentence with a full stop (.), as Gujarati does.'
];

module.exports = {
    code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', locale: 'gu-IN',
    words: {
        'vocab-beginner-1': {
            family: 'કુટુંબ, પરિવાર',
            mother: 'મા, માતા',
            father: 'પિતા, બાપુજી',
            house: 'ઘર',
            food: 'ખોરાક, ભોજન',
            happy: 'ખુશ, આનંદિત',
            big: 'મોટું',
            small: 'નાનું'
        },
        'vocab-beginner-2': {
            book: 'પુસ્તક, ચોપડી',
            teacher: 'શિક્ષક, શિક્ષિકા',
            student: 'વિદ્યાર્થી, વિદ્યાર્થિની',
            friend: 'મિત્ર, દોસ્ત',
            read: 'વાંચવું',
            write: 'લખવું',
            early: 'વહેલા, જલદી',
            easy: 'સરળ, સહેલું'
        },
        'vocab-intermediate-1': {
            honest: 'પ્રામાણિક',
            polite: 'નમ્ર, વિવેકી',
            curious: 'જિજ્ઞાસુ',
            confident: 'આત્મવિશ્વાસુ',
            patient: 'ધીરજવાન, ધૈર્યવાન',
            grateful: 'આભારી, કૃતજ્ઞ',
            anxious: 'ચિંતિત, બેચેન',
            generous: 'ઉદાર'
        },
        'vocab-intermediate-2': {
            deadline: 'અંતિમ તારીખ, સમયમર્યાદા',
            improve: 'સુધારવું, સુધારો કરવો',
            achieve: 'હાંસલ કરવું, મેળવવું',
            schedule: 'સમયપત્રક',
            opportunity: 'તક, મોકો',
            responsible: 'જવાબદાર',
            discuss: 'ચર્ચા કરવી',
            result: 'પરિણામ'
        },
        'vocab-advanced-1': {
            negotiate: 'વાટાઘાટ કરવી, ભાવતાલ કરવો',
            collaborate: 'સહયોગ કરવો, સાથે મળીને કામ કરવું',
            efficient: 'કાર્યક્ષમ, કુશળ',
            feasible: 'શક્ય, વ્યવહારુ',
            comprehensive: 'વ્યાપક, સર્વગ્રાહી',
            prioritise: 'પ્રાથમિકતા આપવી',
            ambiguous: 'અસ્પષ્ટ, દ્વિઅર્થી',
            persuade: 'મનાવવું, સમજાવવું'
        },
        'vocab-advanced-2': {
            sustainable: 'ટકાઉ',
            consequence: 'પરિણામ, નતીજો',
            perspective: 'દૃષ્ટિકોણ',
            inevitable: 'અનિવાર્ય, અટળ',
            substantial: 'નોંધપાત્ર',
            advocate: 'સમર્થન કરવું, હિમાયત કરવી',
            diverse: 'વૈવિધ્યપૂર્ણ, વિવિધ',
            integrity: 'પ્રામાણિકતા, નૈતિકતા'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Gujarati has no words for a, an or the (એક means "one"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Gujarati the verb comes last: "રવિ પુસ્તકો વાંચે છે." In English the verb comes right after the subject.' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Gujarati word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Gujarati.',
            points: [...TO_GUJARATI_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Gujarati verb ending to choose the English tense.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Gujarati. Use the polite form for requests: આપો, બોલો, કરો. The forms આપજો and કરજો are politer still.',
            points: [...TO_GUJARATI_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Gujarati. Passive forms such as કરવામાં આવશે (will be done) and કરવામાં આવ્યું છે (has been done) are common in notices.',
            points: [...TO_GUJARATI_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'પાણી', explanation: 'પાણી means water.' },
            i2: { source: 'પુસ્તક', explanation: 'પુસ્તક (or ચોપડી) means book.' },
            i3: { source: 'મારું નામ રાની છે.', explanation: 'મારું = my, નામ = name, છે = is. In English "is" comes before the name, not at the end.' },
            i4: { source: 'તમે કેમ છો?', explanation: 'This is the common polite greeting: કેમ = how, છો = are. English puts "are" right after "How".' },
            i5: { source: 'હું મજામાં છું.', explanation: 'મજામાં છું is the usual reply to કેમ છો: I am fine (ઠીક છું is also used). In English "am" comes right after "I".' },
            i6: { source: 'આ મારું ઘર છે.', explanation: 'આ = this, ઘર = house or home. The verb છે (is) moves to after "This".' },
            q1: { source: 'હું શાળાએ જાઉં છું.', explanation: 'જાઉં છું means "I go" (or "I am going"). The verb moves to after "I", and શાળાએ (to school) becomes "to school".' },
            q2: { source: 'તે મારી નાની બહેન છે.', explanation: 'નાની બહેન is a younger sister (મોટી બહેન is an elder sister). તે can be "he" or "she"; here it is "she".' },
            q3: { source: 'કૃપા કરીને દરવાજો બંધ કરો.', explanation: 'કૃપા કરીને = please, દરવાજો = door, બંધ કરો = close (polite).' },
            q4: { source: 'આભાર.', explanation: 'આભાર is the usual way to say thank you; ધન્યવાદ is also used.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'મિત્ર', accepted: ['દોસ્ત', 'બહેનપણી', 'સખી', 'ભાઈબંધ'], explanation: 'Friend is મિત્ર (or દોસ્ત). A girl\'s female friend is often called બહેનપણી or સખી.' },
            i2: { model: 'શાળા', accepted: ['સ્કૂલ', 'નિશાળ'], explanation: 'School is શાળા; સ્કૂલ and નિશાળ are also common.' },
            i3: { model: 'સુપ્રભાત.', accepted: ['શુભ સવાર.'], explanation: 'સુપ્રભાત is "good morning"; શુભ સવાર is also heard. નમસ્તે is a greeting for any time of day.' },
            i4: { model: 'હું વિદ્યાર્થી છું.', accepted: ['હું વિદ્યાર્થિની છું.', 'હું એક વિદ્યાર્થી છું.', 'હું એક વિદ્યાર્થિની છું.', 'હું છાત્ર છું.'], explanation: 'છું = am, and it comes at the end. Gujarati needs no word for "a" (એક is optional). A girl may say વિદ્યાર્થિની.' },
            i5: { model: 'તમારું નામ શું છે?', accepted: ['તારું નામ શું છે?', 'આપનું નામ શું છે?'], explanation: 'તમારું is polite (આપનું is very formal); with a friend you can say તારું. શું = what.' },
            i6: { model: 'ખાવાનું સ્વાદિષ્ટ છે.', accepted: ['જમવાનું સ્વાદિષ્ટ છે.', 'ભોજન સ્વાદિષ્ટ છે.', 'ખોરાક સ્વાદિષ્ટ છે.'], explanation: 'સ્વાદ = taste; સ્વાદિષ્ટ = tasty. "Is" (છે) comes at the end.' },
            q1: { model: 'બસ સ્ટેન્ડ ક્યાં છે?', accepted: ['બસસ્ટેન્ડ ક્યાં છે?', 'બસ સ્ટેશન ક્યાં છે?', 'બસ મથક ક્યાં છે?'], explanation: 'ક્યાં = where; ક્યાં છે = where is (it). બસ મથક is the formal Gujarati word for bus stand.' },
            q2: { model: 'મને કેરી ગમે છે.', accepted: ['મને કેરીઓ ગમે છે.', 'મને કેરી ભાવે છે.', 'મને કેરી બહુ ભાવે છે.'], explanation: 'Gujarati says "to me, mango is pleasing": મને … ગમે છે. For food, Gujarati also uses ભાવે છે: મને કેરી ભાવે છે.' },
            q3: { model: 'અહીં આવો.', accepted: ['અહીં આવ.', 'અહીંયાં આવો.', 'અહીંયાં આવ.'], explanation: 'આવો is polite; આવ is used with friends and children.' },
            q4: { model: 'વરસાદ પડી રહ્યો છે.', accepted: ['વરસાદ પડે છે.', 'વરસાદ આવે છે.', 'વરસાદ આવી રહ્યો છે.'], explanation: 'Gujarati says "rain is falling": વરસાદ પડી રહ્યો છે. રહ્યો છે shows that it is going on now (રહ્યો, because વરસાદ is masculine).' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'મેં કાલે ફિલ્મ જોઈ.', explanation: 'જોઈ is past tense: watched (or saw). કાલે means yesterday or tomorrow; the past tense tells you it is yesterday. With a past verb, "I" is મેં.' },
            i2: { source: 'તે દરરોજ સવારે દોડે છે.', explanation: 'A habit takes the simple present: દોડે છે = runs. તે can be "he" or "she" (this verb form does not show which); here it is "he", and "she" is right too.', alsoAccept: ['She runs every morning.', 'She goes running every morning.', 'Every morning she runs.'] },
            i3: { source: 'અમે કાલે મૈસૂર જઈશું.', explanation: 'જઈશું is the future: will go. So કાલે here means tomorrow. English adds "to" before Mysuru.' },
            i4: { source: 'તે પુસ્તક વાંચી રહી છે.', explanation: 'વાંચી રહી છે shows an action happening now: is reading. રહી shows the reader is female, so તે is "she".' },
            i5: { source: 'બાળકો મેદાનમાં રમી રહ્યાં છે.', explanation: 'મેદાન = ground or field (મેદાનમાં = in the ground); રમી રહ્યાં છે = are playing.' },
            i6: { source: 'તમે જમ્યા?', explanation: 'A polite question about eating: જમ્યા is the past of જમવું (to have a meal), and the rising voice makes it a question. "Have you eaten?" is just as natural.' },
            q1: { source: 'મને અંગ્રેજી બોલવું ગમે છે.', explanation: 'મને … ગમે છે = I like; બોલવું = to speak.' },
            q2: { source: 'તેઓ બે વર્ષથી બેંગલુરુમાં રહે છે.', explanation: '-થી with a length of time (બે વર્ષથી = for two years) and a present verb (રહે છે) needs the present perfect continuous in English. તેઓ can be "they" or a respectful "he".' },
            q3: { source: 'ટ્રેન સમયસર આવી.', explanation: 'સમયસર = on time; આવી = came (ટ્રેન is feminine in Gujarati, so આવી, not આવ્યો).' },
            q4: { source: 'કૃપા કરીને ધીમે ધીમે બોલો.', explanation: 'ધીમે ધીમે = slowly; બોલો is the polite form of "speak".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'કૃપા કરીને મને થોડું પાણી આપો.', accepted: ['કૃપા કરીને મને થોડું પાણી આપ.', 'મને થોડું પાણી આપો.', 'કૃપા કરીને થોડું પાણી આપો.', 'મહેરબાની કરીને મને થોડું પાણી આપો.'], explanation: 'આપો is the polite form of "give" (આપ with friends); થોડું = some, a little.' },
            i2: { model: 'વર્ગ નવ વાગ્યે શરૂ થાય છે.', accepted: ['ક્લાસ નવ વાગ્યે શરૂ થાય છે.', 'વર્ગ 9 વાગ્યે શરૂ થાય છે.', 'વર્ગ નવ વાગે શરૂ થાય છે.', 'ક્લાસ નવ વાગે શરૂ થાય છે.'], explanation: 'નવ વાગ્યે = at nine o\'clock; શરૂ થાય છે = starts.' },
            i3: { model: 'હું મારું પુસ્તક ઘરે ભૂલી ગયો.', accepted: ['હું મારું પુસ્તક ઘરે ભૂલી ગઈ.', 'હું મારી ચોપડી ઘરે ભૂલી ગયો.', 'હું મારી ચોપડી ઘરે ભૂલી ગઈ.', 'હું પુસ્તક ઘરે ભૂલી ગયો.'], explanation: 'ભૂલી ગયો = forgot (a girl says ભૂલી ગઈ); ઘરે = at home.' },
            i4: { model: 'આની કિંમત કેટલી છે?', accepted: ['આના કેટલા પૈસા છે?', 'આ કેટલાનું છે?', 'આનો ભાવ કેટલો છે?', 'આની કિંમત શું છે?'], explanation: 'કિંમત = price; કેટલી = how much (કેટલો, કેટલી or કેટલું, to match the noun).' },
            i5: { model: 'મારી પરીક્ષા આવતા અઠવાડિયે છે.', accepted: ['આવતા અઠવાડિયે મારી પરીક્ષા છે.', 'મારી પરીક્ષા આવતા સપ્તાહે છે.', 'આવતા સપ્તાહે મારી પરીક્ષા છે.'], explanation: 'આવતા અઠવાડિયે (or આવતા સપ્તાહે) = next week.' },
            i6: { model: 'શું તમે મારી મદદ કરી શકો છો?', accepted: ['તમે મારી મદદ કરી શકો?', 'શું તમે મને મદદ કરી શકો છો?', 'શું તું મારી મદદ કરી શકે છે?', 'તમે મારી મદદ કરશો?'], explanation: 'મદદ કરવી = to help; કરી શકો છો = can (you) do. શું at the start makes a yes/no question. Gujarati says "do my help": મારી મદદ.' },
            q1: { model: 'અમે પુસ્તકાલય જઈ રહ્યા છીએ.', accepted: ['અમે પુસ્તકાલયમાં જઈ રહ્યા છીએ.', 'અમે લાઇબ્રેરી જઈ રહ્યા છીએ.', 'અમે પુસ્તકાલય જઈએ છીએ.', 'આપણે પુસ્તકાલય જઈ રહ્યા છીએ.'], explanation: 'પુસ્તકાલય = library; જઈ રહ્યા છીએ = are going. Gujarati needs no word for "to" here. આપણે is also "we", when it includes the listener.' },
            q2: { model: 'તે કન્નડ ખૂબ સારી રીતે બોલે છે.', accepted: ['તે કન્નડ બહુ સારી રીતે બોલે છે.', 'તેઓ કન્નડ ખૂબ સારી રીતે બોલે છે.', 'એ કન્નડ ખૂબ સારી રીતે બોલે છે.'], explanation: 'ખૂબ સારી રીતે = very well; બોલે છે = speaks. તે can be "he" or "she"; તેઓ is the respectful form.' },
            q3: { model: 'પાણીનો બગાડ ન કરો.', accepted: ['પાણીનો બગાડ કરશો નહીં.', 'પાણી ન બગાડો.', 'પાણીનો વ્યય ન કરો.', 'પાણી બગાડશો નહીં.'], explanation: 'ન કરો = do not (polite); notices often say કરશો નહીં. With friends: પાણી ન બગાડ. બગાડ = waste.' },
            q4: { model: 'દુકાન દસ વાગ્યે ખૂલે છે.', accepted: ['દુકાન 10 વાગ્યે ખૂલે છે.', 'દુકાન દસ વાગ્યે ખુલે છે.', 'દુકાન દસ વાગે ખૂલે છે.'], explanation: 'ખૂલે છે = opens; દસ વાગ્યે = at ten o\'clock.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'બેઠક સોમવાર સુધી મુલતવી રાખવામાં આવી છે.', explanation: 'રાખવામાં આવી છે is passive: "has been …". મુલતવી રાખવું = postpone; સુધી = till.' },
            i2: { source: 'કૃપા કરીને રિપોર્ટ શુક્રવાર સુધીમાં મોકલી આપો.', explanation: 'સુધીમાં with a day means "by" (not later than); સુધી alone means "until".' },
            i3: { source: 'મોડો જવાબ આપવા બદલ માફ કરશો.', explanation: 'A common line in emails. માફ કરશો = sorry (literally "please forgive"); મોડો = late; બદલ = for.' },
            i4: { source: 'અમારી ટીમે પ્રોજેક્ટ સમયસર પૂરો કર્યો.', explanation: 'પૂરો કર્યો = completed; સમયસર = on time. The -એ in ટીમે marks the doer with a past verb.' },
            i5: { source: 'મેં ગયા વર્ષે મારી ડિગ્રી પૂરી કરી. હવે હું એક સોફ્ટવેર કંપનીમાં નોકરી શોધી રહ્યો છું. મને નવી વસ્તુઓ શીખવામાં ખૂબ રસ છે.', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'તમારા સહકાર બદલ આભાર.', explanation: 'સહકાર = cooperation; બદલ = for.' },
            q1: { source: 'આ સમસ્યાનું શક્ય તેટલું જલદી નિરાકરણ કરવામાં આવશે.', explanation: 'કરવામાં આવશે is the future passive: "will be …". શક્ય તેટલું જલદી = as soon as possible; નિરાકરણ = solution.' },
            q2: { source: 'હું આ પદ માટે અરજી કરવા ઇચ્છું છું.', explanation: 'પદ = post or position; અરજી કરવી = apply. ઇચ્છું છું (I wish, I want) is said politely as "I would like".' },
            q3: { source: 'તેમણે બેઠકમાં એક સારું સૂચન કર્યું.', explanation: 'તેમણે can be "he" or "she" (said with respect) or "they". સૂચન = suggestion.' },
            q4: { source: 'ગ્રાહકોનો સંતોષ જ અમારી પ્રથમ પ્રાથમિકતા છે.', explanation: 'સંતોષ = satisfaction; પ્રાથમિકતા = priority. જ adds emphasis.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'કંપનીએ નવી નીતિ જાહેર કરી છે.', accepted: ['કંપનીએ એક નવી નીતિ જાહેર કરી છે.', 'કંપનીએ નવી નીતિની જાહેરાત કરી છે.', 'કંપનીએ એક નવી નીતિની જાહેરાત કરી છે.'], explanation: 'નીતિ = policy; જાહેર કરી છે = has announced. The -એ in કંપનીએ marks the doer with a past verb.' },
            i2: { model: 'શિક્ષણ સફળતાની ચાવી છે.', accepted: ['શિક્ષણ જ સફળતાની ચાવી છે.', 'શિક્ષણ એ સફળતાની ચાવી છે.'], explanation: 'સફળતા = success; ચાવી = key. "The key to success" becomes સફળતાની ચાવી ("success\'s key").' },
            i3: { model: 'જો કોઈ ફેરફાર હોય, તો કૃપા કરીને મને જણાવો.', accepted: ['જો કોઈ ફેરફાર થાય, તો કૃપા કરીને મને જાણ કરો.', 'કોઈ ફેરફાર હોય તો મને જણાવશો.', 'જો કોઈ ફેરફાર હોય તો કૃપા કરીને મને જાણ કરજો.', 'કોઈ ફેરફાર હોય તો કૃપા કરીને મને જણાવજો.'], explanation: 'In Gujarati the "if" part (જો … તો) comes first. જણાવવું or જાણ કરવી = to inform.' },
            i4: { model: 'આપણે પર્યાવરણનું રક્ષણ કરવું જોઈએ.', accepted: ['આપણે પર્યાવરણની રક્ષા કરવી જોઈએ.', 'આપણે પર્યાવરણનું જતન કરવું જોઈએ.', 'આપણે પર્યાવરણનું સંરક્ષણ કરવું જોઈએ.', 'આપણે પર્યાવરણને બચાવવું જોઈએ.'], explanation: 'જોઈએ = should: કરવું જોઈએ = should do. આપણે is the "we" that includes the listener, so it fits "all of us".' },
            i5: { model: 'અમારી કૉલેજે ગયા અઠવાડિયે રક્તદાન શિબિરનું આયોજન કર્યું. ઘણા વિદ્યાર્થીઓ અને શિક્ષકોએ તેમાં ભાગ લીધો. ડૉક્ટરોએ સૌનો તેમના સહકાર બદલ આભાર માન્યો.', accepted: [], explanation: 'રક્તદાન શિબિર = blood donation camp; ભાગ લેવો = take part; આભાર માનવો = to thank. Compare your sentences with the model.' },
            i6: { model: 'હું બે દિવસની રજાની વિનંતી કરવા માટે લખી રહ્યો છું.', accepted: ['હું બે દિવસની રજાની વિનંતી કરવા માટે લખી રહી છું.', 'હું બે દિવસની રજા માગવા માટે લખી રહ્યો છું.', 'હું બે દિવસની રજા માગવા માટે લખી રહી છું.', 'બે દિવસની રજાની વિનંતી કરવા હું આ પત્ર લખી રહ્યો છું.'], explanation: 'રજા = leave; વિનંતી કરવી = request. A woman writes લખી રહી છું.' },
            q1: { model: 'સખત મહેનતનું ફળ હંમેશાં મળે છે.', accepted: ['મહેનતનું ફળ હંમેશાં મળે છે.', 'સખત મહેનતનું ફળ હંમેશા મળે છે.', 'પરિશ્રમનું ફળ હંમેશાં મળે છે.', 'મહેનત ક્યારેય નિષ્ફળ જતી નથી.'], explanation: '"Pays off" means "gives a result": ફળ મળે છે. મહેનત ક્યારેય નિષ્ફળ જતી નથી ("hard work never fails") is another common way to say it.' },
            q2: { model: 'પરિણામ આવતીકાલે જાહેર કરવામાં આવશે.', accepted: ['પરિણામો આવતીકાલે જાહેર કરવામાં આવશે.', 'આવતીકાલે પરિણામ જાહેર કરવામાં આવશે.', 'પરિણામ આવતીકાલે જાહેર થશે.', 'પરિણામ કાલે જાહેર થશે.'], explanation: '"Will be announced" is the future passive: જાહેર કરવામાં આવશે. આવતીકાલે is a clear "tomorrow" (કાલે alone can also mean yesterday).' },
            q3: { model: 'તમારા ઝડપી પ્રતિભાવ બદલ આભાર.', accepted: ['આપના ઝડપી પ્રતિભાવ બદલ આભાર.', 'તમારા ઝડપી જવાબ બદલ આભાર.', 'તમારા ઝડપી પ્રતિસાદ બદલ આભાર.', 'ઝડપથી જવાબ આપવા બદલ આભાર.'], explanation: 'ઝડપી = quick; પ્રતિભાવ (or જવાબ) = response; બદલ = for.' },
            q4: { model: 'સલામતી દરેકની જવાબદારી છે.', accepted: ['સલામતી સૌની જવાબદારી છે.', 'સુરક્ષા દરેકની જવાબદારી છે.', 'સુરક્ષા સૌની જવાબદારી છે.'], explanation: 'સલામતી = safety; દરેકની (or સૌની) = everyone\'s; જવાબદારી = responsibility.' }
        }
    },
    placement: {
        b4: { prompt: '"પુસ્તક" in English is…', explanation: 'પુસ્તક means book.' },
        a5: { prompt: '"બેઠક મુલતવી રાખવામાં આવી છે" best translates as…', explanation: 'મુલતવી રાખવું means postpone, and રાખવામાં આવી છે is passive: "has been".' }
    }
};
