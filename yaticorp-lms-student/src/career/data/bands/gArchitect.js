/**
 * Verbal Architect (Master Minds, Classes 11–12) — pure, seeded rounds.
 *
 * Each paragraph is written so that only one order reads logically: the opening sentence introduces the topic,
 * and every later one is tied to what comes before by a connective ("however", "as a result"), a reference back
 * ("this", "these markings", "he"), or a time order. The sentences are dealt shuffled (never already in order)
 * and the player drags them back into the paragraph.
 *
 * Difficulty sets the length: 4, 5 or 6 sentences.
 */
import { sample, shuffle } from '../seeded.js';

export const PARAGRAPHS = [
  // ── four sentences ──
  ['Honeybees cannot see the colour red.', 'They can, however, see ultraviolet light, which is invisible to humans.', 'Many flowers have ultraviolet patterns on their petals that work like landing strips.', 'These hidden markings guide the bees straight to the nectar.'],
  ['The Great Wall of China was not built all at once.', 'The earliest sections were raised by separate states more than two thousand years ago.', 'Later, the Qin dynasty joined several of these walls together.', 'Most of the wall that tourists visit today, however, dates from the much later Ming dynasty.'],
  ['Water expands when it freezes.', 'As a result, ice is less dense than liquid water.', 'This is why ice floats instead of sinking.', 'Because the ice stays on top, lakes freeze from the surface down, and fish survive the winter in the water below.'],
  ['In 1928, Alexander Fleming came back from a holiday to find mould growing on one of his dishes of bacteria.', 'Around the mould, the bacteria had died.', 'He named the substance the mould produced penicillin.', 'More than a decade later, other scientists turned it into the first widely used antibiotic.'],
  ['Many people assume that a desert must be hot.', 'In fact, a desert is defined by how little rain or snow it receives, not by its temperature.', 'By this definition, Antarctica is the largest desert on Earth.', 'Its vast interior receives only about five centimetres of precipitation a year.'],
  ['The printing press changed how knowledge spread in Europe.', 'Before it, every book had to be copied by hand, a task that could take months.', 'With Gutenberg\'s press, built around 1450, a workshop could instead print hundreds of pages a day.', 'Consequently, books became cheaper, and far more people learned to read.'],
  ['Octopuses are remarkably intelligent.', 'In laboratories, they have learned to unscrew jar lids to reach food inside.', 'Some of these laboratory octopuses have even escaped from their tanks at night.', 'Researchers think such intelligence evolved because, without a shell, an octopus must outwit its predators.'],
  ['A vaccine trains the immune system before it meets a real infection.', 'It does this by showing the body a harmless piece or a weakened form of a germ.', 'The immune system responds by making antibodies and memory cells.', 'If the real germ arrives later, these memory cells recognise it and respond quickly.'],
  ['The Roman city of Pompeii lay hidden for more than 1,500 years.', 'In AD 79, Mount Vesuvius erupted and buried it under metres of ash.', 'The ash preserved buildings, wall paintings and even loaves of bread.', 'When excavations began in the eighteenth century, archaeologists found a Roman town frozen in time.'],
  ['Some words change their meaning dramatically over time.', 'The word "nice", for example, once meant "foolish" or "ignorant".', 'Over the centuries it shifted to mean "precise", and later "pleasant".', 'Today, few speakers would guess its unflattering origin.'],
  ['Mangrove forests grow along many tropical coastlines.', 'Their tangled roots trap mud and slow down incoming waves.', 'During storms, this natural barrier protects the villages behind it from flooding.', 'Where mangroves have been cleared, storm damage along the coast is often far greater.'],
  ['A strong argument begins with a clear claim.', 'Next, it offers evidence that supports the claim.', 'It should then answer the strongest objection to it.', 'Finally, it explains why the claim still stands.'],
  ['Light travels at about 300,000 kilometres per second.', 'Even so, sunlight takes around eight minutes to reach Earth.', 'This means we always see the Sun as it was about eight minutes earlier.', 'Light from distant stars is older still, having travelled for thousands of years or more.'],
  ['The tomato first grew wild in South America.', 'Spanish explorers carried it to Europe in the sixteenth century.', 'At first, many Europeans were suspicious of it, and some grew it only as an ornament.', 'Only later did it become central to the cooking of Italy and other countries.'],
  // ── five sentences ──
  ['Many students believe that rereading their notes is the best way to revise.', 'Research suggests otherwise.', 'In many studies, students who tested themselves remembered far more a week later than those who simply reread.', 'The effort of pulling information out of memory seems to strengthen it.', 'Practice questions are therefore a better use of revision time than rereading.'],
  ['Cities are often several degrees warmer than the countryside around them.', 'This effect is known as the urban heat island.', 'It occurs because concrete and asphalt absorb heat during the day and release it slowly at night.', 'Having fewer trees also means less shade and less cooling from evaporation.', 'To reduce the effect, some cities are planting trees and painting roofs white.'],
  ['The Indian summer monsoon is driven by a difference in temperature between land and sea.', 'In summer, the land heats up faster than the Indian Ocean.', 'Warm air rises over the land, and moist air from the ocean flows in to replace it.', 'As this moist air rises and cools, it releases heavy rain.', 'In winter, the pattern reverses, and dry winds blow from the land towards the sea.'],
  ['Mount Everest grows slightly taller each year.', 'This is because the Indian plate is still pushing north into the Eurasian plate.', 'That collision, which began about 50 million years ago, raised the entire Himalayan range.', 'Erosion wears the peaks down, but at present the uplift is slightly faster.', 'As a result, the world\'s highest mountain is still rising by a few millimetres a year.'],
  ['A power cut swept across the city on Tuesday evening.', 'Engineers quickly traced the fault to a single overloaded substation.', 'Within an hour, they had rerouted power through two neighbouring stations.', 'During that hour, however, the hospital\'s backup generator failed to start.', 'An inquiry has now been ordered into why the generator had not been tested.'],
  ['Antibiotics kill bacteria, but they have no effect on viruses.', 'Despite this, many patients ask for antibiotics when they have a cold, which is caused by a virus.', 'Taking antibiotics unnecessarily gives bacteria more chances to develop resistance.', 'Resistant bacteria can then cause infections that are very hard to treat.', 'For this reason, doctors are urged to prescribe antibiotics only when they are truly needed.'],
  ['Marie Curie was the first person to win Nobel Prizes in two different sciences.', 'Her first, in physics in 1903, was shared with her husband Pierre and with Henri Becquerel.', 'Pierre was killed in a street accident three years later.', 'Marie carried on their work alone and isolated the element radium.', 'For this, she was awarded the 1911 Nobel Prize in Chemistry.'],
  ['Plants make their own food by photosynthesis.', 'In this process, they take in carbon dioxide from the air through tiny pores in their leaves.', 'They also draw up water from the soil through their roots.', 'Using energy from sunlight, they turn these ingredients into sugar.', 'Oxygen is released as a by-product, and it is this oxygen that animals breathe.'],
  ['Early maps of the world were often wildly inaccurate.', 'Mapmakers relied on travellers\' tales, which were incomplete and sometimes invented.', 'The invention of reliable ship\'s clocks in the eighteenth century changed this.', 'With an accurate clock, a navigator could at last work out longitude at sea.', 'Maps soon became far more precise, and voyages far safer.'],
  ['Coral reefs cover less than one per cent of the ocean floor.', 'Yet they are home to roughly a quarter of all known marine species.', 'These reefs are built by tiny animals called polyps, which live together with algae.', 'When the water becomes too warm, the polyps expel the algae and turn white.', 'If this bleaching lasts too long, the coral dies.'],
  ['Shakespeare is often credited with inventing many English words.', 'Some, such as "lonely" and "bedroom", first appear in writing in his plays.', 'However, scholars now think he did not invent most of them.', 'Many were probably already used in speech but had simply never been written down.', 'Even so, his plays helped these words spread and survive.'],
  ['The Arctic is warming faster than almost anywhere else on Earth.', 'One reason is that sea ice reflects most of the sunlight that falls on it.', 'As the ice melts, it uncovers darker ocean water, which absorbs more heat.', 'This extra heat melts even more ice.', 'Scientists call such a self-reinforcing cycle a feedback loop.'],
  ['The human heart beats about 100,000 times a day.', 'With each beat, it pushes blood into two separate circuits.', 'The right side sends blood to the lungs to collect oxygen.', 'The left side then pumps this oxygen-rich blood around the rest of the body.', 'Because its blood must reach every organ, the left side has the thicker, stronger wall.'],
  ['Zero was not always treated as a number.', 'Many ancient systems, including Roman numerals, had no symbol for it at all.', 'Indian mathematicians were among the first to treat zero as a number in its own right.', 'Brahmagupta, writing in AD 628, set out rules for calculating with it.', 'From India, the idea travelled through the Arab world to Europe.'],
  // ── six sentences ──
  ['In 1854, cholera swept through the Soho district of London.', 'At the time, most doctors believed that the disease spread through bad air.', 'The physician John Snow suspected contaminated water instead.', 'He marked each death on a map and found that they clustered around a single water pump on Broad Street.', 'At his urging, the pump\'s handle was removed.', 'The outbreak, already slowing, soon ended, and Snow\'s map became a founding moment of epidemiology.'],
  ['Every formal debate needs a motion: a statement that one side supports and the other opposes.', 'The first speaker for the motion opens by defining its key terms.', 'The first speaker against the motion then responds, accepting or challenging those definitions.', 'Further speakers on each side add new arguments and rebut the other side\'s points.', 'Finally, each team gives a closing summary that introduces no new arguments.', 'The judges then decide which side argued more convincingly.'],
  ['Glass looks solid, but its atoms are arranged in a disordered way, like those of a liquid.', 'This has given rise to a popular myth.', 'According to the myth, old church windows are thicker at the bottom because the glass has slowly flowed downwards over the centuries.', 'In fact, glass at room temperature flows far too slowly for this to happen, even over millions of years.', 'The real reason is that old methods of making window glass produced panes of uneven thickness.', 'Glaziers usually set the thicker edge at the bottom for stability.'],
  ['Until 1752, Britain and its colonies used the Julian calendar.', 'By then, this calendar had drifted eleven days out of step with the seasons.', 'Most of Europe had already switched to the more accurate Gregorian calendar.', 'To catch up, Parliament ordered that eleven days be skipped.', 'As a result, Wednesday 2 September 1752 was followed directly by Thursday 14 September.', 'Popular histories claim that people rioted over the "lost" days, but historians have found little evidence of this.'],
  ['Scientific enquiry often begins with an observation.', 'A scientist might notice, for example, that plants near a window grow towards the light.', 'From this, she forms a hypothesis: the plants bend because more light falls on one side.', 'She then designs an experiment, growing some plants with light from one side and others with light from directly above.', 'If only the first group bends, the results support her hypothesis.', 'Even then, other scientists must repeat the experiment before the idea is widely accepted.'],
  ['Silk was once one of China\'s most closely guarded secrets.', 'For centuries, revealing how it was made could be punished by death.', 'Silk cloth, however, travelled west along trade routes and became a luxury in Rome.', 'Romans prized it so highly that the Senate tried to restrict it as a wasteful extravagance.', 'According to a later account, in the sixth century two monks smuggled silkworm eggs to Constantinople inside hollow canes.', 'From then on, the Byzantine Empire could produce silk of its own.'],
  ['A rainbow forms when sunlight meets raindrops.', 'As light enters a drop, it slows down and bends.', 'Because each colour bends by a slightly different amount, the white light splits into a spectrum.', 'The separated colours then reflect off the back of the drop.', 'They bend again as they leave, spreading even further apart.', 'This is why you see a rainbow only when the Sun is behind you.'],
  ['The Silk Road was not a single road.', 'It was a network of routes linking China with Central Asia, India, Persia and the Mediterranean.', 'Few merchants ever travelled its whole length.', 'Instead, goods passed from trader to trader, changing hands many times along the way.', 'Ideas travelled in the same way, including religions, inventions such as paper, and new crops.', 'In this sense, the routes carried culture as much as they carried silk.'],
  ['Bats hunt in total darkness using echolocation.', 'A bat sends out short calls, most of them too high-pitched for humans to hear.', 'When the sound hits an object, part of it bounces back as an echo.', 'From the time the echo takes to return, the bat judges how far away the object is.', 'As it closes in on an insect, it calls faster and faster to track every movement.', 'Engineers have used the same principle to build sonar for ships.'],
  ['In July 1969, the Apollo 11 mission landed two astronauts on the Moon.', 'Neil Armstrong stepped out first, followed by Buzz Aldrin about twenty minutes later.', 'Meanwhile, Michael Collins stayed in orbit aboard the command module.', 'The two on the surface collected rock samples and set up experiments.', 'After about twenty-one hours on the Moon, they lifted off to rejoin Collins.', 'All three splashed down safely in the Pacific Ocean about three days later.'],
  ['A ship floats because of buoyancy.', 'When a ship sits in water, it pushes some of that water aside.', 'The water pushes back with a force equal to the weight of the water displaced.', 'A steel ship is hollow, so it displaces a large volume of water for its weight.', 'As long as the displaced water weighs as much as the ship, the ship floats.', 'A solid block of steel of the same weight, by contrast, displaces too little water and sinks.'],
  ['Until the 1840s, surgery was terrifyingly painful.', 'Patients were held down while surgeons worked as fast as they could.', 'In 1846, a public demonstration in Boston showed that ether could keep a patient unconscious during an operation.', 'News spread quickly, and anaesthesia was soon used across Europe and America.', 'Yet many patients still died afterwards from infection.', 'That problem began to be solved only in the 1860s, when Joseph Lister introduced antiseptic methods.'],
  ['Owls can turn their heads through about 270 degrees.', 'They need to, because their eyes are fixed in their sockets and cannot move.', 'A twist that far would tear the blood vessels in a human neck.', 'Owls avoid this injury in several ways.', 'Their neck bones leave extra room around the arteries, and the vessels have reservoirs that store blood.', 'Together, these features keep blood flowing to the brain even when the head is fully turned.'],
  ['Paper money first appeared in China.', 'During the Tang dynasty, merchants began leaving heavy coins with trusted agents in exchange for paper receipts.', 'These receipts were far easier to carry on long journeys.', 'By the eleventh century, the Song government had taken over and was issuing official notes.', 'When Marco Polo reached China in the thirteenth century, he was astonished that paper was accepted as money.', 'Europe would not widely adopt paper money for several more centuries.']
];

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN((levelNo - 1) / 29, 0, 1));

