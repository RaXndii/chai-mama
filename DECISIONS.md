# Decisions

## CM-015 · 2026-11-24 · the site stands on its own

Chai Mama was first built as a planet inside the Mars Labs universe (the M-D-T-Project repository, decisions
CM-001 … CM-014 there). The owner asked for it to be a whole website by itself, in its own repository, and to be
taken out of the universe.

- **What came over unchanged:** the three pages and everything on them — the layered photograph and its time of
  day, the blend switch, the window of clarity under the mouse, the shop and its move in, Our Story, the falling
  tea in a worker, English and Kurdish, the images and the scripts that made them.
- **What the universe used to give it, now its own:** a small router for `/`, `/shop` and `/about` with the
  browser's Back (`src/app/router.ts`); the language and its switch (`src/content/index.ts`, `src/app/i18n.ts`);
  reduced motion and a lighter mode for weak or data-saving devices (`src/app/quality.ts`); the few base styles
  (`src/styles/base.css`).
- **The way in:** there is no planet or gate any more. The site opens in the same cloud the gate used to end in;
  the mist clears onto the picture as the camera glides in (calm under reduced motion and in lite).
- **Taken out:** the Universe button, "Back to the universe" and every mention of the Mars Labs universe.
  Nothing new was written in their place.
- **Checks:** unit tests (`npm test`) and the browser tests (`npm run e2e`, desktop and phone) came over with the
  site; the planet and gate tests did not.

## Earlier decisions (in M-D-T-Project)

- **CM-008** one timeline drives the whole blend switch (sun, clouds, light, the pack uncovered by a soft edge).
- **CM-010** the shop: the owner's prices (one pouch 3,000 IQD; a carton of 42 at 2,750 IQD each); ordering not
  open; no offers or promises shown.
- **CM-011** Our Story: the owner's own text.
- **CM-012** the falling tea over every page, drawn in a worker, pacing itself on slow devices; phones get the
  picture cut to the band they see.
- **CM-013** the window of clarity masks only its own circle; what is covered at rest is not drawn.
- **CM-014** three pages instead of one long scroll: a short camera move between Home and Shop, a cross-fade to
  Our Story.
