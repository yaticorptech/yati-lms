/**
 * The story film's places, built in 3D (2026-11-07): Arjun's room in the morning, the bus stop in the rain, the
 * office, the street at evening — floors that take shadows, walls and windows, the furniture the people use (a bench,
 * a desk and chair), lamps that light the scene, distant buildings, trees, a sky; rain where it rains; the
 * auto-rickshaw. buildSet(place, light, seats) → { group, update(dt, t), dispose, fog, exposure, lights }.
 *
 * The stage is 9 m wide (x −4.5 … 4.5); the people stand on y = 0 along z ≈ 0; the camera looks from +z.
 */
import * as THREE from 'three';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
const mesh = (geo, mat, cast = true, receive = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = receive; return m; };
const box = (w, h, d, mat, cast = true) => mesh(new THREE.BoxGeometry(w, h, d), mat, cast);

/** A sky: a wide gradient backdrop far behind the stage, from a tiny canvas. */
function sky(stops) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 128;
    const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128);
    stops.forEach(([at, col]) => gr.addColorStop(at, col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
    m.position.set(0, 12, -26); return m;
}
/** A building's face: lit windows painted on a canvas. */
function facade(w, h, tone, lit, seed) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = tone; g.fillRect(0, 0, 64, 128);
    const cols = 4, rows = Math.round(h * 1.6);
    for (let r = 0; r < rows; r += 1) for (let k = 0; k < cols; k += 1) {
        const on = Math.sin(seed * 13.7 + r * 3.1 + k * 7.3) > 1 - lit * 2;
        g.fillStyle = on ? '#ffe7a3' : 'rgba(255,255,255,.08)'; g.fillRect(8 + k * 14, 8 + r * (112 / rows), 8, Math.max(4, 60 / rows));
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color(lit > 0.3 ? '#8a7040' : '#2a2a2a'), emissiveIntensity: lit > 0.3 ? 0.9 : 0.25, roughness: 0.9 });
}
function skyline(group, { z = -12, lit = 0.3, tone = '#3b4a5e', seed = 1, span = 30 }) {
    for (let i = 0; i < 14; i += 1) {
        const w = 1.6 + ((i * 37 * seed) % 20) / 10, h = 4 + ((i * 53 * seed) % 90) / 10;
        const b = mesh(new THREE.BoxGeometry(w, h, 2), facade(w, h, tone, lit, i + seed), false, false);
        b.position.set(-span / 2 + i * (span / 13) + ((i * 7) % 3) * 0.3, h / 2 - 0.2, z - ((i * 5) % 4) * 1.5);
        group.add(b);
    }
}
function tree(group, x, z, s = 1, dark = false) {
    const trunk = mesh(new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 1.2 * s, 10), std(dark ? '#3e2f28' : '#6d4c41')); trunk.position.set(x, 0.6 * s, z); group.add(trunk);
    [[0, 1.75, 0.7], [-0.45, 1.4, 0.5], [0.45, 1.45, 0.52], [0, 2.2, 0.42]].forEach(([dx, dy, r]) => { const c = mesh(new THREE.SphereGeometry(r * s, 14, 10), std(dark ? '#2e5a3a' : '#43a047')); c.position.set(x + dx * s, dy * s, z); group.add(c); });
}
function plant(group, x, z, s = 1) {
    const pot = mesh(new THREE.CylinderGeometry(0.18 * s, 0.14 * s, 0.3 * s, 14), std('#c0603a')); pot.position.set(x, 0.15 * s, z); group.add(pot);
    for (let i = 0; i < 7; i += 1) { const leaf = mesh(new THREE.SphereGeometry(0.1 * s, 8, 6), std('#2e7d32')); leaf.scale.set(1, 3.2, 0.5); const a = (i / 7) * Math.PI * 2; leaf.position.set(x + Math.cos(a) * 0.14 * s, 0.6 * s, z + Math.sin(a) * 0.14 * s); leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5); group.add(leaf); }
}
function lamp(group, x, z, color = '#ffd27a', intensity = 2.2) {
    const pole = mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 10), std('#22232d')); pole.position.set(x, 1.6, z); group.add(pole);
    const arm = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), std('#22232d')); arm.rotation.z = Math.PI / 2; arm.position.set(x + 0.25, 3.15, z); group.add(arm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color })); bulb.position.set(x + 0.5, 3.1, z); group.add(bulb);
    const light = new THREE.PointLight(color, intensity, 9, 1.6); light.position.set(x + 0.5, 3.0, z); group.add(light);
}
function bench(group, x, z) {
    const seat = box(1.7, 0.06, 0.45, std('#8d6e63', { roughness: 0.7 })); seat.position.set(x, 0.44, z); group.add(seat);
    const back = box(1.7, 0.4, 0.05, std('#8d6e63', { roughness: 0.7 })); back.position.set(x, 0.72, z - 0.22); back.rotation.x = -0.12; group.add(back);
    [-0.7, 0.7].forEach((dx) => { const leg = box(0.08, 0.42, 0.4, std('#4e342e')); leg.position.set(x + dx, 0.21, z); group.add(leg); });
}
function officeChair(group, x, z) {
    const seat = box(0.55, 0.08, 0.55, std('#37474f', { roughness: 0.6 })); seat.position.set(x, 0.46, z); group.add(seat);
    const back = box(0.55, 0.6, 0.08, std('#37474f', { roughness: 0.6 })); back.position.set(x, 0.8, z - 0.26); group.add(back);
    const post = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 10), std('#90a4ae', { metalness: 0.6, roughness: 0.3 })); post.position.set(x, 0.22, z); group.add(post);
    const base = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), std('#546e7a', { metalness: 0.5, roughness: 0.4 })); base.position.set(x, 0.02, z); group.add(base);
}
function desk(group, x, z) {
    const top = box(1.7, 0.06, 0.8, std('#6d4c41', { roughness: 0.5 })); top.position.set(x, 0.75, z); group.add(top);
    const front = box(1.7, 0.7, 0.05, std('#5d4037')); front.position.set(x, 0.37, z + 0.37); group.add(front);
    [-0.8, 0.8].forEach((dx) => { const side = box(0.05, 0.72, 0.8, std('#5d4037')); side.position.set(x + dx, 0.36, z); group.add(side); });
    const screen = box(0.5, 0.32, 0.03, std('#263238')); screen.position.set(x - 0.35, 1.0, z - 0.15); screen.rotation.y = 0.3; group.add(screen);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.26), new THREE.MeshBasicMaterial({ color: '#dfe9f5' })); glow.position.set(x - 0.35 + Math.sin(0.3) * 0.016, 1.0, z - 0.15 + Math.cos(0.3) * 0.016); glow.rotation.y = 0.3; group.add(glow);
    const stand = box(0.06, 0.12, 0.06, std('#263238')); stand.position.set(x - 0.35, 0.84, z - 0.15); group.add(stand);
    const papers = box(0.3, 0.02, 0.22, std('#f6f2e8')); papers.position.set(x + 0.3, 0.79, z + 0.05); papers.rotation.y = -0.2; group.add(papers);
}
export function buildAuto() {
    const g = new THREE.Group();
    const body = box(1.6, 0.9, 1.1, std('#2e7d32', { roughness: 0.5 })); body.position.y = 0.95; g.add(body);
    const nose = mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 16, 1, false, 0, Math.PI), std('#2e7d32', { roughness: 0.5 })); nose.rotation.z = Math.PI / 2; nose.rotation.y = Math.PI / 2; nose.position.set(0.8, 0.95, 0); g.add(nose);
    const roof = box(2.0, 0.08, 1.2, std('#1b5e20')); roof.position.y = 1.42; g.add(roof);
    const skirt = box(2.0, 0.3, 1.15, std('#fbc02d', { roughness: 0.5 })); skirt.position.y = 0.45; g.add(skirt);
    const glass = mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color: '#cfe8f5', transparent: true, opacity: 0.6, roughness: 0.1 }), false); glass.position.set(1.36, 1.05, 0); glass.rotation.y = Math.PI / 2; g.add(glass);
    [[0.75, 0], [-0.6, 0.5], [-0.6, -0.5]].forEach(([x, z]) => { const w = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 18), std('#212121', { roughness: 0.9 })); w.rotation.x = Math.PI / 2; w.position.set(x, 0.28, z); g.add(w); const hub = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12), std('#9e9e9e', { metalness: 0.6, roughness: 0.3 })); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.28, z); g.add(hub); });
    const lightM = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); lightM.position.set(1.38, 0.95, 0.35); g.add(lightM);
    return g;
}

