/**
 * Chinese, Japanese and Korean: a word for each character, kana or letter a common word starts with
 * (letterWords/parse.js). Chinese: its numbers and first characters (the tones and the A–Z names are learnt by their
 * sound); Korean: a letter's word starts with a syllable made with it (ㄱ → 기차).
 */
const { parse } = require('./parse');

module.exports = {
    zh: parse(`
一|一起|yìqǐ|🤝|我们一起玩。|wǒmen yìqǐ wán|We play together.
二|二月|èryuè|📅|二月很冷。|èryuè hěn lěng|February is cold.
三|三明治|sānmíngzhì|🥪|我吃三明治。|wǒ chī sānmíngzhì|I eat a sandwich.
四|四季|sìjì|🍂|一年有四季。|yì nián yǒu sìjì|A year has four seasons.
五|五星|wǔxīng|⭐|国旗上有五星。|guóqí shàng yǒu wǔxīng|There are five stars on the flag.
六|六月|liùyuè|☀️|六月很热。|liùyuè hěn rè|June is hot.
七|七彩|qīcǎi|🌈|彩虹是七彩的。|cǎihóng shì qīcǎi de|The rainbow has seven colours.
八|八爪鱼|bāzhuǎyú|🐙|八爪鱼住在海里。|bāzhuǎyú zhù zài hǎi lǐ|The octopus lives in the sea.
九|九月|jiǔyuè|🍁|九月开学。|jiǔyuè kāixué|School starts in September.
十|十字路口|shízì lùkǒu|🚦|十字路口有红绿灯。|shízì lùkǒu yǒu hónglǜdēng|There are traffic lights at the crossroads.
人|人们|rénmen|👥|人们在公园散步。|rénmen zài gōngyuán sànbù|People walk in the park.
大|大象|dàxiàng|🐘|大象很大。|dàxiàng hěn dà|The elephant is very big.
小|小狗|xiǎogǒu|🐶|小狗在玩。|xiǎogǒu zài wán|The puppy is playing.
中|中午|zhōngwǔ|🕛|中午我吃饭。|zhōngwǔ wǒ chīfàn|At noon I have my meal.
上|上学|shàngxué|🎒|我每天上学。|wǒ měitiān shàngxué|I go to school every day.
下|下雨|xiàyǔ|🌧️|今天下雨。|jīntiān xiàyǔ|It is raining today.
口|口罩|kǒuzhào|😷|我戴口罩。|wǒ dài kǒuzhào|I wear a mask.
日|日出|rìchū|🌅|日出很美。|rìchū hěn měi|The sunrise is beautiful.
月|月亮|yuèliang|🌙|月亮很亮。|yuèliang hěn liàng|The moon is bright.
水|水果|shuǐguǒ|🍎|我喜欢水果。|wǒ xǐhuan shuǐguǒ|I like fruit.
火|火车|huǒchē|🚂|火车很快。|huǒchē hěn kuài|The train is fast.
山|山羊|shānyáng|🐐|山羊吃草。|shānyáng chī cǎo|The goat eats grass.
天|天空|tiānkōng|🌤️|天空是蓝色的。|tiānkōng shì lánsè de|The sky is blue.
女|女孩|nǚhái|👧|女孩在唱歌。|nǚhái zài chànggē|The girl is singing.
我|我们|wǒmen|👫|我们是朋友。|wǒmen shì péngyou|We are friends.
你|你好|nǐ hǎo|👋|你好，老师！|nǐ hǎo, lǎoshī|Hello, teacher!
他|他们|tāmen|👥|他们在踢球。|tāmen zài tīqiú|They are playing football.
好|好吃|hǎochī|😋|这个苹果很好吃。|zhège píngguǒ hěn hǎochī|This apple is tasty.
不|不要|búyào|🙅|不要跑！|búyào pǎo|Don’t run!
`),
    ja: parse(`
あ|あめ|ame|☔|あめがふっています。|ame ga futte imasu|It is raining.
い|いぬ|inu|🐶|いぬがはしります。|inu ga hashirimasu|The dog runs.
う|うさぎ|usagi|🐇|うさぎがはねます。|usagi ga hanemasu|The rabbit hops.
え|えんぴつ|enpitsu|✏️|えんぴつでかきます。|enpitsu de kakimasu|I write with a pencil.
お|おにぎり|onigiri|🍙|おにぎりをたべます。|onigiri o tabemasu|I eat a rice ball.
か|かさ|kasa|☂️|かさをさします。|kasa o sashimasu|I open my umbrella.
き|きつね|kitsune|🦊|きつねがいます。|kitsune ga imasu|There is a fox.
く|くるま|kuruma|🚗|くるまははやいです。|kuruma wa hayai desu|The car is fast.
け|けむり|kemuri|💨|けむりがでます。|kemuri ga demasu|Smoke comes out.
こ|こねこ|koneko|🐱|こねこはちいさいです。|koneko wa chiisai desu|The kitten is small.
さ|さかな|sakana|🐟|さかながおよぎます。|sakana ga oyogimasu|The fish swims.
し|しか|shika|🦌|しかがいます。|shika ga imasu|There is a deer.
す|すいか|suika|🍉|すいかはあまいです。|suika wa amai desu|The watermelon is sweet.
せ|せみ|semi|🦗|せみがなきます。|semi ga nakimasu|The cicada sings.
そ|そら|sora|🌤️|そらはあおいです。|sora wa aoi desu|The sky is blue.
た|たまご|tamago|🥚|たまごをたべます。|tamago o tabemasu|I eat an egg.
ち|ちず|chizu|🗺️|ちずをみます。|chizu o mimasu|I look at the map.
つ|つき|tsuki|🌙|つきがきれいです。|tsuki ga kirei desu|The moon is beautiful.
て|てがみ|tegami|✉️|てがみをかきます。|tegami o kakimasu|I write a letter.
と|とり|tori|🐦|とりがとびます。|tori ga tobimasu|The bird flies.
な|なす|nasu|🍆|なすはむらさきです。|nasu wa murasaki desu|The aubergine is purple.
に|にんじん|ninjin|🥕|にんじんをたべます。|ninjin o tabemasu|I eat a carrot.
ぬ|ぬいぐるみ|nuigurumi|🧸|ぬいぐるみはやわらかいです。|nuigurumi wa yawarakai desu|The soft toy is soft.
ね|ねこ|neko|🐱|ねこがねています。|neko ga nete imasu|The cat is sleeping.
の|のみもの|nomimono|🥤|のみものをのみます。|nomimono o nomimasu|I have a drink.
は|はな|hana|🌸|はながさきます。|hana ga sakimasu|The flower blooms.
ひ|ひこうき|hikōki|✈️|ひこうきがとびます。|hikōki ga tobimasu|The aeroplane flies.
ふ|ふね|fune|🚢|ふねがうみをすすみます。|fune ga umi o susumimasu|The ship sails on the sea.
へ|へび|hebi|🐍|へびがいます。|hebi ga imasu|There is a snake.
ほ|ほし|hoshi|⭐|ほしがひかります。|hoshi ga hikarimasu|The star shines.
ま|まど|mado|🪟|まどをあけます。|mado o akemasu|I open the window.
み|みかん|mikan|🍊|みかんはあまいです。|mikan wa amai desu|The mandarin is sweet.
む|むし|mushi|🐞|むしがいます。|mushi ga imasu|There is an insect.
め|めがね|megane|👓|めがねをかけます。|megane o kakemasu|I wear glasses.
も|もも|momo|🍑|ももはやわらかいです。|momo wa yawarakai desu|The peach is soft.
や|やま|yama|⛰️|やまはたかいです。|yama wa takai desu|The mountain is high.
ゆ|ゆき|yuki|❄️|ゆきがふります。|yuki ga furimasu|It snows.
よ|よる|yoru|🌃|よるはしずかです。|yoru wa shizuka desu|The night is quiet.
ら|らっぱ|rappa|🎺|らっぱをふきます。|rappa o fukimasu|I blow the trumpet.
り|りんご|ringo|🍎|りんごはあかいです。|ringo wa akai desu|The apple is red.
れ|れもん|remon|🍋|れもんはすっぱいです。|remon wa suppai desu|The lemon is sour.
ろ|ろうそく|rōsoku|🕯️|ろうそくがもえます。|rōsoku ga moemasu|The candle burns.
わ|わに|wani|🐊|わにはかわにいます。|wani wa kawa ni imasu|The crocodile is in the river.
が|がっこう|gakkō|🏫|がっこうにいきます。|gakkō ni ikimasu|I go to school.
ぎ|ぎゅうにゅう|gyūnyū|🥛|ぎゅうにゅうをのみます。|gyūnyū o nomimasu|I drink milk.
げ|げた|geta|🩴|げたをはきます。|geta o hakimasu|I wear wooden sandals.
ご|ごはん|gohan|🍚|ごはんをたべます。|gohan o tabemasu|I eat rice.
じ|じてんしゃ|jitensha|🚲|じてんしゃにのります。|jitensha ni norimasu|I ride a bicycle.
ず|ずぼん|zubon|👖|ずぼんをはきます。|zubon o hakimasu|I put on trousers.
ぞ|ぞう|zō|🐘|ぞうはおおきいです。|zō wa ōkii desu|The elephant is big.
だ|だんご|dango|🍡|だんごをたべます。|dango o tabemasu|I eat dango.
で|でんしゃ|densha|🚃|でんしゃがはしります。|densha ga hashirimasu|The train runs.
ど|どんぐり|donguri|🌰|どんぐりをひろいます。|donguri o hiroimasu|I pick up an acorn.
ば|ばなな|banana|🍌|ばななはきいろです。|banana wa kiiro desu|The banana is yellow.
び|びょういん|byōin|🏥|びょういんにいきます。|byōin ni ikimasu|I go to the hospital.
ぶ|ぶどう|budō|🍇|ぶどうはあまいです。|budō wa amai desu|The grapes are sweet.
べ|べんとう|bentō|🍱|べんとうをたべます。|bentō o tabemasu|I eat a lunch box.
ぼ|ぼうし|bōshi|👒|ぼうしをかぶります。|bōshi o kaburimasu|I put on a hat.
ぱ|ぱん|pan|🍞|ぱんをたべます。|pan o tabemasu|I eat bread.
ぴ|ぴあの|piano|🎹|ぴあのをひきます。|piano o hikimasu|I play the piano.
ぺ|ぺんぎん|pengin|🐧|ぺんぎんがおよぎます。|pengin ga oyogimasu|The penguin swims.
ぽ|ぽすと|posuto|📮|ぽすとにてがみをいれます。|posuto ni tegami o iremasu|I put a letter in the postbox.
ア|アイス|aisu|🍦|アイスはつめたいです。|aisu wa tsumetai desu|The ice cream is cold.
イ|イルカ|iruka|🐬|イルカがおよぎます。|iruka ga oyogimasu|The dolphin swims.
ウ|ウサギ|usagi|🐇|ウサギがはねます。|usagi ga hanemasu|The rabbit hops.
エ|エビ|ebi|🦐|エビはあかいです。|ebi wa akai desu|The prawn is red.
オ|オレンジ|orenji|🍊|オレンジはあまいです。|orenji wa amai desu|The orange is sweet.
カ|カメラ|kamera|📷|カメラでしゃしんをとります。|kamera de shashin o torimasu|I take a photo with the camera.
キ|キリン|kirin|🦒|キリンはせがたかいです。|kirin wa se ga takai desu|The giraffe is tall.
ク|クッキー|kukkī|🍪|クッキーをたべます。|kukkī o tabemasu|I eat a biscuit.
ケ|ケーキ|kēki|🍰|ケーキはあまいです。|kēki wa amai desu|The cake is sweet.
コ|コーヒー|kōhī|☕|コーヒーをのみます。|kōhī o nomimasu|I drink coffee.
サ|サッカー|sakkā|⚽|サッカーをします。|sakkā o shimasu|I play football.
シ|シャツ|shatsu|👕|シャツはしろいです。|shatsu wa shiroi desu|The shirt is white.
ス|スプーン|supūn|🥄|スプーンでたべます。|supūn de tabemasu|I eat with a spoon.
セ|セーター|sētā|🧶|セーターはあたたかいです。|sētā wa atatakai desu|The sweater is warm.
ソ|ソファ|sofa|🛋️|ソファにすわります。|sofa ni suwarimasu|I sit on the sofa.
タ|タクシー|takushī|🚕|タクシーにのります。|takushī ni norimasu|I take a taxi.
チ|チーズ|chīzu|🧀|チーズがすきです。|chīzu ga suki desu|I like cheese.
ツ|ツリー|tsurī|🎄|ツリーをかざります。|tsurī o kazarimasu|I decorate the tree.
テ|テレビ|terebi|📺|テレビをみます。|terebi o mimasu|I watch TV.
ト|トマト|tomato|🍅|トマトはあかいです。|tomato wa akai desu|The tomato is red.
ナ|ナイフ|naifu|🔪|ナイフできります。|naifu de kirimasu|I cut with a knife.
ニ|ニュース|nyūsu|📰|ニュースをみます。|nyūsu o mimasu|I watch the news.
ヌ|ヌードル|nūdoru|🍜|ヌードルをたべます。|nūdoru o tabemasu|I eat noodles.
ネ|ネクタイ|nekutai|👔|ネクタイをしめます。|nekutai o shimemasu|I put on a tie.
ノ|ノート|nōto|📓|ノートにかきます。|nōto ni kakimasu|I write in my notebook.
ハ|ハンバーガー|hanbāgā|🍔|ハンバーガーをたべます。|hanbāgā o tabemasu|I eat a hamburger.
ヒ|ヒーター|hītā|🔥|ヒーターはあたたかいです。|hītā wa atatakai desu|The heater is warm.
フ|フォーク|fōku|🍴|フォークでたべます。|fōku de tabemasu|I eat with a fork.
ヘ|ヘリコプター|herikoputā|🚁|ヘリコプターがとびます。|herikoputā ga tobimasu|The helicopter flies.
ホ|ホテル|hoteru|🏨|ホテルにとまります。|hoteru ni tomarimasu|I stay at a hotel.
マ|マスク|masuku|😷|マスクをします。|masuku o shimasu|I wear a mask.
ミ|ミルク|miruku|🥛|ミルクをのみます。|miruku o nomimasu|I drink milk.
ム|ムービー|mūbī|🎬|ムービーをみます。|mūbī o mimasu|I watch a movie.
メ|メロン|meron|🍈|メロンはあまいです。|meron wa amai desu|The melon is sweet.
モ|モップ|moppu|🧹|モップでそうじします。|moppu de sōji shimasu|I clean with a mop.
ヤ|ヤギ|yagi|🐐|ヤギがいます。|yagi ga imasu|There is a goat.
ユ|ユーフォー|yūfō|🛸|ユーフォーがとびます。|yūfō ga tobimasu|The UFO flies.
ヨ|ヨット|yotto|⛵|ヨットがうみにいます。|yotto ga umi ni imasu|The yacht is on the sea.
ラ|ラジオ|rajio|📻|ラジオをききます。|rajio o kikimasu|I listen to the radio.
リ|リボン|ribon|🎀|リボンはあかいです。|ribon wa akai desu|The ribbon is red.
ル|ルビー|rubī|💎|ルビーはあかいです。|rubī wa akai desu|The ruby is red.
レ|レモン|remon|🍋|レモンはすっぱいです。|remon wa suppai desu|The lemon is sour.
ロ|ロボット|robotto|🤖|ロボットがあるきます。|robotto ga arukimasu|The robot walks.
ワ|ワッフル|waffuru|🧇|ワッフルをたべます。|waffuru o tabemasu|I eat a waffle.
`),
    ko: parse(`
ㄱ|기차|gicha|🚂|기차가 빨리 달려요.|gichaga ppalli dallyeoyo|The train runs fast.
ㄴ|나비|nabi|🦋|나비가 꽃에 앉아요.|nabiga kkoche anjayo|The butterfly sits on the flower.
ㄷ|다람쥐|daramjwi|🐿️|다람쥐가 나무에 올라가요.|daramjwiga namue ollagayo|The squirrel climbs the tree.
ㄹ|라면|ramyeon|🍜|라면이 뜨거워요.|ramyeoni tteugeowoyo|The ramyeon is hot.
ㅁ|모자|moja|👒|모자를 써요.|mojareul sseoyo|I put on a hat.
ㅂ|바나나|banana|🍌|바나나는 노래요.|bananeun noraeyo|The banana is yellow.
ㅅ|사과|sagwa|🍎|사과는 빨개요.|sagwaneun ppalgaeyo|The apple is red.
ㅇ|오리|ori|🦆|오리가 헤엄쳐요.|origa heeomchyeoyo|The duck swims.
ㅈ|자동차|jadongcha|🚗|자동차가 빨라요.|jadongchaga ppallayo|The car is fast.
ㅊ|치즈|chijeu|🧀|치즈를 먹어요.|chijeureul meogeoyo|I eat cheese.
ㅋ|코끼리|kokkiri|🐘|코끼리는 커요.|kokkirineun keoyo|The elephant is big.
ㅌ|토끼|tokki|🐇|토끼가 깡충 뛰어요.|tokkiga kkangchung ttwieoyo|The rabbit hops.
ㅍ|포도|podo|🍇|포도는 달아요.|podoneun darayo|The grapes are sweet.
ㅎ|하마|hama|🦛|하마는 물에 살아요.|hamaneun mure sarayo|The hippo lives in the water.
ㅏ|아기|agi|👶|아기가 자요.|agiga jayo|The baby is sleeping.
ㅑ|야구|yagu|⚾|야구를 해요.|yagureul haeyo|I play baseball.
ㅓ|어머니|eomeoni|👩|어머니가 요리해요.|eomeoniga yorihaeyo|Mother is cooking.
ㅕ|여우|yeou|🦊|여우가 숲에 살아요.|yeouga supe sarayo|The fox lives in the forest.
ㅗ|오이|oi|🥒|오이는 초록색이에요.|oineun choroksaegieyo|The cucumber is green.
ㅛ|요리|yori|🍳|엄마가 요리를 해요.|eommaga yorireul haeyo|Mum is cooking.
ㅜ|우유|uyu|🥛|우유를 마셔요.|uyureul masyeoyo|I drink milk.
ㅠ|유리|yuri|🪟|유리가 깨끗해요.|yuriga kkaekkeuthaeyo|The glass is clean.
ㅣ|이|i|🦷|이를 닦아요.|ireul dakkayo|I brush my teeth.
ㄲ|까치|kkachi|🐦|까치가 울어요.|kkachiga ureoyo|The magpie sings.
ㄸ|딸기|ttalgi|🍓|딸기는 빨개요.|ttalgineun ppalgaeyo|The strawberry is red.
ㅃ|빵|ppang|🍞|빵을 먹어요.|ppang-eul meogeoyo|I eat bread.
ㅆ|쌀|ssal|🍚|쌀로 밥을 지어요.|ssallo babeul jieoyo|I cook rice.
ㅉ|짜장면|jjajangmyeon|🍜|짜장면을 먹어요.|jjajangmyeoneul meogeoyo|I eat jjajangmyeon.
ㅐ|애벌레|aebeolle|🐛|애벌레가 기어가요.|aebeollega gieogayo|The caterpillar crawls.
ㅔ|에어컨|eeokeon|❄️|에어컨이 시원해요.|eeokeoni siwonhaeyo|The air conditioner is cool.
ㅒ|얘기|yaegi|💬|친구와 얘기해요.|chinguwa yaegihaeyo|I talk with my friend.
ㅖ|예술|yesul|🎨|예술은 아름다워요.|yesureun areumdawoyo|Art is beautiful.
ㅘ|왕|wang|🤴|왕이 성에 살아요.|wang-i seong-e sarayo|The king lives in the castle.
ㅚ|외계인|oegyein|👽|외계인이 우주에 살아요.|oegyeini ujue sarayo|The alien lives in space.
ㅝ|원숭이|wonsungi|🐒|원숭이가 바나나를 먹어요.|wonsungiga bananareul meogeoyo|The monkey eats a banana.
ㅞ|웨이터|weiteo|🤵|웨이터가 음식을 가져와요.|weiteoga eumsigeul gajyeowayo|The waiter brings the food.
ㅢ|의자|uija|🪑|의자에 앉아요.|uijae anjayo|I sit on the chair.
가|가방|gabang|🎒|가방이 무거워요.|gabang-i mugeowoyo|The bag is heavy.
나|나무|namu|🌳|나무가 커요.|namuga keoyo|The tree is big.
다|다리|dari|🌉|다리를 건너요.|darireul geonneoyo|I cross the bridge.
라|라디오|radio|📻|라디오를 들어요.|radioreul deureoyo|I listen to the radio.
마|마늘|maneul|🧄|마늘은 매워요.|maneureun maewoyo|Garlic is spicy.
바|바다|bada|🌊|바다가 넓어요.|badaga neolbeoyo|The sea is wide.
사|사자|saja|🦁|사자는 강해요.|sajaneun ganghaeyo|The lion is strong.
아|아이스크림|aiseukeurim|🍦|아이스크림이 차가워요.|aiseukeurimi chagawoyo|The ice cream is cold.
자|자전거|jajeongeo|🚲|자전거를 타요.|jajeongeoreul tayo|I ride a bicycle.
하|하늘|haneul|🌤️|하늘이 파래요.|haneuri paraeyo|The sky is blue.
`)
};
