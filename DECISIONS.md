# Decisions

## CM-022 · 2026-11-27 · the checkout is the whole screen on a phone

The owner, from an iPhone in Kurdish: after Order now the questions came up as a sheet, and with the keyboard up
there was scrolling to do to reach them. They want the whole screen, with a good animation.

- **The whole screen, grown out of the button.** A circle of the blend's cream opens from the Order now button
  over the shop (0.6 s), and the order, the steps and the first questions rise into it one after another;
  closing, it shrinks back into the button. (A wider screen keeps its pane, which now fades as it goes.)
- **Above the keyboard.** The checkout fills what can be seen of the screen — the part above the keyboard once
  it is up (the browser's visual viewport) — so the button stays at the bottom of what is seen and the questions
  scroll between it and the order at the top; a field tapped is kept in sight.
- **No keyboard springing up by itself** on a touch screen: the visitor taps the first field (with a keyboard
  and mouse it still takes the focus at once).
- Under reduced motion it is simply there, and simply gone.

## CM-021 · 2026-11-27 · ready at once, and the homepage runs on into Our Story

The owner: the site took two or three seconds before it could be used — things coming together slowly — and
they want it all set up the moment it opens; and scrolling to the end of the homepage should take you on into
Our Story, without pressing anything. Smoothness above all.

- **No opening any more.** The cloud, the mist clearing and the camera's glide (CM-004, CM-006) are gone: the
  page is drawn at rest from its first frame — header, words, the blend switch and Shop now there and in use at
  once. The picture's first images are fetched before anything else and fade in (0.45 s) the moment they are
  decoded; when they already are (a return visit) they are simply there. The other time of day is fetched only
  after the opening picture is in. (`entrance.ts` and the arrival's pose are removed.)
- **One scroll from the homepage into Our Story.** Our Story, Connect and the footer now sit under the teas.
  The teas' gold steeps into Our Story's ink through the colour of tea, so one runs on into the other. As the
  ink reaches the header the page becomes Our Story — its address (`/about`, replacing the current one: no new
  history entry), the header's light colours, the About link lit — and back to the homepage above it. Only an
  address changes: nothing moves, nothing is redrawn but the header.
- **The links follow:** About (and the teas' "Our Story") glide down to it; Home from there glides back up;
  Connect goes to its part. `/about` by its address opens the homepage already scrolled to Our Story. The shop
  stays a screen of its own.

## CM-020 · 2026-11-25 · no falling tea, a clean sky behind the pack, and Mama winks when you order

The owner, from an iPhone: thin lines showed in the sky behind the pack in the shop (more of them after a
carton went back to a single pouch); the falling tea should go from every page, for a softer, smoother site; and
placing an order should feel like buying something — a really good animation, with Mama (the pack's man with
his glass of tea) winking in place of the check mark, and a satisfying sound.

- **The lines were the old pouch's outline.** Cutting the pouch out of the photograph had left a faint halo of
  it on the rock's plate, hidden while the picture's pouch stood over it and seen once it stepped aside (the
  shop on a phone). `scripts/chaimama/ledge_halo.py` cleared it from the six rock plates (everything above the
  rock in the pouch's columns; the rock's own edge and the fade at the pouch's foot kept). The picture's pouch is
  now hidden outright on a phone's shop (not only see-through, which Safari can still edge), and the carton's
  two extra pouches are hidden outright once they have folded back.
- **No falling tea anywhere.** The tea, its worker, its canvases, its sprite and its script are gone: nothing
  is drawn every frame any more, and the page is lighter.
- **Placing an order:** the pack flies from the checkout's corner, in an arc, into a ring that draws itself;
  as it lands the ring pulses and ripples, and tea leaves, rose petals, cardamom and saffron burst out of it;
  Mama springs up inside the ring, tips his head and winks, and a small check joins him; the words follow.
  He winks again every few seconds, and when tapped.
- **The sound** is made in the browser (no file): a soft pop as the pack lands, a bell chord rising over it
  (G major) with a little echo, and the clink of a tea glass on the wink; a short buzz on phones that have one.
  It is woken in the tap on Place order (browsers allow sound only after a tap); an iPhone's ringer switch
  silences it, as it does all web pages.
- **Reduced motion:** no flight and no burst; the ring is drawn, Mama fades in and still winks.
- **Still open:** where orders should arrive (`VITE_ORDER_ENDPOINT`); until then the thanks says plainly that
  the order was not sent.

## CM-019 · 2026-11-25 · the earlier shop on a laptop, fewer words, and a checkout

The owner liked the earlier laptop shop better, wanted the ingredients placed in it, no fade between the packs
when the tea changes (only the light and the scene), fewer words, and an order that works: after Order now, a
name, an email if they like, a phone and where to deliver (the Middle East first, Europe too), after their own
shop's checkout and a liquid-glass reference, in Chai Mama's own look.

- **Laptop:** beside the pack, in its light: the blend switch, the name, "Flavoured Blend · 200g", the five
  ingredients in the owner's photographs with their names, what is on the pack (icon and words, hairlines
  between), the two ways to buy side by side, how many, and a summary card (option, quantity, delivery,
  subtotal) with Order now. The long description and the folded details are a phone's only.
- **Phone:** the sheet as before, with the ingredients as a row of small photographs under the name and price
  (their names read out, not shown); the label "Choose your order" read out, not shown.
- **No fade between packs:** the other pack is simply there; the scene behind still turns slowly.
- **The checkout** (`Checkout.tsx`, rules in `checkout.ts`): a pane of warm glass (a sheet from the bottom on a
  phone) whose rim catches the light toward the pointer; two steps, Details and Delivery, with a drop of glass
  that springs between them; the button's words roll in; placing the order squashes the pane like a drop
  landing. The page behind holds still (no scroll, the tea rests, the drifts pause).
  - **Details:** full name; phone with its country (Iraq first, then the Middle East, then Europe), read however
    it is typed (0770…, +964…, 00964…, Kurdish digits) and checked for that country's length; email optional,
    checked when given.
  - **Delivery:** pinned on a map (OpenStreetMap, as on the owner's shop): the pin stays in the middle and the
    map moves under it; search a place, street or landmark; find my position, with how precise it is. The
    address where the pin rests is looked up and shown. Where the map cannot load, the address is typed (city,
    street and area). Then building or landmark, and notes, both optional.
  - **The map is its own download,** fetched only when it is opened (Leaflet, ~46 kB gzipped): the shop stays
    as light as it was.
  - **Where an order goes:** to the shop's order address when the site is built with one
    (`VITE_ORDER_ENDPOINT`, a URL that takes the order as JSON). Without one, nothing leaves the page and the
    visitor is told plainly that it has not been sent. The owner has to say where orders should arrive.
- **Not taken from the reference:** its stack (shadcn, Tailwind). The site's own CSS does the same at no extra
  weight; only the ideas came over.
- **New Kurdish words** (the checkout's) are for the owner to check.

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
