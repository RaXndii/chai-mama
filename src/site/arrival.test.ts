import { describe, expect, it } from 'vitest';
import {
  frameCentre,
  frameScale,
  FRAME,
  isNarrow,
  LAYERS,
  layerPlacement,
  layersFor,
  layerTransform,
  NARROW,
  pickSize,
  SKY,
} from './arrival';

const parse = (t: string) => {
  const m = t.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px, 0\) scale\(([-\d.]+)\)/)!;
  return { x: Number(m[1]), y: Number(m[2]), s: Number(m[3]) };
};
const layer = (name: string) => LAYERS.find((l) => l.name === name)!;
/** A pose a little right, higher and well back from rest (the camera's furthest from the picture). */
const BACK = { x: 0.03, y: -0.16, z: -0.7 };

describe('the photographic arrival (CM-001, CM-006, CM-008)', () => {
  it('at rest every layer is back in place: the stack is the picture, cover-fitted', () => {
    const vw = 1672;
    const vh = 940;
    const s0 = frameScale(vw, vh);
    for (const l of LAYERS) {
      const t = parse(layerTransform(l, { x: 0, y: 0, z: 0 }, vw, vh));
      expect(t.s).toBeCloseTo(s0, 4);
      // The picture's top-left corner lands on the viewport's corner (16:9 into 16:9).
      expect(t.x + (FRAME.x - l.x) * s0).toBeCloseTo(0, 1);
      expect(t.y + (FRAME.y - l.y) * s0).toBeCloseTo(0, 1);
    }
  });

  it('moving the camera, the rock moves more than the country', () => {
    const pose = BACK;
    const at = (name: string) => parse(layerTransform(layer(name), pose, 1440, 900));
    expect(at('ledge').s).toBeLessThan(at('far').s);
    // The sky is the far country's own plane, and the pack and the leaves ride on their rock: nothing slides
    // against what it stands on.
    expect(at('sky')).toEqual(at('far'));
    for (const name of ['pouch', 'leaves']) {
      expect(at(name).s).toBe(at('ledge').s);
      const offset = (n: string) => at(n).x - layer(n).x * at(n).s;
      expect(offset(name)).toBeCloseTo(offset('ledge'), 1);
    }
  });

  it('wide screens see the whole picture across; 16:10 keeps the pack and the sun; phones centre the pack', () => {
    expect(frameCentre(2560, 1080).x).toBe(FRAME.w / 2);
    // 16:10: the frame is cropped at the left (the leaves' edge), not at the sun.
    {
      const vw = 1440;
      const vh = 900;
      const s0 = frameScale(vw, vh);
      const c = frameCentre(vw, vh);
      const left = c.x - vw / s0 / 2;
      const right = c.x + vw / s0 / 2;
      const pack = LAYERS.find((l) => l.name === 'pouch')!;
      expect(right).toBeCloseTo(FRAME.w, 3);
      expect(SKY.sun.late.x - FRAME.x).toBeLessThan(right - 20);
      expect(pack.x - FRAME.x).toBeGreaterThan(left);
    }
    const vw = 390;
    const vh = 844;
    const s0 = frameScale(vw, vh);
    const pouch = layer('pouch');
    const t = parse(layerTransform(pouch, { x: 0, y: 0, z: 0 }, vw, vh));
    const left = t.x;
    const right = t.x + pouch.w * s0;
    // The pack's box is on screen, about the middle, and leaves room either side.
    expect(left).toBeGreaterThan(0);
    expect(right).toBeLessThan(vw);
    expect(Math.abs((left + right) / 2 - vw / 2)).toBeLessThan(vw * 0.05);
    // The pack's box (a little wider than the pack) leaves the scene either side.
    expect(pouch.w * s0).toBeLessThan(vw * 0.84);
  });
});

describe('a phone held upright gets the band of the picture around the pack (CM-012)', () => {
  const PHONES: [number, number][] = [
    [320, 568],
    [360, 640],
    [360, 780],
    [375, 667],
    [390, 844],
    [412, 915],
    [430, 932],
    [480, 800],
    [600, 968],
  ];
  const POSES = [
    { x: 0, y: 0, z: 0 },
    // The pointer's sway.
    { x: 0.025, y: 0.015, z: 0 },
    // The shop's move toward the rock.
    { x: 0, y: 0, z: 0.24 },
  ];

  it('is what sharp phones get, and only they', () => {
    for (const [vw, vh] of PHONES) {
      expect(isNarrow(vw, vh)).toBe(true);
      expect(pickSize(vw, vh, 2.6)).toBe('narrow');
    }
    expect(pickSize(1440, 900, 2)).toBe('large');
    expect(pickSize(820, 1180, 2)).toBe('large');
    expect(pickSize(844, 390, 3)).toBe('large');
    expect(pickSize(1440, 900, 1)).toBe('small');
  });

  it('the band covers all a phone ever sees, through the entrance and into the shop', () => {
    for (const [vw, vh] of PHONES) {
      for (const l of layersFor('narrow').filter((x) => ['far', 'sky', 'ledge'].includes(x.name))) {
        for (const pose of POSES) {
          const p = layerPlacement(l, pose, vw, vh);
          // The screen's left and right edges, in the cut layer's own px: inside it.
          expect((0 - p.x) / p.s).toBeGreaterThan(0);
          expect((vw - p.x) / p.s).toBeLessThan(l.w);
        }
      }
    }
  });

  it('puts every point of the picture exactly where the whole plate had it', () => {
    const full = LAYERS.find((l) => l.name === 'far')!;
    const cut = layersFor('narrow').find((l) => l.name === 'far')!;
    expect(cut.w).toBe(NARROW.x1 - NARROW.x0);
    for (const pose of POSES) {
      const a = layerPlacement(full, pose, 412, 915);
      const b = layerPlacement(cut, pose, 412, 915);
      expect(b.s).toBeCloseTo(a.s, 9);
      expect(b.x).toBeCloseTo(a.x + NARROW.x0 * a.s, 6);
      expect(b.y).toBeCloseTo(a.y, 9);
    }
    // The pack and the leaves are not cut.
    expect(layersFor('narrow').find((l) => l.name === 'pouch')).toEqual(
      LAYERS.find((l) => l.name === 'pouch'),
    );
  });
});
