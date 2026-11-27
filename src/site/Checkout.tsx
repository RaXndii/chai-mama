import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { qualityStore } from '@/app/quality';
import { chaimama as copy } from '@/content';
import type { BlendId } from '@/content/chaimama';
import { LOCALES, type Locale } from '@/content/types';
import { POUCHES } from './arrival';
import Celebrate from './Celebrate';
import {
  DEFAULT_DIAL,
  DIALS,
  dialOf,
  emailOk,
  readPhone,
  sendOrder,
  showPhone,
  type Place,
} from './checkout';
import { primeChime } from './chime';
import { formatCount, formatIqd, subtotal, unitPrice, type OptionId } from './order';

/** How long the checkout takes to go (it shrinks back into its button, or fades). */
const LEAVE_MS = 380;

// The map (with Leaflet) is its own chunk, fetched only when the visitor opens it.
const MapPicker = lazy(() => import('./MapPicker'));

interface Props {
  lang: Locale;
  blend: BlendId;
  option: OptionId;
  qty: number;
  /** Where to put the checkout in the page (the site's root, outside anything that moves). */
  host: HTMLElement;
  /** The button it opens from: on a phone the checkout grows out of it, and goes back into it. */
  from?: HTMLElement | null;
  onClose: () => void;
}

type Field = 'name' | 'phone' | 'email' | 'location';

/**
 * The checkout (DECISIONS CM-019), after the owner's liquid-glass reference, in Chai Mama's colours: a pane of
 * warm glass over the shop whose rim catches the light on the side nearest the pointer; a drop of the same glass
 * slides on a spring between its two steps (who it is for, where it goes); the button's words roll over letter
 * by letter; and placing the order squashes the pane like a drop landing before it settles on the thanks.
 *
 * It asks what the owner's own shop asks: a full name, a phone (Iraq first, the Middle East, then Europe), an
 * email if they like, where to deliver it — pinned on a map, or typed where the map cannot load — and notes.
 */
