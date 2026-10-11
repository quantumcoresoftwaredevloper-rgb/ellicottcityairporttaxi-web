/**
 * Shared setup for the API integration tests.
 *
 * Every suite runs against a REAL MongoDB (mongodb-memory-server), not a mock,
 * because the bugs that actually bit this project were schema/data bugs: the
 * driver-verification workflow added a field defaulting to 'none' and locked
 * every existing driver out of going online. A mocked model would never have
 * caught that — only a real document store does.
 *
 * `app` is imported from src/index.js, whose boot is guarded by `isDirectRun`,
 * so importing it here neither binds a port nor opens a second DB connection.
 */
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/index.js';

let mongod;

export async function startTestServer() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  // assertEnv() requires a real-looking secret; tests run in development but
  // still need one so token signing works.
  process.env.JWT_ACCESS_SECRET ||= 'test-secret-that-is-at-least-32-characters-long';
  process.env.CLIENT_ORIGIN ||= 'http://localhost:5173';
  await mongoose.connect(process.env.MONGO_URI);

  // Mirror the production boot: src/index.js seeds the admin-managed catalog on
  // start, but importing the app deliberately skips boot. Without this the fleet
  // and service collections are empty and every ride write fails with
  // 'Unknown vehicle "executive-sedan" — add it to the fleet first'.
  const { ensureCatalogDefaults } = await import('../src/services/catalogService.js');
  await ensureCatalogDefaults();

  return app;
}

export async function stopTestServer() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

/** Wipe every collection between tests but keep the indexes. */
export async function resetDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

export const api = () => supertest(app);

const unique = (p) => `${p}${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

/** Register a passenger; returns `{ res, body }`. */
export async function register(app_, overrides = {}) {
  const body = {
    name: 'Test Person',
    email: `${unique('t')}@example.com`,
    password: 'testpass123',
    ...overrides,
  };
  const res = await supertest(app_).post('/api/auth/register').send(body);
  return { res, body };
}

/** Register then log in; returns `{ user, tokens }`. */
export async function login(app_, overrides = {}) {
  const { body } = await register(app_, overrides);
  const res = await supertest(app_)
    .post('/api/auth/login')
    .send({ identifier: body.email, password: 'testpass123' });
  return { res, user: res.body.user, tokens: res.body.tokens, body };
}

/**
 * Create a driver straight in the DB (public registration never grants a role)
 * and return a usable access token.
 */
export async function makeDriver(app_, driverDetails = {}) {
  const User = (await import('../src/models/User.js')).default;
  const user = await User.create({
    name: 'Test Driver',
    email: `${unique('d')}@example.com`,
    // PLAINTEXT on purpose: User has a pre('save') hook that bcrypts the
    // password, so passing an already-hashed value double-hashes it and login
    // then fails with 401.
    password: 'driver123',
    role: 'driver',
    emailVerified: true,
    driverDetails: {
      vehicleType: 'executive-sedan',
      plateNumber: 'TEST-1',
      licenseNo: 'DL-TEST',
      isAvailable: false,
      verificationStatus: 'verified',
      ...driverDetails,
    },
  });
  const login_ = await supertest(app_)
    .post('/api/auth/login')
    .send({ identifier: user.email, password: 'driver123' });
  return { user, tokens: login_.body.tokens };
}

export const bearer = (tokens) => ({ Authorization: `Bearer ${tokens.accessToken}` });
