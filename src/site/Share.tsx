import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { qualityStore } from '@/app/quality';
import { chaimama as copy } from '@/content';
import { toKurdishDigits } from '@/content/kurdish';
import { LOCALES, type Locale } from '@/content/types';
import bannerSmall from '../brand/share-banner-1x.webp';
import bannerLarge from '../brand/share-banner-2x.webp';
import glassEmpty from '../brand/tea-glass-empty.webp';
import glassFull from '../brand/tea-glass-full.webp';
import { POUCHES } from './arrival';
import Celebrate from './Celebrate';
import { primeChime, playTick } from './chime';
import { checkFeedback, sendFeedback, shrinkPhoto, type FeedbackError, type Tried } from './feedback';
import ReviewsFolder from './ReviewsFolder';
import { keepMine, loadReviews, mergeReviews, myReviews, newId, smallPhoto, type Review } from './reviews';

interface Props {
  lang: Locale;
}

/**
 * Share your experience (DECISIONS CM-023, CM-024), between the teas and Our Story, after the owner's mock: the
 * valley's picture across the top with a glass of tea on the rock by the pack; a name and an email (optional)
 * side by side, a place (optional); which tea — the two packs large, "both" and "other" small; the rating — a
 * real glass of tea filling as the slider moves, the number and a word for it; their thoughts; a memory of the
 * tea (a photo, optional) and whether it may be shown. Sent, Mama winks his thanks, and the review drops into the
 * folder of reviews below.
 */
