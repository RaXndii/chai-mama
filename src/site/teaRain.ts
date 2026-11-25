import { LEAF_CELLS, LEAF_LIT_Y, LEAF_SOFT_Y } from './teaLeaves';

/**
 * The tea falling through Chai Mama's page (DECISIONS CM-010, CM-012): real loose Ceylon tea, cut from the
 * owner's photo (scripts/chaimama/tea_leaves.py), drifting down through the tea country and on over every part
 * of the page.
 *
 * Each piece has a depth. Far ones are small, slow and hazy; nearer ones larger, quicker and darker; a very few
 * fall right past the camera, large and out of focus, near the screen's edges (never across the shop's words,
 * the pack or its buttons, which sit between the two canvases). Every piece falls at its own speed, sways on
 * its own beat, spins, and tumbles about its long axis (it narrows to an edge and widens again, the other side
 * up), and a gentle breeze with now and then a gust carries them all sideways, the near ones more. A piece that
 * leaves the bottom comes back in above the top somewhere else, so the fall never comes in batches.
 *
 * How much tea there is follows the page (`intensity`, 0 … 1, from the scroll): each piece has its own point
 * on that scale where it fades in out of the haze, so the rain thickens and thins smoothly as the visitor
 * scrolls, and is the same for the same scroll. Under reduced motion the pieces hang still.
 */

export interface Leaf {
  /** Screen position (CSS px) of the piece's centre. */
  x: number;
  y: number;
  /** Depth: 0 far … 1 near (the front layer is all 1). */
  z: number;
  /** Which piece of the atlas. */
  cell: number;
  /** Length along its long axis on screen (CSS px). */
  size: number;
  /** Fall speed (px/s). */
  vy: number;
  /** Sway: amplitude (px), rate (rad/s) and phase. */
  swayA: number;
  swayW: number;
  phase: number;
  /** Turn in the screen's plane (rad) and its rate (rad/s). */
  rot: number;
  spin: number;
  /** Tumble about the long axis (rad) and its rate (rad/s). */
  flip: number;
  flipW: number;
  /** Its opacity when fully in (the haze takes the far ones). */
  alpha: number;
  /** Drawn from the softened copy (a near piece, out of focus). */
  soft: boolean;
  /** Where on the intensity scale it fades in (0 … 1). */
  at: number;
}

export type Layer = 'back' | 'front';

/** A small, seeded random source (mulberry32), so the same seed makes the same rain. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const SINGLES = LEAF_CELLS.flatMap((c, i) => (c[4] ? [] : [i]));
const CLUMPS = LEAF_CELLS.flatMap((c, i) => (c[4] ? [i] : []));

/**
 * How many pieces fall at full intensity on a screen this size: in proportion to its area (a phone gets
 * fewer), fewer again on the lite tier.
 */
export function rainCounts(vw: number, vh: number, lite: boolean): Record<Layer, number> {
  const area = (vw * vh) / (1440 * 900);
  const k = lite ? 0.5 : 1;
  return {
    back: Math.round(Math.min(96, Math.max(32, 72 * area)) * k),
    front: Math.round((vw < 720 ? 2 : vw < 1100 ? 3 : 5) * (lite ? 0.6 : 1)),
  };
}

/**
 * Where a piece comes in across the screen: anywhere for the back. The near ones keep to the picture's side:
 * on a landscape screen the shop is on the right, so the left edge; on a phone, where the shop's card spans
 * the screen, they only brush its very edges.
 */
function laneX(layer: Layer, vw: number, rnd: () => number): number {
  if (layer === 'back') return lerp(-0.04, 1.04, rnd()) * vw;
  if (vw > 900) return lerp(-0.05, 0.11, rnd()) * vw;
  return (rnd() < 0.5 ? lerp(-0.06, 0.03, rnd()) : lerp(0.97, 1.06, rnd())) * vw;
}

function pick(rnd: () => number, layer: Layer): number {
  // Mostly single leaves; now and then a little clump of them (never one up close).
  const pool = layer === 'back' && CLUMPS.length && rnd() < 0.2 ? CLUMPS : SINGLES;
  return pool[Math.floor(rnd() * pool.length)]!;
}

