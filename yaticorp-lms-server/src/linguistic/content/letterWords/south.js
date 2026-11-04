/** Tamil, Telugu, Malayalam and Marathi: a word for each letter a common word starts with (letterWords/parse.js). */
const { parse } = require('./parse');

module.exports = {
    ta: parse(`
அ|அம்மா|ammā|👩|அம்மா சமைக்கிறார்.|ammā camaikkiṟār|Mother is cooking.
ஆ|ஆடு|āṭu|🐐|ஆடு புல் தின்கிறது.|āṭu pul tiṉkiṟatu|The goat eats grass.
இ|இலை|ilai|🍃|இலை பச்சையாக இருக்கிறது.|ilai paccaiyāka irukkiṟatu|The leaf is green.
ஈ|ஈ|ī|🪰|ஈ பறக்கிறது.|ī paṟakkiṟatu|The fly is flying.
உ|உப்பு|uppu|🧂|உணவில் உப்பு போடு.|uṇavil uppu pōṭu|Put salt in the food.
ஊ|ஊசி|ūci|🪡|ஊசியால் துணி தைக்கலாம்.|ūciyāl tuṇi taikkalām|We can stitch cloth with a needle.
எ|எலி|eli|🐀|எலி வேகமாக ஓடுகிறது.|eli vēkamāka ōṭukiṟatu|The rat runs fast.
ஏ|ஏணி|ēṇi|🪜|ஏணியில் ஏறு.|ēṇiyil ēṟu|Climb the ladder.
ஐ|ஐந்து|aintu|🖐️|கையில் ஐந்து விரல்கள் உள்ளன.|kaiyil aintu viralkaḷ uḷḷaṉa|A hand has five fingers.
ஒ|ஒட்டகம்|oṭṭakam|🐫|ஒட்டகம் பாலைவனத்தில் நடக்கிறது.|oṭṭakam pālaivaṉattil naṭakkiṟatu|The camel walks in the desert.
ஓ|ஓநாய்|ōnāy|🐺|ஓநாய் காட்டில் வாழ்கிறது.|ōnāy kāṭṭil vāḻkiṟatu|The wolf lives in the forest.
ஔ|ஔவையார்|auvaiyār|📜|ஔவையார் ஒரு புலவர்.|auvaiyār oru pulavar|Auvaiyar is a poet.
க|கப்பல்|kappal|🚢|கப்பல் கடலில் செல்கிறது.|kappal kaṭalil celkiṟatu|The ship sails on the sea.
ச|சட்டை|caṭṭai|👕|சட்டை நீலமாக இருக்கிறது.|caṭṭai nīlamāka irukkiṟatu|The shirt is blue.
ஜ|ஜன்னல்|jaṉṉal|🪟|ஜன்னல் திறந்திருக்கிறது.|jaṉṉal tiṟantirukkiṟatu|The window is open.
ஞ|ஞாயிறு|ñāyiṟu|☀️|ஞாயிறு விடுமுறை நாள்.|ñāyiṟu viṭumuṟai nāḷ|Sunday is a holiday.
ட|டம்ளர்|ṭamḷar|🥛|டம்ளரில் பால் உள்ளது.|ṭamḷaril pāl uḷḷatu|There is milk in the tumbler.
த|தண்ணீர்|taṇṇīr|💧|தண்ணீர் குடி.|taṇṇīr kuṭi|Drink water.
ந|நண்டு|naṇṭu|🦀|நண்டு மணலில் ஓடுகிறது.|naṇṭu maṇalil ōṭukiṟatu|The crab runs on the sand.
ப|பசு|pacu|🐄|பசு பால் தருகிறது.|pacu pāl tarukiṟatu|The cow gives milk.
ம|மரம்|maram|🌳|மரம் உயரமாக இருக்கிறது.|maram uyaramāka irukkiṟatu|The tree is tall.
ய|யானை|yāṉai|🐘|யானை பெரியது.|yāṉai periyatu|The elephant is big.
ர|ரயில்|rayil|🚂|ரயில் வேகமாக ஓடுகிறது.|rayil vēkamāka ōṭukiṟatu|The train runs fast.
ல|லட்டு|laṭṭu|🍬|லட்டு இனிப்பாக இருக்கிறது.|laṭṭu iṉippāka irukkiṟatu|The laddu is sweet.
வ|வாழைப்பழம்|vāḻaippaḻam|🍌|வாழைப்பழம் மஞ்சளாக இருக்கிறது.|vāḻaippaḻam mañcaḷāka irukkiṟatu|The banana is yellow.
ஹ|ஹோட்டல்|hōṭṭal|🏨|ஹோட்டலில் சாப்பிடலாம்.|hōṭṭalil cāppiṭalām|We can eat at the hotel.
`),
    te: parse(`
అ|అమ్మ|amma|👩|అమ్మ వంట చేస్తోంది.|amma vaṇṭa cēstōndi|Mother is cooking.
ఆ|ఆవు|āvu|🐄|ఆవు పాలు ఇస్తుంది.|āvu pālu istundi|The cow gives milk.
ఇ|ఇల్లు|illu|🏠|మా ఇల్లు పెద్దది.|mā illu peddadi|Our house is big.
ఈ|ఈగ|īga|🪰|ఈగ ఎగురుతోంది.|īga egurutōndi|The fly is flying.
ఉ|ఉల్లిపాయ|ullipāya|🧅|ఉల్లిపాయ ఎర్రగా ఉంది.|ullipāya erragā undi|The onion is red.
ఊ|ఊరు|ūru|🏘️|మా ఊరు అందంగా ఉంది.|mā ūru andangā undi|Our village is beautiful.
ఋ|ఋషి|ṛṣi|🧘|ఋషి అడవిలో ఉంటారు.|ṛṣi aḍavilō uṇṭāru|The sage lives in the forest.
ఎ|ఎలుక|eluka|🐀|ఎలుక వేగంగా పరిగెడుతుంది.|eluka vēgangā parigeḍutundi|The rat runs fast.
ఏ|ఏనుగు|ēnugu|🐘|ఏనుగు చాలా పెద్దది.|ēnugu cālā peddadi|The elephant is very big.
ఐ|ఐదు|aidu|🖐️|చేతికి ఐదు వేళ్ళు ఉన్నాయి.|cētiki aidu vēḷḷu unnāyi|A hand has five fingers.
ఒ|ఒంటె|oṇṭe|🐫|ఒంటె ఎడారిలో నడుస్తుంది.|oṇṭe eḍārilō naḍustundi|The camel walks in the desert.
ఓ|ఓడ|ōḍa|🚢|ఓడ సముద్రంలో వెళ్తుంది.|ōḍa samudramlō veḷtundi|The ship sails on the sea.
ఔ|ఔషధం|auṣadham|💊|ఔషధం చేదుగా ఉంది.|auṣadham cēdugā undi|The medicine is bitter.
అం|అంగడి|aṅgaḍi|🏪|అంగడిలో పండ్లు ఉన్నాయి.|aṅgaḍilō paṇḍlu unnāyi|There are fruits in the shop.
క|కప్ప|kappa|🐸|కప్ప నీటిలోకి దూకుతుంది.|kappa nīṭilōki dūkutundi|The frog jumps into the water.
ఖ|ఖడ్గం|khaḍgam|🗡️|రాజు దగ్గర ఖడ్గం ఉంది.|rāju daggara khaḍgam undi|The king has a sword.
గ|గడియారం|gaḍiyāram|⏰|గడియారం సమయం చూపిస్తుంది.|gaḍiyāram samayam cūpistundi|The clock shows the time.
ఘ|ఘంట|ghaṇṭa|🔔|గుడిలో ఘంట మోగుతుంది.|guḍilō ghaṇṭa mōgutundi|The bell rings in the temple.
చ|చేప|cēpa|🐟|చేప నీటిలో ఈదుతుంది.|cēpa nīṭilō īdutundi|The fish swims in the water.
ఛ|ఛత్రి|chatri|☂️|వానలో ఛత్రి పట్టుకో.|vānalō chatri paṭṭukō|Hold an umbrella in the rain.
జ|జింక|jiṅka|🦌|జింక వేగంగా పరిగెడుతుంది.|jiṅka vēgangā parigeḍutundi|The deer runs fast.
ట|టమాటా|ṭamāṭā|🍅|టమాటా ఎర్రగా ఉంది.|ṭamāṭā erragā undi|The tomato is red.
డ|డబ్బా|ḍabbā|📦|డబ్బాలో మిఠాయి ఉంది.|ḍabbālō miṭhāyi undi|There are sweets in the box.
ఢ|ఢంకా|ḍhaṅkā|🥁|అతను ఢంకా వాయిస్తాడు.|atanu ḍhaṅkā vāyistāḍu|He plays the drum.
త|తాబేలు|tābēlu|🐢|తాబేలు నెమ్మదిగా నడుస్తుంది.|tābēlu nemmadigā naḍustundi|The tortoise walks slowly.
ద|దోమ|dōma|🦟|దోమ కుడుతుంది.|dōma kuḍutundi|The mosquito bites.
ధ|ధనస్సు|dhanassu|🏹|రాముని దగ్గర ధనస్సు ఉంది.|rāmuni daggara dhanassu undi|Rama has a bow.
న|నెమలి|nemali|🦚|నెమలి అందంగా నాట్యం చేస్తుంది.|nemali andangā nāṭyam cēstundi|The peacock dances beautifully.
ప|పుస్తకం|pustakam|📕|నేను పుస్తకం చదువుతాను.|nēnu pustakam caduvutānu|I read a book.
ఫ|ఫలం|phalam|🍎|చెట్టుకు ఫలం ఉంది.|ceṭṭuku phalam undi|There is fruit on the tree.
బ|బంతి|banti|⚽|పిల్లలు బంతి ఆడుతున్నారు.|pillalu banti āḍutunnāru|The children are playing ball.
భ|భూమి|bhūmi|🌍|భూమి సూర్యుని చుట్టూ తిరుగుతుంది.|bhūmi sūryuni cuṭṭū tirugutundi|The earth goes around the sun.
మ|మామిడి|māmiḍi|🥭|మామిడి పండు తీపిగా ఉంది.|māmiḍi paṇḍu tīpigā undi|The mango is sweet.
య|యంత్రం|yantram|⚙️|యంత్రం పని చేస్తుంది.|yantram pani cēstundi|The machine works.
ర|రైలు|railu|🚂|రైలు వేగంగా వెళ్తుంది.|railu vēgangā veḷtundi|The train goes fast.
ల|లడ్డు|laḍḍu|🍬|లడ్డు చాలా తీపి.|laḍḍu cālā tīpi|The laddu is very sweet.
వ|విమానం|vimānam|✈️|విమానం ఆకాశంలో ఎగురుతుంది.|vimānam ākāśamlō egurutundi|The aeroplane flies in the sky.
శ|శంఖం|śaṅkham|🐚|శంఖం శబ్దం పెద్దగా ఉంది.|śaṅkham śabdam peddagā undi|The conch’s sound is loud.
స|సూర్యుడు|sūryuḍu|☀️|సూర్యుడు ఉదయం వస్తాడు.|sūryuḍu udayam vastāḍu|The sun comes in the morning.
హ|హంస|hamsa|🦢|హంస నీటిలో ఈదుతుంది.|hamsa nīṭilō īdutundi|The swan swims in the water.
`),
    ml: parse(`
അ|അമ്മ|amma|👩|അമ്മ പാചകം ചെയ്യുന്നു.|amma pācakaṁ ceyyunnu|Mother is cooking.
ആ|ആന|āna|🐘|ആന വളരെ വലുതാണ്.|āna vaḷare valutāṇ|The elephant is very big.
ഇ|ഇല|ila|🍃|ഇല പച്ചയാണ്.|ila paccayāṇ|The leaf is green.
ഈ|ഈച്ച|īcca|🪰|ഈച്ച പറക്കുന്നു.|īcca paṟakkunnu|The fly is flying.
ഉ|ഉപ്പ്|upp|🧂|കറിയിൽ ഉപ്പ് ഇടൂ.|kaṟiyil upp iṭū|Put salt in the curry.
ഊ|ഊണ്|ūṇ|🍛|ഞങ്ങൾ ഊണ് കഴിക്കുന്നു.|ñaṅṅaḷ ūṇ kaḻikkunnu|We are eating a meal.
ഋ|ഋഷി|ṛṣi|🧘|ഋഷി കാട്ടിൽ താമസിക്കുന്നു.|ṛṣi kāṭṭil tāmasikkunnu|The sage lives in the forest.
എ|എലി|eli|🐀|എലി വേഗത്തിൽ ഓടുന്നു.|eli vēgattil ōṭunnu|The rat runs fast.
ഏ|ഏണി|ēṇi|🪜|ഏണിയിൽ കയറൂ.|ēṇiyil kayaṟū|Climb the ladder.
ഐ|ഐസ്ക്രീം|aiskrīṁ|🍦|എനിക്ക് ഐസ്ക്രീം ഇഷ്ടമാണ്.|enikk aiskrīṁ iṣṭamāṇ|I like ice cream.
ഒ|ഒട്ടകം|oṭṭakaṁ|🐫|ഒട്ടകം മരുഭൂമിയിൽ നടക്കുന്നു.|oṭṭakaṁ marubhūmiyil naṭakkunnu|The camel walks in the desert.
ഓ|ഓറഞ്ച്|ōṟañc|🍊|ഓറഞ്ച് മധുരമാണ്.|ōṟañc madhuramāṇ|The orange is sweet.
ഔ|ഔഷധം|auṣadhaṁ|💊|ഔഷധം കയ്പ്പാണ്.|auṣadhaṁ kayppāṇ|The medicine is bitter.
ക|കപ്പൽ|kappal|🚢|കപ്പൽ കടലിൽ പോകുന്നു.|kappal kaṭalil pōkunnu|The ship sails on the sea.
ഗ|ഗ്രാമം|grāmaṁ|🏘️|ഞങ്ങളുടെ ഗ്രാമം സുന്ദരമാണ്.|ñaṅṅaḷuṭe grāmaṁ sundaramāṇ|Our village is beautiful.
ഘ|ഘടികാരം|ghaṭikāraṁ|⏰|ഘടികാരം സമയം കാണിക്കുന്നു.|ghaṭikāraṁ samayaṁ kāṇikkunnu|The clock shows the time.
ച|ചെണ്ട|ceṇṭa|🥁|ഉത്സവത്തിൽ ചെണ്ട കൊട്ടുന്നു.|utsavattil ceṇṭa koṭṭunnu|They beat the drum at the festival.
ജ|ജനൽ|janal|🪟|ജനൽ തുറന്നിരിക്കുന്നു.|janal tuṟannirikkunnu|The window is open.
ഞ|ഞണ്ട്|ñaṇṭ|🦀|ഞണ്ട് മണലിൽ ഓടുന്നു.|ñaṇṭ maṇalil ōṭunnu|The crab runs on the sand.
ട|ടീച്ചർ|ṭīccar|👩‍🏫|ടീച്ചർ പാഠം പഠിപ്പിക്കുന്നു.|ṭīccar pāṭhaṁ paṭhippikkunnu|The teacher teaches the lesson.
ഡ|ഡോക്ടർ|ḍōkṭar|🧑‍⚕️|ഡോക്ടർ രോഗിയെ നോക്കുന്നു.|ḍōkṭar rōgiye nōkkunnu|The doctor looks after the patient.
ത|തത്ത|tatta|🦜|തത്ത പച്ചയാണ്.|tatta paccayāṇ|The parrot is green.
ദ|ദോശ|dōśa|🥞|ദോശ രുചികരമാണ്.|dōśa rucikaramāṇ|The dosa is tasty.
ധ|ധനുസ്സ്|dhanuss|🏹|രാമന്റെ കയ്യിൽ ധനുസ്സ് ഉണ്ട്.|rāmanṟe kayyil dhanuss uṇṭ|Rama has a bow in his hand.
ന|നക്ഷത്രം|nakṣatraṁ|⭐|ആകാശത്ത് നക്ഷത്രം തിളങ്ങുന്നു.|ākāśatt nakṣatraṁ tiḷaṅṅunnu|A star shines in the sky.
പ|പൂച്ച|pūcca|🐱|പൂച്ച പാൽ കുടിക്കുന്നു.|pūcca pāl kuṭikkunnu|The cat drinks milk.
ഫ|ഫോൺ|phōṇ|📱|ഫോൺ ബെല്ലടിക്കുന്നു.|phōṇ bellaṭikkunnu|The phone is ringing.
ബ|ബസ്|bas|🚌|ബസ് സ്കൂളിലേക്ക് പോകുന്നു.|bas skūḷilēkk pōkunnu|The bus goes to school.
ഭ|ഭൂമി|bhūmi|🌍|ഭൂമി സൂര്യനെ ചുറ്റുന്നു.|bhūmi sūryane cuṟṟunnu|The earth goes around the sun.
മ|മയിൽ|mayil|🦚|മയിൽ നൃത്തം ചെയ്യുന്നു.|mayil nṛttaṁ ceyyunnu|The peacock dances.
യ|യന്ത്രം|yantraṁ|⚙️|യന്ത്രം പ്രവർത്തിക്കുന്നു.|yantraṁ pravarttikkunnu|The machine works.
ര|രാജാവ്|rājāv|🤴|രാജാവ് കൊട്ടാരത്തിൽ താമസിക്കുന്നു.|rājāv koṭṭārattil tāmasikkunnu|The king lives in the palace.
ല|ലഡ്ഡു|laḍḍu|🍬|ലഡ്ഡു മധുരമാണ്.|laḍḍu madhuramāṇ|The laddu is sweet.
വ|വള്ളം|vaḷḷaṁ|🛶|വള്ളം പുഴയിൽ ഒഴുകുന്നു.|vaḷḷaṁ puḻayil oḻukunnu|The boat floats on the river.
ശ|ശംഖ്|śaṅkh|🐚|ശംഖിന്റെ ശബ്ദം ഉച്ചത്തിലാണ്.|śaṅkhinṟe śabdaṁ uccattilāṇ|The conch’s sound is loud.
സ|സൂര്യൻ|sūryan|☀️|സൂര്യൻ രാവിലെ ഉദിക്കുന്നു.|sūryan rāvile udikkunnu|The sun rises in the morning.
ഹ|ഹംസം|haṁsaṁ|🦢|ഹംസം വെള്ളത്തിൽ നീന്തുന്നു.|haṁsaṁ veḷḷattil nīntunnu|The swan swims in the water.
റ|റോസ്|ṟōs|🌹|റോസ് ചുവപ്പാണ്.|ṟōs cuvappāṇ|The rose is red.
`),
    mr: parse(`
अ|अननस|ananas|🍍|अननस गोड आहे.|ananas goḍ āhe|The pineapple is sweet.
आ|आंबा|āmbā|🥭|आंबा पिवळा आणि गोड आहे.|āmbā pivaḷā āṇi goḍ āhe|The mango is yellow and sweet.
इ|इमारत|imārat|🏢|ही इमारत उंच आहे.|hī imārat uñca āhe|This building is tall.
ई|ईडलिंबू|īḍlimbū|🍋|ईडलिंबू आंबट असते.|īḍlimbū āmbaṭ aste|The citron is sour.
उ|उंदीर|undīr|🐀|उंदीर वेगाने पळतो.|undīr vegāne paḷto|The rat runs fast.
ऊ|ऊस|ūs|🎋|ऊस गोड असतो.|ūs goḍ asto|Sugarcane is sweet.
ऋ|ऋषी|ṛṣī|🧘|ऋषी जंगलात राहतात.|ṛṣī jaṅgalāt rāhtāt|The sage lives in the forest.
ए|एक|ek|☝️|माझ्याकडे एक पेन आहे.|mājhyākaḍe ek pen āhe|I have one pen.
ऐ|ऐना|ainā|🪞|ऐना भिंतीवर आहे.|ainā bhintīvar āhe|The mirror is on the wall.
ओ|ओठ|oṭh|👄|ओठ लाल आहेत.|oṭh lāl āhet|The lips are red.
औ|औषध|auṣadh|💊|औषध कडू आहे.|auṣadh kaḍū āhe|The medicine is bitter.
अं|अंगठी|aṅgaṭhī|💍|अंगठी चमकते.|aṅgaṭhī camakte|The ring shines.
क|कबूतर|kabūtar|🕊️|कबूतर छतावर बसले आहे.|kabūtar chatāvar basle āhe|The pigeon is sitting on the roof.
ख|खारुताई|khārutāī|🐿️|खारुताई झाडावर चढते.|khārutāī jhāḍāvar caḍhte|The squirrel climbs the tree.
ग|गाय|gāy|🐄|गाय दूध देते.|gāy dūdh dete|The cow gives milk.
घ|घड्याळ|ghaḍyāḷ|⏰|घड्याळ वेळ दाखवते.|ghaḍyāḷ veḷ dākhavte|The clock shows the time.
च|चमचा|camcā|🥄|मी चमच्याने खातो.|mī camcyāne khāto|I eat with a spoon.
छ|छत्री|chatrī|☂️|पावसात छत्री घे.|pāvsāt chatrī ghe|Take an umbrella in the rain.
ज|जहाज|jahāj|🚢|जहाज समुद्रात जाते.|jahāj samudrāt jāte|The ship goes on the sea.
झ|झेंडा|jheṇḍā|🚩|शाळेत झेंडा फडकतो.|śāḷet jheṇḍā phaḍakto|The flag flies at school.
ट|टोमॅटो|ṭomĕṭo|🍅|टोमॅटो लाल आहे.|ṭomĕṭo lāl āhe|The tomato is red.
ड|डबा|ḍabā|📦|डब्यात लाडू आहे.|ḍabyāt lāḍū āhe|There is a laddu in the box.
ढ|ढोल|ḍhol|🥁|लग्नात ढोल वाजतो.|lagnāt ḍhol vājto|The drum plays at the wedding.
त|तारा|tārā|⭐|आकाशात तारा चमकतो.|ākāśāt tārā camakto|A star shines in the sky.
थ|थाळी|thāḷī|🍽️|थाळीत जेवण आहे.|thāḷīt jevaṇ āhe|There is food on the plate.
द|दरवाजा|darvājā|🚪|दरवाजा उघडा आहे.|darvājā ughaḍā āhe|The door is open.
ध|धनुष्य|dhanuṣya|🏹|रामाकडे धनुष्य आहे.|rāmākaḍe dhanuṣya āhe|Rama has a bow.
न|नळ|naḷ|🚰|नळातून पाणी येते.|naḷātūn pāṇī yete|Water comes from the tap.
प|पतंग|pataṅg|🪁|आकाशात पतंग उडतो.|ākāśāt pataṅg uḍto|A kite flies in the sky.
फ|फूल|phūl|🌸|फूल सुंदर आहे.|phūl sundar āhe|The flower is beautiful.
ब|बदक|badak|🦆|बदक पाण्यात पोहते.|badak pāṇyāt pohte|The duck swims in the water.
भ|भोपळा|bhopaḷā|🎃|भोपळा मोठा आहे.|bhopaḷā moṭhā āhe|The pumpkin is big.
म|मासा|māsā|🐟|मासा पाण्यात राहतो.|māsā pāṇyāt rāhto|The fish lives in water.
य|यंत्र|yantra|⚙️|यंत्र काम करते.|yantra kām karte|The machine works.
र|रेल्वे|relve|🚆|रेल्वे रुळावरून धावते.|relve ruḷāvarūn dhāvte|The train runs on the track.
ल|लाडू|lāḍū|🍬|लाडू खूप गोड आहे.|lāḍū khūp goḍ āhe|The laddu is very sweet.
व|वाघ|vāgh|🐯|वाघ जंगलात राहतो.|vāgh jaṅgalāt rāhto|The tiger lives in the forest.
श|शंख|śaṅkh|🐚|शंखाचा आवाज मोठा आहे.|śaṅkhācā āvāj moṭhā āhe|The conch’s sound is loud.
स|ससा|sasā|🐇|ससा गाजर खातो.|sasā gājar khāto|The rabbit eats a carrot.
ह|हत्ती|hattī|🐘|हत्ती खूप मोठा आहे.|hattī khūp moṭhā āhe|The elephant is very big.
`)
};
