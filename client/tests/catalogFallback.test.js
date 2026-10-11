/**
 * The offline catalog fallback — the thing that silently breaks production.
 *
 * When `GET /api/fleet` / `/api/services` fail, the client renders from
 * data/vehicles.js + data/services.js. That path is the NORMAL one on a
 * deployed site that has not set VITE_API_URL, because the client then calls
 * /api on its own origin. Three separate production outages came from this data
 * being hollow:
 *
 *   seats: 4 + image: ''      -> no photos, and a Van claiming 4 seats
 *   tagline: '' + features: [] -> every description and feature list gone
 *   icon: '' + featured: false -> blank icons, empty Home featured band
 *
 * `npm run check:catalog` diffs these lists against the server defaults. These
 * tests assert the same invariants from the consumer's side, so a hollow value
 * fails here even if someone adds a new one.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { VEHICLES } from '../src/data/vehicles.js';
import { SERVICES } from '../src/data/services.js';

describe('fleet fallback', () => {
  it('has the nine catalog classes', () => {
    expect(VEHICLES).toHaveLength(9);
  });

  it('every class carries a real photo', () => {
    for (const v of VEHICLES) {
      expect(v.image, `${v.id} has no image — the Fleet page would drop to icons`).toMatch(
        /^\/images\/.+\.png$/
      );
    }
  });

  it('every class carries a tagline and features', () => {
    for (const v of VEHICLES) {
      expect(v.tagline, `${v.id} has no tagline`).toBeTruthy();
      expect(v.features?.length, `${v.id} has no features`).toBeGreaterThan(3);
    }
  });

  it('seat counts are real, not a hardcoded 4', () => {
    const byId = Object.fromEntries(VEHICLES.map((v) => [v.id, v.seats]));
    expect(byId['executive-sedan']).toBe(4);
    expect(byId['van']).toBe(14);
    expect(byId['motorcoach']).toBe(56);
    // A distinct set, not one value repeated.
    expect(new Set(Object.values(byId)).size).toBeGreaterThan(3);
  });

  it('ids are kebab-case and unique (they are stored on Ride/User)', () => {
    const ids = VEHICLES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe('services fallback', () => {
  it('has the ten offerings', () => {
    expect(SERVICES).toHaveLength(10);
  });

  it('every offering carries an icon NAME, not a component', () => {
    for (const s of SERVICES) {
      // ServiceIcon resolves a string through lib/iconMap.js. A component here
      // would render a literal <s> element instead of an icon.
      expect(typeof s.icon, `${s.slug} icon must be a name string`).toBe('string');
      expect(s.icon.length).toBeGreaterThan(0);
    }
  });

  it('some offerings are featured so the Home band is not empty', () => {
    const featured = SERVICES.filter((s) => s.featured);
    expect(featured.length, 'Home featured band would be empty').toBeGreaterThan(0);
  });

  it('every offering carries tagline, summary and features', () => {
    for (const s of SERVICES) {
      expect(s.tagline, `${s.slug} has no tagline`).toBeTruthy();
      expect(s.summary, `${s.slug} has no summary`).toBeTruthy();
      expect(s.features?.length, `${s.slug} has no features`).toBeGreaterThan(0);
    }
  });

  it('slugs are kebab-case and unique', () => {
    const slugs = SERVICES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe('phone defaults', () => {
  // ContentContext is .jsx, which node-env vitest cannot import, so read the
  // source instead. An earlier version of this test wrapped the import in
  // .catch(() => null) and therefore asserted nothing at all.
  const src = readFileSync(
    new URL('../src/context/ContentContext.jsx', import.meta.url),
    'utf8'
  );

  it('defaults contactPhone to the straight, paren-free format', () => {
    const m = src.match(/contactPhone:\s*'([^']+)'/);
    expect(m, 'could not find contactPhone in ContentContext').toBeTruthy();
    expect(m[1]).not.toMatch(/[()]/);
    expect(m[1]).toMatch(/^\d{3}-\d{3}-\d{4}$/);
  });

  it('keeps the tel: href digits-only', () => {
    const m = src.match(/contactPhoneHref:\s*'([^']+)'/);
    expect(m).toBeTruthy();
    expect(m[1]).toMatch(/^\d+$/);
  });

  it('normalises contactPhone on render, so a saved paren value still displays straight', () => {
    expect(src).toMatch(/formatPhoneDisplay\(/);
  });
});