export default function Share({ lang }: Props) {
  const s = copy.share;
  const uid = useId().replace(/:/g, '');
  const root = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const folder = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [tried, setTried] = useState<Tried | null>(null);
  const [rating, setRating] = useState(0);
  const [thoughts, setThoughts] = useState('');
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<{ field: FeedbackError | 'photo' | 'form'; text: string } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done'>('idle');
  const [result, setResult] = useState<'sent' | 'unsent'>('unsent');
  // The reviews (CM-024): the shop's published ones, and the ones shared from this device.
  const [feed, setFeed] = useState<Review[]>([]);
  const [mine, setMine] = useState<Review[]>(() => myReviews());
  const [drop, setDrop] = useState<string | null>(null);
  const reviews = useMemo(() => mergeReviews(feed, mine), [feed, mine]);

  useEffect(() => {
    let live = true;
    void loadReviews().then((rows) => {
      if (live) setFeed(rows);
    });
    return () => {
      live = false;
    };
  }, []);

  // Each part rises in once as it first comes into view.
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

  // The photo's preview is let go of when it is replaced, removed, or the page goes.
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo.url) : undefined), [photo]);

  const smooth = (): ScrollBehavior => (qualityStore.getState().reducedMotion ? 'auto' : 'smooth');

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await shrinkPhoto(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      if (error?.field === 'photo') setError(null);
    } catch {
      setError({ field: 'photo', text: s.errors.photo });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (phase === 'busy') return;
    // The email is only looked at when something was written in it.
    const wrong = checkFeedback({ name, email, tried, rating });
    if (wrong) {
      setError({ field: wrong, text: s.errors[wrong] });
      card.current?.querySelector<HTMLElement>(`[data-field='${wrong}']`)?.focus();
      return;
    }
    setError(null);
    // In the tap itself: Mama's thanks may ring once it has gone (chime.ts).
    primeChime();
    setPhase('busy');
    const id = newId();
    try {
      const sent = await sendFeedback(
        {
          id,
          name: name.trim(),
          email: email.trim() || undefined,
          location: location.trim() || undefined,
          tried: tried!,
          rating,
          thoughts: thoughts.trim() || undefined,
          photoConsent: photo ? consent : undefined,
          lang,
        },
        photo?.blob,
      );
      // Into the folder below: kept on this device, as the visitor's own (marked as not sent, when it was not).
      const review: Review = {
        id,
        name: name.trim(),
        location: location.trim() || undefined,
        tried: tried!,
        rating,
        note: thoughts.trim() || undefined,
        photo: photo ? await smallPhoto(photo.blob).catch(() => undefined) : undefined,
        at: new Date().toISOString(),
        mine: true,
        sent: sent === 'sent',
      };
      keepMine(review);
      setMine((m) => [...m.filter((x) => x.id !== id), review]);
      setResult(sent);
      setPhase('done');
      const how = smooth();
      requestAnimationFrame(() => card.current?.scrollIntoView({ block: 'center', behavior: how }));
      // Once Mama has winked, down to the folder: the review drops in as it comes into view.
      window.setTimeout(() => {
        folder.current?.scrollIntoView({ block: 'center', behavior: how });
        window.setTimeout(() => setDrop(id), how === 'smooth' ? 600 : 0);
      }, 2300);
    } catch {
      setPhase('idle');
      setError({ field: 'form', text: s.errors.send });
    }
  };

  const again = () => {
    setName('');
    setEmail('');
    setLocation('');
    setTried(null);
    setRating(0);
    setThoughts('');
    setPhoto(null);
    setConsent(false);
    setError(null);
    setPhase('idle');
  };

  /** "+" on the folder: back up to the card, its first question ready. */
  const toCard = () => {
    if (phase === 'done') again();
    card.current?.scrollIntoView({ block: 'start', behavior: smooth() });
    window.setTimeout(
      () =>
        card.current?.querySelector<HTMLInputElement>('[data-field=name]')?.focus({ preventScroll: true }),
      600,
    );
  };

  const errFor = (f: FeedbackError | 'photo') => (error?.field === f ? `${uid}-err` : undefined);
  const first = name.trim().split(/\s+/)[0] ?? '';
  const choices: { id: Tried; label: string; big?: boolean }[] = [
    { id: 'heritage', label: copy.blends.heritage.name, big: true },
    { id: 'lovely', label: copy.blends.lovely.name, big: true },
    { id: 'both', label: s.both },
    { id: 'other', label: s.other },
  ];
  const triedKey = (i: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const back = e.key === 'ArrowUp' || (e.key === 'ArrowLeft') !== (LOCALES[lang].dir === 'rtl');
    const next = choices[(i + (back ? -1 : 1) + choices.length) % choices.length]!;
    setTried(next.id);
    (root.current?.querySelector(`[data-id='${next.id}']`) as HTMLElement | null)?.focus();
  };
  const tabFor = (id: Tried, i: number) => (tried ? (tried === id ? 0 : -1) : i === 0 ? 0 : -1);

  return (
    <section
      ref={root}
      id="chai-share"
      className="chai-share"
      aria-labelledby="chai-share-title"
      data-testid="chai-share"
    >
      <div ref={card} className="chai-share__card" data-rise="">
        {/* The valley, the pack on its rock and a glass of tea poured from it; the question over the sky. */}
        <header className="chai-share__banner">
          <img
            className="chai-share__banner-img"
            src={bannerSmall}
            srcSet={`${bannerSmall} 900w, ${bannerLarge} 1800w`}
            sizes="(max-width: 760px) 100vw, 44rem"
            alt=""
            width={1800}
            height={801}
            loading="lazy"
            decoding="async"
          />
          <span className="chai-share__steam" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div className="chai-share__banner-copy">
            <h2 id="chai-share-title" className="chai-share__title">
              {s.title}
            </h2>
            {phase !== 'done' && <p className="chai-share__lede">{s.lede}</p>}
          </div>
        </header>

        {phase === 'done' ? (
          <div className="chai-share__done" role="status" data-testid="chai-share-done">
            <Celebrate from={null} sound />
            <h3 className="chai-share__thanks">
              {result === 'sent' ? s.done.sent(first) : s.done.ready(first)}
            </h3>
            <p className="chai-share__sub">{result === 'sent' ? s.done.sentBody : s.done.readyBody}</p>
            <button type="button" className="chai-checkout__ghost" onClick={again}>
              {s.done.again}
            </button>
          </div>
        ) : (
          <form className="chai-share__form" onSubmit={submit} noValidate>
            <div className="chai-share__row">
              <label className="chai-field">
                <span className="chai-field__label chai-share__q">{s.name}</span>
                <input
                  className="chai-field__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={s.namePh}
                  autoComplete="name"
                  enterKeyHint="next"
                  aria-invalid={error?.field === 'name' || undefined}
                  aria-describedby={errFor('name')}
                  data-field="name"
                  data-testid="chai-share-name"
                />
              </label>
              <label className="chai-field">
                <span className="chai-field__label chai-share__q">
                  {s.email} <span className="chai-field__optional">({s.optional})</span>
                </span>
                <input
                  className="chai-field__input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={s.emailPh}
                  enterKeyHint="next"
                  aria-invalid={error?.field === 'email' || undefined}
                  aria-describedby={errFor('email')}
                  data-field="email"
                  data-testid="chai-share-email"
                />
              </label>
            </div>
            <label className="chai-field">
              <span className="chai-field__label chai-share__q">
                {s.location} <span className="chai-field__optional">({s.optional})</span>
              </span>
              <span className="chai-share__with-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 21s7-7.2 7-12.5A7 7 0 0 0 5 8.5C5 13.8 12 21 12 21Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <circle cx="12" cy="8.5" r="2.4" fill="currentColor" />
                </svg>
                <input
                  className="chai-field__input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={s.locationHint}
                  autoComplete="address-level2"
                  enterKeyHint="next"
                  data-testid="chai-share-location"
                />
              </span>
            </label>

            <fieldset className="chai-share__set">
              <legend className="chai-share__big-q">{s.tried}</legend>
              <div
                className="chai-tried"
                role="radiogroup"
                aria-label={s.tried}
                aria-invalid={error?.field === 'tried' || undefined}
                aria-describedby={errFor('tried')}
              >
                {choices.map((ch, i) => (
                  <button
                    key={ch.id}
                    type="button"
                    role="radio"
                    aria-checked={tried === ch.id}
                    tabIndex={tabFor(ch.id, i)}
                    className={`chai-tried__one${ch.big ? ' chai-tried__one--big' : ' chai-tried__one--pill'}`}
                    data-id={ch.id}
                    {...(i === 0 ? { 'data-field': 'tried' } : {})}
                    onClick={() => setTried(ch.id)}
                    onKeyDown={triedKey(i)}
                    data-testid={`chai-share-tried-${ch.id}`}
                  >
                    {ch.big ? (
                      <>
                        <img
                          className="chai-tried__pack"
                          src={POUCHES[ch.id as 'heritage' | 'lovely'].small}
                          alt=""
                          width={410}
                          height={556}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="chai-tried__tick" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path d="M6 12.5l4 4L18 8" pathLength={1} />
                          </svg>
                        </span>
                      </>
                    ) : (
                      <span className="chai-tried__radio" aria-hidden="true" />
                    )}
                    <span className="chai-tried__name">{ch.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <RateSlider
              lang={lang}
              value={rating}
              onChange={(v) => {
                setRating(v);
                if (error?.field === 'rating') setError(null);
              }}
              invalid={error?.field === 'rating'}
              describedBy={errFor('rating')}
            />

            <label className="chai-field">
              <span className="chai-field__label chai-share__q">
                {s.thoughts} <span className="chai-field__optional">({s.optional})</span>
              </span>
              <textarea
                className="chai-field__input chai-field__input--area"
                value={thoughts}
                rows={3}
                maxLength={600}
                onChange={(e) => setThoughts(e.target.value)}
                placeholder={s.thoughtsHint}
                data-testid="chai-share-thoughts"
              />
            </label>

            {/* A memory of the tea: two prints, the top one the visitor's own photo once added. */}
            <div className="chai-memory" data-set={photo ? '' : undefined}>
              <div className="chai-memory__text">
                <p className="chai-memory__title">
                  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.3l1.4-2h5.6l1.4 2H18a1.5 1.5 0 0 1 1.5 1.5V11M3.5 8.5v9A1.5 1.5 0 0 0 5 19h8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="11" cy="12.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <path
                      d="M19 15v6M16 18h6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>
                    {s.memory} <span className="chai-field__optional">({s.optional})</span>
                  </span>
                </p>
                <label className="chai-memory__add">
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <rect
                      x="3.5"
                      y="5"
                      width="15"
                      height="13"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="m5.5 16 3.5-4 3 3 2-2 3.5 3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 3v5M16.5 5.5h5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{photo ? s.photoChange : s.photo}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="chai-share__file"
                    onChange={(e) => {
                      void pickPhoto(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                    aria-describedby={errFor('photo')}
                    data-testid="chai-share-photo"
                  />
                </label>
              </div>
              <div className="chai-memory__prints">
                <span className="chai-memory__print chai-memory__print--under" aria-hidden="true">
                  <img src={bannerSmall} alt="" loading="lazy" decoding="async" />
                </span>
                <span key={photo?.url ?? 'none'} className="chai-memory__print chai-memory__print--top">
                  <img src={photo?.url ?? bannerSmall} alt="" />
                  {photo && (
                    <button
                      type="button"
                      className="chai-share__remove"
                      onClick={() => setPhoto(null)}
                      aria-label={s.photoRemove}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M7 7l10 10M17 7 7 17"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
                </span>
              </div>
            </div>
            <label className="chai-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                data-testid="chai-share-consent"
              />
              <span className="chai-consent__box" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M6 12.5l4 4L18 8" pathLength={1} />
                </svg>
              </span>
              <span>{s.consent}</span>
            </label>

            {error && (
              <p id={`${uid}-err`} className="chai-checkout__error" role="alert">
                {error.text}
              </p>
            )}
            <button
              type="submit"
              className="chai-checkout__go chai-share__go"
              disabled={phase === 'busy'}
              data-testid="chai-share-send"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 12 20 4l-6 16-2.5-6.5L4 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              {phase === 'busy' ? s.sending : s.send}
            </button>
          </form>
        )}
      </div>

      {/* What people say: the reviews, in a folder of glass (CM-024). */}
      <div ref={folder} className="chai-share__reviews" data-rise="">
        <ReviewsFolder
          lang={lang}
          reviews={reviews}
          drop={drop}
          onAdd={toCard}
          onRemove={(rev) => {
            keepMine(rev, true);
            setMine((m) => m.filter((x) => x.id !== rev.id));
          }}
        />
      </div>
    </section>
  );
}

/**
 * The rating, 1 … 10, after the owner's mock: a real glass of tea that fills as the slider moves (the full glass
 * shown up to the tea's level over the empty one, its surface catching the light), the number and a word for it,
 * then a slim track with a tick at each step, 1 and 10 at its ends (left to right in Kurdish too, as numbers
 * are). The whole track takes a finger or the mouse; each step is a soft tick a little higher than the last; at
 * ten the glass steams, sparkles and rings. Underneath, a real range input, for the keyboard and screen readers;
 * it starts unrated.
 */
function RateSlider({
  lang,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  lang: Locale;
  value: number;
  onChange: (v: number) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  const s = copy.share;
  const track = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [tops, setTops] = useState(0);
  const digits = (n: number) => (lang === 'ckb' ? toKurdishDigits(n) : String(n));
  const word = value ? s.bands[value - 1]! : s.slide;

  const set = (v: number) => {
    const next = Math.min(10, Math.max(1, Math.round(v)));
    if (next === value) return;
    onChange(next);
    playTick(next);
    if (next === 10) setTops((n) => n + 1);
    try {
      navigator.vibrate?.(next === 10 ? [10, 30, 16] : 4);
    } catch {
      /* no buzz here */
    }
  };
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const el = track.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = (e.clientX - r.left) / r.width;
    set(1 + Math.min(1, Math.max(0, p)) * 9);
  };

  return (
    <div
      className="chai-rate"
      data-set={value ? '' : undefined}
      data-top={value === 10 || undefined}
      data-drag={dragging || undefined}
      data-invalid={invalid || undefined}
      style={{ '--v': value ? (value - 1) / 9 : 0, '--fill': value / 10 } as CSSProperties}
    >
      <span className="chai-share__big-q" id="chai-rate-label">
        {s.rate}
      </span>
      <div className="chai-rate__show">
        <TeaGlass key={tops} />
        <div className="chai-rate__read" aria-hidden="true">
          <span className="chai-rate__score">
            <span key={value} className="chai-rate__n">
              {value ? digits(value) : '–'}
            </span>
            <span className="chai-rate__of">/ {digits(10)}</span>
          </span>
          <span key={word} className="chai-rate__word">
            {word}
          </span>
        </div>
      </div>
      <p className="chai-rate__hint" aria-hidden="true">
        {s.slideHint}
      </p>
      <div className="chai-rate__scale" dir="ltr">
        <span className="chai-rate__end" aria-hidden="true">
          <b>{digits(1)}</b>
        </span>
        <div
          ref={track}
          className="chai-rate__track"
          onPointerDown={(e) => {
            primeChime();
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            input.current?.focus({ preventScroll: true });
            fromPointer(e);
          }}
          onPointerMove={(e) => {
            if (dragging) fromPointer(e);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          <span className="chai-rate__rail" aria-hidden="true">
            <span className="chai-rate__fill" />
          </span>
          <span className="chai-rate__ticks" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} data-on={value > i || undefined} />
            ))}
          </span>
          <span className="chai-rate__thumb" aria-hidden="true" />
          <input
            ref={input}
            className="chai-rate__input"
            type="range"
            min={1}
            max={10}
            step={1}
            value={value || 1}
            onChange={(e) => {
              primeChime();
              set(Number(e.target.value));
            }}
            onKeyDown={(e) => {
              // Unrated, any step key starts it at one.
              if (
                !value &&
                ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'PageUp'].includes(e.key)
              ) {
                e.preventDefault();
                primeChime();
                set(1);
              }
            }}
            aria-labelledby="chai-rate-label"
            aria-valuetext={value ? `${digits(value)} / ${digits(10)} — ${word}` : s.slide}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            data-field="rating"
            data-testid="chai-share-rating"
          />
        </div>
        <span className="chai-rate__end" aria-hidden="true">
          <b>{digits(10)}</b>
        </span>
      </div>
      <div className="chai-rate__ends" aria-hidden="true">
        <span>{s.bands[0]}</span>
        <span>{s.bands[9]}</span>
      </div>
    </div>
  );
}

/**
 * A real glass of tea (the owner's mock's): the empty glass, and over it the full one shown only up to the tea's
 * level (--fill), a soft line of light on the surface; above it, steam once the tea is high; at ten, sparks.
 */
function TeaGlass() {
  return (
    <span className="chai-glass" aria-hidden="true">
      {/* The two pictures together, laid onto the card (their white is the card's): the full glass over the
          empty one, up to the tea's level. */}
      <span className="chai-glass__cup">
        <img className="chai-glass__img" src={glassEmpty} alt="" width={560} height={600} />
        <img className="chai-glass__img chai-glass__tea" src={glassFull} alt="" width={560} height={600} />
      </span>
      <span className="chai-glass__surface" />
      <span className="chai-glass__steam">
        <i />
        <i />
        <i />
      </span>
      <span className="chai-glass__sparks">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} style={{ '--a': `${i * 45 + 20}deg` } as CSSProperties} />
        ))}
      </span>
    </span>
  );
}
