/**
 * WORDCRAFT content banks (2026-11-20, Master Minds · Vocabulary — Class 11 onwards, college students and adults).
 * Pure data. Stage 0 Beginner · 1 Intermediate · 2 Advanced · 3 Expert. Every item has a stable id so the game can
 * remember what a student has already seen and keep the content fresh.
 *
 * Compact lines are parsed once here: 'a|b|c'. Keyword lists are the words that show an answer is on topic; the
 * scorer matches word forms (rain → rainy, raining).
 */

const lines = (stage, text, make) => text.trim().split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => ({ stage, ...make(l.split('|').map((p) => p.trim()), i) }));
const list = (s) => s.split(/[,\s]+/).map((w) => w.trim().toLowerCase()).filter(Boolean);

/* ───────────── 1 · Don't Say That!  target | forbidden words | words that show the meaning got across ───────────── */
const taboo = (stage, text) => lines(stage, text, ([target, ban, keys], i) => ({ id: `t${stage}-${i}`, target, ban: ban.split(',').map((b) => b.trim().toLowerCase()), keys: list(keys) }));
export const TABOO = [
  ...taboo(0, `
umbrella | rain,wet,open,handle | weather shelter cover protect carry sky drops fold
passport | travel,country,visa,airport | document identity photo border trip international stamp
alarm | clock,wake,ring,morning | sound sleep loud bed early time snooze
refrigerator | cold,food,kitchen,ice | cool appliance milk fresh door store vegetables
coffee | drink,cup,caffeine,beans | hot brew espresso energy bitter cafe latte
password | secret,login,account,letters | computer access protect type security code forget
library | books,read,borrow,quiet | shelves study card public librarian silence
elevator | lift,floor,building,up | stairs buttons doors ride down rise tall
wallet | money,cash,pocket,cards | purse leather carry coins notes keep lose
dentist | teeth,doctor,mouth,brush | clinic chair cavity filling smile checkup pain
traffic | cars,road,jam,signal | vehicles busy rush hour stuck lights horn
deadline | date,time,submit,late | finish project due last limit work pressure
selfie | photo,phone,camera,picture | yourself arm smile social post pose front
interview | job,questions,hire,company | candidate employer answer formal nervous resume
vacation | holiday,trip,travel,break | relax rest beach leave week fun escape
microwave | heat,kitchen,oven,food | warm minutes reheat appliance quick popcorn button
headphones | music,ears,listen,sound | wear wire wireless audio volume song noise
recipe | cook,ingredients,food,dish | steps method instructions meal prepare grandmother
marathon | run,race,kilometres,miles | long distance athletes finish line training
subscription | pay,monthly,service,sign | renew cancel plan member access fee streaming
budget | money,spend,plan,save | limit expenses income amount control month salary
volunteer | help,free,unpaid,service | community charity offer time cause willing
`),
  ...taboo(1, `
procrastinate | delay,later,lazy,postpone | avoid task tomorrow habit waiting distract
nostalgia | past,memory,remember,old | longing childhood feeling miss sweet days
ambition | goal,dream,success,want | drive desire achieve future determined aim
compromise | agree,both,middle,give | deal meet settle half sides negotiate
sarcasm | joke,mean,irony,tone | opposite mock humour saying remark bitter
jealousy | envy,want,others,green | feeling resent partner possess threat insecure
empathy | feel,understand,others,shoes | emotion share perspective care compassion kindness
rumour | gossip,true,spread,story | unverified talk hear people whisper false
inflation | prices,rise,money,economy | cost increase value buy goods expensive
algorithm | steps,computer,code,program | instructions rule solve process sequence logic
sustainable | environment,green,future,planet | resources long eco renewable last maintain
introvert | shy,quiet,alone,people | energy social reserved inner prefer solitude
mentor | teacher,guide,advice,student | experienced support career learn coach wise
burnout | tired,stress,work,exhausted | overwork energy drained rest fatigue mental
influencer | social,media,followers,instagram | online brands promote content popular audience
negotiate | deal,agree,price,discuss | terms bargain compromise offer contract both
curiosity | question,know,learn,wonder | interest explore discover eager why new
resilience | strong,recover,bounce,tough | setback adapt overcome difficulty persist hardship
multitask | many,same,time,juggle | tasks several simultaneously switch busy handle
feedback | opinion,comment,review,response | improve criticism advice performance suggest information
`),
  ...taboo(2, `
serendipity | luck,chance,accident,surprise | fortunate discover unexpected happy find fate
ambiguous | unclear,two,meanings,vague | interpret confusing uncertain double open sense
hypocrite | pretend,say,do,preach | behave believe opposite fake standards double
euphemism | polite,word,soft,replace | indirect expression harsh mild phrase gentle
paradox | contradiction,true,opposite,logic | statement impossible absurd seemingly both puzzle
complacent | satisfied,lazy,relaxed,comfortable | smug effort danger unaware self content
meticulous | careful,detail,precise,thorough | attention exact perfectionist neat accurate methodical
obsolete | old,outdated,used,replaced | technology modern longer useless antique newer
diplomacy | politics,countries,tact,negotiate | relations government ambassador peace sensitive international
propaganda | government,media,information,false | biased spread persuade political message control
entrepreneur | business,start,company,owner | risk founder startup venture profit idea
benevolent | kind,good,generous,help | charitable caring goodwill gentle giving others
skeptical | doubt,believe,question,unsure | evidence suspicious convinced proof critical disbelief
pragmatic | practical,realistic,sensible,ideal | approach useful results solution grounded efficient
consensus | agree,everyone,group,majority | opinion decision collective unanimous shared accord
eloquent | speak,fluent,words,persuasive | expressive articulate speech graceful convincing clearly
cynical | distrust,negative,motives,believe | selfish doubt suspicious pessimistic sincere people
catalyst | cause,change,speed,chemical | trigger reaction spark accelerate agent start
nuance | subtle,difference,detail,shade | slight meaning distinction fine tone variation
gentrification | rich,neighbourhood,poor,area | wealthy move rents prices change displace
`),
  ...taboo(3, `
ephemeral | short,brief,temporary,last | fleeting moment passing transient quickly fade
ubiquitous | everywhere,common,always,present | universal widespread found seen omnipresent every
sycophant | flatter,boss,praise,please | servile favour obedient creep agree power
quintessential | perfect,example,typical,classic | essence purest embodiment model representative ideal
schadenfreude | pleasure,misfortune,others,happy | joy suffering german enjoy failure gloat
cognitive dissonance | beliefs,conflict,mind,contradict | uncomfortable tension psychology actions attitude inconsistent
placebo | fake,pill,medicine,effect | sugar belief treatment trial expectation patient
zeitgeist | spirit,time,era,mood | culture generation period trend defining attitudes
laconic | brief,few,words,short | concise terse speech minimal succinct quiet
magnanimous | generous,forgive,kind,noble | gracious victory rival pardon spirit defeated
obfuscate | confuse,unclear,hide,complicate | obscure deliberately muddle meaning jargon evasive
hubris | pride,arrogance,ego,overconfident | downfall excessive greek tragedy self fall
juxtaposition | side,contrast,together,compare | placed adjacent different effect difference beside
gaslighting | manipulate,doubt,reality,lie | abuse sanity memory control psychological question
existential | existence,meaning,life,purpose | philosophy crisis being human dread question
altruism | selfless,help,others,kindness | unselfish concern welfare sacrifice charity giving
filibuster | speech,delay,senate,vote | parliament long block talking legislation tactic
confirmation bias | believe,evidence,ignore,agree | beliefs favour information prejudice selective thinking
opportunity cost | choice,lose,alternative,value | economics give option trade forgone decision
Occam's razor | simple,explanation,best,assumptions | principle simplest likely theory fewer philosophy
`)
];

