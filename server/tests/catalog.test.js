/**
 * Public catalog tests.
 *
 * Two things worth protecting here:
 *   1. `GET /api/fleet` must NOT expose `fare`. Per-class pricing is
 *      deliberately private (see AGENTS.md), and `withFare` defaults to false on
 *      the public route. If that default ever flips, live pricing leaks.
 *   2. The admin-managed catalog seeds itself on boot, and the client depends on
 *      the shape it produces — the offline fallback in the client mirrors these
 *      exact fields (enforced by `npm run check:catalog` on the client side).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { startTestServer, stopTestServer } from './setup.js';

let app;
beforeAll(async () => { app = await startTestServer(); });
afterAll(async () => { await stopTestServer(); });

describe('GET /api/fleet', () => {
  it('returns the seeded classes', async () => {
    const res = await supertest(app).get('/api/fleet');
    expect(res.status).toBe(200);
    expect(res.body.vehicles.length).toBe(9);
  });

  it('does NOT leak per-class fares', async () => {
    const res = await supertest(app).get('/api/fleet');
    for (const v of res.body.vehicles) {
      expect(v, `vehicle ${v.key} must not expose fare publicly`).not.toHaveProperty('fare');
    }
    expect(JSON.stringify(res.body)).not.toMatch(/"perKm"|"perMin"/);
  });

  it('carries the fields the client fallback mirrors', async () => {
    const res = await supertest(app).get('/api/fleet');
    const sedan = res.body.vehicles.find((v) => v.key === 'executive-sedan');
    for (const field of ['label', 'desc', 'capacity', 'seats', 'bags', 'image', 'tagline', 'features']) {
      expect(sedan, `missing ${field}`).toHaveProperty(field);
    }
    expect(sedan.seats).toBeGreaterThan(0);
    expect(sedan.features.length).toBeGreaterThan(0);
    // Real seat counts, not a hardcoded 4 for everything.
    const van = res.body.vehicles.find((v) => v.key === 'van');
    expect(van.seats).toBe(14);
  });
});

describe('GET /api/services', () => {
  it('returns the seeded offerings with the featured flag', async () => {
    const res = await supertest(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body.services.length).toBe(10);
    const featured = res.body.services.filter((s) => s.featured).map((s) => s.slug);
    expect(featured.length).toBeGreaterThan(0);
    for (const s of res.body.services) {
      expect(s.icon, `${s.slug} needs an icon NAME for ServiceIcon`).toBeTruthy();
      expect(s.tagline).toBeTruthy();
    }
  });
});

describe('GET /api/services/:slug', () => {
  it('404s for an unknown slug', async () => {
    const res = await supertest(app).get('/api/services/not-a-real-service');
    expect(res.status).toBe(404);
  });

  it('200s for a known slug', async () => {
    const res = await supertest(app).get('/api/services/airport');
    expect(res.status).toBe(200);
    expect(res.body.service.slug).toBe('airport');
  });
});

describe('GET /api/settings', () => {
  it('exposes the public subset only, wrapped in a `settings` key', async () => {
    const res = await supertest(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.settings).toHaveProperty('paymentsEnabled');
    expect(res.body.settings).toHaveProperty('supportPhone');
    // Secrets must never be public.
    expect(JSON.stringify(res.body)).not.toMatch(/secret|smtp|twilio|vapidPrivate/i);
  });

  it('formats supportPhone the same way as contactPhone', async () => {
    // These two are separate settings edited in separate admin screens, and they
    // had drifted: content said 410-365-5556 while settings still said
    // (410) 365-5556, so the pay modal showed a different number to the footer.
    const settings = (await supertest(app).get('/api/settings')).body.settings;
    const content = (await supertest(app).get('/api/content')).body.content;
    expect(settings.supportPhone).toBe(content.contactPhone);
    expect(settings.supportPhone).toMatch(/^\d{3}-\d{3}-\d{4}$/);
  });
});
