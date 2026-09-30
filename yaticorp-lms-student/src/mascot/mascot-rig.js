/* Mascot rig — layered SVG character, poses, expressions, animations.
   Coordinate space matches the original artwork (1117 x 1408).

   From the mascot kit (export/react/mascot-rig.js). The one change: the kit
   hands its API to `window.MascotRig` (and to CommonJS); here it is this
   module's default export, so Vite bundles it like any other import and no
   global is written. The body is untouched, so a newer kit drops in the same
   way. */
/* eslint-disable no-unused-vars -- the kit's body as shipped: a few helpers take or destructure values they never read */
const MascotRig = (function (root) {
  const W = 1117, H = 1408;
  const NAVY = '#0E2340', MOUTH = '#B4303C', TONGUE = '#F2636E', BLUSH = '#F7A9BB';
  const f = n => Math.round(n * 100) / 100;

  // ---------- RASTER MODE (pixel-identical parts cut from the original PNG) ----------
  let RASTER = null, MODE = 'auto'; // 'auto' -> raster when a manifest is available
  function setRaster(cfg) { RASTER = cfg; }
  function rasterActive() { if (!RASTER && root.MASCOT_RASTER) RASTER = { base: root.MASCOT_RASTER.base || '', parts: root.MASCOT_RASTER.parts }; return !!RASTER && MODE !== 'vector'; }
  function img(name, extra = '') { const p = RASTER.parts[name]; const href = (RASTER.embed && RASTER.embed[name]) || (RASTER.base + p.file); return `<image href="${href}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" data-part="${name}"${extra}/>`; }
  const MIRROR = ' transform="translate(1212 0) scale(-1 1)"';
  // a = arm image, m = mirrored, r = base rotation about the shoulder pivot, wrist in the image's own (pre-rotation) coords
  const RARMS = {
    L: { raised: { a: 'arm-left', m: false, wrist: [262, 790], r: 0 }, down: { a: 'arm-left-down', m: false, wrist: [322, 940], r: 0 },
         out: { a: 'arm-left-down', m: false, wrist: [322, 940], r: 50 }, up: { a: 'arm-left-down', m: false, wrist: [322, 940], r: 52 },
         clap: { a: 'arm-left-down', m: false, wrist: [322, 940], r: -46 }, chin: { a: 'arm-left', m: false, wrist: [262, 790], r: 0 } },
    R: { down: { a: 'arm-right', m: false, wrist: [890, 940], r: 0 }, raised: { a: 'arm-left', m: true, wrist: [950, 790], r: 0 },
         out: { a: 'arm-right', m: false, wrist: [890, 940], r: -50 }, up: { a: 'arm-right', m: false, wrist: [890, 940], r: -52 },
         clap: { a: 'arm-right', m: false, wrist: [890, 940], r: 46 } }
  };
  // native wrist of each hand image (after optional mirroring)
  const RHANDS = { L: { point: { img: 'hand-left', m: false, wrist: [262, 790] }, fist: { img: 'hand-right', m: true, wrist: [322, 940] } },
                   R: { point: { img: 'hand-left', m: true, wrist: [950, 790] }, fist: { img: 'hand-right', m: false, wrist: [890, 940] } } };
  function armRaster(side, variant, handVariant) {
    const a = RARMS[side][variant] || RARMS[side].down;
    const id = side === 'L' ? 'arm-left' : 'arm-right', hid = side === 'L' ? 'hand-left' : 'hand-right';
    const [wx, wy] = a.wrist;
    let hand;
    if (handVariant === 'open') { const sg = side === 'L' ? 1 : -1; hand = handOpen(wx - sg * 27, wy - 53, side, hid); }
    else { const h = RHANDS[side][handVariant] || RHANDS[side].fist; hand = `<g transform="translate(${wx - h.wrist[0]} ${wy - h.wrist[1]})">${img(h.img, h.m ? MIRROR : '')}</g>`; }
    // rotate(-r) keeps pose hand angles absolute (same numbers as the vector rig)
    hand = `<g transform="rotate(${-a.r} ${wx} ${wy})">${hand}</g>`;
    return { id, hid, wrist: a.wrist, baseR: a.r, markup: img(a.a, a.m ? MIRROR : ''), hand };
  }

  const DEFS = `
<linearGradient id="gB" gradientUnits="userSpaceOnUse" x1="250" y1="80" x2="950" y2="1380"><stop offset="0" stop-color="#3FAAFF"/><stop offset=".5" stop-color="#1E8FFF"/><stop offset="1" stop-color="#1180F5"/></linearGradient>
<radialGradient id="gSpec"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".35" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="gBlush"><stop offset="0" stop-color="#F9A6B8"/><stop offset=".7" stop-color="#F9A6B8" stop-opacity=".95"/><stop offset="1" stop-color="#F9A6B8" stop-opacity="0"/></radialGradient>
<radialGradient id="gFace" cx=".5" cy=".45" r=".62"><stop offset=".72" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E4EDF7"/></radialGradient>
<radialGradient id="gEye" cx=".42" cy=".35" r=".85"><stop offset="0" stop-color="#1B3B60"/><stop offset="1" stop-color="#07182D"/></radialGradient>
<radialGradient id="gHL"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="gSH"><stop offset="0" stop-color="#04357F" stop-opacity="1"/><stop offset=".55" stop-color="#04357F" stop-opacity=".55"/><stop offset="1" stop-color="#04357F" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="softS" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6"/></filter>
<mask id="mRing"><rect width="${W}" height="${H}" fill="#fff"/><polygon points="736,68 838,124 794,264 706,224" fill="#000"/><polygon points="450,580 550,600 494,752 398,752" fill="#000"/></mask>`;

  // geometry uses %P (fill paint) / %S (stroke paint) tokens
  const hl = (cx, cy, rx, ry, o = .35, rot = 0, small) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#gHL)" opacity="${o}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
  const sp = (cx, cy, rx, ry, o = .7, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#gSpec)" opacity="${o}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
  const sh = (cx, cy, rx, ry, o = .3, rot = 0, small) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#gSH)" opacity="${o}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
  const tube = (d, w) => `<path d="${d}" fill="none" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" %S/>`;

  // part(id, geometry[], shading, wrapAttr) -> masked shaded shape
  function part(id, geo, shade, wrap) {
    const g = geo.join('');
    const paint = s => s.replace(/%P/g, `fill="url(#gB)"`).replace(/%S/g, `stroke="url(#gB)"`);
    const white = s => s.replace(/%P/g, `fill="#fff"`).replace(/%S/g, `stroke="#fff"`);
    return `<g${wrap ? ' ' + wrap : ''}><mask id="m_${id}">${white(g)}</mask>${paint(g)}<g mask="url(#m_${id})">${shade}</g></g>`;
  }

  // ---------- HANDS ----------
  function handFist(cx, cy, side, id) {
    const s = side === 'L' ? 1 : -1; // bumps face the body
    return part(id, [
      `<circle cx="${cx}" cy="${cy}" r="80" %P/>`,
      `<circle cx="${cx + s * 58}" cy="${cy - 30}" r="25" %P/>`,
      `<circle cx="${cx + s * 54}" cy="${cy + 12}" r="22" %P/>`
    ], hl(cx - 24, cy - 30, 40, 32, .45) + sp(cx - 26, cy - 34, 18, 13, .75) + sh(cx + 12, cy + 48, 60, 28, .38) + sh(cx + 55, cy, 18, 40, .2));
  }
  function handPoint(cx, cy, side, id) {
    const s = side === 'L' ? 1 : -1; // L: finger leans outward (screen-left)
    return part(id, [
      tube(`M${cx - s * 8},${cy - 22} L${cx - s * 44},${cy - 175}`, 62),
      `<circle cx="${cx}" cy="${cy}" r="84" %P/>`,
      `<circle cx="${cx + s * 48}" cy="${cy - 60}" r="27" %P/>`,
      `<circle cx="${cx + s * 40}" cy="${cy + 8}" r="18" %P/>`
    ], hl(cx - 28, cy - 32, 42, 34, .45) + sp(cx - 30, cy - 38, 18, 13, .75) + hl(cx - s * 30, cy - 110, 16, 56, .45) + sp(cx - s * 32, cy - 140, 7, 22, .7) + sh(cx + 12, cy + 52, 62, 28, .38) + sh(cx - s * 8, cy - 100, 10, 50, .25));
  }
  function handOpen(cx, cy, side, id) {
    const s = side === 'L' ? 1 : -1;
    const fingers = [-28, -9, 9, 28].map(a => {
      const r = a * Math.PI / 180, L = 100;
      return tube(`M${f(cx - 4 * s + Math.sin(r) * 20)},${cy - 20} L${f(cx - 4 * s + Math.sin(r) * L)},${f(cy - 20 - Math.cos(r) * L)}`, 34);
    }).join('');
    return part(id, [
      fingers,
      tube(`M${cx + s * 30},${cy - 10} L${cx + s * 78},${cy - 50}`, 34),
      `<circle cx="${cx}" cy="${cy}" r="68" %P/>`
    ], hl(cx - 20, cy - 22, 36, 30, .45) + sp(cx - 22, cy - 26, 14, 10, .7) + sh(cx + 8, cy + 44, 52, 24, .35));
  }
  const HANDS = { fist: handFist, point: handPoint, open: handOpen };

  // ---------- ARMS (path, wrist, hand centre) ----------
  const ARMS = {
    L: {
      raised: { d: 'M470,838 C400,868 330,905 292,860 C270,835 255,805 242,778', wrist: [242, 778], hand: [215, 725] },
      down:   { d: 'M470,838 C377,846 307,890 334,950', wrist: [334, 950], hand: [362, 998] },
      out:    { d: 'M470,838 C420,840 320,834 240,830', wrist: [240, 830], hand: [190, 830] },
      up:     { d: 'M470,838 C400,826 250,760 180,650', wrist: [180, 650], hand: [162, 598] },
      clap:   { d: 'M470,838 C440,884 480,905 545,890', wrist: [545, 890], hand: [575, 885] },
      chin:   { d: 'M478,830 C420,860 395,760 440,700', wrist: [440, 700], hand: [462, 655] }
    },
    R: {
      down:   { d: 'M742,835 C835,846 905,890 878,950', wrist: [878, 950], hand: [850, 998] },
      raised: { d: 'M742,835 C812,868 882,905 920,860 C942,835 957,805 970,778', wrist: [970, 778], hand: [997, 725] },
      out:    { d: 'M742,835 C793,840 893,834 973,830', wrist: [973, 825], hand: [1023, 825] },
      up:     { d: 'M742,835 C813,826 950,770 1010,660', wrist: [1010, 660], hand: [1030, 610] },
      clap:   { d: 'M742,835 C773,884 733,905 668,890', wrist: [668, 890], hand: [638, 885] }
    }
  };
  function arm(side, variant, handVariant) {
    const a = ARMS[side][variant] || ARMS[side].down;
    const id = side === 'L' ? 'arm-left' : 'arm-right', hid = side === 'L' ? 'hand-left' : 'hand-right';
    const [hx, hy] = a.hand, [wx, wy] = a.wrist;
    const shade = `<path d="${a.d}" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round" opacity=".38" filter="url(#soft)" transform="translate(-12,-18)"/>` +
      `<path d="${a.d}" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".55" filter="url(#softS)" transform="translate(-16,-26)"/>` +
      `<path d="${a.d}" fill="none" stroke="#04357F" stroke-width="34" stroke-linecap="round" opacity=".32" filter="url(#soft)" transform="translate(12,22)"/>`;
    return { id, hid, wrist: a.wrist, markup: part(id, [tube(a.d, 118)], shade), hand: (HANDS[handVariant] || handFist)(hx, hy, side, hid) };
  }

  // ---------- FACE VARIANTS ----------
  const eyeOpen = (cx, cy) => `<ellipse cx="${cx}" cy="${cy}" rx="44" ry="56" fill="url(#gEye)"/><ellipse cx="${cx + 5}" cy="${cy + 28}" rx="24" ry="15" fill="#2F7FC2" opacity=".8"/><ellipse cx="${cx + 6}" cy="${cy + 35}" rx="13" ry="6" fill="#6DB8F0" opacity=".5"/><circle cx="${cx - 13}" cy="${cy - 26}" r="12" fill="#fff"/><circle cx="${cx + 16}" cy="${cy + 20}" r="5" fill="#fff" opacity=".85"/>`;
  const EYES = {
    open: (cx, cy) => eyeOpen(cx, cy),
    wide: (cx, cy) => `<g transform="translate(${cx} ${cy}) scale(1.14) translate(${-cx} ${-cy})">${eyeOpen(cx, cy)}</g>`,
    half: (cx, cy) => eyeOpen(cx, cy) + `<ellipse cx="${cx}" cy="${cy - 40}" rx="52" ry="58" fill="#FDFEFF"/><path d="M${cx - 44},${cy + 6} Q${cx},${cy + 26} ${cx + 44},${cy + 6}" fill="none" stroke="${NAVY}" stroke-width="10" stroke-linecap="round"/>`,
    closed: (cx, cy) => `<path d="M${cx - 42},${cy - 2} Q${cx},${cy + 30} ${cx + 42},${cy - 2}" fill="none" stroke="${NAVY}" stroke-width="13" stroke-linecap="round"/>`,
    happy: (cx, cy) => `<path d="M${cx - 42},${cy + 12} Q${cx},${cy - 34} ${cx + 42},${cy + 12}" fill="none" stroke="${NAVY}" stroke-width="13" stroke-linecap="round"/>`
  };
  const brow = d => `<path d="${d}" fill="none" stroke="${NAVY}" stroke-width="15" stroke-linecap="round"/>`;
  const BROWS = {
    default:  { L: 'M430,352 Q462,316 502,326', R: 'M688,330 Q724,300 760,320' },
    raised:   { L: 'M428,330 Q462,292 504,304', R: 'M686,308 Q724,276 762,298' },
    curious:  { L: 'M430,352 Q462,322 502,332', R: 'M684,300 Q722,262 764,286' },
    thinking: { L: 'M428,336 Q470,322 506,346', R: 'M684,350 Q722,320 762,326' },
    low:      { L: 'M430,366 Q462,346 502,352', R: 'M688,352 Q724,332 760,346' }
  };
  const mouthOpen = (d, tx, ty, trx, try_, id) => `<clipPath id="cm_${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${MOUTH}"/><g clip-path="url(#cm_${id})"><ellipse cx="${tx}" cy="${ty}" rx="${trx}" ry="${try_}" fill="${TONGUE}"/><ellipse cx="${tx - 8}" cy="${ty - 4}" rx="${trx * .5}" ry="${try_ * .35}" fill="#F98F97" opacity=".8"/></g>`;
  const MOUTHS = {
    openSmile: () => mouthOpen('M526,450 Q606,476 686,446 C688,532 650,562 606,562 C562,562 524,532 526,450 Z', 608, 546, 56, 32, 'a'),
    grin:      () => mouthOpen('M510,447 Q606,468 702,441 C696,548 655,580 606,582 C556,580 516,548 510,447 Z', 606, 562, 62, 34, 'b'),
    smile:     () => `<path d="M552,472 Q606,522 660,472" fill="none" stroke="${MOUTH}" stroke-width="13" stroke-linecap="round"/>`,
    soft:      () => `<path d="M560,474 Q606,506 652,474" fill="none" stroke="${MOUTH}" stroke-width="12" stroke-linecap="round"/>`,
    o:         () => `<ellipse cx="606" cy="502" rx="20" ry="25" fill="${MOUTH}"/><ellipse cx="606" cy="514" rx="12" ry="9" fill="${TONGUE}"/>`,
    sleepyO:   () => `<ellipse cx="606" cy="506" rx="15" ry="19" fill="${MOUTH}"/>`,
    hmm:       () => `<path d="M572,502 Q606,488 640,504" fill="none" stroke="${NAVY}" stroke-width="12" stroke-linecap="round"/>`
  };
  const blushM = (o = .95, k = 1) => `<ellipse cx="440" cy="517" rx="${42 * k}" ry="${23 * k}" fill="url(#gBlush)" opacity="${o}"/><ellipse cx="782" cy="495" rx="${42 * k}" ry="${23 * k}" fill="url(#gBlush)" opacity="${o}"/>`;

  // ---------- STATIC PARTS ----------
  const RING = () => rasterActive() ? img('head-ring') : part('head-ring', [
    `<path d="M605,65 A392,335 0 1 0 605,735 A392,335 0 1 0 605,65 Z M610,203 A250,212 0 1 1 610,627 A250,212 0 1 1 610,203 Z" fill-rule="evenodd" %P/>`
  ], hl(400, 175, 200, 66, .3, -28) + sp(400, 150, 110, 18, .4, -30) + hl(940, 420, 40, 150, .28) + sp(958, 400, 10, 80, .35) + hl(300, 520, 44, 130, .22, 20) + sh(640, 700, 270, 44, .45) + sh(880, 640, 130, 76, .34, -40) + sh(280, 300, 36, 140, .22, 30) + hl(560, 690, 130, 24, .28), 'mask="url(#mRing)"');
  const FACE = () => rasterActive() ? `<g id="face">${img('face')}</g>` : `<ellipse id="face" cx="610" cy="415" rx="256" ry="218" fill="url(#gFace)"/>`;
  const TORSO = () => rasterActive() ? img('torso') : part('torso', [
    `<path d="M452,832 C452,738 515,710 606,710 C697,710 762,738 762,832 L770,935 C774,985 742,1010 704,1010 C662,1000 640,986 606,988 C572,986 550,1000 508,1010 C470,1010 438,985 442,935 Z" %P/>`
  ], hl(560, 815, 80, 70, .34) + sp(548, 800, 30, 22, .5) + hl(490, 900, 26, 90, .22) + sh(606, 992, 160, 46, .38) + sh(750, 900, 34, 130, .28) + sh(470, 960, 30, 60, .18));
  const LEG = side => rasterActive() ? img(side === 'L' ? 'leg-left' : 'leg-right') : part(side === 'L' ? 'leg-left' : 'leg-right', [
    side === 'L' ? `<path d="M458,950 C458,930 598,930 598,952 L574,1242 C574,1262 436,1262 436,1242 Z" %P/>`
                 : `<path d="M620,952 C620,930 760,930 760,950 L796,1242 C796,1262 652,1262 652,1242 Z" %P/>`
  ], side === 'L' ? hl(496, 1080, 30, 120, .34) + sp(490, 1040, 10, 60, .55) + sh(574, 1100, 26, 140, .34) + sh(505, 1228, 72, 24, .34)
                  : hl(664, 1080, 30, 120, .34) + sp(658, 1040, 10, 60, .55) + sh(776, 1100, 26, 140, .34) + sh(722, 1228, 72, 24, .34));
  const FOOT = side => {
    const cx = side === 'L' ? 450 : 765;
    if (rasterActive()) return img(side === 'L' ? 'foot-left' : 'foot-right');
    return part(side === 'L' ? 'foot-left' : 'foot-right', [`<ellipse cx="${cx}" cy="1270" rx="130" ry="78" %P/>`],
      hl(cx - 10, 1232, 90, 34, .5) + sp(cx - 20, 1226, 36, 12, .6) + sh(cx, 1324, 124, 28, .38) + sh(cx + 108, 1265, 24, 54, .24));
  };
  const SHADOW = () => `<ellipse cx="610" cy="1352" rx="290" ry="26" fill="#0A3D7A" opacity=".16"/>`;
  const ZZZ = () => `<g id="zzz" font-family="Nunito, Arial Rounded MT Bold, Arial, sans-serif" font-weight="900" fill="${NAVY}"><text x="880" y="160" font-size="90">z</text><text x="960" y="90" font-size="68">z</text><text x="1020" y="40" font-size="48">z</text></g>`;

  // ---------- PIVOTS ----------
  const PIV = { root: [606, 1352], shadow: [610, 1352], head: [606, 720], eyes: [600, 420], brows: [600, 330], mouth: [606, 480], torso: [606, 1000], armL: [492, 838], armR: [720, 838], legL: [528, 975], legR: [690, 975], footL: [500, 1235], footR: [720, 1235], zzz: [900, 130] };

  // ---------- EXPRESSIONS ----------
  const EXPR = {
    neutral:    { v: { eyes: 'open', brows: 'default', mouth: 'smile', blush: 'default' }, t: {} },
    happy:      { v: { eyes: 'open', brows: 'default', mouth: 'openSmile', blush: 'default' }, t: {} },
    excited:    { v: { eyes: 'wide', brows: 'raised', mouth: 'grin', blush: 'strong' }, t: {} },
    curious:    { v: { eyes: 'open', brows: 'curious', mouth: 'o', blush: 'default' }, t: { eyes: { x: 14, y: -6 } } },
    thinking:   { v: { eyes: 'open', brows: 'thinking', mouth: 'hmm', blush: 'default' }, t: { eyes: { x: -14, y: -14 } } },
    encouraged: { v: { eyes: 'happy', brows: 'default', mouth: 'openSmile', blush: 'default' }, t: { brows: { y: -8 } } },
    sleepy:     { v: { eyes: 'half', brows: 'low', mouth: 'sleepyO', blush: 'default' }, t: {} }
  };

  // ---------- POSES (static) ----------
  const base = () => ({ armL: 'down', handL: 'fist', armR: 'down', handR: 'fist' });
  const POSES = {
    original:     { v: { ...base(), armL: 'raised', handL: 'point' }, x: 'happy', t: {} },
    idle:         { v: base(), x: 'happy', t: {} },
    pointLeft:    { v: { ...base(), armL: 'out', handL: 'point' }, x: 'happy', t: { handL: { r: -90 }, head: { r: -4 }, eyes: { x: -12 } } },
    pointRight:   { v: { ...base(), armR: 'out', handR: 'point' }, x: 'happy', t: { handR: { r: 90 }, head: { r: 4 }, eyes: { x: 12 } } },
    lookUp:       { v: base(), x: 'curious', t: { head: { r: -5, y: -8 }, eyes: { x: 0, y: -16 }, brows: { y: -14 }, mouth: { y: -6 } } },
    lookDown:     { v: base(), x: 'neutral', t: { head: { r: 4, y: 10 }, eyes: { y: 16 }, brows: { y: 10 }, mouth: { y: 6 } } },
    lookButton:   { v: { ...base(), armR: 'out', handR: 'point' }, x: 'curious', t: { handR: { r: 130 }, armR: { r: 22 }, head: { r: 6, y: 4 }, eyes: { x: 18, y: 12 }, brows: { y: 4 } } },
    greeting:     { v: { ...base(), armL: 'raised', handL: 'point' }, x: 'happy', t: { head: { r: -5 }, handL: { r: -14 } } },
    listening:    { v: base(), x: 'neutral', t: { head: { r: 9, x: 6 }, armL: { r: -4 }, armR: { r: 4 }, eyes: { x: -6, y: -4 }, brows: { y: -8 } } },
    thinkingPose: { v: { ...base(), armL: 'raised', handL: 'point' }, x: 'thinking', t: { head: { r: -6 }, handL: { r: -10 } } },
    sleeping:     { v: base(), x: 'sleepy', t: { head: { r: 12, y: 14, x: 8 }, torso: { sy: .98 }, eyes: { sy: 1 } }, extras: ['zzz'], override: { eyes: 'closed' } },
    celebrating:  { v: { ...base(), armL: 'up', armR: 'up' }, x: 'excited', t: { root: { y: -30 }, legL: { r: 8 }, legR: { r: -8 }, shadow: { sx: .9 } } },
    jumping:      { v: { ...base(), armL: 'up', armR: 'up' }, x: 'excited', t: { root: { y: -130 }, legL: { r: 16 }, legR: { r: -16 }, footL: { r: 20 }, footR: { r: -20 }, shadow: { sx: .6, o: .6 } } },
    clapping:     { v: { ...base(), armL: 'clap', armR: 'clap' }, x: 'happy', t: {}, frontRight: true },
    waving:       { v: { ...base(), armL: 'raised', handL: 'point' }, x: 'happy', t: { handL: { r: 18 } } },
    walk:         { v: base(), x: 'happy', t: {} },
    run:          { v: base(), x: 'excited', t: {} },
    breathing:    { v: base(), x: 'happy', t: {} },
    blink:        { v: base(), x: 'happy', t: {} },
    bounce:       { v: base(), x: 'happy', t: {} }
  };

  // ---------- ANIMATIONS: name -> {dur, steps, at(t)} ----------
  const S = (t, k = 1, p = 0) => Math.sin(2 * Math.PI * (t * k + p));
  const A = Math.abs, lift = x => Math.max(0, x);
  const ANIM = {
    breathing: { dur: 3.2, steps: 24, at: t => ({ torso: { sy: 1 + .015 * S(t) }, head: { y: -5 * S(t), r: .6 * S(t) }, armL: { r: -2 * S(t) }, armR: { r: 2 * S(t) }, eyes: { y: -2 * S(t) } }) },
    walk: { dur: .9, steps: 8, at: t => ({
      legL: { y: -34 * lift(S(t)), r: -6 * S(t) }, footL: { r: -10 * lift(S(t)), sy: 1 - .06 * lift(S(t)) },
      legR: { y: -34 * lift(-S(t)), r: 6 * S(t) }, footR: { r: 10 * lift(-S(t)), sy: 1 - .06 * lift(-S(t)) },
      root: { y: -10 * A(S(t)) }, torso: { r: 2.5 * S(t) }, head: { r: -3 * S(t), y: 4 * A(S(t)) },
      armL: { r: 9 * S(t) }, armR: { r: 9 * S(t) }, handL: { r: 3 * S(t) }, handR: { r: 3 * S(t) }, eyes: { x: 3 * S(t) }
    }) },
    run: { dur: .5, steps: 8, at: t => ({
      legL: { y: -60 * lift(S(t)), r: -14 * S(t) }, footL: { r: -22 * lift(S(t)) },
      legR: { y: -60 * lift(-S(t)), r: 14 * S(t) }, footR: { r: 22 * lift(-S(t)) },
      root: { y: -26 * A(S(t)) }, torso: { r: 4 * S(t), sy: 1.02 }, head: { r: -5 * S(t), y: 6 * A(S(t)) },
      armL: { r: -12 * S(t) - 4 }, armR: { r: -12 * S(t) + 4 }, handL: { r: -6 * S(t) }, handR: { r: -6 * S(t) }, shadow: { sx: 1 - .1 * A(S(t)) }
    }) },
    waving: { dur: 1.4, steps: 24, at: t => ({ handL: { r: 24 * S(t, 2) }, armL: { r: 5 * S(t, 2) - 3 }, head: { r: -4 - 2 * S(t) }, eyes: { x: -4 } }) },
    celebrating: { dur: 1, steps: 24, at: t => ({ root: { y: -34 * A(S(t)) }, armL: { r: 12 * S(t, 2) - 6 }, armR: { r: -12 * S(t, 2) + 6 }, handL: { r: 10 * S(t, 2) }, handR: { r: -10 * S(t, 2) }, head: { r: 4 * S(t), y: -4 * A(S(t)) }, legL: { r: 8 }, legR: { r: -8 }, torso: { sy: 1 + .03 * A(S(t)) }, shadow: { sx: 1 - .12 * A(S(t)) } }) },
    jumping: { dur: 1.6, steps: 32, at: t => {
      let y = 0, sq = 1, leg = 0, foot = 0, arm = 0;
      if (t < .2) { const k = t / .2; y = 18 * Math.sin(Math.PI * k); sq = 1 - .06 * Math.sin(Math.PI * k); arm = 30 * k; }
      else if (t < .7) { const k = (t - .2) / .5, h = Math.sin(Math.PI * k); y = -150 * h; leg = 18 * h; foot = 24 * h; arm = 30 - 30 * k; sq = 1 + .03 * h; }
      else if (t < .85) { const k = (t - .7) / .15; y = 14 * Math.sin(Math.PI * k); sq = 1 - .05 * Math.sin(Math.PI * k); }
      return { root: { y }, torso: { sy: sq }, legL: { r: leg }, legR: { r: -leg }, footL: { r: foot }, footR: { r: -foot }, armL: { r: arm }, armR: { r: -arm }, shadow: { sx: 1 + y / 400, o: 1 + y / 300 }, head: { y: y * .04 } };
    } },
    clapping: { dur: 1.1, steps: 24, at: t => { const c = .5 + .5 * Math.cos(2 * Math.PI * 3 * t); return { armL: { r: -12 * c }, armR: { r: 12 * c }, handL: { r: -10 * c }, handR: { r: 10 * c }, head: { r: 2 * S(t), y: -3 * A(S(t, 3)) }, root: { y: -4 * A(S(t, 1.5)) } }; } },
    blink: { dur: 3.4, steps: 48, at: t => { let sy = 1; const b = (t0, w) => { if (t >= t0 && t < t0 + w) sy = 1 - .94 * Math.sin(Math.PI * (t - t0) / w); }; b(.62, .09); b(.75, .09); return { eyes: { sy } }; } },
    bounce: { dur: .75, steps: 24, at: t => { const h = A(Math.sin(Math.PI * t)); const sq = 1 - .05 * lift(Math.cos(2 * Math.PI * t)); return { root: { y: -24 * h }, torso: { sy: sq, r: 0 }, head: { y: -4 * h }, footL: { sx: 1 + .04 * (1 - h) }, footR: { sx: 1 + .04 * (1 - h) }, armL: { r: -5 * h }, armR: { r: 5 * h }, shadow: { sx: 1 - .06 * h } }; } },
    sleeping: { dur: 4, steps: 24, at: t => ({ torso: { sy: 1 + .012 * S(t) }, head: { r: 12 + 1.2 * S(t), y: 14 - 4 * S(t), x: 8 }, zzz: { y: -30 * ((t * 2) % 1), o: 1 - ((t * 2) % 1) } }) }
  };

  const ANIM_POSE = { breathing: 'idle', walk: 'walk', run: 'run', waving: 'waving', celebrating: 'celebrating', jumping: 'jumping', clapping: 'clapping', blink: 'blink', bounce: 'bounce', sleeping: 'sleeping' };

  // ---------- TRANSFORMS ----------
  const D = { x: 0, y: 0, r: 0, sx: 1, sy: 1, o: 1 };
  const mergeT = (...ts) => { const o = {}; for (const t of ts) if (t) for (const k in t) o[k] = { ...(o[k] || {}), ...t[k] }; return o; };
  const tAttr = (k, v) => { const p = PIV[k], t = { ...D, ...v }; return ` transform="translate(${f(p[0] + t.x)} ${f(p[1] + t.y)}) rotate(${f(t.r)}) scale(${f(t.sx)} ${f(t.sy)}) translate(${-p[0]} ${-p[1]})"${t.o !== 1 ? ` opacity="${f(t.o)}"` : ''}`; };
  const tCss = v => { const t = { ...D, ...v }; return `transform:translate(${f(t.x)}px,${f(t.y)}px) rotate(${f(t.r)}deg) scale(${f(t.sx)},${f(t.sy)});opacity:${f(t.o)}`; };

  function resolve(poseName, opts = {}) {
    const P = POSES[poseName] || POSES.idle;
    const X = EXPR[opts.expression || P.x] || EXPR.happy;
    const v = { ...P.v, ...X.v, ...(P.override || {}) };
    if (opts.expression && P.override) delete v.__;
    if (opts.expression) Object.assign(v, X.v);
    return { v, t: mergeT(X.t, P.t), frontRight: !!P.frontRight, extras: P.extras || [] };
  }

  // Build the layered body. `tf(key)` returns the attr/style string for a part.
  function body(v, tf, extras, frontRightIn) {
    let frontRight = frontRightIn;
    const RA = rasterActive();
    const aL = RA ? armRaster('L', v.armL, v.handL) : arm('L', v.armL, v.handL), aR = RA ? armRaster('R', v.armR, v.handR) : arm('R', v.armR, v.handR);
    const handWrap = (a, key) => `<g id="${a.hid}" data-pivot="${a.wrist.join(',')}"${tf(key, a.wrist)}>${a.hand}</g>`;
    const cap = (key) => { const p = PIV[key]; return part('shoulder-fill-' + key, [`<circle cx="${p[0]}" cy="${p[1]}" r="62" %P/>`], hl(p[0] - 14, p[1] - 18, 30, 24, .4) + sh(p[0] + 10, p[1] + 34, 44, 20, .3)); };
    const capFront = (key, name) => { if (RA) return ''; const p = PIV[key]; return `<g id="${name}" data-pivot="${p.join(',')}">${RA ? img(name) : part(name, [`<circle cx="${p[0]}" cy="${p[1]}" r="66" %P/>`], hl(p[0] - 16, p[1] - 20, 34, 28, .42) + sp(p[0] - 20, p[1] - 26, 12, 9, .5) + sh(p[0] + 12, p[1] + 38, 48, 22, .32))}</g>`; };
    const rootG = (key) => RA ? `<g id="${key === 'armL' ? 'arm-left' : 'arm-right'}-root" data-pivot="${PIV[key].join(',')}"${tf(key)}>${img(key === 'armL' ? 'arm-root-left' : 'arm-root-right')}</g>` : '';
    const armG = (a, key, hkey) => { const inner = (RA ? '' : cap(key)) + a.markup + handWrap(a, hkey); const p = PIV[key]; return `<g id="${a.id}" data-pivot="${p.join(',')}"${tf(key)}>${a.baseR ? `<g transform="rotate(${a.baseR} ${p[0]} ${p[1]})">${inner}</g>` : inner}</g>`; };
    const right = (frontRight ? capFront('armR', 'shoulder-right') : '') + armG(aR, 'armR', 'handR');
    const leftBehind = false;
    const leftMidR = RA && v.armL !== 'raised' && v.armL !== 'chin';
    if (RA) frontRight = true;
    const leftMid = false, rightMid = false;
    const left = capFront('armL', 'shoulder-left') + armG(aL, 'armL', 'handL');
    const blush = RA && v.blush !== 'strong' ? img('blush-left') + img('blush-right') : v.blush === 'strong' ? blushM(1, 1.12) : blushM();
    const eyeL = RA && v.eyes === 'open' ? img('eye-left') : EYES[v.eyes](478, 427), eyeR = RA && v.eyes === 'open' ? img('eye-right') : EYES[v.eyes](722, 417);
    const browL = RA && v.brows === 'default' ? img('eyebrow-left') : brow(BROWS[v.brows].L), browR = RA && v.brows === 'default' ? img('eyebrow-right') : brow(BROWS[v.brows].R);
    const mouth = RA && v.mouth === 'openSmile' ? img('mouth') : MOUTHS[v.mouth]();
    return `
<g id="mascot" data-pivot="${PIV.root.join(',')}"${tf('root')}>
<g id="shadow" data-pivot="${PIV.shadow.join(',')}"${tf('shadow')}>${SHADOW()}</g>
<g id="leg-left-group" data-pivot="${PIV.legL.join(',')}"${tf('legL')}>${LEG('L')}<g id="foot-left-group" data-pivot="${PIV.footL.join(',')}"${tf('footL')}>${FOOT('L')}</g></g>
<g id="leg-right-group" data-pivot="${PIV.legR.join(',')}"${tf('legR')}>${LEG('R')}<g id="foot-right-group" data-pivot="${PIV.footR.join(',')}"${tf('footR')}>${FOOT('R')}</g></g>
${RA ? rootG('armR') + rootG('armL') : ''}
${frontRight || rightMid ? '' : capFront('armR', 'shoulder-right') + right}
${leftBehind ? left : ''}
<g id="torso-group" data-pivot="${PIV.torso.join(',')}"${tf('torso')}>${TORSO()}</g>
${frontRight || rightMid ? right : ''}
${leftMid || leftMidR ? left : ''}
<g id="head" data-pivot="${PIV.head.join(',')}"${tf('head')}>
${FACE()}
<g id="blush">${blush}</g>
<g id="eyes" data-pivot="${PIV.eyes.join(',')}"${tf('eyes')}><g id="eye-left">${eyeL}</g><g id="eye-right">${eyeR}</g></g>
<g id="eyebrows" data-pivot="${PIV.brows.join(',')}"${tf('brows')}><g id="eyebrow-left">${browL}</g><g id="eyebrow-right">${browR}</g></g>
<g id="mouth" data-pivot="${PIV.mouth.join(',')}"${tf('mouth')}>${mouth}</g>
${RING()}
</g>
${leftBehind || leftMid || leftMidR ? '' : left}
${extras.includes('zzz') ? `<g id="zzz-group" data-pivot="${PIV.zzz.join(',')}"${tf('zzz')}>${ZZZ()}</g>` : ''}
</g>`;
  }

  const ns = (svg, pre) => pre ? svg.replace(/ id="([^"]+)"/g, (m, id) => id === 'mascot' || id === 'face' || id === 'zzz' || /^(head|eyes?|eye-|eyebrow|mouth|blush|torso|arm-|hand-|shoulder-(left|right)$|leg-|foot-|shadow|zzz|leg|foot)/.test(id) && !/^m_|^cm_|^g[A-Z]|^mRing|^soft/.test(id) ? m : ` id="${pre}_${id}"`).replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${pre}_${id})`) : svg;
  const wrapSVG = (inner, opts = {}, extraDefs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${opts.width ? ` width="${opts.width}"` : ''}${opts.height ? ` height="${opts.height}"` : ''} data-mascot-pose="${opts.name || ''}"><defs>${DEFS}${extraDefs}</defs>${inner}</svg>`;

  // static render at optional time t of an animation
  function renderStatic(poseName, opts = {}) {
    const R = resolve(poseName, opts);
    const anim = ANIM[poseName];
    const t = mergeT(R.t, anim && opts.t != null ? anim.at(opts.t) : null, opts.overrides);
    const tf = (k, piv) => { const v = t[k]; if (!v) return ''; if (piv) { const p = { ...D, ...v }; return ` transform="translate(${f(piv[0] + p.x)} ${f(piv[1] + p.y)}) rotate(${f(p.r)}) scale(${f(p.sx)} ${f(p.sy)}) translate(${-piv[0]} ${-piv[1]})"`; } return tAttr(k, v); };
    return ns(wrapSVG(body(R.v, tf, R.extras, R.frontRight), { ...opts, name: poseName }), opts.prefix);
  }

  // animated render: CSS keyframes per part, sampled from anim.at(t)
  function renderAnimated(animName, opts = {}) {
    const anim = ANIM[animName]; if (!anim) return renderStatic(animName, opts);
    const poseName = ANIM_POSE[animName] || 'idle';
    const R = resolve(poseName, opts);
    const N = opts.steps || anim.steps, stepped = !!opts.stepped;
    const samples = []; for (let i = 0; i <= N; i++) samples.push(anim.at((i % N) / N));
    const keys = new Set(); samples.forEach(s => Object.keys(s).forEach(k => keys.add(k)));
    const pre = opts.prefix || 'm';
    let css = '';
    const tf = (k, piv) => {
      const stat = R.t[k] || {};
      const p = piv || PIV[k];
      if (!keys.has(k)) return stat && Object.keys(stat).length ? (piv ? ` style="transform-origin:${p[0]}px ${p[1]}px;transform-box:view-box;${tCss(stat)}"` : ` style="transform-origin:${p[0]}px ${p[1]}px;transform-box:view-box;${tCss(stat)}"`) : '';
      const frames = samples.map((s, i) => `${f(i / N * 100)}%{${tCss({ ...D, ...mergeT({ a: stat }, { a: s[k] }).a })}}`).join('');
      css += `@keyframes ${pre}_${k}{${frames}}`;
      return ` style="transform-origin:${p[0]}px ${p[1]}px;transform-box:view-box;animation:${pre}_${k} ${anim.dur}s ${stepped ? `steps(${N},jump-none)` : 'linear'} infinite"`;
    };
    const inner = body(R.v, tf, R.extras, R.frontRight);
    return ns(wrapSVG(`<style>${css}</style>${inner}`, { ...opts, name: animName }), opts.prefix);
  }

  function render(name, opts = {}) {
    if (opts.animate !== false && ANIM[name]) return renderAnimated(name, opts);
    return renderStatic(name, opts);
  }
  function frames(animName, n, opts = {}) {
    const anim = ANIM[animName]; n = n || anim.steps;
    return Array.from({ length: n }, (_, i) => renderStatic(ANIM_POSE[animName] || 'idle', { t: i / n, name: `${animName}-${i + 1}`, prefix: opts.prefix, ...(anim ? { overrides: anim.at(i / n) } : {}) }));
  }
  // master: original pose, every part in its own named group, no transforms
  const master = () => renderStatic('original', { name: 'master' });
  // single isolated part (for layer sheets)
  function partOnly(id, opts = {}) {
    const svg = renderStatic(opts.pose || 'original');
    const ids = { 'head-ring': RING, 'face': FACE, 'torso': TORSO, 'leg-left': () => LEG('L'), 'leg-right': () => LEG('R'), 'foot-left': () => FOOT('L'), 'foot-right': () => FOOT('R'), 'shadow': SHADOW,
      'eyes': () => rasterActive() ? img('eye-left') + img('eye-right') : `<g>${EYES.open(478, 427)}${EYES.open(722, 417)}</g>`, 'eyebrows': () => rasterActive() ? img('eyebrow-left') + img('eyebrow-right') : brow(BROWS.default.L) + brow(BROWS.default.R), 'mouth': () => rasterActive() ? img('mouth') : MOUTHS.openSmile(), 'blush': () => rasterActive() ? img('blush-left') + img('blush-right') : blushM(),
      'arm-left': () => (rasterActive() ? armRaster('L', opts.armL || 'raised') : arm('L', opts.armL || 'raised', 'point')).markup, 'hand-left': () => (rasterActive() ? armRaster('L', opts.armL || 'raised') : arm('L', opts.armL || 'raised', opts.handL || 'point')).hand,
      'arm-right': () => (rasterActive() ? armRaster('R', 'down') : arm('R', 'down', 'fist')).markup, 'hand-right': () => (rasterActive() ? armRaster('R', 'down') : arm('R', 'down', opts.handR || 'fist')).hand };
    return ns(wrapSVG(ids[id] ? ids[id]() : '', { name: 'part-' + id }), opts.prefix);
  }

  const API = { W, H, PIV, setRaster, setMode: m => { MODE = m; }, getMode: () => (rasterActive() ? 'raster' : 'vector'), render, renderStatic, renderAnimated, frames, master, partOnly,
    poses: Object.keys(POSES), animations: Object.keys(ANIM), expressions: Object.keys(EXPR),
    parts: ['head-ring', 'face', 'eyes', 'eyebrows', 'mouth', 'blush', 'torso', 'arm-left', 'hand-left', 'arm-right', 'hand-right', 'leg-left', 'foot-left', 'leg-right', 'foot-right', 'shadow'],
    armVariants: { L: Object.keys(ARMS.L), R: Object.keys(ARMS.R) }, handVariants: Object.keys(HANDS) };
  return API;
})(typeof window !== 'undefined' ? window : globalThis);

export default MascotRig;
