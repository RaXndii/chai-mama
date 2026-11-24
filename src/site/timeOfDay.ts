/**
 * The blend switch as time passing in one shot (DECISIONS CM-008).
 *
 * One number, `t`, is the time of day in the hero: 0 is the earlier light (Heritage Blend), 1 the later one
 * (The Lovely Blend). Everything in the scene is read from it, so the product, the light and the air always
 * move together, and a new choice mid-way simply turns `t` round from wherever it is — nothing jumps, nothing
 * waits for a move to finish. The camera, the rock, the hills and the pack's place never change.
 *
 * Over the move: the sky turns first and the near ground last (the light comes down from the sky to the rock);
 * the sun travels a short way down toward the ranges; the clouds drift on; the mist takes the gold; and in the
 * middle of it the incoming pack is uncovered across the old one, from the sun's side, by a soft edge.
 */

/** A whole move, earlier ↔ later (ms); under reduced motion, a short even fade. */
export const TIME_MS = 2400;
export const CALM_TIME_MS = 450;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 0 → 1 between `a` and `b`, smooth at both ends. */
export function smoothstep(x: number, a: number, b: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Slow to start, slow to settle (the pace of the light), never steep in the middle. */
export const easeTime = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

export interface Scene {
  /** How far each layer's later plate is faded in (0..1). */
  sky: number;
  far: number;
  near: number;
  /** The mist's gold. */
  mist: number;
  /** The sun between its earlier (0) and later (1) place. */
  sun: number;
  /** How far the clouds have drifted (0..1 of the drift). */
  drift: number;
  /**
   * The incoming pack's edge across the box (0: the later pack fully covered, 1: fully uncovered). The pack
   * is the main event, in the middle of the move; the light leads into it and settles after it.
   */
  pack: number;
}

/** The scene at time of day `t` (0 earlier … 1 later); `calm`: everything at the same pace, no travel. */
export function sceneAt(t: number, calm = false): Scene {
  const x = clamp01(t);
  if (calm) {
    return { sky: x, far: x, near: x, mist: x, sun: x < 0.5 ? 0 : 1, drift: x < 0.5 ? 0 : 1, pack: x };
  }
  return {
    sky: smoothstep(x, 0, 0.82),
    far: smoothstep(x, 0.06, 0.9),
    near: smoothstep(x, 0.16, 1),
    mist: smoothstep(x, 0.1, 0.92),
    sun: smoothstep(x, 0, 1),
    drift: smoothstep(x, 0, 1),
    // Even over most of the move (the move's own pace already eases it in and out): the edge crosses the pack
    // in about a second and a half, never as a quick wipe.
    pack: clamp01((x - 0.12) / 0.76),
  };
}

/**
 * Moves `t` toward a target over time and calls `apply` every frame. `to()` mid-move turns it round from where
 * it is; the time left is in proportion to the way left, so a quick change of mind is a quick move back.
 * `settled` is called once the move it came with arrives (not for a move that was turned round).
 */
export function timeline(apply: (t: number) => void, initial: number) {
  let t = initial;
  let raf = 0;
  let from = initial;
  let target = initial;
  let start = 0;
  let dur = 0;
  let settled: (() => void) | undefined;
  const step = (now: number) => {
    if (!start) start = now;
    const p = dur > 0 ? clamp01((now - start) / dur) : 1;
    t = from + (target - from) * easeTime(p);
    apply(t);
    if (p < 1) {
      raf = requestAnimationFrame(step);
      return;
    }
    raf = 0;
    const done = settled;
    settled = undefined;
    done?.();
  };
  return {
    get t() {
      return t;
    },
    get moving() {
      return raf !== 0;
    },
    to(next: number, ms: number, onSettled?: () => void) {
      if (next === target && raf) {
        settled = onSettled;
        return;
      }
      cancelAnimationFrame(raf);
      from = t;
      target = next;
      dur = ms * Math.abs(target - from);
      start = 0;
      settled = onSettled;
      if (dur <= 0) {
        t = target;
        apply(t);
        raf = 0;
        settled = undefined;
        onSettled?.();
        return;
      }
      raf = requestAnimationFrame(step);
    },
    set(next: number) {
      cancelAnimationFrame(raf);
      raf = 0;
      settled = undefined;
      t = from = target = next;
      apply(t);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      settled = undefined;
    },
  };
}
