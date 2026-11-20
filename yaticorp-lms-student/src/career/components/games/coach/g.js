/** How-to-play steps, tips and card lines for group G (Master Minds, verbal). */
export const COACH = {
  'semantic-precision': {
    steps: [
      'Read the sentence and find the vague, highlighted word.',
      'Drag the most precise word from the shelf onto it — or tap the word, then the gap.',
      'At higher levels, pick the words in the sentence that make your choice the precise one.'
    ],
    tip: 'Near-synonyms differ in degree, intent or exact sense: ask what the rest of the sentence proves.'
  },
  'argument-analyzer': {
    steps: [
      'Read the argument and find its conclusion first — the claim everything else supports.',
      'Tap each line to tag it: premise, conclusion, assumption needed, or irrelevant.',
      'Pick the added statement that would most weaken (or strengthen) the argument.'
    ],
    tip: 'The best weakener attacks the hidden assumption — often another cause, an unfair sample, or a false comparison.'
  },
  'verbal-architect': {
    steps: [
      'Find the opening: the sentence that introduces the topic and refers back to nothing.',
      'Drag the other sentences into place, or use the arrows to move them.',
      'Check the order — green sentences are in place; fix the rest before your last check.'
    ],
    tip: 'Words like "however", "this", "these" and "then" always need something before them.'
  },
  'nuance-navigator': {
    steps: [
      'Read what the scale measures: intensity, connotation or register.',
      'Drag each word onto its slot, from weakest to strongest, positive to negative, or informal to formal.',
      'Check the scale and study any word that landed in the wrong slot.'
    ],
    tip: 'Place the two extremes first; the middle words are easier to judge against them.'
  },
  'word-relation-matrix': {
    steps: [
      'Read the column headings and one full row to see the relation.',
      'Drag pool words into the blank cells so every row and column holds.',
      'Check: right cells lock in green; fix the red ones for a second check.'
    ],
    tip: 'Fill the cells you are sure of first — every word you place narrows the choices for the rest.'
  }
};

export const BLURB = {
  'semantic-precision': 'Swap the vague word for the precise one — and say why.',
  'argument-analyzer': 'Tag premises and conclusions, then find the weak point.',
  'verbal-architect': 'Rebuild a jumbled paragraph into a logical whole.',
  'nuance-navigator': 'Place words on scales of intensity, connotation and register.',
  'word-relation-matrix': 'Complete a grid where every row and column relation holds.'
};
