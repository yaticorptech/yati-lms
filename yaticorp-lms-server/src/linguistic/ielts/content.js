/**
 * IELTS Academic mock tests (2026-11-17, the user: "link the IELTS exam" in Multilingo — mock tests in the app and
 * a link to book the real exam). Original material written for this app in the IELTS format; nothing is copied from
 * official papers. Answers stay on the server: publicTest() strips them before a test is sent to a student.
 *
 * Question kinds:
 *   fill   a gap; `answer` is a list of accepted answers (compared without case, spaces or a final full stop)
 *   mcq    one of `options` (letters A, B, C…); `answer` is the letter
 *   tfng   TRUE / FALSE / NOT GIVEN
 *   match  matching headings / information / features: one of `options` (letters), shown as a list to pick from
 *   sentence  sentence or note completion: a `fill` whose ______ is answered inside the sentence
 *   label  plan / map labelling: a letter from the plan (`diagram.type` 'map')
 *   choose a flow-chart gap filled from the word box (`diagram.choices`): the word's letter
 *   multi  choose TWO: `answer` is the letters, all of them needed for the mark
 *   ynng   YES / NO / NOT GIVEN (the writer's views)
 *
 * A part or passage may have a `diagram` — { type: 'flow' | 'table' | 'map' | 'labelled', … } — whose {questionId} gaps are answered
 * inside the flow-chart or table itself (flow-chart and table completion). Writing Task 1's `chart.type` is 'bar' or
 * 'process' (a process diagram / flow-chart to describe).
 */

const BOOKING = [
    { name: 'IDP IELTS India', url: 'https://ielts.idp.com/india/test-dates', note: 'Test dates, centres and fees across India' },
    { name: 'British Council India', url: 'https://www.britishcouncil.in/exam/ielts/dates-fees-locations', note: 'Dates, fees and locations; computer- and paper-based' }
];

