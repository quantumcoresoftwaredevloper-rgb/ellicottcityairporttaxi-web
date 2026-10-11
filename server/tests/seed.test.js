/**
 * REGRESSION GUARD — `npm run seed` must produce a WORKING local environment.
 *
 * The seed creates the driver accounts documented in AGENTS.md. When the
 * verification workflow shipped, it left them at verificationStatus 'none',
 * and because setAvailability() 403s an unverified driver, following the
 * documented setup produced accounts that could not go online. Nothing caught
 * it, because nothing ran the seed and then tried to use it.
 *
 * This runs the real seed script as a child process against an in-memory
 * Mongo, then asserts the state the docs promise.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = resolve(HERE, '..');
const SEED = resolve(SERVER_ROOT, 'src/seed/index.js');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('npm run seed', () => {
  it('creates drivers that can actually go online', async () => {
    execFileSync(process.execPath, [SEED], {
      cwd: SERVER_ROOT,
      env: {
        ...process.env,
        MONGO_URI: mongod.getUri(),
        JWT_ACCESS_SECRET: 'test-secret-that-is-at-least-32-characters-long',
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
      timeout: 90_000,
    });

    await mongoose.connect(mongod.getUri());
    const User = (await import('../src/models/User.js')).default;

    const drivers = await User.find({ role: 'driver' }).lean();
    expect(drivers.length).toBeGreaterThan(0);

    // Every seeded driver must be verified, or the documented login is useless.
    for (const d of drivers) {
      expect(
        d.driverDetails?.verificationStatus,
        `seeded driver ${d.email} is not verified and cannot go online`
      ).toBe('verified');
    }

    // And the roles the docs promise must exist.
    expect(await User.countDocuments({ role: 'admin' })).toBeGreaterThan(0);
    expect(await User.countDocuments({ role: 'passenger' })).toBeGreaterThan(0);
  }, 120_000);
});
