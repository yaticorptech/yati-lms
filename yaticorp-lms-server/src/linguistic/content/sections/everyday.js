/**
 * Section 6 "Everyday talk" (about CEFR C1), units 1–6: Meeting new people, On the phone, At the bank,
 * Eating out, Hotels and stays, Tickets and journeys. Real-life everyday conversations, so that a learner
 * can speak in these situations. Written in English, Kannada and Hindi (no translation service) — a native
 * speaker should check them.
 */
module.exports = {
    level: 'everyday',
    units: {
        '1:1': {
            name: 'Meeting new people',
            lessons: [
                {
                    kind: 'words', title: 'Introductions', list: [
                        { en: 'introduce', kn: 'ಪರಿಚಯಿಸು', hi: 'परिचय कराना', pic: '🙋', def: 'to tell people each other\'s names when they first meet' },
                        { en: 'acquaintance', kn: 'ಪರಿಚಿತರು', hi: 'जान-पहचान वाला', pic: '🙂', def: 'a person you know a little but who is not a close friend' },
                        { en: 'greet', kn: 'ಸ್ವಾಗತಿಸು', hi: 'अभिवादन करना', pic: '👋', def: 'to say hello to someone in a friendly way when you meet' },
                        { en: 'handshake', kn: 'ಹಸ್ತಲಾಘವ', hi: 'हाथ मिलाना', pic: '🤝', def: 'holding and shaking another person\'s hand when you meet' },
                        { en: 'nickname', kn: 'ಅಡ್ಡಹೆಸರು', hi: 'घर का नाम', pic: '🏷️', def: 'an informal name that your friends and family call you' },
                        { en: 'hometown', kn: 'ಹುಟ್ಟೂರು', hi: 'गृहनगर', pic: '🏡', def: 'the town or city where you were born or grew up' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Meeting new people 1', list: [
                        { read: true, en: 'Let me introduce you to my cousin Rohan, who has just moved here.', kn: 'ಈಗಷ್ಟೇ ಇಲ್ಲಿಗೆ ಬಂದಿರುವ ನನ್ನ ಸಂಬಂಧಿ ರೋಹನನ್ನು ನಿಮಗೆ ಪರಿಚಯಿಸುತ್ತೇನೆ.', hi: 'मैं आपको अपने चचेरे भाई रोहन से मिलवाता हूँ, जो अभी-अभी यहाँ आया है।' },
                        { read: true, en: "She's not really a friend, just an acquaintance from my old office.", kn: 'ಅವಳು ನಿಜವಾಗಿ ಸ್ನೇಹಿತೆ ಅಲ್ಲ, ನನ್ನ ಹಳೆಯ ಆಫೀಸಿನ ಪರಿಚಿತೆ ಅಷ್ಟೇ.', hi: 'वह असल में दोस्त नहीं है, बस मेरे पुराने दफ़्तर की जान-पहचान वाली है।', acc: { en: ['She is not really a friend, just an acquaintance from my old office.'] } },
                        { en: 'Our new neighbours came over with sweets to say hello.', kn: 'ನಮ್ಮ ಹೊಸ ನೆರೆಹೊರೆಯವರು ಪರಿಚಯ ಮಾಡಿಕೊಳ್ಳಲು ಸಿಹಿ ತಿಂಡಿ ತಂದರು.', hi: 'हमारे नए पड़ोसी जान-पहचान के लिए मिठाई लेकर आए।' },
                        { read: true, en: 'He greeted everyone with a firm handshake and a warm smile.', kn: 'ಅವನು ಗಟ್ಟಿಯಾದ ಹಸ್ತಲಾಘವ ಮತ್ತು ಆತ್ಮೀಯ ನಗುವಿನೊಂದಿಗೆ ಎಲ್ಲರನ್ನೂ ಸ್ವಾಗತಿಸಿದ.', hi: 'उसने कसकर हाथ मिलाया और प्यारी मुस्कान के साथ सबका स्वागत किया।' },
                        { en: 'Chinnu is just a nickname my friends gave me in my hometown.', kn: 'ಚಿನ್ನು ಅನ್ನೋದು ನನ್ನ ಹುಟ್ಟೂರಿನ ಸ್ನೇಹಿತರು ಇಟ್ಟ ಅಡ್ಡಹೆಸರು ಅಷ್ಟೇ.', hi: 'चिन्नू तो बस एक घर का नाम है, जो मेरे गृहनगर के दोस्तों ने रखा था।' }
                    ]
                },
                {
                    kind: 'words', title: 'Small talk', list: [
                        { en: 'small talk', kn: 'ಲೋಕಾಭಿರಾಮದ ಮಾತು', hi: 'हल्की-फुल्की बातचीत', pic: '💬', def: 'light, friendly talk about simple things like the weather' },
                        { en: 'compliment', kn: 'ಹೊಗಳಿಕೆ', hi: 'तारीफ़', pic: '👏', def: 'something nice you say to praise a person' },
                        { en: 'nervous', kn: 'ಆತಂಕಗೊಂಡ', hi: 'घबराया हुआ', pic: '😬', def: 'a little worried or afraid about something' },
                        { en: 'conversation', kn: 'ಸಂಭಾಷಣೆ', hi: 'बातचीत', pic: '🗣️', def: 'a talk between two or more people' },
                        { en: 'mutual friend', kn: 'ಇಬ್ಬರಿಗೂ ಗೊತ್ತಿರುವ ಸ್ನೇಹಿತ', hi: 'साझा दोस्त', pic: '👥', def: 'a friend whom two people both know' },
                        { en: 'catch up', kn: 'ಭೇಟಿಯಾಗಿ ಸುದ್ದಿ ಹಂಚಿಕೊಳ್ಳು', hi: 'मिलकर हालचाल करना', pic: '☕', def: 'to talk with someone about what has happened since you last met' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Meeting new people 2', list: [
                        { read: true, en: 'Small talk about the weather is an easy way to break the ice.', kn: 'ಹವಾಮಾನದ ಬಗ್ಗೆ ಲೋಕಾಭಿರಾಮದ ಮಾತು ಸಂಕೋಚ ಮುರಿಯಲು ಸುಲಭ ದಾರಿ.', hi: 'मौसम पर हल्की-फुल्की बातचीत झिझक तोड़ने का आसान तरीक़ा है।' },
                        { en: 'Thank you for the compliment; my mother actually chose this saree for me.', kn: 'ಹೊಗಳಿಕೆಗೆ ಧನ್ಯವಾದ, ಈ ಸೀರೆಯನ್ನು ನಿಜವಾಗಿ ನನ್ನ ಅಮ್ಮ ಆರಿಸಿದ್ದು.', hi: 'तारीफ़ के लिए शुक्रिया, यह साड़ी असल में मेरी माँ ने चुनी थी।' },
                        { read: true, en: 'I was nervous about talking to strangers, but they were very friendly.', kn: 'ಅಪರಿಚಿತರ ಜೊತೆ ಮಾತಾಡಲು ನನಗೆ ಅಳುಕಿತ್ತು, ಆದರೆ ಅವರು ತುಂಬಾ ಸ್ನೇಹಪರರಾಗಿದ್ದರು.', hi: 'मुझे अजनबियों से बात करने में घबराहट थी, पर वे बहुत मिलनसार निकले।' },
                        { read: true, en: 'To keep the conversation going, ask questions and really listen to the answers.', kn: 'ಸಂಭಾಷಣೆ ಮುಂದುವರಿಸಲು ಪ್ರಶ್ನೆ ಕೇಳಿ, ಉತ್ತರಗಳನ್ನು ಗಮನವಿಟ್ಟು ಕೇಳಿ.', hi: 'बातचीत जारी रखने के लिए सवाल पूछिए और जवाब ध्यान से सुनिए।' },
                        { en: 'It turns out we have a mutual friend, so we must catch up soon.', kn: 'ನಮ್ಮಿಬ್ಬರಿಗೂ ಗೊತ್ತಿರುವ ಸ್ನೇಹಿತ ಒಬ್ಬ ಇದ್ದಾನೆ ಅಂತ ಗೊತ್ತಾಯಿತು, ಬೇಗ ಸಿಕ್ಕಿ ಮಾತಾಡೋಣ.', hi: 'पता चला कि हमारा एक साझा दोस्त है, तो जल्दी मिलकर हालचाल करते हैं।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A new face in Mysuru', kn: 'ಮೈಸೂರಿನಲ್ಲಿ ಹೊಸ ಮುಖ', hi: 'मैसूरु में एक नया चेहरा' },
                    text: {
                        en: 'Meera moved from Pune to Mysuru for a new job in July. On her first Sunday, her neighbour Lakshmi invited her for coffee. Lakshmi introduced her to a few people from the building. At first, Meera only made small talk about the rain and the traffic. Then a man named Prakash said that he had also studied in Pune. It turned out that they had a mutual friend from college. They talked for an hour and promised to catch up again soon. That evening, Mysuru already felt a little more like home to Meera.',
                        kn: 'ಮೀರಾ ಹೊಸ ಕೆಲಸಕ್ಕಾಗಿ ಜುಲೈನಲ್ಲಿ ಪುಣೆಯಿಂದ ಮೈಸೂರಿಗೆ ಬಂದಳು. ಮೊದಲ ಭಾನುವಾರವೇ ಅವಳ ನೆರೆಹೊರೆಯವರಾದ ಲಕ್ಷ್ಮಿ ಅವಳನ್ನು ಕಾಫಿಗೆ ಕರೆದರು. ಲಕ್ಷ್ಮಿ ಅವಳನ್ನು ಕಟ್ಟಡದ ಕೆಲವು ಜನರಿಗೆ ಪರಿಚಯಿಸಿದರು. ಮೊದಮೊದಲು ಮೀರಾ ಮಳೆ ಮತ್ತು ಟ್ರಾಫಿಕ್ ಬಗ್ಗೆ ಲೋಕಾಭಿರಾಮವಾಗಿ ಮಾತಾಡಿದಳು ಅಷ್ಟೇ. ಆಮೇಲೆ ಪ್ರಕಾಶ್ ಎಂಬುವವರು ತಾವೂ ಪುಣೆಯಲ್ಲೇ ಓದಿದ್ದಾಗಿ ಹೇಳಿದರು. ಇಬ್ಬರಿಗೂ ಗೊತ್ತಿರುವ ಒಬ್ಬ ಕಾಲೇಜು ಸ್ನೇಹಿತ ಇದ್ದಾನೆ ಎಂದು ತಿಳಿಯಿತು. ಅವರು ಒಂದು ಗಂಟೆ ಮಾತಾಡಿ, ಬೇಗ ಮತ್ತೆ ಭೇಟಿಯಾಗುವುದಾಗಿ ಮಾತು ಕೊಟ್ಟರು. ಆ ಸಂಜೆ ಮೀರಾಳಿಗೆ ಮೈಸೂರು ಆಗಲೇ ಸ್ವಲ್ಪ ತನ್ನ ಊರಿನಂತೆ ಅನಿಸಿತು.',
                        hi: 'मीरा जुलाई में नई नौकरी के लिए पुणे से मैसूरु आई। पहले ही रविवार को उसकी पड़ोसन लक्ष्मी ने उसे कॉफ़ी पर बुलाया। लक्ष्मी ने उसे बिल्डिंग के कुछ लोगों से मिलवाया। शुरू में मीरा ने बस बारिश और ट्रैफ़िक के बारे में हल्की-फुल्की बातें कीं। फिर प्रकाश नाम के एक आदमी ने बताया कि उसने भी पुणे में पढ़ाई की थी। पता चला कि कॉलेज का एक दोस्त दोनों को जानता है। दोनों ने एक घंटे तक बातें कीं और जल्दी फिर मिलने का वादा किया। उस शाम मीरा को मैसूरु थोड़ा-थोड़ा अपना घर लगने लगा।'
                    },
                    questions: [
                        {
                            q: { en: 'Where did Meera move from?', kn: 'ಮೀರಾ ಎಲ್ಲಿಂದ ಬಂದಳು?', hi: 'मीरा कहाँ से आई थी?' },
                            options: [
                                { en: 'Pune', kn: 'ಪುಣೆ', hi: 'पुणे' },
                                { en: 'Mangaluru', kn: 'ಮಂಗಳೂರು', hi: 'मंगलुरु' },
                                { en: 'Hubballi', kn: 'ಹುಬ್ಬಳ್ಳಿ', hi: 'हुब्बल्ली' },
                                { en: 'Delhi', kn: 'ದೆಹಲಿ', hi: 'दिल्ली' }
                            ]
                        },
                        {
                            q: { en: 'Who invited Meera for coffee?', kn: 'ಮೀರಾಳನ್ನು ಕಾಫಿಗೆ ಯಾರು ಕರೆದರು?', hi: 'मीरा को कॉफ़ी पर किसने बुलाया?' },
                            options: [
                                { en: 'Her neighbour Lakshmi', kn: 'ಅವಳ ನೆರೆಹೊರೆಯವರಾದ ಲಕ್ಷ್ಮಿ', hi: 'उसकी पड़ोसन लक्ष्मी' },
                                { en: 'Her new manager', kn: 'ಅವಳ ಹೊಸ ಮ್ಯಾನೇಜರ್', hi: 'उसके नए मैनेजर' },
                                { en: 'A man named Prakash', kn: 'ಪ್ರಕಾಶ್ ಎಂಬುವವರು', hi: 'प्रकाश नाम का आदमी' },
                                { en: 'Her college friend', kn: 'ಅವಳ ಕಾಲೇಜು ಸ್ನೇಹಿತೆ', hi: 'उसकी कॉलेज की सहेली' }
                            ]
                        },
                        {
                            q: { en: 'What did Meera and Prakash find out?', kn: 'ಮೀರಾ ಮತ್ತು ಪ್ರಕಾಶರಿಗೆ ಏನು ತಿಳಿಯಿತು?', hi: 'मीरा और प्रकाश को क्या पता चला?' },
                            options: [
                                { en: 'They had a mutual friend', kn: 'ಇಬ್ಬರಿಗೂ ಗೊತ್ತಿರುವ ಒಬ್ಬ ಸ್ನೇಹಿತ ಇದ್ದಾನೆ', hi: 'दोनों का एक साझा दोस्त है' },
                                { en: 'They worked in the same office', kn: 'ಇಬ್ಬರೂ ಒಂದೇ ಆಫೀಸಿನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತಾರೆ', hi: 'दोनों एक ही दफ़्तर में काम करते हैं' },
                                { en: 'They had the same hometown', kn: 'ಇಬ್ಬರದೂ ಒಂದೇ ಹುಟ್ಟೂರು', hi: 'दोनों का गृहनगर एक ही है' },
                                { en: 'They were relatives', kn: 'ಅವರು ನೆಂಟರು', hi: 'वे रिश्तेदार हैं' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Meeting at a wedding', kn: 'ಮದುವೆಯಲ್ಲಿ ಪರಿಚಯ', hi: 'शादी में मुलाक़ात' },
                    scenario: {
                        en: "At a friend's wedding reception in Hubballi, Arun starts talking to Divya, a guest he has never met.",
                        kn: 'ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ ಸ್ನೇಹಿತನ ಮದುವೆಯ ಆರತಕ್ಷತೆಯಲ್ಲಿ ಅರುಣ್, ಹಿಂದೆಂದೂ ಭೇಟಿಯಾಗದ ದಿವ್ಯಾ ಎಂಬ ಅತಿಥಿಯೊಂದಿಗೆ ಮಾತು ಶುರು ಮಾಡುತ್ತಾನೆ.',
                        hi: 'हुब्बल्ली में एक दोस्त की शादी के रिसेप्शन में अरुण दिव्या नाम की एक मेहमान से बात शुरू करता है, जिनसे वह पहले कभी नहीं मिला।'
                    },
                    speakers: [{ name: 'Arun', voice: 'm' }, { name: 'Divya', voice: 'f' }],
                    lines: [
                        { speaker: 'Arun', en: "Hi, I don't think we've met. I'm Arun, a friend of the groom.", kn: 'ನಮಸ್ಕಾರ, ನಾವು ಹಿಂದೆ ಭೇಟಿಯಾಗಿಲ್ಲ ಅನ್ಸುತ್ತೆ. ನಾನು ಅರುಣ್, ಮದುಮಗನ ಸ್ನೇಹಿತ.', hi: 'नमस्ते, शायद हम पहले नहीं मिले। मैं अरुण हूँ, दूल्हे का दोस्त।' },
                        { speaker: 'Divya', en: "Nice to meet you, Arun. I'm Divya. I work with the bride.", kn: 'ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿ ಸಂತೋಷ, ಅರುಣ್. ನಾನು ದಿವ್ಯಾ. ನಾನು ಮದುಮಗಳ ಜೊತೆ ಕೆಲಸ ಮಾಡುತ್ತೇನೆ.', hi: 'आपसे मिलकर अच्छा लगा, अरुण। मैं दिव्या हूँ। मैं दुल्हन के साथ काम करती हूँ।' },
                        { speaker: 'Arun', en: 'Oh, so you work here in Hubballi? How do you like it?', kn: 'ಓಹ್, ಹಾಗಾದರೆ ನೀವು ಇಲ್ಲೇ ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತೀರಾ? ಇಲ್ಲಿ ಹೇಗನ್ನಿಸುತ್ತೆ?', hi: 'अच्छा, तो आप यहीं हुब्बल्ली में काम करती हैं? यहाँ कैसा लगता है?' },
                        { speaker: 'Divya', en: "I love it. My hometown is Dharwad, so I'm close to my family. And you?", kn: 'ತುಂಬಾ ಇಷ್ಟ. ನನ್ನ ಹುಟ್ಟೂರು ಧಾರವಾಡ, ಹಾಗಾಗಿ ಮನೆಯವರು ಹತ್ತಿರದಲ್ಲೇ ಇದ್ದಾರೆ. ನೀವು?', hi: 'बहुत अच्छा लगता है। मेरा गृहनगर धारवाड़ है, तो परिवार पास ही है। और आप?' },
                        { speaker: 'Arun', en: "I grew up in Mangaluru, but these days I'm working in Bengaluru.", kn: 'ನಾನು ಬೆಳೆದದ್ದು ಮಂಗಳೂರಿನಲ್ಲಿ, ಆದರೆ ಈಗ ಬೆಂಗಳೂರಿನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದೇನೆ.', hi: 'मैं मंगलुरु में पला-बढ़ा, पर आजकल बेंगलुरु में काम कर रहा हूँ।' },
                        { speaker: 'Divya', en: 'Mangaluru! Then you must really miss the fish curry.', kn: 'ಮಂಗಳೂರು! ಹಾಗಾದರೆ ನಿಮಗೆ ಮೀನು ಸಾರು ತುಂಬಾ ನೆನಪಾಗುತ್ತಿರಬೇಕು.', hi: 'मंगलुरु! तब तो आपको वहाँ की फ़िश करी की बहुत याद आती होगी।' },
                        { speaker: 'Arun', en: "Every single day! By the way, that's a lovely saree. The colour really suits you.", kn: 'ಪ್ರತಿದಿನ! ಅಂದ ಹಾಗೆ, ನಿಮ್ಮ ಸೀರೆ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ. ಆ ಬಣ್ಣ ನಿಮಗೆ ಚೆನ್ನಾಗಿ ಒಪ್ಪುತ್ತೆ.', hi: 'हर रोज़! वैसे, आपकी साड़ी बहुत सुंदर है। यह रंग आप पर बहुत जँचता है।' },
                        { speaker: 'Divya', en: "Thank you, that's kind of you. So how do you know the groom?", kn: 'ಧನ್ಯವಾದ, ನಿಮ್ಮ ಒಳ್ಳೆಯತನ. ಸರಿ, ಮದುಮಗ ನಿಮಗೆ ಹೇಗೆ ಪರಿಚಯ?', hi: 'शुक्रिया, आपकी मेहरबानी। तो आप दूल्हे को कैसे जानते हैं?' },
                        { speaker: 'Arun', en: 'We were roommates in college, and we still catch up every month.', kn: 'ನಾವು ಕಾಲೇಜಿನಲ್ಲಿ ಒಂದೇ ರೂಮಿನಲ್ಲಿ ಇದ್ದೆವು, ಈಗಲೂ ಪ್ರತಿ ತಿಂಗಳು ಭೇಟಿಯಾಗಿ ಹರಟುತ್ತೇವೆ.', hi: 'हम कॉलेज में रूममेट थे, और आज भी हर महीने मिलकर हालचाल करते हैं।' },
                        { speaker: 'Divya', en: "That's lovely. Oh, they're calling us for photos. Let's talk more over dinner.", kn: 'ಎಷ್ಟು ಚೆನ್ನಾಗಿದೆ. ಓಹ್, ಫೋಟೋಗೆ ಕರೆಯುತ್ತಿದ್ದಾರೆ. ಊಟದ ಸಮಯದಲ್ಲಿ ಇನ್ನಷ್ಟು ಮಾತಾಡೋಣ.', hi: 'कितनी अच्छी बात है। अरे, फ़ोटो के लिए बुला रहे हैं। खाने पर और बातें करते हैं।' }
                    ],
                    questions: [
                        {
                            q: { en: "Where is Divya's hometown?", kn: 'ದಿವ್ಯಾಳ ಹುಟ್ಟೂರು ಯಾವುದು?', hi: 'दिव्या का गृहनगर कौन-सा है?' },
                            options: [
                                { en: 'Dharwad', kn: 'ಧಾರವಾಡ', hi: 'धारवाड़' },
                                { en: 'Mangaluru', kn: 'ಮಂಗಳೂರು', hi: 'मंगलुरु' },
                                { en: 'Bengaluru', kn: 'ಬೆಂಗಳೂರು', hi: 'बेंगलुरु' },
                                { en: 'Hubballi', kn: 'ಹುಬ್ಬಳ್ಳಿ', hi: 'हुब्बल्ली' }
                            ]
                        },
                        {
                            q: { en: 'How does Arun know the groom?', kn: 'ಅರುಣನಿಗೆ ಮದುಮಗ ಹೇಗೆ ಪರಿಚಯ?', hi: 'अरुण दूल्हे को कैसे जानता है?' },
                            options: [
                                { en: 'They were roommates in college', kn: 'ಕಾಲೇಜಿನಲ್ಲಿ ಒಂದೇ ರೂಮಿನಲ್ಲಿದ್ದರು', hi: 'वे कॉलेज में रूममेट थे' },
                                { en: 'They work in the same office', kn: 'ಒಂದೇ ಆಫೀಸಿನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತಾರೆ', hi: 'वे एक ही दफ़्तर में काम करते हैं' },
                                { en: 'They are neighbours', kn: 'ಅವರು ನೆರೆಹೊರೆಯವರು', hi: 'वे पड़ोसी हैं' },
                                { en: 'They are relatives', kn: 'ಅವರು ನೆಂಟರು', hi: 'वे रिश्तेदार हैं' }
                            ]
                        },
                        {
                            q: { en: 'What compliment does Arun give Divya?', kn: 'ಅರುಣ್ ದಿವ್ಯಾಳನ್ನು ಯಾವ ವಿಷಯಕ್ಕೆ ಹೊಗಳುತ್ತಾನೆ?', hi: 'अरुण दिव्या की किस बात की तारीफ़ करता है?' },
                            options: [
                                { en: 'Her saree and its colour', kn: 'ಅವಳ ಸೀರೆ ಮತ್ತು ಅದರ ಬಣ್ಣ', hi: 'उसकी साड़ी और उसका रंग' },
                                { en: 'Her English', kn: 'ಅವಳ ಇಂಗ್ಲಿಷ್', hi: 'उसकी अंग्रेज़ी' },
                                { en: 'Her cooking', kn: 'ಅವಳ ಅಡುಗೆ', hi: 'उसका खाना बनाना' },
                                { en: 'Her singing', kn: 'ಅವಳ ಹಾಡು', hi: 'उसका गाना' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: "You are at a friend's party and meet someone new. Introduce yourself, say where you are from, make some small talk, give a polite compliment and suggest keeping in touch.",
                        sample: "Hi, I don't think we've met. I'm Priya, a friend of Ananya from college. I'm from Mysuru, but I'm studying in Bengaluru now. What about you? Oh, you're from Pune! I visited Pune last year and loved the food there. So how do you know Ananya? That's nice. By the way, I love your kurta; the colour really suits you. It was lovely talking to you. Shall we exchange numbers and catch up sometime next week?",
                        checklist: ['I greeted the person and said my name', 'I said where I am from', 'I asked a question to keep the conversation going', 'I gave a polite compliment', 'I suggested meeting or talking again']
                    }
                }
            ]
        },
        '2:1': {
            name: 'On the phone',
            lessons: [
                {
                    kind: 'words', title: 'Making a call', list: [
                        { en: 'dial', kn: 'ನಂಬರ್ ಒತ್ತು', hi: 'नंबर मिलाना', pic: '☎️', def: 'to press the numbers on a phone to make a call' },
                        { en: 'missed call', kn: 'ಮಿಸ್ಡ್ ಕಾಲ್', hi: 'मिस्ड कॉल', pic: '📲', def: 'a call that you did not answer in time' },
                        { en: 'voicemail', kn: 'ಧ್ವನಿ ಸಂದೇಶ', hi: 'वॉइसमेल', pic: '📩', def: 'a spoken message left for someone who did not answer the phone' },
                        { en: 'extension', kn: 'ಎಕ್ಸ್ಟೆನ್ಶನ್ ಸಂಖ್ಯೆ', hi: 'एक्सटेंशन नंबर', pic: '🔢', def: 'a short number that connects you to one phone inside an office' },
                        { en: 'hang up', kn: 'ಕರೆ ಕಟ್ ಮಾಡು', hi: 'फ़ोन रखना', pic: '📴', def: 'to end a phone call' },
                        { en: 'caller', kn: 'ಕರೆ ಮಾಡಿದವರು', hi: 'फ़ोन करने वाला', pic: '📞', def: 'the person who is making a phone call' }
                    ]
                },
                {
                    kind: 'phrases', title: 'On the phone 1', list: [
                        { read: true, en: 'Could you put me through to extension two four five, please?', kn: 'ದಯವಿಟ್ಟು ನನ್ನ ಕರೆಯನ್ನು ಎಕ್ಸ್ಟೆನ್ಶನ್ ಎರಡು ನಾಲ್ಕು ಐದಕ್ಕೆ ಜೋಡಿಸುತ್ತೀರಾ?', hi: 'क्या आप मुझे एक्सटेंशन दो चार पाँच पर जोड़ देंगे?' },
                        { read: true, en: 'I saw three missed calls from you; is everything all right?', kn: 'ನಿಮ್ಮ ಮೂರು ಮಿಸ್ಡ್ ಕಾಲ್ ನೋಡಿದೆ, ಎಲ್ಲಾ ಸರಿ ಇದೆಯಾ?', hi: 'मैंने आपकी तीन मिस्ड कॉल देखीं, सब ठीक तो है?' },
                        { en: "He didn't answer, so I left a short message on his voicemail.", kn: 'ಅವನು ಕರೆ ಸ್ವೀಕರಿಸಲಿಲ್ಲ, ಹಾಗಾಗಿ ಅವನಿಗೆ ಒಂದು ಚಿಕ್ಕ ಧ್ವನಿ ಸಂದೇಶ ಬಿಟ್ಟೆ.', hi: 'उसने फ़ोन नहीं उठाया, तो मैंने उसके वॉइसमेल पर एक छोटा संदेश छोड़ दिया।', acc: { en: ['He did not answer, so I left a short message on his voicemail.'] } },
                        { read: true, en: "Please don't hang up, I'll transfer you to the accounts team now.", kn: 'ದಯವಿಟ್ಟು ಕರೆ ಕಟ್ ಮಾಡಬೇಡಿ, ಈಗಲೇ ನಿಮ್ಮನ್ನು ಅಕೌಂಟ್ಸ್ ತಂಡಕ್ಕೆ ವರ್ಗಾಯಿಸುತ್ತೇನೆ.', hi: 'कृपया फ़ोन मत रखिए, मैं अभी आपको अकाउंट्स टीम से जोड़ता हूँ।', acc: { en: ['Please do not hang up, I will transfer you to the accounts team now.'] } },
                        { en: "The caller refused to give his name, so I didn't share any details.", kn: 'ಕರೆ ಮಾಡಿದವನು ತನ್ನ ಹೆಸರು ಹೇಳಲು ಒಪ್ಪಲಿಲ್ಲ, ಹಾಗಾಗಿ ನಾನು ಯಾವ ವಿವರವನ್ನೂ ಕೊಡಲಿಲ್ಲ.', hi: 'फ़ोन करने वाले ने अपना नाम बताने से मना कर दिया, इसलिए मैंने कोई जानकारी नहीं दी।', acc: { en: ['The caller refused to give his name, so I did not share any details.'] } }
                    ]
                },
                {
                    kind: 'words', title: 'Problems on the line', list: [
                        { en: 'wrong number', kn: 'ತಪ್ಪು ನಂಬರ್', hi: 'ग़लत नंबर', pic: '❌', def: 'a phone number that you called by mistake' },
                        { en: 'call back', kn: 'ವಾಪಸ್ ಕಾಲ್ ಮಾಡು', hi: 'वापस फ़ोन करना', pic: '🔁', def: 'to phone someone again, or to return their call' },
                        { en: 'cut off', kn: 'ಕರೆ ಕಟ್ ಆಗು', hi: 'कॉल कट जाना', pic: '✂️', def: 'to be suddenly stopped in the middle of a phone call' },
                        { en: 'loudspeaker', kn: 'ಸ್ಪೀಕರ್', hi: 'स्पीकर', pic: '📢', def: 'a phone setting that lets everyone nearby hear the call' },
                        { en: 'repeat', kn: 'ಮತ್ತೊಮ್ಮೆ ಹೇಳು', hi: 'दोहराना', pic: '🔂', def: 'to say something again, often because it was not heard' },
                        { en: 'connection', kn: 'ಸಂಪರ್ಕ', hi: 'कनेक्शन', pic: '📶', def: 'the link between two phones that lets people hear each other' }
                    ]
                },
                {
                    kind: 'phrases', title: 'On the phone 2', list: [
                        { read: true, en: "I'm sorry, I think you have the wrong number.", kn: 'ಕ್ಷಮಿಸಿ, ನೀವು ತಪ್ಪು ನಂಬರಿಗೆ ಕರೆ ಮಾಡಿದ್ದೀರಿ ಅನಿಸುತ್ತದೆ.', hi: 'माफ़ कीजिए, लगता है आपने ग़लत नंबर मिलाया है।', acc: { en: ['I am sorry, I think you have the wrong number.', 'Sorry, I think you have the wrong number.'] } },
                        { read: true, en: "I'm in a meeting right now; can I call you back in ten minutes?", kn: 'ನಾನು ಈಗ ಮೀಟಿಂಗಿನಲ್ಲಿದ್ದೇನೆ, ಹತ್ತು ನಿಮಿಷದಲ್ಲಿ ವಾಪಸ್ ಕಾಲ್ ಮಾಡಲಾ?', hi: 'मैं अभी मीटिंग में हूँ, क्या दस मिनट में आपको वापस फ़ोन करूँ?', acc: { en: ['I am in a meeting right now; can I call you back in ten minutes?'] } },
                        { en: 'My battery is almost dead, so I might get cut off any moment.', kn: 'ನನ್ನ ಬ್ಯಾಟರಿ ಬಹುತೇಕ ಖಾಲಿಯಾಗಿದೆ, ಯಾವ ಕ್ಷಣದಲ್ಲಾದರೂ ಕರೆ ಕಟ್ ಆಗಬಹುದು.', hi: 'मेरी बैटरी लगभग ख़त्म है, कॉल कभी भी कट सकती है।' },
                        { en: "I'll put you on loudspeaker so that my parents can hear too.", kn: 'ಅಪ್ಪ ಅಮ್ಮನಿಗೂ ಕೇಳಿಸಲಿ ಅಂತ ಫೋನನ್ನು ಸ್ಪೀಕರಿನಲ್ಲಿ ಇಡುತ್ತೇನೆ.', hi: 'मैं फ़ोन स्पीकर पर डाल देता हूँ, ताकि मम्मी-पापा भी सुन सकें।', acc: { en: ['I will put you on loudspeaker so that my parents can hear too.'] } },
                        { read: true, en: 'The connection is very poor here; could you repeat the last part, please?', kn: 'ಇಲ್ಲಿ ಸಂಪರ್ಕ ತುಂಬಾ ದುರ್ಬಲವಾಗಿದೆ, ಕೊನೆಯ ಭಾಗವನ್ನು ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳುತ್ತೀರಾ?', hi: 'यहाँ कनेक्शन बहुत ख़राब है, क्या आप आख़िरी हिस्सा दोबारा बता सकते हैं?' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'The call that almost got away', kn: 'ಕೈತಪ್ಪುತ್ತಿದ್ದ ಕರೆ', hi: 'वह फ़ोन जो छूटते-छूटते बचा' },
                    text: {
                        en: 'Ravi was waiting for an important call from a company in Pune. His phone rang, but the caller asked for someone called Suresh. Ravi politely told him that he had the wrong number. A few minutes later, while he was in a lift, he got a missed call from the company. He dialled the number at once, but the line was busy. Then his battery dropped to five percent, and he had left his charger at home. A kind shopkeeper let him use a charger, and he finally got through. The manager laughed and said that she had been about to call him back anyway.',
                        kn: 'ರವಿ ಪುಣೆಯ ಒಂದು ಕಂಪನಿಯಿಂದ ಮುಖ್ಯವಾದ ಕರೆಗಾಗಿ ಕಾಯುತ್ತಿದ್ದ. ಅವನ ಫೋನ್ ರಿಂಗಾಯಿತು, ಆದರೆ ಕರೆ ಮಾಡಿದವನು ಸುರೇಶ್ ಎಂಬುವವರನ್ನು ಕೇಳಿದ. ನೀವು ತಪ್ಪು ನಂಬರಿಗೆ ಕರೆ ಮಾಡಿದ್ದೀರಿ ಎಂದು ರವಿ ವಿನಯದಿಂದ ಹೇಳಿದ. ಕೆಲವು ನಿಮಿಷಗಳ ನಂತರ ಅವನು ಲಿಫ್ಟಿನಲ್ಲಿದ್ದಾಗ ಕಂಪನಿಯಿಂದ ಒಂದು ಮಿಸ್ಡ್ ಕಾಲ್ ಬಂತು. ಅವನು ತಕ್ಷಣ ಆ ನಂಬರ್ ಡಯಲ್ ಮಾಡಿದ, ಆದರೆ ಲೈನ್ ಬ್ಯುಸಿ ಇತ್ತು. ಅಷ್ಟರಲ್ಲಿ ಅವನ ಬ್ಯಾಟರಿ ಐದು ಪರ್ಸೆಂಟಿಗೆ ಇಳಿಯಿತು, ಚಾರ್ಜರ್ ಬೇರೆ ಮನೆಯಲ್ಲೇ ಬಿಟ್ಟು ಬಂದಿದ್ದ. ಒಬ್ಬ ಒಳ್ಳೆಯ ಅಂಗಡಿಯವನು ತನ್ನ ಚಾರ್ಜರ್ ಬಳಸಲು ಕೊಟ್ಟ, ಕೊನೆಗೂ ಕರೆ ಸಿಕ್ಕಿತು. ಮ್ಯಾನೇಜರ್ ನಕ್ಕು, ತಾವೇ ಅವನಿಗೆ ವಾಪಸ್ ಕಾಲ್ ಮಾಡುವವರಿದ್ದೆವು ಎಂದು ಹೇಳಿದರು.',
                        hi: 'रवि पुणे की एक कंपनी से एक ज़रूरी फ़ोन का इंतज़ार कर रहा था। उसका फ़ोन बजा, पर फ़ोन करने वाले ने सुरेश नाम के किसी आदमी को माँगा। रवि ने विनम्रता से बताया कि उन्होंने ग़लत नंबर मिलाया है। कुछ मिनट बाद, जब वह लिफ़्ट में था, कंपनी से एक मिस्ड कॉल आई। उसने तुरंत वह नंबर मिलाया, पर लाइन व्यस्त थी। फिर उसकी बैटरी पाँच प्रतिशत पर आ गई, और चार्जर वह घर पर ही छोड़ आया था। एक भले दुकानदार ने उसे अपना चार्जर इस्तेमाल करने दिया, और आख़िरकार उसकी बात हो गई। मैनेजर हँसीं और बोलीं कि वे ख़ुद उसे वापस फ़ोन करने ही वाली थीं।'
                    },
                    questions: [
                        {
                            q: { en: 'Who did the first caller ask for?', kn: 'ಮೊದಲು ಕರೆ ಮಾಡಿದವನು ಯಾರನ್ನು ಕೇಳಿದ?', hi: 'पहले फ़ोन करने वाले ने किसे माँगा?' },
                            options: [
                                { en: 'Someone called Suresh', kn: 'ಸುರೇಶ್ ಎಂಬುವವರನ್ನು', hi: 'सुरेश नाम के किसी आदमी को' },
                                { en: 'The manager', kn: 'ಮ್ಯಾನೇಜರನ್ನು', hi: 'मैनेजर को' },
                                { en: "Ravi's father", kn: 'ರವಿಯ ತಂದೆಯನ್ನು', hi: 'रवि के पिता को' },
                                { en: 'A shopkeeper', kn: 'ಒಬ್ಬ ಅಂಗಡಿಯವನನ್ನು', hi: 'एक दुकानदार को' }
                            ]
                        },
                        {
                            q: { en: 'Why could Ravi not get through at first?', kn: 'ಮೊದಲ ಬಾರಿ ರವಿಗೆ ಕರೆ ಏಕೆ ಸಿಗಲಿಲ್ಲ?', hi: 'पहली बार रवि की बात क्यों नहीं हो पाई?' },
                            options: [
                                { en: 'The line was busy', kn: 'ಲೈನ್ ಬ್ಯುಸಿ ಇತ್ತು', hi: 'लाइन व्यस्त थी' },
                                { en: 'He dialled the wrong number', kn: 'ಅವನು ತಪ್ಪು ನಂಬರ್ ಡಯಲ್ ಮಾಡಿದ', hi: 'उसने ग़लत नंबर मिलाया' },
                                { en: 'The office was closed', kn: 'ಆಫೀಸ್ ಮುಚ್ಚಿತ್ತು', hi: 'दफ़्तर बंद था' },
                                { en: 'His phone was switched off', kn: 'ಅವನ ಫೋನ್ ಸ್ವಿಚ್ ಆಫ್ ಆಗಿತ್ತು', hi: 'उसका फ़ोन बंद था' }
                            ]
                        },
                        {
                            q: { en: 'Who helped Ravi with a charger?', kn: 'ಚಾರ್ಜರ್ ಕೊಟ್ಟು ರವಿಗೆ ಯಾರು ಸಹಾಯ ಮಾಡಿದರು?', hi: 'चार्जर देकर रवि की मदद किसने की?' },
                            options: [
                                { en: 'A kind shopkeeper', kn: 'ಒಬ್ಬ ಒಳ್ಳೆಯ ಅಂಗಡಿಯವನು', hi: 'एक भला दुकानदार' },
                                { en: 'The manager', kn: 'ಮ್ಯಾನೇಜರ್', hi: 'मैनेजर' },
                                { en: 'His neighbour', kn: 'ಅವನ ನೆರೆಯವನು', hi: 'उसका पड़ोसी' },
                                { en: 'A taxi driver', kn: 'ಒಬ್ಬ ಟ್ಯಾಕ್ಸಿ ಚಾಲಕ', hi: 'एक टैक्सी ड्राइवर' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Leaving a message', kn: 'ಸಂದೇಶ ಬಿಡುವುದು', hi: 'संदेश छोड़ना' },
                    scenario: {
                        en: 'Anil calls a travel agency in Mangaluru to speak to Mr Kamath, and the receptionist, Pooja, answers.',
                        kn: 'ಕಾಮತ್ ಅವರ ಜೊತೆ ಮಾತಾಡಲು ಅನಿಲ್ ಮಂಗಳೂರಿನ ಒಂದು ಟ್ರಾವೆಲ್ ಏಜೆನ್ಸಿಗೆ ಕರೆ ಮಾಡುತ್ತಾನೆ; ಸ್ವಾಗತಕಾರಿಣಿ ಪೂಜಾ ಕರೆ ಸ್ವೀಕರಿಸುತ್ತಾಳೆ.',
                        hi: 'अनिल मंगलुरु की एक ट्रैवल एजेंसी में कामत जी से बात करने के लिए फ़ोन करता है, और रिसेप्शनिस्ट पूजा फ़ोन उठाती है।'
                    },
                    speakers: [{ name: 'Pooja', voice: 'f' }, { name: 'Anil', voice: 'm' }],
                    lines: [
                        { speaker: 'Pooja', en: 'Good afternoon, Coastal Travels, Pooja speaking. How may I help you?', kn: 'ನಮಸ್ಕಾರ, ಕೋಸ್ಟಲ್ ಟ್ರಾವೆಲ್ಸ್, ನಾನು ಪೂಜಾ ಮಾತಾಡುತ್ತಿದ್ದೇನೆ. ಏನು ಸಹಾಯ ಮಾಡಲಿ?', hi: 'नमस्ते, कोस्टल ट्रैवल्स, मैं पूजा बोल रही हूँ। बताइए, मैं आपकी क्या मदद कर सकती हूँ?' },
                        { speaker: 'Anil', en: 'Hello, this is Anil Shetty. Could you put me through to Mr Kamath, please?', kn: 'ನಮಸ್ಕಾರ, ನಾನು ಅನಿಲ್ ಶೆಟ್ಟಿ. ದಯವಿಟ್ಟು ಕಾಮತ್ ಅವರಿಗೆ ಕರೆ ಜೋಡಿಸುತ್ತೀರಾ?', hi: 'नमस्ते, मैं अनिल शेट्टी बोल रहा हूँ। क्या आप मेरी बात कामत जी से करा देंगी?' },
                        { speaker: 'Pooja', en: "I'm afraid he's out of the office until four. Would you like to leave a message?", kn: 'ಕ್ಷಮಿಸಿ, ಅವರು ನಾಲ್ಕು ಗಂಟೆಯವರೆಗೆ ಆಫೀಸಿನಲ್ಲಿ ಇರುವುದಿಲ್ಲ. ಏನಾದರೂ ಸಂದೇಶ ಬಿಡುತ್ತೀರಾ?', hi: 'माफ़ कीजिए, वे चार बजे तक दफ़्तर से बाहर हैं। क्या आप कोई संदेश छोड़ना चाहेंगे?' },
                        { speaker: 'Anil', en: 'Yes, please. Could you ask him to call me back about the Goa trip?', kn: 'ಹೌದು. ಗೋವಾ ಪ್ರವಾಸದ ಬಗ್ಗೆ ನನಗೆ ವಾಪಸ್ ಕಾಲ್ ಮಾಡಲು ಅವರಿಗೆ ಹೇಳುತ್ತೀರಾ?', hi: 'जी हाँ। क्या आप उनसे कहेंगी कि गोवा ट्रिप के बारे में मुझे वापस फ़ोन कर लें?' },
                        { speaker: 'Pooja', en: 'Sorry, the line is very bad. Could you repeat that, please?', kn: 'ಕ್ಷಮಿಸಿ, ಲೈನ್ ತುಂಬಾ ಕೆಟ್ಟದಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳುತ್ತೀರಾ?', hi: 'माफ़ कीजिए, लाइन बहुत ख़राब है। क्या आप दोबारा बता सकते हैं?' },
                        { speaker: 'Anil', en: 'Of course. Please ask Mr Kamath to call me back about the Goa trip.', kn: 'ಖಂಡಿತ. ಗೋವಾ ಪ್ರವಾಸದ ಬಗ್ಗೆ ನನಗೆ ವಾಪಸ್ ಕಾಲ್ ಮಾಡಲು ದಯವಿಟ್ಟು ಕಾಮತ್ ಅವರಿಗೆ ಹೇಳಿ.', hi: 'ज़रूर। कृपया कामत जी से कहिए कि गोवा ट्रिप के बारे में मुझे वापस फ़ोन करें।' },
                        { speaker: 'Pooja', en: "Certainly. What's the best number to reach you on?", kn: 'ಖಂಡಿತ. ನಿಮ್ಮನ್ನು ಯಾವ ನಂಬರಿನಲ್ಲಿ ಸಂಪರ್ಕಿಸುವುದು ಉತ್ತಮ?', hi: 'ज़रूर। आपसे किस नंबर पर बात करना ठीक रहेगा?' },
                        { speaker: 'Anil', en: 'You can reach me on 98450 12376.', kn: 'ನನ್ನನ್ನು 98450 12376 ನಂಬರಿನಲ್ಲಿ ಸಂಪರ್ಕಿಸಬಹುದು.', hi: 'आप मुझसे 98450 12376 पर बात कर सकती हैं।' },
                        { speaker: 'Pooja', en: "Let me read that back: 98450 12376. I'll make sure he gets the message.", kn: 'ಒಮ್ಮೆ ಓದಿ ಹೇಳುತ್ತೇನೆ: 98450 12376. ಅವರಿಗೆ ಸಂದೇಶ ತಲುಪುವಂತೆ ನೋಡಿಕೊಳ್ಳುತ್ತೇನೆ.', hi: 'मैं एक बार दोहरा देती हूँ: 98450 12376. मैं पक्का कर दूँगी कि उन्हें संदेश मिल जाए।' },
                        { speaker: 'Anil', en: "That's right. Thank you so much for your help.", kn: 'ಸರಿಯಾಗಿದೆ. ನಿಮ್ಮ ಸಹಾಯಕ್ಕೆ ತುಂಬಾ ಧನ್ಯವಾದ.', hi: 'बिल्कुल सही। आपकी मदद के लिए बहुत-बहुत शुक्रिया।' }
                    ],
                    questions: [
                        {
                            q: { en: 'Why can Anil not speak to Mr Kamath?', kn: 'ಅನಿಲನಿಗೆ ಕಾಮತ್ ಅವರ ಜೊತೆ ಏಕೆ ಮಾತಾಡಲು ಆಗಲಿಲ್ಲ?', hi: 'अनिल कामत जी से बात क्यों नहीं कर पाया?' },
                            options: [
                                { en: 'He is out of the office until four', kn: 'ಅವರು ನಾಲ್ಕು ಗಂಟೆಯವರೆಗೆ ಆಫೀಸಿನಲ್ಲಿಲ್ಲ', hi: 'वे चार बजे तक दफ़्तर से बाहर हैं' },
                                { en: 'He is on another call', kn: 'ಅವರು ಬೇರೆ ಕರೆಯಲ್ಲಿದ್ದಾರೆ', hi: 'वे दूसरी कॉल पर हैं' },
                                { en: 'He has left the company', kn: 'ಅವರು ಕಂಪನಿ ಬಿಟ್ಟಿದ್ದಾರೆ', hi: 'वे कंपनी छोड़ चुके हैं' },
                                { en: 'He is on holiday in Goa', kn: 'ಅವರು ಗೋವಾದಲ್ಲಿ ರಜೆಯಲ್ಲಿದ್ದಾರೆ', hi: 'वे गोवा में छुट्टी पर हैं' }
                            ]
                        },
                        {
                            q: { en: "What is Anil's message about?", kn: 'ಅನಿಲನ ಸಂದೇಶ ಯಾವುದರ ಬಗ್ಗೆ?', hi: 'अनिल का संदेश किस बारे में है?' },
                            options: [
                                { en: 'The Goa trip', kn: 'ಗೋವಾ ಪ್ರವಾಸ', hi: 'गोवा ट्रिप' },
                                { en: 'A bank loan', kn: 'ಬ್ಯಾಂಕ್ ಸಾಲ', hi: 'बैंक लोन' },
                                { en: 'A job interview', kn: 'ಉದ್ಯೋಗ ಸಂದರ್ಶನ', hi: 'नौकरी का इंटरव्यू' },
                                { en: 'A hotel complaint', kn: 'ಹೋಟೆಲಿನ ಬಗ್ಗೆ ದೂರು', hi: 'होटल की शिकायत' }
                            ]
                        },
                        {
                            q: { en: 'How does Pooja check the phone number?', kn: 'ಪೂಜಾ ಫೋನ್ ನಂಬರನ್ನು ಹೇಗೆ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳುತ್ತಾಳೆ?', hi: 'पूजा फ़ोन नंबर की पुष्टि कैसे करती है?' },
                            options: [
                                { en: 'She reads it back to Anil', kn: 'ಅದನ್ನು ಅನಿಲನಿಗೆ ಓದಿ ಹೇಳುತ್ತಾಳೆ', hi: 'वह उसे अनिल को दोहराकर सुनाती है' },
                                { en: 'She sends him a text', kn: 'ಅವನಿಗೆ ಮೆಸೇಜ್ ಕಳುಹಿಸುತ್ತಾಳೆ', hi: 'वह उसे मैसेज भेजती है' },
                                { en: 'She dials it at once', kn: 'ತಕ್ಷಣ ಆ ನಂಬರ್ ಡಯಲ್ ಮಾಡುತ್ತಾಳೆ', hi: 'वह तुरंत वह नंबर मिलाती है' },
                                { en: 'She asks Mr Kamath', kn: 'ಕಾಮತ್ ಅವರನ್ನು ಕೇಳುತ್ತಾಳೆ', hi: 'वह कामत जी से पूछती है' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: "You call a friend's office, but your friend is not at the desk. Ask to be put through, leave a clear message with your name and number, and ask for a call back.",
                        sample: "Good morning. This is Kiran Rao calling from Hubballi. Could you put me through to Ms Shalini Patil, please? Oh, she's in a meeting? No problem. Could I leave a message for her? Please tell her that Kiran called about the college reunion on Saturday. I need to confirm the venue by this evening. Could she call me back on 94480 55123 when she's free? I'll repeat that: 94480 55123. Thank you so much, and have a good day.",
                        checklist: ['I greeted the person and said who I am', 'I asked politely to be put through', 'I left a clear message', 'I gave my phone number and repeated it', 'I asked for a call back and said thank you']
                    }
                }
            ]
        },
        '3:1': {
            name: 'At the bank',
            lessons: [
                {
                    kind: 'words', title: 'Bank accounts', list: [
                        { en: 'account', kn: 'ಖಾತೆ', hi: 'खाता', pic: '🏦', def: 'an arrangement with a bank to keep your money there' },
                        { en: 'cash', kn: 'ನಗದು', hi: 'नकद', pic: '💰', def: 'money in the form of notes and coins' },
                        { en: 'withdraw', kn: 'ಹಣ ತೆಗೆ', hi: 'पैसे निकालना', pic: '📤', def: 'to take money out of a bank account' },
                        { en: 'passbook', kn: 'ಪಾಸ್ ಬುಕ್', hi: 'पासबुक', pic: '📘', def: 'a small book that records the money going in and out of your account' },
                        { en: 'cheque', kn: 'ಚೆಕ್', hi: 'चेक', pic: '🧾', def: 'a printed paper you sign to pay money from your bank account' },
                        { en: 'balance', kn: 'ಉಳಿಕೆ ಹಣ', hi: 'बैलेंस', pic: '⚖️', def: 'the amount of money in your account right now' }
                    ]
                },
                {
                    kind: 'phrases', title: 'At the bank 1', list: [
                        { read: true, en: "I'd like to open a savings account in my daughter's name.", kn: 'ನನ್ನ ಮಗಳ ಹೆಸರಿನಲ್ಲಿ ಒಂದು ಉಳಿತಾಯ ಖಾತೆ ತೆರೆಯಬೇಕಿತ್ತು.', hi: 'मैं अपनी बेटी के नाम से एक बचत खाता खुलवाना चाहता हूँ।', acc: { en: ["I would like to open a savings account in my daughter's name."] } },
                        { read: true, en: 'Please fill in this slip if you want to deposit cash.', kn: 'ನಗದು ಜಮೆ ಮಾಡಬೇಕಾದರೆ ದಯವಿಟ್ಟು ಈ ಚೀಟಿ ತುಂಬಿ.', hi: 'नकद जमा करना हो तो कृपया यह पर्ची भरिए।' },
                        { en: 'How much can I withdraw in a single day without a cheque?', kn: 'ಚೆಕ್ ಇಲ್ಲದೆ ಒಂದೇ ದಿನದಲ್ಲಿ ಎಷ್ಟು ಹಣ ತೆಗೆಯಬಹುದು?', hi: 'बिना चेक के एक दिन में कितना पैसा निकाल सकते हैं?' },
                        { read: true, en: "Could you update my passbook, please? It hasn't been printed for months.", kn: 'ದಯವಿಟ್ಟು ನನ್ನ ಪಾಸ್ ಬುಕ್ ಅಪ್ಡೇಟ್ ಮಾಡುತ್ತೀರಾ? ತಿಂಗಳುಗಳಿಂದ ಪ್ರಿಂಟ್ ಆಗಿಲ್ಲ.', hi: 'क्या आप मेरी पासबुक अपडेट कर देंगे? महीनों से प्रिंट नहीं हुई है।', acc: { en: ['Could you update my passbook, please? It has not been printed for months.'] } },
                        { en: "My balance is quite low, so I'm afraid the cheque might bounce.", kn: 'ನನ್ನ ಖಾತೆಯಲ್ಲಿ ಉಳಿಕೆ ಹಣ ಕಡಿಮೆ ಇದೆ, ಚೆಕ್ ಬೌನ್ಸ್ ಆಗಬಹುದು ಅಂತ ಭಯ.', hi: 'मेरा बैलेंस काफ़ी कम है, इसलिए डर है कि चेक बाउंस न हो जाए।', acc: { en: ['My balance is quite low, so I am afraid the cheque might bounce.'] } }
                    ]
                },
                {
                    kind: 'words', title: 'Cards, UPI and KYC', list: [
                        { en: 'ATM', kn: 'ಎಟಿಎಂ', hi: 'एटीएम', pic: '🏧', def: 'a machine in a wall that gives out cash from your account' },
                        { en: 'debit card', kn: 'ಡೆಬಿಟ್ ಕಾರ್ಡ್', hi: 'डेबिट कार्ड', pic: '💳', def: 'a plastic card that takes money straight from your account' },
                        { en: 'PIN', kn: 'ಪಿನ್ ಸಂಖ್ಯೆ', hi: 'पिन', pic: '🔐', def: 'a secret number you type to use your card or UPI' },
                        { en: 'UPI', kn: 'ಯುಪಿಐ', hi: 'यूपीआई', pic: '📱', def: 'an Indian system for paying money instantly from your phone' },
                        { en: 'interest', kn: 'ಬಡ್ಡಿ', hi: 'ब्याज', pic: '📈', def: 'extra money a bank pays you on savings, or charges you on a loan' },
                        { en: 'KYC', kn: 'ಕೆವೈಸಿ', hi: 'केवाईसी', pic: '🪪', def: 'the bank\'s check of your identity and address documents' }
                    ]
                },
                {
                    kind: 'phrases', title: 'At the bank 2', list: [
                        { read: true, en: 'The ATM kept my debit card, so I need to block it immediately.', kn: 'ಎಟಿಎಂ ನನ್ನ ಡೆಬಿಟ್ ಕಾರ್ಡನ್ನು ಒಳಗೆ ಎಳೆದುಕೊಂಡಿತು, ಅದನ್ನು ತಕ್ಷಣ ಬ್ಲಾಕ್ ಮಾಡಿಸಬೇಕು.', hi: 'एटीएम ने मेरा डेबिट कार्ड अंदर रख लिया, मुझे उसे तुरंत ब्लॉक करवाना है।' },
                        { read: true, en: 'Never share your PIN with anyone, even if they say they are from the bank.', kn: 'ಬ್ಯಾಂಕಿನವರು ಎಂದು ಹೇಳಿದರೂ ನಿಮ್ಮ ಪಿನ್ ಸಂಖ್ಯೆಯನ್ನು ಯಾರಿಗೂ ಹೇಳಬೇಡಿ.', hi: 'कोई ख़ुद को बैंक वाला बताए, तब भी अपना पिन किसी को मत बताइए।' },
                        { en: "I paid the rent through UPI, but it still hasn't reached the owner.", kn: 'ನಾನು ಯುಪಿಐ ಮೂಲಕ ಬಾಡಿಗೆ ಕಟ್ಟಿದೆ, ಆದರೆ ಹಣ ಇನ್ನೂ ಮಾಲೀಕರಿಗೆ ತಲುಪಿಲ್ಲ.', hi: 'मैंने यूपीआई से किराया भेजा, पर पैसा अभी तक मकान मालिक तक नहीं पहुँचा।', acc: { en: ['I paid the rent through UPI, but it still has not reached the owner.'] } },
                        { read: true, en: 'What rate of interest do you offer on a two-year fixed deposit?', kn: 'ಎರಡು ವರ್ಷದ ನಿಶ್ಚಿತ ಠೇವಣಿಗೆ ನೀವು ಎಷ್ಟು ಬಡ್ಡಿ ಕೊಡುತ್ತೀರಿ?', hi: 'दो साल की फ़िक्स्ड डिपॉज़िट पर आप कितना ब्याज देते हैं?' },
                        { en: 'Please complete your KYC with your Aadhaar and PAN, or the account may be frozen.', kn: 'ದಯವಿಟ್ಟು ಆಧಾರ್ ಮತ್ತು ಪ್ಯಾನ್ ಕೊಟ್ಟು ಕೆವೈಸಿ ಮುಗಿಸಿ, ಇಲ್ಲದಿದ್ದರೆ ಖಾತೆ ಸ್ಥಗಿತವಾಗಬಹುದು.', hi: 'कृपया आधार और पैन से अपना केवाईसी पूरा कीजिए, वरना खाता फ़्रीज़ हो सकता है।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A first bank account', kn: 'ಮೊದಲ ಬ್ಯಾಂಕ್ ಖಾತೆ', hi: 'पहला बैंक खाता' },
                    text: {
                        en: 'Sanjana got her first job in Mangaluru and went to a nearby bank to open a salary account. For the KYC, the officer asked for her Aadhaar card, her PAN card and two photos. Sanjana filled in the form and made a small deposit of two thousand rupees. A week later, she received a passbook, a cheque book and a debit card. The officer told her to set a new PIN at the ATM and never to share it with anyone. She also linked the account to UPI on her phone. Now she checks her balance every month and keeps some money in a fixed deposit to earn interest.',
                        kn: 'ಸಂಜನಾಳಿಗೆ ಮಂಗಳೂರಿನಲ್ಲಿ ಮೊದಲ ಕೆಲಸ ಸಿಕ್ಕಿತು, ಸಂಬಳದ ಖಾತೆ ತೆರೆಯಲು ಅವಳು ಹತ್ತಿರದ ಬ್ಯಾಂಕಿಗೆ ಹೋದಳು. ಕೆವೈಸಿಗಾಗಿ ಅಧಿಕಾರಿ ಅವಳ ಆಧಾರ್ ಕಾರ್ಡ್, ಪ್ಯಾನ್ ಕಾರ್ಡ್ ಮತ್ತು ಎರಡು ಫೋಟೋಗಳನ್ನು ಕೇಳಿದರು. ಸಂಜನಾ ಅರ್ಜಿ ತುಂಬಿ, ಎರಡು ಸಾವಿರ ರೂಪಾಯಿಯನ್ನು ಜಮೆ ಮಾಡಿದಳು. ಒಂದು ವಾರದ ನಂತರ ಅವಳಿಗೆ ಪಾಸ್ ಬುಕ್, ಚೆಕ್ ಬುಕ್ ಮತ್ತು ಡೆಬಿಟ್ ಕಾರ್ಡ್ ಸಿಕ್ಕಿತು. ಎಟಿಎಂನಲ್ಲಿ ಹೊಸ ಪಿನ್ ಸಂಖ್ಯೆ ಹಾಕಿಕೊಳ್ಳಲು ಮತ್ತು ಅದನ್ನು ಯಾರಿಗೂ ಹೇಳದಿರಲು ಅಧಿಕಾರಿ ತಿಳಿಸಿದರು. ಅವಳು ತನ್ನ ಫೋನಿನ ಯುಪಿಐಗೂ ಆ ಖಾತೆಯನ್ನು ಜೋಡಿಸಿದಳು. ಈಗ ಅವಳು ಪ್ರತಿ ತಿಂಗಳು ತನ್ನ ಉಳಿಕೆ ಹಣವನ್ನು ನೋಡುತ್ತಾಳೆ, ಬಡ್ಡಿ ಗಳಿಸಲು ಸ್ವಲ್ಪ ಹಣವನ್ನು ನಿಶ್ಚಿತ ಠೇವಣಿಯಲ್ಲಿ ಇಡುತ್ತಾಳೆ.',
                        hi: 'संजना को मंगलुरु में पहली नौकरी मिली, और वह सैलरी खाता खुलवाने पास के एक बैंक गई। केवाईसी के लिए अधिकारी ने उसका आधार कार्ड, पैन कार्ड और दो फ़ोटो माँगे। संजना ने फ़ॉर्म भरा और दो हज़ार रुपये जमा किए। एक हफ़्ते बाद उसे पासबुक, चेकबुक और डेबिट कार्ड मिल गए। अधिकारी ने उससे कहा कि एटीएम पर नया पिन बना ले और उसे कभी किसी को न बताए। उसने अपने फ़ोन के यूपीआई से भी वह खाता जोड़ लिया। अब वह हर महीने अपना बैलेंस देखती है और ब्याज कमाने के लिए कुछ पैसे फ़िक्स्ड डिपॉज़िट में रखती है।'
                    },
                    questions: [
                        {
                            q: { en: 'Why did Sanjana open an account?', kn: 'ಸಂಜನಾ ಖಾತೆ ಏಕೆ ತೆರೆದಳು?', hi: 'संजना ने खाता क्यों खुलवाया?' },
                            options: [
                                { en: 'To receive her salary', kn: 'ಸಂಬಳ ಪಡೆಯಲು', hi: 'वेतन पाने के लिए' },
                                { en: 'To take a loan', kn: 'ಸಾಲ ಪಡೆಯಲು', hi: 'लोन लेने के लिए' },
                                { en: 'To pay her college fees', kn: 'ಕಾಲೇಜು ಶುಲ್ಕ ಕಟ್ಟಲು', hi: 'कॉलेज की फ़ीस भरने के लिए' },
                                { en: 'To send money abroad', kn: 'ವಿದೇಶಕ್ಕೆ ಹಣ ಕಳುಹಿಸಲು', hi: 'विदेश पैसे भेजने के लिए' }
                            ]
                        },
                        {
                            q: { en: 'How much money did she deposit at first?', kn: 'ಮೊದಲು ಅವಳು ಎಷ್ಟು ಹಣ ಜಮೆ ಮಾಡಿದಳು?', hi: 'शुरू में उसने कितने पैसे जमा किए?' },
                            options: [
                                { en: 'Two thousand rupees', kn: 'ಎರಡು ಸಾವಿರ ರೂಪಾಯಿ', hi: 'दो हज़ार रुपये' },
                                { en: 'Five hundred rupees', kn: 'ಐನೂರು ರೂಪಾಯಿ', hi: 'पाँच सौ रुपये' },
                                { en: 'Twenty thousand rupees', kn: 'ಇಪ್ಪತ್ತು ಸಾವಿರ ರೂಪಾಯಿ', hi: 'बीस हज़ार रुपये' },
                                { en: 'Two lakh rupees', kn: 'ಎರಡು ಲಕ್ಷ ರೂಪಾಯಿ', hi: 'दो लाख रुपये' }
                            ]
                        },
                        {
                            q: { en: 'What did the officer say about her PIN?', kn: 'ಪಿನ್ ಬಗ್ಗೆ ಅಧಿಕಾರಿ ಏನು ಹೇಳಿದರು?', hi: 'पिन के बारे में अधिकारी ने क्या कहा?' },
                            options: [
                                { en: 'Never share it with anyone', kn: 'ಅದನ್ನು ಯಾರಿಗೂ ಹೇಳಬೇಡಿ', hi: 'इसे कभी किसी को मत बताना' },
                                { en: 'Write it on the card', kn: 'ಅದನ್ನು ಕಾರ್ಡಿನ ಮೇಲೆ ಬರೆಯಿರಿ', hi: 'इसे कार्ड पर लिख लेना' },
                                { en: 'Send it to the bank by SMS', kn: 'ಅದನ್ನು ಎಸ್ಎಂಎಸ್ ಮೂಲಕ ಬ್ಯಾಂಕಿಗೆ ಕಳುಹಿಸಿ', hi: 'इसे एसएमएस से बैंक को भेजना' },
                                { en: 'Change it every day', kn: 'ಅದನ್ನು ಪ್ರತಿದಿನ ಬದಲಿಸಿ', hi: 'इसे हर दिन बदलना' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'A failed payment', kn: 'ವಿಫಲವಾದ ಪಾವತಿ', hi: 'फ़ेल हुआ भुगतान' },
                    scenario: {
                        en: 'Farhan visits his bank in Pune because a UPI payment failed, and talks to Ritu at the help desk.',
                        kn: 'ಯುಪಿಐ ಪಾವತಿ ವಿಫಲವಾದ ಕಾರಣ ಫರ್ಹಾನ್ ಪುಣೆಯಲ್ಲಿರುವ ತನ್ನ ಬ್ಯಾಂಕಿಗೆ ಹೋಗಿ, ಸಹಾಯ ಕೇಂದ್ರದಲ್ಲಿರುವ ರಿತು ಅವರ ಜೊತೆ ಮಾತಾಡುತ್ತಾನೆ.',
                        hi: 'एक यूपीआई भुगतान फ़ेल होने पर फ़रहान पुणे में अपने बैंक जाता है और हेल्प डेस्क पर रितु से बात करता है।'
                    },
                    speakers: [{ name: 'Ritu', voice: 'f' }, { name: 'Farhan', voice: 'm' }],
                    lines: [
                        { speaker: 'Ritu', en: 'Good morning, sir. How can I help you today?', kn: 'ಶುಭೋದಯ ಸರ್. ಇವತ್ತು ನಿಮಗೆ ಏನು ಸಹಾಯ ಮಾಡಲಿ?', hi: 'सुप्रभात, सर। आज मैं आपकी क्या मदद कर सकती हूँ?' },
                        { speaker: 'Farhan', en: 'Good morning. Yesterday I paid three thousand rupees through UPI, but the payment failed.', kn: 'ಶುಭೋದಯ. ನಿನ್ನೆ ನಾನು ಯುಪಿಐ ಮೂಲಕ ಮೂರು ಸಾವಿರ ರೂಪಾಯಿ ಕಳುಹಿಸಿದೆ, ಆದರೆ ಪಾವತಿ ವಿಫಲವಾಯಿತು.', hi: 'सुप्रभात। कल मैंने यूपीआई से तीन हज़ार रुपये भेजे, पर भुगतान फ़ेल हो गया।' },
                        { speaker: 'Ritu', en: 'I see. Was the money taken from your account?', kn: 'ಹೌದಾ. ನಿಮ್ಮ ಖಾತೆಯಿಂದ ಹಣ ಕಡಿತವಾಯಿತೇ?', hi: 'अच्छा। क्या आपके खाते से पैसे कट गए?' },
                        { speaker: 'Farhan', en: 'Yes. My balance went down, but the shop never received it.', kn: 'ಹೌದು. ನನ್ನ ಉಳಿಕೆ ಹಣ ಕಡಿಮೆಯಾಯಿತು, ಆದರೆ ಅಂಗಡಿಯವರಿಗೆ ಹಣ ತಲುಪಲೇ ಇಲ್ಲ.', hi: 'हाँ। मेरा बैलेंस कम हो गया, पर दुकान वाले को पैसे मिले ही नहीं।' },
                        { speaker: 'Ritu', en: "Don't worry. Failed payments usually come back within three working days.", kn: 'ಚಿಂತೆ ಮಾಡಬೇಡಿ. ವಿಫಲವಾದ ಪಾವತಿಗಳು ಸಾಮಾನ್ಯವಾಗಿ ಮೂರು ಕೆಲಸದ ದಿನಗಳಲ್ಲಿ ವಾಪಸ್ ಬರುತ್ತವೆ.', hi: 'चिंता मत कीजिए। फ़ेल हुए भुगतान आमतौर पर तीन कामकाजी दिनों में वापस आ जाते हैं।' },
                        { speaker: 'Farhan', en: "That's a relief. While I'm here, could you tell me about education loans?", kn: 'ಸಮಾಧಾನವಾಯಿತು. ಇಲ್ಲಿಗೆ ಬಂದಿದ್ದೇನೆ, ಶಿಕ್ಷಣ ಸಾಲದ ಬಗ್ಗೆಯೂ ಸ್ವಲ್ಪ ತಿಳಿಸುತ್ತೀರಾ?', hi: 'चलिए, राहत मिली। अब आया हूँ तो क्या आप मुझे एजुकेशन लोन के बारे में बता सकती हैं?' },
                        { speaker: 'Ritu', en: 'Certainly. The rate of interest is around nine percent, and your KYC must be up to date.', kn: 'ಖಂಡಿತ. ಬಡ್ಡಿ ದರ ಸುಮಾರು ಒಂಬತ್ತು ಪರ್ಸೆಂಟ್, ಮತ್ತು ನಿಮ್ಮ ಕೆವೈಸಿ ಅಪ್ಡೇಟ್ ಆಗಿರಬೇಕು.', hi: 'ज़रूर। ब्याज दर लगभग नौ प्रतिशत है, और आपका केवाईसी अपडेट होना चाहिए।' },
                        { speaker: 'Farhan', en: "I think it's complete. I updated my Aadhaar details last year.", kn: 'ಅದು ಪೂರ್ತಿಯಾಗಿದೆ ಅನಿಸುತ್ತೆ. ಕಳೆದ ವರ್ಷ ನನ್ನ ಆಧಾರ್ ವಿವರಗಳನ್ನು ಅಪ್ಡೇಟ್ ಮಾಡಿದ್ದೆ.', hi: 'मुझे लगता है वह पूरा है। मैंने पिछले साल अपने आधार की जानकारी अपडेट की थी।' },
                        { speaker: 'Ritu', en: "Let me check. Yes, it's all fine. Here's the loan form and a list of documents.", kn: 'ಒಮ್ಮೆ ನೋಡುತ್ತೇನೆ. ಹೌದು, ಎಲ್ಲಾ ಸರಿಯಿದೆ. ಇದೋ ಸಾಲದ ಅರ್ಜಿ ಮತ್ತು ದಾಖಲೆಗಳ ಪಟ್ಟಿ.', hi: 'मैं देख लेती हूँ। हाँ, सब ठीक है। यह रहा लोन का फ़ॉर्म और दस्तावेज़ों की सूची।' },
                        { speaker: 'Farhan', en: "Thank you so much. You've been very helpful.", kn: 'ತುಂಬಾ ಧನ್ಯವಾದ. ನೀವು ತುಂಬಾ ಸಹಾಯ ಮಾಡಿದಿರಿ.', hi: 'बहुत-बहुत धन्यवाद। आपने बहुत मदद की।' }
                    ],
                    questions: [
                        {
                            q: { en: "What went wrong with Farhan's payment?", kn: 'ಫರ್ಹಾನನ ಪಾವತಿಯಲ್ಲಿ ಏನು ತೊಂದರೆಯಾಯಿತು?', hi: 'फ़रहान के भुगतान में क्या गड़बड़ हुई?' },
                            options: [
                                { en: 'It failed, but money left his account', kn: 'ಪಾವತಿ ವಿಫಲವಾಯಿತು, ಆದರೆ ಖಾತೆಯಿಂದ ಹಣ ಕಡಿತವಾಯಿತು', hi: 'भुगतान फ़ेल हुआ, पर खाते से पैसे कट गए' },
                                { en: 'He paid the shop twice', kn: 'ಅಂಗಡಿಗೆ ಎರಡು ಬಾರಿ ಹಣ ಕೊಟ್ಟ', hi: 'उसने दुकान को दो बार पैसे दिए' },
                                { en: 'He forgot his PIN', kn: 'ಅವನು ಪಿನ್ ಮರೆತ', hi: 'वह अपना पिन भूल गया' },
                                { en: 'The shop sent the money back', kn: 'ಅಂಗಡಿಯವರು ಹಣ ವಾಪಸ್ ಕಳುಹಿಸಿದರು', hi: 'दुकान ने पैसे वापस भेज दिए' }
                            ]
                        },
                        {
                            q: { en: 'When will the money usually come back?', kn: 'ಸಾಮಾನ್ಯವಾಗಿ ಹಣ ಯಾವಾಗ ವಾಪಸ್ ಬರುತ್ತದೆ?', hi: 'पैसे आमतौर पर कब वापस आते हैं?' },
                            options: [
                                { en: 'Within three working days', kn: 'ಮೂರು ಕೆಲಸದ ದಿನಗಳಲ್ಲಿ', hi: 'तीन कामकाजी दिनों में' },
                                { en: 'Within one hour', kn: 'ಒಂದು ಗಂಟೆಯಲ್ಲಿ', hi: 'एक घंटे में' },
                                { en: 'After one month', kn: 'ಒಂದು ತಿಂಗಳ ನಂತರ', hi: 'एक महीने बाद' },
                                { en: 'Only after a complaint', kn: 'ದೂರು ಕೊಟ್ಟ ನಂತರವೇ', hi: 'शिकायत करने के बाद ही' }
                            ]
                        },
                        {
                            q: { en: 'What else does Farhan ask about?', kn: 'ಫರ್ಹಾನ್ ಬೇರೆ ಏನು ಕೇಳುತ್ತಾನೆ?', hi: 'फ़रहान और किस बारे में पूछता है?' },
                            options: [
                                { en: 'Education loans', kn: 'ಶಿಕ್ಷಣ ಸಾಲ', hi: 'एजुकेशन लोन' },
                                { en: 'A new debit card', kn: 'ಹೊಸ ಡೆಬಿಟ್ ಕಾರ್ಡ್', hi: 'नया डेबिट कार्ड' },
                                { en: 'A bank locker', kn: 'ಬ್ಯಾಂಕ್ ಲಾಕರ್', hi: 'बैंक लॉकर' },
                                { en: 'A home loan', kn: 'ಗೃಹ ಸಾಲ', hi: 'होम लोन' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'You are at a bank counter. Explain that money was taken from your account for a payment that failed, give the details, and ask what the bank will do and how long it will take.',
                        sample: "Good morning. I'd like to report a problem with a payment. On Monday evening I paid two thousand five hundred rupees to a shop in Hubballi through UPI. The app said the payment had failed, but the money was taken from my savings account. Here is my passbook and a screenshot of the payment. Could you please check what happened? How long will it take for the money to come back? And is there a reference number I can use if I need to follow up? Thank you very much for your help.",
                        checklist: ['I greeted the officer politely', 'I explained what went wrong', 'I gave the day and the amount', 'I asked what the bank will do', 'I asked how long it will take', 'I thanked the officer']
                    }
                }
            ]
        },
        '4:1': {
            name: 'Eating out',
            lessons: [
                {
                    kind: 'words', title: 'At the restaurant', list: [
                        { en: 'menu', kn: 'ಮೆನು', hi: 'मेन्यू', pic: '📖', def: 'a list of the food and drinks a restaurant serves, with prices' },
                        { en: 'waiter', kn: 'ಮಾಣಿ', hi: 'वेटर', pic: '🤵', def: 'a person who takes your order and serves food in a restaurant' },
                        { en: 'starter', kn: 'ಆರಂಭದ ತಿನಿಸು', hi: 'स्टार्टर', pic: '🥗', def: 'a small dish that you eat before the main part of a meal' },
                        { en: 'main course', kn: 'ಮುಖ್ಯ ಊಟ', hi: 'मुख्य भोजन', pic: '🍛', def: 'the largest and most important dish of a meal' },
                        { en: 'dessert', kn: 'ಸಿಹಿ ತಿನಿಸು', hi: 'मीठा', pic: '🍨', def: 'a sweet dish eaten at the end of a meal' },
                        { en: 'napkin', kn: 'ನ್ಯಾಪ್ಕಿನ್', hi: 'नैपकिन', pic: '🧻', def: 'a piece of cloth or paper for wiping your mouth and hands' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Eating out 1', list: [
                        { read: true, en: 'Excuse me, could we have the menu and some water, please?', kn: 'ಕ್ಷಮಿಸಿ, ದಯವಿಟ್ಟು ಮೆನು ಮತ್ತು ಸ್ವಲ್ಪ ನೀರು ಕೊಡುತ್ತೀರಾ?', hi: 'सुनिए, क्या हमें मेन्यू और थोड़ा पानी मिलेगा?' },
                        { read: true, en: 'The waiter recommended the neer dosa, so we ordered two plates.', kn: 'ನೀರ್ ದೋಸೆ ಚೆನ್ನಾಗಿದೆ ಅಂತ ಮಾಣಿ ಹೇಳಿದ, ಹಾಗಾಗಿ ಎರಡು ಪ್ಲೇಟ್ ತರಿಸಿದೆವು.', hi: 'वेटर ने नीर डोसा सुझाया, तो हमने दो प्लेट मँगवाईं।' },
                        { en: 'Shall we share a starter and then order our own main course?', kn: 'ಒಂದು ಆರಂಭದ ತಿನಿಸು ಹಂಚಿಕೊಂಡು, ಆಮೇಲೆ ಮುಖ್ಯ ಊಟ ಬೇರೆ ಬೇರೆ ಆರ್ಡರ್ ಮಾಡೋಣವಾ?', hi: 'एक स्टार्टर मिलकर खा लें और फिर अपना-अपना मुख्य भोजन मँगवाएँ?' },
                        { read: true, en: "I'm too full for dessert, but I'd love a filter coffee.", kn: 'ಸಿಹಿ ತಿನಿಸಿಗೆ ಹೊಟ್ಟೆಯಲ್ಲಿ ಜಾಗ ಇಲ್ಲ, ಆದರೆ ಒಂದು ಫಿಲ್ಟರ್ ಕಾಫಿ ಬೇಕು.', hi: 'पेट भर गया है, मीठे की जगह नहीं है, पर एक फ़िल्टर कॉफ़ी चलेगी।', acc: { en: ['I am too full for dessert, but I would love a filter coffee.'] } },
                        { en: 'Could you bring us some extra napkins and a small spoon for my son?', kn: 'ನಮಗೆ ಇನ್ನೂ ಸ್ವಲ್ಪ ನ್ಯಾಪ್ಕಿನ್ ಮತ್ತು ನನ್ನ ಮಗನಿಗೆ ಒಂದು ಚಿಕ್ಕ ಚಮಚ ತರುತ್ತೀರಾ?', hi: 'क्या आप हमें कुछ और नैपकिन और मेरे बेटे के लिए एक छोटा चम्मच ला देंगे?' }
                    ]
                },
                {
                    kind: 'words', title: 'Requests and paying', list: [
                        { en: 'ingredient', kn: 'ಸಾಮಗ್ರಿ', hi: 'सामग्री', pic: '🧂', def: 'one of the foods that a dish is made from' },
                        { en: 'vegetarian', kn: 'ಸಸ್ಯಾಹಾರಿ', hi: 'शाकाहारी', pic: '🥦', def: 'a person who does not eat meat, fish or eggs' },
                        { en: 'spicy', kn: 'ಖಾರ', hi: 'तीखा', pic: '🌶️', def: 'having a strong, hot taste from chillies' },
                        { en: 'takeaway', kn: 'ಪಾರ್ಸೆಲ್', hi: 'पार्सल', pic: '🥡', def: 'food you buy at a restaurant to eat somewhere else' },
                        { en: 'tip', kn: 'ಟಿಪ್ಸ್', hi: 'टिप', pic: '💵', def: 'extra money you give a waiter to thank them for good service' },
                        { en: 'portion', kn: 'ಊಟದ ಪ್ರಮಾಣ', hi: 'मात्रा', pic: '🥘', def: 'the amount of food served to one person' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Eating out 2', list: [
                        { read: true, en: 'I have a nut allergy, so could you check the ingredients in this curry?', kn: 'ನನಗೆ ಬೀಜಗಳ ಅಲರ್ಜಿ ಇದೆ, ಈ ಸಾರಿಗೆ ಏನೇನು ಸಾಮಗ್ರಿ ಹಾಕಿದ್ದೀರಿ ಅಂತ ನೋಡುತ್ತೀರಾ?', hi: 'मुझे मेवों से एलर्जी है, क्या आप इस करी की सामग्री देख लेंगे?' },
                        { read: true, en: "We're all vegetarian, so please make sure nothing has egg in it.", kn: 'ನಾವೆಲ್ಲಾ ಸಸ್ಯಾಹಾರಿಗಳು, ದಯವಿಟ್ಟು ಯಾವುದರಲ್ಲೂ ಮೊಟ್ಟೆ ಇರದಂತೆ ನೋಡಿಕೊಳ್ಳಿ.', hi: 'हम सब शाकाहारी हैं, कृपया ध्यान रखिए कि किसी चीज़ में अंडा न हो।', acc: { en: ['We are all vegetarian, so please make sure nothing has egg in it.'] } },
                        { read: true, en: "Could you make it less spicy? My son can't handle too much chilli.", kn: 'ಸ್ವಲ್ಪ ಕಡಿಮೆ ಖಾರ ಮಾಡುತ್ತೀರಾ? ನನ್ನ ಮಗನಿಗೆ ಹೆಚ್ಚು ಖಾರ ಆಗಲ್ಲ.', hi: 'थोड़ा कम तीखा बना देंगे? मेरा बेटा ज़्यादा मिर्च नहीं खा पाता।', acc: { en: ['Could you make it less spicy? My son cannot handle too much chilli.'] } },
                        { en: 'The portions here are huge, so could you pack the rest as a takeaway?', kn: 'ಇಲ್ಲಿ ಊಟದ ಪ್ರಮಾಣ ತುಂಬಾ ಜಾಸ್ತಿ, ಉಳಿದಿದ್ದನ್ನು ಪಾರ್ಸೆಲ್ ಮಾಡಿಕೊಡುತ್ತೀರಾ?', hi: 'यहाँ खाने की मात्रा बहुत ज़्यादा है, बचा हुआ पार्सल कर देंगे?' },
                        { en: "The bill already includes a service charge, so we don't need to leave a tip.", kn: 'ಬಿಲ್ಲಿನಲ್ಲೇ ಸೇವಾ ಶುಲ್ಕ ಸೇರಿದೆ, ಹಾಗಾಗಿ ಬೇರೆ ಟಿಪ್ಸ್ ಕೊಡುವ ಅಗತ್ಯವಿಲ್ಲ.', hi: 'बिल में सर्विस चार्ज पहले से जुड़ा है, इसलिए अलग से टिप देने की ज़रूरत नहीं।', acc: { en: ['The bill already includes a service charge, so we do not need to leave a tip.'] } }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A birthday dinner in Udupi', kn: 'ಉಡುಪಿಯಲ್ಲಿ ಹುಟ್ಟುಹಬ್ಬದ ಊಟ', hi: 'उडुपी में जन्मदिन का खाना' },
                    text: {
                        en: "For his grandmother's eightieth birthday, Kiran booked a table at a popular restaurant in Udupi. The waiter brought the menu and suggested paneer tikka as a starter. Kiran's cousin Nisha has a peanut allergy, so Kiran asked the waiter to check every dish carefully. His grandmother wanted her main course less spicy, and the cook happily agreed. For dessert, the whole family shared a huge gadbad ice cream. When the bill came, Kiran noticed that a service charge of five percent was already included. He still left a small tip, because the waiter had been so patient with them. They took the leftover rotis home as a takeaway.",
                        kn: 'ಅಜ್ಜಿಯ ಎಂಬತ್ತನೇ ಹುಟ್ಟುಹಬ್ಬಕ್ಕೆ ಕಿರಣ್ ಉಡುಪಿಯ ಒಂದು ಜನಪ್ರಿಯ ಹೋಟೆಲಿನಲ್ಲಿ ಟೇಬಲ್ ಬುಕ್ ಮಾಡಿದ. ಮಾಣಿ ಮೆನು ತಂದುಕೊಟ್ಟು, ಆರಂಭದ ತಿನಿಸಾಗಿ ಪನೀರ್ ಟಿಕ್ಕಾ ಸೂಚಿಸಿದ. ಕಿರಣನ ಸೋದರಮಾವನ ಮಗಳು ನಿಶಾಳಿಗೆ ಕಡಲೆಕಾಯಿ ಅಲರ್ಜಿ ಇದೆ, ಹಾಗಾಗಿ ಪ್ರತಿ ತಿನಿಸನ್ನೂ ಎಚ್ಚರಿಕೆಯಿಂದ ಪರಿಶೀಲಿಸಲು ಕಿರಣ್ ಮಾಣಿಗೆ ಹೇಳಿದ. ಅಜ್ಜಿಗೆ ಮುಖ್ಯ ಊಟ ಕಡಿಮೆ ಖಾರ ಬೇಕಿತ್ತು, ಅಡುಗೆಯವರು ಖುಷಿಯಿಂದ ಒಪ್ಪಿದರು. ಸಿಹಿ ತಿನಿಸಿಗೆ ಇಡೀ ಕುಟುಂಬ ಒಂದು ದೊಡ್ಡ ಗಡ್ಬಡ್ ಐಸ್ ಕ್ರೀಮ್ ಹಂಚಿಕೊಂಡಿತು. ಬಿಲ್ ಬಂದಾಗ, ಐದು ಪರ್ಸೆಂಟ್ ಸೇವಾ ಶುಲ್ಕ ಆಗಲೇ ಸೇರಿರುವುದನ್ನು ಕಿರಣ್ ಗಮನಿಸಿದ. ಮಾಣಿ ಅಷ್ಟು ತಾಳ್ಮೆಯಿಂದ ನೋಡಿಕೊಂಡಿದ್ದರಿಂದ ಅವನು ಆದರೂ ಸ್ವಲ್ಪ ಟಿಪ್ಸ್ ಕೊಟ್ಟ. ಉಳಿದ ರೊಟ್ಟಿಗಳನ್ನು ಅವರು ಪಾರ್ಸೆಲ್ ಮಾಡಿಸಿ ಮನೆಗೆ ತೆಗೆದುಕೊಂಡು ಹೋದರು.',
                        hi: 'अपनी दादी के अस्सीवें जन्मदिन पर किरण ने उडुपी के एक मशहूर रेस्टोरेंट में टेबल बुक की। वेटर मेन्यू लाया और स्टार्टर में पनीर टिक्का लेने की सलाह दी। किरण की ममेरी बहन निशा को मूँगफली से एलर्जी है, इसलिए किरण ने वेटर से हर व्यंजन ध्यान से जाँचने को कहा। दादी को अपना मुख्य भोजन कम तीखा चाहिए था, और रसोइये ने ख़ुशी से हामी भर दी। मीठे में पूरे परिवार ने मिलकर एक बड़ी गडबड आइसक्रीम खाई। बिल आया तो किरण ने देखा कि उसमें पाँच प्रतिशत सर्विस चार्ज पहले से जुड़ा था। फिर भी उसने थोड़ी टिप दी, क्योंकि वेटर ने बहुत धैर्य से उनका ध्यान रखा था। बची हुई रोटियाँ वे पार्सल करवाकर घर ले गए।'
                    },
                    questions: [
                        {
                            q: { en: 'Why did Kiran ask the waiter to check every dish?', kn: 'ಪ್ರತಿ ತಿನಿಸನ್ನೂ ಪರಿಶೀಲಿಸಲು ಕಿರಣ್ ಮಾಣಿಗೆ ಏಕೆ ಹೇಳಿದ?', hi: 'किरण ने वेटर से हर व्यंजन जाँचने को क्यों कहा?' },
                            options: [
                                { en: 'His cousin has a peanut allergy', kn: 'ಅವನ ಸೋದರಮಾವನ ಮಗಳಿಗೆ ಕಡಲೆಕಾಯಿ ಅಲರ್ಜಿ ಇದೆ', hi: 'उसकी ममेरी बहन को मूँगफली से एलर्जी है' },
                                { en: 'His grandmother is vegetarian', kn: 'ಅವನ ಅಜ್ಜಿ ಸಸ್ಯಾಹಾರಿ', hi: 'उसकी दादी शाकाहारी हैं' },
                                { en: 'The food was cold', kn: 'ಊಟ ತಣ್ಣಗಾಗಿತ್ತು', hi: 'खाना ठंडा था' },
                                { en: 'The menu had no prices', kn: 'ಮೆನುವಿನಲ್ಲಿ ಬೆಲೆ ಇರಲಿಲ್ಲ', hi: 'मेन्यू में दाम नहीं थे' }
                            ]
                        },
                        {
                            q: { en: 'What did the family share for dessert?', kn: 'ಸಿಹಿ ತಿನಿಸಿಗೆ ಕುಟುಂಬ ಏನನ್ನು ಹಂಚಿಕೊಂಡಿತು?', hi: 'मीठे में परिवार ने मिलकर क्या खाया?' },
                            options: [
                                { en: 'A gadbad ice cream', kn: 'ಗಡ್ಬಡ್ ಐಸ್ ಕ್ರೀಮ್', hi: 'गडबड आइसक्रीम' },
                                { en: 'Gulab jamun', kn: 'ಗುಲಾಬ್ ಜಾಮೂನ್', hi: 'गुलाब जामुन' },
                                { en: 'Payasa', kn: 'ಪಾಯಸ', hi: 'पायसम' },
                                { en: 'Fruit salad', kn: 'ಹಣ್ಣಿನ ಸಲಾಡ್', hi: 'फ्रूट सलाद' }
                            ]
                        },
                        {
                            q: { en: 'Why did Kiran still leave a tip?', kn: 'ಕಿರಣ್ ಆದರೂ ಟಿಪ್ಸ್ ಏಕೆ ಕೊಟ್ಟ?', hi: 'किरण ने फिर भी टिप क्यों दी?' },
                            options: [
                                { en: 'The waiter had been very patient', kn: 'ಮಾಣಿ ತುಂಬಾ ತಾಳ್ಮೆಯಿಂದ ಇದ್ದ', hi: 'वेटर ने बहुत धैर्य दिखाया था' },
                                { en: 'The bill was very small', kn: 'ಬಿಲ್ ತುಂಬಾ ಕಡಿಮೆ ಇತ್ತು', hi: 'बिल बहुत कम था' },
                                { en: 'There was no service charge', kn: 'ಸೇವಾ ಶುಲ್ಕ ಇರಲಿಲ್ಲ', hi: 'सर्विस चार्ज नहीं था' },
                                { en: 'His grandmother told him to', kn: 'ಅಜ್ಜಿ ಹೇಳಿದ್ದರು', hi: 'दादी ने कहा था' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Ordering dinner', kn: 'ರಾತ್ರಿ ಊಟದ ಆರ್ಡರ್', hi: 'रात के खाने का ऑर्डर' },
                    scenario: {
                        en: 'Ananya and a friend are at a restaurant in Pune. The waiter, Manoj, comes to take their order.',
                        kn: 'ಅನನ್ಯಾ ಮತ್ತು ಅವಳ ಸ್ನೇಹಿತೆ ಪುಣೆಯ ಒಂದು ಹೋಟೆಲಿನಲ್ಲಿದ್ದಾರೆ. ಮಾಣಿ ಮನೋಜ್ ಆರ್ಡರ್ ತೆಗೆದುಕೊಳ್ಳಲು ಬರುತ್ತಾನೆ.',
                        hi: 'अनन्या और उसकी एक सहेली पुणे के एक रेस्टोरेंट में हैं। वेटर मनोज उनका ऑर्डर लेने आता है।'
                    },
                    speakers: [{ name: 'Manoj', voice: 'm' }, { name: 'Ananya', voice: 'f' }],
                    lines: [
                        { speaker: 'Manoj', en: 'Good evening, madam. Are you ready to order, or do you need a few more minutes?', kn: 'ಶುಭ ಸಂಜೆ ಮೇಡಂ. ಆರ್ಡರ್ ಮಾಡುತ್ತೀರಾ, ಅಥವಾ ಇನ್ನೂ ಸ್ವಲ್ಪ ಸಮಯ ಬೇಕಾ?', hi: 'नमस्ते मैडम। क्या आप ऑर्डर करेंगी, या थोड़ा और समय चाहिए?' },
                        { speaker: 'Ananya', en: "I think we're ready. What's today's special?", kn: 'ನಾವು ರೆಡಿ ಅನಿಸುತ್ತೆ. ಇವತ್ತಿನ ವಿಶೇಷ ಏನು?', hi: 'हम तैयार हैं। आज का स्पेशल क्या है?' },
                        { speaker: 'Manoj', en: 'Today we have Malvani fish curry and a vegetarian thali.', kn: 'ಇವತ್ತು ಮಾಲ್ವಣಿ ಮೀನು ಸಾರು ಮತ್ತು ಸಸ್ಯಾಹಾರಿ ಥಾಲಿ ಇದೆ.', hi: 'आज मालवणी फ़िश करी और शाकाहारी थाली है।' },
                        { speaker: 'Ananya', en: 'One thali for my friend, please. Is the fish curry very spicy?', kn: 'ನನ್ನ ಸ್ನೇಹಿತೆಗೆ ಒಂದು ಥಾಲಿ ಕೊಡಿ. ಮೀನು ಸಾರು ತುಂಬಾ ಖಾರ ಇರುತ್ತಾ?', hi: 'मेरी सहेली के लिए एक थाली दीजिए। क्या फ़िश करी बहुत तीखी है?' },
                        { speaker: 'Manoj', en: "It's quite spicy, but the chef can make it milder if you like.", kn: 'ಸ್ವಲ್ಪ ಖಾರವೇ, ಆದರೆ ನಿಮಗೆ ಬೇಕಾದರೆ ಅಡುಗೆಯವರು ಕಡಿಮೆ ಖಾರ ಮಾಡುತ್ತಾರೆ.', hi: 'काफ़ी तीखी है, पर आप चाहें तो शेफ़ इसे कम तीखा बना सकते हैं।' },
                        { speaker: 'Ananya', en: 'Yes, please make it mild. Also, my friend has a nut allergy, so no cashews in the thali.', kn: 'ಹೌದು, ದಯವಿಟ್ಟು ಕಡಿಮೆ ಖಾರ ಮಾಡಿ. ಜೊತೆಗೆ ನನ್ನ ಸ್ನೇಹಿತೆಗೆ ಬೀಜಗಳ ಅಲರ್ಜಿ ಇದೆ, ಥಾಲಿಯಲ್ಲಿ ಗೋಡಂಬಿ ಹಾಕಬೇಡಿ.', hi: 'हाँ, कृपया कम तीखा बनवाइए। और मेरी सहेली को मेवों से एलर्जी है, तो थाली में काजू मत डालिए।' },
                        { speaker: 'Manoj', en: "Of course, I'll tell the kitchen. Anything to drink?", kn: 'ಖಂಡಿತ, ಅಡುಗೆಮನೆಗೆ ಹೇಳುತ್ತೇನೆ. ಕುಡಿಯಲು ಏನಾದರೂ?', hi: 'ज़रूर, मैं रसोई में बता दूँगा। पीने के लिए कुछ?' },
                        { speaker: 'Ananya', en: 'Two sweet lassis, please. And can we pay by UPI at the end?', kn: 'ಎರಡು ಸಿಹಿ ಲಸ್ಸಿ ಕೊಡಿ. ಕೊನೆಯಲ್ಲಿ ಯುಪಿಐ ಮೂಲಕ ಹಣ ಕೊಡಬಹುದಾ?', hi: 'दो मीठी लस्सी, प्लीज़। और क्या हम आख़िर में यूपीआई से पैसे दे सकते हैं?' },
                        { speaker: 'Manoj', en: "Certainly, we accept UPI and cards. I'll be back with your drinks shortly.", kn: 'ಖಂಡಿತ, ನಾವು ಯುಪಿಐ ಮತ್ತು ಕಾರ್ಡ್ ಎರಡನ್ನೂ ತೆಗೆದುಕೊಳ್ಳುತ್ತೇವೆ. ಸ್ವಲ್ಪ ಹೊತ್ತಿನಲ್ಲೇ ಲಸ್ಸಿ ತರುತ್ತೇನೆ.', hi: 'बिल्कुल, हम यूपीआई और कार्ड दोनों लेते हैं। मैं अभी आपकी लस्सी लेकर आता हूँ।' },
                        { speaker: 'Ananya', en: "Thank you, that's very kind.", kn: 'ಧನ್ಯವಾದ, ತುಂಬಾ ಒಳ್ಳೆಯದು.', hi: 'शुक्रिया, आपकी मेहरबानी।' }
                    ],
                    questions: [
                        {
                            q: { en: "What are today's specials?", kn: 'ಇವತ್ತಿನ ವಿಶೇಷ ತಿನಿಸುಗಳು ಯಾವುವು?', hi: 'आज के स्पेशल क्या हैं?' },
                            options: [
                                { en: 'Malvani fish curry and a vegetarian thali', kn: 'ಮಾಲ್ವಣಿ ಮೀನು ಸಾರು ಮತ್ತು ಸಸ್ಯಾಹಾರಿ ಥಾಲಿ', hi: 'मालवणी फ़िश करी और शाकाहारी थाली' },
                                { en: 'Chicken biryani and raita', kn: 'ಚಿಕನ್ ಬಿರಿಯಾನಿ ಮತ್ತು ರಾಯಿತ', hi: 'चिकन बिरयानी और रायता' },
                                { en: 'Masala dosa and coffee', kn: 'ಮಸಾಲೆ ದೋಸೆ ಮತ್ತು ಕಾಫಿ', hi: 'मसाला डोसा और कॉफ़ी' },
                                { en: 'Paneer tikka and naan', kn: 'ಪನೀರ್ ಟಿಕ್ಕಾ ಮತ್ತು ನಾನ್', hi: 'पनीर टिक्का और नान' }
                            ]
                        },
                        {
                            q: { en: 'What change does Ananya ask for in the fish curry?', kn: 'ಮೀನು ಸಾರಿನಲ್ಲಿ ಅನನ್ಯಾ ಯಾವ ಬದಲಾವಣೆ ಕೇಳುತ್ತಾಳೆ?', hi: 'अनन्या फ़िश करी में क्या बदलाव माँगती है?' },
                            options: [
                                { en: 'Make it less spicy', kn: 'ಕಡಿಮೆ ಖಾರ ಮಾಡಲು', hi: 'कम तीखा बनाना' },
                                { en: 'Add extra chilli', kn: 'ಇನ್ನಷ್ಟು ಮೆಣಸಿನಕಾಯಿ ಹಾಕಲು', hi: 'और मिर्च डालना' },
                                { en: 'Pack it as a takeaway', kn: 'ಪಾರ್ಸೆಲ್ ಮಾಡಲು', hi: 'पार्सल करना' },
                                { en: 'Serve it first', kn: 'ಮೊದಲು ಕೊಡಲು', hi: 'पहले परोसना' }
                            ]
                        },
                        {
                            q: { en: 'How do they want to pay?', kn: 'ಅವರು ಹೇಗೆ ಹಣ ಕೊಡಲು ಬಯಸುತ್ತಾರೆ?', hi: 'वे कैसे भुगतान करना चाहते हैं?' },
                            options: [
                                { en: 'By UPI', kn: 'ಯುಪಿಐ ಮೂಲಕ', hi: 'यूपीआई से' },
                                { en: 'In cash', kn: 'ನಗದಿನಲ್ಲಿ', hi: 'नकद' },
                                { en: 'By cheque', kn: 'ಚೆಕ್ ಮೂಲಕ', hi: 'चेक से' },
                                { en: 'With a coupon', kn: 'ಕೂಪನ್ ಮೂಲಕ', hi: 'कूपन से' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'You are at a restaurant with a friend. Order a starter and a main course, ask for one change to a dish (for example less spicy or no nuts), order drinks, and ask for the bill politely at the end.',
                        sample: "Good evening. Could we see the menu, please? Thank you. For a starter, we'd like one plate of gobi manchurian to share. For the main course, I'll have the vegetable biryani, and my friend would like two butter rotis with dal fry. Could you make the biryani less spicy, please? I can't eat too much chilli. And my friend has a peanut allergy, so please make sure there are no nuts in her food. Two glasses of fresh lime soda, please. Excuse me, could we have the bill, please? Can we pay by UPI?",
                        checklist: ['I asked for the menu politely', 'I ordered a starter and a main course', 'I asked for a change to a dish', 'I ordered drinks', 'I asked for the bill and how to pay']
                    }
                }
            ]
        },
        '5:1': {
            name: 'Hotels and stays',
            lessons: [
                {
                    kind: 'words', title: 'Booking a stay', list: [
                        { en: 'booking', kn: 'ಬುಕಿಂಗ್', hi: 'बुकिंग', pic: '📅', def: 'an arrangement to keep a room, seat or table for you' },
                        { en: 'availability', kn: 'ಲಭ್ಯತೆ', hi: 'उपलब्धता', pic: '✅', def: 'whether something, like a room, is free for you to use' },
                        { en: 'double room', kn: 'ಡಬಲ್ ರೂಮ್', hi: 'डबल रूम', pic: '🛏️', def: 'a hotel room with one big bed for two people' },
                        { en: 'check-in', kn: 'ಚೆಕ್-ಇನ್', hi: 'चेक-इन', pic: '🛎️', def: 'arriving at a hotel and giving your details at the desk' },
                        { en: 'check-out', kn: 'ಚೆಕ್-ಔಟ್', hi: 'चेक-आउट', pic: '🚪', def: 'paying and leaving a hotel at the end of your stay' },
                        { en: 'lobby', kn: 'ಲಾಬಿ', hi: 'लॉबी', pic: '🏨', def: 'the large hall near the entrance of a hotel' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Hotels and stays 1', list: [
                        { read: true, en: "I'd like to make a booking for two nights from the fifth of March.", kn: 'ಮಾರ್ಚ್ ಐದರಿಂದ ಎರಡು ರಾತ್ರಿಗೆ ಒಂದು ಬುಕಿಂಗ್ ಮಾಡಬೇಕಿತ್ತು.', hi: 'मुझे पाँच मार्च से दो रातों के लिए बुकिंग करनी है।', acc: { en: ['I would like to make a booking for two nights from the fifth of March.'] } },
                        { read: true, en: 'Could you check the availability of a double room for this weekend?', kn: 'ಈ ವಾರಾಂತ್ಯಕ್ಕೆ ಡಬಲ್ ರೂಮ್ ಲಭ್ಯವಿದೆಯೇ ಎಂದು ನೋಡುತ್ತೀರಾ?', hi: 'क्या आप इस वीकेंड के लिए डबल रूम की उपलब्धता देख लेंगे?' },
                        { en: 'Check-in is at noon, but you can leave your bags with us earlier.', kn: 'ಚೆಕ್-ಇನ್ ಮಧ್ಯಾಹ್ನ ಹನ್ನೆರಡಕ್ಕೆ, ಆದರೆ ಅದಕ್ಕೂ ಮೊದಲು ಬ್ಯಾಗುಗಳನ್ನು ನಮ್ಮ ಬಳಿ ಇಡಬಹುದು.', hi: 'चेक-इन दोपहर बारह बजे है, पर आप अपना सामान पहले ही हमारे पास रख सकते हैं।' },
                        { read: true, en: 'Is it possible to have a late check-out? Our train leaves at six.', kn: 'ಸ್ವಲ್ಪ ತಡವಾಗಿ ಚೆಕ್-ಔಟ್ ಮಾಡಬಹುದೇ? ನಮ್ಮ ರೈಲು ಆರು ಗಂಟೆಗೆ ಹೊರಡುತ್ತದೆ.', hi: 'क्या थोड़ा देर से चेक-आउट हो सकता है? हमारी ट्रेन छह बजे है।' },
                        { en: 'Your taxi driver is waiting for you in the lobby.', kn: 'ನಿಮ್ಮ ಟ್ಯಾಕ್ಸಿ ಚಾಲಕರು ಲಾಬಿಯಲ್ಲಿ ನಿಮಗಾಗಿ ಕಾಯುತ್ತಿದ್ದಾರೆ.', hi: 'आपका टैक्सी ड्राइवर लॉबी में आपका इंतज़ार कर रहा है।' }
                    ]
                },
                {
                    kind: 'words', title: 'During your stay', list: [
                        { en: 'towel', kn: 'ಟವೆಲ್', hi: 'तौलिया', pic: '🧖', def: 'a piece of thick cloth for drying your body' },
                        { en: 'pillow', kn: 'ದಿಂಬು', hi: 'तकिया', pic: '🛌', def: 'a soft cushion to rest your head on in bed' },
                        { en: 'air conditioner', kn: 'ಎಸಿ ಯಂತ್ರ', hi: 'एसी', pic: '❄️', def: 'a machine that keeps a room cool' },
                        { en: 'housekeeping', kn: 'ಸ್ವಚ್ಛತಾ ಸಿಬ್ಬಂದಿ', hi: 'हाउसकीपिंग', pic: '🧹', def: 'the hotel staff who clean the rooms and change the sheets' },
                        { en: 'noisy', kn: 'ಗದ್ದಲದ', hi: 'शोर भरा', pic: '🔊', def: 'full of loud and unpleasant sounds' },
                        { en: 'room service', kn: 'ರೂಮ್ ಸರ್ವೀಸ್', hi: 'रूम सर्विस', pic: '🍽️', def: 'food and drinks that a hotel brings to your room' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Hotels and stays 2', list: [
                        { read: true, en: 'Could you send up two fresh towels and an extra pillow, please?', kn: 'ದಯವಿಟ್ಟು ಎರಡು ಹೊಸ ಟವೆಲ್ ಮತ್ತು ಒಂದು ಹೆಚ್ಚುವರಿ ದಿಂಬು ಕಳುಹಿಸುತ್ತೀರಾ?', hi: 'क्या आप दो साफ़ तौलिये और एक और तकिया भिजवा देंगे?' },
                        { read: true, en: "I'm afraid the air conditioner in room 204 isn't working at all.", kn: 'ಕ್ಷಮಿಸಿ, 204ನೇ ಕೋಣೆಯ ಎಸಿ ಸ್ವಲ್ಪವೂ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ.', hi: 'माफ़ कीजिए, कमरा नंबर 204 का एसी बिल्कुल नहीं चल रहा।', acc: { en: ['I am afraid the air conditioner in room 204 is not working at all.'] } },
                        { en: "Housekeeping hasn't cleaned our room yet, and it's already three o'clock.", kn: 'ಸ್ವಚ್ಛತಾ ಸಿಬ್ಬಂದಿ ಇನ್ನೂ ನಮ್ಮ ಕೋಣೆ ಸ್ವಚ್ಛ ಮಾಡಿಲ್ಲ, ಈಗಾಗಲೇ ಮೂರು ಗಂಟೆ ಆಗಿದೆ.', hi: 'हाउसकीपिंग ने अभी तक हमारा कमरा साफ़ नहीं किया, और तीन बज चुके हैं।', acc: { en: ["Housekeeping has not cleaned our room yet, and it is already three o'clock."] } },
                        { read: true, en: "I don't want to make a complaint, but the room is very noisy.", kn: 'ದೂರು ಕೊಡಬೇಕು ಅಂತ ಅಲ್ಲ, ಆದರೆ ಕೋಣೆಯಲ್ಲಿ ತುಂಬಾ ಗದ್ದಲ ಕೇಳಿಸುತ್ತದೆ.', hi: 'मैं शिकायत नहीं करना चाहता, पर कमरे में बहुत शोर आता है।', acc: { en: ['I do not want to make a complaint, but the room is very noisy.'] } },
                        { en: 'Is room service available after eleven, or is the kitchen closed by then?', kn: 'ರಾತ್ರಿ ಹನ್ನೊಂದರ ನಂತರ ರೂಮ್ ಸರ್ವೀಸ್ ಸಿಗುತ್ತದೆಯೇ, ಅಥವಾ ಅಡುಗೆಮನೆ ಮುಚ್ಚಿರುತ್ತದೆಯೇ?', hi: 'क्या ग्यारह बजे के बाद रूम सर्विस मिलती है, या तब तक रसोई बंद हो जाती है?' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A noisy night in Madikeri', kn: 'ಮಡಿಕೇರಿಯಲ್ಲಿ ಗದ್ದಲದ ರಾತ್ರಿ', hi: 'मडिकेरी में एक शोर भरी रात' },
                    text: {
                        en: 'Nikhil and his wife Shreya made a booking at a small hotel in Madikeri for a long weekend. At check-in, the receptionist gave them a double room on the ground floor. That night, the air conditioner made a loud rattling noise, and the room was too warm to sleep in. Nikhil called the front desk and politely made a complaint. The manager apologised and moved them to a quieter room upstairs with a view of the hills. The next morning, housekeeping brought fresh towels and extra pillows without being asked. At check-out, the manager offered them a free breakfast to make up for the trouble.',
                        kn: 'ನಿಖಿಲ್ ಮತ್ತು ಅವನ ಹೆಂಡತಿ ಶ್ರೇಯಾ ವಾರಾಂತ್ಯದ ರಜೆಗಾಗಿ ಮಡಿಕೇರಿಯ ಒಂದು ಸಣ್ಣ ಹೋಟೆಲಿನಲ್ಲಿ ಬುಕಿಂಗ್ ಮಾಡಿದರು. ಚೆಕ್-ಇನ್ ಸಮಯದಲ್ಲಿ ಸ್ವಾಗತಕಾರರು ಅವರಿಗೆ ನೆಲಮಹಡಿಯಲ್ಲಿ ಒಂದು ಡಬಲ್ ರೂಮ್ ಕೊಟ್ಟರು. ಆ ರಾತ್ರಿ ಎಸಿ ಜೋರಾಗಿ ಗಡಗಡ ಶಬ್ದ ಮಾಡುತ್ತಿತ್ತು, ಕೋಣೆ ನಿದ್ದೆ ಮಾಡಲಾಗದಷ್ಟು ಬಿಸಿಯಾಗಿತ್ತು. ನಿಖಿಲ್ ಸ್ವಾಗತ ಕೌಂಟರಿಗೆ ಕರೆ ಮಾಡಿ ವಿನಯದಿಂದ ದೂರು ಕೊಟ್ಟ. ಮ್ಯಾನೇಜರ್ ಕ್ಷಮೆ ಕೇಳಿ, ಮೇಲಿನ ಮಹಡಿಯಲ್ಲಿ ಬೆಟ್ಟಗಳು ಕಾಣುವ ಶಾಂತವಾದ ಕೋಣೆಗೆ ಅವರನ್ನು ಸ್ಥಳಾಂತರಿಸಿದರು. ಮರುದಿನ ಬೆಳಿಗ್ಗೆ ಕೇಳದೆಯೇ ಸ್ವಚ್ಛತಾ ಸಿಬ್ಬಂದಿ ಹೊಸ ಟವೆಲುಗಳು ಮತ್ತು ಹೆಚ್ಚುವರಿ ದಿಂಬುಗಳನ್ನು ತಂದರು. ಚೆಕ್-ಔಟ್ ಸಮಯದಲ್ಲಿ ಆದ ತೊಂದರೆಗಾಗಿ ಮ್ಯಾನೇಜರ್ ಅವರಿಗೆ ಉಚಿತ ಉಪಾಹಾರ ಕೊಟ್ಟರು.',
                        hi: 'निखिल और उसकी पत्नी श्रेया ने लंबे वीकेंड के लिए मडिकेरी के एक छोटे होटल में बुकिंग की। चेक-इन के समय रिसेप्शनिस्ट ने उन्हें भूतल पर एक डबल रूम दिया। उस रात एसी ज़ोर-ज़ोर से खड़खड़ाता रहा, और कमरा इतना गरम था कि नींद नहीं आई। निखिल ने रिसेप्शन पर फ़ोन किया और विनम्रता से शिकायत की। मैनेजर ने माफ़ी माँगी और उन्हें ऊपर की मंज़िल पर एक शांत कमरे में भेज दिया, जहाँ से पहाड़ दिखते थे। अगली सुबह हाउसकीपिंग वाले बिना कहे साफ़ तौलिये और अतिरिक्त तकिये ले आए। चेक-आउट के समय मैनेजर ने परेशानी की भरपाई के लिए उन्हें मुफ़्त नाश्ता दिया।'
                    },
                    questions: [
                        {
                            q: { en: 'What was wrong with the first room?', kn: 'ಮೊದಲ ಕೋಣೆಯಲ್ಲಿ ಏನು ತೊಂದರೆ ಇತ್ತು?', hi: 'पहले कमरे में क्या दिक़्क़त थी?' },
                            options: [
                                { en: 'The air conditioner was noisy', kn: 'ಎಸಿ ಜೋರಾಗಿ ಶಬ್ದ ಮಾಡುತ್ತಿತ್ತು', hi: 'एसी बहुत शोर करता था' },
                                { en: 'There were no towels', kn: 'ಟವೆಲ್ ಇರಲಿಲ್ಲ', hi: 'तौलिये नहीं थे' },
                                { en: 'The bed was broken', kn: 'ಹಾಸಿಗೆ ಮುರಿದಿತ್ತು', hi: 'बिस्तर टूटा हुआ था' },
                                { en: 'The door would not lock', kn: 'ಬಾಗಿಲಿಗೆ ಬೀಗ ಬೀಳುತ್ತಿರಲಿಲ್ಲ', hi: 'दरवाज़ा बंद नहीं होता था' }
                            ]
                        },
                        {
                            q: { en: 'What did the manager do about the complaint?', kn: 'ದೂರಿನ ಬಗ್ಗೆ ಮ್ಯಾನೇಜರ್ ಏನು ಮಾಡಿದರು?', hi: 'शिकायत पर मैनेजर ने क्या किया?' },
                            options: [
                                { en: 'Moved them to a quieter room', kn: 'ಶಾಂತವಾದ ಕೋಣೆಗೆ ಸ್ಥಳಾಂತರಿಸಿದರು', hi: 'उन्हें शांत कमरे में भेजा' },
                                { en: 'Gave them a full refund', kn: 'ಪೂರ್ತಿ ಹಣ ವಾಪಸ್ ಕೊಟ್ಟರು', hi: 'पूरे पैसे लौटा दिए' },
                                { en: 'Asked them to leave', kn: 'ಹೋಟೆಲ್ ಬಿಡಲು ಹೇಳಿದರು', hi: 'होटल छोड़ने को कहा' },
                                { en: 'Sent a mechanic the next week', kn: 'ಮುಂದಿನ ವಾರ ಮೆಕ್ಯಾನಿಕ್ ಕಳುಹಿಸಿದರು', hi: 'अगले हफ़्ते मिस्त्री भेजा' }
                            ]
                        },
                        {
                            q: { en: 'What did they get at check-out?', kn: 'ಚೆಕ್-ಔಟ್ ಸಮಯದಲ್ಲಿ ಅವರಿಗೆ ಏನು ಸಿಕ್ಕಿತು?', hi: 'चेक-आउट के समय उन्हें क्या मिला?' },
                            options: [
                                { en: 'A free breakfast', kn: 'ಉಚಿತ ಉಪಾಹಾರ', hi: 'मुफ़्त नाश्ता' },
                                { en: 'A free taxi ride', kn: 'ಉಚಿತ ಟ್ಯಾಕ್ಸಿ ಪ್ರಯಾಣ', hi: 'मुफ़्त टैक्सी' },
                                { en: 'A box of coffee powder', kn: 'ಕಾಫಿ ಪುಡಿಯ ಡಬ್ಬ', hi: 'कॉफ़ी पाउडर का डिब्बा' },
                                { en: 'A late check-out', kn: 'ತಡವಾದ ಚೆಕ್-ಔಟ್', hi: 'देर से चेक-आउट' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Checking in', kn: 'ಹೋಟೆಲಿಗೆ ಚೆಕ್-ಇನ್', hi: 'होटल में चेक-इन' },
                    scenario: {
                        en: 'Rahul arrives at a hotel in Hubballi in the evening, and Farah at the front desk checks him in.',
                        kn: 'ರಾಹುಲ್ ಸಂಜೆ ಹುಬ್ಬಳ್ಳಿಯ ಒಂದು ಹೋಟೆಲಿಗೆ ಬರುತ್ತಾನೆ; ಸ್ವಾಗತ ಕೌಂಟರಿನಲ್ಲಿರುವ ಫರಾ ಅವನ ಚೆಕ್-ಇನ್ ಮಾಡುತ್ತಾಳೆ.',
                        hi: 'राहुल शाम को हुब्बल्ली के एक होटल पहुँचता है, और रिसेप्शन पर फ़रहा उसका चेक-इन करती है।'
                    },
                    speakers: [{ name: 'Farah', voice: 'f' }, { name: 'Rahul', voice: 'm' }],
                    lines: [
                        { speaker: 'Farah', en: 'Good evening, sir, and welcome to Hotel Sangam. Do you have a booking with us?', kn: 'ಶುಭ ಸಂಜೆ ಸರ್, ಹೋಟೆಲ್ ಸಂಗಮಕ್ಕೆ ಸ್ವಾಗತ. ನಮ್ಮಲ್ಲಿ ನಿಮ್ಮ ಬುಕಿಂಗ್ ಇದೆಯೇ?', hi: 'नमस्ते सर, होटल संगम में आपका स्वागत है। क्या आपकी हमारे यहाँ बुकिंग है?' },
                        { speaker: 'Rahul', en: "Yes, it's under the name Rahul Joshi, for three nights.", kn: 'ಹೌದು, ರಾಹುಲ್ ಜೋಶಿ ಹೆಸರಿನಲ್ಲಿ, ಮೂರು ರಾತ್ರಿಗೆ.', hi: 'जी हाँ, राहुल जोशी के नाम से, तीन रातों के लिए।' },
                        { speaker: 'Farah', en: 'Yes, I can see it: a double room until Friday. May I see a photo ID, please?', kn: 'ಹೌದು, ಕಾಣುತ್ತಿದೆ: ಶುಕ್ರವಾರದವರೆಗೆ ಡಬಲ್ ರೂಮ್. ದಯವಿಟ್ಟು ಫೋಟೋ ಇರುವ ಗುರುತಿನ ಚೀಟಿ ತೋರಿಸುತ್ತೀರಾ?', hi: 'जी, दिख रही है: शुक्रवार तक एक डबल रूम। क्या मैं आपका फ़ोटो पहचान पत्र देख सकती हूँ?' },
                        { speaker: 'Rahul', en: "Here's my Aadhaar card. Is breakfast included in the rate?", kn: 'ಇದೋ ನನ್ನ ಆಧಾರ್ ಕಾರ್ಡ್. ಬಾಡಿಗೆಯಲ್ಲಿ ಉಪಾಹಾರ ಸೇರಿದೆಯೇ?', hi: 'यह रहा मेरा आधार कार्ड। क्या किराये में नाश्ता शामिल है?' },
                        { speaker: 'Farah', en: 'It is. Breakfast is served in the restaurant from seven to ten.', kn: 'ಹೌದು. ರೆಸ್ಟೋರೆಂಟಿನಲ್ಲಿ ಏಳರಿಂದ ಹತ್ತು ಗಂಟೆಯವರೆಗೆ ಉಪಾಹಾರ ಸಿಗುತ್ತದೆ.', hi: 'जी हाँ। नाश्ता रेस्टोरेंट में सात से दस बजे तक मिलता है।' },
                        { speaker: 'Rahul', en: "Great. Could I possibly have a room away from the lift? I'm a light sleeper.", kn: 'ಒಳ್ಳೆಯದು. ಲಿಫ್ಟಿನಿಂದ ದೂರದ ಕೋಣೆ ಸಿಗಬಹುದೇ? ನನಗೆ ಸಣ್ಣ ಶಬ್ದಕ್ಕೂ ಎಚ್ಚರವಾಗುತ್ತದೆ.', hi: 'बढ़िया। क्या मुझे लिफ़्ट से दूर कोई कमरा मिल सकता है? मेरी नींद बहुत कच्ची है।' },
                        { speaker: 'Farah', en: "Of course. I'll give you room 312, at the quiet end of the corridor.", kn: 'ಖಂಡಿತ. ಕಾರಿಡಾರಿನ ಶಾಂತವಾದ ಕೊನೆಯಲ್ಲಿರುವ 312ನೇ ಕೋಣೆ ಕೊಡುತ್ತೇನೆ.', hi: 'ज़रूर। मैं आपको गलियारे के शांत छोर वाला कमरा 312 दे देती हूँ।' },
                        { speaker: 'Rahul', en: 'Thank you. And what time is check-out on Friday?', kn: 'ಧನ್ಯವಾದ. ಶುಕ್ರವಾರ ಚೆಕ್-ಔಟ್ ಎಷ್ಟು ಗಂಟೆಗೆ?', hi: 'शुक्रिया। और शुक्रवार को चेक-आउट कितने बजे है?' },
                        { speaker: 'Farah', en: 'Check-out is at eleven, but let us know if you need a little extra time.', kn: 'ಚೆಕ್-ಔಟ್ ಹನ್ನೊಂದು ಗಂಟೆಗೆ, ಆದರೆ ಸ್ವಲ್ಪ ಹೆಚ್ಚು ಸಮಯ ಬೇಕಾದರೆ ತಿಳಿಸಿ.', hi: 'चेक-आउट ग्यारह बजे है, पर थोड़ा ज़्यादा समय चाहिए तो बता दीजिएगा।' },
                        { speaker: 'Rahul', en: "That's very helpful. Thanks so much.", kn: 'ತುಂಬಾ ಉಪಕಾರವಾಯಿತು. ಧನ್ಯವಾದಗಳು.', hi: 'यह तो बहुत अच्छा है। बहुत-बहुत शुक्रिया।' }
                    ],
                    questions: [
                        {
                            q: { en: 'How many nights is Rahul staying?', kn: 'ರಾಹುಲ್ ಎಷ್ಟು ರಾತ್ರಿ ಉಳಿಯುತ್ತಾನೆ?', hi: 'राहुल कितनी रातें रुकेगा?' },
                            options: [
                                { en: 'Three', kn: 'ಮೂರು', hi: 'तीन' },
                                { en: 'One', kn: 'ಒಂದು', hi: 'एक' },
                                { en: 'Two', kn: 'ಎರಡು', hi: 'दो' },
                                { en: 'Five', kn: 'ಐದು', hi: 'पाँच' }
                            ]
                        },
                        {
                            q: { en: 'Why does Rahul want a room away from the lift?', kn: 'ರಾಹುಲನಿಗೆ ಲಿಫ್ಟಿನಿಂದ ದೂರದ ಕೋಣೆ ಏಕೆ ಬೇಕು?', hi: 'राहुल को लिफ़्ट से दूर कमरा क्यों चाहिए?' },
                            options: [
                                { en: 'He is a light sleeper', kn: 'ಸಣ್ಣ ಶಬ್ದಕ್ಕೂ ಅವನಿಗೆ ಎಚ್ಚರವಾಗುತ್ತದೆ', hi: 'उसकी नींद कच्ची है' },
                                { en: 'He is afraid of lifts', kn: 'ಅವನಿಗೆ ಲಿಫ್ಟ್ ಎಂದರೆ ಭಯ', hi: 'उसे लिफ़्ट से डर लगता है' },
                                { en: 'He wants a view of the city', kn: 'ಅವನಿಗೆ ನಗರದ ನೋಟ ಬೇಕು', hi: 'उसे शहर का नज़ारा चाहिए' },
                                { en: 'He has a lot of luggage', kn: 'ಅವನ ಬಳಿ ತುಂಬಾ ಸಾಮಾನು ಇದೆ', hi: 'उसके पास बहुत सामान है' }
                            ]
                        },
                        {
                            q: { en: 'What time is check-out?', kn: 'ಚೆಕ್-ಔಟ್ ಎಷ್ಟು ಗಂಟೆಗೆ?', hi: 'चेक-आउट कितने बजे है?' },
                            options: [
                                { en: "At eleven o'clock", kn: 'ಹನ್ನೊಂದು ಗಂಟೆಗೆ', hi: 'ग्यारह बजे' },
                                { en: "At seven o'clock", kn: 'ಏಳು ಗಂಟೆಗೆ', hi: 'सात बजे' },
                                { en: "At ten o'clock", kn: 'ಹತ್ತು ಗಂಟೆಗೆ', hi: 'दस बजे' },
                                { en: 'At noon', kn: 'ಮಧ್ಯಾಹ್ನ ಹನ್ನೆರಡಕ್ಕೆ', hi: 'दोपहर बारह बजे' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Call the hotel reception and ask to change your room: say what is wrong, ask for a different room, and agree a time to move.',
                        sample: "Hello, is this reception? This is Meghana Rao in room 108. I'm sorry to trouble you, but there's a problem with my room. The air conditioner is making a loud noise, and the bathroom tap keeps dripping, so I couldn't sleep at all last night. Would it be possible to move me to a different room, preferably on a higher floor? I'm going out for a meeting now, so could I move at around six this evening? Could housekeeping also send two fresh towels to the new room? Thank you very much for your help.",
                        checklist: ['I said who I am and gave my room number', 'I explained politely what is wrong', 'I asked for a different room', 'I agreed a time to move', 'I thanked the receptionist']
                    }
                }
            ]
        },
        '6:1': {
            name: 'Tickets and journeys',
            lessons: [
                {
                    kind: 'words', title: 'Booking a journey', list: [
                        { en: 'platform', kn: 'ಪ್ಲಾಟ್ಫಾರ್ಮ್', hi: 'प्लेटफ़ॉर्म', pic: '🚉', def: 'the raised area beside the track where you get on a train' },
                        { en: 'berth', kn: 'ಬರ್ತ್', hi: 'बर्थ', pic: '💺', def: 'a bed or sleeping seat on a train or bus' },
                        { en: 'waiting list', kn: 'ವೇಟಿಂಗ್ ಲಿಸ್ಟ್', hi: 'वेटिंग लिस्ट', pic: '⏳', def: 'a list of people who get a seat only if someone cancels' },
                        { en: 'reservation', kn: 'ರಿಸರ್ವೇಶನ್', hi: 'आरक्षण', pic: '🎫', def: 'a seat on a train or bus that is kept for you in advance' },
                        { en: 'fare', kn: 'ಪ್ರಯಾಣ ದರ', hi: 'किराया', pic: '💸', def: 'the money you pay for a journey' },
                        { en: 'coach', kn: 'ಬೋಗಿ', hi: 'डिब्बा', pic: '🚃', def: 'one of the separate carriages of a train' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Tickets and journeys 1', list: [
                        { read: true, en: 'Which platform does the Chalukya Express leave from?', kn: 'ಚಾಲುಕ್ಯ ಎಕ್ಸ್ಪ್ರೆಸ್ ಯಾವ ಪ್ಲಾಟ್ಫಾರ್ಮಿನಿಂದ ಹೊರಡುತ್ತದೆ?', hi: 'चालुक्य एक्सप्रेस किस प्लेटफ़ॉर्म से छूटती है?' },
                        { read: true, en: "I'd prefer a lower berth, as my father finds it hard to climb.", kn: 'ನನಗೆ ಕೆಳಗಿನ ಬರ್ತ್ ಬೇಕು, ನನ್ನ ತಂದೆಗೆ ಮೇಲೆ ಹತ್ತಲು ಕಷ್ಟ.', hi: 'मुझे नीचे वाली बर्थ चाहिए, मेरे पिताजी को ऊपर चढ़ने में दिक़्क़त होती है।', acc: { en: ['I would prefer a lower berth, as my father finds it hard to climb.'] } },
                        { en: 'Our tickets are still on the waiting list, so we might not get seats.', kn: 'ನಮ್ಮ ಟಿಕೆಟ್ ಇನ್ನೂ ವೇಟಿಂಗ್ ಲಿಸ್ಟಿನಲ್ಲಿದೆ, ಸೀಟು ಸಿಗದೆಯೂ ಇರಬಹುದು.', hi: 'हमारे टिकट अभी वेटिंग लिस्ट में हैं, शायद सीट न मिले।' },
                        { read: true, en: 'You should make a reservation at least a month before Diwali.', kn: 'ದೀಪಾವಳಿಗೆ ಕನಿಷ್ಠ ಒಂದು ತಿಂಗಳ ಮೊದಲು ರಿಸರ್ವೇಶನ್ ಮಾಡಿಸಬೇಕು.', hi: 'दिवाली से कम से कम एक महीना पहले आरक्षण करा लेना चाहिए।' },
                        { en: 'The fare for a sleeper coach to Pune is about six hundred rupees.', kn: 'ಪುಣೆಗೆ ಸ್ಲೀಪರ್ ಬೋಗಿಯ ಪ್ರಯಾಣ ದರ ಸುಮಾರು ಆರುನೂರು ರೂಪಾಯಿ.', hi: 'पुणे तक स्लीपर डिब्बे का किराया लगभग छह सौ रुपये है।' }
                    ]
                },
                {
                    kind: 'words', title: 'Delays and refunds', list: [
                        { en: 'delay', kn: 'ವಿಳಂಬ', hi: 'देरी', pic: '🐢', def: 'a time when something happens later than planned' },
                        { en: 'cancellation', kn: 'ರದ್ದತಿ', hi: 'रद्दीकरण', pic: '🚫', def: 'the calling off of a booking, a ticket or a trip' },
                        { en: 'enquiry', kn: 'ವಿಚಾರಣೆ', hi: 'पूछताछ', pic: '❓', def: 'a question you ask to get information, for example at a station' },
                        { en: 'luggage', kn: 'ಲಗೇಜು', hi: 'सामान', pic: '🧳', def: 'the bags and cases you take with you when you travel' },
                        { en: 'timetable', kn: 'ವೇಳಾಪಟ್ಟಿ', hi: 'समय-सारणी', pic: '🗓️', def: 'a list showing when trains or buses arrive and leave' },
                        { en: 'porter', kn: 'ಕೂಲಿ', hi: 'कुली', pic: '💪', def: 'a person paid to carry bags at a station' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Tickets and journeys 2', list: [
                        { read: true, en: "There's a delay of four hours because of heavy fog near Delhi.", kn: 'ದೆಹಲಿ ಹತ್ತಿರ ದಟ್ಟ ಮಂಜಿನಿಂದಾಗಿ ನಾಲ್ಕು ಗಂಟೆ ವಿಳಂಬವಾಗಿದೆ.', hi: 'दिल्ली के पास घने कोहरे की वजह से चार घंटे की देरी है।', acc: { en: ['There is a delay of four hours because of heavy fog near Delhi.'] } },
                        { en: 'If you cancel more than two days before, the cancellation charge is small.', kn: 'ಎರಡು ದಿನಕ್ಕಿಂತ ಮೊದಲೇ ರದ್ದು ಮಾಡಿದರೆ ರದ್ದತಿ ಶುಲ್ಕ ಕಡಿಮೆ.', hi: 'दो दिन से पहले रद्द करें तो रद्दीकरण शुल्क कम लगता है।' },
                        { read: true, en: 'The bus was cancelled, so I went to the enquiry counter to ask for a refund.', kn: 'ಬಸ್ ರದ್ದಾಯಿತು, ಹಾಗಾಗಿ ಮರುಪಾವತಿ ಕೇಳಲು ವಿಚಾರಣಾ ಕೌಂಟರಿಗೆ ಹೋದೆ.', hi: 'बस रद्द हो गई, इसलिए मैं रिफ़ंड माँगने पूछताछ काउंटर पर गया।' },
                        { read: true, en: 'Did you catch that announcement? We need to carry our luggage to platform five.', kn: 'ಆ ಪ್ರಕಟಣೆ ಕೇಳಿಸಿತಾ? ನಮ್ಮ ಲಗೇಜನ್ನು ಐದನೇ ಪ್ಲಾಟ್ಫಾರ್ಮಿಗೆ ಹೊತ್ತುಕೊಂಡು ಹೋಗಬೇಕು.', hi: 'वह घोषणा सुनी आपने? हमें अपना सामान प्लेटफ़ॉर्म पाँच तक ले जाना होगा।' },
                        { en: 'According to the timetable, the last bus to Mysuru leaves at ten.', kn: 'ವೇಳಾಪಟ್ಟಿಯ ಪ್ರಕಾರ ಮೈಸೂರಿಗೆ ಕೊನೆಯ ಬಸ್ ಹತ್ತು ಗಂಟೆಗೆ ಹೊರಡುತ್ತದೆ.', hi: 'समय-सारणी के अनुसार मैसूरु की आख़िरी बस दस बजे छूटती है।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'Just in time', kn: 'ಸರಿಯಾದ ಸಮಯಕ್ಕೆ', hi: 'ठीक समय पर' },
                    text: {
                        en: "Asha was travelling from Hubballi to Pune for her sister's wedding. She had made her reservation two months earlier and had a lower berth in coach S4. At the station, an announcement said that there was a delay of three hours. Asha checked the bus timetable on her phone and found a bus that would reach Pune sooner. She cancelled her train ticket online, and the refund reached her account in two days. A porter carried her heavy bags to the bus stand for a small fee. She reached Pune just in time for the mehendi.",
                        kn: 'ಆಶಾ ತನ್ನ ತಂಗಿಯ ಮದುವೆಗಾಗಿ ಹುಬ್ಬಳ್ಳಿಯಿಂದ ಪುಣೆಗೆ ಹೊರಟಿದ್ದಳು. ಎರಡು ತಿಂಗಳ ಹಿಂದೆಯೇ ರಿಸರ್ವೇಶನ್ ಮಾಡಿಸಿದ್ದಳು, ಎಸ್4 ಬೋಗಿಯಲ್ಲಿ ಕೆಳಗಿನ ಬರ್ತ್ ಸಿಕ್ಕಿತ್ತು. ನಿಲ್ದಾಣದಲ್ಲಿ, ರೈಲು ಮೂರು ಗಂಟೆ ವಿಳಂಬವಾಗಿದೆ ಎಂದು ಪ್ರಕಟಣೆ ಬಂತು. ಆಶಾ ಫೋನಿನಲ್ಲಿ ಬಸ್ ವೇಳಾಪಟ್ಟಿ ನೋಡಿ, ಬೇಗ ಪುಣೆ ತಲುಪುವ ಒಂದು ಬಸ್ ಹುಡುಕಿದಳು. ಅವಳು ಆನ್ಲೈನಿನಲ್ಲಿ ರೈಲು ಟಿಕೆಟ್ ರದ್ದು ಮಾಡಿದಳು, ಎರಡು ದಿನಗಳಲ್ಲಿ ಮರುಪಾವತಿ ಅವಳ ಖಾತೆಗೆ ಬಂತು. ಒಬ್ಬ ಕೂಲಿ ಸ್ವಲ್ಪ ಹಣಕ್ಕೆ ಅವಳ ಭಾರವಾದ ಬ್ಯಾಗುಗಳನ್ನು ಬಸ್ ನಿಲ್ದಾಣಕ್ಕೆ ಹೊತ್ತು ತಂದ. ಮೆಹಂದಿ ಶಾಸ್ತ್ರಕ್ಕೆ ಸರಿಯಾದ ಸಮಯಕ್ಕೆ ಅವಳು ಪುಣೆ ತಲುಪಿದಳು.',
                        hi: 'आशा अपनी बहन की शादी के लिए हुब्बल्ली से पुणे जा रही थी। उसने दो महीने पहले ही आरक्षण करा लिया था और उसे एस4 डिब्बे में नीचे वाली बर्थ मिली थी। स्टेशन पर घोषणा हुई कि ट्रेन में तीन घंटे की देरी है। आशा ने फ़ोन पर बसों की समय-सारणी देखी और एक ऐसी बस ढूँढी जो पुणे जल्दी पहुँचती। उसने ऑनलाइन ट्रेन का टिकट रद्द किया, और दो दिन में रिफ़ंड उसके खाते में आ गया। एक कुली थोड़े पैसों में उसके भारी बैग बस अड्डे तक ले गया। वह ठीक मेहँदी के समय पुणे पहुँच गई।'
                    },
                    questions: [
                        {
                            q: { en: 'Why was Asha going to Pune?', kn: 'ಆಶಾ ಪುಣೆಗೆ ಏಕೆ ಹೊರಟಿದ್ದಳು?', hi: 'आशा पुणे क्यों जा रही थी?' },
                            options: [
                                { en: "For her sister's wedding", kn: 'ತಂಗಿಯ ಮದುವೆಗಾಗಿ', hi: 'बहन की शादी के लिए' },
                                { en: 'For a job interview', kn: 'ಉದ್ಯೋಗ ಸಂದರ್ಶನಕ್ಕಾಗಿ', hi: 'नौकरी के इंटरव्यू के लिए' },
                                { en: 'For a college trip', kn: 'ಕಾಲೇಜು ಪ್ರವಾಸಕ್ಕಾಗಿ', hi: 'कॉलेज ट्रिप के लिए' },
                                { en: 'To visit a doctor', kn: 'ವೈದ್ಯರನ್ನು ನೋಡಲು', hi: 'डॉक्टर को दिखाने' }
                            ]
                        },
                        {
                            q: { en: 'How long was the delay?', kn: 'ವಿಳಂಬ ಎಷ್ಟು ಹೊತ್ತು?', hi: 'कितनी देरी थी?' },
                            options: [
                                { en: 'Three hours', kn: 'ಮೂರು ಗಂಟೆ', hi: 'तीन घंटे' },
                                { en: 'Thirty minutes', kn: 'ಮೂವತ್ತು ನಿಮಿಷ', hi: 'तीस मिनट' },
                                { en: 'One hour', kn: 'ಒಂದು ಗಂಟೆ', hi: 'एक घंटा' },
                                { en: 'A whole day', kn: 'ಇಡೀ ದಿನ', hi: 'पूरा दिन' }
                            ]
                        },
                        {
                            q: { en: 'How did Asha finally travel to Pune?', kn: 'ಕೊನೆಗೆ ಆಶಾ ಪುಣೆಗೆ ಹೇಗೆ ಹೋದಳು?', hi: 'आख़िर में आशा पुणे कैसे गई?' },
                            options: [
                                { en: 'By bus', kn: 'ಬಸ್ಸಿನಲ್ಲಿ', hi: 'बस से' },
                                { en: 'By a later train', kn: 'ನಂತರದ ರೈಲಿನಲ್ಲಿ', hi: 'बाद वाली ट्रेन से' },
                                { en: 'By plane', kn: 'ವಿಮಾನದಲ್ಲಿ', hi: 'हवाई जहाज़ से' },
                                { en: 'By taxi', kn: 'ಟ್ಯಾಕ್ಸಿಯಲ್ಲಿ', hi: 'टैक्सी से' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'A cancelled train', kn: 'ರದ್ದಾದ ರೈಲು', hi: 'रद्द हुई ट्रेन' },
                    scenario: {
                        en: 'At Mysuru railway station, Kavita finds out that her train to Bengaluru is cancelled and asks Suresh at the enquiry counter for help.',
                        kn: 'ಮೈಸೂರು ರೈಲು ನಿಲ್ದಾಣದಲ್ಲಿ ತನ್ನ ಬೆಂಗಳೂರು ರೈಲು ರದ್ದಾಗಿದೆ ಎಂದು ಕವಿತಾಳಿಗೆ ತಿಳಿಯುತ್ತದೆ; ಅವಳು ವಿಚಾರಣಾ ಕೌಂಟರಿನ ಸುರೇಶ್ ಅವರ ಸಹಾಯ ಕೇಳುತ್ತಾಳೆ.',
                        hi: 'मैसूरु रेलवे स्टेशन पर कविता को पता चलता है कि उसकी बेंगलुरु वाली ट्रेन रद्द हो गई है, और वह पूछताछ काउंटर पर सुरेश से मदद माँगती है।'
                    },
                    speakers: [{ name: 'Kavita', voice: 'f' }, { name: 'Suresh', voice: 'm' }],
                    lines: [
                        { speaker: 'Kavita', en: 'Excuse me, I just heard an announcement that the Chamundi Express is cancelled. Is that right?', kn: 'ಕ್ಷಮಿಸಿ, ಚಾಮುಂಡಿ ಎಕ್ಸ್ಪ್ರೆಸ್ ರದ್ದಾಗಿದೆ ಎಂದು ಈಗ ಪ್ರಕಟಣೆ ಕೇಳಿದೆ. ಅದು ನಿಜವೇ?', hi: 'सुनिए, मैंने अभी घोषणा सुनी कि चामुंडी एक्सप्रेस रद्द हो गई है। क्या यह सही है?' },
                        { speaker: 'Suresh', en: "I'm afraid so, madam. There's a problem with the track near Mandya.", kn: 'ಹೌದು ಮೇಡಂ, ದುರದೃಷ್ಟವಶಾತ್. ಮಂಡ್ಯದ ಬಳಿ ಹಳಿಯಲ್ಲಿ ತೊಂದರೆಯಾಗಿದೆ.', hi: 'जी हाँ मैडम, अफ़सोस है। मंड्या के पास पटरी में ख़राबी आ गई है।' },
                        { speaker: 'Kavita', en: 'Oh no. I have an important meeting in Bengaluru at two. What are my options?', kn: 'ಅಯ್ಯೋ. ಬೆಂಗಳೂರಿನಲ್ಲಿ ಎರಡು ಗಂಟೆಗೆ ನನಗೆ ಮುಖ್ಯವಾದ ಮೀಟಿಂಗ್ ಇದೆ. ನನಗೆ ಬೇರೆ ಯಾವ ದಾರಿ ಇದೆ?', hi: 'अरे नहीं। बेंगलुरु में दो बजे मेरी एक ज़रूरी मीटिंग है। मेरे पास क्या रास्ते हैं?' },
                        { speaker: 'Suresh', en: "There's an express at eleven fifteen from platform three. It usually reaches by half past one.", kn: 'ಮೂರನೇ ಪ್ಲಾಟ್ಫಾರ್ಮಿನಿಂದ ಹನ್ನೊಂದೂ ಕಾಲಿಗೆ ಒಂದು ಎಕ್ಸ್ಪ್ರೆಸ್ ಇದೆ. ಅದು ಸಾಮಾನ್ಯವಾಗಿ ಒಂದೂವರೆಗೆ ತಲುಪುತ್ತದೆ.', hi: 'प्लेटफ़ॉर्म तीन से सवा ग्यारह बजे एक एक्सप्रेस है। वह आमतौर पर डेढ़ बजे तक पहुँच जाती है।' },
                        { speaker: 'Kavita', en: 'Are there any seats left on it?', kn: 'ಅದರಲ್ಲಿ ಸೀಟು ಇನ್ನೂ ಖಾಲಿ ಇದೆಯೇ?', hi: 'क्या उसमें कोई सीट बची है?' },
                        { speaker: 'Suresh', en: "Only in the general coach, I'm afraid. The reserved seats are all on the waiting list.", kn: 'ಕ್ಷಮಿಸಿ, ಜನರಲ್ ಬೋಗಿಯಲ್ಲಿ ಮಾತ್ರ. ಕಾಯ್ದಿರಿಸಿದ ಸೀಟುಗಳೆಲ್ಲಾ ವೇಟಿಂಗ್ ಲಿಸ್ಟಿನಲ್ಲಿವೆ.', hi: 'माफ़ कीजिए, सिर्फ़ जनरल डिब्बे में। आरक्षित सीटें सब वेटिंग लिस्ट में हैं।' },
                        { speaker: 'Kavita', en: 'The general coach is fine. And what happens to my cancelled ticket?', kn: 'ಜನರಲ್ ಬೋಗಿ ಆದರೂ ಪರವಾಗಿಲ್ಲ. ನನ್ನ ರದ್ದಾದ ಟಿಕೆಟ್ ಏನಾಗುತ್ತದೆ?', hi: 'जनरल डिब्बा भी चलेगा। और मेरे रद्द हुए टिकट का क्या होगा?' },
                        { speaker: 'Suresh', en: "Since the railway cancelled the train, you'll get a full refund within a week.", kn: 'ರೈಲ್ವೆಯೇ ರೈಲು ರದ್ದು ಮಾಡಿರುವುದರಿಂದ ಒಂದು ವಾರದೊಳಗೆ ನಿಮಗೆ ಪೂರ್ತಿ ಮರುಪಾವತಿ ಸಿಗುತ್ತದೆ.', hi: 'चूँकि ट्रेन रेलवे ने रद्द की है, इसलिए एक हफ़्ते के अंदर आपको पूरा रिफ़ंड मिल जाएगा।' },
                        { speaker: 'Kavita', en: 'Do I need to fill in a form for the refund?', kn: 'ಮರುಪಾವತಿಗಾಗಿ ನಾನು ಯಾವುದಾದರೂ ಅರ್ಜಿ ತುಂಬಬೇಕೇ?', hi: 'क्या रिफ़ंड के लिए मुझे कोई फ़ॉर्म भरना होगा?' },
                        { speaker: 'Suresh', en: "No, madam. It's automatic, because you booked online. Have a safe journey.", kn: 'ಇಲ್ಲ ಮೇಡಂ. ನೀವು ಆನ್ಲೈನಿನಲ್ಲಿ ಬುಕ್ ಮಾಡಿದ್ದರಿಂದ ಅದು ತಾನಾಗಿಯೇ ಆಗುತ್ತದೆ. ಸುರಕ್ಷಿತ ಪ್ರಯಾಣ ನಿಮ್ಮದಾಗಲಿ.', hi: 'नहीं मैडम। आपने ऑनलाइन बुक किया था, इसलिए यह अपने आप हो जाएगा। आपकी यात्रा शुभ हो।' }
                    ],
                    questions: [
                        {
                            q: { en: 'Why was the Chamundi Express cancelled?', kn: 'ಚಾಮುಂಡಿ ಎಕ್ಸ್ಪ್ರೆಸ್ ಏಕೆ ರದ್ದಾಯಿತು?', hi: 'चामुंडी एक्सप्रेस क्यों रद्द हुई?' },
                            options: [
                                { en: 'A problem with the track near Mandya', kn: 'ಮಂಡ್ಯದ ಬಳಿ ಹಳಿಯಲ್ಲಿ ತೊಂದರೆ', hi: 'मंड्या के पास पटरी में ख़राबी' },
                                { en: 'Heavy rain in Mysuru', kn: 'ಮೈಸೂರಿನಲ್ಲಿ ಭಾರೀ ಮಳೆ', hi: 'मैसूरु में भारी बारिश' },
                                { en: 'A strike by the staff', kn: 'ಸಿಬ್ಬಂದಿಯ ಮುಷ್ಕರ', hi: 'कर्मचारियों की हड़ताल' },
                                { en: 'Too few passengers', kn: 'ಪ್ರಯಾಣಿಕರು ತುಂಬಾ ಕಡಿಮೆ', hi: 'बहुत कम यात्री' }
                            ]
                        },
                        {
                            q: { en: 'Which train does Suresh suggest?', kn: 'ಸುರೇಶ್ ಯಾವ ರೈಲನ್ನು ಸೂಚಿಸುತ್ತಾರೆ?', hi: 'सुरेश कौन-सी ट्रेन सुझाते हैं?' },
                            options: [
                                { en: 'An express at eleven fifteen', kn: 'ಹನ್ನೊಂದೂ ಕಾಲಿನ ಎಕ್ಸ್ಪ್ರೆಸ್', hi: 'सवा ग्यारह बजे की एक्सप्रेस' },
                                { en: 'A night train', kn: 'ರಾತ್ರಿಯ ರೈಲು', hi: 'रात की ट्रेन' },
                                { en: "The next day's Chamundi Express", kn: 'ಮರುದಿನದ ಚಾಮುಂಡಿ ಎಕ್ಸ್ಪ್ರೆಸ್', hi: 'अगले दिन की चामुंडी एक्सप्रेस' },
                                { en: "A train at two o'clock", kn: 'ಎರಡು ಗಂಟೆಯ ರೈಲು', hi: 'दो बजे की ट्रेन' }
                            ]
                        },
                        {
                            q: { en: 'How will Kavita get her money back?', kn: 'ಕವಿತಾಳಿಗೆ ಹಣ ಹೇಗೆ ವಾಪಸ್ ಬರುತ್ತದೆ?', hi: 'कविता को पैसे कैसे वापस मिलेंगे?' },
                            options: [
                                { en: 'Automatically, as a full refund', kn: 'ತಾನಾಗಿಯೇ, ಪೂರ್ತಿ ಮರುಪಾವತಿಯಾಗಿ', hi: 'अपने आप, पूरे रिफ़ंड के रूप में' },
                                { en: 'She must fill in a form', kn: 'ಅವಳು ಅರ್ಜಿ ತುಂಬಬೇಕು', hi: 'उसे फ़ॉर्म भरना होगा' },
                                { en: 'She will get half the fare', kn: 'ಅರ್ಧ ಪ್ರಯಾಣ ದರ ಸಿಗುತ್ತದೆ', hi: 'उसे आधा किराया मिलेगा' },
                                { en: 'In cash at the counter', kn: 'ಕೌಂಟರಿನಲ್ಲಿ ನಗದಾಗಿ', hi: 'काउंटर पर नकद' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Your train has been cancelled. Go to the ticket counter, ask why, ask about other ways to reach your destination today, and ask how you will get your money back.',
                        sample: "Excuse me, I've just heard that my train to Hubballi, the Siddhaganga Express, has been cancelled. Could you tell me why? I see, that's a pity. I really need to reach Hubballi by this evening because I have an exam tomorrow morning. Is there another train or a bus I could take today? Are there any seats left? And what about my ticket? I booked it online two weeks ago. Will I get a full refund, or do I need to fill in a form? How long will it take? Thank you very much for your help.",
                        checklist: ['I politely asked why the train was cancelled', 'I explained why I need to travel today', 'I asked about other trains or buses', 'I asked about a refund for my ticket', 'I thanked the clerk']
                    }
                }
            ]
        }
    },
    glosses: {
        kn: {
            // 1:1 Meeting new people
            'ಈಗಷ್ಟೇ ಇಲ್ಲಿಗೆ ಬಂದಿರುವ ನನ್ನ ಸಂಬಂಧಿ ರೋಹನನ್ನು ನಿಮಗೆ ಪರಿಚಯಿಸುತ್ತೇನೆ.': 'just now/recently|here/to this place|who has come/who moved|my/mine|cousin/relative|Rohan|you/to you|I will introduce/let me introduce',
            'ಅವಳು ನಿಜವಾಗಿ ಸ್ನೇಹಿತೆ ಅಲ್ಲ, ನನ್ನ ಹಳೆಯ ಆಫೀಸಿನ ಪರಿಚಿತೆ ಅಷ್ಟೇ.': 'she/her|really/truly|friend|is not/not|my/mine|old/former|office/of the office|acquaintance/someone I know|only/just',
            'ನಮ್ಮ ಹೊಸ ನೆರೆಹೊರೆಯವರು ಪರಿಚಯ ಮಾಡಿಕೊಳ್ಳಲು ಸಿಹಿ ತಿಂಡಿ ತಂದರು.': 'our/ours|new|neighbours/people next door|introduction/getting to know|to make/to do|sweet|snacks/eats|brought/came with',
            'ಅವನು ಗಟ್ಟಿಯಾದ ಹಸ್ತಲಾಘವ ಮತ್ತು ಆತ್ಮೀಯ ನಗುವಿನೊಂದಿಗೆ ಎಲ್ಲರನ್ನೂ ಸ್ವಾಗತಿಸಿದ.': 'he/him|firm/strong|handshake|and|warm/friendly|with a smile/smile|everyone/all|greeted/welcomed',
            'ಚಿನ್ನು ಅನ್ನೋದು ನನ್ನ ಹುಟ್ಟೂರಿನ ಸ್ನೇಹಿತರು ಇಟ್ಟ ಅಡ್ಡಹೆಸರು ಅಷ್ಟೇ.': 'Chinnu|what is called/the name|my/mine|of my hometown/hometown|friends|gave/put|nickname|only/just',
            'ಹವಾಮಾನದ ಬಗ್ಗೆ ಲೋಕಾಭಿರಾಮದ ಮಾತು ಸಂಕೋಚ ಮುರಿಯಲು ಸುಲಭ ದಾರಿ.': 'weather/of the weather|about|light/casual|talk/words|shyness/hesitation|to break|easy/simple|way/path',
            'ಹೊಗಳಿಕೆಗೆ ಧನ್ಯವಾದ, ಈ ಸೀರೆಯನ್ನು ನಿಜವಾಗಿ ನನ್ನ ಅಮ್ಮ ಆರಿಸಿದ್ದು.': 'for the compliment/for the praise|thanks/thank you|this|saree|actually/really|my/mine|mother/mum|chose/picked',
            'ಅಪರಿಚಿತರ ಜೊತೆ ಮಾತಾಡಲು ನನಗೆ ಅಳುಕಿತ್ತು, ಆದರೆ ಅವರು ತುಂಬಾ ಸ್ನೇಹಪರರಾಗಿದ್ದರು.': 'strangers/of strangers|with|to talk/to speak|me/to me|was nervous/felt shy|but|they/them|very/really|were friendly/were kind',
            'ಸಂಭಾಷಣೆ ಮುಂದುವರಿಸಲು ಪ್ರಶ್ನೆ ಕೇಳಿ, ಉತ್ತರಗಳನ್ನು ಗಮನವಿಟ್ಟು ಕೇಳಿ.': 'conversation/talk|to continue/to keep going|question/questions|ask|answers|carefully/with attention|listen/hear',
            'ನಮ್ಮಿಬ್ಬರಿಗೂ ಗೊತ್ತಿರುವ ಸ್ನೇಹಿತ ಒಬ್ಬ ಇದ್ದಾನೆ ಅಂತ ಗೊತ್ತಾಯಿತು, ಬೇಗ ಸಿಕ್ಕಿ ಮಾತಾಡೋಣ.': 'to both of us/both of us|known/who knows|friend|one/a|there is/he is|that|came to know/found out|soon/quickly|meeting/meet|let us talk/let us catch up',
            // 2:1 On the phone
            'ದಯವಿಟ್ಟು ನನ್ನ ಕರೆಯನ್ನು ಎಕ್ಸ್ಟೆನ್ಶನ್ ಎರಡು ನಾಲ್ಕು ಐದಕ್ಕೆ ಜೋಡಿಸುತ್ತೀರಾ?': 'please|my/mine|call/the call|extension|two|four|to five/five|will you connect/could you put through',
            'ನಿಮ್ಮ ಮೂರು ಮಿಸ್ಡ್ ಕಾಲ್ ನೋಡಿದೆ, ಎಲ್ಲಾ ಸರಿ ಇದೆಯಾ?': 'your/from you|three|missed|calls/call|I saw/saw|everything/all|right/fine|is it/is',
            'ಅವನು ಕರೆ ಸ್ವೀಕರಿಸಲಿಲ್ಲ, ಹಾಗಾಗಿ ಅವನಿಗೆ ಒಂದು ಚಿಕ್ಕ ಧ್ವನಿ ಸಂದೇಶ ಬಿಟ್ಟೆ.': 'he/him|call|did not answer/did not pick up|so/therefore|him/for him|a/one|short/small|voice|message|I left/left',
            'ದಯವಿಟ್ಟು ಕರೆ ಕಟ್ ಮಾಡಬೇಡಿ, ಈಗಲೇ ನಿಮ್ಮನ್ನು ಅಕೌಂಟ್ಸ್ ತಂಡಕ್ಕೆ ವರ್ಗಾಯಿಸುತ್ತೇನೆ.': 'please|call|cut|do not do/do not|right now/now|you|accounts|to the team/team|I will transfer/I will pass on',
            'ಕರೆ ಮಾಡಿದವನು ತನ್ನ ಹೆಸರು ಹೇಳಲು ಒಪ್ಪಲಿಲ್ಲ, ಹಾಗಾಗಿ ನಾನು ಯಾವ ವಿವರವನ್ನೂ ಕೊಡಲಿಲ್ಲ.': 'call|the one who made/caller|his/his own|name|to say/to tell|did not agree/refused|so/therefore|I|any/which|details/any detail|did not give/gave nothing',
            'ಕ್ಷಮಿಸಿ, ನೀವು ತಪ್ಪು ನಂಬರಿಗೆ ಕರೆ ಮಾಡಿದ್ದೀರಿ ಅನಿಸುತ್ತದೆ.': 'sorry/excuse me|you|wrong|to the number/number|call|have made/have done|I think/it seems',
            'ನಾನು ಈಗ ಮೀಟಿಂಗಿನಲ್ಲಿದ್ದೇನೆ, ಹತ್ತು ನಿಮಿಷದಲ್ಲಿ ವಾಪಸ್ ಕಾಲ್ ಮಾಡಲಾ?': 'I|now/right now|am in a meeting/in the meeting|ten|in minutes/minutes|back/again|call|shall I make/shall I do',
            'ನನ್ನ ಬ್ಯಾಟರಿ ಬಹುತೇಕ ಖಾಲಿಯಾಗಿದೆ, ಯಾವ ಕ್ಷಣದಲ್ಲಾದರೂ ಕರೆ ಕಟ್ ಆಗಬಹುದು.': 'my/mine|battery|almost/nearly|is empty/has run out|any/which|at any moment/moment|call|cut|may happen/might get',
            'ಅಪ್ಪ ಅಮ್ಮನಿಗೂ ಕೇಳಿಸಲಿ ಅಂತ ಫೋನನ್ನು ಸ್ಪೀಕರಿನಲ್ಲಿ ಇಡುತ್ತೇನೆ.': 'father/dad|to mother too/mum also|so they can hear/let it be heard|that/so that|the phone/phone|on the speaker/on loudspeaker|I will put/I will keep',
            'ಇಲ್ಲಿ ಸಂಪರ್ಕ ತುಂಬಾ ದುರ್ಬಲವಾಗಿದೆ, ಕೊನೆಯ ಭಾಗವನ್ನು ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳುತ್ತೀರಾ?': 'here|connection/contact|very/really|is weak/is poor|last/final|part/portion|please|once more/again|will you say/could you repeat',
            // 3:1 At the bank
            'ನನ್ನ ಮಗಳ ಹೆಸರಿನಲ್ಲಿ ಒಂದು ಉಳಿತಾಯ ಖಾತೆ ತೆರೆಯಬೇಕಿತ್ತು.': 'my/mine|daughter/of my daughter|in the name/name|a/one|savings|account|I wanted to open/would like to open',
            'ನಗದು ಜಮೆ ಮಾಡಬೇಕಾದರೆ ದಯವಿಟ್ಟು ಈ ಚೀಟಿ ತುಂಬಿ.': 'cash|deposit/credit|if you want to do/if you need to|please|this|slip/chit|fill/fill in',
            'ಚೆಕ್ ಇಲ್ಲದೆ ಒಂದೇ ದಿನದಲ್ಲಿ ಎಷ್ಟು ಹಣ ತೆಗೆಯಬಹುದು?': 'cheque|without|single/only one|in a day/day|how much|money|can take out/can withdraw',
            'ದಯವಿಟ್ಟು ನನ್ನ ಪಾಸ್ ಬುಕ್ ಅಪ್ಡೇಟ್ ಮಾಡುತ್ತೀರಾ? ತಿಂಗಳುಗಳಿಂದ ಪ್ರಿಂಟ್ ಆಗಿಲ್ಲ.': 'please|my/mine|pass|book|update|will you do/could you do|for months/since months|print/printing|has not happened/has not been',
            'ನನ್ನ ಖಾತೆಯಲ್ಲಿ ಉಳಿಕೆ ಹಣ ಕಡಿಮೆ ಇದೆ, ಚೆಕ್ ಬೌನ್ಸ್ ಆಗಬಹುದು ಅಂತ ಭಯ.': 'my/mine|in the account/account|remaining/balance|money|low/less|is|cheque|bounce|may happen/might become|that|fear/worry',
            'ಎಟಿಎಂ ನನ್ನ ಡೆಬಿಟ್ ಕಾರ್ಡನ್ನು ಒಳಗೆ ಎಳೆದುಕೊಂಡಿತು, ಅದನ್ನು ತಕ್ಷಣ ಬ್ಲಾಕ್ ಮಾಡಿಸಬೇಕು.': 'ATM|my/mine|debit|card|inside/in|pulled in/swallowed|it/that|immediately/at once|block|must get done/need to have done',
            'ಬ್ಯಾಂಕಿನವರು ಎಂದು ಹೇಳಿದರೂ ನಿಮ್ಮ ಪಿನ್ ಸಂಖ್ಯೆಯನ್ನು ಯಾರಿಗೂ ಹೇಳಬೇಡಿ.': 'bank people/from the bank|that|even if they say/even if told|your/yours|PIN|number|to anyone/anyone|do not tell/never tell',
            'ನಾನು ಯುಪಿಐ ಮೂಲಕ ಬಾಡಿಗೆ ಕಟ್ಟಿದೆ, ಆದರೆ ಹಣ ಇನ್ನೂ ಮಾಲೀಕರಿಗೆ ತಲುಪಿಲ್ಲ.': 'I|UPI|through/by|rent|paid|but|money|still/yet|to the owner/owner|has not reached/not reached',
            'ಎರಡು ವರ್ಷದ ನಿಶ್ಚಿತ ಠೇವಣಿಗೆ ನೀವು ಎಷ್ಟು ಬಡ್ಡಿ ಕೊಡುತ್ತೀರಿ?': 'two|year/of years|fixed|for a deposit/deposit|you|how much|interest|give/offer',
            'ದಯವಿಟ್ಟು ಆಧಾರ್ ಮತ್ತು ಪ್ಯಾನ್ ಕೊಟ್ಟು ಕೆವೈಸಿ ಮುಗಿಸಿ, ಇಲ್ಲದಿದ್ದರೆ ಖಾತೆ ಸ್ಥಗಿತವಾಗಬಹುದು.': 'please|Aadhaar|and|PAN|giving/by giving|KYC|finish/complete|otherwise/if not|account|may be frozen/may be stopped',
            // 4:1 Eating out
            'ಕ್ಷಮಿಸಿ, ದಯವಿಟ್ಟು ಮೆನು ಮತ್ತು ಸ್ವಲ್ಪ ನೀರು ಕೊಡುತ್ತೀರಾ?': 'excuse me/sorry|please|menu|and|some/a little|water|will you give/could you bring',
            'ನೀರ್ ದೋಸೆ ಚೆನ್ನಾಗಿದೆ ಅಂತ ಮಾಣಿ ಹೇಳಿದ, ಹಾಗಾಗಿ ಎರಡು ಪ್ಲೇಟ್ ತರಿಸಿದೆವು.': 'neer/water|dosa|is good/is nice|that|waiter|said/told|so/therefore|two|plates/plate|we ordered/we had it brought',
            'ಒಂದು ಆರಂಭದ ತಿನಿಸು ಹಂಚಿಕೊಂಡು, ಆಮೇಲೆ ಮುಖ್ಯ ಊಟ ಬೇರೆ ಬೇರೆ ಆರ್ಡರ್ ಮಾಡೋಣವಾ?': 'one/a|starting/first|dish/snack|sharing/after sharing|then/after that|main|meal/course|separate/different|separate/each|order|shall we do/shall we',
            'ಸಿಹಿ ತಿನಿಸಿಗೆ ಹೊಟ್ಟೆಯಲ್ಲಿ ಜಾಗ ಇಲ್ಲ, ಆದರೆ ಒಂದು ಫಿಲ್ಟರ್ ಕಾಫಿ ಬೇಕು.': 'sweet|for the dish/for dessert|in the stomach/stomach|room/space|no/not|but|one/a|filter|coffee|want/would like',
            'ನಮಗೆ ಇನ್ನೂ ಸ್ವಲ್ಪ ನ್ಯಾಪ್ಕಿನ್ ಮತ್ತು ನನ್ನ ಮಗನಿಗೆ ಒಂದು ಚಿಕ್ಕ ಚಮಚ ತರುತ್ತೀರಾ?': 'us/for us|more/still|some/a few|napkins/napkin|and|my/mine|for my son/son|one/a|small/little|spoon|will you bring/could you bring',
            'ನನಗೆ ಬೀಜಗಳ ಅಲರ್ಜಿ ಇದೆ, ಈ ಸಾರಿಗೆ ಏನೇನು ಸಾಮಗ್ರಿ ಹಾಕಿದ್ದೀರಿ ಅಂತ ನೋಡುತ್ತೀರಾ?': 'me/to me|nuts/of nuts|allergy|is/there is|this|to the curry/curry|what all/what things|ingredients/ingredient|you have put/you have added|that|will you check/could you see',
            'ನಾವೆಲ್ಲಾ ಸಸ್ಯಾಹಾರಿಗಳು, ದಯವಿಟ್ಟು ಯಾವುದರಲ್ಲೂ ಮೊಟ್ಟೆ ಇರದಂತೆ ನೋಡಿಕೊಳ್ಳಿ.': 'we all/all of us|vegetarians/vegetarian|please|in anything/in nothing|egg/eggs|so that it is not/not be|make sure/take care',
            'ಸ್ವಲ್ಪ ಕಡಿಮೆ ಖಾರ ಮಾಡುತ್ತೀರಾ? ನನ್ನ ಮಗನಿಗೆ ಹೆಚ್ಚು ಖಾರ ಆಗಲ್ಲ.': 'a little/slightly|less|spicy/spice|will you make/could you do|my/mine|for my son/son|too much/more|spicy/spice|is not okay/cannot take',
            'ಇಲ್ಲಿ ಊಟದ ಪ್ರಮಾಣ ತುಂಬಾ ಜಾಸ್ತಿ, ಉಳಿದಿದ್ದನ್ನು ಪಾರ್ಸೆಲ್ ಮಾಡಿಕೊಡುತ್ತೀರಾ?': 'here|food/of the meal|amount/portion|very/too|much/more|the rest/what is left|parcel/takeaway|will you make/could you pack',
            'ಬಿಲ್ಲಿನಲ್ಲೇ ಸೇವಾ ಶುಲ್ಕ ಸೇರಿದೆ, ಹಾಗಾಗಿ ಬೇರೆ ಟಿಪ್ಸ್ ಕೊಡುವ ಅಗತ್ಯವಿಲ್ಲ.': 'in the bill itself/in the bill|service|charge/fee|is included/has been added|so/therefore|separate/extra|tip/tips|giving/to give|no need/not needed',
            // 5:1 Hotels and stays
            'ಮಾರ್ಚ್ ಐದರಿಂದ ಎರಡು ರಾತ್ರಿಗೆ ಒಂದು ಬುಕಿಂಗ್ ಮಾಡಬೇಕಿತ್ತು.': 'March|from the fifth/from five|two|for nights/nights|a/one|booking|I wanted to make/would like to do',
            'ಈ ವಾರಾಂತ್ಯಕ್ಕೆ ಡಬಲ್ ರೂಮ್ ಲಭ್ಯವಿದೆಯೇ ಎಂದು ನೋಡುತ್ತೀರಾ?': 'this|for the weekend/weekend|double|room|is it available/available|that/whether|will you see/could you check',
            'ಚೆಕ್-ಇನ್ ಮಧ್ಯಾಹ್ನ ಹನ್ನೆರಡಕ್ಕೆ, ಆದರೆ ಅದಕ್ಕೂ ಮೊದಲು ಬ್ಯಾಗುಗಳನ್ನು ನಮ್ಮ ಬಳಿ ಇಡಬಹುದು.': 'check-in|noon/afternoon|at twelve/twelve|but|than that/that|before/earlier|bags/luggage|our/us|with/near|can keep/can leave',
            'ಸ್ವಲ್ಪ ತಡವಾಗಿ ಚೆಕ್-ಔಟ್ ಮಾಡಬಹುದೇ? ನಮ್ಮ ರೈಲು ಆರು ಗಂಟೆಗೆ ಹೊರಡುತ್ತದೆ.': 'a little/slightly|late/later|check-out|can (we) do/is it possible|our/ours|train|six|at the hour/o clock|leaves/departs',
            'ನಿಮ್ಮ ಟ್ಯಾಕ್ಸಿ ಚಾಲಕರು ಲಾಬಿಯಲ್ಲಿ ನಿಮಗಾಗಿ ಕಾಯುತ್ತಿದ್ದಾರೆ.': 'your/yours|taxi|driver/drivers|in the lobby/lobby|for you|is waiting/are waiting',
            'ದಯವಿಟ್ಟು ಎರಡು ಹೊಸ ಟವೆಲ್ ಮತ್ತು ಒಂದು ಹೆಚ್ಚುವರಿ ದಿಂಬು ಕಳುಹಿಸುತ್ತೀರಾ?': 'please|two|new/fresh|towel/towels|and|one/an|extra|pillow|will you send/could you send',
            'ಕ್ಷಮಿಸಿ, 204ನೇ ಕೋಣೆಯ ಎಸಿ ಸ್ವಲ್ಪವೂ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ.': 'sorry/excuse me|204th/number 204|of the room/room|AC/air conditioner|at all/even a little|work|is not doing/is not working',
            'ಸ್ವಚ್ಛತಾ ಸಿಬ್ಬಂದಿ ಇನ್ನೂ ನಮ್ಮ ಕೋಣೆ ಸ್ವಚ್ಛ ಮಾಡಿಲ್ಲ, ಈಗಾಗಲೇ ಮೂರು ಗಂಟೆ ಆಗಿದೆ.': 'cleaning/housekeeping|staff|yet/still|our/ours|room|clean|have not done/not done|already|three|o clock/hours|it has become/it is',
            'ದೂರು ಕೊಡಬೇಕು ಅಂತ ಅಲ್ಲ, ಆದರೆ ಕೋಣೆಯಲ್ಲಿ ತುಂಬಾ ಗದ್ದಲ ಕೇಳಿಸುತ್ತದೆ.': 'complaint|must give/want to make|that|not/it is not|but|in the room/room|very/a lot of|noise/racket|is heard/can be heard',
            'ರಾತ್ರಿ ಹನ್ನೊಂದರ ನಂತರ ರೂಮ್ ಸರ್ವೀಸ್ ಸಿಗುತ್ತದೆಯೇ, ಅಥವಾ ಅಡುಗೆಮನೆ ಮುಚ್ಚಿರುತ್ತದೆಯೇ?': 'night/at night|eleven/of eleven|after|room|service|is it available/can (I) get|or|kitchen|will it be closed/is it shut',
            // 6:1 Tickets and journeys
            'ಚಾಲುಕ್ಯ ಎಕ್ಸ್ಪ್ರೆಸ್ ಯಾವ ಪ್ಲಾಟ್ಫಾರ್ಮಿನಿಂದ ಹೊರಡುತ್ತದೆ?': 'Chalukya|Express/express train|which|from the platform/platform|leaves/departs',
            'ನನಗೆ ಕೆಳಗಿನ ಬರ್ತ್ ಬೇಕು, ನನ್ನ ತಂದೆಗೆ ಮೇಲೆ ಹತ್ತಲು ಕಷ್ಟ.': 'me/to me|lower/bottom|berth|want/need|my/mine|for father/father|up/above|to climb|hard/difficult',
            'ನಮ್ಮ ಟಿಕೆಟ್ ಇನ್ನೂ ವೇಟಿಂಗ್ ಲಿಸ್ಟಿನಲ್ಲಿದೆ, ಸೀಟು ಸಿಗದೆಯೂ ಇರಬಹುದು.': 'our/ours|ticket/tickets|still/yet|waiting|is on the list/in the list|seat/seats|not getting/without getting|may be/might happen',
            'ದೀಪಾವಳಿಗೆ ಕನಿಷ್ಠ ಒಂದು ತಿಂಗಳ ಮೊದಲು ರಿಸರ್ವೇಶನ್ ಮಾಡಿಸಬೇಕು.': 'for Diwali/Diwali|at least/minimum|one/a|month/of a month|before|reservation|should get done/must make',
            'ಪುಣೆಗೆ ಸ್ಲೀಪರ್ ಬೋಗಿಯ ಪ್ರಯಾಣ ದರ ಸುಮಾರು ಆರುನೂರು ರೂಪಾಯಿ.': 'to Pune/for Pune|sleeper|coach/of the coach|travel/journey|rate/fare|about/around|six hundred|rupees/rupee',
            'ದೆಹಲಿ ಹತ್ತಿರ ದಟ್ಟ ಮಂಜಿನಿಂದಾಗಿ ನಾಲ್ಕು ಗಂಟೆ ವಿಳಂಬವಾಗಿದೆ.': 'Delhi|near/close to|thick/heavy|because of fog/due to fog|four|hours/hour|is delayed/there is a delay',
            'ಎರಡು ದಿನಕ್ಕಿಂತ ಮೊದಲೇ ರದ್ದು ಮಾಡಿದರೆ ರದ್ದತಿ ಶುಲ್ಕ ಕಡಿಮೆ.': 'two|than days/days|before/earlier|cancel/cancelled|if you do/if you make|cancellation|charge/fee|small/less',
            'ಬಸ್ ರದ್ದಾಯಿತು, ಹಾಗಾಗಿ ಮರುಪಾವತಿ ಕೇಳಲು ವಿಚಾರಣಾ ಕೌಂಟರಿಗೆ ಹೋದೆ.': 'bus|was cancelled/got cancelled|so/therefore|refund/repayment|to ask/to ask for|enquiry/inquiry|to the counter/counter|I went/went',
            'ಆ ಪ್ರಕಟಣೆ ಕೇಳಿಸಿತಾ? ನಮ್ಮ ಲಗೇಜನ್ನು ಐದನೇ ಪ್ಲಾಟ್ಫಾರ್ಮಿಗೆ ಹೊತ್ತುಕೊಂಡು ಹೋಗಬೇಕು.': 'that|announcement|did you hear/was it heard|our/ours|luggage/bags|fifth/number five|to the platform/platform|carrying/having carried|must go/have to go',
            'ವೇಳಾಪಟ್ಟಿಯ ಪ್ರಕಾರ ಮೈಸೂರಿಗೆ ಕೊನೆಯ ಬಸ್ ಹತ್ತು ಗಂಟೆಗೆ ಹೊರಡುತ್ತದೆ.': 'of the timetable/timetable|according to/as per|to Mysuru/for Mysuru|last/final|bus|ten|at the hour/o clock|leaves/departs'
        },
        hi: {
            // 1:1 Meeting new people
            'मैं आपको अपने चचेरे भाई रोहन से मिलवाता हूँ, जो अभी-अभी यहाँ आया है।': 'I/me|you/to you|my/own|cousin/paternal|brother|Rohan|with/to|introduce/make meet|am|who/which|just/just now|here|came/has come|is/has',
            'वह असल में दोस्त नहीं है, बस मेरे पुराने दफ़्तर की जान-पहचान वाली है।': 'she/that|reality/real|in|friend|not/no|is|just/only|my/mine|old/former|office|of/from|acquaintance/knowing|one/person|is',
            'हमारे नए पड़ोसी जान-पहचान के लिए मिठाई लेकर आए।': 'our/ours|new|neighbours/neighbour|getting to know/acquaintance|of|for/for the sake|sweets/mithai|taking/with|came/came over',
            'उसने कसकर हाथ मिलाया और प्यारी मुस्कान के साथ सबका स्वागत किया।': 'he/she|firmly/tightly|hand|shook/joined|and|sweet/warm|smile|of|with/together|everyone/of all|welcome/greeting|did',
            'चिन्नू तो बस एक घर का नाम है, जो मेरे गृहनगर के दोस्तों ने रखा था।': 'Chinnu|well/so|just/only|a/one|home/house|of|name|is|which/that|my/mine|hometown|of|friends|(subject marker)/by|kept/gave|had/was',
            'मौसम पर हल्की-फुल्की बातचीत झिझक तोड़ने का आसान तरीक़ा है।': 'weather|on/about|light/casual|talk/conversation|shyness/hesitation|to break/breaking|of|easy/simple|way/method|is',
            'तारीफ़ के लिए शुक्रिया, यह साड़ी असल में मेरी माँ ने चुनी थी।': 'compliment/praise|of|for|thanks/thank you|this/it|saree|real/actual|in|my/mine|mother/mum|(subject marker)/by|chose/picked|had/was',
            'मुझे अजनबियों से बात करने में घबराहट थी, पर वे बहुत मिलनसार निकले।': 'me/to me|strangers|with/from|talk/talking|doing/to do|in|nervousness/fear|was|but/however|they/those|very/really|friendly/sociable|turned out/came out',
            'बातचीत जारी रखने के लिए सवाल पूछिए और जवाब ध्यान से सुनिए।': 'conversation/talk|going/ongoing|to keep/keeping|of|for|questions/question|ask|and|answers/answer|attention/care|with/from|listen/hear',
            'पता चला कि हमारा एक साझा दोस्त है, तो जल्दी मिलकर हालचाल करते हैं।': 'knowledge/known|went/came|that|our/ours|one/a|shared/mutual|friend|is|so/then|soon/quickly|meeting/together|news/how things are|do/let us do|are',
            // 2:1 On the phone
            'क्या आप मुझे एक्सटेंशन दो चार पाँच पर जोड़ देंगे?': '(question)/will|you|me/to me|extension|two|four|five|on/to|connect/join|will give/will (do)',
            'मैंने आपकी तीन मिस्ड कॉल देखीं, सब ठीक तो है?': 'I|your/from you|three|missed|calls/call|saw/noticed|everything/all|fine/okay|surely/then|is',
            'उसने फ़ोन नहीं उठाया, तो मैंने उसके वॉइसमेल पर एक छोटा संदेश छोड़ दिया।': 'he/she|phone|not/no|picked up/lifted|so/then|I|his/her|voicemail|on|a/one|short/small|message|leave/left|gave/(did)',
            'कृपया फ़ोन मत रखिए, मैं अभी आपको अकाउंट्स टीम से जोड़ता हूँ।': 'please|phone|do not/not|put down/keep|I|now/right now|you/to you|accounts|team|with/to|connect/join|am',
            'फ़ोन करने वाले ने अपना नाम बताने से मना कर दिया, इसलिए मैंने कोई जानकारी नहीं दी।': 'phone|making/doing|one/person|(subject marker)/by|his/own|name|telling/to tell|from|refusal/no|do/did|gave/(did)|so/therefore|I|any/some|details/information|not/no|gave/shared',
            'माफ़ कीजिए, लगता है आपने ग़लत नंबर मिलाया है।': 'pardon/forgive|do/please do|seems/feels|is|you|wrong|number|dialled/joined|have/is',
            'मैं अभी मीटिंग में हूँ, क्या दस मिनट में आपको वापस फ़ोन करूँ?': 'I|now/right now|meeting|in/inside|am|(question)/shall|ten|minutes/minute|in|you/to you|back/again|phone/call|shall I do/should I make',
            'मेरी बैटरी लगभग ख़त्म है, कॉल कभी भी कट सकती है।': 'my/mine|battery|almost/nearly|finished/dead|is|call|ever/any time|also/even|cut/get cut|can/may|is',
            'मैं फ़ोन स्पीकर पर डाल देता हूँ, ताकि मम्मी-पापा भी सुन सकें।': 'I/me|phone|speaker/loudspeaker|on|put/place|give/(do)|am|so that|mum and dad/parents|also/too|hear/listen|can/be able',
            'यहाँ कनेक्शन बहुत ख़राब है, क्या आप आख़िरी हिस्सा दोबारा बता सकते हैं?': 'here|connection|very/really|bad/poor|is|(question)/can|you|last/final|part/portion|again/once more|tell/say|can/able|are',
            // 3:1 At the bank
            'मैं अपनी बेटी के नाम से एक बचत खाता खुलवाना चाहता हूँ।': 'I|my/own|daughter|of|name|with/in|a/one|savings|account|to get opened/to open|want/would like|am',
            'नकद जमा करना हो तो कृपया यह पर्ची भरिए।': 'cash|deposit/credit|to do/to make|be/is|then/so|please|this|slip/chit|fill/fill in',
            'बिना चेक के एक दिन में कितना पैसा निकाल सकते हैं?': 'without|cheque|of|one/a single|day|in|how much|money|take out/withdraw|can/able|are',
            'क्या आप मेरी पासबुक अपडेट कर देंगे? महीनों से प्रिंट नहीं हुई है।': '(question)/will|you|my/mine|passbook|update|do/make|will give/will (do)|months|from/for|print/printed|not/no|happened/been|is/has',
            'मेरा बैलेंस काफ़ी कम है, इसलिए डर है कि चेक बाउंस न हो जाए।': 'my/mine|balance|quite/rather|low/less|is|so/therefore|fear/worry|is|that|cheque|bounce|not|be/happen|go/may go',
            'एटीएम ने मेरा डेबिट कार्ड अंदर रख लिया, मुझे उसे तुरंत ब्लॉक करवाना है।': 'ATM|(subject marker)/by|my/mine|debit|card|inside/in|keep/kept|took/(did)|me/I|it/that|immediately/at once|block|to get done/to have done|is/need',
            'कोई ख़ुद को बैंक वाला बताए, तब भी अपना पिन किसी को मत बताइए।': 'someone/anyone|self/himself|to/as|bank|person/one|says/tells|then|also/even|your/own|PIN|anyone/someone|to|do not/never|tell',
            'मैंने यूपीआई से किराया भेजा, पर पैसा अभी तक मकान मालिक तक नहीं पहुँचा।': 'I|UPI|through/by|rent|sent/paid|but|money|now/yet|till/up to|house|owner/landlord|to/up to|not/no|reached/arrived',
            'दो साल की फ़िक्स्ड डिपॉज़िट पर आप कितना ब्याज देते हैं?': 'two|year/years|of|fixed|deposit|on/for|you|how much|interest|give/offer|are',
            'कृपया आधार और पैन से अपना केवाईसी पूरा कीजिए, वरना खाता फ़्रीज़ हो सकता है।': 'please|Aadhaar|and|PAN|with/by|your/own|KYC|complete/full|do/please do|otherwise/or else|account|frozen/freeze|be/become|can/may|is',
            // 4:1 Eating out
            'सुनिए, क्या हमें मेन्यू और थोड़ा पानी मिलेगा?': 'listen/excuse me|(question)/will|us/to us|menu|and|some/a little|water|will get/will be given',
            'वेटर ने नीर डोसा सुझाया, तो हमने दो प्लेट मँगवाईं।': 'waiter|(subject marker)/by|neer/water|dosa|suggested/recommended|so/then|we|two|plates/plate|ordered/had brought',
            'एक स्टार्टर मिलकर खा लें और फिर अपना-अपना मुख्य भोजन मँगवाएँ?': 'one/a|starter|together/sharing|eat|take/shall we|and|then/after that|each our own/own|main|meal/food|order/shall we order',
            'पेट भर गया है, मीठे की जगह नहीं है, पर एक फ़िल्टर कॉफ़ी चलेगी।': 'stomach|full/filled|gone/become|is|sweet/dessert|of/for|room/space|not/no|is|but/however|one/a|filter|coffee|will do/will work',
            'क्या आप हमें कुछ और नैपकिन और मेरे बेटे के लिए एक छोटा चम्मच ला देंगे?': '(question)/will|you|us/to us|some/a few|more/extra|napkins/napkin|and|my/mine|son|of|for|one/a|small/little|spoon|bring|will give/will (do)',
            'मुझे मेवों से एलर्जी है, क्या आप इस करी की सामग्री देख लेंगे?': 'me/to me|nuts/dry fruits|from/to|allergy|is|(question)/will|you|this|curry|of|ingredients/contents|see/check|will take/will (do)',
            'हम सब शाकाहारी हैं, कृपया ध्यान रखिए कि किसी चीज़ में अंडा न हो।': 'we/us|all|vegetarian/vegetarians|are|please|attention/care|keep/take|that|any|thing/item|in|egg|not|be/is',
            'थोड़ा कम तीखा बना देंगे? मेरा बेटा ज़्यादा मिर्च नहीं खा पाता।': 'a little/slightly|less|spicy/hot|make|will give/will (do)|my/mine|son|too much/more|chilli|not/no|eat|able/manages',
            'यहाँ खाने की मात्रा बहुत ज़्यादा है, बचा हुआ पार्सल कर देंगे?': 'here|food/of the food|of|amount/portion|very/too|much/more|is|left/remaining|been/left over|parcel/takeaway|do/make|will give/will (do)',
            'बिल में सर्विस चार्ज पहले से जुड़ा है, इसलिए अलग से टिप देने की ज़रूरत नहीं।': 'bill|in|service|charge|before/already|from/since|added/joined|is|so/therefore|separate/extra|from/separately|tip|giving/to give|of|need/necessity|not/no',
            // 5:1 Hotels and stays
            'मुझे पाँच मार्च से दो रातों के लिए बुकिंग करनी है।': 'me/I|five/fifth|March|from/since|two|nights|of|for|booking|to do/to make|is/have',
            'क्या आप इस वीकेंड के लिए डबल रूम की उपलब्धता देख लेंगे?': '(question)/will|you|this|weekend|of|for|double|room|of|availability|see/check|will take/will (do)',
            'चेक-इन दोपहर बारह बजे है, पर आप अपना सामान पहले ही हमारे पास रख सकते हैं।': 'check-in|noon/afternoon|twelve|o clock/at (time)|is|but/however|you|your/own|luggage/things|before/earlier|just/only|our/us|near/with|keep/leave|can/able|are',
            'क्या थोड़ा देर से चेक-आउट हो सकता है? हमारी ट्रेन छह बजे है।': '(question)/is|a little/slightly|late/delay|with/from|check-out|be/happen|can/possible|is|our/ours|train|six|o clock/at (time)|is',
            'आपका टैक्सी ड्राइवर लॉबी में आपका इंतज़ार कर रहा है।': 'your/yours|taxi|driver|lobby|in/inside|your/for you|wait/waiting|doing/do|continuing/(-ing)|is',
            'क्या आप दो साफ़ तौलिये और एक और तकिया भिजवा देंगे?': '(question)/will|you|two|clean/fresh|towels|and|one/a|more/extra|pillow|have sent/send|will give/will (do)',
            'माफ़ कीजिए, कमरा नंबर 204 का एसी बिल्कुल नहीं चल रहा।': 'pardon/sorry|do/please do|room|number|204|of|AC/air conditioner|at all/completely|not/no|running/working|is (going)/continuing',
            'हाउसकीपिंग ने अभी तक हमारा कमरा साफ़ नहीं किया, और तीन बज चुके हैं।': 'housekeeping|(subject marker)/by|now/yet|till/until|our/ours|room|clean|not/no|did/done|and|three|struck/rung|already/finished|are',
            'मैं शिकायत नहीं करना चाहता, पर कमरे में बहुत शोर आता है।': 'I|complaint|not/no|to do/to make|want/wish|but/however|room|in/inside|a lot of/very|noise|comes/reaches|is',
            'क्या ग्यारह बजे के बाद रूम सर्विस मिलती है, या तब तक रसोई बंद हो जाती है?': '(question)/is|eleven|o clock/at (time)|of|after|room|service|is available/is got|is|or|then/that time|till/by|kitchen|closed/shut|be/become|goes/gets|is',
            // 6:1 Tickets and journeys
            'चालुक्य एक्सप्रेस किस प्लेटफ़ॉर्म से छूटती है?': 'Chalukya|Express/express train|which|platform|from|leaves/departs|is',
            'मुझे नीचे वाली बर्थ चाहिए, मेरे पिताजी को ऊपर चढ़ने में दिक़्क़त होती है।': 'me/to me|below/lower|one/the|berth|want/need|my/mine|father|to/for|up/above|climbing/to climb|in|trouble/difficulty|happens/is|is',
            'हमारे टिकट अभी वेटिंग लिस्ट में हैं, शायद सीट न मिले।': 'our/ours|tickets/ticket|now/still|waiting|list|in/on|are|maybe/perhaps|seat/seats|not|get/may get',
            'दिवाली से कम से कम एक महीना पहले आरक्षण करा लेना चाहिए।': 'Diwali|from/than|less/least|from/than|less/least|one/a|month|before/earlier|reservation|get done/have made|take/(do)|should/must',
            'पुणे तक स्लीपर डिब्बे का किराया लगभग छह सौ रुपये है।': 'Pune|till/to|sleeper|coach/carriage|of|fare/rent|about/around|six|hundred|rupees|is',
            'दिल्ली के पास घने कोहरे की वजह से चार घंटे की देरी है।': 'Delhi|of|near/close|thick/dense|fog|of|reason/cause|from/because|four|hours|of|delay/lateness|is',
            'दो दिन से पहले रद्द करें तो रद्दीकरण शुल्क कम लगता है।': 'two|days/day|from/than|before/earlier|cancel/cancelled|(you) do/make|then/so|cancellation|charge/fee|less/small|is charged/applies|is',
            'बस रद्द हो गई, इसलिए मैं रिफ़ंड माँगने पूछताछ काउंटर पर गया।': 'bus|cancelled|be/become|went/got|so/therefore|I|refund|to ask for/asking|enquiry/inquiry|counter|at/on|went',
            'वह घोषणा सुनी आपने? हमें अपना सामान प्लेटफ़ॉर्म पाँच तक ले जाना होगा।': 'that|announcement|heard/listened|you|we/to us|our/own|luggage/things|platform|five|till/up to|take/carry|to go/going|will have/must',
            'समय-सारणी के अनुसार मैसूरु की आख़िरी बस दस बजे छूटती है।': 'timetable|of|according to/as per|Mysuru|of/for|last/final|bus|ten|o clock/at (time)|leaves/departs|is'
        }
    }
};