function shape(l: Leaf, layer: Layer, rnd: () => number) {
  l.cell = pick(rnd, layer);
  const clump = LEAF_CELLS[l.cell]![4] === 1;
  if (layer === 'front') {
    l.size = lerp(56, 96, rnd());
    l.vy = lerp(210, 300, rnd());
    l.alpha = lerp(0.8, 0.92, rnd());
    l.soft = true;
  } else {
    const z = l.z;
    l.size = lerp(9, 30, Math.pow(z, 1.15)) * lerp(0.85, 1.2, rnd()) * (clump ? 1.35 : 1);
    l.vy = lerp(48, 150, z) * lerp(0.82, 1.18, rnd());
    // The far ones are in the haze; the near ones are dark against anything.
    l.alpha = lerp(0.5, 0.96, Math.pow(z, 0.8));
    l.soft = false;
  }
  l.swayA = lerp(5, 22, rnd()) * (0.5 + l.z);
  l.swayW = lerp(0.5, 1.6, rnd());
  l.phase = rnd() * Math.PI * 2;
  l.rot = rnd() * Math.PI * 2;
  l.spin = lerp(0.25, 1.5, rnd()) * (rnd() < 0.5 ? -1 : 1);
  l.flip = rnd() * Math.PI * 2;
  l.flipW = lerp(1, 3.4, rnd()) * (rnd() < 0.5 ? -1 : 1);
}

/** The pieces of one layer for a screen, already spread over it (the rain is falling when it is first seen). */
export function createField(layer: Layer, n: number, vw: number, vh: number, seed: number): Leaf[] {
  const rnd = seeded(seed);
  const leaves: Leaf[] = [];
  for (let i = 0; i < n; i++) {
    const l: Leaf = {
      x: laneX(layer, vw, rnd),
      y: lerp(-0.1, 1.05, rnd()) * vh,
      z: layer === 'front' ? 1 : rnd(),
      cell: 0,
      size: 0,
      vy: 0,
      swayA: 0,
      swayW: 0,
      phase: 0,
      rot: 0,
      spin: 0,
      flip: 0,
      flipW: 0,
      alpha: 1,
      soft: false,
      at: 0,
    };
    shape(l, layer, rnd);
    leaves.push(l);
  }
  // Their points on the intensity scale: spread evenly, in no order across the screen.
  const order = leaves.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  order.forEach((li, k) => (leaves[li]!.at = (k + 0.5) / n));
  // Far first, so the near ones are drawn over them.
  return leaves.sort((a, b) => a.z - b.z);
}

/** The breeze across the screen at time `t` (s), px/s: a slow swing, a second slower one, and a gust now and then. */
export function breeze(t: number): number {
  const gust = Math.pow(Math.max(0, Math.sin(t * 0.09 + 0.6)), 8);
  return 12 * Math.sin(t * 0.13) + 7 * Math.sin(t * 0.29 + 1.3) + 46 * gust;
}

/** Moves every piece on by `dt` seconds at time `t`; one past the bottom comes in again above the top. */
export function stepField(
  leaves: Leaf[],
  layer: Layer,
  dt: number,
  t: number,
  vw: number,
  vh: number,
  rnd: () => number,
): void {
  const wind = breeze(t);
  for (const l of leaves) {
    const drift = wind * (0.35 + 0.65 * l.z);
    l.y += l.vy * dt;
    l.x += (drift + Math.cos(l.phase + t * l.swayW) * l.swayA * l.swayW * 0.6) * dt;
    l.rot += l.spin * dt;
    l.flip += l.flipW * dt;
    const r = l.size * 0.6;
    if (l.y - r > vh || l.x < -vw * 0.12 || l.x > vw * 1.12) {
      shape(l, layer, rnd);
      l.x = laneX(layer, vw, rnd) - wind * 1.5;
      l.y = -r - rnd() * vh * 0.2;
    }
  }
}

/** How far in a piece is at this intensity (0 … 1): it fades in over a short stretch of the scale. */
export function presence(l: Leaf, intensity: number): number {
  return Math.min(1, Math.max(0, (intensity * 1.12 - l.at) / 0.12));
}

