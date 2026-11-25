"""Clear the pouch's halo from the rock plates (DECISIONS CM-020).

Cutting the pouch out of the photograph left a faint outline of it on the ledge plate: hidden while the hero's
pouch stands over it, but seen as thin lines in the sky once the pouch steps aside (the shop on a phone). Above
the rock, in the pouch's columns, every pixel is made transparent; the rock's own soft edge and the fade at the
pouch's foot are kept. Runs in place on the six ledge plates.
"""
import sys
import numpy as np
from PIL import Image

DIR = 'src/arrival/layers'
QUALITY = {'2x': 80, '1x': 80, 'narrow': 86}


def clean(path, q):
    im = Image.open(path).convert('RGBA')
    px = np.array(im)
    a = px[:, :, 3].astype(int)
    h, w = a.shape
    s = h / 1628  # the plates' scale (the 2x and the narrow ones are 1628 high)
    top = a[: int(12 * s) + 1]
    xs = np.where((top > 0).any(axis=0))[0]
    if not len(xs):
        return 0
    left, right = xs.min(), xs.max()
    centre = (left + right) // 2
    col = a[:, centre]
    ramp = int(20 * s) + np.argmax(col[int(20 * s):] > 0)  # where the fade at the pouch's foot begins
    pad, keep = int(16 * s) + 1, int(3 * s) + 1
    # Rock is solid across a width; the halo is a line a few pixels thin. Solid here: opaque together with the
    # next k pixels on one side or the other.
    k = int(8 * s) + 1
    op = a >= 245
    lft = np.ones_like(op)
    rgt = np.ones_like(op)
    for d in range(1, k + 1):
        lft[:, d:] &= op[:, :-d]
        lft[:, :d] = False
        rgt[:, :-d] &= op[:, d:]
        rgt[:, -d:] = False
    wide = op & (lft | rgt)
    cleared = 0
    for x in range(max(0, left - pad), min(w, right + pad + 1)):
        solid = wide[:, x]
        run = np.convolve(solid.astype(int), np.ones(k, int), 'valid')
        rock = int(np.argmax(run == k)) if (run == k).any() else h
        stop = min(ramp, max(0, rock - keep))
        cleared += int((px[:stop, x, 3] > 0).sum())
        px[:stop, x, 3] = 0
    Image.fromarray(px).save(path, 'WEBP', quality=q, method=6)
    return cleared


for name in ['ledge', 'ledge-dusk']:
    for tag, q in QUALITY.items():
        p = f'{DIR}/{name}-{tag}.webp'
        print(p, clean(p, q), 'pixels cleared', file=sys.stderr)
