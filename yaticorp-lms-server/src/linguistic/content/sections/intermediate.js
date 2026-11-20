/*
 * Intermediate (about CEFR B1) — extra lessons for the 8 existing units: "More words" (4 new words on the unit's
 * topic) and "Phrases" (5 new sentences using them), plus one story for the section's Level review.
 * Every Kannada and Hindi phrase has a word-by-word English gloss in `glosses`.
 */
module.exports = {
    level: 'intermediate',
    units: {
        // Character
        '1:1': {
            en: true,
            words: [
                { en: 'brave', kn: 'ಧೈರ್ಯಶಾಲಿ', hi: 'बहादुर', pic: '🦁', def: 'not afraid to face danger or difficult things' },
                { en: 'shy', kn: 'ನಾಚಿಕೆ ಸ್ವಭಾವದ', hi: 'शर्मीला', pic: '🙈', def: 'nervous and quiet when meeting or talking to new people' },
                { en: 'hardworking', kn: 'ಶ್ರಮಜೀವಿ', hi: 'मेहनती', pic: '💪', def: 'putting a lot of effort and care into work' },
                { en: 'stubborn', kn: 'ಹಠಮಾರಿ', hi: 'ज़िद्दी', pic: '😤', def: 'refusing to change your mind, even when you should' }
            ],
            phrases: [
                { read: true, en: 'My grandfather was a brave soldier.', kn: 'ನನ್ನ ಅಜ್ಜ ಒಬ್ಬ ಧೈರ್ಯಶಾಲಿ ಸೈನಿಕರಾಗಿದ್ದರು.', hi: 'मेरे दादाजी एक बहादुर सैनिक थे।' },
                { read: true, en: 'Meena is shy, but she speaks well on stage.', kn: 'ಮೀನಾ ನಾಚಿಕೆ ಸ್ವಭಾವದವಳು, ಆದರೆ ವೇದಿಕೆಯ ಮೇಲೆ ಚೆನ್ನಾಗಿ ಮಾತನಾಡುತ್ತಾಳೆ.', hi: 'मीना शर्मीली है, लेकिन मंच पर अच्छा बोलती है।' },
                { en: 'My uncle is a hardworking farmer near Hubballi.', kn: 'ನನ್ನ ಚಿಕ್ಕಪ್ಪ ಹುಬ್ಬಳ್ಳಿ ಹತ್ತಿರದ ಶ್ರಮಜೀವಿ ರೈತರು.', hi: 'मेरे चाचा हुबली के पास एक मेहनती किसान हैं।' },
                { en: 'He is stubborn and never changes his mind.', kn: 'ಅವನು ಹಠಮಾರಿ, ತನ್ನ ನಿರ್ಧಾರವನ್ನು ಎಂದಿಗೂ ಬದಲಿಸುವುದಿಲ್ಲ.', hi: 'वह ज़िद्दी है और कभी अपना फ़ैसला नहीं बदलता।' },
                { en: 'She was brave and helped the injured man.', kn: 'ಅವಳು ಧೈರ್ಯದಿಂದ ಗಾಯಗೊಂಡ ವ್ಯಕ್ತಿಗೆ ಸಹಾಯ ಮಾಡಿದಳು.', hi: 'वह बहादुर थी और उसने घायल आदमी की मदद की।' }
            ]
        },
        // Feelings
        '1:2': {
            words: [
                { en: 'proud', kn: 'ಹೆಮ್ಮೆ', hi: 'गर्वित', pic: '🏅', def: 'happy about something good that you or someone close did' },
                { en: 'lonely', kn: 'ಒಂಟಿ', hi: 'अकेला', pic: '😔', def: 'sad because you are alone or have no friends near' },
                { en: 'excited', kn: 'ಉತ್ಸುಕ', hi: 'उत्साहित', pic: '😃', def: 'very happy and eager about something that will happen' },
                { en: 'disappointed', kn: 'ನಿರಾಶೆ', hi: 'निराश', pic: '😞', def: 'sad because something was not as good as you hoped' }
            ],
            phrases: [
                { read: true, en: 'My parents felt proud when I won the prize.', kn: 'ನಾನು ಬಹುಮಾನ ಗೆದ್ದಾಗ ನನ್ನ ಪೋಷಕರಿಗೆ ಹೆಮ್ಮೆ ಅನಿಸಿತು.', hi: 'जब मैंने इनाम जीता, तब मेरे माता-पिता को गर्व हुआ।' },
                { read: true, en: 'I felt lonely in the hostel at first.', kn: 'ಮೊದಮೊದಲು ಹಾಸ್ಟೆಲಿನಲ್ಲಿ ನನಗೆ ಒಂಟಿತನ ಅನಿಸಿತು.', hi: 'शुरू में हॉस्टल में मुझे अकेलापन महसूस हुआ।' },
                { en: 'We are excited about the college trip to Mysuru.', kn: 'ಮೈಸೂರಿಗೆ ಹೋಗುವ ಕಾಲೇಜು ಪ್ರವಾಸದ ಬಗ್ಗೆ ನಾವು ಉತ್ಸುಕರಾಗಿದ್ದೇವೆ.', hi: 'हम कॉलेज की मैसूरु यात्रा को लेकर उत्साहित हैं।' },
                { en: 'She was disappointed because the match was cancelled.', kn: 'ಪಂದ್ಯ ರದ್ದಾದ ಕಾರಣ ಅವಳಿಗೆ ನಿರಾಶೆಯಾಯಿತು.', hi: 'वह निराश थी क्योंकि मैच रद्द हो गया था।' },
                { en: 'My grandmother feels lonely when we go out.', kn: 'ನಾವು ಹೊರಗೆ ಹೋದಾಗ ನನ್ನ ಅಜ್ಜಿಗೆ ಒಂಟಿತನ ಅನಿಸುತ್ತದೆ.', hi: 'जब हम बाहर जाते हैं, तो मेरी दादी को अकेलापन लगता है।' }
            ]
        },
        // Plans and goals
        '2:1': {
            en: true,
            words: [
                { en: 'goal', kn: 'ಗುರಿ', hi: 'लक्ष्य', pic: '🎯', def: 'something you want to achieve and work towards' },
                { en: 'career', kn: 'ವೃತ್ತಿಜೀವನ', hi: 'करियर', pic: '💼', def: 'the jobs and work a person does over their life' },
                { en: 'prepare', kn: 'ತಯಾರಿ ಮಾಡು', hi: 'तैयारी करना', pic: '📝', def: 'to get ready for something that will happen' },
                { en: 'progress', kn: 'ಪ್ರಗತಿ', hi: 'प्रगति', pic: '📈', def: 'moving forward, or getting better at something over time' }
            ],
            phrases: [
                { read: true, en: 'My goal is to get a government job.', kn: 'ಸರ್ಕಾರಿ ಕೆಲಸ ಪಡೆಯುವುದು ನನ್ನ ಗುರಿ.', hi: 'मेरा लक्ष्य सरकारी नौकरी पाना है।' },
                { read: true, en: 'I am preparing for the bank exam.', kn: 'ನಾನು ಬ್ಯಾಂಕ್ ಪರೀಕ್ಷೆಗೆ ತಯಾರಿ ಮಾಡುತ್ತಿದ್ದೇನೆ.', hi: 'मैं बैंक परीक्षा की तैयारी कर रहा हूँ।', acc: { hi: ['मैं बैंक परीक्षा की तैयारी कर रही हूँ।'] } },
                { en: 'My sister wants to build a career in computer science.', kn: 'ನನ್ನ ಅಕ್ಕ ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನದಲ್ಲಿ ವೃತ್ತಿಜೀವನ ರೂಪಿಸಿಕೊಳ್ಳಲು ಬಯಸುತ್ತಾಳೆ.', hi: 'मेरी दीदी कंप्यूटर साइंस में करियर बनाना चाहती है।' },
                { en: 'You have made good progress in English this year.', kn: 'ಈ ವರ್ಷ ನೀವು ಇಂಗ್ಲಿಷಿನಲ್ಲಿ ಉತ್ತಮ ಪ್ರಗತಿ ಸಾಧಿಸಿದ್ದೀರಿ.', hi: 'इस साल आपने अंग्रेज़ी में अच्छी प्रगति की है।' },
                { en: 'Small steps every day help us reach our goal.', kn: 'ಪ್ರತಿದಿನದ ಸಣ್ಣ ಹೆಜ್ಜೆಗಳು ನಮ್ಮ ಗುರಿ ತಲುಪಲು ಸಹಾಯ ಮಾಡುತ್ತವೆ.', hi: 'रोज़ के छोटे कदम हमें अपने लक्ष्य तक पहुँचने में मदद करते हैं।' }
            ]
        },
        // Teamwork and results
        '2:2': {
            words: [
                { en: 'leader', kn: 'ನಾಯಕ', hi: 'नेता', pic: '📣', def: 'the person who guides a group or team' },
                { en: 'agree', kn: 'ಒಪ್ಪು', hi: 'सहमत होना', pic: '🤝', def: 'to have the same opinion as someone else' },
                { en: 'success', kn: 'ಯಶಸ್ಸು', hi: 'सफलता', pic: '🏆', def: 'getting the result you wanted after trying hard' },
                { en: 'mistake', kn: 'ತಪ್ಪು', hi: 'गलती', pic: '❌', def: 'something done wrong, often without meaning to' }
            ],
            phrases: [
                { read: true, en: 'Our group chose Ravi as the leader.', kn: 'ನಮ್ಮ ಗುಂಪು ರವಿಯನ್ನು ನಾಯಕನನ್ನಾಗಿ ಆಯ್ಕೆ ಮಾಡಿತು.', hi: 'हमारे समूह ने रवि को नेता चुना।' },
                { read: true, en: 'Everyone agreed to finish the work by Friday.', kn: 'ಶುಕ್ರವಾರದೊಳಗೆ ಕೆಲಸ ಮುಗಿಸಲು ಎಲ್ಲರೂ ಒಪ್ಪಿದರು.', hi: 'सब लोग शुक्रवार तक काम पूरा करने के लिए सहमत हुए।' },
                { en: 'Good teamwork brought us success in the competition.', kn: 'ಉತ್ತಮ ತಂಡದ ಕೆಲಸದಿಂದ ಸ್ಪರ್ಧೆಯಲ್ಲಿ ನಮಗೆ ಯಶಸ್ಸು ಸಿಕ್ಕಿತು.', hi: 'अच्छे टीमवर्क से हमें प्रतियोगिता में सफलता मिली।' },
                { en: 'I made a mistake in the last question.', kn: 'ಕೊನೆಯ ಪ್ರಶ್ನೆಯಲ್ಲಿ ನಾನು ತಪ್ಪು ಮಾಡಿದೆ.', hi: 'मैंने आख़िरी सवाल में गलती की।' },
                { en: 'A good leader listens to every team member.', kn: 'ಒಳ್ಳೆಯ ನಾಯಕ ತಂಡದ ಪ್ರತಿಯೊಬ್ಬ ಸದಸ್ಯನ ಮಾತನ್ನು ಕೇಳುತ್ತಾನೆ.', hi: 'एक अच्छा नेता टीम के हर सदस्य की बात सुनता है।' }
            ]
        },
        // Staying healthy
        '3:1': {
            en: true,
            words: [
                { en: 'diet', kn: 'ಆಹಾರ ಕ್ರಮ', hi: 'आहार', pic: '🥗', def: 'the kind of food a person usually eats' },
                { en: 'junk food', kn: 'ಜಂಕ್ ಫುಡ್', hi: 'जंक फ़ूड', pic: '🍟', def: 'food that tastes good but is not good for health' },
                { en: 'yoga', kn: 'ಯೋಗ', hi: 'योग', pic: '🧘', def: 'exercises for the body and breathing that also calm the mind' },
                { en: 'stress', kn: 'ಒತ್ತಡ', hi: 'तनाव', pic: '😫', def: 'a feeling of worry caused by too much work or problems' }
            ],
            phrases: [
                { read: true, en: 'My father does yoga every morning.', kn: 'ನನ್ನ ತಂದೆ ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ಯೋಗ ಮಾಡುತ್ತಾರೆ.', hi: 'मेरे पिताजी हर सुबह योग करते हैं।' },
                { read: true, en: 'Eating too much junk food is bad for health.', kn: 'ಹೆಚ್ಚು ಜಂಕ್ ಫುಡ್ ತಿನ್ನುವುದು ಆರೋಗ್ಯಕ್ಕೆ ಹಾನಿಕರ.', hi: 'ज़्यादा जंक फ़ूड खाना सेहत के लिए बुरा है।' },
                { en: 'I feel a lot of stress before exams.', kn: 'ಪರೀಕ್ಷೆಗಳಿಗೆ ಮುಂಚೆ ನನಗೆ ತುಂಬಾ ಒತ್ತಡ ಅನಿಸುತ್ತದೆ.', hi: 'परीक्षा से पहले मुझे बहुत तनाव होता है।' },
                { en: 'You should change your diet and sleep earlier.', kn: 'ನೀವು ನಿಮ್ಮ ಆಹಾರ ಕ್ರಮವನ್ನು ಬದಲಾಯಿಸಿ, ಬೇಗ ಮಲಗಬೇಕು.', hi: 'आपको अपना आहार बदलना चाहिए और जल्दी सोना चाहिए।' },
                { en: 'Last year I stopped eating junk food.', kn: 'ಕಳೆದ ವರ್ಷ ನಾನು ಜಂಕ್ ಫುಡ್ ತಿನ್ನುವುದನ್ನು ನಿಲ್ಲಿಸಿದೆ.', hi: 'पिछले साल मैंने जंक फ़ूड खाना छोड़ दिया।' }
            ]
        },
        // At the doctor
        '3:2': {
            words: [
                { en: 'cough', kn: 'ಕೆಮ್ಮು', hi: 'खाँसी', pic: '😷', def: 'pushing air out of the throat suddenly with a loud sound' },
                { en: 'injection', kn: 'ಚುಚ್ಚುಮದ್ದು', hi: 'इंजेक्शन', pic: '💉', def: 'medicine put into the body through a needle' },
                { en: 'prescription', kn: 'ಔಷಧಿ ಚೀಟಿ', hi: 'दवा की पर्ची', pic: '📋', def: "a doctor's note saying which medicine you need" },
                { en: 'pain', kn: 'ನೋವು', hi: 'दर्द', pic: '🤕', def: 'the bad feeling in your body when you are hurt or ill' }
            ],
            phrases: [
                { read: true, en: 'I have had a bad cough since Monday.', kn: 'ಸೋಮವಾರದಿಂದ ನನಗೆ ತುಂಬಾ ಕೆಮ್ಮು ಇದೆ.', hi: 'मुझे सोमवार से बहुत खाँसी है।' },
                { read: true, en: 'The nurse gave me an injection in the arm.', kn: 'ನರ್ಸ್ ನನ್ನ ತೋಳಿಗೆ ಚುಚ್ಚುಮದ್ದು ನೀಡಿದರು.', hi: 'नर्स ने मेरी बाँह में इंजेक्शन लगाया।' },
                { en: 'Show this prescription at the medical shop.', kn: 'ಈ ಔಷಧಿ ಚೀಟಿಯನ್ನು ಮೆಡಿಕಲ್ ಅಂಗಡಿಯಲ್ಲಿ ತೋರಿಸಿ.', hi: 'यह दवा की पर्ची मेडिकल स्टोर पर दिखाइए।' },
                { en: 'Tell the doctor where you feel the pain.', kn: 'ನಿಮಗೆ ಎಲ್ಲಿ ನೋವು ಇದೆ ಎಂದು ವೈದ್ಯರಿಗೆ ಹೇಳಿ.', hi: 'डॉक्टर को बताइए कि आपको दर्द कहाँ है।' },
                { en: 'The doctor said my cough would go away soon.', kn: 'ನನ್ನ ಕೆಮ್ಮು ಬೇಗ ಕಡಿಮೆಯಾಗುತ್ತದೆ ಎಂದು ವೈದ್ಯರು ಹೇಳಿದರು.', hi: 'डॉक्टर ने कहा कि मेरी खाँसी जल्दी ठीक हो जाएगी।' }
            ]
        },
        // Free time
        '4:1': {
            en: true,
            words: [
                { en: 'picnic', kn: 'ಪಿಕ್ನಿಕ್', hi: 'पिकनिक', pic: '🧺', def: 'a meal eaten outdoors, in a park or garden, for fun' },
                { en: 'gardening', kn: 'ತೋಟಗಾರಿಕೆ', hi: 'बाग़बानी', pic: '🌱', def: 'growing and looking after plants and flowers' },
                { en: 'photography', kn: 'ಛಾಯಾಗ್ರಹಣ', hi: 'फ़ोटोग्राफ़ी', pic: '📷', def: 'taking pictures with a camera or a phone' },
                { en: 'novel', kn: 'ಕಾದಂಬರಿ', hi: 'उपन्यास', pic: '📖', def: 'a long story book about imaginary people and events' }
            ],
            phrases: [
                { read: true, en: 'We went for a picnic at Cubbon Park.', kn: 'ನಾವು ಕಬ್ಬನ್ ಉದ್ಯಾನವನಕ್ಕೆ ಪಿಕ್ನಿಕ್ ಹೋಗಿದ್ದೆವು.', hi: 'हम कब्बन पार्क में पिकनिक पर गए।' },
                { read: true, en: 'My mother loves gardening more than cooking.', kn: 'ನನ್ನ ಅಮ್ಮನಿಗೆ ಅಡುಗೆಗಿಂತ ತೋಟಗಾರಿಕೆ ಹೆಚ್ಚು ಇಷ್ಟ.', hi: 'मेरी माँ को खाना बनाने से ज़्यादा बाग़बानी पसंद है।' },
                { en: 'Rahul started learning photography during the summer holidays.', kn: 'ರಾಹುಲ್ ಬೇಸಿಗೆ ರಜೆಯಲ್ಲಿ ಛಾಯಾಗ್ರಹಣ ಕಲಿಯಲು ಶುರು ಮಾಡಿದ.', hi: 'राहुल ने गर्मी की छुट्टियों में फ़ोटोग्राफ़ी सीखना शुरू किया।' },
                { en: 'I finished a Kannada novel in one week.', kn: 'ನಾನು ಒಂದು ವಾರದಲ್ಲಿ ಒಂದು ಕನ್ನಡ ಕಾದಂಬರಿ ಓದಿ ಮುಗಿಸಿದೆ.', hi: 'मैंने एक हफ़्ते में एक कन्नड़ उपन्यास पढ़ लिया।' },
                { en: 'Our next picnic will be near the lake.', kn: 'ನಮ್ಮ ಮುಂದಿನ ಪಿಕ್ನಿಕ್ ಕೆರೆಯ ಬಳಿ ಇರುತ್ತದೆ.', hi: 'हमारी अगली पिकनिक झील के पास होगी।' }
            ]
        },
        // Sports and music
        '4:2': {
            words: [
                { en: 'badminton', kn: 'ಬ್ಯಾಡ್ಮಿಂಟನ್', hi: 'बैडमिंटन', pic: '🏸', def: 'a game where players hit a shuttlecock over a high net' },
                { en: 'guitar', kn: 'ಗಿಟಾರ್', hi: 'गिटार', pic: '🎸', def: 'a musical instrument with six strings, played with the fingers' },
                { en: 'stadium', kn: 'ಕ್ರೀಡಾಂಗಣ', hi: 'स्टेडियम', pic: '🏟️', def: 'a large ground with seats all around for sports or shows' },
                { en: 'singer', kn: 'ಗಾಯಕ', hi: 'गायक', pic: '🎤', def: 'a person who sings, often as a job' }
            ],
            phrases: [
                { read: true, en: 'We play badminton in the evening after college.', kn: 'ನಾವು ಕಾಲೇಜಿನ ನಂತರ ಸಂಜೆ ಬ್ಯಾಡ್ಮಿಂಟನ್ ಆಡುತ್ತೇವೆ.', hi: 'हम कॉलेज के बाद शाम को बैडमिंटन खेलते हैं।' },
                { read: true, en: 'My brother has been learning the guitar for a year.', kn: 'ನನ್ನ ಅಣ್ಣ ಒಂದು ವರ್ಷದಿಂದ ಗಿಟಾರ್ ಕಲಿಯುತ್ತಿದ್ದಾನೆ.', hi: 'मेरा भाई एक साल से गिटार सीख रहा है।' },
                { en: 'The stadium was full for the final match.', kn: 'ಅಂತಿಮ ಪಂದ್ಯಕ್ಕೆ ಕ್ರೀಡಾಂಗಣ ತುಂಬಿ ಹೋಗಿತ್ತು.', hi: 'फ़ाइनल मैच के लिए स्टेडियम भरा हुआ था।' },
                { en: 'Which singer do you like the most?', kn: 'ನಿಮಗೆ ಯಾವ ಗಾಯಕರು ಹೆಚ್ಚು ಇಷ್ಟ?', hi: 'आपको कौन-सा गायक सबसे ज़्यादा पसंद है?' },
                { en: 'The singer will perform at the stadium on Saturday.', kn: 'ಆ ಗಾಯಕರು ಶನಿವಾರ ಕ್ರೀಡಾಂಗಣದಲ್ಲಿ ಹಾಡಲಿದ್ದಾರೆ.', hi: 'वह गायक शनिवार को स्टेडियम में गाएगा।' }
            ]
        },
        review: {
            story: {
                title: { en: 'Kavya Does Not Give Up', kn: 'ಕಾವ್ಯ ಛಲ ಬಿಡಲಿಲ್ಲ', hi: 'काव्या ने हार नहीं मानी' },
                text: {
                    en: 'Kavya is a shy but hardworking student in Mysuru. Her goal was to play badminton for her college team. Every morning she did yoga, and she ate healthy food instead of junk food. A week before the tournament, she hurt her leg and felt very disappointed. The doctor told her to rest for five days. She did not give up, and she came back stronger than before. Her team won the final, and her parents were very proud of her.',
                    kn: 'ಕಾವ್ಯ ಮೈಸೂರಿನ ನಾಚಿಕೆ ಸ್ವಭಾವದ ಆದರೆ ಶ್ರಮಜೀವಿ ವಿದ್ಯಾರ್ಥಿನಿ. ತನ್ನ ಕಾಲೇಜು ತಂಡಕ್ಕಾಗಿ ಬ್ಯಾಡ್ಮಿಂಟನ್ ಆಡುವುದು ಅವಳ ಗುರಿಯಾಗಿತ್ತು. ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ಅವಳು ಯೋಗ ಮಾಡುತ್ತಿದ್ದಳು, ಮತ್ತು ಜಂಕ್ ಫುಡ್ ಬದಲು ಆರೋಗ್ಯಕರ ಆಹಾರ ತಿನ್ನುತ್ತಿದ್ದಳು. ಪಂದ್ಯಾವಳಿಗೆ ಒಂದು ವಾರ ಮೊದಲು ಅವಳ ಕಾಲಿಗೆ ಪೆಟ್ಟಾಯಿತು, ಮತ್ತು ಅವಳಿಗೆ ತುಂಬಾ ನಿರಾಶೆಯಾಯಿತು. ಐದು ದಿನ ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳುವಂತೆ ವೈದ್ಯರು ಹೇಳಿದರು. ಅವಳು ಛಲ ಬಿಡಲಿಲ್ಲ, ಮೊದಲಿಗಿಂತ ಹೆಚ್ಚು ಬಲಶಾಲಿಯಾಗಿ ಮರಳಿ ಬಂದಳು. ಅವಳ ತಂಡ ಫೈನಲ್ ಗೆದ್ದಿತು, ಮತ್ತು ಅವಳ ಪೋಷಕರಿಗೆ ಅವಳ ಬಗ್ಗೆ ತುಂಬಾ ಹೆಮ್ಮೆ ಅನಿಸಿತು.',
                    hi: 'काव्या मैसूरु की एक शर्मीली लेकिन मेहनती छात्रा है। उसका लक्ष्य अपनी कॉलेज टीम के लिए बैडमिंटन खेलना था। हर सुबह वह योग करती थी, और जंक फ़ूड की जगह सेहतमंद खाना खाती थी। प्रतियोगिता से एक हफ़्ता पहले उसके पैर में चोट लग गई, और वह बहुत निराश हो गई। डॉक्टर ने उसे पाँच दिन आराम करने को कहा। उसने हिम्मत नहीं हारी, और पहले से ज़्यादा मज़बूत होकर लौटी। उसकी टीम ने फ़ाइनल जीता, और उसके माता-पिता को उस पर बहुत गर्व हुआ।'
                },
                questions: [
                    {
                        q: { en: "What was Kavya's goal?", kn: 'ಕಾವ್ಯಳ ಗುರಿ ಏನಾಗಿತ್ತು?', hi: 'काव्या का लक्ष्य क्या था?' },
                        options: [
                            { en: 'To play badminton for her college team', kn: 'ತನ್ನ ಕಾಲೇಜು ತಂಡಕ್ಕಾಗಿ ಬ್ಯಾಡ್ಮಿಂಟನ್ ಆಡುವುದು', hi: 'अपनी कॉलेज टीम के लिए बैडमिंटन खेलना' },
                            { en: 'To become a doctor', kn: 'ವೈದ್ಯೆಯಾಗುವುದು', hi: 'डॉक्टर बनना' },
                            { en: 'To learn the guitar', kn: 'ಗಿಟಾರ್ ಕಲಿಯುವುದು', hi: 'गिटार सीखना' },
                            { en: 'To win a singing contest', kn: 'ಹಾಡಿನ ಸ್ಪರ್ಧೆ ಗೆಲ್ಲುವುದು', hi: 'गाने की प्रतियोगिता जीतना' }
                        ]
                    },
                    {
                        q: { en: 'What happened a week before the tournament?', kn: 'ಪಂದ್ಯಾವಳಿಗೆ ಒಂದು ವಾರ ಮೊದಲು ಏನಾಯಿತು?', hi: 'प्रतियोगिता से एक हफ़्ता पहले क्या हुआ?' },
                        options: [
                            { en: 'She hurt her leg.', kn: 'ಅವಳ ಕಾಲಿಗೆ ಪೆಟ್ಟಾಯಿತು.', hi: 'उसके पैर में चोट लग गई।' },
                            { en: 'She caught a fever.', kn: 'ಅವಳಿಗೆ ಜ್ವರ ಬಂತು.', hi: 'उसे बुखार हो गया।' },
                            { en: 'She left the team.', kn: 'ಅವಳು ತಂಡವನ್ನು ಬಿಟ್ಟಳು.', hi: 'उसने टीम छोड़ दी।' },
                            { en: 'She went to Bengaluru.', kn: 'ಅವಳು ಬೆಂಗಳೂರಿಗೆ ಹೋದಳು.', hi: 'वह बेंगलुरु चली गई।' }
                        ]
                    },
                    {
                        q: { en: 'How did her parents feel at the end?', kn: 'ಕೊನೆಯಲ್ಲಿ ಅವಳ ಪೋಷಕರಿಗೆ ಹೇಗೆ ಅನಿಸಿತು?', hi: 'अंत में उसके माता-पिता को कैसा लगा?' },
                        options: [
                            { en: 'They were very proud of her.', kn: 'ಅವರಿಗೆ ಅವಳ ಬಗ್ಗೆ ತುಂಬಾ ಹೆಮ್ಮೆ ಅನಿಸಿತು.', hi: 'उन्हें उस पर बहुत गर्व हुआ।' },
                            { en: 'They were angry with her.', kn: 'ಅವರಿಗೆ ಅವಳ ಮೇಲೆ ಕೋಪ ಬಂತು.', hi: 'वे उससे नाराज़ हुए।' },
                            { en: 'They were worried about her studies.', kn: 'ಅವಳ ಓದಿನ ಬಗ್ಗೆ ಅವರಿಗೆ ಚಿಂತೆಯಾಯಿತು.', hi: 'उन्हें उसकी पढ़ाई की चिंता हुई।' },
                            { en: 'They were disappointed with her.', kn: 'ಅವರಿಗೆ ಅವಳ ಬಗ್ಗೆ ನಿರಾಶೆಯಾಯಿತು.', hi: 'वे उससे निराश हुए।' }
                        ]
                    }
                ]
            }
        }
    },
    glosses: {
        kn: {
            // Character
            'ನನ್ನ ಅಜ್ಜ ಒಬ್ಬ ಧೈರ್ಯಶಾಲಿ ಸೈನಿಕರಾಗಿದ್ದರು.': 'my/mine|grandfather|a/one|brave|was a soldier/was soldier',
            'ಮೀನಾ ನಾಚಿಕೆ ಸ್ವಭಾವದವಳು, ಆದರೆ ವೇದಿಕೆಯ ಮೇಲೆ ಚೆನ್ನಾಗಿ ಮಾತನಾಡುತ್ತಾಳೆ.': 'Meena|shy/shyness|is natured/of nature|but|of the stage/stage|on|well/nicely|speaks/talks',
            'ನನ್ನ ಚಿಕ್ಕಪ್ಪ ಹುಬ್ಬಳ್ಳಿ ಹತ್ತಿರದ ಶ್ರಮಜೀವಿ ರೈತರು.': 'my/mine|uncle|Hubballi|near/nearby|hardworking|farmer/is a farmer',
            'ಅವನು ಹಠಮಾರಿ, ತನ್ನ ನಿರ್ಧಾರವನ್ನು ಎಂದಿಗೂ ಬದಲಿಸುವುದಿಲ್ಲ.': 'he|stubborn/is stubborn|his/own|decision/mind|never/ever|never changes/will not change',
            'ಅವಳು ಧೈರ್ಯದಿಂದ ಗಾಯಗೊಂಡ ವ್ಯಕ್ತಿಗೆ ಸಹಾಯ ಮಾಡಿದಳು.': 'she|bravely/with courage|injured/hurt|to the man/to the person|help/helped|did/gave',
            // Feelings
            'ನಾನು ಬಹುಮಾನ ಗೆದ್ದಾಗ ನನ್ನ ಪೋಷಕರಿಗೆ ಹೆಮ್ಮೆ ಅನಿಸಿತು.': 'I|prize/award|when won/when I won|my/mine|to parents/parents|proud/pride|felt',
            'ಮೊದಮೊದಲು ಹಾಸ್ಟೆಲಿನಲ್ಲಿ ನನಗೆ ಒಂಟಿತನ ಅನಿಸಿತು.': 'at first/in the beginning|in the hostel|to me/I|lonely/loneliness|felt',
            'ಮೈಸೂರಿಗೆ ಹೋಗುವ ಕಾಲೇಜು ಪ್ರವಾಸದ ಬಗ್ಗೆ ನಾವು ಉತ್ಸುಕರಾಗಿದ್ದೇವೆ.': 'to Mysuru|going/that goes|college|of the trip/trip|about|we|are excited/excited',
            'ಪಂದ್ಯ ರದ್ದಾದ ಕಾರಣ ಅವಳಿಗೆ ನಿರಾಶೆಯಾಯಿತು.': 'match/the match|was cancelled/cancelled|because/reason|to her/she|was disappointed/felt disappointed',
            'ನಾವು ಹೊರಗೆ ಹೋದಾಗ ನನ್ನ ಅಜ್ಜಿಗೆ ಒಂಟಿತನ ಅನಿಸುತ್ತದೆ.': 'we|out/outside|when go/when we go|my/mine|to grandmother/grandmother|lonely/loneliness|feels',
            // Plans and goals
            'ಸರ್ಕಾರಿ ಕೆಲಸ ಪಡೆಯುವುದು ನನ್ನ ಗುರಿ.': 'government|job/work|to get/getting|my/mine|goal/aim/is the goal',
            'ನಾನು ಬ್ಯಾಂಕ್ ಪರೀಕ್ಷೆಗೆ ತಯಾರಿ ಮಾಡುತ್ತಿದ್ದೇನೆ.': 'I|bank|for the exam/for exam|preparation/preparing|am doing/doing',
            'ನನ್ನ ಅಕ್ಕ ಕಂಪ್ಯೂಟರ್ ವಿಜ್ಞಾನದಲ್ಲಿ ವೃತ್ತಿಜೀವನ ರೂಪಿಸಿಕೊಳ್ಳಲು ಬಯಸುತ್ತಾಳೆ.': 'my/mine|elder sister/sister|computer|in science|career|to build/to shape|wants/wishes',
            'ಈ ವರ್ಷ ನೀವು ಇಂಗ್ಲಿಷಿನಲ್ಲಿ ಉತ್ತಮ ಪ್ರಗತಿ ಸಾಧಿಸಿದ್ದೀರಿ.': 'this|year|you|in English|good/great|progress|have made/have achieved',
            'ಪ್ರತಿದಿನದ ಸಣ್ಣ ಹೆಜ್ಜೆಗಳು ನಮ್ಮ ಗುರಿ ತಲುಪಲು ಸಹಾಯ ಮಾಡುತ್ತವೆ.': "every day's/daily|small/little|steps|our/ours|goal/aim|to reach|help|do/make",
            // Teamwork and results
            'ನಮ್ಮ ಗುಂಪು ರವಿಯನ್ನು ನಾಯಕನನ್ನಾಗಿ ಆಯ್ಕೆ ಮಾಡಿತು.': 'our/ours|group|Ravi|as the leader/as leader|choice/selection|chose/made/did',
            'ಶುಕ್ರವಾರದೊಳಗೆ ಕೆಲಸ ಮುಗಿಸಲು ಎಲ್ಲರೂ ಒಪ್ಪಿದರು.': 'by Friday/before Friday|work/the work|to finish/to complete|everyone/all|agreed',
            'ಉತ್ತಮ ತಂಡದ ಕೆಲಸದಿಂದ ಸ್ಪರ್ಧೆಯಲ್ಲಿ ನಮಗೆ ಯಶಸ್ಸು ಸಿಕ್ಕಿತು.': "good/great|team's/of the team|by work/from work|in the competition|to us/us|success|came/was got/brought",
            'ಕೊನೆಯ ಪ್ರಶ್ನೆಯಲ್ಲಿ ನಾನು ತಪ್ಪು ಮಾಡಿದೆ.': 'last/final|in the question|I|mistake/error|made/did',
            'ಒಳ್ಳೆಯ ನಾಯಕ ತಂಡದ ಪ್ರತಿಯೊಬ್ಬ ಸದಸ್ಯನ ಮಾತನ್ನು ಕೇಳುತ್ತಾನೆ.': "good|leader|of the team/team|every/each|member's/of the member|words/talk|listens/hears",
            // Staying healthy
            'ನನ್ನ ತಂದೆ ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ಯೋಗ ಮಾಡುತ್ತಾರೆ.': 'my/mine|father|every day/daily|morning/in the morning|yoga|do/practise',
            'ಹೆಚ್ಚು ಜಂಕ್ ಫುಡ್ ತಿನ್ನುವುದು ಆರೋಗ್ಯಕ್ಕೆ ಹಾನಿಕರ.': 'too much/more|junk|food|eating|for health/to health|bad/harmful/is harmful',
            'ಪರೀಕ್ಷೆಗಳಿಗೆ ಮುಂಚೆ ನನಗೆ ತುಂಬಾ ಒತ್ತಡ ಅನಿಸುತ್ತದೆ.': 'exams/to exams|before|to me/I|a lot/very|stress/pressure|feel/is felt',
            'ನೀವು ನಿಮ್ಮ ಆಹಾರ ಕ್ರಮವನ್ನು ಬದಲಾಯಿಸಿ, ಬೇಗ ಮಲಗಬೇಕು.': 'you|your/yours|food/diet|routine/pattern|change and/having changed|early/earlier|should sleep/must sleep',
            'ಕಳೆದ ವರ್ಷ ನಾನು ಜಂಕ್ ಫುಡ್ ತಿನ್ನುವುದನ್ನು ನಿಲ್ಲಿಸಿದೆ.': 'last/past|year|I|junk|food|eating|stopped',
            // At the doctor
            'ಸೋಮವಾರದಿಂದ ನನಗೆ ತುಂಬಾ ಕೆಮ್ಮು ಇದೆ.': 'since Monday/from Monday|to me/I|bad/very/a lot|cough|is/have had',
            'ನರ್ಸ್ ನನ್ನ ತೋಳಿಗೆ ಚುಚ್ಚುಮದ್ದು ನೀಡಿದರು.': 'nurse/the nurse|my/me|in the arm/to the arm|injection|gave',
            'ಈ ಔಷಧಿ ಚೀಟಿಯನ್ನು ಮೆಡಿಕಲ್ ಅಂಗಡಿಯಲ್ಲಿ ತೋರಿಸಿ.': 'this|medicine|slip/prescription|medical|at the shop/in the shop|show/please show',
            'ನಿಮಗೆ ಎಲ್ಲಿ ನೋವು ಇದೆ ಎಂದು ವೈದ್ಯರಿಗೆ ಹೇಳಿ.': 'to you/you|where|pain|is/feel|that|to the doctor/doctor|tell/please tell',
            'ನನ್ನ ಕೆಮ್ಮು ಬೇಗ ಕಡಿಮೆಯಾಗುತ್ತದೆ ಎಂದು ವೈದ್ಯರು ಹೇಳಿದರು.': 'my/mine|cough|soon/quickly|would go away/will reduce|that|doctor/the doctor|said/told',
            // Free time
            'ನಾವು ಕಬ್ಬನ್ ಉದ್ಯಾನವನಕ್ಕೆ ಪಿಕ್ನಿಕ್ ಹೋಗಿದ್ದೆವು.': 'we|Cubbon|to the park/to park|picnic|went/had gone',
            'ನನ್ನ ಅಮ್ಮನಿಗೆ ಅಡುಗೆಗಿಂತ ತೋಟಗಾರಿಕೆ ಹೆಚ್ಚು ಇಷ್ಟ.': 'my/mine|to mother/mother|than cooking|gardening|more|loves/likes',
            'ರಾಹುಲ್ ಬೇಸಿಗೆ ರಜೆಯಲ್ಲಿ ಛಾಯಾಗ್ರಹಣ ಕಲಿಯಲು ಶುರು ಮಾಡಿದ.': 'Rahul|summer|during the holidays/in the holidays|photography|learning/to learn|start/beginning|started/did',
            'ನಾನು ಒಂದು ವಾರದಲ್ಲಿ ಒಂದು ಕನ್ನಡ ಕಾದಂಬರಿ ಓದಿ ಮುಗಿಸಿದೆ.': 'I|one/a|in a week/in week|a/one|Kannada|novel|having read/reading|finished',
            'ನಮ್ಮ ಮುಂದಿನ ಪಿಕ್ನಿಕ್ ಕೆರೆಯ ಬಳಿ ಇರುತ್ತದೆ.': 'our/ours|next|picnic|of the lake/lake|near/by|will be/is',
            // Sports and music
            'ನಾವು ಕಾಲೇಜಿನ ನಂತರ ಸಂಜೆ ಬ್ಯಾಡ್ಮಿಂಟನ್ ಆಡುತ್ತೇವೆ.': 'we|of college/college|after|in the evening/evening|badminton|play',
            'ನನ್ನ ಅಣ್ಣ ಒಂದು ವರ್ಷದಿಂದ ಗಿಟಾರ್ ಕಲಿಯುತ್ತಿದ್ದಾನೆ.': 'my/mine|elder brother/brother|one/a|for a year/since a year|guitar|has been learning/is learning',
            'ಅಂತಿಮ ಪಂದ್ಯಕ್ಕೆ ಕ್ರೀಡಾಂಗಣ ತುಂಬಿ ಹೋಗಿತ್ತು.': 'final/last|for the match/to the match|stadium/the stadium|full/filled|was/had become',
            'ನಿಮಗೆ ಯಾವ ಗಾಯಕರು ಹೆಚ್ಚು ಇಷ್ಟ?': 'to you/you|which|singer/singers|the most/more|like/liked',
            'ಆ ಗಾಯಕರು ಶನಿವಾರ ಕ್ರೀಡಾಂಗಣದಲ್ಲಿ ಹಾಡಲಿದ್ದಾರೆ.': 'the/that|singer|on Saturday/Saturday|at the stadium/in the stadium|will perform/will sing'
        },
        hi: {
            // Character
            'मेरे दादाजी एक बहादुर सैनिक थे।': 'my|grandfather|a/one|brave|soldier|was/were',
            'मीना शर्मीली है, लेकिन मंच पर अच्छा बोलती है।': 'Meena|shy|is|but|stage|on|well/good|speaks/talks|is',
            'मेरे चाचा हुबली के पास एक मेहनती किसान हैं।': 'my|uncle|Hubballi|of|near/close|a/one|hardworking|farmer|is/are',
            'वह ज़िद्दी है और कभी अपना फ़ैसला नहीं बदलता।': 'he/she/that|stubborn|is|and|ever/never|his/own|decision/mind|not/never|changes',
            'वह बहादुर थी और उसने घायल आदमी की मदद की।': 'she/he/that|brave|was|and|she/he|injured/hurt|man/person|of|help/helped|did',
            // Feelings
            'जब मैंने इनाम जीता, तब मेरे माता-पिता को गर्व हुआ।': 'when|I|prize/award|won|then|my|parents|to|proud/pride|felt/happened',
            'शुरू में हॉस्टल में मुझे अकेलापन महसूस हुआ।': 'first/beginning/start|in/at|hostel|in|to me/I|lonely/loneliness|feeling/felt|happened/was',
            'हम कॉलेज की मैसूरु यात्रा को लेकर उत्साहित हैं।': "we|college|of/'s|Mysuru|trip/journey|to/about|regarding/about|excited|are",
            'वह निराश थी क्योंकि मैच रद्द हो गया था।': 'she/he/that|disappointed|was|because|match/the match|cancelled|be/become|went/got|was/had',
            'जब हम बाहर जाते हैं, तो मेरी दादी को अकेलापन लगता है।': 'when|we|out/outside|go|are|then|my|grandmother|to|lonely/loneliness|feels/seems|is',
            // Plans and goals
            'मेरा लक्ष्य सरकारी नौकरी पाना है।': 'my|goal/aim|government|job|to get/get|is',
            'मैं बैंक परीक्षा की तैयारी कर रहा हूँ।': 'I|bank|exam|of/for|preparation/preparing|do/doing|(-ing)|am',
            'मेरी दीदी कंप्यूटर साइंस में करियर बनाना चाहती है।': 'my|elder sister/sister|computer|science|in|career|to build/to make|wants|is',
            'इस साल आपने अंग्रेज़ी में अच्छी प्रगति की है।': 'this|year|you|English|in|good|progress|made/did|have/is',
            'रोज़ के छोटे कदम हमें अपने लक्ष्य तक पहुँचने में मदद करते हैं।': 'every day/daily|of|small/little|steps|us/to us|our/own|goal/aim|to/up to|reach/reaching|in|help|do|are',
            // Teamwork and results
            'हमारे समूह ने रवि को नेता चुना।': 'our|group|by|Ravi|to/as|leader|chose/selected',
            'सब लोग शुक्रवार तक काम पूरा करने के लिए सहमत हुए।': 'all/every|people/one|Friday|by/till|work|complete/finish|to do/doing|of|for/to|agreed/agree|were/became',
            'अच्छे टीमवर्क से हमें प्रतियोगिता में सफलता मिली।': 'good|teamwork|from/by|to us/us|competition|in|success|got/was received/brought',
            'मैंने आख़िरी सवाल में गलती की।': 'I|last/final|question|in|mistake/error|made/did',
            'एक अच्छा नेता टीम के हर सदस्य की बात सुनता है।': 'a/one|good|leader|team|of|every/each|member|of|talk/words|listens/hears|is',
            // Staying healthy
            'मेरे पिताजी हर सुबह योग करते हैं।': 'my|father|every/each|morning|yoga|do|are/is',
            'ज़्यादा जंक फ़ूड खाना सेहत के लिए बुरा है।': 'too much/more|junk|food|eating/to eat|health|of|for|bad|is',
            'परीक्षा से पहले मुझे बहुत तनाव होता है।': 'exams/exam|from/than|before|to me/I|a lot/very|stress/tension|happens/feel|is',
            'आपको अपना आहार बदलना चाहिए और जल्दी सोना चाहिए।': 'to you/you|your/own|diet/food|to change/change|should|and|early/earlier|to sleep/sleep|should',
            'पिछले साल मैंने जंक फ़ूड खाना छोड़ दिया।': 'last/previous|year|I|junk|food|eating/to eat|stopped/quit/left|gave/did',
            // At the doctor
            'मुझे सोमवार से बहुत खाँसी है।': 'to me/I|Monday|since/from|bad/very/a lot|cough|is/have had',
            'नर्स ने मेरी बाँह में इंजेक्शन लगाया।': 'nurse/the nurse|by|my/me|arm|in|injection|gave/put',
            'यह दवा की पर्ची मेडिकल स्टोर पर दिखाइए।': 'this|medicine|of|slip/prescription|medical|store/shop|at/on|show/please show',
            'डॉक्टर को बताइए कि आपको दर्द कहाँ है।': 'doctor/the doctor|to|tell/please tell|that|to you/you|pain|where|is/feel',
            'डॉक्टर ने कहा कि मेरी खाँसी जल्दी ठीक हो जाएगी।': 'doctor/the doctor|by|said|that|my|cough|soon/quickly|fine/well|be/become|would go/will go',
            // Free time
            'हम कब्बन पार्क में पिकनिक पर गए।': 'we|Cubbon|park|at/in|picnic|on/for|went',
            'मेरी माँ को खाना बनाने से ज़्यादा बाग़बानी पसंद है।': 'my|mother|to|food/cooking|making/cook|than/from|more|gardening|liked/loves|is',
            'राहुल ने गर्मी की छुट्टियों में फ़ोटोग्राफ़ी सीखना शुरू किया।': 'Rahul|by|summer|of|holidays|during/in|photography|learning/to learn|start/begin|did/started',
            'मैंने एक हफ़्ते में एक कन्नड़ उपन्यास पढ़ लिया।': 'I|one/a|week|in|a/one|Kannada|novel|read|finished/took',
            'हमारी अगली पिकनिक झील के पास होगी।': 'our|next|picnic|lake|of|near/close|will be',
            // Sports and music
            'हम कॉलेज के बाद शाम को बैडमिंटन खेलते हैं।': 'we|college|of|after|evening|in/at|badminton|play|are',
            'मेरा भाई एक साल से गिटार सीख रहा है।': 'my|brother|one/a|year|for/since|guitar|learn/learning|(-ing)/been|is/has',
            'फ़ाइनल मैच के लिए स्टेडियम भरा हुआ था।': 'final|match|of|for|stadium/the stadium|full/filled|been/become|was',
            'आपको कौन-सा गायक सबसे ज़्यादा पसंद है?': 'to you/you|which|singer|most/of all|more/the most|like/liked|is',
            'वह गायक शनिवार को स्टेडियम में गाएगा।': 'the/that|singer|Saturday|on|stadium|at/in|will perform/will sing'
        }
    }
};
