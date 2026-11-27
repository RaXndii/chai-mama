import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { chaimama as copy } from '@/content';
import { toKurdishDigits } from '@/content/kurdish';
import type { Locale } from '@/content/types';
import badgeUrl from '../brand/mama-badge.webp';
import { POUCHES } from './arrival';
import type { Tried } from './feedback';
import { Detail, MiniGlass } from './ReviewsFolder';
import { addMine, averageRating, reviewsStore, startReviews, TONE, useReviews, type Review } from './reviews';
import { TeaGlass } from './Share';

interface Props {
  lang: Locale;
  /** On to "How was your tea?". */
  onShare: () => void;
  /** Back to where the visitor came from. */
  onBack: () => void;
}

type Filter = 'all' | Tried;

/**
 * The reviews page (DECISIONS CM-025): everything people have shared, on a page of its own — what they make of
 * the teas on average (a glass of tea filled to it, and each blend's own), the reviews themselves as cards (who,
 * from where, when, the rating with a little glass, their words, their photo), shown for one tea or all, newest or
 * highest first; a card opens to read it whole, its photo developing. Nothing is made up: until the shop has
 * published reviews, it says there are none yet (and the visitor's own, from this device, are marked so).
 */
export default function ReviewsPage({ lang, onShare, onBack }: Props) {
  const r = copy.reviews;
  const p = r.page;
  const all = useReviews();
  const focus = useStoreFocus();
  const [filter, setFilter] = useState<Filter>('all');
  const [order, setOrder] = useState<'newest' | 'highest'>('newest');
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const digits = (n: number | string) => (lang === 'ckb' ? toKurdishDigits(n) : String(n));
  const fmt = (x: number) => digits(x.toFixed(1).replace(/\.0$/, ''));

  useEffect(startReviews, []);

  const shown = useMemo(() => {
    const rows = all.filter((x) => filter === 'all' || x.tried === filter);
    return order === 'newest'
      ? [...rows].reverse()
      : [...rows].sort((a, b) => b.rating - a.rating || b.at.localeCompare(a.at));
  }, [all, filter, order]);
  const avg = averageRating(all);
  const counts = (t: Tried) => all.filter((x) => x.tried === t).length;
  const blendAvg = (t: 'heritage' | 'lovely') =>
    averageRating(all.filter((x) => x.tried === t || x.tried === 'both'));

  // A review chosen in the folder: brought into view and lit for a moment.
  useLayoutEffect(() => {
    if (!focus) return;
    reviewsStore.setState({ focus: null });
    const el = root.current?.querySelector<HTMLElement>(`[data-review='${CSS.escape(focus)}']`);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.dataset.lit = '';
    window.setTimeout(() => delete el.dataset.lit, 1600);
  }, [focus]);

  const filters: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: p.all, n: all.length },
    { id: 'heritage', label: copy.blends.heritage.name, n: counts('heritage') },
    { id: 'lovely', label: copy.blends.lovely.name, n: counts('lovely') },
    { id: 'both', label: copy.share.both, n: counts('both') },
    { id: 'other', label: copy.share.other, n: counts('other') },
  ];
  const openAt = open ? shown.findIndex((x) => x.id === open) : -1;

  return (
    <section
      ref={root}
      id="chai-reviews"
      className="chai-rp"
      aria-labelledby="chai-rp-title"
      tabIndex={-1}
      data-testid="chai-reviews-page"
    >
      <div className="chai-rp__inner">
        <button type="button" className="chai-rp__back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          {p.back}
        </button>

        <header className="chai-rp__head">
          <h1 id="chai-rp-title" className="chai-rp__title">
            {r.title}
          </h1>
          <p className="chai-rp__lede">{p.lede}</p>
        </header>

        {/* On average: a glass of tea filled to it, and each blend's own. */}
        <div className="chai-rp__summary">
          <div
            className="chai-rp__glass"
            data-set={avg !== null ? '' : undefined}
            style={{ '--fill': (avg ?? 0) / 10 } as CSSProperties}
          >
            <TeaGlass />
          </div>
          <div className="chai-rp__avg">
            <span className="chai-rp__avg-n">
              <b>{avg !== null ? fmt(avg) : '–'}</b>
              <span>/ {digits(10)}</span>
            </span>
            <span className="chai-rp__avg-of">
              {all.length ? `${r.count(digits(all.length), all.length === 1)}` : r.empty}
            </span>
          </div>
          <ul className="chai-rp__blends">
            {(['heritage', 'lovely'] as const).map((t) => {
              const a = blendAvg(t);
              return (
                <li key={t}>
                  <img src={POUCHES[t].small} alt="" width={41} height={56} loading="lazy" />
                  <span className="chai-rp__blend-name">{copy.blends[t].name}</span>
                  <span className="chai-rp__bar" aria-hidden="true">
                    <i style={{ inlineSize: `${(a ?? 0) * 10}%` }} data-blend={t} />
                  </span>
                  <span className="chai-rp__blend-avg">{a !== null ? `${fmt(a)}/${digits(10)}` : '–'}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {all.length > 0 && (
          <div className="chai-rp__tools">
            <div className="chai-rp__filters" role="group" aria-label={p.filter}>
              {filters
                .filter((f) => f.id === 'all' || f.n > 0)
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="chai-rp__chip"
                    aria-pressed={filter === f.id}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label} <span>{digits(f.n)}</span>
                  </button>
                ))}
            </div>
            <div className="chai-rp__order" role="group" aria-label={p.sort}>
              {(['newest', 'highest'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  className="chai-rp__chip chai-rp__chip--quiet"
                  aria-pressed={order === o}
                  onClick={() => setOrder(o)}
                >
                  {o === 'newest' ? p.newest : p.highest}
                </button>
              ))}
            </div>
          </div>
        )}

        {all.length === 0 ? (
          <div className="chai-rp__empty" data-testid="chai-reviews-empty">
            <img src={badgeUrl} alt="" width={160} height={160} />
            <p className="chai-rp__empty-title">{r.empty}</p>
            <p className="chai-rp__empty-sub">{r.first}</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="chai-rp__none">{p.noneHere}</p>
        ) : (
          <ul className="chai-rp__grid">
            {shown.map((rev, i) => (
              <li key={rev.id} style={{ '--i': Math.min(i, 8) } as CSSProperties}>
                <Card lang={lang} review={rev} onOpen={() => setOpen(rev.id)} />
              </li>
            ))}
          </ul>
        )}

        <div className="chai-rp__cta">
          <button type="button" className="chai-checkout__go chai-share__go" onClick={onShare}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 12 20 4l-6 16-2.5-6.5L4 12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            {copy.share.send}
          </button>
        </div>
      </div>

      {openAt >= 0 && (
        <Detail
          lang={lang}
          reviews={shown}
          at={openAt}
          onGo={(i) => setOpen(shown[i]?.id ?? null)}
          onClose={() => setOpen(null)}
          onRemove={(rev) => {
            setOpen(null);
            addMine(rev, true);
          }}
        />
      )}
    </section>
  );
}

