import sys, os, math, bpy
sys.path.insert(0, os.path.dirname(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
from kit import *
import chars
sc = bpy.context.scene
A = chars.build('Arjun', chars.ARJUN, (-0.75, 0, 0))
Rv = chars.build('Ravi', chars.RAVI, (0, 0, 0))
I = chars.build('Int', chars.INTERVIEWER, (0.75, 0, 0))
c = coll('Test')
box('Floor', c, (10, 10, 0.1), (0, 0, -0.05), m=mat('Floor', (0.6, 0.55, 0.5)))
box('Back', c, (10, 0.1, 5), (0, 2, 2.5), m=mat('Wall', (0.7, 0.75, 0.8)))
for (n, e, loc, rot) in [('Key', 600, (-2, -3, 3.5), (math.radians(55), 0, math.radians(-30))), ('Fill', 200, (3, -2, 2), (math.radians(70), 0, math.radians(50)))]:
    l = bpy.data.lights.new(n, 'AREA'); l.energy = e; l.size = 2; o = bpy.data.objects.new(n, l); c.objects.link(o); o.location = loc; o.rotation_euler = rot
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.6, 0.75, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); c.objects.link(cam); sc.camera = cam
sc.view_settings.view_transform='AgX'; sc.view_settings.look='AgX - Punchy'
for view in ('full','face'):
  if view == 'face':
    cam.location = (0, -1.3, 1.6); cam.data.lens = 50; cam.rotation_euler = (math.radians(90), 0, 0)
  else:
    cam.location = (0, -4.2, 1.1); cam.data.lens = 35; cam.rotation_euler = (math.radians(88), 0, 0)
for a in (A, Rv, I):
    a.mouth.data.shape_keys.key_blocks['smile'].value = 0.8
sc.render.engine = 'BLENDER_EEVEE_NEXT'; sc.eevee.taa_render_samples = 16
sc.render.resolution_x, sc.render.resolution_y = 960, 540
for view in ('full','face'):
  if view=='face': cam.location=(0,-1.5,1.62); cam.data.lens=40; cam.rotation_euler=(math.radians(90),0,0)
  else: cam.location=(0,-4.2,1.1); cam.data.lens=35; cam.rotation_euler=(math.radians(88),0,0)
  sc.render.filepath = os.path.join(os.path.dirname(__file__), '..', 'renders', f'test_{view}.png')
  bpy.ops.render.render(write_still=True)

