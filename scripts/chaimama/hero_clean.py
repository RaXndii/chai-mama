"""Chai Mama's homepage picture, cleaned for the hero (DECISIONS CM-008). Offline, not part of the build.

    python3 scripts/chaimama/hero_clean.py <picture.webp> <clean.png>

<picture.webp> is the owner's 1672 × 940 homepage picture (2026-10-21): the red pack on a mossy rock above the
tea rows, the valley in golden mist, the sun low on the right. It is a mock of the page, so the page's own
words and controls are drawn into it (the nav pills, the logo, the eyebrow, the headline, the blend's name
and line, the blend pills, the scroll cue). This takes them out: a mask of each (the dark letters by their
contrast to the local background, the pills and the logo as boxes), filled by OpenCV's frequency-selective
reconstruction, which carries the haze and the hills' texture in. The pack stays: hero_scene.py replaces it.
Needs numpy, Pillow and opencv-contrib-python (cv2.xphoto).
"""
import sys
import numpy as np, cv2
from PIL import Image

SRC, DST = sys.argv[1:3]
rgb = np.array(Image.open(SRC).convert('RGB'))
assert rgb.shape[:2] == (940, 1672), rgb.shape
im = rgb.astype(np.float32) / 255
L = im @ np.array([0.2126, 0.7152, 0.0722], np.float32)
bg = cv2.medianBlur((L * 255).astype(np.uint8), 61).astype(np.float32) / 255

m = np.zeros(L.shape, np.uint8)
# The headline and the blend's name: dark letters, much darker than the haze behind them.
y0, y1, x0, x1 = 200, 600, 1045, 1475
m[y0:y1, x0:x1] |= ((bg - L)[y0:y1, x0:x1] > 0.07).astype(np.uint8)
# The eyebrow row and the blend's line: thinner and lighter letters.
for x0, y0, x1, y1 in [(1052, 210, 1362, 236), (1052, 515, 1465, 580)]:
    m[y0:y1, x0:x1] |= ((bg - L)[y0:y1, x0:x1] > 0.04).astype(np.uint8)
BOXES = [
    (1054, 212, 1080, 234),   # the eyebrow's diamond
    (1055, 603, 1207, 649),   # the Heritage Blend pill
    (1215, 602, 1385, 650),   # The Lovely Blend pill
    (44, 32, 180, 78),        # Universe
    (1526, 32, 1628, 78),     # the language pill
    (730, 22, 942, 86),       # the logo and the wordmark
    (1560, 808, 1632, 830),   # SCROLL
    (1588, 835, 1602, 900),   # its line and chevron
]
for x0, y0, x1, y1 in BOXES:
    m[y0:y1, x0:x1] = 1
m = cv2.dilate(m, np.ones((7, 7), np.uint8))

bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
out = np.zeros_like(bgr)
cv2.xphoto.inpaint(bgr, (1 - m) * 255, out, cv2.xphoto.INPAINT_FSR_FAST)
cv2.imwrite(DST, out)
print('filled', int(m.sum()), 'px')