const TESTS = [
    {
        id: 'academic-1',
        module: 'Academic',
        title: 'Academic Mock Test 1',
        formats: ['Form completion', 'Multiple choice', 'True / False / Not Given', 'Bar chart'],
        listening: {
            minutes: 30,
            parts: [
                {
                    id: 'L1',
                    title: 'Part 1 — Enrolling on a weekend course',
                    intro: 'You will hear a woman phoning a community college to enrol on a course. Complete the form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
                    script: [
                        ['m', 'Good morning, Riverside Community College, adult learning office. How can I help?'],
                        ['f', "Hi. I'd like to enrol on one of your weekend courses — the one on digital photography."],
                        ['m', "Of course. Let me take a few details. What's your full name?"],
                        ['f', 'It is Priya Menon. That is M, E, N, O, N.'],
                        ['m', 'Thank you. And a contact number?'],
                        ['f', 'Yes, it is 98450 31762.'],
                        ['m', "Lovely. The photography course runs on Saturdays. Would you prefer the morning group or the afternoon group?"],
                        ['f', 'The afternoon, please. I work on Saturday mornings.'],
                        ['m', 'Right. The afternoon group meets in Room 14, in the Arts building.'],
                        ['f', 'Room 14. Got it. And how long is the course?'],
                        ['m', 'It lasts eight weeks, starting on the fifth of March.'],
                        ['f', 'And the fee?'],
                        ['m', "It's two thousand four hundred rupees, but students and senior citizens get a discount."],
                        ['f', "I'm not a student, unfortunately. Do I need to bring anything?"],
                        ['m', "You need your own camera — a phone camera is fine for the first weeks — and a notebook. We lend tripods, so you don't need one."],
                        ['f', 'Great. How did you want me to pay?'],
                        ['m', 'You can pay online, or in cash at reception. Most people pay online.'],
                        ['f', "I'll pay online then. One more thing — is there parking?"],
                        ['m', "There's free parking behind the library, but it fills up quickly, so come early."],
                        ['f', "Perfect. Thank you so much."]
                    ],
                    questions: [
                        { id: 'L1-1', kind: 'fill', prompt: 'Course: digital ______', answer: ['photography'] },
                        { id: 'L1-2', kind: 'fill', prompt: 'Surname: ______', answer: ['menon'] },
                        { id: 'L1-3', kind: 'fill', prompt: 'Phone number: ______', answer: ['9845031762', '98450 31762'] },
                        { id: 'L1-4', kind: 'fill', prompt: 'Group: Saturday ______', answer: ['afternoon'] },
                        { id: 'L1-5', kind: 'fill', prompt: 'Room: ______ , Arts building', answer: ['14', 'room 14', 'fourteen'] },
                        { id: 'L1-6', kind: 'fill', prompt: 'Length of course: ______ weeks', answer: ['8', 'eight'] },
                        { id: 'L1-7', kind: 'fill', prompt: 'Start date: ______ March', answer: ['5', '5th', 'fifth', 'the fifth', '5 march', 'fifth march'] },
                        { id: 'L1-8', kind: 'fill', prompt: 'Bring: own camera and a ______', answer: ['notebook', 'note book'] },
                        { id: 'L1-9', kind: 'fill', prompt: 'Payment method chosen: ______', answer: ['online', 'pay online'] },
                        { id: 'L1-10', kind: 'fill', prompt: 'Free parking: behind the ______', answer: ['library', 'the library'] }
                    ]
                },
                {
                    id: 'L2',
                    title: 'Part 2 — A guided tour of the Harbour Museum',
                    intro: 'You will hear a guide talking to visitors at a museum. Questions 11–15: choose the correct letter, A, B or C. Questions 16–20: write ONE WORD for each answer.',
                    script: [
                        ['f', "Good morning, everyone, and welcome to the Harbour Museum. I'm Anita, and I'll be your guide for the next hour."],
                        ['f', 'The building you are standing in was not always a museum. It was built in 1891 as a warehouse for storing tea, and it only became a museum in 1974.'],
                        ['f', 'Before we start, a few practical points. Photography is allowed everywhere except in the textile gallery, where the light damages the old fabrics.'],
                        ['f', "Lockers are on the ground floor next to the shop. They are free, but you'll need a ten-rupee coin, which you get back."],
                        ['f', 'Our most popular exhibit is the model of the old harbour. Many visitors expect it to be the biggest thing here, but in fact what people remember most is the sound recording that plays beside it — the voices of real dock workers from the 1950s.'],
                        ['f', 'The café on the top floor has the best view of the sea. Please note that it closes at four, an hour before the museum does.'],
                        ['f', 'Now, the tour itself. We begin in the Trade Room, where you can see maps that show the routes ships took to carry spices to Europe.'],
                        ['f', 'From there we move to the Shipbuilding Hall. Look out for the wooden tools: some of them are still used by local boat builders today.'],
                        ['f', 'Next is the Fishing Gallery. Children love it because they can try pulling in a real net.'],
                        ['f', 'After that, we visit the Lighthouse Room, which holds the original lamp from the old lighthouse on the point.'],
                        ['f', 'And we finish in the Garden, where a statue of a fisherwoman stands. It was made by a local artist and unveiled last year.'],
                        ['f', "Right, if you'd all like to follow me…"]
                    ],
                    questions: [
                        { id: 'L2-1', kind: 'mcq', prompt: 'The museum building was first used to store', options: ['spices', 'tea', 'boats'], answer: 'B' },
                        { id: 'L2-2', kind: 'mcq', prompt: 'Visitors may NOT take photographs in the', options: ['textile gallery', 'Trade Room', 'garden'], answer: 'A' },
                        { id: 'L2-3', kind: 'mcq', prompt: 'To use a locker, visitors need', options: ['to pay at the shop', 'a coin that is returned', 'a ticket from reception'], answer: 'B' },
                        { id: 'L2-4', kind: 'mcq', prompt: 'What do visitors remember most about the harbour model?', options: ['its size', 'its age', 'the recording beside it'], answer: 'C' },
                        { id: 'L2-5', kind: 'mcq', prompt: 'The café closes', options: ['at four o’clock', 'at five o’clock', 'when the museum closes'], answer: 'A' },
                        { id: 'L2-6', kind: 'fill', prompt: 'Trade Room: ______ show the routes of ships carrying spices.', answer: ['maps'] },
                        { id: 'L2-7', kind: 'fill', prompt: 'Shipbuilding Hall: some wooden ______ are still used by boat builders.', answer: ['tools'] },
                        { id: 'L2-8', kind: 'fill', prompt: 'Fishing Gallery: children can pull in a real ______.', answer: ['net'] },
                        { id: 'L2-9', kind: 'fill', prompt: 'Lighthouse Room: holds the original ______.', answer: ['lamp'] },
                        { id: 'L2-10', kind: 'fill', prompt: 'Garden: a ______ of a fisherwoman.', answer: ['statue'] }
                    ]
                }
            ]
        },
        reading: {
            minutes: 40,
            passages: [
                {
                    id: 'R1',
                    title: 'Bees on the rooftops',
                    text: [
                        'Twenty years ago, keeping bees in a city would have struck most people as strange, even dangerous. Today, hives sit on the roofs of hotels, offices and schools from London to Bengaluru. Supporters of urban beekeeping argue that cities can be surprisingly good places for bees. Parks, gardens, roadside trees and balcony plants flower at different times, so city bees often find food for more months of the year than bees on farms planted with a single crop.',
                        'Cities also tend to be warmer than the surrounding countryside, an effect known as the urban heat island. Warmer temperatures allow bees to forage earlier in the morning and later into the season. In addition, many cities restrict the use of pesticides in public spaces, which removes one of the major threats facing bees in agricultural areas.',
                        'However, not everyone is convinced that more hives are always better. Ecologists point out that honeybees are only one of many bee species, and that most wild bees live alone rather than in colonies. When a city fills with honeybee hives, these managed colonies may compete with wild bees for the same flowers. A study in Paris found that as the number of hives rose, the amount of nectar and pollen available per bee fell, and visits by wild pollinators declined.',
                        'For this reason, some researchers argue that the best way for a city to help bees is not to add hives but to add flowers. Planting native species, leaving patches of ground undisturbed for bees that nest in soil, and reducing the mowing of grass verges all benefit a wide range of insects. Several city councils have now adopted guidelines that limit the number of hives per square kilometre while funding wildflower planting.',
                        'Urban beekeepers themselves have mixed views. Many say their hives have taught them, and their neighbours, to notice the seasons and the plants around them. Others admit that the honey from city hives is not cheap to produce: equipment, training and the time needed to inspect colonies all add up. What most agree on is that a beehive on a roof should be the start of a conversation about urban nature, not the end of it.'
                    ],
                    questions: [
                        { id: 'R1-1', kind: 'tfng', prompt: 'City bees may find food over a longer part of the year than bees on single-crop farms.', answer: 'TRUE' },
                        { id: 'R1-2', kind: 'tfng', prompt: 'The urban heat island effect makes bees less active in the morning.', answer: 'FALSE' },
                        { id: 'R1-3', kind: 'tfng', prompt: 'All cities have banned pesticides in public spaces.', answer: 'FALSE' },
                        { id: 'R1-4', kind: 'tfng', prompt: 'Most wild bee species live in large colonies.', answer: 'FALSE' },
                        { id: 'R1-5', kind: 'tfng', prompt: 'The Paris study was paid for by a honey company.', answer: 'NOT GIVEN' },
                        { id: 'R1-6', kind: 'tfng', prompt: 'Some city councils limit how many hives can be kept in an area.', answer: 'TRUE' },
                        { id: 'R1-7', kind: 'fill', prompt: 'The warming of cities compared with the countryside is called the urban ______ island. (ONE WORD)', answer: ['heat'] },
                        { id: 'R1-8', kind: 'fill', prompt: 'Some bees nest in ______, so undisturbed ground helps them. (ONE WORD)', answer: ['soil', 'the soil'] },
                        { id: 'R1-9', kind: 'fill', prompt: 'Researchers suggest planting ______ species of flowers. (ONE WORD)', answer: ['native'] },
                        { id: 'R1-10', kind: 'fill', prompt: 'Beekeepers say equipment, ______ and time make city honey expensive. (ONE WORD)', answer: ['training'] }
                    ]
                },
                {
                    id: 'R2',
                    title: 'What the sleeping brain remembers',
                    text: [
                        'For most of history, sleep was thought of as a time when the brain simply rested. Over the past fifty years, however, researchers have shown that the sleeping brain is remarkably busy, and that some of its activity plays an important part in memory.',
                        'Sleep is not a single state. During a typical night, a person passes through several cycles, each lasting roughly ninety minutes. Each cycle contains periods of light sleep, deep or slow-wave sleep, and rapid eye movement (REM) sleep, when most vivid dreaming happens. Deep sleep is more common early in the night, while REM periods grow longer towards morning.',
                        'Experiments suggest that the two kinds of sleep support different kinds of memory. In one well-known study, volunteers learned a list of word pairs in the evening. Those who then slept recalled more pairs the next morning than those who stayed awake for the same number of hours during the day. The benefit was linked to the amount of deep sleep they had. Memories of facts and events appear to be replayed during slow-wave sleep and gradually moved from short-term storage in the hippocampus to longer-term storage in the cortex.',
                        'Skills, by contrast, seem to depend more on REM sleep and on light sleep late in the night. Musicians who practised a short piano sequence played it faster and with fewer errors after a night of sleep, even without further practice. This suggests that the brain continues to refine movements while we sleep.',
                        'These findings have practical consequences. Students who stay up all night before an examination may remember less, not more, because they lose the very sleep that would have strengthened what they studied. Short daytime naps can also help: a nap of about twenty minutes improves alertness, while a longer nap that includes deep sleep can improve memory for facts. Researchers caution, though, that sleep cannot replace learning; it can only strengthen what has already been learned.'
                    ],
                    questions: [
                        { id: 'R2-1', kind: 'mcq', prompt: 'According to the passage, older views held that during sleep the brain', options: ['stored new memories', 'mostly rested', 'dreamed constantly', 'repaired the body'], answer: 'B' },
                        { id: 'R2-2', kind: 'mcq', prompt: 'A typical sleep cycle lasts about', options: ['twenty minutes', 'forty-five minutes', 'ninety minutes', 'three hours'], answer: 'C' },
                        { id: 'R2-3', kind: 'mcq', prompt: 'Deep sleep is most common', options: ['early in the night', 'in the middle of the night', 'towards morning', 'during naps only'], answer: 'A' },
                        { id: 'R2-4', kind: 'mcq', prompt: 'In the word-pair study, better recall was linked to', options: ['REM sleep', 'deep sleep', 'light sleep', 'staying awake'], answer: 'B' },
                        { id: 'R2-5', kind: 'mcq', prompt: 'The piano study shows that sleep can', options: ['replace practice', 'improve a practised skill', 'make people learn new music', 'reduce dreaming'], answer: 'B' },
                        { id: 'R2-6', kind: 'fill', prompt: 'Memories of facts move from the hippocampus to the ______. (ONE WORD)', answer: ['cortex', 'the cortex'] },
                        { id: 'R2-7', kind: 'fill', prompt: 'Most vivid dreaming happens during ______ sleep. (ONE WORD)', answer: ['rem'] },
                        { id: 'R2-8', kind: 'fill', prompt: 'Students who study all night before an exam may ______ less. (ONE WORD)', answer: ['remember'] },
                        { id: 'R2-9', kind: 'fill', prompt: 'A nap of about ______ minutes improves alertness. (ONE WORD OR A NUMBER)', answer: ['20', 'twenty'] },
                        { id: 'R2-10', kind: 'fill', prompt: 'Sleep can only strengthen what has already been ______. (ONE WORD)', answer: ['learned', 'learnt'] }
                    ]
                }
            ]
        },
        writing: {
            minutes: 60,
            task1: {
                minWords: 150,
                prompt: 'The chart below shows the percentage of households in a town using five sources of energy for cooking in 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
                chart: {
                    type: 'bar',
                    title: 'Main cooking fuel, % of households',
                    unit: '%',
                    series: ['2000', '2020'],
                    rows: [['LPG gas', 28, 61], ['Firewood', 41, 9], ['Kerosene', 19, 3], ['Electricity', 8, 21], ['Solar', 4, 6]]
                }
            },
            task2: {
                minWords: 250,
                prompt: 'Some people believe that universities should focus on preparing students for jobs, while others think universities should give students a broad education in many subjects. Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.'
            }
        },
        speaking: {
            parts: [
                {
                    id: 'S1', title: 'Part 1 — Introduction and interview', intro: 'Answer each question in two to four sentences, as you would in a conversation.',
                    questions: [
                        { id: 'S1-1', prompt: 'Do you work, or are you a student?' },
                        { id: 'S1-2', prompt: 'What do you like most about the place where you live?' },
                        { id: 'S1-3', prompt: 'How do you usually spend your weekends?' },
                        { id: 'S1-4', prompt: 'Do you prefer reading books or watching films? Why?' }
                    ]
                },
                {
                    id: 'S2', title: 'Part 2 — Long turn', intro: 'You have one minute to prepare. Then speak for one to two minutes.', prepSeconds: 60,
                    questions: [
                        { id: 'S2-1', prompt: 'Describe a skill you learned that was difficult at first.', cue: ['what the skill was', 'how and where you learned it', 'why it was difficult', 'and explain how you feel about it now.'] }
                    ]
                },
                {
                    id: 'S3', title: 'Part 3 — Discussion', intro: 'Give longer answers with reasons and examples.',
                    questions: [
                        { id: 'S3-1', prompt: 'Why do some people give up when learning a new skill?' },
                        { id: 'S3-2', prompt: 'Is it better to learn a skill from a teacher or from the internet?' },
                        { id: 'S3-3', prompt: 'Which skills will be most important for young people in the future?' }
                    ]
                }
            ]
        }
    },
    {
        id: 'academic-2',
        module: 'Academic',
        title: 'Academic Mock Test 2',
        formats: ['Table completion', 'Flow-chart completion', 'Matching headings', 'Summary completion', 'Process diagram'],
        listening: {
            minutes: 30,
            parts: [
                {
                    id: 'L1',
                    title: 'Part 1 — Choosing a gym membership',
                    intro: 'You will hear a man asking about gym memberships. Complete the table and the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
                    script: [
                        ['f', 'Good evening, FitWell Gym, Kavya speaking.'],
                        ['m', "Hi. I'm thinking of joining and I'd like to know about your membership plans."],
                        ['f', 'Sure. We have three plans: Basic, Plus and Premium.'],
                        ['m', 'What does the Basic plan cost?'],
                        ['f', 'Basic is nine hundred rupees a month. That gives you the gym floor only, from six in the morning until ten at night.'],
                        ['m', 'And Plus?'],
                        ['f', 'Plus is fifteen hundred a month. Same hours, but it also includes the swimming pool.'],
                        ['m', 'And the Premium plan?'],
                        ['f', 'Premium is two thousand two hundred a month. You can use every area, the gym is open twenty-four hours for Premium members, and you get a session with a personal trainer once a month.'],
                        ['m', 'Once a month. OK. Is there a joining fee?'],
                        ['f', "Normally yes, but it's waived if you sign up before Friday."],
                        ['m', 'Great. What do I need to bring to sign up?'],
                        ['f', 'Just a photo ID. We take your picture here for the membership card.'],
                        ['m', 'And are there any classes for beginners?'],
                        ['f', 'Yes, your first free class would be yoga, on Tuesday evening.'],
                        ['m', 'Do I need my own lock for the lockers?'],
                        ['f', "No, we provide one. There's a refundable locker deposit of two hundred rupees."],
                        ['m', 'Perfect, thank you.']
                    ],
                    diagram: {
                        type: 'table',
                        title: 'FitWell Gym — membership plans',
                        head: ['Plan', 'Monthly fee', 'Includes', 'Open'],
                        rows: [
                            ['Basic', '₹ {L1-1}', 'gym floor only', '6 am – {L1-2}'],
                            ['Plus', '₹1,500', 'gym and {L1-3}', '6 am – 10 pm'],
                            ['Premium', '₹ {L1-4}', 'all areas + personal {L1-5} once a {L1-6}', '24 hours']
                        ]
                    },
                    questions: [
                        { id: 'L1-1', kind: 'fill', prompt: 'Basic: monthly fee', answer: ['900', 'nine hundred'] },
                        { id: 'L1-2', kind: 'fill', prompt: 'Basic: closing time', answer: ['10 pm', '10', '10pm', 'ten', 'ten pm', '10 at night'] },
                        { id: 'L1-3', kind: 'fill', prompt: 'Plus: includes gym and', answer: ['swimming pool', 'pool'] },
                        { id: 'L1-4', kind: 'fill', prompt: 'Premium: monthly fee', answer: ['2200', '2,200', 'two thousand two hundred'] },
                        { id: 'L1-5', kind: 'fill', prompt: 'Premium: personal', answer: ['trainer'] },
                        { id: 'L1-6', kind: 'fill', prompt: 'Premium: once a', answer: ['month'] },
                        { id: 'L1-7', kind: 'fill', prompt: 'No joining fee if you sign up before ______', answer: ['friday'] },
                        { id: 'L1-8', kind: 'fill', prompt: 'To sign up, bring a ______', answer: ['photo id', 'photo identification', 'photo ID card'] },
                        { id: 'L1-9', kind: 'fill', prompt: 'First free class: ______ on Tuesday', answer: ['yoga'] },
                        { id: 'L1-10', kind: 'fill', prompt: 'Locker deposit: ₹ ______', answer: ['200', 'two hundred'] }
                    ]
                },
                {
                    id: 'L2',
                    title: 'Part 2 — How the city recycles old electronics',
                    intro: 'You will hear an officer from the city council. Questions 11–18: complete the flow-chart with ONE WORD AND/OR A NUMBER. Questions 19–20: choose the correct letter.',
                    script: [
                        ['m', "Good morning. I'm Rahul from the city council's waste team, and I'll explain what happens to the old phones, laptops and chargers you throw away."],
                        ['m', 'First, residents leave items at one of our forty drop-off points, which you will find at libraries and supermarkets.'],
                        ['m', 'A truck collects from every drop-off point once a week, on Wednesday.'],
                        ['m', 'At the recycling centre, the first job is done by hand: workers remove the batteries, because they can catch fire in the machines.'],
                        ['m', 'Next, the devices are shredded into pieces about the size of a coin.'],
                        ['m', 'The pieces then pass under strong magnets, which pull out the iron and steel.'],
                        ['m', 'What remains is sorted by jets of air, which blow the lighter plastic away from the heavier metals such as copper.'],
                        ['m', 'The plastic goes to a factory in Pune that turns it into garden furniture.'],
                        ['m', 'And the metals are sold, and that money pays for computer labs in government schools.'],
                        ['m', 'People often ask how much is recycled. Last year it was seventy-five per cent of everything we collected, up from sixty per cent the year before.'],
                        ['m', 'One last request: before you drop off a phone or a laptop, please delete your personal data. We cannot do that for you.']
                    ],
                    diagram: {
                        type: 'flow',
                        title: 'Recycling electronic waste',
                        steps: [
                            'Items left at one of {L2-1} drop-off points',
                            'Collected by truck every {L2-2}',
                            '{L2-3} removed by hand',
                            'Devices {L2-4} into small pieces',
                            'Iron and steel pulled out by {L2-5}',
                            'Plastic separated from metals by jets of {L2-6}',
                            'Plastic sent to a factory in {L2-7}; metals sold to fund {L2-8} computer labs'
                        ]
                    },
                    questions: [
                        { id: 'L2-1', kind: 'fill', prompt: 'number of drop-off points', answer: ['40', 'forty'] },
                        { id: 'L2-2', kind: 'fill', prompt: 'collection day', answer: ['wednesday'] },
                        { id: 'L2-3', kind: 'fill', prompt: 'removed by hand', answer: ['batteries'] },
                        { id: 'L2-4', kind: 'fill', prompt: 'what happens to devices', answer: ['shredded'] },
                        { id: 'L2-5', kind: 'fill', prompt: 'pulled out by', answer: ['magnets'] },
                        { id: 'L2-6', kind: 'fill', prompt: 'jets of', answer: ['air'] },
                        { id: 'L2-7', kind: 'fill', prompt: 'factory city', answer: ['pune'] },
                        { id: 'L2-8', kind: 'fill', prompt: 'computer labs in', answer: ['school', 'schools', 'government schools', 'government school'] },
                        { id: 'L2-9', kind: 'mcq', prompt: 'Last year, how much of the collected waste was recycled?', options: ['60%', '75%', '90%'], answer: 'B' },
                        { id: 'L2-10', kind: 'mcq', prompt: 'Before dropping off a device, residents should', options: ['delete their personal data', 'remove the cables', 'charge the battery'], answer: 'A' }
                    ]
                }
            ]
        },
        reading: {
            minutes: 40,
            passages: [
                {
                    id: 'R1',
                    title: 'The quiet revival of millets',
                    text: [
                        'For thousands of years, millets such as ragi, jowar and bajra were everyday food across India and Africa. From the 1960s, however, government programmes that raised the yield of rice and wheat made those two grains cheaper and easier to buy, and millets slowly disappeared from many kitchens.',
                        'Millets are remarkably tough plants. Most need far less water than rice, survive long dry spells and grow in poor soil where other crops fail. As rainfall becomes less predictable, many agricultural scientists now see them as a crop suited to a warmer, drier future.',
                        'They are also good for the body. Millets are rich in fibre, iron and calcium — ragi in particular contains more calcium than milk by weight — and they raise blood sugar more slowly than polished white rice, which makes them useful for people with diabetes.',
                        'Yet several problems hold millets back. Removing the hard outer husk takes time and machinery that many villages lack. Millet flour also goes stale quickly, so shops are reluctant to stock it. And in many cities, millets still carry the image of a "poor man\'s food".',
                        'That image is beginning to change. The United Nations named 2023 the International Year of Millets, start-up companies now sell ready-to-cook millet noodles and breakfast cereals, and well-known chefs are putting millet dishes on expensive restaurant menus.'
                    ],
                    questions: [
                        { id: 'R1-1', kind: 'match', prompt: 'Paragraph A', options: ['Why millets fell out of favour', 'Surviving with little water', 'A healthier grain', 'Barriers to wider use', 'New life in the market', 'Selling millets abroad', 'How millets are cooked', 'A threat to rice farmers'], answer: 'A' },
                        { id: 'R1-2', kind: 'match', prompt: 'Paragraph B', options: ['Why millets fell out of favour', 'Surviving with little water', 'A healthier grain', 'Barriers to wider use', 'New life in the market', 'Selling millets abroad', 'How millets are cooked', 'A threat to rice farmers'], answer: 'B' },
                        { id: 'R1-3', kind: 'match', prompt: 'Paragraph C', options: ['Why millets fell out of favour', 'Surviving with little water', 'A healthier grain', 'Barriers to wider use', 'New life in the market', 'Selling millets abroad', 'How millets are cooked', 'A threat to rice farmers'], answer: 'C' },
                        { id: 'R1-4', kind: 'match', prompt: 'Paragraph D', options: ['Why millets fell out of favour', 'Surviving with little water', 'A healthier grain', 'Barriers to wider use', 'New life in the market', 'Selling millets abroad', 'How millets are cooked', 'A threat to rice farmers'], answer: 'D' },
                        { id: 'R1-5', kind: 'match', prompt: 'Paragraph E', options: ['Why millets fell out of favour', 'Surviving with little water', 'A healthier grain', 'Barriers to wider use', 'New life in the market', 'Selling millets abroad', 'How millets are cooked', 'A threat to rice farmers'], answer: 'E' },
                        { id: 'R1-6', kind: 'fill', prompt: 'Summary: Millets were replaced by rice and ______ after the 1960s. (ONE WORD)', answer: ['wheat'] },
                        { id: 'R1-7', kind: 'fill', prompt: 'Summary: They can grow in poor ______. (ONE WORD)', answer: ['soil'] },
                        { id: 'R1-8', kind: 'fill', prompt: 'Summary: By weight, ragi has more calcium than ______. (ONE WORD)', answer: ['milk'] },
                        { id: 'R1-9', kind: 'fill', prompt: 'Summary: Shops avoid millet flour because it goes ______ quickly. (ONE WORD)', answer: ['stale'] },
                        { id: 'R1-10', kind: 'fill', prompt: 'Summary: Start-ups sell ready-to-cook millet noodles and breakfast ______. (ONE WORD)', answer: ['cereals', 'cereal'] }
                    ]
                },
                {
                    id: 'R2',
                    title: 'From bamboo to paper',
                    text: [
                        'Bamboo is one of the fastest-growing plants on Earth, and some species can be harvested only three years after planting, compared with fifteen years or more for many trees grown for paper. For this reason, several Indian paper mills have turned to bamboo as their main raw material.',
                        'Once harvested, the stems are washed and fed into a machine that cuts them into small chips. The chips are then cooked under pressure in a chemical solution. This process, called pulping, breaks down the natural glue that holds the plant together and separates the fibres.',
                        'The brown pulp is washed several times and then bleached. Modern mills use oxygen and hydrogen peroxide for this stage rather than chlorine, which produces harmful waste. Most of the water used in the mill is cleaned and reused, so the factory takes far less from the local river than older mills did.',
                        'Next, the clean pulp is mixed with large amounts of water and sprayed evenly onto a fast-moving mesh screen. As the water drains through the screen, the fibres knit together into a thin, wet sheet.',
                        'The sheet passes between heavy rollers that squeeze out more water and is then dried by running it over a series of steam-heated cylinders. Finally, the finished paper is wound onto enormous reels, ready to be cut to size.'
                    ],
                    diagram: {
                        type: 'flow',
                        title: 'Making paper from bamboo',
                        steps: [
                            'Bamboo harvested after {R2-1} years',
                            'Stems washed and cut into {R2-2}',
                            'Cooked in a chemical solution to separate the {R2-3}',
                            'Pulp bleached using {R2-4} and hydrogen peroxide',
                            'Sprayed onto a moving mesh {R2-5}',
                            'Pressed by rollers, then dried over heated {R2-6}'
                        ]
                    },
                    questions: [
                        { id: 'R2-1', kind: 'fill', prompt: 'years before harvest', answer: ['3', 'three'] },
                        { id: 'R2-2', kind: 'fill', prompt: 'cut into', answer: ['chips', 'small chips'] },
                        { id: 'R2-3', kind: 'fill', prompt: 'separate the', answer: ['fibres', 'fibers'] },
                        { id: 'R2-4', kind: 'fill', prompt: 'bleached using', answer: ['oxygen'] },
                        { id: 'R2-5', kind: 'fill', prompt: 'moving mesh', answer: ['screen'] },
                        { id: 'R2-6', kind: 'fill', prompt: 'heated', answer: ['cylinders'] },
                        { id: 'R2-7', kind: 'tfng', prompt: 'Bamboo can be harvested sooner than many trees used for paper.', answer: 'TRUE' },
                        { id: 'R2-8', kind: 'tfng', prompt: 'Modern bamboo mills bleach pulp with chlorine.', answer: 'FALSE' },
                        { id: 'R2-9', kind: 'tfng', prompt: 'Most of the water in the mill is used again.', answer: 'TRUE' },
                        { id: 'R2-10', kind: 'tfng', prompt: 'Bamboo paper costs more than paper made from wood.', answer: 'NOT GIVEN' }
                    ]
                }
            ]
        },
        writing: {
            minutes: 60,
            task1: {
                minWords: 150,
                prompt: 'The diagram below shows how rainwater is collected and used in an office building. Summarise the information by selecting and reporting the main features. Write at least 150 words.',
                chart: {
                    type: 'process',
                    title: 'Rainwater harvesting in an office building',
                    steps: [
                        { title: 'Rain falls on the roof', text: 'Flat roof, 1,200 m²' },
                        { title: 'Gutters and down-pipes', text: 'Carry water to ground level' },
                        { title: 'First filter', text: 'Removes leaves and grit' },
                        { title: 'Underground tank', text: 'Stores up to 50,000 litres · overflow to the street drain' },
                        { title: 'Pump and UV treatment', text: 'Kills bacteria' },
                        { title: 'Used in the building', text: 'Toilets and garden watering (not for drinking)' }
                    ]
                }
            },
            task2: {
                minWords: 250,
                prompt: 'In many countries, more and more people are working from home instead of in an office. Do the advantages of this trend outweigh the disadvantages? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.'
            }
        },
        speaking: {
            parts: [
                {
                    id: 'S1', title: 'Part 1 — Introduction and interview', intro: 'Answer each question in two to four sentences, as you would in a conversation.',
                    questions: [
                        { id: 'S1-1', prompt: 'Where is your hometown, and what is it known for?' },
                        { id: 'S1-2', prompt: 'What kind of food do you enjoy most?' },
                        { id: 'S1-3', prompt: 'How much time do you spend on your phone each day?' },
                        { id: 'S1-4', prompt: 'What kind of music do you listen to?' }
                    ]
                },
                {
                    id: 'S2', title: 'Part 2 — Long turn', intro: 'You have one minute to prepare. Then speak for one to two minutes.', prepSeconds: 60,
                    questions: [
                        { id: 'S2-1', prompt: 'Describe a time when you helped someone.', cue: ['who you helped', 'what the problem was', 'how you helped them', 'and explain how you felt afterwards.'] }
                    ]
                },
                {
                    id: 'S3', title: 'Part 3 — Discussion', intro: 'Give longer answers with reasons and examples.',
                    questions: [
                        { id: 'S3-1', prompt: 'Why do some people help strangers while others do not?' },
                        { id: 'S3-2', prompt: 'Should schools make volunteering part of the timetable?' },
                        { id: 'S3-3', prompt: 'Has technology made people more or less helpful to each other?' }
                    ]
                }
            ]
        }
    },
    {
        id: 'general-1',
        module: 'General Training',
        title: 'General Training Mock Test 1',
        formats: ['Map labelling', 'Sentence completion', 'Flow-chart (word list)', 'Multiple answers', 'Short answer', 'Matching features', 'Diagram labelling', 'Yes / No / Not Given', 'Letter writing'],
        listening: {
            minutes: 30,
            parts: [
                {
                    id: 'L1',
                    title: 'Part 1 — A tour of the new community centre',
                    intro: 'You will hear a guide showing visitors around a community centre. Questions 1–6: label the plan — write the correct letter, A–H. Questions 7–10: complete the sentences with NO MORE THAN TWO WORDS AND/OR A NUMBER.',
                    script: [
                        ['f', "Welcome to the Greenfield Community Centre. Let me show you where everything is. We're standing at the main entrance, at the front of the building."],
                        ['f', 'As you come in, the reception desk is immediately on your right. That is where you sign in and pay for classes.'],
                        ['f', 'Opposite reception, on your left as you enter, is a small room. That is the first-aid room, so remember where it is.'],
                        ['f', 'In front of you is the main hall, which takes up the middle of the building.'],
                        ['f', 'If you walk to the far left corner, right at the back of the building, you will find the café.'],
                        ['f', 'Directly behind the main hall, in the middle of the back wall, is the library.'],
                        ['f', 'The gym is on the right-hand side of the main hall, about halfway along.'],
                        ['f', "And on the left-hand side of the main hall, between the café and the front of the building, is the children's play area."],
                        ['f', 'A few practical things. The centre opens at seven thirty on weekdays and at nine at weekends.'],
                        ['f', 'Members get a ten per cent discount at the café.'],
                        ['f', 'The play area is only for children under eight, and a parent must stay with them.'],
                        ['f', 'And if you cycle here, please leave your bike in the rack by the side gate, not at the front door.']
                    ],
                    diagram: {
                        type: 'map',
                        title: 'Greenfield Community Centre — ground floor',
                        width: 600, height: 380,
                        rooms: [
                            { letter: 'A', x: 20, y: 20, w: 160, h: 95 }, { letter: 'B', x: 200, y: 20, w: 200, h: 80 }, { letter: 'C', x: 420, y: 20, w: 160, h: 95 },
                            { letter: 'D', x: 20, y: 135, w: 160, h: 100 }, { letter: 'E', x: 420, y: 135, w: 160, h: 100 },
                            { letter: 'F', x: 20, y: 255, w: 160, h: 85 }, { letter: 'H', x: 200, y: 265, w: 70, h: 75 }, { letter: 'G', x: 420, y: 255, w: 160, h: 85 }
                        ],
                        landmarks: [{ label: 'Main hall', x: 200, y: 115, w: 200, h: 135 }, { label: 'Entrance', x: 280, y: 345, w: 120, h: 30, door: true }]
                    },
                    questions: [
                        { id: 'L1-1', kind: 'label', prompt: 'Reception', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], answer: 'G' },
                        { id: 'L1-2', kind: 'label', prompt: 'First-aid room', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], answer: 'H' },
                        { id: 'L1-3', kind: 'label', prompt: 'Café', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], answer: 'A' },
                        { id: 'L1-4', kind: 'label', prompt: 'Library', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], answer: 'B' },
                        { id: 'L1-5', kind: 'label', prompt: 'Gym', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], answer: 'E' },
                        { id: 'L1-6', kind: 'label', prompt: "Children's play area", options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], answer: 'D' },
                        { id: 'L1-7', kind: 'sentence', prompt: 'On weekdays the centre opens at ______.', answer: ['7.30', '7:30', 'seven thirty', '7.30 am', '7:30 am', 'half past seven'] },
                        { id: 'L1-8', kind: 'sentence', prompt: 'Members get a ______ discount at the café.', answer: ['10%', '10 per cent', 'ten per cent', '10 percent', 'ten percent'] },
                        { id: 'L1-9', kind: 'sentence', prompt: 'The play area is for children under ______.', answer: ['8', 'eight'] },
                        { id: 'L1-10', kind: 'sentence', prompt: 'Bikes should be left in the ______ by the side gate.', answer: ['rack', 'bike rack', 'cycle rack'] }
                    ]
                },
                {
                    id: 'L2',
                    title: 'Part 2 — Joining the community garden',
                    intro: 'You will hear a talk about a community garden. Questions 11–16: complete the flow-chart — choose SIX answers from the box, A–I. Questions 17–18: choose TWO letters for each. Questions 19–20: answer with NO MORE THAN TWO WORDS AND/OR A NUMBER.',
                    script: [
                        ['m', "Hello everyone. I'm Arjun, and I coordinate the Lakeside Community Garden. We have sixty plots, and a few are free this season, so let me explain how to join."],
                        ['m', 'Step one is simple: fill in the application form on our website.'],
                        ['m', 'Next, everyone attends a short induction session on a Saturday morning, where we show you the rules and the tool shed.'],
                        ['m', 'Then you pay a deposit for the tools. You get it back when you leave.'],
                        ['m', 'After that, you are given your plot, along with a key to the main gate.'],
                        ['m', 'In your first season, we ask you to grow only organic crops — no chemical sprays at all.'],
                        ['m', 'And finally, each month, every member gives a small share of what they grow to the local food bank.'],
                        ['m', 'What do you get for free? Seeds are free for every member, and so is water from our rain tanks. Gloves and compost you buy yourself, and fencing is shared.'],
                        ['m', 'I should be honest about the problems. Slugs are a constant battle, especially after rain, and in summer water can run short, so we sometimes limit watering to evenings.'],
                        ['m', 'If anything goes wrong on your plot, please speak to the coordinator — that is me — rather than to other members. Thank you.']
                    ],
                    diagram: {
                        type: 'flow',
                        title: 'Joining the garden',
                        choices: ['application', 'deposit', 'induction', 'key', 'organic', 'food bank', 'licence', 'map', 'market'],
                        steps: [
                            'Fill in the {L2-1} form online',
                            'Attend a short {L2-2} session on Saturday',
                            'Pay a {L2-3} for the tools',
                            'Receive a plot and a {L2-4} to the gate',
                            'Grow only {L2-5} crops in the first season',
                            'Each month, give some produce to the {L2-6}'
                        ]
                    },
                    questions: [
                        { id: 'L2-1', kind: 'choose', prompt: 'Fill in the ______ form online', answer: 'A' },
                        { id: 'L2-2', kind: 'choose', prompt: 'Attend a short ______ session', answer: 'C' },
                        { id: 'L2-3', kind: 'choose', prompt: 'Pay a ______ for the tools', answer: 'B' },
                        { id: 'L2-4', kind: 'choose', prompt: 'Receive a plot and a ______', answer: 'D' },
                        { id: 'L2-5', kind: 'choose', prompt: 'Grow only ______ crops', answer: 'E' },
                        { id: 'L2-6', kind: 'choose', prompt: 'Give produce to the ______', answer: 'F' },
                        { id: 'L2-7', kind: 'multi', prompt: 'Which TWO things do members get for free?', options: ['gloves', 'seeds', 'water', 'compost', 'fencing'], answer: ['B', 'C'] },
                        { id: 'L2-8', kind: 'multi', prompt: 'Which TWO problems does the speaker mention?', options: ['slugs', 'theft', 'late payments', 'noise', 'water shortages in summer'], answer: ['A', 'E'] },
                        { id: 'L2-9', kind: 'fill', prompt: 'How many plots does the garden have?', answer: ['60', 'sixty'] },
                        { id: 'L2-10', kind: 'fill', prompt: 'Who should members contact about problems?', answer: ['coordinator', 'the coordinator', 'arjun'] }
                    ]
                }
            ]
        },
        reading: {
            minutes: 40,
            passages: [
                {
                    id: 'R1',
                    title: 'Three gyms near you',
                    text: [
                        'IronWorks Fitness. Open 24 hours, seven days a week. We keep it simple: no classes, just the best equipment in town and plenty of space. Monthly membership ₹1,200, or ₹900 for students with a valid college ID. Free parking in the basement.',
                        'Lotus Wellness Studio. Yoga and pilates classes for all levels, with women-only sessions every morning. Your first class is free. After that, pay ₹300 per class or ₹2,500 for a card of ten. Two minutes from the metro station. Closed on Mondays.',
                        'Splash & Sweat Club. A 25-metre swimming pool, a fully equipped gym and a café serving healthy meals. Family membership is ₹4,000 a month for two adults and two children, and children can join swimming lessons at weekends. Join in December and we will not charge the joining fee.'
                    ],
                    questions: [
                        { id: 'R1-1', kind: 'match', prompt: 'offers a lower price for students', options: ['IronWorks Fitness', 'Lotus Wellness Studio', 'Splash & Sweat Club'], answer: 'A' },
                        { id: 'R1-2', kind: 'match', prompt: 'is closed one day a week', options: ['IronWorks Fitness', 'Lotus Wellness Studio', 'Splash & Sweat Club'], answer: 'B' },
                        { id: 'R1-3', kind: 'match', prompt: 'has lessons for children', options: ['IronWorks Fitness', 'Lotus Wellness Studio', 'Splash & Sweat Club'], answer: 'C' },
                        { id: 'R1-4', kind: 'match', prompt: 'lets you try a class without paying', options: ['IronWorks Fitness', 'Lotus Wellness Studio', 'Splash & Sweat Club'], answer: 'B' },
                        { id: 'R1-5', kind: 'match', prompt: 'does not run any classes', options: ['IronWorks Fitness', 'Lotus Wellness Studio', 'Splash & Sweat Club'], answer: 'A' },
                        { id: 'R1-6', kind: 'sentence', prompt: 'Lotus Wellness Studio is close to the ______ station. (ONE WORD)', answer: ['metro'] },
                        { id: 'R1-7', kind: 'sentence', prompt: 'A card of ten classes at Lotus costs ₹ ______. (A NUMBER)', answer: ['2500', '2,500'] },
                        { id: 'R1-8', kind: 'sentence', prompt: 'Splash & Sweat does not charge a joining fee in ______. (ONE WORD)', answer: ['december'] },
                        { id: 'R1-9', kind: 'sentence', prompt: 'IronWorks members can park in the ______. (ONE WORD)', answer: ['basement'] },
                        { id: 'R1-10', kind: 'sentence', prompt: 'Splash & Sweat has a ______ that serves healthy meals. (ONE WORD)', answer: ['café', 'cafe'] }
                    ]
                },
                {
                    id: 'R2',
                    title: 'Fire extinguishers at work: a short guide',
                    text: [
                        'Every employee, not only the safety officer, should know how to use a fire extinguisher. A small fire caught in its first minute can often be put out; a few minutes later, it may fill a room with smoke.',
                        'Before you need it, learn the parts. At the very top is the pressure gauge: its needle should point to the green zone, and it is worth glancing at it once a month. Through the handle runs a safety pin, which stops the extinguisher from being set off by accident. The handle itself is a lever that you squeeze to release the contents. These travel down a short hose and come out of the nozzle at its end.',
                        'To remember what to do, think of the word PASS. Pull the pin. Aim the nozzle at the base of the fire, not at the flames — the flames are only the visible part, and spraying them does little. Squeeze the handle. Sweep the nozzle from side to side until the fire is out.',
                        'Know your limits. If a fire is bigger than a waste-paper basket, or the room is filling with smoke, do not try to fight it: leave the building, close doors behind you and call the fire service. No piece of office equipment is worth an injury.'
                    ],
                    diagram: {
                        type: 'labelled',
                        art: 'extinguisher',
                        title: 'A fire extinguisher',
                        labels: [
                            { n: 1, text: '{R2-1} — needle should be in the green zone' },
                            { n: 2, text: 'safety {R2-2} — stops accidental use' },
                            { n: 3, text: '{R2-3} — squeeze to release' },
                            { n: 4, text: '{R2-4} — carries the contents down' },
                            { n: 5, text: '{R2-5} — point it at the base of the fire' }
                        ]
                    },
                    questions: [
                        { id: 'R2-1', kind: 'fill', prompt: 'label 1', answer: ['pressure gauge', 'gauge'] },
                        { id: 'R2-2', kind: 'fill', prompt: 'label 2', answer: ['pin'] },
                        { id: 'R2-3', kind: 'fill', prompt: 'label 3', answer: ['handle', 'lever'] },
                        { id: 'R2-4', kind: 'fill', prompt: 'label 4', answer: ['hose'] },
                        { id: 'R2-5', kind: 'fill', prompt: 'label 5', answer: ['nozzle'] },
                        { id: 'R2-6', kind: 'ynng', prompt: 'Every member of staff should be able to use a fire extinguisher.', answer: 'YES' },
                        { id: 'R2-7', kind: 'ynng', prompt: 'Staff should try to put out a large fire before calling for help.', answer: 'NO' },
                        { id: 'R2-8', kind: 'ynng', prompt: 'It is a good idea to check the pressure gauge monthly.', answer: 'YES' },
                        { id: 'R2-9', kind: 'ynng', prompt: 'Foam extinguishers are better than powder extinguishers.', answer: 'NOT GIVEN' },
                        { id: 'R2-10', kind: 'ynng', prompt: 'Spraying the flames is the most effective way to put out a fire.', answer: 'NO' }
                    ]
                }
            ]
        },
        writing: {
            minutes: 60,
            task1: {
                minWords: 150,
                letter: true,
                prompt: 'You recently bought a pair of wireless headphones online, but they stopped working after one week. Write a letter to the company. In your letter:',
                bullets: ['explain what you bought and when', 'describe the problem', 'say what you would like the company to do'],
                opening: 'Dear Sir or Madam,'
            },
            task2: {
                minWords: 250,
                prompt: 'Some people believe that children should help with household chores from a young age. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.'
            }
        },
        speaking: {
            parts: [
                {
                    id: 'S1', title: 'Part 1 — Introduction and interview', intro: 'Answer each question in two to four sentences, as you would in a conversation.',
                    questions: [
                        { id: 'S1-1', prompt: 'Do you enjoy cooking? Why or why not?' },
                        { id: 'S1-2', prompt: 'How often do you use public transport?' },
                        { id: 'S1-3', prompt: 'What do you usually do to relax?' },
                        { id: 'S1-4', prompt: 'Are you more of a morning person or an evening person?' }
                    ]
                },
                {
                    id: 'S2', title: 'Part 2 — Long turn', intro: 'You have one minute to prepare. Then speak for one to two minutes.', prepSeconds: 60,
                    questions: [
                        { id: 'S2-1', prompt: 'Describe a place in your town where people go to relax.', cue: ['where it is', 'what people do there', 'how often you go there', 'and explain why people like it.'] }
                    ]
                },
                {
                    id: 'S3', title: 'Part 3 — Discussion', intro: 'Give longer answers with reasons and examples.',
                    questions: [
                        { id: 'S3-1', prompt: 'Why are public parks important in cities?' },
                        { id: 'S3-2', prompt: 'Do people today spend less time outdoors than in the past?' },
                        { id: 'S3-3', prompt: 'Who should pay to keep public spaces clean: the government or the people who use them?' }
                    ]
                }
            ]
        }
    }
];

const testOf = (id) => TESTS.find((t) => t.id === id) || null;

/** The test as a student sees it: no answers. */
const publicTest = (t) => ({
    id: t.id,
    title: t.title,
    listening: { minutes: t.listening.minutes, parts: t.listening.parts.map((p) => ({ ...p, questions: p.questions.map(({ answer, ...q }) => q) })) },
    reading: { minutes: t.reading.minutes, passages: t.reading.passages.map((p) => ({ ...p, questions: p.questions.map(({ answer, ...q }) => q) })) },
    writing: t.writing,
    speaking: t.speaking
});

module.exports = { TESTS, BOOKING, testOf, publicTest };
