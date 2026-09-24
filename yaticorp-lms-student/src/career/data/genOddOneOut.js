/**
 * "Odd One Out" sets, built from category lists rather than written one at
 * a time.
 *
 * Three members of one category and one of another. Band one draws the odd
 * item from anywhere, so it stands out; bands two and three draw it from a
 * NEIGHBOURING category — a planet among moons, a unit of force among units
 * of measurement — so the student has to know what the three actually share.
 * Number sets (evens, squares, primes, multiples) join in from band two.
 *
 * Every band gets a hundred and fifty sets from a seeded generator, so the pool is the same
 * on every visit and the question memory can track it.
 *
 * Each item: { items, answer, why, level, tier }.
 */
import { seeded, pick, sample, shuffle, tierOf } from './seeded.js';

const PER_BAND = 150;

/**
 * Categories. `band` is the first band a category appears in; `near` names
 * the categories a hard distractor can be drawn from.
 */
const CATEGORIES = [
  { id: 'pets', label: 'domestic animals', items: ['Cat', 'Dog', 'Horse', 'Rabbit', 'Cow', 'Goat', 'Sheep'], band: 1, near: ['wild'] },
  { id: 'wild', label: 'wild animals', items: ['Tiger', 'Lion', 'Leopard', 'Wolf', 'Bear', 'Cheetah'], band: 1, near: ['pets', 'birds'] },
  { id: 'birds', label: 'birds', items: ['Sparrow', 'Eagle', 'Parrot', 'Owl', 'Crow', 'Pigeon', 'Peacock'], band: 1, near: ['insects', 'wild'] },
  { id: 'insects', label: 'insects', items: ['Ant', 'Bee', 'Butterfly', 'Beetle', 'Moth', 'Wasp'], band: 2, near: ['birds', 'spiders'] },
  { id: 'spiders', label: 'not insects', items: ['Spider', 'Scorpion'], band: 3, near: ['insects'], onlyOdd: true },
  { id: 'fruits', label: 'fruits', items: ['Apple', 'Banana', 'Mango', 'Grape', 'Orange', 'Papaya', 'Cherry'], band: 1, near: ['vegetables'] },
  { id: 'vegetables', label: 'vegetables', items: ['Carrot', 'Spinach', 'Cabbage', 'Onion', 'Potato', 'Brinjal', 'Beetroot'], band: 1, near: ['fruits', 'spices'] },
  { id: 'spices', label: 'spices', items: ['Cumin', 'Turmeric', 'Pepper', 'Clove', 'Cardamom', 'Cinnamon'], band: 2, near: ['vegetables', 'grains'] },
  { id: 'grains', label: 'grains', items: ['Rice', 'Wheat', 'Barley', 'Millet', 'Oats', 'Maize'], band: 2, near: ['spices', 'pulses'] },
  { id: 'pulses', label: 'pulses', items: ['Lentil', 'Chickpea', 'Kidney bean', 'Pea'], band: 3, near: ['grains'] },
  { id: 'colours', label: 'colours', items: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink'], band: 1, near: ['shapes'] },
  { id: 'shapes', label: 'flat shapes', items: ['Circle', 'Square', 'Triangle', 'Pentagon', 'Hexagon', 'Rectangle'], band: 1, near: ['solids'] },
  { id: 'solids', label: 'solid shapes', items: ['Cube', 'Sphere', 'Cylinder', 'Cone', 'Pyramid', 'Prism'], band: 2, near: ['shapes'] },
  { id: 'days', label: 'days of the week', items: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], band: 1, near: ['months'] },
  { id: 'months', label: 'months', items: ['January', 'March', 'April', 'June', 'August', 'October', 'December'], band: 1, near: ['days', 'seasons'] },
  { id: 'seasons', label: 'seasons', items: ['Summer', 'Winter', 'Monsoon', 'Spring', 'Autumn'], band: 2, near: ['months', 'weather'] },
  { id: 'weather', label: 'kinds of weather', items: ['Rain', 'Snow', 'Hail', 'Fog', 'Sleet', 'Drizzle'], band: 1, near: ['seasons'] },
  { id: 'body', label: 'parts of the body', items: ['Eye', 'Ear', 'Nose', 'Hand', 'Knee', 'Elbow'], band: 1, near: ['organs', 'bones'] },
  { id: 'organs', label: 'internal organs', items: ['Heart', 'Lung', 'Kidney', 'Liver', 'Stomach', 'Brain'], band: 2, near: ['bones', 'body'] },
  { id: 'bones', label: 'bones', items: ['Femur', 'Skull', 'Rib', 'Spine', 'Tibia', 'Pelvis'], band: 3, near: ['organs'] },
  { id: 'stationery', label: 'things to write with', items: ['Pen', 'Pencil', 'Chalk', 'Marker', 'Crayon'], band: 1, near: ['tools'] },
  { id: 'tools', label: 'tools', items: ['Hammer', 'Saw', 'Wrench', 'Drill', 'Chisel', 'Pliers'], band: 1, near: ['stationery', 'kitchen'] },
  { id: 'kitchen', label: 'kitchen items', items: ['Spoon', 'Ladle', 'Kettle', 'Pan', 'Grater', 'Whisk'], band: 1, near: ['tools', 'furniture'] },
  { id: 'furniture', label: 'furniture', items: ['Chair', 'Table', 'Sofa', 'Bed', 'Wardrobe', 'Shelf'], band: 1, near: ['kitchen'] },
  { id: 'instruments', label: 'musical instruments', items: ['Guitar', 'Drum', 'Flute', 'Violin', 'Sitar', 'Piano', 'Tabla'], band: 1, near: ['arts'] },
  { id: 'arts', label: 'art forms', items: ['Painting', 'Sculpture', 'Dance', 'Theatre', 'Pottery'], band: 2, near: ['instruments', 'writing'] },
  { id: 'writing', label: 'kinds of writing', items: ['Novel', 'Essay', 'Memoir', 'Biography', 'Play'], band: 2, near: ['arts'] },
  { id: 'poems', label: 'forms of poem', items: ['Sonnet', 'Haiku', 'Limerick', 'Ode', 'Ballad'], band: 3, near: ['writing', 'figures'] },
  { id: 'figures', label: 'figures of speech', items: ['Simile', 'Metaphor', 'Alliteration', 'Hyperbole', 'Irony', 'Personification'], band: 3, near: ['poems', 'grammar'] },
  { id: 'grammar', label: 'parts of speech', items: ['Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Preposition'], band: 2, near: ['figures', 'punctuation'] },
  { id: 'punctuation', label: 'punctuation marks', items: ['Comma', 'Colon', 'Hyphen', 'Apostrophe', 'Bracket'], band: 3, near: ['grammar'] },
  { id: 'cities', label: 'Indian cities', items: ['Delhi', 'Mumbai', 'Chennai', 'Kolkata', 'Bengaluru', 'Hyderabad', 'Pune'], band: 1, near: ['countries', 'states'] },
  { id: 'countries', label: 'countries', items: ['France', 'Japan', 'Brazil', 'Kenya', 'Canada', 'Egypt', 'Nepal'], band: 1, near: ['cities', 'continents'] },
  { id: 'states', label: 'Indian states', items: ['Kerala', 'Gujarat', 'Punjab', 'Assam', 'Odisha', 'Bihar'], band: 2, near: ['cities', 'countries'] },
  { id: 'continents', label: 'continents', items: ['Asia', 'Africa', 'Europe', 'Australia', 'Antarctica'], band: 2, near: ['countries', 'oceans'] },
  { id: 'oceans', label: 'oceans', items: ['Pacific', 'Atlantic', 'Indian', 'Arctic', 'Southern'], band: 2, near: ['continents', 'rivers'] },
  { id: 'rivers', label: 'rivers', items: ['Ganga', 'Nile', 'Amazon', 'Danube', 'Yamuna', 'Thames'], band: 2, near: ['oceans', 'mountains'] },
  { id: 'mountains', label: 'mountains', items: ['Everest', 'Kilimanjaro', 'Fuji', 'Kanchenjunga', 'Denali'], band: 2, near: ['rivers', 'deserts'] },
  { id: 'deserts', label: 'deserts', items: ['Sahara', 'Gobi', 'Thar', 'Kalahari', 'Atacama'], band: 3, near: ['mountains', 'rivers'] },
  { id: 'languages', label: 'languages', items: ['Hindi', 'Tamil', 'Sanskrit', 'Bengali', 'Marathi', 'Telugu'], band: 1, near: ['subjects'] },
  { id: 'subjects', label: 'school subjects', items: ['Algebra', 'History', 'Physics', 'Geography', 'Chemistry'], band: 1, near: ['languages'] },
  { id: 'planets', label: 'planets', items: ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Neptune'], band: 2, near: ['moons', 'stars'] },
  { id: 'moons', label: 'moons', items: ['Europa', 'Titan', 'Phobos', 'Ganymede', 'Io'], band: 3, near: ['planets'] },
  { id: 'stars', label: 'stars', items: ['Sun', 'Sirius', 'Polaris', 'Vega', 'Betelgeuse'], band: 3, near: ['planets', 'moons'] },
  { id: 'metals', label: 'metals', items: ['Copper', 'Iron', 'Zinc', 'Gold', 'Silver', 'Tin', 'Aluminium'], band: 2, near: ['gases', 'nonmetals'] },
  { id: 'gases', label: 'gases', items: ['Oxygen', 'Nitrogen', 'Helium', 'Argon', 'Neon', 'Hydrogen'], band: 2, near: ['metals', 'nonmetals'] },
  { id: 'nonmetals', label: 'solid non-metals', items: ['Carbon', 'Sulphur', 'Phosphorus', 'Iodine'], band: 3, near: ['metals', 'gases'] },
  { id: 'siunits', label: 'base SI units', items: ['Kilogram', 'Metre', 'Second', 'Kelvin', 'Ampere', 'Mole'], band: 3, near: ['derived', 'temperature'] },
  { id: 'derived', label: 'derived units', items: ['Newton', 'Joule', 'Watt', 'Pascal', 'Volt', 'Ohm'], band: 3, near: ['siunits', 'temperature'] },
  { id: 'temperature', label: 'temperature scales', items: ['Celsius', 'Fahrenheit', 'Kelvin'], band: 3, near: ['derived'], onlyOdd: true },
  { id: 'volume', label: 'units of volume', items: ['Litre', 'Millilitre', 'Gallon', 'Pint'], band: 2, near: ['length', 'mass'] },
  { id: 'length', label: 'units of length', items: ['Metre', 'Inch', 'Mile', 'Kilometre', 'Foot'], band: 2, near: ['volume', 'mass'] },
  { id: 'mass', label: 'units of mass', items: ['Gram', 'Kilogram', 'Tonne', 'Pound', 'Ounce'], band: 2, near: ['volume', 'length'] },
  { id: 'organelles', label: 'parts of a cell', items: ['Mitochondrion', 'Ribosome', 'Nucleus', 'Vacuole', 'Chloroplast'], band: 3, near: ['tissues'] },
  { id: 'tissues', label: 'tissues', items: ['Tendon', 'Cartilage', 'Muscle', 'Ligament'], band: 3, near: ['organelles', 'organs'] },
  { id: 'processes', label: 'life processes', items: ['Photosynthesis', 'Respiration', 'Digestion', 'Excretion', 'Reproduction'], band: 3, near: ['forces'] },
  { id: 'forces', label: 'forces', items: ['Gravity', 'Friction', 'Tension', 'Magnetism', 'Buoyancy'], band: 3, near: ['processes', 'energy'] },
  { id: 'energy', label: 'forms of energy', items: ['Heat', 'Light', 'Sound', 'Kinetic', 'Chemical'], band: 3, near: ['forces'] },
  { id: 'governments', label: 'forms of government', items: ['Democracy', 'Monarchy', 'Oligarchy', 'Republic', 'Dictatorship'], band: 3, near: ['economics'] },
  { id: 'economics', label: 'economic terms', items: ['Inflation', 'Revenue', 'Deficit', 'Subsidy', 'Tariff'], band: 3, near: ['governments', 'stats'] },
  { id: 'stats', label: 'averages', items: ['Mean', 'Median', 'Mode'], band: 2, near: ['maths'], onlyOdd: true },
  { id: 'maths', label: 'branches of mathematics', items: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'], band: 3, near: ['stats', 'subjects'] },
  { id: 'languagesCode', label: 'programming languages', items: ['Python', 'Java', 'Ruby', 'Kotlin', 'Swift', 'Go'], band: 1, near: ['os', 'protocols', 'markup'] },
  { id: 'os', label: 'operating systems', items: ['Linux', 'Windows', 'Android', 'macOS'], band: 1, near: ['languagesCode', 'browsers'] },
  { id: 'browsers', label: 'web browsers', items: ['Chrome', 'Firefox', 'Safari', 'Edge'], band: 2, near: ['os', 'languagesCode'] },
  { id: 'protocols', label: 'network protocols', items: ['HTTP', 'FTP', 'SMTP', 'TCP', 'SSH', 'DNS'], band: 2, near: ['markup', 'languagesCode'] },
  { id: 'markup', label: 'markup and style languages', items: ['HTML', 'CSS', 'XML', 'Markdown'], band: 2, near: ['protocols', 'languagesCode'] },
  { id: 'structures', label: 'data structures', items: ['Stack', 'Queue', 'Tree', 'Graph', 'Array', 'Heap'], band: 3, near: ['algorithms', 'oop'] },
  { id: 'algorithms', label: 'sorting algorithms', items: ['Quicksort', 'Mergesort', 'Heapsort', 'Bubble sort'], band: 3, near: ['structures', 'oop'] },
  { id: 'oop', label: 'object-oriented principles', items: ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction'], band: 3, near: ['structures', 'algorithms'] },
  { id: 'sports', label: 'sports', items: ['Cricket', 'Football', 'Hockey', 'Tennis', 'Badminton', 'Kabaddi'], band: 1, near: ['games'] },
  { id: 'games', label: 'board games', items: ['Chess', 'Ludo', 'Carrom', 'Draughts', 'Scrabble'], band: 1, near: ['sports'] },
  { id: 'vehicles', label: 'road vehicles', items: ['Car', 'Bus', 'Truck', 'Scooter', 'Van', 'Bicycle'], band: 1, near: ['vessels', 'aircraft'] },
  { id: 'vessels', label: 'water vessels', items: ['Boat', 'Ship', 'Canoe', 'Ferry', 'Yacht'], band: 1, near: ['vehicles', 'aircraft'] },
  { id: 'aircraft', label: 'aircraft', items: ['Plane', 'Helicopter', 'Glider', 'Balloon'], band: 2, near: ['vehicles', 'vessels'] },
  { id: 'professions', label: 'professions', items: ['Doctor', 'Teacher', 'Lawyer', 'Engineer', 'Nurse', 'Pilot'], band: 1, near: ['places'] },
  { id: 'places', label: 'places of work', items: ['Hospital', 'School', 'Court', 'Factory', 'Studio'], band: 1, near: ['professions'] },
  { id: 'clothing', label: 'clothing', items: ['Shirt', 'Trousers', 'Jacket', 'Saree', 'Kurta', 'Scarf'], band: 1, near: ['footwear'] },
  { id: 'footwear', label: 'footwear', items: ['Shoe', 'Sandal', 'Boot', 'Slipper'], band: 1, near: ['clothing'] },
  { id: 'currencies', label: 'currencies', items: ['Rupee', 'Dollar', 'Yen', 'Euro', 'Pound', 'Dirham'], band: 2, near: ['countries'] },
  { id: 'senses', label: 'senses', items: ['Sight', 'Hearing', 'Taste', 'Smell', 'Touch'], band: 2, near: ['emotions'] },
  { id: 'emotions', label: 'emotions', items: ['Joy', 'Anger', 'Fear', 'Sadness', 'Surprise'], band: 2, near: ['senses'] }
];

const byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

/** Number sets, for bands two and three. */
const NUMBER_SETS = [
  { label: 'even numbers', items: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], odd: [3, 5, 7, 9, 11, 13, 15], band: 2 },
  { label: 'odd numbers', items: [1, 3, 5, 7, 9, 11, 13, 15, 17], odd: [2, 4, 6, 8, 10, 12], band: 2 },
  { label: 'multiples of 5', items: [5, 10, 15, 20, 25, 30, 35, 40], odd: [12, 18, 22, 27, 33], band: 2 },
  { label: 'multiples of 3', items: [3, 6, 9, 12, 15, 18, 21, 24], odd: [10, 14, 16, 20, 22], band: 2 },
  { label: 'square numbers', items: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100], odd: [8, 12, 20, 30, 50, 72], band: 2 },
  { label: 'prime numbers', items: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29], odd: [9, 15, 21, 25, 27], band: 3 },
  { label: 'cube numbers', items: [1, 8, 27, 64, 125], odd: [16, 36, 50, 100], band: 3 },
  { label: 'powers of 2', items: [2, 4, 8, 16, 32, 64, 128], odd: [6, 12, 24, 48, 96], band: 3 },
  { label: 'multiples of 7', items: [7, 14, 21, 28, 35, 42, 49, 56], odd: [27, 32, 40, 45, 50], band: 3 },
  { label: 'triangular numbers', items: [1, 3, 6, 10, 15, 21, 28], odd: [4, 8, 12, 18, 25], band: 3 }
];

