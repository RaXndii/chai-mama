import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The Chai Mama website: it opens ready on the owner's picture; two blends in one place, one shot (Heritage
 * Blend in the earlier light, The Lovely Blend later in the day); three pages (the homepage running on into Our
 * Story, and the shop) with real addresses. Runs in software WebGL-free Chromium: the timelines follow the wall
 * clock, so a few seconds each.
 */
test.describe.configure({ timeout: process.env.CI ? 300_000 : 150_000 });

const LONG = process.env.CI ? 120_000 : 60_000;

const consoleErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const site = (page: Page) => page.getByTestId('chai-site');
const hero = (page: Page) => page.getByTestId('chai-hero');
const SLOGAN = 'هەر چاکەی مامە چاکە';
const LOVELY =
  'Pure Ceylon black tea only — the same quality base as our Heritage Blend, without the added flowers, cardamom, or earl grey. Simple, bold, and reliable.';
const HERITAGE =
  'A balanced family recipe with black tea, cardamom, and rose petals — made for a consistent cup, every time.';
/** The hero's blend switch (the shop has its own, CM-010). */
const radio = (page: Page, name: string) => hero(page).getByRole('radio', { name });
const shop = (page: Page) => page.getByTestId('chai-shop');
/** OpenStreetMap, without the network: blank tiles, and one address for every lookup and search. */
async function stubMap(page: Page) {
  const tile = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN4+eQaAAVdAqTP7UgSAAAAAElFTkSuQmCC',
    'base64',
  );
  const address = { road: '100 Meter Street', suburb: 'Ankawa', city: 'Erbil', country: 'Iraq' };
  await page.route('https://tile.openstreetmap.org/**', (r) =>
    r.fulfill({ body: tile, contentType: 'image/png' }),
  );
  await page.route('https://nominatim.openstreetmap.org/search**', (r) =>
    r.fulfill({ json: [{ lat: '36.2307', lon: '43.9638', display_name: 'Ankawa', address }] }),
  );
  await page.route('https://nominatim.openstreetmap.org/reverse**', (r) =>
    r.fulfill({ json: { display_name: 'x', address } }),
  );
}
/** A page of the site by the header's link (in the menu on a phone), in any language (CM-014). */
async function navTo(page: Page, path: 'shop' | 'about' | '') {
  const href = path ? `a[href="/${path}"]` : 'a[href="/"]';
  const bar = page.locator(`.chai-nav__list--bar ${href}`).first();
  if (await bar.isVisible()) return bar.click();
  // Phones and tablets: the glass menu opens, and the page is one of its drops.
  await page.getByTestId('chai-menu-toggle').click();
  await page.locator(`#chai-dock ${href}`).first().click();
}
/** To the shop, and wait for the camera's move to end. */
async function toShop(page: Page) {
  await navTo(page, 'shop');
  await expect(page).toHaveURL(/\/shop/);
  await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'in');
  await expect.poll(() => opacity(page, '.chai-wash')).toBe(1);
}
/** A custom property on an element (the shop's colours are on the shop, CM-011). */
const cssVar = (page: Page, selector: string, name: string) =>
  page.locator(selector).evaluate((el, n) => Number(getComputedStyle(el).getPropertyValue(n)), name);
const opacity = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => Number(getComputedStyle(el).opacity));
/** How far the red pack is uncovered over the yellow one (0 … 1). */
const reveal = (page: Page) =>
  page
    .locator('.chai-layer--pouch')
    .evaluate((el) => Number((el as HTMLElement).style.getPropertyValue('--reveal')));
/** The page's own scroll (the document scrolls, so an iPhone's bars tuck away). */
const scrollTop = (page: Page) => page.evaluate(() => window.scrollY);

