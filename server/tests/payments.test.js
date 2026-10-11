/**
 * Payment settlement, idempotency and refunds.
 *
 * Before this file the only payment assertion in the repo was a negative one:
 * "refuses to settle a ride that is not completed". No test had ever written a
 * Payment row. That meant the happy path, the double-charge guard and the whole
 * refund workflow were untested while being the code that moves money.
 *
 * Everything runs against a real MongoDB. The sandbox gateway is used because
 * STRIPE_SECRET_KEY is unset in tests, which is the same branch a deployment
 * with no Stripe key would take. Nominatim/OSRM are stubbed as elsewhere.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import Ride from '../src/models/Ride.js';
import Payment from '../src/models/Payment.js';
import AppSetting from '../src/models/AppSetting.js';
import User from '../src/models/User.js';
import {
  startTestServer, stopTestServer, resetDb, login, bearer,
} from './setup.js';
import { ensureCatalogDefaults } from '../src/services/catalogService.js';

let app;
beforeAll(async () => { app = await startTestServer(); });
afterAll(async () => { await stopTestServer(); });

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb();
  await ensureCatalogDefaults();

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

/** Register a passenger and drive one ride all the way to `completed`. */
const completedRide = async (email = 'payer@ellicot.com') => {
  const { tokens, user } = await login(app, { email });
  const { user: driver, tokens: dTok } = await (async () => {
    const D = await import('../src/models/User.js');
    const d = await D.default.create({
      name: 'Driver',
      email: `drv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@ellicot.com`,
      password: 'driver123',
      role: 'driver',
      emailVerified: true,
      driverDetails: {
        vehicleType: 'executive-sedan',
        plateNumber: 'PAY-1',
        licenseNo: 'DL-PAY',
        isAvailable: true,
        verificationStatus: 'verified',
      },
    });
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ identifier: d.email, password: 'driver123' });
    return { user: d, tokens: res.body.tokens };
  })();

  const created = await supertest(app).post('/api/rides').set(bearer(tokens)).send({
    pickup: { address: '9019 Early April Way, Ellicott City, MD' },
    dropoff: { address: 'BWI Airport, Maryland' },
    vehicleType: 'executive-sedan',
  });
  expect(created.status).toBe(201);
  const rideId = created.body.ride._id;

  await supertest(app).patch(`/api/rides/${rideId}/accept`).set(bearer(dTok));
  const done = await supertest(app)
    .patch(`/api/rides/${rideId}/status`)
    .set(bearer(dTok))
    .send({ status: 'completed' });
  expect(done.status).toBe(200);

  const ride = await Ride.findById(rideId).lean();
  return { rideId, tokens, user, driver, dTok, fare: ride.fare.final };
};

describe('cash settlement', () => {
  it('records a cash payment at the final fare and marks the ride paid', async () => {
    const { rideId, tokens, fare } = await completedRide();

    const res = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'cash' });

    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe('cash');
    expect(res.body.payment.provider).toBe('cash');
    expect(res.body.payment.amount).toBe(fare);
    expect(res.body.payment.method).toBe('cash');

    const ride = await Ride.findById(rideId).lean();
    expect(ride.payment).toMatchObject({ method: 'cash', status: 'paid' });
    expect(await Payment.countDocuments({ ride: rideId })).toBe(1);
  });

  it('is idempotent — a second cash attempt returns the same payment', async () => {
    const { rideId, tokens } = await completedRide();

    const first = await supertest(app)
      .post(`/api/rides/${rideId}/pay`).set(bearer(tokens)).send({ method: 'cash' });
    const second = await supertest(app)
      .post(`/api/rides/${rideId}/pay`).set(bearer(tokens)).send({ method: 'cash' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(String(second.body.payment._id)).toBe(String(first.body.payment._id));
    // The whole point: still exactly one row. Cash must never double-record.
    expect(await Payment.countDocuments({ ride: rideId })).toBe(1);
  });

  it('a cash payment cannot be refunded', async () => {
    const { rideId, tokens } = await completedRide();
    const paid = await supertest(app)
      .post(`/api/rides/${rideId}/pay`).set(bearer(tokens)).send({ method: 'cash' });

    const req = await supertest(app)
      .post(`/api/payments/${paid.body.payment._id}/request-refund`)
      .set(bearer(tokens))
      .send({ reason: 'changed my mind' });

    expect(req.status).toBe(400);
    expect(req.body.message).toMatch(/cash/i);
  });
});

