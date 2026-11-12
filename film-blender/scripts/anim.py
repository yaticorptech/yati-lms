"""Procedural acting: each character gets a script (path, poses, expressions, head looks, facing) that is evaluated
frame by frame and baked into F-curves — walking legs tied to distance, blended poses, breathing, blinks."""
import math
import random
from kit import bake, smooth, lerp

R = math.radians
LIMBS = ['hips', 'spine', 'chest', 'neck', 'head', 'upper_arm.L', 'forearm.L', 'hand.L', 'upper_arm.R', 'forearm.R',
         'hand.R', 'thigh.L', 'shin.L', 'thigh.R', 'shin.R']

# Conventions (from the rig): arms/legs point down — x<0 swings forward, upper_arm.L z<0 / .R z>0 lifts sideways;
# spine/neck/head point up — x>0 leans/nods forward, y>0 turns to the character's left, z>0 tilts to the right.
BASE = {'upper_arm.L': (0, 0, -7), 'upper_arm.R': (0, 0, 7), 'forearm.L': (-8, 0, 0), 'forearm.R': (-8, 0, 0)}
SIT = {'thigh.L': (-88, 0, -4), 'thigh.R': (-88, 0, 4), 'shin.L': (85, 0, 0), 'shin.R': (85, 0, 0), '_z': -0.43,
       'upper_arm.L': (-22, 0, -5), 'upper_arm.R': (-22, 0, 5), 'forearm.L': (-48, 0, 0), 'forearm.R': (-48, 0, 0)}