const wordSet = (rng, band, hard) => {
  const home = pick(rng, CATEGORIES.filter((c) => c.band <= band && !c.onlyOdd && c.items.length >= 3));
  const three = sample(rng, home.items, 3);
  let other;
  if (hard) {
    const near = home.near.map((id) => byId[id]).filter((c) => c && c.band <= band + 1);
    other = near.length ? pick(rng, near) : null;
  }
  if (!other) other = pick(rng, CATEGORIES.filter((c) => c.id !== home.id && c.band <= band && !c.onlyOdd));
  // The odd item must not also belong to the home category under another name.
  const candidates = other.items.filter((it) => !home.items.includes(it));
  if (!candidates.length) return null;
  const odd = pick(rng, candidates);
  return { items: shuffle(rng, [...three, odd]), answer: odd, why: `The others are ${home.label}` };
};

const numberSet = (rng, band) => {
  const set = pick(rng, NUMBER_SETS.filter((s) => s.band <= band));
  const three = sample(rng, set.items, 3);
  const odd = pick(rng, set.odd.filter((n) => !set.items.includes(n)));
  return { items: shuffle(rng, [...three, odd]).map(String), answer: String(odd), why: `The others are ${set.label}` };
};

/** The whole pool, every band, ordered easy to hard inside each band. */
export const buildOddOneOut = () => {
  const out = [];
  for (const band of [1, 2, 3]) {
    const rng = seeded(4400 + band);
    const seen = new Set();
    let i = 0;
    let guard = 0;
    while (i < PER_BAND && guard < PER_BAND * 60) {
      guard += 1;
      const progress = i / PER_BAND;
      let q;
      if (band >= 2 && i % 4 === 3) q = numberSet(rng, band);
      else q = wordSet(rng, band, band === 1 ? progress > 0.7 : true);
      if (!q) continue;
      const key = [...q.items].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...q, level: band, tier: tierOf(i, PER_BAND) });
      i += 1;
    }
  }
  return out;
};
