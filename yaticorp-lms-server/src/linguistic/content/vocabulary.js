/**
 * Linguistic Ability — Vocabulary Builder lessons (seed content).
 *
 * Each word: the English word, its Kannada meaning, part of speech, an
 * example sentence, and synonyms and antonyms where they apply. The quiz and
 * the daily challenge are built from these words (linguistic/vocabQuiz.js),
 * so an administrator adds words and the questions follow.
 *
 * `seedKey` identifies a seeded lesson: the seed never overwrites a lesson an
 * administrator has edited (seed.js).
 */
// Each word's recording is in the server's public/linguistic/audio folder
// (scripts/makeLinguisticAudio.js); the student page plays it.
const slug = (word) => word.toLowerCase().replace(/[^a-z]+/g, '-');
const w = (word, kannada, pos, example, synonyms = [], antonyms = []) => ({ word, kannada, pos, example, synonyms, antonyms, audio: `/linguistic/audio/word-${slug(word)}.m4a` });

module.exports = [
    {
        seedKey: 'vocab-beginner-1', module: 'vocabulary', level: 'beginner', order: 1,
        title: 'Home and family',
        summary: 'Everyday words about your home, your family and how you feel.',
        learn: {
            intro: 'Learn each word with its Kannada meaning. Read the example sentence aloud to remember how the word is used.',
            points: ['Say the word, then its meaning, then the sentence.', 'Try to make your own sentence with each word.']
        },
        words: [
            w('family', 'ಕುಟುಂಬ', 'noun', 'My family lives in Mysuru.', ['household']),
            w('mother', 'ತಾಯಿ', 'noun', 'My mother cooks tasty food.', ['mom', 'mum']),
            w('father', 'ತಂದೆ', 'noun', 'My father goes to work by bus.', ['dad']),
            w('house', 'ಮನೆ', 'noun', 'Our house has a small garden.', ['home']),
            w('food', 'ಆಹಾರ, ಊಟ', 'noun', 'We should not waste food.', ['meal']),
            w('happy', 'ಸಂತೋಷ, ಖುಷಿ', 'adjective', 'I am happy to see you.', ['glad', 'joyful'], ['sad']),
            w('big', 'ದೊಡ್ಡ', 'adjective', 'An elephant is a big animal.', ['large'], ['small']),
            w('small', 'ಚಿಕ್ಕ', 'adjective', 'The kitten is very small.', ['little', 'tiny'], ['big'])
        ]
    },
    {
        seedKey: 'vocab-beginner-2', module: 'vocabulary', level: 'beginner', order: 2,
        title: 'At school and college',
        summary: 'Words you use every day in class.',
        learn: {
            intro: 'These are words you will hear and use in class every day.',
            points: ['Notice the action words (verbs): read and write.', 'Opposites help you remember: early and late, easy and difficult.']
        },
        words: [
            w('book', 'ಪುಸ್ತಕ', 'noun', 'Please open your book to page ten.'),
            w('teacher', 'ಶಿಕ್ಷಕ, ಶಿಕ್ಷಕಿ', 'noun', 'Our teacher explains every lesson clearly.', ['tutor'], ['student']),
            w('student', 'ವಿದ್ಯಾರ್ಥಿ', 'noun', 'Every student must bring an ID card.', ['learner'], ['teacher']),
            w('friend', 'ಸ್ನೇಹಿತ, ಗೆಳೆಯ', 'noun', 'Ravi is my best friend.', ['pal', 'mate'], ['enemy']),
            w('read', 'ಓದು', 'verb', 'I read the newspaper every morning.'),
            w('write', 'ಬರೆ', 'verb', 'Write your name at the top of the page.'),
            w('early', 'ಬೇಗ', 'adverb', 'She reached college early today.', ['soon'], ['late']),
            w('easy', 'ಸುಲಭ', 'adjective', 'The first question was easy.', ['simple'], ['difficult', 'hard'])
        ]
    },
    {
        seedKey: 'vocab-intermediate-1', module: 'vocabulary', level: 'intermediate', order: 1,
        title: 'Feelings and character',
        summary: 'Words that describe people and how they behave.',
        learn: {
            intro: 'These adjectives describe a person\'s character or feelings. They are useful in essays, interviews and everyday talk.',
            points: ['Many opposites are made with a prefix: honest → dishonest, patient → impatient, grateful → ungrateful.', 'Use these words with "very", "quite" or "always" to sound natural: "She is always polite."']
        },
        words: [
            w('honest', 'ಪ್ರಾಮಾಣಿಕ', 'adjective', 'An honest person always tells the truth.', ['truthful', 'sincere'], ['dishonest']),
            w('polite', 'ವಿನಯಶೀಲ', 'adjective', 'Please be polite to everyone you meet.', ['courteous', 'respectful'], ['rude']),
            w('curious', 'ಕುತೂಹಲವುಳ್ಳ', 'adjective', 'Curious students ask a lot of questions.', ['inquisitive'], ['uninterested']),
            w('confident', 'ಆತ್ಮವಿಶ್ವಾಸವುಳ್ಳ', 'adjective', 'She felt confident before the exam.', ['self-assured', 'sure'], ['nervous', 'unsure']),
            w('patient', 'ತಾಳ್ಮೆಯುಳ್ಳ', 'adjective', 'A good teacher is patient with every student.', ['calm', 'tolerant'], ['impatient']),
            w('grateful', 'ಕೃತಜ್ಞ', 'adjective', 'I am grateful for your help.', ['thankful'], ['ungrateful']),
            w('anxious', 'ಆತಂಕಗೊಂಡ', 'adjective', 'He was anxious about his results.', ['worried', 'nervous'], ['calm', 'relaxed']),
            w('generous', 'ಉದಾರ', 'adjective', 'Our neighbour is generous and shares food with everyone.', ['kind', 'giving'], ['selfish', 'mean'])
        ]
    },
    {
        seedKey: 'vocab-intermediate-2', module: 'vocabulary', level: 'intermediate', order: 2,
        title: 'Work and study',
        summary: 'Words for planning, working and achieving goals.',
        learn: {
            intro: 'These words often appear in college notices, emails and job interviews.',
            points: ['Some are verbs (improve, achieve, discuss) and some are nouns (deadline, schedule, result).', 'Learn the noun forms too: improve → improvement, achieve → achievement.']
        },
        words: [
            w('deadline', 'ಗಡುವು, ಕೊನೆಯ ದಿನಾಂಕ', 'noun', 'The deadline for the project is Friday.', ['due date', 'time limit']),
            w('improve', 'ಸುಧಾರಿಸು', 'verb', 'Reading every day will improve your English.', ['enhance', 'develop'], ['worsen']),
            w('achieve', 'ಸಾಧಿಸು', 'verb', 'You can achieve your goals with hard work.', ['accomplish', 'reach'], ['fail']),
            w('schedule', 'ವೇಳಾಪಟ್ಟಿ', 'noun', 'Check the exam schedule on the notice board.', ['timetable', 'plan']),
            w('opportunity', 'ಅವಕಾಶ', 'noun', 'This internship is a great opportunity.', ['chance']),
            w('responsible', 'ಜವಾಬ್ದಾರಿಯುತ', 'adjective', 'She is responsible for the class accounts.', ['accountable', 'reliable'], ['careless', 'irresponsible']),
            w('discuss', 'ಚರ್ಚಿಸು', 'verb', 'Let us discuss the problem after class.', ['talk about', 'debate']),
            w('result', 'ಫಲಿತಾಂಶ', 'noun', 'The exam result will be announced tomorrow.', ['outcome'], ['cause'])
        ]
    },
    {
        seedKey: 'vocab-advanced-1', module: 'vocabulary', level: 'advanced', order: 1,
        title: 'Professional communication',
        summary: 'Words for meetings, emails and teamwork at the workplace.',
        learn: {
            intro: 'These words are common in offices, interviews and formal emails. Using them correctly makes you sound clear and professional.',
            points: ['British spelling (prioritise) and American spelling (prioritize) are both correct.', 'Notice the word families: negotiate → negotiation, collaborate → collaboration, efficient → efficiency.']
        },
        words: [
            w('negotiate', 'ಮಾತುಕತೆ ನಡೆಸು, ಸಂಧಾನ ಮಾಡು', 'verb', 'We negotiated a better price with the supplier.', ['bargain', 'discuss terms']),
            w('collaborate', 'ಸಹಯೋಗ ಮಾಡು, ಜೊತೆಯಾಗಿ ಕೆಲಸ ಮಾಡು', 'verb', 'Our team collaborated with designers in Pune.', ['cooperate', 'work together']),
            w('efficient', 'ದಕ್ಷ', 'adjective', 'An efficient worker saves time and money.', ['productive', 'effective'], ['inefficient', 'wasteful']),
            w('feasible', 'ಕಾರ್ಯಸಾಧ್ಯ', 'adjective', 'Is it feasible to finish the work by Monday?', ['practical', 'possible'], ['impossible', 'impractical']),
            w('comprehensive', 'ಸಮಗ್ರ', 'adjective', 'The report gives a comprehensive picture of our sales.', ['thorough', 'complete'], ['partial', 'limited']),
            w('prioritise', 'ಆದ್ಯತೆ ನೀಡು', 'verb', 'Prioritise the urgent tasks first.', ['put first', 'rank']),
            w('ambiguous', 'ಅಸ್ಪಷ್ಟ', 'adjective', 'The instructions were ambiguous, so I asked for clarification.', ['unclear', 'vague'], ['clear', 'definite']),
            w('persuade', 'ಮನವೊಲಿಸು', 'verb', 'She persuaded the manager to try the new plan.', ['convince'], ['discourage'])
        ]
    },
    {
        seedKey: 'vocab-advanced-2', module: 'vocabulary', level: 'advanced', order: 2,
        title: 'Ideas and society',
        summary: 'Words for discussing issues, opinions and the world around us.',
        learn: {
            intro: 'These words help you write essays and take part in group discussions.',
            points: ['"Consequence" is often used for a result that is not good: "Think about the consequences."', 'Some words have a related verb or noun: advocate (verb and noun), diverse → diversity.']
        },
        words: [
            w('sustainable', 'ಸುಸ್ಥಿರ', 'adjective', 'Solar power is a sustainable source of energy.', ['renewable', 'lasting'], ['unsustainable']),
            w('consequence', 'ಪರಿಣಾಮ', 'noun', 'Every action has a consequence.', ['result', 'effect'], ['cause']),
            w('perspective', 'ದೃಷ್ಟಿಕೋನ', 'noun', 'Try to see the problem from her perspective.', ['viewpoint', 'point of view']),
            w('inevitable', 'ಅನಿವಾರ್ಯ', 'adjective', 'Change is inevitable in every organisation.', ['unavoidable', 'certain'], ['avoidable', 'uncertain']),
            w('substantial', 'ಗಣನೀಯ', 'adjective', 'There has been a substantial increase in prices.', ['considerable', 'large'], ['small', 'minor']),
            w('advocate', 'ಪ್ರತಿಪಾದಿಸು, ಸಮರ್ಥಿಸು', 'verb', 'Many doctors advocate regular exercise.', ['support', 'recommend'], ['oppose']),
            w('diverse', 'ವೈವಿಧ್ಯಮಯ', 'adjective', 'India is a diverse country with many languages.', ['varied', 'different'], ['uniform', 'similar']),
            w('integrity', 'ಪ್ರಾಮಾಣಿಕತೆ, ನೈತಿಕ ನಿಷ್ಠೆ', 'noun', 'A leader must act with integrity.', ['honesty', 'honour'], ['dishonesty'])
        ]
    }
];
