/**
 * Advanced, topic 3 — Money matters (asked 2026-10-24: "make more units in
 * each section for each language"). Two units (parts.js): Spending and
 * saving, and Risk and reward. The words and sentences in every language are
 * below the lessons; written here, not by any translation service — a native
 * speaker should check them.
 */
const { w, mcq, fill, fix, order, dialogue, item, tipsOf } = require('./make');

const lessons = [
    {
        seedKey: 'vocab-advanced-3', module: 'vocabulary', level: 'advanced', order: 3,
        title: 'Money matters',
        summary: 'Words for budgets, savings, loans and investments.',
        learn: {
            intro: 'Learn each word with its Kannada meaning. Read the example sentence aloud to remember how the word is used.',
            points: ['Group the words: spending (budget, expense, afford, savings) and growing money (invest, profit, risk, loan).', 'Use two of the words together in one sentence of your own.']
        },
        words: [
            w('budget', 'ಆಯವ್ಯಯ ಯೋಜನೆ, ಬಜೆಟ್', 'noun', 'I make a monthly budget so that I do not overspend.', ['spending plan']),
            w('expense', 'ಖರ್ಚು, ವೆಚ್ಚ', 'noun', 'Rent is our biggest expense every month.', ['cost', 'expenditure'], ['income']),
            w('afford', 'ಭರಿಸಲು ಶಕ್ತರಾಗಿರು', 'verb', 'We cannot afford a new car this year.', ['manage']),
            w('savings', 'ಉಳಿತಾಯ', 'noun', 'She used her savings to pay the college fees.', ['reserves'], ['debt']),
            w('invest', 'ಹೂಡಿಕೆ ಮಾಡು', 'verb', 'He decided to invest part of his salary in a mutual fund.', ['put money into']),
            w('profit', 'ಲಾಭ', 'noun', 'The small shop made a good profit during the festival.', ['gain', 'earnings'], ['loss']),
            w('risk', 'ಅಪಾಯ, ನಷ್ಟದ ಸಾಧ್ಯತೆ', 'noun', 'Every investment carries some risk.', ['danger', 'gamble'], ['safety']),
            w('loan', 'ಸಾಲ', 'noun', 'They took a loan from the bank to start a business.', ['credit'])
        ]
    },
    {
        seedKey: 'grammar-advanced-3', module: 'grammar', level: 'advanced', order: 3,
        title: 'Conditionals: if sentences',
        summary: 'Real, imagined and past conditions, and the verb forms each one takes.',
        learn: {
            intro: 'Conditional sentences say what happens, or would happen, if something is true. There are three common types.',
            points: [
                'Real and possible (first conditional): If + present, will + verb. "If you save every month, you will have enough by June."',
                'Imagined now (second conditional): If + past, would + verb. "If I had more money, I would travel."',
                'Imagined past (third conditional): If + had + past participle, would have + past participle. "If she had saved earlier, she would have bought the laptop."',
                'Do not use "will" in the if-part: "If it rains, we will stay at home" (not "If it will rain").',
                'In the second conditional, formal English uses "were" for every person: "If I were you, I would invest carefully."'
            ],
            examples: ['If you spend less, you will save more.', 'If I won a prize, I would buy a bike.', 'If he had planned, he would have saved money.', 'If I were you, I would make a budget.']
        },
        practice: [
            mcq('p1', 'If you save ten percent of your salary, you ___ a good amount in a year.', ['will have', 'would have had', 'had'], 'will have', 'A real possibility: If + present, will + verb.'),
            fill('p2', 'If I ___ rich, I would help my village. (was / were)', 'were', 'In the second conditional, formal English uses "were" for every person.'),
            mcq('p3', 'If she had studied harder, she ___ the exam.', ['would have passed', 'will pass', 'would pass'], 'would have passed', 'An imagined past: If + had + past participle, would have + past participle.'),
            fix('p4', 'If it will rain tomorrow, we will cancel the trip.', 'If it rains tomorrow, we will cancel the trip.', 'Do not use "will" in the if-part; use the present.'),
            mcq('p5', 'What would you do if you ___ a lottery?', ['won', 'win', 'had won'], 'won', 'Second conditional: If + past (won), would + verb.'),
            order('p6', ['if you', 'You will', 'save money', 'cook at home'], 'You will save money if you cook at home.', 'The result (You will save money) can come first, then the condition (if you cook at home).')
        ],
        quiz: [
            mcq('q1', 'If prices go up, people ___ less.', ['will buy', 'would have bought', 'bought'], 'will buy', 'First conditional: If + present, will + verb.'),
            fill('q2', 'If I ___ a car, I would drive to work. (have / had)', 'had', 'Second conditional: If + past, would + verb.'),
            mcq('q3', 'Which is correct?', ['If I were you, I would make a budget.', 'If I am you, I would make a budget.', 'If I were you, I will make a budget.'], 'If I were you, I would make a budget.', '"If I were you" gives advice, with "would" in the other part.'),
            fix('q4', 'If he would have invested earlier, he would have earned more.', 'If he had invested earlier, he would have earned more.', 'In the if-part of the third conditional, use had + past participle, not "would have".'),
            mcq('q5', 'If they ___ the loan on time, the bank will not charge extra.', ['repay', 'repaid', 'had repaid'], 'repay', 'First conditional: the if-part is in the present.'),
            fill('q6', 'If we had left earlier, we would not ___ the train. (miss / have missed)', 'have missed', 'Third conditional: would (not) have + past participle.'),
            mcq('q7', 'She would buy a laptop if she ___ enough savings.', ['had', 'has had', 'will have'], 'had', 'Second conditional: would + verb … if + past.'),
            order('q8', ['if you', 'Your money', 'invest wisely', 'will grow'], 'Your money will grow if you invest wisely.', 'The result (Your money will grow) + the condition (if you invest wisely).')
        ]
    },
    {
        seedKey: 'reading-advanced-3', module: 'reading', level: 'advanced', order: 3,
        title: 'Riya\'s First Salary',
        summary: 'A young professional learns to plan her money.',
        learn: {
            intro: 'Read the passage. Notice the advice Riya gets and how she changes. Then answer the questions.',
            passage: {
                title: 'Riya\'s First Salary',
                text: 'When Riya got her first job at a software company in Bengaluru, she was excited to receive her first salary. In the first month, she spent almost all of it on clothes, eating out and a new phone. By the end of the month, she could not afford to pay her rent on time and had to borrow money from a friend. Embarrassed, she asked her uncle, a bank manager, for advice. He suggested a simple rule: spend fifty percent of her income on needs and thirty percent on wants, and save the remaining twenty percent. He also warned her that investments promising very high returns usually carry a high risk. Riya started writing down every expense in a small notebook. Six months later, she had built up an emergency fund and had begun investing a small amount every month. "A budget does not limit your freedom," she now tells her colleagues. "It gives you more of it."'
            }
        },
        quiz: [
            mcq('q1', 'What happened at the end of Riya\'s first month?', ['She could not pay her rent on time', 'She bought a house', 'She got a promotion', 'She lost her job'], 'She could not pay her rent on time', '"…she could not afford to pay her rent on time and had to borrow money from a friend."'),
            mcq('q2', 'Who gave Riya advice?', ['Her uncle, a bank manager', 'Her friend', 'Her manager at work', 'A colleague'], 'Her uncle, a bank manager', '"…she asked her uncle, a bank manager, for advice."'),
            mcq('q3', 'According to the rule, how much of her income should she save?', ['Twenty percent', 'Fifty percent', 'Thirty percent', 'Ten percent'], 'Twenty percent', '"…and save the remaining twenty percent."'),
            mcq('q4', 'What did her uncle say about very high returns?', ['They usually carry a high risk', 'They are always safe', 'They are only for banks', 'They never happen'], 'They usually carry a high risk', '"…investments promising very high returns usually carry a high risk."'),
            mcq('q5', 'What does Riya mean by "It gives you more of it"?', ['A budget gives you more freedom', 'A budget gives you more money at once', 'A budget gives you more work', 'A budget gives you more expenses'], 'A budget gives you more freedom', '"It" is the budget and "it" at the end is freedom: a budget gives you more freedom.')
        ],
        writing: [
            { id: 'w1', type: 'jumbled', prompt: 'Put the words in order.', words: ['every expense', 'She', 'in a notebook', 'wrote down'], answer: 'She wrote down every expense in a notebook.', model: 'She wrote down every expense in a notebook.' },
            { id: 'w2', type: 'jumbled', prompt: 'Put the words in order.', words: ['carries', 'Every investment', 'some risk'], answer: 'Every investment carries some risk.', model: 'Every investment carries some risk.' },
            { id: 'w3', type: 'sentence', prompt: 'Make one sentence with the words "budget" and "save".', mustInclude: ['budget', 'save'], minWords: 7, model: 'A monthly budget helps me save money for my studies.' },
            { id: 'w4', type: 'paragraph', prompt: 'Write a short paragraph (6 to 8 sentences) on why young people should learn to manage money. Use at least one "if" sentence.', minWords: 60, model: 'Many young people get their first salary without knowing how to manage it. If they do not plan, the money can disappear in a few days. A simple monthly budget shows where every rupee goes. It also helps them avoid taking loans for things they do not really need. If they save a small amount every month, they will have an emergency fund when something unexpected happens. Learning about investments early is useful too, but they should understand the risks first. Good money habits give young people confidence and freedom.', checklist: ['I gave at least two reasons', 'I used at least one "if" sentence correctly', 'I used words from this unit (budget, save, risk…)', 'My paragraph has a clear opening and ending'] }
        ]
    },
    {
        seedKey: 'speaking-advanced-3', module: 'speaking', level: 'advanced', order: 3,
        title: 'At the bank: an education loan',
        summary: 'Asking a bank officer about a loan: the amount, the documents, the interest and repaying.',
        learn: {
            intro: 'Listen to how Ayesha asks for information politely and checks the details.',
            dialogue: dialogue('speaking-advanced-3', 'At a bank: Ayesha asks Mr Prakash, a loan officer, about an education loan.', [{ name: 'Prakash', voice: 'm' }, { name: 'Ayesha', voice: 'f' }], [
                ['Prakash', 'Good afternoon. How may I help you?'],
                ['Ayesha', 'Good afternoon. I would like some information about education loans for a master\'s degree.'],
                ['Prakash', 'Certainly. How much would you need, and where would you study?'],
                ['Ayesha', 'About five lakh rupees, for a two-year course at a university in Pune.'],
                ['Prakash', 'For that amount, we would need your admission letter, your marks cards and proof of a parent\'s income.'],
                ['Ayesha', 'What is the rate of interest, and when would I have to start repaying?'],
                ['Prakash', 'The interest rate is about nine percent a year. You can start repaying six months after you finish the course.'],
                ['Ayesha', 'If I repaid the loan early, would there be any extra charges?'],
                ['Prakash', 'No, there is no penalty for repaying an education loan early.'],
                ['Ayesha', 'That\'s very helpful. I\'ll bring the documents next week. Thank you.']
            ]),
            phrases: ['I would like some information about…', 'What is the rate of interest?', 'If I repaid the loan early, would there be any extra charges?']
        },
        quiz: [
            mcq('q1', 'Why has Ayesha come to the bank?', ['To ask about an education loan', 'To open a savings account', 'To apply for a job', 'To change money'], 'To ask about an education loan', '"I would like some information about education loans for a master\'s degree."'),
            mcq('q2', 'How much money does she need?', ['About five lakh rupees', 'About fifty thousand rupees', 'About nine lakh rupees', 'About two lakh rupees'], 'About five lakh rupees', '"About five lakh rupees, for a two-year course…"'),
            mcq('q3', 'Which document does the bank NOT ask for?', ['Her passport', 'Her admission letter', 'Her marks cards', 'Proof of a parent\'s income'], 'Her passport', 'Mr Prakash asks for the admission letter, the marks cards and proof of a parent\'s income — not a passport.'),
            mcq('q4', 'When can she start repaying the loan?', ['Six months after finishing the course', 'Straight away', 'After ten years', 'Before the course starts'], 'Six months after finishing the course', '"You can start repaying six months after you finish the course."'),
            mcq('q5', 'What happens if she repays the loan early?', ['There are no extra charges', 'She pays a penalty', 'The interest rate goes up', 'The bank refuses'], 'There are no extra charges', '"No, there is no penalty for repaying an education loan early."')
        ],
        speaking: {
            prompt: 'You want to open a savings account or ask about a loan. In 6 to 8 sentences, greet the bank officer, explain what you need, ask about two details (such as the interest or the documents), use one "if" question, and close politely.',
            sample: 'Good morning. I would like to open a savings account for my salary. Could you tell me which documents I need to bring? What is the minimum balance for this account? If I wanted to set up a monthly deposit, would that be possible from the same account? Is there any charge for an ATM card? Thank you, that is very clear. I will come back tomorrow with my documents.',
            checklist: ['I greeted the officer and explained what I need', 'I asked about at least two details', 'I used an "if" question correctly', 'I used polite forms like "I would like" and "Could you"', 'I closed the conversation politely', 'I spoke clearly, at a steady pace']
        }
    },
    {
        seedKey: 'translation-advanced-3', module: 'translation', level: 'advanced', order: 3, direction: 'kn-en',
        title: 'Money matters: Kannada → English',
        summary: 'Budgets, savings, loans and risk, and a short passage.',
        learn: { intro: 'Translate each Kannada sentence or passage into clear, natural English.', points: tipsOf('translation-advanced-kn-en') },
        items: [
            item('i1', 'sentence', 'vocabulary', 'ನಾನು ಪ್ರತಿ ತಿಂಗಳು ಬಜೆಟ್ ಮಾಡುತ್ತೇನೆ.', 'I make a budget every month.', 'English "makes" or "prepares" a budget; for a habit, use the present simple.', ['I prepare a budget every month.', 'I make a monthly budget.', 'Every month I make a budget.', 'I plan a budget every month.']),
            item('i2', 'sentence', 'grammar', 'ನಾವು ಅನಗತ್ಯ ಖರ್ಚನ್ನು ಕಡಿಮೆ ಮಾಡಬೇಕು.', 'We should reduce unnecessary expenses.', '"Should" + the plain verb gives advice. "Unnecessary" means not needed.', ['We should cut unnecessary expenses.', 'We must reduce unnecessary expenses.', 'We should reduce unnecessary spending.', 'We need to reduce unnecessary expenses.', 'We should cut down on unnecessary expenses.', 'We have to reduce unnecessary expenses.']),
            item('i3', 'sentence', 'professional', 'ಈ ವರ್ಷ ಹೊಸ ಕಾರು ಕೊಳ್ಳುವಷ್ಟು ಹಣ ನಮ್ಮ ಬಳಿ ಇಲ್ಲ.', 'We cannot afford a new car this year.', '"Cannot afford" says there is not enough money for something.', ['We can\'t afford a new car this year.', 'We cannot afford to buy a new car this year.', 'We can\'t afford to buy a new car this year.', 'This year we cannot afford a new car.', 'We do not have enough money to buy a new car this year.', 'We don\'t have enough money to buy a new car this year.']),
            item('i4', 'sentence', 'grammar', 'ನೀವು ಈಗ ಹೂಡಿಕೆ ಮಾಡಿದರೆ, ನಿಮ್ಮ ಹಣ ಬೆಳೆಯುತ್ತದೆ.', 'If you invest now, your money will grow.', 'First conditional: If + present, will + verb.', ['Your money will grow if you invest now.', 'If you invest now, your money grows.']),
            item('i5', 'sentence', 'vocabulary', 'ಪ್ರತಿಯೊಂದು ಹೂಡಿಕೆಯಲ್ಲೂ ಸ್ವಲ್ಪ ಅಪಾಯ ಇರುತ್ತದೆ.', 'Every investment carries some risk.', 'English says an investment "carries" or "has" a risk.', ['Every investment has some risk.', 'There is some risk in every investment.', 'All investments carry some risk.', 'Every investment involves some risk.']),
            item('i6', 'paragraph', 'passage', 'ನನ್ನ ಅಣ್ಣ ಬ್ಯಾಂಕಿನಿಂದ ಸಾಲ ಪಡೆದು ಒಂದು ಸಣ್ಣ ಅಂಗಡಿ ತೆರೆದನು. ಮೊದಲ ವರ್ಷ ಅವನಿಗೆ ಹೆಚ್ಚು ಲಾಭ ಬರಲಿಲ್ಲ. ಆದರೆ ಅವನು ಕಷ್ಟಪಟ್ಟು ಕೆಲಸ ಮಾಡಿದನು, ಮತ್ತು ಈಗ ಅವನ ವ್ಯಾಪಾರ ಚೆನ್ನಾಗಿ ನಡೆಯುತ್ತಿದೆ.', 'My elder brother took a loan from the bank and opened a small shop. In the first year, he did not make much profit. But he worked hard, and now his business is doing well.', 'Keep the order of events, and the tenses: took, opened, did not make (past); is doing (now). Compare yours with the model; a teacher will also look at it.', [], true)
        ],
        quiz: [
            item('q1', 'sentence', 'vocabulary', 'ಉಳಿತಾಯ ಮಾಡುವುದು ಒಳ್ಳೆಯ ಅಭ್ಯಾಸ.', 'Saving money is a good habit.', 'An -ing word (Saving) can be the subject of a sentence.', ['Saving is a good habit.', 'To save money is a good habit.', 'Saving money is a good practice.']),
            item('q2', 'sentence', 'vocabulary', 'ನಮ್ಮ ದೊಡ್ಡ ಖರ್ಚು ಮನೆ ಬಾಡಿಗೆ.', 'Our biggest expense is the house rent.', 'English needs "is"; "biggest" compares more than two things.', ['Our biggest expense is rent.', 'Our biggest expense is house rent.', 'Our biggest expense is the rent.', 'Our largest expense is the rent.', 'House rent is our biggest expense.', 'Rent is our biggest expense.']),
            item('q3', 'sentence', 'professional', 'ಸಾಲವನ್ನು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ತೀರಿಸಿ.', 'Repay the loan on time.', 'An instruction starts with the verb. "On time" means not late.', ['Pay back the loan on time.', 'Please repay the loan on time.', 'Repay your loan on time.', 'Pay the loan back on time.', 'Pay off the loan on time.']),
            item('q4', 'sentence', 'professional', 'ಕಂಪನಿಯು ಈ ವರ್ಷ ಉತ್ತಮ ಲಾಭ ಗಳಿಸಿತು.', 'The company made a good profit this year.', 'A company "makes" or "earns" a profit.', ['The company earned a good profit this year.', 'The company made good profits this year.', 'This year the company made a good profit.', 'The company got a good profit this year.'])
        ]
    }
];

