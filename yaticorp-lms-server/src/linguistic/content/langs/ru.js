/**
 * Linguistic Ability — Russian as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 *
 * Russian leaves out "is/are" in the present; in definitions a dash (—)
 * stands for it, and the dash is ignored when answers are compared. Models
 * write ё where it belongs; a short answer that has ё also accepts е, since
 * many students type е.
 */
module.exports = {
    code: 'ru', name: 'Russian', native: 'Русский', locale: 'ru-RU',
    words: {
        'vocab-beginner-1': {
            family: 'семья',
            mother: 'мать, мама',
            father: 'отец, папа',
            house: 'дом',
            food: 'еда, пища',
            happy: 'счастливый, радостный',
            big: 'большой',
            small: 'маленький'
        },
        'vocab-beginner-2': {
            book: 'книга',
            teacher: 'учитель, преподаватель',
            student: 'ученик, студент',
            friend: 'друг, подруга',
            read: 'читать',
            write: 'писать',
            early: 'рано',
            easy: 'лёгкий, простой'
        },
        'vocab-intermediate-1': {
            honest: 'честный',
            polite: 'вежливый',
            curious: 'любознательный, любопытный',
            confident: 'уверенный в себе',
            patient: 'терпеливый',
            grateful: 'благодарный',
            anxious: 'встревоженный, обеспокоенный',
            generous: 'щедрый'
        },
        'vocab-intermediate-2': {
            deadline: 'срок, крайний срок',
            improve: 'улучшать',
            achieve: 'достигать',
            schedule: 'расписание, график',
            opportunity: 'возможность, шанс',
            responsible: 'ответственный',
            discuss: 'обсуждать',
            result: 'результат'
        },
        'vocab-advanced-1': {
            negotiate: 'вести переговоры',
            collaborate: 'сотрудничать',
            efficient: 'эффективный',
            feasible: 'осуществимый, выполнимый',
            comprehensive: 'всесторонний, исчерпывающий',
            prioritise: 'расставлять приоритеты',
            ambiguous: 'двусмысленный, неоднозначный',
            persuade: 'убеждать, уговаривать'
        },
        'vocab-advanced-2': {
            sustainable: 'устойчивый',
            consequence: 'последствие',
            perspective: 'точка зрения, взгляд',
            inevitable: 'неизбежный',
            substantial: 'значительный, существенный',
            advocate: 'выступать за, отстаивать',
            diverse: 'разнообразный',
            integrity: 'честность, порядочность'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Russian has no words for a, an or the, so they are easy to forget: "Я студент" is "I am a student", and "Закройте дверь" is "Close the door". Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: {
                4: 'Russian word order is free, because word endings show who does what: "Рави читает книги" and "Книги читает Рави" both mean "Ravi reads books." In English the order is fixed: the verb comes right after the subject.'
            }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Russian word or sentence into English.',
            points: [
                'Russian word order is free, because endings show who does what; English order is fixed: Subject → Verb → Object. "Книги читает Рави" = "Ravi reads books."',
                'English needs small words Russian does not have: a, an, the, and am, is, are in the present: "Я студент" = "I am a student"; "Это мой дом" = "This is my house."',
                'Watch the tense: "я иду" (I go / I am going), "я пошёл" (I went), "я пойду" (I will go).',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Russian.',
            points: [
                'The order is often the same as English: "I go to school" → "Я хожу в школу". But leave out am, is and are in the present: "I am a student" → "Я студент"; "Where is the stop?" → "Где остановка?".',
                'There are no words for a, an or the in Russian; leave them out: "Close the door" → "Закройте дверь".',
                'Choose the polite form for elders, teachers and strangers: вы, идите, дайте. With friends and family you may use ты, иди, дай.',
                'Type in Russian with your phone\'s Russian keyboard (press and hold е to get ё), or use the Russian letters under the answer box.'
            ]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Russian verb form to choose the English tense.',
            points: [
                'Russian word order is free, because endings show who does what; English order is fixed: Subject → Verb → Object. "Книги читает Рави" = "Ravi reads books."',
                'English needs small words Russian does not have: a, an, the, and am, is, are in the present: "Я студент" = "I am a student"; "Это мой дом" = "This is my house."',
                'Watch the tense: "я смотрю" = I watch or I am watching; "я посмотрел" = I watched; "я посмотрю" = I will watch. For something still going on Russian uses the present ("Я живу здесь два года"), but English says "I have been living here for two years".',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Russian. Use the polite вы form for requests.',
            points: [
                '"Not" is "не", placed right before the verb: "Do not waste water" → "Не тратьте воду зря". Object pronouns usually come before the verb: "Can you help me?" → "Вы можете мне помочь?".',
                'There are no words for a, an or the in Russian; leave them out. Instead, the ending of a noun changes with its role in the sentence: "книга" (a book), but "Я забыл книгу дома" (I forgot the book at home).',
                'Choose the polite form for elders, teachers and strangers: вы, идите, дайте. With friends and family you may use ты, иди, дай.',
                'Type in Russian with your phone\'s Russian keyboard (press and hold е to get ё), or use the Russian letters under the answer box.'
            ]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "Совещание перенесено" = "The meeting has been postponed."',
            points: [
                'Russian word order is free, because endings show who does what; English order is fixed: Subject → Verb → Object. "Книги читает Рави" = "Ravi reads books."',
                'English needs small words Russian does not have: a, an, the, and am, is, are in the present: "Я студент" = "I am a student"; "Это мой дом" = "This is my house."',
                'Watch the passive: "перенесено" = has been postponed; "будет решена" = will be solved. A Russian sentence with no subject and a "they" verb often reads best as an English passive: "Результаты объявят завтра" = "The results will be announced tomorrow."',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Russian. Passive forms such as "будут объявлены" (will be announced) are common in notices, and "Просим …" or "Прошу вас …" is the formal way to ask.',
            points: [
                'Word order is freer than in English, but the parts of a sentence are set off by commas, always before "если" (if), "что" (that) and "чтобы" (in order to): "Сообщите мне, пожалуйста, если что-то изменится."',
                'There are no words for a, an or the in Russian, and in a definition "is" is left out and a dash (—) is written instead: "Education is the key to success" → "Образование — ключ к успеху".',
                'In formal writing always use вы (in letters often with a capital: Вы, Вас, Ваш): "Прошу Вас …", "Благодарю Вас за …". Keep ты for friends and family.',
                'Type in Russian with your phone\'s Russian keyboard (press and hold е to get ё), or use the Russian letters under the answer box.'
            ]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'вода', explanation: '"вода" means water. Russian has no article, so it can be "water" or "the water".' },
            i2: { source: 'книга', explanation: '"книга" means book; English adds "a" or "the": a book.' },
            i3: { source: 'Меня зовут Рани.', explanation: '"Меня зовут" (literally "me they call") is how Russian gives a name. In English say "My name is …" or "I am …".' },
            i4: { source: 'Как у вас дела?', explanation: 'This is the polite greeting (to a friend: "Как дела?" or "Как ты?"). English needs "are": How are you?' },
            i5: { source: 'У меня всё хорошо.', explanation: '"У меня всё хорошо" (literally "with me all is good") means "I am fine". English needs "I am".' },
            i6: { source: 'Это мой дом.', explanation: '"Это" = this; "мой дом" = my house. Russian leaves out "is", but English needs it: This is my house.' },
            q1: { source: 'Я хожу в школу.', explanation: '"Я хожу" = I go (regularly); for right now Russian says "Я иду в школу" = I am going to school. "в школу" = to school.' },
            q2: { source: 'Она моя младшая сестра.', explanation: '"младшая сестра" is a younger sister ("старшая сестра" is an elder sister). Russian leaves out "is".' },
            q3: { source: 'Пожалуйста, закройте дверь.', explanation: '"пожалуйста" = please, "дверь" = door, "закройте" = close (polite; to a friend: "закрой").' },
            q4: { source: 'Спасибо.', explanation: '"Спасибо" means thank you; "Большое спасибо" = thank you very much.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'друг', accepted: ['подруга', 'приятель', 'приятельница'], explanation: 'Friend is "друг" (for a girl, "подруга"); "приятель" is a friend who is less close.' },
            i2: { model: 'школа', accepted: [], explanation: 'School is "школа". With no articles in Russian, "a school" and "the school" are both just "школа".' },
            i3: { model: 'Доброе утро.', accepted: [], explanation: 'The usual greeting is "Доброе утро" (good morning); later in the day say "Добрый день".' },
            i4: { model: 'Я студент.', accepted: ['Я студентка.', 'Я ученик.', 'Я ученица.'], explanation: 'Russian needs no word for "am" or "a" here: "Я студент" (a girl says "студентка"; at school, "ученик" or "ученица").' },
            i5: { model: 'Как вас зовут?', accepted: ['Как тебя зовут?', 'Как ваше имя?', 'Как твоё имя?'], explanation: '"Как вас зовут?" (literally "How do they call you?") is polite; with a friend, "Как тебя зовут?".' },
            i6: { model: 'Еда вкусная.', accepted: ['Пища вкусная.'], explanation: '"вкусный" = tasty. Russian leaves out "is", and the adjective agrees with the noun: "еда" is feminine, so "вкусная".' },
            q1: { model: 'Где автобусная остановка?', accepted: ['Где остановка автобуса?', 'Где находится автобусная остановка?', 'Где автовокзал?', 'Где остановка?'], explanation: '"Где" = where; Russian leaves out "is": "Где остановка?" = where is the stop? A big bus station is "автовокзал".' },
            q2: { model: 'Я люблю манго.', accepted: ['Мне нравится манго.', 'Мне нравятся манго.', 'Я люблю есть манго.'], explanation: 'Russian says "я люблю" (I love, also used for food you like) or "мне нравится" (to me is pleasing). "манго" never changes its ending.' },
            q3: { model: 'Идите сюда.', accepted: ['Иди сюда.', 'Подойдите сюда.', 'Подойди сюда.'], explanation: '"Идите" is polite (or for several people); "иди" is used with friends and children. "сюда" = here, towards me ("здесь" is here, in this place).' },
            q4: { model: 'Идёт дождь.', accepted: ['Идет дождь.'], explanation: 'Russian says "Идёт дождь" (rain is going); there is no "it" and no "-ing" form.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'Вчера я посмотрел фильм.', explanation: '"посмотрел" is the past tense (a woman says "посмотрела"): watched or saw. "фильм" = a movie, "вчера" = yesterday.' },
            i2: { source: 'Он бегает каждое утро.', explanation: 'A habit takes the simple present: "он бегает" = he runs. "каждое утро" = every morning.' },
            i3: { source: 'Завтра мы поедем в Майсур.', explanation: '"поедем" (from "поехать") is the future: we will go. "завтра" = tomorrow; Russian calls Mysuru "Майсур".' },
            i4: { source: 'Она читает книгу.', explanation: 'Russian has no "-ing" form: "читает" can mean "reads" or "is reading". For an action happening now, English says "is reading".' },
            i5: { source: 'Дети играют на спортивной площадке.', explanation: '"спортивная площадка" = the ground or playground; "играют" = are playing (the Russian present covers both "play" and "are playing").' },
            i6: { source: 'Вы уже поели?', explanation: 'A polite question about eating (to a friend: "Ты уже поел?"). "Have you eaten?" is just as natural.' },
            q1: { source: 'Мне нравится говорить по-английски.', explanation: '"Мне нравится" + verb = I like to … "по-английски" = in English (Russian writes languages with a small letter).' },
            q2: { source: 'Они живут в Бангалоре уже два года.', explanation: 'Russian uses the present with a length of time ("живут … уже два года"); English needs the present perfect continuous: have been living … for two years.' },
            q3: { source: 'Поезд пришёл вовремя.', explanation: '"вовремя" = on time; "пришёл" = came or arrived ("прибыл" is more formal).' },
            q4: { source: 'Пожалуйста, говорите медленно.', explanation: '"медленно" = slowly; "говорите" is the polite request form of "говорить" (speak). People also say "медленнее" (more slowly).' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'Дайте мне, пожалуйста, воды.', accepted: ['Дай мне, пожалуйста, воды.', 'Пожалуйста, дайте мне воды.', 'Дайте мне немного воды, пожалуйста.', 'Пожалуйста, дайте мне немного воды.'], explanation: '"Дайте" is the polite form of "give" (to a friend: "дай"); "воды" (not "вода") means "some water".' },
            i2: { model: 'Урок начинается в девять часов.', accepted: ['Урок начинается в 9 часов.', 'Урок начинается в девять.', 'Занятие начинается в девять часов.', 'Занятия начинаются в девять часов.'], explanation: '"в девять часов" = at nine o\'clock; "начинается" = starts.' },
            i3: { model: 'Я забыл книгу дома.', accepted: ['Я забыла книгу дома.', 'Я забыл свою книгу дома.', 'Я забыла свою книгу дома.', 'Я оставил книгу дома.'], explanation: '"Я забыл" = I forgot (a girl says "забыла"); "дома" = at home. Russian often leaves out "my" when it is clear ("свою" if you add it).' },
            i4: { model: 'Сколько это стоит?', accepted: ['Сколько стоит это?', 'Почём это?', 'Почем это?'], explanation: '"сколько" = how much; "стоит" = costs. "Почём это?" is a short everyday way to ask at a market.' },
            i5: { model: 'У меня экзамен на следующей неделе.', accepted: ['На следующей неделе у меня экзамен.', 'Мой экзамен на следующей неделе.', 'Мой экзамен будет на следующей неделе.', 'У меня экзамен будет на следующей неделе.'], explanation: '"на следующей неделе" = next week. Russian likes "у меня" (I have): "У меня экзамен" = I have an exam, my exam is.' },
            i6: { model: 'Вы можете мне помочь?', accepted: ['Ты можешь мне помочь?', 'Вы не могли бы мне помочь?', 'Можете мне помочь?', 'Можешь мне помочь?'], explanation: '"Вы можете" = can you (polite; to a friend: "ты можешь"). "мне" (to me) comes before "помочь" (help).' },
            q1: { model: 'Мы идём в библиотеку.', accepted: ['Мы идем в библиотеку.', 'Мы едем в библиотеку.'], explanation: '"библиотека" = library; "в библиотеку" = to the library (the ending changes after "в"). "Мы идём" = we are going on foot; by bus or car, "мы едем".' },
            q2: { model: 'Она очень хорошо говорит на каннада.', accepted: ['Она говорит на каннада очень хорошо.', 'Она очень хорошо говорит на языке каннада.'], explanation: '"очень хорошо" = very well and usually comes before the verb. "говорить на …" = speak (a language); "каннада" never changes its ending.' },
            q3: { model: 'Не тратьте воду зря.', accepted: ['Не трать воду зря.', 'Не тратьте воду впустую.', 'Не расходуйте воду зря.'], explanation: '"не" before the verb = do not; "тратьте" is the polite (or plural) form, "трать" the one for a friend. "зря" = for nothing, wastefully.' },
            q4: { model: 'Магазин открывается в десять.', accepted: ['Магазин открывается в 10.', 'Магазин открывается в десять часов.', 'Магазин открывается в 10 часов.'], explanation: '"открывается" = opens (the "-ся" ending is needed when nobody is named as opening it). "в десять" = at ten.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'Совещание перенесено на понедельник.', explanation: '"перенесено" is passive: "has been …" ("перенести" = postpone, move). "на понедельник" = to Monday.' },
            i2: { source: 'Пожалуйста, пришлите отчёт к пятнице.', explanation: '"к пятнице" means "by Friday" (not later than); "до пятницы" is also common. "пришлите" is the polite request form of "прислать" (send).' },
            i3: { source: 'Извините за поздний ответ.', explanation: 'A common line in emails; "поздний" = late, "ответ" = reply.' },
            i4: { source: 'Наша команда завершила проект в срок.', explanation: '"завершила" = completed (its ending agrees with "команда", which is feminine); "в срок" = on time.' },
            i5: { source: 'В прошлом году я получил диплом. Сейчас я ищу работу в компании по разработке программного обеспечения. Мне очень интересно учиться новому.', explanation: 'Three sentences: a past action (я получил), an action going on now (я ищу = I am looking for), and a feeling (мне интересно = I am interested). Compare your tenses with the model.' },
            i6: { source: 'Спасибо за ваше сотрудничество.', explanation: '"сотрудничество" = cooperation; "Спасибо за …" = thank you for …' },
            q1: { source: 'Эта проблема будет решена как можно скорее.', explanation: '"будет решена" is the future passive: "will be …". "как можно скорее" = as soon as possible.' },
            q2: { source: 'Я хотел бы подать заявку на эту должность.', explanation: '"Я хотел бы" = I would like (a woman says "хотела бы"); "подать заявку на" = apply for; "должность" = post or position.' },
            q3: { source: 'На совещании он внёс хорошее предложение.', explanation: '"внести предложение" = make or give a suggestion (formal); "на совещании" = in (or at) the meeting.' },
            q4: { source: 'Удовлетворённость клиентов — наш главный приоритет.', explanation: '"удовлетворённость клиентов" = customer satisfaction; "главный приоритет" = top or first priority. The dash (—) stands for "is", which Russian leaves out.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'Компания объявила о новой политике.', accepted: ['Компания объявила новую политику.', 'Компания сообщила о новой политике.', 'Компания объявила о новых правилах.'], explanation: '"политика" here = policy; "объявила о …" = has announced (Russian uses one past tense for "announced" and "has announced").' },
            i2: { model: 'Образование — ключ к успеху.', accepted: ['Образование — это ключ к успеху.', 'Образование является ключом к успеху.'], explanation: '"ключ к успеху" = the key to success. Russian has no "the" and leaves out "is", writing a dash (—) instead; "является" is the formal "is".' },
            i3: { model: 'Пожалуйста, сообщите мне, если будут какие-либо изменения.', accepted: ['Пожалуйста, сообщите мне, если будут изменения.', 'Сообщите мне, пожалуйста, если что-то изменится.', 'Прошу сообщить мне, если будут изменения.', 'Пожалуйста, сообщите мне о любых изменениях.'], explanation: '"если" = if; Russian uses the future after it ("если будут изменения" = if there are changes). As in English, the "if" part can come first or last.' },
            i4: { model: 'Мы должны защищать окружающую среду.', accepted: ['Нам следует защищать окружающую среду.', 'Мы должны беречь окружающую среду.', 'Мы должны охранять окружающую среду.', 'Нужно защищать окружающую среду.'], explanation: '"мы должны" = we must or should ("нам следует" = we ought to); "окружающая среда" = the environment.' },
            i5: { model: 'На прошлой неделе наш колледж провёл акцию по сдаче крови. В ней приняли участие многие студенты и преподаватели. Врачи поблагодарили всех за поддержку.', accepted: [], explanation: '"акция по сдаче крови" (or "день донора") = blood donation camp; "принять участие" = take part. Compare your sentences with the model.' },
            i6: { model: 'Я пишу вам с просьбой предоставить мне два дня отпуска.', accepted: ['Прошу предоставить мне два дня отпуска.', 'Я пишу, чтобы попросить два дня отпуска.', 'Я пишу, чтобы попросить отпуск на два дня.', 'Пишу вам с просьбой предоставить мне отпуск на два дня.'], explanation: '"отпуск" = leave; "с просьбой" = with a request, to request. A Russian request letter often begins simply "Прошу предоставить …" (I ask you to grant …).' },
            q1: { model: 'Упорный труд всегда окупается.', accepted: ['Тяжёлый труд всегда окупается.', 'Упорный труд всегда приносит плоды.', 'Усердный труд всегда вознаграждается.', 'Труд всегда окупается.'], explanation: '"окупаться" = pay off (literally "pay for itself"); "приносить плоды" (bear fruit) is also common.' },
            q2: { model: 'Результаты будут объявлены завтра.', accepted: ['Завтра будут объявлены результаты.', 'Результаты объявят завтра.', 'Завтра объявят результаты.', 'Результаты будут опубликованы завтра.'], explanation: '"будут объявлены" is the future passive: will be announced. "Результаты объявят завтра" (they will announce) is a common everyday way to say it.' },
            q3: { model: 'Спасибо за ваш быстрый ответ.', accepted: ['Спасибо за быстрый ответ.', 'Благодарю вас за быстрый ответ.', 'Спасибо за оперативный ответ.', 'Благодарю за оперативный ответ.'], explanation: '"быстрый" = quick and, as in English, comes before the noun; "оперативный" (prompt) is common in business emails. "Благодарю вас" is more formal than "Спасибо".' },
            q4: { model: 'Безопасность — это ответственность каждого.', accepted: ['Безопасность — ответственность каждого.', 'Безопасность — дело каждого.', 'За безопасность отвечает каждый.', 'Безопасность — общая ответственность.'], explanation: '"безопасность" = safety; "каждого" (of each one) = everyone\'s, since Russian has no "\'s". "Безопасность — дело каждого" is a common slogan.' }
        }
    },
    placement: {
        b4: { prompt: '"книга" in English is…', explanation: '"книга" means book.' },
        a5: { prompt: '"Совещание перенесено" best translates as…', explanation: '"перенести" means postpone (move to a later time), and "перенесено" is passive: "has been postponed".' }
    }
};
