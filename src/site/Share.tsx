import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
} from 'react';
import { qualityStore } from '@/app/quality';
import { chaimama as copy } from '@/content';
import { toKurdishDigits } from '@/content/kurdish';
import { LOCALES, type Locale } from '@/content/types';
import { POUCHES } from './arrival';
import Celebrate from './Celebrate';
import { primeChime, playTick } from './chime';
import { checkFeedback, sendFeedback, shrinkPhoto, type FeedbackError, type Tried } from './feedback';

interface Props {
  lang: Locale;
}

/**
 * Share your experience (DECISIONS CM-023), between the teas and Our Story: a name, an email and a place if
 * they like, which tea they tried, a rating out of ten on a slider, their thoughts, and a photo if they like.
 *
 * The rating is the heart of it: sliding along the track, a glass of tea fills step by step — each step a soft
 * tick a little higher than the last, the number springing to its new value, a word for what it means — until
 * at ten it steams, sparkles and rings like a glass. Sent, Mama winks his thanks (the order's moment, CM-020).
 */
export default function Share({ lang }: Props) {
  const s = copy.share;
  const uid = useId().replace(/:/g, '');
  const root = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [tried, setTried] = useState<Tried | null>(null);
  const [rating, setRating] = useState(0);
  const [thoughts, setThoughts] = useState('');
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<{ field: FeedbackError | 'photo' | 'form'; text: string } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done'>('idle');
  const [result, setResult] = useState<'sent' | 'unsent'>('unsent');

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
    try {
      const sent = await sendFeedback(
        {
          name: name.trim(),
          email: email.trim() || undefined,
          location: location.trim() || undefined,
          tried: tried!,
          rating,
          thoughts: thoughts.trim() || undefined,
          lang,
        },
        photo?.blob,
      );
      setResult(sent);
      setPhase('done');
      requestAnimationFrame(() =>
        card.current?.scrollIntoView({
          block: 'center',
          behavior: qualityStore.getState().reducedMotion ? 'auto' : 'smooth',
        }),
      );
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
    setError(null);
    setPhase('idle');
  };

  const errFor = (f: FeedbackError | 'photo') => (error?.field === f ? `${uid}-err` : undefined);
  const first = name.trim().split(/\s+/)[0] ?? '';
  const choices: { id: Tried; label: string }[] = [
    { id: 'heritage', label: copy.blends.heritage.name },
    { id: 'lovely', label: copy.blends.lovely.name },
    { id: 'both', label: s.both },
    { id: 'other', label: s.other },
  ];

  return (
    <section
      ref={root}
      id="chai-share"
      className="chai-share"
      aria-labelledby="chai-share-title"
      data-testid="chai-share"
    >
      <div ref={card} className="chai-share__card" data-rise="">
        <header className="chai-share__head">
          <p className="chai-share__eyebrow">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="m9.2 11 1.9 1.9L15 9" fill="none" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            {s.eyebrow}
          </p>
          <h2 id="chai-share-title" className="chai-share__title">
            {s.title}
          </h2>
          {phase !== 'done' && <p className="chai-share__lede">{s.lede}</p>}
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
                <span className="chai-field__label">{s.name}</span>
                <input
                  className="chai-field__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  enterKeyHint="next"
                  aria-invalid={error?.field === 'name' || undefined}
                  aria-describedby={errFor('name')}
                  data-field="name"
                  data-testid="chai-share-name"
                />
              </label>
              <label className="chai-field">
                <span className="chai-field__label">
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
                  enterKeyHint="next"
                  aria-invalid={error?.field === 'email' || undefined}
                  aria-describedby={errFor('email')}
                  data-field="email"
                  data-testid="chai-share-email"
                />
              </label>
            </div>
            <label className="chai-field">
              <span className="chai-field__label">
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
              <legend className="chai-field__label">{s.tried}</legend>
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
                    tabIndex={tried ? (tried === ch.id ? 0 : -1) : i === 0 ? 0 : -1}
                    className="chai-tried__one"
                    data-id={ch.id}
                    {...(i === 0 ? { 'data-field': 'tried' } : {})}
                    onClick={() => setTried(ch.id)}
                    onKeyDown={(e) => {
                      const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
                      if (!keys.includes(e.key)) return;
                      e.preventDefault();
                      const back =
                        e.key === 'ArrowUp' || (e.key === 'ArrowLeft') !== (LOCALES[lang].dir === 'rtl');
                      const next = choices[(i + (back ? -1 : 1) + choices.length) % choices.length]!;
                      setTried(next.id);
                      const group = e.currentTarget.parentElement;
                      (group?.querySelector(`[data-id='${next.id}']`) as HTMLElement | null)?.focus();
                    }}
                    data-testid={`chai-share-tried-${ch.id}`}
                  >
                    <TriedArt id={ch.id} />
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
              <span className="chai-field__label">
                {s.thoughts} <span className="chai-field__optional">({s.optional})</span>
              </span>
              <textarea
                className="chai-field__input chai-field__input--area"
                value={thoughts}
                rows={4}
                maxLength={600}
                onChange={(e) => setThoughts(e.target.value)}
                placeholder={s.thoughtsHint}
                data-testid="chai-share-thoughts"
              />
            </label>

            <div className="chai-share__photo" data-set={photo ? '' : undefined}>
              {photo && (
                <span className="chai-share__thumb">
                  <img src={photo.url} alt="" />
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
                </span>
              )}
              <label className="chai-share__add">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
                </svg>
                <span>
                  {photo ? s.photoChange : s.photo}{' '}
                  {!photo && <span className="chai-field__optional">({s.optional})</span>}
                </span>
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
              {phase === 'busy' ? s.sending : s.send}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 12 20 4l-6 16-2.5-6.5L4 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

/** The picture on each choice: the pack itself, both packs, or a glass for any other tea. */
function TriedArt({ id }: { id: Tried }) {
  if (id === 'heritage' || id === 'lovely')
    return <img className="chai-tried__art" src={POUCHES[id].small} alt="" width={41} height={56} />;
  if (id === 'both')
    return (
      <span className="chai-tried__art chai-tried__art--both" aria-hidden="true">
        <img src={POUCHES.heritage.small} alt="" width={41} height={56} />
        <img src={POUCHES.lovely.small} alt="" width={41} height={56} />
      </span>
    );
  return (
    <svg className="chai-tried__art chai-tried__art--glass" viewBox="0 0 40 56" aria-hidden="true">
      <path
        d="M10 8h20c-.6 9-5 13-5 20s4.6 11 3.6 19.5c-.3 2.5-2.8 3.5-8.6 3.5s-8.3-1-8.6-3.5C10.4 39 15 35 15 28S10.6 17 10 8Z"
        fill="rgb(255 255 255 / 0.6)"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M13.6 33c4.5-1.4 8.4 1.4 12.8 0 .4 5.3 2 8.8 1.6 14.2-.2 2-2.4 2.8-8 2.8s-7.8-.8-8-2.8c-.4-5.4 1.2-8.9 1.6-14.2Z"
        fill="#b5581a"
        opacity="0.85"
      />
      <ellipse cx="20" cy="52" rx="15" ry="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * The rating, 1 … 10: a track to slide along (the whole of it takes a finger or the mouse), a glass of tea that
 * fills with it, the number and a word for it. Underneath, a real range input, for the keyboard and for screen
 * readers; it starts unrated ("Slide to rate").
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
  const rtl = LOCALES[lang].dir === 'rtl';
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
    const thumb = 48;
    let p = (e.clientX - r.left - thumb / 2) / (r.width - thumb);
    if (rtl) p = 1 - p;
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
      <div className="chai-rate__top">
        <span className="chai-field__label" id="chai-rate-label">
          {s.rate}
        </span>
        <div className="chai-rate__show">
          <TeaGlass key={tops} />
          <div className="chai-rate__read" aria-hidden="true">
            <span className="chai-rate__score">
              <span key={value} className="chai-rate__n">
                {value ? digits(value) : '–'}
              </span>
              <span className="chai-rate__of">/{digits(10)}</span>
            </span>
            <span key={word} className="chai-rate__word">
              {word}
            </span>
          </div>
        </div>
      </div>
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
        <span className="chai-rate__fill" />
        <span className="chai-rate__notches" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} data-on={value > i || undefined} />
          ))}
        </span>
        <span className="chai-rate__thumb" aria-hidden="true">
          {value ? (
            <span key={value}>{digits(value)}</span>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path
                d={rtl ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
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
    </div>
  );
}

/** A glass of tea on its saucer, filled to the rating (--fill), its surface gently moving; at ten it steams. */
function TeaGlass() {
  const id = useId().replace(/:/g, '');
  const glass =
    'M13 8h34c-1 15-8 22-8 34s7.6 19 6 33c-.5 4-4.6 6-14 6s-13.5-2-14-6c-1.6-14 6-21 6-33S14 23 13 8Z';
  return (
    <span className="chai-glass" aria-hidden="true">
      <svg viewBox="0 0 60 96">
        <defs>
          <clipPath id={`${id}-in`}>
            <path d={glass} />
          </clipPath>
          <linearGradient id={`${id}-tea`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9782a" />
            <stop offset="0.55" stopColor="#a8481a" />
            <stop offset="1" stopColor="#6e2a0e" />
          </linearGradient>
        </defs>
        <g className="chai-glass__steam" fill="none" stroke="#b9a58f" strokeWidth="2" strokeLinecap="round">
          <path d="M24 2c-3 4 3 6 0 10" />
          <path d="M31 0c-3 4 3 6 0 10" />
          <path d="M38 2c-3 4 3 6 0 10" />
        </g>
        <g clipPath={`url(#${id}-in)`}>
          <rect x="0" y="0" width="60" height="96" fill="rgb(255 252 244 / 0.7)" />
          <g className="chai-glass__tea">
            <path
              className="chai-glass__wave"
              d="M-60 0q7.5-3 15 0t15 0t15 0t15 0t15 0t15 0t15 0t15 0t15 0t15 0V120H-60Z"
              fill={`url(#${id}-tea)`}
            />
          </g>
          <path
            d="M18 14c1.5 10-3 18-3 26"
            fill="none"
            stroke="rgb(255 255 255 / 0.55)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
        <path d={glass} fill="none" stroke="#3a2a1c" strokeWidth="2.2" strokeLinejoin="round" />
        <ellipse cx="30" cy="88" rx="24" ry="5" fill="#fffaf0" stroke="#3a2a1c" strokeWidth="2" />
      </svg>
      <span className="chai-glass__sparks">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} style={{ '--a': `${i * 45 + 20}deg` } as CSSProperties} />
        ))}
      </span>
    </span>
  );
}
