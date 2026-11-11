"""Builds the whole film into one .blend: characters, sets, acting, 31 camera shots, fades, lighting per scene.

    Blender -b --factory-startup --python scripts/build_film.py

Writes film-blender/stranger_film.blend. Render it with scripts/render_film.py.
"""
import math
import os
import sys

import bpy
from mathutils import Vector, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(HERE)

bpy.ops.wm.read_factory_settings(use_empty=True)
import kit  # noqa: E402
from kit import S, bake, smooth, lerp, coll, mat, lin, FPS  # noqa: E402
import chars  # noqa: E402
import sets  # noqa: E402
from anim import Script, evaluate  # noqa: E402
from sets import HOME, BUS, OFFICE, STREET, INSERT, STUDIO  # noqa: E402

R = math.radians
END_SEC = 153.0
END = S(END_SEC)
FRAMES = list(range(0, END + 1))
sc = bpy.context.scene
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, END

# ---------------- cast & places ----------------
A = chars.build('Arjun', chars.ARJUN)
RV = chars.build('Ravi', chars.RAVI)
IV = chars.build('Int', chars.INTERVIEWER)
H = sets.home()
B = sets.busstop()
OF = sets.office()
sets.street()
INS = sets.insert_table()
sets.studio()

# metaballs (hair, moustaches, foliage) -> real meshes, so they render cleanly
dg = bpy.context.evaluated_depsgraph_get()
for o in [o for o in bpy.data.objects if o.type == 'META']:
    ev = o.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    if not len(me.vertices):
        continue
    n = bpy.data.objects.new(o.name + 'Mesh', me)
    for c_ in o.users_collection:
        c_.objects.link(n)
    n.parent, n.parent_type, n.parent_bone = o.parent, o.parent_type, o.parent_bone
    n.matrix_parent_inverse = o.matrix_parent_inverse.copy()
    n.matrix_basis = o.matrix_basis.copy()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    for act in (A, RV, IV):
        if o.name in act.parts:
            act.parts[n.name] = n
    bpy.data.objects.remove(o)

# ---------------- the acting (seconds) ----------------
a = Script(A, start=(STUDIO + 3, 4, 0))
(a.at(0, -0.2, 0.4, 0).face(0, 0).pose(0, 'button').expr(0, 'smile')
 .pose(4, 'stand').pose(7.4, 'watch').expr(7.4, 'worry').pose(9.6, 'stand').expr(9.8, 'determined')
 .at(11, -0.2, 0.4).go(12.6, 1.45, 1.65).face(12.6, 180).pose(12.7, 'pack').pose(14.4, 'stand')
 .face(14.6, -20).expr(14.6, 'smile').pose(15.0, 'nod').pose(16.0, 'stand')
 .at(16, 1.45, 1.65).go(18.4, 3.3, -1.35).go(19.8, 4.8, -1.35)
 # the bus stop, in the rain
 .at(20, 88.0, 3.5, 0.15).pose(20, 'stand').expr(20, 'worry').go(30.5, 101.8, 4.15).go(31.3, 102.5, 4.3)
 .face(31.4, 0).pose(31.6, 'watch').pose(33.4, 'stand').look(33.5, -55)
 .look(36.3, -70).face(37.2, -108).look(37.2, 0).expr(37, 'neutral')
 .at(38.6, 102.5, 4.3).go(40.2, 100.5, 4.35).face(40.3, -135).expr(40.5, 'worry')
 .pose(53.4, 'watch').pose(56.2, 'stand').face(57.3, -36)
 .at(58.5, 100.5, 4.35).go(59.8, 100.2, 3.6).face(60.0, -36).face(60.8, -150).expr(61, 'worry')
 .face(64.3, -25).expr(64.3, 'sad').face(66.8, -160).expr(67.0, 'determined')
 .at(68.2, 100.2, 3.6).go(70.0, 100.45, 5.2).face(70.1, 0).pose(70.3, 'sit').expr(70.6, 'smile')
 .pose(71.8, 'sit+give').pose(74.0, 'sit').look(74.3, -30)
 .pose(79.0, 'stand').at(79.0, 100.45, 5.25).go(80.6, 100.2, 2.55).face(80.8, -80).look(80.8, 0).pose(80.8, 'wave').expr(80.8, 'neutral').pose(83.4, 'stand')
 .at(85.6, 100.2, 2.55).go(87.4, 99.95, 4.65).face(87.6, -150).expr(87.6, 'smile')
 .pose(88.6, 'support').at(88.6, 99.95, 4.65).go(92.0, 100.35, 2.55, None, 'slow').pose(92.2, 'stand').face(92.4, -22)
 .pose(94.8, 'wave').expr(94.8, 'grin').look(97.5, 45).pose(98.6, 'stand')
 .look(99.0, 0).face(99.0, 0).pose(99.2, 'watch').expr(99.6, 'surprise').pose(100.6, 'stand').expr(101.2, 'worry')
 .at(101.2, 100.35, 2.55).go(104.0, 106.5, 3.3, None, 'run')
 # the office
 .at(104.0, 195.6, -1.35, 0).pose(104, 'pant').go(106.0, 197.0, -1.35).go(108.0, 200.0, -0.15).face(108.1, 180)
 .pose(109.3, 'apology').pose(113.0, 'gesture').pose(116.5, 'stand').expr(118.5, 'curious')
 .expr(121.2, 'surprise').expr(127.6, 'smile')
 .at(133.0, 200.0, -0.15).go(133.8, 200.0, 0.55).face(133.9, 180).pose(134.1, 'handshake').expr(134, 'grin').pose(137.6, 'stand')
 # the evening walk home
 .at(138.5, 290.5, 3.6, 0.15).pose(138.5, 'stand').expr(138.5, 'smile').go(152.8, 303.5, 3.6, None, 'stroll')
 .look(144, 25, -8).look(146.5, 0, 0))
