/**
 * Section 8 "Talking at work" (about CEFR C1), units 1–6: Describing your work, Online meetings,
 * Giving a presentation, Customers and clients, Leave and requests, Feedback and growth.
 * Written in English, Kannada and Hindi (no translation service) — a native speaker should check them.
 */
module.exports = {
    level: 'workplace',
    units: {
        '1:1': {
            name: 'Describing your work',
            lessons: [
                {
                    kind: 'words', title: 'Your role', list: [
                        { en: 'role', kn: 'ಪಾತ್ರ', hi: 'भूमिका', pic: '🧑‍💼', def: 'the job or position you have in a team or company' },
                        { en: 'department', kn: 'ವಿಭಾಗ', hi: 'विभाग', pic: '🏢', def: 'one section of a company that does one kind of work' },
                        { en: 'designation', kn: 'ಪದನಾಮ', hi: 'पदनाम', pic: '🪪', def: 'the official title of your job, such as senior engineer' },
                        { en: 'task', kn: 'ಕಾರ್ಯ', hi: 'कार्य', pic: '📌', def: 'a single piece of work that you have to do' },
                        { en: 'supervise', kn: 'ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡು', hi: 'देखरेख करना', pic: '👀', def: "to watch over people's work and make sure it is done well" },
                        { en: 'handle', kn: 'ನಿಭಾಯಿಸು', hi: 'संभालना', pic: '🤹', def: 'to deal with a problem, a job or a person' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Describing your work 1', list: [
                        { read: true, en: 'In my current role, I look after payroll for the whole company.', kn: 'ನನ್ನ ಈಗಿನ ಪಾತ್ರದಲ್ಲಿ ಇಡೀ ಕಂಪನಿಯ ಪೇರೋಲ್ ಕೆಲಸ ನಾನು ನೋಡಿಕೊಳ್ಳುತ್ತೇನೆ.', hi: 'अपनी मौजूदा भूमिका में मैं पूरी कंपनी का पेरोल संभालता हूँ।' },
                        { read: true, en: 'Which department do you work in, and who do you report to?', kn: 'ನೀವು ಯಾವ ವಿಭಾಗದಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತೀರಿ, ಮತ್ತು ಯಾರಿಗೆ ರಿಪೋರ್ಟ್ ಮಾಡುತ್ತೀರಿ?', hi: 'आप किस विभाग में काम करते हैं, और किसे रिपोर्ट करते हैं?' },
                        { en: 'Officially my designation is senior analyst, but my tasks change every week.', kn: 'ಅಧಿಕೃತವಾಗಿ ನನ್ನ ಪದನಾಮ ಸೀನಿಯರ್ ಅನಾಲಿಸ್ಟ್, ಆದರೆ ನನ್ನ ಕಾರ್ಯಗಳು ಪ್ರತಿ ವಾರ ಬದಲಾಗುತ್ತವೆ.', hi: 'आधिकारिक तौर पर मेरा पदनाम सीनियर एनालिस्ट है, लेकिन मेरे काम हर हफ़्ते बदलते हैं।' },
                        { read: true, en: 'I supervise a team of six and handle most of the client calls.', kn: 'ನಾನು ಆರು ಜನರ ತಂಡದ ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡುತ್ತೇನೆ ಮತ್ತು ಹೆಚ್ಚಿನ ಕ್ಲೈಂಟ್ ಕರೆಗಳನ್ನು ನಿಭಾಯಿಸುತ್ತೇನೆ.', hi: 'मैं छह लोगों की टीम की देखरेख करता हूँ और ज़्यादातर क्लाइंट कॉल मैं ही संभालता हूँ।' },
                        { en: 'On a typical day, I clear the urgent tasks before lunch and plan the rest.', kn: 'ಸಾಮಾನ್ಯವಾಗಿ ನಾನು ತುರ್ತು ಕೆಲಸಗಳನ್ನು ಊಟಕ್ಕೆ ಮುಂಚೆ ಮುಗಿಸಿ, ಉಳಿದದ್ದನ್ನು ಆಮೇಲೆ ಪ್ಲಾನ್ ಮಾಡುತ್ತೇನೆ.', hi: 'आम तौर पर मैं ज़रूरी काम लंच से पहले निपटा देता हूँ और बाकी की योजना बनाता हूँ।', acc: { en: ['On a normal day, I clear the urgent tasks before lunch and plan the rest.'] } }
                    ]
                },
                {
                    kind: 'words', title: 'What your company does', list: [
                        { en: 'headquarters', kn: 'ಕೇಂದ್ರ ಕಚೇರಿ', hi: 'मुख्यालय', pic: '🏙️', def: 'the main office from which a company is run' },
                        { en: 'startup', kn: 'ಸ್ಟಾರ್ಟ್‌ಅಪ್ ಕಂಪನಿ', hi: 'स्टार्टअप कंपनी', pic: '🚀', def: 'a new, young company, often in technology' },
                        { en: 'manufacture', kn: 'ತಯಾರಿಸು', hi: 'निर्माण करना', pic: '🏭', def: 'to make goods in large numbers, usually in a factory' },
                        { en: 'workforce', kn: 'ಸಿಬ್ಬಂದಿ', hi: 'कर्मचारी वर्ग', pic: '👷', def: 'all the people who work for a company' },
                        { en: 'expertise', kn: 'ನೈಪುಣ್ಯ', hi: 'विशेषज्ञता', pic: '🧠', def: 'special skill or knowledge in a particular area' },
                        { en: 'specialise', kn: 'ಪರಿಣತಿ ಹೊಂದು', hi: 'माहिर होना', pic: '🎯', def: 'to focus on one particular area of work' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Describing your work 2', list: [
                        { read: true, en: 'Our headquarters is in Bengaluru, but most of our workforce is in Hubballi.', kn: 'ನಮ್ಮ ಕೇಂದ್ರ ಕಚೇರಿ ಬೆಂಗಳೂರಿನಲ್ಲಿದೆ, ಆದರೆ ನಮ್ಮ ಹೆಚ್ಚಿನ ಸಿಬ್ಬಂದಿ ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿದ್ದಾರೆ.', hi: 'हमारा मुख्यालय बेंगलुरु में है, लेकिन हमारे ज़्यादातर कर्मचारी हुब्बल्ली में हैं।' },
                        { read: true, en: 'We are a small startup that builds billing software for clinics.', kn: 'ನಮ್ಮದು ಕ್ಲಿನಿಕ್‌ಗಳಿಗೆ ಬಿಲ್ಲಿಂಗ್ ಸಾಫ್ಟ್‌ವೇರ್ ತಯಾರಿಸುವ ಒಂದು ಸಣ್ಣ ಸ್ಟಾರ್ಟ್‌ಅಪ್.', hi: 'हम एक छोटा स्टार्टअप हैं जो क्लिनिकों के लिए बिलिंग सॉफ़्टवेयर बनाता है।' },
                        { en: 'Our plant near Mysuru manufactures brake parts for most two-wheeler brands in India.', kn: 'ಮೈಸೂರಿನ ಬಳಿಯ ನಮ್ಮ ಕಾರ್ಖಾನೆ ಭಾರತದ ಹೆಚ್ಚಿನ ದ್ವಿಚಕ್ರ ವಾಹನ ಬ್ರ್ಯಾಂಡ್‌ಗಳಿಗೆ ಬ್ರೇಕ್ ಭಾಗಗಳನ್ನು ತಯಾರಿಸುತ್ತದೆ.', hi: 'मैसूरु के पास हमारा प्लांट भारत के ज़्यादातर दोपहिया ब्रांडों के लिए ब्रेक के पुर्ज़े बनाता है।', acc: { en: ['Our factory near Mysuru manufactures brake parts for most two-wheeler brands in India.'] } },
                        { read: true, en: 'What makes us different is our expertise in rural healthcare.', kn: 'ಗ್ರಾಮೀಣ ಆರೋಗ್ಯ ಸೇವೆಯಲ್ಲಿ ನಮಗಿರುವ ನೈಪುಣ್ಯವೇ ನಮ್ಮನ್ನು ಬೇರೆಯವರಿಂದ ಭಿನ್ನವಾಗಿಸುತ್ತದೆ.', hi: 'ग्रामीण स्वास्थ्य सेवा में हमारी विशेषज्ञता ही हमें दूसरों से अलग बनाती है।' },
                        { en: 'We specialise in helping shops in smaller towns start selling online.', kn: 'ಸಣ್ಣ ಪಟ್ಟಣಗಳ ಅಂಗಡಿಗಳು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಮಾರಾಟ ಶುರು ಮಾಡಲು ಸಹಾಯ ಮಾಡುವುದರಲ್ಲಿ ನಾವು ಪರಿಣತಿ ಹೊಂದಿದ್ದೇವೆ.', hi: 'हम छोटे शहरों की दुकानों को ऑनलाइन बिक्री शुरू करने में मदद करने में माहिर हैं।', acc: { en: ['We specialize in helping shops in smaller towns start selling online.'] } }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'What do you actually do?', kn: 'ನಿಜವಾಗಿ ನಿನ್ನ ಕೆಲಸ ಏನು?', hi: 'आख़िर तुम्हारा काम क्या है?' },
                    text: {
                        en: "At a family wedding in Dharwad, Nikhil's uncle asked him what he actually did at work. Nikhil explained that he worked for a startup that builds soil sensors for farmers. The company's headquarters is in Bengaluru, but the sensors are manufactured in a small factory near Hubballi. His designation is product engineer, and he is part of the testing department. His main task is to check every new sensor before it goes out to farmers. He also supervises two junior engineers and handles questions from the factory team. His uncle smiled and said the company must have a huge workforce. Nikhil laughed and said there were only forty people, but every one of them had real expertise.",
                        kn: 'ಧಾರವಾಡದಲ್ಲಿ ನಡೆದ ಕುಟುಂಬದ ಮದುವೆಯೊಂದರಲ್ಲಿ, ನಿಖಿಲ್‌ನ ಮಾವ ಅವನು ಕೆಲಸದಲ್ಲಿ ನಿಜವಾಗಿ ಏನು ಮಾಡುತ್ತಾನೆ ಎಂದು ಕೇಳಿದರು. ತಾನು ರೈತರಿಗಾಗಿ ಮಣ್ಣಿನ ಸೆನ್ಸರ್‌ಗಳನ್ನು ತಯಾರಿಸುವ ಒಂದು ಸ್ಟಾರ್ಟ್‌ಅಪ್‌ನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತೇನೆ ಎಂದು ನಿಖಿಲ್ ವಿವರಿಸಿದ. ಕಂಪನಿಯ ಕೇಂದ್ರ ಕಚೇರಿ ಬೆಂಗಳೂರಿನಲ್ಲಿದೆ, ಆದರೆ ಸೆನ್ಸರ್‌ಗಳನ್ನು ಹುಬ್ಬಳ್ಳಿಯ ಬಳಿಯ ಒಂದು ಸಣ್ಣ ಕಾರ್ಖಾನೆಯಲ್ಲಿ ತಯಾರಿಸಲಾಗುತ್ತದೆ. ಅವನ ಪದನಾಮ ಪ್ರಾಡಕ್ಟ್ ಎಂಜಿನಿಯರ್, ಮತ್ತು ಅವನು ಟೆಸ್ಟಿಂಗ್ ವಿಭಾಗದಲ್ಲಿದ್ದಾನೆ. ಪ್ರತಿಯೊಂದು ಹೊಸ ಸೆನ್ಸರ್ ರೈತರಿಗೆ ಹೋಗುವ ಮೊದಲು ಅದನ್ನು ಪರೀಕ್ಷಿಸುವುದು ಅವನ ಮುಖ್ಯ ಕಾರ್ಯ. ಅವನು ಇಬ್ಬರು ಜೂನಿಯರ್ ಎಂಜಿನಿಯರ್‌ಗಳ ಮೇಲ್ವಿಚಾರಣೆಯನ್ನೂ ಮಾಡುತ್ತಾನೆ ಮತ್ತು ಕಾರ್ಖಾನೆಯ ತಂಡದ ಪ್ರಶ್ನೆಗಳನ್ನು ನಿಭಾಯಿಸುತ್ತಾನೆ. ಮಾವ ನಗುತ್ತಾ, ಆ ಕಂಪನಿಯಲ್ಲಿ ತುಂಬಾ ಜನ ಕೆಲಸ ಮಾಡುತ್ತಿರಬೇಕು ಎಂದರು. ಇರುವುದು ನಲವತ್ತೇ ಜನ, ಆದರೆ ಪ್ರತಿಯೊಬ್ಬರಿಗೂ ನಿಜವಾದ ನೈಪುಣ್ಯವಿದೆ ಎಂದು ನಿಖಿಲ್ ನಕ್ಕು ಹೇಳಿದ.',
                        hi: 'धारवाड़ में एक पारिवारिक शादी में निखिल के मामा ने उससे पूछा कि वह असल में काम पर क्या करता है। निखिल ने समझाया कि वह एक स्टार्टअप में काम करता है जो किसानों के लिए मिट्टी के सेंसर बनाता है। कंपनी का मुख्यालय बेंगलुरु में है, लेकिन सेंसर हुब्बल्ली के पास एक छोटे कारखाने में बनाए जाते हैं। उसका पदनाम प्रोडक्ट इंजीनियर है, और वह टेस्टिंग विभाग में है। उसका मुख्य काम हर नए सेंसर को किसानों तक भेजने से पहले जाँचना है। वह दो जूनियर इंजीनियरों की देखरेख भी करता है और कारखाने की टीम के सवाल संभालता है। मामा ने मुस्कुराकर कहा कि उस कंपनी में तो बहुत सारे लोग काम करते होंगे। निखिल ने हँसकर बताया कि वहाँ सिर्फ़ चालीस लोग हैं, लेकिन हर एक के पास असली विशेषज्ञता है।'
                    },
                    questions: [
                        {
                            q: { en: "What does Nikhil's company make?", kn: 'ನಿಖಿಲ್‌ನ ಕಂಪನಿ ಏನನ್ನು ತಯಾರಿಸುತ್ತದೆ?', hi: 'निखिल की कंपनी क्या बनाती है?' },
                            options: [
                                { en: 'Soil sensors for farmers', kn: 'ರೈತರಿಗಾಗಿ ಮಣ್ಣಿನ ಸೆನ್ಸರ್‌ಗಳು', hi: 'किसानों के लिए मिट्टी के सेंसर' },
                                { en: 'Brake parts for scooters', kn: 'ಸ್ಕೂಟರ್‌ಗಳಿಗೆ ಬ್ರೇಕ್ ಭಾಗಗಳು', hi: 'स्कूटरों के लिए ब्रेक के पुर्ज़े' },
                                { en: 'Billing software for clinics', kn: 'ಕ್ಲಿನಿಕ್‌ಗಳಿಗೆ ಬಿಲ್ಲಿಂಗ್ ಸಾಫ್ಟ್‌ವೇರ್', hi: 'क्लिनिकों के लिए बिलिंग सॉफ़्टवेयर' },
                                { en: 'Wedding cards', kn: 'ಮದುವೆಯ ಆಮಂತ್ರಣ ಪತ್ರಿಕೆಗಳು', hi: 'शादी के कार्ड' }
                            ]
                        },
                        {
                            q: { en: 'Where are the sensors manufactured?', kn: 'ಸೆನ್ಸರ್‌ಗಳನ್ನು ಎಲ್ಲಿ ತಯಾರಿಸಲಾಗುತ್ತದೆ?', hi: 'सेंसर कहाँ बनाए जाते हैं?' },
                            options: [
                                { en: 'Near Hubballi', kn: 'ಹುಬ್ಬಳ್ಳಿಯ ಬಳಿ', hi: 'हुब्बल्ली के पास' },
                                { en: 'In Dharwad', kn: 'ಧಾರವಾಡದಲ್ಲಿ', hi: 'धारवाड़ में' },
                                { en: 'In Bengaluru', kn: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ', hi: 'बेंगलुरु में' },
                                { en: 'In Pune', kn: 'ಪುಣೆಯಲ್ಲಿ', hi: 'पुणे में' }
                            ]
                        },
                        {
                            q: { en: 'How many people work at the company?', kn: 'ಕಂಪನಿಯಲ್ಲಿ ಎಷ್ಟು ಜನ ಕೆಲಸ ಮಾಡುತ್ತಾರೆ?', hi: 'कंपनी में कितने लोग काम करते हैं?' },
                            options: [
                                { en: 'Forty', kn: 'ನಲವತ್ತು', hi: 'चालीस' },
                                { en: 'Four hundred', kn: 'ನಾನೂರು', hi: 'चार सौ' },
                                { en: 'Fourteen', kn: 'ಹದಿನಾಲ್ಕು', hi: 'चौदह' },
                                { en: 'Two', kn: 'ಎರಡು', hi: 'दो' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'So, what do you do?', kn: 'ಹಾಗಾದರೆ, ನೀವು ಏನು ಕೆಲಸ ಮಾಡುತ್ತೀರಿ?', hi: 'तो, आप क्या काम करते हैं?' },
                    scenario: {
                        en: 'At a business event in Bengaluru, Ananya and Farhan meet for the first time and talk about their jobs.',
                        kn: 'ಬೆಂಗಳೂರಿನ ಒಂದು ಉದ್ಯಮ ಕಾರ್ಯಕ್ರಮದಲ್ಲಿ ಅನನ್ಯಾ ಮತ್ತು ಫರ್ಹಾನ್ ಮೊದಲ ಬಾರಿ ಭೇಟಿಯಾಗಿ ತಮ್ಮ ಕೆಲಸಗಳ ಬಗ್ಗೆ ಮಾತನಾಡುತ್ತಾರೆ.',
                        hi: 'बेंगलुरु के एक बिज़नेस इवेंट में अनन्या और फ़रहान पहली बार मिलते हैं और अपने काम के बारे में बात करते हैं।'
                    },
                    speakers: [{ name: 'Farhan', voice: 'm' }, { name: 'Ananya', voice: 'f' }],
                    lines: [
                        { speaker: 'Farhan', en: "Hi, I'm Farhan from Sahyadri Logistics. What brings you to this event?", kn: 'ನಮಸ್ಕಾರ, ನಾನು ಸಹ್ಯಾದ್ರಿ ಲಾಜಿಸ್ಟಿಕ್ಸ್‌ನಿಂದ ಫರ್ಹಾನ್. ನೀವು ಈ ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಯಾಕೆ ಬಂದಿದ್ದೀರಿ?', hi: 'नमस्ते, मैं सह्याद्री लॉजिस्टिक्स से फ़रहान हूँ। आप इस इवेंट में किस सिलसिले में आई हैं?' },
                        { speaker: 'Ananya', en: "Nice to meet you. I'm Ananya. I head the customer support team at a fintech startup.", kn: 'ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿ ಸಂತೋಷವಾಯಿತು. ನಾನು ಅನನ್ಯಾ, ಒಂದು ಫಿನ್‌ಟೆಕ್ ಸ್ಟಾರ್ಟ್‌ಅಪ್‌ನಲ್ಲಿ ಕಸ್ಟಮರ್ ಸಪೋರ್ಟ್ ತಂಡದ ಮುಖ್ಯಸ್ಥೆ.', hi: 'आपसे मिलकर अच्छा लगा। मैं अनन्या हूँ। मैं एक फ़िनटेक स्टार्टअप में कस्टमर सपोर्ट टीम की प्रमुख हूँ।' },
                        { speaker: 'Farhan', en: 'Interesting. What does your company do, exactly?', kn: 'ಆಸಕ್ತಿಕರ. ನಿಮ್ಮ ಕಂಪನಿ ನಿಖರವಾಗಿ ಏನು ಮಾಡುತ್ತದೆ?', hi: 'दिलचस्प। आपकी कंपनी असल में क्या करती है?' },
                        { speaker: 'Ananya', en: "We've built an app that helps small shopkeepers keep their accounts and accept digital payments.", kn: 'ಸಣ್ಣ ಅಂಗಡಿಯವರಿಗೆ ಲೆಕ್ಕ ಇಡಲು ಮತ್ತು ಡಿಜಿಟಲ್ ಪಾವತಿ ಸ್ವೀಕರಿಸಲು ಸಹಾಯ ಮಾಡುವ ಒಂದು ಆ್ಯಪ್ ಅನ್ನು ನಾವು ತಯಾರಿಸಿದ್ದೇವೆ.', hi: 'हमने एक ऐप बनाया है जो छोटे दुकानदारों को हिसाब रखने और डिजिटल पेमेंट लेने में मदद करता है।' },
                        { speaker: 'Farhan', en: 'And what does a normal day look like for you?', kn: 'ನಿಮ್ಮ ಒಂದು ಸಾಮಾನ್ಯ ದಿನ ಹೇಗಿರುತ್ತದೆ?', hi: 'और आपका एक आम दिन कैसा होता है?' },
                        { speaker: 'Ananya', en: 'I start with a quick call with my team, and then I handle the difficult complaints myself.', kn: 'ನನ್ನ ತಂಡದೊಂದಿಗೆ ಒಂದು ಚಿಕ್ಕ ಕರೆಯಿಂದ ದಿನ ಶುರು ಮಾಡುತ್ತೇನೆ, ನಂತರ ಕಷ್ಟದ ದೂರುಗಳನ್ನು ನಾನೇ ನಿಭಾಯಿಸುತ್ತೇನೆ.', hi: 'मैं अपनी टीम के साथ एक छोटी कॉल से दिन शुरू करती हूँ, फिर मुश्किल शिकायतें ख़ुद संभालती हूँ।' },
                        { speaker: 'Farhan', en: 'That sounds demanding. How big is your team?', kn: 'ಅದು ಸಾಕಷ್ಟು ಶ್ರಮದ ಕೆಲಸದಂತಿದೆ. ನಿಮ್ಮ ತಂಡ ಎಷ್ಟು ದೊಡ್ಡದು?', hi: 'यह तो काफ़ी मेहनत का काम लगता है। आपकी टीम कितनी बड़ी है?' },
                        { speaker: 'Ananya', en: "Twelve people across two shifts. What about you? What's your role?", kn: 'ಎರಡು ಶಿಫ್ಟ್‌ಗಳಲ್ಲಿ ಹನ್ನೆರಡು ಜನ. ನಿಮ್ಮ ಬಗ್ಗೆ ಹೇಳಿ? ನಿಮ್ಮ ಪಾತ್ರ ಏನು?', hi: 'दो शिफ़्टों में बारह लोग। और आप? आपकी भूमिका क्या है?' },
                        { speaker: 'Farhan', en: "I'm a route planner. Basically, I make sure our trucks take the fastest and cheapest roads.", kn: 'ನಾನು ರೂಟ್ ಪ್ಲಾನರ್. ಸರಳವಾಗಿ ಹೇಳಬೇಕೆಂದರೆ, ನಮ್ಮ ಲಾರಿಗಳು ಅತ್ಯಂತ ವೇಗದ ಮತ್ತು ಕಡಿಮೆ ಖರ್ಚಿನ ದಾರಿಯಲ್ಲಿ ಹೋಗುವಂತೆ ನೋಡಿಕೊಳ್ಳುತ್ತೇನೆ.', hi: 'मैं रूट प्लानर हूँ। सीधे शब्दों में, मैं यह पक्का करता हूँ कि हमारे ट्रक सबसे तेज़ और सबसे सस्ते रास्ते से जाएँ।' },
                        { speaker: 'Ananya', en: "So you're the reason my parcels arrive on time! Let's stay in touch.", kn: 'ಅಂದರೆ ನನ್ನ ಪಾರ್ಸೆಲ್‌ಗಳು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಬರುವುದಕ್ಕೆ ನೀವೇ ಕಾರಣ! ಸಂಪರ್ಕದಲ್ಲಿರೋಣ.', hi: 'यानी मेरे पार्सल समय पर आते हैं तो उसकी वजह आप हैं! संपर्क में रहिएगा।' }
                    ],
                    questions: [
                        {
                            q: { en: "What has Ananya's company built?", kn: 'ಅನನ್ಯಾಳ ಕಂಪನಿ ಏನನ್ನು ತಯಾರಿಸಿದೆ?', hi: 'अनन्या की कंपनी ने क्या बनाया है?' },
                            options: [
                                { en: 'An app for small shopkeepers', kn: 'ಸಣ್ಣ ಅಂಗಡಿಯವರಿಗಾಗಿ ಒಂದು ಆ್ಯಪ್', hi: 'छोटे दुकानदारों के लिए एक ऐप' },
                                { en: 'A fleet of trucks', kn: 'ಲಾರಿಗಳ ಒಂದು ಪಡೆ', hi: 'ट्रकों का एक बेड़ा' },
                                { en: 'Software for hospitals', kn: 'ಆಸ್ಪತ್ರೆಗಳಿಗೆ ಸಾಫ್ಟ್‌ವೇರ್', hi: 'अस्पतालों के लिए सॉफ़्टवेयर' },
                                { en: 'Sensors for farmers', kn: 'ರೈತರಿಗೆ ಸೆನ್ಸರ್‌ಗಳು', hi: 'किसानों के लिए सेंसर' }
                            ]
                        },
                        {
                            q: { en: "How many people are in Ananya's team?", kn: 'ಅನನ್ಯಾಳ ತಂಡದಲ್ಲಿ ಎಷ್ಟು ಜನರಿದ್ದಾರೆ?', hi: 'अनन्या की टीम में कितने लोग हैं?' },
                            options: [
                                { en: 'Twelve', kn: 'ಹನ್ನೆರಡು', hi: 'बारह' },
                                { en: 'Six', kn: 'ಆರು', hi: 'छह' },
                                { en: 'Twenty', kn: 'ಇಪ್ಪತ್ತು', hi: 'बीस' },
                                { en: 'Two', kn: 'ಎರಡು', hi: 'दो' }
                            ]
                        },
                        {
                            q: { en: "What is Farhan's job?", kn: 'ಫರ್ಹಾನ್‌ನ ಕೆಲಸ ಏನು?', hi: 'फ़रहान का काम क्या है?' },
                            options: [
                                { en: 'He plans routes for trucks', kn: 'ಅವನು ಲಾರಿಗಳಿಗೆ ದಾರಿ ಯೋಜಿಸುತ್ತಾನೆ', hi: 'वह ट्रकों के रास्ते तय करता है' },
                                { en: 'He drives a truck', kn: 'ಅವನು ಲಾರಿ ಓಡಿಸುತ್ತಾನೆ', hi: 'वह ट्रक चलाता है' },
                                { en: 'He handles complaints', kn: 'ಅವನು ದೂರುಗಳನ್ನು ನಿಭಾಯಿಸುತ್ತಾನೆ', hi: 'वह शिकायतें संभालता है' },
                                { en: 'He builds apps', kn: 'ಅವನು ಆ್ಯಪ್‌ಗಳನ್ನು ತಯಾರಿಸುತ್ತಾನೆ', hi: 'वह ऐप बनाता है' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Someone at a work event asks you, "So, what do you do?" Introduce yourself: say your role and department, describe a normal working day, and explain in simple words what your company does.',
                        sample: "Hi, I'm Kiran. I work as a quality analyst in the testing department of a software company in Mysuru. We build billing and stock software for medical shops across Karnataka. On a normal day, I start by checking the bug reports from the night before. Then I test new features and handle questions from the developers. Twice a week, I supervise two interns and review their work. What I enjoy most is that real pharmacists use our software every day, so when I do my job well, their work becomes easier. What about you? What does your company do?",
                        checklist: ['I said my name and my role', 'I named my department or team', 'I described a normal working day', 'I explained what my company does in simple words', 'I asked the other person a question back']
                    }
                }
            ]
        },
        '2:1': {
            name: 'Online meetings',
            lessons: [
                {
                    kind: 'words', title: 'Joining a call', list: [
                        { en: 'mute', kn: 'ಮ್ಯೂಟ್ ಮಾಡು', hi: 'म्यूट करना', pic: '🔇', def: 'to turn off your microphone so that others cannot hear you' },
                        { en: 'webcam', kn: 'ವೆಬ್‌ಕ್ಯಾಮ್', hi: 'वेबकैम', pic: '📷', def: 'a small camera on a computer used for video calls' },
                        { en: 'headset', kn: 'ಹೆಡ್‌ಸೆಟ್', hi: 'हेडसेट', pic: '🎧', def: 'headphones with a small microphone attached' },
                        { en: 'waiting room', kn: 'ವೇಟಿಂಗ್ ರೂಮ್', hi: 'वेटिंग रूम', pic: '🚪', def: 'the place in an online meeting where people wait until the host lets them in' },
                        { en: 'host', kn: 'ಮೀಟಿಂಗ್ ಹೋಸ್ಟ್', hi: 'मीटिंग होस्ट', pic: '🧑‍💻', def: 'the person who starts and controls an online meeting' },
                        { en: 'participant', kn: 'ಭಾಗವಹಿಸುವವರು', hi: 'प्रतिभागी', pic: '🙋', def: 'a person who takes part in a meeting or event' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Online meetings 1', list: [
                        { read: true, en: 'Could everyone please mute themselves unless they are speaking?', kn: 'ಮಾತನಾಡದೇ ಇರುವಾಗ ದಯವಿಟ್ಟು ಎಲ್ಲರೂ ಮ್ಯೂಟ್ ಮಾಡಿಕೊಳ್ಳಿ.', hi: 'जब आप बोल नहीं रहे हों, तो कृपया सब अपना माइक म्यूट रखें।', acc: { en: ['Could everyone please mute unless they are speaking?'] } },
                        { read: true, en: "I've just sent the meeting link in the team chat.", kn: 'ನಾನು ಈಗಷ್ಟೇ ಟೀಮ್ ಚಾಟ್‌ನಲ್ಲಿ ಮೀಟಿಂಗ್ ಲಿಂಕ್ ಕಳುಹಿಸಿದ್ದೇನೆ.', hi: 'मैंने अभी-अभी टीम चैट में मीटिंग का लिंक भेज दिया है।' },
                        { en: 'Your webcam is off, Ravi; could you switch it on for a minute?', kn: 'ರವಿ, ನಿಮ್ಮ ವೆಬ್‌ಕ್ಯಾಮ್ ಆಫ್ ಆಗಿದೆ; ಒಂದು ನಿಮಿಷ ಆನ್ ಮಾಡುತ್ತೀರಾ?', hi: 'रवि, आपका वेबकैम बंद है; क्या आप एक मिनट के लिए इसे चालू करेंगे?' },
                        { read: true, en: 'Only the host can let participants in from the waiting room.', kn: 'ವೇಟಿಂಗ್ ರೂಮ್‌ನಿಂದ ಭಾಗವಹಿಸುವವರನ್ನು ಒಳಗೆ ಬಿಡಲು ಹೋಸ್ಟ್‌ಗೆ ಮಾತ್ರ ಸಾಧ್ಯ.', hi: 'वेटिंग रूम से प्रतिभागियों को अंदर सिर्फ़ होस्ट ही ला सकता है।' },
                        { en: "Please wear a headset so we don't hear the traffic behind you.", kn: 'ನಿಮ್ಮ ಹಿಂದಿನ ಟ್ರಾಫಿಕ್ ಶಬ್ದ ನಮಗೆ ಕೇಳಿಸದಂತೆ ದಯವಿಟ್ಟು ಹೆಡ್‌ಸೆಟ್ ಹಾಕಿಕೊಳ್ಳಿ.', hi: 'कृपया हेडसेट लगा लीजिए ताकि हमें आपके पीछे का ट्रैफ़िक सुनाई न दे।' }
                    ]
                },
                {
                    kind: 'words', title: 'When the call goes wrong', list: [
                        { en: 'unstable', kn: 'ಅಸ್ಥಿರ', hi: 'अस्थिर', pic: '📶', def: 'likely to change, drop or fail suddenly' },
                        { en: 'lag', kn: 'ವಿಳಂಬ', hi: 'देरी', pic: '🐢', def: 'a delay between something happening and others seeing or hearing it' },
                        { en: 'freeze', kn: 'ನಿಂತುಹೋಗು', hi: 'अटक जाना', pic: '🥶', def: 'when a screen or picture suddenly stops moving' },
                        { en: 'echo', kn: 'ಪ್ರತಿಧ್ವನಿ', hi: 'गूँज', pic: '🔊', def: 'a sound that you hear again because it bounces back' },
                        { en: 'recording', kn: 'ರೆಕಾರ್ಡಿಂಗ್', hi: 'रिकॉर्डिंग', pic: '⏺️', def: 'a saved copy of sound or video that you can play later' },
                        { en: 'follow-up', kn: 'ಫಾಲೋ-ಅಪ್', hi: 'फ़ॉलो-अप', pic: '📧', def: 'a message or action that comes after a meeting' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Online meetings 2', list: [
                        { read: true, en: "Sorry, my connection is unstable; I'll turn off my video.", kn: 'ಕ್ಷಮಿಸಿ, ನನ್ನ ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಅಸ್ಥಿರವಾಗಿದೆ; ನಾನು ವಿಡಿಯೋ ಆಫ್ ಮಾಡುತ್ತೇನೆ.', hi: 'माफ़ कीजिए, मेरा कनेक्शन अस्थिर है; मैं वीडियो बंद कर देता हूँ।' },
                        { en: "There's a lag of a few seconds, so let's not talk over each other.", kn: 'ಕೆಲವು ಸೆಕೆಂಡುಗಳ ವಿಳಂಬ ಇದೆ, ಹಾಗಾಗಿ ಒಬ್ಬರ ಮಾತಿನ ಮೇಲೆ ಇನ್ನೊಬ್ಬರು ಮಾತನಾಡುವುದು ಬೇಡ.', hi: 'कुछ सेकंड की देरी है, इसलिए एक-दूसरे की बात के बीच में न बोलें।' },
                        { read: true, en: 'Your screen has frozen; could you share it again?', kn: 'ನಿಮ್ಮ ಸ್ಕ್ರೀನ್ ನಿಂತುಹೋಗಿದೆ; ಮತ್ತೊಮ್ಮೆ ಶೇರ್ ಮಾಡುತ್ತೀರಾ?', hi: 'आपकी स्क्रीन अटक गई है; क्या आप उसे फिर से शेयर करेंगे?' },
                        { en: "I can hear an echo; someone's laptop speaker is too close to their mic.", kn: 'ನನಗೆ ಪ್ರತಿಧ್ವನಿ ಕೇಳಿಸುತ್ತಿದೆ; ಯಾರದೋ ಲ್ಯಾಪ್‌ಟಾಪ್ ಸ್ಪೀಕರ್ ಮೈಕ್‌ಗೆ ತುಂಬಾ ಹತ್ತಿರ ಇದೆ.', hi: 'मुझे गूँज सुनाई दे रही है; किसी के लैपटॉप का स्पीकर माइक के बहुत पास है।' },
                        { read: true, en: "I'll share the recording and a short follow-up email by this evening.", kn: 'ಇಂದು ಸಂಜೆಯೊಳಗೆ ನಾನು ರೆಕಾರ್ಡಿಂಗ್ ಮತ್ತು ಒಂದು ಚಿಕ್ಕ ಫಾಲೋ-ಅಪ್ ಇಮೇಲ್ ಕಳುಹಿಸುತ್ತೇನೆ.', hi: 'आज शाम तक मैं रिकॉर्डिंग और एक छोटा फ़ॉलो-अप ईमेल भेज दूँगा।', acc: { en: ["I'll send the recording and a short follow-up email by this evening."] } }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'The call that kept freezing', kn: 'ಪದೇ ಪದೇ ನಿಂತುಹೋಗುತ್ತಿದ್ದ ಕರೆ', hi: 'बार-बार अटकने वाली कॉल' },
                    text: {
                        en: 'Every Monday, Deepa hosts a video call between her team in Mysuru and the sales team in Pune. Last week, the call started badly. Twelve participants joined, but three of them could not open the link. Then there was a loud echo, because Suresh had joined from his laptop and his phone at the same time. When Deepa began to share her screen, it froze, and her voice reached Pune with a long lag. She calmly asked everyone to mute, switch off their webcams and use headsets. The connection improved, and the meeting ended only ten minutes late. That evening, Deepa sent the recording and a clear follow-up email listing every decision and deadline.',
                        kn: 'ಪ್ರತಿ ಸೋಮವಾರ ದೀಪಾ ಮೈಸೂರಿನ ತನ್ನ ತಂಡ ಮತ್ತು ಪುಣೆಯ ಮಾರಾಟ ತಂಡದ ನಡುವೆ ಒಂದು ವಿಡಿಯೋ ಕರೆಯನ್ನು ಆಯೋಜಿಸುತ್ತಾಳೆ. ಕಳೆದ ವಾರ ಕರೆ ಸರಿಯಾಗಿ ಶುರುವಾಗಲಿಲ್ಲ. ಹನ್ನೆರಡು ಜನ ಭಾಗವಹಿಸುವವರು ಸೇರಿಕೊಂಡರು, ಆದರೆ ಅವರಲ್ಲಿ ಮೂವರಿಗೆ ಲಿಂಕ್ ತೆರೆಯಲು ಆಗಲಿಲ್ಲ. ನಂತರ ಜೋರಾದ ಪ್ರತಿಧ್ವನಿ ಕೇಳಿಸಿತು, ಏಕೆಂದರೆ ಸುರೇಶ್ ಒಂದೇ ಸಮಯದಲ್ಲಿ ಲ್ಯಾಪ್‌ಟಾಪ್ ಮತ್ತು ಫೋನ್ ಎರಡರಿಂದಲೂ ಸೇರಿಕೊಂಡಿದ್ದ. ದೀಪಾ ತನ್ನ ಸ್ಕ್ರೀನ್ ಶೇರ್ ಮಾಡಲು ಶುರು ಮಾಡಿದಾಗ ಅದು ನಿಂತುಹೋಯಿತು, ಮತ್ತು ಅವಳ ಧ್ವನಿ ತುಂಬಾ ತಡವಾಗಿ ಪುಣೆಗೆ ತಲುಪುತ್ತಿತ್ತು. ಅವಳು ಶಾಂತವಾಗಿ ಎಲ್ಲರಿಗೂ ಮ್ಯೂಟ್ ಮಾಡಲು, ವೆಬ್‌ಕ್ಯಾಮ್ ಆಫ್ ಮಾಡಲು ಮತ್ತು ಹೆಡ್‌ಸೆಟ್ ಬಳಸಲು ಹೇಳಿದಳು. ಸಂಪರ್ಕ ಸುಧಾರಿಸಿತು, ಮತ್ತು ಮೀಟಿಂಗ್ ಕೇವಲ ಹತ್ತು ನಿಮಿಷ ತಡವಾಗಿ ಮುಗಿಯಿತು. ಅದೇ ಸಂಜೆ ದೀಪಾ ರೆಕಾರ್ಡಿಂಗ್ ಮತ್ತು ಪ್ರತಿಯೊಂದು ನಿರ್ಧಾರ ಹಾಗೂ ಗಡುವನ್ನು ಪಟ್ಟಿ ಮಾಡಿದ ಸ್ಪಷ್ಟ ಫಾಲೋ-ಅಪ್ ಇಮೇಲ್ ಕಳುಹಿಸಿದಳು.',
                        hi: 'हर सोमवार दीपा मैसूरु की अपनी टीम और पुणे की सेल्स टीम के बीच एक वीडियो कॉल होस्ट करती है। पिछले हफ़्ते कॉल की शुरुआत ख़राब रही। बारह प्रतिभागी जुड़े, लेकिन उनमें से तीन लिंक नहीं खोल पाए। फिर ज़ोर की गूँज सुनाई दी, क्योंकि सुरेश एक ही समय पर अपने लैपटॉप और फ़ोन दोनों से जुड़ गया था। जब दीपा ने अपनी स्क्रीन शेयर करनी शुरू की, तो वह अटक गई, और उसकी आवाज़ बहुत देरी से पुणे पहुँच रही थी। उसने शांति से सबसे कहा कि माइक म्यूट करें, वेबकैम बंद करें और हेडसेट लगाएँ। कनेक्शन सुधर गया, और मीटिंग सिर्फ़ दस मिनट देर से ख़त्म हुई। उसी शाम दीपा ने रिकॉर्डिंग और एक साफ़ फ़ॉलो-अप ईमेल भेजा, जिसमें हर फ़ैसला और हर डेडलाइन लिखी थी।'
                    },
                    questions: [
                        {
                            q: { en: 'Why was there a loud echo?', kn: 'ಜೋರಾದ ಪ್ರತಿಧ್ವನಿ ಯಾಕೆ ಕೇಳಿಸಿತು?', hi: 'ज़ोर की गूँज क्यों सुनाई दी?' },
                            options: [
                                { en: 'Suresh joined from two devices at once', kn: 'ಸುರೇಶ್ ಒಂದೇ ಸಮಯದಲ್ಲಿ ಎರಡು ಸಾಧನಗಳಿಂದ ಸೇರಿಕೊಂಡಿದ್ದ', hi: 'सुरेश एक साथ दो डिवाइस से जुड़ गया था' },
                                { en: "Deepa's headset was broken", kn: 'ದೀಪಾಳ ಹೆಡ್‌ಸೆಟ್ ಹಾಳಾಗಿತ್ತು', hi: 'दीपा का हेडसेट ख़राब था' },
                                { en: 'The Pune office was very noisy', kn: 'ಪುಣೆ ಕಚೇರಿಯಲ್ಲಿ ತುಂಬಾ ಗದ್ದಲವಿತ್ತು', hi: 'पुणे के दफ़्तर में बहुत शोर था' },
                                { en: 'The link was wrong', kn: 'ಲಿಂಕ್ ತಪ್ಪಾಗಿತ್ತು', hi: 'लिंक ग़लत था' }
                            ]
                        },
                        {
                            q: { en: 'What did Deepa ask everyone to do?', kn: 'ದೀಪಾ ಎಲ್ಲರಿಗೂ ಏನು ಮಾಡಲು ಹೇಳಿದಳು?', hi: 'दीपा ने सबसे क्या करने को कहा?' },
                            options: [
                                { en: 'Mute, switch off webcams and use headsets', kn: 'ಮ್ಯೂಟ್ ಮಾಡಲು, ವೆಬ್‌ಕ್ಯಾಮ್ ಆಫ್ ಮಾಡಲು ಮತ್ತು ಹೆಡ್‌ಸೆಟ್ ಬಳಸಲು', hi: 'म्यूट करने, वेबकैम बंद करने और हेडसेट लगाने को' },
                                { en: 'Leave and join again tomorrow', kn: 'ಹೊರಹೋಗಿ ನಾಳೆ ಮತ್ತೆ ಸೇರಲು', hi: 'निकलकर कल फिर से जुड़ने को' },
                                { en: 'Call her on the phone', kn: 'ಅವಳಿಗೆ ಫೋನ್ ಮಾಡಲು', hi: 'उसे फ़ोन करने को' },
                                { en: 'Come to the Mysuru office', kn: 'ಮೈಸೂರು ಕಚೇರಿಗೆ ಬರಲು', hi: 'मैसूरु के दफ़्तर आने को' }
                            ]
                        },
                        {
                            q: { en: 'What did Deepa send that evening?', kn: 'ಅಂದು ಸಂಜೆ ದೀಪಾ ಏನು ಕಳುಹಿಸಿದಳು?', hi: 'उस शाम दीपा ने क्या भेजा?' },
                            options: [
                                { en: 'The recording and a follow-up email', kn: 'ರೆಕಾರ್ಡಿಂಗ್ ಮತ್ತು ಫಾಲೋ-ಅಪ್ ಇಮೇಲ್', hi: 'रिकॉर्डिंग और फ़ॉलो-अप ईमेल' },
                                { en: 'A new meeting link', kn: 'ಹೊಸ ಮೀಟಿಂಗ್ ಲಿಂಕ್', hi: 'मीटिंग का नया लिंक' },
                                { en: 'A list of people who were late', kn: 'ತಡವಾಗಿ ಬಂದವರ ಪಟ್ಟಿ', hi: 'देर से आने वालों की सूची' },
                                { en: 'A new headset for Suresh', kn: 'ಸುರೇಶ್‌ಗೆ ಹೊಸ ಹೆಡ್‌ಸೆಟ್', hi: 'सुरेश के लिए नया हेडसेट' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Can you see my screen?', kn: 'ನನ್ನ ಸ್ಕ್ರೀನ್ ಕಾಣಿಸುತ್ತಿದೆಯೇ?', hi: 'क्या मेरी स्क्रीन दिख रही है?' },
                    scenario: {
                        en: 'Karthik joins an online project meeting from his home in Hubballi. Meera, the host, helps him with his sound and his screen.',
                        kn: 'ಕಾರ್ತಿಕ್ ಹುಬ್ಬಳ್ಳಿಯ ತನ್ನ ಮನೆಯಿಂದ ಒಂದು ಆನ್‌ಲೈನ್ ಪ್ರಾಜೆಕ್ಟ್ ಮೀಟಿಂಗ್‌ಗೆ ಸೇರುತ್ತಾನೆ. ಮೀಟಿಂಗ್‌ನ ಹೋಸ್ಟ್ ಮೀರಾ ಅವನಿಗೆ ಧ್ವನಿ ಮತ್ತು ಸ್ಕ್ರೀನ್ ವಿಷಯದಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತಾಳೆ.',
                        hi: 'कार्तिक हुब्बल्ली में अपने घर से एक ऑनलाइन प्रोजेक्ट मीटिंग में जुड़ता है। मीटिंग की होस्ट मीरा आवाज़ और स्क्रीन में उसकी मदद करती है।'
                    },
                    speakers: [{ name: 'Meera', voice: 'f' }, { name: 'Karthik', voice: 'm' }],
                    lines: [
                        { speaker: 'Meera', en: "Hi Karthik, we can see you, but you're on mute.", kn: 'ಹಾಯ್ ಕಾರ್ತಿಕ್, ನೀವು ಕಾಣಿಸುತ್ತಿದ್ದೀರಿ, ಆದರೆ ನೀವು ಮ್ಯೂಟ್‌ನಲ್ಲಿದ್ದೀರಿ.', hi: 'हाय कार्तिक, आप दिख रहे हैं, लेकिन आप म्यूट पर हैं।' },
                        { speaker: 'Karthik', en: 'Sorry about that. Can you hear me now?', kn: 'ಕ್ಷಮಿಸಿ. ಈಗ ನನ್ನ ಧ್ವನಿ ಕೇಳಿಸುತ್ತಿದೆಯೇ?', hi: 'माफ़ कीजिए। क्या अब मेरी आवाज़ आ रही है?' },
                        { speaker: 'Meera', en: 'Yes, loud and clear. Could you share your screen and walk us through the test results?', kn: 'ಹೌದು, ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸುತ್ತಿದೆ. ನಿಮ್ಮ ಸ್ಕ್ರೀನ್ ಶೇರ್ ಮಾಡಿ ಟೆಸ್ಟ್ ಫಲಿತಾಂಶಗಳನ್ನು ನಮಗೆ ವಿವರಿಸುತ್ತೀರಾ?', hi: 'हाँ, बिल्कुल साफ़। क्या आप अपनी स्क्रीन शेयर करके हमें टेस्ट के नतीजे समझा देंगे?' },
                        { speaker: 'Karthik', en: 'Sure, give me a second. Can everyone see my screen?', kn: 'ಖಂಡಿತ, ಒಂದು ಕ್ಷಣ. ಎಲ್ಲರಿಗೂ ನನ್ನ ಸ್ಕ್ರೀನ್ ಕಾಣಿಸುತ್ತಿದೆಯೇ?', hi: 'ज़रूर, एक सेकंड दीजिए। क्या सबको मेरी स्क्रीन दिख रही है?' },
                        { speaker: 'Meera', en: 'We can see a spreadsheet, but it seems to have frozen.', kn: 'ಒಂದು ಸ್ಪ್ರೆಡ್‌ಶೀಟ್ ಕಾಣಿಸುತ್ತಿದೆ, ಆದರೆ ಅದು ನಿಂತುಹೋದಂತಿದೆ.', hi: 'एक स्प्रेडशीट दिख रही है, लेकिन लगता है वह अटक गई है।' },
                        { speaker: 'Karthik', en: 'My connection keeps dropping. Let me switch off my video and try again.', kn: 'ನನ್ನ ಸಂಪರ್ಕ ಪದೇ ಪದೇ ಕಡಿತಗೊಳ್ಳುತ್ತಿದೆ. ವಿಡಿಯೋ ಆಫ್ ಮಾಡಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸುತ್ತೇನೆ.', hi: 'मेरा कनेक्शन बार-बार टूट रहा है। मैं वीडियो बंद करके फिर से कोशिश करता हूँ।' },
                        { speaker: 'Meera', en: "Much better, it's moving now. Please go ahead.", kn: 'ಈಗ ತುಂಬಾ ಉತ್ತಮ, ಸ್ಕ್ರೀನ್ ಚಲಿಸುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಮುಂದುವರಿಸಿ.', hi: 'अब काफ़ी बेहतर है, स्क्रीन चल रही है। कृपया आगे बढ़िए।' },
                        { speaker: 'Karthik', en: "Thanks. As you can see, ninety per cent of this week's tests have passed.", kn: 'ಧನ್ಯವಾದ. ನೀವು ನೋಡುವಂತೆ, ಈ ವಾರದ ಶೇಕಡಾ ತೊಂಬತ್ತರಷ್ಟು ಟೆಸ್ಟ್‌ಗಳು ಪಾಸ್ ಆಗಿವೆ.', hi: 'धन्यवाद। जैसा कि आप देख सकते हैं, इस हफ़्ते के नब्बे प्रतिशत टेस्ट पास हो गए हैं।' },
                        { speaker: 'Meera', en: "Great work. I'm recording this, so the Pune team can watch it later.", kn: 'ಒಳ್ಳೆಯ ಕೆಲಸ. ನಾನು ಇದನ್ನು ರೆಕಾರ್ಡ್ ಮಾಡುತ್ತಿದ್ದೇನೆ, ಹಾಗಾಗಿ ಪುಣೆ ತಂಡ ಆಮೇಲೆ ನೋಡಬಹುದು.', hi: 'बढ़िया काम। मैं इसे रिकॉर्ड कर रही हूँ, ताकि पुणे की टीम इसे बाद में देख सके।' },
                        { speaker: 'Karthik', en: "Perfect. I'll also send a short follow-up with the failed tests after the call.", kn: 'ಸರಿ. ಕರೆಯ ನಂತರ ಫೇಲ್ ಆದ ಟೆಸ್ಟ್‌ಗಳ ಬಗ್ಗೆ ಒಂದು ಚಿಕ್ಕ ಫಾಲೋ-ಅಪ್ ಕೂಡ ಕಳುಹಿಸುತ್ತೇನೆ.', hi: 'बढ़िया। कॉल के बाद मैं फ़ेल हुए टेस्ट के बारे में एक छोटा फ़ॉलो-अप भी भेज दूँगा।' }
                    ],
                    questions: [
                        {
                            q: { en: "What was Karthik's first problem?", kn: 'ಕಾರ್ತಿಕ್‌ನ ಮೊದಲ ಸಮಸ್ಯೆ ಏನಾಗಿತ್ತು?', hi: 'कार्तिक की पहली समस्या क्या थी?' },
                            options: [
                                { en: 'He was on mute', kn: 'ಅವನು ಮ್ಯೂಟ್‌ನಲ್ಲಿದ್ದ', hi: 'वह म्यूट पर था' },
                                { en: 'He had no laptop', kn: 'ಅವನ ಬಳಿ ಲ್ಯಾಪ್‌ಟಾಪ್ ಇರಲಿಲ್ಲ', hi: 'उसके पास लैपटॉप नहीं था' },
                                { en: 'He joined the wrong meeting', kn: 'ಅವನು ತಪ್ಪು ಮೀಟಿಂಗ್‌ಗೆ ಸೇರಿದ್ದ', hi: 'वह ग़लत मीटिंग में जुड़ गया था' },
                                { en: 'His webcam was broken', kn: 'ಅವನ ವೆಬ್‌ಕ್ಯಾಮ್ ಹಾಳಾಗಿತ್ತು', hi: 'उसका वेबकैम ख़राब था' }
                            ]
                        },
                        {
                            q: { en: 'How did Karthik fix the frozen screen?', kn: 'ನಿಂತುಹೋದ ಸ್ಕ್ರೀನ್ ಅನ್ನು ಕಾರ್ತಿಕ್ ಹೇಗೆ ಸರಿಪಡಿಸಿದ?', hi: 'कार्तिक ने अटकी हुई स्क्रीन को कैसे ठीक किया?' },
                            options: [
                                { en: 'He switched off his video', kn: 'ಅವನು ತನ್ನ ವಿಡಿಯೋ ಆಫ್ ಮಾಡಿದ', hi: 'उसने अपना वीडियो बंद किया' },
                                { en: 'He bought a new headset', kn: 'ಅವನು ಹೊಸ ಹೆಡ್‌ಸೆಟ್ ಖರೀದಿಸಿದ', hi: 'उसने नया हेडसेट ख़रीदा' },
                                { en: 'He called Meera on the phone', kn: 'ಅವನು ಮೀರಾಗೆ ಫೋನ್ ಮಾಡಿದ', hi: 'उसने मीरा को फ़ोन किया' },
                                { en: 'He went to the office', kn: 'ಅವನು ಕಚೇರಿಗೆ ಹೋದ', hi: 'वह दफ़्तर चला गया' }
                            ]
                        },
                        {
                            q: { en: 'Why is Meera recording the meeting?', kn: 'ಮೀರಾ ಮೀಟಿಂಗ್ ಅನ್ನು ಯಾಕೆ ರೆಕಾರ್ಡ್ ಮಾಡುತ್ತಿದ್ದಾಳೆ?', hi: 'मीरा मीटिंग रिकॉर्ड क्यों कर रही है?' },
                            options: [
                                { en: 'So the Pune team can watch it later', kn: 'ಪುಣೆ ತಂಡ ಆಮೇಲೆ ನೋಡಲಿ ಎಂದು', hi: 'ताकि पुणे की टीम बाद में देख सके' },
                                { en: 'To check who was late', kn: 'ಯಾರು ತಡವಾಗಿ ಬಂದರು ಎಂದು ನೋಡಲು', hi: 'यह देखने के लिए कि कौन देर से आया' },
                                { en: 'Because Karthik asked her to', kn: 'ಕಾರ್ತಿಕ್ ಕೇಳಿದ್ದರಿಂದ', hi: 'क्योंकि कार्तिक ने कहा था' },
                                { en: 'To send it to a client', kn: 'ಒಬ್ಬ ಕ್ಲೈಂಟ್‌ಗೆ ಕಳುಹಿಸಲು', hi: 'किसी क्लाइंट को भेजने के लिए' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'You are hosting an online meeting and things go wrong: someone is not muted, one person cannot see your screen, and your own video keeps freezing. Speak to the group, solve the problems politely, and then start the meeting.',
                        sample: "Good morning, everyone, and thanks for joining. Before we begin, there's some background noise, so could everyone please mute themselves unless they're speaking? Thank you. Rohit, you said you can't see my screen. Let me stop sharing and share it again. Can everyone see the slide with the sales numbers now? Great. My video keeps freezing because my connection is weak today, so I'll switch off my camera. I'm also recording the call for those who couldn't join, and I'll send a short follow-up email by this evening. Right, let's get started with the first point.",
                        checklist: ['I greeted everyone and thanked them for joining', 'I politely asked people to mute', 'I fixed the screen-sharing problem and checked that everyone could see', 'I explained what I would do about my weak connection', 'I mentioned the recording or a follow-up', 'I started the meeting clearly']
                    }
                }
            ]
        },
        '3:1': {
            name: 'Giving a presentation',
            lessons: [
                {
                    kind: 'words', title: 'Planning a talk', list: [
                        { en: 'slide', kn: 'ಸ್ಲೈಡ್', hi: 'स्लाइड', pic: '🖼️', def: 'one page of a presentation shown on a screen' },
                        { en: 'outline', kn: 'ರೂಪರೇಷೆ', hi: 'रूपरेखा', pic: '📝', def: 'a short plan of the main points of a talk or piece of writing' },
                        { en: 'overview', kn: 'ಸಂಕ್ಷಿಪ್ತ ಪರಿಚಯ', hi: 'संक्षिप्त विवरण', pic: '🗺️', def: 'a short general description without many details' },
                        { en: 'chart', kn: 'ಚಾರ್ಟ್', hi: 'चार्ट', pic: '📊', def: 'a picture that shows numbers as bars, lines or circles' },
                        { en: 'highlight', kn: 'ಎತ್ತಿ ತೋರಿಸು', hi: 'उजागर करना', pic: '🖍️', def: 'to point out the most important part of something' },
                        { en: 'figure', kn: 'ಅಂಕಿಅಂಶ', hi: 'आँकड़ा', pic: '🔢', def: 'a number, especially an official amount or total' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Giving a presentation 1', list: [
                        { read: true, en: "Let me start with a quick overview of what we'll cover today.", kn: 'ಇಂದು ನಾವು ಏನೇನು ಚರ್ಚಿಸುತ್ತೇವೆ ಎಂಬುದರ ಸಂಕ್ಷಿಪ್ತ ಪರಿಚಯದೊಂದಿಗೆ ಶುರು ಮಾಡುತ್ತೇನೆ.', hi: 'मैं शुरुआत इस संक्षिप्त विवरण से करता हूँ कि आज हम किन बातों पर चर्चा करेंगे।' },
                        { read: true, en: 'As you can see on this slide, sales doubled after March.', kn: 'ಈ ಸ್ಲೈಡ್‌ನಲ್ಲಿ ನೀವು ನೋಡುವಂತೆ, ಮಾರ್ಚ್ ನಂತರ ಮಾರಾಟ ದುಪ್ಪಟ್ಟಾಯಿತು.', hi: 'जैसा कि आप इस स्लाइड पर देख सकते हैं, मार्च के बाद बिक्री दोगुनी हो गई।' },
                        { en: "I've kept the outline simple: problem, solution, cost and timeline.", kn: 'ನಾನು ರೂಪರೇಷೆಯನ್ನು ಸರಳವಾಗಿ ಇಟ್ಟಿದ್ದೇನೆ: ಸಮಸ್ಯೆ, ಪರಿಹಾರ, ವೆಚ್ಚ ಮತ್ತು ಸಮಯಾವಧಿ.', hi: 'मैंने रूपरेखा सरल रखी है: समस्या, समाधान, लागत और समय-सीमा।' },
                        { read: true, en: 'This chart shows our monthly figures for the last two years.', kn: 'ಈ ಚಾರ್ಟ್ ಕಳೆದ ಎರಡು ವರ್ಷಗಳ ನಮ್ಮ ತಿಂಗಳ ಅಂಕಿಅಂಶಗಳನ್ನು ತೋರಿಸುತ್ತದೆ.', hi: 'यह चार्ट पिछले दो सालों के हमारे मासिक आँकड़े दिखाता है।' },
                        { en: "I'd like to highlight one figure in particular: our costs fell by twelve per cent.", kn: 'ನಾನು ಒಂದು ಅಂಕಿಅಂಶವನ್ನು ವಿಶೇಷವಾಗಿ ಎತ್ತಿ ತೋರಿಸಲು ಬಯಸುತ್ತೇನೆ: ನಮ್ಮ ವೆಚ್ಚ ಶೇಕಡಾ ಹನ್ನೆರಡರಷ್ಟು ಕಡಿಮೆಯಾಗಿದೆ.', hi: 'मैं ख़ास तौर पर एक आँकड़े पर ध्यान दिलाना चाहूँगा: हमारी लागत बारह प्रतिशत घटी है।', acc: { en: ["I'd like to highlight one figure in particular: our costs fell by twelve percent."] } }
                    ]
                },
                {
                    kind: 'words', title: 'In front of the room', list: [
                        { en: 'projector', kn: 'ಪ್ರೊಜೆಕ್ಟರ್', hi: 'प्रोजेक्टर', pic: '📽️', def: 'a machine that shows pictures from a computer on a big screen' },
                        { en: 'rehearse', kn: 'ಪೂರ್ವಾಭ್ಯಾಸ ಮಾಡು', hi: 'रिहर्सल करना', pic: '🎤', def: 'to practise a talk or performance before the real event' },
                        { en: 'handout', kn: 'ಹ್ಯಾಂಡ್‌ಔಟ್', hi: 'हैंडआउट', pic: '📄', def: 'a printed sheet of information given to people at a talk' },
                        { en: 'clarify', kn: 'ಸ್ಪಷ್ಟಪಡಿಸು', hi: 'स्पष्ट करना', pic: '💡', def: 'to make something clearer and easier to understand' },
                        { en: 'conclude', kn: 'ಮುಕ್ತಾಯಗೊಳಿಸು', hi: 'समापन करना', pic: '🏁', def: 'to bring a talk or piece of writing to an end' },
                        { en: 'summarise', kn: 'ಸಾರಾಂಶ ಹೇಳು', hi: 'सारांश बताना', pic: '🗒️', def: 'to give the main points of something in a few words' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Giving a presentation 2', list: [
                        { read: true, en: 'Could someone check the projector? The slides look very dark.', kn: 'ಯಾರಾದರೂ ಪ್ರೊಜೆಕ್ಟರ್ ನೋಡುತ್ತೀರಾ? ಸ್ಲೈಡ್‌ಗಳು ತುಂಬಾ ಕತ್ತಲಾಗಿ ಕಾಣುತ್ತಿವೆ.', hi: 'क्या कोई प्रोजेक्टर देख सकता है? स्लाइडें बहुत धुँधली दिख रही हैं।' },
                        { en: 'I rehearsed the whole talk twice, so I know exactly how long it takes.', kn: 'ನಾನು ಇಡೀ ಭಾಷಣವನ್ನು ಎರಡು ಬಾರಿ ಪೂರ್ವಾಭ್ಯಾಸ ಮಾಡಿದ್ದೇನೆ, ಹಾಗಾಗಿ ಅದಕ್ಕೆ ಎಷ್ಟು ಸಮಯ ಬೇಕು ಎಂದು ನನಗೆ ಗೊತ್ತು.', hi: 'मैंने पूरी प्रस्तुति की दो बार रिहर्सल की है, इसलिए मुझे ठीक-ठीक पता है कि इसमें कितना समय लगता है।' },
                        { read: true, en: "There's a handout with all the numbers, so you don't need to take notes.", kn: 'ಎಲ್ಲಾ ಅಂಕಿಗಳಿರುವ ಒಂದು ಹ್ಯಾಂಡ್‌ಔಟ್ ಇದೆ, ಹಾಗಾಗಿ ನೀವು ನೋಟ್ಸ್ ಬರೆದುಕೊಳ್ಳುವ ಅಗತ್ಯವಿಲ್ಲ.', hi: 'सारे आँकड़ों वाला एक हैंडआउट है, इसलिए आपको नोट्स लेने की ज़रूरत नहीं है।' },
                        { en: "That's a good question; let me clarify what I meant by total cost.", kn: 'ಒಳ್ಳೆಯ ಪ್ರಶ್ನೆ; ಒಟ್ಟು ವೆಚ್ಚ ಎಂದು ನಾನು ಯಾವ ಅರ್ಥದಲ್ಲಿ ಹೇಳಿದೆ ಎಂದು ಸ್ಪಷ್ಟಪಡಿಸುತ್ತೇನೆ.', hi: 'अच्छा सवाल है; मैं स्पष्ट कर दूँ कि कुल लागत से मेरा क्या मतलब था।' },
                        { read: true, en: 'To conclude, let me summarise the three main points in one minute.', kn: 'ಕೊನೆಯದಾಗಿ, ಮೂರು ಮುಖ್ಯ ಅಂಶಗಳ ಸಾರಾಂಶವನ್ನು ಒಂದು ನಿಮಿಷದಲ್ಲಿ ಹೇಳುತ್ತೇನೆ.', hi: 'अंत में, मैं तीनों मुख्य बातों का सारांश एक मिनट में बता देता हूँ।', acc: { en: ['To conclude, let me summarize the three main points in one minute.'] } }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: "Rekha's big day", kn: 'ರೇಖಾಳ ಮಹತ್ವದ ದಿನ', hi: 'रेखा का बड़ा दिन' },
                    text: {
                        en: "Rekha, a marketing executive in Hubballi, had to present the yearly results to the company's directors. She prepared a simple outline and only eight slides, each with one clear chart. The night before, she rehearsed the whole talk three times in front of her sister. On the day, the projector in the meeting room stopped working five minutes before she began. Luckily, Rekha had printed handouts with all the important figures. She opened with a short overview and then highlighted how much the delivery costs had fallen. When a director asked about the new shop in Belagavi, she calmly clarified the numbers. She concluded by summarising her three main points, and the directors thanked her for being so clear.",
                        kn: 'ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ ಮಾರ್ಕೆಟಿಂಗ್ ಎಕ್ಸಿಕ್ಯೂಟಿವ್ ಆಗಿರುವ ರೇಖಾ ಕಂಪನಿಯ ನಿರ್ದೇಶಕರ ಮುಂದೆ ವರ್ಷದ ಫಲಿತಾಂಶಗಳನ್ನು ಪ್ರಸ್ತುತಪಡಿಸಬೇಕಿತ್ತು. ಅವಳು ಒಂದು ಸರಳ ರೂಪರೇಷೆ ಮತ್ತು ಕೇವಲ ಎಂಟು ಸ್ಲೈಡ್‌ಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಿದಳು, ಪ್ರತಿಯೊಂದರಲ್ಲೂ ಒಂದು ಸ್ಪಷ್ಟ ಚಾರ್ಟ್ ಇತ್ತು. ಹಿಂದಿನ ರಾತ್ರಿ ಅವಳು ತನ್ನ ತಂಗಿಯ ಮುಂದೆ ಇಡೀ ಭಾಷಣವನ್ನು ಮೂರು ಬಾರಿ ಪೂರ್ವಾಭ್ಯಾಸ ಮಾಡಿದಳು. ಆ ದಿನ, ಅವಳು ಶುರು ಮಾಡುವ ಐದು ನಿಮಿಷ ಮೊದಲು ಮೀಟಿಂಗ್ ಕೊಠಡಿಯ ಪ್ರೊಜೆಕ್ಟರ್ ಕೆಲಸ ಮಾಡುವುದನ್ನು ನಿಲ್ಲಿಸಿತು. ಅದೃಷ್ಟವಶಾತ್, ರೇಖಾ ಎಲ್ಲಾ ಮುಖ್ಯ ಅಂಕಿಅಂಶಗಳಿರುವ ಹ್ಯಾಂಡ್‌ಔಟ್‌ಗಳನ್ನು ಮುದ್ರಿಸಿ ತಂದಿದ್ದಳು. ಅವಳು ಒಂದು ಸಂಕ್ಷಿಪ್ತ ಪರಿಚಯದೊಂದಿಗೆ ಶುರು ಮಾಡಿ, ನಂತರ ಡೆಲಿವರಿ ವೆಚ್ಚ ಎಷ್ಟು ಕಡಿಮೆಯಾಗಿದೆ ಎಂಬುದನ್ನು ಎತ್ತಿ ತೋರಿಸಿದಳು. ಒಬ್ಬ ನಿರ್ದೇಶಕರು ಬೆಳಗಾವಿಯ ಹೊಸ ಅಂಗಡಿಯ ಬಗ್ಗೆ ಕೇಳಿದಾಗ, ಅವಳು ಶಾಂತವಾಗಿ ಅಂಕಿಗಳನ್ನು ಸ್ಪಷ್ಟಪಡಿಸಿದಳು. ತನ್ನ ಮೂರು ಮುಖ್ಯ ಅಂಶಗಳ ಸಾರಾಂಶ ಹೇಳಿ ಅವಳು ಮುಕ್ತಾಯಗೊಳಿಸಿದಳು, ಮತ್ತು ಇಷ್ಟು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿದ್ದಕ್ಕೆ ನಿರ್ದೇಶಕರು ಅವಳಿಗೆ ಧನ್ಯವಾದ ಹೇಳಿದರು.',
                        hi: 'हुब्बल्ली में मार्केटिंग एग्ज़ीक्यूटिव रेखा को कंपनी के निदेशकों के सामने साल के नतीजे पेश करने थे। उसने एक सरल रूपरेखा और सिर्फ़ आठ स्लाइडें तैयार कीं, हर एक में एक साफ़ चार्ट था। एक रात पहले उसने अपनी बहन के सामने पूरी प्रस्तुति की तीन बार रिहर्सल की। उस दिन, उसके शुरू करने से पाँच मिनट पहले मीटिंग रूम का प्रोजेक्टर बंद हो गया। ख़ुशकिस्मती से, रेखा ने सभी ज़रूरी आँकड़ों वाले हैंडआउट छपवा रखे थे। उसने एक संक्षिप्त विवरण से शुरुआत की और फिर ख़ास तौर पर बताया कि डिलीवरी की लागत कितनी घटी है। जब एक निदेशक ने बेलगावी की नई दुकान के बारे में पूछा, तो उसने शांति से आँकड़े स्पष्ट किए। उसने अपनी तीन मुख्य बातों का सारांश देकर समापन किया, और निदेशकों ने इतनी स्पष्टता के लिए उसे धन्यवाद दिया।'
                    },
                    questions: [
                        {
                            q: { en: 'How many slides did Rekha prepare?', kn: 'ರೇಖಾ ಎಷ್ಟು ಸ್ಲೈಡ್‌ಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಿದಳು?', hi: 'रेखा ने कितनी स्लाइडें तैयार कीं?' },
                            options: [
                                { en: 'Eight', kn: 'ಎಂಟು', hi: 'आठ' },
                                { en: 'Three', kn: 'ಮೂರು', hi: 'तीन' },
                                { en: 'Twelve', kn: 'ಹನ್ನೆರಡು', hi: 'बारह' },
                                { en: 'Twenty', kn: 'ಇಪ್ಪತ್ತು', hi: 'बीस' }
                            ]
                        },
                        {
                            q: { en: 'What went wrong on the day?', kn: 'ಆ ದಿನ ಏನು ತಪ್ಪಾಯಿತು?', hi: 'उस दिन क्या गड़बड़ हुई?' },
                            options: [
                                { en: 'The projector stopped working', kn: 'ಪ್ರೊಜೆಕ್ಟರ್ ಕೆಲಸ ನಿಲ್ಲಿಸಿತು', hi: 'प्रोजेक्टर बंद हो गया' },
                                { en: 'Rekha forgot her slides', kn: 'ರೇಖಾ ತನ್ನ ಸ್ಲೈಡ್‌ಗಳನ್ನು ಮರೆತಳು', hi: 'रेखा अपनी स्लाइडें भूल गई' },
                                { en: 'The directors arrived late', kn: 'ನಿರ್ದೇಶಕರು ತಡವಾಗಿ ಬಂದರು', hi: 'निदेशक देर से आए' },
                                { en: 'The handouts were missing', kn: 'ಹ್ಯಾಂಡ್‌ಔಟ್‌ಗಳು ಕಾಣೆಯಾಗಿದ್ದವು', hi: 'हैंडआउट ग़ायब थे' }
                            ]
                        },
                        {
                            q: { en: 'How did Rekha practise?', kn: 'ರೇಖಾ ಹೇಗೆ ಅಭ್ಯಾಸ ಮಾಡಿದಳು?', hi: 'रेखा ने अभ्यास कैसे किया?' },
                            options: [
                                { en: 'She rehearsed three times in front of her sister', kn: 'ತಂಗಿಯ ಮುಂದೆ ಮೂರು ಬಾರಿ ಪೂರ್ವಾಭ್ಯಾಸ ಮಾಡಿದಳು', hi: 'उसने बहन के सामने तीन बार रिहर्सल की' },
                                { en: 'She watched videos online', kn: 'ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ವಿಡಿಯೋಗಳನ್ನು ನೋಡಿದಳು', hi: 'उसने ऑनलाइन वीडियो देखे' },
                                { en: 'She practised with the directors', kn: 'ನಿರ್ದೇಶಕರ ಜೊತೆ ಅಭ್ಯಾಸ ಮಾಡಿದಳು', hi: 'उसने निदेशकों के साथ अभ्यास किया' },
                                { en: 'She did not practise at all', kn: 'ಅವಳು ಅಭ್ಯಾಸವನ್ನೇ ಮಾಡಲಿಲ್ಲ', hi: 'उसने बिल्कुल अभ्यास नहीं किया' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'A practice run', kn: 'ಒಂದು ಪೂರ್ವಾಭ್ಯಾಸ', hi: 'एक रिहर्सल' },
                    scenario: {
                        en: 'Sanjay rehearses a client presentation with his manager, Lakshmi, in their Pune office.',
                        kn: 'ಸಂಜಯ್ ತಮ್ಮ ಪುಣೆ ಕಚೇರಿಯಲ್ಲಿ ತನ್ನ ಮ್ಯಾನೇಜರ್ ಲಕ್ಷ್ಮಿ ಅವರೊಂದಿಗೆ ಕ್ಲೈಂಟ್ ಪ್ರಸ್ತುತಿಯ ಪೂರ್ವಾಭ್ಯಾಸ ಮಾಡುತ್ತಾನೆ.',
                        hi: 'संजय पुणे के अपने दफ़्तर में अपनी मैनेजर लक्ष्मी के साथ एक क्लाइंट प्रेज़ेंटेशन की रिहर्सल करता है।'
                    },
                    speakers: [{ name: 'Lakshmi', voice: 'f' }, { name: 'Sanjay', voice: 'm' }],
                    lines: [
                        { speaker: 'Lakshmi', en: "Okay, Sanjay, imagine I'm the client. Start whenever you're ready.", kn: 'ಸರಿ ಸಂಜಯ್, ನಾನೇ ಕ್ಲೈಂಟ್ ಅಂತ ಕಲ್ಪಿಸಿಕೊಳ್ಳಿ. ನೀವು ಸಿದ್ಧವಾದಾಗ ಶುರು ಮಾಡಿ.', hi: 'ठीक है संजय, मान लो मैं क्लाइंट हूँ। जब तैयार हो, शुरू करो।' },
                        { speaker: 'Sanjay', en: "Good morning, everyone, and thank you for having us. Today I'd like to walk you through our plan for your new website.", kn: 'ಎಲ್ಲರಿಗೂ ಶುಭೋದಯ, ನಮ್ಮನ್ನು ಕರೆದಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ಇಂದು ನಿಮ್ಮ ಹೊಸ ವೆಬ್‌ಸೈಟ್‌ಗಾಗಿ ನಮ್ಮ ಯೋಜನೆಯನ್ನು ಹಂತ ಹಂತವಾಗಿ ವಿವರಿಸಲು ಬಯಸುತ್ತೇನೆ.', hi: 'सभी को सुप्रभात, और हमें बुलाने के लिए धन्यवाद। आज मैं आपको आपकी नई वेबसाइट के लिए हमारी योजना विस्तार से समझाना चाहूँगा।' },
                        { speaker: 'Lakshmi', en: 'Good start. How will you organise the talk?', kn: 'ಒಳ್ಳೆಯ ಆರಂಭ. ಭಾಷಣವನ್ನು ಹೇಗೆ ವಿಂಗಡಿಸುತ್ತೀರಿ?', hi: 'अच्छी शुरुआत। तुम प्रस्तुति को कैसे बाँटोगे?' },
                        { speaker: 'Sanjay', en: "I'll cover three things: what we found, what we suggest, and what it will cost.", kn: 'ಮೂರು ವಿಷಯಗಳನ್ನು ಹೇಳುತ್ತೇನೆ: ನಾವು ಏನು ಕಂಡುಕೊಂಡೆವು, ಏನು ಸೂಚಿಸುತ್ತೇವೆ, ಮತ್ತು ಅದಕ್ಕೆ ಎಷ್ಟು ಖರ್ಚಾಗುತ್ತದೆ.', hi: 'मैं तीन बातें बताऊँगा: हमें क्या मिला, हम क्या सुझाते हैं, और इसमें कितना ख़र्च आएगा।' },
                        { speaker: 'Lakshmi', en: 'Nice and clear. What if the client interrupts with a question halfway through?', kn: 'ಸರಳ ಮತ್ತು ಸ್ಪಷ್ಟ. ಕ್ಲೈಂಟ್ ಮಧ್ಯದಲ್ಲೇ ಪ್ರಶ್ನೆ ಕೇಳಿದರೆ ಏನು ಮಾಡುತ್ತೀರಿ?', hi: 'साफ़ और सीधा। अगर क्लाइंट बीच में ही कोई सवाल पूछ ले तो?' },
                        { speaker: 'Sanjay', en: "I'll thank them, note the question down and say I'll come back to it at the end.", kn: 'ಅವರಿಗೆ ಧನ್ಯವಾದ ಹೇಳಿ, ಪ್ರಶ್ನೆಯನ್ನು ಬರೆದುಕೊಂಡು, ಕೊನೆಯಲ್ಲಿ ಅದಕ್ಕೆ ಉತ್ತರಿಸುತ್ತೇನೆ ಎಂದು ಹೇಳುತ್ತೇನೆ.', hi: 'मैं उन्हें धन्यवाद दूँगा, सवाल लिख लूँगा और कहूँगा कि आख़िर में उसका जवाब दूँगा।' },
                        { speaker: 'Lakshmi', en: "Good. And what's on your last slide?", kn: 'ಒಳ್ಳೆಯದು. ನಿಮ್ಮ ಕೊನೆಯ ಸ್ಲೈಡ್‌ನಲ್ಲಿ ಏನಿದೆ?', hi: 'अच्छा। और तुम्हारी आख़िरी स्लाइड पर क्या है?' },
                        { speaker: 'Sanjay', en: 'A summary of the three points and a clear next step: a meeting next Friday.', kn: 'ಮೂರು ಅಂಶಗಳ ಸಾರಾಂಶ ಮತ್ತು ಒಂದು ಸ್ಪಷ್ಟ ಮುಂದಿನ ಹೆಜ್ಜೆ: ಮುಂದಿನ ಶುಕ್ರವಾರ ಒಂದು ಮೀಟಿಂಗ್.', hi: 'तीनों बातों का सारांश और एक साफ़ अगला कदम: अगले शुक्रवार एक मीटिंग।' },
                        { speaker: 'Lakshmi', en: 'Excellent. Just slow down a little, and look at the audience, not the screen.', kn: 'ಅತ್ಯುತ್ತಮ. ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ, ಮತ್ತು ಸ್ಕ್ರೀನ್ ಅಲ್ಲ, ಕೇಳುಗರನ್ನು ನೋಡಿ.', hi: 'बहुत बढ़िया। बस थोड़ा धीरे बोलो, और स्क्रीन को नहीं, सुनने वालों को देखो।' },
                        { speaker: 'Sanjay', en: "Thanks, Lakshmi. I'll rehearse it once more tonight.", kn: 'ಧನ್ಯವಾದ ಲಕ್ಷ್ಮಿ. ಇವತ್ತು ರಾತ್ರಿ ಇನ್ನೊಮ್ಮೆ ಪೂರ್ವಾಭ್ಯಾಸ ಮಾಡುತ್ತೇನೆ.', hi: 'धन्यवाद लक्ष्मी। आज रात मैं एक बार और रिहर्सल करूँगा।' }
                    ],
                    questions: [
                        {
                            q: { en: 'What is Sanjay presenting?', kn: 'ಸಂಜಯ್ ಯಾವುದರ ಬಗ್ಗೆ ಪ್ರಸ್ತುತಿ ನೀಡುತ್ತಿದ್ದಾನೆ?', hi: 'संजय किस बारे में प्रस्तुति दे रहा है?' },
                            options: [
                                { en: "A plan for a client's new website", kn: 'ಕ್ಲೈಂಟ್‌ನ ಹೊಸ ವೆಬ್‌ಸೈಟ್‌ಗಾಗಿ ಯೋಜನೆ', hi: 'क्लाइंट की नई वेबसाइट की योजना' },
                                { en: 'The yearly sales results', kn: 'ವರ್ಷದ ಮಾರಾಟದ ಫಲಿತಾಂಶಗಳು', hi: 'साल भर की बिक्री के नतीजे' },
                                { en: 'A new office building', kn: 'ಹೊಸ ಕಚೇರಿ ಕಟ್ಟಡ', hi: 'दफ़्तर की नई इमारत' },
                                { en: 'A training course', kn: 'ಒಂದು ತರಬೇತಿ ಕೋರ್ಸ್', hi: 'एक ट्रेनिंग कोर्स' }
                            ]
                        },
                        {
                            q: { en: 'What will Sanjay do if the client interrupts?', kn: 'ಕ್ಲೈಂಟ್ ಮಧ್ಯದಲ್ಲಿ ಪ್ರಶ್ನೆ ಕೇಳಿದರೆ ಸಂಜಯ್ ಏನು ಮಾಡುತ್ತಾನೆ?', hi: 'अगर क्लाइंट बीच में टोके तो संजय क्या करेगा?' },
                            options: [
                                { en: 'Thank them and answer at the end', kn: 'ಧನ್ಯವಾದ ಹೇಳಿ ಕೊನೆಯಲ್ಲಿ ಉತ್ತರಿಸುತ್ತಾನೆ', hi: 'धन्यवाद देकर आख़िर में जवाब देगा' },
                                { en: 'Ignore the question', kn: 'ಪ್ರಶ್ನೆಯನ್ನು ನಿರ್ಲಕ್ಷಿಸುತ್ತಾನೆ', hi: 'सवाल को अनदेखा करेगा' },
                                { en: 'Stop the presentation', kn: 'ಪ್ರಸ್ತುತಿಯನ್ನು ನಿಲ್ಲಿಸುತ್ತಾನೆ', hi: 'प्रस्तुति रोक देगा' },
                                { en: 'Ask Lakshmi to answer', kn: 'ಉತ್ತರಿಸಲು ಲಕ್ಷ್ಮಿಗೆ ಹೇಳುತ್ತಾನೆ', hi: 'लक्ष्मी से जवाब देने को कहेगा' }
                            ]
                        },
                        {
                            q: { en: 'What advice does Lakshmi give?', kn: 'ಲಕ್ಷ್ಮಿ ಯಾವ ಸಲಹೆ ನೀಡುತ್ತಾರೆ?', hi: 'लक्ष्मी क्या सलाह देती है?' },
                            options: [
                                { en: 'Slow down and look at the audience', kn: 'ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ ಕೇಳುಗರನ್ನು ನೋಡಿ', hi: 'धीरे बोलो और सुनने वालों को देखो' },
                                { en: 'Add more slides', kn: 'ಇನ್ನಷ್ಟು ಸ್ಲೈಡ್‌ಗಳನ್ನು ಸೇರಿಸಿ', hi: 'और स्लाइडें जोड़ो' },
                                { en: 'Speak faster', kn: 'ವೇಗವಾಗಿ ಮಾತನಾಡಿ', hi: 'तेज़ बोलो' },
                                { en: 'Read everything from the screen', kn: 'ಎಲ್ಲವನ್ನೂ ಸ್ಕ್ರೀನ್‌ನಿಂದ ಓದಿ', hi: 'सब कुछ स्क्रीन से पढ़ो' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Give a short presentation at work about a new idea, for example a better way to handle customer calls. Open the talk, give an outline of your points, explain one point with a figure, and close with a summary and an invitation to ask questions.',
                        sample: "Good morning, everyone, and thank you for your time. Today I'd like to talk about a faster way to handle customer calls. I'll cover three points: the problem, my suggestion, and the cost. First, the problem. Last month, customers waited an average of eight minutes before they could speak to someone. My suggestion is a simple call-back system, so nobody has to wait on the line. It would cost about forty thousand rupees a year. To sum up, the problem is long waiting, the fix is a call-back, and the cost is low. Thank you. I'd be happy to take any questions.",
                        checklist: ['I greeted the audience and thanked them', 'I said what the talk was about', 'I gave an outline of my points', 'I used at least one figure or number', 'I summarised my main points at the end', 'I invited questions']
                    }
                }
            ]
        },
        '4:1': {
            name: 'Customers and clients',
            lessons: [
                {
                    kind: 'words', title: 'What the client needs', list: [
                        { en: 'client', kn: 'ಕ್ಲೈಂಟ್', hi: 'क्लाइंट', pic: '🤝', def: 'a person or company that pays for professional work or services' },
                        { en: 'requirement', kn: 'ಅಗತ್ಯ', hi: 'ज़रूरत', pic: '📋', def: 'something that a client needs or asks for' },
                        { en: 'proposal', kn: 'ಪ್ರಸ್ತಾವನೆ', hi: 'प्रस्ताव', pic: '📑', def: 'a written plan or offer sent to a possible client' },
                        { en: 'quotation', kn: 'ಕೊಟೇಶನ್', hi: 'कोटेशन', pic: '🏷️', def: 'a document that gives the price for a piece of work' },
                        { en: 'timeline', kn: 'ಸಮಯಾವಧಿ', hi: 'समय-सीमा', pic: '⏳', def: 'a plan that shows when each part of a job will be finished' },
                        { en: 'demo', kn: 'ಪ್ರಾತ್ಯಕ್ಷಿಕೆ', hi: 'डेमो', pic: '💻', def: 'a short show of how a product or service works' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Customers and clients 1', list: [
                        { read: true, en: 'Before we suggest anything, could you tell us more about your requirements?', kn: 'ನಾವು ಏನನ್ನಾದರೂ ಸೂಚಿಸುವ ಮೊದಲು, ನಿಮ್ಮ ಅಗತ್ಯಗಳ ಬಗ್ಗೆ ಇನ್ನಷ್ಟು ಹೇಳುತ್ತೀರಾ?', hi: 'कुछ भी सुझाने से पहले, क्या आप अपनी ज़रूरतों के बारे में थोड़ा और बताएँगे?' },
                        { read: true, en: "We'll send you a detailed proposal and a quotation by Thursday.", kn: 'ಗುರುವಾರದೊಳಗೆ ನಾವು ನಿಮಗೆ ವಿವರವಾದ ಪ್ರಸ್ತಾವನೆ ಮತ್ತು ಕೊಟೇಶನ್ ಕಳುಹಿಸುತ್ತೇವೆ.', hi: 'गुरुवार तक हम आपको एक विस्तृत प्रस्ताव और कोटेशन भेज देंगे।' },
                        { en: "Our rough timeline is six weeks, but I'll confirm after a site visit.", kn: 'ನಮ್ಮ ಸ್ಥೂಲ ಸಮಯಾವಧಿ ಆರು ವಾರಗಳು, ಆದರೆ ಸೈಟ್ ನೋಡಿದ ನಂತರ ಖಚಿತಪಡಿಸುತ್ತೇನೆ.', hi: 'हमारी मोटी समय-सीमा छह हफ़्ते की है, लेकिन साइट देखने के बाद मैं पक्का बताऊँगा।' },
                        { read: true, en: 'Would a short demo help you decide which plan suits you?', kn: 'ಯಾವ ಪ್ಲಾನ್ ನಿಮಗೆ ಸರಿಹೊಂದುತ್ತದೆ ಎಂದು ನಿರ್ಧರಿಸಲು ಒಂದು ಚಿಕ್ಕ ಪ್ರಾತ್ಯಕ್ಷಿಕೆ ಸಹಾಯವಾಗಬಹುದೇ?', hi: 'क्या एक छोटा डेमो आपको यह तय करने में मदद करेगा कि कौन-सा प्लान आपके लिए सही है?' },
                        { en: 'This client wants everything in Kannada, including the app screens.', kn: 'ಈ ಕ್ಲೈಂಟ್‌ಗೆ ಆ್ಯಪ್ ಸ್ಕ್ರೀನ್‌ಗಳೂ ಸೇರಿದಂತೆ ಎಲ್ಲವೂ ಕನ್ನಡದಲ್ಲೇ ಬೇಕು.', hi: 'इस क्लाइंट को ऐप की स्क्रीनों समेत सब कुछ कन्नड़ में चाहिए।' }
                    ]
                },
                {
                    kind: 'words', title: 'Keeping promises', list: [
                        { en: 'dispatch', kn: 'ರವಾನಿಸು', hi: 'रवाना करना', pic: '🚚', def: 'to send goods or a parcel to a customer' },
                        { en: 'invoice', kn: 'ಇನ್‌ವಾಯ್ಸ್', hi: 'इनवॉइस', pic: '🧾', def: 'a document that asks a client to pay for goods or work' },
                        { en: 'frustration', kn: 'ಬೇಸರ', hi: 'झुंझलाहट', pic: '😤', def: 'the annoyed feeling you get when something goes wrong or takes too long' },
                        { en: 'waive', kn: 'ಮನ್ನಾ ಮಾಡು', hi: 'शुल्क माफ़ करना', pic: '🆓', def: 'to agree not to charge a fee or not to apply a rule' },
                        { en: 'commitment', kn: 'ಬದ್ಧತೆ', hi: 'प्रतिबद्धता', pic: '🤞', def: 'a firm promise to do something' },
                        { en: 'assure', kn: 'ಭರವಸೆ ನೀಡು', hi: 'भरोसा दिलाना', pic: '👍', def: 'to tell someone firmly that something will happen, so they stop worrying' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Customers and clients 2', list: [
                        { read: true, en: 'Your order will be dispatched from our Pune warehouse on Monday.', kn: 'ನಿಮ್ಮ ಆರ್ಡರ್ ಸೋಮವಾರ ನಮ್ಮ ಪುಣೆ ಗೋದಾಮಿನಿಂದ ರವಾನೆಯಾಗುತ್ತದೆ.', hi: 'आपका ऑर्डर सोमवार को हमारे पुणे गोदाम से रवाना होगा।' },
                        { en: "The invoice shows the wrong amount, so I'll ask accounts to correct it.", kn: 'ಇನ್‌ವಾಯ್ಸ್‌ನಲ್ಲಿ ತಪ್ಪು ಮೊತ್ತ ಇದೆ, ಹಾಗಾಗಿ ಅದನ್ನು ಸರಿಪಡಿಸಲು ಅಕೌಂಟ್ಸ್ ವಿಭಾಗಕ್ಕೆ ಹೇಳುತ್ತೇನೆ.', hi: 'इनवॉइस में ग़लत रकम लिखी है, इसलिए मैं अकाउंट्स विभाग से इसे ठीक करवाऊँगा।' },
                        { read: true, en: "I understand your frustration, and I'll escalate this to my manager today.", kn: 'ನಿಮ್ಮ ಬೇಸರ ನನಗೆ ಅರ್ಥವಾಗುತ್ತದೆ, ಮತ್ತು ಇಂದೇ ಇದನ್ನು ನನ್ನ ಮ್ಯಾನೇಜರ್ ಗಮನಕ್ಕೆ ತರುತ್ತೇನೆ.', hi: 'मैं आपकी परेशानी समझता हूँ, और आज ही यह मामला अपने मैनेजर तक ले जाऊँगा।' },
                        { en: "To compensate for the delay, we'll waive the delivery charge this time.", kn: 'ತಡವಾದುದಕ್ಕೆ ಪರಿಹಾರವಾಗಿ, ಈ ಬಾರಿ ಡೆಲಿವರಿ ಶುಲ್ಕವನ್ನು ನಾವು ಮನ್ನಾ ಮಾಡುತ್ತೇವೆ.', hi: 'देरी की भरपाई के लिए, इस बार हम डिलीवरी चार्ज माफ़ कर देंगे।' },
                        { read: true, en: "I can assure you that the replacement will reach you by Friday; that's my personal commitment.", kn: 'ಬದಲಿ ಉತ್ಪನ್ನ ಶುಕ್ರವಾರದೊಳಗೆ ನಿಮಗೆ ತಲುಪುತ್ತದೆ ಎಂದು ಭರವಸೆ ನೀಡುತ್ತೇನೆ; ಇದು ನನ್ನ ವೈಯಕ್ತಿಕ ಬದ್ಧತೆ.', hi: 'मैं आपको भरोसा दिलाता हूँ कि बदला हुआ सामान शुक्रवार तक आप तक पहुँच जाएगा; यह मेरी निजी प्रतिबद्धता है।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'The menu cards that never came', kn: 'ಬರದೇ ಹೋದ ಮೆನು ಕಾರ್ಡ್‌ಗಳು', hi: 'जो मेन्यू कार्ड कभी नहीं आए' },
                    text: {
                        en: 'Imran manages client accounts for a printing company in Bengaluru. One Monday, Mrs Shetty, who runs a hotel in Mysuru, called him, very upset. Her new menu cards had not arrived, although the quotation had promised delivery within a week. Imran listened without interrupting and then repeated her requirements to make sure he had understood. He discovered that the order had never been dispatched because of a mistake in the invoice. He escalated the problem to his manager and arranged a courier the same afternoon. To compensate Mrs Shetty for the delay, the company took ten per cent off the bill. Imran assured her that he would personally check her future orders, and she stayed with the company.',
                        kn: 'ಇಮ್ರಾನ್ ಬೆಂಗಳೂರಿನ ಒಂದು ಮುದ್ರಣ ಕಂಪನಿಯಲ್ಲಿ ಕ್ಲೈಂಟ್ ಖಾತೆಗಳನ್ನು ನೋಡಿಕೊಳ್ಳುತ್ತಾನೆ. ಒಂದು ಸೋಮವಾರ, ಮೈಸೂರಿನಲ್ಲಿ ಹೋಟೆಲ್ ನಡೆಸುವ ಶ್ರೀಮತಿ ಶೆಟ್ಟಿ ತುಂಬಾ ಬೇಸರದಿಂದ ಅವನಿಗೆ ಕರೆ ಮಾಡಿದರು. ಒಂದು ವಾರದೊಳಗೆ ತಲುಪಿಸುವುದಾಗಿ ಕೊಟೇಶನ್‌ನಲ್ಲಿ ಭರವಸೆ ನೀಡಿದ್ದರೂ, ಅವರ ಹೊಸ ಮೆನು ಕಾರ್ಡ್‌ಗಳು ಬಂದಿರಲಿಲ್ಲ. ಇಮ್ರಾನ್ ಮಧ್ಯೆ ಮಾತನಾಡದೆ ಕೇಳಿಸಿಕೊಂಡ, ನಂತರ ತಾನು ಸರಿಯಾಗಿ ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಲು ಅವರ ಅಗತ್ಯಗಳನ್ನು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿದ. ಇನ್‌ವಾಯ್ಸ್‌ನಲ್ಲಿನ ಒಂದು ತಪ್ಪಿನಿಂದಾಗಿ ಆರ್ಡರ್ ರವಾನೆಯೇ ಆಗಿರಲಿಲ್ಲ ಎಂದು ಅವನಿಗೆ ತಿಳಿಯಿತು. ಅವನು ಸಮಸ್ಯೆಯನ್ನು ತನ್ನ ಮ್ಯಾನೇಜರ್ ಗಮನಕ್ಕೆ ತಂದು, ಅದೇ ಮಧ್ಯಾಹ್ನ ಕೊರಿಯರ್ ವ್ಯವಸ್ಥೆ ಮಾಡಿದ. ತಡವಾದುದಕ್ಕೆ ಪರಿಹಾರವಾಗಿ ಕಂಪನಿ ಶ್ರೀಮತಿ ಶೆಟ್ಟಿಯವರ ಬಿಲ್ಲಿನಲ್ಲಿ ಶೇಕಡಾ ಹತ್ತರಷ್ಟು ಕಡಿತ ಮಾಡಿತು. ಮುಂದೆ ಅವರ ಎಲ್ಲಾ ಆರ್ಡರ್‌ಗಳನ್ನು ತಾನೇ ಖುದ್ದಾಗಿ ಪರಿಶೀಲಿಸುವುದಾಗಿ ಇಮ್ರಾನ್ ಭರವಸೆ ನೀಡಿದ, ಮತ್ತು ಅವರು ಕಂಪನಿಯೊಂದಿಗೇ ಉಳಿದರು.',
                        hi: 'इमरान बेंगलुरु की एक प्रिंटिंग कंपनी में क्लाइंट अकाउंट संभालता है। एक सोमवार, मैसूरु में होटल चलाने वाली श्रीमती शेट्टी ने बहुत नाराज़ होकर उसे फ़ोन किया। कोटेशन में एक हफ़्ते के अंदर डिलीवरी का वादा था, फिर भी उनके नए मेन्यू कार्ड नहीं पहुँचे थे। इमरान ने बिना टोके उनकी पूरी बात सुनी, और फिर यह पक्का करने के लिए कि वह सही समझा है, उनकी ज़रूरतें दोहराईं। उसे पता चला कि इनवॉइस में एक ग़लती की वजह से ऑर्डर कभी रवाना ही नहीं हुआ था। उसने यह मामला अपने मैनेजर तक पहुँचाया और उसी दोपहर कूरियर का इंतज़ाम किया। देरी की भरपाई के लिए कंपनी ने श्रीमती शेट्टी के बिल में दस प्रतिशत की छूट दी। इमरान ने उन्हें भरोसा दिलाया कि आगे से वह उनके ऑर्डर ख़ुद जाँचेगा, और वे कंपनी के साथ बनी रहीं।'
                    },
                    questions: [
                        {
                            q: { en: 'Why was Mrs Shetty upset?', kn: 'ಶ್ರೀಮತಿ ಶೆಟ್ಟಿ ಯಾಕೆ ಬೇಸರಗೊಂಡಿದ್ದರು?', hi: 'श्रीमती शेट्टी नाराज़ क्यों थीं?' },
                            options: [
                                { en: 'Her menu cards had not arrived', kn: 'ಅವರ ಮೆನು ಕಾರ್ಡ್‌ಗಳು ಬಂದಿರಲಿಲ್ಲ', hi: 'उनके मेन्यू कार्ड नहीं पहुँचे थे' },
                                { en: 'The cards had spelling mistakes', kn: 'ಕಾರ್ಡ್‌ಗಳಲ್ಲಿ ಕಾಗುಣಿತ ತಪ್ಪುಗಳಿದ್ದವು', hi: 'कार्डों में वर्तनी की ग़लतियाँ थीं' },
                                { en: 'The price was too high', kn: 'ಬೆಲೆ ತುಂಬಾ ಜಾಸ್ತಿ ಇತ್ತು', hi: 'दाम बहुत ज़्यादा था' },
                                { en: 'Imran did not answer her call', kn: 'ಇಮ್ರಾನ್ ಅವರ ಕರೆ ಸ್ವೀಕರಿಸಲಿಲ್ಲ', hi: 'इमरान ने उनका फ़ोन नहीं उठाया' }
                            ]
                        },
                        {
                            q: { en: 'Why had the order not been dispatched?', kn: 'ಆರ್ಡರ್ ಯಾಕೆ ರವಾನೆಯಾಗಿರಲಿಲ್ಲ?', hi: 'ऑर्डर रवाना क्यों नहीं हुआ था?' },
                            options: [
                                { en: 'There was a mistake in the invoice', kn: 'ಇನ್‌ವಾಯ್ಸ್‌ನಲ್ಲಿ ತಪ್ಪಿತ್ತು', hi: 'इनवॉइस में ग़लती थी' },
                                { en: 'The printing machine was broken', kn: 'ಮುದ್ರಣ ಯಂತ್ರ ಹಾಳಾಗಿತ್ತು', hi: 'प्रिंटिंग मशीन ख़राब थी' },
                                { en: 'The courier was on leave', kn: 'ಕೊರಿಯರ್‌ನವರು ರಜೆಯಲ್ಲಿದ್ದರು', hi: 'कूरियर वाला छुट्टी पर था' },
                                { en: 'Mrs Shetty had not paid', kn: 'ಶ್ರೀಮತಿ ಶೆಟ್ಟಿ ಹಣ ಪಾವತಿಸಿರಲಿಲ್ಲ', hi: 'श्रीमती शेट्टी ने भुगतान नहीं किया था' }
                            ]
                        },
                        {
                            q: { en: 'How did the company make up for the delay?', kn: 'ತಡವಾದುದಕ್ಕೆ ಕಂಪನಿ ಹೇಗೆ ಪರಿಹಾರ ನೀಡಿತು?', hi: 'कंपनी ने देरी की भरपाई कैसे की?' },
                            options: [
                                { en: 'It took ten per cent off the bill', kn: 'ಬಿಲ್ಲಿನಲ್ಲಿ ಶೇಕಡಾ ಹತ್ತರಷ್ಟು ಕಡಿತ ಮಾಡಿತು', hi: 'बिल में दस प्रतिशत की छूट दी' },
                                { en: 'It printed free business cards', kn: 'ಉಚಿತ ವಿಸಿಟಿಂಗ್ ಕಾರ್ಡ್‌ಗಳನ್ನು ಮುದ್ರಿಸಿತು', hi: 'मुफ़्त विज़िटिंग कार्ड छापे' },
                                { en: 'It sent a new printer', kn: 'ಹೊಸ ಪ್ರಿಂಟರ್ ಕಳುಹಿಸಿತು', hi: 'एक नया प्रिंटर भेजा' },
                                { en: 'It returned all her money', kn: 'ಅವರ ಎಲ್ಲಾ ಹಣ ಹಿಂದಿರುಗಿಸಿತು', hi: 'उनका सारा पैसा लौटा दिया' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'A new client', kn: 'ಹೊಸ ಕ್ಲೈಂಟ್', hi: 'नया क्लाइंट' },
                    scenario: {
                        en: 'Neha, a sales manager at a furniture company in Hubballi, takes a call from Vikram Kulkarni, who needs furniture for a new office.',
                        kn: 'ಹುಬ್ಬಳ್ಳಿಯ ಒಂದು ಪೀಠೋಪಕರಣ ಕಂಪನಿಯ ಸೇಲ್ಸ್ ಮ್ಯಾನೇಜರ್ ನೇಹಾ, ಹೊಸ ಕಚೇರಿಗೆ ಪೀಠೋಪಕರಣ ಬೇಕಿರುವ ವಿಕ್ರಮ್ ಕುಲಕರ್ಣಿ ಅವರ ಕರೆಯನ್ನು ಸ್ವೀಕರಿಸುತ್ತಾಳೆ.',
                        hi: 'हुब्बल्ली की एक फ़र्नीचर कंपनी की सेल्स मैनेजर नेहा को विक्रम कुलकर्णी का फ़ोन आता है, जिन्हें नए दफ़्तर के लिए फ़र्नीचर चाहिए।'
                    },
                    speakers: [{ name: 'Neha', voice: 'f' }, { name: 'Vikram', voice: 'm' }],
                    lines: [
                        { speaker: 'Neha', en: 'Good afternoon, Mr Kulkarni. Thanks for getting in touch. How can we help?', kn: 'ನಮಸ್ಕಾರ ಕುಲಕರ್ಣಿ ಅವರೇ. ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ನಾವು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?', hi: 'नमस्ते कुलकर्णी जी। हमसे संपर्क करने के लिए धन्यवाद। हम आपकी क्या मदद कर सकते हैं?' },
                        { speaker: 'Vikram', en: "We're opening a new office in Belagavi and need desks and chairs for forty people.", kn: 'ನಾವು ಬೆಳಗಾವಿಯಲ್ಲಿ ಹೊಸ ಕಚೇರಿ ತೆರೆಯುತ್ತಿದ್ದೇವೆ, ನಲವತ್ತು ಜನರಿಗೆ ಮೇಜು ಮತ್ತು ಕುರ್ಚಿಗಳು ಬೇಕು.', hi: 'हम बेलगावी में नया दफ़्तर खोल रहे हैं और हमें चालीस लोगों के लिए मेज़ें और कुर्सियाँ चाहिए।' },
                        { speaker: 'Neha', en: 'Wonderful. Could you tell me a bit more about your requirements? Do you have a budget or a style in mind?', kn: 'ತುಂಬಾ ಸಂತೋಷ. ನಿಮ್ಮ ಅಗತ್ಯಗಳ ಬಗ್ಗೆ ಇನ್ನಷ್ಟು ಹೇಳುತ್ತೀರಾ? ನಿಮ್ಮ ಮನಸ್ಸಿನಲ್ಲಿ ಯಾವುದಾದರೂ ಬಜೆಟ್ ಅಥವಾ ಶೈಲಿ ಇದೆಯೇ?', hi: 'बहुत बढ़िया। क्या आप अपनी ज़रूरतों के बारे में थोड़ा और बताएँगे? क्या आपके मन में कोई बजट या स्टाइल है?' },
                        { speaker: 'Vikram', en: 'Something simple and comfortable. Our budget is about eight lakh rupees.', kn: 'ಸರಳವಾದ ಮತ್ತು ಆರಾಮದಾಯಕವಾದದ್ದು. ನಮ್ಮ ಬಜೆಟ್ ಸುಮಾರು ಎಂಟು ಲಕ್ಷ ರೂಪಾಯಿ.', hi: 'कुछ सादा और आरामदायक। हमारा बजट लगभग आठ लाख रुपये है।' },
                        { speaker: 'Neha', en: "That's quite workable. When would you need everything delivered?", kn: 'ಅದು ಖಂಡಿತ ಸಾಧ್ಯ. ನಿಮಗೆ ಎಲ್ಲವೂ ಯಾವ ದಿನಾಂಕದೊಳಗೆ ತಲುಪಬೇಕು?', hi: 'यह बिल्कुल हो सकता है। आपको सब कुछ कब तक पहुँचा हुआ चाहिए?' },
                        { speaker: 'Vikram', en: 'By the fifteenth of next month. That date is very important for us.', kn: 'ಮುಂದಿನ ತಿಂಗಳ ಹದಿನೈದನೇ ತಾರೀಖಿನೊಳಗೆ. ಆ ದಿನಾಂಕ ನಮಗೆ ತುಂಬಾ ಮುಖ್ಯ.', hi: 'अगले महीने की पंद्रह तारीख़ तक। वह तारीख़ हमारे लिए बहुत ज़रूरी है।' },
                        { speaker: 'Neha', en: "Understood. I'll send you a proposal with two options and a quotation by Friday.", kn: 'ಅರ್ಥವಾಯಿತು. ಶುಕ್ರವಾರದೊಳಗೆ ಎರಡು ಆಯ್ಕೆಗಳಿರುವ ಪ್ರಸ್ತಾವನೆ ಮತ್ತು ಕೊಟೇಶನ್ ಕಳುಹಿಸುತ್ತೇನೆ.', hi: 'समझ गई। मैं शुक्रवार तक आपको दो विकल्पों वाला प्रस्ताव और कोटेशन भेज दूँगी।' },
                        { speaker: 'Vikram', en: 'Could your team also handle the fitting at the site?', kn: 'ನಿಮ್ಮ ತಂಡ ಸೈಟ್‌ನಲ್ಲಿ ಜೋಡಣೆಯನ್ನೂ ನೋಡಿಕೊಳ್ಳಬಹುದೇ?', hi: 'क्या आपकी टीम साइट पर फ़िटिंग भी संभाल सकती है?' },
                        { speaker: 'Neha', en: "Yes, installation is included. And I can assure you we'll meet your deadline.", kn: 'ಹೌದು, ಜೋಡಣೆ ಬೆಲೆಯಲ್ಲೇ ಸೇರಿದೆ. ನಿಮ್ಮ ಗಡುವನ್ನು ನಾವು ಪಾಲಿಸುತ್ತೇವೆ ಎಂದು ಭರವಸೆ ನೀಡುತ್ತೇನೆ.', hi: 'जी हाँ, इंस्टॉलेशन इसमें शामिल है। और मैं आपको भरोसा दिलाती हूँ कि हम आपकी डेडलाइन पूरी करेंगे।' },
                        { speaker: 'Vikram', en: "Great. I'll look forward to your proposal, then.", kn: 'ಒಳ್ಳೆಯದು. ಹಾಗಾದರೆ ನಿಮ್ಮ ಪ್ರಸ್ತಾವನೆಗಾಗಿ ಕಾಯುತ್ತೇನೆ.', hi: 'बढ़िया। तो फिर मैं आपके प्रस्ताव का इंतज़ार करूँगा।' }
                    ],
                    questions: [
                        {
                            q: { en: 'How many people is the furniture for?', kn: 'ಪೀಠೋಪಕರಣ ಎಷ್ಟು ಜನರಿಗಾಗಿ?', hi: 'फ़र्नीचर कितने लोगों के लिए है?' },
                            options: [
                                { en: 'Forty', kn: 'ನಲವತ್ತು', hi: 'चालीस' },
                                { en: 'Fourteen', kn: 'ಹದಿನಾಲ್ಕು', hi: 'चौदह' },
                                { en: 'Eight', kn: 'ಎಂಟು', hi: 'आठ' },
                                { en: 'Fifteen', kn: 'ಹದಿನೈದು', hi: 'पंद्रह' }
                            ]
                        },
                        {
                            q: { en: "What is Vikram's budget?", kn: 'ವಿಕ್ರಮ್ ಅವರ ಬಜೆಟ್ ಎಷ್ಟು?', hi: 'विक्रम का बजट कितना है?' },
                            options: [
                                { en: 'About eight lakh rupees', kn: 'ಸುಮಾರು ಎಂಟು ಲಕ್ಷ ರೂಪಾಯಿ', hi: 'लगभग आठ लाख रुपये' },
                                { en: 'About forty thousand rupees', kn: 'ಸುಮಾರು ನಲವತ್ತು ಸಾವಿರ ರೂಪಾಯಿ', hi: 'लगभग चालीस हज़ार रुपये' },
                                { en: 'About fifteen lakh rupees', kn: 'ಸುಮಾರು ಹದಿನೈದು ಲಕ್ಷ ರೂಪಾಯಿ', hi: 'लगभग पंद्रह लाख रुपये' },
                                { en: 'He has no budget yet', kn: 'ಅವರಿಗೆ ಇನ್ನೂ ಬಜೆಟ್ ಇಲ್ಲ', hi: 'उनका अभी कोई बजट नहीं है' }
                            ]
                        },
                        {
                            q: { en: 'What will Neha send by Friday?', kn: 'ಶುಕ್ರವಾರದೊಳಗೆ ನೇಹಾ ಏನು ಕಳುಹಿಸುತ್ತಾಳೆ?', hi: 'नेहा शुक्रवार तक क्या भेजेगी?' },
                            options: [
                                { en: 'A proposal and a quotation', kn: 'ಪ್ರಸ್ತಾವನೆ ಮತ್ತು ಕೊಟೇಶನ್', hi: 'प्रस्ताव और कोटेशन' },
                                { en: 'All the desks and chairs', kn: 'ಎಲ್ಲಾ ಮೇಜು ಮತ್ತು ಕುರ್ಚಿಗಳು', hi: 'सारी मेज़ें और कुर्सियाँ' },
                                { en: 'An invoice', kn: 'ಒಂದು ಇನ್‌ವಾಯ್ಸ್', hi: 'एक इनवॉइस' },
                                { en: 'A team to measure the office', kn: 'ಕಚೇರಿ ಅಳೆಯಲು ಒಂದು ತಂಡ', hi: 'दफ़्तर नापने के लिए एक टीम' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'A client calls you, unhappy because your company delivered their order late and one item was damaged. Speak to the client: show that you understand, apologise, explain what you will do and by when, and offer something to make up for it.',
                        sample: "Good morning, Mr Rao. Thank you for calling, and I'm really sorry about this. I understand how frustrating it is to wait an extra week and then find a broken chair. That shouldn't have happened. Here's what I'll do. I'll dispatch a replacement chair from our Pune warehouse today, and it will reach you by Thursday. I've also escalated the delay to my manager so that it doesn't happen again. To make up for the trouble, we won't charge you for delivery on this order. I'll call you on Thursday to confirm that everything has arrived safely. Is there anything else I can help you with?",
                        checklist: ['I thanked the client and apologised', 'I showed that I understood the problem', 'I explained what I would do and by when', 'I offered something to make up for the problem', 'I promised to follow up', 'I stayed calm and polite']
                    }
                }
            ]
        },
        '5:1': {
            name: 'Leave and requests',
            lessons: [
                {
                    kind: 'words', title: 'Taking time off', list: [
                        { en: 'sick leave', kn: 'ಅನಾರೋಗ್ಯ ರಜೆ', hi: 'बीमारी की छुट्टी', pic: '🤒', def: 'paid time off work when you are ill' },
                        { en: 'half day', kn: 'ಅರ್ಧ ದಿನ', hi: 'आधा दिन', pic: '🌗', def: 'working only in the morning or only in the afternoon' },
                        { en: 'leave balance', kn: 'ಬಾಕಿ ಇರುವ ರಜೆಗಳು', hi: 'बची हुई छुट्टियाँ', pic: '🗓️', def: 'the number of days of leave you still have' },
                        { en: 'approve', kn: 'ಅನುಮೋದಿಸು', hi: 'मंज़ूर करना', pic: '✅', def: 'to officially agree to a plan or request' },
                        { en: 'absent', kn: 'ಗೈರುಹಾಜರು', hi: 'ग़ैरहाज़िर', pic: '🪑', def: 'not present at work, school or a meeting' },
                        { en: 'work from home', kn: 'ಮನೆಯಿಂದ ಕೆಲಸ', hi: 'घर से काम', pic: '🏠', def: 'to do your office work from your house' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Leave and requests 1', list: [
                        { read: true, en: "I've got a high fever, so I'd like to take sick leave today.", kn: 'ನನಗೆ ಜಾಸ್ತಿ ಜ್ವರ ಇದೆ, ಹಾಗಾಗಿ ಇವತ್ತು ಅನಾರೋಗ್ಯ ರಜೆ ತೆಗೆದುಕೊಳ್ಳಬೇಕು ಅಂತ ಇದ್ದೇನೆ.', hi: 'मुझे तेज़ बुख़ार है, इसलिए मैं आज बीमारी की छुट्टी लेना चाहता हूँ।', acc: { en: ["I have a high fever, so I'd like to take sick leave today."] } },
                        { read: true, en: "Could I take a half day on Friday for my brother's college admission?", kn: 'ನನ್ನ ತಮ್ಮನ ಕಾಲೇಜು ಪ್ರವೇಶಕ್ಕಾಗಿ ಶುಕ್ರವಾರ ಅರ್ಧ ದಿನ ರಜೆ ತೆಗೆದುಕೊಳ್ಳಬಹುದೇ?', hi: 'क्या मैं शुक्रवार को अपने भाई के कॉलेज एडमिशन के लिए आधे दिन की छुट्टी ले सकता हूँ?' },
                        { en: 'Let me check my leave balance before I book the train tickets.', kn: 'ರೈಲು ಟಿಕೆಟ್ ಬುಕ್ ಮಾಡುವ ಮೊದಲು ನನ್ನ ಬಾಕಿ ಇರುವ ರಜೆಗಳನ್ನು ಒಮ್ಮೆ ನೋಡುತ್ತೇನೆ.', hi: 'ट्रेन के टिकट बुक करने से पहले मैं अपनी बची हुई छुट्टियाँ देख लेता हूँ।' },
                        { read: true, en: 'My manager has approved my leave from the tenth to the fourteenth.', kn: 'ನನ್ನ ಮ್ಯಾನೇಜರ್ ಹತ್ತರಿಂದ ಹದಿನಾಲ್ಕನೇ ತಾರೀಖಿನವರೆಗೆ ನನ್ನ ರಜೆಯನ್ನು ಅನುಮೋದಿಸಿದ್ದಾರೆ.', hi: 'मेरे मैनेजर ने दस से चौदह तारीख़ तक की मेरी छुट्टी मंज़ूर कर दी है।' },
                        { en: 'Sorry I was absent on Monday; can I work from home tomorrow to catch up?', kn: 'ಸೋಮವಾರ ಗೈರುಹಾಜರಾಗಿದ್ದಕ್ಕೆ ಕ್ಷಮಿಸಿ; ಬಾಕಿ ಕೆಲಸ ಮುಗಿಸಲು ನಾಳೆ ಮನೆಯಿಂದ ಕೆಲಸ ಮಾಡಬಹುದೇ?', hi: 'माफ़ कीजिए, सोमवार को मैं ग़ैरहाज़िर था; क्या बचा हुआ काम पूरा करने के लिए मैं कल घर से काम कर सकता हूँ?' }
                    ]
                },
                {
                    kind: 'words', title: 'Swaps and cover', list: [
                        { en: 'swap', kn: 'ಅದಲುಬದಲು ಮಾಡು', hi: 'अदला-बदली करना', pic: '🔄', def: 'to exchange one thing for another, often with a colleague' },
                        { en: 'cover', kn: 'ಬದಲಿಗೆ ಕೆಲಸ ನೋಡಿಕೊಳ್ಳು', hi: 'की जगह काम संभालना', pic: '🛡️', def: 'to do the work of someone who is away' },
                        { en: 'handover', kn: 'ಕೆಲಸದ ಹಸ್ತಾಂತರ', hi: 'हैंडओवर', pic: '🗂️', def: 'passing your work and information to another person' },
                        { en: 'reschedule', kn: 'ಮರುನಿಗದಿ ಮಾಡು', hi: 'दोबारा समय तय करना', pic: '📅', def: 'to change the date or time of a planned event' },
                        { en: 'flexible', kn: 'ಹೊಂದಿಕೊಳ್ಳುವ', hi: 'लचीला', pic: '🤸', def: 'able and willing to change plans easily' },
                        { en: 'in advance', kn: 'ಮುಂಚಿತವಾಗಿ', hi: 'पहले से', pic: '⏩', def: 'before the time that something happens' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Leave and requests 2', list: [
                        { read: true, en: 'Would you mind swapping shifts with me next Saturday?', kn: 'ಮುಂದಿನ ಶನಿವಾರ ನನ್ನ ಜೊತೆ ಶಿಫ್ಟ್ ಅದಲುಬದಲು ಮಾಡಿಕೊಳ್ಳಲು ನಿಮಗೆ ಅಭ್ಯಂತರವಿದೆಯೇ?', hi: 'क्या आप अगले शनिवार मेरे साथ शिफ़्ट की अदला-बदली कर लेंगे?' },
                        { en: "Priya has agreed to cover my calls while I'm away.", kn: 'ನಾನು ಇಲ್ಲದಿರುವಾಗ ನನ್ನ ಕರೆಗಳನ್ನು ನೋಡಿಕೊಳ್ಳಲು ಪ್ರಿಯಾ ಒಪ್ಪಿಕೊಂಡಿದ್ದಾರೆ.', hi: 'मेरी ग़ैरमौजूदगी में प्रिया मेरी कॉल्स संभालने के लिए मान गई है।' },
                        { read: true, en: "I'll do a proper handover on Thursday so nothing gets missed.", kn: 'ಏನೂ ತಪ್ಪಿಹೋಗದಂತೆ ಗುರುವಾರ ಸರಿಯಾಗಿ ಕೆಲಸದ ಹಸ್ತಾಂತರ ಮಾಡುತ್ತೇನೆ.', hi: 'मैं गुरुवार को ठीक से हैंडओवर कर दूँगा ताकि कुछ भी छूट न जाए।' },
                        { en: "Could we reschedule our review to next week? I'm on leave on Monday.", kn: 'ನಮ್ಮ ರಿವ್ಯೂವನ್ನು ಮುಂದಿನ ವಾರಕ್ಕೆ ಮರುನಿಗದಿ ಮಾಡಬಹುದೇ? ಸೋಮವಾರ ನಾನು ರಜೆಯಲ್ಲಿರುತ್ತೇನೆ.', hi: 'क्या हम अपनी समीक्षा अगले हफ़्ते के लिए दोबारा तय कर सकते हैं? सोमवार को मैं छुट्टी पर हूँ।' },
                        { read: true, en: 'Our manager is flexible, as long as we ask at least a week in advance.', kn: 'ಕನಿಷ್ಠ ಒಂದು ವಾರ ಮುಂಚಿತವಾಗಿ ಕೇಳಿದರೆ, ನಮ್ಮ ಮ್ಯಾನೇಜರ್ ಸಾಕಷ್ಟು ಹೊಂದಿಕೊಳ್ಳುತ್ತಾರೆ.', hi: 'अगर हम कम से कम एक हफ़्ता पहले पूछ लें, तो हमारे मैनेजर काफ़ी लचीले हैं।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A wedding in Udupi', kn: 'ಉಡುಪಿಯಲ್ಲಿ ಮದುವೆ', hi: 'उडुपी में शादी' },
                    text: {
                        en: "Sowmya works in the payments team at a bank's head office in Bengaluru. Her cousin's wedding in Udupi fell in the last week of March, the busiest time of the year. She checked her leave balance and found that she still had nine days. Three weeks in advance, she asked her manager, Mr Bhat, for four days off and politely explained the reason. She also offered to work from home on the day after the wedding. Mr Bhat was flexible, but he asked who would cover the month-end reports. Sowmya swapped two shifts with her colleague Rakesh and promised a full handover before she left. Happy with her plan, Mr Bhat approved the leave the same afternoon.",
                        kn: 'ಸೌಮ್ಯ ಬೆಂಗಳೂರಿನಲ್ಲಿರುವ ಒಂದು ಬ್ಯಾಂಕಿನ ಮುಖ್ಯ ಕಚೇರಿಯ ಪೇಮೆಂಟ್ಸ್ ತಂಡದಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತಾಳೆ. ಅವಳ ಸೋದರಸಂಬಂಧಿಯ ಮದುವೆ ಉಡುಪಿಯಲ್ಲಿ ಮಾರ್ಚ್ ತಿಂಗಳ ಕೊನೆಯ ವಾರದಲ್ಲಿತ್ತು, ಅದು ವರ್ಷದಲ್ಲೇ ಅತಿ ಹೆಚ್ಚು ಕೆಲಸವಿರುವ ಸಮಯ. ತನ್ನ ಬಾಕಿ ರಜೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿದಾಗ, ಇನ್ನೂ ಒಂಬತ್ತು ದಿನಗಳ ರಜೆ ಉಳಿದಿದೆ ಎಂದು ಅವಳಿಗೆ ತಿಳಿಯಿತು. ಮೂರು ವಾರ ಮುಂಚಿತವಾಗಿ, ಅವಳು ತನ್ನ ಮ್ಯಾನೇಜರ್ ಭಟ್ ಅವರಲ್ಲಿ ನಾಲ್ಕು ದಿನಗಳ ರಜೆ ಕೇಳಿ, ಕಾರಣವನ್ನು ವಿನಯದಿಂದ ವಿವರಿಸಿದಳು. ಮದುವೆಯ ಮರುದಿನ ಮನೆಯಿಂದ ಕೆಲಸ ಮಾಡುವುದಾಗಿಯೂ ಅವಳು ಹೇಳಿದಳು. ಭಟ್ ಅವರು ಹೊಂದಿಕೊಳ್ಳುವವರಾದರೂ, ತಿಂಗಳ ಕೊನೆಯ ವರದಿಗಳನ್ನು ಯಾರು ನೋಡಿಕೊಳ್ಳುತ್ತಾರೆ ಎಂದು ಕೇಳಿದರು. ಸೌಮ್ಯ ತನ್ನ ಸಹೋದ್ಯೋಗಿ ರಾಕೇಶ್ ಜೊತೆ ಎರಡು ಶಿಫ್ಟ್‌ಗಳನ್ನು ಅದಲುಬದಲು ಮಾಡಿಕೊಂಡು, ಹೊರಡುವ ಮೊದಲು ಪೂರ್ಣ ಹಸ್ತಾಂತರ ಮಾಡುವುದಾಗಿ ಮಾತು ಕೊಟ್ಟಳು. ಅವಳ ಯೋಜನೆಯಿಂದ ಸಂತುಷ್ಟರಾದ ಭಟ್ ಅವರು ಅದೇ ಮಧ್ಯಾಹ್ನ ರಜೆಯನ್ನು ಅನುಮೋದಿಸಿದರು.',
                        hi: 'सौम्या बेंगलुरु में एक बैंक के मुख्य दफ़्तर की पेमेंट्स टीम में काम करती है। उसकी चचेरी बहन की शादी उडुपी में मार्च के आख़िरी हफ़्ते में थी, जो साल का सबसे व्यस्त समय होता है। उसने अपनी बची हुई छुट्टियाँ देखीं तो पता चला कि अभी नौ दिन बाकी हैं। तीन हफ़्ते पहले ही उसने अपने मैनेजर भट जी से चार दिन की छुट्टी माँगी और विनम्रता से वजह बताई। उसने शादी के अगले दिन घर से काम करने की पेशकश भी की। भट जी लचीले थे, लेकिन उन्होंने पूछा कि महीने के आख़िर की रिपोर्टें कौन संभालेगा। सौम्या ने अपने सहकर्मी राकेश के साथ दो शिफ़्टों की अदला-बदली की और जाने से पहले पूरा हैंडओवर देने का वादा किया। उसकी योजना से ख़ुश होकर भट जी ने उसी दोपहर छुट्टी मंज़ूर कर दी।'
                    },
                    questions: [
                        {
                            q: { en: 'Why did Sowmya need leave?', kn: 'ಸೌಮ್ಯಳಿಗೆ ರಜೆ ಯಾಕೆ ಬೇಕಿತ್ತು?', hi: 'सौम्या को छुट्टी क्यों चाहिए थी?' },
                            options: [
                                { en: "For her cousin's wedding in Udupi", kn: 'ಉಡುಪಿಯಲ್ಲಿ ಸೋದರಸಂಬಂಧಿಯ ಮದುವೆಗಾಗಿ', hi: 'उडुपी में चचेरी बहन की शादी के लिए' },
                                { en: 'Because she was ill', kn: 'ಅವಳಿಗೆ ಅನಾರೋಗ್ಯವಿದ್ದುದರಿಂದ', hi: 'क्योंकि वह बीमार थी' },
                                { en: 'For a training course', kn: 'ಒಂದು ತರಬೇತಿ ಕೋರ್ಸ್‌ಗಾಗಿ', hi: 'एक ट्रेनिंग कोर्स के लिए' },
                                { en: 'To move to a new house', kn: 'ಹೊಸ ಮನೆಗೆ ಸ್ಥಳಾಂತರಗೊಳ್ಳಲು', hi: 'नए घर में शिफ़्ट होने के लिए' }
                            ]
                        },
                        {
                            q: { en: 'How many days of leave did she still have?', kn: 'ಅವಳಿಗೆ ಇನ್ನೂ ಎಷ್ಟು ದಿನಗಳ ರಜೆ ಬಾಕಿ ಇತ್ತು?', hi: 'उसकी कितने दिन की छुट्टी अभी बाकी थी?' },
                            options: [
                                { en: 'Nine', kn: 'ಒಂಬತ್ತು', hi: 'नौ' },
                                { en: 'Four', kn: 'ನಾಲ್ಕು', hi: 'चार' },
                                { en: 'Three', kn: 'ಮೂರು', hi: 'तीन' },
                                { en: 'Twelve', kn: 'ಹನ್ನೆರಡು', hi: 'बारह' }
                            ]
                        },
                        {
                            q: { en: 'Who swapped shifts with Sowmya?', kn: 'ಸೌಮ್ಯಳ ಜೊತೆ ಯಾರು ಶಿಫ್ಟ್ ಅದಲುಬದಲು ಮಾಡಿಕೊಂಡರು?', hi: 'सौम्या के साथ किसने शिफ़्ट की अदला-बदली की?' },
                            options: [
                                { en: 'Rakesh', kn: 'ರಾಕೇಶ್', hi: 'राकेश' },
                                { en: 'Mr Bhat', kn: 'ಭಟ್ ಅವರು', hi: 'भट जी' },
                                { en: 'Her cousin', kn: 'ಅವಳ ಸೋದರಸಂಬಂಧಿ', hi: 'उसकी चचेरी बहन' },
                                { en: 'Nobody', kn: 'ಯಾರೂ ಇಲ್ಲ', hi: 'कोई नहीं' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'An early morning call', kn: 'ಮುಂಜಾನೆಯ ಕರೆ', hi: 'सुबह-सुबह का फ़ोन' },
                    scenario: {
                        en: 'Arun calls his team lead, Shalini, early in the morning because his mother is unwell.',
                        kn: 'ತನ್ನ ತಾಯಿಗೆ ಹುಷಾರಿಲ್ಲದ ಕಾರಣ ಅರುಣ್ ಬೆಳಿಗ್ಗೆ ಬೇಗನೆ ತನ್ನ ಟೀಮ್ ಲೀಡ್ ಶಾಲಿನಿಗೆ ಕರೆ ಮಾಡುತ್ತಾನೆ.',
                        hi: 'अरुण की माँ की तबीयत ठीक नहीं है, इसलिए वह सुबह-सुबह अपनी टीम लीड शालिनी को फ़ोन करता है।'
                    },
                    speakers: [{ name: 'Arun', voice: 'm' }, { name: 'Shalini', voice: 'f' }],
                    lines: [
                        { speaker: 'Arun', en: 'Good morning, Shalini. Sorry to call so early. Do you have a minute?', kn: 'ಶುಭೋದಯ ಶಾಲಿನಿ. ಇಷ್ಟು ಬೇಗ ಕರೆ ಮಾಡಿದ್ದಕ್ಕೆ ಕ್ಷಮಿಸಿ. ಒಂದು ನಿಮಿಷ ಮಾತನಾಡಬಹುದೇ?', hi: 'सुप्रभात शालिनी। इतनी सुबह फ़ोन करने के लिए माफ़ी चाहता हूँ। क्या आपके पास एक मिनट है?' },
                        { speaker: 'Shalini', en: 'Of course, Arun. Is everything all right?', kn: 'ಖಂಡಿತ ಅರುಣ್. ಎಲ್ಲವೂ ಸರಿಯಾಗಿದೆಯೇ?', hi: 'हाँ अरुण, बोलो। सब ठीक तो है?' },
                        { speaker: 'Arun', en: 'Not really. My mother had a fall last night, and I need to take her to the hospital for some tests.', kn: 'ಅಷ್ಟೇನೂ ಇಲ್ಲ. ನಿನ್ನೆ ರಾತ್ರಿ ನನ್ನ ತಾಯಿ ಬಿದ್ದುಬಿಟ್ಟರು, ಕೆಲವು ಪರೀಕ್ಷೆಗಳಿಗಾಗಿ ಅವರನ್ನು ಆಸ್ಪತ್ರೆಗೆ ಕರೆದುಕೊಂಡು ಹೋಗಬೇಕು.', hi: 'नहीं, ज़्यादा ठीक नहीं। कल रात मेरी माँ गिर गईं, और मुझे कुछ जाँचों के लिए उन्हें अस्पताल ले जाना है।' },
                        { speaker: 'Shalini', en: "Oh, I'm sorry to hear that. Please take care of her. Will you need the whole day?", kn: 'ಅಯ್ಯೋ, ಕೇಳಿ ಬೇಸರವಾಯಿತು. ದಯವಿಟ್ಟು ಅವರನ್ನು ನೋಡಿಕೊಳ್ಳಿ. ನಿಮಗೆ ಇಡೀ ದಿನ ಬೇಕಾಗುತ್ತದೆಯೇ?', hi: 'ओह, यह सुनकर दुख हुआ। उनका ध्यान रखना। क्या तुम्हें पूरा दिन चाहिए होगा?' },
                        { speaker: 'Arun', en: "I think so. I'd like to take today as leave, and maybe work from home tomorrow.", kn: 'ಹೌದು ಅನಿಸುತ್ತದೆ. ಇವತ್ತು ರಜೆ ತೆಗೆದುಕೊಂಡು, ನಾಳೆ ಬಹುಶಃ ಮನೆಯಿಂದ ಕೆಲಸ ಮಾಡಬೇಕು ಅಂತಿದ್ದೇನೆ.', hi: 'मुझे लगता है हाँ। मैं आज छुट्टी लेना चाहूँगा, और शायद कल घर से काम कर लूँ।' },
                        { speaker: 'Shalini', en: "That's fine. What about the client call at three?", kn: 'ಪರವಾಗಿಲ್ಲ. ಮೂರು ಗಂಟೆಯ ಕ್ಲೈಂಟ್ ಕರೆಯ ಕಥೆ ಏನು?', hi: 'ठीक है। तीन बजे वाली क्लाइंट कॉल का क्या होगा?' },
                        { speaker: 'Arun', en: "Deepak knows the project well. I've already asked him, and he's happy to cover it.", kn: 'ದೀಪಕ್‌ಗೆ ಪ್ರಾಜೆಕ್ಟ್ ಚೆನ್ನಾಗಿ ಗೊತ್ತು. ನಾನು ಈಗಾಗಲೇ ಅವನನ್ನು ಕೇಳಿದ್ದೇನೆ, ಅವನು ಸಂತೋಷದಿಂದ ಅದನ್ನು ನೋಡಿಕೊಳ್ಳುತ್ತಾನೆ.', hi: 'दीपक को प्रोजेक्ट अच्छी तरह पता है। मैंने उससे पहले ही पूछ लिया है, और वह ख़ुशी से उसे संभाल लेगा।' },
                        { speaker: 'Shalini', en: 'Good. Please send him your notes, and apply for the leave on the portal when you can.', kn: 'ಒಳ್ಳೆಯದು. ದಯವಿಟ್ಟು ನಿಮ್ಮ ನೋಟ್ಸ್ ಅವನಿಗೆ ಕಳುಹಿಸಿ, ಮತ್ತು ಸಾಧ್ಯವಾದಾಗ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ರಜೆಗೆ ಅರ್ಜಿ ಹಾಕಿ.', hi: 'अच्छा। उसे अपने नोट्स भेज देना, और जब हो सके पोर्टल पर छुट्टी की अर्ज़ी डाल देना।' },
                        { speaker: 'Arun', en: "I'll do that within the hour. Thank you for understanding, Shalini.", kn: 'ಒಂದು ಗಂಟೆಯೊಳಗೆ ಮಾಡುತ್ತೇನೆ. ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದ ಶಾಲಿನಿ.', hi: 'मैं एक घंटे के अंदर कर दूँगा। समझने के लिए धन्यवाद शालिनी।' },
                        { speaker: 'Shalini', en: 'No problem. I hope your mother feels better soon.', kn: 'ಪರವಾಗಿಲ್ಲ. ನಿಮ್ಮ ತಾಯಿ ಬೇಗ ಗುಣಮುಖರಾಗಲಿ.', hi: 'कोई बात नहीं। उम्मीद है तुम्हारी माँ जल्दी ठीक हो जाएँगी।' }
                    ],
                    questions: [
                        {
                            q: { en: 'Why does Arun need leave?', kn: 'ಅರುಣ್‌ಗೆ ರಜೆ ಯಾಕೆ ಬೇಕು?', hi: 'अरुण को छुट्टी क्यों चाहिए?' },
                            options: [
                                { en: 'His mother had a fall', kn: 'ಅವನ ತಾಯಿ ಬಿದ್ದಿದ್ದಾರೆ', hi: 'उसकी माँ गिर गई थीं' },
                                { en: 'He has a fever', kn: 'ಅವನಿಗೆ ಜ್ವರ ಇದೆ', hi: 'उसे बुख़ार है' },
                                { en: 'He has a wedding to attend', kn: 'ಅವನು ಒಂದು ಮದುವೆಗೆ ಹೋಗಬೇಕು', hi: 'उसे एक शादी में जाना है' },
                                { en: 'His train was cancelled', kn: 'ಅವನ ರೈಲು ರದ್ದಾಯಿತು', hi: 'उसकी ट्रेन रद्द हो गई' }
                            ]
                        },
                        {
                            q: { en: 'Who will cover the client call?', kn: 'ಕ್ಲೈಂಟ್ ಕರೆಯನ್ನು ಯಾರು ನೋಡಿಕೊಳ್ಳುತ್ತಾರೆ?', hi: 'क्लाइंट कॉल कौन संभालेगा?' },
                            options: [
                                { en: 'Deepak', kn: 'ದೀಪಕ್', hi: 'दीपक' },
                                { en: 'Shalini', kn: 'ಶಾಲಿನಿ', hi: 'शालिनी' },
                                { en: 'Arun', kn: 'ಅರುಣ್', hi: 'अरुण' },
                                { en: 'Nobody, it is cancelled', kn: 'ಯಾರೂ ಇಲ್ಲ, ಅದು ರದ್ದಾಗಿದೆ', hi: 'कोई नहीं, वह रद्द है' }
                            ]
                        },
                        {
                            q: { en: 'What does Shalini ask Arun to do?', kn: 'ಶಾಲಿನಿ ಅರುಣ್‌ಗೆ ಏನು ಮಾಡಲು ಹೇಳುತ್ತಾರೆ?', hi: 'शालिनी अरुण से क्या करने को कहती है?' },
                            options: [
                                { en: 'Send his notes to Deepak and apply on the portal', kn: 'ದೀಪಕ್‌ಗೆ ನೋಟ್ಸ್ ಕಳುಹಿಸಿ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಅರ್ಜಿ ಹಾಕಲು', hi: 'दीपक को नोट्स भेजने और पोर्टल पर अर्ज़ी डालने को' },
                                { en: 'Come to the office after lunch', kn: 'ಊಟದ ನಂತರ ಕಚೇರಿಗೆ ಬರಲು', hi: 'लंच के बाद दफ़्तर आने को' },
                                { en: 'Cancel the client call', kn: 'ಕ್ಲೈಂಟ್ ಕರೆಯನ್ನು ರದ್ದುಮಾಡಲು', hi: 'क्लाइंट कॉल रद्द करने को' },
                                { en: 'Call her again in the evening', kn: 'ಸಂಜೆ ಮತ್ತೆ ಕರೆ ಮಾಡಲು', hi: 'शाम को फिर से फ़ोन करने को' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Ask your manager for two days of leave next week: give the dates, the reason, and say how your work will be covered.',
                        sample: "Hi Meena, do you have a couple of minutes? I wanted to ask about leave next week. My sister is getting married in Mangaluru, so I'd like to take Thursday and Friday off, the twelfth and the thirteenth. I've checked my leave balance, and I still have six days. Before I go, I'll finish the monthly report and do a proper handover. Kavitha has kindly agreed to cover my client calls, and I'll be reachable on my phone for anything urgent. If it helps, I can also stay late on Wednesday. Would that be all right with you?",
                        checklist: ['I asked politely if my manager had time', 'I gave the exact dates', 'I explained the reason', 'I said how my work would be covered', 'I offered to be reachable or to help in another way', 'I asked for approval politely']
                    }
                }
            ]
        },
        '6:1': {
            name: 'Feedback and growth',
            lessons: [
                {
                    kind: 'words', title: 'Talking about performance', list: [
                        { en: 'performance', kn: 'ಕಾರ್ಯಕ್ಷಮತೆ', hi: 'प्रदर्शन', pic: '📈', def: 'how well a person does their work' },
                        { en: 'strength', kn: 'ಬಲ', hi: 'ख़ूबी', pic: '💪', def: 'a quality or skill that you are very good at' },
                        { en: 'weakness', kn: 'ದೌರ್ಬಲ್ಯ', hi: 'कमज़ोरी', pic: '⚠️', def: 'a quality or skill that you need to improve' },
                        { en: 'constructive', kn: 'ರಚನಾತ್ಮಕ', hi: 'रचनात्मक', pic: '🧱', def: 'helpful and meant to make something better' },
                        { en: 'self-assessment', kn: 'ಸ್ವಮೌಲ್ಯಮಾಪನ', hi: 'आत्म-मूल्यांकन', pic: '🪞', def: 'judging your own work and progress honestly' },
                        { en: 'milestone', kn: 'ಮೈಲಿಗಲ್ಲು', hi: 'मील का पत्थर', pic: '🚩', def: 'an important stage or event in progress' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Feedback and growth 1', list: [
                        { read: true, en: 'Overall, your performance this year has been very strong.', kn: 'ಒಟ್ಟಾರೆಯಾಗಿ, ಈ ವರ್ಷ ನಿಮ್ಮ ಕಾರ್ಯಕ್ಷಮತೆ ತುಂಬಾ ಉತ್ತಮವಾಗಿದೆ.', hi: 'कुल मिलाकर, इस साल आपका प्रदर्शन बहुत अच्छा रहा है।' },
                        { en: 'Your biggest strength is how calmly you deal with angry customers.', kn: 'ಕೋಪಗೊಂಡ ಗ್ರಾಹಕರನ್ನು ನೀವು ಶಾಂತವಾಗಿ ನಿಭಾಯಿಸುವುದೇ ನಿಮ್ಮ ದೊಡ್ಡ ಬಲ.', hi: 'नाराज़ ग्राहकों को आप जितने शांत तरीके से संभालते हैं, वही आपकी सबसे बड़ी ख़ूबी है।' },
                        { read: true, en: "May I give you some constructive feedback on yesterday's presentation?", kn: 'ನಿನ್ನೆಯ ಪ್ರಸ್ತುತಿಯ ಬಗ್ಗೆ ನಾನು ನಿಮಗೆ ಸ್ವಲ್ಪ ರಚನಾತ್ಮಕ ಫೀಡ್‌ಬ್ಯಾಕ್ ನೀಡಬಹುದೇ?', hi: 'क्या मैं कल की प्रस्तुति पर आपको कुछ रचनात्मक फ़ीडबैक दे सकता हूँ?' },
                        { en: "In my self-assessment, I've listed time management as a weakness.", kn: 'ನನ್ನ ಸ್ವಮೌಲ್ಯಮಾಪನದಲ್ಲಿ ಸಮಯ ನಿರ್ವಹಣೆಯನ್ನು ನನ್ನ ದೌರ್ಬಲ್ಯವೆಂದು ಬರೆದಿದ್ದೇನೆ.', hi: 'अपने आत्म-मूल्यांकन में मैंने समय प्रबंधन को अपनी कमज़ोरी बताया है।' },
                        { read: true, en: 'Launching the Mysuru branch on time was a real milestone for our team.', kn: 'ಮೈಸೂರು ಶಾಖೆಯನ್ನು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಆರಂಭಿಸಿದ್ದು ನಮ್ಮ ತಂಡಕ್ಕೆ ನಿಜವಾದ ಮೈಲಿಗಲ್ಲು.', hi: 'मैसूरु शाखा को समय पर शुरू करना हमारी टीम के लिए सचमुच मील का पत्थर था।' }
                    ]
                },
                {
                    kind: 'words', title: 'Moving ahead', list: [
                        { en: 'mentor', kn: 'ಮಾರ್ಗದರ್ಶಕ', hi: 'मार्गदर्शक', pic: '🧭', def: 'an experienced person who guides and advises someone newer' },
                        { en: 'upskill', kn: 'ಹೊಸ ಕೌಶಲ್ಯ ಕಲಿ', hi: 'नए कौशल सीखना', pic: '📚', def: 'to learn new skills that help you in your job' },
                        { en: 'certification', kn: 'ಪ್ರಮಾಣೀಕರಣ', hi: 'प्रमाणपत्र कोर्स', pic: '📜', def: 'an official document showing you have passed a course or test' },
                        { en: 'potential', kn: 'ಬೆಳೆಯುವ ಸಾಮರ್ಥ್ಯ', hi: 'क्षमता', pic: '🌱', def: 'qualities in you that can grow and lead to success' },
                        { en: 'increment', kn: 'ವೇತನ ಹೆಚ್ಚಳ', hi: 'वेतन वृद्धि', pic: '💹', def: 'a regular increase in salary, often once a year' },
                        { en: 'deserve', kn: 'ಅರ್ಹರಾಗಿರು', hi: 'हक़दार होना', pic: '🏆', def: 'to have earned something because of your actions' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Feedback and growth 2', list: [
                        { read: true, en: "I'd like to upskill in data analysis; could the company support a short course?", kn: 'ನಾನು ಡೇಟಾ ವಿಶ್ಲೇಷಣೆಯಲ್ಲಿ ಹೊಸ ಕೌಶಲ್ಯ ಕಲಿಯಲು ಬಯಸುತ್ತೇನೆ; ಕಂಪನಿ ಒಂದು ಚಿಕ್ಕ ಕೋರ್ಸ್‌ಗೆ ನೆರವು ನೀಡಬಹುದೇ?', hi: 'मैं डेटा विश्लेषण में अपनी स्किल्स बढ़ाना चाहता हूँ; क्या कंपनी किसी छोटे कोर्स में मदद कर सकती है?' },
                        { read: true, en: 'My mentor suggested I get a cloud certification before applying for the lead role.', kn: 'ಲೀಡ್ ಹುದ್ದೆಗೆ ಅರ್ಜಿ ಹಾಕುವ ಮೊದಲು ಕ್ಲೌಡ್ ಪ್ರಮಾಣೀಕರಣ ಪಡೆಯುವಂತೆ ನನ್ನ ಮಾರ್ಗದರ್ಶಕರು ಸಲಹೆ ನೀಡಿದರು.', hi: 'मेरे मार्गदर्शक ने सलाह दी कि लीड रोल के लिए आवेदन करने से पहले मैं क्लाउड का प्रमाणपत्र कोर्स कर लूँ।' },
                        { en: 'Your manager thinks you have the potential to lead a team within two years.', kn: 'ಎರಡು ವರ್ಷಗಳಲ್ಲಿ ತಂಡವನ್ನು ಮುನ್ನಡೆಸುವ ಸಾಮರ್ಥ್ಯ ನಿಮಗಿದೆ ಎಂದು ನಿಮ್ಮ ಮ್ಯಾನೇಜರ್ ಭಾವಿಸುತ್ತಾರೆ.', hi: 'आपके मैनेजर को लगता है कि आपमें दो साल के अंदर टीम का नेतृत्व करने की क्षमता है।' },
                        { read: true, en: 'This year, everyone in the team will get an increment of at least eight per cent.', kn: 'ಈ ವರ್ಷ ತಂಡದ ಎಲ್ಲರಿಗೂ ಕನಿಷ್ಠ ಶೇಕಡಾ ಎಂಟರಷ್ಟು ವೇತನ ಹೆಚ್ಚಳ ಸಿಗಲಿದೆ.', hi: 'इस साल टीम में सभी को कम से कम आठ प्रतिशत वेतन वृद्धि मिलेगी।', acc: { en: ['This year, everyone in the team will get an increment of at least eight percent.'] } },
                        { en: "I believe I deserve a promotion, and I'd like to discuss what the next step is.", kn: 'ನಾನು ಬಡ್ತಿಗೆ ಅರ್ಹನಾಗಿದ್ದೇನೆ ಎಂದು ನಂಬುತ್ತೇನೆ, ಮತ್ತು ಮುಂದಿನ ಹೆಜ್ಜೆ ಏನು ಎಂಬುದರ ಬಗ್ಗೆ ಚರ್ಚಿಸಲು ಬಯಸುತ್ತೇನೆ.', hi: 'मुझे लगता है कि मैं प्रमोशन का हक़दार हूँ, और मैं अगले कदम पर बात करना चाहूँगा।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'Appraisal day', kn: 'ಮೌಲ್ಯಮಾಪನದ ದಿನ', hi: 'अप्रेज़ल का दिन' },
                    text: {
                        en: "Every April, Farida's company in Mangaluru holds its yearly appraisal meetings. Before hers, she wrote an honest self-assessment, listing her strengths and one clear weakness: she rarely asked for help. Her manager, Mr Rao, began by praising her performance on the new billing system, which had been a big milestone for the team. Then he gave her some constructive feedback about sharing problems earlier. Farida thanked him and asked for training in project management. Mr Rao agreed to pay for a certification course and to find her a senior mentor. He said she had the potential to lead a team one day and that she deserved a good increment. Farida left the meeting with a clear plan for the year ahead.",
                        kn: 'ಪ್ರತಿ ಏಪ್ರಿಲ್‌ನಲ್ಲಿ ಮಂಗಳೂರಿನಲ್ಲಿರುವ ಫರೀದಾಳ ಕಂಪನಿ ವಾರ್ಷಿಕ ಮೌಲ್ಯಮಾಪನ ಸಭೆಗಳನ್ನು ನಡೆಸುತ್ತದೆ. ತನ್ನ ಸಭೆಗೆ ಮೊದಲು, ಅವಳು ಪ್ರಾಮಾಣಿಕವಾದ ಸ್ವಮೌಲ್ಯಮಾಪನ ಬರೆದು, ತನ್ನ ಸಾಮರ್ಥ್ಯಗಳನ್ನು ಮತ್ತು ಒಂದು ಸ್ಪಷ್ಟ ದೌರ್ಬಲ್ಯವನ್ನು ಪಟ್ಟಿ ಮಾಡಿದಳು: ಅವಳು ಸಹಾಯ ಕೇಳುವುದು ಅಪರೂಪ. ಅವಳ ಮ್ಯಾನೇಜರ್ ರಾವ್ ಅವರು, ತಂಡಕ್ಕೆ ದೊಡ್ಡ ಮೈಲಿಗಲ್ಲಾಗಿದ್ದ ಹೊಸ ಬಿಲ್ಲಿಂಗ್ ವ್ಯವಸ್ಥೆಯಲ್ಲಿನ ಅವಳ ಕಾರ್ಯಕ್ಷಮತೆಯನ್ನು ಹೊಗಳುವುದರೊಂದಿಗೆ ಶುರು ಮಾಡಿದರು. ನಂತರ ಸಮಸ್ಯೆಗಳನ್ನು ಬೇಗನೆ ಹಂಚಿಕೊಳ್ಳುವ ಬಗ್ಗೆ ಅವಳಿಗೆ ಸ್ವಲ್ಪ ರಚನಾತ್ಮಕ ಫೀಡ್‌ಬ್ಯಾಕ್ ನೀಡಿದರು. ಫರೀದಾ ಅವರಿಗೆ ಧನ್ಯವಾದ ಹೇಳಿ, ಪ್ರಾಜೆಕ್ಟ್ ಮ್ಯಾನೇಜ್‌ಮೆಂಟ್‌ನಲ್ಲಿ ತರಬೇತಿ ಕೇಳಿದಳು. ರಾವ್ ಅವರು ಒಂದು ಪ್ರಮಾಣೀಕರಣ ಕೋರ್ಸ್‌ನ ಶುಲ್ಕ ಭರಿಸಲು ಮತ್ತು ಅವಳಿಗೆ ಒಬ್ಬ ಹಿರಿಯ ಮಾರ್ಗದರ್ಶಕರನ್ನು ಹುಡುಕಲು ಒಪ್ಪಿದರು. ಅವಳಿಗೆ ಮುಂದೊಂದು ದಿನ ತಂಡವನ್ನು ಮುನ್ನಡೆಸುವ ಸಾಮರ್ಥ್ಯವಿದೆ ಮತ್ತು ಅವಳು ಒಳ್ಳೆಯ ವೇತನ ಹೆಚ್ಚಳಕ್ಕೆ ಅರ್ಹಳು ಎಂದು ಅವರು ಹೇಳಿದರು. ಮುಂದಿನ ವರ್ಷಕ್ಕೆ ಸ್ಪಷ್ಟ ಯೋಜನೆಯೊಂದಿಗೆ ಫರೀದಾ ಸಭೆಯಿಂದ ಹೊರಬಂದಳು.',
                        hi: 'हर अप्रैल में मंगलुरु में फ़रीदा की कंपनी सालाना अप्रेज़ल मीटिंग करती है। अपनी मीटिंग से पहले उसने एक ईमानदार आत्म-मूल्यांकन लिखा, जिसमें उसने अपनी ख़ूबियाँ और एक साफ़ कमज़ोरी लिखी: वह शायद ही कभी मदद माँगती थी। उसके मैनेजर राव जी ने नए बिलिंग सिस्टम पर उसके प्रदर्शन की तारीफ़ से शुरुआत की, जो टीम के लिए मील का पत्थर साबित हुआ था। फिर उन्होंने समस्याएँ जल्दी बताने के बारे में उसे कुछ रचनात्मक फ़ीडबैक दिया। फ़रीदा ने उन्हें धन्यवाद दिया और प्रोजेक्ट मैनेजमेंट की ट्रेनिंग माँगी। राव जी एक प्रमाणपत्र कोर्स का ख़र्च उठाने और उसके लिए एक वरिष्ठ मार्गदर्शक ढूँढने को राज़ी हो गए। उन्होंने कहा कि उसमें एक दिन टीम का नेतृत्व करने की क्षमता है और वह अच्छी वेतन वृद्धि की हक़दार है। फ़रीदा आने वाले साल की साफ़ योजना के साथ मीटिंग से बाहर निकली।'
                    },
                    questions: [
                        {
                            q: { en: 'What weakness did Farida write down?', kn: 'ಫರೀದಾ ಯಾವ ದೌರ್ಬಲ್ಯವನ್ನು ಬರೆದಳು?', hi: 'फ़रीदा ने कौन-सी कमज़ोरी लिखी?' },
                            options: [
                                { en: 'She rarely asked for help', kn: 'ಅವಳು ಸಹಾಯ ಕೇಳುವುದು ಅಪರೂಪ', hi: 'वह शायद ही कभी मदद माँगती थी' },
                                { en: 'She was often late', kn: 'ಅವಳು ಆಗಾಗ ತಡವಾಗಿ ಬರುತ್ತಿದ್ದಳು', hi: 'वह अक्सर देर से आती थी' },
                                { en: 'She spoke too fast', kn: 'ಅವಳು ತುಂಬಾ ವೇಗವಾಗಿ ಮಾತನಾಡುತ್ತಿದ್ದಳು', hi: 'वह बहुत तेज़ बोलती थी' },
                                { en: 'She made billing mistakes', kn: 'ಅವಳು ಬಿಲ್ಲಿಂಗ್‌ನಲ್ಲಿ ತಪ್ಪು ಮಾಡುತ್ತಿದ್ದಳು', hi: 'वह बिलिंग में ग़लतियाँ करती थी' }
                            ]
                        },
                        {
                            q: { en: 'What did Farida ask for?', kn: 'ಫರೀದಾ ಏನನ್ನು ಕೇಳಿದಳು?', hi: 'फ़रीदा ने क्या माँगा?' },
                            options: [
                                { en: 'Training in project management', kn: 'ಪ್ರಾಜೆಕ್ಟ್ ಮ್ಯಾನೇಜ್‌ಮೆಂಟ್‌ನಲ್ಲಿ ತರಬೇತಿ', hi: 'प्रोजेक्ट मैनेजमेंट की ट्रेनिंग' },
                                { en: 'A transfer to Pune', kn: 'ಪುಣೆಗೆ ವರ್ಗಾವಣೆ', hi: 'पुणे में तबादला' },
                                { en: 'A new laptop', kn: 'ಹೊಸ ಲ್ಯಾಪ್‌ಟಾಪ್', hi: 'नया लैपटॉप' },
                                { en: 'More holidays', kn: 'ಹೆಚ್ಚು ರಜೆಗಳು', hi: 'ज़्यादा छुट्टियाँ' }
                            ]
                        },
                        {
                            q: { en: 'What did Mr Rao agree to do?', kn: 'ರಾವ್ ಅವರು ಏನು ಮಾಡಲು ಒಪ್ಪಿದರು?', hi: 'राव जी क्या करने को राज़ी हुए?' },
                            options: [
                                { en: 'Pay for a course and find her a mentor', kn: 'ಕೋರ್ಸ್‌ನ ಶುಲ್ಕ ಭರಿಸಿ ಮಾರ್ಗದರ್ಶಕರನ್ನು ಹುಡುಕಲು', hi: 'कोर्स का ख़र्च उठाने और मार्गदर्शक ढूँढने को' },
                                { en: 'Make her a manager at once', kn: 'ತಕ್ಷಣ ಅವಳನ್ನು ಮ್ಯಾನೇಜರ್ ಮಾಡಲು', hi: 'उसे तुरंत मैनेजर बनाने को' },
                                { en: 'Move her to another team', kn: 'ಅವಳನ್ನು ಬೇರೆ ತಂಡಕ್ಕೆ ಕಳುಹಿಸಲು', hi: 'उसे दूसरी टीम में भेजने को' },
                                { en: 'Cancel her appraisal', kn: 'ಅವಳ ಮೌಲ್ಯಮಾಪನವನ್ನು ರದ್ದುಮಾಡಲು', hi: 'उसका अप्रेज़ल रद्द करने को' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'The yearly review', kn: 'ವಾರ್ಷಿಕ ವಿಮರ್ಶೆ', hi: 'सालाना समीक्षा' },
                    scenario: {
                        en: 'Ramesh has his yearly appraisal with his manager, Sunita, at their office in Bengaluru.',
                        kn: 'ರಮೇಶ್ ಬೆಂಗಳೂರಿನ ಕಚೇರಿಯಲ್ಲಿ ತನ್ನ ಮ್ಯಾನೇಜರ್ ಸುನೀತಾ ಅವರೊಂದಿಗೆ ವಾರ್ಷಿಕ ಮೌಲ್ಯಮಾಪನ ಸಭೆಯಲ್ಲಿದ್ದಾನೆ.',
                        hi: 'रमेश बेंगलुरु के दफ़्तर में अपनी मैनेजर सुनीता के साथ सालाना अप्रेज़ल मीटिंग में है।'
                    },
                    speakers: [{ name: 'Sunita', voice: 'f' }, { name: 'Ramesh', voice: 'm' }],
                    lines: [
                        { speaker: 'Sunita', en: "Thanks for coming in, Ramesh. Let's start with your self-assessment. How do you feel the year went?", kn: 'ಬಂದಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದ ರಮೇಶ್. ನಿಮ್ಮ ಸ್ವಮೌಲ್ಯಮಾಪನದಿಂದ ಶುರು ಮಾಡೋಣ. ಈ ವರ್ಷ ಹೇಗೆ ಹೋಯಿತು ಅನಿಸುತ್ತದೆ?', hi: 'आने के लिए धन्यवाद रमेश। चलो, तुम्हारे आत्म-मूल्यांकन से शुरू करते हैं। तुम्हें यह साल कैसा लगा?' },
                        { speaker: 'Ramesh', en: 'I think it went well. We delivered the payment app on time, and I trained two new joiners.', kn: 'ಚೆನ್ನಾಗಿ ಹೋಯಿತು ಅನಿಸುತ್ತದೆ. ನಾವು ಪೇಮೆಂಟ್ ಆ್ಯಪ್ ಅನ್ನು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಕೊಟ್ಟೆವು, ಮತ್ತು ನಾನು ಇಬ್ಬರು ಹೊಸಬರಿಗೆ ತರಬೇತಿ ನೀಡಿದೆ.', hi: 'मुझे लगता है अच्छा रहा। हमने पेमेंट ऐप समय पर दे दिया, और मैंने दो नए लोगों को ट्रेनिंग दी।' },
                        { speaker: 'Sunita', en: 'I agree. Your performance on the app was excellent, and the client mentioned your work specially.', kn: 'ನಾನು ಒಪ್ಪುತ್ತೇನೆ. ಆ್ಯಪ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಕಾರ್ಯಕ್ಷಮತೆ ಅತ್ಯುತ್ತಮವಾಗಿತ್ತು, ಮತ್ತು ಕ್ಲೈಂಟ್ ನಿಮ್ಮ ಕೆಲಸವನ್ನು ವಿಶೇಷವಾಗಿ ಪ್ರಸ್ತಾಪಿಸಿದರು.', hi: 'मैं सहमत हूँ। ऐप पर तुम्हारा प्रदर्शन शानदार था, और क्लाइंट ने ख़ास तौर पर तुम्हारे काम का ज़िक्र किया।' },
                        { speaker: 'Ramesh', en: "That's great to hear. Is there anything you'd like me to improve?", kn: 'ಕೇಳಿ ತುಂಬಾ ಖುಷಿಯಾಯಿತು. ನಾನು ಸುಧಾರಿಸಬೇಕಾದದ್ದು ಏನಾದರೂ ಇದೆಯೇ?', hi: 'यह सुनकर बहुत अच्छा लगा। क्या कुछ ऐसा है जिसमें आप चाहेंगी कि मैं सुधार करूँ?' },
                        { speaker: 'Sunita', en: "Just one thing. In meetings you often stay quiet, even when you have good ideas. I'd like you to speak up more.", kn: 'ಒಂದೇ ವಿಷಯ. ಒಳ್ಳೆಯ ಆಲೋಚನೆಗಳಿದ್ದರೂ ಮೀಟಿಂಗ್‌ಗಳಲ್ಲಿ ನೀವು ಆಗಾಗ ಸುಮ್ಮನಿರುತ್ತೀರಿ. ನೀವು ಇನ್ನೂ ಹೆಚ್ಚು ಮಾತನಾಡಬೇಕು ಎಂಬುದು ನನ್ನ ಆಸೆ.', hi: 'बस एक बात। अच्छे आइडिया होने पर भी तुम मीटिंग में अक्सर चुप रहते हो। मैं चाहती हूँ कि तुम खुलकर ज़्यादा बोलो।' },
                        { speaker: 'Ramesh', en: "That's fair. I'll try to share my ideas earlier. Could I also ask for some training?", kn: 'ಅದು ಸರಿ. ನನ್ನ ಆಲೋಚನೆಗಳನ್ನು ಬೇಗನೆ ಹಂಚಿಕೊಳ್ಳಲು ಪ್ರಯತ್ನಿಸುತ್ತೇನೆ. ನಾನು ಸ್ವಲ್ಪ ತರಬೇತಿಯನ್ನೂ ಕೇಳಬಹುದೇ?', hi: 'यह ठीक बात है। मैं अपने आइडिया जल्दी रखने की कोशिश करूँगा। क्या मैं कुछ ट्रेनिंग भी माँग सकता हूँ?' },
                        { speaker: 'Sunita', en: 'Of course. What did you have in mind?', kn: 'ಖಂಡಿತ. ನಿಮ್ಮ ಮನಸ್ಸಿನಲ್ಲಿ ಏನಿದೆ?', hi: 'बिल्कुल। तुम्हारे मन में क्या है?' },
                        { speaker: 'Ramesh', en: 'A course in public speaking, and perhaps a mentor from the senior team.', kn: 'ಸಾರ್ವಜನಿಕ ಭಾಷಣದ ಒಂದು ಕೋರ್ಸ್, ಮತ್ತು ಸಾಧ್ಯವಾದರೆ ಹಿರಿಯರ ತಂಡದಿಂದ ಒಬ್ಬ ಮಾರ್ಗದರ್ಶಕರು.', hi: 'पब्लिक स्पीकिंग का एक कोर्स, और हो सके तो सीनियर टीम से कोई मार्गदर्शक।' },
                        { speaker: 'Sunita', en: "Both are good ideas. I'll speak to HR this week. Keep this up, and we can discuss a team lead role next year.", kn: 'ಎರಡೂ ಒಳ್ಳೆಯ ಯೋಚನೆಗಳು. ಈ ವಾರ ಎಚ್‌ಆರ್ ಜೊತೆ ಮಾತನಾಡುತ್ತೇನೆ. ಹೀಗೇ ಮುಂದುವರಿಸಿ, ಮುಂದಿನ ವರ್ಷ ಟೀಮ್ ಲೀಡ್ ಹುದ್ದೆಯ ಬಗ್ಗೆ ಚರ್ಚಿಸಬಹುದು.', hi: 'दोनों अच्छे विचार हैं। मैं इस हफ़्ते एचआर से बात करूँगी। ऐसे ही काम करते रहो, तो अगले साल टीम लीड की भूमिका पर बात कर सकते हैं।' },
                        { speaker: 'Ramesh', en: 'Thank you, Sunita. I really appreciate your support.', kn: 'ಧನ್ಯವಾದ ಸುನೀತಾ. ನಿಮ್ಮ ಬೆಂಬಲಕ್ಕೆ ನಾನು ನಿಜವಾಗಿಯೂ ಆಭಾರಿ.', hi: 'धन्यवाद सुनीता। आपके सहयोग की मैं सच में क़द्र करता हूँ।' }
                    ],
                    questions: [
                        {
                            q: { en: 'What did the client mention specially?', kn: 'ಕ್ಲೈಂಟ್ ವಿಶೇಷವಾಗಿ ಏನನ್ನು ಪ್ರಸ್ತಾಪಿಸಿದರು?', hi: 'क्लाइंट ने ख़ास तौर पर किसका ज़िक्र किया?' },
                            options: [
                                { en: "Ramesh's work on the app", kn: 'ಆ್ಯಪ್‌ನಲ್ಲಿ ರಮೇಶ್‌ನ ಕೆಲಸ', hi: 'ऐप पर रमेश का काम' },
                                { en: 'The late delivery', kn: 'ತಡವಾದ ಡೆಲಿವರಿ', hi: 'देर से हुई डिलीवरी' },
                                { en: "Sunita's new idea", kn: 'ಸುನೀತಾರ ಹೊಸ ಯೋಚನೆ', hi: 'सुनीता का नया आइडिया' },
                                { en: 'The price of the app', kn: 'ಆ್ಯಪ್‌ನ ಬೆಲೆ', hi: 'ऐप की क़ीमत' }
                            ]
                        },
                        {
                            q: { en: 'What does Sunita want Ramesh to improve?', kn: 'ರಮೇಶ್ ಏನನ್ನು ಸುಧಾರಿಸಬೇಕು ಎಂದು ಸುನೀತಾ ಬಯಸುತ್ತಾರೆ?', hi: 'सुनीता चाहती है कि रमेश किस बात में सुधार करे?' },
                            options: [
                                { en: 'Speaking up more in meetings', kn: 'ಮೀಟಿಂಗ್‌ಗಳಲ್ಲಿ ಹೆಚ್ಚು ಮಾತನಾಡುವುದು', hi: 'मीटिंग में ज़्यादा खुलकर बोलना' },
                                { en: 'Coming to work on time', kn: 'ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಕೆಲಸಕ್ಕೆ ಬರುವುದು', hi: 'समय पर काम पर आना' },
                                { en: 'Writing shorter emails', kn: 'ಚಿಕ್ಕ ಇಮೇಲ್‌ಗಳನ್ನು ಬರೆಯುವುದು', hi: 'छोटे ईमेल लिखना' },
                                { en: 'Training new joiners', kn: 'ಹೊಸಬರಿಗೆ ತರಬೇತಿ ನೀಡುವುದು', hi: 'नए लोगों को ट्रेनिंग देना' }
                            ]
                        },
                        {
                            q: { en: 'What could they discuss next year?', kn: 'ಮುಂದಿನ ವರ್ಷ ಅವರು ಯಾವುದರ ಬಗ್ಗೆ ಚರ್ಚಿಸಬಹುದು?', hi: 'अगले साल वे किस बारे में बात कर सकते हैं?' },
                            options: [
                                { en: 'A team lead role', kn: 'ಟೀಮ್ ಲೀಡ್ ಹುದ್ದೆ', hi: 'टीम लीड की भूमिका' },
                                { en: 'A move to another city', kn: 'ಬೇರೆ ನಗರಕ್ಕೆ ವರ್ಗಾವಣೆ', hi: 'दूसरे शहर में तबादला' },
                                { en: 'A longer holiday', kn: 'ದೀರ್ಘ ರಜೆ', hi: 'लंबी छुट्टी' },
                                { en: 'A new payment app', kn: 'ಹೊಸ ಪೇಮೆಂಟ್ ಆ್ಯಪ್', hi: 'नया पेमेंट ऐप' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'You are in your yearly appraisal. Talk to your manager about your year: mention one achievement, accept one piece of feedback politely, ask for one kind of training, and ask what you need to do to be promoted.',
                        sample: "Thank you for the feedback, Sunil. I'm proud of how this year went, especially finishing the Hubballi project two weeks early. I also take your point about my reports. You're right that they're sometimes too long, and from now on I'll keep them to one page. I'd really like to grow in this company, so I wanted to ask about training. Would it be possible to join an advanced data course this year? Finally, I'd like to understand what I need to do to move into a senior role. Could we set some clear goals together for the next six months?",
                        checklist: ['I thanked my manager for the feedback', 'I mentioned one clear achievement', 'I accepted a piece of feedback politely and said what I would change', 'I asked for a specific kind of training', 'I asked what I need to do to be promoted']
                    }
                }
            ]
        }
    },
    glosses: {
        kn: {
            // 1:1 Describing your work
            'ನನ್ನ ಈಗಿನ ಪಾತ್ರದಲ್ಲಿ ಇಡೀ ಕಂಪನಿಯ ಪೇರೋಲ್ ಕೆಲಸ ನಾನು ನೋಡಿಕೊಳ್ಳುತ್ತೇನೆ.': "my/mine|current/present|in the role/in the position|whole/entire|company's/of the company|payroll/salary list|work/job|I|look after/take care of",
            'ನೀವು ಯಾವ ವಿಭಾಗದಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತೀರಿ, ಮತ್ತು ಯಾರಿಗೆ ರಿಪೋರ್ಟ್ ಮಾಡುತ್ತೀರಿ?': 'you|which/what|in the department/in the section|work/job|do/you do|and/also|to whom/to who|report|do/you do',
            'ಅಧಿಕೃತವಾಗಿ ನನ್ನ ಪದನಾಮ ಸೀನಿಯರ್ ಅನಾಲಿಸ್ಟ್, ಆದರೆ ನನ್ನ ಕಾರ್ಯಗಳು ಪ್ರತಿ ವಾರ ಬದಲಾಗುತ್ತವೆ.': 'officially/formally|my/mine|designation/job title|senior|analyst|but/however|my/mine|tasks/duties|every/each|week|change/keep changing',
            'ನಾನು ಆರು ಜನರ ತಂಡದ ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡುತ್ತೇನೆ ಮತ್ತು ಹೆಚ್ಚಿನ ಕ್ಲೈಂಟ್ ಕರೆಗಳನ್ನು ನಿಭಾಯಿಸುತ್ತೇನೆ.': "I|six|people's/of people|team's/of the team|supervision/oversight|do/I do|and/also|most/most of the|client|calls/phone calls|handle/manage",
            'ಸಾಮಾನ್ಯವಾಗಿ ನಾನು ತುರ್ತು ಕೆಲಸಗಳನ್ನು ಊಟಕ್ಕೆ ಮುಂಚೆ ಮುಗಿಸಿ, ಉಳಿದದ್ದನ್ನು ಆಮೇಲೆ ಪ್ಲಾನ್ ಮಾಡುತ್ತೇನೆ.': 'usually/normally|I|urgent/pressing|tasks/jobs|lunch/to lunch|before/earlier|finishing/having finished|the rest/what is left|later/afterwards|plan|do/I do',
            'ನಮ್ಮ ಕೇಂದ್ರ ಕಚೇರಿ ಬೆಂಗಳೂರಿನಲ್ಲಿದೆ, ಆದರೆ ನಮ್ಮ ಹೆಚ್ಚಿನ ಸಿಬ್ಬಂದಿ ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿದ್ದಾರೆ.': 'our/ours|central/head|office|is in Bengaluru/in Bengaluru|but/however|our/ours|most/most of|staff/workforce|are in Hubballi/in Hubballi',
            'ನಮ್ಮದು ಕ್ಲಿನಿಕ್‌ಗಳಿಗೆ ಬಿಲ್ಲಿಂಗ್ ಸಾಫ್ಟ್‌ವೇರ್ ತಯಾರಿಸುವ ಒಂದು ಸಣ್ಣ ಸ್ಟಾರ್ಟ್‌ಅಪ್.': 'ours/ours is|for clinics/to clinics|billing|software|that makes/building|a/one|small/little|startup/new company',
            'ಮೈಸೂರಿನ ಬಳಿಯ ನಮ್ಮ ಕಾರ್ಖಾನೆ ಭಾರತದ ಹೆಚ್ಚಿನ ದ್ವಿಚಕ್ರ ವಾಹನ ಬ್ರ್ಯಾಂಡ್‌ಗಳಿಗೆ ಬ್ರೇಕ್ ಭಾಗಗಳನ್ನು ತಯಾರಿಸುತ್ತದೆ.': "Mysuru's/of Mysuru|near/nearby|our/ours|factory/plant|India's/of India|most/most of the|two-wheel/two-wheeler|vehicle|for brands/to brands|brake|parts/components|manufactures/makes",
            'ಗ್ರಾಮೀಣ ಆರೋಗ್ಯ ಸೇವೆಯಲ್ಲಿ ನಮಗಿರುವ ನೈಪುಣ್ಯವೇ ನಮ್ಮನ್ನು ಬೇರೆಯವರಿಂದ ಭಿನ್ನವಾಗಿಸುತ್ತದೆ.': 'rural/village|health|in service/in care|that we have/our|expertise itself/expertise|us|from others/than others|makes different/sets apart',
            'ಸಣ್ಣ ಪಟ್ಟಣಗಳ ಅಂಗಡಿಗಳು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಮಾರಾಟ ಶುರು ಮಾಡಲು ಸಹಾಯ ಮಾಡುವುದರಲ್ಲಿ ನಾವು ಪರಿಣತಿ ಹೊಂದಿದ್ದೇವೆ.': "small/little|towns'/of towns|shops/stores|online/on the internet|selling/sales|start/begin|to do/to make|help|in doing/in making|we|expertise/skill|have/possess",
            // 2:1 Online meetings
            'ಮಾತನಾಡದೇ ಇರುವಾಗ ದಯವಿಟ್ಟು ಎಲ್ಲರೂ ಮ್ಯೂಟ್ ಮಾಡಿಕೊಳ್ಳಿ.': 'not speaking/without talking|while/when|please|everyone/all|mute|do (for yourselves)/keep',
            'ನಾನು ಈಗಷ್ಟೇ ಟೀಮ್ ಚಾಟ್‌ನಲ್ಲಿ ಮೀಟಿಂಗ್ ಲಿಂಕ್ ಕಳುಹಿಸಿದ್ದೇನೆ.': 'I|just now/only now|team|in the chat/in chat|meeting|link|have sent/sent',
            'ರವಿ, ನಿಮ್ಮ ವೆಬ್‌ಕ್ಯಾಮ್ ಆಫ್ ಆಗಿದೆ; ಒಂದು ನಿಮಿಷ ಆನ್ ಮಾಡುತ್ತೀರಾ?': 'Ravi|your/yours|webcam/camera|off|is/has become|one/a|minute|on|will you do/could you do',
            'ವೇಟಿಂಗ್ ರೂಮ್‌ನಿಂದ ಭಾಗವಹಿಸುವವರನ್ನು ಒಳಗೆ ಬಿಡಲು ಹೋಸ್ಟ್‌ಗೆ ಮಾತ್ರ ಸಾಧ್ಯ.': 'waiting|from the room/room|participants/attendees|in/inside|to let/to allow|for the host/to the host|only/just|possible/can',
            'ನಿಮ್ಮ ಹಿಂದಿನ ಟ್ರಾಫಿಕ್ ಶಬ್ದ ನಮಗೆ ಕೇಳಿಸದಂತೆ ದಯವಿಟ್ಟು ಹೆಡ್‌ಸೆಟ್ ಹಾಕಿಕೊಳ್ಳಿ.': "your/yours|behind/back|traffic|noise/sound|to us/us|so that (we) can't hear/without being heard|please|headset|put on/wear",
            'ಕ್ಷಮಿಸಿ, ನನ್ನ ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಅಸ್ಥಿರವಾಗಿದೆ; ನಾನು ವಿಡಿಯೋ ಆಫ್ ಮಾಡುತ್ತೇನೆ.': 'sorry/excuse me|my/mine|internet|connection/link|is unstable/keeps dropping|I|video|off|will do/will turn',
            'ಕೆಲವು ಸೆಕೆಂಡುಗಳ ವಿಳಂಬ ಇದೆ, ಹಾಗಾಗಿ ಒಬ್ಬರ ಮಾತಿನ ಮೇಲೆ ಇನ್ನೊಬ್ಬರು ಮಾತನಾಡುವುದು ಬೇಡ.': "a few/some|of seconds/seconds|lag/delay|is/there is|so/therefore|one person's/one's|speech/words|over/on top of|another/the other|speaking/talking|don't/not needed",
            'ನಿಮ್ಮ ಸ್ಕ್ರೀನ್ ನಿಂತುಹೋಗಿದೆ; ಮತ್ತೊಮ್ಮೆ ಶೇರ್ ಮಾಡುತ್ತೀರಾ?': 'your/yours|screen|has frozen/has stopped|once more/again|share|will you do/could you do',
            'ನನಗೆ ಪ್ರತಿಧ್ವನಿ ಕೇಳಿಸುತ್ತಿದೆ; ಯಾರದೋ ಲ್ಯಾಪ್‌ಟಾಪ್ ಸ್ಪೀಕರ್ ಮೈಕ್‌ಗೆ ತುಂಬಾ ಹತ್ತಿರ ಇದೆ.': "to me/I|echo|is being heard/can hear|someone's/somebody's|laptop|speaker|to the mic/mic|too/very|close/near|is",
            'ಇಂದು ಸಂಜೆಯೊಳಗೆ ನಾನು ರೆಕಾರ್ಡಿಂಗ್ ಮತ್ತು ಒಂದು ಚಿಕ್ಕ ಫಾಲೋ-ಅಪ್ ಇಮೇಲ್ ಕಳುಹಿಸುತ್ತೇನೆ.': 'today/this|by evening/before evening|I|recording|and/also|a/one|short/small|follow-up|email|will send/send',
            // 3:1 Giving a presentation
            'ಇಂದು ನಾವು ಏನೇನು ಚರ್ಚಿಸುತ್ತೇವೆ ಎಂಬುದರ ಸಂಕ್ಷಿಪ್ತ ಪರಿಚಯದೊಂದಿಗೆ ಶುರು ಮಾಡುತ್ತೇನೆ.': "today|we|what all/which things|will discuss/will cover|of that/about what|brief/short|with an introduction/with an overview|start/begin|I will do/I'll",
            'ಈ ಸ್ಲೈಡ್‌ನಲ್ಲಿ ನೀವು ನೋಡುವಂತೆ, ಮಾರ್ಚ್ ನಂತರ ಮಾರಾಟ ದುಪ್ಪಟ್ಟಾಯಿತು.': 'this|on the slide/in the slide|you|as (you) see/as you can see|March|after/since|sales/selling|doubled/became double',
            'ನಾನು ರೂಪರೇಷೆಯನ್ನು ಸರಳವಾಗಿ ಇಟ್ಟಿದ್ದೇನೆ: ಸಮಸ್ಯೆ, ಪರಿಹಾರ, ವೆಚ್ಚ ಮತ್ತು ಸಮಯಾವಧಿ.': 'I|outline/plan|simple/simply|have kept/kept|problem/issue|solution/answer|cost/expense|and/also|timeline/time frame',
            'ಈ ಚಾರ್ಟ್ ಕಳೆದ ಎರಡು ವರ್ಷಗಳ ನಮ್ಮ ತಿಂಗಳ ಅಂಕಿಅಂಶಗಳನ್ನು ತೋರಿಸುತ್ತದೆ.': "this|chart/graph|last/past|two|years'/of years|our/ours|monthly/month's|figures/numbers|shows/displays",
            'ನಾನು ಒಂದು ಅಂಕಿಅಂಶವನ್ನು ವಿಶೇಷವಾಗಿ ಎತ್ತಿ ತೋರಿಸಲು ಬಯಸುತ್ತೇನೆ: ನಮ್ಮ ವೆಚ್ಚ ಶೇಕಡಾ ಹನ್ನೆರಡರಷ್ಟು ಕಡಿಮೆಯಾಗಿದೆ.': 'I|one/a|figure/number|especially/in particular|raising/lifting|to show/to point out|would like/wish|our/ours|cost/costs|per cent/percent|by twelve/about twelve|has fallen/has reduced',
            'ಯಾರಾದರೂ ಪ್ರೊಜೆಕ್ಟರ್ ನೋಡುತ್ತೀರಾ? ಸ್ಲೈಡ್‌ಗಳು ತುಂಬಾ ಕತ್ತಲಾಗಿ ಕಾಣುತ್ತಿವೆ.': 'someone/anyone|projector|will you check/will you look|slides|very/too|dark/dim|look/appear',
            'ನಾನು ಇಡೀ ಭಾಷಣವನ್ನು ಎರಡು ಬಾರಿ ಪೂರ್ವಾಭ್ಯಾಸ ಮಾಡಿದ್ದೇನೆ, ಹಾಗಾಗಿ ಅದಕ್ಕೆ ಎಷ್ಟು ಸಮಯ ಬೇಕು ಎಂದು ನನಗೆ ಗೊತ್ತು.': 'I|whole/entire|talk/speech|two|times|rehearsal/practice|have done/did|so/therefore|for it/it|how much/how long|time|is needed/takes|that/(quote)|to me/I|know/known',
            'ಎಲ್ಲಾ ಅಂಕಿಗಳಿರುವ ಒಂದು ಹ್ಯಾಂಡ್‌ಔಟ್ ಇದೆ, ಹಾಗಾಗಿ ನೀವು ನೋಟ್ಸ್ ಬರೆದುಕೊಳ್ಳುವ ಅಗತ್ಯವಿಲ್ಲ.': 'all/every|with the numbers/having numbers|a/one|handout/printed sheet|is/there is|so/therefore|you|notes|writing down/taking|no need/not needed',
            'ಒಳ್ಳೆಯ ಪ್ರಶ್ನೆ; ಒಟ್ಟು ವೆಚ್ಚ ಎಂದು ನಾನು ಯಾವ ಅರ್ಥದಲ್ಲಿ ಹೇಳಿದೆ ಎಂದು ಸ್ಪಷ್ಟಪಡಿಸುತ್ತೇನೆ.': 'good/fair|question/query|total/overall|cost/expense|as/(quote)|I|which/what|in the sense/meaning|said/I said|that/(quote)|will clarify/will make clear',
            'ಕೊನೆಯದಾಗಿ, ಮೂರು ಮುಖ್ಯ ಅಂಶಗಳ ಸಾರಾಂಶವನ್ನು ಒಂದು ನಿಮಿಷದಲ್ಲಿ ಹೇಳುತ್ತೇನೆ.': "finally/to conclude|three|main/key|points'/of the points|summary/gist|one/a|in a minute/within a minute|will say/will tell",
            // 4:1 Customers and clients
            'ನಾವು ಏನನ್ನಾದರೂ ಸೂಚಿಸುವ ಮೊದಲು, ನಿಮ್ಮ ಅಗತ್ಯಗಳ ಬಗ್ಗೆ ಇನ್ನಷ್ಟು ಹೇಳುತ್ತೀರಾ?': "we|anything/something|suggesting/to suggest|before/first|your/yours|requirements'/needs'|about/regarding|a bit more/more|will you tell/could you tell",
            'ಗುರುವಾರದೊಳಗೆ ನಾವು ನಿಮಗೆ ವಿವರವಾದ ಪ್ರಸ್ತಾವನೆ ಮತ್ತು ಕೊಟೇಶನ್ ಕಳುಹಿಸುತ್ತೇವೆ.': 'by Thursday/before Thursday|we|to you/you|detailed/full|proposal/offer|and/also|quotation/price quote|will send/send',
            'ನಮ್ಮ ಸ್ಥೂಲ ಸಮಯಾವಧಿ ಆರು ವಾರಗಳು, ಆದರೆ ಸೈಟ್ ನೋಡಿದ ನಂತರ ಖಚಿತಪಡಿಸುತ್ತೇನೆ.': 'our/ours|rough/approximate|timeline/time frame|six|weeks|but/however|site/location|seeing/having seen|after/later|will confirm/will make sure',
            'ಯಾವ ಪ್ಲಾನ್ ನಿಮಗೆ ಸರಿಹೊಂದುತ್ತದೆ ಎಂದು ನಿರ್ಧರಿಸಲು ಒಂದು ಚಿಕ್ಕ ಪ್ರಾತ್ಯಕ್ಷಿಕೆ ಸಹಾಯವಾಗಬಹುದೇ?': 'which/what|plan|to you/you|suits/fits|that/(quote)|to decide/for deciding|a/one|short/small|demo/demonstration|could help/would be helpful',
            'ಈ ಕ್ಲೈಂಟ್‌ಗೆ ಆ್ಯಪ್ ಸ್ಕ್ರೀನ್‌ಗಳೂ ಸೇರಿದಂತೆ ಎಲ್ಲವೂ ಕನ್ನಡದಲ್ಲೇ ಬೇಕು.': 'this|for the client/to the client|app|screens too/even the screens|including/together with|everything/all|in Kannada itself/only in Kannada|wants/needed',
            'ನಿಮ್ಮ ಆರ್ಡರ್ ಸೋಮವಾರ ನಮ್ಮ ಪುಣೆ ಗೋದಾಮಿನಿಂದ ರವಾನೆಯಾಗುತ್ತದೆ.': 'your/yours|order|Monday/on Monday|our/ours|Pune|from the warehouse/from the godown|will be dispatched/will be sent',
            'ಇನ್‌ವಾಯ್ಸ್‌ನಲ್ಲಿ ತಪ್ಪು ಮೊತ್ತ ಇದೆ, ಹಾಗಾಗಿ ಅದನ್ನು ಸರಿಪಡಿಸಲು ಅಕೌಂಟ್ಸ್ ವಿಭಾಗಕ್ಕೆ ಹೇಳುತ್ತೇನೆ.': 'in the invoice/on the invoice|wrong/incorrect|amount/sum|is/there is|so/therefore|it/that|to correct/to fix|accounts|to the department/to the section|will tell/will ask',
            'ನಿಮ್ಮ ಬೇಸರ ನನಗೆ ಅರ್ಥವಾಗುತ್ತದೆ, ಮತ್ತು ಇಂದೇ ಇದನ್ನು ನನ್ನ ಮ್ಯಾನೇಜರ್ ಗಮನಕ್ಕೆ ತರುತ್ತೇನೆ.': 'your/yours|frustration/annoyance|to me/I|is understood/understand|and/also|today itself/this very day|this/it|my/mine|manager|to the attention/to notice|will bring/will take',
            'ತಡವಾದುದಕ್ಕೆ ಪರಿಹಾರವಾಗಿ, ಈ ಬಾರಿ ಡೆಲಿವರಿ ಶುಲ್ಕವನ್ನು ನಾವು ಮನ್ನಾ ಮಾಡುತ್ತೇವೆ.': 'for the delay/for being late|as compensation/to make up|this|time|delivery|charge/fee|we|waive/let off|will do/will make',
            'ಬದಲಿ ಉತ್ಪನ್ನ ಶುಕ್ರವಾರದೊಳಗೆ ನಿಮಗೆ ತಲುಪುತ್ತದೆ ಎಂದು ಭರವಸೆ ನೀಡುತ್ತೇನೆ; ಇದು ನನ್ನ ವೈಯಕ್ತಿಕ ಬದ್ಧತೆ.': 'replacement/substitute|product/item|by Friday/before Friday|to you/you|will reach/will arrive|that/(quote)|assurance/promise|I give/I assure|this/it|my/mine|personal/own|commitment/promise',
            // 5:1 Leave and requests
            'ನನಗೆ ಜಾಸ್ತಿ ಜ್ವರ ಇದೆ, ಹಾಗಾಗಿ ಇವತ್ತು ಅನಾರೋಗ್ಯ ರಜೆ ತೆಗೆದುಕೊಳ್ಳಬೇಕು ಅಂತ ಇದ್ದೇನೆ.': 'to me/I|high/a lot of|fever|is/have|so/therefore|today|sickness/illness|leave/holiday|must take/want to take|that/(thinking)|I am/I have (in mind)',
            'ನನ್ನ ತಮ್ಮನ ಕಾಲೇಜು ಪ್ರವೇಶಕ್ಕಾಗಿ ಶುಕ್ರವಾರ ಅರ್ಧ ದಿನ ರಜೆ ತೆಗೆದುಕೊಳ್ಳಬಹುದೇ?': "my/mine|younger brother's/brother's|college|for the admission/for admission|Friday/on Friday|half|day|leave/off|may I take/can I take",
            'ರೈಲು ಟಿಕೆಟ್ ಬುಕ್ ಮಾಡುವ ಮೊದಲು ನನ್ನ ಬಾಕಿ ಇರುವ ರಜೆಗಳನ್ನು ಒಮ್ಮೆ ನೋಡುತ್ತೇನೆ.': 'train|ticket/tickets|book|doing/to do|before/first|my/mine|remaining/balance|that are/existing|leaves/days off|once/quickly|will look/will check',
            'ನನ್ನ ಮ್ಯಾನೇಜರ್ ಹತ್ತರಿಂದ ಹದಿನಾಲ್ಕನೇ ತಾರೀಖಿನವರೆಗೆ ನನ್ನ ರಜೆಯನ್ನು ಅನುಮೋದಿಸಿದ್ದಾರೆ.': 'my/mine|manager|from the tenth/from ten|fourteenth|until the date/till the date|my/mine|leave/holiday|has approved/has sanctioned',
            'ಸೋಮವಾರ ಗೈರುಹಾಜರಾಗಿದ್ದಕ್ಕೆ ಕ್ಷಮಿಸಿ; ಬಾಕಿ ಕೆಲಸ ಮುಗಿಸಲು ನಾಳೆ ಮನೆಯಿಂದ ಕೆಲಸ ಮಾಡಬಹುದೇ?': 'Monday/on Monday|for being absent/for not coming|sorry/excuse me|pending/remaining|work/tasks|to finish/to complete|tomorrow|from home/from the house|work/job|can (I) do/may I do',
            'ಮುಂದಿನ ಶನಿವಾರ ನನ್ನ ಜೊತೆ ಶಿಫ್ಟ್ ಅದಲುಬದಲು ಮಾಡಿಕೊಳ್ಳಲು ನಿಮಗೆ ಅಭ್ಯಂತರವಿದೆಯೇ?': 'next/coming|Saturday|my/me|with/along with|shift/shifts|swap/exchange|to do (between us)/to make|to you/you|do (you) mind/is there an objection',
            'ನಾನು ಇಲ್ಲದಿರುವಾಗ ನನ್ನ ಕರೆಗಳನ್ನು ನೋಡಿಕೊಳ್ಳಲು ಪ್ರಿಯಾ ಒಪ್ಪಿಕೊಂಡಿದ್ದಾರೆ.': 'I|while (I am) away/when absent|my/mine|calls/phone calls|to cover/to look after|Priya|has agreed/has accepted',
            'ಏನೂ ತಪ್ಪಿಹೋಗದಂತೆ ಗುರುವಾರ ಸರಿಯಾಗಿ ಕೆಲಸದ ಹಸ್ತಾಂತರ ಮಾಡುತ್ತೇನೆ.': "nothing/anything|so that (it) isn't missed/without missing|Thursday/on Thursday|properly/correctly|work's/of the work|handover/handing over|will do/I'll do",
            'ನಮ್ಮ ರಿವ್ಯೂವನ್ನು ಮುಂದಿನ ವಾರಕ್ಕೆ ಮರುನಿಗದಿ ಮಾಡಬಹುದೇ? ಸೋಮವಾರ ನಾನು ರಜೆಯಲ್ಲಿರುತ್ತೇನೆ.': 'our/ours|review/the review|next/coming|to the week/to week|reschedule/fix again|can (we) do/could we do|Monday/on Monday|I|will be on leave/on leave',
            'ಕನಿಷ್ಠ ಒಂದು ವಾರ ಮುಂಚಿತವಾಗಿ ಕೇಳಿದರೆ, ನಮ್ಮ ಮ್ಯಾನೇಜರ್ ಸಾಕಷ್ಟು ಹೊಂದಿಕೊಳ್ಳುತ್ತಾರೆ.': 'at least/minimum|one/a|week|in advance/beforehand|if (we) ask/if asked|our/ours|manager|quite/fairly|adjust/are flexible',
            // 6:1 Feedback and growth
            'ಒಟ್ಟಾರೆಯಾಗಿ, ಈ ವರ್ಷ ನಿಮ್ಮ ಕಾರ್ಯಕ್ಷಮತೆ ತುಂಬಾ ಉತ್ತಮವಾಗಿದೆ.': 'overall/on the whole|this|year|your/yours|performance/work|very/really|has been good/is strong',
            'ಕೋಪಗೊಂಡ ಗ್ರಾಹಕರನ್ನು ನೀವು ಶಾಂತವಾಗಿ ನಿಭಾಯಿಸುವುದೇ ನಿಮ್ಮ ದೊಡ್ಡ ಬಲ.': 'angry/upset|customers|you|calmly/peacefully|handling (itself)/dealing with|your/yours|biggest/big|strength/strong point',
            'ನಿನ್ನೆಯ ಪ್ರಸ್ತುತಿಯ ಬಗ್ಗೆ ನಾನು ನಿಮಗೆ ಸ್ವಲ್ಪ ರಚನಾತ್ಮಕ ಫೀಡ್‌ಬ್ಯಾಕ್ ನೀಡಬಹುದೇ?': "yesterday's/of yesterday|presentation's/of the presentation|about/regarding|I|to you/you|some/a little|constructive/helpful|feedback|may (I) give/can I give",
            'ನನ್ನ ಸ್ವಮೌಲ್ಯಮಾಪನದಲ್ಲಿ ಸಮಯ ನಿರ್ವಹಣೆಯನ್ನು ನನ್ನ ದೌರ್ಬಲ್ಯವೆಂದು ಬರೆದಿದ್ದೇನೆ.': 'my/mine|in the self-assessment/in self-review|time|management/managing|my/mine|as a weakness/as weak point|have written/have listed',
            'ಮೈಸೂರು ಶಾಖೆಯನ್ನು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಆರಂಭಿಸಿದ್ದು ನಮ್ಮ ತಂಡಕ್ಕೆ ನಿಜವಾದ ಮೈಲಿಗಲ್ಲು.': 'Mysuru|branch/office|to the time/on time|exactly/properly|launching (it)/starting|our/ours|for the team/to the team|real/true|milestone/landmark',
            'ನಾನು ಡೇಟಾ ವಿಶ್ಲೇಷಣೆಯಲ್ಲಿ ಹೊಸ ಕೌಶಲ್ಯ ಕಲಿಯಲು ಬಯಸುತ್ತೇನೆ; ಕಂಪನಿ ಒಂದು ಚಿಕ್ಕ ಕೋರ್ಸ್‌ಗೆ ನೆರವು ನೀಡಬಹುದೇ?': 'I|data|in analysis/in analysing|new|skill/skills|to learn/to pick up|would like/wish|company/the company|a/one|short/small|for a course/to a course|support/help|could (it) give/can give',
            'ಲೀಡ್ ಹುದ್ದೆಗೆ ಅರ್ಜಿ ಹಾಕುವ ಮೊದಲು ಕ್ಲೌಡ್ ಪ್ರಮಾಣೀಕರಣ ಪಡೆಯುವಂತೆ ನನ್ನ ಮಾರ್ಗದರ್ಶಕರು ಸಲಹೆ ನೀಡಿದರು.': 'lead/leader|for the post/for the role|application/apply|putting in/submitting|before/first|cloud|certification/certificate|to get/to obtain|my/mine|mentor/guide|advice/suggestion|gave/offered',
            'ಎರಡು ವರ್ಷಗಳಲ್ಲಿ ತಂಡವನ್ನು ಮುನ್ನಡೆಸುವ ಸಾಮರ್ಥ್ಯ ನಿಮಗಿದೆ ಎಂದು ನಿಮ್ಮ ಮ್ಯಾನೇಜರ್ ಭಾವಿಸುತ್ತಾರೆ.': 'two|in years/within years|team/the team|leading/to lead|potential/ability|you have/is in you|that/(quote)|your/yours|manager|thinks/believes',
            'ಈ ವರ್ಷ ತಂಡದ ಎಲ್ಲರಿಗೂ ಕನಿಷ್ಠ ಶೇಕಡಾ ಎಂಟರಷ್ಟು ವೇತನ ಹೆಚ್ಚಳ ಸಿಗಲಿದೆ.': "this|year|team's/of the team|to everyone/everyone|at least/minimum|per cent/percent|about eight/eight|salary/pay|increase/increment|will be received/will get",
            'ನಾನು ಬಡ್ತಿಗೆ ಅರ್ಹನಾಗಿದ್ದೇನೆ ಎಂದು ನಂಬುತ್ತೇನೆ, ಮತ್ತು ಮುಂದಿನ ಹೆಜ್ಜೆ ಏನು ಎಂಬುದರ ಬಗ್ಗೆ ಚರ್ಚಿಸಲು ಬಯಸುತ್ತೇನೆ.': 'I|for promotion/to promotion|deserve/am worthy|that/(quote)|believe/trust|and/also|next/following|step|what|of that/about what|about/regarding|to discuss/to talk|would like/wish'
        },
        hi: {
            // 1:1 Describing your work
            'अपनी मौजूदा भूमिका में मैं पूरी कंपनी का पेरोल संभालता हूँ।': "my/own|current/present|role/position|in/within|I|whole/entire|company/firm|of/'s|payroll/salary list|handle/look after|am",
            'आप किस विभाग में काम करते हैं, और किसे रिपोर्ट करते हैं?': 'you|which/what|department/section|in/within|work/job|do/doing|are/(you) are|and/also|to whom/whom|report|do/doing|are/(you) are',
            'आधिकारिक तौर पर मेरा पदनाम सीनियर एनालिस्ट है, लेकिन मेरे काम हर हफ़्ते बदलते हैं।': 'official/formal|way/manner|on/by|my/mine|designation/job title|senior|analyst|is|but/however|my/mine|tasks/work|every/each|week|change/keep changing|are/(they) are',
            'मैं छह लोगों की टीम की देखरेख करता हूँ और ज़्यादातर क्लाइंट कॉल मैं ही संभालता हूँ।': "I|six|people/persons|of/'s|team|of/'s|supervision/oversight|do/doing|am|and/also|most/mostly|client|calls/phone calls|I|only/myself|handle/manage|am",
            'आम तौर पर मैं ज़रूरी काम लंच से पहले निपटा देता हूँ और बाकी की योजना बनाता हूँ।': "usual/common|way/manner|on/by|I|urgent/important|tasks/work|lunch|from/than|before/earlier|finish off/clear|give/(complete)|am|and/also|rest/remaining|of/'s|plan/planning|make/do|am",
            'हमारा मुख्यालय बेंगलुरु में है, लेकिन हमारे ज़्यादातर कर्मचारी हुब्बल्ली में हैं।': 'our/ours|headquarters/head office|Bengaluru|in/at|is|but/however|our/ours|most/mostly|employees/workforce|Hubballi|in/at|are',
            'हम एक छोटा स्टार्टअप हैं जो क्लिनिकों के लिए बिलिंग सॉफ़्टवेयर बनाता है।': 'we|a/one|small/little|startup/new company|are|which/that|clinics|of/(for)|for/to|billing|software|makes/builds|is',
            'मैसूरु के पास हमारा प्लांट भारत के ज़्यादातर दोपहिया ब्रांडों के लिए ब्रेक के पुर्ज़े बनाता है।': "Mysuru|of/(near)|near/close to|our/ours|plant/factory|India|of/'s|most/mostly|two-wheeler/two-wheel|brands|of/(for)|for/to|brake|of/'s|parts/components|makes/manufactures|is",
            'ग्रामीण स्वास्थ्य सेवा में हमारी विशेषज्ञता ही हमें दूसरों से अलग बनाती है।': 'rural/village|health|service/care|in/within|our/ours|expertise/skill|itself/only|us|others/other people|from/than|different/apart|makes|is',
            'हम छोटे शहरों की दुकानों को ऑनलाइन बिक्री शुरू करने में मदद करने में माहिर हैं।': "we|small/little|towns/cities|of/'s|shops/stores|to/(object marker)|online|selling/sales|start/begin|doing/to do|in/at|help|doing/to do|in/at|expert/skilled|are",
            // 2:1 Online meetings
            'जब आप बोल नहीं रहे हों, तो कृपया सब अपना माइक म्यूट रखें।': 'when/while|you|speak/speaking|not|(are) being/-ing|are/be|then/so|please|all/everyone|your/own|mic/microphone|muted/mute|keep/please keep',
            'मैंने अभी-अभी टीम चैट में मीटिंग का लिंक भेज दिया है।': "I/I have|just now/only now|team|chat|in/on|meeting|of/'s|link|send/sent|gave/(done)|is/has",
            'रवि, आपका वेबकैम बंद है; क्या आप एक मिनट के लिए इसे चालू करेंगे?': 'Ravi|your/yours|webcam/camera|off/closed|is|(question)/what|you|one/a|minute|of/(for)|for/to|it/this|on/running|will (you) do/will make',
            'वेटिंग रूम से प्रतिभागियों को अंदर सिर्फ़ होस्ट ही ला सकता है।': 'waiting|room|from/out of|participants/attendees|(object marker)/to|in/inside|only/just|host|alone/only|bring/let|can/able|is',
            'कृपया हेडसेट लगा लीजिए ताकि हमें आपके पीछे का ट्रैफ़िक सुनाई न दे।': "please|headset|put on/wear|take/(please)|so that/in order that|us/to us|your/yours|behind/back|of/'s|traffic|heard/audible|not/no|give/(be)",
            'माफ़ कीजिए, मेरा कनेक्शन अस्थिर है; मैं वीडियो बंद कर देता हूँ।': 'sorry/pardon|please (do)/do|my/mine|connection|unstable/unsteady|is|I|video|off/closed|do/make|give/(will)|am',
            'कुछ सेकंड की देरी है, इसलिए एक-दूसरे की बात के बीच में न बोलें।': "some/a few|seconds|of/'s|delay/lag|is/there is|so/therefore|each other/one another|of/'s|talk/words|of/'s|middle/between|in/inside|not/don't|speak/let's speak",
            'आपकी स्क्रीन अटक गई है; क्या आप उसे फिर से शेयर करेंगे?': 'your/yours|screen|stuck/frozen|went/has gone|is/has|(question)/what|you|it/that|again/once more|from/(again)|share|will (you) do/will make',
            'मुझे गूँज सुनाई दे रही है; किसी के लैपटॉप का स्पीकर माइक के बहुत पास है।': "to me/me|echo|heard/audible|give/(be)|-ing/being|is|someone/somebody|of/'s|laptop|of/'s|speaker|mic/microphone|of/(near)|very/too|near/close|is",
            'आज शाम तक मैं रिकॉर्डिंग और एक छोटा फ़ॉलो-अप ईमेल भेज दूँगा।': 'today/this|evening|by/until|I|recording|and/also|a/one|short/small|follow-up|email|send/sent|will give/will (do)',
            // 3:1 Giving a presentation
            'मैं शुरुआत इस संक्षिप्त विवरण से करता हूँ कि आज हम किन बातों पर चर्चा करेंगे।': 'I|start/beginning|this|brief/short|description/overview|from/with|do/make|am|that|today|we|which/what|points/things|on/about|discussion/talk|will do/will have',
            'जैसा कि आप इस स्लाइड पर देख सकते हैं, मार्च के बाद बिक्री दोगुनी हो गई।': 'as/like|that|you|this|slide|on/at|see/look|can/able|are|March|of/(after)|after/later|sales/selling|double/twice|become/be|went/(happened)',
            'मैंने रूपरेखा सरल रखी है: समस्या, समाधान, लागत और समय-सीमा।': 'I/I have|outline/plan|simple/easy|kept/placed|is/have|problem/issue|solution/answer|cost/expense|and/also|timeline/time limit',
            'यह चार्ट पिछले दो सालों के हमारे मासिक आँकड़े दिखाता है।': "this/it|chart/graph|last/past|two|years|of/'s|our/ours|monthly|figures/numbers|shows/displays|is",
            'मैं ख़ास तौर पर एक आँकड़े पर ध्यान दिलाना चाहूँगा: हमारी लागत बारह प्रतिशत घटी है।': 'I|special/particular|way/manner|on/by|one/a|figure/number|on/to|attention/focus|to draw/to bring|would like/would want|our/ours|cost/costs|twelve|per cent/percent|fell/decreased|is/has',
            'क्या कोई प्रोजेक्टर देख सकता है? स्लाइडें बहुत धुँधली दिख रही हैं।': '(question)/what|someone/anyone|projector|see/check|can/able|is|slides|very/too|dim/dark|look/appear|-ing/being|are',
            'मैंने पूरी प्रस्तुति की दो बार रिहर्सल की है, इसलिए मुझे ठीक-ठीक पता है कि इसमें कितना समय लगता है।': "I/I have|whole/entire|presentation/talk|of/'s|two|times|rehearsal/practice|did/done|is/have|so/therefore|to me/I|exactly/precisely|known/aware|is|that|in it/in this|how much/how long|time|takes/is needed|is",
            'सारे आँकड़ों वाला एक हैंडआउट है, इसलिए आपको नोट्स लेने की ज़रूरत नहीं है।': "all/every|figures/numbers|with/having|a/one|handout/printed sheet|is/there is|so/therefore|to you/you|notes|taking/to take|of/'s|need/necessity|not/no|is",
            'अच्छा सवाल है; मैं स्पष्ट कर दूँ कि कुल लागत से मेरा क्या मतलब था।': 'good/fair|question/query|is|I|clear/clarify|do/make|let me (give)/may I|that|total/overall|cost/expense|by/from|my/mine|what|meaning/meant|was',
            'अंत में, मैं तीनों मुख्य बातों का सारांश एक मिनट में बता देता हूँ।': "end/close|in/at|I|all three/the three|main/key|points/things|of/'s|summary/gist|one/a|minute|in/within|tell/say|give/(will)|am",
            // 4:1 Customers and clients
            'कुछ भी सुझाने से पहले, क्या आप अपनी ज़रूरतों के बारे में थोड़ा और बताएँगे?': "anything/something|also/even|suggesting/to suggest|from/than|before/earlier|(question)/what|you|your/own|needs/requirements|of/'s|matter/about|in/regarding|a little/a bit|more/and|will (you) tell/will say",
            'गुरुवार तक हम आपको एक विस्तृत प्रस्ताव और कोटेशन भेज देंगे।': 'Thursday|by/until|we|to you/you|a/one|detailed/full|proposal/offer|and/also|quotation/price quote|send/sent|will give/will (do)',
            'हमारी मोटी समय-सीमा छह हफ़्ते की है, लेकिन साइट देखने के बाद मैं पक्का बताऊँगा।': "our/ours|rough/approximate|timeline/time frame|six|weeks|of/'s|is|but/however|site/location|seeing/visiting|of/(after)|after/later|I|sure/confirmed|will tell/will say",
            'क्या एक छोटा डेमो आपको यह तय करने में मदद करेगा कि कौन-सा प्लान आपके लिए सही है?': '(question)/what|a/one|short/small|demo/demonstration|to you/you|this/it|decide/fixed|doing/to do|in/at|help|will do/will give|that|which/which one|plan|your/yours|for/to|right/suitable|is',
            'इस क्लाइंट को ऐप की स्क्रीनों समेत सब कुछ कन्नड़ में चाहिए।': "this|client|to/for|app|of/'s|screens|including/along with|all/every|thing/some|Kannada|in/into|wants/needed",
            'आपका ऑर्डर सोमवार को हमारे पुणे गोदाम से रवाना होगा।': 'your/yours|order|Monday|on/at|our/ours|Pune|warehouse/godown|from/out of|sent off/dispatched|will be/will happen',
            'इनवॉइस में ग़लत रकम लिखी है, इसलिए मैं अकाउंट्स विभाग से इसे ठीक करवाऊँगा।': 'invoice|in/on|wrong/incorrect|amount/sum|written|is|so/therefore|I|accounts|department/section|from/by|it/this|right/correct|will get done/will have (it) done',
            'मैं आपकी परेशानी समझता हूँ, और आज ही यह मामला अपने मैनेजर तक ले जाऊँगा।': 'I|your/yours|frustration/trouble|understand/understanding|am|and/also|today|itself/only|this/it|matter/issue|my/own|manager|to/up to|take/carry|will go/will (take)',
            'देरी की भरपाई के लिए, इस बार हम डिलीवरी चार्ज माफ़ कर देंगे।': "delay/lateness|of/'s|compensation/making up|of/(for)|for/to|this|time|we|delivery|charge/fee|waived/let off|do/make|will give/will (do)",
            'मैं आपको भरोसा दिलाता हूँ कि बदला हुआ सामान शुक्रवार तक आप तक पहुँच जाएगा; यह मेरी निजी प्रतिबद्धता है।': 'I|to you/you|assurance/trust|make (you) feel/give|am|that|replaced/changed|(done)/become|goods/item|Friday|by/until|you|to/up to|reach/arrive|will go/will (reach)|this/it|my/mine|personal/own|commitment/promise|is',
            // 5:1 Leave and requests
            'मुझे तेज़ बुख़ार है, इसलिए मैं आज बीमारी की छुट्टी लेना चाहता हूँ।': "to me/I|high/strong|fever|is/have|so/therefore|I|today|sickness/illness|of/'s|leave/holiday|to take/take|want/would like|am",
            'क्या मैं शुक्रवार को अपने भाई के कॉलेज एडमिशन के लिए आधे दिन की छुट्टी ले सकता हूँ?': "(question)/what|I|Friday|on/at|my/own|brother|of/'s|college|admission|of/(for)|for/to|half|day|of/'s|leave/off|take|can/able|am",
            'ट्रेन के टिकट बुक करने से पहले मैं अपनी बची हुई छुट्टियाँ देख लेता हूँ।': "train|of/'s|tickets/ticket|book|doing/to do|from/than|before/earlier|I|my/own|remaining/left|(done)/become|leaves/holidays|see/check|take/(will)|am",
            'मेरे मैनेजर ने दस से चौदह तारीख़ तक की मेरी छुट्टी मंज़ूर कर दी है।': "my/mine|manager|(subject marker)/has|ten/tenth|from/since|fourteen/fourteenth|date|till/until|of/'s|my/mine|leave/holiday|approved/sanctioned|do/did|gave/(done)|is/has",
            'माफ़ कीजिए, सोमवार को मैं ग़ैरहाज़िर था; क्या बचा हुआ काम पूरा करने के लिए मैं कल घर से काम कर सकता हूँ?': 'sorry/pardon|please (do)/do|Monday|on/at|I|absent/not present|was|(question)/what|remaining/left|(done)/become|work/tasks|complete/full|doing/to do|of/(for)|for/to|I|tomorrow|home/house|from/out of|work/job|do/make|can/able|am',
            'क्या आप अगले शनिवार मेरे साथ शिफ़्ट की अदला-बदली कर लेंगे?': "(question)/what|you|next/coming|Saturday|my/me|with/along with|shift/shifts|of/'s|swap/exchange|do/make|will take/will (do)",
            'मेरी ग़ैरमौजूदगी में प्रिया मेरी कॉल्स संभालने के लिए मान गई है।': 'my/mine|absence/being away|in/during|Priya|my/mine|calls/phone calls|handling/covering|of/(for)|for/to|agreed/accepted|went/(has)|is/has',
            'मैं गुरुवार को ठीक से हैंडओवर कर दूँगा ताकि कुछ भी छूट न जाए।': 'I|Thursday|on/at|proper/right|with/(properly)|handover|do/make|will give/will (do)|so that/in order that|anything/something|also/even|missed/left out|not/no|go/happen',
            'क्या हम अपनी समीक्षा अगले हफ़्ते के लिए दोबारा तय कर सकते हैं? सोमवार को मैं छुट्टी पर हूँ।': '(question)/what|we|our/own|review/meeting|next/coming|week|of/(for)|for/to|again/once more|fixed/decide|do/make|can/able|are|Monday|on/at|I|leave/holiday|on/at|am',
            'अगर हम कम से कम एक हफ़्ता पहले पूछ लें, तो हमारे मैनेजर काफ़ी लचीले हैं।': 'if/in case|we|less/least|from/than|less/least|one/a|week|before/in advance|ask|take/(do)|then/so|our/ours|manager|quite/fairly|flexible/easy-going|are',
            // 6:1 Feedback and growth
            'कुल मिलाकर, इस साल आपका प्रदर्शन बहुत अच्छा रहा है।': 'total/whole|taken together/combining|this|year|your/yours|performance/work|very/really|good/strong|stayed/been|is/has',
            'नाराज़ ग्राहकों को आप जितने शांत तरीके से संभालते हैं, वही आपकी सबसे बड़ी ख़ूबी है।': 'angry/upset|customers|(object marker)/to|you|as/how|calm/quiet|way/manner|with/in|handle/deal with|are|that very/that itself|your/yours|most/of all|big/biggest|strength/quality|is',
            'क्या मैं कल की प्रस्तुति पर आपको कुछ रचनात्मक फ़ीडबैक दे सकता हूँ?': "(question)/what|I|yesterday|of/'s|presentation/talk|on/about|to you/you|some/a little|constructive/helpful|feedback|give|can/able|am",
            'अपने आत्म-मूल्यांकन में मैंने समय प्रबंधन को अपनी कमज़ोरी बताया है।': 'my/own|self-assessment/self-review|in/within|I/I have|time|management/managing|(object marker)/to|my/own|weakness/weak point|told/stated|is/have',
            'मैसूरु शाखा को समय पर शुरू करना हमारी टीम के लिए सचमुच मील का पत्थर था।': "Mysuru|branch/office|(object marker)/to|time|on/at|start/launch|doing/to do|our/ours|team|of/(for)|for/to|really/truly|mile|of/'s|stone/milestone|was",
            'मैं डेटा विश्लेषण में अपनी स्किल्स बढ़ाना चाहता हूँ; क्या कंपनी किसी छोटे कोर्स में मदद कर सकती है?': 'I|data|analysis|in/within|my/own|skills|to increase/to grow|want/would like|am|(question)/what|company/the company|some/any|short/small|course|in/with|help/support|do/make|can/able|is',
            'मेरे मार्गदर्शक ने सलाह दी कि लीड रोल के लिए आवेदन करने से पहले मैं क्लाउड का प्रमाणपत्र कोर्स कर लूँ।': "my/mine|mentor/guide|(subject marker)/has|advice/suggestion|gave/offered|that|lead/leader|role/post|of/(for)|for/to|application/apply|doing/to do|from/than|before/first|I|cloud|of/'s|certificate/certification|course|do/complete|take/(should)",
            'आपके मैनेजर को लगता है कि आपमें दो साल के अंदर टीम का नेतृत्व करने की क्षमता है।': "your/yours|manager|to/(for)|feels/seems|is|that|in you/you have|two|years/year|of/(within)|inside/within|team|of/'s|leadership/leading|doing/to do|of/'s|potential/ability|is",
            'इस साल टीम में सभी को कम से कम आठ प्रतिशत वेतन वृद्धि मिलेगी।': 'this|year|team|in/within|all/everyone|to/(for)|less/least|from/than|less/least|eight|per cent/percent|salary/pay|increase/growth|will get/will be received',
            'मुझे लगता है कि मैं प्रमोशन का हक़दार हूँ, और मैं अगले कदम पर बात करना चाहूँगा।': 'to me/I|feel/seems|is|that|I|promotion|of/for|deserving/worthy|am|and/also|I|next/following|step|on/about|talk/discussion|to do/doing|would like/would want'
        }
    }
};
