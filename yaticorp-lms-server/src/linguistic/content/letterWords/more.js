/**
 * Words for the letters that had none (2026-11-04, the user: "don't match them with their sound, give the word for
 * that letter" — all languages): a word that starts with the letter where there is one (ಕಾ ಕಾಗೆ, ಕಿ ಕಿವಿ…), else one
 * with the letter inside it, its 8th field the part of the word to colour (ಙ in ವಾಙ್ಮಯ, ಞ in ಜ್ಞಾನ, ಣ in ಕಣ್ಣು).
 * Lines as the other letterWords files: "letter|word|its sound|picture|sentence|its sound|its meaning|inside".
 * Left by their sound: Chinese tones and its A–Z names (sounds, by nature), Tamil கஂ, Punjabi ਅਃ ਙ ਞ ਕਂ, Odia ଵ and
 * Japanese ヲ (no everyday word has them). Written here, not by any translation service: a native speaker should check.
 */
const { parse } = require('./parse');

module.exports = {
    kn: parse(`
ಅಃ|ದುಃಖ|duḥkha|😢|ಅವನಿಗೆ ದುಃಖ ಆಗಿದೆ.|avanige duḥkha āgide|He is sad.|ಃ
ಙ|ವಾಙ್ಮಯ|vāṅmaya|📚|ಕನ್ನಡ ವಾಙ್ಮಯ ಶ್ರೀಮಂತವಾಗಿದೆ.|kannaḍa vāṅmaya śrīmantavāgide|Kannada literature is rich.|ಙ
ಞ|ಜ್ಞಾನ|jñāna|🧠|ಪುಸ್ತಕ ಜ್ಞಾನ ಕೊಡುತ್ತದೆ.|pustaka jñāna koḍuttade|Books give knowledge.|ಞ
ಠ|ಠಾಣೆ|ṭhāṇe|🚓|ಪೊಲೀಸರು ಠಾಣೆಯಲ್ಲಿ ಇದ್ದಾರೆ.|polīsaru ṭhāṇeyalli iddāre|The police are at the station.
ಣ|ಕಣ್ಣು|kaṇṇu|👁️|ನನ್ನ ಕಣ್ಣು ಕಪ್ಪು.|nanna kaṇṇu kappu|My eyes are black.|ಣ
ಥ|ಕಥೆ|kathe|📖|ಅಜ್ಜಿ ಕಥೆ ಹೇಳುತ್ತಾರೆ.|ajji kathe hēḷuttāre|Grandma tells a story.|ಥ
ಷ|ಭಾಷೆ|bhāṣe|🗣️|ಕನ್ನಡ ನಮ್ಮ ಭಾಷೆ.|kannaḍa namma bhāṣe|Kannada is our language.|ಷ
ಳ|ಬಾಳೆಹಣ್ಣು|bāḷehaṇṇu|🍌|ಬಾಳೆಹಣ್ಣು ಹಳದಿ ಬಣ್ಣ.|bāḷehaṇṇu haḷadi baṇṇa|The banana is yellow.|ಳ
ಕಾ|ಕಾಗೆ|kāge|🐦|ಕಾಗೆ ಕಪ್ಪಾಗಿದೆ.|kāge kappāgide|The crow is black.
ಕಿ|ಕಿವಿ|kivi|👂|ನಾನು ಕಿವಿಯಿಂದ ಕೇಳುತ್ತೇನೆ.|nānu kiviyinda kēḷuttēne|I hear with my ears.
ಕೀ|ಕೀಲಿ|kīli|🔑|ಕೀಲಿ ಬಾಗಿಲು ತೆರೆಯುತ್ತದೆ.|kīli bāgilu tereyuttade|The key opens the door.
ಕು|ಕುರಿ|kuri|🐑|ಕುರಿ ಹುಲ್ಲು ತಿನ್ನುತ್ತದೆ.|kuri hullu tinnuttade|The sheep eats grass.
ಕೂ|ಕೂದಲು|kūdalu|💇|ಅವಳ ಕೂದಲು ಉದ್ದವಾಗಿದೆ.|avaḷa kūdalu uddavāgide|Her hair is long.
ಕೃ|ಕೃಷಿ|kṛṣi|🌾|ರೈತ ಕೃಷಿ ಮಾಡುತ್ತಾನೆ.|raita kṛṣi māḍuttāne|The farmer farms.
ಕೆ|ಕೆರೆ|kere|🏞️|ಕೆರೆಯಲ್ಲಿ ನೀರು ಇದೆ.|kereyalli nīru ide|There is water in the lake.
ಕೇ|ಕೇಕ್|kēk|🎂|ಹುಟ್ಟುಹಬ್ಬಕ್ಕೆ ಕೇಕ್ ತಂದೆವು.|huṭṭuhabbakke kēk tandevu|We brought a cake for the birthday.
ಕೈ|ಕೈ|kai|✋|ಊಟದ ಮೊದಲು ಕೈ ತೊಳೆಯಿರಿ.|ūṭada modalu kai toḷeyiri|Wash your hands before eating.
ಕೊ|ಕೊಡೆ|koḍe|☂️|ಮಳೆಯಲ್ಲಿ ಕೊಡೆ ಬೇಕು.|maḷeyalli koḍe bēku|You need an umbrella in the rain.
ಕೋ|ಕೋತಿ|kōti|🐒|ಕೋತಿ ಮರ ಹತ್ತುತ್ತದೆ.|kōti mara hattuttade|The monkey climbs the tree.
ಕೌ|ಕೌದಿ|kaudi|🛏️|ಅಜ್ಜಿ ಕೌದಿ ಹೊಲಿಯುತ್ತಾರೆ.|ajji kaudi holiyuttāre|Grandma sews a quilt.
ಕಂ|ಕಂಪ್ಯೂಟರ್|kampyūṭar|💻|ನಾನು ಕಂಪ್ಯೂಟರ್ ಬಳಸುತ್ತೇನೆ.|nānu kampyūṭar baḷasuttēne|I use a computer.
`),
    hi: parse(`
अः|दुःख|duḥkh|😢|उसे बहुत दुःख हुआ।|use bahut duḥkh huā|He felt very sad.|ः
ङ|गङ्गा|gaṅgā|🏞️|गङ्गा एक बड़ी नदी है।|gaṅgā ek baṛī nadī hai|The Ganga is a big river.|ङ
ञ|ज्ञान|jñān|🧠|किताबें ज्ञान देती हैं।|kitābẽ jñān detī haĩ|Books give knowledge.|ञ
ण|बाण|bāṇ|🏹|धनुष से बाण चलता है।|dhanuṣ se bāṇ caltā hai|The arrow flies from the bow.|ण
ष|भाषा|bhāṣā|🗣️|हिंदी हमारी भाषा है।|hindī hamārī bhāṣā hai|Hindi is our language.|ष
का|कान|kān|👂|मैं कान से सुनता हूँ।|maĩ kān se suntā hū̃|I hear with my ears.
कि|किताब|kitāb|📖|यह मेरी किताब है।|yah merī kitāb hai|This is my book.
की|कीड़ा|kīṛā|🐛|कीड़ा पत्ता खाता है।|kīṛā pattā khātā hai|The insect eats a leaf.
कु|कुत्ता|kuttā|🐕|कुत्ता भौंकता है।|kuttā bhaũktā hai|The dog barks.
कू|कूड़ा|kūṛā|🗑️|कूड़ा डिब्बे में डालो।|kūṛā ḍibbe mẽ ḍālo|Put the rubbish in the bin.
कृ|कृषि|kṛṣi|🌾|किसान कृषि करता है।|kisān kṛṣi kartā hai|The farmer farms.
के|केला|kelā|🍌|केला पीला है।|kelā pīlā hai|The banana is yellow.
कै|कैंची|kaĩcī|✂️|कैंची से कागज़ काटो।|kaĩcī se kāgaz kāṭo|Cut the paper with scissors.
को|कोयल|koyal|🐦|कोयल मीठा गाती है।|koyal mīṭhā gātī hai|The cuckoo sings sweetly.
कौ|कौआ|kauā|🐦|कौआ काला होता है।|kauā kālā hotā hai|The crow is black.
कं|कंप्यूटर|kampyūṭar|💻|मैं कंप्यूटर चलाता हूँ।|maĩ kampyūṭar calātā hū̃|I use a computer.
`),
    ta: parse(`
ஃ|எஃகு|eḵku|🔩|எஃகு வலிமையானது.|eḵku valimaiyāṉatu|Steel is strong.|ஃ
ங|சிங்கம்|ciṅkam|🦁|சிங்கம் காட்டின் ராஜா.|ciṅkam kāṭṭiṉ rājā|The lion is the king of the forest.|ங
ண|கண்|kaṇ|👁️|என் கண் கருப்பு.|eṉ kaṇ karuppu|My eye is black.|ண
ன|மீன்|mīṉ|🐟|மீன் தண்ணீரில் நீந்துகிறது.|mīṉ taṇṇīril nīntukiṟatu|The fish swims in the water.|ன
ற|சோறு|cōṟu|🍚|நான் சோறு சாப்பிடுகிறேன்.|nāṉ cōṟu cāppiṭukiṟēṉ|I eat rice.|ற
ள|வாள்|vāḷ|🗡️|வீரன் வாள் வைத்திருக்கிறான்.|vīraṉ vāḷ vaittirukkiṟāṉ|The warrior holds a sword.|ள
ழ|பழம்|paḻam|🍎|பழம் இனிப்பாக இருக்கிறது.|paḻam iṉippāka irukkiṟatu|The fruit is sweet.|ழ
ஶ|ஶக்தி|śakti|💪|யானைக்கு ஶக்தி அதிகம்.|yāṉaikku śakti atikam|The elephant has great strength.
ஷ|ஷர்ட்|ṣarṭ|👕|ஷர்ட் நீலமாக இருக்கிறது.|ṣarṭ nīlamāka irukkiṟatu|The shirt is blue.
ஸ|பஸ்|pas|🚌|பஸ் வேகமாகப் போகிறது.|pas vēkamākap pōkiṟatu|The bus goes fast.|ஸ
கா|காகம்|kākam|🐦|காகம் கருப்பாக இருக்கிறது.|kākam karuppāka irukkiṟatu|The crow is black.
கி|கிளி|kiḷi|🦜|கிளி பச்சையாக இருக்கிறது.|kiḷi paccaiyāka irukkiṟatu|The parrot is green.
கீ|கீரை|kīrai|🥬|கீரை உடலுக்கு நல்லது.|kīrai uṭalukku nallatu|Greens are good for the body.
கு|குதிரை|kutirai|🐎|குதிரை வேகமாக ஓடுகிறது.|kutirai vēkamāka ōṭukiṟatu|The horse runs fast.
கூ|கூடை|kūṭai|🧺|கூடையில் பழங்கள் உள்ளன.|kūṭaiyil paḻaṅkaḷ uḷḷaṉa|There are fruits in the basket.
கெ|கெண்டை|keṇṭai|🐟|கெண்டை மீன் குளத்தில் இருக்கிறது.|keṇṭai mīṉ kuḷattil irukkiṟatu|The carp is in the pond.
கே|கேக்|kēk|🎂|பிறந்தநாளுக்கு கேக் வாங்கினோம்.|piṟantanāḷukku kēk vāṅkiṉōm|We bought a cake for the birthday.
கை|கை|kai|✋|சாப்பிடும் முன் கை கழுவு.|cāppiṭum muṉ kai kaḻuvu|Wash your hands before eating.
கொ|கொடி|koṭi|🚩|கொடி பறக்கிறது.|koṭi paṟakkiṟatu|The flag is flying.
கோ|கோழி|kōḻi|🐔|கோழி முட்டை இடுகிறது.|kōḻi muṭṭai iṭukiṟatu|The hen lays an egg.
கௌ|கௌதாரி|kautāri|🐦|கௌதாரி வயலில் இருக்கிறது.|kautāri vayalil irukkiṟatu|The partridge is in the field.
`),
    te: parse(`
అః|దుఃఖం|duḥkhaṁ|😢|అతనికి దుఃఖం కలిగింది.|ataniki duḥkhaṁ kaligindi|He felt sorrow.|ః
ఙ|వాఙ్మయం|vāṅmayaṁ|📚|తెలుగు వాఙ్మయం గొప్పది.|telugu vāṅmayaṁ goppadi|Telugu literature is great.|ఙ
ఝ|ఝరి|jhari|🏞️|కొండల్లో ఝరి ప్రవహిస్తుంది.|koṇḍallō jhari pravahistundi|A stream flows in the hills.
ఞ|జ్ఞానం|jñānaṁ|🧠|పుస్తకాలు జ్ఞానం ఇస్తాయి.|pustakālu jñānaṁ istāyi|Books give knowledge.|ఞ
ఠ|పాఠం|pāṭhaṁ|📖|టీచర్ పాఠం చెబుతున్నారు.|ṭīcar pāṭhaṁ cebutunnāru|The teacher is teaching a lesson.|ఠ
ణ|బాణం|bāṇaṁ|🏹|విల్లు నుండి బాణం వెళ్తుంది.|villu nuṇḍi bāṇaṁ veḷtundi|The arrow flies from the bow.|ణ
థ|కథ|katha|📖|అమ్మమ్మ కథ చెబుతుంది.|ammamma katha cebutundi|Grandma tells a story.|థ
ష|భాష|bhāṣa|🗣️|తెలుగు మన భాష.|telugu mana bhāṣa|Telugu is our language.|ష
ళ|కళ్ళు|kaḷḷu|👀|నా కళ్ళు నల్లగా ఉన్నాయి.|nā kaḷḷu nallagā unnāyi|My eyes are black.|ళ
కా|కాకి|kāki|🐦|కాకి నల్లగా ఉంటుంది.|kāki nallagā uṇṭundi|The crow is black.
కి|కిటికీ|kiṭikī|🪟|కిటికీ తెరిచి ఉంది.|kiṭikī terici undi|The window is open.
కీ|కీటకం|kīṭakaṁ|🐛|కీటకం ఆకును తింటుంది.|kīṭakaṁ ākunu tiṇṭundi|The insect eats the leaf.
కు|కుక్క|kukka|🐕|కుక్క మొరుగుతుంది.|kukka morugutundi|The dog barks.
కూ|కూర|kūra|🍛|అమ్మ కూర వండుతుంది.|amma kūra vaṇḍutundi|Mother cooks curry.
కృ|కృషి|kṛṣi|🌾|రైతు కృషి చేస్తాడు.|raitu kṛṣi cēstāḍu|The farmer works hard.
కె|కెమెరా|kemerā|📷|నా దగ్గర కెమెరా ఉంది.|nā daggara kemerā undi|I have a camera.
కే|కేక్|kēk|🎂|పుట్టినరోజుకు కేక్ తెచ్చాం.|puṭṭinarōjuku kēk teccāṁ|We brought a cake for the birthday.
కై|కైలాసం|kailāsaṁ|🏔️|కైలాసం మంచుతో నిండి ఉంది.|kailāsaṁ mancutō niṇḍi undi|Kailash is covered in snow.
కొ|కొబ్బరి|kobbari|🥥|కొబ్బరి నీళ్ళు తియ్యగా ఉంటాయి.|kobbari nīḷḷu tiyyagā uṇṭāyi|Coconut water is sweet.
కో|కోడి|kōḍi|🐔|కోడి గుడ్డు పెడుతుంది.|kōḍi guḍḍu peḍutundi|The hen lays an egg.
కౌ|కౌగిలి|kaugili|🤗|అమ్మ కౌగిలి వెచ్చగా ఉంటుంది.|amma kaugili veccagā uṇṭundi|Mother's hug is warm.
కం|కంప్యూటర్|kampyūṭar|💻|నేను కంప్యూటర్ వాడతాను.|nēnu kampyūṭar vāḍatānu|I use a computer.
`),
    ml: parse(`
അം|അംഗൻവാടി|aṅgaṉvāṭi|🏫|കുട്ടികൾ അംഗൻവാടിയിൽ പോകുന്നു.|kuṭṭikaḷ aṅgaṉvāṭiyil pōkunnu|The children go to the anganwadi.
അഃ|ദുഃഖം|duḥkhaṁ|😢|അവന് ദുഃഖം തോന്നി.|avaṉ duḥkhaṁ tōnni|He felt sad.|ഃ
ഖ|ഖനി|khani|⛏️|ഖനിയിൽ നിന്ന് കൽക്കരി കിട്ടും.|khaniyil ninn kalkkari kiṭṭuṁ|Coal comes from the mine.
ങ|തേങ്ങ|tēṅṅa|🥥|തേങ്ങ മരത്തിൽ ഉണ്ട്.|tēṅṅa marattil uṇṭ|The coconut is on the tree.|ങ
ഛ|ഛായാചിത്രം|chāyācitraṁ|🖼️|ചുമരിൽ ഒരു ഛായാചിത്രം ഉണ്ട്.|cumaril oru chāyācitraṁ uṇṭ|There is a portrait on the wall.
ഝ|ഝരി|jhari|🏞️|മലയിൽ ഒരു ഝരി ഒഴുകുന്നു.|malayil oru jhari oḻukunnu|A stream flows on the hill.
ഠ|പാഠം|pāṭhaṁ|📖|ടീച്ചർ പാഠം പഠിപ്പിക്കുന്നു.|ṭīccar pāṭhaṁ paṭhippikkunnu|The teacher teaches the lesson.|ഠ
ഢ|ഢക്ക|ḍhakka|🥁|ഉത്സവത്തിന് ഢക്ക കൊട്ടുന്നു.|utsavattin ḍhakka koṭṭunnu|They beat the drum at the festival.
ണ|കണ്ണ്|kaṇṇ|👁️|എന്റെ കണ്ണ് കറുപ്പാണ്.|enṟe kaṇṇ kaṟuppāṇ|My eye is black.|ണ
ഥ|കഥ|katha|📖|മുത്തശ്ശി കഥ പറയുന്നു.|muttaśśi katha paṟayunnu|Grandma tells a story.|ഥ
ഷ|ഭാഷ|bhāṣa|🗣️|മലയാളം നമ്മുടെ ഭാഷയാണ്.|malayāḷaṁ nammuṭe bhāṣayāṇ|Malayalam is our language.|ഷ
ള|പള്ളി|paḷḷi|⛪|ഞങ്ങൾ പള്ളിയിൽ പോകുന്നു.|ñaṅṅaḷ paḷḷiyil pōkunnu|We go to the church.|ള
ഴ|മഴ|maḻa|🌧️|ഇന്ന് മഴ പെയ്യുന്നു.|inn maḻa peyyunnu|It is raining today.|ഴ
കാ|കാക്ക|kākka|🐦|കാക്ക കറുത്തതാണ്.|kākka kaṟuttatāṇ|The crow is black.
കി|കിളി|kiḷi|🐦|കിളി പാടുന്നു.|kiḷi pāṭunnu|The bird sings.
കീ|കീബോർഡ്|kībōrḍ|⌨️|ഞാൻ കീബോർഡിൽ ടൈപ്പ് ചെയ്യുന്നു.|ñāṉ kībōrḍil ṭaipp ceyyunnu|I type on the keyboard.
കു|കുട|kuṭa|☂️|മഴയത്ത് കുട വേണം.|maḻayatt kuṭa vēṇaṁ|You need an umbrella in the rain.
കൂ|കൂൺ|kūṇ|🍄|കൂൺ കാട്ടിൽ വളരുന്നു.|kūṇ kāṭṭil vaḷarunnu|Mushrooms grow in the forest.
കൃ|കൃഷി|kṛṣi|🌾|കർഷകൻ കൃഷി ചെയ്യുന്നു.|karṣakaṉ kṛṣi ceyyunnu|The farmer farms.
കെ|കെട്ടിടം|keṭṭiṭaṁ|🏢|ഇത് ഒരു വലിയ കെട്ടിടം ആണ്.|it oru valiya keṭṭiṭaṁ āṇ|This is a big building.
കേ|കേക്ക്|kēkk|🎂|പിറന്നാളിന് കേക്ക് മുറിച്ചു.|piṟannāḷin kēkk muṟiccu|We cut a cake on the birthday.
കൈ|കൈ|kai|✋|ഭക്ഷണത്തിന് മുമ്പ് കൈ കഴുകുക.|bhakṣaṇattin mump kai kaḻukuka|Wash your hands before food.
കൊ|കൊട്ട|koṭṭa|🧺|കൊട്ടയിൽ പഴങ്ങൾ ഉണ്ട്.|koṭṭayil paḻaṅṅaḷ uṇṭ|There are fruits in the basket.
കോ|കോഴി|kōḻi|🐔|കോഴി മുട്ടയിടുന്നു.|kōḻi muṭṭayiṭunnu|The hen lays eggs.
കൌ|കൌതുകം|kautukaṁ|🤔|കുട്ടിക്ക് കൌതുകം തോന്നി.|kuṭṭikk kautukaṁ tōnni|The child felt curious.
കം|കംപ്യൂട്ടർ|kampyūṭṭar|💻|ഞാൻ കംപ്യൂട്ടർ ഉപയോഗിക്കുന്നു.|ñāṉ kampyūṭṭar upayōgikkunnu|I use a computer.
`),
    mr: parse(`
अः|दुःख|duḥkh|😢|त्याला खूप दुःख झाले.|tyālā khūp duḥkh jhāle|He felt very sad.|ः
ङ|वाङ्मय|vāṅmay|📚|मराठी वाङ्मय समृद्ध आहे.|marāṭhī vāṅmay samṛddh āhe|Marathi literature is rich.|ङ
ञ|ज्ञान|jñān|🧠|पुस्तके ज्ञान देतात.|pustake jñān detāt|Books give knowledge.|ञ
ठ|पाठ|pāṭh|📖|शिक्षक पाठ शिकवतात.|śikṣak pāṭh śikavtāt|The teacher teaches the lesson.|ठ
ण|बाण|bāṇ|🏹|धनुष्यातून बाण सुटतो.|dhanuṣyātūn bāṇ suṭto|The arrow shoots from the bow.|ण
ष|भाषा|bhāṣā|🗣️|मराठी आपली भाषा आहे.|marāṭhī āplī bhāṣā āhe|Marathi is our language.|ष
ळ|केळे|keḷe|🍌|केळे पिवळे आहे.|keḷe pivaḷe āhe|The banana is yellow.|ळ
का|कावळा|kāvaḷā|🐦|कावळा काळा आहे.|kāvaḷā kāḷā āhe|The crow is black.
कि|किल्ला|killā|🏰|डोंगरावर किल्ला आहे.|ḍoṅgarāvar killā āhe|There is a fort on the hill.
की|कीटक|kīṭak|🐛|कीटक पान खातो.|kīṭak pān khāto|The insect eats a leaf.
कु|कुत्रा|kutrā|🐕|कुत्रा भुंकतो.|kutrā bhuṅkto|The dog barks.
कू|कूकर|kūkar|🍲|कूकरची शिट्टी वाजली.|kūkarcī śiṭṭī vājlī|The cooker whistled.
कृ|कृषी|kṛṣī|🌾|शेतकरी कृषी करतो.|śetkarī kṛṣī karto|The farmer farms.
के|केस|kes|💇|तिचे केस लांब आहेत.|tice kes lāmb āhet|Her hair is long.
कै|कैरी|kairī|🥭|कैरी आंबट असते.|kairī āmbaṭ aste|The raw mango is sour.
को|कोंबडी|kombḍī|🐔|कोंबडी अंडे देते.|kombḍī aṇḍe dete|The hen lays an egg.
कौ|कौल|kaul|🏠|घरावर कौल आहेत.|gharāvar kaul āhet|There are tiles on the house.
कं|कंगवा|kaṅgvā|💇|मी कंगव्याने केस विंचरते.|mī kaṅgavyāne kes viñcarte|I comb my hair with a comb.
`),
    bn: parse(`
অঃ|দুঃখ|duḥkha|😢|তার খুব দুঃখ হল।|tār khub duḥkha holo|He felt very sad.|ঃ
ঙ|ব্যাঙ|byāṅ|🐸|ব্যাঙ লাফায়।|byāṅ lāphāy|The frog jumps.|ঙ
ঞ|জ্ঞান|gyān|🧠|বই জ্ঞান দেয়।|boi gyān dey|Books give knowledge.|ঞ
ণ|হরিণ|horiṇ|🦌|হরিণ দ্রুত দৌড়ায়।|horiṇ druto dauṛāy|The deer runs fast.|ণ
কা|কাক|kāk|🐦|কাক কালো।|kāk kālo|The crow is black.
কি|কিশমিশ|kiśmiś|🍇|কিশমিশ মিষ্টি।|kiśmiś miṣṭi|Raisins are sweet.
কী|কীট|kīṭ|🐛|কীট পাতা খায়।|kīṭ pātā khāy|The insect eats the leaf.
কু|কুকুর|kukur|🐕|কুকুর ঘেউ ঘেউ করে।|kukur gheu gheu kore|The dog barks.
কূ|কূপ|kūp|🪣|গ্রামে একটি কূপ আছে।|grāme ekṭi kūp āche|There is a well in the village.
কৃ|কৃষক|kṛṣok|👨‍🌾|কৃষক ধান চাষ করে।|kṛṣok dhān cāṣ kore|The farmer grows rice.
কে|কেক|kek|🎂|জন্মদিনে কেক কাটা হয়।|janmadine kek kāṭā hoy|A cake is cut on birthdays.
কৈ|কৈ|koi|🐟|কৈ মাছ খুব সুস্বাদু।|koi māch khub susvādu|Koi fish is very tasty.
কো|কোকিল|kokil|🐦|কোকিল মিষ্টি গান গায়।|kokil miṣṭi gān gāy|The cuckoo sings sweetly.
কৌ|কৌটা|kauṭā|🥫|কৌটায় বিস্কুট আছে।|kauṭāy biskuṭ āche|There are biscuits in the tin.
কং|কংক্রিট|kaṅkriṭ|🧱|রাস্তা কংক্রিটের তৈরি।|rāstā kaṅkriṭer toiri|The road is made of concrete.
`),
    gu: parse(`
અઃ|દુઃખ|duḥkh|😢|તેને ખૂબ દુઃખ થયું.|tene khūb duḥkh thayuṁ|He felt very sad.|ઃ
ઙ|વાઙ્મય|vāṅmay|📚|ગુજરાતી વાઙ્મય સમૃદ્ધ છે.|gujarātī vāṅmay samṛddh che|Gujarati literature is rich.|ઙ
ઞ|જ્ઞાન|jñān|🧠|પુસ્તકો જ્ઞાન આપે છે.|pustako jñān āpe che|Books give knowledge.|ઞ
ઠ|પાઠ|pāṭh|📖|શિક્ષક પાઠ ભણાવે છે.|śikṣak pāṭh bhaṇāve che|The teacher teaches the lesson.|ઠ
ણ|બાણ|bāṇ|🏹|ધનુષમાંથી બાણ છૂટે છે.|dhanuṣmāṁthī bāṇ chūṭe che|The arrow shoots from the bow.|ણ
ષ|ભાષા|bhāṣā|🗣️|ગુજરાતી આપણી ભાષા છે.|gujarātī āpṇī bhāṣā che|Gujarati is our language.|ષ
ળ|કેળું|keḷuṁ|🍌|કેળું પીળું છે.|keḷuṁ pīḷuṁ che|The banana is yellow.|ળ
કા|કાગડો|kāgḍo|🐦|કાગડો કાળો છે.|kāgḍo kāḷo che|The crow is black.
કિ|કિલ્લો|killo|🏰|ટેકરી પર કિલ્લો છે.|ṭekrī par killo che|There is a fort on the hill.
કી|કીડી|kīḍī|🐜|કીડી ખાંડ લઈ જાય છે.|kīḍī khāṁḍ laī jāy che|The ant carries sugar.
કુ|કુકડો|kukḍo|🐓|કુકડો સવારે બોલે છે.|kukḍo savāre bole che|The rooster crows in the morning.
કૂ|કૂતરો|kūtro|🐕|કૂતરો ભસે છે.|kūtro bhase che|The dog barks.
કૃ|કૃષિ|kṛṣi|🌾|ખેડૂત કૃષિ કરે છે.|kheḍūt kṛṣi kare che|The farmer farms.
કે|કેરી|kerī|🥭|કેરી મીઠી છે.|kerī mīṭhī che|The mango is sweet.
કૈ|કૈલાસ|kailās|🏔️|કૈલાસ પર બરફ છે.|kailās par baraph che|There is snow on Kailash.
કો|કોયલ|koyal|🐦|કોયલ મીઠું ગાય છે.|koyal mīṭhuṁ gāy che|The cuckoo sings sweetly.
કૌ|કૌશલ્ય|kauśalya|🛠️|તેની પાસે ઘણું કૌશલ્ય છે.|tenī pāse ghaṇuṁ kauśalya che|He has a lot of skill.
કં|કંકુ|kaṅku|🔴|કપાળે કંકુ લગાવો.|kapāḷe kaṅku lagāvo|Put kumkum on the forehead.
`),
    pa: parse(`
ਏ|ਏਕਤਾ|ektā|🤝|ਏਕਤਾ ਵਿੱਚ ਤਾਕਤ ਹੈ।|ektā vicc tākat hai|There is strength in unity.
ਅਂ|ਕਾਂ|kā̃|🐦|ਕਾਂ ਕਾਲਾ ਹੁੰਦਾ ਹੈ।|kā̃ kālā hundā hai|The crow is black.|ਂ
ਠ|ਠੰਢ|ṭhaṇḍh|🥶|ਸਰਦੀਆਂ ਵਿੱਚ ਠੰਢ ਹੁੰਦੀ ਹੈ।|sardīā̃ vicc ṭhaṇḍh hundī hai|It is cold in winter.
ਣ|ਪਾਣੀ|pāṇī|💧|ਪਾਣੀ ਸਾਫ਼ ਹੈ।|pāṇī sāf hai|The water is clean.|ਣ
ਕਾ|ਕਾਰ|kār|🚗|ਕਾਰ ਤੇਜ਼ ਚੱਲਦੀ ਹੈ।|kār tez calldī hai|The car runs fast.
ਕਿ|ਕਿਤਾਬ|kitāb|📖|ਇਹ ਮੇਰੀ ਕਿਤਾਬ ਹੈ।|ih merī kitāb hai|This is my book.
ਕੀ|ਕੀੜੀ|kīṛī|🐜|ਕੀੜੀ ਖੰਡ ਲੈ ਜਾਂਦੀ ਹੈ।|kīṛī khaṇḍ lai jā̃dī hai|The ant carries sugar.
ਕੁ|ਕੁੱਤਾ|kuttā|🐕|ਕੁੱਤਾ ਭੌਂਕਦਾ ਹੈ।|kuttā bhauṅkdā hai|The dog barks.
ਕੂ|ਕੂੜਾ|kūṛā|🗑️|ਕੂੜਾ ਡੱਬੇ ਵਿੱਚ ਪਾਓ।|kūṛā ḍabbe vicc pāo|Put the rubbish in the bin.
ਕੇ|ਕੇਲਾ|kelā|🍌|ਕੇਲਾ ਪੀਲਾ ਹੈ।|kelā pīlā hai|The banana is yellow.
ਕੈ|ਕੈਂਚੀ|kaĩcī|✂️|ਕੈਂਚੀ ਨਾਲ ਕਾਗਜ਼ ਕੱਟੋ।|kaĩcī nāl kāgaz kaṭṭo|Cut the paper with scissors.
ਕੋ|ਕੋਇਲ|koil|🐦|ਕੋਇਲ ਮਿੱਠਾ ਗਾਉਂਦੀ ਹੈ।|koil miṭṭhā gāundī hai|The cuckoo sings sweetly.
ਕੌ|ਕੌਲੀ|kaulī|🥣|ਕੌਲੀ ਵਿੱਚ ਦਾਲ ਹੈ।|kaulī vicc dāl hai|There is dal in the bowl.
`),
    or: parse(`
ଅଂ|ଅଂଶ|aṁśa|🧩|ଏହା ପିଠାର ଏକ ଅଂଶ।|ehā piṭhāra eka aṁśa|This is a piece of the cake.
ଅଃ|ଦୁଃଖ|duḥkha|😢|ତାଙ୍କର ବହୁତ ଦୁଃଖ ହେଲା।|tāṅkara bahuta duḥkha helā|He felt very sad.|ଃ
ଙ|ବେଙ୍ଗ|beṅga|🐸|ବେଙ୍ଗ ଡେଇଁ ପଡ଼େ।|beṅga ḍeĩ paṛe|The frog jumps.|ଙ
ଞ|ଜ୍ଞାନ|jñāna|🧠|ବହି ଜ୍ଞାନ ଦିଏ।|bahi jñāna die|Books give knowledge.|ଞ
ଠ|ଠେକୁଆ|ṭhekuā|🐇|ଠେକୁଆ ଶୀଘ୍ର ଦୌଡ଼େ।|ṭhekuā śīghra dauṛe|The rabbit runs fast.
ଣ|ହରିଣ|hariṇa|🦌|ହରିଣ ଜଙ୍ଗଲରେ ରହେ।|hariṇa jaṅgalare rahe|The deer lives in the forest.|ଣ
ଳ|କଦଳୀ|kadaḷī|🍌|କଦଳୀ ହଳଦିଆ।|kadaḷī haḷadiā|The banana is yellow.|ଳ
କା|କାଉ|kāu|🐦|କାଉ କଳା।|kāu kaḷā|The crow is black.
କି|କିଶମିଶ|kiśamiśa|🍇|କିଶମିଶ ମିଠା।|kiśamiśa miṭhā|Raisins are sweet.
କୀ|କୀଟ|kīṭa|🐛|କୀଟ ପତ୍ର ଖାଏ।|kīṭa patra khāe|The insect eats a leaf.
କୁ|କୁକୁର|kukura|🐕|କୁକୁର ଭୁକେ।|kukura bhuke|The dog barks.
କୂ|କୂଅ|kūa|🪣|ଗାଁରେ ଗୋଟିଏ କୂଅ ଅଛି।|gā̃re goṭie kūa achi|There is a well in the village.
କୃ|କୃଷକ|kṛṣaka|👨‍🌾|କୃଷକ ଧାନ ଚାଷ କରେ।|kṛṣaka dhāna cāṣa kare|The farmer grows rice.
କେ|କେକ୍|kek|🎂|ଜନ୍ମଦିନରେ କେକ୍ କଟାଯାଏ।|janmadinare kek kaṭāyāe|A cake is cut on birthdays.
କୈ|କୈଳାସ|kaiḷāsa|🏔️|କୈଳାସରେ ବରଫ ଅଛି।|kaiḷāsare barapha achi|There is snow on Kailash.
କୋ|କୋଇଲି|koili|🐦|କୋଇଲି ମିଠା ଗାଏ।|koili miṭhā gāe|The cuckoo sings sweetly.
କୌ|କୌତୁକ|kautuka|😄|ପିଲାମାନେ କୌତୁକ କରନ୍ତି।|pilāmāne kautuka karanti|The children make jokes.
କଂ|କଂସା|kaṁsā|🍽️|କଂସାରେ ଭାତ ଖାଆନ୍ତି।|kaṁsāre bhāta khāanti|They eat rice from a bronze plate.
`),
    ur: parse(`
ذ|ذائقہ|zāʼiqa|😋|آم کا ذائقہ میٹھا ہے۔|ām kā zāʼiqa mīṭhā hai|The mango tastes sweet.
ڑ|پہاڑ|pahāṛ|⛰️|پہاڑ بہت اونچا ہے۔|pahāṛ bahut ūṉcā hai|The mountain is very high.|ڑ
ژ|ژالہ|zhāla|🌨️|آج ژالہ باری ہوئی۔|āj zhāla bārī huʼī|It hailed today.
ض|رمضان|ramẓān|🌙|رمضان میں روزے رکھتے ہیں۔|ramẓān meṉ roze rakhte haiṉ|People fast in Ramzan.|ض
ظ|ظرف|ẓarf|🏺|ظرف میں پانی ہے۔|ẓarf meṉ pānī hai|There is water in the vessel.
ھ|بھالو|bhālū|🐻|بھالو کو شہد پسند ہے۔|bhālū ko shahd pasand hai|The bear likes honey.|ھ
ء|ابتداء|ibtidāʼ|🏁|کہانی کی ابتداء اچھی ہے۔|kahānī kī ibtidāʼ acchī hai|The story has a good beginning.|ء
ی|یاک|yāk|🐂|یاک پہاڑوں میں رہتا ہے۔|yāk pahāṛoṉ meṉ rahtā hai|The yak lives in the mountains.
ے|کیلے|kele|🍌|کیلے پیلے ہیں۔|kele pīle haiṉ|The bananas are yellow.|ے
`),
    es: parse(`
X|xilófono|see-LOH-foh-noh|🎵|El niño toca el xilófono.||The boy plays the xylophone.
é|café|kah-FEH|☕|El café está caliente.||The coffee is hot.|é
í|maíz|mah-EES|🌽|El maíz es amarillo.||The corn is yellow.|í
ó|ratón|rah-TOHN|🐭|El ratón come queso.||The mouse eats cheese.|ó
ú|búho|BOO-oh|🦉|El búho vuela de noche.||The owl flies at night.|ú
ü|pingüino|peen-GWEE-noh|🐧|El pingüino vive en el frío.||The penguin lives in the cold.|ü
rr|perro|PEH-rroh|🐕|El perro ladra.||The dog barks.|rr
`),
    fr: parse(`
X|xylophone|ksee-loh-FON|🎵|Il joue du xylophone.||He plays the xylophone.
è|mère|mair|👩|Ma mère cuisine.||My mother is cooking.|è
ê|tête|tet|🤕|J’ai mal à la tête.||I have a headache.|ê
ë|Noël|noh-EL|🎄|Joyeux Noël !||Merry Christmas!|ë
à|voilà|vwah-LAH|🎁|Voilà ton cadeau !||Here is your present!|à
â|gâteau|gah-TOH|🎂|Le gâteau est délicieux.||The cake is delicious.|â
ç|garçon|gar-SOHN|👦|Le garçon joue.||The boy is playing.|ç
ô|hôpital|oh-pee-TAL|🏥|L’hôpital est grand.||The hospital is big.|ô
û|flûte|flewt|🎶|Elle joue de la flûte.||She plays the flute.|û
ù|où|oo|❓|Je sais où il est.||I know where he is.|ù
`),
    de: parse(`
Q|Quadrat|kva-DRAHT|🟥|Das Quadrat hat vier Ecken.||The square has four corners.
X|Xylofon|ksü-loh-FOHN|🎵|Das Kind spielt Xylofon.||The child plays the xylophone.
ß|Fuß|foos|🦶|Mein Fuß tut weh.||My foot hurts.|ß
ie|Biene|BEE-neh|🐝|Die Biene macht Honig.||The bee makes honey.|ie
`),
    pt: parse(`
W|kiwi|KEE-wee|🥝|O kiwi é verde.||The kiwi is green.|w
Y|yoga|YOH-gah|🧘|Ela faz yoga de manhã.||She does yoga in the morning.
ç|maçã|mah-SANG|🍎|A maçã é vermelha.||The apple is red.|ç
ã|mãe|MAING|👩|A mãe cozinha.||Mother is cooking.|ã
õ|leões|lee-OYNS|🦁|Os leões dormem.||The lions are sleeping.|õ
â|lâmpada|LAHM-pah-dah|💡|A lâmpada está acesa.||The lamp is on.|â
é|café|kah-FEH|☕|O café está quente.||The coffee is hot.|é
ê|três|TRAYS|3️⃣|Tenho três gatos.||I have three cats.|ê
ú|baú|bah-OO|🧳|O baú está cheio.||The chest is full.|ú
nh|ninho|NEE-nyoo|🐣|O pássaro está no ninho.||The bird is in the nest.|nh
lh|folha|FOH-lyah|🍃|A folha é verde.||The leaf is green.|lh
`),
    ru: parse(`
Ъ|подъезд|podyezd|🚪|Мы ждём у подъезда.|my zhdyom u podyezda|We are waiting at the entrance.|ъ
Ы|сыр|syr|🧀|Сыр жёлтый.|syr zhyoltyy|The cheese is yellow.|ы
Ь|соль|sol'|🧂|Соль белая.|sol' belaya|The salt is white.|ь
`),
    ar: parse(`
ا|باب|bāb|🚪|الباب مفتوح.|al-bāb maftūḥ|The door is open.|ا
`),
    zh: parse(`
子|孩子|háizi|🧒|孩子在玩。|háizi zài wán|The child is playing.|子
`),
    ja: parse(`
る|くるま|kuruma|🚗|くるまがはしります。|kuruma ga hashirimasu|The car runs.|る
を|ほんをよむ|hon o yomu|📖|わたしはほんをよみます。|watashi wa hon o yomimasu|I read a book.|を
ん|みかん|mikan|🍊|みかんはあまいです。|mikan wa amai desu|The orange is sweet.|ん
ぐ|かぐ|kagu|🛋️|あたらしいかぐをかいました。|atarashii kagu o kaimashita|I bought new furniture.|ぐ
ざ|ざりがに|zarigani|🦞|かわにざりがにがいます。|kawa ni zarigani ga imasu|There is a crayfish in the river.
ぜ|かぜ|kaze|🌬️|かぜがふいています。|kaze ga fuite imasu|The wind is blowing.|ぜ
ぷ|てんぷら|tenpura|🍤|てんぷらはおいしいです。|tenpura wa oishii desu|Tempura is tasty.|ぷ
ン|パン|pan|🍞|パンをたべます。|pan o tabemasu|I eat bread.|ン
`),
    ko: parse(`
ㅡ|그림|geurim|🖼️|그림을 그려요.|geurimeul geuryeoyo|I draw a picture.
ㅙ|왜가리|waegari|🐦|왜가리가 물가에 서 있어요.|waegariga mulgae seo isseoyo|The heron stands by the water.
ㅟ|귀|gwi|👂|귀로 소리를 들어요.|gwiro sorireul deureoyo|I hear sounds with my ears.
`)
};
