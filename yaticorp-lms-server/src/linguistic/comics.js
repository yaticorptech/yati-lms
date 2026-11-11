/**
 * Linguistic Ability — picture stories for Advanced (asked 2026-10-31, from a page of a comic book the student
 * showed: "in advanced level give stories like this — don't copy it, refer to it — then ask questions on it; make
 * the interface like it too"). Each one is an original folk tale told in comic panels: a scene, its people, a
 * caption box, speech bubbles and, under some panels, a line of narration. The student reads it (or has it read
 * aloud), then answers five questions on it. The pictures are drawn by the student app (parts/Comic.jsx) from
 * these words: a scene, who is where, how they stand, what they hold.
 *
 * Kept like a talk (talks.js): a stub in the database (seedKey "comic-advanced-1", `review: 'comic'`, in the
 * reading module), made whole here when served. Each one sits in its Advanced topic (`order`), in the Stories
 * track after that topic's article (units.js). English course only, as the talks are.
 *
 * Each story ends well, with its moral in a box under the last panel ("must have a wonderful conclusion"). Its
 * `theme` (summer, journey, monsoon, dusk) gave each its own look from 2026-10-31; since 2026-11-04 every story is
 * drawn in one bright look (parts/Comic.jsx, "add this type of interface for all stories"), the theme kept as a mark.
 *
 * A panel: { scene, wide?, zoom? (a close-up), title?, caption?, narration?, evening?, night?, rain?, focus? (where the
 * scene's tree stands, % across), cast: [{ who, x (% across), pose?, face?, holds?, y? }],
 * props?: [{ what, x, front? }], say?: [{ who, text }] }, the first to speak on the left (bubbles read left to right). Scenes: village, road, river, market, house, banyan,
 * field, water; `evening` tints the sky. Poses: stand, talk, point, cheer, sad, give, carry, dig, surprise.
 */

const SUMMARY = 'A story in pictures. Read it, then answer five questions on it.';
const INTRO = 'Read the story panel by panel: the boxes tell the story, the bubbles are what the people say, and its moral is at the end. Tap “Read aloud” to hear it. Then answer five questions on it.';

