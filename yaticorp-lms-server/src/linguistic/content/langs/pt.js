/**
 * Linguistic Ability — Portuguese (Brazilian) as the student's own language:
 * word meanings, tips and translation exercises, matched to the Kannada
 * content by lesson (seedKey) and item id. English answers and questions stay
 * as they are.
 *
 * Models use "você" (or "o senhor" / "a senhora") and the polite command
 * forms (venha, fale, me dê); everyday forms such as "vem" and "me dá" are
 * among the accepted answers.
 */
module.exports = {
    code: 'pt', name: 'Portuguese', native: 'Português', locale: 'pt-BR',
    words: {
        'vocab-beginner-1': {
            family: 'família',
            mother: 'mãe',
            father: 'pai',
            house: 'casa',
            food: 'comida',
            happy: 'feliz, contente',
            big: 'grande',
            small: 'pequeno'
        },
        'vocab-beginner-2': {
            book: 'livro',
            teacher: 'professor, professora',
            student: 'aluno, estudante',
            friend: 'amigo, amiga',
            read: 'ler',
            write: 'escrever',
            early: 'cedo',
            easy: 'fácil'
        },
        'vocab-intermediate-1': {
            honest: 'honesto',
            polite: 'educado, gentil',
            curious: 'curioso',
            confident: 'confiante, seguro',
            patient: 'paciente',
            grateful: 'grato, agradecido',
            anxious: 'ansioso, preocupado',
            generous: 'generoso'
        },
        'vocab-intermediate-2': {
            deadline: 'prazo, data limite',
            improve: 'melhorar',
            achieve: 'alcançar, conseguir',
            schedule: 'cronograma, calendário',
            opportunity: 'oportunidade',
            responsible: 'responsável',
            discuss: 'discutir, conversar sobre',
            result: 'resultado'
        },
        'vocab-advanced-1': {
            negotiate: 'negociar',
            collaborate: 'colaborar',
            efficient: 'eficiente',
            feasible: 'viável, factível',
            comprehensive: 'abrangente, completo',
            prioritise: 'priorizar',
            ambiguous: 'ambíguo',
            persuade: 'persuadir, convencer'
        },
        'vocab-advanced-2': {
            sustainable: 'sustentável',
            consequence: 'consequência',
            perspective: 'ponto de vista',
            inevitable: 'inevitável',
            substantial: 'considerável, substancial',
            advocate: 'defender, recomendar',
            diverse: 'diverso, variado',
            integrity: 'integridade'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Portuguese has articles too (um, uma, o, a, os, as), but English ones have no gender: "a" and "the" go with every noun. English needs "a" before a job ("I am a student" — "Sou estudante"), but no article for things in general ("Dogs are loyal" — "Os cachorros são leais"). Careful: the Portuguese "a" means "the"; the English "a" is "um" or "uma".'
        },
        'grammar-beginner-2': {
            points: {
                4: 'Portuguese uses the same order as English, Subject → Verb → Object: "Ravi lê livros." But Portuguese often leaves out the subject ("Leio livros"), and in Brazil object pronouns usually come before the verb ("Ele me chama"). English always needs the subject and puts the pronoun after the verb: "I read books", "He calls me."'
            }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Portuguese word or sentence into English.',
            points: [
                'Portuguese word order is close to English: "Eu vou à escola" = "I go to school." But English always needs the subject ("vou" alone = "I go"), and puts adjectives before the noun: "uma casa branca" = "a white house".',
                'Both languages have articles, but they are not always used the same way: "Sou estudante" = "I am a student" (add "a"); "O tempo é dinheiro" = "Time is money" (drop "o"). Portuguese "ser" and "estar" are both "be" in English: am, is, are.',
                'Watch the tense: "vou" can mean "I go" or "I am going"; "fui" = "I went"; "irei" = "I will go". In speech Brazilians make the future with "vou" + verb: "vou viajar" = "I will travel" or "I am going to travel".',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Portuguese.',
            points: [
                'The word order is mostly the same: "I go to school" → "Eu vou à escola" (you may leave out "eu"). But most adjectives come after the noun: "a red bag" → "uma bolsa vermelha".',
                'Portuguese has articles too, and uses them more than English. Choose them by gender (um/o livro, uma/a casa) and add one where English has none: "India is big" → "A Índia é grande".',
                'Brazilians say "você" for "you"; to elders, teachers and strangers it is more polite to say "o senhor" (to a man) or "a senhora" (to a woman). Polite requests: venha, me dê. With friends and family you may say vem, me dá.',
                'Type in Portuguese with your phone\'s Portuguese keyboard (press and hold a letter such as a to get á, â, ã or à, or c to get ç), or use the letter keys under the answer box. Accents matter: "e" (and) is not "é" (is).'
            ]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Portuguese verb ending to choose the English tense.',
            points: [
                'Portuguese word order is close to English: "Eu vou à escola" = "I go to school." But English always needs the subject ("vou" alone = "I go"), and puts adjectives before the noun: "uma casa branca" = "a white house".',
                'Both languages have articles, but they are not always used the same way: "Sou estudante" = "I am a student" (add "a"); "O tempo é dinheiro" = "Time is money" (drop "o"). Portuguese "ser" and "estar" are both "be" in English: am, is, are.',
                'Watch the tense: "vou" = I go or I am going; "assisti" = I watched; "vou" + verb or "irei" = I will go. With "há" + a time Portuguese uses the present ("Moro aqui há dois anos"), but English says "I have been living here for two years".',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Portuguese. Use the polite form for requests.',
            points: [
                'The word order is mostly the same, but "não" goes before the verb ("Do not waste water" → "Não desperdice água") and in Brazil object pronouns usually come before the verb too ("Can you help me?" → "Você pode me ajudar?").',
                'Portuguese has articles too, and uses them more than English. Choose them by gender (um/o livro, uma/a casa) and add one where English has none: "next week" → "na próxima semana" (na = em + a, "in the").',
                'Brazilians say "você" for "you"; to elders, teachers and strangers it is more polite to say "o senhor" (to a man) or "a senhora" (to a woman). Polite requests: venha, me dê. With friends and family you may say vem, me dá.',
                'Type in Portuguese with your phone\'s Portuguese keyboard (press and hold a letter such as a to get á, â, ã or à, or c to get ç), or use the letter keys under the answer box. Accents matter: "e" (and) is not "é" (is).'
            ]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "A reunião foi adiada" = "The meeting has been postponed."',
            points: [
                'Portuguese word order is close to English: "Eu vou à escola" = "I go to school." But English always needs the subject ("vou" alone = "I go"), and puts adjectives before the noun: "uma casa branca" = "a white house".',
                'Both languages have articles, but they are not always used the same way: "Sou estudante" = "I am a student" (add "a"); "O tempo é dinheiro" = "Time is money" (drop "o"). Portuguese "ser" and "estar" are both "be" in English: am, is, are.',
                'Watch the tense and the passive: Portuguese uses the simple past "foi" where English often says "has been": "foi adiada" = has been postponed; "será resolvido" = will be solved; "serão divulgados" = will be announced.',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Portuguese. Passive forms such as "serão divulgados" (will be announced) are common in notices, and "Por gentileza" or "Peço que …" are formal ways to say "please".',
            points: [
                'The word order is mostly the same as English, but adjectives usually follow the noun ("uma resposta rápida" = a quick response) and object pronouns usually come before the verb ("Peço que me informe" = please inform me).',
                'Portuguese has articles too, and uses them more than English. Choose them by gender (um/o livro, uma/a casa) and add one where English has none: "Education is the key to success" → "A educação é a chave do sucesso".',
                'In formal writing say "o senhor" or "a senhora" for "you", or use set phrases: "Prezado senhor", "Escrevo para solicitar …", "Agradeço desde já …". Keep "tu" and casual words for friends and family.',
                'Type in Portuguese with your phone\'s Portuguese keyboard (press and hold a letter such as a to get á, â, ã or à, or c to get ç), or use the letter keys under the answer box. Accents matter: "e" (and) is not "é" (is).'
            ]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'água', explanation: '"água" means water; "a água" = the water (a feminine noun).' },
            i2: { source: 'livro', explanation: '"livro" means book; "um livro" = a book.' },
            i3: { source: 'Meu nome é Rani.', explanation: '"meu" = my, "nome" = name, "é" = is. "Eu me chamo Rani" (literally "I call myself Rani") says the same.' },
            i4: { source: 'Como você está?', explanation: 'The common greeting ("Tudo bem?" and "Como vai?" are also used). English needs "are": How are you?' },
            i5: { source: 'Estou bem.', explanation: '"Estou" = I am (from "estar", used for how you feel); "bem" = well or fine.' },
            i6: { source: 'Esta é a minha casa.', explanation: '"Esta é" = this is; "a minha casa" = my house. Portuguese can put "a" (the) before "minha" (my); English never does.' },
            q1: { source: 'Eu vou à escola.', explanation: '"Eu vou" can mean "I go" or "I am going". "à" is "a" (to) + "a" (the); English says just "to school".' },
            q2: { source: 'Ela é a minha irmã mais nova.', explanation: '"irmã mais nova" = younger sister; an elder sister is "irmã mais velha".' },
            q3: { source: 'Feche a porta, por favor.', explanation: '"por favor" = please, "a porta" = the door, "feche" = close (polite; with friends you may hear "fecha").' },
            q4: { source: 'Obrigado.', explanation: '"Obrigado" means thank you (a woman says "obrigada"); "muito obrigado" = thank you very much.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'amigo', accepted: ['amiga', 'um amigo', 'uma amiga'], explanation: 'Friend is "amigo" (for a girl, "amiga").' },
            i2: { model: 'escola', accepted: ['a escola', 'uma escola', 'colégio'], explanation: 'School is "escola", a feminine noun: uma escola, a escola. Many schools are also called "colégio".' },
            i3: { model: 'Bom dia.', accepted: [], explanation: '"Bom dia" (literally "good day") is said until midday; after that, "boa tarde".' },
            i4: { model: 'Eu sou estudante.', accepted: ['Sou estudante.', 'Eu sou aluno.', 'Eu sou aluna.', 'Sou aluno.'], explanation: 'Portuguese usually drops "a" before a job or role: "Eu sou estudante". "Sou" = I am (from "ser"); "eu" (I) can be left out.' },
            i5: { model: 'Qual é o seu nome?', accepted: ['Qual é seu nome?', 'Como você se chama?', 'Como o senhor se chama?', 'Qual é o teu nome?'], explanation: '"Qual é o seu nome?" is the usual question; "Como você se chama?" (how do you call yourself?) means the same. To an elder: "Como o senhor se chama?".' },
            i6: { model: 'A comida está gostosa.', accepted: ['A comida está deliciosa.', 'A comida está boa.', 'A comida é gostosa.'], explanation: '"gostosa" = tasty. Portuguese uses "estar" for how food tastes now, and the adjective agrees with "a comida" (feminine): gostosa.' },
            q1: { model: 'Onde fica o ponto de ônibus?', accepted: ['Onde é o ponto de ônibus?', 'Onde está o ponto de ônibus?', 'Onde fica a rodoviária?', 'Onde é a rodoviária?'], explanation: '"Onde" = where; "Onde fica …?" = where is …? (for places). A bus stop is "o ponto de ônibus"; a big bus station is "a rodoviária".' },
            q2: { model: 'Eu gosto de manga.', accepted: ['Gosto de manga.', 'Eu gosto de mangas.', 'Gosto de mangas.'], explanation: '"gostar de" = to like, always with "de". For a fruit or food in general Brazilians often use the singular: "Eu gosto de manga".' },
            q3: { model: 'Venha aqui.', accepted: ['Vem aqui.', 'Venha cá.', 'Vem cá.'], explanation: '"Venha" is polite; with friends and children Brazilians say "vem".' },
            q4: { model: 'Está chovendo.', accepted: [], explanation: 'Portuguese needs no word for "it": "Está chovendo" = is raining, from "chover" (to rain).' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'Eu assisti a um filme ontem.', explanation: '"assisti" is the past of "assistir" (watch): watched. "um filme" = a movie, "ontem" = yesterday. "Eu vi um filme" (I saw a movie) says the same.' },
            i2: { source: 'Ele corre todas as manhãs.', explanation: 'A habit takes the simple present: "ele corre" = he runs. "todas as manhãs" = every morning.' },
            i3: { source: 'Nós vamos para Mysuru amanhã.', explanation: '"vamos" with "amanhã" (tomorrow) shows the future: will go. "Iremos" is the more formal future.' },
            i4: { source: 'Ela está lendo um livro.', explanation: '"estar" + the -ndo form ("está lendo") shows an action happening now: is reading.' },
            i5: { source: 'As crianças estão brincando no campo.', explanation: '"no campo" = in the ground or field (no = em + o); "estão brincando" = are playing. Children "brincam"; "jogar" is for games and sports.' },
            i6: { source: 'Você já comeu?', explanation: '"Você já comeu?" (literally "Have you already eaten?") is a friendly question about eating. "Have you eaten?" is just as natural.' },
            q1: { source: 'Eu gosto de falar inglês.', explanation: '"gostar de" + verb = like to … ("inglês" = English; Portuguese writes languages without a capital).' },
            q2: { source: 'Eles moram em Bengaluru há dois anos.', explanation: 'Portuguese uses the present with "há" + a time (eles moram … há dois anos); English needs the present perfect continuous: have been living … for.' },
            q3: { source: 'O trem chegou no horário.', explanation: '"no horário" = on time; "chegou" = came or arrived.' },
            q4: { source: 'Fale devagar, por favor.', explanation: '"devagar" = slowly; "fale" is the polite request form of "falar" (speak).' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'Por favor, me dê um pouco de água.', accepted: ['Por favor, me dê água.', 'Me dá um pouco de água, por favor.', 'Dê-me um pouco de água, por favor.', 'Você pode me dar um pouco de água, por favor?'], explanation: '"me dê" is the polite "give me" (with friends: "me dá"); "um pouco de água" = some water.' },
            i2: { model: 'A aula começa às nove horas.', accepted: ['A aula começa às nove.', 'A aula começa às 9 horas.', 'A aula começa às 9h.', 'A aula começa às 9.'], explanation: '"às nove horas" = at nine o\'clock (às = a + as); "começa" = starts. A class (lesson) is "aula"; "classe" is the group of students.' },
            i3: { model: 'Eu esqueci o meu livro em casa.', accepted: ['Esqueci meu livro em casa.', 'Eu esqueci meu livro em casa.', 'Esqueci o meu livro em casa.', 'Esqueci o livro em casa.'], explanation: '"esqueci" = I forgot (from "esquecer"); "em casa" = at home, with no article.' },
            i4: { model: 'Quanto custa isso?', accepted: ['Quanto custa isto?', 'Quanto é isso?', 'Quanto custa?', 'Quanto é?'], explanation: '"quanto" = how much; "custa" = costs; "isso" or "isto" = this. "Quanto é?" is the short everyday way to ask.' },
            i5: { model: 'Minha prova é na semana que vem.', accepted: ['Minha prova é na próxima semana.', 'A minha prova é na semana que vem.', 'Meu exame é na semana que vem.', 'Meu exame é na próxima semana.'], explanation: '"na semana que vem" or "na próxima semana" = next week (na = em + a, "in the"). In Brazil a school or college exam is usually "prova".' },
            i6: { model: 'Você pode me ajudar?', accepted: ['Pode me ajudar?', 'Você poderia me ajudar?', 'O senhor pode me ajudar?', 'A senhora pode me ajudar?'], explanation: '"Você pode" = can you; to an elder, "O senhor (a senhora) pode …?". The pronoun "me" comes before "ajudar" (help).' },
            q1: { model: 'Nós estamos indo para a biblioteca.', accepted: ['Estamos indo para a biblioteca.', 'Nós vamos para a biblioteca.', 'Nós vamos à biblioteca.', 'Vamos à biblioteca.'], explanation: '"a biblioteca" = the library; "estamos indo" = are going. Careful: "livraria" means bookshop.' },
            q2: { model: 'Ela fala kannada muito bem.', accepted: ['Ela fala muito bem o kannada.', 'Ela fala muito bem kannada.', 'Fala kannada muito bem.', 'Ela fala canarês muito bem.'], explanation: '"muito bem" = very well and usually comes at the end. Languages take no capital in Portuguese: kannada (also called "canarês").' },
            q3: { model: 'Não desperdice água.', accepted: ['Não desperdice a água.', 'Não desperdicem água.', 'Não jogue água fora.', 'Não desperdiça água.'], explanation: '"não" before the verb = do not; "desperdice" is the polite command (with friends people often say "não desperdiça").' },
            q4: { model: 'A loja abre às dez.', accepted: ['A loja abre às 10.', 'A loja abre às dez horas.', 'A loja abre às 10h.'], explanation: '"abre" = opens; "às dez" = at ten (às = a + as, for "as horas", the hours).' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'A reunião foi adiada para segunda-feira.', explanation: '"foi adiada" is passive; Portuguese uses "foi" (was) where English often says "has been …". "adiar" = postpone; "segunda-feira" = Monday.' },
            i2: { source: 'Por favor, envie o relatório até sexta-feira.', explanation: '"até" with a day means "by" (not later than); "envie" is the polite form of "enviar" (send).' },
            i3: { source: 'Desculpe a demora em responder.', explanation: 'A common line in emails; "a demora" = the delay. "Desculpe pela resposta tardia" says the same.' },
            i4: { source: 'Nossa equipe concluiu o projeto no prazo.', explanation: '"concluiu" = completed; "no prazo" = on time (within the deadline).' },
            i5: { source: 'Eu me formei no ano passado. Agora estou procurando emprego em uma empresa de software. Tenho muito interesse em aprender coisas novas.', explanation: '"me formei" = I graduated (completed my degree). Three sentences: a past action (me formei), an action going on now (estou procurando = I am looking for), and a feeling. Compare your tenses with the model.' },
            i6: { source: 'Obrigado pela sua colaboração.', explanation: '"colaboração" (or "cooperação") = cooperation; "Obrigado pela sua …" = thank you for your … (pela = por + a).' },
            q1: { source: 'Este problema será resolvido o mais rápido possível.', explanation: '"será resolvido" is the future passive: "will be …". "o mais rápido possível" = as soon as possible.' },
            q2: { source: 'Eu gostaria de me candidatar a esta vaga.', explanation: '"Eu gostaria de" = I would like to; "me candidatar a" = apply for; "vaga" = an open post or position.' },
            q3: { source: 'Ele deu uma boa sugestão na reunião.', explanation: '"dar uma sugestão" = give a suggestion; "na reunião" = in the meeting (na = em + a).' },
            q4: { source: 'A satisfação do cliente é a nossa primeira prioridade.', explanation: '"a satisfação do cliente" (the satisfaction of the customer) = customer satisfaction; "prioridade" = priority. Portuguese puts the main noun first.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'A empresa anunciou uma nova política.', accepted: ['A companhia anunciou uma nova política.', 'A empresa divulgou uma nova política.', 'A empresa acaba de anunciar uma nova política.'], explanation: '"política" here = policy; Portuguese uses the simple past "anunciou" for "has announced".' },
            i2: { model: 'A educação é a chave do sucesso.', accepted: ['A educação é a chave para o sucesso.', 'Educação é a chave do sucesso.', 'A educação é a chave para o êxito.'], explanation: '"o sucesso" = success; "a chave do" = the key to (do = de + o). Portuguese puts "a" (the) before "educação", where English has no article.' },
            i3: { model: 'Por favor, me informe se houver alguma mudança.', accepted: ['Por favor, informe-me se houver alguma mudança.', 'Peço que me informe se houver alguma alteração.', 'Por favor, me avise se houver alguma mudança.', 'Me avise se houver alguma mudança, por favor.'], explanation: '"se houver" (if there is) uses the future subjunctive, the usual form after "se" for something that may happen; "alguma mudança" = any change.' },
            i4: { model: 'Nós devemos proteger o meio ambiente.', accepted: ['Devemos proteger o meio ambiente.', 'Nós deveríamos proteger o meio ambiente.', 'Precisamos proteger o meio ambiente.', 'Temos que proteger o meio ambiente.'], explanation: '"dever" = should or must: "devemos" (we must), "deveríamos" (we should). "o meio ambiente" = the environment.' },
            i5: { model: 'Nossa faculdade organizou uma campanha de doação de sangue na semana passada. Muitos alunos e professores participaram. Os médicos agradeceram a todos pelo apoio.', accepted: [], explanation: '"uma campanha de doação de sangue" = a blood donation camp; "participar" = take part. In Brazil a college is "faculdade" ("colégio" is a school). Compare your sentences with the model.' },
            i6: { model: 'Escrevo para solicitar uma licença de dois dias.', accepted: ['Venho por meio desta solicitar uma licença de dois dias.', 'Estou escrevendo para solicitar uma licença de dois dias.', 'Escrevo para pedir dois dias de folga.', 'Escrevo para solicitar dois dias de folga.'], explanation: '"licença" = leave ("folga" = time off); "solicitar" (formal) or "pedir" = request. A formal letter may begin "Venho por meio desta …" (I am writing to you to …).' },
            q1: { model: 'O trabalho duro sempre compensa.', accepted: ['O esforço sempre compensa.', 'O trabalho árduo sempre compensa.', 'O trabalho duro sempre vale a pena.', 'O esforço sempre vale a pena.'], explanation: '"compensar" here = pay off (bring a good result); "vale a pena" (is worth it) says nearly the same.' },
            q2: { model: 'Os resultados serão divulgados amanhã.', accepted: ['Os resultados serão anunciados amanhã.', 'Os resultados vão ser divulgados amanhã.', 'Os resultados vão ser anunciados amanhã.'], explanation: '"serão divulgados" is the future passive: will be announced. The participle agrees with "os resultados": divulgados.' },
            q3: { model: 'Obrigado pela sua resposta rápida.', accepted: ['Obrigada pela sua resposta rápida.', 'Obrigado pela resposta rápida.', 'Agradeço a sua pronta resposta.', 'Agradeço a rápida resposta.'], explanation: '"rápida" = quick and usually comes after the noun: "resposta rápida". A woman says "obrigada"; "Agradeço …" (I thank you for …) is more formal.' },
            q4: { model: 'A segurança é responsabilidade de todos.', accepted: ['Segurança é responsabilidade de todos.', 'A segurança é uma responsabilidade de todos.', 'A segurança é dever de todos.'], explanation: '"a segurança" = safety; "de todos" (of all) = everyone\'s, since Portuguese has no "\'s".' }
        }
    },
    placement: {
        b4: { prompt: '"livro" in English is…', explanation: '"livro" means book.' },
        a5: { prompt: '"A reunião foi adiada" best translates as…', explanation: '"adiar" means postpone, and "foi adiada" is passive. Portuguese says "foi" (was) where English often says "has been": "has been postponed".' }
    }
};
