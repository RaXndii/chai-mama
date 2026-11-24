import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The Chai Mama website: it opens in a cloud that clears onto the owner's picture; two blends in one place, one
 * shot (Heritage Blend in the earlier light, The Lovely Blend later in the day); three pages (the homepage, the
 * shop, Our Story) with real addresses. Runs in software WebGL-free Chromium: the timelines follow the wall
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
/** How many pieces of tea a canvas last drew, and how many frames the tea has moved (CM-012: the tea runs in a
 *  worker, which reports them on the canvases). */
const pieces = (page: Page, selector: string) =>
  page.locator(selector).evaluate((c) => Number((c as HTMLElement).dataset.pieces ?? 0));
const rainFrames = (page: Page) =>
  page.locator('.chai-rain--front').evaluate((c) => Number((c as HTMLElement).dataset.frames ?? 0));
const BACK = '.chai-stage .chai-rain';
const FRONT = '.chai-rain--front';
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
  test('it opens in a cloud that clears onto the picture, and has no detectable WCAG A/AA violations', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    // In the cloud, then the camera glides in as the mist clears.
    await expect(site(page)).toHaveAttribute('data-stage', /cloud|arriving/);
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    expect(await opacity(page, '.chai-veil')).toBe(0);
    await expect(page.getByRole('heading', { level: 1, name: SLOGAN })).toBeVisible();
    // The shop's own page: the real pouch on its rock and the pack's own blend.
    await toShop(page);
    await expect(shop(page).getByRole('heading', { level: 2, name: 'Heritage Blend' })).toBeVisible();
    await expect(shop(page).getByRole('img', { name: 'The Chai Mama Heritage Blend pouch' })).toBeVisible();
    await expect(shop(page).getByText('Rose petals', { exact: true })).toBeVisible();
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
    // (The falling tea is a 2D canvas.)
    await expect(page.locator('canvas:not(.chai-rain)')).toHaveCount(0);
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
    await expect(page.getByText(LOVELY).first()).toBeVisible();
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
    await expect(page.getByText(HERITAGE)).toBeVisible();
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

  test('Our Story is its own page — the brand, its name and how it is made — then Connect, on the dark of the ink', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    // CM-007's curtain footer is gone (CM-011), and Our Story is not under the homepage (CM-014).
    await expect(page.locator('.mf, .mf-curtain')).toHaveCount(0);
    const about = page.locator('#chai-about');
    await expect(about).toBeHidden();
    // From the end of the homepage, on to it.
    await page.getByTestId('chai-teas').scrollIntoViewIfNeeded();
    await page.getByTestId('chai-teas').getByRole('link', { name: 'Our Story' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(site(page)).toHaveAttribute('data-page', 'about');
    await expect(hero(page)).toBeHidden();
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

  test('the nav: Home, About, Shop and Connect are pages of the site; Back goes back', async ({ page }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await page.evaluate(() => ((window as unknown as { __stay: boolean }).__stay = true));
    const nav = page.getByRole('navigation', { name: 'Chai Mama' });
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'true');
    for (const [name, url, id] of [
      ['About', /\/about$/, 'chai-about'],
      ['Shop', /\/shop$/, 'chai-shop'],
    ] as const) {
      await nav.getByRole('link', { name }).click();
      // Its own address, its link marked as the current one, and the page from its top.
      await expect(page).toHaveURL(url);
      await expect(nav.getByRole('link', { name })).toHaveAttribute('aria-current', 'true');
      await expect(page.getByTestId(id === 'chai-shop' ? 'chai-shop' : 'chai-site').first()).toBeVisible();
      await expect.poll(() => scrollTop(page)).toBeLessThan(5);
    }
    // Connect is Our Story's last part: that page, scrolled to it.
    await nav.getByRole('link', { name: 'Connect' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect
      .poll(() => page.locator('#chai-connect').evaluate((el) => Math.round(el.getBoundingClientRect().top)))
      .toBeLessThan(120);
    // Connect has no contact details to show yet, and says so (none are made up).
    await expect(
      page.getByText("Chai Mama's contact details and social links aren't on the site yet."),
    ).toBeVisible();
    await nav.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/:\d+\/$/);
    await expect(hero(page)).toBeVisible();
    // The browser's Back goes through the pages in turn (Home ← Connect ← Shop ← About ← Home).
    await page.goBack();
    await expect(page).toHaveURL(/\/about$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'in');
    await page.goBack();
    await expect(page).toHaveURL(/\/about$/);
    await page.goBack();
    await expect(page).toHaveURL(/:\d+\/$/);
    await expect(page.locator('.chai-journey')).toHaveAttribute('data-shop', 'off');
    // All of it in the site: no reload.
    expect(await page.evaluate(() => (window as unknown as { __stay?: boolean }).__stay)).toBe(true);
    // The language list closes on Escape without leaving the page (Escape is otherwise "back").
    await page.getByTestId('chai-lang').click();
    await expect(page.locator('#chai-lang-list')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#chai-lang-list')).toBeHidden();
    await expect(page.getByTestId('chai-lang')).toBeFocused();
    await expect(page).toHaveURL(/:\d+\/$/);
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
    // The tea falls on the hero too (CM-012), behind its words. (A slow machine gets fewer pieces: the tea
    // thins itself out when the frames are slow.)
    await expect.poll(() => pieces(page, BACK), { timeout: 10_000 }).toBeGreaterThan(10);
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
    // The tea is falling, and it moves.
    await expect.poll(() => pieces(page, BACK), { timeout: 10_000 }).toBeGreaterThan(10);
    const f0 = await rainFrames(page);
    await expect.poll(() => rainFrames(page), { timeout: 10_000 }).toBeGreaterThan(f0);
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

  test('a blend chosen in the shop turns the scene and the shop with it; the order adds up; ordering is not open', async ({
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
    await expect(s.getByText(LOVELY)).toBeVisible();
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
    // Ordering is not open: the button says so, and pressing it orders nothing (no navigation, no request).
    await expect(order).toHaveText(/Ordering opens soon/);
    const url = page.url();
    await order.dispatchEvent('click');
    await expect(s.getByRole('status').filter({ hasText: 'nothing has been ordered' })).toBeVisible();
    expect(page.url()).toBe(url);
    // No promises the owner has not made.
    await expect(s.getByText(/free shipping|secure|guarantee|most popular|save \d/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('the tea falls over every page: the sections below the hero and Our Story too (CM-012)', async ({
    page,
  }) => {
    const errors = consoleErrors(page);
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await expect.poll(() => pieces(page, BACK), { timeout: 10_000 }).toBeGreaterThan(10);
    // Below the picture the tea is on the front canvas, over the sections.
    await page.getByTestId('chai-teas').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      window.scrollBy({ top: innerHeight * 0.6, behavior: 'instant' });
    });
    await expect.poll(() => pieces(page, FRONT), { timeout: 10_000 }).toBeGreaterThan(8);
    // And over Our Story, on its page.
    await navTo(page, 'about');
    await expect(page).toHaveURL(/\/about$/);
    await expect.poll(() => pieces(page, FRONT), { timeout: 10_000 }).toBeGreaterThan(8);
    const f0 = await rainFrames(page);
    await expect.poll(() => rainFrames(page), { timeout: 10_000 }).toBeGreaterThan(f0);
    expect(errors).toEqual([]);
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

  test('reduced motion: the shop fades in, and the tea hangs still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await toShop(page);
    await expect.poll(() => pieces(page, BACK), { timeout: 10_000 }).toBeGreaterThan(40);
    // Drawn where the pieces hang: no frames go by.
    await page.waitForTimeout(600);
    expect(await rainFrames(page)).toBe(0);
    expect(await page.locator('.chai-shop__info').evaluate((el) => getComputedStyle(el).translate)).toMatch(
      /^(none|0px)$/,
    );
  });

  test('@phone the shop on a phone: the pack first, then the shop on its card, nothing wider than the screen', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-stage', 'home', { timeout: LONG });
    await toShop(page);
    const vw = page.viewportSize()!.width;
    const vh = page.viewportSize()!.height;
    const pack = (await page.locator('.chai-layer--pouch').boundingBox())!;
    const panel = (await page.locator('.chai-shop__panel').boundingBox())!;
    // The pack's label is still in view above the card.
    expect(panel.y).toBeGreaterThan(pack.y + pack.height * 0.75);
    expect(panel.y).toBeLessThan(vh);
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(vw);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // The order button can be reached and is thumb-sized.
    const order = shop(page).getByTestId('chai-order');
    await order.scrollIntoViewIfNeeded();
    expect((await order.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await shop(page).getByRole('button', { name: 'One more' }).tap();
    await expect(shop(page).getByTestId('chai-subtotal')).toHaveText('6,000 IQD');
  });
});
