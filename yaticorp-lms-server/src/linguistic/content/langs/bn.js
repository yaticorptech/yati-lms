/**
 * Linguistic Ability — Bengali as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */

// Tips shared by the three Bengali → English lessons, and by the three English → Bengali lessons.
const TO_ENGLISH_POINTS = [
    'Bengali puts the verb at the end: "আমি স্কুলে যাই" (I school-to go). English puts it after the subject: "I go to school."',
    'English needs small words Bengali often does not have: a, an, the, is, am, are. "আমার নাম রানি" (my name Rani) becomes "My name is Rani."',
    'Watch the tense: যাই (go), যাব (will go), গেলাম (went), যাচ্ছি (am going). কাল means yesterday or tomorrow; the verb tells you which.',
    'Translate the meaning, not word by word. সে can be "he" or "she" (Bengali verbs do not show gender), so use the context. More than one good answer is often possible.'
];
const TO_BENGALI_POINTS = [
    'Move the verb to the end: "I go to school" → "আমি স্কুলে যাই।" The verb changes with the person (আমি যাই, তুমি যাও, আপনি যান, সে যায়) but not for a boy or a girl.',
    'There are no separate words for a, an or the in Bengali; usually leave them out. (একটা means "one" and is used for "a" only sometimes; -টা or -টি on a noun, as in বইটা, can mean "the".)',
    'Choose the polite form for elders and strangers: আপনি, আসুন, দিন. With friends you may use তুমি, এসো, দাও.',
    'Type in Bengali with your phone\'s Bengali keyboard, or use the Bengali letters under the answer box. End a sentence with the dari (।).'
];

