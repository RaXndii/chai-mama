# Decisions

## CM-018 · 2026-11-25 · the shop on one screen

The owner: going to the shop "you have to wait like 3 seconds", then scroll before everything shows; it should all
be on one screen, with a cool change between a single pouch and a master carton and the price changing with it —
"$1000 worth", and never heavy or laggy. With a picture of a compact phone shop as inspiration.

- **Faster:** the move to the shop is 0.8 s (0.6 s back) and the shop is in place from its first part: the whole
  shop is there about 0.4–0.5 s after the tap (it was about 1.1 s, then a scroll on a phone). The tea in the shop
  falls no thicker than on the hero.
- **One screen.** On a phone: the pack in a band at the top, the shop on a cream sheet under it — the blend and
  its price, its line, the switch between the blends, the two ways to buy, how many, the details (folded), what it
  comes to and the order button; nothing to scroll from 360 × 640 up. On a wider screen: one card beside the pack.
- **The pack on a phone:** the picture's pack cannot be framed in the band (a phone's cut plates would not cover
  the screen that far back), so the shop has its own copy that flies out of the picture's pack into the band
  (measured once per move; a transform), the picture's stepping aside for it.
- **Pouch or carton:** a white highlight glides to the one chosen, its icon gives a little, its check draws
  itself; every price rolls to its new value and pulses as it lands (text written per frame on a small element,
  no React renders); for a carton two more pouches fan out behind the pack (in the picture on a wider screen, in
  the band on a phone). How many ticks up into place.
- **Product details** fold open to the blend's description, the pack's facts and the ingredient photographs.
- Only transforms and opacity move. Under reduced motion the highlights move at once, the prices are written at
  once, the carton's pouches only fade.
- New words: "Product details" «وردەکاریی بەرهەم» (Kurdish for the owner to check). The order summary card's
  labels went (the price, the subtotal and "Delivery: Not included" say it).

## CM-017 · 2026-11-24 · the iPhone's whole screen, and the teas under the hero

The owner, on an iPhone: the browser's grey bars above and below interrupted the site ("it should feel like you
enter the Chai Mama website"); scrolling down should show the teas — Heritage Blend first, then The Lovely Blend —
with their descriptions and ingredients (screenshots of the owner's own product cards); and the phone's sizes were
a little large.

- **The page scrolls, not a box inside it.** The site was one fixed full-screen box scrolling inside itself, so
  Safari drew its bars over plain background. Now the document scrolls: Safari draws the site under its bars and
  tucks them away as you scroll. What shows above the page (the status bar, a pull past the top) is the colour of
  the picture's sky for the blend's time of day, or the ink on Our Story; the browser's own colour
  (`theme-color`) follows. During the opening cloud nothing scrolls.
- **Saved to the home screen** it opens full screen like an app, with the Chai Mama icon (`manifest.webmanifest`,
  `apple-touch-icon.png`, the Apple web-app meta).
- **The teas** take the place of "another flavour": "Our blends", a card for each — the pack on a glow of its
  colour; Flagship · Flavoured Blend / Unflavoured Blend; the owner's description; what is in it; **Buy now —
  3,000 IQD** in the blend's colour, which chooses that blend and opens the shop. The ingredients are the
  owner's list (Ceylon Black Tea, Cornflower, Rose Petals, Crushed Cardamom, Earl Grey; The Lovely Blend: Ceylon
  Black Tea), each on a round chip that pops in after its card: the owner's own photographs of each ingredient (sent
  2026-11-24), cropped to the middle of the pile, 192 px each (`src/brand/ingredients/`). The section ends with a link on to Our Story.
- **Smaller on phones:** the logo, the slogan and the blend's name, the switch (48 px), Shop now (54 px), the menu's
  glass (44 px).
- New words (Kurdish for the owner to check): "Flagship" «بەرهەمی سەرەکی», "Flavoured Blend" «تێکەڵەی بەتام»,
  "Unflavoured Blend" «تێکەڵەی بێ بۆن», "What's inside" «پێکهاتەکان», "Buy now" «ئێستا بکڕە». The ingredient names
  in Kurdish are the ones already in the shop's description.

## CM-016 · 2026-11-24 · the phone's hero after the owner's picture, and a menu of glass

The owner sent a picture of how the homepage should look on a phone, and a short video of a glass button that
splits into several, for the menu ("get inspired by it, make it ours").

- **The hero on a phone:** the slogan and the blend's name over the sky, the pack, then the blend switch and a
  big **Shop now** in the pack's ink (to the shop, with the camera's move). The eyebrow and the blend's line are
  not on the phone's hero (the line is in the shop). The switch's buttons are solid, in the serif, and share the
  width inside the page's margins. Shop now is on the desktop too, under the switch.
- **Why the bottom was hard to read:** the saffron melt at the top of "another flavour" came up over the bottom of
  the picture, over the switch. The hero is sticky, so nothing inside it can be lifted above that; on phones the
  section now starts under the hero, and the hero's own melt makes the join.
- **The menu (phones and tablets):** one glass button showing the page you are on. Pressed, it swells and splits
  like a drop into a row: Home, About, Shop, Connect and the language, each with its name on a small tag; the
  button becomes the close, and they flow back into it. The liquid edge is an SVG filter on only while the glass
  moves (0.9 s); the buttons above it stay sharp; only transforms and opacity move. Under reduced motion the row
  simply fades. Escape or a tap elsewhere closes it; the pages stay real links. On a desktop the header is as it
  was.
- New words: "Shop now" / «ئێستا بکڕە» and "Close" / «داخستن» (Kurdish for the owner to check).
- The blend switch itself (the time of day turning) is unchanged.

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
