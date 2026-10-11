import { test, expect } from '@playwright/test';

/**
 * Boundary smoke tests.
 *
 * The dominant failure mode for this app was NOT a crash — it was a page that
 * quietly rendered less than it should when the API was unreachable. So most of
 * these assert DEGRADED behaviour, not just the happy path.
 */

const PAGES = ['/', '/about', '/services', '/fleet', '/contact', '/careers', '/privacy'];

test.describe('every marketing page renders', () => {
  for (const path of PAGES) {
    test(`${path} loads without console errors`, async ({ page }) => {
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.goto(path);
      await expect(page.locator('header').first()).toBeVisible();
      // A missing API must not produce console noise.
      const real = errors.filter((e) => !/favicon|taxi\.glb/i.test(e));
      expect(real, `console errors on ${path}`).toEqual([]);
    });
  }
});

test.describe('the phone number is straight everywhere', () => {
  for (const path of PAGES) {
    test(`${path} shows 410-365-5556 with no parentheses`, async ({ page }) => {
      await page.goto(path);
      const links = page.locator('a[href^="tel:"]');
      const n = await links.count();
      expect(n, `${path} rendered no tel: link`).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const text = (await links.nth(i).textContent())?.trim() ?? '';
        if (!text) continue;
        expect(text, `${path} link ${i} = "${text}"`).not.toMatch(/[()]/);
      }
    });
  }
});

test.describe('fleet page', () => {
  test('shows a photo, capacity, tagline and features for every class', async ({ page }) => {
    await page.goto('/fleet');
    const cards = page.locator('div.panel');
    await expect(cards).toHaveCount(9);

    for (let i = 0; i < 9; i++) {
      const card = cards.nth(i);
      const img = card.locator('img');
      await expect(img, `card ${i} has no photo`).toHaveCount(1);
      // The image must actually decode, not 404.
      expect(await img.evaluate((n) => n.naturalWidth > 0), `card ${i} image failed to load`).toBe(true);

      const text = (await card.textContent()) ?? '';
      expect(text, `card ${i} has no capacity badge`).toMatch(/\d+[–-]\d+ passengers/);
      expect(await card.locator('li').count(), `card ${i} has no features`).toBeGreaterThan(3);
    }
  });

  test('seat counts are real (a Van seats 14, not 4)', async ({ page }) => {
    await page.goto('/fleet');
    const text = (await page.locator('div.panel').allTextContents()).join(' ');
    expect(text).toContain('10–14 passengers');
    expect(text).toContain('50–56 passengers');
  });
});

test.describe('degrades correctly when the API is unreachable', () => {
  // This is the production reality on a deploy with no VITE_API_URL: the client
  // calls /api on its own origin and gets nothing.
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', (r) => r.abort());
  });

  test('fleet still renders all 9 photos and feature lists', async ({ page }) => {
    await page.goto('/fleet');
    const cards = page.locator('div.panel');
    await expect(cards).toHaveCount(9);
    for (let i = 0; i < 9; i++) {
      await expect(cards.nth(i).locator('img')).toHaveCount(1);
      expect(await cards.nth(i).locator('li').count()).toBeGreaterThan(3);
    }
  });

  test('home still renders the featured services band', async ({ page }) => {
    await page.goto('/');
    // The band reveals on scroll, so a bare count() right after goto() sees only
    // the nav links. Assert the FEATURED set specifically — that is the actual
    // invariant, since `featured: false` on every offering empties the band.
    const featured = ['airport', 'corporate', 'wedding', 'shuttle', 'night-out'];
    for (const slug of featured) {
      // One occurrence in the nav dropdown, one in the featured band.
      await expect(
        page.locator(`a[href="/services/${slug}"]`),
        `featured service "${slug}" missing from the Home band`
      ).toHaveCount(2);
    }
  });
});

test.describe('the quick-quote widget works', () => {
  test('computes a total from the distance slider', async ({ page }) => {
    await page.goto('/');
    const total = page.locator('a:has-text("Estimated total") span').last();
    await expect(total).toHaveText('$3.00'); // base fare at 0 miles

    await page.locator('input.quote-range').fill('40');
    await expect(total).not.toHaveText('$3.00');
    await expect(total).toHaveText(/^\$\d/);
  });

  test('caps riders at the selected vehicle class', async ({ page }) => {
    await page.goto('/');
    const plus = page.locator('button[aria-label="One more rider"]');
    const vanValue = await page.locator('#qq-vehicle option', { hasText: 'Van — up to 14' })
      .first().getAttribute('value');
    await page.selectOption('#qq-vehicle', vanValue);
    for (let i = 0; i < 16; i++) await plus.click({ force: true });
    await expect(plus).toBeDisabled();

    // Switching to a 4-seat class must clamp back down.
    await page.selectOption('#qq-vehicle', { index: 1 });
    const riders = page.locator('span.min-w-\\[3\\.5rem\\]');
    await expect(riders).toHaveText('4');
  });
});

test.describe('accessibility basics', () => {
  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/fleet', '/contact', '/services']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(overflow, `${path} overflows horizontally on a 390px viewport`).toBe(false);
    }
  });

  test('the primary CTA is readable, not dark-on-blue', async ({ page }) => {
    // bg-surface is a no-op against btn-brand-gradient's background-image, so a
    // button styled `bg-surface !text-brand-900` renders at 1.45:1.
    await page.goto('/fleet');
    const btn = page.locator('button:has-text("Book a vehicle now")').first();
    await expect(btn).toBeVisible();
    const color = await btn.evaluate((n) => getComputedStyle(n).color);
    expect(color, 'CTA text should be white, not dark').toBe('rgb(255, 255, 255)');
  });
});
