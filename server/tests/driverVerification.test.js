/**
 * REGRESSION GUARD — the bug this file exists for.
 *
 * feat(users) added `driverDetails.verificationStatus`, which defaults to
 * 'none'. `setAvailability()` correctly returns 403 unless it is 'verified'.
 * That is right for NEW drivers but silently locked out EVERY driver who
 * already existed, including both seeded accounts, so the documented dev flow
 * (seed -> log in as alex@ridetaxi.com -> go online) broke. It was only noticed
 * because the person running it got locked out.
 *
 * These tests pin both halves of the rule so it cannot regress quietly:
 *   - an unverified driver is refused
 *   - going offline is never blocked (see seed.test.js for the seed half)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { startTestServer, stopTestServer, resetDb, makeDriver, bearer } from './setup.js';
import User from '../src/models/User.js';

let app;
const setOnline = (tokens, isAvailable = true) =>
  supertest(app)
    .patch('/api/drivers/availability')
    .set(bearer(tokens))
    .send({ isAvailable });

beforeAll(async () => { app = await startTestServer(); });
afterAll(async () => { await stopTestServer(); });
beforeEach(async () => { await resetDb(); });

describe('driver availability gate', () => {
  it('refuses to let an UNVERIFIED driver go online (403)', async () => {
    const { tokens } = await makeDriver(app, { verificationStatus: 'none' });
    const res = await setOnline(tokens);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not verified/i);
  });

  it('refuses a driver awaiting review, PENDING (403)', async () => {
    const { tokens } = await makeDriver(app, { verificationStatus: 'pending' });
    expect((await setOnline(tokens)).status).toBe(403);
  });

  it('refuses a driver whose field is missing entirely (403)', async () => {
    // The legacy shape: documents written before the field existed.
    const { tokens } = await makeDriver(app, {});
    await User.updateOne({ role: 'driver' }, { $unset: { 'driverDetails.verificationStatus': '' } });
    expect((await setOnline(tokens)).status).toBe(403);
  });

  it('lets a VERIFIED driver go online (200)', async () => {
    const { tokens } = await makeDriver(app, { verificationStatus: 'verified' });
    const res = await setOnline(tokens);
    expect(res.status).toBe(200);
    expect(res.body.driver.driverDetails.isAvailable).toBe(true);
  });

  it('does NOT block going offline — only going online is gated', async () => {
    const { tokens } = await makeDriver(app, { verificationStatus: 'verified', isAvailable: true });
    const res = await setOnline(tokens, false);
    expect(res.status).toBe(200);
    expect(res.body.driver.driverDetails.isAvailable).toBe(false);
  });

  it('requires authentication (401 with no token)', async () => {
    const res = await supertest(app).patch('/api/drivers/availability').send({ isAvailable: true });
    expect(res.status).toBe(401);
  });
});
