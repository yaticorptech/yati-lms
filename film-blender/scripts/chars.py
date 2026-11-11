"""The three characters — Arjun, Ravi, the Interviewer — as rigged cartoon figures (an armature with every body part
bound to a bone), with faces that blink, smile, frown and gape (lids, brows and a shape-keyed mouth)."""
import math
import bpy
from mathutils import Vector
from kit import box, ball, cyl, torus, blobs, mat, to_bone, coll, capsule

R = math.radians

BONES = [  # name, head, tail, parent
    ('hips', (0, 0, 0.92), (0, 0, 1.02), None),
    ('spine', (0, 0, 1.02), (0, 0, 1.2), 'hips'),
    ('chest', (0, 0, 1.2), (0, 0, 1.38), 'spine'),
    ('neck', (0, 0, 1.38), (0, 0, 1.47), 'chest'),
    ('head', (0, 0, 1.47), (0, 0, 1.78), 'neck'),
    ('upper_arm.L', (0.2, 0, 1.36), (0.215, 0, 1.1), 'chest'),
    ('forearm.L', (0.215, 0, 1.1), (0.225, 0, 0.87), 'upper_arm.L'),
    ('hand.L', (0.225, 0, 0.87), (0.225, 0, 0.78), 'forearm.L'),
    ('upper_arm.R', (-0.2, 0, 1.36), (-0.215, 0, 1.1), 'chest'),
    ('forearm.R', (-0.215, 0, 1.1), (-0.225, 0, 0.87), 'upper_arm.R'),
    ('hand.R', (-0.225, 0, 0.87), (-0.225, 0, 0.78), 'forearm.R'),
    ('thigh.L', (0.095, 0, 0.92), (0.095, 0, 0.5), 'hips'),
    ('shin.L', (0.095, 0, 0.5), (0.095, 0, 0.08), 'thigh.L'),
    ('thigh.R', (-0.095, 0, 0.92), (-0.095, 0, 0.5), 'hips'),
    ('shin.R', (-0.095, 0, 0.5), (-0.095, 0, 0.08), 'thigh.R'),
]
HEAD_C = Vector((0, 0, 1.645))   # centre of the (big, cartoon) head
HEAD_R = (0.172, 0.162, 0.188)


def head_front(x, z, out=0.0):
    """The y of the face's surface (front is -y) at x, z on the head ellipsoid."""
    dx, dz = x / HEAD_R[0], (z - HEAD_C.z) / HEAD_R[2]
    k = max(0.0, 1 - dx * dx - dz * dz)
    return -(HEAD_R[1] * math.sqrt(k)) - out


