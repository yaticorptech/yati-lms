/**
 * Section "Sharing your views" (about CEFR C2), units 1–6: Giving opinions, Agreeing and disagreeing, Memories,
 * Hopes and regrets, Friends and relationships, Advice and suggestions. Written in English, Kannada and Hindi
 * (no translation service) — a native speaker should check them.
 */
module.exports = {
    level: 'opinions',
    units: {
        '1:1': {
            name: 'Giving opinions',
            lessons: [
                {
                    kind: 'words', title: 'Saying what you think', list: [
                        { en: 'viewpoint', kn: 'ದೃಷ್ಟಿಕೋನ', hi: 'दृष्टिकोण', pic: '👁️', def: 'a particular way of looking at or thinking about something' },
                        { en: 'in my view', kn: 'ನನ್ನ ಪ್ರಕಾರ', hi: 'मेरे विचार में', pic: '💭', def: 'words used to say what you personally think' },
                        { en: "as far as I'm concerned", kn: 'ನನ್ನ ಮಟ್ಟಿಗೆ', hi: 'जहाँ तक मेरी बात है', pic: '🙋', def: 'words used to show that this is only your own opinion' },
                        { en: 'stance', kn: 'ನಿಲುವು', hi: 'रुख़', pic: '🧍', def: 'the opinion or attitude you openly take on a subject' },
                        { en: 'conviction', kn: 'ದೃಢ ನಂಬಿಕೆ', hi: 'दृढ़ विश्वास', pic: '💪', def: 'a strong belief that you are sure is right' },
                        { en: 'frankly', kn: 'ನೇರವಾಗಿ ಹೇಳಬೇಕೆಂದರೆ', hi: 'सच कहूँ तो', pic: '🗣️', def: 'used when you say honestly what you think, even if others may not like it' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Giving opinions 1', list: [
                        { read: true, en: 'In my view, every child should learn at least one musical instrument.', kn: 'ನನ್ನ ಪ್ರಕಾರ, ಪ್ರತಿ ಮಗುವೂ ಕನಿಷ್ಠ ಒಂದು ಸಂಗೀತ ವಾದ್ಯವನ್ನು ಕಲಿಯಬೇಕು.', hi: 'मेरे विचार में, हर बच्चे को कम से कम एक वाद्य यंत्र सीखना चाहिए।' },
                        { read: true, en: "As far as I'm concerned, the new bus timetable is a big improvement.", kn: 'ನನ್ನ ಮಟ್ಟಿಗೆ, ಹೊಸ ಬಸ್ ವೇಳಾಪಟ್ಟಿ ಹಳೆಯದಕ್ಕಿಂತ ಎಷ್ಟೋ ಉತ್ತಮವಾಗಿದೆ.', hi: 'जहाँ तक मेरी बात है, बस की नई समय-सारणी पहले से कहीं बेहतर है।', acc: { en: ['As far as I am concerned, the new bus timetable is a big improvement.'] } },
                        { en: 'What is your stance on mobile phones in the classroom?', kn: 'ತರಗತಿಯಲ್ಲಿ ಮೊಬೈಲ್ ಫೋನ್ ಬಳಕೆಯ ಬಗ್ಗೆ ನಿಮ್ಮ ನಿಲುವು ಏನು?', hi: 'कक्षा में मोबाइल फ़ोन को लेकर आपका रुख़ क्या है?' },
                        { read: true, en: 'She spoke with such conviction that nobody in the room argued with her.', kn: 'ಅವಳು ಎಷ್ಟು ದೃಢ ನಂಬಿಕೆಯಿಂದ ಮಾತನಾಡಿದಳೆಂದರೆ ಕೋಣೆಯಲ್ಲಿ ಯಾರೂ ಅವಳೊಂದಿಗೆ ವಾದಿಸಲಿಲ್ಲ.', hi: 'उसने इतने दृढ़ विश्वास से बात की कि कमरे में किसी ने उससे बहस नहीं की।' },
                        { en: 'Frankly, I found the film far too long and rather boring.', kn: 'ನೇರವಾಗಿ ಹೇಳಬೇಕೆಂದರೆ, ಆ ಸಿನಿಮಾ ತುಂಬಾ ಉದ್ದವಾಗಿತ್ತು ಮತ್ತು ಸ್ವಲ್ಪ ಬೇಸರ ತರಿಸಿತು.', hi: 'सच कहूँ तो, मुझे फ़िल्म बहुत लंबी और थोड़ी उबाऊ लगी।' }
                    ]
                },
                {
                    kind: 'words', title: 'Reasons and examples', list: [
                        { en: 'reasoning', kn: 'ತರ್ಕ', hi: 'तर्क', pic: '🧠', def: 'the way you think step by step to reach an opinion' },
                        { en: 'for instance', kn: 'ಉದಾಹರಣೆಗೆ', hi: 'उदाहरण के लिए', pic: '👉', def: 'words used to give an example' },
                        { en: 'assumption', kn: 'ಊಹೆ', hi: 'धारणा', pic: '🧐', def: 'something you believe is true without having proof' },
                        { en: 'gut feeling', kn: 'ಒಳಮನಸ್ಸಿನ ಅನಿಸಿಕೆ', hi: 'अंदर का एहसास', pic: '💓', def: 'a strong feeling about something that you cannot fully explain' },
                        { en: 'on the whole', kn: 'ಒಟ್ಟಾರೆಯಾಗಿ', hi: 'कुल मिलाकर', pic: '🌐', def: 'when you think about everything together; generally' },
                        { en: 'debatable', kn: 'ಚರ್ಚಾಸ್ಪದ', hi: 'बहस का मुद्दा', pic: '🤨', def: 'not certain, so people may have different opinions about it' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Giving opinions 2', list: [
                        { read: true, en: 'Your reasoning is clear, but I would like to hear some examples.', kn: 'ನಿಮ್ಮ ತರ್ಕ ಸ್ಪಷ್ಟವಾಗಿದೆ, ಆದರೆ ನಾನು ಕೆಲವು ಉದಾಹರಣೆಗಳನ್ನು ಕೇಳಲು ಬಯಸುತ್ತೇನೆ.', hi: 'आपका तर्क साफ़ है, लेकिन मैं कुछ उदाहरण सुनना चाहूँगा।', acc: { hi: ['आपका तर्क साफ़ है, लेकिन मैं कुछ उदाहरण सुनना चाहूँगी।'] } },
                        { read: true, en: 'Small towns can be lovely to live in; Udupi, for instance, is calm and clean.', kn: 'ಸಣ್ಣ ಊರುಗಳಲ್ಲಿ ವಾಸಿಸುವುದು ತುಂಬಾ ಹಿತವಾಗಿರಬಹುದು; ಉದಾಹರಣೆಗೆ, ಉಡುಪಿ ಶಾಂತ ಮತ್ತು ಸ್ವಚ್ಛವಾಗಿದೆ.', hi: 'छोटे शहरों में रहना बहुत अच्छा हो सकता है; उदाहरण के लिए, उडुपी शांत और साफ़ है।' },
                        { en: 'That is just an assumption; do you have any facts to support it?', kn: 'ಅದು ಕೇವಲ ಒಂದು ಊಹೆ; ಅದನ್ನು ಸಮರ್ಥಿಸಲು ನಿಮ್ಮ ಬಳಿ ಏನಾದರೂ ಆಧಾರ ಇದೆಯೇ?', hi: 'यह सिर्फ़ एक धारणा है; क्या इसके पक्ष में आपके पास कोई तथ्य हैं?' },
                        { read: true, en: 'I had a gut feeling that the shortcut through the forest was a bad idea.', kn: 'ಕಾಡಿನ ಮೂಲಕ ಹೋಗುವ ಆ ಅಡ್ಡದಾರಿ ಒಳ್ಳೆಯದಲ್ಲ ಎಂದು ನನ್ನ ಒಳಮನಸ್ಸು ಹೇಳುತ್ತಿತ್ತು.', hi: 'मुझे अंदर से लग रहा था कि जंगल वाला शॉर्टकट ठीक नहीं है।' },
                        { en: 'On the whole, I think online classes worked better than we expected.', kn: 'ಒಟ್ಟಾರೆಯಾಗಿ, ಆನ್‌ಲೈನ್ ತರಗತಿಗಳು ನಾವು ಅಂದುಕೊಂಡಿದ್ದಕ್ಕಿಂತ ಚೆನ್ನಾಗಿ ನಡೆದವು ಎಂದು ನನಗನಿಸುತ್ತದೆ.', hi: 'कुल मिलाकर, मुझे लगता है कि ऑनलाइन कक्षाएँ उम्मीद से बेहतर चलीं।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A debate in Dharwad', kn: 'ಧಾರವಾಡದಲ್ಲಿ ಒಂದು ಚರ್ಚಾಸ್ಪರ್ಧೆ', hi: 'धारवाड़ में एक वाद-विवाद' },
                    text: {
                        en: 'Every year, a college in Dharwad holds a debate on a question that matters to students. This year the topic was whether exams should be replaced by projects. Meghana spoke first, and in her view, projects teach students to think rather than memorise. She gave a clear example from her own school, where one science project had taught her more than any test. Rohan disagreed; frankly, he said, projects can be unfair because a few students end up doing all the work. His reasoning was strong, but some of his points were debatable. On the whole, the judges felt that Meghana had given better examples. After the debate, the two friends went for tea and kept arguing happily for another hour.',
                        kn: 'ಪ್ರತಿ ವರ್ಷ ಧಾರವಾಡದ ಒಂದು ಕಾಲೇಜು ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಮುಖ್ಯವಾದ ಒಂದು ಪ್ರಶ್ನೆಯ ಮೇಲೆ ಚರ್ಚಾಸ್ಪರ್ಧೆ ನಡೆಸುತ್ತದೆ. ಈ ವರ್ಷದ ವಿಷಯ: ಪರೀಕ್ಷೆಗಳ ಬದಲು ಪ್ರಾಜೆಕ್ಟ್‌ಗಳು ಇರಬೇಕೇ ಎಂಬುದು. ಮೊದಲು ಮೇಘನಾ ಮಾತನಾಡಿದಳು; ಅವಳ ಪ್ರಕಾರ, ಪ್ರಾಜೆಕ್ಟ್‌ಗಳು ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಬಾಯಿಪಾಠದ ಬದಲು ಯೋಚಿಸುವುದನ್ನು ಕಲಿಸುತ್ತವೆ. ತನ್ನ ಶಾಲೆಯಲ್ಲಿ ಮಾಡಿದ ಒಂದು ವಿಜ್ಞಾನ ಪ್ರಾಜೆಕ್ಟ್ ಯಾವುದೇ ಪರೀಕ್ಷೆಗಿಂತ ಹೆಚ್ಚು ಕಲಿಸಿತ್ತು ಎಂಬ ಸ್ಪಷ್ಟ ಉದಾಹರಣೆಯನ್ನು ಅವಳು ಕೊಟ್ಟಳು. ರೋಹನ್ ಒಪ್ಪಲಿಲ್ಲ; ನೇರವಾಗಿ ಹೇಳಬೇಕೆಂದರೆ, ಕೆಲವೇ ವಿದ್ಯಾರ್ಥಿಗಳು ಎಲ್ಲ ಕೆಲಸ ಮಾಡಬೇಕಾಗುವುದರಿಂದ ಪ್ರಾಜೆಕ್ಟ್‌ಗಳು ಅನ್ಯಾಯವಾಗಬಹುದು ಎಂದು ಅವನು ಹೇಳಿದ. ಅವನ ತರ್ಕ ಗಟ್ಟಿಯಾಗಿತ್ತು, ಆದರೆ ಅವನ ಕೆಲವು ಅಂಶಗಳು ಚರ್ಚಾಸ್ಪದವಾಗಿದ್ದವು. ಒಟ್ಟಾರೆಯಾಗಿ, ಮೇಘನಾ ಉತ್ತಮ ಉದಾಹರಣೆಗಳನ್ನು ಕೊಟ್ಟಳು ಎಂದು ತೀರ್ಪುಗಾರರಿಗೆ ಅನಿಸಿತು. ಸ್ಪರ್ಧೆಯ ನಂತರ ಇಬ್ಬರು ಸ್ನೇಹಿತರೂ ಚಹಾ ಕುಡಿಯಲು ಹೋದರು ಮತ್ತು ಇನ್ನೂ ಒಂದು ಗಂಟೆ ಖುಷಿಯಿಂದ ವಾದ ಮುಂದುವರಿಸಿದರು.',
                        hi: 'हर साल धारवाड़ का एक कॉलेज छात्रों के लिए ज़रूरी किसी सवाल पर वाद-विवाद प्रतियोगिता करवाता है। इस साल विषय था कि क्या परीक्षाओं की जगह प्रोजेक्ट होने चाहिए। मेघना पहले बोली, और उसके विचार में प्रोजेक्ट छात्रों को रटने के बजाय सोचना सिखाते हैं। उसने अपने स्कूल का एक साफ़ उदाहरण दिया, जहाँ एक विज्ञान प्रोजेक्ट ने उसे किसी भी परीक्षा से ज़्यादा सिखाया था। रोहन असहमत था; सच कहूँ तो, उसने कहा, प्रोजेक्ट अन्यायपूर्ण हो सकते हैं क्योंकि आख़िर में कुछ ही छात्र सारा काम करते हैं। उसका तर्क मज़बूत था, लेकिन उसकी कुछ बातें बहस का मुद्दा थीं। कुल मिलाकर, निर्णायकों को लगा कि मेघना ने बेहतर उदाहरण दिए थे। वाद-विवाद के बाद दोनों दोस्त चाय पीने गए और एक घंटे तक मज़े से बहस करते रहे।'
                    },
                    questions: [
                        {
                            q: { en: 'What was the topic of the debate?', kn: 'ಚರ್ಚಾಸ್ಪರ್ಧೆಯ ವಿಷಯ ಏನಾಗಿತ್ತು?', hi: 'वाद-विवाद का विषय क्या था?' },
                            options: [
                                { en: 'Whether exams should be replaced by projects', kn: 'ಪರೀಕ್ಷೆಗಳ ಬದಲು ಪ್ರಾಜೆಕ್ಟ್‌ಗಳು ಇರಬೇಕೇ ಎಂಬುದು', hi: 'क्या परीक्षाओं की जगह प्रोजेक्ट होने चाहिए' },
                                { en: 'Whether phones should be allowed in college', kn: 'ಕಾಲೇಜಿನಲ್ಲಿ ಫೋನ್ ಬಳಸಲು ಅನುಮತಿ ಇರಬೇಕೇ ಎಂಬುದು', hi: 'क्या कॉलेज में फ़ोन की इजाज़त होनी चाहिए' },
                                { en: 'Whether students should wear uniforms', kn: 'ವಿದ್ಯಾರ್ಥಿಗಳು ಸಮವಸ್ತ್ರ ಧರಿಸಬೇಕೇ ಎಂಬುದು', hi: 'क्या छात्रों को वर्दी पहननी चाहिए' },
                                { en: 'Whether college should start later', kn: 'ಕಾಲೇಜು ತಡವಾಗಿ ಶುರುವಾಗಬೇಕೇ ಎಂಬುದು', hi: 'क्या कॉलेज देर से शुरू होना चाहिए' }
                            ]
                        },
                        {
                            q: { en: "What was Rohan's main worry about projects?", kn: 'ಪ್ರಾಜೆಕ್ಟ್‌ಗಳ ಬಗ್ಗೆ ರೋಹನ್‌ನ ಮುಖ್ಯ ಚಿಂತೆ ಏನಾಗಿತ್ತು?', hi: 'प्रोजेक्ट को लेकर रोहन की मुख्य चिंता क्या थी?' },
                            options: [
                                { en: 'A few students end up doing all the work', kn: 'ಕೆಲವೇ ವಿದ್ಯಾರ್ಥಿಗಳು ಎಲ್ಲ ಕೆಲಸ ಮಾಡಬೇಕಾಗುತ್ತದೆ', hi: 'आख़िर में कुछ ही छात्र सारा काम करते हैं' },
                                { en: 'Projects cost too much money', kn: 'ಪ್ರಾಜೆಕ್ಟ್‌ಗಳಿಗೆ ತುಂಬಾ ಹಣ ಖರ್ಚಾಗುತ್ತದೆ', hi: 'प्रोजेक्ट में बहुत पैसा लगता है' },
                                { en: 'Projects take too long to mark', kn: 'ಪ್ರಾಜೆಕ್ಟ್‌ಗಳಿಗೆ ಅಂಕ ಕೊಡಲು ತುಂಬಾ ಸಮಯ ಬೇಕು', hi: 'प्रोजेक्ट जाँचने में बहुत समय लगता है' },
                                { en: 'Teachers do not like projects', kn: 'ಶಿಕ್ಷಕರಿಗೆ ಪ್ರಾಜೆಕ್ಟ್‌ಗಳು ಇಷ್ಟವಿಲ್ಲ', hi: 'शिक्षकों को प्रोजेक्ट पसंद नहीं' }
                            ]
                        },
                        {
                            q: { en: 'What did the two friends do after the debate?', kn: 'ಸ್ಪರ್ಧೆಯ ನಂತರ ಇಬ್ಬರು ಸ್ನೇಹಿತರು ಏನು ಮಾಡಿದರು?', hi: 'वाद-विवाद के बाद दोनों दोस्तों ने क्या किया?' },
                            options: [
                                { en: 'They had tea and kept arguing happily', kn: 'ಚಹಾ ಕುಡಿದು ಖುಷಿಯಿಂದ ವಾದ ಮುಂದುವರಿಸಿದರು', hi: 'चाय पी और मज़े से बहस करते रहे' },
                                { en: 'They went home without speaking', kn: 'ಮಾತನಾಡದೆ ಮನೆಗೆ ಹೋದರು', hi: 'बिना बात किए घर चले गए' },
                                { en: 'They wrote a project together', kn: 'ಒಟ್ಟಿಗೆ ಒಂದು ಪ್ರಾಜೆಕ್ಟ್ ಬರೆದರು', hi: 'साथ मिलकर एक प्रोजेक्ट लिखा' },
                                { en: 'They met the judges for dinner', kn: 'ತೀರ್ಪುಗಾರರ ಜೊತೆ ಊಟಕ್ಕೆ ಹೋದರು', hi: 'निर्णायकों के साथ खाना खाने गए' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Phones at the dinner table', kn: 'ಊಟದ ಮೇಜಿನಲ್ಲಿ ಫೋನ್', hi: 'खाने की मेज़ पर फ़ोन' },
                    scenario: {
                        en: 'Anjali and her younger brother Kiran, at home in Mysuru, discuss a new family rule.',
                        kn: 'ಮೈಸೂರಿನ ಮನೆಯಲ್ಲಿ ಅಂಜಲಿ ಮತ್ತು ಅವಳ ತಮ್ಮ ಕಿರಣ್ ಒಂದು ಹೊಸ ಮನೆ ನಿಯಮದ ಬಗ್ಗೆ ಚರ್ಚಿಸುತ್ತಾರೆ.',
                        hi: 'मैसूरु में घर पर अंजलि और उसका छोटा भाई किरण परिवार के एक नए नियम पर बात करते हैं।'
                    },
                    speakers: [{ name: 'Anjali', voice: 'f' }, { name: 'Kiran', voice: 'm' }],
                    lines: [
                        { speaker: 'Anjali', en: 'Kiran, Amma wants a new rule: no phones at the dinner table. What do you think?', kn: 'ಕಿರಣ್, ಅಮ್ಮ ಒಂದು ಹೊಸ ನಿಯಮ ತರಬೇಕು ಅಂತಿದ್ದಾರೆ: ಊಟದ ಮೇಜಿನಲ್ಲಿ ಫೋನ್ ಬೇಡ. ನಿನಗೇನನಿಸುತ್ತದೆ?', hi: 'किरण, अम्मा एक नया नियम चाहती हैं: खाने की मेज़ पर कोई फ़ोन नहीं। तुम्हें क्या लगता है?' },
                        { speaker: 'Kiran', en: 'Frankly, I think it is a bit strict. Sometimes I need to reply to my friends.', kn: 'ನೇರವಾಗಿ ಹೇಳಬೇಕೆಂದರೆ, ಇದು ಸ್ವಲ್ಪ ಕಟ್ಟುನಿಟ್ಟು ಅನಿಸುತ್ತದೆ. ಕೆಲವೊಮ್ಮೆ ನಾನು ಸ್ನೇಹಿತರಿಗೆ ಉತ್ತರಿಸಬೇಕಾಗುತ್ತದೆ.', hi: 'सच कहूँ तो, यह थोड़ा सख़्त है। कभी-कभी मुझे दोस्तों को जवाब देना होता है।' },
                        { speaker: 'Anjali', en: "As far as I'm concerned, dinner is the only time we all sit together.", kn: 'ನನ್ನ ಮಟ್ಟಿಗೆ, ನಾವೆಲ್ಲರೂ ಒಟ್ಟಿಗೆ ಕೂರುವ ಸಮಯ ಅಂದರೆ ರಾತ್ರಿ ಊಟ ಮಾತ್ರ.', hi: 'जहाँ तक मेरी बात है, रात का खाना ही वह समय है जब हम सब साथ बैठते हैं।' },
                        { speaker: 'Kiran', en: 'That is true, but what if there is an urgent message?', kn: 'ಅದು ನಿಜ, ಆದರೆ ಏನಾದರೂ ತುರ್ತು ಸಂದೇಶ ಬಂದರೆ?', hi: 'यह सच है, पर अगर कोई ज़रूरी मैसेज आ जाए तो?' },
                        { speaker: 'Anjali', en: 'Then you can step away for a minute. For instance, Appa does that with his work calls.', kn: 'ಆಗ ಒಂದು ನಿಮಿಷ ಎದ್ದು ಹೋಗಬಹುದು. ಉದಾಹರಣೆಗೆ, ಅಪ್ಪ ತಮ್ಮ ಕೆಲಸದ ಕರೆಗಳಿಗೆ ಹಾಗೆಯೇ ಮಾಡುತ್ತಾರೆ.', hi: 'तब तुम एक मिनट के लिए उठकर जा सकते हो। उदाहरण के लिए, अप्पा अपने काम के फ़ोन पर ऐसा ही करते हैं।' },
                        { speaker: 'Kiran', en: 'Hmm. On the whole, I suppose it is fair, but only for dinner, not lunch.', kn: 'ಹ್ಮ್. ಒಟ್ಟಾರೆಯಾಗಿ ಇದು ನ್ಯಾಯವೇ ಅನಿಸುತ್ತದೆ, ಆದರೆ ರಾತ್ರಿ ಊಟಕ್ಕೆ ಮಾತ್ರ, ಮಧ್ಯಾಹ್ನಕ್ಕೆ ಅಲ್ಲ.', hi: 'हम्म। कुल मिलाकर मुझे लगता है यह ठीक है, पर सिर्फ़ रात के खाने पर, दोपहर में नहीं।' },
                        { speaker: 'Anjali', en: 'In my view, that is a reasonable deal. Shall we tell Amma together?', kn: 'ನನ್ನ ಪ್ರಕಾರ, ಅದು ಸರಿಯಾದ ಒಪ್ಪಂದ. ನಾವಿಬ್ಬರೂ ಸೇರಿ ಅಮ್ಮನಿಗೆ ಹೇಳೋಣವಾ?', hi: 'मेरे विचार में, यह ठीक-ठाक सौदा है। चलो, साथ मिलकर अम्मा को बताएँ?' },
                        { speaker: 'Kiran', en: 'Yes, but everyone must know that I agreed only after a long debate!', kn: 'ಹೌದು, ಆದರೆ ದೊಡ್ಡ ಚರ್ಚೆಯ ನಂತರವೇ ನಾನು ಒಪ್ಪಿದೆ ಎಂದು ಎಲ್ಲರಿಗೂ ಗೊತ್ತಾಗಬೇಕು!', hi: 'हाँ, पर सबको पता होना चाहिए कि मैं लंबी बहस के बाद ही माना!' },
                        { speaker: 'Anjali', en: 'Noted. Your stance has been heard, Your Honour.', kn: 'ಸರಿ, ಗಮನಿಸಲಾಗಿದೆ. ತಮ್ಮ ನಿಲುವನ್ನು ಕೇಳಿಸಿಕೊಳ್ಳಲಾಗಿದೆ, ಮಹಾಸ್ವಾಮಿ.', hi: 'नोट कर लिया। आपका रुख़ सुन लिया गया है, जज साहब।' },
                        { speaker: 'Kiran', en: 'Very funny. Let us go and eat before the food gets cold.', kn: 'ತುಂಬಾ ತಮಾಷೆ. ಊಟ ತಣ್ಣಗಾಗುವ ಮೊದಲು ಹೋಗಿ ತಿನ್ನೋಣ ಬಾ.', hi: 'बड़ा मज़ाक़ है। चलो, खाना ठंडा होने से पहले खा लेते हैं।' }
                    ],
                    questions: [
                        {
                            q: { en: 'What rule does Amma want?', kn: 'ಅಮ್ಮ ಯಾವ ನಿಯಮ ತರಬೇಕೆಂದಿದ್ದಾರೆ?', hi: 'अम्मा कौन-सा नियम चाहती हैं?' },
                            options: [
                                { en: 'No phones at the dinner table', kn: 'ಊಟದ ಮೇಜಿನಲ್ಲಿ ಫೋನ್ ಬೇಡ', hi: 'खाने की मेज़ पर फ़ोन नहीं' },
                                { en: 'No television after nine', kn: 'ಒಂಬತ್ತರ ನಂತರ ಟಿವಿ ಬೇಡ', hi: 'नौ बजे के बाद टीवी नहीं' },
                                { en: 'No junk food at home', kn: 'ಮನೆಯಲ್ಲಿ ಜಂಕ್ ಫುಡ್ ಬೇಡ', hi: 'घर में जंक फ़ूड नहीं' },
                                { en: 'No friends visiting at night', kn: 'ರಾತ್ರಿ ಸ್ನೇಹಿತರು ಬರುವಂತಿಲ್ಲ', hi: 'रात को दोस्तों का आना मना' }
                            ]
                        },
                        {
                            q: { en: 'Why did Kiran first think the rule was strict?', kn: 'ಈ ನಿಯಮ ಕಟ್ಟುನಿಟ್ಟು ಎಂದು ಕಿರಣ್‌ಗೆ ಮೊದಲು ಯಾಕೆ ಅನಿಸಿತು?', hi: 'किरण को पहले यह नियम सख़्त क्यों लगा?' },
                            options: [
                                { en: 'He sometimes needs to reply to friends', kn: 'ಕೆಲವೊಮ್ಮೆ ಅವನು ಸ್ನೇಹಿತರಿಗೆ ಉತ್ತರಿಸಬೇಕಾಗುತ್ತದೆ', hi: 'उसे कभी-कभी दोस्तों को जवाब देना होता है' },
                                { en: 'He eats dinner very late', kn: 'ಅವನು ತುಂಬಾ ತಡವಾಗಿ ಊಟ ಮಾಡುತ್ತಾನೆ', hi: 'वह बहुत देर से खाना खाता है' },
                                { en: 'He wants to watch cricket', kn: 'ಅವನಿಗೆ ಕ್ರಿಕೆಟ್ ನೋಡಬೇಕು', hi: 'उसे क्रिकेट देखना है' },
                                { en: "He does not like Amma's cooking", kn: 'ಅವನಿಗೆ ಅಮ್ಮನ ಅಡುಗೆ ಇಷ್ಟವಿಲ್ಲ', hi: 'उसे अम्मा का खाना पसंद नहीं' }
                            ]
                        },
                        {
                            q: { en: 'What does Appa do with his work calls?', kn: 'ಕೆಲಸದ ಕರೆಗಳು ಬಂದಾಗ ಅಪ್ಪ ಏನು ಮಾಡುತ್ತಾರೆ?', hi: 'काम के फ़ोन आने पर अप्पा क्या करते हैं?' },
                            options: [
                                { en: 'He steps away for a minute', kn: 'ಒಂದು ನಿಮಿಷ ಎದ್ದು ಹೋಗುತ್ತಾರೆ', hi: 'एक मिनट के लिए उठकर चले जाते हैं' },
                                { en: 'He switches off his phone', kn: 'ಫೋನ್ ಆಫ್ ಮಾಡುತ್ತಾರೆ', hi: 'फ़ोन बंद कर देते हैं' },
                                { en: 'He answers at the table', kn: 'ಮೇಜಿನಲ್ಲೇ ಮಾತನಾಡುತ್ತಾರೆ', hi: 'मेज़ पर ही बात करते हैं' },
                                { en: 'He asks Kiran to answer', kn: 'ಕಿರಣ್‌ಗೆ ಉತ್ತರಿಸಲು ಹೇಳುತ್ತಾರೆ', hi: 'किरण से जवाब देने को कहते हैं' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Give your opinion on whether students should be allowed to use phones in college. Say what you think, give two reasons and an example, and finish with your overall view.',
                        sample: "In my view, students should be allowed to use phones in college, but with clear limits. Firstly, phones are useful for learning; for instance, I often look up a word or a diagram during a lab session. Secondly, many students travel long distances, and parents feel safer when they can reach them. However, I don't think phones should be used during lectures, because they distract both the student and the teacher. As far as I'm concerned, the problem is not the phone but how we use it. On the whole, I'd say a sensible rule, like phones on silent in class, is far better than a total ban.",
                        checklist: ['I said clearly what I think', 'I gave at least two reasons', 'I gave an example with "for instance"', 'I used "in my view" or "as far as I\'m concerned"', 'I finished with my overall opinion']
                    }
                }
            ]
        },
        '2:1': {
            name: 'Agreeing and disagreeing',
            lessons: [
                {
                    kind: 'words', title: 'Agreeing politely', list: [
                        { en: 'see eye to eye', kn: 'ಒಂದೇ ಅಭಿಪ್ರಾಯ ಹೊಂದಿರು', hi: 'एक राय होना', pic: '👀', def: 'to agree completely with someone about something' },
                        { en: 'fair point', kn: 'ಸರಿಯಾದ ಮಾತು', hi: 'सही बात', pic: '👌', def: 'words you say when you accept that someone has made a good argument' },
                        { en: "I couldn't agree more", kn: 'ನಾನು ಸಂಪೂರ್ಣವಾಗಿ ಒಪ್ಪುತ್ತೇನೆ', hi: 'मैं पूरी तरह सहमत हूँ', pic: '💯', def: 'words that mean you agree completely' },
                        { en: 'concede', kn: 'ಒಪ್ಪಿಕೊಳ್ಳು', hi: 'मान लेना', pic: '🏳️', def: 'to admit, sometimes unwillingly, that someone else is right' },
                        { en: 'to some extent', kn: 'ಸ್ವಲ್ಪ ಮಟ್ಟಿಗೆ', hi: 'कुछ हद तक', pic: '📏', def: 'partly, but not completely' },
                        { en: 'common ground', kn: 'ಇಬ್ಬರೂ ಒಪ್ಪುವ ಅಂಶ', hi: 'साझा आधार', pic: '🌉', def: 'ideas or interests that two people share even when they disagree' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Agreeing and disagreeing 1', list: [
                        { read: true, en: 'My father and I rarely see eye to eye about cricket.', kn: 'ಕ್ರಿಕೆಟ್ ವಿಷಯದಲ್ಲಿ ನನಗೂ ನನ್ನ ಅಪ್ಪನಿಗೂ ಒಂದೇ ಅಭಿಪ್ರಾಯ ಇರುವುದು ತೀರಾ ಅಪರೂಪ.', hi: 'क्रिकेट के मामले में मेरी और पापा की राय कम ही मिलती है।' },
                        { en: 'That is a fair point; I had not thought about the cost.', kn: 'ಅದು ಸರಿಯಾದ ಮಾತು; ಖರ್ಚಿನ ಬಗ್ಗೆ ನಾನು ಯೋಚಿಸಿಯೇ ಇರಲಿಲ್ಲ.', hi: 'यह सही बात है; ख़र्च के बारे में तो मैंने सोचा ही नहीं था।', acc: { en: ["That's a fair point; I hadn't thought about the cost."] } },
                        { read: true, en: "I couldn't agree more; the library should stay open on Sundays.", kn: 'ನಾನು ಸಂಪೂರ್ಣವಾಗಿ ಒಪ್ಪುತ್ತೇನೆ; ಗ್ರಂಥಾಲಯ ಭಾನುವಾರವೂ ತೆರೆದಿರಬೇಕು.', hi: 'मैं पूरी तरह सहमत हूँ; पुस्तकालय रविवार को भी खुला रहना चाहिए।', acc: { en: ['I could not agree more; the library should stay open on Sundays.'] } },
                        { en: 'I concede that you were right; the road through Sakleshpur was much quicker.', kn: 'ನೀವು ಹೇಳಿದ್ದು ಸರಿ ಎಂದು ಒಪ್ಪಿಕೊಳ್ಳುತ್ತೇನೆ; ಸಕಲೇಶಪುರದ ದಾರಿ ತುಂಬಾ ಬೇಗ ತಲುಪಿಸಿತು.', hi: 'मैं मानता हूँ कि आप सही थे; सकलेशपुर वाले रास्ते से हम कहीं जल्दी पहुँचे।', acc: { hi: ['मैं मानती हूँ कि आप सही थे; सकलेशपुर वाले रास्ते से हम कहीं जल्दी पहुँचे।'] } },
                        { read: true, en: 'To some extent you are right, but let us look for common ground.', kn: 'ಸ್ವಲ್ಪ ಮಟ್ಟಿಗೆ ನೀವು ಹೇಳುವುದು ಸರಿ, ಆದರೆ ನಾವಿಬ್ಬರೂ ಒಪ್ಪುವ ಅಂಶಗಳನ್ನು ಹುಡುಕೋಣ.', hi: 'कुछ हद तक आप सही हैं, लेकिन चलिए कोई साझा आधार ढूँढते हैं।' }
                    ]
                },
                {
                    kind: 'words', title: 'Disagreeing and changing your mind', list: [
                        { en: 'with respect', kn: 'ಗೌರವದಿಂದ ಹೇಳುವುದಾದರೆ', hi: 'आदर सहित', pic: '🙏', def: 'polite words used just before you disagree with someone' },
                        { en: 'beg to differ', kn: 'ನನ್ನ ಅಭಿಪ್ರಾಯ ಬೇರೆ', hi: 'मेरी राय अलग है', pic: '🙅', def: 'a polite way of saying that you do not agree' },
                        { en: 'reconsider', kn: 'ಮರುಪರಿಶೀಲಿಸು', hi: 'पुनर्विचार करना', pic: '🔄', def: 'to think again about a decision or opinion and perhaps change it' },
                        { en: 'change of heart', kn: 'ಮನಸ್ಸು ಬದಲಾಗುವುದು', hi: 'मन बदलना', pic: '💗', def: 'a change in what you think or feel about something' },
                        { en: 'open-minded', kn: 'ವಿಶಾಲ ಮನಸ್ಸಿನ', hi: 'खुले विचारों वाला', pic: '🔓', def: 'happy to listen to new ideas and different opinions' },
                        { en: 'agree to disagree', kn: 'ಭಿನ್ನಾಭಿಪ್ರಾಯವನ್ನು ಒಪ್ಪಿಕೊಳ್ಳು', hi: 'अपनी-अपनी राय रखना', pic: '🤷', def: 'to accept that two people have different opinions and stop arguing' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Agreeing and disagreeing 2', list: [
                        { read: true, en: 'With respect, sir, I think the data tells a different story.', kn: 'ಗೌರವದಿಂದ ಹೇಳುವುದಾದರೆ ಸರ್, ಈ ಅಂಕಿಅಂಶಗಳು ಬೇರೆಯೇ ಕಥೆ ಹೇಳುತ್ತವೆ ಎಂದು ನನಗನಿಸುತ್ತದೆ.', hi: 'आदर सहित कहूँ तो सर, मुझे लगता है कि ये आँकड़े कुछ और ही कहानी कहते हैं।' },
                        { en: 'I beg to differ; the old market has far more character than the mall.', kn: 'ನನ್ನ ಅಭಿಪ್ರಾಯ ಬೇರೆ; ಮಾಲ್‌ಗಿಂತ ಹಳೆಯ ಮಾರುಕಟ್ಟೆಗೆ ಹೆಚ್ಚು ವಿಶೇಷತೆ ಇದೆ.', hi: 'माफ़ कीजिए, मेरी राय अलग है; मॉल से कहीं ज़्यादा रौनक पुराने बाज़ार में है।' },
                        { read: true, en: 'After hearing both sides, the principal agreed to reconsider her decision.', kn: 'ಎರಡೂ ಕಡೆಯ ಮಾತು ಕೇಳಿದ ಮೇಲೆ, ಪ್ರಾಂಶುಪಾಲರು ತಮ್ಮ ನಿರ್ಧಾರವನ್ನು ಮರುಪರಿಶೀಲಿಸಲು ಒಪ್ಪಿದರು.', hi: 'दोनों पक्षों की बात सुनने के बाद प्रधानाचार्या अपने फ़ैसले पर पुनर्विचार करने को राज़ी हुईं।' },
                        { read: true, en: 'He was against the trip at first, but then he had a change of heart.', kn: 'ಮೊದಲು ಅವನು ಪ್ರವಾಸಕ್ಕೆ ವಿರೋಧವಾಗಿದ್ದ, ಆದರೆ ನಂತರ ಅವನ ಮನಸ್ಸು ಬದಲಾಯಿತು.', hi: 'पहले वह यात्रा के ख़िलाफ़ था, पर फिर उसका मन बदल गया।' },
                        { en: 'We are both open-minded, so we can simply agree to disagree.', kn: 'ನಾವಿಬ್ಬರೂ ವಿಶಾಲ ಮನಸ್ಸಿನವರು, ಹಾಗಾಗಿ ಭಿನ್ನಾಭಿಪ್ರಾಯವನ್ನು ಸುಮ್ಮನೆ ಒಪ್ಪಿಕೊಂಡು ಮುಂದೆ ಸಾಗಬಹುದು.', hi: 'हम दोनों खुले विचारों वाले हैं, इसलिए अपनी-अपनी राय रखकर भी आराम से आगे बढ़ सकते हैं।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'The last school trip', kn: 'ಕೊನೆಯ ಶಾಲಾ ಪ್ರವಾಸ', hi: 'स्कूल की आख़िरी यात्रा' },
                    text: {
                        en: "Class twelve in Hassan had to choose a place for their last school trip. Nikhil wanted Gokarna for the beach, but Divya wanted Hampi for its history. At first the two did not see eye to eye, and the discussion became loud. Then Divya said, 'With respect, a beach is fun, but Hampi is something we will remember all our lives.' Nikhil conceded that she had a fair point, but he was worried about the heat. Their teacher helped them find common ground: they would explore Hampi in the cool morning and rest by the Tungabhadra river in the afternoon. In the end Nikhil had a change of heart and voted for Hampi himself. A month later, everyone agreed that it had been the best trip they had ever taken.",
                        kn: 'ಹಾಸನದ ಹನ್ನೆರಡನೇ ತರಗತಿಯ ವಿದ್ಯಾರ್ಥಿಗಳು ತಮ್ಮ ಕೊನೆಯ ಶಾಲಾ ಪ್ರವಾಸಕ್ಕೆ ಒಂದು ಸ್ಥಳವನ್ನು ಆಯ್ಕೆ ಮಾಡಬೇಕಿತ್ತು. ನಿಖಿಲ್‌ಗೆ ಸಮುದ್ರತೀರಕ್ಕಾಗಿ ಗೋಕರ್ಣ ಬೇಕಿತ್ತು, ಆದರೆ ದಿವ್ಯಾಗೆ ಇತಿಹಾಸಕ್ಕಾಗಿ ಹಂಪಿ ಬೇಕಿತ್ತು. ಮೊದಲು ಇಬ್ಬರಿಗೂ ಒಂದೇ ಅಭಿಪ್ರಾಯ ಇರಲಿಲ್ಲ, ಚರ್ಚೆ ಜೋರಾಯಿತು. ಆಗ ದಿವ್ಯಾ ಹೇಳಿದಳು, "ಗೌರವದಿಂದ ಹೇಳುವುದಾದರೆ, ಸಮುದ್ರತೀರ ಮಜಾ ಕೊಡುತ್ತದೆ, ಆದರೆ ಹಂಪಿಯನ್ನು ನಾವು ಜೀವನವಿಡೀ ನೆನಪಿಟ್ಟುಕೊಳ್ಳುತ್ತೇವೆ." ಅವಳ ಮಾತು ಸರಿ ಎಂದು ನಿಖಿಲ್ ಒಪ್ಪಿಕೊಂಡ, ಆದರೆ ಅವನಿಗೆ ಬಿಸಿಲಿನ ಚಿಂತೆ ಇತ್ತು. ಅವರ ಶಿಕ್ಷಕರು ಇಬ್ಬರೂ ಒಪ್ಪುವ ದಾರಿ ಹುಡುಕಲು ಸಹಾಯ ಮಾಡಿದರು: ತಂಪಾದ ಬೆಳಗಿನಲ್ಲಿ ಹಂಪಿ ನೋಡಿ, ಮಧ್ಯಾಹ್ನ ತುಂಗಭದ್ರಾ ನದಿಯ ದಡದಲ್ಲಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯುವುದು. ಕೊನೆಗೆ ನಿಖಿಲ್‌ನ ಮನಸ್ಸು ಬದಲಾಯಿತು ಮತ್ತು ಅವನೇ ಹಂಪಿಗೆ ಮತ ಹಾಕಿದ. ಒಂದು ತಿಂಗಳ ನಂತರ, ಅದು ತಾವು ಹೋದ ಅತ್ಯುತ್ತಮ ಪ್ರವಾಸ ಎಂದು ಎಲ್ಲರೂ ಒಪ್ಪಿಕೊಂಡರು.',
                        hi: 'हासन की बारहवीं कक्षा को अपनी आख़िरी स्कूल यात्रा के लिए एक जगह चुननी थी। निखिल समुद्र तट के लिए गोकर्ण जाना चाहता था, पर दिव्या इतिहास के लिए हम्पी जाना चाहती थी। शुरू में दोनों की राय नहीं मिली, और बहस ज़ोर पकड़ने लगी। तब दिव्या ने कहा, "आदर सहित कहूँ तो, समुद्र तट मज़ेदार है, लेकिन हम्पी हमें ज़िंदगी भर याद रहेगा।" निखिल ने माना कि उसकी बात सही है, पर उसे गर्मी की चिंता थी। उनके शिक्षक ने उन्हें साझा आधार ढूँढने में मदद की: वे ठंडी सुबह में हम्पी घूमेंगे और दोपहर में तुंगभद्रा नदी के किनारे आराम करेंगे। आख़िर में निखिल का मन बदल गया और उसने ख़ुद हम्पी के लिए वोट दिया। एक महीने बाद सब मान गए कि वह उनकी अब तक की सबसे अच्छी यात्रा थी।'
                    },
                    questions: [
                        {
                            q: { en: 'Why did Nikhil want to go to Gokarna?', kn: 'ನಿಖಿಲ್ ಗೋಕರ್ಣಕ್ಕೆ ಯಾಕೆ ಹೋಗಬೇಕೆಂದಿದ್ದ?', hi: 'निखिल गोकर्ण क्यों जाना चाहता था?' },
                            options: [
                                { en: 'For the beach', kn: 'ಸಮುದ್ರತೀರಕ್ಕಾಗಿ', hi: 'समुद्र तट के लिए' },
                                { en: 'For the temples', kn: 'ದೇವಸ್ಥಾನಗಳಿಗಾಗಿ', hi: 'मंदिरों के लिए' },
                                { en: 'For the food', kn: 'ಊಟಕ್ಕಾಗಿ', hi: 'खाने के लिए' },
                                { en: 'For trekking', kn: 'ಚಾರಣಕ್ಕಾಗಿ', hi: 'ट्रेकिंग के लिए' }
                            ]
                        },
                        {
                            q: { en: 'What was Nikhil worried about?', kn: 'ನಿಖಿಲ್‌ಗೆ ಯಾವುದರ ಬಗ್ಗೆ ಚಿಂತೆ ಇತ್ತು?', hi: 'निखिल को किस बात की चिंता थी?' },
                            options: [
                                { en: 'The heat', kn: 'ಬಿಸಿಲು', hi: 'गर्मी' },
                                { en: 'The cost', kn: 'ಖರ್ಚು', hi: 'ख़र्च' },
                                { en: 'The long bus ride', kn: 'ದೀರ್ಘ ಬಸ್ ಪ್ರಯಾಣ', hi: 'लंबा बस सफ़र' },
                                { en: 'The rain', kn: 'ಮಳೆ', hi: 'बारिश' }
                            ]
                        },
                        {
                            q: { en: 'What plan did the teacher help them agree on?', kn: 'ಶಿಕ್ಷಕರು ಯಾವ ಯೋಜನೆಗೆ ಒಪ್ಪಲು ಸಹಾಯ ಮಾಡಿದರು?', hi: 'शिक्षक ने उन्हें किस योजना पर सहमत होने में मदद की?' },
                            options: [
                                { en: 'Hampi in the morning, rest by the river in the afternoon', kn: 'ಬೆಳಿಗ್ಗೆ ಹಂಪಿ, ಮಧ್ಯಾಹ್ನ ನದಿ ದಡದಲ್ಲಿ ವಿಶ್ರಾಂತಿ', hi: 'सुबह हम्पी, दोपहर में नदी किनारे आराम' },
                                { en: 'One day in Gokarna and one day in Hampi', kn: 'ಒಂದು ದಿನ ಗೋಕರ್ಣ, ಒಂದು ದಿನ ಹಂಪಿ', hi: 'एक दिन गोकर्ण, एक दिन हम्पी' },
                                { en: 'Stay in Hassan and visit a museum', kn: 'ಹಾಸನದಲ್ಲೇ ಇದ್ದು ವಸ್ತುಸಂಗ್ರಹಾಲಯ ನೋಡುವುದು', hi: 'हासन में ही रहकर संग्रहालय देखना' },
                                { en: 'Visit Hampi only at night', kn: 'ರಾತ್ರಿ ಮಾತ್ರ ಹಂಪಿ ನೋಡುವುದು', hi: 'सिर्फ़ रात में हम्पी घूमना' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Planning the college fest', kn: 'ಕಾಲೇಜು ಉತ್ಸವದ ತಯಾರಿ', hi: 'कॉलेज फ़ेस्ट की तैयारी' },
                    scenario: {
                        en: 'Pooja and Sameer, two students on the fest committee of a college in Mangaluru, disagree about how to spend the money.',
                        kn: 'ಮಂಗಳೂರಿನ ಒಂದು ಕಾಲೇಜಿನ ಉತ್ಸವ ಸಮಿತಿಯಲ್ಲಿರುವ ಪೂಜಾ ಮತ್ತು ಸಮೀರ್, ಹಣವನ್ನು ಹೇಗೆ ಖರ್ಚು ಮಾಡಬೇಕು ಎಂಬ ಬಗ್ಗೆ ಒಪ್ಪುವುದಿಲ್ಲ.',
                        hi: 'मंगलुरु के एक कॉलेज की फ़ेस्ट समिति के दो छात्र, पूजा और समीर, पैसे ख़र्च करने के तरीक़े पर असहमत हैं।'
                    },
                    speakers: [{ name: 'Pooja', voice: 'f' }, { name: 'Sameer', voice: 'm' }],
                    lines: [
                        { speaker: 'Pooja', en: 'Sameer, I heard you want to invite a film star to the college fest. Is that true?', kn: 'ಸಮೀರ್, ಕಾಲೇಜು ಉತ್ಸವಕ್ಕೆ ನೀನು ಒಬ್ಬ ಸಿನಿಮಾ ತಾರೆಯನ್ನು ಕರೆಯಬೇಕು ಅಂತಿದ್ದೀಯಂತೆ. ನಿಜವಾ?', hi: 'समीर, सुना है तुम कॉलेज फ़ेस्ट में किसी फ़िल्मी सितारे को बुलाना चाहते हो। क्या यह सच है?' },
                        { speaker: 'Sameer', en: "Yes! A big name will bring huge crowds. Don't you think so?", kn: 'ಹೌದು! ದೊಡ್ಡ ಹೆಸರು ಬಂದರೆ ಜನ ಕಿಕ್ಕಿರಿದು ಸೇರುತ್ತಾರೆ. ನಿನಗೆ ಹಾಗನಿಸುವುದಿಲ್ಲವಾ?', hi: 'हाँ! बड़ा नाम आएगा तो भारी भीड़ जुटेगी। तुम्हें ऐसा नहीं लगता?' },
                        { speaker: 'Pooja', en: "To some extent, yes. But with respect, the star's fee would eat up half our money.", kn: 'ಸ್ವಲ್ಪ ಮಟ್ಟಿಗೆ ಹೌದು. ಆದರೆ ಗೌರವದಿಂದ ಹೇಳುವುದಾದರೆ, ಆ ತಾರೆಯ ಸಂಭಾವನೆಗೇ ನಮ್ಮ ಅರ್ಧ ಹಣ ಹೋಗುತ್ತದೆ.', hi: 'कुछ हद तक, हाँ। लेकिन आदर सहित कहूँ तो, उस सितारे की फ़ीस में ही हमारा आधा पैसा चला जाएगा।' },
                        { speaker: 'Sameer', en: "That's a fair point. Still, a fest without a star feels a little ordinary.", kn: 'ಅದು ಸರಿಯಾದ ಮಾತು. ಆದರೂ, ತಾರೆ ಇಲ್ಲದ ಉತ್ಸವ ಸ್ವಲ್ಪ ಸಪ್ಪೆ ಅನಿಸುತ್ತದೆ.', hi: 'यह सही बात है। फिर भी, बिना सितारे के फ़ेस्ट थोड़ा फीका लगता है।' },
                        { speaker: 'Pooja', en: 'I beg to differ. Last year the Yakshagana troupe from Udupi was the best part of the fest.', kn: 'ನನ್ನ ಅಭಿಪ್ರಾಯ ಬೇರೆ. ಕಳೆದ ವರ್ಷ ಉಡುಪಿಯ ಯಕ್ಷಗಾನ ತಂಡವೇ ಉತ್ಸವದ ಅತ್ಯುತ್ತಮ ಭಾಗವಾಗಿತ್ತು.', hi: 'मेरी राय अलग है। पिछले साल उडुपी की यक्षगान मंडली ही फ़ेस्ट का सबसे अच्छा हिस्सा थी।' },
                        { speaker: 'Sameer', en: "Hmm, I couldn't agree more about that show. Everyone was dancing at the end.", kn: 'ಹ್ಮ್, ಆ ಪ್ರದರ್ಶನದ ಬಗ್ಗೆ ನಾನು ಸಂಪೂರ್ಣವಾಗಿ ಒಪ್ಪುತ್ತೇನೆ. ಕೊನೆಯಲ್ಲಿ ಎಲ್ಲರೂ ಕುಣಿಯುತ್ತಿದ್ದರು.', hi: 'हम्म, उस शो के बारे में मैं पूरी तरह सहमत हूँ। आख़िर में सब नाच रहे थे।' },
                        { speaker: 'Pooja', en: 'So why not invite them again and spend the rest on better food and lights?', kn: 'ಹಾಗಾದರೆ ಅವರನ್ನೇ ಮತ್ತೆ ಕರೆದು, ಉಳಿದ ಹಣವನ್ನು ಒಳ್ಳೆಯ ಊಟ ಮತ್ತು ದೀಪಾಲಂಕಾರಕ್ಕೆ ಯಾಕೆ ಖರ್ಚು ಮಾಡಬಾರದು?', hi: 'तो क्यों न उन्हें फिर से बुलाएँ और बाक़ी पैसा अच्छे खाने और रोशनी पर लगाएँ?' },
                        { speaker: 'Sameer', en: "Okay, you have changed my mind. I'll reconsider and talk to the committee tomorrow.", kn: 'ಸರಿ, ನೀನು ನನ್ನ ಮನಸ್ಸು ಬದಲಾಯಿಸಿದೆ. ನಾನು ಮರುಪರಿಶೀಲಿಸಿ ನಾಳೆ ಸಮಿತಿಯ ಜೊತೆ ಮಾತನಾಡುತ್ತೇನೆ.', hi: 'ठीक है, तुमने मेरा मन बदल दिया। मैं दोबारा सोचूँगा और कल समिति से बात करूँगा।' },
                        { speaker: 'Pooja', en: 'Thank you for being so open-minded. I know it was your favourite idea.', kn: 'ಇಷ್ಟು ವಿಶಾಲ ಮನಸ್ಸಿನಿಂದ ಯೋಚಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದ. ಅದು ನಿನ್ನ ಅಚ್ಚುಮೆಚ್ಚಿನ ಯೋಚನೆ ಎಂದು ನನಗೆ ಗೊತ್ತು.', hi: 'इतने खुले मन से सोचने के लिए शुक्रिया। मुझे पता है कि यह तुम्हारा पसंदीदा आइडिया था।' },
                        { speaker: 'Sameer', en: 'Well, we can still agree to disagree about which film star is the best!', kn: 'ಸರಿ, ಯಾವ ಸಿನಿಮಾ ತಾರೆ ಅತ್ಯುತ್ತಮ ಎಂಬ ವಿಷಯದಲ್ಲಿ ಮಾತ್ರ ನಮ್ಮ ಅಭಿಪ್ರಾಯಗಳು ಬೇರೆ ಬೇರೆಯಾಗಿಯೇ ಇರಲಿ!', hi: 'ख़ैर, कौन-सा फ़िल्मी सितारा सबसे अच्छा है, इस पर हम अपनी-अपनी राय रख सकते हैं!' }
                    ],
                    questions: [
                        {
                            q: { en: 'What did Sameer want for the fest?', kn: 'ಉತ್ಸವಕ್ಕಾಗಿ ಸಮೀರ್ ಏನು ಬಯಸಿದ್ದ?', hi: 'समीर फ़ेस्ट के लिए क्या चाहता था?' },
                            options: [
                                { en: 'To invite a film star', kn: 'ಒಬ್ಬ ಸಿನಿಮಾ ತಾರೆಯನ್ನು ಕರೆಯುವುದು', hi: 'किसी फ़िल्मी सितारे को बुलाना' },
                                { en: 'To hold a cricket match', kn: 'ಕ್ರಿಕೆಟ್ ಪಂದ್ಯ ನಡೆಸುವುದು', hi: 'क्रिकेट मैच करवाना' },
                                { en: 'To cancel the fest', kn: 'ಉತ್ಸವವನ್ನು ರದ್ದು ಮಾಡುವುದು', hi: 'फ़ेस्ट रद्द करना' },
                                { en: 'To build a new stage', kn: 'ಹೊಸ ವೇದಿಕೆ ಕಟ್ಟುವುದು', hi: 'नया मंच बनाना' }
                            ]
                        },
                        {
                            q: { en: "What was Pooja's main objection?", kn: 'ಪೂಜಾಳ ಮುಖ್ಯ ಆಕ್ಷೇಪ ಏನಾಗಿತ್ತು?', hi: 'पूजा की मुख्य आपत्ति क्या थी?' },
                            options: [
                                { en: "The star's fee would use up half the money", kn: 'ತಾರೆಯ ಸಂಭಾವನೆಗೇ ಅರ್ಧ ಹಣ ಹೋಗುತ್ತದೆ', hi: 'सितारे की फ़ीस में ही आधा पैसा चला जाएगा' },
                                { en: 'The star would arrive late', kn: 'ತಾರೆ ತಡವಾಗಿ ಬರುತ್ತಾರೆ', hi: 'सितारा देर से आएगा' },
                                { en: 'Students do not like films', kn: 'ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಸಿನಿಮಾ ಇಷ್ಟವಿಲ್ಲ', hi: 'छात्रों को फ़िल्में पसंद नहीं' },
                                { en: 'The hall is too small', kn: 'ಸಭಾಂಗಣ ತುಂಬಾ ಚಿಕ್ಕದು', hi: 'हॉल बहुत छोटा है' }
                            ]
                        },
                        {
                            q: { en: 'What will Sameer do tomorrow?', kn: 'ಸಮೀರ್ ನಾಳೆ ಏನು ಮಾಡುತ್ತಾನೆ?', hi: 'समीर कल क्या करेगा?' },
                            options: [
                                { en: 'Talk to the committee', kn: 'ಸಮಿತಿಯ ಜೊತೆ ಮಾತನಾಡುತ್ತಾನೆ', hi: 'समिति से बात करेगा' },
                                { en: 'Call the film star', kn: 'ಸಿನಿಮಾ ತಾರೆಗೆ ಕರೆ ಮಾಡುತ್ತಾನೆ', hi: 'फ़िल्मी सितारे को फ़ोन करेगा' },
                                { en: 'Go to Udupi', kn: 'ಉಡುಪಿಗೆ ಹೋಗುತ್ತಾನೆ', hi: 'उडुपी जाएगा' },
                                { en: 'Buy new lights', kn: 'ಹೊಸ ದೀಪಗಳನ್ನು ಕೊಳ್ಳುತ್ತಾನೆ', hi: 'नई लाइटें ख़रीदेगा' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'A friend says, "Homework should be banned in schools." Reply politely: say which part you agree with, which part you disagree with and why, and suggest a middle way.',
                        sample: "That's a fair point, to some extent. I agree that students get far too much homework, and many of them have no time left to play or rest. However, I beg to differ on banning it completely. A little homework helps us practise what we learnt in class, especially in maths. For instance, I only understood fractions after doing problems at home. So perhaps the common ground is this: short homework, maybe thirty minutes a day, and none at all on weekends. What do you think? Could we agree on that, or shall we just agree to disagree?",
                        checklist: ['I said which part I agree with', 'I disagreed politely, without being rude', 'I gave a reason for my view', 'I suggested a middle way', 'I asked for the other person\'s opinion']
                    }
                }
            ]
        },
        '3:1': {
            name: 'Memories',
            lessons: [
                {
                    kind: 'words', title: 'Looking back', list: [
                        { en: 'nostalgia', kn: 'ಹಳೆಯ ದಿನಗಳ ಹಂಬಲ', hi: 'बीते दिनों की याद', pic: '📻', def: 'a warm and slightly sad feeling when you think about happy times in the past' },
                        { en: 'childhood', kn: 'ಬಾಲ್ಯ', hi: 'बचपन', pic: '🧸', def: 'the time of your life when you are a child' },
                        { en: 'vivid', kn: 'ಜೀವಂತ', hi: 'जीवंत', pic: '🎨', def: 'very clear and bright, as if it happened yesterday' },
                        { en: 'reminisce', kn: 'ಹಳೆಯದನ್ನು ನೆನೆಸಿಕೊಳ್ಳು', hi: 'पुरानी बातें याद करना', pic: '🎞️', def: 'to talk or think with pleasure about things from the past' },
                        { en: 'used to', kn: 'ಮಾಡುತ್ತಿದ್ದೆವು', hi: 'किया करते थे', pic: '🔁', def: 'words that show something happened often in the past but not now' },
                        { en: 'vaguely', kn: 'ಮಸುಕಾಗಿ', hi: 'धुँधला-सा', pic: '🌫️', def: 'only a little, and not clearly' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Memories 1', list: [
                        { read: true, en: 'Old film songs always fill my grandmother with nostalgia.', kn: 'ಹಳೆಯ ಸಿನಿಮಾ ಹಾಡುಗಳು ನನ್ನ ಅಜ್ಜಿಗೆ ಯಾವಾಗಲೂ ಹಳೆಯ ದಿನಗಳನ್ನು ನೆನಪಿಸುತ್ತವೆ.', hi: 'पुराने फ़िल्मी गाने दादी को हमेशा बीते दिनों की याद दिला देते हैं।' },
                        { read: true, en: 'In my childhood, we used to play in the fields until it got dark.', kn: 'ನನ್ನ ಬಾಲ್ಯದಲ್ಲಿ ನಾವು ಕತ್ತಲಾಗುವವರೆಗೂ ಹೊಲಗಳಲ್ಲಿ ಆಡುತ್ತಿದ್ದೆವು.', hi: 'बचपन में हम अँधेरा होने तक खेतों में खेला करते थे।' },
                        { en: 'I still have a vivid memory of my first day at school.', kn: 'ಶಾಲೆಯ ನನ್ನ ಮೊದಲ ದಿನದ ನೆನಪು ಇನ್ನೂ ನನ್ನ ಮನಸ್ಸಿನಲ್ಲಿ ಜೀವಂತವಾಗಿದೆ.', hi: 'स्कूल के पहले दिन की याद आज भी मेरे मन में ताज़ा है।' },
                        { read: true, en: 'Whenever my uncles meet, they reminisce about their college days in Dharwad.', kn: 'ನನ್ನ ಮಾವಂದಿರು ಭೇಟಿಯಾದಾಗಲೆಲ್ಲಾ ಧಾರವಾಡದ ತಮ್ಮ ಕಾಲೇಜು ದಿನಗಳನ್ನು ನೆನೆಸಿಕೊಳ್ಳುತ್ತಾರೆ.', hi: 'मेरे मामा लोग जब भी मिलते हैं, धारवाड़ के अपने कॉलेज के दिनों को याद करते हैं।' },
                        { en: 'I only vaguely remember the house in Mangaluru where I was born.', kn: 'ನಾನು ಹುಟ್ಟಿದ ಮಂಗಳೂರಿನ ಮನೆ ನನಗೆ ಮಸುಕಾಗಿ ಮಾತ್ರ ನೆನಪಿದೆ.', hi: 'मंगलुरु का वह घर, जहाँ मैं पैदा हुआ था, मुझे बस धुँधला-सा याद है।', acc: { hi: ['मंगलुरु का वह घर, जहाँ मैं पैदा हुई थी, मुझे बस धुँधला-सा याद है।'] } }
                    ]
                },
                {
                    kind: 'words', title: 'School days', list: [
                        { en: 'school days', kn: 'ಶಾಲಾ ದಿನಗಳು', hi: 'स्कूल के दिन', pic: '🎒', def: 'the years of your life when you go to school' },
                        { en: 'unforgettable', kn: 'ಮರೆಯಲಾಗದ', hi: 'अविस्मरणीय', pic: '🌟', def: 'so special or strong that you will always remember it' },
                        { en: 'turning point', kn: 'ತಿರುವು', hi: 'निर्णायक मोड़', pic: '🚦', def: 'a moment when something important changes in your life' },
                        { en: 'mischief', kn: 'ತುಂಟಾಟ', hi: 'शरारत', pic: '😜', def: 'playful bad behaviour that causes no serious harm' },
                        { en: 'keepsake', kn: 'ನೆನಪಿನ ಕಾಣಿಕೆ', hi: 'निशानी', pic: '🎁', def: 'a small object you keep to remember a person or a time' },
                        { en: 'flashback', kn: 'ಹಠಾತ್ ಮರುಕಳಿಸುವ ನೆನಪು', hi: 'अचानक लौटी याद', pic: '⏪', def: 'a sudden, clear memory of something from the past' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Memories 2', list: [
                        { read: true, en: 'My school days in Belagavi were the happiest years of my life.', kn: 'ಬೆಳಗಾವಿಯಲ್ಲಿ ಕಳೆದ ಶಾಲಾ ದಿನಗಳು ನನ್ನ ಜೀವನದ ಅತ್ಯಂತ ಸಂತೋಷದ ವರ್ಷಗಳು.', hi: 'बेलगावी में बिताए स्कूल के दिन मेरी ज़िंदगी के सबसे ख़ुशहाल साल थे।' },
                        { en: 'Winning the inter-school quiz was an unforgettable moment for our whole class.', kn: 'ಅಂತರ್‌ಶಾಲಾ ರಸಪ್ರಶ್ನೆ ಗೆದ್ದದ್ದು ನಮ್ಮ ಇಡೀ ತರಗತಿಗೆ ಮರೆಯಲಾಗದ ಕ್ಷಣವಾಗಿತ್ತು.', hi: 'अंतर-विद्यालय क्विज़ जीतना हमारी पूरी कक्षा के लिए अविस्मरणीय पल था।' },
                        { read: true, en: 'Failing that exam was a turning point; after it, I started to study seriously.', kn: 'ಆ ಪರೀಕ್ಷೆಯಲ್ಲಿ ಫೇಲಾದದ್ದು ಒಂದು ತಿರುವು; ಅದರ ನಂತರ ನಾನು ಗಂಭೀರವಾಗಿ ಓದಲು ಶುರುಮಾಡಿದೆ.', hi: 'उस परीक्षा में फ़ेल होना एक निर्णायक मोड़ था; उसके बाद मैंने गंभीरता से पढ़ना शुरू किया।' },
                        { en: 'Our hostel warden knew about all our mischief but pretended not to notice.', kn: 'ನಮ್ಮ ಹಾಸ್ಟೆಲ್ ವಾರ್ಡನ್‌ಗೆ ನಮ್ಮ ಎಲ್ಲ ತುಂಟಾಟಗಳು ಗೊತ್ತಿದ್ದರೂ ಗೊತ್ತಿಲ್ಲದಂತೆ ನಟಿಸುತ್ತಿದ್ದರು.', hi: 'हमारे हॉस्टल के वार्डन को हमारी हर शरारत का पता था, पर वे अनजान बने रहते थे।' },
                        { read: true, en: 'I keep this old fountain pen as a keepsake from my favourite teacher.', kn: 'ನನ್ನ ಅಚ್ಚುಮೆಚ್ಚಿನ ಶಿಕ್ಷಕರ ನೆನಪಿಗಾಗಿ ಈ ಹಳೆಯ ಇಂಕ್ ಪೆನ್ನನ್ನು ಜೋಪಾನವಾಗಿ ಇಟ್ಟುಕೊಂಡಿದ್ದೇನೆ.', hi: 'अपनी प्रिय अध्यापिका की निशानी के तौर पर मैंने यह पुराना फ़ाउंटेन पेन सँभालकर रखा है।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'The rainy evening in Kodagu', kn: 'ಕೊಡಗಿನ ಆ ಮಳೆಯ ಸಂಜೆ', hi: 'कोडगु की वह बरसाती शाम' },
                    text: {
                        en: 'Shreya grew up in a small village in Kodagu, where her family used to grow coffee. She only vaguely remembers most of her childhood, but one day is still vivid in her mind. When she was ten, heavy rain flooded the river, and the school bus could not cross the bridge. The children waited for hours in the cold, until a farmer named Ponnappa arrived with his tractor. He took all thirty children across the water, two or three at a time. Shreya still keeps the small towel he gave her as a keepsake. Whenever it rains heavily, she has a sudden flashback to that evening. For her it was a turning point: that was the day she decided that she, too, would spend her life helping people.',
                        kn: 'ಶ್ರೇಯಾ ಕೊಡಗಿನ ಒಂದು ಚಿಕ್ಕ ಹಳ್ಳಿಯಲ್ಲಿ ಬೆಳೆದಳು, ಅಲ್ಲಿ ಅವಳ ಕುಟುಂಬ ಕಾಫಿ ಬೆಳೆಯುತ್ತಿತ್ತು. ಅವಳ ಬಾಲ್ಯದ ಹೆಚ್ಚಿನ ನೆನಪುಗಳು ಮಸುಕಾಗಿವೆ, ಆದರೆ ಒಂದು ದಿನ ಮಾತ್ರ ಇನ್ನೂ ಅವಳ ಮನಸ್ಸಿನಲ್ಲಿ ಜೀವಂತವಾಗಿದೆ. ಅವಳಿಗೆ ಹತ್ತು ವರ್ಷವಾಗಿದ್ದಾಗ ಜೋರು ಮಳೆಗೆ ನದಿ ಉಕ್ಕಿ ಹರಿಯಿತು, ಶಾಲಾ ಬಸ್ಸಿಗೆ ಸೇತುವೆ ದಾಟಲು ಆಗಲಿಲ್ಲ. ಪೊನ್ನಪ್ಪ ಎಂಬ ರೈತ ತಮ್ಮ ಟ್ರ್ಯಾಕ್ಟರ್‌ನೊಂದಿಗೆ ಬರುವವರೆಗೆ ಮಕ್ಕಳು ಚಳಿಯಲ್ಲಿ ಗಂಟೆಗಟ್ಟಲೆ ಕಾದರು. ಅವರು ಎಲ್ಲ ಮೂವತ್ತು ಮಕ್ಕಳನ್ನು ಒಮ್ಮೆಗೆ ಇಬ್ಬರು-ಮೂವರಂತೆ ನೀರು ದಾಟಿಸಿದರು. ಅವರು ಕೊಟ್ಟ ಚಿಕ್ಕ ಟವೆಲ್ಲನ್ನು ಶ್ರೇಯಾ ಇಂದಿಗೂ ನೆನಪಿನ ಕಾಣಿಕೆಯಾಗಿ ಇಟ್ಟುಕೊಂಡಿದ್ದಾಳೆ. ಜೋರಾಗಿ ಮಳೆ ಬಂದಾಗಲೆಲ್ಲಾ ಆ ಸಂಜೆಯ ನೆನಪು ಅವಳಿಗೆ ಹಠಾತ್ತನೆ ಮರುಕಳಿಸುತ್ತದೆ. ಅವಳಿಗೆ ಅದು ಒಂದು ತಿರುವು: ತಾನೂ ಜನರಿಗೆ ಸಹಾಯ ಮಾಡುತ್ತಾ ಬದುಕಬೇಕೆಂದು ಅವಳು ನಿರ್ಧರಿಸಿದ ದಿನ ಅದು.',
                        hi: 'श्रेया कोडगु के एक छोटे-से गाँव में पली-बढ़ी, जहाँ उसका परिवार कॉफ़ी उगाया करता था। उसे अपने बचपन की ज़्यादातर बातें धुँधली-सी याद हैं, लेकिन एक दिन आज भी उसके मन में ताज़ा है। जब वह दस साल की थी, तेज़ बारिश से नदी उफन गई और स्कूल बस पुल पार नहीं कर सकी। बच्चे ठंड में घंटों इंतज़ार करते रहे, जब तक पोन्नप्पा नाम का एक किसान अपना ट्रैक्टर लेकर नहीं आया। उन्होंने सभी तीस बच्चों को एक बार में दो-तीन करके पानी के पार पहुँचाया। श्रेया आज भी उनका दिया हुआ छोटा तौलिया निशानी के तौर पर सँभाले हुए है। जब भी तेज़ बारिश होती है, उसे अचानक वह शाम याद आ जाती है। उसके लिए वह एक निर्णायक मोड़ था: उसी दिन उसने तय किया कि वह भी अपनी ज़िंदगी लोगों की मदद में लगाएगी।'
                    },
                    questions: [
                        {
                            q: { en: 'Why could the school bus not take the children home?', kn: 'ಶಾಲಾ ಬಸ್ ಮಕ್ಕಳನ್ನು ಮನೆಗೆ ಯಾಕೆ ಕರೆದೊಯ್ಯಲಾಗಲಿಲ್ಲ?', hi: 'स्कूल बस बच्चों को घर क्यों नहीं ले जा सकी?' },
                            options: [
                                { en: 'The river flooded and the bus could not cross the bridge', kn: 'ನದಿ ಉಕ್ಕಿ ಹರಿದು ಬಸ್ ಸೇತುವೆ ದಾಟಲಾಗಲಿಲ್ಲ', hi: 'नदी उफन गई और बस पुल पार नहीं कर सकी' },
                                { en: 'The bus broke down', kn: 'ಬಸ್ ಕೆಟ್ಟುಹೋಯಿತು', hi: 'बस ख़राब हो गई' },
                                { en: 'The driver was ill', kn: 'ಚಾಲಕನಿಗೆ ಹುಷಾರಿರಲಿಲ್ಲ', hi: 'ड्राइवर बीमार था' },
                                { en: 'A tree fell on the road', kn: 'ರಸ್ತೆಗೆ ಮರ ಬಿದ್ದಿತ್ತು', hi: 'सड़क पर पेड़ गिर गया था' }
                            ]
                        },
                        {
                            q: { en: 'How did the children cross the water?', kn: 'ಮಕ್ಕಳು ನೀರನ್ನು ಹೇಗೆ ದಾಟಿದರು?', hi: 'बच्चों ने पानी कैसे पार किया?' },
                            options: [
                                { en: 'A farmer took them across on his tractor', kn: 'ಒಬ್ಬ ರೈತ ತಮ್ಮ ಟ್ರ್ಯಾಕ್ಟರ್‌ನಲ್ಲಿ ದಾಟಿಸಿದರು', hi: 'एक किसान ने अपने ट्रैक्टर से पार कराया' },
                                { en: 'They walked across the bridge', kn: 'ಸೇತುವೆಯ ಮೇಲೆ ನಡೆದು ದಾಟಿದರು', hi: 'पुल पर चलकर पार किया' },
                                { en: 'A boat came from the town', kn: 'ಪಟ್ಟಣದಿಂದ ದೋಣಿ ಬಂತು', hi: 'शहर से एक नाव आई' },
                                { en: 'Their parents carried them', kn: 'ಅವರ ಪೋಷಕರು ಎತ್ತಿಕೊಂಡು ಹೋದರು', hi: 'उनके माता-पिता उन्हें उठाकर ले गए' }
                            ]
                        },
                        {
                            q: { en: 'What does Shreya keep as a keepsake?', kn: 'ಶ್ರೇಯಾ ನೆನಪಿನ ಕಾಣಿಕೆಯಾಗಿ ಏನನ್ನು ಇಟ್ಟುಕೊಂಡಿದ್ದಾಳೆ?', hi: 'श्रेया ने निशानी के तौर पर क्या सँभालकर रखा है?' },
                            options: [
                                { en: 'A small towel', kn: 'ಒಂದು ಚಿಕ್ಕ ಟವೆಲ್', hi: 'एक छोटा तौलिया' },
                                { en: 'A coffee cup', kn: 'ಒಂದು ಕಾಫಿ ಕಪ್', hi: 'एक कॉफ़ी कप' },
                                { en: 'A school bag', kn: 'ಒಂದು ಶಾಲಾ ಚೀಲ', hi: 'एक स्कूल बैग' },
                                { en: 'A photograph', kn: 'ಒಂದು ಫೋಟೋ', hi: 'एक फ़ोटो' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: "Grandfather's school days", kn: 'ಅಜ್ಜನ ಶಾಲಾ ದಿನಗಳು', hi: 'दादाजी के स्कूल के दिन' },
                    scenario: {
                        en: 'Ananya talks to her grandfather Narayan in Mandya about his school days for a class project.',
                        kn: 'ತರಗತಿಯ ಪ್ರಾಜೆಕ್ಟ್‌ಗಾಗಿ ಅನನ್ಯಾ ಮಂಡ್ಯದಲ್ಲಿರುವ ತನ್ನ ಅಜ್ಜ ನಾರಾಯಣ್ ಅವರನ್ನು ಅವರ ಶಾಲಾ ದಿನಗಳ ಬಗ್ಗೆ ಮಾತನಾಡಿಸುತ್ತಾಳೆ.',
                        hi: 'कक्षा के प्रोजेक्ट के लिए अनन्या मंड्या में अपने दादाजी नारायण से उनके स्कूल के दिनों के बारे में बात करती है।'
                    },
                    speakers: [{ name: 'Ananya', voice: 'f' }, { name: 'Narayan', voice: 'm' }],
                    lines: [
                        { speaker: 'Ananya', en: 'Ajja, for my project, can you tell me what school was like when you were young?', kn: 'ಅಜ್ಜ, ನನ್ನ ಪ್ರಾಜೆಕ್ಟ್‌ಗಾಗಿ, ನೀವು ಚಿಕ್ಕವರಿದ್ದಾಗ ಶಾಲೆ ಹೇಗಿತ್ತು ಎಂದು ಹೇಳುತ್ತೀರಾ?', hi: 'दादाजी, मेरे प्रोजेक्ट के लिए, क्या आप बताएँगे कि आपके बचपन में स्कूल कैसा होता था?' },
                        { speaker: 'Narayan', en: 'Oh, those were different times. We used to walk four kilometres to school every day.', kn: 'ಓಹ್, ಅದು ಬೇರೆಯದೇ ಕಾಲ. ನಾವು ದಿನಾ ನಾಲ್ಕು ಕಿಲೋಮೀಟರ್ ನಡೆದುಕೊಂಡು ಶಾಲೆಗೆ ಹೋಗುತ್ತಿದ್ದೆವು.', hi: 'अरे, वह ज़माना ही अलग था। हम रोज़ चार किलोमीटर पैदल चलकर स्कूल जाया करते थे।' },
                        { speaker: 'Ananya', en: "Four kilometres! Didn't you have a bus or a cycle?", kn: 'ನಾಲ್ಕು ಕಿಲೋಮೀಟರ್! ಬಸ್ಸೋ ಸೈಕಲ್ಲೋ ಇರಲಿಲ್ಲವಾ?', hi: 'चार किलोमीटर! क्या आपके पास बस या साइकिल नहीं थी?' },
                        { speaker: 'Narayan', en: 'Nobody had a cycle in our village. We walked barefoot and sang songs on the way.', kn: 'ನಮ್ಮ ಹಳ್ಳಿಯಲ್ಲಿ ಯಾರ ಬಳಿಯೂ ಸೈಕಲ್ ಇರಲಿಲ್ಲ. ನಾವು ಬರಿಗಾಲಲ್ಲಿ ನಡೆಯುತ್ತಾ ದಾರಿಯುದ್ದಕ್ಕೂ ಹಾಡು ಹೇಳುತ್ತಿದ್ದೆವು.', hi: 'हमारे गाँव में किसी के पास साइकिल नहीं थी। हम नंगे पाँव चलते थे और रास्ते भर गाने गाते थे।' },
                        { speaker: 'Ananya', en: 'What is your most vivid memory from those days?', kn: 'ಆ ದಿನಗಳ ನಿಮ್ಮ ಅತ್ಯಂತ ಸ್ಪಷ್ಟ ನೆನಪು ಯಾವುದು?', hi: 'उन दिनों की आपकी सबसे ताज़ा याद कौन-सी है?' },
                        { speaker: 'Narayan', en: 'The day the headmaster caught me stealing mangoes from his tree. I can still see his face!', kn: 'ಮುಖ್ಯೋಪಾಧ್ಯಾಯರ ಮರದಿಂದ ಮಾವಿನಹಣ್ಣು ಕದಿಯುವಾಗ ಅವರು ನನ್ನನ್ನು ಹಿಡಿದ ದಿನ. ಅವರ ಮುಖ ಇನ್ನೂ ಕಣ್ಣಮುಂದೆ ಇದೆ!', hi: 'जिस दिन हेडमास्टर ने मुझे अपने पेड़ से आम चुराते पकड़ा था। उनका चेहरा आज भी आँखों के सामने है!' },
                        { speaker: 'Ananya', en: 'Ajja, I never knew you got up to such mischief! What happened next?', kn: 'ಅಜ್ಜ, ನೀವು ಇಷ್ಟು ತುಂಟಾಟ ಮಾಡುತ್ತಿದ್ದಿರಿ ಎಂದು ನನಗೆ ಗೊತ್ತೇ ಇರಲಿಲ್ಲ! ಆಮೇಲೆ ಏನಾಯಿತು?', hi: 'दादाजी, मुझे पता ही नहीं था कि आप ऐसी शरारतें करते थे! फिर क्या हुआ?' },
                        { speaker: 'Narayan', en: 'He made me water his garden for a whole month. Honestly, it was a turning point; I fell in love with plants.', kn: 'ಒಂದು ತಿಂಗಳು ಪೂರ್ತಿ ಅವರ ತೋಟಕ್ಕೆ ನನ್ನಿಂದ ನೀರು ಹಾಕಿಸಿದರು. ನಿಜ ಹೇಳಬೇಕೆಂದರೆ, ಅದೇ ಒಂದು ತಿರುವು; ನನಗೆ ಗಿಡಗಳ ಮೇಲೆ ಪ್ರೀತಿ ಹುಟ್ಟಿತು.', hi: 'उन्होंने पूरे एक महीने तक मुझसे अपने बग़ीचे में पानी डलवाया। सच कहूँ तो वह एक निर्णायक मोड़ था; मुझे पौधों से प्यार हो गया।' },
                        { speaker: 'Ananya', en: 'Do you ever feel nostalgia for those days?', kn: 'ಆ ದಿನಗಳ ನೆನಪು ನಿಮ್ಮನ್ನು ಎಂದಾದರೂ ಕಾಡುತ್ತದೆಯಾ?', hi: 'क्या आपको कभी उन दिनों की याद सताती है?' },
                        { speaker: 'Narayan', en: 'Very often. Life was hard, but we were happy with very little.', kn: 'ತುಂಬಾ ಸಲ. ಜೀವನ ಕಷ್ಟವಿತ್ತು, ಆದರೆ ಸ್ವಲ್ಪದರಲ್ಲೇ ನಾವು ಖುಷಿಯಾಗಿದ್ದೆವು.', hi: 'बहुत बार। ज़िंदगी कठिन थी, पर हम थोड़े में ही ख़ुश थे।' }
                    ],
                    questions: [
                        {
                            q: { en: 'How did Ajja go to school?', kn: 'ಅಜ್ಜ ಶಾಲೆಗೆ ಹೇಗೆ ಹೋಗುತ್ತಿದ್ದರು?', hi: 'दादाजी स्कूल कैसे जाते थे?' },
                            options: [
                                { en: 'He walked four kilometres', kn: 'ನಾಲ್ಕು ಕಿಲೋಮೀಟರ್ ನಡೆದುಕೊಂಡು', hi: 'चार किलोमीटर पैदल चलकर' },
                                { en: 'He went by bus', kn: 'ಬಸ್ಸಿನಲ್ಲಿ', hi: 'बस से' },
                                { en: 'He rode a cycle', kn: 'ಸೈಕಲ್‌ನಲ್ಲಿ', hi: 'साइकिल से' },
                                { en: 'His father took him on a bullock cart', kn: 'ಅಪ್ಪ ಎತ್ತಿನ ಗಾಡಿಯಲ್ಲಿ ಕರೆದೊಯ್ಯುತ್ತಿದ್ದರು', hi: 'पिताजी बैलगाड़ी से ले जाते थे' }
                            ]
                        },
                        {
                            q: { en: 'What mischief did Ajja get up to?', kn: 'ಅಜ್ಜ ಯಾವ ತುಂಟಾಟ ಮಾಡಿದ್ದರು?', hi: 'दादाजी ने कौन-सी शरारत की थी?' },
                            options: [
                                { en: "He stole mangoes from the headmaster's tree", kn: 'ಮುಖ್ಯೋಪಾಧ್ಯಾಯರ ಮರದಿಂದ ಮಾವಿನಹಣ್ಣು ಕದ್ದಿದ್ದರು', hi: 'हेडमास्टर के पेड़ से आम चुराए थे' },
                                { en: 'He broke a classroom window', kn: 'ತರಗತಿಯ ಕಿಟಕಿ ಒಡೆದಿದ್ದರು', hi: 'कक्षा की खिड़की तोड़ी थी' },
                                { en: 'He skipped school to see a film', kn: 'ಸಿನಿಮಾ ನೋಡಲು ಶಾಲೆಗೆ ಚಕ್ಕರ್ ಹಾಕಿದ್ದರು', hi: 'फ़िल्म देखने के लिए स्कूल से भागे थे' },
                                { en: "He hid the teacher's chalk", kn: 'ಶಿಕ್ಷಕರ ಸೀಮೆಸುಣ್ಣ ಬಚ್ಚಿಟ್ಟಿದ್ದರು', hi: 'टीचर का चॉक छिपा दिया था' }
                            ]
                        },
                        {
                            q: { en: 'What was his punishment?', kn: 'ಅವರಿಗೆ ಸಿಕ್ಕ ಶಿಕ್ಷೆ ಏನು?', hi: 'उन्हें क्या सज़ा मिली?' },
                            options: [
                                { en: "Watering the headmaster's garden for a month", kn: 'ಒಂದು ತಿಂಗಳು ಮುಖ್ಯೋಪಾಧ್ಯಾಯರ ತೋಟಕ್ಕೆ ನೀರು ಹಾಕುವುದು', hi: 'एक महीने तक हेडमास्टर के बग़ीचे में पानी डालना' },
                                { en: 'Standing outside the class for a day', kn: 'ಒಂದು ದಿನ ತರಗತಿಯ ಹೊರಗೆ ನಿಲ್ಲುವುದು', hi: 'एक दिन कक्षा के बाहर खड़े रहना' },
                                { en: 'Writing lines a hundred times', kn: 'ನೂರು ಸಲ ಸಾಲುಗಳನ್ನು ಬರೆಯುವುದು', hi: 'सौ बार पंक्तियाँ लिखना' },
                                { en: 'Cleaning the school floor', kn: 'ಶಾಲೆಯ ನೆಲ ಒರೆಸುವುದು', hi: 'स्कूल का फ़र्श साफ़ करना' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Tell a friend about a day from your school years that you will never forget: when it was, what happened, how you felt then and how you feel about it now.',
                        sample: 'One day I will never forget is our annual day in class seven. I was supposed to play the drum in a folk dance, but just before the show, I realised I had left the drumsticks at home. I used to panic easily, so I almost cried. Then my friend Rahul ran to the school kitchen and came back with two wooden spoons! We played with those spoons, and the audience loved it. I still have a vivid memory of everyone laughing and clapping. At the time I was embarrassed, but now I feel real nostalgia whenever I think about it.',
                        checklist: ['I said when it happened', 'I told the events in the right order', 'I used past tenses and "used to"', 'I said how I felt at the time', 'I said how I feel about it now']
                    }
                }
            ]
        },
        '4:1': {
            name: 'Hopes and regrets',
            lessons: [
                {
                    kind: 'words', title: 'Wishes and regrets', list: [
                        { en: 'regret', kn: 'ವಿಷಾದ', hi: 'पछतावा', pic: '😔', def: 'a sad feeling about something you did or did not do' },
                        { en: 'if only', kn: 'ಹಾಗಾಗಿದ್ದರೆ ಎಷ್ಟು ಚೆನ್ನಾಗಿತ್ತು', hi: 'काश', pic: '🌠', def: 'words used to say strongly that you wish something were different' },
                        { en: 'hindsight', kn: 'ಹಿನ್ನೋಟದ ತಿಳುವಳಿಕೆ', hi: 'बाद की समझ', pic: '🔭', def: 'understanding a situation clearly only after it has happened' },
                        { en: 'second chance', kn: 'ಇನ್ನೊಂದು ಅವಕಾಶ', hi: 'दूसरा मौक़ा', pic: '🔂', def: 'another opportunity to do something after you failed the first time' },
                        { en: 'wishful thinking', kn: 'ಆಸೆಯ ಕನಸು', hi: 'ख़याली पुलाव', pic: '🌈', def: 'believing something good will happen just because you want it to' },
                        { en: 'let go', kn: 'ಬಿಟ್ಟುಬಿಡು', hi: 'छोड़ देना', pic: '🍃', def: 'to stop worrying about something from the past and move on' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Hopes and regrets 1', list: [
                        { read: true, en: 'I wish I had spent more time with my grandfather.', kn: 'ನನ್ನ ಅಜ್ಜನ ಜೊತೆ ಇನ್ನೂ ಹೆಚ್ಚು ಸಮಯ ಕಳೆಯಬೇಕಿತ್ತು ಅನಿಸುತ್ತದೆ.', hi: 'काश मैंने अपने दादाजी के साथ और ज़्यादा समय बिताया होता।' },
                        { en: 'My only regret is that I never learnt to swim.', kn: 'ನಾನು ಈಜು ಕಲಿಯಲೇ ಇಲ್ಲ ಎಂಬುದೇ ನನ್ನ ಏಕೈಕ ವಿಷಾದ.', hi: 'मुझे बस एक ही पछतावा है कि मैंने कभी तैरना नहीं सीखा।', acc: { en: ['My only regret is that I never learned to swim.'] } },
                        { read: true, en: 'If only I had listened to my mother, I would not be stuck in the rain now.', kn: 'ಅಮ್ಮನ ಮಾತು ಕೇಳಿದ್ದರೆ ಎಷ್ಟು ಚೆನ್ನಾಗಿತ್ತು, ಈಗ ನಾನು ಮಳೆಯಲ್ಲಿ ಸಿಕ್ಕಿಹಾಕಿಕೊಳ್ಳುತ್ತಿರಲಿಲ್ಲ.', hi: 'काश मैंने माँ की बात सुनी होती, तो अभी बारिश में फँसा न होता।', acc: { hi: ['काश मैंने माँ की बात सुनी होती, तो अभी बारिश में फँसी न होती।'] } },
                        { en: 'With hindsight, I should have chosen science instead of commerce.', kn: 'ಈಗ ಹಿಂತಿರುಗಿ ನೋಡಿದರೆ, ವಾಣಿಜ್ಯದ ಬದಲು ನಾನು ವಿಜ್ಞಾನ ಆರಿಸಿಕೊಳ್ಳಬೇಕಿತ್ತು.', hi: 'अब पीछे मुड़कर देखूँ तो मुझे कॉमर्स की जगह साइंस लेनी चाहिए थी।' },
                        { read: true, en: 'Everyone deserves a second chance, so let go of the past and start again.', kn: 'ಪ್ರತಿಯೊಬ್ಬರೂ ಇನ್ನೊಂದು ಅವಕಾಶಕ್ಕೆ ಅರ್ಹರು, ಹಾಗಾಗಿ ಹಳೆಯದನ್ನು ಬಿಟ್ಟು ಮತ್ತೆ ಶುರುಮಾಡಿ.', hi: 'हर किसी को दूसरा मौक़ा मिलना चाहिए, इसलिए बीती बातें छोड़कर फिर से शुरुआत कीजिए।' }
                    ]
                },
                {
                    kind: 'words', title: 'Looking forward', list: [
                        { en: 'look forward to', kn: 'ಕಾತುರದಿಂದ ಕಾಯು', hi: 'बेसब्री से इंतज़ार करना', pic: '🗓️', def: 'to feel happy and excited about something that is going to happen' },
                        { en: 'longing', kn: 'ಹಂಬಲ', hi: 'तड़प', pic: '💞', def: 'a strong wish for something, especially something far away or hard to get' },
                        { en: 'optimistic', kn: 'ಆಶಾವಾದಿ', hi: 'आशावादी', pic: '☀️', def: 'hopeful and expecting good things to happen' },
                        { en: 'fingers crossed', kn: 'ಒಳ್ಳೆಯದಾಗಲಿ ಎಂಬ ಹಾರೈಕೆ', hi: 'अच्छे की दुआ', pic: '🤞', def: 'words you say when you hope something will go well' },
                        { en: 'daydream', kn: 'ಹಗಲುಗನಸು', hi: 'दिवास्वप्न', pic: '☁️', def: 'pleasant thoughts about things you would like to happen, while you are awake' },
                        { en: 'silver lining', kn: 'ಆಶಾಕಿರಣ', hi: 'उम्मीद की किरण', pic: '🌥️', def: 'something good that comes from a difficult or sad situation' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Hopes and regrets 2', list: [
                        { read: true, en: 'I am really looking forward to seeing my cousins in Varanasi this Diwali.', kn: 'ಈ ದೀಪಾವಳಿಗೆ ವಾರಾಣಸಿಯಲ್ಲಿ ನನ್ನ ಸೋದರಸಂಬಂಧಿಗಳನ್ನು ನೋಡಲು ಕಾತುರದಿಂದ ಕಾಯುತ್ತಿದ್ದೇನೆ.', hi: 'इस दिवाली वाराणसी में अपने चचेरे भाई-बहनों से मिलने का मुझे बेसब्री से इंतज़ार है।', acc: { en: ["I'm really looking forward to seeing my cousins in Varanasi this Diwali."] } },
                        { en: 'After two years in Dubai, he felt a deep longing for his village.', kn: 'ದುಬೈನಲ್ಲಿ ಎರಡು ವರ್ಷ ಕಳೆದ ಮೇಲೆ ಅವನಿಗೆ ತನ್ನ ಹಳ್ಳಿಯ ಬಗ್ಗೆ ತೀವ್ರ ಹಂಬಲ ಉಂಟಾಯಿತು.', hi: 'दुबई में दो साल बिताने के बाद उसे अपने गाँव की बहुत याद सताने लगी।' },
                        { read: true, en: 'The results are out tomorrow, but I am quite optimistic, fingers crossed!', kn: 'ನಾಳೆ ಫಲಿತಾಂಶ ಬರುತ್ತದೆ, ಆದರೆ ನಾನು ಸಾಕಷ್ಟು ಆಶಾವಾದಿಯಾಗಿದ್ದೇನೆ, ಒಳ್ಳೆಯದಾಗಲಿ!', hi: 'नतीजे कल आएँगे, पर मैं काफ़ी आशावादी हूँ, बस अच्छा ही हो!' },
                        { en: 'Stop daydreaming about the holidays and finish your project first.', kn: 'ರಜೆಯ ಬಗ್ಗೆ ಹಗಲುಗನಸು ಕಾಣುವುದನ್ನು ಬಿಟ್ಟು, ಮೊದಲು ನಿನ್ನ ಪ್ರಾಜೆಕ್ಟ್ ಮುಗಿಸು.', hi: 'छुट्टियों के बारे में दिन में सपने देखना बंद करो और पहले अपना प्रोजेक्ट पूरा करो।' },
                        { en: 'Losing the match was sad, but the silver lining is that we learnt a lot.', kn: 'ಪಂದ್ಯ ಸೋತದ್ದು ಬೇಸರ ತಂದಿತು, ಆದರೆ ಅದರಲ್ಲಿನ ಆಶಾಕಿರಣ ಎಂದರೆ ನಾವು ತುಂಬಾ ಕಲಿತೆವು.', hi: 'मैच हारना दुखद था, लेकिन उम्मीद की किरण यह है कि हमने बहुत कुछ सीखा।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'A second chance at sixty-five', kn: 'ಅರವತ್ತೈದರಲ್ಲಿ ಇನ್ನೊಂದು ಅವಕಾಶ', hi: 'पैंसठ की उम्र में दूसरा मौक़ा' },
                    text: {
                        en: "Venkatesh is sixty-five and lives alone in Mysuru, close to the palace. When he was young, he had a chance to study music in Chennai, but he chose a safe job in a bank instead. For years he told himself it did not matter, but deep down there was always a quiet regret. 'If only I had been braver,' he would say to his daughter Lakshmi. Last year Lakshmi found an evening music class for adults and signed him up as a birthday surprise. At first he laughed and called it wishful thinking, but she would not let him give up. Now he practises the veena every morning and is looking forward to his first small concert in March. 'I cannot change the past,' he says, 'but I am glad I finally got a second chance.'",
                        kn: 'ವೆಂಕಟೇಶ್ ಅವರಿಗೆ ಅರವತ್ತೈದು ವರ್ಷ, ಮೈಸೂರಿನಲ್ಲಿ ಅರಮನೆಯ ಹತ್ತಿರ ಒಬ್ಬರೇ ವಾಸಿಸುತ್ತಾರೆ. ಚಿಕ್ಕವರಿದ್ದಾಗ ಅವರಿಗೆ ಚೆನ್ನೈನಲ್ಲಿ ಸಂಗೀತ ಕಲಿಯುವ ಅವಕಾಶ ಸಿಕ್ಕಿತ್ತು, ಆದರೆ ಅವರು ಅದರ ಬದಲು ಬ್ಯಾಂಕಿನ ಸುರಕ್ಷಿತ ಕೆಲಸವನ್ನು ಆರಿಸಿಕೊಂಡರು. ಅದು ಮುಖ್ಯವಲ್ಲ ಎಂದು ವರ್ಷಗಟ್ಟಲೆ ತಮಗೆ ತಾವೇ ಹೇಳಿಕೊಂಡರು, ಆದರೆ ಮನಸ್ಸಿನ ಆಳದಲ್ಲಿ ಒಂದು ಮೌನ ವಿಷಾದ ಯಾವಾಗಲೂ ಇತ್ತು. "ನಾನು ಇನ್ನಷ್ಟು ಧೈರ್ಯ ತೋರಿಸಿದ್ದರೆ ಎಷ್ಟು ಚೆನ್ನಾಗಿತ್ತು," ಎಂದು ಅವರು ಮಗಳು ಲಕ್ಷ್ಮಿಗೆ ಹೇಳುತ್ತಿದ್ದರು. ಕಳೆದ ವರ್ಷ ಲಕ್ಷ್ಮಿ ದೊಡ್ಡವರಿಗಾಗಿ ಸಂಜೆಯ ಸಂಗೀತ ತರಗತಿಯೊಂದನ್ನು ಹುಡುಕಿ, ಹುಟ್ಟುಹಬ್ಬದ ಅಚ್ಚರಿಯಾಗಿ ಅವರ ಹೆಸರು ನೋಂದಾಯಿಸಿದಳು. ಮೊದಲು ಅವರು ನಕ್ಕು ಅದನ್ನು ಆಸೆಯ ಕನಸು ಎಂದರು, ಆದರೆ ಅವರು ಬಿಟ್ಟುಕೊಡಲು ಅವಳು ಬಿಡಲಿಲ್ಲ. ಈಗ ಅವರು ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ವೀಣೆ ಅಭ್ಯಾಸ ಮಾಡುತ್ತಾರೆ ಮತ್ತು ಮಾರ್ಚ್‌ನಲ್ಲಿ ನಡೆಯುವ ತಮ್ಮ ಮೊದಲ ಪುಟ್ಟ ಕಛೇರಿಗಾಗಿ ಕಾತುರದಿಂದ ಕಾಯುತ್ತಿದ್ದಾರೆ. "ಕಳೆದುಹೋದದ್ದನ್ನು ಬದಲಾಯಿಸಲು ಆಗುವುದಿಲ್ಲ, ಆದರೆ ಕೊನೆಗೂ ಇನ್ನೊಂದು ಅವಕಾಶ ಸಿಕ್ಕಿದ್ದಕ್ಕೆ ಖುಷಿಯಾಗಿದೆ," ಎನ್ನುತ್ತಾರೆ ಅವರು.',
                        hi: 'वेंकटेश पैंसठ साल के हैं और मैसूरु में महल के पास अकेले रहते हैं। जवानी में उन्हें चेन्नई में संगीत सीखने का मौक़ा मिला था, लेकिन उन्होंने उसकी जगह बैंक की एक सुरक्षित नौकरी चुन ली। सालों तक वे ख़ुद से कहते रहे कि इससे कोई फ़र्क़ नहीं पड़ता, पर मन के किसी कोने में एक चुप-सा पछतावा हमेशा रहा। "काश मैंने थोड़ी और हिम्मत दिखाई होती," वे अपनी बेटी लक्ष्मी से कहा करते थे। पिछले साल लक्ष्मी ने बड़ों के लिए शाम की एक संगीत कक्षा ढूँढी और जन्मदिन के सरप्राइज़ के तौर पर उनका नाम लिखवा दिया। पहले तो वे हँसे और इसे ख़याली पुलाव कहा, लेकिन लक्ष्मी ने उन्हें हार मानने नहीं दिया। अब वे हर सुबह वीणा का अभ्यास करते हैं और मार्च में होने वाले अपने पहले छोटे-से कार्यक्रम का बेसब्री से इंतज़ार कर रहे हैं। "बीता हुआ बदला नहीं जा सकता," वे कहते हैं, "पर ख़ुशी है कि आख़िरकार मुझे दूसरा मौक़ा मिल गया।"'
                    },
                    questions: [
                        {
                            q: { en: 'What chance did Venkatesh miss when he was young?', kn: 'ಚಿಕ್ಕವರಿದ್ದಾಗ ವೆಂಕಟೇಶ್ ಯಾವ ಅವಕಾಶವನ್ನು ಕಳೆದುಕೊಂಡರು?', hi: 'जवानी में वेंकटेश ने कौन-सा मौक़ा गँवाया?' },
                            options: [
                                { en: 'Studying music in Chennai', kn: 'ಚೆನ್ನೈನಲ್ಲಿ ಸಂಗೀತ ಕಲಿಯುವುದು', hi: 'चेन्नई में संगीत सीखना' },
                                { en: 'Working in a bank in Mumbai', kn: 'ಮುಂಬೈನ ಬ್ಯಾಂಕಿನಲ್ಲಿ ಕೆಲಸ ಮಾಡುವುದು', hi: 'मुंबई के बैंक में काम करना' },
                                { en: 'Playing cricket for Karnataka', kn: 'ಕರ್ನಾಟಕದ ಪರ ಕ್ರಿಕೆಟ್ ಆಡುವುದು', hi: 'कर्नाटक के लिए क्रिकेट खेलना' },
                                { en: 'Studying medicine abroad', kn: 'ವಿದೇಶದಲ್ಲಿ ವೈದ್ಯಕೀಯ ಓದುವುದು', hi: 'विदेश में डॉक्टरी पढ़ना' }
                            ]
                        },
                        {
                            q: { en: 'How did Lakshmi surprise him?', kn: 'ಲಕ್ಷ್ಮಿ ಅವರಿಗೆ ಹೇಗೆ ಅಚ್ಚರಿ ನೀಡಿದಳು?', hi: 'लक्ष्मी ने उन्हें कैसे सरप्राइज़ दिया?' },
                            options: [
                                { en: 'She signed him up for a music class', kn: 'ಸಂಗೀತ ತರಗತಿಗೆ ಅವರ ಹೆಸರು ನೋಂದಾಯಿಸಿದಳು', hi: 'उसने संगीत कक्षा में उनका नाम लिखवा दिया' },
                                { en: 'She bought him a new house', kn: 'ಹೊಸ ಮನೆ ಕೊಡಿಸಿದಳು', hi: 'उसने उन्हें नया घर दिलाया' },
                                { en: 'She took him to Chennai', kn: 'ಚೆನ್ನೈಗೆ ಕರೆದುಕೊಂಡು ಹೋದಳು', hi: 'वह उन्हें चेन्नई ले गई' },
                                { en: 'She organised a big party', kn: 'ದೊಡ್ಡ ಪಾರ್ಟಿ ಏರ್ಪಡಿಸಿದಳು', hi: 'उसने बड़ी पार्टी रखी' }
                            ]
                        },
                        {
                            q: { en: 'What is Venkatesh looking forward to?', kn: 'ವೆಂಕಟೇಶ್ ಯಾವುದಕ್ಕಾಗಿ ಕಾತುರದಿಂದ ಕಾಯುತ್ತಿದ್ದಾರೆ?', hi: 'वेंकटेश किस बात का बेसब्री से इंतज़ार कर रहे हैं?' },
                            options: [
                                { en: 'His first small concert in March', kn: 'ಮಾರ್ಚ್‌ನಲ್ಲಿ ತಮ್ಮ ಮೊದಲ ಪುಟ್ಟ ಕಛೇರಿ', hi: 'मार्च में अपने पहले छोटे कार्यक्रम का' },
                                { en: 'A trip to Chennai', kn: 'ಚೆನ್ನೈ ಪ್ರವಾಸ', hi: 'चेन्नई की यात्रा का' },
                                { en: 'Buying a new veena', kn: 'ಹೊಸ ವೀಣೆ ಕೊಳ್ಳುವುದು', hi: 'नई वीणा ख़रीदने का' },
                                { en: "Lakshmi's wedding", kn: 'ಲಕ್ಷ್ಮಿಯ ಮದುವೆ', hi: 'लक्ष्मी की शादी का' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'After the results', kn: 'ಫಲಿತಾಂಶದ ನಂತರ', hi: 'नतीजों के बाद' },
                    scenario: {
                        en: 'Imran has just seen his entrance exam result. His friend Kavitha meets him outside the library in Kalaburagi.',
                        kn: 'ಇಮ್ರಾನ್ ಈಗಷ್ಟೇ ತನ್ನ ಪ್ರವೇಶ ಪರೀಕ್ಷೆಯ ಫಲಿತಾಂಶ ನೋಡಿದ್ದಾನೆ. ಕಲಬುರಗಿಯ ಗ್ರಂಥಾಲಯದ ಹೊರಗೆ ಅವನ ಗೆಳತಿ ಕವಿತಾ ಅವನನ್ನು ಭೇಟಿಯಾಗುತ್ತಾಳೆ.',
                        hi: 'इमरान ने अभी-अभी अपनी प्रवेश परीक्षा का नतीजा देखा है। कलबुर्गी में पुस्तकालय के बाहर उसकी दोस्त कविता उससे मिलती है।'
                    },
                    speakers: [{ name: 'Kavitha', voice: 'f' }, { name: 'Imran', voice: 'm' }],
                    lines: [
                        { speaker: 'Kavitha', en: 'Imran, you look upset. Has the entrance exam result come out?', kn: 'ಇಮ್ರಾನ್, ನೀನು ಬೇಸರದಲ್ಲಿರುವಂತೆ ಕಾಣುತ್ತಿದ್ದೀಯ. ಪ್ರವೇಶ ಪರೀಕ್ಷೆಯ ಫಲಿತಾಂಶ ಬಂತಾ?', hi: 'इमरान, तुम परेशान लग रहे हो। क्या प्रवेश परीक्षा का नतीजा आ गया?' },
                        { speaker: 'Imran', en: 'Yes. I missed the cut-off by just four marks. I wish I had started preparing earlier.', kn: 'ಹೌದು. ಕಟ್-ಆಫ್‌ಗೆ ಕೇವಲ ನಾಲ್ಕು ಅಂಕ ಕಡಿಮೆ ಬಂತು. ಇನ್ನೂ ಬೇಗ ತಯಾರಿ ಶುರುಮಾಡಬೇಕಿತ್ತು.', hi: 'हाँ। कट-ऑफ़ से सिर्फ़ चार अंक कम रह गए। काश मैंने तैयारी पहले शुरू की होती।' },
                        { speaker: 'Kavitha', en: "I'm so sorry. But four marks is very close. You clearly know your subjects.", kn: 'ತುಂಬಾ ಬೇಸರವಾಯಿತು. ಆದರೆ ನಾಲ್ಕು ಅಂಕ ಅಂದರೆ ತುಂಬಾ ಹತ್ತಿರ. ನಿನಗೆ ವಿಷಯಗಳು ಚೆನ್ನಾಗಿ ಗೊತ್ತಿವೆ ಎಂಬುದು ಸ್ಪಷ್ಟ.', hi: 'मुझे बहुत अफ़सोस है। पर चार अंक तो बहुत क़रीब है। साफ़ है कि तुम्हें अपने विषय अच्छे से आते हैं।' },
                        { speaker: 'Imran', en: 'If only I had not wasted those two months on video games!', kn: 'ಆ ಎರಡು ತಿಂಗಳು ವಿಡಿಯೋ ಗೇಮ್‌ಗಳಲ್ಲಿ ವ್ಯರ್ಥ ಮಾಡದೇ ಇದ್ದಿದ್ದರೆ ಎಷ್ಟು ಚೆನ್ನಾಗಿತ್ತು!', hi: 'काश मैंने वे दो महीने वीडियो गेम में बर्बाद न किए होते!' },
                        { speaker: 'Kavitha', en: 'With hindsight, everything looks obvious. You cannot change it now, so try to let go.', kn: 'ಹಿಂತಿರುಗಿ ನೋಡಿದಾಗ ಎಲ್ಲವೂ ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣುತ್ತದೆ. ಈಗ ಅದನ್ನು ಬದಲಾಯಿಸಲು ಆಗುವುದಿಲ್ಲ, ಹಾಗಾಗಿ ಅದನ್ನು ಬಿಟ್ಟುಬಿಡಲು ಪ್ರಯತ್ನಿಸು.', hi: 'बाद में पीछे देखने पर सब कुछ साफ़ दिखता है। अब इसे बदला नहीं जा सकता, तो इसे छोड़ने की कोशिश करो।' },
                        { speaker: 'Imran', en: 'I know, but my parents were so hopeful. I feel I have let them down.', kn: 'ಗೊತ್ತು, ಆದರೆ ನನ್ನ ಅಪ್ಪ ಅಮ್ಮ ತುಂಬಾ ಆಸೆ ಇಟ್ಟುಕೊಂಡಿದ್ದರು. ಅವರನ್ನು ನಿರಾಸೆಗೊಳಿಸಿದೆ ಅನಿಸುತ್ತಿದೆ.', hi: 'जानता हूँ, पर मेरे माता-पिता को बहुत उम्मीद थी। मुझे लगता है मैंने उन्हें निराश कर दिया।' },
                        { speaker: 'Kavitha', en: 'Talk to them honestly. You can take the exam again next year; it is a second chance.', kn: 'ಅವರ ಜೊತೆ ಮನಬಿಚ್ಚಿ ಮಾತನಾಡು. ಮುಂದಿನ ವರ್ಷ ಮತ್ತೆ ಪರೀಕ್ಷೆ ಬರೆಯಬಹುದು; ಅದು ಇನ್ನೊಂದು ಅವಕಾಶ.', hi: 'उनसे खुलकर बात करो। तुम अगले साल फिर से परीक्षा दे सकते हो; यह एक दूसरा मौक़ा है।' },
                        { speaker: 'Imran', en: 'That is true. And this time I will make a proper timetable from day one.', kn: 'ಅದು ನಿಜ. ಈ ಸಲ ಮೊದಲ ದಿನದಿಂದಲೇ ಸರಿಯಾದ ವೇಳಾಪಟ್ಟಿ ಮಾಡಿಕೊಳ್ಳುತ್ತೇನೆ.', hi: 'यह सच है। और इस बार मैं पहले दिन से ही ढंग की समय-सारणी बनाऊँगा।' },
                        { speaker: 'Kavitha', en: 'See? There is a silver lining already. I am optimistic about you.', kn: 'ನೋಡಿದೆಯಾ? ಈಗಲೇ ಒಂದು ಆಶಾಕಿರಣ ಕಾಣುತ್ತಿದೆ. ನಿನ್ನ ಬಗ್ಗೆ ನನಗೆ ಭರವಸೆ ಇದೆ.', hi: 'देखा? उम्मीद की किरण अभी से दिख रही है। मुझे तुमसे पूरी उम्मीद है।' },
                        { speaker: 'Imran', en: 'Thanks, Kavitha. I am actually looking forward to proving myself next year.', kn: 'ಧನ್ಯವಾದ, ಕವಿತಾ. ಮುಂದಿನ ವರ್ಷ ನನ್ನನ್ನು ಸಾಬೀತುಪಡಿಸಲು ನಿಜವಾಗಿಯೂ ಕಾತುರದಿಂದ ಕಾಯುತ್ತಿದ್ದೇನೆ.', hi: 'शुक्रिया, कविता। मुझे सच में अगले साल ख़ुद को साबित करने का इंतज़ार है।' }
                    ],
                    questions: [
                        {
                            q: { en: 'By how many marks did Imran miss the cut-off?', kn: 'ಇಮ್ರಾನ್‌ಗೆ ಕಟ್-ಆಫ್‌ಗಿಂತ ಎಷ್ಟು ಅಂಕ ಕಡಿಮೆ ಬಂತು?', hi: 'इमरान कट-ऑफ़ से कितने अंक पीछे रह गया?' },
                            options: [
                                { en: 'Four', kn: 'ನಾಲ್ಕು', hi: 'चार' },
                                { en: 'Fourteen', kn: 'ಹದಿನಾಲ್ಕು', hi: 'चौदह' },
                                { en: 'Forty', kn: 'ನಲವತ್ತು', hi: 'चालीस' },
                                { en: 'Two', kn: 'ಎರಡು', hi: 'दो' }
                            ]
                        },
                        {
                            q: { en: 'What does Imran regret?', kn: 'ಇಮ್ರಾನ್‌ಗೆ ಯಾವುದರ ಬಗ್ಗೆ ವಿಷಾದವಿದೆ?', hi: 'इमरान को किस बात का पछतावा है?' },
                            options: [
                                { en: 'Wasting two months on video games', kn: 'ಎರಡು ತಿಂಗಳು ವಿಡಿಯೋ ಗೇಮ್‌ಗಳಲ್ಲಿ ವ್ಯರ್ಥ ಮಾಡಿದ್ದು', hi: 'दो महीने वीडियो गेम में बर्बाद करने का' },
                                { en: 'Choosing the wrong college', kn: 'ತಪ್ಪು ಕಾಲೇಜು ಆರಿಸಿದ್ದು', hi: 'ग़लत कॉलेज चुनने का' },
                                { en: 'Arguing with his parents', kn: 'ಅಪ್ಪ ಅಮ್ಮನ ಜೊತೆ ವಾದ ಮಾಡಿದ್ದು', hi: 'माता-पिता से बहस करने का' },
                                { en: 'Missing the exam day', kn: 'ಪರೀಕ್ಷೆಯ ದಿನ ತಪ್ಪಿಸಿಕೊಂಡದ್ದು', hi: 'परीक्षा का दिन चूक जाने का' }
                            ]
                        },
                        {
                            q: { en: 'What will Imran do differently next time?', kn: 'ಮುಂದಿನ ಸಲ ಇಮ್ರಾನ್ ಏನನ್ನು ಬೇರೆ ರೀತಿ ಮಾಡುತ್ತಾನೆ?', hi: 'अगली बार इमरान क्या अलग करेगा?' },
                            options: [
                                { en: 'Make a proper timetable from day one', kn: 'ಮೊದಲ ದಿನದಿಂದಲೇ ಸರಿಯಾದ ವೇಳಾಪಟ್ಟಿ ಮಾಡುತ್ತಾನೆ', hi: 'पहले दिन से ढंग की समय-सारणी बनाएगा' },
                                { en: 'Join an expensive coaching class', kn: 'ದುಬಾರಿ ಕೋಚಿಂಗ್ ತರಗತಿಗೆ ಸೇರುತ್ತಾನೆ', hi: 'महँगी कोचिंग में दाख़िला लेगा' },
                                { en: 'Study only at night', kn: 'ರಾತ್ರಿ ಮಾತ್ರ ಓದುತ್ತಾನೆ', hi: 'सिर्फ़ रात में पढ़ेगा' },
                                { en: 'Take a different exam', kn: 'ಬೇರೆ ಪರೀಕ್ಷೆ ಬರೆಯುತ್ತಾನೆ', hi: 'कोई दूसरी परीक्षा देगा' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Talk about one thing you wish you had done differently and one thing you are looking forward to. Use "I wish" or "if only", "should have" and "looking forward to".',
                        sample: 'One thing I wish I had done differently is learning the tabla. My uncle offered to teach me when I was nine, but I was lazy and always made excuses. With hindsight, I should have taken that chance, because now I love music and find it harder to learn. Still, I try not to live with regret. On the bright side, I am really looking forward to joining the college music club next year, where beginners are welcome. If I practise every day, I think I can finally learn, so I am quite optimistic about it.',
                        checklist: ['I named one thing I wish I had done differently', 'I used "I wish" or "if only"', 'I used "should have" correctly', 'I talked about something I am looking forward to', 'I ended on a hopeful note']
                    }
                }
            ]
        },
        '5:1': {
            name: 'Friends and relationships',
            lessons: [
                {
                    kind: 'words', title: 'Quarrels and making up', list: [
                        { en: 'quarrel', kn: 'ಜಗಳ', hi: 'झगड़ा', pic: '😠', def: 'an angry argument between people who know each other well' },
                        { en: 'misunderstanding', kn: 'ತಪ್ಪುತಿಳುವಳಿಕೆ', hi: 'ग़लतफ़हमी', pic: '❓', def: 'a situation where someone understands something wrongly' },
                        { en: 'reconcile', kn: 'ರಾಜಿಯಾಗು', hi: 'सुलह करना', pic: '🕊️', def: 'to become friendly again after a quarrel' },
                        { en: 'forgive', kn: 'ಕ್ಷಮಿಸು', hi: 'माफ़ करना', pic: '🤲', def: 'to stop being angry with someone who has hurt you' },
                        { en: 'grudge', kn: 'ಮನಸ್ತಾಪ', hi: 'मन का मैल', pic: '😒', def: 'a feeling of anger you keep for a long time because someone wronged you' },
                        { en: 'take sides', kn: 'ಪಕ್ಷ ವಹಿಸು', hi: 'पक्ष लेना', pic: '⚖️', def: 'to support one person against another in an argument' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Friends and relationships 1', list: [
                        { read: true, en: 'The two brothers had a quarrel over a small piece of land.', kn: 'ಆ ಇಬ್ಬರು ಸಹೋದರರು ಒಂದು ಸಣ್ಣ ಜಮೀನಿನ ತುಂಡಿಗಾಗಿ ಜಗಳವಾಡಿದರು.', hi: 'दोनों भाइयों में ज़मीन के एक छोटे-से टुकड़े को लेकर झगड़ा हो गया।' },
                        { read: true, en: 'It was all a misunderstanding; she never meant to hurt you.', kn: 'ಅದೆಲ್ಲಾ ಒಂದು ತಪ್ಪುತಿಳುವಳಿಕೆ; ನಿನಗೆ ನೋವು ಮಾಡುವ ಉದ್ದೇಶ ಅವಳಿಗೆ ಇರಲೇ ಇಲ್ಲ.', hi: 'यह सब एक ग़लतफ़हमी थी; उसका इरादा तुम्हें दुख पहुँचाने का कभी नहीं था।' },
                        { en: 'After a week of silence, the two friends finally reconciled over a cup of tea.', kn: 'ಒಂದು ವಾರದ ಮೌನದ ನಂತರ, ಇಬ್ಬರು ಗೆಳೆಯರು ಕೊನೆಗೂ ಒಂದು ಕಪ್ ಚಹಾ ಕುಡಿಯುತ್ತಾ ರಾಜಿಯಾದರು.', hi: 'एक हफ़्ते की चुप्पी के बाद दोनों दोस्तों ने आख़िरकार चाय पर सुलह कर ली।' },
                        { read: true, en: 'Holding a grudge only hurts you; try to forgive and move on.', kn: 'ಮನಸ್ತಾಪ ಇಟ್ಟುಕೊಂಡರೆ ನಿನಗೇ ನೋವು; ಕ್ಷಮಿಸಿ ಮುಂದೆ ಸಾಗಲು ಪ್ರಯತ್ನಿಸು.', hi: 'मन में मैल रखने से सिर्फ़ तुम्हें ही तकलीफ़ होगी; माफ़ करो और आगे बढ़ो।' },
                        { en: 'When my parents argue, I never take sides; I just make tea for both.', kn: 'ಅಪ್ಪ ಅಮ್ಮ ವಾದಿಸುವಾಗ ನಾನು ಯಾರ ಪಕ್ಷವನ್ನೂ ವಹಿಸುವುದಿಲ್ಲ; ಇಬ್ಬರಿಗೂ ಚಹಾ ಮಾಡಿಕೊಡುತ್ತೇನೆ ಅಷ್ಟೇ.', hi: 'जब मम्मी-पापा बहस करते हैं, मैं किसी का पक्ष नहीं लेता; बस दोनों के लिए चाय बना देता हूँ।', acc: { hi: ['जब मम्मी-पापा बहस करते हैं, मैं किसी का पक्ष नहीं लेती; बस दोनों के लिए चाय बना देती हूँ।'] } }
                    ]
                },
                {
                    kind: 'words', title: 'Trust and keeping in touch', list: [
                        { en: 'trustworthy', kn: 'ನಂಬಿಕಸ್ಥ', hi: 'भरोसेमंद', pic: '🔐', def: 'honest and reliable, so others can depend on you' },
                        { en: 'confide', kn: 'ಮನಸ್ಸಿನ ಮಾತು ಹೇಳಿಕೊಳ್ಳು', hi: 'दिल की बात बताना', pic: '🤫', def: 'to tell someone a secret or a private feeling because you trust them' },
                        { en: 'bond', kn: 'ಬಾಂಧವ್ಯ', hi: 'रिश्ता', pic: '🔗', def: 'a close feeling that connects two or more people' },
                        { en: 'keep in touch', kn: 'ಸಂಪರ್ಕದಲ್ಲಿರು', hi: 'संपर्क में रहना', pic: '📱', def: 'to keep talking or writing to someone even when you live far apart' },
                        { en: 'drift apart', kn: 'ನಿಧಾನವಾಗಿ ದೂರವಾಗು', hi: 'धीरे-धीरे दूर हो जाना', pic: '🛶', def: 'to slowly become less close to someone' },
                        { en: 'family ties', kn: 'ಕೌಟುಂಬಿಕ ಬಂಧ', hi: 'पारिवारिक रिश्ते', pic: '🏡', def: 'the close connections between members of a family' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Friends and relationships 2', list: [
                        { read: true, en: 'A trustworthy friend keeps your secrets even after a fight.', kn: 'ನಂಬಿಕಸ್ಥ ಗೆಳೆಯ ಜಗಳದ ನಂತರವೂ ನಿನ್ನ ಗುಟ್ಟುಗಳನ್ನು ಕಾಪಾಡುತ್ತಾನೆ.', hi: 'एक भरोसेमंद दोस्त झगड़े के बाद भी तुम्हारे राज़ नहीं खोलता।' },
                        { en: 'I confide in my sister because she never judges me.', kn: 'ನನ್ನ ಅಕ್ಕ ನನ್ನನ್ನು ಎಂದೂ ಟೀಕಿಸುವುದಿಲ್ಲ, ಅದಕ್ಕೇ ನನ್ನ ಮನಸ್ಸಿನ ಮಾತನ್ನು ಅವಳಿಗೆ ಹೇಳಿಕೊಳ್ಳುತ್ತೇನೆ.', hi: 'मैं अपनी दीदी को दिल की हर बात बताती हूँ, क्योंकि वह मुझे कभी ग़लत नहीं समझती।', acc: { hi: ['मैं अपनी दीदी को दिल की हर बात बताता हूँ, क्योंकि वह मुझे कभी ग़लत नहीं समझती।'] } },
                        { read: true, en: 'Cooking together every Sunday has strengthened the bond between my father and me.', kn: 'ಪ್ರತಿ ಭಾನುವಾರ ಒಟ್ಟಿಗೆ ಅಡುಗೆ ಮಾಡುವುದರಿಂದ ನನ್ನ ಮತ್ತು ಅಪ್ಪನ ಬಾಂಧವ್ಯ ಗಟ್ಟಿಯಾಗಿದೆ.', hi: 'हर रविवार साथ मिलकर खाना बनाने से मेरा और पापा का रिश्ता और गहरा हो गया है।' },
                        { read: true, en: 'We promised to keep in touch, but slowly we drifted apart after college.', kn: 'ಸಂಪರ್ಕದಲ್ಲಿರುತ್ತೇವೆ ಎಂದು ಮಾತು ಕೊಟ್ಟಿದ್ದೆವು, ಆದರೆ ಕಾಲೇಜಿನ ನಂತರ ನಿಧಾನವಾಗಿ ದೂರವಾದೆವು.', hi: 'हमने संपर्क में रहने का वादा किया था, पर कॉलेज के बाद हम धीरे-धीरे दूर हो गए।' },
                        { en: 'In Indian homes, family ties often stay strong across many generations.', kn: 'ಭಾರತೀಯ ಮನೆಗಳಲ್ಲಿ ಕೌಟುಂಬಿಕ ಬಂಧಗಳು ಸಾಮಾನ್ಯವಾಗಿ ಹಲವು ತಲೆಮಾರುಗಳವರೆಗೆ ಗಟ್ಟಿಯಾಗಿ ಉಳಿಯುತ್ತವೆ.', hi: 'भारतीय घरों में पारिवारिक रिश्ते अक्सर कई पीढ़ियों तक मज़बूत बने रहते हैं।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: 'Two friends from Shivamogga', kn: 'ಶಿವಮೊಗ್ಗದ ಇಬ್ಬರು ಗೆಳೆಯರು', hi: 'शिवमोग्गा के दो दोस्त' },
                    text: {
                        en: "Arun and Prakash grew up next door to each other in Shivamogga and shared everything, from cricket bats to secrets. In college they had a bitter quarrel when Prakash thought Arun had told his secret to others. It was only a misunderstanding, but both were too proud to call first. For five years they did not speak, and their friends refused to take sides. Arun's mother, who loved both boys, never stopped hoping they would reconcile. At Prakash's sister's wedding, the two men finally stood face to face. Prakash said, 'I have been holding a grudge for a silly reason; please forgive me.' Arun hugged him, and since that day they have kept in touch every single week.",
                        kn: 'ಅರುಣ್ ಮತ್ತು ಪ್ರಕಾಶ್ ಶಿವಮೊಗ್ಗದಲ್ಲಿ ಅಕ್ಕಪಕ್ಕದ ಮನೆಗಳಲ್ಲಿ ಬೆಳೆದರು ಮತ್ತು ಕ್ರಿಕೆಟ್ ಬ್ಯಾಟಿನಿಂದ ಹಿಡಿದು ಗುಟ್ಟುಗಳವರೆಗೆ ಎಲ್ಲವನ್ನೂ ಹಂಚಿಕೊಳ್ಳುತ್ತಿದ್ದರು. ಕಾಲೇಜಿನಲ್ಲಿ, ಅರುಣ್ ತನ್ನ ಗುಟ್ಟನ್ನು ಬೇರೆಯವರಿಗೆ ಹೇಳಿದ ಎಂದು ಪ್ರಕಾಶ್ ಭಾವಿಸಿದಾಗ ಅವರ ನಡುವೆ ದೊಡ್ಡ ಜಗಳವಾಯಿತು. ಅದು ಕೇವಲ ತಪ್ಪುತಿಳುವಳಿಕೆಯಾಗಿತ್ತು, ಆದರೆ ಮೊದಲು ಕರೆ ಮಾಡಲು ಇಬ್ಬರಿಗೂ ಅಹಂ ಅಡ್ಡ ಬಂತು. ಐದು ವರ್ಷ ಅವರು ಮಾತನಾಡಲಿಲ್ಲ, ಮತ್ತು ಅವರ ಸ್ನೇಹಿತರು ಯಾರ ಪಕ್ಷವನ್ನೂ ವಹಿಸಲಿಲ್ಲ. ಇಬ್ಬರು ಹುಡುಗರನ್ನೂ ಪ್ರೀತಿಸುತ್ತಿದ್ದ ಅರುಣನ ಅಮ್ಮ, ಅವರು ರಾಜಿಯಾಗುತ್ತಾರೆ ಎಂಬ ಆಸೆಯನ್ನು ಎಂದೂ ಬಿಡಲಿಲ್ಲ. ಪ್ರಕಾಶನ ತಂಗಿಯ ಮದುವೆಯಲ್ಲಿ ಇಬ್ಬರೂ ಕೊನೆಗೂ ಮುಖಾಮುಖಿಯಾದರು. "ಒಂದು ಸಣ್ಣ ಕಾರಣಕ್ಕಾಗಿ ಇಷ್ಟು ದಿನ ಮನಸ್ತಾಪ ಇಟ್ಟುಕೊಂಡಿದ್ದೆ; ದಯವಿಟ್ಟು ನನ್ನನ್ನು ಕ್ಷಮಿಸು," ಎಂದ ಪ್ರಕಾಶ್. ಅರುಣ್ ಅವನನ್ನು ಅಪ್ಪಿಕೊಂಡ, ಅಂದಿನಿಂದ ಅವರು ಪ್ರತಿ ವಾರ ತಪ್ಪದೆ ಸಂಪರ್ಕದಲ್ಲಿದ್ದಾರೆ.',
                        hi: 'अरुण और प्रकाश शिवमोग्गा में पड़ोसी बनकर बड़े हुए और क्रिकेट के बल्ले से लेकर राज़ तक सब कुछ बाँटते थे। कॉलेज में उनके बीच तब बड़ा झगड़ा हुआ जब प्रकाश को लगा कि अरुण ने उसका राज़ दूसरों को बता दिया है। वह सिर्फ़ एक ग़लतफ़हमी थी, लेकिन दोनों का अहं पहले फ़ोन करने से रोकता रहा। पाँच साल तक उन्होंने बात नहीं की, और उनके दोस्तों ने किसी का पक्ष नहीं लिया। अरुण की माँ ने, जो दोनों लड़कों से प्यार करती थीं, कभी यह उम्मीद नहीं छोड़ी कि वे सुलह कर लेंगे। प्रकाश की बहन की शादी में आख़िरकार दोनों आमने-सामने आए। प्रकाश ने कहा, "मैं एक छोटी-सी बात पर इतने दिनों से मन में मैल रखे बैठा था; मुझे माफ़ कर दो।" अरुण ने उसे गले लगा लिया, और उस दिन से वे हर हफ़्ते बिना चूके संपर्क में रहते हैं।'
                    },
                    questions: [
                        {
                            q: { en: 'Why did Prakash get angry with Arun?', kn: 'ಪ್ರಕಾಶ್‌ಗೆ ಅರುಣನ ಮೇಲೆ ಯಾಕೆ ಸಿಟ್ಟು ಬಂತು?', hi: 'प्रकाश अरुण से नाराज़ क्यों हुआ?' },
                            options: [
                                { en: 'He thought Arun had told his secret to others', kn: 'ಅರುಣ್ ತನ್ನ ಗುಟ್ಟನ್ನು ಬೇರೆಯವರಿಗೆ ಹೇಳಿದ ಎಂದು ಭಾವಿಸಿದ', hi: 'उसे लगा कि अरुण ने उसका राज़ दूसरों को बता दिया' },
                                { en: 'Arun broke his cricket bat', kn: 'ಅರುಣ್ ಅವನ ಕ್ರಿಕೆಟ್ ಬ್ಯಾಟ್ ಮುರಿದ', hi: 'अरुण ने उसका क्रिकेट बल्ला तोड़ दिया' },
                                { en: "Arun missed his sister's wedding", kn: 'ಅರುಣ್ ಅವನ ತಂಗಿಯ ಮದುವೆಗೆ ಬರಲಿಲ್ಲ', hi: 'अरुण उसकी बहन की शादी में नहीं आया' },
                                { en: 'Arun did not return some money', kn: 'ಅರುಣ್ ಸಾಲದ ಹಣ ಹಿಂದಿರುಗಿಸಲಿಲ್ಲ', hi: 'अरुण ने उधार के पैसे नहीं लौटाए' }
                            ]
                        },
                        {
                            q: { en: 'For how long did they not speak?', kn: 'ಅವರು ಎಷ್ಟು ಕಾಲ ಮಾತನಾಡಲಿಲ್ಲ?', hi: 'उन्होंने कितने समय तक बात नहीं की?' },
                            options: [
                                { en: 'Five years', kn: 'ಐದು ವರ್ಷ', hi: 'पाँच साल' },
                                { en: 'Five months', kn: 'ಐದು ತಿಂಗಳು', hi: 'पाँच महीने' },
                                { en: 'Two years', kn: 'ಎರಡು ವರ್ಷ', hi: 'दो साल' },
                                { en: 'Ten years', kn: 'ಹತ್ತು ವರ್ಷ', hi: 'दस साल' }
                            ]
                        },
                        {
                            q: { en: 'Where did they finally meet again?', kn: 'ಕೊನೆಗೆ ಅವರು ಮತ್ತೆ ಎಲ್ಲಿ ಭೇಟಿಯಾದರು?', hi: 'आख़िरकार वे फिर कहाँ मिले?' },
                            options: [
                                { en: "At Prakash's sister's wedding", kn: 'ಪ್ರಕಾಶನ ತಂಗಿಯ ಮದುವೆಯಲ್ಲಿ', hi: 'प्रकाश की बहन की शादी में' },
                                { en: 'At a cricket match', kn: 'ಒಂದು ಕ್ರಿಕೆಟ್ ಪಂದ್ಯದಲ್ಲಿ', hi: 'एक क्रिकेट मैच में' },
                                { en: "At Arun's house", kn: 'ಅರುಣನ ಮನೆಯಲ್ಲಿ', hi: 'अरुण के घर पर' },
                                { en: 'At their old college', kn: 'ಅವರ ಹಳೆಯ ಕಾಲೇಜಿನಲ್ಲಿ', hi: 'अपने पुराने कॉलेज में' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'Making up', kn: 'ಮತ್ತೆ ಒಂದಾಗುವುದು', hi: 'सुलह' },
                    scenario: {
                        en: 'Akash goes to see his college friend Smita in Belagavi. She has not spoken to him for a week.',
                        kn: 'ಆಕಾಶ್ ಬೆಳಗಾವಿಯಲ್ಲಿ ತನ್ನ ಕಾಲೇಜು ಗೆಳತಿ ಸ್ಮಿತಾಳನ್ನು ನೋಡಲು ಹೋಗುತ್ತಾನೆ. ಒಂದು ವಾರದಿಂದ ಅವಳು ಅವನ ಜೊತೆ ಮಾತನಾಡಿಲ್ಲ.',
                        hi: 'आकाश बेलगावी में अपनी कॉलेज की दोस्त स्मिता से मिलने जाता है। उसने एक हफ़्ते से उससे बात नहीं की है।'
                    },
                    speakers: [{ name: 'Akash', voice: 'm' }, { name: 'Smita', voice: 'f' }],
                    lines: [
                        { speaker: 'Akash', en: 'Smita, can we talk for a minute? I know you are upset with me.', kn: 'ಸ್ಮಿತಾ, ಒಂದು ನಿಮಿಷ ಮಾತನಾಡಬಹುದಾ? ನಿನಗೆ ನನ್ನ ಮೇಲೆ ಬೇಸರ ಇದೆ ಅಂತ ಗೊತ್ತು.', hi: 'स्मिता, क्या हम एक मिनट बात कर सकते हैं? मुझे पता है तुम मुझसे नाराज़ हो।' },
                        { speaker: 'Smita', en: "Upset? You promised to come to my dance performance, and you didn't even call.", kn: 'ಬೇಸರವಾ? ನನ್ನ ನೃತ್ಯ ಪ್ರದರ್ಶನಕ್ಕೆ ಬರುತ್ತೇನೆ ಅಂತ ಮಾತು ಕೊಟ್ಟಿದ್ದೆ, ಒಂದು ಕರೆ ಕೂಡ ಮಾಡಲಿಲ್ಲ.', hi: 'नाराज़? तुमने मेरे डांस प्रोग्राम में आने का वादा किया था, और एक फ़ोन तक नहीं किया।' },
                        { speaker: 'Akash', en: 'You are right, and I am really sorry. My grandmother was taken to hospital that evening.', kn: 'ನೀನು ಹೇಳುವುದು ಸರಿ, ನನ್ನನ್ನು ಕ್ಷಮಿಸು. ಆ ಸಂಜೆ ನನ್ನ ಅಜ್ಜಿಯನ್ನು ಆಸ್ಪತ್ರೆಗೆ ಕರೆದುಕೊಂಡು ಹೋಗಬೇಕಾಯಿತು.', hi: 'तुम सही हो, और मुझे सच में माफ़ करना। उस शाम मेरी दादी को अस्पताल ले जाना पड़ा।' },
                        { speaker: 'Smita', en: "Oh no! Why didn't you tell me? I thought you simply didn't care.", kn: 'ಅಯ್ಯೋ! ನನಗೆ ಯಾಕೆ ಹೇಳಲಿಲ್ಲ? ನಿನಗೆ ನನ್ನ ಬಗ್ಗೆ ಕಾಳಜಿಯೇ ಇಲ್ಲ ಅಂದುಕೊಂಡೆ.', hi: 'अरे नहीं! तुमने मुझे बताया क्यों नहीं? मुझे लगा तुम्हें बस कोई परवाह ही नहीं।' },
                        { speaker: 'Akash', en: 'My phone battery died, and later I felt too embarrassed to explain. It was a silly misunderstanding.', kn: 'ನನ್ನ ಫೋನ್ ಬ್ಯಾಟರಿ ಖಾಲಿಯಾಗಿತ್ತು, ಆಮೇಲೆ ವಿವರಿಸಲು ತುಂಬಾ ಮುಜುಗರವಾಯಿತು. ಇದೊಂದು ಸಣ್ಣ ತಪ್ಪುತಿಳುವಳಿಕೆ ಅಷ್ಟೇ.', hi: 'मेरे फ़ोन की बैटरी ख़त्म हो गई थी, और बाद में समझाने में बड़ी झिझक हुई। यह एक बेवजह की ग़लतफ़हमी थी।' },
                        { speaker: 'Smita', en: 'I wish you had told me earlier. I have been holding a grudge for a whole week.', kn: 'ನೀನು ಮೊದಲೇ ಹೇಳಬೇಕಿತ್ತು. ಒಂದು ವಾರ ಪೂರ್ತಿ ನಿನ್ನ ಮೇಲೆ ಮನಸ್ತಾಪ ಇಟ್ಟುಕೊಂಡಿದ್ದೆ.', hi: 'काश तुमने मुझे पहले बताया होता। मैं पूरे हफ़्ते से मन में मैल रखे बैठी थी।' },
                        { speaker: 'Akash', en: 'I understand. Can you forgive me? Our friendship means a lot to me.', kn: 'ಅರ್ಥವಾಗುತ್ತದೆ. ನನ್ನನ್ನು ಕ್ಷಮಿಸುತ್ತೀಯಾ? ನಮ್ಮ ಸ್ನೇಹ ನನಗೆ ತುಂಬಾ ಮುಖ್ಯ.', hi: 'मैं समझता हूँ। क्या तुम मुझे माफ़ कर सकती हो? हमारी दोस्ती मेरे लिए बहुत मायने रखती है।' },
                        { speaker: 'Smita', en: 'Of course. You are one of the most trustworthy people I know. How is your grandmother now?', kn: 'ಖಂಡಿತ. ನನಗೆ ಗೊತ್ತಿರುವವರಲ್ಲಿ ನೀನು ಅತ್ಯಂತ ನಂಬಿಕಸ್ಥರಲ್ಲಿ ಒಬ್ಬ. ಈಗ ನಿನ್ನ ಅಜ್ಜಿ ಹೇಗಿದ್ದಾರೆ?', hi: 'बिल्कुल। तुम उन लोगों में से हो जिन पर मैं सबसे ज़्यादा भरोसा करती हूँ। अब तुम्हारी दादी कैसी हैं?' },
                        { speaker: 'Akash', en: 'Much better, thank you. She is home and already giving everyone orders!', kn: 'ತುಂಬಾ ಉತ್ತಮವಾಗಿದ್ದಾರೆ, ಧನ್ಯವಾದ. ಮನೆಗೆ ಬಂದಿದ್ದಾರೆ, ಈಗಲೇ ಎಲ್ಲರಿಗೂ ಆಜ್ಞೆ ಮಾಡುತ್ತಿದ್ದಾರೆ!', hi: 'काफ़ी बेहतर हैं, शुक्रिया। घर आ गई हैं और अभी से सबको हुक्म दे रही हैं!' },
                        { speaker: 'Smita', en: 'That sounds like her. Next time, promise me you will keep in touch, even with a dead phone!', kn: 'ಅದು ಅವರ ಸ್ವಭಾವವೇ. ಮುಂದಿನ ಸಲ, ಫೋನ್ ಸತ್ತುಹೋದರೂ ಸಂಪರ್ಕದಲ್ಲಿರುತ್ತೇನೆ ಎಂದು ಮಾತು ಕೊಡು!', hi: 'यह तो बिल्कुल उन्हीं जैसी बात है। अगली बार वादा करो कि फ़ोन बंद होने पर भी संपर्क में रहोगे!' }
                    ],
                    questions: [
                        {
                            q: { en: 'Why was Smita upset?', kn: 'ಸ್ಮಿತಾಗೆ ಯಾಕೆ ಬೇಸರವಾಗಿತ್ತು?', hi: 'स्मिता नाराज़ क्यों थी?' },
                            options: [
                                { en: 'Akash missed her dance performance', kn: 'ಆಕಾಶ್ ಅವಳ ನೃತ್ಯ ಪ್ರದರ್ಶನಕ್ಕೆ ಬರಲಿಲ್ಲ', hi: 'आकाश उसके डांस प्रोग्राम में नहीं आया' },
                                { en: 'Akash forgot her birthday', kn: 'ಆಕಾಶ್ ಅವಳ ಹುಟ್ಟುಹಬ್ಬ ಮರೆತ', hi: 'आकाश उसका जन्मदिन भूल गया' },
                                { en: 'Akash told her secret', kn: 'ಆಕಾಶ್ ಅವಳ ಗುಟ್ಟು ಹೇಳಿಬಿಟ್ಟ', hi: 'आकाश ने उसका राज़ खोल दिया' },
                                { en: 'Akash lost her notes', kn: 'ಆಕಾಶ್ ಅವಳ ನೋಟ್ಸ್ ಕಳೆದುಹಾಕಿದ', hi: 'आकाश ने उसके नोट्स खो दिए' }
                            ]
                        },
                        {
                            q: { en: "Why couldn't Akash come?", kn: 'ಆಕಾಶ್‌ಗೆ ಯಾಕೆ ಬರಲಾಗಲಿಲ್ಲ?', hi: 'आकाश क्यों नहीं आ सका?' },
                            options: [
                                { en: 'His grandmother was taken to hospital', kn: 'ಅವನ ಅಜ್ಜಿಯನ್ನು ಆಸ್ಪತ್ರೆಗೆ ಕರೆದೊಯ್ಯಬೇಕಾಯಿತು', hi: 'उसकी दादी को अस्पताल ले जाना पड़ा' },
                                { en: 'He had an exam', kn: 'ಅವನಿಗೆ ಪರೀಕ್ಷೆ ಇತ್ತು', hi: 'उसकी परीक्षा थी' },
                                { en: 'He missed the bus', kn: 'ಅವನಿಗೆ ಬಸ್ ತಪ್ಪಿತು', hi: 'उसकी बस छूट गई' },
                                { en: 'He was at a cricket match', kn: 'ಅವನು ಕ್ರಿಕೆಟ್ ಪಂದ್ಯದಲ್ಲಿದ್ದ', hi: 'वह क्रिकेट मैच में था' }
                            ]
                        },
                        {
                            q: { en: "Why didn't Akash call Smita?", kn: 'ಆಕಾಶ್ ಸ್ಮಿತಾಗೆ ಯಾಕೆ ಕರೆ ಮಾಡಲಿಲ್ಲ?', hi: 'आकाश ने स्मिता को फ़ोन क्यों नहीं किया?' },
                            options: [
                                { en: 'His phone battery died', kn: 'ಅವನ ಫೋನ್ ಬ್ಯಾಟರಿ ಖಾಲಿಯಾಗಿತ್ತು', hi: 'उसके फ़ोन की बैटरी ख़त्म हो गई थी' },
                                { en: 'He lost his phone', kn: 'ಅವನ ಫೋನ್ ಕಳೆದುಹೋಗಿತ್ತು', hi: 'उसका फ़ोन खो गया था' },
                                { en: 'He forgot her number', kn: 'ಅವಳ ನಂಬರ್ ಮರೆತಿದ್ದ', hi: 'वह उसका नंबर भूल गया था' },
                                { en: 'His phone was stolen', kn: 'ಅವನ ಫೋನ್ ಕಳ್ಳತನವಾಗಿತ್ತು', hi: 'उसका फ़ोन चोरी हो गया था' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'Your best friend is angry because you forgot an important plan. Call them: apologise, explain what happened, and suggest a way to make up.',
                        sample: "Hi Deepa, it's me. Please don't hang up. I know you are angry, and you have every right to be. I completely forgot about our film plan on Saturday, and I am really sorry. My cousin arrived from Pune without warning, and the whole day went in looking after him. That is not an excuse; I should have messaged you. Our friendship means a lot to me, and I don't want a silly mistake to come between us. Can I make it up to you? Let me take you for masala dosa and the same film this Sunday, my treat. What do you say?",
                        checklist: ['I apologised clearly', 'I explained what happened', 'I took responsibility instead of only making excuses', 'I said why the friendship matters to me', 'I suggested a way to make up']
                    }
                }
            ]
        },
        '6:1': {
            name: 'Advice and suggestions',
            lessons: [
                {
                    kind: 'words', title: 'Giving advice', list: [
                        { en: 'suggestion', kn: 'ಸಲಹೆ', hi: 'सुझाव', pic: '💡', def: 'an idea or plan that you offer for someone to think about' },
                        { en: 'word of advice', kn: 'ಕಿವಿಮಾತು', hi: 'एक सलाह', pic: '🗨️', def: 'a short, helpful piece of advice' },
                        { en: 'if I were you', kn: 'ನಾನು ನಿನ್ನ ಜಾಗದಲ್ಲಿದ್ದರೆ', hi: 'अगर मैं तुम्हारी जगह होता', pic: '👤', def: 'words used before you tell someone what you would do in their place' },
                        { en: "you'd better", kn: 'ಹಾಗೆ ಮಾಡುವುದೇ ಒಳ್ಳೆಯದು', hi: 'बेहतर होगा कि', pic: '⚠️', def: 'words used to give strong advice, often with a warning' },
                        { en: "why don't you", kn: 'ಯಾಕೆ ಹೀಗೆ ಮಾಡಬಾರದು', hi: 'क्यों न तुम', pic: '💬', def: 'a friendly way to suggest that someone try something' },
                        { en: 'rule of thumb', kn: 'ಅನುಭವದ ಸೂತ್ರ', hi: 'आज़माया हुआ नियम', pic: '👍', def: 'a simple, practical rule that comes from experience' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Advice and suggestions 1', list: [
                        { read: true, en: 'Thank you for the suggestion; I will try it this week.', kn: 'ಸಲಹೆಗೆ ಧನ್ಯವಾದಗಳು; ಈ ವಾರ ಅದನ್ನು ಪ್ರಯತ್ನಿಸುತ್ತೇನೆ.', hi: 'सुझाव के लिए धन्यवाद; मैं इस हफ़्ते इसे आज़माकर देखूँगा।', acc: { hi: ['सुझाव के लिए धन्यवाद; मैं इस हफ़्ते इसे आज़माकर देखूँगी।'] } },
                        { en: 'A word of advice: never sign a document you have not read.', kn: 'ಒಂದು ಕಿವಿಮಾತು: ನೀವು ಓದದ ಯಾವುದೇ ದಾಖಲೆಗೆ ಎಂದಿಗೂ ಸಹಿ ಹಾಕಬೇಡಿ.', hi: 'एक सलाह: जो काग़ज़ आपने पढ़ा न हो, उस पर कभी दस्तख़त न करें।' },
                        { read: true, en: 'If I were you, I would apologise to her before the matter grows bigger.', kn: 'ನಾನು ನಿನ್ನ ಜಾಗದಲ್ಲಿದ್ದರೆ, ವಿಷಯ ದೊಡ್ಡದಾಗುವ ಮೊದಲೇ ಅವಳ ಬಳಿ ಕ್ಷಮೆ ಕೇಳುತ್ತಿದ್ದೆ.', hi: 'अगर मैं तुम्हारी जगह होता, तो बात बढ़ने से पहले ही उससे माफ़ी माँग लेता।', acc: { hi: ['अगर मैं तुम्हारी जगह होती, तो बात बढ़ने से पहले ही उससे माफ़ी माँग लेती।'] } },
                        { en: "You'd better leave now, or you will miss the last bus to Hassan.", kn: 'ಈಗಲೇ ಹೊರಡುವುದು ಒಳ್ಳೆಯದು, ಇಲ್ಲದಿದ್ದರೆ ಹಾಸನಕ್ಕೆ ಹೋಗುವ ಕೊನೆಯ ಬಸ್ ತಪ್ಪಿಹೋಗುತ್ತದೆ.', hi: 'बेहतर होगा कि तुम अभी निकल जाओ, वरना हासन की आख़िरी बस छूट जाएगी।', acc: { en: ['You had better leave now, or you will miss the last bus to Hassan.'] } },
                        { read: true, en: "Why don't you join the morning walking group at Cubbon Park with me?", kn: 'ನೀನೂ ನನ್ನ ಜೊತೆ ಕಬ್ಬನ್ ಪಾರ್ಕಿನ ಬೆಳಗಿನ ವಾಕಿಂಗ್ ಗುಂಪಿಗೆ ಯಾಕೆ ಸೇರಬಾರದು?', hi: 'तुम भी मेरे साथ कब्बन पार्क के सुबह वाले वॉकिंग ग्रुप में क्यों नहीं आ जाते?' }
                    ]
                },
                {
                    kind: 'words', title: 'Asking for advice', list: [
                        { en: 'dilemma', kn: 'ಇಕ್ಕಟ್ಟು', hi: 'दुविधा', pic: '🔀', def: 'a difficult situation in which you must choose between two options' },
                        { en: 'torn between', kn: 'ಎರಡರ ನಡುವೆ ಸಿಲುಕಿದ', hi: 'दो चीज़ों के बीच उलझा', pic: '💔', def: 'unable to decide between two things that you want' },
                        { en: 'sounding board', kn: 'ಮಾತು ಕೇಳಿ ಸಲಹೆ ಕೊಡುವವರು', hi: 'राय परखने वाला साथी', pic: '📣', def: 'a person you talk to so that you can test your ideas before you decide' },
                        { en: 'heed', kn: 'ಗಮನ ಕೊಡು', hi: 'ध्यान देना', pic: '👂', def: 'to pay careful attention to advice or a warning' },
                        { en: 'think it over', kn: 'ಯೋಚಿಸಿ ನೋಡು', hi: 'सोच-विचार करना', pic: '🤔', def: 'to think carefully about something before you decide' },
                        { en: 'with a pinch of salt', kn: 'ಪೂರ್ತಿ ನಂಬದೆ', hi: 'पूरी तरह सच माने बिना', pic: '🧂', def: 'without completely believing something you are told' }
                    ]
                },
                {
                    kind: 'phrases', title: 'Advice and suggestions 2', list: [
                        { read: true, en: 'I am in a real dilemma: should I take the job in Pune or stay home?', kn: 'ನಾನು ನಿಜವಾದ ಇಕ್ಕಟ್ಟಿನಲ್ಲಿದ್ದೇನೆ: ಪುಣೆಯ ಕೆಲಸ ಒಪ್ಪಿಕೊಳ್ಳಬೇಕೇ ಅಥವಾ ಮನೆಯಲ್ಲೇ ಇರಬೇಕೇ?', hi: 'मैं बड़ी दुविधा में हूँ: पुणे वाली नौकरी लूँ या घर पर ही रहूँ?', acc: { en: ["I'm in a real dilemma: should I take the job in Pune or stay home?"] } },
                        { en: 'She is torn between studying art and joining the family business.', kn: 'ಕಲೆ ಓದುವುದೋ ಅಥವಾ ಮನೆಯ ವ್ಯಾಪಾರಕ್ಕೆ ಸೇರುವುದೋ ಎಂದು ಅವಳು ಗೊಂದಲದಲ್ಲಿದ್ದಾಳೆ.', hi: 'वह कला पढ़ने और पारिवारिक व्यापार से जुड़ने के बीच उलझी हुई है।' },
                        { read: true, en: 'My uncle is a great sounding board whenever I have a big decision to make.', kn: 'ನಾನು ದೊಡ್ಡ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳಬೇಕಾದಾಗಲೆಲ್ಲಾ ನನ್ನ ಚಿಕ್ಕಪ್ಪ ನನ್ನ ಮಾತನ್ನು ತಾಳ್ಮೆಯಿಂದ ಕೇಳಿ ಸಲಹೆ ಕೊಡುತ್ತಾರೆ.', hi: 'जब भी मुझे कोई बड़ा फ़ैसला लेना होता है, मेरे चाचा मेरी बात ध्यान से सुनकर सलाह देते हैं।' },
                        { en: "He did not heed the doctor's warning and fell ill again.", kn: 'ಅವನು ವೈದ್ಯರ ಎಚ್ಚರಿಕೆಗೆ ಗಮನ ಕೊಡಲಿಲ್ಲ, ಮತ್ತೆ ಕಾಯಿಲೆ ಬಿದ್ದ.', hi: 'उसने डॉक्टर की चेतावनी पर ध्यान नहीं दिया और फिर से बीमार पड़ गया।', acc: { en: ["He didn't heed the doctor's warning and fell ill again."] } },
                        { en: 'Think it over carefully, and take online reviews with a pinch of salt.', kn: 'ಚೆನ್ನಾಗಿ ಯೋಚಿಸಿ ನೋಡಿ, ಮತ್ತು ಆನ್‌ಲೈನ್ ವಿಮರ್ಶೆಗಳನ್ನು ಕಣ್ಣುಮುಚ್ಚಿ ನಂಬಬೇಡಿ.', hi: 'अच्छी तरह सोच-विचार कर लो, और ऑनलाइन रिव्यू पर आँख मूँदकर भरोसा मत करो।' }
                    ]
                },
                {
                    kind: 'story',
                    title: { en: "Ajji's advice", kn: 'ಅಜ್ಜಿಯ ಸಲಹೆ', hi: 'दादी की सलाह' },
                    text: {
                        en: "Sneha from Udupi had a dilemma: she had a place at a design college in Ahmedabad, but her parents wanted her to study nearer home. She felt torn between her dream and her family, so she went to her grandmother, who had always been her sounding board. Ajji listened quietly and then said, 'If I were you, I would not decide in a hurry; think it over for a few days.' She also gave Sneha a word of advice about the comments of relatives: take them with a pinch of salt. 'My rule of thumb is simple,' Ajji added, 'choose the path you will not regret at sixty.' Then she made a suggestion: 'Why don't you show your parents the college website and your portfolio?' Sneha heeded her advice, and after seeing her work, her parents agreed. Today she calls Ajji every Sunday and tells her all about her classes.",
                        kn: 'ಉಡುಪಿಯ ಸ್ನೇಹಾ ಒಂದು ಇಕ್ಕಟ್ಟಿನಲ್ಲಿದ್ದಳು: ಅಹಮದಾಬಾದಿನ ಒಂದು ವಿನ್ಯಾಸ ಕಾಲೇಜಿನಲ್ಲಿ ಅವಳಿಗೆ ಸೀಟು ಸಿಕ್ಕಿತ್ತು, ಆದರೆ ಅವಳು ಮನೆಯ ಹತ್ತಿರದಲ್ಲೇ ಓದಬೇಕೆಂದು ಅಪ್ಪ ಅಮ್ಮ ಬಯಸಿದ್ದರು. ತನ್ನ ಕನಸು ಮತ್ತು ಕುಟುಂಬದ ನಡುವೆ ಸಿಲುಕಿದ ಅವಳು, ಯಾವಾಗಲೂ ತನ್ನ ಮಾತು ಕೇಳಿ ಸಲಹೆ ಕೊಡುವ ಅಜ್ಜಿಯ ಬಳಿ ಹೋದಳು. ಅಜ್ಜಿ ಮೌನವಾಗಿ ಕೇಳಿಸಿಕೊಂಡು ಹೇಳಿದರು, "ನಾನು ನಿನ್ನ ಜಾಗದಲ್ಲಿದ್ದರೆ ಆತುರದಲ್ಲಿ ನಿರ್ಧರಿಸುತ್ತಿರಲಿಲ್ಲ; ಕೆಲವು ದಿನ ಯೋಚಿಸಿ ನೋಡು." ಸಂಬಂಧಿಕರ ಮಾತುಗಳ ಬಗ್ಗೆಯೂ ಅವರು ಒಂದು ಕಿವಿಮಾತು ಹೇಳಿದರು: ಅವನ್ನು ಪೂರ್ತಿ ನಂಬಬೇಡ. "ನನ್ನ ಅನುಭವದ ಸೂತ್ರ ಸರಳ," ಎಂದು ಅಜ್ಜಿ ಸೇರಿಸಿದರು, "ಅರವತ್ತನೇ ವಯಸ್ಸಿನಲ್ಲಿ ವಿಷಾದ ಪಡದ ದಾರಿಯನ್ನು ಆರಿಸು." ನಂತರ ಅವರು ಒಂದು ಸಲಹೆ ಕೊಟ್ಟರು: "ಅಪ್ಪ ಅಮ್ಮನಿಗೆ ಕಾಲೇಜಿನ ವೆಬ್‌ಸೈಟ್ ಮತ್ತು ನಿನ್ನ ಚಿತ್ರಗಳ ಸಂಗ್ರಹವನ್ನು ಯಾಕೆ ತೋರಿಸಬಾರದು?" ಸ್ನೇಹಾ ಅವರ ಸಲಹೆಗೆ ಗಮನ ಕೊಟ್ಟಳು, ಅವಳ ಕೆಲಸವನ್ನು ನೋಡಿದ ಮೇಲೆ ಅಪ್ಪ ಅಮ್ಮ ಒಪ್ಪಿದರು. ಇಂದು ಅವಳು ಪ್ರತಿ ಭಾನುವಾರ ಅಜ್ಜಿಗೆ ಕರೆ ಮಾಡಿ ತನ್ನ ತರಗತಿಗಳ ಬಗ್ಗೆ ಎಲ್ಲವನ್ನೂ ಹೇಳುತ್ತಾಳೆ.',
                        hi: 'उडुपी की स्नेहा एक दुविधा में थी: उसे अहमदाबाद के एक डिज़ाइन कॉलेज में दाख़िला मिल गया था, लेकिन उसके माता-पिता चाहते थे कि वह घर के पास ही पढ़े। वह अपने सपने और अपने परिवार के बीच उलझी हुई थी, इसलिए वह अपनी दादी के पास गई, जो हमेशा उसकी बात ध्यान से सुनकर राय देती थीं। दादी ने चुपचाप सुना और फिर कहा, "अगर मैं तुम्हारी जगह होती, तो जल्दबाज़ी में फ़ैसला न करती; कुछ दिन अच्छी तरह सोच-विचार कर लो।" उन्होंने रिश्तेदारों की बातों के बारे में भी एक सलाह दी: उन्हें पूरी तरह सच मत मानना। "मेरा आज़माया हुआ नियम सीधा है," दादी ने आगे कहा, "वह रास्ता चुनो जिस पर साठ की उम्र में पछतावा न हो।" फिर उन्होंने एक सुझाव दिया: "तुम अपने माता-पिता को कॉलेज की वेबसाइट और अपना पोर्टफ़ोलियो क्यों नहीं दिखातीं?" स्नेहा ने उनकी सलाह मानी, और उसका काम देखकर माता-पिता मान गए। आज वह हर रविवार दादी को फ़ोन करके अपनी कक्षाओं के बारे में सब कुछ बताती है।'
                    },
                    questions: [
                        {
                            q: { en: "What was Sneha's dilemma?", kn: 'ಸ್ನೇಹಾಳ ಇಕ್ಕಟ್ಟು ಏನಾಗಿತ್ತು?', hi: 'स्नेहा की दुविधा क्या थी?' },
                            options: [
                                { en: 'Whether to study design in Ahmedabad or stay near home', kn: 'ಅಹಮದಾಬಾದಿನಲ್ಲಿ ವಿನ್ಯಾಸ ಓದುವುದೋ ಮನೆಯ ಹತ್ತಿರವೇ ಇರುವುದೋ', hi: 'अहमदाबाद में डिज़ाइन पढ़े या घर के पास रहे' },
                                { en: 'Whether to learn music or dance', kn: 'ಸಂಗೀತ ಕಲಿಯುವುದೋ ನೃತ್ಯ ಕಲಿಯುವುದೋ', hi: 'संगीत सीखे या नृत्य' },
                                { en: 'Whether to buy a laptop or a phone', kn: 'ಲ್ಯಾಪ್‌ಟಾಪ್ ಕೊಳ್ಳುವುದೋ ಫೋನ್ ಕೊಳ್ಳುವುದೋ', hi: 'लैपटॉप ख़रीदे या फ़ोन' },
                                { en: 'Whether to move to Mysuru or Mangaluru', kn: 'ಮೈಸೂರಿಗೆ ಹೋಗುವುದೋ ಮಂಗಳೂರಿಗೆ ಹೋಗುವುದೋ', hi: 'मैसूरु जाए या मंगलुरु' }
                            ]
                        },
                        {
                            q: { en: "What did Ajji say about relatives' comments?", kn: 'ಸಂಬಂಧಿಕರ ಮಾತುಗಳ ಬಗ್ಗೆ ಅಜ್ಜಿ ಏನು ಹೇಳಿದರು?', hi: 'रिश्तेदारों की बातों के बारे में दादी ने क्या कहा?' },
                            options: [
                                { en: 'Take them with a pinch of salt', kn: 'ಅವನ್ನು ಪೂರ್ತಿ ನಂಬಬೇಡ', hi: 'उन्हें पूरी तरह सच मत मानो' },
                                { en: 'Follow them carefully', kn: 'ಅವನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಪಾಲಿಸು', hi: 'उन्हें ध्यान से मानो' },
                                { en: 'Write them down', kn: 'ಅವನ್ನು ಬರೆದಿಟ್ಟುಕೋ', hi: 'उन्हें लिख लो' },
                                { en: 'Argue with every relative', kn: 'ಪ್ರತಿಯೊಬ್ಬ ಸಂಬಂಧಿಕರ ಜೊತೆ ವಾದ ಮಾಡು', hi: 'हर रिश्तेदार से बहस करो' }
                            ]
                        },
                        {
                            q: { en: "What finally convinced Sneha's parents?", kn: 'ಕೊನೆಗೆ ಸ್ನೇಹಾಳ ಅಪ್ಪ ಅಮ್ಮನನ್ನು ಒಪ್ಪಿಸಿದ್ದು ಯಾವುದು?', hi: 'आख़िर में स्नेहा के माता-पिता किस बात से मान गए?' },
                            options: [
                                { en: 'Seeing her work', kn: 'ಅವಳ ಕೆಲಸವನ್ನು ನೋಡಿದ್ದು', hi: 'उसका काम देखकर' },
                                { en: 'A call from the college', kn: 'ಕಾಲೇಜಿನಿಂದ ಬಂದ ಕರೆ', hi: 'कॉलेज से आए फ़ोन से' },
                                { en: "Ajji's angry letter", kn: 'ಅಜ್ಜಿಯ ಸಿಟ್ಟಿನ ಪತ್ರ', hi: 'दादी की नाराज़ चिट्ठी से' },
                                { en: 'A scholarship offer', kn: 'ವಿದ್ಯಾರ್ಥಿವೇತನದ ಆಫರ್', hi: 'छात्रवृत्ति के प्रस्ताव से' }
                            ]
                        }
                    ]
                },
                {
                    kind: 'listen',
                    title: { en: 'A noisy roommate', kn: 'ಗದ್ದಲ ಮಾಡುವ ರೂಮ್‌ಮೇಟ್', hi: 'शोर करने वाला रूममेट' },
                    scenario: {
                        en: 'Deepak, a first-year student in Dharwad, phones his elder cousin Shalini for advice about his hostel roommate.',
                        kn: 'ಧಾರವಾಡದಲ್ಲಿ ಮೊದಲ ವರ್ಷದ ವಿದ್ಯಾರ್ಥಿಯಾದ ದೀಪಕ್, ತನ್ನ ಹಾಸ್ಟೆಲ್ ರೂಮ್‌ಮೇಟ್ ಬಗ್ಗೆ ಸಲಹೆ ಕೇಳಲು ತನ್ನ ಸೋದರಸಂಬಂಧಿ ಶಾಲಿನಿ ಅಕ್ಕನಿಗೆ ಫೋನ್ ಮಾಡುತ್ತಾನೆ.',
                        hi: 'धारवाड़ में पहले साल का छात्र दीपक अपने हॉस्टल रूममेट के बारे में सलाह लेने के लिए अपनी चचेरी बहन शालिनी को फ़ोन करता है।'
                    },
                    speakers: [{ name: 'Deepak', voice: 'm' }, { name: 'Shalini', voice: 'f' }],
                    lines: [
                        { speaker: 'Deepak', en: "Shalini akka, can I ask your advice about something? I don't know who else to talk to.", kn: 'ಶಾಲಿನಿ ಅಕ್ಕ, ಒಂದು ವಿಷಯದ ಬಗ್ಗೆ ನಿಮ್ಮ ಸಲಹೆ ಕೇಳಬಹುದಾ? ಬೇರೆ ಯಾರ ಜೊತೆ ಮಾತನಾಡಬೇಕು ಅಂತ ಗೊತ್ತಾಗುತ್ತಿಲ್ಲ.', hi: 'शालिनी दीदी, क्या मैं किसी बात पर आपकी सलाह ले सकता हूँ? समझ नहीं आ रहा कि और किससे बात करूँ।' },
                        { speaker: 'Shalini', en: "Of course, Deepak. What's on your mind?", kn: 'ಖಂಡಿತ, ದೀಪಕ್. ಏನು ವಿಷಯ, ಹೇಳು?', hi: 'ज़रूर, दीपक। क्या बात है, बताओ?' },
                        { speaker: 'Deepak', en: "My hostel roommate plays loud music until two in the morning, and I can't sleep.", kn: 'ನನ್ನ ಹಾಸ್ಟೆಲ್ ರೂಮ್‌ಮೇಟ್ ರಾತ್ರಿ ಎರಡು ಗಂಟೆಯವರೆಗೆ ಜೋರಾಗಿ ಹಾಡು ಹಾಕುತ್ತಾನೆ, ನನಗೆ ನಿದ್ದೆಯೇ ಬರುವುದಿಲ್ಲ.', hi: 'मेरा हॉस्टल का रूममेट रात दो बजे तक तेज़ आवाज़ में गाने बजाता है, और मुझे नींद ही नहीं आती।' },
                        { speaker: 'Shalini', en: 'That sounds tiring. Have you told him how it affects you?', kn: 'ಅದು ತುಂಬಾ ಸುಸ್ತು ಮಾಡುವ ವಿಷಯ. ಅದರಿಂದ ನಿನಗೆ ಏನು ತೊಂದರೆ ಆಗುತ್ತಿದೆ ಎಂದು ಅವನಿಗೆ ಹೇಳಿದ್ದೀಯಾ?', hi: 'यह तो थका देने वाली बात है। क्या तुमने उसे बताया है कि इससे तुम्हें क्या परेशानी होती है?' },
                        { speaker: 'Deepak', en: "Not really. I'm worried we will quarrel, and we have to live together all year.", kn: 'ಇಲ್ಲ. ಜಗಳ ಆಗಬಹುದು ಅಂತ ಭಯ, ವರ್ಷಪೂರ್ತಿ ನಾವು ಒಟ್ಟಿಗೆ ಇರಬೇಕು.', hi: 'नहीं। मुझे डर है कि झगड़ा हो जाएगा, और हमें पूरे साल साथ रहना है।' },
                        { speaker: 'Shalini', en: 'If I were you, I would talk to him calmly, at a time when you are both relaxed.', kn: 'ನಾನು ನಿನ್ನ ಜಾಗದಲ್ಲಿದ್ದರೆ, ನೀವಿಬ್ಬರೂ ನಿರಾಳವಾಗಿರುವ ಸಮಯದಲ್ಲಿ ಅವನ ಜೊತೆ ಶಾಂತವಾಗಿ ಮಾತನಾಡುತ್ತಿದ್ದೆ.', hi: 'अगर मैं तुम्हारी जगह होती, तो ऐसे समय उससे शांति से बात करती जब तुम दोनों आराम से हो।' },
                        { speaker: 'Deepak', en: "That's a good suggestion. But what should I actually say?", kn: 'ಅದು ಒಳ್ಳೆಯ ಸಲಹೆ. ಆದರೆ ನಿಜವಾಗಿ ನಾನು ಏನು ಹೇಳಬೇಕು?', hi: 'यह अच्छा सुझाव है। पर असल में मुझे कहना क्या चाहिए?' },
                        { speaker: 'Shalini', en: "A good rule of thumb is to talk about your problem, not his faults. Why don't you suggest headphones after eleven?", kn: 'ಅವನ ತಪ್ಪುಗಳ ಬಗ್ಗೆ ಅಲ್ಲ, ನಿನ್ನ ತೊಂದರೆಯ ಬಗ್ಗೆ ಮಾತನಾಡು ಎಂಬುದು ಒಳ್ಳೆಯ ಅನುಭವದ ಸೂತ್ರ. ರಾತ್ರಿ ಹನ್ನೊಂದರ ನಂತರ ಹೆಡ್‌ಫೋನ್ ಬಳಸು ಎಂದು ಯಾಕೆ ಸೂಚಿಸಬಾರದು?', hi: 'एक आज़माया हुआ नियम है: उसकी ग़लतियों की नहीं, अपनी परेशानी की बात करो। तुम ग्यारह बजे के बाद हेडफ़ोन लगाने का सुझाव क्यों नहीं देते?' },
                        { speaker: 'Deepak', en: "That sounds fair. I'll think it over and talk to him this weekend.", kn: 'ಅದು ನ್ಯಾಯವಾಗಿದೆ. ನಾನು ಯೋಚಿಸಿ ನೋಡಿ ಈ ವಾರಾಂತ್ಯ ಅವನ ಜೊತೆ ಮಾತನಾಡುತ್ತೇನೆ.', hi: 'यह ठीक लगता है। मैं इस पर सोच-विचार करके इस सप्ताहांत उससे बात करूँगा।' },
                        { speaker: 'Shalini', en: "Good. And you'd better not wait too long, or you will fall asleep in your exams!", kn: 'ಒಳ್ಳೆಯದು. ಆದರೆ ತುಂಬಾ ದಿನ ಕಾಯದೇ ಇರುವುದು ಒಳ್ಳೆಯದು, ಇಲ್ಲದಿದ್ದರೆ ಪರೀಕ್ಷೆಯಲ್ಲೇ ನಿದ್ದೆ ಹೋಗುತ್ತೀಯ!', hi: 'अच्छा है। और बेहतर होगा कि तुम ज़्यादा देर न करो, वरना परीक्षा में ही सो जाओगे!' }
                    ],
                    questions: [
                        {
                            q: { en: "What is Deepak's problem?", kn: 'ದೀಪಕ್‌ನ ಸಮಸ್ಯೆ ಏನು?', hi: 'दीपक की समस्या क्या है?' },
                            options: [
                                { en: 'His roommate plays loud music late at night', kn: 'ಅವನ ರೂಮ್‌ಮೇಟ್ ರಾತ್ರಿ ತಡವಾಗಿ ಜೋರಾಗಿ ಹಾಡು ಹಾಕುತ್ತಾನೆ', hi: 'उसका रूममेट देर रात तक तेज़ गाने बजाता है' },
                                { en: 'His roommate never cleans the room', kn: 'ಅವನ ರೂಮ್‌ಮೇಟ್ ಎಂದೂ ಕೋಣೆ ಸ್ವಚ್ಛ ಮಾಡುವುದಿಲ್ಲ', hi: 'उसका रूममेट कभी कमरा साफ़ नहीं करता' },
                                { en: 'His roommate borrows his money', kn: 'ಅವನ ರೂಮ್‌ಮೇಟ್ ಅವನಿಂದ ಹಣ ಸಾಲ ಪಡೆಯುತ್ತಾನೆ', hi: 'उसका रूममेट उससे पैसे उधार लेता है' },
                                { en: 'His roommate wakes up too early', kn: 'ಅವನ ರೂಮ್‌ಮೇಟ್ ತುಂಬಾ ಬೇಗ ಏಳುತ್ತಾನೆ', hi: 'उसका रूममेट बहुत जल्दी उठता है' }
                            ]
                        },
                        {
                            q: { en: "Why hasn't Deepak spoken to his roommate yet?", kn: 'ದೀಪಕ್ ಇನ್ನೂ ತನ್ನ ರೂಮ್‌ಮೇಟ್ ಜೊತೆ ಯಾಕೆ ಮಾತನಾಡಿಲ್ಲ?', hi: 'दीपक ने अब तक अपने रूममेट से बात क्यों नहीं की?' },
                            options: [
                                { en: 'He is worried they will quarrel', kn: 'ಜಗಳ ಆಗಬಹುದು ಎಂಬ ಭಯ', hi: 'उसे डर है कि झगड़ा हो जाएगा' },
                                { en: 'He does not know his name', kn: 'ಅವನಿಗೆ ಅವನ ಹೆಸರು ಗೊತ್ತಿಲ್ಲ', hi: 'उसे उसका नाम नहीं पता' },
                                { en: 'The roommate is always away', kn: 'ರೂಮ್‌ಮೇಟ್ ಯಾವಾಗಲೂ ಹೊರಗಿರುತ್ತಾನೆ', hi: 'रूममेट हमेशा बाहर रहता है' },
                                { en: 'He wants to change rooms', kn: 'ಅವನಿಗೆ ಕೋಣೆ ಬದಲಾಯಿಸಬೇಕಿದೆ', hi: 'वह कमरा बदलना चाहता है' }
                            ]
                        },
                        {
                            q: { en: 'What does Shalini suggest he ask for?', kn: 'ಏನನ್ನು ಕೇಳಲು ಶಾಲಿನಿ ಸಲಹೆ ನೀಡುತ್ತಾಳೆ?', hi: 'शालिनी उसे क्या माँगने का सुझाव देती है?' },
                            options: [
                                { en: 'Headphones after eleven at night', kn: 'ರಾತ್ರಿ ಹನ್ನೊಂದರ ನಂತರ ಹೆಡ್‌ಫೋನ್', hi: 'रात ग्यारह बजे के बाद हेडफ़ोन' },
                                { en: 'A new room', kn: 'ಹೊಸ ಕೋಣೆ', hi: 'नया कमरा' },
                                { en: 'Music only on weekends', kn: 'ವಾರಾಂತ್ಯದಲ್ಲಿ ಮಾತ್ರ ಹಾಡು', hi: 'सिर्फ़ सप्ताहांत में गाने' },
                                { en: 'A complaint to the warden', kn: 'ವಾರ್ಡನ್‌ಗೆ ದೂರು', hi: 'वार्डन से शिकायत' }
                            ]
                        }
                    ],
                    speaking: {
                        prompt: 'A younger friend is nervous about speaking English in front of the class. Give them advice using "If I were you", "Why don\'t you" and "You\'d better", and say why each idea helps.',
                        sample: "Don't worry, everyone feels nervous at first. If I were you, I would practise the talk aloud at home, in front of a mirror or your family, because hearing your own voice makes it less scary. Why don't you also write your main points on a small card? Then you won't forget anything. And you'd better speak slowly; when we are nervous, we rush, and people can't follow us. One more word of advice: don't worry about small mistakes. The class wants to hear your ideas, not perfect grammar. If you practise for ten minutes every day, I'm sure you'll do really well.",
                        checklist: ['I used "If I were you"', 'I made a suggestion with "Why don\'t you"', 'I gave strong advice with "You\'d better"', 'I explained why each idea helps', 'I encouraged my friend at the end']
                    }
                }
            ]
        }
    },
    glosses: {
        kn: {
            // 1:1 Giving opinions
            'ನನ್ನ ಪ್ರಕಾರ, ಪ್ರತಿ ಮಗುವೂ ಕನಿಷ್ಠ ಒಂದು ಸಂಗೀತ ವಾದ್ಯವನ್ನು ಕಲಿಯಬೇಕು.': 'my/me|according to/in the view of|every/each|child (too)/every child|at least/minimum|one/a|music/musical|instrument|should learn/must learn',
            'ನನ್ನ ಮಟ್ಟಿಗೆ, ಹೊಸ ಬಸ್ ವೇಳಾಪಟ್ಟಿ ಹಳೆಯದಕ್ಕಿಂತ ಎಷ್ಟೋ ಉತ್ತಮವಾಗಿದೆ.': 'my/me|as far as concerned/for my part|new|bus|timetable/schedule|than the old one/than before|far/so much|is better/has improved',
            'ತರಗತಿಯಲ್ಲಿ ಮೊಬೈಲ್ ಫೋನ್ ಬಳಕೆಯ ಬಗ್ಗೆ ನಿಮ್ಮ ನಿಲುವು ಏನು?': 'in the classroom/in class|mobile|phone/phones|use/of using|about/on|your|stance/position|what/what is',
            'ಅವಳು ಎಷ್ಟು ದೃಢ ನಂಬಿಕೆಯಿಂದ ಮಾತನಾಡಿದಳೆಂದರೆ ಕೋಣೆಯಲ್ಲಿ ಯಾರೂ ಅವಳೊಂದಿಗೆ ವಾದಿಸಲಿಲ್ಲ.': 'she|so/such|firm/strong|with belief/with conviction|spoke so that/she spoke such that|in the room/in the hall|nobody/no one|with her|did not argue/argued not',
            'ನೇರವಾಗಿ ಹೇಳಬೇಕೆಂದರೆ, ಆ ಸಿನಿಮಾ ತುಂಬಾ ಉದ್ದವಾಗಿತ್ತು ಮತ್ತು ಸ್ವಲ್ಪ ಬೇಸರ ತರಿಸಿತು.': 'directly/frankly|if I must say/to tell the truth|that/the|film/movie|too/very|was long/was lengthy|and|a little/rather|boredom/dullness|brought/caused',
            'ನಿಮ್ಮ ತರ್ಕ ಸ್ಪಷ್ಟವಾಗಿದೆ, ಆದರೆ ನಾನು ಕೆಲವು ಉದಾಹರಣೆಗಳನ್ನು ಕೇಳಲು ಬಯಸುತ್ತೇನೆ.': 'your|reasoning/logic|is clear/is plain|but|I|some/a few|examples|to hear/to listen to|I want/I would like',
            'ಸಣ್ಣ ಊರುಗಳಲ್ಲಿ ವಾಸಿಸುವುದು ತುಂಬಾ ಹಿತವಾಗಿರಬಹುದು; ಉದಾಹರಣೆಗೆ, ಉಡುಪಿ ಶಾಂತ ಮತ್ತು ಸ್ವಚ್ಛವಾಗಿದೆ.': 'small|in towns/in places|living/to live|very/really|can be pleasant/may be lovely|for example/for instance|Udupi|calm/peaceful|and|is clean/is tidy',
            'ಅದು ಕೇವಲ ಒಂದು ಊಹೆ; ಅದನ್ನು ಸಮರ್ಥಿಸಲು ನಿಮ್ಮ ಬಳಿ ಏನಾದರೂ ಆಧಾರ ಇದೆಯೇ?': 'that/it|only/just|one/an|assumption/guess|it/that|to support/to back up|your/you|with/near|any/anything|proof/basis|is there/have (you)',
            'ಕಾಡಿನ ಮೂಲಕ ಹೋಗುವ ಆ ಅಡ್ಡದಾರಿ ಒಳ್ಳೆಯದಲ್ಲ ಎಂದು ನನ್ನ ಒಳಮನಸ್ಸು ಹೇಳುತ್ತಿತ್ತು.': 'of the forest/forest|through/via|going/that goes|that/the|shortcut/short path|is not good/is no good|that/saying|my|inner mind/gut|was telling/kept saying',
            'ಒಟ್ಟಾರೆಯಾಗಿ, ಆನ್‌ಲೈನ್ ತರಗತಿಗಳು ನಾವು ಅಂದುಕೊಂಡಿದ್ದಕ್ಕಿಂತ ಚೆನ್ನಾಗಿ ನಡೆದವು ಎಂದು ನನಗನಿಸುತ್ತದೆ.': 'on the whole/overall|online|classes/lessons|we|than we thought/than expected|well/nicely|went/worked|that|I feel/I think',
            // 2:1 Agreeing and disagreeing
            'ಕ್ರಿಕೆಟ್ ವಿಷಯದಲ್ಲಿ ನನಗೂ ನನ್ನ ಅಪ್ಪನಿಗೂ ಒಂದೇ ಅಭಿಪ್ರಾಯ ಇರುವುದು ತೀರಾ ಅಪರೂಪ.': 'cricket|in the matter/about|me too/and I|my|and father/father too|same/one|opinion/view|having/being|very/quite|rare/uncommon',
            'ಅದು ಸರಿಯಾದ ಮಾತು; ಖರ್ಚಿನ ಬಗ್ಗೆ ನಾನು ಯೋಚಿಸಿಯೇ ಇರಲಿಲ್ಲ.': 'that/it|right/fair|point/word|of the cost/of the expense|about|I|thought at all/even thought|had not/was not',
            'ನಾನು ಸಂಪೂರ್ಣವಾಗಿ ಒಪ್ಪುತ್ತೇನೆ; ಗ್ರಂಥಾಲಯ ಭಾನುವಾರವೂ ತೆರೆದಿರಬೇಕು.': 'I|completely/fully|agree/I agree|library|on Sundays too/Sunday also|should stay open/must be open',
            'ನೀವು ಹೇಳಿದ್ದು ಸರಿ ಎಂದು ಒಪ್ಪಿಕೊಳ್ಳುತ್ತೇನೆ; ಸಕಲೇಶಪುರದ ದಾರಿ ತುಂಬಾ ಬೇಗ ತಲುಪಿಸಿತು.': 'you|what you said/said|right/correct|that|I admit/I concede|of Sakleshpur/via Sakleshpur|road/way|very/much|quickly/fast|got us there/brought us',
            'ಸ್ವಲ್ಪ ಮಟ್ಟಿಗೆ ನೀವು ಹೇಳುವುದು ಸರಿ, ಆದರೆ ನಾವಿಬ್ಬರೂ ಒಪ್ಪುವ ಅಂಶಗಳನ್ನು ಹುಡುಕೋಣ.': 'some/a little|extent/level|you|what you say/saying|right/correct|but|we both/both of us|agree on/that agree|points/things|let us look/let us find',
            'ಗೌರವದಿಂದ ಹೇಳುವುದಾದರೆ ಸರ್, ಈ ಅಂಕಿಅಂಶಗಳು ಬೇರೆಯೇ ಕಥೆ ಹೇಳುತ್ತವೆ ಎಂದು ನನಗನಿಸುತ್ತದೆ.': 'with respect/respectfully|if I may say/if I say|sir|these/this|figures/data|quite different/another|story/tale|tell/say|that|I feel/I think',
            'ನನ್ನ ಅಭಿಪ್ರಾಯ ಬೇರೆ; ಮಾಲ್‌ಗಿಂತ ಹಳೆಯ ಮಾರುಕಟ್ಟೆಗೆ ಹೆಚ್ಚು ವಿಶೇಷತೆ ಇದೆ.': 'my|opinion/view|different/other|than the mall|old|market (has)/to the market|more/far more|charm/character|is/there is',
            'ಎರಡೂ ಕಡೆಯ ಮಾತು ಕೇಳಿದ ಮೇಲೆ, ಪ್ರಾಂಶುಪಾಲರು ತಮ್ಮ ನಿರ್ಧಾರವನ್ನು ಮರುಪರಿಶೀಲಿಸಲು ಒಪ್ಪಿದರು.': 'both|of the sides/side|words/talk|heard/having heard|after/upon|the principal/principal|her/their own|decision|to reconsider/to review again|agreed',
            'ಮೊದಲು ಅವನು ಪ್ರವಾಸಕ್ಕೆ ವಿರೋಧವಾಗಿದ್ದ, ಆದರೆ ನಂತರ ಅವನ ಮನಸ್ಸು ಬದಲಾಯಿತು.': 'at first/first|he|to the trip/the trip|was against/opposed|but|later/then|his|mind/heart|changed/turned',
            'ನಾವಿಬ್ಬರೂ ವಿಶಾಲ ಮನಸ್ಸಿನವರು, ಹಾಗಾಗಿ ಭಿನ್ನಾಭಿಪ್ರಾಯವನ್ನು ಸುಮ್ಮನೆ ಒಪ್ಪಿಕೊಂಡು ಮುಂದೆ ಸಾಗಬಹುದು.': 'we both/both of us|broad/wide|minded people/of mind|so/therefore|the disagreement/difference of opinion|simply/just|accepting/having accepted|ahead/forward|can move/can go',
            // 3:1 Memories
            'ಹಳೆಯ ಸಿನಿಮಾ ಹಾಡುಗಳು ನನ್ನ ಅಜ್ಜಿಗೆ ಯಾವಾಗಲೂ ಹಳೆಯ ದಿನಗಳನ್ನು ನೆನಪಿಸುತ್ತವೆ.': 'old|film/movie|songs|my|to grandmother/grandmother|always|old/past|days|remind of/bring back',
            'ನನ್ನ ಬಾಲ್ಯದಲ್ಲಿ ನಾವು ಕತ್ತಲಾಗುವವರೆಗೂ ಹೊಲಗಳಲ್ಲಿ ಆಡುತ್ತಿದ್ದೆವು.': 'my|in childhood/as a child|we|until dark/till it got dark|in the fields/in farms|used to play/would play',
            'ಶಾಲೆಯ ನನ್ನ ಮೊದಲ ದಿನದ ನೆನಪು ಇನ್ನೂ ನನ್ನ ಮನಸ್ಸಿನಲ್ಲಿ ಜೀವಂತವಾಗಿದೆ.': 'of school/at school|my|first|of the day/day|memory|still/even now|my|in mind/in the mind|is alive/is vivid',
            'ನನ್ನ ಮಾವಂದಿರು ಭೇಟಿಯಾದಾಗಲೆಲ್ಲಾ ಧಾರವಾಡದ ತಮ್ಮ ಕಾಲೇಜು ದಿನಗಳನ್ನು ನೆನೆಸಿಕೊಳ್ಳುತ್ತಾರೆ.': 'my|uncles/brothers of mother|whenever they meet/every time they meet|in Dharwad/of Dharwad|their/their own|college|days|recall/reminisce about',
            'ನಾನು ಹುಟ್ಟಿದ ಮಂಗಳೂರಿನ ಮನೆ ನನಗೆ ಮಸುಕಾಗಿ ಮಾತ್ರ ನೆನಪಿದೆ.': 'I|was born/where I was born|in Mangaluru/of Mangaluru|house/home|to me/me|vaguely/dimly|only/just|is remembered/I remember',
            'ಬೆಳಗಾವಿಯಲ್ಲಿ ಕಳೆದ ಶಾಲಾ ದಿನಗಳು ನನ್ನ ಜೀವನದ ಅತ್ಯಂತ ಸಂತೋಷದ ವರ್ಷಗಳು.': 'in Belagavi|spent/passed|school|days|my|of life/in life|most/the most|happy/of happiness|years',
            'ಅಂತರ್‌ಶಾಲಾ ರಸಪ್ರಶ್ನೆ ಗೆದ್ದದ್ದು ನಮ್ಮ ಇಡೀ ತರಗತಿಗೆ ಮರೆಯಲಾಗದ ಕ್ಷಣವಾಗಿತ್ತು.': 'inter-school/between schools|quiz|winning/having won|our|whole/entire|for the class/to the class|unforgettable/never forgotten|was a moment/moment',
            'ಆ ಪರೀಕ್ಷೆಯಲ್ಲಿ ಫೇಲಾದದ್ದು ಒಂದು ತಿರುವು; ಅದರ ನಂತರ ನಾನು ಗಂಭೀರವಾಗಿ ಓದಲು ಶುರುಮಾಡಿದೆ.': 'that|in the exam/exam|failing/having failed|a/one|turning point/turn|its/that|after|I|seriously/earnestly|to study/to read|started/began',
            'ನಮ್ಮ ಹಾಸ್ಟೆಲ್ ವಾರ್ಡನ್‌ಗೆ ನಮ್ಮ ಎಲ್ಲ ತುಂಟಾಟಗಳು ಗೊತ್ತಿದ್ದರೂ ಗೊತ್ತಿಲ್ಲದಂತೆ ನಟಿಸುತ್ತಿದ್ದರು.': 'our|hostel|to the warden/warden|our|all|pranks/mischief|though he knew/even knowing|as if not knowing/unaware|used to pretend/would act',
            'ನನ್ನ ಅಚ್ಚುಮೆಚ್ಚಿನ ಶಿಕ್ಷಕರ ನೆನಪಿಗಾಗಿ ಈ ಹಳೆಯ ಇಂಕ್ ಪೆನ್ನನ್ನು ಜೋಪಾನವಾಗಿ ಇಟ್ಟುಕೊಂಡಿದ್ದೇನೆ.': 'my|favourite/dearest|of the teacher/teacher|as a keepsake/in memory|this|old|ink/fountain|pen|carefully/safely|I have kept/I keep',
            // 4:1 Hopes and regrets
            'ನನ್ನ ಅಜ್ಜನ ಜೊತೆ ಇನ್ನೂ ಹೆಚ್ಚು ಸಮಯ ಕಳೆಯಬೇಕಿತ್ತು ಅನಿಸುತ್ತದೆ.': 'my|of grandfather/grandfather|with/together|still/even|more|time|should have spent/ought to have spent|I feel/it seems',
            'ನಾನು ಈಜು ಕಲಿಯಲೇ ಇಲ್ಲ ಎಂಬುದೇ ನನ್ನ ಏಕೈಕ ವಿಷಾದ.': 'I|swimming/swim|learn at all/ever learn|not/never|that itself/the fact that|my|only/single|regret/sorrow',
            'ಅಮ್ಮನ ಮಾತು ಕೇಳಿದ್ದರೆ ಎಷ್ಟು ಚೆನ್ನಾಗಿತ್ತು, ಈಗ ನಾನು ಮಳೆಯಲ್ಲಿ ಸಿಕ್ಕಿಹಾಕಿಕೊಳ್ಳುತ್ತಿರಲಿಲ್ಲ.': 'of mother/mum|words/advice|if I had listened/had I heard|how/how much|good it would be/nice it was|now|I|in the rain|would not be stuck/would not be caught',
            'ಈಗ ಹಿಂತಿರುಗಿ ನೋಡಿದರೆ, ವಾಣಿಜ್ಯದ ಬದಲು ನಾನು ವಿಜ್ಞಾನ ಆರಿಸಿಕೊಳ್ಳಬೇಕಿತ್ತು.': 'now|turning back/back|if I look/looking|of commerce/commerce|instead of/in place of|I|science|should have chosen/ought to have picked',
            'ಪ್ರತಿಯೊಬ್ಬರೂ ಇನ್ನೊಂದು ಅವಕಾಶಕ್ಕೆ ಅರ್ಹರು, ಹಾಗಾಗಿ ಹಳೆಯದನ್ನು ಬಿಟ್ಟು ಮತ್ತೆ ಶುರುಮಾಡಿ.': 'everyone/each person|another/one more|for a chance/to an opportunity|deserve/are worthy|so/therefore|the past/old things|leaving/letting go|again/once more|start/begin',
            'ಈ ದೀಪಾವಳಿಗೆ ವಾರಾಣಸಿಯಲ್ಲಿ ನನ್ನ ಸೋದರಸಂಬಂಧಿಗಳನ್ನು ನೋಡಲು ಕಾತುರದಿಂದ ಕಾಯುತ್ತಿದ್ದೇನೆ.': 'this|for Diwali/at Diwali|in Varanasi|my|cousins|to see/to meet|eagerly/impatiently|I am waiting/waiting',
            'ದುಬೈನಲ್ಲಿ ಎರಡು ವರ್ಷ ಕಳೆದ ಮೇಲೆ ಅವನಿಗೆ ತನ್ನ ಹಳ್ಳಿಯ ಬಗ್ಗೆ ತೀವ್ರ ಹಂಬಲ ಉಂಟಾಯಿತು.': 'in Dubai|two|years/year|spent/passing|after/upon|to him/he|his/his own|of the village/village|about/for|deep/intense|longing/yearning|arose/came',
            'ನಾಳೆ ಫಲಿತಾಂಶ ಬರುತ್ತದೆ, ಆದರೆ ನಾನು ಸಾಕಷ್ಟು ಆಶಾವಾದಿಯಾಗಿದ್ದೇನೆ, ಒಳ್ಳೆಯದಾಗಲಿ!': 'tomorrow|result/results|comes/will come|but|I|quite/fairly|am optimistic/am hopeful|may it go well/fingers crossed',
            'ರಜೆಯ ಬಗ್ಗೆ ಹಗಲುಗನಸು ಕಾಣುವುದನ್ನು ಬಿಟ್ಟು, ಮೊದಲು ನಿನ್ನ ಪ್ರಾಜೆಕ್ಟ್ ಮುಗಿಸು.': 'of the holidays/holiday|about|daydream/daydreams|seeing/having|leaving/stopping|first|your|project|finish/complete',
            'ಪಂದ್ಯ ಸೋತದ್ದು ಬೇಸರ ತಂದಿತು, ಆದರೆ ಅದರಲ್ಲಿನ ಆಶಾಕಿರಣ ಎಂದರೆ ನಾವು ತುಂಬಾ ಕಲಿತೆವು.': 'match/game|losing/having lost|sadness/disappointment|brought/caused|but|in it/within that|ray of hope/silver lining|is that/means|we|a lot/much|learnt/learned',
            // 5:1 Friends and relationships
            'ಆ ಇಬ್ಬರು ಸಹೋದರರು ಒಂದು ಸಣ್ಣ ಜಮೀನಿನ ತುಂಡಿಗಾಗಿ ಜಗಳವಾಡಿದರು.': 'the/those|two people/both|brothers|a/one|small|of land/land|for a piece/for a plot|quarrelled/fought',
            'ಅದೆಲ್ಲಾ ಒಂದು ತಪ್ಪುತಿಳುವಳಿಕೆ; ನಿನಗೆ ನೋವು ಮಾಡುವ ಉದ್ದೇಶ ಅವಳಿಗೆ ಇರಲೇ ಇಲ್ಲ.': 'all that/that all|a/one|misunderstanding/mistake|to you/you|pain/hurt|causing/to cause|intention/aim|she/to her|was at all/existed|not/never',
            'ಒಂದು ವಾರದ ಮೌನದ ನಂತರ, ಇಬ್ಬರು ಗೆಳೆಯರು ಕೊನೆಗೂ ಒಂದು ಕಪ್ ಚಹಾ ಕುಡಿಯುತ್ತಾ ರಾಜಿಯಾದರು.': 'one/a|of a week/week|of silence/silence|after|two people/both|friends|finally/at last|one/a|cup|tea|drinking/while drinking|made up/reconciled',
            'ಮನಸ್ತಾಪ ಇಟ್ಟುಕೊಂಡರೆ ನಿನಗೇ ನೋವು; ಕ್ಷಮಿಸಿ ಮುಂದೆ ಸಾಗಲು ಪ್ರಯತ್ನಿಸು.': 'grudge/ill feeling|if you keep/if you hold|to you only/you yourself|pain/hurt|forgiving/having forgiven|ahead/forward|to move/to go|try',
            'ಅಪ್ಪ ಅಮ್ಮ ವಾದಿಸುವಾಗ ನಾನು ಯಾರ ಪಕ್ಷವನ್ನೂ ವಹಿಸುವುದಿಲ್ಲ; ಇಬ್ಬರಿಗೂ ಚಹಾ ಮಾಡಿಕೊಡುತ್ತೇನೆ ಅಷ್ಟೇ.': 'father/dad|mother/mum|while they argue/when arguing|I|anyone/whose|side (either)/side|never take/will not take|for both/to both|tea|I make for them/make and give|that is all/just',
            'ನಂಬಿಕಸ್ಥ ಗೆಳೆಯ ಜಗಳದ ನಂತರವೂ ನಿನ್ನ ಗುಟ್ಟುಗಳನ್ನು ಕಾಪಾಡುತ್ತಾನೆ.': 'trustworthy/reliable|friend|of a fight/of a quarrel|even after/after too|your|secrets|keeps/guards',
            'ನನ್ನ ಅಕ್ಕ ನನ್ನನ್ನು ಎಂದೂ ಟೀಕಿಸುವುದಿಲ್ಲ, ಅದಕ್ಕೇ ನನ್ನ ಮನಸ್ಸಿನ ಮಾತನ್ನು ಅವಳಿಗೆ ಹೇಳಿಕೊಳ್ಳುತ್ತೇನೆ.': 'my|elder sister/sister|me|ever/at any time|never criticises/never judges|that is why/so|my|of the mind/of the heart|words/feelings|to her/her|I tell/I confide',
            'ಪ್ರತಿ ಭಾನುವಾರ ಒಟ್ಟಿಗೆ ಅಡುಗೆ ಮಾಡುವುದರಿಂದ ನನ್ನ ಮತ್ತು ಅಪ್ಪನ ಬಾಂಧವ್ಯ ಗಟ್ಟಿಯಾಗಿದೆ.': 'every/each|Sunday|together|cooking/cook|by doing/because of doing|my/me|and|of father/of dad|bond/closeness|has become strong/is stronger',
            'ಸಂಪರ್ಕದಲ್ಲಿರುತ್ತೇವೆ ಎಂದು ಮಾತು ಕೊಟ್ಟಿದ್ದೆವು, ಆದರೆ ಕಾಲೇಜಿನ ನಂತರ ನಿಧಾನವಾಗಿ ದೂರವಾದೆವು.': 'we will stay in touch/we will keep in contact|that/saying|word/promise|had given/we gave|but|of college/college|after|slowly/gradually|drifted apart/became distant',
            'ಭಾರತೀಯ ಮನೆಗಳಲ್ಲಿ ಕೌಟುಂಬಿಕ ಬಂಧಗಳು ಸಾಮಾನ್ಯವಾಗಿ ಹಲವು ತಲೆಮಾರುಗಳವರೆಗೆ ಗಟ್ಟಿಯಾಗಿ ಉಳಿಯುತ್ತವೆ.': 'Indian|in homes/in houses|family|ties/bonds|usually/often|many/several|for generations/across generations|strong/firmly|stay/remain',
            // 6:1 Advice and suggestions
            'ಸಲಹೆಗೆ ಧನ್ಯವಾದಗಳು; ಈ ವಾರ ಅದನ್ನು ಪ್ರಯತ್ನಿಸುತ್ತೇನೆ.': 'for the suggestion/for the advice|thanks/thank you|this|week|it/that|I will try/I shall try',
            'ಒಂದು ಕಿವಿಮಾತು: ನೀವು ಓದದ ಯಾವುದೇ ದಾಖಲೆಗೆ ಎಂದಿಗೂ ಸಹಿ ಹಾಕಬೇಡಿ.': 'one/a|word of advice/tip|you|not read/unread|any|on a document/to a paper|ever/never|signature/sign|do not put/do not sign',
            'ನಾನು ನಿನ್ನ ಜಾಗದಲ್ಲಿದ್ದರೆ, ವಿಷಯ ದೊಡ್ಡದಾಗುವ ಮೊದಲೇ ಅವಳ ಬಳಿ ಕ್ಷಮೆ ಕೇಳುತ್ತಿದ್ದೆ.': 'I|your|if I were in the place/in your place|matter/issue|becoming big/growing|well before/before itself|her|with/near|pardon/forgiveness|would ask/I would ask',
            'ಈಗಲೇ ಹೊರಡುವುದು ಒಳ್ಳೆಯದು, ಇಲ್ಲದಿದ್ದರೆ ಹಾಸನಕ್ಕೆ ಹೋಗುವ ಕೊನೆಯ ಬಸ್ ತಪ್ಪಿಹೋಗುತ್ತದೆ.': 'right now/now itself|leaving/to set off|is good/is better|otherwise/or else|to Hassan|going/that goes|last/final|bus|will be missed/you will miss',
            'ನೀನೂ ನನ್ನ ಜೊತೆ ಕಬ್ಬನ್ ಪಾರ್ಕಿನ ಬೆಳಗಿನ ವಾಕಿಂಗ್ ಗುಂಪಿಗೆ ಯಾಕೆ ಸೇರಬಾರದು?': 'you too/you also|my/me|with|Cubbon|in the park/of the park|morning|walking|to the group/the group|why|should not join/not join',
            'ನಾನು ನಿಜವಾದ ಇಕ್ಕಟ್ಟಿನಲ್ಲಿದ್ದೇನೆ: ಪುಣೆಯ ಕೆಲಸ ಒಪ್ಪಿಕೊಳ್ಳಬೇಕೇ ಅಥವಾ ಮನೆಯಲ್ಲೇ ಇರಬೇಕೇ?': 'I|real/true|am in a dilemma/am in a fix|in Pune/of Pune|job/work|should I accept/should I take|or|at home itself/at home|should I stay/should I remain',
            'ಕಲೆ ಓದುವುದೋ ಅಥವಾ ಮನೆಯ ವ್ಯಾಪಾರಕ್ಕೆ ಸೇರುವುದೋ ಎಂದು ಅವಳು ಗೊಂದಲದಲ್ಲಿದ್ದಾಳೆ.': 'art/arts|studying (or)/whether to study|or|of the family/of home|business/trade|joining (or)/whether to join|that/thus|she|is confused/is torn',
            'ನಾನು ದೊಡ್ಡ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳಬೇಕಾದಾಗಲೆಲ್ಲಾ ನನ್ನ ಚಿಕ್ಕಪ್ಪ ನನ್ನ ಮಾತನ್ನು ತಾಳ್ಮೆಯಿಂದ ಕೇಳಿ ಸಲಹೆ ಕೊಡುತ್ತಾರೆ.': 'I|big/major|decision|whenever I must take/every time I have to make|my|uncle/younger brother of father|my|words/thoughts|patiently/with patience|listening/having heard|advice/suggestion|give/gives',
            'ಅವನು ವೈದ್ಯರ ಎಚ್ಚರಿಕೆಗೆ ಗಮನ ಕೊಡಲಿಲ್ಲ, ಮತ್ತೆ ಕಾಯಿಲೆ ಬಿದ್ದ.': 'he|of the doctor/doctor|to the warning/warning|attention/heed|did not give/did not pay|again|ill/sick|fell/became',
            'ಚೆನ್ನಾಗಿ ಯೋಚಿಸಿ ನೋಡಿ, ಮತ್ತು ಆನ್‌ಲೈನ್ ವಿಮರ್ಶೆಗಳನ್ನು ಕಣ್ಣುಮುಚ್ಚಿ ನಂಬಬೇಡಿ.': 'well/carefully|thinking/having thought|see/look|and|online|reviews|blindly/with closed eyes|do not believe/do not trust'
        },
        hi: {
            // 1:1 Giving opinions
            'मेरे विचार में, हर बच्चे को कम से कम एक वाद्य यंत्र सीखना चाहिए।': 'my/mine|view/thought|in/inside|every/each|child|to/for|less/at|than/from|less/least|one/a|musical|instrument/device|learn/to learn|should/ought',
            'जहाँ तक मेरी बात है, बस की नई समय-सारणी पहले से कहीं बेहतर है।': 'where/as far|till/as|my/mine|matter/talk|is/(it is)|bus|of/belonging to|new|timetable/schedule|before/earlier|than/from|far/much|better|is/(it is)',
            'कक्षा में मोबाइल फ़ोन को लेकर आपका रुख़ क्या है?': 'classroom/class|in/inside|mobile|phone/phones|to/about|regarding/taking|your|stance/position|what|is/(it is)',
            'उसने इतने दृढ़ विश्वास से बात की कि कमरे में किसी ने उससे बहस नहीं की।': 'she/he|so much/such|firm/strong|belief/faith|with/from|talk/speech|did/made|that|room|in/inside|anyone/someone|(subject marker)|with her/from her|argument/debate|not/no|did/made',
            'सच कहूँ तो, मुझे फ़िल्म बहुत लंबी और थोड़ी उबाऊ लगी।': 'truth/true|I say/if I say|then/so|to me/me|film/movie|very/too|long/lengthy|and/plus|a little/rather|boring/dull|felt/seemed',
            'आपका तर्क साफ़ है, लेकिन मैं कुछ उदाहरण सुनना चाहूँगा।': 'your|reasoning/logic|clear/plain|is/(it is)|but/however|I/me|some/a few|examples/example|to hear/hear|would like/will want',
            'छोटे शहरों में रहना बहुत अच्छा हो सकता है; उदाहरण के लिए, उडुपी शांत और साफ़ है।': 'small/little|towns/cities|in/inside|living/to live|very/a lot|good/nice|be|can|is/(it is)|example|of/belonging to|for/to|Udupi|calm/peaceful|and/plus|clean/tidy|is/(it is)',
            'यह सिर्फ़ एक धारणा है; क्या इसके पक्ष में आपके पास कोई तथ्य हैं?': 'this/it|only/just|one/an|assumption/belief|is/(it is)|(question)/what|its/of this|side/favour|in/inside|your/you|near/with|any/some|facts/fact|are/(they are)',
            'मुझे अंदर से लग रहा था कि जंगल वाला शॉर्टकट ठीक नहीं है।': 'to me/me|inside/within|from|feel/seem|going on/(continuing)|was/had|that|forest/jungle|one/through the|shortcut|fine/right|not/no|is/(it is)',
            'कुल मिलाकर, मुझे लगता है कि ऑनलाइन कक्षाएँ उम्मीद से बेहतर चलीं।': 'total/whole|taken together/combining|to me/me|seems/feels|is/(it is)|that|online|classes/lessons|hope/expectation|than/from|better|went/ran',
            // 2:1 Agreeing and disagreeing
            'क्रिकेट के मामले में मेरी और पापा की राय कम ही मिलती है।': 'cricket|of/belonging to|matter/case|in/inside|my/mine|and/plus|father/dad|of/belonging to|opinion/view|rarely/less|only/just|matches/meets|is/(it is)',
            'यह सही बात है; ख़र्च के बारे में तो मैंने सोचा ही नहीं था।': 'this/that|right/fair|point/matter|is/(it is)|cost/expense|of/belonging to|about|in/inside|well/(stress)|I/me|thought|at all/even|not/no|was/had',
            'मैं पूरी तरह सहमत हूँ; पुस्तकालय रविवार को भी खुला रहना चाहिए।': 'I/me|full/complete|way/manner|agreed/in agreement|am/(I am)|library|Sunday|on/(to)|also/too|open/unlocked|stay/remain|should/ought',
            'मैं मानता हूँ कि आप सही थे; सकलेशपुर वाले रास्ते से हम कहीं जल्दी पहुँचे।': 'I/me|admit/accept|am/(I am)|that|you|right/correct|were/had|Sakleshpur|one/via|road/route|by/from|we/us|far/much|quickly/sooner|reached/arrived',
            'कुछ हद तक आप सही हैं, लेकिन चलिए कोई साझा आधार ढूँढते हैं।': 'some/a little|limit/extent|till/up to|you|right/correct|are/(they are)|but/however|come on/let us|some/a|shared/common|ground/basis|search/find|are/(let us)',
            'आदर सहित कहूँ तो सर, मुझे लगता है कि ये आँकड़े कुछ और ही कहानी कहते हैं।': 'respect/regard|with/by|I say/if I say|then|sir|to me/me|seems/feels|is/(it is)|that|these|figures/data|some/something|other/else|quite/only|story/tale|tell/say|are/(they are)',
            'माफ़ कीजिए, मेरी राय अलग है; मॉल से कहीं ज़्यादा रौनक पुराने बाज़ार में है।': 'pardon/excuse|please do/(me)|my/mine|opinion/view|different/separate|is/(it is)|mall|than/from|far/much|more|life/charm|old/former|market/bazaar|in/inside|is/(it is)',
            'दोनों पक्षों की बात सुनने के बाद प्रधानाचार्या अपने फ़ैसले पर पुनर्विचार करने को राज़ी हुईं।': 'both/the two|sides/parties|of/belonging to|talk/point|hearing/listening|of/belonging to|after/later|principal/head teacher|her/own|decision|on|rethink/reconsideration|to do/doing|to/for|willing/agreed|became/was',
            'पहले वह यात्रा के ख़िलाफ़ था, पर फिर उसका मन बदल गया।': 'at first/earlier|he/him|trip/journey|of/belonging to|against|was/had|but/however|then/later|his|mind/heart|change/changed|went/(got)',
            'हम दोनों खुले विचारों वाले हैं, इसलिए अपनी-अपनी राय रखकर भी आराम से आगे बढ़ सकते हैं।': 'we/us|both/the two|open/unlocked|ideas/views|having/people with|are/(they are)|so/therefore|our own/each our own|opinion/view|keeping/holding|also/even|ease/comfort|with/by|ahead/forward|move/go|can|are/(they are)',
            // 3:1 Memories
            'पुराने फ़िल्मी गाने दादी को हमेशा बीते दिनों की याद दिला देते हैं।': 'old/former|film/filmi|songs|grandmother/granny|to/for|always|past/gone by|days|of/belonging to|memory/remembrance|bring/cause|give/(do)|are/(they are)',
            'बचपन में हम अँधेरा होने तक खेतों में खेला करते थे।': 'childhood|in/inside|we/us|dark/darkness|becoming/being|till/until|fields/farms|in/inside|played/play|used to/did|were/had',
            'स्कूल के पहले दिन की याद आज भी मेरे मन में ताज़ा है।': 'school|of/belonging to|first|day|of/belonging to|memory/remembrance|today/now|also/even|my/mine|mind/heart|in/inside|fresh/vivid|is/(it is)',
            'मेरे मामा लोग जब भी मिलते हैं, धारवाड़ के अपने कॉलेज के दिनों को याद करते हैं।': 'my/mine|uncles/brothers of mother|people/(plural)|when/whenever|ever/also|meet|are/(they are)|Dharwad|of/belonging to|their/own|college|of/belonging to|days|to/about|memory/remember|do/make|are/(they are)',
            'मंगलुरु का वह घर, जहाँ मैं पैदा हुआ था, मुझे बस धुँधला-सा याद है।': 'Mangaluru|of/belonging to|that|house/home|where|I/me|born|became/was|was/had|to me/me|just/only|dimly/vaguely|remembered/memory|is/(it is)',
            'बेलगावी में बिताए स्कूल के दिन मेरी ज़िंदगी के सबसे ख़ुशहाल साल थे।': 'Belagavi|in/inside|spent/passed|school|of/belonging to|days/day|my/mine|life|of/belonging to|most/of all|happy/joyful|years/year|were/had',
            'अंतर-विद्यालय क्विज़ जीतना हमारी पूरी कक्षा के लिए अविस्मरणीय पल था।': 'inter-school/between schools|quiz|winning/to win|our|whole/entire|class|of/belonging to|for/to|unforgettable|moment/instant|was/had',
            'उस परीक्षा में फ़ेल होना एक निर्णायक मोड़ था; उसके बाद मैंने गंभीरता से पढ़ना शुरू किया।': 'that|exam/test|in/inside|fail/failed|being/becoming|a/one|deciding/decisive|turn/bend|was/had|its/that|after/later|I/me|seriousness|with/by|studying/to study|start/begin|did/made',
            'हमारे हॉस्टल के वार्डन को हमारी हर शरारत का पता था, पर वे अनजान बने रहते थे।': 'our|hostel|of/belonging to|warden|to/for|our|every/each|prank/mischief|of/belonging to|knowledge/aware|was/had|but/however|he/they|unaware/unknowing|made/acting|stay/kept|were/had',
            'अपनी प्रिय अध्यापिका की निशानी के तौर पर मैंने यह पुराना फ़ाउंटेन पेन सँभालकर रखा है।': 'my/own|dear/favourite|teacher|of/belonging to|keepsake/token|of/belonging to|way/manner|as/on|I/me|this|old/former|fountain|pen|carefully/safely|kept/placed|is/have',
            // 4:1 Hopes and regrets
            'काश मैंने अपने दादाजी के साथ और ज़्यादा समय बिताया होता।': 'if only/I wish|I/me|my/own|grandfather/granddad|of/belonging to|with/together|and/even|more|time|spent/passed|had been/would be',
            'मुझे बस एक ही पछतावा है कि मैंने कभी तैरना नहीं सीखा।': 'to me/me|just/only|one|only/just|regret/remorse|is/(it is)|that|I/me|ever/never|swimming/to swim|not/no|learnt/learned',
            'काश मैंने माँ की बात सुनी होती, तो अभी बारिश में फँसा न होता।': 'if only/I wish|I/me|mother/mum|of/belonging to|words/advice|heard/listened|had been|then/so|now/right now|rain|in/inside|stuck/trapped|not/no|would be',
            'अब पीछे मुड़कर देखूँ तो मुझे कॉमर्स की जगह साइंस लेनी चाहिए थी।': 'now|back/behind|turning|if I look/see|then/so|to me/me|commerce|of/belonging to|place/instead|science|take/to take|should/ought|was/had',
            'हर किसी को दूसरा मौक़ा मिलना चाहिए, इसलिए बीती बातें छोड़कर फिर से शुरुआत कीजिए।': 'every/each|one/someone|to/for|second/another|chance/opportunity|get/to get|should/ought|so/therefore|past/gone by|things/matters|leaving/letting go|again|from/(again)|start/beginning|do/please make',
            'इस दिवाली वाराणसी में अपने चचेरे भाई-बहनों से मिलने का मुझे बेसब्री से इंतज़ार है।': 'this|Diwali|Varanasi|in/inside|my/own|cousin/paternal|brothers and sisters/siblings|with/from|meeting/to meet|of/belonging to|to me/me|impatience/eagerness|with/by|wait/waiting|is/(it is)',
            'दुबई में दो साल बिताने के बाद उसे अपने गाँव की बहुत याद सताने लगी।': 'Dubai|in/inside|two|years/year|spending/passing|of/belonging to|after/later|to him/him|his/own|village|of/belonging to|very/a lot|memory/missing|to trouble/to haunt|began/started',
            'नतीजे कल आएँगे, पर मैं काफ़ी आशावादी हूँ, बस अच्छा ही हो!': 'results/outcome|tomorrow|will come|but/however|I/me|quite/fairly|optimistic/hopeful|am/(I am)|just/only|good/well|only/(stress)|may be/let it be',
            'छुट्टियों के बारे में दिन में सपने देखना बंद करो और पहले अपना प्रोजेक्ट पूरा करो।': 'holidays/vacation|of/belonging to|about|in/inside|day/daytime|in/inside|dreams|seeing/to see|stop/closed|do|and/plus|first|your/own|project|complete/full|do/make',
            'मैच हारना दुखद था, लेकिन उम्मीद की किरण यह है कि हमने बहुत कुछ सीखा।': 'match/game|losing/to lose|sad/painful|was/had|but/however|hope|of/belonging to|ray/beam|this/it|is/(it is)|that|we/us|much/a lot|something/(of it)|learnt/learned',
            // 5:1 Friends and relationships
            'दोनों भाइयों में ज़मीन के एक छोटे-से टुकड़े को लेकर झगड़ा हो गया।': 'both/the two|brothers|in/between|land|of/belonging to|a/one|small/little|piece/plot|to/(object)|over/about|quarrel/fight|happen/became|went/(happened)',
            'यह सब एक ग़लतफ़हमी थी; उसका इरादा तुम्हें दुख पहुँचाने का कभी नहीं था।': 'this/it|all|a/one|misunderstanding|was/had|her/his|intention/aim|to you/you|pain/hurt|causing/to cause|of/belonging to|ever/never|not/no|was/had',
            'एक हफ़्ते की चुप्पी के बाद दोनों दोस्तों ने आख़िरकार चाय पर सुलह कर ली।': 'one/a|week|of/belonging to|silence|of/belonging to|after/later|both/the two|friends|(subject marker)|finally/at last|tea/chai|over/on|peace/reconciliation|do/make|took/(made)',
            'मन में मैल रखने से सिर्फ़ तुम्हें ही तकलीफ़ होगी; माफ़ करो और आगे बढ़ो।': 'mind/heart|in/inside|dirt/grudge|keeping/holding|from/by|only/just|to you/you|only/alone|pain/trouble|will be|forgive/pardon|do|and/plus|ahead/forward|move/go',
            'जब मम्मी-पापा बहस करते हैं, मैं किसी का पक्ष नहीं लेता; बस दोनों के लिए चाय बना देता हूँ।': 'when/whenever|mum and dad/parents|argument/argue|do|are/(they are)|I/me|anyone/someone|of/belonging to|side|not/no|take|just/only|both/the two|of/belonging to|for/to|tea/chai|make|give/(for them)|am/(I am)',
            'एक भरोसेमंद दोस्त झगड़े के बाद भी तुम्हारे राज़ नहीं खोलता।': 'a/one|trustworthy/reliable|friend|fight/quarrel|of/belonging to|after/later|also/even|your|secrets/secret|not/no|opens/reveals',
            'मैं अपनी दीदी को दिल की हर बात बताती हूँ, क्योंकि वह मुझे कभी ग़लत नहीं समझती।': 'I/me|my/own|elder sister/sister|to/for|heart|of/belonging to|every/each|thing/word|tell|am/(I am)|because|she/her|me|ever|wrong/badly|not/no|thinks/judges',
            'हर रविवार साथ मिलकर खाना बनाने से मेरा और पापा का रिश्ता और गहरा हो गया है।': 'every/each|Sunday|together/with|jointly/joining|food/meal|making/cooking|from/by|my/mine|and/plus|father/dad|of/belonging to|relationship/bond|more/even|deep/deeper|become/be|gone/(got)|is/has',
            'हमने संपर्क में रहने का वादा किया था, पर कॉलेज के बाद हम धीरे-धीरे दूर हो गए।': 'we/us|contact/touch|in/inside|staying/to stay|of/belonging to|promise|made/did|was/had|but/however|college|of/belonging to|after/later|we/us|slowly/gradually|far/apart|become/be|went/(got)',
            'भारतीय घरों में पारिवारिक रिश्ते अक्सर कई पीढ़ियों तक मज़बूत बने रहते हैं।': 'Indian|homes/houses|in/inside|family/household|ties/relations|often/usually|many/several|generations|till/across|strong/firm|made/remaining|stay/keep|are/(they are)',
            // 6:1 Advice and suggestions
            'सुझाव के लिए धन्यवाद; मैं इस हफ़्ते इसे आज़माकर देखूँगा।': 'suggestion/advice|of/belonging to|for/to|thanks/thank you|I/me|this|week|it/this|trying/testing|will see/will try',
            'एक सलाह: जो काग़ज़ आपने पढ़ा न हो, उस पर कभी दस्तख़त न करें।': 'one/a|advice/tip|which/that|paper/document|you|read|not/no|be/have|that|on|ever|signature/sign|not/no|do/make',
            'अगर मैं तुम्हारी जगह होता, तो बात बढ़ने से पहले ही उससे माफ़ी माँग लेता।': 'if|I/me|your|place/position|were/would be|then|matter/issue|growing/increasing|from/than|before|itself/just|from her/her|apology/pardon|ask/beg|would take/(would)',
            'बेहतर होगा कि तुम अभी निकल जाओ, वरना हासन की आख़िरी बस छूट जाएगी।': 'better|will be|that|you|now/right now|leave/set out|go|otherwise/or else|Hassan|of/to|last/final|bus|be missed/slip|will go/(will)',
            'तुम भी मेरे साथ कब्बन पार्क के सुबह वाले वॉकिंग ग्रुप में क्यों नहीं आ जाते?': 'you|also/too|my/me|with/by|Cubbon|park|of/belonging to|morning|one/(of)|walking|group|in/into|why|not/no|come|go/(join)',
            'मैं बड़ी दुविधा में हूँ: पुणे वाली नौकरी लूँ या घर पर ही रहूँ?': 'I/me|big/real|dilemma/confusion|in/inside|am/(I am)|Pune|one/(in)|job|should I take/accept|or|home/house|at|only/just|should I stay/remain',
            'वह कला पढ़ने और पारिवारिक व्यापार से जुड़ने के बीच उलझी हुई है।': 'she/her|art/arts|studying/to study|and/plus|family/household|business/trade|with/to|joining/to join|of/belonging to|between/among|tangled/torn|become/(being)|is/(it is)',
            'जब भी मुझे कोई बड़ा फ़ैसला लेना होता है, मेरे चाचा मेरी बात ध्यान से सुनकर सलाह देते हैं।': 'when/whenever|ever/also|to me/me|any/some|big/major|decision|take/to take|happens/is|is/(it is)|my/mine|uncle/brother of father|my/mine|words/talk|attention/care|with/by|listening/having heard|advice|give|are/(they are)',
            'उसने डॉक्टर की चेतावनी पर ध्यान नहीं दिया और फिर से बीमार पड़ गया।': 'he/him|doctor|of/belonging to|warning|on/to|attention/heed|not/no|gave/paid|and/plus|again|(again)/from|ill/sick|fall/fell|went/(got)',
            'अच्छी तरह सोच-विचार कर लो, और ऑनलाइन रिव्यू पर आँख मूँदकर भरोसा मत करो।': 'good/well|way/manner|thought/consideration|do/doing|take/(for yourself)|and/plus|online|reviews/review|on|eye/eyes|closing/shutting|trust/faith|not/do not|do/make'
        }
    }
};
