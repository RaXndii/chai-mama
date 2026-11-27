import farSmall from '../arrival/layers/far-1x.webp';
import farLarge from '../arrival/layers/far-2x.webp';
import farDuskSmall from '../arrival/layers/far-dusk-1x.webp';
import farDuskLarge from '../arrival/layers/far-dusk-2x.webp';
import farDuskSoftSmall from '../arrival/layers/far-dusk-soft-1x.webp';
import farDuskSoftLarge from '../arrival/layers/far-dusk-soft-2x.webp';
import farSoftSmall from '../arrival/layers/far-soft-1x.webp';
import farSoftLarge from '../arrival/layers/far-soft-2x.webp';
import leavesSmall from '../arrival/layers/leaves-1x.webp';
import leavesLarge from '../arrival/layers/leaves-2x.webp';
import leavesDuskSmall from '../arrival/layers/leaves-dusk-1x.webp';
import leavesDuskLarge from '../arrival/layers/leaves-dusk-2x.webp';
import ledgeSmall from '../arrival/layers/ledge-1x.webp';
import ledgeLarge from '../arrival/layers/ledge-2x.webp';
import ledgeDuskSmall from '../arrival/layers/ledge-dusk-1x.webp';
import ledgeDuskLarge from '../arrival/layers/ledge-dusk-2x.webp';
import heritageSmall from '../arrival/layers/pouch-heritage-1x.webp';
import heritageLarge from '../arrival/layers/pouch-heritage-2x.webp';
import lovelySmall from '../arrival/layers/pouch-lovely-1x.webp';
import lovelyLarge from '../arrival/layers/pouch-lovely-2x.webp';
import skySmall from '../arrival/layers/sky-1x.webp';
import skyLarge from '../arrival/layers/sky-2x.webp';
import skyDuskSmall from '../arrival/layers/sky-dusk-1x.webp';
import skyDuskLarge from '../arrival/layers/sky-dusk-2x.webp';
import skyDuskSoftSmall from '../arrival/layers/sky-dusk-soft-1x.webp';
import skyDuskSoftLarge from '../arrival/layers/sky-dusk-soft-2x.webp';
import skySoftSmall from '../arrival/layers/sky-soft-1x.webp';
import skySoftLarge from '../arrival/layers/sky-soft-2x.webp';
import skyMask from '../arrival/layers/sky-mask.png';
import farNarrow from '../arrival/layers/far-narrow.webp';
import farDuskNarrow from '../arrival/layers/far-dusk-narrow.webp';
import farSoftNarrow from '../arrival/layers/far-soft-narrow.webp';
import farDuskSoftNarrow from '../arrival/layers/far-dusk-soft-narrow.webp';
import skyNarrow from '../arrival/layers/sky-narrow.webp';
import skyDuskNarrow from '../arrival/layers/sky-dusk-narrow.webp';
import skySoftNarrow from '../arrival/layers/sky-soft-narrow.webp';
import skyDuskSoftNarrow from '../arrival/layers/sky-dusk-soft-narrow.webp';
import ledgeNarrow from '../arrival/layers/ledge-narrow.webp';
import ledgeDuskNarrow from '../arrival/layers/ledge-dusk-narrow.webp';
import skyMaskNarrow from '../arrival/layers/sky-mask-narrow.png';
import type { BlendId } from '@/content/chaimama';

/**
 * The photographic hero (DECISIONS CM-001, CM-006, CM-008). The owner's homepage picture — the pack on a
 * mossy rock above the tea rows, a bowl of loose tea beside it, the valley in golden mist and the sun low over
 * the right-hand ranges — is the homepage's hero, its own words and controls taken out
 * (scripts/chaimama/hero_clean.py). It is split into depth layers (scripts/chaimama/hero_scene.py): the far
 * country and the sky, the rock with the bowl and the tea bushes, the real pack standing on it, and the big
 * out-of-focus leaves in front; the hidden parts are filled from the scene around them and the margins grown
 * for the move. A virtual camera glides in toward the rock: each layer scales and shifts by its own depth, so
 * the approach has real parallax. At rest every layer is back in place and the stack *is* the picture.
 *
 * Two blends, one place (CM-005, CM-008): the pack on the rock is the real product photograph of the chosen
 * blend, lit into the scene (both share one box, so neither moves when they change), and every layer has an
 * earlier plate (Heritage Blend: the sky bluer, the clouds whiter, the mist white, the greens fresh) and a
 * later one (The Lovely Blend: the picture's own golden light). The sky layer lies behind the ranges, masked by
 * their ridgeline: its clouds drift in it, and the page's sun travels in it, higher earlier and lower later.
 *
 * The far country and the sky also come softened by the air (CM-007): with a mouse, the page shows those and
 * lets the sharp plates through a soft window that follows the pointer.
 *
 * Geometry is in frame pixels (the picture is 1672 × 940; the large images are 2×); `z` is depth.
 */
