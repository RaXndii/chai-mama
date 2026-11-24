"""The red pack's matte (DECISIONS CM-005), offline. Run from the repo root:

    python3 scripts/chaimama/cut_pouch.py <pack photo> <out dir>

writes red_mask.png (GrabCut on the owner's photo of The Lovely Blend). brand/pack-lovely.webp is that photo
under this matte (feathered 1.2 px), cropped to it; hero_scene.py lights it into the hero (CM-006, CM-008).
"""
import cv2, numpy as np, sys
src, OUT = sys.argv[1], sys.argv[2]
im = cv2.imread(src)  # BGR
h, w = im.shape[:2]
f = im.astype(np.float32)
b, g, r = f[..., 0], f[..., 1], f[..., 2]
# Background: light, cool grey (blue a touch above red). The pouch: everything else (its cream top is warm).
lum = (r + g + b) / 3
cool = b - r
bgprob = (lum > 215) & (cool > -1.5) & (np.abs(r - g) < 8)
mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
rect = (530, 340, 760, 1140)  # x, y, w, h around the pouch
x0, y0, rw, rh = rect
mask[:, :] = cv2.GC_BGD
mask[y0:y0 + rh, x0:x0 + rw] = cv2.GC_PR_FGD
mask[(bgprob) & (mask == cv2.GC_PR_FGD)] = cv2.GC_PR_BGD
# Sure foreground: the strongly coloured / dark parts of the print.
sat = f.max(-1) - f.min(-1)
mask[((sat > 40) | (lum < 150)) & (mask != cv2.GC_BGD)] = cv2.GC_FGD
bgd = np.zeros((1, 65), np.float64); fgd = np.zeros((1, 65), np.float64)
cv2.grabCut(im, mask, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
k = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]); m = np.where(lab == k, 255, 0).astype(np.uint8)
# Fill holes, then smooth the outline (the pouch's edges are straight lines and round corners).
cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
m = np.zeros_like(m); cv2.drawContours(m, cnts, -1, 255, -1)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
ys, xs = np.where(m > 0)
print('bbox', xs.min(), xs.max(), ys.min(), ys.max(), 'area', (m > 0).mean())
cv2.imwrite(f'{OUT}/red_mask.png', m)
pv = im.copy(); cv2.drawContours(pv, cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], -1, (255, 0, 255), 2)
cv2.imwrite(f'{OUT}/red_outline.png', pv[300:1500, 480:1340])
