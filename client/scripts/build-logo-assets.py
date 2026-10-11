#!/usr/bin/env python3
"""
Derive the brand logo assets from the source artwork.

Usage:
    /tmp/logoenv/bin/pip install Pillow      # Pillow is not a project dependency
    python3 scripts/build-logo-assets.py \
        ~/Downloads/ellicott-logo.png \
        ~/Downloads/ellicott-logo-png-removebg-preview.png

Writes into public/images/:
    logo-full.png          full lockup, 480px wide  (footer + auth)
    logo-mark.png          graphic only, 84px tall  (navbar)
    favicon.png            512x512 mark on a transparent square
    apple-touch-icon.png   180x180 mark on a transparent square

TWO SOURCES, ON PURPOSE
-----------------------
The artwork has a white studio background baked in, so every extraction is a
guess. Different tools fail in different ways, so each asset uses whichever
method suits it:

* `logo-full.png` (flood fill) — a global white->transparent pass would punch
  holes through the car's white paint highlights, windscreen and the light
  swoosh. Flooding inward from the border only clears pixels genuinely
  connected to the outside, so interior whites survive. 0% holes on every
  solid body panel.

* `logo-mark.png` (remove.bg + repair) — the remove.bg export has the cleanest
  outer edge of the two, but it classifies the windscreen glass and the light
  body highlights as background and deletes them (64% of the windscreen goes
  transparent). `repair_interior_holes()` puts those pixels back from the
  source, keeping remove.bg's edge and restoring the car. It works because the
  two files are pixel-aligned: hole pixels are exactly the ones that are
  transparent AND unreachable from the border.

WHY THE WHITE PLATE IS NOT OPTIONAL
-----------------------------------
The wordmark is dark navy and the car is near-black. Measured against the
navbar band (brand-800 #084274) the artwork sits at 1.11:1 for the wordmark and
plane and 1.68:1 for the car body — effectively invisible. On a white plate the
same pixels measure 9:1 to 17:1. So the "transparent" logo still needs a light
surface behind it. See AGENTS.md.
"""

import os
import sys
from collections import deque

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'public', 'images'))

# Content bounds and the ink gap above the wordmark, in artwork coordinates.
# Re-measure if the artwork is replaced.
FULL_BOX = (47, 24, 577, 369)
MARK_BOX = (47, 24, 577, 249)

# Export sizes, 3x for retina. These track the CSS:
#   navbar  <img className="h-7 w-auto">      -> 28px tall  -> 84
#   footer  <img className="w-40">            -> 160px wide -> 480
#   auth    <img className="w-36">            -> 144px wide -> covered by 480
MARK_H, FULL_W, FAVICON, APPLE = 84, 480, 512, 180


def make_transparent(img, tol=238):
    """Clear the near-white background by flooding in from the border."""
    img = img.convert('RGBA')
    px = img.load()
    W, H = img.size
    seen = [[False] * W for _ in range(H)]
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        if r < tol or g < tol or b < tol:
            continue  # a real pixel — stop, keep it
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and not seen[ny][nx]:
                seen[ny][nx] = True
                q.append((nx, ny))
    return img


def repair_interior_holes(art, source):
    """Restore pixels a background remover wrongly deleted.

    Floods the transparent region inward from the border. Whatever the flood
    reaches is real background; whatever is transparent and NOT reached is an
    interior hole (the windscreen, the paint highlights) and is restored from
    the pixel-aligned source. Returns the number of pixels repaired.
    """
    if art.size != source.size:
        sys.exit(f'sources must be pixel-aligned: {art.size} vs {source.size}')
    px, sp = art.load(), source.load()
    W, H = art.size
    seen = bytearray(W * H)
    q = deque()

    def push(x, y):
        i = y * W + x
        if not seen[i] and px[x, y][3] == 0:
            seen[i] = 1
            q.append((x, y))

    for x in range(W):
        push(x, 0)
        push(x, H - 1)
    for y in range(H):
        push(0, y)
        push(W - 1, y)
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H:
                push(nx, ny)

    filled = 0
    for y in range(H):
        for x in range(W):
            if not seen[y * W + x] and px[x, y][3] == 0:
                px[x, y] = (*sp[x, y], 255)
                filled += 1
    return filled


def trim(img, pad=6):
    bbox = img.getchannel('A').getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    W, H = img.size
    return img.crop((max(0, l - pad), max(0, t - pad), min(W, r + pad), min(H, b + pad)))


def fit(img, width=None, height=None):
    """Resize to the given target, preserving aspect."""
    W, H = img.size
    if height:
        w = max(1, round(W * height / H))
        return img.resize((w, height), Image.LANCZOS)
    h = max(1, round(H * width / W))
    return img.resize((width, h), Image.LANCZOS)


def on_square(mark, size, pad_ratio=0.10):
    pad = int(size * pad_ratio)
    scale = (size - pad * 2) / max(mark.size)
    nm = mark.resize((max(1, round(mark.size[0] * scale)),
                      max(1, round(mark.size[1] * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(nm, ((size - nm.size[0]) // 2, (size - nm.size[1]) // 2), nm)
    return canvas


def report(path):
    im = Image.open(path)
    print(f'  {os.path.basename(path):<22}{str(im.size):<12}{os.path.getsize(path)//1024:>5} KB')


def main():
    home = os.path.expanduser('~')
    src_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(home, 'Downloads/ellicott-logo.png')
    rb_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        home, 'Downloads/ellicott-logo-png-removebg-preview.png')
    for p in (src_path, rb_path):
        if not os.path.exists(p):
            sys.exit(f'source not found: {p}')
    os.makedirs(OUT, exist_ok=True)

    source = Image.open(src_path).convert('RGB')

    # navbar mark — remove.bg's clean edge, with the deleted car restored
    art = Image.open(rb_path).convert('RGBA')
    fixed = repair_interior_holes(art, source)
    mark = fit(trim(art.crop(MARK_BOX)), height=MARK_H)
    mark.save(os.path.join(OUT, 'logo-mark.png'))
    print(f'logo-mark.png  repaired {fixed} interior px (windscreen)')

    # footer + auth lockup — border flood fill, keeps interior whites
    full = fit(trim(make_transparent(source.copy().crop(FULL_BOX))), width=FULL_W)
    full.save(os.path.join(OUT, 'logo-full.png'))

    on_square(mark, FAVICON).save(os.path.join(OUT, 'favicon.png'))
    on_square(mark, APPLE).save(os.path.join(OUT, 'apple-touch-icon.png'))

    print()
    for f in ('logo-mark.png', 'logo-full.png', 'favicon.png', 'apple-touch-icon.png'):
        report(os.path.join(OUT, f))


if __name__ == '__main__':
    main()