/** Draws the pieces (the canvas is `dpr` device px per CSS px); returns how many it drew. */
export function drawField(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  leaves: readonly Leaf[],
  atlas: CanvasImageSource,
  intensity: number,
  dpr: number,
  opts: {
    /** Clear the canvas first (false: draw over what is there, a second field on the same canvas). */
    clear?: boolean;
    /** How far the pieces are lit (0 … 1): over the page's dark end they catch a warm light (CM-012). */
    lit?: number;
  } = {},
): number {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (opts.clear !== false) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (intensity <= 0) return 0;
  let n = 0;
  const lit = Math.min(1, Math.max(0, opts.lit ?? 0));
  for (const l of leaves) {
    const a = l.alpha * presence(l, intensity);
    if (a < 0.01) continue;
    n++;
    const [cx, cy, w, h] = LEAF_CELLS[l.cell]!;
    const s = (l.size / w) * dpr;
    // Tumbling: the short axis narrows to an edge and opens out again (never quite to nothing).
    const f = Math.cos(l.flip);
    const fy = Math.sign(f || 1) * Math.max(0.16, Math.abs(f));
    const c = Math.cos(l.rot);
    const si = Math.sin(l.rot);
    ctx.setTransform(c * s, si * s, -si * s * fy, c * s * fy, l.x * dpr, l.y * dpr);
    // The near pieces are always the softened ones; the others are drawn plain, lit, or (as the dark end
    // comes up) the one fading into the other.
    if (l.soft) {
      ctx.globalAlpha = a;
      ctx.drawImage(atlas, cx, cy + LEAF_SOFT_Y, w, h, -w / 2, -h / 2, w, h);
      continue;
    }
    if (lit < 0.99) {
      ctx.globalAlpha = a * (1 - lit);
      ctx.drawImage(atlas, cx, cy, w, h, -w / 2, -h / 2, w, h);
    }
    if (lit > 0.01) {
      ctx.globalAlpha = a * lit;
      ctx.drawImage(atlas, cx, cy + LEAF_LIT_Y, w, h, -w / 2, -h / 2, w, h);
    }
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return n;
}

export interface RainLevels {
  /** The tea in the picture (the hero and the shop: behind their words). */
  back: number;
  /** The tea over the sections below the picture (lighter, so the words stay easy to read). */
  sections: number;
  /** How far the page's dark end is under the tea (0 … 1): there the pieces catch a warm light. */
  dark?: number;
}

/** A 2D context the rain can draw with: a page canvas's, or a worker's OffscreenCanvas's. */
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Surface = HTMLCanvasElement | OffscreenCanvas;

/** What the rain reports now and then: how many pieces each canvas drew, and how many frames have gone by. */
export interface RainStats {
  back: number;
  front: number;
  frames: number;
}

export interface RainEngine {
  /** The screen's size (CSS px) and the canvases' pixels per CSS px. */
  resize(w: number, h: number, dpr: number): void;
  setLevels(levels: RainLevels): void;
  /** The page is hidden (nothing is drawn) or shown again. */
  setHidden(hidden: boolean): void;
  destroy(): void;
}

/** The sections' fall is this much of the picture's (and sparser still on a phone). */
const SECTIONS_SHARE = 0.55;
/** How often the engine reports its stats (frames). */
const STATS_EVERY = 20;

/**
 * The rain itself, on two canvases (CM-010, CM-012), wherever it runs (the page, or a worker): `back`, in the
 * picture, behind the shop's words and the pack; `front`, fixed over the whole page under the header, with the
 * few large near pieces and, once the picture has gone up, the tea falling over the rest of the page. It only
 * draws while there is tea to see and the page is visible; `still` (reduced motion) draws the pieces where they
 * hang, once per change.
 *
 * It keeps an eye on its own pace: if the device cannot hold the frame rate, fewer pieces fall, and on a very
 * slow one the tea moves every other frame — the page's scrolling always comes first.
 */
export function createRainEngine(
  back: Surface,
  front: Surface,
  atlas: CanvasImageSource,
  opts: { lite: boolean; still: boolean },
  clock: { raf: (cb: (now: number) => void) => number; caf: (id: number) => void },
  onStats?: (s: RainStats) => void,
): RainEngine {
  const ctxB = back.getContext('2d') as Ctx2D | null;
  const ctxF = front.getContext('2d') as Ctx2D | null;
  let vw = 0;
  let vh = 0;
  let dpr = 1;
  let fields: { back: Leaf[]; over: Leaf[]; front: Leaf[] } = { back: [], over: [], front: [] };
  const rnd = seeded(20261022);
  const level = { back: 0, sections: 0, dark: 0 };
  let hidden = false;
  let raf = 0;
  let last = 0;
  let t = 0;
  // The pace watch: a running mean of the frame interval (ms), and what it allows.
  const most = opts.lite ? 0.6 : 1;
  let pace = 16.7;
  let budget = most;
  let odd = false;
  let frames = 0;
  const drawn = { back: 0, front: 0 };

  const draw = () => {
    if (ctxB) drawn.back = drawField(ctxB, fields.back, atlas, level.back * budget, dpr);
    if (ctxF) {
      // The near pieces are with the tea wherever it falls.
      drawn.front = drawField(ctxF, fields.over, atlas, level.sections * budget, dpr, { lit: level.dark });
      drawn.front += drawField(
        ctxF,
        fields.front,
        atlas,
        Math.max(level.back, level.sections) * budget,
        dpr,
        {
          clear: false,
        },
      );
    }
  };
  const report = () => onStats?.({ back: drawn.back, front: drawn.front, frames });
  const frame = (now: number) => {
    raf = 0;
    const ms = last ? now - last : 16.7;
    last = now;
    // Over about a second and a half: slower than ~40 fps, fewer pieces; slower than ~25, every other frame.
    pace += (Math.min(ms, 100) - pace) * 0.03;
    if (pace > 24 && budget > 0.45) budget = Math.max(0.45, budget - 0.004);
    else if (pace < 19 && budget < most) budget = Math.min(most, budget + 0.002);
    odd = !odd;
    if (pace > 40 && odd) return schedule();
    const dt = Math.min(0.06, ms / 1000);
    t += dt;
    if (level.back > 0) stepField(fields.back, 'back', dt, t, vw, vh, rnd);
    if (level.sections > 0) stepField(fields.over, 'back', dt, t, vw, vh, rnd);
    stepField(fields.front, 'front', dt, t, vw, vh, rnd);
    draw();
    if (++frames % STATS_EVERY === 0) report();
    schedule();
  };
  const on = () => level.back > 0 || level.sections > 0;
  const schedule = () => {
    if (raf || opts.still || !on() || hidden) {
      if (!raf) last = 0;
      return;
    }
    raf = clock.raf(frame);
  };
  return {
    resize(w, h, ratio) {
      dpr = ratio;
      for (const c of [back, front]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      if (w !== vw || h !== vh) {
        const n = rainCounts(w, h, opts.lite);
        fields = {
          back: createField('back', n.back, w, h, 7),
          over: createField('back', Math.round(n.back * SECTIONS_SHARE * (w < 720 ? 0.8 : 1)), w, h, 23),
          front: createField('front', n.front, w, h, 11),
        };
        vw = w;
        vh = h;
      }
      for (const ctx of [ctxB, ctxF]) if (ctx) ctx.imageSmoothingQuality = 'high';
      draw();
      report();
    },
    setLevels(next) {
      const b = Math.min(1, Math.max(0, next.back));
      const sec = Math.min(1, Math.max(0, next.sections));
      const dark = Math.min(1, Math.max(0, next.dark ?? 0));
      const moved = Math.abs(b - level.back) + Math.abs(sec - level.sections) + Math.abs(dark - level.dark);
      if (moved < 0.003) return;
      const wasOff = !on();
      level.back = b;
      level.sections = sec;
      level.dark = dark;
      // A still rain (or one that has just gone) is drawn now; a falling one at its next frame.
      if (opts.still || !on() || wasOff) {
        draw();
        report();
      }
      schedule();
    },
    setHidden(h) {
      hidden = h;
      schedule();
    },
    destroy() {
      clock.caf(raf);
      raf = 0;
    },
  };
}

/** The messages the page sends the rain's worker (`teaRain.worker.ts`). */
export type RainMessage =
  | { type: 'init'; back: OffscreenCanvas; front: OffscreenCanvas; opts: { lite: boolean; still: boolean } }
  | { type: 'atlas'; atlas: ImageBitmap }
  | { type: 'resize'; w: number; h: number; dpr: number }
  | { type: 'levels'; levels: RainLevels }
  | { type: 'hidden'; hidden: boolean }
  | { type: 'stop' };

export interface TeaRain {
  /** How much tea is falling where (each 0 … 1). */
  setLevels(levels: RainLevels): void;
  /** Re-fit the canvases to the screen. */
  resize(): void;
  /** Rest (no frames) while something covers the page, such as the checkout (CM-019). */
  rest(resting: boolean): void;
  destroy(): void;
}

/** Crisp enough for the leaves' texture, never the full 2–3× of a phone: every frame the canvases go to the
 *  screen whole, so each pixel saved is saved sixty times a second (CM-011). */
const rainDpr = () => Math.min(window.devicePixelRatio || 1, 1.5);

/**
 * Starts the rain on the page's two canvases (CM-012). Where the browser can, it runs in a worker: the canvases
 * are handed over (OffscreenCanvas) and the falling, the turning and the drawing all happen off the page's own
 * thread, so the page only tells it the screen's size and how much tea there is where — scrolling never waits
 * for the tea. Elsewhere the same engine runs on the page. The canvases carry what it reports
 * (`data-pieces`: pieces drawn on each; `data-frames`).
 */
export function startTeaRain(
  back: HTMLCanvasElement,
  front: HTMLCanvasElement,
  atlas: HTMLImageElement,
  opts: { lite: boolean; still: boolean },
): TeaRain {
  const show = (s: RainStats) => {
    back.dataset.pieces = String(s.back);
    front.dataset.pieces = String(s.front);
    back.dataset.frames = front.dataset.frames = String(s.frames);
  };
  const size = () => ({ w: window.innerWidth, h: window.innerHeight, dpr: rainDpr() });
  const canWork =
    typeof Worker !== 'undefined' &&
    typeof createImageBitmap === 'function' &&
    'transferControlToOffscreen' in back;
  if (canWork) {
    const worker = new Worker(new URL('./teaRain.worker.ts', import.meta.url), { type: 'module' });
    const post = (m: RainMessage, transfer: Transferable[] = []) => worker.postMessage(m, transfer);
    worker.onmessage = (e: MessageEvent<RainStats>) => show(e.data);
    const offBack = back.transferControlToOffscreen();
    const offFront = front.transferControlToOffscreen();
    post({ type: 'init', back: offBack, front: offFront, opts }, [offBack, offFront]);
    post({ type: 'resize', ...size() });
    void createImageBitmap(atlas).then((bitmap) => post({ type: 'atlas', atlas: bitmap }, [bitmap]));
    let resting = false;
    const onVisible = () => post({ type: 'hidden', hidden: document.hidden || resting });
    document.addEventListener('visibilitychange', onVisible);
    // Only a real change is sent (the page asks on every frame of a scroll).
    let sent = { back: -1, sections: -1, dark: -1 };
    return {
      setLevels(levels) {
        const d = levels.dark ?? 0;
        const moved = Math.abs(levels.back - sent.back) + Math.abs(levels.sections - sent.sections);
        if (moved + Math.abs(d - sent.dark) < 0.003) return;
        sent = { back: levels.back, sections: levels.sections, dark: d };
        post({ type: 'levels', levels });
      },
      resize: () => post({ type: 'resize', ...size() }),
      rest(r) {
        resting = r;
        onVisible();
      },
      destroy() {
        document.removeEventListener('visibilitychange', onVisible);
        post({ type: 'stop' });
        worker.terminate();
      },
    };
  }
  const engine = createRainEngine(
    back,
    front,
    atlas,
    opts,
    { raf: (cb) => requestAnimationFrame(cb), caf: (id) => cancelAnimationFrame(id) },
    show,
  );
  let resting = false;
  const onVisible = () => engine.setHidden(document.hidden || resting);
  document.addEventListener('visibilitychange', onVisible);
  const fit = () => {
    const s = size();
    engine.resize(s.w, s.h, s.dpr);
  };
  fit();
  return {
    setLevels: (levels) => engine.setLevels(levels),
    resize: fit,
    rest(r) {
      resting = r;
      onVisible();
    },
    destroy() {
      document.removeEventListener('visibilitychange', onVisible);
      engine.destroy();
    },
  };
}
