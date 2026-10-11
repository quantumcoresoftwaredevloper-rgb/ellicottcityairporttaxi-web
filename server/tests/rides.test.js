/**
 * Ride lifecycle + the payment gate.
 *
 * Ride creation calls Nominatim/OSRM for geocoding and routing. Those are real
 * external services with no key, so they are stubbed here — the point is to test
 * OUR state machine, not Nominatim's uptime.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import { startTestServer, stopTestServer, resetDb, login, makeDriver, bearer } from './setup.js';

let app;
beforeAll(async () => { app = await startTestServer(); });
afterAll(async () => { await stopTestServer(); });
beforeEach(async () => { resetGeocode(); });

function resetGeocode() {
  vi.restoreAllMocks();
  // Deterministic pseudo-geocoding: each distinct query gets a distinct point.
  // Returning one fixed point for every address would make every ride trip fail
  // the "pickup and drop-off must be different locations" check.
  const points = new Map();
  let n = 0;
  globalThis.fetch = vi.fn(async (url) => {
    const u = String(url);
    if (u.includes('nominatim')) {
      const q = decodeURIComponent(new URL(u).searchParams.get('q') || '');
      if (!points.has(q)) {
        n += 1;
        points.set(q, { lat: (39 + n * 0.05).toFixed(4), lon: (-76 - n * 0.05).toFixed(4) });
      }
      const pt = points.get(q);
      return { ok: true, json: async () => [{ ...pt, display_name: q }] };
    }
    if (u.includes('router.project-osrm.org')) {
      return {
        ok: true,
        json: async () => ({
          routes: [{
            distance: 25000,
            duration: 1500,
            geometry: { coordinates: [[-76.85, 39.2], [-76.7, 39.3]] },
          }],
        }),
      };
    }
    return { ok: true, json: async () => ({}) };
  });
}

const rideBody = (over = {}) => ({
  pickup: { address: '9019 Early April Way, Ellicott City, MD' },
  dropoff: { address: 'BWI Airport, Maryland' },
  vehicleType: 'executive-sedan',
  passengerCount: 2,
  bags: 1,
  ...over,
});

describe('ride lifecycle', () => {
  it('a passenger can request a ride and gets an estimated fare', async () => {
    const { tokens } = await login(app);
    const res = await supertest(app)
      .post('/api/rides')
      .set(bearer(tokens))
      .send(rideBody());
    expect(res.status).toBe(201);
    expect(res.body.ride.status).toBe('pending');
    expect(res.body.ride.fare.estimated).toBeGreaterThan(0);
  });

  it('rejects a ride from an unknown vehicle class (400)', async () => {
    const { tokens } = await login(app);
    const res = await supertest(app)
      .post('/api/rides')
      .set(bearer(tokens))
      .send(rideBody({ vehicleType: 'hovercraft' }));
    expect(res.status).toBe(400);
  });

  it('rejects an unauthenticated request (401)', async () => {
    const res = await supertest(app).post('/api/rides').send(rideBody());
    expect(res.status).toBe(401);
  });

  it('driver accepts, then completes, and the final fare is set', async () => {
    const { tokens: pTok } = await login(app);
    const ride = await supertest(app).post('/api/rides').set(bearer(pTok)).send(rideBody());
    const rideId = ride.body.ride._id;

    const { tokens: dTok } = await makeDriver(app, { isAvailable: true });

    const acc = await supertest(app).patch(`/api/rides/${rideId}/accept`).set(bearer(dTok));
    expect(acc.status).toBe(200);
    expect(acc.body.ride.status).toBe('accepted');

    const done = await supertest(app)
      .patch(`/api/rides/${rideId}/status`)
      .set(bearer(dTok))
      .send({ status: 'completed' });
    expect(done.status).toBe(200);
    expect(done.body.ride.status).toBe('completed');
    expect(done.body.ride.fare.final).toBeGreaterThan(0);
  });

  it('only the passenger sees their own ride list', async () => {
    const { tokens: a } = await login(app);
    const { tokens: b } = await login(app);
    await supertest(app).post('/api/rides').set(bearer(a)).send(rideBody());
    const res = await supertest(app).get('/api/rides').set(bearer(b));
    expect(res.status).toBe(200);
    expect(res.body.rides).toHaveLength(0);
  });
});

describe('payment gate', () => {
  it('refuses to settle a ride that is not completed (4xx)', async () => {
    const { tokens: pTok } = await login(app);
    const ride = await supertest(app).post('/api/rides').set(bearer(pTok)).send(rideBody());
    const res = await supertest(app)
      .post(`/api/rides/${ride.body.ride._id}/pay`)
      .set(bearer(pTok))
      .send({ method: 'cash' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