module.exports = {
    code: 'bn', name: 'Bengali', native: 'বাংলা', locale: 'bn-IN',
    words: {
        'vocab-beginner-1': {
            family: 'পরিবার',
            mother: 'মা, মাতা',
            father: 'বাবা, পিতা',
            house: 'বাড়ি, ঘর',
            food: 'খাবার, খাদ্য',
            happy: 'খুশি, আনন্দিত',
            big: 'বড়',
            small: 'ছোট'
        },
        'vocab-beginner-2': {
            book: 'বই',
            teacher: 'শিক্ষক, শিক্ষিকা',
            student: 'ছাত্র, ছাত্রী',
            friend: 'বন্ধু',
            read: 'পড়া',
            write: 'লেখা',
            early: 'তাড়াতাড়ি, আগেভাগে',
            easy: 'সহজ'
        },
        'vocab-intermediate-1': {
            honest: 'সৎ',
            polite: 'ভদ্র, বিনয়ী',
            curious: 'কৌতূহলী',
            confident: 'আত্মবিশ্বাসী',
            patient: 'ধৈর্যশীল',
            grateful: 'কৃতজ্ঞ',
            anxious: 'উদ্বিগ্ন, চিন্তিত',
            generous: 'উদার'
        },
        'vocab-intermediate-2': {
            deadline: 'শেষ তারিখ, সময়সীমা',
            improve: 'উন্নত করা',
            achieve: 'অর্জন করা',
            schedule: 'সময়সূচি',
            opportunity: 'সুযোগ',
            responsible: 'দায়িত্বশীল, দায়িত্বপ্রাপ্ত',
            discuss: 'আলোচনা করা',
            result: 'ফল, ফলাফল'
        },
        'vocab-advanced-1': {
            negotiate: 'দর কষাকষি করা, আলোচনা করা',
            collaborate: 'সহযোগিতা করা, একসঙ্গে কাজ করা',
            efficient: 'দক্ষ',
            feasible: 'সম্ভবপর, বাস্তবসম্মত',
            comprehensive: 'পূর্ণাঙ্গ, সামগ্রিক',
            prioritise: 'অগ্রাধিকার দেওয়া',
            ambiguous: 'অস্পষ্ট, দ্ব্যর্থক',
            persuade: 'রাজি করানো, বোঝানো'
        },
        'vocab-advanced-2': {
            sustainable: 'টেকসই, দীর্ঘস্থায়ী',
            consequence: 'পরিণাম, পরিণতি',
            perspective: 'দৃষ্টিভঙ্গি, দৃষ্টিকোণ',
            inevitable: 'অনিবার্য, অবশ্যম্ভাবী',
            substantial: 'উল্লেখযোগ্য, যথেষ্ট',
            advocate: 'সমর্থন করা, পক্ষে বলা',
            diverse: 'বৈচিত্র্যময়, বিভিন্ন',
            integrity: 'সততা, নীতিনিষ্ঠা'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Bengali has no separate words for a, an or the (একটা means "one"; -টা or -টি, as in বইটা, often does the job of "the"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Bengali the verb comes last: "রবি বই পড়ে।" In English the verb comes right after the subject.' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Bengali word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Bengali.',
            points: [...TO_BENGALI_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Bengali verb ending to choose the English tense.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Bengali. Use the polite form for requests: দিন, বলুন, করুন.',
            points: [...TO_BENGALI_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Bengali. Passive forms such as করা হবে (will be done) and করা হয়েছে (has been done) are common in notices.',
            points: [...TO_BENGALI_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'জল', explanation: 'জল means water (in Bangladesh it is পানি).' },
            i2: { source: 'বই', explanation: 'বই means book.' },
            i3: { source: 'আমার নাম রানি।', explanation: 'আমার = my, নাম = name. Bengali needs no word for "is" here; English adds it before the name.' },
            i4: { source: 'আপনি কেমন আছেন?', explanation: 'This is the common polite greeting: কেমন = how, আছেন = are (polite). English puts "are" right after "How".' },
            i5: { source: 'আমি ভালো আছি।', explanation: 'ভালো = well or fine, আছি = am. In English "am" comes right after "I".' },
            i6: { source: 'এটা আমার বাড়ি।', explanation: 'এটা = this, বাড়ি = house or home. Bengali needs no "is" here; English does.' },
            q1: { source: 'আমি স্কুলে যাই।', explanation: 'স্কুলে = to school, যাই = (I) go. The verb moves to after "I".' },
            q2: { source: 'সে আমার ছোট বোন।', explanation: 'ছোট বোন is a younger sister (বড় বোন or দিদি is an elder sister). সে can be "he" or "she"; here it is "she". English adds "is".' },
            q3: { source: 'দয়া করে দরজাটা বন্ধ করুন।', explanation: 'দয়া করে = please, দরজা = door, বন্ধ করুন = close (polite). -টা in দরজাটা works like "the".' },
            q4: { source: 'ধন্যবাদ।', explanation: 'ধন্যবাদ is the polite way to say thank you.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'বন্ধু', accepted: ['বান্ধবী', 'মিত্র'], explanation: 'Friend is বন্ধু. A female friend can also be called বান্ধবী; মিত্র is a formal word.' },
            i2: { model: 'স্কুল', accepted: ['বিদ্যালয়'], explanation: 'School is স্কুল; the formal Bengali word is বিদ্যালয়.' },
            i3: { model: 'সুপ্রভাত।', accepted: ['শুভ সকাল।'], explanation: 'সুপ্রভাত is "good morning"; শুভ সকাল is also heard. নমস্কার is a greeting for any time of day.' },
            i4: { model: 'আমি ছাত্র।', accepted: ['আমি ছাত্রী।', 'আমি একজন ছাত্র।', 'আমি একজন ছাত্রী।', 'আমি শিক্ষার্থী।'], explanation: 'Bengali needs no word for "am" here, and no word for "a" (একজন is optional). A girl says ছাত্রী.' },
            i5: { model: 'আপনার নাম কী?', accepted: ['তোমার নাম কী?', 'আপনার নাম কি?', 'তোমার নাম কি?'], explanation: 'আপনার is polite; with a friend you can say তোমার. কী = what, and Bengali needs no "is" here.' },
            i6: { model: 'খাবারটা সুস্বাদু।', accepted: ['খাবার সুস্বাদু।', 'খাবারটা সুস্বাদু হয়েছে।', 'খাবারটা খেতে ভালো।'], explanation: 'স্বাদ = taste; সুস্বাদু = tasty. -টা in খাবারটা works like "the", and Bengali needs no word for "is".' },
            q1: { model: 'বাস স্ট্যান্ড কোথায়?', accepted: ['বাসস্ট্যান্ড কোথায়?', 'বাস স্ট্যান্ডটা কোথায়?'], explanation: 'কোথায় = where. Bengali needs no word for "is" here: বাস স্ট্যান্ড কোথায়? = where (is the) bus stand?' },
            q2: { model: 'আমার আম ভালো লাগে।', accepted: ['আমি আম ভালোবাসি।', 'আমার আম খেতে ভালো লাগে।', 'আমি আম পছন্দ করি।'], explanation: 'Bengali often says "to me, mangoes feel good": আমার … ভালো লাগে. আমি আম পছন্দ করি (I like mangoes) is also correct.' },
            q3: { model: 'এখানে আসুন।', accepted: ['এখানে এসো।', 'এদিকে আসুন।', 'এদিকে এসো।'], explanation: 'আসুন is polite; এসো is used with friends and children.' },
            q4: { model: 'বৃষ্টি হচ্ছে।', accepted: ['বৃষ্টি পড়ছে।'], explanation: 'Bengali says "rain is happening": বৃষ্টি হচ্ছে. -চ্ছে shows that it is going on now, and Bengali needs no word for "it".' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'আমি কাল একটা সিনেমা দেখলাম।', explanation: 'দেখলাম is past tense: watched (or saw). কাল means yesterday or tomorrow; the past tense tells you it is yesterday.' },
            i2: { source: 'সে রোজ সকালে দৌড়ায়।', explanation: 'A habit takes the simple present: দৌড়ায় = runs. সে can be "he" or "she" (Bengali verbs do not show gender); here it is "he", and "she" is right too.', alsoAccept: ['She runs every morning.', 'She goes running every morning.', 'Every morning she runs.'] },
            i3: { source: 'আমরা কাল মাইসুরু যাব।', explanation: 'যাব is the future: will go. So কাল here means tomorrow. English adds "to" before Mysuru.' },
            i4: { source: 'সে একটা বই পড়ছে।', explanation: 'পড়ছে shows an action happening now: is reading. সে can be "he" or "she"; here it is "she", and "he" is right too.', alsoAccept: ['He is reading a book.'] },
            i5: { source: 'বাচ্চারা মাঠে খেলছে।', explanation: 'মাঠ = ground or field (মাঠে = in the ground); খেলছে = are playing.' },
            i6: { source: 'আপনি কি খেয়েছেন?', explanation: 'A polite question about eating; কি after the subject makes a yes/no question. "Have you eaten?" is just as natural.' },
            q1: { source: 'আমার ইংরেজি বলতে ভালো লাগে।', explanation: 'আমার … ভালো লাগে = I like; বলতে = to speak.' },
            q2: { source: 'তাঁরা দুই বছর ধরে বেঙ্গালুরুতে বসবাস করছেন।', explanation: 'ধরে with a length of time (দুই বছর ধরে = for two years) and an ongoing action (বসবাস করছেন = are living) needs the present perfect continuous. তাঁরা is a respectful "they".' },
            q3: { source: 'ট্রেনটা ঠিক সময়ে এল।', explanation: 'ঠিক সময়ে (or সময়মতো) = on time; এল = came. -টা in ট্রেনটা works like "the".' },
            q4: { source: 'দয়া করে আস্তে বলুন।', explanation: 'আস্তে = slowly; বলুন is the polite form of "speak".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'দয়া করে আমাকে একটু জল দিন।', accepted: ['দয়া করে আমাকে একটু জল দাও।', 'আমাকে একটু জল দিন।', 'দয়া করে একটু জল দিন।', 'দয়া করে আমাকে একটু পানি দিন।'], explanation: 'দিন is the polite form of "give" (দাও with friends); একটু = some, a little.' },
            i2: { model: 'ক্লাস নটায় শুরু হয়।', accepted: ['ক্লাস নয়টায় শুরু হয়।', 'ক্লাস ৯টায় শুরু হয়।', 'ক্লাসটা নটায় শুরু হয়।', 'ক্লাস নটার সময় শুরু হয়।'], explanation: 'নটায় = at nine o\'clock (-টায় after a number means "at … o\'clock"); শুরু হয় = starts.' },
            i3: { model: 'আমি আমার বইটা বাড়িতে ভুলে ফেলে এসেছি।', accepted: ['আমি আমার বইটা বাড়িতে ফেলে এসেছি।', 'আমি বইটা বাড়িতে ভুলে ফেলে এসেছি।', 'আমি আমার বই বাড়িতে ভুলে রেখে এসেছি।', 'আমার বইটা বাড়িতে ফেলে এসেছি।'], explanation: 'ভুলে ফেলে এসেছি = forgot (and left it behind); বাড়িতে = at home. A boy and a girl say it the same way.' },
            i4: { model: 'এটার দাম কত?', accepted: ['এর দাম কত?', 'এটা কত?', 'এটার দাম কত টাকা?'], explanation: 'দাম = price; কত = how much. Bengali needs no verb here: "this\'s price, how much?"' },
            i5: { model: 'আমার পরীক্ষা সামনের সপ্তাহে।', accepted: ['সামনের সপ্তাহে আমার পরীক্ষা।', 'আমার পরীক্ষা আগামী সপ্তাহে।', 'আগামী সপ্তাহে আমার পরীক্ষা।', 'আমার পরীক্ষা পরের সপ্তাহে।'], explanation: 'সামনের সপ্তাহে (or আগামী সপ্তাহে) = next week. Bengali needs no word for "is" here.' },
            i6: { model: 'আপনি কি আমাকে সাহায্য করতে পারবেন?', accepted: ['আপনি আমাকে সাহায্য করতে পারবেন?', 'তুমি কি আমাকে সাহায্য করতে পারবে?', 'আপনি কি আমাকে একটু সাহায্য করতে পারবেন?', 'আপনি কি আমায় সাহায্য করতে পারেন?'], explanation: 'সাহায্য করা = to help; করতে পারবেন = can (you) do, polite. কি makes it a yes/no question.' },
            q1: { model: 'আমরা লাইব্রেরিতে যাচ্ছি।', accepted: ['আমরা গ্রন্থাগারে যাচ্ছি।', 'আমরা লাইব্রেরি যাচ্ছি।'], explanation: 'লাইব্রেরি (formal: গ্রন্থাগার) = library; -তে or -এ = to; যাচ্ছি = are going.' },
            q2: { model: 'সে খুব ভালো কন্নড় বলে।', accepted: ['সে কন্নড় খুব ভালো বলে।', 'উনি খুব ভালো কন্নড় বলেন।', 'ও খুব ভালো কন্নড় বলে।', 'সে খুব ভালোভাবে কন্নড় বলে।'], explanation: 'খুব ভালো = very well; বলে = speaks. সে can be "he" or "she"; উনি (with বলেন) is the respectful form.' },
            q3: { model: 'জল নষ্ট করবেন না।', accepted: ['জল অপচয় করবেন না।', 'জলের অপচয় করবেন না।', 'জল নষ্ট কোরো না।', 'জল নষ্ট করো না।'], explanation: 'করবেন না = do not (polite, as on notices); with friends, কোরো না. Bengali puts না after the verb. নষ্ট করা = to waste.' },
            q4: { model: 'দোকান দশটায় খোলে।', accepted: ['দোকানটা দশটায় খোলে।', 'দোকান ১০টায় খোলে।'], explanation: 'দশটায় = at ten (o\'clock); খোলে = opens.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'সভাটি সোমবার পর্যন্ত স্থগিত করা হয়েছে।', explanation: 'করা হয়েছে is passive: "has been …". স্থগিত করা = postpone; পর্যন্ত = till.' },
            i2: { source: 'দয়া করে শুক্রবারের মধ্যে রিপোর্টটি পাঠিয়ে দিন।', explanation: 'মধ্যে with a day (শুক্রবারের মধ্যে) means "by" (not later than).' },
            i3: { source: 'দেরিতে উত্তর দেওয়ার জন্য দুঃখিত।', explanation: 'A common line in emails. দুঃখিত = sorry; দেরিতে = late; জন্য = for.' },
            i4: { source: 'আমাদের দল সময়মতো প্রকল্পটি সম্পন্ন করেছে।', explanation: 'সম্পন্ন করেছে = completed; প্রকল্প = project; সময়মতো = on time.' },
            i5: { source: 'আমি গত বছর আমার ডিগ্রি শেষ করেছি। এখন আমি একটি সফটওয়্যার কোম্পানিতে চাকরি খুঁজছি। নতুন জিনিস শেখার ব্যাপারে আমার খুব আগ্রহ আছে।', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'আপনার সহযোগিতার জন্য ধন্যবাদ।', explanation: 'সহযোগিতা = cooperation; জন্য = for.' },
            q1: { source: 'এই সমস্যার যত তাড়াতাড়ি সম্ভব সমাধান করা হবে।', explanation: 'করা হবে is the future passive: "will be …". যত তাড়াতাড়ি সম্ভব = as soon as possible; সমাধান = solution.' },
            q2: { source: 'আমি এই পদের জন্য আবেদন করতে চাই।', explanation: 'পদ = post or position; আবেদন করা = apply. চাই (I want) is said politely as "I would like".' },
            q3: { source: 'তিনি সভায় একটি ভালো পরামর্শ দিলেন।', explanation: 'তিনি is a respectful "he" or "she" (Bengali does not show gender); পরামর্শ = suggestion or advice; দিলেন = gave.' },
            q4: { source: 'গ্রাহকদের সন্তুষ্টিই আমাদের প্রথম অগ্রাধিকার।', explanation: 'সন্তুষ্টি = satisfaction; অগ্রাধিকার = priority. -ই adds emphasis.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'কোম্পানিটি একটি নতুন নীতি ঘোষণা করেছে।', accepted: ['কোম্পানি একটি নতুন নীতি ঘোষণা করেছে।', 'কোম্পানিটি নতুন নীতি ঘোষণা করেছে।', 'সংস্থাটি একটি নতুন নীতি ঘোষণা করেছে।'], explanation: 'নীতি = policy; ঘোষণা করেছে = has announced. -টি in কোম্পানিটি works like "the", and একটি like "a".' },
            i2: { model: 'শিক্ষাই সাফল্যের চাবিকাঠি।', accepted: ['শিক্ষা সাফল্যের চাবিকাঠি।', 'শিক্ষাই সাফল্যের চাবি।', 'শিক্ষা সাফল্যের চাবি।'], explanation: 'সাফল্য = success; চাবিকাঠি (or চাবি) = key. "The key to success" becomes সাফল্যের চাবিকাঠি ("success\'s key"), and Bengali needs no "is".' },
            i3: { model: 'কোনো পরিবর্তন হলে দয়া করে আমাকে জানাবেন।', accepted: ['কোনো পরিবর্তন হলে আমাকে জানাবেন।', 'যদি কোনো পরিবর্তন হয়, দয়া করে আমাকে জানান।', 'কোনো পরিবর্তন থাকলে দয়া করে আমাকে জানাবেন।', 'কোনও পরিবর্তন হলে দয়া করে আমাকে জানাবেন।'], explanation: 'In Bengali the "if" part comes first: পরিবর্তন হলে = if there is a change (or যদি … হয়). জানাবেন is a polite "please let (me) know".' },
            i4: { model: 'আমাদের পরিবেশ রক্ষা করা উচিত।', accepted: ['আমাদের উচিত পরিবেশ রক্ষা করা।', 'আমাদের পরিবেশকে রক্ষা করা উচিত।', 'আমাদের পরিবেশ সংরক্ষণ করা উচিত।'], explanation: 'উচিত = should. Bengali starts with আমাদের ("for us"): আমাদের … করা উচিত = we should do ….' },
            i5: { model: 'আমাদের কলেজ গত সপ্তাহে একটি রক্তদান শিবিরের আয়োজন করেছিল। অনেক ছাত্রছাত্রী ও শিক্ষক এতে অংশ নিয়েছিলেন। চিকিৎসকেরা সবাইকে তাঁদের সহযোগিতার জন্য ধন্যবাদ জানালেন।', accepted: [], explanation: 'রক্তদান শিবির = blood donation camp; অংশ নেওয়া = take part. Compare your sentences with the model.' },
            i6: { model: 'আমি দুই দিনের ছুটির অনুরোধ জানাতে লিখছি।', accepted: ['দুই দিনের ছুটির অনুরোধ জানাতে আমি লিখছি।', 'আমি দুদিনের ছুটির অনুরোধ জানাতে লিখছি।', 'আমি দুই দিনের ছুটি চেয়ে লিখছি।', 'দুই দিনের ছুটির জন্য আবেদন জানাতে আমি এই চিঠি লিখছি।'], explanation: 'ছুটি = leave; অনুরোধ জানানো = to request; লিখছি = am writing. A man and a woman write it the same way.' },
            q1: { model: 'কঠোর পরিশ্রমের ফল সবসময় পাওয়া যায়।', accepted: ['পরিশ্রমের ফল সবসময় পাওয়া যায়।', 'পরিশ্রমের ফল সবসময় মেলে।', 'কঠোর পরিশ্রম সবসময় সুফল দেয়।', 'কঠোর পরিশ্রম কখনো বৃথা যায় না।'], explanation: '"Pays off" means "gives a result": ফল পাওয়া যায়. পরিশ্রম কখনো বৃথা যায় না ("hard work never goes to waste") is another common way to say it.' },
            q2: { model: 'ফলাফল আগামীকাল ঘোষণা করা হবে।', accepted: ['আগামীকাল ফলাফল ঘোষণা করা হবে।', 'ফল কাল ঘোষণা করা হবে।', 'ফলাফল কাল প্রকাশিত হবে।', 'আগামীকাল ফল প্রকাশ করা হবে।'], explanation: '"Will be announced" is the future passive: ঘোষণা করা হবে. আগামীকাল is a clear "tomorrow" (কাল alone can also mean yesterday).' },
            q3: { model: 'আপনার দ্রুত উত্তরের জন্য ধন্যবাদ।', accepted: ['আপনার দ্রুত প্রতিক্রিয়ার জন্য ধন্যবাদ।', 'আপনার দ্রুত জবাবের জন্য ধন্যবাদ।', 'তাড়াতাড়ি উত্তর দেওয়ার জন্য ধন্যবাদ।', 'দ্রুত উত্তর দেওয়ার জন্য আপনাকে ধন্যবাদ।'], explanation: 'দ্রুত = quick; উত্তর (or প্রতিক্রিয়া) = response; -এর জন্য = for.' },
            q4: { model: 'নিরাপত্তা সকলের দায়িত্ব।', accepted: ['নিরাপত্তা সবার দায়িত্ব।', 'সুরক্ষা সকলের দায়িত্ব।', 'সুরক্ষা সবার দায়িত্ব।'], explanation: 'নিরাপত্তা = safety; সকলের (or সবার) = everyone\'s; দায়িত্ব = responsibility. Bengali needs no "is" here.' }
        }
    },
    placement: {
        b4: { prompt: '"বই" in English is…', explanation: 'বই means book.' },
        a5: { prompt: '"সভাটি স্থগিত করা হয়েছে" best translates as…', explanation: 'স্থগিত করা means postpone, and করা হয়েছে is passive: "has been".' }
    }
};
