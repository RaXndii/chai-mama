import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { chaimama as copy } from '@/content';
import { LOCALES, type Locale } from '@/content/types';
import { switchLocale } from '@/app/i18n';
import mascotUrl from '../brand/mascot.webp';
import { pathOf } from '../routes';
import { NAV_PAGE, NAV_SECTIONS, type NavSection } from './nav';

const LANGS: readonly Locale[] = ['en', 'ckb'];
/** How long the menu's split (or merge) takes, with its liquid edge on (ms). */
const DOCK_MS = 900;

/** A line icon for each page (24 × 24, stroked in the text colour), and the menu's close. */
const ICONS: Record<NavSection | 'close', string> = {
  'chai-top': 'M4.5 11 12 4.8l7.5 6.2v8.2a.8.8 0 0 1-.8.8h-4.2v-5.6h-5v5.6H5.3a.8.8 0 0 1-.8-.8V11Z',
  'chai-tea': 'M6.2 8.2h11.6l-.9 11.6a.8.8 0 0 1-.8.7H7.9a.8.8 0 0 1-.8-.7L6.2 8.2Zm3.3 0V7.3a2.5 2.5 0 0 1 5 0v.9',
  'chai-about':
    'M4.8 5.6c2.6-.9 5-.7 7.2.9v12.8c-2.2-1.5-4.6-1.8-7.2-.9V5.6Zm14.4 0c-2.6-.9-5-.7-7.2.9v12.8c2.2-1.5 4.6-1.8 7.2-.9V5.6Z',
  'chai-connect': 'M5 5.8h14v9.4H10.6L6.6 18.6v-3.4H5V5.8Zm4 4.7h.01M12 10.5h.01M15 10.5h.01',
  close: 'M7 7l10 10M17 7 7 17',
};

function Glyph({ d }: { d: string }) {
  return (
    <svg className="chai-dock__glyph" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
 * The site's header: the pages on one side, the Chai Mama logo in the middle, the language on the other side.
 *
 * Where the links would crowd the logo (phones, tablets) they fold into one glass button showing the page you
 * are on. Pressing it, the glass swells and splits like a drop of liquid into a row of buttons — the four pages
 * and the language — and the button itself becomes the close; they flow back into it on closing. The liquid
 * edge is an SVG filter, on only while the glass moves (under reduced motion the row simply fades in).
 */
export default function ChaiNav({ lang, current, onGo }: Props) {
  const [menu, setMenu] = useState(false);
  /** The glass is moving (opening or closing): its liquid edge is on. */
  const [moving, setMoving] = useState(false);
  const moveTimer = useRef(0);
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
      toggleMenu(false);
    };
    const onDown = (e: PointerEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      setLangOpen(false);
      toggleMenu(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [menu, langOpen]);
  useEffect(() => () => window.clearTimeout(moveTimer.current), []);

  /** Open or close the menu; the glass's liquid edge is on for as long as it moves. */
  const menuNow = useRef(menu);
  menuNow.current = menu;
  const toggleMenu = (open: boolean) => {
    if (menuNow.current === open) return;
    menuNow.current = open;
    window.clearTimeout(moveTimer.current);
    setMoving(true);
    moveTimer.current = window.setTimeout(() => setMoving(false), DOCK_MS);
    setMenu(open);
  };
  // Opened, focus goes to the first page in the row (for the keyboard).
  const dockItems = useRef<HTMLElement>(null);
  useEffect(() => {
    if (menu) dockItems.current?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });
  }, [menu]);

  const labels: Record<NavSection, string> = {
    'chai-top': copy.nav.home,
    'chai-about': copy.nav.about,
    'chai-tea': copy.nav.shop,
    'chai-connect': copy.nav.connect,
  };
  const go = (id: NavSection) => (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    toggleMenu(false);
    onGo(id);
  };
  const choose = (l: Locale) => {
    setLangOpen(false);
    toggleMenu(false);
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
  const other: Locale = lang === 'ckb' ? 'en' : 'ckb';
  /** The menu's buttons, in the row's order from the close outwards: the pages, then the language. */
  const row = NAV_SECTIONS.length + 1;
  const dock = (
    <div
      className="chai-dock"
      data-open={menu || undefined}
      data-moving={moving || undefined}
      style={{ '--n': row } as CSSProperties}
    >
      {/* The glass: one drop per button, under them (and one under the close). */}
      <div className="chai-dock__glass" aria-hidden="true">
        <div className="chai-dock__goo">
          {Array.from({ length: row }, (_, i) => (
            <span key={i} className="chai-dock__drop" style={{ '--k': row - i } as CSSProperties} />
          ))}
          <span className="chai-dock__drop chai-dock__drop--home" />
        </div>
      </div>
      <nav
        ref={dockItems}
        id="chai-dock"
        className="chai-dock__row"
        aria-label={copy.nav.label}
        inert={!menu}
        data-testid="chai-dock"
      >
        {NAV_SECTIONS.map((id, i) => (
          <a
            key={id}
            className="chai-dock__item"
            href={hrefOf(id)}
            onClick={go(id)}
            aria-current={current === id ? 'true' : undefined}
            style={{ '--k': row - i } as CSSProperties}
          >
            <Glyph d={ICONS[id]} />
            <span className="chai-dock__label">{labels[id]}</span>
          </a>
        ))}
        <button
          type="button"
          className="chai-dock__item chai-dock__item--lang"
          onClick={() => choose(other)}
          aria-label={`${copy.nav.language}: ${LOCALES[other].label}`}
          style={{ '--k': 1 } as CSSProperties}
          data-testid="chai-dock-lang"
        >
          <span className="chai-dock__short" lang={other} dir={LOCALES[other].dir}>
            {LOCALES[other].short}
          </span>
          <span className="chai-dock__label" lang={other} dir={LOCALES[other].dir}>
            {LOCALES[other].label}
          </span>
        </button>
      </nav>
      <button
        ref={menuBtn}
        type="button"
        className="chai-dock__home"
        aria-expanded={menu}
        aria-controls="chai-dock"
        aria-label={menu ? copy.nav.close : copy.nav.menu}
        onClick={() => toggleMenu(!menu)}
        data-testid="chai-menu-toggle"
      >
        <span className="chai-dock__face chai-dock__face--page">
          <Glyph d={ICONS[current]} />
        </span>
        <span className="chai-dock__face chai-dock__face--close">
          <Glyph d={ICONS.close} />
        </span>
      </button>
    </div>
  );
  const chevron = (
    <svg className="chai-chevron" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );

  return (
    <header ref={root} className="chai-header" data-menu={menu || undefined}>
      {/* The liquid edge of the menu's glass: drops close together merge, and pull apart with a neck. */}
      <svg className="chai-dock__defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="chai-goo" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
        </filter>
      </svg>
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
        {dock}
      </div>
    </header>
  );
}