const STORIES = [
    {
        order: 1, title: 'The Shared Well', theme: 'summer',
        moral: 'What we share keeps flowing; what we keep to ourselves runs dry.',
        people: {
            gopal: { name: 'Gopal', skin: '#e0ac69', shawl: '#c0392b', hair: 'turban', turban: '#e67e22', big: true, moustache: true },
            lakshmi: { name: 'Lakshmi', woman: true, skin: '#c68642', cloth: '#16a085', blouse: '#f39c12', hair: 'bun' },
            asha: { name: 'Asha', woman: true, child: true, skin: '#a0663c', cloth: '#8e44ad', blouse: '#f7dc6f', hair: 'braid' },
            ramu: { name: 'Ramu', skin: '#b5835a', shawl: '#2874a6', hair: 'grey', beard: true },
            kitti: { name: 'Kitti', skin: '#8d5524', shawl: '#f1c40f', hair: 'hair' }
        },
        panels: [
            { scene: 'village', wide: true, title: true, props: [{ what: 'sign', x: 64, text: 'WATER:|1 COIN A POT' }, { what: 'well', x: 80 }],
                cast: [{ who: 'lakshmi', x: 16, pose: 'carry', holds: 'pot' }, { who: 'ramu', x: 30, pose: 'stand' }, { who: 'gopal', x: 52, pose: 'stand', face: 'left' }],
                narration: 'In the dry village of Kalpur there was only one well. It belonged to Gopal, the richest man for miles around.' },
            { scene: 'village', caption: 'One burning summer—', props: [{ what: 'well', x: 86 }],
                cast: [{ who: 'lakshmi', x: 24, pose: 'sad', holds: 'pot' }, { who: 'gopal', x: 62, pose: 'point', face: 'left' }],
                say: [{ who: 'gopal', text: 'From today, every pot of water costs one silver coin!' }] },
            { scene: 'village', zoom: true,
                cast: [{ who: 'lakshmi', x: 26, pose: 'talk' }, { who: 'gopal', x: 74, pose: 'stand', face: 'left' }],
                say: [{ who: 'lakshmi', text: 'We are poor. How will our children drink?' }, { who: 'gopal', text: 'That is not my problem.' }] },
            { scene: 'village', evening: true,
                cast: [{ who: 'asha', x: 28, pose: 'talk' }, { who: 'ramu', x: 70, pose: 'talk', face: 'left' }],
                say: [{ who: 'asha', text: 'Then we will dig our own well — all of us!' }, { who: 'ramu', text: 'It will be hard… but she is right.' }] },
            { scene: 'field', caption: 'For forty days, the whole village dug, one basket of earth at a time.',
                cast: [{ who: 'kitti', x: 30, pose: 'dig' }, { who: 'lakshmi', x: 60, pose: 'carry', holds: 'basket' }, { who: 'asha', x: 84, pose: 'carry', holds: 'basket', face: 'left' }] },
            { scene: 'water', caption: 'On the forty-first day—',
                cast: [{ who: 'asha', x: 26, pose: 'cheer' }, { who: 'kitti', x: 74, pose: 'cheer', face: 'left' }],
                say: [{ who: 'asha', text: 'Water! Clean, sweet water!' }, { who: 'kitti', text: 'And it is for everyone!' }] },
            { scene: 'village', caption: 'The next summer, Gopal’s own well ran dry.', props: [{ what: 'well', x: 88 }],
                cast: [{ who: 'gopal', x: 30, pose: 'sad', holds: 'pot' }, { who: 'asha', x: 66, pose: 'give', face: 'left', holds: 'pot' }],
                say: [{ who: 'gopal', text: 'May I… take a little water?' }, { who: 'asha', text: 'Of course! Water is for everyone.' }] },
            { scene: 'village', wide: true, props: [{ what: 'well', x: 22 }, { what: 'well', x: 84 }, { what: 'broken', x: 40 }],
                cast: [{ who: 'gopal', x: 50, pose: 'cheer' }, { who: 'lakshmi', x: 64, pose: 'carry', holds: 'pot', face: 'left' }, { who: 'asha', x: 72, pose: 'cheer', face: 'left' }],
                narration: 'That very day, Gopal broke his price board. From then on, Kalpur’s two wells were free for all — and Gopal himself kept them clean.' }
        ],
        questions: [
            { prompt: 'Why were the people of Kalpur worried?', answer: 'Gopal began to charge a coin for every pot of water', others: ['The only well in the village dried up', 'Gopal wanted to close the village school', 'It had not rained for forty days'], explanation: 'Gopal said: “From today, every pot of water costs one silver coin!”' },
            { prompt: 'Who first said that the village should dig its own well?', answer: 'Asha', others: ['Gopal', 'Lakshmi', 'Ramu'], explanation: 'Asha said: “Then we will dig our own well — all of us!”' },
            { prompt: 'What happened to Gopal’s well the next summer?', answer: 'It ran dry', others: ['It was filled with gold', 'The village bought it', 'It overflowed with water'], explanation: '“The next summer, Gopal’s own well ran dry.”' },
            { prompt: 'What did Asha do when Gopal asked for water?', answer: 'She gave it to him freely', others: ['She asked him for a coin', 'She sent him away', 'She laughed at him'], explanation: 'Asha said: “Of course! Water is for everyone.”' },
            { prompt: 'What does the moral “What we share keeps flowing” mean?', answer: 'Sharing helps everyone, while greed leaves you with nothing', others: ['Wells should always be deep', 'Rich people should be proud', 'Water is more useful than gold'], explanation: 'Gopal kept the water to himself and lost it; the village shared theirs, and everyone had water.' }
        ]
    },
    {
        order: 2, title: 'Three Silver Coins', theme: 'journey',
        moral: 'Kindness is never lost. It comes back — often bigger than it left.',
        people: {
            ravi: { name: 'Ravi', skin: '#b07a4f', shawl: '#2e86c1', hair: 'hair' },
            ajji: { name: 'the old woman', woman: true, skin: '#c99a6e', cloth: '#7f8c8d', blouse: '#a9cce3', hair: 'greybun' },
            boatman: { name: 'the boatman', skin: '#7b4a2a', shawl: '#e67e22', hair: 'turban', turban: '#f4d03f', beard: true },
            somu: { name: 'Somu', child: true, skin: '#a0663c', shawl: '#58d68d', hair: 'hair' },
            seller: { name: 'the thread seller', woman: true, skin: '#d4a373', cloth: '#c0392b', blouse: '#f5b041', hair: 'bun' }
        },
        panels: [
            { scene: 'road', wide: true, title: true,
                cast: [{ who: 'ravi', x: 46, pose: 'stand', holds: 'bag' }],
                narration: 'Ravi, a young weaver, set out for the town fair with three silver coins — all he had — to buy thread for his loom.' },
            { scene: 'road',
                cast: [{ who: 'ajji', x: 28, pose: 'sad' }, { who: 'ravi', x: 70, pose: 'give', face: 'left', holds: 'coin' }],
                say: [{ who: 'ajji', text: 'Son, I have not eaten for two days.' }, { who: 'ravi', text: 'Take this coin, Grandmother.' }] },
            { scene: 'river', props: [{ what: 'boat', x: 22 }],
                cast: [{ who: 'boatman', x: 40, pose: 'sad' }, { who: 'ravi', x: 76, pose: 'give', face: 'left', holds: 'coin' }],
                say: [{ who: 'boatman', text: 'My boat has a hole. I cannot work.' }, { who: 'ravi', text: 'Mend it with this.' }] },
            { scene: 'village',
                cast: [{ who: 'somu', x: 28, pose: 'sad' }, { who: 'ravi', x: 70, pose: 'give', face: 'left', holds: 'coin' }],
                say: [{ who: 'somu', text: 'My school fee is due, and Father is ill.' }, { who: 'ravi', text: 'Then this last coin is yours!' }] },
            { scene: 'market', zoom: true,
                cast: [{ who: 'ravi', x: 50, pose: 'sad' }],
                say: [{ who: 'ravi', text: 'No coins, no thread. What will I tell Mother?' }] },
            { scene: 'market', props: [{ what: 'stall', x: 14 }],
                cast: [{ who: 'seller', x: 34, pose: 'point' }, { who: 'ravi', x: 72, pose: 'surprise', face: 'left' }],
                say: [{ who: 'seller', text: 'Are you the weaver who fed my mother?' }, { who: 'ravi', text: 'Yes… but how do you know?' }] },
            { scene: 'market', props: [{ what: 'stall', x: 12 }],
                cast: [{ who: 'seller', x: 32, pose: 'give', holds: 'thread' }, { who: 'ravi', x: 72, pose: 'cheer', face: 'left' }],
                say: [{ who: 'seller', text: 'She told me everything. This thread is a gift!' }, { who: 'ravi', text: 'Thank you, sister!' }] },
            { scene: 'market', wide: true, caption: 'At the next fair—', props: [{ what: 'stall', x: 90 }],
                cast: [{ who: 'ajji', x: 22, pose: 'cheer' }, { who: 'boatman', x: 36, pose: 'cheer' }, { who: 'ravi', x: 52, pose: 'give', holds: 'cloth' }, { who: 'somu', x: 70, pose: 'cheer', face: 'left' }],
                narration: 'Ravi’s cloth won the first prize. In its border he had woven three silver coins — and the three people they had helped came to cheer for him.' }
        ],
        questions: [
            { prompt: 'Why was Ravi going to the fair?', answer: 'To buy thread for his loom', others: ['To sell the cloth he had woven', 'To look for a new job', 'To meet his mother'], explanation: 'He set out “to buy thread for his loom”.' },
            { prompt: 'Who did Ravi give his last coin to?', answer: 'Somu, a boy whose school fee was due', others: ['The old woman', 'The boatman', 'The thread seller'], explanation: 'Ravi told Somu: “Then this last coin is yours!”' },
            { prompt: 'How did the thread seller know about Ravi?', answer: 'Her mother, the old woman Ravi fed, told her', others: ['The boatman told her', 'She saw him on the road', 'Somu’s father told her'], explanation: 'She said: “She told me everything.”' },
            { prompt: 'What did Ravi weave into the border of his prize cloth?', answer: 'Three silver coins', others: ['His mother’s name', 'A boat on a river', 'A banyan tree'], explanation: '“In its border he had woven three silver coins.”' },
            { prompt: 'What is the moral of the story?', answer: 'Kindness comes back, often bigger than it left', others: ['Never spend all your money', 'Fairs are better than villages', 'Thread is more useful than coins'], explanation: 'Ravi gave away three coins and got back far more.' }
        ]
    },
    {
        order: 3, title: 'The Road and the Banyan Tree', theme: 'monsoon',
        moral: 'When we take care of nature, nature takes care of us.',
        people: {
            shankar: { name: 'Shankar', skin: '#c68642', shawl: '#f8f9f9', hair: 'cap', big: true, moustache: true },
            lata: { name: 'Lata', woman: true, child: true, skin: '#b07a4f', cloth: '#e74c3c', blouse: '#f9e79f', hair: 'braid' },
            ajja: { name: 'the old man', skin: '#a9784f', shawl: '#d35400', hair: 'grey', beard: true },
            priya: { name: 'Priya', woman: true, skin: '#d4a373', cloth: '#2471a3', blouse: '#aed6f1', hair: 'bun' },
            lataGrown: { name: 'Lata', woman: true, skin: '#b07a4f', cloth: '#e74c3c', blouse: '#f9e79f', hair: 'bun' },
            shankarOld: { name: 'Shankar', skin: '#c68642', shawl: '#f8f9f9', hair: 'grey', big: true, moustache: true },
            traveller: { name: 'a traveller', skin: '#8d5524', shawl: '#7d3c98', hair: 'turban', turban: '#48c9b0' }
        },
        panels: [
            { scene: 'banyan', wide: true, title: true, focus: 84,
                cast: [{ who: 'lata', x: 26, pose: 'cheer' }, { who: 'ajja', x: 62, pose: 'stand', face: 'left' }],
                narration: 'Every evening, the children of Hosur played under the old banyan tree, and the elders rested in its shade.' },
            { scene: 'banyan', caption: 'One morning—', focus: 30,
                cast: [{ who: 'shankar', x: 70, pose: 'point', face: 'left' }],
                say: [{ who: 'shankar', text: 'The new road will pass here. This tree must go.' }] },
            { scene: 'banyan', zoom: true,
                cast: [{ who: 'lata', x: 28, pose: 'talk' }, { who: 'ajja', x: 72, pose: 'sad', face: 'left' }],
                say: [{ who: 'lata', text: 'But birds live in it!' }, { who: 'ajja', text: 'My grandfather planted it.' }] },
            { scene: 'village',
                cast: [{ who: 'priya', x: 30, pose: 'talk', holds: 'papers' }, { who: 'shankar', x: 72, pose: 'stand', face: 'left' }],
                say: [{ who: 'priya', text: 'We could bend the road around the tree.' }, { who: 'shankar', text: 'That will cost more… Hmm.' }] },
            { scene: 'village', rain: true,
                cast: [{ who: 'lata', x: 28, pose: 'give', holds: 'coin' }, { who: 'ajja', x: 72, pose: 'cheer', face: 'left' }],
                say: [{ who: 'lata', text: 'I will give my ten rupees!' }, { who: 'ajja', text: 'And we will all give a little!' }] },
            { scene: 'road', caption: 'So the road bent around the tree.', props: [{ what: 'banyan', x: 50 }],
                cast: [] },
            { scene: 'banyan', caption: 'Years later—', focus: 50, props: [{ what: 'stall', x: 86 }],
                cast: [{ who: 'traveller', x: 24, pose: 'talk' }, { who: 'lataGrown', x: 64, pose: 'give', face: 'left', holds: 'pot' }],
                say: [{ who: 'traveller', text: 'What cool shade! I must rest here.' }, { who: 'lataGrown', text: 'Have some tea, sir!' }] },
            { scene: 'banyan', wide: true, evening: true, focus: 50,
                cast: [{ who: 'shankarOld', x: 22, pose: 'talk' }, { who: 'lataGrown', x: 78, pose: 'cheer', face: 'left' }],
                say: [{ who: 'shankarOld', text: 'I wanted a road for our future. The tree gave us one!' }, { who: 'lataGrown', text: 'And the birds kept their home.' }],
                narration: 'Travellers began to call the place Banyan Bend. They stopped in its shade, bought tea and mangoes, and the little village grew rich.' }
        ],
        questions: [
            { prompt: 'What did Shankar want to do at first?', answer: 'Cut down the banyan tree to build a road', others: ['Plant more trees in the village', 'Build a school under the tree', 'Sell the tree to the town'], explanation: 'He said: “This tree must go.”' },
            { prompt: 'Who thought of taking the road around the tree?', answer: 'Priya', others: ['Lata', 'The old man', 'Shankar'], explanation: 'Priya said: “We could bend the road around the tree.”' },
            { prompt: 'How did the village pay the extra cost?', answer: 'Everyone gave a little money', others: ['Shankar paid it all', 'They sold the tree', 'The town lent them money'], explanation: 'Lata gave her ten rupees, and the others said they would all give a little.' },
            { prompt: 'Why did the village grow rich in the end?', answer: 'Travellers stopped in the shade and bought things from the village', others: ['They sold the banyan tree', 'They found gold under the road', 'The road was closed'], explanation: 'Travellers stopped at Banyan Bend, bought tea and mangoes, and the village grew rich.' },
            { prompt: 'Which word best describes the plan to bend the road?', answer: 'A compromise', others: ['A punishment', 'An accident', 'A secret'], explanation: 'A compromise gives each side part of what it wants: the village got its road and kept its tree.' }
        ]
    },
    {
        order: 4, title: 'The Honest Ferryman', theme: 'dusk',
        moral: 'Honesty is a treasure that no river can wash away.',
        people: {
            kumar: { name: 'Kumar', skin: '#7b4a2a', shawl: '#27ae60', hair: 'hair', moustache: true },
            merchant: { name: 'the merchant', skin: '#e0ac69', shirt: '#8e44ad', hair: 'turban', turban: '#c0392b', big: true },
            gowri: { name: 'Gowri', woman: true, skin: '#a0663c', cloth: '#d35400', blouse: '#16a085', hair: 'bun' },
            woman: { name: 'a woman', woman: true, skin: '#c68642', cloth: '#2e86c1', blouse: '#f7dc6f', hair: 'bun' },
            farmer: { name: 'a farmer', skin: '#8d5524', shawl: '#f4d03f', hair: 'turban', turban: '#ecf0f1' },
            boy: { name: 'a young boatman', skin: '#a0663c', shawl: '#e74c3c', hair: 'hair' }
        },
        panels: [
            { scene: 'river', wide: true, title: true, props: [{ what: 'boat', x: 50, front: true }],
                cast: [{ who: 'kumar', x: 50, pose: 'stand', y: 208 }],
                narration: 'From sunrise to sunset, Kumar rowed people across the river Tunga in his small, old boat.' },
            { scene: 'river',
                cast: [{ who: 'merchant', x: 30, pose: 'talk', holds: 'bag' }, { who: 'kumar', x: 72, pose: 'talk', face: 'left' }],
                say: [{ who: 'merchant', text: 'Quickly! I must reach the fair by noon.' }, { who: 'kumar', text: 'Sit down, sir. The river is calm.' }] },
            { scene: 'river', evening: true, caption: 'That evening—', props: [{ what: 'boat', x: 58, front: true }, { what: 'bag', x: 46, y: 200 }],
                cast: [{ who: 'kumar', x: 68, pose: 'surprise', face: 'left', y: 208 }],
                say: [{ who: 'kumar', text: 'Gold! The merchant forgot his bag!' }] },
            { scene: 'house', night: true, zoom: true,
                cast: [{ who: 'gowri', x: 28, pose: 'talk' }, { who: 'kumar', x: 72, pose: 'stand', face: 'left', holds: 'bag' }],
                say: [{ who: 'gowri', text: 'We could build a new house!' }, { who: 'kumar', text: 'It is not ours, Gowri.' }] },
            { scene: 'market', caption: 'At the fair—', props: [{ what: 'stall', x: 88 }],
                cast: [{ who: 'kumar', x: 28, pose: 'give', holds: 'bag' }, { who: 'merchant', x: 64, pose: 'surprise', face: 'left' }],
                say: [{ who: 'kumar', text: 'You left this in my boat, sir.' }, { who: 'merchant', text: 'My bag! I thought it was lost!' }] },
            { scene: 'market', props: [{ what: 'stall', x: 88 }],
                cast: [{ who: 'merchant', x: 30, pose: 'give', holds: 'coin' }, { who: 'kumar', x: 68, pose: 'talk', face: 'left' }],
                say: [{ who: 'merchant', text: 'Take half the gold. You earned it.' }, { who: 'kumar', text: 'Only my fare, sir — two coins.' }] },
            { scene: 'river', caption: 'A week later—', props: [{ what: 'boat', x: 80, front: true }],
                cast: [{ who: 'merchant', x: 26, pose: 'point' }, { who: 'kumar', x: 56, pose: 'surprise', face: 'left' }],
                say: [{ who: 'merchant', text: 'I run the town’s ferries now. I need a chief I can trust!' }, { who: 'kumar', text: 'Me, sir?' }] },
            { scene: 'river', wide: true, props: [{ what: 'boat', x: 22, front: true }, { what: 'boat', x: 52, front: true }, { what: 'boat', x: 82, front: true }],
                cast: [{ who: 'boy', x: 22, pose: 'stand', y: 208 }, { who: 'kumar', x: 50, pose: 'cheer', y: 208 }, { who: 'woman', x: 56, pose: 'stand', y: 208 }, { who: 'farmer', x: 82, pose: 'stand', face: 'left', y: 208 }],
                narration: 'Kumar became the chief of the Tunga ferries. Every new boatman he trained heard one story first — the story of a bag of gold.' }
        ],
        questions: [
            { prompt: 'What was Kumar’s work?', answer: 'He rowed people across the river', others: ['He sold gold at the fair', 'He built houses', 'He caught fish to sell'], explanation: 'Kumar “rowed people across the river Tunga”.' },
            { prompt: 'What did Kumar find in his boat that evening?', answer: 'The merchant’s bag of gold', others: ['A hole in the boat', 'A letter for the merchant', 'A basket of fish'], explanation: 'He said: “Gold! The merchant forgot his bag!”' },
            { prompt: 'How much did Kumar take from the merchant?', answer: 'Only his fare of two coins', others: ['Half of the gold', 'All of the gold', 'Nothing at all'], explanation: 'Kumar said: “Only my fare, sir — two coins.”' },
            { prompt: 'What did the merchant offer Kumar a week later?', answer: 'To be the chief of the town’s ferries', others: ['A bag of gold', 'A house in the town', 'A shop at the fair'], explanation: 'The merchant said: “I need a chief I can trust!”' },
            { prompt: 'What is the moral of the story?', answer: 'Honesty is a treasure that lasts', others: ['Never carry gold on a boat', 'Rivers are dangerous', 'Merchants are always rich'], explanation: 'Kumar gave back the gold, and his honesty brought him far more.' }
        ]
    }
];

