/**
 * Linguistic Ability — Urdu as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 *
 * Urdu is written right to left; the strings are in normal (logical) order and
 * the page sets the direction. No vowel marks. Sentences end with ۔ or ؟.
 */

// Tips shared by the three Urdu → English lessons, and by the three English → Urdu lessons.
const TO_ENGLISH_POINTS = [
    'Urdu puts the verb at the end: "میں اسکول جاتا ہوں" (I school go). English puts it after the subject: "I go to school."',
    'English needs a, an and the, which Urdu does not have. Urdu does have ہے (is), ہوں (am) and ہیں (are), but at the end of the sentence; in English they come right after the subject.',
    'Watch the tense: جاتا ہوں (go), جاؤں گا (will go), گیا (went), جا رہا ہوں (am going). کل means yesterday or tomorrow; the verb tells you which.',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const TO_URDU_POINTS = [
    'Move the verb to the end: "I go to school" → "میں اسکول جاتا ہوں۔" A girl or woman says "میں اسکول جاتی ہوں۔"',
    'There are no words for a, an or the in Urdu; leave them out. (ایک means "one"; it is used for "a" only sometimes.)',
    'Choose the polite form for elders and strangers: آپ (you), آئیے (come), دیجیے (give). With friends you may use تم (you), آؤ (come), دو (give).',
    'Type in Urdu with your phone\'s Urdu keyboard, or use the Urdu letters under the answer box. End a sentence with the Urdu full stop (۔) and a question with ؟.'
];

module.exports = {
    code: 'ur', name: 'Urdu', native: 'اردو', locale: 'ur-IN',
    words: {
        'vocab-beginner-1': {
            family: 'خاندان، گھرانہ',
            mother: 'ماں، والدہ',
            father: 'باپ، والد',
            house: 'گھر، مکان',
            food: 'کھانا، غذا',
            happy: 'خوش',
            big: 'بڑا',
            small: 'چھوٹا'
        },
        'vocab-beginner-2': {
            book: 'کتاب',
            teacher: 'استاد، استانی',
            student: 'طالب علم، شاگرد',
            friend: 'دوست',
            read: 'پڑھنا',
            write: 'لکھنا',
            early: 'جلدی',
            easy: 'آسان'
        },
        'vocab-intermediate-1': {
            honest: 'ایماندار، دیانت دار',
            polite: 'شائستہ، مہذب',
            curious: 'متجسس',
            confident: 'پراعتماد',
            patient: 'صابر، بردبار',
            grateful: 'شکر گزار، ممنون',
            anxious: 'فکرمند، پریشان',
            generous: 'سخی، فیاض'
        },
        'vocab-intermediate-2': {
            deadline: 'آخری تاریخ، مقررہ وقت',
            improve: 'بہتر بنانا، سدھارنا',
            achieve: 'حاصل کرنا',
            schedule: 'نظام الاوقات، شیڈول',
            opportunity: 'موقع',
            responsible: 'ذمہ دار',
            discuss: 'بات چیت کرنا، تبادلہ خیال کرنا',
            result: 'نتیجہ'
        },
        'vocab-advanced-1': {
            negotiate: 'مذاکرات کرنا، مول تول کرنا',
            collaborate: 'تعاون کرنا، ساتھ کام کرنا',
            efficient: 'مستعد، کارآمد',
            feasible: 'قابل عمل، ممکن',
            comprehensive: 'جامع، مفصل',
            prioritise: 'ترجیح دینا',
            ambiguous: 'مبہم، غیر واضح',
            persuade: 'قائل کرنا، منانا'
        },
        'vocab-advanced-2': {
            sustainable: 'پائیدار',
            consequence: 'نتیجہ، انجام',
            perspective: 'نقطہ نظر، زاویہ نظر',
            inevitable: 'ناگزیر',
            substantial: 'نمایاں، خاطر خواہ',
            advocate: 'حمایت کرنا، وکالت کرنا',
            diverse: 'متنوع، رنگا رنگ',
            integrity: 'دیانت داری، راست بازی'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Urdu has no words for a, an or the (ایک means "one"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Urdu the verb comes last: "روی کتابیں پڑھتا ہے۔" In English the verb comes right after the subject.' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Urdu word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Urdu.',
            points: [...TO_URDU_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Urdu verb ending to choose the English tense.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Urdu. Use the polite form for requests: دیجیے (give), بولیے (speak), کیجیے (do).',
            points: [...TO_URDU_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Urdu. Passive forms such as کیا جائے گا (will be done) and کیا گیا ہے (has been done) are common in notices.',
            points: [...TO_URDU_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'پانی', explanation: 'پانی means water.' },
            i2: { source: 'کتاب', explanation: 'کتاب means book.' },
            i3: { source: 'میرا نام رانی ہے۔', explanation: 'میرا = my, نام = name, ہے = is. In English "is" comes before the name, not at the end.' },
            i4: { source: 'آپ کیسے ہیں؟', explanation: 'This is the common polite greeting: کیسے = how, ہیں = are (a woman is asked آپ کیسی ہیں؟). English puts "are" right after "How".' },
            i5: { source: 'میں ٹھیک ہوں۔', explanation: 'ٹھیک = fine or well, ہوں = am. In English "am" comes right after "I".' },
            i6: { source: 'یہ میرا گھر ہے۔', explanation: 'یہ = this, گھر = house or home. The verb ہے (is) moves to after "This".' },
            q1: { source: 'میں اسکول جاتا ہوں۔', explanation: 'جاتا ہوں means "I go" (a girl says جاتی ہوں). The verb moves to after "I", and English adds "to" before school.' },
            q2: { source: 'وہ میری چھوٹی بہن ہے۔', explanation: 'چھوٹی بہن is a younger sister (بڑی بہن is an elder sister). وہ can be "he" or "she"; here it is "she".' },
            q3: { source: 'براہ کرم دروازہ بند کیجیے۔', explanation: 'براہ کرم = please, دروازہ = door, بند کیجیے = close (polite).' },
            q4: { source: 'شکریہ۔', explanation: 'شکریہ is the usual way to say thank you; بہت شکریہ means "thank you very much".' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'دوست', accepted: ['سہیلی', 'یار'], explanation: 'Friend is دوست. A girl\'s female friend is also called سہیلی; یار is an informal word for a close friend.' },
            i2: { model: 'اسکول', accepted: ['سکول', 'مدرسہ'], explanation: 'School is اسکول (also written سکول). مدرسہ also means school, though today it often means a religious school.' },
            i3: { model: 'صبح بخیر۔', accepted: [], explanation: 'صبح = morning, بخیر = well: صبح بخیر is "good morning". السلام علیکم is a greeting for any time of day, not only the morning.' },
            i4: { model: 'میں طالب علم ہوں۔', accepted: ['میں طالبہ ہوں۔', 'میں ایک طالب علم ہوں۔', 'میں شاگرد ہوں۔', 'میں ایک طالبہ ہوں۔'], explanation: 'ہوں = am, and it comes at the end. Urdu needs no word for "a" (ایک is optional). A girl may say طالبہ.' },
            i5: { model: 'آپ کا نام کیا ہے؟', accepted: ['تمہارا نام کیا ہے؟', 'تمھارا نام کیا ہے؟', 'آپ کا کیا نام ہے؟', 'تمہارا کیا نام ہے؟'], explanation: 'آپ کا is polite; with a friend you can say تمہارا. کیا = what.' },
            i6: { model: 'کھانا مزیدار ہے۔', accepted: ['کھانا لذیذ ہے۔', 'کھانا مزے دار ہے۔', 'کھانا ذائقہ دار ہے۔'], explanation: 'مزیدار (or لذیذ) = tasty. "Is" (ہے) comes at the end.' },
            q1: { model: 'بس اسٹینڈ کہاں ہے؟', accepted: ['بس اڈا کہاں ہے؟', 'بس اڈہ کہاں ہے؟', 'بس سٹینڈ کہاں ہے؟'], explanation: 'کہاں = where; کہاں ہے = where is (it). بس اڈا is another common word for bus stand.' },
            q2: { model: 'مجھے آم پسند ہیں۔', accepted: ['مجھے آم پسند ہے۔', 'مجھے آم اچھے لگتے ہیں۔'], explanation: 'Urdu says "to me, mangoes are liked": مجھے … پسند ہیں.' },
            q3: { model: 'یہاں آئیے۔', accepted: ['یہاں آؤ۔', 'ادھر آئیے۔', 'ادھر آؤ۔'], explanation: 'آئیے is polite; آؤ is used with friends and children.' },
            q4: { model: 'بارش ہو رہی ہے۔', accepted: ['بارش برس رہی ہے۔', 'پانی برس رہا ہے۔'], explanation: 'Urdu says "rain is happening": بارش ہو رہی ہے. رہی ہے shows that it is going on now.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'میں نے کل فلم دیکھی۔', explanation: 'دیکھی is past tense: watched (or saw). کل means yesterday or tomorrow; the past tense tells you it is yesterday.' },
            i2: { source: 'وہ ہر صبح دوڑتا ہے۔', explanation: 'A habit takes the simple present: دوڑتا ہے = runs. دوڑتا shows the runner is male, so وہ is "he".' },
            i3: { source: 'ہم کل میسور جائیں گے۔', explanation: 'جائیں گے is the future: will go. So کل here means tomorrow.' },
            i4: { source: 'وہ کتاب پڑھ رہی ہے۔', explanation: 'پڑھ رہی ہے shows an action happening now: is reading. رہی shows the reader is female, so وہ is "she".' },
            i5: { source: 'بچے میدان میں کھیل رہے ہیں۔', explanation: 'میدان = ground or field; کھیل رہے ہیں = are playing.' },
            i6: { source: 'کیا آپ نے کھانا کھا لیا؟', explanation: 'A polite question about eating; کیا at the start makes a yes/no question. "Have you eaten?" is just as natural.' },
            q1: { source: 'مجھے انگریزی بولنا پسند ہے۔', explanation: 'مجھے … پسند ہے = I like; بولنا = to speak.' },
            q2: { source: 'وہ دو سال سے بنگلورو میں رہ رہے ہیں۔', explanation: 'سے with a length of time (دو سال سے) and an ongoing action (رہ رہے ہیں) needs the present perfect continuous. وہ with رہے ہیں can be "they" or a respectful "he".' },
            q3: { source: 'ٹرین وقت پر آئی۔', explanation: 'وقت پر = on time; آئی = came (ٹرین is feminine in Urdu, so آئی, not آیا).' },
            q4: { source: 'براہ کرم آہستہ بولیے۔', explanation: 'آہستہ = slowly; بولیے is the polite form of "speak".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'براہ کرم مجھے تھوڑا پانی دیجیے۔', accepted: ['براہ کرم مجھے تھوڑا پانی دو۔', 'براہ کرم مجھے تھوڑا پانی دیں۔', 'مجھے تھوڑا پانی دیجیے۔', 'براہ کرم مجھے تھوڑا سا پانی دیجیے۔'], explanation: 'دیجیے is the polite form of "give" (دو with friends); تھوڑا = some, a little.' },
            i2: { model: 'کلاس نو بجے شروع ہوتی ہے۔', accepted: ['جماعت نو بجے شروع ہوتی ہے۔', 'کلاس 9 بجے شروع ہوتی ہے۔'], explanation: 'نو بجے = at nine o\'clock; شروع ہوتی ہے = starts (ہوتی, because کلاس is feminine).' },
            i3: { model: 'میں اپنی کتاب گھر پر بھول گیا۔', accepted: ['میں اپنی کتاب گھر پر بھول گئی۔', 'میں اپنی کتاب گھر میں بھول گیا۔', 'میں اپنی کتاب گھر میں بھول گئی۔', 'میں اپنی کتاب گھر بھول آیا۔'], explanation: 'بھول گیا = forgot (a girl says بھول گئی). For your own thing Urdu says اپنی, not میری: اپنی کتاب = my book.' },
            i4: { model: 'اس کی قیمت کتنی ہے؟', accepted: ['یہ کتنے کا ہے؟', 'اس کی قیمت کیا ہے؟', 'یہ کتنے کی ہے؟'], explanation: 'قیمت = price; کتنی = how much (کتنا or کتنی, to match the noun).' },
            i5: { model: 'میرا امتحان اگلے ہفتے ہے۔', accepted: ['اگلے ہفتے میرا امتحان ہے۔', 'میرا امتحان آئندہ ہفتے ہے۔', 'آئندہ ہفتے میرا امتحان ہے۔'], explanation: 'اگلے ہفتے (or آئندہ ہفتے) = next week. امتحان is masculine, so میرا, not میری.' },
            i6: { model: 'کیا آپ میری مدد کر سکتے ہیں؟', accepted: ['کیا تم میری مدد کر سکتے ہو؟', 'آپ میری مدد کر سکتے ہیں؟', 'کیا آپ میری مدد کر سکتی ہیں؟', 'کیا تم میری مدد کر سکتی ہو؟'], explanation: 'مدد کرنا = to help; کر سکتے ہیں = can (you) do? Urdu says "do my help": میری مدد.' },
            q1: { model: 'ہم لائبریری جا رہے ہیں۔', accepted: ['ہم کتب خانے جا رہے ہیں۔', 'ہم لائبریری جا رہی ہیں۔'], explanation: 'لائبریری (or کتب خانہ) = library; جا رہے ہیں = are going. Urdu needs no word for "to" here.' },
            q2: { model: 'وہ کنڑ بہت اچھی طرح بولتی ہے۔', accepted: ['وہ بہت اچھی کنڑ بولتی ہے۔', 'وہ کنڑ بہت اچھے سے بولتی ہے۔', 'وہ کنڑ بہت اچھی طرح بولتی ہیں۔'], explanation: 'بہت اچھی طرح = very well; بولتی ہے = speaks (بولتی, because "she" is the subject).' },
            q3: { model: 'پانی ضائع نہ کریں۔', accepted: ['پانی ضائع مت کیجیے۔', 'پانی ضائع نہ کیجیے۔', 'پانی ضائع مت کرو۔', 'پانی ضائع نہ کرو۔'], explanation: 'نہ کریں = do not (polite, as on notices); with friends, مت کرو. ضائع کرنا = to waste.' },
            q4: { model: 'دکان دس بجے کھلتی ہے۔', accepted: ['دکان 10 بجے کھلتی ہے۔'], explanation: 'کھلتی ہے = opens (کھلتی, because دکان is feminine); دس بجے = at ten o\'clock.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'اجلاس پیر تک ملتوی کر دیا گیا ہے۔', explanation: 'کر دیا گیا ہے is passive: "has been …". ملتوی کرنا = postpone; اجلاس = meeting.' },
            i2: { source: 'براہ کرم رپورٹ جمعہ تک بھیج دیں۔', explanation: 'تک with a day means "by" (not later than).' },
            i3: { source: 'تاخیر سے جواب دینے پر معذرت۔', explanation: 'A common line in emails. معذرت = sorry, an apology; تاخیر سے = late.' },
            i4: { source: 'ہماری ٹیم نے منصوبہ وقت پر مکمل کیا۔', explanation: 'مکمل کیا = completed; منصوبہ = project.' },
            i5: { source: 'میں نے پچھلے سال اپنی ڈگری مکمل کی۔ اب میں ایک سافٹ ویئر کمپنی میں نوکری تلاش کر رہا ہوں۔ مجھے نئی چیزیں سیکھنے میں بہت دلچسپی ہے۔', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'آپ کے تعاون کا شکریہ۔', explanation: 'تعاون = cooperation; کا شکریہ = thank you for.' },
            q1: { source: 'اس مسئلے کو جلد از جلد حل کیا جائے گا۔', explanation: 'کیا جائے گا is the future passive: "will be …". جلد از جلد = as soon as possible.' },
            q2: { source: 'میں اس عہدے کے لیے درخواست دینا چاہتا ہوں۔', explanation: 'عہدہ = post or position; درخواست دینا = apply. چاہتا ہوں (I want) is said politely as "I would like".' },
            q3: { source: 'انہوں نے اجلاس میں ایک اچھی تجویز دی۔', explanation: 'انہوں نے can be "he" or "she" (said with respect) or "they". تجویز = suggestion.' },
            q4: { source: 'گاہکوں کا اطمینان ہی ہماری پہلی ترجیح ہے۔', explanation: 'اطمینان = satisfaction; ترجیح = priority. ہی adds emphasis.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'کمپنی نے ایک نئی پالیسی کا اعلان کیا ہے۔', accepted: ['کمپنی نے نئی پالیسی کا اعلان کیا ہے۔', 'کمپنی نے ایک نئی پالیسی کا اعلان کر دیا ہے۔', 'کمپنی نے نئی پالیسی کا اعلان کر دیا ہے۔'], explanation: 'پالیسی = policy; اعلان کیا ہے = has announced. نے marks the doer with a past verb.' },
            i2: { model: 'تعلیم کامیابی کی کنجی ہے۔', accepted: ['تعلیم ہی کامیابی کی کنجی ہے۔', 'تعلیم کامیابی کی کلید ہے۔', 'تعلیم ہی کامیابی کی کلید ہے۔'], explanation: 'کامیابی = success; کنجی (or کلید) = key. "The key to success" becomes کامیابی کی کنجی ("success\'s key").' },
            i3: { model: 'اگر کوئی تبدیلی ہو تو براہ کرم مجھے مطلع کریں۔', accepted: ['اگر کوئی تبدیلی ہو تو براہ کرم مجھے بتائیں۔', 'اگر کوئی تبدیلی ہو تو براہ کرم مجھے آگاہ کریں۔', 'اگر کوئی تبدیلی ہو تو مجھے مطلع کیجیے۔'], explanation: 'In Urdu the "if" part (اگر … تو) comes first. مطلع کرنا = to inform.' },
            i4: { model: 'ہمیں ماحول کی حفاظت کرنی چاہیے۔', accepted: ['ہمیں ماحول کو بچانا چاہیے۔', 'ہمیں ماحولیات کی حفاظت کرنی چاہیے۔', 'ہمیں ماحول کا تحفظ کرنا چاہیے۔'], explanation: 'چاہیے = should. Urdu starts with ہمیں ("to us"): ہمیں … کرنی چاہیے = we should do ….' },
            i5: { model: 'ہمارے کالج نے پچھلے ہفتے خون کے عطیے کا ایک کیمپ منعقد کیا۔ بہت سے طلبہ اور اساتذہ نے اس میں حصہ لیا۔ ڈاکٹروں نے سب کا ان کے تعاون پر شکریہ ادا کیا۔', accepted: [], explanation: 'خون کا عطیہ = blood donation; منعقد کرنا = organise; حصہ لینا = take part. Compare your sentences with the model.' },
            i6: { model: 'میں دو دن کی چھٹی کی درخواست کرنے کے لیے لکھ رہا ہوں۔', accepted: ['میں دو دن کی چھٹی کی درخواست کرنے کے لیے لکھ رہی ہوں۔', 'میں دو دن کی رخصت کی درخواست کے لیے لکھ رہا ہوں۔', 'میں دو دن کی چھٹی مانگنے کے لیے لکھ رہا ہوں۔', 'میں دو دن کی چھٹی مانگنے کے لیے لکھ رہی ہوں۔'], explanation: 'چھٹی (formal: رخصت) = leave; درخواست کرنا = request. A woman writes لکھ رہی ہوں.' },
            q1: { model: 'محنت کا پھل ہمیشہ ملتا ہے۔', accepted: ['سخت محنت کا پھل ہمیشہ ملتا ہے۔', 'محنت ہمیشہ رنگ لاتی ہے۔', 'محنت کبھی رائیگاں نہیں جاتی۔'], explanation: '"Pays off" means "gives a result": پھل ملتا ہے (the fruit comes). محنت رنگ لاتی ہے is another common way to say it.' },
            q2: { model: 'نتائج کا اعلان کل کیا جائے گا۔', accepted: ['کل نتائج کا اعلان کیا جائے گا۔', 'نتیجے کا اعلان کل کیا جائے گا۔', 'نتائج کل جاری کیے جائیں گے۔', 'نتائج کا اعلان کل ہوگا۔'], explanation: '"Will be announced" is the future passive: اعلان کیا جائے گا. نتائج is the plural of نتیجہ (result). Here کل means tomorrow.' },
            q3: { model: 'آپ کے فوری جواب کا شکریہ۔', accepted: ['آپ کے فوری جواب کے لیے شکریہ۔', 'آپ کے جلد جواب کا شکریہ۔', 'فوری جواب دینے کا شکریہ۔'], explanation: 'فوری = quick; جواب = response or reply; کا شکریہ = thank you for.' },
            q4: { model: 'حفاظت سب کی ذمہ داری ہے۔', accepted: ['حفاظت ہر ایک کی ذمہ داری ہے۔', 'تحفظ سب کی ذمہ داری ہے۔', 'سلامتی سب کی ذمہ داری ہے۔'], explanation: 'حفاظت = safety; سب کی = everyone\'s; ذمہ داری = responsibility.' }
        }
    },
    placement: {
        b4: { prompt: '"کتاب" in English is…', explanation: 'کتاب means book.' },
        a5: { prompt: '"اجلاس ملتوی کر دیا گیا ہے" best translates as…', explanation: 'ملتوی کرنا means postpone, and کر دیا گیا ہے is passive: "has been".' }
    }
};
