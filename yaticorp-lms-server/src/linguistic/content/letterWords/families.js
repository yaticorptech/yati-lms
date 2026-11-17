/**
 * Words for the consonants with their vowel signs, two consonants a lesson (2026-11-13, the user: "add the kha letter
 * also, do the same as the first image [ಕಾ — ಕಾಗೆ…] … ga and gha … till la; don't use nga and nya"): ಖಾ ಖಾರ, ಗಾ ಗಾಳಿಪಟ…
 * ಕ's own (ಕಾ ಕಾಗೆ…) are in more.js. Then (the user, same day: "give the word and sentence to the next letters also"):
 * a syllable no everyday word starts with has one with it inside (the 8th field: ಣಿ in ರಾಣಿ), or an English word
 * written in the script (ಫೈಲ್, ಢಾಬಾ). Only a syllable in no word at all (ಖೃ, ಘೌ, ढौ…) has none: its card shows its sound.
 * Lines as the other letterWords files: "letter|word|its sound|picture|sentence|its sound|its meaning|inside".
 * No sentence holds a word starting with another syllable of its own lesson (the quiz asks "starts with").
 * Written here, not by any translation service: a native speaker should check them.
 */
const { parse } = require('./parse');

const nfc = (text) => parse(text.normalize('NFC'));