describe('card settlement (sandbox gateway)', () => {
  it('succeeds on a good card and records a transaction id', async () => {
    const { rideId, tokens, fare } = await completedRide();

    const res = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0000', idempotencyKey: `k-${rideId}` });

    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe('succeeded');
    expect(res.body.payment.provider).toBe('sandbox');
    expect(res.body.payment.amount).toBe(fare);
    expect(res.body.payment.transactionId).toMatch(/^txn_/);
    expect(res.body.payment.cardLast4).toBe('0000');

    const ride = await Ride.findById(rideId).lean();
    expect(ride.payment.status).toBe('paid');
  });

  it('records a decline without marking the ride paid, and leaves it payable', async () => {
    const { rideId, tokens } = await completedRide();

    const res = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0002', idempotencyKey: `k-${rideId}` });

    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe('failed');
    expect(res.body.payment.failureReason).toMatch(/declin/i);

    const ride = await Ride.findById(rideId).lean();
    expect(ride.payment?.status ?? 'paid').not.toBe('paid');
    // A declined payment must not settle the ride: the passenger can retry.
    expect(await Payment.countDocuments({ ride: rideId, status: 'succeeded' })).toBe(0);
  });

  it('surfaces insufficient funds deterministically', async () => {
    // The gateway fails ~5% of non-0000 cards at random. Pin the draw so the
    // branch is exercised on every run instead of 95% of the time.
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const { rideId, tokens } = await completedRide();

    const res = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '4242', idempotencyKey: `k-${rideId}` });

    expect(res.body.payment.status).toBe('failed');
    expect(res.body.payment.failureReason).toMatch(/insufficient/i);
    spy.mockRestore();
  });

  it('rejects a replayed idempotency key with 409', async () => {
    const { rideId, tokens } = await completedRide();

    const first = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0000', idempotencyKey: 'same-key' });
    expect(first.status).toBe(200);

    // A second ride, so settledPayment() does not short-circuit first and the
    // idempotency guard is what actually answers.
    const second = await completedRide('payer2@ellicot.com');
    const replay = await supertest(app)
      .post(`/api/rides/${second.rideId}/pay`)
      .set(bearer(second.tokens))
      .send({ method: 'card', cardLast4: '0000', idempotencyKey: 'same-key' });

    expect(replay.status).toBe(409);
    expect(replay.body.message).toMatch(/already processed/i);
    expect(await Payment.countDocuments({ idempotencyKey: 'same-key' })).toBe(1);
  });

  it('never charges the same ride twice across cash and card', async () => {
    const { rideId, tokens } = await completedRide();

    const card = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0000', idempotencyKey: `k-${rideId}` });
    expect(card.body.payment.status).toBe('succeeded');

    // Switching to cash afterwards must return the settled card payment rather
    // than recording a second one.
    const cash = await supertest(app)
      .post(`/api/rides/${rideId}/pay`).set(bearer(tokens)).send({ method: 'cash' });
    expect(cash.status).toBe(200);
    expect(String(cash.body.payment._id)).toBe(String(card.body.payment._id));
    expect(await Payment.countDocuments({ ride: rideId })).toBe(1);
  });
});

describe('payment access control', () => {
  it('refuses to pay for someone else\'s ride', async () => {
    const { rideId } = await completedRide('owner@ellicot.com');
    const other = await login(app, { email: 'stranger@ellicot.com' });

    const res = await supertest(app)
      .post(`/api/rides/${rideId}/pay`).set(bearer(other.tokens)).send({ method: 'cash' });

    expect(res.status).toBe(404);
    expect(await Payment.countDocuments({ ride: rideId })).toBe(0);
  });

  it('refuses to pay a ride that is not completed', async () => {
    const { tokens } = await login(app, { email: 'early@ellicot.com' });
    const created = await supertest(app).post('/api/rides').set(bearer(tokens)).send({
      pickup: { address: '9019 Early April Way, Ellicott City, MD' },
      dropoff: { address: 'BWI Airport, Maryland' },
      vehicleType: 'executive-sedan',
    });

    const res = await supertest(app)
      .post(`/api/rides/${created.body.ride._id}/pay`)
      .set(bearer(tokens))
      .send({ method: 'cash' });

    expect(res.status).toBe(404);
    expect(await Payment.countDocuments({ ride: created.body.ride._id })).toBe(0);
  });

  it('honours paymentsEnabled=false (403)', async () => {
    const { rideId, tokens } = await completedRide();
    await AppSetting.updateOne({ key: 'paymentsEnabled' }, { value: false }, { upsert: true });

    const res = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0000' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/disabled/i);
  });

  it('still allows cash when online payments are disabled', async () => {
    // The documented rule: cash is always allowed, because it moves no money
    // through us. Blocking it would strand a passenger who can only pay the
    // driver.
    const { rideId, tokens } = await completedRide();
    await AppSetting.updateOne({ key: 'paymentsEnabled' }, { value: false }, { upsert: true });

    const res = await supertest(app)
      .post(`/api/rides/${rideId}/pay`).set(bearer(tokens)).send({ method: 'cash' });

    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe('cash');
  });

  it('scopes the payment list to the caller', async () => {
    const mine = await completedRide('mine@ellicot.com');
    await supertest(app)
      .post(`/api/rides/${mine.rideId}/pay`).set(bearer(mine.tokens)).send({ method: 'cash' });
    const theirs = await completedRide('theirs@ellicot.com');
    await supertest(app)
      .post(`/api/rides/${theirs.rideId}/pay`).set(bearer(theirs.tokens)).send({ method: 'cash' });

    const list = await supertest(app).get('/api/payments').set(bearer(mine.tokens));
    expect(list.status).toBe(200);
    expect(list.body.payments).toHaveLength(1);
    expect(String(list.body.payments[0].ride._id)).toBe(String(mine.rideId));
  });

  it('will not show another user\'s payment by id', async () => {
    const mine = await completedRide('mine2@ellicot.com');
    const paid = await supertest(app)
      .post(`/api/rides/${mine.rideId}/pay`).set(bearer(mine.tokens)).send({ method: 'cash' });
    const other = await login(app, { email: 'nosy2@ellicot.com' });

    const res = await supertest(app)
      .get(`/api/payments/${paid.body.payment._id}`).set(bearer(other.tokens));
    expect(res.status).toBe(404);
  });
});

