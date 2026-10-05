# Crta ikonicu Agent Deska: public/icon-*.png za telefon i launcher/AppIcon.icns za Mac.
#   python3 launcher/icon.py
import os, shutil, subprocess, tempfile
from PIL import Image, ImageDraw

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def draw(size, inset):
    s = 4  # crta se veće pa umanjuje, zbog glatkih ivica
    n = size * s
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(n * inset)
    box = n - 2 * pad
    d.rounded_rectangle([pad, pad, n - pad, n - pad], radius=int(box * 0.225), fill=(12, 12, 14, 255))
    # tri tačke, bez oblačića: po jedna za svakog agenta
    r, cy, gap = box * 0.085, n / 2, box * 0.24
    for i, color in enumerate([(217, 119, 87), (236, 236, 236), (122, 167, 255)]):
        cx = n / 2 + (i - 1) * gap
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (255,))
    return img.resize((size, size), Image.LANCZOS)

def badge(size=96):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r, gap = size * 0.11, size * 0.28
    for i in range(3):
        cx = size / 2 + (i - 1) * gap
        d.ellipse([cx - r, size / 2 - r, cx + r, size / 2 + r], fill=(255, 255, 255, 255))
    return img

for name, size in [('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180)]:
    draw(size, 0).save(os.path.join(root, 'public', name))
badge().save(os.path.join(root, 'public', 'badge-96.png'))

# macOS ikonice imaju providnu ivicu oko zaobljenog kvadrata
with tempfile.TemporaryDirectory() as tmp:
    iconset = os.path.join(tmp, 'AppIcon.iconset')
    os.mkdir(iconset)
    for base in [16, 32, 128, 256, 512]:
        for scale in [1, 2]:
            suffix = '' if scale == 1 else '@2x'
            draw(base * scale, 0.1).save(os.path.join(iconset, f'icon_{base}x{base}{suffix}.png'))
    subprocess.run(['iconutil', '-c', 'icns', iconset, '-o', os.path.join(root, 'launcher', 'AppIcon.icns')], check=True)
