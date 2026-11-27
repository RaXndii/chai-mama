# Decisions

## CM-025 · 2026-11-27 · "How was your tea?" a page of its own, an easier rating, and the reviews page

The owner: after the blends, "How was your tea?" should be an actual page — wider, its own — though the site
stays one big page; the rating's glass and slider "don't function really well" and should be easier; and the
reviews should open onto a page of their own with what people said.

- **A page in the scroll** (`/share`): the homepage runs on from the blends into "How was your tea?" and then
  into Our Story; each takes its address as it reaches the header (no new history entry), and `/share` opens the
  homepage scrolled to it. It fills at least a screen, from under the header. On a wide screen the picture and
  the reviews' folder stay on one side while the questions go by on the other; on a phone it runs from edge to
  edge — the picture under the header, the questions on a sheet rising over its foot, the folder after them.
  The small "Our Story" link under the blends is gone (Our Story simply follows).
- **The rating, easier:** a finger on the track slides the rating and never the page (the track is a larger
  target); while it slides, the thumb, the gold and the tea follow the finger exactly (no lag), and on letting go
  they settle on the nearest step with a little spring. The glass is no longer redrawn at ten (which made it
  flicker); "Slide to rate" is said once.
- **The reviews page** (`/reviews`): tapping the folder opens it (the glass falls, the reviews rise) and goes
  there; a review tapped in the folder is brought into view there and lit. It shows what people make of the
  teas — a glass of tea filled to the average, the number, each blend's own average (a review of both counts for
  both) — the reviews as cards (who, from where, when, the rating with a little glass, the word for it, the tea,
  their words, their photo as a print), for one tea or all, newest or highest first; a card opens to read it
  whole, its photo developing, and on to the next. "Back" and "Share your experience" go to `/share`. With no
  reviews yet it says so, with Mama, and nothing is made up.

## CM-024 · 2026-11-27 · the share card after the owner's mock, and the reviews in a folder of glass

The owner sent a mock of a better "How was your tea?" (a picture across the top, the two packs large, a real
glass of tea for the rating with a slim slider, a "memory of tea" with a photo, a consent to show it) and asked
for the reviews to be shown by it — like the glass-folder component they sent: a small profile for each review
(name, place, rating, a few words), the folder opening to show them, a photo revealed when there is one; "make
something cool and not out of place". The email must stay truly optional.

- **The card:** the valley's picture across the top — the owner's own plates (far, sky, rock) with the Heritage
  Blend pack on its rock and a glass of tea beside it (the mock's glass, laid on with its white as the photo's own
  light so the glass shows the hills through it; `share-banner-*.webp`); steam rising over it; the question over
  the sky. Then name and email side by side, place, the two packs large with a tick, "both" and "other" small, the
  rating, thoughts, the memory of tea (two prints, the top one the visitor's own photo once added, developing like
  a print) and the consent to show it, and "Share your experience".
- **The rating** is a real glass of tea: the mock's glass, full and (made from it) empty, the full one shown up to
  the tea's level, which rises with the slider (a line of light on its surface, steam once it is high, sparks
  and a ring at ten); the number large in gold, a word for it with a gold swash; a slim track with a tick at
  each step, 1 and 10 at its ends (left to right in Kurdish too, as in the mock).
- **The reviews, in a folder of warm glass** (after the owner's component, in the site's own CSS and React: no
  Tailwind, no generated artwork — the back panel holds the valley's picture). Each review is a sheet of the
  pack's paper: an initial in a ring of the tea tried (gold, red, both, brown), the name, the place, the rating
  with a little glass filled to it, three lines of words, and, when there is a photo, a small print peeking from
  its corner. A mouse tips the glass toward you; a tap opens it and the newest four rise out and fan; choosing one
  opens it — the photo developing, the date, the tea tried, all the words — and from there every review can be
  read in turn. "+" goes back up to the card. A review just shared drops into the folder and the count rolls on.
- **Nothing made up.** The reviews are the shop's published ones, from `VITE_REVIEWS_URL` when the site has one
  (a JSON list; a review shows only with a name and a rating from 1 to 10, and a photo only from an https or image
  address) — none until then — and the ones shared from this device, kept on it, marked "Yours", and "Not sent
  yet — only you can see it" while the shop has no feedback address. The visitor can remove their own.
- **The email:** asked for and checked only when something is written in it; left empty, nothing is asked and
  the review goes without one (tested).

## CM-023 · 2026-11-27 · share your experience

The owner wants a "Share your experience" part, better than the one on their old site: a name, an email and a
place if they like, which tea they tried (Heritage Blend, The Lovely Blend, both, or another), a rating out of
ten given by sliding, their thoughts, and a photo if they like — in the site's own style, with a cool animation
for the rating. Its place: after the teas, before Our Story.

- **Where:** a cream card on the teas' gold, between the teas and Our Story (the scroll runs on through it into
  the ink); not on the shop.
- **Asked:** name (needed); email, place (a city) — both optional, the email checked only when given; which
  tea — four cards with the packs themselves, both packs, or a glass; the rating (needed); thoughts (optional,
  600 characters); a photo (optional), made small on the phone before it is sent (1600 px, JPEG).
- **The rating:** a track to slide along with a thumb that snaps from step to step; a tea glass beside the
  number fills with each step, its surface moving; the number springs to its value with a word for it (Not for
  me … Good … Lovely … The perfect cup); each step a soft tick a little higher than the last (and a buzz on
  phones that have one). At ten the glass steams, sparkles, tips a little and rings. It starts unrated ("Slide
  to rate"); under it is a real slider, for the keyboard and screen readers; right to left in Kurdish.
- **Sent:** Mama winks his thanks with the order's sound (CM-020), "Thank you, {name}!", and "Share another".
- **Where it goes:** to the shop's feedback address when the site is built with one (`VITE_FEEDBACK_ENDPOINT`:
  a URL that takes a form, with the photo as a file). Until then nothing is sent, and the thanks says so.
- The owner mentioned a code or picture for the rating to take inspiration from; none had come yet, so this is
  the site's own design, ready to be brought closer to it.
- New Kurdish words are for the owner to check.

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
