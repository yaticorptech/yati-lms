/**
 * Linguistic Ability — Chinese as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */
module.exports = {
    code: 'zh', name: 'Chinese', native: '中文', locale: 'zh-CN',
    words: {
        'vocab-beginner-1': {
            family: '家庭、家人',
            mother: '母亲、妈妈',
            father: '父亲、爸爸',
            house: '房子、家',
            food: '食物、饭菜',
            happy: '高兴、开心',
            big: '大',
            small: '小'
        },
        'vocab-beginner-2': {
            book: '书',
            teacher: '老师、教师',
            student: '学生',
            friend: '朋友',
            read: '读、阅读',
            write: '写',
            early: '早、提前',
            easy: '容易、简单'
        },
        'vocab-intermediate-1': {
            honest: '诚实',
            polite: '有礼貌',
            curious: '好奇',
            confident: '自信',
            patient: '有耐心',
            grateful: '感激、感谢',
            anxious: '焦虑、担心',
            generous: '慷慨、大方'
        },
        'vocab-intermediate-2': {
            deadline: '截止日期、期限',
            improve: '提高、改善',
            achieve: '实现、达到',
            schedule: '时间表、日程',
            opportunity: '机会',
            responsible: '负责、有责任心',
            discuss: '讨论',
            result: '结果、成绩'
        },
        'vocab-advanced-1': {
            negotiate: '谈判、协商',
            collaborate: '合作、协作',
            efficient: '高效、效率高',
            feasible: '可行',
            comprehensive: '全面',
            prioritise: '优先处理',
            ambiguous: '模棱两可、含糊',
            persuade: '说服、劝说'
        },
        'vocab-advanced-2': {
            sustainable: '可持续',
            consequence: '后果、结果',
            perspective: '角度、观点',
            inevitable: '不可避免',
            substantial: '相当大、可观',
            advocate: '提倡、倡导',
            diverse: '多样、多元',
            integrity: '正直、诚信'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Chinese has no words for a, an or the: 书 can mean "a book" or "the book" (一本书 is "one book"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: {
                4: 'Chinese uses the same order as English, Subject → Verb → Object: "拉维看书" = "Ravi reads books." But Chinese pronouns never change (我 = I and me, 他 = he and him), while English ones do: "I call him", but "He calls me."'
            }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Chinese word or sentence into English.',
            points: [
                'Chinese word order is close to English, Subject → Verb → Object: "我去学校" = "I go to school." But Chinese puts time words before the verb ("我明天去" = I tomorrow go), while English usually puts them at the end: "I will go tomorrow."',
                'English needs small words Chinese does not have: a, an, the. It also needs am, is or are before a describing word, where Chinese has 很 or nothing: "我很好" = "I am fine." And English adds -s for more than one: 书 = book or books.',
                'Watch the tense: a Chinese verb never changes, so look at the words around it: 吃 (eat), 吃了 (ate), 在吃 (am eating), 会吃 or 明天吃 (will eat). In English the verb itself changes: eat, ate, eating.',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Chinese.',
            points: [
                'Keep the English order, Subject → Verb → Object: "I go to school" → "我去学校". But move time words before the verb: "I go to school every day" → "我每天去学校".',
                'There are no words for a, an or the in Chinese; leave them out. Use 是 to join two nouns ("我是学生" = I am a student), but not before a describing word, which takes 很: "The food is tasty" → "饭菜很好吃".',
                'Choose the polite form for elders, teachers and strangers: 您 (you) and 请 (please), as in 您好, 请过来. With friends and family you may use 你: 你好, 过来.',
                'Type in Chinese with your phone\'s Chinese (pinyin) keyboard: type "xuexiao" and choose 学校. Or use the word bank and tap the words in order. If you cannot type characters, write the pinyin without tone marks, such as "wo qu xuexiao": it is accepted too.'
            ]
        },
        'translation-intermediate-kn-en': {
            intro: 'Chinese verbs do not change for tense, so look at the time words (昨天, 每天, 明天) and the little words 了 and 正在 to choose the English tense.',
            points: [
                'Chinese word order is close to English, Subject → Verb → Object: "我去学校" = "I go to school." But Chinese puts time and place words before the verb ("我明天去迈索尔" = I tomorrow go to Mysuru), while English usually puts them at the end: "I will go to Mysuru tomorrow."',
                'English needs small words Chinese does not have: a, an, the. It also needs am, is or are before a describing word, where Chinese has 很 or nothing: "我很好" = "I am fine." And English adds -s for more than one: 书 = book or books.',
                'Watch the tense: 看了 (watched), 正在看 (is watching), 明天去 (will go), 每天跑步 (runs, as a habit). 住了两年了, with 了 twice, means the action is still going on: "have been living … for two years".',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Chinese. Use the polite form for requests: 请… and 您.',
            points: [
                'Keep the English order, Subject → Verb → Object, but move time words and "where" phrases before the verb: "The shop opens at ten" → "商店十点开门"; "We study in the library" → "我们在图书馆学习".',
                'There are no words for a, an or the in Chinese; leave them out. Nouns do not change for more than one (书 = book or books), and verbs do not change for tense: add 了 for a finished action ("我忘了" = I forgot) or 正在 for one going on now.',
                'Choose the polite form for elders, teachers and strangers: 您 (you) and 请 (please), as in 您好, 请过来. With friends and family you may use 你: 你好, 过来.',
                'Type in Chinese with your phone\'s Chinese (pinyin) keyboard: type "xuexiao" and choose 学校. Or use the word bank and tap the words in order. If you cannot type characters, write the pinyin without tone marks, such as "wo qu xuexiao": it is accepted too.'
            ]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed." Chinese often shows the passive with no special word (会议已推迟), but English needs "has been".',
            points: [
                'Chinese word order is close to English, Subject → Verb → Object: "我去学校" = "I go to school." But Chinese puts time and place words before the verb ("我明天去" = I tomorrow go), while English usually puts them at the end: "I will go tomorrow."',
                'English needs small words Chinese does not have: a, an, the. It also needs am, is or are before a describing word, where Chinese has 很 or nothing: "我很好" = "I am fine." And English adds -s for more than one: 书 = book or books.',
                'Watch the tense and the passive: 已 or 已经 (has … / has been …), 正在 (is …ing), 将 or 会 (will). 会议已推迟 = the meeting has been postponed; 问题将得到解决 = the problem will be solved.',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Chinese. Notices often show the passive without 被, using 将 for "will be" and 已 for "has been": "结果将于明天公布", "会议已推迟".',
            points: [
                'Keep Subject → Verb → Object, but put time words and the "if" part first: "Please inform me if there is any change" → "如有任何变化，请通知我".',
                'There are no words for a, an or the in Chinese; leave them out. Where English has "a", Chinese often uses one and a counting word: 一项新政策 (a new policy), 一次活动 (an event).',
                'In formal writing use 您 and 请: "感谢您的合作" (thank you for your cooperation), "请于周五前回复" (please reply by Friday). Keep 你 for friends and family.',
                'Type in Chinese with your phone\'s Chinese (pinyin) keyboard: type "xuexiao" and choose 学校. Or use the word bank and tap the words in order. If you cannot type characters, write the pinyin without tone marks, such as "wo qu xuexiao": it is accepted too.'
            ]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: '水', explanation: '水 means water.' },
            i2: { source: '书', explanation: '书 means book. English often adds "a": a book.' },
            i3: { source: '我叫拉妮。', explanation: '我叫… is "I am called …". In English say "My name is Rani." or "I am Rani."' },
            i4: { source: '你好吗？', explanation: '你好吗 is the common greeting: 你 = you, 好 = well, 吗 makes it a question. English needs "are".' },
            i5: { source: '我很好。', explanation: '我很好 means "I am fine" (很 here does not have to mean "very"). English needs "am".' },
            i6: { source: '这是我的家。', explanation: '这 = this, 是 = is, 我的 = my, 家 = house or home.' },
            q1: { source: '我去学校。', explanation: '去 = go. The verb does not change, so 我去学校 can mean "I go", "I am going" or "I will go" to school.' },
            q2: { source: '她是我妹妹。', explanation: '妹妹 is a younger sister (姐姐 is an elder sister).' },
            q3: { source: '请关门。', explanation: '请 = please, 关 = close, 门 = door.' },
            q4: { source: '谢谢。', explanation: '谢谢 is the usual way to say thank you; 谢谢您 is more polite.' }
        },
        'translation-beginner-en-kn': {
            i1: {
                model: '朋友',
                accepted: ['好友', 'pengyou'],
                tiles: ['朋友'],
                explanation: 'Friend is 朋友, for a boy or a girl. 好友 is also used.'
            },
            i2: {
                model: '学校',
                accepted: ['xuexiao'],
                tiles: ['学校'],
                explanation: 'School is 学校.'
            },
            i3: {
                model: '早上好！',
                accepted: ['早安！', '早！', 'zaoshang hao'],
                tiles: ['早上', '好'],
                explanation: '早上 = morning, 好 = good. 早上好 is the usual greeting; 早安 and a short 早 are common too.'
            },
            i4: {
                model: '我是学生。',
                accepted: ['我是一名学生。', '我是一个学生。', 'wo shi xuesheng'],
                tiles: ['我', '是', '学生'],
                explanation: '是 joins two nouns: 我是学生 = I am a student. Chinese needs no word for "a" (一名 or 一个 may be added).'
            },
            i5: {
                model: '您叫什么名字？',
                accepted: ['你叫什么名字？', '您的名字是什么？', '你的名字是什么？', 'nin jiao shenme mingzi'],
                tiles: ['您', '叫', '什么', '名字'],
                explanation: '您 is the polite "you"; with a friend say 你. 叫 = to be called, 什么 = what: "you are called what name?"'
            },
            i6: {
                model: '饭菜很好吃。',
                accepted: ['菜很好吃。', '食物很好吃。', '饭很好吃。', 'fancai hen haochi'],
                tiles: ['饭菜', '很', '好吃'],
                explanation: '好吃 = tasty; 很好吃 = is tasty. A describing word takes 很, not 是, and there is no word for "the".'
            },
            q1: {
                model: '公交车站在哪里？',
                accepted: ['公交站在哪里？', '汽车站在哪里？', '公交车站在哪儿？', 'gongjiao chezhan zai nali'],
                tiles: ['公交车站', '在', '哪里'],
                explanation: '哪里 = where; 在哪里 = where is (it)? 公交车站 is a stop for city buses; 汽车站 is a bus station for long-distance buses.'
            },
            q2: {
                model: '我喜欢芒果。',
                accepted: ['我喜欢吃芒果。', '我爱吃芒果。', 'wo xihuan mangguo'],
                tiles: ['我', '喜欢', '芒果'],
                explanation: 'The order is the same as English: 我 (I) 喜欢 (like) 芒果 (mangoes). Chinese adds no -s: 芒果 is mango or mangoes.'
            },
            q3: {
                model: '请过来。',
                accepted: ['过来。', '请到这里来。', '来这里。', 'qing guolai'],
                tiles: ['请', '过来'],
                explanation: '过来 = come over (here). 请 (please) makes it polite; a plain 过来 is used with friends and children.'
            },
            q4: {
                model: '正在下雨。',
                accepted: ['在下雨。', '下雨了。', '外面在下雨。', 'zhengzai xiayu'],
                tiles: ['正在', '下雨'],
                explanation: 'Chinese says "falling rain": 下雨, with no word for "it". 正在 shows it is happening now.'
            }
        },
        'translation-intermediate-kn-en': {
            i1: { source: '我昨天看了一部电影。', explanation: '看了 is past (了 shows the action is done): watched (or saw). 昨天 = yesterday.' },
            i2: { source: '他每天早上跑步。', explanation: 'A habit (每天早上 = every morning) takes the simple present: runs. Chinese puts the time before the verb; English puts it at the end.' },
            i3: { source: '我们明天去迈索尔。', explanation: '明天 (tomorrow) shows the future, though 去 does not change: will go. 迈索尔 = Mysuru.' },
            i4: { source: '她正在看书。', explanation: '正在 shows an action happening now: 正在看书 = is reading (a book).' },
            i5: { source: '孩子们正在操场上玩。', explanation: '操场 = ground or playground; 正在…玩 = are playing. 们 shows more than one child.' },
            i6: { source: '您吃饭了吗？', explanation: 'A friendly, polite question about eating (吃饭 = have a meal; 了吗 asks if it is done). "Have you eaten?" is just as natural.' },
            q1: { source: '我喜欢说英语。', explanation: '喜欢 = like; 说英语 = speak English. English says "like to speak" or "like speaking".' },
            q2: { source: '他们在班加罗尔住了两年了。', explanation: '住了两年了 (了 twice) means they started living there two years ago and still do: the present perfect continuous, have been living … for two years.' },
            q3: { source: '火车准时到了。', explanation: '准时 = on time; 到了 = came (arrived).' },
            q4: { source: '请说慢一点。', explanation: '请 = please; 说慢一点 = speak (a little) more slowly.' }
        },
        'translation-intermediate-en-kn': {
            i1: {
                model: '请给我一点水。',
                accepted: ['请给我一些水。', '请给我点水。', '麻烦给我一点水。', 'qing gei wo yidian shui'],
                tiles: ['请', '给', '我', '一点', '水'],
                explanation: '给我 = give me; 一点 = some, a little. 请 at the start makes it polite.'
            },
            i2: {
                model: '课九点开始。',
                accepted: ['九点开始上课。', '课程九点开始。', '课9点开始。', 'ke jiu dian kaishi'],
                tiles: ['课', '九点', '开始'],
                explanation: '九点 = nine o\'clock; 开始 = starts. The time comes before the verb, with no word for "at".'
            },
            i3: {
                model: '我把书忘在家里了。',
                accepted: ['我把我的书忘在家里了。', '我的书忘在家里了。', '我把书落在家里了。', 'wo ba shu wang zai jiali le'],
                tiles: ['我', '把', '书', '忘在', '家里', '了'],
                explanation: '忘在家里 = forgot (left) at home; 了 shows it is done. 把 brings the object (书) before the verb. "My" (我的) can be left out.'
            },
            i4: {
                model: '这个多少钱？',
                accepted: ['多少钱？', '这个怎么卖？', '这个价格是多少？', 'zhege duoshao qian'],
                tiles: ['这个', '多少', '钱'],
                explanation: '多少钱 = how much (money); 这个 = this (one). Chinese needs no verb for "cost".'
            },
            i5: {
                model: '我的考试在下周。',
                accepted: ['我下周考试。', '我的考试是下周。', '我的考试在下个星期。', 'wo de kaoshi zai xiazhou'],
                tiles: ['我的', '考试', '在', '下周'],
                explanation: '下周 (or 下个星期) = next week; 考试 = exam. 我下周考试 ("I have my exam next week") is just as natural.'
            },
            i6: {
                model: '您能帮我吗？',
                accepted: ['你能帮我吗？', '您可以帮我吗？', '你可以帮帮我吗？', 'nin neng bang wo ma'],
                tiles: ['您', '能', '帮', '我', '吗'],
                explanation: '能 = can; 帮 = help; 吗 at the end makes a yes/no question. 您 is polite; 你 is fine with friends.'
            },
            q1: {
                model: '我们去图书馆。',
                accepted: ['我们要去图书馆。', '我们正在去图书馆的路上。', 'women qu tushuguan'],
                tiles: ['我们', '去', '图书馆'],
                explanation: '图书馆 = library. The verb does not change, so 我们去图书馆 covers "we are going"; 我们要去 = we are about to go, 在去…的路上 = on the way.'
            },
            q2: {
                model: '她卡纳达语说得非常好。',
                accepted: ['她的卡纳达语说得非常好。', '她卡纳达语说得很好。', '她说卡纳达语说得非常好。', 'ta kanadayu shuo de feichang hao'],
                tiles: ['她', '卡纳达语', '说得', '非常', '好'],
                explanation: '说得非常好 = speaks very well: Chinese puts 得 after the verb, then says how well. 卡纳达语 = Kannada.'
            },
            q3: {
                model: '请不要浪费水。',
                accepted: ['不要浪费水。', '别浪费水。', '请勿浪费水。', 'qing buyao langfei shui'],
                tiles: ['请', '不要', '浪费', '水'],
                explanation: '不要 = do not; 浪费 = waste. 请不要 is polite; 别 is plain, for friends. 请勿 is used on signs.'
            },
            q4: {
                model: '商店十点开门。',
                accepted: ['商店10点开门。', '商店十点开始营业。', '店十点开门。', 'shangdian shi dian kaimen'],
                tiles: ['商店', '十点', '开门'],
                explanation: '开门 = opens (literally "opens the door"); 十点 = at ten. The time comes before the verb.'
            }
        },
        'translation-advanced-kn-en': {
            i1: { source: '会议已推迟到星期一。', explanation: '推迟 = postpone; 已 (already) shows it is done. Chinese needs no passive word here, but English says "has been postponed".' },
            i2: { source: '请在星期五之前发送报告。', explanation: '之前 (before) with a day means "by" (not later than).' },
            i3: { source: '抱歉，回复晚了。', explanation: 'A common line in emails: 抱歉 = sorry, 回复 = reply, 晚了 = late.' },
            i4: { source: '我们团队按时完成了项目。', explanation: '按时 = on time; 完成了 = completed (了 shows it is done).' },
            i5: {
                source: '我去年获得了学位。现在我正在找一份软件公司的工作。我对学习新事物非常感兴趣。',
                explanation: 'Three sentences: a past action (获得了), an action going on now (正在找), and a feeling (非常感兴趣). Compare your tenses with the model.'
            },
            i6: { source: '感谢您的合作。', explanation: '合作 = cooperation; 感谢您的… = thank you for your … (polite).' },
            q1: { source: '这个问题将尽快得到解决。', explanation: '将 = will; 得到解决 = be solved (a passive meaning without 被). 尽快 = as soon as possible.' },
            q2: { source: '我想申请这个职位。', explanation: '职位 = post or position; 申请 = apply for; 想 = would like to.' },
            q3: { source: '他在会上提出了一个好建议。', explanation: '他 = he; 提出建议 = make (give) a suggestion; 在会上 = in the meeting.' },
            q4: { source: '客户满意是我们的首要任务。', explanation: '客户满意 = customer satisfaction; 首要任务 = first (top) priority.' }
        },
        'translation-advanced-en-kn': {
            i1: {
                model: '公司宣布了一项新政策。',
                accepted: ['公司已经宣布了一项新政策。', '公司宣布了新政策。', '公司公布了一项新政策。', 'gongsi xuanbule yi xiang xin zhengce'],
                tiles: ['公司', '宣布了', '一项', '新政策'],
                explanation: '政策 = policy; 宣布了 = has announced (了 shows it is done). 一项 is one + the counting word for a policy.'
            },
            i2: {
                model: '教育是成功的关键。',
                accepted: ['教育是成功的钥匙。', '教育是通往成功的钥匙。', 'jiaoyu shi chenggong de guanjian'],
                tiles: ['教育', '是', '成功的', '关键'],
                explanation: '成功 = success; 关键 = key (the most important thing; 钥匙 is a door key). 成功的关键 = the key to success.'
            },
            i3: {
                model: '如有任何变化，请通知我。',
                accepted: ['如果有任何变化，请通知我。', '如有变化，请告诉我。', '如果有什么变化，请告诉我。', 'ru you renhe bianhua qing tongzhi wo'],
                tiles: ['如有', '任何', '变化', '请', '通知', '我'],
                explanation: 'In Chinese the "if" part (如有 or 如果有 = if there is) comes first; 请通知我 = please inform me.'
            },
            i4: {
                model: '我们应该保护环境。',
                accepted: ['我们应当保护环境。', '我们要保护环境。', '我们必须保护环境。', 'women yinggai baohu huanjing'],
                tiles: ['我们', '应该', '保护', '环境'],
                explanation: '应该 = should; 保护 = protect; 环境 = environment. 必须 means must.'
            },
            i5: {
                model: '我们学院上周举办了一次献血活动。很多学生和老师参加了。医生们感谢大家的支持。',
                accepted: ['women xueyuan shangzhou jubanle yi ci xianxue huodong. henduo xuesheng he laoshi canjiale. yishengmen ganxie dajia de zhichi.'],
                explanation: '献血活动 = blood donation camp (drive); 参加 = take part. Compare your sentences with the model.'
            },
            i6: {
                model: '我写信是为了申请两天的假期。',
                accepted: ['我写信是想请两天假。', '我写这封信是为了申请两天假期。', '特此申请请假两天。', 'wo xie xin shi weile shenqing liang tian de jiaqi'],
                tiles: ['我', '写信', '是为了', '申请', '两天的', '假期'],
                explanation: '申请 = request, apply for; 假期 (or 假) = leave; 是为了 = in order to. A formal note may simply say 特此申请请假两天 ("I hereby request two days\' leave").'
            },
            q1: {
                model: '努力总会有回报。',
                accepted: ['努力总是会有回报的。', '付出总会有回报。', '努力终会有回报。', 'nuli zong hui you huibao'],
                tiles: ['努力', '总会', '有', '回报'],
                explanation: '"Pays off" means "brings a reward": 有回报. 努力 = hard work, effort; 总会 = will always.'
            },
            q2: {
                model: '结果将于明天公布。',
                accepted: ['结果明天公布。', '明天将公布结果。', '成绩将于明天公布。', 'jieguo jiang yu mingtian gongbu'],
                tiles: ['结果', '将于', '明天', '公布'],
                explanation: '"Will be announced": 将于 = will … on (formal), 公布 = announce. Chinese needs no passive word here.'
            },
            q3: {
                model: '感谢您的快速回复。',
                accepted: ['谢谢您的快速回复。', '感谢您的及时回复。', '感谢你的快速回复。', 'ganxie nin de kuaisu huifu'],
                tiles: ['感谢', '您的', '快速', '回复'],
                explanation: '快速 = quick (及时 = prompt); 回复 = response, reply; 感谢您的… = thank you for your … (polite).'
            },
            q4: {
                model: '安全是每个人的责任。',
                accepted: ['安全是大家的责任。', '安全是所有人的责任。', '安全人人有责。', 'anquan shi mei ge ren de zeren'],
                tiles: ['安全', '是', '每个人的', '责任'],
                explanation: '安全 = safety; 每个人的 (or 大家的) = everyone\'s; 责任 = responsibility. 安全人人有责 is a common slogan.'
            }
        }
    },
    placement: {
        b4: { prompt: '"书" in English is…', explanation: '书 means book.' },
        a5: { prompt: '"会议已推迟" best translates as…', explanation: '推迟 means postpone, and 已 (already) shows it is done; with "the meeting" as the subject, English says "has been postponed".' }
    }
};