// The stories in other languages, for those courses (content/comicLangs.js, 2026-11-02: Kannada and Hindi first).
const { LANGS } = require('./content/comicLangs');
const courses = require('./courses');

const seedKeyOf = (s, code = null) => `${code ? `${code}:` : ''}comic-advanced-${s.order}`;
const storyOf = (stub) => STORIES.find((s) => s.order === Number(stub.order)) || null;

/** The stubs, one per story: in the English course's Advanced topics, and in each course the story is written for. */
const stubs = () => STORIES.flatMap((s) => [
    { seedKey: seedKeyOf(s), course: null, title: `Picture story: ${s.title}` },
    ...Object.entries(LANGS[s.order] || {}).map(([code, L]) => ({ seedKey: seedKeyOf(s, code), course: code, title: `${L.label}: ${L.title}` }))
].map((x) => ({ ...x, review: 'comic', module: 'reading', level: 'advanced', order: s.order, summary: SUMMARY, status: 'published', updatedBy: 'Course content', direction: null, learn: {} })));

/** The story's words in a course's language: every caption, bubble and narration in its place, and the price board. */
const inLanguage = (s, L) => s.panels.map((p, i) => {
    const own = L.panels[i] || {};
    return {
        ...p,
        ...(p.caption ? { caption: own.caption } : {}),
        ...(p.narration ? { narration: own.narration } : {}),
        say: (p.say || []).map((b, k) => ({ ...b, text: own.say[k] })),
        ...(p.props ? { props: p.props.map((x) => (x.what === 'sign' && L.sign ? { ...x, text: L.sign } : x)) } : {})
    };
});

