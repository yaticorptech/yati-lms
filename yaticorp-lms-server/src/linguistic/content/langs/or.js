/**
 * Linguistic Ability — Odia as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */

// Tips shared by the three Odia → English lessons, and by the three English → Odia lessons.
const TO_ENGLISH_POINTS = [
    'Odia puts the verb at the end: "ମୁଁ ସ୍କୁଲକୁ ଯାଏ" (I school-to go). English puts it after the subject: "I go to school."',
    'English needs a, an and the, which Odia does not have. English also always needs is, am or are, which Odia often leaves out: "ମୋ ନାଁ ରାଣୀ" = My name is Rani.',
    'Watch the tense: ଯାଏ (go), ଯିବି (will go), ଗଲି (went), ଯାଉଛି (am going). କାଲି means yesterday or tomorrow; the verb tells you which.',
    'Translate the meaning, not word by word. More than one good answer is often possible.'
];
const TO_ODIA_POINTS = [
    'Move the verb to the end: "I go to school" → "ମୁଁ ସ୍କୁଲକୁ ଯାଏ।" The verb is the same for a boy and a girl.',
    'There are no words for a, an or the in Odia; leave them out. (ଗୋଟିଏ, and ଜଣେ for a person, mean "one"; they are used for "a" only sometimes.)',
    'Choose the polite form for elders and strangers: ଆପଣ, ଆସନ୍ତୁ, ଦିଅନ୍ତୁ. With friends you may use ତୁମେ, ଆସ, ଦିଅ.',
    'Type in Odia with your phone\'s Odia keyboard, or use the Odia letters under the answer box. End a sentence with the danda (।).'
];

