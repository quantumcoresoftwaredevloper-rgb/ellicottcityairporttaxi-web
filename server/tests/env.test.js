/**
 * Production boot guards.
 *
 * `assertEnv()` is the last line of defence: a deploy with a weak JWT secret, a
 * dev-token flag left on, or a localhost database must refuse to start rather
 * than come up quietly insecure. That is a security control, so it gets the same
 * treatment as the API itself.
 *
 * (The CI workflow runs the API with NODE_ENV=development precisely because
 * these rules fire on a local mongod — so these tests are where the production
 * path is actually exercised.)
 */
import { describe, it, expect } from 'vitest';
import { validateEnv, corsOrigins } from '../src/config/env.js';

const good = {
  NODE_ENV: 'production',
  MONGO_URI: 'mongodb+srv://user:pw@cluster.mongodb.net/ellicottaxi',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  CLIENT_ORIGIN: 'https://example.com',
  TRUST_PROXY: 'true',
};

describe('validateEnv', () => {
  it('accepts a correctly configured production env', () => {
    expect(validateEnv(good)).toEqual([]);
  });

  it('rejects a missing MONGO_URI', () => {
    const { MONGO_URI, ...rest } = good;
    expect(validateEnv(rest).join(' ')).toMatch(/MONGO_URI/);
  });

  it('rejects a localhost MONGO_URI in production', () => {
    const problems = validateEnv({ ...good, MONGO_URI: 'mongodb://127.0.0.1:27017/ellicottaxi' });
    expect(problems.join(' ')).toMatch(/localhost/i);
  });

  it('rejects a short or placeholder JWT secret in production', () => {
    expect(validateEnv({ ...good, JWT_ACCESS_SECRET: 'short' }).join(' ')).toMatch(/JWT_ACCESS_SECRET/i);
    expect(
      validateEnv({ ...good, JWT_ACCESS_SECRET: 'your-super-secret-here-change-me' }).join(' ')
    ).toMatch(/JWT_ACCESS_SECRET/i);
  });

  it('rejects EXPOSE_DEV_TOKENS in production — it leaks reset links', () => {
    const problems = validateEnv({ ...good, EXPOSE_DEV_TOKENS: 'true' });
    expect(problems.join(' ')).toMatch(/EXPOSE_DEV_TOKENS/);
  });

  it('rejects a login rate limit raised for local testing', () => {
    // The var is RATE_LIMIT_LOGIN, and anything over 20/15min is a ship-blocker.
    expect(validateEnv({ ...good, RATE_LIMIT_LOGIN: '500' }).join(' ')).toMatch(/RATE_LIMIT_LOGIN/);
    expect(validateEnv({ ...good, RATE_LIMIT_LOGIN: '20' }).join(' ')).toEqual('');
  });

  it('rejects a wildcard CLIENT_ORIGIN', () => {
    expect(validateEnv({ ...good, CLIENT_ORIGIN: '*' }).join(' ')).toMatch(/CLIENT_ORIGIN/);
  });

  it('rejects a wildcard in CORS_ORIGINS', () => {
    expect(validateEnv({ ...good, CORS_ORIGINS: 'https://a.example.com,*' }).join(' ')).toMatch(/CORS_ORIGINS/);
  });

  it('is more permissive in development', () => {
    expect(
      validateEnv({ NODE_ENV: 'development', MONGO_URI: 'mongodb://127.0.0.1:27017/x' }).join(' ')
    ).not.toMatch(/localhost/i);
  });
});

describe('corsOrigins', () => {
  it('always admits the native app origins', () => {
    const list = corsOrigins({ CLIENT_ORIGIN: 'https://web.example.com' });
    expect(list).toContain('capacitor://localhost');
    expect(list).toContain('https://localhost');
  });

  it('keeps CLIENT_ORIGIN a single origin — it is used in emailed links', () => {
    // A comma here would end up inside verification and reset-password URLs.
    const list = corsOrigins({ CLIENT_ORIGIN: 'https://web.example.com' });
    expect(list.filter((o) => o === 'https://web.example.com')).toHaveLength(1);
    expect(list.every((o) => !o.includes(','))).toBe(true);
  });

  it('honours extra trusted frontends from CORS_ORIGINS', () => {
    const list = corsOrigins({
      CLIENT_ORIGIN: 'https://web.example.com',
      CORS_ORIGINS: 'https://preview.example.com',
    });
    expect(list).toContain('https://preview.example.com');
  });
});