/*
 * The people's names in each language (2026-11-05, "mention the names of the persons — the quiz asks about them"):
 * shown under them in every panel. As each language's story writes them (its quiz, its words); Kitti, never named in
 * the words, as the others are. Spanish, French, German and Portuguese write them as English does. Those with no name
 * (the old man, a traveller, the merchant…) have none shown.
 */
const NAMES = {
    Gopal: { kn: 'ಗೋಪಾಲ', hi: 'गोपाल', ta: 'கோபால்', te: 'గోపాల్', ml: 'ഗോപാൽ', mr: 'गोपाळ', bn: 'গোপাল', gu: 'ગોપાલ', pa: 'ਗੋਪਾਲ', or: 'ଗୋପାଳ', ru: 'Гопал', ar: 'غوبال', ur: 'گوپال', zh: '戈帕尔', ja: 'ゴパール', ko: '고팔' },
    Lakshmi: { kn: 'ಲಕ್ಷ್ಮಿ', hi: 'लक्ष्मी', ta: 'லட்சுமி', te: 'లక్ష్మి', ml: 'ലക്ഷ്മി', mr: 'लक्ष्मी', bn: 'লক্ষ্মী', gu: 'લક્ષ્મી', pa: 'ਲਕਸ਼ਮੀ', or: 'ଲକ୍ଷ୍ମୀ', ru: 'Лакшми', ar: 'لاكشمي', ur: 'لکشمی', zh: '拉克希米', ja: 'ラクシュミ', ko: '락슈미' },
    Asha: { kn: 'ಆಶಾ', hi: 'आशा', ta: 'ஆஷா', te: 'ఆశ', ml: 'ആശ', mr: 'आशा', bn: 'আশা', gu: 'આશા', pa: 'ਆਸ਼ਾ', or: 'ଆଶା', ru: 'Аша', ar: 'آشا', ur: 'آشا', zh: '阿莎', ja: 'アシャ', ko: '아샤' },
    Ramu: { kn: 'ರಾಮು', hi: 'रामू', ta: 'ராமு', te: 'రాము', ml: 'രാമു', mr: 'रामू', bn: 'রামু', gu: 'રામુ', pa: 'ਰਾਮੂ', or: 'ରାମୁ', ru: 'Раму', ar: 'رامو', ur: 'رامو', zh: '拉穆', ja: 'ラム', ko: '라무' },
    Kitti: { kn: 'ಕಿಟ್ಟಿ', hi: 'किट्टी', ta: 'கிட்டி', te: 'కిట్టి', ml: 'കിട്ടി', mr: 'किट्टी', bn: 'কিট্টি', gu: 'કિટ્ટી', pa: 'ਕਿੱਟੀ', or: 'କିଟ୍ଟି', ru: 'Китти', ar: 'كيتي', ur: 'کٹی', zh: '基蒂', ja: 'キッティ', ko: '키티' },
    Ravi: { kn: 'ರವಿ', hi: 'रवि', ta: 'ரவி', te: 'రవి', ml: 'രവി', mr: 'रवी', bn: 'রবি', gu: 'રવિ', pa: 'ਰਵੀ', or: 'ରବି', ru: 'Рави', ar: 'رافي', ur: 'روی', zh: '拉维', ja: 'ラヴィ', ko: '라비' },
    Somu: { kn: 'ಸೋಮು', hi: 'सोमू', ta: 'சோமு', te: 'సోము', ml: 'സോമു', mr: 'सोमू', bn: 'সোমু', gu: 'સોમુ', pa: 'ਸੋਮੂ', or: 'ସୋମୁ', ru: 'Сому', ar: 'سومو', ur: 'سومو', zh: '索穆', ja: 'ソム', ko: '소무' },
    Shankar: { kn: 'ಶಂಕರ', hi: 'शंकर', ta: 'சங்கர்', te: 'శంకర్', ml: 'ശങ്കർ', mr: 'शंकर', bn: 'শঙ্কর', gu: 'શંકર', pa: 'ਸ਼ੰਕਰ', or: 'ଶଙ୍କର', ru: 'Шанкар', ar: 'شانكار', ur: 'شنکر', zh: '尚卡尔', ja: 'シャンカル', ko: '샹카르' },
    Lata: { kn: 'ಲತಾ', hi: 'लता', ta: 'லதா', te: 'లత', ml: 'ലത', mr: 'लता', bn: 'লতা', gu: 'લતા', pa: 'ਲਤਾ', or: 'ଲତା', ru: 'Лата', ar: 'لاتا', ur: 'لتا', zh: '拉塔', ja: 'ラタ', ko: '라타' },
    Priya: { kn: 'ಪ್ರಿಯಾ', hi: 'प्रिया', ta: 'பிரியா', te: 'ప్రియ', ml: 'പ്രിയ', mr: 'प्रिया', bn: 'প্রিয়া', gu: 'પ્રિયા', pa: 'ਪ੍ਰਿਆ', or: 'ପ୍ରିୟା', ru: 'Прия', ar: 'بريا', ur: 'پریا', zh: '普丽娅', ja: 'プリヤ', ko: '프리야' },
    Kumar: { kn: 'ಕುಮಾರ', hi: 'कुमार', ta: 'குமார்', te: 'కుమార్', ml: 'കുമാർ', mr: 'कुमार', bn: 'কুমার', gu: 'કુમાર', pa: 'ਕੁਮਾਰ', or: 'କୁମାର', ru: 'Кумар', ar: 'كومار', ur: 'کمار', zh: '库马尔', ja: 'クマール', ko: '쿠마르' },
    Gowri: { kn: 'ಗೌರಿ', hi: 'गौरी', ta: 'கௌரி', te: 'గౌరీ', ml: 'ഗൗരി', mr: 'गौरी', bn: 'গৌরী', gu: 'ગૌરી', pa: 'ਗੌਰੀ', or: 'ଗୌରୀ', ru: 'Гоури', ar: 'غوري', ur: 'گوری', zh: '高丽', ja: 'ガウリ', ko: '가우리' }
};
/** The story's people, each named one with `tag`, their name in the story's language (`code`; the English story's, null). */
const named = (people, code) => Object.fromEntries(Object.entries(people || {}).map(([k, p]) => [k, NAMES[p.name] ? { ...p, tag: (code && NAMES[p.name][code]) || p.name } : p]));

