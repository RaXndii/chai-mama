import type { FactIcon } from '@/content/chaimama';

/**
 * Line icons for the facts printed on the packs (DECISIONS CM-007): drawn here, in the pack's ink line, so
 * the page needs no icon library. 24 × 24, stroked with the text colour.
 */
const PATHS: Record<FactIcon, string> = {
  // A tea leaf on its stem.
  leaf: 'M5 19c0-8.3 5.7-14 14-14 0 8.3-5.7 14-14 14Zm0 0 8.5-8.5M9.5 14.5h3.3M12 12V8.6',
  // A slice of citrus (bergamot, the Earl Grey).
  citrus: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 3v11M7.2 9.2l9.6 5.6M7.2 14.8l9.6-5.6',
  // A cardamom pod, split along its seam.
  pod: 'M12 3c3.6 3.2 4.6 9.3 0 18-4.6-8.7-3.6-14.8 0-18Zm0 3.5v11M9.6 10.5 12 12l2.4-1.5M9.8 14.5 12 16l2.2-1.5',
  // A rose.
  flower:
    'M12 9.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Zm0-5.2c1.8 1.4 2.4 3.2 1.6 5.4M12 4c-1.8 1.4-2.4 3.2-1.6 5.4M4.6 9.4c2.3-.5 4 .2 5 2.2M19.4 9.4c-2.3-.5-4 .2-5 2.2M7.3 18.4c.7-2.2 2.2-3.2 4.7-3M16.7 18.4c-.7-2.2-2.2-3.2-4.7-3',
  // A tea-house glass on its saucer.
  cup: 'M8 4h8l-1.2 8.3A2.8 2.8 0 0 1 12 14.7a2.8 2.8 0 0 1-2.8-2.4L8 4Zm1 4h6M12 14.7V18M6.5 20h11',
  // Nothing added: a plain leaf in a ring.
  plain:
    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8.5 15.5c0-4.4 2.6-7 7-7 0 4.4-2.6 7-7 7Zm0 0 3.6-3.6',
};

export function FactGlyph({ icon }: { icon: FactIcon }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={PATHS[icon]}
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** An arrow pointing along the reading direction (it flips right to left). */
export function Arrow() {
  return (
    <svg className="chai-arrow" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
