import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { qualityStore } from '@/app/quality';
import { chaimama as copy } from '@/content';
import { toKurdishDigits } from '@/content/kurdish';
import { LOCALES, type Locale } from '@/content/types';
import bannerSmall from '../brand/share-banner-1x.webp';
import type { Review } from './reviews';

/**
 * What people say (DECISIONS CM-024): the reviews in a folder of warm glass, after the owner's glass-folder
 * reference — a back panel holding the valley's picture, the reviews as sheets of paper in its pocket, and a
 * frosted front that blurs them. Leaning over it (a mouse) tips the glass toward you and the sheets lift;
 * opening it (a tap, Enter, Space) lets the glass fall forward and the newest reviews rise out and fan. Each is a
 * small profile: who, from where, the rating, a few words, and — when there is one — a little photograph peeking
 * from its corner. Choosing one opens it, its photograph developing like a print; from there every review can be
 * read in turn. A review just shared drops into the folder.
 *
 * Plain React and the site's CSS (no Tailwind, no generated artwork: the picture is the owner's own).
 */
interface Props {
  lang: Locale;
  reviews: Review[];
  /** A review just shared: it drops in. */
  drop?: string | null;
  /** "+": on to the share card. */
  onAdd: () => void;
  onRemove: (review: Review) => void;
}

/** The folder is drawn at 340 × 272 (and room above for the sheets to rise into), and scaled to fit. */
const W = 340;
const H = 272;
const HEADROOM = 58;
const FRONT_H = 198;
const BACK_PATH =
  'M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z';
const FRONT_PATH = `M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 ${FRONT_H - 22}A22 22 0 0 1 318 ${FRONT_H}L22 ${FRONT_H}A22 22 0 0 1 0 ${FRONT_H - 22}Z`;
const MAX_VISIBLE = 4;

const digitsOf = (lang: Locale) => (n: number | string) => (lang === 'ckb' ? toKurdishDigits(n) : String(n));

