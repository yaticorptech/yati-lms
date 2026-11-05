/**
 * Urdu, Arabic, Russian, Spanish, French, German and Portuguese: a word for each letter a common word starts with
 * (letterWords/parse.js). The languages written in English letters give how a word sounds, not the sentence's.
 */
const { parse } = require('./parse');

module.exports = {
    ur: parse(`
ا|انگور|angūr|🍇|انگور میٹھے ہیں۔|angūr mīṭhe haiṉ|The grapes are sweet.
ب|بطخ|baṭakh|🦆|بطخ پانی میں تیرتی ہے۔|baṭakh pānī meṉ tairtī hai|The duck swims in the water.
پ|پتنگ|patang|🪁|آسمان میں پتنگ اڑتی ہے۔|āsmān meṉ patang uṛtī hai|A kite flies in the sky.
ت|تتلی|titlī|🦋|تتلی پھول پر بیٹھی ہے۔|titlī phūl par baiṭhī hai|The butterfly is sitting on the flower.
ٹ|ٹماٹر|ṭamāṭar|🍅|ٹماٹر لال ہے۔|ṭamāṭar lāl hai|The tomato is red.
ث|ثمر|samar|🍎|درخت پر ثمر ہے۔|daraḵẖt par samar hai|There is fruit on the tree.
ج|جہاز|jahāz|🚢|جہاز سمندر میں چلتا ہے۔|jahāz samandar meṉ caltā hai|The ship sails on the sea.
چ|چڑیا|ciṛiyā|🐦|چڑیا گاتی ہے۔|ciṛiyā gātī hai|The sparrow sings.
ح|حلوہ|halwā|🍮|حلوہ میٹھا ہے۔|halwā mīṭhā hai|The halwa is sweet.
خ|خرگوش|ḵẖargosh|🐇|خرگوش گاجر کھاتا ہے۔|ḵẖargosh gājar khātā hai|The rabbit eats a carrot.
د|دروازہ|darwāza|🚪|دروازہ کھلا ہے۔|darwāza khulā hai|The door is open.
ڈ|ڈاکیا|ḍākiyā|📮|ڈاکیا خط لاتا ہے۔|ḍākiyā ḵẖat lātā hai|The postman brings letters.
ر|ریل|rel|🚆|ریل پٹری پر چلتی ہے۔|rel paṭrī par caltī hai|The train runs on the track.
ز|زیبرا|zebrā|🦓|زیبرا کی دھاریاں ہیں۔|zebrā kī dhāriyāṉ haiṉ|The zebra has stripes.
س|سیب|seb|🍎|سیب لال ہے۔|seb lāl hai|The apple is red.
ش|شیر|sher|🦁|شیر جنگل کا بادشاہ ہے۔|sher jangal kā bādshāh hai|The lion is the king of the jungle.
ص|صابن|ṣābun|🧼|صابن سے ہاتھ دھوئیں۔|ṣābun se hāth dhoeṉ|Wash your hands with soap.
ط|طوطا|ṭoṭā|🦜|طوطا ہرا ہے۔|ṭoṭā harā hai|The parrot is green.
ع|عینک|ʿainak|👓|دادا عینک پہنتے ہیں۔|dādā ʿainak pahante haiṉ|Grandfather wears glasses.
غ|غبارہ|ġubāra|🎈|غبارہ اوپر اڑتا ہے۔|ġubāra ūpar uṛtā hai|The balloon flies up.
ف|فاختہ|fāḵẖta|🕊️|فاختہ امن کی علامت ہے۔|fāḵẖta aman kī ʿalāmat hai|The dove is a sign of peace.
ق|قلم|qalam|🖊️|میرے پاس قلم ہے۔|mere pās qalam hai|I have a pen.
ک|کتاب|kitāb|📕|میں کتاب پڑھتا ہوں۔|maiṉ kitāb paṛhtā hūṉ|I read a book.
گ|گائے|gāe|🐄|گائے دودھ دیتی ہے۔|gāe dūdh detī hai|The cow gives milk.
ل|لڈو|laḍḍū|🍬|لڈو بہت میٹھا ہے۔|laḍḍū bahut mīṭhā hai|The laddu is very sweet.
م|مچھلی|machlī|🐟|مچھلی پانی میں رہتی ہے۔|machlī pānī meṉ rahtī hai|The fish lives in water.
ن|ناریل|nāriyal|🥥|ناریل درخت پر لگتا ہے۔|nāriyal daraḵẖt par lagtā hai|The coconut grows on the tree.
و|ورزش|warzish|🏃|ورزش صحت کے لیے اچھی ہے۔|warzish sehat ke liye acchī hai|Exercise is good for health.
ہ|ہاتھی|hāthī|🐘|ہاتھی بہت بڑا ہے۔|hāthī bahut baṛā hai|The elephant is very big.
`),
    ar: parse(`
ب|بطة|baṭṭa|🦆|البطة تسبح في الماء.|al-baṭṭa tasbaḥ fī al-māʼ|The duck swims in the water.
ت|تفاحة|tuffāḥa|🍎|أنا آكل تفاحة حمراء.|anā ākul tuffāḥa ḥamrāʼ|I eat a red apple.
ث|ثعلب|thaʿlab|🦊|الثعلب يعيش في الغابة.|ath-thaʿlab yaʿīsh fī al-ghāba|The fox lives in the forest.
ج|جمل|jamal|🐫|الجمل يمشي في الصحراء.|al-jamal yamshī fī aṣ-ṣaḥrāʼ|The camel walks in the desert.
ح|حصان|ḥiṣān|🐴|الحصان يجري بسرعة.|al-ḥiṣān yajrī bi-surʿa|The horse runs fast.
خ|خروف|kharūf|🐑|الخروف يأكل العشب.|al-kharūf yaʼkul al-ʿushb|The sheep eats grass.
د|دب|dubb|🐻|الدب يحب العسل.|ad-dubb yuḥibb al-ʿasal|The bear loves honey.
ذ|ذهب|dhahab|🪙|الذهب لامع.|adh-dhahab lāmiʿ|Gold is shiny.
ر|ريشة|rīsha|🪶|الريشة خفيفة.|ar-rīsha khafīfa|The feather is light.
ز|زرافة|zarāfa|🦒|الزرافة طويلة.|az-zarāfa ṭawīla|The giraffe is tall.
س|سمكة|samaka|🐟|السمكة تسبح في البحر.|as-samaka tasbaḥ fī al-baḥr|The fish swims in the sea.
ش|شمس|shams|☀️|الشمس مشرقة.|ash-shams mushriqa|The sun is shining.
ص|صقر|ṣaqr|🦅|الصقر يطير عالياً.|aṣ-ṣaqr yaṭīr ʿāliyan|The falcon flies high.
ض|ضفدع|ḍifdaʿ|🐸|الضفدع يقفز.|aḍ-ḍifdaʿ yaqfiz|The frog jumps.
ط|طائرة|ṭāʼira|✈️|الطائرة في السماء.|aṭ-ṭāʼira fī as-samāʼ|The aeroplane is in the sky.
ظ|ظرف|ẓarf|✉️|الظرف أبيض.|aẓ-ẓarf abyaḍ|The envelope is white.
ع|عصفور|ʿuṣfūr|🐦|العصفور يغني.|al-ʿuṣfūr yughannī|The sparrow sings.
ف|فيل|fīl|🐘|الفيل كبير جداً.|al-fīl kabīr jiddan|The elephant is very big.
غ|غيمة|ghayma|☁️|الغيمة بيضاء.|al-ghayma bayḍāʼ|The cloud is white.
ق|قطة|qiṭṭa|🐱|القطة تشرب الحليب.|al-qiṭṭa tashrab al-ḥalīb|The cat drinks milk.
ك|كتاب|kitāb|📕|أنا أقرأ كتاباً.|anā aqraʼ kitāban|I read a book.
ل|ليمون|laymūn|🍋|الليمون حامض.|al-laymūn ḥāmiḍ|The lemon is sour.
م|موز|mawz|🍌|الموز أصفر.|al-mawz aṣfar|The banana is yellow.
ن|نحلة|naḥla|🐝|النحلة تصنع العسل.|an-naḥla taṣnaʿ al-ʿasal|The bee makes honey.
ه|هدية|hadiyya|🎁|هذه هدية لك.|hādhihi hadiyya laka|This is a gift for you.
و|وردة|warda|🌹|الوردة حمراء.|al-warda ḥamrāʼ|The rose is red.
ي|يد|yad|✋|يدي نظيفة.|yadī naẓīfa|My hand is clean.
`),
    ru: parse(`
А|арбуз|arbuz|🍉|Арбуз сладкий.|arbuz sladkiy|The watermelon is sweet.
Б|банан|banan|🍌|Банан жёлтый.|banan zhyoltyy|The banana is yellow.
В|волк|volk|🐺|Волк живёт в лесу.|volk zhivyot v lesu|The wolf lives in the forest.
Г|гриб|grib|🍄|Гриб растёт в лесу.|grib rastyot v lesu|The mushroom grows in the forest.
Д|дом|dom|🏠|Наш дом большой.|nash dom bolshoy|Our house is big.
Е|енот|yenot|🦝|Енот моет еду.|yenot moyet yedu|The raccoon washes its food.
Ё|ёжик|yozhik|🦔|Ёжик маленький.|yozhik malenkiy|The hedgehog is small.
Ж|жираф|zhiraf|🦒|Жираф высокий.|zhiraf vysokiy|The giraffe is tall.
З|зебра|zebra|🦓|У зебры полоски.|u zebry poloski|The zebra has stripes.
И|игрушка|igrushka|🧸|Это моя игрушка.|eto moya igrushka|This is my toy.
Й|йогурт|yogurt|🥣|Я ем йогурт.|ya yem yogurt|I eat yoghurt.
К|кот|kot|🐱|Кот пьёт молоко.|kot pyot moloko|The cat drinks milk.
Л|лев|lev|🦁|Лев сильный.|lev silnyy|The lion is strong.
М|мяч|myach|⚽|Мяч круглый.|myach kruglyy|The ball is round.
Н|нос|nos|👃|У меня холодный нос.|u menya kholodnyy nos|My nose is cold.
О|облако|oblako|☁️|Облако белое.|oblako beloye|The cloud is white.
П|пингвин|pingvin|🐧|Пингвин живёт на льду.|pingvin zhivyot na l'du|The penguin lives on the ice.
Р|рыба|ryba|🐟|Рыба плавает в реке.|ryba plavayet v reke|The fish swims in the river.
С|солнце|solntse|☀️|Солнце светит.|solntse svetit|The sun is shining.
Т|тигр|tigr|🐯|Тигр живёт в лесу.|tigr zhivyot v lesu|The tiger lives in the forest.
У|утка|utka|🦆|Утка плавает в пруду.|utka plavayet v prudu|The duck swims in the pond.
Ф|флаг|flag|🚩|Флаг красный.|flag krasnyy|The flag is red.
Х|хлеб|khleb|🍞|Хлеб свежий.|khleb svezhiy|The bread is fresh.
Ц|цветок|tsvetok|🌸|Цветок красивый.|tsvetok krasivyy|The flower is beautiful.
Ч|чай|chay|🍵|Чай горячий.|chay goryachiy|The tea is hot.
Ш|шар|shar|🎈|Шар летит вверх.|shar letit vverkh|The balloon flies up.
Щ|щенок|shchenok|🐶|Щенок играет.|shchenok igrayet|The puppy is playing.
Э|экран|ekran|🖥️|Экран большой.|ekran bolshoy|The screen is big.
Ю|юбка|yubka|👗|Юбка красная.|yubka krasnaya|The skirt is red.
Я|яблоко|yabloko|🍎|Я ем красное яблоко.|ya yem krasnoye yabloko|I eat a red apple.
`),
    es: parse(`
A|abeja|ah-BEH-hah|🐝|La abeja hace miel.||The bee makes honey.
B|barco|BAR-koh|🚢|El barco navega en el mar.||The boat sails on the sea.
C|casa|KAH-sah|🏠|Mi casa es grande.||My house is big.
D|dinosaurio|dee-noh-SOW-ryoh|🦕|El dinosaurio es enorme.||The dinosaur is huge.
E|elefante|eh-leh-FAHN-teh|🐘|El elefante es muy grande.||The elephant is very big.
F|flor|flor|🌸|La flor es bonita.||The flower is pretty.
G|gato|GAH-toh|🐱|El gato bebe leche.||The cat drinks milk.
H|helado|eh-LAH-doh|🍦|Me gusta el helado.||I like ice cream.
I|isla|EES-lah|🏝️|La isla está en el mar.||The island is in the sea.
J|jirafa|hee-RAH-fah|🦒|La jirafa es alta.||The giraffe is tall.
K|koala|koh-AH-lah|🐨|El koala duerme en el árbol.||The koala sleeps in the tree.
L|luna|LOO-nah|🌙|La luna brilla de noche.||The moon shines at night.
M|manzana|mahn-THAH-nah|🍎|Como una manzana roja.||I eat a red apple.
N|nube|NOO-beh|☁️|La nube es blanca.||The cloud is white.
Ñ|ñu|nyoo|🐃|El ñu corre en África.||The wildebeest runs in Africa.
O|oso|OH-soh|🐻|El oso come miel.||The bear eats honey.
P|perro|PEH-rroh|🐶|El perro ladra.||The dog barks.
Q|queso|KEH-soh|🧀|Me gusta el queso.||I like cheese.
R|ratón|rrah-TOHN|🐭|El ratón es pequeño.||The mouse is small.
S|sol|sol|☀️|El sol brilla.||The sun shines.
T|tren|tren|🚂|El tren es rápido.||The train is fast.
U|uvas|OO-bahs|🍇|Las uvas son dulces.||The grapes are sweet.
V|vaca|BAH-kah|🐄|La vaca da leche.||The cow gives milk.
W|wifi|WEE-fee|📶|El wifi funciona.||The wifi works.
Y|yoyó|yoh-YOH|🪀|El niño juega con el yoyó.||The boy plays with the yo-yo.
Z|zapato|thah-PAH-toh|👞|El zapato es negro.||The shoe is black.
á|árbol|AR-bol|🌳|El árbol es alto.||The tree is tall.
ll|llave|YAH-beh|🔑|Abro la puerta con la llave.||I open the door with the key.
ch|chocolate|choh-koh-LAH-teh|🍫|El chocolate es dulce.||The chocolate is sweet.
`),
    fr: parse(`
A|abeille|ah-BAY|🐝|L’abeille fait du miel.||The bee makes honey.
B|ballon|bah-LOHN|⚽|Le ballon est rond.||The ball is round.
C|chat|shah|🐱|Le chat boit du lait.||The cat drinks milk.
D|dauphin|doh-FAN|🐬|Le dauphin nage dans la mer.||The dolphin swims in the sea.
E|escargot|es-kar-GOH|🐌|L’escargot est lent.||The snail is slow.
F|fleur|flur|🌸|La fleur est belle.||The flower is beautiful.
G|girafe|zhee-RAF|🦒|La girafe est grande.||The giraffe is tall.
H|hibou|ee-BOO|🦉|Le hibou vole la nuit.||The owl flies at night.
I|insecte|an-SEKT|🐞|L’insecte est petit.||The insect is small.
J|jus|zhew|🧃|Je bois du jus d’orange.||I drink orange juice.
K|kangourou|kahn-goo-ROO|🦘|Le kangourou saute.||The kangaroo jumps.
L|lion|lee-OHN|🦁|Le lion est fort.||The lion is strong.
M|maison|meh-ZOHN|🏠|Ma maison est grande.||My house is big.
N|nuage|new-AHZH|☁️|Le nuage est blanc.||The cloud is white.
O|orange|oh-RAHNZH|🍊|L’orange est sucrée.||The orange is sweet.
P|pomme|pom|🍎|Je mange une pomme rouge.||I eat a red apple.
Q|quatre|KAH-truh|4️⃣|J’ai quatre livres.||I have four books.
R|robot|roh-BOH|🤖|Le robot marche.||The robot walks.
S|soleil|soh-LAY|☀️|Le soleil brille.||The sun shines.
T|train|tran|🚂|Le train est rapide.||The train is fast.
U|usine|ew-ZEEN|🏭|L’usine est grande.||The factory is big.
V|vache|vash|🐄|La vache donne du lait.||The cow gives milk.
W|wagon|vah-GOHN|🚃|Le wagon est bleu.||The carriage is blue.
Y|yaourt|yah-OOR|🥣|Je mange un yaourt.||I eat a yoghurt.
Z|zèbre|ZEB-ruh|🦓|Le zèbre a des rayures.||The zebra has stripes.
é|école|ay-KOL|🏫|Je vais à l’école.||I go to school.
î|île|eel|🏝️|L’île est belle.||The island is beautiful.
œ|œuf|uhf|🥚|L’œuf est blanc.||The egg is white.
ou|ours|oors|🐻|L’ours aime le miel.||The bear loves honey.
oi|oiseau|wah-ZOH|🐦|L’oiseau chante.||The bird sings.
`),
    de: parse(`
A|Apfel|AP-fel|🍎|Der Apfel ist rot.||The apple is red.
B|Ball|bal|⚽|Der Ball ist rund.||The ball is round.
C|Computer|kom-PYOO-ter|💻|Der Computer ist neu.||The computer is new.
D|Delfin|del-FEEN|🐬|Der Delfin schwimmt im Meer.||The dolphin swims in the sea.
E|Elefant|eh-leh-FANT|🐘|Der Elefant ist groß.||The elephant is big.
F|Fisch|fish|🐟|Der Fisch schwimmt.||The fish swims.
G|Giraffe|gee-RAF-eh|🦒|Die Giraffe ist groß.||The giraffe is tall.
H|Haus|hows|🏠|Das Haus ist alt.||The house is old.
I|Igel|EE-gel|🦔|Der Igel ist klein.||The hedgehog is small.
J|Jacke|YAK-eh|🧥|Die Jacke ist warm.||The jacket is warm.
K|Katze|KAT-seh|🐱|Die Katze trinkt Milch.||The cat drinks milk.
L|Löwe|LER-veh|🦁|Der Löwe ist stark.||The lion is strong.
M|Maus|mows|🐭|Die Maus ist klein.||The mouse is small.
N|Nase|NAH-zeh|👃|Meine Nase ist kalt.||My nose is cold.
O|Orange|oh-RAHN-zheh|🍊|Die Orange ist süß.||The orange is sweet.
P|Pferd|pfairt|🐴|Das Pferd läuft schnell.||The horse runs fast.
R|Rose|ROH-zeh|🌹|Die Rose ist rot.||The rose is red.
S|Sonne|ZON-eh|☀️|Die Sonne scheint.||The sun shines.
T|Tomate|toh-MAH-teh|🍅|Die Tomate ist rot.||The tomato is red.
U|Uhr|oor|⌚|Die Uhr zeigt die Zeit.||The watch shows the time.
V|Vogel|FOH-gel|🐦|Der Vogel singt.||The bird sings.
W|Wal|vahl|🐳|Der Wal ist riesig.||The whale is huge.
Y|Yoga|YOH-gah|🧘|Ich mache Yoga.||I do yoga.
Z|Zebra|TSEH-brah|🦓|Das Zebra hat Streifen.||The zebra has stripes.
Ä|Äpfel|EP-fel|🍎|Die Äpfel sind rot.||The apples are red.
Ö|Öl|erl|🛢️|Das Öl ist teuer.||The oil is expensive.
Ü|Überraschung|ew-ber-RASH-ung|🎁|Das ist eine Überraschung!||This is a surprise!
ei|Eis|ice|🍦|Das Eis ist kalt.||The ice cream is cold.
eu|Eule|OY-leh|🦉|Die Eule fliegt nachts.||The owl flies at night.
sch|Schule|SHOO-leh|🏫|Ich gehe zur Schule.||I go to school.
ch|Chamäleon|ka-MEH-leh-on|🦎|Das Chamäleon ist grün.||The chameleon is green.
`),
    pt: parse(`
A|abelha|ah-BEH-lyah|🐝|A abelha faz mel.||The bee makes honey.
B|bola|BOH-lah|⚽|A bola é redonda.||The ball is round.
C|casa|KAH-zah|🏠|A minha casa é grande.||My house is big.
D|dente|DEN-chee|🦷|O dente é branco.||The tooth is white.
E|elefante|eh-leh-FAHN-chee|🐘|O elefante é muito grande.||The elephant is very big.
F|flor|flor|🌸|A flor é bonita.||The flower is pretty.
G|gato|GAH-toh|🐱|O gato bebe leite.||The cat drinks milk.
H|hipopótamo|ee-poh-POH-tah-moo|🦛|O hipopótamo vive no rio.||The hippo lives in the river.
I|ilha|EE-lyah|🏝️|A ilha fica no mar.||The island is in the sea.
J|janela|zhah-NEH-lah|🪟|A janela está aberta.||The window is open.
K|kiwi|KEE-wee|🥝|O kiwi é verde.||The kiwi is green.
L|leão|lee-OWN|🦁|O leão é forte.||The lion is strong.
M|maçã|mah-SAHN|🍎|Eu como uma maçã vermelha.||I eat a red apple.
N|navio|nah-VEE-oo|🚢|O navio navega no mar.||The ship sails on the sea.
O|ovo|OH-voo|🥚|O ovo é branco.||The egg is white.
P|peixe|PAY-shee|🐟|O peixe nada no rio.||The fish swims in the river.
Q|queijo|KAY-zhoo|🧀|Eu gosto de queijo.||I like cheese.
R|rato|HAH-too|🐭|O rato é pequeno.||The mouse is small.
S|sol|sol|☀️|O sol brilha.||The sun shines.
T|tartaruga|tar-tah-ROO-gah|🐢|A tartaruga anda devagar.||The tortoise walks slowly.
U|uva|OO-vah|🍇|A uva é doce.||The grape is sweet.
V|vaca|VAH-kah|🐄|A vaca dá leite.||The cow gives milk.
X|xícara|SHEE-kah-rah|☕|A xícara tem café.||The cup has coffee.
Z|zebra|ZEH-brah|🦓|A zebra tem listras.||The zebra has stripes.
á|água|AH-gwah|💧|A água está fria.||The water is cold.
í|ímã|EE-mahn|🧲|O ímã atrai o ferro.||The magnet attracts iron.
ó|óculos|OH-koo-loos|👓|O vovô usa óculos.||Grandpa wears glasses.
ô|ônibus|OH-nee-boos|🚌|O ônibus é amarelo.||The bus is yellow.
`)
};
