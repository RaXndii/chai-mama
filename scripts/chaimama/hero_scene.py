"""Chai Mama's homepage hero from the owner's picture (DECISIONS CM-008). Offline, not part of the build.

    python3 scripts/chaimama/hero_clean.py <picture.webp> <clean.png>
    python3 -I scripts/chaimama/upscale.py <realesr-general-x4v3.pth> <clean.png> <clean2x.png> 2
    python3 -I scripts/chaimama/hero_scene.py <clean.png> <clean2x.png> <depth_anything_v2_vits.onnx> <out>

<clean.png> is the owner's 1672 × 940 homepage picture with the page's words and controls taken out
(hero_clean.py): the pack on a mossy rock above the tea rows, a bowl of loose tea behind it, the valley in
golden mist and the sun low over the right-hand ranges. <clean2x.png> is the same, 2× by upscale.py; the
depth model is Depth Anything V2 Small (Apache-2.0, github.com/fabio-sim/Depth-Anything-ONNX, v2.0.0
depth_anything_v2_vits.onnx). The packs are the owner's photos, cut out (brand/pouch.webp,
brand/pack-lovely.webp). Run from the repo root; needs numpy, opencv-python, scipy, onnxruntime, Pillow.

The picture is The Lovely Blend's light (the red pack): late in the day. Heritage Blend stands in the same
place a little earlier: the light is made from the same picture (the sky bluer overhead and the clouds
whiter, the mist white, the greens fresher, the gold out of the haze and the sun higher). Writes into <out>:

  far / sky / ledge / leaves -{1x,2x}.webp   the depth layers, earlier (Heritage Blend), and each one's
                                       -dusk-* (later, The Lovely Blend: the picture's own light)
  far / sky -soft / -dusk-soft         the far country a little softened by the air (CM-007's window of
                                       clarity shows the sharp plates at the pointer)
  pouch-heritage / pouch-lovely -{1x,2x}   the real packs, lit into the scene, in one shared box
  sky-mask.png                         the ridgeline mask the sky layer lies behind
  meta.json                            the geometry arrival.ts takes, and previews (prev-*.jpg) to check

The sun's disc is taken out of both skies: the page draws it, and moves it — higher earlier, lower later —
while the plates' wide glow around it changes with the light. The picture's own pack is an AI picture (its
small print is garbled), so it is removed and the real pack photographs stand in its place.
"""
import json, os, sys
import numpy as np, cv2
import onnxruntime as ort
from PIL import Image
from scipy import ndimage as nd

SRC1, SRC2, MODEL, OUT = sys.argv[1:5]
os.makedirs(OUT, exist_ok=True)
YELLOW = 'src/scenes/chaimama/brand/pouch.webp'      # the packs, cut out (CM-001, CM-005)
RED = 'src/scenes/chaimama/brand/pack-lovely.webp'