export default function ReviewsFolder({ lang, reviews, drop, onAdd, onRemove }: Props) {
  const r = copy.reviews;
  const digits = digitsOf(lang);
  const wrap = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const hit = useRef<HTMLButtonElement>(null);
  const files = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(
    () => typeof IntersectionObserver === 'undefined' || qualityStore.getState().reducedMotion,
  );
  const [detail, setDetail] = useState<number | null>(null);
  const [bump, setBump] = useState(0);
  // A review just shared drops in: the pocket gives a little under it, and the count rolls over.
  const [seen, setSeen] = useState(drop);
  const [dropped, setDropped] = useState<string | null>(null);
  if (drop !== seen) {
    setSeen(drop);
    if (drop) {
      setDropped(drop);
      setBump((b) => b + 1);
    }
  }
  const k = width / W;

  // As wide as it can be, up to 360 px (its box is the stylesheet's, so nothing below it moves as it is measured;
  // only the drawing inside is scaled to it).
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const fit = () => setWidth(el.clientWidth || 340);
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // It assembles itself the first time it comes into view.
  useEffect(() => {
    const el = root.current;
    if (!el || entered) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setEntered(true);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
    // Once, from the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The light and a little parallax follow a mouse (two variables, no render).
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const write = () => {
      raf = 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const b = el.getBoundingClientRect();
      px = ((e.clientX - b.left) / b.width) * 2 - 1;
      py = ((e.clientY - b.top) / b.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(write);
    };
    const leave = () => {
      px = 0;
      py = 0;
      if (!raf) raf = requestAnimationFrame(write);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Closed, its sheets are out of the tab order.
  useEffect(() => {
    files.current?.toggleAttribute('inert', !open);
  }, [open]);

  // Escape, or a press outside, closes it (the open review first).
  useEffect(() => {
    if (!open || detail !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      hit.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, detail]);

  const count = reviews.length;
  const start = Math.max(0, count - MAX_VISIBLE);
  const visible = reviews.slice(start);
  const avg = count ? Math.round((reviews.reduce((s, x) => s + x.rating, 0) / count) * 10) / 10 : null;
  const meta = count
    ? `${r.count(digits(count), count === 1)} · ${r.average(digits(avg!.toFixed(1).replace(/\.0$/, '')))}`
    : `${r.empty} · ${r.emptyMeta}`;

  return (
    <div ref={wrap} className="chai-folder-wrap">
      <div
        ref={root}
        className="chai-folder"
        data-open={open || undefined}
        data-entered={entered || undefined}
        data-testid="chai-reviews"
        style={{ aspectRatio: `${W} / ${H + HEADROOM}` } as CSSProperties}
      >
        <div
          className="chai-folder__stage"
          style={{ transform: `translateY(${HEADROOM * k}px) scale(${k})` }}
        >
          <div className="chai-folder__tilt">
            <div className="chai-folder__shadow" aria-hidden="true" />
            <div
              className="chai-folder__back"
              style={{ clipPath: `path('${BACK_PATH}')` }}
              aria-hidden="true"
            >
              <img
                className="chai-folder__art"
                src={bannerSmall}
                alt=""
                width={W + 24}
                height={H + 24}
                draggable={false}
              />
              <div className="chai-folder__sheen" />
            </div>
            <svg
              className="chai-folder__rim chai-folder__rim--back"
              viewBox={`0 0 ${W} ${H}`}
              aria-hidden="true"
            >
              <path d={BACK_PATH} />
            </svg>

            <div
              key={bump}
              className={`chai-folder__front${bump ? ' chai-folder__front--bump' : ''}`}
              style={{ clipPath: `path('${FRONT_PATH}')` }}
            >
              <div className="chai-folder__tint" aria-hidden="true" />
              <div className="chai-folder__spec" aria-hidden="true" />
              <svg
                className="chai-folder__rim chai-folder__rim--front"
                viewBox={`0 0 ${W} ${FRONT_H}`}
                aria-hidden="true"
              >
                <path d={FRONT_PATH} />
              </svg>
              <button
                ref={hit}
                type="button"
                className="chai-folder__hit"
                aria-expanded={open}
                aria-label={`${open ? r.close : r.open} — ${meta}`}
                onClick={() => setOpen((o) => !o)}
                data-testid="chai-reviews-open"
              />
              <div className="chai-folder__label">
                <h3 className="chai-folder__title">{r.title}</h3>
                <span key={meta} className="chai-folder__meta">
                  {meta}
                </span>
              </div>
            </div>

            <div ref={files} className="chai-folder__files" role="list" aria-label={r.title}>
              {visible.length ? (
                visible.map((rev, v) => (
                  <div key={rev.id} role="listitem" className="chai-folder__slot">
                    <Sheet
                      lang={lang}
                      review={rev}
                      slot={visible.length <= 1 ? 0 : (v / (visible.length - 1)) * 2 - 1}
                      depth={visible.length - 1 - v}
                      z={v + 1}
                      dropping={rev.id === dropped}
                      onDropped={() => setDropped(null)}
                      onOpen={() => setDetail(start + v)}
                    />
                  </div>
                ))
              ) : (
                <div role="listitem" className="chai-folder__slot">
                  <button
                    type="button"
                    className="chai-sheet chai-sheet--first"
                    style={
                      {
                        '--slot': 0,
                        '--depth': 0,
                        '--jx': '0px',
                        '--jr': '-1deg',
                        zIndex: 1,
                      } as CSSProperties
                    }
                    onClick={onAdd}
                  >
                    <span className="chai-sheet__first">{r.first}</span>
                    <span className="chai-sheet__lines" aria-hidden="true">
                      <i style={{ width: '86%' }} />
                      <i style={{ width: '64%' }} />
                      <i style={{ width: '78%' }} />
                    </span>
                  </button>
                </div>
              )}
              {count > MAX_VISIBLE && (
                <span className="chai-folder__more">{r.more(digits(count - MAX_VISIBLE))}</span>
              )}
            </div>

            <button type="button" className="chai-folder__key" aria-label={r.add} onClick={onAdd}>
              <svg key={bump} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4.5v15M4.5 12h15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {detail !== null && reviews[detail] && (
        <Detail
          lang={lang}
          reviews={reviews}
          at={detail}
          onGo={setDetail}
          onClose={() => setDetail(null)}
          onRemove={(rev) => {
            setDetail(null);
            onRemove(rev);
          }}
        />
      )}
    </div>
  );
}

/** A colour for each tea (the avatar's ring): the packs' gold and red, both, or tea-brown. */
const TONE: Record<Review['tried'], string> = {
  heritage: '#e3a21a',
  lovely: '#c62026',
  both: 'linear-gradient(135deg, #e3a21a 50%, #c62026 50%)',
  other: '#8a4a1c',
};

function Sheet({
  lang,
  review,
  slot,
  depth,
  z,
  dropping,
  onDropped,
  onOpen,
}: {
  lang: Locale;
  review: Review;
  slot: number;
  depth: number;
  z: number;
  dropping: boolean;
  onDropped: () => void;
  onOpen: () => void;
}) {
  const r = copy.reviews;
  const digits = digitsOf(lang);
  // A small, steady tilt of its own, from its id.
  let h = 2166136261;
  for (let i = 0; i < review.id.length; i++) h = Math.imul(h ^ review.id.charCodeAt(i), 16777619);
  const jx = (((h >>> 0) % 100) / 100 - 0.5) * 10;
  const jr = ((((h >>> 8) >>> 0) % 100) / 100 - 0.5) * 3.2;
  return (
    <button
      type="button"
      className={`chai-sheet${dropping ? ' chai-sheet--drop' : ''}`}
      style={
        {
          '--slot': slot,
          '--depth': depth,
          '--jx': `${jx.toFixed(2)}px`,
          '--jr': `${jr.toFixed(2)}deg`,
          zIndex: z,
        } as CSSProperties
      }
      onClick={onOpen}
      onAnimationEnd={(e) => {
        if (dropping && e.target === e.currentTarget) onDropped();
      }}
      aria-label={`${review.name}, ${digits(review.rating)}/${digits(10)}`}
      data-testid="chai-review"
    >
      <span className="chai-sheet__head">
        <span className="chai-sheet__avatar" style={{ '--tone': TONE[review.tried] } as CSSProperties}>
          {Array.from(review.name)[0]?.toUpperCase()}
        </span>
        <span className="chai-sheet__who">
          <span className="chai-sheet__name">{review.name}</span>
          {review.location && <span className="chai-sheet__where">{review.location}</span>}
        </span>
        <span className="chai-sheet__rating">
          <MiniGlass fill={review.rating / 10} />
          {digits(review.rating)}
          <small>/{digits(10)}</small>
        </span>
      </span>
      {review.note && <span className="chai-sheet__note">{review.note}</span>}
      {review.mine && (
        <span className="chai-sheet__tag" data-unsent={!review.sent || undefined}>
          {review.sent ? r.mine : r.unsent}
        </span>
      )}
      {review.photo && (
        <span className="chai-sheet__peek" aria-label={r.hasPhoto}>
          <img src={review.photo} alt="" loading="lazy" decoding="async" />
        </span>
      )}
    </button>
  );
}

/** A tea glass filled to the rating, for the small spaces. */
function MiniGlass({ fill }: { fill: number }) {
  const top = 19 - fill * 14;
  return (
    <svg className="chai-mini-glass" viewBox="0 0 16 22" aria-hidden="true">
      <defs>
        <clipPath id="chai-mini-glass">
          <path d="M3 2h10c-.3 4.5-2.4 6.5-2.4 9.6s2 5 1.6 8.2c-.2 1-1.6 1.4-4.2 1.4s-4-.4-4.2-1.4c-.4-3.2 1.6-5.1 1.6-8.2S3.3 6.5 3 2Z" />
        </clipPath>
      </defs>
      <rect x="0" y={top} width="16" height="22" fill="#b5581a" clipPath="url(#chai-mini-glass)" />
      <path
        d="M3 2h10c-.3 4.5-2.4 6.5-2.4 9.6s2 5 1.6 8.2c-.2 1-1.6 1.4-4.2 1.4s-4-.4-4.2-1.4c-.4-3.2 1.6-5.1 1.6-8.2S3.3 6.5 3 2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

/** One review, open: its photograph developing, who and from where, the rating and the words; on to the next. */
function Detail({
  lang,
  reviews,
  at,
  onGo,
  onClose,
  onRemove,
}: {
  lang: Locale;
  reviews: Review[];
  at: number;
  onGo: (i: number) => void;
  onClose: () => void;
  onRemove: (r: Review) => void;
}) {
  const r = copy.reviews;
  const s = copy.share;
  const digits = digitsOf(lang);
  const rev = reviews[at]!;
  const box = useRef<HTMLDivElement>(null);
  const rtl = LOCALES[lang].dir === 'rtl';
  const many = reviews.length > 1;
  const go = (d: number) => onGo((at + d + reviews.length) % reviews.length);
  const tried = rev.tried === 'both' ? s.both : rev.tried === 'other' ? s.other : copy.blends[rev.tried].name;
  const date = (() => {
    const d = new Date(rev.at);
    if (Number.isNaN(d.getTime()) || d.getTime() === 0) return '';
    return d.toLocaleDateString(lang === 'ckb' ? 'ckb-IQ' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  })();

  useEffect(() => {
    box.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (many && (e.key === 'ArrowRight' || e.key === 'ArrowLeft'))
        go((e.key === 'ArrowRight') !== rtl ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);

  return createPortal(
    <div className="chai-review" data-testid="chai-review-open">
      <div className="chai-review__scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={box}
        key={rev.id}
        className="chai-review__card"
        role="dialog"
        aria-modal="true"
        aria-label={rev.name}
        tabIndex={-1}
        lang={lang}
        dir={LOCALES[lang].dir}
      >
        {rev.photo && (
          <figure className="chai-review__photo">
            <img src={rev.photo} alt="" />
          </figure>
        )}
        <div className="chai-review__body">
          <header className="chai-review__head">
            <span className="chai-sheet__avatar" style={{ '--tone': TONE[rev.tried] } as CSSProperties}>
              {Array.from(rev.name)[0]?.toUpperCase()}
            </span>
            <span className="chai-sheet__who">
              <span className="chai-review__name">{rev.name}</span>
              <span className="chai-sheet__where">{[rev.location, date].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="chai-review__rating">
              <MiniGlass fill={rev.rating / 10} />
              <b>{digits(rev.rating)}</b>
              <small>/{digits(10)}</small>
            </span>
          </header>
          <p className="chai-review__band">
            {s.bands[rev.rating - 1]} ·{' '}
            <span>
              {r.tried}: {tried}
            </span>
          </p>
          {rev.note && <p className="chai-review__note">“{rev.note}”</p>}
          {rev.mine && (
            <p className="chai-sheet__tag chai-review__tag" data-unsent={!rev.sent || undefined}>
              {rev.sent ? r.mine : r.unsent}
            </p>
          )}
          <div className="chai-review__foot">
            {many && (
              <span className="chai-review__nav">
                <button type="button" onClick={() => go(-1)} aria-label={r.prev}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={rtl ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} />
                  </svg>
                </button>
                <span>
                  {digits(at + 1)} / {digits(reviews.length)}
                </span>
                <button type="button" onClick={() => go(1)} aria-label={r.next}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={rtl ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
                  </svg>
                </button>
              </span>
            )}
            {rev.mine && (
              <button type="button" className="chai-review__remove" onClick={() => onRemove(rev)}>
                {r.remove}
              </button>
            )}
            <button type="button" className="chai-checkout__ghost" onClick={onClose}>
              {r.shut}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.querySelector('.chai') ?? document.body,
  );
}
