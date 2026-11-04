/**
 * Section 1's translation lessons on their units' own topics (2026-11-04, the user: "the unit says Family, but the
 * content inside is different — correct it in every language"). translation.js holds the Kannada and English; this,
 * the same new sentences in every other language, laid over each language's pack (languages.js), its sounds and its
 * word meanings (content/sounds/index.js) when they load. Sentences that already fitted their unit moved to its
 * place (`MOVED`: new id ← old id) and keep everything they had.
 *
 * read  (Kannada → English lesson, "b-kn-en"): id → [sentence, its sound, each word's English ("|"), why]
 * build (English → Kannada lesson, "b-en-kn"): id → [sentence, other right answers, its sound (one part per tile),
 *       why, its tiles (Japanese, Chinese)]
 * Hindi has no sounds. Written here, not by any translation service: a native speaker should check them.
 */
const LESSONS = { read: 'translation-beginner-kn-en', build: 'translation-beginner-en-kn' };
const SOUNDS = { read: 'b-kn-en', build: 'b-en-kn' };
const MOVED = { read: { i2: 'i6', q1: 'q2' }, build: { i3: 'i4' } };
const IDS = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'q1', 'q2', 'q3', 'q4'];

const LANGS = {
    hi: {
        read: {
            i1: ['माँ', null, null, 'माँ (or माता) means mother.'],
            i3: ['मेरा परिवार बड़ा है।', null, null, 'मेरा = my, परिवार = family, बड़ा = big, है = is.'],
            i4: ['खाना', null, null, 'खाना means food (also भोजन).'],
            i5: ['मैं खुश हूँ।', null, null, 'खुश = happy, हूँ = am.'],
            i6: ['हाथी बड़ा है।', null, null, 'हाथी = elephant, बड़ा = big. English adds "the".'],
            q2: ['ये मेरे पिता हैं।', null, null, 'ये … हैं is the respectful "this is" for an elder; पिता = father.'],
            q3: ['चूहा छोटा है।', null, null, 'चूहा = mouse, छोटा = small.'],
            q4: ['खाना स्वादिष्ट है।', null, null, 'स्वादिष्ट = tasty.']
        },
        build: {
            i4: ['पढ़ना', ['पढ़ो', 'पढ़िए'], null, 'To read is पढ़ना (पढ़ो, politely पढ़िए).'],
            i5: ['मैं पत्र लिखता हूँ।', ['मैं पत्र लिखती हूँ।', 'मैं चिट्ठी लिखता हूँ।', 'मैं चिट्ठी लिखती हूँ।', 'मैं एक पत्र लिखता हूँ।', 'मैं एक पत्र लिखती हूँ।'], null, 'पत्र (or चिट्ठी) = letter; the verb goes at the end. A girl says लिखती हूँ.'],
            i6: ['यह पाठ आसान है।', ['ये पाठ आसान है।', 'यह पाठ सरल है।'], null, 'पाठ = lesson, आसान (or सरल) = easy.'],
            q1: ['यह मेरी किताब है।', ['ये मेरी किताब है।', 'यह मेरी पुस्तक है।'], null, 'किताब (or पुस्तक) = book; it is feminine, so मेरी.'],
            q2: ['मेरा दोस्त अध्यापक है।', ['मेरा दोस्त शिक्षक है।', 'मेरा मित्र शिक्षक है।', 'मेरी दोस्त अध्यापिका है।', 'मेरी सहेली शिक्षिका है।'], null, 'दोस्त (or मित्र) = friend; अध्यापक or शिक्षक = teacher (a woman: अध्यापिका, शिक्षिका).'],
            q3: ['मैं जल्दी उठता हूँ।', ['मैं जल्दी उठती हूँ।', 'मैं सुबह जल्दी उठता हूँ।', 'मैं सुबह जल्दी उठती हूँ।'], null, 'जल्दी = early, उठता हूँ = I get up (a girl: उठती हूँ).'],
            q4: ['वह हर दिन पढ़ती है।', ['वह रोज़ पढ़ती है।', 'वह रोज पढ़ती है।', 'वह प्रतिदिन पढ़ती है।'], null, 'हर दिन (or रोज़) = every day; पढ़ती है = she reads.']
        }
    },
    mr: {
        read: {
            i1: ['आई', 'aai', 'mother', 'आई means mother.'],
            i3: ['माझे कुटुंब मोठे आहे.', 'maajhe kutumb mothe aahe', 'my|family|big|is', 'माझे = my, कुटुंब = family, मोठे = big, आहे = is.'],
            i4: ['जेवण', 'jevan', 'food', 'जेवण means food or a meal.'],
            i5: ['मी आनंदी आहे.', 'mi aanandi aahe', 'I|happy|am', 'आनंदी = happy, आहे = am.'],
            i6: ['हत्ती मोठा आहे.', 'hatti mothaa aahe', 'elephant|big|is', 'हत्ती = elephant, मोठा = big. English adds "the".'],
            q2: ['हे माझे वडील आहेत.', 'he maajhe vadil aahet', 'this|my|father|is (polite)', 'वडील = father; आहेत is the respectful "is" for an elder.'],
            q3: ['उंदीर लहान आहे.', 'undir lahaan aahe', 'mouse|small|is', 'उंदीर = mouse, लहान = small.'],
            q4: ['जेवण चविष्ट आहे.', 'jevan chavishta aahe', 'food|tasty|is', 'चविष्ट = tasty.']
        },
        build: {
            i4: ['वाचणे', ['वाच', 'वाचा'], 'vaachane', 'To read is वाचणे (वाच, politely वाचा).'],
            i5: ['मी पत्र लिहितो.', ['मी पत्र लिहिते.', 'मी एक पत्र लिहितो.', 'मी एक पत्र लिहिते.'], 'mi patra lihito', 'पत्र = letter; the verb goes last. A girl says लिहिते.'],
            i6: ['हा धडा सोपा आहे.', ['हा पाठ सोपा आहे.'], 'haa dhadaa sopaa aahe', 'धडा = lesson, सोपा = easy, आहे = is.'],
            q1: ['हे माझे पुस्तक आहे.', ['हे माझं पुस्तक आहे.'], 'he maajhe pustak aahe', 'पुस्तक = book; माझे = my.'],
            q2: ['माझा मित्र शिक्षक आहे.', ['माझी मैत्रीण शिक्षिका आहे.', 'माझा मित्र एक शिक्षक आहे.'], 'maajhaa mitra shikshak aahe', 'मित्र = friend, शिक्षक = teacher (a woman: शिक्षिका).'],
            q3: ['मी लवकर उठतो.', ['मी लवकर उठते.', 'मी सकाळी लवकर उठतो.', 'मी सकाळी लवकर उठते.'], 'mi lavkar uthato', 'लवकर = early, उठतो = I get up (a girl: उठते).'],
            q4: ['ती रोज वाचते.', ['ती दररोज वाचते.', 'ती दर दिवशी वाचते.'], 'ti roj vaachate', 'रोज (or दररोज) = every day; वाचते = she reads.']
        }
    },
    bn: {
        read: {
            i1: ['মা', 'maa', 'mother', 'মা means mother.'],
            i3: ['আমার পরিবার বড়।', 'amar poribar boro', 'my|family|big (is)', 'আমার = my, পরিবার = family, বড় = big. Bengali needs no "is".'],
            i4: ['খাবার', 'khabar', 'food', 'খাবার means food.'],
            i5: ['আমি খুশি।', 'ami khushi', 'I|happy (am)', 'খুশি = happy; Bengali needs no word for "am" here.'],
            i6: ['হাতি বড়।', 'hati boro', 'elephant|big (is)', 'হাতি = elephant, বড় = big. English adds "the" and "is".'],
            q2: ['ইনি আমার বাবা।', 'ini amar baba', 'this (polite)|my|father', 'ইনি is a polite "this (person)"; বাবা = father.'],
            q3: ['ইঁদুর ছোট।', 'indur chhoto', 'mouse|small (is)', 'ইঁদুর = mouse, ছোট = small.'],
            q4: ['খাবার সুস্বাদু।', 'khabar susvadu', 'food|tasty (is)', 'সুস্বাদু = tasty.']
        },
        build: {
            i4: ['পড়া', ['পড়ো', 'পড়ুন'], 'pora', 'To read is পড়া (পড়ো, politely পড়ুন).'],
            i5: ['আমি চিঠি লিখি।', ['আমি একটা চিঠি লিখি।', 'আমি একটি চিঠি লিখি।'], 'ami chithi likhi', 'চিঠি = letter, লিখি = (I) write; the verb goes last.'],
            i6: ['এই পাঠটা সহজ।', ['এই পাঠ সহজ।', 'এই পড়াটা সহজ।'], 'ei pathta sohoj', 'এই = this, পাঠ = lesson, সহজ = easy; no word for "is".'],
            q1: ['এটা আমার বই।', ['এটি আমার বই।'], 'eta amar boi', 'এটা = this, বই = book.'],
            q2: ['আমার বন্ধু শিক্ষক।', ['আমার বন্ধু একজন শিক্ষক।', 'আমার বান্ধবী শিক্ষিকা।'], 'amar bondhu shikkhok', 'বন্ধু = friend, শিক্ষক = teacher (a woman: শিক্ষিকা).'],
            q3: ['আমি তাড়াতাড়ি উঠি।', ['আমি সকালে তাড়াতাড়ি উঠি।', 'আমি ভোরে উঠি।'], 'ami taratari uthi', 'তাড়াতাড়ি = early, উঠি = (I) get up.'],
            q4: ['সে প্রতিদিন পড়ে।', ['সে রোজ পড়ে।'], 'she protidin pore', 'প্রতিদিন (or রোজ) = every day; পড়ে = reads.']
        }
    },
    gu: {
        read: {
            i1: ['માતા', 'maataa', 'mother', 'માતા (or મા) means mother.'],
            i3: ['મારું કુટુંબ મોટું છે.', 'maarun kutumb motun chhe', 'my|family|big|is', 'મારું = my, કુટુંબ = family, મોટું = big, છે = is.'],
            i4: ['ભોજન', 'bhojan', 'food', 'ભોજન (or ખાવાનું) means food.'],
            i5: ['હું ખુશ છું.', 'hun khush chhun', 'I|happy|am', 'ખુશ = happy, છું = am.'],
            i6: ['હાથી મોટો છે.', 'haathi moto chhe', 'elephant|big|is', 'હાથી = elephant, મોટો = big.'],
            q2: ['આ મારા પિતા છે.', 'aa maaraa pitaa chhe', 'this|my|father|is', 'પિતા = father; મારા is the respectful "my" for an elder.'],
            q3: ['ઉંદર નાનો છે.', 'undar naano chhe', 'mouse|small|is', 'ઉંદર = mouse, નાનો = small.'],
            q4: ['ભોજન સ્વાદિષ્ટ છે.', 'bhojan svaadisht chhe', 'food|tasty|is', 'સ્વાદિષ્ટ = tasty.']
        },
        build: {
            i4: ['વાંચવું', ['વાંચ', 'વાંચો'], 'vaanchvun', 'To read is વાંચવું (વાંચ, politely વાંચો).'],
            i5: ['હું પત્ર લખું છું.', ['હું એક પત્ર લખું છું.', 'હું કાગળ લખું છું.'], 'hun patra lakhun chhun', 'પત્ર (or કાગળ) = letter, લખું છું = I write.'],
            i6: ['આ પાઠ સહેલો છે.', ['આ પાઠ સરળ છે.'], 'aa paath sahelo chhe', 'પાઠ = lesson, સહેલો (or સરળ) = easy.'],
            q1: ['આ મારું પુસ્તક છે.', ['આ મારી ચોપડી છે.'], 'aa maarun pustak chhe', 'પુસ્તક (or ચોપડી) = book.'],
            q2: ['મારો મિત્ર શિક્ષક છે.', ['મારી સહેલી શિક્ષિકા છે.', 'મારો મિત્ર એક શિક્ષક છે.'], 'maaro mitra shikshak chhe', 'મિત્ર = friend, શિક્ષક = teacher (a woman: શિક્ષિકા).'],
            q3: ['હું વહેલો ઊઠું છું.', ['હું વહેલી ઊઠું છું.', 'હું સવારે વહેલો ઊઠું છું.'], 'hun vahelo uthun chhun', 'વહેલો = early (a girl: વહેલી), ઊઠું છું = I get up.'],
            q4: ['તે દરરોજ વાંચે છે.', ['તે રોજ વાંચે છે.'], 'te darroj vaanche chhe', 'દરરોજ (or રોજ) = every day; વાંચે છે = reads.']
        }
    },
    pa: {
        read: {
            i1: ['ਮਾਂ', 'maan', 'mother', 'ਮਾਂ means mother.'],
            i3: ['ਮੇਰਾ ਪਰਿਵਾਰ ਵੱਡਾ ਹੈ।', 'meraa parivaar vaddaa hai', 'my|family|big|is', 'ਮੇਰਾ = my, ਪਰਿਵਾਰ = family, ਵੱਡਾ = big, ਹੈ = is.'],
            i4: ['ਖਾਣਾ', 'khaanaa', 'food', 'ਖਾਣਾ means food.'],
            i5: ['ਮੈਂ ਖ਼ੁਸ਼ ਹਾਂ।', 'main khush haan', 'I|happy|am', 'ਖ਼ੁਸ਼ = happy, ਹਾਂ = am.'],
            i6: ['ਹਾਥੀ ਵੱਡਾ ਹੈ।', 'haathi vaddaa hai', 'elephant|big|is', 'ਹਾਥੀ = elephant, ਵੱਡਾ = big.'],
            q2: ['ਇਹ ਮੇਰੇ ਪਿਤਾ ਜੀ ਹਨ।', 'ih mere pitaa ji han', 'this|my|father|(respect)|is', 'ਪਿਤਾ ਜੀ = father, said with respect; ਹਨ is the respectful "is".'],
            q3: ['ਚੂਹਾ ਛੋਟਾ ਹੈ।', 'choohaa chhotaa hai', 'mouse|small|is', 'ਚੂਹਾ = mouse, ਛੋਟਾ = small.'],
            q4: ['ਖਾਣਾ ਸੁਆਦੀ ਹੈ।', 'khaanaa suaadi hai', 'food|tasty|is', 'ਸੁਆਦੀ = tasty.']
        },
        build: {
            i4: ['ਪੜ੍ਹਨਾ', ['ਪੜ੍ਹ', 'ਪੜ੍ਹੋ'], 'parhnaa', 'To read is ਪੜ੍ਹਨਾ (ਪੜ੍ਹ, politely ਪੜ੍ਹੋ).'],
            i5: ['ਮੈਂ ਚਿੱਠੀ ਲਿਖਦਾ ਹਾਂ।', ['ਮੈਂ ਚਿੱਠੀ ਲਿਖਦੀ ਹਾਂ।', 'ਮੈਂ ਇੱਕ ਚਿੱਠੀ ਲਿਖਦਾ ਹਾਂ।', 'ਮੈਂ ਇੱਕ ਚਿੱਠੀ ਲਿਖਦੀ ਹਾਂ।'], 'main chitthi likhdaa haan', 'ਚਿੱਠੀ = letter; the verb goes last. A girl says ਲਿਖਦੀ ਹਾਂ.'],
            i6: ['ਇਹ ਪਾਠ ਸੌਖਾ ਹੈ।', ['ਇਹ ਪਾਠ ਆਸਾਨ ਹੈ।'], 'ih paath saukhaa hai', 'ਪਾਠ = lesson, ਸੌਖਾ (or ਆਸਾਨ) = easy.'],
            q1: ['ਇਹ ਮੇਰੀ ਕਿਤਾਬ ਹੈ।', ['ਇਹ ਮੇਰੀ ਪੁਸਤਕ ਹੈ।'], 'ih meri kitaab hai', 'ਕਿਤਾਬ = book; it is feminine, so ਮੇਰੀ.'],
            q2: ['ਮੇਰਾ ਦੋਸਤ ਅਧਿਆਪਕ ਹੈ।', ['ਮੇਰੀ ਸਹੇਲੀ ਅਧਿਆਪਕਾ ਹੈ।', 'ਮੇਰਾ ਮਿੱਤਰ ਅਧਿਆਪਕ ਹੈ।'], 'meraa dost adhiaapak hai', 'ਦੋਸਤ = friend, ਅਧਿਆਪਕ = teacher (a woman: ਅਧਿਆਪਕਾ).'],
            q3: ['ਮੈਂ ਜਲਦੀ ਉੱਠਦਾ ਹਾਂ।', ['ਮੈਂ ਜਲਦੀ ਉੱਠਦੀ ਹਾਂ।', 'ਮੈਂ ਸਵੇਰੇ ਜਲਦੀ ਉੱਠਦਾ ਹਾਂ।'], 'main jaldi utthdaa haan', 'ਜਲਦੀ = early, ਉੱਠਦਾ ਹਾਂ = I get up (a girl: ਉੱਠਦੀ).'],
            q4: ['ਉਹ ਹਰ ਰੋਜ਼ ਪੜ੍ਹਦੀ ਹੈ।', ['ਉਹ ਰੋਜ਼ ਪੜ੍ਹਦੀ ਹੈ।'], 'uh har roz parhdi hai', 'ਹਰ ਰੋਜ਼ = every day; ਪੜ੍ਹਦੀ ਹੈ = she reads.']
        }
    },
    or: {
        read: {
            i1: ['ମା', 'maa', 'mother', 'ମା means mother.'],
            i3: ['ମୋ ପରିବାର ବଡ଼।', 'mo paribaara bada', 'my|family|big (is)', 'ମୋ = my, ପରିବାର = family, ବଡ଼ = big; Odia needs no "is".'],
            i4: ['ଖାଦ୍ୟ', 'khaadya', 'food', 'ଖାଦ୍ୟ means food.'],
            i5: ['ମୁଁ ଖୁସି।', 'mun khusi', 'I|happy (am)', 'ଖୁସି = happy; no word for "am" is needed.'],
            i6: ['ହାତୀ ବଡ଼।', 'haati bada', 'elephant|big (is)', 'ହାତୀ = elephant, ବଡ଼ = big.'],
            q2: ['ଏ ମୋ ବାପା।', 'e mo baapaa', 'this|my|father', 'ଏ = this (person), ବାପା = father.'],
            q3: ['ମୂଷା ଛୋଟ।', 'moosaa chhota', 'mouse|small (is)', 'ମୂଷା = mouse, ଛୋଟ = small.'],
            q4: ['ଖାଦ୍ୟ ସ୍ୱାଦିଷ୍ଟ।', 'khaadya swaadishta', 'food|tasty (is)', 'ସ୍ୱାଦିଷ୍ଟ = tasty.']
        },
        build: {
            i4: ['ପଢ଼ିବା', ['ପଢ଼', 'ପଢ଼ନ୍ତୁ'], 'padhibaa', 'To read is ପଢ଼ିବା (ପଢ଼, politely ପଢ଼ନ୍ତୁ).'],
            i5: ['ମୁଁ ଚିଠି ଲେଖେ।', ['ମୁଁ ଗୋଟିଏ ଚିଠି ଲେଖେ।'], 'mun chithi lekhe', 'ଚିଠି = letter, ଲେଖେ = (I) write; the verb goes last.'],
            i6: ['ଏହି ପାଠ ସହଜ।', ['ଏ ପାଠ ସହଜ।'], 'ehi paatha sahaja', 'ଏହି = this, ପାଠ = lesson, ସହଜ = easy.'],
            q1: ['ଏହା ମୋ ବହି।', ['ଏହା ମୋର ବହି।'], 'ehaa mo bahi', 'ଏହା = this, ବହି = book.'],
            q2: ['ମୋ ସାଙ୍ଗ ଶିକ୍ଷକ।', ['ମୋର ସାଙ୍ଗ ଶିକ୍ଷକ।', 'ମୋ ସାଙ୍ଗ ଜଣେ ଶିକ୍ଷକ।'], 'mo saanga shikshaka', 'ସାଙ୍ଗ = friend, ଶିକ୍ଷକ = teacher.'],
            q3: ['ମୁଁ ଶୀଘ୍ର ଉଠେ।', ['ମୁଁ ସକାଳୁ ଶୀଘ୍ର ଉଠେ।'], 'mun sheeghra uthe', 'ଶୀଘ୍ର = early, ଉଠେ = (I) get up.'],
            q4: ['ସେ ପ୍ରତିଦିନ ପଢ଼େ।', ['ସେ ରୋଜ ପଢ଼େ।'], 'se pratidina padhe', 'ପ୍ରତିଦିନ = every day; ପଢ଼େ = reads.']
        }
    },
    ta: {
        read: {
            i1: ['அம்மா', 'ammaa', 'mother', 'அம்மா means mother (தாய் is the formal word).'],
            i3: ['என் குடும்பம் பெரியது.', 'en kudumbam periyadhu', 'my|family|big (is)', 'குடும்பம் = family, பெரியது = (is) big.'],
            i4: ['உணவு', 'unavu', 'food', 'உணவு means food.'],
            i5: ['நான் மகிழ்ச்சியாக இருக்கிறேன்.', 'naan magizhchiyaaga irukkiren', 'I|happy|am', 'மகிழ்ச்சியாக = happy, இருக்கிறேன் = am.'],
            i6: ['யானை பெரியது.', 'yaanai periyadhu', 'elephant|big (is)', 'யானை = elephant, பெரியது = (is) big.'],
            q2: ['இவர் என் அப்பா.', 'ivar en appaa', 'this (polite)|my|father', 'இவர் is a polite "this (person)"; அப்பா = father.'],
            q3: ['எலி சிறியது.', 'eli siriyadhu', 'mouse|small (is)', 'எலி = mouse, சிறியது = (is) small.'],
            q4: ['உணவு சுவையாக இருக்கிறது.', 'unavu suvaiyaaga irukkiradhu', 'food|tasty|is', 'சுவையாக = tasty, இருக்கிறது = is.']
        },
        build: {
            i4: ['படி', ['படியுங்கள்', 'படிப்பது'], 'padi', 'Read is படி (politely படியுங்கள்).'],
            i5: ['நான் கடிதம் எழுதுகிறேன்.', ['நான் ஒரு கடிதம் எழுதுகிறேன்.'], 'naan kaditham ezhudhugiren', 'கடிதம் = letter, எழுதுகிறேன் = I write; the verb goes last.'],
            i6: ['இந்தப் பாடம் எளிது.', ['இந்த பாடம் எளிது.', 'இந்தப் பாடம் சுலபம்.', 'இந்த பாடம் சுலபமானது.'], 'indhap paadam elidhu', 'பாடம் = lesson, எளிது (or சுலபம்) = easy.'],
            q1: ['இது என் புத்தகம்.', ['இது என்னுடைய புத்தகம்.'], 'idhu en puththagam', 'இது = this, புத்தகம் = book.'],
            q2: ['என் நண்பன் ஆசிரியர்.', ['என் நண்பர் ஆசிரியர்.', 'என் தோழி ஆசிரியை.', 'என் நண்பன் ஒரு ஆசிரியர்.'], 'en nanban aasiriyar', 'நண்பன் = friend, ஆசிரியர் = teacher (a woman: ஆசிரியை).'],
            q3: ['நான் சீக்கிரம் எழுந்திருக்கிறேன்.', ['நான் சீக்கிரமாக எழுந்திருக்கிறேன்.', 'நான் காலையில் சீக்கிரம் எழுகிறேன்.', 'நான் சீக்கிரம் எழுகிறேன்.'], 'naan seekkiram ezhundhirukkiren', 'சீக்கிரம் = early, எழுந்திருக்கிறேன் = I get up.'],
            q4: ['அவள் தினமும் படிக்கிறாள்.', ['அவள் ஒவ்வொரு நாளும் படிக்கிறாள்.'], 'aval dhinamum padikkiraal', 'தினமும் = every day; படிக்கிறாள் = she reads.']
        }
    },
    te: {
        read: {
            i1: ['అమ్మ', 'amma', 'mother', 'అమ్మ means mother (తల్లి is the formal word).'],
            i3: ['మా కుటుంబం పెద్దది.', 'maa kutumbam peddadi', 'our|family|big (is)', 'మా = our, కుటుంబం = family, పెద్దది = (is) big. English often says "my family".'],
            i4: ['ఆహారం', 'aahaaram', 'food', 'ఆహారం means food.'],
            i5: ['నేను సంతోషంగా ఉన్నాను.', 'nenu santhoshangaa unnaanu', 'I|happy|am', 'సంతోషంగా = happy, ఉన్నాను = am.'],
            i6: ['ఏనుగు పెద్దది.', 'enugu peddadi', 'elephant|big (is)', 'ఏనుగు = elephant, పెద్దది = (is) big.'],
            q2: ['ఈయన మా నాన్న.', 'eeyana maa naanna', 'this (polite)|my|father', 'ఈయన is a polite "this (man)"; నాన్న = father.'],
            q3: ['ఎలుక చిన్నది.', 'eluka chinnadi', 'mouse|small (is)', 'ఎలుక = mouse, చిన్నది = (is) small.'],
            q4: ['ఆహారం రుచిగా ఉంది.', 'aahaaram ruchigaa undi', 'food|tasty|is', 'రుచిగా = tasty, ఉంది = is.']
        },
        build: {
            i4: ['చదువు', ['చదవండి'], 'chaduvu', 'Read is చదువు (politely చదవండి).'],
            i5: ['నేను ఉత్తరం రాస్తాను.', ['నేను ఒక ఉత్తరం రాస్తాను.', 'నేను లేఖ రాస్తాను.'], 'nenu uttharam raasthaanu', 'ఉత్తరం (or లేఖ) = letter, రాస్తాను = I write.'],
            i6: ['ఈ పాఠం సులభం.', ['ఈ పాఠం తేలిక.', 'ఈ పాఠం సులభంగా ఉంది.'], 'ee paatham sulabham', 'పాఠం = lesson, సులభం (or తేలిక) = easy.'],
            q1: ['ఇది నా పుస్తకం.', [], 'idi naa pusthakam', 'ఇది = this, నా = my, పుస్తకం = book.'],
            q2: ['నా స్నేహితుడు ఉపాధ్యాయుడు.', ['నా స్నేహితురాలు ఉపాధ్యాయురాలు.', 'నా స్నేహితుడు టీచర్.'], 'naa snehithudu upaadhyaayudu', 'స్నేహితుడు = friend, ఉపాధ్యాయుడు = teacher.'],
            q3: ['నేను త్వరగా లేస్తాను.', ['నేను పొద్దున్నే లేస్తాను.', 'నేను తొందరగా లేస్తాను.'], 'nenu thvaragaa lesthaanu', 'త్వరగా = early, లేస్తాను = I get up.'],
            q4: ['ఆమె రోజూ చదువుతుంది.', ['ఆమె ప్రతిరోజూ చదువుతుంది.'], 'aame rojoo chaduvuthundi', 'రోజూ = every day; చదువుతుంది = she reads.']
        }
    },
    ml: {
        read: {
            i1: ['അമ്മ', 'amma', 'mother', 'അമ്മ means mother.'],
            i3: ['എന്റെ കുടുംബം വലുതാണ്.', 'ente kudumbam valuthaanu', 'my|family|big (it is)', 'കുടുംബം = family, വലുതാണ് = is big.'],
            i4: ['ഭക്ഷണം', 'bhakshanam', 'food', 'ഭക്ഷണം means food.'],
            i5: ['എനിക്ക് സന്തോഷമാണ്.', 'enikku santhoshamaanu', 'to me|happiness (it is)', 'Malayalam says "to me, it is happiness": എനിക്ക് സന്തോഷമാണ് = I am happy.'],
            i6: ['ആന വലുതാണ്.', 'aana valuthaanu', 'elephant|big (it is)', 'ആന = elephant, വലുതാണ് = is big.'],
            q2: ['ഇത് എന്റെ അച്ഛനാണ്.', 'ithu ente achhanaanu', 'this|my|father (he is)', 'അച്ഛൻ = father; ആണ് = is.'],
            q3: ['എലി ചെറുതാണ്.', 'eli cheruthaanu', 'mouse|small (it is)', 'എലി = mouse, ചെറുതാണ് = is small.'],
            q4: ['ഭക്ഷണം രുചികരമാണ്.', 'bhakshanam ruchikaramaanu', 'food|tasty (it is)', 'രുചികരം = tasty; ആണ് = is.']
        },
        build: {
            i4: ['വായിക്കുക', ['വായിക്ക്', 'വായിക്കൂ'], 'vaayikkuka', 'To read is വായിക്കുക (വായിക്കൂ).'],
            i5: ['ഞാൻ കത്ത് എഴുതുന്നു.', ['ഞാൻ ഒരു കത്ത് എഴുതുന്നു.'], 'njaan kathu ezhuthunnu', 'കത്ത് = letter, എഴുതുന്നു = write; the verb goes last.'],
            i6: ['ഈ പാഠം എളുപ്പമാണ്.', ['ഈ പാഠം എളുപ്പം.'], 'ee paadam eluppamaanu', 'പാഠം = lesson, എളുപ്പം = easy; ആണ് = is.'],
            q1: ['ഇത് എന്റെ പുസ്തകമാണ്.', ['ഇത് എന്റെ പുസ്തകം.'], 'ithu ente pusthakamaanu', 'പുസ്തകം = book; ആണ് = is.'],
            q2: ['എന്റെ കൂട്ടുകാരൻ അധ്യാപകനാണ്.', ['എന്റെ സുഹൃത്ത് അധ്യാപകനാണ്.', 'എന്റെ കൂട്ടുകാരി അധ്യാപികയാണ്.'], 'ente koottukaaran adhyaapakanaanu', 'കൂട്ടുകാരൻ = friend, അധ്യാപകൻ = teacher (a woman: അധ്യാപിക).'],
            q3: ['ഞാൻ നേരത്തെ എഴുന്നേൽക്കും.', ['ഞാൻ രാവിലെ നേരത്തെ എഴുന്നേൽക്കും.', 'ഞാൻ നേരത്തെ ഉണരും.'], 'njaan nerathe ezhunnelkkum', 'നേരത്തെ = early, എഴുന്നേൽക്കും = (I) get up.'],
            q4: ['അവൾ എല്ലാ ദിവസവും വായിക്കും.', ['അവൾ ദിവസവും വായിക്കും.', 'അവൾ എന്നും വായിക്കും.'], 'aval ellaa divasavum vaayikkum', 'എല്ലാ ദിവസവും = every day; വായിക്കും = reads.']
        }
    },
    ur: {
        read: {
            i1: ['ماں', 'maan', 'mother', 'ماں (or امی) means mother.'],
            i3: ['میرا خاندان بڑا ہے۔', 'mera khaandaan bara hai', 'my|family|big|is', 'میرا = my, خاندان = family, بڑا = big, ہے = is.'],
            i4: ['کھانا', 'khaana', 'food', 'کھانا means food.'],
            i5: ['میں خوش ہوں۔', 'main khush hoon', 'I|happy|am', 'خوش = happy, ہوں = am.'],
            i6: ['ہاتھی بڑا ہے۔', 'haathi bara hai', 'elephant|big|is', 'ہاتھی = elephant, بڑا = big.'],
            q2: ['یہ میرے والد ہیں۔', 'yeh mere waalid hain', 'this|my|father|is (respect)', 'والد = father; ہیں is the respectful "is".'],
            q3: ['چوہا چھوٹا ہے۔', 'chooha chhota hai', 'mouse|small|is', 'چوہا = mouse, چھوٹا = small.'],
            q4: ['کھانا مزیدار ہے۔', 'khaana mazedaar hai', 'food|tasty|is', 'مزیدار = tasty.']
        },
        build: {
            i4: ['پڑھنا', ['پڑھو', 'پڑھیے'], 'parhna', 'To read is پڑھنا (پڑھو, politely پڑھیے).'],
            i5: ['میں خط لکھتا ہوں۔', ['میں خط لکھتی ہوں۔', 'میں ایک خط لکھتا ہوں۔', 'میں ایک خط لکھتی ہوں۔'], 'main khat likhta hoon', 'خط = letter; the verb goes last. A girl says لکھتی ہوں.'],
            i6: ['یہ سبق آسان ہے۔', [], 'yeh sabaq aasaan hai', 'سبق = lesson, آسان = easy.'],
            q1: ['یہ میری کتاب ہے۔', [], 'yeh meri kitaab hai', 'کتاب = book; it is feminine, so میری.'],
            q2: ['میرا دوست استاد ہے۔', ['میری سہیلی استانی ہے۔', 'میرا دوست ٹیچر ہے۔'], 'mera dost ustaad hai', 'دوست = friend, استاد = teacher (a woman: استانی).'],
            q3: ['میں جلدی اٹھتا ہوں۔', ['میں جلدی اٹھتی ہوں۔', 'میں صبح جلدی اٹھتا ہوں۔'], 'main jaldi uthta hoon', 'جلدی = early, اٹھتا ہوں = I get up (a girl: اٹھتی ہوں).'],
            q4: ['وہ روز پڑھتی ہے۔', ['وہ ہر روز پڑھتی ہے۔'], 'woh roz parhti hai', 'روز (or ہر روز) = every day; پڑھتی ہے = she reads.']
        }
    },
    ar: {
        read: {
            i1: ['أم', 'umm', 'mother', 'أم means mother (ماما is what children say).'],
            i3: ['عائلتي كبيرة.', 'aa-ilatee kabeera', 'my family|big (is)', 'عائلتي = my family (ي = my), كبيرة = big; Arabic needs no "is".'],
            i4: ['طعام', 'taaam', 'food', 'طعام means food.'],
            i5: ['أنا سعيد.', 'ana saeed', 'I|happy (am)', 'سعيد = happy (a girl says سعيدة); no "am" is needed.'],
            i6: ['الفيل كبير.', 'al-feel kabeer', 'the elephant|big (is)', 'الفيل = the elephant, كبير = big.'],
            q2: ['هذا أبي.', 'haadha abee', 'this (is)|my father', 'هذا = this, أبي = my father.'],
            q3: ['الفأر صغير.', 'al-faar sagheer', 'the mouse|small (is)', 'الفأر = the mouse, صغير = small.'],
            q4: ['الطعام لذيذ.', 'at-taaam ladheedh', 'the food|tasty (is)', 'لذيذ = tasty.']
        },
        build: {
            i4: ['اقرأ', ['يقرأ', 'قراءة', 'القراءة'], 'iqra', 'اقرأ is "read!"; يقرأ = he reads, القراءة = reading.'],
            i5: ['أنا أكتب رسالة.', ['أكتب رسالة.', 'أنا أكتب خطابا.'], 'ana aktub risaala', 'أكتب = I write, رسالة = letter.'],
            i6: ['هذا الدرس سهل.', [], 'haadha ad-dars sahl', 'الدرس = the lesson, سهل = easy; no "is".'],
            q1: ['هذا كتابي.', ['هذا هو كتابي.'], 'haadha kitaabee', 'كتابي = my book (ي = my).'],
            q2: ['صديقي معلم.', ['صديقي مدرس.', 'صديقتي معلمة.'], 'sadeeqee muallim', 'صديقي = my friend, معلم = teacher (a woman: معلمة).'],
            q3: ['أنا أستيقظ مبكرا.', ['أستيقظ مبكرا.', 'أنا أستيقظ باكرا.'], 'ana astayqidh mubakkiran', 'أستيقظ = I wake up, مبكرا = early.'],
            q4: ['هي تقرأ كل يوم.', ['تقرأ كل يوم.'], 'hiya taqra kull yawm', 'تقرأ = she reads, كل يوم = every day.']
        }
    },
    ru: {
        read: {
            i1: ['мама', 'mama', 'mother', 'мама means mother (мать is the formal word).'],
            i3: ['Моя семья большая.', 'moya semya bolshaya', 'my|family|big (is)', 'семья = family, большая = big; Russian needs no "is".'],
            i4: ['еда', 'yeda', 'food', 'еда means food.'],
            i5: ['Я счастлив.', 'ya schastliv', 'I|happy (am)', 'счастлив = happy (a girl says счастлива); no "am" is needed.'],
            i6: ['Слон большой.', 'slon bolshoy', 'elephant|big (is)', 'слон = elephant, большой = big. English adds "the" and "is".'],
            q2: ['Это мой папа.', 'eto moy papa', 'this (is)|my|father', 'папа = dad, father; это = this (is).'],
            q3: ['Мышь маленькая.', 'mysh malenkaya', 'mouse|small (is)', 'мышь = mouse, маленькая = small.'],
            q4: ['Еда вкусная.', 'yeda vkusnaya', 'food|tasty (is)', 'вкусная = tasty.']
        },
        build: {
            i4: ['читать', ['читай', 'читайте'], 'chitat', 'To read is читать (читай, politely читайте).'],
            i5: ['Я пишу письмо.', [], 'ya pishu pismo', 'пишу = I write, письмо = letter.'],
            i6: ['Этот урок лёгкий.', ['Этот урок простой.', 'Этот урок легкий.'], 'etot urok lyogkiy', 'урок = lesson, лёгкий (or простой) = easy.'],
            q1: ['Это моя книга.', [], 'eto moya kniga', 'книга = book; моя = my (книга is feminine).'],
            q2: ['Мой друг учитель.', ['Мой друг — учитель.', 'Моя подруга учительница.'], 'moy drug uchitel', 'друг = friend, учитель = teacher (a woman: учительница).'],
            q3: ['Я встаю рано.', ['Я рано встаю.'], 'ya vstayu rano', 'встаю = I get up, рано = early.'],
            q4: ['Она читает каждый день.', [], 'ona chitayet kazhdyy den', 'читает = she reads, каждый день = every day.']
        }
    },
    es: {
        read: {
            i1: ['madre', 'mah-dreh', 'mother', '"madre" means mother ("mamá" is mum).'],
            i3: ['Mi familia es grande.', 'mee fa-mee-lya es gran-deh', 'my|family|is|big', '"familia" = family, "grande" = big.'],
            i4: ['comida', 'ko-mee-da', 'food', '"comida" means food (or a meal).'],
            i5: ['Estoy feliz.', 'es-toy feh-lees', 'I am|happy', '"estoy" = I am (for how you feel), "feliz" = happy.'],
            i6: ['El elefante es grande.', 'el eh-leh-fan-teh es gran-deh', 'the|elephant|is|big', '"elefante" = elephant, "grande" = big.'],
            q2: ['Este es mi padre.', 'es-teh es mee pa-dreh', 'this|is|my|father', '"padre" = father ("papá" is dad).'],
            q3: ['El ratón es pequeño.', 'el ra-ton es peh-keh-nyo', 'the|mouse|is|small', '"ratón" = mouse, "pequeño" = small.'],
            q4: ['La comida está rica.', 'la ko-mee-da es-ta ree-ka', 'the|food|is|tasty', '"rica" = tasty (said of food); "está" = is.']
        },
        build: {
            i4: ['leer', ['lee', 'lea'], 'leh-er', 'To read is "leer" ("lee" when you tell someone to read).'],
            i5: ['Escribo una carta.', ['Yo escribo una carta.'], 'es-kree-bo oo-na kar-ta', '"escribo" = I write, "una carta" = a letter.'],
            i6: ['Esta lección es fácil.', ['Esta lección es sencilla.'], 'es-ta lek-syon es fa-seel', '"lección" = lesson, "fácil" = easy.'],
            q1: ['Este es mi libro.', ['Es mi libro.', 'Éste es mi libro.'], 'es-teh es mee lee-bro', '"libro" = book.'],
            q2: ['Mi amigo es profesor.', ['Mi amigo es maestro.', 'Mi amiga es profesora.', 'Mi amiga es maestra.', 'Mi amigo es un profesor.'], 'mee a-mee-go es pro-feh-sor', '"amigo" = friend, "profesor" = teacher; Spanish drops "a" before a job.'],
            q3: ['Me levanto temprano.', ['Yo me levanto temprano.'], 'meh leh-van-to tem-pra-no', '"me levanto" = I get up, "temprano" = early.'],
            q4: ['Ella lee todos los días.', ['Lee todos los días.', 'Ella lee cada día.'], 'eh-ya leh to-dos los dee-as', '"lee" = she reads, "todos los días" = every day.']
        }
    },
    fr: {
        read: {
            i1: ['mère', 'mair', 'mother', '"mère" means mother ("maman" is mum).'],
            i3: ['Ma famille est grande.', 'ma fa-mee ay grahnd', 'my|family|is|big', '"famille" = family, "grande" = big.'],
            i4: ['nourriture', 'noo-ree-tewr', 'food', '"nourriture" means food.'],
            i5: ['Je suis heureux.', 'zhuh swee uh-ruh', 'I|am|happy', '"heureux" = happy (a girl says "heureuse").'],
            i6: ['L’éléphant est grand.', 'lay-lay-fahn ay grahn', 'the elephant|is|big', '"éléphant" = elephant, "grand" = big.'],
            q2: ['C’est mon père.', 'say mohn pair', 'it is|my|father', '"père" = father ("papa" is dad).'],
            q3: ['La souris est petite.', 'la soo-ree ay puh-teet', 'the|mouse|is|small', '"souris" = mouse, "petite" = small.'],
            q4: ['La nourriture est délicieuse.', 'la noo-ree-tewr ay day-lee-syuhz', 'the|food|is|delicious', '"délicieuse" = tasty, delicious.']
        },
        build: {
            i4: ['lire', ['lis', 'lisez'], 'leer', 'To read is "lire" ("lis", politely "lisez").'],
            i5: ['J’écris une lettre.', ['J\'écris une lettre.'], 'zhay-kree ewn let-ruh', '"j’écris" = I write, "une lettre" = a letter.'],
            i6: ['Cette leçon est facile.', [], 'set luh-sohn ay fa-seel', '"leçon" = lesson, "facile" = easy.'],
            q1: ['C’est mon livre.', ['C\'est mon livre.', 'Voici mon livre.'], 'say mohn lee-vruh', '"livre" = book; "c’est" = this is.'],
            q2: ['Mon ami est professeur.', ['Mon ami est enseignant.', 'Mon amie est professeure.', 'Mon amie est enseignante.'], 'mohn a-mee ay pro-fe-sur', '"ami" = friend, "professeur" = teacher; French drops "a" before a job.'],
            q3: ['Je me lève tôt.', [], 'zhuh muh lev toh', '"je me lève" = I get up, "tôt" = early.'],
            q4: ['Elle lit tous les jours.', ['Elle lit chaque jour.'], 'el lee too lay zhoor', '"lit" = reads, "tous les jours" = every day.']
        }
    },
    de: {
        read: {
            i1: ['Mutter', 'moo-ter', 'mother', '"Mutter" means mother ("Mama" is mum).'],
            i3: ['Meine Familie ist groß.', 'my-neh fa-mee-lyeh ist grohs', 'my|family|is|big', '"Familie" = family, "groß" = big.'],
            i4: ['Essen', 'es-sen', 'food', '"Essen" means food (or a meal).'],
            i5: ['Ich bin glücklich.', 'ikh bin glewk-likh', 'I|am|happy', '"glücklich" = happy.'],
            i6: ['Der Elefant ist groß.', 'dair eh-leh-fant ist grohs', 'the|elephant|is|big', '"Elefant" = elephant, "groß" = big.'],
            q2: ['Das ist mein Vater.', 'das ist mine fah-ter', 'that|is|my|father', '"Vater" = father ("Papa" is dad).'],
            q3: ['Die Maus ist klein.', 'dee mows ist kline', 'the|mouse|is|small', '"Maus" = mouse, "klein" = small.'],
            q4: ['Das Essen ist lecker.', 'das es-sen ist lek-er', 'the|food|is|tasty', '"lecker" = tasty.']
        },
        build: {
            i4: ['lesen', ['lies', 'lesen Sie'], 'lay-zen', 'To read is "lesen" ("lies" when you tell a friend to read).'],
            i5: ['Ich schreibe einen Brief.', [], 'ikh shry-beh eye-nen breef', '"schreibe" = (I) write, "einen Brief" = a letter.'],
            i6: ['Diese Lektion ist leicht.', ['Diese Lektion ist einfach.', 'Die Lektion ist leicht.'], 'dee-zeh lek-tsyohn ist lykht', '"Lektion" = lesson, "leicht" (or "einfach") = easy.'],
            q1: ['Das ist mein Buch.', [], 'das ist mine bookh', '"Buch" = book.'],
            q2: ['Mein Freund ist Lehrer.', ['Meine Freundin ist Lehrerin.', 'Mein Freund ist ein Lehrer.'], 'mine froynt ist lay-rer', '"Freund" = friend, "Lehrer" = teacher; German drops "a" before a job.'],
            q3: ['Ich stehe früh auf.', [], 'ikh shtay-eh frew owf', '"ich stehe … auf" = I get up, "früh" = early.'],
            q4: ['Sie liest jeden Tag.', [], 'zee leest yay-den tahk', '"liest" = reads, "jeden Tag" = every day.']
        }
    },
    pt: {
        read: {
            i1: ['mãe', 'mahyn', 'mother', '"mãe" means mother.'],
            i3: ['A minha família é grande.', 'a mee-nya fa-mee-lya eh grahn-jee', 'the|my|family|is|big', '"família" = family, "grande" = big.'],
            i4: ['comida', 'ko-mee-da', 'food', '"comida" means food.'],
            i5: ['Eu estou feliz.', 'eh-oo es-toh feh-lees', 'I|am|happy', '"estou" = I am (for how you feel), "feliz" = happy.'],
            i6: ['O elefante é grande.', 'oo eh-leh-fahn-chee eh grahn-jee', 'the|elephant|is|big', '"elefante" = elephant, "grande" = big.'],
            q2: ['Este é o meu pai.', 'es-chee eh oo meh-oo pie', 'this|is|the|my|father', '"pai" = father.'],
            q3: ['O rato é pequeno.', 'oo ha-too eh peh-keh-noo', 'the|mouse|is|small', '"rato" = mouse, "pequeno" = small.'],
            q4: ['A comida está gostosa.', 'a ko-mee-da es-ta gos-toh-za', 'the|food|is|tasty', '"gostosa" = tasty.']
        },
        build: {
            i4: ['ler', ['leia', 'lê'], 'lehr', 'To read is "ler".'],
            i5: ['Eu escrevo uma carta.', ['Escrevo uma carta.'], 'eh-oo es-kreh-voo oo-ma kar-ta', '"escrevo" = I write, "uma carta" = a letter.'],
            i6: ['Esta lição é fácil.', ['Essa lição é fácil.'], 'es-ta lee-sahng eh fa-seel', '"lição" = lesson, "fácil" = easy.'],
            q1: ['Este é o meu livro.', ['Esse é o meu livro.', 'Este é meu livro.'], 'es-chee eh oo meh-oo lee-vroo', '"livro" = book.'],
            q2: ['O meu amigo é professor.', ['Meu amigo é professor.', 'A minha amiga é professora.', 'Minha amiga é professora.'], 'oo meh-oo a-mee-goo eh pro-feh-sor', '"amigo" = friend, "professor" = teacher; Portuguese drops "a" before a job.'],
            q3: ['Eu acordo cedo.', ['Acordo cedo.', 'Eu me levanto cedo.'], 'eh-oo a-kor-doo seh-doo', '"acordo" = I wake up, "cedo" = early.'],
            q4: ['Ela lê todos os dias.', ['Ela lê todo dia.'], 'eh-la leh toh-doos oos dee-as', '"lê" = reads, "todos os dias" = every day.']
        }
    },
    zh: {
        read: {
            i1: ['妈妈', 'māma', 'mother', '妈妈 means mother (mum); 母亲 is the formal word.'],
            i3: ['我的家庭很大。', 'wǒ de jiātíng hěn dà', "I|'s (of)|family|very|big", '家庭 = family, 很大 = (is) big; 很 joins the two, like "is".'],
            i4: ['食物', 'shíwù', 'food', '食物 means food.'],
            i5: ['我很高兴。', 'wǒ hěn gāoxìng', 'I|very|happy', '高兴 = happy; 很 does the work of "am".'],
            i6: ['大象很大。', 'dàxiàng hěn dà', 'elephant|very|big', '大象 = elephant, 大 = big.'],
            q2: ['这是我爸爸。', 'zhè shì wǒ bàba', 'this|is|I (my)|father', '爸爸 = father, dad.'],
            q3: ['老鼠很小。', 'lǎoshǔ hěn xiǎo', 'mouse|very|small', '老鼠 = mouse, 小 = small.'],
            q4: ['食物很好吃。', 'shíwù hěn hǎochī', 'food|very|tasty', '好吃 = tasty.']
        },
        build: {
            i4: ['读', ['阅读', '看书', 'du'], 'dú', '读 = read (阅读 is "reading"; 看书 = read a book).', ['读']],
            i5: ['我写信。', ['我写一封信。', 'wo xie xin'], 'wǒ xiě xìn', '写 = write, 信 = letter; the verb comes before the thing, as in English.', ['我', '写', '信']],
            i6: ['这课很容易。', ['这一课很容易。', '这节课很简单。', 'zhe ke hen rongyi'], 'zhè kè hěn róngyì', '课 = lesson, 容易 = easy; 很 does the work of "is".', ['这', '课', '很', '容易']],
            q1: ['这是我的书。', ['这本书是我的。', 'zhe shi wo de shu'], 'zhè shì wǒ-de shū', '书 = book, 我的 = my.', ['这', '是', '我的', '书']],
            q2: ['我的朋友是老师。', ['我朋友是老师。', 'wo de pengyou shi laoshi'], 'wǒ-de péngyou shì lǎoshī', '朋友 = friend, 老师 = teacher.', ['我的', '朋友', '是', '老师']],
            q3: ['我起得很早。', ['我很早起床。', '我早起。', 'wo qi de hen zao'], 'wǒ qǐ-de hěn zǎo', '起 = get up, 早 = early.', ['我', '起得', '很', '早']],
            q4: ['她每天读书。', ['她每天看书。', 'ta meitian dushu'], 'tā měitiān dúshū', '每天 = every day, 读书 = reads (books).', ['她', '每天', '读书']]
        }
    },
    ja: {
        read: {
            i1: ['母', 'haha', 'mother', '母 (haha) means mother; お母さん is the polite way to say it.'],
            i3: ['私の家族は大きいです。', 'watashi no kazoku wa ookii desu', "I|'s (of)|family|(topic marker)|big|is", '家族 = family, 大きい = big; です makes it polite.'],
            i4: ['食べ物', 'tabemono', 'food', '食べ物 means food.'],
            i5: ['私はうれしいです。', 'watashi wa ureshii desu', 'I|(topic marker)|happy|is', 'うれしい = happy, glad.'],
            i6: ['象は大きいです。', 'zou wa ookii desu', 'elephant|(topic marker)|big|is', '象 = elephant, 大きい = big.'],
            q2: ['こちらは私の父です。', 'kochira wa watashi no chichi desu', "this (person)|(topic marker)|I|'s (of)|father|is", 'こちら is a polite "this (person)"; 父 = (my) father.'],
            q3: ['ねずみは小さいです。', 'nezumi wa chiisai desu', 'mouse|(topic marker)|small|is', 'ねずみ = mouse, 小さい = small.'],
            q4: ['食べ物はおいしいです。', 'tabemono wa oishii desu', 'food|(topic marker)|tasty|is', 'おいしい = tasty, delicious.']
        },
        build: {
            i4: ['読む', ['よむ', '読みます', 'よみます'], 'yomu', 'To read is 読む (politely 読みます).', ['読む']],
            i5: ['私は手紙を書きます。', ['わたしはてがみをかきます。', '手紙を書きます。', '私は手紙を書く。'], 'watashi-wa tegami-o kakimasu', '手紙 = letter, 書きます = (I) write; the verb goes last.', ['私は', '手紙を', '書きます']],
            i6: ['この課は簡単です。', ['このかはかんたんです。', 'このレッスンは簡単です。', 'この課はやさしいです。'], 'kono ka-wa kantan-desu', '課 = lesson, 簡単 (or やさしい) = easy.', ['この', '課は', '簡単です']],
            q1: ['これは私の本です。', ['これはわたしのほんです。'], 'kore-wa watashi-no hon-desu', '本 = book, 私の = my.', ['これは', '私の', '本です']],
            q2: ['私の友達は先生です。', ['わたしのともだちはせんせいです。', '友達は先生です。'], 'watashi-no tomodachi-wa sensei-desu', '友達 = friend, 先生 = teacher.', ['私の', '友達は', '先生です']],
            q3: ['私は早く起きます。', ['わたしははやくおきます。', '早く起きます。', '私は早起きです。'], 'watashi-wa hayaku okimasu', '早く = early, 起きます = (I) get up.', ['私は', '早く', '起きます']],
            q4: ['彼女は毎日読みます。', ['かのじょはまいにちよみます。', '彼女は毎日本を読みます。'], 'kanojo-wa mainichi yomimasu', '毎日 = every day, 読みます = reads.', ['彼女は', '毎日', '読みます']]
        }
    },
    ko: {
        read: {
            i1: ['어머니', 'eomeoni', 'mother', '어머니 means mother (엄마 is mum).'],
            i3: ['우리 가족은 커요.', 'uri gajogeun keoyo', 'our|family (topic)|big (it is)', 'Korean says "our family": 우리 가족; 커요 = is big.'],
            i4: ['음식', 'eumsik', 'food', '음식 means food.'],
            i5: ['저는 행복해요.', 'jeoneun haengbokhaeyo', 'I (topic)|happy (I am)', '행복해요 = (I) am happy.'],
            i6: ['코끼리는 커요.', 'kokkirineun keoyo', 'elephant (topic)|big (it is)', '코끼리 = elephant, 커요 = is big.'],
            q2: ['이분은 제 아버지예요.', 'ibuneun je abeojiyeyo', 'this person (polite)|my|father (he is)', '이분 is a polite "this person"; 아버지 = father.'],
            q3: ['쥐는 작아요.', 'jwineun jagayo', 'mouse (topic)|small (it is)', '쥐 = mouse, 작아요 = is small.'],
            q4: ['음식이 맛있어요.', 'eumsigi masisseoyo', 'food|tasty (it is)', '맛있어요 = is tasty.']
        },
        build: {
            i4: ['읽다', ['읽어요', '읽어'], 'ikda', 'To read is 읽다 (읽어요 when you say it).'],
            i5: ['저는 편지를 써요.', ['편지를 써요.', '저는 편지를 씁니다.', '나는 편지를 써.'], 'jeoneun pyeonjireul sseoyo', '편지 = letter, 써요 = (I) write; the verb goes last.'],
            i6: ['이 수업은 쉬워요.', ['이 과는 쉬워요.', '이 수업은 쉽습니다.'], 'i sueobeun swiwoyo', '수업 = lesson, 쉬워요 = is easy.'],
            q1: ['이것은 제 책이에요.', ['이건 제 책이에요.', '이것은 제 책입니다.'], 'igeoseun je chaegieyo', '책 = book, 제 = my.'],
            q2: ['제 친구는 선생님이에요.', ['제 친구는 선생님입니다.', '내 친구는 선생님이야.'], 'je chinguneun seonsaengnimieyo', '친구 = friend, 선생님 = teacher.'],
            q3: ['저는 일찍 일어나요.', ['저는 일찍 일어납니다.', '일찍 일어나요.'], 'jeoneun iljjik ireonayo', '일찍 = early, 일어나요 = (I) get up.'],
            q4: ['그녀는 매일 읽어요.', ['그녀는 매일 책을 읽어요.'], 'geunyeoneun maeil ilgeoyo', '매일 = every day, 읽어요 = reads.']
        }
    }
};