// Each word's meaning in every language (English: a definition, for English speakers).
const words = {
    budget: { hi: 'बजट', ta: 'வரவு-செலவுத் திட்டம்', te: 'బడ్జెట్', ml: 'ബജറ്റ്', mr: 'अंदाजपत्रक', bn: 'বাজেট', gu: 'બજેટ', pa: 'ਬਜਟ', or: 'ବଜେଟ୍', ur: 'بجٹ', es: 'presupuesto', fr: 'budget', de: 'Budget', pt: 'orçamento', ru: 'бюджет', ar: 'ميزانية', zh: '预算', ja: '予算', ko: '예산', en: 'a plan for how much money you will spend' },
    expense: { hi: 'खर्च', ta: 'செலவு', te: 'ఖర్చు', ml: 'ചെലവ്', mr: 'खर्च', bn: 'খরচ', gu: 'ખર્ચ', pa: 'ਖ਼ਰਚ', or: 'ଖର୍ଚ୍ଚ', ur: 'خرچ', es: 'gasto', fr: 'dépense', de: 'Ausgabe', pt: 'despesa', ru: 'расход', ar: 'نفقة', zh: '开支', ja: '出費', ko: '지출', en: 'money that you spend on something' },
    afford: { hi: 'खर्च उठा पाना', ta: 'செலவைத் தாங்க முடிதல்', te: 'భరించగలగడం', ml: 'താങ്ങാൻ കഴിയുക', mr: 'परवडणे', bn: 'সামর্থ্য থাকা', gu: 'પરવડવું', pa: 'ਖ਼ਰਚ ਝੱਲ ਸਕਣਾ', or: 'ଖର୍ଚ୍ଚ ବହନ କରିପାରିବା', ur: 'استطاعت رکھنا', es: 'permitirse', fr: 'avoir les moyens', de: 'sich leisten', pt: 'ter condições de pagar', ru: 'позволить себе', ar: 'يقدر على تحمّل التكلفة', zh: '负担得起', ja: '買う余裕がある', ko: '감당할 여유가 있다', en: 'to have enough money to pay for something' },
    savings: { hi: 'बचत', ta: 'சேமிப்பு', te: 'పొదుపు', ml: 'സമ്പാദ്യം', mr: 'बचत', bn: 'সঞ্চয়', gu: 'બચત', pa: 'ਬੱਚਤ', or: 'ସଞ୍ଚୟ', ur: 'بچت', es: 'ahorros', fr: 'économies', de: 'Ersparnisse', pt: 'economias', ru: 'сбережения', ar: 'مدخرات', zh: '积蓄', ja: '貯金', ko: '저축', en: 'money you have kept and not spent' },
    invest: { hi: 'निवेश करना', ta: 'முதலீடு செய்தல்', te: 'పెట్టుబడి పెట్టడం', ml: 'നിക്ഷേപിക്കുക', mr: 'गुंतवणूक करणे', bn: 'বিনিয়োগ করা', gu: 'રોકાણ કરવું', pa: 'ਨਿਵੇਸ਼ ਕਰਨਾ', or: 'ବିନିଯୋଗ କରିବା', ur: 'سرمایہ کاری کرنا', es: 'invertir', fr: 'investir', de: 'investieren', pt: 'investir', ru: 'вкладывать деньги', ar: 'يستثمر', zh: '投资', ja: '投資する', ko: '투자하다', en: 'to put money into something so that it earns more later' },
    profit: { hi: 'मुनाफ़ा, लाभ', ta: 'இலாபம்', te: 'లాభం', ml: 'ലാഭം', mr: 'नफा', bn: 'লাভ', gu: 'નફો', pa: 'ਮੁਨਾਫ਼ਾ', or: 'ଲାଭ', ur: 'منافع', es: 'ganancia', fr: 'bénéfice', de: 'Gewinn', pt: 'lucro', ru: 'прибыль', ar: 'ربح', zh: '利润', ja: '利益', ko: '이익', en: 'the money you gain after paying your costs' },
    risk: { hi: 'जोखिम', ta: 'இடர்', te: 'ప్రమాదం', ml: 'അപകടസാധ്യത', mr: 'जोखीम', bn: 'ঝুঁকি', gu: 'જોખમ', pa: 'ਜੋਖ਼ਮ', or: 'ବିପଦର ଆଶଙ୍କା', ur: 'خطرہ', es: 'riesgo', fr: 'risque', de: 'Risiko', pt: 'risco', ru: 'риск', ar: 'مخاطرة', zh: '风险', ja: 'リスク', ko: '위험', en: 'the chance that something bad, like a loss, may happen' },
    loan: { hi: 'कर्ज़, ऋण', ta: 'கடன்', te: 'అప్పు', ml: 'വായ്പ', mr: 'कर्ज', bn: 'ঋণ', gu: 'ધિરાણ', pa: 'ਕਰਜ਼ਾ', or: 'ଋଣ', ur: 'قرض', es: 'préstamo', fr: 'prêt', de: 'Kredit', pt: 'empréstimo', ru: 'кредит', ar: 'قرض', zh: '贷款', ja: 'ローン', ko: '대출', en: 'money you borrow and must pay back' }
};

