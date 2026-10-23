/**
 * Linguistic Ability — Grammar Practice lessons (seed content).
 *
 * A lesson teaches one topic (learn: a short explanation and examples), then
 * practice questions with instant feedback, then a scored quiz. Question
 * types (check.js grades them):
 *   mcq         options[], answer = the right option's text
 *   fill        one blank (___); answer and any accepted alternatives
 *   correction  rewrite the sentence correctly; answer and accepted rewrites
 *   rearrange   words[] in a muddled order; answer = the sentence
 * Every question carries an explanation shown after it is answered.
 */
const mcq = (id, prompt, options, answer, explanation) => ({ id, type: 'mcq', prompt, options, answer, explanation });
const fill = (id, prompt, answer, explanation, accepted = []) => ({ id, type: 'fill', prompt, answer, accepted, explanation });
const fix = (id, prompt, answer, explanation, accepted = []) => ({ id, type: 'correction', prompt, answer, accepted, explanation });
const order = (id, words, answer, explanation, accepted = []) => ({ id, type: 'rearrange', prompt: 'Put the words in the right order to make a sentence.', words, answer, accepted, explanation });

module.exports = [
    {
        seedKey: 'grammar-beginner-1', module: 'grammar', level: 'beginner', order: 1,
        title: 'Articles: a, an and the',
        summary: 'When to use a, an and the before a noun.',
        learn: {
            intro: 'Articles are the small words a, an and the. They come before a noun (a naming word).',
            points: [
                'Use "a" before a word that begins with a consonant sound: a book, a car, a university (it sounds like "yoo").',
                'Use "an" before a word that begins with a vowel sound: an apple, an egg, an hour (the h is silent).',
                'Use "the" for a particular thing that both people know about, or something there is only one of: the sun, the book on the table.',
                'Use no article when you talk about things in general: Dogs are loyal. Water is important.'
            ],
            examples: ['I have a pen.', 'She ate an orange.', 'The moon is bright tonight.', 'Please close the door.'],
            kannadaNote: 'Kannada has no words for a, an or the, so they are easy to forget. Say them aloud while you practise.'
        },
        practice: [
            fill('p1', 'I saw ___ owl in the tree.', 'an', '"Owl" begins with a vowel sound, so we use "an".'),
            fill('p2', 'She is ___ doctor.', 'a', '"Doctor" begins with a consonant sound, so we use "a".'),
            mcq('p3', '___ sun rises in the east.', ['The', 'A', 'An'], 'The', 'There is only one sun, so we use "the".'),
            mcq('p4', 'He waited for ___ hour.', ['an', 'a', 'many'], 'an', 'The h in "hour" is silent, so the word begins with a vowel sound.'),
            fix('p5', 'I want to buy a umbrella.', 'I want to buy an umbrella.', '"Umbrella" begins with a vowel sound, so it takes "an".'),
            fix('p6', 'The honesty is the best policy.', 'Honesty is the best policy.', 'We do not use "the" before an idea in general, like honesty or love.')
        ],
        quiz: [
            fill('q1', 'This is ___ easy question.', 'an', '"Easy" begins with a vowel sound.'),
            fill('q2', 'My father is ___ engineer.', 'an', '"Engineer" begins with a vowel sound.'),
            fill('q3', 'Please pass me ___ salt.', 'the', 'We mean the particular salt on the table, so we use "the".'),
            mcq('q4', 'Which is correct?', ['a European country', 'an European country'], 'a European country', '"European" begins with a "yoo" sound, which is a consonant sound.'),
            mcq('q5', '___ Kaveri is a holy river.', ['The', 'A', 'An'], 'The', 'We use "the" before the names of rivers.'),
            fix('q6', 'He is best student in the class.', 'He is the best student in the class.', 'Use "the" before words like best, tallest and first.'),
            mcq('q7', 'I bought ___ new phone yesterday.', ['a', 'an', 'much'], 'a', '"New" begins with a consonant sound.'),
            order('q8', ['book', 'This', 'a', 'good', 'is'], 'This is a good book.', 'Subject (This) + verb (is) + a + adjective (good) + noun (book).')
        ]
    },
    {
        seedKey: 'grammar-beginner-2', module: 'grammar', level: 'beginner', order: 2,
        title: 'Pronouns and sentence order',
        summary: 'I, me, my and friends — and the order of words in an English sentence.',
        learn: {
            intro: 'Pronouns stand in place of nouns, so we do not repeat names. English sentences also follow a fixed order.',
            points: [
                'Subject pronouns do the action: I, you, he, she, it, we, they. "She sings."',
                'Object pronouns receive the action: me, you, him, her, it, us, them. "Call me."',
                'Possessive words show who owns something: my, your, his, her, its, our, their. "This is my bag."',
                'A basic English sentence follows Subject → Verb → Object: "Ravi (S) reads (V) books (O)."',
                'In Kannada the verb comes last: "ರವಿ ಪುಸ್ತಕಗಳನ್ನು ಓದುತ್ತಾನೆ." In English the verb comes right after the subject.'
            ],
            examples: ['He is my brother.', 'Please help us.', 'They love their village.', 'Anu plays cricket.']
        },
        practice: [
            fill('p1', '___ is my brother. (He / Him)', 'He', 'He is the subject of the sentence, so we use the subject pronoun "He".'),
            mcq('p2', 'Please help ___.', ['me', 'I', 'my'], 'me', '"Help" needs an object, so we use the object pronoun "me".'),
            mcq('p3', 'This is ___ house.', ['our', 'us', 'we'], 'our', '"Our" shows who owns the house.'),
            order('p4', ['cricket', 'Anu', 'plays'], 'Anu plays cricket.', 'Subject (Anu) + verb (plays) + object (cricket).'),
            fix('p5', 'Me and my friend went to the market.', 'My friend and I went to the market.', 'Use "I" for the subject, and it is polite to put yourself last.'),
            fill('p6', 'The dog is wagging ___ tail. (its / it\'s)', 'its', '"Its" shows ownership. "It\'s" means "it is".')
        ],
        quiz: [
            mcq('q1', '___ are going to the cinema.', ['We', 'Us', 'Our'], 'We', '"We" is the subject.'),
            fill('q2', 'Give the book to ___. (she / her)', 'her', 'After "to", we use the object pronoun "her".'),
            mcq('q3', 'Is this pen ___?', ['yours', 'your', 'you'], 'yours', '"Yours" stands alone at the end, meaning "your pen".'),
            order('q4', ['mangoes', 'likes', 'She'], 'She likes mangoes.', 'Subject + verb + object.'),
            order('q5', ['football', 'We', 'every', 'play', 'evening'], 'We play football every evening.', 'Subject + verb + object, then the time.', ['Every evening we play football.']),
            fix('q6', 'Him is my best friend.', 'He is my best friend.', 'The subject must be the subject pronoun "He".'),
            mcq('q7', 'The children did ___ homework.', ['their', 'there', 'they\'re'], 'their', '"Their" shows ownership. "There" is a place and "they\'re" means "they are".'),
            fix('q8', 'Ravi and me are classmates.', 'Ravi and I are classmates.', '"Ravi and I" is the subject, so we use "I".')
        ]
    },
    {
        seedKey: 'grammar-intermediate-1', module: 'grammar', level: 'intermediate', order: 1,
        title: 'Tenses: present, past and future',
        summary: 'Simple present, present continuous, simple past and simple future.',
        learn: {
            intro: 'A tense shows when something happens. Time words like "every day", "now", "yesterday" and "tomorrow" tell you which tense to use.',
            points: [
                'Simple present — habits and facts: "She walks to college every day." Add -s or -es to the verb with he, she and it.',
                'Present continuous — happening now: am / is / are + verb-ing. "They are studying now."',
                'Simple past — finished actions: verb + -ed, or the irregular past form. "We visited Hampi last year." "I went home."',
                'Simple future — later: will + verb. "I will call you tomorrow."',
                'Some verbs are not used in the -ing form for states: know, like, want, believe. Say "I know", not "I am knowing".'
            ],
            examples: ['The sun rises in the east.', 'Look! It is raining.', 'I met my teacher yesterday.', 'We will leave at six.']
        },
        practice: [
            fill('p1', 'She ___ (go) to the gym every morning.', 'goes', 'A habit with "she" takes the -es form: goes.'),
            fill('p2', 'Look! The baby ___ (sleep).', 'is sleeping', '"Look!" shows it is happening now, so we use the present continuous.'),
            mcq('p3', 'We ___ a movie last night.', ['watched', 'watch', 'are watching'], 'watched', '"Last night" is finished time, so we use the simple past.'),
            mcq('p4', 'I ___ you tomorrow.', ['will call', 'called', 'am call'], 'will call', '"Tomorrow" is the future: will + verb.'),
            fix('p5', 'He go to college by bus.', 'He goes to college by bus.', 'With "he" in the simple present, the verb takes -es.'),
            fix('p6', 'Yesterday I meet my teacher.', 'Yesterday I met my teacher.', '"Yesterday" needs the past form: met.', ['I met my teacher yesterday.'])
        ],
        quiz: [
            fill('q1', 'The sun ___ (rise) in the east.', 'rises', 'A fact takes the simple present: rises.'),
            fill('q2', 'They ___ (play) cricket right now.', 'are playing', '"Right now" needs the present continuous.'),
            fill('q3', 'I ___ (buy) a new phone last week.', 'bought', '"Buy" is irregular: its past form is "bought".'),
            mcq('q4', 'My mother ___ dinner at the moment.', ['is cooking', 'cooks', 'cooked'], 'is cooking', '"At the moment" means now.'),
            mcq('q5', 'Next year, she ___ her degree.', ['will finish', 'finished', 'is finish'], 'will finish', '"Next year" is the future.'),
            fix('q6', 'She don\'t like tea.', 'She doesn\'t like tea.', 'With "she", use "doesn\'t" (does not).', ['She does not like tea.']),
            fix('q7', 'I am knowing the answer.', 'I know the answer.', '"Know" describes a state, so it is not used with -ing.'),
            order('q8', ['visited', 'We', 'yesterday', 'the museum'], 'We visited the museum yesterday.', 'Subject + past verb + object + time.', ['Yesterday we visited the museum.'])
        ]
    },
    {
        seedKey: 'grammar-intermediate-2', module: 'grammar', level: 'intermediate', order: 2,
        title: 'Prepositions: in, on and at',
        summary: 'Small words for time and place.',
        learn: {
            intro: 'Prepositions show where or when something is. In, on and at are the most common, and the most often mixed up.',
            points: [
                'Time: "at" for an exact time (at 7 o\'clock, at night); "on" for days and dates (on Monday, on 15 August); "in" for months, years and parts of the day (in May, in 2025, in the morning).',
                'Place: "at" for a point (at the bus stop); "on" for a surface (on the table); "in" for inside an area (in the room, in Bengaluru).',
                'Other useful prepositions: under, between (two things), next to, behind, in front of.'
            ],
            examples: ['The class starts at 9 a.m.', 'My birthday is in June.', 'The keys are on the table.', 'She lives in Mysuru.']
        },
        practice: [
            fill('p1', 'The class starts ___ 9 a.m.', 'at', 'Use "at" for an exact time.'),
            fill('p2', 'My birthday is ___ June.', 'in', 'Use "in" for months.'),
            mcq('p3', 'The keys are ___ the table.', ['on', 'in', 'at'], 'on', 'The table is a surface, so we use "on".'),
            mcq('p4', 'We will meet ___ Friday.', ['on', 'in', 'at'], 'on', 'Use "on" for days.'),
            fill('p5', 'She lives ___ Mysuru.', 'in', 'Use "in" for a city or town.'),
            fix('p6', 'I will see you in Monday.', 'I will see you on Monday.', 'Days take "on".')
        ],
        quiz: [
            fill('q1', 'He was born ___ 2005.', 'in', 'Use "in" for years.'),
            fill('q2', 'Wait for me ___ the bus stop.', 'at', 'A bus stop is a point, so we use "at".'),
            mcq('q3', 'The cat is hiding ___ the bed.', ['under', 'at', 'during'], 'under', '"Under" means below something.'),
            mcq('q4', 'We have a holiday ___ 26 January.', ['on', 'in', 'at'], 'on', 'Dates take "on".'),
            fill('q5', 'I usually read ___ night.', 'at', 'We say "at night".'),
            fix('q6', 'The books are in the shelf.', 'The books are on the shelf.', 'A shelf is a surface, so we use "on".'),
            fix('q7', 'She arrived at Bengaluru yesterday.', 'She arrived in Bengaluru yesterday.', 'With a city, we say "arrive in".'),
            mcq('q8', 'The bank is ___ the post office and the school.', ['between', 'among', 'at'], 'between', 'Use "between" for two things.')
        ]
    },
    {
        seedKey: 'grammar-advanced-1', module: 'grammar', level: 'advanced', order: 1,
        title: 'Perfect tenses',
        summary: 'Present perfect, past perfect and present perfect continuous.',
        learn: {
            intro: 'Perfect tenses connect two times: a past action and the present, or two actions in the past.',
            points: [
                'Present perfect (have / has + past participle): a past action that matters now, or an experience. "I have finished my work." "She has visited Delhi twice."',
                'It is often used with already, yet, just, ever, never, since and for.',
                'Use the simple past, not the present perfect, with a finished time: "I finished my work at 5 p.m." — not "I have finished at 5 p.m."',
                'Past perfect (had + past participle): an action finished before another past action. "When we reached the hall, the film had started."',
                'Present perfect continuous (have / has been + verb-ing): an action that started in the past and is still going on. "I have been studying for two hours."'
            ],
            examples: ['Have you ever been to Goa?', 'We have known each other for ten years.', 'By the time the guests arrived, we had cooked dinner.']
        },
        practice: [
            fill('p1', 'I ___ (finish) my assignment already.', 'have finished', '"Already" goes with the present perfect.'),
            mcq('p2', 'She ___ in Pune since 2019.', ['has lived', 'lived', 'lives'], 'has lived', '"Since 2019" connects the past to now, so we use the present perfect.'),
            mcq('p3', 'When I reached the station, the train ___.', ['had left', 'has left', 'leaves'], 'had left', 'The train left before I reached: the earlier action takes the past perfect.'),
            fix('p4', 'I have seen him yesterday.', 'I saw him yesterday.', '"Yesterday" is a finished time, so we use the simple past.'),
            fill('p5', 'They ___ (wait) for two hours now.', 'have been waiting', 'An action still going on takes the present perfect continuous.'),
            fix('p6', 'Have you ever went to Goa?', 'Have you ever been to Goa?', 'After "have", use the past participle: been (or gone).', ['Have you ever gone to Goa?'])
        ],
        quiz: [
            fill('q1', 'We ___ (know) each other for ten years.', 'have known', '"For ten years" up to now takes the present perfect.'),
            mcq('q2', 'By the time the guests arrived, we ___ dinner.', ['had cooked', 'have cooked', 'cook'], 'had cooked', 'Cooking happened before the guests arrived.'),
            mcq('q3', 'He ___ his keys, so he can\'t open the door.', ['has lost', 'had lost', 'loses'], 'has lost', 'A past action with a result now takes the present perfect.'),
            fix('q4', 'She has completed the course last month.', 'She completed the course last month.', '"Last month" is a finished time, so we use the simple past.'),
            fill('q5', 'I ___ (not / see) that movie yet.', 'have not seen', '"Yet" goes with the present perfect.', ['haven\'t seen']),
            fix('q6', 'I am working here since 2020.', 'I have been working here since 2020.', 'With "since", use the present perfect continuous (or the present perfect).', ['I have worked here since 2020.']),
            mcq('q7', 'Choose the correct sentence.', ['I had already eaten when she called.', 'I have already ate when she called.', 'I already had eat when she called.'], 'I had already eaten when she called.', 'Eating happened before she called: had + eaten.'),
            order('q8', ['started', 'The', 'has', 'meeting', 'just'], 'The meeting has just started.', '"Just" goes between "has" and the past participle.')
        ]
    },
    {
        seedKey: 'grammar-advanced-2', module: 'grammar', level: 'advanced', order: 2,
        title: 'Sentence structure',
        summary: 'Simple, compound and complex sentences, joining words, and questions.',
        learn: {
            intro: 'Good writing mixes short and long sentences. Joining words (conjunctions) connect ideas correctly.',
            points: [
                'A simple sentence has one main clause: "The students passed the exam."',
                'A compound sentence joins two main clauses with and, but, or or so: "I was tired, but I finished the work."',
                'A complex sentence has a main clause and a dependent clause with because, although, when, if, who or which: "Although it was raining, we went out."',
                'Do not use two joining words for one link: "Although he worked hard, he failed" — not "Although … but …".',
                'In questions, the helping verb comes before the subject: "Where are you going?" "Did she call?"',
                'Use "who" for people and "which" for things: "the girl who won", "the book which I bought".'
            ],
            examples: ['It was late, so we took a taxi.', 'I will call you when I reach home.', 'The man who helped us is my uncle.']
        },
        practice: [
            mcq('p1', 'Join the sentences: "It was late. We took a taxi."', ['It was late, so we took a taxi.', 'It was late, because we took a taxi.', 'Although it was late, so we took a taxi.'], 'It was late, so we took a taxi.', '"So" shows a result: it was late, and the result was the taxi.'),
            order('p2', ['home', 'I', 'because', 'stayed', 'it was raining'], 'I stayed home because it was raining.', 'Main clause first, then "because" and the reason.', ['Because it was raining, I stayed home.']),
            fix('p3', 'Although he worked hard, but he failed.', 'Although he worked hard, he failed.', 'Use only one joining word for one link.', ['He worked hard, but he failed.']),
            mcq('p4', 'Which is a complex sentence?', ['When the bell rang, the students left.', 'The bell rang and the students left.', 'The bell rang.'], 'When the bell rang, the students left.', '"When the bell rang" is a dependent clause joined to a main clause.'),
            order('p5', ['going', 'you', 'Where', 'are'], 'Where are you going?', 'Question word + helping verb + subject + verb.'),
            fill('p6', 'She was ill, ___ she went to work. (but / so)', 'but', '"But" shows a contrast: being ill and going to work do not match.')
        ],
        quiz: [
            mcq('q1', 'Choose the correct question.', ['What time does the class start?', 'What time the class starts?', 'What time does the class starts?'], 'What time does the class start?', 'Helping verb (does) before the subject, and the plain verb (start) after it.'),
            order('q2', ['is', 'The man', 'my uncle', 'who', 'helped us'], 'The man who helped us is my uncle.', '"Who helped us" describes the man and comes right after him.'),
            fix('q3', 'Because I was late. I missed the bus.', 'Because I was late, I missed the bus.', 'A "because" clause cannot stand alone as a sentence.', ['I missed the bus because I was late.']),
            fill('q4', 'I will call you ___ I reach home. (when / although)', 'when', '"When" tells us the time of calling.'),
            mcq('q5', 'Identify the compound sentence.', ['I wanted to go, but I was busy.', 'Although I was busy, I went.', 'I went to the shop.'], 'I wanted to go, but I was busy.', 'Two main clauses joined by "but".'),
            fix('q6', 'She is the girl which won the prize.', 'She is the girl who won the prize.', 'Use "who" for people.'),
            fill('q7', 'Take an umbrella ___ it rains. (in case / unless)', 'in case', '"In case" means "because it might".'),
            order('q8', ['hard', 'If', 'you', 'succeed', 'will', 'you', 'work'], 'If you work hard, you will succeed.', 'If + present, then will + verb.', ['You will succeed if you work hard.'])
        ]
    }
];
