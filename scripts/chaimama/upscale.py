# Chai Mama's hero picture (DECISIONS CM-006, CM-008; first written for CM-002): 2× super-resolution before
# hero_scene.py. Offline, not part of the build.
#
#   python3 -I scripts/chaimama/upscale.py <realesr-general-x4v3.pth> <in.png> <out.png> [scale=2]
#
# Real-ESRGAN's compact general model (BSD-3-Clause, github.com/xinntao/Real-ESRGAN, release v0.2.5.0
# realesr-general-x4v3.pth), run in plain numpy so no deep-learning framework is needed: the .pth is read
# with a minimal unpickler, the network (SRVGGNetCompact: 34 3×3 convolutions with PReLU, then a 4× pixel
# shuffle added to the nearest-upscaled input) is evaluated tile by tile, and the 4× result is resized to
# `scale`. The owner's homepage picture is 1672×940; the large screens want ~3000 px across.
import io, pickle, sys, zipfile, collections
import numpy as np, cv2

WEIGHTS, SRC, DST = sys.argv[1], sys.argv[2], sys.argv[3]
SCALE = float(sys.argv[4]) if len(sys.argv) > 4 else 2.0
TILE, PAD = 320, 36  # the network sees 34 px around each pixel


def load_pth(path):
    z = zipfile.ZipFile(path)
    root = z.namelist()[0].split('/')[0]

    class Unpickler(pickle.Unpickler):
        def find_class(self, mod, name):
            if mod == 'torch._utils' and name == '_rebuild_tensor_v2':
                def rebuild(storage, offset, size, stride, *_):
                    a = np.lib.stride_tricks.as_strided(storage[offset:], shape=size, strides=[s * 4 for s in stride])
                    return np.array(a, dtype=np.float32)
                return rebuild
            if mod == 'collections' and name == 'OrderedDict':
                return collections.OrderedDict
            if mod == 'torch':
                return name  # storage types: only their name is needed
            return super().find_class(mod, name)

        def persistent_load(self, pid):
            _, _, key, _, _ = pid
            return np.frombuffer(z.read(f'{root}/data/{key}'), dtype=np.float32)

    sd = Unpickler(io.BytesIO(z.read(f'{root}/data.pkl'))).load()
    return sd.get('params_ema', sd.get('params', sd))


def conv3(x, w, b):
    xp = np.pad(x, ((0, 0), (1, 1), (1, 1)))
    cols = np.lib.stride_tricks.sliding_window_view(xp, (3, 3), axis=(1, 2))  # C,H,W,3,3
    c, h, wd = x.shape
    cols = np.ascontiguousarray(cols.transpose(0, 3, 4, 1, 2)).reshape(c * 9, h * wd)
    return (w.reshape(w.shape[0], -1) @ cols).reshape(w.shape[0], h, wd) + b[:, None, None]


def net(sd, x):
    """SRVGGNetCompact on one tile, x: 3×H×W in 0–1 → 3×4H×4W."""
    convs = sorted({int(k.split('.')[1]) for k in sd if k.endswith('.weight') and sd[k].ndim == 4})
    y = x
    for i in convs:
        y = conv3(y, sd[f'body.{i}.weight'], sd[f'body.{i}.bias'])
        a = sd.get(f'body.{i + 1}.weight')
        if a is not None and a.ndim == 1:  # PReLU
            y = np.where(y > 0, y, a[:, None, None] * y)
    c, h, w = y.shape
    r = 4
    y = y.reshape(3, r, r, h, w).transpose(0, 3, 1, 4, 2).reshape(3, h * r, w * r)
    return y + x.repeat(r, 1).repeat(r, 2)


sd = load_pth(WEIGHTS)
img = cv2.cvtColor(cv2.imread(SRC), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
H, W = img.shape[:2]
x = img.transpose(2, 0, 1)
out = np.zeros((3, H * 4, W * 4), np.float32)
for y0 in range(0, H, TILE):
    for x0 in range(0, W, TILE):
        y1, x1 = min(H, y0 + TILE), min(W, x0 + TILE)
        a0, b0 = max(0, y0 - PAD), max(0, x0 - PAD)
        a1, b1 = min(H, y1 + PAD), min(W, x1 + PAD)
        t = net(sd, x[:, a0:a1, b0:b1])
        out[:, y0 * 4:y1 * 4, x0 * 4:x1 * 4] = t[:, (y0 - a0) * 4:(y1 - a0) * 4, (x0 - b0) * 4:(x1 - b0) * 4]
    print(f'{y1}/{H}', flush=True)
big = np.clip(out.transpose(1, 2, 0), 0, 1)
res = cv2.resize(big, (round(W * SCALE), round(H * SCALE)), interpolation=cv2.INTER_AREA)
cv2.imwrite(DST, cv2.cvtColor((res * 255).round().astype(np.uint8), cv2.COLOR_RGB2BGR))