/** The ten items of a lesson in their new places: the new ones, those moved (`MOVED`), and the rest as they were. */
const remap = (old, way, fresh) => Object.fromEntries(IDS.map((id) => [id, fresh[id] !== undefined ? fresh[id] : old?.[MOVED[way][id] || id]]).filter(([, v]) => v !== undefined));
const each = (code, way, pick) => Object.fromEntries(Object.entries(LANGS[code]?.[way] || {}).map(([id, row]) => [id, pick(row)]).filter(([, v]) => v != null));

/** A language pack's items with these lessons on topic (languages.js). */
const packItems = (code, items) => {
    if (!LANGS[code]) return items;
    const read = each(code, 'read', ([source, , , explanation]) => ({ source, explanation }));
    const build = each(code, 'build', ([model, accepted, , explanation, tiles]) => ({ model, accepted, ...(tiles ? { tiles } : {}), explanation }));
    return { ...items, [LESSONS.read]: remap(items?.[LESSONS.read], 'read', read), [LESSONS.build]: remap(items?.[LESSONS.build], 'build', build) };
};
/** A language's sounds, and its words' English, with these lessons on topic (content/sounds/index.js). */
const soundLines = (code, lines) => (LANGS[code] ? {
    ...lines,
    [SOUNDS.read]: remap(lines?.[SOUNDS.read], 'read', each(code, 'read', (r) => r[1])),
    [SOUNDS.build]: remap(lines?.[SOUNDS.build], 'build', each(code, 'build', (r) => r[2]))
} : lines);
const soundGlosses = (code, glosses) => (LANGS[code] ? { ...glosses, [SOUNDS.read]: remap(glosses?.[SOUNDS.read], 'read', each(code, 'read', (r) => r[2])) } : glosses);

module.exports = { LANGS, MOVED, packItems, soundLines, soundGlosses };