/* ───────────── 2 · Caption Clash  image | what it shows | words that show the caption fits ───────────── */
export const CAPTIONS = `
c1003 | A young deer standing alone in a sunlit forest | deer fawn forest woods alone wild animal sun
c1008 | Someone fast asleep on a sofa beside a big window | sleep nap sofa couch lazy tired monday window bed
c1011 | A woman paddling a canoe across a still lake | canoe boat lake paddle water trip calm row
c1012 | A man and his dog relaxing in tall grass | dog man grass friend relax field pet best
c1020 | A bear clambering over rocks in the snow | bear rocks snow wild climb hungry winter
c1023 | A tiny hiker swallowed by a giant wall of greenery | hiker lost green plants jungle grass tiny explore
c1026 | Trains resting in a railway yard at sunset | trains railway sunset tracks yard station travel
c1033 | Empty escalators in a silent station | escalator station empty stairs commute metro
c1040 | A fairytale castle on a forested hill | castle king queen hill fairy tale princess palace
c1041 | A wave curling over in the open sea | wave sea ocean surf water curl splash
c1042 | Star trails swirling above a lone figure | stars night sky space universe trails galaxy
c1044 | A lone person beside a misty mountain river | river mist mountain alone fog person nature
c1047 | A narrow alley between red-brick buildings | alley street city brick walk narrow lane
c1049 | A rocky island reflected in a mirror-flat sea | island rock reflection sea mirror calm
c1051 | A wooden pier stretching into a mountain lake | pier lake mountains wood dock water calm
c1058 | A football pitch seen from straight above | football pitch field soccer stadium grass match
c1060 | A barista brewing pour-over coffee | coffee barista brew cafe morning caffeine cup
c1062 | A pug wrapped in a blanket like a burrito | pug dog blanket burrito cosy wrapped cold
c1063 | A road vanishing into a tunnel in the forest | road tunnel forest drive cars journey
c1064 | A sea of clouds below a mountain ridge | clouds mountain sky above fog heaven
c1068 | A single tiny plant on an empty blue table | plant small table blue minimal grow pot
c1069 | A bright orange jellyfish in deep blue water | jellyfish ocean orange sea float sting
c1070 | The dashboard of an old vintage car | car vintage dashboard steering wheel old drive
c1072 | A rusty old truck abandoned in a field | truck rusty old abandoned field car vehicle
c1073 | A wall covered with open book pages | books pages read wall library words paper
c1077 | Cyclists racing past in a blur | cyclists bikes race speed blur fast cycling
c1078 | Hundreds of lit apartment windows at night | apartment windows night city lights building neighbours
c1079 | A ring of fire sparks spinning in the dark | fire sparks ring circle night light magic
c1082 | Hands playing an old grand piano | piano hands music keys play musician
c1083 | Someone lying on the very tip of a tower in the sea | tower top lying sea brave high adventure
c200 | A shaggy highland cow on a hillside | cow highland hair shaggy farm hill animal
c201 | Glasses resting on a laptop on a wooden desk | glasses laptop desk work computer office
c203 | A man and his bicycle by the sea at sunrise | bicycle bike sea sunrise man beach morning
c204 | Railway tracks crossing a bridge into the hills | railway tracks bridge train hills journey
c208 | A window looking out onto green trees | window trees green view inside nature
c211 | A colourful old wooden boat in a harbour | boat harbour sail wooden fishing sea port
c212 | A bicycle parked on a wet street in the rain | bicycle bike rain street wet city park
c219 | A leopard strolling down a dirt road | leopard cat wild road spots safari walk
c220 | Street lights glowing through thick fog | fog street lights night road mist dark
c225 | A glass teapot of green tea | tea teapot green glass cup drink calm
`.trim().split('\n').map((l) => { const [id, desc, keys] = l.split('|').map((p) => p.trim()); return { id, src: `games/wordcraft/${id}.jpg`, desc, keys: list(keys) }; });