/** The stub made whole: the story's panels (each speaker's name with what they say) and its questions. */
const build = (stub, helper) => {
    const s = storyOf(stub);
    const L = stub.course ? LANGS[s?.order]?.[stub.course] : null;
    if (!s || (stub.course && !L)) return { ...stub, comic: null, quiz: [] };
    const info = stub.course ? courses.courseInfo(stub.course) : null;
    return {
        ...stub, language: helper, languageName: require('./languages').infoOf(helper).name,
        ...(info ? { target: info.code, targetName: info.name, targetLocale: info.locale } : {}),
        learn: { intro: INTRO },
        comic: L
            ? { title: L.title, titleEn: s.title, theme: s.theme, moral: L.moral, moralLabel: L.moralLabel, locale: info.locale, people: named(s.people, stub.course), panels: inLanguage(s, L) }
            : {
                title: s.title, theme: s.theme, moral: s.moral, locale: 'en-IN',
                people: named(s.people, null),
                panels: s.panels.map((p) => ({ ...p, say: (p.say || []).map((b) => ({ ...b, name: s.people[b.who]?.name || '' })) }))
            },
        quiz: (L ? L.questions : s.questions).map((q, i) => ({
            id: `c${i + 1}`, type: 'mcq', prompt: q.prompt, options: [q.answer, ...q.others], answer: q.answer, explanation: q.explanation,
            // In the language learnt, its English for a tap (2026-11-06, the user: "how will the student understand this
            // language?"): the question's and each choice's, from the English story.
            ...(L && s.questions[i] ? { promptMeaning: s.questions[i].prompt, optionMeanings: Object.fromEntries([[q.answer, s.questions[i].answer], ...q.others.map((o, k) => [o, s.questions[i].others[k]])].filter(([, e]) => e)), meaningLang: 'en' } : {})
        }))
    };
};

module.exports = { STORIES, SUMMARY, NAMES, stubs, build, storyOf };
