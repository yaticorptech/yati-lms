/**
 * Linguistic Ability — English as the student's own language (asked
 * 2026-10-23): for an English speaker improving their English. Word meanings
 * are short English definitions; the tips speak to an English speaker; the
 * placement questions that quote Kannada are asked in English. Translation is
 * not for them (English into English), so its lessons are left out
 * (`skipModules`) and a level is complete without them.
 */
module.exports = {
    code: 'en', name: 'English', native: 'English', locale: 'en-IN',
    skipModules: ['translation'],
    words: {
        'vocab-beginner-1': {
            family: 'parents, children and relatives',
            mother: 'a female parent',
            father: 'a male parent',
            house: 'a building people live in',
            food: 'what people and animals eat',
            happy: 'feeling glad or pleased',
            big: 'large in size',
            small: 'little in size'
        },
        'vocab-beginner-2': {
            book: 'printed pages bound together to read',
            teacher: 'a person who teaches',
            student: 'a person who studies',
            friend: 'a person you like and trust',
            read: 'to look at words and understand them',
            write: 'to put words on paper or a screen',
            early: 'before the usual or expected time',
            easy: 'not difficult'
        },
        'vocab-intermediate-1': {
            honest: 'telling the truth',
            polite: 'speaking and acting with good manners',
            curious: 'wanting to know or learn',
            confident: 'sure of yourself',
            patient: 'able to wait calmly',
            grateful: 'thankful',
            anxious: 'worried and nervous',
            generous: 'happy to give or share'
        },
        'vocab-intermediate-2': {
            deadline: 'the latest time something must be done',
            improve: 'to make or become better',
            achieve: 'to succeed in doing something',
            schedule: 'a plan of times for things',
            opportunity: 'a chance to do something',
            responsible: 'in charge of something, or trusted to do it',
            discuss: 'to talk about something',
            result: 'what happens because of something'
        },
        'vocab-advanced-1': {
            negotiate: 'to discuss to reach an agreement',
            collaborate: 'to work together',
            efficient: 'working well without wasting time',
            feasible: 'possible to do',
            comprehensive: 'complete, including everything',
            prioritise: 'to decide what matters most',
            ambiguous: 'having more than one meaning',
            persuade: 'to make someone agree or act'
        },
        'vocab-advanced-2': {
            sustainable: 'able to continue without harm',
            consequence: 'a result of an action',
            perspective: 'a way of seeing things',
            inevitable: 'certain to happen',
            substantial: 'large in amount or importance',
            advocate: 'to support an idea publicly',
            diverse: 'varied, of many kinds',
            integrity: 'being honest and fair'
        }
    },
    learn: {
        'grammar-beginner-1': { kannadaNote: 'Many speakers say "a" before every word. Listen to the first sound, not the first letter: "an hour", "a university".' },
        'grammar-beginner-2': { points: { 4: 'The order of the words carries the meaning in English: "The dog bit the man" is not "The man bit the dog".' } }
    },
    items: {},
    placement: {
        b4: { prompt: 'Which word means "printed pages bound together to read"?', explanation: 'A book is printed pages bound together to read.' },
        a5: { prompt: '"The meeting has been put off until next week" means…', explanation: 'To put off something is to postpone it; "has been" makes it passive.' }
    }
};