POSES = {
    'stand': {},
    'button': {'upper_arm.L': (-28, 0, 14), 'upper_arm.R': (-28, 0, -14), 'forearm.L': (-108, 0, 8), 'forearm.R': (-108, 0, -8),
               'head': (14, 0, 0), '_osc': [('forearm.L', 0, 7, 2.2), ('forearm.R', 0, -7, 2.2)]},
    'watch': {'upper_arm.L': (-48, 0, 18), 'forearm.L': (-112, 0, 10), 'head': (16, 8, 0), 'neck': (6, 0, 0)},
    'pack': {'upper_arm.L': (-42, 0, 6), 'upper_arm.R': (-46, 0, -6), 'forearm.L': (-30, 0, 0), 'forearm.R': (-34, 0, 0),
             'spine': (14, 0, 0), 'head': (16, 0, 0)},
    'nod': {'_osc': [('head', 0, 7, 1.4)]},
    'shiver': {'upper_arm.L': (-28, 0, 22), 'upper_arm.R': (-28, 0, -22), 'forearm.L': (-100, 0, 38), 'forearm.R': (-100, 0, -38),
               'chest': (8, 0, 0), 'head': (8, 0, 0), '_osc': [('chest', 2, 1.5, 7), ('upper_arm.L', 2, 1.5, 6.5)]},
    'reach': {'upper_arm.R': (-80, 0, -6), 'forearm.R': (-25, 0, 0), 'head': (-4, 0, 0), 'chest': (-2, 0, 0)},
    'gesture': {'upper_arm.L': (-24, 0, -18), 'upper_arm.R': (-24, 0, 18), 'forearm.L': (-68, 0, -10), 'forearm.R': (-68, 0, 10),
                '_osc': [('forearm.R', 0, 9, 0.9), ('forearm.L', 0, -7, 0.7)]},
    'shrug': {'upper_arm.L': (-14, 0, -24), 'upper_arm.R': (-14, 0, 24), 'forearm.L': (-62, 0, -26), 'forearm.R': (-62, 0, 26),
              'head': (10, 0, 10), 'chest': (4, 0, 0)},
    'shoo': {'upper_arm.R': (-46, 0, 4), 'forearm.R': (-34, 0, 0), 'hand.R': (-10, 0, 0), '_osc': [('hand.R', 0, 30, 1.6)], 'head': (6, 0, -6)},
    'give': {'upper_arm.R': (-58, 0, -12), 'forearm.R': (-32, 0, 0)},
    'phone': {'upper_arm.L': (-30, 0, -42), 'forearm.L': (-138, 0, 22), 'head': (4, 0, -8)},
    'wave': {'upper_arm.R': (-12, 0, 145), 'forearm.R': (0, 0, 10), '_osc': [('forearm.R', 2, 26, 1.6)]},
    'waveL': {'upper_arm.L': (-12, 0, -145), 'forearm.L': (0, 0, -10), '_osc': [('forearm.L', 2, 26, 1.6)]},
    'support': {'upper_arm.L': (-24, 0, -30), 'forearm.L': (-36, 0, 0)},
    'apology': {'upper_arm.L': (-18, 0, 14), 'upper_arm.R': (-18, 0, -14), 'forearm.L': (-46, 0, 20), 'forearm.R': (-46, 0, -20),
                'spine': (12, 0, 0), 'head': (20, 0, 0)},
    'handshake': {'upper_arm.R': (-50, 0, -6), 'forearm.R': (-28, 0, 0), 'chest': (6, 0, 0), '_osc': [('forearm.R', 0, 6, 2)]},
    'showframe': {'upper_arm.R': (-62, 0, -12), 'forearm.R': (-46, 0, 0), 'hand.R': (0, 90, 0), 'head': (6, 0, 0)},
    'lean': {'spine': (12, 0, 0), 'chest': (6, 0, 0)},
    'pant': {'spine': (10, 0, 0), 'head': (6, 0, 0), '_osc': [('chest', 0, 5, 1.8)],
             'upper_arm.L': (-10, 0, -10), 'upper_arm.R': (-10, 0, 10)},
    'stick': {'upper_arm.R': (-14, 0, 10), 'forearm.R': (-36, 0, 0), 'chest': (10, 0, 0), 'head': (-8, 0, 0)},
    'desk': {'upper_arm.L': (-40, 0, 6), 'upper_arm.R': (-40, 0, -6), 'forearm.L': (-50, 0, 10), 'forearm.R': (-50, 0, -10)},
    'proud': {'upper_arm.R': (-10, 0, 40), 'forearm.R': (-10, 0, 50), 'head': (-4, 0, 0)},
}
EXPR = {  # smile, frown, open, brow lift (m), brow worry (deg), eye openness 0..1
    'neutral': (0.15, 0, 0, 0, 0, 1),
    'smile': (0.9, 0, 0.1, 0.004, 0, 0.9),
    'grin': (1, 0, 0.45, 0.006, 0, 0.85),
    'worry': (0, 0.55, 0.05, 0.004, 14, 1),
    'sad': (0, 0.85, 0, 0.002, 18, 0.72),
    'sadsmile': (0.5, 0.15, 0, 0.003, 14, 0.75),
    'surprise': (0, 0, 0.9, 0.014, 4, 1.15),
    'determined': (0.35, 0, 0, -0.003, -8, 0.95),
    'tired': (0.05, 0.35, 0, 0, 10, 0.6),
    'curious': (0.2, 0, 0.05, 0.009, -3, 1.05),
}


class Script:
    """A character's acting, in seconds. Keys are added with chained calls (all times in seconds)."""

    def __init__(self, actor, start=(0, 0, 0), yaw=0, pose='stand', expr='neutral'):
        self.a = actor
        self.path = [(-1.0, *start, 'cut')]
        self.faces = [(-1.0, yaw)]
        self.poses = [(-1.0, pose)]
        self.exprs = [(-1.0, expr)]
        self.looks = [(-1.0, 0, 0)]
        self.hold = {}            # prop name -> [(t, visible)]

    def go(self, t, x, y, z=None, how='walk'):
        z = self.path[-1][3] if z is None else z
        self.path.append((t, x, y, z, how))
        return self

    def at(self, t, x, y, z=None):
        """Stay put until t (adds a stationary key), or jump there when it is a new place (a cut)."""
        z = self.path[-1][3] if z is None else z
        last = self.path[-1]
        how = 'cut' if (abs(last[1] - x) > 1e-6 or abs(last[2] - y) > 1e-6 or abs(last[3] - z) > 1e-6) else 'stay'
        self.path.append((t, x, y, z, how))
        return self

    def face(self, t, yaw):
        self.faces.append((t, yaw))
        return self

    def pose(self, t, name):
        self.poses.append((t, name))
        return self

    def expr(self, t, name):
        self.exprs.append((t, name))
        return self

    def look(self, t, yaw, pitch=0):
        self.looks.append((t, yaw, pitch))
        return self

    def show(self, prop, t, visible):
        self.hold.setdefault(prop, []).append((t, visible))
        return self


