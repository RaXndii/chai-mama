import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { chaimama as copy } from '@/content';
import { LOCALES, type Locale } from '@/content/types';
import { switchLocale } from '@/app/i18n';
import mascotUrl from '../brand/mascot.webp';
import { pathOf } from '../routes';
import { NAV_PAGE, NAV_SECTIONS, type NavSection } from './nav';

const LANGS: readonly Locale[] = ['en', 'ckb'];

interface Props {
  lang: Locale;
  /** The page shown (its link is marked as the current one). */
  current: NavSection;
  /** Go to a page (or Connect's part of About), in the site (no reload). */
  onGo: (id: NavSection) => void;
}

/** A link's address: its page (a new tab or a copied link opens that page). */
const hrefOf = (id: NavSection) => pathOf(NAV_PAGE[id]);

/**
 * The site's header: the pages on one side, the Chai Mama logo in the middle, the language on the other
 * side. On a phone the links and the language fold into a menu
 * that opens below the header, so nothing covers the pack until it is asked for.
 */
export default function ChaiNav({ lang, current, onGo }: Props) {
  const [menu, setMenu] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const langBtn = useRef<HTMLButtonElement>(null);

  // Escape closes what is open (focus goes back to its button). A press anywhere else closes it too.
  useEffect(() => {
    if (!menu && !langOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (langOpen) langBtn.current?.focus();
      else menuBtn.current?.focus();
      setLangOpen(false);
      setMenu(false);
    };
    const onDown = (e: PointerEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      setLangOpen(false);
      setMenu(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [menu, langOpen]);

  const labels: Record<NavSection, string> = {
    'chai-top': copy.nav.home,
    'chai-about': copy.nav.about,
    'chai-tea': copy.nav.shop,
    'chai-connect': copy.nav.connect,
  };
  const go = (id: NavSection) => (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setMenu(false);
    onGo(id);
  };
  const choose = (l: Locale) => {
    setLangOpen(false);
    setMenu(false);
    switchLocale(l);
  };
  const links = (where: string) => (
    <ul className={`chai-nav__list chai-nav__list--${where}`}>
      {NAV_SECTIONS.map((id) => (
        <li key={id}>
          <a
            className="chai-nav__link"
            href={hrefOf(id)}
            onClick={go(id)}
            aria-current={current === id ? 'true' : undefined}
          >
            {labels[id]}
          </a>
        </li>
      ))}
    </ul>
  );
  const chevron = (
    <svg className="chai-chevron" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );

  return (
    <header ref={root} className="chai-header" data-menu={menu || undefined}>
      <div className="chai-header__start">
        <nav className="chai-nav" aria-label={copy.nav.label}>
          {links('bar')}
        </nav>
      </div>

      <a
        className="chai-brand"
        href={hrefOf('chai-top')}
        onClick={go('chai-top')}
        aria-label={copy.brand.name}
      >
        <img className="chai-brand__mark" src={mascotUrl} alt="" width={632} height={640} />
        <span className="chai-brand__name" lang="en" dir="ltr">
          Chai Mama
        </span>
      </a>

      <div className="chai-header__end">
        <div className="chai-lang">
          <button
            ref={langBtn}
            type="button"
            className="chai-pill chai-lang__toggle"
            aria-expanded={langOpen}
            aria-controls="chai-lang-list"
            aria-label={`${copy.nav.language}: ${LOCALES[lang].label}`}
            onClick={() => setLangOpen((o) => !o)}
            data-testid="chai-lang"
          >
            <span lang={lang} dir={LOCALES[lang].dir}>
              {LOCALES[lang].label}
            </span>
            {chevron}
          </button>
          <ul id="chai-lang-list" className="chai-lang__list" hidden={!langOpen}>
            {LANGS.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  className="chai-lang__option"
                  aria-current={l === lang ? 'true' : undefined}
                  onClick={() => choose(l)}
                  data-testid={`chai-lang-${l}`}
                >
                  <span lang={l} dir={LOCALES[l].dir}>
                    {LOCALES[l].label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button
          ref={menuBtn}
          type="button"
          className="chai-pill chai-menu-toggle"
          aria-expanded={menu}
          aria-controls="chai-menu"
          onClick={() => setMenu((m) => !m)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d={menu ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="sr-only">{copy.nav.menu}</span>
        </button>
      </div>

      <div id="chai-menu" className="chai-menu" hidden={!menu}>
        <nav aria-label={copy.nav.label}>{links('menu')}</nav>
        <div className="chai-menu__lang" role="group" aria-label={copy.nav.language}>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              className="chai-pill"
              aria-pressed={l === lang}
              onClick={() => choose(l)}
            >
              <span lang={l} dir={LOCALES[l].dir}>
                {LOCALES[l].label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