/* ───────────── 3 · Talk for 60  topic | words that show the talk stayed on topic ───────────── */
const topics = (stage, text) => lines(stage, text, ([topic, keys], i) => ({ id: `k${stage}-${i}`, topic, keys: list(keys) }));
export const TOPICS = [
  ...topics(0, `
The best piece of advice you have ever received | advice learn told helped life lesson
Your ideal weekend, hour by hour | weekend relax friends morning saturday sunday plan
A skill everyone should learn before turning twenty | skill learn useful life important practice
Is breakfast really the most important meal? | breakfast morning food meal energy eat
The city you would most like to live in | city live place people culture move
A film that changed the way you think | movie film character story watched changed
Your morning routine and how you would improve it | morning routine wake habit time improve
Cats or dogs: which make better companions? | cats dogs pet companion loyal care
The perfect birthday celebration | birthday party friends cake celebrate gift
The most useful app on your phone | app phone use useful daily feature
Street food you can never say no to | food street taste spicy eat favourite
What makes a good friend | friend trust loyal support honest care
Rainy days: cosy or annoying? | rain day weather cosy wet indoor
Your favourite way to spend a holiday | holiday travel relax family trip place
Something you learned from a mistake | mistake learn lesson wrong change learned
Online shopping versus shopping in stores | online shopping store buy price delivery
A book, show or podcast you would recommend | book show podcast recommend story listen
How to stay focused while studying | study focus distraction phone time concentrate
A teacher who inspired you | teacher inspired class learn taught school
Early bird or night owl? | morning evening night time day energy sleep
`),
  ...topics(1, `
Should homework be banned? | homework students school learn time practice
Is social media making us lonelier? | social media lonely connect friends online people
The four-day work week: brilliant or bad idea? | work week productivity rest employees days
What makes a great leader | leader team decisions trust inspire vision
Should university education be free for everyone? | university education free cost students government
Specialist or generalist: which is better for a career? | specialist generalist skills career expert broad
The pros and cons of working from home | home office remote work productivity commute
Would you rather explore space or the deep ocean? | space ocean explore discover deep planet
Should voting be compulsory? | vote election citizens democracy compulsory government
How smartphones changed childhood | smartphone children childhood screen play games
Is failure necessary for success? | failure success learn mistakes try grow
Cash or digital payments: which future is better? | cash digital payments money upi card
Are exams a fair test of ability? | exams test ability students marks pressure
The role of sport in building character | sport character team discipline win lose
Is it ever okay to lie? | lie truth honest situation protect trust
Fast fashion and its hidden costs | fashion clothes cost environment workers cheap
The habits of highly productive people | habits productive time routine focus goals
Should cities ban private cars from their centres? | cars city traffic pollution transport public
How music affects our mood | music mood emotions song feel listen
What the world will look like in 2050 | future technology world climate cities change
`),
  ...topics(2, `
Will artificial intelligence create more jobs than it destroys? | artificial intelligence ai jobs work automation future
Is privacy dead in the digital age? | privacy data digital companies surveillance personal
Should humanity colonise Mars? | mars space colonise humans planet earth
Does money buy happiness? | money happiness rich wealth satisfaction life
Is censorship ever justified? | censorship speech freedom harm protect information
The ethics of eating meat | meat ethics animals vegetarian environment food
Should billionaires exist? | billionaires wealth inequality tax rich economy
Is democracy the best form of government? | democracy government vote power people freedom
How should we tackle misinformation online? | misinformation fake news online truth platforms
Does history repeat itself? | history repeat past lessons events patterns
Should gene editing be used on humans? | gene editing dna humans ethics disease
Competition or cooperation: which drives progress more? | competition cooperation progress innovation together win
The value of learning a classical language | language latin sanskrit learn culture history
Should the voting age be lowered to sixteen? | voting age young sixteen democracy responsible
Is nationalism a force for good or harm? | nationalism nation identity pride unity conflict
Universal basic income: solution or fantasy? | income universal basic money poverty work
Can art be separated from the artist? | art artist work behaviour separate judge
Are humans naturally good? | humans nature good evil kind selfish
The future of cities in a warming world | cities climate heat warming future planning
Should zoos still exist? | zoos animals conservation captivity wild species
`),
  ...topics(3, `
Is free will an illusion? | free will choice brain determined decision illusion
Should we fear a technological singularity? | singularity technology intelligence machines humans control
The tyranny of the majority in democracies | majority democracy minority rights power tyranny
Is objective truth possible in journalism? | truth objective journalism bias media facts
Should future generations have legal rights? | future generations rights law climate responsibility
Can a society be too tolerant? | society tolerance intolerance freedom limits paradox
Is economic growth compatible with saving the planet? | growth economy planet climate sustainable consumption
The meaning of success in the twenty-first century | success meaning career happiness wealth purpose
Do we truly own our digital identities? | digital identity data own platforms privacy
Should statues of controversial historical figures be removed? | statues history controversial remove memory public
Is meritocracy a myth? | meritocracy merit talent privilege opportunity fair
Will humans always need religion, or something like it? | religion belief meaning faith humans community
Can machines ever be truly creative? | machines creative art creativity ai original
The case for and against open borders | borders migration immigration economy open countries
Is loneliness a public health crisis? | loneliness health public isolation social crisis
Should companies pay us for our personal data? | data pay personal companies value privacy
Is boredom good for the brain? | boredom brain creativity idle mind attention
What, if anything, do we owe strangers? | strangers owe moral help duty kindness
Is progress inevitable? | progress inevitable history future technology society
Should we ever trust an algorithm over a human judge? | algorithm human judge trust bias decision
`)
];

