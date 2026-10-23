/**
 * Linguistic Ability — French as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 *
 * French punctuation: a no-break space ( ) goes before ? and !, as French
 * writes it. Answers are compared without punctuation, so a student who types
 * "Comment allez-vous?" or "Comment allez-vous ?" is marked the same.
 */
module.exports = {
    code: 'fr', name: 'French', native: 'Français', locale: 'fr-FR',
    words: {
        'vocab-beginner-1': {
            family: 'famille',
            mother: 'mère',
            father: 'père',
            house: 'maison',
            food: 'nourriture',
            happy: 'heureux, content',
            big: 'grand, gros',
            small: 'petit'
        },
        'vocab-beginner-2': {
            book: 'livre',
            teacher: 'professeur, enseignant',
            student: 'élève, étudiant',
            friend: 'ami, amie',
            read: 'lire',
            write: 'écrire',
            early: 'tôt',
            easy: 'facile'
        },
        'vocab-intermediate-1': {
            honest: 'honnête',
            polite: 'poli',
            curious: 'curieux',
            confident: 'sûr de soi',
            patient: 'patient',
            grateful: 'reconnaissant',
            anxious: 'anxieux, inquiet',
            generous: 'généreux'
        },
        'vocab-intermediate-2': {
            deadline: 'date limite',
            improve: 'améliorer',
            achieve: 'atteindre, réaliser',
            schedule: 'calendrier, horaire',
            opportunity: 'occasion, opportunité',
            responsible: 'responsable',
            discuss: 'discuter',
            result: 'résultat'
        },
        'vocab-advanced-1': {
            negotiate: 'négocier',
            collaborate: 'collaborer',
            efficient: 'efficace',
            feasible: 'faisable, réalisable',
            comprehensive: 'complet, exhaustif',
            prioritise: 'prioriser',
            ambiguous: 'ambigu',
            persuade: 'persuader, convaincre'
        },
        'vocab-advanced-2': {
            sustainable: 'durable',
            consequence: 'conséquence',
            perspective: 'point de vue',
            inevitable: 'inévitable',
            substantial: 'considérable',
            advocate: 'préconiser, recommander',
            diverse: 'divers, varié',
            integrity: 'intégrité'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'French has articles too, but uses them differently. English has no gender, so "a" and "the" go with every noun. English needs "a" before a job ("I am a student" — "Je suis étudiant"), but no article for things in general ("Dogs are loyal" — "Les chiens sont fidèles").'
        },
        'grammar-beginner-2': {
            points: {
                4: 'French uses the same order as English, Subject → Verb → Object: "Ravi lit des livres." But French puts object pronouns before the verb ("Il m\'appelle"), while English puts them after: "He calls me."'
            }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each French word or sentence into English.',
            points: [
                'French word order is close to English: "Je vais à l\'école" = "I go to school." But most French adjectives come after the noun, and English ones before it: "une maison blanche" = "a white house".',
                'Both languages have articles, but they are not always used the same way: "Je suis étudiant" = "I am a student" (add "a"); "J\'aime les mangues" = "I like mangoes" (drop "les").',
                'Watch the tense: "je vais" can mean "I go" or "I am going"; "je suis allé" = "I went" or "I have gone"; "j\'irai" = "I will go".',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into French.',
            points: [
                'The word order is mostly the same: "I go to school" → "Je vais à l\'école". But most adjectives come after the noun: "a red bag" → "un sac rouge".',
                'French has articles too, and uses them even more than English. Choose them by gender (un/le livre, une/la maison) and add one where English has none: "I like mangoes" → "J\'aime les mangues".',
                'Choose the polite form for elders, teachers and strangers: vous, venez, donnez. With friends and family you may use tu, viens, donne.',
                'Type in French with your phone\'s French keyboard (press and hold a letter such as e to get é, è or ê), or use the letter keys under the answer box. Accents matter: "a" (has) is not "à" (to).'
            ]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the French verb ending to choose the English tense.',
            points: [
                'French word order is close to English: "Je vais à l\'école" = "I go to school." But most French adjectives come after the noun, and English ones before it: "une maison blanche" = "a white house".',
                'Both languages have articles, but they are not always used the same way: "Je suis étudiant" = "I am a student" (add "a"); "J\'aime les mangues" = "I like mangoes" (drop "les").',
                'Watch the tense: "je vais" = I go or I am going; "j\'ai regardé" = I watched; "j\'irai" = I will go. With "depuis" French uses the present ("J\'habite ici depuis deux ans"), but English says "I have been living here for two years".',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural French. Use the polite vous form for requests.',
            points: [
                'The word order is mostly the same, but "ne … pas" goes around the verb ("Do not waste water" → "Ne gaspillez pas l\'eau") and object pronouns come before it ("Can you help me?" → "Pouvez-vous m\'aider ?").',
                'French has articles too, and uses them even more than English. Choose them by gender (un/le livre, une/la maison) and add one where English has none: "next week" → "la semaine prochaine".',
                'Choose the polite form for elders, teachers and strangers: vous, venez, donnez. With friends and family you may use tu, viens, donne.',
                'Type in French with your phone\'s French keyboard (press and hold a letter such as e to get é, è or ê), or use the letter keys under the answer box. Accents matter: "a" (has) is not "à" (to).'
            ]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "La réunion a été reportée" = "The meeting has been postponed."',
            points: [
                'French word order is close to English: "Je vais à l\'école" = "I go to school." But most French adjectives come after the noun, and English ones before it: "une maison blanche" = "a white house".',
                'Both languages have articles, but they are not always used the same way: "Je suis étudiant" = "I am a student" (add "a"); "J\'aime les mangues" = "I like mangoes" (drop "les").',
                'Watch the tense and the passive: "a été reportée" = has been postponed; "sera résolu" = will be solved. A French sentence with "on" often reads best as an English passive: "On annoncera les résultats" = "The results will be announced."',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal French. Passive forms such as "seront annoncés" (will be announced) are common in notices, and "Veuillez …" is the formal "please".',
            points: [
                'The word order is mostly the same as English, but adjectives usually follow the noun ("une réponse rapide" = a quick response) and object pronouns come before the verb ("Veuillez m\'informer" = please inform me).',
                'French has articles too, and uses them even more than English. Choose them by gender (un/le livre, une/la maison) and add one where English has none: "Education is the key to success" → "L\'éducation est la clé de la réussite".',
                'In formal writing always use vous: "Je vous écris pour …", "Veuillez …", "Je vous remercie de …". Keep tu for friends and family.',
                'Type in French with your phone\'s French keyboard (press and hold a letter such as e to get é, è or ê), or use the letter keys under the answer box. Accents matter: "a" (has) is not "à" (to).'
            ]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'eau', explanation: '"eau" means water. With the article it is "l\'eau" (the water).' },
            i2: { source: 'livre', explanation: '"livre" means book; "un livre" = a book.' },
            i3: { source: 'Je m\'appelle Rani.', explanation: '"Je m\'appelle" (literally "I call myself") is how French gives a name. In English say "My name is …" or "I am …".' },
            i4: { source: 'Comment allez-vous ?', explanation: 'This is the polite greeting (to a friend: "Comment vas-tu ?"). English needs "are": How are you?' },
            i5: { source: 'Je vais bien.', explanation: '"Je vais bien" (literally "I go well") means "I am fine". English uses "am", not "go".' },
            i6: { source: 'C\'est ma maison.', explanation: '"C\'est" = this is or it is; "ma maison" = my house ("ma" because "maison" is feminine). English has no gender for "my".' },
            q1: { source: 'Je vais à l\'école.', explanation: '"Je vais" can mean "I go" or "I am going". English says "to school", with no word for "l\'" (the).' },
            q2: { source: 'Elle est ma petite sœur.', explanation: '"petite sœur" (little sister) is a younger sister; an elder sister is "grande sœur".' },
            q3: { source: 'Fermez la porte, s\'il vous plaît.', explanation: '"s\'il vous plaît" = please, "la porte" = the door, "fermez" = close (polite; to a friend: "ferme").' },
            q4: { source: 'Merci.', explanation: '"Merci" means thank you; "merci beaucoup" = thank you very much.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'ami', accepted: ['amie', 'un ami', 'une amie', 'copain'], explanation: 'Friend is "ami" (for a girl, "amie"); "copain" or "copine" is more casual.' },
            i2: { model: 'école', accepted: ['l\'école', 'une école'], explanation: 'School is "école", a feminine noun: une école, l\'école.' },
            i3: { model: 'Bonjour.', accepted: [], explanation: '"Bonjour" is the greeting for the whole morning and afternoon; French has no separate word for "good morning".' },
            i4: { model: 'Je suis étudiant.', accepted: ['Je suis étudiante.', 'Je suis élève.', 'Je suis un étudiant.'], explanation: 'French usually drops "a" before a job or role: "Je suis étudiant" (a girl says "étudiante"). "Je suis" = I am.' },
            i5: { model: 'Comment vous appelez-vous ?', accepted: ['Comment tu t\'appelles ?', 'Comment t\'appelles-tu ?', 'Quel est votre nom ?', 'Quel est ton nom ?'], explanation: '"Comment vous appelez-vous ?" is polite (literally "How do you call yourself?"); with a friend, "Comment tu t\'appelles ?".' },
            i6: { model: 'La nourriture est délicieuse.', accepted: ['Le repas est délicieux.', 'La nourriture est bonne.', 'Le repas est bon.'], explanation: '"délicieux" = tasty. The adjective agrees with the noun: "la nourriture" is feminine, so "délicieuse".' },
            q1: { model: 'Où est l\'arrêt de bus ?', accepted: ['Où se trouve l\'arrêt de bus ?', 'Où est la gare routière ?', 'Où est l\'arrêt d\'autobus ?'], explanation: '"Où" = where; "Où est … ?" = where is …? A big bus station is "la gare routière".' },
            q2: { model: 'J\'aime les mangues.', accepted: ['J\'aime bien les mangues.', 'Moi, j\'aime les mangues.'], explanation: '"J\'aime" = I like. French needs the article "les" here, where English says just "mangoes".' },
            q3: { model: 'Venez ici.', accepted: ['Viens ici.'], explanation: '"Venez" is polite (or for several people); "viens" is used with friends and children.' },
            q4: { model: 'Il pleut.', accepted: [], explanation: 'French says "Il pleut" (it rains), from "pleuvoir"; there is no "-ing" form, so "it is raining" is one short verb.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'J\'ai regardé un film hier.', explanation: '"J\'ai regardé" is the passé composé (past): watched. "un film" = a movie, "hier" = yesterday.' },
            i2: { source: 'Il court tous les matins.', explanation: 'A habit takes the simple present: "il court" = he runs. "tous les matins" = every morning.' },
            i3: { source: 'Nous irons à Mysuru demain.', explanation: '"Nous irons" is the future of "aller": we will go. "demain" = tomorrow.' },
            i4: { source: 'Elle est en train de lire un livre.', explanation: '"être en train de" + verb shows an action happening now: is reading.' },
            i5: { source: 'Les enfants jouent sur le terrain de jeux.', explanation: '"le terrain de jeux" = the ground or playground; "jouent" = are playing (the French present covers both "play" and "are playing").' },
            i6: { source: 'Avez-vous mangé ?', explanation: 'A polite question about eating (to a friend: "Tu as mangé ?"). "Have you eaten?" is just as natural.' },
            q1: { source: 'J\'aime parler anglais.', explanation: '"J\'aime" + verb = I like to … ("anglais" = English; French writes languages without a capital).' },
            q2: { source: 'Ils habitent à Bengaluru depuis deux ans.', explanation: 'French uses the present with "depuis" (ils habitent … depuis deux ans); English needs the present perfect continuous: have been living … for.' },
            q3: { source: 'Le train est arrivé à l\'heure.', explanation: '"à l\'heure" = on time; "est arrivé" = came or arrived.' },
            q4: { source: 'Parlez lentement, s\'il vous plaît.', explanation: '"lentement" = slowly; "parlez" is the polite request form of "parler" (speak).' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'Donnez-moi de l\'eau, s\'il vous plaît.', accepted: ['Donne-moi de l\'eau, s\'il te plaît.', 'S\'il vous plaît, donnez-moi de l\'eau.', 'Donnez-moi un peu d\'eau, s\'il vous plaît.', 'Pouvez-vous me donner de l\'eau, s\'il vous plaît ?'], explanation: '"Donnez-moi" is the polite form of "give me" (to a friend: "donne-moi"); "de l\'eau" = some water.' },
            i2: { model: 'Le cours commence à neuf heures.', accepted: ['Le cours commence à 9 heures.', 'Le cours commence à 9 h.', 'La classe commence à neuf heures.'], explanation: '"à neuf heures" = at nine o\'clock; "commence" = starts.' },
            i3: { model: 'J\'ai oublié mon livre à la maison.', accepted: ['J\'ai oublié mon livre chez moi.'], explanation: '"J\'ai oublié" = I forgot (passé composé); "à la maison" or "chez moi" = at home.' },
            i4: { model: 'Combien ça coûte ?', accepted: ['Ça coûte combien ?', 'C\'est combien ?', 'Combien coûte ceci ?', 'Combien cela coûte-t-il ?'], explanation: '"combien" = how much; "coûter" = to cost. "C\'est combien ?" is the short everyday way to ask.' },
            i5: { model: 'Mon examen est la semaine prochaine.', accepted: ['Mon examen a lieu la semaine prochaine.', 'J\'ai mon examen la semaine prochaine.'], explanation: '"la semaine prochaine" = next week. French adds the article "la", which English leaves out.' },
            i6: { model: 'Pouvez-vous m\'aider ?', accepted: ['Vous pouvez m\'aider ?', 'Est-ce que vous pouvez m\'aider ?', 'Peux-tu m\'aider ?', 'Tu peux m\'aider ?'], explanation: '"Pouvez-vous" = can you (polite; to a friend: "peux-tu"). In "m\'aider" (help me) the pronoun comes before the verb.' },
            q1: { model: 'Nous allons à la bibliothèque.', accepted: ['On va à la bibliothèque.'], explanation: '"la bibliothèque" = the library; "nous allons" = we are going. Careful: "librairie" means bookshop.' },
            q2: { model: 'Elle parle très bien le kannada.', accepted: ['Elle parle le kannada très bien.', 'Elle parle très bien kannada.'], explanation: '"très bien" = very well and usually comes right after the verb. Languages take no capital in French: le kannada.' },
            q3: { model: 'Ne gaspillez pas l\'eau.', accepted: ['Ne gaspille pas l\'eau.', 'Ne gaspillez pas d\'eau.'], explanation: '"ne … pas" around the verb = do not; "gaspillez" is the polite (or plural) form, "gaspille" the one for a friend.' },
            q4: { model: 'Le magasin ouvre à dix heures.', accepted: ['Le magasin ouvre à 10 heures.', 'Le magasin ouvre à 10 h.', 'La boutique ouvre à dix heures.'], explanation: '"ouvre" = opens. French needs "heures": "à dix heures", where English can say just "at ten".' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'La réunion a été reportée à lundi.', explanation: '"a été reportée" is passive: "has been …". "reporter" = postpone; "lundi" = Monday.' },
            i2: { source: 'Veuillez envoyer le rapport d\'ici vendredi.', explanation: '"Veuillez" is the formal "please" (kindly); "d\'ici vendredi" means "by Friday" (not later than).' },
            i3: { source: 'Désolé pour ma réponse tardive.', explanation: 'A common line in emails; "tardive" = late.' },
            i4: { source: 'Notre équipe a terminé le projet à temps.', explanation: '"a terminé" = completed; "à temps" = on time.' },
            i5: { source: 'J\'ai obtenu mon diplôme l\'année dernière. Maintenant, je cherche un emploi dans une entreprise de logiciels. Apprendre de nouvelles choses m\'intéresse beaucoup.', explanation: 'Three sentences: a past action (j\'ai obtenu), an action going on now (je cherche = I am looking for), and a feeling. Compare your tenses with the model.' },
            i6: { source: 'Merci de votre coopération.', explanation: '"coopération" = cooperation; "Merci de votre …" = thank you for your …' },
            q1: { source: 'Ce problème sera résolu dans les plus brefs délais.', explanation: '"sera résolu" is the future passive: "will be …". "dans les plus brefs délais" is a formal "as soon as possible".' },
            q2: { source: 'Je souhaiterais postuler à ce poste.', explanation: '"Je souhaiterais" = I would like (formal); "postuler à" = apply for; "poste" = post or position.' },
            q3: { source: 'Il a fait une bonne suggestion lors de la réunion.', explanation: '"faire une suggestion" = make or give a suggestion; "lors de la réunion" = in (or at) the meeting.' },
            q4: { source: 'La satisfaction client est notre première priorité.', explanation: '"satisfaction client" = customer satisfaction; "priorité" = priority. French puts the main noun first.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'L\'entreprise a annoncé une nouvelle politique.', accepted: ['La société a annoncé une nouvelle politique.', 'L\'entreprise a annoncé une nouvelle mesure.', 'L\'entreprise vient d\'annoncer une nouvelle politique.'], explanation: '"politique" here = policy; "a annoncé" (passé composé) = has announced.' },
            i2: { model: 'L\'éducation est la clé de la réussite.', accepted: ['L\'éducation est la clé du succès.', 'L\'éducation est la clef de la réussite.', 'L\'éducation est la clef du succès.'], explanation: '"la réussite" or "le succès" = success; "la clé de" = the key to. French puts "l\'" before "éducation", where English has no article.' },
            i3: { model: 'Veuillez m\'informer en cas de changement.', accepted: ['Veuillez m\'informer s\'il y a un changement.', 'Merci de m\'informer s\'il y a un changement.', 'Veuillez me prévenir en cas de changement.', 'Prévenez-moi s\'il y a le moindre changement.'], explanation: '"Veuillez" = please (formal); "en cas de changement" = if there is any change. As in English, the "if" part can come first or last.' },
            i4: { model: 'Nous devons protéger l\'environnement.', accepted: ['Nous devrions protéger l\'environnement.', 'On doit protéger l\'environnement.', 'Il faut protéger l\'environnement.'], explanation: '"devoir" = should or must: "nous devons" (we must), "nous devrions" (we should).' },
            i5: { model: 'Notre université a organisé une collecte de sang la semaine dernière. De nombreux étudiants et enseignants y ont participé. Les médecins les ont tous remerciés pour leur soutien.', accepted: [], explanation: '"une collecte de sang" = a blood donation camp; "participer" = take part. A French "collège" is a secondary school, so an Indian college is "université" here. Compare your sentences with the model.' },
            i6: { model: 'Je vous écris pour demander un congé de deux jours.', accepted: ['Je vous écris afin de demander un congé de deux jours.', 'Je vous écris pour solliciter un congé de deux jours.', 'J\'écris pour demander un congé de deux jours.'], explanation: '"un congé" = leave; "demander" or, more formally, "solliciter" = request. A French letter says "Je vous écris" (I am writing to you).' },
            q1: { model: 'Le travail acharné finit toujours par payer.', accepted: ['Le travail acharné paie toujours.', 'Le travail finit toujours par payer.', 'Les efforts finissent toujours par payer.', 'Le travail paie toujours.'], explanation: '"payer" also means "pay off" (bring a good result); "finit toujours par payer" = always pays off in the end.' },
            q2: { model: 'Les résultats seront annoncés demain.', accepted: ['Les résultats seront publiés demain.', 'On annoncera les résultats demain.'], explanation: '"seront annoncés" is the future passive: will be announced. The participle agrees with "les résultats": annoncés.' },
            q3: { model: 'Merci pour votre réponse rapide.', accepted: ['Merci de votre réponse rapide.', 'Je vous remercie de votre réponse rapide.', 'Merci pour votre prompte réponse.', 'Je vous remercie pour votre réponse rapide.'], explanation: '"rapide" = quick and comes after the noun: "réponse rapide". "Je vous remercie" is more formal than "Merci".' },
            q4: { model: 'La sécurité est la responsabilité de tous.', accepted: ['La sécurité est l\'affaire de tous.', 'La sécurité est la responsabilité de chacun.', 'La sécurité, c\'est l\'affaire de tous.'], explanation: '"la sécurité" = safety; "de tous" (of all) = everyone\'s, since French has no "\'s".' }
        }
    },
    placement: {
        b4: { prompt: '"livre" in English is…', explanation: '"livre" means book.' },
        a5: { prompt: '"La réunion a été reportée" best translates as…', explanation: '"reporter" means postpone, and "a été reportée" is passive: "has been postponed".' }
    }
};
