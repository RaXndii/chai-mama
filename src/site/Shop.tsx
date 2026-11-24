import { useState, type CSSProperties, type KeyboardEvent, type Ref } from 'react';
import { chaimama as copy } from '@/content';
import { BLENDS, type BlendId } from '@/content/chaimama';
import { LOCALES, type Locale } from '@/content/types';
import packLovelyUrl from '../brand/pack-lovely.webp';
import pouchUrl from '../brand/pouch.webp';
import { Arrow, FactGlyph } from './icons';
import {
  clampQty,
  formatCount,
  formatIqd,
  MAX_QTY,
  MIN_QTY,
  OPTIONS,
  ORDER_OPTIONS,
  subtotal,
  unitPrice,
  type OptionId,
} from './order';

interface Props {
  lang: Locale;
  /** The visitor's choice (the switch shows it at once). */
  blend: BlendId;
  /** The blend whose words are on the page (it follows the choice while the words are faded out). */
  shown: BlendId;
  /** The words' fade, as in the hero. */
  copyState: 'in' | 'out' | 'back';
  onChoose: (id: BlendId) => void;
  onBlendKey: (e: KeyboardEvent<HTMLDivElement>) => void;
  sectionRef: Ref<HTMLElement>;
}

const packOf = (b: BlendId) => (b === 'lovely' ? packLovelyUrl : pouchUrl);

/**
 * The shop (DECISIONS CM-010), after the owner's shop picture: the pack on its rock in the tea country on one
 * side (the hero's own picture, pinned behind), and on the other, in the blend's light, the tea, what is in it,
 * the two ways to buy it, how many, and what that comes to. The blend switch here is the hero's: the same
 * change of light, the same pack uncovered on the rock, and the colours of the shop follow it.
 *
 * Ordering is not open on the site yet (the owner, 2026-10-22): the button says so, and pressing it says that
 * nothing was ordered. The prices are the owner's (order.ts); no offers, delivery terms or promises are shown.
 */
