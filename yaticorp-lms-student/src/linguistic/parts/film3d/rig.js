/**
 * The story film's people, modelled in code (2026-11-07, asked: "fully modelled 3D characters that move naturally
 * … generated programmatically, no external models"): a hierarchical rig — hips, spine, chest, neck, head; each arm
 * shoulder → elbow → wrist → hand with fingers; each leg hip → knee → ankle → foot — built from smooth capsules and
 * spheres so the limbs stay joined when they bend. A face with eyes (lids, irises), brows, nose, ears and a mouth
 * whose lips curve and open; hair; clothes with collar, buttons, belt, shoes; a watch, a folder, a cloth bag.
 *
 * buildCharacter(spec) → { root, joints, face, parts, spec }. The animator (anim.js) moves the joints; nothing here
 * is rebuilt per frame. One model per person, reused in every scene.
 */
import * as THREE from 'three';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02, ...o });
const shadowed = (m) => { m.castShadow = true; m.receiveShadow = false; return m; };
const capsule = (r, len, material, seg = 10) => shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 4, seg), material));
const sphere = (r, material, w = 16, h = 12) => shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, w, h), material));
const box = (w, h, d, material) => shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));

/** A limb hanging from its joint (a pivot group at the top): a joint ball, then the capsule down to the next joint. */
function limb(parent, r, len, material, name) {
    const pivot = new THREE.Group(); pivot.name = name; parent.add(pivot);
    const ball = sphere(r * 0.98, material, 14, 10); pivot.add(ball);
    const seg = capsule(r, len - r * 1.2, material); seg.position.y = -len / 2; pivot.add(seg);
    return pivot;
}

/** The people's looks. */
export const SPECS = {
    arjun: {
        name: 'Arjun', age: 'young', height: 1.76, build: 1,
        skin: '#b97a55', hair: '#17110e', hairStyle: 'short',
        shirt: '#8fb4ea', sleeves: 'rolled', collar: '#7fa6e2', trousers: '#1f2a44', belt: '#4a2f1d', shoes: 'formal', shoeColor: '#15110f',
        watch: true, folder: '#2f6fb5'
    },
    ravi: {
        name: 'Ravi', age: 'old', height: 1.66, build: 0.86,
        skin: '#a9714d', hair: '#d9d9d9', hairStyle: 'thin',
        shirt: '#efe5cf', sleeves: 'long', collar: '#e3d7bd', trousers: '#6b4a32', belt: null, shoes: 'sandals', shoeColor: '#5a3b26',
        bag: '#8a6a3a', wrinkles: true, glasses: true
    },
    interviewer: {
        name: 'the interviewer', age: 'adult', height: 1.78, build: 1.04,
        skin: '#b8835c', hair: '#201612', hairStyle: 'side',
        shirt: '#ffffff', sleeves: 'suit', suit: '#223566', collar: '#f4f4f4', tie: '#3f6fc4', trousers: '#1d2b52', belt: '#1a1a1a', shoes: 'formal', shoeColor: '#0e0c0b',
        moustache: true
    }
};

