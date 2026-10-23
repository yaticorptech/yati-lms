/**
 * Linguistic Ability — Korean as the student's own language: word meanings,
 * tips and translation exercises, matched to the Kannada content by lesson
 * (seedKey) and item id. English answers and questions stay as they are.
 */
module.exports = {
    code: 'ko', name: 'Korean', native: '한국어', locale: 'ko-KR',
    words: {
        'vocab-beginner-1': {
            family: '가족',
            mother: '어머니',
            father: '아버지',
            house: '집',
            food: '음식',
            happy: '행복한, 기쁜',
            big: '큰',
            small: '작은'
        },
        'vocab-beginner-2': {
            book: '책',
            teacher: '선생님',
            student: '학생',
            friend: '친구',
            read: '읽다',
            write: '쓰다',
            early: '일찍',
            easy: '쉬운'
        },
        'vocab-intermediate-1': {
            honest: '정직한',
            polite: '예의 바른',
            curious: '호기심 많은',
            confident: '자신감 있는',
            patient: '참을성 있는',
            grateful: '감사하는',
            anxious: '불안한',
            generous: '너그러운, 인심 좋은'
        },
        'vocab-intermediate-2': {
            deadline: '마감일',
            improve: '향상시키다',
            achieve: '달성하다',
            schedule: '일정',
            opportunity: '기회',
            responsible: '책임 있는',
            discuss: '논의하다',
            result: '결과'
        },
        'vocab-advanced-1': {
            negotiate: '협상하다',
            collaborate: '협력하다',
            efficient: '효율적인',
            feasible: '실현 가능한',
            comprehensive: '종합적인',
            prioritise: '우선순위를 정하다',
            ambiguous: '모호한',
            persuade: '설득하다'
        },
        'vocab-advanced-2': {
            sustainable: '지속 가능한',
            consequence: '결과',
            perspective: '관점',
            inevitable: '불가피한',
            substantial: '상당한',
            advocate: '옹호하다, 지지하다',
            diverse: '다양한',
            integrity: '정직성, 도덕성'
        }
    },
    learn: {
        'grammar-beginner-1': {
            kannadaNote: 'Korean has no words for a, an or the (책 can mean "a book" or "the book"), so they are easy to forget. Say them aloud while you practise.'
        },
        'grammar-beginner-2': {
            points: {
                4: 'In Korean the verb comes last: "라비는 책을 읽어요." In English the verb comes right after the subject.'
            }
        },
        'translation-beginner-kn-en': {
            intro: 'Translate each Korean word or sentence into English.',
            points: [
                'Korean puts the verb at the end: "저는 학교에 가요" (I school-to go). English puts it after the subject: "I go to school."',
                'English needs a, an and the, which Korean does not have. "Is / am / are" is a separate word in English, but in Korean it is an ending: 학생이에요 = (I) am a student.',
                'Watch the tense: 가요 (go / am going), 갔어요 (went), 갈 거예요 (will go), 가고 있어요 (am going now).',
                'Korean often leaves out "I" and "you", but English always needs a subject. Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-beginner-en-kn': {
            intro: 'Translate each English word or sentence into Korean.',
            points: [
                'Move the verb to the end: "I go to school" → "저는 학교에 가요".',
                'There are no words for a, an or the in Korean; leave them out. Add the small markers instead: 은/는 or 이/가 after the subject, 을/를 after the object: 저는 책을 읽어요.',
                'Use the polite -요 form with teachers, elders and strangers: 저 (I), 가요, 주세요. With close friends you may use the casual form: 나, 가, 줘. The formal -ㅂ니다 form (갑니다, 감사합니다) is also correct.',
                'Type in Korean with your phone\'s Korean keyboard, or use the Korean letters under the answer box. Leave a space between words as Korean does: 저는 학교에 가요.'
            ]
        },
        'translation-intermediate-kn-en': {
            intro: 'Look at the Korean verb ending to choose the English tense.',
            points: [
                'Korean puts the verb at the end: "저는 학교에 가요" (I school-to go). English puts it after the subject: "I go to school."',
                'English needs a, an and the, which Korean does not have. "Is / am / are" is a separate word in English, but in Korean it is an ending: 학생이에요 = (I) am a student.',
                'Watch the tense: 가요 (go / am going), 갔어요 (went), 갈 거예요 (will go), 가고 있어요 (am going now).',
                'Korean often leaves out "I" and "you", but English always needs a subject. Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-intermediate-en-kn': {
            intro: 'Translate into natural Korean. Use the polite form for requests: 주세요 (please give), 말씀해 주세요 (please tell me).',
            points: [
                'Move the verb to the end: "I go to school" → "저는 학교에 가요".',
                'There are no words for a, an or the in Korean; leave them out. Add the small markers instead: 은/는 or 이/가 after the subject, 을/를 after the object: 저는 책을 읽어요.',
                'Use the polite -요 form with teachers, elders and strangers: 저 (I), 가요, 주세요. With close friends you may use the casual form: 나, 가, 줘. The formal -ㅂ니다 form (갑니다, 감사합니다) is also correct.',
                'Type in Korean with your phone\'s Korean keyboard, or use the Korean letters under the answer box. Leave a space between words as Korean does: 저는 학교에 가요.'
            ]
        },
        'translation-advanced-kn-en': {
            intro: 'Use formal, professional English. Passive sentences are common at work: "The meeting has been postponed." A Korean -되었습니다 (연기되었습니다) often becomes "has been …".',
            points: [
                'Korean puts the verb at the end: "저는 학교에 가요" (I school-to go). English puts it after the subject: "I go to school."',
                'English needs a, an and the, which Korean does not have. "Is / am / are" is a separate word in English, but in Korean it is an ending: 학생이에요 = (I) am a student.',
                'Watch the tense: 가요 (go / am going), 갔어요 (went), 갈 거예요 (will go), 가고 있어요 (am going now).',
                'Korean often leaves out "I" and "you", but English always needs a subject. Translate the meaning, not word by word. More than one good answer is often possible.'
            ]
        },
        'translation-advanced-en-kn': {
            intro: 'Write polite, professional Korean. Passive verbs with -되다 (발표되다 = be announced) are common in notices, often with the formal -ㅂ니다 ending: 발표됩니다. The -요 form is also correct.',
            points: [
                'Move the verb to the end: "I go to school" → "저는 학교에 가요".',
                'There are no words for a, an or the in Korean; leave them out. Add the small markers instead: 은/는 or 이/가 after the subject, 을/를 after the object: 저는 책을 읽어요.',
                'Use the polite -요 form with teachers, elders and strangers: 저 (I), 가요, 주세요. With close friends you may use the casual form: 나, 가, 줘. The formal -ㅂ니다 form (갑니다, 감사합니다) is also correct.',
                'Type in Korean with your phone\'s Korean keyboard, or use the Korean letters under the answer box. Leave a space between words as Korean does: 저는 학교에 가요.'
            ]
        }
    },
    items: {
        'translation-beginner-kn-en': {
            i1: { source: '물', explanation: '물 means water.' },
            i2: { source: '책', explanation: '책 means book.' },
            i3: { source: '제 이름은 라니예요.', explanation: '제 = my, 이름 = name; 예요 means "is". English puts "is" right after "My name".' },
            i4: { source: '어떻게 지내세요?', explanation: 'This is the common polite greeting: 어떻게 = how, 지내세요 = (you) are doing. English needs "are" and "you".' },
            i5: { source: '저는 잘 지내요.', explanation: '잘 = well; 잘 지내요 means "I am doing well", so "I am fine".' },
            i6: { source: '이것은 제 집이에요.', explanation: '이것은 = this, 제 = my, 집 = house; 이에요 = is. English puts "is" second: This is my house.' },
            q1: { source: '저는 학교에 가요.', explanation: '학교에 = to school. 가요 can mean "I go", "I am going" or "I will go". The verb moves to after "I".' },
            q2: { source: '그녀는 제 여동생이에요.', explanation: '여동생 is a younger sister (언니 or 누나 is an elder sister). 그녀 = she.' },
            q3: { source: '문을 닫아 주세요.', explanation: '문 = door, 닫다 = close; -아 주세요 makes a polite request, like "please".' },
            q4: { source: '감사합니다.', explanation: '감사합니다 is the polite way to say thank you (고마워 is used with friends).' }
        },
        'translation-beginner-en-kn': {
            i1: { model: '친구', accepted: [], explanation: 'Friend is 친구, the same word for a boy or a girl.' },
            i2: { model: '학교', accepted: [], explanation: 'School is 학교.' },
            i3: {
                model: '안녕하세요.',
                accepted: ['좋은 아침이에요.', '좋은 아침입니다.', '안녕하십니까.'],
                explanation: 'Koreans usually greet with 안녕하세요 at any time of day. 좋은 아침이에요 ("good morning") is also used.'
            },
            i4: {
                model: '저는 학생이에요.',
                accepted: ['저는 학생입니다.', '학생이에요.', '학생입니다.', '나는 학생이야.'],
                explanation: 'Korean needs no word for "a"; 이에요 (or 입니다) means "am". 저 is the polite "I".'
            },
            i5: {
                model: '이름이 뭐예요?',
                accepted: ['이름이 무엇입니까?', '성함이 어떻게 되세요?', '성함이 어떻게 되십니까?', '이름이 뭐야?'],
                explanation: 'Korean usually leaves out "your": 이름이 뭐예요? = (your) name is what? 성함 is the respectful word for an elder\'s name.'
            },
            i6: {
                model: '음식이 맛있어요.',
                accepted: ['음식이 맛있습니다.', '음식이 맛있네요.', '밥이 맛있어요.'],
                explanation: '맛 = taste; 맛있어요 = is tasty. Korean needs no word for "the".'
            },
            q1: {
                model: '버스 정류장이 어디예요?',
                accepted: ['버스 정류장이 어디입니까?', '버스 정류장이 어디에 있어요?', '버스 정류장은 어디에 있습니까?', '버스 터미널이 어디예요?'],
                explanation: '어디 = where; 어디예요? = where is (it)? 버스 정류장 = bus stop or bus stand.'
            },
            q2: {
                model: '저는 망고를 좋아해요.',
                accepted: ['저는 망고를 좋아합니다.', '망고를 좋아해요.', '저는 망고가 좋아요.', '나는 망고를 좋아해.'],
                explanation: '좋아해요 = like, and the thing liked takes 을/를: 망고를. Korean needs no plural -s here.'
            },
            q3: {
                model: '이리 오세요.',
                accepted: ['이리 오십시오.', '여기로 오세요.', '이리 와.', '여기로 와.'],
                explanation: '오세요 is polite; 와 is used with friends and children. 이리 = here (to this place).'
            },
            q4: {
                model: '비가 와요.',
                accepted: ['비가 옵니다.', '비가 오고 있어요.', '비가 오고 있습니다.', '비가 내려요.'],
                explanation: 'Korean says "rain comes": 비가 와요, with no word for "it". 오고 있어요 stresses "right now".'
            }
        },
        'translation-intermediate-kn-en': {
            i1: { source: '저는 어제 영화를 봤어요.', explanation: '봤어요 is the past of 보다 (see, watch): watched (or saw).' },
            i2: { source: '그는 매일 아침 달리기를 해요.', explanation: '매일 아침 = every morning. A habit takes the simple present: runs.' },
            i3: { source: '우리는 내일 마이수루에 갈 거예요.', explanation: '내일 (tomorrow) and 갈 거예요 show the future: will go.' },
            i4: { source: '그녀는 책을 읽고 있어요.', explanation: '-고 있어요 shows an action happening now: is reading.' },
            i5: { source: '아이들이 운동장에서 놀고 있어요.', explanation: '운동장 = ground or playground; 놀고 있어요 = are playing. -들 makes 아이 (child) plural.' },
            i6: { source: '식사하셨어요?', explanation: 'A polite question about eating (식사 = meal). Korean leaves out "you", but English needs it. "Have you eaten?" is just as natural.' },
            q1: { source: '저는 영어로 말하는 것을 좋아해요.', explanation: '…것을 좋아해요 = (I) like to …; 영어로 말하다 = speak English.' },
            q2: { source: '그들은 2년째 벵갈루루에서 살고 있어요.', explanation: '-째 with a time (2년째) and -고 있어요 mean the action began in the past and is still going on: the present perfect continuous.' },
            q3: { source: '기차가 제시간에 왔어요.', explanation: '제시간에 = on time; 왔어요 = came.' },
            q4: { source: '천천히 말씀해 주세요.', explanation: '천천히 = slowly; 말씀해 주세요 = please speak (polite).' }
        },
        'translation-intermediate-en-kn': {
            i1: {
                model: '물 좀 주세요.',
                accepted: ['저에게 물 좀 주세요.', '물을 좀 주세요.', '물 좀 주십시오.', '물 좀 줘.'],
                explanation: '주세요 is the polite "please give (me)". 좀 (a little) means "some" and makes the request softer.'
            },
            i2: {
                model: '수업은 아홉 시에 시작해요.',
                accepted: ['수업은 아홉 시에 시작합니다.', '수업은 9시에 시작해요.', '수업은 9시에 시작합니다.', '수업이 아홉 시에 시작해요.'],
                explanation: '아홉 시에 = at nine o\'clock (시 = o\'clock, 에 = at); 시작해요 = starts.'
            },
            i3: {
                model: '저는 책을 집에 두고 왔어요.',
                accepted: ['저는 책을 집에 두고 왔습니다.', '책을 집에 두고 왔어요.', '제 책을 집에 놓고 왔어요.', '깜빡하고 책을 집에 두고 왔어요.'],
                explanation: 'Korean says "left (it) at home and came": 집에 두고 왔어요. The object takes 을/를: 책을.'
            },
            i4: {
                model: '이거 얼마예요?',
                accepted: ['이것은 얼마예요?', '이것은 얼마입니까?', '이건 얼마예요?', '이거 얼마나 해요?'],
                explanation: '얼마 = how much; 이거 = this. Korean needs no words for "does" or "cost".'
            },
            i5: {
                model: '제 시험은 다음 주예요.',
                accepted: ['제 시험은 다음 주입니다.', '시험이 다음 주예요.', '다음 주에 시험이 있어요.', '다음 주에 시험이 있습니다.'],
                explanation: '다음 주 = next week; 제 = my (polite).'
            },
            i6: {
                model: '저를 도와주실 수 있어요?',
                accepted: ['저를 도와주실 수 있습니까?', '도와주실 수 있어요?', '저 좀 도와주시겠어요?', '나 좀 도와줄 수 있어?'],
                explanation: '도와주다 = help; -(으)ㄹ 수 있어요? = can (you) …? Korean usually leaves out "you".'
            },
            q1: {
                model: '우리는 도서관에 가고 있어요.',
                accepted: ['우리는 도서관에 가고 있습니다.', '저희는 도서관에 가고 있어요.', '우리는 도서관에 가요.', '도서관에 가고 있어요.'],
                explanation: '도서관 = library; 에 = to; 가고 있어요 = are going.'
            },
            q2: {
                model: '그녀는 칸나다어를 아주 잘해요.',
                accepted: ['그녀는 칸나다어를 아주 잘합니다.', '그녀는 칸나다어를 매우 잘해요.', '그녀는 칸나다어를 정말 잘해요.', '그녀는 칸나다어를 아주 잘 말해요.'],
                explanation: '아주 = very; for a language Korean says 잘해요 ("does well"): 칸나다어를 아주 잘해요 = speaks Kannada very well.'
            },
            q3: {
                model: '물을 낭비하지 마세요.',
                accepted: ['물을 낭비하지 마십시오.', '물 낭비하지 마세요.', '물을 낭비하지 마.'],
                explanation: '낭비하다 = waste; -지 마세요 = do not (polite).'
            },
            q4: {
                model: '가게는 열 시에 문을 열어요.',
                accepted: ['가게는 열 시에 문을 엽니다.', '가게는 10시에 문을 열어요.', '가게는 10시에 문을 엽니다.', '가게는 열 시에 열어요.'],
                explanation: '열 시에 = at ten; 문을 열어요 = opens (literally "opens its door").'
            }
        },
        'translation-advanced-kn-en': {
            i1: { source: '회의가 월요일로 연기되었습니다.', explanation: '-되었습니다 is passive: "has been …". 연기하다 = postpone; 월요일로 = to Monday.' },
            i2: { source: '금요일까지 보고서를 보내 주세요.', explanation: '-까지 with a day means "by" (not later than).' },
            i3: { source: '답장이 늦어서 죄송합니다.', explanation: '답장 = reply; 늦어서 죄송합니다 = sorry for being late. A common line in emails.' },
            i4: { source: '저희 팀은 프로젝트를 제시간에 완료했습니다.', explanation: '완료했습니다 = completed; 제시간에 = on time.' },
            i5: {
                source: '저는 작년에 학위 과정을 마쳤습니다. 지금은 소프트웨어 회사에서 일자리를 찾고 있습니다. 저는 새로운 것을 배우는 데 관심이 많습니다.',
                explanation: 'Three sentences: a past action, an action going on now, and a feeling. Compare your tenses with the model.'
            },
            i6: { source: '협조해 주셔서 감사합니다.', explanation: '협조 = cooperation; -해 주셔서 감사합니다 = thank you for (doing) ….' },
            q1: { source: '이 문제는 최대한 빨리 해결될 것입니다.', explanation: '해결될 것입니다 is the future passive: "will be solved". 최대한 빨리 = as soon as possible.' },
            q2: { source: '저는 이 직책에 지원하고 싶습니다.', explanation: '직책 = post or position; 지원하다 = apply; -고 싶습니다 = would like to.' },
            q3: { source: '그분은 회의에서 좋은 제안을 하셨습니다.', explanation: '그분 is a respectful "he" or "she" (it does not show which). 제안 = suggestion.' },
            q4: { source: '고객 만족이 저희의 최우선 과제입니다.', explanation: '고객 만족 = customer satisfaction; 최우선 과제 = first (top) priority.' }
        },
        'translation-advanced-en-kn': {
            i1: {
                model: '회사가 새로운 정책을 발표했어요.',
                accepted: ['회사가 새로운 정책을 발표했습니다.', '회사는 새로운 정책을 발표했어요.', '회사가 새 정책을 발표했어요.', '회사가 새 정책을 발표했습니다.'],
                explanation: '정책 = policy; 발표했어요 = has announced. Korean uses the past form for "has …ed".'
            },
            i2: {
                model: '교육은 성공의 열쇠예요.',
                accepted: ['교육은 성공의 열쇠입니다.', '교육이 성공의 열쇠예요.', '교육이 성공의 열쇠입니다.'],
                explanation: '성공 = success; 열쇠 = key; 의 = of. 성공의 열쇠 = the key to success.'
            },
            i3: {
                model: '변경 사항이 있으면 알려 주세요.',
                accepted: ['변경 사항이 있으면 알려 주십시오.', '변경 사항이 있으면 저에게 알려 주세요.', '변경 사항이 있으면 저에게 알려 주십시오.', '바뀌는 것이 있으면 알려 주세요.'],
                explanation: 'In Korean the "if" part (있으면) comes first. 알려 주세요 = please let (me) know.'
            },
            i4: {
                model: '우리는 환경을 보호해야 해요.',
                accepted: ['우리는 환경을 보호해야 합니다.', '우리는 환경을 지켜야 해요.', '우리는 환경을 지켜야 합니다.', '환경을 보호해야 해요.'],
                explanation: '-아야/어야 해요 = should or must; 보호하다 = protect.'
            },
            i5: {
                model: '우리 대학은 지난주에 헌혈 행사를 열었어요. 많은 학생과 선생님이 참여했어요. 의사들은 모두의 지원에 감사를 전했어요.',
                accepted: ['우리 대학은 지난주에 헌혈 행사를 열었습니다. 많은 학생과 선생님이 참여했습니다. 의사들은 모두의 지원에 감사를 전했습니다.'],
                explanation: '헌혈 행사 = blood donation camp; 참여하다 = take part. Compare your sentences with the model.'
            },
            i6: {
                model: '이틀간 휴가를 신청하려고 이 글을 써요.',
                accepted: ['이틀간 휴가를 신청하고자 이 글을 씁니다.', '이틀간의 휴가를 요청하기 위해 이 글을 씁니다.', '이틀 동안 휴가를 요청하려고 글을 써요.', '이틀간 휴가를 신청하려고 글을 씁니다.'],
                explanation: '휴가 = leave; 신청하다 or 요청하다 = request; -려고 = in order to. 이틀 = two days.'
            },
            q1: {
                model: '노력은 언제나 결실을 맺어요.',
                accepted: ['노력은 언제나 결실을 맺습니다.', '노력은 항상 결실을 맺어요.', '노력은 항상 결실을 맺습니다.', '열심히 노력하면 항상 보상을 받아요.'],
                explanation: '"Pays off" means "gives a good result": 결실을 맺다 = bear fruit. 노력 = hard work.'
            },
            q2: {
                model: '결과는 내일 발표될 거예요.',
                accepted: ['결과는 내일 발표될 것입니다.', '결과는 내일 발표됩니다.', '결과는 내일 발표돼요.', '결과는 내일 발표될 예정입니다.'],
                explanation: '"Will be announced" is the future passive: 발표될 거예요 (발표되다 = be announced). Notices often say 발표될 예정입니다.'
            },
            q3: {
                model: '빠른 답변 감사드려요.',
                accepted: ['빠른 답변 감사합니다.', '빠른 답변에 감사드립니다.', '빠르게 답변해 주셔서 감사합니다.', '빠른 답장 감사해요.'],
                explanation: '빠른 = quick; 답변 = response; 감사드려요 = thank you (polite). Korean needs no word for "your" here.'
            },
            q4: {
                model: '안전은 모두의 책임이에요.',
                accepted: ['안전은 모두의 책임입니다.', '안전은 우리 모두의 책임이에요.', '안전은 우리 모두의 책임입니다.'],
                explanation: '안전 = safety; 모두의 = everyone\'s; 책임 = responsibility.'
            }
        }
    },
    placement: {
        b4: { prompt: '"책" in English is…', explanation: '책 means book.' },
        a5: { prompt: '"회의가 연기되었습니다" best translates as…', explanation: '연기하다 means postpone, and 연기되었습니다 is passive: "has been postponed".' }
    }
};