/* ───────────── 4 · Plot Twist  openers by stage, and the twists dropped in while the student tells the story ───────────── */
const openers = (stage, text) => lines(stage, text, ([line], i) => ({ id: `o${stage}-${i}`, line }));
export const OPENERS = [
  ...openers(0, `
The lift stopped between floors, and the lights flickered twice.
My phone buzzed with a message from a number I did not recognise.
The new neighbour arrived at midnight carrying nothing but a goldfish.
On my first day of college, I walked confidently into the wrong classroom.
The cafe was empty except for a man reading yesterday's newspaper.
When I opened my lunchbox, there was a note that was not from my mother.
The train announced that the next station did not exist.
Grandma said there was something in the attic she had never shown anyone.
`),
  ...openers(1, `
The power went out across the whole city at exactly 7:15.
The interview was going perfectly until the interviewer recognised my surname.
Our college bus took a turn that was not on any map.
The street artist finished my portrait before I had even sat down.
The vending machine gave me a drink and a tiny folded map.
My best friend woke up speaking with a perfect British accent.
The hotel receptionist said my room had been booked fifty years ago.
In the library I found a ticket with my name on it, dated tomorrow.
`),
  ...openers(2, `
The detective closed the file, convinced the case was solved, until the phone rang.
Everyone in the village woke up having had the same dream.
The startup's app went viral overnight for completely the wrong reason.
The astronaut heard a knock on the outside of the space station.
The museum's most famous painting was still on the wall, but the person in it had moved.
The election was decided by a single vote, and it was mine.
The professor walked in, wrote one word on the board, and walked out.
The captain announced that we would not be returning to port.
`),
  ...openers(3, `
The algorithm had predicted my every choice for years, until today.
The archivist found a letter that rewrote the history of the entire city.
For one hour, everyone on Earth could hear each other's thoughts.
The world's most famous magician refused to reveal his final trick, even to the court.
The time capsule we buried at school had been opened before we got to it.
The peace talks were collapsing when the translator decided to change one word.
My AI assistant asked me a question I could not answer.
At midnight, every clock in the city began running backwards.
`)
];
// word | what appears on screen. The word is what the student must work into the story.
const twists = (stage, text) => lines(stage, text, ([word, say], i) => ({ id: `w${stage}-${i}`, word: word.toLowerCase(), say }));
export const TWISTS = [
  ...twists(0, `
parrot | A talking parrot appears.
umbrella | Someone hands over a mysterious umbrella.
pizza | A pizza arrives that nobody ordered.
twins | Twins turn up, and they are not who they seem.
rain | It suddenly starts raining indoors.
key | A golden key falls from nowhere.
dog | A stray dog starts following the hero.
birthday | It turns out today is someone's birthday.
police | The police arrive.
cake | Somebody drops an enormous cake.
letter | A letter arrives for the wrong person.
laugh | Everyone starts to laugh for no reason.
`),
  ...twists(1, `
elephant | An elephant becomes part of the story.
secret | A secret is revealed.
lottery | Someone wins the lottery.
blackout | A sudden blackout hits.
detective | A detective walks in.
alarm | An alarm starts ringing.
robot | A robot joins the story.
diary | An old diary is found.
storm | A storm breaks.
celebrity | A celebrity appears.
mistake | Someone admits a huge mistake.
tunnel | A hidden tunnel is discovered.
`),
  ...twists(2, `
betrayal | Someone the hero trusts commits a betrayal.
amnesia | A character wakes up with amnesia.
inheritance | An unexpected inheritance arrives.
impostor | One character is an impostor.
prophecy | An old prophecy comes true.
hologram | Someone turns out to be a hologram.
ransom | A ransom note arrives.
volcano | A volcano erupts nearby.
contract | A strange contract must be signed.
alibi | Someone desperately needs an alibi.
eclipse | A solar eclipse begins.
counterfeit | Something important turns out to be counterfeit.
`),
  ...twists(3, `
paradox | A time paradox appears.
conspiracy | A conspiracy is uncovered.
doppelganger | The hero meets their doppelganger.
algorithm | An algorithm takes control.
quarantine | A sudden quarantine is declared.
whistleblower | A whistleblower comes forward.
labyrinth | The setting becomes a labyrinth.
manifesto | A manifesto is published.
sabotage | Someone commits sabotage.
mirage | What they saw was only a mirage.
ultimatum | Someone issues an ultimatum.
epiphany | The hero has an epiphany.
`)
];

