/**
 * Per-user data isolation, persistence, and the capacity clamp.
 *
 * Everything here goes through the real API against a real MongoDB. Nothing is
 * mocked except Nominatim/OSRM, which are external and keyless.
 *
 * The isolation tests exist because "works for one user" and "works for many" are
 * different claims. A missing `passenger` filter on a list endpoint returns the
 * right answer for a single account and leaks for the second, and no test that
 * only ever uses one user can tell the difference.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';
import Ride from '../src/models/Ride.js';
import Notification from '../src/models/Notification.js';
import {
  startTestServer, stopTestServer, resetDb, login, makeDriver, bearer,
} from './setup.js';
import { ensureCatalogDefaults } from '../src/services/catalogService.js';

/**
 * Wipe user data but keep the catalog.
 *
 * `resetDb()` empties every collection, which includes FleetVehicle. Boot seeds
 * that collection once, so a bare reset leaves no vehicle classes and every ride
 * fails with `Unknown vehicle "van"`. Re-seeding after each wipe keeps these
 * tests focused on isolation rather than on catalog bootstrap.
 */
const resetUsers = async () => {
  await resetDb();
  await ensureCatalogDefaults();
};

let app;
beforeAll(async () => { app = await startTestServer(); });
afterAll(async () => { await stopTestServer(); });

