import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/noto-kufi-arabic/wght.css';
import '@fontsource-variable/vazirmatn/wght.css';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { qualityStore } from '@/app/quality';
import { navigate, settle, usePage } from '@/app/router';
import { chaimama as copy, useLocale } from '@/content';
import { BLENDS, type BlendId } from '@/content/chaimama';
import { LOCALES } from '@/content/types';
import { pathOf, type ChaiPage } from '../routes';
import {
  LAYERS,
  layerPlacement,
  layersFor,
  layerTransform,
  pickSize,
  PLATES,
  POUCHES,
  SKY,
  skyFor,
  SOFT,
  timeOf,
  type Pose,
  type Size,
} from './arrival';
import About from './About';
import ChaiNav from './ChaiNav';
import { Arrow } from './icons';
import { NAV_PAGE, type NavSection } from './nav';
import Shop, { PackGhosts } from './Shop';
import Teas from './Teas';
import { CALM_TIME_MS, sceneAt, smoothstep, TIME_MS, timeline } from './timeOfDay';
import './chai.css';

/**
 * The Chai Mama website.
 *
 * It opens ready (CM-021): the owner's picture, the words and every button are there at once — nothing to wait
 * through; the picture fades in the moment it has arrived.
 *
 * Two blends, one place, one shot (CM-008): Heritage Blend stands there in the clearer, earlier light;
 * choosing The Lovely Blend lets a little of the day go by — the sun travels down toward the ranges, the clouds
 * drift on, the mist takes the gold, the leaves move in a gust — and in the middle of it the red pack is
 * uncovered across the yellow one from the sun's side, by a soft edge; and back again. One time-of-day value
 * drives all of it (timeOfDay.ts), so a new choice mid-way turns it round from wherever it is.
 *
 * With a mouse, the far country is a touch soft with the air, and a soft window of clarity follows the
 * pointer across it (CM-007); the pack, the rock and the words stay sharp.
 *
 * Three pages (CM-014): the homepage, the shop and Our Story — the homepage scrolls straight on into Our Story
 * (CM-021), whose address it takes as it comes up. The shop is deeper into the same shot (CM-010):
 * going there, the picture stays where it is while the camera moves in a little toward the rock, the hero's
 * words go, the warm light of the chosen blend comes across the valley from the open side and the shop rises
 * into that light — one short move, played backwards on the way home. Choosing a blend in the shop is the same
 * one-shot change of light as in the hero, and the shop's colours follow it.
 */

/** The picture fades in when it has arrived, or after this long with whatever has. */
const PICTURE_WAIT_MS = 2500;
/** A switch: the words fade out, then the new blend's come in (ms; quicker under reduced motion). */
const COPY_OUT_MS = 380;
const CALM_COPY_OUT_MS = 180;

const smooth = smoothstep;

/** At the shop the camera has moved in this far toward the rock (layer-depth units; the rock is at 3). */
const SHOP_PUSH = 0.24;
/** Where on the way to the shop (0 … 1) each of its parts starts to rise in: the tea, its ways to buy, how
 *  many, what it comes to (in the order Shop.tsx draws them). */
const SHOP_FROM = [0.08, 0.16, 0.24, 0.3];
/** The move from the hero to the shop, and back (ms; a short fade under reduced motion). The shop is there from
 *  its first quarter (CM-018): nothing to wait for. */
const SHOP_IN_MS = 800;
const SHOP_OUT_MS = 600;
const CALM_SHOP_MS = 420;
/** Slow to start, slow to settle. */
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/** With a mouse (and motion allowed), the far country starts soft and the pointer shows it sharp. */
function clarityOn(): boolean {
  return (
    !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches &&
    !qualityStore.getState().reducedMotion
  );
}

/** The window of clarity's radius on screen (CSS px). */
const CLEAR_R = 320;

/** `?blend=lovely` opens on The Lovely Blend (links, review). */
function initialBlend(): BlendId {
  const b = new URLSearchParams(window.location.search).get('blend');
  return b === 'lovely' ? 'lovely' : 'heritage';
}

// The opening light's plates start loading with the page's script, so the cloud opens onto a decoded picture.
if (typeof window !== 'undefined') {
  const size = pickSize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  const t = timeOf(initialBlend());
  const base = clarityOn() ? SOFT : PLATES;
  for (const src of [
    base.far[t][size],
    base.sky[t][size],
    PLATES.ledge[t][size],
    PLATES.leaves[t][size],
    POUCHES[initialBlend()][size],
  ])
    new Image().src = src;
}

/** The browser's colour around the page (Chrome's bar, a phone's status bar): the sky of the picture for its time
 *  of day, the ink on Our Story — as html's background (base.css). */
const SKY_DAY = '#9fa8b8';
const SKY_DUSK = '#a9968b';
const INK = '#14100c';

function useHead(color: string) {
  useEffect(() => {
    document.title = copy.meta.title;
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute('content', copy.meta.description);
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', color);
  });
}