/* ───────────── 5 · Sell the Impossible  product | its "selling point" | words that show the pitch is about it ───────────── */
export const PRODUCTS = `
A raincoat for fish | Keeps fish perfectly dry underwater. | fish water dry rain coat ocean
An umbrella made of ice | Melts in the sun: perfect for summer. | ice cold melt summer umbrella cool
A chocolate teapot | Delicious, but holds hot tea for about ten seconds. | chocolate tea sweet melt hot delicious
An invisible mirror | You cannot see yourself, or the mirror. | invisible mirror reflection see look
A pen that writes only lies | Every sentence comes out false. | pen write lies truth story honest
A fridge that tells jokes | Opens with a punchline every time. | fridge jokes laugh food funny cold
A one-way telephone | You can call anyone; nobody can ever call you. | phone call privacy talk peace quiet
A sofa that judges your posture | Rates how you sit, out loud. | sofa sit posture back health comfort
Glasses that only show yesterday | Everything you see is 24 hours old. | glasses yesterday past see memory time
A pet cloud | Floats around your home and sometimes rains. | cloud pet rain sky soft float
A key that opens nothing | Unlocks absolutely no doors. | key lock door security open safe
A clock that is always ten minutes late | Always late, always calm. | clock time late calm relaxed stress
Shoes for your nose | Protects your nose from smells and bumps. | nose shoe smell protect comfort style
A sandwich that never ends | Eat forever, never finish. | sandwich food eat hungry endless lunch
Sunglasses for night time | Darkness, but darker. | sunglasses night dark style cool eyes
A ladder with no steps | Light, minimal and mysterious. | ladder climb steps light minimal design
A bottle of silence | Open it for ten minutes of perfect quiet. | silence quiet peace noise calm bottle
An alarm clock that whispers | Wakes you so gently you never wake up. | alarm wake whisper gentle sleep morning
Pre-scratched lottery tickets | Already scratched, already lost. | lottery ticket luck win money save time
A candle that gives out darkness | Light it to make the room darker. | candle dark light sleep relax room
Socks for a snake | Warm, stylish and very, very long. | snake socks warm feet style long
A thriller with blank pages | The suspense never ends. | book blank pages story imagination write
A solar-powered torch | Works perfectly, in daylight only. | torch sun solar power light energy
A waterproof tea bag | Tea that never gets wet. | tea bag water drink dry cup
Wi-Fi for the middle of the desert | Full signal, zero people. | wifi internet desert signal connect remote
A GPS that only knows the way home | Never lost, never anywhere new. | gps home map direction lost travel
A self-deleting diary | Writes your secrets down, then forgets them. | diary secrets privacy write memory delete
A dictionary with only one word | Simple, focused, unforgettable. | dictionary word vocabulary simple language learn
A gym membership for your thumbs | Stronger thumbs for faster texting. | gym fingers fitness thumbs exercise phone
A time machine that goes one minute forward | Skip awkward moments instantly. | time machine future minute skip travel
Bottled air from a famous mountain | Breathe like a champion. | air mountain breathe fresh bottle pure
A smartphone with no screen | The ultimate digital detox. | phone screen detox focus calm digital
A personal rain cloud for houseplants | Waters your plants wherever you go. | cloud rain plants water garden green
A traffic light for conversations | Red means stop talking. | traffic light conversation talk stop listen
A soup spoon full of holes | The healthiest way to eat less. | spoon soup holes eat diet healthy
An app that switches off all your other apps | Freedom from your own phone. | app phone focus freedom productivity time
A parachute that opens after you land | Comfortable, and very calm. | parachute land safe sky jump air
An inflatable dartboard | Great fun, until the first throw. | dartboard darts game inflatable fun play
A mirror that only shows your best day | Confidence in a frame. | mirror confidence best self image look
A mattress stuffed with alarm clocks | Sleep has never been this punctual. | mattress sleep alarm wake time comfort
`.trim().split('\n').map((l, i) => { const [name, hook, keys] = l.split('|').map((p) => p.trim()); return { id: `p${i}`, name, hook, keys: list(keys) }; });

