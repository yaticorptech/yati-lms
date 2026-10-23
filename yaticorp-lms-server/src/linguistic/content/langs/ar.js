/**
 * Linguistic Ability — Arabic as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 *
 * Modern Standard Arabic, written right to left; the strings are in normal
 * (logical) order and the page sets the direction. No vowel marks (tashkeel).
 * Verbs are given in the present form (يقرأ), as English–Arabic dictionaries do.
 */

// Tips shared by the three Arabic → English lessons, and by the three English → Arabic lessons.
const TO_ENGLISH_POINTS = [
    'Arabic often starts with the verb and can leave out "I", "we" or "he": "أذهب إلى المدرسة" (go-I to the school). English always needs the subject first, then the verb: "I go to school."',
    'Arabic has ال (the) but no a or an, and no is, am or are in the present: "أنا طالب" (I student) is "I am a student." Arabic also uses ال more than English uses "the": إلى المدرسة is often just "to school".',
    'Watch the tense: أذهب (I go, I am going), سأذهب (I will go), ذهبت (I went). One Arabic present form covers "go" and "am going"; words such as الآن (now), غدا (tomorrow) and أمس (yesterday) help you choose.',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const TO_ARABIC_POINTS = [
    'Arabic often puts the verb first and leaves out "I": "I go to school" → "أذهب إلى المدرسة." "أنا أذهب إلى المدرسة." is also correct.',
    'Arabic has no word for a or an; leave them out. "The" is ال, joined to the noun: the book → الكتاب. Leave out is, am and are in the present: "I am a student" → "أنا طالب."',
    'Arabic changes the verb for a man or a woman: تعال (come, to a man), تعالي (come, to a woman). Be polite with من فضلك or لو سمحت (please); formal letters often use the plural كم for "your": شكرا لتعاونكم.',
    'Type in Arabic with your phone\'s Arabic keyboard, or use the Arabic letters under the answer box. You do not need the short vowel marks. Use the Arabic comma (،) and question mark (؟).'
];

module.exports = {
    code: 'ar', name: 'Arabic', native: 'العربية', locale: 'ar',
    words: {
        'vocab-beginner-1': {
            family: 'عائلة، أسرة',
            mother: 'أم، والدة',
            father: 'أب، والد',
            house: 'بيت، منزل',
            food: 'طعام، أكل',
            happy: 'سعيد، مسرور',
            big: 'كبير',
            small: 'صغير'
        },
        'vocab-beginner-2': {
            book: 'كتاب',
            teacher: 'معلم، معلمة',
            student: 'طالب، تلميذ',
            friend: 'صديق',
            read: 'يقرأ',
            write: 'يكتب',
            early: 'مبكرا',
            easy: 'سهل'
        },
        'vocab-intermediate-1': {
            honest: 'أمين، صادق',
            polite: 'مهذب، مؤدب',
            curious: 'محب للاستطلاع، فضولي',
            confident: 'واثق من نفسه',
            patient: 'صبور',
            grateful: 'ممتن، شاكر',
            anxious: 'قلق، متوتر',
            generous: 'كريم، سخي'
        },
        'vocab-intermediate-2': {
            deadline: 'موعد نهائي، آخر موعد',
            improve: 'يحسن، يطور',
            achieve: 'يحقق، ينجز',
            schedule: 'جدول، جدول زمني',
            opportunity: 'فرصة',
            responsible: 'مسؤول',
            discuss: 'يناقش',
            result: 'نتيجة'
        },
        'vocab-advanced-1': {
            negotiate: 'يتفاوض',
            collaborate: 'يتعاون',
            efficient: 'كفء، فعال',
            feasible: 'ممكن، قابل للتنفيذ',
            comprehensive: 'شامل',
            prioritise: 'يعطي الأولوية',
            ambiguous: 'غامض، مبهم',
            persuade: 'يقنع'
        },
        'vocab-advanced-2': {
            sustainable: 'مستدام',
            consequence: 'عاقبة، نتيجة',
            perspective: 'وجهة نظر، منظور',
            inevitable: 'حتمي، لا مفر منه',
            substantial: 'كبير، ملحوظ',
            advocate: 'يدعو إلى، يؤيد',
            diverse: 'متنوع',
            integrity: 'نزاهة، استقامة'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Arabic has ال for "the" (الكتاب = the book), but no word for a or an: كتاب alone means "a book", so a and an are easy to forget. Arabic also uses ال where English has no "the": "الصدق مهم" = "Honesty is important." Say the articles aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Arabic the verb often comes first: "يقرأ رافي الكتب." (Reads Ravi the books.) In English the subject comes first and the verb right after it: "Ravi reads books."' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Arabic word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Arabic.',
            points: [...TO_ARABIC_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Arabic verb to choose the English tense: ذهب (went), يذهب (goes or is going), سيذهب (will go).',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Arabic. Make requests polite with من فضلك (please) or لو سمحت (if you allow).',
            points: [...TO_ARABIC_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Arabic (الفصحى). Passive forms such as تم تأجيل (has been postponed) and سيتم الإعلان (will be announced) are common in notices.',
            points: [...TO_ARABIC_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'ماء', explanation: 'ماء means water.' },
            i2: { source: 'كتاب', explanation: 'كتاب means book, or "a book": Arabic has no word for "a".' },
            i3: { source: 'اسمي راني.', explanation: 'اسم = name, and the ending ي means "my": اسمي = my name. Arabic needs no word for "is"; English adds it.' },
            i4: { source: 'كيف حالك؟', explanation: 'This is the common greeting: كيف = how, حالك = your state. English says "How are you?"' },
            i5: { source: 'أنا بخير.', explanation: 'بخير = fine or well. Arabic needs no "am"; English puts it right after "I".' },
            i6: { source: 'هذا بيتي.', explanation: 'هذا = this; بيتي = my house or home (ي = my). English adds the verb "is" after "This".' },
            q1: { source: 'أذهب إلى المدرسة.', explanation: 'أذهب = I go: the أ at the start means "I", so أنا can be left out. English says "to school", with no "the".' },
            q2: { source: 'هي أختي الصغرى.', explanation: 'أختي = my sister; الصغرى = the younger (الكبرى = the elder). هي = she, and Arabic needs no "is".' },
            q3: { source: 'من فضلك أغلق الباب.', explanation: 'من فضلك = please, أغلق = close (to a woman: أغلقي), الباب = the door.' },
            q4: { source: 'شكرا.', explanation: 'شكرا is the usual way to say thank you; شكرا جزيلا means "thank you very much".' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'صديق', accepted: ['صديقة', 'صاحب', 'رفيق'], explanation: 'Friend is صديق; a female friend is صديقة. صاحب is also common.' },
            i2: { model: 'مدرسة', accepted: ['المدرسة'], explanation: 'School is مدرسة; with ال it is المدرسة (the school).' },
            i3: { model: 'صباح الخير.', accepted: [], explanation: 'صباح = morning, الخير = the good. The usual reply is صباح النور.' },
            i4: { model: 'أنا طالب.', accepted: ['أنا طالبة.', 'أنا تلميذ.', 'أنا تلميذة.'], explanation: 'Arabic needs no word for "am" or "a" here: أنا = I. A girl says أنا طالبة.' },
            i5: { model: 'ما اسمك؟', accepted: ['ما هو اسمك؟', 'ما اسمكم؟'], explanation: 'ما = what; اسمك = your name (the ending ك means "your"). Arabic needs no word for "is".' },
            i6: { model: 'الطعام لذيذ.', accepted: ['الأكل لذيذ.', 'الطعام شهي.'], explanation: 'لذيذ = tasty. "The food" is الطعام, with ال for "the", and Arabic needs no "is".' },
            q1: { model: 'أين موقف الحافلات؟', accepted: ['أين محطة الحافلات؟', 'أين موقف الباص؟', 'أين محطة الباص؟'], explanation: 'أين = where; موقف الحافلات = bus stand ("stand of the buses"). Arabic needs no "is" here.' },
            q2: { model: 'أحب المانجو.', accepted: ['أنا أحب المانجو.', 'أحب المانجا.', 'أحب فاكهة المانجو.'], explanation: 'أحب = I like (or love). Arabic uses ال for things in general: المانجو = mangoes.' },
            q3: { model: 'تعال إلى هنا.', accepted: ['تعال هنا.', 'تعالي إلى هنا.', 'تعالي هنا.', 'تفضل إلى هنا.'], explanation: 'تعال is said to a man or boy, تعالي to a woman or girl; هنا = here. تفضل (please come) is more polite.' },
            q4: { model: 'السماء تمطر.', accepted: ['إنها تمطر.', 'تمطر الآن.', 'المطر ينزل.'], explanation: 'Arabic says "the sky is raining": السماء تمطر. The same verb form means "rains" and "is raining".' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'أنا شاهدت فيلما أمس.', explanation: 'شاهدت is past tense: watched (or saw). أمس = yesterday.' },
            i2: { source: 'هو يركض كل صباح.', explanation: 'A habit takes the simple present: يركض = runs. كل صباح = every morning.' },
            i3: { source: 'سنذهب إلى ميسور غدا.', explanation: 'سنذهب = we will go: the س shows the future and the ن shows "we". غدا = tomorrow.' },
            i4: { source: 'هي تقرأ كتابا.', explanation: 'تقرأ can mean "reads" or "is reading"; for an action happening now, English uses "is reading". كتابا = a book.' },
            i5: { source: 'الأطفال يلعبون في الملعب.', explanation: 'الملعب = the ground or playing field; يلعبون = are playing.' },
            i6: { source: 'هل تناولت طعامك؟', explanation: 'هل makes a yes/no question; تناولت طعامك = you had your meal. "Have you eaten?" is just as natural.' },
            q1: { source: 'أحب التحدث باللغة الإنجليزية.', explanation: 'أحب = I like; التحدث = speaking, to speak; باللغة الإنجليزية = in English.' },
            q2: { source: 'هم يعيشون في بنغالورو منذ سنتين.', explanation: 'منذ with a length of time (منذ سنتين) and a present verb (يعيشون) needs the present perfect continuous. سنتين = two years: Arabic has a special form for two.' },
            q3: { source: 'وصل القطار في موعده.', explanation: 'في موعده = on time (at its set time); وصل = came or arrived. The verb comes first in Arabic.' },
            q4: { source: 'من فضلك تحدث ببطء.', explanation: 'ببطء = slowly; تحدث = speak (to a woman: تحدثي).' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'من فضلك أعطني بعض الماء.', accepted: ['أعطني بعض الماء من فضلك.', 'من فضلك أعطيني بعض الماء.', 'لو سمحت أعطني بعض الماء.', 'من فضلك أعطني القليل من الماء.'], explanation: 'أعطني = give me (to a woman: أعطيني); بعض = some.' },
            i2: { model: 'يبدأ الدرس في الساعة التاسعة.', accepted: ['تبدأ الحصة في الساعة التاسعة.', 'يبدأ الصف في الساعة التاسعة.', 'تبدأ المحاضرة في الساعة التاسعة.', 'يبدأ الدرس الساعة التاسعة.'], explanation: 'في الساعة التاسعة = at nine o\'clock ("at the ninth hour"); يبدأ = starts. The verb usually comes first.' },
            i3: { model: 'نسيت كتابي في البيت.', accepted: ['نسيت كتابي في المنزل.', 'لقد نسيت كتابي في البيت.', 'أنا نسيت كتابي في البيت.'], explanation: 'نسيت = I forgot; كتابي = my book (the ending ي means "my"); في البيت = at home.' },
            i4: { model: 'كم سعر هذا؟', accepted: ['كم ثمن هذا؟', 'بكم هذا؟', 'كم يكلف هذا؟'], explanation: 'كم = how much; سعر = price. بكم هذا؟ ("for how much is this?") is also common.' },
            i5: { model: 'امتحاني في الأسبوع القادم.', accepted: ['امتحاني الأسبوع القادم.', 'امتحاني في الأسبوع المقبل.', 'اختباري في الأسبوع القادم.'], explanation: 'الأسبوع القادم (or المقبل) = next week; امتحاني = my exam. Arabic needs no "is".' },
            i6: { model: 'هل يمكنك مساعدتي؟', accepted: ['هل تستطيع مساعدتي؟', 'هل يمكنك أن تساعدني؟', 'هل تستطيعين مساعدتي؟'], explanation: 'هل starts a yes/no question; يمكنك = you can; مساعدتي = helping me. To a woman: هل تستطيعين مساعدتي؟' },
            q1: { model: 'نحن ذاهبون إلى المكتبة.', accepted: ['نذهب إلى المكتبة.', 'نحن نذهب إلى المكتبة.', 'نحن ذاهبات إلى المكتبة.'], explanation: 'المكتبة = the library; ذاهبون = going (a group of girls says ذاهبات); إلى = to.' },
            q2: { model: 'هي تتحدث اللغة الكنادية جيدا جدا.', accepted: ['تتحدث اللغة الكنادية جيدا جدا.', 'هي تتكلم الكنادية جيدا جدا.', 'هي تتحدث الكنادية بشكل جيد جدا.', 'هي تتحدث لغة الكنادا جيدا جدا.'], explanation: 'جيدا جدا = very well; تتحدث = she speaks (the ت at the start shows "she").' },
            q3: { model: 'لا تهدر الماء.', accepted: ['لا تهدروا الماء.', 'لا تضيع الماء.', 'لا تسرف في الماء.', 'يرجى عدم إهدار الماء.'], explanation: 'لا with a present verb means "do not": لا تهدر = do not waste. Notices often say يرجى عدم إهدار الماء (please do not waste water).' },
            q4: { model: 'يفتح المتجر في الساعة العاشرة.', accepted: ['يفتح المحل في الساعة العاشرة.', 'يفتح المتجر الساعة العاشرة.', 'المتجر يفتح في الساعة العاشرة.', 'يفتح المحل الساعة العاشرة.'], explanation: 'يفتح = opens; المتجر (or المحل) = the shop; الساعة العاشرة = ten o\'clock.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'تم تأجيل الاجتماع إلى يوم الاثنين.', explanation: 'تم تأجيل is passive: "has been postponed" (literally "postponing was done"). إلى يوم الاثنين = to Monday.' },
            i2: { source: 'يرجى إرسال التقرير في موعد أقصاه يوم الجمعة.', explanation: 'يرجى = please (formal); في موعد أقصاه = by, not later than.' },
            i3: { source: 'عذرا على التأخر في الرد.', explanation: 'A common line in emails. عذرا = sorry; التأخر في الرد = the delay in replying.' },
            i4: { source: 'أنجز فريقنا المشروع في الوقت المحدد.', explanation: 'أنجز = completed; فريقنا = our team (نا = our); في الوقت المحدد = on time.' },
            i5: { source: 'أنهيت دراستي الجامعية في العام الماضي. والآن أبحث عن وظيفة في شركة برمجيات. وأنا مهتم جدا بتعلم أشياء جديدة.', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'شكرا لتعاونكم.', explanation: 'تعاون = cooperation; لتعاونكم = for your cooperation (كم = your, the polite plural used in letters).' },
            q1: { source: 'سيتم حل هذه المشكلة في أقرب وقت ممكن.', explanation: 'سيتم with a noun is the future passive: سيتم حل = will be solved. في أقرب وقت ممكن = as soon as possible.' },
            q2: { source: 'أود التقدم لهذه الوظيفة.', explanation: 'أود = I would like; التقدم لهذه الوظيفة = to apply for this position.' },
            q3: { source: 'قدم اقتراحا جيدا في الاجتماع.', explanation: 'قدم = he gave (presented); for a woman it is قدمت and for a group قدموا. اقتراحا = a suggestion.' },
            q4: { source: 'رضا العملاء هو أولويتنا الأولى.', explanation: 'رضا = satisfaction; العملاء = the customers; أولويتنا = our priority. هو adds emphasis; Arabic needs no "is".' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'أعلنت الشركة عن سياسة جديدة.', accepted: ['أعلنت الشركة سياسة جديدة.', 'لقد أعلنت الشركة عن سياسة جديدة.', 'الشركة أعلنت عن سياسة جديدة.'], explanation: 'سياسة = policy; أعلنت = announced (the ت shows that الشركة is feminine). لقد adds the sense of "has".' },
            i2: { model: 'التعليم هو مفتاح النجاح.', accepted: ['التعليم مفتاح النجاح.', 'التعليم هو مفتاح للنجاح.'], explanation: 'مفتاح = key; النجاح = success. "The key to success" becomes مفتاح النجاح ("key of the success"), and Arabic uses ال for ideas in general: التعليم = education.' },
            i3: { model: 'يرجى إبلاغي في حال وجود أي تغيير.', accepted: ['أرجو إبلاغي إذا كان هناك أي تغيير.', 'من فضلك أخبرني إذا كان هناك أي تغيير.', 'إذا كان هناك أي تغيير فأرجو إبلاغي.', 'يرجى إعلامي في حال وجود أي تغيير.'], explanation: 'يرجى = please (formal); إبلاغي = to inform me. في حال وجود (or إذا كان هناك) = if there is.' },
            i4: { model: 'يجب علينا حماية البيئة.', accepted: ['يجب أن نحمي البيئة.', 'علينا أن نحمي البيئة.', 'ينبغي أن نحمي البيئة.', 'علينا حماية البيئة.'], explanation: 'يجب علينا = we should, we must; حماية البيئة = protecting the environment. ينبغي is a softer "should".' },
            i5: { model: 'نظمت كليتنا حملة للتبرع بالدم الأسبوع الماضي. وشارك فيها كثير من الطلاب والأساتذة. وشكر الأطباء الجميع على دعمهم.', accepted: [], explanation: 'حملة للتبرع بالدم = blood donation camp (drive); شارك في = take part in. Compare your sentences with the model.' },
            i6: { model: 'أكتب إليكم لطلب إجازة لمدة يومين.', accepted: ['أكتب لأطلب إجازة لمدة يومين.', 'أكتب إليكم لطلب إجازة يومين.', 'أكتب هذه الرسالة لطلب إجازة لمدة يومين.', 'أكتب إليك لطلب إجازة لمدة يومين.'], explanation: 'إجازة = leave; لطلب = to request; يومين = two days (Arabic has a special form for two: يوم, يومين).' },
            q1: { model: 'العمل الجاد يؤتي ثماره دائما.', accepted: ['الاجتهاد يؤتي ثماره دائما.', 'الجد والاجتهاد يؤتيان ثمارهما دائما.', 'من جد وجد.'], explanation: '"Pays off" means "bears its fruit": يؤتي ثماره. The proverb من جد وجد ("who works hard, finds") says the same.' },
            q2: { model: 'سيتم إعلان النتائج غدا.', accepted: ['ستعلن النتائج غدا.', 'سيتم الإعلان عن النتائج غدا.', 'النتائج ستعلن غدا.'], explanation: '"Will be announced" is the future passive: سيتم إعلان (literally "announcing will be done"). غدا = tomorrow.' },
            q3: { model: 'شكرا على ردك السريع.', accepted: ['شكرا لردك السريع.', 'شكرا لكم على ردكم السريع.', 'أشكرك على ردك السريع.', 'شكرا على ردكم السريع.'], explanation: 'رد = reply or response; السريع = the quick. In Arabic the adjective comes after the noun: ردك السريع = your quick response.' },
            q4: { model: 'السلامة مسؤولية الجميع.', accepted: ['السلامة هي مسؤولية الجميع.', 'الأمان مسؤولية الجميع.', 'السلامة مسؤولية كل شخص.'], explanation: 'السلامة = safety; مسؤولية = responsibility; الجميع = everyone. "Everyone\'s responsibility" becomes مسؤولية الجميع ("responsibility of everyone").' }
        }
    },
    placement: {
        b4: { prompt: '"كتاب" in English is…', explanation: 'كتاب means book.' },
        a5: { prompt: '"تم تأجيل الاجتماع" best translates as…', explanation: 'تأجيل means postponing, and تم with it makes the passive: "has been postponed".' }
    }
};
