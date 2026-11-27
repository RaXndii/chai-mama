import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref } from 'react';
import { qualityStore } from '@/app/quality';
import { chaimama as copy } from '@/content';
import { BLENDS, type BlendId } from '@/content/chaimama';
import { LOCALES, type Locale } from '@/content/types';
import packLovelyUrl from '../brand/pack-lovely.webp';
import pouchUrl from '../brand/pouch.webp';
import { POUCHES } from './arrival';
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
import Checkout from './Checkout';
import { Ingredient } from './Teas';

interface Props {
  lang: Locale;
  /** The visitor's choice: the shop's words follow it at once (only the scene behind turns slowly). */
  blend: BlendId;
  onChoose: (id: BlendId) => void;
  onBlendKey: (e: KeyboardEvent<HTMLDivElement>) => void;
  /** The way to buy chosen (the picture stacks pouches behind the pack for a carton). */
  onOption: (id: OptionId) => void;
  /** The checkout opened or closed (the page rests behind it). */
  onCheckout: (open: boolean) => void;
  sectionRef: Ref<HTMLElement>;
}

const packOf = (b: BlendId) => (b === 'lovely' ? packLovelyUrl : pouchUrl);

/**
 * The shop (DECISIONS CM-010, CM-018, CM-019), on one screen, in few words. On a wider screen, beside the pack in
 * the picture: the switch between the blends, the blend, what is in it (the owner's photographs) and what is
 * printed on the pack (icons); the two ways to buy, how many; and the summary card with Order now. On a phone,
 * the pack in a band at the top and the rest on a sheet under it, the details folded.
 *
 * Choosing a pouch or a carton: a highlight glides to it, its check draws itself, the prices roll to their new
 * value, and for a carton two more pouches fan out behind the pack. Order now opens the checkout. The prices
 * are the owner's (order.ts); no offers or promises are shown.
 */
export default function Shop({ lang, blend, onChoose, onBlendKey, onOption, onCheckout, sectionRef }: Props) {
  const [option, setOption] = useState<OptionId>('pouch');
  const [qty, setQty] = useState(MIN_QTY);
  const [details, setDetails] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const orderBtn = useRef<HTMLButtonElement>(null);
  const b = copy.blends[blend];
  const s = copy.shop;
  const rtl = LOCALES[lang].dir === 'rtl';

  const pick = (id: OptionId) => {
    setOption(id);
    onOption(id);
  };
  const step = (d: number) => setQty((q) => clampQty(q + d));
  const onOptionKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const flip = rtl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ? -1 : 1;
    const i = (OPTIONS.indexOf(option) + keys[e.key]! * flip + OPTIONS.length) % OPTIONS.length;
    const next = OPTIONS[i]!;
    pick(next);
    (e.currentTarget.querySelector(`[data-option="${next}"]`) as HTMLElement | null)?.focus();
  };
  const openCheckout = (open: boolean) => {
    setCheckout(open);
    onCheckout(open);
    if (!open) requestAnimationFrame(() => orderBtn.current?.focus({ preventScroll: true }));
  };

  /** Each way to buy in a word and its numbers: 200g; 42 × 2,750 IQD. */
  const optionText = (id: OptionId) => {
    const o = ORDER_OPTIONS[id];
    if (id === 'pouch') return { name: s.pouch, detail: s.weight };
    return { name: s.carton, detail: `${formatCount(o.pouches, lang)} × ${formatIqd(o.perPouch, lang)}` };
  };

  return (
    <section
      ref={sectionRef}
      id="chai-tea"
      className="chai-shop"
      aria-labelledby="chai-shop-title"
      tabIndex={-1}
      data-blend={blend}
      data-option={option}
      data-testid="chai-shop"
    >
      {/* Where the pack stands (the picture is pinned behind the shop): beside the panel on a wider screen, in
          the picture itself; on a phone, above the sheet, the pack comes out of the picture into this band. */}
      <div className="chai-shop__view" role="img" aria-label={b.packAlt}>
        <div className="chai-shop__pack" aria-hidden="true">
          <PackGhosts blend={blend} />
          {BLENDS.map((id) => (
            <img
              key={id}
              className="chai-shop__pack-img"
              data-on={id === blend || undefined}
              src={POUCHES[id].large}
              alt=""
              width={410}
              height={556}
              decoding="async"
            />
          ))}
        </div>
      </div>
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
          <div className="chai-shop__head">
            <h2 id="chai-shop-title" className="chai-shop__name" data-testid="chai-shop-name">
              {b.name}
            </h2>
            <p className="chai-shop__price">
              <Rolling value={unitPrice(option)} lang={lang} testId="chai-unit" />
            </p>
          </div>
          <p className="chai-shop__tag">
            {b.kind} · {s.weight}
          </p>
          {/* What is in it, in pictures (the owner's photographs). */}
          <ul className="chai-shop__inside" aria-label={copy.teas.inside}>
            {b.ingredients.map((ing) => (
              <li key={ing.id} className="chai-ing">
                <Ingredient id={ing.id} />
                <span className="chai-ing__name">{ing.name}</span>
              </li>
            ))}
          </ul>
          <ul className="chai-shop__facts chai-shop__facts--wide">
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
            style={{ '--o': OPTIONS.indexOf(option) } as CSSProperties}
            data-testid="chai-options"
          >
            {/* The highlight that glides to the way chosen. */}
            <span className="chai-options__glide" aria-hidden="true" />
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
                  onClick={() => pick(id)}
                >
                  <OptionGlyph id={id} />
                  <span className="chai-option__text">
                    <span className="chai-option__name">{t.name}</span>
                    <span className="chai-option__detail">{t.detail}</span>
                  </span>
                  <span className="chai-option__price">{formatIqd(unitPrice(id), lang)}</span>
                  <span className="chai-option__check" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24">
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={1}
                      />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="chai-shop__buy">
          <div className="chai-shop__row">
            <p className="chai-shop__label chai-shop__label--row" id="chai-qty-label">
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
          </div>

          {/* A phone's details, folded: the blend's own words and what is printed on the pack. */}
          <div className="chai-details" data-open={details || undefined}>
            <button
              type="button"
              className="chai-details__toggle"
              aria-expanded={details}
              aria-controls="chai-details-body"
              onClick={() => setDetails((d) => !d)}
              data-testid="chai-details"
            >
              <span>{s.details}</span>
              <span className="chai-details__sign" aria-hidden="true" />
            </button>
            <div id="chai-details-body" className="chai-details__body" inert={!details}>
              <div className="chai-details__inner">
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
            </div>
          </div>
        </div>

        <aside className="chai-summary" aria-label={s.subtotal} data-testid="chai-summary">
          <dl className="chai-summary__rows">
            <div>
              <dt>{optionText(option).name}</dt>
              <dd>{formatIqd(unitPrice(option), lang)}</dd>
            </div>
            <div>
              <dt>{s.quantity}</dt>
              <dd>× {formatCount(qty, lang)}</dd>
            </div>
            <div>
              <dt>{s.delivery}</dt>
              <dd>{s.deliveryValue}</dd>
            </div>
          </dl>
          <div className="chai-summary__total">
            <span className="chai-shop__label">{s.subtotal}</span>
            <strong className="chai-shop__sum">
              <Rolling value={subtotal(option, qty)} lang={lang} testId="chai-subtotal" />
            </strong>
            <span className="chai-shop__note">
              {s.delivery}: {s.deliveryValue}
            </span>
          </div>
          <button
            ref={orderBtn}
            type="button"
            className="chai-order"
            aria-haspopup="dialog"
            aria-expanded={checkout}
            onClick={() => openCheckout(true)}
            data-testid="chai-order"
          >
            <svg className="chai-order__icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
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
        </aside>
      </div>
      {checkout && (
        <Checkout
          lang={lang}
          blend={blend}
          option={option}
          qty={qty}
          host={document.querySelector<HTMLElement>('.chai') ?? document.body}
          from={orderBtn.current}
          onClose={() => openCheckout(false)}
        />
      )}
    </section>
  );
}

