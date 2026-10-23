/**
 * Linguistic Ability — Japanese as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */
module.exports = {
    code: 'ja', name: 'Japanese', native: '日本語', locale: 'ja-JP',
    words: {
        'vocab-beginner-1': {
            family: '家族',
            mother: '母、お母さん',
            father: '父、お父さん',
            house: '家',
            food: '食べ物、食事',
            happy: 'うれしい、幸せな',
            big: '大きい',
            small: '小さい'
        },
        'vocab-beginner-2': {
            book: '本',
            teacher: '先生',
            student: '学生、生徒',
            friend: '友達',
            read: '読む',
            write: '書く',
            early: '早く',
            easy: '簡単な、やさしい'
        },
        'vocab-intermediate-1': {
            honest: '正直な',
            polite: '礼儀正しい',
            curious: '好奇心が強い',
            confident: '自信がある',
            patient: '忍耐強い',
            grateful: '感謝している',
            anxious: '不安な',
            generous: '気前がいい'
        },
        'vocab-intermediate-2': {
            deadline: '締め切り',
            improve: '向上させる、改善する',
            achieve: '達成する',
            schedule: '予定表、日程',
            opportunity: '機会、チャンス',
            responsible: '責任がある',
            discuss: '話し合う',
            result: '結果'
        },
        'vocab-advanced-1': {
            negotiate: '交渉する',
            collaborate: '協力する',
            efficient: '効率的な',
            feasible: '実現可能な',
            comprehensive: '包括的な',
            prioritise: '優先する',
            ambiguous: 'あいまいな',
            persuade: '説得する'
        },
        'vocab-advanced-2': {
            sustainable: '持続可能な',
            consequence: '結果、影響',
            perspective: '視点、見方',
            inevitable: '避けられない',
            substantial: 'かなりの、大幅な',
            advocate: '提唱する、支持する',
            diverse: '多様な',
            integrity: '誠実さ'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Japanese has no words for a, an or the (本 can mean "a book" or "the book"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: {
                4: 'In Japanese the verb comes last: "ラビは本を読みます。" In English the verb comes right after the subject.'
            }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Japanese word or sentence into English.',
            points: [
                'Japanese puts the verb at the end: "私は学校に行きます" (I school-to go). English puts it after the subject: "I go to school."',
                'English needs small words Japanese does not have: a, an, the. It also needs a subject (I, you, he…) where Japanese leaves it out, and です becomes am, is or are.',
                'Watch the tense: 食べます (eat / will eat), 食べました (ate), 食べています (am eating).',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Japanese.',
            points: [
                'Move the verb to the end: "I go to school" → "私は学校に行きます".',
                'There are no words for a, an or the in Japanese; leave them out. 私は (I) can often be left out too, when it is clear who you mean.',
                'Use the polite です/ます form with teachers, elders and strangers: 行きます, 来てください. With close friends you may use the plain form: 行く, 来て.',
                'Type in Japanese with your phone\'s Japanese keyboard, or use the kana keys under the answer box. If you cannot type the kanji, write the answer in hiragana: it is accepted too.'
            ]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Japanese verb ending to choose the English tense.',
            points: [
                'Japanese puts the verb at the end: "私は学校に行きます" (I school-to go). English puts it after the subject: "I go to school."',
                'English needs small words Japanese does not have: a, an, the. It also needs a subject (I, you, he…) where Japanese leaves it out, and です becomes am, is or are.',
                'Watch the tense: 食べます (eat / will eat), 食べました (ate), 食べています (am eating).',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Japanese. Use the polite form for requests: 〜てください.',
            points: [
                'Move the verb to the end: "I go to school" → "私は学校に行きます".',
                'There are no words for a, an or the in Japanese; leave them out. 私は (I) can often be left out too, when it is clear who you mean.',
                'Use the polite です/ます form with teachers, elders and strangers: 行きます, 来てください. With close friends you may use the plain form: 行く, 来て.',
                'Type in Japanese with your phone\'s Japanese keyboard, or use the kana keys under the answer box. If you cannot type the kanji, write the answer in hiragana: it is accepted too.'
            ]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed."',
            points: [
                'Japanese puts the verb at the end: "私は学校に行きます" (I school-to go). English puts it after the subject: "I go to school."',
                'English needs small words Japanese does not have: a, an, the. It also needs a subject (I, you, he…) where Japanese leaves it out, and です becomes am, is or are.',
                'Watch the tense: 食べます (eat / will eat), 食べました (ate), 食べています (am eating).',
                'Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-advanced-en-kn': {
            intro: 'Write formal Japanese. Passive forms such as 〜されます (will be …) and 〜されました (has been …) are common in notices.',
            points: [
                'Move the verb to the end: "I go to school" → "私は学校に行きます".',
                'There are no words for a, an or the in Japanese; leave them out. 私は (I) can often be left out too, when it is clear who you mean.',
                'Use the polite です/ます form with teachers, elders and strangers: 行きます, 来てください. With close friends you may use the plain form: 行く, 来て.',
                'Type in Japanese with your phone\'s Japanese keyboard, or use the kana keys under the answer box. If you cannot type the kanji, write the answer in hiragana: it is accepted too.'
            ]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: '水', explanation: '水 means water.' },
            i2: { source: '本', explanation: '本 means book. English often adds "a": a book.' },
            i3: { source: '私の名前はラニです。', explanation: '私の = my, 名前 = name. です becomes "is".' },
            i4: { source: 'お元気ですか？', explanation: 'お元気ですか is the common greeting. English says "How are you?" and needs "are".' },
            i5: { source: '私は元気です。', explanation: '元気です means "I am fine" (or "I am well"). English needs "am".' },
            i6: { source: 'これは私の家です。', explanation: 'これ = this, 家 = house. です becomes the verb "is".' },
            q1: { source: '私は学校に行きます。', explanation: '行きます can mean "I go" or "I will go". The verb moves to after "I".' },
            q2: { source: '彼女は私の妹です。', explanation: '妹 is a younger sister (姉 is an elder sister).' },
            q3: { source: 'ドアを閉めてください。', explanation: 'ドア = door, 閉めて = close, 〜てください = please.' },
            q4: { source: 'ありがとうございます。', explanation: 'ありがとうございます is the polite way to say thank you.' }
        },
        'translation-beginner-en-kn': {
            i1: {
                model: '友達',
                accepted: ['ともだち', '友だち', '友人'],
                tiles: ['友達'],
                explanation: 'Friend is 友達 (also written 友だち). 友人 is more formal.'
            },
            i2: {
                model: '学校',
                accepted: ['がっこう'],
                tiles: ['学校'],
                explanation: 'School is 学校.'
            },
            i3: {
                model: 'おはようございます。',
                accepted: ['おはよう。'],
                tiles: ['おはよう', 'ございます'],
                explanation: 'The polite greeting is おはようございます; with friends and family you can say おはよう.'
            },
            i4: {
                model: '私は学生です。',
                accepted: ['わたしはがくせいです。', '学生です。', '私は生徒です。'],
                tiles: ['私は', '学生です'],
                explanation: 'Japanese needs no word for "a", and です does the work of "am". 生徒 is a school pupil.'
            },
            i5: {
                model: 'お名前は何ですか？',
                accepted: ['おなまえはなんですか？', 'あなたの名前は何ですか？', 'お名前は？'],
                tiles: ['お名前は', '何ですか'],
                explanation: 'お名前 is the polite way to say "your name"; 何 = what. Japanese usually leaves out あなた (you).'
            },
            i6: {
                model: '料理はおいしいです。',
                accepted: ['りょうりはおいしいです。', '食べ物はおいしいです。', '料理がおいしいです。', 'ご飯はおいしいです。'],
                tiles: ['料理は', 'おいしいです'],
                explanation: 'おいしい = tasty; おいしいです = is tasty. There is no word for "the".'
            },
            q1: {
                model: 'バス乗り場はどこですか？',
                accepted: ['バスのりばはどこですか？', 'バス停はどこですか？', 'バスていはどこですか？', 'バスターミナルはどこですか？'],
                tiles: ['バス乗り場は', 'どこですか'],
                explanation: 'どこ = where; どこですか = where is it? バス乗り場 is where you get on a bus; バス停 is a bus stop.'
            },
            q2: {
                model: '私はマンゴーが好きです。',
                accepted: ['わたしはマンゴーがすきです。', 'マンゴーが好きです。', 'マンゴーがすきです。'],
                tiles: ['私は', 'マンゴーが', '好きです'],
                explanation: 'Japanese says "as for me, mangoes are liked": 私は…が好きです. The thing you like takes が.'
            },
            q3: {
                model: 'ここに来てください。',
                accepted: ['ここにきてください。', 'こちらに来てください。', 'ここに来て。'],
                tiles: ['ここに', '来てください'],
                explanation: '来てください is polite; 来て is used with friends and children.'
            },
            q4: {
                model: '雨が降っています。',
                accepted: ['あめがふっています。', '雨が降ってます。'],
                tiles: ['雨が', '降っています'],
                explanation: 'Japanese says "rain is falling": 雨が降っています. There is no word for "it".'
            }
        },
        'translation-intermediate-kn-en': {
            i1: { source: '私は昨日映画を見ました。', explanation: '見ました is past tense: watched (or saw). 昨日 = yesterday.' },
            i2: { source: '彼は毎朝走ります。', explanation: 'A habit (毎朝 = every morning) takes the simple present: runs.' },
            i3: { source: '私たちは明日マイソールに行きます。', explanation: '明日 (tomorrow) shows the future: will go.' },
            i4: { source: '彼女は本を読んでいます。', explanation: '〜ています shows an action happening now: 読んでいます = is reading.' },
            i5: { source: '子どもたちは運動場で遊んでいます。', explanation: '運動場 = ground or playground; 遊んでいます = are playing.' },
            i6: { source: 'ご飯は食べましたか？', explanation: 'A polite question about eating (ご飯 = meal). Japanese leaves out "you", but English needs it. "Have you eaten?" is just as natural.' },
            q1: { source: '私は英語を話すのが好きです。', explanation: '〜のが好きです = I like to …; 話す = speak.' },
            q2: { source: '彼らは2年前からベンガルールに住んでいます。', explanation: '〜前から (since … ago) with an ongoing action (住んでいます) needs the present perfect continuous: have been living … for two years.' },
            q3: { source: '電車は時間どおりに来ました。', explanation: '時間どおりに = on time; 来ました = came.' },
            q4: { source: 'ゆっくり話してください。', explanation: 'ゆっくり = slowly; 〜てください = please.' }
        },
        'translation-intermediate-en-kn': {
            i1: {
                model: 'お水を少しください。',
                accepted: ['おみずをすこしください。', '水を少しください。', 'お水をください。', '少し水をください。'],
                tiles: ['お水を', '少し', 'ください'],
                explanation: 'ください = please give me; 少し = some, a little. お水 is a polite way to say 水 (water).'
            },
            i2: {
                model: '授業は9時に始まります。',
                accepted: ['じゅぎょうはくじにはじまります。', '授業は九時に始まります。', 'クラスは9時に始まります。'],
                tiles: ['授業は', '9時に', '始まります'],
                explanation: '授業 = class; 9時に = at nine o\'clock; 始まります = starts.'
            },
            i3: {
                model: '本を家に忘れました。',
                accepted: ['ほんをいえにわすれました。', '家に本を忘れました。', '本を家に忘れてきました。', '私は本を家に忘れました。'],
                tiles: ['本を', '家に', '忘れました'],
                explanation: '忘れました = forgot (left behind); 家に = at home. The object takes を, and Japanese usually leaves out "I" and "my".'
            },
            i4: {
                model: 'これはいくらですか？',
                accepted: ['これ、いくらですか？', 'いくらですか？'],
                tiles: ['これは', 'いくらですか'],
                explanation: 'いくら = how much (price); これ = this.'
            },
            i5: {
                model: '私の試験は来週です。',
                accepted: ['わたしのしけんはらいしゅうです。', '試験は来週です。', '来週、試験があります。', '私のテストは来週です。'],
                tiles: ['私の', '試験は', '来週です'],
                explanation: '来週 = next week; 試験 = exam.'
            },
            i6: {
                model: '手伝ってもらえますか？',
                accepted: ['てつだってもらえますか？', '手伝っていただけますか？', '助けてもらえますか？', '手伝ってくれますか？'],
                tiles: ['手伝って', 'もらえますか'],
                explanation: '手伝う = help; 〜てもらえますか = can you … (for me)? 〜ていただけますか is even more polite.'
            },
            q1: {
                model: '私たちは図書館に行きます。',
                accepted: ['わたしたちはとしょかんにいきます。', '図書館に行きます。', '私たちは図書館へ行きます。', '私たちは図書館に行くところです。'],
                tiles: ['私たちは', '図書館に', '行きます'],
                explanation: '図書館 = library. For "are going" Japanese uses 行きます (or 行くところです, "about to go"); 行っています would mean "have gone".'
            },
            q2: {
                model: '彼女はカンナダ語をとても上手に話します。',
                accepted: ['かのじょはカンナダごをとてもじょうずにはなします。', '彼女はカンナダ語がとても上手です。', '彼女はとても上手にカンナダ語を話します。'],
                tiles: ['彼女は', 'カンナダ語を', 'とても', '上手に', '話します'],
                explanation: 'とても上手に = very well; 話します = speaks. カンナダ語 = Kannada.'
            },
            q3: {
                model: '水を無駄にしないでください。',
                accepted: ['みずをむだにしないでください。', '水をむだにしないでください。', '水を無駄にしないで。'],
                tiles: ['水を', '無駄に', 'しないでください'],
                explanation: '無駄にする = waste; 〜ないでください = please do not (polite).'
            },
            q4: {
                model: '店は10時に開きます。',
                accepted: ['みせはじゅうじにあきます。', 'みせはじゅうじにひらきます。', 'お店は10時に開きます。', '店は十時に開きます。'],
                tiles: ['店は', '10時に', '開きます'],
                explanation: '開きます = opens; 10時に = at ten o\'clock.'
            }
        },
        'translation-advanced-kn-en': {
            i1: { source: '会議は月曜日に延期されました。', explanation: '〜されました is passive: "has been …". 延期する = postpone.' },
            i2: { source: '金曜日までに報告書を送ってください。', explanation: '〜までに with a day means "by" (not later than); 〜まで alone means "until".' },
            i3: { source: '返信が遅くなり、申し訳ありません。', explanation: 'A common line in emails: 返信 = reply, 申し訳ありません = I am sorry (formal).' },
            i4: { source: '私たちのチームはプロジェクトを予定どおりに完了しました。', explanation: '完了しました = completed; 予定どおりに = on time (as planned).' },
            i5: {
                source: '私は去年、学位を取得しました。今はソフトウェア会社での仕事を探しています。新しいことを学ぶことにとても興味があります。',
                explanation: 'Three sentences: a past action (取得しました), an action going on now (探しています), and a feeling (興味があります). Compare your tenses with the model.'
            },
            i6: { source: 'ご協力ありがとうございます。', explanation: '協力 = cooperation; ご協力 = your cooperation (polite).' },
            q1: { source: 'この問題はできるだけ早く解決されます。', explanation: '〜されます is the future passive here: "will be …". できるだけ早く = as soon as possible.' },
            q2: { source: '私はこの職に応募したいと思います。', explanation: '職 = post or position; 応募する = apply; 〜たいと思います = I would like to.' },
            q3: { source: '彼は会議で良い提案をしました。', explanation: '彼 = he; 提案をしました = gave (made) a suggestion; 会議で = in the meeting.' },
            q4: { source: '顧客満足が私たちの最優先事項です。', explanation: '顧客満足 = customer satisfaction; 最優先事項 = first (top) priority.' }
        },
        'translation-advanced-en-kn': {
            i1: {
                model: '会社は新しい方針を発表しました。',
                accepted: ['かいしゃはあたらしいほうしんをはっぴょうしました。', '会社が新しい方針を発表しました。', '会社は新しいポリシーを発表しました。'],
                tiles: ['会社は', '新しい', '方針を', '発表しました'],
                explanation: '方針 = policy; 発表しました = has announced (Japanese uses the past form for "has …").'
            },
            i2: {
                model: '教育は成功への鍵です。',
                accepted: ['きょういくはせいこうへのかぎです。', '教育は成功の鍵です。', '教育こそが成功への鍵です。'],
                tiles: ['教育は', '成功への', '鍵です'],
                explanation: '成功 = success; 鍵 = key; 成功への鍵 = the key to success.'
            },
            i3: {
                model: '何か変更があれば、お知らせください。',
                accepted: ['なにかへんこうがあれば、おしらせください。', '変更があれば、お知らせください。', '何か変更があれば、私に知らせてください。', '何か変更があったら、教えてください。'],
                tiles: ['何か', '変更が', 'あれば', 'お知らせください'],
                explanation: 'In Japanese the "if" part (〜があれば) comes first; お知らせください = please inform me (polite).'
            },
            i4: {
                model: '私たちは環境を守るべきです。',
                accepted: ['わたしたちはかんきょうをまもるべきです。', '環境を守るべきです。', '私たちは環境を保護するべきです。', '私たちは環境を守らなければなりません。'],
                tiles: ['私たちは', '環境を', '守るべきです'],
                explanation: '〜べきです = should; 守る = protect. 〜なければなりません means must.'
            },
            i5: {
                model: '私たちの大学は先週、献血会を開催しました。多くの学生と先生が参加しました。医師たちは、みんなの協力に感謝しました。',
                accepted: ['わたしたちのだいがくはせんしゅう、けんけつかいをかいさいしました。おおくのがくせいとせんせいがさんかしました。いしたちは、みんなのきょうりょくにかんしゃしました。'],
                explanation: '献血会 = blood donation camp; 参加する = take part. Compare your sentences with the model.'
            },
            i6: {
                model: '2日間の休暇をお願いしたく、ご連絡しました。',
                accepted: ['ふつかかんのきゅうかをおねがいしたく、ごれんらくしました。', '二日間の休暇をお願いしたく、ご連絡しました。', '2日間の休暇をいただきたく、ご連絡いたしました。', '2日間の休暇を申請するために書いています。'],
                tiles: ['2日間の', '休暇を', 'お願いしたく', 'ご連絡しました'],
                explanation: '休暇 = leave; お願いしたく = wishing to request. A Japanese letter says ご連絡しました ("I am contacting you") rather than "I am writing".'
            },
            q1: {
                model: '努力は必ず報われます。',
                accepted: ['どりょくはかならずむくわれます。', '努力はいつも報われます。', '頑張れば必ず報われます。'],
                tiles: ['努力は', '必ず', '報われます'],
                explanation: '"Pays off" means "is rewarded": 報われます. 努力 = hard work, effort; 必ず = always, surely.'
            },
            q2: {
                model: '結果は明日発表されます。',
                accepted: ['けっかはあしたはっぴょうされます。', 'けっかはあすはっぴょうされます。', '明日、結果が発表されます。', '結果は明日公表されます。'],
                tiles: ['結果は', '明日', '発表されます'],
                explanation: '"Will be announced" is the passive 発表されます (発表する = announce).'
            },
            q3: {
                model: '早速のご返信ありがとうございます。',
                accepted: ['さっそくのごへんしんありがとうございます。', '迅速なご返信ありがとうございます。', 'すぐにご返信いただき、ありがとうございます。', '早速のお返事ありがとうございます。'],
                tiles: ['早速の', 'ご返信', 'ありがとうございます'],
                explanation: '早速の = quick (prompt); ご返信 = your reply (polite). ありがとうございます comes at the end.'
            },
            q4: {
                model: '安全は全員の責任です。',
                accepted: ['あんぜんはぜんいんのせきにんです。', '安全はみんなの責任です。', '安全は皆の責任です。'],
                tiles: ['安全は', '全員の', '責任です'],
                explanation: '安全 = safety; 全員の (or みんなの) = everyone\'s; 責任 = responsibility.'
            }
        }
    },
    placement: {
        b4: { prompt: '"本" in English is…', explanation: '本 means book.' },
        a5: { prompt: '"会議は延期されました" best translates as…', explanation: '延期する means postpone, and 〜されました is passive here: "has been".' }
    }
};
