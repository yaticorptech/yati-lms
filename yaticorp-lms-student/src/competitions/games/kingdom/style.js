/** What The Lost Kingdom's screens share: sizes that follow the screen's width, its lettering, its dark panel, the symbols' names. */
export const fs = (min, cqw, max) => `clamp(${min}px, ${cqw}cqw, ${max}px)`;
export const serif = { fontFamily: 'Cinzel, "EB Garamond", Georgia, serif' };
export const darkPanel = 'border border-[#c9a45a]/50 bg-gradient-to-b from-[#16120c]/95 to-[#0b0905]/95 text-[#f3e6c8] shadow-[0_10px_30px_rgba(0,0,0,.6),inset_0_0_0_1px_rgba(201,164,90,.15)]';
export const SYMBOL_NAMES = { sun: 'Sun', leaf: 'Leaf', moon: 'Moon', bird: 'Bird', key: 'Key' };
