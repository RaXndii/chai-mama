"""Chai Mama's falling tea (DECISIONS CM-010): real loose Ceylon tea cut out of the owner's photo. Offline.

    python3 scripts/chaimama/tea_leaves.py <loose-tea.webp> <atlas.webp> <cells.ts>

<loose-tea.webp> is the owner's 1500 × 1500 photo (2026-10-22) of dried black tea spilling from a glass onto
white paper. The pieces that stick out of the pile's edge are cut out: the leaf mask by darkness against the
paper, the pile's body by a wide morphological opening, so what is left are the loose tips, single leaves and
small clumps. Each gets its alpha from its darkness against the paper around it (the shadow under the glass
included), its colour freed of the paper's white, a fade where it was cut from the pile, and is laid along its
long axis. The atlas has three blocks of cells: the pieces sharp; the same pieces softened for the few that
fall close to the camera (so the page never blurs at run time); and lit, catching a warm light, for the dark
of the page's end (CM-012). Needs numpy, opencv-python and Pillow.
"""
import sys
import numpy as np, cv2
from PIL import Image

SRC, ATLAS, CELLS = sys.argv[1:4]
im = cv2.cvtColor(np.array(Image.open(SRC).convert('RGB')), cv2.COLOR_RGB2BGR).astype(np.float32)
assert im.shape[:2] == (1500, 1500), im.shape
g = cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
m = (g < 120).astype(np.uint8)
body = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
body = cv2.dilate(body, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
loose = (m & (1 - body)).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(loose, 8)
from_body = cv2.distanceTransform((1 - body).astype(np.uint8), cv2.DIST_L2, 5)


def behind_glass(x, y):
    # The tea seen through the glass (its top and its foot) is not loose.
    return (x > 520 and y < 560) or (740 < x < 1400 and y < 860)


pieces = []
for i in range(1, n):
    x, y, w, h, a = st[i]
    if a < 500 or a > 9000 or max(w, h) < 50 or behind_glass(x, y):
        continue
    # The heap of crossing leaves at the bottom is a pile, not a piece.
    if a > 8000 and w > 150:
        continue
    p = 6
    x0, y0, x1, y1 = max(0, x - p), max(0, y - p), min(1500, x + w + p), min(1500, y + h + p)
    comp = (lab[y0:y1, x0:x1] == i).astype(np.uint8)
    reg = cv2.dilate(comp, np.ones((5, 5), np.uint8))
    gg = g[y0:y1, x0:x1]
    ring = (cv2.dilate(comp, np.ones((15, 15), np.uint8)) - reg).astype(bool) & (gg > 150)
    paper = float(np.percentile(gg[ring], 70)) if ring.sum() > 20 else 238.0
    paper_c = np.median(im[y0:y1, x0:x1][ring], axis=0) if ring.sum() > 20 else np.full(3, 238.0)
    alpha = np.clip((paper - 6 - gg) / (paper - 6 - 75), 0, 1) * reg
    alpha *= np.clip((from_body[y0:y1, x0:x1] - 1) / 7, 0, 1)
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0.6)
    if alpha.sum() < 300:
        continue
    a3 = np.maximum(alpha, 0.04)[..., None]
    col = np.clip((im[y0:y1, x0:x1] - (1 - a3) * paper_c) / a3, 0, 255)
    # At the very edge the paper's colour cannot be taken out reliably: there it takes the leaf's own.
    core = np.median(col[alpha > 0.85], axis=0) if (alpha > 0.85).sum() > 20 else col.reshape(-1, 3).mean(0)
    k = np.clip((alpha - 0.25) / 0.5, 0, 1)[..., None]
    col = col * k + core * (1 - k)
    ys, xs = np.nonzero(alpha > 0.3)
    pts = np.stack([xs, ys], 1).astype(np.float32)
    mean = pts.mean(0)
    _, _, vt = np.linalg.svd(pts - mean, full_matrices=False)
    ang = np.degrees(np.arctan2(vt[0, 1], vt[0, 0]))
    D = int(np.hypot(*alpha.shape)) + 4
    M = cv2.getRotationMatrix2D((float(mean[0]), float(mean[1])), ang, 1.0)
    M[0, 2] += D / 2 - mean[0]
    M[1, 2] += D / 2 - mean[1]
    r = cv2.warpAffine(np.dstack([col, alpha * 255]), M, (D, D), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    ys, xs = np.nonzero(r[..., 3] > 8)
    r = r[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    # A clump: more than one leaf (a wide, filled piece); the page lets fewer of them fall.
    fill = (r[..., 3] > 128).mean()
    clump = r.shape[0] > 0.5 * r.shape[1] and r.shape[0] > 60 and fill > 0.2
    pieces.append((r, clump))

CW, CH, COLS = 160, 96, 7
rows = (len(pieces) + COLS - 1) // COLS
sheet = np.zeros((3 * rows * CH, COLS * CW, 4), np.float32)
cells = []
for k, (r, clump) in enumerate(pieces):
    h, w = r.shape[:2]
    s = min(1.0, (CW - 12) / w, (CH - 12) / h)
    r = cv2.resize(r, (max(1, round(w * s)), max(1, round(h * s))), interpolation=cv2.INTER_AREA)
    h, w = r.shape[:2]
    cx, cy = (k % COLS) * CW + (CW - w) // 2, (k // COLS) * CH + (CH - h) // 2
    sheet[cy:cy + h, cx:cx + w] = r
    # Softened (near the camera): blurred with its colour carried into the blurred alpha (premultiplied).
    pad = np.zeros((CH, CW, 4), np.float32)
    pad[(CH - h) // 2:(CH - h) // 2 + h, (CW - w) // 2:(CW - w) // 2 + w] = r
    pm = pad.copy()
    pm[..., :3] *= pm[..., 3:] / 255
    pm = cv2.GaussianBlur(pm, (0, 0), 2.6)
    soft = pm.copy()
    soft[..., :3] = pm[..., :3] / np.maximum(pm[..., 3:] / 255, 1e-3)
    oy = rows * CH + (k // COLS) * CH
    sheet[oy:oy + CH, (k % COLS) * CW:(k % COLS) * CW + CW] = soft
    # Lit (over the page's dark end, CM-012): the same piece catching a warm light, so it shows on the ink.
    lit = r.copy()
    lit[..., :3] = np.clip(lit[..., :3] * 1.2 + np.array([4, 18, 40], np.float32), 0, 255)
    sheet[2 * rows * CH + cy:2 * rows * CH + cy + h, cx:cx + w] = lit
    cells.append((cx, cy, w, h, clump))

out = cv2.cvtColor(np.clip(sheet, 0, 255).astype(np.uint8), cv2.COLOR_BGRA2RGBA)
Image.fromarray(out, 'RGBA').save(ATLAS, 'WEBP', quality=86, method=6)
with open(CELLS, 'w') as f:
    f.write('// Generated by scripts/chaimama/tea_leaves.py from the owner\'s loose-tea photo (DECISIONS CM-010).\n')
    f.write('// [x, y, w, h, clump] of each piece in the atlas\'s sharp rows (px); its softened copy is LEAF_SOFT_Y lower.\n')
    f.write('export const LEAF_CELLS: readonly (readonly [number, number, number, number, 0 | 1])[] = [\n')
    for c in cells:
        f.write(f'  [{c[0]}, {c[1]}, {c[2]}, {c[3]}, {1 if c[4] else 0}],\n')
    f.write('];\n')
    f.write(f'/** How far down the atlas the softened copies are (px). */\nexport const LEAF_SOFT_Y = {rows * CH};\n')
    f.write(f'/** How far down the atlas the lit copies are (px), for the dark of the page\'s end. */\nexport const LEAF_LIT_Y = {2 * rows * CH};\n')
    f.write(f'export const LEAF_ATLAS = {{ w: {COLS * CW}, h: {3 * rows * CH} }} as const;\n')
print(len(pieces), 'pieces,', sum(c for _, c in pieces), 'clumps')