for p, ks in {'ArjunFolder': [(0, False), (12.8, True), (14.3, False)], 'ArjunPhone': [(0, False), (71.6, True), (73.9, False)]}.items():
    for t, v in ks:
        a.show(p, t, v)

r = Script(RV, start=(STUDIO - 0.28, 0.15, 0), pose='stand', expr='smile')
(r.at(0, 99.6, 5.25, 0.15).face(0, 0).pose(0, 'sit+shiver').expr(0, 'sad')
 .look(28.6, 40, -5).look(31, 45).pose(35, 'sit+reach').expr(35, 'worry').pose(38, 'sit').look(38.5, 35)
 .look(40.2, 40, -12).pose(40.5, 'sit+gesture').pose(44, 'sit+shrug').expr(44, 'sad').pose(47.5, 'sit+gesture').pose(52.5, 'sit')
 .look(58, 25, -5).pose(61.8, 'sit+shoo').expr(61.8, 'sadsmile').pose(65.2, 'sit').expr(65.2, 'sad').look(66, 20)
 .look(70.5, 70, 0).expr(70.8, 'smile').pose(74.0, 'sit+phone').expr(74.2, 'grin').pose(79.0, 'sit').expr(79.2, 'smile').look(79.5, 30, -10)
 .pose(88.0, 'stick').look(88, 0).at(88.6, 99.6, 5.25).go(92.0, 99.9, 2.55, None, 'slow')
 .at(92.2, 99.9, 2.55).pose(92.9, 'sit').go(93.2, 99.65, 0.85, 0.6, 'glide').face(93.2, 90)
 .pose(94.6, 'sit+waveL').look(94.6, 60).expr(94.6, 'grin')
 .at(95.5, 99.65, 0.85, 0.6).go(101.0, 129.45, 0.85, 0.6, 'glide').pose(99, 'sit')
 .at(103, 520, 5, 0))
for t, v in [(0, False), (73.9, True), (79.0, False)]:
    r.show('RaviPhone', t, v)
for t, v in [(0, True), (0.01, False), (88.0, True), (92.9, False)]:
    r.show('RaviStick', t, v)
    r.show('RaviStickTop', t, v)

iv = Script(IV, start=(STUDIO + 0.3, 0.3, 0), yaw=-8, pose='stand', expr='smile')
(iv.at(0, 520, 8, 0).at(103.9, 520, 8, 0).at(104, 200, 1.95, 0.06).face(104, 0).pose(104, 'sit+desk').expr(104, 'neutral')
 .look(105.6, -45).look(108, 0).pose(114.2, 'sit+desk+lean').expr(114.5, 'curious')
 .pose(118.9, 'sit+showframe').expr(119.5, 'smile').pose(123.5, 'sit+desk').expr(126, 'smile')
 .pose(129.2, 'stand').at(129.2, 200, 1.95, 0.06).go(129.9, 200, 1.95, 0, 'glide').expr(129.5, 'grin')
 .at(133, 200, 1.95, 0).go(133.8, 200, 1.5, 0).face(133.9, 0).pose(134.1, 'handshake').pose(137.6, 'stand')
 .at(138.4, 520, 8, 0))