export default function Shop({ lang, blend, shown, copyState, onChoose, onBlendKey, sectionRef }: Props) {
  const [option, setOption] = useState<OptionId>('pouch');
  const [qty, setQty] = useState(MIN_QTY);
  const [noted, setNoted] = useState(0);
  const b = copy.blends[shown];
  const s = copy.shop;
  const iqd = (n: number) => formatIqd(n, lang);
  const total = subtotal(option, qty);
  const rtl = LOCALES[lang].dir === 'rtl';

  const step = (d: number) => setQty((q) => clampQty(q + d));
  const onOptionKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const flip = rtl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ? -1 : 1;
    const i = (OPTIONS.indexOf(option) + keys[e.key]! * flip + OPTIONS.length) % OPTIONS.length;
    const next = OPTIONS[i]!;
    setOption(next);
    (e.currentTarget.querySelector(`[data-option="${next}"]`) as HTMLElement | null)?.focus();
  };

  const optionText = (id: OptionId) => {
    const o = ORDER_OPTIONS[id];
    if (id === 'pouch') return { name: s.pouch, detail: `${s.weight} · ${iqd(o.perPouch)}`, total: null };
    return {
      name: s.carton,
      detail: `${s.pouches(formatCount(o.pouches, lang))} · ${s.each(iqd(o.perPouch))}`,
      total: s.perCarton(iqd(unitPrice(id))),
    };
  };

  return (
    <section
      ref={sectionRef}
      id="chai-tea"
      className="chai-shop"
      aria-labelledby="chai-shop-title"
      tabIndex={-1}
      data-blend={shown}
      data-copy={copyState}
      data-testid="chai-shop"
    >
      {/* Where the pack stands on its rock (the picture is pinned behind the shop): above the shop on a phone,
          beside it on a wider screen. */}
      <div className="chai-shop__view" role="img" aria-label={b.packAlt} />
      <div className="chai-shop__panel">
        <div className="chai-shop__info">
          <p className="chai-eyebrow chai-eyebrow--hero chai-shop__eyebrow">
            <span className="chai-eyebrow__mark" aria-hidden="true" />
            {s.eyebrow} · {copy.product.kind}
          </p>
          <div
            className="chai-picks"
            role="radiogroup"
            aria-label={s.choose}
            onKeyDown={onBlendKey}
            style={{ '--i': BLENDS.indexOf(blend) } as CSSProperties}
            data-testid="chai-shop-blends"
          >
            <span className="chai-picks__slide" aria-hidden="true" />
            {BLENDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                className="chai-pick"
                data-blend={id}
                aria-checked={blend === id}
                tabIndex={blend === id ? 0 : -1}
                onClick={() => onChoose(id)}
              >
                <img
                  src={packOf(id)}
                  alt=""
                  width={id === 'lovely' ? 706 : 720}
                  height={996}
                  loading="lazy"
                  decoding="async"
                />
                <span>{copy.blends[id].name}</span>
              </button>
            ))}
          </div>
          <h2 id="chai-shop-title" className="chai-shop__name" data-testid="chai-shop-name">
            {b.name}
          </h2>
          <p className="chai-shop__size">{b.size}</p>
          <p className="chai-shop__description">{b.description}</p>
          <ul className="chai-shop__facts">
            {b.facts.map((f) => (
              <li key={f.text}>
                <FactGlyph icon={f.icon} />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="chai-shop__options">
          <p className="chai-shop__label" id="chai-order-label">
            {s.order}
          </p>
          <div
            className="chai-options"
            role="radiogroup"
            aria-labelledby="chai-order-label"
            onKeyDown={onOptionKey}
            data-testid="chai-options"
          >
            {OPTIONS.map((id) => {
              const t = optionText(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  className="chai-option"
                  data-option={id}
                  aria-checked={option === id}
                  tabIndex={option === id ? 0 : -1}
                  onClick={() => setOption(id)}
                >
                  <OptionGlyph id={id} />
                  <span className="chai-option__text">
                    <span className="chai-option__name">{t.name}</span>
                    <span className="chai-option__detail">{t.detail}</span>
                    {t.total && <span className="chai-option__total">{t.total}</span>}
                  </span>
                  <span className="chai-option__check" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24">
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="chai-shop__buy">
          <p className="chai-shop__label" id="chai-qty-label">
            {s.quantity}
          </p>
          <div className="chai-qty" role="group" aria-labelledby="chai-qty-label">
            <button
              type="button"
              className="chai-qty__step"
              aria-label={s.less}
              aria-disabled={qty <= MIN_QTY}
              onClick={() => step(-1)}
              data-testid="chai-qty-less"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
            <output className="chai-qty__n" aria-live="polite" data-testid="chai-qty">
              <span key={qty}>{formatCount(qty, lang)}</span>
            </output>
            <button
              type="button"
              className="chai-qty__step"
              aria-label={s.more}
              aria-disabled={qty >= MAX_QTY}
              onClick={() => step(1)}
              data-testid="chai-qty-more"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            className="chai-order"
            aria-disabled="true"
            aria-describedby="chai-order-note"
            onClick={() => setNoted((n) => n + 1)}
            data-noted={noted > 0 || undefined}
            data-testid="chai-order"
          >
            <svg
              className="chai-order__icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              aria-hidden="true"
              key={noted}
            >
              <path
                d="M3 4h2.2l2.3 11h10.4l2-8H6.4M9.5 19.5a1 1 0 1 0 0 .01M17 19.5a1 1 0 1 0 0 .01"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{s.cta}</span>
            <Arrow />
          </button>
          <p id="chai-order-note" className="chai-order__note" role="status" data-on={noted > 0 || undefined}>
            {noted > 0 ? s.ctaNote : ''}
          </p>
        </div>

        <aside className="chai-summary" aria-labelledby="chai-summary-title" data-testid="chai-summary">
          <h3 id="chai-summary-title" className="chai-summary__title">
            {s.summary}
          </h3>
          <dl className="chai-summary__rows">
            <div>
              <dt>{s.unit}</dt>
              <dd key={option} data-testid="chai-unit">
                {iqd(unitPrice(option))}
              </dd>
            </div>
            <div>
              <dt>{s.quantity}</dt>
              <dd key={qty}>× {formatCount(qty, lang)}</dd>
            </div>
            <div>
              <dt>{s.delivery}</dt>
              <dd>{s.deliveryValue}</dd>
            </div>
          </dl>
          <div className="chai-summary__total">
            <span>{s.subtotal}</span>
            <strong key={total} data-testid="chai-subtotal">
              {iqd(total)}
            </strong>
          </div>
          <p className="chai-summary__note">{s.subtotalNote}</p>
        </aside>
      </div>
    </section>
  );
}

/** A pouch, or a carton of them: line icons in the pack's ink. */
function OptionGlyph({ id }: { id: OptionId }) {
  return (
    <svg
      className="chai-option__icon"
      width="34"
      height="34"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {id === 'pouch' ? (
        <path
          d="M10 5.5h12l-.6 2.4c2 1.6 3.1 4.8 3.1 9.6V25a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 25v-7.5c0-4.8 1.1-8 3.1-9.6L10 5.5Zm.7 2.4h10.6M11 19.5h10M11 22.5h6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M4.5 10 16 4.5 27.5 10v12.5L16 28 4.5 22.5V10Zm0 0L16 15.5 27.5 10M16 15.5V28M10.2 7.3l11.5 5.5v4.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