// Each Kannada sentence or passage of the translation lesson in every language (the English is the lesson's own).
const sentences = {
    i1: { hi: 'मैं हर महीने बजट बनाता हूँ।', ta: 'நான் ஒவ்வொரு மாதமும் பட்ஜெட் போடுகிறேன்.', te: 'నేను ప్రతి నెలా బడ్జెట్ వేసుకుంటాను.', ml: 'ഞാൻ എല്ലാ മാസവും ബജറ്റ് തയ്യാറാക്കുന്നു.', mr: 'मी दर महिन्याला बजेट करतो.', bn: 'আমি প্রতি মাসে বাজেট করি।', gu: 'હું દર મહિને બજેટ બનાવું છું.', pa: 'ਮੈਂ ਹਰ ਮਹੀਨੇ ਬਜਟ ਬਣਾਉਂਦਾ ਹਾਂ।', or: 'ମୁଁ ପ୍ରତି ମାସରେ ବଜେଟ୍ ପ୍ରସ୍ତୁତ କରେ।', ur: 'میں ہر مہینے بجٹ بناتا ہوں۔', es: 'Hago un presupuesto cada mes.', fr: 'Je fais un budget chaque mois.', de: 'Ich mache jeden Monat ein Budget.', pt: 'Eu faço um orçamento todo mês.', ru: 'Я каждый месяц составляю бюджет.', ar: 'أضع ميزانية كل شهر.', zh: '我每个月都做预算。', ja: '私は毎月予算を立てます。', ko: '저는 매달 예산을 세워요.' },
    i2: { hi: 'हमें फ़ालतू खर्च कम करना चाहिए।', ta: 'நாம் தேவையற்ற செலவுகளைக் குறைக்க வேண்டும்.', te: 'మనం అనవసరమైన ఖర్చులు తగ్గించుకోవాలి.', ml: 'നമ്മൾ അനാവശ്യ ചെലവുകൾ കുറയ്ക്കണം.', mr: 'आपण अनावश्यक खर्च कमी केला पाहिजे.', bn: 'আমাদের অপ্রয়োজনীয় খরচ কমানো উচিত।', gu: 'આપણે બિનજરૂરી ખર્ચ ઓછો કરવો જોઈએ.', pa: 'ਸਾਨੂੰ ਬੇਲੋੜਾ ਖ਼ਰਚ ਘਟਾਉਣਾ ਚਾਹੀਦਾ ਹੈ।', or: 'ଆମେ ଅଦରକାରୀ ଖର୍ଚ୍ଚ କମାଇବା ଉଚିତ।', ur: 'ہمیں فضول خرچ کم کرنا چاہیے۔', es: 'Debemos reducir los gastos innecesarios.', fr: 'Nous devons réduire les dépenses inutiles.', de: 'Wir sollten unnötige Ausgaben verringern.', pt: 'Devemos reduzir as despesas desnecessárias.', ru: 'Нам нужно сократить лишние расходы.', ar: 'يجب أن نقلل النفقات غير الضرورية.', zh: '我们应该减少不必要的开支。', ja: '私たちは無駄な出費を減らすべきです。', ko: '우리는 불필요한 지출을 줄여야 해요.' },
    i3: { hi: 'इस साल हमारे पास नई कार ख़रीदने लायक पैसे नहीं हैं।', ta: 'இந்த ஆண்டு புதிய கார் வாங்கும் அளவுக்கு எங்களிடம் பணம் இல்லை.', te: 'ఈ సంవత్సరం కొత్త కారు కొనేంత డబ్బు మా దగ్గర లేదు.', ml: 'ഈ വർഷം പുതിയ കാർ വാങ്ങാനുള്ള പണം ഞങ്ങളുടെ കൈയിലില്ല.', mr: 'या वर्षी नवीन गाडी घेण्याइतके पैसे आमच्याकडे नाहीत.', bn: 'এ বছর নতুন গাড়ি কেনার মতো টাকা আমাদের নেই।', gu: 'આ વર્ષે નવી કાર ખરીદવા જેટલા પૈસા અમારી પાસે નથી.', pa: 'ਇਸ ਸਾਲ ਸਾਡੇ ਕੋਲ ਨਵੀਂ ਕਾਰ ਖ਼ਰੀਦਣ ਜੋਗੇ ਪੈਸੇ ਨਹੀਂ ਹਨ।', or: 'ଏ ବର୍ଷ ନୂଆ କାର କିଣିବା ଭଳି ଟଙ୍କା ଆମ ପାଖରେ ନାହିଁ।', ur: 'اس سال ہمارے پاس نئی کار خریدنے جتنے پیسے نہیں ہیں۔', es: 'Este año no tenemos dinero suficiente para comprar un coche nuevo.', fr: 'Cette année, nous n’avons pas assez d’argent pour acheter une nouvelle voiture.', de: 'Dieses Jahr haben wir nicht genug Geld für ein neues Auto.', pt: 'Este ano não temos dinheiro suficiente para comprar um carro novo.', ru: 'В этом году у нас нет денег на новую машину.', ar: 'ليس لدينا هذا العام ما يكفي من المال لشراء سيارة جديدة.', zh: '今年我们没有足够的钱买新车。', ja: '今年は新しい車を買うほどのお金がありません。', ko: '올해는 새 차를 살 만한 돈이 없어요.' },
    i4: { hi: 'अगर आप अभी निवेश करेंगे, तो आपका पैसा बढ़ेगा।', ta: 'நீங்கள் இப்போது முதலீடு செய்தால், உங்கள் பணம் வளரும்.', te: 'మీరు ఇప్పుడు పెట్టుబడి పెడితే, మీ డబ్బు పెరుగుతుంది.', ml: 'നിങ്ങൾ ഇപ്പോൾ നിക്ഷേപിച്ചാൽ, നിങ്ങളുടെ പണം വളരും.', mr: 'तुम्ही आता गुंतवणूक केली, तर तुमचे पैसे वाढतील.', bn: 'আপনি এখন বিনিয়োগ করলে আপনার টাকা বাড়বে।', gu: 'જો તમે અત્યારે રોકાણ કરશો, તો તમારા પૈસા વધશે.', pa: 'ਜੇ ਤੁਸੀਂ ਹੁਣ ਨਿਵੇਸ਼ ਕਰੋਗੇ, ਤਾਂ ਤੁਹਾਡਾ ਪੈਸਾ ਵਧੇਗਾ।', or: 'ଆପଣ ଏବେ ବିନିଯୋଗ କଲେ, ଆପଣଙ୍କ ଟଙ୍କା ବଢ଼ିବ।', ur: 'اگر آپ ابھی سرمایہ کاری کریں گے تو آپ کا پیسہ بڑھے گا۔', es: 'Si inviertes ahora, tu dinero crecerá.', fr: 'Si tu investis maintenant, ton argent va grandir.', de: 'Wenn du jetzt investierst, wird dein Geld wachsen.', pt: 'Se você investir agora, seu dinheiro vai crescer.', ru: 'Если вы вложите деньги сейчас, они будут расти.', ar: 'إذا استثمرت الآن، فسينمو مالك.', zh: '如果你现在投资，你的钱会增长。', ja: '今投資すれば、お金は増えます。', ko: '지금 투자하면 돈이 불어날 거예요.' },
    i5: { hi: 'हर निवेश में थोड़ा जोखिम होता है।', ta: 'ஒவ்வொரு முதலீட்டிலும் சிறிது இடர் இருக்கிறது.', te: 'ప్రతి పెట్టుబడిలోనూ కొంత ప్రమాదం ఉంటుంది.', ml: 'ഓരോ നിക്ഷേപത്തിലും കുറച്ച് അപകടസാധ്യതയുണ്ട്.', mr: 'प्रत्येक गुंतवणुकीत थोडी जोखीम असते.', bn: 'প্রতিটি বিনিয়োগেই কিছু ঝুঁকি থাকে।', gu: 'દરેક રોકાણમાં થોડું જોખમ હોય છે.', pa: 'ਹਰ ਨਿਵੇਸ਼ ਵਿੱਚ ਕੁਝ ਜੋਖ਼ਮ ਹੁੰਦਾ ਹੈ।', or: 'ପ୍ରତ୍ୟେକ ବିନିଯୋଗରେ କିଛି ବିପଦର ଆଶଙ୍କା ଥାଏ।', ur: 'ہر سرمایہ کاری میں کچھ خطرہ ہوتا ہے۔', es: 'Toda inversión tiene algo de riesgo.', fr: 'Tout investissement comporte un certain risque.', de: 'Jede Investition birgt ein gewisses Risiko.', pt: 'Todo investimento tem algum risco.', ru: 'Любое вложение связано с некоторым риском.', ar: 'كل استثمار ينطوي على بعض المخاطرة.', zh: '每项投资都有一定的风险。', ja: 'どんな投資にも多少のリスクがあります。', ko: '모든 투자에는 어느 정도 위험이 있어요.' },
    i6: {
        hi: 'मेरे बड़े भाई ने बैंक से कर्ज़ लेकर एक छोटी दुकान खोली। पहले साल उसे ज़्यादा मुनाफ़ा नहीं हुआ। लेकिन उसने मेहनत से काम किया, और अब उसका कारोबार अच्छा चल रहा है।',
        ta: 'என் அண்ணன் வங்கியில் கடன் வாங்கி ஒரு சிறிய கடையைத் திறந்தார். முதல் ஆண்டில் அவருக்கு அதிக இலாபம் கிடைக்கவில்லை. ஆனால் அவர் கடினமாக உழைத்தார், இப்போது அவரது வியாபாரம் நன்றாக நடக்கிறது.',
        te: 'మా అన్నయ్య బ్యాంకు నుండి అప్పు తీసుకుని ఒక చిన్న దుకాణం తెరిచాడు. మొదటి సంవత్సరం అతనికి ఎక్కువ లాభం రాలేదు. కానీ అతను కష్టపడి పని చేశాడు, ఇప్పుడు అతని వ్యాపారం బాగా నడుస్తోంది.',
        ml: 'എന്റെ ചേട്ടൻ ബാങ്കിൽ നിന്ന് വായ്പയെടുത്ത് ഒരു ചെറിയ കട തുടങ്ങി. ആദ്യ വർഷം അദ്ദേഹത്തിന് വലിയ ലാഭം കിട്ടിയില്ല. പക്ഷേ അദ്ദേഹം കഠിനമായി അധ്വാനിച്ചു, ഇപ്പോൾ അദ്ദേഹത്തിന്റെ കച്ചവടം നന്നായി നടക്കുന്നു.',
        mr: 'माझ्या मोठ्या भावाने बँकेकडून कर्ज घेऊन एक छोटे दुकान उघडले. पहिल्या वर्षी त्याला फारसा नफा झाला नाही. पण त्याने मेहनत केली, आणि आता त्याचा व्यवसाय चांगला चालला आहे.',
        bn: 'আমার দাদা ব্যাংক থেকে ঋণ নিয়ে একটা ছোট দোকান খুলেছিল। প্রথম বছর তার বেশি লাভ হয়নি। কিন্তু সে খুব পরিশ্রম করেছিল, আর এখন তার ব্যবসা ভালো চলছে।',
        gu: 'મારા મોટા ભાઈએ બેંકમાંથી ધિરાણ લઈને એક નાની દુકાન ખોલી. પહેલા વર્ષે તેને બહુ નફો ન થયો. પણ તેણે મહેનત કરી, અને હવે તેનો ધંધો સારો ચાલે છે.',
        pa: 'ਮੇਰੇ ਵੱਡੇ ਭਰਾ ਨੇ ਬੈਂਕ ਤੋਂ ਕਰਜ਼ਾ ਲੈ ਕੇ ਇੱਕ ਛੋਟੀ ਦੁਕਾਨ ਖੋਲ੍ਹੀ। ਪਹਿਲੇ ਸਾਲ ਉਸਨੂੰ ਬਹੁਤਾ ਮੁਨਾਫ਼ਾ ਨਹੀਂ ਹੋਇਆ। ਪਰ ਉਸਨੇ ਮਿਹਨਤ ਕੀਤੀ, ਅਤੇ ਹੁਣ ਉਸਦਾ ਕਾਰੋਬਾਰ ਵਧੀਆ ਚੱਲ ਰਿਹਾ ਹੈ।',
        or: 'ମୋ ବଡ଼ ଭାଇ ବ୍ୟାଙ୍କରୁ ଋଣ ନେଇ ଗୋଟିଏ ଛୋଟ ଦୋକାନ ଖୋଲିଲେ। ପ୍ରଥମ ବର୍ଷ ତାଙ୍କୁ ବେଶି ଲାଭ ମିଳିଲା ନାହିଁ। କିନ୍ତୁ ସେ କଠିନ ପରିଶ୍ରମ କଲେ, ଆଉ ଏବେ ତାଙ୍କ ବ୍ୟବସାୟ ଭଲରେ ଚାଲିଛି।',
        ur: 'میرے بڑے بھائی نے بینک سے قرض لے کر ایک چھوٹی دکان کھولی۔ پہلے سال اسے زیادہ منافع نہیں ہوا۔ لیکن اس نے محنت سے کام کیا، اور اب اس کا کاروبار اچھا چل رہا ہے۔',
        es: 'Mi hermano mayor pidió un préstamo al banco y abrió una pequeña tienda. El primer año no tuvo muchas ganancias. Pero trabajó duro, y ahora su negocio va bien.',
        fr: 'Mon grand frère a pris un prêt à la banque et a ouvert une petite boutique. La première année, il n’a pas fait beaucoup de bénéfices. Mais il a travaillé dur, et maintenant son commerce marche bien.',
        de: 'Mein älterer Bruder hat einen Kredit bei der Bank aufgenommen und einen kleinen Laden eröffnet. Im ersten Jahr machte er nicht viel Gewinn. Aber er hat hart gearbeitet, und jetzt läuft sein Geschäft gut.',
        pt: 'Meu irmão mais velho pegou um empréstimo no banco e abriu uma pequena loja. No primeiro ano, ele não teve muito lucro. Mas trabalhou muito, e agora o negócio dele vai bem.',
        ru: 'Мой старший брат взял кредит в банке и открыл небольшой магазин. В первый год он получил немного прибыли. Но он много работал, и теперь его дело идёт хорошо.',
        ar: 'أخذ أخي الأكبر قرضًا من البنك وفتح متجرًا صغيرًا. في السنة الأولى لم يحقق ربحًا كبيرًا. لكنه عمل بجد، والآن تجارته ناجحة.',
        zh: '我哥哥从银行贷了款，开了一家小店。第一年他没赚到多少利润。但是他努力工作，现在他的生意很好。',
        ja: '兄は銀行からお金を借りて、小さな店を開きました。最初の年はあまり利益が出ませんでした。でも一生懸命働いて、今では商売がうまくいっています。',
        ko: '우리 형은 은행에서 대출을 받아 작은 가게를 열었어요. 첫해에는 이익이 많지 않았어요. 하지만 형은 열심히 일했고, 지금은 장사가 잘 되고 있어요.'
    },
    q1: { hi: 'बचत करना एक अच्छी आदत है।', ta: 'சேமிப்பது ஒரு நல்ல பழக்கம்.', te: 'పొదుపు చేయడం మంచి అలవాటు.', ml: 'സമ്പാദിക്കുന്നത് ഒരു നല്ല ശീലമാണ്.', mr: 'बचत करणे ही चांगली सवय आहे.', bn: 'সঞ্চয় করা একটা ভালো অভ্যাস।', gu: 'બચત કરવી એ સારી ટેવ છે.', pa: 'ਬੱਚਤ ਕਰਨਾ ਇੱਕ ਚੰਗੀ ਆਦਤ ਹੈ।', or: 'ସଞ୍ଚୟ କରିବା ଏକ ଭଲ ଅଭ୍ୟାସ।', ur: 'بچت کرنا ایک اچھی عادت ہے۔', es: 'Ahorrar es un buen hábito.', fr: 'Économiser est une bonne habitude.', de: 'Sparen ist eine gute Gewohnheit.', pt: 'Poupar é um bom hábito.', ru: 'Копить деньги — хорошая привычка.', ar: 'الادخار عادة جيدة.', zh: '存钱是个好习惯。', ja: '貯金するのはよい習慣です。', ko: '저축하는 것은 좋은 습관이에요.' },
    q2: { hi: 'हमारा सबसे बड़ा खर्च घर का किराया है।', ta: 'எங்கள் மிகப் பெரிய செலவு வீட்டு வாடகை.', te: 'మా అతి పెద్ద ఖర్చు ఇంటి అద్దె.', ml: 'ഞങ്ങളുടെ ഏറ്റവും വലിയ ചെലവ് വീട്ടുവാടകയാണ്.', mr: 'आमचा सर्वात मोठा खर्च घरभाडे आहे.', bn: 'আমাদের সবচেয়ে বড় খরচ বাড়িভাড়া।', gu: 'અમારો સૌથી મોટો ખર્ચ ઘરનું ભાડું છે.', pa: 'ਸਾਡਾ ਸਭ ਤੋਂ ਵੱਡਾ ਖ਼ਰਚ ਘਰ ਦਾ ਕਿਰਾਇਆ ਹੈ।', or: 'ଆମର ସବୁଠାରୁ ବଡ଼ ଖର୍ଚ୍ଚ ଘର ଭଡ଼ା।', ur: 'ہمارا سب سے بڑا خرچ گھر کا کرایہ ہے۔', es: 'Nuestro mayor gasto es el alquiler de la casa.', fr: 'Notre plus grosse dépense, c’est le loyer de la maison.', de: 'Unsere größte Ausgabe ist die Miete.', pt: 'Nossa maior despesa é o aluguel da casa.', ru: 'Наш самый большой расход — аренда квартиры.', ar: 'أكبر نفقاتنا هي إيجار البيت.', zh: '我们最大的开支是房租。', ja: '私たちの一番大きな出費は家賃です。', ko: '우리의 가장 큰 지출은 집세예요.' },
    q3: { hi: 'कर्ज़ समय पर चुकाइए।', ta: 'கடனைச் சரியான நேரத்தில் திருப்பிச் செலுத்துங்கள்.', te: 'అప్పును సమయానికి తీర్చండి.', ml: 'വായ്പ കൃത്യസമയത്ത് തിരിച്ചടയ്ക്കുക.', mr: 'कर्ज वेळेवर फेडा.', bn: 'ঋণ সময়মতো শোধ করুন।', gu: 'ધિરાણ સમયસર ચૂકવો.', pa: 'ਕਰਜ਼ਾ ਸਮੇਂ ਸਿਰ ਮੋੜੋ।', or: 'ଋଣ ଠିକ୍ ସମୟରେ ପରିଶୋଧ କରନ୍ତୁ।', ur: 'قرض وقت پر ادا کیجیے۔', es: 'Paga el préstamo a tiempo.', fr: 'Rembourse le prêt à temps.', de: 'Zahl den Kredit pünktlich zurück.', pt: 'Pague o empréstimo em dia.', ru: 'Возвращайте кредит вовремя.', ar: 'سدّد القرض في موعده.', zh: '按时还贷款。', ja: 'ローンは期限どおりに返してください。', ko: '대출은 제때 갚으세요.' },
    q4: { hi: 'कंपनी ने इस साल अच्छा मुनाफ़ा कमाया।', ta: 'நிறுவனம் இந்த ஆண்டு நல்ல இலாபம் ஈட்டியது.', te: 'కంపెనీ ఈ సంవత్సరం మంచి లాభం సంపాదించింది.', ml: 'കമ്പനി ഈ വർഷം നല്ല ലാഭം നേടി.', mr: 'कंपनीने या वर्षी चांगला नफा मिळवला.', bn: 'কোম্পানি এ বছর ভালো লাভ করেছে।', gu: 'કંપનીએ આ વર્ષે સારો નફો કર્યો.', pa: 'ਕੰਪਨੀ ਨੇ ਇਸ ਸਾਲ ਚੰਗਾ ਮੁਨਾਫ਼ਾ ਕਮਾਇਆ।', or: 'କମ୍ପାନୀ ଏ ବର୍ଷ ଭଲ ଲାଭ କଲା।', ur: 'کمپنی نے اس سال اچھا منافع کمایا۔', es: 'La empresa obtuvo buenas ganancias este año.', fr: 'L’entreprise a fait un bon bénéfice cette année.', de: 'Die Firma hat dieses Jahr einen guten Gewinn gemacht.', pt: 'A empresa teve um bom lucro este ano.', ru: 'В этом году компания получила хорошую прибыль.', ar: 'حققت الشركة ربحًا جيدًا هذا العام.', zh: '公司今年赚了不少利润。', ja: '会社は今年よい利益を上げました。', ko: '회사는 올해 좋은 이익을 냈어요.' }
};