for t, v in [(0, False), (118.9, True), (123.5, False)]:
    iv.show('IntFrameHand', t, v)
    iv.show('IntPhoto', t, v)

POS = {}
for s_ in (a, r, iv):
    ch = evaluate(s_, FRAMES)
    for (db, path, idx), vals in ch.items():
        bake(db, path, idx, FRAMES, vals)
    arm = s_.a.arm
    POS[s_.a.name] = [Vector((x, y, z)) for x, y, z in zip(ch[(arm, 'location', 0)], ch[(arm, 'location', 1)], ch[(arm, 'location', 2)])]


def head(name, f, dz=0.0):
    return POS[name][f] + Vector((0, 0, 1.645 + dz))


# ---------------- vehicles, doors, clock, the desk photo ----------------
def path_track(obj, keys, frames=FRAMES):
    """keys: [(t, x, y, z)], eased between keys (vehicles pull away and brake)."""
    vals = [[], [], []]
    for f in frames:
        t = (f - 1) / FPS
        i = 0
        while i + 1 < len(keys) and keys[i + 1][0] <= t:
            i += 1
        if i + 1 < len(keys):
            u = smooth((t - keys[i][0]) / max(1e-6, keys[i + 1][0] - keys[i][0]))
        else:
            u = 0
        k0, k1 = keys[i], keys[min(i + 1, len(keys) - 1)]
        for ax in range(3):
            vals[ax].append(lerp(k0[ax + 1], k1[ax + 1], u))
    for ax in range(3):
        bake(obj, 'location', ax, frames, vals[ax])


path_track(B['auto'], [(0, 60, 0.8, 0), (81.0, 60, 0.8, 0), (86.0, 100.2, 0.8, 0), (95.5, 100.2, 0.8, 0), (101.0, 130.0, 0.8, 0)])
path_track(B['bus'], [(0, 40, -0.6, 0), (54.0, 40, -0.6, 0), (58.5, 97, -0.6, 0), (63.5, 97, -0.6, 0), (68.5, 140, -0.6, 0)])


def hinge(door, axis_y, swing, t0, t1, back=None):
    piv = bpy.data.objects.new(door.name + 'Hinge', None)
    door.users_collection[0].objects.link(piv)
    piv.location = (door.location.x, axis_y, 0)
    door.location = (0, door.location.y - axis_y, door.location.z)
    door.parent = piv
    keys = [(0, 0), (t0, 0), (t1, swing)] + ([(back[0], swing), (back[1], 0)] if back else [])
    vals = []
    for f in FRAMES:
        t = (f - 1) / FPS
        i = 0
        while i + 1 < len(keys) and keys[i + 1][0] <= t:
            i += 1
        k0, k1 = keys[i], keys[min(i + 1, len(keys) - 1)]
        u = smooth((t - k0[0]) / max(1e-6, k1[0] - k0[0])) if k1 is not k0 else 0
        vals.append(R(lerp(k0[1], k1[1], u)))
    bake(piv, 'rotation_euler', 2, FRAMES, vals)


hinge(H['door'], -0.275, -85, 17.6, 18.4)
hinge(OF['door'], -0.15, 85, 104.6, 105.6, back=(108.0, 109.5))
hour, minute = H['hands']
bake(minute, 'rotation_euler', 1, FRAMES, [R(-12 + 12 * smooth(((f - 1) / FPS - 4.4) / 2.0)) for f in FRAMES])
bake(hour, 'rotation_euler', 1, FRAMES, [R(210 - 0.6 + 0.6 * smooth(((f - 1) / FPS - 4.4) / 2.0)) for f in FRAMES])
desk_vis = [0.0 if 118.9 <= (f - 1) / FPS < 123.5 else 1.0 for f in FRAMES]
for ax in range(3):
    bake(OF['frame'], 'scale', ax, FRAMES, desk_vis)

