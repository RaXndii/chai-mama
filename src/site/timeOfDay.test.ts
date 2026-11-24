import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { easeTime, sceneAt, timeline, TIME_MS } from './timeOfDay';

describe('the blend switch as time passing (CM-008)', () => {
  it('everything starts together and settles together, the pack in the middle of the move', () => {
    const a = sceneAt(0);
    const b = sceneAt(1);
    for (const k of Object.keys(a) as (keyof typeof a)[]) {
      expect(a[k]).toBe(0);
      expect(b[k]).toBe(1);
    }
    // Early on the light has started to turn while the pack has not; late, the pack is all there while the
    // near ground is still settling.
    expect(sceneAt(0.1).sky).toBeGreaterThan(0);
    expect(sceneAt(0.1).pack).toBe(0);
    expect(sceneAt(0.88).pack).toBe(1);
    expect(sceneAt(0.88).near).toBeLessThan(1);
    // The light comes down from the sky to the rock.
    const mid = sceneAt(0.5);
    expect(mid.sky).toBeGreaterThan(mid.far);
    expect(mid.far).toBeGreaterThan(mid.near);
  });

  it('under reduced motion: one even fade, no travel', () => {
    const s = sceneAt(0.3, true);
    expect(s.sky).toBeCloseTo(0.3);
    expect(s.pack).toBeCloseTo(0.3);
    expect(s.sun).toBe(0);
    expect(sceneAt(0.7, true).sun).toBe(1);
  });

  it('the pack turns evenly through the middle of the move', () => {
    expect(sceneAt(0.5).pack).toBeCloseTo(0.5, 1);
    expect(sceneAt(0.3).pack).toBeGreaterThan(0.2);
    expect(sceneAt(0.7).pack).toBeLessThan(0.8);
  });

  it('eases in and out', () => {
    expect(easeTime(0)).toBe(0);
    expect(easeTime(1)).toBe(1);
    expect(easeTime(0.5)).toBeCloseTo(0.5);
    expect(easeTime(0.1)).toBeLessThan(0.1);
  });
});

describe('the time-of-day timeline', () => {
  let now = 0;
  let frames: FrameRequestCallback[] = [];
  const run = (ms: number) => {
    const end = now + ms;
    while (now < end) {
      now += 16;
      const due = frames;
      frames = [];
      for (const f of due) f(now);
    }
  };
  beforeEach(() => {
    now = 0;
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f));
    vi.stubGlobal('cancelAnimationFrame', () => {
      frames = [];
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('goes the whole way in the whole time and says when it has settled', () => {
    const seen: number[] = [];
    const done = vi.fn();
    const c = timeline((t) => seen.push(t), 0);
    c.to(1, TIME_MS, done);
    run(TIME_MS / 2);
    expect(c.t).toBeGreaterThan(0.3);
    expect(c.t).toBeLessThan(0.7);
    expect(done).not.toHaveBeenCalled();
    run(TIME_MS);
    expect(c.t).toBe(1);
    expect(done).toHaveBeenCalledTimes(1);
    // Never a step back on the way.
    for (let i = 1; i < seen.length; i++) expect(seen[i]!).toBeGreaterThanOrEqual(seen[i - 1]!);
  });

  it('a change of mind mid-way turns round from where it is, with no jump, and only the last move settles', () => {
    const seen: number[] = [];
    const first = vi.fn();
    const second = vi.fn();
    const c = timeline((t) => seen.push(t), 0);
    c.to(1, TIME_MS, first);
    run(TIME_MS * 0.4);
    const at = c.t;
    c.to(0, TIME_MS, second);
    run(16);
    expect(Math.abs(c.t - at)).toBeLessThan(0.02);
    // The way back is as long as the way come.
    run(TIME_MS * at - 16 - 32);
    expect(c.t).toBeGreaterThan(0);
    run(200);
    expect(c.t).toBe(0);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    for (let i = 1; i < seen.length; i++) expect(Math.abs(seen[i]! - seen[i - 1]!)).toBeLessThan(0.05);
  });
});