/** The review chosen in the folder, to bring into view. */
function useStoreFocus(): string | null {
  const [focus, setFocus] = useState(reviewsStore.getState().focus);
  useEffect(() => reviewsStore.subscribe((s) => setFocus(s.focus)), []);
  return focus;
}

/** One review: who, from where and when, the rating, their words, their photo. */
function Card({ lang, review, onOpen }: { lang: Locale; review: Review; onOpen: () => void }) {
  const r = copy.reviews;
  const s = copy.share;
  const digits = (n: number) => (lang === 'ckb' ? toKurdishDigits(n) : String(n));
  const date = (() => {
    const d = new Date(review.at);
    if (Number.isNaN(d.getTime()) || d.getTime() === 0) return '';
    return d.toLocaleDateString(lang === 'ckb' ? 'ckb-IQ' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  })();
  const tried =
    review.tried === 'both' ? s.both : review.tried === 'other' ? s.other : copy.blends[review.tried].name;
  return (
    <article className="chai-rcard" data-review={review.id} data-testid="chai-review-card">
      <button
        type="button"
        className="chai-rcard__open"
        onClick={onOpen}
        aria-label={`${review.name} — ${digits(review.rating)}/${digits(10)}`}
      />
      <header className="chai-rcard__head">
        <span className="chai-sheet__avatar" style={{ '--tone': TONE[review.tried] } as CSSProperties}>
          {Array.from(review.name)[0]?.toUpperCase()}
        </span>
        <span className="chai-sheet__who">
          <span className="chai-rcard__name">{review.name}</span>
          <span className="chai-sheet__where">{[review.location, date].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="chai-sheet__rating">
          <MiniGlass fill={review.rating / 10} />
          {digits(review.rating)}
          <small>/{digits(10)}</small>
        </span>
      </header>
      <p className="chai-rcard__band">
        {s.bands[review.rating - 1]} · <span>{tried}</span>
      </p>
      {review.note && <p className="chai-rcard__note">“{review.note}”</p>}
      {review.photo && (
        <span className="chai-rcard__photo" aria-label={r.page.photo}>
          <img src={review.photo} alt="" loading="lazy" decoding="async" />
        </span>
      )}
      {review.mine && (
        <span className="chai-sheet__tag chai-rcard__tag" data-unsent={!review.sent || undefined}>
          {review.sent ? r.mine : r.unsent}
        </span>
      )}
    </article>
  );
}
