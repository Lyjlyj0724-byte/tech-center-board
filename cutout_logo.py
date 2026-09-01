"""把 public/logo.png 的白底抠成透明，并自动裁边。"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent
src = ROOT / 'public' / 'logo.png'

img = Image.open(src).convert('RGBA')
w, h = img.size
px = img.load()

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        # 用最小通道值衡量"离白色有多远"：纯白 -> 0（全透明），深色 -> 高（不透明）
        t = 255 - min(r, g, b)
        if t < 12:
            alpha = 0
        else:
            alpha = min(255, int(t * 1.45))
        px[x, y] = (r, g, b, min(a, alpha))

# 按透明区域自动裁边，四周留 2px
bbox = img.getbbox()
if bbox:
    l, t_, r_, b_ = bbox
    l = max(0, l - 2); t_ = max(0, t_ - 2)
    r_ = min(w, r_ + 2); b_ = min(h, b_ + 2)
    img = img.crop((l, t_, r_, b_))

img.save(src)
print('saved', src, img.size)