test.describe('Chai Mama — the opening', () => {
  test('it opens ready: the picture, the words and the buttons at once; no WCAG A/AA violations', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Nothing to wait through (CM-021): no cloud, no glide; the words and the buttons are there and in use
    // from the first frame, and the picture fades in as soon as it has arrived.
    await expect(site(page)).toHaveAttribute('data-stage', 'home');
    await expect(page.locator('.chai-veil')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: SLOGAN })).toBeVisible();
    expect(await opacity(page, '.chai-hero__copy > *:first-child')).toBe(1);
    expect(await opacity(page, '.chai-header')).toBe(1);
    await expect(page.locator('.chai-stage')).toHaveAttribute('data-ready', /.*/);
    await expect.poll(() => opacity(page, '.chai-stage')).toBe(1);
    // The shop's own page: the real pouch on its rock and the pack's own blend.
    await toShop(page);
    await expect(shop(page).getByRole('heading', { level: 2, name: 'Heritage Blend' })).toBeVisible();
    await expect(shop(page).getByRole('img', { name: 'The Chai Mama Heritage Blend pouch' })).toBeVisible();
    // What is in it, and what is on the pack, beside it (CM-019).
    await expect(
      shop(page).getByRole('list', { name: "What's inside" }).getByText('Rose Petals'),
    ).toBeVisible();
    await expect(shop(page).locator('.chai-shop__facts--wide').getByText('Rose petals')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[data-testid="chai-site"]').analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('in Kurdish the page is right to left, with the Kurdish face', async ({ page }) => {
    await page.goto('/?lang=ckb');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await expect(site(page)).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1')).toHaveText(SLOGAN);
    await expect(page.getByTestId('chai-blend-name')).toHaveText('تێکەڵەی ڕەسەن');
    await expect(page.getByRole('link', { name: 'دەربارە' })).toBeVisible();
    // The language: the current one, and a short list to choose from.
    await page.getByTestId('chai-lang').click();
    await page.getByTestId('chai-lang-en').click();
    await expect(site(page)).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('chai-blend-name')).toHaveText('Heritage Blend');
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
    await expect(page.locator('#chai-lang-list')).toBeHidden();
  });

  test('reduced motion: a calm arrival, and a quick fade between blends', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: 20_000 });
    await radio(page, 'The Lovely Blend').click();
    await expect(hero(page)).not.toHaveAttribute('data-switching', /.*/, { timeout: 2000 });
    await expect(page.getByTestId('chai-blend-name')).toHaveText('The Lovely Blend');
  });

  test('lite mode: the arrival still plays, and nothing on the page uses WebGL', async ({ page }) => {
    await page.goto('/?lite=1');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('@phone the homepage fits the phone', async ({ page }) => {
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    // The pouch is in view, nothing runs wider than the screen, and the pills are thumb-sized.
    const box = (await page.locator('.chai-layer--pouch').boundingBox())!;
    const vw = page.viewportSize()!.width;
    expect(box.x).toBeGreaterThan(0);
    expect(box.x + box.width).toBeLessThan(vw);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // The whole pack is in view, clear of the words above it and the blend switch below it.
    const blends = (await page.getByTestId('chai-blends').boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(blends.y);
    expect(blends.x).toBeGreaterThanOrEqual(0);
    expect(blends.x + blends.width).toBeLessThanOrEqual(vw);
    // 44 px, measured to within half a pixel as the header slides in.
    for (const b of await page.locator('.chai-pill:visible, .chai-blend').all())
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
    // No mouse, no window of clarity: the far country is shown sharp.
    await expect(hero(page)).not.toHaveAttribute('data-clarity', /.*/);
    await expect(page.locator('.chai-clear')).toHaveCount(0);
    // A tap on the other blend turns the scene, and the words follow.
    await radio(page, 'The Lovely Blend').tap();
    await expect(page.getByTestId('chai-blend-name')).toHaveText('The Lovely Blend', { timeout: 10_000 });
  });
});

test.describe('Chai Mama — two blends, one place', () => {
  test("The Lovely Blend: the same rock later in the day, the red pack in the yellow one's place; and back", async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await page.evaluate(() => ((window as unknown as { __stay: boolean }).__stay = true));
    await expect(radio(page, 'Heritage Blend')).toHaveAttribute('aria-checked', 'true');
    // The camera, the rock and the pack's box are where they are, and stay there (chosen by keyboard: at rest
    // the hero sways a little with a pointer).
    const still = () =>
      page.$$eval('.chai-layer', (els) => els.map((el) => (el as HTMLElement).style.transform).join('|'));
    const before = await still();

    await radio(page, 'Heritage Blend').focus();
    await page.keyboard.press('ArrowRight');
    // Acknowledged at once; the scene starts turning toward later in the day.
    await expect(radio(page, 'The Lovely Blend')).toHaveAttribute('aria-checked', 'true');
    await expect(hero(page)).toHaveAttribute('data-time', 'dusk');
    await expect(hero(page)).toHaveAttribute('data-switching', 'true');
    // Mid-way, the pack is part uncovered: never a blank, never both gone.
    await expect.poll(() => reveal(page), { intervals: [50] }).toBeGreaterThan(0.2);
    expect(await opacity(page, '.chai-pouch--heritage')).toBe(1);
    // Then it settles: the red pack where the yellow one stood, the later plates in, the words of the blend.
    await expect(hero(page)).not.toHaveAttribute('data-switching', /.*/, { timeout: 8000 });
    await expect(page.getByTestId('chai-blend-name')).toHaveText('The Lovely Blend');
    await expect(hero(page).getByText(LOVELY)).toBeVisible();
    expect(await reveal(page)).toBe(1);
    await expect.poll(() => opacity(page, '.chai-pouch--heritage')).toBe(0);
    await expect.poll(() => opacity(page, '.chai-layer--far > .chai-plate--dusk')).toBe(1);
    expect(await still()).toBe(before);
    // Both packs stand in the same box.
    const [lovelyBox, heritageBox] = await page.evaluate(() =>
      ['lovely', 'heritage'].map((id) => {
        const r = document.querySelector(`.chai-pouch--${id}`)!.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10);
      }),
    );
    expect(lovelyBox).toEqual(heritageBox);
    await expect(page.getByTestId('chai-shop-name')).toHaveText('The Lovely Blend');
    await expect(page.locator('.chai-shop__view')).toHaveAttribute(
      'aria-label',
      'The Chai Mama The Lovely Blend pouch',
    );
    // No navigation, no reload.
    await expect(page).toHaveURL(/:\d+\/$/);
    expect(await page.evaluate(() => (window as unknown as { __stay?: boolean }).__stay)).toBe(true);

    // And back to the earlier light, by keyboard this time.
    await radio(page, 'The Lovely Blend').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(radio(page, 'Heritage Blend')).toHaveAttribute('aria-checked', 'true');
    await expect(radio(page, 'Heritage Blend')).toBeFocused();
    await expect(hero(page)).toHaveAttribute('data-time', 'day');
    await expect(hero(page)).not.toHaveAttribute('data-switching', /.*/, { timeout: 8000 });
    await expect(page.getByTestId('chai-blend-name')).toHaveText('Heritage Blend');
    await expect(hero(page).getByText(HERITAGE)).toBeVisible();
    expect(await reveal(page)).toBe(0);
    await expect.poll(() => opacity(page, '.chai-pouch--heritage')).toBe(1);
    await expect.poll(() => opacity(page, '.chai-layer--far > .chai-plate--dusk')).toBe(0);
    expect(errors).toEqual([]);
  });

  test('a change of mind mid-way turns the time of day round; quick choices always end consistent', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    // The pack's edge, every time it moves, in the page.
    await page.evaluate(() => {
      const w = window as unknown as { __rev: [number, number][] };
      w.__rev = [];
      const el = document.querySelector<HTMLElement>('.chai-layer--pouch')!;
      let turned = false;
      // Each time the page moves it, with the time (the layer's style also changes as the camera sways).
      new MutationObserver(() => {
        const v = Number(el.style.getPropertyValue('--reveal'));
        if (v !== w.__rev.at(-1)?.[1]) w.__rev.push([performance.now(), v]);
        // A change of mind as soon as the red pack is showing: the arrow key on the focused switch, sent from
        // the page itself so a slow test machine cannot let the move finish first.
        if (!turned && v > 0.15) {
          turned = true;
          document.activeElement?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
          );
        }
      }).observe(el, { attributes: true, attributeFilter: ['style'] });
    });
    // The switch is focused by the click, so the arrow key goes to it (a pointer would wait for the pills,
    // which shift as the blend's words change).
    await radio(page, 'The Lovely Blend').click();
    // The switch and the words follow the last choice; the pack turns back from where it was, with no jump.
    await expect(radio(page, 'Heritage Blend')).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => reveal(page), { timeout: 8000 }).toBe(0);
    await expect(hero(page)).not.toHaveAttribute('data-switching', /.*/, { timeout: 8000 });
    await expect(page.getByTestId('chai-blend-name')).toHaveText('Heritage Blend');
    const rev = await page.evaluate(() => (window as unknown as { __rev: [number, number][] }).__rev);
    const peak = Math.max(...rev.map(([, v]) => v));
    expect(peak).toBeGreaterThan(0.15);
    expect(peak).toBeLessThan(1);
    // Continuous in time: never faster than the move itself goes (a slow frame in the test browser is a
    // longer step, not a jump).
    for (let i = 1; i < rev.length; i++) {
      const [t0, v0] = rev[i - 1]!;
      const [t1, v1] = rev[i]!;
      expect(Math.abs(v1 - v0)).toBeLessThanOrEqual(((t1 - t0) / 1000) * 1.1 + 0.03);
    }
    // A burst of choices: wherever it ends, the switch, the words, the pack and the light agree.
    for (const name of [
      'The Lovely Blend',
      'Heritage Blend',
      'The Lovely Blend',
      'Heritage Blend',
      'The Lovely Blend',
    ])
      await radio(page, name).click({ delay: 20 });
    await expect(hero(page)).not.toHaveAttribute('data-switching', /.*/, { timeout: 10_000 });
    await expect(radio(page, 'The Lovely Blend')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('chai-blend-name')).toHaveText('The Lovely Blend');
    expect(await reveal(page)).toBe(1);
    expect(await opacity(page, '.chai-layer--far > .chai-plate--dusk')).toBe(1);
    expect(errors).toEqual([]);
  });

  test('a pack whose picture does not load is never uncovered: the other stays on the rock', async ({
    page,
  }) => {
    // The picture itself (not the module that names it, in development).
    await page.route(/pouch-lovely-[^/?]*\.webp$/, (r) => r.abort());
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await radio(page, 'The Lovely Blend').click();
    await expect(hero(page)).not.toHaveAttribute('data-switching', /.*/, { timeout: 8000 });
    // The words and the light follow the choice; the yellow pack stays, whole, rather than an empty rock.
    await expect(page.getByTestId('chai-blend-name')).toHaveText('The Lovely Blend');
    await expect(hero(page)).not.toHaveAttribute('data-packs', /lovely/);
    expect(await opacity(page, '.chai-pouch--heritage')).toBe(1);
    expect(await page.locator('.chai-pouch--lovely').evaluate((el) => getComputedStyle(el).visibility)).toBe(
      'hidden',
    );
  });

  test('with a mouse the far country is a touch soft, and the pointer shows it sharp', async ({ page }) => {
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await expect(hero(page)).toHaveAttribute('data-clarity', 'true');
    // The base is the air's softened plate; the sharp one waits behind the window, closed.
    await expect(page.locator('.chai-layer--far > img[data-first]')).toHaveAttribute('src', /far-soft/);
    expect(await opacity(page, '.chai-layer--far .chai-clear')).toBe(0);
    await page.mouse.move(300, 260, { steps: 5 });
    await expect.poll(() => opacity(page, '.chai-layer--far .chai-clear')).toBeGreaterThan(0.8);
    // The window is centred on the pointer, and the sharp picture in it lies exactly over the soft one.
    const at = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('.chai-layer--far .chai-clear')!;
      const r = el.getBoundingClientRect();
      const pic = el.firstElementChild!.getBoundingClientRect();
      const layer = el.parentElement!.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        dx: pic.left - layer.left,
        dy: pic.top - layer.top,
      };
    });
    expect(Math.abs(at.x - 300)).toBeLessThan(12);
    expect(Math.abs(at.y - 260)).toBeLessThan(12);
    expect(Math.abs(at.dx)).toBeLessThan(1);
    expect(Math.abs(at.dy)).toBeLessThan(1);
    // The pack, the rock and the leaves are never softened.
    await expect(
      page.locator(':is(.chai-layer--pouch, .chai-layer--ledge, .chai-layer--leaves) .chai-clear'),
    ).toHaveCount(0);
  });

  test('the teas below the hero: Heritage first, then The Lovely Blend — what each is, what is in it, Buy now', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    const teas = page.getByTestId('chai-teas');
    await teas.scrollIntoViewIfNeeded();
    await expect(teas.getByRole('heading', { level: 2, name: 'Our blends' })).toBeVisible();
    const cards = teas.getByRole('article');
    await expect(cards).toHaveCount(2);
    // The owner's order, words and price.
    const heritage = page.getByTestId('chai-tea-heritage');
    const lovely = page.getByTestId('chai-tea-lovely');
    await expect(cards.first()).toHaveAttribute('data-blend', 'heritage');
    await expect(heritage.getByRole('heading', { level: 3 })).toHaveText('Heritage Blend');
    await expect(heritage.locator('.chai-tea__tag')).toHaveText(/Flagship.*Flavoured Blend/);
    await expect(heritage.getByText(/Our signature family recipe/)).toBeVisible();
    await expect(heritage.getByRole('list', { name: "What's inside" }).getByRole('listitem')).toHaveText([
      'Ceylon Black Tea',
      'Cornflower',
      'Rose Petals',
      'Crushed Cardamom',
      'Earl Grey',
    ]);
    await expect(lovely.locator('.chai-tea__tag')).toHaveText('Unflavoured Blend');
    await expect(lovely.getByRole('listitem')).toHaveText(['Ceylon Black Tea']);
    await expect(heritage.getByTestId('chai-buy-heritage')).toHaveText(/Buy now — 3,000 IQD/);
    // Each card rises in, its ingredients after it.
    await expect(heritage).toHaveAttribute('data-rise', 'in');
    await lovely.scrollIntoViewIfNeeded();
    await expect(lovely).toHaveAttribute('data-rise', 'in');
    // Buy now: The Lovely Blend chosen, in the shop.
    await lovely.getByTestId('chai-buy-lovely').click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(shop(page).getByTestId('chai-shop-name')).toHaveText('The Lovely Blend');
    await expect(shop(page).getByRole('radio', { name: 'The Lovely Blend' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(hero(page)).toHaveAttribute('data-time', 'dusk');
    expect(errors).toEqual([]);
  });

  test('the homepage scrolls straight on into Our Story — the brand, its name and how it is made — then Connect', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await expect(page.locator('.mf, .mf-curtain')).toHaveCount(0);
    const about = page.locator('#chai-about');
    // Scrolling on past the teas, nothing to press (CM-021): Our Story comes up under them, and as its ink
    // reaches the header the page is Our Story — its address, its link lit — with no new history entry.
    const entries = await page.evaluate(() => history.length);
    await page.mouse.move(700, 400);
    for (let i = 0; i < 40 && !/\/about$/.test(page.url()); i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(120);
    }
    await expect(page).toHaveURL(/\/about$/);
    await expect(site(page)).toHaveAttribute('data-page', 'about');
    await expect(
      page.getByRole('navigation', { name: 'Chai Mama' }).getByRole('link', { name: 'About' }),
    ).toHaveAttribute('aria-current', 'true');
    expect(await page.evaluate(() => history.length)).toBe(entries);
    await expect(about.getByRole('heading', { level: 2, name: 'Our Story' })).toBeVisible();
    await expect(about.getByText('A journey of love, heritage, and the perfect cup of tea.')).toBeVisible();
    await expect(about.getByText(/The name “Mama” means “uncle” in Kurdish/)).toBeVisible();
    await expect(about.getByText(/perfected over seven years by a mother and father/)).toBeVisible();
    const steps = about.getByRole('listitem');
    await expect(steps).toHaveCount(3);
    for (const [i, title] of ['Selected', 'Controlled', 'Standardised'].entries()) {
      await steps.nth(i).scrollIntoViewIfNeeded();
      await expect(steps.nth(i).getByRole('heading', { level: 4, name: title })).toBeVisible();
    }
    await expect(about.getByText('No variation. No guesswork.')).toBeVisible();
    // On the ink the header is light.
    await expect(site(page)).toHaveAttribute('data-end', 'true');
    // Connect and the footer; back to the top from there.
    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });
    const footer = page.getByRole('contentinfo', { name: 'Chai Mama' });
    await expect(page.locator('#chai-connect').getByRole('button', { name: 'کوردی' })).toBeVisible();
    await footer.getByRole('button', { name: 'Back to the top' }).click();
    await expect.poll(() => scrollTop(page)).toBeLessThan(5);
    // Back at the top it is the homepage again.
    await expect(page).toHaveURL(/:\d+\/$/);
    await expect(site(page)).toHaveAttribute('data-page', 'home');
    expect(errors).toEqual([]);
  });

  test('Our Story in Kurdish, right to left', async ({ page }) => {
    await page.goto('/about?lang=ckb');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    const about = page.locator('#chai-about');
    await expect(about.getByRole('heading', { level: 2, name: 'چیرۆکی ئێمە' })).toBeVisible();
    await expect(about.getByText('بێ جیاوازی. بێ مەزەندە.')).toBeAttached();
    await expect(about.locator('.chai-step__n').first()).toHaveText('١');
  });

  test('the nav: Home, About, Shop and Connect take you there; Back goes back', async ({ page }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await page.evaluate(() => ((window as unknown as { __stay: boolean }).__stay = true));
    const nav = page.getByRole('navigation', { name: 'Chai Mama' });
    const storyTop = () =>
      page.locator('#chai-end').evaluate((el) => Math.round(el.getBoundingClientRect().top));
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'true');
    // About: a glide down the homepage to Our Story.
    await nav.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'true');
    await expect.poll(storyTop).toBeLessThan(80);
    // The shop: its own page, from its top.
    await nav.getByRole('link', { name: 'Shop' }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(nav.getByRole('link', { name: 'Shop' })).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('chai-shop')).toBeVisible();
    await expect.poll(() => scrollTop(page)).toBeLessThan(5);
    // Connect is Our Story's last part: scrolled to it.
    await nav.getByRole('link', { name: 'Connect' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect
      .poll(() => page.locator('#chai-connect').evaluate((el) => Math.round(el.getBoundingClientRect().top)))
      .toBeLessThan(120);
    // Connect has no contact details to show yet, and says so (none are made up).
    await expect(
      page.getByText("Chai Mama's contact details and social links aren't on the site yet."),
    ).toBeVisible();
    // Home: back up to the top.
    await nav.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/:\d+\/$/);
    await expect.poll(() => scrollTop(page)).toBeLessThan(5);
    await expect(hero(page)).toBeVisible();
    // The browser's Back: the shop, then Our Story where it was left (the homepage and Our Story are one page).
    await page.goBack();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'in');
    await page.goBack();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'off');
    await expect.poll(storyTop).toBeLessThan(80);
    // All of it in the site: no reload.
    expect(await page.evaluate(() => (window as unknown as { __stay?: boolean }).__stay)).toBe(true);
    // The language list closes on Escape without leaving the page (Escape is otherwise "back").
    await page.getByTestId('chai-lang').click();
    await expect(page.locator('#chai-lang-list')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#chai-lang-list')).toBeHidden();
    await expect(page.getByTestId('chai-lang')).toBeFocused();
    await expect(page).toHaveURL(/\/about$/);
    expect(errors).toEqual([]);
  });

  test('a link opens the shop or Our Story directly', async ({ page }) => {
    const errors = consoleErrors(page);
    await page.goto('/shop');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await expect(site(page)).toHaveAttribute('data-page', 'shop');
    await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'in');
    await expect(shop(page).getByRole('heading', { level: 2, name: 'Heritage Blend' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: SLOGAN })).toBeHidden();
    await page.goto('/about');
    await expect(site(page)).toHaveAttribute('data-page', 'about', { timeout: LONG });
    await expect(
      page.locator('#chai-about').getByRole('heading', { level: 2, name: 'Our Story' }),
    ).toBeVisible();
    // The homepage, already scrolled down to Our Story (the teas are just above).
    expect(
      Math.abs(await page.locator('#chai-end').evaluate((el) => el.getBoundingClientRect().top)),
    ).toBeLessThan(2);
    await expect(page.getByTestId('chai-teas')).toBeAttached();
    expect(errors).toEqual([]);
  });

  test('@phone the menu: one glass button that splits into the pages and the language, and closes back', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    const toggle = page.getByRole('button', { name: 'Menu' });
    const dock = page.getByTestId('chai-dock');
    const about = dock.getByRole('link', { name: 'About' });
    // Closed: one button, the pages tucked under it (not reachable).
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(dock).toHaveAttribute('inert', '');
    expect(await opacity(page, '#chai-dock .chai-dock__item:first-child')).toBe(0);
    // Open: the four pages and the language in a row, the button now closes it; the logo steps aside.
    await toggle.tap();
    await expect(page.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-expanded', 'true');
    await expect(dock).not.toHaveAttribute('inert', /.*/);
    await expect.poll(() => opacity(page, '.chai-brand')).toBe(0);
    for (const name of ['Home', 'About', 'Shop', 'Connect'])
      await expect(dock.getByRole('link', { name })).toBeVisible();
    await expect(dock.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'true');
    // The row stays on the screen, its buttons thumb-sized and apart.
    const vw = page.viewportSize()!.width;
    await expect
      .poll(() => about.evaluate((el) => Math.round(el.getBoundingClientRect().left)))
      .toBeGreaterThan(0);
    // Measured once the drops have grown to their size.
    await expect
      .poll(() =>
        dock
          .locator('.chai-dock__item')
          .evaluateAll((els) => Math.min(...els.map((e) => e.getBoundingClientRect().height))),
      )
      .toBeGreaterThanOrEqual(44);
    for (const item of await dock.locator('.chai-dock__item').all()) {
      const box = (await item.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(vw);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    // A page: it goes there, and the row flows back into the button.
    await about.tap();
    await expect(page).toHaveURL(/\/about$/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#chai-about').getByRole('heading', { level: 2 })).toBeVisible();
    // The language is a drop of its own.
    await toggle.tap();
    await page.getByTestId('chai-dock-lang').tap();
    await expect(site(page)).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('chai-menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Escape, or a tap elsewhere, closes it.
    await page.getByRole('button', { name: 'پێڕست' }).tap();
    await expect(page.getByRole('button', { name: 'داخستن' })).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'پێڕست' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('@phone the hero as on the phone: the slogan, the pack, a solid switch and Shop now', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    // Only the slogan and the blend's name over the sky.
    await expect(hero(page).locator('.chai-eyebrow--hero')).toBeHidden();
    await expect(hero(page).locator('.chai-lede')).toBeHidden();
    // Nothing lies over the switch or the button (the section below starts under the hero).
    const buy = page.getByTestId('chai-buy');
    await expect(buy).toBeVisible();
    const buyBottom = (await buy.boundingBox())!.y + (await buy.boundingBox())!.height;
    const otherTop = (await page.getByTestId('chai-teas').boundingBox())!.y;
    expect(otherTop).toBeGreaterThanOrEqual(buyBottom);
    expect(await buy.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(36, 26, 19)');
    // Shop now: to the shop, with the camera's move.
    await buy.tap();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'in');
    await expect(shop(page).getByRole('heading', { level: 2, name: 'Heritage Blend' })).toBeVisible();
  });

  test('a link can open on The Lovely Blend, later in the day', async ({ page }) => {
    await page.goto('/?blend=lovely');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await expect(hero(page)).toHaveAttribute('data-time', 'dusk');
    await expect(radio(page, 'The Lovely Blend')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('chai-blend-name')).toHaveText('The Lovely Blend');
  });
});

test.describe('Chai Mama — the shop (CM-010)', () => {
  test('to the shop: the picture stays, the camera moves in, the light comes across and the shop rises; home undoes it', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    const pack = () => page.locator('.chai-layer--pouch').boundingBox();
    const at0 = (await pack())!;
    expect(await opacity(page, '.chai-wash')).toBe(0);
    await expect(page.getByRole('heading', { level: 1, name: SLOGAN })).toBeVisible();
    await toShop(page);
    await expect.poll(() => opacity(page, '.chai-wash')).toBe(1);
    await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'in');
    // The hero's words are gone (and out of the way of Tab), the shop is in the blend's light.
    await expect(page.getByRole('heading', { level: 1, name: SLOGAN })).toBeHidden();
    await expect(shop(page).getByRole('heading', { level: 2, name: 'Heritage Blend' })).toBeVisible();
    expect(await opacity(page, '.chai-wash')).toBeGreaterThan(0.95);
    // The same picture, pinned: the pack is still on screen, a little larger, and the shop clear of it.
    const at1 = (await pack())!;
    expect(at1.y + at1.height).toBeGreaterThan(0);
    expect(at1.width).toBeGreaterThan(at0.width * 1.04);
    const panel = (await page.locator('.chai-shop__panel').boundingBox())!;
    expect(panel.x).toBeGreaterThan(at1.x + at1.width - 4);
    // Home again: all of it undone.
    await navTo(page, '');
    await expect(page).toHaveURL(/:\d+\/$/);
    await expect.poll(() => opacity(page, '.chai-wash')).toBe(0);
    await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'off');
    await expect(page.getByRole('heading', { level: 1, name: SLOGAN })).toBeVisible();
    const back = (await pack())!;
    expect(Math.abs(back.width - at0.width)).toBeLessThan(1);
    expect(errors).toEqual([]);
  });

  test('a blend chosen in the shop turns the scene and the shop with it; the order adds up', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await toShop(page);
    const s = shop(page);
    const order = s.getByTestId('chai-order');
    const bg = () => order.evaluate((el) => getComputedStyle(el).backgroundColor);
    const gold = await bg();
    await s.getByRole('radio', { name: 'The Lovely Blend' }).click();
    // The choice shows at once, here and in the hero; the words, the pack and the colours follow it.
    await expect(s.getByRole('radio', { name: 'The Lovely Blend' })).toHaveAttribute('aria-checked', 'true');
    await expect(hero(page)).toHaveAttribute('data-blend', 'lovely');
    await expect(s.getByTestId('chai-shop-name')).toHaveText('The Lovely Blend');
    // The other pack is there at once (no fade): only the scene behind turns slowly (CM-019).
    await expect(s.locator('.chai-shop__pack-img[data-on]')).toHaveAttribute('src', /lovely/);
    await expect(s.getByRole('img', { name: 'The Chai Mama The Lovely Blend pouch' })).toBeAttached();
    await expect.poll(() => reveal(page), { timeout: 8000 }).toBe(1);
    await expect.poll(() => cssVar(page, '.chai-shop', '--theme'), { timeout: 8000 }).toBe(1);
    const red = await bg();
    expect(red).not.toBe(gold);
    // The two ways to buy, at the owner's prices.
    const unit = s.getByTestId('chai-unit');
    const total = s.getByTestId('chai-subtotal');
    await expect(unit).toHaveText('3,000 IQD');
    await expect(total).toHaveText('3,000 IQD');
    await s.getByRole('radio', { name: /Master carton/ }).click();
    await expect(s.getByRole('radio', { name: /Master carton/ })).toHaveAttribute('aria-checked', 'true');
    await expect(unit).toHaveText('115,500 IQD');
    await s.getByRole('button', { name: 'One more' }).click();
    await s.getByRole('button', { name: 'One more' }).click();
    await expect(s.getByTestId('chai-qty')).toHaveText('3');
    await expect(total).toHaveText('346,500 IQD');
    // By keyboard back to a single pouch; never fewer than one.
    await s.getByRole('radio', { name: /Master carton/ }).press('ArrowLeft');
    await expect(s.getByRole('radio', { name: /Single pouch/ })).toBeFocused();
    await expect(total).toHaveText('9,000 IQD');
    for (let i = 0; i < 2; i++) await s.getByRole('button', { name: 'One less' }).click();
    await expect(s.getByTestId('chai-qty')).toHaveText('1');
    await expect(s.getByRole('button', { name: 'One less' })).toHaveAttribute('aria-disabled', 'true');
    await s.getByRole('button', { name: 'One less' }).dispatchEvent('click');
    await expect(s.getByTestId('chai-qty')).toHaveText('1');
    await expect(total).toHaveText('3,000 IQD');
    // The blend changes back: the choice of order stays.
    await s.getByRole('radio', { name: 'Heritage Blend' }).click();
    await expect(s.getByTestId('chai-shop-name')).toHaveText('Heritage Blend');
    await expect(unit).toHaveText('3,000 IQD');
    await expect(order).toHaveText(/Order now/);
    // No promises the owner has not made.
    await expect(s.getByText(/free shipping|secure|guarantee|most popular|save \d/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('Order now: the checkout asks who it is for and where it goes; the map pins the address (CM-019)', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await stubMap(page);
    await page.goto('/shop');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'in');
    await shop(page).getByRole('button', { name: 'One more' }).click();
    await shop(page).getByTestId('chai-order').click();
    const co = page.getByTestId('chai-checkout');
    await expect(co.getByRole('dialog')).toBeVisible();
    await expect(co.getByTestId('chai-checkout-total')).toHaveText('6,000 IQD');
    // The page behind holds still: no scrolling, the scene paused.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
    await expect(site(page)).toHaveAttribute('data-checkout', '');
    // The name is asked first; nothing goes on without a name and a real number.
    await expect(co.getByTestId('chai-field-name')).toBeFocused();
    await co.getByTestId('chai-checkout-go').click();
    await expect(co.getByRole('alert')).toHaveText(/name/i);
    await co.getByTestId('chai-field-name').fill('Aras Mohammed');
    await co.getByTestId('chai-field-phone').fill('123');
    await co.getByTestId('chai-checkout-go').click();
    await expect(co.getByRole('alert')).toHaveText(/number/i);
    // Iraq's 0770… is read as +964 770…; the email is optional but checked when given.
    await co.getByTestId('chai-field-phone').fill('0770 123 4567');
    await co.getByTestId('chai-field-email').fill('aras@');
    await co.getByTestId('chai-checkout-go').click();
    await expect(co.getByRole('alert')).toHaveText(/email/i);
    // Left blank (or only spaces): no error, nothing asked, and the order goes on without one.
    await co.getByTestId('chai-field-email').fill('   ');
    await co.getByTestId('chai-checkout-go').click();
    await expect(co.getByRole('alert')).toHaveCount(0);
    await expect(co.getByRole('tab', { name: /Delivery/ })).toHaveAttribute('aria-selected', 'true');
    // Where it goes: needed; pinned on the map, whose address is looked up where the pin rests.
    await co.getByTestId('chai-checkout-go').click();
    await expect(co.getByRole('alert')).toHaveText(/where/i);
    await co.getByTestId('chai-field-location').click();
    const map = page.getByTestId('chai-map');
    await expect(map).toBeVisible();
    await expect(map.locator('.chai-map__where')).toHaveText('100 Meter Street, Ankawa, Erbil');
    // Searching moves the map to the place chosen.
    await map.getByTestId('chai-map-search').fill('Ankawa');
    await map.getByRole('option').first().click();
    await map.getByTestId('chai-map-use').click();
    await expect(map).toBeHidden();
    await expect(co.getByTestId('chai-field-location')).toContainText('100 Meter Street, Ankawa, Erbil');
    // Placing it: without an order address built in, it says plainly that nothing was sent.
    await co.getByTestId('chai-checkout-go').click();
    const done = co.getByTestId('chai-checkout-done');
    await expect(done).toBeVisible();
    await expect(done).toContainText('Your order is ready');
    await expect(done).toContainText('+964 770 123 4567');
    // Mama is the check mark: he winks (and again when tapped), and the sound of the order going in played.
    const win = done.getByTestId('chai-win');
    await expect(win).toHaveAttribute('data-chime', '');
    await expect(win.locator('.chai-win__lid')).toHaveCSS('animation-name', 'chai-wink');
    await win.click();
    await expect(win).toHaveAttribute('data-winks', '1');
    await done.getByRole('button', { name: 'Back to the shop' }).click();
    await expect(co).toBeHidden();
    await expect(site(page)).not.toHaveAttribute('data-checkout', '');
    const results = await new AxeBuilder({ page }).include('[data-testid="chai-site"]').analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the checkout without a map: the address is typed instead; Escape closes it', async ({ page }) => {
    // No map here (offline, blocked): it says so and asks for the address in words.
    await page.route('https://tile.openstreetmap.org/**', (r) => r.abort());
    await page.route('https://nominatim.openstreetmap.org/**', (r) => r.abort());
    await page.goto('/shop');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await shop(page).getByTestId('chai-order').click();
    const co = page.getByTestId('chai-checkout');
    await co.getByTestId('chai-field-name').fill('Sara');
    await co.getByTestId('chai-field-dial').selectOption('DE');
    await co.getByTestId('chai-field-phone').fill('+49 1512 3456789');
    await co.getByTestId('chai-checkout-go').click();
    await co.getByTestId('chai-field-location').click();
    await page.getByRole('button', { name: 'Type the address instead' }).click({ timeout: 20_000 });
    await co.getByTestId('chai-field-city').fill('Berlin');
    await co.getByTestId('chai-field-address').fill('Torstraße 1');
    await co.getByTestId('chai-checkout-go').click();
    await expect(co.getByTestId('chai-checkout-done')).toContainText('+49 1512 3456 789');
    await expect(co.getByTestId('chai-checkout-done')).toContainText('Torstraße 1, Berlin');
    await page.keyboard.press('Escape');
    await expect(co).toBeHidden();
  });

  test('share your experience: which tea, a rating slid along a glass of tea, a photo, and Mama thanks you (CM-023)', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    const share = page.getByTestId('chai-share');
    // Between the teas and Our Story.
    const order = await page.evaluate(() =>
      ['chai-teas', 'chai-share', 'chai-end'].map(
        (id) => document.getElementById(id)!.getBoundingClientRect().top,
      ),
    );
    expect(order[0]).toBeLessThan(order[1]!);
    expect(order[1]).toBeLessThan(order[2]!);
    await share.scrollIntoViewIfNeeded();
    await expect(share.getByRole('heading', { level: 2, name: 'How was your tea?' })).toBeVisible();
    // Name, which tea and a rating are needed; the email and the place are not.
    await share.getByTestId('chai-share-send').click();
    await expect(share.getByRole('alert')).toHaveText('Write your name.');
    await share.getByTestId('chai-share-name').fill('Rahand Mhamad');
    await share.getByTestId('chai-share-send').click();
    await expect(share.getByRole('alert')).toHaveText('Choose which you tried.');
    await share.getByTestId('chai-share-tried-lovely').click();
    await expect(share.getByTestId('chai-share-tried-lovely')).toHaveAttribute('aria-checked', 'true');
    await share.getByTestId('chai-share-send').click();
    await expect(share.getByRole('alert')).toHaveText('Slide to give your rating.');
    // The rating: unrated at first; by the keyboard a step at a time; slid along the track by the pointer.
    const rating = share.getByTestId('chai-share-rating');
    await expect(rating).toHaveAttribute('aria-valuetext', 'Slide to rate');
    await rating.focus();
    await page.keyboard.press('ArrowRight');
    await expect(rating).toHaveAttribute('aria-valuetext', '1 / 10 — Not for me');
    await page.keyboard.press('ArrowRight');
    await expect(rating).toHaveAttribute('aria-valuetext', '2 / 10 — Not for me');
    const track = (await share.locator('.chai-rate__track').boundingBox())!;
    await page.mouse.move(track.x + 30, track.y + track.height / 2);
    await page.mouse.down();
    // The sixth step: its notch (the thumb is 48 px wide).
    const sixth = track.x + 24 + (5 / 9) * (track.width - 48);
    await page.mouse.move(sixth, track.y + track.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(rating).toHaveValue('6');
    await expect(share.locator('.chai-rate__word')).toHaveText('Good');
    // At ten: the perfect cup.
    await page.mouse.move(sixth, track.y + track.height / 2);
    await page.mouse.down();
    await page.mouse.move(track.x + track.width - 2, track.y + track.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect(rating).toHaveValue('10');
    await expect(share.locator('.chai-rate')).toHaveAttribute('data-top', 'true');
    await expect(share.locator('.chai-rate__word')).toHaveText('The perfect cup');
    // A photo: shown small, and can be taken away again.
    await share.getByTestId('chai-share-photo').setInputFiles({
      name: 'cup.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN4+eQaAAVdAqTP7UgSAAAAAElFTkSuQmCC',
        'base64',
      ),
    });
    await expect(share.locator('.chai-share__thumb img')).toBeVisible();
    await share.getByRole('button', { name: 'Remove photo' }).click();
    await expect(share.locator('.chai-share__thumb')).toHaveCount(0);
    await share.getByTestId('chai-share-thoughts').fill('Lovely after dinner.');
    await share.getByTestId('chai-share-send').click();
    // Sent (or, without a feedback address yet, said plainly that it was not): Mama winks his thanks.
    const done = share.getByTestId('chai-share-done');
    await expect(done).toContainText('Thank you, Rahand!');
    await expect(done).toContainText('hasn’t been sent');
    await expect(done.getByTestId('chai-win')).toBeVisible();
    await done.getByRole('button', { name: 'Share another' }).click();
    await expect(share.getByTestId('chai-share-name')).toHaveValue('');
    expect(errors).toEqual([]);
  });

  test('nothing falls on any page any more (CM-020): no canvas, no worker', async ({ page }) => {
    const workers: string[] = [];
    page.on('worker', (w) => workers.push(w.url()));
    for (const path of ['/', '/shop', '/about']) {
      await page.goto(path);
      await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
      await expect(page.locator('canvas')).toHaveCount(0);
    }
    expect(workers).toEqual([]);
  });

  test('in Kurdish the shop reads right to left, in Kurdish digits', async ({ page }) => {
    await page.goto('/?lang=ckb');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await toShop(page);
    await expect(shop(page).getByTestId('chai-subtotal')).toHaveText('٣٬٠٠٠ دینار');
    await shop(page)
      .getByRole('radio', { name: /کارتۆنی تەواو/ })
      .click();
    await expect(shop(page).getByTestId('chai-unit')).toHaveText('١١٥٬٥٠٠ دینار');
    // The panel stays on the picture's open side (the picture is never mirrored).
    const panel = (await page.locator('.chai-shop__panel').boundingBox())!;
    expect(panel.x).toBeGreaterThan(page.viewportSize()!.width * 0.4);
  });

  test('reduced motion: the shop comes in without travel', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await toShop(page);
    expect(await page.locator('.chai-shop__info').evaluate((el) => getComputedStyle(el).translate)).toMatch(
      /^(none|0px)$/,
    );
  });

  test('@phone the shop on a phone: the pack in a band, everything on one screen, a carton fans out', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await page.getByTestId('chai-buy').tap();
    // The sheet is there within the first part of the move (nothing to wait for).
    await expect.poll(() => opacity(page, '.chai-shop__panel'), { timeout: 2000 }).toBe(1);
    await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'in');
    const vw = page.viewportSize()!.width;
    const vh = page.viewportSize()!.height;
    // The shop's own pack stands in the band above the sheet; the picture's steps aside for it.
    const pack = page.locator('.chai-shop__pack');
    await expect.poll(() => pack.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    const packBox = (await pack.boundingBox())!;
    const panel = (await page.locator('.chai-shop__panel').boundingBox())!;
    expect(packBox.height).toBeGreaterThan(100);
    expect(packBox.y + packBox.height).toBeLessThanOrEqual(panel.y + 2);
    expect(await opacity(page, '.chai-layer--pouch')).toBe(0);
    // All of it on one screen: nothing to scroll, nothing wider than the screen, the button in reach.
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(vw);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(
      true,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const order = shop(page).getByTestId('chai-order');
    const orderBox = (await order.boundingBox())!;
    expect(orderBox.y + orderBox.height).toBeLessThanOrEqual(vh);
    expect(orderBox.height).toBeGreaterThanOrEqual(44);
    // A carton: the highlight goes to it, the prices roll to it, two more pouches fan out behind the pack.
    await expect(shop(page).locator('.chai-ghost').first()).toHaveCSS('opacity', '0');
    await shop(page)
      .getByRole('radio', { name: /Master carton/ })
      .tap();
    await expect(shop(page)).toHaveAttribute('data-option', 'carton');
    await expect(shop(page).getByTestId('chai-unit')).toHaveText('115,500 IQD');
    await expect(shop(page).getByTestId('chai-subtotal')).toHaveText('115,500 IQD');
    await expect(shop(page).locator('.chai-ghost').first()).toHaveCSS('opacity', '1');
    await shop(page).getByRole('button', { name: 'One more' }).tap();
    await expect(shop(page).getByTestId('chai-subtotal')).toHaveText('231,000 IQD');
    // The details unfold, and fold away again.
    const details = shop(page).getByTestId('chai-details');
    await details.tap();
    await expect(details).toHaveAttribute('aria-expanded', 'true');
    await expect(shop(page).getByRole('list', { name: "What's inside" }).getByRole('listitem')).toHaveCount(
      5,
    );
    await details.tap();
    await expect(details).toHaveAttribute('aria-expanded', 'false');
    // Order now: the checkout grows out of the button into the whole screen.
    await shop(page).getByTestId('chai-order').tap();
    const sheet = page.getByTestId('chai-checkout').getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect
      .poll(async () => {
        const b = (await sheet.boundingBox())!;
        return [Math.round(b.x), Math.round(b.width), Math.round(b.y + b.height)];
      })
      .toEqual([0, vw, vh]);
    // The whole screen (CM-022): with the keyboard up (what can be seen shrinks), the button stays in sight.
    await page.setViewportSize({ width: vw, height: Math.round(vh * 0.55) });
    const go = page.getByTestId('chai-checkout-go');
    await expect
      .poll(async () => {
        const g = (await go.boundingBox())!;
        return g.y + g.height <= Math.round(vh * 0.55);
      })
      .toBe(true);
    await page.setViewportSize({ width: vw, height: vh });
    // Closing, it goes back into the button.
    await page.getByTestId('chai-checkout').getByRole('button', { name: 'Close' }).first().tap();
    await expect(page.getByTestId('chai-checkout')).toBeHidden();
  });
});