export default function Checkout({ lang, blend, option, qty, host, from, onClose }: Props) {
  const c = copy.checkout;
  const uid = useId().replace(/:/g, '');
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const packImg = useRef<HTMLImageElement>(null);
  const [step, setStep] = useState<0 | 1>(0);
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done'>('idle');
  const [result, setResult] = useState<'sent' | 'unsent'>('unsent');
  const [name, setName] = useState('');
  const [dial, setDial] = useState(DEFAULT_DIAL);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [typed, setTyped] = useState<{ city: string; address: string } | null>(null);
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<{ field: Field | 'form'; text: string } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [squish, setSquish] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const d = dialOf(dial);
  const total = subtotal(option, qty);
  const rtl = LOCALES[lang].dir === 'rtl';

  /** Close: on a phone it shrinks back into the button it came from, on a wider screen the pane fades. */
  const close = () => {
    if (leaving) return;
    if (qualityStore.getState().reducedMotion) return onClose();
    setLeaving(true);
    window.setTimeout(onClose, LEAVE_MS);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  // On a phone it grows out of the button pressed (CM-022): the circle opens from there.
  useLayoutEffect(() => {
    const r = root.current;
    const b = from?.getBoundingClientRect();
    if (!r || !b) return;
    const box = r.getBoundingClientRect();
    r.style.setProperty('--ox', `${Math.round(b.left + b.width / 2 - box.left)}px`);
    r.style.setProperty('--oy', `${Math.round(b.top + b.height / 2 - box.top)}px`);
  }, [from]);

  // The checkout fills what can be seen of the screen — above the keyboard once it is up — so the field being
  // filled and the button under it are never behind it (a phone's keyboard covers the page, it does not move it).
  useEffect(() => {
    const vv = window.visualViewport;
    const r = root.current;
    if (!vv || !r) return;
    const fit = () => {
      r.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      r.style.setProperty('--vvt', `${Math.round(vv.offsetTop)}px`);
    };
    fit();
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
    return () => {
      vv.removeEventListener('resize', fit);
      vv.removeEventListener('scroll', fit);
    };
  }, []);

  // Opened: with a keyboard and mouse the first field takes the focus (on a touch screen the visitor taps it:
  // a keyboard springing up mid-animation would only push it about). Escape closes (the map first, when open).
  useEffect(() => {
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches)
      first.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || mapOpen) return;
      e.preventDefault();
      closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mapOpen]);

  /** The light on the rim, toward the pointer. */
  const light = (e: PointerEvent<HTMLDivElement>) => {
    const el = panel.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };

  const fail = (field: Field | 'form', text: string) => {
    setError({ field, text });
    return false;
  };
  const checkDetails = () => {
    if (name.trim().length < 2) return fail('name', c.errors.name);
    if (!readPhone(d, phone)) return fail('phone', c.errors.phone);
    if (email.trim() && !emailOk(email)) return fail('email', c.errors.email);
    setError(null);
    return true;
  };
  const where = (): Place | null =>
    place ??
    (typed && typed.address.trim() && typed.city.trim()
      ? { label: `${typed.address.trim()}, ${typed.city.trim()}`, city: typed.city.trim() }
      : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (phase === 'busy') return;
    if (step === 0) {
      if (checkDetails()) setStep(1);
      return;
    }
    const to = where();
    if (!to) return void fail('location', c.errors.location);
    setError(null);
    // In the tap itself: the sound of the order going in may play once it has gone (chime.ts).
    primeChime();
    setPhase('busy');
    try {
      const sent = await sendOrder({
        blend,
        option,
        quantity: qty,
        unitPrice: unitPrice(option),
        total,
        currency: 'IQD',
        name: name.trim(),
        phone: `+${d.code}${readPhone(d, phone)}`,
        email: email.trim() || undefined,
        place: to,
        landmark: landmark.trim() || undefined,
        notes: notes.trim() || undefined,
        lang,
      });
      setResult(sent);
      setSquish((s) => s + 1);
      setPhase('done');
    } catch {
      setPhase('idle');
      fail('form', c.errors.send);
    }
  };

  const goStep = (s: 0 | 1) => {
    if (s === step || phase !== 'idle') return;
    if (s === 1 && !checkDetails()) return;
    setError(null);
    setStep(s);
  };

  const label = phase === 'busy' ? c.placing : step === 0 ? c.next : c.place;
  const errFor = (f: Field) => (error?.field === f ? `${uid}-err` : undefined);
  const b = copy.blends[blend];
  const s = copy.shop;
  const what = `${option === 'pouch' ? s.pouch : s.carton} × ${formatCount(qty, lang)}`;

  return createPortal(
    <div
      ref={root}
      className="chai-checkout"
      data-testid="chai-checkout"
      data-leaving={leaving || undefined}
      onFocus={(e) => {
        // A field tapped as the keyboard comes up: kept in sight once the screen has made room for it.
        const el = e.target as HTMLElement;
        if (el.matches('input, textarea, select'))
          window.setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300);
      }}
    >
      <div className="chai-checkout__scrim" onClick={close} aria-hidden="true" />
      <div
        ref={panel}
        className="chai-checkout__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        data-squish={squish ? (squish % 2 ? 'a' : 'b') : undefined}
        data-blend={blend}
        onPointerMove={light}
      >
        <span className="chai-checkout__rim" aria-hidden="true" />
        <header className="chai-checkout__head">
          <img
            ref={packImg}
            className="chai-checkout__pack"
            src={POUCHES[blend].small}
            alt=""
            width={41}
            height={56}
          />
          <div className="chai-checkout__what">
            <h2 id={`${uid}-title`} className="chai-checkout__title">
              {b.name}
            </h2>
            <p className="chai-checkout__line">{what}</p>
          </div>
          <strong className="chai-checkout__total" data-testid="chai-checkout-total">
            {formatIqd(total, lang)}
          </strong>
          <button type="button" className="chai-checkout__close" onClick={close} aria-label={copy.nav.close}>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {phase === 'done' ? (
          <div className="chai-checkout__done" role="status" data-testid="chai-checkout-done">
            <Celebrate from={packImg.current} sound />
            <h3 className="chai-checkout__thanks">
              {result === 'sent' ? c.done.sent(name.trim().split(/\s+/)[0] ?? '') : c.done.ready}
            </h3>
            <p className="chai-checkout__sub">{result === 'sent' ? c.done.sentBody : c.done.readyBody}</p>
            <dl className="chai-checkout__recap">
              <div>
                <dt>{c.phone}</dt>
                <dd dir="ltr">{showPhone(d, readPhone(d, phone) ?? '')}</dd>
              </div>
              <div>
                <dt>{c.location}</dt>
                <dd>{where()?.label}</dd>
              </div>
            </dl>
            <button type="button" className="chai-checkout__ghost" onClick={close}>
              {c.done.close}
            </button>
          </div>
        ) : (
          <>
            <Steps step={step} labels={c.steps} rtl={rtl} onPick={goStep} />
            <form className="chai-checkout__form" onSubmit={submit} noValidate>
              <div className="chai-checkout__pages" data-step={step}>
                <fieldset className="chai-checkout__page" inert={step !== 0} aria-label={c.steps[0]}>
                  <label className="chai-field">
                    <span className="chai-field__label">{c.name}</span>
                    <input
                      ref={first}
                      className="chai-field__input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      enterKeyHint="next"
                      aria-invalid={error?.field === 'name' || undefined}
                      aria-describedby={errFor('name')}
                      data-testid="chai-field-name"
                    />
                  </label>
                  <div className="chai-field">
                    <label className="chai-field__label" htmlFor={`${uid}-phone`}>
                      {c.phone}
                    </label>
                    {/* The number reads left to right in Kurdish too: +964 770 … */}
                    <div
                      className="chai-phone"
                      dir="ltr"
                      data-invalid={error?.field === 'phone' || undefined}
                    >
                      <span className="chai-phone__dial">
                        <span aria-hidden="true">
                          {d.flag} +{d.code}
                        </span>
                        <select
                          value={dial}
                          onChange={(e) => setDial(e.target.value)}
                          aria-label={c.dial}
                          data-testid="chai-field-dial"
                        >
                          {DIALS.map((x) => (
                            <option key={x.iso} value={x.iso}>
                              {x.flag} +{x.code} {x.iso}
                            </option>
                          ))}
                        </select>
                      </span>
                      <input
                        id={`${uid}-phone`}
                        className="chai-field__input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={d.example}
                        enterKeyHint="next"
                        aria-invalid={error?.field === 'phone' || undefined}
                        aria-describedby={errFor('phone')}
                        data-testid="chai-field-phone"
                      />
                    </div>
                  </div>
                  <label className="chai-field">
                    <span className="chai-field__label">
                      {c.email} <span className="chai-field__optional">({c.optional})</span>
                    </span>
                    <input
                      className="chai-field__input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      enterKeyHint="next"
                      aria-invalid={error?.field === 'email' || undefined}
                      aria-describedby={errFor('email')}
                      data-testid="chai-field-email"
                    />
                  </label>
                </fieldset>

                <fieldset className="chai-checkout__page" inert={step !== 1} aria-label={c.steps[1]}>
                  <div className="chai-field">
                    <span className="chai-field__label">{c.location}</span>
                    {typed ? (
                      <div className="chai-typed">
                        <input
                          className="chai-field__input"
                          value={typed.city}
                          onChange={(e) => setTyped({ ...typed, city: e.target.value })}
                          placeholder={c.map.city}
                          aria-label={c.map.city}
                          autoComplete="address-level2"
                          aria-invalid={error?.field === 'location' || undefined}
                          data-testid="chai-field-city"
                        />
                        <input
                          className="chai-field__input"
                          value={typed.address}
                          onChange={(e) => setTyped({ ...typed, address: e.target.value })}
                          placeholder={c.map.address}
                          aria-label={c.map.address}
                          autoComplete="street-address"
                          aria-invalid={error?.field === 'location' || undefined}
                          data-testid="chai-field-address"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="chai-place"
                        data-set={place ? '' : undefined}
                        aria-invalid={error?.field === 'location' || undefined}
                        aria-describedby={errFor('location')}
                        onClick={() => setMapOpen(true)}
                        data-testid="chai-field-location"
                      >
                        <span className="chai-place__icon" aria-hidden="true">
                          <svg width="20" height="20" viewBox="0 0 24 24">
                            <path
                              d="M12 21s7-7.2 7-12.5A7 7 0 0 0 5 8.5C5 13.8 12 21 12 21Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            />
                            <circle cx="12" cy="8.5" r="2.5" fill="currentColor" />
                          </svg>
                        </span>
                        <span className="chai-place__text">{place?.label || c.pin}</span>
                        <span className="chai-place__go">{place ? c.change : ''}</span>
                      </button>
                    )}
                  </div>
                  <label className="chai-field">
                    <span className="chai-field__label">
                      {c.landmark} <span className="chai-field__optional">({c.optional})</span>
                    </span>
                    <input
                      className="chai-field__input"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      autoComplete="address-line2"
                    />
                  </label>
                  <label className="chai-field">
                    <span className="chai-field__label">
                      {c.notes} <span className="chai-field__optional">({c.optional})</span>
                    </span>
                    <textarea
                      className="chai-field__input chai-field__input--area"
                      value={notes}
                      maxLength={300}
                      rows={2}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                </fieldset>
              </div>

              {error && (
                <p id={`${uid}-err`} className="chai-checkout__error" role="alert">
                  {error.text}
                </p>
              )}
              <div className="chai-checkout__foot">
                {step === 1 && (
                  <button
                    type="button"
                    className="chai-checkout__back"
                    onClick={() => goStep(0)}
                    aria-label={c.back}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M15 5l-7 7 7 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}
                <button
                  type="submit"
                  className="chai-checkout__go"
                  disabled={phase === 'busy'}
                  aria-label={label}
                  data-testid="chai-checkout-go"
                >
                  <Roll text={label} />
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {mapOpen && (
        <Suspense fallback={<div className="chai-map chai-map--loading" aria-hidden="true" />}>
          <MapPicker
            lang={lang}
            start={place}
            onUse={(p) => {
              setPlace(p);
              setMapOpen(false);
              setError(null);
            }}
            onCancel={() => setMapOpen(false)}
            onFail={() => {
              setMapOpen(false);
              setTyped({ city: '', address: '' });
            }}
          />
        </Suspense>
      )}
    </div>,
    host,
  );
}

/**
 * The two steps, and the drop of glass under the one shown: it springs from one to the other, stretching a
 * little with its speed (written straight to its transform; at once under reduced motion).
 */
function Steps({
  step,
  labels,
  rtl,
  onPick,
}: {
  step: 0 | 1;
  labels: readonly [string, string];
  rtl: boolean;
  onPick: (s: 0 | 1) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const drop = useRef<HTMLSpanElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const spring = useRef({ x: 0, w: 0, vx: 0, tx: 0, tw: 0, raf: 0, ready: false });
  const current = useRef(step);
  current.current = step;

  const paint = () => {
    const s = spring.current;
    const el = drop.current;
    if (!el) return;
    const v = Math.abs(s.vx);
    el.style.width = `${s.w}px`;
    el.style.transform = `translateX(${s.x.toFixed(1)}px) scale(${(1 + Math.min(0.2, v / 2600)).toFixed(3)}, ${(1 - Math.min(0.1, v / 4200)).toFixed(3)})`;
  };
  const aim = (i: number, jump: boolean) => {
    const tab = tabs.current[i];
    const s = spring.current;
    if (!tab) return;
    s.tx = tab.offsetLeft;
    s.tw = tab.offsetWidth;
    if (jump || !s.ready || qualityStore.getState().reducedMotion) {
      s.x = s.tx;
      s.w = s.tw;
      s.vx = 0;
      s.ready = true;
      paint();
      return;
    }
    if (s.raf) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      s.vx += (-(s.x - s.tx) * 480 - s.vx * 28) * dt;
      s.x += s.vx * dt;
      s.w += (s.tw - s.w) * Math.min(1, dt * 14);
      paint();
      if (Math.abs(s.x - s.tx) < 0.2 && Math.abs(s.vx) < 2) {
        s.x = s.tx;
        s.w = s.tw;
        s.vx = 0;
        s.raf = 0;
        paint();
        return;
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  };
  useLayoutEffect(() => {
    aim(step, false);
    // `aim` reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  useLayoutEffect(() => {
    const t = track.current;
    if (!t || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => aim(current.current, true));
    ro.observe(t);
    const s = spring.current;
    return () => {
      ro.disconnect();
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={track} className="chai-steps2" role="tablist" aria-label={labels.join(' · ')}>
      <span ref={drop} className="chai-steps2__drop" aria-hidden="true" />
      {labels.map((l, i) => (
        <button
          key={l}
          ref={(el) => {
            tabs.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={step === i}
          className="chai-steps2__tab"
          onClick={() => onPick(i as 0 | 1)}
          onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            e.preventDefault();
            const forward = (e.key === 'ArrowRight') !== rtl;
            onPick(forward ? 1 : 0);
          }}
        >
          <span className="chai-steps2__n" aria-hidden="true">
            {i + 1}
          </span>
          {l}
        </button>
      ))}
    </div>
  );
}

/**
 * A label whose letters roll in one after another when it changes (each its own span). Kurdish rolls word by
 * word: its letters join, and a letter on its own would lose its joined shape.
 */
function Roll({ text }: { text: string }) {
  const joined = /[\u0600-\u06ff]/.test(text);
  const pieces = joined ? text.split(/(\s+)/).filter(Boolean) : Array.from(text);
  return (
    <span key={text} className="chai-roll" aria-hidden="true">
      {pieces.map((piece, i) => (
        <span key={i} style={{ '--i': i } as CSSProperties}>
          {piece.trim() ? piece : ' '}
        </span>
      ))}
    </span>
  );
}
