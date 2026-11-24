"""Chai Mama's hero plates for phones held upright (DECISIONS CM-012). Offline, not part of the build.

    python3 scripts/chaimama/narrow_plates.py src/scenes/chaimama/arrival/layers

A phone held upright only ever sees a narrow band of the hero's picture: the pack, its rock and a little either
side (layer x 422 … 1142 at most, over every phone size, the entrance's glide and the shop's move in; see
`arrival.test.ts`). Yet it decoded the whole 2× plate, 4144 px across — about 38 MB of memory for the far country
alone. This cuts each wide 2× plate (the far country, the sky behind the ranges, the rock; day and dusk; sharp
and softened) and the sky's ridgeline mask to layer x 360 … 1200 (NARROW in `site/arrival.ts`), which the page
places exactly where the band was: 59% less to fetch, decode and keep. Needs Pillow.
"""
import sys
from PIL import Image

DIR = sys.argv[1]
X0, X1 = 360, 1200  # layer px (the 1× plate's pixels); must match NARROW in site/arrival.ts
for name in ['far', 'far-dusk', 'far-soft', 'far-dusk-soft', 'sky', 'sky-dusk', 'sky-soft', 'sky-dusk-soft', 'ledge', 'ledge-dusk']:
    im = Image.open(f'{DIR}/{name}-2x.webp')
    assert im.width == 4144, (name, im.size)
    im.crop((X0 * 2, 0, X1 * 2, im.height)).save(f'{DIR}/{name}-narrow.webp', 'WEBP', quality=86, method=6)
mask = Image.open(f'{DIR}/sky-mask.png')
assert mask.width == 2072, mask.size
mask.crop((X0, 0, X1, mask.height)).save(f'{DIR}/sky-mask-narrow.png', optimize=True)