export default function ChaiSite() {
  const lang = useLocale();
  const page = usePage();
  const pageRef = useRef(page);
  pageRef.current = page;
  const layerEls = useRef<(HTMLDivElement | null)[]>([]);
  const stageEl = useRef<HTMLDivElement>(null);
  const heroEl = useRef<HTMLElement>(null);
  const sunEl = useRef<HTMLDivElement>(null);
  const rootEl = useRef<HTMLDivElement>(null);
  const clearEls = useRef<(HTMLDivElement | null)[]>([]);
  const poseRef = useRef<Pose>({ x: 0, y: 0, z: 0 });
  /** The pose the entrance or the pointer gives; the scroll's move toward the shop is added to it. */
  const basePose = useRef<Pose>({ x: 0, y: 0, z: 0 });
  /** How far the scene has come from the hero to the shop (0 … 1, eased). */
  const shopK = useRef(0);
  const shopEl = useRef<HTMLElement>(null);
  const journeyEl = useRef<HTMLDivElement>(null);
  const washEl = useRef<HTMLDivElement>(null);
  const meltEl = useRef<HTMLDivElement>(null);
  const copyEl = useRef<HTMLDivElement>(null);
  const cueEl = useRef<HTMLAnchorElement>(null);
  const [clarity] = useState(clarityOn);
  const [size, setSize] = useState<Size>(() =>
    pickSize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1),
  );

  // The blend: `blend` is the visitor's choice (the switch shows it at once) and where the scene's time of day
  // is heading; `shown` is the blend whose words are on the page — it follows a moment later, while the words
  // are faded out.
  const [blend, setBlend] = useState<BlendId>(initialBlend);
  const [shown, setShown] = useState<BlendId>(blend);
  /** The blend the page opened on: its plates load first and are the ones the entrance waits for. */
  const initialBlendRef = useRef(blend);
  const wanted = useRef<BlendId>(blend);
  const [switching, setSwitching] = useState(false);
  /** A carton is chosen in the shop: two more pouches fan out behind the pack (CM-018). */
  const [carton, setCarton] = useState(false);
  /** Once a switch has happened, the words come back without the first stagger. */
  const [switched, setSwitched] = useState(false);
  // The other time of day's plates load once the page is at rest (or at once when the visitor asks).
  const [bothTimes, setBothTimes] = useState(false);
  /** Decoded and ready to be turned to (until then a choice waits for them, the current pack stays). */
  const ready = useRef(false);
  const waiting = useRef(false);
  /** The packs that loaded: a pack whose image failed is never uncovered over the other, nor lost under it. */
  const [packsOk, setPacksOk] = useState<Record<BlendId, boolean>>({ heritage: true, lovely: true });
  const [said, setSaid] = useState('');
  const timers = useRef<number[]>([]);
  const copyTimer = useRef(0);
  // The section after the tea shows the other blend; the visitor can look at either there, until the hero's
  // blend changes again.

  useEffect(() => {
    const onResize = () =>
      setSize(pickSize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1));
    window.addEventListener('resize', onResize);
    const pending = timers.current;
    return () => {
      window.removeEventListener('resize', onResize);
      for (const t of pending) window.clearTimeout(t);
      window.clearTimeout(copyTimer.current);
    };
  }, []);

  // The layers' boxes for this screen's images (a phone held upright gets the band around the pack, CM-012).
  const layers = layersFor(size);
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // Place the layers for a camera pose (straight to the DOM: no React render per frame), moved on toward the
  // rock as far as the scroll has come toward the shop.
  const place = (pose: Pose) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    basePose.current = { x: pose.x, y: pose.y, z: pose.z };
    const at = { x: pose.x, y: pose.y, z: pose.z + SHOP_PUSH * shopK.current };
    poseRef.current = at;
    layersRef.current.forEach((l, i) => {
      const el = layerEls.current[i];
      if (el) el.style.transform = layerTransform(l, at, vw, vh);
    });
  };

  /**
   * The scene at time of day `t` (0 earlier, 1 later), straight to the DOM: each layer's later plate by its
   * own curve (`--dusk`), the incoming pack's edge (`--reveal`), which end each rests on (`data-at`), the
   * mist's gold and the clouds' drift, and the sun's place in the sky.
   */
  const applyTime = (t: number) => {
    const sc = sceneAt(t, qualityStore.getState().reducedMotion);
    LAYERS.forEach((l, i) => {
      const el = layerEls.current[i];
      if (!el) return;
      const v =
        l.name === 'sky' ? sc.sky : l.name === 'far' ? sc.far : l.name === 'pouch' ? sc.pack : sc.near;
      el.style.setProperty(l.name === 'pouch' ? '--reveal' : '--dusk', v.toFixed(4));
      // At rest on either end the plate (or pack) that is covered is not drawn at all (CM-013).
      const end = v <= 0 ? 'day' : v >= 1 ? 'dusk' : '';
      if ((el.dataset.at ?? '') !== end) {
        if (end) el.dataset.at = end;
        else delete el.dataset.at;
      }
    });
    const hero = heroEl.current;
    if (hero) {
      hero.style.setProperty('--mist', sc.mist.toFixed(4));
      hero.style.setProperty('--drift', sc.drift.toFixed(4));
    }
    // The shop's colours: Heritage Blend's gold (0) to The Lovely Blend's red (1), with the light (on the shop
    // and the light across the picture only, so nothing else is restyled).
    const theme = sc.far.toFixed(4);
    shopEl.current?.style.setProperty('--theme', theme);
    washEl.current?.style.setProperty('--theme', theme);
    const sun = sunEl.current;
    if (sun) {
      const { early, late } = SKY.sun;
      // Down a short arc toward the ranges (a little more down than across). In the sky layer's own px: a
      // phone's sky starts into the picture (the sun is then off its band).
      const k = sc.sun;
      const from = layersRef.current.find((l) => l.name === 'sky')!.x;
      const x = early.x + (late.x - early.x) * k - from;
      const y = early.y + (late.y - early.y) * (k * k * 0.35 + k * 0.65);
      sun.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      sun.style.setProperty('--late', k.toFixed(4));
    }
  };
  const clock = useRef<ReturnType<typeof timeline> | null>(null);
  if (!clock.current) clock.current = timeline((t) => applyTime(t), timeOf(blend) === 'dusk' ? 1 : 0);
  // The opening light is in place before the first frame is drawn.
  useLayoutEffect(() => {
    applyTime(clock.current!.t);
    const c = clock.current!;
    return () => c.stop();
  }, []);

  // The picture fades in as soon as its first images are decoded (at once when they already are); the page is in
  // use the whole time.
  useLayoutEffect(() => {
    const el = stageEl.current;
    if (!el) return;
    const imgs = [...el.querySelectorAll<HTMLImageElement>('img[data-first]')];
    if (imgs.every((im) => im.complete && im.naturalWidth)) {
      el.dataset.ready = 'now';
      return;
    }
    let live = true;
    const decoded = Promise.all(imgs.map((im) => im.decode().catch(() => {})));
    void Promise.race([decoded, new Promise((r) => setTimeout(r, PICTURE_WAIT_MS))]).then(() => {
      if (live) el.dataset.ready = '';
    });
    return () => {
      live = false;
    };
  }, []);

  // At rest, the hero breathes with the pointer: the camera sways a few centimetres (desktop only).
  useEffect(() => {
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    if (!fine || qualityStore.getState().reducedMotion) return;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0, z: 0 };
    let raf = 0;
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;
      place(cur);
      if (Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 1e-4) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 0.05;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.03;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // The window of clarity: it follows the pointer smoothly, fades in with the first move and out when the
  // pointer leaves the page. Only two CSS variables per frame, on the two sharp layers' masks.
  useEffect(() => {
    if (!clarity) return;
    const far = layersRef.current.find((l) => l.name === 'far')!;
    const at = { x: 0, y: 0, a: 0 };
    const to = { x: 0, y: 0, a: 0 };
    let raf = 0;
    const tick = () => {
      // In the shop the window closes (the far country is under the blend's light there, and the masks are
      // then never redrawn while the visitor scrolls).
      const want = to.a * (shopK.current > 0.35 ? 0 : 1);
      at.x += (to.x - at.x) * 0.22;
      at.y += (to.y - at.y) * 0.22;
      at.a += (want - at.a) * (want > at.a ? 0.08 : 0.05);
      if (at.a < 0.004) {
        at.a = 0;
        for (const el of clearEls.current) if (el) el.style.opacity = '0';
        raf = Math.abs(want - at.a) > 0.002 ? requestAnimationFrame(tick) : 0;
        return;
      }
      // The hero scrolls with the page; the layers are placed in it.
      const top = stageEl.current?.getBoundingClientRect().top ?? 0;
      const p = layerPlacement(far, poseRef.current, window.innerWidth, window.innerHeight);
      // The window's corner, in the layer's own px: the window moves there and its picture back by as much, so
      // the circle's mask is never redrawn and nothing is painted again as it follows the pointer.
      const r = CLEAR_R / p.s;
      const cr = `${r.toFixed(1)}px`;
      const x = (at.x - p.x) / p.s - r;
      const y = (at.y - top - p.y) / p.s - r;
      const there = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const back = `translate3d(${(-x).toFixed(1)}px, ${(-y).toFixed(1)}px, 0)`;
      for (const el of clearEls.current) {
        if (!el) continue;
        if (el.style.getPropertyValue('--cr') !== cr) el.style.setProperty('--cr', cr);
        el.style.transform = there;
        (el.firstElementChild as HTMLElement).style.transform = back;
        el.style.opacity = at.a.toFixed(3);
      }
      const moving = Math.abs(to.x - at.x) + Math.abs(to.y - at.y) > 0.3 || Math.abs(want - at.a) > 0.002;
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (at.a < 0.01) {
        at.x = e.clientX;
        at.y = e.clientY;
      }
      to.x = e.clientX;
      to.y = e.clientY;
      to.a = 1;
      kick();
    };
    const onOut = (e: PointerEvent) => {
      if (e.relatedTarget) return;
      to.a = 0;
      kick();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut);
    window.addEventListener('scroll', kick, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('scroll', kick);
      cancelAnimationFrame(raf);
    };
  }, [clarity]);

  // The header takes a soft cream behind it once the page is off the hero's sky (the shop, over the blend's
  // light, has it from the start), and the dark of the ink on Our Story.
  const [scrolled, setScrolled] = useState(false);
  const header = useRef({ scrolled: false });
  const heroH = useRef(0);
  const headerH = useRef(64);
  /** Our Story's start, under the homepage. */
  const endEl = useRef<HTMLElement | null>(null);
  /** The next change of page comes from the scroll itself (the homepage into Our Story): nothing to do for it. */
  const quiet = useRef(false);
  const current: NavSection = page === 'shop' ? 'chai-tea' : page === 'about' ? 'chai-about' : 'chai-top';

  /**
   * The header, and whether the picture is on the screen, for the page and its scroll. A scroll frame reads
   * nothing but the scroll position (the hero's height is measured on resize).
   */
  const sync = () => {
    const top = window.scrollY;
    const vh = window.innerHeight;
    const pg = pageRef.current;
    const isScrolled = pg !== 'home' || top > vh * 0.6;
    if (isScrolled !== header.current.scrolled) setScrolled((header.current.scrolled = isScrolled));
    // Once the picture is off the screen its drifts stop.
    const el = journeyEl.current;
    const away = pg !== 'shop' && top > heroH.current;
    if (el && (el.dataset.away === '') !== away) {
      if (away) el.dataset.away = '';
      else delete el.dataset.away;
    }
    // The homepage runs on into Our Story (CM-021): once its ink reaches the header, the page is Our Story (its
    // address, the header's colours, the link lit), and back again above it. Only an address changes.
    const end = endEl.current;
    if (pg !== 'shop' && end) {
      const want: ChaiPage = end.getBoundingClientRect().top <= headerH.current ? 'about' : 'home';
      if (want !== pg) {
        quiet.current = true;
        settle(want);
      }
    }
  };
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          sync();
        });
    };
    const relayout = () => {
      heroH.current = heroEl.current?.offsetHeight ?? window.innerHeight;
      const root = rootEl.current;
      endEl.current = root?.querySelector<HTMLElement>('#chai-end') ?? null;
      headerH.current = root?.querySelector<HTMLElement>('.chai-header')?.offsetHeight ?? 64;
      onScroll();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', relayout);
    relayout();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', relayout);
      cancelAnimationFrame(raf);
    };
  }, []);

  /**
   * From the hero to the shop (CM-010, CM-014): `p` (0 at the hero, 1 with the shop in place) takes the hero's
   * words out and the blend's light across; the camera moves in by it. Written to
   * the moving parts only, and only when it changes (CM-011).
   */
  const lastShop = useRef(-1);
  /**
   * The parts the move fades and slides, each written to directly (their own layers: the compositor moves
   * them, nothing is painted or restyled under them). The hero's words and its scroll cue go first, the
   * light comes across from the open side, and the shop's parts rise one after the other; on a phone the
   * shop is one card that rises as a whole, and under reduced motion nothing slides.
   */
  const shopMove = (p: number, vh: number) => {
    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
    const still = qualityStore.getState().reducedMotion;
    const card = window.innerWidth <= 900;
    const set = (el: HTMLElement | null | undefined, opacity: number, transform: string) => {
      if (!el) return;
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = transform;
    };
    const out = clamp01(1 - p * 2.4);
    set(copyEl.current, out, still ? 'none' : `translate3d(0, ${(-0.05 * vh * p).toFixed(1)}px, 0)`);
    set(cueEl.current, out, 'none');
    set(meltEl.current, clamp01(1 - p * 3), 'none');
    set(
      washEl.current,
      clamp01(p * 1.25 - 0.1),
      still || card ? 'none' : `translate3d(${((1 - p) * 18).toFixed(2)}%, 0, 0)`,
    );
    const panel = shopEl.current?.querySelector<HTMLElement>('.chai-shop__panel');
    const pouch = layerEls.current[LAYERS.findIndex((l) => l.name === 'pouch')];
    if (card) {
      // The sheet rises from the bottom; the pack steps out of the picture into the band above it (its own
      // copy flies from where the picture's pack stands, which steps aside for it).
      const k = clamp01((p - 0.04) * 2.6);
      set(panel, k, still || k >= 1 ? 'none' : `translate3d(0, ${((1 - k) * 0.14 * vh).toFixed(1)}px, 0)`);
      if (pouch) {
        // Out of the picture altogether (not only see-through): Safari can leave hairline edges of a layer
        // that is merely transparent.
        pouch.style.opacity = p > 0 ? '0' : '';
        pouch.style.visibility = p > 0 ? 'hidden' : '';
      }
      const pack = shopEl.current?.querySelector<HTMLElement>('.chai-shop__pack');
      if (pack && p > 0) {
        if (!packFlip.current) packFlip.current = measurePackFlip(pack);
        const f = still ? 1 : smooth(p, 0, 0.85);
        const { dx, dy, s } = packFlip.current;
        pack.style.transform =
          f >= 1
            ? 'none'
            : `translate3d(${(dx * (1 - f)).toFixed(1)}px, ${(dy * (1 - f)).toFixed(1)}px, 0) scale(${(1 + (s - 1) * (1 - f)).toFixed(4)})`;
      }
      return;
    }
    if (pouch) {
      pouch.style.opacity = '';
      pouch.style.visibility = '';
    }
    set(panel, 1, 'none');
    const parts = panel?.children ?? [];
    Array.from(parts).forEach((part, i) => {
      const k = clamp01((p - (SHOP_FROM[i] ?? 0.5)) * 5);
      set(
        part as HTMLElement,
        k,
        still || k >= 1 ? 'none' : `translate3d(0, ${((1 - k) * 35).toFixed(1)}px, 0)`,
      );
    });
  };
  /**
   * Where the picture's pack stands at the hero, relative to where the shop's pack sits in the band (a phone):
   * the move it makes from one to the other. Measured once per move (its layout box, not a frame of it).
   */
  const packFlip = useRef<{ dx: number; dy: number; s: number } | null>(null);
  const measurePackFlip = (pack: HTMLElement) => {
    const l = layersRef.current.find((x) => x.name === 'pouch')!;
    const from = layerPlacement(l, basePose.current, window.innerWidth, window.innerHeight);
    const fw = l.w * from.s;
    const fh = l.h * from.s;
    const before = pack.style.transform;
    pack.style.transform = 'none';
    const to = pack.getBoundingClientRect();
    pack.style.transform = before;
    if (!to.height) return { dx: 0, dy: 0, s: 1 };
    return {
      dx: from.x + fw / 2 - (to.left + to.width / 2),
      dy: from.y + fh / 2 - (to.top + to.height / 2),
      s: fh / to.height,
    };
  };
  useEffect(() => {
    const reset = () => (packFlip.current = null);
    window.addEventListener('resize', reset);
    return () => window.removeEventListener('resize', reset);
  }, []);
  const setShop = (to: number) => {
    const el = journeyEl.current;
    const p = Math.round(Math.min(1, Math.max(0, to)) * 1000) / 1000;
    if (!el || p === lastShop.current) return;
    lastShop.current = p;
    // Off: the shop is not there at all (the homepage and Our Story); in: the hero's words are gone. (Set first:
    // the shop is laid out before its parts are moved.)
    const side = p === 0 ? 'off' : p > 0.55 ? 'in' : 'out';
    if (el.dataset.shop !== side) el.dataset.shop = side;
    if (p === 0) packFlip.current = null;
    shopMove(p, window.innerHeight);
    const k = smooth(p, 0, 1);
    if (Math.abs(k - shopK.current) > 1e-4) {
      shopK.current = k;
      place(basePose.current);
    }
  };
  /** To the shop (1) or the hero (0): one short move from wherever it is, or straight there. */
  const shopTween = useRef(0);
  const shopTo = (to: 0 | 1, glide: boolean) => {
    cancelAnimationFrame(shopTween.current);
    const from = Math.max(0, lastShop.current);
    if (!glide || from === to) {
      setShop(to);
      sync();
      return;
    }
    const calm = qualityStore.getState().reducedMotion;
    const ms = (calm ? CALM_SHOP_MS : to ? SHOP_IN_MS : SHOP_OUT_MS) * Math.abs(to - from);
    let t0 = -1;
    const step = (now: number) => {
      if (t0 < 0) t0 = now;
      const f = Math.min(1, (now - t0) / ms);
      setShop(from + (to - from) * easeInOut(f));
      sync();
      if (f < 1) shopTween.current = requestAnimationFrame(step);
    };
    shopTween.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(shopTween.current), []);

  /**
   * A new page (CM-014): back to its top, the scene set for it — between the homepage and the shop the camera
   * makes the move (unless a cross-fade carries the change), elsewhere it is simply there — and focus on it.
   */
  const prevPage = useRef<ChaiPage | null>(null);
  /** The next change of page is carried by a cross-fade: the scene is set at once under it. */
  const faded = useRef(false);
  /** Connect's part of Our Story, to go to once that page is there. */
  const pendingPart = useRef<string | null>(null);
  useLayoutEffect(() => {
    const prev = prevPage.current;
    prevPage.current = page;
    if (quiet.current) {
      quiet.current = false;
      return;
    }
    const root = rootEl.current;
    const moved = prev !== null && prev !== page;
    // Our Story by its address (a link, Back, the shop's menu): the homepage, already scrolled down to it.
    const arrived = prev === null && page === 'about';
    if (moved) window.scrollTo({ top: 0, behavior: 'instant' });
    const glide =
      moved &&
      !faded.current &&
      ((prev === 'home' && page === 'shop') || (prev === 'shop' && page === 'home'));
    faded.current = false;
    shopTo(page === 'shop' ? 1 : 0, glide);
    if ((!moved && !arrived) || !root) return;
    const part = pendingPart.current ? root.querySelector<HTMLElement>(`#${pendingPart.current}`) : null;
    pendingPart.current = null;
    if (part) part.scrollIntoView({ block: 'start' });
    else if (page === 'about')
      root.querySelector<HTMLElement>('#chai-end')?.scrollIntoView({ block: 'start' });
    if (arrived) return;
    const target =
      part ??
      (page === 'shop'
        ? shopEl.current
        : page === 'about'
          ? root.querySelector('#chai-about')
          : heroEl.current);
    target?.focus({ preventScroll: true });
    // The page's own state is in refs; this runs per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // New images for the screen (a phone turned round) come with new boxes: placed again where the camera is.
  useLayoutEffect(() => {
    place(basePose.current);
  }, [size]);

  // A resize re-places the layers at rest.
  useEffect(() => {
    const onResize = () => place({ x: 0, y: 0, z: 0 });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Once at rest, quietly fetch the other time of day so a switch never waits.
  useEffect(() => {
    if (bothTimes) return;
    // Not before the opening picture is in: it has the connection to itself first.
    const imgs = [...(stageEl.current?.querySelectorAll<HTMLImageElement>('img[data-first]') ?? [])];
    const first = Promise.all(imgs.map((im) => im.decode().catch(() => {})));
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 600));
    let id = 0;
    let live = true;
    void Promise.race([first, new Promise((r) => setTimeout(r, PICTURE_WAIT_MS))]).then(() => {
      if (live) id = idle(() => setBothTimes(true));
    });
    return () => {
      live = false;
      (window.cancelIdleCallback ?? window.clearTimeout)(id);
    };
  }, [bothTimes]);

  /** Both times of day decoded (or 1.5 s gone: whatever has arrived shows, the rest fades in as it lands). */
  const whenReady = (go: () => void) => {
    if (ready.current) return go();
    if (waiting.current) return;
    waiting.current = true;
    setBothTimes(true);
    window.requestAnimationFrame(() => {
      const imgs = [...(stageEl.current?.querySelectorAll<HTMLImageElement>('img[data-time]') ?? [])];
      const decoded = Promise.all(imgs.map((el) => (el.src ? el.decode().catch(() => {}) : null)));
      void Promise.race([decoded, new Promise((r) => setTimeout(r, 1500))]).then(() => {
        ready.current = true;
        waiting.current = false;
        go();
      });
    });
  };

  /**
   * Choose a blend: the switch and the words follow the choice at once; the scene's time of day moves toward
   * it from wherever it is (a change of mind mid-way turns it round, smoothly).
   */
  const choose = (next: BlendId) => {
    if (next === wanted.current) return;
    const calm = qualityStore.getState().reducedMotion;
    wanted.current = next;
    setBlend(next);
    setSwitched(true);
    setSaid('');
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(
      () => setShown(wanted.current),
      calm ? CALM_COPY_OUT_MS : COPY_OUT_MS,
    );
    whenReady(() => {
      const to = timeOf(wanted.current) === 'dusk' ? 1 : 0;
      if (to === clock.current!.t) return;
      setSwitching(true);
      clock.current!.to(to, calm ? CALM_TIME_MS : TIME_MS, () => {
        setSwitching(false);
        setSaid(copy.hero.switched(copy.blends[wanted.current].name));
      });
    });
  };

  const onBlendKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    // Right to left, the next blend is to the left.
    const flip = LOCALES[lang].dir === 'rtl' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ? -1 : 1;
    const step = keys[e.key]! * flip;
    const i = (BLENDS.indexOf(blend) + step + BLENDS.length) % BLENDS.length;
    const next = BLENDS[i]!;
    (e.currentTarget.querySelector(`[data-blend="${next}"]`) as HTMLElement | null)?.focus();
    choose(next);
  };

  const scrollBehavior = (): ScrollBehavior => (qualityStore.getState().reducedMotion ? 'auto' : 'smooth');
  const toTop = () => window.scrollTo({ top: 0, behavior: scrollBehavior() });
  /** Scroll to a part of the page shown, focus with it. */
  const toPart = (id: string) => {
    const el = rootEl.current?.querySelector<HTMLElement>(`#${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    el.focus({ preventScroll: true });
  };
  /**
   * Go to a page (CM-014). Between the hero and the shop the scene makes its own move; any other change (Our
   * Story, or the homepage scrolled down) is a short cross-fade (a view transition: two pictures of the page,
   * nothing laid out or painted again while it plays). Under reduced motion, or without view transitions, the
   * page is simply there.
   */
  const goPage = (to: ChaiPage, part?: string) => {
    if (to === pageRef.current) {
      if (part) toPart(part);
      else toTop();
      return;
    }
    // The homepage and Our Story are one scroll (CM-021): a glide down to it, or back up to the top.
    if (pageRef.current !== 'shop' && to !== 'shop') {
      if (to === 'about') toPart(part ?? 'chai-about');
      else toTop();
      return;
    }
    pendingPart.current = part ?? null;
    const go = () => navigate(to);
    const atHero = window.scrollY < window.innerHeight * 0.3;
    const glides = atHero && (to === 'shop' || to === 'home') && pageRef.current !== 'about';
    const fade =
      !glides && typeof document.startViewTransition === 'function' && !qualityStore.getState().reducedMotion;
    if (!fade) return go();
    faded.current = true;
    const html = document.documentElement;
    html.dataset.vt = 'chai';
    const t = document.startViewTransition(() => flushSync(go));
    void t.finished.finally(() => {
      if (html.dataset.vt === 'chai') delete html.dataset.vt;
    });
  };
  /** The nav: to a page, in the site (no reload); Connect is Our Story's last part. */
  const goTo = (id: NavSection) => goPage(NAV_PAGE[id], id === 'chai-connect' ? id : undefined);
  /** Buy a blend from its card: it is chosen (the scene and the shop turn to it) and the shop opens. */
  const buy = (id: BlendId) => {
    choose(id);
    goPage('shop');
  };
  const copyState = shown !== blend ? 'out' : shown === initialBlendRef.current && !switched ? 'in' : 'back';
  const time = timeOf(blend);
  useHead(page === 'about' ? INK : time === 'dusk' ? SKY_DUSK : SKY_DAY);
  const b = copy.blends[shown];
  // The opening images are fetched before anything else on the page.
  const first = (t: 'day' | 'dusk') =>
    t === timeOf(initialBlendRef.current) ? { 'data-first': '', fetchPriority: 'high' as const } : {};
  /**
   * An earlier and a later image of a plate; the other time's only gets its source once it is wanted. `soft`:
   * the air's softened plate (the base under the window of clarity); `clear`: the sharp plate seen through
   * that window, fetched with the other time of day (the entrance never waits for it).
   */
  const plate = (name: 'far' | 'sky' | 'ledge' | 'leaves', set: 'sharp' | 'soft' | 'clear' = 'sharp') =>
    (['day', 'dusk'] as const).map((t) => {
      const want = set === 'clear' ? bothTimes : bothTimes || t === timeOf(initialBlendRef.current);
      const src =
        set === 'soft' && (name === 'far' || name === 'sky') ? SOFT[name][t][size] : PLATES[name][t][size];
      return (
        <img
          key={t}
          className={`chai-plate chai-plate--${t}`}
          src={want ? src : undefined}
          alt=""
          decoding="async"
          draggable={false}
          data-time={t}
          {...(set === 'clear' ? {} : first(t))}
        />
      );
    });
  /**
   * The far country's and the sky's sharp plates, through the pointer's window: a box the size of the circle
   * that slides with the pointer, the whole sharp picture inside it sliding back the other way (CM-013).
   */
  const clear = (i: number, l: { w: number; h: number }, children: ReactNode) => (
    <div
      className="chai-clear"
      ref={(el) => {
        clearEls.current[i] = el;
      }}
    >
      <div className="chai-clear__picture" style={{ width: l.w, height: l.h }}>
        {children}
      </div>
    </div>
  );
  const base = clarity ? 'soft' : 'sharp';
  const packState = (id: BlendId, ok: boolean) => setPacksOk((p) => (p[id] === ok ? p : { ...p, [id]: ok }));

  return (
    <div
      ref={rootEl}
      className="chai"
      lang={lang}
      dir={LOCALES[lang].dir}
      data-stage="home"
      data-page={page}
      data-end={page === 'about' || undefined}
      data-scrolled={scrolled || undefined}
      data-testid="chai-site"
    >
      <ChaiNav lang={lang} current={current} onGo={goTo} />

      <main id="scene-main" className="chai-main" tabIndex={-1}>
        {/* The hero and the shop: one shot, the picture pinned behind both (CM-010). */}
        <div ref={journeyEl} className="chai-journey">
          <section
            ref={heroEl}
            id="chai-top"
            className="chai-hero"
            aria-labelledby="chai-hero-title"
            tabIndex={-1}
            data-testid="chai-hero"
            data-blend={blend}
            data-time={time}
            data-switching={switching || undefined}
            data-carton={carton || undefined}
            data-copy={copyState}
            data-clarity={clarity || undefined}
            data-packs={BLENDS.filter((id) => packsOk[id]).join(' ')}
          >
            <div ref={stageEl} className="chai-stage" aria-hidden="true">
              {layers.map((l, i) => (
                <div
                  key={l.name}
                  ref={(el) => {
                    layerEls.current[i] = el;
                  }}
                  className={`chai-layer chai-layer--${l.name}`}
                  style={
                    {
                      width: l.w,
                      height: l.h,
                      ...(l.name === 'sky' ? { '--sky-mask': `url(${skyFor(size).mask})` } : {}),
                    } as CSSProperties
                  }
                >
                  {l.name === 'sky' ? (
                    <>
                      {/* The clouds drift on as the time of day turns; the sun travels behind the ridgeline. */}
                      <div className="chai-sky">{plate('sky', base)}</div>
                      {clarity && clear(1, l, <div className="chai-sky">{plate('sky', 'clear')}</div>)}
                      <div ref={sunEl} className="chai-sun">
                        <span className="chai-sun__halo" />
                        <span className="chai-sun__halo chai-sun__halo--late" />
                        <span className="chai-sun__disc" />
                      </div>
                    </>
                  ) : l.name === 'pouch' ? (
                    // Both packs in one box: Heritage Blend under, The Lovely Blend over it, uncovered from the
                    // sun's side by a soft edge as the time of day turns (`--reveal`).
                    <>
                      {/* A carton chosen in the shop: two more pouches fan out behind (CM-018). */}
                      <PackGhosts blend={blend} />
                      {BLENDS.map((id) => (
                        <span key={id} className={`chai-pouch chai-pouch--${id}`}>
                          <img
                            src={bothTimes || id === initialBlendRef.current ? POUCHES[id][size] : undefined}
                            alt=""
                            decoding="async"
                            draggable={false}
                            data-time={timeOf(id)}
                            onLoad={() => packState(id, true)}
                            onError={() => packState(id, false)}
                            {...(id === initialBlendRef.current
                              ? { 'data-first': '', fetchPriority: 'high' as const }
                              : {})}
                          />
                        </span>
                      ))}
                    </>
                  ) : l.name === 'far' ? (
                    <>
                      {plate('far', base)}
                      {clarity && clear(0, l, plate('far', 'clear'))}
                    </>
                  ) : l.name === 'leaves' ? (
                    // The wind: a slow sway, and a gust as the time of day turns.
                    <div className="chai-leaves">
                      <div className="chai-leaves__sway">{plate('leaves')}</div>
                    </div>
                  ) : (
                    plate(l.name)
                  )}
                </div>
              ))}
              <div className="chai-mist chai-mist--a" />
              <div className="chai-mist chai-mist--b" />
              {/* The blend's light across the open side as the shop comes in. */}
              <div ref={washEl} className="chai-wash" />
            </div>
            <p className="sr-only">{copy.blends[blend].heroAlt}</p>
            <div ref={copyEl} className="chai-hero__copy">
              <p className="chai-eyebrow chai-eyebrow--hero">
                <span className="chai-eyebrow__mark" aria-hidden="true" />
                {copy.hero.eyebrow} · {b.size}
              </p>
              <h1 id="chai-hero-title" className="chai-headline" lang="ckb" dir="rtl">
                {copy.brand.slogan}
              </h1>
              <p className="chai-blend-name" data-testid="chai-blend-name">
                {b.name}
              </p>
              <div className="chai-hero__choose">
                <p className="chai-lede">{b.lede}</p>
                <div
                  className="chai-blends"
                  role="radiogroup"
                  aria-label={copy.hero.blends}
                  onKeyDown={onBlendKey}
                  data-testid="chai-blends"
                >
                  {BLENDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      className="chai-blend"
                      data-blend={id}
                      aria-checked={blend === id}
                      tabIndex={blend === id ? 0 : -1}
                      onClick={() => choose(id)}
                    >
                      <span className="chai-blend__swatch" aria-hidden="true" />
                      <span className="chai-blend__name">{copy.blends[id].name}</span>
                    </button>
                  ))}
                </div>
                {/* Straight to the shop: the camera moves in on the blend chosen here. */}
                <a
                  className="chai-buy"
                  href={pathOf('shop')}
                  onClick={(e) => {
                    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    goPage('shop');
                  }}
                  data-testid="chai-buy"
                >
                  <span>{copy.hero.shop}</span>
                  <Arrow />
                </a>
              </div>
              <p className="sr-only" role="status">
                {said}
              </p>
            </div>
            <a
              ref={cueEl}
              className="chai-scroll"
              href="#chai-teas"
              onClick={(e) => {
                e.preventDefault();
                toPart('chai-teas');
              }}
            >
              <span>{copy.hero.scroll}</span>
              <span className="chai-scroll__line" aria-hidden="true" />
            </a>
            <div ref={meltEl} className="chai-hero__melt" aria-hidden="true" />
          </section>

          <Shop
            lang={lang}
            blend={blend}
            onChoose={choose}
            onBlendKey={onBlendKey}
            onOption={(id) => setCarton(id === 'carton')}
            onCheckout={(open) => {
              // The page rests behind the checkout: the picture's drifts pause.
              const root = rootEl.current;
              if (root) {
                if (open) root.dataset.checkout = '';
                else delete root.dataset.checkout;
              }
            }}
            sectionRef={shopEl}
          />
        </div>

        {/* The teas: each blend, what is in it, and Buy now (CM-017). */}
        <Teas lang={lang} onBuy={buy} onStory={() => goPage('about')} />
      </main>

      {/* Our Story, Connect and the footer, on the pack's ink (CM-011): its own page (CM-014). */}
      <About lang={lang} onTop={toTop} />
    </div>
  );
}
