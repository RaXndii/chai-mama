import { describe, expect, it } from 'vitest';
import { LEAF_CELLS } from './teaLeaves';
import { breeze, createField, createRainEngine, presence, rainCounts, seeded, stepField } from './teaRain';

const VW = 1440;
const VH = 900;

describe('the tea falling through the shop (CM-010)', () => {
  it('is the same rain for the same seed, spread over the whole screen', () => {
    const a = createField('back', 72, VW, VH, 7);
    const b = createField('back', 72, VW, VH, 7);
    expect(a).toEqual(b);
    const xs = a.map((l) => l.x / VW);
    expect(Math.min(...xs)).toBeLessThan(0.1);
    expect(Math.max(...xs)).toBeGreaterThan(0.9);
    // Not only one band of the screen: every fifth of it has some.
    for (let k = 0; k < 5; k++) expect(xs.some((x) => x >= k / 5 && x < (k + 1) / 5)).toBe(true);
    for (const l of a) expect(l.cell).toBeLessThan(LEAF_CELLS.length);
  });

  it('has its depth: the far pieces smaller, slower and hazier than the near ones', () => {
    const f = createField('back', 96, VW, VH, 3);
    const far = f.filter((l) => l.z < 0.25);
    const near = f.filter((l) => l.z > 0.75);
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(mean(far.map((l) => l.size))).toBeLessThan(mean(near.map((l) => l.size)));
    expect(mean(far.map((l) => l.vy))).toBeLessThan(mean(near.map((l) => l.vy)));
    expect(mean(far.map((l) => l.alpha))).toBeLessThan(mean(near.map((l) => l.alpha)));
    // Drawn far first.
    for (let i = 1; i < f.length; i++) expect(f[i]!.z).toBeGreaterThanOrEqual(f[i - 1]!.z);
    // No two the same speed, no two the same beat.
    expect(new Set(f.map((l) => l.vy.toFixed(6))).size).toBe(f.length);
    expect(new Set(f.map((l) => l.swayW.toFixed(6))).size).toBe(f.length);
  });

  it('the near ones are few, large, out of focus and keep to the picture’s side', () => {
    const f = createField('front', 5, VW, VH, 11);
    expect(f).toHaveLength(5);
    for (const l of f) {
      expect(l.soft).toBe(true);
      expect(l.size).toBeGreaterThan(50);
      expect(l.x).toBeLessThan(VW * 0.12);
      // Single leaves only up close.
      expect(LEAF_CELLS[l.cell]![4]).toBe(0);
    }
    // A phone: both edges, barely on the screen.
    for (const l of createField('front', 4, 412, 915, 2))
      expect(l.x < 412 * 0.04 || l.x > 412 * 0.96).toBe(true);
  });

  it('falls steadily, and a piece out at the bottom comes back in above the top', () => {
    const f = createField('back', 40, VW, VH, 5);
    const rnd = seeded(1);
    const y0 = f.map((l) => l.y);
    stepField(f, 'back', 0.1, 0, VW, VH, rnd);
    f.forEach((l, i) => expect(l.y > y0[i]! || l.y < 0).toBe(true));
    let t = 0;
    let seen = 0;
    for (let k = 0; k < 600; k++) {
      t += 1 / 30;
      const before = f.map((l) => l.y);
      stepField(f, 'back', 1 / 30, t, VW, VH, rnd);
      f.forEach((l, i) => {
        if (l.y < before[i]!) {
          seen++;
          expect(l.y).toBeLessThan(0);
        }
      });
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('thickens smoothly with the scroll: none at 0, all at 1, more and more in between', () => {
    const f = createField('back', 60, VW, VH, 9);
    const shown = (x: number) => f.reduce((s, l) => s + presence(l, x), 0);
    expect(shown(0)).toBe(0);
    expect(shown(1)).toBe(f.length);
    let prev = 0;
    for (let x = 0.05; x <= 1.0001; x += 0.05) {
      const n = shown(x);
      expect(n).toBeGreaterThanOrEqual(prev);
      // Never a jump: at most a few pieces' worth for a twentieth of the scale.
      expect(n - prev).toBeLessThan(f.length * 0.12);
      prev = n;
    }
  });

  it('the breeze is gentle, now and then a gust, and the counts suit the screen', () => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let t = 0; t < 300; t += 0.25) {
      lo = Math.min(lo, breeze(t));
      hi = Math.max(hi, breeze(t));
    }
    expect(lo).toBeGreaterThan(-25);
    expect(hi).toBeLessThan(70);
    expect(hi).toBeGreaterThan(40);
    const desk = rainCounts(1440, 900, false);
    const phone = rainCounts(412, 915, false);
    expect(desk.back).toBeGreaterThan(phone.back);
    expect(desk.front).toBeGreaterThan(phone.front);
    expect(rainCounts(1440, 900, true).back).toBeLessThan(desk.back);
  });
});

describe('the rain keeps an eye on its own pace (CM-012)', () => {
  /** A canvas that counts what is drawn on it. */
  const fakeCanvas = () => {
    const c = { width: 0, height: 0, draws: 0 } as {
      width: number;
      height: number;
      draws: number;
      getContext: () => unknown;
    };
    const ctx = {
      canvas: c,
      globalAlpha: 1,
      imageSmoothingQuality: 'low',
      setTransform: () => {},
      clearRect: () => {},
      drawImage: () => void c.draws++,
    };
    c.getContext = () => ctx;
    return c;
  };
  /** Frames at a given interval, run by hand. */
  const fakeClock = () => {
    let queue: ((now: number) => void)[] = [];
    let now = 0;
    return {
      raf: (cb: (now: number) => void) => (queue.push(cb), queue.length),
      caf: () => (queue = []),
      run(n: number, ms: number) {
        for (let i = 0; i < n; i++) {
          now += ms;
          const q = queue;
          queue = [];
          for (const cb of q) cb(now);
        }
      },
    };
  };
  const setup = (still = false) => {
    const back = fakeCanvas();
    const front = fakeCanvas();
    const clock = fakeClock();
    const stats: { back: number; front: number; frames: number }[] = [];
    const engine = createRainEngine(
      back as unknown as HTMLCanvasElement,
      front as unknown as HTMLCanvasElement,
      {} as CanvasImageSource,
      { lite: false, still },
      clock,
      (s) => stats.push(s),
    );
    engine.resize(1440, 900, 1);
    return { back, front, clock, stats, engine };
  };

  it('on a slow device fewer pieces fall, then it moves every other frame; it comes back when it can', () => {
    const { back, clock, stats, engine } = setup();
    engine.setLevels({ back: 1, sections: 0 });
    clock.run(40, 16.7);
    const full = stats.at(-1)!.back;
    expect(full).toBeGreaterThan(40);
    // Frames of 45 ms: it thins out, and draws only every other frame.
    clock.run(400, 45);
    const slow = stats.at(-1)!.back;
    expect(slow).toBeLessThan(full * 0.75);
    const before = back.draws;
    const framesBefore = stats.at(-1)!.frames;
    clock.run(40, 45);
    expect(stats.at(-1)!.frames - framesBefore).toBeLessThanOrEqual(22);
    expect(back.draws).toBeGreaterThan(before);
    // Back to 60 a second: the tea thickens again.
    clock.run(1200, 16.7);
    expect(stats.at(-1)!.back).toBeGreaterThan(slow);
  });

  it('only runs while there is tea to see and the page is shown; under reduced motion it hangs still', () => {
    const a = setup();
    a.clock.run(10, 16.7);
    expect(a.stats.at(-1)?.frames ?? 0).toBe(0);
    a.engine.setLevels({ back: 0, sections: 1 });
    a.engine.setHidden(true);
    a.clock.run(30, 16.7);
    expect(a.stats.at(-1)!.frames).toBe(0);
    a.engine.setHidden(false);
    a.clock.run(30, 16.7);
    expect(a.stats.at(-1)!.frames).toBeGreaterThan(0);
    // The sections' tea is on the front canvas, the picture's on the back one.
    expect(a.stats.at(-1)!.front).toBeGreaterThan(10);
    expect(a.stats.at(-1)!.back).toBe(0);

    const b = setup(true);
    b.engine.setLevels({ back: 1, sections: 0 });
    b.clock.run(60, 16.7);
    expect(b.stats.at(-1)!.frames).toBe(0);
    expect(b.stats.at(-1)!.back).toBeGreaterThan(40);
  });
});
