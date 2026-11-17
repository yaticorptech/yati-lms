// Language Learning — elementary section "Daily life", units 4–6 (clothes and body, around town, festivals).
// Words, phrases, a story and a conversation per unit, in English, Kannada and Hindi; glosses give word-by-word English.
module.exports = {
    level: 'elementary',
    units: {
        '4:1': {
            name: 'Clothes and body',
            lessons: [
                {
                    kind: 'words',
                    title: 'Clothes',
                    list: [
                        { en: 'shirt', kn: 'ಅಂಗಿ', hi: 'कमीज़', pic: '👕', def: 'clothing for the upper body, with sleeves and buttons' },
                        { en: 'trousers', kn: 'ಪ್ಯಾಂಟ್', hi: 'पैंट', pic: '👖', def: 'clothing that covers each leg, from the waist to the ankle' },
                        { en: 'saree', kn: 'ಸೀರೆ', hi: 'साड़ी', pic: '🥻', def: 'a long piece of cloth that Indian women wrap and wear' },
                        { en: 'shoe', kn: 'ಬೂಟು', hi: 'जूता', pic: '👞', def: 'something you wear on your foot when you walk outside' },
                        { en: 'cap', kn: 'ಟೋಪಿ', hi: 'टोपी', pic: '🧢', def: 'a soft hat, often with a stiff part in front' },
                        { en: 'socks', kn: 'ಕಾಲುಚೀಲ', hi: 'मोज़े', pic: '🧦', def: 'soft coverings for your feet, worn inside shoes' }
                    ]
                },
                {
                    kind: 'phrases',
                    title: 'Clothes and body 1',
                    list: [
                        { read: true, en: 'My shirt is white.', kn: 'ನನ್ನ ಅಂಗಿ ಬಿಳಿ ಬಣ್ಣದ್ದು.', hi: 'मेरी कमीज़ सफ़ेद है।' },
                        { en: 'Mother wears a silk saree.', kn: 'ಅಮ್ಮ ರೇಷ್ಮೆ ಸೀರೆ ಉಡುತ್ತಾರೆ.', hi: 'माँ रेशमी साड़ी पहनती हैं।' },
                        { read: true, en: 'These shoes and socks are new.', kn: 'ಈ ಬೂಟು ಮತ್ತು ಕಾಲುಚೀಲಗಳು ಹೊಸವು.', hi: 'ये जूते और मोज़े नए हैं।' },
                        { en: 'Wear your cap in the sun.', kn: 'ಬಿಸಿಲಿನಲ್ಲಿ ನಿನ್ನ ಟೋಪಿ ಹಾಕಿಕೋ.', hi: 'धूप में अपनी टोपी पहनो।' },
                        { en: 'His trousers are too long.', kn: 'ಅವನ ಪ್ಯಾಂಟ್ ತುಂಬಾ ಉದ್ದವಾಗಿದೆ.', hi: 'उसकी पैंट बहुत लंबी है।' }
                    ]
                },
                {
                    kind: 'words',
                    title: 'Parts of the body',
                    list: [
                        { en: 'hand', kn: 'ಕೈ', hi: 'हाथ', pic: '✋', def: 'the part at the end of your arm, with five fingers' },
                        { en: 'eye', kn: 'ಕಣ್ಣು', hi: 'आँख', pic: '👀', def: 'the part of your face that you see with' },
                        { en: 'ear', kn: 'ಕಿವಿ', hi: 'कान', pic: '👂', def: 'the part of your head that you hear with' },
                        { en: 'nose', kn: 'ಮೂಗು', hi: 'नाक', pic: '👃', def: 'the part of your face that you smell and breathe with' },
                        { en: 'hair', kn: 'ಕೂದಲು', hi: 'बाल', pic: '💇', def: 'the thin threads that grow on your head' },
                        { en: 'teeth', kn: 'ಹಲ್ಲುಗಳು', hi: 'दाँत', pic: '🦷', def: 'the hard white parts in your mouth used for biting' }
                    ]
                },
                {
                    kind: 'phrases',
                    title: 'Clothes and body 2',
                    list: [
                        { en: 'Wash your hands before eating.', kn: 'ಊಟದ ಮೊದಲು ಕೈ ತೊಳೆಯಿರಿ.', hi: 'खाने से पहले हाथ धोइए।' },
                        { read: true, en: 'My eyes are tired.', kn: 'ನನ್ನ ಕಣ್ಣುಗಳು ದಣಿದಿವೆ.', hi: 'मेरी आँखें थक गई हैं।' },
                        { read: true, en: 'She has long hair.', kn: 'ಅವಳಿಗೆ ಉದ್ದ ಕೂದಲು ಇದೆ.', hi: 'उसके बाल लंबे हैं।' },
                        { en: 'Brush your teeth every night.', kn: 'ಪ್ರತಿ ರಾತ್ರಿ ನಿಮ್ಮ ಹಲ್ಲು ಉಜ್ಜಿರಿ.', hi: 'हर रात अपने दाँत ब्रश करो।' },
                        { en: 'My ear hurts.', kn: 'ನನ್ನ ಕಿವಿ ನೋಯುತ್ತಿದೆ.', hi: 'मेरे कान में दर्द है।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A cold morning', kn: 'ಚಳಿಯ ಬೆಳಿಗ್ಗೆ', hi: 'ठंडी सुबह' },
                    text: { en: 'It is a cold morning in Shivamogga. Kavya washes her face and hands with warm water. She wears a blue shirt and a warm sweater. Her mother says, "Wear your socks and a cap too." Kavya ties her long hair and puts on her black shoes. At the bus stop, her friend Asha is shivering. Kavya has one more cap in her bag, and she gives it to Asha.', kn: 'ಶಿವಮೊಗ್ಗದಲ್ಲಿ ಇದು ಚಳಿಯ ಬೆಳಿಗ್ಗೆ. ಕಾವ್ಯ ಬಿಸಿ ನೀರಿನಿಂದ ಮುಖ ಮತ್ತು ಕೈ ತೊಳೆಯುತ್ತಾಳೆ. ಅವಳು ನೀಲಿ ಅಂಗಿ ಮತ್ತು ಬೆಚ್ಚನೆಯ ಸ್ವೆಟರ್ ಹಾಕಿಕೊಳ್ಳುತ್ತಾಳೆ. ಅವಳ ಅಮ್ಮ, "ಕಾಲುಚೀಲ ಮತ್ತು ಟೋಪಿಯನ್ನೂ ಹಾಕಿಕೋ" ಎನ್ನುತ್ತಾರೆ. ಕಾವ್ಯ ತನ್ನ ಉದ್ದ ಕೂದಲನ್ನು ಕಟ್ಟಿಕೊಂಡು ಕಪ್ಪು ಬೂಟು ಹಾಕಿಕೊಳ್ಳುತ್ತಾಳೆ. ಬಸ್ ನಿಲ್ದಾಣದಲ್ಲಿ ಅವಳ ಗೆಳತಿ ಆಶಾ ಚಳಿಯಿಂದ ನಡುಗುತ್ತಿದ್ದಾಳೆ. ಕಾವ್ಯಳ ಚೀಲದಲ್ಲಿ ಇನ್ನೊಂದು ಟೋಪಿ ಇದೆ, ಅದನ್ನು ಅವಳು ಆಶಾಗೆ ಕೊಡುತ್ತಾಳೆ.', hi: 'शिवमोग्गा में ठंडी सुबह है। काव्या गर्म पानी से अपना चेहरा और हाथ धोती है। वह नीली कमीज़ और गर्म स्वेटर पहनती है। उसकी माँ कहती हैं, "मोज़े और टोपी भी पहन लो।" काव्या अपने लंबे बाल बाँधती है और काले जूते पहनती है। बस स्टॉप पर उसकी सहेली आशा ठंड से काँप रही है। काव्या के बैग में एक और टोपी है, और वह उसे आशा को दे देती है।' },
                    questions: [
                        {
                            q: { en: 'Which city is the story in?', kn: 'ಈ ಕಥೆ ಯಾವ ಊರಿನಲ್ಲಿ ನಡೆಯುತ್ತದೆ?', hi: 'यह कहानी किस शहर की है?' },
                            options: [
                                { en: 'Shivamogga', kn: 'ಶಿವಮೊಗ್ಗ', hi: 'शिवमोग्गा' },
                                { en: 'Mysuru', kn: 'ಮೈಸೂರು', hi: 'मैसूरु' },
                                { en: 'Hubballi', kn: 'ಹುಬ್ಬಳ್ಳಿ', hi: 'हुब्बल्ली' },
                                { en: 'Mangaluru', kn: 'ಮಂಗಳೂರು', hi: 'मंगलुरु' }
                            ]
                        },
                        {
                            q: { en: "What does Kavya's mother tell her to wear?", kn: 'ಕಾವ್ಯಳ ಅಮ್ಮ ಅವಳಿಗೆ ಏನು ಹಾಕಿಕೊಳ್ಳಲು ಹೇಳುತ್ತಾರೆ?', hi: 'काव्या की माँ उसे क्या पहनने को कहती हैं?' },
                            options: [
                                { en: 'Socks and a cap', kn: 'ಕಾಲುಚೀಲ ಮತ್ತು ಟೋಪಿ', hi: 'मोज़े और टोपी' },
                                { en: 'A silk saree', kn: 'ರೇಷ್ಮೆ ಸೀರೆ', hi: 'रेशमी साड़ी' },
                                { en: 'Sandals', kn: 'ಚಪ್ಪಲಿ', hi: 'चप्पल' },
                                { en: 'Her new trousers', kn: 'ಅವಳ ಹೊಸ ಪ್ಯಾಂಟ್', hi: 'उसकी नई पैंट' }
                            ]
                        },
                        {
                            q: { en: 'What does Kavya give Asha?', kn: 'ಕಾವ್ಯ ಆಶಾಗೆ ಏನು ಕೊಡುತ್ತಾಳೆ?', hi: 'काव्या आशा को क्या देती है?' },
                            options: [
                                { en: 'A cap', kn: 'ಒಂದು ಟೋಪಿ', hi: 'एक टोपी' },
                                { en: 'Her shoes', kn: 'ಅವಳ ಬೂಟು', hi: 'अपने जूते' },
                                { en: 'A sweater', kn: 'ಒಂದು ಸ್ವೆಟರ್', hi: 'एक स्वेटर' },
                                { en: 'Some money', kn: 'ಸ್ವಲ್ಪ ಹಣ', hi: 'कुछ पैसे' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'What to wear?', kn: 'ಏನು ಹಾಕಿಕೊಳ್ಳುವುದು?', hi: 'क्या पहनें?' },
                    scenario: { en: 'Divya and Rahul, two college friends, talk about clothes for Traditional Day.', kn: 'ಕಾಲೇಜು ಗೆಳೆಯರಾದ ದಿವ್ಯಾ ಮತ್ತು ರಾಹುಲ್ ಸಾಂಪ್ರದಾಯಿಕ ದಿನದ ಉಡುಗೆಯ ಬಗ್ಗೆ ಮಾತನಾಡುತ್ತಾರೆ.', hi: 'कॉलेज के दोस्त दिव्या और राहुल पारंपरिक दिवस के कपड़ों के बारे में बात करते हैं।' },
                    speakers: [
                        { name: 'Divya', voice: 'f' },
                        { name: 'Rahul', voice: 'm' }
                    ],
                    lines: [
                        { speaker: 'Divya', en: 'Rahul, tomorrow is Traditional Day at college. What will you wear?', kn: 'ರಾಹುಲ್, ನಾಳೆ ಕಾಲೇಜಿನಲ್ಲಿ ಸಾಂಪ್ರದಾಯಿಕ ದಿನ. ನೀನು ಏನು ಹಾಕಿಕೊಳ್ಳುತ್ತೀಯ?', hi: 'राहुल, कल कॉलेज में पारंपरिक दिवस है। तुम क्या पहनोगे?' },
                        { speaker: 'Rahul', en: 'I will wear a white kurta and a dhoti.', kn: 'ನಾನು ಬಿಳಿ ಕುರ್ತಾ ಮತ್ತು ಪಂಚೆ ಹಾಕಿಕೊಳ್ಳುತ್ತೇನೆ.', hi: 'मैं सफ़ेद कुर्ता और धोती पहनूँगा।' },
                        { speaker: 'Divya', en: "Nice! I will wear my mother's green saree.", kn: 'ಚೆನ್ನಾಗಿದೆ! ನಾನು ಅಮ್ಮನ ಹಸಿರು ಸೀರೆ ಉಡುತ್ತೇನೆ.', hi: 'बढ़िया! मैं माँ की हरी साड़ी पहनूँगी।' },
                        { speaker: 'Rahul', en: 'Can you wear a saree on your own?', kn: 'ನಿನಗೆ ಒಬ್ಬಳೇ ಸೀರೆ ಉಡಲು ಬರುತ್ತದೆಯೇ?', hi: 'क्या तुम खुद साड़ी पहन सकती हो?' },
                        { speaker: 'Divya', en: 'No, my elder sister will help me in the morning.', kn: 'ಇಲ್ಲ, ಬೆಳಿಗ್ಗೆ ನನ್ನ ಅಕ್ಕ ಸಹಾಯ ಮಾಡುತ್ತಾಳೆ.', hi: 'नहीं, सुबह मेरी दीदी मदद करेगी।' },
                        { speaker: 'Rahul', en: 'But I only have sports shoes.', kn: 'ಆದರೆ ನನ್ನ ಹತ್ತಿರ ಸ್ಪೋರ್ಟ್ಸ್ ಶೂ ಮಾತ್ರ ಇದೆ.', hi: 'पर मेरे पास सिर्फ़ खेल के जूते हैं।' },
                        { speaker: 'Divya', en: "Wear your father's sandals. They look good with a dhoti.", kn: 'ನಿನ್ನ ಅಪ್ಪನ ಚಪ್ಪಲಿ ಹಾಕಿಕೋ. ಪಂಚೆಗೆ ಅದು ಚೆನ್ನಾಗಿ ಕಾಣುತ್ತದೆ.', hi: 'अपने पापा की चप्पल पहन लो। धोती के साथ वह अच्छी लगेगी।' },
                        { speaker: 'Rahul', en: 'Good idea! See you at nine tomorrow.', kn: 'ಒಳ್ಳೆಯ ಉಪಾಯ! ನಾಳೆ ಒಂಬತ್ತು ಗಂಟೆಗೆ ಸಿಗೋಣ.', hi: 'अच्छा सुझाव! कल नौ बजे मिलते हैं।' }
                    ],
                    questions: [
                        {
                            q: { en: 'What will Rahul wear?', kn: 'ರಾಹುಲ್ ಏನು ಹಾಕಿಕೊಳ್ಳುತ್ತಾನೆ?', hi: 'राहुल क्या पहनेगा?' },
                            options: [
                                { en: 'A white kurta and a dhoti', kn: 'ಬಿಳಿ ಕುರ್ತಾ ಮತ್ತು ಪಂಚೆ', hi: 'सफ़ेद कुर्ता और धोती' },
                                { en: 'A blue shirt and trousers', kn: 'ನೀಲಿ ಅಂಗಿ ಮತ್ತು ಪ್ಯಾಂಟ್', hi: 'नीली कमीज़ और पैंट' },
                                { en: 'A black T-shirt', kn: 'ಕಪ್ಪು ಟೀ-ಶರ್ಟ್', hi: 'काली टी-शर्ट' },
                                { en: 'A suit and tie', kn: 'ಸೂಟ್ ಮತ್ತು ಟೈ', hi: 'सूट और टाई' }
                            ]
                        },
                        {
                            q: { en: 'Whose saree will Divya wear?', kn: 'ದಿವ್ಯಾ ಯಾರ ಸೀರೆ ಉಡುತ್ತಾಳೆ?', hi: 'दिव्या किसकी साड़ी पहनेगी?' },
                            options: [
                                { en: "Her mother's", kn: 'ಅವಳ ಅಮ್ಮನದು', hi: 'अपनी माँ की' },
                                { en: "Her sister's", kn: 'ಅವಳ ಅಕ್ಕನದು', hi: 'अपनी दीदी की' },
                                { en: "Her friend's", kn: 'ಅವಳ ಗೆಳತಿಯದು', hi: 'अपनी सहेली की' },
                                { en: 'A new one from a shop', kn: 'ಅಂಗಡಿಯಿಂದ ತಂದ ಹೊಸದು', hi: 'दुकान से लाई नई साड़ी' }
                            ]
                        },
                        {
                            q: { en: 'Who will help Divya in the morning?', kn: 'ಬೆಳಿಗ್ಗೆ ದಿವ್ಯಾಗೆ ಯಾರು ಸಹಾಯ ಮಾಡುತ್ತಾರೆ?', hi: 'सुबह दिव्या की मदद कौन करेगा?' },
                            options: [
                                { en: 'Her elder sister', kn: 'ಅವಳ ಅಕ್ಕ', hi: 'उसकी दीदी' },
                                { en: 'Her mother', kn: 'ಅವಳ ಅಮ್ಮ', hi: 'उसकी माँ' },
                                { en: 'Rahul', kn: 'ರಾಹುಲ್', hi: 'राहुल' },
                                { en: 'Her teacher', kn: 'ಅವಳ ಶಿಕ್ಷಕಿ', hi: 'उसकी अध्यापिका' }
                            ]
                        }
                    ]
                }
            ]
        },
        '5:1': {
            name: 'Around town',
            lessons: [
                {
                    kind: 'words',
                    title: 'Places in town',
                    list: [
                        { en: 'hospital', kn: 'ಆಸ್ಪತ್ರೆ', hi: 'अस्पताल', pic: '🏥', def: 'a place where doctors and nurses care for sick people' },
                        { en: 'post office', kn: 'ಅಂಚೆ ಕಚೇರಿ', hi: 'डाकघर', pic: '📮', def: 'a place where you send letters and parcels' },
                        { en: 'temple', kn: 'ದೇವಸ್ಥಾನ', hi: 'मंदिर', pic: '🛕', def: 'a building where people go to pray to God' },
                        { en: 'park', kn: 'ಉದ್ಯಾನವನ', hi: 'पार्क', pic: '🌳', def: 'a green open place in a town for walking and playing' },
                        { en: 'police station', kn: 'ಪೊಲೀಸ್ ಠಾಣೆ', hi: 'पुलिस थाना', pic: '🚓', def: 'the office where police officers work' },
                        { en: 'bank', kn: 'ಬ್ಯಾಂಕ್', hi: 'बैंक', pic: '🏦', def: 'a place that keeps people’s money safe and gives loans' }
                    ]
                },
                {
                    kind: 'phrases',
                    title: 'Around town 1',
                    list: [
                        { read: true, en: 'The hospital is open all night.', kn: 'ಆಸ್ಪತ್ರೆ ರಾತ್ರಿಯಿಡೀ ತೆರೆದಿರುತ್ತದೆ.', hi: 'अस्पताल पूरी रात खुला रहता है।' },
                        {
                            en: 'I send a parcel from the post office.',
                            kn: 'ನಾನು ಅಂಚೆ ಕಚೇರಿಯಿಂದ ಪಾರ್ಸೆಲ್ ಕಳುಹಿಸುತ್ತೇನೆ.',
                            hi: 'मैं डाकघर से पार्सल भेजता हूँ।',
                            acc: { hi: ['मैं डाकघर से पार्सल भेजती हूँ।'] }
                        },
                        { read: true, en: 'There is an old temple near our college.', kn: 'ನಮ್ಮ ಕಾಲೇಜಿನ ಹತ್ತಿರ ಒಂದು ಹಳೆಯ ದೇವಸ್ಥಾನ ಇದೆ.', hi: 'हमारे कॉलेज के पास एक पुराना मंदिर है।' },
                        { en: 'Children play in the park.', kn: 'ಮಕ್ಕಳು ಉದ್ಯಾನವನದಲ್ಲಿ ಆಡುತ್ತಾರೆ.', hi: 'बच्चे पार्क में खेलते हैं।' },
                        { en: 'The police station is near the bank.', kn: 'ಪೊಲೀಸ್ ಠಾಣೆ ಬ್ಯಾಂಕ್ ಹತ್ತಿರ ಇದೆ.', hi: 'पुलिस थाना बैंक के पास है।' }
                    ]
                },
                {
                    kind: 'words',
                    title: 'Finding the way',
                    list: [
                        { en: 'left', kn: 'ಎಡ', hi: 'बायाँ', pic: '⬅️', def: 'the side opposite to right' },
                        { en: 'right', kn: 'ಬಲ', hi: 'दायाँ', pic: '➡️', def: 'the side opposite to left' },
                        { en: 'straight', kn: 'ನೇರ', hi: 'सीधा', pic: '⬆️', def: 'going ahead without turning' },
                        { en: 'signal', kn: 'ಸಿಗ್ನಲ್', hi: 'सिग्नल', pic: '🚦', def: 'traffic lights that tell vehicles when to stop and go' },
                        { en: 'map', kn: 'ನಕ್ಷೆ', hi: 'नक्शा', pic: '🗺️', def: 'a drawing that shows roads and places' },
                        { en: 'bus stop', kn: 'ಬಸ್ ನಿಲ್ದಾಣ', hi: 'बस स्टॉप', pic: '🚏', def: 'a place on the road where buses stop for people' }
                    ]
                },
                {
                    kind: 'phrases',
                    title: 'Around town 2',
                    list: [
                        { read: true, en: 'Turn left at the signal.', kn: 'ಸಿಗ್ನಲ್ ಬಳಿ ಎಡಕ್ಕೆ ತಿರುಗಿ.', hi: 'सिग्नल पर बाएँ मुड़ो।' },
                        { en: 'The temple is on the right.', kn: 'ದೇವಸ್ಥಾನ ಬಲಗಡೆ ಇದೆ.', hi: 'मंदिर दाईं तरफ़ है।' },
                        { read: true, en: 'Go straight for two minutes.', kn: 'ಎರಡು ನಿಮಿಷ ನೇರವಾಗಿ ಹೋಗಿ.', hi: 'दो मिनट सीधे जाओ।' },
                        { en: 'Please show me on the map.', kn: 'ದಯವಿಟ್ಟು ನನಗೆ ನಕ್ಷೆಯಲ್ಲಿ ತೋರಿಸಿ.', hi: 'कृपया मुझे नक्शे पर दिखाइए।' },
                        { en: 'Wait for me at the bus stop.', kn: 'ಬಸ್ ನಿಲ್ದಾಣದಲ್ಲಿ ನನಗಾಗಿ ಕಾಯಿರಿ.', hi: 'बस स्टॉप पर मेरा इंतज़ार करो।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A walk in Hubballi', kn: 'ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ ಒಂದು ಸುತ್ತು', hi: 'हुब्बल्ली की सैर' },
                    text: { en: 'Arjun has just moved to Hubballi for college. On Sunday, he walks around the town with a map on his phone. First he goes to the post office and sends a letter to his grandmother. Then he turns left at the big signal and sees an old temple. Next to the temple, there is a quiet park. He sits there and eats some peanuts. In the evening, he takes an auto back to his hostel.', kn: 'ಅರ್ಜುನ್ ಕಾಲೇಜಿಗಾಗಿ ಈಗಷ್ಟೇ ಹುಬ್ಬಳ್ಳಿಗೆ ಬಂದಿದ್ದಾನೆ. ಭಾನುವಾರ ಅವನು ಫೋನಿನಲ್ಲಿ ನಕ್ಷೆ ನೋಡುತ್ತಾ ಊರು ಸುತ್ತುತ್ತಾನೆ. ಮೊದಲು ಅಂಚೆ ಕಚೇರಿಗೆ ಹೋಗಿ ಅಜ್ಜಿಗೆ ಒಂದು ಪತ್ರ ಕಳುಹಿಸುತ್ತಾನೆ. ನಂತರ ದೊಡ್ಡ ಸಿಗ್ನಲ್ ಬಳಿ ಎಡಕ್ಕೆ ತಿರುಗಿದಾಗ ಅವನಿಗೆ ಒಂದು ಹಳೆಯ ದೇವಸ್ಥಾನ ಕಾಣುತ್ತದೆ. ದೇವಸ್ಥಾನದ ಪಕ್ಕದಲ್ಲಿ ಒಂದು ಶಾಂತವಾದ ಉದ್ಯಾನವನ ಇದೆ. ಅವನು ಅಲ್ಲಿ ಕುಳಿತು ಸ್ವಲ್ಪ ಕಡಲೆಕಾಯಿ ತಿನ್ನುತ್ತಾನೆ. ಸಂಜೆ ಅವನು ಆಟೋದಲ್ಲಿ ಹಾಸ್ಟೆಲಿಗೆ ಹಿಂತಿರುಗುತ್ತಾನೆ.', hi: 'अर्जुन अभी-अभी कॉलेज के लिए हुब्बल्ली आया है। रविवार को वह फ़ोन पर नक्शा देखते हुए शहर घूमता है। पहले वह डाकघर जाता है और अपनी दादी को एक चिट्ठी भेजता है। फिर वह बड़े सिग्नल पर बाएँ मुड़ता है और उसे एक पुराना मंदिर दिखता है। मंदिर के पास एक शांत पार्क है। वह वहाँ बैठकर कुछ मूँगफली खाता है। शाम को वह ऑटो से अपने हॉस्टल लौटता है।' },
                    questions: [
                        {
                            q: { en: 'Which town has Arjun moved to?', kn: 'ಅರ್ಜುನ್ ಯಾವ ಊರಿಗೆ ಬಂದಿದ್ದಾನೆ?', hi: 'अर्जुन किस शहर में आया है?' },
                            options: [
                                { en: 'Hubballi', kn: 'ಹುಬ್ಬಳ್ಳಿ', hi: 'हुब्बल्ली' },
                                { en: 'Mysuru', kn: 'ಮೈಸೂರು', hi: 'मैसूरु' },
                                { en: 'Belagavi', kn: 'ಬೆಳಗಾವಿ', hi: 'बेलगावी' },
                                { en: 'Mangaluru', kn: 'ಮಂಗಳೂರು', hi: 'मंगलुरु' }
                            ]
                        },
                        {
                            q: { en: 'What does Arjun do at the post office?', kn: 'ಅರ್ಜುನ್ ಅಂಚೆ ಕಚೇರಿಯಲ್ಲಿ ಏನು ಮಾಡುತ್ತಾನೆ?', hi: 'अर्जुन डाकघर में क्या करता है?' },
                            options: [
                                { en: 'He sends a letter to his grandmother', kn: 'ಅಜ್ಜಿಗೆ ಪತ್ರ ಕಳುಹಿಸುತ್ತಾನೆ', hi: 'दादी को चिट्ठी भेजता है' },
                                { en: 'He buys a new phone', kn: 'ಹೊಸ ಫೋನ್ ಕೊಳ್ಳುತ್ತಾನೆ', hi: 'नया फ़ोन खरीदता है' },
                                { en: 'He meets his teacher', kn: 'ತನ್ನ ಶಿಕ್ಷಕರನ್ನು ಭೇಟಿಯಾಗುತ್ತಾನೆ', hi: 'अपने शिक्षक से मिलता है' },
                                { en: 'He opens a bank account', kn: 'ಬ್ಯಾಂಕ್ ಖಾತೆ ತೆರೆಯುತ್ತಾನೆ', hi: 'बैंक खाता खोलता है' }
                            ]
                        },
                        {
                            q: { en: 'Where does Arjun eat peanuts?', kn: 'ಅರ್ಜುನ್ ಕಡಲೆಕಾಯಿ ಎಲ್ಲಿ ತಿನ್ನುತ್ತಾನೆ?', hi: 'अर्जुन मूँगफली कहाँ खाता है?' },
                            options: [
                                { en: 'In the park', kn: 'ಉದ್ಯಾನವನದಲ್ಲಿ', hi: 'पार्क में' },
                                { en: 'Inside the temple', kn: 'ದೇವಸ್ಥಾನದ ಒಳಗೆ', hi: 'मंदिर के अंदर' },
                                { en: 'On the bus', kn: 'ಬಸ್ಸಿನಲ್ಲಿ', hi: 'बस में' },
                                { en: 'In his hostel room', kn: 'ಹಾಸ್ಟೆಲ್ ಕೊಠಡಿಯಲ್ಲಿ', hi: 'हॉस्टल के कमरे में' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Asking the way', kn: 'ದಾರಿ ಕೇಳುವುದು', hi: 'रास्ता पूछना' },
                    scenario: { en: 'Sneha, a student in Mysuru, asks a shopkeeper, Prakash, the way to the hospital.', kn: 'ಮೈಸೂರಿನ ವಿದ್ಯಾರ್ಥಿನಿ ಸ್ನೇಹಾ ಅಂಗಡಿಯವರಾದ ಪ್ರಕಾಶ್ ಅವರನ್ನು ಆಸ್ಪತ್ರೆಗೆ ದಾರಿ ಕೇಳುತ್ತಾಳೆ.', hi: 'मैसूरु की छात्रा स्नेहा दुकानदार प्रकाश से अस्पताल का रास्ता पूछती है।' },
                    speakers: [
                        { name: 'Sneha', voice: 'f' },
                        { name: 'Prakash', voice: 'm' }
                    ],
                    lines: [
                        { speaker: 'Sneha', en: 'Excuse me, sir. Where is the government hospital?', kn: 'ಕ್ಷಮಿಸಿ ಸರ್, ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ?', hi: 'माफ़ कीजिए सर, सरकारी अस्पताल कहाँ है?' },
                        { speaker: 'Prakash', en: 'It is not far. Go straight on this road.', kn: 'ಅದು ದೂರ ಇಲ್ಲ. ಈ ರಸ್ತೆಯಲ್ಲಿ ನೇರವಾಗಿ ಹೋಗಿ.', hi: 'ज़्यादा दूर नहीं है। इसी सड़क पर सीधे जाइए।' },
                        { speaker: 'Sneha', en: 'Up to the signal?', kn: 'ಸಿಗ್ನಲ್ ತನಕವೇ?', hi: 'सिग्नल तक?' },
                        { speaker: 'Prakash', en: 'Yes. At the signal, turn right. The hospital is next to the police station.', kn: 'ಹೌದು. ಸಿಗ್ನಲ್ ಬಳಿ ಬಲಕ್ಕೆ ತಿರುಗಿ. ಆಸ್ಪತ್ರೆ ಪೊಲೀಸ್ ಠಾಣೆಯ ಪಕ್ಕದಲ್ಲೇ ಇದೆ.', hi: 'हाँ। सिग्नल पर दाएँ मुड़िए। अस्पताल पुलिस थाने के बगल में है।' },
                        { speaker: 'Sneha', en: 'Can I walk there?', kn: 'ನಾನು ನಡೆದುಕೊಂಡು ಹೋಗಬಹುದೇ?', hi: 'क्या मैं पैदल जा सकती हूँ?' },
                        { speaker: 'Prakash', en: 'Yes, it takes only ten minutes on foot.', kn: 'ಹೌದು, ನಡೆದರೆ ಕೇವಲ ಹತ್ತು ನಿಮಿಷ ಆಗುತ್ತದೆ.', hi: 'हाँ, पैदल सिर्फ़ दस मिनट लगते हैं।' },
                        { speaker: 'Sneha', en: 'Thank you very much, sir.', kn: 'ತುಂಬಾ ಧನ್ಯವಾದಗಳು, ಸರ್.', hi: 'बहुत-बहुत धन्यवाद, सर।' },
                        { speaker: 'Prakash', en: "You're welcome. Go carefully!", kn: 'ಪರವಾಗಿಲ್ಲ. ಹುಷಾರಾಗಿ ಹೋಗಿ!', hi: 'कोई बात नहीं। ध्यान से जाना!' }
                    ],
                    questions: [
                        {
                            q: { en: 'Where does Sneha want to go?', kn: 'ಸ್ನೇಹಾ ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು?', hi: 'स्नेहा कहाँ जाना चाहती है?' },
                            options: [
                                { en: 'To the government hospital', kn: 'ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆಗೆ', hi: 'सरकारी अस्पताल' },
                                { en: 'To the post office', kn: 'ಅಂಚೆ ಕಚೇರಿಗೆ', hi: 'डाकघर' },
                                { en: 'To the bus stop', kn: 'ಬಸ್ ನಿಲ್ದಾಣಕ್ಕೆ', hi: 'बस स्टॉप' },
                                { en: 'To the temple', kn: 'ದೇವಸ್ಥಾನಕ್ಕೆ', hi: 'मंदिर' }
                            ]
                        },
                        {
                            q: { en: 'What should she do at the signal?', kn: 'ಸಿಗ್ನಲ್ ಬಳಿ ಅವಳು ಏನು ಮಾಡಬೇಕು?', hi: 'सिग्नल पर उसे क्या करना है?' },
                            options: [
                                { en: 'Turn right', kn: 'ಬಲಕ್ಕೆ ತಿರುಗಬೇಕು', hi: 'दाएँ मुड़ना है' },
                                { en: 'Turn left', kn: 'ಎಡಕ್ಕೆ ತಿರುಗಬೇಕು', hi: 'बाएँ मुड़ना है' },
                                { en: 'Take a bus', kn: 'ಬಸ್ ಹತ್ತಬೇಕು', hi: 'बस लेनी है' },
                                { en: 'Go back', kn: 'ಹಿಂದಕ್ಕೆ ಹೋಗಬೇಕು', hi: 'वापस जाना है' }
                            ]
                        },
                        {
                            q: { en: 'How long is the walk to the hospital?', kn: 'ಆಸ್ಪತ್ರೆಗೆ ನಡೆದು ಹೋಗಲು ಎಷ್ಟು ಸಮಯ ಬೇಕು?', hi: 'अस्पताल तक पैदल कितना समय लगता है?' },
                            options: [
                                { en: 'Ten minutes', kn: 'ಹತ್ತು ನಿಮಿಷ', hi: 'दस मिनट' },
                                { en: 'Two minutes', kn: 'ಎರಡು ನಿಮಿಷ', hi: 'दो मिनट' },
                                { en: 'Half an hour', kn: 'ಅರ್ಧ ಗಂಟೆ', hi: 'आधा घंटा' },
                                { en: 'One hour', kn: 'ಒಂದು ಗಂಟೆ', hi: 'एक घंटा' }
                            ]
                        }
                    ]
                }
            ]
        },
        '6:1': {
            name: 'Festivals',
            lessons: [
                {
                    kind: 'words',
                    title: 'Festival things',
                    list: [
                        { en: 'festival', kn: 'ಹಬ್ಬ', hi: 'त्योहार', pic: '🎉', def: 'a special day when people celebrate together' },
                        { en: 'lamp', kn: 'ದೀಪ', hi: 'दीया', pic: '🪔', def: 'a small light, often a clay pot with oil' },
                        { en: 'flowers', kn: 'ಹೂವುಗಳು', hi: 'फूल', pic: '💐', def: 'the colourful parts of plants, used to decorate and to pray' },
                        { en: 'gift', kn: 'ಉಡುಗೊರೆ', hi: 'तोहफ़ा', pic: '🎁', def: 'something you give to someone on a special day' },
                        { en: 'fireworks', kn: 'ಪಟಾಕಿ', hi: 'आतिशबाज़ी', pic: '🎆', def: 'things that burst with light and sound in the sky' },
                        { en: 'colours', kn: 'ಬಣ್ಣಗಳು', hi: 'रंग', pic: '🎨', def: 'red, blue, yellow and green are colours' }
                    ]
                },
                {
                    kind: 'phrases',
                    title: 'Festivals 1',
                    list: [
                        { read: true, en: 'Deepavali is a festival of lamps.', kn: 'ದೀಪಾವಳಿ ದೀಪಗಳ ಹಬ್ಬ.', hi: 'दीवाली दीयों का त्योहार है।' },
                        { en: 'We watch fireworks from the terrace.', kn: 'ನಾವು ಮಾಳಿಗೆಯಿಂದ ಪಟಾಕಿ ನೋಡುತ್ತೇವೆ.', hi: 'हम छत से आतिशबाज़ी देखते हैं।' },
                        { read: true, en: 'The temple is full of flowers.', kn: 'ದೇವಸ್ಥಾನ ಹೂವುಗಳಿಂದ ತುಂಬಿದೆ.', hi: 'मंदिर फूलों से भरा है।' },
                        { en: 'This gift is for you.', kn: 'ಈ ಉಡುಗೊರೆ ನಿನಗಾಗಿ.', hi: 'यह तोहफ़ा तुम्हारे लिए है।' },
                        { en: 'Children play with colours at Holi.', kn: 'ಹೋಳಿಯಲ್ಲಿ ಮಕ್ಕಳು ಬಣ್ಣಗಳಿಂದ ಆಡುತ್ತಾರೆ.', hi: 'होली पर बच्चे रंगों से खेलते हैं।' }
                    ]
                },
                {
                    kind: 'words',
                    title: 'Celebrations',
                    list: [
                        { en: 'wedding', kn: 'ಮದುವೆ', hi: 'शादी', pic: '💒', def: 'the ceremony when two people get married' },
                        { en: 'birthday', kn: 'ಹುಟ್ಟುಹಬ್ಬ', hi: 'जन्मदिन', pic: '🎂', def: 'the day each year when you were born' },
                        { en: 'guest', kn: 'ಅತಿಥಿ', hi: 'मेहमान', pic: '👥', def: 'a person you invite to your home or party' },
                        { en: 'invitation', kn: 'ಆಮಂತ್ರಣ', hi: 'निमंत्रण', pic: '💌', def: 'a card or message asking someone to come' },
                        { en: 'dance', kn: 'ನೃತ್ಯ', hi: 'नाच', pic: '💃', def: 'moving your body to music' },
                        { en: 'music', kn: 'ಸಂಗೀತ', hi: 'संगीत', pic: '🎵', def: 'pleasant sounds made by singing or playing instruments' }
                    ]
                },
                {
                    kind: 'phrases',
                    title: 'Festivals 2',
                    list: [
                        { read: true, en: "My elder sister's wedding is next month.", kn: 'ನನ್ನ ಅಕ್ಕನ ಮದುವೆ ಮುಂದಿನ ತಿಂಗಳು.', hi: 'मेरी दीदी की शादी अगले महीने है।' },
                        { en: "Today is Rohan's birthday.", kn: 'ಇಂದು ರೋಹನನ ಹುಟ್ಟುಹಬ್ಬ.', hi: 'आज रोहन का जन्मदिन है।' },
                        { read: true, en: 'Many guests came to the wedding.', kn: 'ಮದುವೆಗೆ ತುಂಬಾ ಅತಿಥಿಗಳು ಬಂದರು.', hi: 'शादी में बहुत मेहमान आए।' },
                        { en: 'Did you get the invitation?', kn: 'ನಿಮಗೆ ಆಮಂತ್ರಣ ಸಿಕ್ಕಿತೇ?', hi: 'क्या आपको निमंत्रण मिला?' },
                        { read: true, en: 'Everyone danced to the music.', kn: 'ಎಲ್ಲರೂ ಸಂಗೀತಕ್ಕೆ ಕುಣಿದರು.', hi: 'सब लोग संगीत पर नाचे।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'Deepavali in the village', kn: 'ಹಳ್ಳಿಯಲ್ಲಿ ದೀಪಾವಳಿ', hi: 'गाँव में दीवाली' },
                    text: { en: "Every year, Nikhil goes to his grandparents' village in Mandya for Deepavali. His grandmother draws a big rangoli in front of the house. In the evening, the whole family lights small clay lamps. Nikhil's uncle brings a box of sweets and new clothes for the children. Later, they all watch fireworks in the sky. Nikhil likes this festival because the whole family is together.", kn: 'ಪ್ರತಿ ವರ್ಷ ನಿಖಿಲ್ ದೀಪಾವಳಿಗೆ ಮಂಡ್ಯದಲ್ಲಿರುವ ತನ್ನ ಅಜ್ಜ-ಅಜ್ಜಿಯ ಹಳ್ಳಿಗೆ ಹೋಗುತ್ತಾನೆ. ಅವನ ಅಜ್ಜಿ ಮನೆಯ ಮುಂದೆ ದೊಡ್ಡ ರಂಗೋಲಿ ಹಾಕುತ್ತಾರೆ. ಸಂಜೆ ಇಡೀ ಕುಟುಂಬ ಸಣ್ಣ ಮಣ್ಣಿನ ದೀಪಗಳನ್ನು ಹಚ್ಚುತ್ತದೆ. ನಿಖಿಲನ ಮಾವ ಮಕ್ಕಳಿಗಾಗಿ ಒಂದು ಡಬ್ಬ ಸಿಹಿತಿಂಡಿ ಮತ್ತು ಹೊಸ ಬಟ್ಟೆಗಳನ್ನು ತರುತ್ತಾರೆ. ನಂತರ ಎಲ್ಲರೂ ಆಕಾಶದಲ್ಲಿ ಪಟಾಕಿಗಳನ್ನು ನೋಡುತ್ತಾರೆ. ಇಡೀ ಕುಟುಂಬ ಒಟ್ಟಿಗೆ ಇರುವುದರಿಂದ ನಿಖಿಲನಿಗೆ ಈ ಹಬ್ಬ ಇಷ್ಟ.', hi: 'हर साल निखिल दीवाली पर मंड्या में अपने दादा-दादी के गाँव जाता है। उसकी दादी घर के सामने एक बड़ी रंगोली बनाती हैं। शाम को पूरा परिवार मिट्टी के छोटे दीये जलाता है। निखिल के मामा बच्चों के लिए मिठाई का एक डिब्बा और नए कपड़े लाते हैं। बाद में सब आसमान में आतिशबाज़ी देखते हैं। निखिल को यह त्योहार पसंद है क्योंकि पूरा परिवार साथ होता है।' },
                    questions: [
                        {
                            q: { en: "Where do Nikhil's grandparents live?", kn: 'ನಿಖಿಲನ ಅಜ್ಜ-ಅಜ್ಜಿ ಎಲ್ಲಿ ವಾಸಿಸುತ್ತಾರೆ?', hi: 'निखिल के दादा-दादी कहाँ रहते हैं?' },
                            options: [
                                { en: 'In a village in Mandya', kn: 'ಮಂಡ್ಯದ ಒಂದು ಹಳ್ಳಿಯಲ್ಲಿ', hi: 'मंड्या के एक गाँव में' },
                                { en: 'In Bengaluru city', kn: 'ಬೆಂಗಳೂರು ನಗರದಲ್ಲಿ', hi: 'बेंगलुरु शहर में' },
                                { en: 'In a village near Hubballi', kn: 'ಹುಬ್ಬಳ್ಳಿ ಹತ್ತಿರದ ಹಳ್ಳಿಯಲ್ಲಿ', hi: 'हुब्बल्ली के पास एक गाँव में' },
                                { en: 'In Mysuru', kn: 'ಮೈಸೂರಿನಲ್ಲಿ', hi: 'मैसूरु में' }
                            ]
                        },
                        {
                            q: { en: 'What does his grandmother make in front of the house?', kn: 'ಅಜ್ಜಿ ಮನೆಯ ಮುಂದೆ ಏನು ಹಾಕುತ್ತಾರೆ?', hi: 'दादी घर के सामने क्या बनाती हैं?' },
                            options: [
                                { en: 'A big rangoli', kn: 'ದೊಡ್ಡ ರಂಗೋಲಿ', hi: 'बड़ी रंगोली' },
                                { en: 'A small garden', kn: 'ಸಣ್ಣ ತೋಟ', hi: 'छोटा बगीचा' },
                                { en: 'A paper kite', kn: 'ಕಾಗದದ ಗಾಳಿಪಟ', hi: 'काग़ज़ की पतंग' },
                                { en: 'A flower shop', kn: 'ಹೂವಿನ ಅಂಗಡಿ', hi: 'फूलों की दुकान' }
                            ]
                        },
                        {
                            q: { en: 'Why does Nikhil like this festival?', kn: 'ನಿಖಿಲನಿಗೆ ಈ ಹಬ್ಬ ಏಕೆ ಇಷ್ಟ?', hi: 'निखिल को यह त्योहार क्यों पसंद है?' },
                            options: [
                                { en: 'The whole family is together', kn: 'ಇಡೀ ಕುಟುಂಬ ಒಟ್ಟಿಗೆ ಇರುತ್ತದೆ', hi: 'पूरा परिवार साथ होता है' },
                                { en: 'He gets a long college holiday', kn: 'ಕಾಲೇಜಿಗೆ ದೀರ್ಘ ರಜೆ ಸಿಗುತ್ತದೆ', hi: 'कॉलेज की लंबी छुट्टी मिलती है' },
                                { en: 'He can watch TV all day', kn: 'ದಿನವಿಡೀ ಟಿವಿ ನೋಡಬಹುದು', hi: 'दिन भर टीवी देख सकता है' },
                                { en: 'He wins a prize', kn: 'ಅವನಿಗೆ ಬಹುಮಾನ ಸಿಗುತ್ತದೆ', hi: 'उसे इनाम मिलता है' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'A wedding invitation', kn: 'ಮದುವೆಯ ಆಮಂತ್ರಣ', hi: 'शादी का निमंत्रण' },
                    scenario: { en: 'Pooja gives her college friend Kiran a wedding invitation in the canteen.', kn: 'ಪೂಜಾ ಕ್ಯಾಂಟೀನಿನಲ್ಲಿ ತನ್ನ ಕಾಲೇಜು ಗೆಳೆಯ ಕಿರಣನಿಗೆ ಮದುವೆಯ ಆಮಂತ್ರಣ ಕೊಡುತ್ತಾಳೆ.', hi: 'पूजा कैंटीन में अपने कॉलेज के दोस्त किरण को शादी का निमंत्रण देती है।' },
                    speakers: [
                        { name: 'Pooja', voice: 'f' },
                        { name: 'Kiran', voice: 'm' }
                    ],
                    lines: [
                        { speaker: 'Pooja', en: 'Kiran, this invitation is for you.', kn: 'ಕಿರಣ್, ಈ ಆಮಂತ್ರಣ ನಿನಗೆ.', hi: 'किरण, यह निमंत्रण तुम्हारे लिए है।' },
                        { speaker: 'Kiran', en: 'Thank you! Whose wedding is it?', kn: 'ಧನ್ಯವಾದ! ಯಾರ ಮದುವೆ?', hi: 'शुक्रिया! किसकी शादी है?' },
                        { speaker: 'Pooja', en: "My elder brother's. It is on the twelfth of December in Davanagere.", kn: 'ನನ್ನ ಅಣ್ಣನದು. ಡಿಸೆಂಬರ್ ಹನ್ನೆರಡರಂದು ದಾವಣಗೆರೆಯಲ್ಲಿ.', hi: 'मेरे बड़े भाई की। बारह दिसंबर को दावणगेरे में है।' },
                        { speaker: 'Kiran', en: 'Congratulations! I will surely come.', kn: 'ಅಭಿನಂದನೆಗಳು! ನಾನು ಖಂಡಿತ ಬರುತ್ತೇನೆ.', hi: 'बधाई हो! मैं ज़रूर आऊँगा।' },
                        { speaker: 'Pooja', en: 'Come a day early. That evening, there will be music and dance.', kn: 'ಒಂದು ದಿನ ಮೊದಲೇ ಬಾ. ಆ ಸಂಜೆ ಸಂಗೀತ ಮತ್ತು ನೃತ್ಯ ಇರುತ್ತದೆ.', hi: 'एक दिन पहले आ जाना। उस शाम संगीत और नाच होगा।' },
                        { speaker: 'Kiran', en: "But I can't dance at all!", kn: 'ಆದರೆ ನನಗೆ ಕುಣಿಯಲು ಬರುವುದೇ ಇಲ್ಲ!', hi: 'पर मुझे बिल्कुल नाचना नहीं आता!' },
                        { speaker: 'Pooja', en: "Don't worry, nobody dances well. Everyone just has fun.", kn: 'ಚಿಂತೆ ಬೇಡ, ಯಾರೂ ಚೆನ್ನಾಗಿ ಕುಣಿಯುವುದಿಲ್ಲ. ಎಲ್ಲರೂ ಸುಮ್ಮನೆ ಮಜಾ ಮಾಡುತ್ತಾರೆ.', hi: 'चिंता मत करो, कोई भी अच्छा नहीं नाचता। सब बस मज़े करते हैं।' },
                        { speaker: 'Kiran', en: 'Okay, then I will come and dance too!', kn: 'ಸರಿ, ಹಾಗಾದರೆ ನಾನೂ ಬಂದು ಕುಣಿಯುತ್ತೇನೆ!', hi: 'ठीक है, तो मैं भी आकर नाचूँगा!' }
                    ],
                    questions: [
                        {
                            q: { en: 'Whose wedding is it?', kn: 'ಇದು ಯಾರ ಮದುವೆ?', hi: 'यह किसकी शादी है?' },
                            options: [
                                { en: "Pooja's elder brother's", kn: 'ಪೂಜಾಳ ಅಣ್ಣನದು', hi: 'पूजा के बड़े भाई की' },
                                { en: "Kiran's sister's", kn: 'ಕಿರಣನ ತಂಗಿಯದು', hi: 'किरण की बहन की' },
                                { en: "Pooja's cousin's", kn: 'ಪೂಜಾಳ ಸಂಬಂಧಿಯದು', hi: 'पूजा के चचेरे भाई की' },
                                { en: "Their teacher's", kn: 'ಅವರ ಶಿಕ್ಷಕರದು', hi: 'उनके शिक्षक की' }
                            ]
                        },
                        {
                            q: { en: 'Where is the wedding?', kn: 'ಮದುವೆ ಎಲ್ಲಿ ನಡೆಯುತ್ತದೆ?', hi: 'शादी कहाँ है?' },
                            options: [
                                { en: 'In Davanagere', kn: 'ದಾವಣಗೆರೆಯಲ್ಲಿ', hi: 'दावणगेरे में' },
                                { en: 'In Bengaluru', kn: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ', hi: 'बेंगलुरु में' },
                                { en: 'In Hubballi', kn: 'ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ', hi: 'हुब्बल्ली में' },
                                { en: 'In Mysuru', kn: 'ಮೈಸೂರಿನಲ್ಲಿ', hi: 'मैसूरु में' }
                            ]
                        },
                        {
                            q: { en: 'What will there be on the evening before the wedding?', kn: 'ಮದುವೆಯ ಹಿಂದಿನ ದಿನ ಸಂಜೆ ಏನು ಇರುತ್ತದೆ?', hi: 'शादी से एक दिन पहले शाम को क्या होगा?' },
                            options: [
                                { en: 'Music and dance', kn: 'ಸಂಗೀತ ಮತ್ತು ನೃತ್ಯ', hi: 'संगीत और नाच' },
                                { en: 'A cricket match', kn: 'ಕ್ರಿಕೆಟ್ ಪಂದ್ಯ', hi: 'क्रिकेट मैच' },
                                { en: 'A film show', kn: 'ಸಿನಿಮಾ ಪ್ರದರ್ಶನ', hi: 'फ़िल्म शो' },
                                { en: 'A college exam', kn: 'ಕಾಲೇಜು ಪರೀಕ್ಷೆ', hi: 'कॉलेज की परीक्षा' }
                            ]
                        }
                    ]
                }
            ]
        }
    },
    glosses: {
        kn: {
            'ನನ್ನ ಅಂಗಿ ಬಿಳಿ ಬಣ್ಣದ್ದು.': 'my/mine|shirt|white|coloured/in colour',
            'ಅಮ್ಮ ರೇಷ್ಮೆ ಸೀರೆ ಉಡುತ್ತಾರೆ.': 'mother|silk|saree|wears/wear',
            'ಈ ಬೂಟು ಮತ್ತು ಕಾಲುಚೀಲಗಳು ಹೊಸವು.': 'these/this|shoes/shoe|and|socks|new/are new',
            'ಬಿಸಿಲಿನಲ್ಲಿ ನಿನ್ನ ಟೋಪಿ ಹಾಕಿಕೋ.': 'in the sun/in sunshine|your|cap|wear/put on',
            'ಅವನ ಪ್ಯಾಂಟ್ ತುಂಬಾ ಉದ್ದವಾಗಿದೆ.': 'his|trousers/pants|too/very|long/is long',
            'ಊಟದ ಮೊದಲು ಕೈ ತೊಳೆಯಿರಿ.': 'eating/meal|before|hands/hand|wash',
            'ನನ್ನ ಕಣ್ಣುಗಳು ದಣಿದಿವೆ.': 'my|eyes|are tired/tired',
            'ಅವಳಿಗೆ ಉದ್ದ ಕೂದಲು ಇದೆ.': 'she/to her|long|hair|has/is there',
            'ಪ್ರತಿ ರಾತ್ರಿ ನಿಮ್ಮ ಹಲ್ಲು ಉಜ್ಜಿರಿ.': 'every|night|your|teeth/tooth|brush/rub',
            'ನನ್ನ ಕಿವಿ ನೋಯುತ್ತಿದೆ.': 'my|ear|hurts/is paining',
            'ಆಸ್ಪತ್ರೆ ರಾತ್ರಿಯಿಡೀ ತೆರೆದಿರುತ್ತದೆ.': 'hospital|all night/whole night|is open/stays open',
            'ನಾನು ಅಂಚೆ ಕಚೇರಿಯಿಂದ ಪಾರ್ಸೆಲ್ ಕಳುಹಿಸುತ್ತೇನೆ.': 'I|post/mail|from the office/office|parcel|send',
            'ನಮ್ಮ ಕಾಲೇಜಿನ ಹತ್ತಿರ ಒಂದು ಹಳೆಯ ದೇವಸ್ಥಾನ ಇದೆ.': 'our|college/of the college|near|an/one|old|temple|there is/is',
            'ಮಕ್ಕಳು ಉದ್ಯಾನವನದಲ್ಲಿ ಆಡುತ್ತಾರೆ.': 'children|in the park/park|play',
            'ಪೊಲೀಸ್ ಠಾಣೆ ಬ್ಯಾಂಕ್ ಹತ್ತಿರ ಇದೆ.': 'police|station|bank|near|is',
            'ಸಿಗ್ನಲ್ ಬಳಿ ಎಡಕ್ಕೆ ತಿರುಗಿ.': 'signal|at/near|left/to the left|turn',
            'ದೇವಸ್ಥಾನ ಬಲಗಡೆ ಇದೆ.': 'temple|on the right/right side|is',
            'ಎರಡು ನಿಮಿಷ ನೇರವಾಗಿ ಹೋಗಿ.': 'two|minutes/minute|straight|go',
            'ದಯವಿಟ್ಟು ನನಗೆ ನಕ್ಷೆಯಲ್ಲಿ ತೋರಿಸಿ.': 'please|me/to me|on the map/map|show',
            'ಬಸ್ ನಿಲ್ದಾಣದಲ್ಲಿ ನನಗಾಗಿ ಕಾಯಿರಿ.': 'bus|at the stop/at the stand|for me|wait',
            'ದೀಪಾವಳಿ ದೀಪಗಳ ಹಬ್ಬ.': 'Deepavali|of lamps/lamps|festival/is a festival',
            'ನಾವು ಮಾಳಿಗೆಯಿಂದ ಪಟಾಕಿ ನೋಡುತ್ತೇವೆ.': 'we|from the terrace/terrace|fireworks/crackers|watch/see',
            'ದೇವಸ್ಥಾನ ಹೂವುಗಳಿಂದ ತುಂಬಿದೆ.': 'temple|of flowers/with flowers|is full/full',
            'ಈ ಉಡುಗೊರೆ ನಿನಗಾಗಿ.': 'this|gift|for you',
            'ಹೋಳಿಯಲ್ಲಿ ಮಕ್ಕಳು ಬಣ್ಣಗಳಿಂದ ಆಡುತ್ತಾರೆ.': 'at Holi/in Holi|children|with colours/colours|play',
            'ನನ್ನ ಅಕ್ಕನ ಮದುವೆ ಮುಂದಿನ ತಿಂಗಳು.': "my|elder sister's/sister's|wedding/marriage|next|month",
            'ಇಂದು ರೋಹನನ ಹುಟ್ಟುಹಬ್ಬ.': "today|Rohan's|birthday",
            'ಮದುವೆಗೆ ತುಂಬಾ ಅತಿಥಿಗಳು ಬಂದರು.': 'to the wedding/wedding|many/a lot|guests|came',
            'ನಿಮಗೆ ಆಮಂತ್ರಣ ಸಿಕ್ಕಿತೇ?': 'you/to you|invitation|did get/got',
            'ಎಲ್ಲರೂ ಸಂಗೀತಕ್ಕೆ ಕುಣಿದರು.': 'everyone/all|to the music/music|danced'
        },
        hi: {
            'मेरी कमीज़ सफ़ेद है।': 'my/mine|shirt|white|is',
            'माँ रेशमी साड़ी पहनती हैं।': 'mother|silk|saree|wears/wear|is',
            'ये जूते और मोज़े नए हैं।': 'these/they|shoes|and|socks|new|are',
            'धूप में अपनी टोपी पहनो।': 'sun/sunshine|in|your/own|cap|wear/put on',
            'उसकी पैंट बहुत लंबी है।': 'his/her|trousers/pants|too/very|long|is',
            'खाने से पहले हाथ धोइए।': 'eating/food|from/than|before|hands/hand|wash',
            'मेरी आँखें थक गई हैं।': 'my|eyes|tired|got/became|are',
            'उसके बाल लंबे हैं।': 'her/his|hair|long|are',
            'हर रात अपने दाँत ब्रश करो।': 'every|night|your/own|teeth|brush|do',
            'मेरे कान में दर्द है।': 'my|ear|in|pain/ache|is',
            'अस्पताल पूरी रात खुला रहता है।': 'hospital|all/whole|night|open|stays/remains|is',
            'मैं डाकघर से पार्सल भेजता हूँ।': 'I|post office|from|parcel|send|am',
            'हमारे कॉलेज के पास एक पुराना मंदिर है।': 'our|college|of|near|an/one|old|temple|there is/is',
            'बच्चे पार्क में खेलते हैं।': 'children|park|in|play|are',
            'पुलिस थाना बैंक के पास है।': 'police|station|bank|of|near|is',
            'सिग्नल पर बाएँ मुड़ो।': 'signal|at/on|left|turn',
            'मंदिर दाईं तरफ़ है।': 'temple|right|side/direction|is',
            'दो मिनट सीधे जाओ।': 'two|minutes/minute|straight|go',
            'कृपया मुझे नक्शे पर दिखाइए।': 'please|me/to me|map|on|show',
            'बस स्टॉप पर मेरा इंतज़ार करो।': 'bus|stop|at/on|for me/my|wait/waiting|do',
            'दीवाली दीयों का त्योहार है।': 'Deepavali/Diwali|lamps|of|festival|is',
            'हम छत से आतिशबाज़ी देखते हैं।': 'we|terrace/roof|from|fireworks|watch/see|are',
            'मंदिर फूलों से भरा है।': 'temple|flowers|of/with|full|is',
            'यह तोहफ़ा तुम्हारे लिए है।': 'this|gift|you/your|for|is',
            'होली पर बच्चे रंगों से खेलते हैं।': 'Holi|at/on|children|colours|with|play|are',
            'मेरी दीदी की शादी अगले महीने है।': "my|elder sister/sister|'s/of|wedding/marriage|next|month|is",
            'आज रोहन का जन्मदिन है।': "today|Rohan|'s/of|birthday|is",
            'शादी में बहुत मेहमान आए।': 'wedding|to/in|many/a lot|guests|came',
            'क्या आपको निमंत्रण मिला?': 'did/what|you/to you|invitation|got/received',
            'सब लोग संगीत पर नाचे।': 'all/everyone|people|music|to/on|danced'
        }
    }
};