# the photo in the frame: a portrait of Ravi with his son, rendered at frame 0 (see render_film.py)
photo_mat = bpy.data.materials['PhotoPrint']
nt = photo_mat.node_tree
img = bpy.data.images.new('Portrait', 8, 10)
img.source = 'FILE'
img.filepath = '//renders/portrait.png'
tex = nt.nodes.new('ShaderNodeTexImage')
tex.image = img
uv = nt.nodes.new('ShaderNodeTexCoord')
mp = nt.nodes.new('ShaderNodeMapping')
mp.inputs['Rotation'].default_value = (R(90), 0, 0)    # the print stands upright (x, z)
mp.inputs['Scale'].default_value = (1 / 0.165, 1, -1 / 0.205)
mp.inputs['Location'].default_value = (0.5, 0.5, 0)
nt.links.new(uv.outputs['Object'], mp.inputs['Vector'])
nt.links.new(mp.outputs['Vector'], tex.inputs['Vector'])
p = nt.nodes['Principled BSDF']
nt.links.new(tex.outputs['Color'], p.inputs['Base Color'])
nt.links.new(tex.outputs['Color'], p.inputs['Emission Color'])
p.inputs['Emission Strength'].default_value = 0.35
p.inputs['Roughness'].default_value = 0.25

# ---------------- cameras ----------------
cams = coll('Cameras')


def lerpv(p, q, u):
    return Vector(p).lerp(Vector(q), u)


def shot(name, t0, t1, pos, aim, lens=35, fstop=2.8, ease=True):
    """pos/aim: a point, a (start, end) pair, or a function of the frame."""
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = 36
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = fstop
    cd.clip_start = 0.05
    cd.clip_end = 400
    cam = bpy.data.objects.new(name, cd)
    cams.objects.link(cam)
    f0, f1 = S(t0), S(t1) - 1
    fr = list(range(f0, f1 + 1))

    def at(spec, f):
        if callable(spec):
            return Vector(spec(f))
        if isinstance(spec[0], (tuple, list, Vector)):
            u = (f - f0) / max(1, f1 - f0)
            return lerpv(spec[0], spec[1], smooth(u) if ease else u)
        return Vector(spec)
    locs, rots, dist = [[], [], []], [[], [], []], []
    prev = None
    sm = None
    for f in fr:
        p_ = at(pos, f)
        q_ = at(aim, f)
        sm = q_ if sm is None else sm.lerp(q_, 0.18)        # a camera operator's lag, no jitter
        d = sm - p_
        e = d.to_track_quat('-Z', 'Y').to_euler('XYZ', prev) if prev else d.to_track_quat('-Z', 'Y').to_euler('XYZ')
        prev = e
        for ax in range(3):
            locs[ax].append(p_[ax])
            rots[ax].append(e[ax])
        dist.append(max(0.1, (q_ - p_).length))
    for ax in range(3):
        bake(cam, 'location', ax, fr, locs[ax])
        bake(cam, 'rotation_euler', ax, fr, rots[ax])
    bake(cd, 'dof.focus_distance', 0, fr, dist)
    m = sc.timeline_markers.new(name, frame=f0)
    m.camera = cam
    return cam


def mid(n1, n2, dz=0):
    return lambda f: (head(n1, f, dz) + head(n2, f, dz)) / 2


hA = lambda dz=0: (lambda f: head('Arjun', f, dz))  # noqa: E731
hR = lambda dz=0: (lambda f: head('Ravi', f, dz))  # noqa: E731
hI = lambda dz=0: (lambda f: head('Int', f, dz))  # noqa: E731

