/**
 * Elementary section "Daily life" (about CEFR A2), units 1–3: At home, Shopping, In the kitchen.
 * For learners who finished the first beginner section. English, Kannada and Hindi, written here with no outside
 * service: a native speaker should check them.
 */
module.exports = {
    level: 'elementary',
    units: {
        '1:1': {
            name: 'At home',
            lessons: [
                {
                    kind: 'words', title: 'Rooms', list: [
                        { en: 'kitchen', kn: 'ಅಡುಗೆಮನೆ', hi: 'रसोई', pic: '🍳', def: 'the room where food is cooked' },
                        { en: 'bedroom', kn: 'ಮಲಗುವ ಕೋಣೆ', hi: 'सोने का कमरा', pic: '🛌', def: 'the room where you sleep' },
                        { en: 'bathroom', kn: 'ಸ್ನಾನದ ಕೋಣೆ', hi: 'बाथरूम', pic: '🚿', def: 'the room where you take a bath' },
                        { en: 'window', kn: 'ಕಿಟಕಿ', hi: 'खिड़की', pic: '🪟', def: 'an opening in a wall that lets in light and air' },
                        { en: 'door', kn: 'ಬಾಗಿಲು', hi: 'दरवाज़ा', pic: '🚪', def: 'you open it to go into or out of a room' },
                        { en: 'wall', kn: 'ಗೋಡೆ', hi: 'दीवार', pic: '🧱', def: 'one of the sides of a room or building' }
                    ]
                },
                {
                    kind: 'phrases', title: 'At home 1', list: [
                        { read: true, en: 'Our kitchen is small.', kn: 'ನಮ್ಮ ಅಡುಗೆಮನೆ ಚಿಕ್ಕದು.', hi: 'हमारी रसोई छोटी है।' },
                        { read: true, en: 'Please open the window.', kn: 'ದಯವಿಟ್ಟು ಕಿಟಕಿ ತೆರೆಯಿರಿ.', hi: 'कृपया खिड़की खोलिए।', acc: { kn: ['ದಯವಿಟ್ಟು ಕಿಟಕಿ ತೆರೆ.'], hi: ['कृपया खिड़की खोलो।'] } },
                        { en: 'Close the bedroom door.', kn: 'ಮಲಗುವ ಕೋಣೆಯ ಬಾಗಿಲು ಮುಚ್ಚಿ.', hi: 'सोने के कमरे का दरवाज़ा बंद कीजिए।', acc: { kn: ['ಮಲಗುವ ಕೋಣೆಯ ಬಾಗಿಲು ಮುಚ್ಚು.'], hi: ['सोने के कमरे का दरवाज़ा बंद करो।'] } },
                        { en: 'Where is the bathroom?', kn: 'ಸ್ನಾನದ ಕೋಣೆ ಎಲ್ಲಿದೆ?', hi: 'बाथरूम कहाँ है?' },
                        { read: true, en: 'There is a clock on the wall.', kn: 'ಗೋಡೆಯ ಮೇಲೆ ಗಡಿಯಾರ ಇದೆ.', hi: 'दीवार पर घड़ी है।' }
                    ]
                },
                {
                    kind: 'words', title: 'Things at home', list: [
                        { en: 'bed', kn: 'ಮಂಚ', hi: 'पलंग', pic: '🛏️', def: 'a piece of furniture you sleep on' },
                        { en: 'fan', kn: 'ಫ್ಯಾನ್', hi: 'पंखा', pic: '🌀', def: 'a machine with turning blades that moves air' },
                        { en: 'chair', kn: 'ಕುರ್ಚಿ', hi: 'कुर्सी', pic: '🪑', def: 'a seat for one person, with a back' },
                        { en: 'television', kn: 'ಟಿವಿ', hi: 'टीवी', pic: '📺', def: 'a machine for watching shows, films and news' },
                        { en: 'key', kn: 'ಬೀಗದ ಕೈ', hi: 'चाबी', pic: '🔑', def: 'a small metal thing that opens a lock' },
                        { en: 'broom', kn: 'ಪೊರಕೆ', hi: 'झाड़ू', pic: '🧹', def: 'a brush with a long handle for sweeping the floor' }
                    ]
                },
                {
                    kind: 'phrases', title: 'At home 2', list: [
                        { read: true, en: 'Switch on the fan.', kn: 'ಫ್ಯಾನ್ ಹಾಕಿ.', hi: 'पंखा चलाइए।', acc: { en: ['Turn on the fan.'], kn: ['ಫ್ಯಾನ್ ಹಾಕು.'], hi: ['पंखा चलाओ।'] } },
                        { read: true, en: 'The key is under the bed.', kn: 'ಬೀಗದ ಕೈ ಮಂಚದ ಕೆಳಗೆ ಇದೆ.', hi: 'चाबी पलंग के नीचे है।' },
                        { en: 'Please sit on this chair.', kn: 'ದಯವಿಟ್ಟು ಈ ಕುರ್ಚಿಯಲ್ಲಿ ಕುಳಿತುಕೊಳ್ಳಿ.', hi: 'कृपया इस कुर्सी पर बैठिए।' },
                        { en: 'I sweep the floor with a broom.', kn: 'ನಾನು ಪೊರಕೆಯಿಂದ ನೆಲ ಗುಡಿಸುತ್ತೇನೆ.', hi: 'मैं झाड़ू से फ़र्श साफ़ करता हूँ।', acc: { hi: ['मैं झाड़ू से फ़र्श साफ़ करती हूँ।'] } },
                        { read: true, en: 'My father watches television at night.', kn: 'ನನ್ನ ತಂದೆ ರಾತ್ರಿ ಟಿವಿ ನೋಡುತ್ತಾರೆ.', hi: 'मेरे पिताजी रात को टीवी देखते हैं।', acc: { en: ['My father watches TV at night.'] } }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'Kavya\'s new home', kn: 'ಕಾವ್ಯಾಳ ಹೊಸ ಮನೆ', hi: 'काव्या का नया घर' },
                    text: {
                        en: 'Last month, Kavya\'s family moved into a new house in Mysuru. The house has two bedrooms, a kitchen and a big hall. Kavya\'s bedroom has a large window. In the morning, sunlight comes in through this window. Her mother keeps the kitchen very clean. There is a new fan in the hall. In the evening, the whole family watches television together.',
                        kn: 'ಕಳೆದ ತಿಂಗಳು ಕಾವ್ಯಾಳ ಕುಟುಂಬ ಮೈಸೂರಿನ ಒಂದು ಹೊಸ ಮನೆಗೆ ಸ್ಥಳಾಂತರಗೊಂಡಿತು. ಆ ಮನೆಯಲ್ಲಿ ಎರಡು ಮಲಗುವ ಕೋಣೆಗಳು, ಒಂದು ಅಡುಗೆಮನೆ ಮತ್ತು ಒಂದು ದೊಡ್ಡ ಹಜಾರ ಇವೆ. ಕಾವ್ಯಾಳ ಮಲಗುವ ಕೋಣೆಯಲ್ಲಿ ಒಂದು ದೊಡ್ಡ ಕಿಟಕಿ ಇದೆ. ಬೆಳಿಗ್ಗೆ ಈ ಕಿಟಕಿಯಿಂದ ಬಿಸಿಲು ಒಳಗೆ ಬರುತ್ತದೆ. ಅವಳ ತಾಯಿ ಅಡುಗೆಮನೆಯನ್ನು ತುಂಬಾ ಸ್ವಚ್ಛವಾಗಿ ಇಡುತ್ತಾರೆ. ಹಜಾರದಲ್ಲಿ ಒಂದು ಹೊಸ ಫ್ಯಾನ್ ಇದೆ. ಸಂಜೆ ಇಡೀ ಕುಟುಂಬ ಒಟ್ಟಿಗೆ ಟಿವಿ ನೋಡುತ್ತದೆ.',
                        hi: 'पिछले महीने काव्या का परिवार मैसूर के एक नए घर में रहने आया। घर में दो सोने के कमरे, एक रसोई और एक बड़ा हॉल हैं। काव्या के कमरे में एक बड़ी खिड़की है। सुबह इसी खिड़की से धूप अंदर आती है। उसकी माँ रसोई को बहुत साफ़ रखती हैं। हॉल में एक नया पंखा है। शाम को पूरा परिवार साथ बैठकर टीवी देखता है।'
                    },
                    questions: [
                        {
                            q: { en: 'What does Kavya\'s bedroom have?', kn: 'ಕಾವ್ಯಾಳ ಮಲಗುವ ಕೋಣೆಯಲ್ಲಿ ಏನಿದೆ?', hi: 'काव्या के कमरे में क्या है?' },
                            options: [
                                { en: 'A large window', kn: 'ಒಂದು ದೊಡ್ಡ ಕಿಟಕಿ', hi: 'एक बड़ी खिड़की' },
                                { en: 'A new fan', kn: 'ಒಂದು ಹೊಸ ಫ್ಯಾನ್', hi: 'एक नया पंखा' },
                                { en: 'A television', kn: 'ಒಂದು ಟಿವಿ', hi: 'एक टीवी' },
                                { en: 'A big mirror', kn: 'ಒಂದು ದೊಡ್ಡ ಕನ್ನಡಿ', hi: 'एक बड़ा आईना' }
                            ]
                        },
                        {
                            q: { en: 'What comes in through the window in the morning?', kn: 'ಬೆಳಿಗ್ಗೆ ಕಿಟಕಿಯಿಂದ ಏನು ಒಳಗೆ ಬರುತ್ತದೆ?', hi: 'सुबह खिड़की से क्या अंदर आता है?' },
                            options: [
                                { en: 'Sunlight', kn: 'ಬಿಸಿಲು', hi: 'धूप' },
                                { en: 'Rain', kn: 'ಮಳೆ', hi: 'बारिश' },
                                { en: 'Dust', kn: 'ಧೂಳು', hi: 'धूल' },
                                { en: 'Smoke', kn: 'ಹೊಗೆ', hi: 'धुआँ' }
                            ]
                        },
                        {
                            q: { en: 'What does the family do in the evening?', kn: 'ಸಂಜೆ ಕುಟುಂಬದವರು ಏನು ಮಾಡುತ್ತಾರೆ?', hi: 'शाम को परिवार क्या करता है?' },
                            options: [
                                { en: 'They watch television together.', kn: 'ಒಟ್ಟಿಗೆ ಟಿವಿ ನೋಡುತ್ತಾರೆ.', hi: 'साथ बैठकर टीवी देखता है।' },
                                { en: 'They go to the market.', kn: 'ಮಾರುಕಟ್ಟೆಗೆ ಹೋಗುತ್ತಾರೆ.', hi: 'बाज़ार जाता है।' },
                                { en: 'They play cricket.', kn: 'ಕ್ರಿಕೆಟ್ ಆಡುತ್ತಾರೆ.', hi: 'क्रिकेट खेलता है।' },
                                { en: 'They clean the kitchen.', kn: 'ಅಡುಗೆಮನೆ ಸ್ವಚ್ಛ ಮಾಡುತ್ತಾರೆ.', hi: 'रसोई साफ़ करता है।' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'A visit to the new home', kn: 'ಹೊಸ ಮನೆಗೆ ಭೇಟಿ', hi: 'नए घर की सैर' },
                    scenario: {
                        en: 'Kiran visits his classmate Sneha\'s new home in Hubballi.',
                        kn: 'ಕಿರಣ್ ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿರುವ ತನ್ನ ಸಹಪಾಠಿ ಸ್ನೇಹಾಳ ಹೊಸ ಮನೆಗೆ ಬರುತ್ತಾನೆ.',
                        hi: 'किरण हुबली में अपनी सहपाठी स्नेहा के नए घर आता है।'
                    },
                    speakers: [{ name: 'Kiran', voice: 'm' }, { name: 'Sneha', voice: 'f' }],
                    lines: [
                        { speaker: 'Kiran', en: 'Your new home is very nice!', kn: 'ನಿಮ್ಮ ಹೊಸ ಮನೆ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ!', hi: 'तुम्हारा नया घर बहुत अच्छा है!' },
                        { speaker: 'Sneha', en: 'Thank you. Come, this is our kitchen.', kn: 'ಧನ್ಯವಾದ. ಬಾ, ಇದು ನಮ್ಮ ಅಡುಗೆಮನೆ.', hi: 'धन्यवाद। आओ, यह हमारी रसोई है।' },
                        { speaker: 'Kiran', en: 'It is big. How many bedrooms are there?', kn: 'ಇದು ದೊಡ್ಡದಾಗಿದೆ. ಎಷ್ಟು ಮಲಗುವ ಕೋಣೆಗಳಿವೆ?', hi: 'यह तो बड़ी है। कितने सोने के कमरे हैं?' },
                        { speaker: 'Sneha', en: 'Three. My room is near the bathroom.', kn: 'ಮೂರು. ನನ್ನ ಕೋಣೆ ಸ್ನಾನದ ಕೋಣೆಯ ಹತ್ತಿರ ಇದೆ.', hi: 'तीन। मेरा कमरा बाथरूम के पास है।' },
                        { speaker: 'Kiran', en: 'It is very hot in your room. Is there no fan?', kn: 'ನಿನ್ನ ಕೋಣೆಯಲ್ಲಿ ತುಂಬಾ ಸೆಖೆ ಇದೆ. ಫ್ಯಾನ್ ಇಲ್ಲವಾ?', hi: 'तुम्हारे कमरे में बहुत गर्मी है। पंखा नहीं है क्या?' },
                        { speaker: 'Sneha', en: 'Not yet. My father will buy one on Sunday.', kn: 'ಇನ್ನೂ ಇಲ್ಲ. ಅಪ್ಪ ಭಾನುವಾರ ಒಂದು ಫ್ಯಾನ್ ಕೊಳ್ಳುತ್ತಾರೆ.', hi: 'अभी नहीं। पापा रविवार को एक पंखा ख़रीदेंगे।' },
                        { speaker: 'Kiran', en: 'Then open the window for now.', kn: 'ಹಾಗಾದರೆ ಸದ್ಯಕ್ಕೆ ಕಿಟಕಿ ತೆರೆ.', hi: 'तो अभी के लिए खिड़की खोल दो।' },
                        { speaker: 'Sneha', en: 'Good idea. The cool breeze feels nice.', kn: 'ಒಳ್ಳೆಯ ಉಪಾಯ. ತಂಗಾಳಿ ಹಿತವಾಗಿದೆ.', hi: 'अच्छा विचार है। ठंडी हवा अच्छी लग रही है।' }
                    ],
                    questions: [
                        {
                            q: { en: 'How many bedrooms does Sneha\'s new home have?', kn: 'ಸ್ನೇಹಾಳ ಹೊಸ ಮನೆಯಲ್ಲಿ ಎಷ್ಟು ಮಲಗುವ ಕೋಣೆಗಳಿವೆ?', hi: 'स्नेहा के नए घर में कितने सोने के कमरे हैं?' },
                            options: [
                                { en: 'Three', kn: 'ಮೂರು', hi: 'तीन' },
                                { en: 'Two', kn: 'ಎರಡು', hi: 'दो' },
                                { en: 'Four', kn: 'ನಾಲ್ಕು', hi: 'चार' },
                                { en: 'One', kn: 'ಒಂದು', hi: 'एक' }
                            ]
                        },
                        {
                            q: { en: 'Where is Sneha\'s room?', kn: 'ಸ್ನೇಹಾಳ ಕೋಣೆ ಎಲ್ಲಿದೆ?', hi: 'स्नेहा का कमरा कहाँ है?' },
                            options: [
                                { en: 'Near the bathroom', kn: 'ಸ್ನಾನದ ಕೋಣೆಯ ಹತ್ತಿರ', hi: 'बाथरूम के पास' },
                                { en: 'Near the kitchen', kn: 'ಅಡುಗೆಮನೆಯ ಹತ್ತಿರ', hi: 'रसोई के पास' },
                                { en: 'Near the main door', kn: 'ಮುಖ್ಯ ಬಾಗಿಲಿನ ಹತ್ತಿರ', hi: 'मुख्य दरवाज़े के पास' },
                                { en: 'Near the garden', kn: 'ತೋಟದ ಹತ್ತಿರ', hi: 'बगीचे के पास' }
                            ]
                        },
                        {
                            q: { en: 'What will Sneha\'s father buy on Sunday?', kn: 'ಸ್ನೇಹಾಳ ತಂದೆ ಭಾನುವಾರ ಏನು ಕೊಳ್ಳುತ್ತಾರೆ?', hi: 'स्नेहा के पापा रविवार को क्या ख़रीदेंगे?' },
                            options: [
                                { en: 'A fan', kn: 'ಒಂದು ಫ್ಯಾನ್', hi: 'एक पंखा' },
                                { en: 'A bed', kn: 'ಒಂದು ಮಂಚ', hi: 'एक पलंग' },
                                { en: 'A television', kn: 'ಒಂದು ಟಿವಿ', hi: 'एक टीवी' },
                                { en: 'A chair', kn: 'ಒಂದು ಕುರ್ಚಿ', hi: 'एक कुर्सी' }
                            ]
                        }
                    ]
                }
            ]
        },
        '2:1': {
            name: 'Shopping',
            lessons: [
                {
                    kind: 'words', title: 'At the market', list: [
                        { en: 'shop', kn: 'ಅಂಗಡಿ', hi: 'दुकान', pic: '🏪', def: 'a place where you buy things' },
                        { en: 'market', kn: 'ಮಾರುಕಟ್ಟೆ', hi: 'बाज़ार', pic: '🛒', def: 'a place with many shops and stalls' },
                        { en: 'price', kn: 'ಬೆಲೆ', hi: 'दाम', pic: '🏷️', def: 'the money you pay for something' },
                        { en: 'cheap', kn: 'ಅಗ್ಗ', hi: 'सस्ता', pic: '📉', def: 'not costing much money' },
                        { en: 'expensive', kn: 'ದುಬಾರಿ', hi: 'महँगा', pic: '💎', def: 'costing a lot of money' },
                        { en: 'buy', kn: 'ಕೊಳ್ಳು', hi: 'ख़रीदना', pic: '🛍️', def: 'to get something by paying money for it' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Shopping 1', list: [
                        { read: true, en: 'This shop is near our college.', kn: 'ಈ ಅಂಗಡಿ ನಮ್ಮ ಕಾಲೇಜಿನ ಹತ್ತಿರ ಇದೆ.', hi: 'यह दुकान हमारे कॉलेज के पास है।' },
                        { read: true, en: 'Vegetables are cheap in the market.', kn: 'ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ತರಕಾರಿ ಅಗ್ಗವಾಗಿದೆ.', hi: 'बाज़ार में सब्ज़ियाँ सस्ती हैं।' },
                        { en: 'What is the price of this pen?', kn: 'ಈ ಪೆನ್ನಿನ ಬೆಲೆ ಎಷ್ಟು?', hi: 'इस कलम का दाम कितना है?' },
                        { en: 'This phone is too expensive.', kn: 'ಈ ಫೋನ್ ತುಂಬಾ ದುಬಾರಿ.', hi: 'यह फ़ोन बहुत महँगा है।' },
                        { en: 'I want to buy a new bag.', kn: 'ನಾನು ಒಂದು ಹೊಸ ಚೀಲ ಕೊಳ್ಳಬೇಕು.', hi: 'मुझे एक नया बैग ख़रीदना है।' }
                    ]
                },
                {
                    kind: 'words', title: 'Paying', list: [
                        { en: 'rupee', kn: 'ರೂಪಾಯಿ', hi: 'रुपया', pic: '💰', def: 'the money of India' },
                        { en: 'coin', kn: 'ನಾಣ್ಯ', hi: 'सिक्का', pic: '🪙', def: 'a small round piece of metal money' },
                        { en: 'change', kn: 'ಚಿಲ್ಲರೆ', hi: 'छुट्टे पैसे', pic: '💱', def: 'small money, or money you get back when you pay more' },
                        { en: 'bill', kn: 'ಬಿಲ್', hi: 'बिल', pic: '🧾', def: 'a paper that shows how much you must pay' },
                        { en: 'kilo', kn: 'ಕಿಲೋ', hi: 'किलो', pic: '⚖️', def: 'a measure of weight; one thousand grams' },
                        { en: 'dozen', kn: 'ಡಜನ್', hi: 'दर्जन', pic: '🥚', def: 'a group of twelve' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Shopping 2', list: [
                        { read: true, en: 'Give me one kilo of sugar.', kn: 'ಒಂದು ಕಿಲೋ ಸಕ್ಕರೆ ಕೊಡಿ.', hi: 'एक किलो चीनी दीजिए।', acc: { en: ['Give me a kilo of sugar.'] } },
                        { read: true, en: 'One dozen bananas cost sixty rupees.', kn: 'ಒಂದು ಡಜನ್ ಬಾಳೆಹಣ್ಣಿಗೆ ಅರವತ್ತು ರೂಪಾಯಿ.', hi: 'एक दर्जन केले साठ रुपये के हैं।', acc: { en: ['A dozen bananas cost sixty rupees.'] } },
                        { en: 'Do you have change?', kn: 'ನಿಮ್ಮ ಹತ್ತಿರ ಚಿಲ್ಲರೆ ಇದೆಯಾ?', hi: 'क्या आपके पास छुट्टे पैसे हैं?', acc: { en: ['Do you have any change?'] } },
                        { read: true, en: 'Please give me the bill.', kn: 'ದಯವಿಟ್ಟು ಬಿಲ್ ಕೊಡಿ.', hi: 'कृपया मुझे बिल दीजिए।' },
                        { en: 'I paid with a ten-rupee coin.', kn: 'ನಾನು ಹತ್ತು ರೂಪಾಯಿಯ ನಾಣ್ಯ ಕೊಟ್ಟೆ.', hi: 'मैंने दस रुपये का सिक्का दिया।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'Saturday at the market', kn: 'ಶನಿವಾರ ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ', hi: 'शनिवार को बाज़ार में' },
                    text: {
                        en: 'On Saturday, Rahul went to the market with his grandmother. The market was full of people. Grandmother bought two kilos of rice and a dozen bananas. The rice was cheap, but the bananas were a little expensive. She paid five hundred rupees, and the shopkeeper gave her the change. At a sports shop, Rahul asked for a new cricket bat. It cost nine hundred rupees. That was too expensive, so they did not buy it.',
                        kn: 'ಶನಿವಾರ ರಾಹುಲ್ ತನ್ನ ಅಜ್ಜಿಯ ಜೊತೆ ಮಾರುಕಟ್ಟೆಗೆ ಹೋದನು. ಮಾರುಕಟ್ಟೆ ಜನರಿಂದ ತುಂಬಿತ್ತು. ಅಜ್ಜಿ ಎರಡು ಕಿಲೋ ಅಕ್ಕಿ ಮತ್ತು ಒಂದು ಡಜನ್ ಬಾಳೆಹಣ್ಣು ಕೊಂಡರು. ಅಕ್ಕಿ ಅಗ್ಗವಾಗಿತ್ತು, ಆದರೆ ಬಾಳೆಹಣ್ಣು ಸ್ವಲ್ಪ ದುಬಾರಿಯಾಗಿತ್ತು. ಅಜ್ಜಿ ಐನೂರು ರೂಪಾಯಿ ಕೊಟ್ಟರು ಮತ್ತು ಅಂಗಡಿಯವನು ಅವರಿಗೆ ಚಿಲ್ಲರೆ ವಾಪಸ್ ಕೊಟ್ಟನು. ಕ್ರೀಡಾ ಸಾಮಗ್ರಿಗಳ ಅಂಗಡಿಯಲ್ಲಿ ರಾಹುಲ್ ಒಂದು ಹೊಸ ಕ್ರಿಕೆಟ್ ಬ್ಯಾಟ್ ಕೇಳಿದನು. ಅದರ ಬೆಲೆ ಒಂಬೈನೂರು ರೂಪಾಯಿ ಆಗಿತ್ತು. ಅದು ತುಂಬಾ ದುಬಾರಿಯಾಗಿದ್ದರಿಂದ ಅವರು ಅದನ್ನು ಕೊಳ್ಳಲಿಲ್ಲ.',
                        hi: 'शनिवार को राहुल अपनी दादी के साथ बाज़ार गया। बाज़ार लोगों से भरा हुआ था। दादी ने दो किलो चावल और एक दर्जन केले ख़रीदे। चावल सस्ता था, लेकिन केले थोड़े महँगे थे। दादी ने पाँच सौ रुपये दिए और दुकानदार ने उन्हें बाक़ी पैसे लौटा दिए। खेल के सामान की एक दुकान पर राहुल ने एक नया क्रिकेट बैट माँगा। उसका दाम नौ सौ रुपये था। वह बहुत महँगा था, इसलिए उन्होंने उसे नहीं ख़रीदा।'
                    },
                    questions: [
                        {
                            q: { en: 'Who went to the market with Rahul?', kn: 'ರಾಹುಲ್ ಜೊತೆ ಮಾರುಕಟ್ಟೆಗೆ ಯಾರು ಹೋದರು?', hi: 'राहुल के साथ बाज़ार कौन गया?' },
                            options: [
                                { en: 'His grandmother', kn: 'ಅವನ ಅಜ್ಜಿ', hi: 'उसकी दादी' },
                                { en: 'His mother', kn: 'ಅವನ ತಾಯಿ', hi: 'उसकी माँ' },
                                { en: 'His friend', kn: 'ಅವನ ಸ್ನೇಹಿತ', hi: 'उसका दोस्त' },
                                { en: 'His teacher', kn: 'ಅವನ ಶಿಕ್ಷಕರು', hi: 'उसके शिक्षक' }
                            ]
                        },
                        {
                            q: { en: 'What was cheap?', kn: 'ಯಾವುದು ಅಗ್ಗವಾಗಿತ್ತು?', hi: 'क्या सस्ता था?' },
                            options: [
                                { en: 'The rice', kn: 'ಅಕ್ಕಿ', hi: 'चावल' },
                                { en: 'The bananas', kn: 'ಬಾಳೆಹಣ್ಣು', hi: 'केले' },
                                { en: 'The cricket bat', kn: 'ಕ್ರಿಕೆಟ್ ಬ್ಯಾಟ್', hi: 'क्रिकेट बैट' },
                                { en: 'The sugar', kn: 'ಸಕ್ಕರೆ', hi: 'चीनी' }
                            ]
                        },
                        {
                            q: { en: 'Why did they not buy the cricket bat?', kn: 'ಅವರು ಕ್ರಿಕೆಟ್ ಬ್ಯಾಟ್ ಏಕೆ ಕೊಳ್ಳಲಿಲ್ಲ?', hi: 'उन्होंने क्रिकेट बैट क्यों नहीं ख़रीदा?' },
                            options: [
                                { en: 'It was too expensive.', kn: 'ಅದು ತುಂಬಾ ದುಬಾರಿಯಾಗಿತ್ತು.', hi: 'वह बहुत महँगा था।' },
                                { en: 'The shop was closed.', kn: 'ಅಂಗಡಿ ಮುಚ್ಚಿತ್ತು.', hi: 'दुकान बंद थी।' },
                                { en: 'Rahul did not like it.', kn: 'ರಾಹುಲ್ ಅದನ್ನು ಇಷ್ಟಪಡಲಿಲ್ಲ.', hi: 'राहुल को वह पसंद नहीं आया।' },
                                { en: 'It was broken.', kn: 'ಅದು ಮುರಿದಿತ್ತು.', hi: 'वह टूटा हुआ था।' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Buying apples', kn: 'ಸೇಬು ಕೊಳ್ಳುವುದು', hi: 'सेब ख़रीदना' },
                    scenario: {
                        en: 'Anil buys apples from Lakshmi at her fruit stall in Mysuru.',
                        kn: 'ಅನಿಲ್ ಮೈಸೂರಿನಲ್ಲಿ ಲಕ್ಷ್ಮಿಯವರ ಹಣ್ಣಿನ ಅಂಗಡಿಯಲ್ಲಿ ಸೇಬು ಕೊಳ್ಳುತ್ತಾನೆ.',
                        hi: 'अनिल मैसूर में लक्ष्मी की फलों की दुकान से सेब ख़रीदता है।'
                    },
                    speakers: [{ name: 'Anil', voice: 'm' }, { name: 'Lakshmi', voice: 'f' }],
                    lines: [
                        { speaker: 'Anil', en: 'How much is a kilo of apples?', kn: 'ಸೇಬು ಕಿಲೋಗೆ ಎಷ್ಟು?', hi: 'सेब कितने रुपये किलो हैं?' },
                        { speaker: 'Lakshmi', en: 'One hundred and fifty rupees a kilo.', kn: 'ಕಿಲೋಗೆ ನೂರ ಐವತ್ತು ರೂಪಾಯಿ.', hi: 'डेढ़ सौ रुपये किलो।' },
                        { speaker: 'Anil', en: 'That is too expensive. Can you give them for one hundred and twenty?', kn: 'ಅದು ತುಂಬಾ ದುಬಾರಿ. ನೂರ ಇಪ್ಪತ್ತಕ್ಕೆ ಕೊಡುತ್ತೀರಾ?', hi: 'यह तो बहुत महँगा है। एक सौ बीस में देंगी?' },
                        { speaker: 'Lakshmi', en: 'No, but I can give them for one hundred and forty.', kn: 'ಇಲ್ಲ, ಆದರೆ ನೂರ ನಲವತ್ತಕ್ಕೆ ಕೊಡುತ್ತೇನೆ.', hi: 'नहीं, पर एक सौ चालीस में दे सकती हूँ।' },
                        { speaker: 'Anil', en: 'Okay. Please give me two kilos.', kn: 'ಸರಿ. ಎರಡು ಕಿಲೋ ಕೊಡಿ.', hi: 'ठीक है। दो किलो दे दीजिए।' },
                        { speaker: 'Lakshmi', en: 'That makes two hundred and eighty rupees.', kn: 'ಒಟ್ಟು ಇನ್ನೂರ ಎಂಬತ್ತು ರೂಪಾಯಿ ಆಯಿತು.', hi: 'कुल दो सौ अस्सी रुपये हुए।' },
                        { speaker: 'Anil', en: 'Here are three hundred rupees.', kn: 'ಇಗೋ, ಮುನ್ನೂರು ರೂಪಾಯಿ.', hi: 'ये लीजिए, तीन सौ रुपये।' },
                        { speaker: 'Lakshmi', en: 'Thank you. Here is your twenty rupees change.', kn: 'ಧನ್ಯವಾದ. ಇಗೋ, ನಿಮ್ಮ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ ಚಿಲ್ಲರೆ.', hi: 'धन्यवाद। ये रहे आपके बीस रुपये।' }
                    ],
                    questions: [
                        {
                            q: { en: 'What does Anil buy?', kn: 'ಅನಿಲ್ ಏನು ಕೊಳ್ಳುತ್ತಾನೆ?', hi: 'अनिल क्या ख़रीदता है?' },
                            options: [
                                { en: 'Apples', kn: 'ಸೇಬು', hi: 'सेब' },
                                { en: 'Bananas', kn: 'ಬಾಳೆಹಣ್ಣು', hi: 'केले' },
                                { en: 'Mangoes', kn: 'ಮಾವಿನಹಣ್ಣು', hi: 'आम' },
                                { en: 'Grapes', kn: 'ದ್ರಾಕ್ಷಿ', hi: 'अंगूर' }
                            ]
                        },
                        {
                            q: { en: 'In the end, what is the price of one kilo?', kn: 'ಕೊನೆಗೆ ಒಂದು ಕಿಲೋದ ಬೆಲೆ ಎಷ್ಟು?', hi: 'आख़िर में एक किलो का दाम कितना तय होता है?' },
                            options: [
                                { en: 'One hundred and forty rupees', kn: 'ನೂರ ನಲವತ್ತು ರೂಪಾಯಿ', hi: 'एक सौ चालीस रुपये' },
                                { en: 'One hundred and fifty rupees', kn: 'ನೂರ ಐವತ್ತು ರೂಪಾಯಿ', hi: 'डेढ़ सौ रुपये' },
                                { en: 'One hundred and twenty rupees', kn: 'ನೂರ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ', hi: 'एक सौ बीस रुपये' },
                                { en: 'One hundred rupees', kn: 'ನೂರು ರೂಪಾಯಿ', hi: 'सौ रुपये' }
                            ]
                        },
                        {
                            q: { en: 'How much change does Anil get back?', kn: 'ಅನಿಲ್ ಎಷ್ಟು ಚಿಲ್ಲರೆ ವಾಪಸ್ ಪಡೆಯುತ್ತಾನೆ?', hi: 'अनिल को कितने पैसे वापस मिलते हैं?' },
                            options: [
                                { en: 'Twenty rupees', kn: 'ಇಪ್ಪತ್ತು ರೂಪಾಯಿ', hi: 'बीस रुपये' },
                                { en: 'Ten rupees', kn: 'ಹತ್ತು ರೂಪಾಯಿ', hi: 'दस रुपये' },
                                { en: 'Fifty rupees', kn: 'ಐವತ್ತು ರೂಪಾಯಿ', hi: 'पचास रुपये' },
                                { en: 'Forty rupees', kn: 'ನಲವತ್ತು ರೂಪಾಯಿ', hi: 'चालीस रुपये' }
                            ]
                        }
                    ]
                }
            ]
        },
        '3:1': {
            name: 'In the kitchen',
            lessons: [
                {
                    kind: 'words', title: 'Vegetables', list: [
                        { en: 'onion', kn: 'ಈರುಳ್ಳಿ', hi: 'प्याज़', pic: '🧅', def: 'a round vegetable with a strong smell and taste' },
                        { en: 'potato', kn: 'ಆಲೂಗಡ್ಡೆ', hi: 'आलू', pic: '🥔', def: 'a vegetable that grows under the ground' },
                        { en: 'tomato', kn: 'ಟೊಮೆಟೊ', hi: 'टमाटर', pic: '🍅', def: 'a soft red vegetable used in curries and salads' },
                        { en: 'brinjal', kn: 'ಬದನೆಕಾಯಿ', hi: 'बैंगन', pic: '🍆', def: 'a purple vegetable with a green top' },
                        { en: 'chilli', kn: 'ಮೆಣಸಿನಕಾಯಿ', hi: 'मिर्च', pic: '🌶️', def: 'a small green or red vegetable that tastes hot' },
                        { en: 'carrot', kn: 'ಕ್ಯಾರೆಟ್', hi: 'गाजर', pic: '🥕', def: 'a long orange vegetable' }
                    ]
                },
                {
                    kind: 'phrases', title: 'In the kitchen 1', list: [
                        { read: true, en: 'Cut the onions.', kn: 'ಈರುಳ್ಳಿ ಕತ್ತರಿಸಿ.', hi: 'प्याज़ काटिए।', acc: { kn: ['ಈರುಳ್ಳಿ ಕತ್ತರಿಸು.'], hi: ['प्याज़ काटो।'] } },
                        { en: 'I like potato curry.', kn: 'ನನಗೆ ಆಲೂಗಡ್ಡೆ ಪಲ್ಯ ಇಷ್ಟ.', hi: 'मुझे आलू की सब्ज़ी पसंद है।' },
                        { en: 'Brinjals and tomatoes are cheap today.', kn: 'ಇಂದು ಬದನೆಕಾಯಿ ಮತ್ತು ಟೊಮೆಟೊ ಅಗ್ಗವಾಗಿವೆ.', hi: 'आज बैंगन और टमाटर सस्ते हैं।' },
                        { read: true, en: 'This chilli is very hot.', kn: 'ಈ ಮೆಣಸಿನಕಾಯಿ ತುಂಬಾ ಖಾರ.', hi: 'यह मिर्च बहुत तीखी है।' },
                        { en: 'Carrots are good for the eyes.', kn: 'ಕ್ಯಾರೆಟ್ ಕಣ್ಣಿಗೆ ಒಳ್ಳೆಯದು.', hi: 'गाजर आँखों के लिए अच्छी होती है।' }
                    ]
                },
                {
                    kind: 'words', title: 'Cooking', list: [
                        { en: 'knife', kn: 'ಚಾಕು', hi: 'चाकू', pic: '🔪', def: 'a sharp tool for cutting' },
                        { en: 'plate', kn: 'ತಟ್ಟೆ', hi: 'थाली', pic: '🍽️', def: 'a flat dish you eat food from' },
                        { en: 'spoon', kn: 'ಚಮಚ', hi: 'चम्मच', pic: '🥄', def: 'a small tool for eating, stirring or serving' },
                        { en: 'stove', kn: 'ಒಲೆ', hi: 'चूल्हा', pic: '🔥', def: 'the thing in the kitchen that heats food for cooking' },
                        { en: 'cook', kn: 'ಅಡುಗೆ ಮಾಡು', hi: 'पकाना', pic: '🍲', def: 'to make food ready to eat by heating it' },
                        { en: 'boil', kn: 'ಕುದಿಸು', hi: 'उबालना', pic: '♨️', def: 'to heat water or milk until bubbles come' }
                    ]
                },
                {
                    kind: 'phrases', title: 'In the kitchen 2', list: [
                        { read: true, en: 'Use the knife carefully.', kn: 'ಚಾಕುವನ್ನು ಜಾಗ್ರತೆಯಿಂದ ಬಳಸಿ.', hi: 'चाकू सावधानी से चलाइए।' },
                        { read: true, en: 'Boil the milk first.', kn: 'ಮೊದಲು ಹಾಲು ಕುದಿಸಿ.', hi: 'पहले दूध उबालिए।', acc: { en: ['First boil the milk.'], kn: ['ಮೊದಲು ಹಾಲು ಕುದಿಸು.'], hi: ['पहले दूध उबालो।'] } },
                        { en: 'Put the plates on the table.', kn: 'ತಟ್ಟೆಗಳನ್ನು ಮೇಜಿನ ಮೇಲೆ ಇಡಿ.', hi: 'थालियाँ मेज़ पर रखिए।', acc: { hi: ['थालियाँ मेज़ पर रखो।'] } },
                        { en: 'My brother cooks every Sunday.', kn: 'ನನ್ನ ಅಣ್ಣ ಪ್ರತಿ ಭಾನುವಾರ ಅಡುಗೆ ಮಾಡುತ್ತಾನೆ.', hi: 'मेरा भाई हर रविवार को खाना बनाता है।' },
                        { read: true, en: 'Turn off the stove.', kn: 'ಒಲೆ ಆರಿಸಿ.', hi: 'चूल्हा बंद कीजिए।', acc: { en: ['Switch off the stove.'], hi: ['चूल्हा बंद करो।'] } }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'Deepak cooks lunch', kn: 'ದೀಪಕನ ಅಡುಗೆ', hi: 'दीपक ने खाना बनाया' },
                    text: {
                        en: 'Last Sunday, Deepak\'s mother was not well, so he cooked lunch for the family. First, he washed the potatoes and tomatoes. He cut the onions with a sharp knife, and his eyes watered. Then he boiled the potatoes on the stove. He made potato curry and rice. His mother tasted the curry with a spoon and smiled. She said, "You can cook next Sunday too!"',
                        kn: 'ಕಳೆದ ಭಾನುವಾರ ದೀಪಕನ ತಾಯಿಗೆ ಹುಷಾರಿರಲಿಲ್ಲ, ಹಾಗಾಗಿ ಅವನೇ ಮನೆಯವರಿಗೆ ಮಧ್ಯಾಹ್ನದ ಅಡುಗೆ ಮಾಡಿದನು. ಮೊದಲು ಅವನು ಆಲೂಗಡ್ಡೆ ಮತ್ತು ಟೊಮೆಟೊಗಳನ್ನು ತೊಳೆದನು. ಹರಿತವಾದ ಚಾಕುವಿನಿಂದ ಈರುಳ್ಳಿ ಕತ್ತರಿಸುವಾಗ ಅವನ ಕಣ್ಣಲ್ಲಿ ನೀರು ಬಂತು. ನಂತರ ಅವನು ಒಲೆಯ ಮೇಲೆ ಆಲೂಗಡ್ಡೆ ಬೇಯಿಸಿದನು. ಅವನು ಆಲೂಗಡ್ಡೆ ಪಲ್ಯ ಮತ್ತು ಅನ್ನ ಮಾಡಿದನು. ಅವನ ತಾಯಿ ಚಮಚದಿಂದ ಪಲ್ಯದ ರುಚಿ ನೋಡಿ ಮುಗುಳ್ನಕ್ಕರು. "ಮುಂದಿನ ಭಾನುವಾರವೂ ನೀನೇ ಅಡುಗೆ ಮಾಡು!" ಎಂದರು.',
                        hi: 'पिछले रविवार दीपक की माँ की तबीयत ठीक नहीं थी, इसलिए उसने परिवार के लिए दोपहर का खाना बनाया। पहले उसने आलू और टमाटर धोए। तेज़ चाकू से प्याज़ काटते समय उसकी आँखों में पानी आ गया। फिर उसने चूल्हे पर आलू उबाले। उसने आलू की सब्ज़ी और चावल बनाए। उसकी माँ ने चम्मच से सब्ज़ी चखी और मुस्कुराईं। उन्होंने कहा, "अगले रविवार भी तुम ही खाना बनाना!"'
                    },
                    questions: [
                        {
                            q: { en: 'Why did Deepak cook lunch?', kn: 'ದೀಪಕ್ ಏಕೆ ಅಡುಗೆ ಮಾಡಿದನು?', hi: 'दीपक ने खाना क्यों बनाया?' },
                            options: [
                                { en: 'His mother was not well.', kn: 'ಅವನ ತಾಯಿಗೆ ಹುಷಾರಿರಲಿಲ್ಲ.', hi: 'उसकी माँ की तबीयत ठीक नहीं थी।' },
                                { en: 'His mother was at work.', kn: 'ಅವನ ತಾಯಿ ಕೆಲಸಕ್ಕೆ ಹೋಗಿದ್ದರು.', hi: 'उसकी माँ काम पर गई थीं।' },
                                { en: 'It was his birthday.', kn: 'ಅದು ಅವನ ಹುಟ್ಟುಹಬ್ಬವಾಗಿತ್ತು.', hi: 'उस दिन उसका जन्मदिन था।' },
                                { en: 'His friends came home.', kn: 'ಅವನ ಸ್ನೇಹಿತರು ಮನೆಗೆ ಬಂದಿದ್ದರು.', hi: 'उसके दोस्त घर आए थे।' }
                            ]
                        },
                        {
                            q: { en: 'What did Deepak use to cut the onions?', kn: 'ಈರುಳ್ಳಿ ಕತ್ತರಿಸಲು ದೀಪಕ್ ಏನು ಬಳಸಿದನು?', hi: 'दीपक ने प्याज़ किससे काटे?' },
                            options: [
                                { en: 'A sharp knife', kn: 'ಹರಿತವಾದ ಚಾಕು', hi: 'तेज़ चाकू' },
                                { en: 'A pair of scissors', kn: 'ಕತ್ತರಿ', hi: 'कैंची' },
                                { en: 'A spoon', kn: 'ಚಮಚ', hi: 'चम्मच' },
                                { en: 'A machine', kn: 'ಯಂತ್ರ', hi: 'मशीन' }
                            ]
                        },
                        {
                            q: { en: 'What did Deepak make?', kn: 'ದೀಪಕ್ ಏನು ಮಾಡಿದನು?', hi: 'दीपक ने क्या बनाया?' },
                            options: [
                                { en: 'Potato curry and rice', kn: 'ಆಲೂಗಡ್ಡೆ ಪಲ್ಯ ಮತ್ತು ಅನ್ನ', hi: 'आलू की सब्ज़ी और चावल' },
                                { en: 'Brinjal curry and chapati', kn: 'ಬದನೆಕಾಯಿ ಪಲ್ಯ ಮತ್ತು ಚಪಾತಿ', hi: 'बैंगन की सब्ज़ी और रोटी' },
                                { en: 'Tomato soup', kn: 'ಟೊಮೆಟೊ ಸೂಪ್', hi: 'टमाटर का सूप' },
                                { en: 'Onion dosa', kn: 'ಈರುಳ್ಳಿ ದೋಸೆ', hi: 'प्याज़ का डोसा' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Making tea', kn: 'ಚಹಾ ಮಾಡುವುದು', hi: 'चाय बनाना' },
                    scenario: {
                        en: 'At home in Dharwad, Suresh asks his elder sister Pooja to teach him to make tea.',
                        kn: 'ಧಾರವಾಡದ ಮನೆಯಲ್ಲಿ ಸುರೇಶ್ ತನಗೆ ಚಹಾ ಮಾಡಲು ಕಲಿಸುವಂತೆ ಅಕ್ಕ ಪೂಜಾಳನ್ನು ಕೇಳುತ್ತಾನೆ.',
                        hi: 'धारवाड़ में अपने घर पर सुरेश अपनी दीदी पूजा से चाय बनाना सिखाने को कहता है।'
                    },
                    speakers: [{ name: 'Suresh', voice: 'm' }, { name: 'Pooja', voice: 'f' }],
                    lines: [
                        { speaker: 'Suresh', en: 'Akka, please teach me to make tea.', kn: 'ಅಕ್ಕ, ದಯವಿಟ್ಟು ನನಗೆ ಚಹಾ ಮಾಡಲು ಕಲಿಸು.', hi: 'दीदी, मुझे चाय बनाना सिखा दो।' },
                        { speaker: 'Pooja', en: 'Sure. First, boil one cup of water on the stove.', kn: 'ಸರಿ. ಮೊದಲು ಒಲೆಯ ಮೇಲೆ ಒಂದು ಲೋಟ ನೀರು ಕುದಿಸು.', hi: 'ज़रूर। पहले चूल्हे पर एक कप पानी उबालो।' },
                        { speaker: 'Suresh', en: 'The water is boiling now. What next?', kn: 'ಈಗ ನೀರು ಕುದಿಯುತ್ತಿದೆ. ಮುಂದೇನು?', hi: 'पानी अब उबल रहा है। आगे क्या करूँ?' },
                        { speaker: 'Pooja', en: 'Add tea powder, sugar and a little ginger.', kn: 'ಚಹಾ ಪುಡಿ, ಸಕ್ಕರೆ ಮತ್ತು ಸ್ವಲ್ಪ ಶುಂಠಿ ಹಾಕು.', hi: 'चायपत्ती, चीनी और थोड़ा अदरक डालो।' },
                        { speaker: 'Suresh', en: 'Should I cut the ginger with a knife?', kn: 'ಶುಂಠಿಯನ್ನು ಚಾಕುವಿನಿಂದ ಕತ್ತರಿಸಬೇಕಾ?', hi: 'क्या अदरक को चाकू से काटूँ?' },
                        { speaker: 'Pooja', en: 'Yes, cut it into small pieces. Then add milk.', kn: 'ಹೌದು, ಸಣ್ಣ ತುಂಡುಗಳಾಗಿ ಕತ್ತರಿಸು. ನಂತರ ಹಾಲು ಹಾಕು.', hi: 'हाँ, छोटे टुकड़ों में काटो। फिर दूध डालो।' },
                        { speaker: 'Suresh', en: 'It smells very good! Shall I turn off the stove?', kn: 'ತುಂಬಾ ಒಳ್ಳೆಯ ಪರಿಮಳ ಬರುತ್ತಿದೆ! ಒಲೆ ಆರಿಸಲಾ?', hi: 'बहुत अच्छी ख़ुशबू आ रही है! चूल्हा बंद कर दूँ?' },
                        { speaker: 'Pooja', en: 'Yes. Now pour the tea into two cups.', kn: 'ಹೌದು. ಈಗ ಚಹಾವನ್ನು ಎರಡು ಲೋಟಗಳಿಗೆ ಹಾಕು.', hi: 'हाँ। अब चाय दो कपों में डालो।' }
                    ],
                    questions: [
                        {
                            q: { en: 'What do Suresh and Pooja make?', kn: 'ಸುರೇಶ್ ಮತ್ತು ಪೂಜಾ ಏನು ಮಾಡುತ್ತಾರೆ?', hi: 'सुरेश और पूजा क्या बनाते हैं?' },
                            options: [
                                { en: 'Tea', kn: 'ಚಹಾ', hi: 'चाय' },
                                { en: 'Coffee', kn: 'ಕಾಫಿ', hi: 'कॉफ़ी' },
                                { en: 'Soup', kn: 'ಸೂಪ್', hi: 'सूप' },
                                { en: 'Lemon juice', kn: 'ನಿಂಬೆ ಪಾನಕ', hi: 'नींबू पानी' }
                            ]
                        },
                        {
                            q: { en: 'What does Suresh cut with the knife?', kn: 'ಸುರೇಶ್ ಚಾಕುವಿನಿಂದ ಏನನ್ನು ಕತ್ತರಿಸುತ್ತಾನೆ?', hi: 'सुरेश चाकू से क्या काटता है?' },
                            options: [
                                { en: 'Ginger', kn: 'ಶುಂಠಿ', hi: 'अदरक' },
                                { en: 'An onion', kn: 'ಈರುಳ್ಳಿ', hi: 'प्याज़' },
                                { en: 'A potato', kn: 'ಆಲೂಗಡ್ಡೆ', hi: 'आलू' },
                                { en: 'A tomato', kn: 'ಟೊಮೆಟೊ', hi: 'टमाटर' }
                            ]
                        },
                        {
                            q: { en: 'What do they add after cutting the ginger?', kn: 'ಶುಂಠಿ ಕತ್ತರಿಸಿದ ನಂತರ ಅವರು ಏನು ಹಾಕುತ್ತಾರೆ?', hi: 'अदरक काटने के बाद वे क्या डालते हैं?' },
                            options: [
                                { en: 'Milk', kn: 'ಹಾಲು', hi: 'दूध' },
                                { en: 'Salt', kn: 'ಉಪ್ಪು', hi: 'नमक' },
                                { en: 'Lemon', kn: 'ನಿಂಬೆಹಣ್ಣು', hi: 'नींबू' },
                                { en: 'Honey', kn: 'ಜೇನುತುಪ್ಪ', hi: 'शहद' }
                            ]
                        }
                    ]
                }
            ]
        }
    },
    glosses: {
        kn: {
            // 1:1 At home
            'ನಮ್ಮ ಅಡುಗೆಮನೆ ಚಿಕ್ಕದು.': 'our/ours|kitchen|is small/small/little',
            'ದಯವಿಟ್ಟು ಕಿಟಕಿ ತೆರೆಯಿರಿ.': 'please/kindly|window/the window|open',
            'ಮಲಗುವ ಕೋಣೆಯ ಬಾಗಿಲು ಮುಚ್ಚಿ.': 'sleeping/bed|of the room/room|door|close/shut',
            'ಸ್ನಾನದ ಕೋಣೆ ಎಲ್ಲಿದೆ?': 'bath/bathing|room|where is',
            'ಗೋಡೆಯ ಮೇಲೆ ಗಡಿಯಾರ ಇದೆ.': 'wall/the wall|on/above|clock/watch|there is/is',
            'ಫ್ಯಾನ್ ಹಾಕಿ.': 'fan/the fan|switch on/turn on/put on',
            'ಬೀಗದ ಕೈ ಮಂಚದ ಕೆಳಗೆ ಇದೆ.': 'of the lock/lock|key/hand|the bed/bed|under/below|is',
            'ದಯವಿಟ್ಟು ಈ ಕುರ್ಚಿಯಲ್ಲಿ ಕುಳಿತುಕೊಳ್ಳಿ.': 'please/kindly|this|on the chair/in the chair/chair|sit/sit down',
            'ನಾನು ಪೊರಕೆಯಿಂದ ನೆಲ ಗುಡಿಸುತ್ತೇನೆ.': 'I|with a broom/with the broom|floor/the floor|sweep',
            'ನನ್ನ ತಂದೆ ರಾತ್ರಿ ಟಿವಿ ನೋಡುತ್ತಾರೆ.': 'my/mine|father/dad|at night/night|television/TV|watches/watch/see',
            // 2:1 Shopping
            'ಈ ಅಂಗಡಿ ನಮ್ಮ ಕಾಲೇಜಿನ ಹತ್ತಿರ ಇದೆ.': 'this|shop/store|our/ours|of the college/college|near/close to|is',
            'ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ತರಕಾರಿ ಅಗ್ಗವಾಗಿದೆ.': 'in the market/market|vegetables/vegetable|are cheap/is cheap/cheap',
            'ಈ ಪೆನ್ನಿನ ಬೆಲೆ ಎಷ್ಟು?': 'this|of the pen/pen|price|what/how much',
            'ಈ ಫೋನ್ ತುಂಬಾ ದುಬಾರಿ.': 'this|phone|too/very|expensive/costly',
            'ನಾನು ಒಂದು ಹೊಸ ಚೀಲ ಕೊಳ್ಳಬೇಕು.': 'I|a/one|new|bag|want to buy/must buy/need to buy',
            'ಒಂದು ಕಿಲೋ ಸಕ್ಕರೆ ಕೊಡಿ.': 'one/a|kilo|sugar|give me/give/please give',
            'ಒಂದು ಡಜನ್ ಬಾಳೆಹಣ್ಣಿಗೆ ಅರವತ್ತು ರೂಪಾಯಿ.': 'one/a|dozen|for bananas/bananas|sixty|rupees/cost',
            'ನಿಮ್ಮ ಹತ್ತಿರ ಚಿಲ್ಲರೆ ಇದೆಯಾ?': 'you/your|with/near|change/coins|do you have/is there',
            'ದಯವಿಟ್ಟು ಬಿಲ್ ಕೊಡಿ.': 'please/kindly|the bill/bill|give me/give',
            'ನಾನು ಹತ್ತು ರೂಪಾಯಿಯ ನಾಣ್ಯ ಕೊಟ್ಟೆ.': 'I|ten|rupee/of rupees|coin|paid/gave',
            // 3:1 In the kitchen
            'ಈರುಳ್ಳಿ ಕತ್ತರಿಸಿ.': 'onions/onion|cut/chop',
            'ನನಗೆ ಆಲೂಗಡ್ಡೆ ಪಲ್ಯ ಇಷ್ಟ.': 'to me/I|potato|curry/dry curry|like/liked',
            'ಇಂದು ಬದನೆಕಾಯಿ ಮತ್ತು ಟೊಮೆಟೊ ಅಗ್ಗವಾಗಿವೆ.': 'today|brinjals/brinjal|and|tomatoes/tomato|are cheap/cheap',
            'ಈ ಮೆಣಸಿನಕಾಯಿ ತುಂಬಾ ಖಾರ.': 'this|chilli|very/too|hot/spicy',
            'ಕ್ಯಾರೆಟ್ ಕಣ್ಣಿಗೆ ಒಳ್ಳೆಯದು.': 'carrots/carrot|for the eyes/for the eye|good/is good',
            'ಚಾಕುವನ್ನು ಜಾಗ್ರತೆಯಿಂದ ಬಳಸಿ.': 'the knife/knife|carefully/with care|use',
            'ಮೊದಲು ಹಾಲು ಕುದಿಸಿ.': 'first/at first|the milk/milk|boil',
            'ತಟ್ಟೆಗಳನ್ನು ಮೇಜಿನ ಮೇಲೆ ಇಡಿ.': 'the plates/plates|of the table/table|on|put/keep',
            'ನನ್ನ ಅಣ್ಣ ಪ್ರತಿ ಭಾನುವಾರ ಅಡುಗೆ ಮಾಡುತ್ತಾನೆ.': 'my/mine|brother/elder brother|every/each|Sunday|cooking/cook|makes/cooks',
            'ಒಲೆ ಆರಿಸಿ.': 'the stove/stove|turn off/put out'
        },
        hi: {
            // 1:1 At home
            'हमारी रसोई छोटी है।': 'our/ours|kitchen|small/little|is',
            'कृपया खिड़की खोलिए।': 'please/kindly|window/the window|open',
            'सोने के कमरे का दरवाज़ा बंद कीजिए।': 'sleeping/bed|(of)|room|of/\'s|door|close/closed/shut|(please) do',
            'बाथरूम कहाँ है?': 'bathroom|where|is',
            'दीवार पर घड़ी है।': 'wall/the wall|on|clock/watch|there is/is',
            'पंखा चलाइए।': 'fan/the fan|switch on/turn on/run',
            'चाबी पलंग के नीचे है।': 'key/the key|the bed/bed|(of)|under/below|is',
            'कृपया इस कुर्सी पर बैठिए।': 'please/kindly|this|chair|on|sit/sit down',
            'मैं झाड़ू से फ़र्श साफ़ करता हूँ।': 'I|broom/a broom|with/by|floor/the floor|clean/sweep|do/make|am',
            'मेरे पिताजी रात को टीवी देखते हैं।': 'my/mine|father/dad|night|at/in|television/TV|watch/see|are/is',
            // 2:1 Shopping
            'यह दुकान हमारे कॉलेज के पास है।': 'this|shop/store|our/ours|college|(of)|near/close to|is',
            'बाज़ार में सब्ज़ियाँ सस्ती हैं।': 'market/the market|in|vegetables|cheap|are',
            'इस कलम का दाम कितना है?': 'this|pen|of/\'s|price|what/how much|is',
            'यह फ़ोन बहुत महँगा है।': 'this|phone|too/very|expensive/costly|is',
            'मुझे एक नया बैग ख़रीदना है।': 'I/to me|a/one|new|bag|to buy/buy|want/is',
            'एक किलो चीनी दीजिए।': 'one/a|kilo|sugar|give me/give/please give',
            'एक दर्जन केले साठ रुपये के हैं।': 'one/a|dozen|bananas|sixty|rupees/rupee|of/worth|cost/are',
            'क्या आपके पास छुट्टे पैसे हैं?': 'do (question)/what|you/your|with/near|loose/small|change/money|have/are',
            'कृपया मुझे बिल दीजिए।': 'please/kindly|me/to me|the bill/bill|give',
            'मैंने दस रुपये का सिक्का दिया।': 'I|ten|rupee/rupees|of|coin|paid/gave',
            // 3:1 In the kitchen
            'प्याज़ काटिए।': 'onions/onion|cut/chop',
            'मुझे आलू की सब्ज़ी पसंद है।': 'to me/I|potato|of|curry/vegetable dish|like/liked|is',
            'आज बैंगन और टमाटर सस्ते हैं।': 'today|brinjals/brinjal|and|tomatoes/tomato|cheap|are',
            'यह मिर्च बहुत तीखी है।': 'this|chilli|very/too|hot/spicy|is',
            'गाजर आँखों के लिए अच्छी होती है।': 'carrots/carrot|the eyes/eyes|(of)|for|good|are/happen|is/are',
            'चाकू सावधानी से चलाइए।': 'the knife/knife|carefully/care|with/by|use/handle',
            'पहले दूध उबालिए।': 'first/at first|the milk/milk|boil',
            'थालियाँ मेज़ पर रखिए।': 'the plates/plates|the table/table|on|put/keep',
            'मेरा भाई हर रविवार को खाना बनाता है।': 'my/mine|brother|every/each|Sunday|on|food/meal|cooks/makes|is',
            'चूल्हा बंद कीजिए।': 'the stove/stove|off/closed/shut|turn/(please) do'
        }
    }
};
