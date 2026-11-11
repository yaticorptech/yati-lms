"""Building blocks: materials, meshes (rounded primitives, tori, metaballs), parenting to bones and fast keyframing."""
import math
import bpy
import bmesh
from mathutils import Matrix, Vector

FPS = 24


def S(sec):
    """Seconds on the film's timeline -> frame number (frame 1 is 0 s)."""
    return int(round(sec * FPS)) + 1


def coll(name, parent=None):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in (parent or bpy.context.scene.collection).children:
        (parent or bpy.context.scene.collection).children.link(c)
    return c


_MATS = {}


def lin(c):
    """sRGB (as picked by eye) -> linear (what Blender's shaders take)."""
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mat(name, color, rough=0.5, metal=0.0, emit=0.0, emit_color=None, sss=0.0, coat=0.0, alpha=1.0, spec=0.5):
    if name in _MATS:
        return _MATS[name]
    color = lin(color)
    emit_color = lin(emit_color) if emit_color else None
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Specular IOR Level'].default_value = spec
    if emit:
        p.inputs['Emission Color'].default_value = (*(emit_color or color), 1)
        p.inputs['Emission Strength'].default_value = emit
    if sss:
        p.inputs['Subsurface Weight'].default_value = sss
        p.inputs['Subsurface Radius'].default_value = (1.0, 0.35, 0.2)
        p.inputs['Subsurface Scale'].default_value = 0.02
    if coat:
        p.inputs['Coat Weight'].default_value = coat
        p.inputs['Coat Roughness'].default_value = 0.05
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED' if hasattr(m, 'surface_render_method') else None
    _MATS[name] = m
    return m


def _finish(name, bm, c, loc, rot, m, sub, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    o = bpy.data.objects.new(name, me)
    c.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    if m:
        me.materials.append(m)
    if sub:
        md = o.modifiers.new('Subdivision', 'SUBSURF')
        md.levels = sub
        md.render_levels = sub
    return o


def box(name, c, dims, loc=(0, 0, 0), rot=(0, 0, 0), m=None, sub=0, bevel=0.0):
    """A box; sub>0 rounds it into a pillow, bevel>0 rounds only its edges."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=dims, verts=bm.verts)
    o = _finish(name, bm, c, loc, rot, m, sub, smooth=bool(sub or bevel))
    if bevel:
        b = o.modifiers.new('Bevel', 'BEVEL')
        b.width = bevel
        b.segments = 3
        b.limit_method = 'NONE'
    return o


def ball(name, c, radii, loc=(0, 0, 0), rot=(0, 0, 0), m=None, segs=(32, 16), sub=0, half=False):
    """An ellipsoid (radii in metres). half=True keeps only its top (z >= 0) half."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs[0], v_segments=segs[1], radius=1.0)
    if half:
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS')
    bmesh.ops.scale(bm, vec=radii, verts=bm.verts)
    o = _finish(name, bm, c, loc, rot, m, sub)
    if half:
        s = o.modifiers.new('Solidify', 'SOLIDIFY')
        s.thickness = 0.004
    return o


def cyl(name, c, r1, r2, depth, loc=(0, 0, 0), rot=(0, 0, 0), m=None, segs=32, sub=0, caps=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=depth)
    return _finish(name, bm, c, loc, rot, m, sub)


def torus(name, c, R, r, loc=(0, 0, 0), rot=(0, 0, 0), m=None, seg=40, rseg=12, scale=(1, 1, 1), arc=2 * math.pi):
    bm = bmesh.new()
    rings = []
    full = arc >= 2 * math.pi - 1e-6
    n = seg if full else seg + 1
    for i in range(n):
        a = arc * i / seg
        ring = []
        for j in range(rseg):
            b = 2 * math.pi * j / rseg
            d = R + r * math.cos(b)
            ring.append(bm.verts.new((d * math.cos(a) * scale[0], d * math.sin(a) * scale[1], r * math.sin(b) * scale[2])))
        rings.append(ring)
    for i in range(seg if full else seg):
        a_, b_ = rings[i], rings[(i + 1) % n]
        for j in range(rseg):
            bm.faces.new((a_[j], b_[j], b_[(j + 1) % rseg], a_[(j + 1) % rseg]))
    return _finish(name, bm, c, loc, rot, m, 0)


def capsule(name, c, r, top, bottom, x=0.0, y=0.0, m=None, r2=None):
    """A rounded tube from z=top down to z=bottom (limbs, sleeves)."""
    h = (top - bottom) / 2
    return ball(name, c, (max(r, r2 or r), max(r, r2 or r) * 0.97, h + 0.02), (x, y, (top + bottom) / 2), m=m, segs=(24, 20))


def blobs(name, c, elems, loc=(0, 0, 0), m=None, res=0.012, thresh=0.6):
    """A metaball object (smoothly merged blobs) — hair, moustaches, foliage. elems: (x, y, z, radius[, (sx, sy, sz)])."""
    mb = bpy.data.metaballs.new(name)
    mb.resolution = res * 1.6
    mb.render_resolution = res
    mb.threshold = thresh
    o = bpy.data.objects.new(name, mb)
    c.objects.link(o)
    o.location = loc
    for e in elems:
        el = mb.elements.new(type='ELLIPSOID' if len(e) > 4 else 'BALL')
        el.co = e[:3]
        el.radius = e[3]
        if len(e) > 4:
            el.size_x, el.size_y, el.size_z = e[4]
    if m:
        mb.materials.append(m)
    return o


def to_bone(o, arm, bone):
    """Parent o to an armature bone without moving it (its rest-pose place is where it was built)."""
    b = arm.data.bones[bone]
    o.parent = arm
    o.parent_type = 'BONE'
    o.parent_bone = bone
    o.matrix_parent_inverse = (arm.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()


def put(o, parent):
    o.parent = parent
    o.matrix_parent_inverse = parent.matrix_world.inverted()


# ----- fast keyframes: one F-curve per channel, written in one go -----
def bake(idb, path, index, frames, values, group=None, interp='LINEAR'):
    """Write sampled values (one per frame) as an F-curve. Constant channels collapse to a single key."""
    if idb.animation_data is None:
        idb.animation_data_create()
    ad = idb.animation_data
    if ad.action is None:
        ad.action = bpy.data.actions.new(f'{idb.name}Action')
    act = ad.action
    fc = act.fcurves.find(path, index=index)
    if fc:
        act.fcurves.remove(fc)
    fc = act.fcurves.new(path, index=index, action_group=group or idb.name)
    if max(values) - min(values) < 1e-6:
        frames, values = [frames[0]], [values[0]]
    n = len(frames)
    fc.keyframe_points.add(n)
    co = [0.0] * (2 * n)
    co[0::2] = frames
    co[1::2] = values
    fc.keyframe_points.foreach_set('co', co)
    code = {'CONSTANT': 0, 'LINEAR': 1, 'BEZIER': 2}[interp]
    fc.keyframe_points.foreach_set('interpolation', [code] * n)
    fc.update()
    return fc


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def vlerp(a, b, t):
    return tuple(lerp(x, y, t) for x, y in zip(a, b))