# 1 — home
shot('S01_RoomWide', 0, 4, ((-0.5, -5.2, 1.7), (-0.35, -4.1, 1.62)), hA(-0.25), 28, 4)
shot('S02_Clock', 4, 7, ((1.5, 1.6, 2.3), (1.5, 1.85, 2.33)), (1.5, 2.9, 2.35), 50, 2.8)
shot('S03_Watch', 7, 11, ((-0.05, -1.25, 1.6), (-0.1, -1.0, 1.58)), hA(-0.05), 50, 2)
shot('S04_Pack', 11, 16, ((-0.6, -1.4, 1.5), (0.2, -1.1, 1.45)), hA(-0.3), 32, 2.8)
shot('S05_Leaves', 16, 20, (-1.6, -3.6, 1.6), hA(-0.4), 28, 5.6)
# 2..4 — the bus stop in the rain
shot('S06_RainWide', 20, 25, ((104.5, -2.6, 1.6), (104.0, -2.3, 1.5)), lambda f: head('Arjun', f, -0.4).lerp(Vector((99.6, 5.2, 1.0)), 0.35), 24, 5.6)
shot('S07_Ravi', 25, 30, ((99.0, 2.7, 1.15), (99.25, 3.25, 1.1)), hR(-0.05), 45, 2)
shot('S08_PassesBy', 30, 35, (101.2, 0.7, 1.55), (101.1, 4.8, 1.15), 30, 4)
shot('S09_Calls', 35, 38, ((100.7, 3.4, 1.2), (100.55, 3.65, 1.22)), hR(-0.05), 55, 2)
shot('S10_Turns', 38, 40, (99.25, 5.9, 1.3), hA(-0.05), 45, 2.8)
shot('S11_TwoShot', 40, 48, ((98.9, 2.5, 1.35), (99.3, 2.8, 1.3)), mid('Arjun', 'Ravi', -0.2), 35, 3.5)
shot('S12_RaviPleads', 48, 53, ((99.3, 3.75, 1.4), (99.35, 3.95, 1.4)), hR(-0.05), 55, 2)
shot('S13_ArjunTorn', 53, 58, (99.75, 5.15, 1.6), hA(-0.1), 40, 2)
shot('S14_BusComes', 58, 62, (101.7, 5.6, 1.75), (98.0, -0.5, 1.5), 28, 4)
shot('S15_Go', 62, 66, ((99.3, 3.75, 1.4), (99.35, 3.9, 1.4)), hR(-0.05), 50, 2)
shot('S16_Stays', 66, 70.5, (99.2, 3.1, 1.5), hA(-0.1), 35, 2.8)
shot('S17_Bench', 70.5, 79, ((100.0, 2.4, 1.05), (100.0, 2.8, 1.05)), (100.05, 5.25, 1.05), 35, 2.8)
shot('S18_WavesAuto', 79, 83.5, (104.5, 1.7, 1.3), lambda f: head('Arjun', f, -0.3), 30, 4)
shot('S19_AutoArrives', 83.5, 88, (95.6, 2.7, 1.6), (100.0, 3.2, 1.1), 30, 5.6)
shot('S20_Helps', 88, 93, ((102.8, 3.0, 1.5), (102.3, 2.4, 1.45)), mid('Arjun', 'Ravi', -0.3), 32, 3.5)
shot('S21_Goodbye', 93, 99, (101.7, 3.1, 1.6), lambda f: head('Ravi', f, -0.2), 32, 4)
shot('S22_Late', 99, 104, ((100.6, 0.5, 1.5), (102.6, 0.7, 1.45)), hA(-0.15), 35, 2.8)
# 5..6 — the office
shot('S23_OfficeWide', 104, 109, (201.6, 3.0, 1.9), lambda f: head('Arjun', f, -0.4), 28, 4)
shot('S24_Apology', 109, 114, ((200.4, 2.35, 1.45), (200.35, 2.2, 1.45)), hA(-0.05), 50, 2)
shot('S25_Listens', 114, 118, ((199.65, -0.75, 1.55), (199.7, -0.6, 1.52)), hI(-0.1), 50, 2)
shot('S26_TheFrame', 118, 123, (202.5, 0.6, 1.35), (200.0, 0.95, 1.15), 32, 4)
shot('S27_Photo', 123, 126, ((400.0, -0.55, 0.95), (400.0, -0.42, 0.94)), (400.0, 0.09, 0.92), 50, 2.8)
shot('S28_Realises', 126, 128.5, (200.15, 1.05, 1.58), hA(-0.03), 60, 2)
shot('S29_Smiles', 128.5, 133.5, ((199.75, -0.65, 1.45), (199.8, -0.5, 1.5)), hI(-0.1), 40, 2.8)
shot('S30_Handshake', 133.5, 138.5, ((202.4, 1.0, 1.4), (202.2, 1.0, 1.38)), (200.0, 1.0, 1.3), 35, 4)
# the walk home
shot('S31_WalkHome', 138.5, END_SEC,
     lambda f: Vector((POS['Arjun'][f].x + 1.2 + 1.2 * smooth(((f - 1) / FPS - 147) / 6), 0.6 - 0.8 * smooth(((f - 1) / FPS - 147) / 6), 1.35 + 2.4 * smooth(((f - 1) / FPS - 147) / 6))),
     lambda f: head('Arjun', f, -0.35) + Vector((0, 0, 0.6 * smooth(((f - 1) / FPS - 148) / 5))), 30, 2.8, ease=False)