P1 = cv2.cvtColor(cv2.imread(SRC1), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
P = cv2.cvtColor(cv2.imread(SRC2), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
H, W = P.shape[:2]            # 1880 × 3344: the work is done at 2×; geometry is reported in 1× (frame) px
S = W / P1.shape[1]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
sxx, syy = xx / S, yy / S     # frame px


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def lum(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def box(a, r):
    return cv2.blur(a, (2 * r + 1, 2 * r + 1))


def guided(I, p, r, eps):
    mI, mp = box(I, r), box(p, r)
    a = (box(I * p, r) - mI * mp) / (box(I * I, r) - mI * mI + eps)
    b = mp - a * mI
    return box(a, r) * I + box(b, r)


def pushpull(img, valid):
    """Fill where valid == 0 with a smooth blend of the valid colours around it (masked pyramid)."""
    lv = [(img * valid[..., None], valid.copy())]
    while min(lv[-1][1].shape) > 4:
        c, w = lv[-1]
        lv.append((cv2.pyrDown(c), cv2.pyrDown(w)))
    c, w = lv[-1]
    out = c / np.maximum(w, 1e-6)[..., None]
    for c, w in reversed(lv[:-1]):
        up = cv2.resize(out, (w.shape[1], w.shape[0]), interpolation=cv2.INTER_LINEAR)
        ww = np.clip(w * 4, 0, 1)[..., None]
        out = np.where(w[..., None] > 1e-3, c / np.maximum(w, 1e-6)[..., None], up) * ww + up * (1 - ww)
    return out


def mirror_fill(img, hole, deep=90.0):
    """Fill `hole` by reflecting the picture across its nearest edge (texture continues in), fading to a
    smooth fill deeper in. Only the hole's rim is ever seen, as a nearer layer slides past it."""
    hb = hole > 0.5
    dist, (iy, ix) = nd.distance_transform_edt(hb, return_indices=True)
    ry = np.clip(2 * iy - yy.astype(int), 0, H - 1)
    rx = np.clip(2 * ix - xx.astype(int), 0, W - 1)
    refl = img[ry, rx]
    ok = ~hb[ry, rx]
    soft = pushpull(img, (~hb).astype(np.float32))
    k = (np.clip(dist / deep, 0, 1) ** 1.5)[..., None]
    fill = np.where(ok[..., None], refl * (1 - k) + soft * k, soft)
    fill = cv2.GaussianBlur(fill, (0, 0), 1.2)
    h = hole[..., None]
    return img * (1 - h) + fill * h


def edge_fill(img, hole):
    """Fill a box-like hole (the picture's pack) from its edges: each pixel mirrors the scene across the top
    edge (up its column) and across the side edges (along its row), blended by how near each edge is (the
    sides weigh more: the hills behind run across)."""
    hb = hole > 0.5
    rows, cols = np.mgrid[0:H, 0:W]
    top = np.where(hb.any(0), hb.argmax(0), H)
    left = np.where(hb.any(1), hb.argmax(1), W)
    right = np.where(hb.any(1), W - 1 - hb[:, ::-1].argmax(1), -1)
    dt = np.maximum(rows - top[None, :], 0)
    dl = np.maximum(cols - left[:, None], 0)
    dr = np.maximum(right[:, None] - cols, 0)
    T = img[np.clip(top[None, :] - 1 - dt, 0, H - 1), cols]
    Lm = img[rows, np.clip(left[:, None] - 1 - dl, 0, W - 1)]
    Rm = img[rows, np.clip(right[:, None] + 1 + dr, 0, W - 1)]
    e = 6 * S
    wt, wl, wr = (1 / (d + e) ** 2 for d in (dt, dl, dr))
    # Behind the pack the hills run across in bands: mostly from the sides, the sky above only at the top.
    wt = wt * 0.12
    fill = (T * wt[..., None] + Lm * wl[..., None] + Rm * wr[..., None]) / (wt + wl + wr)[..., None]
    return img * (1 - hole[..., None]) + fill * hole[..., None]


# ---------------------------------------------------------------- depth (Depth Anything V2 Small)
sess = ort.InferenceSession(MODEL, providers=['CPUExecutionProvider'])


def disparity(rgb):
    def run(im):
        x = cv2.resize(im, (518, 518), interpolation=cv2.INTER_CUBIC)
        x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        return sess.run(None, {sess.get_inputs()[0].name: x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
    d = (run(rgb) + run(rgb[:, ::-1])[:, ::-1]) / 2
    d = cv2.resize(d, (W, H), interpolation=cv2.INTER_CUBIC)
    lo, hi = np.percentile(d, 0.5), np.percentile(d, 99.7)
    return np.clip((d - lo) / (hi - lo), 0, 1).astype(np.float32)


D = disparity(P1)
G = lum(P)
D = guided(G, D, 10, 1e-4)

# ---------------------------------------------------------------- the picture's pack
# The AI pack: a plateau in the depth inside its box (1× x 384..756, y 226..768). GrabCut refines it.
PB = (int(380 * S), int(222 * S), int(762 * S), int(772 * S))   # x0, y0, x1, y1


def grabcut(rect, sure_fg, sure_bg):
    """GrabCut inside `rect` (x0, y0, x1, y1), on a crop with a band of sure background around it."""
    x0, y0, x1, y1 = rect
    b = int(40 * S)
    cx0, cy0, cx1, cy1 = max(0, x0 - b), max(0, y0 - b), min(W, x1 + b), min(H, y1 + b)
    m = np.full((H, W), cv2.GC_BGD, np.uint8)
    m[y0:y1, x0:x1] = cv2.GC_PR_BGD
    m[sure_fg & (m == cv2.GC_PR_BGD)] = cv2.GC_PR_FGD
    m[sure_fg & (m != cv2.GC_BGD) & (cv2.erode(sure_fg.astype(np.uint8), np.ones((15, 15))) > 0)] = cv2.GC_FGD
    m[sure_bg & (m != cv2.GC_BGD)] = cv2.GC_BGD
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    img8 = cv2.cvtColor((P[cy0:cy1, cx0:cx1] * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
    mc = np.ascontiguousarray(m[cy0:cy1, cx0:cx1])
    cv2.grabCut(img8, mc, None, bgd, fgd, 5, cv2.GC_INIT_WITH_MASK)
    m[cy0:cy1, cx0:cx1] = mc
    out = ((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(out)
    out = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    cnt, _ = cv2.findContours(out, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(out)
    cv2.drawContours(out, cnt, -1, 1, -1)
    return out.astype(bool)


inbox = (xx >= PB[0]) & (xx < PB[2]) & (yy >= PB[1]) & (yy < PB[3])
inner = (sxx > 440) & (sxx < 700) & (syy > 280) & (syy < 720)
plateau = float(np.median(D[inner]))
pouch_core = inbox & (np.abs(D - plateau) < 0.05) & (sxx > 405) & (sxx < 735) & (syy > 245) & (syy < 755)
pouch = grabcut(PB, pouch_core, ~inbox)
pouch = cv2.morphologyEx(pouch.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9))).astype(bool)
ys, xs = np.where(pouch)
AI = dict(x0=xs.min() / S, x1=(xs.max() + 1) / S, y0=ys.min() / S, y1=(ys.max() + 1) / S)
print('AI pack (1×)', {k: round(v, 1) for k, v in AI.items()}, 'plateau', round(plateau, 3))

# ---------------------------------------------------------------- the near ground: the rock, the bowl, the bushes
# The rock with the bowl and the loose leaves on it, and the bushes at the left, are a step up in the depth
# from the valley; they move with the pack.
near = smooth(D, 0.17, 0.25)
near = guided(G, near.astype(np.float32), 4, 1e-3).clip(0, 1)
near[pouch] = 0

# ---------------------------------------------------------------- the sky behind the ranges
# The ridgeline, drawn by eye on the picture (1× px) and snapped to the strongest bright-over-dark step
# within ±12 px; on the right the ranges fade into the haze (no step: the drawn line stands).
RIDGE = [(0, 232), (150, 228), (250, 222), (330, 212), (400, 202), (450, 206), (500, 215), (560, 226),
         (640, 222), (700, 212), (775, 205), (850, 212), (900, 214), (950, 226), (1000, 240), (1100, 252),
         (1200, 256), (1300, 258), (1400, 263), (1480, 272), (1530, 282), (1600, 286), (1672, 284)]
rx, ry = np.array(RIDGE, np.float32).T
guess = np.interp(np.arange(W) / S, rx, ry) * S
g = cv2.GaussianBlur(G, (0, 0), 2.0)
step = np.zeros_like(g)
step[:-8] = g[:-8] - g[8:]
ridge = guess.copy()
for x in range(W):
    a, b = int(guess[x] - 12 * S), int(guess[x] + 12 * S)
    col = step[a:b, x]
    if col.max() > 0.05:
        ridge[x] = a + int(np.argmax(col)) + 4
ridge = nd.median_filter(ridge, size=int(9 * S), mode='nearest')
ridge = cv2.GaussianBlur(ridge.reshape(1, -1).astype(np.float32), (0, 0), 3 * S).ravel()
sky = smooth(ridge[None, :] - yy, -2 * S, 3 * S)
# The trees on the left stand into the sky: a little nearer than the clouds (depth ≈ 0.016 against < 0.01)
# and brown-green where the clouds there are grey. Their crowns stay with the far layer.
left = 1 - smooth(sxx, 420, 460)
warm = smooth((P[..., 0] - P[..., 2]) - 0.1, 0.0, 0.08) * (1 - smooth(G, 0.45, 0.6))
tree = np.maximum(smooth(D, 0.009, 0.014), warm)
tree = cv2.dilate(tree, np.ones((3, 3), np.uint8))
sky *= 1 - tree * left
sky = guided(G, sky.astype(np.float32), 3, 1e-3).clip(0, 1)
sky[syy > 300] = 0
sky[pouch] = 0

# ---------------------------------------------------------------- the sun
# Its disc in the picture: the brightest point over the right-hand ranges. Later on (the picture) it stands
# there; earlier it is higher and a little to the left. The page draws the disc at either place.
g3 = cv2.GaussianBlur(P1 @ np.array([0.2126, 0.7152, 0.0722], np.float32), (0, 0), 3)
sub = g3[200:330, 1500:1672]
sy, sx = np.unravel_index(np.argmax(sub), sub.shape)
SUN_LOW = np.array([1500.0 + sx, 200.0 + sy])
SUN_HIGH = SUN_LOW + [-70, -150]
print('sun', SUN_LOW, '→ earlier', SUN_HIGH)
d_low = np.hypot(sxx - SUN_LOW[0], syy - SUN_LOW[1])
d_high = np.hypot(sxx - SUN_HIGH[0], syy - SUN_HIGH[1])


def polar_blur(img, centre, radius, sigma_deg):
    """`img` blurred around `centre` along the circles (the sun's rays are straight lines from it, so this
    smooths them away and keeps what falls off with the distance), out to `radius` frame px."""
    R = int(radius * S)
    n = 1440
    pad = R
    big = cv2.copyMakeBorder(img, pad, pad, pad, pad, cv2.BORDER_REFLECT)
    c = (float(centre[0] * S + pad), float(centre[1] * S + pad))
    pol = cv2.warpPolar(big, (R, n), c, R, cv2.WARP_POLAR_LINEAR + cv2.INTER_LINEAR)
    pol = nd.gaussian_filter1d(pol, sigma_deg * n / 360, axis=0, mode='wrap')
    back = cv2.warpPolar(pol, (big.shape[1], big.shape[0]), c, R,
                         cv2.WARP_POLAR_LINEAR + cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
    return back[pad:pad + H, pad:pad + W]


def without_disc(img):
    """The disc filled from the glow around it (the page's sun covers the spot)."""
    disc = 1 - smooth(d_low, 15, 30)
    fill = pushpull(img, (d_low > 30).astype(np.float32))
    return img * (1 - disc[..., None]) + fill * disc[..., None]


# The glow around the low sun, as it falls off with the distance (the rays smoothed out), above the light the
# scene has well away from it: the earlier light takes most of it away.
RAD = 520
around = polar_blur(P, SUN_LOW, RAD, 14.0)
rays = np.clip(P - around, 0, None) * (smooth(d_low, 14, 34) * (1 - smooth(d_low, 330, 440)))[..., None]
prof = polar_blur(P, SUN_LOW, RAD, 120.0)
far_light = prof[np.clip((SUN_LOW[1] * S).astype(int), 0, H - 1), np.clip(int((SUN_LOW[0] - 460) * S), 0, W - 1)]
glow = np.clip(prof - far_light, 0, None) * (1 - smooth(d_low, 380, RAD))[..., None]

# ---------------------------------------------------------------- earlier in the day (Heritage Blend)


def to_lab(rgb):
    return cv2.cvtColor(rgb.astype(np.float32), cv2.COLOR_RGB2LAB)


def from_lab(lab):
    return cv2.cvtColor(lab.astype(np.float32), cv2.COLOR_LAB2RGB)


def earlier(rgb):
    """The low sun's glow and rays lifted out, and a softer, whiter glow higher up."""
    out = rgb - rays * 0.95 - glow * 0.7
    out += (np.exp(-d_high / 260) * 0.10 + np.exp(-d_high / 70) * 0.06)[..., None] * np.array([1.0, 0.98, 0.93])
    return without_disc(out.clip(0, 1))


def earlier_land(rgb):
    """The same land earlier on: the gold goes out of the light, the greens freshen, the mist whitens."""
    out = earlier(rgb)
    # A little less haze than late in the day: the far country's contrast comes back (airlight taken out).
    air = np.array([0.93, 0.9, 0.84])
    dark = nd.minimum_filter(out.min(-1), size=int(9 * S))
    keep = 1 - 0.28 * smooth(cv2.GaussianBlur(dark, (0, 0), 6 * S) / 0.84, 0.35, 1.0)
    out = ((out - air) / keep[..., None] + air).clip(0, 1)
    lab = to_lab(out)
    Lc, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    mist = smooth(Lc, 60, 88) * (1 - smooth(sat, 0.12, 0.4))
    # The ranges the low sun lit gold go back to the haze's blue-grey green.
    lit = np.exp(-d_low / 300)
    a2 = a * (0.85 - 0.4 * lit) - 1.5
    b2 = b - 5 - 7 * mist - 16 * lit
    b2 = np.where(b2 > 0, b2 * 0.88, b2)
    L2 = Lc * 1.02 + 2 + 2 * mist - 4 * lit * (1 - mist)
    return from_lab(np.dstack([np.clip(L2, 0, 100), a2, b2])).clip(0, 1)


def earlier_sky(rgb):
    """Earlier: the pink and the gold go out of the clouds (they keep their shapes), the blue comes in
    overhead, and the band over the ranges stays a pale, warm cream."""
    lab = to_lab(earlier(rgb))
    Lc, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    t = smooth(yy / np.maximum(ridge[None, :], 1), 0.0, 1.0)
    # The clouds: what stands brighter than the sky around it. Their tops go white with a little cream, their
    # shadows a soft blue-grey; the open sky between them blue overhead, a pale warm cream over the ranges.
    cloud = smooth(Lc - cv2.GaussianBlur(Lc, (0, 0), 24 * S), -1.0, 6.0)
    a2 = a * 0.14
    blue = -(1 - t) * 15 * (1 - smooth(Lc, 72, 94))
    b2 = (b * (0.2 + 0.25 * t) + blue) * (1 - cloud) + (2.5 + 3 * t) * cloud - 3 * (1 - t)
    L2 = Lc * 0.92 + 10 + 5 * cloud
    return from_lab(np.dstack([np.clip(L2, 0, 100), a2, b2])).clip(0, 1)


# ---------------------------------------------------------------- layers at rest
# far: the whole picture, the pack and the near ground taken out (filled from the scene around them).
hole_p = cv2.dilate(pouch.astype(np.uint8), np.ones((int(7 * S), int(7 * S)))).astype(np.float32)
hole_n = (cv2.dilate((near > 0.4).astype(np.uint8), np.ones((5, 5))) > 0).astype(np.float32)
hole = np.maximum(hole_p, hole_n)
far = P * (1 - hole_n[..., None]) + pushpull(P, 1 - hole) * hole_n[..., None]
far = edge_fill(far, hole_p)
far = mirror_fill(far, hole_n, deep=170.0)

# the sky plate: the picture's sky, carried down behind the ranges (it drifts a little on a switch). Only
# clear sky is kept (a few px inside the mask's edge), so no trace of the ridge or of a crown slides with it.
clear = cv2.erode((sky > 0.97).astype(np.uint8), np.ones((7, 7))).astype(np.float32)
sky_plate = pushpull(P, clear)
clear = cv2.GaussianBlur(clear, (0, 0), 1.0)[..., None]
sky_plate = P * clear + sky_plate * (1 - clear)

# ledge: the rock, the bowl, the loose leaves and the bushes, as in the picture; behind the pack, the rock
# and the bowl carried on (only a sliver ever shows beside the real pack).
ledge_rgb = P * (1 - hole_p[..., None]) + pushpull(P, (1 - hole_p) * (near > 0.5)) * hole_p[..., None]
nearL = np.maximum(near, cv2.GaussianBlur(hole_p, (0, 0), 1.0) * smooth(syy, 700, 740))

# ---------------------------------------------------------------- the leaves in front, in the wind
# The big out-of-focus tea leaves at the bottom left stand nearest (depth > 0.6, green): their own layer, so
# the page can bend them a little in the wind. Behind them the rock and the bushes are filled in.
green = (P[..., 1] > P[..., 0] * 0.98) & (P[..., 1] > P[..., 2] * 1.15)
leaves = smooth(D, 0.58, 0.68) * green * (syy > 560) * (sxx < 760)
leaves = guided(G, leaves.astype(np.float32), 3, 1e-3).clip(0, 1)
leaves[leaves < 0.04] = 0
hole_l = cv2.dilate((leaves > 0.3).astype(np.uint8), np.ones((int(5 * S), int(5 * S)))).astype(np.float32)
behind = pushpull(ledge_rgb, (1 - hole_l) * (nearL > 0.5))
ledge_rgb = ledge_rgb * (1 - hole_l[..., None]) + behind * hole_l[..., None]

# the two times of day of each
dusk = {'far': without_disc(far), 'sky': without_disc(sky_plate), 'ledge': ledge_rgb, 'leaves': P}
day = {'far': earlier_land(far), 'sky': earlier_sky(sky_plate), 'ledge': earlier_land(ledge_rgb),
       'leaves': earlier_land(P)}
# Where the far layer shows sky (between the trees, behind the ranges' soft edge), it is the same sky.
for t in (day, dusk):
    t['far'] = t['far'] * (1 - sky[..., None]) + t['sky'] * sky[..., None]

# ---------------------------------------------------------------- the real packs, lit into the scene
# The picture's pack shows the light: warm and even on its face from the low sun on the right, a warm rim
# down its right edge and along its top. Each pack's cream paper is matched to the picture pack's, then lit
# for its time of day.
ax0, ax1, ay0, ay1 = (int(AI[k] * S) for k in ('x0', 'x1', 'y0', 'y1'))
aw, ah = ax1 - ax0, ay1 - ay0
band = P[ay0 + int(0.04 * ah):ay0 + int(0.09 * ah), ax0 + int(0.3 * aw):ax0 + int(0.7 * aw)].reshape(-1, 3)
band = band[lum(band) > np.percentile(lum(band), 40)]
AI_CREAM = np.median(band, 0)
print('picture pack cream', AI_CREAM.round(3))
FOOT, CX = AI['y1'], (AI['x0'] + AI['x1']) / 2
PACK_H = AI['y1'] - AI['y0'] + 6.0        # the packs' height on the rock (1× px): they cover the picture's
BOX = dict(x0=round(CX - 205), y0=round(AI['y0'] - 18), w=410, h=round(FOOT - AI['y0'] + 26))


def load_pack(path):
    a = np.array(Image.open(path).convert('RGBA')).astype(np.float32) / 255
    ys, xs = np.where(a[..., 3] > 0.03)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def light_pack(a, late):
    a = a.copy()
    h, w = a.shape[:2]
    top = a[int(0.05 * h):int(0.11 * h), int(0.32 * w):int(0.68 * w)]
    top = top[top[..., 3] > 0.9][:, :3]
    top = top[lum(top) > np.percentile(lum(top), 40)]
    cream = AI_CREAM if late else lum(AI_CREAM) * np.array([1.0, 0.985, 0.95]) / 0.976
    rgb = a[..., :3] * (cream / np.median(top, 0))
    v, u = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = u / w, v / h
    shade = (0.94 + 0.1 * u) * (1 - 0.05 * v) * (1 - 0.2 * smooth(v, 0.92, 1.0))
    rgb *= shade[..., None]
    dist = cv2.distanceTransform((a[..., 3] > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    edge = np.exp(-dist / (w * 0.014))
    side = smooth(u, 0.6, 1.0) * 0.9 + (1 - smooth(v, 0.0, 0.1)) * 0.45
    rim = (edge * side)[..., None]
    if late:
        hi = smooth(lum(rgb), 0.2, 0.85)[..., None]
        rgb *= np.array([0.9, 0.86, 0.84]) * (1 - hi) + np.array([1.02, 0.96, 0.88]) * hi
        rgb += rim * np.array([1.0, 0.7, 0.36]) * 0.5
    else:
        rgb += rim * np.array([1.0, 0.9, 0.7]) * 0.3
    a[..., :3] = rgb.clip(0, 1)
    return a


def place_pack(a, scale):
    """The pack in the shared box, bottom-centre on the picture pack's foot, at `scale` px per frame px."""
    h, w = a.shape[:2]
    nh = round(PACK_H * scale)
    nw = round(w * nh / h)
    im = Image.fromarray((a * 255).astype(np.uint8), 'RGBA').resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (round(BOX['w'] * scale), round(BOX['h'] * scale)), (0, 0, 0, 0))
    canvas.alpha_composite(im, (round((CX - BOX['x0']) * scale - nw / 2), round((FOOT + 3 - BOX['y0']) * scale - nh)))
    return canvas


packs = {'heritage': light_pack(load_pack(YELLOW), False), 'lovely': light_pack(load_pack(RED), True)}

# ---------------------------------------------------------------- the air's softness (the clarity window)


def soften(img, haze):
    return cv2.GaussianBlur(img, (0, 0), 2.4 * S) * 0.93 + np.array(haze) * 0.07


# ---------------------------------------------------------------- margins (the camera's glide)
ML, MT, MB = int(200 * S), int(96 * S), int(100 * S)
CW, CH = W + 2 * ML, H + MT + MB


def pad(img, mode=cv2.BORDER_REFLECT):
    return cv2.copyMakeBorder(img, MT, MB, ML, ML, mode)


MARGIN = np.ones((CH, CW), np.float32)
MARGIN[MT:MT + H, ML:ML + W] = 0
MARGIN = cv2.GaussianBlur(MARGIN, (0, 0), 8 * S)[..., None]
SHADE = np.ones(CH, np.float32)
SHADE[MT + H:] = np.linspace(1, 0.35, MB)
SHADE = SHADE[:, None, None]


def margins(img):
    """The margins, mirrored (they show only in the first instants of the glide, under the clearing mist):
    softened, and darker below the frame."""
    p = pad(img)
    # Well blurred: a mirrored copy of the sun's glow must not read as a second sun at the edge.
    return (p * (1 - MARGIN) + cv2.GaussianBlur(p, (0, 0), 10 * S) * MARGIN) * SHADE


frame_only = pad(np.ones((H, W), np.float32), cv2.BORDER_CONSTANT)
nearP = pad(nearL)
nearP[:MT] = 0
skyM = pad(sky)
leavesP = pad(leaves) * frame_only
plates = {
    'far': (margins(day['far']), margins(dusk['far']), None),
    'far-soft': (margins(soften(day['far'], (0.97, 0.97, 0.95))), margins(soften(dusk['far'], (1.0, 0.92, 0.8))), None),
    'sky': (margins(day['sky']), margins(dusk['sky']), None),
    'sky-soft': (margins(soften(day['sky'], (0.97, 0.97, 0.95))), margins(soften(dusk['sky'], (1.0, 0.92, 0.8))), None),
    'ledge': (margins(earlier_land(P)) * (1 - frame_only[..., None]) + pad(day['ledge']) * frame_only[..., None],
              margins(P) * (1 - frame_only[..., None]) + pad(dusk['ledge']) * frame_only[..., None], nearP),
    'leaves': (pad(day['leaves']), pad(dusk['leaves']), leavesP),
}


def even(v):
    return int(v) // 2 * 2


def bbox(alpha, padpx=8):
    ys, xs = np.where(alpha > 1 / 255)
    return (even(max(0, xs.min() - padpx)), even(max(0, ys.min() - padpx)),
            even(min(CW, xs.max() + padpx + 2)), even(min(CH, ys.max() + padpx + 2)))


crops = {
    'far': (0, 0, even(CW), even(CH)),
    'sky': (0, 0, even(CW), even(MT + 304 * S)),
    'ledge': bbox(nearP, 0),
    'leaves': bbox(leavesP, 24),
}
crops['ledge'] = (0, crops['ledge'][1], even(CW), even(CH))
crops['far-soft'], crops['sky-soft'] = crops['far'], crops['sky']
Z = {'far': 16.0, 'sky': 16.0, 'ledge': 3.0, 'pouch': 3.0, 'leaves': 3.0}


def write(img, name, q):
    img.save(f'{OUT}/{name}-2x.webp', 'WEBP', quality=q, method=6)
    img.resize((img.width // 2, img.height // 2), Image.LANCZOS).save(f'{OUT}/{name}-1x.webp', 'WEBP', quality=q, method=6)


layers = []
for name, (dayp, duskp, alpha) in plates.items():
    x0, y0, x1, y1 = crops[name]
    for tag, rgb in (('', dayp), ('-dusk', duskp)):
        a = rgb[y0:y1, x0:x1]
        if alpha is not None:
            a = np.dstack([a, alpha[y0:y1, x0:x1]])
        im = Image.fromarray((a.clip(0, 1) * 255).round().astype(np.uint8), 'RGBA' if alpha is not None else 'RGB')
        stem, soft = name.removesuffix('-soft'), name.endswith('-soft')
        write(im, stem + tag + ('-soft' if soft else ''), 72 if soft else 80 if name in ('far', 'ledge') else 84)
    if name.endswith('-soft'):
        continue  # the same box as its sharp layer
    layers.append(dict(name=name, z=Z[name], x=x0 / S, y=y0 / S, w=(x1 - x0) / S, h=(y1 - y0) / S))
    if name == 'sky':
        # A CSS mask reads the image's alpha: white, with the mask as its alpha channel.
        m = Image.fromarray((skyM[y0:y1, x0:x1].clip(0, 1) * 255).astype(np.uint8), 'L').resize(
            ((x1 - x0) // 2, (y1 - y0) // 2), Image.LANCZOS)
        Image.merge('LA', (Image.new('L', m.size, 255), m)).save(f'{OUT}/sky-mask.png', optimize=True)


def register(moving, fixed):
    """`moving` (an RGBA pack canvas) warped so its artwork lies on `fixed`'s: the two packs are photographs
    of the same printed artwork, taken a little differently (scale, height, a slight shear). Fitted on the
    drawing above the label, so as the page uncovers one pack over the other the drawing never doubles."""
    m = np.asarray(moving).astype(np.float32) / 255
    f = np.asarray(fixed).astype(np.float32) / 255
    h = f.shape[0]
    gm, gf = (cv2.cvtColor((x[..., :3] * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
              for x in (m, f))
    y0, y1 = int(0.12 * h), int(0.5 * h)
    warp = np.eye(2, 3, dtype=np.float32)
    _, warp = cv2.findTransformECC(gf[y0:y1], gm[y0:y1], warp, cv2.MOTION_AFFINE,
                                   (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
    # The fit was on a band of rows: the same warp in the whole canvas's coordinates.
    warp[0, 2] -= warp[0, 1] * y0
    warp[1, 2] += y0 * (1 - warp[1, 1])
    out = cv2.warpAffine(m, warp, (f.shape[1], f.shape[0]), flags=cv2.INTER_LANCZOS4 + cv2.WARP_INVERSE_MAP,
                         borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    print('registered the red pack onto the yellow one:', warp.round(4).tolist())
    return Image.fromarray((out.clip(0, 1) * 255).round().astype(np.uint8), 'RGBA')


for tag, sc in (('1x', 1.0), ('2x', 2.0)):
    yellow = place_pack(packs['heritage'], sc)
    red = register(place_pack(packs['lovely'], sc), yellow)
    yellow.save(f'{OUT}/pouch-heritage-{tag}.webp', 'WEBP', quality=90, method=6)
    red.save(f'{OUT}/pouch-lovely-{tag}.webp', 'WEBP', quality=90, method=6)
layers.insert(3, dict(name='pouch', z=Z['pouch'], x=BOX['x0'] + ML / S, y=BOX['y0'] + MT / S, w=BOX['w'], h=BOX['h']))

meta = {'frame': {'w': W / S, 'h': H / S, 'x': ML / S, 'y': MT / S}, 'layers': layers,
        'sun': {'late': (SUN_LOW + [ML / S, MT / S]).tolist(), 'early': (SUN_HIGH + [ML / S, MT / S]).tolist()},
        'ai_pack': AI}
json.dump(meta, open(f'{OUT}/meta.json', 'w'), indent=1)
print(json.dumps(meta))

# Previews: the masks, and each time of day at rest, composed from the files just written (the page's sun
# drawn roughly, as a disc and a halo).
v = (P * 255).astype(np.uint8).copy()
for m, col in [(pouch, (255, 0, 255)), (near > 0.5, (255, 0, 0)), (sky > 0.5, (0, 0, 255)), (leaves > 0.5, (255, 255, 0))]:
    cnt, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(v, cnt, -1, col, 3)
Image.fromarray(v).resize((W // 2, H // 2)).save(f'{OUT}/prev-masks.jpg', quality=88)
cy, cx = np.mgrid[0:CH // 2, 0:CW // 2].astype(np.float32)
for tag, blend, sun in (('', 'heritage', SUN_HIGH), ('-dusk', 'lovely', SUN_LOW)):
    comp = Image.new('RGBA', (CW // 2, CH // 2))
    for l in layers:
        n = l['name']
        im = Image.open(f'{OUT}/pouch-{blend}-1x.webp' if n == 'pouch' else f'{OUT}/{n}{tag}-1x.webp').convert('RGBA')
        if n == 'sky':
            im.putalpha(Image.open(f'{OUT}/sky-mask.png').getchannel('A'))
        comp.alpha_composite(im, (round(l['x']), round(l['y'])))
        if n == 'sky':
            d = np.hypot(cx - sun[0] - ML / S, cy - sun[1] - MT / S)
            a = np.clip(np.exp(-(d / 13) ** 2) + np.exp(-d / 40) * 0.4, 0, 1)
            sunim = np.dstack([np.full_like(d, 255), np.full_like(d, 250), np.full_like(d, 236), a * 255]).astype(np.uint8)
            comp.alpha_composite(Image.fromarray(sunim, 'RGBA'))
    comp.convert('RGB').save(f'{OUT}/prev-rest{tag}.jpg', quality=88)