def make_mouth(name, c, m, w=0.055, z=1.565):
    """A lip line hugging the face, with shape keys smile / frown / open."""
    import bmesh
    n = 11
    bm = bmesh.new()
    top, bot = [], []
    for i in range(n):
        x = -w + 2 * w * i / (n - 1)
        y = head_front(x, z, 0.004)
        top.append(bm.verts.new((x, y, z + 0.0035)))
        bot.append(bm.verts.new((x, y, z - 0.0035)))
    for i in range(n - 1):
        bm.faces.new((top[i], top[i + 1], bot[i + 1], bot[i]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    c.objects.link(o)
    me.materials.append(m)
    sol = o.modifiers.new('Solidify', 'SOLIDIFY')
    sol.thickness = 0.006
    sol.offset = 0
    o.shape_key_add(name='Basis')
    for key in ('smile', 'frown', 'open'):
        sk = o.shape_key_add(name=key, from_mix=False)
        for i, v in enumerate(me.vertices):
            x, y, zz = v.co
            u = x / w                      # -1 .. 1 across the mouth
            is_top = (i % 2 == 0)
            if key == 'smile':
                dz = 0.02 * u * u - 0.004 + (0 if is_top else -0.006 * (1 - u * u))
            elif key == 'frown':
                dz = -0.016 * u * u + 0.004
            else:
                dz = (0.006 if is_top else -0.03) * (1 - u * u)
            sk.data[i].co = (x, y, zz + dz)
    return o


class Actor:
    def __init__(self, name):
        self.name = name
        self.parts = {}


def build(name, spec, origin=(0, 0, 0)):
    """spec: colours and wardrobe. Returns an Actor (armature + face parts)."""
    c = coll(name, coll('Characters'))
    a = bpy.data.armatures.new(f'{name}Rig')
    arm = bpy.data.objects.new(f'{name}Rig', a)
    c.objects.link(arm)
    arm.show_in_front = True
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for bn, h, t, p in BONES:
        b = a.edit_bones.new(bn)
        b.head, b.tail, b.roll = h, t, 0
        if p:
            b.parent = a.edit_bones[p]
            b.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'

    sk = mat(f'{name}Skin', spec['skin'], rough=0.45, sss=0.25)
    hair = mat(f'{name}Hair', spec['hair'], rough=0.55, spec=0.35)
    top = mat(f'{name}Top', spec['top'], rough=0.7)
    sleeve = mat(f'{name}Sleeve', spec.get('sleeve', spec['top']), rough=0.7)
    legs = mat(f'{name}Legs', spec['legs'], rough=0.75)
    shoe = mat(f'{name}Shoe', spec['shoe'], rough=0.35, coat=0.3)
    white = mat('EyeWhite', (0.95, 0.95, 0.93), rough=0.15)
    iris = mat(f'{name}Iris', spec.get('iris', (0.22, 0.12, 0.05)), rough=0.2)
    black = mat('Pupil', (0.01, 0.01, 0.01), rough=0.1)
    shine = mat('EyeShine', (1, 1, 1), emit=6)
    lip = mat(f'{name}Mouth', (0.45, 0.15, 0.14), rough=0.4)
    brow = mat(f'{name}Brow', spec.get('brow', spec['hair']), rough=0.7)
    P = []

    def part(o, bone):
        to_bone(o, arm, bone)
        P.append(o)
        return o

    # --- head & face ---
    part(ball(f'{name}Head', c, HEAD_R, HEAD_C, m=sk, segs=(40, 24)), 'head')
    part(ball(f'{name}Jaw', c, (0.128, 0.115, 0.08), (0, -0.035, 1.532), m=sk), 'head')
    part(ball(f'{name}Nose', c, (0.026, 0.03, 0.03), (0, head_front(0, 1.615) - 0.012, 1.61), m=sk), 'head')
    for s in (1, -1):
        part(ball(f'{name}Ear{s}', c, (0.022, 0.032, 0.045), (s * 0.168, 0.005, 1.635), m=sk), 'head')
        ex, ez = s * 0.064, 1.668
        ey = head_front(ex, ez) + 0.03
        part(ball(f'{name}Eye{s}', c, (0.047, 0.04, 0.05), (ex, ey, ez), m=white), 'head')
        part(ball(f'{name}Iris{s}', c, (0.03, 0.01, 0.032), (ex, ey - 0.034, ez - 0.003), m=iris), 'head')
        part(ball(f'{name}Pupil{s}', c, (0.015, 0.005, 0.016), (ex, ey - 0.041, ez - 0.003), m=black), 'head')
        part(ball(f'{name}Shine{s}', c, (0.008, 0.004, 0.008), (ex + 0.011, ey - 0.045, ez + 0.013), m=shine, segs=(12, 8)), 'head')
        lid = part(ball(f'{name}Lid{s}', c, (0.052, 0.046, 0.054), (ex, ey, ez), m=sk, half=True), 'head')
        lid.rotation_euler.x = R(-38)
        lid.rotation_mode = 'XYZ'
        bw = part(box(f'{name}Brow{s}', c, (0.052, 0.014, 0.012), (ex, head_front(ex, 1.745) - 0.004, 1.748),
                      (0, s * R(-6), s * R(14)), m=brow, sub=2), 'head')
        bw['rest_z'] = bw.location.z
        if spec.get('glasses'):
            gm = mat(f'{name}Glasses', spec['glasses'], rough=0.3, metal=0.4)
            part(torus(f'{name}Rim{s}', c, 0.044, 0.0045, (ex, ey - 0.036, ez), (R(90), 0, 0), m=gm,
                       scale=(1, 0.85 if spec.get('square') else 1, 1)), 'head')
            part(cyl(f'{name}Arm{s}', c, 0.003, 0.003, 0.14, (s * 0.1, ey + 0.045, ez + 0.005), (R(90), 0, s * R(-12)), m=gm, segs=8), 'head')
        P[-1]  # noqa
    if spec.get('glasses'):
        part(cyl(f'{name}Bridge', c, 0.003, 0.003, 0.04, (0, head_front(0, 1.678) - 0.02, 1.678), (0, R(90), 0), m=mat(f'{name}Glasses', spec['glasses']), segs=8), 'head')
    mouth = part(make_mouth(f'{name}Mouth', c, lip), 'head')
    part(blobs(f'{name}Hairdo', c, [tuple(v * 1.14 for v in e[:4]) + tuple(e[4:]) for e in spec['hairdo']], HEAD_C, m=hair, thresh=0.5), 'head')
    if spec.get('moustache'):
        part(blobs(f'{name}Tache', c, spec['moustache'], (0, 0, 0), m=hair, res=0.006, thresh=0.5), 'head')
    part(cyl(f'{name}Neck', c, 0.052, 0.058, 0.16, (0, 0.005, 1.43), m=sk), 'neck')

    # --- body ---
    part(ball(f'{name}Torso', c, (0.2, 0.15, 0.24), (0, 0.0, 1.16), m=top, segs=(32, 20)), 'spine')
    part(ball(f'{name}Chest', c, (0.215, 0.155, 0.15), (0, 0.0, 1.3), m=top, segs=(32, 20)), 'chest')
    for s, side in ((1, 'L'), (-1, 'R')):
        part(ball(f'{name}Shoulder{s}', c, (0.065, 0.065, 0.06), (s * 0.19, 0, 1.35), m=sleeve), 'chest')
        part(capsule(f'{name}UpperArm{s}', c, 0.055, 1.39, 1.08, s * 0.207, m=sleeve, r2=0.06), f'upper_arm.{side}')
        part(ball(f'{name}Elbow{s}', c, (0.045, 0.045, 0.045), (s * 0.215, 0, 1.1), m=sleeve), f'forearm.{side}')
        part(capsule(f'{name}Forearm{s}', c, 0.046, 1.12, 0.87, s * 0.22, m=sleeve, r2=0.05), f'forearm.{side}')
        part(cyl(f'{name}Cuff{s}', c, 0.049, 0.049, 0.03, (s * 0.224, 0, 0.885), m=mat(f'{name}CuffM', spec.get('cuff', spec.get('sleeve', spec['top'])))), f'forearm.{side}')
        part(ball(f'{name}Hand{s}', c, (0.04, 0.032, 0.06), (s * 0.226, -0.005, 0.82), m=sk), f'hand.{side}')
        part(ball(f'{name}Thumb{s}', c, (0.015, 0.015, 0.032), (s * 0.212, -0.032, 0.845), (R(20), 0, 0), m=sk), f'hand.{side}')
        part(capsule(f'{name}Thigh{s}', c, 0.075, 0.98, 0.46, s * 0.095, m=legs, r2=0.085), f'thigh.{side}')
        part(ball(f'{name}Knee{s}', c, (0.064, 0.064, 0.064), (s * 0.095, 0, 0.5), m=legs), f'shin.{side}')
        part(capsule(f'{name}Shin{s}', c, 0.063, 0.52, 0.08, s * 0.095, m=legs, r2=0.07), f'shin.{side}')
        part(box(f'{name}Shoe{s}', c, (0.12, 0.27, 0.1), (s * 0.095, -0.05, 0.05), m=shoe, sub=2), f'shin.{side}')
    part(ball(f'{name}Hips', c, (0.2, 0.15, 0.13), (0, 0, 0.95), m=legs, segs=(32, 20)), 'hips')
    for extra in spec.get('extras', []):
        extra(name, c, part, arm)
    for o in P:
        o.hide_select = False
    act = Actor(name)
    act.arm = arm
    act.coll = c
    act.parts = {o.name: o for o in P}
    act.mouth = mouth
    act.lids = [act.parts[f'{name}Lid1'], act.parts[f'{name}Lid-1']]
    act.brows = [act.parts[f'{name}Brow1'], act.parts[f'{name}Brow-1']]
    act.spec = spec
    arm.location = origin
    return act


# ---------------- wardrobe & looks (after the reference sheets) ----------------
def _arjun_extras(name, c, part, arm):
    leather = mat('Leather', (0.55, 0.36, 0.2), rough=0.45, coat=0.2)
    steel = mat('Steel', (0.8, 0.8, 0.82), rough=0.2, metal=1)
    dial = mat('WatchDial', (0.05, 0.08, 0.15), rough=0.1, coat=1)
    part(torus('ArjunWatch', c, 0.047, 0.009, (0.224, 0, 0.9), (0, 0, 0), m=leather), 'forearm.L')
    part(cyl('ArjunDial', c, 0.02, 0.02, 0.012, (0.224, -0.05, 0.9), (R(90), 0, 0), m=dial), 'forearm.L')
    part(torus('ArjunBezel', c, 0.02, 0.004, (0.224, -0.055, 0.9), (R(90), 0, 0), m=steel), 'forearm.L')
    part(box('ArjunBag', c, (0.08, 0.3, 0.24), (-0.27, 0.02, 0.95), m=leather, sub=2), 'hips')
    part(box('ArjunFlap', c, (0.085, 0.3, 0.1), (-0.275, 0.02, 1.03), m=mat('LeatherDark', (0.22, 0.11, 0.05), rough=0.5), sub=1), 'hips')
    part(box('ArjunStrapF', c, (0.05, 0.012, 0.62), (-0.02, -0.158, 1.2), (0, R(-40), 0), m=leather), 'chest')
    part(box('ArjunStrapB', c, (0.05, 0.012, 0.62), (-0.02, 0.158, 1.2), (0, R(-40), 0), m=leather), 'chest')
    btn = mat('Button', (0.95, 0.95, 0.97), rough=0.2)
    for i in range(4):
        part(ball(f'ArjunButton{i}', c, (0.008, 0.004, 0.008), (0, -0.205, 1.36 - i * 0.1), m=btn, segs=(10, 6)), 'chest' if i < 2 else 'spine')
    part(box('ArjunCollar', c, (0.2, 0.18, 0.05), (0, -0.01, 1.43), (R(10), 0, 0), m=mat('ArjunTop', (0, 0, 0)), sub=2), 'chest')
    part(torus('ArjunBelt', c, 0.2, 0.02, (0, 0, 1.03), m=leather), 'hips')
    part(box('ArjunPhone', c, (0.07, 0.012, 0.14), (-0.235, -0.045, 0.8), m=mat('PhoneBlack', (0.02, 0.02, 0.03), rough=0.1, coat=1), bevel=0.006), 'hand.R')
    part(box('ArjunFolder', c, (0.24, 0.02, 0.32), (-0.24, -0.06, 0.8), m=mat('Folder', (0.1, 0.35, 0.6), rough=0.4), bevel=0.004), 'hand.R')


def _ravi_extras(name, c, part, arm):
    kurta = mat('RaviTop', (0, 0, 0))
    shawl = mat('Shawl', (0.42, 0.26, 0.16), rough=0.9)
    wood = mat('StickWood', (0.27, 0.15, 0.07), rough=0.5, coat=0.3)
    part(cyl('RaviKurtaSkirt', c, 0.23, 0.205, 0.36, (0, 0.0, 0.8), m=kurta), 'hips')
    part(ball('RaviShawlCape', c, (0.27, 0.2, 0.17), (0, 0.01, 1.3), m=shawl, half=True), 'chest')
    for s in (1, -1):
        part(box(f'RaviShawlDrape{s}', c, (0.13, 0.05, 0.42), (s * 0.12, -0.17, 1.12), (R(-6), 0, 0), m=shawl, sub=2), 'chest')
    part(box('RaviShawlBack', c, (0.46, 0.08, 0.5), (0, 0.17, 1.14), m=shawl, sub=2), 'chest')
    part(cyl('RaviStick', c, 0.013, 0.013, 0.86, (-0.235, -0.04, 0.4), m=wood), 'hand.R')
    part(torus('RaviStickTop', c, 0.04, 0.013, (-0.235, -0.0, 0.83), (R(90), 0, R(90)), m=wood, arc=math.pi), 'hand.R')
    part(box('RaviPhone', c, (0.07, 0.012, 0.14), (0.235, -0.045, 0.8), m=mat('PhoneBlack', (0, 0, 0)), bevel=0.006), 'hand.L')


def _int_extras(name, c, part, arm):
    shirt = mat('IntShirt', (0.94, 0.95, 0.97), rough=0.5)
    tie = mat('IntTie', (0.45, 0.08, 0.1), rough=0.45)
    part(box('IntShirtV', c, (0.14, 0.02, 0.26), (0, -0.205, 1.29), m=shirt, sub=1), 'chest')
    part(box('IntTieKnot', c, (0.035, 0.02, 0.035), (0, -0.218, 1.395), m=tie, sub=1), 'chest')
    part(box('IntTie', c, (0.05, 0.015, 0.3), (0, -0.215, 1.24), m=tie, sub=1), 'chest')
    for s in (1, -1):
        part(box(f'IntLapel{s}', c, (0.07, 0.02, 0.24), (s * 0.085, -0.205, 1.3), (0, s * R(-18), 0), m=mat('IntTop', (0, 0, 0)), sub=1), 'chest')
    part(box('IntFrameHand', c, (0.2, 0.025, 0.25), (-0.235, -0.07, 0.8), m=mat('FrameWood', (0.35, 0.2, 0.1), rough=0.4), bevel=0.008), 'hand.R')
    part(box('IntPhoto', c, (0.16, 0.004, 0.2), (-0.235, -0.084, 0.8), m=mat('PhotoPrint', (0.8, 0.7, 0.6), rough=0.3)), 'hand.R')


def _hair_arjun():
    e = []
    for x, y, z, r in [(0, 0.01, 0.13, 0.12), (0.075, 0.0, 0.11, 0.1), (-0.075, 0.0, 0.11, 0.1), (0, 0.075, 0.08, 0.13),
                       (0.11, 0.04, 0.05, 0.08), (-0.11, 0.04, 0.05, 0.08), (0, 0.11, -0.02, 0.11), (0.09, 0.09, -0.01, 0.08),
                       (-0.09, 0.09, -0.01, 0.08), (0.13, 0.02, 0.0, 0.05), (-0.13, 0.02, 0.0, 0.05)]:
        e.append((x, y, z, r))
    for x, z, r in [(-0.075, 0.125, 0.06), (-0.02, 0.145, 0.065), (0.04, 0.14, 0.062), (0.095, 0.115, 0.055), (0.0, 0.18, 0.06), (0.06, 0.17, 0.05)]:
        e.append((x, -0.095, z, r))
    return e


def _hair_ravi():
    e = []
    for i in range(9):
        a = math.pi * (0.05 + 0.9 * i / 8)            # a ring round the back and sides, bald on top
        e.append((math.cos(a) * 0.14, math.sin(a) * 0.115 + 0.01, -0.005, 0.06))
    e += [(0.13, -0.03, 0.02, 0.045), (-0.13, -0.03, 0.02, 0.045), (0, 0.13, 0.03, 0.06),
          (0, 0.04, 0.13, 0.1), (0.07, 0.03, 0.115, 0.08), (-0.07, 0.03, 0.115, 0.08), (0, 0.09, 0.1, 0.1),
          (0.035, -0.05, 0.14, 0.06), (-0.04, -0.045, 0.135, 0.055)]
    return e


def _hair_int():
    e = [(0, 0.01, 0.12, 0.12), (0.08, 0.0, 0.1, 0.09), (-0.08, 0.0, 0.1, 0.09), (0, 0.08, 0.07, 0.12),
         (0.115, 0.04, 0.03, 0.07), (-0.115, 0.04, 0.03, 0.07), (0, 0.11, -0.02, 0.1), (0.02, -0.07, 0.135, 0.085)]
    return e


ARJUN = dict(skin=(0.76, 0.53, 0.38), hair=(0.08, 0.06, 0.06), top=(0.93, 0.92, 0.99), legs=(0.22, 0.25, 0.36),
             shoe=(0.42, 0.25, 0.14), hairdo=_hair_arjun(), extras=[_arjun_extras], iris=(0.4, 0.24, 0.1))
RAVI = dict(skin=(0.72, 0.5, 0.36), hair=(0.9, 0.9, 0.9), brow=(0.88, 0.88, 0.86), top=(0.88, 0.8, 0.66), legs=(0.94, 0.93, 0.88),
            shoe=(0.5, 0.32, 0.18), hairdo=_hair_ravi(), glasses=(0.12, 0.1, 0.09), square=True, extras=[_ravi_extras], iris=(0.32, 0.2, 0.1),
            moustache=[(0.03, -0.17, 1.588, 0.042, (1.3, 0.6, 0.6)), (-0.03, -0.17, 1.588, 0.042, (1.3, 0.6, 0.6)),
                       (0.072, -0.152, 1.565, 0.03), (-0.072, -0.152, 1.565, 0.03), (0.085, -0.14, 1.548, 0.022), (-0.085, -0.14, 1.548, 0.022)])
INTERVIEWER = dict(skin=(0.74, 0.52, 0.37), hair=(0.1, 0.09, 0.09), top=(0.15, 0.2, 0.36), legs=(0.14, 0.18, 0.32),
                   shoe=(0.02, 0.02, 0.02), hairdo=_hair_int(), glasses=(0.05, 0.05, 0.06), square=True, cuff=(0.94, 0.95, 0.97),
                   extras=[_int_extras])
