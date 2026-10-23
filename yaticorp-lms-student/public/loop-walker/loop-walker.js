/*! Loop Walker — an embeddable 3D mascot that follows the cursor, feels things and explains your page.
 *  Usage:  LoopWalker.mount({ model: '/assets/mascot.glb' })   — see README.md for every option.
 *  Needs three.js r156 (window.THREE); loaded automatically when it is not already on the page — YATICORP change:
 *  from three.min.js beside this file first, cdnjs only if that fails (see ensureThree). */
(function (global) {
  'use strict';
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.156.1/three.min.js';
  var threeLoading = null;
  // YATICORP change (2026-10-17): three.js is served with the app, from beside this file (three.min.js: r156.1, the
  // same bytes as the CDN's), and the CDN is only the fallback. With cdnjs out of reach — a school network that blocks
  // it, the phone app offline, or cdnjs itself down, as it was during testing — Yati never appeared at all.
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); rej(new Error('three.js failed to load from ' + src)); };
      document.head.appendChild(s);
    });
  }
  function ensureThree(url) {
    if (global.THREE) return Promise.resolve();
    if (!threeLoading) {
      var own = url || (BASE ? BASE + 'three.min.js' : null);
      threeLoading = own ? loadScript(own).catch(function () { return loadScript(THREE_URL); }) : loadScript(THREE_URL);
    }
    return threeLoading;
  }
  function ensureCss(href) {
    if (href === false || document.querySelector('link[data-loop-walker]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-loop-walker', ''); document.head.appendChild(l);
  }
  function scriptBase() {
    var s = document.currentScript || Array.prototype.slice.call(document.scripts).filter(function (x) { return /loop-walker(\.min)?\.js/.test(x.src); }).pop();
    return s && s.src ? s.src.replace(/[^\/]*$/, '') : '';
  }
  var BASE = scriptBase();

  function boot(opts) {
  var THREE = global.THREE;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var TAU = Math.PI * 2, D2R = Math.PI / 180;
  var W = 0, H = 0, dpr = 1, t = 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrapAngle(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
  function ease(dt, rate) { return 1 - Math.exp(-dt * rate); }
  var listeners = [];                                              // every page/window listener, so destroy() can remove them
  // YATICORP change: the options are kept, so a capture listener (the scroll one) is removed as it was added.
  function on(target, type, fn, o) { target.addEventListener(type, fn, o); listeners.push([target, type, fn, o]); }

  /* ================= action units ================= */
  // L / R are the viewer's left and right.
  //  iu  inner brow raise (AU1)   ou outer brow raise (AU2)   bd brow lowerer (AU4)
  //  lu  upper lid openness (AU5 >1, AU43 <1)   ll lower lid raise (AU7)   ch cheek raise (AU6)
  //  nose wrinkle (AU9)   sm lip corner pull (AU12)   fr lip corner depress (AU15)
  //  stretch (AU20)   pucker (AU18)   press (AU24)   jaw drop (AU26)   upLip (AU10)   loLip (AU16)
  var AU_KEYS = ['iuL', 'iuR', 'ouL', 'ouR', 'bdL', 'bdR', 'luL', 'luR', 'llL', 'llR', 'chL', 'chR', 'nose',
    'smL', 'smR', 'frL', 'frR', 'stretch', 'pucker', 'press', 'jaw', 'upLip', 'loLip', 'blush', 'tear', 'sweat', 'pupil', 'wet'];
  var NEUTRAL = {};
  AU_KEYS.forEach(function (k) { NEUTRAL[k] = 0; });
  NEUTRAL.luL = NEUTRAL.luR = 1; NEUTRAL.pupil = 1; NEUTRAL.wet = 0.3; NEUTRAL.blush = 0.85;
  var PAIRS = { browInnerUp: ['iuL', 'iuR'], browOuterUp: ['ouL', 'ouR'], browDown: ['bdL', 'bdR'], lidUpper: ['luL', 'luR'],
    lidLower: ['llL', 'llR'], cheek: ['chL', 'chR'], smile: ['smL', 'smR'], frown: ['frL', 'frR'] };
  function au(o) {
    var a = Object.assign({}, NEUTRAL);
    for (var k in o) { if (PAIRS[k]) { a[PAIRS[k][0]] = o[k]; a[PAIRS[k][1]] = o[k]; } else a[k] = o[k]; }
    return a;
  }

  /* ================= the feelings ================= */
  // gaze: [x, y, strength]   head: [pitch(+down), yaw, roll]   body: lean(+fwd), drop, swing, bounce, sway
  var EMO = {
    neutral:   { name: 'Neutral', au: au({ smile: 0.8, jaw: 0.36, cheek: 0.35, lidLower: 0.08 }), gesture: 'rest', fade: 2,
                 line: "My resting face. Nothing's happening but blinks and small eye movements — that's what keeps a face alive." },
    content:   { name: 'Content', au: au({ smile: 0.9, jaw: 0.42, cheek: 0.45, lidLower: 0.15, lidUpper: 0.98, blush: 0.9 }), gesture: 'rest', head: [0, 0, 0.04], body: { bounce: 0.2 },
                 line: 'Content. A soft smile that just reaches my eyes — the face of an easy walk.' },
    polite:    { name: 'Polite smile', au: au({ smile: 0.55, press: 0.15 }), gesture: 'rest',
                 line: "A polite smile — mouth only. My eyes don't change, which is why people read it as courtesy, not happiness." },
    joy:       { name: 'Joy', au: au({ cheek: 0.7, lidLower: 0.2, smile: 0.95, jaw: 0.55, browOuterUp: 0.15, blush: 1.0, lidUpper: 1.0, pupil: 1.1 }),
                 gesture: 'wave', head: [-0.06, 0, 0.06], body: { bounce: 0.5 },
                 line: 'Real joy. My cheeks lift and squeeze my lower lids — that eye crinkle is what makes a smile feel genuine.' },
    laughing:  { name: 'Laughing', au: au({ cheek: 1, lidLower: 0.85, lidUpper: 0.32, smile: 1, jaw: 0.5, upLip: 0.5, browInnerUp: 0.35, blush: 1.05 }),
                 gesture: 'laugh', head: [-0.12, 0, 0.05], body: { bounce: 1 }, fade: 3,
                 line: 'Laughing — eyes nearly shut, cheeks all the way up, jaw bouncing. Very hard to fake.' },
    excited:   { name: 'Excited', au: au({ browInnerUp: 0.6, browOuterUp: 0.7, lidUpper: 1.22, cheek: 0.6, lidLower: 0.22, smile: 1, jaw: 0.75, pupil: 1.35, blush: 1.0 }),
                 gesture: 'cheer', head: [-0.1, 0, 0], body: { bounce: 0.8 },
                 line: "Excited — brows up, eyes wide, a big open smile. You'll see it when I sprint." },
    love:      { name: 'Adoring', au: au({ lidUpper: 0.72, cheek: 0.55, lidLower: 0.35, smile: 0.62, browInnerUp: 0.35, blush: 1.3, pupil: 1.45, wet: 0.85 }),
                 gesture: 'heart', gaze: [0, 0.05, 0.3], head: [0.04, 0, 0.16], body: { sway: 0.6 },
                 line: 'Soft lids, wide pupils, a warm blush. The face people make at someone they adore.' },
    surprised: { name: 'Surprised', au: au({ browInnerUp: 0.95, browOuterUp: 0.95, lidUpper: 1.4, jaw: 0.6, pupil: 1.25 }),
                 gesture: 'startle', head: [-0.1, 0, 0], body: { lean: -0.08 }, fade: 5,
                 line: 'Surprise lasts under a second: brows shoot up, lids open wide, jaw drops. Then it turns into something else.' },
    afraid:    { name: 'Afraid', au: au({ browInnerUp: 0.9, browOuterUp: 0.5, browDown: 0.45, lidUpper: 1.35, lidLower: 0.2, stretch: 0.75, jaw: 0.25, frown: 0.25, pupil: 1.4, sweat: 0.8, blush: 0.4 }),
                 gesture: 'cower', head: [0.12, 0, 0], body: { lean: -0.14, drop: 0.02 }, fade: 2.5,
                 line: 'Fear pulls my brows up and together, stretches my lips sideways and widens my eyes. My pupils open up too.' },
    sad:       { name: 'Sad', au: au({ browInnerUp: 0.95, browDown: 0.3, frown: 0.8, lidUpper: 0.66, press: 0.2, pupil: 1.1, wet: 1, tear: 0.85, blush: 0.55 }),
                 gesture: 'slump', gaze: [0, 0.6, 0.8], head: [0.28, 0, 0.05], body: { lean: 0.06, drop: 0.025, swing: -0.6 }, fade: 1.1,
                 line: 'Sadness: my inner brows lift and pinch, mouth corners pull down, eyes go glassy and drop.' },
    angry:     { name: 'Angry', au: au({ browDown: 1, lidUpper: 1.06, lidLower: 0.55, press: 0.75, frown: 0.35, nose: 0.35, pupil: 0.8, blush: 0.7 }),
                 gesture: 'fists', head: [0.1, 0, 0], body: { lean: 0.1, swing: 0.3 }, fade: 1.6,
                 line: 'Anger: brows slam down and together, lids tighten into a glare, lips press hard.' },
    disgusted: { name: 'Disgusted', au: au({ nose: 1, upLip: 0.7, frL: 0.55, frR: 0.35, browDown: 0.55, lidLower: 0.55, cheek: 0.35, lidUpper: 0.82 }),
                 gesture: 'recoil', head: [-0.08, -0.25, -0.08], body: { lean: -0.12 }, fade: 2,
                 line: 'Disgust wrinkles my nose and lifts my upper lip — like something smells off.' },
    proud:     { name: 'Proud', au: au({ smile: 0.55, press: 0.3, lidUpper: 0.7, cheek: 0.35, lidLower: 0.2, browOuterUp: 0.2 }),
                 gesture: 'proud', gaze: [0, 0.3, 0.6], head: [-0.16, 0, 0], body: { lean: -0.04 },
                 line: 'Pride: chin up, lids a little lowered, a closed smile. Hands on hips helps.' },
    amused:    { name: 'Amused', au: au({ smL: 0.78, smR: 0.12, chL: 0.45, llL: 0.3, ouR: 0.35, iuR: 0.15, press: 0.2 }),
                 gesture: 'hip', gaze: [0.2, 0, 0.3], head: [0, 0, 0.14],
                 line: 'A one-sided smile. Amused, a little knowing — the asymmetry is what gives it away.' },
    shy:       { name: 'Shy', au: au({ smile: 0.42, press: 0.35, browInnerUp: 0.5, lidUpper: 0.76, blush: 1.35, cheek: 0.2 }),
                 gesture: 'shy', gaze: [-0.55, 0.6, 0.9], head: [0.26, 0.2, 0.18], body: { sway: 0.8 },
                 line: "Shy: a small smile I'm trying to hide, eyes down and away, and a blush I can't control." },
    relieved:  { name: 'Relieved', au: au({ browInnerUp: 0.45, lidUpper: 0.7, smile: 0.45, jaw: 0.1, cheek: 0.25, lidLower: 0.15 }),
                 gesture: 'wipe', head: [-0.05, 0, 0], body: { drop: 0.015 },
                 line: 'Relief: brows ease up, lids soften, a long breath out and a small smile.' },
    curious:   { name: 'Curious', au: au({ ouL: 0.75, iuL: 0.4, bdR: 0.15, lidUpper: 1.12, pupil: 1.3, pucker: 0.22 }),
                 gesture: 'idea', head: [0, 0, 0.2], body: { lean: 0.06 },
                 line: 'Curious: one brow up, eyes wide open, pupils dilated. Tell me more.' },
    thinking:  { name: 'Thinking', au: au({ bdL: 0.45, iuR: 0.55, ouR: 0.35, lidUpper: 0.86, press: 0.35, smR: 0.12, frL: 0.1, blush: 0.75 }),
                 gesture: 'think', gaze: [0.6, -0.65, 1], head: [-0.08, 0.12, -0.1],
                 line: 'Thinking: brows split, lips pressed, eyes drift up and away while I work it out.' },
    confused:  { name: 'Confused', au: au({ bdL: 0.65, iuR: 0.6, ouR: 0.7, luR: 1.1, luL: 0.84, frR: 0.3, smL: 0.1, pucker: 0.15 }),
                 gesture: 'scratch', gaze: [0.35, -0.25, 0.6], head: [0, 0, 0.26],
                 line: 'Confused: one brow down, the other up, a lopsided mouth and a tilt of the head.' },
    focused:   { name: 'Focused', au: au({ browDown: 0.65, lidLower: 0.45, lidUpper: 0.82, press: 0.6, pupil: 0.9, blush: 0.7 }),
                 gesture: 'ready', head: [0.05, 0, 0], body: { lean: 0.05 },
                 line: 'Focused: brows down, lower lids tight, lips pressed. I even blink less when I concentrate.' },
    bored:     { name: 'Bored', au: au({ lidUpper: 0.56, press: 0.45, frL: 0.25, smR: 0.06, browInnerUp: 0.1 }),
                 gesture: 'slump', wander: true, head: [0.1, 0, 0.1], body: { drop: 0.01, swing: -0.4 },
                 line: 'Bored: heavy lids, a lopsided mouth, eyes wandering around for something to do.' },
    tired:     { name: 'Tired', au: au({ lidUpper: 0.5, browInnerUp: 0.65, jaw: 0.22, frown: 0.2, sweat: 0.9, pupil: 1.1, blush: 0.6 }),
                 gesture: 'slump', head: [0.18, 0, 0], body: { lean: 0.1, drop: 0.03, swing: -0.5 }, fade: 1,
                 line: "Tired: heavy lids, brows pinched up, mouth open to breathe. Sprint me too long and you'll see it." },
    sleepy:    { name: 'Sleepy', au: au({ lidUpper: 0.12, browInnerUp: 0.2, jaw: 0.05, smile: 0.1, blush: 0.7 }),
                 gesture: 'rest', head: [0.3, 0, 0.08], body: { drop: 0.02, swing: -0.7 },
                 line: "Sleepy: lids almost shut, head nodding. Give me twelve quiet seconds and I'll start yawning." }
  };
  var EMO_KEYS = Object.keys(EMO);

  /* ================= the face painter ================= */
  // Paints a face centred on (ox + S/2, oy + S/2) onto a transparent canvas. The skin
  // underneath shows through, so eyelids are the edges of a clip, never painted patches.

  /* ================= what Loop says ================= */
  // What Loop says about things: opts.explain = { key: { label, text, emo, gesture } }, or data-explain-* attributes on the element itself
  var EXPLAIN = Object.assign({}, opts.explain || {});
  EMO_KEYS.forEach(function (n) {
    EXPLAIN['emo-' + n] = { label: EMO[n].name, emo: n, gesture: EMO[n].gesture, text: EMO[n].line };
  });

  /* ================= parameters + state ================= */
  // YATICORP change, not in the shipped package: `side` and `standAbove` belong to mode 'stand' (see standSpot).
  var DEFAULTS = { height: 170, mobileHeight: 0, top: 380, gain: 0.55, prints: 16, tilt: 15, mode: 'follow', explain: true, facecam: false, side: 'right', standAbove: '' };
  var P = Object.assign({}, DEFAULTS);
  ['height', 'mobileHeight', 'top', 'gain', 'prints', 'tilt', 'mode', 'explain', 'facecam', 'side', 'standAbove'].forEach(function (k) { if (opts[k] !== undefined) P[k] = opts[k]; });
  // YATICORP change, not in the shipped package: sized from the screen. About a quarter of its shorter side, so it
  // is smaller on a small phone and bigger on a large one, up to `mobileHeight` below 640px wide (when set) and
  // `height` above; never taller than a fifth of the screen (a phone on its side) and never under 72px. On phones
  // it was a fixed 140px, a sixth of the screen, which the user found too big (2026-10-10).
  function figH() {
    var cap = P.mobileHeight && W < 640 ? P.mobileHeight : P.height;
    return Math.max(Math.min(72, cap), Math.min(cap, Math.min(W, H) * 0.26, H * 0.2));
  }
  // YATICORP change, not in the shipped package: the camera looks at the floor from 15 degrees up, so a figure of one
  // size shrinks as it walks up the screen (farther away) and grows near the bottom: about half the size at the top
  // of its band. figW() is the height in 3D units that draws Loop the same size wherever it stands: figH() scaled by
  // its depth against a spot 70% down the screen, where it was drawn at its usual size. Measurements made on the
  // screen (band, guideScreenPoint, hitsLoop) keep using figH(); everything in 3D (the rig, steps, speeds) uses figW().
  var refDepth = 0, refSpot = null;
  function depthOf(v) { var c = camera.position, cc = c.lengthSq(); return (cc - v.dot(c)) / Math.sqrt(cc); }
  function figW() {
    if (!refDepth || !pos || !camera) return figH();
    return figH() * Math.max(refDepth * 0.4, depthOf(pos)) / refDepth;
  }

  var walker = { v: 0, heading: 0, phase: 0, moveMix: 0 };
  var cursorSpeed = 0;
  var pointer = { x: 0, y: 0, seen: false };
  var hover = { key: null, el: null, armed: false, since: 0 };
  var lastMoveAt = 0, idleT = 0, fatigue = 0, awayT = 0, everSeen = false, awaySaid = false, tiredSaid = false;
  var guide = null;
  var queuedGuide = null;   // YATICORP change: what a page asked Loop to explain while it was busy (see api.explain)
  var goingHome = false;    // YATICORP change: walking back to its corner after explaining what a page asked about
  var roam = { target: null, pause: 0 };
  var lastSprintMsg = -99, gaitNow = 'Standing';
  var lastStep = [-1, -1];
  var pokes = 0, lastPokeAt = -99;
  var fleeTo = null, pokedAt = null, fleeDone = false;                            // YATICORP change: see runFrom
  var gestureOverride = null;

  // feelings
  var E = {}, Et = {}, impulses = [];
  EMO_KEYS.forEach(function (n) { E[n] = 0; });
  var dom = { n: 'neutral', v: 0 }, second = { n: null, v: 0 };
  var A = Object.assign({}, NEUTRAL);
  var micro = { blink: 0, blinkT: -1, blinkDur: 0.24, nextBlink: 1.5, gx: 0, gy: 0, tgx: 0, tgy: 0, jx: 0, jy: 0, nextSacc: 0.5,
                flash: 0, yawn: -1, nextYawn: 5, sigh: -1, wanderX: 0, wanderY: 0 };
  var talk = { text: '', times: [], t: 0, dur: 0, n: 0, on: false, jaw: 0, pu: 0, st: 0, pr: 0, ul: 0 };
  var headScreen = { x: 0, y: 0 }, facing = true;

  function impulse(n, v, dur, delay) { impulses.push({ n: n, v: v, t0: t + (delay || 0), dur: dur }); }

  /* ================= three.js ================= */
  var root = document.createElement('div');
  root.className = 'lw-root';
  root.innerHTML =
    '<canvas class="lw-gl" aria-hidden="true"></canvas>' +
    '<div class="lw-facecam off" aria-hidden="true"><canvas class="lw-fc-canvas" width="296" height="296"></canvas><div class="lw-fc-meta"><span>Face cam</span><b class="lw-fc-mood">Neutral</b></div></div>' +
    '<div class="lw-bubble"><div class="lw-b-inner"><span class="lw-b-label" aria-hidden="true"><span class="lw-b-name"></span><i class="lw-b-feel"></i></span>' +
    '<span class="lw-b-text" aria-hidden="true"><span class="lw-b-shown"></span><span class="lw-b-caret"></span><span class="lw-b-rest"></span></span>' +
    '<span class="lw-sr-only lw-b-sr" role="status" aria-live="polite"></span></div></div>' +
    (opts.hint === false ? '' : '<p class="lw-hint"><span class="lw-pulse" aria-hidden="true"></span><span class="lw-hint-text"></span></p>');
  if (opts.zIndex !== undefined) root.style.setProperty('--lw-z', String(opts.zIndex));
  (opts.container || document.body).appendChild(root);
  var $ = function (c) { return root.querySelector('.' + c); };
  var glCanvas = $('lw-gl');
  var renderer, scene, camera, rig = null, parts = {}, key, prints = [], printPool = [];
  var ready = false, rigReady = false;
  var pos, tmpV, headV, ray, ndc, floorPlane;

  // ---- Loop's own 3D file. Every part is in the GLB; the page only adds joints, eyelids and a tear.
  var MODEL_URL = opts.model || 'mascot.glb';                     // the GLB, base64-encoded so it can be served next to the page
  var MODEL_H = 1.18;                                    // the file's height, floor to ring top
  var M = { hipY: 0.32, legL: 0.329, legX: 0.087, legZ: 0.005, footRel: [0.058, -0.259, 0.04],
            shoulderX: 0.115, shoulderY: 0.555, up: 0.215, fore: 0.06, armR: 0.05, fistDrop: 0.03,
            headY: 0.8789, fistC: [-0.353, 0.594, 0.05] };
  var R = { spanMax: 0.28, headTop: 1.0, headRY: 0.254, headS: 0.305 };   // in figure heights, for the parts of the page that measure on screen

  function parseGLB(buf) {
    var dv = new DataView(buf), json = null, bin = null;
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('not a glb');
    var len = dv.getUint32(8, true), off = 12;
    while (off < len) {
      var cl = dv.getUint32(off, true), ct = dv.getUint32(off + 4, true);
      if (ct === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, cl)));
      else if (ct === 0x004E4942) bin = buf.slice(off + 8, off + 8 + cl);
      off += 8 + cl;
    }
    return { json: json, bin: bin };
  }
  function accessor(g, idx) {
    var a = g.json.accessors[idx], bv = g.json.bufferViews[a.bufferView];
    var n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    var T = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }[a.componentType];
    var base = (bv.byteOffset || 0) + (a.byteOffset || 0), elem = n * T.BYTES_PER_ELEMENT, stride = bv.byteStride || elem;
    var out = new T(a.count * n);
    if (stride === elem && base % T.BYTES_PER_ELEMENT === 0) out.set(new T(g.bin, base, a.count * n));
    else { var src = new Uint8Array(g.bin), dst = new Uint8Array(out.buffer); for (var i = 0; i < a.count; i++) dst.set(src.subarray(base + i * stride, base + i * stride + elem), i * elem); }
    return { arr: out, n: n };
  }
  function buildGLTF(g) {
    var mats = (g.json.materials || []).map(function (m) {
      var pbr = m.pbrMetallicRoughness || {}, bc = pbr.baseColorFactor || [1, 1, 1, 1];
      var mat = new THREE.MeshPhysicalMaterial({
        roughness: pbr.roughnessFactor != null ? pbr.roughnessFactor : 1, metalness: pbr.metallicFactor != null ? pbr.metallicFactor : 1,
        envMapIntensity: 0.55
      });
      mat.color.setRGB(bc[0], bc[1], bc[2]);
      if (m.emissiveFactor) mat.emissive.setRGB(m.emissiveFactor[0], m.emissiveFactor[1], m.emissiveFactor[2]);
      if (m.name === 'blue_plastic') { mat.clearcoat = 0.65; mat.clearcoatRoughness = 0.18; }
      if (m.name === 'white_face') { mat.emissive.setRGB(0.09, 0.09, 0.1); mat.envMapIntensity = 0.4; }
      mat.name = m.name || '';
      return mat;
    });
    var geos = g.json.meshes.map(function (m) {
      var p = m.primitives[0], geo = new THREE.BufferGeometry(), at = p.attributes;
      var pa = accessor(g, at.POSITION); geo.setAttribute('position', new THREE.BufferAttribute(pa.arr, pa.n));
      if (at.NORMAL != null) { var na = accessor(g, at.NORMAL); geo.setAttribute('normal', new THREE.BufferAttribute(na.arr, na.n)); }
      else geo.computeVertexNormals();
      if (at.TEXCOORD_0 != null) { var ua = accessor(g, at.TEXCOORD_0); geo.setAttribute('uv', new THREE.BufferAttribute(ua.arr, ua.n)); }
      if (p.indices != null) { var ia = accessor(g, p.indices); geo.setIndex(new THREE.BufferAttribute(ia.arr, 1)); }
      return { geo: geo, mat: p.material };
    });
    var nodes = g.json.nodes.map(function (n) {
      var o = n.mesh != null ? new THREE.Mesh(geos[n.mesh].geo, mats[geos[n.mesh].mat]) : new THREE.Group();
      o.name = n.name || '';
      if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale);
      else {
        if (n.translation) o.position.fromArray(n.translation);
        if (n.rotation) o.quaternion.fromArray(n.rotation);
        if (n.scale) o.scale.fromArray(n.scale);
      }
      return o;
    });
    g.json.nodes.forEach(function (n, i) { (n.children || []).forEach(function (c) { nodes[i].add(nodes[c]); }); });
    var byName = {};
    nodes.forEach(function (o) { if (o.name && !byName[o.name]) byName[o.name] = o; });
    return { nodes: nodes, byName: byName, mats: mats };
  }

  function capsuleBone(parent, len, rad, mat) {
    var g = new THREE.Group();
    var m = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len, 6, 20), mat);
    m.position.y = -len / 2; m.castShadow = true;
    g.add(m); parent.add(g);
    return g;
  }
  function moveUnder(obj, parent, x, y, z) {               // re-parent, keeping the file's own rotation and scale
    obj.position.set(x, y, z); parent.add(obj); return obj;
  }

  // Assemble the file's parts into a rig: hips → torso, head, two arm chains, two leg pivots.
  function assembleRig(gl) {
    var N = gl.byName, blue = gl.mats.filter(function (m) { return m.name === 'blue_plastic'; })[0];
    // YATICORP change (2026-10-15, smooth scrolling): the bending fingers get their own copy of the blue. Shared with
    // the rigid parts, one material switched three.js between its skinned and plain program on every draw, and the
    // renderer re-checked the program each time: a fifth of Loop's work in every frame, on a phone's CPU.
    var blueSkin = blue.clone();
    var white = gl.mats.filter(function (m) { return m.name === 'white_face'; })[0];
    rig = new THREE.Group();
    rig.rotation.order = 'YXZ';
    var hips = new THREE.Group();
    hips.position.y = M.hipY;
    rig.add(hips);
    parts.hips = hips;

    moveUnder(N.torso, hips, 0, -M.hipY, 0);
    N.torso.castShadow = true;
    moveUnder(N.head, hips, 0, M.headY - M.hipY, 0);
    parts.head = N.head;
    ['head_band_upper', 'head_band_lower', 'head_back', 'face'].forEach(function (k) { if (N[k]) N[k].castShadow = true; });

    // legs: a pivot at the top of each leg; the foot rides along and is kept level
    parts.leg = [];
    [-1, 1].forEach(function (side, i) {
      var pivot = new THREE.Group();
      pivot.position.set(side * M.legX, 0, M.legZ);
      hips.add(pivot);
      var leg = side < 0 ? N.leg_right : N.leg_left;
      moveUnder(leg, pivot, 0, -0.093, 0); leg.castShadow = true;
      var footG = new THREE.Group();
      footG.position.set(side * M.footRel[0], M.footRel[1], M.footRel[2]);
      pivot.add(footG);
      var foot = side < 0 ? N.foot_right : N.foot_left;
      moveUnder(foot, footG, 0, 0, 0); foot.castShadow = true;
      parts.leg.push({ pivot: pivot, foot: footG, side: side });
    });

    // arms: two bones in the same blue, with the file's own fists on the end. The file has two hands —
    // a hanging fist and a raised, pointing fist — so each arm carries both and shows the one its pose calls for.
    parts.arm = [];
    function roundedBoxGeo(hx, hy, hz, r, seg) {                                   // a box with every edge rounded by r
      var geo = new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2, seg, seg, seg);
      var pos = geo.attributes.position, nor = geo.attributes.normal;
      var ix = hx - r, iy = hy - r, iz = hz - r, v = new THREE.Vector3(), c = new THREE.Vector3();
      for (var i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        c.set(Math.max(-ix, Math.min(ix, v.x)), Math.max(-iy, Math.min(iy, v.y)), Math.max(-iz, Math.min(iz, v.z)));
        v.sub(c);
        if (v.lengthSq() < 1e-12) v.fromBufferAttribute(nor, i); else v.normalize();
        nor.setXYZ(i, v.x, v.y, v.z);
        pos.setXYZ(i, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r);
      }
      return geo;
    }
    var sphereGeo = new THREE.SphereGeometry(1, 18, 14);
    function ball(parent, rx, ry, rz, pos) {
      var m = new THREE.Mesh(sphereGeo, blue);
      m.scale.set(rx, ry, rz); m.position.set(pos[0], pos[1], pos[2]); m.castShadow = true;
      parent.add(m); return m;
    }
    // A finger is one smooth, tapered skin bound to a chain of bones, so it bends at the joints the way a real
    // finger does: a continuous surface with soft knuckles, not stacked segments.
    function bone(parent, pos, rest, point) {
      var b = new THREE.Bone();
      b.position.set(pos[0], pos[1], pos[2]);
      b.rotation.set(rest[0], rest[1], rest[2]);
      b.userData.rest = rest; b.userData.point = point;
      parent.add(b); return b;
    }
    function fingerSkin(parent, r, L, pos, rest, point) {          // r: root radius; L: segment lengths; rest/point: per-joint [x-curl], root also [z-splay]
      var total = 0, joints = [0];
      for (var i = 0; i < L.length; i++) { total += L[i]; joints.push(total); }
      function rad(s) {                                             // radius along the finger: a gentle taper, a soft swell at each knuckle, a rounded tip
        var t = Math.max(0, Math.min(1, s / total)), base = r * (1 - 0.24 * t), k = 0;
        for (var j = 1; j < joints.length - 1; j++) { var d = (s - joints[j]) / (r * 1.2); k += Math.exp(-d * d) * 0.07; }
        return base * (1 + k);
      }
      var tipR = rad(total), prof = [];
      for (var a = 0; a <= 10; a++) { var th = (a / 10) * Math.PI / 2; prof.push(new THREE.Vector2(Math.sin(th) * tipR + 1e-5, -total - Math.cos(th) * tipR)); }   // tip cap, bottom up
      for (var n = 1; n <= 30; n++) { var sN = total * (1 - n / 30); prof.push(new THREE.Vector2(rad(sN), -sN)); }
      prof.push(new THREE.Vector2(r * 0.98, r * 0.6));                                                    // the root runs up into the palm
      for (var c = 1; c <= 6; c++) { var ph = (c / 6) * Math.PI / 2; prof.push(new THREE.Vector2(Math.cos(ph) * r * 0.98 + 1e-5, r * 0.6 + Math.sin(ph) * r * 0.98)); }   // and is closed with a dome
      var geo = new THREE.LatheGeometry(prof, 18);
      var P = geo.attributes.position, cnt = P.count, si = new Float32Array(cnt * 4), sw = new Float32Array(cnt * 4), w = r * 0.9;
      for (var v = 0; v < cnt; v++) {
        var sV = -P.getY(v), bi = 0, bw = 1, bj = 0;
        for (var j2 = 1; j2 < joints.length - 1; j2++) {
          if (sV > joints[j2] + w) { bi = j2; bw = 1; bj = 0; }
          else if (sV > joints[j2] - w) { var tt = (sV - (joints[j2] - w)) / (2 * w); tt = tt * tt * (3 - 2 * tt); bi = j2 - 1; bw = 1 - tt; bj = tt; break; }
          else break;
        }
        si[v * 4] = bi; sw[v * 4] = bw; si[v * 4 + 1] = Math.min(bi + 1, L.length - 1); sw[v * 4 + 1] = bj;
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      var mesh = new THREE.SkinnedMesh(geo, blueSkin);
      mesh.position.set(pos[0], pos[1], pos[2]); mesh.castShadow = true; mesh.frustumCulled = false;
      parent.add(mesh);
      var bones = [], prev = mesh;
      for (var k2 = 0; k2 < L.length; k2++) {
        var b = bone(prev, [0, k2 ? -L[k2 - 1] : 0, 0], [0, 0, 0], [0, 0, 0]);   // bound straight; posed after binding
        b.userData.rest = k2 ? [rest[k2], 0, 0] : rest[0]; b.userData.point = k2 ? [point[k2], 0, 0] : point[0];
        b.userData.flat = k2 ? [k2 === L.length - 1 ? -0.06 : -0.02, 0, 0] : [rest[0][0] * 0.3, 0, rest[0][2] * 0.45];   // an open, flat hand: fingers straight and close together
        b.userData.scratch = L.length === 2 ? (k2 ? [-0.45, 0, 0] : [-0.35, 0, 0.75])                           // the thumb spread wide
                           : (k2 ? [k2 === 1 ? -1.05 : -0.65, 0, 0] : [-0.85, 0, rest[0][2] * 1.6]);           // fingers hooked and a little spread, as when scratching
        bones.push(b); prev = b;
      }
      mesh.bind(new THREE.Skeleton(bones));
      bones.forEach(function (bn) { var rr = bn.userData.rest; bn.rotation.set(rr[0], rr[1], rr[2]); });
      return bones;
    }
    // A hand built the way a human hand is built: a palm that narrows to the wrist, thickens into the heel and the
    // thumb pad, four fingers on an arched knuckle line with the middle finger longest, and a thumb set off the
    // side of the palm. Every joint has a rest pose and a pointing pose, so the same hand points by straightening
    // the index and curling the other fingers.
    function makeHand(mirror) {                                   // arm frame: forearm above (+y), palm side +z, inner side -x
      var g = new THREE.Group();
      g.scale.set(mirror ? -1.2 : 1.2, 1.2, 1.2);                                   // a little larger than life, so the fingers read at page size
      var joints = [];
      ball(g, 0.042, 0.03, 0.034, [0, 0.0, 0]);                                    // wrist, rounding the forearm's end into the hand
      var palmGeo = roundedBoxGeo(0.044, 0.038, 0.015, 0.012, 24), pp = palmGeo.attributes.position;
      for (var i = 0; i < pp.count; i++) {
        var x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), t = (y + 0.038) / 0.076;     // t: 0 at the knuckles, 1 at the wrist
        x *= 1 - 0.2 * t;                                                              // narrower at the wrist
        z *= 1 - 0.22 * (1 - t);                                                       // thinner toward the fingers
        if (z > 0) {                                                                   // palm side: the thumb pad and the heel of the hand
          z += 0.011 * Math.exp(-Math.pow((x - 0.026) / 0.018, 2) - Math.pow((y + 0.002) / 0.022, 2));
          z += 0.006 * Math.exp(-Math.pow((x + 0.03) / 0.014, 2) - Math.pow((y - 0.004) / 0.024, 2));
        } else {
          z -= 0.004 * Math.exp(-Math.pow(x / 0.03, 2) - Math.pow((y + 0.012) / 0.026, 2));   // a gentle dome on the back
        }
        pp.setXYZ(i, x, y, z);
      }
      palmGeo.computeVertexNormals();
      var palm = new THREE.Mesh(palmGeo, blue); palm.position.set(0, -0.038, 0); palm.castShadow = true; g.add(palm);
      // fingers: [x on the knuckle line, knuckle y, radius, segment lengths, splay at rest, curl at rest, curl when pointing]
      [['index',  0.033,  -0.07,  0.0105, [0.03, 0.02, 0.016],   0.14,  [-0.1, -0.2, -0.08],   [0.0, 0.0, 0.0]],
       ['middle', 0.011,  -0.074, 0.0108, [0.032, 0.022, 0.017], 0.04,  [-0.12, -0.24, -0.1],  [-1.45, -1.75, -1.05]],
       ['ring',  -0.011,  -0.072, 0.0102, [0.03, 0.021, 0.016],  -0.05, [-0.14, -0.28, -0.12], [-1.45, -1.75, -1.05]],
       ['pinky', -0.033,  -0.066, 0.009,  [0.024, 0.016, 0.013], -0.16, [-0.16, -0.3, -0.14],  [-1.4, -1.7, -1.05]]
      ].forEach(function (f) {
        var c0 = f[6], c1 = f[7];
        var fb = fingerSkin(g, f[3], f[4], [f[1], f[2], 0.01],
          [[c0[0], 0, f[5]], c0[1], c0[2]],
          [[c1[0], 0, f[0] === 'index' ? 0.05 : 0], c1[1], c1[2]]);                  // curled fingers close together; the index runs almost straight along the arm
        if (f[0] === 'index') { fb[0].userData.fist = [-1.3, 0, 0]; fb[1].userData.fist = [-1.7, 0, 0]; fb[2].userData.fist = [-1.0, 0, 0]; }   // in a closed fist the index curls too
        joints.push.apply(joints, fb);
      });
      // thumb: off the side of the palm at the thumb pad, hanging a little apart from the index at rest
      joints.push.apply(joints, fingerSkin(g, 0.0118, [0.03, 0.026], [0.04, -0.026, 0.014],
        [[-0.35, 0, 0.5], -0.4], [[-1.0, 0, -0.6], -0.6]));                        // pointing: the thumb folds over the curled fingers, as a real fist does
      return { group: g, palm: palm, joints: joints };
    }
    [-1, 1].forEach(function (side) {
      var sh = new THREE.Group();
      sh.position.set(side * M.shoulderX, M.shoulderY - M.hipY, 0);
      hips.add(sh);
      var upper = capsuleBone(sh, M.up, M.armR, blue);
      var fore = capsuleBone(upper, M.fore, M.armR * 0.97, blue);
      fore.position.y = -M.up;
      var hand = new THREE.Group(); hand.position.y = -M.fore - M.fistDrop; fore.add(hand);
      var h = makeHand(side < 0);
      hand.add(h.group);
      parts.arm.push({ side: side, shoulder: sh, elbow: fore, wrist: hand, hand: h.group, palm: h.palm, joints: h.joints, rf: 0, cf: 0, pa: 0, ff: 0, th: 0, sc: 0, sx: 0.05, sz: side * 0.14, ex: -0.28, ez: 0 });
    });

    // the face: group each eye with its highlights and give it eyelids; hinge the brows; make the mouth scalable
    var lidGeoU = new THREE.SphereGeometry(1, 32, 16, 0, TAU, 0, Math.PI / 2), lidGeoL = new THREE.SphereGeometry(1, 32, 16, 0, TAU, Math.PI / 2, Math.PI / 2);
    parts.eye = [];
    [['eye_right', 'eye_right_highlight', 'eye_right_glint', -1], ['eye_left', 'eye_left_highlight', 'eye_left_glint', 1]].forEach(function (e) {
      var eye = N[e[0]], hi = N[e[1]], gl2 = N[e[2]];
      var g = new THREE.Group(); g.position.copy(eye.position); N.head.add(g);
      var base = g.position.clone();
      [eye, hi, gl2].forEach(function (o) { o.position.sub(base); g.add(o); });
      var lids = new THREE.Group(); lids.scale.set(eye.scale.x * 1.07, eye.scale.y * 1.07, eye.scale.z * 1.16); g.add(lids);
      var up = new THREE.Mesh(lidGeoU, white), lo = new THREE.Mesh(lidGeoL, white);
      up.rotation.x = -Math.PI / 2; lo.rotation.x = Math.PI / 2;
      lids.add(up, lo);
      parts.eye.push({ group: g, base: base, eye: eye, hi: hi, glint: gl2, up: up, lo: lo, scale: eye.scale.clone(), side: e[3] });
    });
    parts.brow = [];
    [['brow_right', -1], ['brow_left', 1]].forEach(function (b) {
      var brow = N[b[0]], anchor = new THREE.Group();
      anchor.position.copy(brow.position); N.head.add(anchor);
      brow.position.set(0, 0, 0); anchor.add(brow);
      parts.brow.push({ anchor: anchor, base: anchor.position.clone(), side: b[1] });
    });
    var mouthG = new THREE.Group(); mouthG.position.copy(N.mouth.position); N.head.add(mouthG);
    N.tongue.position.sub(N.mouth.position); N.mouth.position.set(0, 0, 0);
    mouthG.add(N.mouth, N.tongue);
    parts.mouth = { group: mouthG, tongue: N.tongue, mouth: N.mouth };
    parts.cheek = [{ mesh: N.cheek_right, scale: N.cheek_right.scale.clone() }, { mesh: N.cheek_left, scale: N.cheek_left.scale.clone() }];

    var dropMat = new THREE.MeshPhysicalMaterial({ color: 0x9fdfff, roughness: 0.15, transmission: 0, transparent: true, opacity: 0.85, emissive: 0x1a4a70 });
    var tear = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), dropMat);
    tear.scale.set(0.009, 0.014, 0.008); tear.position.set(N.eye_right.position.x - 0.02, N.eye_right.position.y - 0.075, 0.052); tear.visible = false;
    N.head.add(tear);
    var sweat = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), dropMat);
    sweat.scale.set(0.011, 0.017, 0.009); sweat.position.set(0.215, 0.19, 0.075); sweat.visible = false;
    N.head.add(sweat);
    parts.tear = tear; parts.sweat = sweat;

    // the file's posed arms and left hand are not needed: the rig poses its own
    ['arm_right', 'arm_left', 'arm_right_cap_a', 'arm_right_cap_b', 'arm_left_cap_a', 'arm_left_cap_b', 'fist_right', 'fist_left',
     'finger_curled_right_0', 'finger_curled_right_1', 'finger_curled_right_2', 'thumb_right', 'finger_index_right',
     'finger_curled_left_0', 'finger_curled_left_1', 'finger_curled_left_2', 'thumb_left'].forEach(function (k) { if (N[k] && N[k].parent) N[k].parent.remove(N[k]); });

    scene.add(rig);
    rigReady = true;
  }

  function loadModel(onProgress) {
    return fetch(MODEL_URL, { cache: 'force-cache' }).then(function (r) {
      if (!r.ok) throw new Error('the 3D file answered ' + r.status);
      var total = +r.headers.get('content-length') || 0;
      if (!/\.txt(\?|$)/i.test(MODEL_URL)) {                         // a binary .glb
        if (!r.body || !r.body.getReader) return r.arrayBuffer();
        var rd = r.body.getReader(), chunks = [], got2 = 0;
        return rd.read().then(function step2(res) {
          if (res.done) { var all = new Uint8Array(got2), off = 0; chunks.forEach(function (c) { all.set(c, off); off += c.length; }); return all.buffer; }
          chunks.push(res.value); got2 += res.value.length;
          if (onProgress) onProgress(got2, total);
          return rd.read().then(step2);
        });
      }
      if (!r.body || !r.body.getReader || !window.TextDecoder) return r.text();
      var reader = r.body.getReader(), dec = new TextDecoder(), parts = [], got = 0;   // stream it so the page can show progress
      return reader.read().then(function step(res) {
        if (res.done) { parts.push(dec.decode()); return parts.join(''); }
        got += res.value.length; parts.push(dec.decode(res.value, { stream: true }));
        if (onProgress) onProgress(got, total);
        return reader.read().then(step);
      });
    }).then(function (txt) {
      if (typeof txt !== 'string') { assembleRig(buildGLTF(parseGLB(txt))); return; }
      var clean = txt.replace(/\s+/g, '');
      if (!/^[A-Za-z0-9+\/=]+$/.test(clean.slice(0, 64))) throw new Error('the 3D file came back as something else');
      var bin = atob(clean), n = bin.length, bytes = new Uint8Array(n);
      for (var i = 0; i < n; i++) bytes[i] = bin.charCodeAt(i);
      assembleRig(buildGLTF(parseGLB(bytes.buffer)));
    });
  }

  // a small studio environment for the clear-coat reflections: bright above, dark floor, blue-white around
  function makeEnv() {
    try {
      var mk = function (top, mid, bot) {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
        gr.addColorStop(0, top); gr.addColorStop(0.5, mid); gr.addColorStop(1, bot);
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return c;
      };
      var cube = new THREE.CubeTexture([mk('#eaf6ff', '#6fb0e6', '#0a1a30'), mk('#eaf6ff', '#6fb0e6', '#0a1a30'),
        mk('#ffffff', '#f4faff', '#dbeeff'), mk('#12263f', '#08131f', '#04080f'),
        mk('#f2f9ff', '#7dbbee', '#0a1a30'), mk('#dceeff', '#5a98d0', '#0a1a30')]);
      cube.needsUpdate = true;
      if ('colorSpace' in cube) cube.colorSpace = THREE.SRGBColorSpace;
      var pm = new THREE.PMREMGenerator(renderer);
      pm.compileCubemapShader();
      var env = pm.fromCubemap(cube).texture;
      pm.dispose();
      return env;
    } catch (e) { return null; }
  }

  // Adaptive quality: the page watches its own frame time and steps down (and back up) through these tiers,
  // so a laptop on battery or a phone gets a smooth Loop instead of a pretty slideshow.
  // YATICORP change, not in the shipped package: the tiers were 1.5 / 1.25 / 1 / 0.8, so even the best one drew Loop
  // at 1.5 pixels per CSS pixel and the browser stretched it to fit a 2x laptop or 3x phone screen, which is the blur.
  // Each tier is still capped by the screen's own ratio, and the floor is 1: below that every pixel is stretched.
  // YATICORP change (2026-10-14, "loop walker looks blur in mobile view"): a phone has tiers of its own. Its screen
  // is 2.5-3x, so 1.5x was stretched nearly double and 1x was mush; the phone tiers go from 3x down to 1.5x, never
  // lower. The sharpness is paid for in the shadows: plain PCF from a smaller map, drawn every other frame (see
  // frame). Edge smoothing stays: without it the outline of the head and feet showed steps. It starts at 2x ("it is
  // getting stuck in between": starting at 3x with soft shadows, a mid-range Android stuttered for seconds on every
  // page) and goes sharper while Loop stands still, once the phone has kept up.
  var TIERS = coarse ? [
    { dpr: 3,    shadow: 768,  fcEvery: 2 },
    { dpr: 2.5,  shadow: 768,  fcEvery: 2 },
    { dpr: 2,    shadow: 512,  fcEvery: 3 },
    { dpr: 1.5,  shadow: 512,  fcEvery: 3 }
  ] : [
    { dpr: 3,    shadow: 1024, fcEvery: 2 },
    { dpr: 2,    shadow: 1024, fcEvery: 2 },
    { dpr: 1.5,  shadow: 768,  fcEvery: 2 },
    { dpr: 1,    shadow: 512,  fcEvery: 3 }
  ];
  var START_TIER = coarse ? 2 : 0;
  var quality = TIERS[START_TIER], tier = START_TIER, frameAvg = 16, tierSince = 0, tierHold = 0, slowSince = 0, failedAt = [];
  function setTier(n) {
    n = clamp(n, 0, TIERS.length - 1);
    if (n === tier && quality === TIERS[n]) return;
    tier = n; quality = TIERS[n]; tierSince = performance.now(); tierHold = 0;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
    sizeCanvas(true);                                                             // YATICORP change: see clipBox
    if (key) {
      key.shadow.mapSize.set(quality.shadow, quality.shadow);
      if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    }
    renderer.shadowMap.needsUpdate = true;
  }
  // YATICORP change, not in the shipped package: the shipped rule stepped down on one long frame (any busy moment in
  // the page — a route change, a big render — cost a tier) and stepped back up only past ~90 fps, which a 60 Hz screen
  // never reaches, so Loop got blurrier and stayed that way. Now it steps down only after 3 s of real slowness, steps
  // back up after 8 s at a steady 60 fps, and does not retry a tier that failed within the last 2 minutes.
  // Standing still and silent: a moment when a hitch goes unseen (see watchFrame).
  function atRest() { return !guide && !talk.on && walker.v < 0.02 * figW(); }
  function watchFrame(dt) {                                       // dt in seconds, real frames only
    var ms = dt * 1000, now = performance.now();
    // YATICORP change (2026-10-15, smooth scrolling): no change of tier within a second of a scroll. A change resizes
    // the drawing buffer and the shadow map, a hitch of its own, and it landed on the next swipe.
    if (now - lastScrollAt < 1000) { slowSince = 0; return; }
    frameAvg += (ms - frameAvg) * 0.05;
    tierHold = (now - tierSince) / 1000;                           // wall-clock, so a very slow page still reacts in seconds
    slowSince = frameAvg > 24 ? (slowSince || now) : 0;           // below ~40 fps since when
    // YATICORP change: a phone steps down after 1.5 s of slowness, not 3; and a tier that proved too slow is tried
    // again after 10 minutes, not 2 — retrying it every two minutes was a stutter every two minutes.
    if (slowSince && now - slowSince > (coarse ? 1500 : 3000) && tier < TIERS.length - 1) { failedAt[tier] = now; slowSince = 0; setTier(tier + 1); }
    // YATICORP change: a step up rebuilds the drawing buffers, which is a visible hitch (733 ms measured mid-walk on
    // 2026-10-14), so it waits until Loop is standing still and quiet.
    else if (frameAvg < 18 && tierHold > 8 && tier > 0 && atRest() && (failedAt[tier - 1] === undefined || now - failedAt[tier - 1] > 600000)) setTier(tier - 1);
  }
  function initGL() {
    if (!window.THREE) return false;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = coarse ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;   // YATICORP change: see TIERS
    renderer.shadowMap.autoUpdate = false;
    renderer.info.autoReset = false;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(18, 1, 1, 10000);
    scene.environment = makeEnv();
    scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x061224, scene.environment ? 0.9 : 1.6));
    key = new THREE.DirectionalLight(0xffffff, scene.environment ? 1.9 : 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(quality.shadow, quality.shadow);                       // YATICORP change: the starting tier's size
    key.shadow.bias = -0.0012;
    key.shadow.normalBias = 0.6;
    scene.add(key, key.target);
    var rim = new THREE.DirectionalLight(0x9fdcff, 1.6);
    rim.position.set(-3, 2.5, -4);
    scene.add(rim);
    var fill = new THREE.DirectionalLight(0xdff2ff, 0.7);
    fill.position.set(4, 1, 3);
    scene.add(fill);

    var floor = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.ShadowMaterial({ opacity: 0.45, color: 0x00060e }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    parts.printMat = new THREE.MeshBasicMaterial({ color: 0x4fc0f2, transparent: true, opacity: 0.3, depthWrite: false });
    parts.printGeo = new THREE.PlaneGeometry(1, 1);

    pos = new THREE.Vector3(); tmpV = new THREE.Vector3(); headV = new THREE.Vector3();
    ray = new THREE.Raycaster(); ndc = new THREE.Vector2();
    floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    return true;
  }

  /* ================= face cam: a second renderer that stays in front of the face ================= */
  var fcWrap = $('lw-facecam'), fcCanvas = $('lw-fc-canvas'), fcMood = $('lw-fc-mood');
  var fcCtx = null, pRenderer = null, pCam, fcPos, fcLook, fcDir, fcHead, fcInit = false, fcSize = 148, fcFrame = 0, fcSizeV = new THREE.Vector2();
  function initFaceCam() {
    try { fcCtx = fcCanvas.getContext('2d'); } catch (e) { fcCtx = null; }
    if (!fcCtx) { fcWrap.classList.add('off'); return; }
    pRenderer = true;                                            // the face cam is on: it borrows the main renderer, so there is no second GL context to feed
    pCam = new THREE.PerspectiveCamera(24, 1, 1, 10000);
    fcPos = new THREE.Vector3(); fcLook = new THREE.Vector3(); fcDir = new THREE.Vector3(); fcHead = new THREE.Vector3();
  }
  function sizeFaceCam() {
    if (!fcCtx) return;
    fcSize = W < 640 ? 92 : 148;
    fcWrap.style.setProperty('--fc', fcSize + 'px');
    var pr = Math.min(window.devicePixelRatio || 1, 2);
    fcCanvas.width = Math.round(fcSize * pr); fcCanvas.height = Math.round(fcSize * pr);
  }
  // Rendered by the main renderer into a corner of its canvas, then copied out — before the main view is drawn over it.
  // Every other frame is plenty for a picture this small.
  function renderFaceCam(dt) {
    if (!fcCtx || !P.facecam || !rigReady) return;
    fcFrame++;
    if (fcFrame % quality.fcEvery) return;
    var h = figW();
    parts.head.getWorldPosition(fcHead);
    parts.head.getWorldDirection(fcDir);
    fcDir.y *= 0.4; fcDir.normalize();
    var dist = R.headS * h * 4.3;
    tmpV.copy(fcHead).addScaledVector(fcDir, dist); tmpV.y += R.headS * h * 0.1;
    var k = fcInit ? ease(dt * quality.fcEvery, 9) : 1;
    fcPos.lerp(tmpV, k);
    tmpV.copy(fcHead); tmpV.y -= R.headS * h * 0.06;
    fcLook.lerp(tmpV, k);
    fcInit = true;
    pCam.near = h * 0.02; pCam.far = h * 40;
    pCam.position.copy(fcPos); pCam.lookAt(fcLook); pCam.updateProjectionMatrix();
    var S = Math.min(fcSize, W, H), pr = renderer.getPixelRatio(), ch = renderer.domElement.height;
    renderer.getSize(fcSizeV);
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, S, S); renderer.setScissor(0, 0, S, S);
    renderer.render(scene, pCam);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, fcSizeV.x, fcSizeV.y); renderer.setScissor(0, 0, fcSizeV.x, fcSizeV.y);
    fcCtx.clearRect(0, 0, fcCanvas.width, fcCanvas.height);
    fcCtx.drawImage(renderer.domElement, 0, ch - S * pr, S * pr, S * pr, 0, 0, fcCanvas.width, fcCanvas.height);
  }

  /* ================= screen <-> floor ================= */
  /* YATICORP change, not in the shipped package: Loop keeps off the page's navigation bars, the elements matching
     opts.navBars (default [data-loop-skip]; false turns it off). It never explains anything in them (explainTarget),
     and it never stands or talks on top of them: a bar across the top of the screen pushes its band down far enough
     for the bubble to fit under the bar, one across the bottom (the phone's tab bar) keeps its feet above it, and one
     down the left side (the desktop sidebar) keeps it to the right. Measured on resize and a few times a second,
     because the bars come and go with the page and the screen width. */
  var NAV_BARS = opts.navBars === false ? null : (opts.navBars || '[data-loop-skip]');
  var navInset = { top: 0, bottom: 0, left: 0 };
  function measureNav() {
    navInset.top = navInset.bottom = navInset.left = 0;
    if (!NAV_BARS) return;
    var bars = document.querySelectorAll(NAV_BARS);
    for (var i = 0; i < bars.length; i++) {
      var r = bars[i].getBoundingClientRect();
      if (!r.width || !r.height) continue;                                        // not shown at this width
      if (r.width > W * 0.5 && r.height < H * 0.3) {                              // a bar across the screen
        if (r.top <= 2) navInset.top = Math.max(navInset.top, r.bottom);
        else if (r.bottom >= H - 40) navInset.bottom = Math.max(navInset.bottom, H - r.top);
      } else if (r.left <= 2 && r.width < W * 0.4 && r.height > H * 0.6) {        // a sidebar
        navInset.left = Math.max(navInset.left, r.right);
      }
    }
  }
  var BUBBLE_ROOM = 120;                                                          // a three-line bubble and its tail

  /* YATICORP change, not in the shipped package: Loop keeps off open dropdowns, the elements matching opts.avoid
     (default: an open list or menu, [role="listbox"], [role="menu"], or anything tagged [data-loop-avoid]; false turns
     it off). Following the cursor onto an open list, it stops beside the list instead of walking over it; standing
     where one opens, it steps out of the way. It explains nothing inside one (explainTarget), and stops talking if its
     bubble would cover one. Measured several times a second, since a dropdown opens and closes with a click. */
  var AVOID = opts.avoid === false ? null : (opts.avoid || '[role="listbox"], [role="menu"], [data-loop-avoid]');
  /* YATICORP change, not in the shipped package (2026-10-12): Loop never stands on a search box either (opts.keepOff,
     default input[type="search"], [role="searchbox"] or [data-loop-keep-off]; false turns it off). It stood on the
     Scholarships search and hid what the student was typing. Only where it stands and walks: a search box is always
     on the page, so unlike an open dropdown it does not hush Loop or hold back what Loop explains. Measured as the
     whole bar a box sits in (its icon and clear button too), when the box fills that bar. The same holds for a page's
     own tab strip (a nav or tab list inside <main>: Jobs, Games & Competitions, My learning): to the account owner a
     tab strip is a nav bar too, and Loop stood on the Jobs tabs on a phone (2026-10-13). The app's fixed bars are
     outside <main> and kept clear by NAV_BARS below. */
  var KEEP_OFF = opts.keepOff === false ? null : (opts.keepOff || 'input[type="search"], [role="searchbox"], [data-loop-keep-off], main nav, main [role="tablist"], main [role="navigation"]');
  var avoidRects = [], keepRects = [], standRects = [];                           // standRects: both, for where it stands
  function onScreen(r) { return !(r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W); }
  function measureAvoid() {
    avoidRects.length = 0; keepRects.length = 0; standRects.length = 0;
    var els, i, r;
    if (AVOID) {
      els = document.querySelectorAll(AVOID);
      for (i = 0; i < els.length; i++) {
        r = els[i].getBoundingClientRect();
        if (!onScreen(r)) continue;                                               // shut, or off screen
        // list: an open list or menu, the one thing a standing Loop gets out of the way of (see update, nowhere)
        avoidRects.push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom, list: els[i].matches('[role="listbox"], [role="menu"]') });
      }
    }
    if (KEEP_OFF) {
      els = document.querySelectorAll(KEEP_OFF);
      for (i = 0; i < els.length; i++) {
        r = els[i].getBoundingClientRect();
        if (!onScreen(r)) continue;
        var box = { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
        var bar = els[i].parentElement && els[i].parentElement.getBoundingClientRect();
        if (bar && bar.height <= r.height + 48 && bar.width <= W) {                // the bar the box sits in
          box = { x0: Math.min(box.x0, bar.left), y0: Math.min(box.y0, bar.top), x1: Math.max(box.x1, bar.right), y1: Math.max(box.y1, bar.bottom) };
        }
        keepRects.push(box);
      }
    }
    for (i = 0; i < avoidRects.length; i++) standRects.push(avoidRects[i]);
    for (i = 0; i < keepRects.length; i++) standRects.push(keepRects[i]);
  }
  // The figure on the screen when its feet are at (sx, sy): as wide as its arms, as tall as itself, and a little room.
  function figureHits(sx, sy, r) {
    var fh = figH(), half = fh * 0.38 + 8;
    return sx + half > r.x0 && sx - half < r.x1 && sy + 8 > r.y0 && sy - fh - 8 < r.y1;
  }
  function inTheWay(sx, sy) {
    for (var i = 0; i < standRects.length; i++) if (figureHits(sx, sy, standRects[i])) return standRects[i];
    return null;
  }
  // How far Loop walks between two points on the screen, on its floor: the camera looks along the floor at a low
  // angle, so a step down the screen is several times the walk of the same step across it.
  var walkA = null, walkB = null;
  function walkDist(ax, ay, bx, by) {
    if (!walkA) { walkA = new THREE.Vector3(); walkB = new THREE.Vector3(); }
    toFloor(ax, ay, walkA); toFloor(bx, by, walkB);
    return Math.hypot(walkB.x - walkA.x, walkB.z - walkA.z);
  }
  // The place to stand nearest (sx, sy), as walked, that covers no open dropdown and is inside Loop's band: beside
  // it, under it or above it. Nearest to (fromX, fromY) instead when given (where Loop is now), so a cursor moving about inside an
  // open list keeps Loop on its own side rather than sending it from one side to the other. Null when there is no
  // such place, and then Loop stays where it is.
  function clearOfAvoid(sx, sy, fromX, fromY) {
    var b = band();
    sx = clamp(sx, b.x0, b.x1); sy = clamp(sy, b.y0, b.y1);
    if (!inTheWay(sx, sy)) return { x: sx, y: sy };
    // 30px clear of the edge, so Loop still covers nothing when it stops a little short of the spot.
    var fh = figH(), half = fh * 0.38 + 30, best = null, bestD = Infinity;
    var ox = fromX === undefined ? sx : fromX, oy = fromY === undefined ? sy : fromY;
    for (var i = 0; i < standRects.length; i++) {
      var r = standRects[i];
      var spots = [[r.x0 - half, sy], [r.x1 + half, sy], [sx, r.y1 + fh + 30], [sx, r.y0 - 30]];
      for (var j = 0; j < spots.length; j++) {
        var x = spots[j][0], y = spots[j][1];
        if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1 || inTheWay(x, y)) continue;
        var d = walkDist(ox, oy, x, y);
        if (d < bestD) { bestD = d; best = { x: x, y: y }; }
      }
    }
    return best;
  }
  // Whether walking straight from (ax, ay) to (bx, by) would take the figure over an open dropdown.
  function pathHits(ax, ay, bx, by) {
    var n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 24));
    for (var i = 1; i <= n; i++) { var k = i / n; if (inTheWay(ax + (bx - ax) * k, ay + (by - ay) * k)) return true; }
    return false;
  }
  // When that walk would cross one, a corner of it to go round by: the one making the shortest way there. { stay }
  // when every way round is blocked too, and null when the straight walk is clear.
  function detour(ax, ay, bx, by) {
    if (!pathHits(ax, ay, bx, by)) return null;
    var b = band(), fh = figH(), half = fh * 0.38 + 12, best = null, bestD = Infinity;
    for (var i = 0; i < standRects.length; i++) {
      var r = standRects[i];
      var corners = [[r.x0 - half, r.y1 + fh + 12], [r.x1 + half, r.y1 + fh + 12], [r.x0 - half, r.y0 - 12], [r.x1 + half, r.y0 - 12]];
      for (var j = 0; j < corners.length; j++) {
        var x = clamp(corners[j][0], b.x0, b.x1), y = clamp(corners[j][1], b.y0, b.y1);
        if (inTheWay(x, y) || pathHits(ax, ay, x, y)) continue;
        var d = walkDist(ax, ay, x, y) + walkDist(x, y, bx, by);
        if (d < bestD) { bestD = d; best = { x: x, y: y }; }
      }
    }
    return best || { stay: true };
  }
  var tucked = false;                                                             // faded out: see setTucked
  var nowhereLast = false;                                                        // an open dropdown left it nowhere to stand

  /* YATICORP change, not in the shipped package: a popup over the page (a dialog, a confirmation, the day's question,
     a celebration, a full-screen menu) puts Yati out of sight until it closes. Its speech bubble is drawn above the
     page's own layers, so it used to talk on top of the popup (2026-10-10). What it was about to say waits: the
     greeting, and a page's own request (api.explain), go ahead once the popup has gone. A popup is a modal dialog
     (opts.popups, default [role="dialog"][aria-modal="true"], [role="alertdialog"] or [data-loop-popup]; false
     turns this off), or, for one without those, whatever is fixed to the screen over nearly all of it at its centre. */
  var POPUPS = opts.popups === false ? null : (opts.popups || '[role="dialog"][aria-modal="true"], [role="alertdialog"], [data-loop-popup]');
  var popupOpen = false, greetPending = false;
  function measurePopup() {
    popupOpen = false;
    if (!POPUPS) return;
    var els = document.querySelectorAll(POPUPS);
    for (var i = 0; i < els.length; i++) { var r = els[i].getBoundingClientRect(); if (r.width > 4 && r.height > 4) { popupOpen = true; return; } }
    for (var el = document.elementFromPoint(W / 2, H / 2); el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      if (root.contains(el)) break;
      if (getComputedStyle(el).position === 'fixed') {
        var b = el.getBoundingClientRect();
        if (b.width >= W * 0.9 && b.height >= H * 0.85) popupOpen = true;
        break;
      }
    }
  }
  // Out of sight (faded, silent) while a popup is open or a dropdown leaves no room; back when neither does.
  function setTucked(on) {
    if (on === tucked) return;
    tucked = on;
    root.classList.toggle('lw-tucked', tucked);
    if (tucked) {
      if (guide) {
        var cut = guide;
        endGuide(false);
        if (cut.fromPage && !cut.shown && cut.el && cut.el.isConnected) queuedGuide = cut.el;   // said once it is back
      } else hush();
    } else if (greetPending) {
      greetPending = false;
      setTimeout(greet, 600);
    }
  }
  // The hello, once Yati is on screen: the package's own, made a function so a popup can hold it back (setTucked).
  // Its default words fit the screen: a cursor to follow, or a finger.
  var GREETING_TEXT = coarse
    ? "Hi, I'm Yati! Drag your finger and I'll follow \u2014 tap anything and I'll explain it."
    : "Hi, I'm Yati! Move the cursor and I'll follow \u2014 pause on anything and I'll explain it.";
  function greet() {
    if (guide || opts.greeting === false) return;
    var g = opts.greeting || {};
    var el = g.selector ? document.querySelector(g.selector) : null;
    if (el) { EXPLAIN.__greeting = { label: g.label || 'Hello', text: g.text || GREETING_TEXT, emo: g.emo || 'joy', gesture: g.gesture || 'wave', flash: true }; startGuide('__greeting', el); }
    else { impulse('joy', 1, 1.6); micro.flash = 1; gestureOverride = { g: 'wave', until: t + 1.6 }; say(g.label || 'Hello', g.text || GREETING_TEXT, 2.2, g.emo || 'joy'); }
  }
  var bubbleBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
  function bubbleOverDropdown() {
    for (var i = 0; i < avoidRects.length; i++) {
      var r = avoidRects[i];
      if (bubbleBox.x1 > r.x0 && bubbleBox.x0 < r.x1 && bubbleBox.y1 > r.y0 && bubbleBox.y0 < r.y1) return true;
    }
    return false;
  }
  function band() {
    var fh = figH(), mx = Math.max(18, W * 0.035) + fh * 0.3;
    var y1 = H - (navInset.bottom ? navInset.bottom + 14 : Math.max(18, H * 0.035));
    var y0 = Math.max(H * 0.32, fh * 1.25, navInset.top ? navInset.top + fh + BUBBLE_ROOM : 0);
    return { x0: Math.max(mx, navInset.left ? navInset.left + fh * 0.45 : 0), x1: W - mx, y0: Math.min(y0, y1 - fh * 0.25), y1: y1 };
  }
  function toFloor(sx, sy, out) {
    var b = band();
    sx = clamp(sx, b.x0, b.x1); sy = clamp(sy, b.y0, b.y1);
    ndc.set((sx / W) * 2 - 1, -(sy / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(floorPlane, out)) out.set(0, 0, 0);
    return out;
  }
  var scr = { x: 0, y: 0 };
  function toScreen(v) {
    tmpV.copy(v).project(camera);
    scr.x = (tmpV.x + 1) / 2 * W; scr.y = (1 - tmpV.y) / 2 * H;
    return scr;
  }
  // YATICORP change, not in the shipped package: mode 'stand'. Loop stands in a bottom corner (P.side, 'right' or
  // 'left') and never walks: not after the cursor, not over to what it explains (it points at it from the corner),
  // not away when poked. P.standAbove is a selector for something fixed at the bottom of the screen — the phone's
  // bottom bar — that Loop stands above while it is showing; looked up twice a second, not every frame.
  var standClearY = 0, standCheckAt = -1;
  function standSpot(out) {
    if (t >= standCheckAt) {
      standCheckAt = t + 0.5; standClearY = 0;
      var el = P.standAbove ? document.querySelector(P.standAbove) : null;
      var r = el && el.getBoundingClientRect();
      if (r && r.height > 0 && r.top < H) standClearY = r.top;
    }
    var b = band(), y = b.y1;
    if (standClearY) y = Math.min(y, standClearY - Math.max(10, H * 0.02));
    return toFloor(P.side === 'left' ? b.x0 : b.x1, y, out);
  }
  /* YATICORP change, not in the shipped package (2026-10-15, "loop walker is hiding the background"): standing in its
     corner, Loop covers whatever is under it, and at the end of a page that is content the page cannot scroll out
     from under it. --yati-room on <html> is how far up from the bottom of the screen Loop reaches (its head, and a
     little air), so the page can leave that much room after its last line (StudentLayout). 0 while hidden, removed
     once destroyed; updated with the canvas, a few times a second. */
  var roomShown = -1;
  function setRoom(room) {
    if (room === undefined) {
      room = 0;
      if (P.mode === 'stand' && !hidden && rigReady) room = Math.max(0, Math.round(H - (toScreen(pos).y - figH() * 1.2) + 12));
    }
    if (Math.abs(room - roomShown) < 2) return;
    roomShown = room;
    document.documentElement.style.setProperty('--yati-room', room + 'px');
  }
  // Which way to point from the corner: -1 when the thing is to Loop's left on screen, 1 when to its right.
  function standPoint(el) {
    var r = el.getBoundingClientRect();
    return (r.left + r.right) / 2 < toScreen(pos).x ? -1 : 1;
  }
  /* YATICORP change, not in the shipped package (2026-10-15, "make the entire website smooth scrolling"): standing in
     its corner (mode 'stand', no face cam), Loop is drawn into a canvas just the size of that corner, not one over the
     whole screen. A full-screen see-through layer redrawn many times a second is what a phone's graphics chip must
     blend over the page on every frame, scrolling included; Loop takes up about a tenth of it. The camera still frames
     the whole screen (setViewOffset renders only the corner's share of that view, in render), so Loop looks and sits
     exactly as before, and every screen position in this file (toScreen, toFloor) is unchanged. */
  var clipBox = null;                                                             // { x, y, w, h } in CSS px, or null
  function cornerBox() {
    var feet = toScreen(pos), fh = figH();
    var x0 = Math.max(0, Math.floor(feet.x - fh * 0.9)), x1 = Math.min(W, Math.ceil(feet.x + fh * 0.9));
    var y0 = Math.max(0, Math.floor(feet.y - fh * 1.45)), y1 = Math.min(H, Math.ceil(feet.y + fh * 0.35));
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  }
  function sizeCanvas(force) {
    if (!renderer) return;
    var box = (P.mode === 'stand' && !P.facecam && rigReady) ? cornerBox() : null;
    if (!force && (box === null) === (clipBox === null) && (!box || (Math.abs(box.x - clipBox.x) < 2 && Math.abs(box.y - clipBox.y) < 2 && Math.abs(box.w - clipBox.w) < 2 && Math.abs(box.h - clipBox.h) < 2))) return;
    clipBox = box;
    var st = glCanvas.style;
    if (box) { st.left = box.x + 'px'; st.top = box.y + 'px'; st.width = box.w + 'px'; st.height = box.h + 'px'; renderer.setSize(box.w, box.h, false); }
    else { st.left = st.top = st.width = st.height = ''; renderer.setSize(W, H, false); }
  }
  function keepInBand() {
    if (!ready) return;
    var s = toScreen(pos), b = band();
    if (s.x < b.x0 || s.x > b.x1 || s.y < b.y0 || s.y > b.y1) toFloor(s.x, s.y, pos);
  }
  function layout() {
    if (!ready) return;
    var tilt = P.tilt * D2R, fov = 18;
    var d = H / (2 * Math.tan(fov / 2 * D2R));
    camera.fov = fov; camera.aspect = W / H;
    camera.near = d * 0.05; camera.far = d * 6;
    camera.position.set(0, Math.sin(tilt) * d, Math.cos(tilt) * d);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    if (!refSpot) refSpot = new THREE.Vector3();                  // YATICORP change: see figW
    toFloor(W / 2, H * 0.7, refSpot); refDepth = depthOf(refSpot);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
    sizeCanvas(true);                                                             // YATICORP change: see clipBox
    sizeFaceCam();
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, quality.dpr);
    W = window.innerWidth || document.documentElement.clientWidth || 800;
    H = window.innerHeight || document.documentElement.clientHeight || 600;
    measureNav();
    measureAvoid();
    measurePopup();
    layout();
    if (ready) keepInBand();
  }

  /* ================= speech ================= */
  var bubble = $('lw-bubble');
  var bLabel = $('lw-b-name'), bFeel = $('lw-b-feel');
  var bShown = $('lw-b-shown'), bRest = $('lw-b-rest'), bSr = $('lw-b-sr');
  var bubbleOn = false, bubbleUntil = 0, bubbleSize = { w: 0, h: 0 };
  var saidAt = -1e9, saidFrom = null;                                     // YATICORP change: see movedOn
  var TYPE_CPS = 25;                                                      // average letters per second while speaking

  // Letter-by-letter speech: each character gets a reveal time; punctuation adds a breath before the next word.
  function revealSchedule(text) {
    var times = [], tt = 0, base = 1 / TYPE_CPS;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      tt += base * (0.75 + 0.5 * Math.random());
      times.push(tt);
      if (c === ',' || c === ';' || c === ':') tt += 0.16;
      else if (c === '.' || c === '!' || c === '?' || c === '\u2014' || c === '\u2026') tt += 0.3;
    }
    return { times: times, dur: tt };
  }
  /* YATICORP change, not in the shipped package (2026-10-15, "the text should speedly visible and then it should
     invisible when user moves"): the whole line shows at once instead of being typed out at 25 letters a second, a
     long one took five seconds to read in full. The mouth still moves through it, squeezed into MOUTH_MAX seconds. It
     stays up a few seconds, about as long as the line takes to read and never over 5.5 s ("for few seconds and then
     the message should disappear"), unless the student moves on first (movedOn). */
  var MOUTH_MAX = 1.8;
  function readTime(text) { return clamp(1.2 + text.length / 24, 2.5, 5.5); }
  function say(label, text, secs, emo) {
    if (tucked || hidden) return;                                                 // YATICORP change: see setTucked, api.hide
    bLabel.textContent = label;
    bFeel.textContent = emo ? ' \u00B7 ' + EMO[emo].name.toLowerCase() : '';
    bShown.textContent = text;
    bRest.textContent = '';
    bSr.textContent = label + ': ' + text;                                 // screen readers hear it once, not per letter
    bubbleSize.w = bubble.offsetWidth; bubbleSize.h = bubble.offsetHeight;
    bubble.classList.add('done');                                          // no typing caret
    bubble.classList.add('on');
    bubbleOn = true;
    var sch = revealSchedule(text), squeeze = Math.min(1, MOUTH_MAX / Math.max(sch.dur, 0.01));
    talk.text = text; talk.times = sch.times.map(function (x) { return x * squeeze; }); talk.dur = sch.dur * squeeze;
    talk.t = 0; talk.n = 0; talk.on = true;
    talk.start = performance.now();
    if (reduced) { revealTo(text.length); finishTalk(); }
    bubbleUntil = secs ? t + Math.max(secs, readTime(text)) : Infinity;
    saidAt = performance.now(); saidFrom = pointer.seen ? { x: pointer.x, y: pointer.y } : null;
  }
  function revealTo(n) { talk.n = n; }                                    // YATICORP change: the mouth's place; the words are all shown
  function finishTalk() { talk.on = false; bubble.classList.add('done'); }
  function hush() { bubble.classList.remove('on'); bubbleOn = false; talk.on = false; }

  // YATICORP change, not in the shipped package: on a phone or tablet Loop says nothing while something is drawn
  // over it — a dialog's dimmed backdrop, most often. The bubble sits a layer above everything, so it used to float
  // over the dialog by itself while Loop stood hidden behind it. Asks the page what is on top at Loop's middle, and
  // compares the outermost layer there with Loop's own; at most every 0.3 s, since it reads styles.
  var coverAt = -1, covered = false;
  function hiddenOnTouch() {
    if (!(coarse || W < 640) || !rigReady) return false;
    if (coverAt >= 0 && t - coverAt < 0.3) return covered;
    coverAt = t; covered = false;
    var feet = toScreen(pos), x = (feet.x + headScreen.x) / 2, y = (feet.y + headScreen.y) / 2;
    if (!(x >= 0 && y >= 0 && x < W && y < H)) return false;
    var base = parseInt(getComputedStyle(root).getPropertyValue('--lw-z'), 10) || 40, layer = null;
    for (var n = document.elementFromPoint(x, y); n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.position !== 'static' && cs.zIndex !== 'auto') layer = parseInt(cs.zIndex, 10);
    }
    covered = layer !== null && layer > base;
    return covered;
  }
  function placeBubble() {
    if (!bubbleOn || !ready) return;
    var bw = bubbleSize.w, bh = bubbleSize.h;
    var left = clamp(headScreen.x - bw / 2, 12, W - bw - 12);
    var topMin = navInset.top + 12;                                                // YATICORP change: never over a nav bar (see band)
    var top = clamp(headScreen.y - bh - 16, topMin, Math.max(topMin, H - navInset.bottom - bh - 12));
    // YATICORP change (2026-10-16): the words keep off a page's own tab strip and search bar too (keepRects), not
    // only Yati's feet. Standing in the corner on a laptop, the bubble over its head covered the Jobs tabs for the
    // seconds it spoke. It lifts above whatever it would cover, its tail still pointing down at Yati; it never moves
    // lower, where it would cover Yati's face, and stays put when there is no room above.
    for (var pass = 0; pass < 3; pass++) {
      var under = null;
      for (var ki = 0; ki < keepRects.length; ki++) {
        var kr = keepRects[ki];
        if (left < kr.x1 && left + bw > kr.x0 && top < kr.y1 && top + bh > kr.y0) { under = kr; break; }
      }
      if (!under || under.y0 - bh - 8 < topMin) break;
      top = under.y0 - bh - 8;
    }
    // YATICORP change: whole pixels (the package used tenths), so the bubble's text is never drawn between pixels and blurred.
    bubble.style.transform = 'translate3d(' + Math.round(left) + 'px,' + Math.round(top) + 'px,0)';
    bubbleBox.x0 = left; bubbleBox.y0 = top; bubbleBox.x1 = left + bw; bubbleBox.y1 = top + bh;
    bubble.style.setProperty('--tail', clamp(headScreen.x - left, 18, bw - 18).toFixed(0) + 'px');
  }

  /* ================= guide: walk over and explain ================= */
  var explainedEl = null;
  function markExplained(el) {
    if (explainedEl) explainedEl.classList.remove('is-explained');
    explainedEl = el;
    if (el) el.classList.add('is-explained');
  }
  function explainFor(k, el) {
    var ex = EXPLAIN[k], d = el && el.dataset;
    if (d && (d.explainText || d.explainLabel)) ex = Object.assign({}, ex || {}, { label: d.explainLabel || (ex && ex.label) || '', text: d.explainText || (ex && ex.text) || '', emo: d.explainEmo || (ex && ex.emo) || 'content', gesture: d.explainGesture || (ex && ex.gesture) });
    if (!ex && el && String(k).indexOf('btn:') === 0) ex = buttonExplain(el);      // YATICORP change: see explainTarget
    return ex && ex.text ? ex : null;
  }

  /* YATICORP change, not in the shipped package: buttons explain themselves. Pausing on, tapping or tabbing to a
     button makes Loop walk over and point at it — no data-explain needed. A button is a <button>, role="button" or
     a submit input; a link counts when it is drawn as one (filled, button-sized, outside the navigation bars). The
     nearest of a button and a [data-explain] element wins, so a button inside a tagged section explains itself.
     The words come from opts.describeButton(label, el) when given, else a plain line; opts.buttons === false turns
     the whole thing off. When describeButton gives no words for a button, that button is not explained at all, so
     the app decides which buttons Loop walks to. */
  var BUTTONISH = 'button, [role="button"], input[type="submit"], input[type="button"], a[href]';
  var buttonKeys = typeof WeakMap === 'function' ? new WeakMap() : null, buttonN = 0;
  function buttonLabel(el) {
    var s = el.getAttribute('aria-label') || el.getAttribute('title') || (el.tagName === 'INPUT' ? el.value : el.innerText) || '';
    s = s.split('\n').map(function (x) { return x.replace(/\s+/g, ' ').trim(); }).filter(Boolean)[0] || '';   // a card's first line is its name
    return s.length > 40 ? s.slice(0, 38).trim() + '…' : s;
  }
  function isButtonLike(el) {
    if (!buttonLabel(el)) return false;                                           // an icon with no name has nothing to say
    if (el.tagName !== 'A') return true;
    if (el.closest('nav, aside, header, footer, [role="navigation"]')) return false;
    var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (r.height > 72 || r.width > 480) return false;                             // a whole card, not a button
    var bg = cs.backgroundColor.match(/[\d.]+/g);
    return cs.backgroundImage !== 'none' || !!(bg && (bg.length < 4 || +bg[3] > 0.05));
  }
  function explainTarget(el) {
    if (!el || !el.closest) return null;
    if (NAV_BARS && el.closest(NAV_BARS)) return null;                            // nothing in the navigation (see band)
    if (AVOID && el.closest(AVOID)) return null;                                  // nor in an open dropdown (see AVOID)
    if (el.closest('[data-loop-quiet]')) return null;                            // YATICORP change: the page can ask Loop to leave something alone
    var tagged = el.closest('[data-explain]');
    var btn = opts.buttons === false ? null : el.closest(BUTTONISH);
    if (btn && !isButtonLike(btn)) btn = null;
    if (btn && typeof opts.describeButton === 'function' && !opts.describeButton(buttonLabel(btn), btn)) btn = null;
    if (btn && tagged && btn.contains(tagged)) btn = null;                        // the tag is nearer
    return btn || tagged;
  }
  function explainKey(el) {
    if (el.hasAttribute('data-explain')) return el.dataset.explain;
    if (!buttonKeys) return 'btn:' + buttonLabel(el);
    if (!buttonKeys.has(el)) buttonKeys.set(el, 'btn:' + (++buttonN));
    return buttonKeys.get(el);
  }
  function buttonExplain(el) {
    var label = buttonLabel(el);
    var text = typeof opts.describeButton === 'function' ? opts.describeButton(label, el) : '';
    return { label: label, text: text || 'Tap “' + label + '” to use it.', emo: 'joy', gesture: 'point' };
  }
  /* YATICORP change, not in the shipped package (2026-10-15, "in available course it is explaining more then once"):
     each explanation is said once each time a page is opened. Every course card has its own "Enroll Now", and Loop
     explained them one after another as the cursor crossed the grid. Buttons count as the same when their words are
     the same apart from the quoted name ("“Resume Python” takes you back…" and "“Resume Excel” takes you back…"); a
     [data-explain] by its key. Opening the page again ("everytime it should explain") starts it over: a new address
     path (looked at every frame, in update), or Loop coming back into sight (api.show). Not for what a page asks for
     (api.explain), which the page rations itself. */
  var said = {}, saidPath = location.pathname;
  function onceKey(k, el, ex) { return el.hasAttribute('data-explain') ? 'explain:' + k : 'button:' + ex.text.replace(/\u201C[^\u201D]*\u201D/g, '\u201C\u201D'); }
  function remember(key) { said[key] = true; }
  function newVisit() { if (location.pathname !== saidPath) { saidPath = location.pathname; said = {}; } }
  function startGuide(k, el, fromPage) {
    if (hidden || !P.explain || !el) return;
    if (tucked) { if (fromPage) queuedGuide = el; return; }                       // YATICORP change: see setTucked
    var ex = explainFor(k, el);
    if (!ex) return;
    var once = (fromPage || k === '__greeting') ? null : onceKey(k, el, ex);
    if (once && said[once]) return;
    if (once) remember(once);
    if (!EMO[ex.emo]) ex.emo = 'content';
    guide = { key: k, el: el, ex: ex, gesture: (ex.gesture && GESTURES.indexOf(ex.gesture) >= 0) ? ex.gesture : EMO[ex.emo].gesture, t: 0, arrived: false, shown: false, point: 1,
              ax: pointer.x, ay: pointer.y, anchored: pointer.seen, fromPage: !!fromPage };
    goingHome = false;
    fleeTo = pokedAt = null;                                                      // YATICORP change: asked about something, it comes back
    idleT = 0;
    markExplained(el);
  }
  function endGuide(cut) {
    if (cut && guide && guide.shown && talk.on && talk.t < talk.dur * 0.45) impulse('sad', 0.45, 1.2);   // a little deflated at being cut off
    // YATICORP change: something the page asked about is said once, and then Loop gets out of its way: it walks back
    // to its corner instead of standing over the button it just explained (on a phone, with no cursor to follow, it
    // stayed there covering it).
    if (guide && guide.fromPage) goingHome = true;
    guide = null; hush(); markExplained(null);
  }
  // YATICORP change: the room beside the element is measured inside Loop's band, not to the screen's edge, so with a
  // sidebar on the left Loop stands to the button's right instead of being pushed onto it. With no room on either side
  // (a wide button on a phone) it stands at the button's right end, as far over as its band goes, pointing back along
  // it: the package stood it 80% of the way across, on top of the button's name.
  function guideScreenPoint(el) {
    var r = el.getBoundingClientRect(), fh = figH(), room = fh * 0.75, b = band();
    var cy = r.top + Math.min(r.height, H * 0.5) * 0.5 + fh * 0.6;
    if (b.x1 - r.right > room * 0.55) return { x: r.right + room * 0.55, y: cy, point: -1 };
    if (r.left - b.x0 > room * 0.55) return { x: r.left - room * 0.55, y: cy, point: 1 };
    return { x: Math.min(r.right + room * 0.2, b.x1), y: r.bottom + fh * 0.3, point: -1 };
  }

  /* ================= input ================= */
  var lastPx = null, lastPy = null, lastT = 0;
  var hint = $('lw-hint-text') || { textContent: '' };
  if (coarse) hint.textContent = 'Drag to lead it · tap anything to hear about it · tap Yati to poke it';

  function probeHover() {
    var el = document.elementFromPoint(pointer.x, pointer.y);
    var target = explainTarget(el);                                              // YATICORP change: buttons too
    var k = target ? explainKey(target) : null;
    if (k !== hover.key) { hover.key = k; hover.el = target; hover.armed = !!k; hover.button = !!target && !target.hasAttribute('data-explain'); hover.since = performance.now(); }
  }
  function welcomeBack() {
    impulse('joy', 1, 1.6); micro.flash = 1;
    gestureOverride = { g: 'wave', until: t + 1.4 };
    if (!guide) say('Welcome back', 'There you are!', 2, 'joy');
  }
  function onMove(x, y, now) {
    if (!pointer.seen && everSeen && awayT > 2.2) welcomeBack();
    pointer.x = x; pointer.y = y; pointer.seen = true; everSeen = true; awayT = 0; awaySaid = false;
    if (lastPx !== null) {
      var dt = Math.max(0.008, (now - lastT) / 1000);
      var moved = Math.hypot(x - lastPx, y - lastPy), inst = moved / dt;
      if (moved > 2) lastMoveAt = now;
      if (inst > 2600 && cursorSpeed < 200 && !guide) { impulse('surprised', 1, 0.55); impulse('afraid', 0.4, 0.8, 0.45); micro.flash = 0.6; }
      cursorSpeed += (inst - cursorSpeed) * (1 - Math.exp(-dt / 0.12));
      if (E.sleepy > 0.4 && inst > 150) { impulse('surprised', 0.9, 0.6); say('Awake', "Oh! I'm up — I'm up.", 1.8, 'surprised'); idleT = 0; }
    }
    lastPx = x; lastPy = y; lastT = now;
    probeHover();
  }
  /* YATICORP change, not in the shipped package (2026-10-15, "it should invisible when user moves ...dont make
     loopwalker invisible"): the words go, and Yati stays, as soon as the student gets on with the page: the cursor
     moving MOVE_AWAY px, a touch or a click anywhere but on Yati, the mouse wheel, a key. Not in the first
     MOVE_GRACE ms, so the words are always up for a couple of seconds ("for few seconds"), and the hand still
     leaving the link or button that started it does not take them straight away. A scroll the page makes by itself (a section brought into view) is not the student, so scroll events do
     not count, only the wheel, a touch and the keys that scroll. */
  var MOVE_GRACE = 2000, MOVE_AWAY = 40;
  function movedOn() { if (!bubbleOn) return; if (guide) endGuide(false); else hush(); }
  function settledIn() { return bubbleOn && performance.now() - saidAt > MOVE_GRACE; }
  // Measured from where the cursor was when the words appeared, or where it got to in the grace time.
  function cursorMoved(x, y) {
    if (!bubbleOn) return;
    if (!settledIn() || !saidFrom) { saidFrom = { x: x, y: y }; return; }
    if (Math.hypot(x - saidFrom.x, y - saidFrom.y) > MOVE_AWAY) movedOn();
  }
  on(window, 'wheel', function () { if (settledIn()) movedOn(); }, { passive: true });
  on(document, 'keydown', function (e) { if (!/^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key) && settledIn()) movedOn(); });

  // YATICORP change: the finger that poked Loop is not a "come here" (see pointerdown), so its jitter is ignored too.
  var pokeFinger = null;
  on(window, 'pointermove', function (e) {
    if (e.pointerId === pokeFinger) return;
    onMove(e.clientX, e.clientY, performance.now());
    if (e.pointerType === 'mouse') cursorMoved(e.clientX, e.clientY);            // a finger's moves are its touch, below
  }, { passive: true });
  on(window, 'pointerup', function (e) { if (e.pointerId === pokeFinger) pokeFinger = null; }, { passive: true });
  on(window, 'pointercancel', function (e) { if (e.pointerId === pokeFinger) pokeFinger = null; }, { passive: true });
  on(document, 'mouseout', function (e) { if (!e.relatedTarget) { pointer.seen = false; lastPx = null; } });
  on(window, 'blur', function () { pointer.seen = false; lastPx = null; });
  on(window, 'scroll', function () { if (pointer.seen) probeHover(); }, { passive: true });
  on(document, 'focusin', function (e) {
    var el = explainTarget(e.target);                                            // YATICORP change: buttons too
    if (el && e.target.matches(':focus-visible')) startGuide(explainKey(el), el);
  });
  on(document, 'keydown', function (e) { if (e.key === 'Escape' && guide) endGuide(false); });

  // poking: a click on Loop's silhouette (never swallows the click)
  function hitsLoop(x, y) {
    if (!rigReady || hidden) return false;
    var fs = toScreen(pos), fx = fs.x, fy = fs.y;
    var top = headScreen.y - figH() * 0.12;
    var cxs = (fx + headScreen.x) / 2, halfW = Math.max(18, (fy - top) * 0.36);
    return x > cxs - halfW && x < cxs + halfW && y > top && y < fy + 6;
  }
  // YATICORP change, not in the shipped package: every mouse click on Loop sends it running from that spot, to
  // whichever corner or edge of its band is farthest from it, kept clear of dropdowns, search boxes and tab strips
  // (clearOfAvoid). The shipped Loop only walked off at the fourth poke, and on a laptop it then followed the cursor
  // straight back. It waits over there until the student moves on from the spot they clicked (see the release in
  // update). A touch never sends it running (asked 2026-10-14): on a phone it stays where it is and only answers.
  function runFrom(x, y) {
    if (reduced) return;
    var b = band(), mid = (b.x0 + b.x1) / 2, best = null, bd = -1;
    [[b.x0, b.y0], [mid, b.y0], [b.x1, b.y0], [b.x0, b.y1], [mid, b.y1], [b.x1, b.y1]].forEach(function (c) {
      var spot = clearOfAvoid(c[0], c[1]);
      if (!spot) return;
      var d = Math.hypot(spot.x - x, spot.y - y);
      if (d > bd) { bd = d; best = spot; }
    });
    if (!best) return;
    fleeTo = { x: best.x, y: best.y }; pokedAt = { x: x, y: y }; fleeDone = false; goingHome = false;
  }
  // YATICORP change, not in the shipped package (2026-10-16, "the loop walker should not have to get angry while
  // touching it ..it should do any other actions"): a poke never makes Yati cross. The shipped Loop got angry from
  // the third poke on; here each poke plays the next of these friendly reactions, round and round, so poking again
  // and again keeps showing something new. [feeling, how long it lasts, label, line, a feeling that follows it]
  var POKES = [
    ['laughing', 1.1, 'Hehe', 'Hehe — that tickles!'],
    ['surprised', 0.6, 'Oh!', 'Oh! Hello there!', 'amused'],
    ['shy', 2, 'Aww', "Aww, you're making me blush."],
    ['joy', 2, 'Hi', "Hi again! I'm right here."],
    ['excited', 2, 'Woo', "Woo! You've got this!"],
    ['love', 2.2, 'Aww', 'Thanks for keeping me company.'],
    ['proud', 2, 'Ta-da', 'Ta-da! Still standing, still smiling.'],
    ['curious', 2, 'Hmm', 'What shall we learn today?']
  ];
  function poke(byMouse) {
    var r = POKES[pokes % POKES.length];
    pokes++; lastPokeAt = t;
    if (guide) endGuide(false);
    idleT = 0;
    if (P.mode !== 'stand' && byMouse) runFrom(pointer.x, pointer.y);
    impulse(r[0], 1, r[1]);
    if (r[4]) impulse(r[4], 0.5, 1.6, 0.4);
    if (r[0] === 'laughing') micro.flash = 0.5;
    say(r[2], r[3], 1.8, r[0]);
  }
  on(window, 'pointerdown', function (e) {
    var interactive = e.target.closest && e.target.closest('input, button, label, a, select, textarea, summary');
    var onLoop = !interactive && hitsLoop(e.clientX, e.clientY);
    // YATICORP change: on a touch screen Loop walks to wherever a finger lands, but a touch on Loop itself is a poke,
    // not a "come here": it stays exactly where it is (asked 2026-10-14). A mouse click still sends it running.
    if (onLoop && e.pointerType !== 'mouse') { pokeFinger = e.pointerId; poke(false); return; }
    // YATICORP change: a touch or click anywhere else is the student moving on (see movedOn), after MOVE_GRACE.
    if (!onLoop && settledIn()) movedOn();
    onMove(e.clientX, e.clientY, performance.now());
    if (onLoop) { poke(true); return; }
    if (e.pointerType !== 'mouse' && hover.key) { startGuide(hover.key, hover.el); hover.armed = false; return; }
    // YATICORP change: a click on the button Loop is on its way to means the student already knows what it is for.
    if (hover.el && hover.el.contains(e.target)) {
      hover.armed = false;
      if (guide && !guide.shown && guide.el === hover.el) endGuide(false);
    }
  }, { passive: true });

  /* ================= gait model ================= */
  var GAITS = [
    { n: 'Standing', max: 0.06 }, { n: 'Strolling', max: 0.55 }, { n: 'Walking', max: 1.14 },
    { n: 'Jogging', max: 2.30 }, { n: 'Running', max: 4.00 }, { n: 'Sprinting', max: Infinity }
  ];
  function gaitOf(vH) { for (var i = 0; i < GAITS.length; i++) if (vH < GAITS[i].max) return GAITS[i].n; return 'Sprinting'; }
  // short legs cap the reach, so stride length is capped too — the feet stay locked and the steps just get quicker
  function strideOf(v, h) { var vH = v / h; return h * Math.min(0.50 + 0.42 * vH, R.spanMax / dutyOf(vH)); }
  function dutyOf(vH) { return clamp(0.66 - 0.09 * vH, 0.29, 0.66); }

  function addPrint(x, z, heading) {
    var m = printPool.pop();
    if (!m) { m = new THREE.Mesh(parts.printGeo, parts.printMat.clone()); m.rotation.order = 'YXZ'; scene.add(m); }
    var fh = figW();
    m.visible = true;
    m.position.set(x, 0.3, z);
    m.rotation.set(-Math.PI / 2, heading, 0);
    m.scale.set(fh * 0.058, fh * 0.095, 1);
    m.material.opacity = 0.3;
    prints.push(m);
    while (prints.length > P.prints) retire(prints.shift());
  }
  function retire(m) { m.visible = false; printPool.push(m); }

  /* ================= locomotion ================= */
  var target3 = null;
  function headingToCamera() { return Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z); }

  function update(dt) {
    t += dt;
    newVisit();                                                                   // YATICORP change: see onceKey
    cursorSpeed *= Math.exp(-dt / 0.22);
    if (cursorSpeed < 1) cursorSpeed = 0;
    if (bubbleOn && t > bubbleUntil) hush();
    // YATICORP change: a dialog opened over Loop while it was talking takes the bubble away with it.
    if (bubbleOn && hiddenOnTouch()) { if (guide) endGuide(false); else hush(); }
    var h = figW();

    // pause on something -> explain it
    // YATICORP change: a button sets Loop off once the cursor has stayed on it for half a second at an easy pace, still
    // or not, so a student who comes to a button and looks at it is answered, while a cursor crossing it on the way
    // somewhere is not (the shipped rule needed it dead still). Loop lets go of anything the page has removed (a tap
    // that changed the page, a closed dialog).
    var now = performance.now(), still = (now - lastMoveAt) / 1000;
    var settled = hover.button ? (now - hover.since) / 1000 > 0.5 && cursorSpeed < 240 : still > 0.5;
    if (guide && !guide.el.isConnected) endGuide(false);
    // YATICORP change: a page's request (api.explain) that arrived while Loop was talking goes ahead once it is quiet.
    if (bubbleOn && avoidRects.length && bubbleOverDropdown()) { if (guide) endGuide(false); else hush(); }   // YATICORP change: see AVOID
    if (queuedGuide && !guide && !bubbleOn && !avoidRects.length && !tucked) { var queued = queuedGuide; queuedGuide = null; if (queued.isConnected) startGuide(explainKey(queued), queued, true); }
    if (P.explain && pointer.seen && settled && hover.armed && hover.key && hover.el && hover.el.isConnected && (!guide || guide.key !== hover.key)) {
      startGuide(hover.key, hover.el); hover.armed = false;
    }
    // YATICORP change: Loop says nothing until it is beside the button (below), so if the student moves well away from
    // it before Loop gets there, it stops rather than arriving to explain something they have left.
    if (guide && !guide.shown && !guide.fromPage && pointer.seen) {
      var gr = guide.el.getBoundingClientRect();
      var off = Math.hypot(Math.max(gr.left - pointer.x, 0, pointer.x - gr.right), Math.max(gr.top - pointer.y, 0, pointer.y - gr.bottom));
      if (off > 160) endGuide(false);
    }
    // YATICORP change: not in the words' first MOVE_GRACE either (see movedOn); the package let go after 0.6 s.
    if (guide && guide.shown && guide.t > MOVE_GRACE / 1000 && pointer.seen) {
      if (!guide.anchored) { guide.ax = pointer.x; guide.ay = pointer.y; guide.anchored = true; }
      else if (Math.hypot(pointer.x - guide.ax, pointer.y - guide.ay) > 140) endGuide(true);
    }
    if (guide && guide.shown && guide.t > guide.until) endGuide(false);

    // idle / away bookkeeping for the feelings
    if (!guide && pointer.seen && cursorSpeed < 5 && walker.v < h * 0.05) idleT += dt;
    else if (cursorSpeed > 60 || guide) idleT = 0;
    if (everSeen && !pointer.seen) {
      awayT += dt;
      if (awayT > 2.2 && !awaySaid && !guide) { awaySaid = true; say('Hello?', 'Where did you go?', 2.6, 'sad'); }
    }

    var standing = P.mode === 'stand';                                            // YATICORP change: see standSpot
    if (standing) standSpot(pos);
    // YATICORP change: a run from a click (runFrom) ends once Loop is there (or has had 3 s) and the student has moved
    // on from the spot they clicked: on a laptop the cursor leaves it, on a phone the next touch is somewhere else.
    if (fleeTo && (fleeDone || t - lastPokeAt > 3) && Math.hypot(pointer.x - pokedAt.x, pointer.y - pokedAt.y) > figH() * 1.5) fleeTo = pokedAt = null;

    if (reduced) {
      if (guide && !guide.shown) {
        guide.shown = guide.arrived = true;
        say(guide.ex.label, guide.ex.text, 0, guide.ex.emo);
        guide.until = guide.t + readTime(guide.ex.text);
        if (guide.ex.flash) micro.flash = 1;
      }
      if (guide) guide.t += dt;
      walker.heading = headingToCamera();
      return;
    }

    var have = false, arriveR = h * 0.14, desired = 0;
    var cursorPace = Math.min(cursorSpeed * P.gain, P.top * (1 - 0.45 * E.tired));
    if (!target3) target3 = new THREE.Vector3();
    var b = band();

    if (standing) {                                                                // stays in its corner; points from there
      if (guide) { guide.t += dt; guide.point = standPoint(guide.el); }
    } else if (fleeTo) {                                                           // YATICORP change: runs from a click (see runFrom)
      toFloor(fleeTo.x, fleeTo.y, target3); have = true; arriveR = h * 0.12;
    } else if (guide) {
      guide.t += dt;
      var gp = guideScreenPoint(guide.el);
      guide.point = gp.point;
      var gc = clearOfAvoid(gp.x, gp.y) || gp;                                    // YATICORP change: see AVOID
      toFloor(gc.x, gc.y, target3); have = true;
    } else if (goingHome) {
      if (cursorSpeed > 60) goingHome = false;                                    // the student moved: back to following them
      else { var hc = clearOfAvoid(W * 0.8, H * 0.88); if (hc) { toFloor(hc.x, hc.y, target3); have = true; } }   // the corner it starts in
    } else if (P.mode === 'follow') {
      // YATICORP change: over an open dropdown, the nearest spot beside it on Loop's side (see AVOID).
      var me = standRects.length ? toScreen(pos) : null;
      var fc = pointer.seen ? (me ? clearOfAvoid(pointer.x, pointer.y, me.x, me.y) : clearOfAvoid(pointer.x, pointer.y)) : null;
      if (fc) { toFloor(fc.x, fc.y, target3); have = true; arriveR = h * 0.32; }
    } else {
      if (!roam.target || roam.pause < 0) {
        roam.target = roam.target || new THREE.Vector3();
        var rc = clearOfAvoid(b.x0 + Math.random() * (b.x1 - b.x0), b.y0 + Math.random() * (b.y1 - b.y0)) || { x: W * 0.8, y: H * 0.88 };
        toFloor(rc.x, rc.y, roam.target);
        roam.pause = 0;
      }
      target3.copy(roam.target); have = true;
    }
    // YATICORP change: a dropdown opened where Loop is standing: it steps out of its way, whatever it was doing
    // (see AVOID). Its own pace, below, since following a still cursor would leave it standing there.
    // When there is nowhere clear of it to go (a phone's notifications, the width of the screen and most of its
    // height), Loop fades out until it shuts instead of standing on it. Standing in its corner (mode 'stand'), it
    // never steps aside, and it stays in sight (2026-10-15, "dont make loopwalker invisible"): a search box or tab
    // strip scrolling past under the corner leaves it there. Only an open list or menu right over the corner fades
    // it out, so it never hides the options, and it is back the moment that shuts.
    var stepAside = false, nowhere = false;
    if (standRects.length) {
      var here = toScreen(pos);
      if (standing) { for (var ai = 0; ai < avoidRects.length; ai++) if (avoidRects[ai].list && figureHits(here.x, here.y, avoidRects[ai])) nowhere = true; }
      else if (inTheWay(here.x, here.y)) {
        var out = clearOfAvoid(here.x, here.y);
        if (!out) nowhere = true;
        else if (!have || !guide) { toFloor(out.x, out.y, target3); have = true; arriveR = h * 0.12; stepAside = true; }
      }
      // Nor across one on the way: a walk that would cross one goes round it, a corner at a time.
      if (have && !stepAside) {
        var from = toScreen(pos), fx = from.x, fy = from.y, to = toScreen(target3);
        var via = detour(fx, fy, to.x, to.y);
        if (via && via.stay) have = false;
        else if (via) { toFloor(via.x, via.y, target3); arriveR = Math.min(arriveR, h * 0.12); }
      }
    }
    nowhereLast = nowhere;                                                        // applied in frame, with popups (setTucked)

    var dx = 0, dz = 0, dist = 0;
    if (have) { dx = target3.x - pos.x; dz = target3.z - pos.z; dist = Math.hypot(dx, dz); }
    var moving = have && dist > arriveR;
    if (fleeTo && !moving) fleeDone = true;

    if (fleeTo) {
      desired = h * 3.2;                                                          // YATICORP change: a run (the shipped huff was a 1.9 jog)
    } else if (guide) {
      // YATICORP change: Loop runs over (the shipped pace topped out at a jog) and starts talking only once it is
      // standing beside the thing, never on the way. The shipped rule spoke within 1.4 s, wherever it was by then.
      // The 6 s is a safety net only; the target is always inside the band, so Loop can always reach it.
      desired = clamp(dist * 2.8, h * 1.1, h * 3.6);
      if (!guide.arrived && (dist < h * 0.25 || guide.t > 6)) guide.arrived = true;
      if (!guide.shown && guide.arrived) {
        guide.shown = true;
        say(guide.ex.label, guide.ex.text, 0, guide.ex.emo);
        guide.until = guide.t + readTime(guide.ex.text);
        if (guide.ex.flash) micro.flash = 1;
      }
    } else if (goingHome) {
      desired = clamp(dist * 1.6, h * 0.6, h * 1.6);
      if (!moving) goingHome = false;                                             // home
    } else if (P.mode === 'follow') {
      desired = cursorPace;
      if (dist > h * 0.6) desired = Math.max(desired, h * 0.75);
    } else {
      desired = Math.max(h * 0.62, cursorPace);
      if (!moving) { roam.pause += dt; if (roam.pause > 0.7 + Math.random() * 1.4) roam.pause = -1; }
    }
    if (stepAside) desired = Math.max(desired, h * 2.6);                         // YATICORP change: darts out of the way (see AVOID)
    if (!moving) desired = 0;
    desired = Math.min(desired, dist * (stepAside ? 5 : 2.4));
    desired *= clamp((1 - 0.3 * E.sad - 0.42 * E.tired - 0.25 * E.sleepy) * (1 + 0.15 * E.angry), 0.3, 1.2);   // feelings change the pace

    // face the way it walks; once it has stopped (or is only waiting near you), turn to face you
    var settling = !moving || (desired < h * 0.05 && walker.v < h * 0.08);
    var wantHeading = !settling ? Math.atan2(dx, dz) : (walker.v < h * 0.08 ? headingToCamera() : walker.heading);
    var err = wrapAngle(wantHeading - walker.heading);
    var run = clamp(walker.v / h / 3.2, 0, 1);
    var turn = (7 - 3 * run) * dt;
    walker.heading = wrapAngle(walker.heading + clamp(err, -turn, turn));
    if (moving) desired *= clamp(Math.cos(err) * 1.25, 0, 1);

    var cap = (stepAside ? 10 : 4.0) * h * dt;                                     // YATICORP change: a quick start out of a dropdown's way
    walker.v += clamp(desired - walker.v, -cap * 1.8, cap);
    walker.v = Math.max(0, walker.v);
    pos.x += Math.sin(walker.heading) * walker.v * dt;
    pos.z += Math.cos(walker.heading) * walker.v * dt;
    keepInBand();

    var stride = strideOf(walker.v, h);
    walker.phase = (walker.phase + (walker.v * dt) / stride) % 1;
    walker.moveMix += ((walker.v / h > 0.06 ? 1 : 0) - walker.moveMix) * Math.min(1, dt * 7);

    if (P.prints > 0 && walker.moveMix > 0.5) {
      for (var i = 0; i < 2; i++) {
        var u = (walker.phase + i * 0.5) % 1, slot = Math.floor(u * 2);
        if (u < 0.06 && lastStep[i] !== slot) {
          lastStep[i] = slot;
          var fwd = stride * dutyOf(walker.v / h) * 0.5, lat = (i ? 1 : -1) * R.hipX * h;
          var sh = Math.sin(walker.heading), ch = Math.cos(walker.heading);
          addPrint(pos.x + sh * fwd + ch * lat, pos.z + ch * fwd - sh * lat, walker.heading);
        } else if (u > 0.2) { lastStep[i] = -1; }
      }
    }
    for (var j = prints.length - 1; j >= 0; j--) {
      prints[j].material.opacity -= dt * 0.11;
      if (prints[j].material.opacity <= 0) retire(prints.splice(j, 1)[0]);
    }

    var g = gaitOf(walker.v / h);
    if (g === 'Sprinting' && gaitNow !== 'Sprinting' && !guide && t - lastSprintMsg > 25) {
      lastSprintMsg = t;
      say('Sprinting', 'Whoa — about ' + (walker.v / h * 1.75).toFixed(1) + ' m/s at human scale!', 2.4, 'excited');
    }
    gaitNow = g;
  }

  /* ================= feelings ================= */
  var nextSigh = 4, wanderAt = 0;
  function drive(n, v) { if (v > (Et[n] || 0)) Et[n] = v; }

  function feel(dt) {
    Et = {};
    var h = figW(), vH = walker.v / h;
    if (vH > 0.06 && vH < 1.14) drive('content', 0.42);
    else if (vH >= 1.14 && vH < 2.3) drive('focused', 0.4);
    else if (vH >= 2.3 && vH < 4) drive('focused', 0.68);
    else if (vH >= 4) drive('excited', 0.9);

    if (vH >= 2.3) fatigue += dt; else fatigue = Math.max(0, fatigue - dt * (vH < 0.6 ? 0.8 : 0.4));
    var tiredLvl = clamp((fatigue - 3.5) / 2.5, 0, 1);
    if (tiredLvl > 0) drive('tired', 0.3 + 0.7 * tiredLvl);
    if (tiredLvl > 0.5 && !tiredSaid) { tiredSaid = true; if (!guide) say('Phew', 'Give me a second to catch my breath…', 2.4, 'tired'); }
    if (fatigue < 0.5) tiredSaid = false;

    if (idleT > 6) drive('bored', clamp((idleT - 6) / 3, 0, 1) * 0.85);
    if (idleT > 12) drive('sleepy', clamp((idleT - 12) / 2, 0, 1));
    // YATICORP change: on a touch screen there is no cursor; a tap on Yati wakes it (poke).
    if (idleT > 12 && idleT - dt <= 12) say('Idle', coarse ? '…zzz. Tap me to wake me up.' : '…zzz. Move the cursor to wake me.', 3.4, 'sleepy');
    if (awayT > 2.2) drive('sad', clamp((awayT - 2.2) / 1.5, 0, 1) * 0.72);
    if (guide) drive(guide.shown ? guide.ex.emo : 'curious', guide.shown ? 1 : 0.45);
    for (var i = impulses.length - 1; i >= 0; i--) {
      var im = impulses[i], age = t - im.t0;
      if (age < 0) continue;
      if (age > im.dur) { impulses.splice(i, 1); continue; }
      var env = Math.min(1, age / 0.12) * (age > im.dur * 0.65 ? 1 - (age - im.dur * 0.65) / (im.dur * 0.35) : 1);
      drive(im.n, im.v * env);
    }

    // rise fast, fade at each feeling's own rate
    var best = 'neutral', bv = 0.18, sec = null, sv = 0.18;
    EMO_KEYS.forEach(function (n) {
      var tg = Et[n] || 0;
      E[n] += (tg - E[n]) * ease(dt, tg > E[n] ? 9 : (EMO[n].fade || 2.2));
      if (E[n] < 0.002) E[n] = 0;
      if (E[n] > bv) { sec = best !== 'neutral' ? best : sec; sv = bv; best = n; bv = E[n]; }
      else if (E[n] > sv) { sec = n; sv = E[n]; }
    });
    dom.n = best; dom.v = best === 'neutral' ? 0 : bv;
    second.n = sec && sec !== best ? sec : null; second.v = sv;

    // blend feelings into action units
    var wsum = 0, w = {};
    EMO_KEYS.forEach(function (n) { var x = Math.pow(E[n], 1.4); w[n] = x; wsum += x; });
    var norm = Math.max(1, wsum), k;
    for (k = 0; k < AU_KEYS.length; k++) A[AU_KEYS[k]] = NEUTRAL[AU_KEYS[k]];
    EMO_KEYS.forEach(function (n) {
      if (w[n] < 1e-4) return;
      var wn = w[n] / norm, a = EMO[n].au;
      for (var q = 0; q < AU_KEYS.length; q++) { var key2 = AU_KEYS[q]; A[key2] += wn * (a[key2] - NEUTRAL[key2]); }
    });
    feel.w = w; feel.norm = norm;

    if (reduced) { finishAU(); return; }

    // eyebrow flash — the universal "hello"
    if (micro.flash > 0) {
      var f = Math.sin((1 - micro.flash) * Math.PI);
      A.iuL += 0.5 * f; A.iuR += 0.5 * f; A.ouL += 0.65 * f; A.ouR += 0.65 * f; A.luL += 0.12 * f; A.luR += 0.12 * f;
      micro.flash = Math.max(0, micro.flash - dt * 2.6);
    }
    // breathing hard, laughing, yawning, sighing
    if (E.tired > 0.05) A.jaw = Math.max(A.jaw, (0.16 + 0.2 * (0.5 + 0.5 * Math.sin(t * 13))) * E.tired);
    if (E.laughing > 0.05) A.jaw += 0.28 * Math.abs(Math.sin(t * 12)) * E.laughing;
    if (E.sleepy > 0.55) { micro.nextYawn -= dt; if (micro.nextYawn <= 0 && micro.yawn < 0) { micro.yawn = 0; micro.nextYawn = 6 + Math.random() * 5; } }
    if (micro.yawn >= 0) { micro.yawn += dt / 1.9; if (micro.yawn >= 1) micro.yawn = -1; }
    var yw = micro.yawn >= 0 ? Math.sin(Math.PI * micro.yawn) : 0;
    if (yw > 0) {
      A.jaw = Math.max(A.jaw, yw); A.luL *= 1 - 0.85 * yw; A.luR *= 1 - 0.85 * yw;
      A.iuL += 0.5 * yw; A.iuR += 0.5 * yw; A.stretch += 0.15 * yw; A.smL *= 1 - yw; A.smR *= 1 - yw;
    }
    if (E.bored > 0.5) { nextSigh -= dt; if (nextSigh <= 0 && micro.sigh < 0) { micro.sigh = 0; nextSigh = 6 + Math.random() * 4; } }
    if (micro.sigh >= 0) { micro.sigh += dt / 1.4; if (micro.sigh >= 1) micro.sigh = -1; }
    var sg = micro.sigh >= 0 ? Math.sin(Math.PI * micro.sigh) : 0;
    if (sg > 0) { A.jaw = Math.max(A.jaw, 0.14 * sg); A.pucker = Math.max(A.pucker, 0.35 * sg); A.luL *= 1 - 0.25 * sg; A.luR *= 1 - 0.25 * sg; }

    // talking: lip shapes read from the letters being "said"
    var vis = [0, 0, 0, 0, 0];
    if (talk.on) {
      talk.t = (performance.now() - talk.start) / 1000;                     // wall clock, independent of frame rate
      var n = talk.n, L = talk.text.length;
      while (n < L && talk.times[n] <= talk.t) n++;
      if (n !== talk.n) revealTo(n);
      if (n >= L && talk.t > talk.dur + 0.2) finishTalk();
      else if (n > 0 && talk.t - talk.times[n - 1] < 0.14) vis = viseme(talk.text[n - 1].toLowerCase());   // the mouth shapes each letter as it appears
    }
    var kv = ease(dt, 26);
    talk.jaw += (vis[0] - talk.jaw) * kv; talk.pu += (vis[1] - talk.pu) * kv; talk.st += (vis[2] - talk.st) * kv;
    talk.pr += (vis[3] - talk.pr) * kv; talk.ul += (vis[4] - talk.ul) * kv;
    if (talk.on || talk.jaw > 0.01) {
      A.jaw = talk.pr > 0.2 ? talk.jaw : Math.max(A.jaw * 0.75, talk.jaw);   // lips close on m/b/p, otherwise the feeling keeps its mouth
      A.pucker = Math.max(A.pucker, talk.pu); A.stretch += talk.st * 0.6;
      A.press = Math.max(A.press * (1 - talk.jaw * 2), talk.pr); A.upLip = Math.max(A.upLip, talk.ul);
    }

    // blinks: timing depends on the feeling
    micro.nextBlink -= dt;
    if (micro.blinkT < 0 && micro.nextBlink <= 0 && E.surprised < 0.5) {
      micro.blinkT = 0; micro.blinkDur = 0.22 + 0.8 * E.sleepy + 0.2 * E.sad + 0.1 * E.tired;
      micro.nextBlink = (2.6 + Math.random() * 2.6) * (1 + 0.9 * E.focused) * (1 - 0.55 * E.afraid);
      micro.double = Math.random() < 0.12;
    }
    if (micro.blinkT >= 0) {
      micro.blinkT += dt / micro.blinkDur;
      var bt = micro.blinkT;
      micro.blink = bt < 0.3 ? bt / 0.3 : bt < 0.45 ? 1 : Math.max(0, 1 - (bt - 0.45) / 0.55);
      if (bt >= 1) { micro.blinkT = -1; micro.blink = 0; if (micro.double) { micro.double = false; micro.nextBlink = 0.12; } }
    }
    A.luL *= 1 - micro.blink; A.luR *= 1 - micro.blink;
    A.llL += 0.12 * micro.blink; A.llR += 0.12 * micro.blink;

    // gaze: eye contact with your cursor, pulled away by some feelings, with saccades on top
    var bx = 0, by = 0.05;
    if (facing && pointer.seen) {
      bx = clamp((pointer.x - headScreen.x) / (W * 0.28), -1, 1);
      by = clamp((pointer.y - (headScreen.y + R.headRY * h)) / (H * 0.3), -1, 1);
    } else if (!facing) { by = 0.1; }
    var ovS = 0, ovx = 0, ovy = 0;
    EMO_KEYS.forEach(function (n) {
      var e = EMO[n]; if (!e.gaze || E[n] < 0.01) return;
      var s = E[n] * e.gaze[2]; ovS += s; ovx += s * e.gaze[0]; ovy += s * e.gaze[1];
    });
    if (ovS > 0) { ovx /= ovS; ovy /= ovS; }
    var ov = clamp(ovS, 0, 1);
    if (E.bored > 0.2 || !pointer.seen) {
      if (t > wanderAt) { micro.wanderX = (Math.random() - 0.5) * 1.8; micro.wanderY = (Math.random() - 0.6) * 0.9; wanderAt = t + 0.7 + Math.random() * 1.4; }
      var wv = pointer.seen ? E.bored : Math.max(0.6, E.bored);
      bx += (micro.wanderX - bx) * wv; by += (micro.wanderY - by) * wv;
    }
    var tx = bx + (ovx - bx) * ov, ty = by + (ovy - by) * ov;
    micro.nextSacc -= dt;
    if (micro.nextSacc <= 0) {
      micro.jx = (Math.random() - 0.5) * 0.22; micro.jy = (Math.random() - 0.5) * 0.14;
      micro.nextSacc = (0.35 + Math.random() * 1.9) * (1 + 0.8 * E.focused) * (1 - 0.5 * E.afraid) * (1 - 0.3 * E.curious);
      if (Math.random() < 0.2 && micro.blinkT < 0) micro.nextBlink = 0.05;       // big eye moves often come with a blink
    }
    micro.tgx = clamp(tx + micro.jx, -1, 1); micro.tgy = clamp(ty + micro.jy, -1, 1);
    var gd = Math.hypot(micro.tgx - micro.gx, micro.tgy - micro.gy);
    var grate = gd > 0.08 ? 36 : 9;                                                 // saccade vs smooth pursuit
    micro.gx += (micro.tgx - micro.gx) * ease(dt, grate);
    micro.gy += (micro.tgy - micro.gy) * ease(dt, grate);
    finishAU();
  }
  function finishAU() {
    for (var k = 0; k < AU_KEYS.length; k++) {
      var n = AU_KEYS[k];
      if (n === 'luL' || n === 'luR') A[n] = clamp(A[n], 0, 1.45);
      else if (n === 'pupil') A[n] = clamp(A[n], 0.6, 1.5);
      else A[n] = clamp(A[n], 0, 1.2);
    }
  }
  function viseme(c) {
    if (c === 'a') return [0.55, 0, 0.15, 0, 0.1];
    if (c === 'e') return [0.32, 0, 0.45, 0, 0.1];
    if (c === 'i' || c === 'y') return [0.24, 0, 0.55, 0, 0.1];
    if (c === 'o') return [0.46, 0.55, 0, 0, 0];
    if (c === 'u' || c === 'w') return [0.2, 0.75, 0, 0, 0];
    if (c === 'm' || c === 'b' || c === 'p') return [0, 0, 0, 0.55, 0];
    if (c === 'f' || c === 'v') return [0.06, 0, 0.1, 0, 0.35];
    if (c >= 'a' && c <= 'z') return [0.16, 0, 0.1, 0, 0.05];
    return [0.03, 0, 0, 0, 0];
  }

  /* ================= posing ================= */
  // Loop's legs are one piece each (as in the file), so they swing from a pivot at the top. The stance leg
  // pulls the hips down so its foot stays on the floor; the swing leg slides up into the body to clear it.
  var legState = [{ th: 0, lift: 0, stance: true }, { th: 0, lift: 0, stance: true }];
  function legTargets(fzH, liftH, i, moving) {
    var fzM = fzH * MODEL_H, th = Math.asin(clamp(fzM / M.legL, -0.92, 0.92));
    legState[i].th = th; legState[i].lift = liftH * MODEL_H; legState[i].stance = !moving || liftH <= 0.0005;
  }
  function applyLegs() {
    var dip = 0, i;
    for (i = 0; i < 2; i++) if (legState[i].stance) dip = Math.max(dip, M.legL * (1 - Math.cos(legState[i].th)));
    for (i = 0; i < 2; i++) {
      var L = legState[i], leg = parts.leg[i];
      var tele = Math.max(0, L.lift + dip - M.legL * (1 - Math.cos(L.th)));
      leg.pivot.rotation.x = -L.th;
      leg.pivot.position.y = tele;
      leg.foot.rotation.x = L.th;
    }
    return dip;
  }

  // [shoulder swing (-fwd), shoulder abduction (±side), elbow flex (-), elbow bend in the frontal plane (±side)]
  function gestureArm(g, sd, ps, swing, run) {
    var rest = [0.04, sd * 0.55, -0.08, 0];                    // hangs out to the side, straight, like the file
    switch (g) {
      case 'idea':    return sd === ps ? [-0.4, sd * 1.55, -0.35, sd * 1.15] : rest;              // the mascot's own pose: fist up in front of the ring's edge, finger raised and in view
      case 'point':   return sd === ps ? [-0.55, sd * 1.15, -0.1, 0] : rest;
      case 'wave':    return sd === ps ? [-0.15, sd * 1.75, -0.3, sd * (1.25 + 0.4 * Math.sin(t * 10))] : rest;
      case 'cheer':   return [-0.25, sd * 2.3, -0.2, sd * 0.4];
      case 'proud':   return [0.35, sd * 0.85, -1.75, 0];
      case 'hip':     return sd === ps ? [0.35, sd * 0.85, -1.75, 0] : rest;
      case 'heart':   return [-0.9, -sd * 0.28, -1.6, -sd * 0.45];           // hands crossed over the chest, fingers down and in
      case 'shy':     return [0.6, sd * 0.25, -1.15, 0];
      case 'think':   return sd === ps ? [-1.26, -sd * 0.12, -1.96, -sd * 0.26] : [-0.3, sd * 0.3, -1.3, 0];   // the thinker: index up the cheek, thumb under the chin; the other arm folded under the elbow
      case 'shrug':   return [-1.34, sd * 0.85, -0.86, sd * 0.6];                                              // both forearms out and up, palms up
      case 'scratch': return sd === ps ? [-1.9, sd * 0.68, -1.03 + 0.05 * Math.sin(t * 13), sd * (0.2 + 0.05 * Math.sin(t * 13))] : rest;   // one hand up on the side of the ring, fingers working at it
      case 'ready':   return [-0.75, sd * 0.25, -1.95, 0];
      case 'startle': return [-0.5, sd * 1.7, -0.9, 0];
      case 'cower':   return [-1.25, -sd * 0.05, -2.25, 0];
      case 'slump':   return [0.1, sd * 0.06, -0.06, 0];
      case 'fists':   return [0.18, sd * 0.4, -0.95, 0];
      case 'recoil':  return sd === ps ? [-1.3, sd * 0.6, -1.0, 0] : rest;
      case 'wipe':    return sd === ps ? [-1.1, sd * 1.55, -2.35, 0] : rest;
      case 'laugh':   return [-0.55, -sd * 0.02, -1.35, 0];
      case 'rest':    return rest;
      default:        return [-swing, sd * 0.5, -(0.15 + 0.6 * run), 0];
    }
  }

  function currentGesture() {
    if (!rigReady) return 'rest';
    if (gestureOverride && t < gestureOverride.until) return gestureOverride.g;
    if (guide && guide.shown && (guide.arrived || reduced)) return guide.gesture;
    if (walker.v < figW() * 0.3 && dom.v > 0.35) return EMO[dom.n].gesture;
    return 'walk';
  }

  // Aim an arm at a point on the page: the target is lifted onto the camera-facing plane through the shoulder, so the
  // arm lies parallel to the screen and the finger visibly lines up with what Loop is talking about.
  var aimTmp = [0, 0, 0, 0];
  var aimS = new THREE.Vector3(), aimP = new THREE.Vector3(), aimN = new THREE.Vector3(), aimQ = new THREE.Quaternion(), aimC = new THREE.Vector3();
  function aimArm(arm, sx, sy, out) {
    arm.shoulder.getWorldPosition(aimS);
    camera.getWorldDirection(aimN);
    ndc.set((sx / W) * 2 - 1, -(sy / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var denom = ray.ray.direction.dot(aimN);
    if (Math.abs(denom) < 1e-4) return false;
    var tt = aimP.copy(aimS).sub(ray.ray.origin).dot(aimN) / denom;
    aimP.copy(ray.ray.direction).multiplyScalar(tt).add(ray.ray.origin).sub(aimS);
    if (aimP.lengthSq() < 1e-6) return false;
    parts.hips.getWorldQuaternion(aimQ);
    aimP.applyQuaternion(aimQ.invert()).normalize();                           // direction in the shoulder's frame
    var dx = clamp(aimP.x, -0.995, 0.995), dy = aimP.y, dz = aimP.z, sgn = dx < 0 ? -1 : 1;
    var sz = dy > 0 ? sgn * Math.PI - Math.asin(dx) : Math.asin(dx);         // the upper arm points along (sin sz, -cos sz cos sx, -cos sz sin sx)
    var cs = Math.cos(sz) < 0 ? -1 : 1;
    var sxA = Math.atan2(-dz * cs, -dy * cs);
    out[0] = clamp(sxA, -1.7, 1.0); out[1] = sgn * clamp(Math.abs(sz), 0.1, 2.9); out[2] = -0.05; out[3] = 0;
    return true;
  }
  function palmToCamera(arm) {                                                // the wrist roll that turns the palm toward the viewer
    aimC.copy(camera.position);
    arm.elbow.worldToLocal(aimC);
    aimC.y += M.fore + M.fistDrop;
    return Math.atan2(aimC.x, aimC.z);
  }
  var bodyP = new THREE.Vector3(), handP = new THREE.Vector3(), upV = new THREE.Vector3(), handQ = new THREE.Quaternion(), fingerDir = new THREE.Vector3(), rigUp = new THREE.Vector3();
  var dirP = new THREE.Vector3(), camF = new THREE.Vector3(), scratchDir = new THREE.Vector3();
  function palmToHead(arm) {                                                  // the wrist roll that turns the palm toward the middle of the face
    parts.head.getWorldPosition(dirP);
    arm.elbow.worldToLocal(dirP);
    dirP.y += M.fore + M.fistDrop;
    return Math.atan2(dirP.x, dirP.z);
  }
  function palmToDir(arm, worldDir, towardCamera) {                           // the wrist roll that turns the palm along a world direction (plus a share toward the viewer)
    camera.getWorldDirection(camF);
    arm.wrist.getWorldPosition(handP);
    dirP.copy(handP).addScaledVector(worldDir, 100).addScaledVector(camF, -100 * (towardCamera || 0));
    arm.elbow.worldToLocal(dirP);
    dirP.y += M.fore + M.fistDrop;
    return Math.atan2(dirP.x, dirP.z);
  }
  function palmToBody(arm) {                                                  // the wrist roll that turns the palm toward the body, as relaxed hands do
    arm.wrist.getWorldPosition(handP);
    parts.hips.getWorldPosition(bodyP);
    upV.set(0, 1, 0).applyQuaternion(rig.quaternion);
    bodyP.addScaledVector(upV, handP.sub(bodyP).dot(upV));                   // the point on the body's axis level with the hand
    arm.elbow.worldToLocal(bodyP);
    bodyP.y += M.fore + M.fistDrop;
    return Math.atan2(bodyP.x, bodyP.z);
  }
  function pose(dt) {
    var h = figW();
    var vH = walker.v / h, run = clamp(vH / 3.2, 0, 1);
    var duty = dutyOf(vH), stride = strideOf(walker.v, h);
    var span = Math.min(stride * duty, R.spanMax * h) / h;
    var mix = walker.moveMix, u = walker.phase;
    var k = reduced ? 1 : Math.min(1, dt * 10);
    var gest = currentGesture();

    // posture from feelings
    var lean = 0, drop = 0, swingS = 0, bounceA = 0, sway = 0, hx = 0, hy = 0, hz = 0;
    var w = feel.w || {}, norm = feel.norm || 1;
    EMO_KEYS.forEach(function (n) {
      var wn = (w[n] || 0) / norm; if (wn < 1e-3) return;
      var e = EMO[n], bb = e.body || {};
      lean += wn * (bb.lean || 0); drop += wn * (bb.drop || 0); swingS += wn * (bb.swing || 0);
      bounceA += wn * (bb.bounce || 0); sway += wn * (bb.sway || 0);
      if (e.head) { hx += wn * e.head[0]; hy += wn * e.head[1]; hz += wn * e.head[2]; }
    });
    var swingScale = clamp(1 + swingS, 0.25, 1.4);

    var breathe = reduced ? 0 : (1 - mix) * (0.5 + 0.5 * Math.sin(t * 1.7)) * 0.010;
    var pant = reduced ? 0 : E.tired * 0.006 * Math.sin(t * 13);
    var bounce = reduced ? 0 : bounceA * Math.abs(Math.sin(t * 6.5)) * 0.022 * (1 - 0.6 * mix);
    var sighDrop = micro.sigh >= 0 ? Math.sin(Math.PI * micro.sigh) * 0.02 : 0;

    for (var i = 0; i < 2; i++) {
      var lu = (u + i * 0.5) % 1, fz, lift = 0;
      if (lu < duty) fz = span * (0.5 - lu / duty);
      else {
        var sp = (lu - duty) / (1 - duty), e2 = sp * sp * (3 - 2 * sp);
        fz = -span * 0.5 + span * e2;
        lift = (0.035 + 0.06 * run) * Math.sin(Math.PI * sp);
      }
      fz = fz * mix + (1 - mix) * (i ? 0.03 : -0.02);
      legTargets(fz, lift * mix, i, mix > 0.5);
    }
    var stanceDip = applyLegs();
    var waddle = reduced ? 0 : -0.07 * mix * Math.sin(TAU * u) * (1 - 0.5 * run);

    rig.scale.setScalar(h / MODEL_H);
    rig.position.set(pos.x, 0, pos.z);
    rig.rotation.y = walker.heading;
    rig.rotation.x = run * 0.14 + lean;
    rig.rotation.z = (reduced ? 0 : Math.sin(t * 1.7) * 0.05 * sway) + waddle;
    parts.hips.position.y = M.hipY - stanceDip + (bounce + pant - breathe - drop - sighDrop) * MODEL_H;

    var ps = guide ? guide.point : 1;
    for (var a = 0; a < 2; a++) {
      var arm = parts.arm[a], sd = arm.side;
      var au2 = (u + a * 0.5 + 0.5) % 1;
      var swing = (0.38 + 0.5 * run) * Math.sin(au2 * TAU) * mix * swingScale;
      var tg = gestureArm(gest, sd, ps, swing, run);
      if (sd === ps && guide && guide.el && (gest === 'point' || gest === 'idea')) {   // explaining: the finger lines up with the thing itself
        var er = guide.el.getBoundingClientRect();
        if (!aimArm(arm, er.left + er.width * 0.5, er.top + Math.min(er.height, H * 0.5) * 0.5, aimTmp)) aimTmp = tg; else tg = aimTmp;
      }
      arm.sx += (tg[0] - arm.sx) * k; arm.sz += (tg[1] - arm.sz) * k; arm.ex += (tg[2] - arm.ex) * k; arm.ez += (tg[3] - arm.ez) * k;
      arm.shoulder.rotation.x = arm.sx; arm.shoulder.rotation.z = arm.sz; arm.elbow.rotation.x = arm.ex; arm.elbow.rotation.z = arm.ez;
      // fingers: the same hand folds into a pointing hand for pointing gestures (index straight, the rest curled)
      var wantP = (gest === 'cheer' || (sd === ps && (gest === 'idea' || gest === 'point' || gest === 'think'))) ? 1 : 0;
      arm.rf += (wantP - arm.rf) * k;
      var wantF = (gest === 'fists' || gest === 'cower' || gest === 'ready' || gest === 'laugh') ? 1 : 0;    // a closed fist: every finger curls, the thumb over them (anger, fear, and the boxer's guard when focused)
      arm.cf += (wantF - arm.cf) * k;
      var flatG = gest === 'wave' || gest === 'startle' || gest === 'recoil' || gest === 'heart' || gest === 'wipe' || gest === 'shrug';
      var wantFl = (flatG && (sd === ps || gest === 'startle' || gest === 'heart' || gest === 'shrug')) ? 1 : 0;   // an open flat hand: waving, surprise, pushing away, hands to the chest, holding the belly
      arm.ff += (wantFl - arm.ff) * k;
      var wantA = ((gest === 'wave' && sd === ps) || gest === 'startle' || (gest === 'recoil' && sd === ps)) ? 1 : 0;   // palm shown to the viewer: a wave, surprise's "whoa", disgust's push-away
      arm.pa += (wantA - arm.pa) * k;
      var rf = Math.max(arm.rf, arm.cf), cf = arm.cf, ff = arm.ff;
      // which way the fingers point, in the world: hanging hands and raised hands roll differently
      arm.hand.getWorldQuaternion(handQ); fingerDir.set(0, -1, 0).applyQuaternion(handQ);
      rigUp.set(0, 1, 0).applyQuaternion(rig.quaternion);
      var upd = fingerDir.dot(rigUp);
      var hang = clamp((-upd - 0.3) / 0.5, 0, 1); hang = hang * hang * (3 - 2 * hang);        // 1 when the fingers point straight down
      var raised = clamp((upd - 0.15) / 0.45, 0, 1); raised = raised * raised * (3 - 2 * raised);   // 1 when the fingers point up
      var restRoll = palmToBody(arm) - sd * 0.7 * hang;           // relaxed: the palm faces the body — on a hanging arm turned a little back, so the back of the hand shows and the thumb sits forward, as a person stands
      if (gest === 'heart') restRoll = palmToCamera(arm) + Math.PI;   // hands laid flat over the heart: palm to the chest, back of the hand to the viewer
      if (gest === 'shrug') restRoll = palmToDir(arm, rigUp, 0.35);    // shrugging: palms turned up and a little toward the viewer
      var wantH = (gest === 'think' && sd === ps) ? 1 : 0;              // the thinker's hand faces the cheek
      arm.th += (wantH - arm.th) * k;
      var wantS = (gest === 'scratch' && sd === ps) ? 1 : 0;            // the scratching hand: hooked fingers, palm pressed to the ring
      arm.sc += (wantS - arm.sc) * k;
      if (arm.sc > 0.001) { scratchDir.set(-sd, 0.2, -0.35).applyQuaternion(rig.quaternion); restRoll += wrapAngle(palmToDir(arm, scratchDir, 0) - restRoll) * arm.sc; }   // palm toward the middle of the head, fingers curling onto the ring
      if (arm.pa > 0.001) restRoll += wrapAngle(palmToCamera(arm) - restRoll) * arm.pa;   // shown to the viewer for a wave, a startled "whoa" or a push-away
      var rollMix = arm.rf * (1 - cf);
      if (rollMix < 0.001) arm.wrist.rotation.y = restRoll;
      else {
        var pc = palmToCamera(arm), thumbSide = pc - sd * 1.1;                                  // pointing sideways: the thumb side of the fist faces the viewer, the classic pointing-hand silhouette
        var pointRoll = thumbSide + wrapAngle(pc - thumbSide) * raised;                          // pointing up: the palm faces the viewer, the raised-finger silhouette
        arm.wrist.rotation.y = restRoll + wrapAngle(pointRoll - restRoll) * rollMix;
      }
      if (arm.th > 0.001) arm.wrist.rotation.y += wrapAngle(palmToHead(arm) - arm.wrist.rotation.y) * arm.th;
      arm.palm.scale.set(1, 1 + 0.04 * rf, 1 + 0.1 * rf);     // the palm thickens a little as the fingers close into a fist
      for (var ji = 0; ji < arm.joints.length; ji++) {
        var jg = arm.joints[ji], r0 = jg.userData.rest, r1 = jg.userData.point, r2 = jg.userData.fist, r3 = jg.userData.flat, r4 = jg.userData.scratch;
        var jx = r0[0] + (r1[0] - r0[0]) * rf, jy = r0[1] + (r1[1] - r0[1]) * rf, jz = r0[2] + (r1[2] - r0[2]) * rf;
        if (r2) { jx += (r2[0] - jx) * cf; jy += (r2[1] - jy) * cf; jz += (r2[2] - jz) * cf; }
        jx += (r3[0] - jx) * ff; jy += (r3[1] - jy) * ff; jz += (r3[2] - jz) * ff;
        jx += (r4[0] - jx) * arm.sc; jy += (r4[1] - jy) * arm.sc; jz += (r4[2] - jz) * arm.sc;
        jg.rotation.set(jx, jy, jz);
      }
    }

    // head: feeling pose + eye-head coupling + cursor look + little life
    var look = 0;
    if (!guide && pointer.seen && !reduced) {
      toFloor(pointer.x, pointer.y, tmpV);
      look = clamp(wrapAngle(Math.atan2(tmpV.x - pos.x, tmpV.z - pos.z) - walker.heading), -0.7, 0.7);
    }
    hy += look * 0.8 + micro.gx * 0.22;
    hx += micro.gy * 0.1;
    if (!reduced) {
      if (talk.on) hx += 0.035 * Math.sin(t * 7.5);
      hx += 0.06 * Math.abs(Math.sin(t * 12)) * E.laughing;
      hx += 0.08 * Math.sin(t * 1.1) * E.sleepy;
      if (micro.yawn >= 0) hx -= 0.28 * Math.sin(Math.PI * micro.yawn);
    }
    if (gest === 'think') hz += -0.1 * ps;
    if (gest === 'scratch') hz = -0.25 * ps;                                     // confused: the head tilts down onto the scratching hand
    var head = parts.head;
    head.rotation.x += (clamp(hx, -0.35, 0.45) - head.rotation.x) * k;
    head.rotation.y += (clamp(hy, -0.8, 0.8) - head.rotation.y) * k;
    head.rotation.z += (clamp(hz, -0.35, 0.35) - head.rotation.z) * k;

    key.position.set(pos.x - h * 0.9, h * 3.1, pos.z + h * 1.2);
    key.target.position.set(pos.x, h * 0.35, pos.z);
    key.target.updateMatrixWorld();
    var sc = key.shadow.camera;
    sc.left = -h * 1.2; sc.right = h * 1.2; sc.top = h * 1.5; sc.bottom = -h * 0.6;
    sc.near = h * 0.4; sc.far = h * 7;
    sc.updateProjectionMatrix();

    // where the head is on screen (for the bubble, the gaze and poking)
    headV.set(pos.x, R.headTop * h, pos.z);   // ring top, in figure heights
    var hs = toScreen(headV);
    headScreen.x = hs.x; headScreen.y = hs.y;
    facing = Math.cos(wrapAngle(headingToCamera() - walker.heading)) > 0.45;
  }

  /* ================= the face: the file's own eyes, brows, mouth and cheeks, driven by the action units ================= */
  function applyFace(A, gx, gy) {
    var i;
    for (i = 0; i < 2; i++) {
      var e = parts.eye[i], L = e.side < 0;
      var lu = clamp(L ? A.luR : A.luL, 0, 1.45), ll = clamp(L ? A.llR : A.llL, 0, 1);   // file's "right" eye is on the viewer's left
      var close = 1 - Math.min(lu, 1), wide = Math.max(lu, 1);
      e.up.rotation.x = -Math.PI / 2 + close * Math.PI;
      e.lo.rotation.x = Math.PI / 2 - ll * 0.42 * Math.PI;
      var sc = 1 + 0.16 * (wide - 1) + 0.06 * (clamp(A.pupil, 0.6, 1.5) - 1);
      e.eye.scale.set(e.scale.x * sc, e.scale.y * sc, e.scale.z);
      e.group.position.set(e.base.x + gx * 0.007, e.base.y + gy * 0.005, e.base.z);
      e.hi.visible = e.glint.visible = close < 0.55;
      e.hi.position.x = e.hi.userData.bx == null ? (e.hi.userData.bx = e.hi.position.x) : e.hi.userData.bx + gx * 0.004;
      e.hi.position.y = e.hi.userData.by == null ? (e.hi.userData.by = e.hi.position.y) : e.hi.userData.by + gy * 0.003;
    }
    for (i = 0; i < 2; i++) {
      var b = parts.brow[i], Lb = b.side < 0;
      var iu = Lb ? A.iuR : A.iuL, ou = Lb ? A.ouR : A.ouL, bd = Lb ? A.bdR : A.bdL;
      b.anchor.position.y = b.base.y + 0.032 * (iu + ou) / 2 - 0.024 * bd;
      b.anchor.position.x = b.base.x - b.side * 0.01 * bd;
      b.anchor.rotation.z = b.side * ((ou - iu) * 0.42 + bd * 0.3);
    }
    var sm = (A.smL + A.smR) / 2, fr = (A.frL + A.frR) / 2, open = clamp(A.jaw + 0.5 * A.upLip + 0.3 * A.loLip, 0, 1.2);
    var mg = parts.mouth.group, frown = fr > sm + 0.15;
    var wsc = 1 + 0.3 * A.stretch + 0.12 * sm - 0.55 * A.pucker + 0.05 * A.press;
    var ysc;
    if (frown) ysc = -(0.14 + 0.35 * fr + 0.5 * open);
    else if (A.pucker > 0.4) ysc = 0.35 + 0.4 * open;
    else ysc = open > 0.06 ? 0.28 + 0.85 * open : 0.1 + 0.08 * sm - 0.04 * A.press;
    mg.scale.set(wsc, ysc, 1);
    parts.mouth.tongue.visible = !frown && open > 0.22;
    parts.mouth.tongue.scale.set(1, clamp((open - 0.2) / 0.5, 0.2, 1) / Math.max(0.2, Math.abs(ysc)) * 0.9, 1);
    var bl = clamp(A.blush, 0, 1.4);
    for (i = 0; i < 2; i++) { var c = parts.cheek[i], f = 0.55 + 0.5 * bl; c.mesh.scale.set(c.scale.x * f, c.scale.y * f, c.scale.z); c.mesh.visible = bl > 0.05; }
    var tr = A.tear > 0.05, sw = A.sweat > 0.05;
    parts.tear.visible = tr; parts.sweat.visible = sw;
    if (tr) { var sl = (t * 0.32) % 1; parts.tear.position.y = -0.085 - sl * 0.08; parts.tear.material.opacity = 0.85 * A.tear * (sl < 0.82 ? 1 : (1 - sl) / 0.18); }
    if (sw) { var sl2 = (t * 0.22) % 1; parts.sweat.position.y = 0.19 - sl2 * 0.05; parts.sweat.material.opacity = 0.85 * A.sweat; }
  }
  function paintFace() { applyFace(A, micro.gx, micro.gy); }

  // Expression swatches: Loop's actual head, rendered once per feeling into the little canvases
  function snapshotFaces() {
    var S = 176, cam = new THREE.PerspectiveCamera(18, 1, 0.1, 50);
    var saveScale = rig.scale.clone(), savePos = rig.position.clone(), saveRot = rig.rotation.clone(), saveHips = parts.hips.position.y;
    var saveHead = parts.head.rotation.clone();
    rig.scale.setScalar(1); rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); parts.hips.position.y = M.hipY; parts.head.rotation.set(0, 0, 0);
    key.position.set(-0.6, 2.2, 1.6); key.target.position.set(0, M.headY, 0); key.target.updateMatrixWorld();
    var sc = key.shadow.camera; sc.left = -1; sc.right = 1; sc.top = 1.2; sc.bottom = -1.2; sc.near = 0.5; sc.far = 6; sc.updateProjectionMatrix();
    cam.position.set(0.02, M.headY + 0.02, 2.55); cam.lookAt(0, M.headY - 0.01, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    var pr = renderer.getPixelRatio(), ch = renderer.domElement.height, sizeV = new THREE.Vector2();
    renderer.getSize(sizeV);
    renderer.setScissorTest(true);
    Array.prototype.forEach.call(document.querySelectorAll('canvas[data-emo]'), function (c) {
      var e = EMO[c.dataset.emo]; if (!e) return;
      var gz = e.gaze ? { x: e.gaze[0] * e.gaze[2], y: e.gaze[1] * e.gaze[2] } : { x: 0, y: 0 };
      applyFace(e.au, gz.x, gz.y);
      rig.updateMatrixWorld(true);
      renderer.setViewport(0, 0, S, S); renderer.setScissor(0, 0, S, S);
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, cam);
      var g = c.getContext('2d'), W2 = c.width;
      g.clearRect(0, 0, W2, W2);
      var grd = g.createRadialGradient(W2 * 0.5, W2 * 0.45, W2 * 0.1, W2 * 0.5, W2 * 0.5, W2 * 0.5);
      grd.addColorStop(0, '#16304d'); grd.addColorStop(1, '#0a1626');
      g.fillStyle = grd; g.beginPath(); g.arc(W2 / 2, W2 / 2, W2 * 0.49, 0, TAU); g.fill();
      g.drawImage(renderer.domElement, 0, ch - S * pr, S * pr, S * pr, 0, 0, W2, W2);
    });
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, sizeV.x, sizeV.y);
    renderer.setScissor(0, 0, sizeV.x, sizeV.y);
    rig.scale.copy(saveScale); rig.position.copy(savePos); rig.rotation.copy(saveRot); parts.hips.position.y = saveHips; parts.head.rotation.copy(saveHead);
    renderer.clear();
  }

  /* ================= telemetry (optional callback) ================= */
  var teleAcc = 0;
  function telemetry(dt) {
    teleAcc += dt;
    if (teleAcc < 0.12) return;
    teleAcc = 0;
    if (fcMood) fcMood.textContent = EMO[dom.n].name + (dom.v > 0 ? ' ' + Math.round(dom.v * 100) + '%' : '');
    if (typeof opts.onTelemetry !== 'function') return;
    var h = figW(), vH = walker.v / h, feet = toScreen(pos);
    opts.onTelemetry({
      x: Math.round(feet.x), y: Math.round(feet.y), figure: Math.round(figH()),    // YATICORP change: where its feet are on the screen, and its height

      feeling: EMO[dom.n].name, feelingKey: dom.n, strength: dom.v, second: second.n ? EMO[second.n].name : null,
      gait: gaitOf(vH), speed: walker.v, scaledSpeed: vH * 1.75, headingDeg: ((walker.heading / D2R) % 360 + 360) % 360,
      cursorSpeed: cursorSpeed, triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls, fps: 1000 / Math.max(1, frameAvg), tier: tier
    });
  }

  /* ================= options at run time ================= */
  function applyOptions(next, announce) {
    var modeChanged = false;
    if (next) {
      for (var k in next) {
        if (k === 'mode' && next.mode !== P.mode) modeChanged = true;
        if (k in DEFAULTS) P[k] = next[k];
      }
      if (next.explain && typeof next.explain === 'object') Object.assign(EXPLAIN, next.explain);
    }
    P.facecam = !!P.facecam && !!fcCtx;
    if (fcWrap) fcWrap.classList.toggle('off', !P.facecam);
    if (P.prints === 0) { while (prints.length) retire(prints.pop()); }
    if (!P.explain && guide) endGuide(false);
    layout();
    if (ready) keepInBand();
    if (announce && modeChanged && ready) {
      if (guide) endGuide(false);
      roam.target = null;
      impulse(P.mode === 'roam' ? 'excited' : 'content', 0.7, 1.4);
    }
  }

  /* ================= public API ================= */
  var GESTURES = ['rest', 'idea', 'point', 'wave', 'cheer', 'proud', 'hip', 'heart', 'shy', 'think', 'scratch', 'shrug', 'ready', 'startle', 'cower', 'slump', 'fists', 'recoil', 'wipe', 'laugh'];
  var api = {
    say: function (label, text, secs, emo) { if (rigReady) say(label || '', text || '', secs || 0, EMO[emo] ? emo : 'content'); return api; },
    feel: function (name, strength, seconds) { if (EMO[name]) impulse(name, strength === undefined ? 1 : strength, seconds || 1.5); return api; },
    gesture: function (g, seconds) { if (GESTURES.indexOf(g) >= 0) gestureOverride = { g: g, until: t + (seconds || 2) }; return api; },
    explain: function (target) {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      // YATICORP change: by explainKey, so a plain button (no data-explain) is explained the way a hover on it
      // would be, with describeButton's words. The package keyed it '' and said nothing. And it waits its turn:
      // while Loop is mid-sentence (the greeting, or something the student paused on) it is queued rather than
      // cutting that off, and the update loop starts it once the bubble has gone.
      if (el && (guide || bubbleOn)) queuedGuide = el;
      else if (el) startGuide(explainKey(el), el, true);
      return api;
    },
    hush: function () { if (guide) endGuide(false); else hush(); return api; },
    set: function (next) { applyOptions(next || {}, true); return api; },
    get options() { return Object.assign({}, P); },
    get ready() { return rigReady; },
    get speaking() { return bubbleOn; },                                          // YATICORP change: did a say() show?
    pause: function () { running = false; cancelAnimationFrame(rafId); return api; },
    resume: function () { if (!running) { running = true; last = -1; rafId = requestAnimationFrame(frame); } return api; },
    /* YATICORP change: off the screen and back without a remount, so the 3D file is not loaded again and Loop does
       not greet a second time. Hidden, it draws nothing, says nothing and cannot be poked. */
    hide: function () { queuedGuide = null; if (guide) endGuide(false); else hush(); goingHome = false; hidden = true; root.style.display = 'none'; setRoom(0); return api.pause(); },
    show: function () { if (hidden) { hidden = false; said = {}; root.style.display = ''; resize(); } return ready ? api.resume() : api; },
    destroy: function () {
      running = false; cancelAnimationFrame(rafId);
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      if (renderer) renderer.dispose();
      if (root.parentNode) root.parentNode.removeChild(root);
      markExplained(null);
      document.documentElement.style.removeProperty('--yati-room');               // YATICORP change: see setRoom
    }
  };
  /* ================= boot ================= */
  ready = initGL();
  if (ready) initFaceCam();
  on(window, 'resize', resize);
  on(document, 'visibilitychange', function () { if (!document.hidden) resize(); });
  on(window, 'pageshow', resize);
  resize();
  applyOptions(null, false);

  function fail(msg) { if (hint) hint.textContent = msg; if (typeof opts.onError === 'function') opts.onError(new Error(msg)); else console.warn('[LoopWalker] ' + msg); }
  if (!ready) {
    glCanvas.style.display = 'none';
    fcWrap.classList.add('off');
    fail('WebGL unavailable on this device');
    return api;
  }

  if (P.mode === 'stand') standSpot(pos); else toFloor(W * 0.8, H * 0.88, pos);   // YATICORP change: see standSpot
  walker.heading = headingToCamera();
  hint.textContent = 'Loading Yati\u2026';

  var loadT0 = Date.now(), loaded = false;
  var slow = setTimeout(function () { if (!loaded) hint.textContent = 'Still loading Yati\u2019s 3D file (8 MB) \u2014 a slow connection takes a little longer'; }, 20000);
  glCanvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    fail('The graphics context was lost, so Yati stopped rendering. Reload the page to bring it back.');
  });
  tierSince = performance.now();
  loadModel(function (got, total) {
    if (total) hint.textContent = 'Loading Yati\u2026 ' + Math.min(99, Math.round(got / total * 100)) + '%';
    else hint.textContent = 'Loading Yati\u2026 ' + (got / 1048576).toFixed(1) + ' MB';
  }).then(function () {
    loaded = true; clearTimeout(slow);
    walker.heading = headingToCamera();
    keepInBand();
    pose(0);
    applyFace(A, 0, 0);
    try { snapshotFaces(); } catch (e) { /* the swatches keep their placeholders */ }
    if (reduced) {
      hint.textContent = 'Pause on anything and Yati will explain it';
    } else {
      hint.textContent = coarse ? 'Drag to lead it \u00B7 tap anything to hear about it \u00B7 tap Yati to poke it'
                                : 'Move to lead it \u00B7 pause to hear about something \u00B7 click Yati to poke it';
    }
    if (typeof opts.onReady === 'function') opts.onReady(api);
    setTimeout(function () {
      if (guide || opts.greeting === false) return;
      measurePopup();
      if (tucked || popupOpen) { greetPending = true; return; }                   // YATICORP change: said when it closes
      greet();
    }, 700);
  }).catch(function (err) {
    loaded = true; clearTimeout(slow);
    fail("Yati's 3D file didn't load (" + (err && err.message ? err.message : err) + ')');
  });

  // rAF timestamps can trail performance.now(), so the clock starts on the first callback and dt is never negative
  var last = -1, frameN = 0;
  var running = true, rafId = 0, hidden = false;
  /* YATICORP change, not in the shipped package: Yati draws less when nobody would see the difference, so the page
     scrolls smoothly on a modest phone. A full-screen 3D scene at the phone's own pixel ratio, with soft shadows,
     redrawn 60 times a second, competes with scrolling for the same graphics chip.
       · While the page scrolls (any scrolling element: the app scrolls <main>, not the window) it does not draw at
         all; it picks up where it was 140 ms after the scroll stops.
       · On a touch screen, standing still and silent, it draws every other frame: a slow breath at 30 fps looks the
         same as at 60.
     A skipped frame keeps `last`, so the next drawn frame moves Yati on by the time that really passed; and the
     frame after a rest is not timed, so resting never reads as a slow phone and costs it quality (watchFrame). */
  var lastScrollAt = -1e9, rested = false, restTick = 0;
  on(document, 'scroll', function () { lastScrollAt = performance.now(); }, { capture: true, passive: true });
  function shouldRest(now) {
    // YATICORP change (2026-10-14): while the page scrolls Loop is drawn every other frame instead of not at all. It
    // used to stop dead mid-step for as long as the student scrolled, which on a phone is most of the time, and
    // looked stuck. Half the frames still leaves the scroll the room it needs.
    // YATICORP change (2026-10-15): standing in its corner (mode 'stand') it rests for the whole scroll. It does not
    // move on the screen as the page goes by, and the scroll gets every frame to itself.
    if (now - lastScrollAt < 140) { if (P.mode === 'stand') return true; restTick = (restTick + 1) % 2; return restTick === 1; }
    if (!coarse || guide || talk.on || bubbleOn || walker.v > 0.02 * figW()) return false;
    restTick = (restTick + 1) % 2;
    return restTick === 1;
  }

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    if (last < 0 || document.hidden) { last = now; return; }
    if (rigReady && !hidden && shouldRest(now)) { rested = true; return; }
    var rawDt = (now - last) / 1000, dt = clamp(rawDt, 0, 0.05);
    last = now;
    if (!rigReady) return;
    frameN++;
    if (frameN % 30 === 0 && (window.innerWidth !== W || window.innerHeight !== H)) resize();
    else if (frameN % 20 === 0) measureNav();                                     // YATICORP change: see band
    if (frameN % (coarse ? 10 : 6) === 0) { measureAvoid(); measurePopup(); }       // YATICORP change: see AVOID, POPUPS (phones: ~6 a second)
    update(dt);
    setTucked(nowhereLast || popupOpen);
    feel(dt);
    pose(dt);
    if (reduced && frameN % 6) { placeBubble(); telemetry(dt); return; }
    paintFace();
    renderer.info.reset();
    // One shadow pass a frame, shared by both views — on a phone every other frame (YATICORP change): the pass
    // draws the whole figure a second time, and at 30 updates a second the shadow still keeps up with its feet.
    renderer.shadowMap.needsUpdate = !coarse || frameN % 2 === 0;
    renderFaceCam(dt);
    if (frameN % 20 === 0 || !clipBox !== !(P.mode === 'stand' && !P.facecam)) sizeCanvas(false);   // YATICORP change: see clipBox
    if (frameN % 20 === 0) setRoom();                                             // YATICORP change: see setRoom
    if (clipBox) camera.setViewOffset(W, H, clipBox.x, clipBox.y, clipBox.w, clipBox.h);
    renderer.render(scene, camera);
    if (clipBox) camera.clearViewOffset();
    placeBubble();
    telemetry(dt);
    if (!rested) watchFrame(Math.min(rawDt, 0.25));
    rested = false;
  }
  rafId = requestAnimationFrame(frame);
  return api;

  }

  var LoopWalker = {
    version: '1.0.0',
    mount: function (opts) {
      opts = Object.assign({}, opts || {});
      if (!opts.model) opts.model = BASE + 'mascot.glb';
      ensureCss(opts.css === undefined ? BASE + 'loop-walker.css' : opts.css);
      var handle = { ready: false, _api: null };
      // YATICORP change: hide and show added. A method missing here does not exist on the handle at all.
      ['say', 'feel', 'gesture', 'explain', 'hush', 'set', 'pause', 'resume', 'hide', 'show', 'destroy'].forEach(function (m) {
        handle[m] = function () { var a = arguments; if (handle._api) return handle._api[m].apply(handle._api, a); handle._queue.push([m, a]); return handle; };
      });
      handle._queue = [];
      // YATICORP change: whether the last say() is showing (false while it is loading, hidden or a popup is open).
      Object.defineProperty(handle, 'speaking', { get: function () { return !!(handle._api && handle._api.speaking); } });
      handle.promise = ensureThree(opts.three).then(function () {
        var api = boot(opts);
        handle._api = api;
        handle._queue.forEach(function (q) { api[q[0]].apply(api, q[1]); });
        handle._queue = [];
        return api;
      });
      // YATICORP change: a failure is always handled. With no onError it used to surface as an uncaught error on every
      // page; now it is a warning, and the page goes on without Yati.
      handle.promise.catch(opts.onError || function (e) { if (global.console) console.warn('[Yati] ' + (e && e.message ? e.message : e)); });
      return handle;
    }
  };
  if (typeof module === 'object' && module.exports) module.exports = LoopWalker;
  global.LoopWalker = LoopWalker;
})(typeof window !== 'undefined' ? window : this);
