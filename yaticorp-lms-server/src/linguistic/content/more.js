/**
 * New lessons for the units that had fewer than six (2026-11-14, the user: "in each unit keep 6 lessons … add more
 * lessons if there are fewer"; then "a new lesson can't be the same as the lessons before — don't copy from them").
 * Each unit's "More words" (four words its lessons do not have) and "Phrases" (sentences none of its lessons has),
 * in English, Kannada and Hindi — the courses open to learn (2026-11-13). Keyed by level, then "order:part" (the
 * unit: a topic and its first or second half, parts.js).
 *
 * A word: { en, kn, hi, pic, def } — `def`, its meaning in English for one who learns English in English.
 * A phrase: { en, kn, hi, read, acc } — `read`: read in the language learnt and written in the student's own
 * (else the other way round); `acc`: other right answers, by language (a Hindi sentence said by a girl or a boy).
 * `en: true` on a unit: English learners get its "More words" too (an English unit that had five lessons).
 * `phrases: false`: no "Phrases" lesson (a unit that needed only one more).
 *
 * Written here, with no outside service: a native speaker should check them.
 */
module.exports = {
    beginner: {
        '1:1': {
            phrases: false,
            words: [
                { en: 'son', kn: 'ಮಗ', hi: 'बेटा', pic: '👦', def: 'a male child of a mother and father' },
                { en: 'daughter', kn: 'ಮಗಳು', hi: 'बेटी', pic: '👧', def: 'a female child of a mother and father' },
                { en: 'grandmother', kn: 'ಅಜ್ಜಿ', hi: 'दादी', pic: '👵', def: 'the mother of your father or mother' },
                { en: 'grandfather', kn: 'ಅಜ್ಜ', hi: 'दादा', pic: '👴', def: 'the father of your father or mother' }
            ]
        },
        '1:2': {
            words: [
                { en: 'water', kn: 'ನೀರು', hi: 'पानी', pic: '💧', def: 'the clear liquid we drink' },
                { en: 'rice', kn: 'ಅನ್ನ', hi: 'चावल', pic: '🍚', def: 'white grains we cook and eat' },
                { en: 'sweet', kn: 'ಸಿಹಿ', hi: 'मीठा', pic: '🍬', def: 'tasting like sugar' },
                { en: 'anger', kn: 'ಕೋಪ', hi: 'गुस्सा', pic: '😠', def: 'a strong feeling when something is wrong' }
            ],
            phrases: [
                { read: true, en: 'I drink water.', kn: 'ನಾನು ನೀರು ಕುಡಿಯುತ್ತೇನೆ.', hi: 'मैं पानी पीता हूँ।', acc: { hi: ['मैं पानी पीती हूँ।'] } },
                { en: 'The rice is hot.', kn: 'ಅನ್ನ ಬಿಸಿಯಾಗಿದೆ.', hi: 'चावल गरम है।' },
                { read: true, en: 'The mango is sweet.', kn: 'ಮಾವಿನಹಣ್ಣು ಸಿಹಿಯಾಗಿದೆ.', hi: 'आम मीठा है।' },
                { en: 'Do not get angry.', kn: 'ಕೋಪ ಮಾಡಿಕೊಳ್ಳಬೇಡ.', hi: 'गुस्सा मत करो।', acc: { en: ["Don't get angry."] } },
                { en: 'I am hungry.', kn: 'ನನಗೆ ಹಸಿವಾಗಿದೆ.', hi: 'मुझे भूख लगी है।' }
            ]
        },
        '2:1': {
            en: true,
            words: [
                { en: 'class', kn: 'ತರಗತಿ', hi: 'कक्षा', pic: '🏫', def: 'a group of students who learn together' },
                { en: 'pen', kn: 'ಪೆನ್ನು', hi: 'कलम', pic: '🖊️', def: 'a thing we write with, using ink' },
                { en: 'lesson', kn: 'ಪಾಠ', hi: 'पाठ', pic: '📖', def: 'a time when something is taught' },
                { en: 'bag', kn: 'ಚೀಲ', hi: 'बस्ता', pic: '🎒', def: 'a thing we carry books and other things in' }
            ],
            phrases: [
                { read: true, en: 'This is my pen.', kn: 'ಇದು ನನ್ನ ಪೆನ್ನು.', hi: 'यह मेरी कलम है।' },
                { en: 'Open your bag.', kn: 'ನಿನ್ನ ಚೀಲ ತೆರೆ.', hi: 'अपना बस्ता खोलो।', acc: { kn: ['ನಿಮ್ಮ ಚೀಲ ತೆರೆಯಿರಿ.'] } },
                { read: true, en: 'Our class is big.', kn: 'ನಮ್ಮ ತರಗತಿ ದೊಡ್ಡದು.', hi: 'हमारी कक्षा बड़ी है।' },
                { en: 'The teacher teaches a lesson.', kn: 'ಶಿಕ್ಷಕರು ಪಾಠ ಮಾಡುತ್ತಾರೆ.', hi: 'शिक्षक पाठ पढ़ाते हैं।' },
                { en: 'Where is my friend?', kn: 'ನನ್ನ ಸ್ನೇಹಿತ ಎಲ್ಲಿ?', hi: 'मेरा दोस्त कहाँ है?', acc: { kn: ['ನನ್ನ ಸ್ನೇಹಿತ ಎಲ್ಲಿದ್ದಾನೆ?'], hi: ['मेरा मित्र कहाँ है?'] } }
            ]
        },
        '2:2': {
            words: [
                { en: 'letter', kn: 'ಪತ್ರ', hi: 'पत्र', pic: '✉️', def: 'a written message sent to someone' },
                { en: 'page', kn: 'ಪುಟ', hi: 'पन्ना', pic: '📄', def: 'one side of a sheet of paper in a book' },
                { en: 'difficult', kn: 'ಕಷ್ಟ', hi: 'कठिन', pic: '🧗', def: 'not easy to do or understand' },
                { en: 'late', kn: 'ತಡ', hi: 'देर', pic: '⏰', def: 'after the right time' }
            ],
            phrases: [
                { read: true, en: 'I read a letter.', kn: 'ನಾನು ಪತ್ರ ಓದುತ್ತೇನೆ.', hi: 'मैं पत्र पढ़ता हूँ।', acc: { hi: ['मैं पत्र पढ़ती हूँ।'] } },
                { en: 'Turn the page.', kn: 'ಪುಟ ತಿರುಗಿಸು.', hi: 'पन्ना पलटो।' },
                { read: true, en: 'This question is difficult.', kn: 'ಈ ಪ್ರಶ್ನೆ ಕಷ್ಟ.', hi: 'यह सवाल कठिन है।' },
                { en: 'Do not be late.', kn: 'ತಡ ಮಾಡಬೇಡ.', hi: 'देर मत करो।', acc: { en: ["Don't be late."] } },
                { en: 'I write my name.', kn: 'ನಾನು ನನ್ನ ಹೆಸರು ಬರೆಯುತ್ತೇನೆ.', hi: 'मैं अपना नाम लिखता हूँ।', acc: { hi: ['मैं अपना नाम लिखती हूँ।'] } }
            ]
        },
        '3:1': {
            en: true,
            words: [
                { en: 'car', kn: 'ಕಾರು', hi: 'कार', pic: '🚗', def: 'a vehicle with four wheels that a person drives' },
                { en: 'bicycle', kn: 'ಸೈಕಲ್', hi: 'साइकिल', pic: '🚲', def: 'a vehicle with two wheels that you pedal' },
                { en: 'station', kn: 'ನಿಲ್ದಾಣ', hi: 'स्टेशन', pic: '🚉', def: 'a place where trains or buses stop' },
                { en: 'bridge', kn: 'ಸೇತುವೆ', hi: 'पुल', pic: '🌉', def: 'a way built over a river or road' }
            ],
            phrases: [
                { read: true, en: 'This is our car.', kn: 'ಇದು ನಮ್ಮ ಕಾರು.', hi: 'यह हमारी कार है।' },
                { en: 'I ride a bicycle.', kn: 'ನಾನು ಸೈಕಲ್ ಓಡಿಸುತ್ತೇನೆ.', hi: 'मैं साइकिल चलाता हूँ।', acc: { hi: ['मैं साइकिल चलाती हूँ।'] } },
                { read: true, en: 'The railway station is far.', kn: 'ರೈಲು ನಿಲ್ದಾಣ ದೂರವಿದೆ.', hi: 'रेलवे स्टेशन दूर है।' },
                { en: 'Cross the bridge.', kn: 'ಸೇತುವೆ ದಾಟು.', hi: 'पुल पार करो।' },
                { en: 'Stop the car here.', kn: 'ಕಾರನ್ನು ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ.', hi: 'कार यहाँ रोको।' }
            ]
        },
        '3:2': {
            words: [
                { en: 'wind', kn: 'ಗಾಳಿ', hi: 'हवा', pic: '🌬️', def: 'air that moves' },
                { en: 'cloud', kn: 'ಮೋಡ', hi: 'बादल', pic: '☁️', def: 'a white or grey mass in the sky' },
                { en: 'sky', kn: 'ಆಕಾಶ', hi: 'आसमान', pic: '🌌', def: 'the space above the earth' },
                { en: 'umbrella', kn: 'ಕೊಡೆ', hi: 'छाता', pic: '☂️', def: 'a thing you hold over your head in the rain' }
            ],
            phrases: [
                { read: true, en: 'A strong wind is blowing.', kn: 'ಗಾಳಿ ಜೋರಾಗಿ ಬೀಸುತ್ತಿದೆ.', hi: 'तेज़ हवा चल रही है।' },
                { en: 'The sky is blue.', kn: 'ಆಕಾಶ ನೀಲಿಯಾಗಿದೆ.', hi: 'आसमान नीला है।' },
                { read: true, en: 'There are clouds in the sky.', kn: 'ಆಕಾಶದಲ್ಲಿ ಮೋಡಗಳಿವೆ.', hi: 'आसमान में बादल हैं।' },
                { en: 'Open the umbrella.', kn: 'ಕೊಡೆ ಬಿಚ್ಚು.', hi: 'छाता खोलो।' },
                { en: 'Today the weather is nice.', kn: 'ಇಂದು ವಾತಾವರಣ ಚೆನ್ನಾಗಿದೆ.', hi: 'आज मौसम अच्छा है।', acc: { en: ['The weather is nice today.'] } }
            ]
        },
        '4:1': {
            en: true,
            words: [
                { en: 'night', kn: 'ರಾತ್ರಿ', hi: 'रात', pic: '🌙', def: 'the dark time between evening and morning' },
                { en: 'today', kn: 'ಇಂದು', hi: 'आज', pic: '📅', def: 'this day' },
                { en: 'tomorrow', kn: 'ನಾಳೆ', hi: 'कल', pic: '➡️', def: 'the day after today' },
                { en: 'month', kn: 'ತಿಂಗಳು', hi: 'महीना', pic: '🗓️', def: 'one of the twelve parts of a year' }
            ],
            phrases: [
                { read: true, en: 'Today is Monday.', kn: 'ಇಂದು ಸೋಮವಾರ.', hi: 'आज सोमवार है।' },
                { en: 'I will come tomorrow.', kn: 'ನಾನು ನಾಳೆ ಬರುತ್ತೇನೆ.', hi: 'मैं कल आऊँगा।', acc: { hi: ['मैं कल आऊँगी।'] } },
                { read: true, en: 'There are twelve months in a year.', kn: 'ಒಂದು ವರ್ಷದಲ್ಲಿ ಹನ್ನೆರಡು ತಿಂಗಳುಗಳಿವೆ.', hi: 'एक साल में बारह महीने होते हैं।' },
                { en: 'Good night.', kn: 'ಶುಭ ರಾತ್ರಿ.', hi: 'शुभ रात्रि।' },
                { en: 'What is the date today?', kn: 'ಇಂದು ದಿನಾಂಕ ಎಷ್ಟು?', hi: 'आज तारीख क्या है?' }
            ]
        },
        '4:2': {
            words: [
                { en: 'lunch', kn: 'ಮಧ್ಯಾಹ್ನದ ಊಟ', hi: 'दोपहर का खाना', pic: '🍱', def: 'the meal in the middle of the day' },
                { en: 'bath', kn: 'ಸ್ನಾನ', hi: 'स्नान', pic: '🛁', def: 'washing your body with water' },
                { en: 'work', kn: 'ಕೆಲಸ', hi: 'काम', pic: '💼', def: 'a job, or something you do to earn money' },
                { en: 'dinner', kn: 'ರಾತ್ರಿಯ ಊಟ', hi: 'रात का खाना', pic: '🍽️', def: 'the meal in the evening' }
            ],
            phrases: [
                { read: true, en: 'I take a bath in the morning.', kn: 'ನಾನು ಬೆಳಿಗ್ಗೆ ಸ್ನಾನ ಮಾಡುತ್ತೇನೆ.', hi: 'मैं सुबह नहाता हूँ।', acc: { hi: ['मैं सुबह नहाती हूँ।'] } },
                { en: 'Lunch is ready.', kn: 'ಮಧ್ಯಾಹ್ನದ ಊಟ ಸಿದ್ಧವಾಗಿದೆ.', hi: 'दोपहर का खाना तैयार है।', acc: { kn: ['ಊಟ ಸಿದ್ಧವಾಗಿದೆ.'] } },
                { read: true, en: 'Mother goes to work.', kn: 'ಅಮ್ಮ ಕೆಲಸಕ್ಕೆ ಹೋಗುತ್ತಾರೆ.', hi: 'माँ काम पर जाती हैं।' },
                { en: 'We eat dinner together.', kn: 'ನಾವು ಒಟ್ಟಿಗೆ ರಾತ್ರಿಯ ಊಟ ಮಾಡುತ್ತೇವೆ.', hi: 'हम साथ में रात का खाना खाते हैं।' },
                { en: 'I do my homework in the evening.', kn: 'ನಾನು ಸಂಜೆ ಮನೆಕೆಲಸ ಮಾಡುತ್ತೇನೆ.', hi: 'मैं शाम को गृहकार्य करता हूँ।', acc: { hi: ['मैं शाम को गृहकार्य करती हूँ।', 'मैं शाम को होमवर्क करता हूँ।', 'मैं शाम को होमवर्क करती हूँ।'] } }
            ]
        },
        // The Level review's sixth (2026-11-14, the user chose new lessons for it too): a story with the section's
        // everyday words — family, food, the bus, rain — that no lesson has, with questions on it.
        review: {
            name: 'Level review',
            story: { for: ['en', 'kn', 'hi'],
                title: { en: 'A day at the fair', kn: 'ಜಾತ್ರೆಯಲ್ಲಿ ಒಂದು ದಿನ', hi: 'मेले में एक दिन' },
                text: {
                    en: 'On Sunday, Asha went to the fair with her family. Her father bought her a red balloon. Her mother bought sweets for everyone. Asha’s little brother rode on a small train. In the evening it began to rain, so they took a bus home. Asha was tired but very happy.',
                    kn: 'ಭಾನುವಾರ ಆಶಾ ತನ್ನ ಕುಟುಂಬದೊಂದಿಗೆ ಜಾತ್ರೆಗೆ ಹೋದಳು. ಅವಳ ಅಪ್ಪ ಅವಳಿಗೆ ಕೆಂಪು ಬಲೂನು ಕೊಡಿಸಿದರು. ಅವಳ ಅಮ್ಮ ಎಲ್ಲರಿಗೂ ಸಿಹಿ ಕೊಡಿಸಿದರು. ಆಶಾಳ ತಮ್ಮ ಚಿಕ್ಕ ರೈಲಿನಲ್ಲಿ ಸವಾರಿ ಮಾಡಿದನು. ಸಂಜೆ ಮಳೆ ಶುರುವಾಯಿತು, ಆದ್ದರಿಂದ ಅವರು ಬಸ್ಸಿನಲ್ಲಿ ಮನೆಗೆ ಬಂದರು. ಆಶಾ ದಣಿದಿದ್ದಳು, ಆದರೆ ತುಂಬಾ ಖುಷಿಯಾಗಿದ್ದಳು.',
                    hi: 'रविवार को आशा अपने परिवार के साथ मेले में गई। उसके पिता ने उसके लिए एक लाल गुब्बारा खरीदा। उसकी माँ ने सबके लिए मिठाई खरीदी। आशा का छोटा भाई एक छोटी रेलगाड़ी में बैठा। शाम को बारिश शुरू हो गई, इसलिए वे बस से घर लौटे। आशा थकी हुई थी, लेकिन बहुत खुश थी।'
                },
                questions: [
                    { q: { en: 'When did Asha go to the fair?', kn: 'ಆಶಾ ಜಾತ್ರೆಗೆ ಯಾವಾಗ ಹೋದಳು?', hi: 'आशा मेले में कब गई?' },
                        options: [{ en: 'On Sunday', kn: 'ಭಾನುವಾರ', hi: 'रविवार को' }, { en: 'On Monday', kn: 'ಸೋಮವಾರ', hi: 'सोमवार को' }, { en: 'On Friday', kn: 'ಶುಕ್ರವಾರ', hi: 'शुक्रवार को' }, { en: 'On Saturday', kn: 'ಶನಿವಾರ', hi: 'शनिवार को' }] },
                    { q: { en: 'What did her father buy her?', kn: 'ಅವಳ ಅಪ್ಪ ಅವಳಿಗೆ ಏನು ಕೊಡಿಸಿದರು?', hi: 'उसके पिता ने उसके लिए क्या खरीदा?' },
                        options: [{ en: 'A red balloon', kn: 'ಕೆಂಪು ಬಲೂನು', hi: 'लाल गुब्बारा' }, { en: 'Sweets', kn: 'ಸಿಹಿ', hi: 'मिठाई' }, { en: 'A book', kn: 'ಪುಸ್ತಕ', hi: 'किताब' }, { en: 'A toy train', kn: 'ಆಟದ ರೈಲು', hi: 'खिलौना रेलगाड़ी' }] },
                    { q: { en: 'How did they go home?', kn: 'ಅವರು ಮನೆಗೆ ಹೇಗೆ ಬಂದರು?', hi: 'वे घर कैसे लौटे?' },
                        options: [{ en: 'By bus', kn: 'ಬಸ್ಸಿನಲ್ಲಿ', hi: 'बस से' }, { en: 'By train', kn: 'ರೈಲಿನಲ್ಲಿ', hi: 'रेलगाड़ी से' }, { en: 'On foot', kn: 'ನಡೆದುಕೊಂಡು', hi: 'पैदल' }, { en: 'By car', kn: 'ಕಾರಿನಲ್ಲಿ', hi: 'कार से' }] }
                ] }
        }
    },
    // Section 2 (2026-11-14, its skills in units of six): each skill's last unit filled to six — after every topic
    // (orders 5 and 6 come after topics 1–4 in a skill's lessons, units.js), so the units before keep their lessons.
    // `for`: the courses that get it — Kannada and Hindi a skill's words, sentences and two stories; English its
    // sentences, four stories, two conversations and two writing tasks (and four talks, in talks.js).
    advanced: {
        '5:1': {
            name: 'Technology',
            words: { for: ['kn', 'hi'], list: [
                { en: 'innovation', kn: 'ನಾವೀನ್ಯತೆ', hi: 'नवाचार', pic: '💡', def: 'a new idea or way of doing something' },
                { en: 'research', kn: 'ಸಂಶೋಧನೆ', hi: 'अनुसंधान', pic: '🔬', def: 'careful study to find out new facts' },
                { en: 'device', kn: 'ಸಾಧನ', hi: 'उपकरण', pic: '📱', def: 'a machine or tool made for a purpose' },
                { en: 'network', kn: 'ಜಾಲ', hi: 'नेटवर्क', pic: '🌐', def: 'a group of connected people, computers or lines' }
            ] },
            phrases: { for: ['en', 'kn', 'hi'], list: [
                { read: true, en: 'Research takes a lot of time.', kn: 'ಸಂಶೋಧನೆಗೆ ತುಂಬಾ ಸಮಯ ಬೇಕು.', hi: 'अनुसंधान में बहुत समय लगता है।' },
                { en: 'Please switch off your devices.', kn: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಾಧನಗಳನ್ನು ಆಫ್ ಮಾಡಿ.', hi: 'कृपया अपने उपकरण बंद करें।', acc: { en: ['Please turn off your devices.'] } },
                { read: true, en: 'The internet connects the whole world.', kn: 'ಇಂಟರ್ನೆಟ್ ಇಡೀ ಜಗತ್ತನ್ನು ಸಂಪರ್ಕಿಸುತ್ತದೆ.', hi: 'इंटरनेट पूरी दुनिया को जोड़ता है।' },
                { en: 'New ideas help a company grow.', kn: 'ಹೊಸ ಆಲೋಚನೆಗಳು ಕಂಪನಿಯ ಬೆಳವಣಿಗೆಗೆ ಸಹಾಯ ಮಾಡುತ್ತವೆ.', hi: 'नए विचार कंपनी को बढ़ने में मदद करते हैं।' },
                { en: 'I will finish this work by evening.', kn: 'ನಾನು ಈ ಕೆಲಸವನ್ನು ಸಂಜೆಯೊಳಗೆ ಮುಗಿಸುತ್ತೇನೆ.', hi: 'मैं यह काम शाम तक पूरा कर दूँगा।', acc: { hi: ['मैं यह काम शाम तक पूरा कर दूँगी।', 'मैं यह काम शाम तक पूरा करूँगा।', 'मैं यह काम शाम तक पूरा करूँगी।'], en: ['I will finish this work by the evening.'] } }
            ] },
            story: { for: ['en', 'kn', 'hi'],
                title: { en: 'The new library', kn: 'ಹೊಸ ಗ್ರಂಥಾಲಯ', hi: 'नया पुस्तकालय' },
                text: {
                    en: 'Our village got a new library last year. Every evening, children come there to read. Meena, a college student, teaches them to use the computers. Now the children search the internet for their school projects. The library has become the busiest place in the village.',
                    kn: 'ಕಳೆದ ವರ್ಷ ನಮ್ಮ ಹಳ್ಳಿಗೆ ಹೊಸ ಗ್ರಂಥಾಲಯ ಬಂತು. ಪ್ರತಿ ಸಂಜೆ ಮಕ್ಕಳು ಅಲ್ಲಿ ಓದಲು ಬರುತ್ತಾರೆ. ಕಾಲೇಜು ವಿದ್ಯಾರ್ಥಿನಿ ಮೀನಾ ಅವರಿಗೆ ಕಂಪ್ಯೂಟರ್ ಬಳಸಲು ಕಲಿಸುತ್ತಾಳೆ. ಈಗ ಮಕ್ಕಳು ತಮ್ಮ ಶಾಲಾ ಯೋಜನೆಗಳಿಗಾಗಿ ಇಂಟರ್ನೆಟ್‌ನಲ್ಲಿ ಹುಡುಕುತ್ತಾರೆ. ಗ್ರಂಥಾಲಯ ಈಗ ಹಳ್ಳಿಯ ಅತ್ಯಂತ ಜನನಿಬಿಡ ಸ್ಥಳವಾಗಿದೆ.',
                    hi: 'पिछले साल हमारे गाँव में एक नया पुस्तकालय खुला। हर शाम बच्चे वहाँ पढ़ने आते हैं। कॉलेज की छात्रा मीना उन्हें कंप्यूटर चलाना सिखाती है। अब बच्चे अपने स्कूल के प्रोजेक्ट के लिए इंटरनेट पर खोज करते हैं। पुस्तकालय अब गाँव की सबसे व्यस्त जगह बन गया है।'
                },
                questions: [
                    { q: { en: 'When did the village get the library?', kn: 'ಹಳ್ಳಿಗೆ ಗ್ರಂಥಾಲಯ ಯಾವಾಗ ಬಂತು?', hi: 'गाँव में पुस्तकालय कब खुला?' },
                        options: [{ en: 'Last year', kn: 'ಕಳೆದ ವರ್ಷ', hi: 'पिछले साल' }, { en: 'This year', kn: 'ಈ ವರ್ಷ', hi: 'इस साल' }, { en: 'Ten years ago', kn: 'ಹತ್ತು ವರ್ಷಗಳ ಹಿಂದೆ', hi: 'दस साल पहले' }, { en: 'Last month', kn: 'ಕಳೆದ ತಿಂಗಳು', hi: 'पिछले महीने' }] },
                    { q: { en: 'Who teaches the children to use the computers?', kn: 'ಮಕ್ಕಳಿಗೆ ಕಂಪ್ಯೂಟರ್ ಬಳಸಲು ಯಾರು ಕಲಿಸುತ್ತಾರೆ?', hi: 'बच्चों को कंप्यूटर चलाना कौन सिखाता है?' },
                        options: [{ en: 'Meena', kn: 'ಮೀನಾ', hi: 'मीना' }, { en: 'A teacher', kn: 'ಒಬ್ಬ ಶಿಕ್ಷಕ', hi: 'एक शिक्षक' }, { en: 'The librarian', kn: 'ಗ್ರಂಥಪಾಲಕ', hi: 'पुस्तकालय अध्यक्ष' }, { en: 'Their parents', kn: 'ಅವರ ಪೋಷಕರು', hi: 'उनके माता-पिता' }] },
                    { q: { en: 'What is the library now?', kn: 'ಗ್ರಂಥಾಲಯ ಈಗ ಹೇಗಿದೆ?', hi: 'पुस्तकालय अब कैसा है?' },
                        options: [{ en: 'The busiest place in the village', kn: 'ಹಳ್ಳಿಯ ಅತ್ಯಂತ ಜನನಿಬಿಡ ಸ್ಥಳ', hi: 'गाँव की सबसे व्यस्त जगह' }, { en: 'Closed', kn: 'ಮುಚ್ಚಿದೆ', hi: 'बंद है' }, { en: 'Empty', kn: 'ಖಾಲಿ ಇದೆ', hi: 'खाली है' }, { en: 'Very small', kn: 'ತುಂಬಾ ಚಿಕ್ಕದು', hi: 'बहुत छोटा है' }] }
                ] },
            listen: { for: ['en'], title: 'Booking a doctor’s appointment',
                scenario: 'A phone call: Arjun books an appointment at a clinic.',
                speakers: [{ name: 'Receptionist', voice: 'f' }, { name: 'Arjun', voice: 'm' }],
                lines: [
                    ['Receptionist', 'Good morning, City Clinic. How can I help you?'],
                    ['Arjun', 'Good morning. I would like to book an appointment with Dr. Rao.'],
                    ['Receptionist', 'Of course. Is it for a check-up, or are you unwell?'],
                    ['Arjun', 'I have had a cough and a mild fever for three days.'],
                    ['Receptionist', 'Dr. Rao is free tomorrow at half past ten. Does that suit you?'],
                    ['Arjun', 'Yes, that works. Should I bring anything?'],
                    ['Receptionist', 'Please bring any old reports, and come ten minutes early.'],
                    ['Arjun', 'Thank you. See you tomorrow.']
                ],
                questions: [
                    { q: { en: 'Why does Arjun call the clinic?', kn: 'ಅರ್ಜುನ್ ಕ್ಲಿನಿಕ್‌ಗೆ ಏಕೆ ಕರೆ ಮಾಡುತ್ತಾನೆ?', hi: 'अर्जुन क्लिनिक में फ़ोन क्यों करता है?' }, options: ['To book an appointment with Dr. Rao', 'To cancel an appointment', 'To ask for a job', 'To order some medicine'] },
                    { q: { en: 'How long has Arjun had a cough?', kn: 'ಅರ್ಜುನ್‌ಗೆ ಎಷ್ಟು ದಿನಗಳಿಂದ ಕೆಮ್ಮು ಇದೆ?', hi: 'अर्जुन को कितने दिनों से खाँसी है?' }, options: ['For three days', 'For a week', 'For two hours', 'For a month'] },
                    { q: { en: 'When is the appointment?', kn: 'ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಯಾವಾಗ?', hi: 'अपॉइंटमेंट कब है?' }, options: ['Tomorrow at half past ten', 'Today at ten o’clock', 'Tomorrow at half past two', 'Next week at nine'] },
                    { q: { en: 'What should Arjun bring?', kn: 'ಅರ್ಜುನ್ ಏನು ತರಬೇಕು?', hi: 'अर्जुन को क्या लाना चाहिए?' }, options: ['His old reports', 'A friend', 'Some fruit', 'A letter from college'] }
                ],
                speaking: {
                    prompt: 'Call a clinic and book an appointment for yourself: say what the problem is, ask for a time, and ask one question.',
                    sample: 'Good morning. I would like to book an appointment with a doctor, please. I have had a headache for two days, and it gets worse in the evening. Is the doctor free tomorrow morning? Ten o’clock would be perfect. Should I bring my old prescription? Thank you very much.',
                    checklist: ['I greeted the receptionist', 'I said what I need', 'I explained my problem', 'I asked for a time', 'I asked one question', 'I thanked them']
                } },
            write: { for: ['en'], title: 'Ask for a meeting',
                intro: 'Write an email asking for a meeting, then one sentence. Each is checked here, sentence by sentence.',
                tasks: [
                    { id: 'w1', type: 'email', prompt: 'Write an email to your teacher asking for a meeting to discuss your project. Say why you need it, and suggest a day and a time.', minWords: 50, checklist: ['I greeted my teacher', 'I said why I need the meeting', 'I suggested a day and a time', 'I ended politely with my name'] },
                    { id: 'w2', type: 'sentence', prompt: 'Write one sentence using “because” to explain why the meeting is important.', mustInclude: ['because'], minWords: 8 }
                ] }
        },
        '5:2': {
            name: 'Health',
            words: { for: ['kn', 'hi'], list: [
                { en: 'nutrition', kn: 'ಪೋಷಣೆ', hi: 'पोषण', pic: '🥗', def: 'the food your body needs to grow and stay healthy' },
                { en: 'immunity', kn: 'ರೋಗನಿರೋಧಕ ಶಕ್ತಿ', hi: 'रोग प्रतिरोधक क्षमता', pic: '🛡️', def: 'the body’s power to fight illness' },
                { en: 'symptom', kn: 'ರೋಗಲಕ್ಷಣ', hi: 'लक्षण', pic: '🤒', def: 'a sign that you are ill, like a fever' },
                { en: 'recovery', kn: 'ಚೇತರಿಕೆ', hi: 'स्वास्थ्य लाभ', pic: '💪', def: 'getting well again after an illness' }
            ] },
            phrases: { for: ['en', 'kn', 'hi'], list: [
                { read: true, en: 'A balanced diet keeps us healthy.', kn: 'ಸಮತೋಲನ ಆಹಾರ ನಮ್ಮನ್ನು ಆರೋಗ್ಯವಾಗಿರಿಸುತ್ತದೆ.', hi: 'संतुलित आहार हमें स्वस्थ रखता है।' },
                { en: 'Drink enough water every day.', kn: 'ಪ್ರತಿದಿನ ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ.', hi: 'रोज़ पर्याप्त पानी पिएँ।', acc: { hi: ['हर दिन पर्याप्त पानी पिएँ।', 'रोज़ पर्याप्त पानी पियो।'] } },
                { read: true, en: 'Fever is a common symptom.', kn: 'ಜ್ವರ ಒಂದು ಸಾಮಾನ್ಯ ರೋಗಲಕ್ಷಣ.', hi: 'बुखार एक आम लक्षण है।' },
                { en: 'She is recovering quickly.', kn: 'ಅವಳು ಬೇಗನೆ ಚೇತರಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದಾಳೆ.', hi: 'वह जल्दी ठीक हो रही है।' },
                { en: 'Regular exercise improves immunity.', kn: 'ನಿಯಮಿತ ವ್ಯಾಯಾಮ ರೋಗನಿರೋಧಕ ಶಕ್ತಿಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.', hi: 'नियमित व्यायाम रोग प्रतिरोधक क्षमता बढ़ाता है।' }
            ] },
            story: { for: ['en', 'kn', 'hi'],
                title: { en: 'Ravi’s morning walk', kn: 'ರವಿಯ ಬೆಳಗಿನ ನಡಿಗೆ', hi: 'रवि की सुबह की सैर' },
                text: {
                    en: 'Ravi’s doctor told him to walk every day. At first, Ravi found it difficult to wake up early. Then his friend Arun began to join him. Now they walk for forty minutes every morning and talk about their plans. Ravi feels stronger, and he sleeps better at night.',
                    kn: 'ರವಿಗೆ ಪ್ರತಿದಿನ ನಡೆಯಲು ಅವನ ವೈದ್ಯರು ಹೇಳಿದರು. ಮೊದಲು ರವಿಗೆ ಬೇಗ ಏಳುವುದು ಕಷ್ಟವಾಯಿತು. ನಂತರ ಅವನ ಸ್ನೇಹಿತ ಅರುಣ್ ಅವನ ಜೊತೆ ಬರತೊಡಗಿದನು. ಈಗ ಅವರು ಪ್ರತಿ ಬೆಳಿಗ್ಗೆ ನಲವತ್ತು ನಿಮಿಷ ನಡೆಯುತ್ತಾರೆ ಮತ್ತು ತಮ್ಮ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಮಾತನಾಡುತ್ತಾರೆ. ರವಿಗೆ ಈಗ ಹೆಚ್ಚು ಶಕ್ತಿ ಇದೆ, ಮತ್ತು ಅವನು ರಾತ್ರಿ ಚೆನ್ನಾಗಿ ನಿದ್ರಿಸುತ್ತಾನೆ.',
                    hi: 'डॉक्टर ने रवि से रोज़ टहलने को कहा। शुरू में रवि को जल्दी उठना मुश्किल लगा। फिर उसका दोस्त अरुण उसके साथ आने लगा। अब वे हर सुबह चालीस मिनट टहलते हैं और अपनी योजनाओं के बारे में बात करते हैं। रवि अब ज़्यादा ताकतवर महसूस करता है और रात को अच्छी नींद सोता है।'
                },
                questions: [
                    { q: { en: 'Who told Ravi to walk every day?', kn: 'ರವಿಗೆ ಪ್ರತಿದಿನ ನಡೆಯಲು ಯಾರು ಹೇಳಿದರು?', hi: 'रवि से रोज़ टहलने को किसने कहा?' },
                        options: [{ en: 'His doctor', kn: 'ಅವನ ವೈದ್ಯರು', hi: 'उसके डॉक्टर' }, { en: 'His mother', kn: 'ಅವನ ಅಮ್ಮ', hi: 'उसकी माँ' }, { en: 'His teacher', kn: 'ಅವನ ಶಿಕ್ಷಕರು', hi: 'उसके शिक्षक' }, { en: 'Arun', kn: 'ಅರುಣ್', hi: 'अरुण' }] },
                    { q: { en: 'How long do they walk every morning?', kn: 'ಅವರು ಪ್ರತಿ ಬೆಳಿಗ್ಗೆ ಎಷ್ಟು ಹೊತ್ತು ನಡೆಯುತ್ತಾರೆ?', hi: 'वे हर सुबह कितनी देर टहलते हैं?' },
                        options: [{ en: 'Forty minutes', kn: 'ನಲವತ್ತು ನಿಮಿಷ', hi: 'चालीस मिनट' }, { en: 'Ten minutes', kn: 'ಹತ್ತು ನಿಮಿಷ', hi: 'दस मिनट' }, { en: 'Two hours', kn: 'ಎರಡು ಗಂಟೆ', hi: 'दो घंटे' }, { en: 'One hour', kn: 'ಒಂದು ಗಂಟೆ', hi: 'एक घंटा' }] },
                    { q: { en: 'How does Ravi feel now?', kn: 'ರವಿಗೆ ಈಗ ಹೇಗನಿಸುತ್ತದೆ?', hi: 'रवि अब कैसा महसूस करता है?' },
                        options: [{ en: 'Stronger', kn: 'ಹೆಚ್ಚು ಶಕ್ತಿ ಇದೆ', hi: 'ज़्यादा ताकतवर' }, { en: 'More tired', kn: 'ಹೆಚ್ಚು ದಣಿವು', hi: 'ज़्यादा थका हुआ' }, { en: 'Sad', kn: 'ದುಃಖ', hi: 'उदास' }, { en: 'Ill', kn: 'ಅನಾರೋಗ್ಯ', hi: 'बीमार' }] }
                ] },
            listen: { for: ['en'], title: 'Planning a group project',
                scenario: 'Two classmates, Neha and Sameer, plan their project.',
                speakers: [{ name: 'Neha', voice: 'f' }, { name: 'Sameer', voice: 'm' }],
                lines: [
                    ['Neha', 'Sameer, our project on solar energy is due next Friday.'],
                    ['Sameer', 'I know. Shall we divide the work today?'],
                    ['Neha', 'Yes. I can do the research and write the report.'],
                    ['Sameer', 'Great. Then I will make the slides and the model.'],
                    ['Neha', 'Let’s meet in the library on Wednesday to check everything.'],
                    ['Sameer', 'Good idea. I will bring my laptop.'],
                    ['Neha', 'Perfect. And let’s practise the presentation on Thursday.'],
                    ['Sameer', 'Sure. I think we can finish it on time.']
                ],
                questions: [
                    { q: { en: 'What is the project about?', kn: 'ಯೋಜನೆ ಯಾವುದರ ಬಗ್ಗೆ?', hi: 'प्रोजेक्ट किस बारे में है?' }, options: ['Solar energy', 'Saving water', 'Online learning', 'Banking'] },
                    { q: { en: 'What will Neha do?', kn: 'ನೇಹಾ ಏನು ಮಾಡುತ್ತಾಳೆ?', hi: 'नेहा क्या करेगी?' }, options: ['The research and the report', 'The slides', 'The model', 'The presentation alone'] },
                    { q: { en: 'Where will they meet on Wednesday?', kn: 'ಬುಧವಾರ ಅವರು ಎಲ್ಲಿ ಭೇಟಿಯಾಗುತ್ತಾರೆ?', hi: 'बुधवार को वे कहाँ मिलेंगे?' }, options: ['In the library', 'At Neha’s house', 'In the canteen', 'Online'] },
                    { q: { en: 'When will they practise the presentation?', kn: 'ಅವರು ಪ್ರಸ್ತುತಿಯನ್ನು ಯಾವಾಗ ಅಭ್ಯಾಸ ಮಾಡುತ್ತಾರೆ?', hi: 'वे प्रस्तुति का अभ्यास कब करेंगे?' }, options: ['On Thursday', 'On Monday', 'On Friday', 'On Sunday'] }
                ],
                speaking: {
                    prompt: 'Plan a project with a classmate: say what the project is, share the work between you, and fix a day to meet.',
                    sample: 'Hi Kiran, our project on recycling is due in two weeks, so let’s plan it today. I will collect the data from our college canteen and the hostels. Could you prepare the slides and the charts? Let’s meet in the library on Tuesday at four to put it together. If anything changes, message me. I think we can do a great job.',
                    checklist: ['I said what the project is', 'I said what I will do', 'I asked my classmate to do a part', 'I fixed a day and a place to meet', 'I spoke clearly and politely']
                } },
            write: { for: ['en'], title: 'A healthy habit',
                intro: 'Write a paragraph about a healthy habit, then one sentence of advice. Each is checked here, sentence by sentence.',
                tasks: [
                    { id: 'w1', type: 'paragraph', prompt: 'Write a paragraph about one healthy habit you want to start. Say what it is, why it matters, and how you will keep it up.', minWords: 60, checklist: ['I named the habit', 'I said why it matters', 'I said how I will keep it up'] },
                    { id: 'w2', type: 'sentence', prompt: 'Write one sentence using “should” to give a friend advice about their health.', mustInclude: ['should'], minWords: 6 }
                ] }
        },
        '6:1': {
            name: 'Citizenship',
            words: { for: ['kn', 'hi'], list: [
                { en: 'democracy', kn: 'ಪ್ರಜಾಪ್ರಭುತ್ವ', hi: 'लोकतंत्र', pic: '🏛️', def: 'a system where people choose their government by voting' },
                { en: 'election', kn: 'ಚುನಾವಣೆ', hi: 'चुनाव', pic: '🗳️', def: 'a time when people vote to choose someone' },
                { en: 'responsibility', kn: 'ಜವಾಬ್ದಾರಿ', hi: 'ज़िम्मेदारी', pic: '🤝', def: 'a duty you are trusted to do' },
                { en: 'rights', kn: 'ಹಕ್ಕುಗಳು', hi: 'अधिकार', pic: '⚖️', def: 'what every person is allowed to have or do by law' }
            ] },
            story: { for: ['en'],
                title: { en: 'The water saver' },
                text: { en: 'In our college hostel, many taps were leaking. Priya counted them and found twelve. She wrote a short report and gave it to the principal. Within a week, a plumber fixed every tap. Priya’s report saved hundreds of litres of water every day, and the college asked her to lead a new green club.' },
                questions: [
                    { q: { en: 'How many taps were leaking?', kn: 'ಎಷ್ಟು ನಲ್ಲಿಗಳು ಸೋರುತ್ತಿದ್ದವು?', hi: 'कितने नल टपक रहे थे?' }, options: ['Twelve', 'Two', 'Twenty', 'Six'] },
                    { q: { en: 'What did Priya give the principal?', kn: 'ಪ್ರಿಯಾ ಪ್ರಾಂಶುಪಾಲರಿಗೆ ಏನು ಕೊಟ್ಟಳು?', hi: 'प्रिया ने प्रिंसिपल को क्या दिया?' }, options: ['A short report', 'Some money', 'A new tap', 'A photo'] },
                    { q: { en: 'What did the college ask Priya to do?', kn: 'ಕಾಲೇಜು ಪ್ರಿಯಾಳಿಗೆ ಏನು ಮಾಡಲು ಹೇಳಿತು?', hi: 'कॉलेज ने प्रिया से क्या करने को कहा?' }, options: ['Lead a new green club', 'Fix the taps herself', 'Leave the hostel', 'Write a book'] }
                ] }
        },
        '6:2': {
            name: 'Media',
            words: { for: ['kn', 'hi'], list: [
                { en: 'information', kn: 'ಮಾಹಿತಿ', hi: 'जानकारी', pic: 'ℹ️', def: 'facts about something' },
                { en: 'advertisement', kn: 'ಜಾಹೀರಾತು', hi: 'विज्ञापन', pic: '📢', def: 'a notice or short film that tries to sell something' },
                { en: 'opinion', kn: 'ಅಭಿಪ್ರಾಯ', hi: 'राय', pic: '💬', def: 'what you think about something' },
                { en: 'audience', kn: 'ಪ್ರೇಕ್ಷಕರು', hi: 'दर्शक', pic: '👥', def: 'the people who watch or listen to something' }
            ] },
            story: { for: ['en'],
                title: { en: 'A small shop online' },
                text: { en: 'Lakshmi makes handmade bags in her small town. For years, she sold them only at the weekly market. Last year, her son helped her open an online shop. Now she gets orders from Delhi, Chennai and even Singapore. She has hired two women from her street to help her, and her business is growing every month.' },
                questions: [
                    { q: { en: 'Where did Lakshmi sell her bags before?', kn: 'ಲಕ್ಷ್ಮಿ ಮೊದಲು ತನ್ನ ಚೀಲಗಳನ್ನು ಎಲ್ಲಿ ಮಾರುತ್ತಿದ್ದಳು?', hi: 'लक्ष्मी पहले अपने बैग कहाँ बेचती थी?' }, options: ['At the weekly market', 'In a big mall', 'At the railway station', 'In Singapore'] },
                    { q: { en: 'Who helped her open an online shop?', kn: 'ಆನ್‌ಲೈನ್ ಅಂಗಡಿ ತೆರೆಯಲು ಅವಳಿಗೆ ಯಾರು ಸಹಾಯ ಮಾಡಿದರು?', hi: 'ऑनलाइन दुकान खोलने में उसकी मदद किसने की?' }, options: ['Her son', 'Her neighbour', 'A bank', 'Her teacher'] },
                    { q: { en: 'How many women has she hired?', kn: 'ಅವಳು ಎಷ್ಟು ಮಹಿಳೆಯರನ್ನು ಕೆಲಸಕ್ಕೆ ತೆಗೆದುಕೊಂಡಿದ್ದಾಳೆ?', hi: 'उसने कितनी महिलाओं को काम पर रखा है?' }, options: ['Two', 'Five', 'One', 'Ten'] }
                ] }
        }
    }
};
