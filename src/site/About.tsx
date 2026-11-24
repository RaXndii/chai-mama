import { useEffect, useRef } from 'react';
import { chaimama as copy } from '@/content';
import { toKurdishDigits } from '@/content/kurdish';
import { LOCALES, type Locale } from '@/content/types';
import { switchLocale } from '@/app/i18n';
import mascotUrl from '../brand/mascot.webp';

interface Props {
  lang: Locale;
  onTop: () => void;
}

/** A line icon for each step of how the tea is made (24 × 24, in the text colour). */
const STEP_PATHS = [
  // Selected: a leaf picked between two fingers' worth of stem.
  'M5 19c0-8.3 5.7-14 14-14 0 8.3-5.7 14-14 14Zm0 0 8.5-8.5M9.5 14.5h3.3M12 12V8.6',
  // Controlled: a balance, level.
  'M12 4v16M7 20h10M4.5 8h15M6.5 8 4 14a2.6 2.6 0 0 0 5 0L6.5 8Zm11 0L15 14a2.6 2.6 0 0 0 5 0l-2.5-6Z',
  // Standardised: a seal with a tick.
  'M12 3.2l2.2 1.6 2.7-.1.9 2.6 2.2 1.6-.8 2.6.8 2.6-2.2 1.6-.9 2.6-2.7-.1L12 20.8l-2.2-1.6-2.7.1-.9-2.6L4 15.1l.8-2.6L4 9.9l2.2-1.6.9-2.6 2.7.1L12 3.2Zm-3.2 9 2.2 2.2 4.2-4.6',
];

/**
 * Our Story, its own page: the owner's words about the brand, its name and how its tea is made — then Connect
 * and a quiet footer, on the dark of the pack's ink.
 *
 * Nothing moves here on its own: each part rises in once, as it first comes into view (one
 * IntersectionObserver; under reduced motion it only fades), so scrolling stays smooth.
 */
export default function About({ lang, onTop }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const a = copy.about;
  const other: Locale = lang === 'ckb' ? 'en' : 'ckb';

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
      { root: el.closest('.chai'), rootMargin: '0px 0px -12% 0px' },
    );
    for (const p of parts) io.observe(p);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={root} id="chai-end" className="chai-end">
      <section id="chai-about" className="chai-story" aria-labelledby="chai-about-title" tabIndex={-1}>
        <div className="chai-story__glow" aria-hidden="true" />
        <header className="chai-story__head" data-rise="">
          <p className="chai-story__brand" lang="ckb" dir="rtl">
            {copy.brand.wordmark}
          </p>
          <h2 id="chai-about-title" className="chai-story__title">
            {a.title}
          </h2>
          <p className="chai-story__lede">{a.lede}</p>
        </header>

        <div className="chai-story__about">
          <figure className="chai-story__seal" data-rise="">
            <img
              src={mascotUrl}
              alt={copy.product.mascotAlt}
              width={632}
              height={640}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <span className="chai-story__word" lang="ckb" dir="rtl">
                {a.name.word}
              </span>
              <span className="chai-story__meaning">{a.name.meaning}</span>
            </figcaption>
          </figure>
          <div className="chai-story__copy" data-rise="">
            <p className="chai-story__eyebrow">{a.storyEyebrow}</p>
            <h3 className="chai-story__h3">{a.storyTitle}</h3>
            {a.story.map((line, i) => (
              <p key={line} className={i === 0 ? 'chai-story__p chai-story__p--first' : 'chai-story__p'}>
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="chai-story__process">
          <div className="chai-story__process-head" data-rise="">
            <p className="chai-story__eyebrow">{a.processEyebrow}</p>
            <h3 className="chai-story__h3">{a.processTitle}</h3>
            <p className="chai-story__p">{a.processLede}</p>
          </div>
          <ol className="chai-steps">
            {a.steps.map((s, i) => (
              <li key={s.title} className="chai-step" data-rise="" style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="chai-step__n" aria-hidden="true">
                  {lang === 'ckb' ? toKurdishDigits(i + 1) : `0${i + 1}`}
                </span>
                <svg
                  className="chai-step__icon"
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d={STEP_PATHS[i]}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h4 className="chai-step__title">{s.title}</h4>
                <p className="chai-step__body">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="chai-story__close" data-rise="">
            {a.close}
          </p>
        </div>
      </section>

      <section id="chai-connect" className="chai-connect" aria-labelledby="chai-connect-title" tabIndex={-1}>
        <p className="chai-story__eyebrow">{copy.connect.eyebrow}</p>
        <h2 id="chai-connect-title" className="chai-story__h3">
          {copy.connect.title}
        </h2>
        <p className="chai-connect__line">{copy.connect.body}</p>
        <div className="chai-connect__actions">
          <button
            type="button"
            className="chai-cta chai-cta--ghost"
            onClick={() => switchLocale(other)}
            lang={other}
            dir={LOCALES[other].dir}
          >
            {LOCALES[other].label}
          </button>
        </div>
      </section>

      <footer className="chai-foot" aria-label={copy.footer.label}>
        <span className="chai-foot__giant" aria-hidden="true">
          {copy.footer.giant}
        </span>
        <button type="button" className="chai-foot__top" onClick={onTop} aria-label={copy.footer.top}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 19V5M6 11l6-6 6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </footer>
    </div>
  );
}