/** Build one person. Proportions scale with `height`; `build` widens or slims the body. */
export function buildCharacter(key) {
    const spec = SPECS[key];
    const H = spec.height / 1.76;           // everything below is drawn for 1.76 m, then scaled
    const B = spec.build;
    const skin = std(spec.skin, { roughness: 0.55, emissive: new THREE.Color(spec.skin), emissiveIntensity: 0.12 });
    const hairM = std(spec.hair, { roughness: 0.9 });
    const shirtM = std(spec.shirt, { roughness: 0.85 });
    const suitM = spec.suit ? std(spec.suit, { roughness: 0.8 }) : null;
    const trouserM = std(spec.trousers, { roughness: 0.85 });
    const shoeM = std(spec.shoeColor, { roughness: 0.4, metalness: 0.05 });
    const dark = std('#2a1a16');
    const white = std('#ffffff', { roughness: 0.3 });
    const lipM = std('#7a3a33', { roughness: 0.5 });
    const mouthM = std('#4a1a18', { roughness: 0.6 });

    const root = new THREE.Group(); root.name = key;
    const J = {};
    // ── Pelvis and spine ───────────────────────────────────────────────
    const hips = new THREE.Group(); hips.name = 'hips'; hips.position.y = 0.93; root.add(hips); J.hips = hips;
    const pelvis = capsule(0.155 * B, 0.1, trouserM); pelvis.scale.set(1, 0.75, 0.8); pelvis.position.y = -0.02; hips.add(pelvis);
    if (spec.belt) { const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * B, 0.165 * B, 0.045, 24), std(spec.belt, { roughness: 0.5 })); belt.position.y = 0.055; belt.scale.z = 0.8; hips.add(belt); const buckle = box(0.04, 0.03, 0.01, std('#cfd4da', { metalness: 0.6, roughness: 0.3 })); buckle.position.set(0, 0.055, 0.13 * B); hips.add(buckle); }
    const spine = new THREE.Group(); spine.name = 'spine'; spine.position.y = 0.08; hips.add(spine); J.spine = spine;
    const waist = capsule(0.15 * B, 0.12, suitM || shirtM); waist.scale.set(1, 0.9, 0.78); waist.position.y = 0.06; spine.add(waist);
    const chest = new THREE.Group(); chest.name = 'chest'; chest.position.y = 0.16; spine.add(chest); J.chest = chest;
    const torso = capsule(0.17 * B, 0.2, suitM || shirtM); torso.scale.set(1.08, 1, 0.74); torso.position.y = 0.1; chest.add(torso);
    // Shirt front under a suit, and the tie
    if (suitM) {
        const front = box(0.09, 0.26, 0.012, shirtM); front.position.set(0, 0.13, 0.121 * B); chest.add(front);
        const tie = box(0.035, 0.26, 0.012, std(spec.tie, { roughness: 0.5 })); tie.position.set(0, 0.06, 0.133 * B); chest.add(tie);
        const knot = box(0.045, 0.04, 0.02, std(spec.tie, { roughness: 0.5 })); knot.position.set(0, 0.215, 0.135 * B); chest.add(knot);
        const lapelL = box(0.045, 0.22, 0.008, suitM); lapelL.position.set(-0.06, 0.14, 0.126 * B); lapelL.rotation.z = 0.25; chest.add(lapelL);
        const lapelR = lapelL.clone(); lapelR.position.x = 0.07; lapelR.rotation.z = -0.25; chest.add(lapelR);
    } else {
        for (let i = 0; i < 4; i += 1) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.004, 10), white); b.rotation.x = Math.PI / 2; b.position.set(0, 0.2 - i * 0.075, 0.127 * B); chest.add(b); }
        const placket = box(0.012, 0.3, 0.006, std(spec.collar)); placket.position.set(0.012, 0.08, 0.126 * B); chest.add(placket);
        if (key === 'arjun') { const pocket = box(0.07, 0.07, 0.005, std(spec.collar)); pocket.position.set(0.07, 0.14, 0.126 * B); chest.add(pocket); }
    }
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 10, 24, Math.PI * 1.5), std(spec.collar)); collar.rotation.x = Math.PI / 2; collar.rotation.z = Math.PI * 0.75; collar.position.set(0, 0.29, 0.02); chest.add(collar);
    // ── Neck and head ──────────────────────────────────────────────────
    const neck = new THREE.Group(); neck.name = 'neck'; neck.position.y = 0.3; chest.add(neck); J.neck = neck;
    const neckM = capsule(0.045, 0.06, skin); neckM.position.y = 0.03; neck.add(neckM);
    const head = new THREE.Group(); head.name = 'head'; head.position.y = 0.1; head.scale.setScalar(1.28); neck.add(head); J.head = head;
    const skull = sphere(0.115, skin, 28, 22); skull.scale.set(0.96, 1.1, 1); skull.position.y = 0.09; head.add(skull);
    const jaw = sphere(0.1, skin, 20, 14); jaw.scale.set(0.92, 0.8, 0.9); jaw.position.set(0, 0.035, 0.01); head.add(jaw);
    const F = { }; // face parts
    // ── The face: big cartoon eyes with a lower lid, rounded arched brows, a soft nose, full lips, a blush ──
    const eyeY = 0.1, eyeZ = 0.088, eyeX = 0.046;
    const browM = std(spec.hair === '#d9d9d9' ? '#bdbdbd' : spec.hair, { roughness: 0.9 });
    ['L', 'R'].forEach((side, i) => {
        const sx = i ? 1 : -1;
        const socket = new THREE.Group(); socket.position.set(sx * eyeX, eyeY, eyeZ); head.add(socket);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.031, 20, 14), white); ball.scale.set(1, 0.92, 0.62); socket.add(ball);
        const look = new THREE.Group(); socket.add(look); F[`eye${side}`] = look;       // turned to look about
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0175, 16, 12), std(spec.age === 'old' ? '#5a3a22' : '#4a2a14', { roughness: 0.3 })); iris.position.z = 0.0175; iris.scale.z = 0.45; look.add(iris);
        const irisRim = new THREE.Mesh(new THREE.TorusGeometry(0.0165, 0.0018, 6, 20), dark); irisRim.position.z = 0.0245; look.add(irisRim);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 8), dark); pupil.position.z = 0.025; pupil.scale.z = 0.5; look.add(pupil);
        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff' })); glint.position.set(0.006, 0.007, 0.028); look.add(glint);
        const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.002, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff' })); glint2.position.set(-0.006, -0.005, 0.028); look.add(glint2);
        // The upper lid: a skin dome that slides down over the eye as it closes (scale y 0.12 open … 1 closed).
        const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0335, 18, 10), skin); lid.scale.set(1.06, 0.12, 0.7); lid.position.y = 0.0305 * (1 - 0.12); socket.add(lid); F[`lid${side}`] = lid;
        const lashes = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0022, 6, 20, Math.PI), dark); lashes.position.set(0, 0.002, 0.017); lashes.scale.set(1.02, 0.85, 1); socket.add(lashes);
        const lower = new THREE.Mesh(new THREE.TorusGeometry(0.029, 0.0012, 6, 16, Math.PI), std('#8a5a3c')); lower.rotation.z = Math.PI; lower.position.set(0, -0.004, 0.017); lower.scale.set(1, 0.5, 1); socket.add(lower);
        // A rounded, gently arched brow: a bent capsule
        const brow = new THREE.Group(); brow.position.set(sx * (eyeX + 0.002), eyeY + 0.042, eyeZ + 0.012); head.add(brow); F[`brow${side}`] = brow; brow.userData.base = { y: brow.position.y, z: sx * 0.06 }; brow.rotation.z = sx * 0.06;
        const b1 = capsule(0.0055, 0.03, browM, 8); b1.rotation.z = Math.PI / 2; b1.position.x = sx * -0.012; brow.add(b1);
        const b2 = capsule(0.0055, 0.026, browM, 8); b2.rotation.z = Math.PI / 2 + sx * 0.35; b2.position.set(sx * 0.016, 0.004, 0); brow.add(b2);
        const ear = sphere(0.022, skin, 12, 10); ear.scale.set(0.5, 1, 0.8); ear.position.set(sx * 0.11, eyeY - 0.012, 0.004); head.add(ear);
        const earIn = sphere(0.012, std('#b0704e'), 8, 6); earIn.scale.set(0.4, 0.9, 0.7); earIn.position.set(sx * 0.112, eyeY - 0.012, 0.012); head.add(earIn);
        const blush = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshStandardMaterial({ color: '#ff8a7a', transparent: true, opacity: 0.22, roughness: 1 })); blush.scale.set(1.2, 0.7, 0.3); blush.position.set(sx * 0.062, eyeY - 0.045, 0.092); head.add(blush);
        if (spec.wrinkles) { const bag = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.002, 6, 16, Math.PI), std('#8a5a3c', { transparent: true, opacity: 0.5 })); bag.rotation.z = Math.PI; bag.position.set(sx * eyeX, eyeY - 0.016, eyeZ + 0.014); bag.scale.set(1, 0.5, 1); head.add(bag); }
    });
    const nose = sphere(0.015, skin, 14, 10); nose.scale.set(0.95, 1.05, 1.05); nose.position.set(0, 0.068, 0.116); head.add(nose);
    const bridge = capsule(0.009, 0.022, skin, 8); bridge.position.set(0, 0.086, 0.108); bridge.rotation.x = 0.3; head.add(bridge);
    // The mouth: a dark cavity that opens, teeth, and lips that curve up (smile) or down.
    const mouth = new THREE.Group(); mouth.position.set(0, 0.026, 0.1); head.add(mouth);
    const cavity = new THREE.Mesh(new THREE.CircleGeometry(0.024, 20), mouthM); cavity.scale.set(1, 0.05, 1); mouth.add(cavity); F.cavity = cavity;
    const teeth = box(0.032, 0.007, 0.004, white); teeth.position.set(0, 0.011, 0.001); teeth.visible = false; mouth.add(teeth); F.teeth = teeth;
    const lips = new THREE.Mesh(new THREE.TorusGeometry(0.029, 0.0062, 8, 22, Math.PI), lipM); lips.rotation.z = Math.PI; lips.scale.y = 0.2; lips.position.z = 0.003; mouth.add(lips); F.lips = lips;
    const lowerLip = sphere(0.012, std('#9a4a40', { roughness: 0.45 }), 12, 8); lowerLip.scale.set(2.1, 0.45, 0.6); lowerLip.position.set(0, -0.006, 0.004); mouth.add(lowerLip); F.lowerLip = lowerLip;
    const chin = sphere(0.02, skin, 12, 8); chin.scale.set(1.2, 0.7, 0.6); chin.position.set(0, -0.004, 0.096); head.add(chin);
    if (spec.moustache) { [-1, 1].forEach((sx) => { const m = capsule(0.0075, 0.022, hairM, 8); m.rotation.z = Math.PI / 2 + sx * 0.25; m.position.set(sx * 0.016, 0.048, 0.112); head.add(m); }); }
    if (spec.wrinkles) {
        const wM = new THREE.MeshStandardMaterial({ color: '#7a4a30', roughness: 1, transparent: true, opacity: 0.45 });
        [[0, 0.168, 0.105, 0.075], [0, 0.185, 0.098, 0.055]].forEach(([x, y, z, w]) => { const l = new THREE.Mesh(new THREE.TorusGeometry(w, 0.0014, 6, 14, Math.PI), wM); l.scale.set(1, 0.3, 1); l.position.set(x, y, z); head.add(l); });
        // A full white beard round the jaw, in soft tufts
        const beardM = std('#f1f1f1', { roughness: 0.95 });
        for (let i = 0; i < 9; i += 1) { const a = -1.25 + (i / 8) * 2.5; const t = sphere(0.03 - Math.abs(a) * 0.006, beardM, 10, 8); t.position.set(Math.sin(a) * 0.1, 0.012 - Math.cos(a) * 0.03 + Math.abs(a) * 0.03, 0.055 + Math.cos(a) * 0.052); t.scale.set(1, 1.15, 0.8); head.add(t); }
        const chinBeard = sphere(0.034, beardM, 12, 8); chinBeard.scale.set(1.1, 1.3, 0.8); chinBeard.position.set(0, -0.022, 0.085); head.add(chinBeard);
        [-1, 1].forEach((sx) => { const m = capsule(0.008, 0.024, beardM, 8); m.rotation.z = Math.PI / 2 + sx * 0.3; m.position.set(sx * 0.018, 0.047, 0.115); head.add(m); });
    }
    if (spec.glasses) {
        const gM = std('#4a3a2a', { metalness: 0.5, roughness: 0.4 });
        [-1, 1].forEach((sx) => { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0025, 8, 24), gM); rim.position.set(sx * eyeX, eyeY, eyeZ + 0.03); head.add(rim); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 20), new THREE.MeshStandardMaterial({ color: '#dff3ff', transparent: true, opacity: 0.16, roughness: 0.05 })); lens.position.set(sx * eyeX, eyeY, eyeZ + 0.03); head.add(lens); const arm = capsule(0.002, 0.1, gM, 6); arm.rotation.x = Math.PI / 2; arm.position.set(sx * 0.1, eyeY + 0.004, eyeZ - 0.03); head.add(arm); });
        const bridgeG = capsule(0.0022, 0.012, gM, 6); bridgeG.rotation.z = Math.PI / 2; bridgeG.position.set(0, eyeY + 0.004, eyeZ + 0.03); head.add(bridgeG);
    }
    // Hair
    if (spec.hairStyle === 'short' || spec.hairStyle === 'side') {
        // The hairline well above the brows: a cap over the crown, and the back and sides reaching down to the nape.
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.121, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.3), hairM); cap.scale.set(0.98, 1.1, 1.02); cap.position.set(0, 0.095, -0.006); shadowed(cap); head.add(cap);
        const back = new THREE.Mesh(new THREE.SphereGeometry(0.121, 28, 18, Math.PI * 0.95, Math.PI * 1.1, Math.PI * 0.25, Math.PI * 0.4), hairM); back.scale.set(0.98, 1.1, 1.02); back.position.set(0, 0.095, -0.006); shadowed(back); head.add(back);
        const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.121, 24, 10, Math.PI * 0.3, Math.PI * 0.4, Math.PI * 0.22, Math.PI * 0.1), hairM); fringe.scale.set(1.0, 1.1, 1.04); fringe.position.set(0, 0.095, -0.002); shadowed(fringe); head.add(fringe);
        if (spec.hairStyle === 'side') { const part = box(0.003, 0.01, 0.1, skin); part.position.set(-0.035, 0.205, 0.04); head.add(part); }
        else { for (let i = 0; i < 7; i += 1) { const tuft = sphere(0.03, hairM, 10, 8); const a = -0.95 + i * 0.32; tuft.position.set(Math.sin(a) * 0.1, 0.205 + Math.cos(a * 1.7) * 0.01, Math.cos(a) * 0.055 - 0.015); tuft.scale.set(1, 0.7, 1); head.add(tuft); } }
    } else {
        // Thin grey hair: over the ears and round the back, the crown bare.
        const back = new THREE.Mesh(new THREE.SphereGeometry(0.119, 24, 14, Math.PI * 1.05, Math.PI * 0.9, Math.PI * 0.32, Math.PI * 0.34), hairM); back.scale.set(0.98, 1.1, 1.02); back.position.set(0, 0.095, -0.006); head.add(back);
        const sideL = new THREE.Mesh(new THREE.SphereGeometry(0.119, 16, 10, -Math.PI * 0.14, Math.PI * 0.28, Math.PI * 0.36, Math.PI * 0.26), hairM); sideL.scale.copy(back.scale); sideL.position.copy(back.position); head.add(sideL);
        const sideR = new THREE.Mesh(new THREE.SphereGeometry(0.119, 16, 10, Math.PI * 0.86, Math.PI * 0.28, Math.PI * 0.36, Math.PI * 0.26), hairM); sideR.scale.copy(back.scale); sideR.position.copy(back.position); head.add(sideR);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.3), std(spec.hair, { roughness: 0.9, transparent: true, opacity: 0.55 })); crown.scale.set(1.1, 1.1, 1.1); crown.position.set(0, 0.105, -0.01); head.add(crown);
    }
    // ── Arms ───────────────────────────────────────────────────────────
    const armR = 0.045 * B, foreR = 0.04 * B, upperLen = 0.29, foreLen = 0.27;
    ['L', 'R'].forEach((side, i) => {
        const sx = i ? 1 : -1;
        const sleeveM = suitM || shirtM;
        const shoulder = limb(chest, armR, upperLen, sleeveM, `shoulder${side}`); shoulder.position.set(sx * 0.2 * B, 0.25, 0); J[`shoulder${side}`] = shoulder;
        const elbowM = spec.sleeves === 'rolled' ? skin : sleeveM;
        const elbow = limb(shoulder, foreR, foreLen, elbowM, `elbow${side}`); elbow.position.y = -upperLen; J[`elbow${side}`] = elbow;
        if (spec.sleeves === 'rolled') { const cuff = new THREE.Mesh(new THREE.CylinderGeometry(foreR * 1.25, foreR * 1.2, 0.05, 14), shirtM); cuff.position.y = -0.03; elbow.add(cuff); }
        if (spec.sleeves === 'suit') { const cuff = new THREE.Mesh(new THREE.CylinderGeometry(foreR * 1.05, foreR * 1.05, 0.02, 14), shirtM); cuff.position.y = -foreLen + 0.01; elbow.add(cuff); }
        const wrist = new THREE.Group(); wrist.name = `wrist${side}`; wrist.position.y = -foreLen; elbow.add(wrist); J[`wrist${side}`] = wrist;
        if (spec.watch && side === 'L') { const band = new THREE.Mesh(new THREE.TorusGeometry(foreR * 1.05, 0.007, 8, 18), std('#2a2a2a', { roughness: 0.6 })); band.rotation.x = Math.PI / 2; band.position.y = 0.02; wrist.add(band); const face = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.006, 16), std('#1b2a44', { metalness: 0.7, roughness: 0.25 })); face.rotation.z = Math.PI / 2; face.position.set(-foreR * 1.05, 0.02, 0); wrist.add(face); }
        // The hand: a palm, four fingers that curl together, a thumb.
        const palm = box(0.07 * B, 0.075, 0.024, skin); palm.position.y = -0.04; wrist.add(palm);
        const fingers = new THREE.Group(); fingers.name = `fingers${side}`; fingers.position.y = -0.077; wrist.add(fingers); J[`fingers${side}`] = fingers;
        [-0.024, -0.008, 0.008, 0.024].forEach((fx, k) => { const f = capsule(0.0085, 0.03 + (k === 1 || k === 2 ? 0.008 : 0), skin, 8); f.position.set(fx * B, -0.02, 0); fingers.add(f); });
        const thumb = capsule(0.009, 0.028, skin, 8); thumb.position.set(sx * -0.038 * B, -0.03, 0.01); thumb.rotation.z = sx * -0.9; wrist.add(thumb);
        wrist.userData.sx = sx;
    });
    // ── Legs ───────────────────────────────────────────────────────────
    const thighR = 0.075 * B, shinR = 0.055 * B, thighLen = 0.45, shinLen = 0.42;
    ['L', 'R'].forEach((side, i) => {
        const sx = i ? 1 : -1;
        const hip = limb(hips, thighR, thighLen, trouserM, `hip${side}`); hip.position.set(sx * 0.09 * B, -0.03, 0); J[`hip${side}`] = hip;
        const knee = limb(hip, shinR, shinLen, trouserM, `knee${side}`); knee.position.y = -thighLen; J[`knee${side}`] = knee;
        const ankle = new THREE.Group(); ankle.name = `ankle${side}`; ankle.position.y = -shinLen; knee.add(ankle); J[`ankle${side}`] = ankle;
        if (spec.shoes === 'sandals') {
            const sole = box(0.085 * B, 0.022, 0.26, shoeM); sole.position.set(0, -0.04, 0.05); ankle.add(sole);
            const foot = box(0.07 * B, 0.03, 0.2, skin); foot.position.set(0, -0.02, 0.06); ankle.add(foot);
            [0.02, 0.1].forEach((z) => { const strap = box(0.09 * B, 0.012, 0.02, std('#3e2816')); strap.position.set(0, -0.012, z); ankle.add(strap); });
        } else {
            const shoe = capsule(0.045 * B, 0.17, shoeM); shoe.rotation.x = Math.PI / 2; shoe.scale.set(1, 1, 0.65); shoe.position.set(0, -0.028, 0.055); ankle.add(shoe);
            const heel = box(0.08 * B, 0.03, 0.08, shoeM); heel.position.set(0, -0.04, -0.03); ankle.add(heel);
            const soleEdge = box(0.082 * B, 0.012, 0.25, std('#3a2a22')); soleEdge.position.set(0, -0.05, 0.045); ankle.add(soleEdge);
        }
    });
    // ── Things carried ─────────────────────────────────────────────────
    const parts = {};
    if (spec.folder) {
        const folder = new THREE.Group();
        const cover = box(0.2, 0.27, 0.014, std(spec.folder, { roughness: 0.6 })); folder.add(cover);
        const paper = box(0.17, 0.24, 0.016, std('#f6f2e8')); paper.position.z = 0.002; folder.add(paper);
        const band = box(0.2, 0.02, 0.016, std('#1d4f8a')); band.position.y = 0.1; folder.add(band);
        folder.position.set(0.02, -0.08, 0.05); folder.rotation.set(0.1, -0.2, 0.15); folder.visible = false;
        J.wristR.add(folder); parts.folder = folder;
    }
    const phone = box(0.07, 0.14, 0.012, std('#1b1d22', { roughness: 0.4 })); const screen = box(0.06, 0.12, 0.002, new THREE.MeshStandardMaterial({ color: '#4fc3f7', emissive: '#2a8fc0', emissiveIntensity: 0.6 })); screen.position.z = 0.007; phone.add(screen);
    phone.position.set(0, -0.07, 0.03); phone.rotation.x = -0.3; phone.visible = false; J.wristR.add(phone); parts.phone = phone;
    if (spec.bag) {
        const bag = box(0.18, 0.22, 0.07, std(spec.bag, { roughness: 0.95 })); bag.position.set(-0.19 * B, -0.06, 0.02); hips.add(bag);
        const flap = box(0.18, 0.08, 0.072, std('#705429', { roughness: 0.95 })); flap.position.set(-0.19 * B, 0.03, 0.02); hips.add(flap);
        const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 10), std('#705429')); strap.position.set(-0.07 * B, 0.2, 0.1 * B); strap.rotation.z = 0.5; chest.add(strap);
    }

    root.scale.setScalar(H);
    root.traverse((o) => { if (o.isMesh) { o.userData.who = key; } });
    return { root, joints: J, face: F, parts, spec, height: spec.height, hipY: 0.93 * H };
}

/** Useful heights, in world metres, scaled to the person. */
export const measure = (c) => ({ head: (0.93 + 0.08 + 0.16 + 0.3 + 0.09 + 0.1) * (c.height / 1.76), chest: (0.93 + 0.08 + 0.16 + 0.12) * (c.height / 1.76) });