/* ── The light of each time and weather ── */
export const LIGHTING = {
    morning: { sky: [[0, '#ffd59e'], [0.55, '#bfe3ff'], [1, '#eef7ff']], hemi: ['#dcecff', '#8a6a4a', 0.75], key: ['#ffd9a0', 2.6, [3.5, 4, 2.5]], fill: ['#fff1dc', 0.35], fog: ['#f3e6d0', 18, 40], exposure: 1.05 },
    rain: { sky: [[0, '#3c4656'], [1, '#8592a3']], hemi: ['#8ea0b8', '#3a3f4a', 0.7], key: ['#aebfd4', 1.1, [-2, 5, 3]], fill: ['#6f7f95', 0.4], fog: ['#6f7b8c', 10, 32], exposure: 0.95 },
    day: { sky: [[0, '#5fb0ea'], [1, '#d7eefc']], hemi: ['#e6f1fb', '#9aa5ad', 0.9], key: ['#ffffff', 2.2, [2.5, 4.5, 3]], fill: ['#dfe9f5', 0.45], fog: ['#e7ecef', 16, 40], exposure: 1.05 },
    evening: { sky: [[0, '#2a1f4f'], [0.55, '#8a4f7d'], [1, '#f2a65a']], hemi: ['#7a5a9a', '#2b2340', 0.5], key: ['#ffb070', 1.1, [-3, 3, 3]], fill: ['#9a6aa0', 0.25], fog: ['#4a3a66', 12, 34], exposure: 1.0 }
};

