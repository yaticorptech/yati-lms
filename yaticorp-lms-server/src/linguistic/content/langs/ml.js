/**
 * Linguistic Ability — Malayalam as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */

// Tips shared by the three Malayalam → English lessons, and by the three English → Malayalam lessons.
const TO_ENGLISH_POINTS = [
    'Malayalam puts the verb at the end: "ഞാൻ സ്കൂളിൽ പോകുന്നു" (I school-to go). English puts it after the subject: "I go to school."',
    'English needs a, an and the, which Malayalam does not have. Malayalam uses one word, ആണ്, for is, am and are (and often leaves it out); English must choose is, am or are to match the subject and put it right after it.',
    'Watch the tense: പോകുന്നു (go / am going), പോകും (will go), പോയി (went), പോകുകയാണ് (am going now). Words like ഇന്നലെ (yesterday) and നാളെ (tomorrow) help too.',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const TO_MALAYALAM_POINTS = [
    'Move the verb to the end: "I go to school" → "ഞാൻ സ്കൂളിൽ പോകുന്നു." Malayalam verbs stay the same for every subject: ഞാൻ പോകുന്നു, അവൾ പോകുന്നു, അവർ പോകുന്നു.',
    'There are no words for a, an or the in Malayalam; leave them out. (ഒരു means "one"; it is used for "a" only sometimes.)',
    'Choose the polite form for elders and strangers: നിങ്ങൾ (or the more formal താങ്കൾ), വരൂ, തരൂ. With friends you may use നീ, വാ, താ.',
    'Type in Malayalam with your phone\'s Malayalam keyboard, or use the Malayalam letters under the answer box. End a sentence with a full stop (.).'
];

module.exports = {
    code: 'ml', name: 'Malayalam', native: 'മലയാളം', locale: 'ml-IN',
    words: {
        'vocab-beginner-1': {
            family: 'കുടുംബം',
            mother: 'അമ്മ',
            father: 'അച്ഛൻ',
            house: 'വീട്',
            food: 'ഭക്ഷണം',
            happy: 'സന്തോഷമുള്ള, സന്തോഷം',
            big: 'വലിയ',
            small: 'ചെറിയ'
        },
        'vocab-beginner-2': {
            book: 'പുസ്തകം',
            teacher: 'അധ്യാപകൻ, അധ്യാപിക',
            student: 'വിദ്യാർത്ഥി',
            friend: 'സുഹൃത്ത്, കൂട്ടുകാരൻ',
            read: 'വായിക്കുക',
            write: 'എഴുതുക',
            early: 'നേരത്തെ',
            easy: 'എളുപ്പം, ലളിതം'
        },
        'vocab-intermediate-1': {
            honest: 'സത്യസന്ധമായ',
            polite: 'വിനയമുള്ള, മര്യാദയുള്ള',
            curious: 'ജിജ്ഞാസയുള്ള, കൗതുകമുള്ള',
            confident: 'ആത്മവിശ്വാസമുള്ള',
            patient: 'ക്ഷമയുള്ള',
            grateful: 'നന്ദിയുള്ള, കൃതജ്ഞതയുള്ള',
            anxious: 'ഉത്കണ്ഠയുള്ള, ആശങ്കയുള്ള',
            generous: 'ഉദാരമനസ്കനായ, ഉദാരമായ'
        },
        'vocab-intermediate-2': {
            deadline: 'അവസാന തീയതി, സമയപരിധി',
            improve: 'മെച്ചപ്പെടുത്തുക',
            achieve: 'നേടുക, കൈവരിക്കുക',
            schedule: 'സമയക്രമം, സമയപ്പട്ടിക',
            opportunity: 'അവസരം',
            responsible: 'ഉത്തരവാദിത്തമുള്ള, ചുമതലയുള്ള',
            discuss: 'ചർച്ച ചെയ്യുക',
            result: 'ഫലം'
        },
        'vocab-advanced-1': {
            negotiate: 'ചർച്ച നടത്തുക, വിലപേശുക',
            collaborate: 'സഹകരിക്കുക, ഒന്നിച്ചു പ്രവർത്തിക്കുക',
            efficient: 'കാര്യക്ഷമമായ',
            feasible: 'പ്രായോഗികമായ, സാധ്യമായ',
            comprehensive: 'സമഗ്രമായ',
            prioritise: 'മുൻഗണന നൽകുക',
            ambiguous: 'അവ്യക്തമായ',
            persuade: 'പ്രേരിപ്പിക്കുക, സമ്മതിപ്പിക്കുക'
        },
        'vocab-advanced-2': {
            sustainable: 'സുസ്ഥിരമായ',
            consequence: 'അനന്തരഫലം, പരിണതഫലം',
            perspective: 'കാഴ്ചപ്പാട്, വീക്ഷണം',
            inevitable: 'അനിവാര്യമായ, ഒഴിവാക്കാനാവാത്ത',
            substantial: 'ഗണ്യമായ, കാര്യമായ',
            advocate: 'പിന്തുണയ്ക്കുക, ശുപാർശ ചെയ്യുക',
            diverse: 'വൈവിധ്യമാർന്ന',
            integrity: 'സത്യസന്ധത, ധാർമ്മികത'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Malayalam has no words for a, an or the (ഒരു means "one"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Malayalam the verb comes last: "രവി പുസ്തകങ്ങൾ വായിക്കുന്നു." In English the verb comes right after the subject.' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Malayalam word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Malayalam.',
            points: [...TO_MALAYALAM_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Malayalam verb ending to choose the English tense.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Malayalam. Use the polite form for requests: തരൂ, സംസാരിക്കൂ, or a question such as തരാമോ? (could you give?).',
            points: [...TO_MALAYALAM_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Malayalam. Notices often leave out the doer: മാറ്റിവച്ചിരിക്കുന്നു (has been postponed), പ്രഖ്യാപിക്കും (will be announced). The passive with -പ്പെടും, such as പ്രഖ്യാപിക്കപ്പെടും, is also used.',
            points: [...TO_MALAYALAM_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'വെള്ളം', explanation: 'വെള്ളം means water.' },
            i2: { source: 'പുസ്തകം', explanation: 'പുസ്തകം means book.' },
            i3: { source: 'എന്റെ പേര് റാണി.', explanation: 'എന്റെ = my, പേര് = name. Malayalam needs no verb here; English adds "is" before the name.' },
            i4: { source: 'നിങ്ങൾക്ക് സുഖമാണോ?', explanation: 'This is the common polite greeting, literally "Is it well with you?". In English say "How are you?", with "are" right after "How".' },
            i5: { source: 'എനിക്ക് സുഖമാണ്.', explanation: 'എനിക്ക് സുഖമാണ് means "I am well" (literally "to me, it is well"). In English "am" comes right after "I".' },
            i6: { source: 'ഇത് എന്റെ വീടാണ്.', explanation: 'ഇത് = this, വീട് = house or home. ആണ് (is), joined to വീട്, moves to after "This".' },
            q1: { source: 'ഞാൻ സ്കൂളിൽ പോകുന്നു.', explanation: 'പോകുന്നു can mean "I go" or "I am going". The verb moves to after "I", and English adds "to" before school.' },
            q2: { source: 'അവൾ എന്റെ അനിയത്തിയാണ്.', explanation: 'അനിയത്തി is a younger sister (ചേച്ചി is an elder sister). അവൾ = she; ആണ് = is.' },
            q3: { source: 'ദയവായി വാതിൽ അടയ്ക്കൂ.', explanation: 'ദയവായി = please, വാതിൽ = door, അടയ്ക്കൂ = close (polite).' },
            q4: { source: 'നന്ദി.', explanation: 'നന്ദി is the usual way to say thank you; വളരെ നന്ദി = thank you very much.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'സുഹൃത്ത്', accepted: ['കൂട്ടുകാരൻ', 'കൂട്ടുകാരി', 'ചങ്ങാതി'], explanation: 'Friend is സുഹൃത്ത് (or കൂട്ടുകാരൻ; for a girl, കൂട്ടുകാരി).' },
            i2: { model: 'സ്കൂൾ', accepted: ['വിദ്യാലയം', 'പള്ളിക്കൂടം'], explanation: 'School is സ്കൂൾ; the formal Malayalam word is വിദ്യാലയം.' },
            i3: { model: 'സുപ്രഭാതം.', accepted: ['ശുഭപ്രഭാതം.'], explanation: 'സുപ്രഭാതം is "good morning". നമസ്കാരം is a greeting for any time of day, not only the morning.' },
            i4: { model: 'ഞാൻ ഒരു വിദ്യാർത്ഥിയാണ്.', accepted: ['ഞാൻ വിദ്യാർത്ഥിയാണ്.', 'ഞാൻ ഒരു വിദ്യാർത്ഥിനിയാണ്.', 'ഞാൻ വിദ്യാർത്ഥിനിയാണ്.'], explanation: 'ആണ് = am, joined to the end of the word: വിദ്യാർത്ഥിയാണ്. ഒരു ("one") for "a" is optional. A girl may say വിദ്യാർത്ഥിനി.' },
            i5: { model: 'നിങ്ങളുടെ പേര് എന്താണ്?', accepted: ['നിന്റെ പേര് എന്താണ്?', 'താങ്കളുടെ പേര് എന്താണ്?', 'നിങ്ങളുടെ പേരെന്താണ്?', 'നിന്റെ പേരെന്താ?'], explanation: 'നിങ്ങളുടെ is polite (താങ്കളുടെ is more formal); with a friend you can say നിന്റെ. എന്താണ് = what is.' },
            i6: { model: 'ഭക്ഷണം രുചികരമാണ്.', accepted: ['ഭക്ഷണത്തിന് നല്ല രുചിയുണ്ട്.', 'ഭക്ഷണം സ്വാദിഷ്ടമാണ്.', 'ഭക്ഷണത്തിന് നല്ല സ്വാദുണ്ട്.'], explanation: 'രുചി = taste; രുചികരം = tasty. "Is" (ആണ്) joins the end: രുചികരമാണ്.' },
            q1: { model: 'ബസ് സ്റ്റാൻഡ് എവിടെയാണ്?', accepted: ['ബസ് സ്റ്റാൻഡ് എവിടെ?', 'ബസ്സ്റ്റാൻഡ് എവിടെയാണ്?', 'ബസ് സ്റ്റാന്റ് എവിടെയാണ്?'], explanation: 'എവിടെ = where; എവിടെയാണ് = where is (it). Malayalam uses the English word ബസ് സ്റ്റാൻഡ്.' },
            q2: { model: 'എനിക്ക് മാമ്പഴം ഇഷ്ടമാണ്.', accepted: ['എനിക്ക് മാങ്ങ ഇഷ്ടമാണ്.', 'എനിക്ക് മാമ്പഴങ്ങൾ ഇഷ്ടമാണ്.', 'എനിക്ക് മാമ്പഴം ഇഷ്ടം.'], explanation: 'Malayalam says "to me, mango is liked": എനിക്ക് … ഇഷ്ടമാണ്.' },
            q3: { model: 'ഇവിടെ വരൂ.', accepted: ['ഇങ്ങോട്ട് വരൂ.', 'ഇവിടെ വാ.', 'ഇങ്ങോട്ട് വാ.'], explanation: 'വരൂ is polite; വാ is used with friends and children.' },
            q4: { model: 'മഴ പെയ്യുന്നു.', accepted: ['മഴ പെയ്യുകയാണ്.', 'മഴ പെയ്യുന്നുണ്ട്.', 'മഴ പെയ്തുകൊണ്ടിരിക്കുന്നു.'], explanation: 'Malayalam says "rain is falling": മഴ പെയ്യുന്നു. English uses "it" as the subject.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'ഞാൻ ഇന്നലെ ഒരു സിനിമ കണ്ടു.', explanation: 'കണ്ടു is past tense: watched (or saw). ഇന്നലെ = yesterday.' },
            i2: { source: 'അവൻ എന്നും രാവിലെ ഓടാറുണ്ട്.', explanation: 'ഓടാറുണ്ട് shows a habit, so English uses the simple present: runs. എന്നും രാവിലെ = every morning; അവൻ = he.' },
            i3: { source: 'ഞങ്ങൾ നാളെ മൈസൂരിലേക്ക് പോകും.', explanation: 'നാളെ = tomorrow; പോകും is the future: will go. -ലേക്ക് = to.' },
            i4: { source: 'അവൾ പുസ്തകം വായിക്കുകയാണ്.', explanation: 'വായിക്കുകയാണ് shows an action happening now: is reading. അവൾ = she.' },
            i5: { source: 'കുട്ടികൾ മൈതാനത്ത് കളിക്കുകയാണ്.', explanation: 'മൈതാനം = ground or field; കളിക്കുകയാണ് = are playing.' },
            i6: { source: 'നിങ്ങൾ ഭക്ഷണം കഴിച്ചോ?', explanation: 'A polite everyday question; -ഓ at the end makes a yes/no question. "Have you eaten?" is just as natural.' },
            q1: { source: 'എനിക്ക് ഇംഗ്ലീഷ് സംസാരിക്കാൻ ഇഷ്ടമാണ്.', explanation: 'എനിക്ക് … ഇഷ്ടമാണ് = I like; സംസാരിക്കാൻ = to speak.' },
            q2: { source: 'അവർ രണ്ടു വർഷമായി ബെംഗളൂരുവിൽ താമസിക്കുന്നു.', explanation: '-ആയി with a length of time (രണ്ടു വർഷമായി = for two years now) and an ongoing action needs the present perfect continuous. അവർ is usually "they" (also a respectful "she").' },
            q3: { source: 'ട്രെയിൻ കൃത്യസമയത്ത് വന്നു.', explanation: 'കൃത്യസമയത്ത് = on time; വന്നു = came.' },
            q4: { source: 'ദയവായി പതുക്കെ സംസാരിക്കൂ.', explanation: 'പതുക്കെ = slowly; സംസാരിക്കൂ is the polite form of "speak".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'ദയവായി എനിക്ക് കുറച്ച് വെള്ളം തരൂ.', accepted: ['എനിക്ക് കുറച്ച് വെള്ളം തരൂ.', 'ദയവായി എനിക്ക് കുറച്ച് വെള്ളം തരാമോ?', 'ദയവായി കുറച്ച് വെള്ളം തരൂ.', 'എനിക്ക് കുറച്ച് വെള്ളം താ.'], explanation: 'തരൂ is the polite form of "give" (താ with friends); കുറച്ച് = some, a little.' },
            i2: { model: 'ക്ലാസ് ഒമ്പത് മണിക്ക് തുടങ്ങും.', accepted: ['ക്ലാസ് ഒൻപത് മണിക്ക് തുടങ്ങും.', 'ക്ലാസ് ഒമ്പത് മണിക്ക് ആരംഭിക്കും.', 'ക്ലാസ് 9 മണിക്ക് തുടങ്ങും.', 'ക്ലാസ് ഒമ്പത് മണിക്ക് തുടങ്ങുന്നു.'], explanation: 'മണിക്ക് = at … o\'clock; തുടങ്ങും = starts (the -ഉം form is also used for things that happen regularly).' },
            i3: { model: 'ഞാൻ എന്റെ പുസ്തകം വീട്ടിൽ മറന്നുവച്ചു.', accepted: ['ഞാൻ എന്റെ പുസ്തകം വീട്ടിൽ മറന്നുവെച്ചു.', 'ഞാൻ പുസ്തകം വീട്ടിൽ മറന്നുവച്ചു.', 'എന്റെ പുസ്തകം ഞാൻ വീട്ടിൽ മറന്നുവച്ചു.', 'ഞാൻ എന്റെ പുസ്തകം വീട്ടിൽ മറന്നു.'], explanation: 'മറന്നുവച്ചു = forgot (and left it behind); വീട്ടിൽ = at home (-ഇൽ = at, in).' },
            i4: { model: 'ഇതിന്റെ വില എത്രയാണ്?', accepted: ['ഇതിന് എത്ര വിലയാണ്?', 'ഇതിന് എത്രയാണ്?', 'ഇതിനെന്താണ് വില?', 'ഇതിന് എത്ര രൂപയാണ്?'], explanation: 'വില = price; എത്ര = how much. ഇതിന്റെ = of this.' },
            i5: { model: 'എന്റെ പരീക്ഷ അടുത്ത ആഴ്ചയാണ്.', accepted: ['അടുത്ത ആഴ്ചയാണ് എന്റെ പരീക്ഷ.', 'എന്റെ പരീക്ഷ അടുത്ത ആഴ്ച ആണ്.'], explanation: 'അടുത്ത ആഴ്ച = next week; ആണ് (is) joins the end: ആഴ്ചയാണ്.' },
            i6: { model: 'നിങ്ങൾക്ക് എന്നെ സഹായിക്കാമോ?', accepted: ['എന്നെ സഹായിക്കാമോ?', 'നിങ്ങൾക്ക് എന്നെ സഹായിക്കാൻ കഴിയുമോ?', 'എന്നെ ഒന്ന് സഹായിക്കാമോ?', 'നിനക്ക് എന്നെ സഹായിക്കാമോ?'], explanation: 'സഹായിക്കുക = to help; സഹായിക്കാമോ? = can (you) help? എന്നെ = me.' },
            q1: { model: 'ഞങ്ങൾ ഗ്രന്ഥശാലയിലേക്ക് പോകുകയാണ്.', accepted: ['ഞങ്ങൾ ലൈബ്രറിയിലേക്ക് പോകുകയാണ്.', 'ഞങ്ങൾ വായനശാലയിലേക്ക് പോകുകയാണ്.', 'നമ്മൾ ലൈബ്രറിയിലേക്ക് പോകുകയാണ്.', 'നമ്മൾ ഗ്രന്ഥശാലയിലേക്ക് പോകുകയാണ്.'], explanation: 'ഗ്രന്ഥശാല (or ലൈബ്രറി) = library; -ലേക്ക് = to; പോകുകയാണ് = are going. ഞങ്ങൾ is "we" without the listener; നമ്മൾ includes the listener.' },
            q2: { model: 'അവൾ വളരെ നന്നായി കന്നഡ സംസാരിക്കും.', accepted: ['അവൾ കന്നഡ വളരെ നന്നായി സംസാരിക്കും.', 'അവൾ കന്നഡ വളരെ നന്നായി സംസാരിക്കുന്നു.', 'അവർ വളരെ നന്നായി കന്നഡ സംസാരിക്കും.'], explanation: 'വളരെ നന്നായി = very well; സംസാരിക്കും = speaks (the -ഉം form also tells what someone can do or usually does).' },
            q3: { model: 'വെള്ളം പാഴാക്കരുത്.', accepted: ['ജലം പാഴാക്കരുത്.', 'വെള്ളം പാഴാക്കരുതേ.', 'വെള്ളം പാഴാക്കല്ലേ.', 'വെള്ളം കളയരുത്.'], explanation: '-അരുത് = do not (polite, as on notices); with friends, പാഴാക്കല്ലേ. പാഴാക്കുക = to waste.' },
            q4: { model: 'കട പത്ത് മണിക്ക് തുറക്കും.', accepted: ['കട 10 മണിക്ക് തുറക്കും.', 'കട പത്തു മണിക്ക് തുറക്കും.', 'കട പത്ത് മണിക്ക് തുറക്കുന്നു.'], explanation: 'തുറക്കും = opens (every day); പത്ത് മണിക്ക് = at ten o\'clock.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'യോഗം തിങ്കളാഴ്ചത്തേക്ക് മാറ്റിവച്ചിരിക്കുന്നു.', explanation: 'മാറ്റിവയ്ക്കുക = postpone. With no doer named, മാറ്റിവച്ചിരിക്കുന്നു is read as "has been postponed".' },
            i2: { source: 'ദയവായി വെള്ളിയാഴ്ചയ്ക്കകം റിപ്പോർട്ട് അയയ്ക്കുക.', explanation: '-ക്കകം (within) with a day means "by" (not later than): വെള്ളിയാഴ്ചയ്ക്കകം = by Friday.' },
            i3: { source: 'മറുപടി വൈകിയതിൽ ക്ഷമിക്കണം.', explanation: 'A common line in emails: മറുപടി = reply, വൈകിയതിൽ = for being late, ക്ഷമിക്കണം = sorry (literally "please forgive").' },
            i4: { source: 'ഞങ്ങളുടെ ടീം പദ്ധതി കൃത്യസമയത്ത് പൂർത്തിയാക്കി.', explanation: 'പൂർത്തിയാക്കി = completed; പദ്ധതി = project.' },
            i5: { source: 'ഞാൻ കഴിഞ്ഞ വർഷം ബിരുദം പൂർത്തിയാക്കി. ഇപ്പോൾ ഞാൻ ഒരു സോഫ്റ്റ്‌വെയർ കമ്പനിയിൽ ജോലി അന്വേഷിക്കുകയാണ്. പുതിയ കാര്യങ്ങൾ പഠിക്കാൻ എനിക്ക് വളരെ താൽപ്പര്യമുണ്ട്.', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'നിങ്ങളുടെ സഹകരണത്തിന് നന്ദി.', explanation: 'സഹകരണം = cooperation; -ന് നന്ദി = thank you for.' },
            q1: { source: 'ഈ പ്രശ്നം എത്രയും വേഗം പരിഹരിക്കപ്പെടും.', explanation: '-പ്പെടും is the future passive: "will be …". എത്രയും വേഗം = as soon as possible.' },
            q2: { source: 'ഈ തസ്തികയിലേക്ക് അപേക്ഷിക്കാൻ ഞാൻ ആഗ്രഹിക്കുന്നു.', explanation: 'തസ്തിക = post or position; അപേക്ഷിക്കുക = apply. ആഗ്രഹിക്കുന്നു (I wish) is said politely as "I would like".' },
            q3: { source: 'അദ്ദേഹം യോഗത്തിൽ നല്ലൊരു നിർദ്ദേശം നൽകി.', explanation: 'അദ്ദേഹം is a respectful "he" (a respectful "she" is അവർ). നിർദ്ദേശം = suggestion; നൽകി = gave.' },
            q4: { source: 'ഉപഭോക്താക്കളുടെ സംതൃപ്തിയാണ് ഞങ്ങളുടെ പ്രഥമ പരിഗണന.', explanation: 'സംതൃപ്തി = satisfaction; പ്രഥമ പരിഗണന = first priority. -ആണ് on സംതൃപ്തി gives it emphasis.' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'കമ്പനി ഒരു പുതിയ നയം പ്രഖ്യാപിച്ചിരിക്കുന്നു.', accepted: ['കമ്പനി പുതിയ നയം പ്രഖ്യാപിച്ചിരിക്കുന്നു.', 'കമ്പനി ഒരു പുതിയ നയം പ്രഖ്യാപിച്ചിട്ടുണ്ട്.', 'കമ്പനി പുതിയൊരു നയം പ്രഖ്യാപിച്ചിട്ടുണ്ട്.', 'കമ്പനി ഒരു പുതിയ നയം പ്രഖ്യാപിച്ചു.'], explanation: 'നയം = policy; പ്രഖ്യാപിച്ചിരിക്കുന്നു = has announced (the -ഇരിക്കുന്നു ending gives "has …").' },
            i2: { model: 'വിദ്യാഭ്യാസമാണ് വിജയത്തിന്റെ താക്കോൽ.', accepted: ['വിദ്യാഭ്യാസം വിജയത്തിന്റെ താക്കോലാണ്.', 'വിജയത്തിന്റെ താക്കോൽ വിദ്യാഭ്യാസമാണ്.'], explanation: 'വിജയം = success; താക്കോൽ = key. "The key to success" becomes വിജയത്തിന്റെ താക്കോൽ ("success\'s key").' },
            i3: { model: 'എന്തെങ്കിലും മാറ്റമുണ്ടെങ്കിൽ ദയവായി എന്നെ അറിയിക്കുക.', accepted: ['എന്തെങ്കിലും മാറ്റമുണ്ടെങ്കിൽ ദയവായി എന്നെ അറിയിക്കൂ.', 'എന്തെങ്കിലും മാറ്റമുണ്ടെങ്കിൽ ദയവായി എന്നെ അറിയിക്കണം.', 'എന്തെങ്കിലും മാറ്റമുണ്ടെങ്കിൽ എന്നെ അറിയിക്കണം.', 'എന്തെങ്കിലും മാറ്റം ഉണ്ടെങ്കിൽ ദയവായി എന്നെ അറിയിക്കുക.'], explanation: 'In Malayalam the "if" part comes first, marked by -എങ്കിൽ: മാറ്റമുണ്ടെങ്കിൽ = if there is a change. അറിയിക്കുക = to inform.' },
            i4: { model: 'നമ്മൾ പരിസ്ഥിതിയെ സംരക്ഷിക്കണം.', accepted: ['നാം പരിസ്ഥിതിയെ സംരക്ഷിക്കണം.', 'നമ്മൾ പരിസ്ഥിതി സംരക്ഷിക്കണം.', 'നാം പരിസ്ഥിതി സംരക്ഷിക്കണം.', 'നമ്മൾ പരിസ്ഥിതിയെ സംരക്ഷിക്കേണ്ടതാണ്.'], explanation: '-അണം = should or must: സംരക്ഷിക്കണം = (we) should protect. നമ്മൾ (or the formal നാം) is "we" including everyone.' },
            i5: { model: 'ഞങ്ങളുടെ കോളേജ് കഴിഞ്ഞ ആഴ്ച ഒരു രക്തദാന ക്യാമ്പ് സംഘടിപ്പിച്ചു. നിരവധി വിദ്യാർത്ഥികളും അധ്യാപകരും അതിൽ പങ്കെടുത്തു. ഡോക്ടർമാർ എല്ലാവർക്കും അവരുടെ പിന്തുണയ്ക്ക് നന്ദി പറഞ്ഞു.', accepted: [], explanation: 'രക്തദാന ക്യാമ്പ് = blood donation camp; പങ്കെടുക്കുക = take part. Compare your sentences with the model.' },
            i6: { model: 'രണ്ടു ദിവസത്തെ അവധി അഭ്യർത്ഥിക്കാനാണ് ഞാൻ എഴുതുന്നത്.', accepted: ['രണ്ട് ദിവസത്തെ അവധി അഭ്യർത്ഥിക്കാനാണ് ഞാൻ എഴുതുന്നത്.', 'രണ്ടു ദിവസത്തെ അവധി അഭ്യർത്ഥിക്കാനാണ് ഞാൻ ഇത് എഴുതുന്നത്.', 'രണ്ടു ദിവസത്തെ അവധിക്ക് അപേക്ഷിക്കാനാണ് ഞാൻ എഴുതുന്നത്.', 'രണ്ടു ദിവസത്തെ അവധി ആവശ്യപ്പെടാനാണ് ഞാൻ എഴുതുന്നത്.'], explanation: 'അവധി = leave; അഭ്യർത്ഥിക്കാൻ = to request. Malayalam puts the purpose first: "to request … is why I am writing".' },
            q1: { model: 'കഠിനാധ്വാനത്തിന് എപ്പോഴും ഫലം ലഭിക്കും.', accepted: ['കഠിനാധ്വാനം എപ്പോഴും ഫലം നൽകും.', 'കഠിനാധ്വാനത്തിന് എപ്പോഴും ഫലമുണ്ടാകും.', 'കഠിനാധ്വാനത്തിന് എന്നും ഫലമുണ്ടാകും.'], explanation: '"Pays off" means "gives a result": ഫലം ലഭിക്കും (a result is received). കഠിനാധ്വാനം = hard work.' },
            q2: { model: 'ഫലം നാളെ പ്രഖ്യാപിക്കും.', accepted: ['ഫലങ്ങൾ നാളെ പ്രഖ്യാപിക്കും.', 'ഫലം നാളെ പ്രഖ്യാപിക്കപ്പെടും.', 'നാളെ ഫലം പ്രഖ്യാപിക്കും.', 'ഫലം നാളെ പ്രസിദ്ധീകരിക്കും.'], explanation: '"Will be announced" is usually said with no doer: പ്രഖ്യാപിക്കും; the formal passive is പ്രഖ്യാപിക്കപ്പെടും. നാളെ = tomorrow.' },
            q3: { model: 'നിങ്ങളുടെ പെട്ടെന്നുള്ള പ്രതികരണത്തിന് നന്ദി.', accepted: ['താങ്കളുടെ പെട്ടെന്നുള്ള പ്രതികരണത്തിന് നന്ദി.', 'നിങ്ങളുടെ പെട്ടെന്നുള്ള മറുപടിക്ക് നന്ദി.', 'നിങ്ങളുടെ വേഗത്തിലുള്ള പ്രതികരണത്തിന് നന്ദി.', 'പെട്ടെന്ന് മറുപടി നൽകിയതിന് നന്ദി.'], explanation: 'പെട്ടെന്നുള്ള = quick; പ്രതികരണം = response; -ന് നന്ദി = thank you for.' },
            q4: { model: 'സുരക്ഷ എല്ലാവരുടെയും ഉത്തരവാദിത്തമാണ്.', accepted: ['സുരക്ഷ എല്ലാവരുടേയും ഉത്തരവാദിത്തമാണ്.', 'സുരക്ഷ എല്ലാവരുടെയും ചുമതലയാണ്.', 'സുരക്ഷ ഓരോരുത്തരുടെയും ഉത്തരവാദിത്തമാണ്.'], explanation: 'സുരക്ഷ = safety; എല്ലാവരുടെയും = everyone\'s; ഉത്തരവാദിത്തം = responsibility.' }
        }
    },
    placement: {
        b4: { prompt: '"പുസ്തകം" in English is…', explanation: 'പുസ്തകം means book.' },
        a5: { prompt: '"യോഗം മാറ്റിവച്ചിരിക്കുന്നു" best translates as…', explanation: 'മാറ്റിവയ്ക്കുക means postpone, and with no doer named, മാറ്റിവച്ചിരിക്കുന്നു means "has been postponed".' }
    }
};