/* ───────────── 6 · Tongue Twister, by stage ───────────── */
const twisterLines = (stage, text) => lines(stage, text, ([t], i) => ({ id: `tt${stage}-${i}`, text: t }));
export const TWISTERS = [
  ...twisterLines(0, `
Red lorry, yellow lorry.
She sells seashells by the seashore.
Six sleek swans swam swiftly southwards.
Good blood, bad blood, good blood.
Green glass globes glow greenly.
Truly rural, truly rural.
Kitty caught the kitten in the kitchen.
Toy boat, toy boat, toy boat.
A proper copper coffee pot.
Black background, brown background.
Fresh fried fish, fresh fried fish.
Big black bugs bleed blue black blood.
`),
  ...twisterLines(1, `
Peter Piper picked a peck of pickled peppers.
I scream, you scream, we all scream for ice cream.
Fred fed Ted bread and Ted fed Fred bread.
How can a clam cram in a clean cream can?
Four fine fresh fish for you, four fine fresh fish.
Lesser leather never weathered wetter weather better.
Betty bought some butter but the butter was bitter.
Eleven benevolent elephants eat eleven elegant eggs.
Thin sticks, thick bricks, thin sticks, thick bricks.
A skunk sat on a stump and thunk the stump stunk.
Thirty three thirsty thinkers thought through Thursday.
Six sticky skeletons, six sticky skeletons.
`),
  ...twisterLines(2, `
How much wood would a woodchuck chuck if a woodchuck could chuck wood?
Unique New York, unique New York, you know you need unique New York.
A big bug bit the little beetle but the little beetle bit the big bug back.
If two witches would watch two watches, which witch would watch which watch?
Can you can a can as a canner can can a can?
Near an ear, a nearer ear, a nearly eerie ear.
Brisk brave brigadiers brandished broad bright blades.
Imagine an imaginary menagerie manager managing an imaginary menagerie.
Selfish shellfish, selfish shellfish, selfish shellfish.
Irish wristwatch, Swiss wristwatch, Irish wristwatch.
The great Greek grape growers grow great Greek grapes.
Rolling red wagons, rolling red wagons, rolling red wagons.
`),
  ...twisterLines(3, `
The sixth sick sheikh's sixth sheep's sick.
Pad kid poured curd pulled cod.
I saw Susie sitting in a shoeshine shop. Where she sits she shines, and where she shines she sits.
Whether the weather is warm, whether the weather is hot, we have to put up with the weather, whether we like it or not.
Betty Botter bought some butter, but she said the butter's bitter; if I put it in my batter, it will make my batter bitter.
She sells seashells on the seashore, and the shells she sells are seashells, I'm sure.
Six Czech cricket critics, six Czech cricket critics.
Mixed biscuits, mixed biscuits, mixed biscuits.
The seething sea ceaseth and thus the seething sea sufficeth us.
Thieves seize skis, thieves seize skis, thieves seize skis.
Specific Pacific, specific Pacific, specific Pacific.
A sailor went to sea, sea, sea, to see what he could see, see, see.
`)
];