/** difficulty → paragraph length 4 / 5 / 6; low steps of difficulty 1 give the opening sentence fixed in place (a given, like a sudoku clue; not a hint button). */
export const architectConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const d = clampN(difficulty || 1, 1, 3);
  return {
    band: ageBand === 'advanced' || !ageBand ? 'advanced' : 'gentle',
    difficulty: d,
    length: 3 + d,
    rounds: ramp(3, 4, levelNo),
    lockFirst: d === 1 && levelNo < 12,
    checks: d === 3 ? 1 : 2
  };
};

/** Shuffled order of 0..n-1 that is not the identity (and, when the first is locked, keeps 0 in place). */
const deal = (rng, n, lockFirst) => {
  const ids = Array.from({ length: n }, (_, i) => i);
  for (let t = 0; t < 50; t++) {
    const rest = shuffle(rng, lockFirst ? ids.slice(1) : ids);
    const order = lockFirst ? [0, ...rest] : rest;
    if (order.some((v, i) => v !== i)) return order;
  }
  return lockFirst ? [0, ...ids.slice(1).reverse()] : [...ids].reverse();
};

/** A round: { sentences (correct order), start: [indices as dealt] }. */
export const makeArchitectLevel = (rng, config) => {
  const fits = PARAGRAPHS.filter((p) => p.length === config.length);
  return sample(rng, fits, config.rounds).map((sentences) => ({ sentences, start: deal(rng, sentences.length, config.lockFirst) }));
};

/** Sentences in their right place, for an order of indices. */
export const placedRight = (order) => order.reduce((n, v, i) => n + (v === i ? 1 : 0), 0);
export const isSolved = (order) => order.every((v, i) => v === i);
