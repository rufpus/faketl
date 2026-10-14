"""Regenerate the geometric FTL monogram PNGs. Dev tool: requires Pillow only.

The extension uses the committed PNGs; no Python/Pillow is needed to install it.
Coordinates and colours mirror icons/ftl.svg; no font files or remote assets.
"""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
scale = 8
canvas = Image.new('RGBA', (128 * scale, 128 * scale))
draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((4*scale, 4*scale, 124*scale, 124*scale), radius=28*scale, fill='#eeebf4')
paths = [((24, 85), (24, 43), (43, 43)), ((24, 63), (39, 63)),
         ((54, 43), (76, 43)), ((65, 43), (65, 85)), ((88, 43), (88, 85), (106, 85))]
for points in paths:
    draw.line([(x*scale, y*scale) for x, y in points], fill='#385e5b', width=8*scale, joint='curve')
    for x, y in points:
        draw.ellipse(((x-4)*scale, (y-4)*scale, (x+4)*scale, (y+4)*scale), fill='#385e5b')
for size in (16, 32, 48, 128):
    filename = root / 'icons' / f'icon{size}.png'
    canvas.resize((size, size), Image.Resampling.LANCZOS).save(filename, optimize=True)
    print(filename.name, f'{size}x{size}')
