/**
 * Linguistic Ability — Spanish as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 *
 * Spanish punctuation: questions open with ¿ and exclamations with ¡. Answers
 * are compared without punctuation, so a student who types "Cómo se llama
 * usted?" without the opening ¿ is marked the same.
 */
module.exports = {
    code: 'es', name: 'Spanish', native: 'Español', locale: 'es-ES',
    words: {
        'vocab-beginner-1': {
            family: 'familia',
            mother: 'madre',
            father: 'padre',
            house: 'casa',
            food: 'comida',
            happy: 'feliz, contento',
            big: 'grande',
            small: 'pequeño'
        },
        'vocab-beginner-2': {
            book: 'libro',
            teacher: 'profesor, maestro',
            student: 'estudiante, alumno',
            friend: 'amigo, amiga',
            read: 'leer',
            write: 'escribir',
            early: 'temprano',
            easy: 'fácil'
        },
        'vocab-intermediate-1': {
            honest: 'honesto, honrado',
            polite: 'educado, cortés',
            curious: 'curioso',
            confident: 'seguro de sí',
            patient: 'paciente',
            grateful: 'agradecido',
            anxious: 'nervioso, preocupado',
            generous: 'generoso'
        },
        'vocab-intermediate-2': {
            deadline: 'fecha límite, plazo',
            improve: 'mejorar',
            achieve: 'lograr, conseguir',
            schedule: 'horario, calendario',
            opportunity: 'oportunidad',
            responsible: 'responsable',
            discuss: 'hablar de, discutir',
            result: 'resultado'
        },
        'vocab-advanced-1': {
            negotiate: 'negociar',
            collaborate: 'colaborar',
            efficient: 'eficiente',
            feasible: 'factible, viable',
            comprehensive: 'completo, exhaustivo',
            prioritise: 'priorizar',
            ambiguous: 'ambiguo',
            persuade: 'persuadir, convencer'
        },
        'vocab-advanced-2': {
            sustainable: 'sostenible',
            consequence: 'consecuencia',
            perspective: 'punto de vista',
            inevitable: 'inevitable',
            substantial: 'considerable, sustancial',
            advocate: 'recomendar, defender',
            diverse: 'diverso, variado',
            integrity: 'integridad'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Spanish has articles too (un, una, el, la, los, las), but English ones have no gender: "a" and "the" go with every noun. English needs "a" before a job ("I am a student" — "Soy estudiante"), but no article for things in general ("Dogs are loyal" — "Los perros son leales").'
        },
        'grammar-beginner-2': {
            points: {
                4: 'Spanish uses the same order as English, Subject → Verb → Object: "Ravi lee libros." But Spanish often leaves out the subject ("Leo libros") and puts object pronouns before the verb ("Me llama"). English always needs the subject and puts the pronoun after the verb: "I read books", "He calls me."'
            }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Spanish word or sentence into English.',
            points: [
                'Spanish word order is close to English: "Voy a la escuela" = "I go to school." But English always needs the subject ("voy" alone = "I go"), and puts adjectives before the noun: "una casa blanca" = "a white house".',
                'Both languages have articles, but they are not always used the same way: "Soy estudiante" = "I am a student" (add "a"); "Me gustan los mangos" = "I like mangoes" (drop "los"). Spanish "ser" and "estar" are both "be" in English: am, is, are.',
                'Watch the tense: "voy" can mean "I go" or "I am going"; "fui" = "I went"; "iré" = "I will go".',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Spanish.',
            points: [
                'The word order is mostly the same: "I go to school" → "Voy a la escuela" (you may leave out "yo"). But most adjectives come after the noun: "a red bag" → "una bolsa roja".',
                'Spanish has articles too, and uses them more than English. Choose them by gender (un/el libro, una/la casa) and add one where English has none: "I like mangoes" → "Me gustan los mangos".',
                'Choose the polite form for elders, teachers and strangers: usted, venga, deme. With friends and family you may use tú, ven, dame.',
                'Type in Spanish with your phone\'s Spanish keyboard (press and hold a letter such as e to get é, or n to get ñ), or use the letter keys under the answer box. Accents matter: "el" (the) is not "él" (he). Questions begin with ¿ and exclamations with ¡.'
            ]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Spanish verb ending to choose the English tense.',
            points: [
                'Spanish word order is close to English: "Voy a la escuela" = "I go to school." But English always needs the subject ("voy" alone = "I go"), and puts adjectives before the noun: "una casa blanca" = "a white house".',
                'Both languages have articles, but they are not always used the same way: "Soy estudiante" = "I am a student" (add "a"); "Me gustan los mangos" = "I like mangoes" (drop "los"). Spanish "ser" and "estar" are both "be" in English: am, is, are.',
                'Watch the tense: "voy" = I go or I am going; "vi" = I watched (or saw); "iré" = I will go. With "desde hace" Spanish uses the present ("Vivo aquí desde hace dos años"), but English says "I have been living here for two years".',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Spanish. Use the polite usted form for requests.',
            points: [
                'The word order is mostly the same, but "no" goes before the verb ("Do not waste water" → "No desperdicie el agua") and object pronouns come before it too ("Can you help me?" → "¿Me puede ayudar?").',
                'Spanish has articles too, and uses them more than English. Choose them by gender (un/el libro, una/la casa) and add one where English has none: "next week" → "la próxima semana".',
                'Choose the polite form for elders, teachers and strangers: usted, venga, deme. With friends and family you may use tú, ven, dame.',
                'Type in Spanish with your phone\'s Spanish keyboard (press and hold a letter such as e to get é, or n to get ñ), or use the letter keys under the answer box. Accents matter: "el" (the) is not "él" (he). Questions begin with ¿ and exclamations with ¡.'
            ]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "La reunión se ha aplazado" = "The meeting has been postponed."',
            points: [
                'Spanish word order is close to English: "Voy a la escuela" = "I go to school." But English always needs the subject ("voy" alone = "I go"), and puts adjectives before the noun: "una casa blanca" = "a white house".',
                'Both languages have articles, but they are not always used the same way: "Soy estudiante" = "I am a student" (add "a"); "Me gustan los mangos" = "I like mangoes" (drop "los"). Spanish "ser" and "estar" are both "be" in English: am, is, are.',
                'Watch the tense and the passive: "se ha aplazado" or "ha sido aplazada" = has been postponed; "se resolverá" or "será resuelto" = will be solved. A Spanish sentence with "se" often reads best as an English passive: "Los resultados se anunciarán mañana" = "The results will be announced tomorrow."',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Spanish. Passive forms with "se", such as "se anunciarán" (will be announced), are common in notices, and "Le ruego que …" is a formal way to say "please".',
            points: [
                'The word order is mostly the same as English, but adjectives usually follow the noun ("una respuesta rápida" = a quick response) and object pronouns come before the verb or join the end of a command ("Le ruego que me informe", "Infórmeme" = please inform me).',
                'Spanish has articles too, and uses them more than English. Choose them by gender (un/el libro, una/la casa) and add one where English has none: "Education is the key to success" → "La educación es la clave del éxito".',
                'In formal writing always use usted: "Le escribo para …", "Le ruego que …", "Le agradezco …". Keep tú for friends and family.',
                'Type in Spanish with your phone\'s Spanish keyboard (press and hold a letter such as e to get é, or n to get ñ), or use the letter keys under the answer box. Accents matter: "el" (the) is not "él" (he). Questions begin with ¿ and exclamations with ¡.'
            ]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'agua', explanation: '"agua" means water. With the article it is "el agua" (the water): the word is feminine, but takes "el" because it begins with a stressed a.' },
            i2: { source: 'libro', explanation: '"libro" means book; "un libro" = a book.' },
            i3: { source: 'Me llamo Rani.', explanation: '"Me llamo" (literally "I call myself") is how Spanish gives a name. In English say "My name is …" or "I am …".' },
            i4: { source: '¿Cómo está usted?', explanation: 'This is the polite greeting (to a friend: "¿Cómo estás?"). English needs "are": How are you?' },
            i5: { source: 'Estoy bien.', explanation: '"Estoy" = I am (from "estar", used for how you feel); "bien" = well or fine.' },
            i6: { source: 'Esta es mi casa.', explanation: '"Esta es" = this is ("esta" because "casa" is feminine); "mi casa" = my house. English "this" has no gender.' },
            q1: { source: 'Voy a la escuela.', explanation: '"Voy" already means "I go" (or "I am going"), so Spanish leaves out "yo"; English always needs "I". English says "to school", with no word for "la" (the).' },
            q2: { source: 'Ella es mi hermana menor.', explanation: '"hermana menor" = younger sister; an elder sister is "hermana mayor".' },
            q3: { source: 'Cierre la puerta, por favor.', explanation: '"por favor" = please, "la puerta" = the door, "cierre" = close (polite; to a friend: "cierra").' },
            q4: { source: 'Gracias.', explanation: '"Gracias" means thank you; "muchas gracias" = thank you very much.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'amigo', accepted: ['amiga', 'un amigo', 'una amiga'], explanation: 'Friend is "amigo" (for a girl, "amiga").' },
            i2: { model: 'escuela', accepted: ['la escuela', 'una escuela', 'colegio', 'el colegio'], explanation: 'School is "escuela", a feminine noun: una escuela, la escuela. In Spain a school for children is often called "colegio".' },
            i3: { model: 'Buenos días.', accepted: [], explanation: '"Buenos días" (literally "good days") is said until about lunchtime; after that, "buenas tardes".' },
            i4: { model: 'Soy estudiante.', accepted: ['Yo soy estudiante.', 'Soy alumno.', 'Soy alumna.', 'Soy un estudiante.'], explanation: 'Spanish usually drops "a" before a job or role: "Soy estudiante". "Soy" = I am (from "ser"); "yo" (I) can be left out.' },
            i5: { model: '¿Cómo se llama usted?', accepted: ['¿Cómo se llama?', '¿Cómo te llamas?', '¿Cuál es su nombre?', '¿Cuál es tu nombre?'], explanation: '"¿Cómo se llama usted?" is polite (literally "How do you call yourself?"); with a friend, "¿Cómo te llamas?".' },
            i6: { model: 'La comida está deliciosa.', accepted: ['La comida está rica.', 'La comida está buena.', 'La comida es deliciosa.'], explanation: '"deliciosa" or "rica" = tasty. Spanish uses "estar" for how food tastes now, and the adjective agrees with "la comida" (feminine): deliciosa.' },
            q1: { model: '¿Dónde está la parada de autobús?', accepted: ['¿Dónde está la parada del autobús?', '¿Dónde está la estación de autobuses?', '¿Dónde queda la parada de autobús?'], explanation: '"Dónde" = where; "¿Dónde está …?" = where is …? A big bus station is "la estación de autobuses".' },
            q2: { model: 'Me gustan los mangos.', accepted: ['A mí me gustan los mangos.'], explanation: 'Spanish says "mangoes please me": "me gustan" is plural because "los mangos" is plural. It also needs the article "los", where English says just "mangoes".' },
            q3: { model: 'Venga aquí.', accepted: ['Ven aquí.', 'Venga acá.', 'Ven acá.'], explanation: '"Venga" is polite; "ven" is used with friends and children.' },
            q4: { model: 'Está lloviendo.', accepted: ['Llueve.'], explanation: 'Spanish needs no word for "it": "Está lloviendo" (is raining) or simply "Llueve" (it rains), from "llover".' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'Ayer vi una película.', explanation: '"vi" is the past of "ver" (see, watch): watched or saw. "una película" = a movie, "ayer" = yesterday.' },
            i2: { source: 'Él corre todas las mañanas.', explanation: 'A habit takes the simple present: "él corre" = he runs. "todas las mañanas" = every morning.' },
            i3: { source: 'Mañana iremos a Mysuru.', explanation: '"iremos" is the future of "ir": we will go. "mañana" = tomorrow (but "la mañana" = the morning).' },
            i4: { source: 'Ella está leyendo un libro.', explanation: '"estar" + the -ndo form ("está leyendo") shows an action happening now: is reading.' },
            i5: { source: 'Los niños están jugando en el campo.', explanation: '"el campo" here = the ground or field (it can also mean the countryside); "están jugando" = are playing.' },
            i6: { source: '¿Ha comido usted?', explanation: 'A polite question about eating (to a friend: "¿Has comido?"). "Have you eaten?" is just as natural.' },
            q1: { source: 'Me gusta hablar inglés.', explanation: '"Me gusta" + verb = I like to … ("inglés" = English; Spanish writes languages without a capital).' },
            q2: { source: 'Viven en Bengaluru desde hace dos años.', explanation: 'Spanish uses the present with "desde hace" (viven … desde hace dos años); English needs the present perfect continuous: have been living … for.' },
            q3: { source: 'El tren llegó a tiempo.', explanation: '"a tiempo" = on time; "llegó" = came or arrived.' },
            q4: { source: 'Hable despacio, por favor.', explanation: '"despacio" = slowly; "hable" is the polite request form of "hablar" (speak; to a friend: "habla").' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'Deme agua, por favor.', accepted: ['Dame agua, por favor.', 'Por favor, deme agua.', 'Deme un poco de agua, por favor.', '¿Me da agua, por favor?'], explanation: '"Deme" is the polite form of "give me" (to a friend: "dame"). Spanish needs no word for "some": "agua" alone, or "un poco de agua" (a little water).' },
            i2: { model: 'La clase empieza a las nueve.', accepted: ['La clase comienza a las nueve.', 'La clase empieza a las 9.', 'La clase comienza a las 9.', 'La clase empieza a las nueve en punto.'], explanation: '"a las nueve" = at nine o\'clock ("en punto" = exactly on the hour); "empieza" or "comienza" = starts.' },
            i3: { model: 'Olvidé mi libro en casa.', accepted: ['Me olvidé el libro en casa.', 'Se me olvidó el libro en casa.', 'He olvidado mi libro en casa.', 'Me he dejado el libro en casa.'], explanation: '"Olvidé" = I forgot (from "olvidar"); "en casa" = at home, with no article. Spanish often says "el libro" (the book) where English says "my book".' },
            i4: { model: '¿Cuánto cuesta esto?', accepted: ['¿Cuánto vale esto?', '¿Cuánto cuesta?', '¿Qué precio tiene esto?', '¿Cuánto es?'], explanation: '"cuánto" = how much; "cuesta" = costs (from "costar"). "¿Cuánto es?" is the short everyday way to ask.' },
            i5: { model: 'Mi examen es la próxima semana.', accepted: ['Mi examen es la semana que viene.', 'Tengo el examen la próxima semana.', 'Tengo el examen la semana que viene.'], explanation: '"la próxima semana" or "la semana que viene" = next week. Spanish adds the article "la", which English leaves out.' },
            i6: { model: '¿Me puede ayudar?', accepted: ['¿Puede ayudarme?', '¿Me puedes ayudar?', '¿Puedes ayudarme?', '¿Podría ayudarme?'], explanation: '"¿Me puede ayudar?" is polite (to a friend: "¿Me puedes ayudar?"). "me" comes before the verb, or joins the end of it: "ayudarme".' },
            q1: { model: 'Vamos a la biblioteca.', accepted: ['Nosotros vamos a la biblioteca.', 'Nos vamos a la biblioteca.'], explanation: '"la biblioteca" = the library; "vamos" = we go or we are going. Careful: "librería" means bookshop.' },
            q2: { model: 'Ella habla muy bien el kannada.', accepted: ['Ella habla el kannada muy bien.', 'Ella habla muy bien kannada.', 'Habla muy bien el kannada.', 'Ella habla muy bien el canarés.'], explanation: '"muy bien" = very well. Languages take no capital in Spanish and often have "el" before them: el kannada (also called "el canarés").' },
            q3: { model: 'No desperdicie el agua.', accepted: ['No desperdicies el agua.', 'No desperdicie agua.', 'No malgaste el agua.', 'No malgastes el agua.'], explanation: '"no" before the verb = do not; "desperdicie" is the polite form, "desperdicies" the one for a friend.' },
            q4: { model: 'La tienda abre a las diez.', accepted: ['La tienda abre a las 10.'], explanation: '"abre" = opens. Spanish needs "las" before the hour: "a las diez", where English says just "at ten".' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'La reunión se ha aplazado al lunes.', explanation: '"se ha aplazado" is passive: "has been …" ("ha sido aplazada" means the same). "aplazar" = postpone; "lunes" = Monday.' },
            i2: { source: 'Por favor, envíe el informe para el viernes.', explanation: '"para" with a day means "by" (not later than); "envíe" is the polite form of "enviar" (send).' },
            i3: { source: 'Disculpe la tardanza en responder.', explanation: 'A common line in emails; "disculpe" = sorry (formal), "la tardanza" = the delay.' },
            i4: { source: 'Nuestro equipo completó el proyecto a tiempo.', explanation: '"completó" = completed; "a tiempo" = on time.' },
            i5: { source: 'Terminé la carrera el año pasado. Ahora estoy buscando trabajo en una empresa de software. Me interesa mucho aprender cosas nuevas.', explanation: '"la carrera" = a university degree. Three sentences: a past action (terminé), an action going on now (estoy buscando = I am looking for), and a feeling (me interesa = I am interested in). Compare your tenses with the model.' },
            i6: { source: 'Gracias por su colaboración.', explanation: '"colaboración" (or "cooperación") = cooperation; "Gracias por su …" = thank you for your … ("su" is the formal "your").' },
            q1: { source: 'Este problema se resolverá lo antes posible.', explanation: '"se resolverá" is the future passive: "will be …" ("será resuelto" means the same). "lo antes posible" = as soon as possible.' },
            q2: { source: 'Me gustaría solicitar este puesto.', explanation: '"Me gustaría" = I would like; "solicitar" = apply for; "puesto" = post or position.' },
            q3: { source: 'Hizo una buena sugerencia en la reunión.', explanation: 'With no subject, "hizo" can be "he" or "she" (made); "hacer una sugerencia" = make or give a suggestion.' },
            q4: { source: 'La satisfacción del cliente es nuestra primera prioridad.', explanation: '"la satisfacción del cliente" (the satisfaction of the customer) = customer satisfaction; "prioridad" = priority. Spanish puts the main noun first.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'La empresa ha anunciado una nueva política.', accepted: ['La compañía ha anunciado una nueva política.', 'La empresa anunció una nueva política.', 'La empresa ha anunciado una nueva normativa.'], explanation: '"política" here = policy; "ha anunciado" (present perfect) = has announced.' },
            i2: { model: 'La educación es la clave del éxito.', accepted: ['La educación es la clave para el éxito.', 'La educación es la llave del éxito.'], explanation: '"el éxito" = success (not "exit"); "la clave de" = the key to ("del" = de + el). Spanish puts "la" before "educación", where English has no article.' },
            i3: { model: 'Por favor, infórmeme si hay algún cambio.', accepted: ['Le ruego que me informe si hay algún cambio.', 'Por favor, avíseme si hay algún cambio.', 'Infórmeme si hay algún cambio, por favor.', 'Por favor, avísame si hay algún cambio.'], explanation: '"infórmeme" = inform me (polite; the pronoun joins the end of a command); "si hay algún cambio" = if there is any change. As in English, the "if" part can come first or last.' },
            i4: { model: 'Debemos proteger el medio ambiente.', accepted: ['Deberíamos proteger el medio ambiente.', 'Tenemos que proteger el medio ambiente.', 'Hay que proteger el medio ambiente.', 'Debemos proteger el medioambiente.'], explanation: '"deber" = should or must: "debemos" (we must), "deberíamos" (we should). "el medio ambiente" = the environment.' },
            i5: { model: 'Nuestra universidad organizó una campaña de donación de sangre la semana pasada. Muchos estudiantes y profesores participaron. Los médicos agradecieron a todos su apoyo.', accepted: [], explanation: '"una campaña de donación de sangre" = a blood donation camp; "participar" = take part. A Spanish "colegio" is a school for children, so an Indian college is "universidad" here. Compare your sentences with the model.' },
            i6: { model: 'Le escribo para solicitar dos días de permiso.', accepted: ['Le escribo para solicitar un permiso de dos días.', 'Le escribo para pedir dos días de permiso.', 'Me dirijo a usted para solicitar dos días de permiso.', 'Escribo para solicitar dos días de permiso.'], explanation: '"permiso" = leave; "solicitar" (formal) or "pedir" = request. A formal letter often says "Le escribo" or "Me dirijo a usted" (I am writing to you).' },
            q1: { model: 'El trabajo duro siempre da sus frutos.', accepted: ['El esfuerzo siempre da sus frutos.', 'El esfuerzo siempre tiene su recompensa.', 'El trabajo duro siempre vale la pena.', 'El trabajo duro siempre se recompensa.'], explanation: '"dar sus frutos" (literally "give its fruit") = pay off, bring a good result.' },
            q2: { model: 'Los resultados se anunciarán mañana.', accepted: ['Los resultados serán anunciados mañana.', 'Mañana se anunciarán los resultados.', 'Los resultados se publicarán mañana.'], explanation: '"se anunciarán" is the usual Spanish future passive: will be announced. "serán anunciados" means the same; the participle agrees with "los resultados".' },
            q3: { model: 'Gracias por su pronta respuesta.', accepted: ['Gracias por su rápida respuesta.', 'Gracias por su respuesta rápida.', 'Le agradezco su pronta respuesta.', 'Gracias por tu rápida respuesta.'], explanation: '"pronta" or "rápida" = quick. Adjectives usually follow the noun, but in this set phrase they often come first: "su pronta respuesta". "Le agradezco" is more formal than "Gracias".' },
            q4: { model: 'La seguridad es responsabilidad de todos.', accepted: ['La seguridad es cosa de todos.', 'La seguridad es tarea de todos.', 'La seguridad es una responsabilidad de todos.'], explanation: '"la seguridad" = safety; "de todos" (of all) = everyone\'s, since Spanish has no "\'s".' }
        }
    },
    placement: {
        b4: { prompt: '"libro" in English is…', explanation: '"libro" means book.' },
        a5: { prompt: '"La reunión se ha aplazado" best translates as…', explanation: '"aplazar" means postpone, and "se ha aplazado" is passive: "has been postponed".' }
    }
};
