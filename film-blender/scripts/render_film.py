"""Renders the film from stranger_film.blend.

    Blender -b stranger_film.blend --python scripts/render_film.py -- stills  [scale%]   one still per shot (check)
    Blender -b stranger_film.blend --python scripts/render_film.py -- frames  [scale%] [first] [last]
    Blender -b --python scripts/render_film.py -- encode                       frames -> output/*.mp4

Frames go to renders/frames/NNNN.png and are skipped when already there, so a stopped render resumes.
The portrait in the office photo frame is rendered first (frame 0) from the same characters.
"""
import os
import sys
import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['stills']
mode = args[0]
sc = bpy.context.scene


def portrait():
    path = os.path.join(ROOT, 'renders', 'portrait.png')
    if not os.path.exists(path):
        keep = (sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage)
        sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 640, 800, 100
        sc.camera = bpy.data.objects['PortraitCam']
        sc.frame_set(0)
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = keep
    bpy.data.images['Portrait'].filepath = path
    bpy.data.images['Portrait'].reload()


if mode in ('stills', 'frames'):
    sc.render.resolution_percentage = int(args[1]) if len(args) > 1 else 50
    sc.render.image_settings.file_format = 'PNG'
    portrait()
if mode == 'stills':
    out = os.path.join(ROOT, 'renders', 'stills')
    os.makedirs(out, exist_ok=True)
    marks = sorted([m for m in sc.timeline_markers if m.frame > 0], key=lambda m: m.frame)
    ends = [m.frame for m in marks[1:]] + [sc.frame_end]
    only = set(args[2].split(',')) if len(args) > 2 else None
    for m, e in zip(marks, ends):
        if only and m.name.split('_')[0] not in only:
            continue
        f = m.frame + int((e - m.frame) * 0.6)
        sc.frame_set(f)
        sc.camera = m.camera
        sc.render.filepath = os.path.join(out, f'{m.name}.png')
        bpy.ops.render.render(write_still=True)
        print('STILL', m.name, f, flush=True)
elif mode == 'frames':
    out = os.path.join(ROOT, 'renders', 'frames')
    os.makedirs(out, exist_ok=True)
    sc.frame_start = int(args[2]) if len(args) > 2 else 1
    sc.frame_end = int(args[3]) if len(args) > 3 else sc.frame_end
    sc.render.filepath = os.path.join(out, '')
    sc.render.use_overwrite = False
    sc.render.use_placeholder = True
    bpy.ops.render.render(animation=True)
elif mode == 'encode':
    frames = sorted(f for f in os.listdir(os.path.join(ROOT, 'renders', 'frames')) if f.endswith('.png'))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.fps = 24
    first = os.path.join(ROOT, 'renders', 'frames', frames[0])
    img = bpy.data.images.load(first)
    s.render.resolution_x, s.render.resolution_y = img.size
    s.render.resolution_percentage = 100
    s.sequence_editor_create()
    strip = s.sequence_editor.sequences.new_image('Film', first, 1, 1)
    for f in frames[1:]:
        strip.elements.append(f)
    s.frame_start, s.frame_end = 1, len(frames)
    s.view_settings.view_transform = 'Standard'
    r = s.render
    r.image_settings.file_format = 'FFMPEG'
    r.ffmpeg.format = 'MPEG4'
    r.ffmpeg.codec = 'H264'
    r.ffmpeg.constant_rate_factor = 'HIGH'
    r.ffmpeg.ffmpeg_preset = 'GOOD'
    name = args[1] if len(args) > 1 else 'the_stranger_who_changed_everything.mp4'
    r.filepath = os.path.join(ROOT, 'output', name)
    bpy.ops.render.render(animation=True)
    print('ENCODED', r.filepath, len(frames), 'frames')
