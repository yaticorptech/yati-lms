/**
 * Linguistic Ability — the placement test (predefined content).
 *
 * Fifteen questions in three bands of five, from beginner to advanced:
 * vocabulary, grammar, a little reading and translation in each. The score in
 * each band decides the recommended starting level (placementLevel, in
 * service.js): a student has to do well in a band, and in the bands below it,
 * to be placed there.
 */
const q = (id, band, prompt, options, answer, explanation) => ({ id, band, type: 'mcq', prompt, options, answer, explanation });

module.exports = [
    q('b1', 'beginner', 'Choose the correct word: She ___ a student.', ['is', 'are', 'am', 'be'], 'is', 'With "she" we use "is".'),
    q('b2', 'beginner', 'What is the opposite of "big"?', ['small', 'tall', 'long', 'fast'], 'small', 'Big and small are opposites.'),
    q('b3', 'beginner', 'I eat ___ apple every day.', ['an', 'a', 'two', 'many'], 'an', '"Apple" begins with a vowel sound, so we use "an".'),
    q('b4', 'beginner', '"ಪುಸ್ತಕ" in English is…', ['book', 'pen', 'table', 'bag'], 'book', 'ಪುಸ್ತಕ means book.'),
    q('b5', 'beginner', 'Which sentence is correct?', ['They are playing.', 'They is playing.', 'They am playing.', 'They be playing.'], 'They are playing.', 'With "they" we use "are".'),
    q('i1', 'intermediate', 'Yesterday, I ___ to the market.', ['went', 'go', 'gone', 'going'], 'went', '"Yesterday" needs the past tense: went.'),
    q('i2', 'intermediate', 'The meeting is ___ Monday.', ['on', 'in', 'at', 'by'], 'on', 'Days of the week take "on".'),
    q('i3', 'intermediate', 'What does "improve" mean?', ['to make better', 'to make worse', 'to stop', 'to forget'], 'to make better', 'To improve is to make something better.'),
    q('i4', 'intermediate', 'Choose the correct sentence.', ['He doesn\'t like coffee.', 'He don\'t like coffee.', 'He not like coffee.', 'He doesn\'t likes coffee.'], 'He doesn\'t like coffee.', 'With "he" we use "doesn\'t" and the plain verb "like".'),
    q('i5', 'intermediate', '"Ravi missed the bus, so he took an auto to college." Why did Ravi take an auto?', ['Because he missed the bus', 'Because it was cheaper', 'Because his friend asked him', 'Because it was raining'], 'Because he missed the bus', '"So" tells us the reason: he missed the bus.'),
    q('a1', 'advanced', 'By the time we reached the station, the train ___.', ['had left', 'has left', 'leaves', 'was leave'], 'had left', 'The train left before we reached: the past perfect.'),
    q('a2', 'advanced', 'Which word is closest in meaning to "inevitable"?', ['unavoidable', 'unlikely', 'unusual', 'unknown'], 'unavoidable', 'Inevitable means certain to happen: unavoidable.'),
    q('a3', 'advanced', 'If I ___ more time, I would learn French.', ['had', 'have', 'will have', 'am having'], 'had', 'An imagined situation: "If I had…, I would…".'),
    q('a4', 'advanced', 'Which sentence is correctly punctuated?', ['However, the results were better than expected.', 'However the results, were better than expected.', 'However; the results were better than expected.', 'However the results were better, than expected.'], 'However, the results were better than expected.', 'A comma follows "However" at the start of a sentence.'),
    q('a5', 'advanced', '"ಸಭೆಯನ್ನು ಮುಂದೂಡಲಾಗಿದೆ" best translates as…', ['The meeting has been postponed.', 'The meeting has started.', 'The meeting was cancelled for ever.', 'The meeting is in the hall.'], 'The meeting has been postponed.', 'ಮುಂದೂಡು means postpone, and -ಲಾಗಿದೆ is passive: "has been".')
];
