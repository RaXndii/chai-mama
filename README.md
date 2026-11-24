# Chai Mama

The website of Chai Mama, Kurdish black tea: **Heritage Blend** and **The Lovely Blend**.

Three pages, in English and Central Kurdish (Sorani, right to left):

| Page      | Address  | What is on it                                                                                                                                                        |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home      | `/`      | The owner's photograph of the pack on its rock in the tea country; the blend switch turns the time of day and uncovers the other pack. Then "another flavour".       |
| Shop      | `/shop`  | The same picture, the camera moved in, and the shop in the blend's light: the two ways to buy at the owner's prices. Ordering is not open yet, and the page says so. |
| Our Story | `/about` | The owner's own words about the brand, its name and how the tea is made; Connect.                                                                                    |

Real loose tea (cut from the owner's photo) falls on every page.

`?lang=ckb` opens the site in Kurdish, `?blend=lovely` on The Lovely Blend, `?lite=1` with lighter motion.

## Run it

```sh
npm install
npm run dev          # http://localhost:5173
npm run check        # typecheck, lint, unit tests
npm run e2e          # browser tests on the production build (Chromium)
npm run build        # dist/
```

Node 22.18 or newer.

## Deploy

**GitHub Pages (now):** every push to `main` is built and published to the `gh-pages` branch
(`.github/workflows/pages.yml`), served at https://raxndii.github.io/chai-mama/. The site is built with
`BASE_PATH=/chai-mama/` there; `404.html` (a copy of the app) answers for `/shop` and `/about`.

**Vercel or any host with its own domain:** a plain Vite project — build `npm run build`, output `dist`, no
`BASE_PATH`. `vercel.json` sends `/shop` and `/about` to the app and caches the hashed assets for a year.

## Where things are

- `src/site/` — the pages: `ChaiSite.tsx` (the picture, the blend switch, the pages and their moves), `Shop.tsx`,
  `About.tsx`, `ChaiNav.tsx`, the falling tea (`teaRain.ts`, drawn in a worker), `chai.css`.
- `src/content/chaimama.ts` — every word on the site, English and Kurdish.
- `src/site/order.ts` — the owner's prices.
- `src/arrival/layers/`, `src/brand/` — the photograph's layers and the packs.
- `scripts/chaimama/` — the offline scripts that cut those images from the owner's photos (Python).
- `DECISIONS.md` — why the site is built the way it is.
