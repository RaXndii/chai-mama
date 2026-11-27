import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import { chaimama as copy } from '@/content';
import { BLENDS, type BlendId, type IngredientId } from '@/content/chaimama';
import type { Locale } from '@/content/types';
import packLovelyUrl from '../brand/pack-lovely.webp';
import pouchUrl from '../brand/pouch.webp';
import cardamomUrl from '../brand/ingredients/cardamom.webp';
import ceylonUrl from '../brand/ingredients/ceylon.webp';
import cornflowerUrl from '../brand/ingredients/cornflower.webp';
import earlGreyUrl from '../brand/ingredients/earlgrey.webp';
import roseUrl from '../brand/ingredients/rose.webp';
import { pathOf } from '../routes';
import { Arrow } from './icons';
import { formatIqd, unitPrice } from './order';

interface Props {
  lang: Locale;
  /** Buy a blend: to the shop, with it chosen. */
  onBuy: (id: BlendId) => void;
}

const packOf = (b: BlendId) => (b === 'lovely' ? packLovelyUrl : pouchUrl);

/**
 * The teas, under the hero (DECISIONS CM-017): Heritage Blend, then The Lovely Blend — what kind of blend it is,
 * the owner's words about it, what is in it, and Buy now at the owner's price (to the shop, with it chosen).
 * Each card rises in once as it first comes into view.
 */
export default function Teas({ lang, onBuy }: Props) {
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
    </section>
  );
}

/** The owner's photographs of what is in the teas, each cropped to the middle of its pile (192 px). */
const PHOTOS: Record<IngredientId, string> = {
  ceylon: ceylonUrl,
  cornflower: cornflowerUrl,
  rose: roseUrl,
  cardamom: cardamomUrl,
  earlgrey: earlGreyUrl,
};

/** An ingredient on its round chip: the owner's photograph of it. */
export function Ingredient({ id }: { id: IngredientId }) {
  return (
    <span className="chai-ing__chip" aria-hidden="true">
      <img src={PHOTOS[id]} alt="" width={192} height={192} loading="lazy" decoding="async" />
    </span>
  );
}