export const FRAME = { w: 1672, h: 940, x: 200, y: 96 } as const;

/** Where the eye goes on screens narrower (or wider) than the picture: the pack (frame px). */
export const FOCUS = { x: 569, y: 500 } as const;

/** Across a landscape screen the picture is kept in view from here (the bowl's rim, left of the pack) to its
 *  right edge, where the sun is, when the screen is wide enough (frame px). */
const KEEP_LEFT = 340;

/**
 * Which images suit a screen: `small` (1×), `large` (2×), or `narrow` — a phone held upright, which only ever
 * sees the band of the picture around the pack (CM-012): its wide plates are 2× cuts of that band.
 */
export type Size = 'small' | 'large' | 'narrow';
type Src = Record<Size, string>;
const both = (small: string, large: string): Src => ({ small, large, narrow: large });

export interface Layer {
  name: 'far' | 'sky' | 'ledge' | 'pouch' | 'leaves';
  z: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const LAYERS: readonly Layer[] = [
  { name: 'far', z: 16, x: 0, y: 0, w: 2072, h: 1136 },
  // The sky behind the ranges: the same plane as `far`, masked by its ridgeline (SKY.mask).
  { name: 'sky', z: 16, x: 0, y: 0, w: 2072, h: 400 },
  // The rock, the bowl of loose tea on it, and the bushes beside it.
  { name: 'ledge', z: 3, x: 0, y: 322, w: 2072, h: 814 },
  // One box for both packs, where the picture's pack stood (its contact shadow is the rock's).
  { name: 'pouch', z: 3, x: 564, y: 308, w: 410, h: 556 },
  // The big out-of-focus tea leaves nearest the camera, bottom left (on the rock's plane: only the wind
  // moves them).
  { name: 'leaves', z: 3, x: 188, y: 765, w: 631, h: 283 },
];

type Plate = 'far' | 'sky' | 'ledge' | 'leaves';

/** The earlier (day) and later (dusk) plates of each photographic layer. */
export const PLATES: Record<Plate, { day: Src; dusk: Src }> = {
  far: {
    day: { small: farSmall, large: farLarge, narrow: farNarrow },
    dusk: { small: farDuskSmall, large: farDuskLarge, narrow: farDuskNarrow },
  },
  sky: {
    day: { small: skySmall, large: skyLarge, narrow: skyNarrow },
    dusk: { small: skyDuskSmall, large: skyDuskLarge, narrow: skyDuskNarrow },
  },
  ledge: {
    day: { small: ledgeSmall, large: ledgeLarge, narrow: ledgeNarrow },
    dusk: { small: ledgeDuskSmall, large: ledgeDuskLarge, narrow: ledgeDuskNarrow },
  },
  // The leaves' layer is small already (it is not cut).
  leaves: { day: both(leavesSmall, leavesLarge), dusk: both(leavesDuskSmall, leavesDuskLarge) },
};

/** The far country and the sky softened by the air: the base under the pointer's window of clarity. */
export const SOFT: Record<'far' | 'sky', { day: Src; dusk: Src }> = {
  far: {
    day: { small: farSoftSmall, large: farSoftLarge, narrow: farSoftNarrow },
    dusk: { small: farDuskSoftSmall, large: farDuskSoftLarge, narrow: farDuskSoftNarrow },
  },
  sky: {
    day: { small: skySoftSmall, large: skySoftLarge, narrow: skySoftNarrow },
    dusk: { small: skyDuskSoftSmall, large: skyDuskSoftLarge, narrow: skyDuskSoftNarrow },
  },
};

/**
 * The sky layer's ridgeline mask, and the sun in it (layer px): earlier it stands higher and a little to the
 * left; later, where the owner's picture has it, just over the right-hand ranges.
 */
export const SKY = {
  mask: skyMask,
  sun: { early: { x: 1710, y: 213 }, late: { x: 1780, y: 363 } },
} as const;

/** Each blend's pack, lit for its time of day (Heritage Blend earlier, The Lovely Blend later). */
export const POUCHES: Record<BlendId, Src> = {
  heritage: both(heritageSmall, heritageLarge),
  lovely: both(lovelySmall, lovelyLarge),
};

/** The band a phone held upright is given, in layer px (scripts/chaimama/narrow_plates.py cuts the plates). */
export const NARROW = { x0: 360, x1: 1200 } as const;
/** The plates cut to that band: the far country, the sky behind the ranges, the rock. */
const CUT: ReadonlySet<Layer['name']> = new Set(['far', 'sky', 'ledge']);

/** A phone held upright: it sees only the band around the pack (`arrival.test.ts` checks every size). */
export const isNarrow = (vw: number, vh: number) => vw <= 600 && vw / vh <= 0.62;

/** The layers for a set of images: with `narrow`, the cut ones start at the band and are as wide as it. */
export function layersFor(size: Size): readonly Layer[] {
  if (size !== 'narrow') return LAYERS;
  return LAYERS.map((l) => (CUT.has(l.name) ? { ...l, x: l.x + NARROW.x0, w: NARROW.x1 - NARROW.x0 } : l));
}

/** The sky's ridgeline mask for a set of images, and how far its layer starts into the picture (layer px). */
export const skyFor = (size: Size) =>
  size === 'narrow' ? { mask: skyMaskNarrow, x0: NARROW.x0 } : { mask: SKY.mask, x0: 0 };

/** Which time of day goes with a blend. */
export const timeOf = (b: BlendId): 'day' | 'dusk' => (b === 'lovely' ? 'dusk' : 'day');

/** Vertical field of view of the virtual camera (degrees). */
const FOV = 40;
const FOCAL = FRAME.h / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
/** On narrow screens at least this much of the frame's width stays in view (the margins fill above/below):
 *  a phone sees the pack whole, the rock under it and a little of the hills either side. */
const MIN_VISIBLE = 0.3;

export interface Pose {
  x: number;
  y: number;
  z: number;
}

/** CSS px per frame px for a viewport: cover, but never cropping a phone down to the pack alone. */
export function frameScale(vw: number, vh: number): number {
  const cover = Math.max(vw / FRAME.w, vh / FRAME.h);
  return Math.min(cover, vw / (MIN_VISIBLE * FRAME.w));
}

/**
 * The frame point at the viewport's centre: the picture's centre when all of it fits across. A landscape screen
 * a little narrower than the picture keeps the pack and the sun in view (it loses the leaves at the left edge);
 * a narrower one, and a phone, is centred as near the pack as the picture's edges allow.
 */
export function frameCentre(vw: number, vh: number): { x: number; y: number } {
  const s0 = frameScale(vw, vh);
  const seenW = vw / s0;
  const along = (focus: number, size: number, seen: number) =>
    seen >= size ? size / 2 : Math.min(Math.max(focus, seen / 2), size - seen / 2);
  const x =
    seenW >= FRAME.w
      ? FRAME.w / 2
      : vw > vh
        ? Math.min(
            Math.max(Math.min(FRAME.w - seenW / 2, KEEP_LEFT + seenW / 2), seenW / 2),
            FRAME.w - seenW / 2,
          )
        : along(FOCUS.x, FRAME.w, seenW);
  return { x, y: along(FOCUS.y, FRAME.h, vh / s0) };
}

/** Where `layer`'s top-left corner lands on screen for camera `pose`, and its scale (CSS px per layer px). */
export function layerPlacement(
  layer: Layer,
  pose: Pose,
  vw: number,
  vh: number,
): { x: number; y: number; s: number } {
  const s0 = frameScale(vw, vh);
  const c = frameCentre(vw, vh);
  const k = layer.z / (layer.z - pose.z);
  const tx = (-FOCAL * pose.x) / (layer.z - pose.z);
  const ty = (-FOCAL * pose.y) / (layer.z - pose.z);
  const ox = layer.x - FRAME.x - c.x;
  const oy = layer.y - FRAME.y - c.y;
  return { x: vw / 2 + (ox * k + tx) * s0, y: vh / 2 + (oy * k + ty) * s0, s: k * s0 };
}

/** The CSS transform (origin top-left) that puts `layer` on screen for camera `pose`. */
export function layerTransform(layer: Layer, pose: Pose, vw: number, vh: number): string {
  const { x, y, s } = layerPlacement(layer, pose, vw, vh);
  return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${s.toFixed(5)})`;
}

/** Which image set suits this screen (device pixels across the frame); a sharp phone held upright gets the
 *  band cut for it. */
export function pickSize(vw: number, vh: number, dpr: number): Size {
  if (frameScale(vw, vh) * dpr * FRAME.w <= 1700) return 'small';
  return isNarrow(vw, vh) ? 'narrow' : 'large';
}