// The questions and tasks in Kannada (content/asks/kn.js), for a Kannada speaker learning English.
const ENGLISH = 'ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ';
const asks = {
    questions: {
        'grammar-advanced-3': { q3: 'ಯಾವುದು ಸರಿ?' },
        'reading-advanced-3': {
            q1: 'ರಿಯಾಳ ಮೊದಲ ತಿಂಗಳ ಕೊನೆಯಲ್ಲಿ ಏನಾಯಿತು?',
            q2: 'ರಿಯಾಗೆ ಯಾರು ಸಲಹೆ ನೀಡಿದರು?',
            q3: 'ಆ ನಿಯಮದ ಪ್ರಕಾರ ಅವಳು ತನ್ನ ಆದಾಯದಲ್ಲಿ ಎಷ್ಟು ಉಳಿಸಬೇಕು?',
            q4: 'ತುಂಬಾ ಹೆಚ್ಚಿನ ಆದಾಯ ಕೊಡುತ್ತೇವೆ ಎನ್ನುವ ಹೂಡಿಕೆಗಳ ಬಗ್ಗೆ ಅವಳ ಚಿಕ್ಕಪ್ಪ ಏನು ಹೇಳಿದರು?',
            q5: '"It gives you more of it" ಎನ್ನುವಾಗ ರಿಯಾಳ ಅರ್ಥವೇನು?'
        },
        'speaking-advanced-3': {
            q1: 'ಆಯೇಷಾ ಬ್ಯಾಂಕಿಗೆ ಏಕೆ ಬಂದಿದ್ದಾಳೆ?',
            q2: 'ಅವಳಿಗೆ ಎಷ್ಟು ಹಣ ಬೇಕು?',
            q3: 'ಬ್ಯಾಂಕ್ ಯಾವ ದಾಖಲೆಯನ್ನು ಕೇಳುವುದಿಲ್ಲ?',
            q4: 'ಅವಳು ಸಾಲವನ್ನು ಯಾವಾಗ ತೀರಿಸಲು ಪ್ರಾರಂಭಿಸಬಹುದು?',
            q5: 'ಅವಳು ಸಾಲವನ್ನು ಬೇಗ ತೀರಿಸಿದರೆ ಏನಾಗುತ್ತದೆ?'
        }
    },
    writing: {
        'reading-advanced-3': {
            w3: `"budget" ಮತ್ತು "save" ಪದಗಳನ್ನು ಬಳಸಿ ${ENGLISH} ಒಂದು ವಾಕ್ಯ ಬರೆಯಿರಿ.`,
            w4: `ಯುವಜನರು ಹಣವನ್ನು ನಿರ್ವಹಿಸಲು ಏಕೆ ಕಲಿಯಬೇಕು ಎಂಬುದರ ಬಗ್ಗೆ ${ENGLISH} ಒಂದು ಚಿಕ್ಕ ಪ್ಯಾರಾಗ್ರಾಫ್ (6 ರಿಂದ 8 ವಾಕ್ಯಗಳು) ಬರೆಯಿರಿ. ಕನಿಷ್ಠ ಒಂದು "if" ವಾಕ್ಯವನ್ನು ಬಳಸಿ.`
        }
    },
    speaking: {
        'speaking-advanced-3': {
            prompt: `ನೀವು ಉಳಿತಾಯ ಖಾತೆ ತೆರೆಯಲು ಅಥವಾ ಸಾಲದ ಬಗ್ಗೆ ಕೇಳಲು ಬಯಸುತ್ತೀರಿ. ${ENGLISH} 6 ರಿಂದ 8 ವಾಕ್ಯಗಳಲ್ಲಿ ಬ್ಯಾಂಕ್ ಅಧಿಕಾರಿಯನ್ನು ವಂದಿಸಿ, ನಿಮಗೆ ಏನು ಬೇಕು ಎಂದು ವಿವರಿಸಿ, ಎರಡು ವಿಷಯಗಳ ಬಗ್ಗೆ ಕೇಳಿ (ಬಡ್ಡಿ ಅಥವಾ ದಾಖಲೆಗಳು), ಒಂದು "if" ಪ್ರಶ್ನೆ ಬಳಸಿ, ಮತ್ತು ವಿನಯದಿಂದ ಮುಗಿಸಿ.`,
            checklist: ['ಅಧಿಕಾರಿಯನ್ನು ವಂದಿಸಿ ನನಗೆ ಏನು ಬೇಕು ಎಂದು ವಿವರಿಸಿದೆ', 'ಕನಿಷ್ಠ ಎರಡು ವಿಷಯಗಳ ಬಗ್ಗೆ ಕೇಳಿದೆ', '"if" ಪ್ರಶ್ನೆಯನ್ನು ಸರಿಯಾಗಿ ಬಳಸಿದೆ', '"I would like", "Could you" ಮುಂತಾದ ವಿನಯದ ರೂಪಗಳನ್ನು ಬಳಸಿದೆ', 'ಮಾತುಕತೆಯನ್ನು ವಿನಯದಿಂದ ಮುಗಿಸಿದೆ', 'ಸ್ಪಷ್ಟವಾಗಿ, ಒಂದೇ ವೇಗದಲ್ಲಿ ಮಾತನಾಡಿದೆ']
        }
    }
};

module.exports = {
    lessons,
    names: { 'vocab-advanced-3': ['Spending and saving', 'Risk and reward'] },
    tipsFrom: { 'translation-advanced-3': 'translation-advanced-kn-en' },
    words: { 'vocab-advanced-3': words },
    sentences: { 'translation-advanced-3': sentences },
    asks
};