module.exports = {
    kn: nfc(`
ಖಾ|ಖಾರ|khāra|🌶️|ಮೆಣಸಿನಕಾಯಿ ತುಂಬಾ ಖಾರ.|meṇasinakāyi tumbā khāra|The chilli is very hot.
ಖಿ|ಖಿನ್ನ|khinna|😔|ಅವನು ಖಿನ್ನನಾಗಿದ್ದಾನೆ.|avanu khinnanāgiddāne|He is gloomy.
ಖೀ|ಖೀರು|khīru|🍮|ಹಬ್ಬಕ್ಕೆ ಅಮ್ಮ ಖೀರು ಮಾಡಿದರು.|habbakke amma khīru māḍidaru|Mother made kheer for the festival.
ಖು|ಖುಷಿ|khuṣi|😊|ನನಗೆ ತುಂಬಾ ಖುಷಿ ಆಗಿದೆ.|nanage tumbā khuṣi āgide|I am very happy.
ಖೇ|ಖೇದ|khēda|😞|ಈ ಸುದ್ದಿ ಕೇಳಿ ಖೇದ ಆಯಿತು.|ī suddi kēḷi khēda āyitu|I felt sorry to hear this news.
ಖೈ|ಖೈದಿ|khaidi|⛓️|ಖೈದಿ ಜೈಲಿನಲ್ಲಿ ಇದ್ದಾನೆ.|khaidi jailinalli iddāne|The prisoner is in jail.
ಖೋ|ಖೋಖೋ|khōkhō|🏃|ಮಕ್ಕಳು ಖೋಖೋ ಆಡುತ್ತಾರೆ.|makkaḷu khōkhō āḍuttāre|The children play kho-kho.
ಖಂ|ಖಂಡ|khaṇḍa|🌍|ಏಷ್ಯಾ ದೊಡ್ಡ ಖಂಡ.|ēṣyā doḍḍa khaṇḍa|Asia is a big continent.
ಗಾ|ಗಾಳಿಪಟ|gāḷipaṭa|🪁|ಗಾಳಿಪಟ ಆಕಾಶದಲ್ಲಿ ಹಾರುತ್ತಿದೆ.|gāḷipaṭa ākāśadalli hāruttide|The kite is flying in the sky.
ಗಿ|ಗಿಳಿ|giḷi|🦜|ಗಿಳಿ ಹಸಿರು ಬಣ್ಣದ್ದು.|giḷi hasiru baṇṇaddu|The parrot is green.
ಗೀ|ಗೀತೆ|gīte|🎵|ನಾವು ಗೀತೆ ಹಾಡುತ್ತೇವೆ.|nāvu gīte hāḍuttēve|We sing a song.
ಗು|ಗುಲಾಬಿ|gulābi|🌹|ಗುಲಾಬಿ ಹೂವು ಸುಂದರವಾಗಿದೆ.|gulābi hūvu sundaravāgide|The rose is beautiful.
ಗೂ|ಗೂಡು|gūḍu|🪺|ಹಕ್ಕಿ ಗೂಡು ಕಟ್ಟುತ್ತದೆ.|hakki gūḍu kaṭṭuttade|The bird builds a nest.
ಗೃ|ಗೃಹ|gṛha|🏠|ಇದು ನಮ್ಮ ಗೃಹ.|idu namma gṛha|This is our home.
ಗೆ|ಗೆಳೆಯ|geḷeya|🧑‍🤝‍🧑|ರವಿ ನನ್ನ ಗೆಳೆಯ.|ravi nanna geḷeya|Ravi is my friend.
ಗೇ|ಗೇಟು|gēṭu|🚪|ಶಾಲೆಯ ಗೇಟು ತೆರೆದಿದೆ.|śāleya gēṭu teredide|The school gate is open.
ಗೈ|ಗೈರು|gairu|🚫|ಇಂದು ರಾಮು ಶಾಲೆಗೆ ಗೈರು.|indu rāmu śālege gairu|Today Ramu is absent from school.
ಗೊ|ಗೊಂಬೆ|gombe|🧸|ಮಗು ಗೊಂಬೆಯ ಜೊತೆ ಆಡುತ್ತದೆ.|magu gombeya jote āḍuttade|The baby plays with the doll.
ಗೋ|ಗೋಡೆ|gōḍe|🧱|ಗೋಡೆಯ ಮೇಲೆ ಚಿತ್ರ ಇದೆ.|gōḍeya mēle citra ide|There is a picture on the wall.
ಗೌ|ಗೌನು|gaunu|👗|ಅವಳು ಹೊಸ ಗೌನು ಹಾಕಿದ್ದಾಳೆ.|avaḷu hosa gaunu hākiddāḷe|She is wearing a new gown.
ಗಂ|ಗಂಟೆ|gaṇṭe|🔔|ಶಾಲೆಯ ಗಂಟೆ ಬಾರಿಸಿತು.|śāleya gaṇṭe bārisitu|The school bell rang.
ಘಾ|ಘಾಟಿ|ghāṭi|⛰️|ಘಾಟಿ ರಸ್ತೆಯಲ್ಲಿ ತುಂಬಾ ತಿರುವು.|ghāṭi rasteyalli tumbā tiruvu|The ghat road has many bends.
ಘೋ|ಘೋಷಣೆ|ghōṣaṇe|📢|ಮಕ್ಕಳು ಘೋಷಣೆ ಕೂಗಿದರು.|makkaḷu ghōṣaṇe kūgidaru|The children shouted slogans.
ಚಾ|ಚಾಕು|cāku|🔪|ಚಾಕು ಹರಿತವಾಗಿದೆ.|cāku haritavāgide|The knife is sharp.
ಚಿ|ಚಿಟ್ಟೆ|ciṭṭe|🦋|ಚಿಟ್ಟೆ ಹೂವಿನ ಮೇಲೆ ಕುಳಿತಿದೆ.|ciṭṭe hūvina mēle kuḷitide|The butterfly sits on the flower.
ಚೀ|ಚೀಲ|cīla|🎒|ನನ್ನ ಚೀಲದಲ್ಲಿ ಪುಸ್ತಕ ಇದೆ.|nanna cīladalli pustaka ide|There is a book in my bag.
ಚು|ಚುಕ್ಕೆ|cukke|⭐|ಆಕಾಶದಲ್ಲಿ ಚುಕ್ಕೆಗಳು ಹೊಳೆಯುತ್ತವೆ.|ākāśadalli cukkegaḷu hoḷeyuttave|Stars shine in the sky.
ಚೂ|ಚೂರು|cūru|🧩|ಗಾಜು ಒಡೆದು ಚೂರಾಯಿತು.|gāju oḍedu cūrāyitu|The glass broke into pieces.
ಚೆ|ಚೆಂಡು|ceṇḍu|⚽|ಮಕ್ಕಳು ಚೆಂಡು ಆಡುತ್ತಾರೆ.|makkaḷu ceṇḍu āḍuttāre|The children play ball.
ಚೇ|ಚೇಳು|cēḷu|🦂|ಚೇಳು ಕುಟುಕುತ್ತದೆ.|cēḷu kuṭukuttade|The scorpion stings.
ಚೈ|ಚೈತ್ರ|caitra|🌸|ಚೈತ್ರ ಮಾಸದಲ್ಲಿ ಹೂವು ಅರಳುತ್ತದೆ.|caitra māsadalli hūvu araḷuttade|Flowers bloom in the month of Chaitra.
ಚೊ|ಚೊಂಬು|combu|🏺|ಚೊಂಬಿನಲ್ಲಿ ನೀರು ಇದೆ.|combinalli nīru ide|There is water in the pot.
ಚೌ|ಚೌಕ|cauka|🟥|ಇದು ಒಂದು ಚೌಕ.|idu ondu cauka|This is a square.
ಚಂ|ಚಂದ್ರ|candra|🌙|ರಾತ್ರಿ ಚಂದ್ರ ಹೊಳೆಯುತ್ತಾನೆ.|rātri candra hoḷeyuttāne|The moon shines at night.
ಛಾ|ಛಾವಣಿ|chāvaṇi|🏠|ಮನೆಯ ಛಾವಣಿ ಎತ್ತರವಾಗಿದೆ.|maneya chāvaṇi ettaravāgide|The roof of the house is high.
ಜಾ|ಜಾತ್ರೆ|jātre|🎡|ಊರಿನಲ್ಲಿ ಜಾತ್ರೆ ನಡೆಯುತ್ತಿದೆ.|ūrinalli jātre naḍeyuttide|There is a fair in the village.
ಜಿ|ಜಿಂಕೆ|jiṅke|🦌|ಜಿಂಕೆ ವೇಗವಾಗಿ ಓಡುತ್ತದೆ.|jiṅke vēgavāgi ōḍuttade|The deer runs fast.
ಜೀ|ಜೀಪು|jīpu|🚙|ಜೀಪು ಕಾಡಿನಲ್ಲಿ ಹೋಗುತ್ತದೆ.|jīpu kāḍinalli hōguttade|The jeep goes through the forest.
ಜು|ಜುಲೈ|julai|☔|ಜುಲೈ ತಿಂಗಳಲ್ಲಿ ಮಳೆ ಬರುತ್ತದೆ.|julai tiṅgaḷalli maḷe baruttade|It rains in July.
ಜೇ|ಜೇನು|jēnu|🍯|ಜೇನು ತುಂಬಾ ಸಿಹಿ.|jēnu tumbā sihi|Honey is very sweet.
ಜೈ|ಜೈಲು|jailu|⛓️|ಪೊಲೀಸರು ಕಳ್ಳನನ್ನು ಜೈಲಿಗೆ ಹಾಕಿದರು.|polīsaru kaḷḷanannu jailige hākidaru|The police put the thief in jail.
ಜೊ|ಜೊತೆ|jote|🤝|ನಾನು ಅಮ್ಮನ ಜೊತೆ ಹೋಗುತ್ತೇನೆ.|nānu ammana jote hōguttēne|I go with mother.
ಜೋ|ಜೋಳ|jōḷa|🌽|ಹೊಲದಲ್ಲಿ ಜೋಳ ಬೆಳೆದಿದೆ.|holadalli jōḷa beḷedide|Corn has grown in the field.
ಝೇ|ಝೇಂಕಾರ|jhēṅkāra|🐝|ದುಂಬಿಯ ಝೇಂಕಾರ ಕೇಳುತ್ತಿದೆ.|dumbiya jhēṅkāra kēḷuttide|The buzz of the bee can be heard.
ಟಾ|ಟಾಟಾ|ṭāṭā|👋|ಮಗು ಟಾಟಾ ಮಾಡುತ್ತದೆ.|magu ṭāṭā māḍuttade|The baby waves bye-bye.
ಟಿ|ಟಿಕೆಟ್|ṭikeṭ|🎫|ಬಸ್ಸಿನಲ್ಲಿ ಟಿಕೆಟ್ ತೆಗೆದುಕೊಳ್ಳಿ.|bassinalli ṭikeṭ tegedukoḷḷi|Take a ticket on the bus.
ಟೀ|ಟೀ|ṭī|🍵|ಅಪ್ಪ ಬೆಳಿಗ್ಗೆ ಟೀ ಕುಡಿಯುತ್ತಾರೆ.|appa beḷigge ṭī kuḍiyuttāre|Father drinks tea in the morning.
ಟೇ|ಟೇಬಲ್|ṭēbal|🪑|ಟೇಬಲ್ ಮೇಲೆ ಪುಸ್ತಕ ಇದೆ.|ṭēbal mēle pustaka ide|The book is on the table.
ಟೈ|ಟೈ|ṭai|👔|ಅಪ್ಪ ಟೈ ಕಟ್ಟುತ್ತಾರೆ.|appa ṭai kaṭṭuttāre|Father wears a tie.
ಟೊ|ಟೊಮೇಟೊ|ṭomēṭo|🍅|ಟೊಮೇಟೊ ಕೆಂಪು ಬಣ್ಣ.|ṭomēṭo kempu baṇṇa|The tomato is red.
ಟೋ|ಟೋಪಿ|ṭōpi|🧢|ತಾತ ಟೋಪಿ ಹಾಕುತ್ತಾರೆ.|tāta ṭōpi hākuttāre|Grandpa wears a cap.
ಠಾ|ಠಾಣೆ|ṭhāṇe|🚓|ಪೊಲೀಸರು ಠಾಣೆಯಲ್ಲಿ ಇದ್ದಾರೆ.|polīsaru ṭhāṇeyalli iddāre|The police are at the station.
ಡಾ|ಡಾಕ್ಟರ್|ḍākṭar|🩺|ಡಾಕ್ಟರ್ ರೋಗಿಯನ್ನು ನೋಡುತ್ತಾರೆ.|ḍākṭar rōgiyannu nōḍuttāre|The doctor sees the patient.
ಡಿ|ಡಿಸೆಂಬರ್|ḍisembar|🎄|ಡಿಸೆಂಬರ್ ತಿಂಗಳಲ್ಲಿ ಚಳಿ ಇರುತ್ತದೆ.|ḍisembar tiṅgaḷalli caḷi iruttade|It is cold in December.
ಡೈ|ಡೈರಿ|ḍairi|📔|ನಾನು ಡೈರಿ ಬರೆಯುತ್ತೇನೆ.|nānu ḍairi bareyuttēne|I write a diary.
ಡೊ|ಡೊಳ್ಳು|ḍoḷḷu|🥁|ಡೊಳ್ಳು ಕುಣಿತ ಚೆನ್ನಾಗಿದೆ.|ḍoḷḷu kuṇita cennāgide|The drum dance is nice.
ಣಿ|ರಾಣಿ|rāṇi|👸|ರಾಣಿ ಅರಮನೆಯಲ್ಲಿ ಇದ್ದಾಳೆ.|rāṇi aramaneyalli iddāḷe|The queen is in the palace.|ಣಿ
ಣು|ಹಣ್ಣು|haṇṇu|🍎|ಹಣ್ಣು ಸಿಹಿಯಾಗಿದೆ.|haṇṇu sihiyāgide|The fruit is sweet.|ಣು
ಣೆ|ಹಣೆ|haṇe|🔴|ಅಜ್ಜಿ ಹಣೆಗೆ ಕುಂಕುಮ ಇಡುತ್ತಾರೆ.|ajji haṇege kuṅkuma iḍuttāre|Grandma puts kumkum on her forehead.|ಣೆ
ನಾ|ನಾಯಿ|nāyi|🐕|ನಾಯಿ ಬೊಗಳುತ್ತದೆ.|nāyi bogaḷuttade|The dog barks.
ನಿ|ನಿಂಬೆ|nimbe|🍋|ನಿಂಬೆ ಹುಳಿಯಾಗಿದೆ.|nimbe huḷiyāgide|The lemon is sour.
ನೀ|ನೀರು|nīru|💧|ನಾನು ನೀರು ಕುಡಿಯುತ್ತೇನೆ.|nānu nīru kuḍiyuttēne|I drink water.
ನು|ನುಡಿ|nuḍi|🗣️|ಕನ್ನಡ ನುಡಿ ಸುಂದರ.|kannaḍa nuḍi sundara|The Kannada language is beautiful.
ನೂ|ನೂಲು|nūlu|🧵|ಅಜ್ಜಿ ನೂಲು ಸುತ್ತುತ್ತಾರೆ.|ajji nūlu suttuttāre|Grandma winds the thread.
ನೃ|ನೃತ್ಯ|nṛtya|💃|ಅವಳು ನೃತ್ಯ ಮಾಡುತ್ತಾಳೆ.|avaḷu nṛtya māḍuttāḷe|She dances.
ನೆ|ನೆರಳು|neraḷu|🌳|ಮರದ ನೆರಳು ತಂಪಾಗಿದೆ.|marada neraḷu tampāgide|The tree's shade is cool.
ನೇ|ನೇರಳೆ|nēraḷe|🟣|ನೇರಳೆ ಬಣ್ಣ ಸುಂದರ.|nēraḷe baṇṇa sundara|Purple is a beautiful colour.
ನೊ|ನೊಣ|noṇa|🪰|ನೊಣ ಹಾರುತ್ತಿದೆ.|noṇa hāruttide|The fly is flying.
ನೋ|ನೋಟು|nōṭu|💵|ಅಪ್ಪನ ಬಳಿ ಹೊಸ ನೋಟು ಇದೆ.|appana baḷi hosa nōṭu ide|Father has a new note.
ನೌ|ನೌಕೆ|nauke|🚢|ನೌಕೆ ಸಮುದ್ರದಲ್ಲಿ ಹೋಗುತ್ತದೆ.|nauke samudradalli hōguttade|The ship sails on the sea.
ತಾ|ತಾತ|tāta|👴|ತಾತ ಪೇಪರ್ ಓದುತ್ತಾರೆ.|tāta pēpar ōduttāre|Grandpa reads the paper.
ತಿ|ತಿಮಿಂಗಿಲ|timiṅgila|🐋|ತಿಮಿಂಗಿಲ ಸಮುದ್ರದಲ್ಲಿ ಇರುತ್ತದೆ.|timiṅgila samudradalli iruttade|The whale lives in the sea.
ತೀ|ತೀರ|tīra|🏖️|ನಾವು ಸಮುದ್ರ ತೀರಕ್ಕೆ ಹೋದೆವು.|nāvu samudra tīrakke hōdevu|We went to the seashore.
ತು|ತುಪ್ಪ|tuppa|🧈|ಅನ್ನಕ್ಕೆ ತುಪ್ಪ ಹಾಕಿ.|annakke tuppa hāki|Put ghee on the rice.
ತೂ|ತೂಕ|tūka|⚖️|ಈ ಚೀಲದ ತೂಕ ಹೆಚ್ಚು.|ī cīlada tūka heccu|This bag is heavy.
ತೃ|ತೃಪ್ತಿ|tṛpti|😌|ಊಟದ ನಂತರ ತೃಪ್ತಿ ಆಯಿತು.|ūṭada nantara tṛpti āyitu|I felt content after the meal.
ತೆ|ತೆಂಗಿನಕಾಯಿ|teṅginakāyi|🥥|ತೆಂಗಿನಕಾಯಿ ಮರದಿಂದ ಬಿತ್ತು.|teṅginakāyi maradinda bittu|The coconut fell from the tree.
ತೇ|ತೇರು|tēru|🛕|ಊರಿನಲ್ಲಿ ತೇರು ಎಳೆಯುತ್ತಾರೆ.|ūrinalli tēru eḷeyuttāre|They pull the temple chariot in the town.
ತೈ|ತೈಲ|taila|🛢️|ಗಾಡಿಗೆ ತೈಲ ಬೇಕು.|gāḍige taila bēku|The vehicle needs oil.
ತೊ|ತೊಟ್ಟಿಲು|toṭṭilu|👶|ಮಗು ತೊಟ್ಟಿಲಿನಲ್ಲಿ ಮಲಗಿದೆ.|magu toṭṭilinalli malagide|The baby sleeps in the cradle.
ತೋ|ತೋಟ|tōṭa|🌿|ತೋಟದಲ್ಲಿ ಹೂವುಗಳಿವೆ.|tōṭadalli hūvugaḷive|There are flowers in the garden.
ತಂ|ತಂದೆ|tande|👨|ನನ್ನ ತಂದೆ ಶಿಕ್ಷಕರು.|nanna tande śikṣakaru|My father is a teacher.
ಥಿ|ಅತಿಥಿ|atithi|🙏|ಮನೆಗೆ ಅತಿಥಿ ಬಂದರು.|manege atithi bandaru|A guest came home.|ಥಿ
ಥೆ|ಕಥೆ|kathe|📖|ಅಜ್ಜಿ ಕಥೆ ಹೇಳುತ್ತಾರೆ.|ajji kathe hēḷuttāre|Grandma tells a story.|ಥೆ
ದಾ|ದಾರ|dāra|🧵|ಸೂಜಿಗೆ ದಾರ ಹಾಕಿ.|sūjige dāra hāki|Thread the needle.
ದಿ|ದಿಂಬು|dimbu|🛏️|ನನ್ನ ದಿಂಬು ಮೆತ್ತಗಿದೆ.|nanna dimbu mettagide|My pillow is soft.
ದೀ|ದೀಪ|dīpa|🪔|ದೀಪ ಬೆಳಗುತ್ತಿದೆ.|dīpa beḷaguttide|The lamp is burning.
ದು|ದುಂಬಿ|dumbi|🐝|ದುಂಬಿ ಹೂವಿನ ಮೇಲೆ ಕುಳಿತಿದೆ.|dumbi hūvina mēle kuḷitide|The bee sits on the flower.
ದೂ|ದೂರವಾಣಿ|dūravāṇi|☎️|ದೂರವಾಣಿ ರಿಂಗ್ ಆಗುತ್ತಿದೆ.|dūravāṇi riṅg āguttide|The telephone is ringing.
ದೃ|ದೃಶ್ಯ|dṛśya|🏞️|ಈ ದೃಶ್ಯ ಸುಂದರವಾಗಿದೆ.|ī dṛśya sundaravāgide|This view is beautiful.
ದೆ|ದೆವ್ವ|devva|👻|ಕಥೆಯಲ್ಲಿ ಒಂದು ದೆವ್ವ ಇತ್ತು.|katheyalli ondu devva ittu|There was a ghost in the story.
ದೇ|ದೇವಸ್ಥಾನ|dēvasthāna|🛕|ನಾವು ದೇವಸ್ಥಾನಕ್ಕೆ ಹೋಗುತ್ತೇವೆ.|nāvu dēvasthānakke hōguttēve|We go to the temple.
ದೈ|ದೈತ್ಯ|daitya|👹|ಕಥೆಯಲ್ಲಿ ಒಬ್ಬ ದೈತ್ಯ ಇದ್ದ.|katheyalli obba daitya idda|There was a giant in the story.
ದೊ|ದೊಣ್ಣೆ|doṇṇe|🏏|ಅವನ ಕೈಯಲ್ಲಿ ದೊಣ್ಣೆ ಇದೆ.|avana kaiyalli doṇṇe ide|There is a stick in his hand.
ದೋ|ದೋಣಿ|dōṇi|⛵|ದೋಣಿ ನೀರಿನಲ್ಲಿ ತೇಲುತ್ತದೆ.|dōṇi nīrinalli tēluttade|The boat floats on the water.
ದಂ|ದಂತ|danta|🐘|ಆನೆಗೆ ದಂತ ಇದೆ.|ānege danta ide|The elephant has tusks.
ಧಾ|ಧಾನ್ಯ|dhānya|🌾|ರೈತ ಧಾನ್ಯ ಬೆಳೆಯುತ್ತಾನೆ.|raita dhānya beḷeyuttāne|The farmer grows grain.
ಧೀ|ಧೀರ|dhīra|🦸|ಅವನು ಧೀರ ಸೈನಿಕ.|avanu dhīra sainika|He is a brave soldier.
ಧೂ|ಧೂಳು|dhūḷu|🌫️|ಕೋಣೆಯಲ್ಲಿ ಧೂಳು ಇದೆ.|kōṇeyalli dhūḷu ide|There is dust in the room.
ಧೈ|ಧೈರ್ಯ|dhairya|💪|ಅವಳಿಗೆ ಧೈರ್ಯ ಇದೆ.|avaḷige dhairya ide|She has courage.
ಧೋ|ಧೋತಿ|dhōti|👘|ತಾತ ಧೋತಿ ಉಡುತ್ತಾರೆ.|tāta dhōti uḍuttāre|Grandpa wears a dhoti.
ಪಾ|ಪಾರಿವಾಳ|pārivāḷa|🕊️|ಪಾರಿವಾಳ ಹಾರುತ್ತಿದೆ.|pārivāḷa hāruttide|The pigeon is flying.
ಪಿ|ಪಿಜ್ಜಾ|pijjā|🍕|ಮಕ್ಕಳಿಗೆ ಪಿಜ್ಜಾ ಇಷ್ಟ.|makkaḷige pijjā iṣṭa|Children like pizza.
ಪು|ಪುಸ್ತಕ|pustaka|📚|ನಾನು ಪುಸ್ತಕ ಓದುತ್ತೇನೆ.|nānu pustaka ōduttēne|I read a book.
ಪೂ|ಪೂರಿ|pūri|🫓|ಬೆಳಿಗ್ಗೆ ಪೂರಿ ತಿಂದೆವು.|beḷigge pūri tindevu|We ate puri in the morning.
ಪೃ|ಪೃಥ್ವಿ|pṛthvi|🌏|ಪೃಥ್ವಿ ಸೂರ್ಯನ ಸುತ್ತ ಸುತ್ತುತ್ತದೆ.|pṛthvi sūryana sutta suttuttade|The earth goes around the sun.
ಪೆ|ಪೆನ್ನು|pennu|🖊️|ಇದು ನನ್ನ ಪೆನ್ನು.|idu nanna pennu|This is my pen.
ಪೇ|ಪೇರಲೆ|pēraḷe|🍐|ಪೇರಲೆ ಹಣ್ಣು ಹಸಿರು.|pēraḷe haṇṇu hasiru|The guava is green.
ಪೈ|ಪೈಸೆ|paise|🪙|ನನ್ನ ಬಳಿ ಹತ್ತು ಪೈಸೆ ಇದೆ.|nanna baḷi hattu paise ide|I have ten paise.
ಪೊ|ಪೊಲೀಸ್|polīs|👮|ಪೊಲೀಸ್ ರಸ್ತೆಯಲ್ಲಿ ನಿಂತಿದ್ದಾರೆ.|polīs rasteyalli nintiddāre|The policeman stands on the road.
ಪಂ|ಪಂಜರ|pañjara|🦜|ಗಿಳಿ ಪಂಜರದಲ್ಲಿ ಇದೆ.|giḷi pañjaradalli ide|The parrot is in the cage.
ಫೋ|ಫೋನು|phōnu|📱|ಅಮ್ಮನ ಫೋನು ರಿಂಗ್ ಆಯಿತು.|ammana phōnu riṅg āyitu|Mother's phone rang.
ಬಾ|ಬಾತುಕೋಳಿ|bātukōḷi|🦆|ಬಾತುಕೋಳಿ ನೀರಿನಲ್ಲಿ ಈಜುತ್ತದೆ.|bātukōḷi nīrinalli ījuttade|The duck swims in the water.
ಬಿ|ಬಿಸ್ಕತ್ತು|biskattu|🍪|ಮಗು ಬಿಸ್ಕತ್ತು ತಿನ್ನುತ್ತದೆ.|magu biskattu tinnuttade|The child eats a biscuit.
ಬೀ|ಬೀಗ|bīga|🔒|ಪೆಟ್ಟಿಗೆಗೆ ಬೀಗ ಇದೆ.|peṭṭigege bīga ide|The box has a lock.
ಬು|ಬುಟ್ಟಿ|buṭṭi|🧺|ಬುಟ್ಟಿಯಲ್ಲಿ ಹಣ್ಣುಗಳಿವೆ.|buṭṭiyalli haṇṇugaḷive|There are fruits in the basket.
ಬೂ|ಬೂಟು|būṭu|👞|ಅಪ್ಪನ ಬೂಟು ಕಪ್ಪು.|appana būṭu kappu|Father's shoes are black.
ಬೆ|ಬೆಕ್ಕು|bekku|🐈|ಬೆಕ್ಕು ಹಾಲು ಕುಡಿಯುತ್ತದೆ.|bekku hālu kuḍiyuttade|The cat drinks milk.
ಬೇ|ಬೇರು|bēru|🌱|ಮರದ ಬೇರು ಆಳವಾಗಿದೆ.|marada bēru āḷavāgide|The tree's roots are deep.
ಬೈ|ಬೈಸಿಕಲ್|baisikal|🚲|ನಾನು ಬೈಸಿಕಲ್ ಓಡಿಸುತ್ತೇನೆ.|nānu baisikal ōḍisuttēne|I ride a bicycle.
ಬೋ|ಬೋಗಿ|bōgi|🚃|ರೈಲಿನಲ್ಲಿ ಹತ್ತು ಬೋಗಿಗಳಿವೆ.|railinalli hattu bōgigaḷive|The train has ten coaches.
ಬಂ|ಬಂಡೆ|baṇḍe|🪨|ನದಿಯ ಹತ್ತಿರ ಒಂದು ಬಂಡೆ ಇದೆ.|nadiya hattira ondu baṇḍe ide|There is a rock near the river.
ಭಾ|ಭಾರತ|bhārata|🇮🇳|ಭಾರತ ನಮ್ಮ ದೇಶ.|bhārata namma dēśa|India is our country.
ಭು|ಭುಜ|bhuja|💪|ಅಪ್ಪನ ಭುಜ ಬಲವಾಗಿದೆ.|appana bhuja balavāgide|Father's shoulders are strong.
ಭೂ|ಭೂಮಿ|bhūmi|🌍|ಭೂಮಿ ದುಂಡಗಿದೆ.|bhūmi duṇḍagide|The earth is round.
ಭೇ|ಭೇಟಿ|bhēṭi|🤝|ನಾಳೆ ಗೆಳೆಯನ ಭೇಟಿ ಮಾಡುತ್ತೇನೆ.|nāḷe geḷeyana bhēṭi māḍuttēne|I will meet my friend tomorrow.
ಭೋ|ಭೋಜನ|bhōjana|🍛|ಮಧ್ಯಾಹ್ನದ ಭೋಜನ ಸಿದ್ಧ.|madhyāhnada bhōjana siddha|Lunch is ready.
ಮಾ|ಮಾವಿನಹಣ್ಣು|māvinahaṇṇu|🥭|ಮಾವಿನಹಣ್ಣು ಸಿಹಿಯಾಗಿದೆ.|māvinahaṇṇu sihiyāgide|The mango is sweet.
ಮಿ|ಮಿಂಚು|miñcu|⚡|ಆಕಾಶದಲ್ಲಿ ಮಿಂಚು ಕಾಣುತ್ತಿದೆ.|ākāśadalli miñcu kāṇuttide|Lightning is seen in the sky.
ಮೀ|ಮೀನು|mīnu|🐟|ಮೀನು ನೀರಿನಲ್ಲಿ ಈಜುತ್ತದೆ.|mīnu nīrinalli ījuttade|The fish swims in the water.
ಮು|ಮುಖ|mukha|🙂|ಅವಳ ಮುಖ ನಗುತ್ತಿದೆ.|avaḷa mukha naguttide|Her face is smiling.
ಮೂ|ಮೂಗು|mūgu|👃|ನಾನು ಮೂಗಿನಿಂದ ಉಸಿರಾಡುತ್ತೇನೆ.|nānu mūginiṃda usirāḍuttēne|I breathe through my nose.
ಮೃ|ಮೃಗ|mṛga|🦁|ಸಿಂಹ ಕಾಡಿನ ಮೃಗ.|siṃha kāḍina mṛga|The lion is a wild animal.
ಮೆ|ಮೆಣಸಿನಕಾಯಿ|meṇasinakāyi|🌶️|ಮೆಣಸಿನಕಾಯಿ ಖಾರವಾಗಿದೆ.|meṇasinakāyi khāravāgide|The chilli is hot.
ಮೇ|ಮೇಕೆ|mēke|🐐|ಮೇಕೆ ಹುಲ್ಲು ತಿನ್ನುತ್ತದೆ.|mēke hullu tinnuttade|The goat eats grass.
ಮೈ|ಮೈದಾನ|maidāna|🏟️|ಮಕ್ಕಳು ಮೈದಾನದಲ್ಲಿ ಆಡುತ್ತಾರೆ.|makkaḷu maidānadalli āḍuttāre|The children play in the ground.
ಮೊ|ಮೊಲ|mola|🐇|ಮೊಲ ಜಿಗಿಯುತ್ತದೆ.|mola jigiyuttade|The rabbit hops.
ಮೋ|ಮೋಡ|mōḍa|☁️|ಆಕಾಶದಲ್ಲಿ ಮೋಡ ಇದೆ.|ākāśadalli mōḍa ide|There is a cloud in the sky.
ಮೌ|ಮೌನ|mauna|🤫|ತರಗತಿಯಲ್ಲಿ ಮೌನ ಇರಲಿ.|taragatiyalli mauna irali|Keep silence in the class.
ಮಂ|ಮಂಚ|mañca|🛏️|ನಾನು ಮಂಚದಲ್ಲಿ ಮಲಗುತ್ತೇನೆ.|nānu mañcadalli malaguttēne|I sleep on the cot.
ಯಾ|ಯಾತ್ರೆ|yātre|🧳|ಅಜ್ಜಿ ಕಾಶಿ ಯಾತ್ರೆಗೆ ಹೋದರು.|ajji kāśi yātrege hōdaru|Grandma went on a pilgrimage to Kashi.
ಯು|ಯುದ್ಧ|yuddha|⚔️|ರಾಜ ಯುದ್ಧಕ್ಕೆ ಹೋದನು.|rāja yuddhakke hōdanu|The king went to war.
ಯೋ|ಯೋಗ|yōga|🧘|ಯೋಗ ಆರೋಗ್ಯಕ್ಕೆ ಒಳ್ಳೆಯದು.|yōga ārōgyakke oḷḷeyadu|Yoga is good for health.
ಯಂ|ಯಂತ್ರ|yantra|⚙️|ಕಾರ್ಖಾನೆಯಲ್ಲಿ ದೊಡ್ಡ ಯಂತ್ರ ಇದೆ.|kārkhāneyalli doḍḍa yantra ide|There is a big machine in the factory.
ರಾ|ರಾಜ|rāja|🤴|ರಾಜ ಕುದುರೆ ಏರಿದನು.|rāja kudure ēridanu|The king rode a horse.
ರಿ|ರಿಕ್ಷಾ|rikṣā|🛺|ನಾವು ರಿಕ್ಷಾದಲ್ಲಿ ಹೋದೆವು.|nāvu rikṣādalli hōdevu|We went by auto-rickshaw.
ರು|ರುಚಿ|ruci|😋|ಊಟ ತುಂಬಾ ರುಚಿಯಾಗಿದೆ.|ūṭa tumbā ruciyāgide|The food is very tasty.
ರೂ|ರೂಪಾಯಿ|rūpāyi|💰|ನನ್ನ ಬಳಿ ಹತ್ತು ರೂಪಾಯಿ ಇದೆ.|nanna baḷi hattu rūpāyi ide|I have ten rupees.
ರೆ|ರೆಕ್ಕೆ|rekke|🪶|ಹಕ್ಕಿಗೆ ಎರಡು ರೆಕ್ಕೆ ಇವೆ.|hakkige eraḍu rekke ive|A bird has two wings.
ರೇ|ರೇಡಿಯೋ|rēḍiyō|📻|ಅಜ್ಜ ರೇಡಿಯೋ ಕೇಳುತ್ತಾರೆ.|ajja rēḍiyō kēḷuttāre|Grandpa listens to the radio.
ರೈ|ರೈಲು|railu|🚆|ರೈಲು ವೇಗವಾಗಿ ಓಡುತ್ತದೆ.|railu vēgavāgi ōḍuttade|The train runs fast.
ರೊ|ರೊಟ್ಟಿ|roṭṭi|🫓|ಅಮ್ಮ ರೊಟ್ಟಿ ಮಾಡುತ್ತಾರೆ.|amma roṭṭi māḍuttāre|Mother makes roti.
ರೋ|ರೋಗಿ|rōgi|🤒|ರೋಗಿ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಇದ್ದಾರೆ.|rōgi āspatreyalli iddāre|The patient is in the hospital.
ರಂ|ರಂಗೋಲಿ|raṅgōli|🎨|ಅಕ್ಕ ಮನೆಯ ಮುಂದೆ ರಂಗೋಲಿ ಹಾಕುತ್ತಾಳೆ.|akka maneya munde raṅgōli hākuttāḷe|My sister draws rangoli in front of the house.
ಲಾ|ಲಾರಿ|lāri|🚚|ಲಾರಿ ಸಾಮಾನು ತರುತ್ತದೆ.|lāri sāmānu taruttade|The lorry brings goods.
ಲೆ|ಲೆಕ್ಕ|lekka|🔢|ನಾನು ಲೆಕ್ಕ ಮಾಡುತ್ತೇನೆ.|nānu lekka māḍuttēne|I do sums.
ಲೇ|ಲೇಖನಿ|lēkhani|🖊️|ಇದು ನನ್ನ ಲೇಖನಿ.|idu nanna lēkhani|This is my pen.
ಲೋ|ಲೋಟ|lōṭa|🥛|ಲೋಟದಲ್ಲಿ ಹಾಲು ಇದೆ.|lōṭadalli hālu ide|There is milk in the glass.
ಲಂ|ಲಂಗ|laṅga|👗|ಹುಡುಗಿ ಹೊಸ ಲಂಗ ಹಾಕಿದ್ದಾಳೆ.|huḍugi hosa laṅga hākiddāḷe|The girl wears a new skirt.
ಖೆ|ಖೆಡ್ಡಾ|kheḍḍā|🐘|ಹಿಂದೆ ಆನೆಗಳನ್ನು ಖೆಡ್ಡಾದಲ್ಲಿ ಹಿಡಿಯುತ್ತಿದ್ದರು.|hinde ānegaḷannu kheḍḍādalli hiḍiyuttiddaru|Long ago elephants were caught in a khedda trap.
ಘು|ಲಘು|laghu|🪶|ಸಂಜೆ ಲಘು ಉಪಾಹಾರ ತಿನ್ನೋಣ.|sanje laghu upāhāra tinnōṇa|Let us eat a light snack in the evening.|ಘು
ಘಂ|ಘಂಟೆ|ghaṇṭe|🛕|ದೇವಸ್ಥಾನದಲ್ಲಿ ಘಂಟೆ ಬಾರಿಸುತ್ತಾರೆ.|dēvasthānadalli ghaṇṭe bārisuttāre|They ring the bell in the temple.
ಚೋ|ಚೋಳ|cōḷa|👑|ಚೋಳರು ದಕ್ಷಿಣ ಭಾರತವನ್ನು ಆಳಿದರು.|cōḷaru dakṣiṇa bhāratavannu āḷidaru|The Cholas ruled South India.
ಛಿ|ಛಿದ್ರ|chidra|💥|ಕನ್ನಡಿ ಛಿದ್ರ ಛಿದ್ರವಾಯಿತು.|kannaḍi chidra chidravāyitu|The mirror broke into pieces.
ಛೀ|ಛೀ|chī|🤢|ಛೀ, ಇದು ತುಂಬಾ ಕೊಳಕು!|chī, idu tumbā koḷaku|Yuck, this is very dirty!
ಛೂ|ಛೂ|chū|🪄|ಜಾದೂಗಾರ ಛೂ ಮಂತರ್ ಎಂದನು.|jādūgāra chū mantar endanu|The magician said "chhoo mantar".
ಛೆ|ಛೆ|che|😩|ಛೆ, ಬಸ್ ಹೋಗಿಬಿಟ್ಟಿತು!|che, bas hōgibiṭṭitu|Oh no, the bus has gone!
ಛೇ|ಛೇದ|chēda|➗|ಭಿನ್ನರಾಶಿಯ ಕೆಳಗಿನ ಸಂಖ್ಯೆ ಛೇದ.|bhinnarāśiya keḷagina saṅkhye chēda|The bottom number of a fraction is the denominator.
ಛಂ|ಛಂದಸ್ಸು|chandassu|📜|ಕನ್ನಡ ಪದ್ಯಕ್ಕೆ ಛಂದಸ್ಸು ಇದೆ.|kannaḍa padyakke chandassu ide|Kannada poems have metre.
ಜೂ|ಜೂನ್|jūn|🏫|ಜೂನ್ ತಿಂಗಳಲ್ಲಿ ಶಾಲೆ ಆರಂಭ.|jūn tiṅgaḷalli śāle ārambha|School starts in June.
ಜೆ|ಜೆಟ್|jeṭ|✈️|ಜೆಟ್ ವಿಮಾನ ವೇಗವಾಗಿ ಹಾರುತ್ತದೆ.|jeṭ vimāna vēgavāgi hāruttade|The jet plane flies fast.
ಜೌ|ಜೌಗು|jaugu|🐸|ಜೌಗು ಪ್ರದೇಶದಲ್ಲಿ ಕಪ್ಪೆಗಳಿವೆ.|jaugu pradēśadalli kappegaḷive|There are frogs in the marsh.
ಜಂ|ಜಂತು|jantu|🐾|ಕಾಡಿನಲ್ಲಿ ಅನೇಕ ಜಂತುಗಳಿವೆ.|kāḍinalli anēka jantugaḷive|There are many creatures in the forest.
ಝಾ|ಝಾಡಿಸು|jhāḍisu|🧹|ಅಮ್ಮ ಚಾಪೆ ಝಾಡಿಸುತ್ತಾರೆ.|amma cāpe jhāḍisuttāre|Mother shakes out the mat.
ಝಿ|ಝಿಪ್|jhip|🎒|ಚೀಲದ ಝಿಪ್ ಹಾಕು.|cīlada jhip hāku|Close the bag's zip.
ಝೀ|ಝೀಬ್ರಾ|jhībrā|🦓|ಝೀಬ್ರಾ ಮೈ ಮೇಲೆ ಪಟ್ಟೆಗಳಿವೆ.|jhībrā mai mēle paṭṭegaḷive|The zebra has stripes on its body.
ಝು|ಝುಳು|jhuḷu|🏞️|ನದಿ ಝುಳು ಝುಳು ಹರಿಯುತ್ತದೆ.|nadi jhuḷu jhuḷu hariyuttade|The river flows with a gurgle.
ಝೂ|ಝೂ|jhū|🦁|ನಾವು ಭಾನುವಾರ ಝೂಗೆ ಹೋದೆವು.|nāvu bhānuvāra jhūge hōdevu|We went to the zoo on Sunday.
ಝೆ|ಝೆರಾಕ್ಸ್|jherāks|📠|ಅಂಗಡಿಯಲ್ಲಿ ಝೆರಾಕ್ಸ್ ಮಾಡಿಸಿದೆ.|aṅgaḍiyalli jherāks māḍiside|I got a photocopy made at the shop.
ಝಂ|ಝಂಡಾ|jhaṇḍā|🚩|ಶಾಲೆಯಲ್ಲಿ ಝಂಡಾ ಹಾರಿಸಿದರು.|śāleyalli jhaṇḍā hārisidaru|They hoisted the flag at school.
ಟು|ಕುಟುಂಬ|kuṭumba|👨‍👩‍👧|ನಮ್ಮ ಕುಟುಂಬ ದೊಡ್ಡದು.|namma kuṭumba doḍḍadu|Our family is big.|ಟು
ಟೂ|ಕಾರ್ಟೂನ್|kārṭūn|📺|ಮಕ್ಕಳು ಕಾರ್ಟೂನ್ ನೋಡುತ್ತಾರೆ.|makkaḷu kārṭūn nōḍuttāre|The children watch cartoons.|ಟೂ
ಟೆ|ಟೆಂಟ್|ṭeṇṭ|⛺|ನಾವು ಕಾಡಿನಲ್ಲಿ ಟೆಂಟ್ ಹಾಕಿದೆವು.|nāvu kāḍinalli ṭeṇṭ hākidevu|We pitched a tent in the forest.
ಟೌ|ಟೌನ್|ṭaun|🏙️|ನಾವು ಟೌನ್ ಹಾಲ್ ನೋಡಿದೆವು.|nāvu ṭaun hāl nōḍidevu|We saw the town hall.
ಠಿ|ಕಠಿಣ|kaṭhiṇa|🧠|ಈ ಪ್ರಶ್ನೆ ಕಠಿಣವಾಗಿದೆ.|ī praśne kaṭhiṇavāgide|This question is hard.|ಠಿ
ಠೀ|ಠೀವಿ|ṭhīvi|🦚|ನವಿಲು ಠೀವಿಯಿಂದ ನಡೆಯುತ್ತದೆ.|navilu ṭhīviyinda naḍeyuttade|The peacock walks proudly.
ಠೋ|ಕಠೋರ|kaṭhōra|😠|ಅವನ ಮಾತು ಕಠೋರವಾಗಿತ್ತು.|avana mātu kaṭhōravāgittu|His words were harsh.|ಠೋ
ಡೀ|ಡೀಸೆಲ್|ḍīsel|⛽|ಲಾರಿಗೆ ಡೀಸೆಲ್ ಬೇಕು.|lārige ḍīsel bēku|The lorry needs diesel.
ಡು|ಹಾಡು|hāḍu|🎤|ಅವಳು ಹಾಡು ಹಾಡುತ್ತಾಳೆ.|avaḷu hāḍu hāḍuttāḷe|She sings a song.|ಡು
ಡೆ|ಹೆಡೆ|heḍe|🐍|ನಾಗರಹಾವು ಹೆಡೆ ಎತ್ತಿದೆ.|nāgarahāvu heḍe ettide|The cobra has raised its hood.|ಡೆ
ಡೇ|ಡೇರೆ|ḍēre|🎪|ಸರ್ಕಸ್ ಡೇರೆ ತುಂಬಾ ದೊಡ್ಡದು.|sarkas ḍēre tumbā doḍḍadu|The circus tent is very big.
ಡಂ|ಡಂಗುರ|ḍaṅgura|📣|ಊರಿನಲ್ಲಿ ಡಂಗುರ ಸಾರಿದರು.|ūrinalli ḍaṅgura sāridaru|They announced it in the village with a drum.
ಢಾ|ಢಾಬಾ|ḍhābā|🍛|ಹೆದ್ದಾರಿಯಲ್ಲಿ ಒಂದು ಢಾಬಾ ಇದೆ.|heddāriyalli ondu ḍhābā ide|There is a dhaba on the highway.
ಢೀ|ಢೀ|ḍhī|🐏|ಎರಡು ಟಗರುಗಳು ಢೀ ಹೊಡೆದವು.|eraḍu ṭagarugaḷu ḍhī hoḍedavu|Two rams butted heads.
ಢಂ|ಢಂ|ḍham|🧨|ಪಟಾಕಿ ಢಂ ಎಂದು ಸಿಡಿಯಿತು.|paṭāki ḍham endu siḍiyitu|The cracker went bang.
ಣಾ|ಚಾಣಾಕ್ಷ|cāṇākṣa|🦊|ನರಿ ತುಂಬಾ ಚಾಣಾಕ್ಷ ಪ್ರಾಣಿ.|nari tumbā cāṇākṣa prāṇi|The fox is a very clever animal.|ಣಾ
ಣೇ|ಗಣೇಶ|gaṇēśa|🐘|ಗಣೇಶ ಹಬ್ಬ ಬಂತು.|gaṇēśa habba bantu|The Ganesha festival has come.|ಣೇ
ನೈ|ನೈವೇದ್ಯ|naivēdya|🍚|ದೇವರಿಗೆ ನೈವೇದ್ಯ ಇಡುತ್ತಾರೆ.|dēvarige naivēdya iḍuttāre|They offer food to God.
ನಂ|ನಂದಿ|nandi|🐂|ದೇವಸ್ಥಾನದ ಮುಂದೆ ನಂದಿ ಇದೆ.|dēvasthānada munde nandi ide|There is a Nandi in front of the temple.
ತೌ|ತೌರು|tauru|🏡|ಹಬ್ಬಕ್ಕೆ ಮಗಳು ತೌರಿಗೆ ಬಂದಳು.|habbakke magaḷu taurige bandaḷu|The daughter came to her mother's home for the festival.
ಥಾ|ಕಥಾಪುಸ್ತಕ|kathāpustaka|📚|ನನ್ನ ಬಳಿ ಒಂದು ಕಥಾಪುಸ್ತಕ ಇದೆ.|nanna baḷi ondu kathāpustaka ide|I have a storybook.|ಥಾ
ಥೂ|ಥೂ|thū|😖|ಥೂ, ಈ ಔಷಧಿ ತುಂಬಾ ಕಹಿ!|thū, ī auṣadhi tumbā kahi|Ugh, this medicine is very bitter!
ಥೇ|ಯಥೇಚ್ಛ|yathēccha|💧|ಕೆರೆಯಲ್ಲಿ ಯಥೇಚ್ಛ ನೀರು ಇದೆ.|kereyalli yathēccha nīru ide|There is plenty of water in the lake.|ಥೇ
ಥಂ|ಥಂಡಿ|thaṇḍi|🥶|ಇವತ್ತು ತುಂಬಾ ಥಂಡಿ ಇದೆ.|ivattu tumbā thaṇḍi ide|It is very cold today.
ದೌ|ದೌಡು|dauḍu|🏃|ಪೊಲೀಸರು ಸ್ಥಳಕ್ಕೆ ದೌಡಾಯಿಸಿದರು.|polīsaru sthaḷakke dauḍāyisidaru|The police rushed to the spot.
ಧಿ|ಔಷಧಿ|auṣadhi|💊|ಜ್ವರಕ್ಕೆ ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳಿ.|jvarakke auṣadhi tegedukoḷḷi|Take medicine for the fever.|ಧಿ
ಧು|ವಧು|vadhu|👰|ಮದುವೆಯಲ್ಲಿ ವಧು ಸುಂದರವಾಗಿದ್ದಳು.|maduveyalli vadhu sundaravāgiddaḷu|The bride looked beautiful at the wedding.|ಧು
ಧೃ|ಧೃತರಾಷ್ಟ್ರ|dhṛtarāṣṭra|👑|ಧೃತರಾಷ್ಟ್ರ ಕುರುಡ ರಾಜ.|dhṛtarāṣṭra kuruḍa rāja|Dhritarashtra was a blind king.
ಧೆ|ಬಾಧೆ|bādhe|🦟|ಸೊಳ್ಳೆಗಳ ಬಾಧೆ ಹೆಚ್ಚಾಗಿದೆ.|soḷḷegaḷa bādhe heccāgide|The trouble from mosquitoes has grown.|ಧೆ
ಧೊ|ಧೊಪ್ಪನೆ|dhoppane|🍈|ಮರದಿಂದ ಹಲಸಿನಹಣ್ಣು ಧೊಪ್ಪನೆ ಬಿತ್ತು.|maradinda halasinahaṇṇu dhoppane bittu|The jackfruit fell from the tree with a thud.
ಪೀ|ಪೀಪಿ|pīpi|🎺|ಜಾತ್ರೆಯಲ್ಲಿ ಪೀಪಿ ಕೊಂಡೆವು.|jātreyalli pīpi koṇḍevu|We bought a toy whistle at the fair.
ಪೋ|ಪೋಷಕರು|pōṣakaru|👪|ಪೋಷಕರ ಸಭೆ ನಾಳೆ ಇದೆ.|pōṣakara sabhe nāḷe ide|The parents' meeting is tomorrow.
ಪೌ|ಪೌಡರ್|pauḍar|🧴|ಮಗುವಿಗೆ ಪೌಡರ್ ಹಾಕಿ.|maguvige pauḍar hāki|Put powder on the baby.
ಫಾ|ಫಾರ್ಮ್|phārm|📝|ಅರ್ಜಿ ಫಾರ್ಮ್ ತುಂಬಿರಿ.|arji phārm tumbiri|Fill in the application form.
ಫಿ|ಫಿರಂಗಿ|phiraṅgi|🏰|ಕೋಟೆಯ ಮೇಲೆ ಫಿರಂಗಿ ಇದೆ.|kōṭeya mēle phiraṅgi ide|There is a cannon on the fort.
ಫೀ|ಫೀಸ್|phīs|🧾|ಶಾಲೆಯ ಫೀಸ್ ಕಟ್ಟಿದೆವು.|śāleya phīs kaṭṭidevu|We paid the school fees.
ಫು|ಫುಟ್ಬಾಲ್|phuṭbāl|⚽|ಅವನು ಫುಟ್ಬಾಲ್ ಆಡುತ್ತಾನೆ.|avanu phuṭbāl āḍuttāne|He plays football.
ಫೂ|ಫೂ|phū|🕯️|ಮಗು ಮೇಣದಬತ್ತಿಗೆ ಫೂ ಎಂದು ಊದಿತು.|magu mēṇadabattige phū endu ūditu|The child blew "phoo" at the candle.
ಫೆ|ಫೆಬ್ರವರಿ|phebravari|📅|ಫೆಬ್ರವರಿ ಚಿಕ್ಕ ತಿಂಗಳು.|phebravari cikka tiṅgaḷu|February is a short month.
ಫೈ|ಫೈಲ್|phail|📁|ಮೇಜಿನ ಮೇಲೆ ಫೈಲ್ ಇದೆ.|mējina mēle phail ide|There is a file on the table.
ಫೌ|ಫೌಂಟನ್|phauṇṭan|🖋️|ಅಜ್ಜನ ಬಳಿ ಫೌಂಟನ್ ಪೆನ್ ಇದೆ.|ajjana baḷi phauṇṭan pen ide|Grandpa has a fountain pen.
ಬೃ|ಬೃಂದಾವನ|bṛndāvana|🌷|ಮೈಸೂರಿನ ಬೃಂದಾವನ ಉದ್ಯಾನ ಸುಂದರ.|maisūrina bṛndāvana udyāna sundara|Mysuru's Brindavan Gardens are beautiful.
ಬೊ|ಬೊಂಬೆ|bombe|🪆|ದಸರಾದಲ್ಲಿ ಬೊಂಬೆ ಕೂರಿಸುತ್ತೇವೆ.|dasarādalli bombe kūrisuttēve|We set out dolls during Dasara.
ಬೌ|ಬೌದ್ಧ|bauddha|☸️|ಇದು ಒಂದು ಬೌದ್ಧ ಮಂದಿರ.|idu ondu bauddha mandira|This is a Buddhist temple.
ಭಿ|ಭಿತ್ತಿಪತ್ರ|bhittipatra|🪧|ಗೋಡೆಯ ಮೇಲೆ ಭಿತ್ತಿಪತ್ರ ಇದೆ.|gōḍeya mēle bhittipatra ide|There is a poster on the wall.
ಭೀ|ಭೀಮ|bhīma|💪|ಭೀಮ ತುಂಬಾ ಬಲಶಾಲಿ.|bhīma tumbā balaśāli|Bhima is very strong.
ಭೆ|ಸಭೆ|sabhe|👥|ಶಾಲೆಯಲ್ಲಿ ಸಭೆ ನಡೆಯಿತು.|śāleyalli sabhe naḍeyitu|A meeting was held at school.|ಭೆ
ಭೌ|ಭೌತಶಾಸ್ತ್ರ|bhautaśāstra|🔭|ಅಕ್ಕ ಭೌತಶಾಸ್ತ್ರ ಓದುತ್ತಾಳೆ.|akka bhautaśāstra ōduttāḷe|My sister studies physics.
ಭಂ|ಭಂಗಿ|bhaṅgi|🤸|ಯೋಗದಲ್ಲಿ ಅನೇಕ ಭಂಗಿಗಳಿವೆ.|yōgadalli anēka bhaṅgigaḷive|Yoga has many poses.
ಯಿ|ಬಾಯಿ|bāyi|👄|ಮಗು ಬಾಯಿ ತೆರೆಯಿತು.|magu bāyi tereyitu|The baby opened its mouth.|ಯಿ
ಯೂ|ಯೂನಿಫಾರ್ಮ್|yūniphārm|👕|ಶಾಲೆಗೆ ಯೂನಿಫಾರ್ಮ್ ಹಾಕುತ್ತೇವೆ.|śālege yūniphārm hākuttēve|We wear a uniform to school.
ಯೇ|ಯೇಸು|yēsu|🎄|ಕ್ರಿಸ್ಮಸ್ ಯೇಸುವಿನ ಹುಟ್ಟುಹಬ್ಬ.|krismas yēsuvina huṭṭuhabba|Christmas is the birthday of Jesus.
ಯೌ|ಯೌವನ|yauvana|🧑|ಯೌವನದಲ್ಲಿ ಶಕ್ತಿ ಹೆಚ್ಚು.|yauvanadalli śakti heccu|There is more strength in youth.
ರೀ|ರೀಚಾರ್ಜ್|rīcārj|📱|ಫೋನ್ ರೀಚಾರ್ಜ್ ಮಾಡಿ.|phōn rīcārj māḍi|Recharge the phone.
ರೌ|ರೌದ್ರ|raudra|🐯|ಹುಲಿ ರೌದ್ರವಾಗಿ ಘರ್ಜಿಸಿತು.|huli raudravāgi gharjisitu|The tiger roared fiercely.
ಲಿ|ಲಿಫ್ಟ್|liphṭ|🛗|ನಾವು ಲಿಫ್ಟ್ ಹತ್ತಿದೆವು.|nāvu liphṭ hattidevu|We took the lift.
ಲೀ|ಲೀಟರ್|līṭar|🍼|ಒಂದು ಲೀಟರ್ ಹಾಲು ತನ್ನಿ.|ondu līṭar hālu tanni|Bring a litre of milk.
ಲು|ಹಾಲು|hālu|🐄|ಹಸು ಹಾಲು ಕೊಡುತ್ತದೆ.|hasu hālu koḍuttade|The cow gives milk.|ಲು
ಲೂ|ಲೂಟಿ|lūṭi|💰|ಕಳ್ಳರು ಅಂಗಡಿ ಲೂಟಿ ಮಾಡಿದರು.|kaḷḷaru aṅgaḍi lūṭi māḍidaru|The thieves looted the shop.
ಲೈ|ಲೈಟ್|laiṭ|💡|ಕೋಣೆಯ ಲೈಟ್ ಆನ್ ಮಾಡಿ.|kōṇeya laiṭ ān māḍi|Switch on the room's light.
ಡೋ|ಡೋಲು|ḍōlu|🪘|ಮದುವೆಯಲ್ಲಿ ಡೋಲು ಬಾರಿಸಿದರು.|maduveyalli ḍōlu bārisidaru|They played the drum at the wedding.
ಠೇ|ಠೇವಣಿ|ṭhēvaṇi|🏦|ಬ್ಯಾಂಕಿನಲ್ಲಿ ಹಣ ಠೇವಣಿ ಇಟ್ಟೆವು.|byāṅkinalli haṇa ṭhēvaṇi iṭṭevu|We deposited money in the bank.
ಧೇ|ಕಾಮಧೇನು|kāmadhēnu|🐄|ಕಾಮಧೇನು ಆಸೆ ಈಡೇರಿಸುವ ಹಸು.|kāmadhēnu āse īḍērisuva hasu|Kamadhenu is the wish-granting cow.|ಧೇ
`),
    hi: nfc(`
खा|खाना|khānā|🍛|हम रात को खाना खाते हैं।|ham rāt ko khānā khāte haĩ|We eat food at night.
खि|खिलौना|khilaunā|🧸|यह मेरा नया खिलौना है।|yah merā nayā khilaunā hai|This is my new toy.
खी|खीरा|khīrā|🥒|खीरा हरा होता है।|khīrā harā hotā hai|The cucumber is green.
खु|खुशी|khuśī|😊|आज मुझे बहुत खुशी है।|āj mujhe bahut khuśī hai|I am very happy today.
खू|खूँटी|khū̃ṭī|🪝|कपड़े खूँटी पर टँगे हैं।|kapṛe khū̃ṭī par ṭãge haĩ|The clothes hang on the peg.
खे|खेत|khet|🌾|हमारा खेत बड़ा है।|hamārā khet baṛā hai|Our field is big.
खो|खोपरा|khoprā|🥥|खोपरा मीठा होता है।|khoprā mīṭhā hotā hai|Dried coconut is sweet.
खं|खंभा|khambhā|🏛️|यह खंभा ऊँचा है।|yah khambhā ū̃cā hai|This pillar is tall.
गा|गाय|gāy|🐄|गाय दूध देती है।|gāy dūdh detī hai|The cow gives milk.
गि|गिलास|gilās|🥛|गिलास में पानी है।|gilās mẽ pānī hai|There is water in the glass.
गी|गीत|gīt|🎵|यह गीत बहुत सुंदर है।|yah gīt bahut sundar hai|This song is very beautiful.
गु|गुलाब|gulāb|🌹|गुलाब लाल है।|gulāb lāl hai|The rose is red.
गृ|गृहकार्य|gṛhkārya|📝|मैंने गृहकार्य पूरा किया।|maĩne gṛhkārya pūrā kiyā|I finished my homework.
गे|गेंद|gẽd|⚽|बच्चे गेंद से खेलते हैं।|bacce gẽd se khelte haĩ|The children play with a ball.
गै|गैस|gais|🔥|रसोई में गैस है।|rasoī mẽ gais hai|There is gas in the kitchen.
गो|गोभी|gobhī|🥦|माँ ने गोभी की सब्ज़ी बनाई।|mā̃ ne gobhī kī sabzī banāī|Mother made a cauliflower dish.
गौ|गौरैया|gauraiyā|🐦|गौरैया छोटी चिड़िया है।|gauraiyā choṭī ciṛiyā hai|The sparrow is a small bird.
गं|गंगा|gaṅgā|🏞️|गंगा एक बड़ी नदी है।|gaṅgā ek baṛī nadī hai|The Ganga is a big river.
घा|घास|ghās|🌿|मैदान में हरी घास है।|maidān mẽ harī ghās hai|There is green grass in the field.
घी|घी|ghī|🧈|रोटी पर घी लगाओ।|roṭī par ghī lagāo|Put ghee on the roti.
घु|घुटना|ghuṭnā|🦵|मेरे घुटने में दर्द है।|mere ghuṭne mẽ dard hai|My knee hurts.
घू|घूमना|ghūmnā|🚶|हम पार्क में घूमने गए।|ham pārk mẽ ghūmne gae|We went for a walk in the park.
घो|घोड़ा|ghoṛā|🐎|घोड़ा तेज़ दौड़ता है।|ghoṛā tez dauṛtā hai|The horse runs fast.
घं|घंटी|ghaṇṭī|🔔|स्कूल की घंटी बजी।|skūl kī ghaṇṭī bajī|The school bell rang.
चा|चाबी|cābī|🔑|यह दरवाज़े की चाबी है।|yah darvāze kī cābī hai|This is the key of the door.
चि|चिड़िया|ciṛiyā|🐦|चिड़िया पेड़ पर बैठी है।|ciṛiyā peṛ par baiṭhī hai|The bird sits on the tree.
ची|चींटी|cī̃ṭī|🐜|चींटी मेहनती होती है।|cī̃ṭī mehnatī hotī hai|The ant is hardworking.
चू|चूहा|cūhā|🐭|चूहा बिल में रहता है।|cūhā bil mẽ rahtā hai|The mouse lives in a hole.
चे|चेहरा|cehrā|🙂|उसका चेहरा सुंदर है।|uskā cehrā sundar hai|Her face is beautiful.
चो|चोटी|coṭī|⛰️|पहाड़ की चोटी ऊँची है।|pahāṛ kī coṭī ū̃cī hai|The mountain peak is high.
चौ|चौकीदार|caukīdār|💂|चौकीदार रात को जागता है।|caukīdār rāt ko jāgtā hai|The watchman stays awake at night.
चं|चंद्रमा|candramā|🌙|रात में चंद्रमा चमकता है।|rāt mẽ candramā camaktā hai|The moon shines at night.
छा|छाता|chātā|☂️|बारिश में छाता लो।|bāriś mẽ chātā lo|Take an umbrella in the rain.
छि|छिपकली|chipkalī|🦎|छिपकली दीवार पर है।|chipkalī dīvār par hai|The lizard is on the wall.
छी|छींक|chī̃k|🤧|मुझे छींक आई।|mujhe chī̃k āī|I sneezed.
छु|छुट्टी|chuṭṭī|🏖️|आज स्कूल की छुट्टी है।|āj skūl kī chuṭṭī hai|Today is a school holiday.
छे|छेद|ched|🕳️|कपड़े में छेद है।|kapṛe mẽ ched hai|There is a hole in the cloth.
छो|छोटा|choṭā|👦|मेरा छोटा भाई स्कूल जाता है।|merā choṭā bhāī skūl jātā hai|My little brother goes to school.
जा|जामुन|jāmun|🫐|जामुन बैंगनी होता है।|jāmun baĩganī hotā hai|The jamun is purple.
जि|जिराफ़|jirāf|🦒|जिराफ़ की गर्दन लंबी है।|jirāf kī gardan lambī hai|The giraffe has a long neck.
जी|जीभ|jībh|👅|हम जीभ से स्वाद लेते हैं।|ham jībh se svād lete haĩ|We taste with the tongue.
जु|जुलाई|julāī|☔|जुलाई में बारिश होती है।|julāī mẽ bāriś hotī hai|It rains in July.
जू|जूता|jūtā|👟|मेरा जूता नया है।|merā jūtā nayā hai|My shoe is new.
जे|जेब|jeb|👖|मेरी जेब में पैसे हैं।|merī jeb mẽ paise haĩ|There is money in my pocket.
जो|जोकर|jokar|🤡|जोकर हमें हँसाता है।|jokar hamẽ hãsātā hai|The joker makes us laugh.
जौ|जौ|jau|🌾|खेत में जौ उगता है।|khet mẽ jau ugtā hai|Barley grows in the field.
जं|जंगल|jaṅgal|🌳|शेर जंगल में रहता है।|śer jaṅgal mẽ rahtā hai|The lion lives in the jungle.
झा|झाड़ू|jhāṛū|🧹|माँ झाड़ू लगाती है।|mā̃ jhāṛū lagātī hai|Mother sweeps with a broom.
झी|झील|jhīl|🏞️|झील का पानी साफ़ है।|jhīl kā pānī sāf hai|The lake water is clean.
झु|झुमका|jhumkā|💎|उसने सुंदर झुमके पहने।|usne sundar jhumke pahne|She wore pretty earrings.
झू|झूला|jhūlā|🎠|बच्चे झूला झूलते हैं।|bacce jhūlā jhūlte haĩ|Children swing on the swing.
झो|झोला|jholā|👜|झोले में सब्ज़ी है।|jhole mẽ sabzī hai|There are vegetables in the bag.
झं|झंडा|jhaṇḍā|🇮🇳|हमारा झंडा तिरंगा है।|hamārā jhaṇḍā tiraṅgā hai|Our flag is the tricolour.
टा|टापू|ṭāpū|🏝️|समुद्र में एक टापू है।|samudra mẽ ek ṭāpū hai|There is an island in the sea.
टि|टिकट|ṭikaṭ|🎫|बस का टिकट लो।|bas kā ṭikaṭ lo|Take the bus ticket.
टी|टीवी|ṭīvī|📺|हम टीवी देखते हैं।|ham ṭīvī dekhte haĩ|We watch TV.
टु|टुकड़ा|ṭukṛā|🍰|मुझे केक का टुकड़ा दो।|mujhe kek kā ṭukṛā do|Give me a piece of cake.
टे|टेलीफ़ोन|ṭelīfon|☎️|टेलीफ़ोन की घंटी बजी।|ṭelīfon kī ghaṇṭī bajī|The telephone rang.
टै|टैक्सी|ṭaiksī|🚕|हम टैक्सी से गए।|ham ṭaiksī se gae|We went by taxi.
टो|टोपी|ṭopī|🧢|दादा टोपी पहनते हैं।|dādā ṭopī pahante haĩ|Grandpa wears a cap.
ठी|ठीक|ṭhīk|👍|मैं ठीक हूँ।|maĩ ṭhīk hū̃|I am fine.
ठे|ठेला|ṭhelā|🛒|ठेले पर फल हैं।|ṭhele par phal haĩ|There is fruit on the cart.
ठं|ठंड|ṭhaṇḍ|🥶|आज बहुत ठंड है।|āj bahut ṭhaṇḍ hai|It is very cold today.
डा|डाकिया|ḍākiyā|📬|डाकिया चिट्ठी लाता है।|ḍākiyā ciṭṭhī lātā hai|The postman brings letters.
डि|डिब्बा|ḍibbā|📦|डिब्बे में मिठाई है।|ḍibbe mẽ miṭhāī hai|There are sweets in the box.
डो|डोसा|ḍosā|🥞|मुझे डोसा पसंद है।|mujhe ḍosā pasand hai|I like dosa.
डं|डंडा|ḍaṇḍā|🏏|उसके हाथ में डंडा है।|uske hāth mẽ ḍaṇḍā hai|He has a stick in his hand.
ढो|ढोल|ḍhol|🥁|शादी में ढोल बजता है।|śādī mẽ ḍhol bajtā hai|The drum is played at the wedding.
णि|मणि|maṇi|💎|राजा के मुकुट में मणि है।|rājā ke mukuṭ mẽ maṇi hai|There is a gem in the king's crown.|णि
ना|नाव|nāv|⛵|नदी में नाव चलती है।|nadī mẽ nāv caltī hai|The boat moves on the river.
नी|नींबू|nī̃bū|🍋|नींबू खट्टा होता है।|nī̃bū khaṭṭā hotā hai|The lemon is sour.
नू|नूडल्स|nūḍals|🍜|बच्चों को नूडल्स पसंद हैं।|baccõ ko nūḍals pasand haĩ|Children like noodles.
नृ|नृत्य|nṛtya|💃|वह नृत्य करती है।|vah nṛtya kartī hai|She dances.
नो|नोट|noṭ|💵|यह सौ रुपये का नोट है।|yah sau rupaye kā noṭ hai|This is a hundred-rupee note.
नौ|नौ|nau|9️⃣|मेरे पास नौ कलम हैं।|mere pās nau kalam haĩ|I have nine pens.
नं|नंबर|nambar|🔢|मेरा नंबर पहला है।|merā nambar pahlā hai|My number is first.
ता|ताला|tālā|🔒|दरवाज़े पर ताला है।|darvāze par tālā hai|There is a lock on the door.
ति|तितली|titlī|🦋|तितली फूल पर बैठी है।|titlī phūl par baiṭhī hai|The butterfly sits on the flower.
ती|तीर|tīr|🏹|शिकारी ने तीर चलाया।|śikārī ne tīr calāyā|The hunter shot an arrow.
तु|तुलसी|tulsī|🌿|आँगन में तुलसी का पौधा है।|ā̃gan mẽ tulsī kā paudhā hai|There is a tulsi plant in the courtyard.
तू|तूफ़ान|tūfān|🌪️|कल रात तूफ़ान आया।|kal rāt tūfān āyā|A storm came last night.
ते|तेल|tel|🛢️|दीये में तेल डालो।|dīye mẽ tel ḍālo|Pour oil in the lamp.
तै|तैराक|tairāk|🏊|वह अच्छा तैराक है।|vah acchā tairāk hai|He is a good swimmer.
तो|तोता|totā|🦜|तोता हरा होता है।|totā harā hotā hai|The parrot is green.
तौ|तौलिया|tauliyā|🛁|तौलिया गीला है।|tauliyā gīlā hai|The towel is wet.
था|थाली|thālī|🍽️|थाली में खाना है।|thālī mẽ khānā hai|There is food in the plate.
थै|थैला|thailā|🛍️|थैले में सामान है।|thaile mẽ sāmān hai|There are things in the bag.
दा|दादी|dādī|👵|दादी कहानी सुनाती हैं।|dādī kahānī sunātī haĩ|Grandma tells a story.
दि|दिल|dil|❤️|मेरा दिल धड़कता है।|merā dil dhaṛaktā hai|My heart beats.
दी|दीया|dīyā|🪔|शाम को दीया जलाओ।|śām ko dīyā jalāo|Light the lamp in the evening.
दु|दुकान|dukān|🏪|दुकान में फल मिलते हैं।|dukān mẽ phal milte haĩ|Fruits are sold in the shop.
दू|दूध|dūdh|🥛|बच्चे दूध पीते हैं।|bacce dūdh pīte haĩ|Children drink milk.
दृ|दृश्य|dṛśya|🏞️|यह दृश्य सुंदर है।|yah dṛśya sundar hai|This view is beautiful.
दे|देश|deś|🇮🇳|भारत हमारा देश है।|bhārat hamārā deś hai|India is our country.
दो|दोस्त|dost|🧑‍🤝‍🧑|मेरा दोस्त अच्छा है।|merā dost acchā hai|My friend is good.
दौ|दौड़|dauṛ|🏃|मैं दौड़ में पहला आया।|maĩ dauṛ mẽ pahlā āyā|I came first in the race.
धा|धागा|dhāgā|🧵|सुई में धागा डालो।|suī mẽ dhāgā ḍālo|Thread the needle.
धु|धुआँ|dhuā̃|💨|चूल्हे से धुआँ निकलता है।|cūlhe se dhuā̃ nikaltā hai|Smoke comes from the stove.
धू|धूप|dhūp|☀️|बाहर तेज़ धूप है।|bāhar tez dhūp hai|It is very sunny outside.
धो|धोबी|dhobī|👕|धोबी कपड़े धोता है।|dhobī kapṛe dhotā hai|The washerman washes clothes.
पा|पानी|pānī|💧|गिलास में पानी है।|gilās mẽ pānī hai|There is water in the glass.
पि|पिता|pitā|👨|मेरे पिता डॉक्टर हैं।|mere pitā ḍākṭar haĩ|My father is a doctor.
पी|पीपल|pīpal|🌳|पीपल के पत्ते हरे हैं।|pīpal ke patte hare haĩ|Peepal leaves are green.
पु|पुस्तक|pustak|📚|यह मेरी पुस्तक है।|yah merī pustak hai|This is my book.
पू|पूरी|pūrī|🫓|माँ ने पूरी बनाई।|mā̃ ne pūrī banāī|Mother made puris.
पृ|पृथ्वी|pṛthvī|🌍|पृथ्वी गोल है।|pṛthvī gol hai|The earth is round.
पे|पेड़|peṛ|🌲|पेड़ पर पक्षी हैं।|peṛ par pakṣī haĩ|There are birds on the tree.
पै|पैर|pair|🦶|मेरे पैर में चोट है।|mere pair mẽ coṭ hai|My foot is hurt.
पौ|पौधा|paudhā|🪴|बगीचे में नया पौधा है।|bagīce mẽ nayā paudhā hai|There is a new plant in the garden.
पं|पंखा|paṅkhā|🌀|पंखा चल रहा है।|paṅkhā cal rahā hai|The fan is running.
फू|फूल|phūl|🌸|बगीचे में फूल खिले हैं।|bagīce mẽ phūl khile haĩ|Flowers bloom in the garden.
फो|फोन|phon|📱|माँ का फोन आया।|mā̃ kā phon āyā|Mother called.
फौ|फौजी|faujī|💂|फौजी देश की रक्षा करता है।|faujī deś kī rakṣā kartā hai|The soldier protects the country.
बा|बादल|bādal|☁️|आसमान में बादल हैं।|āsmān mẽ bādal haĩ|There are clouds in the sky.
बि|बिल्ली|billī|🐈|बिल्ली दूध पीती है।|billī dūdh pītī hai|The cat drinks milk.
बी|बीज|bīj|🌱|मिट्टी में बीज डालो।|miṭṭī mẽ bīj ḍālo|Put the seed in the soil.
बु|बुलबुल|bulbul|🐦|बुलबुल मीठा गाती है।|bulbul mīṭhā gātī hai|The bulbul sings sweetly.
बू|बूँद|bū̃d|💧|पत्ते पर पानी की बूँद है।|patte par pānī kī bū̃d hai|There is a drop of water on the leaf.
बे|बेर|ber|🍒|पेड़ पर बेर लगे हैं।|peṛ par ber lage haĩ|Berries grow on the tree.
बै|बैल|bail|🐂|बैल खेत जोतता है।|bail khet jottā hai|The ox ploughs the field.
बो|बोतल|botal|🍼|बोतल में पानी है।|botal mẽ pānī hai|There is water in the bottle.
बं|बंदर|bandar|🐒|बंदर पेड़ पर चढ़ता है।|bandar peṛ par caṛhtā hai|The monkey climbs the tree.
भा|भालू|bhālū|🐻|भालू जंगल में रहता है।|bhālū jaṅgal mẽ rahtā hai|The bear lives in the forest.
भि|भिंडी|bhiṇḍī|🌿|भिंडी हरी होती है।|bhiṇḍī harī hotī hai|Okra is green.
भु|भुट्टा|bhuṭṭā|🌽|भुट्टा पीला होता है।|bhuṭṭā pīlā hotā hai|Corn is yellow.
भू|भूख|bhūkh|😋|मुझे भूख लगी है।|mujhe bhūkh lagī hai|I am hungry.
भे|भेड़|bheṛ|🐑|भेड़ घास खाती है।|bheṛ ghās khātī hai|The sheep eats grass.
भै|भैंस|bhaĩs|🐃|भैंस काली होती है।|bhaĩs kālī hotī hai|The buffalo is black.
भो|भोजन|bhojan|🍛|भोजन तैयार है।|bhojan taiyār hai|The meal is ready.
मा|माला|mālā|📿|फूलों की माला सुंदर है।|phūlõ kī mālā sundar hai|The garland of flowers is beautiful.
मि|मिठाई|miṭhāī|🍬|दादी ने मिठाई बनाई।|dādī ne miṭhāī banāī|Grandma made sweets.
मी|मीनार|mīnār|🗼|यह मीनार ऊँची है।|yah mīnār ū̃cī hai|This tower is tall.
मु|मुर्गा|murgā|🐓|मुर्गा सुबह बोलता है।|murgā subah boltā hai|The rooster crows in the morning.
मू|मूँछ|mū̃ch|🥸|दादा की मूँछ सफ़ेद है।|dādā kī mū̃ch safed hai|Grandpa's moustache is white.
मे|मेज़|mez|🪑|मेज़ पर किताब है।|mez par kitāb hai|The book is on the table.
मै|मैदान|maidān|🏟️|बच्चे मैदान में खेलते हैं।|bacce maidān mẽ khelte haĩ|Children play in the ground.
मो|मोर|mor|🦚|मोर नाचता है।|mor nāctā hai|The peacock dances.
मौ|मौसम|mausam|🌦️|आज मौसम अच्छा है।|āj mausam acchā hai|The weather is nice today.
मं|मंदिर|mandir|🛕|हम मंदिर जाते हैं।|ham mandir jāte haĩ|We go to the temple.
या|यात्रा|yātrā|🧳|हमारी यात्रा लंबी थी।|hamārī yātrā lambī thī|Our journey was long.
यु|युद्ध|yuddh|⚔️|राजा युद्ध में गया।|rājā yuddh mẽ gayā|The king went to war.
यो|योग|yog|🧘|योग सेहत के लिए अच्छा है।|yog sehat ke lie acchā hai|Yoga is good for health.
रा|राजा|rājā|🤴|राजा महल में रहता है।|rājā mahal mẽ rahtā hai|The king lives in the palace.
रि|रिक्शा|rikśā|🛺|हम रिक्शा से गए।|ham rikśā se gae|We went by rickshaw.
री|रीछ|rīch|🐻|रीछ शहद खाता है।|rīch śahad khātā hai|The bear eats honey.
रु|रुमाल|rumāl|🧣|मेरा रुमाल सफ़ेद है।|merā rumāl safed hai|My handkerchief is white.
रू|रूई|rūī|☁️|रूई नरम होती है।|rūī naram hotī hai|Cotton is soft.
रे|रेल|rel|🚆|रेल पटरी पर चलती है।|rel paṭrī par caltī hai|The train runs on the track.
रो|रोटी|roṭī|🫓|माँ रोटी बनाती है।|mā̃ roṭī banātī hai|Mother makes roti.
रं|रंग|raṅg|🎨|इंद्रधनुष में सात रंग हैं।|indradhanuṣ mẽ sāt raṅg haĩ|The rainbow has seven colours.
ला|लालटेन|lālṭen|🏮|लालटेन जल रही है।|lālṭen jal rahī hai|The lantern is burning.
लि|लिफ़ाफ़ा|lifāfā|✉️|लिफ़ाफ़े में चिट्ठी है।|lifāfe mẽ ciṭṭhī hai|There is a letter in the envelope.
लो|लोटा|loṭā|🏺|लोटे में पानी है।|loṭe mẽ pānī hai|There is water in the pot.
लौ|लौकी|laukī|🥒|लौकी हरी होती है।|laukī harī hotī hai|The bottle gourd is green.
लं|लंगूर|laṅgūr|🐒|लंगूर पेड़ पर है।|laṅgūr peṛ par hai|The langur is on the tree.
खौ|खौलना|khaulnā|🫖|चूल्हे पर पानी खौलने लगा।|cūlhe par pānī khaulne lagā|The water on the stove began to boil.
गू|गूँज|gū̃j|🏔️|पहाड़ों में आवाज़ की गूँज सुनाई दी।|pahāṛõ mẽ āvāz kī gū̃j sunāī dī|An echo was heard in the mountains.
घे|घेरा|gherā|⭕|बच्चों ने घेरा बनाया।|baccõ ne gherā banāyā|The children made a circle.
चु|चुनाव|cunāv|🗳️|गाँव में चुनाव हुआ।|gā̃v mẽ cunāv huā|There was an election in the village.
चै|चैन|cain|😴|रात को चैन की नींद आई।|rāt ko cain kī nī̃d āī|I slept peacefully at night.
छू|छूट|chūṭ|🏷️|दुकान में छूट मिल रही है।|dukān mẽ chūṭ mil rahī hai|There is a discount at the shop.
छौ|छौंक|chaũk|🍲|दाल में छौंक लगाओ।|dāl mẽ chaũk lagāo|Add tempering to the dal.
छं|छंद|chand|📜|कविता में छंद होता है।|kavitā mẽ chand hotā hai|A poem has metre.
जै|जैकेट|jaikeṭ|🧥|ठंड में जैकेट पहनो।|ṭhaṇḍ mẽ jaikeṭ pahno|Wear a jacket in the cold.
झि|झिझक|jhijhak|🙈|बिना झिझक बोलो।|binā jhijhak bolo|Speak without hesitation.
टू|टूथब्रश|ṭūthbraś|🦷|सुबह टूथब्रश से दाँत साफ़ करो।|subah ṭūthbraś se dā̃t sāf karo|Brush your teeth with a toothbrush in the morning.
टं|टंकी|ṭaṅkī|🛢️|छत पर पानी की टंकी है।|chat par pānī kī ṭaṅkī hai|There is a water tank on the roof.
ठि|ठिकाना|ṭhikānā|🏠|पेड़ पक्षियों का ठिकाना है।|peṛ pakṣiyõ kā ṭhikānā hai|The tree is the birds' home.
ठो|ठोकर|ṭhokar|🪨|पत्थर से ठोकर लगी।|patthar se ṭhokar lagī|I tripped on a stone.
डी|डीज़ल|ḍīzal|⛽|ट्रक डीज़ल से चलता है।|ṭrak ḍīzal se caltā hai|The truck runs on diesel.
डु|डुबकी|ḍubkī|🏊|उसने नदी में डुबकी लगाई।|usne nadī mẽ ḍubkī lagāī|He took a dip in the river.
डू|डूब|ḍūb|🌅|शाम को सूरज डूब गया।|śām ko sūraj ḍūb gayā|The sun set in the evening.
डे|डेरा|ḍerā|⛺|सेना ने नदी किनारे डेरा डाला।|senā ne nadī kināre ḍerā ḍālā|The army camped by the river.
डै|डैडी|ḍaiḍī|👨|मेरे डैडी ऑफ़िस जाते हैं।|mere ḍaiḍī ôfis jāte haĩ|My daddy goes to the office.
ढा|ढाबा|ḍhābā|🍛|हाईवे पर एक ढाबा है।|hāīve par ek ḍhābā hai|There is a dhaba on the highway.
ढी|ढीला|ḍhīlā|👕|मेरी कमीज़ ढीली है।|merī kamīz ḍhīlī hai|My shirt is loose.
ढू|ढूँढना|ḍhū̃ḍhnā|🔍|खोई गेंद को ढूँढना पड़ा।|khoī gẽd ko ḍhū̃ḍhnā paṛā|We had to look for the lost ball.
ढे|ढेर|ḍher|🍂|आँगन में पत्तों का ढेर है।|ā̃gan mẽ pattõ kā ḍher hai|There is a heap of leaves in the courtyard.
ढं|ढंग|ḍhaṅg|🪑|सही ढंग से बैठो।|sahī ḍhaṅg se baiṭho|Sit properly.
णा|वीणा|vīṇā|🎻|सरस्वती के हाथ में वीणा है।|sarasvatī ke hāth mẽ vīṇā hai|Saraswati holds a veena.|णा
णी|वाणी|vāṇī|🗣️|उसकी वाणी मीठी है।|uskī vāṇī mīṭhī hai|Her speech is sweet.|णी
णु|अणु|aṇu|⚛️|पानी के अणु बहुत छोटे होते हैं।|pānī ke aṇu bahut choṭe hote haĩ|Water molecules are very small.|णु
णे|गणेश|gaṇeś|🐘|गणेश जी को लड्डू पसंद हैं।|gaṇeś jī ko laḍḍū pasand haĩ|Lord Ganesha likes laddus.|णे
नि|निशाना|niśānā|🎯|उसका निशाना सही लगा।|uskā niśānā sahī lagā|His aim was right.
नु|नुकसान|nuksān|🌧️|बारिश से फसल का नुकसान हुआ।|bāriś se phasal kā nuksān huā|The rain damaged the crop.
ने|नेत्र|netra|👁️|नेत्र से हम देखते हैं।|netra se ham dekhte haĩ|We see with our eyes.
नै|नैया|naiyā|🛶|माँझी नैया खेता है।|mā̃jhī naiyā khetā hai|The boatman rows the boat.
तृ|तृप्ति|tṛpti|😌|खाना खाकर तृप्ति मिली।|khānā khākar tṛpti milī|I felt content after eating.
तं|तंबू|tambū|🎪|मेले में बड़ा तंबू लगा।|mele mẽ baṛā tambū lagā|A big tent was put up at the fair.
थि|अतिथि|atithi|🙏|घर में अतिथि आए।|ghar mẽ atithi āe|Guests came to the house.|थि
थी|साथी|sāthī|🤝|वह मेरा साथी है।|vah merā sāthī hai|He is my companion.|थी
थो|थोड़ा|thoṛā|🤏|थोड़ा पानी दो।|thoṛā pānī do|Give me a little water.
दै|दैनिक|dainik|📰|रोज़ दैनिक अख़बार आता है।|roz dainik axbār ātā hai|The daily newspaper comes every day.
दं|दंगल|daṅgal|🤼|गाँव में दंगल हुआ।|gā̃v mẽ daṅgal huā|There was a wrestling match in the village.
धि|औषधि|auṣadhi|💊|यह औषधि कड़वी है।|yah auṣadhi kaṛvī hai|This medicine is bitter.|धि
धी|धीरे|dhīre|🐢|धीरे चलो।|dhīre calo|Walk slowly.
धृ|धृतराष्ट्र|dhṛtrāṣṭra|👑|धृतराष्ट्र अंधे राजा थे।|dhṛtrāṣṭra andhe rājā the|Dhritarashtra was a blind king.
धे|सीधे|sīdhe|⬆️|सीधे घर जाओ।|sīdhe ghar jāo|Go straight home.|धे
धै|धैर्य|dhairya|🧘|मुश्किल में धैर्य रखो।|muśkil mẽ dhairya rakho|Be patient in difficulty.
धं|धंधा|dhandhā|💼|उसका धंधा अच्छा चलता है।|uskā dhandhā acchā caltā hai|His business runs well.
पो|पोशाक|pośāk|👗|उसकी पोशाक सुंदर है।|uskī pośāk sundar hai|Her dress is beautiful.
फा|फाटक|phāṭak|🚧|रेलवे फाटक बंद है।|relve phāṭak band hai|The railway gate is closed.
फि|फिल्म|philm|🎬|हमने नई फिल्म देखी।|hamne naī philm dekhī|We watched a new film.
फी|फीता|phītā|🎀|जूते का फीता बाँधो।|jūte kā phītā bā̃dho|Tie your shoelace.
फु|फुटबॉल|phuṭbôl|⚽|बच्चे फुटबॉल खेलते हैं।|bacce phuṭbôl khelte haĩ|The children play football.
फे|फेरीवाला|pherīvālā|🛒|फेरीवाला सब्ज़ी बेचता है।|pherīvālā sabzī bectā hai|The hawker sells vegetables.
फै|फैक्ट्री|phaikṭrī|🏭|शहर में बड़ी फैक्ट्री है।|śahar mẽ baṛī phaikṭrī hai|There is a big factory in the city.
बृ|बृहस्पति|bṛhaspati|🪐|बृहस्पति सबसे बड़ा ग्रह है।|bṛhaspati sabse baṛā grah hai|Jupiter is the biggest planet.
बौ|बौना|baunā|🧙|कहानी में सात बौने थे।|kahānī mẽ sāt baune the|There were seven dwarfs in the story.
भी|भीड़|bhīṛ|👥|मेले में बहुत भीड़ है।|mele mẽ bahut bhīṛ hai|There is a big crowd at the fair.
भौ|भौंरा|bhaũrā|🐝|भौंरा फूल पर गुनगुनाता है।|bhaũrā phūl par gungunātā hai|The bumblebee hums on the flower.
भं|भंडार|bhaṇḍār|🌾|अनाज का भंडार भरा है।|anāj kā bhaṇḍār bharā hai|The grain store is full.
मृ|मृग|mṛg|🦌|मृग जंगल में दौड़ता है।|mṛg jaṅgal mẽ dauṛtā hai|The deer runs in the forest.
यि|नायिका|nāyikā|🎭|फ़िल्म की नायिका सुंदर है।|film kī nāyikā sundar hai|The film's heroine is beautiful.|यि
यी|नयी|nayī|🚲|उसकी साइकिल नयी है।|uskī sāikil nayī hai|His bicycle is new.|यी
यू|यूनिफ़ॉर्म|yūnifôrm|👕|स्कूल की यूनिफ़ॉर्म नीली है।|skūl kī yūnifôrm nīlī hai|The school uniform is blue.
यं|यंत्र|yantra|⚙️|यह यंत्र बिजली से चलता है।|yah yantra bijlī se caltā hai|This machine runs on electricity.
रौ|रौनक|raunak|✨|त्योहार में बाज़ार की रौनक बढ़ गई।|tyohār mẽ bāzār kī raunak baṛh gaī|The market came alive for the festival.
ली|लीची|līcī|🍒|लीची मीठी होती है।|līcī mīṭhī hotī hai|Litchis are sweet.
लु|लुहार|luhār|🔨|लुहार औज़ार बनाता है।|luhār auzār banātā hai|The blacksmith makes tools.
लू|लू|lū|🥵|गर्मी में लू चलती है।|garmī mẽ lū caltī hai|Hot winds blow in summer.
ले|लेखक|lekhak|✍️|प्रेमचंद महान लेखक थे।|premcand mahān lekhak the|Premchand was a great writer.
लै|लैंप|laimp|💡|मेज़ पर लैंप है।|mez par laimp hai|There is a lamp on the table.
ठु|ठुड्डी|ṭhuḍḍī|🙂|मेरी ठुड्डी पर चोट लगी।|merī ṭhuḍḍī par coṭ lagī|I hurt my chin.
ठू|ठूँठ|ṭhū̃ṭh|🪵|खेत में पेड़ का ठूँठ है।|khet mẽ peṛ kā ṭhū̃ṭh hai|There is a tree stump in the field.
झे|झेलना|jhelnā|☀️|इतनी गर्मी झेलना मुश्किल है।|itnī garmī jhelnā muśkil hai|It is hard to bear so much heat.
रै|रैली|railī|🚩|शहर में बड़ी रैली निकली।|śahar mẽ baṛī railī niklī|A big rally went through the city.
`)
};
