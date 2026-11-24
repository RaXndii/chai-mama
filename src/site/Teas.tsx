import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { chaimama as copy } from '@/content';
import { BLENDS, type BlendId, type IngredientId } from '@/content/chaimama';
import type { Locale } from '@/content/types';
import packLovelyUrl from '../brand/pack-lovely.webp';
import pouchUrl from '../brand/pouch.webp';
import teaLeavesUrl from '../brand/tea-leaves.webp';
import { pathOf } from '../routes';
import { Arrow } from './icons';
import { formatIqd, unitPrice } from './order';
import { LEAF_ATLAS, LEAF_CELLS } from './teaLeaves';

interface Props {
  lang: Locale;
  /** Buy a blend: to the shop, with it chosen. */
  onBuy: (id: BlendId) => void;
  /** On to Our Story. */
  onStory: () => void;
}

const packOf = (b: BlendId) => (b === 'lovely' ? packLovelyUrl : pouchUrl);

/**
 * The teas, under the hero (DECISIONS CM-017): Heritage Blend, then The Lovely Blend — what kind of blend it is,
 * the owner's words about it, what is in it, and Buy now at the owner's price (to the shop, with it chosen).
 * Each card rises in once as it first comes into view.
 */
export default function Teas({ lang, onBuy, onStory }: Props) {
  const root = useRef<HTMLElement>(null);
  const t = copy.teas;
  const price = formatIqd(unitPrice('pouch'), lang);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const parts = [...el.querySelectorAll<HTMLElement>('[data-rise]')];
    if (typeof IntersectionObserver === 'undefined') {
      for (const p of parts) p.dataset.rise = 'in';
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.rise = 'in';
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    for (const p of parts) io.observe(p);
    return () => io.disconnect();
  }, []);

  const plainClick = (go: () => void) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go();
  };

  return (
    <section
      ref={root}
      id="chai-teas"
      className="chai-teas"
      aria-labelledby="chai-teas-title"
      tabIndex={-1}
      data-testid="chai-teas"
    >
      <h2 id="chai-teas-title" className="chai-teas__title" data-rise="">
        {t.title}
      </h2>
      <div className="chai-teas__list">
        {BLENDS.map((id) => {
          const b = copy.blends[id];
          return (
            <article
              key={id}
              className="chai-tea"
              data-blend={id}
              aria-labelledby={`chai-tea-${id}`}
              data-rise=""
              data-testid={`chai-tea-${id}`}
            >
              <div className="chai-tea__stage">
                <img
                  className="chai-tea__pack"
                  src={packOf(id)}
                  alt={b.packAlt}
                  width={id === 'lovely' ? 706 : 720}
                  height={996}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="chai-tea__body">
                <p className="chai-tea__tag">
                  {id === 'heritage' && <span className="chai-tea__flag">{t.flagship}</span>}
                  <span className="chai-tea__kind">{b.kind}</span>
                </p>
                <h3 id={`chai-tea-${id}`} className="chai-tea__name">
                  {b.name}
                </h3>
                <p className="chai-tea__description">{b.description}</p>
                <ul className="chai-tea__inside" aria-label={t.inside}>
                  {b.ingredients.map((ing, i) => (
                    <li key={ing.id} className="chai-ing" style={{ '--i': i } as CSSProperties}>
                      <Ingredient id={ing.id} />
                      <span className="chai-ing__name">{ing.name}</span>
                    </li>
                  ))}
                </ul>
                <a
                  className="chai-tea__buy"
                  href={pathOf('shop')}
                  onClick={plainClick(() => onBuy(id))}
                  data-testid={`chai-buy-${id}`}
                >
                  <span>
                    {t.buy} — {price}
                  </span>
                  <Arrow />
                </a>
              </div>
            </article>
          );
        })}
      </div>
      <a className="chai-teas__more" href={pathOf('about')} onClick={plainClick(onStory)}>
        <span>{copy.about.title}</span>
        <Arrow />
      </a>
    </section>
  );
}

/** Two clumps of the real loose tea cut from the owner's photo (the falling tea's atlas): x, y and size in
 *  the chip, in % of it, and which piece. */
const TEA_PIECES: readonly [number, number, number, number][] = [
  [12, 26, 74, 10],
  [36, 46, 50, 3],
];

/**
 * An ingredient in its chip: Ceylon black tea is the real tea from the owner's photo; the others are drawn here,
 * each in its own colour, so the page needs no more pictures.
 */
