/** Bengali, Gujarati, Punjabi and Odia: a word for each letter a common word starts with (letterWords/parse.js). */
const { parse } = require('./parse');

module.exports = {
    bn: parse(`
অ|অজগর|ajagar|🐍|অজগর বড় সাপ।|ajagar baṛo sāp|The python is a big snake.
আ|আম|ām|🥭|আম মিষ্টি ফল।|ām miṣṭi phal|The mango is a sweet fruit.
ই|ইঁদুর|ĩdur|🐀|ইঁদুর দৌড়ায়।|ĩdur dauṛāy|The rat runs.
ঈ|ঈগল|īgal|🦅|ঈগল আকাশে ওড়ে।|īgal ākāśe oṛe|The eagle flies in the sky.
উ|উট|uṭ|🐫|উট মরুভূমিতে হাঁটে।|uṭ marubhūmite hā̃ṭe|The camel walks in the desert.
ঊ|ঊষা|ūṣā|🌅|ঊষা মানে ভোর।|ūṣā māne bhor|Usha means dawn.
ঋ|ঋষি|ṛṣi|🧘|ঋষি বনে থাকেন।|ṛṣi bane thāken|The sage lives in the forest.
এ|একতারা|ektārā|🪕|বাউল একতারা বাজায়।|bāul ektārā bājāy|The Baul plays the ektara.
ঐ|ঐরাবত|airābat|🐘|ঐরাবত একটি সাদা হাতি।|airābat ekṭi sādā hāti|Airavat is a white elephant.
ও|ওল|ol|🍠|ওল একটি সবজি।|ol ekṭi sabji|The yam is a vegetable.
ঔ|ঔষধ|auṣadh|💊|ঔষধ তেতো।|auṣadh teto|The medicine is bitter.
অং|অংক|aṅka|➕|আমি অংক করি।|āmi aṅka kari|I do sums.
ক|কলা|kalā|🍌|কলা হলুদ।|kalā halud|The banana is yellow.
খ|খরগোশ|kharagoś|🐇|খরগোশ গাজর খায়।|kharagoś gājar khāy|The rabbit eats a carrot.
গ|গরু|garu|🐄|গরু দুধ দেয়।|garu dudh dey|The cow gives milk.
ঘ|ঘড়ি|ghaṛi|⌚|ঘড়ি সময় বলে।|ghaṛi samay bale|The watch tells the time.
চ|চশমা|caśmā|👓|দাদু চশমা পরেন।|dādu caśmā paren|Grandfather wears glasses.
ছ|ছাতা|chātā|☂️|বৃষ্টিতে ছাতা নাও।|bṛṣṭite chātā nāo|Take an umbrella in the rain.
জ|জাহাজ|jāhāj|🚢|জাহাজ সমুদ্রে চলে।|jāhāj samudre cale|The ship sails on the sea.
ঝ|ঝিনুক|jhinuk|🐚|ঝিনুক সমুদ্রের ধারে থাকে।|jhinuk samudrer dhāre thāke|The shell lies by the sea.
ট|টমেটো|ṭameṭo|🍅|টমেটো লাল।|ṭameṭo lāl|The tomato is red.
ঠ|ঠোঁট|ṭhõṭ|👄|ঠোঁট লাল।|ṭhõṭ lāl|The lips are red.
ড|ডাক্তার|ḍāktār|🧑‍⚕️|ডাক্তার রোগী দেখেন।|ḍāktār rogī dekhen|The doctor sees the patient.
ঢ|ঢোল|ḍhol|🥁|বিয়েতে ঢোল বাজে।|biyete ḍhol bāje|The drum plays at the wedding.
ত|তারা|tārā|⭐|আকাশে তারা জ্বলে।|ākāśe tārā jvale|A star shines in the sky.
থ|থালা|thālā|🍽️|থালায় ভাত আছে।|thālāy bhāt āche|There is rice on the plate.
দ|দরজা|darjā|🚪|দরজা খোলা।|darjā kholā|The door is open.
ধ|ধনুক|dhanuk|🏹|রামের হাতে ধনুক।|rāmer hāte dhanuk|Rama has a bow in his hand.
ন|নৌকা|naukā|⛵|নৌকা নদীতে চলে।|naukā nadīte cale|The boat goes on the river.
প|পাখি|pākhi|🐦|পাখি গান গায়।|pākhi gān gāy|The bird sings.
ফ|ফুল|phul|🌸|ফুল সুন্দর।|phul sundar|The flower is beautiful.
ব|বাঘ|bāgh|🐯|বাঘ বনে থাকে।|bāgh bane thāke|The tiger lives in the forest.
ভ|ভালুক|bhāluk|🐻|ভালুক মধু ভালোবাসে।|bhāluk madhu bhālobāse|The bear loves honey.
ম|মাছ|māch|🐟|মাছ জলে থাকে।|māch jale thāke|The fish lives in water.
য|যন্ত্র|jantra|⚙️|যন্ত্র কাজ করে।|jantra kāj kare|The machine works.
র|রেলগাড়ি|relgāṛi|🚂|রেলগাড়ি দ্রুত চলে।|relgāṛi druta cale|The train runs fast.
ল|লেবু|lebu|🍋|লেবু টক।|lebu ṭak|The lemon is sour.
শ|শসা|śasā|🥒|শসা সবুজ।|śasā sabuj|The cucumber is green.
ষ|ষাঁড়|ṣā̃ṛ|🐂|ষাঁড় খুব শক্তিশালী।|ṣā̃ṛ khub śaktiśālī|The bull is very strong.
স|সূর্য|sūrya|☀️|সূর্য সকালে ওঠে।|sūrya sakāle oṭhe|The sun rises in the morning.
হ|হাতি|hāti|🐘|হাতি খুব বড়।|hāti khub baṛo|The elephant is very big.
`),
    gu: parse(`
અ|અનાનસ|anānas|🍍|અનાનસ મીઠું છે.|anānas mīṭhuṁ che|The pineapple is sweet.
આ|આગગાડી|āggāḍī|🚂|આગગાડી ઝડપથી દોડે છે.|āggāḍī jhaḍapthī doḍe che|The train runs fast.
ઇ|ઇમારત|imārat|🏢|આ ઇમારત ઊંચી છે.|ā imārat ū̃cī che|This building is tall.
ઈ|ઈંડું|ī̃ḍuṁ|🥚|મરઘી ઈંડું મૂકે છે.|marghī ī̃ḍuṁ mūke che|The hen lays an egg.
ઉ|ઉંદર|undar|🐀|ઉંદર ઝડપથી દોડે છે.|undar jhaḍapthī doḍe che|The rat runs fast.
ઊ|ઊંટ|ū̃ṭ|🐫|ઊંટ રણમાં ચાલે છે.|ū̃ṭ raṇmāṁ cāle che|The camel walks in the desert.
ઋ|ઋષિ|ṛṣi|🧘|ઋષિ જંગલમાં રહે છે.|ṛṣi jaṅgalmāṁ rahe che|The sage lives in the forest.
એ|એક|ek|☝️|મારી પાસે એક પેન છે.|mārī pāse ek pen che|I have one pen.
ઐ|ઐરાવત|airāvat|🐘|ઐરાવત સફેદ હાથી છે.|airāvat saphed hāthī che|Airavat is a white elephant.
ઓ|ઓશીકું|ośīkuṁ|🛏️|ઓશીકું નરમ છે.|ośīkuṁ naram che|The pillow is soft.
ઔ|ઔષધ|auṣadh|💊|ઔષધ કડવું છે.|auṣadh kaḍvuṁ che|The medicine is bitter.
અં|અંગૂર|aṅgūr|🍇|અંગૂર મીઠા છે.|aṅgūr mīṭhā che|The grapes are sweet.
ક|કબૂતર|kabūtar|🕊️|કબૂતર છત પર બેઠું છે.|kabūtar chat par beṭhuṁ che|The pigeon is sitting on the roof.
ખ|ખિસકોલી|khiskolī|🐿️|ખિસકોલી ઝાડ પર ચઢે છે.|khiskolī jhāḍ par caḍhe che|The squirrel climbs the tree.
ગ|ગાય|gāy|🐄|ગાય દૂધ આપે છે.|gāy dūdh āpe che|The cow gives milk.
ઘ|ઘડિયાળ|ghaḍiyāḷ|⏰|ઘડિયાળ સમય બતાવે છે.|ghaḍiyāḷ samay batāve che|The clock shows the time.
ચ|ચમચી|camcī|🥄|હું ચમચીથી ખાઉં છું.|huṁ camcīthī khāuṁ chuṁ|I eat with a spoon.
છ|છત્રી|chatrī|☂️|વરસાદમાં છત્રી લો.|varsādmāṁ chatrī lo|Take an umbrella in the rain.
જ|જહાજ|jahāj|🚢|જહાજ દરિયામાં ચાલે છે.|jahāj dariyāmāṁ cāle che|The ship sails on the sea.
ઝ|ઝાડ|jhāḍ|🌳|ઝાડ પર પક્ષી છે.|jhāḍ par pakṣī che|There is a bird on the tree.
ટ|ટામેટું|ṭāmeṭuṁ|🍅|ટામેટું લાલ છે.|ṭāmeṭuṁ lāl che|The tomato is red.
ડ|ડબ્બો|ḍabbo|📦|ડબ્બામાં લાડુ છે.|ḍabbāmāṁ lāḍu che|There is a laddu in the box.
ઢ|ઢોલ|ḍhol|🥁|લગ્નમાં ઢોલ વાગે છે.|lagnamāṁ ḍhol vāge che|The drum plays at the wedding.
ત|તારો|tāro|⭐|આકાશમાં તારો ચમકે છે.|ākāśmāṁ tāro camke che|A star shines in the sky.
થ|થાળી|thāḷī|🍽️|થાળીમાં ભોજન છે.|thāḷīmāṁ bhojan che|There is food on the plate.
દ|દરવાજો|darvājo|🚪|દરવાજો ખુલ્લો છે.|darvājo khullo che|The door is open.
ધ|ધનુષ|dhanuṣ|🏹|રામ પાસે ધનુષ છે.|rām pāse dhanuṣ che|Rama has a bow.
ન|નળ|naḷ|🚰|નળમાંથી પાણી આવે છે.|naḷmāṁthī pāṇī āve che|Water comes from the tap.
પ|પતંગ|pataṅg|🪁|આકાશમાં પતંગ ઊડે છે.|ākāśmāṁ pataṅg ūḍe che|A kite flies in the sky.
ફ|ફૂલ|phūl|🌸|ફૂલ સુંદર છે.|phūl sundar che|The flower is beautiful.
બ|બતક|batak|🦆|બતક પાણીમાં તરે છે.|batak pāṇīmāṁ tare che|The duck swims in the water.
ભ|ભમરો|bhamro|🐝|ભમરો ફૂલ પર બેસે છે.|bhamro phūl par bese che|The bee sits on the flower.
મ|માછલી|māchlī|🐟|માછલી પાણીમાં રહે છે.|māchlī pāṇīmāṁ rahe che|The fish lives in water.
ય|યંત્ર|yantra|⚙️|યંત્ર કામ કરે છે.|yantra kām kare che|The machine works.
ર|રમકડું|ramakḍuṁ|🧸|બાળક પાસે રમકડું છે.|bāḷak pāse ramakḍuṁ che|The child has a toy.
લ|લાડુ|lāḍu|🍬|લાડુ ખૂબ મીઠો છે.|lāḍu khūb mīṭho che|The laddu is very sweet.
વ|વાઘ|vāgh|🐯|વાઘ જંગલમાં રહે છે.|vāgh jaṅgalmāṁ rahe che|The tiger lives in the forest.
શ|શંખ|śaṅkh|🐚|શંખનો અવાજ મોટો છે.|śaṅkhno avāj moṭo che|The conch’s sound is loud.
સ|સસલું|sasluṁ|🐇|સસલું ગાજર ખાય છે.|sasluṁ gājar khāy che|The rabbit eats a carrot.
હ|હાથી|hāthī|🐘|હાથી ખૂબ મોટો છે.|hāthī khūb moṭo che|The elephant is very big.
`),
    pa: parse(`
ਅ|ਅੰਬ|amb|🥭|ਅੰਬ ਮਿੱਠਾ ਹੈ।|amb miṭṭhā hai|The mango is sweet.
ਆ|ਆਲੂ|ālū|🥔|ਆਲੂ ਸਬਜ਼ੀ ਹੈ।|ālū sabzī hai|The potato is a vegetable.
ਇ|ਇੱਲ|ill|🦅|ਇੱਲ ਅਸਮਾਨ ਵਿੱਚ ਉੱਡਦੀ ਹੈ।|ill asmān vicc uḍḍdī hai|The kite bird flies in the sky.
ਈ|ਈਦ|īd|🌙|ਈਦ ਇੱਕ ਤਿਉਹਾਰ ਹੈ।|īd ikk tiuhār hai|Eid is a festival.
ਉ|ਉੱਲੂ|ullū|🦉|ਉੱਲੂ ਰਾਤ ਨੂੰ ਜਾਗਦਾ ਹੈ।|ullū rāt nū̃ jāgdā hai|The owl is awake at night.
ਊ|ਊਠ|ūṭh|🐫|ਊਠ ਰੇਗਿਸਤਾਨ ਵਿੱਚ ਤੁਰਦਾ ਹੈ।|ūṭh registān vicc turdā hai|The camel walks in the desert.
ਐ|ਐਨਕ|ainak|👓|ਦਾਦਾ ਜੀ ਐਨਕ ਲਾਉਂਦੇ ਹਨ।|dādā jī ainak lāunde han|Grandfather wears glasses.
ਓ|ਓਸ|os|💧|ਸਵੇਰੇ ਘਾਹ ਉੱਤੇ ਓਸ ਹੁੰਦੀ ਹੈ।|savere ghāh utte os hundī hai|In the morning there is dew on the grass.
ਔ|ਔਰਤ|aurat|👩|ਔਰਤ ਬਾਜ਼ਾਰ ਜਾਂਦੀ ਹੈ।|aurat bāzār jāndī hai|The woman goes to the market.
ਕ|ਕਬੂਤਰ|kabūtar|🕊️|ਕਬੂਤਰ ਛੱਤ ਉੱਤੇ ਬੈਠਾ ਹੈ।|kabūtar chatt utte baiṭhā hai|The pigeon is sitting on the roof.
ਖ|ਖਰਗੋਸ਼|khargoś|🐇|ਖਰਗੋਸ਼ ਗਾਜਰ ਖਾਂਦਾ ਹੈ।|khargoś gājar khāndā hai|The rabbit eats a carrot.
ਗ|ਗਾਂ|gā̃|🐄|ਗਾਂ ਦੁੱਧ ਦਿੰਦੀ ਹੈ।|gā̃ duddh dindī hai|The cow gives milk.
ਘ|ਘੜੀ|ghaṛī|⌚|ਘੜੀ ਸਮਾਂ ਦੱਸਦੀ ਹੈ।|ghaṛī samā̃ dassdī hai|The watch tells the time.
ਚ|ਚਮਚਾ|camcā|🥄|ਮੈਂ ਚਮਚੇ ਨਾਲ ਖਾਂਦਾ ਹਾਂ।|maiṁ camce nāl khāndā hā̃|I eat with a spoon.
ਛ|ਛੱਤਰੀ|chattarī|☂️|ਮੀਂਹ ਵਿੱਚ ਛੱਤਰੀ ਲਓ।|mī̃h vicc chattarī lao|Take an umbrella in the rain.
ਜ|ਜਹਾਜ਼|jahāz|🚢|ਜਹਾਜ਼ ਸਮੁੰਦਰ ਵਿੱਚ ਚੱਲਦਾ ਹੈ।|jahāz samundar vicc calldā hai|The ship sails on the sea.
ਝ|ਝੰਡਾ|jhaṇḍā|🚩|ਸਕੂਲ ਵਿੱਚ ਝੰਡਾ ਲਹਿਰਾਉਂਦਾ ਹੈ।|sakūl vicc jhaṇḍā lahirāundā hai|The flag waves at school.
ਟ|ਟਮਾਟਰ|ṭamāṭar|🍅|ਟਮਾਟਰ ਲਾਲ ਹੈ।|ṭamāṭar lāl hai|The tomato is red.
ਡ|ਡਾਕੀਆ|ḍākīā|📮|ਡਾਕੀਆ ਚਿੱਠੀ ਲਿਆਉਂਦਾ ਹੈ।|ḍākīā ciṭṭhī liāundā hai|The postman brings letters.
ਢ|ਢੋਲ|ḍhol|🥁|ਵਿਆਹ ਵਿੱਚ ਢੋਲ ਵੱਜਦਾ ਹੈ।|viāh vicc ḍhol vajjdā hai|The drum plays at the wedding.
ਤ|ਤਿਤਲੀ|titlī|🦋|ਤਿਤਲੀ ਫੁੱਲ ਉੱਤੇ ਬੈਠੀ ਹੈ।|titlī phull utte baiṭhī hai|The butterfly is sitting on the flower.
ਥ|ਥਾਲੀ|thālī|🍽️|ਥਾਲੀ ਵਿੱਚ ਖਾਣਾ ਹੈ।|thālī vicc khāṇā hai|There is food on the plate.
ਦ|ਦਰਵਾਜ਼ਾ|darvāzā|🚪|ਦਰਵਾਜ਼ਾ ਖੁੱਲ੍ਹਾ ਹੈ।|darvāzā khullhā hai|The door is open.
ਧ|ਧਨੁਸ਼|dhanuś|🏹|ਰਾਮ ਕੋਲ ਧਨੁਸ਼ ਹੈ।|rām kol dhanuś hai|Rama has a bow.
ਨ|ਨਲਕਾ|nalkā|🚰|ਨਲਕੇ ਵਿੱਚੋਂ ਪਾਣੀ ਆਉਂਦਾ ਹੈ।|nalke viccõ pāṇī āundā hai|Water comes from the hand pump.
ਪ|ਪਤੰਗ|pataṅg|🪁|ਅਸਮਾਨ ਵਿੱਚ ਪਤੰਗ ਉੱਡਦੀ ਹੈ।|asmān vicc pataṅg uḍḍdī hai|A kite flies in the sky.
ਫ|ਫੁੱਲ|phull|🌸|ਫੁੱਲ ਸੋਹਣਾ ਹੈ।|phull sohṇā hai|The flower is beautiful.
ਬ|ਬੱਕਰੀ|bakkarī|🐐|ਬੱਕਰੀ ਘਾਹ ਖਾਂਦੀ ਹੈ।|bakkarī ghāh khāndī hai|The goat eats grass.
ਭ|ਭਾਲੂ|bhālū|🐻|ਭਾਲੂ ਨੂੰ ਸ਼ਹਿਦ ਪਸੰਦ ਹੈ।|bhālū nū̃ śahid pasand hai|The bear likes honey.
ਮ|ਮੱਛੀ|macchī|🐟|ਮੱਛੀ ਪਾਣੀ ਵਿੱਚ ਰਹਿੰਦੀ ਹੈ।|macchī pāṇī vicc rahindī hai|The fish lives in water.
ਯ|ਯੰਤਰ|yantar|⚙️|ਯੰਤਰ ਕੰਮ ਕਰਦਾ ਹੈ।|yantar kamm kardā hai|The machine works.
ਰ|ਰੇਲ|rel|🚆|ਰੇਲ ਪਟੜੀ ਉੱਤੇ ਚੱਲਦੀ ਹੈ।|rel paṭṛī utte calldī hai|The train runs on the track.
ਲ|ਲੱਡੂ|laḍḍū|🍬|ਲੱਡੂ ਬਹੁਤ ਮਿੱਠਾ ਹੈ।|laḍḍū bahut miṭṭhā hai|The laddu is very sweet.
ਵ|ਵਾਜਾ|vājā|🎹|ਉਹ ਵਾਜਾ ਵਜਾਉਂਦਾ ਹੈ।|uh vājā vajāundā hai|He plays the harmonium.
ਸ਼|ਸ਼ੇਰ|śer|🦁|ਸ਼ੇਰ ਜੰਗਲ ਦਾ ਰਾਜਾ ਹੈ।|śer jaṅgal dā rājā hai|The lion is the king of the jungle.
ਸ|ਸੂਰਜ|sūraj|☀️|ਸੂਰਜ ਸਵੇਰੇ ਚੜ੍ਹਦਾ ਹੈ।|sūraj savere caṛhdā hai|The sun rises in the morning.
ਹ|ਹਾਥੀ|hāthī|🐘|ਹਾਥੀ ਬਹੁਤ ਵੱਡਾ ਹੈ।|hāthī bahut vaḍḍā hai|The elephant is very big.
`),
    or: parse(`
ଅ|ଅଙ୍ଗୁର|aṅgura|🍇|ଅଙ୍ଗୁର ମିଠା।|aṅgura miṭhā|The grapes are sweet.
ଆ|ଆମ୍ବ|āmba|🥭|ଆମ୍ବ ମିଠା ଫଳ।|āmba miṭhā phaḷa|The mango is a sweet fruit.
ଇ|ଇଟା|iṭā|🧱|ଇଟାରେ କାନ୍ଥ ତିଆରି ହୁଏ।|iṭāre kāntha tiāri hue|Walls are made of bricks.
ଈ|ଈଗଲ|īgala|🦅|ଈଗଲ ଆକାଶରେ ଉଡ଼େ।|īgala ākāśare uṛe|The eagle flies in the sky.
ଉ|ଉଟ|uṭa|🐫|ଉଟ ମରୁଭୂମିରେ ଚାଲେ।|uṭa marubhūmire cāle|The camel walks in the desert.
ଊ|ଊଷା|ūṣā|🌅|ଊଷା ମାନେ ସକାଳ।|ūṣā māne sakāḷa|Usha means morning.
ଋ|ଋଷି|ṛṣi|🧘|ଋଷି ଜଙ୍ଗଲରେ ରହନ୍ତି।|ṛṣi jaṅgalare rahanti|The sage lives in the forest.
ଏ|ଏକ|eka|☝️|ମୋ ପାଖରେ ଏକ କଲମ ଅଛି।|mo pākhare eka kalama achi|I have one pen.
ଐ|ଐରାବତ|airābata|🐘|ଐରାବତ ଏକ ଧଳା ହାତୀ।|airābata eka dhaḷā hātī|Airavat is a white elephant.
ଓ|ଓଠ|oṭha|👄|ଓଠ ଲାଲ।|oṭha lāla|The lips are red.
ଔ|ଔଷଧ|auṣadha|💊|ଔଷଧ ପିତା।|auṣadha pitā|The medicine is bitter.
କ|କଦଳୀ|kadaḷī|🍌|କଦଳୀ ହଳଦିଆ।|kadaḷī haḷadiā|The banana is yellow.
ଖ|ଖଟ|khaṭa|🛏️|ଖଟ ଉପରେ ଶୁଅ।|khaṭa upare śua|Sleep on the cot.
ଗ|ଗାଈ|gāī|🐄|ଗାଈ କ୍ଷୀର ଦିଏ।|gāī kṣīra die|The cow gives milk.
ଘ|ଘଣ୍ଟା|ghaṇṭā|🔔|ମନ୍ଦିରରେ ଘଣ୍ଟା ବାଜେ।|mandirare ghaṇṭā bāje|The bell rings in the temple.
ଚ|ଚଢ଼େଇ|caṛhei|🐦|ଚଢ଼େଇ ଗୀତ ଗାଏ।|caṛhei gīta gāe|The bird sings.
ଛ|ଛତା|chatā|☂️|ବର୍ଷାରେ ଛତା ନିଅ।|barṣāre chatā nia|Take an umbrella in the rain.
ଜ|ଜାହାଜ|jāhāja|🚢|ଜାହାଜ ସମୁଦ୍ରରେ ଚାଲେ।|jāhāja samudrare cāle|The ship sails on the sea.
ଝ|ଝିଅ|jhia|👧|ଝିଅ ସ୍କୁଲ ଯାଏ।|jhia skula jāe|The girl goes to school.
ଟ|ଟମାଟୋ|ṭamāṭo|🍅|ଟମାଟୋ ଲାଲ।|ṭamāṭo lāla|The tomato is red.
ଡ|ଡାକ୍ତର|ḍāktara|🧑‍⚕️|ଡାକ୍ତର ରୋଗୀ ଦେଖନ୍ତି।|ḍāktara rogī dekhanti|The doctor sees the patient.
ଢ|ଢୋଲ|ḍhola|🥁|ବାହାଘରରେ ଢୋଲ ବାଜେ।|bāhāgharare ḍhola bāje|The drum plays at the wedding.
ତ|ତାରା|tārā|⭐|ଆକାଶରେ ତାରା ଜଳେ।|ākāśare tārā jaḷe|A star shines in the sky.
ଥ|ଥାଳି|thāḷi|🍽️|ଥାଳିରେ ଭାତ ଅଛି।|thāḷire bhāta achi|There is rice on the plate.
ଦ|ଦୁଆର|duāra|🚪|ଦୁଆର ଖୋଲା ଅଛି।|duāra kholā achi|The door is open.
ଧ|ଧନୁ|dhanu|🏹|ରାମଙ୍କ ପାଖରେ ଧନୁ ଅଛି।|rāmaṅka pākhare dhanu achi|Rama has a bow.
ନ|ନଡ଼ିଆ|naṛiā|🥥|ନଡ଼ିଆ ଗଛରେ ଫଳେ।|naṛiā gachare phaḷe|Coconuts grow on the tree.
ପ|ପୁସ୍ତକ|pustaka|📕|ମୁଁ ପୁସ୍ତକ ପଢ଼େ।|mũ pustaka paṛhe|I read a book.
ଫ|ଫୁଲ|phula|🌸|ଫୁଲ ସୁନ୍ଦର।|phula sundara|The flower is beautiful.
ବ|ବାଘ|bāgha|🐯|ବାଘ ଜଙ୍ଗଲରେ ରହେ।|bāgha jaṅgalare rahe|The tiger lives in the forest.
ଭ|ଭାଲୁ|bhālu|🐻|ଭାଲୁ ମହୁ ଭଲପାଏ।|bhālu mahu bhalapāe|The bear loves honey.
ମ|ମାଛ|mācha|🐟|ମାଛ ପାଣିରେ ରହେ।|mācha pāṇire rahe|The fish lives in water.
ଯ|ଯନ୍ତ୍ର|jantra|⚙️|ଯନ୍ତ୍ର କାମ କରେ।|jantra kāma kare|The machine works.
ର|ରେଳ|reḷa|🚆|ରେଳ ଶୀଘ୍ର ଚାଲେ।|reḷa śīghra cāle|The train runs fast.
ଲ|ଲଡ଼ୁ|laṛu|🍬|ଲଡ଼ୁ ବହୁତ ମିଠା।|laṛu bahuta miṭhā|The laddu is very sweet.
ଶ|ଶଙ୍ଖ|śaṅkha|🐚|ଶଙ୍ଖର ଶବ୍ଦ ଜୋରରେ।|śaṅkhara śabda jorare|The conch’s sound is loud.
ଷ|ଷଣ୍ଢ|ṣaṇḍha|🐂|ଷଣ୍ଢ ବହୁତ ବଳବାନ।|ṣaṇḍha bahuta baḷabāna|The bull is very strong.
ସ|ସୂର୍ଯ୍ୟ|sūrjya|☀️|ସୂର୍ଯ୍ୟ ସକାଳେ ଉଠେ।|sūrjya sakāḷe uṭhe|The sun rises in the morning.
ହ|ହାତୀ|hātī|🐘|ହାତୀ ବହୁତ ବଡ଼।|hātī bahuta baṛa|The elephant is very big.
`)
};