/** One place, lit for the time (`light`), with a seat where each seated person sits ({ x, kind: 'bench' | 'chair' }). */
export function buildSet(place, light, seats = []) {
    const group = new THREE.Group();
    const L = LIGHTING[light] || LIGHTING.day;
    group.add(sky(L.sky));
    let rain = null; let clockHand = null;
    const groundM = place === 'home' ? std('#9c6b47', { roughness: 0.7 }) : place === 'office' ? std('#c9d1d6', { roughness: 0.35, metalness: 0.05 }) : std(place === 'street' ? '#2e3040' : '#5a6270', { roughness: light === 'rain' || place === 'street' ? 0.25 : 0.8, metalness: 0.15 });
    const ground = mesh(new THREE.PlaneGeometry(60, 40), groundM, false, true); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -5); group.add(ground);

    if (place === 'home') {
        const wall = box(16, 3.2, 0.1, std('#f1dfbf', { roughness: 1 }), false); wall.position.set(0, 1.6, -2.6); group.add(wall);
        const skirting = box(16, 0.12, 0.12, std('#e8d2b0')); skirting.position.set(0, 0.06, -2.55); group.add(skirting);
        // The window, the morning outside it, curtains
        const frame = box(2.0, 1.6, 0.12, std('#fffaf0')); frame.position.set(1.7, 1.75, -2.56); group.add(frame);
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), new THREE.MeshBasicMaterial({ color: '#cfe8ff' })); pane.position.set(1.7, 1.75, -2.49); group.add(pane);
        const sun = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: '#fff4c2' })); sun.position.set(2.3, 2.2, -2.485); group.add(sun);
        [[1.2, 1.3], [1.75, 1.2], [2.3, 1.35]].forEach(([x, y]) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.55 + (x % 1) * 0.3), new THREE.MeshBasicMaterial({ color: '#9fb6d0' })); b.position.set(x, y, -2.48); group.add(b); });
        const bars = box(0.04, 1.4, 0.02, std('#fffaf0')); bars.position.set(1.7, 1.75, -2.47); group.add(bars); const bar2 = box(1.8, 0.04, 0.02, std('#fffaf0')); bar2.position.set(1.7, 1.75, -2.47); group.add(bar2);
        [0.55, 2.85].forEach((x, i) => { const cur = box(0.42, 1.9, 0.1, std('#c85a42', { roughness: 0.95 })); cur.position.set(x, 1.6, -2.42); cur.rotation.y = i ? -0.12 : 0.12; group.add(cur); });
        const rod = mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.9, 8), std('#8d6e63')); rod.rotation.z = Math.PI / 2; rod.position.set(1.7, 2.62, -2.4); group.add(rod);
        // Clock (its hand turns), mirror, shelf, bed, rug, plant, the door
        const clock = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 28), std('#fff')); clock.rotation.x = Math.PI / 2; clock.position.set(-1.2, 2.2, -2.52); group.add(clock);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 28), std('#6d4c41')); rim.position.set(-1.2, 2.2, -2.5); group.add(rim);
        clockHand = box(0.02, 0.2, 0.01, std('#333')); clockHand.position.set(-1.2, 2.2, -2.47); clockHand.geometry.translate(0, 0.09, 0); group.add(clockHand);
        const hour = box(0.025, 0.13, 0.01, std('#333')); hour.geometry.translate(0, 0.06, 0); hour.rotation.z = -2.1; hour.position.set(-1.2, 2.2, -2.48); group.add(hour);
        const mirror = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 28), new THREE.MeshStandardMaterial({ color: '#dfeef7', metalness: 0.9, roughness: 0.08 })); mirror.rotation.x = Math.PI / 2; mirror.position.set(-0.1, 1.75, -2.52); group.add(mirror);
        const mrim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 32), std('#a1887f')); mrim.position.set(-0.1, 1.75, -2.5); group.add(mrim);
        const shelf = box(1.6, 0.05, 0.25, std('#8d6e63')); shelf.position.set(-3.0, 1.9, -2.45); group.add(shelf);
        ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4db6ac'].forEach((c, i) => { const b = box(0.12, 0.32 + (i % 2) * 0.06, 0.2, std(c)); b.position.set(-3.6 + i * 0.16, 2.09 + (i % 2) * 0.03, -2.45); group.add(b); });
        const bed = box(2.0, 0.45, 1.3, std('#6d4c41')); bed.position.set(-3.2, 0.225, -1.7); group.add(bed);
        const mattress = box(1.95, 0.18, 1.25, std('#f5f5f5')); mattress.position.set(-3.2, 0.54, -1.7); group.add(mattress);
        const blanket = box(1.4, 0.1, 1.27, std('#64b5f6')); blanket.position.set(-2.9, 0.66, -1.7); group.add(blanket);
        const pillow = box(0.5, 0.14, 0.7, std('#fffde7')); pillow.position.set(-3.85, 0.7, -1.7); group.add(pillow);
        const headboard = box(0.12, 1.1, 1.3, std('#8d6e63')); headboard.position.set(-4.2, 0.55, -1.7); group.add(headboard);
        const rug = mesh(new THREE.CircleGeometry(1.6, 32), std('#c0563d', { roughness: 1 }), false); rug.rotation.x = -Math.PI / 2; rug.scale.set(1, 0.5, 1); rug.position.set(0.6, 0.005, 0.2); group.add(rug);
        plant(group, 3.9, -1.9, 1.1);
        const door = box(1.0, 2.3, 0.08, std('#8d5a3b')); door.position.set(4.9, 1.15, -2.5); group.add(door);
        const knob = mesh(new THREE.SphereGeometry(0.04, 10, 8), std('#d4af37', { metalness: 0.8, roughness: 0.3 })); knob.position.set(4.55, 1.1, -2.44); group.add(knob);
    } else if (place === 'office') {
        const wall = box(18, 3.4, 0.1, std('#eef2f4', { roughness: 1 }), false); wall.position.set(0, 1.7, -2.7); group.add(wall);
        const ceiling = box(18, 0.1, 12, std('#f7f9fa'), false); ceiling.position.set(0, 3.4, -1); group.add(ceiling);
        [-2.5, 0.5, 3.5].forEach((x) => { const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshBasicMaterial({ color: '#fffbe6' })); panel.rotation.x = Math.PI / 2; panel.position.set(x, 3.34, -0.5); group.add(panel); });
        const win = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.4), new THREE.MeshBasicMaterial({ color: '#9fd0f2' })); win.position.set(1.2, 1.9, -2.64); group.add(win);
        [[-0.3, 2.4, 0.5], [2.0, 2.5, 0.4], [3.2, 2.1, 0.35]].forEach(([x, y, r]) => { const c = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: '#fff' })); c.scale.y = 0.5; c.position.set(x, y, -2.63); group.add(c); });
        for (let i = 0; i < 8; i += 1) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.4 + (i % 3) * 0.15, 0.8 + (i % 4) * 0.25), new THREE.MeshBasicMaterial({ color: ['#7f9bb8', '#6f8aa6', '#8fa8c2'][i % 3] })); b.position.set(-1.1 + i * 0.6, 1.1 + (0.4 + (i % 4) * 0.125), -2.62); group.add(b); }
        [-1.4, 0.0, 1.4, 2.8].forEach((x) => { const m = box(0.08, 2.5, 0.06, std('#dde4e8')); m.position.set(1.2 + x * 0.93 - 1.3, 1.9, -2.6); group.add(m); });
        const wframe = box(5.4, 0.1, 0.1, std('#dde4e8')); wframe.position.set(1.2, 3.12, -2.6); group.add(wframe); const wframe2 = wframe.clone(); wframe2.position.y = 0.68; group.add(wframe2);
        const sign = box(2.2, 0.5, 0.06, std('#22356b', { roughness: 0.6 })); sign.position.set(-3.2, 2.5, -2.62); group.add(sign);
        const logo = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 20), std('#ffca28')); logo.rotation.x = Math.PI / 2; logo.position.set(-4.0, 2.5, -2.58); group.add(logo);
        for (let i = 0; i < 3; i += 1) { const t = box(0.9 - i * 0.2, 0.05, 0.02, std('#fff')); t.position.set(-3.0, 2.6 - i * 0.1, -2.58); group.add(t); }
        const chart = box(1.0, 0.7, 0.04, std('#fff')); chart.position.set(-3.6, 1.5, -2.63); group.add(chart);
        const line = box(0.7, 0.05, 0.02, std('#26a69a')); line.rotation.z = 0.4; line.position.set(-3.6, 1.5, -2.6); group.add(line);
        plant(group, -4.1, -1.8, 1.3);
    } else {
        // Outdoors: a pavement to stand on, the road beyond, buildings and trees in the distance
        const kerb = box(40, 0.12, 2.8, std(place === 'street' ? '#4a4566' : '#8a909b', { roughness: 0.9 })); kerb.position.set(0, -0.06, -1.3); kerb.receiveShadow = true; group.add(kerb);
        const road = box(40, 0.02, 10, std(place === 'street' ? '#2b2d3a' : '#454c59', { roughness: light === 'rain' ? 0.2 : 0.7, metalness: 0.2 })); road.position.set(0, -0.12, -8); group.add(road);
        for (let i = -8; i < 8; i += 1) { const dash = box(1.0, 0.01, 0.12, std('#eee')); dash.position.set(i * 2.5, -0.105, -6.5); group.add(dash); }
        skyline(group, { z: -16, lit: place === 'street' ? 0.6 : 0.15, tone: place === 'street' ? '#3d3866' : '#5d6878', seed: place === 'street' ? 3 : 4 });
        if (place === 'street') {
            [[-4.2, '#e57373'], [-1.2, '#4db6ac'], [1.8, '#ffb74d'], [4.8, '#9575cd']].forEach(([x, c]) => {
                const shop = box(2.6, 3.0, 2.2, std('#4a4266')); shop.position.set(x, 1.5, -4.2); group.add(shop);
                const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), new THREE.MeshBasicMaterial({ color: '#ffe39a' })); glow.position.set(x, 1.3, -3.08); group.add(glow);
                const awn = box(2.8, 0.08, 1.0, std(c)); awn.position.set(x, 2.3, -2.6); awn.rotation.x = 0.25; group.add(awn);
                const pl = new THREE.PointLight('#ffd58a', 1.0, 6, 1.8); pl.position.set(x, 1.4, -2.6); group.add(pl);
            });
            tree(group, -2.8, -2.6, 1.1, true); tree(group, 3.4, -2.6, 1.0, true);
            lamp(group, -3.6, -1.9); lamp(group, 0.2, -1.9); lamp(group, 4.0, -1.9);
            [[-2.2, 0.9], [0.9, 1.2], [3.6, 0.7]].forEach(([x, s]) => { const p = mesh(new THREE.CircleGeometry(0.6 * s, 20), new THREE.MeshStandardMaterial({ color: '#8a84c8', metalness: 0.95, roughness: 0.08, transparent: true, opacity: 0.6 }), false); p.rotation.x = -Math.PI / 2; p.scale.set(1.6, 1, 1); p.position.set(x, 0.004, 0.6); group.add(p); });
            const moon = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: '#ffd8a0', fog: false })); moon.position.set(5, 9, -25); group.add(moon);
        } else {
            // The bus shelter, its bench, the sign, a lamp; rain
            const sx = seats.find((s) => s.kind === 'bench')?.x ?? -1.2;
            const roof = box(3.6, 0.1, 1.8, std('#2f6f8f', { roughness: 0.5 })); roof.position.set(sx + 0.4, 2.45, -0.3); roof.rotation.x = 0.04; group.add(roof);
            const trim = box(3.7, 0.08, 0.1, std('#1f4f66')); trim.position.set(sx + 0.4, 2.42, 0.6); group.add(trim);
            [-1.6, 1.6].forEach((dx) => { const post = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.45, 10), std('#546e7a', { metalness: 0.4, roughness: 0.5 })); post.position.set(sx + 0.4 + dx, 1.22, -1.0); group.add(post); });
            const glass = mesh(new THREE.PlaneGeometry(3.3, 1.9), new THREE.MeshStandardMaterial({ color: '#cfe8f5', transparent: true, opacity: 0.18, roughness: 0.1 }), false); glass.position.set(sx + 0.4, 1.4, -1.05); group.add(glass);
            const ad = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); ad.position.set(sx - 0.8, 1.6, -1.0); group.add(ad);
            const adText = box(0.6, 0.08, 0.01, std('#c0563d')); adText.position.set(sx - 0.8, 1.6, -0.99); group.add(adText);
            const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), std('#546e7a')); pole.position.set(sx + 2.6, 1.3, -0.6); group.add(pole);
            const disc = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 20), std('#1e88e5')); disc.rotation.x = Math.PI / 2; disc.position.set(sx + 2.6, 2.7, -0.6); group.add(disc);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 24), std('#fff')); ring.position.set(sx + 2.6, 2.7, -0.58); group.add(ring);
            lamp(group, 3.8, -1.6, '#ffe082', 1.4);
            tree(group, -4.3, -2.4, 1.0, true); tree(group, 4.6, -2.6, 0.9, true);
            if (light === 'rain') {
                // Streaks of rain (a short line each), every drop at its own height and speed, wrapping as it lands.
                const n = 1100; const pos = new Float32Array(n * 6); const vel = new Float32Array(n);
                for (let i = 0; i < n; i += 1) { const x = (Math.random() - 0.5) * 18, y = Math.random() * 7, z = (Math.random() - 0.5) * 12 - 1.5; pos.set([x, y, z, x - 0.04, y + 0.22 + Math.random() * 0.12, z], i * 6); vel[i] = 6 + Math.random() * 4; }
                const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
                rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#dfeaf5', transparent: true, opacity: 0.42, depthWrite: false }));
                rain.userData.vel = vel; group.add(rain);
            }
        }
    }
    for (const s of seats) { if (s.kind === 'bench') bench(group, s.x, -0.1); else { officeChair(group, s.x, -0.35); desk(group, s.x, 0.55); } }

    // The lights of the hour
    const hemi = new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]); group.add(hemi);
    const key = new THREE.DirectionalLight(L.key[0], L.key[1]); key.position.set(...L.key[2]); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 6; key.shadow.camera.bottom = -3; key.shadow.camera.near = 0.5; key.shadow.camera.far = 20; key.shadow.bias = -0.0008; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    group.add(key); group.add(key.target);
    const fill = new THREE.DirectionalLight(L.fill[0], L.fill[1]); fill.position.set(-4, 3, 5); group.add(fill);
    const fog = new THREE.Fog(L.fog[0], L.fog[1], L.fog[2]);

    const update = (dt, t) => {
        if (rain) {
            const a = rain.geometry.attributes.position; const vel = rain.userData.vel;
            for (let i = 0; i < vel.length; i += 1) {
                const d = vel[i] * dt; let y = a.getY(i * 2) - d; let x = a.getX(i * 2) - d * 0.12;
                if (y < 0) { y += 7; x = (Math.random() - 0.5) * 18; }
                a.setY(i * 2, y); a.setX(i * 2, x); a.setY(i * 2 + 1, y + 0.22 + (i % 7) * 0.02); a.setX(i * 2 + 1, x - 0.04);
            }
            a.needsUpdate = true;
        }
        if (clockHand) clockHand.rotation.z = -t * 0.35;
    };
    const dispose = () => group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    return { group, rain, update, dispose, fog, exposure: L.exposure, lights: { key, hemi, fill } };
}