module.exports = {
    code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', locale: 'or-IN',
    words: {
        'vocab-beginner-1': {
            family: 'ପରିବାର',
            mother: 'ମା, ମାତା',
            father: 'ବାପା, ପିତା',
            house: 'ଘର',
            food: 'ଖାଦ୍ୟ, ଖାଇବା',
            happy: 'ଖୁସି, ଆନନ୍ଦିତ',
            big: 'ବଡ଼',
            small: 'ଛୋଟ'
        },
        'vocab-beginner-2': {
            book: 'ବହି, ପୁସ୍ତକ',
            teacher: 'ଶିକ୍ଷକ, ଶିକ୍ଷୟିତ୍ରୀ',
            student: 'ଛାତ୍ର, ବିଦ୍ୟାର୍ଥୀ',
            friend: 'ସାଙ୍ଗ, ବନ୍ଧୁ',
            read: 'ପଢ଼ିବା',
            write: 'ଲେଖିବା',
            early: 'ଶୀଘ୍ର, ଆଗୁଆ',
            easy: 'ସହଜ, ସରଳ'
        },
        'vocab-intermediate-1': {
            honest: 'ସଚ୍ଚୋଟ',
            polite: 'ନମ୍ର, ଭଦ୍ର',
            curious: 'କୌତୂହଳୀ, ଜିଜ୍ଞାସୁ',
            confident: 'ଆତ୍ମବିଶ୍ୱାସୀ',
            patient: 'ଧୈର୍ଯ୍ୟଶୀଳ',
            grateful: 'କୃତଜ୍ଞ',
            anxious: 'ଚିନ୍ତିତ, ବ୍ୟାକୁଳ',
            generous: 'ଉଦାର'
        },
        'vocab-intermediate-2': {
            deadline: 'ଶେଷ ତାରିଖ, ସମୟସୀମା',
            improve: 'ଉନ୍ନତି କରିବା, ସୁଧାରିବା',
            achieve: 'ହାସଲ କରିବା, ପ୍ରାପ୍ତ କରିବା',
            schedule: 'ସମୟସୂଚୀ',
            opportunity: 'ସୁଯୋଗ',
            responsible: 'ଦାୟିତ୍ୱଶୀଳ, ଦାୟୀ',
            discuss: 'ଆଲୋଚନା କରିବା',
            result: 'ଫଳାଫଳ'
        },
        'vocab-advanced-1': {
            negotiate: 'ବୁଝାମଣା କରିବା, ଦରଦାମ କରିବା',
            collaborate: 'ସହଯୋଗ କରିବା, ମିଳିମିଶି କାମ କରିବା',
            efficient: 'ଦକ୍ଷ',
            feasible: 'ସମ୍ଭବ, ସାଧ୍ୟ',
            comprehensive: 'ବ୍ୟାପକ, ବିସ୍ତୃତ',
            prioritise: 'ପ୍ରାଥମିକତା ଦେବା, ଅଗ୍ରାଧିକାର ଦେବା',
            ambiguous: 'ଅସ୍ପଷ୍ଟ',
            persuade: 'ରାଜି କରାଇବା, ମନାଇବା'
        },
        'vocab-advanced-2': {
            sustainable: 'ସ୍ଥାୟୀ, ଦୀର୍ଘସ୍ଥାୟୀ',
            consequence: 'ପରିଣାମ, ଫଳ',
            perspective: 'ଦୃଷ୍ଟିକୋଣ',
            inevitable: 'ଅନିବାର୍ଯ୍ୟ',
            substantial: 'ଯଥେଷ୍ଟ, ଉଲ୍ଲେଖନୀୟ',
            advocate: 'ସମର୍ଥନ କରିବା, ପକ୍ଷରେ କହିବା',
            diverse: 'ବିବିଧ, ବୈଚିତ୍ର୍ୟମୟ',
            integrity: 'ସଚ୍ଚୋଟତା, ସାଧୁତା'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Odia has no words for a, an or the (ଗୋଟିଏ means "one"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: { 4: 'In Odia the verb comes last: "ରବି ବହି ପଢ଼େ।" In English the verb comes right after the subject.' }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Odia word or sentence into English.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Odia.',
            points: [...TO_ODIA_POINTS]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Odia verb ending to choose the English tense.',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Odia. Use the polite form for requests: ଦିଅନ୍ତୁ, କୁହନ୍ତୁ, କରନ୍ତୁ.',
            points: [...TO_ODIA_POINTS]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [...TO_ENGLISH_POINTS]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Odia. Passive forms such as କରାଯିବ (will be done) and କରାଯାଇଛି (has been done) are common in notices.',
            points: [...TO_ODIA_POINTS]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: 'ପାଣି', explanation: 'ପାଣି means water (ଜଳ is the formal word).' },
            i2: { source: 'ବହି', explanation: 'ବହି (or ପୁସ୍ତକ) means book.' },
            i3: { source: 'ମୋ ନାଁ ରାଣୀ।', explanation: 'ମୋ = my, ନାଁ = name. Odia needs no word for "is" here; English adds it before the name.' },
            i4: { source: 'ଆପଣ କେମିତି ଅଛନ୍ତି?', explanation: 'This is the common polite greeting: କେମିତି = how, ଅଛନ୍ତି = are (polite). English puts "are" right after "How".' },
            i5: { source: 'ମୁଁ ଭଲ ଅଛି।', explanation: 'ଭଲ = good or well, ଅଛି = am. In English "am" comes right after "I".' },
            i6: { source: 'ଏହା ମୋ ଘର।', explanation: 'ଏହା = this, ଘର = house or home. Odia needs no verb here; English adds "is" after "This".' },
            q1: { source: 'ମୁଁ ସ୍କୁଲକୁ ଯାଏ।', explanation: 'ଯାଏ means "I go", and -କୁ = to. The verb moves to after "I": I go to school.' },
            q2: { source: 'ସେ ମୋର ସାନ ଭଉଣୀ।', explanation: 'ସାନ ଭଉଣୀ is a younger sister (ବଡ଼ ଭଉଣୀ is an elder sister). ସେ can be "he" or "she"; here it is "she", and English adds "is".' },
            q3: { source: 'ଦୟାକରି କବାଟ ବନ୍ଦ କରନ୍ତୁ।', explanation: 'ଦୟାକରି = please, କବାଟ = door, ବନ୍ଦ କରନ୍ତୁ = close (polite).' },
            q4: { source: 'ଧନ୍ୟବାଦ।', explanation: 'ଧନ୍ୟବାଦ is the polite way to say thank you.' }
        },
        'translation-beginner-en-kn': {
            i1: { model: 'ସାଙ୍ଗ', accepted: ['ବନ୍ଧୁ', 'ସାଥୀ', 'ବାନ୍ଧବୀ'], explanation: 'Friend is ସାଙ୍ଗ (or ବନ୍ଧୁ). A female friend can also be called ବାନ୍ଧବୀ.' },
            i2: { model: 'ସ୍କୁଲ', accepted: ['ବିଦ୍ୟାଳୟ'], explanation: 'School is ସ୍କୁଲ; the formal Odia word is ବିଦ୍ୟାଳୟ.' },
            i3: { model: 'ଶୁଭ ସକାଳ।', accepted: ['ସୁପ୍ରଭାତ।', 'ଶୁଭ ପ୍ରଭାତ।'], explanation: 'ଶୁଭ ସକାଳ is "good morning" (ସକାଳ = morning). ନମସ୍କାର is a greeting for any time of day, not only the morning.' },
            i4: { model: 'ମୁଁ ଜଣେ ଛାତ୍ର।', accepted: ['ମୁଁ ଛାତ୍ର।', 'ମୁଁ ଜଣେ ଛାତ୍ରୀ।', 'ମୁଁ ଛାତ୍ରୀ।', 'ମୁଁ ଜଣେ ବିଦ୍ୟାର୍ଥୀ।'], explanation: 'Odia needs no word for "am" here. ଜଣେ ("one person") often stands for "a" with people, but it can be left out. A girl may say ଛାତ୍ରୀ.' },
            i5: { model: 'ଆପଣଙ୍କ ନାଁ କ\'ଣ?', accepted: ['ତୁମ ନାଁ କ\'ଣ?', 'ତୁମର ନାଁ କ\'ଣ?', 'ଆପଣଙ୍କର ନାମ କ\'ଣ?', 'ତୋ ନାଁ କ\'ଣ?'], explanation: 'ଆପଣଙ୍କ is polite; with a friend you can say ତୁମ (ତୋ with a close friend). କ\'ଣ = what.' },
            i6: { model: 'ଖାଇବା ସୁଆଦିଆ ହୋଇଛି।', accepted: ['ଖାଦ୍ୟ ସୁଆଦିଆ ହୋଇଛି।', 'ଖାଦ୍ୟ ସୁସ୍ୱାଦୁ।', 'ଖାଇବା ସୁଆଦ ହୋଇଛି।', 'ଖାଦ୍ୟଟି ସୁସ୍ୱାଦୁ ଅଟେ।'], explanation: 'ସୁଆଦ = taste; ସୁଆଦିଆ (formal: ସୁସ୍ୱାଦୁ) = tasty. ହୋଇଛି works like "is" here.' },
            q1: { model: 'ବସ୍ ଷ୍ଟାଣ୍ଡ କେଉଁଠି ଅଛି?', accepted: ['ବସ୍ ଷ୍ଟାଣ୍ଡ କେଉଁଠି?', 'ବସ୍ ଷ୍ଟାଣ୍ଡ କେଉଁଠାରେ ଅଛି?', 'ବସ ଷ୍ଟାଣ୍ଡ କେଉଁଠି ଅଛି?'], explanation: 'କେଉଁଠି = where; କେଉଁଠି ଅଛି = where is (it). ଅଛି is often left out: ବସ୍ ଷ୍ଟାଣ୍ଡ କେଉଁଠି?' },
            q2: { model: 'ମୋତେ ଆମ୍ବ ଭଲ ଲାଗେ।', accepted: ['ମୁଁ ଆମ୍ବ ପସନ୍ଦ କରେ।', 'ମୋତେ ଆମ୍ବ ପସନ୍ଦ।', 'ମୁଁ ଆମ୍ବ ଭଲ ପାଏ।'], explanation: 'Odia says "to me, mango feels good": ମୋତେ … ଭଲ ଲାଗେ. You can also say ମୁଁ ଆମ୍ବ ପସନ୍ଦ କରେ.' },
            q3: { model: 'ଏଠାକୁ ଆସନ୍ତୁ।', accepted: ['ଏଠାକୁ ଆସ।', 'ଏଠିକି ଆସ।', 'ଏଠିକି ଆସନ୍ତୁ।', 'ଏଣେ ଆସ।'], explanation: 'ଆସନ୍ତୁ is polite; ଆସ is used with friends and children.' },
            q4: { model: 'ବର୍ଷା ହେଉଛି।', accepted: ['ବର୍ଷା ପଡ଼ୁଛି।'], explanation: 'Odia says "rain is happening": ବର୍ଷା ହେଉଛି. The ending -ଉଛି shows that it is going on now.' }
        },
        'translation-intermediate-kn-en': {
            i1: { source: 'ମୁଁ କାଲି ସିନେମା ଦେଖିଲି।', explanation: 'ଦେଖିଲି is past tense: watched (or saw). କାଲି means yesterday or tomorrow; the past tense tells you it is yesterday.' },
            i2: { source: 'ସେ ପ୍ରତିଦିନ ସକାଳେ ଦୌଡ଼େ।', explanation: 'A habit takes the simple present: ଦୌଡ଼େ = runs. ସେ can be "he" or "she" (the Odia verb is the same); here it is "he".', alsoAccept: ['She runs every morning.', 'She goes running every morning.', 'Every morning she runs.'] },
            i3: { source: 'ଆମେ କାଲି ମହୀଶୂର ଯିବୁ।', explanation: 'ଯିବୁ is the future: will go. So କାଲି here means tomorrow.' },
            i4: { source: 'ସେ ବହି ପଢ଼ୁଛି।', explanation: 'ପଢ଼ୁଛି shows an action happening now: is reading. ସେ can be "he" or "she" (the Odia verb is the same); here it is "she".', alsoAccept: ['He is reading a book.'] },
            i5: { source: 'ପିଲାମାନେ ପଡ଼ିଆରେ ଖେଳୁଛନ୍ତି।', explanation: 'ପଡ଼ିଆ = ground or field; -ରେ = in; ଖେଳୁଛନ୍ତି = are playing.' },
            i6: { source: 'ଆପଣ ଖାଇବା ଖାଇଲେଣି କି?', explanation: 'A polite question about eating; କି makes a yes/no question. "Have you eaten?" is just as natural.' },
            q1: { source: 'ମୋତେ ଇଂରାଜୀ କହିବାକୁ ଭଲ ଲାଗେ।', explanation: 'ମୋତେ … ଭଲ ଲାଗେ = I like; କହିବାକୁ = to speak.' },
            q2: { source: 'ସେମାନେ ଦୁଇ ବର୍ଷ ଧରି ବେଙ୍ଗାଲୁରୁରେ ରହୁଛନ୍ତି।', explanation: 'ଧରି with a length of time (ଦୁଇ ବର୍ଷ ଧରି) and an ongoing action (ରହୁଛନ୍ତି) needs the present perfect continuous.' },
            q3: { source: 'ଟ୍ରେନ୍ ଠିକ୍ ସମୟରେ ଆସିଲା।', explanation: 'ଠିକ୍ ସମୟରେ = on time; ଆସିଲା = came.' },
            q4: { source: 'ଦୟାକରି ଧୀରେ ଧୀରେ କୁହନ୍ତୁ।', explanation: 'ଧୀରେ ଧୀରେ = slowly; କୁହନ୍ତୁ is the polite form of "speak".' }
        },
        'translation-intermediate-en-kn': {
            i1: { model: 'ଦୟାକରି ମୋତେ ଟିକେ ପାଣି ଦିଅନ୍ତୁ।', accepted: ['ଦୟାକରି ମୋତେ ଟିକେ ପାଣି ଦିଅ।', 'ମୋତେ ଟିକେ ପାଣି ଦିଅନ୍ତୁ।', 'ଦୟାକରି ଟିକେ ପାଣି ଦିଅନ୍ତୁ।', 'ଦୟାକରି ମୋତେ ଅଳ୍ପ ପାଣି ଦିଅନ୍ତୁ।'], explanation: 'ଦିଅନ୍ତୁ is the polite form of "give" (ଦିଅ with friends); ଟିକେ = some, a little.' },
            i2: { model: 'କ୍ଲାସ୍ ନଅଟାରେ ଆରମ୍ଭ ହୁଏ।', accepted: ['କ୍ଲାସ ନଅଟାରେ ଆରମ୍ଭ ହୁଏ।', 'କ୍ଲାସ୍ ନଅଟାରୁ ଆରମ୍ଭ ହୁଏ।', 'କ୍ଲାସ୍ 9ଟାରେ ଆରମ୍ଭ ହୁଏ।', 'ଶ୍ରେଣୀ ନଅଟାରେ ଆରମ୍ଭ ହୁଏ।'], explanation: 'ନଅଟାରେ = at nine o\'clock (-ଟା for the hour, -ରେ = at); ଆରମ୍ଭ ହୁଏ = starts.' },
            i3: { model: 'ମୁଁ ମୋ ବହି ଘରେ ଭୁଲିଗଲି।', accepted: ['ମୁଁ ମୋ ବହି ଘରେ ଭୁଲି ଗଲି।', 'ମୁଁ ମୋର ବହି ଘରେ ଭୁଲିଗଲି।', 'ମୁଁ ବହି ଘରେ ଭୁଲିଗଲି।', 'ମୁଁ ମୋ ବହି ଘରେ ଭୁଲି ଆସିଲି।'], explanation: 'ଭୁଲିଗଲି = (I) forgot; ଘରେ = at home. The ending -ଲି shows "I" and the past, for a boy or a girl.' },
            i4: { model: 'ଏହାର ଦାମ୍ କେତେ?', accepted: ['ଏହାର ଦାମ କେତେ?', 'ଏଇଟାର ଦାମ୍ କେତେ?', 'ଏହା କେତେ ଟଙ୍କା?', 'ଏହାର ମୂଲ୍ୟ କେତେ?'], explanation: 'ଦାମ୍ = price; କେତେ = how much. Odia needs no verb here.' },
            i5: { model: 'ମୋ ପରୀକ୍ଷା ଆସନ୍ତା ସପ୍ତାହରେ।', accepted: ['ମୋର ପରୀକ୍ଷା ଆସନ୍ତା ସପ୍ତାହରେ।', 'ଆସନ୍ତା ସପ୍ତାହରେ ମୋ ପରୀକ୍ଷା।', 'ମୋ ପରୀକ୍ଷା ଆସନ୍ତା ସପ୍ତାହରେ ଅଛି।', 'ମୋ ପରୀକ୍ଷା ଆର ସପ୍ତାହରେ।'], explanation: 'ଆସନ୍ତା ସପ୍ତାହରେ = next week. Odia can leave out "is" (ଅଛି) here.' },
            i6: { model: 'ଆପଣ ମୋତେ ସାହାଯ୍ୟ କରିପାରିବେ କି?', accepted: ['ଆପଣ ମୋର ସାହାଯ୍ୟ କରିପାରିବେ କି?', 'ତୁମେ ମୋତେ ସାହାଯ୍ୟ କରିପାରିବ କି?', 'ଆପଣ ମୋତେ ସାହାଯ୍ୟ କରିପାରିବେ?', 'ଆପଣ ମୋତେ ସାହାଯ୍ୟ କରି ପାରିବେ କି?'], explanation: 'ସାହାଯ୍ୟ କରିବା = to help; କରିପାରିବେ କି = can (you) do? (polite). With a friend: ତୁମେ … କରିପାରିବ କି?' },
            q1: { model: 'ଆମେ ପାଠାଗାରକୁ ଯାଉଛୁ।', accepted: ['ଆମେ ଲାଇବ୍ରେରୀକୁ ଯାଉଛୁ।', 'ଆମେ ଗ୍ରନ୍ଥାଗାରକୁ ଯାଉଛୁ।', 'ଆମେ ଲାଇବ୍ରେରୀ ଯାଉଛୁ।'], explanation: 'ପାଠାଗାର (or ଲାଇବ୍ରେରୀ) = library; -କୁ = to; ଯାଉଛୁ = (we) are going.' },
            q2: { model: 'ସେ କନ୍ନଡ଼ ବହୁତ ଭଲ କହେ।', accepted: ['ସେ ବହୁତ ଭଲ କନ୍ନଡ଼ କହେ।', 'ସେ କନ୍ନଡ଼ ବହୁତ ଭଲ କହନ୍ତି।', 'ସେ କନ୍ନଡ଼ ଖୁବ୍ ଭଲ କହେ।'], explanation: 'ବହୁତ ଭଲ = very well; କହେ = speaks (କହନ୍ତି to show respect). ସେ is "she" or "he"; the verb is the same for both.' },
            q3: { model: 'ପାଣି ନଷ୍ଟ କରନ୍ତୁ ନାହିଁ।', accepted: ['ପାଣି ନଷ୍ଟ କର ନାହିଁ।', 'ପାଣି ଅପଚୟ କରନ୍ତୁ ନାହିଁ।', 'ଜଳ ଅପଚୟ କରନ୍ତୁ ନାହିଁ।', 'ପାଣି ନଷ୍ଟ କରିବେ ନାହିଁ।'], explanation: 'ନଷ୍ଟ କରନ୍ତୁ ନାହିଁ = do not waste (polite); with friends, ନଷ୍ଟ କର ନାହିଁ. ନାହିଁ comes after the verb.' },
            q4: { model: 'ଦୋକାନ ଦଶଟାରେ ଖୋଲେ।', accepted: ['ଦୋକାନ 10ଟାରେ ଖୋଲେ।', 'ଦୋକାନଟି ଦଶଟାରେ ଖୋଲେ।'], explanation: 'ଖୋଲେ = opens; ଦଶଟାରେ = at ten o\'clock.' }
        },
        'translation-advanced-kn-en': {
            i1: { source: 'ବୈଠକ ସୋମବାର ପର୍ଯ୍ୟନ୍ତ ସ୍ଥଗିତ ରଖାଯାଇଛି।', explanation: 'ରଖାଯାଇଛି is passive: "has been …". ସ୍ଥଗିତ ରଖିବା = postpone; ପର୍ଯ୍ୟନ୍ତ = till.' },
            i2: { source: 'ଦୟାକରି ଶୁକ୍ରବାର ସୁଦ୍ଧା ରିପୋର୍ଟ ପଠାନ୍ତୁ।', explanation: 'ସୁଦ୍ଧା with a day means "by" (not later than). ପଠାନ୍ତୁ = send (polite).' },
            i3: { source: 'ବିଳମ୍ବରେ ଉତ୍ତର ଦେଇଥିବାରୁ ଦୁଃଖିତ।', explanation: 'A common line in emails. ଦୁଃଖିତ = sorry; ବିଳମ୍ବରେ = late.' },
            i4: { source: 'ଆମ ଦଳ ପ୍ରକଳ୍ପଟିକୁ ଠିକ୍ ସମୟରେ ସମ୍ପୂର୍ଣ୍ଣ କଲା।', explanation: 'ସମ୍ପୂର୍ଣ୍ଣ କଲା = completed; ପ୍ରକଳ୍ପ = project; ଦଳ = team.' },
            i5: { source: 'ମୁଁ ଗତ ବର୍ଷ ମୋର ଡିଗ୍ରୀ ସମ୍ପୂର୍ଣ୍ଣ କଲି। ଏବେ ମୁଁ ଗୋଟିଏ ସଫ୍ଟୱେର୍ କମ୍ପାନୀରେ ଚାକିରି ଖୋଜୁଛି। ନୂଆ ଜିନିଷ ଶିଖିବାରେ ମୋର ବହୁତ ଆଗ୍ରହ ଅଛି।', explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.' },
            i6: { source: 'ଆପଣଙ୍କ ସହଯୋଗ ପାଇଁ ଧନ୍ୟବାଦ।', explanation: 'ସହଯୋଗ = cooperation; ପାଇଁ = for.' },
            q1: { source: 'ଏହି ସମସ୍ୟାର ଯଥାଶୀଘ୍ର ସମାଧାନ କରାଯିବ।', explanation: 'କରାଯିବ is the future passive: "will be …". ଯଥାଶୀଘ୍ର = as soon as possible; ସମାଧାନ = solution.' },
            q2: { source: 'ମୁଁ ଏହି ପଦ ପାଇଁ ଆବେଦନ କରିବାକୁ ଚାହେଁ।', explanation: 'ପଦ = post or position; ଆବେଦନ କରିବା = apply. ଚାହେଁ (I want) is said politely as "I would like".' },
            q3: { source: 'ସେ ବୈଠକରେ ଗୋଟିଏ ଭଲ ପରାମର୍ଶ ଦେଲେ।', explanation: 'ସେ with the respectful verb ଦେଲେ can be "he" or "she"; ଦେଲେ is also the verb for "they" (ସେମାନେ).' },
            q4: { source: 'ଗ୍ରାହକଙ୍କ ସନ୍ତୁଷ୍ଟି ହିଁ ଆମର ପ୍ରଥମ ପ୍ରାଥମିକତା।', explanation: 'ସନ୍ତୁଷ୍ଟି = satisfaction; ପ୍ରାଥମିକତା = priority. ହିଁ adds emphasis, and English adds "is".' }
        },
        'translation-advanced-en-kn': {
            i1: { model: 'କମ୍ପାନୀ ଏକ ନୂଆ ନୀତି ଘୋଷଣା କରିଛି।', accepted: ['କମ୍ପାନୀ ନୂଆ ନୀତି ଘୋଷଣା କରିଛି।', 'କମ୍ପାନୀ ଏକ ନୂତନ ନୀତି ଘୋଷଣା କରିଛି।', 'କମ୍ପାନୀ ନୂତନ ନୀତି ଘୋଷଣା କରିଛି।', 'କମ୍ପାନୀ ଗୋଟିଏ ନୂଆ ନୀତି ଘୋଷଣା କରିଛି।'], explanation: 'ନୀତି = policy; ଘୋଷଣା କରିଛି = has announced. ଏକ ("one") may be left out.' },
            i2: { model: 'ଶିକ୍ଷା ହିଁ ସଫଳତାର ଚାବିକାଠି।', accepted: ['ଶିକ୍ଷା ସଫଳତାର ଚାବିକାଠି।', 'ଶିକ୍ଷା ସଫଳତାର ଚାବି।', 'ଶିକ୍ଷା ହିଁ ସଫଳତାର ଚାବି।', 'ଶିକ୍ଷା ସଫଳତାର ଚାବିକାଠି ଅଟେ।'], explanation: 'ସଫଳତା = success; ଚାବି or ଚାବିକାଠି = key. "The key to success" becomes ସଫଳତାର ଚାବିକାଠି ("success\'s key"); ହିଁ adds emphasis.' },
            i3: { model: 'ଯଦି କିଛି ପରିବର୍ତ୍ତନ ହୁଏ, ତେବେ ଦୟାକରି ମୋତେ ଜଣାନ୍ତୁ।', accepted: ['କିଛି ପରିବର୍ତ୍ତନ ହେଲେ ଦୟାକରି ମୋତେ ଜଣାନ୍ତୁ।', 'ଯଦି କିଛି ପରିବର୍ତ୍ତନ ହୁଏ, ଦୟାକରି ମୋତେ ଜଣାଇବେ।', 'କୌଣସି ପରିବର୍ତ୍ତନ ହେଲେ ଦୟାକରି ମୋତେ ଜଣାନ୍ତୁ।'], explanation: 'In Odia the "if" part (ଯଦି … ତେବେ, or the ending -ଲେ as in ହେଲେ) comes first. ଜଣାଇବା = to inform.' },
            i4: { model: 'ଆମେ ପରିବେଶର ସୁରକ୍ଷା କରିବା ଉଚିତ।', accepted: ['ଆମେ ପରିବେଶକୁ ରକ୍ଷା କରିବା ଉଚିତ।', 'ଆମେ ପରିବେଶର ସୁରକ୍ଷା କରିବା ଉଚିତ୍।', 'ଆମକୁ ପରିବେଶର ସୁରକ୍ଷା କରିବା ଉଚିତ।', 'ଆମେ ପରିବେଶକୁ ବଞ୍ଚାଇବା ଉଚିତ।'], explanation: 'ଉଚିତ = should; it comes at the end, after the verb in -ବା: ସୁରକ୍ଷା କରିବା ଉଚିତ = should protect.' },
            i5: { model: 'ଆମ କଲେଜ ଗତ ସପ୍ତାହରେ ଏକ ରକ୍ତଦାନ ଶିବିର ଆୟୋଜନ କରିଥିଲା। ଅନେକ ଛାତ୍ରଛାତ୍ରୀ ଓ ଶିକ୍ଷକ ଏଥିରେ ଭାଗ ନେଇଥିଲେ। ଡାକ୍ତରମାନେ ସମସ୍ତଙ୍କୁ ସେମାନଙ୍କ ସହଯୋଗ ପାଇଁ ଧନ୍ୟବାଦ ଦେଲେ।', accepted: [], explanation: 'ରକ୍ତଦାନ ଶିବିର = blood donation camp; ଭାଗ ନେବା = take part. Compare your sentences with the model.' },
            i6: { model: 'ଦୁଇ ଦିନର ଛୁଟି ପାଇଁ ଅନୁରୋଧ କରିବାକୁ ମୁଁ ଏହି ପତ୍ର ଲେଖୁଛି।', accepted: ['ଦୁଇ ଦିନର ଛୁଟି ପାଇଁ ଅନୁରୋଧ କରିବାକୁ ମୁଁ ଲେଖୁଛି।', 'ମୁଁ ଦୁଇ ଦିନର ଛୁଟି ପାଇଁ ଅନୁରୋଧ କରିବାକୁ ଲେଖୁଛି।', 'ଦୁଇ ଦିନର ଛୁଟି ମାଗିବା ପାଇଁ ମୁଁ ଲେଖୁଛି।', 'ଦୁଇ ଦିନର ଛୁଟି ମାଗି ମୁଁ ଏହି ପତ୍ର ଲେଖୁଛି।'], explanation: 'ଛୁଟି = leave; ଅନୁରୋଧ କରିବା = request. The purpose, -ବାକୁ (to request), comes before ଲେଖୁଛି (am writing).' },
            q1: { model: 'କଠିନ ପରିଶ୍ରମର ଫଳ ସବୁବେଳେ ମିଳେ।', accepted: ['ପରିଶ୍ରମର ଫଳ ସବୁବେଳେ ମିଳେ।', 'କଠିନ ପରିଶ୍ରମ ସବୁବେଳେ ଫଳ ଦିଏ।', 'ପରିଶ୍ରମର ଫଳ ସର୍ବଦା ମିଳେ।', 'କଠିନ ପରିଶ୍ରମର ଫଳ ସର୍ବଦା ମିଳିଥାଏ।'], explanation: '"Pays off" means "gives a result": ଫଳ ମିଳେ. ସବୁବେଳେ (or ସର୍ବଦା) = always.' },
            q2: { model: 'ଫଳାଫଳ କାଲି ପ୍ରକାଶ କରାଯିବ।', accepted: ['କାଲି ଫଳାଫଳ ପ୍ରକାଶ କରାଯିବ।', 'ଫଳାଫଳ କାଲି ଘୋଷଣା କରାଯିବ।', 'ଫଳାଫଳ କାଲି ପ୍ରକାଶିତ ହେବ।', 'ଆସନ୍ତାକାଲି ଫଳାଫଳ ପ୍ରକାଶ କରାଯିବ।'], explanation: '"Will be announced" is the future passive: ପ୍ରକାଶ କରାଯିବ. Here କାଲି means tomorrow.' },
            q3: { model: 'ଆପଣଙ୍କ ଶୀଘ୍ର ଉତ୍ତର ପାଇଁ ଧନ୍ୟବାଦ।', accepted: ['ଆପଣଙ୍କ ତୁରନ୍ତ ଉତ୍ତର ପାଇଁ ଧନ୍ୟବାଦ।', 'ଆପଣଙ୍କ ତ୍ୱରିତ ପ୍ରତିକ୍ରିୟା ପାଇଁ ଧନ୍ୟବାଦ।', 'ଶୀଘ୍ର ଉତ୍ତର ଦେଇଥିବାରୁ ଧନ୍ୟବାଦ।', 'ତୁମର ଶୀଘ୍ର ଉତ୍ତର ପାଇଁ ଧନ୍ୟବାଦ।'], explanation: 'ଶୀଘ୍ର = quick; ଉତ୍ତର (or ପ୍ରତିକ୍ରିୟା) = response.' },
            q4: { model: 'ସୁରକ୍ଷା ସମସ୍ତଙ୍କ ଦାୟିତ୍ୱ।', accepted: ['ସୁରକ୍ଷା ସମସ୍ତଙ୍କର ଦାୟିତ୍ୱ।', 'ସୁରକ୍ଷା ସମସ୍ତଙ୍କ ଦାୟିତ୍ୱ ଅଟେ।', 'ସୁରକ୍ଷା ପ୍ରତ୍ୟେକଙ୍କ ଦାୟିତ୍ୱ।'], explanation: 'ସୁରକ୍ଷା = safety; ସମସ୍ତଙ୍କ = everyone\'s; ଦାୟିତ୍ୱ = responsibility. Odia needs no "is" here.' }
        }
    },
    placement: {
        b4: { prompt: '"ବହି" in English is…', explanation: 'ବହି means book.' },
        a5: { prompt: '"ବୈଠକ ସ୍ଥଗିତ ରଖାଯାଇଛି" best translates as…', explanation: 'ସ୍ଥଗିତ ରଖିବା means postpone, and ରଖାଯାଇଛି is passive: "has been".' }
    }
};
