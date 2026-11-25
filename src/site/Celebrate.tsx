import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { qualityStore } from '@/app/quality';
import badgeUrl from '../brand/mama-badge.webp';
import { playChime, playClink } from './chime';

/**
 * The order goes in (DECISIONS CM-020): the pack flies from the checkout's corner into a ring that draws itself;
 * as it lands, the ring pulses, tea leaves, rose petals, cardamom and saffron burst out of it, and Mama — the
 * pack's own man with his glass of tea — pops up inside it in place of a check mark, and winks; a little check
 * joins him. Over it all, a bell chord and the clink of a tea glass on the wink (chime.ts); a short buzz on a
 * phone that has one. Tapping Mama makes him wink again.
 *
 * Under reduced motion the pack does not fly and nothing bursts: the ring is there and Mama fades in.
 */
export const LAND_S = 0.56;
export const WINK_S = 1.25;

/** The burst: pieces of what is in the tea, evenly round with a little scatter, each its own way out. */
const PIECES = Array.from({ length: 16 }, (_, i) => {
  const kinds = ['leaf', 'petal', 'seed', 'saffron'] as const;
  const kind = kinds[i % 4]!;
  const jitter = ((i * 37) % 11) / 11 - 0.5;
  return {
    kind,
    a: (i / 16) * 360 + jitter * 16,
    d: 78 + ((i * 53) % 7) * 7,
    r: ((i * 71) % 9) * 40 - 160,
    s: 0.75 + ((i * 29) % 5) * 0.1,
  };
});

interface Props {
  /** The pack in the checkout's header: where the flight starts. */
  from: HTMLElement | null;
  /** Rings out once (not again when the view is drawn again). */
  sound: boolean;
}

export default function Celebrate({ from, sound }: Props) {
  const win = useRef<HTMLDivElement>(null);
  const [winks, setWinks] = useState(0);
  const rang = useRef(false);

  useLayoutEffect(() => {
    const target = win.current;
    const still = qualityStore.getState().reducedMotion;
    if (sound && !rang.current && target) {
      rang.current = true;
      if (playChime({ land: still ? 0.05 : LAND_S, wink: WINK_S })) target.dataset.chime = '';
      try {
        window.setTimeout(() => navigator.vibrate?.([14, 50, 22]), (still ? 50 : LAND_S * 1000) | 0);
      } catch {
        /* no buzz here */
      }
    }
    if (still || !from || !target) return;
    // The flight: a copy of the pack, from its place in the header, in an arc down into the ring.
    const a = from.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const root = from.closest('.chai-checkout') ?? document.body;
    const fly = from.cloneNode(true) as HTMLElement;
    fly.className = 'chai-win__fly';
    Object.assign(fly.style, {
      left: `${a.left}px`,
      top: `${a.top}px`,
      width: `${a.width}px`,
      height: `${a.height}px`,
    });
    root.appendChild(fly);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const lift = Math.min(140, Math.abs(dy) * 0.5 + 60);
    const frames: Keyframe[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      // Quick off the mark, gathering speed as it drops in.
      const e = t * t * (3 - 2 * t) * 0.35 + t * t * 0.65;
      const x = dx * e;
      const y = dy * e - lift * 4 * e * (1 - e);
      const sc = 1.25 - 0.85 * e ** 1.6;
      frames.push({
        transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(-14 * Math.sin(Math.PI * e) + 10 * e).toFixed(1)}deg) scale(${sc.toFixed(3)})`,
        opacity: t > 0.9 ? (1 - t) * 10 : 1,
      });
    }
    const anim = fly.animate(frames, { duration: LAND_S * 1000, easing: 'linear', fill: 'forwards' });
    anim.onfinish = () => fly.remove();
    return () => {
      anim.cancel();
      fly.remove();
    };
    // Once, as the thanks appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={win}
      className="chai-win"
      aria-hidden="true"
      data-testid="chai-win"
      data-winks={winks}
      onClick={() => {
        setWinks((n) => n + 1);
        playClink();
      }}
    >
      <span className="chai-win__ripple" />
      <span className="chai-win__burst">
        {PIECES.map((p, i) => (
          <i
            key={i}
            className={`chai-win__bit chai-win__bit--${p.kind}`}
            style={{ '--a': `${p.a}deg`, '--d': `${p.d}px`, '--r': `${p.r}deg`, '--s': p.s } as CSSProperties}
          />
        ))}
      </span>
      <svg className="chai-win__ring" viewBox="0 0 120 120">
        <circle className="chai-win__track" cx="60" cy="60" r="56" />
        <circle className="chai-win__arc" cx="60" cy="60" r="56" pathLength={1} />
      </svg>
      <span className="chai-win__face">
        {/* Mama, and the eye he closes: the lid over his eye (his face is white) and the closed eye's curve. */}
        <svg viewBox="0 0 1300 1300">
          <image href={badgeUrl} width="1300" height="1300" />
          <g key={winks} className="chai-win__lid" data-again={winks > 0 || undefined}>
            <rect x="544" y="418" width="82" height="58" rx="18" fill="#fff" />
            <path
              d="M540 443L545 437.8L550 433.9L555 430.4L560 427.5L565 425.2L570 423.4L575 422.4L580 422L585 422.4L590 423.4L595 425.2L600 427.5L605 430.4L610 433.9L615 437.8L620 443L620 449L615 448.3L610 446.6L605 444.9L600 443.3L595 441.9L590 440.9L585 440.2L580 440L575 440.2L570 440.9L565 441.9L560 443.3L555 444.9L550 446.6L545 448.3L540 449Z"
              fill="#16130f"
            />
          </g>
        </svg>
      </span>
      <span className="chai-win__tick">
        <svg viewBox="0 0 24 24">
          <path d="M6 12.5l4 4L18 8" pathLength={1} />
        </svg>
      </span>
    </div>
  );
}