# the portrait (rendered once, at frame 0, for the frame on the desk)
pc = bpy.data.objects.new('PortraitCam', bpy.data.cameras.new('PortraitCam'))
cams.objects.link(pc)
pc.location = (STUDIO, -2.3, 1.45)
pc.rotation_euler = (R(88), 0, 0)
pc.data.lens = 50
pc.data.dof.use_dof = True
pc.data.dof.focus_distance = 2.4
pc.data.dof.aperture_fstop = 4
sc.timeline_markers.new('Portrait', frame=0).camera = pc
sc.camera = bpy.data.objects['S01_RoomWide']

# ---------------- world light per scene, and fades ----------------
w = bpy.data.worlds.new('FilmWorld')
sc.world = w
w.use_nodes = True
bg = w.node_tree.nodes['Background']
LOOK = [(-1, (0.95, 0.85, 0.7), 0.6), (0, (1.0, 0.9, 0.75), 0.5), (20, (0.32, 0.38, 0.5), 0.55), (104, (0.85, 0.9, 1.0), 0.55),
        (123, (0.9, 0.8, 0.7), 0.35), (126, (0.85, 0.9, 1.0), 0.55), (138.5, (0.08, 0.1, 0.24), 0.6)]
cols, strs = [[], [], []], []
for f in FRAMES:
    t = (f - 1) / FPS
    k = [x for x in LOOK if x[0] <= t][-1]
    c_ = lin(k[1])
    for ax in range(3):
        cols[ax].append(c_[ax])
    strs.append(k[2])
for ax in range(3):
    bake(w.node_tree, 'nodes["Background"].inputs[0].default_value', ax, FRAMES, cols[ax], interp='CONSTANT')
bake(w.node_tree, 'nodes["Background"].inputs[1].default_value', 0, FRAMES, strs, interp='CONSTANT')

FADES = [(0, 1.0, 'in'), (19.3, 20.0, 'out'), (20.0, 20.7, 'in'), (103.4, 104.0, 'out'), (104.0, 104.6, 'in'),
         (137.8, 138.5, 'out'), (138.5, 139.3, 'in'), (151.0, END_SEC, 'out')]
exp = []
for f in FRAMES:
    t = (f - 1) / FPS
    e = 0.0
    for t0, t1, kind in FADES:
        if t0 <= t <= t1:
            u = smooth((t - t0) / (t1 - t0))
            e = -10 * (1 - u) if kind == 'in' else -10 * u
    exp.append(e if f > 0 else 0.0)
bake(sc, 'view_settings.exposure', 0, FRAMES, exp)

# ---------------- render setup ----------------
sc.render.engine = 'BLENDER_EEVEE_NEXT'
ee = sc.eevee
ee.taa_render_samples = 12
for k, v in [('use_raytracing', True), ('ray_tracing_method', 'SCREEN'), ('use_shadows', True), ('shadow_ray_count', 1),
             ('shadow_step_count', 6), ('use_gtao', True)]:
    try:
        setattr(ee, k, v)
    except Exception as e:  # noqa: BLE001
        print('eevee setting skipped', k, e)
try:
    ee.ray_tracing_options.resolution_scale = '2'
except Exception as e:  # noqa: BLE001
    print('rt scale skipped', e)
sc.render.use_motion_blur = False
sc.render.motion_blur_shutter = 0.4
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Punchy'
sc.render.resolution_x, sc.render.resolution_y = 1280, 720
sc.render.film_transparent = False
# soft glow round lamps and windows
sc.use_nodes = True
ct = sc.node_tree
rl = ct.nodes['Render Layers']
comp = ct.nodes['Composite']
gl = ct.nodes.new('CompositorNodeGlare')
gl.glare_type = 'FOG_GLOW'
gl.quality = 'MEDIUM'
gl.threshold = 1.2
gl.mix = -0.7
ct.links.new(rl.outputs['Image'], gl.inputs['Image'])
ct.links.new(gl.outputs['Image'], comp.inputs['Image'])

sc.frame_set(1)
out = os.path.join(ROOT, 'stranger_film.blend')
bpy.ops.wm.save_as_mainfile(filepath=out, relative_remap=True)
print('BUILT', out, 'frames', END, 'shots', len([m for m in sc.timeline_markers]))