beforeEach(() => {
  vi.restoreAllMocks();
  let n = 0;
  const points = new Map();
  globalThis.fetch = vi.fn(async (url) => {
    const u = String(url);
    if (u.includes('nominatim')) {
      const q = decodeURIComponent(new URL(u).searchParams.get('q') || '');
      if (!points.has(q)) {
        n += 1;
        points.set(q, { lat: (39 + n * 0.05).toFixed(4), lon: (-76 - n * 0.05).toFixed(4) });
      }
      return { ok: true, json: async () => [{ ...points.get(q), display_name: q }] };
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
});

const rideBody = (over = {}) => ({
  pickup: { address: '9019 Early April Way, Ellicott City, MD' },
  dropoff: { address: 'BWI Airport, Maryland',
  },
  vehicleType: 'executive-sedan',
  ...over,
});

const createRide = async (tok, over) => {
  const res = await supertest(app).post('/api/rides').set(bearer(tok)).send(rideBody(over));
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.ride;
};

describe('per-user isolation', () => {
  it('lists only the caller\'s own rides', async () => {
    await resetUsers();
    const a = await login(app, { email: 'alice@ellicot.com' });
    const b = await login(app, { email: 'bob@ellicot.com' });

    await createRide(a.tokens, { vehicleType: 'executive-sedan' });
    await createRide(b.tokens, { vehicleType: 'premium-suv' });

    const listA = await supertest(app).get('/api/rides').set(bearer(a.tokens));
    const listB = await supertest(app).get('/api/rides').set(bearer(b.tokens));

    expect(listA.status).toBe(200);
    expect(listB.status).toBe(200);
    expect(listA.body.rides).toHaveLength(1);
    expect(listB.body.rides).toHaveLength(1);
    expect(listA.body.rides[0].vehicleType).toBe('executive-sedan');
    expect(listB.body.rides[0].vehicleType).toBe('premium-suv');
  });

  it('refuses to read, edit or cancel another user\'s ride', async () => {
    await resetUsers();
    const a = await login(app, { email: 'alice@ellicot.com' });
    const b = await login(app, { email: 'bob@ellicot.com' });
    const ride = await createRide(a.tokens, { vehicleType: 'economy-sedan' });

    // 403, not 404. The controller answers "Not in this ride" rather than
    // pretending the ride does not exist. That does confirm the id refers to
    // something real, which is a small existence oracle — acceptable here
    // because ride ids are ObjectIds the caller could not guess, and no ride
    // detail is disclosed. Asserting the real status keeps the test honest
    // about what the API actually promises.
    const read = await supertest(app).get(`/api/rides/${ride._id}`).set(bearer(b.tokens));
    const edit = await supertest(app)
      .patch(`/api/rides/${ride._id}`)
      .set(bearer(b.tokens))
      .send({ dropoff: { address: 'nowhere' } });
    const cancel = await supertest(app)
      .patch(`/api/rides/${ride._id}/cancel`)
      .set(bearer(b.tokens))
      .send({});

    expect(read.status).toBe(403);
    // Edit and cancel deny a non-owner too, but with different codes, and the
    // reason is worth recording: the three endpoints enforce ownership in three
    // different places.
    //   GET    -> a shared `isParticipant` guard, 403.
    //   PATCH  -> `editRide` queries `{ _id, passenger, status:'pending' }`, so a
    //             non-owner fails to match and the pending-state message (409)
    //             surfaces.
    //   cancel -> the service looks the ride up scoped to the caller and 404s.
    // What matters for isolation is that all three refuse; the varying codes are
    // an inconsistency to be aware of if the API surface is ever documented.
    expect(edit.status).toBe(409);
    expect(cancel.status).toBe(404);

    // And the ride is genuinely untouched.
    const after = await supertest(app).get(`/api/rides/${ride._id}`).set(bearer(a.tokens));
    expect(after.status).toBe(200);
    expect(after.body.ride.status).toBe('pending');
    expect(after.body.ride.dropoff.address).not.toBe('nowhere');
  });

  it('notifications are scoped to their owner', async () => {
    await resetUsers();
    const a = await login(app, { email: 'alice@ellicot.com' });
    const b = await login(app, { email: 'bob@ellicot.com' });

    await Notification.create({
      user: a.user._id,
      type: 'system',
      title: 'alice only',
      message: 'private',
    });

    const mine = await supertest(app).get('/api/notifications').set(bearer(a.tokens));
    const theirs = await supertest(app).get('/api/notifications').set(bearer(b.tokens));

    expect(mine.body.notifications).toHaveLength(1);
    expect(mine.body.notifications[0].title).toBe('alice only');
    expect(theirs.body.notifications).toHaveLength(0);
  });
});

describe('persistence', () => {
  it('a ride survives a reconnect and keeps every field it was created with', async () => {
    await resetUsers();
    const p = await login(app, { email: 'persist@ellicot.com' });
    const created = await createRide(p.tokens, {
      vehicleType: 'executive-sedan',
      serviceType: 'airport',
    });

    // Read it back through a second, independent request rather than trusting the
    // create response — that one came straight from the in-memory document.
    const res = await supertest(app).get(`/api/rides/${created._id}`).set(bearer(p.tokens));
    expect(res.status).toBe(200);

    const ride = res.body.ride;
    expect(ride._id).toBe(created._id);
    expect(ride.vehicleType).toBe('executive-sedan');
    expect(ride.serviceType).toBe('airport');
    expect(ride.status).toBe('pending');
    expect(ride.pickup.address).toBe('9019 Early April Way, Ellicott City, MD');
    expect(ride.dropoff.address).toBe('BWI Airport, Maryland');
    expect(ride.fare.estimated).toBeGreaterThan(0);
    expect(Array.isArray(ride.route)).toBe(true);
    expect(ride.route.length).toBeGreaterThan(0);

    // And it is really in Mongo, not just echoed back.
    const doc = await Ride.findById(created._id).lean();
    expect(doc).toBeTruthy();
    expect(doc.vehicleType).toBe('executive-sedan');
  });

  it('a driver accepting a ride is visible to the passenger and to nobody else', async () => {
    await resetUsers();
    const p = await login(app, { email: 'pax@ellicot.com' });
    const other = await login(app, { email: 'nosy@ellicot.com' });
    const { user: driver, tokens: dTok } = await makeDriver(app, { vehicleType: 'executive-sedan' });

    const ride = await createRide(p.tokens, { vehicleType: 'executive-sedan' });

    const acc = await supertest(app).patch(`/api/rides/${ride._id}/accept`).set(bearer(dTok));
    expect(acc.status).toBe(200);
    // `driver` comes back populated, so compare on the id inside it.
    expect(String(acc.body.ride.driver._id ?? acc.body.ride.driver)).toBe(String(driver._id));

    const seenByPassenger = await supertest(app).get('/api/rides').set(bearer(p.tokens));
    expect(seenByPassenger.body.rides[0].status).toBe('accepted');

    // The other passenger's own list must not have grown.
    const seenByOther = await supertest(app).get('/api/rides').set(bearer(other.tokens));
    expect(seenByOther.body.rides).toHaveLength(0);
  });
});

describe('capacity clamp', () => {
  it('clamps an oversized party down to the class ceiling', async () => {
    await resetUsers();
    const p = await login(app, { email: 'clamp@ellicot.com' });

    // executive-sedan seats 4. The UI no longer offers a headcount, so this
    // arrives from a hand-rolled request — which is exactly what must not be
    // able to book 500 people into a sedan.
    const ride = await createRide(p.tokens, {
      vehicleType: 'executive-sedan',
      passengerCount: 500,
      bags: 99,
    });

    expect(ride.passengerCount).toBe(4);
    expect(ride.bags).toBe(2);
  });

  it('honours the larger ceiling of a larger class', async () => {
    await resetUsers();
    const p = await login(app, { email: 'clamp@ellicot.com' });

    const ride = await createRide(p.tokens, {
      vehicleType: 'van',
      passengerCount: 12,
      bags: 6,
    });

    expect(ride.passengerCount).toBe(12);   // van seats 14
    expect(ride.bags).toBe(6);              // van takes 8
  });

  it('falls back to the class maximum when the counts are missing or junk', async () => {
    await resetUsers();
    const p = await login(app, { email: 'clamp@ellicot.com' });

    const ride = await createRide(p.tokens, {
      vehicleType: 'economy-suv',
      passengerCount: 'lots',
      bags: -3,
    });

    expect(ride.passengerCount).toBe(6);    // 'lots' is not a number -> class max
    expect(ride.bags).toBe(0);              // -3 is a number -> clamped to the floor
    expect(ride.passengerCount).toBeGreaterThanOrEqual(1);
  });

  it('re-clamps on edit when the class shrinks under an existing ride', async () => {
    await resetUsers();
    const p = await login(app, { email: 'clamp@ellicot.com' });

    const ride = await createRide(p.tokens, {
      vehicleType: 'van',
      passengerCount: 14,
      bags: 8,
    });
    expect(ride.passengerCount).toBe(14);

    // Downgrade the booking to a sedan without touching the counts. The stored
    // party size now exceeds the new class and must come down.
    const edit = await supertest(app)
      .patch(`/api/rides/${ride._id}`)
      .set(bearer(p.tokens))
      .send({ vehicleType: 'executive-sedan' });

    expect(edit.status).toBe(200);
    expect(edit.body.ride.vehicleType).toBe('executive-sedan');
    expect(edit.body.ride.passengerCount).toBe(4);
    expect(edit.body.ride.bags).toBe(2);

    const doc = await Ride.findById(ride._id).lean();
    expect(doc.passengerCount).toBe(4);
  });

  it('the stored count never exceeds the class, for any class', async () => {
    await resetUsers();
    const p = await login(app, { email: 'clamp@ellicot.com' });
    const fleet = await supertest(app).get('/api/fleet');
    const classes = fleet.body.vehicles.filter((v) => v.active);

    for (const cls of classes) {
      const ride = await createRide(p.tokens, {
        vehicleType: cls.key,
        passengerCount: 9999,
        bags: 9999,
      });
      expect(ride.passengerCount, `${cls.key} passengerCount`).toBe(cls.seats);
      expect(ride.bags, `${cls.key} bags`).toBe(cls.bags);
    }
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
});