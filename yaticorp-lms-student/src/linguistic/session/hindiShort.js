/**
 * Short Hindi sentences for "Say this sentence" (2026-11-17, the user: in Hindi, a Shuffle button that changes the
 * sentence, and every sentence as small as "मैं विद्यार्थी हूँ।"). Two to four everyday words each.
 */
export const HINDI_SHORT = [
  'मैं विद्यार्थी हूँ।', 'यह मेरा घर है।', 'आज मौसम अच्छा है।', 'मुझे पानी चाहिए।', 'वह मेरा दोस्त है।',
  'मैं स्कूल जाता हूँ।', 'यह किताब नई है।', 'मुझे आम पसंद है।', 'माँ खाना बनाती है।', 'हम खेल रहे हैं।',
  'बाहर बारिश हो रही है।', 'मेरा नाम राहुल है।', 'आप कैसे हैं?', 'मैं ठीक हूँ।', 'धन्यवाद, दोस्त।',
  'यह बहुत सुंदर है।', 'चाय गरम है।', 'बिल्ली सो रही है।', 'मैं पढ़ रहा हूँ।', 'दरवाज़ा बंद करो।',
  'सूरज निकल आया।', 'मुझे भूख लगी है।', 'पापा ऑफिस गए।', 'कल छुट्टी है।', 'मैं खुश हूँ।',
  'पेड़ हरा है।', 'बस आ गई।', 'हमें देर हो गई।', 'यह मेरी कलम है।', 'चलो बाज़ार चलें।',
  'मेरा भाई छोटा है।', 'फूल लाल है।', 'मैं गाना गाती हूँ।', 'खिड़की खोलो।', 'आज सोमवार है।'
];

/** Whether a Hindi sentence is short enough (four words at most). */
export const isShortHindi = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length <= 4;

/** Another short sentence, never the one showing. */
export const nextHindi = (current) => {
  const pool = HINDI_SHORT.filter((s) => s !== current);
  return pool[Math.floor(Math.random() * pool.length)];
};