describe('refunds', () => {
  const adminLogin = async () => {
    const admin = await User.create({
      name: 'Admin',
      email: `adm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@ellicot.com`,
      password: 'admin123',
      role: 'admin',
      emailVerified: true,
    });
    const res = await supertest(app)
      .post('/api/auth/login').send({ identifier: admin.email, password: 'admin123' });
    return res.body.tokens;
  };

  it('a passenger cannot refund directly', async () => {
    const { rideId, tokens } = await completedRide();
    const paid = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0000', idempotencyKey: 'rf-1' });

    const res = await supertest(app)
      .post(`/api/payments/${paid.body.payment._id}/refund`)
      .set(bearer(tokens))
      .send({});

    expect(res.status).toBe(403);
    expect((await Payment.findById(paid.body.payment._id).lean()).status).toBe('succeeded');
  });

  it('passenger requests, admin approves, and the ride is marked refunded', async () => {
    const { rideId, tokens } = await completedRide();
    const paid = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0000', idempotencyKey: 'rf-2' });
    const paymentId = paid.body.payment._id;

    const req = await supertest(app)
      .post(`/api/payments/${paymentId}/request-refund`)
      .set(bearer(tokens))
      .send({ reason: 'driver never arrived' });
    expect(req.status).toBe(201);
    expect(req.body.request.status).toBe('pending');

    const aTok = await adminLogin();
    const decision = await supertest(app)
      .post(`/api/payments/requests/${req.body.request._id}/decision`)
      .set(bearer(aTok))
      .send({ approve: true, note: 'verified no-show' });

    expect(decision.status).toBe(200);
    expect(decision.body.request.status).toBe('approved');

    const payment = await Payment.findById(paymentId).lean();
    expect(payment.status).toBe('refunded');
    expect(payment.refundedAt).toBeTruthy();
    expect(payment.refundTransactionId).toMatch(/^refund_/);

    const ride = await Ride.findById(rideId).lean();
    expect(ride.payment.status).toBe('refunded');
  });

  it('a rejected request leaves the payment succeeded', async () => {
    const { rideId, tokens } = await completedRide();
    const paid = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0000', idempotencyKey: 'rf-3' });

    const req = await supertest(app)
      .post(`/api/payments/${paid.body.payment._id}/request-refund`)
      .set(bearer(tokens))
      .send({ reason: 'change of plan' });

    const aTok = await adminLogin();
    await supertest(app)
      .post(`/api/payments/requests/${req.body.request._id}/decision`)
      .set(bearer(aTok))
      .send({ approve: false, note: 'trip was completed' });

    expect((await Payment.findById(paid.body.payment._id).lean()).status).toBe('succeeded');
    expect((await Ride.findById(rideId).lean()).payment.status).toBe('paid');
  });

  it('refuses a duplicate pending request (409)', async () => {
    const { rideId, tokens } = await completedRide();
    const paid = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0000', idempotencyKey: 'rf-4' });

    await supertest(app)
      .post(`/api/payments/${paid.body.payment._id}/request-refund`)
      .set(bearer(tokens)).send({ reason: 'first' });
    const dup = await supertest(app)
      .post(`/api/payments/${paid.body.payment._id}/request-refund`)
      .set(bearer(tokens)).send({ reason: 'second' });

    expect(dup.status).toBe(409);
  });

  it('requires a reason', async () => {
    const { rideId, tokens } = await completedRide();
    const paid = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0000', idempotencyKey: 'rf-5' });

    const res = await supertest(app)
      .post(`/api/payments/${paid.body.payment._id}/request-refund`)
      .set(bearer(tokens)).send({});
    expect(res.status).toBe(400);
  });

  it('will not refund a failed payment', async () => {
    const { rideId, tokens } = await completedRide();
    const paid = await supertest(app)
      .post(`/api/rides/${rideId}/pay`)
      .set(bearer(tokens))
      .send({ method: 'card', cardLast4: '0002', idempotencyKey: 'rf-6' });

    const req = await supertest(app)
      .post(`/api/payments/${paid.body.payment._id}/request-refund`)
      .set(bearer(tokens)).send({ reason: 'please' });

    expect(req.status).toBe(404);
  });
});