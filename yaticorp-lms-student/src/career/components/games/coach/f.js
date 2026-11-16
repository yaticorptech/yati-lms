/** How-to-play steps, tips and card lines for group F (Master Minds). */
export const COACH = {
  'spatial-rotation-vault': {
    steps: [
      'Study the block figure and the gold-marked cells before it is hidden.',
      'Pick the candidate that is the same figure turned — flipped copies and altered shapes are traps.',
      'Tap the cells on the turned figure where the marks went, then lock in.'
    ],
    tip: 'Anchor on a distinctive feature, like an arm of three, and track which way it points after the turn.'
  },
  'interference-recall': {
    steps: [
      'Memorise list A, one word at a time.',
      'A second list of similar words follows, then a few quick sums to clear your head.',
      'Tap only the words from list A — every look-alike or new word you tap costs a point.'
    ],
    tip: 'Link list A words into a little story; list B words will then feel like strangers.'
  },
  'cipher-lab': {
    steps: [
      'Each level holds three ciphers: substitution, Vigenère and column transposition.',
      'Use the tools — letter frequencies, the key panel, the column strips — and watch the message decode live.',
      'It is solved the moment the decryption reads as the true message — each cipher you break is worth 3 points.'
    ],
    tip: 'In English E, T, A and O are the commonest letters, and THE is the commonest word — start there.'
  },
  'boolean-breaker': {
    steps: [
      'Read the circuit left to right: switches feed gates, the last gate drives the lamp.',
      'Light the lamp in few tests, fill the truth table, or name the hidden gate.',
      'Work out each gate on paper-in-your-head before you commit.'
    ],
    tip: 'AND needs both, OR needs either, XOR needs exactly one, NAND is AND inverted, NOT flips.'
  }
};

export const BLURB = {
  'spatial-rotation-vault': 'Recall a marked block figure, find it turned among mirror decoys, and place its marks.',
  'interference-recall': 'Hold one word list while a look-alike list tries to overwrite it.',
  'cipher-lab': 'Break substitution, Vigenère and transposition ciphers with real cryptanalysis tools.',
  'boolean-breaker': 'Reason through AND, OR, NOT, XOR and NAND circuits to light the lamp.'
};