function Ingredient({ id }: { id: IngredientId }) {
  if (id === 'ceylon') {
    return (
      <span className="chai-ing__chip" data-ing={id} aria-hidden="true">
        {TEA_PIECES.map(([x, y, size, cell]) => {
          const [cx, cy, cw, ch] = LEAF_CELLS[cell]!;
          // The piece fills `size`% of the chip's width (the chip is square); the atlas is scaled to match.
          return (
            <span
              key={cell}
              className="chai-ing__leaf"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${size}%`,
                height: `${(ch * size) / cw}%`,
                backgroundImage: `url(${teaLeavesUrl})`,
                backgroundSize: `${(LEAF_ATLAS.w / cw) * 100}% auto`,
                backgroundPosition: `${(cx / (LEAF_ATLAS.w - cw)) * 100}% ${(cy / (LEAF_ATLAS.h - ch)) * 100}%`,
              }}
            />
          );
        })}
      </span>
    );
  }
  return (
    <span className="chai-ing__chip" data-ing={id} aria-hidden="true">
      <svg viewBox="0 0 48 48" width="100%" height="100%">
        {DRAWN[id]}
      </svg>
    </span>
  );
}

/** Petal tips around a centre, for the cornflower's ragged blue florets. */
const floret = (n: number, r: number, color: string) =>
  Array.from({ length: n }, (_, i) => (
    <path
      key={i}
      d={`M24 24 L${24 - 3.2} ${24 - r * 0.55} L${24 - 2} ${24 - r * 0.78} L24 ${24 - r} L${24 + 2} ${24 - r * 0.78} L${24 + 3.2} ${24 - r * 0.55} Z`}
      fill={color}
      transform={`rotate(${(360 / n) * i + 11} 24 24)`}
    />
  ));

const DRAWN: Record<Exclude<IngredientId, 'ceylon'>, ReactNode> = {
  cornflower: (
    <g>
      {floret(9, 17, '#4f7be0')}
      {floret(9, 12, '#3558c4')}
      <circle cx="24" cy="24" r="4.2" fill="#24306f" />
      <circle cx="24" cy="24" r="1.6" fill="#8fa6f0" />
    </g>
  ),
  rose: (
    <g>
      {/* Three dried rose petals, each a soft cup with its darker heel. */}
      {(
        [
          [17, 21, -35, '#e98aa1', '#c9506d'],
          [30, 20, 30, '#f2a7b8', '#d06a83'],
          [23, 32, 170, '#dc6d89', '#b4405e'],
        ] as const
      ).map(([x, y, turn, light, dark], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${turn})`}>
          <path
            d="M0 -10C6.5 -10 9.5 -4.5 7 1.5 5 6.5 2 9 0 9S-5 6.5-7 1.5C-9.5-4.5-6.5-10 0-10Z"
            fill={light}
          />
          <path d="M0 9C-1.5 6.5-1.8 4-1 2.2 0 3 1 3 2 2.2 2.6 4.5 1.6 7 0 9Z" fill={dark} />
          <path
            d="M0 2C-.6-2.5-.2-6 .8-8.5"
            stroke={dark}
            strokeWidth=".7"
            fill="none"
            strokeLinecap="round"
            opacity=".6"
          />
        </g>
      ))}
    </g>
  ),
  cardamom: (
    <g>
      <g transform="rotate(-28 18 24)">
        <ellipse cx="18" cy="24" rx="6.5" ry="12" fill="#a3bd6c" />
        <path d="M18 12.5v23" stroke="#6f8d3c" strokeWidth="1.1" />
        <path
          d="M18 11.5c0-1.5.8-2.5 1.8-3"
          stroke="#6f8d3c"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      {/* A pod split open, its dark seeds showing: crushed. */}
      <g transform="rotate(22 31 27)">
        <path d="M25 27c0-7 3-11 6-11s6 4 6 11-3 11-6 11-6-4-6-11Z" fill="#8fab58" />
        <path d="M27.5 27c0-5 1.6-8 3.5-8s3.5 3 3.5 8-1.6 8-3.5 8-3.5-3-3.5-8Z" fill="#e9e1c4" />
        <circle cx="30" cy="23" r="1.4" fill="#3b2a1a" />
        <circle cx="32.2" cy="26.5" r="1.4" fill="#3b2a1a" />
        <circle cx="29.6" cy="29.5" r="1.4" fill="#3b2a1a" />
        <circle cx="31.8" cy="32.6" r="1.3" fill="#3b2a1a" />
      </g>
    </g>
  ),
  earlgrey: (
    <g>
      {/* Bergamot, the citrus of Earl Grey: a slice and a leaf. */}
      <path d="M31 13c5-3 9-2 11 1-4 3-8 3-11-1Z" fill="#6e9a4a" />
      <circle cx="23" cy="26" r="13" fill="#e6bd3d" />
      <circle cx="23" cy="26" r="11" fill="#f7e08a" />
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d="M23 26 L23 16"
          stroke="#fff6d4"
          strokeWidth="1.3"
          strokeLinecap="round"
          transform={`rotate(${i * 45} 23 26)`}
        />
      ))}
      <circle cx="23" cy="26" r="2" fill="#fff6d4" />
    </g>
  ),
};
