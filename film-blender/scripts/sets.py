"""The film's places, each at its own spot in one scene: Arjun's home (x=0), the rainy bus stop (x=100), the office
(x=200), the evening street (x=300), a photo insert table (x=400) and a portrait studio (x=500)."""
import math
import random
import bpy
from kit import box, ball, cyl, torus, blobs, mat, coll, lin

R = math.radians
HOME, BUS, OFFICE, STREET, INSERT, STUDIO = 0, 100, 200, 300, 400, 500


def light(name, kind, c, loc, rot=(0, 0, 0), energy=100, color=(1, 1, 1), size=1.0, spot=None):
    l = bpy.data.lights.new(name, kind)
    l.energy = energy
    l.color = color
    if kind == 'AREA':
        l.size = size
    elif kind in ('POINT', 'SPOT'):
        l.shadow_soft_size = size
    if spot:
        l.spot_size = R(spot)
        l.spot_blend = 0.6
    o = bpy.data.objects.new(name, l)
    c.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    return o


def emissive(name, color, strength):
    return mat(name, color, rough=0.5, emit=strength)


def window_grid_mat(name, wall, lit, dark, scale=6.0, strength=3.0):
    """Building facades: rows of windows (some lit) from a brick texture."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    br = nt.nodes.new('ShaderNodeTexBrick')
    br.inputs['Scale'].default_value = scale / 20
    br.inputs['Mortar Size'].default_value = 0.08
    br.inputs['Brick Width'].default_value = 0.6
    br.inputs['Row Height'].default_value = 0.3
    br.offset = 0
    br.inputs['Color1'].default_value = (*lin(lit), 1)
    br.inputs['Color2'].default_value = (*lin(dark), 1)
    br.inputs['Mortar'].default_value = (*lin(wall), 1)
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    cmb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    nt.links.new(sep.outputs['X'], cmb.inputs['X'])
    nt.links.new(sep.outputs['Z'], cmb.inputs['Y'])
    nt.links.new(cmb.outputs['Vector'], br.inputs['Vector'])
    nt.links.new(br.outputs['Color'], p.inputs['Base Color'])
    nt.links.new(br.outputs['Color'], p.inputs['Emission Color'])
    mix = nt.nodes.new('ShaderNodeMath')
    mix.operation = 'MULTIPLY'
    mix.inputs[1].default_value = strength
    nt.links.new(br.outputs['Fac'], mix.inputs[0])  # mortar = 1 -> no light... invert:
    inv = nt.nodes.new('ShaderNodeMath')
    inv.operation = 'SUBTRACT'
    inv.inputs[0].default_value = strength
    nt.links.new(mix.outputs[0], inv.inputs[1])
    nt.links.new(inv.outputs[0], p.inputs['Emission Strength'])
    p.inputs['Roughness'].default_value = 0.6
    return m


def wet_mat(name, color, rough=0.12, ripples=False):
    """Wet asphalt / puddles: dark, glossy, with a moving ripple bump when it rains."""
    m = mat(name, color, rough=rough, spec=0.6)
    if ripples:
        nt = m.node_tree
        p = nt.nodes['Principled BSDF']
        n = nt.nodes.new('ShaderNodeTexNoise')
        n.noise_dimensions = '4D'
        n.inputs['Scale'].default_value = 40
        bump = nt.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = 0.15
        nt.links.new(n.outputs['Fac'], bump.inputs['Height'])
        nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
        w = n.inputs['W']
        w.default_value = 0
        w.keyframe_insert('default_value', frame=1)
        w.default_value = 300
        w.keyframe_insert('default_value', frame=3700)
        for fc in nt.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'
    return m


def tree(c, x, y, z=0, h=3.2, green=(0.25, 0.45, 0.2)):
    bark = mat('Bark', (0.3, 0.2, 0.13), rough=0.8)
    leaf = mat(f'Leaf{green}', green, rough=0.7)
    cyl(f'Trunk{x:.0f}_{y:.0f}', c, 0.12, 0.08, h, (x, y, z + h / 2), m=bark, segs=12)
    rnd = random.Random(int(x * 7 + y))
    blobs(f'Crown{x:.0f}_{y:.0f}', c, [(rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6), rnd.uniform(-0.3, 0.6), rnd.uniform(0.6, 0.9)) for _ in range(7)],
          (x, y, z + h + 0.3), m=leaf, res=0.08, thresh=0.6)


def lamp_post(c, x, y, z=0.15, on=True, warm=(1.0, 0.75, 0.45), power=180):
    metal = mat('LampMetal', (0.15, 0.16, 0.18), rough=0.35, metal=0.8)
    cyl(f'Post{x:.1f}{y:.1f}', c, 0.06, 0.05, 4.2, (x, y, z + 2.1), m=metal, segs=12)
    box(f'Arm{x:.1f}{y:.1f}', c, (0.08, 0.9, 0.06), (x, y - 0.42, z + 4.15), m=metal)
    bulb = emissive('LampGlow', (1.0, 0.85, 0.6), 25 if on else 0)
    box(f'Head{x:.1f}{y:.1f}', c, (0.3, 0.45, 0.1), (x, y - 0.85, z + 4.1), m=metal, bevel=0.02)
    box(f'Glow{x:.1f}{y:.1f}', c, (0.24, 0.38, 0.02), (x, y - 0.85, z + 4.04), m=bulb)
    if on:
        light(f'Lamp{x:.1f}{y:.1f}', 'POINT', c, (x, y - 0.85, z + 3.85), energy=power, color=warm, size=0.3)


def building_row(c, x0, x1, y, depth, mats, seed=1, z=0.15, face=-1):
    rnd = random.Random(seed)
    x = x0
    while x < x1:
        w = rnd.uniform(5, 9)
        h = rnd.uniform(7, 16)
        box(f'Bldg{c.name}{x:.0f}', c, (w - 0.3, depth, h), (x + w / 2, y, z + h / 2), m=rnd.choice(mats))
        x += w


# ----------------------------------------------------------------------------------------------
def home():
    c = coll('Set_Home')
    O = HOME
    wall = mat('HomeWall', (0.93, 0.83, 0.68), rough=0.85)
    wall2 = mat('HomeWallAccent', (0.55, 0.72, 0.7), rough=0.85)
    floor = mat('HomeFloor', (0.62, 0.42, 0.26), rough=0.35, coat=0.3)
    wood = mat('Wood', (0.5, 0.3, 0.17), rough=0.45)
    trim = mat('Trim', (0.97, 0.96, 0.93), rough=0.4)
    box('HFloor', c, (8, 7, 0.1), (O, 0, -0.05), m=floor)
    box('HCeil', c, (8, 7, 0.1), (O, 0, 3.05), m=trim)
    # back wall with a window hole (x -2.0..-0.4, z 0.9..2.4)
    box('HBackL', c, (2.0, 0.15, 3), (O - 3.0, 3.0, 1.5), m=wall)
    box('HBackR', c, (4.4, 0.15, 3), (O + 1.8, 3.0, 1.5), m=wall)
    box('HBackB', c, (1.6, 0.15, 0.9), (O - 1.2, 3.0, 0.45), m=wall)
    box('HBackT', c, (1.6, 0.15, 0.6), (O - 1.2, 3.0, 2.7), m=wall)
    box('HSill', c, (1.8, 0.3, 0.06), (O - 1.2, 2.9, 0.9), m=trim)
    for i, x in enumerate((-2.0, -1.2, -0.4)):
        box(f'HMull{i}', c, (0.05, 0.06, 1.5), (O + x, 3.0, 1.65), m=trim)
    box('HMullH', c, (1.6, 0.06, 0.05), (O - 1.2, 3.0, 1.65), m=trim)
    box('HSky', c, (6, 0.1, 4), (O - 1.2, 4.5, 2.0), m=emissive('MorningSky', (1.0, 0.92, 0.75), 4))
    tree(c, O - 1.6, 4.0, -0.4, 2.2, (0.35, 0.55, 0.25))
    box('HLeft', c, (0.15, 7, 3), (O - 4.0, 0, 1.5), m=wall2)
    # right wall with a door gap (y -2.0 .. -0.8)
    box('HRightA', c, (0.15, 3.8, 3), (O + 4.0, 1.1, 1.5), m=wall)
    box('HRightB', c, (0.15, 1.5, 3), (O + 4.0, -2.75, 1.5), m=wall)
    box('HRightT', c, (0.15, 1.2, 0.8), (O + 4.0, -1.4, 2.6), m=wall)
    box('HDoorFrame', c, (0.2, 1.3, 0.08), (O + 4.0, -1.4, 2.2), m=trim)
    door = box('HDoor', c, (0.05, 1.15, 2.15), (O + 4.0, -0.85, 1.08), m=wood, bevel=0.01)
    door['hinge'] = True
    # furniture
    box('Bed', c, (1.6, 2.2, 0.45), (O - 3.0, 1.6, 0.25), m=wood, bevel=0.03)
    box('Mattress', c, (1.5, 2.1, 0.2), (O - 3.0, 1.6, 0.56), m=mat('Sheet', (0.85, 0.9, 0.97), rough=0.8), sub=2)
    box('Blanket', c, (1.55, 1.2, 0.08), (O - 3.0, 1.15, 0.67), m=mat('Blanket', (0.85, 0.45, 0.3), rough=0.9), sub=2)
    box('Pillow', c, (0.7, 0.4, 0.15), (O - 3.0, 2.45, 0.74), m=mat('Sheet', (0, 0, 0)), sub=2)
    box('Table', c, (1.4, 0.7, 0.05), (O + 1.5, 2.45, 0.78), m=wood, bevel=0.01)
    for dx in (-0.62, 0.62):
        for dy in (-0.28, 0.28):
            box(f'TLeg{dx}{dy}', c, (0.05, 0.05, 0.76), (O + 1.5 + dx, 2.45 + dy, 0.38), m=wood)
    box('TableFolder', c, (0.32, 0.24, 0.02), (O + 1.3, 2.35, 0.82), m=mat('Folder', (0.1, 0.35, 0.6)), bevel=0.004)
    box('Laptop', c, (0.36, 0.25, 0.02), (O + 1.85, 2.5, 0.815), m=mat('Alu', (0.75, 0.76, 0.78), rough=0.3, metal=0.8), bevel=0.005)
    cyl('Mug', c, 0.04, 0.04, 0.1, (O + 1.0, 2.55, 0.86), m=mat('Mug', (0.9, 0.35, 0.25), rough=0.3))
    box('Shelf', c, (1.4, 0.25, 0.04), (O + 1.5, 2.85, 1.7), m=wood)
    rnd = random.Random(3)
    x = O + 0.9
    for i in range(10):
        w = rnd.uniform(0.04, 0.08)
        h = rnd.uniform(0.18, 0.28)
        box(f'Book{i}', c, (w, 0.18, h), (x, 2.84, 1.72 + h / 2), m=mat(f'Book{i % 4}', [(0.7, 0.2, 0.2), (0.2, 0.4, 0.7), (0.9, 0.7, 0.2), (0.3, 0.6, 0.4)][i % 4], rough=0.6))
        x += w + 0.01
    # the wall clock (its hands turn toward seven)
    cyl('ClockFace', c, 0.22, 0.22, 0.04, (O + 1.5, 2.92, 2.35), (R(90), 0, 0), m=mat('ClockFace', (0.98, 0.97, 0.94), rough=0.3))
    torus('ClockRim', c, 0.22, 0.02, (O + 1.5, 2.9, 2.35), (R(90), 0, 0), m=mat('ClockRim', (0.2, 0.2, 0.22), rough=0.3, metal=0.6))
    for i in range(12):
        a = 2 * math.pi * i / 12
        box(f'Tick{i}', c, (0.015, 0.01, 0.04 if i % 3 else 0.06), (O + 1.5 + 0.18 * math.sin(a), 2.895, 2.35 + 0.18 * math.cos(a)), (0, -a, 0), m=mat('ClockRim', (0, 0, 0)))
    hands = []
    for n, L, wdt in (('ClockHour', 0.1, 0.018), ('ClockMinute', 0.16, 0.012)):
        e = bpy.data.objects.new(n + 'Pivot', None)
        c.objects.link(e)
        e.location = (O + 1.5, 2.885, 2.35)
        h = box(n, c, (wdt, 0.008, L), (0, 0, L / 2 - 0.02), m=mat('ClockRim', (0, 0, 0)))
        h.parent = e
        hands.append(e)
    rug = cyl('Rug', c, 1.3, 1.3, 0.02, (O + 0.2, 0.3, 0.01), m=mat('Rug', (0.75, 0.3, 0.3), rough=0.95), segs=48)
    rug.scale = (1.3, 0.9, 1)
    pot = cyl('Pot', c, 0.2, 0.15, 0.35, (O + 3.4, 2.5, 0.18), m=mat('Pot', (0.75, 0.42, 0.28), rough=0.6))
    blobs('Plant', c, [(0, 0, 0.3, 0.3), (0.15, 0.1, 0.55, 0.25), (-0.12, -0.05, 0.6, 0.25), (0, 0, 0.85, 0.22)], (O + 3.4, 2.5, 0.3), m=mat('Leaf', (0.25, 0.55, 0.25), rough=0.6), res=0.03)
    for i, (x, col) in enumerate(((-2.9, (0.95, 0.75, 0.3)), (2.6, (0.4, 0.6, 0.85)))):
        box(f'Poster{i}', c, (0.7, 0.03, 0.9), (O + x, 2.9 if x > 0 else 2.9, 1.9), m=mat(f'Poster{i}', col, rough=0.6), bevel=0.01)
    # light: low morning sun through the window + soft fill
    light('HWindowSun', 'AREA', c, (O - 1.2, 3.6, 2.3), (R(-70), 0, 0), energy=900, color=(1.0, 0.85, 0.62), size=1.8)
    light('HFill', 'AREA', c, (O + 0.5, -2.0, 2.8), (R(40), 0, 0), energy=250, color=(0.9, 0.93, 1.0), size=3)
    light('HBounce', 'POINT', c, (O + 2.0, 1.0, 2.5), energy=120, color=(1.0, 0.9, 0.8), size=1)
    return {'door': door, 'hands': hands}


def auto_rickshaw(c, name='Auto'):
    """A three-wheeled auto-rickshaw (green and yellow), built around an empty that drives it."""
    root = bpy.data.objects.new(name, None)
    c.objects.link(root)
    green = mat('AutoGreen', (0.15, 0.5, 0.25), rough=0.25, coat=0.6)
    yellow = mat('AutoYellow', (0.98, 0.78, 0.12), rough=0.25, coat=0.6)
    black = mat('AutoBlack', (0.04, 0.04, 0.04), rough=0.6)
    tyre = mat('Tyre', (0.03, 0.03, 0.03), rough=0.8)
    chrome = mat('Chrome', (0.9, 0.9, 0.9), rough=0.1, metal=1)
    parts = [
        box(f'{name}Floor', c, (2.2, 1.25, 0.14), (0, 0, 0.36), m=green, bevel=0.04),
        box(f'{name}Rear', c, (0.9, 1.3, 0.6), (-0.6, 0, 0.65), m=green, sub=1),
        box(f'{name}Nose', c, (0.4, 0.6, 0.9), (0.95, 0, 0.75), m=green, sub=1),
        box(f'{name}Shield', c, (0.06, 1.1, 0.6), (0.7, 0, 1.45), (0, R(-12), 0), m=mat('Glass', (0.6, 0.7, 0.75), rough=0.05, metal=0.3)),
        box(f'{name}Canopy', c, (1.9, 1.35, 0.12), (-0.15, 0, 1.82), m=yellow, sub=1),
        box(f'{name}CanopyBack', c, (0.12, 1.35, 1.0), (-1.05, 0, 1.3), m=black, sub=1),
        box(f'{name}Seat', c, (0.5, 1.1, 0.12), (-0.55, 0, 0.98), m=black, sub=1),
        box(f'{name}SeatBack', c, (0.12, 1.1, 0.4), (-0.85, 0, 1.2), m=black, sub=1),
        cyl(f'{name}Pole', c, 0.02, 0.02, 0.9, (0.65, 0.62, 1.35), m=chrome, segs=8),
        cyl(f'{name}Pole2', c, 0.02, 0.02, 0.9, (0.65, -0.62, 1.35), m=chrome, segs=8),
        ball(f'{name}Lamp', c, (0.03, 0.09, 0.09), (1.16, 0, 1.0), m=emissive('Headlamp', (1, 0.95, 0.8), 20)),
        box(f'{name}Handle', c, (0.05, 0.6, 0.04), (0.6, 0, 1.25), m=black),
    ]
    for (x, y) in ((1.0, 0), (-0.7, 0.62), (-0.7, -0.62)):
        w = cyl(f'{name}Wheel{x}{y}', c, 0.24, 0.24, 0.14, (x, y, 0.24), (R(90), 0, 0), m=tyre)
        parts.append(w)
    # the driver, simply drawn
    skin = mat('DriverSkin', (0.6, 0.4, 0.28), rough=0.5)
    shirt = mat('DriverShirt', (0.7, 0.6, 0.35), rough=0.8)
    parts += [ball(f'{name}DriverBody', c, (0.18, 0.2, 0.28), (0.25, 0, 1.12), m=shirt),
              ball(f'{name}DriverHead', c, (0.11, 0.11, 0.13), (0.27, 0, 1.5), m=skin),
              ball(f'{name}DriverHair', c, (0.11, 0.11, 0.08), (0.26, 0, 1.58), m=mat('DriverHair', (0.05, 0.04, 0.04)))]
    for p in parts:
        p.parent = root
    light(f'{name}Beam', 'SPOT', c, (1.2, 0, 1.0), (0, R(90), 0), energy=150, color=(1, 0.95, 0.8), size=0.05, spot=50).parent = root
    return root


def bus(c):
    root = bpy.data.objects.new('Bus', None)
    c.objects.link(root)
    body = mat('BusBody', (0.75, 0.2, 0.15), rough=0.3, coat=0.5)
    win = mat('BusWindows', (0.95, 0.9, 0.7), rough=0.1, emit=1.2)
    parts = [box('BusShell', c, (11, 2.5, 2.6), (0, 0, 1.75), m=body, bevel=0.15),
             box('BusWin', c, (9.8, 2.54, 0.8), (-0.3, 0, 2.3), m=win),
             box('BusWinF', c, (0.04, 2.2, 1.1), (5.5, 0, 2.1), m=mat('Glass', (0, 0, 0))),
             box('BusStripe', c, (11.02, 2.52, 0.12), (0, 0, 1.35), m=mat('BusStripe', (0.98, 0.85, 0.3)))]
    for x in (-3.6, 3.6):
        for y in (-1.15, 1.15):
            parts.append(cyl(f'BusWheel{x}{y}', c, 0.5, 0.5, 0.3, (x, y, 0.5), (R(90), 0, 0), m=mat('Tyre', (0, 0, 0))))
    for p in parts:
        p.parent = root
    for y in (-0.8, 0.8):
        l = light(f'BusHead{y}', 'SPOT', c, (5.55, y, 0.9), (0, R(90), 0), energy=250, color=(1, 0.95, 0.85), size=0.1, spot=45)
        l.parent = root
    return root


def rain(c, center, size, count=9000, speed=9.0, name='Rain'):
    """Falling rain as geometry nodes: points at random places, falling and wrapping round (no simulation cache)."""
    me = bpy.data.meshes.new(name)
    o = bpy.data.objects.new(name, me)
    c.objects.link(o)
    o.location = center
    ng = bpy.data.node_groups.new(name + 'Nodes', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes
    L = ng.links
    gout = N.new('NodeGroupOutput')
    pts = N.new('GeometryNodePoints')
    pts.inputs['Count'].default_value = count
    rv = N.new('FunctionNodeRandomValue')
    rv.data_type = 'FLOAT_VECTOR'
    sx, sy, sz = size
    rv.inputs['Min'].default_value = (-sx / 2, -sy / 2, 0)
    rv.inputs['Max'].default_value = (sx / 2, sy / 2, sz)
    L.new(rv.outputs['Value'], pts.inputs['Position'])
    st = N.new('GeometryNodeInputSceneTime')
    pos = N.new('GeometryNodeInputPosition')
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(pos.outputs['Position'], sep.inputs['Vector'])
    mul = N.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = speed
    L.new(st.outputs['Seconds'], mul.inputs[0])
    sub = N.new('ShaderNodeMath')
    sub.operation = 'SUBTRACT'
    L.new(sep.outputs['Z'], sub.inputs[0])
    L.new(mul.outputs[0], sub.inputs[1])
    mod = N.new('ShaderNodeMath')
    mod.operation = 'FLOORED_MODULO'
    mod.inputs[1].default_value = sz
    L.new(sub.outputs[0], mod.inputs[0])
    comb = N.new('ShaderNodeCombineXYZ')
    L.new(sep.outputs['X'], comb.inputs['X'])
    L.new(sep.outputs['Y'], comb.inputs['Y'])
    L.new(mod.outputs[0], comb.inputs['Z'])
    setp = N.new('GeometryNodeSetPosition')
    L.new(pts.outputs['Points'], setp.inputs['Geometry'])
    L.new(comb.outputs['Vector'], setp.inputs['Position'])
    drop = N.new('GeometryNodeMeshCylinder')
    drop.inputs['Vertices'].default_value = 5
    drop.inputs['Radius'].default_value = 0.003
    drop.inputs['Depth'].default_value = 0.32
    inst = N.new('GeometryNodeInstanceOnPoints')
    L.new(setp.outputs['Geometry'], inst.inputs['Points'])
    L.new(drop.outputs['Mesh'], inst.inputs['Instance'])
    sm = N.new('GeometryNodeSetMaterial')
    sm.inputs['Material'].default_value = mat('RainDrop', (0.7, 0.75, 0.85), rough=0.05, emit=0.18, emit_color=(0.75, 0.8, 0.9))
    L.new(inst.outputs['Instances'], sm.inputs['Geometry'])
    L.new(sm.outputs['Geometry'], gout.inputs['Geometry'])
    mdf = o.modifiers.new('Rain', 'NODES')
    mdf.node_group = ng
    return o


def busstop():
    c = coll('Set_BusStop')
    O = BUS
    asphalt = wet_mat('WetAsphalt', (0.16, 0.17, 0.19), rough=0.18, ripples=True)
    puddle = wet_mat('Puddle', (0.08, 0.09, 0.11), rough=0.02, ripples=True)
    pave = wet_mat('WetPavement', (0.42, 0.42, 0.44), rough=0.25)
    curb = mat('Curb', (0.6, 0.6, 0.6), rough=0.4)
    box('Road', c, (90, 12, 0.1), (O, -2.5, -0.05), m=asphalt)
    for i in range(-9, 10):
        box(f'Lane{i}', c, (2.0, 0.12, 0.012), (O + i * 4.5, -1.6, 0.005), m=mat('LaneWhite', (0.85, 0.85, 0.8), rough=0.3))
    box('Sidewalk', c, (90, 5, 0.15), (O, 4.5, 0.075), m=pave)
    box('CurbStone', c, (90, 0.2, 0.17), (O, 2.0, 0.085), m=curb)
    box('FarWalk', c, (90, 4, 0.15), (O, -10, 0.075), m=pave)
    rnd = random.Random(5)
    for i in range(14):
        x = O + rnd.uniform(-25, 25)
        y = rnd.choice([rnd.uniform(-7, 1.5), rnd.uniform(2.5, 6.5)])
        z = 0.152 if y > 2 else 0.002
        p = cyl(f'Puddle{i}', c, 1, 1, 0.004, (x, y, z), m=puddle, segs=24)
        p.scale = (rnd.uniform(0.5, 1.4), rnd.uniform(0.35, 0.8), 1)
    # the shelter
    steel = mat('ShelterSteel', (0.3, 0.42, 0.5), rough=0.3, metal=0.7)
    glass = mat('ShelterGlass', (0.55, 0.65, 0.7), rough=0.05, metal=0.2)
    for x in (-1.7, 1.7):
        for y in (4.3, 5.9):
            cyl(f'SPost{x}{y}', c, 0.05, 0.05, 2.6, (O + x, y, 1.45), m=steel, segs=10)
    box('SRoof', c, (3.8, 2.2, 0.1), (O, 5.05, 2.8), (R(-4), 0, 0), m=steel, bevel=0.02)
    box('SBack', c, (3.4, 0.04, 1.8), (O, 5.9, 1.25), m=glass)
    box('SAd', c, (1.2, 0.05, 1.7), (O + 1.15, 5.88, 1.25), m=emissive('AdPanel', (0.65, 0.85, 1.0), 1.5))
    box('SBench', c, (2.6, 0.48, 0.06), (O - 0.3, 5.32, 0.62), m=mat('BenchWood', (0.55, 0.35, 0.2), rough=0.5), bevel=0.01)
    box('SBenchBack', c, (2.6, 0.05, 0.4), (O - 0.3, 5.6, 0.95), m=mat('BenchWood', (0, 0, 0)), bevel=0.01)
    for x in (-1.4, 0.8):
        box(f'SBenchLeg{x}', c, (0.06, 0.4, 0.47), (O + x, 5.32, 0.38), m=steel)
    cyl('BenchStick', c, 0.013, 0.013, 0.86, (O - 1.75, 5.15, 0.6), (R(8), R(-14), 0), m=mat('StickWood', (0, 0, 0)))
    cyl('SSignPole', c, 0.04, 0.04, 2.9, (O + 2.5, 4.0, 1.6), m=steel, segs=8)
    cyl('SSign', c, 0.3, 0.3, 0.04, (O + 2.5, 4.0, 3.0), (R(90), 0, 0), m=mat('SignBlue', (0.15, 0.35, 0.75), rough=0.4))
    for x in (-14, -4, 6, 16):
        lamp_post(c, O + x, 2.4, 0.15, True, power=220)
    # city behind
    facades = [window_grid_mat(f'FacadeRain{i}', w, (1.0, 0.8, 0.5), d, 5 + i, 2.5)
               for i, (w, d) in enumerate([((0.45, 0.45, 0.5), (0.2, 0.22, 0.27)), ((0.55, 0.5, 0.45), (0.25, 0.25, 0.28)), ((0.4, 0.45, 0.5), (0.18, 0.2, 0.24))])]
    building_row(c, O - 45, O + 45, 10.5, 5, facades, 2)
    building_row(c, O - 45, O + 45, -15, 5, facades, 3, z=0.15)
    for x in (-9, 9, 21):
        tree(c, O + x, 7.2, 0.15, 3.4, (0.2, 0.38, 0.2))
    rain(c, (O, 2.5, 0), (34, 20, 9), count=14000, speed=10)
    auto = auto_rickshaw(c)
    b = bus(c)
    light('BFill', 'AREA', c, (O, -3, 6), (R(25), 0, 0), energy=1600, color=(0.65, 0.75, 0.95), size=12)
    light('BShelterTube', 'AREA', c, (O, 5.05, 2.72), (0, 0, 0), energy=120, color=(0.85, 0.95, 1.0), size=2.5)
    light('BRim', 'AREA', c, (O + 2, 9, 4), (R(-60), 0, R(180)), energy=500, color=(0.7, 0.8, 1.0), size=6)
    return {'auto': auto, 'bus': b}


def office():
    c = coll('Set_Office')
    O = OFFICE
    floor = mat('OfficeFloor', (0.55, 0.5, 0.46), rough=0.25, coat=0.5)
    wall = mat('OfficeWall', (0.86, 0.87, 0.88), rough=0.8)
    accent = mat('OfficeAccent', (0.22, 0.32, 0.42), rough=0.8)
    wood = mat('DeskWood', (0.38, 0.24, 0.15), rough=0.35, coat=0.4)
    box('OFloor', c, (8, 7.5, 0.1), (O, 0.25, -0.05), m=floor)
    box('OCeil', c, (8, 7.5, 0.1), (O, 0.25, 3.05), m=mat('OfficeCeil', (0.95, 0.95, 0.95)))
    box('OBackLow', c, (8, 0.15, 0.7), (O, 3.6, 0.35), m=wall)
    box('OBackHigh', c, (8, 0.15, 0.3), (O, 3.6, 2.9), m=wall)
    for x in (-3.0, -1.0, 1.0, 3.0):
        box(f'OMull{x}', c, (0.08, 0.12, 2.1), (O + x, 3.6, 1.75), m=accent)
    box('OCity', c, (40, 0.1, 18), (O, 18, 6), m=emissive('CityDay', (0.75, 0.85, 0.95), 1.6))
    facades = [window_grid_mat(f'FacadeDay{i}', w, (0.7, 0.8, 0.9), d, 4 + i, 0.4) for i, (w, d) in
               enumerate([((0.8, 0.8, 0.82), (0.4, 0.5, 0.6)), ((0.7, 0.72, 0.75), (0.35, 0.45, 0.55))])]
    building_row(c, O - 20, O + 20, 14, 4, facades, 7, z=-12)
    box('OLeftA', c, (0.15, 4.6, 3), (O - 4.0, 1.55, 1.5), m=wall)
    box('OLeftB', c, (0.15, 1.6, 3), (O - 4.0, -2.8, 1.5), m=wall)
    box('OLeftT', c, (0.15, 1.3, 0.8), (O - 4.0, -1.35, 2.6), m=wall)
    door = box('ODoor', c, (0.05, 1.2, 2.15), (O - 4.0, -0.75, 1.08), m=wood, bevel=0.01)
    box('ORight', c, (0.15, 7.5, 3), (O + 4.0, 0.25, 1.5), m=accent)
    box('Desk', c, (2.0, 0.9, 0.06), (O, 1.25, 0.76), m=wood, bevel=0.015)
    box('DeskFront', c, (1.9, 0.05, 0.7), (O, 0.83, 0.38), m=wood)
    for x in (-0.95, 0.95):
        box(f'DeskSide{x}', c, (0.06, 0.85, 0.74), (O + x, 1.25, 0.37), m=wood)
    box('OLaptop', c, (0.36, 0.25, 0.02), (O - 0.45, 1.25, 0.8), m=mat('Alu', (0, 0, 0)), bevel=0.005)
    box('OLaptopLid', c, (0.36, 0.02, 0.24), (O - 0.45, 1.38, 0.92), (R(-12), 0, 0), m=mat('Alu', (0, 0, 0)), bevel=0.005)
    box('OPapers', c, (0.22, 0.3, 0.02), (O + 0.1, 1.1, 0.8), (0, 0, R(8)), m=mat('Paper', (0.96, 0.96, 0.94), rough=0.7))
    cyl('OPenCup', c, 0.04, 0.04, 0.1, (O + 0.75, 1.45, 0.84), m=mat('Mug', (0, 0, 0)))
    frame = box('DeskFrame', c, (0.2, 0.025, 0.25), (O + 0.55, 1.3, 0.92), (R(-12), 0, R(180 + 25)), m=mat('FrameWood', (0.35, 0.2, 0.1), rough=0.4), bevel=0.008)
    chair = mat('ChairBlack', (0.08, 0.08, 0.09), rough=0.5)
    box('BossSeat', c, (0.55, 0.5, 0.1), (O, 1.95, 0.5), m=chair, sub=1)
    box('BossBack', c, (0.55, 0.1, 0.8), (O, 2.25, 0.95), m=chair, sub=1)
    cyl('BossStem', c, 0.03, 0.03, 0.4, (O, 1.95, 0.25), m=mat('Steel', (0, 0, 0)))
    for x in (-0.8, 0.8):
        box(f'GuestSeat{x}', c, (0.5, 0.48, 0.08), (O + x, 0.1, 0.46), m=accent, sub=1)
        box(f'GuestBack{x}', c, (0.5, 0.08, 0.5), (O + x, -0.16, 0.75), m=accent, sub=1)
        for dx in (-0.2, 0.2):
            for dy in (-0.18, 0.18):
                cyl(f'GuestLeg{x}{dx}{dy}', c, 0.015, 0.015, 0.44, (O + x + dx, 0.1 + dy, 0.22), m=mat('Steel', (0, 0, 0)), segs=8)
    box('OShelf', c, (0.4, 2.4, 1.9), (O + 3.7, 2.2, 0.95), m=wood)
    rnd = random.Random(9)
    for i in range(18):
        box(f'OBook{i}', c, (0.25, rnd.uniform(0.05, 0.09), rnd.uniform(0.22, 0.3)), (O + 3.55, 1.2 + i * 0.11, 0.5 + 0.6 * (i % 3) + 0.14),
            m=mat(f'Book{i % 4}', (0, 0, 0)))
    pot = cyl('OPot', c, 0.22, 0.17, 0.4, (O - 3.4, 2.9, 0.2), m=mat('OPot', (0.9, 0.9, 0.88), rough=0.4))
    blobs('OPlant', c, [(0, 0, 0.35, 0.35), (0.15, 0.1, 0.7, 0.28), (-0.12, -0.05, 0.75, 0.28), (0, 0, 1.05, 0.25)], (O - 3.4, 2.9, 0.35), m=mat('Leaf', (0, 0, 0)), res=0.03)
    for i, x in enumerate((-2.5, 2.5)):
        box(f'OArt{i}', c, (0.03, 1.0, 0.7), (O - 3.9, 1.7, 1.8), m=mat(f'Art{i}', (0.85, 0.6, 0.3), rough=0.5)) if i == 0 else None
    light('OWindow', 'AREA', c, (O, 4.5, 1.8), (R(-90), 0, 0), energy=1500, color=(0.95, 0.97, 1.0), size=6)
    light('OCeiling1', 'AREA', c, (O, 0.5, 2.95), (0, 0, 0), energy=500, color=(1.0, 0.96, 0.9), size=2)
    light('OCeiling2', 'AREA', c, (O - 2.2, -1.2, 2.95), (0, 0, 0), energy=250, color=(1.0, 0.96, 0.9), size=1.5)
    return {'door': door, 'frame': frame}


def street():
    c = coll('Set_EveningStreet')
    O = STREET
    asphalt = wet_mat('WetAsphaltEve', (0.12, 0.12, 0.14), rough=0.12)
    puddle = wet_mat('PuddleEve', (0.05, 0.05, 0.07), rough=0.01)
    pave = wet_mat('WetPavementEve', (0.36, 0.35, 0.36), rough=0.18)
    box('ERoad', c, (90, 12, 0.1), (O, -2.5, -0.05), m=asphalt)
    box('ESidewalk', c, (90, 6, 0.15), (O, 5.0, 0.075), m=pave)
    box('ECurb', c, (90, 0.2, 0.17), (O, 2.0, 0.085), m=mat('Curb', (0, 0, 0)))
    for i in range(-9, 10):
        box(f'ELane{i}', c, (2.0, 0.12, 0.012), (O + i * 4.5, -1.6, 0.005), m=mat('LaneWhite', (0, 0, 0)))
    rnd = random.Random(11)
    for i in range(16):
        x = O + rnd.uniform(-12, 22)
        y = rnd.choice([rnd.uniform(-4, 1.5), rnd.uniform(2.6, 4.6)])
        p = cyl(f'EPuddle{i}', c, 1, 1, 0.004, (x, y, 0.152 if y > 2 else 0.002), m=puddle, segs=24)
        p.scale = (rnd.uniform(0.5, 1.5), rnd.uniform(0.35, 0.8), 1)
    shops = [(1.0, 0.65, 0.3), (1.0, 0.8, 0.5), (0.95, 0.55, 0.35), (1.0, 0.75, 0.4)]
    x = O - 20
    i = 0
    while x < O + 35:
        w = rnd.uniform(5, 8)
        h = rnd.uniform(6, 11)
        col = [(0.55, 0.45, 0.42), (0.48, 0.5, 0.55), (0.6, 0.52, 0.4)][i % 3]
        box(f'EBldg{i}', c, (w - 0.3, 5, h), (x + w / 2, 10.5, 0.15 + h / 2), m=mat(f'EBldg{i % 3}', col, rough=0.8))
        box(f'EShop{i}', c, (w - 1.2, 0.1, 2.2), (x + w / 2, 7.95, 1.35), m=emissive(f'EShop{i % 4}', shops[i % 4], 3.5))
        box(f'EAwning{i}', c, (w - 0.8, 1.0, 0.08), (x + w / 2, 7.5, 2.7), (R(12), 0, 0), m=mat(f'EAwning{i % 3}', [(0.7, 0.2, 0.2), (0.2, 0.4, 0.5), (0.85, 0.6, 0.2)][i % 3], rough=0.7))
        for k in range(int(h // 2.6) - 1):
            for j in range(int(w // 1.8)):
                if rnd.random() < 0.6:
                    box(f'EWin{i}_{k}_{j}', c, (0.8, 0.05, 1.1), (x + 0.9 + j * 1.8, 7.97, 4.2 + k * 2.6), m=emissive(f'EWin{(i + k + j) % 3}', [(1.0, 0.8, 0.5), (1.0, 0.9, 0.7), (0.9, 0.7, 0.45)][(i + k + j) % 3], 4))
        x += w
        i += 1
    building_row(c, O - 40, O + 40, -16, 5, [window_grid_mat('FacadeEve', (0.25, 0.25, 0.3), (1.0, 0.75, 0.45), (0.12, 0.12, 0.16), 6, 3)], 4, z=0.15)
    for x in (-8, 0, 8, 16, 24):
        lamp_post(c, O + x, 2.5, 0.15, True, power=450)
    for x in (-4, 12):
        tree(c, O + x, 6.6, 0.15, 3.2, (0.16, 0.3, 0.18))
    light('EMoonFill', 'AREA', c, (O + 4, -4, 8), (R(30), 0, 0), energy=600, color=(0.45, 0.55, 0.95), size=14)
    return {}


def insert_table():
    c = coll('Set_PhotoInsert')
    O = INSERT
    box('ITable', c, (2, 1.2, 0.06), (O, 0.2, 0.76), m=mat('DeskWood', (0, 0, 0)))
    box('IWall', c, (4, 0.1, 3), (O, 1.6, 1.5), m=mat('IWall', (0.75, 0.68, 0.6), rough=0.8))
    frame = box('IFrame', c, (0.2, 0.025, 0.25), (O, 0.1, 0.92), (R(-8), 0, 0), m=mat('FrameWood', (0, 0, 0)), bevel=0.008)
    photo = box('IPhoto', c, (0.165, 0.004, 0.205), (O, 0.086, 0.922), (R(-8), 0, 0), m=mat('PhotoPrint', (0, 0, 0)))
    box('IPapers', c, (0.3, 0.22, 0.02), (O - 0.35, 0.0, 0.8), (0, 0, R(-10)), m=mat('Paper', (0, 0, 0)))
    light('IKey', 'AREA', c, (O - 0.6, -0.8, 1.6), (R(55), 0, R(-35)), energy=60, color=(1, 0.9, 0.78), size=0.8)
    light('IFill', 'AREA', c, (O + 0.8, -0.6, 1.2), (R(65), 0, R(50)), energy=20, color=(0.85, 0.9, 1.0), size=1)
    return {'photo': photo}


def studio():
    c = coll('Set_PortraitStudio')
    O = STUDIO
    box('StBack', c, (4, 0.1, 3), (O, 1.2, 1.5), m=mat('StudioBack', (0.85, 0.7, 0.5), rough=0.9))
    box('StFloor', c, (4, 4, 0.1), (O, 0, -0.05), m=mat('StudioFloor', (0.6, 0.5, 0.4), rough=0.9))
    tree(c, O + 1.4, 0.9, 0, 2.2, (0.3, 0.55, 0.25))
    light('StKey', 'AREA', c, (O - 1.2, -2.2, 2.4), (R(55), 0, R(-25)), energy=500, color=(1, 0.92, 0.82), size=2)
    light('StFill', 'AREA', c, (O + 1.5, -2, 1.8), (R(65), 0, R(40)), energy=200, color=(0.9, 0.93, 1.0), size=2)
    return {}