def _pose_dict(name):
    out = dict(BASE)
    for part in name.split('+'):
        if part == 'sit':
            out.update(SIT)
        else:
            out.update(POSES[part])
    return out


def _blend(keys, t, fn, dur=0.4):
    """Value at t of a key list [(time, key...)] where each key eases in from the previous over `dur` seconds."""
    i = 0
    while i + 1 < len(keys) and keys[i + 1][0] <= t:
        i += 1
    cur = fn(keys[i])
    if i == 0:
        return cur
    prev = fn(keys[i - 1])
    w = smooth((t - keys[i][0]) / dur)
    return [lerp(p, c, w) for p, c in zip(prev, cur)]


def _vec(d, bone):
    return d.get(bone, (0, 0, 0))


def _angle_lerp(a, b, t):
    d = (b - a + 180) % 360 - 180
    return a + d * t


def evaluate(script, frames, fps=24):
    """-> per-frame channels {(datablock, path, index): [values]} ready to bake."""
    a = script.a
    rnd = random.Random(hash(a.name) & 0xffff)
    blinks = set()
    t = 1.5
    while t < frames[-1] / fps + 5:
        blinks.add(int(t * fps))
        t += rnd.uniform(2.4, 5.0)
    path = script.path
    ch = {}

    def put(key, v):
        ch.setdefault(key, []).append(v)

    phase = 0.0
    prev_pos = None
    yaw = script.faces[0][1]
    last_move_t = -1
    pose_cache = {}
    for f in frames:
        t = (f - 1) / fps
        # -- where: walk/run/glide along the path, cuts jump --
        i = 0
        while i + 1 < len(path) and path[i + 1][0] <= t:
            i += 1
        p0 = path[i]
        how = 'stay'
        if i + 1 < len(path):
            p1 = path[i + 1]
            how = p1[4]
            if how in ('walk', 'run', 'glide', 'slow', 'stroll'):
                u = (t - p0[0]) / max(1e-6, p1[0] - p0[0])
                if how == 'glide':
                    u = smooth(u)
                pos = (lerp(p0[1], p1[1], u), lerp(p0[2], p1[2], u), lerp(p0[3], p1[3], u))
            else:
                pos = p0[1:4]
        else:
            pos = p0[1:4]
        moving = how in ('walk', 'run', 'slow', 'stroll')
        speed = 0.0
        if prev_pos is not None:
            dx, dy = pos[0] - prev_pos[0], pos[1] - prev_pos[1]
            dist = math.hypot(dx, dy)
            if dist < 0.5:          # not a cut
                speed = dist * fps
                if moving and dist > 1e-5:
                    stride = {'run': 1.9, 'walk': 1.35, 'slow': 0.9, 'stroll': 1.2}[how]
                    phase += dist / stride
                    yaw_t = math.degrees(math.atan2(dx, -dy))
                    yaw = _angle_lerp(yaw, yaw_t, 0.25)
                    last_move_t = t
        prev_pos = pos
        if not moving or speed < 0.05:
            # facing: the latest face key (set after the last move), eased
            fk = [k for k in script.faces if k[0] <= t]
            if fk and fk[-1][0] >= last_move_t - 0.05:
                yaw = _angle_lerp(yaw, fk[-1][1], 0.12)
            elif fk and fk[-1][0] > last_move_t:
                yaw = fk[-1][1]
        if how == 'cut' or (i < len(path) and abs(path[i][0] - t) < 1e-9 and path[i][4] == 'cut'):
            fk = [k for k in script.faces if k[0] <= t]
            if fk and abs(fk[-1][0] - t) < 0.05:
                yaw = fk[-1][1]

        # -- pose (blended), with oscillations --
        def pv(k):
            name = k[1]
            if name not in pose_cache:
                pose_cache[name] = _pose_dict(name)
            d = pose_cache[name]
            v = []
            for b in LIMBS:
                v += list(_vec(d, b))
            return v + [d.get('_z', 0.0)]
        vals = _blend(script.poses, t, pv, 0.45)
        rot = {b: [vals[3 * j], vals[3 * j + 1], vals[3 * j + 2]] for j, b in enumerate(LIMBS)}
        zoff = vals[-1]
        cur_pose = [k for k in script.poses if k[0] <= t][-1][1]
        for part in cur_pose.split('+'):
            for (b, ax, amp, hz) in POSES.get(part, {}).get('_osc', []):
                since = t - [k for k in script.poses if k[0] <= t][-1][0]
                rot[b][ax] += amp * math.sin(2 * math.pi * hz * t) * smooth(since / 0.4)
        # breathing
        rot['chest'][0] += 1.4 * math.sin(2 * math.pi * 0.27 * t)
        # -- locomotion on top --
        if moving and speed > 0.05:
            run = how == 'run'
            k = min(1.0, speed / (2.4 if run else 1.0))
            s = math.sin(2 * math.pi * phase)
            c2 = math.cos(2 * math.pi * phase)
            leg = (42 if run else 26) * k
            arm = (48 if run else 22) * k
            sitting = 'sit' in cur_pose
            if not sitting:
                rot['thigh.L'][0] = -leg * s
                rot['thigh.R'][0] = leg * s
                rot['shin.L'][0] = max(0, (70 if run else 34) * k * -c2) + 4
                rot['shin.R'][0] = max(0, (70 if run else 34) * k * c2) + 4
                free = ('stand', 'pant', 'stick')
                if cur_pose in free or run:
                    rot['upper_arm.L'][0] = arm * s
                    rot['upper_arm.R'][0] = -arm * s
                    rot['forearm.L'][0] = -(14 + (60 if run else 12) * k)
                    rot['forearm.R'][0] = -(14 + (60 if run else 12) * k)
                rot['spine'][0] += (14 if run else 3) * k
                rot['hips'][1] += 5 * k * s
                rot['chest'][1] -= 6 * k * s
                zoff += -0.025 * k * abs(math.cos(2 * math.pi * phase)) + 0.012 * k
        # -- head look (eased) --
        ly, lp = _blend(script.looks, t, lambda k: [k[1], k[2]], 0.35)
        rot['neck'][1] += ly * 0.4
        rot['head'][1] += ly * 0.6
        rot['neck'][0] += lp * 0.4
        rot['head'][0] += lp * 0.6
        for b in LIMBS:
            for ax in range(3):
                put((a.arm, f'pose.bones["{b}"].rotation_euler', ax), R(rot[b][ax]))
        put((a.arm, 'location', 0), pos[0])
        put((a.arm, 'location', 1), pos[1])
        put((a.arm, 'location', 2), pos[2] + zoff)
        put((a.arm, 'rotation_euler', 2), R(yaw))
        # -- face --
        sm, fr, op, lift, worry, eye = _blend(script.exprs, t, lambda k: list(EXPR[k[1]]), 0.35)
        blink = 0.0
        for d in range(4):
            if f - d in blinks:
                blink = [1, 1, 0.6, 0.25][d]
        keys = a.mouth.data.shape_keys
        put((keys, 'key_blocks["smile"].value', 0), sm)
        put((keys, 'key_blocks["frown"].value', 0), fr)
        put((keys, 'key_blocks["open"].value', 0), op)
        openness = max(0.0, min(1.2, eye)) * (1 - blink)
        for lid in a.lids:
            put((lid, 'rotation_euler', 0), R(90 - 125 * openness))
        for s, brow in zip((1, -1), a.brows):
            put((brow, 'location', 2), brow['rest_z'] + lift)
            put((brow, 'rotation_euler', 1), R(s * (-6 + worry)))
        # -- props shown/hidden --
        for prop, ks in script.hold.items():
            vis = [v for (tt, v) in ks if tt <= t]
            o = a.parts[prop]
            sc = 1.0 if (vis[-1] if vis else False) else 0.0
            for ax in range(3):
                put((o, 'scale', ax), sc)
    return ch


def bake_script(script, frames):
    ch = evaluate(script, frames)
    for (db, path, idx), vals in ch.items():
        bake(db, path, idx, frames, vals)
