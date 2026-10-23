/**
 * Linguistic Ability — German as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 *
 * German writes every noun with a capital letter, and the models do too.
 * Answers are compared in lower case, so a student who types "das buch" for
 * "das Buch" is not marked wrong for it.
 */
module.exports = {
    code: 'de', name: 'German', native: 'Deutsch', locale: 'de-DE',
    words: {
        'vocab-beginner-1': {
            family: 'Familie',
            mother: 'Mutter',
            father: 'Vater',
            house: 'Haus',
            food: 'Essen, Nahrung',
            happy: 'glücklich, froh',
            big: 'groß',
            small: 'klein'
        },
        'vocab-beginner-2': {
            book: 'Buch',
            teacher: 'Lehrer, Lehrerin',
            student: 'Schüler, Student',
            friend: 'Freund, Freundin',
            read: 'lesen',
            write: 'schreiben',
            early: 'früh',
            easy: 'leicht, einfach'
        },
        'vocab-intermediate-1': {
            honest: 'ehrlich',
            polite: 'höflich',
            curious: 'neugierig',
            confident: 'selbstbewusst, zuversichtlich',
            patient: 'geduldig',
            grateful: 'dankbar',
            anxious: 'besorgt, ängstlich',
            generous: 'großzügig'
        },
        'vocab-intermediate-2': {
            deadline: 'Frist, Abgabetermin',
            improve: 'verbessern',
            achieve: 'erreichen',
            schedule: 'Zeitplan, Terminplan',
            opportunity: 'Gelegenheit, Chance',
            responsible: 'verantwortlich',
            discuss: 'besprechen, diskutieren',
            result: 'Ergebnis'
        },
        'vocab-advanced-1': {
            negotiate: 'verhandeln, aushandeln',
            collaborate: 'zusammenarbeiten',
            efficient: 'effizient',
            feasible: 'machbar, durchführbar',
            comprehensive: 'umfassend',
            prioritise: 'priorisieren',
            ambiguous: 'mehrdeutig, unklar',
            persuade: 'überzeugen, überreden'
        },
        'vocab-advanced-2': {
            sustainable: 'nachhaltig',
            consequence: 'Folge, Konsequenz',
            perspective: 'Sichtweise, Perspektive',
            inevitable: 'unvermeidlich',
            substantial: 'erheblich, beträchtlich',
            advocate: 'befürworten, empfehlen',
            diverse: 'vielfältig',
            integrity: 'Integrität, Redlichkeit'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'German has articles too: der, die, das and ein, eine, which change with gender and case. English has only "the" and "a/an", the same for every noun. But English needs "a" before a job ("I am a student" — "Ich bin Schüler"), and no "the" for ideas and things in general where German often has one ("Life is short" — "Das Leben ist kurz").'
        },
        'grammar-beginner-2': {
            points: {
                4: 'German also uses Subject → Verb → Object in a simple sentence: "Ravi liest Bücher." But German keeps the verb in second place, so after a time word the subject moves behind it ("Heute liest Ravi Bücher"), while English keeps the subject before the verb: "Today Ravi reads books."'
            }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each German word or sentence into English.',
            points: [
                'German word order is close to English in simple sentences: "Ich gehe zur Schule" = "I go to school." But German keeps the verb in second place and sends the second verb part to the end: "Heute gehe ich zur Schule" = "Today I go to school"; "Ich habe ein Buch gelesen" = "I have read a book".',
                'Both languages have articles, but German ones change with gender and case (der, die, das, ein, eine), while English has just "the" and "a/an". English needs "a" before a job, where German has none: "Ich bin Schüler" = "I am a student".',
                'Watch the tense: "ich gehe" can mean "I go" or "I am going" (German has no -ing form); "ich bin gegangen" = "I went"; "ich werde gehen" = "I will go".',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into German.',
            points: [
                'The word order is often the same: "I go to school" → "Ich gehe zur Schule". But the verb must stay in second place: "Today I go to school" → "Heute gehe ich zur Schule".',
                'Every German noun has a gender and its own article: der Bus, die Schule, das Buch ("a" is ein or eine). Leave out "a" before a job: "I am a student" → "Ich bin Schüler". And start every noun with a capital letter.',
                'Choose the polite form for elders, teachers and strangers: Sie, kommen Sie, geben Sie. With friends and family you may use du, komm, gib.',
                'Type in German with your phone\'s German keyboard (press and hold a, o, u or s to get ä, ö, ü or ß), or use the letter keys under the answer box. Umlauts matter: "schon" (already) is not "schön" (beautiful).'
            ]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the German verb form to choose the English tense.',
            points: [
                'German word order is close to English in simple sentences: "Ich gehe zur Schule" = "I go to school." But German keeps the verb in second place and sends the second verb part to the end: "Heute gehe ich zur Schule" = "Today I go to school"; "Ich habe ein Buch gelesen" = "I have read a book".',
                'Both languages have articles, but German ones change with gender and case (der, die, das, ein, eine), while English has just "the" and "a/an". English needs "a" before a job, where German has none: "Ich bin Schüler" = "I am a student".',
                'Watch the tense: "ich gehe" = I go or I am going; "ich habe gesehen" = I watched or I saw; "ich werde gehen" = I will go. German often uses the present for the future ("Wir fahren morgen" = "We will go tomorrow"), and with "seit" for something still going on ("Ich wohne seit zwei Jahren hier"), where English says "I have been living here for two years".',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural German. Use the polite Sie form for requests.',
            points: [
                'Keep the verb in second place; with können, müssen or werden the main verb goes to the end: "Can you help me?" → "Können Sie mir helfen?". "Not" is "nicht", or "kein" before a noun: "Do not waste water" → "Verschwenden Sie kein Wasser".',
                'Every noun has a gender and a capital letter: der Unterricht, die Bibliothek, das Geschäft. Words like "my" change with it: "mein Buch", but "meine Prüfung".',
                'Choose the polite form for elders, teachers and strangers: Sie, kommen Sie, geben Sie. With friends and family you may use du, komm, gib.',
                'Type in German with your phone\'s German keyboard (press and hold a, o, u or s to get ä, ö, ü or ß), or use the letter keys under the answer box. Umlauts matter: "schon" (already) is not "schön" (beautiful).'
            ]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "Die Besprechung wurde verschoben" = "The meeting has been postponed."',
            points: [
                'German word order is close to English in simple sentences: "Ich gehe zur Schule" = "I go to school." But German keeps the verb in second place and sends the second verb part to the end: "Heute gehe ich zur Schule" = "Today I go to school"; "Ich habe ein Buch gelesen" = "I have read a book".',
                'Both languages have articles, but German ones change with gender and case (der, die, das, ein, eine), while English has just "the" and "a/an". English needs "a" before a job, where German has none: "Ich bin Schüler" = "I am a student".',
                'Watch the tense and the passive: "wurde verschoben" = has been (or was) postponed; "wird gelöst" can mean "will be solved". German often uses "man" where English prefers a passive: "Man gibt die Ergebnisse morgen bekannt" = "The results will be announced tomorrow."',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal German. Passive forms with "werden", such as "werden bekannt gegeben" (will be announced), are common in notices, and "Bitte …" with Sie is the formal "please".',
            points: [
                'In a part of the sentence that starts with "wenn", "falls" (if) or "dass" (that), the verb goes to the end: "Bitte informieren Sie mich, falls es Änderungen gibt." In the passive, the second verb goes to the end too: "Die Ergebnisse werden morgen bekannt gegeben."',
                'Every noun has a gender and a capital letter, and German often adds an article where English has none: "Education is the key to success" → "Bildung ist der Schlüssel zum Erfolg" ("zum" = zu dem, to the).',
                'In formal writing always use Sie, Ihnen and Ihr, with a capital letter: "Ich schreibe Ihnen, um …", "Vielen Dank für Ihre …". Keep du for friends and family.',
                'Type in German with your phone\'s German keyboard (press and hold a, o, u or s to get ä, ö, ü or ß), or use the letter keys under the answer box. Umlauts matter: "schon" (already) is not "schön" (beautiful).'
            ]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'Wasser', explanation: '"Wasser" means water. Like every German noun it starts with a capital letter: das Wasser.' },
            i2: { source: 'Buch', explanation: '"Buch" means book; "ein Buch" = a book.' },
            i3: { source: 'Ich heiße Rani.', explanation: '"Ich heiße" (from "heißen", to be called) is how German gives a name. In English say "My name is …" or "I am …".' },
            i4: { source: 'Wie geht es Ihnen?', explanation: 'This is the polite greeting (to a friend: "Wie geht es dir?" or "Wie geht\'s?"). English simply says: How are you?' },
            i5: { source: 'Mir geht es gut.', explanation: '"Mir geht es gut" (literally "it goes well for me") means "I am fine". English uses "I am".' },
            i6: { source: 'Das ist mein Haus.', explanation: '"Das ist" = this is; "mein Haus" = my house ("mein" because "Haus" is neuter; a feminine noun takes "meine"). English "my" never changes.' },
            q1: { source: 'Ich gehe zur Schule.', explanation: '"Ich gehe" can mean "I go" or "I am going". "zur" (zu der) = to the, but English says just "to school".' },
            q2: { source: 'Sie ist meine jüngere Schwester.', explanation: '"jüngere Schwester" (or "kleine Schwester") is a younger sister; an elder sister is "ältere" or "große Schwester".' },
            q3: { source: 'Bitte schließen Sie die Tür.', explanation: '"Bitte" = please, "die Tür" = the door, "schließen Sie" = close (polite; to a friend: "Schließ bitte die Tür").' },
            q4: { source: 'Danke.', explanation: '"Danke" means thank you; "Vielen Dank" or "Danke schön" = thank you very much.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'Freund', accepted: ['Freundin', 'ein Freund', 'eine Freundin', 'Kumpel'], explanation: 'Friend is "Freund" (for a girl, "Freundin"); "Kumpel" is more casual. Careful: "mein Freund" can also mean "my boyfriend".' },
            i2: { model: 'Schule', accepted: ['die Schule', 'eine Schule'], explanation: 'School is "Schule", a feminine noun: die Schule, eine Schule.' },
            i3: { model: 'Guten Morgen.', accepted: [], explanation: '"Guten Morgen" is the usual greeting until late morning; later in the day say "Guten Tag".' },
            i4: { model: 'Ich bin Schüler.', accepted: ['Ich bin Schülerin.', 'Ich bin Student.', 'Ich bin Studentin.', 'Ich bin ein Schüler.'], explanation: 'German drops "a" before a job or role: "Ich bin Schüler" (a girl says "Schülerin"; at college, "Student" or "Studentin"). "Ich bin" = I am.' },
            i5: { model: 'Wie heißen Sie?', accepted: ['Wie heißt du?', 'Wie ist Ihr Name?', 'Wie ist dein Name?'], explanation: '"Wie heißen Sie?" is polite (literally "How are you called?"); with a friend, "Wie heißt du?".' },
            i6: { model: 'Das Essen ist lecker.', accepted: ['Das Essen schmeckt gut.', 'Das Essen ist köstlich.', 'Das Essen schmeckt lecker.'], explanation: '"lecker" = tasty; "Das Essen schmeckt gut" (the food tastes good) is just as common. After "ist", the adjective takes no ending.' },
            q1: { model: 'Wo ist die Bushaltestelle?', accepted: ['Wo ist der Busbahnhof?', 'Wo befindet sich die Bushaltestelle?', 'Wo ist die Haltestelle?'], explanation: '"Wo" = where; "Wo ist … ?" = where is …? "die Bushaltestelle" is a bus stop; a big bus station is "der Busbahnhof". German joins such nouns into one word.' },
            q2: { model: 'Ich mag Mangos.', accepted: ['Ich esse gern Mangos.', 'Ich esse gerne Mangos.', 'Mangos mag ich.'], explanation: '"Ich mag" = I like. As in English, no article is needed here: "Ich mag Mangos". "Ich esse gern Mangos" (I like eating mangoes) is also common.' },
            q3: { model: 'Kommen Sie her.', accepted: ['Komm her.', 'Kommen Sie hierher.', 'Komm hierher.', 'Komm mal her.'], explanation: '"Kommen Sie her" is polite; "Komm her" is used with friends and children. "her" means "here, towards me".' },
            q4: { model: 'Es regnet.', accepted: [], explanation: 'German says "Es regnet" (it rains), from "regnen"; there is no "-ing" form, so "it is raining" is one short verb.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'Ich habe gestern einen Film gesehen.', explanation: '"Ich habe … gesehen" is the perfect tense, used for the past in speech: watched (or saw). "einen Film" = a movie, "gestern" = yesterday.' },
            i2: { source: 'Er läuft jeden Morgen.', explanation: 'A habit takes the simple present: "er läuft" = he runs. "jeden Morgen" = every morning.' },
            i3: { source: 'Wir fahren morgen nach Mysuru.', explanation: 'German often uses the present for the future; "morgen" (tomorrow) shows it, so English says "will go". "fahren" = go by bus, car or train.' },
            i4: { source: 'Sie liest gerade ein Buch.', explanation: 'German has no "-ing" form; "gerade" (right now) shows an action happening now: is reading. "liest" is the "she" form of "lesen".' },
            i5: { source: 'Die Kinder spielen auf dem Sportplatz.', explanation: '"der Sportplatz" = the ground or field; "spielen" = are playing (the German present covers both "play" and "are playing").' },
            i6: { source: 'Haben Sie schon gegessen?', explanation: 'A polite question about eating (to a friend: "Hast du schon gegessen?"). "Have you eaten?" is just as natural.' },
            q1: { source: 'Ich spreche gern Englisch.', explanation: '"gern" after a verb = like to …: "Ich spreche gern" = I like to speak. "Englisch" = English.' },
            q2: { source: 'Seit zwei Jahren wohnen sie in Bengaluru.', explanation: 'German uses the present with "seit" (seit zwei Jahren = for two years); English needs the present perfect continuous: have been living … for.' },
            q3: { source: 'Der Zug ist pünktlich angekommen.', explanation: '"pünktlich" = on time; "ist angekommen" = came or arrived (the perfect tense, used for the past in speech).' },
            q4: { source: 'Bitte sprechen Sie langsam.', explanation: '"langsam" = slowly; "sprechen Sie" is the polite request form of "sprechen" (speak). German uses the same word for "slow" and "slowly".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'Bitte geben Sie mir etwas Wasser.', accepted: ['Gib mir bitte etwas Wasser.', 'Geben Sie mir bitte etwas Wasser.', 'Bitte geben Sie mir Wasser.', 'Könnten Sie mir bitte etwas Wasser geben?'], explanation: '"Geben Sie mir" is the polite form of "give me" (to a friend: "gib mir"); "etwas Wasser" = some water.' },
            i2: { model: 'Der Unterricht beginnt um neun Uhr.', accepted: ['Der Unterricht beginnt um 9 Uhr.', 'Der Unterricht fängt um neun Uhr an.', 'Die Stunde beginnt um neun Uhr.', 'Der Kurs beginnt um neun Uhr.'], explanation: '"um neun Uhr" = at nine o\'clock; "beginnt" = starts. "der Unterricht" is the class (lesson time); "die Klasse" means the group of students.' },
            i3: { model: 'Ich habe mein Buch zu Hause vergessen.', accepted: ['Ich habe mein Buch zuhause vergessen.', 'Ich habe mein Buch daheim vergessen.', 'Ich hab mein Buch zu Hause vergessen.'], explanation: '"Ich habe … vergessen" = I forgot (the perfect tense, with "vergessen" at the end); "zu Hause" = at home.' },
            i4: { model: 'Wie viel kostet das?', accepted: ['Was kostet das?', 'Wieviel kostet das?', 'Wie viel kostet das hier?', 'Was kostet das hier?'], explanation: '"wie viel" = how much; "kosten" = to cost. "Was kostet das?" (literally "What does that cost?") is the short everyday way to ask.' },
            i5: { model: 'Meine Prüfung ist nächste Woche.', accepted: ['Nächste Woche ist meine Prüfung.', 'Ich habe nächste Woche meine Prüfung.', 'Meine Prüfung findet nächste Woche statt.'], explanation: '"nächste Woche" = next week. "Prüfung" is feminine, so "my" is "meine".' },
            i6: { model: 'Können Sie mir helfen?', accepted: ['Kannst du mir helfen?', 'Könnten Sie mir helfen?', 'Können Sie mir bitte helfen?', 'Kannst du mir bitte helfen?'], explanation: '"Können Sie" = can you (polite; to a friend: "kannst du"). "helfen" takes "mir" (to me), not "mich", and goes to the end.' },
            q1: { model: 'Wir gehen in die Bibliothek.', accepted: ['Wir gehen zur Bibliothek.', 'Wir gehen gerade in die Bibliothek.', 'Wir gehen in die Bücherei.'], explanation: '"die Bibliothek" = the library; "wir gehen" = we are going (German has no "-ing" form). A bookshop is "die Buchhandlung".' },
            q2: { model: 'Sie spricht sehr gut Kannada.', accepted: ['Sie spricht Kannada sehr gut.'], explanation: '"sehr gut" = very well (German uses "gut" for both "good" and "well"). "spricht" is the "she" form of "sprechen" (speak).' },
            q3: { model: 'Verschwenden Sie kein Wasser.', accepted: ['Verschwende kein Wasser.', 'Verschwendet kein Wasser.', 'Kein Wasser verschwenden.'], explanation: '"kein" = no, not any (before a noun); "verschwenden Sie" is the polite form, "verschwende" the one for a friend. Signs often say "Kein Wasser verschwenden".' },
            q4: { model: 'Das Geschäft öffnet um zehn Uhr.', accepted: ['Das Geschäft öffnet um 10 Uhr.', 'Der Laden öffnet um zehn Uhr.', 'Das Geschäft öffnet um zehn.', 'Der Laden macht um zehn Uhr auf.'], explanation: '"öffnet" = opens. German usually adds "Uhr": "um zehn Uhr", where English can say just "at ten".' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'Die Besprechung wurde auf Montag verschoben.', explanation: '"wurde verschoben" is passive: "has been …" (or "was …"). "verschieben" = postpone; "auf Montag" = to Monday.' },
            i2: { source: 'Bitte senden Sie den Bericht bis Freitag.', explanation: 'With a task, "bis Freitag" means "by Friday" (not later than); "bis spätestens Freitag" makes it even clearer. "senden Sie" is the polite request form.' },
            i3: { source: 'Entschuldigen Sie die späte Antwort.', explanation: 'A common line in emails; "spät" = late, "die Antwort" = the reply.' },
            i4: { source: 'Unser Team hat das Projekt pünktlich abgeschlossen.', explanation: '"hat … abgeschlossen" = completed; "pünktlich" = on time.' },
            i5: { source: 'Ich habe letztes Jahr mein Studium abgeschlossen. Jetzt suche ich eine Stelle bei einem Softwareunternehmen. Ich interessiere mich sehr dafür, neue Dinge zu lernen.', explanation: 'Three sentences: a past action (ich habe … abgeschlossen), an action going on now (ich suche = I am looking for), and a feeling (ich interessiere mich für = I am interested in). Compare your tenses with the model.' },
            i6: { source: 'Vielen Dank für Ihre Zusammenarbeit.', explanation: '"die Zusammenarbeit" = cooperation (literally "working together"); "Vielen Dank für Ihre …" = thank you for your …' },
            q1: { source: 'Dieses Problem wird so schnell wie möglich gelöst.', explanation: '"wird … gelöst" is the passive; German often uses it for the future, so English says "will be solved". "so schnell wie möglich" = as soon as possible.' },
            q2: { source: 'Ich möchte mich auf diese Stelle bewerben.', explanation: '"Ich möchte" = I would like; "sich bewerben auf" (or "um") = apply for; "die Stelle" = post or position.' },
            q3: { source: 'Er hat in der Besprechung einen guten Vorschlag gemacht.', explanation: '"einen Vorschlag machen" = make or give a suggestion; "in der Besprechung" = in (or at) the meeting.' },
            q4: { source: 'Kundenzufriedenheit ist unsere oberste Priorität.', explanation: '"Kundenzufriedenheit" = customer satisfaction, one compound word (Kunde + Zufriedenheit); "oberste Priorität" = top or first priority.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'Das Unternehmen hat eine neue Richtlinie angekündigt.', accepted: ['Die Firma hat eine neue Richtlinie angekündigt.', 'Das Unternehmen hat eine neue Richtlinie bekannt gegeben.', 'Das Unternehmen hat eine neue Regelung angekündigt.', 'Die Firma hat eine neue Regelung bekannt gegeben.'], explanation: '"die Richtlinie" or "die Regelung" = policy (a rule); "Politik" usually means politics. "hat … angekündigt" = has announced.' },
            i2: { model: 'Bildung ist der Schlüssel zum Erfolg.', accepted: ['Die Bildung ist der Schlüssel zum Erfolg.', 'Bildung ist der Schlüssel für den Erfolg.'], explanation: '"Bildung" = education; "der Schlüssel zum Erfolg" = the key to success ("zum" = zu dem). Like English, German needs no article before an idea such as "Bildung".' },
            i3: { model: 'Bitte informieren Sie mich, falls es Änderungen gibt.', accepted: ['Bitte informieren Sie mich, wenn es Änderungen gibt.', 'Informieren Sie mich bitte, falls es eine Änderung gibt.', 'Bitte teilen Sie mir mit, falls sich etwas ändert.', 'Bitte geben Sie mir Bescheid, falls sich etwas ändert.'], explanation: '"falls" or "wenn" = if; in that part of the sentence the verb goes to the end: "falls es Änderungen gibt". As in English, the "if" part can come first or last.' },
            i4: { model: 'Wir sollten die Umwelt schützen.', accepted: ['Wir müssen die Umwelt schützen.', 'Wir sollen die Umwelt schützen.', 'Man sollte die Umwelt schützen.'], explanation: '"wir sollten" = we should, "wir müssen" = we must; the main verb "schützen" (protect) goes to the end.' },
            i5: { model: 'Unsere Hochschule hat letzte Woche eine Blutspendeaktion organisiert. Viele Studierende und Lehrkräfte haben daran teilgenommen. Die Ärzte haben sich bei allen für ihre Unterstützung bedankt.', accepted: [], explanation: '"eine Blutspendeaktion" = a blood donation camp; "teilnehmen" = take part. An Indian college is "Hochschule" (or "College") here. Compare your sentences with the model.' },
            i6: { model: 'Ich schreibe Ihnen, um zwei Tage Urlaub zu beantragen.', accepted: ['Hiermit beantrage ich zwei Tage Urlaub.', 'Ich schreibe, um zwei Tage Urlaub zu beantragen.', 'Ich schreibe Ihnen, um zwei Urlaubstage zu beantragen.', 'Ich schreibe Ihnen, um um zwei Tage Urlaub zu bitten.'], explanation: '"Urlaub" = leave; "beantragen" = request (formally apply for); "um … zu" + verb = to, in order to. A German request letter often begins "Hiermit beantrage ich …".' },
            q1: { model: 'Harte Arbeit zahlt sich immer aus.', accepted: ['Harte Arbeit lohnt sich immer.', 'Fleiß zahlt sich immer aus.', 'Fleiß lohnt sich immer.'], explanation: '"sich auszahlen" or "sich lohnen" = pay off (bring a good result); the "aus" of "auszahlen" goes to the end: "zahlt sich immer aus".' },
            q2: { model: 'Die Ergebnisse werden morgen bekannt gegeben.', accepted: ['Die Ergebnisse werden morgen bekanntgegeben.', 'Morgen werden die Ergebnisse bekannt gegeben.', 'Die Ergebnisse werden morgen veröffentlicht.', 'Die Ergebnisse werden morgen bekannt gegeben werden.'], explanation: '"werden … bekannt gegeben" is the passive ("are announced"); with "morgen" it means "will be announced". "die Ergebnisse" = the results.' },
            q3: { model: 'Vielen Dank für Ihre schnelle Antwort.', accepted: ['Danke für Ihre schnelle Antwort.', 'Vielen Dank für Ihre rasche Antwort.', 'Herzlichen Dank für Ihre schnelle Antwort.', 'Danke für deine schnelle Antwort.'], explanation: '"schnell" = quick and, as in English, comes before the noun, but takes an ending: "Ihre schnelle Antwort". "Ihre" with a capital I is the polite "your".' },
            q4: { model: 'Sicherheit liegt in der Verantwortung aller.', accepted: ['Sicherheit ist die Verantwortung aller.', 'Für Sicherheit sind alle verantwortlich.', 'Sicherheit geht alle an.', 'Sicherheit ist Sache aller.'], explanation: '"Sicherheit" = safety; "aller" (of all) = everyone\'s, with the owner after the noun. "Sicherheit geht alle an" (safety concerns everyone) is a common slogan.' }
        }
    },
    placement: {
        b4: { prompt: '"Buch" in English is…', explanation: '"Buch" means book.' },
        a5: { prompt: '"Die Besprechung wurde verschoben" best translates as…', explanation: '"verschieben" means postpone, and "wurde verschoben" is passive: "has been postponed".' }
    }
};
