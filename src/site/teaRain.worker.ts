import { createRainEngine, type RainEngine, type RainLevels, type RainMessage } from './teaRain';

/**
 * The falling tea, off the page's thread (DECISIONS CM-012). The page hands over its two canvases and the
 * pieces' atlas; this runs the same engine as the page would (`createRainEngine`) on the worker's own frames,
 * and the page only sends the screen's size, how much tea falls where, and whether the page is hidden.
 */
// The worker's own globals, as far as this uses them (the project's types are the page's, not a worker's).
interface WorkerScope {
  onmessage: ((e: MessageEvent<RainMessage>) => void) | null;
  postMessage(message: unknown): void;
  requestAnimationFrame?: (cb: (now: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
}
const scope = self as unknown as WorkerScope;

// A worker's own frames where the browser gives it them, otherwise a steady 60 a second.
const raf = (cb: (now: number) => void): number =>
  scope.requestAnimationFrame
    ? scope.requestAnimationFrame(cb)
    : (setTimeout(() => cb(performance.now()), 16) as unknown as number);
const caf = (id: number) => (scope.cancelAnimationFrame ? scope.cancelAnimationFrame(id) : clearTimeout(id));

let canvases: { back: OffscreenCanvas; front: OffscreenCanvas } | null = null;
let opts = { lite: false, still: false };
let engine: RainEngine | null = null;
// What the page has said before the engine could start (the atlas arrives a moment after the canvases).
let size: { w: number; h: number; dpr: number } | null = null;
let levels: RainLevels | null = null;
let hidden = false;

const start = (atlas: ImageBitmap) => {
  if (!canvases || engine) return;
  engine = createRainEngine(canvases.back, canvases.front, atlas, opts, { raf, caf }, (s) =>
    scope.postMessage(s),
  );
  engine.setHidden(hidden);
  if (size) engine.resize(size.w, size.h, size.dpr);
  if (levels) engine.setLevels(levels);
};

scope.onmessage = (e) => {
  const m = e.data;
  switch (m.type) {
    case 'init':
      canvases = { back: m.back, front: m.front };
      opts = m.opts;
      break;
    case 'atlas':
      start(m.atlas);
      break;
    case 'resize':
      size = { w: m.w, h: m.h, dpr: m.dpr };
      engine?.resize(m.w, m.h, m.dpr);
      break;
    case 'levels':
      levels = m.levels;
      engine?.setLevels(m.levels);
      break;
    case 'hidden':
      hidden = m.hidden;
      engine?.setHidden(m.hidden);
      break;
    case 'stop':
      engine?.destroy();
      engine = null;
      break;
  }
};