/**
 * A price that rolls to its new value (about 0.4 s, quick then settling) and gives a small pulse as it lands.
 * Written straight to its own text (no React render per frame); at once under reduced motion.
 */
function Rolling({ value, lang, testId }: { value: number; lang: Locale; testId: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const from = shown.current;
    const write = (v: number) => {
      node.textContent = formatIqd(v, lang);
    };
    if (from === value || qualityStore.getState().reducedMotion) {
      shown.current = value;
      write(value);
      return;
    }
    let raf = 0;
    let t0 = -1;
    const step = (now: number) => {
      if (t0 < 0) t0 = now;
      const f = Math.min(1, (now - t0) / 420);
      const e = 1 - (1 - f) ** 3;
      // Whole hundreds on the way, the exact price at the end.
      const v = f < 1 ? Math.round((from + (value - from) * e) / 100) * 100 : value;
      shown.current = v;
      write(v);
      if (f < 1) raf = requestAnimationFrame(step);
      else
        node.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], {
          duration: 280,
          easing: 'ease-out',
        });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, lang]);
  return <span ref={el} className="chai-rolling" data-testid={testId} />;
}

/** A pouch, or a carton of them: line icons in the pack's ink. */
function OptionGlyph({ id }: { id: OptionId }) {
  return (
    <svg
      className="chai-option__icon"
      width="30"
      height="30"
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

/**
 * A carton: two more pouches of the blend, fanned out behind the pack (shown by the page's CSS when a carton is
 * chosen in the shop; at rest they sit hidden behind it).
 */
export function PackGhosts({ blend }: { blend: BlendId }) {
  return (
    <>
      {(['a', 'b'] as const).map((k) => (
        <img
          key={k}
          className={`chai-ghost chai-ghost--${k}`}
          src={POUCHES[blend].large}
          alt=""
          width={410}
          height={556}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
      ))}
    </>
  );
}
