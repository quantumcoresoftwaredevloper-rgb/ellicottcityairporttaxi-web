/**
 * Auth integration tests.
 *
 * Focuses on the security properties this app already got wrong once: refresh
 * tokens must ROTATE, and a replayed token must be rejected. If rotation
 * regresses, a stolen refresh token becomes a permanent credential.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { startTestServer, stopTestServer, resetDb, register, login } from './setup.js';

let app;
beforeAll(async () => { app = await startTestServer(); });
afterAll(async () => { await stopTestServer(); });
beforeEach(async () => { await resetDb(); });

describe('register', () => {
  it('creates a passenger and returns a token pair', async () => {
    const { res } = await register(app);
    expect(res.status).toBe(201);
    expect(res.body.tokens.accessToken).toBeTruthy();
    expect(res.body.tokens.refreshToken).toBeTruthy();
    expect(res.body.user.role).toBe('passenger');
    // Never leak the password hash.
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects a duplicate email (409)', async () => {
    const { body } = await register(app);
    const again = await register(app, { email: body.email });
    expect(again.res.status).toBe(409);
  });

  it('rejects a short password (400)', async () => {
    const { res } = await register(app, { password: 'abc' });
    expect(res.status).toBe(400);
  });
});

describe('login', () => {
  it('accepts the email + password', async () => {
    const { res, user } = await login(app);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it('rejects a wrong password (401)', async () => {
    const { body } = await register(app);
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ identifier: body.email, password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('refresh rotation', () => {
  it('issues a NEW refresh token', async () => {
    const { tokens } = await login(app);
    const res = await supertest(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: tokens.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.tokens.refreshToken).toBeTruthy();
    expect(res.body.tokens.refreshToken).not.toBe(tokens.refreshToken);
  });

  it('REJECTS a replayed refresh token (the security property)', async () => {
    const { tokens } = await login(app);
    const first = await supertest(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: tokens.refreshToken });
    expect(first.status).toBe(200);

    // Replaying the now-revoked token must fail. Exactly one of the two wins.
    const replay = await supertest(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: tokens.refreshToken });
    expect(replay.status).toBe(401);
  });

  it('rejects a garbage token (401)', async () => {
    const res = await supertest(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });
});

describe('/api/auth/me', () => {
  it('returns the caller', async () => {
    const { tokens } = await login(app);
    const res = await supertest(app)
      .get('/api/auth/me')
      .set({ Authorization: `Bearer ${tokens.accessToken}` });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeTruthy();
  });

  it('rejects a missing token (401)', async () => {
    expect((await supertest(app).get('/api/auth/me')).status).toBe(401);
  });

  it('rejects a tampered token (401)', async () => {
    const { tokens } = await login(app);
    const bad = tokens.accessToken.slice(0, -3) + 'xyz';
    const res = await supertest(app)
      .get('/api/auth/me')
      .set({ Authorization: `Bearer ${bad}` });
    expect(res.status).toBe(401);
  });
});
