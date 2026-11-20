/**
 * Services section "Getting things done" (about CEFR C1), units 1–6: At the pharmacy, Emergencies,
 * Repairs at home, Complaints and refunds, Government offices, Renting a home — getting help and
 * services by speaking. Written in English, Kannada and Hindi (no translation service) — a native
 * speaker should check them.
 */
module.exports = {
    level: 'services',
    units: {
        '1:1': {
            name: 'At the pharmacy',
            lessons: [
                {
                    kind: 'words', title: "At the chemist's", list: [
                        { en: 'pharmacy', kn: 'ಔಷಧಿ ಅಂಗಡಿ', hi: 'दवा की दुकान', pic: '🏪', def: 'a shop where medicines are prepared and sold' },
                        { en: 'chemist', kn: 'ಔಷಧ ವ್ಯಾಪಾರಿ', hi: 'केमिस्ट', pic: '🥼', def: 'a person trained to prepare and sell medicines' },
                        { en: 'tablet', kn: 'ಮಾತ್ರೆ', hi: 'गोली', pic: '💊', def: 'a small hard piece of medicine that you swallow' },
                        { en: 'syrup', kn: 'ಸಿರಪ್', hi: 'सिरप', pic: '🥄', def: 'a thick, sweet liquid medicine taken with a spoon' },
                        { en: 'dosage', kn: 'ಔಷಧದ ಪ್ರಮಾಣ', hi: 'खुराक', pic: '⚖️', def: 'how much medicine to take and how often' },
                        { en: 'side effect', kn: 'ಅಡ್ಡ ಪರಿಣಾಮ', hi: 'दुष्प्रभाव', pic: '⚠️', def: 'an unwanted effect of a medicine, such as sleepiness or a rash' }
                    ]
                },
                {
                    kind: 'phrases', title: 'At the pharmacy 1', list: [
                        { read: true, en: 'Is there a pharmacy nearby that stays open all night?', kn: 'ಹತ್ತಿರದಲ್ಲಿ ರಾತ್ರಿಯಿಡೀ ತೆರೆದಿರುವ ಔಷಧಿ ಅಂಗಡಿ ಇದೆಯೇ?', hi: 'क्या पास में कोई दवा की दुकान है जो पूरी रात खुली रहती है?' },
                        { read: true, en: 'Could you tell me the right dosage for a ten-year-old child?', kn: 'ಹತ್ತು ವರ್ಷದ ಮಗುವಿಗೆ ಸರಿಯಾದ ಔಷಧದ ಪ್ರಮಾಣ ಎಷ್ಟು ಎಂದು ಹೇಳುತ್ತೀರಾ?', hi: 'क्या आप बता सकते हैं कि दस साल के बच्चे के लिए सही खुराक कितनी है?' },
                        { en: 'The chemist said I should take one tablet after every meal.', kn: 'ಪ್ರತಿ ಊಟದ ನಂತರ ಒಂದು ಮಾತ್ರೆ ತೆಗೆದುಕೊಳ್ಳಬೇಕು ಎಂದು ಔಷಧ ವ್ಯಾಪಾರಿ ಹೇಳಿದರು.', hi: 'केमिस्ट ने कहा कि मुझे हर खाने के बाद एक गोली लेनी चाहिए।' },
                        { read: true, en: 'Does this cough syrup have any side effects, like sleepiness?', kn: 'ಈ ಕೆಮ್ಮಿನ ಸಿರಪ್‌ನಿಂದ ನಿದ್ದೆ ಬರುವಂತಹ ಅಡ್ಡ ಪರಿಣಾಮಗಳೇನಾದರೂ ಇವೆಯೇ?', hi: 'क्या इस खाँसी के सिरप के कोई दुष्प्रभाव हैं, जैसे नींद आना?' },
                        { en: "I'm sorry, we can't give you these tablets without a prescription.", kn: 'ಕ್ಷಮಿಸಿ, ವೈದ್ಯರ ಚೀಟಿ ಇಲ್ಲದೆ ಈ ಮಾತ್ರೆಗಳನ್ನು ನಿಮಗೆ ಕೊಡಲು ಆಗುವುದಿಲ್ಲ.', hi: 'माफ़ कीजिए, पर्चे के बिना हम आपको ये गोलियाँ नहीं दे सकते।', acc: { en: ['I am sorry, we cannot give you these tablets without a prescription.'] } }
                    ]
                },
                {
                    kind: 'words', title: 'Taking medicine safely', list: [
                        { en: 'ointment', kn: 'ಮುಲಾಮು', hi: 'मरहम', pic: '🧴', def: 'a soft, oily cream that you rub on the skin' },
                        { en: 'allergy', kn: 'ಅಲರ್ಜಿ', hi: 'एलर्जी', pic: '🤧', def: 'a bad reaction of the body to a food, dust or medicine' },
                        { en: 'expiry date', kn: 'ಅವಧಿ ಮುಗಿಯುವ ದಿನಾಂಕ', hi: 'समाप्ति तिथि', pic: '📅', def: 'the last date on which a product is safe to use' },
                        { en: 'painkiller', kn: 'ನೋವು ನಿವಾರಕ', hi: 'दर्द निवारक दवा', pic: '🤕', def: 'a medicine that reduces or stops pain' },
                        { en: 'antibiotic', kn: 'ಪ್ರತಿಜೀವಕ', hi: 'एंटीबायोटिक', pic: '🦠', def: 'a medicine that kills bacteria and treats infections' },
                        { en: 'drowsy', kn: 'ಮಂಪರು', hi: 'उनींदा', pic: '😴', def: 'feeling sleepy and slow, often because of a medicine' }
                    ]
                },
                {
                    kind: 'phrases', title: 'At the pharmacy 2', list: [
                        { read: true, en: 'Rub this ointment gently on the burn twice a day.', kn: 'ಈ ಮುಲಾಮನ್ನು ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ ಸುಟ್ಟ ಗಾಯದ ಮೇಲೆ ಮೆಲ್ಲಗೆ ಹಚ್ಚಿ.', hi: 'यह मरहम दिन में दो बार जले हुए हिस्से पर धीरे से लगाइए।' },
                        { read: true, en: 'I have an allergy to penicillin, so please suggest something else.', kn: 'ನನಗೆ ಪೆನ್ಸಿಲಿನ್ ಅಲರ್ಜಿ ಇದೆ, ಹಾಗಾಗಿ ದಯವಿಟ್ಟು ಬೇರೆ ಏನಾದರೂ ಸೂಚಿಸಿ.', hi: 'मुझे पेनिसिलिन से एलर्जी है, इसलिए कृपया कुछ और बताइए।' },
                        { en: 'Always check the expiry date before you open a new strip.', kn: 'ಹೊಸ ಸ್ಟ್ರಿಪ್ ತೆರೆಯುವ ಮೊದಲು ಯಾವಾಗಲೂ ಅವಧಿ ಮುಗಿಯುವ ದಿನಾಂಕ ನೋಡಿ.', hi: 'नई पत्ती खोलने से पहले हमेशा समाप्ति तिथि देख लीजिए।' },
                        { read: true, en: 'Finish the whole course of antibiotics, even if you feel better.', kn: 'ಹುಷಾರಾದರೂ ಸಹ ಪ್ರತಿಜೀವಕಗಳ ಪೂರ್ತಿ ಕೋರ್ಸ್ ಮುಗಿಸಿ.', hi: 'ठीक लगने पर भी एंटीबायोटिक का पूरा कोर्स ख़त्म कीजिए।' },
                        { en: "This painkiller may make you drowsy, so don't drive after taking it.", kn: 'ಈ ನೋವು ನಿವಾರಕದಿಂದ ಮಂಪರು ಬರಬಹುದು, ಹಾಗಾಗಿ ಇದನ್ನು ತೆಗೆದುಕೊಂಡ ನಂತರ ವಾಹನ ಓಡಿಸಬೇಡಿ.', hi: 'इस दर्द निवारक दवा से नींद आ सकती है, इसलिए इसे लेने के बाद गाड़ी मत चलाइए।', acc: { en: ['This painkiller may make you drowsy, so do not drive after taking it.'] } }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'Late night at the pharmacy', kn: 'ತಡರಾತ್ರಿ ಔಷಧಿ ಅಂಗಡಿಯಲ್ಲಿ', hi: 'देर रात दवा की दुकान पर' },
                    text: {
                        en: "At ten o'clock one night in Mysuru, Meera's little brother Rohan woke up with a high fever. Their family doctor was out of town, so Meera phoned her for advice. The doctor said a fever syrup would be enough until the morning. Meera found a pharmacy near the bus stand that stays open all night. She told the chemist that Rohan was eight years old and had an allergy to one antibiotic. The chemist checked the expiry date, wrote the dosage on the box and warned her that the syrup might make Rohan drowsy. By morning, Rohan's fever had come down and he was asking for dosa.",
                        kn: 'ಒಂದು ರಾತ್ರಿ ಹತ್ತು ಗಂಟೆಗೆ ಮೈಸೂರಿನಲ್ಲಿ ಮೀರಾಳ ತಮ್ಮ ರೋಹನ್ ಜೋರು ಜ್ವರದಿಂದ ಎಚ್ಚರಗೊಂಡನು. ಅವರ ಕುಟುಂಬ ವೈದ್ಯರು ಊರಲ್ಲಿ ಇರಲಿಲ್ಲ, ಹಾಗಾಗಿ ಮೀರಾ ಸಲಹೆಗಾಗಿ ಅವರಿಗೆ ಫೋನ್ ಮಾಡಿದಳು. ಬೆಳಿಗ್ಗೆಯವರೆಗೆ ಜ್ವರದ ಸಿರಪ್ ಸಾಕು ಎಂದು ವೈದ್ಯರು ಹೇಳಿದರು. ಬಸ್ ನಿಲ್ದಾಣದ ಹತ್ತಿರ ರಾತ್ರಿಯಿಡೀ ತೆರೆದಿರುವ ಒಂದು ಔಷಧಿ ಅಂಗಡಿಯನ್ನು ಮೀರಾ ಕಂಡುಕೊಂಡಳು. ರೋಹನ್‌ಗೆ ಎಂಟು ವರ್ಷ ಮತ್ತು ಅವನಿಗೆ ಒಂದು ಪ್ರತಿಜೀವಕದ ಅಲರ್ಜಿ ಇದೆ ಎಂದು ಅವಳು ಔಷಧ ವ್ಯಾಪಾರಿಗೆ ಹೇಳಿದಳು. ಔಷಧ ವ್ಯಾಪಾರಿ ಅವಧಿ ಮುಗಿಯುವ ದಿನಾಂಕ ಪರಿಶೀಲಿಸಿ, ಡಬ್ಬಿಯ ಮೇಲೆ ಔಷಧದ ಪ್ರಮಾಣ ಬರೆದು, ಸಿರಪ್‌ನಿಂದ ರೋಹನ್‌ಗೆ ಮಂಪರು ಬರಬಹುದು ಎಂದು ಎಚ್ಚರಿಸಿದರು. ಬೆಳಿಗ್ಗೆಯ ಹೊತ್ತಿಗೆ ರೋಹನ್‌ನ ಜ್ವರ ಇಳಿದಿತ್ತು, ಮತ್ತು ಅವನು ದೋಸೆ ಬೇಕೆಂದು ಕೇಳುತ್ತಿದ್ದನು.',
                        hi: 'एक रात दस बजे मैसूरु में मीरा का छोटा भाई रोहन तेज़ बुख़ार के साथ जाग गया। उनकी फ़ैमिली डॉक्टर शहर से बाहर थीं, इसलिए मीरा ने सलाह के लिए उन्हें फ़ोन किया। डॉक्टर ने कहा कि सुबह तक बुख़ार का सिरप काफ़ी होगा। मीरा को बस स्टैंड के पास एक दवा की दुकान मिली जो पूरी रात खुली रहती है। उसने केमिस्ट को बताया कि रोहन आठ साल का है और उसे एक एंटीबायोटिक से एलर्जी है। केमिस्ट ने समाप्ति तिथि जाँची, डिब्बे पर खुराक लिखी और चेतावनी दी कि सिरप से रोहन को नींद आ सकती है। सुबह तक रोहन का बुख़ार उतर गया था और वह डोसा माँग रहा था।'
                    },
                    questions: [
                        {
                            q: { en: 'Why did Meera go to the pharmacy at night?', kn: 'ಮೀರಾ ರಾತ್ರಿ ಔಷಧಿ ಅಂಗಡಿಗೆ ಏಕೆ ಹೋದಳು?', hi: 'मीरा रात को दवा की दुकान पर क्यों गई?' },
                            options: [
                                { en: 'Rohan had a high fever', kn: 'ರೋಹನ್‌ಗೆ ಜೋರು ಜ್ವರ ಇತ್ತು', hi: 'रोहन को तेज़ बुख़ार था' },
                                { en: 'She needed a new phone charger', kn: 'ಅವಳಿಗೆ ಹೊಸ ಫೋನ್ ಚಾರ್ಜರ್ ಬೇಕಿತ್ತು', hi: 'उसे नया फ़ोन चार्जर चाहिए था' },
                                { en: 'Rohan had burnt his hand', kn: 'ರೋಹನ್‌ನ ಕೈ ಸುಟ್ಟಿತ್ತು', hi: 'रोहन का हाथ जल गया था' },
                                { en: 'The doctor asked her to buy vitamins', kn: 'ವಿಟಮಿನ್ ಕೊಳ್ಳಲು ವೈದ್ಯರು ಹೇಳಿದ್ದರು', hi: 'डॉक्टर ने विटामिन ख़रीदने को कहा था' }
                            ]
                        },
                        {
                            q: { en: 'What did the chemist write on the box?', kn: 'ಔಷಧ ವ್ಯಾಪಾರಿ ಡಬ್ಬಿಯ ಮೇಲೆ ಏನು ಬರೆದರು?', hi: 'केमिस्ट ने डिब्बे पर क्या लिखा?' },
                            options: [
                                { en: 'The dosage', kn: 'ಔಷಧದ ಪ್ರಮಾಣ', hi: 'खुराक' },
                                { en: 'The price', kn: 'ಬೆಲೆ', hi: 'दाम' },
                                { en: "Rohan's name", kn: 'ರೋಹನ್‌ನ ಹೆಸರು', hi: 'रोहन का नाम' },
                                { en: "The doctor's phone number", kn: 'ವೈದ್ಯರ ಫೋನ್ ನಂಬರ್', hi: 'डॉक्टर का फ़ोन नंबर' }
                            ]
                        },
                        {
                            q: { en: 'How was Rohan in the morning?', kn: 'ಬೆಳಿಗ್ಗೆ ರೋಹನ್ ಹೇಗಿದ್ದನು?', hi: 'सुबह रोहन कैसा था?' },
                            options: [
                                { en: 'His fever had come down', kn: 'ಅವನ ಜ್ವರ ಇಳಿದಿತ್ತು', hi: 'उसका बुख़ार उतर गया था' },
                                { en: 'He had to go to hospital', kn: 'ಅವನು ಆಸ್ಪತ್ರೆಗೆ ಹೋಗಬೇಕಾಯಿತು', hi: 'उसे अस्पताल जाना पड़ा' },
                                { en: 'He was still very sick', kn: 'ಅವನಿಗೆ ಇನ್ನೂ ತುಂಬಾ ಹುಷಾರಿರಲಿಲ್ಲ', hi: 'वह अब भी बहुत बीमार था' },
                                { en: 'He had a new allergy', kn: 'ಅವನಿಗೆ ಹೊಸ ಅಲರ್ಜಿ ಬಂದಿತ್ತು', hi: 'उसे नई एलर्जी हो गई थी' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Asking the chemist', kn: 'ಔಷಧ ವ್ಯಾಪಾರಿಯ ಸಲಹೆ', hi: 'केमिस्ट से सलाह' },
                    scenario: {
                        en: 'Kiran has a bad cold and asks Lata, a chemist in Hubballi, for advice.',
                        kn: 'ಕಿರಣ್‌ಗೆ ತುಂಬಾ ನೆಗಡಿಯಾಗಿದೆ; ಅವನು ಹುಬ್ಬಳ್ಳಿಯ ಔಷಧ ವ್ಯಾಪಾರಿ ಲತಾ ಅವರ ಸಲಹೆ ಕೇಳುತ್ತಾನೆ.',
                        hi: 'किरण को तेज़ ज़ुकाम है, और वह हुब्बल्ली की केमिस्ट लता से सलाह माँगता है।'
                    },
                    speakers: [{ name: 'Lata', voice: 'f' }, { name: 'Kiran', voice: 'm' }],
                    lines: [
                        { speaker: 'Lata', en: 'Good evening. How can I help you?', kn: 'ನಮಸ್ಕಾರ. ನಿಮಗೆ ಏನು ಸಹಾಯ ಮಾಡಲಿ?', hi: 'नमस्ते। बताइए, मैं आपकी क्या मदद करूँ?' },
                        { speaker: 'Kiran', en: "Hi. I've had a blocked nose and a sore throat since yesterday. Could you suggest something?", kn: 'ನಮಸ್ಕಾರ. ನಿನ್ನೆಯಿಂದ ಮೂಗು ಕಟ್ಟಿದೆ, ಗಂಟಲು ನೋಯುತ್ತಿದೆ. ಏನಾದರೂ ಸೂಚಿಸುತ್ತೀರಾ?', hi: 'नमस्ते। कल से मेरी नाक बंद है और गला ख़राब है। कुछ बता सकती हैं?' },
                        { speaker: 'Lata', en: 'Do you have a fever, or an allergy to any medicine?', kn: 'ನಿಮಗೆ ಜ್ವರ ಇದೆಯೇ, ಅಥವಾ ಯಾವುದಾದರೂ ಔಷಧದ ಅಲರ್ಜಿ ಇದೆಯೇ?', hi: 'क्या आपको बुख़ार है, या किसी दवा से एलर्जी है?' },
                        { speaker: 'Kiran', en: "No fever, and no allergies as far as I know. I'd rather not take anything too strong.", kn: 'ಜ್ವರ ಇಲ್ಲ, ನನಗೆ ತಿಳಿದಂತೆ ಯಾವ ಅಲರ್ಜಿಯೂ ಇಲ್ಲ. ತುಂಬಾ ಸ್ಟ್ರಾಂಗ್ ಔಷಧ ಬೇಡ.', hi: 'बुख़ार नहीं है, और जहाँ तक मुझे पता है कोई एलर्जी भी नहीं। मैं बहुत तेज़ दवा नहीं लेना चाहता।' },
                        { speaker: 'Lata', en: 'Then take these tablets for the cold, one in the morning and one at night, after food.', kn: 'ಹಾಗಾದರೆ ನೆಗಡಿಗೆ ಈ ಮಾತ್ರೆಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಿ, ಊಟದ ನಂತರ ಬೆಳಿಗ್ಗೆ ಒಂದು, ರಾತ್ರಿ ಒಂದು.', hi: 'तो ज़ुकाम के लिए ये गोलियाँ लीजिए, खाने के बाद एक सुबह और एक रात को।' },
                        { speaker: 'Kiran', en: 'Are there any side effects I should know about?', kn: 'ನಾನು ತಿಳಿದುಕೊಳ್ಳಬೇಕಾದ ಅಡ್ಡ ಪರಿಣಾಮಗಳೇನಾದರೂ ಇವೆಯೇ?', hi: 'क्या कोई दुष्प्रभाव हैं जिनके बारे में मुझे पता होना चाहिए?' },
                        { speaker: 'Lata', en: "They may make you a little drowsy, so please don't drive after the night dose.", kn: 'ಇವುಗಳಿಂದ ಸ್ವಲ್ಪ ಮಂಪರು ಬರಬಹುದು, ಹಾಗಾಗಿ ರಾತ್ರಿಯ ಮಾತ್ರೆಯ ನಂತರ ದಯವಿಟ್ಟು ವಾಹನ ಓಡಿಸಬೇಡಿ.', hi: 'इनसे थोड़ी नींद आ सकती है, इसलिए रात की गोली के बाद कृपया गाड़ी मत चलाइए।' },
                        { speaker: 'Kiran', en: 'Understood. And is there something for the throat as well?', kn: 'ಅರ್ಥವಾಯಿತು. ಗಂಟಲಿಗೂ ಏನಾದರೂ ಇದೆಯೇ?', hi: 'समझ गया। और गले के लिए भी कुछ है?' },
                        { speaker: 'Lata', en: 'This syrup will help: two spoons, three times a day. If you are not better in three days, please see a doctor.', kn: 'ಈ ಸಿರಪ್ ಸಹಾಯ ಮಾಡುತ್ತದೆ: ದಿನಕ್ಕೆ ಮೂರು ಬಾರಿ, ಎರಡು ಚಮಚ. ಮೂರು ದಿನದಲ್ಲಿ ಹುಷಾರಾಗದಿದ್ದರೆ ದಯವಿಟ್ಟು ವೈದ್ಯರನ್ನು ನೋಡಿ.', hi: 'यह सिरप काम आएगा: दिन में तीन बार, दो चम्मच। अगर तीन दिन में ठीक न हों, तो कृपया डॉक्टर को दिखाइए।' },
                        { speaker: 'Kiran', en: "That's very helpful, thank you. Can I pay by UPI?", kn: 'ತುಂಬಾ ಉಪಯೋಗವಾಯಿತು, ಧನ್ಯವಾದಗಳು. ಯುಪಿಐ ಮೂಲಕ ಹಣ ಕೊಡಬಹುದೇ?', hi: 'यह बहुत काम की बात है, धन्यवाद। क्या मैं यूपीआई से पैसे दे सकता हूँ?' }
                    ],
                    questions: [
                        {
                            q: { en: 'How often should Kiran take the tablets?', kn: 'ಕಿರಣ್ ಮಾತ್ರೆಗಳನ್ನು ಎಷ್ಟು ಬಾರಿ ತೆಗೆದುಕೊಳ್ಳಬೇಕು?', hi: 'किरण को गोलियाँ कितनी बार लेनी हैं?' },
                            options: [
                                { en: 'Twice a day, after food', kn: 'ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ, ಊಟದ ನಂತರ', hi: 'दिन में दो बार, खाने के बाद' },
                                { en: 'Once a week', kn: 'ವಾರಕ್ಕೆ ಒಮ್ಮೆ', hi: 'हफ़्ते में एक बार' },
                                { en: 'Every hour', kn: 'ಪ್ರತಿ ಗಂಟೆಗೆ', hi: 'हर घंटे' },
                                { en: 'Only when he has a fever', kn: 'ಜ್ವರ ಬಂದಾಗ ಮಾತ್ರ', hi: 'सिर्फ़ बुख़ार होने पर' }
                            ]
                        },
                        {
                            q: { en: 'Which side effect did Lata warn him about?', kn: 'ಲತಾ ಯಾವ ಅಡ್ಡ ಪರಿಣಾಮದ ಬಗ್ಗೆ ಎಚ್ಚರಿಸಿದರು?', hi: 'लता ने किस दुष्प्रभाव के बारे में चेताया?' },
                            options: [
                                { en: 'Feeling drowsy', kn: 'ಮಂಪರು ಬರುವುದು', hi: 'नींद आना' },
                                { en: 'A skin rash', kn: 'ಚರ್ಮದ ಮೇಲೆ ತುರಿಕೆ', hi: 'त्वचा पर दाने' },
                                { en: 'Losing his appetite', kn: 'ಹಸಿವು ಆಗದಿರುವುದು', hi: 'भूख न लगना' },
                                { en: 'A headache', kn: 'ತಲೆನೋವು', hi: 'सिरदर्द' }
                            ]
                        },
                        {
                            q: { en: 'What should Kiran do if he is not better in three days?', kn: 'ಮೂರು ದಿನದಲ್ಲಿ ಹುಷಾರಾಗದಿದ್ದರೆ ಕಿರಣ್ ಏನು ಮಾಡಬೇಕು?', hi: 'तीन दिन में ठीक न होने पर किरण को क्या करना चाहिए?' },
                            options: [
                                { en: 'See a doctor', kn: 'ವೈದ್ಯರನ್ನು ನೋಡಬೇಕು', hi: 'डॉक्टर को दिखाना चाहिए' },
                                { en: 'Double the dosage', kn: 'ಔಷಧದ ಪ್ರಮಾಣ ಎರಡರಷ್ಟು ಮಾಡಬೇಕು', hi: 'खुराक दोगुनी करनी चाहिए' },
                                { en: 'Stop drinking water', kn: 'ನೀರು ಕುಡಿಯುವುದನ್ನು ನಿಲ್ಲಿಸಬೇಕು', hi: 'पानी पीना बंद करना चाहिए' },
                                { en: 'Buy a bigger bottle of syrup', kn: 'ಸಿರಪ್‌ನ ದೊಡ್ಡ ಬಾಟಲಿ ಕೊಳ್ಳಬೇಕು', hi: 'सिरप की बड़ी बोतल ख़रीदनी चाहिए' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'You are at a pharmacy with a bad cough. Speak to the chemist: describe your symptoms, mention any allergy, ask about the dosage and side effects, and ask how you can pay.',
                        sample: "Good evening. I've had a dry cough and a slight fever since Sunday, and it gets worse at night. I'd like something that will help me sleep. I should mention that I'm allergic to penicillin, so I can't take some antibiotics. Could you tell me the dosage, and whether I should take it before or after food? Are there any side effects I should know about? I ride a scooter to work, so I'd rather avoid anything that makes me drowsy. Also, if it doesn't get better, how long should I wait before seeing a doctor? Thank you. Can I pay by UPI?",
                        checklist: ['I greeted the chemist politely', 'I described my symptoms and how long I have had them', 'I mentioned my allergy', 'I asked about the dosage and side effects', 'I asked when I should see a doctor', 'I asked how I could pay']
                    }
                }
            ]
        },
        '2:1': {
            name: 'Emergencies',
            lessons: [
                {
                    kind: 'words', title: 'Calling for help', list: [
                        { en: 'emergency', kn: 'ತುರ್ತು ಪರಿಸ್ಥಿತಿ', hi: 'आपात स्थिति', pic: '🚨', def: 'a sudden, dangerous situation that needs help at once' },
                        { en: 'ambulance', kn: 'ಆಂಬುಲೆನ್ಸ್', hi: 'एम्बुलेंस', pic: '🚑', def: 'a vehicle that carries sick or injured people to hospital' },
                        { en: 'helpline', kn: 'ಸಹಾಯವಾಣಿ', hi: 'हेल्पलाइन', pic: '☎️', def: 'a phone number you can call for help or advice' },
                        { en: 'fire brigade', kn: 'ಅಗ್ನಿಶಾಮಕ ದಳ', hi: 'दमकल विभाग', pic: '🚒', def: 'the team of people whose job is to put out fires' },
                        { en: 'accident', kn: 'ಅಪಘಾತ', hi: 'दुर्घटना', pic: '💥', def: 'something bad that happens suddenly and hurts people or things' },
                        { en: 'landmark', kn: 'ಗುರುತಿನ ಸ್ಥಳ', hi: 'पहचान की जगह', pic: '📍', def: 'a well-known building or place that helps people find their way' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Emergencies 1', list: [
                        { read: true, en: "I'd like to report a road accident near the Hubballi bus stand.", kn: 'ಹುಬ್ಬಳ್ಳಿ ಬಸ್ ನಿಲ್ದಾಣದ ಹತ್ತಿರ ಆದ ರಸ್ತೆ ಅಪಘಾತದ ಬಗ್ಗೆ ತಿಳಿಸಲು ಬಯಸುತ್ತೇನೆ.', hi: 'मैं हुब्बल्ली बस स्टैंड के पास हुई सड़क दुर्घटना की सूचना देना चाहता हूँ।', acc: { en: ['I would like to report a road accident near the Hubballi bus stand.'], hi: ['मैं हुब्बल्ली बस स्टैंड के पास हुई सड़क दुर्घटना की सूचना देना चाहती हूँ।'] } },
                        { read: true, en: 'Please send an ambulance quickly; a man is lying on the road.', kn: 'ದಯವಿಟ್ಟು ಬೇಗ ಒಂದು ಆಂಬುಲೆನ್ಸ್ ಕಳುಹಿಸಿ; ಒಬ್ಬ ವ್ಯಕ್ತಿ ರಸ್ತೆಯ ಮೇಲೆ ಬಿದ್ದಿದ್ದಾರೆ.', hi: 'कृपया जल्दी एक एम्बुलेंस भेजिए, एक आदमी सड़क पर पड़ा है।' },
                        { en: 'In an emergency, call the 112 helpline and speak slowly and clearly.', kn: 'ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ 112 ಸಹಾಯವಾಣಿಗೆ ಕರೆ ಮಾಡಿ, ನಿಧಾನವಾಗಿ ಮತ್ತು ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ.', hi: 'आपात स्थिति में 112 हेल्पलाइन पर फ़ोन कीजिए और धीरे-धीरे, साफ़ बोलिए।' },
                        { read: true, en: 'The fire brigade is on its way, so please leave the building now.', kn: 'ಅಗ್ನಿಶಾಮಕ ದಳ ಬರುತ್ತಿದೆ, ಆದ್ದರಿಂದ ದಯವಿಟ್ಟು ಈಗಲೇ ಕಟ್ಟಡದಿಂದ ಹೊರಗೆ ಬನ್ನಿ.', hi: 'दमकल रास्ते में है, इसलिए कृपया अभी इमारत से बाहर निकल जाइए।' },
                        { en: 'The nearest landmark is the big temple opposite the petrol bunk.', kn: 'ಹತ್ತಿರದ ಗುರುತಿನ ಸ್ಥಳ ಅಂದರೆ ಪೆಟ್ರೋಲ್ ಬಂಕ್ ಎದುರಿನ ದೊಡ್ಡ ದೇವಸ್ಥಾನ.', hi: 'सबसे नज़दीकी पहचान की जगह पेट्रोल पंप के सामने वाला बड़ा मंदिर है।' }
                    ]
                },
                {
                    kind: 'words', title: 'At the scene', list: [
                        { en: 'injured', kn: 'ಗಾಯಗೊಂಡ', hi: 'घायल', pic: '🩹', def: 'hurt in an accident or an attack' },
                        { en: 'unconscious', kn: 'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದ', hi: 'बेहोश', pic: '😵', def: 'not awake and not able to see, hear or feel anything' },
                        { en: 'bleeding', kn: 'ರಕ್ತಸ್ರಾವ', hi: 'ख़ून बहना', pic: '🩸', def: 'losing blood from a cut or a wound' },
                        { en: 'first aid', kn: 'ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ', hi: 'प्राथमिक उपचार', pic: '⛑️', def: 'simple, quick help given to an injured person before a doctor comes' },
                        { en: 'theft', kn: 'ಕಳ್ಳತನ', hi: 'चोरी', pic: '🦹', def: 'the crime of taking something that belongs to someone else' },
                        { en: 'panic', kn: 'ಗಾಬರಿ', hi: 'घबराहट', pic: '😰', def: 'sudden strong fear that stops you from thinking clearly' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Emergencies 2', list: [
                        { read: true, en: 'Two people are injured, and one of them is unconscious.', kn: 'ಇಬ್ಬರಿಗೆ ಗಾಯಗಳಾಗಿವೆ, ಅವರಲ್ಲಿ ಒಬ್ಬರಿಗೆ ಪ್ರಜ್ಞೆ ಇಲ್ಲ.', hi: 'दो लोग घायल हैं, और उनमें से एक बेहोश है।' },
                        { read: true, en: 'Press a clean cloth on the wound to stop the bleeding.', kn: 'ರಕ್ತಸ್ರಾವ ನಿಲ್ಲಿಸಲು ಗಾಯದ ಮೇಲೆ ಸ್ವಚ್ಛ ಬಟ್ಟೆಯನ್ನು ಒತ್ತಿ ಹಿಡಿಯಿರಿ.', hi: 'ख़ून रोकने के लिए घाव पर एक साफ़ कपड़ा दबाकर रखिए।' },
                        { en: 'Do you know first aid, or should we wait for the ambulance?', kn: 'ನಿಮಗೆ ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ಗೊತ್ತೇ, ಅಥವಾ ನಾವು ಆಂಬುಲೆನ್ಸ್‌ಗಾಗಿ ಕಾಯಬೇಕೇ?', hi: 'क्या आपको प्राथमिक उपचार आता है, या हम एम्बुलेंस का इंतज़ार करें?' },
                        { en: 'My bag was stolen at the station, and I need to report the theft.', kn: 'ನಿಲ್ದಾಣದಲ್ಲಿ ನನ್ನ ಬ್ಯಾಗ್ ಕಳುವಾಯಿತು, ಆ ಕಳ್ಳತನದ ಬಗ್ಗೆ ದೂರು ಕೊಡಬೇಕು.', hi: 'स्टेशन पर मेरा बैग चोरी हो गया, और मुझे इस चोरी की रिपोर्ट लिखवानी है।' },
                        { read: true, en: 'Try not to panic; take a deep breath and tell me your address.', kn: 'ಗಾಬರಿಯಾಗಬೇಡಿ; ದೀರ್ಘವಾಗಿ ಉಸಿರು ತೆಗೆದುಕೊಂಡು ನಿಮ್ಮ ವಿಳಾಸ ಹೇಳಿ.', hi: 'घबराइए मत; गहरी साँस लीजिए और मुझे अपना पता बताइए।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'Help on the highway', kn: 'ಹೆದ್ದಾರಿಯಲ್ಲಿ ಸಹಾಯ', hi: 'हाईवे पर मदद' },
                    text: {
                        en: "Ravi was driving from Mangaluru to Udupi when he saw a bike lying on the side of the highway. A young man was sitting next to it, and his arm was bleeding badly. Ravi stopped his car and told himself not to panic. He called 108 and said, 'I'd like to report an accident; one person is injured.' The operator asked for the exact location, so Ravi gave the nearest landmark, the Surathkal lighthouse. While they waited, Ravi gave first aid by pressing a clean towel on the wound. The ambulance arrived in fifteen minutes, and later the young man thanked Ravi for staying calm.",
                        kn: 'ರವಿ ಮಂಗಳೂರಿನಿಂದ ಉಡುಪಿಗೆ ಕಾರು ಓಡಿಸುತ್ತಿದ್ದಾಗ, ಹೆದ್ದಾರಿಯ ಬದಿಯಲ್ಲಿ ಒಂದು ಬೈಕ್ ಬಿದ್ದಿರುವುದನ್ನು ನೋಡಿದನು. ಅದರ ಪಕ್ಕದಲ್ಲಿ ಒಬ್ಬ ಯುವಕ ಕುಳಿತಿದ್ದ, ಅವನ ಕೈಯಿಂದ ತುಂಬಾ ರಕ್ತ ಸುರಿಯುತ್ತಿತ್ತು. ರವಿ ಕಾರು ನಿಲ್ಲಿಸಿ, ಗಾಬರಿಯಾಗಬಾರದು ಎಂದು ತನಗೆ ತಾನೇ ಹೇಳಿಕೊಂಡನು. ಅವನು 108ಕ್ಕೆ ಕರೆ ಮಾಡಿ, "ಒಂದು ಅಪಘಾತದ ಬಗ್ಗೆ ತಿಳಿಸಬೇಕು; ಒಬ್ಬರು ಗಾಯಗೊಂಡಿದ್ದಾರೆ" ಎಂದು ಹೇಳಿದನು. ಸಿಬ್ಬಂದಿ ನಿಖರವಾದ ಸ್ಥಳ ಕೇಳಿದಾಗ, ರವಿ ಹತ್ತಿರದ ಗುರುತಿನ ಸ್ಥಳವಾದ ಸುರತ್ಕಲ್ ದೀಪಸ್ತಂಭದ ಹೆಸರು ಹೇಳಿದನು. ಕಾಯುತ್ತಿರುವಾಗ ರವಿ ಗಾಯದ ಮೇಲೆ ಸ್ವಚ್ಛ ಟವೆಲ್ ಒತ್ತಿ ಹಿಡಿದು ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ನೀಡಿದನು. ಹದಿನೈದು ನಿಮಿಷದಲ್ಲಿ ಆಂಬುಲೆನ್ಸ್ ಬಂತು, ಮತ್ತು ನಂತರ ಆ ಯುವಕ ಶಾಂತವಾಗಿದ್ದಕ್ಕಾಗಿ ರವಿಗೆ ಧನ್ಯವಾದ ಹೇಳಿದನು.',
                        hi: 'रवि मंगलुरु से उडुपी जा रहा था, तभी उसने हाईवे के किनारे एक बाइक गिरी हुई देखी। उसके पास एक नौजवान बैठा था, और उसकी बाँह से बहुत ख़ून बह रहा था। रवि ने अपनी कार रोकी और ख़ुद से कहा कि घबराना नहीं है। उसने 108 पर फ़ोन किया और कहा, "मैं एक दुर्घटना की सूचना देना चाहता हूँ; एक व्यक्ति घायल है।" ऑपरेटर ने सही जगह पूछी, तो रवि ने सबसे नज़दीकी पहचान की जगह बताई: सुरतकल का लाइटहाउस। इंतज़ार करते हुए रवि ने घाव पर एक साफ़ तौलिया दबाकर प्राथमिक उपचार दिया। एम्बुलेंस पंद्रह मिनट में आ गई, और बाद में उस नौजवान ने शांत रहने के लिए रवि को धन्यवाद दिया।'
                    },
                    questions: [
                        {
                            q: { en: 'Where did Ravi see the bike?', kn: 'ರವಿ ಬೈಕನ್ನು ಎಲ್ಲಿ ನೋಡಿದನು?', hi: 'रवि ने बाइक कहाँ देखी?' },
                            options: [
                                { en: 'On the side of the highway', kn: 'ಹೆದ್ದಾರಿಯ ಬದಿಯಲ್ಲಿ', hi: 'हाईवे के किनारे' },
                                { en: 'Outside a hospital', kn: 'ಆಸ್ಪತ್ರೆಯ ಹೊರಗೆ', hi: 'एक अस्पताल के बाहर' },
                                { en: 'In a car park in Udupi', kn: 'ಉಡುಪಿಯ ವಾಹನ ನಿಲುಗಡೆ ಸ್ಥಳದಲ್ಲಿ', hi: 'उडुपी की एक पार्किंग में' },
                                { en: 'Near his house in Mangaluru', kn: 'ಮಂಗಳೂರಿನಲ್ಲಿ ಅವನ ಮನೆಯ ಹತ್ತಿರ', hi: 'मंगलुरु में उसके घर के पास' }
                            ]
                        },
                        {
                            q: { en: 'Which landmark did Ravi give?', kn: 'ರವಿ ಯಾವ ಗುರುತಿನ ಸ್ಥಳ ಹೇಳಿದನು?', hi: 'रवि ने कौन-सी पहचान की जगह बताई?' },
                            options: [
                                { en: 'The Surathkal lighthouse', kn: 'ಸುರತ್ಕಲ್ ದೀಪಸ್ತಂಭ', hi: 'सुरतकल का लाइटहाउस' },
                                { en: 'A petrol bunk', kn: 'ಒಂದು ಪೆಟ್ರೋಲ್ ಬಂಕ್', hi: 'एक पेट्रोल पंप' },
                                { en: 'The Udupi temple', kn: 'ಉಡುಪಿ ದೇವಸ್ಥಾನ', hi: 'उडुपी का मंदिर' },
                                { en: 'A bus stand', kn: 'ಒಂದು ಬಸ್ ನಿಲ್ದಾಣ', hi: 'एक बस स्टैंड' }
                            ]
                        },
                        {
                            q: { en: 'How long did the ambulance take to arrive?', kn: 'ಆಂಬುಲೆನ್ಸ್ ಬರಲು ಎಷ್ಟು ಸಮಯ ಬೇಕಾಯಿತು?', hi: 'एम्बुलेंस को आने में कितना समय लगा?' },
                            options: [
                                { en: 'Fifteen minutes', kn: 'ಹದಿನೈದು ನಿಮಿಷ', hi: 'पंद्रह मिनट' },
                                { en: 'One hour', kn: 'ಒಂದು ಗಂಟೆ', hi: 'एक घंटा' },
                                { en: 'Five minutes', kn: 'ಐದು ನಿಮಿಷ', hi: 'पाँच मिनट' },
                                { en: 'Thirty minutes', kn: 'ಮೂವತ್ತು ನಿಮಿಷ', hi: 'तीस मिनट' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Calling 112', kn: '112ಕ್ಕೆ ಕರೆ', hi: '112 पर फ़ोन' },
                    scenario: {
                        en: 'Nandini sees smoke coming from a house in her lane in Pune and calls the 112 emergency helpline. Suresh answers.',
                        kn: 'ಪುಣೆಯಲ್ಲಿ ತನ್ನ ಬೀದಿಯ ಒಂದು ಮನೆಯಿಂದ ಹೊಗೆ ಬರುತ್ತಿರುವುದನ್ನು ನಂದಿನಿ ನೋಡಿ, 112 ತುರ್ತು ಸಹಾಯವಾಣಿಗೆ ಕರೆ ಮಾಡುತ್ತಾಳೆ. ಸುರೇಶ್ ಕರೆ ಸ್ವೀಕರಿಸುತ್ತಾರೆ.',
                        hi: 'नंदिनी पुणे में अपनी गली के एक घर से धुआँ निकलता देखती है और 112 आपात हेल्पलाइन पर फ़ोन करती है। सुरेश फ़ोन उठाते हैं।'
                    },
                    speakers: [{ name: 'Suresh', voice: 'm' }, { name: 'Nandini', voice: 'f' }],
                    lines: [
                        { speaker: 'Suresh', en: '112 emergency helpline. What is your emergency?', kn: '112 ತುರ್ತು ಸಹಾಯವಾಣಿ. ನಿಮ್ಮ ತುರ್ತು ಸಮಸ್ಯೆ ಏನು?', hi: '112 आपात हेल्पलाइन। आपकी आपात स्थिति क्या है?' },
                        { speaker: 'Nandini', en: "There's a fire in a house on my street. I can see thick smoke coming from the upstairs window.", kn: 'ನಮ್ಮ ಬೀದಿಯ ಒಂದು ಮನೆಗೆ ಬೆಂಕಿ ಬಿದ್ದಿದೆ. ಮೇಲಿನ ಕಿಟಕಿಯಿಂದ ದಟ್ಟ ಹೊಗೆ ಬರುತ್ತಿರುವುದು ಕಾಣುತ್ತಿದೆ.', hi: 'मेरी गली के एक घर में आग लगी है। ऊपर वाली खिड़की से घना धुआँ निकलता दिख रहा है।' },
                        { speaker: 'Suresh', en: 'Please stay calm, madam. Is anyone still inside the house?', kn: 'ದಯವಿಟ್ಟು ಶಾಂತವಾಗಿರಿ, ಮೇಡಂ. ಮನೆಯೊಳಗೆ ಇನ್ನೂ ಯಾರಾದರೂ ಇದ್ದಾರೆಯೇ?', hi: 'कृपया शांत रहिए, मैडम। क्या घर के अंदर अभी भी कोई है?' },
                        { speaker: 'Nandini', en: "I'm not sure. An old couple lives there, and I can't see them outside.", kn: 'ಗೊತ್ತಿಲ್ಲ. ಅಲ್ಲಿ ವಯಸ್ಸಾದ ದಂಪತಿ ವಾಸಿಸುತ್ತಾರೆ, ಅವರು ಹೊರಗೆ ಕಾಣುತ್ತಿಲ್ಲ.', hi: 'पता नहीं। वहाँ एक बुज़ुर्ग दंपति रहते हैं, और वे बाहर नहीं दिख रहे।' },
                        { speaker: 'Suresh', en: "I'm sending the fire brigade and an ambulance right now. What is the exact address?", kn: 'ನಾನು ಈಗಲೇ ಅಗ್ನಿಶಾಮಕ ದಳ ಮತ್ತು ಆಂಬುಲೆನ್ಸ್ ಕಳುಹಿಸುತ್ತಿದ್ದೇನೆ. ನಿಖರವಾದ ವಿಳಾಸ ಏನು?', hi: 'मैं अभी दमकल और एम्बुलेंस भेज रहा हूँ। सही पता क्या है?' },
                        { speaker: 'Nandini', en: "It's house number 14, Shanti Nagar, Kothrud. The landmark is the blue water tank at the corner.", kn: 'ಮನೆ ನಂಬರ್ 14, ಶಾಂತಿ ನಗರ, ಕೋಥ್ರುಡ್. ಮೂಲೆಯಲ್ಲಿರುವ ನೀಲಿ ನೀರಿನ ಟ್ಯಾಂಕ್ ಗುರುತಿನ ಸ್ಥಳ.', hi: 'मकान नंबर 14, शांति नगर, कोथरुड। पहचान के लिए कोने पर नीली पानी की टंकी है।' },
                        { speaker: 'Suresh', en: 'Thank you. Please do not go inside, and keep other people away from the smoke.', kn: 'ಧನ್ಯವಾದಗಳು. ದಯವಿಟ್ಟು ಒಳಗೆ ಹೋಗಬೇಡಿ, ಬೇರೆಯವರನ್ನೂ ಹೊಗೆಯಿಂದ ದೂರ ಇರಿಸಿ.', hi: 'धन्यवाद। कृपया अंदर मत जाइए, और दूसरे लोगों को भी धुएँ से दूर रखिए।' },
                        { speaker: 'Nandini', en: 'All right. Oh, a neighbour says the couple are at the temple, so the house is empty.', kn: 'ಸರಿ. ಓ, ಆ ದಂಪತಿ ದೇವಸ್ಥಾನಕ್ಕೆ ಹೋಗಿದ್ದಾರೆ, ಮನೆ ಖಾಲಿ ಇದೆ ಎಂದು ಒಬ್ಬ ನೆರೆಹೊರೆಯವರು ಹೇಳುತ್ತಿದ್ದಾರೆ.', hi: 'ठीक है। अरे, एक पड़ोसी कह रहे हैं कि वे दोनों मंदिर गए हैं, तो घर ख़ाली है।' },
                        { speaker: 'Suresh', en: "That's good news. The fire brigade should reach you in about ten minutes. Please stay on the line.", kn: 'ಇದು ಒಳ್ಳೆಯ ಸುದ್ದಿ. ಅಗ್ನಿಶಾಮಕ ದಳ ಸುಮಾರು ಹತ್ತು ನಿಮಿಷದಲ್ಲಿ ತಲುಪುತ್ತದೆ. ದಯವಿಟ್ಟು ಕರೆಯಲ್ಲೇ ಇರಿ.', hi: 'यह अच्छी ख़बर है। दमकल लगभग दस मिनट में पहुँच जाएगी। कृपया फ़ोन पर बने रहिए।' },
                        { speaker: 'Nandini', en: 'Thank you so much. I can already hear the siren.', kn: 'ತುಂಬಾ ಧನ್ಯವಾದಗಳು. ಸೈರನ್ ಶಬ್ದ ಆಗಲೇ ಕೇಳಿಸುತ್ತಿದೆ.', hi: 'बहुत-बहुत धन्यवाद। सायरन की आवाज़ अभी से सुनाई दे रही है।' }
                    ],
                    questions: [
                        {
                            q: { en: 'Why did Nandini call 112?', kn: 'ನಂದಿನಿ 112ಕ್ಕೆ ಏಕೆ ಕರೆ ಮಾಡಿದಳು?', hi: 'नंदिनी ने 112 पर फ़ोन क्यों किया?' },
                            options: [
                                { en: 'She saw smoke coming from a house', kn: 'ಒಂದು ಮನೆಯಿಂದ ಹೊಗೆ ಬರುತ್ತಿರುವುದನ್ನು ನೋಡಿದಳು', hi: 'उसने एक घर से धुआँ निकलते देखा' },
                                { en: 'She saw a road accident', kn: 'ಒಂದು ರಸ್ತೆ ಅಪಘಾತ ನೋಡಿದಳು', hi: 'उसने एक सड़क दुर्घटना देखी' },
                                { en: 'Her phone was stolen', kn: 'ಅವಳ ಫೋನ್ ಕಳುವಾಗಿತ್ತು', hi: 'उसका फ़ोन चोरी हो गया था' },
                                { en: 'Her mother fell ill', kn: 'ಅವಳ ತಾಯಿಗೆ ಹುಷಾರಿರಲಿಲ್ಲ', hi: 'उसकी माँ बीमार हो गई थीं' }
                            ]
                        },
                        {
                            q: { en: 'Which landmark did Nandini give?', kn: 'ನಂದಿನಿ ಯಾವ ಗುರುತಿನ ಸ್ಥಳ ಹೇಳಿದಳು?', hi: 'नंदिनी ने कौन-सी पहचान की जगह बताई?' },
                            options: [
                                { en: 'A blue water tank at the corner', kn: 'ಮೂಲೆಯಲ್ಲಿರುವ ನೀಲಿ ನೀರಿನ ಟ್ಯಾಂಕ್', hi: 'कोने पर नीली पानी की टंकी' },
                                { en: 'A big temple', kn: 'ಒಂದು ದೊಡ್ಡ ದೇವಸ್ಥಾನ', hi: 'एक बड़ा मंदिर' },
                                { en: 'A petrol bunk', kn: 'ಒಂದು ಪೆಟ್ರೋಲ್ ಬಂಕ್', hi: 'एक पेट्रोल पंप' },
                                { en: 'The railway station', kn: 'ರೈಲು ನಿಲ್ದಾಣ', hi: 'रेलवे स्टेशन' }
                            ]
                        },
                        {
                            q: { en: 'Where was the old couple?', kn: 'ವಯಸ್ಸಾದ ದಂಪತಿ ಎಲ್ಲಿದ್ದರು?', hi: 'बुज़ुर्ग दंपति कहाँ थे?' },
                            options: [
                                { en: 'At the temple', kn: 'ದೇವಸ್ಥಾನದಲ್ಲಿ', hi: 'मंदिर में' },
                                { en: 'Inside the house', kn: 'ಮನೆಯೊಳಗೆ', hi: 'घर के अंदर' },
                                { en: 'In hospital', kn: 'ಆಸ್ಪತ್ರೆಯಲ್ಲಿ', hi: 'अस्पताल में' },
                                { en: 'At the market', kn: 'ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ', hi: 'बाज़ार में' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Call 112 to report a road accident you have just seen: say what happened, how many people are hurt, give the exact place with a landmark, and say what help you need.',
                        sample: "Hello, I'd like to report a road accident. A car has hit a scooter on Sayyaji Rao Road in Mysuru, right in front of the Central Bus Stand. Two people are injured. The scooter rider is bleeding from his head, and he seems to be unconscious. The other person can walk, but her leg is badly hurt. Please send an ambulance as quickly as possible, and the police as well, because the traffic is getting heavy. My name is Arun, and you can reach me on this number. I'll stay here and keep people away until help arrives.",
                        checklist: ['I said clearly that I was reporting an accident', 'I gave the exact place and a landmark', 'I said how many people were hurt and how badly', 'I asked for an ambulance and the police', 'I gave my name and said I would stay', 'I spoke calmly and slowly']
                    }
                }
            ]
        },
        '3:1': {
            name: 'Repairs at home',
            lessons: [
                {
                    kind: 'words', title: 'Who to call', list: [
                        { en: 'plumber', kn: 'ಪ್ಲಂಬರ್', hi: 'प्लंबर', pic: '🔧', def: 'a worker who fixes water pipes, taps and toilets' },
                        { en: 'electrician', kn: 'ಎಲೆಕ್ಟ್ರಿಷಿಯನ್', hi: 'बिजली मिस्त्री', pic: '👷', def: 'a worker who fits and repairs electric wires and switches' },
                        { en: 'leak', kn: 'ಸೋರಿಕೆ', hi: 'रिसाव', pic: '💧', def: 'a small hole or crack that lets water or gas escape' },
                        { en: 'tap', kn: 'ನಲ್ಲಿ', hi: 'नल', pic: '🚰', def: 'a device you turn to let water flow or to stop it' },
                        { en: 'wiring', kn: 'ವೈರಿಂಗ್', hi: 'वायरिंग', pic: '🔌', def: 'the system of electric wires inside a building' },
                        { en: 'fuse', kn: 'ಫ್ಯೂಸ್', hi: 'फ़्यूज़', pic: '⚡', def: 'a small safety part that breaks when too much electricity flows' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Repairs at home 1', list: [
                        { read: true, en: 'The kitchen tap has been dripping all night; could you send a plumber today?', kn: 'ಅಡುಗೆಮನೆಯ ನಲ್ಲಿ ರಾತ್ರಿಯಿಡೀ ತೊಟ್ಟಿಕ್ಕುತ್ತಿದೆ; ಇವತ್ತೇ ಒಬ್ಬ ಪ್ಲಂಬರ್‌ನನ್ನು ಕಳುಹಿಸುತ್ತೀರಾ?', hi: 'रसोई का नल पूरी रात से टपक रहा है; क्या आप आज ही किसी प्लंबर को भेज सकते हैं?' },
                        { read: true, en: "There's a leak under the bathroom sink, and the floor is always wet.", kn: 'ಬಚ್ಚಲುಮನೆಯ ಸಿಂಕ್ ಕೆಳಗೆ ಸೋರಿಕೆ ಇದೆ, ನೆಲ ಯಾವಾಗಲೂ ಒದ್ದೆಯಾಗಿರುತ್ತದೆ.', hi: 'बाथरूम के सिंक के नीचे रिसाव है, और फ़र्श हमेशा गीला रहता है।', acc: { en: ['There is a leak under the bathroom sink, and the floor is always wet.'] } },
                        { en: 'Every time I switch on the geyser, the fuse blows.', kn: 'ಗೀಸರ್ ಹಾಕಿದಾಗಲೆಲ್ಲಾ ಫ್ಯೂಸ್ ಹೋಗುತ್ತದೆ.', hi: 'जब भी मैं गीज़र चलाता हूँ, फ़्यूज़ उड़ जाता है।', acc: { hi: ['जब भी मैं गीज़र चलाती हूँ, फ़्यूज़ उड़ जाता है।'] } },
                        { read: true, en: 'The electrician says the old wiring in this flat is not safe.', kn: 'ಈ ಫ್ಲಾಟ್‌ನ ಹಳೆಯ ವೈರಿಂಗ್ ಸುರಕ್ಷಿತವಲ್ಲ ಎಂದು ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ ಹೇಳುತ್ತಾರೆ.', hi: 'बिजली मिस्त्री का कहना है कि इस फ़्लैट की पुरानी वायरिंग सुरक्षित नहीं है।' },
                        { en: 'Please turn off the main switch before you touch any wires.', kn: 'ಯಾವುದೇ ತಂತಿ ಮುಟ್ಟುವ ಮೊದಲು ದಯವಿಟ್ಟು ಮೇನ್ ಸ್ವಿಚ್ ಆಫ್ ಮಾಡಿ.', hi: 'किसी भी तार को छूने से पहले कृपया मेन स्विच बंद कर दीजिए।' }
                    ]
                },
                {
                    kind: 'words', title: 'Explaining a fault', list: [
                        { en: 'appliance', kn: 'ಗೃಹೋಪಯೋಗಿ ಉಪಕರಣ', hi: 'घरेलू उपकरण', pic: '📺', def: 'a machine used at home, such as a fridge or a mixer' },
                        { en: 'fault', kn: 'ದೋಷ', hi: 'ख़राबी', pic: '🛠️', def: 'something wrong in a machine that stops it from working properly' },
                        { en: 'technician', kn: 'ತಂತ್ರಜ್ಞ', hi: 'तकनीशियन', pic: '🧰', def: 'a trained worker who checks and repairs machines' },
                        { en: 'spare part', kn: 'ಬಿಡಿಭಾಗ', hi: 'पुर्ज़ा', pic: '⚙️', def: 'a new piece used to replace a broken part of a machine' },
                        { en: 'estimate', kn: 'ಅಂದಾಜು', hi: 'अनुमान', pic: '🧮', def: 'a rough idea of how much a job will cost' },
                        { en: 'service charge', kn: 'ಸೇವಾ ಶುಲ್ಕ', hi: 'सर्विस चार्ज', pic: '💳', def: "the money you pay for a repair worker's visit and time" }
                    ]
                },
                {
                    kind: 'phrases', title: 'Repairs at home 2', list: [
                        { read: true, en: 'Our washing machine has a fault; it stops in the middle of every wash.', kn: 'ನಮ್ಮ ವಾಷಿಂಗ್ ಮೆಷಿನ್‌ನಲ್ಲಿ ದೋಷವಿದೆ; ಪ್ರತಿ ಬಾರಿ ಒಗೆಯುವಾಗ ಅರ್ಧದಲ್ಲೇ ನಿಂತುಹೋಗುತ್ತದೆ.', hi: 'हमारी वॉशिंग मशीन में ख़राबी है; हर धुलाई के बीच में ही रुक जाती है।' },
                        { en: 'Could the technician come tomorrow morning, before I leave for work?', kn: 'ನಾನು ಕೆಲಸಕ್ಕೆ ಹೊರಡುವ ಮೊದಲು, ನಾಳೆ ಬೆಳಿಗ್ಗೆ ತಂತ್ರಜ್ಞರು ಬರಬಹುದೇ?', hi: 'क्या तकनीशियन कल सुबह, मेरे काम पर जाने से पहले आ सकते हैं?' },
                        { read: true, en: 'Before you start, can you give me an estimate of the total cost?', kn: 'ಕೆಲಸ ಶುರು ಮಾಡುವ ಮೊದಲು ಒಟ್ಟು ಖರ್ಚಿನ ಅಂದಾಜು ಕೊಡುತ್ತೀರಾ?', hi: 'काम शुरू करने से पहले क्या आप कुल ख़र्च का अनुमान बता सकते हैं?' },
                        { en: 'The spare part will take three days to arrive from Bengaluru.', kn: 'ಬಿಡಿಭಾಗ ಬೆಂಗಳೂರಿನಿಂದ ಬರಲು ಮೂರು ದಿನ ಬೇಕಾಗುತ್ತದೆ.', hi: 'पुर्ज़े को बेंगलुरु से आने में तीन दिन लगेंगे।' },
                        { read: true, en: 'The service charge for any large appliance is three hundred rupees per visit.', kn: 'ಯಾವುದೇ ದೊಡ್ಡ ಗೃಹೋಪಯೋಗಿ ಉಪಕರಣಕ್ಕೆ ಪ್ರತಿ ಭೇಟಿಗೆ ಮುನ್ನೂರು ರೂಪಾಯಿ ಸೇವಾ ಶುಲ್ಕ ಇದೆ.', hi: 'किसी भी बड़े घरेलू उपकरण के लिए हर विज़िट का सर्विस चार्ज तीन सौ रुपये है।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'The fridge that stopped cooling', kn: 'ತಣ್ಣಗಾಗದ ಫ್ರಿಜ್', hi: 'फ़्रिज जिसने ठंडा करना छोड़ दिया' },
                    text: {
                        en: "During a hot week in May in Kalaburagi, the Kulkarni family's fridge suddenly stopped cooling. Sunita called the company's service centre and explained the fault clearly: the light was on, but the inside was warm. A technician came the next afternoon and checked the appliance carefully. He said that a spare part in the cooling system had failed and needed to be replaced. Before he started, Sunita politely asked for an estimate, and he said the total would be about two thousand rupees, including the service charge. The part arrived from Hubballi two days later, and the technician fixed the fridge within an hour. That evening the fridge was cold again, and the family could finally store milk and curd.",
                        kn: 'ಕಲಬುರಗಿಯಲ್ಲಿ ಮೇ ತಿಂಗಳ ಬಿಸಿಲಿನ ಒಂದು ವಾರದಲ್ಲಿ ಕುಲಕರ್ಣಿ ಕುಟುಂಬದ ಫ್ರಿಜ್ ಇದ್ದಕ್ಕಿದ್ದಂತೆ ತಣ್ಣಗಾಗುವುದನ್ನು ನಿಲ್ಲಿಸಿತು. ಸುನೀತಾ ಕಂಪನಿಯ ಸರ್ವೀಸ್ ಸೆಂಟರ್‌ಗೆ ಕರೆ ಮಾಡಿ ದೋಷವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ವಿವರಿಸಿದಳು: ದೀಪ ಉರಿಯುತ್ತಿದೆ, ಆದರೆ ಒಳಗೆ ಬಿಸಿಯಾಗಿದೆ. ಮರುದಿನ ಮಧ್ಯಾಹ್ನ ಒಬ್ಬ ತಂತ್ರಜ್ಞರು ಬಂದು ಉಪಕರಣವನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಪರಿಶೀಲಿಸಿದರು. ತಂಪಾಗಿಸುವ ವ್ಯವಸ್ಥೆಯ ಒಂದು ಬಿಡಿಭಾಗ ಕೆಟ್ಟುಹೋಗಿದೆ, ಅದನ್ನು ಬದಲಾಯಿಸಬೇಕು ಎಂದು ಅವರು ಹೇಳಿದರು. ಕೆಲಸ ಶುರು ಮಾಡುವ ಮೊದಲು ಸುನೀತಾ ವಿನಯದಿಂದ ಅಂದಾಜು ಕೇಳಿದಳು; ಸೇವಾ ಶುಲ್ಕ ಸೇರಿ ಸುಮಾರು ಎರಡು ಸಾವಿರ ರೂಪಾಯಿ ಆಗುತ್ತದೆ ಎಂದು ಅವರು ಹೇಳಿದರು. ಎರಡು ದಿನಗಳ ನಂತರ ಹುಬ್ಬಳ್ಳಿಯಿಂದ ಆ ಭಾಗ ಬಂತು, ಮತ್ತು ತಂತ್ರಜ್ಞರು ಒಂದು ಗಂಟೆಯೊಳಗೆ ಫ್ರಿಜ್ ಸರಿಪಡಿಸಿದರು. ಆ ಸಂಜೆ ಫ್ರಿಜ್ ಮತ್ತೆ ತಣ್ಣಗಾಯಿತು, ಮತ್ತು ಕೊನೆಗೂ ಮನೆಯವರು ಹಾಲು, ಮೊಸರು ಇಡುವಂತಾಯಿತು.',
                        hi: 'मई के एक गर्म हफ़्ते में कलबुर्गी में कुलकर्णी परिवार के फ़्रिज ने अचानक ठंडा करना बंद कर दिया। सुनीता ने कंपनी के सर्विस सेंटर को फ़ोन किया और ख़राबी साफ़-साफ़ समझाई: बत्ती जल रही है, लेकिन अंदर गर्म है। अगले दिन दोपहर को एक तकनीशियन आए और उपकरण को ध्यान से जाँचा। उन्होंने कहा कि ठंडा करने वाले सिस्टम का एक पुर्ज़ा ख़राब हो गया है और उसे बदलना पड़ेगा। काम शुरू होने से पहले सुनीता ने विनम्रता से अनुमान पूछा, और उन्होंने बताया कि सर्विस चार्ज मिलाकर लगभग दो हज़ार रुपये लगेंगे। दो दिन बाद पुर्ज़ा हुब्बल्ली से आया, और तकनीशियन ने एक घंटे के अंदर फ़्रिज ठीक कर दिया। उस शाम फ़्रिज फिर से ठंडा हो गया, और आख़िरकार परिवार दूध और दही रख पाया।'
                    },
                    questions: [
                        {
                            q: { en: 'What was wrong with the fridge?', kn: 'ಫ್ರಿಜ್‌ಗೆ ಏನಾಗಿತ್ತು?', hi: 'फ़्रिज में क्या ख़राबी थी?' },
                            options: [
                                { en: 'It stopped cooling', kn: 'ಅದು ತಣ್ಣಗಾಗುವುದನ್ನು ನಿಲ್ಲಿಸಿತ್ತು', hi: 'उसने ठंडा करना बंद कर दिया था' },
                                { en: 'Its door was broken', kn: 'ಅದರ ಬಾಗಿಲು ಮುರಿದಿತ್ತು', hi: 'उसका दरवाज़ा टूट गया था' },
                                { en: 'It made a loud noise', kn: 'ಅದು ಜೋರಾಗಿ ಸದ್ದು ಮಾಡುತ್ತಿತ್ತು', hi: 'उससे तेज़ आवाज़ आ रही थी' },
                                { en: 'Its light was not working', kn: 'ಅದರ ದೀಪ ಕೆಲಸ ಮಾಡುತ್ತಿರಲಿಲ್ಲ', hi: 'उसकी बत्ती नहीं जल रही थी' }
                            ]
                        },
                        {
                            q: { en: 'What did Sunita ask for before the work started?', kn: 'ಕೆಲಸ ಶುರುವಾಗುವ ಮೊದಲು ಸುನೀತಾ ಏನು ಕೇಳಿದಳು?', hi: 'काम शुरू होने से पहले सुनीता ने क्या पूछा?' },
                            options: [
                                { en: 'An estimate of the cost', kn: 'ಖರ್ಚಿನ ಅಂದಾಜು', hi: 'ख़र्च का अनुमान' },
                                { en: 'A new fridge', kn: 'ಹೊಸ ಫ್ರಿಜ್', hi: 'नया फ़्रिज' },
                                { en: 'A discount on the bill', kn: 'ಬಿಲ್‌ನಲ್ಲಿ ರಿಯಾಯಿತಿ', hi: 'बिल पर छूट' },
                                { en: "The company manager's number", kn: 'ಕಂಪನಿ ಮ್ಯಾನೇಜರ್‌ನ ನಂಬರ್', hi: 'कंपनी के मैनेजर का नंबर' }
                            ]
                        },
                        {
                            q: { en: 'Where did the spare part come from?', kn: 'ಬಿಡಿಭಾಗ ಎಲ್ಲಿಂದ ಬಂತು?', hi: 'पुर्ज़ा कहाँ से आया?' },
                            options: [
                                { en: 'Hubballi', kn: 'ಹುಬ್ಬಳ್ಳಿ', hi: 'हुब्बल्ली' },
                                { en: 'Bengaluru', kn: 'ಬೆಂಗಳೂರು', hi: 'बेंगलुरु' },
                                { en: 'Mysuru', kn: 'ಮೈಸೂರು', hi: 'मैसूरु' },
                                { en: 'Pune', kn: 'ಪುಣೆ', hi: 'पुणे' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Booking an electrician', kn: 'ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ ಬುಕ್ ಮಾಡುವುದು', hi: 'बिजली मिस्त्री बुलाना' },
                    scenario: {
                        en: 'Farhan calls Asha, who runs a home repair service in Mysuru, because the fuse in his flat keeps blowing.',
                        kn: 'ತನ್ನ ಫ್ಲಾಟ್‌ನಲ್ಲಿ ಫ್ಯೂಸ್ ಮತ್ತೆ ಮತ್ತೆ ಹೋಗುತ್ತಿರುವುದರಿಂದ ಫರ್ಹಾನ್, ಮೈಸೂರಿನಲ್ಲಿ ಮನೆ ರಿಪೇರಿ ಸೇವೆ ನಡೆಸುವ ಆಶಾ ಅವರಿಗೆ ಕರೆ ಮಾಡುತ್ತಾನೆ.',
                        hi: 'फ़रहान के फ़्लैट में फ़्यूज़ बार-बार उड़ जाता है, इसलिए वह मैसूरु में घरेलू मरम्मत सेवा चलाने वाली आशा को फ़ोन करता है।'
                    },
                    speakers: [{ name: 'Asha', voice: 'f' }, { name: 'Farhan', voice: 'm' }],
                    lines: [
                        { speaker: 'Asha', en: 'Good morning, QuickFix Home Services. This is Asha. How can I help?', kn: 'ಶುಭೋದಯ, ಕ್ವಿಕ್‌ಫಿಕ್ಸ್ ಹೋಮ್ ಸರ್ವೀಸಸ್. ನಾನು ಆಶಾ. ಏನು ಸಹಾಯ ಮಾಡಲಿ?', hi: 'सुप्रभात, क्विकफ़िक्स होम सर्विसेज़। मैं आशा बोल रही हूँ। बताइए, क्या मदद करूँ?' },
                        { speaker: 'Farhan', en: "Hi, I'm calling about an electrical problem. The fuse in my flat keeps blowing, mostly in the evening.", kn: 'ನಮಸ್ಕಾರ, ಒಂದು ವಿದ್ಯುತ್ ಸಮಸ್ಯೆಯ ಬಗ್ಗೆ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ನನ್ನ ಫ್ಲಾಟ್‌ನಲ್ಲಿ ಫ್ಯೂಸ್ ಮತ್ತೆ ಮತ್ತೆ ಹೋಗುತ್ತಿದೆ, ಹೆಚ್ಚಾಗಿ ಸಂಜೆ ಹೊತ್ತು.', hi: 'नमस्ते, मैं बिजली की एक समस्या के बारे में फ़ोन कर रहा हूँ। मेरे फ़्लैट में फ़्यूज़ बार-बार उड़ जाता है, ज़्यादातर शाम को।' },
                        { speaker: 'Asha', en: 'I see. Does it happen when you switch on a particular appliance?', kn: 'ಹೌದಾ. ಯಾವುದಾದರೂ ನಿರ್ದಿಷ್ಟ ಉಪಕರಣ ಹಾಕಿದಾಗ ಹೀಗಾಗುತ್ತದೆಯೇ?', hi: 'अच्छा। क्या ऐसा कोई ख़ास उपकरण चलाने पर होता है?' },
                        { speaker: 'Farhan', en: 'I think so. It usually happens when the geyser and the iron are on together.', kn: 'ಹಾಗೆ ಅನ್ನಿಸುತ್ತದೆ. ಗೀಸರ್ ಮತ್ತು ಇಸ್ತ್ರಿ ಪೆಟ್ಟಿಗೆ ಒಟ್ಟಿಗೆ ಹಾಕಿದಾಗ ಸಾಮಾನ್ಯವಾಗಿ ಹೀಗಾಗುತ್ತದೆ.', hi: 'मुझे ऐसा ही लगता है। आमतौर पर तब होता है जब गीज़र और इस्त्री एक साथ चल रहे हों।' },
                        { speaker: 'Asha', en: 'It may be a fault in the wiring. I can send an electrician to check it. When would suit you?', kn: 'ವೈರಿಂಗ್‌ನಲ್ಲಿ ದೋಷ ಇರಬಹುದು. ಪರಿಶೀಲಿಸಲು ಒಬ್ಬ ಎಲೆಕ್ಟ್ರಿಷಿಯನ್‌ನನ್ನು ಕಳುಹಿಸುತ್ತೇನೆ. ನಿಮಗೆ ಯಾವಾಗ ಅನುಕೂಲ?', hi: 'शायद वायरिंग में ख़राबी है। मैं जाँच के लिए एक बिजली मिस्त्री भेज सकती हूँ। आपको कब सुविधा रहेगी?' },
                        { speaker: 'Farhan', en: "Could you send someone today? I'm working from home until six.", kn: 'ಇವತ್ತೇ ಯಾರನ್ನಾದರೂ ಕಳುಹಿಸುತ್ತೀರಾ? ನಾನು ಆರು ಗಂಟೆಯವರೆಗೆ ಮನೆಯಿಂದಲೇ ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದೇನೆ.', hi: 'क्या आप आज ही किसी को भेज सकती हैं? मैं छह बजे तक घर से काम कर रहा हूँ।' },
                        { speaker: 'Asha', en: "Our electrician, Mahesh, can come at four o'clock. The service charge for the visit is two hundred and fifty rupees.", kn: 'ನಮ್ಮ ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ ಮಹೇಶ್ ನಾಲ್ಕು ಗಂಟೆಗೆ ಬರಬಹುದು. ಭೇಟಿಯ ಸೇವಾ ಶುಲ್ಕ ಇನ್ನೂರ ಐವತ್ತು ರೂಪಾಯಿ.', hi: 'हमारे बिजली मिस्त्री महेश चार बजे आ सकते हैं। विज़िट का सर्विस चार्ज ढाई सौ रुपये है।' },
                        { speaker: 'Farhan', en: 'That works. Will he give me an estimate before he starts any repair?', kn: 'ಸರಿ, ಆಗುತ್ತದೆ. ರಿಪೇರಿ ಶುರು ಮಾಡುವ ಮೊದಲು ಅವರು ಅಂದಾಜು ಕೊಡುತ್ತಾರೆಯೇ?', hi: 'ठीक है। क्या वे कोई भी मरम्मत शुरू करने से पहले अनुमान बताएँगे?' },
                        { speaker: 'Asha', en: 'Yes, he always explains the cost first. Please share your address on WhatsApp.', kn: 'ಹೌದು, ಅವರು ಯಾವಾಗಲೂ ಮೊದಲು ಖರ್ಚನ್ನು ವಿವರಿಸುತ್ತಾರೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ವಿಳಾಸವನ್ನು ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಕಳುಹಿಸಿ.', hi: 'जी हाँ, वे हमेशा पहले ख़र्च समझाते हैं। कृपया अपना पता व्हाट्सऐप पर भेज दीजिए।' },
                        { speaker: 'Farhan', en: "Perfect, I'll send it right now. Thank you.", kn: 'ಸರಿ, ಈಗಲೇ ಕಳುಹಿಸುತ್ತೇನೆ. ಧನ್ಯವಾದಗಳು.', hi: 'बढ़िया, मैं अभी भेजता हूँ। धन्यवाद।' }
                    ],
                    questions: [
                        {
                            q: { en: "What is the problem in Farhan's flat?", kn: 'ಫರ್ಹಾನ್‌ನ ಫ್ಲಾಟ್‌ನಲ್ಲಿ ಏನು ಸಮಸ್ಯೆ?', hi: 'फ़रहान के फ़्लैट में क्या समस्या है?' },
                            options: [
                                { en: 'The fuse keeps blowing', kn: 'ಫ್ಯೂಸ್ ಮತ್ತೆ ಮತ್ತೆ ಹೋಗುತ್ತಿದೆ', hi: 'फ़्यूज़ बार-बार उड़ जाता है' },
                                { en: 'The tap is leaking', kn: 'ನಲ್ಲಿ ಸೋರುತ್ತಿದೆ', hi: 'नल टपक रहा है' },
                                { en: 'The fridge is not cooling', kn: 'ಫ್ರಿಜ್ ತಣ್ಣಗಾಗುತ್ತಿಲ್ಲ', hi: 'फ़्रिज ठंडा नहीं कर रहा' },
                                { en: 'The door lock is broken', kn: 'ಬಾಗಿಲಿನ ಬೀಗ ಮುರಿದಿದೆ', hi: 'दरवाज़े का ताला टूट गया है' }
                            ]
                        },
                        {
                            q: { en: 'What time will the electrician come?', kn: 'ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ ಎಷ್ಟು ಗಂಟೆಗೆ ಬರುತ್ತಾರೆ?', hi: 'बिजली मिस्त्री कितने बजे आएँगे?' },
                            options: [
                                { en: "At four o'clock", kn: 'ನಾಲ್ಕು ಗಂಟೆಗೆ', hi: 'चार बजे' },
                                { en: "At six o'clock", kn: 'ಆರು ಗಂಟೆಗೆ', hi: 'छह बजे' },
                                { en: 'Tomorrow morning', kn: 'ನಾಳೆ ಬೆಳಿಗ್ಗೆ', hi: 'कल सुबह' },
                                { en: 'At noon', kn: 'ಮಧ್ಯಾಹ್ನ ಹನ್ನೆರಡಕ್ಕೆ', hi: 'दोपहर बारह बजे' }
                            ]
                        },
                        {
                            q: { en: 'How much is the service charge for the visit?', kn: 'ಭೇಟಿಯ ಸೇವಾ ಶುಲ್ಕ ಎಷ್ಟು?', hi: 'विज़िट का सर्विस चार्ज कितना है?' },
                            options: [
                                { en: 'Two hundred and fifty rupees', kn: 'ಇನ್ನೂರ ಐವತ್ತು ರೂಪಾಯಿ', hi: 'ढाई सौ रुपये' },
                                { en: 'Five hundred rupees', kn: 'ಐನೂರು ರೂಪಾಯಿ', hi: 'पाँच सौ रुपये' },
                                { en: 'One hundred rupees', kn: 'ನೂರು ರೂಪಾಯಿ', hi: 'सौ रुपये' },
                                { en: 'Two thousand rupees', kn: 'ಎರಡು ಸಾವಿರ ರೂಪಾಯಿ', hi: 'दो हज़ार रुपये' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: "Call a repair service about a problem at home (for example, a leaking tap or a mixer that won't start): explain the fault, say since when it has happened, ask when someone can come, and ask about the cost.",
                        sample: "Hello, I'm calling from flat 302, Lakshmi Residency, in Vijayanagar. Our kitchen tap has been leaking since Saturday, and now water is also coming from the pipe under the sink. We've closed the main valve for now, but we can't manage for long without water. Could you send a plumber today, preferably before seven in the evening? Also, could you tell me what the service charge is, and whether he'll bring the spare parts with him? I'd like an estimate before he starts any work. You can reach me on this number. Thank you.",
                        checklist: ['I gave my address clearly', 'I explained the fault in simple words', 'I said since when the problem has been there', 'I asked when someone could come', 'I asked about the service charge and an estimate', 'I thanked the person']
                    }
                }
            ]
        },
        '4:1': {
            name: 'Complaints and refunds',
            lessons: [
                {
                    kind: 'words', title: 'Something went wrong', list: [
                        { en: 'complaint', kn: 'ದೂರು', hi: 'शिकायत', pic: '😠', def: 'a statement that you are unhappy with a product or a service' },
                        { en: 'refund', kn: 'ಹಣ ವಾಪಸ್', hi: 'पैसे की वापसी', pic: '💸', def: 'money that is paid back to you when you return something' },
                        { en: 'receipt', kn: 'ರಸೀದಿ', hi: 'रसीद', pic: '🧾', def: 'a piece of paper that proves you paid for something' },
                        { en: 'warranty', kn: 'ಖಾತರಿ', hi: 'वारंटी', pic: '🛡️', def: 'a written promise to repair or replace a product for a fixed time' },
                        { en: 'defective', kn: 'ದೋಷಪೂರಿತ', hi: 'दोषपूर्ण', pic: '🚫', def: 'not working properly because it was badly made' },
                        { en: 'replacement', kn: 'ಬದಲಿ', hi: 'रिप्लेसमेंट', pic: '🔄', def: 'a new thing given to you in place of a broken one' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Complaints and refunds 1', list: [
                        { read: true, en: "I'd like to make a complaint about a mixer I bought here last week.", kn: 'ಕಳೆದ ವಾರ ಇಲ್ಲಿ ಕೊಂಡ ಮಿಕ್ಸಿಯ ಬಗ್ಗೆ ನಾನು ದೂರು ನೀಡಲು ಬಯಸುತ್ತೇನೆ.', hi: 'मैं पिछले हफ़्ते यहाँ से ख़रीदी मिक्सी के बारे में शिकायत करना चाहता हूँ।', acc: { en: ['I would like to make a complaint about a mixer I bought here last week.'], hi: ['मैं पिछले हफ़्ते यहाँ से ख़रीदी मिक्सी के बारे में शिकायत करना चाहती हूँ।'] } },
                        { read: true, en: "The motor is defective, so I'd like a replacement or a full refund.", kn: 'ಮೋಟಾರ್ ದೋಷಪೂರಿತವಾಗಿದೆ, ಹಾಗಾಗಿ ನನಗೆ ಬದಲಿ ಮಿಕ್ಸಿ ಅಥವಾ ಪೂರ್ತಿ ಹಣ ವಾಪಸ್ ಬೇಕು.', hi: 'मोटर ख़राब है, इसलिए मुझे दूसरी मिक्सी चाहिए या पूरे पैसे वापस।', acc: { en: ['The motor is defective, so I would like a replacement or a full refund.'] } },
                        { en: 'Here is the receipt, and the box still has all the parts.', kn: 'ಇಗೋ ರಸೀದಿ, ಮತ್ತು ಡಬ್ಬಿಯಲ್ಲಿ ಎಲ್ಲಾ ಭಾಗಗಳು ಇನ್ನೂ ಇವೆ.', hi: 'यह रही रसीद, और डिब्बे में अब भी सारे पुर्ज़े हैं।' },
                        { read: true, en: 'It is still under warranty, so the repair should be free.', kn: 'ಇದಕ್ಕೆ ಇನ್ನೂ ಖಾತರಿ ಇದೆ, ಹಾಗಾಗಿ ರಿಪೇರಿ ಉಚಿತವಾಗಿರಬೇಕು.', hi: 'यह अभी भी वारंटी में है, इसलिए मरम्मत मुफ़्त होनी चाहिए।', acc: { en: ["It's still under warranty, so the repair should be free."] } },
                        { en: "I'm sorry, but a voucher isn't enough; I'd really prefer a refund.", kn: 'ಕ್ಷಮಿಸಿ, ವೋಚರ್ ಸಾಕಾಗುವುದಿಲ್ಲ; ನನಗೆ ಹಣವೇ ವಾಪಸ್ ಬೇಕು.', hi: 'माफ़ कीजिए, वाउचर से काम नहीं चलेगा; मुझे पैसे ही वापस चाहिए।' }
                    ]
                },
                {
                    kind: 'words', title: 'Customer care', list: [
                        { en: 'customer care', kn: 'ಗ್ರಾಹಕ ಸೇವೆ', hi: 'ग्राहक सेवा', pic: '🎧', def: "the team that answers customers' questions and solves their problems" },
                        { en: 'supervisor', kn: 'ಮೇಲ್ವಿಚಾರಕ', hi: 'सुपरवाइज़र', pic: '👔', def: 'a senior person who is in charge of other workers' },
                        { en: 'escalate', kn: 'ಮೇಲಧಿಕಾರಿಗಳಿಗೆ ತಲುಪಿಸು', hi: 'ऊपर तक ले जाना', pic: '⬆️', def: 'to pass a problem to a more senior person to solve' },
                        { en: 'compensation', kn: 'ಪರಿಹಾರ', hi: 'मुआवज़ा', pic: '💰', def: 'money paid to someone for a loss or trouble they suffered' },
                        { en: 'delivery', kn: 'ವಿತರಣೆ', hi: 'डिलीवरी', pic: '📦', def: "the act of bringing goods to a person's home or office" },
                        { en: 'inconvenience', kn: 'ಅನಾನುಕೂಲ', hi: 'असुविधा', pic: '😣', def: 'trouble or problems that make things harder for you' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Complaints and refunds 2', list: [
                        { read: true, en: "I've called customer care three times, and nobody has solved the problem.", kn: 'ನಾನು ಮೂರು ಬಾರಿ ಗ್ರಾಹಕ ಸೇವೆಗೆ ಕರೆ ಮಾಡಿದ್ದೇನೆ, ಆದರೆ ಯಾರೂ ಸಮಸ್ಯೆ ಬಗೆಹರಿಸಿಲ್ಲ.', hi: 'मैं तीन बार ग्राहक सेवा को फ़ोन कर चुका हूँ, और किसी ने समस्या हल नहीं की।', acc: { en: ['I have called customer care three times, and nobody has solved the problem.'], hi: ['मैं तीन बार ग्राहक सेवा को फ़ोन कर चुकी हूँ, और किसी ने समस्या हल नहीं की।'] } },
                        { read: true, en: 'Could I please speak to your supervisor about this?', kn: 'ಈ ವಿಷಯದ ಬಗ್ಗೆ ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮೇಲ್ವಿಚಾರಕರೊಂದಿಗೆ ಮಾತನಾಡಬಹುದೇ?', hi: 'क्या मैं इस बारे में आपके सुपरवाइज़र से बात कर सकता हूँ?', acc: { hi: ['क्या मैं इस बारे में आपके सुपरवाइज़र से बात कर सकती हूँ?'] } },
                        { en: "If it isn't fixed by Friday, I'll have to escalate my complaint.", kn: 'ಶುಕ್ರವಾರದೊಳಗೆ ಸರಿಯಾಗದಿದ್ದರೆ, ನನ್ನ ದೂರನ್ನು ಮೇಲಧಿಕಾರಿಗಳಿಗೆ ತಲುಪಿಸಬೇಕಾಗುತ್ತದೆ.', hi: 'अगर शुक्रवार तक ठीक नहीं हुआ, तो मुझे अपनी शिकायत ऊपर तक ले जानी पड़ेगी।', acc: { en: ['If it is not fixed by Friday, I will have to escalate my complaint.'] } },
                        { read: true, en: 'The delivery was ten days late, and the parcel was damaged.', kn: 'ವಿತರಣೆ ಹತ್ತು ದಿನ ತಡವಾಯಿತು, ಮತ್ತು ಪಾರ್ಸೆಲ್ ಹಾಳಾಗಿತ್ತು.', hi: 'डिलीवरी दस दिन देर से हुई, और पार्सल टूटा-फूटा था।' },
                        { en: 'We apologise for the inconvenience and will add two hundred rupees as compensation.', kn: 'ಅನಾನುಕೂಲಕ್ಕಾಗಿ ಕ್ಷಮೆ ಕೋರುತ್ತೇವೆ, ಪರಿಹಾರವಾಗಿ ಇನ್ನೂರು ರೂಪಾಯಿ ಸೇರಿಸುತ್ತೇವೆ.', hi: 'असुविधा के लिए हमें खेद है, मुआवज़े के तौर पर हम दो सौ रुपये जोड़ देंगे।', acc: { en: ['We apologize for the inconvenience and will add two hundred rupees as compensation.'] } }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'Polite but firm', kn: 'ವಿನಯದಿಂದ, ಆದರೆ ದೃಢವಾಗಿ', hi: 'विनम्र, लेकिन दृढ़' },
                    text: {
                        en: "Imran ordered an electric kettle online for his mother in Belagavi, but the delivery came a week late. When she switched it on, the kettle gave off a burning smell and stopped working. Imran called customer care, gave the order number and explained that the product was defective. The first agent offered only a voucher, so Imran politely asked to speak to a supervisor. He stayed calm but firm and said, 'I'm afraid a voucher isn't enough; the kettle is under warranty, and I have the receipt.' The supervisor apologised for the inconvenience and agreed to send a replacement within two days. She also added one hundred rupees to his account as compensation for the late delivery.",
                        kn: 'ಇಮ್ರಾನ್ ಬೆಳಗಾವಿಯಲ್ಲಿರುವ ತನ್ನ ತಾಯಿಗಾಗಿ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಒಂದು ಎಲೆಕ್ಟ್ರಿಕ್ ಕೆಟಲ್ ಆರ್ಡರ್ ಮಾಡಿದನು, ಆದರೆ ಅದರ ವಿತರಣೆ ಒಂದು ವಾರ ತಡವಾಯಿತು. ಅವರು ಅದನ್ನು ಆನ್ ಮಾಡಿದಾಗ ಸುಟ್ಟ ವಾಸನೆ ಬಂದು ಕೆಟಲ್ ನಿಂತುಹೋಯಿತು. ಇಮ್ರಾನ್ ಗ್ರಾಹಕ ಸೇವೆಗೆ ಕರೆ ಮಾಡಿ, ಆರ್ಡರ್ ಸಂಖ್ಯೆ ಕೊಟ್ಟು, ವಸ್ತು ದೋಷಪೂರಿತವಾಗಿದೆ ಎಂದು ವಿವರಿಸಿದನು. ಮೊದಲ ಸಿಬ್ಬಂದಿ ಕೇವಲ ಒಂದು ವೋಚರ್ ಕೊಡುವುದಾಗಿ ಹೇಳಿದಾಗ, ಇಮ್ರಾನ್ ವಿನಯದಿಂದ ಮೇಲ್ವಿಚಾರಕರೊಂದಿಗೆ ಮಾತನಾಡಲು ಕೇಳಿದನು. ಅವನು ಶಾಂತವಾಗಿ ಆದರೆ ದೃಢವಾಗಿ, "ಕ್ಷಮಿಸಿ, ವೋಚರ್ ಸಾಕಾಗುವುದಿಲ್ಲ; ಕೆಟಲ್‌ಗೆ ಖಾತರಿ ಇದೆ, ಮತ್ತು ನನ್ನ ಬಳಿ ರಸೀದಿ ಇದೆ" ಎಂದು ಹೇಳಿದನು. ಮೇಲ್ವಿಚಾರಕಿ ಅನಾನುಕೂಲಕ್ಕಾಗಿ ಕ್ಷಮೆ ಕೇಳಿ, ಎರಡು ದಿನಗಳಲ್ಲಿ ಬದಲಿ ಕೆಟಲ್ ಕಳುಹಿಸಲು ಒಪ್ಪಿದರು. ತಡವಾದ ವಿತರಣೆಗೆ ಪರಿಹಾರವಾಗಿ ಅವರು ಅವನ ಖಾತೆಗೆ ನೂರು ರೂಪಾಯಿಯನ್ನೂ ಸೇರಿಸಿದರು.',
                        hi: 'इमरान ने बेलगावी में रहने वाली अपनी माँ के लिए ऑनलाइन एक इलेक्ट्रिक केतली मँगवाई, लेकिन डिलीवरी एक हफ़्ता देर से हुई। जब माँ ने उसे चालू किया, तो जलने की गंध आई और केतली बंद हो गई। इमरान ने ग्राहक सेवा को फ़ोन किया, ऑर्डर नंबर बताया और समझाया कि सामान दोषपूर्ण है। पहले एजेंट ने सिर्फ़ एक वाउचर देने की बात कही, तो इमरान ने विनम्रता से सुपरवाइज़र से बात करने को कहा। वह शांत लेकिन दृढ़ रहा और बोला, "माफ़ कीजिए, वाउचर काफ़ी नहीं है; केतली वारंटी में है, और मेरे पास रसीद है।" सुपरवाइज़र ने असुविधा के लिए माफ़ी माँगी और दो दिन में रिप्लेसमेंट भेजने पर सहमति दी। उन्होंने देर से हुई डिलीवरी के मुआवज़े के तौर पर उसके खाते में सौ रुपये भी जोड़ दिए।'
                    },
                    questions: [
                        {
                            q: { en: 'What was wrong with the kettle?', kn: 'ಕೆಟಲ್‌ಗೆ ಏನಾಗಿತ್ತು?', hi: 'केतली में क्या ख़राबी थी?' },
                            options: [
                                { en: 'It gave off a burning smell and stopped working', kn: 'ಸುಟ್ಟ ವಾಸನೆ ಬಂದು ಅದು ನಿಂತುಹೋಯಿತು', hi: 'उससे जलने की गंध आई और वह बंद हो गई' },
                                { en: 'It was the wrong colour', kn: 'ಅದು ಬೇರೆ ಬಣ್ಣದ್ದಾಗಿತ್ತು', hi: 'उसका रंग ग़लत था' },
                                { en: 'It was smaller than in the photo', kn: 'ಅದು ಫೋಟೋದಲ್ಲಿದ್ದಕ್ಕಿಂತ ಚಿಕ್ಕದಾಗಿತ್ತು', hi: 'वह फ़ोटो से छोटी थी' },
                                { en: 'It came without a plug', kn: 'ಅದಕ್ಕೆ ಪ್ಲಗ್ ಇರಲಿಲ್ಲ', hi: 'उसके साथ प्लग नहीं था' }
                            ]
                        },
                        {
                            q: { en: 'Why did Imran ask for a supervisor?', kn: 'ಇಮ್ರಾನ್ ಮೇಲ್ವಿಚಾರಕರನ್ನು ಏಕೆ ಕೇಳಿದನು?', hi: 'इमरान ने सुपरवाइज़र से बात करने को क्यों कहा?' },
                            options: [
                                { en: 'The first agent offered only a voucher', kn: 'ಮೊದಲ ಸಿಬ್ಬಂದಿ ಕೇವಲ ವೋಚರ್ ಕೊಡುವುದಾಗಿ ಹೇಳಿದರು', hi: 'पहले एजेंट ने सिर्फ़ वाउचर की बात कही' },
                                { en: 'The agent was rude to him', kn: 'ಸಿಬ್ಬಂದಿ ಅವನೊಂದಿಗೆ ಒರಟಾಗಿ ಮಾತನಾಡಿದರು', hi: 'एजेंट ने उससे बदतमीज़ी की' },
                                { en: 'He wanted a job at the company', kn: 'ಅವನಿಗೆ ಆ ಕಂಪನಿಯಲ್ಲಿ ಕೆಲಸ ಬೇಕಿತ್ತು', hi: 'उसे उस कंपनी में नौकरी चाहिए थी' },
                                { en: 'The call kept getting cut', kn: 'ಕರೆ ಮತ್ತೆ ಮತ್ತೆ ಕಡಿತವಾಗುತ್ತಿತ್ತು', hi: 'फ़ोन बार-बार कट रहा था' }
                            ]
                        },
                        {
                            q: { en: 'What did the supervisor agree to do?', kn: 'ಮೇಲ್ವಿಚಾರಕಿ ಏನು ಮಾಡಲು ಒಪ್ಪಿದರು?', hi: 'सुपरवाइज़र ने क्या करने पर सहमति दी?' },
                            options: [
                                { en: 'Send a replacement within two days', kn: 'ಎರಡು ದಿನಗಳಲ್ಲಿ ಬದಲಿ ಕೆಟಲ್ ಕಳುಹಿಸಲು', hi: 'दो दिन में रिप्लेसमेंट भेजना' },
                                { en: 'Give a full refund at once', kn: 'ತಕ್ಷಣ ಪೂರ್ತಿ ಹಣ ವಾಪಸ್ ಕೊಡಲು', hi: 'तुरंत पूरे पैसे लौटाना' },
                                { en: 'Repair the kettle next month', kn: 'ಮುಂದಿನ ತಿಂಗಳು ಕೆಟಲ್ ರಿಪೇರಿ ಮಾಡಲು', hi: 'अगले महीने केतली ठीक करना' },
                                { en: 'Send a technician to his house', kn: 'ಅವನ ಮನೆಗೆ ತಂತ್ರಜ್ಞರನ್ನು ಕಳುಹಿಸಲು', hi: 'उसके घर तकनीशियन भेजना' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Calling customer care', kn: 'ಗ್ರಾಹಕ ಸೇವೆಗೆ ಕರೆ', hi: 'ग्राहक सेवा को फ़ोन' },
                    scenario: {
                        en: 'Deepa calls the customer care line of an online shop because she received the wrong kurta. Prakash answers the call.',
                        kn: 'ತಪ್ಪು ಕುರ್ತಾ ಬಂದಿದ್ದರಿಂದ ದೀಪಾ ಒಂದು ಆನ್‌ಲೈನ್ ಅಂಗಡಿಯ ಗ್ರಾಹಕ ಸೇವೆಗೆ ಕರೆ ಮಾಡುತ್ತಾಳೆ. ಪ್ರಕಾಶ್ ಕರೆ ಸ್ವೀಕರಿಸುತ್ತಾರೆ.',
                        hi: 'दीपा को ग़लत कुर्ता मिला है, इसलिए वह एक ऑनलाइन दुकान की ग्राहक सेवा को फ़ोन करती है। प्रकाश फ़ोन उठाते हैं।'
                    },
                    speakers: [{ name: 'Prakash', voice: 'm' }, { name: 'Deepa', voice: 'f' }],
                    lines: [
                        { speaker: 'Prakash', en: 'Thank you for calling ShopKart customer care. This is Prakash. How may I help you?', kn: 'ಶಾಪ್‌ಕಾರ್ಟ್ ಗ್ರಾಹಕ ಸೇವೆಗೆ ಕರೆ ಮಾಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ನಾನು ಪ್ರಕಾಶ್. ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?', hi: 'शॉपकार्ट ग्राहक सेवा में फ़ोन करने के लिए धन्यवाद। मैं प्रकाश बोल रहा हूँ। मैं आपकी कैसे मदद करूँ?' },
                        { speaker: 'Deepa', en: "Hello, Prakash. I'm calling about order number 4582. I received the wrong item yesterday.", kn: 'ನಮಸ್ಕಾರ, ಪ್ರಕಾಶ್. ಆರ್ಡರ್ ನಂಬರ್ 4582 ಬಗ್ಗೆ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ನಿನ್ನೆ ನನಗೆ ತಪ್ಪು ವಸ್ತು ಬಂದಿದೆ.', hi: 'नमस्ते, प्रकाश। मैं ऑर्डर नंबर 4582 के बारे में फ़ोन कर रही हूँ। कल मुझे ग़लत सामान मिला।' },
                        { speaker: 'Prakash', en: "I'm sorry to hear that. Could you tell me what you ordered and what you received?", kn: 'ಕೇಳಿ ಬೇಸರವಾಯಿತು. ನೀವು ಏನು ಆರ್ಡರ್ ಮಾಡಿದ್ದಿರಿ, ನಿಮಗೆ ಏನು ಬಂತು ಎಂದು ಹೇಳುತ್ತೀರಾ?', hi: 'यह सुनकर अफ़सोस हुआ। क्या आप बता सकती हैं कि आपने क्या मँगवाया था और आपको क्या मिला?' },
                        { speaker: 'Deepa', en: 'I ordered a blue cotton kurta in medium, but I got a red one in extra large.', kn: 'ನಾನು ಮೀಡಿಯಂ ಅಳತೆಯ ನೀಲಿ ಹತ್ತಿ ಕುರ್ತಾ ಆರ್ಡರ್ ಮಾಡಿದ್ದೆ, ಆದರೆ ಎಕ್ಸ್ಟ್ರಾ ಲಾರ್ಜ್ ಅಳತೆಯ ಕೆಂಪು ಕುರ್ತಾ ಬಂದಿದೆ.', hi: 'मैंने मीडियम साइज़ का नीला सूती कुर्ता मँगवाया था, लेकिन मुझे एक्स्ट्रा लार्ज साइज़ का लाल कुर्ता मिला।' },
                        { speaker: 'Prakash', en: 'I apologise for the inconvenience. Would you like a replacement or a refund?', kn: 'ಅನಾನುಕೂಲಕ್ಕಾಗಿ ಕ್ಷಮೆ ಕೋರುತ್ತೇನೆ. ನಿಮಗೆ ಬದಲಿ ಕುರ್ತಾ ಬೇಕೇ ಅಥವಾ ಹಣ ವಾಪಸ್ ಬೇಕೇ?', hi: 'असुविधा के लिए माफ़ी चाहता हूँ। आपको रिप्लेसमेंट चाहिए या पैसे वापस?' },
                        { speaker: 'Deepa', en: "I'd prefer a refund, please. I needed it for a wedding this Sunday, and a new one won't arrive in time.", kn: 'ದಯವಿಟ್ಟು ಹಣ ವಾಪಸ್ ಕೊಡಿ. ಈ ಭಾನುವಾರದ ಮದುವೆಗೆ ಅದು ಬೇಕಿತ್ತು, ಹೊಸದು ಸಮಯಕ್ಕೆ ಬರುವುದಿಲ್ಲ.', hi: 'मुझे पैसे वापस चाहिए, प्लीज़। मुझे इस रविवार की शादी के लिए चाहिए था, और नया समय पर नहीं पहुँचेगा।' },
                        { speaker: 'Prakash', en: 'Understood. Our delivery partner will pick up the parcel tomorrow between ten and two.', kn: 'ಅರ್ಥವಾಯಿತು. ನಮ್ಮ ವಿತರಣಾ ಸಿಬ್ಬಂದಿ ನಾಳೆ ಹತ್ತರಿಂದ ಎರಡು ಗಂಟೆಯೊಳಗೆ ಪಾರ್ಸೆಲ್ ತೆಗೆದುಕೊಂಡು ಹೋಗುತ್ತಾರೆ.', hi: 'समझ गया। हमारा डिलीवरी पार्टनर कल दस से दो बजे के बीच पार्सल ले जाएगा।' },
                        { speaker: 'Deepa', en: 'And how long will the refund take to reach my account?', kn: 'ಹಣ ನನ್ನ ಖಾತೆಗೆ ಬರಲು ಎಷ್ಟು ದಿನ ಬೇಕು?', hi: 'और पैसे मेरे खाते में आने में कितने दिन लगेंगे?' },
                        { speaker: 'Prakash', en: 'Once the parcel is picked up, the money will reach your account within five working days.', kn: 'ಪಾರ್ಸೆಲ್ ತೆಗೆದುಕೊಂಡು ಹೋದ ನಂತರ, ಐದು ಕೆಲಸದ ದಿನಗಳಲ್ಲಿ ಹಣ ನಿಮ್ಮ ಖಾತೆಗೆ ಬರುತ್ತದೆ.', hi: 'पार्सल उठ जाने के बाद पाँच कामकाजी दिनों में पैसे आपके खाते में आ जाएँगे।' },
                        { speaker: 'Deepa', en: "That's fine. Could you also send me the complaint number by SMS?", kn: 'ಸರಿ. ದೂರಿನ ಸಂಖ್ಯೆಯನ್ನು ಎಸ್‌ಎಂಎಸ್ ಮೂಲಕವೂ ಕಳುಹಿಸುತ್ತೀರಾ?', hi: 'ठीक है। क्या आप शिकायत नंबर मुझे एसएमएस से भी भेज देंगे?' }
                    ],
                    questions: [
                        {
                            q: { en: "What was wrong with Deepa's order?", kn: 'ದೀಪಾಳ ಆರ್ಡರ್‌ನಲ್ಲಿ ಏನು ತಪ್ಪಾಗಿತ್ತು?', hi: 'दीपा के ऑर्डर में क्या गड़बड़ थी?' },
                            options: [
                                { en: 'She got the wrong colour and size', kn: 'ಬೇರೆ ಬಣ್ಣ ಮತ್ತು ಅಳತೆಯ ಕುರ್ತಾ ಬಂದಿತ್ತು', hi: 'उसे ग़लत रंग और साइज़ मिला' },
                                { en: 'The parcel never arrived', kn: 'ಪಾರ್ಸೆಲ್ ಬರಲೇ ಇಲ್ಲ', hi: 'पार्सल पहुँचा ही नहीं' },
                                { en: 'The kurta was torn', kn: 'ಕುರ್ತಾ ಹರಿದಿತ್ತು', hi: 'कुर्ता फटा हुआ था' },
                                { en: 'She was charged twice', kn: 'ಅವಳಿಂದ ಎರಡು ಬಾರಿ ಹಣ ಕಡಿತವಾಗಿತ್ತು', hi: 'उससे दो बार पैसे कट गए थे' }
                            ]
                        },
                        {
                            q: { en: 'Why did Deepa choose a refund?', kn: 'ದೀಪಾ ಹಣ ವಾಪಸ್ ಏಕೆ ಆರಿಸಿಕೊಂಡಳು?', hi: 'दीपा ने पैसे वापस लेना क्यों चुना?' },
                            options: [
                                { en: 'A new kurta would not arrive before the wedding', kn: 'ಹೊಸ ಕುರ್ತಾ ಮದುವೆಗೆ ಮೊದಲು ಬರುವುದಿಲ್ಲ', hi: 'नया कुर्ता शादी से पहले नहीं आता' },
                                { en: 'She did not like the shop', kn: 'ಅವಳಿಗೆ ಆ ಅಂಗಡಿ ಇಷ್ಟವಿರಲಿಲ್ಲ', hi: 'उसे वह दुकान पसंद नहीं थी' },
                                { en: 'The replacement would cost more', kn: 'ಬದಲಿ ಕುರ್ತಾಗೆ ಹೆಚ್ಚು ಖರ್ಚಾಗುತ್ತಿತ್ತು', hi: 'रिप्लेसमेंट में ज़्यादा ख़र्च होता' },
                                { en: 'She had lost the receipt', kn: 'ಅವಳು ರಸೀದಿ ಕಳೆದುಕೊಂಡಿದ್ದಳು', hi: 'उसकी रसीद खो गई थी' }
                            ]
                        },
                        {
                            q: { en: 'When will the money reach her account?', kn: 'ಹಣ ಅವಳ ಖಾತೆಗೆ ಯಾವಾಗ ಬರುತ್ತದೆ?', hi: 'पैसे उसके खाते में कब आएँगे?' },
                            options: [
                                { en: 'Within five working days', kn: 'ಐದು ಕೆಲಸದ ದಿನಗಳಲ್ಲಿ', hi: 'पाँच कामकाजी दिनों में' },
                                { en: 'Tomorrow', kn: 'ನಾಳೆ', hi: 'कल' },
                                { en: 'After one month', kn: 'ಒಂದು ತಿಂಗಳ ನಂತರ', hi: 'एक महीने बाद' },
                                { en: 'This Sunday', kn: 'ಈ ಭಾನುವಾರ', hi: 'इस रविवार' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Call customer care about a broken mixer: say when you bought it, what is wrong, and ask for a repair or a refund. Stay polite but firm if they first say no.',
                        sample: "Good afternoon. I'm calling about a mixer grinder I bought from your Mangaluru showroom on the fifth of this month. My order number is 7319. After just one week, the motor started making a loud noise, and now it doesn't start at all. It's still under warranty, and I have the receipt. I'd like a replacement, or a full refund if that isn't possible. I understand these things happen, but I'm afraid a repair visit next month isn't acceptable, because we use the mixer every day. Could you please escalate this to your supervisor and send me a complaint number? Thank you.",
                        checklist: ['I greeted the person and said why I was calling', 'I said when and where I bought the product', 'I explained clearly what was wrong', 'I mentioned the warranty and the receipt', 'I asked for a replacement or a refund', 'I stayed polite but firm']
                    }
                }
            ]
        },
        '5:1': {
            name: 'Government offices',
            lessons: [
                {
                    kind: 'words', title: 'Papers and forms', list: [
                        { en: 'application form', kn: 'ಅರ್ಜಿ ನಮೂನೆ', hi: 'आवेदन पत्र', pic: '📝', def: 'a printed paper you fill in to ask for a service' },
                        { en: 'document', kn: 'ದಾಖಲೆ', hi: 'दस्तावेज़', pic: '📂', def: 'an official paper that gives information or proof' },
                        { en: 'certificate', kn: 'ಪ್ರಮಾಣಪತ್ರ', hi: 'प्रमाणपत्र', pic: '📜', def: 'an official paper that proves a fact, such as your birth or income' },
                        { en: 'photocopy', kn: 'ಜೆರಾಕ್ಸ್ ಪ್ರತಿ', hi: 'फ़ोटोकॉपी', pic: '📠', def: 'an exact paper copy of a page, made by a machine' },
                        { en: 'signature', kn: 'ಸಹಿ', hi: 'हस्ताक्षर', pic: '✍️', def: 'your name written in your own special way to show you agree' },
                        { en: 'proof of address', kn: 'ವಿಳಾಸದ ಪುರಾವೆ', hi: 'पते का प्रमाण', pic: '🏠', def: 'a document that shows where you live, like a gas or electricity bill' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Government offices 1', list: [
                        { read: true, en: 'Where can I get the application form for an income certificate?', kn: 'ಆದಾಯ ಪ್ರಮಾಣಪತ್ರಕ್ಕೆ ಅರ್ಜಿ ನಮೂನೆ ಎಲ್ಲಿ ಸಿಗುತ್ತದೆ?', hi: 'आय प्रमाणपत्र का आवेदन पत्र कहाँ मिलेगा?' },
                        { read: true, en: 'Please bring the original documents along with one photocopy of each.', kn: 'ದಯವಿಟ್ಟು ಮೂಲ ದಾಖಲೆಗಳ ಜೊತೆಗೆ ಪ್ರತಿಯೊಂದರ ಒಂದು ಜೆರಾಕ್ಸ್ ಪ್ರತಿಯನ್ನೂ ತನ್ನಿ.', hi: 'कृपया मूल दस्तावेज़ों के साथ हर एक की एक फ़ोटोकॉपी भी लाइए।' },
                        { en: 'You forgot to put your signature on the second page.', kn: 'ಎರಡನೇ ಪುಟದಲ್ಲಿ ನೀವು ಸಹಿ ಹಾಕಲು ಮರೆತಿದ್ದೀರಿ.', hi: 'आप दूसरे पन्ने पर हस्ताक्षर करना भूल गए हैं।' },
                        { read: true, en: 'Is an electricity bill enough as proof of address?', kn: 'ವಿಳಾಸದ ಪುರಾವೆಯಾಗಿ ವಿದ್ಯುತ್ ಬಿಲ್ ಸಾಕೇ?', hi: 'क्या पते के प्रमाण के लिए बिजली का बिल काफ़ी है?' },
                        { en: "My birth certificate has a spelling mistake in my father's name.", kn: 'ನನ್ನ ಜನನ ಪ್ರಮಾಣಪತ್ರದಲ್ಲಿ ನನ್ನ ತಂದೆಯ ಹೆಸರಿನ ಕಾಗುಣಿತ ತಪ್ಪಾಗಿದೆ.', hi: 'मेरे जन्म प्रमाणपत्र में मेरे पिता के नाम की स्पेलिंग ग़लत है।' }
                    ]
                },
                {
                    kind: 'words', title: 'At the counter', list: [
                        { en: 'queue', kn: 'ಸರತಿ ಸಾಲು', hi: 'कतार', pic: '🧍', def: 'a line of people waiting for their turn' },
                        { en: 'token', kn: 'ಟೋಕನ್', hi: 'टोकन', pic: '🎫', def: 'a small slip with a number that shows when it is your turn' },
                        { en: 'official', kn: 'ಅಧಿಕಾರಿ', hi: 'अधिकारी', pic: '🧑‍💼', def: 'a person who works in a government office and has authority' },
                        { en: 'verification', kn: 'ಪರಿಶೀಲನೆ', hi: 'सत्यापन', pic: '✅', def: 'the process of checking that information is true' },
                        { en: 'fingerprint', kn: 'ಬೆರಳಚ್ಚು', hi: 'उँगली का निशान', pic: '👆', def: 'the special pattern of lines on the tip of your finger' },
                        { en: 'acknowledgement', kn: 'ಸ್ವೀಕೃತಿ', hi: 'पावती', pic: '📨', def: 'a slip that shows your application has been received' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Government offices 2', list: [
                        { read: true, en: 'Please take a token and wait until your number is called.', kn: 'ದಯವಿಟ್ಟು ಒಂದು ಟೋಕನ್ ತೆಗೆದುಕೊಂಡು ನಿಮ್ಮ ಸಂಖ್ಯೆ ಕರೆಯುವವರೆಗೆ ಕಾಯಿರಿ.', hi: 'कृपया टोकन लीजिए और अपना नंबर पुकारे जाने तक इंतज़ार कीजिए।' },
                        { read: true, en: 'Excuse me, is this the right queue for Aadhaar updates?', kn: 'ಕ್ಷಮಿಸಿ, ಆಧಾರ್ ತಿದ್ದುಪಡಿಗೆ ಇದೇ ಸರಿಯಾದ ಸರತಿ ಸಾಲೇ?', hi: 'माफ़ कीजिए, क्या आधार अपडेट के लिए यही सही कतार है?' },
                        { en: 'The official said my fingerprints must be scanned again.', kn: 'ನನ್ನ ಬೆರಳಚ್ಚುಗಳನ್ನು ಮತ್ತೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಬೇಕು ಎಂದು ಅಧಿಕಾರಿ ಹೇಳಿದರು.', hi: 'अधिकारी ने कहा कि मेरी उँगलियों के निशान दोबारा स्कैन करने होंगे।' },
                        { en: 'Police verification for your passport usually takes about two weeks.', kn: 'ನಿಮ್ಮ ಪಾಸ್‌ಪೋರ್ಟ್‌ಗೆ ಪೊಲೀಸ್ ಪರಿಶೀಲನೆ ಸಾಮಾನ್ಯವಾಗಿ ಸುಮಾರು ಎರಡು ವಾರ ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ.', hi: 'आपके पासपोर्ट के लिए पुलिस सत्यापन में आमतौर पर लगभग दो हफ़्ते लगते हैं।' },
                        { read: true, en: "Keep this acknowledgement safe; you'll need it to track your application.", kn: 'ಈ ಸ್ವೀಕೃತಿಯನ್ನು ಜೋಪಾನವಾಗಿಡಿ; ನಿಮ್ಮ ಅರ್ಜಿಯ ಸ್ಥಿತಿ ತಿಳಿಯಲು ಇದು ಬೇಕಾಗುತ್ತದೆ.', hi: 'यह पावती संभालकर रखिए; अपने आवेदन की स्थिति जानने के लिए इसकी ज़रूरत पड़ेगी।', acc: { en: ['Keep this acknowledgement safe; you will need it to track your application.'] } }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A morning at the Aadhaar centre', kn: 'ಆಧಾರ್ ಕೇಂದ್ರದಲ್ಲಿ ಒಂದು ಬೆಳಿಗ್ಗೆ', hi: 'आधार केंद्र में एक सुबह' },
                    text: {
                        en: 'Lakshmi had moved from Shivamogga to Pune for work, so she needed to change the address on her Aadhaar card. She reached the Aadhaar centre at eight in the morning, but the queue was already long. A guard gave her a token with the number forty-two and an application form to fill in. When her turn came, the official checked her documents and asked for a photocopy of her electricity bill as proof of address. Luckily, Lakshmi had brought two copies, and she had already put her signature on each page. The official then scanned her fingerprints for verification and printed an acknowledgement slip. He told her the new address would be updated within ten days, and Lakshmi left the office before noon, feeling relieved.',
                        kn: 'ಲಕ್ಷ್ಮಿ ಕೆಲಸಕ್ಕಾಗಿ ಶಿವಮೊಗ್ಗದಿಂದ ಪುಣೆಗೆ ಹೋಗಿದ್ದಳು, ಹಾಗಾಗಿ ತನ್ನ ಆಧಾರ್ ಕಾರ್ಡ್‌ನಲ್ಲಿರುವ ವಿಳಾಸವನ್ನು ಬದಲಾಯಿಸಬೇಕಿತ್ತು. ಅವಳು ಬೆಳಿಗ್ಗೆ ಎಂಟು ಗಂಟೆಗೆ ಆಧಾರ್ ಕೇಂದ್ರ ತಲುಪಿದಳು, ಆದರೆ ಆಗಲೇ ಸರತಿ ಸಾಲು ಉದ್ದವಾಗಿತ್ತು. ಒಬ್ಬ ಕಾವಲುಗಾರ ಅವಳಿಗೆ ನಲವತ್ತೆರಡನೇ ಸಂಖ್ಯೆಯ ಟೋಕನ್ ಮತ್ತು ತುಂಬಲು ಒಂದು ಅರ್ಜಿ ನಮೂನೆ ಕೊಟ್ಟನು. ಅವಳ ಸರದಿ ಬಂದಾಗ, ಅಧಿಕಾರಿ ಅವಳ ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ವಿಳಾಸದ ಪುರಾವೆಯಾಗಿ ವಿದ್ಯುತ್ ಬಿಲ್‌ನ ಜೆರಾಕ್ಸ್ ಪ್ರತಿ ಕೇಳಿದರು. ಅದೃಷ್ಟವಶಾತ್ ಲಕ್ಷ್ಮಿ ಎರಡು ಪ್ರತಿಗಳನ್ನು ತಂದಿದ್ದಳು, ಮತ್ತು ಪ್ರತಿ ಪುಟದ ಮೇಲೂ ಮೊದಲೇ ಸಹಿ ಹಾಕಿದ್ದಳು. ನಂತರ ಅಧಿಕಾರಿ ಪರಿಶೀಲನೆಗಾಗಿ ಅವಳ ಬೆರಳಚ್ಚುಗಳನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ, ಒಂದು ಸ್ವೀಕೃತಿ ಚೀಟಿಯನ್ನು ಮುದ್ರಿಸಿದರು. ಹತ್ತು ದಿನಗಳಲ್ಲಿ ಹೊಸ ವಿಳಾಸ ನವೀಕರಣವಾಗುತ್ತದೆ ಎಂದು ಅವರು ಹೇಳಿದರು, ಮತ್ತು ಲಕ್ಷ್ಮಿ ನಿರಾಳವಾಗಿ ಮಧ್ಯಾಹ್ನಕ್ಕೆ ಮೊದಲೇ ಕಚೇರಿಯಿಂದ ಹೊರಬಂದಳು.',
                        hi: 'लक्ष्मी नौकरी के लिए शिवमोग्गा से पुणे आ गई थी, इसलिए उसे अपने आधार कार्ड पर पता बदलवाना था। वह सुबह आठ बजे आधार केंद्र पहुँची, लेकिन कतार पहले से ही लंबी थी। एक गार्ड ने उसे बयालीस नंबर का टोकन और भरने के लिए एक आवेदन पत्र दिया। जब उसकी बारी आई, तो अधिकारी ने उसके दस्तावेज़ जाँचे और पते के प्रमाण के लिए बिजली के बिल की फ़ोटोकॉपी माँगी। ख़ुशक़िस्मती से लक्ष्मी दो कॉपियाँ लाई थी, और उसने हर पन्ने पर पहले से हस्ताक्षर कर दिए थे। फिर अधिकारी ने सत्यापन के लिए उसकी उँगलियों के निशान स्कैन किए और एक पावती पर्ची छापी। उन्होंने बताया कि नया पता दस दिन में अपडेट हो जाएगा, और लक्ष्मी राहत महसूस करते हुए दोपहर से पहले ही दफ़्तर से निकल गई।'
                    },
                    questions: [
                        {
                            q: { en: 'Why did Lakshmi go to the Aadhaar centre?', kn: 'ಲಕ್ಷ್ಮಿ ಆಧಾರ್ ಕೇಂದ್ರಕ್ಕೆ ಏಕೆ ಹೋದಳು?', hi: 'लक्ष्मी आधार केंद्र क्यों गई?' },
                            options: [
                                { en: 'To change her address', kn: 'ತನ್ನ ವಿಳಾಸ ಬದಲಾಯಿಸಲು', hi: 'अपना पता बदलवाने' },
                                { en: 'To get a passport', kn: 'ಪಾಸ್‌ಪೋರ್ಟ್ ಪಡೆಯಲು', hi: 'पासपोर्ट बनवाने' },
                                { en: 'To pay a fine', kn: 'ದಂಡ ಕಟ್ಟಲು', hi: 'जुर्माना भरने' },
                                { en: 'To apply for a job', kn: 'ಕೆಲಸಕ್ಕೆ ಅರ್ಜಿ ಹಾಕಲು', hi: 'नौकरी के लिए आवेदन करने' }
                            ]
                        },
                        {
                            q: { en: 'What did the official ask for as proof of address?', kn: 'ವಿಳಾಸದ ಪುರಾವೆಯಾಗಿ ಅಧಿಕಾರಿ ಏನು ಕೇಳಿದರು?', hi: 'अधिकारी ने पते के प्रमाण के लिए क्या माँगा?' },
                            options: [
                                { en: 'A photocopy of her electricity bill', kn: 'ವಿದ್ಯುತ್ ಬಿಲ್‌ನ ಜೆರಾಕ್ಸ್ ಪ್ರತಿ', hi: 'बिजली के बिल की फ़ोटोकॉपी' },
                                { en: 'Her college certificate', kn: 'ಅವಳ ಕಾಲೇಜು ಪ್ರಮಾಣಪತ್ರ', hi: 'उसका कॉलेज प्रमाणपत्र' },
                                { en: 'A letter from her manager', kn: 'ಅವಳ ಮ್ಯಾನೇಜರ್‌ನಿಂದ ಒಂದು ಪತ್ರ', hi: 'उसके मैनेजर का एक पत्र' },
                                { en: 'Her bank passbook', kn: 'ಅವಳ ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್', hi: 'उसकी बैंक पासबुक' }
                            ]
                        },
                        {
                            q: { en: 'How long will the update take?', kn: 'ನವೀಕರಣಕ್ಕೆ ಎಷ್ಟು ಸಮಯ ಬೇಕು?', hi: 'अपडेट होने में कितना समय लगेगा?' },
                            options: [
                                { en: 'Up to ten days', kn: 'ಹತ್ತು ದಿನಗಳವರೆಗೆ', hi: 'दस दिन तक' },
                                { en: 'Two months', kn: 'ಎರಡು ತಿಂಗಳು', hi: 'दो महीने' },
                                { en: 'One day', kn: 'ಒಂದು ದಿನ', hi: 'एक दिन' },
                                { en: 'Six weeks', kn: 'ಆರು ವಾರ', hi: 'छह हफ़्ते' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'At the passport office', kn: 'ಪಾಸ್‌ಪೋರ್ಟ್ ಕಚೇರಿಯಲ್ಲಿ', hi: 'पासपोर्ट दफ़्तर में' },
                    scenario: {
                        en: 'Vikram is at the Passport Seva Kendra in Hubballi, where Shalini, an official at the counter, checks his documents.',
                        kn: 'ವಿಕ್ರಮ್ ಹುಬ್ಬಳ್ಳಿಯ ಪಾಸ್‌ಪೋರ್ಟ್ ಸೇವಾ ಕೇಂದ್ರದಲ್ಲಿದ್ದಾನೆ; ಕೌಂಟರ್‌ನಲ್ಲಿರುವ ಅಧಿಕಾರಿ ಶಾಲಿನಿ ಅವನ ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತಾರೆ.',
                        hi: 'विक्रम हुब्बल्ली के पासपोर्ट सेवा केंद्र में है, जहाँ काउंटर पर बैठी अधिकारी शालिनी उसके दस्तावेज़ जाँचती हैं।'
                    },
                    speakers: [{ name: 'Shalini', voice: 'f' }, { name: 'Vikram', voice: 'm' }],
                    lines: [
                        { speaker: 'Shalini', en: 'Good morning. May I have your token slip and your appointment printout, please?', kn: 'ಶುಭೋದಯ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಟೋಕನ್ ಚೀಟಿ ಮತ್ತು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಪ್ರಿಂಟ್‌ಔಟ್ ಕೊಡುತ್ತೀರಾ?', hi: 'सुप्रभात। कृपया अपनी टोकन पर्ची और अपॉइंटमेंट का प्रिंटआउट दीजिए।' },
                        { speaker: 'Vikram', en: 'Good morning, madam. Here they are. This is my first passport application.', kn: 'ಶುಭೋದಯ, ಮೇಡಂ. ಇಗೋ ತೆಗೆದುಕೊಳ್ಳಿ. ಇದು ನನ್ನ ಮೊದಲ ಪಾಸ್‌ಪೋರ್ಟ್ ಅರ್ಜಿ.', hi: 'सुप्रभात, मैडम। ये लीजिए। यह मेरा पहला पासपोर्ट आवेदन है।' },
                        { speaker: 'Shalini', en: 'Thank you. I need your Aadhaar card and one more proof of address. What have you brought?', kn: 'ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಆಧಾರ್ ಕಾರ್ಡ್ ಮತ್ತು ಇನ್ನೊಂದು ವಿಳಾಸದ ಪುರಾವೆ ಬೇಕು. ಏನೇನು ತಂದಿದ್ದೀರಿ?', hi: 'धन्यवाद। मुझे आपका आधार कार्ड और पते का एक और प्रमाण चाहिए। आप क्या-क्या लाए हैं?' },
                        { speaker: 'Vikram', en: 'I have my Aadhaar card, my tenth-class certificate for my date of birth, and a recent gas bill.', kn: 'ನನ್ನ ಆಧಾರ್ ಕಾರ್ಡ್, ಜನ್ಮ ದಿನಾಂಕಕ್ಕಾಗಿ ಹತ್ತನೇ ತರಗತಿಯ ಪ್ರಮಾಣಪತ್ರ, ಮತ್ತು ಇತ್ತೀಚಿನ ಗ್ಯಾಸ್ ಬಿಲ್ ತಂದಿದ್ದೇನೆ.', hi: 'मेरे पास आधार कार्ड, जन्मतिथि के लिए दसवीं का प्रमाणपत्र, और हाल का गैस बिल है।' },
                        { speaker: 'Shalini', en: "The gas bill is in your father's name. Do you have anything in your own name?", kn: 'ಗ್ಯಾಸ್ ಬಿಲ್ ನಿಮ್ಮ ತಂದೆಯ ಹೆಸರಿನಲ್ಲಿದೆ. ನಿಮ್ಮ ಸ್ವಂತ ಹೆಸರಿನಲ್ಲಿ ಏನಾದರೂ ಇದೆಯೇ?', hi: 'गैस बिल आपके पिताजी के नाम पर है। क्या आपके अपने नाम पर कुछ है?' },
                        { speaker: 'Vikram', en: "I'm afraid not, but I've brought a photocopy of my bank passbook with my address. Will that do?", kn: 'ಇಲ್ಲ, ಆದರೆ ನನ್ನ ವಿಳಾಸ ಇರುವ ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್‌ನ ಜೆರಾಕ್ಸ್ ಪ್ರತಿ ತಂದಿದ್ದೇನೆ. ಅದು ಸಾಕೇ?', hi: 'जी नहीं, लेकिन मैं अपने पते वाली बैंक पासबुक की फ़ोटोकॉपी लाया हूँ। क्या उससे काम चलेगा?' },
                        { speaker: 'Shalini', en: 'Yes, that is fine. Please sign here, and then go to counter B for your photo and fingerprints.', kn: 'ಹೌದು, ಅದು ಸಾಕು. ದಯವಿಟ್ಟು ಇಲ್ಲಿ ಸಹಿ ಮಾಡಿ, ನಂತರ ಫೋಟೋ ಮತ್ತು ಬೆರಳಚ್ಚಿಗಾಗಿ ಕೌಂಟರ್ ಬಿ ಗೆ ಹೋಗಿ.', hi: 'हाँ, चल जाएगा। कृपया यहाँ हस्ताक्षर कीजिए, फिर फ़ोटो और उँगलियों के निशान के लिए काउंटर बी पर जाइए।' },
                        { speaker: 'Vikram', en: 'Sure. How long will the police verification take after this?', kn: 'ಸರಿ. ಇದಾದ ನಂತರ ಪೊಲೀಸ್ ಪರಿಶೀಲನೆಗೆ ಎಷ್ಟು ಸಮಯ ಬೇಕಾಗುತ್ತದೆ?', hi: 'ज़रूर। इसके बाद पुलिस सत्यापन में कितना समय लगेगा?' },
                        { speaker: 'Shalini', en: "Usually two to three weeks. You'll get an SMS when the police are ready to visit you.", kn: 'ಸಾಮಾನ್ಯವಾಗಿ ಎರಡರಿಂದ ಮೂರು ವಾರ. ಪೊಲೀಸರು ನಿಮ್ಮನ್ನು ಭೇಟಿ ಮಾಡುವ ಮೊದಲು ನಿಮಗೆ ಎಸ್‌ಎಂಎಸ್ ಬರುತ್ತದೆ.', hi: 'आमतौर पर दो से तीन हफ़्ते। जब पुलिस आपसे मिलने आने वाली होगी, तब आपको एसएमएस आएगा।' },
                        { speaker: 'Vikram', en: 'Thank you very much for your help, madam.', kn: 'ನಿಮ್ಮ ಸಹಾಯಕ್ಕೆ ತುಂಬಾ ಧನ್ಯವಾದಗಳು, ಮೇಡಂ.', hi: 'आपकी मदद के लिए बहुत-बहुत धन्यवाद, मैडम।' }
                    ],
                    questions: [
                        {
                            q: { en: 'Why could Vikram not use the gas bill?', kn: 'ವಿಕ್ರಮ್ ಗ್ಯಾಸ್ ಬಿಲ್ ಅನ್ನು ಏಕೆ ಬಳಸಲು ಆಗಲಿಲ್ಲ?', hi: 'विक्रम गैस बिल का इस्तेमाल क्यों नहीं कर सका?' },
                            options: [
                                { en: "It was in his father's name", kn: 'ಅದು ಅವನ ತಂದೆಯ ಹೆಸರಿನಲ್ಲಿತ್ತು', hi: 'वह उसके पिताजी के नाम पर था' },
                                { en: 'It was too old', kn: 'ಅದು ತುಂಬಾ ಹಳೆಯದಾಗಿತ್ತು', hi: 'वह बहुत पुराना था' },
                                { en: 'It was torn', kn: 'ಅದು ಹರಿದಿತ್ತು', hi: 'वह फटा हुआ था' },
                                { en: 'It was not signed', kn: 'ಅದಕ್ಕೆ ಸಹಿ ಇರಲಿಲ್ಲ', hi: 'उस पर हस्ताक्षर नहीं थे' }
                            ]
                        },
                        {
                            q: { en: 'Where must Vikram go after signing?', kn: 'ಸಹಿ ಮಾಡಿದ ನಂತರ ವಿಕ್ರಮ್ ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು?', hi: 'हस्ताक्षर के बाद विक्रम को कहाँ जाना है?' },
                            options: [
                                { en: 'To counter B for his photo and fingerprints', kn: 'ಫೋಟೋ ಮತ್ತು ಬೆರಳಚ್ಚಿಗಾಗಿ ಕೌಂಟರ್ ಬಿ ಗೆ', hi: 'फ़ोटो और उँगलियों के निशान के लिए काउंटर बी पर' },
                                { en: 'To the police station', kn: 'ಪೊಲೀಸ್ ಠಾಣೆಗೆ', hi: 'पुलिस थाने' },
                                { en: 'To the bank', kn: 'ಬ್ಯಾಂಕಿಗೆ', hi: 'बैंक' },
                                { en: 'Back home to get more documents', kn: 'ಇನ್ನಷ್ಟು ದಾಖಲೆಗಳನ್ನು ತರಲು ಮನೆಗೆ', hi: 'और दस्तावेज़ लाने के लिए घर वापस' }
                            ]
                        },
                        {
                            q: { en: 'How will Vikram know about the police visit?', kn: 'ಪೊಲೀಸರ ಭೇಟಿಯ ಬಗ್ಗೆ ವಿಕ್ರಮ್‌ಗೆ ಹೇಗೆ ತಿಳಿಯುತ್ತದೆ?', hi: 'विक्रम को पुलिस के आने का कैसे पता चलेगा?' },
                            options: [
                                { en: 'He will get an SMS', kn: 'ಅವನಿಗೆ ಎಸ್‌ಎಂಎಸ್ ಬರುತ್ತದೆ', hi: 'उसे एसएमएस आएगा' },
                                { en: 'Shalini will call him', kn: 'ಶಾಲಿನಿ ಅವನಿಗೆ ಕರೆ ಮಾಡುತ್ತಾರೆ', hi: 'शालिनी उसे फ़ोन करेंगी' },
                                { en: 'He will receive a letter', kn: 'ಅವನಿಗೆ ಒಂದು ಪತ್ರ ಬರುತ್ತದೆ', hi: 'उसे एक चिट्ठी मिलेगी' },
                                { en: 'He must ask at the office every day', kn: 'ಅವನು ಪ್ರತಿದಿನ ಕಚೇರಿಯಲ್ಲಿ ಕೇಳಬೇಕು', hi: 'उसे रोज़ दफ़्तर में पूछना होगा' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'You are at a government office to apply for a certificate (for example, an income or a birth certificate). Speak to the official: say what you need, list the documents you have brought, ask what is missing, and ask how long it will take.',
                        sample: "Good morning, sir. I'd like to apply for an income certificate for my college scholarship. I've filled in the application form, and I've brought my Aadhaar card, our ration card and a salary slip from my father's employer, with one photocopy of each. I've also signed every page. Could you please check whether anything is missing? If I need a different proof of address, I can bring it tomorrow. And how long does the verification usually take? The scholarship deadline is at the end of this month, so I'd be grateful if you could tell me how to track my application. Thank you.",
                        checklist: ['I greeted the official politely', 'I said which certificate I needed and why', 'I listed the documents I had brought', 'I asked if anything was missing', 'I asked how long it would take', 'I thanked the official']
                    }
                }
            ]
        },
        '6:1': {
            name: 'Renting a home',
            lessons: [
                {
                    kind: 'words', title: 'Finding a flat', list: [
                        { en: 'landlord', kn: 'ಮನೆ ಮಾಲೀಕ', hi: 'मकान मालिक', pic: '🔑', def: 'a person who owns a house and rents it out to others' },
                        { en: 'tenant', kn: 'ಬಾಡಿಗೆದಾರ', hi: 'किरायेदार', pic: '🧳', def: 'a person who pays rent to live in a house or a flat' },
                        { en: 'rent', kn: 'ಬಾಡಿಗೆ', hi: 'किराया', pic: '💵', def: "money you pay every month to live in someone else's house" },
                        { en: 'deposit', kn: 'ಮುಂಗಡ ಹಣ', hi: 'जमा राशि', pic: '🏦', def: 'money paid at the start that is returned when you leave' },
                        { en: 'broker', kn: 'ದಲ್ಲಾಳಿ', hi: 'प्रॉपर्टी डीलर', pic: '🤝', def: 'a person who helps you find a house and takes a fee for it' },
                        { en: 'furnished', kn: 'ಪೀಠೋಪಕರಣ ಸಹಿತ', hi: 'फ़र्नीचर सहित', pic: '🛋️', def: 'having furniture already in it when you rent it' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Renting a home 1', list: [
                        { read: true, en: "Bengaluru landlords often ask for ten months' rent as a deposit.", kn: 'ಬೆಂಗಳೂರಿನ ಮನೆ ಮಾಲೀಕರು ಹೆಚ್ಚಾಗಿ ಹತ್ತು ತಿಂಗಳ ಬಾಡಿಗೆಯನ್ನು ಮುಂಗಡ ಹಣವಾಗಿ ಕೇಳುತ್ತಾರೆ.', hi: 'बेंगलुरु में मकान मालिक अक्सर दस महीने का किराया जमा राशि के रूप में माँगते हैं।' },
                        { read: true, en: 'Is the rent negotiable, or is this the final amount?', kn: 'ಬಾಡಿಗೆಯಲ್ಲಿ ಸ್ವಲ್ಪ ಕಡಿಮೆ ಮಾಡಬಹುದೇ, ಅಥವಾ ಇದೇ ಅಂತಿಮ ಮೊತ್ತವೇ?', hi: 'क्या किराया थोड़ा कम हो सकता है, या यही आख़िरी रकम है?' },
                        { en: "The broker charges one month's rent as his fee.", kn: 'ದಲ್ಲಾಳಿ ತನ್ನ ಶುಲ್ಕವಾಗಿ ಒಂದು ತಿಂಗಳ ಬಾಡಿಗೆ ತೆಗೆದುಕೊಳ್ಳುತ್ತಾನೆ.', hi: 'प्रॉपर्टी डीलर अपनी फ़ीस के तौर पर एक महीने का किराया लेता है।' },
                        { en: 'We are looking for a fully furnished flat close to the metro station.', kn: 'ನಾವು ಮೆಟ್ರೋ ನಿಲ್ದಾಣದ ಹತ್ತಿರ ಪೂರ್ತಿ ಪೀಠೋಪಕರಣ ಸಹಿತ ಫ್ಲಾಟ್ ಹುಡುಕುತ್ತಿದ್ದೇವೆ.', hi: 'हम मेट्रो स्टेशन के पास पूरी तरह फ़र्नीचर सहित एक फ़्लैट ढूँढ रहे हैं।', acc: { en: ["We're looking for a fully furnished flat close to the metro station."] } },
                        { read: true, en: 'As a tenant, you have the right to a receipt for every payment.', kn: 'ಬಾಡಿಗೆದಾರರಾಗಿ, ಪ್ರತಿ ಪಾವತಿಗೂ ರಸೀದಿ ಪಡೆಯುವ ಹಕ್ಕು ನಿಮಗಿದೆ.', hi: 'किरायेदार होने के नाते हर भुगतान की रसीद पाना आपका हक़ है।' }
                    ]
                },
                {
                    kind: 'words', title: 'Living there', list: [
                        { en: 'rental agreement', kn: 'ಬಾಡಿಗೆ ಕರಾರು', hi: 'किरायानामा', pic: '📃', def: 'a written contract between the landlord and the tenant' },
                        { en: 'maintenance', kn: 'ನಿರ್ವಹಣೆ', hi: 'रखरखाव', pic: '🧹', def: 'the work and cost of keeping a building clean and in good condition' },
                        { en: 'neighbour', kn: 'ನೆರೆಹೊರೆಯವರು', hi: 'पड़ोसी', pic: '🏘️', def: 'a person who lives next to you or near you' },
                        { en: 'notice period', kn: 'ಮುನ್ಸೂಚನೆ ಅವಧಿ', hi: 'नोटिस अवधि', pic: '📆', def: 'the time by which you must warn the other side before leaving' },
                        { en: 'vacate', kn: 'ಖಾಲಿ ಮಾಡು', hi: 'ख़ाली करना', pic: '🚪', def: 'to leave a house or a room so that someone else can use it' },
                        { en: 'electricity meter', kn: 'ವಿದ್ಯುತ್ ಮೀಟರ್', hi: 'बिजली का मीटर', pic: '📟', def: 'a machine that measures how much electricity a home uses' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Renting a home 2', list: [
                        { read: true, en: 'Please read the rental agreement carefully before you sign it.', kn: 'ಬಾಡಿಗೆ ಕರಾರಿಗೆ ಸಹಿ ಹಾಕುವ ಮೊದಲು ಅದನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಓದಿ.', hi: 'किरायानामे पर हस्ताक्षर करने से पहले उसे ध्यान से पढ़िए।' },
                        { read: true, en: 'Is the monthly maintenance included in the rent, or is it extra?', kn: 'ತಿಂಗಳ ನಿರ್ವಹಣೆ ಶುಲ್ಕ ಬಾಡಿಗೆಯಲ್ಲೇ ಸೇರಿದೆಯೇ, ಅಥವಾ ಬೇರೆಯಾಗಿ ಕೊಡಬೇಕೇ?', hi: 'क्या हर महीने का रखरखाव शुल्क किराये में शामिल है, या अलग से देना होगा?' },
                        { en: 'Our neighbours are friendly, but they play loud music late at night.', kn: 'ನಮ್ಮ ನೆರೆಹೊರೆಯವರು ಸ್ನೇಹಪರರು, ಆದರೆ ತಡರಾತ್ರಿ ಜೋರಾಗಿ ಹಾಡು ಹಾಕುತ್ತಾರೆ.', hi: 'हमारे पड़ोसी मिलनसार हैं, लेकिन देर रात तक तेज़ गाने बजाते हैं।' },
                        { read: true, en: 'The notice period is two months, so we must tell the landlord by July.', kn: 'ಮುನ್ಸೂಚನೆ ಅವಧಿ ಎರಡು ತಿಂಗಳು, ಹಾಗಾಗಿ ಜುಲೈ ಒಳಗೆ ಮನೆ ಮಾಲೀಕರಿಗೆ ತಿಳಿಸಬೇಕು.', hi: 'नोटिस अवधि दो महीने की है, इसलिए हमें जुलाई तक मकान मालिक को बताना होगा।' },
                        { en: "When we vacate the flat, we'll note down the reading on the electricity meter.", kn: 'ಫ್ಲಾಟ್ ಖಾಲಿ ಮಾಡುವಾಗ ವಿದ್ಯುತ್ ಮೀಟರ್‌ನ ರೀಡಿಂಗ್ ಬರೆದುಕೊಳ್ಳುತ್ತೇವೆ.', hi: 'फ़्लैट ख़ाली करते समय हम बिजली के मीटर की रीडिंग लिख लेंगे।', acc: { en: ['When we vacate the flat, we will note down the reading on the electricity meter.'] } }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A new flat in Mysuru', kn: 'ಮೈಸೂರಿನಲ್ಲಿ ಹೊಸ ಫ್ಲಾಟ್', hi: 'मैसूरु में नया फ़्लैट' },
                    text: {
                        en: 'After getting a job in Mysuru, Anitha started looking for a small flat near Kuvempunagar. A broker showed her four places, and she liked a furnished one-bedroom flat on the second floor. The landlord, Mr Gowda, asked for twelve thousand rupees a month as rent and a deposit of sixty thousand. Anitha politely asked whether the deposit could be a little lower, and they finally agreed on fifty thousand. Before signing the rental agreement, she checked the notice period and asked who would pay the monthly maintenance. She also took a photo of the electricity meter, so that there would be no confusion about the bills later. On her first evening, a friendly neighbour brought her a plate of hot bisi bele bath.',
                        kn: 'ಮೈಸೂರಿನಲ್ಲಿ ಕೆಲಸ ಸಿಕ್ಕ ನಂತರ ಅನಿತಾ ಕುವೆಂಪುನಗರದ ಹತ್ತಿರ ಒಂದು ಚಿಕ್ಕ ಫ್ಲಾಟ್ ಹುಡುಕತೊಡಗಿದಳು. ಒಬ್ಬ ದಲ್ಲಾಳಿ ಅವಳಿಗೆ ನಾಲ್ಕು ಮನೆಗಳನ್ನು ತೋರಿಸಿದನು, ಮತ್ತು ಎರಡನೇ ಮಹಡಿಯಲ್ಲಿರುವ ಪೀಠೋಪಕರಣ ಸಹಿತ ಒಂದು ಬೆಡ್‌ರೂಮ್ ಫ್ಲಾಟ್ ಅವಳಿಗೆ ಇಷ್ಟವಾಯಿತು. ಮನೆ ಮಾಲೀಕರಾದ ಗೌಡರು ತಿಂಗಳಿಗೆ ಹನ್ನೆರಡು ಸಾವಿರ ರೂಪಾಯಿ ಬಾಡಿಗೆ ಮತ್ತು ಅರವತ್ತು ಸಾವಿರ ಮುಂಗಡ ಹಣ ಕೇಳಿದರು. ಮುಂಗಡ ಹಣವನ್ನು ಸ್ವಲ್ಪ ಕಡಿಮೆ ಮಾಡಬಹುದೇ ಎಂದು ಅನಿತಾ ವಿನಯದಿಂದ ಕೇಳಿದಳು, ಕೊನೆಗೆ ಇಬ್ಬರೂ ಐವತ್ತು ಸಾವಿರಕ್ಕೆ ಒಪ್ಪಿದರು. ಬಾಡಿಗೆ ಕರಾರಿಗೆ ಸಹಿ ಹಾಕುವ ಮೊದಲು ಅವಳು ಮುನ್ಸೂಚನೆ ಅವಧಿಯನ್ನು ಪರಿಶೀಲಿಸಿ, ತಿಂಗಳ ನಿರ್ವಹಣೆ ಶುಲ್ಕವನ್ನು ಯಾರು ಕೊಡಬೇಕು ಎಂದು ಕೇಳಿದಳು. ಮುಂದೆ ಬಿಲ್‌ಗಳ ಬಗ್ಗೆ ಗೊಂದಲ ಆಗಬಾರದೆಂದು ಅವಳು ವಿದ್ಯುತ್ ಮೀಟರ್‌ನ ಫೋಟೋ ಸಹ ತೆಗೆದುಕೊಂಡಳು. ಮೊದಲ ದಿನ ಸಂಜೆ, ಸ್ನೇಹಪರ ನೆರೆಮನೆಯವರೊಬ್ಬರು ಅವಳಿಗೆ ಒಂದು ತಟ್ಟೆ ಬಿಸಿ ಬಿಸಿಬೇಳೆಬಾತ್ ತಂದುಕೊಟ್ಟರು.',
                        hi: 'मैसूरु में नौकरी लगने के बाद अनीता कुवेम्पुनगर के पास एक छोटा फ़्लैट ढूँढने लगी। एक प्रॉपर्टी डीलर ने उसे चार जगहें दिखाईं, और उसे दूसरी मंज़िल पर फ़र्नीचर सहित एक बेडरूम वाला फ़्लैट पसंद आया। मकान मालिक गौड़ा जी ने महीने का बारह हज़ार रुपये किराया और साठ हज़ार की जमा राशि माँगी। अनीता ने विनम्रता से पूछा कि क्या जमा राशि थोड़ी कम हो सकती है, और आख़िर में दोनों पचास हज़ार पर राज़ी हो गए। किरायानामे पर हस्ताक्षर करने से पहले उसने नोटिस अवधि जाँची और पूछा कि हर महीने का रखरखाव शुल्क कौन देगा। उसने बिजली के मीटर की फ़ोटो भी ले ली, ताकि बाद में बिलों को लेकर कोई उलझन न हो। पहली ही शाम एक मिलनसार पड़ोसन उसके लिए एक प्लेट गरमागरम बिसी बेले बाथ ले आई।'
                    },
                    questions: [
                        {
                            q: { en: 'How much deposit did Anitha finally agree to pay?', kn: 'ಕೊನೆಗೆ ಅನಿತಾ ಎಷ್ಟು ಮುಂಗಡ ಹಣ ಕೊಡಲು ಒಪ್ಪಿದಳು?', hi: 'आख़िर में अनीता कितनी जमा राशि देने पर राज़ी हुई?' },
                            options: [
                                { en: 'Fifty thousand rupees', kn: 'ಐವತ್ತು ಸಾವಿರ ರೂಪಾಯಿ', hi: 'पचास हज़ार रुपये' },
                                { en: 'Sixty thousand rupees', kn: 'ಅರವತ್ತು ಸಾವಿರ ರೂಪಾಯಿ', hi: 'साठ हज़ार रुपये' },
                                { en: 'Twelve thousand rupees', kn: 'ಹನ್ನೆರಡು ಸಾವಿರ ರೂಪಾಯಿ', hi: 'बारह हज़ार रुपये' },
                                { en: 'One lakh rupees', kn: 'ಒಂದು ಲಕ್ಷ ರೂಪಾಯಿ', hi: 'एक लाख रुपये' }
                            ]
                        },
                        {
                            q: { en: 'Why did she take a photo of the electricity meter?', kn: 'ಅವಳು ವಿದ್ಯುತ್ ಮೀಟರ್‌ನ ಫೋಟೋ ಏಕೆ ತೆಗೆದುಕೊಂಡಳು?', hi: 'उसने बिजली के मीटर की फ़ोटो क्यों ली?' },
                            options: [
                                { en: 'To avoid confusion about the bills later', kn: 'ಮುಂದೆ ಬಿಲ್‌ಗಳ ಬಗ್ಗೆ ಗೊಂದಲ ಆಗಬಾರದೆಂದು', hi: 'ताकि बाद में बिलों को लेकर उलझन न हो' },
                                { en: 'To send it to the broker', kn: 'ದಲ್ಲಾಳಿಗೆ ಕಳುಹಿಸಲು', hi: 'प्रॉपर्टी डीलर को भेजने के लिए' },
                                { en: 'Because the meter was broken', kn: 'ಮೀಟರ್ ಕೆಟ್ಟುಹೋಗಿದ್ದರಿಂದ', hi: 'क्योंकि मीटर ख़राब था' },
                                { en: 'To show her parents the flat', kn: 'ತಂದೆತಾಯಿಗೆ ಫ್ಲಾಟ್ ತೋರಿಸಲು', hi: 'माता-पिता को फ़्लैट दिखाने के लिए' }
                            ]
                        },
                        {
                            q: { en: 'What did the neighbour bring her?', kn: 'ನೆರೆಮನೆಯವರು ಅವಳಿಗೆ ಏನು ತಂದುಕೊಟ್ಟರು?', hi: 'पड़ोसन उसके लिए क्या लाई?' },
                            options: [
                                { en: 'A plate of bisi bele bath', kn: 'ಒಂದು ತಟ್ಟೆ ಬಿಸಿಬೇಳೆಬಾತ್', hi: 'एक प्लेट बिसी बेले बाथ' },
                                { en: 'A box of sweets', kn: 'ಒಂದು ಡಬ್ಬಿ ಸಿಹಿತಿಂಡಿ', hi: 'मिठाई का एक डिब्बा' },
                                { en: 'A new lamp', kn: 'ಒಂದು ಹೊಸ ದೀಪ', hi: 'एक नया दीया' },
                                { en: 'A cup of coffee', kn: 'ಒಂದು ಲೋಟ ಕಾಫಿ', hi: 'एक कप कॉफ़ी' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'A call to the landlady', kn: 'ಮನೆ ಮಾಲಕಿಗೆ ಒಂದು ಕರೆ', hi: 'मकान मालकिन को फ़ोन' },
                    scenario: {
                        en: 'Rahul, a tenant in Pune, calls his landlady, Mrs Joshi, about a problem in the flat and about moving out.',
                        kn: 'ಪುಣೆಯಲ್ಲಿ ಬಾಡಿಗೆಗೆ ಇರುವ ರಾಹುಲ್, ಫ್ಲಾಟ್‌ನ ಒಂದು ಸಮಸ್ಯೆ ಮತ್ತು ಮನೆ ಖಾಲಿ ಮಾಡುವ ಬಗ್ಗೆ ಮನೆ ಮಾಲಕಿ ಶ್ರೀಮತಿ ಜೋಶಿ ಅವರಿಗೆ ಕರೆ ಮಾಡುತ್ತಾನೆ.',
                        hi: 'पुणे में किराये पर रहने वाला राहुल फ़्लैट की एक समस्या और घर ख़ाली करने के बारे में अपनी मकान मालकिन श्रीमती जोशी को फ़ोन करता है।'
                    },
                    speakers: [{ name: 'Rahul', voice: 'm' }, { name: 'Mrs Joshi', voice: 'f' }],
                    lines: [
                        { speaker: 'Rahul', en: 'Good evening, Mrs Joshi. This is Rahul from flat 3B. Do you have a minute?', kn: 'ನಮಸ್ಕಾರ, ಜೋಶಿ ಅವರೇ. ನಾನು ಫ್ಲಾಟ್ 3ಬಿ ಯಿಂದ ರಾಹುಲ್. ಒಂದು ನಿಮಿಷ ಮಾತನಾಡಬಹುದೇ?', hi: 'नमस्ते, जोशी जी। मैं फ़्लैट 3बी से राहुल बोल रहा हूँ। क्या आपके पास एक मिनट है?' },
                        { speaker: 'Mrs Joshi', en: 'Yes, Rahul, tell me. Is everything all right?', kn: 'ಹೇಳಿ ರಾಹುಲ್. ಎಲ್ಲಾ ಸರಿ ಇದೆಯಾ?', hi: 'हाँ राहुल, बोलो। सब ठीक है?' },
                        { speaker: 'Rahul', en: 'Not quite. Water has been leaking from the bathroom ceiling since Monday, and the wall is getting damp.', kn: 'ಅಷ್ಟೇನೂ ಇಲ್ಲ. ಸೋಮವಾರದಿಂದ ಬಚ್ಚಲುಮನೆಯ ಚಾವಣಿಯಿಂದ ನೀರು ಸೋರುತ್ತಿದೆ, ಗೋಡೆ ತೇವವಾಗುತ್ತಿದೆ.', hi: 'पूरी तरह नहीं। सोमवार से बाथरूम की छत से पानी टपक रहा है, और दीवार में सीलन आ रही है।' },
                        { speaker: 'Mrs Joshi', en: "Oh dear. That must be the tank on the terrace. I'll send our plumber, Sunil, tomorrow morning.", kn: 'ಅಯ್ಯೋ. ಅದು ತಾರಸಿಯ ಮೇಲಿನ ಟ್ಯಾಂಕ್‌ನಿಂದ ಇರಬೇಕು. ನಾಳೆ ಬೆಳಿಗ್ಗೆ ನಮ್ಮ ಪ್ಲಂಬರ್ ಸುನೀಲ್‌ನನ್ನು ಕಳುಹಿಸುತ್ತೇನೆ.', hi: 'अरे बाप रे। यह छत वाली टंकी से होगा। मैं कल सुबह हमारे प्लंबर सुनील को भेज दूँगी।' },
                        { speaker: 'Rahul', en: 'Thank you. Will the repair come out of the maintenance, or should I pay for it?', kn: 'ಧನ್ಯವಾದಗಳು. ರಿಪೇರಿ ಖರ್ಚು ನಿರ್ವಹಣೆ ಹಣದಿಂದ ಬರುತ್ತದೆಯೇ, ಅಥವಾ ನಾನು ಕೊಡಬೇಕೇ?', hi: 'धन्यवाद। मरम्मत का ख़र्च रखरखाव के पैसों से जाएगा, या मुझे देना होगा?' },
                        { speaker: 'Mrs Joshi', en: "Don't worry, that is my responsibility as the landlady. You only pay for small things like bulbs.", kn: 'ಚಿಂತೆ ಮಾಡಬೇಡಿ, ಮನೆ ಮಾಲಕಿಯಾಗಿ ಅದು ನನ್ನ ಜವಾಬ್ದಾರಿ. ಬಲ್ಬ್‌ನಂತಹ ಸಣ್ಣ ವಸ್ತುಗಳಿಗೆ ಮಾತ್ರ ನೀವು ಕೊಡಿ.', hi: 'चिंता मत करो, मकान मालकिन होने के नाते यह मेरी ज़िम्मेदारी है। तुम सिर्फ़ बल्ब जैसी छोटी चीज़ों का ख़र्च देना।' },
                        { speaker: 'Rahul', en: "That's kind of you. There's one more thing: my company is moving me to Nashik in March.", kn: 'ತುಂಬಾ ಉಪಕಾರ. ಇನ್ನೊಂದು ವಿಷಯ: ಮಾರ್ಚ್‌ನಲ್ಲಿ ನನ್ನ ಕಂಪನಿ ನನ್ನನ್ನು ನಾಸಿಕ್‌ಗೆ ವರ್ಗಾಯಿಸುತ್ತಿದೆ.', hi: 'आपकी मेहरबानी। एक बात और: मेरी कंपनी मार्च में मेरा तबादला नासिक कर रही है।' },
                        { speaker: 'Mrs Joshi', en: 'I see. As per the agreement, the notice period is two months, so please give me written notice by January.', kn: 'ಹೌದಾ. ಕರಾರಿನ ಪ್ರಕಾರ ಮುನ್ಸೂಚನೆ ಅವಧಿ ಎರಡು ತಿಂಗಳು, ಹಾಗಾಗಿ ದಯವಿಟ್ಟು ಜನವರಿಯೊಳಗೆ ಲಿಖಿತ ಸೂಚನೆ ಕೊಡಿ.', hi: 'अच्छा। किरायानामे के हिसाब से नोटिस अवधि दो महीने है, इसलिए जनवरी तक लिखित नोटिस दे देना।' },
                        { speaker: 'Rahul', en: "I'll email you the notice this week. And the deposit will be returned when I vacate, right?", kn: 'ಈ ವಾರವೇ ನಿಮಗೆ ಸೂಚನೆಯನ್ನು ಇಮೇಲ್ ಮಾಡುತ್ತೇನೆ. ನಾನು ಖಾಲಿ ಮಾಡುವಾಗ ಮುಂಗಡ ಹಣ ವಾಪಸ್ ಸಿಗುತ್ತದೆ ಅಲ್ಲವೇ?', hi: 'मैं इसी हफ़्ते नोटिस ईमेल कर दूँगा। और घर ख़ाली करने पर जमा राशि वापस मिल जाएगी, है न?' },
                        { speaker: 'Mrs Joshi', en: "Yes. After I check the flat and the final electricity bill, I'll transfer it within a week.", kn: 'ಹೌದು. ಫ್ಲಾಟ್ ಮತ್ತು ಕೊನೆಯ ವಿದ್ಯುತ್ ಬಿಲ್ ನೋಡಿದ ನಂತರ ಒಂದು ವಾರದೊಳಗೆ ಹಣ ವರ್ಗಾಯಿಸುತ್ತೇನೆ.', hi: 'हाँ। फ़्लैट और बिजली का आख़िरी बिल देखने के बाद मैं एक हफ़्ते के अंदर पैसे भेज दूँगी।' }
                    ],
                    questions: [
                        {
                            q: { en: 'What problem does Rahul report?', kn: 'ರಾಹುಲ್ ಯಾವ ಸಮಸ್ಯೆ ತಿಳಿಸುತ್ತಾನೆ?', hi: 'राहुल कौन-सी समस्या बताता है?' },
                            options: [
                                { en: 'Water leaking from the bathroom ceiling', kn: 'ಬಚ್ಚಲುಮನೆಯ ಚಾವಣಿಯಿಂದ ನೀರು ಸೋರುವುದು', hi: 'बाथरूम की छत से पानी टपकना' },
                                { en: 'A broken door lock', kn: 'ಮುರಿದ ಬಾಗಿಲಿನ ಬೀಗ', hi: 'दरवाज़े का टूटा ताला' },
                                { en: 'Noisy neighbours', kn: 'ಗದ್ದಲ ಮಾಡುವ ನೆರೆಹೊರೆಯವರು', hi: 'शोर करने वाले पड़ोसी' },
                                { en: 'No electricity in the kitchen', kn: 'ಅಡುಗೆಮನೆಯಲ್ಲಿ ವಿದ್ಯುತ್ ಇಲ್ಲದಿರುವುದು', hi: 'रसोई में बिजली न होना' }
                            ]
                        },
                        {
                            q: { en: 'Who will pay for the repair?', kn: 'ರಿಪೇರಿ ಖರ್ಚು ಯಾರು ಕೊಡುತ್ತಾರೆ?', hi: 'मरम्मत का ख़र्च कौन देगा?' },
                            options: [
                                { en: 'Mrs Joshi, the landlady', kn: 'ಮನೆ ಮಾಲಕಿ ಶ್ರೀಮತಿ ಜೋಶಿ', hi: 'मकान मालकिन श्रीमती जोशी' },
                                { en: 'Rahul', kn: 'ರಾಹುಲ್', hi: 'राहुल' },
                                { en: 'The neighbours', kn: 'ನೆರೆಹೊರೆಯವರು', hi: 'पड़ोसी' },
                                { en: "Rahul's company", kn: 'ರಾಹುಲ್‌ನ ಕಂಪನಿ', hi: 'राहुल की कंपनी' }
                            ]
                        },
                        {
                            q: { en: 'By when must Rahul give written notice?', kn: 'ರಾಹುಲ್ ಯಾವಾಗದೊಳಗೆ ಲಿಖಿತ ಸೂಚನೆ ಕೊಡಬೇಕು?', hi: 'राहुल को लिखित नोटिस कब तक देना है?' },
                            options: [
                                { en: 'By January', kn: 'ಜನವರಿಯೊಳಗೆ', hi: 'जनवरी तक' },
                                { en: 'By March', kn: 'ಮಾರ್ಚ್‌ನೊಳಗೆ', hi: 'मार्च तक' },
                                { en: 'By the end of this week', kn: 'ಈ ವಾರದ ಕೊನೆಯೊಳಗೆ', hi: 'इस हफ़्ते के आख़िर तक' },
                                { en: 'By December', kn: 'ಡಿಸೆಂಬರ್‌ನೊಳಗೆ', hi: 'दिसंबर तक' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Call your landlord about a problem in your rented flat: explain what is wrong, ask when it can be fixed and who will pay, and politely remind them about returning your deposit when you leave.',
                        sample: "Hello, Mr Shetty, this is Kavya from flat 204. I'm sorry to call so late, but there's a problem I'd like to report. Since yesterday, the kitchen tap won't stop dripping, and there's a damp patch spreading on the wall behind it. Could you send a plumber in the next day or two? I'd also like to check who will pay for the repair, because the agreement says major repairs are the owner's responsibility. And one more thing: as you know, I'll vacate the flat at the end of next month. Could you confirm that the deposit will be returned within a week after I hand over the keys? Thank you.",
                        checklist: ['I introduced myself and said which flat I live in', 'I explained the problem clearly', 'I asked when it could be fixed', 'I asked politely who would pay', 'I reminded the landlord about the deposit', 'I ended the call politely']
                    }
                }
            ]
        }
    },
    glosses: {
        kn: {
            // 1:1 At the pharmacy
            'ಹತ್ತಿರದಲ್ಲಿ ರಾತ್ರಿಯಿಡೀ ತೆರೆದಿರುವ ಔಷಧಿ ಅಂಗಡಿ ಇದೆಯೇ?': 'nearby/close by|all night/the whole night|that is open/open|medicine|shop/store|is there?/is there',
            'ಹತ್ತು ವರ್ಷದ ಮಗುವಿಗೆ ಸರಿಯಾದ ಔಷಧದ ಪ್ರಮಾಣ ಎಷ್ಟು ಎಂದು ಹೇಳುತ್ತೀರಾ?': 'ten|year-old/of years|for the child/to the child|right/correct|medicine\'s/of medicine|amount/dosage|how much|that/(quote)|will you tell?/could you say?',
            'ಪ್ರತಿ ಊಟದ ನಂತರ ಒಂದು ಮಾತ್ರೆ ತೆಗೆದುಕೊಳ್ಳಬೇಕು ಎಂದು ಔಷಧ ವ್ಯಾಪಾರಿ ಹೇಳಿದರು.': 'every/each|meal\'s/of a meal|after|one|tablet/pill|should take/must take|that/(quote)|medicine|seller/trader|said/told',
            'ಈ ಕೆಮ್ಮಿನ ಸಿರಪ್‌ನಿಂದ ನಿದ್ದೆ ಬರುವಂತಹ ಅಡ್ಡ ಪರಿಣಾಮಗಳೇನಾದರೂ ಇವೆಯೇ?': 'this|cough/for cough|from the syrup/by the syrup|sleep|such as coming/that brings|side/cross|any effects/effects at all|are there?/exist?',
            'ಕ್ಷಮಿಸಿ, ವೈದ್ಯರ ಚೀಟಿ ಇಲ್ಲದೆ ಈ ಮಾತ್ರೆಗಳನ್ನು ನಿಮಗೆ ಕೊಡಲು ಆಗುವುದಿಲ್ಲ.': 'sorry/excuse me|doctor\'s/of the doctor|slip/note|without|these|tablets/pills|to you/you|to give|cannot/is not possible',
            'ಈ ಮುಲಾಮನ್ನು ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ ಸುಟ್ಟ ಗಾಯದ ಮೇಲೆ ಮೆಲ್ಲಗೆ ಹಚ್ಚಿ.': 'this|ointment/cream|per day/a day|two|times|burnt/burn|wound\'s/of the wound|on/over|gently/softly|apply/rub',
            'ನನಗೆ ಪೆನ್ಸಿಲಿನ್ ಅಲರ್ಜಿ ಇದೆ, ಹಾಗಾಗಿ ದಯವಿಟ್ಟು ಬೇರೆ ಏನಾದರೂ ಸೂಚಿಸಿ.': 'to me/I have|penicillin|allergy|is/there is|so/therefore|please|other/different|something/anything|suggest/recommend',
            'ಹೊಸ ಸ್ಟ್ರಿಪ್ ತೆರೆಯುವ ಮೊದಲು ಯಾವಾಗಲೂ ಅವಧಿ ಮುಗಿಯುವ ದಿನಾಂಕ ನೋಡಿ.': 'new|strip/sheet|opening/to open|before|always|period/term|ending/that ends|date|look/check',
            'ಹುಷಾರಾದರೂ ಸಹ ಪ್ರತಿಜೀವಕಗಳ ಪೂರ್ತಿ ಕೋರ್ಸ್ ಮುಗಿಸಿ.': 'even if well/even if better|also/even|of antibiotics/antibiotics\'|full/whole|course|finish/complete',
            'ಈ ನೋವು ನಿವಾರಕದಿಂದ ಮಂಪರು ಬರಬಹುದು, ಹಾಗಾಗಿ ಇದನ್ನು ತೆಗೆದುಕೊಂಡ ನಂತರ ವಾಹನ ಓಡಿಸಬೇಡಿ.': 'this|pain|from the reliever/by the killer|drowsiness/sleepiness|may come|so/therefore|this/it|having taken/taken|after|vehicle|don\'t drive/do not drive',
            // 2:1 Emergencies
            'ಹುಬ್ಬಳ್ಳಿ ಬಸ್ ನಿಲ್ದಾಣದ ಹತ್ತಿರ ಆದ ರಸ್ತೆ ಅಪಘಾತದ ಬಗ್ಗೆ ತಿಳಿಸಲು ಬಯಸುತ್ತೇನೆ.': 'Hubballi|bus|stand\'s/of the station|near/close to|that happened/happened|road|accident\'s/of the accident|about|to report/to inform|I wish/I\'d like',
            'ದಯವಿಟ್ಟು ಬೇಗ ಒಂದು ಆಂಬುಲೆನ್ಸ್ ಕಳುಹಿಸಿ; ಒಬ್ಬ ವ್ಯಕ್ತಿ ರಸ್ತೆಯ ಮೇಲೆ ಬಿದ್ದಿದ್ದಾರೆ.': 'please|quickly/soon|one/an|ambulance|send|one/a|person/man|road\'s/of the road|on/upon|has fallen/is lying',
            'ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ 112 ಸಹಾಯವಾಣಿಗೆ ಕರೆ ಮಾಡಿ, ನಿಧಾನವಾಗಿ ಮತ್ತು ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ.': 'urgent/emergency|in a situation/in the situation|112|to the helpline|call|make/do|slowly|and|clearly/plainly|speak/talk',
            'ಅಗ್ನಿಶಾಮಕ ದಳ ಬರುತ್ತಿದೆ, ಆದ್ದರಿಂದ ದಯವಿಟ್ಟು ಈಗಲೇ ಕಟ್ಟಡದಿಂದ ಹೊರಗೆ ಬನ್ನಿ.': 'fire-fighting/fire|brigade/force|is coming/on its way|so/therefore|please|right now/now itself|from the building|out/outside|come',
            'ಹತ್ತಿರದ ಗುರುತಿನ ಸ್ಥಳ ಅಂದರೆ ಪೆಟ್ರೋಲ್ ಬಂಕ್ ಎದುರಿನ ದೊಡ್ಡ ದೇವಸ್ಥಾನ.': 'nearest/nearby|landmark/marker|place/spot|that is/means|petrol|bunk/pump|opposite/in front|big/large|temple',
            'ಇಬ್ಬರಿಗೆ ಗಾಯಗಳಾಗಿವೆ, ಅವರಲ್ಲಿ ಒಬ್ಬರಿಗೆ ಪ್ರಜ್ಞೆ ಇಲ್ಲ.': 'to two people/two people|are injured/have wounds|among them/of them|to one/one person|consciousness/senses|is not/no',
            'ರಕ್ತಸ್ರಾವ ನಿಲ್ಲಿಸಲು ಗಾಯದ ಮೇಲೆ ಸ್ವಚ್ಛ ಬಟ್ಟೆಯನ್ನು ಒತ್ತಿ ಹಿಡಿಯಿರಿ.': 'bleeding|to stop|wound\'s/of the wound|on/over|clean|cloth|press/pressing|hold/keep',
            'ನಿಮಗೆ ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ಗೊತ್ತೇ, ಅಥವಾ ನಾವು ಆಂಬುಲೆನ್ಸ್‌ಗಾಗಿ ಕಾಯಬೇಕೇ?': 'to you/you|first/primary|treatment/aid|know?/is it known?|or|we|for the ambulance|should wait?/must wait?',
            'ನಿಲ್ದಾಣದಲ್ಲಿ ನನ್ನ ಬ್ಯಾಗ್ ಕಳುವಾಯಿತು, ಆ ಕಳ್ಳತನದ ಬಗ್ಗೆ ದೂರು ಕೊಡಬೇಕು.': 'at the station/in the station|my|bag|was stolen/got stolen|that|theft\'s/of the theft|about|complaint/report|must give/need to give',
            'ಗಾಬರಿಯಾಗಬೇಡಿ; ದೀರ್ಘವಾಗಿ ಉಸಿರು ತೆಗೆದುಕೊಂಡು ನಿಮ್ಮ ವಿಳಾಸ ಹೇಳಿ.': 'don\'t panic/do not panic|deeply/long|breath|taking/take|your|address|tell/say',
            // 3:1 Repairs at home
            'ಅಡುಗೆಮನೆಯ ನಲ್ಲಿ ರಾತ್ರಿಯಿಡೀ ತೊಟ್ಟಿಕ್ಕುತ್ತಿದೆ; ಇವತ್ತೇ ಒಬ್ಬ ಪ್ಲಂಬರ್‌ನನ್ನು ಕಳುಹಿಸುತ್ತೀರಾ?': 'kitchen\'s/of the kitchen|tap|all night/the whole night|is dripping/drips|today itself/today|one/a|plumber|will you send?/could you send?',
            'ಬಚ್ಚಲುಮನೆಯ ಸಿಂಕ್ ಕೆಳಗೆ ಸೋರಿಕೆ ಇದೆ, ನೆಲ ಯಾವಾಗಲೂ ಒದ್ದೆಯಾಗಿರುತ್ತದೆ.': 'bathroom\'s/of the bathroom|sink|under/below|leak/leakage|is/there is|floor/ground|always|stays wet/is wet',
            'ಗೀಸರ್ ಹಾಕಿದಾಗಲೆಲ್ಲಾ ಫ್ಯೂಸ್ ಹೋಗುತ್ತದೆ.': 'geyser/water heater|whenever switched on/every time (I) turn on|fuse|goes/blows',
            'ಈ ಫ್ಲಾಟ್‌ನ ಹಳೆಯ ವೈರಿಂಗ್ ಸುರಕ್ಷಿತವಲ್ಲ ಎಂದು ಎಲೆಕ್ಟ್ರಿಷಿಯನ್ ಹೇಳುತ್ತಾರೆ.': 'this|flat\'s/of the flat|old|wiring|is not safe/unsafe|that/(quote)|electrician|says/tells',
            'ಯಾವುದೇ ತಂತಿ ಮುಟ್ಟುವ ಮೊದಲು ದಯವಿಟ್ಟು ಮೇನ್ ಸ್ವಿಚ್ ಆಫ್ ಮಾಡಿ.': 'any|wire/wires|touching/to touch|before|please|main|switch|off|make/do',
            'ನಮ್ಮ ವಾಷಿಂಗ್ ಮೆಷಿನ್‌ನಲ್ಲಿ ದೋಷವಿದೆ; ಪ್ರತಿ ಬಾರಿ ಒಗೆಯುವಾಗ ಅರ್ಧದಲ್ಲೇ ನಿಂತುಹೋಗುತ್ತದೆ.': 'our|washing|in the machine|there is a fault/has a fault|every/each|time|while washing/when washing|halfway/in the middle|stops/comes to a stop',
            'ನಾನು ಕೆಲಸಕ್ಕೆ ಹೊರಡುವ ಮೊದಲು, ನಾಳೆ ಬೆಳಿಗ್ಗೆ ತಂತ್ರಜ್ಞರು ಬರಬಹುದೇ?': 'I|for work/to work|leaving/setting off|before|tomorrow|morning/in the morning|technician|can (he) come?/could come?',
            'ಕೆಲಸ ಶುರು ಮಾಡುವ ಮೊದಲು ಒಟ್ಟು ಖರ್ಚಿನ ಅಂದಾಜು ಕೊಡುತ್ತೀರಾ?': 'work/job|start/beginning|doing/making|before|total/overall|cost\'s/of the cost|estimate/rough idea|will you give?/could you give?',
            'ಬಿಡಿಭಾಗ ಬೆಂಗಳೂರಿನಿಂದ ಬರಲು ಮೂರು ದಿನ ಬೇಕಾಗುತ್ತದೆ.': 'spare part/part|from Bengaluru|to come/to arrive|three|days/day|is needed/will take',
            'ಯಾವುದೇ ದೊಡ್ಡ ಗೃಹೋಪಯೋಗಿ ಉಪಕರಣಕ್ಕೆ ಪ್ರತಿ ಭೇಟಿಗೆ ಮುನ್ನೂರು ರೂಪಾಯಿ ಸೇವಾ ಶುಲ್ಕ ಇದೆ.': 'any|big/large|household/home-use|for the appliance/for the device|per/every|for a visit/visit|three hundred|rupees|service|charge/fee|is/there is',
            // 4:1 Complaints and refunds
            'ಕಳೆದ ವಾರ ಇಲ್ಲಿ ಕೊಂಡ ಮಿಕ್ಸಿಯ ಬಗ್ಗೆ ನಾನು ದೂರು ನೀಡಲು ಬಯಸುತ್ತೇನೆ.': 'last/past|week|here|bought|mixer\'s/of the mixer|about|I|complaint|to give/to make|I wish/I\'d like',
            'ಮೋಟಾರ್ ದೋಷಪೂರಿತವಾಗಿದೆ, ಹಾಗಾಗಿ ನನಗೆ ಬದಲಿ ಮಿಕ್ಸಿ ಅಥವಾ ಪೂರ್ತಿ ಹಣ ವಾಪಸ್ ಬೇಕು.': 'motor|is defective/is faulty|so/therefore|to me/I|replacement/substitute|mixer|or|full/whole|money|back/returned|want/need',
            'ಇಗೋ ರಸೀದಿ, ಮತ್ತು ಡಬ್ಬಿಯಲ್ಲಿ ಎಲ್ಲಾ ಭಾಗಗಳು ಇನ್ನೂ ಇವೆ.': 'here/look here|receipt|and|in the box|all|parts/pieces|still/yet|are/are there',
            'ಇದಕ್ಕೆ ಇನ್ನೂ ಖಾತರಿ ಇದೆ, ಹಾಗಾಗಿ ರಿಪೇರಿ ಉಚಿತವಾಗಿರಬೇಕು.': 'to this/for this|still/yet|warranty/guarantee|is/there is|so/therefore|repair|should be free/must be free',
            'ಕ್ಷಮಿಸಿ, ವೋಚರ್ ಸಾಕಾಗುವುದಿಲ್ಲ; ನನಗೆ ಹಣವೇ ವಾಪಸ್ ಬೇಕು.': 'sorry/excuse me|voucher/coupon|is not enough/won\'t do|to me/I|money itself/the money|back/returned|want/need',
            'ನಾನು ಮೂರು ಬಾರಿ ಗ್ರಾಹಕ ಸೇವೆಗೆ ಕರೆ ಮಾಡಿದ್ದೇನೆ, ಆದರೆ ಯಾರೂ ಸಮಸ್ಯೆ ಬಗೆಹರಿಸಿಲ್ಲ.': 'I|three|times|customer|to the service/to care|call|have made/have done|but|nobody/no one|problem|has not solved/haven\'t fixed',
            'ಈ ವಿಷಯದ ಬಗ್ಗೆ ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮೇಲ್ವಿಚಾರಕರೊಂದಿಗೆ ಮಾತನಾಡಬಹುದೇ?': 'this|matter\'s/of the matter|about|please|your|with the supervisor/with the senior|may I speak?/can I talk?',
            'ಶುಕ್ರವಾರದೊಳಗೆ ಸರಿಯಾಗದಿದ್ದರೆ, ನನ್ನ ದೂರನ್ನು ಮೇಲಧಿಕಾರಿಗಳಿಗೆ ತಲುಪಿಸಬೇಕಾಗುತ್ತದೆ.': 'by Friday/before Friday|if not fixed/if not set right|my|complaint|to senior officers/to the higher-ups|will have to take/must pass on',
            'ವಿತರಣೆ ಹತ್ತು ದಿನ ತಡವಾಯಿತು, ಮತ್ತು ಪಾರ್ಸೆಲ್ ಹಾಳಾಗಿತ್ತು.': 'delivery|ten|days/day|was late/got delayed|and|parcel/package|was damaged/was spoilt',
            'ಅನಾನುಕೂಲಕ್ಕಾಗಿ ಕ್ಷಮೆ ಕೋರುತ್ತೇವೆ, ಪರಿಹಾರವಾಗಿ ಇನ್ನೂರು ರೂಪಾಯಿ ಸೇರಿಸುತ್ತೇವೆ.': 'for the inconvenience/for the trouble|pardon/apology|we ask/we request|as compensation/as amends|two hundred|rupees|we will add/we add',
            // 5:1 Government offices
            'ಆದಾಯ ಪ್ರಮಾಣಪತ್ರಕ್ಕೆ ಅರ್ಜಿ ನಮೂನೆ ಎಲ್ಲಿ ಸಿಗುತ್ತದೆ?': 'income|for the certificate/certificate\'s|application|form/format|where|is available?/can (I) get?',
            'ದಯವಿಟ್ಟು ಮೂಲ ದಾಖಲೆಗಳ ಜೊತೆಗೆ ಪ್ರತಿಯೊಂದರ ಒಂದು ಜೆರಾಕ್ಸ್ ಪ್ರತಿಯನ್ನೂ ತನ್ನಿ.': 'please|original|documents\'/of documents|along with/with|of each one/each one\'s|one|xerox/photocopy|copy too/a copy also|bring',
            'ಎರಡನೇ ಪುಟದಲ್ಲಿ ನೀವು ಸಹಿ ಹಾಕಲು ಮರೆತಿದ್ದೀರಿ.': 'second|on the page/in the page|you|signature/sign|to put|have forgotten/forgot',
            'ವಿಳಾಸದ ಪುರಾವೆಯಾಗಿ ವಿದ್ಯುತ್ ಬಿಲ್ ಸಾಕೇ?': 'address\'s/of address|as proof/as evidence|electricity/electric|bill|is (it) enough?/enough?',
            'ನನ್ನ ಜನನ ಪ್ರಮಾಣಪತ್ರದಲ್ಲಿ ನನ್ನ ತಂದೆಯ ಹೆಸರಿನ ಕಾಗುಣಿತ ತಪ್ಪಾಗಿದೆ.': 'my|birth|in the certificate/on the certificate|my|father\'s/of my father|name\'s/of the name|spelling|is wrong/has gone wrong',
            'ದಯವಿಟ್ಟು ಒಂದು ಟೋಕನ್ ತೆಗೆದುಕೊಂಡು ನಿಮ್ಮ ಸಂಖ್ಯೆ ಕರೆಯುವವರೆಗೆ ಕಾಯಿರಿ.': 'please|one/a|token|take/taking|your|number|until called/till they call|wait',
            'ಕ್ಷಮಿಸಿ, ಆಧಾರ್ ತಿದ್ದುಪಡಿಗೆ ಇದೇ ಸರಿಯಾದ ಸರತಿ ಸಾಲೇ?': 'excuse me/sorry|Aadhaar|for correction/for updates|this itself/this very|right/correct|turn/queue|line?/row?',
            'ನನ್ನ ಬೆರಳಚ್ಚುಗಳನ್ನು ಮತ್ತೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಬೇಕು ಎಂದು ಅಧಿಕಾರಿ ಹೇಳಿದರು.': 'my|fingerprints|again/once more|scan|must do/must be done|that/(quote)|official/officer|said/told',
            'ನಿಮ್ಮ ಪಾಸ್‌ಪೋರ್ಟ್‌ಗೆ ಪೊಲೀಸ್ ಪರಿಶೀಲನೆ ಸಾಮಾನ್ಯವಾಗಿ ಸುಮಾರು ಎರಡು ವಾರ ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ.': 'your|for the passport|police|verification/checking|usually/generally|about/around|two|weeks/week|takes',
            'ಈ ಸ್ವೀಕೃತಿಯನ್ನು ಜೋಪಾನವಾಗಿಡಿ; ನಿಮ್ಮ ಅರ್ಜಿಯ ಸ್ಥಿತಿ ತಿಳಿಯಲು ಇದು ಬೇಕಾಗುತ್ತದೆ.': 'this|acknowledgement/receipt slip|keep safe/keep carefully|your|application\'s/of the application|status/state|to know/to find out|this/it|will be needed/is needed',
            // 6:1 Renting a home
            'ಬೆಂಗಳೂರಿನ ಮನೆ ಮಾಲೀಕರು ಹೆಚ್ಚಾಗಿ ಹತ್ತು ತಿಂಗಳ ಬಾಡಿಗೆಯನ್ನು ಮುಂಗಡ ಹಣವಾಗಿ ಕೇಳುತ್ತಾರೆ.': 'Bengaluru\'s/in Bengaluru|house/home|owners|often/mostly|ten|months\'/of months|rent|advance/deposit|as money/as an amount|ask/ask for',
            'ಬಾಡಿಗೆಯಲ್ಲಿ ಸ್ವಲ್ಪ ಕಡಿಮೆ ಮಾಡಬಹುದೇ, ಅಥವಾ ಇದೇ ಅಂತಿಮ ಮೊತ್ತವೇ?': 'in the rent|a little/slightly|less/lower|can (you) make?/can be done?|or|this itself/this very|final/last|amount?/sum?',
            'ದಲ್ಲಾಳಿ ತನ್ನ ಶುಲ್ಕವಾಗಿ ಒಂದು ತಿಂಗಳ ಬಾಡಿಗೆ ತೆಗೆದುಕೊಳ್ಳುತ್ತಾನೆ.': 'broker/agent|his own/his|as fee/as charge|one|month\'s/of a month|rent|takes/charges',
            'ನಾವು ಮೆಟ್ರೋ ನಿಲ್ದಾಣದ ಹತ್ತಿರ ಪೂರ್ತಿ ಪೀಠೋಪಕರಣ ಸಹಿತ ಫ್ಲಾಟ್ ಹುಡುಕುತ್ತಿದ್ದೇವೆ.': 'we|metro|station\'s/of the station|near/close to|fully/completely|furniture|with/including|flat|are looking for/are searching',
            'ಬಾಡಿಗೆದಾರರಾಗಿ, ಪ್ರತಿ ಪಾವತಿಗೂ ರಸೀದಿ ಪಡೆಯುವ ಹಕ್ಕು ನಿಮಗಿದೆ.': 'as a tenant/being a tenant|every/each|for each payment/payment too|receipt|getting/to get|right|you have/is yours',
            'ಬಾಡಿಗೆ ಕರಾರಿಗೆ ಸಹಿ ಹಾಕುವ ಮೊದಲು ಅದನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಓದಿ.': 'rent/rental|to the agreement/on the contract|signature/sign|putting/to put|before|it/that|carefully|read',
            'ತಿಂಗಳ ನಿರ್ವಹಣೆ ಶುಲ್ಕ ಬಾಡಿಗೆಯಲ್ಲೇ ಸೇರಿದೆಯೇ, ಅಥವಾ ಬೇರೆಯಾಗಿ ಕೊಡಬೇಕೇ?': 'monthly/month\'s|maintenance/upkeep|charge/fee|in the rent itself|is included?/is it part?|or|separately/apart|must (I) pay?/should give?',
            'ನಮ್ಮ ನೆರೆಹೊರೆಯವರು ಸ್ನೇಹಪರರು, ಆದರೆ ತಡರಾತ್ರಿ ಜೋರಾಗಿ ಹಾಡು ಹಾಕುತ್ತಾರೆ.': 'our|neighbours|friendly/are friendly|but|late night/late at night|loudly/loud|songs/music|play/put on',
            'ಮುನ್ಸೂಚನೆ ಅವಧಿ ಎರಡು ತಿಂಗಳು, ಹಾಗಾಗಿ ಜುಲೈ ಒಳಗೆ ಮನೆ ಮಾಲೀಕರಿಗೆ ತಿಳಿಸಬೇಕು.': 'notice/advance warning|period/term|two|months|so/therefore|July|within/by|house/home|to the owner/to the landlord|must tell/must inform',
            'ಫ್ಲಾಟ್ ಖಾಲಿ ಮಾಡುವಾಗ ವಿದ್ಯುತ್ ಮೀಟರ್‌ನ ರೀಡಿಂಗ್ ಬರೆದುಕೊಳ್ಳುತ್ತೇವೆ.': 'flat|empty/vacant|while making/when doing|electricity/electric|meter\'s/of the meter|reading|will write down/will note'
        },
        hi: {
            // 1:1 At the pharmacy
            'क्या पास में कोई दवा की दुकान है जो पूरी रात खुली रहती है?': '(question)/is|near/close|in/by|any/some|medicine|of/\'s|shop/store|is/there is|which/that|whole/full|night|open|stays/remains|is/remains',
            'क्या आप बता सकते हैं कि दस साल के बच्चे के लिए सही खुराक कितनी है?': '(question)/can|you|tell/say|can/able|are/(polite)|that|ten|year/years|of/-old|child/kid|of/(part of "for")|for/for the sake|right/correct|dosage/dose|how much|is',
            'केमिस्ट ने कहा कि मुझे हर खाने के बाद एक गोली लेनी चाहिए।': 'chemist|(past marker)/by|said/told|that|to me/I|every/each|meal/food|of/(part of "after")|after/later|one/a|tablet/pill|to take/take|should/must',
            'क्या इस खाँसी के सिरप के कोई दुष्प्रभाव हैं, जैसे नींद आना?': '(question)/is|this|cough|of/for|syrup|of/its|any/some|side effects/bad effects|are/there are|like/such as|sleep|coming/to come',
            'माफ़ कीजिए, पर्चे के बिना हम आपको ये गोलियाँ नहीं दे सकते।': 'pardon/forgive|please do/do|prescription/slip|of/(part of "without")|without|we|to you/you|these|tablets/pills|not|give|can/able',
            'यह मरहम दिन में दो बार जले हुए हिस्से पर धीरे से लगाइए।': 'this|ointment/balm|day|in/per|two|times|burnt/burned|(that has)/been|part/area|on/upon|slow/gentle|(manner)/with|apply/put on',
            'मुझे पेनिसिलिन से एलर्जी है, इसलिए कृपया कुछ और बताइए।': 'to me/I|penicillin|from/to|allergy|is/there is|so/therefore|please|something/some|else/other|tell/suggest',
            'नई पत्ती खोलने से पहले हमेशा समाप्ति तिथि देख लीजिए।': 'new|strip/leaf|opening/to open|from/(part of "before")|before/earlier|always|expiry/end|date|look/check|take/(polite)',
            'ठीक लगने पर भी एंटीबायोटिक का पूरा कोर्स ख़त्म कीजिए।': 'fine/well|feeling/seeming|on/upon|even/also|antibiotic|of/\'s|full/whole|course|finish/end|do/please do',
            'इस दर्द निवारक दवा से नींद आ सकती है, इसलिए इसे लेने के बाद गाड़ी मत चलाइए।': 'this|pain|reliever/remover|medicine|from/by|sleep|come|can/may|is/(helper)|so/therefore|this/it|taking/to take|of/(part of "after")|after/later|vehicle/car|don\'t/do not|drive',
            // 2:1 Emergencies
            'मैं हुब्बल्ली बस स्टैंड के पास हुई सड़क दुर्घटना की सूचना देना चाहता हूँ।': 'I|Hubballi|bus|stand/station|of/(part of "near")|near/close|happened/that took place|road|accident|of/\'s|information/report|to give/give|want/wish|am',
            'कृपया जल्दी एक एम्बुलेंस भेजिए, एक आदमी सड़क पर पड़ा है।': 'please|quickly/fast|one/an|ambulance|send|one/a|man/person|road|on/upon|lying/fallen|is',
            'आपात स्थिति में 112 हेल्पलाइन पर फ़ोन कीजिए और धीरे-धीरे, साफ़ बोलिए।': 'emergency/urgent|situation/condition|in/during|112|helpline|on/at|phone/call|do/make|and|slowly/gradually|clear/clearly|speak/talk',
            'दमकल रास्ते में है, इसलिए कृपया अभी इमारत से बाहर निकल जाइए।': 'fire brigade/fire engine|way/road|in/on|is|so/therefore|please|now/right now|building|from/out of|out/outside|get out/leave|go',
            'सबसे नज़दीकी पहचान की जगह पेट्रोल पंप के सामने वाला बड़ा मंदिर है।': 'most/of all|near/nearest|identity/recognition|of/\'s|place/spot|petrol|pump/bunk|of/(part of "opposite")|opposite/in front|the one/which is|big/large|temple|is',
            'दो लोग घायल हैं, और उनमें से एक बेहोश है।': 'two|people/persons|injured/wounded|are|and|in them/among them|from/of|one|unconscious/fainted|is',
            'ख़ून रोकने के लिए घाव पर एक साफ़ कपड़ा दबाकर रखिए।': 'blood|stopping/to stop|of/(part of "for")|for/in order to|wound/cut|on/upon|one/a|clean|cloth|pressing/by pressing|keep/hold',
            'क्या आपको प्राथमिक उपचार आता है, या हम एम्बुलेंस का इंतज़ार करें?': '(question)/is|to you/you|first/primary|treatment/aid|comes/know|is|or|we|ambulance|of/for|wait/waiting|should do?/do?',
            'स्टेशन पर मेरा बैग चोरी हो गया, और मुझे इस चोरी की रिपोर्ट लिखवानी है।': 'station|at/on|my|bag|theft/stolen|be/become|went/got|and|to me/I|this|theft|of/\'s|report|to get written/to file|is/have to',
            'घबराइए मत; गहरी साँस लीजिए और मुझे अपना पता बताइए।': 'panic/worry|don\'t/do not|deep|breath|take|and|to me/me|your/own|address|tell/say',
            // 3:1 Repairs at home
            'रसोई का नल पूरी रात से टपक रहा है; क्या आप आज ही किसी प्लंबर को भेज सकते हैं?': 'kitchen|of/\'s|tap|whole/full|night|since/from|drip/dripping|(-ing)/keeps|is|(question)/can|you|today|itself/only|some/any|plumber|(object marker)/to|send|can/able|are/(polite)',
            'बाथरूम के सिंक के नीचे रिसाव है, और फ़र्श हमेशा गीला रहता है।': 'bathroom|of/\'s|sink|of/(part of "under")|under/below|leak/leakage|is/there is|and|floor|always|wet|stays/remains|is',
            'जब भी मैं गीज़र चलाता हूँ, फ़्यूज़ उड़ जाता है।': 'when/whenever|ever/also|I|geyser/water heater|run/switch on|am|fuse|blow/fly|goes/(helper)|is',
            'बिजली मिस्त्री का कहना है कि इस फ़्लैट की पुरानी वायरिंग सुरक्षित नहीं है।': 'electricity/electric|mechanic/worker|of/\'s|saying/view|is|that|this|flat|of/\'s|old|wiring|safe|not|is',
            'किसी भी तार को छूने से पहले कृपया मेन स्विच बंद कर दीजिए।': 'any/some|at all/even|wire|(object marker)/to|touching/to touch|from/(part of "before")|before/earlier|please|main|switch|off/closed|do/make|give/(polite)',
            'हमारी वॉशिंग मशीन में ख़राबी है; हर धुलाई के बीच में ही रुक जाती है।': 'our|washing|machine|in/inside|fault/defect|is/there is|every/each|wash/washing|of/\'s|middle/between|in/at|itself/just|stop/halt|goes/(helper)|is',
            'क्या तकनीशियन कल सुबह, मेरे काम पर जाने से पहले आ सकते हैं?': '(question)/can|technician|tomorrow|morning|my|work/job|to/at|going/leaving|from/(part of "before")|before/earlier|come|can/able|are/(polite)',
            'काम शुरू करने से पहले क्या आप कुल ख़र्च का अनुमान बता सकते हैं?': 'work/job|start/beginning|doing/making|from/(part of "before")|before/earlier|(question)/can|you|total/overall|cost/expense|of/\'s|estimate/guess|tell/say|can/able|are/(polite)',
            'पुर्ज़े को बेंगलुरु से आने में तीन दिन लगेंगे।': 'part/spare part|to/for|Bengaluru|from|coming/to arrive|in|three|days/day|will take/will need',
            'किसी भी बड़े घरेलू उपकरण के लिए हर विज़िट का सर्विस चार्ज तीन सौ रुपये है।': 'any/some|at all/even|big/large|household/home|appliance/device|of/(part of "for")|for|every/each|visit|of/\'s|service|charge/fee|three|hundred|rupees|is',
            // 4:1 Complaints and refunds
            'मैं पिछले हफ़्ते यहाँ से ख़रीदी मिक्सी के बारे में शिकायत करना चाहता हूँ।': 'I|last/previous|week|here|from|bought/purchased|mixer|of/(part of "about")|matter/subject|in/about|complaint|to make/to do|want/wish|am',
            'मोटर ख़राब है, इसलिए मुझे दूसरी मिक्सी चाहिए या पूरे पैसे वापस।': 'motor|faulty/bad|is|so/therefore|to me/I|another/second|mixer|want/need|or|full/whole|money|back/returned',
            'यह रही रसीद, और डिब्बे में अब भी सारे पुर्ज़े हैं।': 'this/here|is (fem.)/stays|receipt|and|box|in/inside|now|also/still|all|parts/pieces|are',
            'यह अभी भी वारंटी में है, इसलिए मरम्मत मुफ़्त होनी चाहिए।': 'this/it|now/yet|also/still|warranty/guarantee|in/under|is|so/therefore|repair|free|to be/be|should/must',
            'माफ़ कीजिए, वाउचर से काम नहीं चलेगा; मुझे पैसे ही वापस चाहिए।': 'pardon/forgive|please do/do|voucher/coupon|with/from|work/job|not|will go/will do|to me/I|money|itself/only|back/returned|want/need',
            'मैं तीन बार ग्राहक सेवा को फ़ोन कर चुका हूँ, और किसी ने समस्या हल नहीं की।': 'I|three|times|customer|service/care|to/(object marker)|phone/call|do/make|already done/have finished|am|and|anyone/somebody|(past marker)/by|problem|solution/solved|not|did/made',
            'क्या मैं इस बारे में आपके सुपरवाइज़र से बात कर सकता हूँ?': '(question)/can|I|this|matter/subject|in/about|your|supervisor|with/to|talk/word|do/make|can/able|am',
            'अगर शुक्रवार तक ठीक नहीं हुआ, तो मुझे अपनी शिकायत ऊपर तक ले जानी पड़ेगी।': 'if|Friday|by/until|fixed/fine|not|happened/became|then|to me/I|my/own|complaint|up/above|to/till|take/carry|to go/go|will have to/must',
            'डिलीवरी दस दिन देर से हुई, और पार्सल टूटा-फूटा था।': 'delivery|ten|days/day|late/delay|with/by|happened/came|and|parcel/package|broken/damaged|was',
            'असुविधा के लिए हमें खेद है, मुआवज़े के तौर पर हम दो सौ रुपये जोड़ देंगे।': 'inconvenience/trouble|of/(part of "for")|for|to us/we|regret/sorrow|is/have|compensation|of/\'s|way/manner|on/as|we|two|hundred|rupees|add/join|will give/(will)',
            // 5:1 Government offices
            'आय प्रमाणपत्र का आवेदन पत्र कहाँ मिलेगा?': 'income|certificate|of/\'s|application|paper/form|where|will (I) get?/is available?',
            'कृपया मूल दस्तावेज़ों के साथ हर एक की एक फ़ोटोकॉपी भी लाइए।': 'please|original|documents|of/(part of "with")|with/along|every/each|one|of/\'s|one/a|photocopy|also/too|bring',
            'आप दूसरे पन्ने पर हस्ताक्षर करना भूल गए हैं।': 'you|second/other|page|on/upon|signature|to do/to make|forget/forgotten|went/(helper)|are/have',
            'क्या पते के प्रमाण के लिए बिजली का बिल काफ़ी है?': '(question)/is|address|of/\'s|proof/evidence|of/(part of "for")|for|electricity/power|of/\'s|bill|enough/sufficient|is',
            'मेरे जन्म प्रमाणपत्र में मेरे पिता के नाम की स्पेलिंग ग़लत है।': 'my|birth|certificate|in/on|my|father|of/\'s|name|of/\'s|spelling|wrong/incorrect|is',
            'कृपया टोकन लीजिए और अपना नंबर पुकारे जाने तक इंतज़ार कीजिए।': 'please|token|take|and|your/own|number|called/called out|being/going|until/till|wait/waiting|do/please do',
            'माफ़ कीजिए, क्या आधार अपडेट के लिए यही सही कतार है?': 'pardon/excuse|please do/do|(question)/is|Aadhaar|update|of/(part of "for")|for|this very/this one|right/correct|queue/line|is',
            'अधिकारी ने कहा कि मेरी उँगलियों के निशान दोबारा स्कैन करने होंगे।': 'official/officer|(past marker)/by|said/told|that|my|fingers\'/of fingers|of/\'s|marks/prints|again/once more|scan|to do/to be done|will have to/will be',
            'आपके पासपोर्ट के लिए पुलिस सत्यापन में आमतौर पर लगभग दो हफ़्ते लगते हैं।': 'your|passport|of/(part of "for")|for|police|verification/checking|in|usually/generally|on/(part of "usually")|about/around|two|weeks|take/are needed|are',
            'यह पावती संभालकर रखिए; अपने आवेदन की स्थिति जानने के लिए इसकी ज़रूरत पड़ेगी।': 'this|acknowledgement/receipt|carefully/safely|keep|your/own|application|of/\'s|status/state|knowing/to know|of/(part of "for")|for|of this/its|need/necessity|will arise/will be',
            // 6:1 Renting a home
            'बेंगलुरु में मकान मालिक अक्सर दस महीने का किराया जमा राशि के रूप में माँगते हैं।': 'Bengaluru|in|house/home|owner/landlord|often/usually|ten|months|of/\'s|rent|deposit/saved|amount/sum|of/(part of "as")|form/shape|in/as|ask for/demand|are/(plural)',
            'क्या किराया थोड़ा कम हो सकता है, या यही आख़िरी रकम है?': '(question)/can|rent|a little/slightly|less/lower|be/become|can/able|is|or|this very/this one|final/last|amount/sum|is',
            'प्रॉपर्टी डीलर अपनी फ़ीस के तौर पर एक महीने का किराया लेता है।': 'property|dealer/agent|his own/his|fee|of/\'s|way/manner|on/as|one|month|of/\'s|rent|takes/charges|is',
            'हम मेट्रो स्टेशन के पास पूरी तरह फ़र्नीचर सहित एक फ़्लैट ढूँढ रहे हैं।': 'we|metro|station|of/(part of "near")|near/close|full/fully|way/manner|furniture|with/including|one/a|flat|search/look for|(-ing)/are busy|are',
            'किरायेदार होने के नाते हर भुगतान की रसीद पाना आपका हक़ है।': 'tenant|being/to be|of/(part of "as")|as/by way of|every/each|payment|of/\'s|receipt|getting/to get|your|right/claim|is',
            'किरायानामे पर हस्ताक्षर करने से पहले उसे ध्यान से पढ़िए।': 'rental agreement/rent deed|on/upon|signature|doing/making|from/(part of "before")|before/earlier|it/that|attention/care|with/(manner)|read',
            'क्या हर महीने का रखरखाव शुल्क किराये में शामिल है, या अलग से देना होगा?': '(question)/is|every/each|month|of/\'s|maintenance/upkeep|charge/fee|rent|in/inside|included|is|or|separate/apart|from/(manner)|to give/to pay|will be/will have',
            'हमारे पड़ोसी मिलनसार हैं, लेकिन देर रात तक तेज़ गाने बजाते हैं।': 'our|neighbours|friendly/sociable|are|but|late/delay|night|till/until|loud/sharp|songs/music|play|are/(plural)',
            'नोटिस अवधि दो महीने की है, इसलिए हमें जुलाई तक मकान मालिक को बताना होगा।': 'notice|period/term|two|months|of/\'s|is|so/therefore|to us/we|July|by/until|house/home|owner/landlord|to/(object marker)|to tell/to inform|will have to/must',
            'फ़्लैट ख़ाली करते समय हम बिजली के मीटर की रीडिंग लिख लेंगे।': 'flat|empty/vacant|doing/making|time/while|we|electricity/power|of/\'s|meter|of/\'s|reading|write/note|will take/(will)'
        }
    }
};
